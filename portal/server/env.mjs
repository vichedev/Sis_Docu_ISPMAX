// Carga portal/.env sin dependencias. Las variables ya definidas en el entorno tienen prioridad.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Letra de unidad de Windows en mayúscula (`c:` → `C:`): con la minúscula Rspack carga dos copias de sí mismo al compilar por el enlace de node_modules. */
export const normDrive = (p) => (/^[a-z]:/.test(p) ? p[0].toUpperCase() + p.slice(1) : p);

export const PORTAL_ROOT = normDrive(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
export const REPO_ROOT = normDrive(path.resolve(PORTAL_ROOT, '..'));

export function loadEnv() {
  // PORTAL_ENV_FILE (solo del entorno real) permite usar otro archivo de variables; sin ella, portal/.env.
  const f = process.env.PORTAL_ENV_FILE ? path.resolve(process.env.PORTAL_ENV_FILE) : path.join(PORTAL_ROOT, '.env');
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
