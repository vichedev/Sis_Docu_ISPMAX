// Manual DINÁMICO integrado en el portal (PORTAL_RENDER_MODE=dynamic, por defecto): server/http/frontend.mjs +
// server/ops/site-dynamic.mjs + portal/site/engine.mjs, contra la API real.
//   · servir: portada, páginas, 404 (estado y cuerpo idénticos para cualquier ruta), HEAD, ETag/304, cabeceras de
//     seguridad y caché, compresión br/gzip, base /manual/ con su redirección, recursos del tema, imágenes y tours de la
//     BD, iconos, «se está preparando» sin páginas y aviso claro sin tema compilado; /healthz.
//   · guardar = en vivo: editar, crear, publicar, despublicar, mover y borrar por la API → visible en la siguiente
//     petición; las demás páginas siguen en caché; compilación en segundo plano; menú y buscador al día; marca.
//   · API: /api/site/status (contrato), /api/site/rebuild (vacía la caché, sin trabajos), /api/settings sin
//     auto_publish, /api/stats, /api/system/info con métricas; avisos de enlaces rotos al guardar.
//   · caché: LRU con límite de bytes y avalancha de peticiones a la misma página = un solo pintado.
//   · limpieza al arrancar: restos del sitio estático y poda de publish_jobs.
// Usa TEST_DATABASE_URL (vacía sus tablas). Uso: node --test --test-concurrency=1 test/site-dynamic.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';
import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
import { ensureTheme } from './helpers/theme.mjs';

loadEnv();
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('Falta TEST_DATABASE_URL');
if (TEST_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
process.env.DATABASE_URL = TEST_URL;
process.env.PORTAL_ADMIN_USER = 'admin_dyn';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
delete process.env.PORTAL_RENDER_MODE;
delete process.env.PORTAL_SITE_BASE;
const RUN = path.join(PORTAL_ROOT, 'work-test', 'site-dynamic-test');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = path.join(RUN, 'data');
const WEB = path.join(RUN, 'web');
ensureTheme();

const { buildApp } = await import('../server/index.mjs');
const { parseIpAllowList } = await import('../server/config.mjs');
const { ByteLRU, ThemeMissingError } = await import('../site/engine.mjs');
const pg = (await import('pg')).default;

const apps = [];
let app;
let pool;
let admin;
let editor;
const write = (root, rel, content) => {
  const p = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};
async function mk(config = {}) {
  const a = await buildApp({ databaseUrl: TEST_URL, watchSite: false, config: { webDist: WEB, trustProxy: false, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), probeThreshold: 100000, ...config } });
  apps.push(a);
  return a;
}
const get = (url, headers = {}, a = app) => a.inject({ method: 'GET', url, headers });
async function login(a, username, password) {
  const r = await a.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });
  assert.equal(r.statusCode, 200, r.body);
  return `portal_session=${r.cookies.find((c) => c.name === 'portal_session').value}`;
}
const api = (method, url, cookie, payload, a = app) => a.inject({ method, url, headers: { cookie }, payload });
const engine = (a = app) => a.portal.ctx.siteRuntime.engine;
const art = (h) => h.slice(h.indexOf('<article'), h.indexOf('</article>'));
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ficticio')]);

