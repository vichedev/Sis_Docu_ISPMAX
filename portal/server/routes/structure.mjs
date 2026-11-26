// Estructura: árbol anidado por sección/grupo (subsecciones vía parent_id), reordenación en transacción,
// grupos (crear/renombrar) y menú de /guia (docs/sidebar.json en site_files) con la misma API.
import { httpError, SECCIONES, SECCION_KEYS, parseId } from './util.mjs';
import { TOP_MENU } from './topnav.mjs';
import { dangerousUrl } from './mdxSafety.mjs';

const SIDEBAR_PATH = 'docs/sidebar.json';
const GROUPS_KEY = 'structure_groups'; // settings: { [seccion]: [nombres de grupos vacíos] }
const MAX_DEPTH = 3;
const MAX_NODES = 3000;
const OTRAS = 'Otras pantallas'; // grupo por defecto de las páginas de /guia que no están en el sidebar (como build-nav)

// Mismo criterio que scripts/build-nav.mjs (orden de ítems, grupo efectivo y orden de grupos).
// La fila trae `eff_orden` (999 si la página no tiene `orden`), como `Number(fm.orden ?? 999)`.
const byOrden = (a, b) => a.eff_orden - b.eff_orden || String(a.title).localeCompare(String(b.title), 'es') || a.id - b.id;
const cap = (s) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
/** Grupo del menú: el `grupo` de la página o, si no tiene, la subcarpeta (capitalizada) o «General». */
export function effectiveGroup(p, seccion) {
  if (p.grupo) return p.grupo;
  const sub = p.route.slice(`/${seccion}/`.length).split('/');
  return sub.length > 1 ? cap(sub[0]) : 'General';
}
const cmpGroups = (a, b) => (a === 'General' ? -1 : b === 'General' ? 1 : a.localeCompare(b, 'es'));

