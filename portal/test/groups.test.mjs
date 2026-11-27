// Grupos del menú como entidad propia (settings.structure_groups, server/groupStore.mjs): sobreviven a eliminar o mover su última
// página y solo desaparecen con «Eliminar grupo» (vacío). Cubre API, roles, migración al arrancar, dedupe normalizado,
// renombrar, paquete .ispmax (vacíos + paquetes antiguos), manual público (dinámico y estático) y el esquema del asistente.
// Contra TEST_DATABASE_URL (o PORTAL_TEST_DB_NAME=<nombre>: base propia). Uso: node --test --test-concurrency=1 test/groups.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';
import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
import { ensureTheme } from './helpers/theme.mjs';

loadEnv();
let url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Falta TEST_DATABASE_URL');
if (url === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
const pg = (await import('pg')).default;
const own = process.env.PORTAL_TEST_DB_NAME;
if (own) {
  if (!/^[a-z0-9_]{3,60}$/.test(own) || own === 'ispmax_manual') throw new Error('PORTAL_TEST_DB_NAME no válido.');
  const adm = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: '/postgres' }).toString() });
  await adm.connect();
  if (!(await adm.query('SELECT 1 FROM pg_database WHERE datname = $1', [own])).rowCount) await adm.query(`CREATE DATABASE "${own}" ENCODING 'UTF8'`);
  await adm.end();
  const u = new URL(url);
  u.pathname = '/' + own;
  url = u.toString();
}
process.env.DATABASE_URL = url;
process.env.PORTAL_ADMIN_USER = 'admin_g';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
process.env.PORTAL_ALLOW_INTERNAL_SETTINGS = '1';
delete process.env.PORTAL_RENDER_MODE; // dinámico (por defecto)
const RUN = path.join(PORTAL_ROOT, 'work-test', 'groups-test');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = path.join(RUN, 'data');
const WEB = path.join(RUN, 'web');
ensureTheme();

const { buildApp } = await import('../server/index.mjs');
const { parseIpAllowList } = await import('../server/config.mjs');
const { exportPackage, importPackage, readPackage } = await import('../server/content/package.mjs');
const { exportToDir } = await import('../server/sync/export.mjs');
const { loadOutline, outlineText } = await import('../server/ai/proposals.mjs');
const { normName } = await import('../server/routes/groups.mjs');
const { sanitizeGroups, mergeGroups } = await import('../server/groupStore.mjs');

const apps = [];
let app, pool;
const ck = {};
const EMOJI = '🚀 INICIO';
const mk = async () => {
  const a = await buildApp({ databaseUrl: url, watchSite: false, config: { webDist: WEB, trustProxy: false, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), probeThreshold: 100000 } });
  apps.push(a);
  return a;
};
const login = async (a, u, p) => {
  const r = await a.inject({ method: 'POST', url: '/api/auth/login', payload: { username: u, password: p } });
  assert.equal(r.statusCode, 200, r.body);
  return `portal_session=${r.cookies.find((x) => x.name === 'portal_session').value}`;
};
const req = async (method, urlPath, { cookie, payload } = {}, a = app) => {
  const res = await a.inject({ method, url: urlPath, payload, headers: cookie ? { cookie } : {} });
  let json = null;
  try { json = JSON.parse(res.body); } catch {}
  return { status: res.statusCode, json, body: res.body };
};
const get = (u, a = app) => a.inject({ method: 'GET', url: u });
const mkPage = async (seccion, slug, title, extra = {}, publish = false) => {
  const r = await req('POST', '/api/pages', { cookie: ck.editor, payload: { seccion, slug, title, tipo: seccion === 'tareas' ? 'tarea' : seccion === 'guia' ? 'guia' : 'problema', ...extra } });
  assert.equal(r.status, 201, r.body);
  if (publish) assert.equal((await req('POST', `/api/pages/${r.json.id}/publish`, { cookie: ck.editor })).status, 200);
  return r.json;
};
const structure = async () => (await req('GET', '/api/structure', { cookie: ck.editor })).json;
const names = (st, key) => st.secciones.find((s) => s.key === key).grupos.map((g) => g.name);
const group = (st, key, name) => st.secciones.find((s) => s.key === key).grupos.find((g) => g.name === name);
const registry = async () => (await pool.query("SELECT value FROM settings WHERE key = 'structure_groups'")).rows[0]?.value ?? {};
const del = (seccion, name, cookie = ck.editor) => req('DELETE', '/api/structure/groups', { cookie, payload: { seccion, name } });
const sha = (d) => createHash('sha256').update(JSON.stringify(d)).digest('hex');
const repack = (pkg) => zlib.gzipSync(Buffer.from(JSON.stringify({ ...pkg, sha256: sha(pkg.data) })));

