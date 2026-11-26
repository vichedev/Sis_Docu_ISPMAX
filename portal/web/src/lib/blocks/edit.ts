/*
 * Edición pura e inmutable de listas de bloques: nunca modifica lo recibido, siempre devuelve arrays nuevos.
 * Los ids se conservan al editar y al convertir; un bloque nuevo o duplicado recibe un id nuevo.
 */
import type {
  Block,
  BlockData,
  BlockMeta,
  BlockOf,
  BlockPatch,
  BlockType,
  CalloutKind,
  CardItem,
  ImageData,
  StepItem,
} from './types.ts';
import { parseMdx } from './parse.ts';
import { blockText } from './serialize.ts';
import { hasBlankLine, makeId, toEol, toLf } from './util.ts';

/** Cualquier cambio de contenido válido para algún tipo de bloque. */
export type AnyBlockPatch = { [T in BlockType]: BlockPatch<T> }[BlockType];

const META_KEYS: ReadonlySet<string> = new Set<keyof BlockMeta | 'type'>(['id', 'raw', 'dirty', 'sep', 'pre', 'nextId', 'eol', 'type']);

/** Título por defecto de cada tipo de aviso (guía de estilo § 6). */
export const CALLOUT_TITLES: Readonly<Record<CalloutKind, string>> = {
  tip: 'Nota',
  info: 'Información',
  warning: 'Importante',
  danger: 'Advertencia',
  details: 'Pregunta',
  note: 'Nota',
  caution: 'Precaución',
};

export const emptyImage = (): ImageData => ({ src: '', alt: '', caption: '', width: null, height: null, max: '', variant: '' });

/**
 * Datos de `<Figure>` para una imagen de la galería, con la convención del manual: `src` público
 * `/assets/<ruta>`, tamaño real del archivo y `max` = su ancho si no pasa de 1100 px, si no `1100px`.
 */
export function imageFromAsset(a: { path: string; width?: number | null; height?: number | null; alt?: string; caption?: string }): ImageData {
  const src = a.path.startsWith('/') ? a.path : `/assets/${a.path.replace(/^assets\//, '')}`;
  const width = a.width ?? null;
  return {
    src,
    alt: a.alt ?? '',
    caption: a.caption ?? '',
    width,
    height: a.height ?? null,
    max: width ? `${Math.min(width, 1100)}px` : '',
    variant: '',
  };
}

const DEFAULTS: { [T in BlockType]: () => BlockData<T> } = {
  heading: () => ({ level: 2, text: 'Título de la sección' }),
  paragraph: () => ({ md: 'Escriba aquí el texto.' }),
  list: () => ({ ordered: false, start: 1, marker: '-', loose: false, items: ['Primer elemento', 'Segundo elemento'] }),
  image: () => emptyImage(),
  imageRow: () => ({ kind: 'row', images: [emptyImage(), emptyImage()] }),
  steps: () => ({ steps: [{ title: '', md: 'Abra **Módulo → Pantalla**.' }, { title: '', md: 'Pulse **Guardar**.' }] }),
  callout: () => ({ kind: 'tip', title: CALLOUT_TITLES.tip, md: 'Texto del aviso.', padded: true }),
  cards: () => ({ columns: 2, cards: [{ title: 'Título', href: '', icon: '', md: 'Descripción breve.' }] }),
  table: () => ({ md: '| Columna | Descripción |\n|---|---|\n| Valor | Qué significa |' }),
  code: () => ({ lang: '', meta: '', code: '' }),
  kicker: () => ({ text: 'Quiero hacer… · Módulo' }),
  lead: () => ({ text: 'Una frase: qué se logra y cuándo se usa.' }),
  divider: () => ({}),
  tour: () => ({ slug: '' }),
  searchTerms: () => ({ terms: '' }),
  raw: () => ({ code: '' }),
};

function cleanPatch(patch: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (!META_KEYS.has(k) && v !== undefined) out[k] = v;
  return out;
}

const clone = <T>(v: T): T => (v === null || typeof v !== 'object' ? v : (JSON.parse(JSON.stringify(v)) as T));

