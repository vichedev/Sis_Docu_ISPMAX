// Subsecciones: validación de `parent_id` (misma sección, sin ciclos, máx. 3 niveles contando la página).
import { httpError } from './util.mjs';

export const MAX_DEPTH = 3;

/**
 * Comprueba que `parentId` puede ser el padre de `pageId` (null = página nueva) en `seccion`.
 * Devuelve la fila del padre ({id, seccion, grupo, route}). Lanza 400 si no existe, es de otra sección,
 * crea un ciclo o la rama resultante superaría MAX_DEPTH niveles.
 */
export async function checkParentRow(c, { pageId = null, parentId, seccion }) {
  const r = await c.query('SELECT id, seccion, grupo, route, parent_id, deleted_at FROM pages WHERE id = $1', [parentId]);
  const parent = r.rows[0];
  if (!parent || parent.deleted_at) throw httpError(400, 'La página padre no existe o está eliminada.');
  if (parent.seccion !== seccion) throw httpError(400, 'La página padre debe estar en la misma sección.');
  if (pageId != null && parent.id === pageId) throw httpError(400, 'Una página no puede ser su propio padre.');
  // cadena de ancestros del padre
  let depth = 1; // niveles del padre (él cuenta 1)
  let cur = parent;
  const seen = new Set([parent.id]);
  while (cur.parent_id != null) {
    if (cur.parent_id === pageId) throw httpError(400, 'Esa página es un ancestro del destino: se formaría un ciclo.');
    if (seen.has(cur.parent_id)) throw httpError(400, 'La estructura actual tiene un ciclo.');
    seen.add(cur.parent_id);
    const n = await c.query('SELECT id, parent_id FROM pages WHERE id = $1', [cur.parent_id]);
    if (!n.rows[0]) break;
    cur = n.rows[0];
    depth++;
  }
  // altura de la rama que cuelga de la página (ella cuenta 1)
  let height = 1;
  if (pageId != null) {
    const h = await c.query(
      `WITH RECURSIVE t AS (
         SELECT id, 1 AS d FROM pages WHERE id = $1
         UNION ALL
         SELECT p.id, t.d + 1 FROM pages p JOIN t ON p.parent_id = t.id WHERE p.deleted_at IS NULL AND t.d < 10
       ) SELECT max(d)::int AS h FROM t`,
      [pageId]
    );
    height = h.rows[0].h ?? 1;
  }
  if (depth + height > MAX_DEPTH) throw httpError(400, `Se permiten como máximo ${MAX_DEPTH} niveles de subsecciones.`);
  return parent;
}
