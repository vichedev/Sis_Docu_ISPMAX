import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
// Pruebas de la API del portal contra TEST_DATABASE_URL (destructivas: vacía las tablas de esa BD).
// Uso: node --test test/api.test.mjs   (desde portal/)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { loadEnv, PORTAL_ROOT as PORTAL_ROOT_DIR } from '../server/env.mjs';

loadEnv();
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('Falta TEST_DATABASE_URL');
if (TEST_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
process.env.DATABASE_URL = TEST_URL; // por si algún módulo importa db.mjs
process.env.PORTAL_ADMIN_USER = 'admin_prueba';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
// Sin reconstrucciones automáticas del sitio ni carpetas reales de trabajo (Adenda 3): las rutas solo marcan cambios.
process.env.PORTAL_SITE_AUTO = 'off';
// Las pruebas fijan ajustes internos (ruta del repositorio) por la tabla; en producción esas claves las fija el entorno.
process.env.PORTAL_ALLOW_INTERNAL_SETTINGS = '1';
process.env.PORTAL_WORK_DIR = (await import('node:path')).join(PORTAL_ROOT_DIR, 'work-test');
process.env.PORTAL_DATA_DIR = (await import('node:path')).join(PORTAL_ROOT_DIR, 'data-test');

const { buildApp } = await import('../server/index.mjs');
const pg = (await import('pg')).default;

let app;
let admin; // cookie
const PASS = 'Clave-de-prueba-1';

async function req(method, url, { cookie, payload, headers } = {}) {
  const res = await app.inject({ method, url, payload, headers: { ...(cookie ? { cookie } : {}), ...(headers || {}) } });
  let json = null;
  try {
    json = res.json();
  } catch {}
  return { res, status: res.statusCode, json };
}
async function login(username, password) {
  const r = await req('POST', '/api/auth/login', { payload: { username, password } });
  const c = r.res.cookies.find((x) => x.name === 'portal_session');
  return { ...r, cookie: c ? `portal_session=${c.value}` : null, set: c };
}

before(async () => {
  const c = new pg.Client({ connectionString: TEST_URL });
  await c.connect();
  await resetTestDb(c);
  await c.end();
  app = await buildApp({ databaseUrl: TEST_URL });
  await app.portal.ensureAdmin();
  admin = (await login('admin_prueba', PASS)).cookie;
});
after(async () => {
  await app.close();
});

test('auth: sin sesión 401, login incorrecto 401, cookie HttpOnly SameSite=Strict 7 días', async () => {
  assert.equal((await req('GET', '/api/stats')).status, 401);
  assert.equal((await req('GET', '/api/auth/me')).status, 401);
  assert.equal((await login('admin_prueba', 'mala')).status, 401);
  const ok = await login('admin_prueba', PASS);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.user.username, 'admin_prueba');
  assert.equal(ok.json.user.role, 'admin');
  assert.equal(ok.json.user.password_hash, undefined);
  assert.equal(ok.set.httpOnly, true);
  assert.equal(String(ok.set.sameSite).toLowerCase(), 'strict');
  assert.equal(ok.set.maxAge, 7 * 86400);
  assert.match(ok.set.value, /^[0-9a-f]{64}$/);
  const me = await req('GET', '/api/auth/me', { cookie: ok.cookie });
  assert.equal(me.json.user.username, 'admin_prueba');
  const out = await req('POST', '/api/auth/logout', { cookie: ok.cookie });
  assert.equal(out.status, 200);
  assert.equal((await req('GET', '/api/auth/me', { cookie: ok.cookie })).status, 401);
});

test('auth: límite de intentos por IP+usuario (429)', async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await login('victima', 'x' + i);
  assert.equal(last.status, 429);
  // otro usuario no queda bloqueado
  assert.equal((await login('otro_usuario', 'x')).status, 401);
});

test('auth: Origin distinto en métodos que escriben se rechaza (CSRF)', async () => {
  const r = await req('POST', '/api/auth/logout', { cookie: admin, headers: { origin: 'http://evil.example', host: 'localhost:4380' } });
  assert.equal(r.status, 403);
  const ok = await req('PUT', '/api/auth/password', { cookie: admin, headers: { origin: 'http://localhost:4380', host: 'localhost:4380' }, payload: { current: 'mala', new: 'abcdefgh1' } });
  assert.equal(ok.status, 400); // pasa el filtro de Origin; falla por contraseña actual
});

test('usuarios y roles: viewer lee, editor escribe, admin gestiona; sin filtrar hashes', async () => {
  const mk = (u, role) => req('POST', '/api/users', { cookie: admin, payload: { username: u, password: 'Clave-larga-1', role, display_name: 'Persona ' + u } });
  assert.equal((await mk('editor1', 'editor')).status, 201);
  assert.equal((await mk('viewer1', 'viewer')).status, 201);
  assert.equal((await mk('editor1', 'editor')).status, 409);
  assert.equal((await req('POST', '/api/users', { cookie: admin, payload: { username: 'x', password: 'Clave-larga-1', role: 'editor' } })).status, 400);
  const list = await req('GET', '/api/users', { cookie: admin });
  assert.equal(list.json.items.length, 3);
  assert.ok(!JSON.stringify(list.json).includes('password_hash'));
  assert.ok(!JSON.stringify(list.json).includes('$2'));

  const ed = (await login('editor1', 'Clave-larga-1')).cookie;
  const vi = (await login('viewer1', 'Clave-larga-1')).cookie;
  assert.equal((await req('GET', '/api/pages', { cookie: vi })).status, 200);
  assert.equal((await req('POST', '/api/pages', { cookie: vi, payload: {} })).status, 403);
  assert.equal((await req('GET', '/api/users', { cookie: ed })).status, 403);
  assert.equal((await req('GET', '/api/settings', { cookie: ed })).status, 403);
  assert.equal((await req('GET', '/api/audit', { cookie: ed })).status, 403);
  assert.equal((await req('GET', '/api/stats', { cookie: vi })).status, 200);

  // no borrarse a sí mismo ni dejar sin admin
  const me = (await req('GET', '/api/auth/me', { cookie: admin })).json.user;
  assert.equal((await req('DELETE', `/api/users/${me.id}`, { cookie: admin })).status, 409);
  assert.equal((await req('PUT', `/api/users/${me.id}`, { cookie: admin, payload: { role: 'editor' } })).status, 409);
  // desactivar a un usuario cierra sus sesiones
  const e = list.json.items.find((x) => x.username === 'editor1');
  assert.equal((await req('PUT', `/api/users/${e.id}`, { cookie: admin, payload: { active: false } })).status, 200);
  assert.equal((await req('GET', '/api/pages', { cookie: ed })).status, 401);
  assert.equal((await login('editor1', 'Clave-larga-1')).status, 401);
  assert.equal((await req('PUT', `/api/users/${e.id}`, { cookie: admin, payload: { active: true } })).status, 200);
});

let pageId;
let version;
test('páginas: crear con plantilla (draft), validaciones de slug/ruta, duplicado 409', async () => {
  const bad = await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'tareas', slug: '../x', title: 'T', tipo: 'tarea', modulo: 'acceso' } });
  assert.equal(bad.status, 400);
  assert.equal((await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'tareas', slug: 'Mayus', title: 'T', tipo: 'tarea', modulo: 'acceso' } })).status, 400);
  assert.equal((await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'tareas', slug: 'ok', title: 'T', tipo: 'tarea' } })).status, 400); // falta módulo
  assert.equal((await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'nada', slug: 'ok', title: 'T', tipo: 'tarea' } })).status, 400);
  const r = await req('POST', '/api/pages', {
    cookie: admin,
    payload: { seccion: 'tareas', modulo: 'acceso', slug: 'prueba-uno', title: 'Prueba uno', tipo: 'tarea', grupo: 'Grupo A', description: 'Página ficticia' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.route, '/tareas/acceso/prueba-uno');
  assert.equal(r.json.file_path, 'tareas/acceso/prueba-uno.mdx');
  assert.equal(r.json.status, 'draft');
  assert.equal(r.json.version, 1);
  assert.equal(r.json.orden, 1);
  assert.equal(r.json.frontmatter.tipo, 'tarea');
  assert.equal(r.json.frontmatter.modulo, 'acceso');
  assert.match(r.json.body, /<Steps>/);
  pageId = r.json.id;
  version = r.json.version;
  assert.equal((await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'tareas', modulo: 'acceso', slug: 'prueba-uno', title: 'x', tipo: 'tarea' } })).status, 409);
  // orden correlativo en el grupo
  const r2 = await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'tareas', modulo: 'acceso', slug: 'prueba-dos', title: 'Prueba dos', tipo: 'tarea', grupo: 'Grupo A' } });
  assert.equal(r2.json.orden, 2);
  // plantillas de los demás tipos
  for (const [seccion, tipo] of [['guia', 'guia'], ['problemas', 'problema'], ['preguntas', 'pregunta'], ['referencia', 'referencia'], ['conceptos', 'concepto']]) {
    const t = await req('POST', '/api/pages', { cookie: admin, payload: { seccion, slug: 'tpl-' + tipo, title: 'Plantilla ' + tipo, tipo } });
    assert.equal(t.status, 201, `${tipo}: ${JSON.stringify(t.json)}`);
    assert.equal(t.json.route, `/${seccion}/tpl-${tipo}`);
  }
  const g = await req('GET', `/api/pages/${pageId}`, { cookie: admin });
  assert.equal(g.json.title, 'Prueba uno');
  assert.equal((await req('GET', '/api/pages/999999', { cookie: admin })).status, 404);
  assert.equal((await req('GET', '/api/pages/abc', { cookie: admin })).status, 400);
});