/** Bloque nuevo de un tipo con valores por defecto (y `init` encima). Se serializa con la sintaxis del manual. */
export function newBlock<T extends BlockType>(type: T, init: BlockPatch<T> = {}): BlockOf<T> {
  const data: Record<string, unknown> = { ...DEFAULTS[type](), ...cleanPatch(init) };
  // Aviso de otro tipo sin título explícito: el título habitual de ese tipo (Importante, Advertencia…).
  if (type === 'callout' && !('title' in init) && 'kind' in init) data.title = CALLOUT_TITLES[data.kind as CalloutKind] ?? '';
  return { id: makeId(), type, raw: '', dirty: true, sep: '\n\n', ...data } as unknown as BlockOf<T>;
}

const indexOfId = (blocks: readonly Block[], id: string): number => blocks.findIndex(b => b.id === id);
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Inserta `block` en la posición `index` (0 = al principio; >= longitud = al final). */
export function insertBlock(blocks: readonly Block[], index: number, block: Block): Block[] {
  const out = blocks.slice();
  out.splice(clamp(index, 0, out.length), 0, block);
  return out;
}

/** Quita el bloque `id`. Si llevaba el blanco inicial del documento (`pre`), lo hereda el nuevo primero. */
export function removeBlock(blocks: readonly Block[], id: string): Block[] {
  const i = indexOfId(blocks, id);
  if (i < 0) return blocks.slice();
  const removed = blocks[i];
  const out = blocks.filter((_, k) => k !== i);
  if (removed.pre != null && out.length && !out.some(b => b.pre != null)) out[0] = { ...out[0], pre: removed.pre };
  return out;
}

/** Mueve el bloque `id` para que quede en la posición `toIndex` del resultado. */
export function moveBlock(blocks: readonly Block[], id: string, toIndex: number): Block[] {
  const i = indexOfId(blocks, id);
  if (i < 0) return blocks.slice();
  const out = blocks.slice();
  const [b] = out.splice(i, 1);
  out.splice(clamp(toIndex, 0, out.length), 0, b);
  return out;
}

/** Copia del bloque `id` justo después de él (id nuevo; si no estaba editado, conserva su texto exacto). */
export function duplicateBlock(blocks: readonly Block[], id: string): Block[] {
  const i = indexOfId(blocks, id);
  if (i < 0) return blocks.slice();
  const { pre: _pre, nextId: _next, ...rest } = clone(blocks[i]);
  void _pre;
  void _next;
  const copy = { ...rest, id: makeId(), sep: blocks[i].sep.includes('\n') ? blocks[i].sep : '\n\n' } as Block;
  return insertBlock(blocks, i + 1, copy);
}

/**
 * Cambia campos de contenido del bloque `id` (los metadatos y `type` se ignoran). El bloque queda `dirty`
 * y se regenera al serializar. Si el cambio no altera nada, devuelve los mismos bloques sin marcarlo.
 */
export function updateBlock(blocks: readonly Block[], id: string, patch: AnyBlockPatch): Block[] {
  const i = indexOfId(blocks, id);
  if (i < 0) return blocks.slice();
  const b = blocks[i];
  const p = cleanPatch(patch);
  const rec = b as unknown as Record<string, unknown>;
  const changed = Object.keys(p).some(k => JSON.stringify(rec[k]) !== JSON.stringify(p[k]));
  if (!changed) return blocks.slice();
  const out = blocks.slice();
  out[i] = { ...b, ...clone(p), dirty: true } as Block;
  return out;
}

/** Sustituye el bloque `id` por el resultado de `fn` (conserva id y metadatos; marca `dirty` si cambió). */
export function mapBlock(blocks: readonly Block[], id: string, fn: (b: Block) => Block): Block[] {
  const i = indexOfId(blocks, id);
  if (i < 0) return blocks.slice();
  const b = blocks[i];
  const next = fn(b);
  if (next === b) return blocks.slice();
  const out = blocks.slice();
  out[i] = { ...next, id: b.id, raw: b.raw, sep: b.sep, pre: b.pre, nextId: b.nextId, eol: b.eol, dirty: true } as Block;
  if (b.pre === undefined) delete (out[i] as Partial<BlockMeta>).pre;
  return out;
}

// ───────────────────────────── conversión ─────────────────────────────

