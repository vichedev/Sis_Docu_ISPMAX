// Auditoría de endpoints (Adenda 5): enumera TODAS las rutas registradas (hook onRoute, incluidas las de sync, ops,
// content, seo y frontend) y comprueba que ninguna da datos sin sesión ni a un rol inferior, con trucos de ruta,
// métodos alternativos, CORS, cabeceras X-Forwarded-* falsas, archivos sensibles, errores sin trazas y límites.
// Contra TEST_DATABASE_URL (destructiva). Uso: node --test --test-concurrency=1 test/security.test.mjs
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
process.env.PORTAL_ADMIN_USER = 'admin_seg';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
// Se ejecuta en los dos modos: estático aquí y dinámico desde security.dynamic.test.mjs.
const DYNAMIC = process.env.PORTAL_TEST_RENDER_MODE === 'dynamic';
process.env.PORTAL_RENDER_MODE = DYNAMIC ? 'dynamic' : 'static';
process.env.PORTAL_ALLOW_INTERNAL_SETTINGS = '1';
const RUN = path.join(PORTAL_ROOT, 'work-test', 'security-test');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = path.join(RUN, 'data');
const SITE = path.join(RUN, 'data', 'site');
const WEB = path.join(RUN, 'web');

const { buildApp } = await import('../server/index.mjs');
const { parseIpAllowList } = await import('../server/config.mjs');
const pg = (await import('pg')).default;

// Matriz esperada (derivada del código y revisada a mano). Vive en scripts/security-scan.mjs para que el barrido en
// producción use la misma. Una ruta nueva sin entrada en ella hace fallar esta prueba.
const { ROUTE_MATRIX: EXPECTED } = await import('../scripts/security-scan.mjs');
const RANK = { viewer: 1, editor: 2, admin: 3 };
const PUBLIC_API = new Set(['/api/auth/login', '/api/auth/login/2fa']);

const routes = []; // { method, url, role }
let app;
let pool;
const cookies = {};
const apps = [];

