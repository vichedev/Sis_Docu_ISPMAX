// Ruta de administración oculta (Adenda 5): el panel y la API solo en ${P}/ y ${P}/api/*; todo lo demás que suene a
// panel recibe EXACTAMENTE el 404 de cualquier ruta inexistente; sin fugas de la ruta en el sitio público; bloqueo
// por sondeos; validación y colisión de PORTAL_ADMIN_PATH. La ruta de prueba es un centinela, nunca la real.
// Contra TEST_DATABASE_URL (destructiva). Uso: node --test --test-concurrency=1 test/hidden-admin.test.mjs
import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';

loadEnv();
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('Falta TEST_DATABASE_URL');
if (TEST_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
process.env.DATABASE_URL = TEST_URL;
process.env.PORTAL_ADMIN_USER = 'admin_oculto';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
// Se ejecuta en los dos modos: estático aquí y dinámico desde hidden-admin.dynamic.test.mjs.
const DYNAMIC = process.env.PORTAL_TEST_RENDER_MODE === 'dynamic';
process.env.PORTAL_RENDER_MODE = DYNAMIC ? 'dynamic' : 'static';
const RUN = path.join(PORTAL_ROOT, 'work-test', 'hidden-admin-test');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = path.join(RUN, 'data');
const SITE = path.join(RUN, 'data', 'site');
const WEB = path.join(RUN, 'web');
const P = '/zz-secreto-test';

const { buildApp } = await import('../server/index.mjs');
const { parseIpAllowList } = await import('../server/config.mjs');
const pg = (await import('pg')).default;

let pool;
const apps = [];
let app;
function write(root, rel, content) {
  const p = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
async function mk(config = {}) {
  const a = await buildApp({
    databaseUrl: TEST_URL,
    watchSite: false,
    config: { webDist: WEB, trustProxy: true, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), adminPath: P, hideAdmin: true, probeThreshold: 1000, ...config },
  });
  apps.push(a);
  return a;
}
const get = (a, url, headers = {}) => a.inject({ method: 'GET', url, headers: { 'x-forwarded-for': '198.51.100.7', ...headers } });
const IGNORE = new Set(['date', 'etag', 'last-modified', 'connection', 'keep-alive']);
const headersOf = (r) => Object.fromEntries(Object.entries(r.headers).filter(([k]) => !IGNORE.has(k)));
function sameAsRandom404(r, ref, label) {
  assert.equal(r.statusCode, ref.statusCode, `${label}: código`);
  assert.equal(r.body, ref.body, `${label}: cuerpo`);
  assert.deepEqual(headersOf(r), headersOf(ref), `${label}: cabeceras`);
}

before(async () => {
  safeRm(RUN);
  const site = {
    'index.html': '<!doctype html><html><head><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/static/css/main.abc12345.css"><script src="/static/js/main.abc12345.js"></script></head><body><a href="/guia/inicio">Guía</a><a href="/tareas/x">Tarea</a><img src="/assets/imgs/a/01-x.webp"></body></html>',
    'guia/inicio.html': '<!doctype html><title>Guía</title><a href="/">Inicio</a><script src="/static/js/page.abc12345.js"></script>',
    'tareas/x.html': '<!doctype html><title>Tarea</title><p>Texto</p>',
    '404.html': '<!doctype html><title>404</title><p>Esta página no existe</p>',
    'static/js/main.abc12345.js': 'console.log("manual")',
    'static/js/page.abc12345.js': 'fetch("/assets/tours/demo.json")',
    'static/css/main.abc12345.css': 'body{color:#333}',
    'manifest.webmanifest': '{"name":"Manual","start_url":"/"}',
    'assets/tours/demo.json': '{"slug":"demo"}',
    'assets/imgs/a/01-x.webp': 'RIFF0000WEBP',
  };
  for (const [k, v] of Object.entries(site)) write(SITE, k, v);
  fs.writeFileSync(path.join(RUN, 'data', 'site-meta.json'), JSON.stringify({ base: '/', pages: 3 }));
  // Panel compilado con base './' (contrato con la interfaz): el servidor inyecta <base href="${P}/">.
  write(WEB, 'index.html', '<!doctype html><html><head><meta charset="utf-8"><script>document.documentElement.dataset.theme="light"</script></head><body><div id="root"></div><script type="module" src="./assets/index-Zz123456.js"></script></body></html>');
  write(WEB, 'assets/index-Zz123456.js', 'console.log("panel")');
  pool = new pg.Pool({ connectionString: TEST_URL });
  await resetTestDb(pool);
  await pool.query(
    "INSERT INTO pages (route, file_path, seccion, title, status) VALUES ('/guia/inicio','guia/inicio.mdx','guia','Guía','published'), ('/tareas/x','tareas/x.mdx','tareas','Tarea','published')"
  );
  if (DYNAMIC) {
    // Manual dinámico: el sitio sale de la BD (con el tema compilado), no de los archivos de arriba.
    (await import('./helpers/theme.mjs')).ensureTheme();
    await pool.query("INSERT INTO pages (route, file_path, seccion, title, status, body, frontmatter) VALUES ('/', 'index.mdx', 'raiz', 'Inicio', 'published', '# Inicio\n\n[Guía](/guia/inicio) · [Tarea](/tareas/x)', '{\"title\":\"Inicio\"}')");
    await pool.query("UPDATE pages SET body = '# Texto\n\nContenido.', frontmatter = jsonb_build_object('title', title) WHERE route IN ('/guia/inicio', '/tareas/x')");
  }
  app = await mk();
  await app.portal.ensureAdmin();
});
after(async () => {
  for (const a of apps) await a.close().catch(() => {});
  await pool?.end();
  safeRm(RUN);
});

test('modo oculto: /api/*, /admin*, variantes y rutas típicas dan EXACTAMENTE el 404 de una ruta inexistente', async () => {
  const ref = await get(app, '/una-ruta-que-no-existe-7f3a');
  assert.equal(ref.statusCode, 404);
  assert.match(ref.body, DYNAMIC ? /No encontramos esta página del manual/ : /Esta página no existe/);
  for (const u of ['/api/auth/me', '/api/stats', '/api/auth/login', '/api', '/api/', '/admin', '/admin/', '/admin/assets/index-Zz123456.js', '/API/stats', '/%61pi/auth/me', '//api/stats', '/%61dmin/', '/Admin', '/login', '/wp-admin/', '/administrator/', '/zz-secreto-tes', '/zz-secreto-testx/']) {
    sameAsRandom404(await get(app, u), ref, u);
  }
  // otros métodos: igual que en una ruta inexistente
  const refPost = await app.inject({ method: 'POST', url: '/otra-ruta-inexistente', payload: { a: 1 } });
  for (const u of ['/api/auth/login', '/api/users', '/admin/']) {
    sameAsRandom404(await app.inject({ method: 'POST', url: u, payload: { username: 'admin_oculto', password: 'Clave-de-prueba-1' } }), refPost, `POST ${u}`);
  }
  sameAsRandom404(await app.inject({ method: 'HEAD', url: '/api/stats' }), await app.inject({ method: 'HEAD', url: '/otra-mas' }), 'HEAD');
  sameAsRandom404(await app.inject({ method: 'OPTIONS', url: '/api/stats' }), await app.inject({ method: 'OPTIONS', url: '/otra-mas' }), 'OPTIONS');
});

test('por la ruta real: ${P} → 301 ${P}/; SPA con <base>, cabeceras de panel; API en ${P}/api/* (401 sin sesión, login y datos con sesión)', async () => {
  const r301 = await get(app, P);
  assert.equal(r301.statusCode, 301);
  assert.equal(r301.headers.location, `${P}/`);
  const spa = await get(app, `${P}/`);
  assert.equal(spa.statusCode, 200);
  assert.match(spa.body, new RegExp(`<base href="${P}/">`));
  assert.equal(spa.headers['cache-control'], 'no-store');
  assert.equal(spa.headers['x-robots-tag'], 'noindex, nofollow, noarchive');
  assert.equal(spa.headers['referrer-policy'], 'no-referrer');
  assert.match(spa.headers['content-security-policy'], /script-src 'self' 'sha256-/);
  assert.equal((await get(app, `${P}/paginas/12`)).statusCode, 200, 'rutas de la SPA');
  const js = await get(app, `${P}/assets/index-Zz123456.js`);
  assert.equal(js.statusCode, 200);
  assert.equal(js.headers['cache-control'], 'no-store');
  const me = await get(app, `${P}/api/auth/me`);
  assert.equal(me.statusCode, 401);
  assert.equal(me.headers['x-robots-tag'], 'noindex, nofollow, noarchive');
  const login = await app.inject({ method: 'POST', url: `${P}/api/auth/login`, headers: { 'x-forwarded-for': '198.51.100.7', origin: 'http://localhost:80' }, payload: { username: 'admin_oculto', password: 'Clave-de-prueba-1' } });
  assert.equal(login.statusCode, 200, login.body);
  const c = login.cookies[0];
  assert.equal(c.path, '/');
  const cookie = `${c.name}=${c.value}`;
  assert.equal((await get(app, `${P}/api/stats`, { cookie })).statusCode, 200);
  assert.equal((await get(app, `${P}/api/auth/me`, { cookie })).json().user.username, 'admin_oculto');
  // con sesión, /api directo sigue siendo el 404 genérico
  sameAsRandom404(await get(app, '/api/stats', { cookie }), await get(app, '/no-existe-zz', { cookie }), '/api directo con sesión');
  // la ruta no se repite en errores
  assert.ok(!me.body.includes(P));
});

test('IP no permitida, panel deshabilitado y bloqueo por sondeos → el 404 genérico (no 403/503); el manual sigue', async () => {
  const ref = await get(app, '/ruta-inexistente-abc');
  const lim = await mk({ adminIps: parseIpAllowList('192.0.2.0/24') });
  for (const u of [`${P}/`, `${P}/api/auth/me`, P]) sameAsRandom404(await get(lim, u, { 'x-forwarded-for': '203.0.113.9' }), await get(lim, '/ruta-inexistente-abc', { 'x-forwarded-for': '203.0.113.9' }), `IP no permitida ${u}`);
  assert.equal((await get(lim, `${P}/`, { 'x-forwarded-for': '192.0.2.10' })).statusCode, 200, 'IP permitida entra');
  const off = await mk({ adminEnabled: false });
  sameAsRandom404(await get(off, `${P}/api/auth/me`), ref, 'deshabilitado');
  sameAsRandom404(await get(off, `${P}/`), ref, 'deshabilitado (panel)');
  // sondeos: 5 accesos a rutas típicas → esa IP no llega al panel ni a la API durante 30 min
  const pr = await mk({ probeThreshold: 5 });
  const bad = { 'x-forwarded-for': '203.0.113.66' };
  for (const u of ['/wp-login.php', '/.env', '/admin/', '/api/stats', '/phpmyadmin/']) await get(pr, u, bad);
  sameAsRandom404(await get(pr, `${P}/api/auth/me`, bad), await get(pr, '/ruta-inexistente-abc', bad), 'IP bloqueada por sondeos (API)');
  sameAsRandom404(await get(pr, `${P}/`, bad), await get(pr, '/ruta-inexistente-abc', bad), 'IP bloqueada por sondeos (panel)');
  assert.equal((await get(pr, '/guia/inicio', bad)).statusCode, 200, 'el manual público no se bloquea');
  assert.equal((await get(pr, `${P}/api/auth/me`, { 'x-forwarded-for': '203.0.113.67' })).statusCode, 401, 'otra IP no');
  const audit = (await pool.query("SELECT target, detail FROM audit_log WHERE action = 'security.probe'")).rows;
  assert.equal(audit.length, 1, 'una sola entrada por bloqueo');
  assert.equal(audit[0].target, '203.0.113.66');
  assert.ok(!JSON.stringify(audit).includes(P));
});

test('robots.txt y sitemap.xml no nombran el panel ni la API', async () => {
  const robots = await get(app, '/robots.txt');
  assert.equal(robots.statusCode, 200);
  assert.doesNotMatch(robots.body, /admin|\/api|zz-secreto/i);
  assert.match(robots.body, /^Sitemap: /m);
  const sm = await get(app, '/sitemap.xml');
  assert.match(sm.body, /\/guia\/inicio/);
  assert.doesNotMatch(sm.body, /admin|\/api|zz-secreto/i);
});

test('rastreo de descubribilidad: el sitio público (HTML, JS, CSS, JSON, manifiesto, cabeceras, robots, sitemap, 404, salud) no contiene la ruta ni "/api/"', async () => {
  const seen = new Set();
  const queue = ['/', '/robots.txt', '/sitemap.xml', '/healthz', '/no-existe-para-404', '/manifest.webmanifest'];
  const hits = [];
  while (queue.length && seen.size < 200) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const r = await get(app, u);
    const text = r.rawPayload.toString('utf8');
    const hdrs = JSON.stringify(r.headers);
    for (const needle of [P, P.slice(1), '/api/']) {
      if (text.includes(needle)) hits.push(`${u} (cuerpo): ${needle}`);
      if (hdrs.includes(needle)) hits.push(`${u} (cabeceras): ${needle}`);
    }
    for (const m of text.matchAll(/(?:href|src)="([^"#?]+)"|<loc>https?:\/\/[^/]+([^<]*)<\/loc>|fetch\("([^"]+)"\)|"start_url":"([^"]+)"/g)) {
      const next = m[1] || m[2] || m[3] || m[4];
      if (next && next.startsWith('/') && !seen.has(next)) queue.push(next);
    }
  }
  assert.ok(seen.size >= 10, `recorridas ${seen.size} URL`);
  assert.deepEqual(hits, []);
  if (DYNAMIC) {
    // además del HTML: los datos del sitio, los módulos de página y el índice del buscador
    const html = (await get(app, '/guia/inicio')).body;
    const extra = ['/_site/search.json', '/_site/p/guia/inicio.js', /src="(\/_site\/boot\.[\w-]+\.js)"/.exec(html)[1]];
    for (const u of extra) {
      const r = await get(app, u);
      assert.equal(r.statusCode, 200, u);
      for (const needle of [P, P.slice(1), '/api/']) assert.ok(!r.rawPayload.toString('utf8').includes(needle), `${u}: ${needle}`);
    }
    console.log(`# rastreo dinámico: ${seen.size + extra.length} URL, 0 apariciones de la ruta del panel`);
  }
  // sin sitio todavía: la página «se está preparando» no enlaza al panel
  const empty = await mk();
  if (DYNAMIC) await pool.query("UPDATE pages SET status = 'draft' WHERE status = 'published'");
  else safeRm(SITE);
  empty.portal.ctx.frontend.refresh();
  empty.portal.ctx.siteRuntime?.engine?.invalidate({});
  const prep = await get(empty, '/');
  assert.equal(prep.statusCode, 503);
  assert.doesNotMatch(prep.body, /admin|zz-secreto|\/api\//i);
  if (DYNAMIC) {
    await pool.query("UPDATE pages SET status = 'published'");
    for (const a of apps) {
      a.portal.ctx.frontend.refresh();
      a.portal.ctx.siteRuntime?.engine?.invalidate({});
    }
  }
});

test('PORTAL_ADMIN_PATH: valores no válidos y colisión con una página publicada impiden arrancar', async () => {
  await assert.rejects(() => mk({ adminPath: '/api' }), /PORTAL_ADMIN_PATH/);
  await assert.rejects(() => mk({ adminPath: '/a/b' }), /PORTAL_ADMIN_PATH/);
  await assert.rejects(() => mk({ adminPath: '/guia' }), /PORTAL_ADMIN_PATH/);
  await pool.query("INSERT INTO pages (route, file_path, seccion, title, status) VALUES ('/zz-colision','zz-colision.mdx','raiz','Colisión','published')");
  await assert.rejects(() => mk({ adminPath: '/zz-colision' }), /coincide con el comienzo de una página/);
  const ok = await mk({ adminPath: '/zz-otra-ruta' });
  assert.equal((await get(ok, '/zz-otra-ruta/api/auth/me')).statusCode, 401);
});

test('modo por defecto (/admin): sigue funcionando; además el panel puede usar /admin/api/*', async () => {
  const def = await mk({ adminPath: '/admin', hideAdmin: false });
  assert.equal((await get(def, '/api/auth/me')).statusCode, 401);
  assert.equal((await get(def, '/admin/api/auth/me')).statusCode, 401);
  const spa = await get(def, '/admin/');
  assert.equal(spa.statusCode, 200);
  assert.match(spa.body, /<base href="\/admin\/">/);
  assert.match((await get(def, '/robots.txt')).body, /Disallow: \/admin\//);
});
