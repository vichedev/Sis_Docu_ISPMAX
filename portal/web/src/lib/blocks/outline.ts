/* Esquema de encabezados para el panel "En esta página". */
import type { Block, HeadingLevel, OutlineItem } from './types.ts';
import { plainText, toLf } from './util.ts';

/** Ancla de un encabezado, con las mismas reglas que `scripts/docs-check.mjs`. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

export interface OutlineOptions {
  /** Nivel mínimo incluido (por defecto 1). */
  minLevel?: number;
  /** Nivel máximo incluido (por defecto 6; el manual muestra 2-3 en "En esta página"). */
  maxLevel?: number;
}

/** Encabezados `#` de un texto MDX (fuera de vallas de código). */
function headingsIn(code: string): Array<{ level: HeadingLevel; text: string }> {
  const out: Array<{ level: HeadingLevel; text: string }> = [];
  let fence: string | null = null;
  for (const line of toLf(code).split('\n')) {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const h = /^(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/.exec(line);
    if (h) out.push({ level: h[1].length as HeadingLevel, text: h[2] });
  }
  return out;
}

/**
 * Esquema de la página: un elemento por encabezado de nivel superior (bloques `heading` y encabezados
 * escritos dentro de bloques `raw`). Los anclas repetidas reciben `-1`, `-2`… como en el manual.
 */
export function outline(blocks: readonly Block[], opts: OutlineOptions = {}): OutlineItem[] {
  const min = opts.minLevel ?? 1;
  const max = opts.maxLevel ?? 6;
  const seen = new Map<string, number>();
  const out: OutlineItem[] = [];
  blocks.forEach((b, index) => {
    const found = b.type === 'heading' ? [{ level: b.level, text: b.text }] : b.type === 'raw' ? headingsIn(b.code) : [];
    for (const h of found) {
      const base = slugify(h.text);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      if (h.level < min || h.level > max) continue;
      out.push({
        blockId: b.id,
        index,
        level: h.level,
        text: h.text,
        label: plainText(h.text),
        slug: n ? `${base}-${n}` : base,
        inRaw: b.type === 'raw',
      });
    }
  });
  return out;
}