async function seed() {
  await pool.query(`INSERT INTO pages (route, file_path, seccion, title, description, grupo, orden, status, body, frontmatter) VALUES
    ('/', 'index.mdx', 'raiz', 'Inicio', 'Portada', '', 0, 'published', '# Inicio\n\nPortada del manual dinámico.', '{"title":"Inicio","description":"Portada"}'),
    ('/guia/inicio', 'guia/inicio.mdx', 'guia', 'Guía de inicio', 'Primera pantalla', '', 1, 'published',
      E'<Kicker>Guía</Kicker>\n\n# Guía de inicio\n\nTexto de la guía.\n\n<Figure src="/assets/imgs/demo/01.webp" alt="Captura" width={100} height={50} />\n\nVer [registrar](/tareas/general/registrar).\n',
      '{"title":"Guía de inicio","description":"Primera pantalla"}'),
    ('/tareas', 'tareas/index.mdx', 'tareas', 'Quiero hacer…', '', '', 0, 'published', '# x', '{"title":"Quiero hacer…"}'),
    ('/tareas/general/registrar', 'tareas/general/registrar.mdx', 'tareas', 'Registrar un pago', 'Cómo registrar un pago', 'Cobranza', 1, 'published',
      E'# Registrar un pago\n\n:::tip\nAviso de prueba.\n:::\n', '{"title":"Registrar un pago","description":"Cómo registrar un pago","grupo":"Cobranza","orden":1,"modulo":"general","tipo":"tarea"}'),
    ('/tareas/general/borrador', 'tareas/general/borrador.mdx', 'tareas', 'Borrador oculto', '', 'Cobranza', 2, 'draft', '# Borrador', '{"title":"Borrador oculto"}')`);
  await pool.query("INSERT INTO assets (path, mime, bytes, width, height, size) VALUES ('imgs/demo/01.webp', 'image/webp', $1, 100, 50, $2), ('imgs/demo/raro.svg', 'image/svg+xml', $3, 10, 10, 20)", [
    WEBP,
    WEBP.length,
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
  ]);
  await pool.query("INSERT INTO tours (slug, title, steps, status) VALUES ('demo', 'Tour de prueba', '[]', 'published')");
  await pool.query("INSERT INTO site_files (path, content) VALUES ('docs/sidebar.json', $1)", [JSON.stringify([{ sectionHeader: 'Primeros pasos', items: [{ text: 'Guía de inicio', link: '/guia/inicio' }] }])]);
}

before(async () => {
  safeRm(RUN);
  write(WEB, 'index.html', '<!doctype html><title>Panel</title><div id="root"></div>');
  // Restos del flujo estático que el modo dinámico debe borrar al arrancar (solo en sus carpetas).
  write(path.join(RUN, 'work'), 'site/docs/guia/x.mdx', 'viejo');
  write(path.join(RUN, 'data'), 'site/index.html', 'x'.repeat(10_000));
  write(path.join(RUN, 'data'), 'site.old-7/index.html', 'viejo');
  write(path.join(RUN, 'data'), 'site-meta.json', '{"base":"/"}');
  write(path.join(RUN, 'data'), 'backups/conservar.txt', 'no se toca');
  pool = new pg.Pool({ connectionString: TEST_URL });
  await resetTestDb(pool);
  // 30 trabajos «publish» antiguos con registros largos + uno de importación reciente (no se toca).
  for (let i = 0; i < 30; i++) await pool.query("INSERT INTO publish_jobs (kind, status, log, finished_at) VALUES ('publish', 'ok', $1, now())", [`inicio ${i}\n` + 'línea de build\n'.repeat(4000) + `RESULTADO: {"pages":${i}}\n`]);
  await pool.query("INSERT INTO publish_jobs (kind, status, log, finished_at) VALUES ('import', 'ok', $1, now())", ['importación\n'.repeat(5000)]);
  await seed();
  app = await mk();
  await app.portal.ensureAdmin();
  admin = await login(app, 'admin_dyn', 'Clave-de-prueba-1');
  assert.equal((await api('POST', '/api/users', admin, { username: 'editor_dyn', password: 'Clave-Segura-2026', role: 'editor' })).statusCode, 201);
  editor = await login(app, 'editor_dyn', 'Clave-Segura-2026');
});
after(async () => {
  for (const a of apps) await a.close().catch(() => {});
  delete process.env.PORTAL_SITE_BASE;
  await pool?.end();
  safeRm(RUN);
});

test('al arrancar: borra los restos del sitio estático (solo los suyos) y poda publish_jobs', async () => {
  assert.ok(!fs.existsSync(path.join(RUN, 'work', 'site')), 'work/site');
  assert.ok(!fs.existsSync(path.join(RUN, 'data', 'site')), 'data/site');
  assert.ok(!fs.existsSync(path.join(RUN, 'data', 'site.old-7')), 'data/site.old-*');
  assert.ok(!fs.existsSync(path.join(RUN, 'data', 'site-meta.json')), 'site-meta.json');
  assert.ok(fs.existsSync(path.join(RUN, 'data', 'backups', 'conservar.txt')), 'el resto de data/ no se toca');
  const jobs = (await pool.query("SELECT kind, length(log) AS n, log FROM publish_jobs ORDER BY id")).rows;
  const pub = jobs.filter((j) => j.kind === 'publish');
  assert.equal(pub.length, 20, 'quedan los 20 últimos «publish»');
  assert.ok(pub.every((j) => j.n < 16_000 && /RESULTADO: \{"pages":\d+\}/.test(j.log)), 'registros recortados conservando RESULTADO');
  assert.equal(jobs.find((j) => j.kind === 'import').n, 'importación\n'.repeat(5000).length, 'una importación reciente no se toca');
  const m = (await api('GET', '/api/system/info', admin)).json().site.metrics;
  assert.ok(m.cleanup.removed >= 4 && m.cleanup.freedMB >= 0, JSON.stringify(m.cleanup));
});