/** Tipos a los que se puede convertir un bloque sin perder contenido. */
export function convertTargets(b: Block): BlockType[] {
  switch (b.type) {
    case 'paragraph':
      return ['heading', 'list', 'steps', 'callout', 'cards', 'lead', 'kicker', 'code', 'raw'];
    case 'heading':
      return ['paragraph', 'kicker', 'lead', 'callout', 'raw'];
    case 'list':
      return ['paragraph', 'steps', 'cards', 'callout', 'raw'];
    case 'steps':
      return ['list', 'paragraph', 'callout', 'raw'];
    case 'callout':
      return ['paragraph', 'list', 'steps', 'raw'];
    case 'cards':
      return ['list', 'paragraph', 'raw'];
    case 'table':
    case 'code':
      return ['paragraph', 'raw'];
    case 'kicker':
      return ['heading', 'paragraph', 'lead', 'raw'];
    case 'lead':
      return ['paragraph', 'kicker', 'heading', 'callout', 'raw'];
    case 'image':
      return ['imageRow', 'raw'];
    case 'imageRow':
      return b.images.length <= 1 ? ['image', 'raw'] : ['raw'];
    case 'raw':
      return ['paragraph', 'code'];
    default:
      return ['raw'];
  }
}

const stripMarker = (line: string): string => line.replace(/^\s*(?:[-*+]|\d{1,9}[.)])\s+/, '');
const stepText = (s: StepItem): string => [s.title ? `**${s.title}**` : '', s.md].filter(Boolean).join('\n\n');
const cardText = (c: CardItem): string => [c.title ? `**${c.title}**` : '', c.md].filter(Boolean).join('\n\n');

/** Contenido genérico de un bloque para convertirlo: elementos (listas, pasos, tarjetas) o texto Markdown. */
function contentOf(b: Block): { title: string; md: string; items: string[] | null } {
  switch (b.type) {
    case 'heading':
    case 'kicker':
    case 'lead':
      return { title: '', md: b.text, items: null };
    case 'paragraph':
    case 'table':
      return { title: '', md: b.md, items: null };
    case 'callout':
      return { title: b.title, md: b.md, items: null };
    case 'list':
      return { title: '', md: '', items: b.items };
    case 'steps':
      return { title: '', md: '', items: b.steps.map(stepText) };
    case 'cards':
      return { title: '', md: '', items: b.cards.map(cardText) };
    case 'code':
      return { title: '', md: b.code, items: null };
    case 'raw':
      return { title: '', md: b.code, items: null };
    default:
      return { title: '', md: blockText(b, '\n'), items: null };
  }
}

const firstLine = (s: string): string => toLf(s).split('\n').find(l => l.trim())?.trim() ?? '';
const join = (c: { title: string; md: string; items: string[] | null }, bullets: boolean): string => {
  if (c.items) return c.items.map(i => (bullets ? `- ${i.replace(/\n/g, '\n  ')}` : i)).join(bullets ? '\n' : '\n\n');
  return [c.title ? `**${c.title}**` : '', c.md].filter(Boolean).join('\n\n');
};
const splitItems = (c: { title: string; md: string; items: string[] | null }): string[] => {
  if (c.items) return c.items;
  const lines = toLf(c.md).split('\n').filter(l => l.trim()).map(stripMarker);
  return lines.length ? lines : [''];
};

/**
 * Convierte el bloque `id` a otro tipo conservando su contenido (id, posición y separadores incluidos).
 * Solo admite los destinos de `convertTargets`; si no, devuelve los bloques sin cambios.
 */