test('páginas: editar incrementa versión, guarda revisión y 409 por versión vieja', async () => {
  const a = await req('PUT', `/api/pages/${pageId}`, { cookie: admin, payload: { version, title: 'Prueba uno (editada)', body: 'Cuerpo A', status: 'published' } });
  assert.equal(a.status, 200);
  assert.equal(a.json.version, 2);
  assert.equal(a.json.title, 'Prueba uno (editada)');
  assert.equal(a.json.frontmatter.title, 'Prueba uno (editada)');
  assert.equal(a.json.status, 'published');
  // mismo número de versión de nuevo → conflicto
  const b = await req('PUT', `/api/pages/${pageId}`, { cookie: admin, payload: { version, body: 'Cuerpo B' } });
  assert.equal(b.status, 409);
  assert.equal(b.json.currentVersion, 2);
  assert.ok(b.json.error);
  assert.equal((await req('PUT', `/api/pages/${pageId}`, { cookie: admin, payload: { body: 'sin versión' } })).status, 400);
  const c = await req('PUT', `/api/pages/${pageId}`, { cookie: admin, payload: { version: 2, body: 'Cuerpo C', frontmatter: { title: 'Prueba uno (editada)', description: 'nueva', extra: [1, 2] } } });
  assert.equal(c.status, 200);
  assert.equal(c.json.version, 3);
  assert.equal(c.json.description, 'nueva');
  version = 3;
  const revs = await req('GET', `/api/pages/${pageId}/revisions`, { cookie: admin });
  assert.equal(revs.json.items.length, 2);
  // restaurar la revisión más antigua (versión 1: plantilla original)
  const oldest = revs.json.items[revs.json.items.length - 1];
  assert.equal(oldest.version, 1);
  const rs = await req('POST', `/api/pages/${pageId}/revisions/${oldest.id}/restore`, { cookie: admin });
  assert.equal(rs.status, 200);
  assert.equal(rs.json.version, 4);
  assert.equal(rs.json.title, 'Prueba uno');
  assert.match(rs.json.body, /<Steps>/);
  version = 4;
});

test('páginas: mover cambia ruta/archivo y registra redirect; conflictos', async () => {
  const m = await req('POST', `/api/pages/${pageId}/move`, { cookie: admin, payload: { slug: 'prueba-movida', modulo: 'ajustes' } });
  assert.equal(m.status, 200);
  assert.equal(m.json.route, '/tareas/ajustes/prueba-movida');
  assert.equal(m.json.file_path, 'tareas/ajustes/prueba-movida.mdx');
  assert.deepEqual(m.json.redirect, { from: '/tareas/acceso/prueba-uno', to: '/tareas/ajustes/prueba-movida' });
  assert.equal(m.json.frontmatter.modulo, 'ajustes');
  version = m.json.version;
  const red = await pool().query('SELECT * FROM redirects');
  assert.equal(red.rowCount, 1);
  assert.equal(red.rows[0].to_route, '/tareas/ajustes/prueba-movida');
  // segundo movimiento: la cadena se actualiza (redirect antiguo apunta al destino final)
  const m2 = await req('POST', `/api/pages/${pageId}/move`, { cookie: admin, payload: { slug: 'prueba-final' } });
  assert.equal(m2.status, 200);
  version = m2.json.version;
  const red2 = await pool().query('SELECT from_route, to_route FROM redirects ORDER BY from_route');
  assert.deepEqual(red2.rows.map((r) => r.to_route), ['/tareas/ajustes/prueba-final', '/tareas/ajustes/prueba-final']);
  // choque con otra página
  assert.equal((await req('POST', `/api/pages/${pageId}/move`, { cookie: admin, payload: { slug: 'prueba-dos', modulo: 'acceso' } })).status, 409);
  assert.equal((await req('POST', `/api/pages/${pageId}/move`, { cookie: admin, payload: { slug: '../../etc' } })).status, 400);
  assert.equal((await req('POST', `/api/pages/${pageId}/move`, { cookie: admin, payload: {} })).status, 400);
});

test('páginas: borrado lógico, filtros y restauración', async () => {
  assert.equal((await req('DELETE', `/api/pages/${pageId}`, { cookie: admin })).status, 200);
  assert.equal((await req('DELETE', `/api/pages/${pageId}`, { cookie: admin })).status, 404);
  const list = await req('GET', '/api/pages?seccion=tareas', { cookie: admin });
  assert.ok(!list.json.items.some((p) => p.id === pageId));
  const del = await req('GET', '/api/pages?status=deleted', { cookie: admin });
  assert.ok(del.json.items.some((p) => p.id === pageId));
  // una página eliminada no se edita y su ruta sigue reservada
  const put = await req('PUT', `/api/pages/${pageId}`, { cookie: admin, payload: { version, body: 'x' } });
  assert.equal(put.status, 409);
  const dup = await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'tareas', modulo: 'ajustes', slug: 'prueba-final', title: 'x', tipo: 'tarea' } });
  assert.equal(dup.status, 409);
  const rs = await req('POST', `/api/pages/${pageId}/restore`, { cookie: admin });
  assert.equal(rs.status, 200);
  assert.equal(rs.json.deleted_at, null);
  version = rs.json.version;
  assert.equal((await req('POST', `/api/pages/${pageId}/restore`, { cookie: admin })).status, 404);
});

test('páginas: búsqueda, filtros y paginación', async () => {
  await req('PUT', `/api/pages/${pageId}`, { cookie: admin, payload: { version, body: 'El router mikrotik se configura aquí.', status: 'published' } });
  const q = await req('GET', '/api/pages?q=mikrotik', { cookie: admin });
  assert.equal(q.json.total, 1);
  assert.equal(q.json.items[0].id, pageId);
  assert.ok(q.json.items[0].updated_by_name);
  assert.equal((await req('GET', '/api/pages?q=prueba-final', { cookie: admin })).json.total, 1); // por ruta
  assert.equal((await req('GET', "/api/pages?q=%25'%3B--", { cookie: admin })).status, 200); // inyección inofensiva
  const dr = await req('GET', '/api/pages?status=draft', { cookie: admin });
  assert.ok(dr.json.items.every((p) => p.status === 'draft'));
  const pg1 = await req('GET', '/api/pages?limit=2&offset=0', { cookie: admin });
  assert.equal(pg1.json.items.length, 2);
  assert.ok(pg1.json.total > 2);
});

test('estructura: árbol y reordenación (mover entre grupos, crear grupo, orden 1..n)', async () => {
  const tree = await req('GET', '/api/structure', { cookie: admin });
  assert.equal(tree.status, 200);
  const tareas = tree.json.secciones.find((s) => s.key === 'tareas');
  assert.ok(tareas.grupos.length >= 1);
  const ids = tareas.grupos.flatMap((g) => g.pages.map((p) => p.id));
  assert.ok(ids.length >= 2);
  const [a, b] = ids;
  const put = await req('PUT', '/api/structure/order', {
    cookie: admin,
    payload: { seccion: 'tareas', grupos: [{ name: 'Nuevo grupo', pageIds: [b] }, { name: 'Otro', pageIds: [a] }] },
  });
  assert.equal(put.status, 200);
  const pa = (await req('GET', `/api/pages/${a}`, { cookie: admin })).json;
  const pb = (await req('GET', `/api/pages/${b}`, { cookie: admin })).json;
  assert.equal(pb.grupo, 'Nuevo grupo');
  assert.equal(pb.orden, 1);
  assert.equal(pb.frontmatter.grupo, 'Nuevo grupo');
  assert.equal(pa.grupo, 'Otro');
  // orden dentro de un grupo
  const put2 = await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'tareas', grupos: [{ name: 'Nuevo grupo', pageIds: [a, b] }] } });
  assert.equal(put2.status, 200);
  const pb2 = (await req('GET', `/api/pages/${b}`, { cookie: admin })).json;
  assert.equal(pb2.orden, 2);
  assert.equal(pb2.frontmatter.orden, 2);
  // validaciones: duplicados, sección ajena, id inexistente
  assert.equal((await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'tareas', grupos: [{ name: 'X', pageIds: [a, a] }] } })).status, 400);
  assert.equal((await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'guia', grupos: [{ name: 'X', pageIds: [a] }] } })).status, 400);
  assert.equal((await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'tareas', grupos: [{ name: 'X', pageIds: [999999] }] } })).status, 400);
  // atomicidad: una petición inválida no cambia nada
  const pa2 = (await req('GET', `/api/pages/${a}`, { cookie: admin })).json;
  assert.equal(pa2.grupo, 'Nuevo grupo');
  // viewer no puede reordenar
  const vi = (await login('viewer1', 'Clave-larga-1')).cookie;
  assert.equal((await req('PUT', '/api/structure/order', { cookie: vi, payload: { seccion: 'tareas', grupos: [] } })).status, 403);
});

