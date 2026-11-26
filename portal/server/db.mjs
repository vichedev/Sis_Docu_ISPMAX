// Pool compartido de PostgreSQL. `db.query(sql, params)`; `tx(fn)` para transacciones.
import pg from 'pg';
import { loadEnv } from './env.mjs';

loadEnv();
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = { query: (s, p) => pool.query(s, p) };
export async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
