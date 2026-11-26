import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
// Paquete de contenido (.ispmax): exportar, vaciar, importar y comparar byte a byte con el repo; merge; validaciones; API.
// Usa su PROPIA base `ispmax_manual_contenido_test` (derivada de TEST_DATABASE_URL cambiando solo el nombre) y la borra al terminar.
// Uso: node --test test/content.test.mjs   (desde portal/)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';
import { getCorpus, corpusSkip, compareTrees, describeCorpus } from './helpers/corpus.mjs';

loadEnv();
const BASE_URL = process.env.TEST_DATABASE_URL;
if (!BASE_URL) throw new Error('Falta TEST_DATABASE_URL');
const DB_NAME = 'ispmax_manual_contenido_test';
const u = new URL(BASE_URL);
u.pathname = '/' + DB_NAME;
const URL_ = u.toString();
process.env.DATABASE_URL = URL_;
process.env.PORTAL_ADMIN_USER = 'admin_prueba';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
const RUN = path.join(PORTAL_ROOT, 'work-test', 'content-test');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = path.join(RUN, 'data');

const { buildApp } = await import('../server/index.mjs');
const { importFromRepo, exportToDir } = await import('../server/sync/index.mjs');
const { exportPackage, importPackage, readPackage, CONTENT_SETTINGS } = await import('../server/content/package.mjs');

const PASS = 'Clave-de-prueba-1';
const skip = corpusSkip; // sin repo ni paquete .ispmax las pruebas se saltan con el motivo (ver test/README.md)
const CORPUS = getCorpus();
console.log('# ' + describeCorpus(CORPUS));
let pool, app, admin, viewer;
const OUT = path.join(RUN, 'out');
const PKG = path.join(RUN, 'pkgs');
const quiet = () => {};

