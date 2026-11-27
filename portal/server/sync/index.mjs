// Interfaz pública de SYNC (ver CONTRACT.md) y rutas HTTP de importación y trabajos.
import { importFromRepo } from './import.mjs';
import { exportToDir } from './export.mjs';
import { getInternal } from '../settings.mjs';
import { parsePage, buildFrontmatter, renderPage } from './parse.mjs';

export { importFromRepo, exportToDir, parsePage, buildFrontmatter, renderPage };

const JOB_COLS = 'j.id, j.kind, j.status, j.user_id, u.username, j.started_at, j.finished_at';

/** Registro de un trabajo en `publish_jobs`: acumula líneas y las vuelca a la BD cada medio segundo. */
export function jobLogger(pool, jobId) {
  let pending = '';
  let timer = null;
  let chain = Promise.resolve();
  const flush = () => {
    timer = null;
    if (!pending) return chain;
    const chunk = pending;
    pending = '';
    chain = chain.then(() => pool.query('UPDATE publish_jobs SET log = log || $2 WHERE id = $1', [jobId, chunk])).catch(() => {});
    return chain;
  };
  return {
    log(msg) {
      const t = new Date().toLocaleTimeString('es-EC', { hour12: false });
      pending += `[${t}] ${msg}\n`;
      if (!timer) timer = setTimeout(flush, 500);
    },
    async finish(status) {
      if (timer) clearTimeout(timer);
      await flush();
      await pool.query('UPDATE publish_jobs SET status = $2, finished_at = now() WHERE id = $1', [jobId, status]);
    },
  };
}

/**
 * Rutas: POST /api/import (admin) → {jobId} · GET /api/jobs/:id · GET /api/jobs?kind=&limit= → {items}.
 * ctx = { pool, db, tx, requireRole, audit, repoRoot, getSetting }. El usuario se lee de `req.user` (lo pone requireRole).
 */
export function registerSyncRoutes(app, ctx) {
  const { pool, requireRole, audit } = ctx;

  app.post('/api/import', { preHandler: requireRole('admin') }, async (req, reply) => {
    const overwrite = req.body?.overwrite ?? 'unedited';
    if (!['unedited', 'all'].includes(overwrite))
      return reply.code(400).send({ error: "El campo overwrite debe ser 'unedited' o 'all'." });
    const running = await pool.query(`SELECT id FROM publish_jobs WHERE kind = 'import' AND status = 'running' LIMIT 1`);
    if (running.rows.length) return reply.code(409).send({ error: `Ya hay una importación en curso (trabajo ${running.rows[0].id}).` });
    const userId = req.user?.id ?? null;
    const jobId = (await pool.query(`INSERT INTO publish_jobs (kind, status, user_id) VALUES ('import','running',$1) RETURNING id`, [userId]))
      .rows[0].id;
    const repoRoot = (await getInternal(ctx, 'repo_path')) || ctx.repoRoot;
    const job = jobLogger(pool, jobId);
    // En segundo plano: la petición responde ya con el id del trabajo.
    setImmediate(async () => {
      let detail;
      try {
        const r = await importFromRepo({ pool, repoRoot, overwrite, log: job.log, userId });
        await ctx.registerGroups?.(userId); // los grupos de lo importado quedan registrados
        detail = { overwrite, jobId, ...r, skippedItems: r.skippedItems.slice(0, 100) };
        await job.finish('ok');
      } catch (e) {
        detail = { overwrite, jobId, error: e.message };
        job.log(`ERROR: ${e.message}`);
        await job.finish('error').catch(() => {});
      }
      try {
        await audit?.(userId, 'import', repoRoot, detail);
      } catch {
        /* la auditoría no debe tumbar el proceso */
      }
    });
    return { jobId };
  });

  app.get('/api/jobs/:id', { preHandler: requireRole('viewer') }, async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Identificador de trabajo inválido.' });
    const r = await pool.query('SELECT id, kind, status, log, user_id, started_at, finished_at FROM publish_jobs WHERE id = $1', [id]);
    if (!r.rows.length) return reply.code(404).send({ error: 'No existe ese trabajo.' });
    return r.rows[0];
  });

  app.get('/api/jobs', { preHandler: requireRole('viewer') }, async req => {
    const { kind } = req.query ?? {};
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 20, 1), 200);
    const params = [limit];
    let where = '';
    if (kind) { params.push(String(kind)); where = 'WHERE j.kind = $2'; }
    const r = await pool.query(
      `SELECT ${JOB_COLS} FROM publish_jobs j LEFT JOIN users u ON u.id = j.user_id ${where} ORDER BY j.id DESC LIMIT $1`, params);
    return { items: r.rows };
  });
}