test('servir: portada, página, URLs limpias, HEAD, 404 con estado 404 e idéntico para cualquier ruta', async () => {
  let r = await get('/');
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.match(r.body, /Portada del manual dinámico/);
  assert.match(r.body, /<div id="__rspress_root">/);
  r = await get('/guia/inicio');
  assert.equal(r.statusCode, 200);
  assert.match(art(r.body), /Texto de la guía/);
  assert.equal((await get('/guia/inicio.html')).statusCode, 200);
  for (const u of ['/tareas', '/tareas/', '/tareas.html']) assert.equal((await get(u)).statusCode, 200, u);
  const head = await app.inject({ method: 'HEAD', url: '/guia/inicio' });
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, '');
  const a = await get('/no/existe');
  const b = await get('/otra-ruta-inexistente-7f3a');
  assert.equal(a.statusCode, 404);
  assert.equal(a.body, b.body, 'mismo cuerpo para cualquier ruta inexistente');
  assert.equal(a.headers.etag, b.headers.etag);
  assert.match(a.body, /No encontramos esta página del manual/);
  assert.equal((await get('/tareas/general/borrador')).statusCode, 404, 'un borrador no se ve');
  assert.equal((await app.inject({ method: 'POST', url: '/guia/inicio' })).statusCode, 404);
  // compatibilidad con la base antigua
  const old = await get('/manual/guia/inicio?x=1');
  assert.equal(old.statusCode, 301);
  assert.equal(old.headers.location, '/guia/inicio?x=1');
});