const WIPE = 'TRUNCATE pages, page_revisions, redirects, assets, site_files, tours RESTART IDENTITY CASCADE';
async function wipeContent() {
  await pool.query(WIPE);
  await pool.query('DELETE FROM settings WHERE key = ANY($1::text[]) OR key = $2', [CONTENT_SETTINGS, 'sync_state']);
}
async function fingerprint() {
  const r = await pool.query(`SELECT
    (SELECT count(*) FROM pages)::int p, (SELECT count(*) FROM assets)::int a, (SELECT count(*) FROM tours)::int t,
    (SELECT count(*) FROM redirects)::int r, (SELECT count(*) FROM site_files)::int s,
    (SELECT md5(string_agg(route || body || status, '|' ORDER BY route)) FROM pages) h`);
  return r.rows[0];
}
/** Compara <OUT> con el corpus (repo o paquete .ispmax): docs/**.mdx, assets/** y archivos de apoyo, byte a byte. */
const compareToRepo = out => compareTrees(CORPUS.root, out);
const tamper = async (file, fn, { fixSha = false } = {}) => {
  const pkg = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  fn(pkg);
  if (fixSha) pkg.sha256 = createHash('sha256').update(JSON.stringify(pkg.data)).digest('hex');
  return zlib.gzipSync(Buffer.from(JSON.stringify(pkg)));
};
function multipart(parts) {
  const boundary = '----prueba' + Math.random().toString(16).slice(2);
  const chunks = [];
  for (const p of parts) {
    let head = `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"`;
    if (p.filename) head += `; filename="${p.filename}"\r\nContent-Type: application/octet-stream`;
    chunks.push(Buffer.from(head + '\r\n\r\n'), Buffer.isBuffer(p.value) ? p.value : Buffer.from(String(p.value)), Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}
async function req(method, url, { cookie, payload, headers } = {}) {
  const res = await app.inject({ method, url, payload, headers: { ...(cookie ? { cookie } : {}), ...(headers || {}) } });
  let json = null;
  try { json = res.json(); } catch {}
  return { res, status: res.statusCode, json };
}
async function login(username, password) {
  const r = await req('POST', '/api/auth/login', { payload: { username, password } });
  const c = r.res.cookies.find(x => x.name === 'portal_session');
  return c ? `portal_session=${c.value}` : null;
}
async function waitJob(id, cookie) {
  for (let i = 0; i < 600; i++) {
    const j = (await req('GET', `/api/jobs/${id}`, { cookie })).json;
    if (j.status !== 'running') return j;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('el trabajo no terminó');
}

before(async () => {
  safeRm(RUN);
  fs.mkdirSync(PKG, { recursive: true });
  const root = new pg.Client({ connectionString: BASE_URL });
  await root.connect();
  if (!(await root.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME])).rowCount) await root.query(`CREATE DATABASE ${DB_NAME}`);
  await root.end();
  pool = new pg.Pool({ connectionString: URL_ });
  await pool.query(fs.readFileSync(path.join(PORTAL_ROOT, 'db', 'schema.sql'), 'utf8'));
  await resetTestDb(pool);
  app = await buildApp({ databaseUrl: URL_ });
  await app.portal.ensureAdmin();
  admin = await login('admin_prueba', PASS);
  assert.equal((await req('POST', '/api/users', { cookie: admin, payload: { username: 'viewer1', password: 'Clave-larga-1', role: 'viewer' } })).status, 201);
  viewer = await login('viewer1', 'Clave-larga-1');
});
after(async () => {
  await app?.close();
  await pool?.end();
  const root = new pg.Client({ connectionString: BASE_URL });
  await root.connect();
  await root.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
  await root.end();
  safeRm(RUN);
});

test('1. corpus → BD → paquete → vaciar → importar → exportar: 0 diferencias contra el corpus', { skip }, async () => {
  const imp = await importFromRepo({ pool, repoRoot: CORPUS.root, overwrite: 'all', log: quiet });
  const file = path.join(PKG, 'a.ispmax');
  const t0 = Date.now();
  const ex = await exportPackage({ pool, outFile: file, log: quiet });
  const msEx = Date.now() - t0;
  assert.equal(ex.counts.pages, imp.pages);
  assert.equal(ex.counts.assets, imp.assets);
  await wipeContent();
  assert.equal((await fingerprint()).p, 0);
  const t1 = Date.now();
  const r = await importPackage({ pool, source: file, mode: 'replace', log: quiet });
  const msIm = Date.now() - t1;
  assert.equal(r.safety, null, 'BD vacía: sin paquete de seguridad');
  assert.equal(r.counts.pages, ex.counts.pages);
  assert.equal(r.counts.assets, ex.counts.assets);
  await exportToDir({ pool, outDir: OUT, log: quiet });
  const cmp = compareToRepo(OUT);
  console.log(`# paquete ${ex.size} bytes (${msEx} ms exportar, ${msIm} ms importar); ${cmp.total} archivos comparados: ${cmp.pages} páginas, ${cmp.assets} assets, ${cmp.support} de apoyo; ` +
    `${cmp.different.length} distintos, ${cmp.missing.length} faltan, ${cmp.extra.length} sobran`);
  assert.deepEqual([cmp.different, cmp.missing, cmp.extra], [[], [], []]);
  assert.ok(cmp.pages >= 285 && cmp.assets >= 270 && cmp.support === 3);
});

test('2. conserva tour publicado, subsección con padre, redirección, borrador y revisiones', { skip }, async () => {
  await pool.query(
    `INSERT INTO tours (slug, title, description, steps, status) VALUES
       ('zz-tour', 'Tour de prueba', 'd', $1, 'published'), ('zz-borrador', 'Tour en borrador', '', '[]', 'draft')`,
    [JSON.stringify([{ image: 'imgs/x.webp', alt: 'a', title: 't', text: 'x', spot: { x: 1, y: 2, w: 3, h: 4 }, link: null }])],
  );
  const [pa, pb] = (await pool.query(`SELECT id, route FROM pages WHERE seccion='tareas' AND route <> '/tareas' ORDER BY id LIMIT 2`)).rows;
  await pool.query('UPDATE pages SET parent_id = $2 WHERE id = $1', [pb.id, pa.id]);
  await pool.query(
    `INSERT INTO pages (route, file_path, seccion, title, body, status, frontmatter) VALUES ('/tareas/zz-borrador', 'tareas/zz-borrador.mdx', 'tareas', 'Borrador', 'texto', 'draft', '{"title":"Borrador"}')`,
  );
  await pool.query(`INSERT INTO redirects (from_route, to_route) VALUES ('/vieja/ruta', '/tareas/zz-borrador')`);
  await pool.query(`INSERT INTO page_revisions (page_id, version, snapshot) VALUES ($1, 1, '{"route":"x","body":"rev"}')`, [pa.id]);
  await pool.query(`INSERT INTO settings (key, value) VALUES ('structure_groups', '{"tareas":["Vacío"]}'), ('site_title', '"Mi manual"')
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
  const before = await fingerprint();
  const file = path.join(PKG, 'b.ispmax');
  const ex = await exportPackage({ pool, outFile: file, includeRevisions: true, log: quiet });
  assert.equal(ex.counts.drafts, 1);
  assert.equal(ex.counts.tours, (before.t));
  assert.equal(ex.counts.revisions, 1);
  await wipeContent();
  await importPackage({ pool, source: file, mode: 'replace', log: quiet });
  assert.deepEqual(await fingerprint(), before);
  const back = (await pool.query(`SELECT c.route FROM pages c JOIN pages p ON p.id = c.parent_id WHERE p.route = $1`, [pa.route])).rows;
  assert.deepEqual(back.map(x => x.route), [pb.route]);
  assert.equal((await pool.query(`SELECT status FROM pages WHERE route='/tareas/zz-borrador'`)).rows[0].status, 'draft');
  assert.equal((await pool.query(`SELECT to_route FROM redirects WHERE from_route='/vieja/ruta'`)).rows[0].to_route, '/tareas/zz-borrador');
  const t = (await pool.query(`SELECT status, steps FROM tours WHERE slug IN ('zz-tour','zz-borrador') ORDER BY slug`)).rows;
  assert.deepEqual(t.map(x => x.status), ['draft', 'published']);
  assert.deepEqual(t[1].steps[0].spot, { x: 1, y: 2, w: 3, h: 4 });
  assert.equal((await pool.query('SELECT count(*)::int n FROM page_revisions')).rows[0].n, 1);
  assert.deepEqual((await pool.query(`SELECT value FROM settings WHERE key='site_title'`)).rows[0].value, 'Mi manual');
  // el padre sale en la exportación a archivos
  await exportToDir({ pool, outDir: path.join(RUN, 'out2'), log: quiet });
  assert.match(fs.readFileSync(path.join(RUN, 'out2', 'docs', (await pool.query('SELECT file_path FROM pages WHERE route=$1', [pb.route])).rows[0].file_path), 'utf8'), /^padre: /m);
  // sin revisiones por defecto
  const exNo = await exportPackage({ pool, outFile: path.join(PKG, 'b2.ispmax'), log: quiet });
  assert.equal(exNo.counts.revisions, 0);
  assert.equal((await readPackage(path.join(PKG, 'b2.ispmax'))).data.revisions, undefined);
});

test('3. merge no pisa lo existente y solo añade lo que falta', { skip }, async () => {
  const file = path.join(PKG, 'c.ispmax');
  const ex = await exportPackage({ pool, outFile: file, log: quiet });
  await pool.query(`UPDATE pages SET body = 'EDITADO' WHERE route = (SELECT route FROM pages WHERE seccion='tareas' ORDER BY id LIMIT 1)`);
  const gone = (await pool.query(`SELECT route FROM pages WHERE seccion='guia' ORDER BY id LIMIT 1`)).rows[0].route;
  await pool.query('DELETE FROM pages WHERE route = $1', [gone]);
  await pool.query(`DELETE FROM assets WHERE path = (SELECT path FROM assets ORDER BY path LIMIT 1)`);
  const r = await importPackage({ pool, source: file, mode: 'merge', log: quiet });
  assert.equal(r.counts.pages, 1);
  assert.equal(r.counts.assets, 1);
  assert.equal(r.skipped.pages, ex.counts.pages - 1);
  assert.equal(r.safety, null, 'merge no crea paquete de seguridad');
  assert.equal((await pool.query(`SELECT count(*)::int n FROM pages WHERE body = 'EDITADO'`)).rows[0].n, 1);
  assert.equal((await pool.query('SELECT 1 FROM pages WHERE route = $1', [gone])).rowCount, 1);
});

test('4. checksum alterado, versión desconocida, formato ajeno y ruta con ".." se rechazan sin tocar la BD', { skip }, async () => {
  const src = path.join(PKG, 'c.ispmax');
  const before = await fingerprint();
  const cases = {
    checksum: await tamper(src, p => { p.data.pages[0].body += 'x'; }),
    version: await tamper(src, p => { p.version = 99; }),
    formato: await tamper(src, p => { p.format = 'otro'; }),
    'ruta ..': await tamper(src, p => { p.data.pages[0].file_path = '../../fuera.mdx'; }, { fixSha: true }),
    'asset ..': await tamper(src, p => { p.data.assets[0].path = 'imgs/../../x.webp'; }, { fixSha: true }),
    'ajuste de entorno': await tamper(src, p => { p.data.settings.repo_path = 'C:/x'; }, { fixSha: true }),
    'no gzip': Buffer.from('hola'),
  };
  for (const [name, buf] of Object.entries(cases)) {
    for (const mode of ['replace', 'merge']) {
      await assert.rejects(importPackage({ pool, source: buf, mode, log: quiet }), e => e.statusCode === 400, `${name}/${mode}`);
    }
  }
  assert.deepEqual(await fingerprint(), before);
});

test('5. replace no toca usuarios, sesiones, auditoría, trabajos ni ajustes de entorno; y crea paquete de seguridad', { skip }, async () => {
  await pool.query(`INSERT INTO settings (key, value) VALUES ('site_base', '"/manual/"'), ('repo_path', '"C:/x"') ON CONFLICT (key) DO NOTHING`);
  await pool.query(`INSERT INTO audit_log (action) VALUES ('prueba.contenido')`);
  const keep = async () => (await pool.query(`SELECT
    (SELECT count(*)::int FROM users) u, (SELECT count(*)::int FROM sessions) s, (SELECT count(*)::int FROM audit_log) a,
    (SELECT count(*)::int FROM publish_jobs) j, (SELECT count(*)::int FROM backups) b,
    (SELECT string_agg(key || value::text, '|' ORDER BY key) FROM settings WHERE key NOT IN (${CONTENT_SETTINGS.map(k => `'${k}'`).join(',')}, 'sync_state')) e`)).rows[0];
  const before = await keep();
  assert.ok(before.u >= 2 && before.s >= 2);
  const safetyDir = path.join(PKG, 'seguridad');
  const r = await importPackage({ pool, source: path.join(PKG, 'a.ispmax'), mode: 'replace', log: quiet, safetyDir });
  assert.deepEqual(await keep(), before);
  assert.ok(r.safety && fs.existsSync(r.safety.file) && r.safety.file.startsWith(safetyDir));
  assert.equal(r.safety.counts.revisions, 1, 'el paquete de seguridad incluye revisiones');
  assert.equal((await pool.query(`SELECT count(*)::int n FROM pages WHERE status='draft'`)).rows[0].n, 0);
  assert.equal(r.counts.pages, (await fingerprint()).p);
});

test('6. API: resumen, exportar, listar, descargar, borrar e importar con roles y confirmación', { skip }, async () => {
  // roles
  for (const [m, url] of [['POST', '/api/content/export'], ['GET', '/api/content/files/1/download'], ['DELETE', '/api/content/files/1'], ['POST', '/api/content/import']]) {
    assert.equal((await req(m, url, { cookie: viewer })).status, 403, `${m} ${url} viewer`);
    assert.equal((await req(m, url)).status, 401);
  }
  assert.equal((await req('GET', '/api/content/summary', { cookie: viewer })).status, 200);
  const sum = (await req('GET', '/api/content/summary', { cookie: admin })).json;
  assert.equal(sum.counts.pages, (await fingerprint()).p);
  assert.ok(sum.assetsBytes > 1000 && sum.hasContent && sum.lastPackage === null);

  const ex = await req('POST', '/api/content/export', { cookie: admin, payload: { includeRevisions: false } });
  assert.equal(ex.status, 200);
  assert.deepEqual(Object.keys(ex.json).sort(), ['counts', 'filename', 'id', 'sha256', 'size']);
  assert.match(ex.json.filename, /^ispmax-contenido-\d{8}-\d{6}\.ispmax$/);
  const list = (await req('GET', '/api/content/files', { cookie: viewer })).json;
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].sha256, ex.json.sha256);
  assert.equal(list.items[0].exists, true);
  const dl = await app.inject({ method: 'GET', url: `/api/content/files/${ex.json.id}/download`, headers: { cookie: admin } });
  assert.equal(dl.statusCode, 200);
  assert.match(dl.headers['content-disposition'], /attachment; filename="ispmax-contenido-/);
  assert.equal(dl.rawPayload.length, ex.json.size);
  assert.equal((await readPackage(dl.rawPayload)).sha256, ex.json.sha256);
  assert.equal((await req('GET', '/api/content/files/9999/download', { cookie: admin })).status, 404);

  // importar: sin confirmación → 400; paquete inválido → 400; con CARGAR → job
  const mp = (extra = [], buf = dl.rawPayload) => multipart([...extra, { name: 'file', filename: 'x.ispmax', value: buf }]);
  const before = await fingerprint();
  let r = await req('POST', '/api/content/import', { cookie: admin, ...mp([{ name: 'mode', value: 'replace' }]) });
  assert.equal(r.status, 400);
  assert.match(r.json.error, /CARGAR/);
  r = await req('POST', '/api/content/import', { cookie: admin, ...mp([{ name: 'mode', value: 'replace' }, { name: 'confirm', value: 'cargar' }]) });
  assert.equal(r.status, 400);
  r = await req('POST', '/api/content/import', { cookie: admin, ...mp([{ name: 'mode', value: 'replace' }, { name: 'confirm', value: 'CARGAR' }], Buffer.from('basura')) });
  assert.equal(r.status, 400);
  assert.match(r.json.error, /Paquete no válido/);
  r = await req('POST', '/api/content/import', { cookie: admin, ...mp([{ name: 'mode', value: 'otro' }]) });
  assert.equal(r.status, 400);
  r = await req('POST', '/api/content/import', { cookie: admin, payload: {} });
  assert.equal(r.status, 400);
  assert.deepEqual(await fingerprint(), before);

  r = await req('POST', '/api/content/import', { cookie: admin, ...mp([{ name: 'mode', value: 'replace' }, { name: 'confirm', value: 'CARGAR' }]) });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json), ['jobId']);
  const job = await waitJob(r.json.jobId, admin);
  assert.equal(job.status, 'ok', job.log);
  assert.equal(job.kind, 'import');
  assert.match(job.log, /Importado \(replace\)/);
  assert.deepEqual(await fingerprint(), before);
  // el paquete de seguridad quedó registrado como contenido
  const list2 = (await req('GET', '/api/content/files', { cookie: admin })).json;
  assert.equal(list2.items.length, 2);
  assert.equal(list2.items.filter(i => i.reason === 'seguridad antes de importar').length, 1);
  assert.ok((await req('GET', '/api/content/summary', { cookie: admin })).json.lastPackage);
  // los respaldos de BD no ven los de contenido en kind (la tabla es compartida): se anota en el informe
  // borrar
  assert.equal((await req('DELETE', `/api/content/files/${ex.json.id}`, { cookie: admin })).status, 200);
  assert.equal((await req('GET', '/api/content/files', { cookie: admin })).json.items.length, 1);
  assert.equal((await req('DELETE', `/api/content/files/${ex.json.id}`, { cookie: admin })).status, 404);

  // BD vacía: replace no exige confirmación
  await wipeContent();
  r = await req('POST', '/api/content/import', { cookie: admin, ...mp([{ name: 'mode', value: 'replace' }]) });
  assert.equal(r.status, 200);
  assert.equal((await waitJob(r.json.jobId, admin)).status, 'ok');
  assert.deepEqual(await fingerprint(), before);
  // merge sobre contenido completo no exige confirmación y no cambia nada
  r = await req('POST', '/api/content/import', { cookie: admin, ...mp([{ name: 'mode', value: 'merge' }]) });
  assert.equal(r.status, 200);
  const j = await waitJob(r.json.jobId, admin);
  assert.equal(j.status, 'ok');
  assert.deepEqual(await fingerprint(), before);
});