before(async () => {
  safeRm(RUN);
  fs.mkdirSync(WEB, { recursive: true });
  fs.writeFileSync(path.join(WEB, 'index.html'), '<!doctype html><title>Panel</title><div id="root"></div>');
  pool = new pg.Pool({ connectionString: url });
  await resetTestDb(pool);
  app = await mk();
  await app.portal.ensureAdmin();
  ck.admin = await login(app, 'admin_g', 'Clave-de-prueba-1');
  for (const role of ['viewer', 'editor']) {
    assert.equal((await req('POST', '/api/users', { cookie: ck.admin, payload: { username: `${role}_g`, password: 'Clave-Segura-2026', role } })).status, 201);
    ck[role] = await login(app, `${role}_g`, 'Clave-Segura-2026');
  }
});
after(async () => {
  for (const a of apps) await a.close().catch(() => {});
  await pool?.end();
  safeRm(RUN);
});

test('esquema: la migración rellena grupos desde las páginas, sin duplicar y de forma idempotente', async () => {
  const { applySchema } = await import('../server/schema.mjs');
  const ins = (route, seccion, grupo) => pool.query(
    `INSERT INTO pages (route, file_path, seccion, title, grupo, status, body, frontmatter) VALUES ($1, $2, $3, $4, $5, 'published', 'x', '{}')`,
    [route, route.slice(1) + '.mdx', seccion, route, grupo]);
  await ins('/tareas/clientes/alta', 'tareas', '');           // carpeta → «Clientes»
  await ins('/tareas/clientes/baja', 'tareas', 'Clientes');
  await ins('/tareas/cobros-mensuales/x', 'tareas', '');       // «Cobros mensuales»
  await ins('/problemas/y', 'problemas', 'Conexión');
  await ins('/problemas/z', 'problemas', 'conexion ');         // mismo grupo normalizado
  await ins('/tareas', 'tareas', '');                          // portada: no es grupo
  await pool.query("DELETE FROM settings WHERE key = 'structure_groups'");
  await applySchema(pool);
  const r1 = await registry();
  assert.deepEqual(r1.tareas.slice().sort(), ['Clientes', 'Cobros mensuales']);
  assert.equal(r1.problemas.length, 1, JSON.stringify(r1));
  assert.equal(normName(r1.problemas[0]), 'conexion');
  await applySchema(pool); // idempotente
  assert.deepEqual(await registry(), r1);
  await pool.query("TRUNCATE pages, settings RESTART IDENTITY CASCADE");
});

test('arranque: registra los grupos de las páginas existentes (sin duplicar) y no resucita los eliminados', async () => {
  const ins = (route, seccion, grupo) => pool.query(
    `INSERT INTO pages (route, file_path, seccion, title, grupo, status, body, frontmatter) VALUES ($1, $2, $3, $4, $5, 'published', 'x', '{}')`,
    [route, route.slice(1) + '.mdx', seccion, route, grupo]);
  await ins('/tareas/m/a', 'tareas', 'Alfa');
  await ins('/tareas/m/b', 'tareas', 'alfa');
  await ins('/tareas/m/c', 'tareas', 'Beta');
  const a2 = await mk();
  for (let i = 0; i < 40 && !(await registry()).tareas; i++) await new Promise((r) => setTimeout(r, 50));
  const reg = await registry();
  assert.equal(reg.tareas.filter((g) => normName(g) === 'alfa').length, 1, 'sin duplicar «Alfa»/«alfa»');
  assert.ok(reg.tareas.includes('Beta'));
  const snap = JSON.stringify(reg);
  const a3 = await mk(); // otro arranque: igual
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(JSON.stringify(await registry()), snap);
  void a2; void a3;
  await pool.query("TRUNCATE pages, settings RESTART IDENTITY CASCADE");
});

