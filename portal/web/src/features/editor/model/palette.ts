/*
 * Lógica pura de la paleta de bloques y del tour desde una imagen (probada con `node --test test/editor.test.mjs`):
 *   PALETTE_GROUPS       — categorías de la paleta con los comandos de INSERT_COMMANDS que muestran.
 *   paletteSections(q)   — secciones filtradas por el buscador (sin tildes ni mayúsculas).
 *   dropIndex(mids, y)   — posición de inserción al soltar en el lienzo, según el punto medio de cada bloque.
 *   slugCandidates(t)    — identificadores a probar para un tour nuevo: `crear-cliente`, `crear-cliente-2`…
 *   tourImagePath(src)   — ruta de galería (`imgs/…`) de una imagen de bloque, o null si no es de la galería.
 */
import { INSERT_COMMANDS, type InsertCommand } from './doc.ts';

/** Tipo de datos de una ficha de la paleta al arrastrarla sobre el lienzo. */
export const BLOCK_MIME = 'application/x-portal-block';

export interface PaletteGroup { id: string; label: string; ids: readonly string[] }

export const PALETTE_GROUPS: readonly PaletteGroup[] = [
  { id: 'text', label: 'Texto', ids: ['heading2', 'heading3', 'paragraph', 'list', 'olist', 'lead', 'kicker'] },
  { id: 'media', label: 'Medios', ids: ['image', 'imageRow', 'imageGrid', 'tour'] },
  { id: 'structure', label: 'Estructura', ids: ['steps', 'cards', 'table', 'divider'] },
  { id: 'callouts', label: 'Destacados', ids: ['warning', 'tip', 'info', 'danger', 'details'] },
  { id: 'advanced', label: 'Avanzado', ids: ['code', 'searchTerms', 'raw'] },
];

/** Nombre corto en la ficha (el del menú «/» es más largo: «Aviso: Importante»). */
export const PALETTE_LABELS: Readonly<Record<string, string>> = {
  heading2: 'Título', heading3: 'Subtítulo', paragraph: 'Párrafo', list: 'Lista', olist: 'Lista numerada', lead: 'Entradilla', kicker: 'Antetítulo',
  image: 'Imagen', imageRow: 'Fila de imágenes', imageGrid: 'Cuadrícula', tour: 'Tour guiado',
  steps: 'Pasos', cards: 'Tarjetas', table: 'Tabla', divider: 'Divisor',
  warning: 'Importante', tip: 'Nota o consejo', info: 'Información', danger: 'Advertencia', details: 'Desplegable',
  code: 'Código', searchTerms: 'Términos de búsqueda', raw: 'MDX libre',
};
/** Palabras extra para el buscador de la paleta. */
const EXTRA: Readonly<Record<string, string>> = {
  paragraph: 'parrafo texto', tip: 'consejo nota truco', danger: 'peligro riesgo', warning: 'importante atencion', details: 'desplegable pregunta faq plegable',
  image: 'imagen foto captura', imageRow: 'fila galeria', imageGrid: 'cuadricula rejilla galeria', tour: 'tour recorrido guiado paso a paso',
};

export interface PaletteItem extends InsertCommand { short: string }
export interface PaletteSection { group: PaletteGroup; items: PaletteItem[] }

export const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const byId = new Map(INSERT_COMMANDS.map((c) => [c.id, c]));

export function paletteSections(query = ''): PaletteSection[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const out: PaletteSection[] = [];
  for (const group of PALETTE_GROUPS) {
    const items: PaletteItem[] = [];
    for (const id of group.ids) {
      const c = byId.get(id);
      if (!c) continue;
      const short = PALETTE_LABELS[id] ?? c.label;
      const hay = norm(`${short} ${c.label} ${c.keywords} ${EXTRA[id] ?? ''} ${c.hint} ${group.label}`);
      if (words.every((w) => hay.includes(w))) items.push({ ...c, short });
    }
    if (items.length) out.push({ group, items });
  }
  return out;
}

/** Índice donde insertar al soltar a la altura `y`: delante del primer bloque cuyo punto medio queda por debajo. */
export function dropIndex(mids: readonly number[], y: number): number {
  let i = 0;
  while (i < mids.length && mids[i] <= y) i++;
  return i;
}

/** Identificadores a probar, en orden, para un tour nuevo con este título. */
export function slugCandidates(title: string, max = 20): string[] {
  const base = norm(title).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 54).replace(/-+$/, '') || 'tour';
  const out = [base];
  for (let n = 2; out.length < max; n++) out.push(`${base}-${n}`);
  return out;
}

/** `/assets/imgs/x.webp` → `imgs/x.webp` (lo que guarda un paso de tour). Null si la imagen no es de la galería del portal. */
export function tourImagePath(src: string): string | null {
  if (!src || /^[a-z]+:/i.test(src) || src.startsWith('//')) return null;
  const rel = src.replace(/^\/?(assets\/)?/, '');
  if (!rel || rel.split('/').some((p) => p === '..' || p === '.' || p === '')) return null;
  return rel;
}
