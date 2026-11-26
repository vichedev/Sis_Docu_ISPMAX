// Base de datos PROPIA para herramientas (paridad, rendimiento): se crea en el servidor de TEST_DATABASE_URL con el
// nombre dado, se le aplica el esquema y, si está vacía, se importa el corpus (repo o paquete .ispmax). Nunca usa las
// bases real ni compartida (ispmax_manual, ispmax_manual_test).
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { loadEnv, PORTAL_ROOT } from '../../server/env.mjs';

function adminUrl() {
  loadEnv();
  const base = process.env.TEST_DATABASE_URL;
  if (!base) throw new Error('Falta TEST_DATABASE_URL (portal/.env).');
  return base;
}
const check = name => {
  if (!/^[a-z0-9_]{3,60}$/.test(name) || ['ispmax_manual', 'ispmax_manual_test'].includes(name)) throw new Error(`Base no válida para herramientas: ${name}`);
};
export function ownDbUrl(name) {
  check(name);
  const u = new URL(adminUrl());
  u.pathname = '/' + name;
  return u.toString();
}

/** Crea (si no existe) y llena con el corpus (si está vacía). Devuelve la URL. */
export async function ensureOwnDb(name, { log = () => {} } = {}) {
  const url = ownDbUrl(name);
  const admin = new pg.Client({ connectionString: Object.assign(new URL(adminUrl()), { pathname: '/postgres' }).toString() });
  await admin.connect();
  const ex = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!ex.rowCount) await admin.query(`CREATE DATABASE "${name}" ENCODING 'UTF8'`);
  await admin.end();
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query(fs.readFileSync(path.join(PORTAL_ROOT, 'db', 'schema.sql'), 'utf8'));
  const n = (await c.query('SELECT count(*)::int AS n FROM pages')).rows[0].n;
  await c.end();
  if (!n) {
    const { getCorpus, describeCorpus } = await import('../../test/helpers/corpus.mjs');
    const corpus = getCorpus();
    if (!corpus.available) throw new Error(corpus.skipReason);
    log(`[db] importando el ${describeCorpus(corpus)} en ${name}…`);
    const pool = new pg.Pool({ connectionString: url });
    const { importFromRepo } = await import('../../server/sync/index.mjs');
    await importFromRepo({ pool, repoRoot: corpus.root, overwrite: 'all', log: () => {} });
    await pool.end();
  }
  return url;
}

/** Borra la base propia (cierra antes sus conexiones). */
export async function dropOwnDb(name) {
  check(name);
  const admin = new pg.Client({ connectionString: Object.assign(new URL(adminUrl()), { pathname: '/postgres' }).toString() });
  await admin.connect();
  await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [name]);
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
}