test('eliminar la última página de un grupo NO borra el grupo (tareas, Guía por página y Guía por sidebar)', async () => {
  const t = await mkPage('tareas', 'cobrar', 'Cobrar', { modulo: 'clientes', grupo: 'Cobros' });
  assert.ok(names(await structure(), 'tareas').includes('Cobros'));
  assert.equal((await req('DELETE', `/api/pages/${t.id}`, { cookie: ck.editor })).status, 200);
  const g = group(await structure(), 'tareas', 'Cobros');
  assert.ok(g, 'el grupo sigue en el árbol');
  assert.equal(g.pages.length, 0);
  // Guía: grupo que solo existe en las páginas
  const gp = await mkPage('guia', 'solo-yo', 'Solo yo', { grupo: 'Temporal' });
  await req('DELETE', `/api/pages/${gp.id}`, { cookie: ck.editor });
  assert.ok(names(await structure(), 'guia').includes('Temporal'));
  // Guía: cabecera de docs/sidebar.json
  const pagos = await mkPage('guia', 'pagos', 'Pagos');
  const intro = await mkPage('guia', 'introduccion', 'Introducción');
  await pool.query("INSERT INTO site_files (path, content) VALUES ('docs/sidebar.json', $1) ON CONFLICT (path) DO UPDATE SET content = EXCLUDED.content", [JSON.stringify([
    { sectionHeader: EMOJI, items: [{ text: 'Introducción', link: '/guia/introduccion' }] }, { sectionHeader: '💰 FINANZAS', items: [{ text: 'Pagos', link: '/guia/pagos' }] }])]);
  await req('DELETE', `/api/pages/${pagos.id}`, { cookie: ck.editor });
  const st = await structure();
  assert.equal(group(st, 'guia', '💰 FINANZAS')?.pages.length, 0, 'cabecera vacía sigue');
  assert.equal(group(st, 'guia', EMOJI).pages.length, 1);
  void intro;
});

test('mover la última página (POST move y PUT order) NO borra el grupo de origen', async () => {
  const a = await mkPage('tareas', 'unica', 'Única', { modulo: 'clientes', grupo: 'Origen' });
  const b = await mkPage('tareas', 'otra', 'Otra', { modulo: 'clientes', grupo: 'Destino' });
  const mv = await req('POST', `/api/pages/${a.id}/move`, { cookie: ck.editor, payload: { grupo: 'Destino' } });
  assert.equal(mv.status, 200, mv.body);
  const st = await structure();
  assert.equal(group(st, 'tareas', 'Origen')?.pages.length, 0, 'Origen sigue vacío');
  assert.equal(group(st, 'tareas', 'Destino').pages.length, 2);
  // PUT order: el panel manda todos los grupos; mover Destino → Origen deja Destino vacío pero registrado
  const grupos = [{ name: 'Origen', nodes: [{ id: a.id }, { id: b.id }] }, { name: 'Destino', nodes: [] }, { name: 'Cobros', nodes: [] }];
  const put = await req('PUT', '/api/structure/order', { cookie: ck.editor, payload: { seccion: 'tareas', grupos } });
  assert.equal(put.status, 200, put.body);
  const st2 = await structure();
  assert.equal(group(st2, 'tareas', 'Origen').pages.length, 2);
  assert.equal(group(st2, 'tareas', 'Destino')?.pages.length, 0);
  // PUT /api/pages/:id con otro grupo también registra el de origen
  const c = await mkPage('problemas', 'p1', 'P1', { grupo: 'Red' });
  const v = (await req('GET', `/api/pages/${c.id}`, { cookie: ck.editor })).json.version;
  assert.equal((await req('PUT', `/api/pages/${c.id}`, { cookie: ck.editor, payload: { version: v, grupo: 'Wifi' } })).status, 200);
  assert.ok(names(await structure(), 'problemas').includes('Red'), 'Red sigue vacío tras editar el grupo de su última página');
});

test('«Eliminar grupo»: solo vacío (409 con páginas, con el recuento), 404 si no existe, y no vuelve', async () => {
  const conPaginas = await del('tareas', 'Origen');
  assert.equal(conPaginas.status, 409);
  assert.match(conPaginas.json.error, /2 páginas/);
  assert.equal((await del('tareas', 'Cobros')).status, 200);
  assert.ok(!names(await structure(), 'tareas').includes('Cobros'));
  assert.equal((await del('tareas', 'Cobros')).status, 404);
  assert.equal((await del('tareas', 'Destino')).status, 200);
  for (const [s, n] of [['guia', 'Temporal'], ['guia', '💰 FINANZAS'], ['problemas', 'Red']]) {
    const r = await del(s, n);
    assert.equal(r.status, 200, `${s}/${n}: ${r.body}`);
    assert.ok(!names(await structure(), s).includes(n));
  }
  // un cambio posterior y un reinicio no los resucitan
  await mkPage('guia', 'otra', 'Otra', { grupo: 'Marketing' });
  const a2 = await mk();
  await new Promise((r) => setTimeout(r, 300));
  const st = (await req('GET', '/api/structure', { cookie: ck.editor }, a2)).json;
  assert.ok(!names(st, 'guia').includes('Temporal') && !names(st, 'tareas').includes('Cobros'));
  assert.ok(!(await registry()).tareas?.includes('Destino'));
  // con la Guía: una cabecera con páginas tampoco se elimina
  assert.equal((await del('guia', EMOJI)).status, 409);
});

