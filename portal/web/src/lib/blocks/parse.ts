/*
 * parseMdx(body): divide el cuerpo MDX de una página en bloques.
 *
 * 1. Divisor por líneas (propio, sin dependencias): agrupa las líneas en trozos respetando contenedores que
 *    cruzan líneas en blanco (`:::aviso`, `<Steps>`, `<Cards>`, `<FigRow>`, vallas de código, JSX multilínea).
 * 2. Clasificación: cada trozo se intenta leer como un tipo de bloque.
 * 3. Comprobación canónica: un trozo solo recibe un tipo si regenerarlo desde sus campos da exactamente su
 *    texto original. Si no, queda como `raw` (se conserva tal cual y se edita como código). Así, editar un campo
 *    nunca pierde nada que el tipo no represente.
 */
import type {
  Block,
  BlockData,
  BlockOf,
  BlockType,
  CalloutKind,
  CardItem,
  Eol,
  HeadingLevel,
  ImageData,
  ParseOptions,
  StepItem,
} from './types.ts';
import { renderBlock } from './render.ts';
import { makeId as defaultMakeId, parseOpenTag, toEol, toLf } from './util.ts';

interface Line {
  text: string;
  eol: string;
}

function splitLines(body: string): Line[] {
  const out: Line[] = [];
  let i = 0;
  while (i < body.length) {
    const j = body.indexOf('\n', i);
    if (j < 0) {
      out.push({ text: body.slice(i), eol: '' });
      break;
    }
    let text = body.slice(i, j);
    let eol = '\n';
    if (text.endsWith('\r')) {
      text = text.slice(0, -1);
      eol = '\r\n';
    }
    out.push({ text, eol });
    i = j + 1;
  }
  return out;
}

const isBlank = (t: string): boolean => /^[ \t]*$/.test(t);
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const HEADING_RE = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const DIRECTIVE_RE = /^(:{3,})([A-Za-z][\w-]*)?(.*)$/;
const BULLET_RE = /^( {0,3})([-*+])( +|$)/;
const ORDERED_RE = /^( {0,3})(\d{1,9})([.)])( +|$)/;
const JSX_START_RE = /^<([A-Za-z][\w.-]*)/;

function isFenceClose(text: string, fence: string): boolean {
  const m = FENCE_RE.exec(text);
  return !!m && m[1][0] === fence[0] && m[1].length >= fence.length && m[2].trim() === '';
}

/** Índice de la línea que cierra la valla abierta en `i` (o la última línea). */
function fenceEnd(lines: Line[], i: number): number {
  const fence = FENCE_RE.exec(lines[i].text)![1];
  for (let j = i + 1; j < lines.length; j++) if (isFenceClose(lines[j].text, fence)) return j;
  return lines.length - 1;
}

