import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
// Producción en un solo puerto (server/http/frontend.mjs, config.mjs, auth.mjs): manual en /, panel en /admin/,
// API en /api/, /healthz, cabeceras, caché, compresión, rutas seguras, proxy inverso (X-Forwarded-*), lista de IPs,
// panel deshabilitado y compatibilidad con /manual/. Además: npm/pg_dump/git en Linux y Windows (plataforma
// simulada), vigilancia del sitio desfasado y apagado ordenado.
// Usa TEST_DATABASE_URL (vacía sus tablas, como api.test.mjs) y un sitio y un panel falsos en portal/work-test/prod-test/.
// Uso: node --test test/production.test.mjs   (desde portal/)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';

loadEnv();
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('Falta TEST_DATABASE_URL');
if (TEST_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
process.env.DATABASE_URL = TEST_URL;
process.env.PORTAL_ADMIN_USER = 'admin_prod';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
const RUN = path.join(PORTAL_ROOT, 'work-test', 'prod-test');
const DATA = path.join(RUN, 'data');
const SITE = path.join(DATA, 'site');
const WEB = path.join(RUN, 'web-dist');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = DATA;

const { buildApp, installShutdown } = await import('../server/index.mjs');
const { readServerConfig, parseIpAllowList, parseTrustProxy, envBool, normalizeIp } = await import('../server/config.mjs');
const { safeRelPath, cacheControlFor } = await import('../server/http/frontend.mjs');
const { npmCommand, npmCliCandidates } = await import('../server/ops/proc.mjs');
const { pgTool } = await import('../server/ops/backup.mjs');
const { safeDirectoryEnv } = await import('../server/ops/git.mjs');
const { siteBaseError, getSiteBase } = await import('../server/ops/publish.mjs');
const { createSite } = await import('../server/ops/site.mjs');
const pg = (await import('pg')).default;

const PASS = 'Clave-de-prueba-1';
const apps = [];
let app; // configuración por defecto (sin proxy)

function write(root, rel, content) {
  const p = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
const BIG = 'x'.repeat(5000);
function makeSite(base = '/') {
  safeRm(SITE);
  write(SITE, 'index.html', `<!doctype html><title>Inicio</title><p>Portada del manual ${BIG}</p>`);
  write(SITE, 'guia/inicio.html', '<!doctype html><title>Guía</title><p>Inicio de la guía</p>');
  write(SITE, 'problemas/index.html', '<!doctype html><title>Problemas</title><p>Índice de problemas</p>');
  write(SITE, '404.html', '<!doctype html><title>404</title><p>Página propia 404 del manual</p>');
  write(SITE, 'static/js/main.0a1b2c3d.js', `console.log("bundle con hash");${BIG}`);
  write(SITE, 'assets/imgs/demo/01-pantalla.webp', Buffer.from('RIFF0000WEBPVP8 ficticio'));
  write(SITE, 'assets/tours/demo.json', '{"slug":"demo"}\n');
  write(SITE, '.env', 'SECRETO=no-debe-servirse');
  write(SITE, '.git/config', '[core]');
  fs.writeFileSync(path.join(DATA, 'site-meta.json'), JSON.stringify({ base, pages: 3, startedAt: new Date().toISOString() }));
}
function makeWeb() {
  safeRm(WEB);
  write(WEB, 'index.html', '<!doctype html><title>Panel</title><script type="module" src="/admin/assets/index-AbCdEf12.js"></script><div id="root"></div>');
  write(WEB, 'assets/index-AbCdEf12.js', `console.log("panel");${BIG}`);
  write(WEB, 'favicon.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));
}
async function mkApp(config = {}) {
  const a = await buildApp({ databaseUrl: TEST_URL, config: { webDist: WEB, ...config }, watchSite: false });
  apps.push(a);
  return a;
}
const refresh = (a = app) => a.portal.ctx.frontend.refresh();
const get = (a, url, headers = {}) => a.inject({ method: 'GET', url, headers });
const cookieOf = (res) => res.cookies.find((c) => c.name === 'portal_session' || c.name === '__Host-portal_session');

before(async () => {
  safeRm(RUN);
  fs.mkdirSync(DATA, { recursive: true });
  const c = new pg.Client({ connectionString: TEST_URL });
  await c.connect();
  await resetTestDb(c);
  await c.end();
  makeSite('/');
  makeWeb();
  app = await mkApp({ trustProxy: false, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), adminEnabled: true, cookieSecure: false });
  await app.portal.ensureAdmin();
});
after(async () => {
  for (const a of apps) await a.close().catch(() => {});
  safeRm(RUN);
});

test('manual en /: portada, URLs limpias, índices, .html, 404 propio con código 404', async () => {
  let r = await get(app, '/');
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.match(r.body, /Portada del manual/);
  r = await get(app, '/guia/inicio');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /Inicio de la guía/);
  assert.equal((await get(app, '/guia/inicio.html')).statusCode, 200);
  for (const u of ['/problemas', '/problemas/', '/problemas.html']) {
    r = await get(app, u);
    assert.equal(r.statusCode, 200, u);
    assert.match(r.body, /Índice de problemas/, u);
  }
  r = await get(app, '/no/existe');
  assert.equal(r.statusCode, 404);
  assert.match(r.body, /Página propia 404 del manual/);
  assert.match(r.headers['content-type'], /text\/html/);
  r = await get(app, '/static/js/no-existe.js');
  assert.equal(r.statusCode, 404);
  // HEAD
  r = await app.inject({ method: 'HEAD', url: '/guia/inicio' });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body, '');
  // métodos que no son GET/HEAD fuera de la API: 404
  assert.equal((await app.inject({ method: 'POST', url: '/guia/inicio' })).statusCode, 404);
});