function write(root, rel, content) {
  const p = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
async function mk(config = {}, extra = {}) {
  const a = await buildApp({ databaseUrl: TEST_URL, watchSite: false, config: { webDist: WEB, trustProxy: false, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), probeThreshold: 100000, ...config }, ...extra });
  apps.push(a);
  return a;
}
const fill = (url) => url.replace(/:[A-Za-z]+/g, '1').replace('/*', '/x');
async function req(method, url, { cookie, payload, headers = {} } = {}, a = app) {
  const res = await a.inject({ method, url, payload, headers: { ...(cookie ? { cookie } : {}), ...headers } });
  return res;
}
const looksLikeData = (res) => /application\/json/.test(res.headers['content-type'] || '') && res.body.length > 0 && !/^\{"error"/.test(res.body);

before(async () => {
  safeRm(RUN);
  write(SITE, 'index.html', '<!doctype html><title>Inicio</title><p>Portada</p>');
  write(SITE, '404.html', '<!doctype html><title>404</title><p>No existe</p>');
  write(SITE, '.env', 'DATABASE_URL=postgres://u:secreto@db/x');
  write(SITE, '.git/config', '[core]');
  write(SITE, 'index.html.bak', 'copia vieja');
  write(SITE, 'volcado.sql', 'CREATE TABLE secreto();');
  write(SITE, 'guia/inicio.html~', 'copia del editor');
  fs.writeFileSync(path.join(RUN, 'data', 'site-meta.json'), JSON.stringify({ base: '/', pages: 1 }));
  write(WEB, 'index.html', '<!doctype html><html><head><script>document.documentElement.dataset.theme="light"</script></head><body><script type="module" src="./assets/index-AbC12345.js"></script></body></html>');
  write(WEB, 'assets/index-AbC12345.js', 'console.log(1)');
  pool = new pg.Pool({ connectionString: TEST_URL });
  await resetTestDb(pool);
  if (DYNAMIC) {
    (await import('./helpers/theme.mjs')).ensureTheme();
    await pool.query(`INSERT INTO pages (route, file_path, seccion, title, status, body, frontmatter) VALUES
      ('/', 'index.mdx', 'raiz', 'Inicio', 'published', '# Inicio\n\nPortada', '{"title":"Inicio"}'),
      ('/guia/inicio', 'guia/inicio.mdx', 'guia', 'Guía', 'published', '# Guía\n\nTexto', '{"title":"Guía"}')`);
  }
  app = await mk({}, {
    onRoute: (r) => {
      const role = [].concat(r.preHandler || []).map((f) => f.minRole).find(Boolean);
      for (const m of [].concat(r.method)) if (m !== 'HEAD') routes.push({ method: m, url: r.url, role: role || (r.url.startsWith('/api/') ? (PUBLIC_API.has(r.url) ? 'public' : 'session') : 'public') });
    },
  });
  await app.portal.ensureAdmin();
  const login = async (u, p) => {
    const r = await req('POST', '/api/auth/login', { payload: { username: u, password: p } });
    assert.equal(r.statusCode, 200, `${u}: ${r.body}`);
    const c = r.cookies.find((x) => x.name === 'portal_session');
    return `portal_session=${c.value}`;
  };
  cookies.admin = await login('admin_seg', 'Clave-de-prueba-1');
  for (const role of ['viewer', 'editor']) {
    const r = await req('POST', '/api/users', { cookie: cookies.admin, payload: { username: `${role}_seg`, password: 'Clave-Segura-2026', role } });
    assert.equal(r.statusCode, 201, r.body);
    cookies[role] = await login(`${role}_seg`, 'Clave-Segura-2026');
  }
});
after(async () => {
  for (const a of apps) await a.close().catch(() => {});
  await pool?.end();
  safeRm(RUN);
});

test('enumeración: todas las rutas registradas están en la matriz de roles esperada (y al revés)', () => {
  const got = Object.fromEntries(routes.map((r) => [`${r.method} ${r.url}`, r.role]));
  const missing = Object.keys(EXPECTED).filter((k) => !(k in got));
  const unexpected = Object.keys(got).filter((k) => !(k in EXPECTED));
  assert.deepEqual(unexpected, [], 'rutas nuevas sin revisar: añádalas a EXPECTED con su rol');
  assert.deepEqual(missing, [], 'rutas esperadas que ya no existen');
  for (const [k, role] of Object.entries(EXPECTED)) assert.equal(got[k], role, k);
  assert.ok(routes.length >= 80, `rutas: ${routes.length}`);
});

test('sin sesión: ninguna ruta /api (todos los métodos) da 2xx ni datos, salvo la lista blanca', async () => {
  const urls = [...new Set(routes.filter((r) => r.url.startsWith('/api/')).map((r) => r.url))];
  let n = 0;
  for (const url of urls) {
    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
      const res = await req(method, fill(url), { payload: method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ? undefined : {} });
      n++;
      if (PUBLIC_API.has(url) && method === 'POST') {
        assert.ok([400, 401].includes(res.statusCode), `${method} ${url}: ${res.statusCode}`);
        continue;
      }
      assert.ok([401, 403, 404, 405].includes(res.statusCode), `${method} ${url} → ${res.statusCode}`);
      assert.ok(!looksLikeData(res), `${method} ${url} devolvió datos`);
      assert.equal(res.headers['access-control-allow-origin'], undefined);
    }
  }
  assert.ok(n > 300, `peticiones: ${n}`);
});

test('roles: viewer → 403 en rutas de editor/admin; editor → 403 en rutas de admin (con parámetros ficticios)', async () => {
  for (const [who, below] of [['viewer', ['editor', 'admin']], ['editor', ['admin']]]) {
    for (const r of routes.filter((x) => below.includes(x.role))) {
      const res = await req(r.method, fill(r.url), { cookie: cookies[who], payload: r.method === 'GET' ? undefined : {} });
      assert.equal(res.statusCode, 403, `${who}: ${r.method} ${r.url} → ${res.statusCode}`);
    }
  }
  // y lo permitido sí funciona (lectura de viewer)
  assert.equal((await req('GET', '/api/stats', { cookie: cookies.viewer })).statusCode, 200);
  assert.ok(RANK.admin > RANK.viewer);
});

