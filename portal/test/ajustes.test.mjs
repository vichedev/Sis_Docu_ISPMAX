import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
// Ajustes del panel, marca del sitio, ajustes internos, información del sistema y retención de paquetes de contenido.
// Usa TEST_DATABASE_URL (vacía sus tablas) y carpetas propias en work-test/ajustes-test/.
// Uso: node --test --test-concurrency=1 test/ajustes.test.mjs   (desde portal/)
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
process.env.PORTAL_ADMIN_USER = 'admin_ajustes';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
const RUN = path.join(PORTAL_ROOT, 'work-test', 'ajustes-test');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = path.join(RUN, 'data');
delete process.env.PORTAL_ALLOW_INTERNAL_SETTINGS; // aquí se prueba el comportamiento de producción
delete process.env.NODE_ENV;

const { buildApp } = await import('../server/index.mjs');
const { getInternal, fixedInternal, allowInternalTable } = await import('../server/settings.mjs');
const { applyBranding, normalizeWhatsapp, BRAND_NAME, WHATSAPP_URL } = await import('../server/ops/branding.mjs');
const { prepareWorkDir } = await import('../server/ops/publish.mjs');
const pg = (await import('pg')).default;

const PASS = 'Clave-de-prueba-1';
let app;
let ck;

before(async () => {
  safeRm(RUN);
  fs.mkdirSync(process.env.PORTAL_DATA_DIR, { recursive: true });
  const c = new pg.Client({ connectionString: TEST_URL });
  await c.connect();
  await resetTestDb(c);
  await c.end();
  app = await buildApp({ databaseUrl: TEST_URL, watchSite: false });
  await app.portal.ensureAdmin();
  const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin_ajustes', password: PASS } });
  ck = `portal_session=${r.cookies.find((x) => x.name === 'portal_session').value}`;
});
after(async () => {
  await app?.close().catch(() => {});
  safeRm(RUN);
});
const api = (method, url, payload) => app.inject({ method, url, payload, headers: { cookie: ck } });

test('ajustes internos: en producción se ignoran las filas de la tabla; con el indicador de pruebas se leen', async () => {
  const ctx = { repoRoot: 'C:/repo', getSetting: async (k) => ({ repo_path: 'C:/otra', build_command: 'npm run x', site_base: '/m/', restart_mode: 'respawn', backup_dir: 'C:/b' })[k] ?? null };
  assert.equal(allowInternalTable({}), false);
  assert.equal(allowInternalTable({ NODE_ENV: 'test' }), true);
  assert.equal(allowInternalTable({ PORTAL_ALLOW_INTERNAL_SETTINGS: '1' }), true);
  // producción: entorno o valor fijo
  assert.equal(await getInternal(ctx, 'repo_path', {}), 'C:/repo');
  assert.equal(await getInternal(ctx, 'repo_path', { PORTAL_REPO_PATH: 'D:/sistema' }), 'D:/sistema');
  assert.equal(await getInternal(ctx, 'build_command', {}), 'npm run build');
  assert.equal(await getInternal(ctx, 'site_base', {}), '/');
  assert.equal(await getInternal(ctx, 'site_base', { PORTAL_SITE_BASE: '/manual/' }), '/manual/');
  assert.equal(await getInternal(ctx, 'restart_mode', {}), 'exit');
  assert.equal(await getInternal(ctx, 'restart_mode', { PORTAL_RESTART_MODE: 'respawn' }), 'respawn');
  assert.equal(path.basename(await getInternal(ctx, 'backup_dir', { PORTAL_DATA_DIR: 'D:/datos' })), 'backups');
  // pruebas: la tabla manda
  assert.equal(await getInternal(ctx, 'repo_path', { NODE_ENV: 'test' }), 'C:/otra');
  assert.equal(await getInternal(ctx, 'build_command', { PORTAL_ALLOW_INTERNAL_SETTINGS: '1' }), 'npm run x');
  assert.equal(fixedInternal('git_branch', ctx, {}), undefined, 'la rama y el remoto ya no son ajustes');
});

