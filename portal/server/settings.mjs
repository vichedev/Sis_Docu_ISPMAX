// Ajustes INTERNOS: los fija el despliegue (variables de entorno), no el panel. El panel solo edita los ajustes
// de `routes/admin.mjs` (título, WhatsApp, actualización automática y copias a conservar).
// En producción las filas antiguas de la tabla `settings` con estas claves se ignoran; solo se leen de la tabla
// con NODE_ENV=test o PORTAL_ALLOW_INTERNAL_SETTINGS=1 (pruebas que fijan la ruta del repositorio, etc.).
import path from 'node:path';
import { PORTAL_ROOT } from './env.mjs';

export const INTERNAL_KEYS = ['site_url', 'site_base', 'repo_path', 'git_remote', 'git_branch', 'build_command', 'restart_mode', 'backup_dir'];
export const INTERNAL_MESSAGE = 'Ese valor lo fija el despliegue y no se cambia desde el panel.';

export const allowInternalTable = (env = process.env) => env.NODE_ENV === 'test' || /^(1|true|yes)$/i.test(String(env.PORTAL_ALLOW_INTERNAL_SETTINGS || ''));

/** Carpeta de datos del portal (sitio publicado y respaldos). */
export const dataDir = (env = process.env) => path.resolve(env.PORTAL_DATA_DIR || path.join(PORTAL_ROOT, 'data'));
/** Carpeta fija de respaldos (copias completas); los paquetes de contenido van en `content/` dentro de ella. */
export const backupsDir = (env = process.env) => path.join(dataDir(env), 'backups');

/** Valor por defecto del despliegue (sin tabla). */
export function fixedInternal(key, ctx, env = process.env) {
  switch (key) {
    case 'site_base':
      return String(env.PORTAL_SITE_BASE || '').trim() || '/';
    case 'restart_mode':
      return String(env.PORTAL_RESTART_MODE || '').trim() === 'respawn' ? 'respawn' : 'exit';
    case 'build_command':
      return 'npm run build';
    case 'backup_dir':
      return backupsDir(env);
    case 'repo_path':
      return String(env.PORTAL_REPO_PATH || '').trim() || ctx?.repoRoot;
    default:
      return undefined;
  }
}

/** Lee un ajuste interno: entorno/valor fijo; la tabla solo en pruebas (ver arriba). */
export async function getInternal(ctx, key, env = process.env) {
  if (allowInternalTable(env) && typeof ctx.getSetting === 'function') {
    const v = await ctx.getSetting(key, null);
    if (v !== null && v !== undefined && v !== '') return v;
  }
  return fixedInternal(key, ctx, env);
}
