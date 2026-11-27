// Propuestas del asistente: estructura del manual, ubicación de páginas nuevas y edición por operaciones.
// Nada de aquí escribe en la BD: solo lee y valida. Quien aplica es el panel, con las rutas de páginas de siempre.
import { SECCIONES, SECCION_KEYS, checkSlug, buildRoute } from '../routes/util.mjs';
import { TIPOS } from '../routes/pages.mjs';
import { resolveGroup, normName } from '../routes/groups.mjs';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** Slug válido a partir de un texto (sin tildes ni signos). */
export function slugFrom(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/**
 * Secciones, módulos, grupos y páginas tal como las ve el menú del manual (misma lógica que GET /api/structure: en la Guía
 * los grupos son las cabeceras del sidebar, con su nombre exacto, emoji incluido).
 */
export async function loadOutline(ctx) {
  const st = await ctx.loadStructure();
  return st.secciones.map((s) => {
    const modulos = new Set();
    const flat = (nodes, parent) => nodes.flatMap((n) => {
      const parts = n.route.split('/').filter(Boolean);
      if (parts.length >= 3) modulos.add(parts.slice(1, -1).join('/'));
      return [{ id: n.id, title: n.title, route: n.route, status: n.status, parent_id: parent }, ...flat(n.children ?? [], n.id)];
    });
    return { key: s.key, label: s.label, grupos: s.grupos.map((g) => ({ name: g.name, pages: flat(g.pages, null) })), modulos: [...modulos].sort() };
  });
}

/**
 * Estructura COMPACTA (la que va al prompt): una línea por sección con los nombres exactos de sus grupos y el nº de páginas.
 * Los títulos de las páginas no van aquí (cuestan miles de tokens): se piden por grupo con groupPagesText.
 */
export function outlineCompact(secs, max = 3000) {
  const lines = secs.map((s) => {
    const gs = s.grupos.map((g) => `«${g.name || '(sin grupo)'}» (${g.pages.length})`).join(', ');
    const mod = s.modulos.length ? `; módulos: ${s.modulos.slice(0, 12).join(', ')}` : '';
    return `- ${s.key} (${s.label}): ${gs || '(sin grupos)'}${mod}`;
  });
  return lines.join('\n').slice(0, max).replace(/<<<DOCUMENTO|DOCUMENTO>>>/g, '');
}
export const outlineText = outlineCompact;

/** Páginas de UN grupo (id y título), con tope. `seccion` es opcional (se busca en todas). */
export function groupPagesText(secs, { seccion, grupo, max = 30 } = {}) {
  const n = normName(grupo);
  for (const s of secs) {
    if (seccion && s.key !== seccion) continue;
    const g = s.grupos.find((x) => normName(x.name) === n);
    if (!g) continue;
    const list = g.pages.slice(0, max).map((p) => `[${p.id}] ${p.title.slice(0, 50)}${p.status === 'draft' ? ' (borrador)' : ''}`).join('\n');
    return `${s.key} › «${g.name}» (${g.pages.length} páginas):\n${list}${g.pages.length > max ? `\n… (+${g.pages.length - max})` : ''}`;
  }
  return null;
}

/**
 * Normaliza una propuesta de página nueva contra la BD y arma el cuerpo con la misma plantilla que POST /api/pages
 * (Kicker + título). `d`: { title, slug, description, tipo, ubicacion:{seccion,modulo,grupo,padre_id,motivo}, blocksMdx, avisos, usesTemplate }.
 */
export async function buildCreateProposal(ctx, d) {
  const db = ctx.db;
  const u = d.ubicacion;
  const seccion = SECCION_KEYS.includes(u.seccion) ? u.seccion : 'guia';
  let modulo = u.modulo ? slugFrom(u.modulo) : '';
  if (modulo && !SLUG_RE.test(modulo)) modulo = '';
  let grupo = (u.grupo ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120);
  // Siempre contra los grupos existentes de la sección (sin mayúsculas, acentos, emoji ni espacios de más): nunca un duplicado.
  const sec = (await loadOutline(ctx)).find((x) => x.key === seccion);
  const canon = grupo ? resolveGroup(sec, grupo) : null;
  if (canon !== null) grupo = canon;
  let parentId = null;
  if (u.padre_id) {
    const pr = await db.query('SELECT id FROM pages WHERE id = $1 AND deleted_at IS NULL AND seccion = $2', [u.padre_id, seccion]);
    if (pr.rowCount) parentId = pr.rows[0].id;
  }
  const base = SLUG_RE.test(d.slug) ? d.slug : slugFrom(d.slug || d.title) || 'pagina-nueva';
  let slug = base;
  let route = buildRoute(seccion, modulo || null, slug);
  for (let i = 2; i < 50; i++) {
    if (!(await db.query('SELECT 1 FROM pages WHERE route = $1', [route])).rowCount) break;
    slug = `${base.slice(0, 95)}-${i}`;
    route = buildRoute(seccion, modulo || null, slug);
  }
  checkSlug(slug);
  const tipo = TIPOS[d.tipo];
  const kick = modulo ? `${tipo.kicker} · ${modulo}` : tipo.kicker;
  const body = `<Kicker>${kick}</Kicker>\n\n# ${d.title.replace(/[{}<]/g, (c) => '\\' + c)}\n\n${d.blocksMdx}`;
  return {
    title: d.title, slug, route, description: d.description, tipo: d.tipo, seccion, modulo: modulo || null, grupo, parentId,
    motivo: u.motivo ?? '', needsModulo: seccion === 'tareas' && !modulo, body, avisos: d.avisos,
    usesTemplate: !!d.usesTemplate, newGroup: !!grupo && canon === null,
  };
}

// ---- edición por operaciones sobre el cuerpo MDX
function once(body, needle, what) {
  if (!needle) throw new Error(`${what}: el texto a buscar está vacío.`);
  const i = body.indexOf(needle);
  if (i < 0) throw new Error(`${what}: no se encontró en la página el texto «${needle.slice(0, 60)}».`);
  if (body.indexOf(needle, i + 1) >= 0) throw new Error(`${what}: el texto «${needle.slice(0, 60)}» aparece más de una vez; usa un fragmento más largo y único.`);
  return i;
}

/**
 * Aplica las operaciones al cuerpo. `ops` ya validadas (zod): replace{find,replace} · delete{find} · insert_after{anchor,mdx} · append{mdx}.
 * Lanza Error (mensaje para el modelo) si un fragmento no existe o no es único.
 */
export function applyOps(body, ops) {
  let out = body;
  ops.forEach((op, n) => {
    const what = `Operación ${n + 1}`;
    if (op.op === 'replace') {
      const i = once(out, op.find, what);
      out = out.slice(0, i) + op.replace + out.slice(i + op.find.length);
    } else if (op.op === 'delete') {
      const i = once(out, op.find, what);
      let end = i + op.find.length;
      while (out[end] === '\n') end++;
      out = out.slice(0, i) + out.slice(end);
    } else if (op.op === 'insert_after') {
      const i = once(out, op.anchor, what);
      const at = i + op.anchor.length;
      let end = out.indexOf('\n\n', at);
      if (end < 0) end = out.length;
      out = out.slice(0, end).replace(/\s+$/, '') + '\n\n' + op.mdx.trim() + (end < out.length ? out.slice(end) : '\n');
    } else if (op.op === 'append') {
      out = out.replace(/\s+$/, '') + '\n\n' + op.mdx.trim() + '\n';
    }
  });
  return out;
}

/** Tramo cambiado (con 2 líneas de contexto) para mostrar un diff legible sin enviar la página entera. */
export function changedHunk(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let ea = a.length - 1;
  let eb = b.length - 1;
  while (ea >= s && eb >= s && a[ea] === b[eb]) { ea--; eb--; }
  const from = Math.max(0, s - 2);
  const toA = Math.min(a.length - 1, ea + 2);
  const toB = Math.min(b.length - 1, eb + 2);
  return { fromLine: from + 1, before: a.slice(from, toA + 1).join('\n'), after: b.slice(from, toB + 1).join('\n') };
}
