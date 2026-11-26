#!/usr/bin/env node
/**
 * Siembra el mínimo para poder iniciar sesión en la instancia AISLADA de ISPMAX
 * usada para documentar (empresa, sucursal, usuario SUPER-ADMINISTRADOR, settings).
 *
 * No toca la BD real: solo escribe en el contenedor `ispmax-local-pg` (BD `ispmax_local`).
 * Es idempotente: se puede volver a ejecutar (restablece la contraseña de la cuenta de pruebas).
 *
 *   ISPMAX_BACKEND_DIR            carpeta del backend con node_modules (para bcrypt; def. ~/Downloads/ispmax/backend-isp-main)
 *   ISPMAX_PG_CONTAINER           contenedor Postgres  (def. ispmax-local-pg)
 *   ISPMAX_PG_DB                  base de datos        (def. ispmax_local)
 *   ISPMAX_DEMO_ADMIN_PASSWORD    contraseña de la cuenta de pruebas (def. la documentada abajo)
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const BACKEND = process.env.ISPMAX_BACKEND_DIR ?? path.join(os.homedir(), 'Downloads', 'ispmax', 'backend-isp-main');
const CONTAINER = process.env.ISPMAX_PG_CONTAINER ?? 'ispmax-local-pg';
const DB = process.env.ISPMAX_PG_DB ?? 'ispmax_local';

if (CONTAINER === 'ispmax-pg' || DB === 'ispmax') {
  console.error('Rechazado: este script nunca debe apuntar a la BD real (ispmax-pg / ispmax).');
  process.exit(2);
}

// Cuenta de pruebas de una instancia local y sintética (no hay datos reales). La contraseña se documenta
// aquí a propósito: quien mantenga el manual necesita volver a entrar para recapturar pantallas.
const ADMIN_EMAIL = 'admin@manual.local';
const ADMIN_PASSWORD = process.env.ISPMAX_DEMO_ADMIN_PASSWORD ?? 'DemoManual-2026!';

const bcrypt = createRequire(path.join(BACKEND, 'package.json'))('bcrypt');
const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

const sql = `
BEGIN;
INSERT INTO companies (razon_social, nombre_comercial, direccion_matriz, ruc, email, telefono, requiere_facturacion, iva)
SELECT 'ISP DEMO MANUAL S.A.', 'ISP Demo', 'Av. Principal y Calle Demo', '1790000000001', 'demo@manual.local', '0990000000', true, '4'
WHERE NOT EXISTS (SELECT 1 FROM companies);

INSERT INTO sucursales (nombre, direccion, establecimiento, punto_emision, secuencia_factura_produccion, company_id)
SELECT 'Matriz', 'Av. Principal y Calle Demo', 1, 1, 1, (SELECT id FROM companies LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM sucursales);

INSERT INTO users (email, password, usuario, "fullName", celular, roles, permisos, "companyId", sucursales, routers, "isActive")
SELECT '${ADMIN_EMAIL}', '${hash}', 'admin', 'Administrador Demo', '0990000000',
       ARRAY['SUPER-ADMINISTRADOR'], ARRAY[]::text[], (SELECT id FROM companies LIMIT 1),
       ARRAY[(SELECT id FROM sucursales LIMIT 1)]::uuid[], ARRAY[]::text[], true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '${ADMIN_EMAIL}');

UPDATE users SET password = '${hash}', "isActive" = true WHERE email = '${ADMIN_EMAIL}';

INSERT INTO settings (company_id)
SELECT id FROM companies WHERE NOT EXISTS (SELECT 1 FROM settings) LIMIT 1;
COMMIT;
SELECT 'companies' t, count(*) FROM companies UNION ALL SELECT 'sucursales', count(*) FROM sucursales
UNION ALL SELECT 'users', count(*) FROM users UNION ALL SELECT 'settings', count(*) FROM settings;
`;

const out = execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-At'], {
  input: sql,
  encoding: 'utf8',
});
console.log(out.trim());
console.log(`Usuario de pruebas: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