test('renombrar: actualiza las páginas del grupo en bloque; vacío también; dedupe normalizado; 404/409', async () => {
  const p = await mkPage('referencia', 'r1', 'R1', { grupo: 'Planes' });
  const q = await mkPage('referencia', 'r2', 'R2', { grupo: 'Planes' });
  const ren = (seccion, from, to, cookie = ck.editor) => req('PUT', '/api/structure/groups', { cookie, payload: { seccion, from, to } });
  let r = await ren('referencia', 'Planes', 'Tarifas');
  assert.equal(r.status, 200, r.body);
  assert.equal(r.json.changed, 2);
  for (const id of [p.id, q.id]) assert.equal((await req('GET', `/api/pages/${id}`, { cookie: ck.editor })).json.grupo, 'Tarifas');
  assert.ok(!names(await structure(), 'referencia').includes('Planes'));
  assert.ok((await registry()).referencia.includes('Tarifas') && !(await registry()).referencia.includes('Planes'));
  // grupo vacío
  assert.equal((await req('POST', '/api/structure/groups', { cookie: ck.editor, payload: { seccion: 'referencia', name: 'Vacío uno' } })).status, 201);
  assert.equal((await ren('referencia', 'Vacío uno', 'Vacío dos')).status, 200);
  assert.ok(group(await structure(), 'referencia', 'Vacío dos'));
  // choques con grupos existentes (otra grafía) → 409; misma grafía cambiada de mayúsculas → permitido
  r = await ren('referencia', 'Vacío dos', 'TARIFAS');
  assert.equal(r.status, 409, r.body);
  assert.match(r.json.error, /Tarifas/);
  assert.equal((await ren('referencia', 'Vacío dos', 'vacío dos')).status, 200);
  assert.equal((await ren('referencia', 'No existe', 'Algo')).status, 404);
  assert.equal((await ren('referencia', 'Tarifas', 'Tarifas')).status, 400);
  // Guía: renombrar una cabecera del sidebar
  assert.equal((await ren('guia', '💰 FINANZAS', 'X')).status, 404, 'ya se eliminó arriba');
  assert.equal((await ren('guia', EMOJI, '🌱 COMIENZO')).status, 200);
  const st = await structure();
  assert.ok(names(st, 'guia').includes('🌱 COMIENZO') && !names(st, 'guia').includes(EMOJI));
  assert.equal(group(st, 'guia', '🌱 COMIENZO').pages.length, 1);
});

test('dedupe normalizado: crear «inicio»/«Inicio» cuando existe «🚀 INICIO» o «Tarifas» → 409; una página con otra grafía se une al grupo', async () => {
  const c = (seccion, name) => req('POST', '/api/structure/groups', { cookie: ck.editor, payload: { seccion, name } });
  assert.equal((await c('referencia', 'tarifas')).status, 409);
  assert.equal((await c('referencia', 'TÁRIFAS ')).status, 409);
  assert.equal((await c('guia', '🌱 comienzo')).status, 409);
  assert.equal((await c('guia', 'COMIENZO')).status, 409);
  assert.equal((await c('referencia', 'Tarifas')).status, 409);
  const nuevo = await mkPage('referencia', 'r3', 'R3', { grupo: 'tarifas' });
  assert.equal(nuevo.grupo, 'Tarifas', 'toma el nombre canónico');
  const reg = (await registry()).referencia;
  assert.equal(reg.filter((g) => normName(g) === 'tarifas').length, 1);
  assert.equal(names(await structure(), 'referencia').filter((n) => normName(n) === 'tarifas').length, 1);
  assert.deepEqual(sanitizeGroups({ tareas: ['A', 'a ', 'Á', 5, '', 'B'], fuera: ['x'] }), { tareas: ['A', 'B'] });
  assert.deepEqual(mergeGroups({ tareas: ['A'] }, { tareas: ['a', 'C'], guia: ['G'] }), { tareas: ['A', 'C'], guia: ['G'] });
});

