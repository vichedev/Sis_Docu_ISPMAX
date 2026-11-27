// Registro de grupos del menú. Un GRUPO es una entidad propia de su sección: existe desde que se crea (o desde que tiene una
// página) y solo desaparece con la acción explícita «Eliminar grupo». Eliminar o mover su última página NO lo borra.
//
// Dónde vive (decisión): en `settings` bajo la clave `structure_groups` = { [seccion]: [nombre canónico, …] }, y NO en una tabla
// nueva, porque (1) ya viaja en el paquete .ispmax (CONTENT_SETTINGS) y se restaura con el import, (2) el orden de los grupos
// no se guarda aquí: lo da el menú (General primero y el resto alfabético; en la Guía, el de docs/sidebar.json), así que no
// hay nada que migrar para «no perder el orden actual», y (3) no añade esquema que mantener. El nombre es el texto tal cual
// (con su emoji en la Guía); la identidad se compara normalizada (minúsculas, sin acentos/emoji, espacios colapsados).
//
// «Migración»: `deriveGroups` rellena el registro con los grupos de las páginas actuales sin duplicar (comparación
// normalizada). Es idempotente: se ejecuta al arrancar el servidor, antes de cada cambio que puede vaciar un grupo
// (borrar/mover/editar/reordenar páginas) y al terminar una importación de paquete.
import { SECCION_KEYS } from './routes/util.mjs';
import { normName } from './routes/groups.mjs';
import { effectiveGroup, cmpGroups } from '../../scripts/lib/nav-core.mjs';

export const GROUPS_KEY = 'structure_groups';
export const SIDEBAR_PATH = 'docs/sidebar.json';
const NAME_MAX = 120;

/** Lee el registro: { [seccion]: [nombre] } (siempre un objeto válido). */
export async function readGroups(q) {
  const r = await q.query('SELECT value FROM settings WHERE key = $1', [GROUPS_KEY]);
  return sanitizeGroups(r.rows[0]?.value);
}

export async function saveGroups(q, value, userId = null) {
  await q.query(
    `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1,$2,$3,now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [GROUPS_KEY, JSON.stringify(value), userId]
  );
}

/** Deja solo secciones conocidas y nombres de texto (1..120), sin repetidos normalizados. Nunca lanza. */
export function sanitizeGroups(v) {
  const out = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const key of SECCION_KEYS) {
    if (!Array.isArray(v[key])) continue;
    const seen = new Set();
    const list = [];
    for (const raw of v[key]) {
      if (typeof raw !== 'string') continue;
      const name = raw.trim();
      const n = normName(name);
      if (!name || name.length > NAME_MAX || !n || seen.has(n)) continue;
      seen.add(n);
      list.push(name);
    }
    if (list.length) out[key] = list;
  }
  return out;
}

/** Unión de dos registros (el primero manda en el nombre canónico). */
export function mergeGroups(a, b) {
  const out = {};
  for (const key of SECCION_KEYS) {
    const list = [...(a?.[key] ?? [])];
    for (const g of b?.[key] ?? []) if (!list.some((x) => normName(x) === normName(g))) list.push(g);
    if (list.length) out[key] = list;
  }
  return out;
}

function sidebarHeaders(content) {
  try {
    const d = JSON.parse(content ?? '[]');
    return (Array.isArray(d) ? d : []).filter((g) => g && typeof g.sectionHeader === 'string').map((g) => g.sectionHeader);
  } catch {
    return [];
  }
}

/**
 * Registra los grupos que hoy tienen páginas (no eliminadas) para que no desaparezcan al quedarse vacíos. Idempotente.
 * En la Guía, las cabeceras de docs/sidebar.json ya son su propio registro: no se duplican aquí.
 * Devuelve true si cambió el registro.
 */
export async function deriveGroups(q, userId = null) {
  const r = await q.query(
    "SELECT route, grupo, seccion FROM pages WHERE deleted_at IS NULL AND seccion = ANY($1) AND route <> ('/' || seccion)",
    [SECCION_KEYS]
  );
  const kept = await readGroups(q);
  const sb = await q.query('SELECT content FROM site_files WHERE path = $1', [SIDEBAR_PATH]);
  const sidebarNames = new Set(sidebarHeaders(sb.rows[0]?.content).map(normName));
  const next = { ...kept };
  let changed = false;
  for (const key of SECCION_KEYS) {
    const used = new Set();
    for (const p of r.rows.filter((x) => x.seccion === key)) {
      if (key === 'guia') { if (p.grupo) used.add(p.grupo); } else used.add(effectiveGroup(p, key));
    }
    const list = [...(next[key] ?? [])];
    for (const g of [...used].sort(cmpGroups)) {
      const n = normName(g);
      if (!n || list.some((x) => normName(x) === n) || (key === 'guia' && sidebarNames.has(n))) continue;
      list.push(g);
      changed = true;
    }
    if (list.length) next[key] = list;
  }
  if (changed) await saveGroups(q, next, userId);
  return changed;
}
