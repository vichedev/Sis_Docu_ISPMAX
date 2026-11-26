// Corpus de contenido para pruebas y herramientas: las 285 páginas, las imágenes y los archivos de apoyo del manual.
// Hoy esos archivos están en el repo (docs/, assets/); cuando se retiren, el contenido vive en un paquete `.ispmax`
// y este helper lo materializa en `portal/work-test/corpus/` con la MISMA lógica de render que el exportador
// (`exportToDir`), de modo que el árbol resultante es idéntico byte a byte al que tenía el repo.
//
// getCorpus() → { available, source, root, docsDir, assetsDir, extraFiles, skipReason }
//   root        raíz "tipo repo" (contiene docs/, assets/ y src/legacy-routes.json): es lo que recibe `importFromRepo`.
//   docsDir     <root>/docs            · assetsDir  <root>/assets/imgs
//   extraFiles  rutas absolutas de docs/sidebar.json, docs/_trace.json y src/legacy-routes.json
//   source      'env' | 'repo' | 'package' | 'none'
// Orden de decisión:
//   1. ISPMAX_CORPUS_DIR (una raíz tipo repo ya preparada).
//   2. ISPMAX_FORCE_CORPUS=1 → se ignora el repo (se usa el paquete).
//   3. El repo, si todavía tiene >= 250 .mdx en docs/.
//   4. El paquete más reciente de portal/data/backups/content/ (o ISPMAX_CORPUS_PACKAGE: archivo o carpeta).
// Sin paquete ni repo: available=false y `corpusSkip` trae el motivo para pasarlo a `{ skip }` de node:test.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { PORTAL_ROOT, REPO_ROOT } from '../../server/env.mjs';
import { renderPage } from '../../server/sync/parse.mjs';
import { tourJson, mergeRedirects } from '../../server/sync/export.mjs';
import { SITE_FILES, DOCS_SKIP_DIRS, listFiles } from '../../server/sync/common.mjs';

export const CORPUS_MIN_PAGES = 250;
export const CORPUS_CACHE = path.join(PORTAL_ROOT, 'work-test', 'corpus');
const PACKAGES_DIR = path.join(PORTAL_ROOT, 'data', 'backups', 'content');
const MARKER = '.corpus-sha256';
const HELPER_VERSION = '1';
const PKG_NAME_RE = /^ispmax-contenido-(\d{8}-\d{6})(?:-(\d+))?\.ispmax$/;

const sha256 = data => createHash('sha256').update(data).digest('hex');
const repoMdx = root => listFiles(path.join(root, 'docs'), { skipDirs: DOCS_SKIP_DIRS, filter: r => r.endsWith('.mdx') });

const isMarked = (dir, key) => { try { return fs.readFileSync(path.join(dir, MARKER), 'utf8') === key; } catch { return false; } };

function view(root, source, extra = {}) {
  return {
    available: true, source, root, docsDir: path.join(root, 'docs'), assetsDir: path.join(root, 'assets', 'imgs'),
    extraFiles: SITE_FILES.map(f => path.join(root, f)), skipReason: null, ...extra,
  };
}

/** Paquete .ispmax más reciente (por sello de nombre; el sufijo -N desempata) o null. */
export function latestPackage() {
  const given = process.env.ISPMAX_CORPUS_PACKAGE;
  if (given) {
    const p = path.resolve(given);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    if (!fs.existsSync(p)) return null;
    return pickLatest(p);
  }
  return pickLatest(PACKAGES_DIR);
}
function pickLatest(dir) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return null; }
  const key = n => { const m = PKG_NAME_RE.exec(n); return m ? `${m[1]}-${String(m[2] ?? 0).padStart(6, '0')}` : null; };
  const sorted = names.filter(n => key(n)).sort((a, b) => (key(a) < key(b) ? 1 : -1));
  return sorted.length ? path.join(dir, sorted[0]) : null;
}

