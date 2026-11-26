#!/usr/bin/env node
/**
 * Da a los usuarios de la instancia AISLADA todos los permisos del catálogo del frontend
 * (`src/pages/dashboard/usuarios/permisos/*.json`). `seed-base.mjs` crea el administrador con `permisos` vacío y,
 * con la lista vacía, el guard del panel (`router/auth-guard.ts`) rebota cualquier pantalla al inicio.
 *
 *   ISPMAX_FE_SRC        carpeta `src` del frontend
 *   ISPMAX_PG_CONTAINER  contenedor Postgres  (def. ispmax-local-pg)
 *   ISPMAX_PG_DB         base de datos        (def. ispmax_local)
 *
 * Además el frontend debe arrancar con `VITE_HOST_KEY_PERMISOS` (cualquier texto) y `VITE_COMPANY_NAME`:
 * sin la primera, el login guarda los permisos cifrados vacíos.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const FE = process.env.ISPMAX_FE_SRC;
const CONTAINER = process.env.ISPMAX_PG_CONTAINER ?? 'ispmax-local-pg';
const DB = process.env.ISPMAX_PG_DB ?? 'ispmax_local';
if (!FE) {
  console.error('Defina ISPMAX_FE_SRC (carpeta src del frontend).');
  process.exit(2);
}
if (CONTAINER === 'ispmax-pg' || DB === 'ispmax') {
  console.error('Rechazado: nunca apuntar a la BD real.');
  process.exit(2);
}

const dir = path.join(FE, 'pages', 'dashboard', 'usuarios', 'permisos');
const valores = new Set();
const recorrer = nodos => {
  for (const n of nodos) {
    if (n.value) valores.add(String(n.value));
    if (n.children) recorrer(n.children);
  }
};
for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) recorrer(JSON.parse(readFileSync(path.join(dir, f), 'utf8')));

const lista = [...valores].map(v => `'${v.replace(/'/g, "''")}'`).join(',');
const sql = `UPDATE users SET permisos = ARRAY[${lista}]::text[]; SELECT usuario, array_length(permisos, 1) FROM users;`;
console.log(execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', DB, '-At'], { input: sql, encoding: 'utf8' }).trim());
