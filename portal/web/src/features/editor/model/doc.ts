/*
 * Puente puro entre la lista de bloques del lienzo y el cuerpo MDX de la página:
 *   docText(blocks)        — MDX que se guarda (omite los bloques nuevos que quedaron vacíos).
 *   blockLines(blocks)     — líneas (1-based) que ocupa cada bloque en docText, para validación y esquema.
 *   blockAtLine(lines, n)  — bloque que contiene la línea n.
 *   roundTripOk(body)      — garantía de no destrucción: analizar y volver a escribir da el mismo texto.
 *   INSERT_COMMANDS        — comandos de los menús «+» y «/» (con variantes: subtítulo, tipos de aviso…).
 */
import { BLOCK_TYPES, blockText, documentEol, newBlock, parseMdx, removeBlock, serializeBlocks } from '../../../lib/blocks/index.ts';
import type { Block, BlockPatch, BlockType } from '../../../lib/blocks/index.ts';

/** Bloque creado o editado en el portal que quedó sin contenido (no se escribe en el MDX): texto vacío, imagen o tour sin elegir. */
export function isBlankBlock(b: Block): boolean {
  if (!b.dirty) return false;
  if (b.type === 'paragraph') return !b.md.trim();
  if (b.type === 'heading' || b.type === 'kicker' || b.type === 'lead') return !b.text.trim();
  // Huecos sin rellenar (se insertaron y no se eligió imagen ni tour): no se escriben.
  if (b.type === 'image') return !b.src;
  if (b.type === 'imageRow') return b.images.length === 0;
  if (b.type === 'tour') return !b.slug;
  return false;
}

/** Bloques que se escriben (sin los vacíos), conservando el blanco inicial del documento. */
export function savedBlocks(blocks: readonly Block[]): Block[] {
  let out = blocks.slice();
  for (const b of blocks) if (isBlankBlock(b)) out = removeBlock(out, b.id);
  return out;
}

/** Cuerpo MDX que corresponde al lienzo. */
export const docText = (blocks: readonly Block[]): string => serializeBlocks(savedBlocks(blocks));

/** true si abrir la página en el lienzo y guardarla sin tocar nada deja el cuerpo idéntico. */
export const roundTripOk = (body: string): boolean => serializeBlocks(parseMdx(body)) === body;

export interface BlockLines { id: string; start: number; end: number }

const nl = (s: string): number => (s.match(/\n/g) ?? []).length;
const hasBlank = (sep: string): boolean => nl(sep) >= 2;

/** Líneas que ocupa cada bloque escrito en `docText(blocks)` (los vacíos no aparecen). Mismo algoritmo que serializeBlocks. */
export function blockLines(blocks: readonly Block[]): BlockLines[] {
  const list = savedBlocks(blocks);
  const eol = documentEol(list);
  let line = 1 + nl(list.find((b) => b.pre != null)?.pre ?? '');
  const out: BlockLines[] = [];
  list.forEach((b, i) => {
    const text = blockText(b, eol);
    out.push({ id: b.id, start: line, end: line + nl(text) });
    line += nl(text);
    const next = list[i + 1];
    if (next) line += nl(hasBlank(b.sep) || b.nextId === next.id ? b.sep : eol + eol);
  });
  return out;
}

/** Bloque que contiene la línea `line` (si cae en un separador, el bloque anterior). */
export function blockAtLine(lines: readonly BlockLines[], line: number): string | null {
  let found: string | null = null;
  for (const l of lines) {
    if (l.start <= line) found = l.id;
    else break;
  }
  return found ?? lines[0]?.id ?? null;
}

/** Agrupa los problemas de validación por bloque. */
export function problemsByBlock<P extends { line?: number }>(blocks: readonly Block[], problems: readonly P[]): Map<string, P[]> {
  const lines = blockLines(blocks);
  const m = new Map<string, P[]>();
  for (const p of problems) {
    if (p.line == null) continue;
    const id = blockAtLine(lines, p.line);
    if (!id) continue;
    m.set(id, [...(m.get(id) ?? []), p]);
  }
  return m;
}

// ───────────────────────────── comandos de inserción ─────────────────────────────

export interface InsertCommand {
  id: string;
  type: BlockType;
  label: string;
  hint: string;
  keywords: string;
  group: 'Texto' | 'Contenido' | 'Imágenes y tours' | 'Avanzado';
  init: Record<string, unknown>;
}

