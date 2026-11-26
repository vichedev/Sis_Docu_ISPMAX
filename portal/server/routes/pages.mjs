// Páginas: lista, CRUD con plantillas, versiones, revisiones, mover, borrado lógico y validación.
import {
  httpError, SECCION_KEYS, checkSlug, parseId, intParam, buildRoute, routeToFile, splitRoute, isPlainObject, sameJson, escapeLike,
} from './util.mjs';
import { validatePage } from './validate.mjs';
import { mdxSecurityProblems } from './mdxSafety.mjs';
import { checkParentRow } from './tree.mjs';

/** 400 si el cuerpo o el frontmatter llevan algo ejecutable (ver mdxSafety.mjs). */
function assertSafe(body, frontmatter) {
  const problems = mdxSecurityProblems({ body, frontmatter });
  if (problems.length) {
    throw httpError(400, `El contenido no está permitido: ${problems[0].message}`, { problems: problems.slice(0, 50).map((p) => ({ level: 'error', ...p })) });
  }
}

const TIPOS = {
  tarea: { fm: 'tarea', kicker: 'Quiero hacer…', body: () => '<Lead>Resumen de una frase de lo que se logra.</Lead>\n\n## Antes de empezar\n\n\n## Pasos\n\n<Steps>\n<Step>\n\n\n\n</Step>\n</Steps>\n\n## Qué esperar\n\n' },
  guia: { fm: 'guia', kicker: 'Guía de pantallas', body: () => '<Lead>Para qué sirve esta pantalla.</Lead>\n\n## Dónde está\n\n\n## Qué contiene\n\n\n## Acciones disponibles\n\n' },
  problema: { fm: 'problema', kicker: 'Problemas', body: () => '## Síntomas\n\n\n## Verifique primero\n\n\n## Posibles causas\n\n\n## Solución\n\n' },
  pregunta: { fm: 'faq', kicker: 'Preguntas frecuentes', body: () => '## Pregunta\n\n\n## Respuesta\n\n' },
  referencia: { fm: 'referencia', kicker: 'Referencia', body: () => '<Lead>Qué reúne esta referencia.</Lead>\n\n## Resumen\n\n\n## Detalle\n\n' },
  concepto: { fm: 'concepto', kicker: 'Conceptos', body: () => '<Lead>Idea principal en una frase.</Lead>\n\n## Qué es\n\n\n## Cómo se relaciona con el resto\n\n' },
};

const LIST_COLS = `p.id, p.route, p.title, p.seccion, p.grupo, p.orden, p.parent_id, p.status, p.version, p.updated_at,
  COALESCE(NULLIF(u.display_name, ''), u.username) AS updated_by_name`;
const FULL_COLS = 'id, route, file_path, seccion, title, description, grupo, orden, parent_id, frontmatter, body, status, version, updated_at, deleted_at';

function str(v, campo, max = 500, vacio = true) {
  if (typeof v !== 'string') throw httpError(400, `El campo ${campo} debe ser texto.`);
  if (!vacio && !v.trim()) throw httpError(400, `El campo ${campo} no puede estar vacío.`);
  if (v.length > max) throw httpError(400, `El campo ${campo} es demasiado largo (máx. ${max}).`);
  return v;
}

function snapshot(p) {
  return { route: p.route, title: p.title, frontmatter: p.frontmatter, fm_raw: p.fm_raw ?? null, body: p.body, grupo: p.grupo, orden: p.orden, status: p.status };
}

