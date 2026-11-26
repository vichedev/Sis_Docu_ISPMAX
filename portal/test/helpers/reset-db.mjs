// Deja una base de PRUEBAS vacía: aplica el esquema (idempotente, incluye las migraciones) y vacía todas las tablas,
// también las de autenticación (intentos y bloqueos persisten entre ejecuciones si no se vacían).
import { applySchema } from '../../server/schema.mjs';

// Las pruebas usan el panel en /admin (modo por defecto) aunque portal/.env defina PORTAL_ADMIN_PATH: se fija antes de
// que cada prueba llame a loadEnv() (que no pisa variables ya definidas). Las del modo oculto lo pasan por `config`.
process.env.PORTAL_ADMIN_PATH = '';
process.env.PORTAL_HIDE_ADMIN = '';

export const ALL_TABLES =
  'users, sessions, pages, page_revisions, redirects, assets, site_files, tours, settings, publish_jobs, backups, audit_log, login_attempts, login_locks, login_challenges, recovery_codes';

/** `db`: pg.Client o pg.Pool conectados a la base de pruebas. */
export async function resetTestDb(db) {
  const pool = typeof db.connect === 'function' && typeof db.totalCount === 'number' ? db : { connect: async () => Object.assign(db, { release() {} }) };
  await applySchema(pool);
  await db.query(`TRUNCATE ${ALL_TABLES} RESTART IDENTITY CASCADE`);
}