test('estructura: guia-sidebar (lee/escribe site_files)', async () => {
  assert.equal((await req('GET', '/api/structure/guia-sidebar', { cookie: admin })).status, 404);
  const data = [{ sectionHeader: 'Inicio', items: [{ text: 'Intro', link: '/guia/inicio' }] }];
  const put = await req('PUT', '/api/structure/guia-sidebar', { cookie: admin, payload: { data } });
  assert.equal(put.status, 200);
  const get = await req('GET', '/api/structure/guia-sidebar', { cookie: admin });
  assert.deepEqual(get.json.data, data);
  assert.equal((await req('PUT', '/api/structure/guia-sidebar', { cookie: admin, payload: { content: '{no json' } })).status, 400);
  assert.equal((await req('PUT', '/api/structure/guia-sidebar', { cookie: admin, payload: { data: { a: 1 } } })).status, 400);
});

test('assets: subir imagen real → WebP, snippet, correlativo, descarga, tipos y tamaño, borrado protegido', async () => {
  const png = await sharp({ create: { width: 320, height: 200, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer();
  const mp = (parts) => {
    const boundary = '----prueba' + Math.random().toString(16).slice(2);
    const chunks = [];
    for (const p of parts) {
      let head = `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"`;
      if (p.filename) head += `; filename="${p.filename}"\r\nContent-Type: ${p.type}`;
      chunks.push(Buffer.from(head + '\r\n\r\n'), Buffer.isBuffer(p.value) ? p.value : Buffer.from(p.value), Buffer.from('\r\n'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
  };
  const up = (parts, cookie = admin) => {
    const m = mp(parts);
    return req('POST', '/api/assets', { cookie, payload: m.payload, headers: m.headers });
  };
  const r1 = await up([{ name: 'folder', value: 'imgs/prueba/demo' }, { name: 'name', value: 'Pantalla Principal' }, { name: 'file', filename: 'x.png', type: 'image/png', value: png }]);
  assert.equal(r1.status, 201, JSON.stringify(r1.json));
  assert.equal(r1.json.path, 'imgs/prueba/demo/01-pantalla-principal.webp');
  assert.equal(r1.json.width, 320);
  assert.equal(r1.json.height, 200);
  assert.equal(r1.json.snippet, '<Figure src="/assets/imgs/prueba/demo/01-pantalla-principal.webp" alt="" caption="" width={320} height={200} max="320px" />');
  const r2 = await up([{ name: 'folder', value: 'imgs/prueba/demo' }, { name: 'file', filename: 'Otra Cosa.PNG', type: 'image/png', value: png }]);
  assert.equal(r2.json.path, 'imgs/prueba/demo/02-otra-cosa.webp');
  // descarga: bytes WebP reales
  const f = await req('GET', `/api/assets/file?path=${encodeURIComponent(r1.json.path)}`, { cookie: admin });
  assert.equal(f.status, 200);
  assert.equal(f.res.headers['content-type'], 'image/webp');
  const meta = await sharp(f.res.rawPayload).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 320);
  // listado sin bytes y filtros
  const l = await req('GET', '/api/assets?prefix=imgs/prueba&q=otra', { cookie: admin });
  assert.equal(l.json.total, 1);
  assert.equal(l.json.items[0].bytes, undefined);
  // validación de entrada
  assert.equal((await up([{ name: 'folder', value: 'imgs/../../x' }, { name: 'file', filename: 'a.png', type: 'image/png', value: png }])).status, 400);
  assert.equal((await up([{ name: 'folder', value: 'imgs/ok' }, { name: 'file', filename: 'a.svg', type: 'image/svg+xml', value: '<svg xmlns="http://www.w3.org/2000/svg"/>' }])).status, 415);
  assert.equal((await up([{ name: 'folder', value: 'imgs/ok' }, { name: 'file', filename: 'a.png', type: 'image/png', value: 'esto no es una imagen' }])).status, 400);
  assert.equal((await up([{ name: 'folder', value: 'imgs/ok' }])).status, 400);
  const big = Buffer.alloc(10 * 1024 * 1024 + 10, 1);
  assert.equal((await up([{ name: 'folder', value: 'imgs/ok' }, { name: 'file', filename: 'a.png', type: 'image/png', value: big }])).status, 413);
  const vi = (await login('viewer1', 'Clave-larga-1')).cookie;
  assert.equal((await up([{ name: 'folder', value: 'imgs/ok' }, { name: 'file', filename: 'a.png', type: 'image/png', value: png }], vi)).status, 403);
  assert.equal((await req('GET', '/api/assets/file?path=../x', { cookie: admin })).status, 400);
  // validate: imagen existente vs inexistente
  const v = await req('POST', '/api/pages/validate', { cookie: admin, payload: { body: `${r1.json.snippet}\n\n<Figure src="/assets/imgs/no/existe.webp" width={1} height={1} />`, frontmatter: { title: 'T' } } });
  assert.equal(v.json.ok, false);
  assert.equal(v.json.problems.length, 1);
  assert.match(v.json.problems[0].message, /no existe/);
  // borrado: bloqueado si una página la referencia
  await req('PUT', `/api/pages/${pageId}`, { cookie: admin, payload: { version: (await req('GET', `/api/pages/${pageId}`, { cookie: admin })).json.version, body: r1.json.snippet } });
  const d = await req('DELETE', `/api/assets?path=${encodeURIComponent(r1.json.path)}`, { cookie: admin });
  assert.equal(d.status, 409);
  assert.equal(d.json.pages[0].id, pageId);
  // sin referencias se borra
  assert.equal((await req('DELETE', `/api/assets?path=${encodeURIComponent(r2.json.path)}`, { cookie: admin })).status, 200);
  assert.equal((await req('DELETE', `/api/assets?path=${encodeURIComponent(r2.json.path)}`, { cookie: admin })).status, 404);
});

test('validate: <texto> suelto, {llaves}, componentes, frontmatter, código y JSX legítimo', async () => {
  const v = (body, frontmatter = { title: 'T' }) => req('POST', '/api/pages/validate', { cookie: admin, payload: { body, frontmatter } }).then((r) => r.json);
  assert.deepEqual(await v('Texto normal con `<codigo>` y `{llave}`\n\n```\n<bloque> {x}\n```\n'), { ok: true, problems: [] });
  const a = await v('Línea uno\nUse <texto> aquí');
  assert.equal(a.ok, false);
  assert.equal(a.problems[0].line, 2);
  assert.match(a.problems[0].message, /<texto>/);
  const b = await v('Valor {variable} suelto');
  assert.equal(b.ok, false);
  assert.match(b.problems[0].message, /Llave/);
  assert.equal(b.problems[0].line, 1);
  const c = await v('<Desconocido>hola</Desconocido>');
  assert.equal(c.ok, false);
  assert.match(c.problems[0].message, /Componente desconocido/);
  // JSX legítimo (atributos con llaves), HTML permitido y autoenlaces
  const ok = await v('<Steps>\n<Step>\n\nHaz clic. Ver <https://example.invalid> y a < b.\n\n</Step>\n</Steps>\n<Callout type="tip" title="Hola">\nTexto<br/>\n</Callout>\n<Figure src="x" width={10} height={20} max="10px" />');
  assert.deepEqual(ok.problems.filter((p) => !/no existe/.test(p.message)), []);
  // frontmatter
  assert.equal((await v('ok', { description: 'sin título' })).ok, false);
  assert.equal((await v('ok', 'texto')).ok, false);
  assert.equal((await v('ok', { title: 'T', sinonimos: 'no lista' })).ok, false);
  assert.equal((await v('ok', { title: 'T', orden: 'abc' })).ok, false);
});

test('ajustes: solo los editables, secciones, validación, normalización y rechazo de los internos; sin secretos', async () => {
  const g = await req('GET', '/api/settings', { cookie: admin });
  assert.equal(g.status, 200);
  assert.deepEqual(g.json.definitions.map((d) => d.key), ['site_title', 'contact_whatsapp', 'auto_publish', 'auto_publish_delay', 'require_2fa_for_admins', 'backup_keep']);
  assert.ok(g.json.definitions.every((d) => d.key && d.label && d.help && d.type && ['general', 'manual', 'seguridad', 'respaldos'].includes(d.section)));
  assert.deepEqual(Object.keys(g.json.settings).sort(), ['auto_publish', 'auto_publish_delay', 'backup_keep', 'contact_whatsapp', 'require_2fa_for_admins', 'site_title']);
  for (const k of ['site_url', 'site_base', 'repo_path', 'git_remote', 'git_branch', 'build_command', 'restart_mode', 'backup_dir']) {
    assert.ok(!(k in g.json.settings), k);
    assert.ok(!g.json.definitions.some((d) => d.key === k), k);
  }
  assert.equal(g.json.settings.backup_keep, 20);
  assert.equal(g.json.settings.site_title, '');
  assert.equal(g.json.settings.contact_whatsapp, '');
  assert.equal(g.json.definitions.find((d) => d.key === 'backup_keep').max, 1000);
  assert.ok(!JSON.stringify(g.json).toLowerCase().includes('password'));
  const p = await req('PUT', '/api/settings', { cookie: admin, payload: { site_title: ' Manual de prueba ', contact_whatsapp: '+593 95 996-7843', backup_keep: 5, auto_publish: true } });
  assert.equal(p.status, 200);
  assert.equal(p.json.settings.contact_whatsapp, '593959967843');
  const g2 = await req('GET', '/api/settings', { cookie: admin });
  assert.equal(g2.json.settings.site_title, 'Manual de prueba');
  assert.equal(g2.json.settings.contact_whatsapp, '593959967843');
  assert.equal(g2.json.settings.backup_keep, 5);
  assert.equal(g2.json.settings.auto_publish, true);
  const bad = (payload) => req('PUT', '/api/settings', { cookie: admin, payload }).then((r) => r.status);
  assert.equal(await bad({ clave_rara: 'x' }), 400);
  for (const k of ['site_url', 'site_base', 'repo_path', 'git_remote', 'git_branch', 'build_command', 'restart_mode', 'backup_dir']) {
    const r = await req('PUT', '/api/settings', { cookie: admin, payload: { [k]: 'x' } });
    assert.equal(r.status, 400, k);
    assert.equal(r.json.error, 'Ese valor lo fija el despliegue y no se cambia desde el panel.', k);
  }
  assert.equal(await bad({ backup_keep: 'muchos' }), 400);
  assert.equal(await bad({ backup_keep: 0 }), 400);
  assert.equal(await bad({ backup_keep: 1001 }), 400);
  assert.equal(await bad({ auto_publish_delay: 0 }), 400);
  assert.equal(await bad({ auto_publish_delay: 121 }), 400);
  assert.equal(await bad({ auto_publish: 'si' }), 400);
  assert.equal(await bad({ site_title: 'x'.repeat(81) }), 400);
  assert.equal(await bad({ site_title: 'a<b' }), 400);
  for (const no of ['abc', '12345', '+1234567890123456', '593-95-abc']) assert.equal(await bad({ contact_whatsapp: no }), 400, no);
  assert.equal(await bad([1]), 400);
  assert.equal((await req('PUT', '/api/settings', { cookie: admin, payload: { contact_whatsapp: '', site_title: '' } })).status, 200, 'vacío = valores del manual');
  assert.equal(await app.portal.ctx.getSetting('site_title'), '');
  await req('PUT', '/api/settings', { cookie: admin, payload: { backup_keep: 20 } });
  assert.equal(await app.portal.ctx.getSetting('inexistente', 'def'), 'def');
});

test('stats, auditoría y cambio de contraseña', async () => {
  const s = await req('GET', '/api/stats', { cookie: admin });
  assert.equal(s.status, 200);
  assert.ok(s.json.pages >= 7);
  assert.ok(s.json.drafts >= 1);
  assert.equal(s.json.assets, 1);
  assert.equal(s.json.users, 3);
  assert.equal(s.json.lastPublish, null);
  assert.equal(s.json.lastBackup, null);
  assert.ok(s.json.bySeccion.find((x) => x.seccion === 'tareas'));
  const a = await req('GET', '/api/audit?limit=5&action=page.create', { cookie: admin });
  assert.equal(a.status, 200);
  assert.ok(a.json.total >= 7);
  assert.equal(a.json.items.length, 5);
  assert.ok(a.json.items.every((x) => x.action === 'page.create' && x.username === 'admin_prueba'));
  // contraseña
  const u = await req('POST', '/api/users', { cookie: admin, payload: { username: 'cambia', password: 'Clave-larga-1', role: 'viewer' } });
  assert.equal(u.status, 201);
  const c1 = (await login('cambia', 'Clave-larga-1')).cookie;
  const c2 = (await login('cambia', 'Clave-larga-1')).cookie;
  assert.equal((await req('PUT', '/api/auth/password', { cookie: c1, payload: { current: 'incorrecta', new: 'NuevaClave-99' } })).status, 400);
  assert.equal((await req('PUT', '/api/auth/password', { cookie: c1, payload: { current: 'Clave-larga-1', new: 'corta' } })).status, 400);
  assert.equal((await req('PUT', '/api/auth/password', { cookie: c1, payload: { current: 'Clave-larga-1', new: 'NuevaClave-99' } })).status, 200);
  assert.equal((await req('GET', '/api/auth/me', { cookie: c1 })).status, 200);
  assert.equal((await req('GET', '/api/auth/me', { cookie: c2 })).status, 401); // las demás sesiones se cierran
  assert.equal((await login('cambia', 'NuevaClave-99')).status, 200);
  // borrar usuario con historial
  assert.equal((await req('DELETE', `/api/users/${u.json.id}`, { cookie: admin })).status, 200);
});

test('seguridad básica: JSON inválido 400, ruta desconocida 404 JSON, sin fuga de errores', async () => {
  const r = await app.inject({ method: 'POST', url: '/api/pages', headers: { cookie: admin, 'content-type': 'application/json' }, payload: '{mal' });
  assert.equal(r.statusCode, 400);
  assert.ok(r.json().error);
  const n = await req('GET', '/api/no-existe', { cookie: admin });
  assert.equal(n.status, 404);
  assert.ok(n.json.error);
});

function pool() {
  return app.portal.ctx.pool;
}

// ---- tours
const { exportToDir, importFromRepo } = await import('../server/sync/index.mjs');
const fsx = await import('node:fs');
const pathx = await import('node:path');
const { PORTAL_ROOT: PORTAL_DIR } = await import('../server/env.mjs');

async function seedTourAssets() {
  const bytes = await sharp({ create: { width: 640, height: 400, channels: 3, background: { r: 10, g: 90, b: 160 } } }).webp().toBuffer();
  for (const p of ['imgs/tour/01-uno.webp', 'imgs/tour/02-dos.webp']) {
    await pool().query(
      "INSERT INTO assets (path, mime, bytes, width, height, size) VALUES ($1,'image/webp',$2,640,400,$3) ON CONFLICT (path) DO NOTHING",
      [p, bytes, bytes.length]
    );
  }
}
const step = (over = {}) => ({ image: 'imgs/tour/01-uno.webp', alt: 'Pantalla', title: 'Paso', text: 'Haz clic en **Guardar**.', spot: { x: 10, y: 20, w: 30, h: 15 }, link: { label: 'Ver tarea', route: '/tareas/x/y' }, ...over });

test('tours: crear, listar, snippet, slug y duplicados', async () => {
  await seedTourAssets();
  const ed = (await login('editor1', 'Clave-larga-1')).cookie;
  const vi = (await login('viewer1', 'Clave-larga-1')).cookie;
  assert.equal((await req('POST', '/api/tours', { cookie: vi, payload: { slug: 'abc', title: 'T' } })).status, 403);
  assert.equal((await req('POST', '/api/tours', { cookie: ed, payload: { slug: 'Mal Slug', title: 'T' } })).status, 400);
  assert.equal((await req('POST', '/api/tours', { cookie: ed, payload: { slug: 'abc', title: '' } })).status, 400);
  const c = await req('POST', '/api/tours', { cookie: ed, payload: { slug: 'tour-uno', title: 'Tour uno', description: 'Desc' } });
  assert.equal(c.status, 201);
  assert.equal(c.json.status, 'draft');
  assert.deepEqual(c.json.steps, []);
  assert.equal(c.json.snippet, '<Tour id="tour-uno" />');
  assert.equal((await req('POST', '/api/tours', { cookie: ed, payload: { slug: 'tour-uno', title: 'Otro' } })).status, 409);
  const l = await req('GET', '/api/tours?q=uno', { cookie: vi });
  assert.equal(l.status, 200);
  assert.equal(l.json.items.length, 1);
  assert.equal(l.json.items[0].stepsCount, 0);
  assert.equal(l.json.items[0].snippet, '<Tour id="tour-uno" />');
  assert.equal((await req('GET', `/api/tours/${c.json.id}`, { cookie: vi })).json.slug, 'tour-uno');
  assert.equal((await req('GET', '/api/tours/9999', { cookie: vi })).status, 404);
  assert.equal((await req('GET', '/api/tours/abc', { cookie: vi })).status, 400);
});

test('tours: PUT valida pasos, publica, 409 por versión; borrar, restaurar y duplicar', async () => {
  const ed = (await login('editor1', 'Clave-larga-1')).cookie;
  const t = (await req('GET', '/api/tours?q=tour-uno', { cookie: ed })).json.items[0];
  const put = (payload, id = t.id) => req('PUT', `/api/tours/${id}`, { cookie: ed, payload });
  assert.equal((await put({ title: 'X' })).status, 400); // falta version
  assert.equal((await put({ version: 1, steps: [step({ image: 'imgs/no/existe.webp' })] })).status, 400);
  assert.equal((await put({ version: 1, steps: [step({ image: '../x.webp' })] })).status, 400);
  assert.equal((await put({ version: 1, steps: [step({ spot: { x: 90, y: 0, w: 20, h: 10 } })] })).status, 400);
  assert.equal((await put({ version: 1, steps: [step({ spot: { x: -1, y: 0, w: 20, h: 10 } })] })).status, 400);
  assert.equal((await put({ version: 1, steps: [step({ spot: { x: 1, y: 2 } })] })).status, 400);
  assert.equal((await put({ version: 1, steps: [step({ link: { label: 'a', route: 'sin-barra' } })] })).status, 400);
  assert.equal((await put({ version: 1, steps: 'no' })).status, 400);
  assert.equal((await put({ version: 1, status: 'published' })).status, 400); // sin pasos
  assert.equal((await put({ version: 1, status: 'otro' })).status, 400);
  // borrador admite textos vacíos; publicado no
  const ok = await put({ version: 1, steps: [step({ title: '', text: '' }), step({ image: 'imgs/tour/02-dos.webp', spot: null, link: null })] });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.version, 2);
  assert.equal(ok.json.steps.length, 2);
  assert.equal((await put({ version: 2, status: 'published' })).status, 400);
  assert.equal((await put({ version: 1, title: 'Viejo' })).status, 409);
  const pub = await put({ version: 2, title: 'Tour uno v2', steps: [step(), step({ image: 'imgs/tour/02-dos.webp', spot: null, link: null })], status: 'published' });
  assert.equal(pub.status, 200);
  assert.equal(pub.json.status, 'published');
  assert.equal(pub.json.title, 'Tour uno v2');
  assert.equal(pub.json.steps[1].spot, null);
  // duplicar
  assert.equal((await req('POST', `/api/tours/${t.id}/duplicate`, { cookie: ed, payload: { slug: 'tour-uno' } })).status, 409);
  assert.equal((await req('POST', `/api/tours/${t.id}/duplicate`, { cookie: ed, payload: {} })).status, 400);
  const d = await req('POST', `/api/tours/${t.id}/duplicate`, { cookie: ed, payload: { slug: 'tour-copia' } });
  assert.equal(d.status, 201);
  assert.equal(d.json.status, 'draft');
  assert.equal(d.json.steps.length, 2);
  // borrado lógico: el slug sigue reservado
  assert.equal((await req('DELETE', `/api/tours/${d.json.id}`, { cookie: ed })).status, 200);
  assert.equal((await req('DELETE', `/api/tours/${d.json.id}`, { cookie: ed })).status, 404);
  assert.equal((await req('POST', '/api/tours', { cookie: ed, payload: { slug: 'tour-copia', title: 'X' } })).status, 409);
  assert.equal((await req('GET', '/api/tours?q=copia', { cookie: ed })).json.items.length, 0);
  assert.equal((await req('GET', '/api/tours?status=deleted', { cookie: ed })).json.items.length, 1);
  const cur = (await req('GET', `/api/tours/${d.json.id}`, { cookie: ed })).json;
  assert.equal((await put({ version: cur.version, title: 'x' }, d.json.id)).status, 409); // eliminado
  assert.equal((await req('POST', `/api/tours/${d.json.id}/restore`, { cookie: ed })).status, 200);
  assert.equal((await req('POST', `/api/tours/${d.json.id}/restore`, { cookie: ed })).status, 404);
  assert.equal((await req('GET', '/api/tours?status=published', { cookie: ed })).json.items.length, 1);
});

test('validate: <Tour id> sin id es error; tour inexistente o en borrador es aviso', async () => {
  const v = (body) => req('POST', '/api/pages/validate', { cookie: admin, payload: { body, frontmatter: { title: 'T' } } }).then((r) => r.json);
  const a = await v('<Tour />');
  assert.equal(a.ok, false);
  assert.match(a.problems[0].message, /id/);
  assert.deepEqual(await v('<Tour id="tour-uno" />'), { ok: true, problems: [] });
  const b = await v('Intro\n\n<Tour id="no-existe" />');
  assert.equal(b.ok, true);
  assert.equal(b.problems[0].level, 'warning');
  assert.equal(b.problems[0].line, 3);
  const c = await v('<Tour id="tour-copia" />'); // borrador
  assert.equal(c.ok, true);
  assert.match(c.problems[0].message, /borrador/);
  assert.equal((await v('<Tour id={"tour-uno"} />')).problems.length, 0);
});

test('stats.unpublished: todo si nunca se publicó; solo lo modificado tras el último publish ok', async () => {
  const s0 = (await req('GET', '/api/stats', { cookie: admin })).json.unpublished;
  assert.ok(s0.pages >= 7 && s0.assets >= 2 && s0.tours === 2);
  assert.equal(s0.total, s0.pages + s0.assets + s0.tours);
  // un publish con error no cuenta
  await pool().query("INSERT INTO publish_jobs (kind, status, started_at, finished_at) VALUES ('publish','error', now(), now())");
  assert.equal((await req('GET', '/api/stats', { cookie: admin })).json.unpublished.total, s0.total);
  await pool().query("INSERT INTO publish_jobs (kind, status, started_at, finished_at) VALUES ('publish','ok', now() + interval '1 second', now() + interval '2 seconds')");
  const s1 = (await req('GET', '/api/stats', { cookie: admin })).json.unpublished;
  assert.deepEqual(s1, { pages: 0, assets: 0, tours: 0, total: 0 });
  await pool().query("UPDATE tours SET updated_at = now() + interval '1 minute' WHERE slug = 'tour-uno'");
  assert.deepEqual((await req('GET', '/api/stats', { cookie: admin })).json.unpublished, { pages: 0, assets: 0, tours: 1, total: 1 });
});

test('tours: exportar/importar ida y vuelta (assets/tours/<slug>.json) y no se tratan como assets', async () => {
  const OUT1 = pathx.join(PORTAL_DIR, 'work', 'tours-test-1');
  const OUT2 = pathx.join(PORTAL_DIR, 'work', 'tours-test-2');
  for (const d of [OUT1, OUT2]) safeRm(d);
  try {
    const p = pool();
    const e1 = await exportToDir({ pool: p, outDir: OUT1 });
    assert.equal(e1.tours, 1); // solo tour-uno: tour-copia es borrador
    const file = pathx.join(OUT1, 'assets', 'tours', 'tour-uno.json');
    const raw = fsx.readFileSync(file, 'utf8');
    assert.ok(raw.endsWith('}\n') && !raw.includes('\r'));
    const j = JSON.parse(raw);
    assert.deepEqual(Object.keys(j), ['slug', 'title', 'description', 'steps']);
    assert.equal(j.steps[0].width, 640);
    assert.equal(j.steps[0].height, 400);
    assert.equal(j.steps[1].spot, null);
    assert.equal(fsx.existsSync(pathx.join(OUT1, 'assets', 'tours', 'tour-copia.json')), false);
    const nAssets = (await p.query('SELECT count(*)::int AS n FROM assets')).rows[0].n;
    assert.equal(e1.assets, nAssets); // el JSON no cuenta como asset
    // "base limpia": vaciar contenido y reimportar desde la exportación
    await p.query('TRUNCATE tours, pages, page_revisions, assets, site_files RESTART IDENTITY CASCADE');
    const imp = await importFromRepo({ pool: p, repoRoot: OUT1, overwrite: 'unedited' });
    assert.equal(imp.tours, 1);
    assert.equal(imp.assets, nAssets); // y al importar no entra como asset
    const row = (await p.query('SELECT slug, title, status, steps FROM tours')).rows;
    assert.equal(row.length, 1);
    assert.equal(row[0].status, 'published');
    assert.equal(row[0].steps[0].width, undefined); // ancho/alto se regeneran desde assets, no se guardan
    const e2 = await exportToDir({ pool: p, outDir: OUT2 });
    assert.equal(e2.tours, 1);
    assert.equal(fsx.readFileSync(pathx.join(OUT2, 'assets', 'tours', 'tour-uno.json'), 'utf8'), raw);
    // reimportar no pisa un tour editado en el portal
    await p.query("UPDATE tours SET title = 'Editado aquí', version = 2");
    const again = await importFromRepo({ pool: p, repoRoot: OUT1, overwrite: 'unedited' });
    assert.equal(again.skippedItems.includes('tours/tour-uno'), true);
    assert.equal((await p.query('SELECT title FROM tours')).rows[0].title, 'Editado aquí');
  } finally {
    for (const d of [OUT1, OUT2]) safeRm(d);
  }
});

// ---- subsecciones (parent_id), grupos y menú de /guia
async function mkPage(seccion, slug, extra = {}) {
  const payload = { seccion, slug, title: `Página ${slug}`, tipo: seccion === 'guia' ? 'guia' : 'tarea', ...(seccion === 'tareas' ? { modulo: 'sub' } : {}), ...extra };
  const r = await req('POST', '/api/pages', { cookie: admin, payload });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json;
}
const nodesOf = (tree, seccion) => tree.json.secciones.find((s) => s.key === seccion).grupos;
const flatIds = (list) => list.flatMap((n) => [n.id, ...flatIds(n.children)]);

test('subsecciones: PUT order anidado, grupo heredado, profundidad, ciclos, pageIds y creación/movimiento con parent_id', async () => {
  let a, b, c, d, e;
  const mk = [];
  for (const s of ['sa', 'sb', 'sc', 'sd', 'se']) mk.push(await mkPage('tareas', s, { grupo: 'G1' }));
  [a, b, c, d, e] = mk;
  const ok = await req('PUT', '/api/structure/order', {
    cookie: admin,
    payload: { seccion: 'tareas', grupos: [{ name: 'G1', nodes: [{ id: a.id, children: [{ id: b.id, children: [{ id: c.id }] }, { id: d.id }] }, { id: e.id }] }, { name: 'G2', nodes: [] }] },
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  const g1 = nodesOf(await req('GET', '/api/structure', { cookie: admin }), 'tareas').find((g) => g.name === 'G1');
  assert.deepEqual(g1.pages.map((n) => n.id), [a.id, e.id]);
  const na = g1.pages[0];
  assert.deepEqual(Object.keys(na).sort(), ['children', 'id', 'orden', 'route', 'status', 'title']);
  assert.deepEqual(na.children.map((n) => n.id), [b.id, d.id]);
  assert.deepEqual(na.children[0].children.map((n) => n.id), [c.id]);
  assert.equal(na.children[1].orden, 2);
  // grupo vacío conservado
  assert.ok(nodesOf(await req('GET', '/api/structure', { cookie: admin }), 'tareas').some((g) => g.name === 'G2' && g.pages.length === 0));
  // profundidad 4 → 400; duplicado/ciclo → 400; id de otra sección → 400
  const deep = { name: 'G1', nodes: [{ id: a.id, children: [{ id: b.id, children: [{ id: c.id, children: [{ id: d.id }] }] }] }] };
  assert.equal((await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'tareas', grupos: [deep] } })).status, 400);
  const cyc = { name: 'G1', nodes: [{ id: a.id, children: [{ id: b.id, children: [{ id: a.id }] }] }] };
  assert.equal((await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'tareas', grupos: [cyc] } })).status, 400);
  const gp = await mkPage('problemas', 'otra-seccion');
  assert.equal((await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'tareas', grupos: [{ name: 'G1', nodes: [{ id: a.id, children: [{ id: gp.id }] }] }] } })).status, 400);
  // atomicidad: nada cambió
  assert.equal((await req('GET', `/api/pages/${c.id}`, { cookie: admin })).json.parent_id, b.id);
  // mover una rama con hijos a otro grupo reasigna el grupo de los hijos
  const mv = await req('PUT', '/api/structure/order', {
    cookie: admin,
    payload: { seccion: 'tareas', grupos: [{ name: 'G1', nodes: [{ id: e.id }] }, { name: 'G2', nodes: [{ id: a.id, children: [{ id: b.id, children: [{ id: c.id }] }, { id: d.id }] }] }] },
  });
  assert.equal(mv.status, 200);
  for (const p of [a, b, c, d]) assert.equal((await req('GET', `/api/pages/${p.id}`, { cookie: admin })).json.grupo, 'G2');
  // formato antiguo pageIds: aplana (quita padres)
  assert.equal((await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'tareas', grupos: [{ name: 'G2', pageIds: [a.id, b.id, c.id, d.id] }] } })).status, 200);
  assert.equal((await req('GET', `/api/pages/${c.id}`, { cookie: admin })).json.parent_id, null);
  // crear con parent_id hereda grupo; profundidad
  const h = await mkPage('tareas', 'hija', { parent_id: a.id });
  assert.equal(h.parent_id, a.id);
  assert.equal(h.grupo, 'G2');
  const h2 = await mkPage('tareas', 'nieta', { parent_id: h.id });
  assert.equal((await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'tareas', modulo: 'sub', slug: 'bisnieta', title: 'B', tipo: 'tarea', parent_id: h2.id } })).status, 400);
  assert.equal((await req('POST', '/api/pages', { cookie: admin, payload: { seccion: 'tareas', modulo: 'sub', slug: 'x1', title: 'B', tipo: 'tarea', parent_id: gp.id } })).status, 400);
  // mover con parent_id: ciclo y profundidad rechazados; null desvincula
  assert.equal((await req('POST', `/api/pages/${a.id}/move`, { cookie: admin, payload: { parent_id: h2.id } })).status, 400);
  assert.equal((await req('POST', `/api/pages/${e.id}/move`, { cookie: admin, payload: { parent_id: h2.id } })).status, 400);
  const mvp = await req('POST', `/api/pages/${e.id}/move`, { cookie: admin, payload: { parent_id: d.id } });
  assert.equal(mvp.status, 200, JSON.stringify(mvp.json));
  assert.equal(mvp.json.parent_id, d.id);
  assert.equal(mvp.json.grupo, 'G2');
  assert.equal(mvp.json.route, e.route);
  const un = await req('POST', `/api/pages/${e.id}/move`, { cookie: admin, payload: { parent_id: null } });
  assert.equal(un.json.parent_id, null);
  // con subsecciones no se cambia de sección
  assert.equal((await req('POST', `/api/pages/${a.id}/move`, { cookie: admin, payload: { seccion: 'conceptos' } })).status, 409);
});

