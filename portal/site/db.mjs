// Conexión a la base del spike: la misma URL de pruebas que usa dev-test-server.mjs, con la base PORTAL_TEST_DB_NAME.
import pg from 'pg';
import { loadEnv } from '../server/env.mjs';

export function spikeDatabaseUrl() {
  if (process.env.SPIKE_DATABASE_URL) return process.env.SPIKE_DATABASE_URL;
  loadEnv();
  const base = process.env.TEST_DATABASE_URL;
  if (!base) throw new Error('Falta TEST_DATABASE_URL (portal/.env).');
  const name = process.env.PORTAL_TEST_DB_NAME || 'ispmax_manual_spike';
  if (name === 'ispmax_manual' || name === 'ispmax_manual_test') throw new Error('El spike no usa las bases real ni compartida.');
  const u = new URL(base);
  u.pathname = '/' + name;
  return u.toString();
}

export const createPool = () => new pg.Pool({ connectionString: spikeDatabaseUrl(), max: 4 });