test('cabeceras de seguridad y caché, ETag/304 y compresión br/gzip', async () => {
  const r = await get('/guia/inicio');
  assert.equal(r.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.match(r.headers['content-security-policy'], /^default-src 'self';.*frame-ancestors 'self'/);
  assert.equal(r.headers['cache-control'], 'no-cache');
  assert.ok(r.headers.etag);
  assert.equal(r.headers['x-site-cache'], undefined, 'sin cabeceras internas');
  assert.equal((await get('/guia/inicio', { 'if-none-match': r.headers.etag })).statusCode, 304);
  assert.equal((await get('/guia/inicio', { 'if-none-match': `W/${r.headers.etag}, "otro"` })).statusCode, 304);
  const br = await get('/guia/inicio', { 'accept-encoding': 'gzip, br' });
  assert.equal(br.headers['content-encoding'], 'br');
  assert.match(br.headers.vary, /accept-encoding/i);
  assert.match(zlib.brotliDecompressSync(br.rawPayload).toString(), /Texto de la guía/);
  const gz = await get('/guia/inicio', { 'accept-encoding': 'gzip' });
  assert.equal(gz.headers['content-encoding'], 'gzip');
  assert.match(zlib.gunzipSync(gz.rawPayload).toString(), /Texto de la guía/);
  assert.equal((await get('/guia/inicio', { 'accept-encoding': 'br;q=0, gzip' })).headers['content-encoding'], 'gzip');
});

test('recursos: tema (inmutable), datos del sitio, módulos de página, buscador, imágenes y tours de la BD, iconos', async () => {
  const html = (await get('/guia/inicio')).body;
  const css = /href="(\/_site\/assets\/[^"]+\.css)"/.exec(html)[1];
  const js = /src="(\/_site\/assets\/[^"]+\.js)"/.exec(html)[1];
  const boot = /src="(\/_site\/boot\.[\w-]+\.js)"/.exec(html)[1];
  const font = /rel="preload" as="font" type="font\/woff2" href="(\/_site\/assets\/[^"]+\.woff2)"/.exec(html)?.[1];
  assert.ok(font, 'la precarga de fuentes apunta al tema compilado');
  for (const u of [css, js, boot, font]) {
    const r = await get(u);
    assert.equal(r.statusCode, 200, u);
    assert.equal(r.headers['cache-control'], 'public, max-age=31536000, immutable', u);
  }
  assert.match((await get(boot)).body, /^window\.__ISP_ASSET_BASE__="\/_site\/";window\.__ISP_SITE__=/);
  const mod = await get('/_site/p/guia/inicio.js');
  assert.equal(mod.statusCode, 200);
  assert.match(mod.headers['content-type'], /javascript/);
  assert.equal(mod.headers['cache-control'], 'no-cache');
  assert.equal((await get('/_site/p/guia/inicio.js', { 'if-none-match': mod.headers.etag })).statusCode, 304);
  assert.equal((await get('/_site/p/tareas/index.js')).statusCode, 200, 'portada de sección');
  assert.equal((await get('/_site/p/tareas/general/borrador.js')).statusCode, 404);
  const s = await get('/_site/search.json');
  assert.equal(s.statusCode, 200);
  assert.ok(s.json().docs.some((d) => d.r === '/tareas/general/registrar'));
  assert.ok(!s.json().docs.some((d) => d.r === '/tareas/general/borrador'));
  const img = await get('/assets/imgs/demo/01.webp');
  assert.equal(img.statusCode, 200);
  assert.equal(img.headers['content-type'], 'image/webp');
  assert.equal(img.headers['cache-control'], 'public, max-age=3600, must-revalidate');
  assert.equal((await get('/assets/imgs/demo/01.webp', { 'if-none-match': img.headers.etag })).statusCode, 304);
  assert.equal((await get('/assets/imgs/demo/raro.svg')).statusCode, 404, 'solo imágenes de mapa de bits');
  const tour = await get('/assets/tours/demo.json');
  assert.equal(tour.statusCode, 200);
  assert.equal(tour.headers['cache-control'], 'no-cache');
  assert.equal(tour.json().slug, 'demo');
  assert.equal((await get('/favicon.ico')).statusCode, 200);
  for (const bad of ['/_site/boot.zz.js', '/_site/assets/../../server/index.mjs', '/_site/p/../../.env.js', '/_site/x', '/assets/../package.json', '/_site/assets/entry.js']) {
    const r = await get(bad);
    assert.ok([400, 404].includes(r.statusCode), `${bad} → ${r.statusCode}`);
  }
});

test('/healthz: site=true con tema y páginas publicadas', async () => {
  const r = await get('/healthz');
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), { ok: true, db: true, site: true });
});

test('guardar = en vivo: editar el cuerpo por la API se ve en la siguiente petición; las demás páginas siguen en caché', async () => {
  await get('/tareas/general/registrar');
  await get('/guia/inicio');
  const p = (await pool.query("SELECT id, version, body FROM pages WHERE route = '/guia/inicio'")).rows[0];
  const hits0 = engine().stats().counters.htmlHits;
  const t0 = performance.now();
  const r = await api('PUT', `/api/pages/${p.id}`, editor, { version: p.version, body: p.body.replace('Texto de la guía.', 'Texto EDITADO en vivo.') });
  assert.equal(r.statusCode, 200, r.body);
  const after = await get('/guia/inicio');
  const ms = performance.now() - t0;
  assert.match(art(after.body), /Texto EDITADO en vivo/);
  assert.ok(ms < 3000, `visible en ${Math.round(ms)} ms`);
  const other = await get('/tareas/general/registrar');
  assert.equal(other.statusCode, 200);
  assert.ok(engine().stats().counters.htmlHits > hits0, 'la otra página salió de la caché');
  // el módulo de navegación también cambia
  assert.match((await get('/_site/p/guia/inicio.js')).body, /EDITADO/);
  console.log(`# edición visible en ${Math.round(ms)} ms (guardado + siguiente petición)`);
});

