#!/usr/bin/env node
/**
 * manual-corpus — ver o construir el manual con el CONTENIDO REAL (paquete .ispmax) y el código del repo.
 *
 *   npm run dev:corpus  [-- --port 3001 --host ::]   rspress dev (recarga en caliente del tema, src/ y estilos)
 *   npm run build:corpus                             rspress build + check-dist + eval-search --check 90
 *   npm run preview:corpus [-- --port 4173]          sirve el último build:corpus (dist del espacio de trabajo)
 *
 * El contenido ya no está en docs/: `portal/test/helpers/corpus.mjs` lo materializa (desde el paquete .ispmax más
 * reciente de portal/data/backups/content/, o ISPMAX_CORPUS_DIR / ISPMAX_CORPUS_PACKAGE) en portal/work-test/corpus/.
 * Este script copia sus docs/ en un espacio de trabajo propio, portal/work-test/manual-dev/ (ignorado por Git), porque
 * build-nav escribe en docs/, y lanza Rspress con el rspress.config.ts del repo y estas variables (ver ese archivo):
 *
 *   ISPMAX_DOCS_DIR      <ws>/docs                 páginas, _nav.json y public/assets (sync-assets)
 *   ISPMAX_ASSETS_DIR    <corpus>/assets/imgs      origen de sync-assets (copia <corpus>/assets entero)
 *   ISPMAX_SEARCH_DATA   <ws>/search-data.json     índice del buscador
 *   ISPMAX_LEGACY_ROUTES <ws>/legacy-routes.json   redirecciones del manual antiguo (las del paquete)
 *   ISPMAX_DIST_DIR      <ws>/dist                 salida de build:corpus
 *
 * No toca docs/, assets/ ni src/search/data.json del repo, y desactiva la caché persistente de Rspress
 * (RSPRESS_PERSISTENT_CACHE=false): así puede convivir con un `npm run dev` del repo en el puerto 3000.
 * Puerto por defecto de dev:corpus: 3001.
 */
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.join(ROOT, 'portal', 'work-test', 'manual-dev');
const [mode = 'dev', ...rest] = process.argv.slice(2);
if (!['dev', 'build', 'preview'].includes(mode)) {
  console.error('Uso: node scripts/manual-corpus.mjs dev|build|preview [opciones de rspress]');
  process.exit(2);
}

// 1. Corpus (mismo helper que las pruebas del portal; no lee portal/.env).
const { getCorpus, describeCorpus } = await import(pathToFileURL(path.join(ROOT, 'portal', 'test', 'helpers', 'corpus.mjs')).href);
const corpus = getCorpus();
if (!corpus.available) {
  console.error(`[corpus] ${corpus.skipReason}`);
  process.exit(1);
}
console.log(`[corpus] ${describeCorpus(corpus)}`);

// 2. Espacio de trabajo (preview: solo se sirve lo ya construido): docs/ copiado (se reemplaza entero: build-nav y sync-assets escriben en él).
fs.mkdirSync(WS, { recursive: true });
const docs = path.join(WS, 'docs');
if (mode !== 'preview') {
fs.rmSync(docs, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
fs.cpSync(corpus.docsDir, docs, { recursive: true });
fs.copyFileSync(path.join(corpus.root, 'src', 'legacy-routes.json'), path.join(WS, 'legacy-routes.json'));
}

// node_modules → el del repo (los módulos virtuales de Rspress se resuelven desde el directorio de trabajo).
const nm = path.join(WS, 'node_modules');
if (!fs.existsSync(nm)) fs.symlinkSync(path.join(ROOT, 'node_modules'), nm, process.platform === 'win32' ? 'junction' : 'dir');

const env = {
  ...process.env,
  ISPMAX_DOCS_DIR: docs,
  ISPMAX_ASSETS_DIR: corpus.assetsDir,
  ISPMAX_SEARCH_DATA: path.join(WS, 'search-data.json'),
  ISPMAX_LEGACY_ROUTES: path.join(WS, 'legacy-routes.json'),
  ISPMAX_DIST_DIR: path.join(WS, 'dist'),
  RSPRESS_PERSISTENT_CACHE: 'false',
};

const node = (script, args = []) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { cwd: ROOT, env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// 3. Lo mismo que `npm run dev|build` antes de Rspress.
if (mode !== 'preview') {
  node('sync-assets.mjs');
  node('build-nav.mjs');
  node('build-search-data.mjs');
}

// 4. Rspress con la configuración del repo, desde el espacio de trabajo.
const rspress = path.join(ROOT, 'node_modules', '@rspress', 'core', 'bin', 'rspress.js');
const args = [rspress, mode, '-c', path.join(ROOT, 'rspress.config.ts'), ...rest];
if (mode === 'dev' && !rest.includes('--port')) args.push('--port', '3001');

if (mode === 'dev' || mode === 'preview') {
  const child = spawn(process.execPath, args, { cwd: WS, env, stdio: 'inherit' });
  const stop = () => child.kill('SIGINT');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', code => process.exit(code ?? 0));
} else {
  const r = spawnSync(process.execPath, args, { cwd: WS, env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  node('check-dist.mjs');
  node('eval-search.mjs', ['--check', '90']);
  console.log(`[corpus] Sitio en ${path.relative(ROOT, env.ISPMAX_DIST_DIR)} (vista previa: npm run preview:corpus)`);
}
