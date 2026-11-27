/* Lógica pura de los grupos del menú (sin React): identidad normalizada, renombrado y textos de grupo vacío. */

/** Misma normalización que el servidor (server/routes/groups.mjs): minúsculas, sin acentos/emoji/signos y espacios colapsados. */
export const normGroupName = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Nombre existente que choca con `candidate` (ignorando `self`, el grupo que se renombra), o null. */
export function groupConflict(names: string[], candidate: string, self?: string): string | null {
  const n = normGroupName(candidate);
  if (!n) return null;
  return names.find((x) => x !== self && normGroupName(x) === n) ?? null;
}

export type RenameVerdict = { ok: true; name: string } | { ok: false; reason: 'empty' | 'same' | 'conflict'; existing?: string };

/** ¿Se puede renombrar `from` a `raw`? Misma grafía → nada que hacer; otra grafía del mismo grupo → permitido. */
export function renameVerdict(names: string[], from: string, raw: string | null | undefined): RenameVerdict {
  const name = (raw ?? '').trim();
  if (!name) return { ok: false, reason: 'empty' };
  if (name === from) return { ok: false, reason: 'same' };
  const existing = groupConflict(names, name, from);
  return existing ? { ok: false, reason: 'conflict', existing } : { ok: true, name };
}

export const EMPTY_GROUP_TEXT = 'Sin páginas. No se muestra en el manual hasta que tenga una.';

/** Texto del ítem «Eliminar grupo» del menú de un grupo según cuántas páginas tiene (solo se elimina vacío). */
export const deleteGroupLabel = (pageCount: number): string =>
  pageCount === 0 ? 'Eliminar grupo' : `Eliminar grupo (tiene ${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}: muévalas antes)`;