test('cabeceras de seguridad del nginx anterior, caché por tipo y ETag con 304', async () => {
  const r = await get(app, '/guia/inicio');
  assert.equal(r.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.match(r.headers['permissions-policy'], /^geolocation=\(\), microphone=\(\), camera=\(\)/);
  assert.match(r.headers['content-security-policy'], /^default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;.*frame-ancestors 'self'/);
  assert.doesNotMatch(r.headers['content-security-policy'], /googleapis|gstatic/);
  assert.equal(r.headers['cache-control'], 'no-cache');
  assert.ok(r.headers.etag, 'ETag');
  assert.ok(r.headers['last-modified']);
  const again = await get(app, '/guia/inicio', { 'if-none-match': r.headers.etag });
  assert.equal(again.statusCode, 304);
  assert.equal((await get(app, '/static/js/main.0a1b2c3d.js')).headers['cache-control'], 'public, max-age=31536000, immutable');
  const img = await get(app, '/assets/imgs/demo/01-pantalla.webp');
  assert.equal(img.statusCode, 200);
  assert.equal(img.headers['content-type'], 'image/webp');
  assert.equal(img.headers['cache-control'], 'public, max-age=3600, must-revalidate');
  assert.equal((await get(app, '/assets/tours/demo.json')).headers['cache-control'], 'no-cache');
  const api = await get(app, '/api/auth/me');
  assert.equal(api.headers['x-content-type-options'], 'nosniff', 'también en la API');
  assert.equal(api.headers.server, undefined);
  assert.equal(api.headers['x-powered-by'], undefined);
  // reglas puras
  assert.equal(cacheControlFor('assets/index-AbCdEf12.js', { hashedDirs: ['assets/'] }), 'public, max-age=31536000, immutable');
  assert.equal(cacheControlFor('guia/inicio.html'), 'no-cache');
});

test('compresión br/gzip según Accept-Encoding (Vary), sin comprimir lo pequeño', async () => {
  let r = await get(app, '/', { 'accept-encoding': 'gzip' });
  assert.equal(r.headers['content-encoding'], 'gzip');
  assert.match(r.headers.vary, /accept-encoding/i);
  assert.match(zlib.gunzipSync(r.rawPayload).toString(), /Portada del manual/);
  r = await get(app, '/static/js/main.0a1b2c3d.js', { 'accept-encoding': 'br, gzip' });
  assert.equal(r.headers['content-encoding'], 'br');
  assert.match(zlib.brotliDecompressSync(r.rawPayload).toString(), /bundle con hash/);
  r = await get(app, '/api/auth/me', { 'accept-encoding': 'gzip' });
  assert.equal(r.headers['content-encoding'], undefined, 'una respuesta JSON de menos de 1 KB no se comprime');
  r = await get(app, '/');
  assert.equal(r.headers['content-encoding'], undefined, 'sin Accept-Encoding, sin comprimir');
});

test('rutas seguras: traversal, ocultos, doble codificación, barras invertidas → 404 sin salir de la raíz', async () => {
  const malas = [
    '/../package.json', '/..%2fpackage.json', '/%2e%2e/%2e%2e/package.json', '/%252e%252e%252fpackage.json', '/guia/%2e%2e/%2e%2e/index.mjs',
    '/.env', '/.git/config', '/%2eenv', '/guia/..%5c..%5cpackage.json', '/guia\\..\\..\\package.json', '/%00', '/guia/%c0%ae%c0%ae/',
  ];
  for (const u of malas) {
    const r = await get(app, u);
    assert.ok([400, 404].includes(r.statusCode), `${u} → ${r.statusCode}`);
    assert.doesNotMatch(r.body, /SECRETO|\[core\]|"name"|ispmax-manual-portal/, u);
  }
  assert.equal(safeRelPath('/a/../b'), null);
  assert.equal(safeRelPath('/a/%2e%2e/b'), null);
  assert.equal(safeRelPath('/a/%252e%252e/b'), null);
  assert.equal(safeRelPath('/guia/inicio'), 'guia/inicio');
  assert.equal(safeRelPath('/problemas/'), 'problemas/');
  assert.equal(safeRelPath('/'), '');
  // sin listado de directorios: una carpeta sin index.html es un 404
  write(SITE, 'sin-indice/a.html', 'x');
  assert.equal((await get(app, '/sin-indice/')).statusCode, 404);
});

test('panel en /admin/: 301 desde /admin, SPA con fallback solo bajo /admin/, 404 para archivos inexistentes', async () => {
  let r = await get(app, '/admin');
  assert.equal(r.statusCode, 301);
  assert.equal(r.headers.location, '/admin/');
  assert.equal((await get(app, '/admin?x=1')).headers.location, '/admin/?x=1');
  r = await get(app, '/admin/');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /<title>Panel<\/title>/);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.match(r.headers['content-security-policy'], /img-src 'self' data: blob:/);
  assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(r.headers['x-frame-options'], 'DENY');
  assert.match(r.body, /<base href="\/admin\/">/);
  r = await get(app, '/admin/paginas/12');
  assert.equal(r.statusCode, 200, 'ruta de la SPA');
  assert.match(r.body, /<title>Panel<\/title>/);
  r = await get(app, '/admin/assets/index-AbCdEf12.js');
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'], /javascript/);
  assert.equal(r.headers['cache-control'], 'no-store', 'todo lo del panel: no-store');
  assert.equal((await get(app, '/admin/assets/no-existe-1234.js')).statusCode, 404);
  assert.equal((await get(app, '/admin/../package.json')).statusCode, 404);
  // la SPA no ocupa / ni responde a rutas del manual
  assert.doesNotMatch((await get(app, '/guia/inicio')).body, /<title>Panel/);
  // la API sigue siendo JSON
  r = await get(app, '/api/no-existe');
  assert.ok([401, 404].includes(r.statusCode));
  assert.match(r.headers['content-type'], /json/);
});