test('subsecciones: exportar escribe padre y reimportar lo resuelve; sin padre el frontmatter queda como estaba', async () => {
  const p = pool();
  await p.query("UPDATE pages SET status = 'published'");
  const OUT = pathx.join(PORTAL_DIR, 'work', 'padre-test');
  const OUT2 = pathx.join(PORTAL_DIR, 'work', 'padre-test-2');
  for (const d of [OUT, OUT2]) safeRm(d);
  try {
    const { rows } = await p.query("SELECT id, route, file_path, parent_id FROM pages WHERE route IN ('/tareas/sub/hija','/tareas/sub/nieta','/tareas/sub/sa')");
    const by = Object.fromEntries(rows.map((r) => [r.route, r]));
    assert.equal(by['/tareas/sub/nieta'].parent_id, by['/tareas/sub/hija'].id);
    await exportToDir({ pool: p, outDir: OUT });
    const read = (r) => fsx.readFileSync(pathx.join(OUT, 'docs', by[r].file_path), 'utf8');
    assert.match(read('/tareas/sub/nieta'), /^padre: "\/tareas\/sub\/hija"\r?$/m);
    assert.doesNotMatch(read('/tareas/sub/sa'), /^padre:/m);
    const before = read('/tareas/sub/nieta').replace(/^padre: .*\r?\n/m, '');
    // ida y vuelta: base limpia → importar → el padre vuelve a parent_id
    await p.query('TRUNCATE pages, page_revisions, redirects RESTART IDENTITY CASCADE');
    await importFromRepo({ pool: p, repoRoot: OUT, overwrite: 'all' });
    const r2 = await p.query("SELECT c.route, pp.route AS padre FROM pages c LEFT JOIN pages pp ON pp.id = c.parent_id WHERE c.route LIKE '/tareas/sub/%' AND pp.id IS NOT NULL ORDER BY c.route");
    assert.deepEqual(r2.rows.map((x) => [x.route, x.padre]), [['/tareas/sub/hija', '/tareas/sub/sa'], ['/tareas/sub/nieta', '/tareas/sub/hija']]);
    // quitar el padre en el portal quita la línea y el resto del frontmatter no cambia
    await p.query("UPDATE pages SET parent_id = NULL WHERE route = '/tareas/sub/nieta'");
    await exportToDir({ pool: p, outDir: OUT2 });
    assert.equal(fsx.readFileSync(pathx.join(OUT2, 'docs', by['/tareas/sub/nieta'].file_path), 'utf8'), before);
  } finally {
    for (const d of [OUT, OUT2]) safeRm(d);
  }
});

