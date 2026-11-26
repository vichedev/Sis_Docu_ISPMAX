// Assets: listado, descarga, subida (→ WebP con sharp) y borrado protegido.
import sharp from 'sharp';
import { httpError, intParam, escapeLike } from './util.mjs';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/tiff']);
const MAX_WIDTH = 2400;

function checkPath(p, campo = 'path') {
  if (typeof p !== 'string' || !p || p.length > 300 || p.startsWith('/') || p.includes('\\') || p.split('/').some((s) => s === '..' || s === '.' || s === '')) {
    throw httpError(400, `Ruta no válida en ${campo}.`);
  }
  return p;
}
function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export function registerAssetRoutes(app, ctx) {
  const { db, requireRole, audit } = ctx;
  const viewer = { preHandler: requireRole('viewer') };
  const editor = { preHandler: requireRole('editor') };

  // Adenda 3: una imagen solo afecta al sitio si la usa una página o un tour publicados.
  async function usedByPublished(p) {
    const r = await db.query(
      `SELECT 1 FROM pages WHERE status = 'published' AND deleted_at IS NULL AND strpos(body, $2) > 0
       UNION ALL
       SELECT 1 FROM tours WHERE status = 'published' AND deleted_at IS NULL AND steps @> jsonb_build_array(jsonb_build_object('image', $1::text))
       LIMIT 1`,
      [p, '/assets/' + p]
    );
    return r.rowCount > 0;
  }
  const dirtyIfUsed = async (p, reason) => {
    try {
      if (ctx.site?.markDirty && (await usedByPublished(p))) ctx.site.markDirty(reason);
    } catch {}
  };

  app.get('/api/assets', viewer, async (request) => {
    const { prefix, q } = request.query;
    const limit = intParam(request.query.limit, 1000, 1, 5000);
    const offset = intParam(request.query.offset, 0, 0, 1e9);
    const params = [];
    const where = [];
    if (prefix) {
      params.push(escapeLike(String(prefix)) + '%');
      where.push(`path LIKE $${params.length}`);
    }
    if (q) {
      params.push('%' + escapeLike(String(q)) + '%');
      where.push(`path ILIKE $${params.length}`);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = (await db.query(`SELECT count(*)::int AS n FROM assets ${w}`, params)).rows[0].n;
    params.push(limit, offset);
    const r = await db.query(
      `SELECT path, mime, width, height, size, updated_at FROM assets ${w} ORDER BY path LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { total, items: r.rows };
  });

  app.get('/api/assets/file', viewer, async (request, reply) => {
    const p = checkPath(request.query.path);
    const r = await db.query('SELECT mime, bytes, updated_at FROM assets WHERE path = $1', [p]);
    if (!r.rowCount) throw httpError(404, 'Archivo no encontrado.');
    const a = r.rows[0];
    const etag = `"${a.updated_at.getTime()}-${a.bytes.length}"`;
    reply.header('ETag', etag).header('Cache-Control', 'private, no-cache');
    if (request.headers['if-none-match'] === etag) return reply.code(304).send();
    reply.header('X-Content-Type-Options', 'nosniff');
    return reply.type(a.mime).send(a.bytes);
  });

  app.post('/api/assets', editor, async (request, reply) => {
    if (!request.isMultipart()) throw httpError(400, 'Envía el archivo como multipart/form-data.');
    let buf = null;
    let fileMime = '';
    let filename = '';
    const fields = {};
    try {
      for await (const part of request.parts({ limits: { fileSize: MAX_BYTES, files: 1, fields: 10, parts: 12 } })) {
        if (part.type === 'file') {
          if (part.fieldname !== 'file' || buf) {
            part.file.resume();
            continue;
          }
          fileMime = part.mimetype;
          filename = part.filename || '';
          const b = await part.toBuffer();
          if (part.file.truncated) throw httpError(413, 'La imagen supera el máximo de 10 MB.');
          buf = b;
        } else {
          fields[part.fieldname] = String(part.value ?? '');
        }
      }
    } catch (e) {
      if (e.code === 'FST_REQ_FILE_TOO_LARGE') throw httpError(413, 'La imagen supera el máximo de 10 MB.');
      throw e;
    }
    if (!buf || !buf.length) throw httpError(400, 'Falta el archivo (campo `file`).');
    if (!ALLOWED.has(fileMime)) throw httpError(415, 'Solo se admiten imágenes (PNG, JPEG, WebP, GIF, AVIF o TIFF).');

    const folder = checkPath(fields.folder || 'imgs/general', 'folder');
    if (!/^[a-z0-9][a-z0-9/_-]*$/.test(folder)) throw httpError(400, 'La carpeta solo admite minúsculas, números, guiones y barras.');
    const name = slugify(fields.name || filename || 'imagen') || 'imagen';

    let out;
    try {
      const img = sharp(buf, { failOn: 'error', limitInputPixels: 100_000_000 });
      const meta = await img.metadata();
      if (!meta.width || !meta.height) throw new Error('sin dimensiones');
      out = await img.rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    } catch {
      throw httpError(400, 'El archivo no es una imagen válida.');
    }
    const { width, height } = out.info;

    const saved = await ctx.tx(async (c) => {
      // Correlativo NN por carpeta; el bloqueo evita colisiones entre subidas simultáneas.
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['assets:' + folder]);
      const r = await c.query(
        "SELECT COALESCE(MAX(substring(path from '/(\\d{2,})-[^/]*$')::int), 0) AS m FROM assets WHERE path LIKE $1 AND path NOT LIKE $2",
        [escapeLike(folder) + '/%', escapeLike(folder) + '/%/%']
      );
      const nn = String(r.rows[0].m + 1).padStart(2, '0');
      const p = `${folder}/${nn}-${name}.webp`;
      await c.query(
        'INSERT INTO assets (path, mime, bytes, width, height, size, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [p, 'image/webp', out.data, width, height, out.data.length, request.user.id]
      );
      return p;
    });
    await audit(request.user.id, 'asset.upload', saved, { size: out.data.length });
    await dirtyIfUsed(saved, `imagen subida: ${saved}`);
    const max = `${Math.min(width, 1100)}px`;
    reply.code(201);
    return {
      path: saved,
      width,
      height,
      url: `/api/assets/file?path=${encodeURIComponent(saved)}`,
      snippet: `<Figure src="/assets/${saved}" alt="" caption="" width={${width}} height={${height}} max="${max}" />`,
    };
  });

  app.delete('/api/assets', editor, async (request) => {
    const p = checkPath(request.query.path);
    const ex = await db.query('SELECT 1 FROM assets WHERE path = $1', [p]);
    if (!ex.rowCount) throw httpError(404, 'Archivo no encontrado.');
    const refs = await db.query(
      'SELECT id, route, title FROM pages WHERE deleted_at IS NULL AND strpos(body, $1) > 0 ORDER BY route LIMIT 100',
      ['/assets/' + p]
    );
    if (refs.rowCount) throw httpError(409, `La imagen está en uso en ${refs.rowCount} página(s); quítala de ahí primero.`, { pages: refs.rows });
    const used = ctx.site?.markDirty ? await usedByPublished(p) : false;
    await db.query('DELETE FROM assets WHERE path = $1', [p]);
    if (used) ctx.site.markDirty(`imagen eliminada: ${p}`);
    await audit(request.user.id, 'asset.delete', p);
    return { ok: true };
  });
}