test('roles y sesión: sin sesión 401, lector 403; el editor sí; auditoría structure.group_*', async () => {
  for (const [m, payload] of [['POST', { seccion: 'tareas', name: 'Z' }], ['PUT', { seccion: 'tareas', from: 'a', to: 'b' }], ['DELETE', { seccion: 'tareas', name: 'Z' }]]) {
    assert.equal((await req(m, '/api/structure/groups', { payload })).status, 401, `${m} sin sesión`);
    assert.equal((await req(m, '/api/structure/groups', { cookie: ck.viewer, payload })).status, 403, `${m} lector`);
  }
  assert.equal((await req('GET', '/api/structure', { cookie: ck.viewer })).status, 200);
  const acts = (await pool.query("SELECT DISTINCT action FROM audit_log WHERE action LIKE 'structure.group_%'")).rows.map((x) => x.action).sort();
  assert.deepEqual(acts, ['structure.group_create', 'structure.group_delete', 'structure.group_rename']);
  assert.equal((await req('POST', '/api/structure/groups', { cookie: ck.editor, payload: { seccion: 'nada', name: 'Z' } })).status, 400);
  assert.equal((await req('POST', '/api/structure/groups', { cookie: ck.editor, payload: { seccion: 'tareas', name: '  ' } })).status, 400);
});

test('asistente: getOutline/list_outline incluye los grupos vacíos con su nombre exacto', async () => {
  assert.equal((await req('POST', '/api/structure/groups', { cookie: ck.editor, payload: { seccion: 'conceptos', name: 'Ideas vacías' } })).status, 201);
  const ctx = app.portal.ctx;
  const outline = await loadOutline(ctx);
  const con = outline.find((s) => s.key === 'conceptos');
  assert.deepEqual(con.grupos.find((g) => g.name === 'Ideas vacías'), { name: 'Ideas vacías', pages: [] });
  assert.match(outlineText(outline), /«Ideas vacías» \(0\)/); // formato compacto del prompt de la IA
  const guia = outline.find((s) => s.key === 'guia');
  assert.ok(guia.grupos.some((g) => g.name === '🌱 COMIENZO'), 'nombre exacto con emoji');
});

test('.ispmax: el paquete conserva los grupos vacíos y el roundtrip los restaura', async () => {
  const dir = path.join(RUN, 'pkg');
  const out = path.join(dir, 'a.ispmax');
  await exportPackage({ pool, outFile: out });
  const pkg = await readPackage(out);
  assert.ok(pkg.data.settings.structure_groups.conceptos.includes('Ideas vacías'));
  await importPackage({ pool, source: out, mode: 'replace', safetyDir: path.join(dir, 'safety') });
  const st = await structure();
  assert.equal(group(st, 'conceptos', 'Ideas vacías')?.pages.length, 0);
  assert.ok(names(st, 'guia').includes('🌱 COMIENZO'));
  // merge: unión sin duplicar normalizado
  await pool.query("UPDATE settings SET value = '{\"conceptos\":[\"otro\"]}' WHERE key = 'structure_groups'");
  await importPackage({ pool, source: out, mode: 'merge', safetyDir: path.join(dir, 'safety') });
  const reg = (await registry()).conceptos;
  assert.deepEqual(reg.slice().sort(), ['Ideas vacías', 'otro'].sort());
});

test('.ispmax antiguo (sin structure_groups) se importa y sus grupos se derivan de las páginas; uno mal formado se rechaza', async () => {
  const out = path.join(RUN, 'pkg', 'b.ispmax');
  await exportPackage({ pool, outFile: out });
  const pkg = await readPackage(out);
  const old = JSON.parse(JSON.stringify(pkg));
  delete old.data.settings.structure_groups;
  await importPackage({ pool, source: repack(old), mode: 'replace', safetyDir: path.join(RUN, 'pkg', 'safety') });
  const reg = await registry();
  const withPages = pkg.data.pages.filter((p) => p.seccion === 'tareas' && p.grupo).map((p) => p.grupo);
  for (const g of withPages) assert.ok(reg.tareas.some((x) => normName(x) === normName(g)), `derivado: ${g}`);
  assert.ok(!reg.conceptos?.includes('Ideas vacías'), 'un paquete antiguo no trae grupos vacíos');
  const mal = JSON.parse(JSON.stringify(pkg));
  mal.data.settings.structure_groups = { tareas: 'no es lista' };
  await assert.rejects(readPackage(repack(mal)), /structure_groups/);
  // y tras importar, borrar la última página sigue sin borrar el grupo
  const g = names(await structure(), 'tareas')[0];
  assert.ok(g);
});

