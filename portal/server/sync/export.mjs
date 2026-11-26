// Exporta la BD del portal a un árbol como el del repo: <dir>/docs/**.mdx, <dir>/assets/** y los site_files.
// Uso: node server/sync/export.mjs <dir> [--test]   (--test lee de TEST_DATABASE_URL)
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, PORTAL_ROOT } from '../env.mjs';
import { renderPage } from './parse.mjs';
import { cliPool, safeJoin, listFiles, DOCS_SKIP_DIRS } from './common.mjs';

const LEGACY = 'src/legacy-routes.json';

/**
 * exportToDir({ pool, outDir, log }) → { pages, assets, siteFiles, rebuilt, redirects, written, removed }
 * Sincroniza <outDir>: escribe solo los archivos que cambian y borra de <outDir>/docs los .mdx que ya no existen
 * (y de <outDir>/assets lo que no está en la BD). No toca lo que genera el build (docs/_nav.json, docs/public/).
 * No exporta borradores ni páginas borradas. Se niega a escribir sobre el propio repo.
 */
export async function exportToDir({ pool, outDir, log = () => {} }) {
  if (!outDir) throw new Error('Falta el directorio de salida.');
  const out = path.resolve(outDir);
  if (out === path.resolve(REPO_ROOT) || out === path.resolve(PORTAL_ROOT) || existsSync(path.join(out, '.git')))
    throw new Error(`No se exporta sobre el repo ni sobre una copia con .git: ${out}`);
  if (path.resolve(REPO_ROOT).startsWith(out + path.sep)) throw new Error(`El directorio de salida contiene el repo: ${out}`);

  const [pages, assets, files, redirects, tours, dims] = await Promise.all([
    pool.query(`SELECT p.*, pp.route AS parent_route FROM pages p LEFT JOIN pages pp ON pp.id = p.parent_id
       WHERE p.deleted_at IS NULL AND p.status = 'published' ORDER BY p.file_path`),
    pool.query('SELECT path, bytes FROM assets ORDER BY path'),
    pool.query('SELECT path, content FROM site_files ORDER BY path'),
    pool.query('SELECT from_route, to_route FROM redirects ORDER BY from_route'),
    pool.query("SELECT slug, title, description, steps FROM tours WHERE deleted_at IS NULL AND status = 'published' ORDER BY slug"),
    pool.query('SELECT path, width, height FROM assets WHERE width IS NOT NULL AND height IS NOT NULL'),
  ]);

  const docsDir = path.join(out, 'docs');
  const assetsDir = path.join(out, 'assets');
  const plan = new Map(); // ruta absoluta en minúsculas → { abs, buf }
  const add = (abs, buf) => plan.set(abs.toLowerCase(), { abs, buf });
  const r = { tours: 0, pages: 0, assets: 0, siteFiles: 0, rebuilt: 0, redirects: redirects.rows.length, written: 0, removed: 0 };
  for (const p of pages.rows) {
    const abs = safeJoin(docsDir, p.file_path);
    if (plan.has(abs.toLowerCase())) { log(`ERROR: dos páginas usan el archivo ${p.file_path}; se omite ${p.route}.`); continue; }
    const text = renderPage(p);
    if (p.fm_raw == null || !text.startsWith(p.fm_raw)) r.rebuilt++;
    add(abs, Buffer.from(text, 'utf8'));
    r.pages++;
  }
  for (const a of assets.rows) { add(safeJoin(assetsDir, a.path), a.bytes); r.assets++; }
  // Tours publicados → assets/tours/<slug>.json (los lee el componente <Tour /> del manual).
  const dimsOf = new Map(dims.rows.map(d => [d.path, d]));
  for (const t of tours.rows) {
    const abs = safeJoin(assetsDir, `tours/${t.slug}.json`);
    if (plan.has(abs.toLowerCase())) { log(`ERROR: el tour ${t.slug} coincide con otro archivo de assets/; se omite.`); continue; }
    add(abs, Buffer.from(tourJson(t, dimsOf), 'utf8'));
    r.tours++;
  }
  for (const f of files.rows) {
    let content = f.content;
    if (f.path === LEGACY && redirects.rows.length) content = mergeRedirects(content, redirects.rows, log);
    add(safeJoin(out, f.path), Buffer.from(content, 'utf8'));
    r.siteFiles++;
  }

  // Borrar lo que sobra (páginas retiradas, assets eliminados).
  const stale = [
    ...listFiles(docsDir, { skipDirs: DOCS_SKIP_DIRS, filter: f => /\.mdx?$/.test(f) }).map(f => path.join(docsDir, f)),
    ...listFiles(assetsDir).map(f => path.join(assetsDir, f)),
  ].filter(abs => !plan.has(abs.toLowerCase()));
  for (const abs of stale) {
    rmSync(abs, { force: true, maxRetries: 5, retryDelay: 100 });
    r.removed++;
  }
  for (const { abs, buf } of plan.values()) {
    if (existsSync(abs)) {
      try {
        if (readFileSync(abs).equals(buf)) continue;
      } catch { /* se reescribe */ }
    }
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, buf);
    r.written++;
  }
  log(`Exportado a ${out}: ${r.pages} páginas (${r.rebuilt} con frontmatter regenerado), ${r.assets} assets, ${r.tours} tours, ` +
    `${r.siteFiles} archivos de apoyo, ${r.redirects} redirecciones; ${r.written} archivos escritos, ${r.removed} borrados.`);
  return r;
}

/** JSON de un tour: `{slug,title,description,steps}` con 2 espacios y salto final LF; cada paso lleva el ancho/alto de su imagen si se conocen. */
export function tourJson(t, dimsOf = new Map()) {
  const steps = (t.steps ?? []).map(s => {
    const d = dimsOf.get(s.image);
    return {
      image: s.image, alt: s.alt ?? '', title: s.title ?? '', text: s.text ?? '', spot: s.spot ?? null, link: s.link ?? null,
      ...(d ? { width: d.width, height: d.height } : {}),
    };
  });
  return JSON.stringify({ slug: t.slug, title: t.title, description: t.description ?? '', steps }, null, 2) + '\n';
}

/** Añade `redirects` (from_route → to_route) a legacy-routes.json conservando su formato (2 espacios, salto final). */
export function mergeRedirects(content, rows, log = () => {}) {
  let obj;
  try {
    obj = JSON.parse(content);
  } catch {
    log(`AVISO: ${LEGACY} no es JSON válido; no se añaden las redirecciones.`);
    return content;
  }
  for (const { from_route, to_route } of rows) obj[from_route] = to_route;
  const eol = /\r\n/.test(content) ? '\r\n' : '\n';
  const trailing = /\r?\n$/.test(content) ? eol : '';
  return JSON.stringify(obj, null, 2).replace(/\n/g, eol) + trailing;
}

// ── consola
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const dir = argv.find(a => !a.startsWith('--'));
  if (!dir) {
    console.error('Uso: node server/sync/export.mjs <dir> [--test]');
    process.exit(2);
  }
  const { pool } = cliPool(argv);
  try {
    const r = await exportToDir({ pool, outDir: dir, log: m => console.log(m) });
    console.log(JSON.stringify(r));
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