test('grupos: crear y renombrar (secciones normales)', async () => {
  const cr = await req('POST', '/api/structure/groups', { cookie: admin, payload: { seccion: 'referencia', name: 'Grupo nuevo' } });
  assert.equal(cr.status, 201);
  assert.equal((await req('POST', '/api/structure/groups', { cookie: admin, payload: { seccion: 'referencia', name: 'Grupo nuevo' } })).status, 409);
  assert.equal((await req('POST', '/api/structure/groups', { cookie: admin, payload: { seccion: 'nada', name: 'X' } })).status, 400);
  assert.equal((await req('POST', '/api/structure/groups', { cookie: admin, payload: { seccion: 'referencia', name: '  ' } })).status, 400);
  const t = nodesOf(await req('GET', '/api/structure', { cookie: admin }), 'referencia');
  assert.ok(t.some((g) => g.name === 'Grupo nuevo' && g.pages.length === 0));
  const rp = await mkPage('referencia', 'r1', { grupo: 'Viejo' });
  assert.equal((await req('PUT', '/api/structure/groups', { cookie: admin, payload: { seccion: 'referencia', from: 'Viejo', to: 'Grupo nuevo' } })).status, 409);
  assert.equal((await req('PUT', '/api/structure/groups', { cookie: admin, payload: { seccion: 'referencia', from: 'Viejo', to: 'Renombrado' } })).json.changed, 1);
  const pr = (await req('GET', `/api/pages/${rp.id}`, { cookie: admin })).json;
  assert.equal(pr.grupo, 'Renombrado');
  assert.equal(pr.frontmatter.grupo, 'Renombrado');
  assert.equal((await req('PUT', '/api/structure/groups', { cookie: admin, payload: { seccion: 'referencia', from: 'No existe', to: 'Otro' } })).status, 404);
  assert.equal((await req('PUT', '/api/structure/groups', { cookie: admin, payload: { seccion: 'referencia', from: 'Grupo nuevo', to: 'Vacío 2' } })).status, 200);
  assert.ok(nodesOf(await req('GET', '/api/structure', { cookie: admin }), 'referencia').some((g) => g.name === 'Vacío 2'));
  const vi = (await login('viewer1', 'Clave-larga-1')).cookie;
  assert.equal((await req('POST', '/api/structure/groups', { cookie: vi, payload: { seccion: 'referencia', name: 'Z' } })).status, 403);
});

