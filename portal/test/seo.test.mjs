import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
// SEO del servidor: /sitemap.xml y /robots.txt (con y sin PORTAL_PUBLIC_URL, con proxy de confianza o sin él, sin
// borradores ni páginas eliminadas ni noindex), cabeceras de seguridad (HSTS solo con https efectivo, sin Google Fonts
// en la CSP, X-Robots-Tag en /admin y /api), validación de PORTAL_PUBLIC_URL y su aparición en /api/system/info.
// Usa TEST_DATABASE_URL (vacía sus tablas, como production.test.mjs) y un sitio falso en portal/work-test/seo-test/.
// Uso: node --test test/seo.test.mjs   (desde portal/)
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
process.env.PORTAL_ADMIN_USER = 'admin_seo';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
// Flujo ESTÁTICO (sitio generado en disco): el dinámico se prueba en site-dynamic.test.mjs.
process.env.PORTAL_RENDER_MODE = 'static';
delete process.env.PORTAL_PUBLIC_URL;
const RUN = path.join(PORTAL_ROOT, 'work-test', 'seo-test');
const DATA = path.join(RUN, 'data');
const SITE = path.join(DATA, 'site');
const WEB = path.join(RUN, 'web-dist');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = DATA;

const { buildApp } = await import('../server/index.mjs');
const { parsePublicUrl, parseIpAllowList, readServerConfig } = await import('../server/config.mjs');
const { sitemapEntries, sitemapXml, robotsTxt, pagePublicPath, effectiveOrigin } = await import('../server/http/seo.mjs');
const { HSTS } = await import('../server/http/frontend.mjs');
const pg = (await import('pg')).default;

const apps = [];
function write(root, rel, content) {
  const p = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
function makeSite(base = '/') {
  safeRm(SITE);
  write(SITE, 'index.html', '<!doctype html><title>Inicio</title><p>Portada</p>');
  write(SITE, '404.html', '<!doctype html><title>404</title>');
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, 'site-meta.json'), JSON.stringify({ base, pages: 6 }));
}
const baseConfig = { webDist: WEB, trustProxy: false, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), adminEnabled: true, cookieSecure: false, publicUrl: '' };
async function mkApp(config = {}) {
  const a = await buildApp({ databaseUrl: TEST_URL, config: { ...baseConfig, ...config }, watchSite: false });
  apps.push(a);
  return a;
}
const get = (a, url, headers = {}) => a.inject({ method: 'GET', url, headers });
const locs = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

before(async () => {
  safeRm(RUN);
  fs.mkdirSync(WEB, { recursive: true });
  write(WEB, 'index.html', '<!doctype html><title>Panel</title>');
  makeSite('/');
  const c = new pg.Client({ connectionString: TEST_URL });
  await c.connect();
  await resetTestDb(c);
  const ins = (route, file, extra = {}) =>
    c.query(
      'INSERT INTO pages (route, file_path, seccion, title, status, deleted_at, frontmatter, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [route, file, extra.seccion || 'guia', extra.title || route, extra.status || 'published', extra.deleted ? new Date() : null, JSON.stringify(extra.fm || {}), extra.at || '2026-11-20T10:30:00Z'],
    );
  await ins('/', 'index.mdx', { seccion: 'raiz' });
  await ins('/guia/inicio', 'guia/inicio.mdx');
  await ins('/tareas', 'tareas/index.mdx', { seccion: 'tareas' });
  await ins('/tareas/acceso/crear-un-rol', 'tareas/acceso/crear-un-rol.mdx', { seccion: 'tareas', at: '2026-11-22T08:00:00Z' });
  await ins('/guia/borrador', 'guia/borrador.mdx', { status: 'draft' });
  await ins('/guia/eliminada', 'guia/eliminada.mdx', { deleted: true });
  await ins('/guia/oculta', 'guia/oculta.mdx', { fm: { noindex: true } });
  await ins('/guia/a&b', 'guia/a-b.mdx'); // el & se escapa en el XML
  await c.end();
});
after(async () => {
  for (const a of apps) await a.close().catch(() => {});
  safeRm(RUN);
});

test('PORTAL_PUBLIC_URL: vacía = no definida; http(s) sin barra final; errores claros', () => {
  assert.equal(parsePublicUrl(undefined), '');
  assert.equal(parsePublicUrl('  '), '');
  assert.equal(parsePublicUrl('https://doc.ispmax.ec'), 'https://doc.ispmax.ec');
  assert.equal(parsePublicUrl(' http://127.0.0.1:8387 '), 'http://127.0.0.1:8387');
  for (const bad of ['https://doc.ispmax.ec/', 'doc.ispmax.ec', 'ftp://x.ec', 'https://x.ec?a=1', 'https://x.ec#a', 'https://u:p@x.ec', 'javascript:alert(1)']) {
    assert.throws(() => parsePublicUrl(bad), /PORTAL_PUBLIC_URL/, bad);
  }
  assert.equal(readServerConfig({ PORTAL_PUBLIC_URL: 'https://doc.ispmax.ec' }).publicUrl, 'https://doc.ispmax.ec');
  assert.equal(readServerConfig({ PORTAL_PUBLIC_URL: '' }).publicUrl, '');
  assert.equal(readServerConfig({}).publicUrl, '');
  assert.throws(() => readServerConfig({ PORTAL_PUBLIC_URL: 'https://x.ec/' }), /terminar/);
});