const info = (t: BlockType) => BLOCK_TYPES.find((x) => x.type === t);
const cmd = (id: string, type: BlockType, group: InsertCommand['group'], init: Record<string, unknown> = {}, label?: string, hint?: string, extra = ''): InsertCommand => ({
  id, type, group, init, label: label ?? info(type)?.label ?? type, hint: hint ?? info(type)?.hint ?? '',
  // Palabras propias si se dan (las variantes no heredan las del tipo: «importante» no debe encontrar «Nota»).
  keywords: extra || (info(type)?.keywords ?? []).join(' '),
});
const emptyCard = { title: '', href: '', icon: '', md: '' };

/** Comandos de los menús «+» y «/», en el orden en que se muestran. */
export const INSERT_COMMANDS: readonly InsertCommand[] = [
  cmd('heading2', 'heading', 'Texto', { level: 2, text: '' }, 'Título', 'Título de sección (##). Aparece en «En esta página».', 'titulo encabezado seccion h2'),
  cmd('heading3', 'heading', 'Texto', { level: 3, text: '' }, 'Subtítulo', 'Subtítulo dentro de una sección (###).', 'subtitulo encabezado h3'),
  cmd('paragraph', 'paragraph', 'Texto', { md: '' }),
  cmd('list', 'list', 'Texto', { items: [''] }, 'Lista con viñetas', 'Elementos sin orden.', 'lista viñetas puntos ul'),
  cmd('olist', 'list', 'Texto', { ordered: true, marker: '.', items: [''] }, 'Lista numerada', 'Elementos en orden (1. 2. 3.).', 'lista numerada ordenada ol'),
  cmd('lead', 'lead', 'Texto', { text: '' }),
  cmd('kicker', 'kicker', 'Texto', { text: '' }),
  cmd('steps', 'steps', 'Contenido', { steps: [{ title: '', md: '' }] }),
  cmd('tip', 'callout', 'Contenido', { kind: 'tip', md: '' }, 'Aviso: Nota', 'Dato útil o aclaración (:::tip).', 'aviso nota concepto tip'),
  cmd('info', 'callout', 'Contenido', { kind: 'info', md: '' }, 'Aviso: Información', 'Contexto o información adicional (:::info).', 'aviso informacion info'),
  cmd('warning', 'callout', 'Contenido', { kind: 'warning', md: '' }, 'Aviso: Importante', 'Dato importante que no se debe pasar por alto (:::warning).', 'aviso importante dato warning'),
  cmd('danger', 'callout', 'Contenido', { kind: 'danger', md: '' }, 'Aviso: Advertencia', 'Riesgo de perder datos o cortar servicio (:::danger).', 'aviso advertencia peligro danger'),
  cmd('details', 'callout', 'Contenido', { kind: 'details', md: '' }, 'Pregunta desplegable', 'Pregunta con respuesta plegable (:::details).', 'pregunta faq desplegable details'),
  cmd('cards', 'cards', 'Contenido', { columns: 2, cards: [{ ...emptyCard }, { ...emptyCard }] }),
  cmd('table', 'table', 'Contenido'),
  cmd('code', 'code', 'Contenido'),
  cmd('divider', 'divider', 'Contenido'),
  cmd('image', 'image', 'Imágenes y tours', {}, 'Imagen', 'Captura de la galería o subida, con pie.', 'imagen captura figura foto'),
  cmd('imageRow', 'imageRow', 'Imágenes y tours', { kind: 'row', images: [] }, 'Fila de imágenes', 'Varias capturas una al lado de otra (<FigRow>).', 'fila imagenes capturas galeria'),
  cmd('imageGrid', 'imageRow', 'Imágenes y tours', { kind: 'grid', images: [] }, 'Cuadrícula de imágenes', 'Capturas en rejilla de dos columnas (<FigGrid>).', 'cuadricula grid rejilla imagenes capturas'),
  cmd('tour', 'tour', 'Imágenes y tours'),
  cmd('searchTerms', 'searchTerms', 'Avanzado'),
  cmd('raw', 'raw', 'Avanzado'),
];

/** Bloque nuevo para un comando. */
export function blockFromCommand(c: InsertCommand): Block {
  return newBlock(c.type, c.init as BlockPatch<typeof c.type>) as Block;
}

/** Ajusta una lista de ids de elementos a `n` (para claves estables de pasos, tarjetas e imágenes). */
export function syncIds(ids: readonly string[], n: number, make: () => string): string[] {
  if (ids.length === n) return ids.slice();
  if (ids.length > n) return ids.slice(0, n);
  const out = ids.slice();
  while (out.length < n) out.push(make());
  return out;
}
