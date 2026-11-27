// Identidad de los grupos del menú. Un grupo es el nombre con el que aparece en el menú de su sección: en la Guía son las
// cabeceras de docs/sidebar.json (que pueden llevar emoji, p. ej. «🚀 INICIO»); en las demás, el campo `grupo` de las
// páginas. Comparar nombres tal cual crea grupos duplicados («INICIO» frente a «🚀 INICIO»): aquí se normalizan.

/** Minúsculas, sin acentos, sin emoji ni signos (solo letras y números) y con espacios colapsados. */
export function normName(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Nombre canónico del grupo existente de la sección que corresponde a `name`, o null si no hay.
 * `sec`: { grupos: [{ name }] } (de /api/structure o del esquema del asistente).
 */
export function resolveGroup(sec, name) {
  const n = normName(name);
  if (!n || !sec) return null;
  const hit = (sec.grupos ?? []).find((g) => normName(g.name) === n);
  return hit ? hit.name : null;
}

/** Igual, pero consultando la estructura real (ctx.loadStructure). null si no hay coincidencia o no se puede consultar. */
export async function canonicalGroupFor(ctx, seccion, name) {
  if (typeof ctx?.loadStructure !== 'function' || !normName(name)) return null;
  try {
    const st = await ctx.loadStructure();
    return resolveGroup(st.secciones.find((s) => s.key === seccion), name);
  } catch {
    return null;
  }
}