test('compilación en segundo plano al guardar: nadie espera la compilación tras un guardado', async () => {
  const p = (await pool.query("SELECT id, version, body FROM pages WHERE route = '/tareas/general/registrar'")).rows[0];
  const c0 = engine().stats().counters.compiles;
  assert.equal((await api('PUT', `/api/pages/${p.id}`, editor, { version: p.version, body: p.body + '\nOtra línea.\n' })).statusCode, 200);
  for (let i = 0; i < 50 && engine().stats().counters.compiles === c0; i++) await new Promise((r) => setTimeout(r, 100));
  assert.ok(engine().stats().counters.compiles > c0, 'compilada sin que nadie la pida');
  const misses = engine().stats().counters.htmlMisses;
  const r = await get('/tareas/general/registrar');
  assert.match(r.body, /Otra línea/);
  assert.equal(engine().stats().counters.htmlMisses, misses, 'ya estaba pintada');
});

test('título (menú de todas las páginas), página nueva, borrador, despublicar, mover y borrar: al instante', async () => {
  const t = (await pool.query("SELECT id, version FROM pages WHERE route = '/tareas/general/registrar'")).rows[0];
  assert.equal((await api('PUT', `/api/pages/${t.id}`, editor, { version: t.version, title: 'Registrar un cobro' })).statusCode, 200);
  const hub = (await get('/tareas/')).body;
  assert.match(art(hub), /Registrar un cobro/, 'la portada de sección generada');
  assert.match(hub.slice(0, hub.indexOf('<article')), /Registrar un cobro/, 'el menú lateral de las demás páginas de la sección');
  assert.match((await get('/_site/boot.' + engine().structure().hash + '.js')).body, /Registrar un cobro/, 'la lista de páginas del sitio');
  // página nueva: borrador (404) → publicada (200, menú, portada y buscador)
  const c = await api('POST', '/api/pages', editor, { seccion: 'tareas', modulo: 'general', slug: 'nueva-prueba', tipo: 'tarea', title: 'Página nueva de prueba', description: 'Creada en la prueba' });
  assert.equal(c.statusCode, 201, c.body);
  const page = c.json();
  assert.equal((await get(page.route)).statusCode, 404);
  const pub = await api('PUT', `/api/pages/${page.id}`, editor, { version: page.version, status: 'published', body: '# Página nueva de prueba\n\nHola.\n\nEnlace roto: [x](/guia/no-existe-zz).\n' });
  assert.equal(pub.statusCode, 200, pub.body);
  assert.deepEqual(pub.json().linkWarnings.map((w) => w.level), ['warning'], 'aviso de enlace roto (no bloquea)');
  assert.match(pub.json().linkWarnings[0].message, /no-existe-zz/);
  let r = await get(page.route);
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /Hola\./);
  assert.match((await get('/tareas/')).body, /Página nueva de prueba/);
  assert.ok((await get('/_site/search.json')).json().docs.some((d) => d.r === page.route));
  // despublicar → 404
  let v = pub.json().version;
  const un = await api('POST', `/api/pages/${page.id}/unpublish`, editor, { version: v });
  assert.equal(un.statusCode, 200, un.body);
  assert.equal((await get(page.route)).statusCode, 404);
  v = un.json().version;
  assert.equal((await api('POST', `/api/pages/${page.id}/publish`, editor, { version: v })).statusCode, 200);
  assert.equal((await get(page.route)).statusCode, 200);
  // mover: la ruta nueva responde; la antigua ya no es una página (la redirección la resuelve el cliente, como antes)
  const mv = await api('POST', `/api/pages/${page.id}/move`, editor, { slug: 'nueva-movida' });
  assert.equal(mv.statusCode, 200, mv.body);
  assert.equal((await get('/tareas/general/nueva-movida')).statusCode, 200);
  assert.equal((await get(page.route)).statusCode, 404);
  assert.match((await get('/_site/boot.' + engine().structure().hash + '.js')).body, /nueva-prueba/, 'legacyRoutes con la redirección');
  // borrar → 404
  assert.equal((await api('DELETE', `/api/pages/${page.id}`, editor)).statusCode, 200);
  assert.equal((await get('/tareas/general/nueva-movida')).statusCode, 404);
});

