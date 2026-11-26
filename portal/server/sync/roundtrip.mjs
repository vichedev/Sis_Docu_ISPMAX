// Prueba de ida y vuelta: corpus (repo o paquete .ispmax) → TEST_DATABASE_URL → portal/work/roundtrip/ → comparación byte a byte con el corpus.
// Uso: npm run roundtrip   (SOLO usa TEST_DATABASE_URL; vacía sus tablas de contenido)
//
// Se compara todo lo que es fuente: docs/**/*.mdx, assets/** y los site_files (docs/sidebar.json,
// src/legacy-routes.json, docs/_trace.json). Fuera de la comparación, porque los genera el repo y no son fuente
// (están en .gitignore): docs/_nav.json (build-nav), docs/public/ (sync-assets copia assets/ ahí) y los archivos del
// sistema operativo (desktop.ini, Thumbs.db, .DS_Store).
import { readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { loadEnv, PORTAL_ROOT } from '../env.mjs';
import { getCorpus, describeCorpus } from '../../test/helpers/corpus.mjs';
import { importFromRepo } from './import.mjs';
import { exportToDir } from './export.mjs';
import { parsePage, buildFrontmatter } from './parse.mjs';
import { SITE_FILES, DOCS_SKIP_DIRS, STATE_KEY, IGNORED_FILES, listFiles } from './common.mjs';

loadEnv();
const CORPUS = getCorpus();
if (!CORPUS.available) {
  console.error(CORPUS.skipReason);
  process.exit(2);
}
const CORPUS_ROOT = CORPUS.root; // el repo mientras tenga docs/; si no, el paquete .ispmax materializado (test/helpers/corpus.mjs)
console.log(describeCorpus(CORPUS));
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Falta TEST_DATABASE_URL en portal/.env');
const dbName = u => { try { const x = new URL(u); return `${x.hostname}:${x.port || 5432}${x.pathname}`; } catch { return u; } };
if (process.env.DATABASE_URL && dbName(process.env.DATABASE_URL) === dbName(testUrl))
  throw new Error('TEST_DATABASE_URL apunta a la misma base que DATABASE_URL: no se ejecuta la prueba destructiva.');

const OUT = path.join(PORTAL_ROOT, 'work', 'roundtrip');
const pool = new pg.Pool({ connectionString: testUrl });
const quiet = [];
const log = m => quiet.push(m);
let failed = false;
// Los tours que ya existen en la BD se omiten al reimportar (no se pisan): no cuentan como páginas omitidas.
const nonTourSkipped = r => (r.skippedItems || []).filter(x => !String(x).startsWith('tours/')).length;

try {
  const name = (await pool.query('SELECT current_database() AS d')).rows[0].d;
  console.log(`Base de prueba: ${name}`);
  await pool.query(readFileSync(path.join(PORTAL_ROOT, 'db', 'schema.sql'), 'utf8'));
  await pool.query('TRUNCATE pages, page_revisions, redirects, assets, site_files, tours RESTART IDENTITY CASCADE');
  await pool.query('DELETE FROM settings WHERE key = $1', [STATE_KEY]);

  // 1. Importar y exportar
  let t = Date.now();
  const imp = await importFromRepo({ pool, repoRoot: CORPUS_ROOT, overwrite: 'all', log });
  console.log(`Importado en ${Date.now() - t} ms: ${imp.pages} páginas, ${imp.assets} assets, ${imp.siteFiles} archivos de apoyo.`);
  quiet.filter(m => /AVISO|ERROR/.test(m)).forEach(m => console.log('  ' + m));
  rmSync(OUT, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  t = Date.now();
  const exp = await exportToDir({ pool, outDir: OUT, log });
  console.log(`Exportado en ${Date.now() - t} ms: ${exp.pages} páginas, ${exp.assets} assets, ${exp.siteFiles} archivos de apoyo, ` +
    `${exp.rebuilt} frontmatter regenerados.`);

  // 2. Comparar byte a byte
  const expected = [
    ...listFiles(path.join(CORPUS_ROOT, 'docs'), { skipDirs: DOCS_SKIP_DIRS, filter: r => r.endsWith('.mdx') }).map(r => `docs/${r}`),
    ...listFiles(path.join(CORPUS_ROOT, 'assets')).map(r => `assets/${r}`),
    ...SITE_FILES.filter(f => existsSync(path.join(CORPUS_ROOT, f))),
  ].sort();
  const actual = listFiles(OUT);
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter(f => !actualSet.has(f));
  const extra = actual.filter(f => !expectedSet.has(f));
  const different = expected.filter(f => actualSet.has(f) && !readFileSync(path.join(CORPUS_ROOT, f)).equals(readFileSync(path.join(OUT, f))));
  const excluded = [
    ...listFiles(path.join(CORPUS_ROOT, 'docs')).filter(r => !r.endsWith('.mdx') || r.startsWith('public/')).map(r => `docs/${r}`)
      .filter(f => !SITE_FILES.includes(f)),
  ];
  const nPages = expected.filter(f => f.startsWith('docs/') && f.endsWith('.mdx')).length;
  const nAssets = expected.filter(f => f.startsWith('assets/')).length;
  console.log(`Comparados ${expected.length} archivos: ${nPages} páginas, ${nAssets} assets, ${expected.length - nPages - nAssets} archivos de apoyo.`);
  console.log(`Diferencias: ${different.length} distintos, ${missing.length} faltan en la exportación, ${extra.length} sobran.`);
  for (const f of [...different.map(f => `≠ ${f}`), ...missing.map(f => `- ${f}`), ...extra.map(f => `+ ${f}`)].slice(0, 30)) console.log('  ' + f);
  const byTop = excluded.reduce((m, f) => ((m[f.startsWith('docs/public/') ? 'docs/public/**' : f] = (m[f.startsWith('docs/public/') ? 'docs/public/**' : f] ?? 0) + 1), m), {});
  console.log(`Excluidos (generados, no fuente): ${Object.entries(byTop).map(([k, v]) => `${k} (${v})`).join(', ') || 'ninguno'}; ` +
    `ignorados del SO en assets/: ${listOs(path.join(CORPUS_ROOT, 'assets')).join(', ') || 'ninguno'}.`);
  if (different.length || missing.length || extra.length) failed = true;

  // 3. Fidelidad de buildFrontmatter (lo que se escribiría si se edita el frontmatter)
  let same = 0, sameNoHint = 0, total = 0;
  const bad = [];
  for (const f of expected.filter(f => f.endsWith('.mdx'))) {
    const p = parsePage(readFileSync(path.join(CORPUS_ROOT, f), 'utf8'));
    if (p.fmText == null) continue;
    total++;
    const inner = p.fmText + p.eol;
    if (buildFrontmatter(p.frontmatter, { like: p.fmText, eol: p.eol }) === inner) same++;
    else bad.push(f);
    if (buildFrontmatter(p.frontmatter, { eol: p.eol }) === inner) sameNoHint++;
  }
  console.log(`buildFrontmatter reproduce idéntico el frontmatter de ${same}/${total} páginas con el original como guía ` +
    `y ${sameNoHint}/${total} sin guía (orden y comillas por defecto).`);
  bad.slice(0, 5).forEach(f => console.log('  distinto con guía: ' + f));

  // 4. Reimportar sin cambios ('unedited') debe dejarlo todo igual
  quiet.length = 0;
  const again = await importFromRepo({ pool, repoRoot: CORPUS_ROOT, overwrite: 'unedited', log });
  console.log(`Reimportar sin cambios: ${again.unchanged} sin cambios, ${again.updated} actualizadas, ${again.inserted} nuevas, ${again.skipped} omitidas.`);
  if (again.unchanged !== imp.pages || again.updated || again.inserted || nonTourSkipped(again)) failed = true;

  // 5. 'unedited': una página editada en el portal no se pisa; una sin editar sí se actualiza.
  const [a, b] = (await pool.query(`SELECT id, route, file_path FROM pages WHERE seccion = 'tareas' AND route <> '/tareas' ORDER BY id LIMIT 2`)).rows;
  await pool.query(`UPDATE pages SET body = body || 'editado en el portal', version = version + 1 WHERE id = $1`, [a.id]);
  for (const p of [a, b]) {
    const f = path.join(OUT, 'docs', p.file_path);
    writeFileSync(f, readFileSync(f, 'utf8') + 'cambio en git\n');
  }
  const upd = await importFromRepo({ pool, repoRoot: OUT, overwrite: 'unedited', log });
  const okA = upd.skippedItems.includes(a.route);
  const bodyB = (await pool.query('SELECT body FROM pages WHERE id = $1', [b.id])).rows[0].body;
  const okB = bodyB.endsWith('cambio en git\n');
  console.log(`Reimportar con cambios (copia exportada, 'unedited'): editada omitida=${okA ? 'sí' : 'NO'}, ` +
    `no editada actualizada=${okB ? 'sí' : 'NO'} (${upd.updated} actualizadas, ${upd.skipped} omitidas).`);
  if (!okA || !okB || upd.updated !== 1 || nonTourSkipped(upd) !== 1) failed = true;

  // 6. Ida y vuelta con padre: dos páginas de /tareas, la segunda hija de la primera.
  {
    const OUT_P = OUT + '-padre';
    try { rmSync(OUT_P, { recursive: true, force: true, maxRetries: 20, retryDelay: 300 }); } catch {}
    await pool.query('TRUNCATE pages, page_revisions, redirects, assets, site_files, tours RESTART IDENTITY CASCADE');
    await pool.query('DELETE FROM settings WHERE key = $1', [STATE_KEY]);
    await importFromRepo({ pool, repoRoot: CORPUS_ROOT, overwrite: 'all', log });
    const [pa, pb] = (await pool.query(`SELECT id, route, file_path FROM pages WHERE seccion = 'tareas' AND route <> '/tareas' ORDER BY id LIMIT 2`)).rows;
    await pool.query('UPDATE pages SET parent_id = $2 WHERE id = $1', [pb.id, pa.id]);
    await exportToDir({ pool, outDir: OUT_P, log });
    const orig = readFileSync(path.join(CORPUS_ROOT, 'docs', pb.file_path), 'utf8');
    const withPadre = readFileSync(path.join(OUT_P, 'docs', pb.file_path), 'utf8');
    const stripped = withPadre.replace(/^padre: .*\r?\n/m, '');
    const hasLine = new RegExp(`^padre: "${pa.route}"\\r?$`, 'm').test(withPadre);
    // El resto del archivo (frontmatter y cuerpo) debe ser idéntico al original; solo se añade la línea `padre`.
    const restOk = stripped === orig;
    // Reimportar la exportación en una base limpia devuelve el mismo parent_id.
    await pool.query('TRUNCATE pages, page_revisions, redirects, assets, site_files, tours RESTART IDENTITY CASCADE');
    await pool.query('DELETE FROM settings WHERE key = $1', [STATE_KEY]);
    await importFromRepo({ pool, repoRoot: OUT_P, overwrite: 'all', log });
    const back = (await pool.query('SELECT pp.route AS padre FROM pages c JOIN pages pp ON pp.id = c.parent_id WHERE c.route = $1', [pb.route])).rows[0]?.padre;
    // Y sin padre vuelve a quedar idéntico al repo.
    await pool.query('UPDATE pages SET parent_id = NULL WHERE route = $1', [pb.route]);
    await exportToDir({ pool, outDir: OUT_P, log }); // sobre la anterior: reescribe lo que cambia
    const cleared = readFileSync(path.join(OUT_P, 'docs', pb.file_path), 'utf8') === orig;
    try { rmSync(OUT_P, { recursive: true, force: true, maxRetries: 20, retryDelay: 300 }); } catch (e) { console.log(`AVISO: no se pudo borrar ${OUT_P}: ${e.code}`); }
    const okP = hasLine && restOk && back === pa.route && cleared;
    console.log(`Ida y vuelta con padre (${pb.route} → ${pa.route}): línea padre=${hasLine ? 'sí' : 'NO'}, resto idéntico=${restOk ? 'sí' : 'NO'}, ` +
      `reimportado=${back === pa.route ? 'sí' : 'NO'}, sin padre idéntico al repo=${cleared ? 'sí' : 'NO'}.`);
    if (!okP) failed = true;
  }

  // Dejar la base de prueba y la exportación como el repo.
  await pool.query('TRUNCATE pages, page_revisions, redirects, assets, site_files, tours RESTART IDENTITY CASCADE');
  await pool.query('DELETE FROM settings WHERE key = $1', [STATE_KEY]);
  await importFromRepo({ pool, repoRoot: CORPUS_ROOT, overwrite: 'all', log });
  await exportToDir({ pool, outDir: OUT, log });
  console.log(failed ? 'RESULTADO: FALLA' : 'RESULTADO: OK (0 diferencias)');
} catch (e) {
  console.error(`Error: ${e.stack}`);
  failed = true;
} finally {
  await pool.end();
  process.exitCode = failed ? 1 : 0;
}

function listOs(dir) {
  const out = [];
  const rec = d => {
    let entries = [];
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) rec(p);
      else if (IGNORED_FILES.has(e.name)) out.push(path.relative(CORPUS_ROOT, p).split(path.sep).join('/'));
    }
  };
  rec(dir);
  return out;
}