test('API: /api/auth/me 401 sin sesión; /%61pi/… no esquiva la sesión', async () => {
  assert.equal((await get(app, '/api/auth/me')).statusCode, 401);
  assert.equal((await get(app, '/%61pi/auth/me')).statusCode, 401);
  assert.equal((await get(app, '/%61pi/stats')).statusCode, 401);
});

test('/healthz: público, barato, sin datos sensibles; 503 si la BD falla o no responde', async () => {
  let r = await get(app, '/healthz');
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), { ok: true, db: true, site: true });
  assert.equal(r.headers['cache-control'], 'no-store');
  const db = app.portal.ctx.db;
  const orig = db.query;
  try {
    db.query = () => Promise.reject(new Error('conexión rechazada'));
    r = await get(app, '/healthz');
    assert.equal(r.statusCode, 503);
    assert.deepEqual(r.json(), { ok: false, db: false, site: true });
    assert.doesNotMatch(r.body, /conexión|postgres|password/i);
    db.query = () => new Promise(() => {}); // BD colgada: no espera más de 2 s
    const t0 = Date.now();
    r = await get(app, '/healthz');
    assert.equal(r.statusCode, 503);
    assert.ok(Date.now() - t0 < 4000);
  } finally {
    db.query = orig;
  }
});

test('/healthz y / siguen con el panel deshabilitado; /admin y /api dan 503 amable', async () => {
  const off = await mkApp({ adminEnabled: false });
  let r = await get(off, '/healthz');
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().ok, true);
  assert.equal((await get(off, '/guia/inicio')).statusCode, 200);
  r = await get(off, '/admin/');
  assert.equal(r.statusCode, 503);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.match(r.body, /deshabilitado/);
  r = await get(off, '/api/auth/me');
  assert.equal(r.statusCode, 503);
  assert.match(r.json().error, /deshabilitad/);
  r = await off.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin_prod', password: PASS } });
  assert.equal(r.statusCode, 503);
});

