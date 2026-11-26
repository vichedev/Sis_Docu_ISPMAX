// Aplica db/schema.sql (idempotente) dentro de una transacción con un candado consultivo: varios procesos que arrancan
// a la vez (servidor, admin-cli, migrate) no chocan. El servidor lo llama al arrancar, así `npm start` no exige
// `npm run migrate` y las migraciones (p. ej. sesiones con token en claro → huella) se aplican solas.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PORTAL_ROOT } from './env.mjs';

export const SCHEMA_FILE = path.join(PORTAL_ROOT, 'db', 'schema.sql');
const LOCK_KEY = 738_201_411; // número fijo cualquiera: identifica el candado del esquema del portal

/** `pool` de pg (o cualquier objeto con connect()). */
export async function applySchema(pool) {
  const sql = readFileSync(SCHEMA_FILE, 'utf8');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY]);
    await c.query(sql);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