test('trucos de ruta: mayúsculas, //, /./, %2f, %61pi, doble codificación, ;, barra final, .., NUL → nunca datos', async () => {
  const tricks = [
    '/API/stats', '/Api/users', '//api/stats', '///api/users', '/./api/stats', '/api/./stats', '/api//stats', '/api%2fstats', '/api%2Fusers',
    '/%61pi/stats', '/%61pi/users', '/%2561pi/stats', '/api/%2e%2e/api/stats', '/x/../api/stats', '/api/stats;x', '/api;/stats', '/api/stats/',
    '/api/users/', '/api/stats%00', '/api/stats%23', '/api/stats?x=1#y', '/admin/../api/stats', '/api/users/..%2fstats', '/%2e/api/stats',
    '/api/\u0000stats', '/api/stats%20', '/api/auth/../users',
  ];
  for (const t of tricks) {
    for (const who of [null, 'viewer']) {
      let res;
      try {
        res = await req('GET', t, { cookie: who ? cookies[who] : undefined });
      } catch {
        continue; // URL que el propio cliente rechaza
      }
      const users = /users/i.test(t);
      // El viewer puede leer /api/stats: una variante que el cliente normaliza (p. ej. /./api/stats) es su lectura legítima.
      if (who === 'viewer' && !users && res.statusCode === 200) continue;
      assert.ok([400, 401, 403, 404].includes(res.statusCode) || (res.statusCode === 200 && !looksLikeData(res)), `${who || 'anónimo'} ${t} → ${res.statusCode}`);
      if (users) assert.ok(!looksLikeData(res), `${t} no da la lista de usuarios`);
    }
  }
});

test('HEAD, OPTIONS y override de método no saltan la sesión ni el rol; CORS sin Access-Control-Allow-Origin', async () => {
  assert.equal((await req('HEAD', '/api/users')).statusCode, 401);
  assert.equal((await req('HEAD', '/api/users', { cookie: cookies.viewer })).statusCode, 403);
  for (const h of ['x-http-method-override', 'x-http-method', 'x-method-override']) {
    const r = await req('POST', '/api/stats', { cookie: cookies.viewer, headers: { [h]: 'GET' }, payload: {} });
    assert.equal(r.statusCode, 404, h);
    const d = await req('GET', '/api/users', { cookie: cookies.editor, headers: { [h]: 'DELETE' } });
    assert.equal(d.statusCode, 403, h);
  }
  const pre = await req('OPTIONS', '/api/auth/me', { headers: { origin: 'https://atacante.invalid', 'access-control-request-method': 'GET', 'access-control-request-headers': 'content-type' } });
  assert.ok([401, 404].includes(pre.statusCode));
  const r = await req('GET', '/api/auth/me', { cookie: cookies.admin, headers: { origin: 'https://atacante.invalid' } });
  assert.equal(r.statusCode, 200);
  for (const res of [pre, r]) {
    assert.equal(res.headers['access-control-allow-origin'], undefined);
    assert.equal(res.headers['access-control-allow-credentials'], undefined);
  }
});

test('X-Forwarded-* falsas sin proxy de confianza: no cambian la IP (lista de IPs), el host (Origin) ni el protocolo (cookie)', async () => {
  const lim = await mk({ adminIps: parseIpAllowList('192.0.2.0/24') });
  assert.equal((await req('GET', '/api/auth/me', { headers: { 'x-forwarded-for': '192.0.2.5', 'x-real-ip': '192.0.2.5' } }, lim)).statusCode, 403);
  const fwd = { 'x-forwarded-host': 'atacante.invalid', 'x-forwarded-proto': 'https', origin: 'https://atacante.invalid' };
  assert.equal((await req('POST', '/api/auth/login', { headers: fwd, payload: { username: 'admin_seg', password: 'Clave-de-prueba-1' } })).statusCode, 403);
  const ok = await req('POST', '/api/auth/login', { headers: { 'x-forwarded-proto': 'https' }, payload: { username: 'admin_seg', password: 'Clave-de-prueba-1' } });
  const c = ok.cookies[0];
  assert.equal(c.name, 'portal_session');
  assert.ok(!c.secure);
});