test('página «El manual se está preparando» sin sitio (503, Retry-After, noindex) y cambio inmediato al generarse', async () => {
  safeRm(SITE);
  refresh();
  let r = await get(app, '/guia/inicio');
  assert.equal(r.statusCode, 503);
  assert.equal(r.headers['retry-after'], '30');
  assert.match(r.headers['x-robots-tag'], /noindex/);
  assert.match(r.body, /El manual se está preparando/);
  assert.match(r.body, /<meta name="robots" content="noindex/);
  assert.match(r.body, /href="\/admin\/"/);
  assert.doesNotMatch(r.body, /<script|https?:\/\//, 'autocontenida');
  r = await get(app, '/healthz');
  assert.equal(r.statusCode, 200, 'el healthcheck no depende del sitio');
  assert.deepEqual(r.json(), { ok: true, db: true, site: false });
  assert.equal((await get(app, '/admin/')).statusCode, 200, 'el panel funciona sin sitio');
  makeSite('/');
  refresh();
  r = await get(app, '/guia/inicio');
  assert.equal(r.statusCode, 200, 'sin reiniciar');
});

test('compatibilidad: con base / → /manual/* 301 a /*; con un sitio generado en /manual/ se sirve allí sin reiniciar', async () => {
  let r = await get(app, '/manual/guia/inicio?q=1');
  assert.equal(r.statusCode, 301);
  assert.equal(r.headers.location, '/guia/inicio?q=1');
  assert.equal((await get(app, '/manual')).headers.location, '/');
  assert.equal((await get(app, '/manual/')).headers.location, '/');
  // sitio generado con base /manual/ (site-meta.json): se sirve en /manual/, / redirige allí
  makeSite('/manual/');
  refresh();
  r = await get(app, '/manual/guia/inicio');
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /Inicio de la guía/);
  assert.equal((await get(app, '/manual')).headers.location, '/manual/');
  r = await get(app, '/');
  assert.equal(r.statusCode, 302);
  assert.equal(r.headers.location, '/manual/');
  assert.equal((await get(app, '/guia/inicio')).statusCode, 404);
  makeSite('/');
  refresh();
  assert.equal((await get(app, '/guia/inicio')).statusCode, 200);
});

test('site_base: acepta / y /manual/; rechaza //, .., espacios, sin barras y prefijos del portal', async () => {
  assert.equal(siteBaseError('/'), null);
  assert.equal(siteBaseError('/manual/'), null);
  assert.equal(siteBaseError('/docs/v2/'), null);
  for (const no of ['', '//', '/a//', '/../', '/a/../b/', '/ a/', ' /', '/manual', 'manual/', '/api/', '/admin/', '/healthz/', '/ADMIN/']) assert.ok(siteBaseError(no), JSON.stringify(no));
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin_prod', password: PASS } });
  const ck = `portal_session=${cookieOf(login).value}`;
  // La base ya no se edita desde el panel: la fija el despliegue (PORTAL_SITE_BASE).
  const put = (v) => app.inject({ method: 'PUT', url: '/api/settings', headers: { cookie: ck }, payload: { site_base: v } });
  for (const v of ['/', '/manual/', '//', 'manual']) {
    const r = await put(v);
    assert.equal(r.statusCode, 400, v);
    assert.equal(r.json().error, 'Ese valor lo fija el despliegue y no se cambia desde el panel.');
  }
  const g = await app.inject({ method: 'GET', url: '/api/settings', headers: { cookie: ck } });
  assert.ok(!('site_base' in g.json().settings));
  // PORTAL_SITE_BASE (sin tabla) y valor por defecto
  assert.equal(await getSiteBase({ getSetting: async () => null, repoRoot: '.' }), '/');
});

test('proxy inverso: Origin vs X-Forwarded-Host, cookie Secure con X-Forwarded-Proto, IP real para el límite de intentos', async () => {
  const px = await mkApp({ trustProxy: true, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), cookieSecure: false });
  const fwd = { 'x-forwarded-host': 'manual.example.invalid', 'x-forwarded-proto': 'https', 'x-forwarded-for': '198.51.100.20', host: '127.0.0.1:8387' };
  let r = await px.inject({ method: 'POST', url: '/api/auth/login', headers: { ...fwd, origin: 'https://manual.example.invalid' }, payload: { username: 'admin_prod', password: PASS } });
  assert.equal(r.statusCode, 200);
  const ck = cookieOf(r);
  assert.equal(ck.secure, true, 'Secure tras https del proxy');
  assert.equal(ck.httpOnly, true);
  assert.equal(ck.name, '__Host-portal_session', 'con https: prefijo __Host-');
  const cookie = `${ck.name}=${ck.value}`;
  // guardar con el dominio del proxy
  r = await px.inject({ method: 'PUT', url: '/api/auth/password', headers: { ...fwd, cookie, origin: 'https://manual.example.invalid' }, payload: { current: 'mala', new: 'abcdefgh1' } });
  assert.equal(r.statusCode, 400, 'pasa la comprobación de origen (falla por la contraseña)');
  // proxy que no reenvía el puerto público
  r = await px.inject({ method: 'PUT', url: '/api/auth/password', headers: { ...fwd, cookie, origin: 'https://manual.example.invalid:8443' }, payload: { current: 'mala', new: 'abcdefgh1' } });
  assert.equal(r.statusCode, 400);
  // otro dominio: 403
  r = await px.inject({ method: 'PUT', url: '/api/auth/password', headers: { ...fwd, cookie, origin: 'https://otro.example.invalid' }, payload: { current: 'mala', new: 'abcdefgh1' } });
  assert.equal(r.statusCode, 403);
  // sin confianza en el proxy, X-Forwarded-Host no cuenta y la cookie no es Secure
  r = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { ...fwd, origin: 'https://manual.example.invalid' }, payload: { username: 'admin_prod', password: PASS } });
  assert.equal(r.statusCode, 403);
  r = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { ...fwd }, payload: { username: 'admin_prod', password: PASS } });
  assert.equal(r.statusCode, 200);
  assert.ok(!cookieOf(r).secure, 'sin Secure');
  // Origin igual al Host (acceso directo por IP:puerto)
  r = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { host: '192.0.2.10:8387', origin: 'http://192.0.2.10:8387' }, payload: { username: 'admin_prod', password: PASS } });
  assert.equal(r.statusCode, 200);
  // PORTAL_COOKIE_SECURE=true fuerza Secure aunque sea http
  const sec = await mkApp({ cookieSecure: true });
  r = await sec.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin_prod', password: PASS } });
  assert.equal(cookieOf(r).secure, true);
  // PORTAL_ALLOWED_ORIGINS
  const ao = await mkApp({ allowedOrigins: new Set(['https://panel.example.invalid']) });
  r = await ao.inject({ method: 'POST', url: '/api/auth/login', headers: { host: '127.0.0.1:8387', origin: 'https://panel.example.invalid' }, payload: { username: 'admin_prod', password: PASS } });
  assert.equal(r.statusCode, 200);
  // límite de intentos por IP real (X-Forwarded-For con confianza)
  const intento = (ip) => px.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-forwarded-for': ip }, payload: { username: 'admin_prod', password: 'mala' } });
  let last;
  for (let i = 0; i < 6; i++) last = await intento('198.51.100.31');
  assert.equal(last.statusCode, 429);
  assert.equal((await intento('198.51.100.32')).statusCode, 401, 'otra IP real no queda bloqueada');
});