test('WhatsApp: normalización a 8-15 dígitos', () => {
  assert.equal(normalizeWhatsapp('+593 95 996 7843'), '593959967843');
  assert.equal(normalizeWhatsapp('593959967843'), '593959967843');
  assert.equal(normalizeWhatsapp('(593) 95-996.7843'), '593959967843');
  assert.equal(normalizeWhatsapp('   '), '');
  assert.equal(normalizeWhatsapp(''), '');
  for (const no of ['1234567', '1234567890123456', 'abc', '593 95 abc 7843', '+593;95']) assert.equal(normalizeWhatsapp(no), null, no);
});

test('marca: sustituye el nombre y la URL de WhatsApp en cadenas cortas; vacío = intacto; no toca descripciones ni plugins', () => {
  const plugin = { name: 'p', apply() {} };
  const cfg = {
    title: BRAND_NAME,
    description: 'Manual de usuario de ISPMAX: guía práctica para administradores, operadores y técnicos de la plataforma de gestión de ISP.',
    logoText: BRAND_NAME,
    head: [['meta', { property: 'og:site_name', content: BRAND_NAME }]],
    themeConfig: {
      nav: [{ text: 'Soporte', link: WHATSAPP_URL }],
      socialLinks: [{ mode: 'link', content: WHATSAPP_URL }],
      footer: { message: `<a href="${WHATSAPP_URL}">Soporte</a> ${BRAND_NAME}`.padEnd(10) },
    },
    builderConfig: { html: { title: BRAND_NAME }, source: { x: BRAND_NAME } },
    plugins: [plugin],
  };
  assert.equal(applyBranding(cfg, {}), cfg, 'sin ajustes: la misma configuración');
  assert.equal(applyBranding(cfg, { title: '  ', whatsapp: '' }), cfg);
  const out = applyBranding(cfg, { title: 'Mi Manual de Prueba', whatsapp: '593999000111' });
  assert.equal(out.title, 'Mi Manual de Prueba');
  assert.equal(out.logoText, 'Mi Manual de Prueba');
  assert.equal(out.head[0][1].content, 'Mi Manual de Prueba');
  assert.equal(out.builderConfig.html.title, 'Mi Manual de Prueba');
  assert.equal(out.builderConfig.source.x, BRAND_NAME, 'el resto de builderConfig no se recorre');
  assert.equal(out.description, cfg.description);
  assert.equal(out.themeConfig.nav[0].link, 'https://wa.me/593999000111');
  assert.equal(out.themeConfig.socialLinks[0].content, 'https://wa.me/593999000111');
  assert.match(out.themeConfig.footer.message, /wa\.me\/593999000111/);
  assert.equal(out.plugins[0], plugin);
  assert.equal(cfg.title, BRAND_NAME, 'no modifica la original');
  // solo WhatsApp: el título queda
  const wa = applyBranding(cfg, { whatsapp: '593111222333' });
  assert.equal(wa.title, BRAND_NAME);
  assert.equal(wa.themeConfig.nav[0].link, 'https://wa.me/593111222333');
  // texto largo con el nombre: no se toca
  const largo = applyBranding({ x: `${BRAND_NAME} ${'a'.repeat(200)}` }, { title: 'Otro' });
  assert.match(largo.x, /^Manual ISPMAX/);
});