test('/guia: árbol unificado con sidebar.json, edición con la misma API conservando emojis y etiquetas', async () => {
  const gs = [];
  for (const s of ['g1', 'g2', 'g3', 'g4']) gs.push(await mkPage('guia', s));
  const [g1, g2, g3, g4] = gs;
  await req('PUT', '/api/structure/guia-sidebar', {
    cookie: admin,
    payload: { data: [{ sectionHeader: 'Inicio', items: [{ text: '🏠 Uno', link: g1.route, tag: 'Clave' }, { text: '🚀 Dos', link: g2.route }] }] },
  });
  let t = nodesOf(await req('GET', '/api/structure', { cookie: admin }), 'guia');
  assert.deepEqual(t.map((g) => g.name), ['Inicio', 'Otras pantallas']);
  assert.deepEqual(t[0].pages.map((n) => n.id), [g1.id, g2.id]);
  assert.deepEqual(t[1].pages.map((n) => n.id).sort(), [g3.id, g4.id].sort());
  // anidar g2 bajo g1, g4 bajo g2, g3 a un grupo nuevo
  const put = await req('PUT', '/api/structure/order', {
    cookie: admin,
    payload: { seccion: 'guia', grupos: [{ name: 'Inicio', nodes: [{ id: g1.id, children: [{ id: g2.id, children: [{ id: g4.id }] }] }] }, { name: 'Nuevo grupo', nodes: [{ id: g3.id }] }] },
  });
  assert.equal(put.status, 200, JSON.stringify(put.json));
  const sb = JSON.parse((await req('GET', '/api/structure/guia-sidebar', { cookie: admin })).json.content);
  assert.deepEqual(sb.map((g) => g.sectionHeader), ['Inicio', 'Nuevo grupo']);
  const i1 = sb[0].items[0];
  assert.equal(i1.text, '🏠 Uno');
  assert.equal(i1.tag, 'Clave');
  assert.equal(i1.collapsed, true);
  assert.equal(i1.items[0].text, '🚀 Dos');
  assert.equal(i1.items[0].items[0].link, g4.route);
  assert.equal(i1.items[0].items[0].text, g4.title); // sin texto previo: el título de la página
  assert.equal(sb[1].items[0].link, g3.route);
  assert.equal((await req('GET', `/api/pages/${g4.id}`, { cookie: admin })).json.parent_id, g2.id);
  assert.equal((await req('GET', `/api/pages/${g3.id}`, { cookie: admin })).json.parent_id, null);
  t = nodesOf(await req('GET', '/api/structure', { cookie: admin }), 'guia');
  assert.deepEqual(flatIds(t[0].pages), [g1.id, g2.id, g4.id]);
  assert.equal(t[0].pages[0].menu, '🏠 Uno');
  // profundidad 4 → 400 y el sidebar no cambia
  const before = (await req('GET', '/api/structure/guia-sidebar', { cookie: admin })).json.content;
  const g5 = await mkPage('guia', 'g5');
  const bad = await req('PUT', '/api/structure/order', {
    cookie: admin,
    payload: { seccion: 'guia', grupos: [{ name: 'Inicio', nodes: [{ id: g1.id, children: [{ id: g2.id, children: [{ id: g4.id, children: [{ id: g5.id }] }] }] }] }] },
  });
  assert.equal(bad.status, 400);
  assert.equal((await req('GET', '/api/structure/guia-sidebar', { cookie: admin })).json.content, before);
  // grupos de /guia
  assert.equal((await req('POST', '/api/structure/groups', { cookie: admin, payload: { seccion: 'guia', name: 'Vacío guía' } })).status, 201);
  assert.equal((await req('PUT', '/api/structure/groups', { cookie: admin, payload: { seccion: 'guia', from: 'Nuevo grupo', to: 'Renombrado' } })).status, 200);
  const sb2 = JSON.parse((await req('GET', '/api/structure/guia-sidebar', { cookie: admin })).json.content);
  assert.deepEqual(sb2.map((g) => g.sectionHeader), ['Inicio', 'Renombrado', 'Vacío guía']);
  // exportar: padre en las páginas anidadas
  await pool().query("UPDATE pages SET status = 'published'");
  const OUT = pathx.join(PORTAL_DIR, 'work', 'padre-guia-test');
  safeRm(OUT);
  try {
    await exportToDir({ pool: pool(), outDir: OUT });
    assert.match(fsx.readFileSync(pathx.join(OUT, 'docs', 'guia', 'g4.mdx'), 'utf8'), /^padre: "\/guia\/g2"\r?$/m);
    assert.equal(JSON.parse(fsx.readFileSync(pathx.join(OUT, 'docs', 'sidebar.json'), 'utf8'))[0].items[0].items[0].link, g2.route);
  } finally {
    safeRm(OUT);
  }
});

