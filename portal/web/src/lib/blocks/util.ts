/* Utilidades internas del motor de bloques: ids, fines de línea, atributos JSX y escape de MDX. */
import type { Eol } from './types.ts';

// ───────────────────────────── ids ─────────────────────────────

const SESSION = Math.random().toString(36).slice(2, 8);
let counter = 0;

/** Id nuevo, único en la sesión (no depende del contenido). */
export function makeId(): string {
  counter += 1;
  return `b${SESSION}${counter.toString(36)}`;
}

// ───────────────────────────── fines de línea ─────────────────────────────

export const toLf = (s: string): string => s.replace(/\r\n/g, '\n');
export const toEol = (s: string, eol: Eol): string => (eol === '\n' ? s : toLf(s).replace(/\n/g, '\r\n'));
/** ¿El separador contiene al menos una línea en blanco? */
export const hasBlankLine = (sep: string): boolean => (sep.match(/\n/g) ?? []).length >= 2;

// ───────────────────────────── atributos JSX ─────────────────────────────

export type AttrValue = { kind: 'string'; value: string } | { kind: 'number'; value: number };
export interface ParsedTag {
  name: string;
  attrs: Array<[string, AttrValue]>;
  selfClosing: boolean;
}

/**
 * Analiza una etiqueta de apertura completa (`<Figure a="x" b={1} />`). Solo acepta valores `"…"`, `'…'`,
 * `{número}` y `{"cadena JSON"}`; cualquier otra cosa devuelve null (el bloque queda como `raw`).
 */
export function parseOpenTag(tag: string): ParsedTag | null {
  const m = /^<([A-Za-z][\w.]*)/.exec(tag);
  if (!m) return null;
  let i = m[0].length;
  const attrs: Array<[string, AttrValue]> = [];
  const n = tag.length;
  for (;;) {
    const ws = /^\s*/.exec(tag.slice(i));
    i += ws ? ws[0].length : 0;
    if (tag.startsWith('/>', i) && i + 2 === n) return { name: m[1], attrs, selfClosing: true };
    if (tag[i] === '>' && i + 1 === n) return { name: m[1], attrs, selfClosing: false };
    const nm = /^([A-Za-z_][\w-]*)=/.exec(tag.slice(i));
    if (!nm) return null;
    i += nm[0].length;
    const rest = tag.slice(i);
    let v: RegExpExecArray | null;
    if ((v = /^"([^"]*)"/.exec(rest)) || (v = /^'([^']*)'/.exec(rest))) {
      attrs.push([nm[1], { kind: 'string', value: v[1] }]);
    } else if ((v = /^\{(-?\d+(?:\.\d+)?)\}/.exec(rest))) {
      attrs.push([nm[1], { kind: 'number', value: Number(v[1]) }]);
    } else if ((v = /^\{("(?:[^"\\]|\\.)*")\}/.exec(rest))) {
      let s: unknown;
      try {
        s = JSON.parse(v[1]);
      } catch {
        return null;
      }
      if (typeof s !== 'string') return null;
      attrs.push([nm[1], { kind: 'string', value: s }]);
    } else return null;
    i += v[0].length;
  }
}

/** ` name="valor"`; si el valor lleva comillas dobles o saltos de línea, ` name={"…"}`. */
export function strAttr(name: string, value: string): string {
  return /["\n\r]/.test(value) ? ` ${name}={${JSON.stringify(value)}}` : ` ${name}="${value}"`;
}
export const numAttr = (name: string, value: number): string => ` ${name}={${value}}`;

// ───────────────────────────── escape de MDX ─────────────────────────────

/** Componentes globales del manual (`rspress.config.ts` → `markdown.globalComponents`). */
export const KNOWN_COMPONENTS: ReadonlySet<string> = new Set([
  'Kicker', 'Lead', 'Steps', 'Step', 'Figure', 'FigGrid', 'FigRow', 'Callout', 'Card', 'Cards', 'Badge', 'SearchTerms', 'Tour',
]);
/** Etiquetas HTML que el validador del portal acepta. */
export const HTML_TAGS: ReadonlySet<string> = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'details', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
  'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'th',
  'thead', 'tr', 'u', 'ul', 'video', 'source', 'iframe',
]);