export function registerStructureRoutes(app, ctx) {
  const { db, tx, requireRole, audit } = ctx;
  const viewer = { preHandler: requireRole('viewer') };
  const editor = { preHandler: requireRole('editor') };

  // ---------- utilidades
  // Adenda 3: solo los cambios que afectan a páginas publicadas (o al menú visible) actualizan el sitio.
  const dirty = (reason) => {
    try {
      ctx.site?.markDirty?.(reason);
    } catch {}
  };
  async function publishedRoutes(q = db) {
    const r = await q.query("SELECT route FROM pages WHERE status = 'published' AND deleted_at IS NULL");
    return new Set(r.rows.map((x) => x.route));
  }
  /** Lo que se ve del sidebar de /guia: cabeceras e ítems que apuntan a páginas publicadas (texto, enlace, anidación). */
  function visibleSidebar(data, pub) {
    const items = (list) =>
      (Array.isArray(list) ? list : []).flatMap((it) => (it && pub.has(it.link) ? [{ text: it.text, link: it.link, collapsed: it.collapsed, items: items(it.items) }] : []));
    return JSON.stringify((Array.isArray(data) ? data : []).map((g) => ({ h: g?.sectionHeader, items: items(g?.items) })));
  }
  async function sidebarVisiblyChanged(q, beforeContent, afterContent) {
    if (beforeContent === afterContent) return false;
    const pub = await publishedRoutes(q);
    return visibleSidebar(parseSidebar(beforeContent), pub) !== visibleSidebar(parseSidebar(afterContent), pub);
  }

  const node = (p, extra = {}) => ({ id: p.id, title: p.title, route: p.route, orden: p.orden, status: p.status, ...(p.menu ? { menu: p.menu } : {}), ...extra, children: [] });

  async function readSidebarRow(q = db) {
    const r = await q.query('SELECT content FROM site_files WHERE path = $1', [SIDEBAR_PATH]);
    return r.rows[0]?.content ?? null;
  }
  function parseSidebar(content) {
    if (content == null) return [];
    try {
      const d = JSON.parse(content);
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  }
  const dumpSidebar = (data, like) => JSON.stringify(data, null, 2) + (like == null || /\n$/.test(like) ? '\n' : '');
  async function writeSidebar(q, data, like) {
    const content = dumpSidebar(data, like);
    await q.query(
      'INSERT INTO site_files (path, content) VALUES ($1,$2) ON CONFLICT (path) DO UPDATE SET content = EXCLUDED.content, updated_at = now()',
      [SIDEBAR_PATH, content]
    );
    return content;
  }
  async function emptyGroups(q = db) {
    const r = await q.query('SELECT value FROM settings WHERE key = $1', [GROUPS_KEY]);
    const v = r.rows[0]?.value;
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  }
  async function saveEmptyGroups(q, value, userId) {
    await q.query(
      `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1,$2,$3,now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [GROUPS_KEY, JSON.stringify(value), userId]
    );
  }

  // Árbol de una sección distinta de /guia: [{name, pages:[nodo]}] en el orden de build-nav (General primero, resto alfabético).
  function treeOf(rows, seccion, empties = []) {
    const nodes = new Map(rows.map((p) => [p.id, node(p)]));
    const groups = new Map();
    const sorted = [...rows].sort(byOrden);
    for (const p of sorted) {
      const n = nodes.get(p.id);
      const parent = p.parent_id != null ? nodes.get(p.parent_id) : null;
      if (parent) parent.children.push(n);
      else {
        const g = effectiveGroup(p, seccion);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(n);
      }
    }
    for (const g of empties) if (!groups.has(g)) groups.set(g, []);
    return [...groups.entries()].sort(([a], [b]) => cmpGroups(a, b)).map(([name, pages]) => ({ name, pages }));
  }

  // Árbol de /guia: el sidebar manda; las páginas que no están en él van por parent_id o por su grupo (como build-nav).
  function guiaTree(rows, sidebar) {
    const byRoute = new Map(rows.map((p) => [p.route, p]));
    const nodes = new Map();
    const used = new Set();
    const fromItems = (items, depth) =>
      (Array.isArray(items) ? items : []).flatMap((it, i) => {
        const p = it && byRoute.get(it.link);
        if (!p || used.has(p.id)) return [];
        used.add(p.id);
        const n = node({ ...p, orden: i + 1 }, { menu: typeof it.text === 'string' ? it.text : p.title });
        nodes.set(p.id, n);
        n.children = depth < MAX_DEPTH ? fromItems(it.items, depth + 1) : [];
        return [n];
      });
    const groups = sidebar.filter((g) => g && typeof g.sectionHeader === 'string').map((g) => ({ name: g.sectionHeader, pages: fromItems(g.items, 1) }));
    // Páginas fuera del sidebar: cuelgan de su padre (parent_id) si está en el árbol; si no, van a su grupo.
    // build-nav: primero las sueltas en el orden de los archivos, luego las que tienen padre, por `orden`.
    const pending = rows.filter((p) => !used.has(p.id)).sort((a, b) => (a.file_path < b.file_path ? -1 : a.file_path > b.file_path ? 1 : 0));
    for (const p of pending) nodes.set(p.id, node(p));
    const extraIds = new Set(pending.map((p) => p.id));
    const attach = (p) => {
      const g = p.grupo || OTRAS;
      let grp = groups.find((x) => x.name === g);
      if (!grp) groups.push((grp = { name: g, pages: [] }));
      grp.pages.push(nodes.get(p.id));
    };
    const reach = new Set();
    const mark = (n) => (reach.add(n.id), n.children.forEach(mark));
    const hasParent = (p) => p.parent_id != null && p.parent_id !== p.id && (used.has(p.parent_id) || extraIds.has(p.parent_id));
    for (const p of pending) if (!hasParent(p)) attach(p);
    for (const p of pending.filter(hasParent).sort(byOrden)) nodes.get(p.parent_id).children.push(nodes.get(p.id));
    groups.forEach((g) => g.pages.forEach(mark));
    for (const p of pending) if (!reach.has(p.id)) attach(p); // ciclo imposible por validación; por si acaso no se pierde nada
    return groups;
  }

  // ---------- GET
  app.get('/api/structure', viewer, async () => {
    const r = await db.query(
      `SELECT id, title, route, file_path, seccion, grupo, orden, status, parent_id, frontmatter->>'menu' AS menu,
              CASE WHEN orden <> 0 OR frontmatter ? 'orden' THEN orden ELSE 999 END AS eff_orden
         FROM pages WHERE deleted_at IS NULL AND seccion = ANY($1) ORDER BY seccion, id`,
      [SECCION_KEYS]
    );
    const empties = await emptyGroups();
    const sidebar = parseSidebar(await readSidebarRow());
    const byRoute = new Map(r.rows.map((x) => [x.route, x]));
    const pageRef = (p) => (p ? { id: p.id, title: p.title, route: p.route, status: p.status } : null);
    const secciones = SECCIONES.map((s) => {
      // La portada de la sección (/tareas, /problemas…) no es del menú: sale aparte.
      const rows = r.rows.filter((x) => x.seccion === s.key && x.route !== `/${s.key}`);
      const grupos = s.key === 'guia' ? guiaTree(rows, sidebar).map((g) => ({ name: g.name, pages: g.pages })) : treeOf(rows, s.key, empties[s.key] ?? []);
      return { key: s.key, label: s.label, sectionIndex: pageRef(byRoute.get(`/${s.key}`)), grupos };
    });
    // Menú superior del manual (rspress.config.ts) con sus ítems resueltos a páginas.
    const menu = TOP_MENU.map((m) => ({
      key: m.key, text: m.text, kind: m.kind, seccion: m.seccion ?? null, extraSecciones: m.extraSecciones ?? [], href: m.href ?? null, help: m.help ?? null,
      items: (m.items ?? []).map((it) => ({ text: it.text, link: it.link, page: pageRef(byRoute.get(it.link.replace(/\/+$/, '') || '/')) })),
    }));
    return { secciones, menu };
  });

  // ---------- PUT order
  // Aplana grupos → [{id, group, parentId, orden, depth}] validando forma, profundidad (≤3) y duplicados.
  function flatten(grupos) {
    if (!Array.isArray(grupos) || grupos.length > 500) throw httpError(400, 'Faltan los grupos.');
    const names = new Set();
    const flat = [];
    const seen = new Set();
    const groupNames = [];
    for (const g of grupos) {
      if (!g || typeof g.name !== 'string' || g.name.length > 120) throw httpError(400, 'Grupo no válido.');
      if (names.has(g.name)) throw httpError(400, `El grupo «${g.name}» está repetido.`);
      names.add(g.name);
      groupNames.push(g.name);
      let nodes;
      if (Array.isArray(g.nodes)) nodes = g.nodes;
      else if (Array.isArray(g.pageIds)) nodes = g.pageIds.map((id) => ({ id }));
      else throw httpError(400, 'Grupo no válido: faltan `nodes` (o `pageIds`).');
      const walk = (list, parentId, depth) => {
        if (depth > MAX_DEPTH) throw httpError(400, `Se permiten como máximo ${MAX_DEPTH} niveles de subsecciones.`);
        if (!Array.isArray(list)) throw httpError(400, '`children` debe ser una lista.');
        list.forEach((n, i) => {
          const raw = n !== null && typeof n === 'object' ? n.id : n;
          const id = parseId(raw, 'id');
          if (seen.has(id)) throw httpError(400, `La página ${id} aparece más de una vez (o forma un ciclo).`);
          seen.add(id);
          if (seen.size > MAX_NODES) throw httpError(400, 'Demasiadas páginas.');
          flat.push({ id, group: g.name, parentId, orden: i + 1, depth });
          if (n && typeof n === 'object' && n.children != null) walk(n.children, id, depth + 1);
        });
      };
      walk(nodes, null, 1);
    }
    return { flat, groupNames };
  }

  // Comprueba en la BD (tras aplicar) que la sección no tenga ciclos ni más de 3 niveles ni padres de otra sección.
  async function checkSectionTree(c, seccion) {
    const r = await c.query('SELECT id, parent_id, seccion FROM pages WHERE deleted_at IS NULL AND seccion = $1', [seccion]);
    const parent = new Map(r.rows.map((x) => [x.id, x.parent_id]));
    for (const id of parent.keys()) {
      let d = 1;
      for (let cur = parent.get(id); cur != null && parent.has(cur); cur = parent.get(cur), d++) {
        if (cur === id) throw httpError(400, 'Las subsecciones forman un ciclo.');
        if (d >= MAX_DEPTH) throw httpError(400, `Se permiten como máximo ${MAX_DEPTH} niveles de subsecciones.`);
      }
    }
  }

  app.put('/api/structure/order', editor, async (request) => {
    const { seccion, grupos } = request.body || {};
    if (!SECCION_KEYS.includes(seccion)) throw httpError(400, 'Sección no válida.');
    const { flat, groupNames } = flatten(grupos);
    const ids = flat.map((f) => f.id);
    const result = await tx(async (c) => {
      const r = await c.query(
        'SELECT id, route, title, frontmatter, grupo, orden, parent_id, status FROM pages WHERE id = ANY($1) AND seccion = $2 AND deleted_at IS NULL FOR UPDATE',
        [ids, seccion]
      );
      if (r.rowCount !== ids.length) throw httpError(400, 'Alguna página no existe, está eliminada o no pertenece a esa sección.');
      const prev = new Map(r.rows.map((x) => [x.id, x]));
      let n = 0;
      let visible = false;
      if (seccion === 'guia') {
        // El menú de /guia lo manda docs/sidebar.json; en la BD solo cambia el padre.
        const like = await readSidebarRow(c);
        const old = parseSidebar(like);
        const oldItems = new Map();
        const collect = (items) => (items || []).forEach((it) => it && (oldItems.set(it.link, it), collect(it.items)));
        old.forEach((g) => collect(g.items));
        const byGroupId = new Map();
        const kids = new Map();
        for (const f of flat) {
          if (f.parentId == null) {
            if (!byGroupId.has(f.group)) byGroupId.set(f.group, []);
            byGroupId.get(f.group).push(f);
          } else {
            if (!kids.has(f.parentId)) kids.set(f.parentId, []);
            kids.get(f.parentId).push(f);
          }
        }
        const itemOf = (f) => {
          const p = prev.get(f.id);
          const o = oldItems.get(p.route);
          const { items: _i, ...rest } = o || {};
          const it = { ...rest, text: o?.text ?? p.frontmatter?.menu ?? p.title, link: p.route };
          const ch = kids.get(f.id);
          if (ch) {
            it.items = ch.map(itemOf);
            if (!('collapsed' in it)) it.collapsed = true;
          }
          return it;
        };
        const data = groupNames.map((name) => {
          const oldG = old.find((g) => g.sectionHeader === name) || {};
          const { items: _x, ...rest } = oldG;
          return { ...rest, sectionHeader: name, items: (byGroupId.get(name) || []).map(itemOf) };
        });
        for (const f of flat) {
          if ((prev.get(f.id).parent_id ?? null) === f.parentId) continue;
          await c.query('UPDATE pages SET parent_id = $2, version = version + 1, updated_at = now(), updated_by = $3 WHERE id = $1', [f.id, f.parentId, request.user.id]);
          if (prev.get(f.id).status === 'published') visible = true;
          n++;
        }
        const written = await writeSidebar(c, data, like);
        if (await sidebarVisiblyChanged(c, like, written)) visible = true;
      } else {
        const groupOf = new Map(flat.map((f) => [f.id, f.group])); // los hijos toman el grupo del grupo en que cuelgan
        for (const f of flat) {
          const o = prev.get(f.id);
          const sameParent = (o.parent_id ?? null) === f.parentId;
          const oldGroup = effectiveGroup(o, seccion);
          if (oldGroup === f.group && o.orden === f.orden && sameParent) continue;
          const moved = oldGroup !== f.group || o.orden !== f.orden;
          // fm_raw se anula solo si cambian grupo/orden; el padre se escribe al exportar sin invalidarlo.
          await c.query(
            `UPDATE pages SET grupo = $2, orden = $3, parent_id = $5,
               frontmatter = jsonb_set(jsonb_set(frontmatter, '{grupo}', to_jsonb($2::text)), '{orden}', to_jsonb($3::int)),
               fm_raw = CASE WHEN $6 THEN NULL ELSE fm_raw END, version = version + 1, updated_at = now(), updated_by = $4 WHERE id = $1`,
            [f.id, groupOf.get(f.id), f.orden, request.user.id, f.parentId, moved]
          );
          if (o.status === 'published') visible = true;
          n++;
        }
        // grupos vacíos que se quieren conservar
        const used = new Set(flat.map((f) => f.group));
        const empties = await emptyGroups(c);
        const keep = groupNames.filter((g) => !used.has(g) && g !== '');
        if (JSON.stringify(empties[seccion] ?? []) !== JSON.stringify(keep)) {
          await saveEmptyGroups(c, { ...empties, [seccion]: keep }, request.user.id);
        }
      }
      await checkSectionTree(c, seccion);
      return { n, visible };
    });
    await audit(request.user.id, 'structure.reorder', seccion, { pages: result.n });
    if (result.visible) dirty(`estructura reordenada: ${seccion}`);
    return { ok: true, changed: result.n };
  });

  // ---------- grupos
  /** Ids de las páginas (no portadas) de la sección cuyo grupo efectivo es `name`. */
  async function idsInGroup(c, seccion, name) {
    const pr = await c.query('SELECT id, route, grupo FROM pages WHERE seccion = $1 AND deleted_at IS NULL AND route <> $2', [seccion, `/${seccion}`]);
    return pr.rows.filter((p) => effectiveGroup(p, seccion) === name).map((p) => p.id);
  }
  function groupName(v, campo = 'name') {
    if (typeof v !== 'string' || !v.trim() || v.trim().length > 120) throw httpError(400, `El campo ${campo} debe ser un nombre de 1 a 120 caracteres.`);
    return v.trim();
  }

  app.post('/api/structure/groups', editor, async (request, reply) => {
    const b = request.body || {};
    if (!SECCION_KEYS.includes(b.seccion)) throw httpError(400, 'Sección no válida.');
    const name = groupName(b.name);
    const visible = await tx(async (c) => {
      if (b.seccion === 'guia') {
        const like = await readSidebarRow(c);
        const data = parseSidebar(like);
        if (data.some((g) => g.sectionHeader === name)) throw httpError(409, `El grupo «${name}» ya existe.`);
        data.push({ sectionHeader: name, items: [] });
        return sidebarVisiblyChanged(c, like, await writeSidebar(c, data, like));
      } else {
        const dup = await idsInGroup(c, b.seccion, name);
        const empties = await emptyGroups(c);
        const list = empties[b.seccion] ?? [];
        if (dup.length || list.includes(name)) throw httpError(409, `El grupo «${name}» ya existe.`);
        await saveEmptyGroups(c, { ...empties, [b.seccion]: [...list, name] }, request.user.id);
        return false; // un grupo vacío no aparece en el menú del manual
      }
    });
    await audit(request.user.id, 'structure.group_create', b.seccion, { name });
    if (visible) dirty(`grupo creado: ${b.seccion} / ${name}`);
    reply.code(201);
    return { ok: true, seccion: b.seccion, name };
  });

  app.put('/api/structure/groups', editor, async (request) => {
    const b = request.body || {};
    if (!SECCION_KEYS.includes(b.seccion)) throw httpError(400, 'Sección no válida.');
    const from = groupName(b.from, 'from');
    const to = groupName(b.to, 'to');
    if (from === to) throw httpError(400, 'El nombre nuevo es igual al actual.');
    const changed = await tx(async (c) => {
      const exists = { rowCount: (await idsInGroup(c, b.seccion, to)).length };
      const fromIds = await idsInGroup(c, b.seccion, from);
      const empties = await emptyGroups(c);
      const list = empties[b.seccion] ?? [];
      let found = list.includes(from);
      let like = null;
      let data = null;
      if (b.seccion === 'guia') {
        like = await readSidebarRow(c);
        data = parseSidebar(like);
        if (data.some((g) => g.sectionHeader === to)) throw httpError(409, `El grupo «${to}» ya existe.`);
        const g = data.find((x) => x.sectionHeader === from);
        if (g) {
          g.sectionHeader = to;
          found = true;
        }
      } else if (exists.rowCount || list.includes(to)) throw httpError(409, `El grupo «${to}» ya existe.`);
      if (b.seccion === 'guia' && exists.rowCount) throw httpError(409, `El grupo «${to}» ya existe.`);
      const u = await c.query(
        `UPDATE pages SET grupo = $3, frontmatter = jsonb_set(frontmatter, '{grupo}', to_jsonb($3::text)), fm_raw = NULL,
           version = version + 1, updated_at = now(), updated_by = $4
         WHERE seccion = $1 AND id = ANY($2) AND deleted_at IS NULL RETURNING status`,
        [b.seccion, fromIds, to, request.user.id]
      );
      if (u.rowCount) found = true;
      if (!found) throw httpError(404, `No existe el grupo «${from}».`);
      let visible = u.rows.some((x) => x.status === 'published');
      if (data && (await sidebarVisiblyChanged(c, like, await writeSidebar(c, data, like)))) visible = true;
      if (list.includes(from)) await saveEmptyGroups(c, { ...empties, [b.seccion]: list.map((x) => (x === from ? to : x)) }, request.user.id);
      return { n: u.rowCount, visible };
    });
    await audit(request.user.id, 'structure.group_rename', b.seccion, { from, to, pages: changed.n });
    if (changed.visible) dirty(`grupo renombrado: ${b.seccion} / ${from} → ${to}`);
    return { ok: true, seccion: b.seccion, from, to, changed: changed.n };
  });

  // Elimina un grupo vacío (sin páginas). En /guia lo quita de docs/sidebar.json; en el resto, de los grupos creados desde el panel.
  app.delete('/api/structure/groups', editor, async (request) => {
    const b = request.body || {};
    if (!SECCION_KEYS.includes(b.seccion)) throw httpError(400, 'Sección no válida.');
    const name = groupName(b.name);
    const visible = await tx(async (c) => {
      if (b.seccion === 'guia') {
        const like = await readSidebarRow(c);
        const data = parseSidebar(like);
        const g = data.find((x) => x.sectionHeader === name);
        if (!g) throw httpError(404, `No existe el grupo «${name}».`);
        if ((g.items ?? []).length) throw httpError(409, `El grupo «${name}» tiene páginas: muévalas antes de eliminarlo.`);
        return sidebarVisiblyChanged(c, like, await writeSidebar(c, data.filter((x) => x !== g), like));
      } else {
        const empties = await emptyGroups(c);
        const list = empties[b.seccion] ?? [];
        // Páginas con ese grupo efectivo (incluye las que lo toman de su carpeta)
        if ((await idsInGroup(c, b.seccion, name)).length) throw httpError(409, `El grupo «${name}» tiene páginas: muévalas antes de eliminarlo.`);
        if (!list.includes(name)) throw httpError(404, `No existe el grupo «${name}».`);
        await saveEmptyGroups(c, { ...empties, [b.seccion]: list.filter((x) => x !== name) }, request.user.id);
        return false;
      }
    });
    await audit(request.user.id, 'structure.group_delete', b.seccion, { name });
    if (visible) dirty(`grupo eliminado: ${b.seccion} / ${name}`);
    return { ok: true, seccion: b.seccion, name };
  });

  // ---------- sidebar de /guia (texto completo; se conserva)
  app.get('/api/structure/guia-sidebar', viewer, async () => {
    const content = await readSidebarRow();
    if (content == null) throw httpError(404, 'Aún no se ha importado docs/sidebar.json.');
    let data = null;
    try {
      data = JSON.parse(content);
    } catch {}
    return { path: SIDEBAR_PATH, content, data };
  });

  app.put('/api/structure/guia-sidebar', editor, async (request) => {
    const b = request.body || {};
    let data;
    if (b.data !== undefined) data = b.data;
    else if (typeof b.content === 'string') {
      try {
        data = JSON.parse(b.content);
      } catch {
        throw httpError(400, 'El contenido no es JSON válido.');
      }
    } else throw httpError(400, 'Envía `data` (objeto) o `content` (texto JSON).');
    if (!Array.isArray(data)) throw httpError(400, 'El sidebar debe ser una lista de secciones.');
    const check = (items, depth) => {
      if (depth > MAX_DEPTH) throw httpError(400, `El menú admite como máximo ${MAX_DEPTH} niveles.`);
      for (const it of items) {
        if (!it || typeof it !== 'object') throw httpError(400, 'Ítem no válido.');
        // Enlaces del menú: ruta del manual o http(s); nunca javascript:, data:… (el menú comparte origen con el panel).
        if (it.link !== undefined && (typeof it.link !== 'string' || dangerousUrl(it.link))) throw httpError(400, 'Enlace del menú no permitido.');
        if (it.items !== undefined) {
          if (!Array.isArray(it.items)) throw httpError(400, '`items` debe ser una lista.');
          check(it.items, depth + 1);
        }
      }
    };
    for (const s of data) {
      if (!s || typeof s !== 'object' || !Array.isArray(s.items)) throw httpError(400, 'Cada sección necesita `items`.');
      check(s.items, 1);
    }
    const content = JSON.stringify(data, null, 2) + '\n';
    const before = await readSidebarRow();
    await db.query(
      'INSERT INTO site_files (path, content) VALUES ($1,$2) ON CONFLICT (path) DO UPDATE SET content = EXCLUDED.content, updated_at = now()',
      [SIDEBAR_PATH, content]
    );
    await audit(request.user.id, 'structure.sidebar', SIDEBAR_PATH);
    if (await sidebarVisiblyChanged(db, before, content)) dirty('menú de la Guía editado');
    return { path: SIDEBAR_PATH, content, data };
  });
}