test('archivos sensibles: .env, .git, data/, work/, node_modules/, server/, schema.sql, package.json, copias .bak/~ y claves no se sirven', async () => {
  const paths = [
    '/.env', '/portal/.env', '/.env.bak', '/.env.docker.example', '/.git/config', '/.git/HEAD', '/data/', '/data/secret.key', '/portal/data/secret.key',
    '/work/', '/portal/work/', '/node_modules/', '/node_modules/fastify/package.json', '/server/', '/server/index.mjs', '/portal/server/auth.mjs',
    '/db/schema.sql', '/portal/db/schema.sql', '/package.json', '/portal/package.json', '/index.html.bak', '/volcado.sql', '/guia/inicio.html~',
    '/admin/.env', '/admin/../.env', '/admin/../../package.json', '/static/../../.env', '/%2e%2e/%2e%2e/.env', '/..%2f..%2f.env', '/%252e%252e/.env',
    '/secret.key', '/backups/', '/data/backups/', '/install-docker.log', '/docker-compose.yml', '/admin/assets/../../server/auth.mjs', '/admin/index.html.bak',
  ];
  for (const p of paths) {
    const res = await req('GET', p);
    assert.ok([400, 404].includes(res.statusCode), `${p} → ${res.statusCode}`);
    assert.doesNotMatch(res.body, /DATABASE_URL|secreto|CREATE TABLE|"dependencies"|copia vieja|copia del editor|\[core\]|BEGIN .*PRIVATE KEY/, p);
  }
});

test('errores sin trazas ni rutas internas: JSON inválido, ids raros, 404 y un 500 forzado', async () => {
  const bad = [
    await req('POST', '/api/pages', { cookie: cookies.admin, headers: { 'content-type': 'application/json' }, payload: '{mal' }),
    await req('GET', '/api/pages/abc', { cookie: cookies.admin }),
    await req('GET', '/api/pages/99999999999999999999', { cookie: cookies.admin }),
    await req('GET', '/api/no-existe', { cookie: cookies.admin }),
    await req('POST', '/api/pages', { cookie: cookies.admin, headers: { 'content-type': 'text/xml' }, payload: '<x/>' }),
  ];
  const db = app.portal.ctx.db;
  const orig = db.query;
  db.query = () => Promise.reject(Object.assign(new Error('relation "x" en C:\\Users\\secreto\\portal\\server\\db.mjs'), { stack: 'Error\n    at C:\\Users\\secreto\\portal\\server\\db.mjs:1:1' }));
  try {
    bad.push(await req('GET', '/api/stats', { cookie: cookies.admin }));
  } catch {}
  db.query = orig;
  for (const r of bad) {
    assert.ok(r.statusCode >= 400, String(r.statusCode));
    assert.doesNotMatch(r.body, /\bat .+:\d+:\d+|node_modules|[A-Z]:\\|\/portal\/server|secreto|relation|stack/i, r.body);
  }
  assert.deepEqual(JSON.parse(bad.at(-1).body), { error: 'Error interno del servidor.' });
});

test('sin fugas en /healthz, /api/system/info, robots.txt y sitemap.xml', async () => {
  const h = await req('GET', '/healthz');
  assert.deepEqual(Object.keys(h.json()).sort(), ['db', 'ok', 'site']);
  assert.equal((await req('GET', '/api/system/info')).statusCode, 401);
  assert.equal((await req('GET', '/api/system/info', { cookie: cookies.editor })).statusCode, 403);
  const info = await req('GET', '/api/system/info', { cookie: cookies.admin });
  const url = new URL(TEST_URL);
  for (const s of [url.password, 'postgres://', PORTAL_ROOT, 'secret.key', 'PORTAL_SECRET_KEY']) if (s) assert.ok(!info.body.includes(s), s.slice(0, 5));
  const robots = await req('GET', '/robots.txt');
  assert.doesNotMatch(robots.body, /secret|password|\.env/i);
  const sm = await req('GET', '/sitemap.xml');
  assert.doesNotMatch(sm.body, /\/admin|\/api/);
});

