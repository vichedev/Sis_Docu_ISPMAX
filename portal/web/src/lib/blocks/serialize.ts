/*
 * serializeBlocks(blocks): vuelve a escribir el cuerpo MDX.
 *
 * - Un bloque sin editar se emite con su `raw` exacto; uno editado (`dirty`) se regenera desde sus campos.
 * - Entre dos bloques se conserva el separador original (líneas en blanco incluidas). Si el separador no tiene
 *   línea en blanco, solo se conserva cuando ambos bloques siguen siendo vecinos originales (`convertBlock`
 *   añade la línea en blanco alrededor del bloque convertido); en cualquier otro caso se usa una línea en
 *   blanco, que es lo que separa bloques en el manual.
 * - El texto en blanco del principio del documento (`pre`) se emite al inicio aunque su bloque se haya movido.
 */
import type { Block, Eol, SerializeOptions } from './types.ts';
import { renderBlock } from './render.ts';
import { hasBlankLine, toEol } from './util.ts';

/** Fin de línea del documento: el indicado, el del primer bloque analizado o `\n`. */
export function documentEol(blocks: readonly Block[], opts: SerializeOptions = {}): Eol {
  return opts.eol ?? blocks.find(b => b.eol)?.eol ?? '\n';
}

/** Texto MDX de un bloque (su `raw` si no se editó). */
export function blockText(b: Block, eol: Eol = b.eol ?? '\n'): string {
  return b.dirty ? toEol(renderBlock(b), eol) : b.raw;
}

export function serializeBlocks(blocks: readonly Block[], opts: SerializeOptions = {}): string {
  const eol = documentEol(blocks, opts);
  let out = blocks.find(b => b.pre != null)?.pre ?? '';
  blocks.forEach((b, i) => {
    out += blockText(b, eol);
    const next = blocks[i + 1];
    if (next) {
      const keep = hasBlankLine(b.sep) || b.nextId === next.id;
      out += keep ? b.sep : eol + eol;
    } else {
      out += b.nextId === null ? b.sep : eol;
    }
  });
  return out;
}