test('marca (site_title) y base del sitio /manual/: sin reiniciar ni construir', async () => {
  assert.equal((await api('PUT', '/api/settings', admin, { site_title: 'Manual de Pruebas Zeta' })).statusCode, 200);
  assert.match((await get('/guia/inicio')).body, /Manual de Pruebas Zeta/);
  assert.equal((await api('PUT', '/api/settings', admin, { site_title: '' })).statusCode, 200);
  assert.doesNotMatch((await get('/guia/inicio')).body, /Manual de Pruebas Zeta/);
  process.env.PORTAL_SITE_BASE = '/manual/';
  try {
    const m = await mk({ siteCleanup: false });
    let r = await get('/', {}, m);
    assert.equal(r.statusCode, 302);
    assert.equal(r.headers.location, '/manual/');
    assert.equal((await get('/manual', {}, m)).headers.location, '/manual/');
    r = await get('/manual/guia/inicio', {}, m);
    assert.equal(r.statusCode, 200);
    assert.match(r.body, /src="\/manual\/_site\/assets\/entry-client-[\w-]+\.js"/);
    assert.match(r.body, /src="\/manual\/_site\/boot\./);
    assert.match(r.body, /src="\/manual\/assets\/imgs\/demo\/01\.webp"/, '<Figure> con la base');
    const font = /rel="preload" as="font" type="font\/woff2" href="([^"]+)"/.exec(r.body)[1];
    assert.match(font, /^\/manual\/_site\/assets\//, 'precarga de fuentes con la base');
    assert.equal((await get(font, {}, m)).statusCode, 200);
    assert.match((await get(/src="(\/manual\/_site\/boot\.[\w-]+\.js)"/.exec(r.body)[1], {}, m)).body, /__ISP_ASSET_BASE__="\/manual\/_site\/"/);
    assert.equal((await get('/manual/assets/imgs/demo/01.webp', {}, m)).statusCode, 200);
    assert.equal((await get('/manual/_site/p/guia/inicio.js', {}, m)).statusCode, 200);
    const nf = await get('/guia/inicio', {}, m);
    assert.equal(nf.statusCode, 404, 'fuera de la base');
    assert.equal(nf.body, (await get('/manual/no-existe', {}, m)).body, 'el mismo 404');
  } finally {
    delete process.env.PORTAL_SITE_BASE;
  }
});

test('API: /api/site/status (contrato), rebuild vacía la caché sin trabajos, ajustes sin auto_publish, stats y system/info', async () => {
  const s = (await api('GET', '/api/site/status', editor)).json();
  for (const k of ['mode', 'state', 'live', 'cache', 'themeBuiltAt', 'lastChange', 'drafts', 'siteUrl']) assert.ok(k in s, k);
  assert.equal(s.mode, 'dynamic');
  assert.equal(s.state, 'live');
  assert.equal(s.live, true);
  assert.deepEqual(Object.keys(s.cache).sort(), ['bytes', 'compiled', 'htmlCached', 'pages']);
  assert.ok(s.cache.pages >= 4 && s.cache.compiled > 0 && s.cache.bytes > 0, JSON.stringify(s.cache));
  assert.match(s.themeBuiltAt, /^\d{4}-\d\d-\d\dT/);
  assert.ok(s.lastChange?.at && 'route' in s.lastChange);
  assert.equal(s.drafts, 1);
  assert.equal(s.siteUrl, '/');
  assert.equal(s.message, undefined);
  const jobs0 = (await pool.query('SELECT count(*)::int AS n FROM publish_jobs')).rows[0].n;
  const rb = await api('POST', '/api/site/rebuild', editor);
  assert.equal(rb.statusCode, 200, rb.body);
  assert.equal(rb.json().ok, true);
  assert.ok(rb.json().cleared > 0);
  assert.equal((await api('POST', '/api/site/rebuild', (await login(app, 'admin_dyn', 'Clave-de-prueba-1')))).statusCode, 200);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM publish_jobs')).rows[0].n, jobs0, 'sin trabajos «publish» nuevos');
  assert.equal((await get('/guia/inicio')).statusCode, 200, 'tras vaciar, se vuelve a pintar');
  const set = (await api('GET', '/api/settings', admin)).json();
  assert.ok(!set.definitions.some((d) => /^auto_publish/.test(d.key)));
  assert.ok(!('auto_publish' in set.settings) && !('auto_publish_delay' in set.settings));
  assert.equal((await api('PUT', '/api/settings', admin, { auto_publish: false })).statusCode, 400);
  const st = (await api('GET', '/api/stats', admin)).json();
  assert.deepEqual(st.unpublished, { pages: 0, assets: 0, tours: 0, total: 0 });
  assert.equal(st.lastPublish, null);
  const info = (await api('GET', '/api/system/info', admin)).json();
  assert.equal(info.site.mode, 'dynamic');
  for (const k of ['pages', 'compiled', 'htmlCached', 'bytes', 'compiles', 'avgCompileMs', 'renders', 'avgRenderMs', 'memoryMB', 'cacheLimitMB']) assert.ok(k in info.site.metrics, k);
  assert.equal(info.site.metrics.cacheLimitMB, 256);
  assert.equal(info.site.metrics.compiler.sandboxed, true);
  assert.ok(!JSON.stringify(info).includes(PORTAL_ROOT), 'sin rutas del servidor');
  const ps = (await api('GET', '/api/publish/status', editor)).json();
  assert.equal(ps.running, false);
  assert.equal(ps.site.mode, 'dynamic');
});

