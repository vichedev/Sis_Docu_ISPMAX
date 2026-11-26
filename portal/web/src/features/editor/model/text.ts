/* Edición de texto Markdown en los campos del lienzo (puro): formato de la selección, menú «/», cursor. */

export interface TextEdit { value: string; start: number; end: number }

/**
 * Envuelve la selección con `left`/`right` (p. ej. `**`). Si ya está envuelta, quita las marcas.
 * Sin selección inserta `placeholder` envuelto y lo deja seleccionado.
 */
export function wrapSelection(value: string, start: number, end: number, left: string, right = left, placeholder = 'texto'): TextEdit {
  const before = value.slice(0, start), sel = value.slice(start, end), after = value.slice(end);
  if (sel && before.endsWith(left) && after.startsWith(right)) {
    const s = start - left.length;
    return { value: before.slice(0, s) + sel + after.slice(right.length), start: s, end: s + sel.length };
  }
  if (sel.length > left.length + right.length && sel.startsWith(left) && sel.endsWith(right)) {
    const inner = sel.slice(left.length, sel.length - right.length);
    return { value: before + inner + after, start, end: start + inner.length };
  }
  // Los espacios de los bordes quedan fuera de las marcas (`** texto**` no es negrita en Markdown).
  const lead = /^\s*/.exec(sel)![0], trail = /\s*$/.exec(sel.slice(lead.length))![0];
  const core = sel.slice(lead.length, sel.length - trail.length) || placeholder;
  const v = before + lead + left + core + right + trail + after;
  const s = start + lead.length + left.length;
  return { value: v, start: s, end: s + core.length };
}

/** Convierte la selección en enlace `[texto](/ruta)` y deja seleccionada la ruta para escribirla. */
export function linkSelection(value: string, start: number, end: number, href = '/ruta'): TextEdit {
  const sel = value.slice(start, end) || 'texto del enlace';
  const text = `[${sel}](${href})`;
  const s = start + sel.length + 3;
  return { value: value.slice(0, start) + text + value.slice(end), start: s, end: s + href.length };
}

/** Texto tras «/» si el campo contiene solo el comando (menú «/» en un párrafo vacío); si no, null. */
export function slashQuery(value: string): string | null {
  const m = /^\/([^\s/]{0,30})$/.exec(value);
  return m ? m[1] : null;
}

/** ¿El cursor está en la primera / última línea visual lógica del texto? (para pasar al bloque vecino con flechas) */
export const caretOnFirstLine = (value: string, pos: number): boolean => !value.slice(0, pos).includes('\n');
export const caretOnLastLine = (value: string, pos: number): boolean => !value.slice(pos).includes('\n');

/** Divide el texto en el cursor (Intro en mitad de un párrafo): [antes, después] sin blancos sobrantes en el corte. */
export function splitAt(value: string, start: number, end = start): [string, string] {
  return [value.slice(0, start).replace(/[ \t]+$/, ''), value.slice(end).replace(/^[ \t]+/, '')];
}