test('cabeceras del panel y la API: no-store, nosniff, no-referrer, DENY, CSP con frame-ancestors none, noindex', async () => {
  for (const [url, cookie] of [['/api/auth/me', cookies.admin], ['/api/stats', undefined], ['/admin/', undefined], ['/admin/assets/index-AbC12345.js', undefined]]) {
    const r = await req('GET', url, { cookie });
    assert.equal(r.headers['cache-control'], 'no-store', url);
    assert.equal(r.headers['x-content-type-options'], 'nosniff', url);
    assert.equal(r.headers['referrer-policy'], 'no-referrer', url);
    assert.equal(r.headers['x-frame-options'], 'DENY', url);
    assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/, url);
    assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow, noarchive', url);
  }
  const panel = await req('GET', '/admin/');
  assert.match(panel.headers['content-security-policy'], /^default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-[A-Za-z0-9+/=]+'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'$/);
  const api = await req('GET', '/api/auth/me', { cookie: cookies.admin });
  assert.match(api.headers['content-security-policy'], /default-src 'none'/);
  // el manual público conserva su CSP y frame-ancestors 'self'
  const site = await req('GET', '/');
  assert.match(site.headers['content-security-policy'], /frame-ancestors 'self'/);
  assert.equal(site.headers['x-frame-options'], 'SAMEORIGIN');
});

test('enumeración de usuarios por mensaje: el mismo cuerpo para usuario inexistente y contraseña mala', async () => {
  const a = await req('POST', '/api/auth/login', { payload: { username: 'no_existe_seg', password: 'Algo-Largo-123' }, headers: {} });
  const b = await req('POST', '/api/auth/login', { payload: { username: 'admin_seg', password: 'Algo-Largo-123' } });
  assert.equal(a.statusCode, 401);
  assert.equal(a.body, b.body);
  await pool.query('TRUNCATE login_attempts, login_locks');
});

test('límites: cuerpo > 5 MB → 413; login > 16 KB → 413; el contenido publicado no admite código (escalada editor → admin)', async () => {
  const big = await req('PUT', '/api/pages/1', { cookie: cookies.editor, headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ body: 'x'.repeat(5.5 * 1024 * 1024) }) });
  assert.equal(big.statusCode, 413);
  assert.equal((await req('POST', '/api/auth/login', { payload: { username: 'a', password: 'b'.repeat(17 * 1024) } })).statusCode, 413);
  const p = await req('POST', '/api/pages', { cookie: cookies.editor, payload: { seccion: 'guia', slug: 'xss-prueba', title: 'XSS', tipo: 'guia' } });
  assert.equal(p.statusCode, 201, p.body);
  const page = p.json();
  const evil = "export const robo = fetch('/api/users', { method: 'POST', body: '{}' })\n\nTexto";
  const draft = await req('PUT', `/api/pages/${page.id}`, { cookie: cookies.editor, payload: { version: page.version, body: evil } });
  assert.equal(draft.statusCode, 200, 'un borrador se puede guardar (no se ejecuta en ningún sitio)');
  const pub = await req('POST', `/api/pages/${page.id}/publish`, { cookie: cookies.editor, payload: { force: true } });
  assert.equal(pub.statusCode, 400, 'publicar con código: rechazado incluso con force');
  assert.match(pub.json().error, /no está permitido/);
  const v = draft.json().version;
  for (const body of ['<img src="x" onError={() => alert(1)} />', '<a href="javascript:alert(1)">x</a>', 'Hola {fetch("/api/users")}']) {
    const r = await req('PUT', `/api/pages/${page.id}`, { cookie: cookies.editor, payload: { version: v, body, status: 'published' } });
    assert.equal(r.statusCode, 400, body);
  }
  const val = await req('POST', '/api/pages/validate', { cookie: cookies.viewer, payload: { body: evil, frontmatter: { title: 'x' } } });
  assert.equal(val.json().ok, false);
  const menu = await req('PUT', '/api/structure/guia-sidebar', { cookie: cookies.editor, payload: { data: [{ items: [{ text: 'x', link: 'javascript:alert(1)' }] }] } });
  assert.equal(menu.statusCode, 400);
});