export function convertBlock(blocks: readonly Block[], id: string, to: BlockType): Block[] {
  const i = indexOfId(blocks, id);
  if (i < 0) return blocks.slice();
  const b = blocks[i];
  if (b.type === to || !convertTargets(b).includes(to)) return blocks.slice();
  const c = contentOf(b);
  let data: AnyBlockPatch;
  switch (to) {
    case 'heading':
      data = { level: 2, text: firstLine(c.md).replace(/^#+\s*/, '') };
      break;
    case 'paragraph':
      data = { md: b.type === 'list' ? toLf(blockText(b, '\n')) : join(c, false) };
      break;
    case 'list':
      data = { ordered: b.type === 'steps', start: 1, marker: b.type === 'steps' ? '.' : '-', loose: false, items: splitItems(c) };
      break;
    case 'steps':
      data = { steps: c.items ? c.items.map(md => ({ title: '', md })) : [{ title: c.title, md: c.md }] };
      break;
    case 'callout':
      data = { kind: 'tip', title: c.title || CALLOUT_TITLES.tip, md: c.items ? join(c, true) : c.md, padded: true };
      break;
    case 'cards':
      data = { columns: 2, cards: splitItems(c).map(md => ({ title: '', href: '', icon: '', md })) };
      break;
    case 'kicker':
    case 'lead':
      data = { text: firstLine(c.md).replace(/^#+\s*/, '') };
      break;
    case 'code':
      data = { lang: '', meta: '', code: c.md };
      break;
    case 'image':
      data = b.type === 'imageRow' && b.images[0] ? { ...b.images[0] } : emptyImage();
      break;
    case 'imageRow':
      data = { kind: 'row', images: b.type === 'image' ? [pickImage(b)] : [] };
      break;
    case 'raw':
      data = { code: toLf(blockText(b, '\n')) };
      break;
    default:
      return blocks.slice();
  }
  const fresh = newBlock(to, data as never);
  const out = blocks.slice();
  // Un tipo nuevo puede necesitar línea en blanco con sus vecinos aunque antes fueran contiguos.
  const blank = (sep: string): string => (hasBlankLine(sep) ? sep : sep.includes('\n') ? `${sep}${sep.endsWith('\r\n') ? '\r\n' : '\n'}` : sep);
  out[i] = { ...fresh, id: b.id, raw: b.raw, sep: i < blocks.length - 1 ? blank(b.sep) : b.sep, nextId: b.nextId, eol: b.eol, ...(b.pre != null ? { pre: b.pre } : {}) } as Block;
  if (i > 0) out[i - 1] = { ...out[i - 1], sep: blank(out[i - 1].sep) };
  return out;
}

function pickImage(b: BlockOf<'image'>): ImageData {
  return { src: b.src, alt: b.alt, caption: b.caption, width: b.width, height: b.height, max: b.max, variant: b.variant };
}

/**
 * Vuelve a analizar un bloque `raw` (tras editarlo como código) y lo sustituye por los bloques que salgan.
 * Los bloques resultantes conservan su texto exacto; el primero hereda `pre` y el último el separador.
 */
export function reparseBlock(blocks: readonly Block[], id: string): Block[] {
  const i = indexOfId(blocks, id);
  if (i < 0) return blocks.slice();
  const b = blocks[i];
  if (b.type !== 'raw') return blocks.slice();
  const eol = b.eol ?? '\n';
  const parsed = parseMdx(toEol(b.code, eol));
  if (!parsed.length) return removeBlock(blocks, id);
  const fixed = parsed.map((p, k) => {
    const n: Block = { ...p, eol };
    if (k === 0) {
      if (b.pre != null) n.pre = b.pre;
      else delete n.pre;
    }
    if (k === parsed.length - 1) {
      n.sep = b.sep;
      n.nextId = b.nextId;
    }
    return n;
  });
  const out = blocks.slice();
  out.splice(i, 1, ...fixed);
  return out;
}

// ───────────────────────────── elementos dentro de un bloque ─────────────────────────────

/** Copia de `arr` con `item` insertado en `index`. */
export function insertItem<T>(arr: readonly T[], index: number, item: T): T[] {
  const out = arr.slice();
  out.splice(clamp(index, 0, out.length), 0, item);
  return out;
}
/** Copia de `arr` sin el elemento `index`. */
export function removeItem<T>(arr: readonly T[], index: number): T[] {
  return arr.filter((_, k) => k !== index);
}
/** Copia de `arr` con el elemento `from` movido a `to`. */
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= arr.length) return arr.slice();
  const out = arr.slice();
  const [x] = out.splice(from, 1);
  out.splice(clamp(to, 0, out.length), 0, x);
  return out;
}
/** Copia de `arr` con el elemento `index` sustituido. */
export function replaceItem<T>(arr: readonly T[], index: number, item: T): T[] {
  return arr.map((x, k) => (k === index ? item : x));
}