test('PORTAL_ADMIN_ALLOWED_IPS: IP y CIDR (IPv4/IPv6) con la IP real; no afecta a / ni a /healthz', async () => {
  const lim = await mkApp({ trustProxy: true, adminIps: parseIpAllowList('192.0.2.0/24, 2001:db8::/32,198.51.100.7') });
  const as = (ip, url) => get(lim, url, { 'x-forwarded-for': ip });
  assert.equal((await as('192.0.2.55', '/admin/')).statusCode, 200);
  assert.equal((await as('198.51.100.7', '/api/auth/me')).statusCode, 401, 'permitida: llega a la sesión');
  assert.equal((await as('2001:db8::1', '/admin/')).statusCode, 200);
  let r = await as('203.0.113.9', '/admin/');
  assert.equal(r.statusCode, 403);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.match(r.body, /Acceso no permitido/);
  r = await as('203.0.113.9', '/api/auth/me');
  assert.equal(r.statusCode, 403);
  assert.match(r.json().error, /IP/);
  r = await lim.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-forwarded-for': '203.0.113.9' }, payload: { username: 'admin_prod', password: PASS } });
  assert.equal(r.statusCode, 403);
  assert.equal((await as('203.0.113.9', '/admin')).statusCode, 403);
  assert.equal((await as('203.0.113.9', '/%61dmin/')).statusCode, 403);
  assert.equal((await as('203.0.113.9', '/%61pi/stats')).statusCode, 403);
  assert.equal((await as('203.0.113.9', '/guia/inicio')).statusCode, 200);
  assert.equal((await as('203.0.113.9', '/healthz')).statusCode, 200);
  // sin confianza en el proxy, la IP es la de la conexión (127.0.0.1 en inject), no la de X-Forwarded-For
  const noTrust = await mkApp({ trustProxy: false, adminIps: parseIpAllowList('192.0.2.0/24') });
  assert.equal((await get(noTrust, '/admin/', { 'x-forwarded-for': '192.0.2.55' })).statusCode, 403);
  // funciones puras
  const l = parseIpAllowList('10.0.0.0/8,::1');
  assert.equal(l.allowed('10.1.2.3'), true);
  assert.equal(l.allowed('::ffff:10.1.2.3'), true, 'IPv4 mapeada en IPv6');
  assert.equal(l.allowed('::1'), true);
  assert.equal(l.allowed('11.0.0.1'), false);
  assert.equal(l.allowed('basura'), false);
  assert.throws(() => parseIpAllowList('10.0.0.0/33'), /no es una IP/);
  assert.throws(() => parseIpAllowList('servidor.invalid'), /no es una IP/);
  assert.equal(normalizeIp('[::1]'), '::1');
});