/** Cierre de `:::tipo` (mismo número de dos puntos), saltando vallas de código y avisos anidados. */
function directiveEnd(lines: Line[], i: number): number {
  const colons = DIRECTIVE_RE.exec(lines[i].text)![1].length;
  let depth = 1;
  for (let j = i + 1; j < lines.length; j++) {
    const t = lines[j].text;
    if (FENCE_RE.test(t)) {
      j = fenceEnd(lines, j);
      continue;
    }
    const m = DIRECTIVE_RE.exec(t.trimEnd());
    if (!m || m[1].length !== colons) continue;
    if (m[2]) depth++;
    else if (m[3].trim() === '') {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/** Lee una etiqueta de apertura que empieza en la línea `i`, columna 0, aunque ocupe varias líneas. */
function readOpenTag(lines: Line[], i: number): { tag: string; line: number; col: number } | null {
  let quote: string | null = null;
  let brace = 0;
  for (let j = i; j < lines.length; j++) {
    const t = lines[j].text;
    if (j > i && isBlank(t)) return null;
    for (let k = j === i ? 1 : 0; k < t.length; k++) {
      const c = t[k];
      if (quote) {
        if (c === quote) quote = null;
      } else if (brace > 0) {
        if (c === '{') brace++;
        else if (c === '}') brace--;
        else if (c === '"' || c === "'" || c === '`') {
          const close = t.indexOf(c, k + 1);
          if (close > 0) k = close;
        }
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '{') brace++;
      else if (c === '>') {
        const parts = lines.slice(i, j).map(l => l.text);
        parts.push(t.slice(0, k + 1));
        return { tag: parts.join('\n'), line: j, col: k + 1 };
      }
    }
  }
  return null;
}

/** Línea y columna (tras `</Nombre>`) donde se cierra el elemento `name` abierto antes de (line, col). */
function closingTag(lines: Line[], name: string, line: number, col: number): { line: number; col: number } | null {
  const esc = name.replace(/[.]/g, '\\.');
  const re = new RegExp(`<(/?)${esc}(?=[\\s>/])((?:"[^"]*"|'[^']*'|\\{[^}]*\\}|[^>"'{])*)>`, 'g');
  let depth = 1;
  for (let j = line; j < lines.length; j++) {
    const t = lines[j].text;
    if (j > line && FENCE_RE.test(t)) {
      j = fenceEnd(lines, j);
      continue;
    }
    re.lastIndex = j === line ? col : 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      if (m[1]) {
        depth--;
        if (depth === 0) return { line: j, col: m.index + m[0].length };
      } else if (!m[2].trimEnd().endsWith('/')) depth++;
    }
  }
  return null;
}

/** Fin de un trozo de texto (párrafo, tabla, cita): hasta la línea en blanco o lo que interrumpe un párrafo. */
function paragraphEnd(lines: Line[], i: number): number {
  let j = i;
  while (j + 1 < lines.length) {
    const t = lines[j + 1].text;
    if (isBlank(t) || HEADING_RE.test(t) || FENCE_RE.test(t) || DIRECTIVE_RE.test(t)) break;
    if (BULLET_RE.test(t) && !/^ {0,3}[-*+] *$/.test(t) && !/^ {0,3}([-*_])( *\1){2,} *$/.test(t)) break;
    if (/^ {0,3}1[.)]( |$)/.test(t)) break;
    j++;
  }
  return j;
}

function listEnd(lines: Line[], i: number): number {
  const first = BULLET_RE.exec(lines[i].text) ?? ORDERED_RE.exec(lines[i].text)!;
  const ordered = !BULLET_RE.test(lines[i].text);
  const ind = first[1].length;
  const sameItem = (t: string): boolean => {
    const b = BULLET_RE.exec(t);
    if (!ordered && b) return b[1].length === ind && b[2] === first[2];
    const o = ORDERED_RE.exec(t);
    return ordered && !!o && o[1].length === ind && o[3] === first[3];
  };
  let j = i;
  while (j + 1 < lines.length) {
    const t = lines[j + 1].text;
    if (!isBlank(t)) {
      const indent = /^ */.exec(t)![0].length;
      if (indent <= ind && (HEADING_RE.test(t) || FENCE_RE.test(t) || DIRECTIVE_RE.test(t) || JSX_START_RE.test(t))) break;
      if (indent > ind && FENCE_RE.test(t)) {
        j = fenceEnd(lines, j + 1);
        continue;
      }
      j++;
      continue;
    }
    let k = j + 1;
    while (k < lines.length && isBlank(lines[k].text)) k++;
    if (k >= lines.length) break;
    const nt = lines[k].text;
    if (sameItem(nt) || /^ */.exec(nt)![0].length >= ind + 2) {
      j = k;
      continue;
    }
    break;
  }
  return j;
}

/** Fin del trozo que empieza en la línea `i` (no en blanco). */
function chunkEnd(lines: Line[], i: number): number {
  const t = lines[i].text;
  if (FENCE_RE.test(t)) return fenceEnd(lines, i);
  const d = DIRECTIVE_RE.exec(t);
  if (d && d[2]) {
    const e = directiveEnd(lines, i);
    return e >= 0 ? e : paragraphEnd(lines, i);
  }
  if (HEADING_RE.test(t)) return i;
  if (t.startsWith('<!--')) {
    for (let j = i; j < lines.length; j++) if (lines[j].text.includes('-->')) return j;
    return lines.length - 1;
  }
  const jsx = JSX_START_RE.exec(t);
  if (jsx) {
    const open = readOpenTag(lines, i);
    if (!open) return paragraphEnd(lines, i);
    const self = /\/\s*>$/.test(open.tag);
    let end = open;
    if (!self) {
      const close = closingTag(lines, jsx[1], open.line, open.col);
      if (!close) return paragraphEnd(lines, i);
      end = { tag: open.tag, line: close.line, col: close.col };
    }
    const after = lines[end.line].text.slice(end.col);
    if (after.trim() === '') return end.line;
    // Texto tras la etiqueta en la misma línea: es un párrafo que empieza con JSX en línea.
    return Math.max(end.line, paragraphEnd(lines, end.line));
  }
  if (/^(?:import|export)\s/.test(t) || t.startsWith('{')) {
    let j = i;
    while (j + 1 < lines.length && !isBlank(lines[j + 1].text)) j++;
    return j;
  }
  if (BULLET_RE.test(t) && !/^ {0,3}([-*_])( *\1){2,} *$/.test(t)) return listEnd(lines, i);
  if (ORDERED_RE.test(t)) return listEnd(lines, i);
  return paragraphEnd(lines, i);
}

// ───────────────────────────── clasificación ─────────────────────────────

type Draft = { [T in BlockType]: { type: T } & BlockData<T> }[BlockType];

const CALLOUT_KINDS: ReadonlySet<string> = new Set<CalloutKind>(['tip', 'info', 'warning', 'danger', 'details', 'note', 'caution']);

function parseFigure(line: string): ImageData | null {
  const tag = parseOpenTag(line.trim());
  if (!tag || tag.name !== 'Figure' || !tag.selfClosing) return null;
  const img: ImageData = { src: '', alt: '', caption: '', width: null, height: null, max: '', variant: '' };
  for (const [k, v] of tag.attrs) {
    if (k === 'width' || k === 'height') {
      if (v.kind !== 'number') return null;
      img[k] = v.value;
    } else if (k === 'src' || k === 'alt' || k === 'caption' || k === 'max' || k === 'variant') {
      if (v.kind !== 'string') return null;
      img[k] = v.value;
    } else return null;
  }
  return img;
}

/** Contenido de `<Tag>` … `</Tag>` repetidos (pasos o tarjetas): devuelve [etiqueta de apertura, contenido][]. */
function parseRepeated(inner: string[], name: string): Array<[string, string]> | null {
  const out: Array<[string, string]> = [];
  let i = 0;
  const openRe = new RegExp(`^<${name}(?=[\\s>])[^]*>$`);
  while (i < inner.length) {
    const open = inner[i];
    if (!openRe.test(open)) return null;
    let depth = 1;
    let j = i + 1;
    let fence: string | null = null;
    for (; j < inner.length; j++) {
      const f = FENCE_RE.exec(inner[j]);
      if (fence) {
        if (isFenceClose(inner[j], fence)) fence = null;
        continue;
      }
      if (f) {
        fence = f[1];
        continue;
      }
      if (new RegExp(`^<${name}(?=[\\s>])`).test(inner[j]) && !inner[j].endsWith('/>')) depth++;
      else if (inner[j] === `</${name}>`) {
        depth--;
        if (depth === 0) break;
      }
    }
    if (j >= inner.length) return null;
    let content = inner.slice(i + 1, j).join('\n');
    if (content.startsWith('\n') && content.endsWith('\n') && content.length >= 2) content = content.slice(1, -1);
    out.push([open, content]);
    i = j + 1;
  }
  return out;
}

function parseStep(content: string): StepItem {
  const m = /^\*\*([^*\n]+)\*\*(?:\n\n([\s\S]*))?$/.exec(content);
  if (m) return { title: m[1], md: m[2] ?? '' };
  return { title: '', md: content };
}

function parseCard(open: string, content: string): CardItem | null {
  const tag = parseOpenTag(open);
  if (!tag || tag.selfClosing) return null;
  const card: CardItem = { title: '', href: '', icon: '', md: content };
  for (const [k, v] of tag.attrs) {
    if ((k === 'title' || k === 'href' || k === 'icon') && v.kind === 'string') card[k] = v.value;
    else return null;
  }
  return card;
}

function classify(raw: string): Draft | null {
  const lines = raw.split('\n');
  const first = lines[0];
  const last = lines[lines.length - 1];

  if (lines.length === 1) {
    const h = /^(#{1,6}) (.*)$/.exec(first);
    if (h) return { type: 'heading', level: h[1].length as HeadingLevel, text: h[2] };
    if (first === '---') return { type: 'divider' };
    const k = /^<Kicker>(.*)<\/Kicker>$/.exec(first);
    if (k) return { type: 'kicker', text: k[1] };
    const l = /^<Lead>(.*)<\/Lead>$/.exec(first);
    if (l) return { type: 'lead', text: l[1] };
    const fig = parseFigure(first);
    if (fig) return { type: 'image', ...fig };
    const tag = first.startsWith('<') ? parseOpenTag(first) : null;
    if (tag && tag.selfClosing && tag.attrs.length === 1) {
      const [[k0, v0]] = tag.attrs;
      if (tag.name === 'Tour' && k0 === 'id' && v0.kind === 'string') return { type: 'tour', slug: v0.value };
      if (tag.name === 'SearchTerms' && k0 === 'terms' && v0.kind === 'string') return { type: 'searchTerms', terms: v0.value };
    }
  }

  const fm = FENCE_RE.exec(first);
  if (fm && lines.length >= 2 && isFenceClose(last, fm[1])) {
    const info = fm[2].trim();
    const sp = info.search(/\s/);
    return {
      type: 'code',
      lang: sp < 0 ? info : info.slice(0, sp),
      meta: sp < 0 ? '' : info.slice(sp + 1).trim(),
      code: lines.slice(1, -1).join('\n'),
    };
  }

  const d = DIRECTIVE_RE.exec(first);
  if (d && d[1] === ':::' && d[2] && CALLOUT_KINDS.has(d[2]) && last === ':::' && lines.length >= 2) {
    const inner = lines.slice(1, -1);
    const padded = inner.length >= 2 && inner[0] === '' && inner[inner.length - 1] === '';
    return {
      type: 'callout',
      kind: d[2] as CalloutKind,
      title: d[3].trim(),
      md: (padded ? inner.slice(1, -1) : inner).join('\n'),
      padded,
    };
  }

  if (first === '<Steps>' && last === '</Steps>') {
    const items = parseRepeated(lines.slice(1, -1), 'Step');
    if (items && items.every(([open]) => open === '<Step>')) return { type: 'steps', steps: items.map(([, c]) => parseStep(c)) };
  }

  const cardsOpen = /^<Cards(?=[\s>])/.test(first) ? parseOpenTag(first) : null;
  if (cardsOpen && !cardsOpen.selfClosing && last === '</Cards>') {
    let columns: number | null = null;
    let ok = true;
    for (const [k, v] of cardsOpen.attrs) {
      if (k === 'columns' && v.kind === 'number') columns = v.value;
      else ok = false;
    }
    const items = ok ? parseRepeated(lines.slice(1, -1), 'Card') : null;
    const cards = items?.map(([open, c]) => parseCard(open, c)) ?? null;
    if (cards && cards.every((c): c is CardItem => c !== null)) return { type: 'cards', columns, cards };
  }

  const row = /^<(FigRow|FigGrid)>$/.exec(first);
  if (row && last === `</${row[1]}>`) {
    const images = lines.slice(1, -1).map(parseFigure);
    if (images.every((x): x is ImageData => x !== null)) return { type: 'imageRow', kind: row[1] === 'FigGrid' ? 'grid' : 'row', images };
  }

  if (BULLET_RE.test(first) || ORDERED_RE.test(first)) {
    const list = parseList(lines);
    if (list) return list;
  }

  if (first.startsWith('|') && lines.length >= 2 && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[1])) {
    return { type: 'table', md: raw };
  }

  // Un párrafo puede empezar con JSX en línea (`<Badge>`, `<strong>`…), no con un componente de bloque.
  const inlineStart = /^<(Badge|a|abbr|b|br|code|em|i|kbd|mark|small|span|strong|sub|sup|u)[\s>/]/.test(first);
  if ((!inlineStart && /^(?:<|>|:::|\{|import\s|export\s|#|\s)/.test(first)) || FENCE_RE.test(first)) return null;
  return { type: 'paragraph', md: raw };
}

function parseList(lines: string[]): Draft | null {
  const b = BULLET_RE.exec(lines[0]);
  const o = b ? null : ORDERED_RE.exec(lines[0]);
  const ordered = !b;
  const marker = b ? (b[2] as '-' | '*' | '+') : (o![3] as '.' | ')');
  const start = o ? Number(o[2]) : 1;
  const items: Array<{ lines: string[]; pad: string }> = [];
  let loose = false;
  for (const line of lines) {
    const m = ordered ? ORDERED_RE.exec(line) : BULLET_RE.exec(line);
    if (m && m[1] === '' && (ordered ? m[3] === marker : m[2] === marker)) {
      const width = ordered ? m[2].length + 2 : 2;
      const prev = items.at(-1);
      if (prev && prev.lines.at(-1) === '') {
        loose = true;
        prev.lines.pop();
      }
      items.push({ lines: [line.slice(width)], pad: ' '.repeat(width) });
      continue;
    }
    const cur = items.at(-1);
    if (!cur) return null;
    if (line === '') cur.lines.push('');
    else if (line.startsWith(cur.pad)) cur.lines.push(line.slice(cur.pad.length));
    else return null;
  }
  return { type: 'list', ordered, start, marker, loose, items: items.map(it => it.lines.join('\n')) };
}

// ───────────────────────────── API ─────────────────────────────

/** Bloque a partir de un trozo de texto (LF o CRLF), con comprobación canónica. */
function toBlock(raw: string, eol: Eol, makeId: () => string): Block {
  const lf = toLf(raw);
  const draft = classify(lf);
  const base = { id: makeId(), raw, dirty: false, sep: '', eol };
  if (draft) {
    const candidate = { ...base, ...draft } as Block;
    if (toEol(renderBlock(candidate), eol) === raw) return candidate;
  }
  return { ...base, type: 'raw', code: lf } as BlockOf<'raw'>;
}

/** Divide el cuerpo MDX en bloques. `serializeBlocks(parseMdx(x)) === x` para cualquier texto. */
export function parseMdx(body: string, opts: ParseOptions = {}): Block[] {
  const makeId = opts.makeId ?? defaultMakeId;
  const nl = body.indexOf('\n');
  const eol: Eol = nl > 0 && body[nl - 1] === '\r' ? '\r\n' : '\n';
  const lines = splitLines(body);
  const blocks: Block[] = [];
  let pre = '';
  let i = 0;
  while (i < lines.length && isBlank(lines[i].text)) {
    pre += lines[i].text + lines[i].eol;
    i++;
  }
  if (i >= lines.length) {
    if (!body) return [];
    return [{ id: makeId(), type: 'raw', code: '', raw: '', dirty: false, sep: '', pre: body, nextId: null, eol }];
  }
  while (i < lines.length) {
    const end = chunkEnd(lines, i);
    const raw = lines
      .slice(i, end + 1)
      .map((l, k, arr) => l.text + (k < arr.length - 1 ? l.eol : ''))
      .join('');
    const block = toBlock(raw, eol, makeId);
    let sep = lines[end].eol;
    let j = end + 1;
    while (j < lines.length && isBlank(lines[j].text)) {
      sep += lines[j].text + lines[j].eol;
      j++;
    }
    block.sep = sep;
    blocks.push(block);
    i = j;
  }
  blocks[0].pre = pre;
  blocks.forEach((b, k) => {
    b.nextId = k + 1 < blocks.length ? blocks[k + 1].id : null;
  });
  return blocks;
}