const TAG_RE = /^<(\/?)([A-Za-z][\w.-]*)((?:"[^"]*"|'[^']*'|\{[^}]*\}|[^>"'{])*)>/;
const AUTOLINK_RE = /^<(?:https?:\/\/[^>\s]+|[^>\s@<]+@[^>\s<]+)>/;

/**
 * Escapa lo que MDX tomaría por código en texto Markdown: `{` y `}` sueltos → `\{` `\}`, y `<` que no abre
 * un componente del manual o una etiqueta HTML conocida bien cerrada, ni un autoenlace → `\<`. Respeta el código en línea,
 * los bloques de código con valla y lo ya escapado con `\`. Es idempotente y no cambia un MDX válido del manual.
 */
export function escapeMdxText(text: string): string {
  let out = '';
  let i = 0;
  const n = text.length;
  let lineStart = true;
  let fence: string | null = null;
  const open = new Map<string, number>();
  while (i < n) {
    if (lineStart) {
      const eolAt = text.indexOf('\n', i);
      const line = text.slice(i, eolAt < 0 ? n : eolAt);
      const fm = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (fence) {
        if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length && line.trim() === fm[1]) fence = null;
        out += line;
        i += line.length;
        lineStart = false;
        continue;
      }
      if (fm) {
        fence = fm[1];
        out += line;
        i += line.length;
        lineStart = false;
        continue;
      }
    }
    const c = text[i];
    lineStart = false;
    if (c === '\n') {
      out += c;
      i += 1;
      lineStart = true;
      continue;
    }
    if (c === '\\' && i + 1 < n && text[i + 1] !== '\n') {
      out += text.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (c === '`') {
      const run = /^`+/.exec(text.slice(i))![0];
      const close = findCodeSpanEnd(text, i + run.length, run.length);
      if (close >= 0) {
        out += text.slice(i, close);
        i = close;
      } else {
        out += run;
        i += run.length;
      }
      continue;
    }
    if (c === '{' || c === '}') {
      out += `\\${c}`;
      i += 1;
      continue;
    }
    if (c === '<') {
      const rest = text.slice(i);
      const tm = TAG_RE.exec(rest);
      if (tm && (KNOWN_COMPONENTS.has(tm[2]) || HTML_TAGS.has(tm[2]))) {
        // Etiqueta conocida: se deja si es autocerrada, si cierra una abierta antes o si su cierre aparece después.
        const name = tm[2];
        const closing = tm[1] === '/';
        const selfClosing = !closing && /\/\s*$/.test(tm[3]);
        const balanced = selfClosing
          ? true
          : closing
            ? (open.get(name) ?? 0) > 0
            : new RegExp(`</${name.replace(/[.]/g, '\\.')}\\s*>`).test(text.slice(i + tm[0].length));
        if (balanced) {
          if (!selfClosing) open.set(name, (open.get(name) ?? 0) + (closing ? -1 : 1));
          out += tm[0];
          i += tm[0].length;
          continue;
        }
      }
      const am = AUTOLINK_RE.exec(rest);
      if (am) {
        out += am[0];
        i += am[0].length;
        continue;
      }
      out += '\\<';
      i += 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** Fin (exclusivo) del código en línea que abre en `from` con `len` comillas invertidas, o -1. No cruza párrafos. */
function findCodeSpanEnd(text: string, from: number, len: number): number {
  let j = from;
  while (j < text.length) {
    if (text[j] === '`') {
      const run = /^`+/.exec(text.slice(j))![0];
      if (run.length === len) return j + len;
      j += run.length;
      continue;
    }
    if (text[j] === '\n' && /^\n[ \t]*(\n|$)/.test(text.slice(j))) return -1;
    j += 1;
  }
  return -1;
}

/** Texto legible de Markdown en línea (para el esquema y las etiquetas de la interfaz). */
export function plainText(md: string): string {
  return md
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!<>|])/g, '$1')
    .replace(/\*\*|__|~~|[`*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