test('envoltorio de configuración: igual que antes con ajustes vacíos; con marca importa portal-branding.mjs', async () => {
  const repo = path.join(RUN, 'repo');
  fs.mkdirSync(path.join(repo, 'node_modules', '@rspress', 'core'), { recursive: true });
  for (const d of ['scripts', 'src', 'styles', 'theme']) fs.mkdirSync(path.join(repo, d), { recursive: true });
  for (const [f, t] of [['rspress.config.ts', 'export default { title: "Manual ISPMAX" };\n'], ['tsconfig.json', '{}'], ['package.json', '{}'], ['package-lock.json', '{}']]) fs.writeFileSync(path.join(repo, f), t);
  const log = () => {};
  const ws = path.join(process.env.PORTAL_WORK_DIR, 'site');
  await prepareWorkDir(repo, log, { base: '/' });
  const plain = fs.readFileSync(path.join(ws, 'rspress.config.ts'), 'utf8');
  assert.ok(!plain.includes('applyBranding') && plain.includes('const rc: any = repoConfig;'));
  assert.ok(!fs.existsSync(path.join(ws, 'portal-branding.mjs')));
  await prepareWorkDir(repo, log, { base: '/', title: 'Mi Manual de Prueba', whatsapp: '593999000111' });
  const branded = fs.readFileSync(path.join(ws, 'rspress.config.ts'), 'utf8');
  assert.match(branded, /import \{ applyBranding \} from '\.\/portal-branding\.mjs'/);
  assert.match(branded, /"Mi Manual de Prueba"/);
  assert.ok(fs.existsSync(path.join(ws, 'portal-branding.mjs')));
  // Mismo envoltorio salvo la marca
  assert.equal(branded.replace(/\/\/ @ts-ignore\nimport \{ applyBranding.*\n/, '').replace(/const rc: any = applyBranding.*\n/, 'const rc: any = repoConfig;\n'), plain);
  await prepareWorkDir(repo, log, { base: '/' });
  assert.ok(!fs.existsSync(path.join(ws, 'portal-branding.mjs')), 'al vaciar los ajustes desaparece');
});

test('GET /api/system/info: forma del contrato, sin secretos ni rutas del servidor', async () => {
  const r = await api('GET', '/api/system/info');
  assert.equal(r.statusCode, 200, r.body);
  const j = r.json();
  assert.deepEqual(Object.keys(j).sort(), ['access', 'dataDir', 'database', 'restartMode', 'runtime', 'site', 'update', 'version']);
  assert.equal(j.database.connected, true);
  assert.ok(j.database.name && j.database.serverVersion);
  assert.deepEqual(Object.keys(j.database).sort(), ['connected', 'name', 'serverVersion']);
  assert.deepEqual(Object.keys(j.access).sort(), ['adminEnabled', 'adminIpRestricted', 'behindProxy', 'cookieSecure']);
  assert.equal(typeof j.access.adminIpRestricted, 'boolean');
  assert.ok(['auto', 'on'].includes(j.access.cookieSecure));
  assert.equal(typeof j.runtime.docker, 'boolean');
  assert.match(j.runtime.node, /^v\d+/);
  assert.ok(j.runtime.uptimeSec >= 0);
  assert.equal(j.site.base, '/');
  assert.equal(j.update.mode, 'inline');
  assert.equal(j.restartMode, 'exit');
  const txt = r.body;
  const url = new URL(TEST_URL);
  for (const secret of [url.password, url.username, PASS, PORTAL_ROOT, RUN, 'DATABASE_URL', 'postgres://']) {
    if (secret) assert.ok(!txt.includes(secret), `no debe aparecer ${secret.slice(0, 6)}…`);
  }
  assert.equal((await app.inject({ method: 'GET', url: '/api/system/info' })).statusCode, 401);
});

test('paquetes de contenido: backup_keep conserva los N más recientes y nunca el único ni el recién creado; carpeta fija', async () => {
  assert.equal((await api('PUT', '/api/settings', { backup_keep: 2 })).statusCode, 200);
  const ids = [];
  for (let i = 0; i < 4; i++) {
    const r = await api('POST', '/api/content/export', {});
    assert.equal(r.statusCode, 200, r.body);
    ids.push(r.json().id);
  }
  const files = (await api('GET', '/api/content/files')).json();
  assert.equal(files.items.length, 2);
  assert.deepEqual(files.items.map((x) => x.id), [ids[3], ids[2]], 'quedan los dos más recientes');
  assert.ok(!('dir' in files), 'sin ruta del servidor');
  assert.ok(files.items.every((x) => x.exists));
  const dir = path.join(process.env.PORTAL_DATA_DIR, 'backups', 'content');
  assert.equal(fs.readdirSync(dir).filter((f) => f.endsWith('.ispmax')).length, 2);
  assert.equal(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length, 2, 'también sus metadatos');
  assert.ok(!('dir' in (await api('GET', '/api/content/summary')).json()));
  // con 1 se queda exactamente el más reciente
  assert.equal((await api('PUT', '/api/settings', { backup_keep: 1 })).statusCode, 200);
  const last = (await api('POST', '/api/content/export', {})).json().id;
  const f2 = (await api('GET', '/api/content/files')).json().items;
  assert.deepEqual(f2.map((x) => x.id), [last]);
  assert.ok(!('dir' in (await api('GET', '/api/backups')).json()));
  await api('PUT', '/api/settings', { backup_keep: 20 });
});