test('rutas públicas del sitemap: limpias, portadas de carpeta con barra, sin duplicados ni noindex', () => {
  assert.equal(pagePublicPath('/', 'index.mdx'), '/');
  assert.equal(pagePublicPath('/tareas', 'tareas/index.mdx'), '/tareas/');
  assert.equal(pagePublicPath('/guia/inicio', 'guia/inicio.mdx'), '/guia/inicio');
  const rows = [
    { route: '/a', file_path: 'a.mdx', frontmatter: {}, updated_at: '2026-01-01T00:00:00Z' },
    { route: '/a', file_path: 'a.mdx', frontmatter: {}, updated_at: '2026-02-01T00:00:00Z' },
    { route: '/b', file_path: 'b.mdx', frontmatter: { seo: { noindex: true } }, updated_at: null },
    { route: '/c', file_path: 'c/index.mdx', frontmatter: {}, updated_at: null },
  ];
  const e = sitemapEntries(rows, { origin: 'https://x.ec', base: '/manual/' });
  assert.deepEqual(e.map(x => x.loc), ['https://x.ec/manual/a', 'https://x.ec/manual/c/']);
  assert.equal(e[0].lastmod, '2026-02-01T00:00:00.000Z');
  assert.equal(e[1].lastmod, null);
  assert.match(sitemapXml(e), /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(robotsTxt('https://x.ec'), /Sitemap: https:\/\/x\.ec\/sitemap\.xml\n$/);
});

test('/sitemap.xml con PORTAL_PUBLIC_URL: solo páginas publicadas, URLs absolutas, tipo y caché, sin sesión', async () => {
  const app = await mkApp({ publicUrl: 'https://doc.ispmax.ec' });
  const r = await get(app, '/sitemap.xml', { host: 'otro.example.invalid' });
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'], /^application\/xml; charset=utf-8/);
  assert.match(r.headers['cache-control'], /max-age=300/);
  assert.deepEqual(locs(r.body), [
    'https://doc.ispmax.ec/',
    'https://doc.ispmax.ec/guia/a&amp;b',
    'https://doc.ispmax.ec/guia/inicio',
    'https://doc.ispmax.ec/tareas/',
    'https://doc.ispmax.ec/tareas/acceso/crear-un-rol',
  ]);
  for (const nunca of ['borrador', 'eliminada', 'oculta']) assert.ok(!r.body.includes(nunca), nunca);
  assert.match(r.body, /<loc>https:\/\/doc\.ispmax\.ec\/tareas\/acceso\/crear-un-rol<\/loc><lastmod>2026-11-22T08:00:00\.000Z<\/lastmod>/);
  assert.equal(r.body.match(/<\?xml/g).length, 1);
  assert.equal((await app.inject({ method: 'HEAD', url: '/sitemap.xml' })).statusCode, 200);
});

test('/sitemap.xml y /robots.txt funcionan con el panel deshabilitado y con otro sitio base', async () => {
  const off = await mkApp({ publicUrl: 'https://doc.ispmax.ec', adminEnabled: false });
  assert.equal((await get(off, '/sitemap.xml')).statusCode, 200);
  assert.equal((await get(off, '/robots.txt')).statusCode, 200);
  assert.equal((await get(off, '/api/pages')).statusCode, 503);
  makeSite('/manual/');
  try {
    const app = await mkApp({ publicUrl: 'https://doc.ispmax.ec' });
    const urls = locs((await get(app, '/sitemap.xml')).body);
    assert.ok(urls.includes('https://doc.ispmax.ec/manual/guia/inicio'), urls.join(' '));
    assert.ok(urls.includes('https://doc.ispmax.ec/manual/'), urls.join(' '));
    // robots y sitemap están en la raíz del dominio aunque el manual cuelgue de /manual/
    assert.equal((await get(app, '/robots.txt')).statusCode, 200);
  } finally {
    makeSite('/');
  }
});

test('sin PORTAL_PUBLIC_URL: host de la petición; X-Forwarded-* solo con proxy de confianza', async () => {
  const plain = await mkApp({ publicUrl: '', trustProxy: false });
  let r = await get(plain, '/sitemap.xml', { host: 'manual.example.invalid:8387', 'x-forwarded-host': 'evil.example.invalid', 'x-forwarded-proto': 'https' });
  assert.ok(locs(r.body).every(u => u.startsWith('http://manual.example.invalid:8387/')), locs(r.body)[0]);
  r = await get(plain, '/robots.txt', { host: 'manual.example.invalid:8387', 'x-forwarded-proto': 'https' });
  assert.match(r.body, /^Sitemap: http:\/\/manual\.example\.invalid:8387\/sitemap\.xml$/m);

  const px = await mkApp({ publicUrl: '', trustProxy: true });
  r = await get(px, '/sitemap.xml', { host: 'interno:8387', 'x-forwarded-host': 'doc.ispmax.ec', 'x-forwarded-proto': 'https' });
  assert.ok(locs(r.body).every(u => u.startsWith('https://doc.ispmax.ec/')), locs(r.body)[0]);
  r = await get(px, '/robots.txt', { host: 'interno:8387', 'x-forwarded-host': 'doc.ispmax.ec', 'x-forwarded-proto': 'https' });
  assert.match(r.body, /^Sitemap: https:\/\/doc\.ispmax\.ec\/sitemap\.xml$/m);

  // Host malformado: nunca se refleja en el XML.
  assert.equal(effectiveOrigin({ protocol: 'http', host: 'a"><script>' }, {}).origin, 'http://localhost');
  // PORTAL_PUBLIC_URL manda sobre cualquier cabecera.
  const fixed = await mkApp({ publicUrl: 'https://doc.ispmax.ec', trustProxy: true });
  r = await get(fixed, '/sitemap.xml', { 'x-forwarded-host': 'evil.example.invalid' });
  assert.ok(!r.body.includes('evil'));
});

test('/robots.txt: Allow /, Disallow /admin/ y /api/, línea Sitemap; texto plano y caché', async () => {
  const withUrl = await mkApp({ publicUrl: 'https://doc.ispmax.ec' });
  let r = await get(withUrl, '/robots.txt');
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'], /^text\/plain; charset=utf-8/);
  assert.match(r.headers['cache-control'], /max-age=3600/);
  assert.equal(r.body, 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://doc.ispmax.ec/sitemap.xml\n');
  const without = await mkApp({ publicUrl: '' });
  r = await get(without, '/robots.txt', { host: '127.0.0.1:4380' });
  assert.match(r.body, /^Allow: \/$/m);
  assert.match(r.body, /^Disallow: \/admin\/$/m);
  assert.match(r.body, /^Disallow: \/api\/$/m);
  assert.match(r.body, /^Sitemap: http:\/\/127\.0\.0\.1:4380\/sitemap\.xml$/m);
});

test('cabeceras: CSP sin Google Fonts, Permissions-Policy, Referrer-Policy, nosniff, X-Robots-Tag en /admin y /api', async () => {
  const app = await mkApp();
  const r = await get(app, '/');
  const csp = r.headers['content-security-policy'];
  assert.doesNotMatch(csp, /googleapis|gstatic/);
  assert.match(csp, /font-src 'self' data:/);
  assert.match(csp, /script-src 'self' 'unsafe-inline'/);
  assert.match(csp, /style-src 'self' 'unsafe-inline'/);
  assert.match(csp, /frame-ancestors 'self'/); // el iframe de miniatura del panel es del mismo origen
  assert.match(csp, /object-src 'none'/);
  assert.match(r.headers['permissions-policy'], /camera=\(\)/);
  assert.match(r.headers['permissions-policy'], /payment=\(\)/);
  assert.equal(r.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(r.headers['x-robots-tag'], undefined);
  assert.equal((await get(app, '/admin/')).headers['x-robots-tag'], 'noindex, nofollow, noarchive');
  assert.equal((await get(app, '/api/auth/me')).headers['x-robots-tag'], 'noindex, nofollow, noarchive');
});

test('HSTS solo con protocolo efectivo https (detrás de un proxy de confianza)', async () => {
  const plain = await mkApp({ trustProxy: false });
  assert.equal((await get(plain, '/')).headers['strict-transport-security'], undefined);
  // Sin confianza en el proxy, X-Forwarded-Proto se ignora.
  assert.equal((await get(plain, '/', { 'x-forwarded-proto': 'https' })).headers['strict-transport-security'], undefined);

  const px = await mkApp({ trustProxy: true });
  assert.equal((await get(px, '/')).headers['strict-transport-security'], undefined, 'http directo: sin HSTS');
  assert.equal((await get(px, '/', { 'x-forwarded-proto': 'http' })).headers['strict-transport-security'], undefined);
  for (const url of ['/', '/robots.txt', '/sitemap.xml', '/no/existe', '/admin/', '/healthz']) {
    assert.equal((await get(px, url, { 'x-forwarded-proto': 'https' })).headers['strict-transport-security'], HSTS, url);
  }
  assert.match(HSTS, /^max-age=\d{7,}$/);
});

test('GET /api/system/info muestra la URL pública (solo lectura) o null', async () => {
  for (const [publicUrl, want] of [['https://doc.ispmax.ec', 'https://doc.ispmax.ec'], ['', null]]) {
    const app = await mkApp({ publicUrl });
    await app.portal.ensureAdmin();
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin_seo', password: 'Clave-de-prueba-1' } });
    assert.equal(login.statusCode, 200);
    const ck = `portal_session=${login.cookies.find(c => c.name === 'portal_session').value}`;
    const r = await app.inject({ method: 'GET', url: '/api/system/info', headers: { cookie: ck } });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().site.publicUrl, want);
  }
});