// ---- Adenda 3: guardar en vivo (markDirty solo en lo visible), publicar borradores, ajustes del sitio y sistema
test('adenda 3: markDirty solo en cambios visibles; publicar/despublicar/publicar borradores; ajustes; sitio y sistema', async () => {
  const site = app.portal.ctx.site;
  assert.ok(site && typeof site.markDirty === 'function', 'ctx.site existe');
  const calls = [];
  const orig = site.markDirty;
  site.markDirty = (r) => calls.push(r);
  try {
    const take = () => calls.splice(0);
    // borrador: crear y editar no dispara nada
    const d = await mkPage('tareas', 'vivo-borrador');
    assert.deepEqual(take(), []);
    let v = (await req('PUT', `/api/pages/${d.id}`, { cookie: admin, payload: { version: d.version, body: d.body + '\nTexto de borrador.\n' } })).json.version;
    assert.deepEqual(take(), [], 'editar un borrador no actualiza el sitio');
    // publicar con errores → 400 con problems; sin cambios
    const bad = await mkPage('tareas', 'vivo-roto');
    await req('PUT', `/api/pages/${bad.id}`, { cookie: admin, payload: { version: bad.version, body: 'Llave suelta { aquí' } });
    const pb = await req('POST', `/api/pages/${bad.id}/publish`, { cookie: admin, payload: {} });
    assert.equal(pb.status, 400);
    assert.ok(pb.json.problems.length >= 1);
    assert.deepEqual(take(), []);
    // publicar: status, versión +1, revisión y markDirty
    const p1 = await req('POST', `/api/pages/${d.id}/publish`, { cookie: admin, payload: { version: v } });
    assert.equal(p1.status, 200, JSON.stringify(p1.json));
    assert.equal(p1.json.status, 'published');
    assert.equal(p1.json.version, v + 1);
    assert.deepEqual(take(), [`página publicada: ${d.route}`]);
    assert.equal((await req('POST', `/api/pages/${d.id}/publish`, { cookie: admin, payload: {} })).status, 409);
    assert.equal((await req('POST', `/api/pages/${d.id}/unpublish`, { cookie: admin, payload: { version: 1 } })).status, 409); // versión vieja
    const revs = (await req('GET', `/api/pages/${d.id}/revisions`, { cookie: admin })).json.items;
    assert.ok(revs.some((r) => r.version === v));
    // editar publicada → markDirty
    v = p1.json.version;
    v = (await req('PUT', `/api/pages/${d.id}`, { cookie: admin, payload: { version: v, body: 'Cuerpo publicado editado.' } })).json.version;
    assert.deepEqual(take(), [`página editada: ${d.route}`]);
    // despublicar → markDirty; luego editarla ya no
    const u1 = await req('POST', `/api/pages/${d.id}/unpublish`, { cookie: admin, payload: { version: v } });
    assert.equal(u1.status, 200);
    assert.equal(u1.json.status, 'draft');
    assert.deepEqual(take(), [`página despublicada: ${d.route}`]);
    await req('PUT', `/api/pages/${d.id}`, { cookie: admin, payload: { version: u1.json.version, body: 'Otra vez borrador.' } });
    assert.deepEqual(take(), []);
    // borrar/restaurar un borrador: nada
    const e = await mkPage('tareas', 'vivo-efimera');
    assert.equal((await req('DELETE', `/api/pages/${e.id}`, { cookie: admin })).status, 200);
    assert.equal((await req('POST', `/api/pages/${e.id}/restore`, { cookie: admin })).status, 200);
    assert.deepEqual(take(), []);
    // publicar borradores (lista concreta): publica los válidos y salta los rotos y los inexistentes
    const sel = await req('POST', '/api/pages/publish-drafts', { cookie: admin, payload: { ids: [d.id, bad.id, e.id, 999999] } });
    assert.equal(sel.status, 200);
    assert.equal(sel.json.count, 2);
    assert.deepEqual(sel.json.published.map((x) => x.id).sort((a, b) => a - b), [d.id, e.id].sort((a, b) => a - b));
    assert.deepEqual(sel.json.skipped.map((x) => x.id).sort((a, b) => a - b), [bad.id, 999999].sort((a, b) => a - b));
    assert.deepEqual(take(), ['2 borradores publicados']);
    assert.equal((await req('POST', '/api/pages/publish-drafts', { cookie: admin, payload: { ids: 'x' } })).status, 400);
    // mover / borrar una publicada → sí
    const mv = await req('POST', `/api/pages/${e.id}/move`, { cookie: admin, payload: { slug: 'vivo-efimera-2' } });
    assert.equal(mv.status, 200);
    assert.deepEqual(take(), [`página movida: ${e.route} → ${mv.json.route}`]);
    assert.equal((await req('DELETE', `/api/pages/${e.id}`, { cookie: admin })).status, 200);
    assert.deepEqual(take(), [`página eliminada: ${mv.json.route}`]);
    // estructura: reordenar solo borradores → no; con una publicada → sí
    const b1 = await mkPage('conceptos', 'vivo-b1', { grupo: 'Solo borradores' });
    const b2 = await mkPage('conceptos', 'vivo-b2', { grupo: 'Solo borradores' });
    const ord = await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'conceptos', grupos: [{ name: 'Solo borradores', pageIds: [b2.id, b1.id] }] } });
    assert.equal(ord.status, 200, JSON.stringify(ord.json));
    assert.deepEqual(take(), [], 'reordenar borradores no actualiza el sitio');
    assert.equal((await req('POST', `/api/pages/${b1.id}/publish`, { cookie: admin, payload: {} })).status, 200);
    take();
    await req('PUT', '/api/structure/order', { cookie: admin, payload: { seccion: 'conceptos', grupos: [{ name: 'Solo borradores', pageIds: [b1.id, b2.id] }] } });
    assert.deepEqual(take(), ['estructura reordenada: conceptos']);
    // publicar todos los borradores (sin ids) salta los que tienen errores
    const all = await req('POST', '/api/pages/publish-drafts', { cookie: admin, payload: {} });
    assert.equal(all.status, 200);
    assert.ok(all.json.skipped.some((x) => x.id === bad.id));
    assert.ok(!all.json.published.some((x) => x.id === bad.id));
    take();
    // tours: borrador nada; publicado sí
    await seedTourAssets();
    const t = (await req('POST', '/api/tours', { cookie: admin, payload: { slug: 'vivo-tour', title: 'Tour vivo' } })).json;
    let tv = (await req('PUT', `/api/tours/${t.id}`, { cookie: admin, payload: { version: t.version, steps: [step()] } })).json.version;
    assert.deepEqual(take(), []);
    tv = (await req('PUT', `/api/tours/${t.id}`, { cookie: admin, payload: { version: tv, status: 'published' } })).json.version;
    assert.deepEqual(take(), ['tour editado: vivo-tour']);
    assert.equal((await req('DELETE', `/api/tours/${t.id}`, { cookie: admin })).status, 200);
    assert.deepEqual(take(), ['tour eliminado: vivo-tour']);
    // ajustes del sitio: markDirty solo al cambiar título/WhatsApp; los internos se rechazan
    const g = (await req('GET', '/api/settings', { cookie: admin })).json;
    for (const k of ['auto_publish', 'auto_publish_delay']) assert.ok(g.definitions.some((x) => x.key === k), k);
    assert.equal(g.settings.auto_publish_delay, 8);
    for (const no of [{ site_base: '/docs/' }, { restart_mode: 'respawn' }, { auto_publish_delay: 0 }, { auto_publish_delay: 121 }]) {
      assert.equal((await req('PUT', '/api/settings', { cookie: admin, payload: no })).status, 400, JSON.stringify(no));
    }
    assert.deepEqual(take(), []);
    assert.equal((await req('PUT', '/api/settings', { cookie: admin, payload: { site_title: 'Otro nombre', auto_publish_delay: 3 } })).status, 200);
    assert.deepEqual(take(), ['ajustes del sitio']);
    assert.equal((await req('PUT', '/api/settings', { cookie: admin, payload: { site_title: 'Otro nombre' } })).status, 200);
    assert.deepEqual(take(), [], 'mismo valor: nada');
    assert.equal((await req('PUT', '/api/settings', { cookie: admin, payload: { contact_whatsapp: '+593 99 123 4567' } })).status, 200);
    assert.deepEqual(take(), ['ajustes del sitio']);
    await req('PUT', '/api/settings', { cookie: admin, payload: { site_title: '', contact_whatsapp: '', auto_publish_delay: 8 } });
    take();
  } finally {
    site.markDirty = orig;
  }
  // /api/site/status con la forma del contrato (auto desactivado por PORTAL_SITE_AUTO=off en las pruebas)
  const drafts = (await req('GET', '/api/stats', { cookie: admin })).json.drafts;
  const st = await req('GET', '/api/site/status', { cookie: admin });
  assert.equal(st.status, 200);
  for (const k of ['state', 'pendingReasons', 'nextRunInMs', 'building', 'lastBuild', 'drafts', 'siteUrl']) assert.ok(k in st.json, k);
  assert.equal(st.json.drafts, drafts);
  assert.equal(st.json.siteUrl, '/');
  assert.equal(st.json.restartRequired, false, 'el sitio se sirve con la base con la que se generó: sin reinicios');
  assert.equal(st.json.autoPublish, false);
  // markDirty real con auto desactivado: queda pendiente, sin programar
  site.markDirty('prueba pendiente');
  const st2 = (await req('GET', '/api/site/status', { cookie: admin })).json;
  assert.equal(st2.state, 'pending');
  assert.ok(st2.pendingReasons.includes('prueba pendiente'));
  assert.equal(st2.nextRunInMs, null);
  // sistema: sin repositorio Git → initialized:false con mensaje; update 409 (también el alias); restart exige confirmación
  const sinRepo = pathx.join(PORTAL_DIR, 'work-test', 'sin-repo');
  fsx.mkdirSync(sinRepo, { recursive: true });
  const setRepo = (p) => app.portal.ctx.pool.query("INSERT INTO settings (key, value) VALUES ('repo_path', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(p)]);
  await setRepo(sinRepo); // solo con PORTAL_ALLOW_INTERNAL_SETTINGS=1 (pruebas); el panel ya no lo permite
  try {
    const ver = await req('GET', '/api/system/version', { cookie: admin });
    assert.equal(ver.status, 200);
    assert.equal(ver.json.initialized, false);
    assert.match(ver.json.message, /No hay un repositorio Git/);
    assert.equal(ver.json.canUpdate, false);
    assert.ok(!('repoPath' in ver.json) && !('remote' in ver.json), 'sin ruta ni remoto en la respuesta');
    assert.equal(ver.json.updateMode, 'inline');
    const inf = await req('GET', '/api/system/info', { cookie: admin });
    assert.equal(inf.status, 200);
    assert.equal(inf.json.version, null);
    assert.equal(inf.json.update.canUpdate, false);
    assert.equal((await req('POST', '/api/git/remote', { cookie: admin, payload: { url: 'https://example.invalid/x.git' } })).status, 404);
    const up = await req('POST', '/api/system/update', { cookie: admin });
    assert.equal(up.status, 409);
    assert.match(up.json.error, /No hay un repositorio Git/);
    assert.equal((await req('POST', '/api/git/update', { cookie: admin, payload: { reimport: true } })).status, 409);
    assert.equal((await req('POST', '/api/system/restart', { cookie: admin, payload: { confirm: 'si' } })).status, 400);
  } finally {
    await setRepo(pathx.resolve(PORTAL_DIR, '..'));
  }
});
