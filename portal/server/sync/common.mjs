// Utilidades comunes de SYNC: recorrido del repo, tipos MIME, hashes y conexión para los scripts de consola.
import { readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import pg from 'pg';
import { loadEnv } from '../env.mjs';

// Archivos de apoyo que se guardan en `site_files` (relativos a la raíz del repo).
// `docs/_trace.json` lo escribe `docs-stale --record`, pero está versionado y no se puede regenerar sin el código
// de ISPMAX: es contenido del repo, no un derivado del build.
export const SITE_FILES = ['docs/sidebar.json', 'src/legacy-routes.json', 'docs/_trace.json'];
// Carpetas de docs/ que no son fuente (las genera el build) o no son páginas: igual que `scripts/lib/manual.mjs`.
export const DOCS_SKIP_DIRS = new Set(['public', '_generated', 'node_modules']);
// Archivos del sistema operativo que nunca son contenido (están en .gitignore).
export const IGNORED_FILES = new Set(['desktop.ini', 'Thumbs.db', '.DS_Store']);
// Clave de `settings` donde se guarda el hash de lo último importado (para `overwrite:'unedited'`).
export const STATE_KEY = 'sync_state';

const MIME = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
  ico: 'image/x-icon', avif: 'image/avif', pdf: 'application/pdf', json: 'application/json', txt: 'text/plain',
  mp4: 'video/mp4', webm: 'video/webm', woff2: 'font/woff2', woff: 'font/woff', css: 'text/css', js: 'text/javascript',
};
export const mimeOf = p => MIME[path.extname(p).slice(1).toLowerCase()] ?? 'application/octet-stream';

export const sha = data => createHash('sha256').update(data).digest('hex');
export const md5 = data => createHash('md5').update(data).digest('hex');

/** Lista recursiva de archivos (rutas relativas a `dir` con `/`). */
export function listFiles(dir, { skipDirs = new Set(), filter = () => true } = {}) {
  const out = [];
  const rec = (abs, rel) => {
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!skipDirs.has(e.name)) rec(path.join(abs, e.name), r);
      } else if (e.isFile() && !IGNORED_FILES.has(e.name) && filter(r)) out.push(r);
    }
  };
  rec(dir, '');
  return out.sort();
}

/** `tareas/acceso/x.mdx` → `/tareas/acceso/x`; `index.mdx` → `/`; `tareas/index.mdx` → `/tareas` (como `routeOf`). */
export const routeOfFile = rel => '/' + rel.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '').replace(/\/$/, '');
export const seccionOf = route => (route === '/' ? 'raiz' : route.split('/')[1]);

/** Une `base` con una ruta relativa y comprueba que no se salga de `base`. */
export function safeJoin(base, rel) {
  const abs = path.resolve(base, rel);
  const b = path.resolve(base);
  if (abs !== b && !abs.startsWith(b + path.sep)) throw new Error(`Ruta fuera del directorio permitido: ${rel}`);
  return abs;
}

/** Pool para los scripts de consola: `--test` usa TEST_DATABASE_URL; si no, DATABASE_URL. */
export function cliPool(argv = process.argv) {
  loadEnv();
  const test = argv.includes('--test');
  const url = test ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) throw new Error(`Falta ${test ? 'TEST_DATABASE_URL' : 'DATABASE_URL'} en portal/.env`);
  return { pool: new pg.Pool({ connectionString: url }), test };
}

export const argValue = (argv, name, def) => {
  const a = argv.find(x => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
};

/** `assets/tours/<slug>.json` (ruta relativa a assets/): son tours, no imágenes. */
export const TOUR_FILE_RE = /^tours\/([a-z0-9][a-z0-9-]*)\.json$/;
export const isTourFile = rel => TOUR_FILE_RE.test(rel);
