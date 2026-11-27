// Estructura: árbol anidado por sección/grupo (subsecciones vía parent_id), reordenación en transacción,
// grupos (crear/renombrar) y menú de /guia (docs/sidebar.json en site_files) con la misma API.
import { httpError, SECCIONES, SECCION_KEYS, parseId } from './util.mjs';
import { normName } from './groups.mjs';
import { readGroups, saveGroups, deriveGroups, SIDEBAR_PATH } from '../groupStore.mjs';
import { TOP_MENU } from './topnav.mjs';
import { dangerousUrl } from './mdxSafety.mjs';
import { effectiveGroup, cmpGroups, OTRAS, MAX_DEPTH } from '../../../scripts/lib/nav-core.mjs';

// Un grupo es una entidad propia de su sección (settings.structure_groups = { [seccion]: [nombres] }, ver server/groupStore.mjs): se
// registra en cuanto tiene una página o se crea desde el panel y solo desaparece con «Eliminar grupo» (DELETE /api/structure/groups).
// Eliminar o mover su última página NO lo borra; el manual público oculta los grupos sin páginas publicadas.
const MAX_NODES = 3000;

// Mismo criterio que el menú publicado (scripts/lib/nav-core.mjs, compartido con build-nav y el manual dinámico):
// grupo efectivo, orden de grupos, grupo por defecto de /guia y profundidad máxima.
// La fila trae `eff_orden` (999 si la página no tiene `orden`), como `Number(fm.orden ?? 999)`.
export { effectiveGroup };
const byOrden = (a, b) => a.eff_orden - b.eff_orden || String(a.title).localeCompare(String(b.title), 'es') || a.id - b.id;

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
  const emptyGroups = (q = db) => readGroups(q);
  const saveEmptyGroups = (q, value, userId) => saveGroups(q, value, userId);

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
    for (const g of empties) if (![...groups.keys()].some((x) => normName(x) === normName(g))) groups.set(g, []); // grupo registrado sin páginas
    return [...groups.entries()].sort(([a], [b]) => cmpGroups(a, b)).map(([name, pages]) => ({ name, pages }));
  }

  // Árbol de /guia: el sidebar manda; las páginas que no están en él van por parent_id o por su grupo (como build-nav).
  function guiaTree(rows, sidebar, kept = []) {
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
    for (const g of kept) if (!groups.some((x) => normName(x.name) === normName(g))) groups.push({ name: g, pages: [] }); // grupo registrado que se quedó sin páginas
    return groups;
  }

  /**
   * Registra en structure_groups los grupos que hoy tienen páginas, para que NO desaparezcan al quedarse vacíos (idempotente).
   * Se llama al arrancar (migra lo existente) y antes de cada cambio que puede vaciar un grupo (ctx.registerGroups).
   */
  const registerGroups = (userId = null, q = db) => deriveGroups(q, userId);
  ctx.registerGroups = (userId = null) => registerGroups(userId).catch((e) => console.error('[structure] registerGroups:', e.message));
  void ctx.registerGroups();

  // ---------- GET
  async function loadStructure() {
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
      const grupos = s.key === 'guia' ? guiaTree(rows, sidebar, empties.guia ?? []).map((g) => ({ name: g.name, pages: g.pages })) : treeOf(rows, s.key, empties[s.key] ?? []);
      return { key: s.key, label: s.label, sectionIndex: pageRef(byRoute.get(`/${s.key}`)), grupos };
    });
    // Menú superior del manual (rspress.config.ts) con sus ítems resueltos a páginas.
    const menu = TOP_MENU.map((m) => ({
      key: m.key, text: m.text, kind: m.kind, seccion: m.seccion ?? null, extraSecciones: m.extraSecciones ?? [], href: m.href ?? null, help: m.help ?? null,
      items: (m.items ?? []).map((it) => ({ text: it.text, link: it.link, page: pageRef(byRoute.get(it.link.replace(/\/+$/, '') || '/')) })),
    }));
    return { secciones, menu };
  }
  ctx.loadStructure = loadStructure; // lo usa el asistente de IA (ai/proposals.mjs) para ver el menú como lo ve el panel
  app.get('/api/structure', viewer, async () => loadStructure());

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
    await registerGroups(request.user.id); // lo que hoy tiene páginas queda registrado antes de moverlas
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
        // todos los grupos del árbol se conservan, también los que quedan vacíos (un grupo solo se elimina con «Eliminar grupo»)
        const empties = await emptyGroups(c);
        const keep = groupNames.filter((g) => g !== '');
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
  /** Páginas (no portadas) de la sección cuyo grupo es `name`: grupo efectivo exacto; en la Guía, por nombre normalizado («INICIO» = «🚀 INICIO»). */
  async function pagesInGroup(c, seccion, name) {
    const pr = await c.query('SELECT id, route, grupo, status FROM pages WHERE seccion = $1 AND deleted_at IS NULL AND route <> $2', [seccion, `/${seccion}`]);
    return pr.rows.filter((p) => (seccion === 'guia' ? !!p.grupo && normName(p.grupo) === normName(name) : effectiveGroup(p, seccion) === name));
  }
  const idsInGroup = async (c, seccion, name) => (await pagesInGroup(c, seccion, name)).map((p) => p.id);
  function groupName(v, campo = 'name') {
    if (typeof v !== 'string' || !v.trim() || v.trim().length > 120) throw httpError(400, `El campo ${campo} debe ser un nombre de 1 a 120 caracteres.`);
    return v.trim();
  }
  /** Nombres de grupo que ya existen en la sección: páginas, registro y (Guía) cabeceras del sidebar. `skip`: nombre a ignorar (el que se renombra). */
  async function knownGroups(c, seccion, sidebarData, skip = null) {
    const pr = await c.query('SELECT route, grupo FROM pages WHERE seccion = $1 AND deleted_at IS NULL AND route <> $2', [seccion, `/${seccion}`]);
    const names = new Set((await emptyGroups(c))[seccion] ?? []);
    for (const p of pr.rows) {
      if (seccion === 'guia') { if (p.grupo) names.add(p.grupo); } else names.add(effectiveGroup(p, seccion));
    }
    for (const g of sidebarData ?? []) if (g && typeof g.sectionHeader === 'string') names.add(g.sectionHeader);
    return [...names].filter((n) => !skip || normName(n) !== normName(skip));
  }
  const clash = (names, name) => names.find((n) => normName(n) === normName(name));
  const dupMsg = (hit, name) => (hit === name ? `El grupo «${name}» ya existe.` : `Ya existe el grupo «${hit}»: no se crea uno casi igual.`);

  app.post('/api/structure/groups', editor, async (request, reply) => {
    const b = request.body || {};
    if (!SECCION_KEYS.includes(b.seccion)) throw httpError(400, 'Sección no válida.');
    const name = groupName(b.name);
    const visible = await tx(async (c) => {
      await registerGroups(request.user.id, c);
      let like = null;
      let data = [];
      if (b.seccion === 'guia') {
        like = await readSidebarRow(c);
        data = parseSidebar(like);
      }
      const hit = clash(await knownGroups(c, b.seccion, data), name);
      if (hit) throw httpError(409, dupMsg(hit, name));
      if (b.seccion === 'guia') {
        data.push({ sectionHeader: name, items: [] });
        return sidebarVisiblyChanged(c, like, await writeSidebar(c, data, like));
      }
      const empties = await emptyGroups(c);
      await saveEmptyGroups(c, { ...empties, [b.seccion]: [...(empties[b.seccion] ?? []), name] }, request.user.id);
      return false; // un grupo vacío no aparece en el menú del manual
    });
    await audit(request.user.id, 'structure.group_create', b.seccion, { name });
    if (visible) dirty(`grupo creado: ${b.seccion} / ${name}`);
    reply.code(201);
    return { ok: true, seccion: b.seccion, name };
  });

  // Renombra un grupo (con o sin páginas) en una sola transacción: actualiza las páginas, el registro y, en la Guía, la cabecera del sidebar.
  app.put('/api/structure/groups', editor, async (request) => {
    const b = request.body || {};
    if (!SECCION_KEYS.includes(b.seccion)) throw httpError(400, 'Sección no válida.');
    const from = groupName(b.from, 'from');
    const to = groupName(b.to, 'to');
    if (from === to) throw httpError(400, 'El nombre nuevo es igual al actual.');
    const changed = await tx(async (c) => {
      await registerGroups(request.user.id, c);
      const empties = await emptyGroups(c);
      const list = empties[b.seccion] ?? [];
      const fromIds = await idsInGroup(c, b.seccion, from);
      let found = list.some((x) => normName(x) === normName(from)) || fromIds.length > 0;
      let like = null;
      let data = null;
      if (b.seccion === 'guia') {
        like = await readSidebarRow(c);
        data = parseSidebar(like);
        if (data.some((x) => x.sectionHeader === from)) found = true;
      }
      if (!found) throw httpError(404, `No existe el grupo «${from}».`);
      // «inicio» → «INICIO» (mismo grupo, otra grafía) se permite; chocar con OTRO grupo existente, no.
      const hit = clash(await knownGroups(c, b.seccion, data, from), to);
      if (hit) throw httpError(409, dupMsg(hit, to));
      if (data) for (const g of data) if (g.sectionHeader === from) g.sectionHeader = to;
      const u = await c.query(
        `UPDATE pages SET grupo = $3, frontmatter = jsonb_set(frontmatter, '{grupo}', to_jsonb($3::text)), fm_raw = NULL,
           version = version + 1, updated_at = now(), updated_by = $4
         WHERE seccion = $1 AND id = ANY($2) AND deleted_at IS NULL RETURNING status`,
        [b.seccion, fromIds, to, request.user.id]
      );
      let visible = u.rows.some((x) => x.status === 'published');
      if (data && (await sidebarVisiblyChanged(c, like, await writeSidebar(c, data, like)))) visible = true;
      // registro: el nombre nuevo sustituye al viejo (y queda registrado aunque el grupo no tenga páginas)
      const renamed = list.map((x) => (normName(x) === normName(from) ? to : x)).filter((x, i, a) => a.findIndex((y) => normName(y) === normName(x)) === i);
      if (JSON.stringify(renamed) !== JSON.stringify(list)) await saveEmptyGroups(c, { ...empties, [b.seccion]: renamed }, request.user.id);
      await registerGroups(request.user.id, c);
      return { n: u.rowCount, visible };
    });
    await audit(request.user.id, 'structure.group_rename', b.seccion, { from, to, pages: changed.n });
    if (changed.visible) dirty(`grupo renombrado: ${b.seccion} / ${from} → ${to}`);
    return { ok: true, seccion: b.seccion, from, to, changed: changed.n };
  });

  // Elimina un grupo VACÍO (acción explícita; es la única forma de que un grupo desaparezca). Con páginas se bloquea (409):
  // hay que moverlas o eliminarlas antes. En la Guía quita también la cabecera de docs/sidebar.json.
  app.delete('/api/structure/groups', editor, async (request) => {
    const b = request.body || {};
    if (!SECCION_KEYS.includes(b.seccion)) throw httpError(400, 'Sección no válida.');
    const name = groupName(b.name);
    const visible = await tx(async (c) => {
      const kept = await emptyGroups(c);
      const klist = kept[b.seccion] ?? [];
      const inRegistry = klist.some((x) => normName(x) === normName(name));
      const n = (await pagesInGroup(c, b.seccion, name)).length;
      let like = null;
      let data = null;
      let g = null;
      if (b.seccion === 'guia') {
        like = await readSidebarRow(c);
        data = parseSidebar(like);
        g = data.find((x) => x.sectionHeader === name) ?? null;
        if (!g && !inRegistry && !n) throw httpError(404, `No existe el grupo «${name}».`);
        const alive = new Set((await c.query("SELECT route FROM pages WHERE seccion = 'guia' AND deleted_at IS NULL")).rows.map((x) => x.route));
        const hasLive = (items) => (items ?? []).some((it) => alive.has(it?.link) || hasLive(it?.items)); // enlaces a páginas ya eliminadas no cuentan
        if (n || (g && hasLive(g.items))) throw httpError(409, `El grupo «${name}» tiene páginas: muévalas o elimínelas antes de eliminar el grupo.`);
      } else {
        if (n) throw httpError(409, `El grupo «${name}» tiene ${n} ${n === 1 ? 'página' : 'páginas'}: muévalas o elimínelas antes de eliminar el grupo.`);
        if (!inRegistry) throw httpError(404, `No existe el grupo «${name}».`);
      }
      if (inRegistry) await saveEmptyGroups(c, { ...kept, [b.seccion]: klist.filter((x) => normName(x) !== normName(name)) }, request.user.id);
      return g ? sidebarVisiblyChanged(c, like, await writeSidebar(c, data.filter((x) => x !== g), like)) : false;
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