test('variables vacías del compose = no definidas; PORTAL_TRUST_PROXY y booleanos', () => {
  const c = readServerConfig({ PORTAL_ADMIN_ALLOWED_IPS: '', PORTAL_COOKIE_SECURE: '', PORTAL_ALLOWED_ORIGINS: '', PORTAL_TRUST_PROXY: '', PORTAL_ADMIN_ENABLED: '', PORTAL_RESTART_MODE: '' });
  assert.equal(c.adminIps.any, true, 'lista de IPs vacía = todas');
  assert.equal(c.adminIps.allowed('203.0.113.1'), true);
  assert.equal(c.cookieSecure, false, 'cookie: automática según el protocolo');
  assert.equal(c.allowedOrigins.size, 0, 'orígenes extra: ninguno');
  assert.equal(c.trustProxy, false);
  assert.equal(c.adminEnabled, true);
  assert.equal(c.restartMode, 'exit');
  const d = readServerConfig({});
  assert.deepEqual([...d.allowedOrigins], ['http://localhost:5173', 'http://127.0.0.1:5173'], 'sin definir: los de Vite en desarrollo');
  assert.equal(d.port, 4380);
  assert.equal(d.host, '127.0.0.1');
  const p = readServerConfig({ PORTAL_PORT: '8387', PORTAL_HOST: '0.0.0.0', PORTAL_TRUST_PROXY: 'true', PORTAL_ADMIN_ENABLED: 'false', PORTAL_COOKIE_SECURE: 'true', PORTAL_RESTART_MODE: 'respawn' });
  assert.equal(p.port, 8387);
  assert.equal(p.host, '0.0.0.0');
  assert.equal(p.trustProxy, 1, '"true" = un proxy (no la confianza total, falsificable)');
  assert.equal(p.adminEnabled, false);
  assert.equal(p.cookieSecure, true);
  assert.equal(p.restartMode, 'respawn');
  assert.throws(() => readServerConfig({ PORTAL_RESTART_MODE: 'reboot' }), /PORTAL_RESTART_MODE/);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('2'), 2);
  assert.deepEqual(parseTrustProxy('172.16.0.0/12, 127.0.0.1'), ['172.16.0.0/12', '127.0.0.1']);
  assert.throws(() => parseTrustProxy('proxy.invalid'), /PORTAL_TRUST_PROXY/);
  assert.equal(envBool('sí', false), true);
  assert.equal(envBool('0', true), false);
  assert.equal(envBool('quizá', true), true);
});

