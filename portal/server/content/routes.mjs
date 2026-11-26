// Rutas del paquete de contenido: /api/content/*  (resumen, exportar, listar, descargar, borrar, importar).
// registerContentRoutes(app, ctx) con ctx = { pool, db, requireRole, audit, getSetting, site? }. Se registra tras las rutas OPS.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { httpError, parseId } from '../routes/util.mjs';
import { createJobs } from '../ops/jobs.mjs';
import {
  exportPackage, importPackage, readPackage, currentCounts, hasContent, resolveContentDir, uniquePackagePath, PACKAGE_NAME_RE,
} from './package.mjs';

const MAX_UPLOAD = 300 * 1024 * 1024;
const userIdOf = req => req.user?.id ?? null;

export async function registerContentRoutes(app, ctx) {
  const { db, pool, requireRole, audit } = ctx;
  const admin = { preHandler: requireRole('admin') };
  const lector = { preHandler: requireRole('viewer') };
  const jobs = createJobs({ db });
  const dir = () => resolveContentDir(ctx.getSetting);

  async function fileOf(row) {
    if (!row || !PACKAGE_NAME_RE.test(row.filename)) throw httpError(404, 'Paquete no encontrado.');
    const p = path.join(await dir(), row.filename);
    if (!fs.existsSync(p)) throw httpError(404, `El archivo ${row.filename} no existe en disco.`);
    return p;
  }
  async function getRow(id) {
    const r = await db.query(`SELECT id, filename, size, user_id, created_at FROM backups WHERE id = $1 AND kind = 'content'`, [parseId(id)]);
    return r.rows[0] || null;
  }
  async function readMeta(file) {
    try {
      return JSON.parse(await fsp.readFile(file + '.json', 'utf8'));
    } catch {
      return null;
    }
  }
  async function register(file, size, userId, meta) {
    const filename = path.basename(file);
    await fsp.writeFile(file + '.json', JSON.stringify(meta, null, 2)).catch(() => {});
    const q = (uid) => db.query(`INSERT INTO backups (filename, size, user_id, kind) VALUES ($1,$2,$3,'content') RETURNING id, created_at`, [filename, size, uid]);
    try {
      return (await q(userId)).rows[0];
    } catch (e) {
      if (e.code !== '23503') throw e;
      return (await q(null)).rows[0];
    }
  }
  /** Conserva los `backup_keep` paquetes más recientes (tipo content); nunca borra el recién creado. */
  async function applyRetention(protectId) {
    const keep = Math.max(1, Number(await ctx.getSetting('backup_keep', 20)) || 20);
    const old = (await db.query(`SELECT id, filename FROM backups WHERE kind = 'content' ORDER BY created_at DESC, id DESC OFFSET $1`, [keep])).rows;
    const d = await dir();
    for (const row of old) {
      if (row.id === protectId) continue;
      if (PACKAGE_NAME_RE.test(row.filename)) {
        await fsp.rm(path.join(d, row.filename), { force: true });
        await fsp.rm(path.join(d, row.filename) + '.json', { force: true });
      }
      await db.query('DELETE FROM backups WHERE id = $1', [row.id]);
    }
    return old.length;
  }
  async function describe(row, d) {
    const p = path.join(d, row.filename);
    const exists = PACKAGE_NAME_RE.test(row.filename) && fs.existsSync(p);
    const meta = exists ? await readMeta(p) : null;
    return {
      id: row.id, filename: row.filename, size: Number(row.size), created_at: row.created_at, user_id: row.user_id, user_name: row.user_name ?? null,
      exists, sha256: meta?.sha256 ?? null, counts: meta?.counts ?? null, includeRevisions: meta?.includeRevisions ?? null, reason: meta?.reason ?? null,
    };
  }

  app.get('/api/content/summary', lector, async () => {
    const [counts, bytes, last] = await Promise.all([
      currentCounts(pool),
      db.query('SELECT COALESCE(SUM(size), 0)::bigint AS n FROM assets'),
      db.query(
        `SELECT b.id, b.filename, b.size, b.created_at, b.user_id, u.username AS user_name FROM backups b LEFT JOIN users u ON u.id = b.user_id
          WHERE b.kind = 'content' ORDER BY b.created_at DESC, b.id DESC LIMIT 1`,
      ),
    ]);
    const d = await dir();
    return {
      counts,
      hasContent: await hasContent(pool),
      assetsBytes: Number(bytes.rows[0].n),
      lastPackage: last.rows[0] ? await describe(last.rows[0], d) : null,
    };
  });

  app.post('/api/content/export', admin, async req => {
    const includeRevisions = req.body?.includeRevisions === true;
    const d = await dir();
    const r = await exportPackage({ pool, outFile: await uniquePackagePath(d), includeRevisions });
    const filename = path.basename(r.file);
    const row = await register(r.file, r.size, userIdOf(req), { sha256: r.sha256, counts: r.counts, includeRevisions, reason: 'manual' });
    await applyRetention(row.id).catch(() => {});
    await audit(userIdOf(req), 'content.export', filename, { size: r.size, sha256: r.sha256, counts: r.counts, includeRevisions });
    return { id: row.id, filename, size: r.size, sha256: r.sha256, counts: r.counts };
  });

  app.get('/api/content/files', lector, async () => {
    const d = await dir();
    const r = await db.query(
      `SELECT b.id, b.filename, b.size, b.created_at, b.user_id, u.username AS user_name FROM backups b LEFT JOIN users u ON u.id = b.user_id
        WHERE b.kind = 'content' ORDER BY b.created_at DESC, b.id DESC`,
    );
    return { items: await Promise.all(r.rows.map(x => describe(x, d))) };
  });

  app.get('/api/content/files/:id/download', admin, async (req, reply) => {
    const row = await getRow(req.params.id);
    const p = await fileOf(row);
    const { size } = await fsp.stat(p);
    reply
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Disposition', `attachment; filename="${row.filename}"`)
      .header('Content-Length', size)
      .header('Cache-Control', 'no-store');
    return reply.send(fs.createReadStream(p));
  });

  app.delete('/api/content/files/:id', admin, async req => {
    const row = await getRow(req.params.id);
    if (!row) throw httpError(404, 'Paquete no encontrado.');
    if (PACKAGE_NAME_RE.test(row.filename)) {
      const p = path.join(await dir(), row.filename);
      await fsp.rm(p, { force: true });
      await fsp.rm(p + '.json', { force: true });
    }
    await db.query('DELETE FROM backups WHERE id = $1', [row.id]);
    await audit(userIdOf(req), 'content.delete', row.filename, null);
    return { ok: true };
  });

  app.post('/api/content/import', admin, async (req, reply) => {
    if (!req.isMultipart()) throw httpError(400, 'Se esperaba un formulario multipart con el campo "file".');
    const fields = {};
    let buf = null;
    try {
      for await (const part of req.parts({ limits: { fileSize: MAX_UPLOAD, files: 1 } })) {
        if (part.type === 'file') {
          if (part.fieldname !== 'file') { await part.toBuffer().catch(() => {}); continue; }
          buf = await part.toBuffer();
          if (part.file.truncated) throw httpError(413, 'El paquete supera el máximo de 300 MB.');
        } else fields[part.fieldname] = part.value;
      }
    } catch (e) {
      if (e.code === 'FST_REQ_FILE_TOO_LARGE') throw httpError(413, 'El paquete supera el máximo de 300 MB.');
      throw e;
    }
    if (!buf || !buf.length) throw httpError(400, 'Falta el archivo del paquete (campo "file").');
    const mode = fields.mode || 'replace';
    if (!['replace', 'merge'].includes(mode)) throw httpError(400, "El modo debe ser 'replace' o 'merge'.");
    const pkg = await readPackage(buf); // valida antes de tocar nada
    if (mode === 'replace' && (await hasContent(pool)) && fields.confirm !== 'CARGAR') {
      throw httpError(400, 'La base ya tiene contenido: para reemplazarlo escriba exactamente CARGAR en la confirmación.');
    }
    const userId = userIdOf(req);
    const d = await dir();
    const { jobId, done } = await jobs.start(
      'import',
      userId,
      async ({ log }) => {
        const r = await importPackage({ pool, source: buf, mode, log, safetyDir: d });
        if (r.safety) {
          const reg = await register(r.safety.file, r.safety.size, userId, { sha256: r.safety.sha256, counts: r.safety.counts, includeRevisions: true, reason: 'seguridad antes de importar' }).catch(() => null);
          if (reg) await applyRetention(reg.id).catch(() => {});
        }
        ctx.site?.markDirty?.('import de contenido');
        await audit(userId, 'content.import', mode, { mode, counts: r.counts, skipped: r.skipped, safety: r.safety ? path.basename(r.safety.file) : null, packageCreatedAt: pkg.createdAt });
        return r;
      },
      'Ya hay una importación en curso.',
    );
    done.catch(() => {});
    return reply.send({ jobId });
  });
}
