// Servidor de desarrollo para agentes y pruebas: usa una BASE DE PRUEBAS, nunca la real, con un administrador propio.
// Usuario `agente`, contraseña `Agente-Prueba-2026!` (cumple la política de contraseñas desde 2026-11-26; la antigua
// `agente-prueba` ya no se acepta). Uso: node server/dev-test-server.mjs [puerto]
//   · PORTAL_ADMIN_PATH=/zz-secreto-test prueba el modo de panel oculto (el panel y la API quedan en esa ruta).
//   · por defecto usa TEST_DATABASE_URL (la compartida; antes: node server/sync/import.mjs --test);
//   · con PORTAL_TEST_DB_NAME=<nombre> usa una base propia (se crea y migra si no existe y se importa el corpus (repo o paquete .ispmax) si está vacía),
//     para no chocar con otros procesos que usen la compartida o para pruebas destructivas (importar paquetes, etc.).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { loadEnv, PORTAL_ROOT } from './env.mjs';
import { getCorpus } from '../test/helpers/corpus.mjs';

// La ruta del panel solo se toma del entorno real de esta orden (no de portal/.env): los agentes y pruebas usan /admin
// y /api salvo que pidan el modo oculto expresamente.
const envAdminPath = process.env.PORTAL_ADMIN_PATH ?? '';
const envHideAdmin = process.env.PORTAL_HIDE_ADMIN ?? '';
loadEnv();
process.env.PORTAL_ADMIN_PATH = envAdminPath;
process.env.PORTAL_HIDE_ADMIN = envHideAdmin;
// Aislamiento: cada servidor de pruebas construye el sitio en SU carpeta (por puerto). Antes, si no se definían
// PORTAL_WORK_DIR/PORTAL_DATA_DIR, compartía portal/work y portal/data con el servidor real y con otros servidores de
// pruebas, y dos construcciones simultáneas se pisaban (el sitio real fallaba con «no generó dist/index.html»).
{
  const dtsPort = Number(process.argv[2]) || 4382;
  const dtsRoot = path.join(PORTAL_ROOT, 'work-test', `dts-${dtsPort}`);
  process.env.PORTAL_WORK_DIR ||= path.join(dtsRoot, 'work');
  process.env.PORTAL_DATA_DIR ||= path.join(dtsRoot, 'data');
}
if (!process.env.TEST_DATABASE_URL) throw new Error('Falta TEST_DATABASE_URL en portal/.env');
let url = process.env.TEST_DATABASE_URL;
const own = process.env.PORTAL_TEST_DB_NAME;
if (own) {
  if (!/^[a-z0-9_]{3,60}$/.test(own) || own === 'ispmax_manual') throw new Error('PORTAL_TEST_DB_NAME no válido.');
  const u = new URL(url);
  const admin = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: '/postgres' }).toString() });
  await admin.connect();
  const ex = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [own]);
  if (!ex.rowCount) await admin.query(`CREATE DATABASE "${own}" ENCODING 'UTF8'`);
  await admin.end();
  u.pathname = '/' + own;
  url = u.toString();
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query(readFileSync(path.join(PORTAL_ROOT, 'db', 'schema.sql'), 'utf8'));
  const n = (await c.query('SELECT count(*)::int AS n FROM pages')).rows[0].n;
  await c.end();
  if (!n && !process.env.PORTAL_TEST_DB_EMPTY) { // PORTAL_TEST_DB_EMPTY=1: base vacía (simula un sistema recién instalado)
    const corpus = getCorpus(); // repo mientras tenga docs/; si no, el paquete .ispmax más reciente (test/helpers/corpus.mjs)
    if (!corpus.available) throw new Error(corpus.skipReason);
    const { Pool } = pg;
    const pool = new Pool({ connectionString: url });
    const { importFromRepo } = await import('./sync/index.mjs');
    await importFromRepo({ pool, repoRoot: corpus.root, overwrite: 'all', log: () => {} });
    await pool.end();
  }
}
process.env.DATABASE_URL = url;
const { buildApp } = await import('./index.mjs');
const app = await buildApp({ databaseUrl: url, logger: { level: 'warn' } });
const AGENT_PASSWORD = 'Agente-Prueba-2026!';
process.env.PORTAL_ADMIN_USER = 'agente';
process.env.PORTAL_ADMIN_PASSWORD = AGENT_PASSWORD;
await app.portal.ensureAdmin();
const bcrypt = (await import('bcryptjs')).default;
// Siempre admin, activo, sin cambio obligatorio y sin bloqueos previos (para que los agentes entren a la primera).
await app.portal.ctx.pool.query(`INSERT INTO users (username, display_name, password_hash, role) VALUES ($1,'Agente de pruebas',$2,'admin')
  ON CONFLICT (username) DO UPDATE SET password_hash=$2, role='admin', active=true, must_change_password=false`, ['agente', await bcrypt.hash(AGENT_PASSWORD, 12)]);
await app.portal.ctx.pool.query("DELETE FROM login_attempts WHERE username = 'agente'");
await app.portal.ctx.pool.query("DELETE FROM login_locks WHERE key = 'agente' OR key LIKE 'agente|%'");
const port = Number(process.argv[2]) || 4382;
await app.listen({ port, host: '127.0.0.1' });
console.log(`[dev-test] http://127.0.0.1:${port}  (${own ? 'base propia ' + own : 'base de pruebas compartida'}; usuario agente / ${AGENT_PASSWORD})`);
process.on('SIGINT', async () => { await app.close(); process.exit(0); });