test('Linux/Alpine y Windows: npm sin shell, pg_dump del PATH, safe.directory de git', () => {
  // node:22-alpine: /usr/local/bin/node y /usr/local/lib/node_modules/npm/bin/npm-cli.js
  const alpineCli = '/usr/local/lib/node_modules/npm/bin/npm-cli.js';
  const linux = { execPath: '/usr/local/bin/node', env: {}, platform: 'linux', realpath: (p) => p };
  assert.ok(npmCliCandidates(linux).includes(alpineCli));
  assert.deepEqual(npmCommand({ ...linux, exists: (p) => p === alpineCli }), { cmd: '/usr/local/bin/node', args: [alpineCli], via: 'npm-cli.js' });
  // npm_execpath (npm start) tiene prioridad
  const viaEnv = '/opt/npm/bin/npm-cli.js';
  assert.equal(npmCommand({ ...linux, env: { npm_execpath: viaEnv }, exists: () => true }).args[0], viaEnv);
  // npm_execpath de otro gestor (pnpm) no vale
  assert.ok(!npmCliCandidates({ ...linux, env: { npm_execpath: '/usr/lib/pnpm/bin/pnpm.cjs' } }).some((p) => p.includes('pnpm')));
  // node enlazado (/usr/bin/node → /usr/local/bin/node): también se busca junto a la ruta real
  assert.ok(npmCliCandidates({ ...linux, execPath: '/usr/bin/node', realpath: () => '/usr/local/bin/node' }).includes(alpineCli));
  // sin npm-cli.js: en Linux, npm del PATH; en Windows, nada (npm.cmd exigiría shell)
  assert.deepEqual(npmCommand({ ...linux, exists: () => false }), { cmd: 'npm', args: [], via: 'PATH' });
  const win = { execPath: 'C:\\Program Files\\nodejs\\node.exe', env: {}, platform: 'win32', realpath: (p) => p };
  const winCli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
  assert.ok(npmCliCandidates(win).includes(winCli));
  assert.equal(npmCommand({ ...win, exists: (p) => p === winCli }).args[0], winCli);
  assert.equal(npmCommand({ ...win, exists: () => false }), null);
  assert.equal(npmCommand({ ...win, env: { PORTAL_NPM_CLI: 'D:\\npm\\bin\\npm-cli.js' }, exists: (p) => p.startsWith('D:') }).args[0], 'D:\\npm\\bin\\npm-cli.js');
  // pg_dump / pg_restore: del PATH sin PG_DUMP_PATH (o vacía, como la pasa el compose); al lado con ruta
  assert.equal(pgTool('pg_dump', { env: {}, platform: 'linux' }), 'pg_dump');
  assert.equal(pgTool('pg_restore', { env: {}, platform: 'linux' }), 'pg_restore');
  assert.equal(pgTool('pg_restore', { env: { PG_DUMP_PATH: '' }, platform: 'linux' }), 'pg_restore');
  assert.equal(pgTool('pg_restore', { env: { PG_DUMP_PATH: '/usr/libexec/postgresql17/pg_dump' }, platform: 'linux' }), '/usr/libexec/postgresql17/pg_restore');
  assert.equal(pgTool('pg_restore', { env: { PG_DUMP_PATH: 'C:\\PostgreSQL\\17\\bin\\pg_dump.exe' }, platform: 'win32' }), 'C:\\PostgreSQL\\17\\bin\\pg_restore.exe');
  // git en el contenedor: safe.directory por GIT_CONFIG_* sin pisar las existentes
  const g = safeDirectoryEnv('/app', {});
  assert.equal(g.GIT_CONFIG_COUNT, '1');
  assert.equal(g.GIT_CONFIG_KEY_0, 'safe.directory');
  assert.match(g.GIT_CONFIG_VALUE_0, /app$/);
  const g2 = safeDirectoryEnv('/app', { GIT_CONFIG_COUNT: '2' });
  assert.equal(g2.GIT_CONFIG_COUNT, '3');
  assert.equal(g2.GIT_CONFIG_KEY_2, 'safe.directory');
  assert.doesNotMatch(safeDirectoryEnv(process.cwd(), {}).GIT_CONFIG_VALUE_0, /\\/, 'barras "/" también en Windows');
});