test('caché: LRU con límite de bytes; avalancha de peticiones a una página sin caché = un solo pintado', async () => {
  const lru = new ByteLRU(1000);
  lru.set('h:/a', 'a', 400);
  lru.set('h:/b', 'b', 400);
  lru.get('h:/a'); // /a se usa: /b es la más antigua
  lru.set('c:x', 'x', 400);
  assert.equal(lru.peek('h:/b'), undefined, 'expulsa la menos usada');
  assert.equal(lru.peek('h:/a'), 'a');
  assert.ok(lru.bytes <= 1000);
  assert.equal(lru.evictions, 1);
  const e = engine();
  e.clear();
  await e.ensureFresh();
  const r0 = e.stats().counters.renders;
  const all = await Promise.all(Array.from({ length: 25 }, () => get('/guia/inicio')));
  assert.ok(all.every((x) => x.statusCode === 200));
  assert.equal(new Set(all.map((x) => x.headers.etag)).size, 1);
  assert.equal(e.stats().counters.renders - r0, 1, 'un solo pintado para 25 peticiones simultáneas');
  assert.ok(e.stats().limitBytes === 256 * 1048576);
});

test('sin páginas publicadas: «se está preparando» (503) y healthz.site=false; sin tema compilado: aviso claro y estado error', async () => {
  await pool.query("UPDATE pages SET status = 'draft' WHERE status = 'published'");
  try {
    app.portal.ctx.frontend.refresh();
    engine().invalidate({});
    const r = await get('/');
    assert.equal(r.statusCode, 503);
    assert.match(r.body, /El manual se está preparando/);
    assert.equal(r.headers['cache-control'], 'no-store');
    app.portal.ctx.frontend.refresh();
    assert.equal((await get('/healthz')).json().site, false);
  } finally {
    await pool.query("UPDATE pages SET status = 'published' WHERE route IN ('/', '/guia/inicio', '/tareas', '/tareas/general/registrar')");
    app.portal.ctx.frontend.refresh();
    engine().invalidate({});
  }
  const noTheme = await mk({
    siteCleanup: false,
    siteEngineFactory: async () => {
      throw new ThemeMissingError('no existe site/dist/server/entry-server.js');
    },
  });
  const r = await get('/guia/inicio', {}, noTheme);
  assert.equal(r.statusCode, 503);
  assert.match(r.body, /no está disponible/);
  assert.doesNotMatch(r.body, /site:build|entry-server|[A-Z]:\\/, 'sin detalles internos en público');
  assert.equal((await get('/healthz', {}, noTheme)).json().site, false);
  const cookie = await login(noTheme, 'admin_dyn', 'Clave-de-prueba-1');
  const s = (await api('GET', '/api/site/status', cookie, undefined, noTheme)).json();
  assert.equal(s.state, 'error');
  assert.equal(s.live, false);
  assert.match(s.message, /npm run site:build/);
  assert.equal((await api('POST', '/api/site/rebuild', cookie, undefined, noTheme)).statusCode, 503);
  assert.equal((await get('/api/auth/me', { cookie }, noTheme)).statusCode, 200, 'el panel y la API siguen');
});