test('manual dinámico: rutas públicas propias (/_site/*, /assets/*) sin trucos de ruta, sin datos internos y con las cabeceras del manual', { skip: !DYNAMIC && 'solo en modo dinámico' }, async () => {
  const html = (await req('GET', '/guia/inicio')).body;
  const boot = /src="(\/_site\/boot\.[\w-]+\.js)"/.exec(html)[1];
  for (const u of ['/_site/search.json', '/_site/p/guia/inicio.js', '/_site/p/index.js', boot]) {
    const r = await req('GET', u);
    assert.equal(r.statusCode, 200, u);
    assert.equal(r.headers['x-content-type-options'], 'nosniff', u);
    assert.match(r.headers['content-security-policy'], /frame-ancestors 'self'/, u);
    assert.equal(r.headers['access-control-allow-origin'], undefined, u);
    // ni el frontmatter interno ni rutas o credenciales del servidor
    assert.doesNotMatch(r.body, /DATABASE_URL|postgres:\/\/|[A-Z]:\\\\|\/portal\/server|"codigo"|"funcionalidades"|"sinonimos"/, u);
  }
  const tricks = [
    '/_site/../package.json', '/_site/%2e%2e/%2e%2e/.env', '/_site/assets/..%2f..%2fserver%2findex.mjs', '/_site/assets/../../../portal/.env',
    '/_site/p/../../.env.js', '/_site/p/%2e%2e/%2e%2e/server/auth.js', '/_site/boot.../../x.js', '/_site/boot.%00.js', '/_site/.vite/manifest.json',
    '/_site/server/entry-server.js', '/_site/client/.vite/manifest.json', '/_site/assets/', '/_site/p/', '/_site/search.json/../../.env',
    '/assets/../../.env', '/assets/%2e%2e/package.json', '/assets/imgs/../../../portal/.env', '/assets/tours/../../.env', '/assets/tours/x.json.bak',
    '/favicon.ico/../../.env', '/_site/p/guia/inicio.js~', '/_site/p/guia/inicio.js.bak',
  ];
  for (const t of tricks) {
    let r;
    try {
      r = await req('GET', t);
    } catch {
      continue;
    }
    assert.ok([400, 404].includes(r.statusCode), `${t} → ${r.statusCode}`);
    assert.doesNotMatch(r.body, /DATABASE_URL|secreto|"dependencies"|import .* from|export \{/, t);
  }
  // métodos que escriben sobre las rutas públicas: no existen
  for (const m of ['POST', 'PUT', 'DELETE']) assert.equal((await req(m, '/_site/search.json', { payload: {} })).statusCode, 404, m);
});

test('npm audit: sin vulnerabilidades altas/críticas sin justificar (requiere red; PORTAL_TEST_NPM_AUDIT=1)', { skip: process.env.PORTAL_TEST_NPM_AUDIT !== '1' && 'sin PORTAL_TEST_NPM_AUDIT=1 (ver npm run security:scan -- --audit)' }, async () => {
  const { auditSummary, ACCEPTED_ADVISORIES } = await import('../scripts/security-scan.mjs');
  for (const dir of [PORTAL_ROOT, path.join(PORTAL_ROOT, 'web'), path.dirname(PORTAL_ROOT)]) {
    const s = await auditSummary(dir);
    const open = s.items.filter((x) => ['high', 'critical'].includes(x.severity) && !ACCEPTED_ADVISORIES[x.name]);
    assert.deepEqual(open.map((x) => x.name), [], dir);
  }
});
