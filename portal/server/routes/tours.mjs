// Tours guiados sobre capturas: lista, CRUD con control de versión, borrado lógico y duplicado.
import { httpError, checkSlug, parseId, escapeLike } from './util.mjs';

const MAX_STEPS = 100;
const COLS = 'id, slug, title, description, steps, status, version, updated_at, deleted_at';
const LIST_COLS = `t.id, t.slug, t.title, t.description, t.status, jsonb_array_length(t.steps)::int AS "stepsCount", t.version, t.updated_at,
  COALESCE(NULLIF(u.display_name, ''), u.username) AS updated_by_name`;

const snippetOf = (slug) => `<Tour id="${slug}" />`;
const withSnippet = (row) => ({ ...row, snippet: snippetOf(row.slug) });

function text(v, campo, max, { vacio = true } = {}) {
  if (typeof v !== 'string') throw httpError(400, `El campo ${campo} debe ser texto.`);
  if (!vacio && !v.trim()) throw httpError(400, `El campo ${campo} no puede estar vacío.`);
  if (v.length > max) throw httpError(400, `El campo ${campo} es demasiado largo (máx. ${max}).`);
  return v;
}
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

/**
 * Valida y normaliza los pasos. `publicar`: título y texto obligatorios y al menos un paso.
 * `assetExists(path)` comprueba la imagen en la tabla assets. Devuelve los pasos normalizados.
 */
export async function normalizeSteps(steps, { publicar, assetExists }) {
  if (!Array.isArray(steps)) throw httpError(400, 'Los pasos deben ser una lista.');
  if (steps.length > MAX_STEPS) throw httpError(400, `Un tour admite como máximo ${MAX_STEPS} pasos.`);
  if (publicar && steps.length < 1) throw httpError(400, 'Para publicar un tour hace falta al menos un paso.');
  const out = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const n = `Paso ${i + 1}`;
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw httpError(400, `${n}: formato no válido.`);
    if (typeof s.image !== 'string' || !s.image) throw httpError(400, `${n}: falta la imagen.`);
    if (s.image.startsWith('/') || s.image.includes('\\') || s.image.split('/').some((x) => x === '..' || x === '.' || x === '')) {
      throw httpError(400, `${n}: ruta de imagen no válida.`);
    }
    if (!(await assetExists(s.image))) throw httpError(400, `${n}: la imagen ${s.image} no existe en el portal.`);
    const alt = s.alt == null ? '' : text(s.alt, `${n}: alt`, 300);
    const title = s.title == null ? '' : text(s.title, `${n}: title`, 200);
    const txt = s.text == null ? '' : text(s.text, `${n}: text`, 2000);
    if (publicar && !title.trim()) throw httpError(400, `${n}: el título no puede estar vacío al publicar.`);
    if (publicar && !txt.trim()) throw httpError(400, `${n}: el texto no puede estar vacío al publicar.`);
    let spot = null;
    if (s.spot != null) {
      const p = s.spot;
      if (typeof p !== 'object' || Array.isArray(p) || !['x', 'y', 'w', 'h'].every((k) => isNum(p[k]))) {
        throw httpError(400, `${n}: el recuadro (spot) necesita x, y, w y h numéricos.`);
      }
      if (p.x < 0 || p.y < 0 || p.w <= 0 || p.h <= 0 || p.x > 100 || p.y > 100 || p.w > 100 || p.h > 100 || p.x + p.w > 100.0001 || p.y + p.h > 100.0001) {
        throw httpError(400, `${n}: el recuadro (spot) debe quedar dentro de la imagen (valores de 0 a 100).`);
      }
      spot = { x: p.x, y: p.y, w: p.w, h: p.h };
    }
    let link = null;
    if (s.link != null) {
      const l = s.link;
      if (typeof l !== 'object' || Array.isArray(l)) throw httpError(400, `${n}: el enlace no es válido.`);
      const label = text(l.label, `${n}: enlace.label`, 120, { vacio: false });
      const route = text(l.route, `${n}: enlace.route`, 300, { vacio: false });
      if (!route.startsWith('/') || route.startsWith('//') || /[\s\\]/.test(route) || route.split('/').includes('..')) {
        throw httpError(400, `${n}: la ruta del enlace debe empezar por / y apuntar a una página del manual.`);
      }
      link = { label: label.trim(), route };
    }
    out.push({ image: s.image, alt, title, text: txt, spot, link });
  }
  return out;
}

