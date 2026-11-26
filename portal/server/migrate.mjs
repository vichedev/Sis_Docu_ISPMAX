// Aplica db/schema.sql. Uso: node server/migrate.mjs [--test]  (--test usa TEST_DATABASE_URL)
// El servidor también lo aplica al arrancar (server/schema.mjs); este script sigue sirviendo para instaladores y CI.
import pg from 'pg';
import { loadEnv } from './env.mjs';
import { applySchema } from './schema.mjs';

loadEnv();
const url = process.argv.includes('--test') ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await applySchema(pool);
} finally {
  await pool.end();
}
console.log('Esquema aplicado.');
