/*
 * Imágenes adjuntas del chat (lógica pura; probada con `node --test test/ai.test.mjs`).
 * La IA NO ve las imágenes: al servidor solo viajan texto y rutas de assets subidos por la persona. Aquí viven el orden,
 * las referencias (img1…), los avisos de alt y la inserción manual (cero IA) como bloques Figure del motor de bloques.
 */
import { renderFigure } from '../../lib/blocks/index.ts';

export type ImgSize = 'full' | 'medium' | 'small';
export const MAX_IMAGES = 12;
export const SIZE_LABEL: Record<ImgSize, string> = { full: 'Completo', medium: 'Mediano', small: 'Pequeño' };

export interface Attachment { uid: string; path: string; name: string; width: number; height: number; caption: string; alt: string; size: ImgSize; where: string }

/** Referencia que ve la IA: la posición en la bandeja (img1, img2…). */
export const refOf = (index: number): string => `img${index + 1}`;

/** Ancho máximo CSS del bloque Figure según el ancho elegido. */
export function sizeMax(size: ImgSize, width: number): string {
  return size === 'full' ? `${Math.min(width || 1100, 1100)}px` : size === 'medium' ? '720px' : '420px';
}

/** Referencias (img1…) a las que les falta el texto alternativo (obligatorio para insertar). */
export const missingAlt = (list: readonly Attachment[]): string[] => list.flatMap((a, i) => (a.alt.trim() ? [] : [refOf(i)]));

/** Lo que se envía al servidor en el contexto del chat (sin binarios: ruta de un asset que la persona subió). */
export function toContext(list: readonly Attachment[]) {
  return list.slice(0, MAX_IMAGES).map((a, i) => ({
    ref: refOf(i), path: a.path, name: a.name.slice(0, 120), caption: a.caption.slice(0, 300), alt: a.alt.slice(0, 300), size: a.size, where: a.where.slice(0, 120),
  }));
}

/** MDX de las figuras, en el orden de la bandeja y con los parámetros dados (modo manual: no interviene la IA). */
export function buildFigureMdx(list: readonly Attachment[]): string {
  return list.map((a) => renderFigure({ src: `/assets/${a.path}`, alt: a.alt.trim(), caption: a.caption.trim(), width: a.width || null, height: a.height || null, max: sizeMax(a.size, a.width), variant: '' })).join('\n\n');
}

/** Mueve un elemento de la lista (copia). */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  if (from < 0 || from >= out.length) return out;
  const [x] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, x!);
  return out;
}

/** «captura-login.png» → «Captura login» (sugerencia de pie; la persona la edita). */
export function captionFromName(name: string): string {
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/^\d{1,3}[-_ ]+/, '').replace(/[-_]+/g, ' ').trim();
  return base ? base[0]!.toUpperCase() + base.slice(1) : '';
}

/** Figuras que hay en un texto MDX (para las miniaturas de una tarjeta de propuesta). */
export function figuresIn(text: string): { path: string; alt: string; caption: string }[] {
  const out: { path: string; alt: string; caption: string }[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(/<Figure\b([^>]*?)\/>/g)) {
    const attrs = m[1] ?? '';
    const src = /\bsrc="\/assets\/([^"]+)"/.exec(attrs)?.[1];
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push({ path: src, alt: /\balt="([^"]*)"/.exec(attrs)?.[1] ?? '', caption: /\bcaption="([^"]*)"/.exec(attrs)?.[1] ?? '' });
  }
  return out.slice(0, MAX_IMAGES);
}