export function registerTourRoutes(app, ctx) {
  const { db, tx, requireRole, audit } = ctx;
  const viewer = { preHandler: requireRole('viewer') };
  const editor = { preHandler: requireRole('editor') };

  // Adenda 3: solo los tours publicados (o que dejan de estarlo) actualizan el sitio.
  const dirty = (reason) => {
    try {
      ctx.site?.markDirty?.(reason);
    } catch {}
  };
  const dupError = (e) => (e.code === '23505' ? httpError(409, 'Ya existe un tour con ese slug (o pertenece a uno eliminado).') : e);

  app.get('/api/tours', viewer, async (request) => {
    const { q, status } = request.query;
    const where = [];
    const params = [];
    if (status === 'deleted') where.push('t.deleted_at IS NOT NULL');
    else {
      where.push('t.deleted_at IS NULL');
      if (status === 'draft' || status === 'published') {
        params.push(status);
        where.push(`t.status = $${params.length}`);
      }
    }
    if (q && String(q).trim()) {
      params.push('%' + escapeLike(String(q).trim().slice(0, 200)) + '%');
      where.push(`(t.title ILIKE $${params.length} OR t.slug ILIKE $${params.length} OR t.description ILIKE $${params.length})`);
    }
    const r = await db.query(
      `SELECT ${LIST_COLS} FROM tours t LEFT JOIN users u ON u.id = t.updated_by WHERE ${where.join(' AND ')} ORDER BY t.title, t.id`,
      params
    );
    return { items: r.rows.map(withSnippet) };
  });

  app.get('/api/tours/:id', viewer, async (request) => {
    const id = parseId(request.params.id);
    const r = await db.query(`SELECT ${COLS} FROM tours WHERE id = $1`, [id]);
    if (!r.rowCount) throw httpError(404, 'Tour no encontrado.');
    return withSnippet(r.rows[0]);
  });

  app.post('/api/tours', editor, async (request, reply) => {
    const b = request.body || {};
    checkSlug(b.slug);
    const title = text(b.title, 'title', 200, { vacio: false }).trim();
    const description = b.description === undefined || b.description === null ? '' : text(b.description, 'description', 1000);
    let row;
    try {
      const r = await db.query(
        `INSERT INTO tours (slug, title, description, steps, status, updated_by) VALUES ($1,$2,$3,'[]','draft',$4) RETURNING ${COLS}`,
        [b.slug, title, description, request.user.id]
      );
      row = r.rows[0];
    } catch (e) {
      throw dupError(e);
    }
    await audit(request.user.id, 'tour.create', row.slug, { id: row.id });
    reply.code(201);
    return withSnippet(row);
  });

  app.put('/api/tours/:id', editor, async (request) => {
    const id = parseId(request.params.id);
    const b = request.body || {};
    if (!Number.isInteger(b.version)) throw httpError(400, 'Falta `version` (la que se cargó al abrir el tour).');
    if (b.title !== undefined) text(b.title, 'title', 200, { vacio: false });
    if (b.description !== undefined) text(b.description, 'description', 1000);
    if (b.status !== undefined && !['draft', 'published'].includes(b.status)) throw httpError(400, 'Estado no válido (draft o published).');
    if (b.steps !== undefined && !Array.isArray(b.steps)) throw httpError(400, 'Los pasos deben ser una lista.');

    const result = await tx(async (c) => {
      const r = await c.query('SELECT * FROM tours WHERE id = $1 FOR UPDATE', [id]);
      const old = r.rows[0];
      if (!old) throw httpError(404, 'Tour no encontrado.');
      if (old.deleted_at) throw httpError(409, 'El tour está eliminado; restáuralo antes de editarlo.');
      if (old.version !== b.version) {
        throw httpError(409, 'El tour cambió desde que lo abriste. Recarga para ver la versión actual.', { currentVersion: old.version });
      }
      const status = b.status ?? old.status;
      const exists = async (p) => (await c.query('SELECT 1 FROM assets WHERE path = $1', [p])).rowCount > 0;
      const steps = await normalizeSteps(b.steps !== undefined ? b.steps : old.steps, { publicar: status === 'published', assetExists: exists });
      const u = await c.query(
        `UPDATE tours SET title=$2, description=$3, steps=$4, status=$5, version = version + 1, updated_at = now(), updated_by = $6
         WHERE id = $1 RETURNING ${COLS}`,
        [id, b.title !== undefined ? b.title.trim() : old.title, b.description ?? old.description, JSON.stringify(steps), status, request.user.id]
      );
      return { ...u.rows[0], _wasPublished: old.status === 'published' };
    });
    const { _wasPublished, ...tour } = result;
    await audit(request.user.id, 'tour.update', tour.slug, { id, version: tour.version });
    if (_wasPublished || tour.status === 'published') dirty(`tour editado: ${tour.slug}`);
    return withSnippet(tour);
  });

  app.delete('/api/tours/:id', editor, async (request) => {
    const id = parseId(request.params.id);
    const r = await db.query(
      'UPDATE tours SET deleted_at = now(), version = version + 1, updated_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING slug, status',
      [id, request.user.id]
    );
    if (!r.rowCount) throw httpError(404, 'Tour no encontrado o ya eliminado.');
    await audit(request.user.id, 'tour.delete', r.rows[0].slug, { id });
    if (r.rows[0].status === 'published') dirty(`tour eliminado: ${r.rows[0].slug}`);
    return { ok: true };
  });

  app.post('/api/tours/:id/restore', editor, async (request) => {
    const id = parseId(request.params.id);
    const r = await db.query(
      `UPDATE tours SET deleted_at = NULL, version = version + 1, updated_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NOT NULL RETURNING ${COLS}`,
      [id, request.user.id]
    );
    if (!r.rowCount) throw httpError(404, 'Tour no encontrado o no está eliminado.');
    await audit(request.user.id, 'tour.restore', r.rows[0].slug, { id });
    if (r.rows[0].status === 'published') dirty(`tour restaurado: ${r.rows[0].slug}`);
    return withSnippet(r.rows[0]);
  });

  app.post('/api/tours/:id/duplicate', editor, async (request, reply) => {
    const id = parseId(request.params.id);
    const b = request.body || {};
    checkSlug(b.slug);
    const src = await db.query('SELECT title, description, steps FROM tours WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (!src.rowCount) throw httpError(404, 'Tour no encontrado.');
    const s = src.rows[0];
    let row;
    try {
      const r = await db.query(
        `INSERT INTO tours (slug, title, description, steps, status, updated_by) VALUES ($1,$2,$3,$4,'draft',$5) RETURNING ${COLS}`,
        [b.slug, `${s.title} (copia)`.slice(0, 200), s.description, JSON.stringify(s.steps), request.user.id]
      );
      row = r.rows[0];
    } catch (e) {
      throw dupError(e);
    }
    await audit(request.user.id, 'tour.create', row.slug, { id: row.id, duplicatedFrom: id });
    reply.code(201);
    return withSnippet(row);
  });
}