/** Escribe el árbol tipo repo de un paquete en `outDir` (vacío). Misma lógica que `exportToDir`. */
export function writeTree(data, outDir) {
  const plan = new Map(); // ruta absoluta en minúsculas → { abs, buf }
  const add = (abs, buf) => plan.set(abs.toLowerCase(), { abs, buf });
  const within = rel => {
    const abs = path.resolve(outDir, rel);
    if (!abs.startsWith(path.resolve(outDir) + path.sep)) throw new Error(`Ruta fuera del corpus: ${rel}`);
    return abs;
  };
  for (const p of data.pages) {
    if (p.deleted || p.status !== 'published') continue;
    const abs = within(path.join('docs', p.file_path));
    if (!plan.has(abs.toLowerCase())) add(abs, Buffer.from(renderPage(p), 'utf8'));
  }
  const dims = new Map(data.assets.filter(a => a.width != null && a.height != null).map(a => [a.path, a]));
  for (const a of data.assets) add(within(path.join('assets', a.path)), Buffer.from(a.b64, 'base64'));
  for (const t of data.tours) {
    if (t.status !== 'published') continue;
    add(within(`assets/tours/${t.slug}.json`), Buffer.from(tourJson(t, dims), 'utf8'));
  }
  for (const f of data.site_files) {
    let content = f.content;
    if (f.path === 'src/legacy-routes.json' && data.redirects.length) content = mergeRedirects(content, data.redirects);
    add(within(f.path), Buffer.from(content, 'utf8'));
  }
  for (const { abs, buf } of plan.values()) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
  }
  return plan.size;
}

function materialize(pkgFile) {
  const key = sha256(fs.readFileSync(pkgFile)) + ':' + HELPER_VERSION;
  if (isMarked(CORPUS_CACHE, key)) return view(CORPUS_CACHE, 'package', { packageFile: pkgFile });
  // Varios procesos de prueba (web/ y portal/) pueden pedir el corpus a la vez: uno lo materializa y los demás esperan.
  fs.mkdirSync(path.dirname(CORPUS_CACHE), { recursive: true });
  const lock = CORPUS_CACHE + '.lock';
  const wait = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let i = 0; ; i++) {
    try { fs.mkdirSync(lock); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (isMarked(CORPUS_CACHE, key)) return view(CORPUS_CACHE, 'package', { packageFile: pkgFile });
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 120000) fs.rmSync(lock, { recursive: true, force: true }); } catch { /* ya liberado */ }
      if (i > 600) throw new Error('tiempo agotado esperando a que otro proceso materialice el corpus (borre ' + lock + ' si quedó huérfano).');
      wait(200);
    }
  }
  try { return build(pkgFile, key); } finally { fs.rmSync(lock, { recursive: true, force: true }); }
}

