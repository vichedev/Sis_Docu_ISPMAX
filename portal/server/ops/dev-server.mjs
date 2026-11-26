// Servidor mínimo para probar OPS sin la API (solo desarrollo).
// Uso: node server/ops/dev-server.mjs [--real-db] [--fake-sync] [--port 4390]
//   --real-db    usa DATABASE_URL (por defecto TEST_DATABASE_URL)
//   --fake-sync  simula exportToDir copiando docs/, assets/ y src/legacy-routes.json del repo
// Rol por cabecera `x-role` (admin|editor|viewer; por defecto viewer). Sin autenticación: NO usar fuera de pruebas.
import fs from 'node:fs/promises';
import path from 'node:path';
import Fastify from 'fastify';
import pg from 'pg';
import { loadEnv, REPO_ROOT } from '../env.mjs';
import { registerOpsRoutes } from './index.mjs';

loadEnv();
const argv = process.argv.slice(2);
const flag = f => argv.includes(f);
const port = Number(argv[argv.indexOf('--port') + 1]) || 4390;
const databaseUrl = flag('--real-db') ? process.env.DATABASE_URL : process.env.TEST_DATABASE_URL;
const pool = new pg.Pool({ connectionString: databaseUrl });
const db = { query: (s, p) => pool.query(s, p) };
const NIVEL = { viewer: 1, editor: 2, admin: 3 };

const fakeSync = {
  async exportToDir({ outDir, log }) {
    const skip = s => /[\\/]docs[\\/](public|_nav\.json)([\\/]|$)/.test(s);
    await fs.cp(path.join(REPO_ROOT, 'docs'), path.join(outDir, 'docs'), { recursive: true, filter: s => !skip(s) });
    await fs.cp(path.join(REPO_ROOT, 'assets'), path.join(outDir, 'assets'), { recursive: true });
    await fs.mkdir(path.join(outDir, 'src'), { recursive: true });
    await fs.copyFile(path.join(REPO_ROOT, 'src', 'legacy-routes.json'), path.join(outDir, 'src', 'legacy-routes.json'));
    log('(exportToDir simulado: copia del repo)');
    return { simulated: true };
  },
  async importFromRepo({ log }) {
    log('(importFromRepo simulado)');
    return { pages: 0, assets: 0, siteFiles: 0, skipped: 0, simulated: true };
  },
};

const overrides = JSON.parse(process.env.OPS_DEV_SETTINGS || '{}');
const ctx = {
  pool,
  db,
  databaseUrl,
  tx: null,
  repoRoot: REPO_ROOT,
  sync: flag('--fake-sync') ? fakeSync : undefined,
  requireRole: (...roles) => async (req, reply) => {
    const role = String(req.headers['x-role'] || 'viewer');
    if (!NIVEL[role]) return reply.code(401).send({ error: 'Sesión requerida.' });
    if (!roles.some(r => NIVEL[role] >= NIVEL[r])) return reply.code(403).send({ error: 'No tiene permiso.' });
    req.user = { id: null, role };
  },
  audit: (userId, action, target, detail) =>
    db.query('INSERT INTO audit_log (user_id, action, target, detail) VALUES ($1,$2,$3,$4)', [userId, action, target, detail ? JSON.stringify(detail) : null]),
  getSetting: async (key, def) => {
    if (key in overrides) return overrides[key];
    const r = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
    return r.rowCount ? r.rows[0].value : def;
  },
};

const app = Fastify({ logger: { level: 'warn' } });
await registerOpsRoutes(app, ctx);
app.get('/api/jobs/:id', async (req, reply) => {
  const r = await db.query('SELECT id, kind, status, log, started_at, finished_at FROM publish_jobs WHERE id = $1', [Number(req.params.id) || 0]);
  return r.rowCount ? r.rows[0] : reply.code(404).send({ error: 'Trabajo no encontrado.' });
});
await app.listen({ port, host: '127.0.0.1' });
console.log(`OPS dev en http://127.0.0.1:${port} (BD: ${new URL(databaseUrl).pathname.slice(1)})`);