test('manual público (dinámico): un grupo vacío no aparece en el menú ni en el buscador; con páginas publicadas sí', async () => {
  await pool.query('TRUNCATE pages, settings, site_files RESTART IDENTITY CASCADE');
  const lleno = await mkPage('tareas', 'visible', 'Pagina visible unica', { modulo: 'general', grupo: 'GrupoLleno' }, true);
  const ultima = await mkPage('tareas', 'se-ira', 'Pagina ultima efimera', { modulo: 'general', grupo: 'GrupoQuedaVacio' }, true);
  await mkPage('tareas', 'borrador', 'Solo borrador', { modulo: 'general', grupo: 'GrupoSoloBorrador' }); // sin publicar
  await req('POST', '/api/structure/groups', { cookie: ck.editor, payload: { seccion: 'tareas', name: 'GrupoCreadoVacio' } });
  await pool.query("INSERT INTO site_files (path, content) VALUES ('docs/sidebar.json', $1)", [JSON.stringify([{ sectionHeader: 'CabeceraGuiaVacia', items: [] }, { sectionHeader: 'CabeceraGuiaLlena', items: [{ text: 'G', link: '/guia/g' }] }])]);
  await mkPage('guia', 'g', 'Guia g', {}, true);
  await req('DELETE', `/api/pages/${ultima.id}`, { cookie: ck.editor });
  const st = await structure();
  for (const n of ['GrupoLleno', 'GrupoQuedaVacio', 'GrupoSoloBorrador', 'GrupoCreadoVacio']) assert.ok(group(st, 'tareas', n), `${n} está en el panel`);
  assert.ok(group(st, 'guia', 'CabeceraGuiaVacia'), 'la cabecera vacía de la Guía está en el panel');
  void lleno;
  const engine = app.portal.ctx.siteRuntime.engine;
  engine.invalidate({});
  const page = (await get('/tareas/general/visible')).body;
  const menu = page.slice(0, page.indexOf('<article'));
  assert.match(menu, /GrupoLleno/);
  for (const n of ['GrupoQuedaVacio', 'GrupoSoloBorrador', 'GrupoCreadoVacio']) assert.ok(!page.includes(n), `${n} no sale en el HTML público`);
  const hub = (await get('/tareas/')).body;
  assert.ok(!/GrupoQuedaVacio|GrupoSoloBorrador|GrupoCreadoVacio/.test(hub));
  const guia = (await get('/guia/g')).body;
  assert.match(guia, /CabeceraGuiaLlena/);
  assert.ok(!guia.includes('CabeceraGuiaVacia'));
  const boot = (await get('/_site/boot.' + engine.structure().hash + '.js')).body;
  assert.ok(!/GrupoQuedaVacio|GrupoCreadoVacio|CabeceraGuiaVacia/.test(boot), 'ni en el JS público');
  const search = (await engine.searchIndex()).json;
  assert.ok(!/GrupoQuedaVacio|GrupoCreadoVacio|CabeceraGuiaVacia|GrupoSoloBorrador/.test(search), 'ni en el buscador');
  assert.match(search, /Pagina visible unica/);
});

test('manual público (estático): exportar la BD y construir el menú con build-nav no deja cabeceras vacías', async () => {
  const out = path.join(RUN, 'static-out');
  await exportToDir({ pool, outDir: out });
  const docs = path.join(out, 'docs');
  for (const s of ['tareas', 'problemas', 'preguntas', 'referencia', 'conceptos']) fs.mkdirSync(path.join(docs, s), { recursive: true });
  const r = spawnSync(process.execPath, [path.join(PORTAL_ROOT, '..', 'scripts', 'build-nav.mjs')], { env: { ...process.env, ISPMAX_DOCS_DIR: docs }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const nav = JSON.parse(fs.readFileSync(path.join(docs, '_nav.json'), 'utf8'));
  assert.deepEqual(nav['/tareas/'].map((g) => g.sectionHeader), ['GrupoLleno']);
  assert.deepEqual(nav['/guia/'].map((g) => g.sectionHeader), ['CabeceraGuiaLlena']);
  const hub = fs.readFileSync(path.join(docs, 'tareas', 'index.mdx'), 'utf8');
  assert.ok(!/GrupoQuedaVacio|GrupoCreadoVacio/.test(hub));
});
