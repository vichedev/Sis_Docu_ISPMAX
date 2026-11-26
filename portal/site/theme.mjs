// Ubicación y estado del TEMA compilado del manual dinámico (npm run site:build → portal/site/dist). Sin dependencias
// pesadas: lo usan el motor, el arranque y las pruebas para saber si está compilado sin cargarlo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SITE_DIST = path.join(HERE, 'dist');
export const CLIENT_DIST = path.join(SITE_DIST, 'client');
export const SSR_ENTRY = path.join(SITE_DIST, 'server', 'entry-server.js');
export const MANIFEST = path.join(CLIENT_DIST, '.vite', 'manifest.json');

/** ¿Está el tema compilado? → { ok, builtAt, missing } (sin cargarlo). */
export function themeStatus() {
  const missing = [SSR_ENTRY, MANIFEST].filter(f => !fs.existsSync(f)).map(f => path.relative(path.join(HERE, '..'), f).replace(/\\/g, '/'));
  let builtAt = null;
  try {
    builtAt = fs.statSync(MANIFEST).mtime.toISOString();
  } catch {}
  return { ok: missing.length === 0, builtAt, missing };
}