function build(pkgFile, key) {
  // Con el candado tomado nadie más construye: se limpian restos de intentos anteriores.
  for (const n of fs.readdirSync(path.dirname(CORPUS_CACHE))) if (n.startsWith('corpus.tmp-')) try { fs.rmSync(path.join(path.dirname(CORPUS_CACHE), n), { recursive: true, force: true }); } catch { /* sigue ahí */ }
  const raw = fs.readFileSync(pkgFile);
  const marked = dir => isMarked(dir, key);
  if (marked(CORPUS_CACHE)) return view(CORPUS_CACHE, 'package', { packageFile: pkgFile });

  const pkg = JSON.parse(zlib.gunzipSync(raw).toString('utf8'));
  if (pkg.format !== 'ispmax-manual-content' || !pkg.data) throw new Error(`${pkgFile} no es un paquete de contenido del manual.`);
  if (sha256(JSON.stringify(pkg.data)) !== pkg.sha256) throw new Error(`${pkgFile}: la suma de verificación (sha256) no coincide.`);
  // Se escribe en una carpeta temporal y se renombra: varios procesos de prueba pueden pedir el corpus a la vez.
  const tmp = `${CORPUS_CACHE}.tmp-${process.pid}-${Date.now()}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  writeTree(pkg.data, tmp);
  fs.writeFileSync(path.join(tmp, MARKER), key);
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const done = () => view(CORPUS_CACHE, 'package', { packageFile: pkgFile });
  let last;
  for (let i = 0; i < 15; i++) {
    if (marked(CORPUS_CACHE)) { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); return done(); } // otro proceso ya lo dejó listo
    try {
      if (fs.existsSync(CORPUS_CACHE)) fs.rmSync(CORPUS_CACHE, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); // caché de otro paquete
      if (i < 4) fs.renameSync(tmp, CORPUS_CACHE);
      else {
        // Windows a veces rechaza renombrar la carpeta (EPERM: otro proceso la retiene): se copia y el marcador va al final.
        fs.cpSync(tmp, CORPUS_CACHE, { recursive: true, filter: f => path.basename(f) !== MARKER });
        fs.copyFileSync(path.join(tmp, MARKER), path.join(CORPUS_CACHE, MARKER));
        try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { /* queda en work-test/ */ }
      }
      return done();
    } catch (e) {
      last = e;
      sleep(200); // Windows: el antivirus o el indexador pueden retener la carpeta unos instantes
    }
  }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* se queda en work-test/ */ }
  throw new Error(`No se pudo materializar el corpus en ${CORPUS_CACHE}: ${last?.code ?? last?.message}.`);
}

const none = reason => ({ available: false, source: 'none', root: null, docsDir: null, assetsDir: null, extraFiles: [], skipReason: reason });
let cached;

export function getCorpus() {
  if (cached) return cached;
  return (cached = decide());
}
function decide() {
  const env = process.env.ISPMAX_CORPUS_DIR;
  if (env) {
    const root = path.resolve(env);
    if (fs.existsSync(path.join(root, 'docs'))) return view(root, 'env');
    return none(`ISPMAX_CORPUS_DIR apunta a ${root}, que no tiene docs/.`);
  }
  const force = process.env.ISPMAX_FORCE_CORPUS === '1';
  if (!force && repoMdx(REPO_ROOT).length >= CORPUS_MIN_PAGES) return view(REPO_ROOT, 'repo');
  const pkg = latestPackage();
  if (!pkg) {
    return none(
      `Sin corpus: ${force ? 'ISPMAX_FORCE_CORPUS=1 ignora el repo y ' : 'el repo ya no tiene docs/ y '}no hay paquetes .ispmax en ${PACKAGES_DIR} ` +
        '(ni ISPMAX_CORPUS_PACKAGE). Genere uno con `npm run content:export` desde portal/ (con la base real cargada) y repita; ' +
        'ver portal/test/README.md.',
    );
  }
  try {
    return materialize(pkg);
  } catch (e) {
    return none(`Sin corpus: ${e.message}`);
  }
}

/** Valor para `{ skip }` de node:test: false si hay corpus, o el mensaje que explica cómo generarlo. */
export const corpusSkip = (() => { const c = getCorpus(); return c.available ? false : c.skipReason; })();

/** Lista (relativa a `root`, con `/`) de lo que cuenta como contenido: docs/**.mdx, assets/** y los archivos de apoyo. */
export function corpusFiles(root) {
  return [
    ...listFiles(path.join(root, 'docs'), { skipDirs: DOCS_SKIP_DIRS, filter: r => r.endsWith('.mdx') }).map(r => `docs/${r}`),
    ...listFiles(path.join(root, 'assets')).map(r => `assets/${r}`),
    ...SITE_FILES.filter(f => fs.existsSync(path.join(root, f))),
  ].sort();
}

/**
 * Compara dos árboles tipo repo byte a byte → { total, pages, assets, support, missing, extra, different }.
 * `expectedRoot` es la referencia; `actualRoot` lo que se comprueba (p. ej. una exportación).
 */
export function compareTrees(expectedRoot, actualRoot) {
  const expected = corpusFiles(expectedRoot);
  const actual = listFiles(actualRoot).filter(f => f !== MARKER);
  const aset = new Set(actual);
  const eset = new Set(expected);
  const missing = expected.filter(f => !aset.has(f));
  const extra = actual.filter(f => !eset.has(f));
  const different = expected.filter(f => aset.has(f) && !fs.readFileSync(path.join(expectedRoot, f)).equals(fs.readFileSync(path.join(actualRoot, f))));
  const pages = expected.filter(f => f.startsWith('docs/') && f.endsWith('.mdx')).length;
  const assets = expected.filter(f => f.startsWith('assets/')).length;
  return { total: expected.length, pages, assets, support: expected.length - pages - assets, missing, extra, different };
}

/** Avisa por consola de qué corpus se usa (una línea; sirve de rastro en los informes de las pruebas). */
export function describeCorpus(c = getCorpus()) {
  return c.available ? `corpus: ${c.source} (${c.root})` : `corpus: NO DISPONIBLE (${c.skipReason})`;
}