export function registerPageRoutes(app, ctx) {
  const { db, tx, requireRole, audit } = ctx;
  const viewer = { preHandler: requireRole('viewer') };
  const editor = { preHandler: requireRole('editor') };

  // Adenda 3: solo lo visible (páginas publicadas) actualiza el sitio; un borrador no dispara nada.
  const dirty = (reason) => {
    try {
      ctx.site?.markDirty?.(reason);
    } catch {}
  };

  async function nextOrden(c, seccion, grupo) {
    const r = await c.query('SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM pages WHERE seccion = $1 AND grupo = $2 AND deleted_at IS NULL', [seccion, grupo]);
    return r.rows[0].n;
  }

  async function assetExists(p) {
    return (await db.query('SELECT 1 FROM assets WHERE path = $1', [p])).rowCount > 0;
  }

  async function tourStatus(slug) {
    const r = await db.query('SELECT status FROM tours WHERE slug = $1 AND deleted_at IS NULL', [slug]);
    return r.rows[0]?.status ?? null;
  }

  // ---- lista
  app.get('/api/pages', viewer, async (request) => {
    const { seccion, q, status } = request.query;
    const limit = intParam(request.query.limit, 50, 1, 500);
    const offset = intParam(request.query.offset, 0, 0, 1e9);
    const where = [];
    const params = [];
    const add = (v) => (params.push(v), `$${params.length}`);
    if (status === 'deleted') where.push('p.deleted_at IS NOT NULL');
    else {
      where.push('p.deleted_at IS NULL');
      if (status === 'draft' || status === 'published') where.push(`p.status = ${add(status)}`);
    }
    if (seccion) where.push(`p.seccion = ${add(String(seccion))}`);
    if (q && String(q).trim()) {
      const qq = String(q).trim().slice(0, 200);
      const a = add(qq);
      const b = add('%' + escapeLike(qq) + '%');
      where.push(`(to_tsvector('spanish', p.title || ' ' || p.description || ' ' || p.body) @@ websearch_to_tsquery('spanish', ${a})
        OR p.title ILIKE ${b} OR p.route ILIKE ${b})`);
    }
    const w = 'WHERE ' + where.join(' AND ');
    const total = (await db.query(`SELECT count(*)::int AS n FROM pages p ${w}`, params)).rows[0].n;
    const r = await db.query(
      `SELECT ${LIST_COLS} FROM pages p LEFT JOIN users u ON u.id = p.updated_by ${w}
       ORDER BY p.seccion, p.grupo, p.orden, p.id LIMIT ${add(limit)} OFFSET ${add(offset)}`,
      params
    );
    return { total, items: r.rows };
  });

  // ---- validar
  app.post('/api/pages/validate', viewer, async (request) => {
    const { body, frontmatter } = request.body || {};
    if (typeof body === 'string' && body.length > 2_000_000) throw httpError(413, 'El cuerpo es demasiado grande.');
    return validatePage({ body, frontmatter }, { assetExists, tourStatus });
  });

  app.get('/api/pages/:id', viewer, async (request) => {
    const id = parseId(request.params.id);
    const r = await db.query(`SELECT ${FULL_COLS} FROM pages WHERE id = $1`, [id]);
    if (!r.rows.length) throw httpError(404, 'Página no encontrada.');
    return r.rows[0];
  });

  // ---- crear
  app.post('/api/pages', editor, async (request, reply) => {
    const b = request.body || {};
    if (!SECCION_KEYS.includes(b.seccion)) throw httpError(400, `Sección no válida. Usa: ${SECCION_KEYS.join(', ')}.`);
    checkSlug(b.slug);
    const tipo = TIPOS[b.tipo];
    if (!tipo) throw httpError(400, `Tipo no válido. Usa: ${Object.keys(TIPOS).join(', ')}.`);
    const title = str(b.title, 'title', 200, false).trim();
    const description = b.description === undefined ? '' : str(b.description, 'description', 1000);
    let modulo = null;
    if (b.modulo !== undefined && b.modulo !== null && b.modulo !== '') modulo = checkSlug(b.modulo, 'modulo');
    if (b.seccion === 'tareas' && !modulo) throw httpError(400, 'Las tareas necesitan un módulo (campo modulo).');
    let grupo = b.grupo === undefined || b.grupo === null ? '' : str(b.grupo, 'grupo', 120);
    const parentId = b.parent_id === undefined || b.parent_id === null ? null : parseId(b.parent_id, 'parent_id');
    const route = buildRoute(b.seccion, modulo, b.slug);
    const file_path = routeToFile(route);

    const page = await tx(async (c) => {
      const dup = await c.query('SELECT id, deleted_at FROM pages WHERE route = $1', [route]);
      if (dup.rows.length) {
        throw httpError(409, dup.rows[0].deleted_at ? `La ruta ${route} pertenece a una página eliminada: restáurala o elige otro slug.` : `Ya existe una página en ${route}.`);
      }
      if (parentId != null) grupo = (await checkParentRow(c, { parentId, seccion: b.seccion })).grupo; // la subsección vive en el grupo de su padre
      const orden = await nextOrden(c, b.seccion, grupo);
      const frontmatter = { title, description };
      if (modulo) frontmatter.modulo = modulo;
      frontmatter.tipo = tipo.fm;
      if (grupo) frontmatter.grupo = grupo;
      Object.assign(frontmatter, { orden, funcionalidades: [], rutas: [], roles: [], sinonimos: [], estado: 'borrador' });
      const kick = modulo ? `${tipo.kicker} · ${modulo}` : tipo.kicker;
      const body = `<Kicker>${kick}</Kicker>\n\n# ${title}\n\n${tipo.body()}`;
      const r = await c.query(
        `INSERT INTO pages (route, file_path, seccion, title, description, grupo, orden, frontmatter, body, status, updated_by, parent_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11) RETURNING ${FULL_COLS}`,
        [route, file_path, b.seccion, title, description, grupo, orden, JSON.stringify(frontmatter), body, request.user.id, parentId]
      );
      return r.rows[0];
    });
    await audit(request.user.id, 'page.create', page.route, { id: page.id });
    reply.code(201);
    return page;
  });

  // ---- actualizar
  app.put('/api/pages/:id', editor, async (request) => {
    const id = parseId(request.params.id);
    const b = request.body || {};
    if (!Number.isInteger(b.version)) throw httpError(400, 'Falta `version` (la que se cargó al abrir la página).');
    if (b.title !== undefined) str(b.title, 'title', 200, false);
    if (b.description !== undefined) str(b.description, 'description', 1000);
    if (b.grupo === null) delete b.grupo; // null = "no cambiar" (el editor antiguo lo enviaba en páginas sin grupo)
    if (b.orden === null) delete b.orden;
    if (b.grupo !== undefined) str(b.grupo, 'grupo', 120);
    if (b.orden !== undefined && !(Number.isInteger(b.orden) && b.orden >= 0 && b.orden < 100000)) throw httpError(400, 'El campo orden debe ser un entero.');
    if (b.frontmatter !== undefined && !isPlainObject(b.frontmatter)) throw httpError(400, 'El frontmatter debe ser un objeto.');
    if (b.body !== undefined) str(b.body, 'body', 2_000_000);
    if (b.status !== undefined && !['draft', 'published'].includes(b.status)) throw httpError(400, 'Estado no válido (draft o published).');

    const result = await tx(async (c) => {
      const r = await c.query('SELECT * FROM pages WHERE id = $1 FOR UPDATE', [id]);
      const old = r.rows[0];
      if (!old) throw httpError(404, 'Página no encontrada.');
      if (old.deleted_at) throw httpError(409, 'La página está eliminada; restáurala antes de editarla.');
      if (old.version !== b.version) {
        throw httpError(409, 'La página cambió desde que la abriste. Recarga para ver la versión actual.', { currentVersion: old.version });
      }
      const fm = { ...(b.frontmatter !== undefined ? b.frontmatter : old.frontmatter) };
      if (b.title !== undefined) fm.title = b.title.trim();
      if (b.description !== undefined) fm.description = b.description;
      if (b.grupo !== undefined) fm.grupo = b.grupo;
      if (b.orden !== undefined) fm.orden = b.orden;
      const title = typeof fm.title === 'string' && fm.title.trim() ? fm.title.trim() : old.title;
      if (typeof fm.title !== 'string' || !fm.title.trim()) fm.title = title;
      const description = typeof fm.description === 'string' ? fm.description : old.description;
      const grupo = typeof fm.grupo === 'string' ? fm.grupo : old.grupo;
      const ordenN = Number(fm.orden);
      const orden = Number.isInteger(ordenN) && ordenN >= 0 ? ordenN : old.orden;
      const body = b.body !== undefined ? b.body : old.body;
      const status = b.status ?? old.status;
      const fmChanged = !sameJson(fm, old.frontmatter);
      // Lo publicado no puede llevar código (un borrador sí se guarda: no se ejecuta en ningún sitio hasta publicarlo).
      if (status === 'published' && (b.body !== undefined || b.frontmatter !== undefined || old.status !== 'published')) assertSafe(body, fm);

      await c.query('INSERT INTO page_revisions (page_id, version, snapshot, user_id) VALUES ($1,$2,$3,$4)', [id, old.version, JSON.stringify(snapshot(old)), request.user.id]);
      const u = await c.query(
        `UPDATE pages SET title=$2, description=$3, grupo=$4, orden=$5, frontmatter=$6, fm_raw=$7, body=$8, status=$9,
           version = version + 1, updated_at = now(), updated_by = $10 WHERE id = $1 RETURNING ${FULL_COLS}`,
        [id, title, description, grupo, orden, JSON.stringify(fm), fmChanged ? null : old.fm_raw, body, status, request.user.id]
      );
      return { ...u.rows[0], _wasPublished: old.status === 'published' };
    });
    const { _wasPublished, ...page } = result;
    await audit(request.user.id, 'page.update', page.route, { id, version: page.version });
    if (_wasPublished || page.status === 'published') dirty(`página editada: ${page.route}`);
    return page;
  });

  // ---- mover
  app.post('/api/pages/:id/move', editor, async (request) => {
    const id = parseId(request.params.id);
    const b = request.body || {};
    const result = await tx(async (c) => {
      const r = await c.query('SELECT * FROM pages WHERE id = $1 FOR UPDATE', [id]);
      const old = r.rows[0];
      if (!old) throw httpError(404, 'Página no encontrada.');
      if (old.deleted_at) throw httpError(409, 'La página está eliminada.');
      if (old.seccion === 'raiz') throw httpError(400, 'La portada no se puede mover.');
      const cur = splitRoute(old.route);
      const seccion = b.seccion ?? cur.seccion;
      if (!SECCION_KEYS.includes(seccion)) throw httpError(400, 'Sección no válida.');
      const slug = b.slug !== undefined ? checkSlug(b.slug) : cur.slug;
      let modulo = b.modulo !== undefined ? (b.modulo ? checkSlug(b.modulo, 'modulo') : null) : cur.modulo;
      if (b.modulo === undefined && seccion !== cur.seccion && !['tareas', 'problemas'].includes(seccion)) modulo = null;
      if (seccion === 'tareas' && !modulo) throw httpError(400, 'Las tareas necesitan un módulo.');
      let grupo = b.grupo !== undefined ? str(b.grupo, 'grupo', 120) : old.grupo;
      // subsección: parent_id (null la devuelve al nivel normal); al cambiar de sección sin indicar padre se quita
      let parentId = old.parent_id ?? null;
      if (b.parent_id !== undefined) parentId = b.parent_id === null ? null : parseId(b.parent_id, 'parent_id');
      else if (seccion !== old.seccion) parentId = null;
      if (seccion !== old.seccion && (await c.query('SELECT 1 FROM pages WHERE parent_id = $1 AND deleted_at IS NULL LIMIT 1', [id])).rowCount) {
        throw httpError(409, 'La página tiene subsecciones: muévelas o desvincúlalas antes de cambiarla de sección.');
      }
      if (parentId != null) {
        const parent = await checkParentRow(c, { pageId: id, parentId, seccion });
        grupo = parent.grupo;
      }
      const route = buildRoute(seccion, modulo, slug);
      const file_path = routeToFile(route);
      const parentOnly = route === old.route && grupo === old.grupo;
      if (parentOnly && parentId === (old.parent_id ?? null)) throw httpError(400, 'No hay nada que mover: la ruta, el grupo y el padre son los mismos.');
      if (route !== old.route) {
        const dup = await c.query('SELECT 1 FROM pages WHERE route = $1', [route]);
        if (dup.rowCount) throw httpError(409, `Ya existe una página en ${route}.`);
      }
      const orden = seccion !== old.seccion || grupo !== old.grupo ? await nextOrden(c, seccion, grupo) : old.orden;
      const fm = parentOnly ? { ...old.frontmatter } : { ...old.frontmatter, grupo, orden };
      if (!parentOnly) {
        if (modulo) fm.modulo = modulo;
        else if (seccion !== 'tareas' && seccion !== 'problemas') delete fm.modulo;
      }
      await c.query('INSERT INTO page_revisions (page_id, version, snapshot, user_id) VALUES ($1,$2,$3,$4)', [id, old.version, JSON.stringify(snapshot(old)), request.user.id]);
      const u = await c.query(
        `UPDATE pages SET route=$2, file_path=$3, seccion=$4, grupo=$5, orden=$6, frontmatter=$7, fm_raw = CASE WHEN $9 THEN fm_raw ELSE NULL END,
           parent_id = $10, version = version + 1, updated_at = now(), updated_by = $8 WHERE id = $1 RETURNING ${FULL_COLS}`,
        [id, route, file_path, seccion, grupo, orden, JSON.stringify(fm), request.user.id, parentOnly, parentId]
      );
      if (grupo !== old.grupo) {
        // las subsecciones siguen al grupo de su principal
        await c.query(
          `WITH RECURSIVE d AS (SELECT id FROM pages WHERE parent_id = $1 AND deleted_at IS NULL
             UNION SELECT p.id FROM pages p JOIN d ON p.parent_id = d.id WHERE p.deleted_at IS NULL)
           UPDATE pages SET grupo = $2, frontmatter = jsonb_set(frontmatter, '{grupo}', to_jsonb($2::text)), fm_raw = NULL,
             version = version + 1, updated_at = now(), updated_by = $3 WHERE id IN (SELECT id FROM d)`,
          [id, grupo, request.user.id]
        );
      }
      let redirect = null;
      if (route !== old.route) {
        await c.query('DELETE FROM redirects WHERE from_route = $1', [route]);
        await c.query('UPDATE redirects SET to_route = $2 WHERE to_route = $1', [old.route, route]);
        await c.query('INSERT INTO redirects (from_route, to_route) VALUES ($1,$2) ON CONFLICT (from_route) DO UPDATE SET to_route = EXCLUDED.to_route', [old.route, route]);
        redirect = { from: old.route, to: route };
      }
      // ¿Afecta a lo visible? La página o alguna de sus subsecciones está publicada.
      const vis = old.status === 'published' || (await c.query(
        `WITH RECURSIVE d AS (SELECT id, status FROM pages WHERE parent_id = $1 AND deleted_at IS NULL
           UNION SELECT p.id, p.status FROM pages p JOIN d ON p.parent_id = d.id WHERE p.deleted_at IS NULL)
         SELECT 1 FROM d WHERE status = 'published' LIMIT 1`, [id])).rowCount > 0;
      return { page: u.rows[0], redirect, from: old.route, vis };
    });
    await audit(request.user.id, 'page.move', result.from, { id, to: result.page.route });
    if (result.vis) dirty(`página movida: ${result.from} → ${result.page.route}`);
    return { ...result.page, redirect: result.redirect };
  });

  // ---- borrar / restaurar
  app.delete('/api/pages/:id', editor, async (request) => {
    const id = parseId(request.params.id);
    const r = await db.query(
      "UPDATE pages SET deleted_at = now(), updated_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL AND seccion <> 'raiz' RETURNING route, status",
      [id, request.user.id]
    );
    if (!r.rowCount) throw httpError(404, 'Página no encontrada, ya eliminada o no se puede eliminar.');
    await audit(request.user.id, 'page.delete', r.rows[0].route, { id });
    if (r.rows[0].status === 'published') dirty(`página eliminada: ${r.rows[0].route}`);
    return { ok: true };
  });

  app.post('/api/pages/:id/restore', editor, async (request) => {
    const id = parseId(request.params.id);
    const r = await db.query(
      `UPDATE pages SET deleted_at = NULL, version = version + 1, updated_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NOT NULL RETURNING ${FULL_COLS}`,
      [id, request.user.id]
    );
    if (!r.rowCount) throw httpError(404, 'Página no encontrada o no está eliminada.');
    await audit(request.user.id, 'page.restore', r.rows[0].route, { id });
    if (r.rows[0].status === 'published') dirty(`página restaurada: ${r.rows[0].route}`);
    return r.rows[0];
  });

  // ---- revisiones
  app.get('/api/pages/:id/revisions', viewer, async (request) => {
    const id = parseId(request.params.id);
    const r = await db.query(
      `SELECT r.id, r.version, r.created_at, r.snapshot->>'title' AS title, COALESCE(NULLIF(u.display_name,''), u.username) AS user_name
       FROM page_revisions r LEFT JOIN users u ON u.id = r.user_id WHERE r.page_id = $1 ORDER BY r.id DESC LIMIT 200`,
      [id]
    );
    return { items: r.rows };
  });

  app.get('/api/pages/:id/revisions/:revId', viewer, async (request) => {
    const r = await db.query('SELECT id, version, snapshot, created_at FROM page_revisions WHERE id = $1 AND page_id = $2', [
      parseId(request.params.revId, 'revId'),
      parseId(request.params.id),
    ]);
    if (!r.rowCount) throw httpError(404, 'Revisión no encontrada.');
    return r.rows[0];
  });

  app.post('/api/pages/:id/revisions/:revId/restore', editor, async (request) => {
    const id = parseId(request.params.id);
    const revId = parseId(request.params.revId, 'revId');
    const result = await tx(async (c) => {
      const rv = await c.query('SELECT snapshot FROM page_revisions WHERE id = $1 AND page_id = $2', [revId, id]);
      if (!rv.rowCount) throw httpError(404, 'Revisión no encontrada.');
      const s = rv.rows[0].snapshot;
      const r = await c.query('SELECT * FROM pages WHERE id = $1 FOR UPDATE', [id]);
      const old = r.rows[0];
      if (!old) throw httpError(404, 'Página no encontrada.');
      if (old.deleted_at) throw httpError(409, 'La página está eliminada.');
      await c.query('INSERT INTO page_revisions (page_id, version, snapshot, user_id) VALUES ($1,$2,$3,$4)', [id, old.version, JSON.stringify(snapshot(old)), request.user.id]);
      // La ruta no se restaura (un movimiento posterior debe respetarse); el resto sí.
      const fm = s.frontmatter || {};
      if ((s.status ?? old.status) === 'published') assertSafe(s.body ?? '', fm);
      const u = await c.query(
        `UPDATE pages SET title=$2, description=$3, grupo=$4, orden=$5, frontmatter=$6, fm_raw=$7, body=$8, status=$9,
           version = version + 1, updated_at = now(), updated_by = $10 WHERE id = $1 RETURNING ${FULL_COLS}`,
        [id, s.title ?? old.title, typeof fm.description === 'string' ? fm.description : old.description, s.grupo ?? '', s.orden ?? 0,
          JSON.stringify(fm), sameJson(fm, old.frontmatter) ? old.fm_raw : null, s.body ?? '', s.status ?? old.status, request.user.id]
      );
      return { ...u.rows[0], _wasPublished: old.status === 'published' };
    });
    const { _wasPublished, ...page } = result;
    await audit(request.user.id, 'page.revision_restore', page.route, { id, revId });
    if (_wasPublished || page.status === 'published') dirty(`revisión restaurada: ${page.route}`);
    return page;
  });

  // ---- publicar / despublicar (Adenda 3: publicar = sacar a la luz algo nuevo)
  /** Cambia el estado de una página dentro de la transacción `c`: revisión y versión +1. `page` es null si ya lo tenía. */
  async function setStatus(c, id, status, userId, version) {
    const r = await c.query('SELECT * FROM pages WHERE id = $1 FOR UPDATE', [id]);
    const old = r.rows[0];
    if (!old) throw httpError(404, 'Página no encontrada.');
    if (old.deleted_at) throw httpError(409, 'La página está eliminada; restáurala antes.');
    if (version !== undefined && old.version !== version) {
      throw httpError(409, 'La página cambió desde que la abriste. Recarga para ver la versión actual.', { currentVersion: old.version });
    }
    if (old.status === status) return { page: null, old };
    if (status === 'published') assertSafe(old.body, old.frontmatter); // también con force: el código no se publica nunca
    if (status === 'draft' && old.seccion === 'raiz') throw httpError(400, 'La portada no se puede despublicar.');
    await c.query('INSERT INTO page_revisions (page_id, version, snapshot, user_id) VALUES ($1,$2,$3,$4)', [id, old.version, JSON.stringify(snapshot(old)), userId]);
    const u = await c.query(
      `UPDATE pages SET status = $2, version = version + 1, updated_at = now(), updated_by = $3 WHERE id = $1 RETURNING ${FULL_COLS}`,
      [id, status, userId]
    );
    return { page: u.rows[0], old };
  }
  const versionOf = (b) => {
    if (b?.version === undefined || b?.version === null) return undefined;
    if (!Number.isInteger(b.version)) throw httpError(400, 'El campo version debe ser un entero.');
    return b.version;
  };
  /** Errores que romperían el build de todo el sitio si la página se publicara. */
  async function publishProblems(p) {
    const v = await validatePage({ body: p.body, frontmatter: p.frontmatter }, { assetExists, tourStatus });
    return v.problems.filter((x) => x.level === 'error');
  }

  app.post('/api/pages/publish-drafts', editor, async (request) => {
    const b = request.body || {};
    let ids = null;
    if (b.ids !== undefined && b.ids !== null) {
      if (!Array.isArray(b.ids) || b.ids.length > 2000) throw httpError(400, 'El campo ids debe ser una lista de identificadores.');
      ids = [...new Set(b.ids.map((x) => parseId(x)))];
    }
    const force = b.force === true;
    const r = await db.query(
      `SELECT id, route, title, body, frontmatter FROM pages WHERE status = 'draft' AND deleted_at IS NULL ${ids ? 'AND id = ANY($1)' : ''} ORDER BY route`,
      ids ? [ids] : []
    );
    const published = [];
    const skipped = [];
    if (ids) for (const id of ids) if (!r.rows.some((p) => p.id === id)) skipped.push({ id, reason: 'No existe, está eliminada o ya está publicada.' });
    for (const p of r.rows) {
      const problems = force ? [] : await publishProblems(p);
      if (problems.length) {
        skipped.push({ id: p.id, route: p.route, reason: 'Tiene errores que romperían el sitio.', problems: problems.slice(0, 20) });
        continue;
      }
      const res = await tx((c) => setStatus(c, p.id, 'published', request.user.id));
      if (res.page) published.push({ id: res.page.id, route: res.page.route, title: res.page.title, version: res.page.version });
    }
    if (published.length) {
      await audit(request.user.id, 'page.publish', null, { ids: published.map((p) => p.id), count: published.length });
      dirty(published.length === 1 ? `página publicada: ${published[0].route}` : `${published.length} borradores publicados`);
    }
    return { count: published.length, published, skipped };
  });

  app.post('/api/pages/:id/publish', editor, async (request) => {
    const id = parseId(request.params.id);
    const b = request.body || {};
    const version = versionOf(b);
    if (b.force !== true) {
      const cur = await db.query("SELECT body, frontmatter FROM pages WHERE id = $1 AND deleted_at IS NULL AND status = 'draft'", [id]);
      if (cur.rowCount) {
        const problems = await publishProblems(cur.rows[0]);
        if (problems.length) throw httpError(400, 'La página tiene errores que romperían el sitio; corrígelos antes de publicar.', { problems: problems.slice(0, 50) });
      }
    }
    const res = await tx((c) => setStatus(c, id, 'published', request.user.id, version));
    if (!res.page) throw httpError(409, 'La página ya está publicada.', { currentVersion: res.old.version });
    await audit(request.user.id, 'page.publish', res.page.route, { id, version: res.page.version });
    dirty(`página publicada: ${res.page.route}`);
    return res.page;
  });

  app.post('/api/pages/:id/unpublish', editor, async (request) => {
    const id = parseId(request.params.id);
    const version = versionOf(request.body);
    const res = await tx((c) => setStatus(c, id, 'draft', request.user.id, version));
    if (!res.page) throw httpError(409, 'La página ya es un borrador.', { currentVersion: res.old.version });
    await audit(request.user.id, 'page.unpublish', res.page.route, { id, version: res.page.version });
    dirty(`página despublicada: ${res.page.route}`);
    return res.page;
  });
}