test('vigilancia periódica: cambios fuera del servidor → markDirty; sin bucle tras un fallo hasta que cambie algo', async () => {
  delete process.env.PORTAL_SITE_AUTO;
  try {
    let fp = 'a';
    const builds = [];
    let fail = true;
    const db = {
      async query(sql) {
        if (/GREATEST/.test(sql)) return { rows: [{ fp: fp === 'a' ? '2026-01-01T00:00:00Z' : '2026-01-02T00:00:00Z', n: 3 }] };
        if (/status <> 'running'/.test(sql)) return { rows: builds.length ? [{ id: builds.length, status: fail ? 'error' : 'ok', log: '', started_at: new Date(), finished_at: new Date() }] : [] };
        if (/status = 'running'/.test(sql)) return { rows: [] };
        return { rows: [{ n: 0 }] };
      },
    };
    const publisher = {
      async publish() {
        builds.push(1);
        return { jobId: builds.length, done: Promise.resolve({ status: fail ? 'error' : 'ok' }) };
      },
    };
    const ctx = { db, getSetting: async (k, d) => (k === 'auto_publish_delay' ? 1 : d) };
    const site = createSite({ ctx, jobs: null, publisher });
    // Desfase real (staleReason): sitio inexistente y páginas publicadas en la BD, como tras `npm run content:import`.
    safeRm(SITE);
    db.query = ((q) => async (sql, p) => (/count\(\*\)::int AS n FROM pages WHERE status = 'published'/.test(sql) ? { rows: [{ n: 3 }] } : q(sql, p)))(db.query);
    assert.equal(await site.watchTick(), 'el sitio publicado no existe todavía');
    assert.equal((await site.status()).state, 'pending');
    assert.deepEqual((await site.status()).pendingReasons, ['contenido cambiado fuera del servidor']);
    await new Promise((r) => setTimeout(r, 1300)); // debounce de 1 s
    assert.equal(builds.length, 1);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(site.failures.n, 1);
    // mismo contenido y dentro de la espera: no reintenta
    assert.equal(await site.watchTick(), null);
    assert.equal(await site.watchTick(), null);
    assert.equal(builds.length, 1);
    // cambia algo: vuelve a intentarlo
    fp = 'b';
    fail = false;
    assert.ok(await site.watchTick());
    await new Promise((r) => setTimeout(r, 1300));
    assert.equal(builds.length, 2);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(site.failures.n, 0);
    site.close();
  } finally {
    process.env.PORTAL_SITE_AUTO = 'off';
    makeSite('/');
    refresh();
  }
});

test('apagado ordenado: SIGTERM cierra el servidor y la BD y sale con 0; los trabajos en curso quedan interrumpidos', async () => {
  const a = await mkApp();
  const jobsCtx = a.portal.ctx;
  // un trabajo `running` de este proceso, como si una construcción estuviera en curso
  const { createJobs } = await import('../server/ops/jobs.mjs');
  const jobs = createJobs({ db: jobsCtx.db });
  let release;
  const { jobId } = await jobs.start('backup', null, () => new Promise((r) => (release = r)));
  const prevShutdown = jobsCtx.shutdownOps;
  jobsCtx.shutdownOps = async () => {
    await prevShutdown();
    return jobs.interruptActive();
  };
  const exits = [];
  const stop = installShutdown(a, { exit: (c) => exits.push(c), signals: [] });
  await stop('SIGTERM');
  assert.deepEqual(exits, [0]);
  const c = new pg.Client({ connectionString: TEST_URL });
  await c.connect();
  const row = (await c.query('SELECT status, log FROM publish_jobs WHERE id = $1', [jobId])).rows[0];
  await c.end();
  assert.equal(row.status, 'error');
  assert.match(row.log, /\[interrumpido\]/);
  release?.();
  await assert.rejects(a.portal.ctx.pool.query('SELECT 1'), 'el pool quedó cerrado');
  apps.splice(apps.indexOf(a), 1);
});
