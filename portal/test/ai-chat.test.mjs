// Asistente conversacional de IA (fase 2): POST /api/ai/chat con tool-calling contra un Groq FALSO scripteado.
// La IA solo lee y PROPONE: se comprueba que nada se escribe en la BD, que las propuestas se validan como contenido humano
// y que la clave no aparece en ninguna respuesta, log ni auditoría. Contra TEST_DATABASE_URL (o PORTAL_TEST_DB_NAME).
// Uso: node --test --test-concurrency=1 test/ai-chat.test.mjs
import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';

loadEnv();
let TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('Falta TEST_DATABASE_URL');
if (TEST_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
const pg = (await import('pg')).default;
{
  const own = process.env.PORTAL_TEST_DB_NAME;
  if (own) {
    if (!/^[a-z0-9_]{3,60}$/.test(own) || own === 'ispmax_manual') throw new Error('PORTAL_TEST_DB_NAME no válido.');
    const u = new URL(TEST_URL);
    const adm = new pg.Client({ connectionString: Object.assign(new URL(TEST_URL), { pathname: '/postgres' }).toString() });
    await adm.connect();
    if (!(await adm.query('SELECT 1 FROM pg_database WHERE datname = $1', [own])).rowCount) await adm.query(`CREATE DATABASE "${own}" ENCODING 'UTF8'`);
    await adm.end();
    u.pathname = '/' + own;
    TEST_URL = u.toString();
  }
}
process.env.DATABASE_URL = TEST_URL;
process.env.PORTAL_ADMIN_USER = 'admin_ic';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
process.env.PORTAL_RENDER_MODE = 'static';
process.env.PORTAL_ALLOW_INTERNAL_SETTINGS = '1';
const RUN = path.join(PORTAL_ROOT, 'work-test', 'ai-chat-test');
process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
process.env.PORTAL_DATA_DIR = path.join(RUN, 'data');
// vacías, no borradas: loadEnv() las volvería a leer de portal/.env
process.env.GROQ_API_KEY = '';
process.env.GROQ_MODEL = '';
process.env.PORTAL_AI_RATE = '1000';
process.env.GROQ_TIMEOUT_MS = '1500';

const SENTINEL = 'gsk_CENTINELA_CHAT_7c1e90b3a45d2f68e1b0';
const { buildApp } = await import('../server/index.mjs');
const { parseIpAllowList } = await import('../server/config.mjs');

// ---- Groq falso scripteado: cada llamada consume el siguiente paso de fake.script
const fake = { script: [], loop: false, mode: 'script', calls: [], server: null };
const tc = (name, args, id = 'c' + Math.random().toString(36).slice(2, 8)) => ({ role: 'assistant', content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) } }] });
const say = (content) => ({ role: 'assistant', content });
function startFake() {
  fake.server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (d) => (raw += d));
    req.on('end', () => {
      let body = null;
      try { body = JSON.parse(raw); } catch {}
      fake.calls.push({ auth: req.headers.authorization, body });
      const send = (st, txt) => { res.writeHead(st, { 'content-type': 'application/json' }); res.end(txt); };
      if (fake.mode === 'rate') return send(429, JSON.stringify({ error: { message: `limit ${SENTINEL}` } }));
      if (fake.mode === 'auth') return send(401, JSON.stringify({ error: { message: `bad key ${SENTINEL}` } }));
      if (fake.mode === 'badreq') return send(400, JSON.stringify({ error: { message: 'tool_use_failed: Failed to call a function' } }));
      if (fake.mode === 'hang') return void setTimeout(() => { try { send(200, '{}'); } catch {} }, 4000);
      const step = fake.loop ? tc('list_outline', {}) : fake.script.length ? fake.script.shift() : say('Listo.');
      const message = typeof step === 'function' ? step(body) : step;
      send(200, JSON.stringify({ id: 'x', object: 'chat.completion', model: 'fake', choices: [{ index: 0, finish_reason: message.tool_calls ? 'tool_calls' : 'stop', message }] }));
    });
  });
  return new Promise((resolve) => fake.server.listen(0, '127.0.0.1', () => { process.env.GROQ_BASE_URL = `http://127.0.0.1:${fake.server.address().port}`; resolve(); }));
}
const reset = () => { fake.script = []; fake.loop = false; fake.mode = 'script'; fake.calls = []; };

const seen = [];
const origs = {};
for (const k of ['log', 'warn', 'error', 'info']) {
  origs[k] = console[k];
  console[k] = (...a) => { seen.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
}
let app;
let pool;
const apps = [];
const ck = {};
async function mk() {
  const a = await buildApp({ databaseUrl: TEST_URL, watchSite: false, config: { trustProxy: false, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), probeThreshold: 100000 } });
  apps.push(a);
  return a;
}
async function req(method, url, { cookie, payload } = {}, a = app) {
  const res = await a.inject({ method, url, payload, headers: cookie ? { cookie } : {} });
  seen.push(res.body);
  let json = null;
  try { json = JSON.parse(res.body); } catch {}
  return { status: res.statusCode, json, body: res.body, headers: res.headers };
}
async function login(a, u, p) {
  const r = await a.inject({ method: 'POST', url: '/api/auth/login', payload: { username: u, password: p } });
  assert.equal(r.statusCode, 200, r.body);
  return `portal_session=${r.cookies.find((x) => x.name === 'portal_session').value}`;
}
const snapshot = async () => (await pool.query('SELECT id, route, version, body, status, grupo, seccion, parent_id FROM pages ORDER BY id')).rows;
const chat = (text, context, extra = {}) => req('POST', '/api/ai/chat', { cookie: ck.editor, payload: { messages: [{ role: 'user', content: text }], ...(context ? { context } : {}), ...extra } });
const toolMsgs = (callIdx) => fake.calls[callIdx].body.messages.filter((m) => m.role === 'tool').map((m) => m.content);
let ids = {};

before(async () => {
  safeRm(RUN);
  await startFake();
  pool = new pg.Pool({ connectionString: TEST_URL });
  await resetTestDb(pool);
  app = await mk();
  await app.portal.ensureAdmin();
  ck.admin = await login(app, 'admin_ic', 'Clave-de-prueba-1');
  for (const role of ['viewer', 'editor']) {
    const r = await req('POST', '/api/users', { cookie: ck.admin, payload: { username: `${role}_ic`, password: 'Clave-Segura-2026', role } });
    assert.equal(r.status, 201, r.body);
    ck[role] = await login(app, `${role}_ic`, 'Clave-Segura-2026');
  }
  assert.equal((await req('PUT', '/api/ai/config', { cookie: ck.admin, payload: { apiKey: SENTINEL, model: 'openai/gpt-oss-120b', enabled: true } })).status, 200);
  const mkPage = async (seccion, slug, title, extra = {}) => {
    const r = await req('POST', '/api/pages', { cookie: ck.editor, payload: { seccion, slug, title, tipo: seccion === 'tareas' ? 'tarea' : seccion === 'guia' ? 'guia' : 'problema', ...extra } });
    assert.equal(r.status, 201, r.body);
    return r.json;
  };
  const welcome = await mkPage('guia', 'bienvenida', 'Bienvenida', { grupo: 'Inicio' });
  const clientes = await mkPage('guia', 'clientes', 'Clientes', { grupo: 'General' });
  const tarea = await mkPage('tareas', 'crear-cliente', 'Crear un cliente', { modulo: 'clientes' });
  const prob = await mkPage('problemas', 'no-carga', 'La pantalla no carga');
  const body = '<Kicker>Guía de pantallas</Kicker>\n\n# Clientes\n\n<Lead>Pantalla de clientes.</Lead>\n\n## Crear un cliente\n\nPara crear un cliente pulse el boton Nuevo cliente.\n\n## Eliminar\n\nSe elimina desde el menú.\n';
  const put = await req('PUT', `/api/pages/${clientes.id}`, { cookie: ck.editor, payload: { version: clientes.version, body, status: 'published' } });
  assert.equal(put.status, 200, put.body);
  ids = { welcome: welcome.id, clientes: clientes.id, tarea: tarea.id, prob: prob.id, clientesBody: body };
});
after(async () => {
  for (const k of Object.keys(origs)) console[k] = origs[k];
  await fake.server?.close();
  for (const a of apps) await a.close().catch(() => {});
  await pool?.end();
  safeRm(RUN);
});

test('«crea una página tipo plantilla en Inicio llamada test de vice»: list_outline + propose_create_page → una propuesta create, sin escribir nada', async () => {
  reset();
  fake.script = [tc('list_outline', {}), tc('propose_create_page', { title: 'test de vice', tipo: 'guia', seccion: 'guia', grupo: 'Inicio', usar_plantilla: true, motivo: 'La zona de inicio es el grupo Inicio de la Guía.' }), say('Propongo crear «test de vice» en /guia/test-de-vice, dentro del grupo Inicio de la Guía.')];
  const before = await snapshot();
  const r = await chat('Crea una nueva pagina, tipo plantilla en la zona de inicio, llama test de vice', { page: { id: ids.clientes, title: 'Clientes', route: '/guia/clientes', seccion: 'guia' } });
  assert.equal(r.status, 200, r.body);
  assert.match(r.json.reply, /test de vice/);
  assert.equal(r.json.proposals.length, 1);
  const p = r.json.proposals[0];
  assert.equal(p.kind, 'create');
  assert.equal(p.seccion, 'guia');
  assert.equal(p.grupo, 'Inicio');
  assert.equal(p.newGroup, false);
  assert.equal(p.tipo, 'guia');
  assert.equal(p.usesTemplate, true);
  assert.equal(p.route, '/guia/test-de-vice');
  assert.match(p.body, /^<Kicker>Guía de pantallas<\/Kicker>\n\n# test de vice\n\n<Lead>Para qué sirve esta pantalla\.<\/Lead>\n\n## Dónde está/);
  assert.match(p.summary, /Crear la página «test de vice» en \/guia\/test-de-vice como borrador/);
  assert.deepEqual(await snapshot(), before, 'proponer no escribe nada');
  // el modelo vio las herramientas, el contexto y el resultado de list_outline
  assert.equal(fake.calls.length, 3);
  assert.deepEqual(fake.calls[0].body.tools.map((t) => t.function.name), ['list_outline', 'search_pages', 'read_page', 'propose_create_page', 'propose_edit_page', 'ask_choice', 'propose_move_page']);
  assert.equal(fake.calls[0].body.tool_choice, 'auto');
  assert.match(fake.calls[0].body.messages[0].content, /Página abierta: id \d+, título «Clientes», ruta \/guia\/clientes/);
  assert.equal(fake.calls[0].body.messages[1].content, 'Crea una nueva pagina, tipo plantilla en la zona de inicio, llama test de vice');
  assert.match(toolMsgs(1)[0], /grupo "Inicio": \[\d+\] Bienvenida/);
  assert.match(toolMsgs(2)[1], /Propuesta registrada: crear «test de vice»/);
  assert.ok(!JSON.stringify(fake.calls.map((c) => c.body)).includes(SENTINEL), 'la clave solo va en la cabecera');
  assert.equal(fake.calls[0].auth, `Bearer ${SENTINEL}`);
});

test('pregunta aclaratoria: sin propuestas ni escrituras', async () => {
  reset();
  fake.script = [tc('list_outline', {}), say('¿En qué sección quieres la página: Guía, Tareas o Problemas?')];
  const before = await snapshot();
  const r = await chat('crea una página nueva');
  assert.equal(r.status, 200);
  assert.match(r.json.reply, /¿En qué sección/);
  assert.deepEqual(r.json.proposals, []);
  assert.deepEqual(await snapshot(), before);
});

test('propuesta con bloques: usa solo lo dado, sección con módulo y subsección; tareas sin módulo se pide', async () => {
  reset();
  fake.script = [tc('propose_create_page', { title: 'Registrar un cobro', tipo: 'tarea', seccion: 'tareas', modulo: 'clientes', blocks: [{ type: 'lead', text: 'Registra un pago.' }, { type: 'steps', steps: [{ title: 'Abrir', text: 'Entrar a **Clientes**.' }] }] }), tc('propose_create_page', { title: 'Sin módulo', tipo: 'tarea', seccion: 'tareas', usar_plantilla: true }), say('ok')];
  const r = await chat('crea la tarea registrar un cobro');
  assert.equal(r.status, 200, r.body);
  assert.equal(r.json.proposals.length, 1);
  assert.equal(r.json.proposals[0].route, '/tareas/clientes/registrar-un-cobro');
  assert.match(r.json.proposals[0].body, /<Steps>\n<Step>\n\n\*\*Abrir\*\*/);
  assert.equal(r.json.proposals[0].usesTemplate, false);
  assert.match(toolMsgs(2)[1], /Error: Las tareas necesitan un módulo/);
});

test('editar la página ABIERTA: read_page devuelve el texto del editor y la propuesta lleva diff y cuerpo nuevo', async () => {
  reset();
  const open = 'Intro\n\n## Crear un cliente\n\nPara crear un cliente pulse el boton Nuevo cliente (texto sin guardar).\n';
  fake.script = [tc('read_page', { page: ids.clientes }), tc('propose_edit_page', { page: ids.clientes, ops: [{ op: 'replace', find: 'pulse el boton Nuevo cliente', replace: 'pulsar **Nuevo cliente**' }] }), say('Propongo corregir la redacción.')];
  const before = await snapshot();
  const r = await chat('mejora la redacción de este párrafo', { page: { id: ids.clientes, title: 'Clientes', route: '/guia/clientes', seccion: 'guia', body: open } });
  assert.equal(r.status, 200, r.body);
  assert.match(toolMsgs(1)[0], /"es_la_pagina_abierta":true/);
  assert.match(toolMsgs(1)[0], /texto sin guardar/);
  const p = r.json.proposals[0];
  assert.equal(p.kind, 'edit');
  assert.equal(p.page.isOpen, true);
  assert.equal(p.after, open.replace('pulse el boton Nuevo cliente', 'pulsar **Nuevo cliente**'));
  assert.match(p.hunk.before, /pulse el boton/);
  assert.match(p.hunk.after, /pulsar \*\*Nuevo cliente\*\*/);
  assert.deepEqual(await snapshot(), before, 'la BD no cambia');
});

test('editar OTRA página (publicada): ops replace, insert_after, append y delete; errores del modelo no registran nada', async () => {
  reset();
  fake.script = [tc('search_pages', { query: 'clientes' }), tc('propose_edit_page', { page: '/guia/clientes', ops: [
    { op: 'replace', find: 'boton', replace: 'botón' },
    { op: 'insert_after', anchor: '## Eliminar', blocks: [{ type: 'paragraph', text: 'Solo puede quien tenga permiso.' }] },
    { op: 'append', blocks: [{ type: 'callout', kind: 'info', title: 'Pendiente de validación', text: 'Falta confirmar los permisos.' }] },
  ] }), say('Listo.')];
  const before = await snapshot();
  const r = await chat('en la página de clientes corrige el botón y añade una nota');
  assert.equal(r.status, 200, r.body);
  assert.match(toolMsgs(1)[0], /"route":"\/guia\/clientes"/);
  const p = r.json.proposals[0];
  assert.equal(p.page.id, ids.clientes);
  assert.equal(p.page.isOpen, false);
  assert.equal(p.page.status, 'published');
  assert.match(p.summary, /Está publicada: se vería al instante/);
  const cur = (await pool.query('SELECT version FROM pages WHERE id = $1', [ids.clientes])).rows[0].version;
  assert.equal(p.baseVersion, cur);
  assert.match(p.after, /botón Nuevo cliente\./);
  assert.match(p.after, /## Eliminar\n\nSolo puede quien tenga permiso\.\n\nSe elimina desde el menú\./);
  assert.match(p.after, /:::info Pendiente de validación\n\nFalta confirmar los permisos\.\n\n:::\n$/);
  assert.deepEqual(await snapshot(), before);
  // errores: texto inexistente, repetido, página inexistente, ruta inexistente, página eliminada de la lista, portada
  for (const [args, re] of [
    [{ page: ids.clientes, ops: [{ op: 'replace', find: 'no existe este texto', replace: 'x' }] }, /no se encontró/],
    [{ page: ids.clientes, ops: [{ op: 'replace', find: 'cliente', replace: 'x' }] }, /aparece más de una vez/],
    [{ page: 999999, ops: [{ op: 'delete', find: 'x' }] }, /no existe/],
    [{ page: '/guia/no-existe', ops: [{ op: 'delete', find: 'x' }] }, /no existe/],
    [{ page: 'clientes', ops: [{ op: 'delete', find: 'x' }] }, /id numérico o su ruta/],
    [{ page: ids.clientes, ops: [] }, /argumentos no válidos/],
  ]) {
    reset();
    fake.script = [tc('propose_edit_page', args), say('no pude')];
    const x = await chat('edita');
    assert.equal(x.status, 200);
    assert.deepEqual(x.json.proposals, [], JSON.stringify(args));
    assert.match(toolMsgs(1)[0], re, JSON.stringify(args));
  }
});

test('mover: propuesta con destino resuelto; destinos inválidos no se registran', async () => {
  reset();
  fake.script = [tc('propose_move_page', { page: ids.prob, seccion: 'guia', grupo: 'Inicio' }), tc('propose_move_page', { page: ids.tarea, parent_id: ids.clientes }), tc('propose_move_page', { page: 999999, seccion: 'guia' }), tc('propose_move_page', { page: ids.clientes }), tc('propose_move_page', { page: ids.clientes, grupo: 'General' }), say('ok')];
  const before = await snapshot();
  const r = await chat('mueve la página del problema a Inicio');
  assert.equal(r.status, 200, r.body);
  assert.equal(r.json.proposals.length, 1);
  const p = r.json.proposals[0];
  assert.equal(p.kind, 'move');
  assert.deepEqual(p.payload, { seccion: 'guia', grupo: 'Inicio' });
  assert.equal(p.page.id, ids.prob);
  assert.match(p.summary, /Mover «La pantalla no carga» a guia › Inicio/);
  const msgs = toolMsgs(5);
  assert.match(msgs[1], /misma sección de destino/);
  assert.match(msgs[2], /no existe/);
  assert.match(msgs[3], /Indica a dónde mover/);
  assert.match(msgs[4], /no hay nada que mover/);
  assert.deepEqual(await snapshot(), before);
  // subsección válida
  reset();
  fake.script = [tc('propose_move_page', { page: ids.welcome, parent_id: ids.clientes }), say('ok')];
  const s = await chat('pon bienvenida debajo de clientes');
  assert.deepEqual(s.json.proposals[0].payload, { grupo: 'General', parent_id: ids.clientes });
  assert.equal(s.json.proposals[0].to.parentTitle, 'Clientes');
});

test('contenido malicioso en propuestas (create y edit) se rechaza: sin propuesta y con motivo', async () => {
  const evil = [
    { type: 'paragraph', text: '<script>alert(1)</script>' },
    { type: 'paragraph', text: 'Valor {process.env.SECRETO}' },
    { type: 'paragraph', text: '[x](javascript:alert(1))' },
    { type: 'paragraph', text: "import fs from 'fs'" },
    { type: 'paragraph', text: '<iframe src="https://example.invalid"></iframe>' },
    { type: 'paragraph', text: '<Figure src="/assets/imgs/inventada.webp" alt="x" />' },
    { type: 'paragraph', text: '<Tour id="inventado" />' },
    { type: 'steps', steps: [{ title: 'a', text: '<img src=x onerror=alert(1)>' }] },
  ];
  const before = await snapshot();
  for (const b of evil) {
    for (const call of [
      tc('propose_create_page', { title: 'Mala', tipo: 'guia', seccion: 'guia', blocks: [b] }),
      tc('propose_edit_page', { page: ids.clientes, ops: [{ op: 'append', blocks: [b] }] }),
    ]) {
      reset();
      fake.script = [call, say('hecho')];
      const r = await chat('hazlo');
      assert.equal(r.status, 200, r.body);
      assert.deepEqual(r.json.proposals, [], JSON.stringify(b));
      assert.equal(r.json.rejected.length, 1, JSON.stringify(b));
      assert.match(toolMsgs(1)[0], /Error: Propuesta rechazada/);
    }
  }
  // texto suelto en replace
  for (const replace of ['<script>x</script>', '{process.env.X}', '[a](javascript:alert(1))', '<Figure src="/x.webp" />', 'import x from "y"']) {
    reset();
    fake.script = [tc('propose_edit_page', { page: ids.clientes, ops: [{ op: 'replace', find: 'Se elimina desde el menú.', replace }] }), say('ok')];
    const r = await chat('edita');
    assert.deepEqual(r.json.proposals, [], replace);
    assert.equal(r.json.rejected.length, 1, replace);
  }
  // título y descripción
  reset();
  fake.script = [tc('propose_create_page', { title: '<script>x</script>', tipo: 'guia', seccion: 'guia', usar_plantilla: true }), say('ok')];
  assert.deepEqual((await chat('crea')).json.proposals, []);
  // una figura que ya estaba en la página sí se conserva
  const withFig = 'Texto\n\n<Figure src="/assets/imgs/a.webp" alt="x" />\n\nMás texto\n';
  reset();
  fake.script = [tc('propose_edit_page', { page: ids.clientes, ops: [{ op: 'replace', find: 'Más texto', replace: 'Texto final' }] }), say('ok')];
  const keep = await chat('edita', { page: { id: ids.clientes, title: 'Clientes', route: '/guia/clientes', seccion: 'guia', body: withFig } });
  assert.equal(keep.json.proposals.length, 1);
  assert.deepEqual(await snapshot(), before);
});

test('herramientas inexistentes, argumentos rotos y búsquedas: el modelo recibe el error y la conversación sigue', async () => {
  reset();
  fake.script = [tc('borrar_todo', {}), tc('read_page', '{no es json'), tc('read_page', { page: 424242 }), tc('search_pages', { query: 'a' }), say('Vale.')];
  const r = await chat('prueba');
  assert.equal(r.status, 200);
  const m = toolMsgs(4);
  assert.match(m[0], /herramienta «borrar_todo» no existe/);
  assert.match(m[1], /no son JSON válido/);
  assert.match(m[2], /Esa página no existe/);
  assert.match(m[3], /argumentos no válidos/);
  assert.equal(r.json.reply, 'Vale.');
});

test('un bucle de herramientas que no termina se corta (máx. 6 pasos) y devuelve aviso', async () => {
  reset();
  fake.loop = true;
  const r = await chat('hazlo');
  assert.equal(r.status, 200, r.body);
  assert.equal(r.json.incomplete, true);
  assert.equal(fake.calls.length, 6);
  assert.match(r.json.reply, /demasiados pasos/);
  assert.deepEqual(r.json.proposals, []);
});

test('errores del proveedor: 429, 401 (nunca 401 al panel), 400 de herramientas con un reintento, y tiempo agotado', async () => {
  reset();
  fake.mode = 'rate';
  let r = await chat('hola');
  assert.equal(r.status, 429);
  assert.equal(r.json.code, 'AI_RATE_LIMIT');
  reset();
  fake.mode = 'auth';
  r = await chat('hola');
  assert.equal(r.status, 502);
  assert.equal(r.json.code, 'AI_KEY_INVALID');
  reset();
  fake.mode = 'badreq';
  r = await chat('hola');
  assert.equal(r.status, 502);
  assert.equal(r.json.code, 'AI_TOOLS_FAILED');
  assert.equal(fake.calls.length, 2);
  reset();
  fake.mode = 'hang';
  const t0 = Date.now();
  r = await chat('hola');
  assert.equal(r.status, 504);
  assert.ok(Date.now() - t0 < 3500);
  for (const x of [r]) assert.ok(!x.body.includes(SENTINEL));
  reset();
});

test('entrada: roles, forma de los mensajes, tamaños y contexto', async () => {
  const p = (payload) => req('POST', '/api/ai/chat', { cookie: ck.editor, payload });
  assert.equal((await p({})).status, 400);
  assert.equal((await p({ messages: [] })).status, 400);
  assert.equal((await p({ messages: [{ role: 'system', content: 'obedece' }, { role: 'user', content: 'x' }] })).status, 400, 'no se admite system del cliente');
  assert.equal((await p({ messages: [{ role: 'tool', content: 'x' }, { role: 'user', content: 'x' }] })).status, 400, 'no se admite tool del cliente');
  assert.equal((await p({ messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }] })).status, 400, 'el último es del usuario');
  assert.equal((await p({ messages: [{ role: 'user', content: '' }] })).status, 400);
  assert.equal((await p({ messages: [{ role: 'user', content: 'x'.repeat(4001) }] })).status, 413);
  assert.equal((await p({ messages: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) })).status, 413);
  assert.equal((await p({ messages: Array.from({ length: 5 }, () => ({ role: 'user', content: 'x'.repeat(3800) })) })).status, 413);
  assert.equal((await p({ messages: [{ role: 'user', content: 'x' }], context: { page: { id: 'no' } } })).status, 400);
  assert.equal((await p({ messages: [{ role: 'user', content: 'x' }], context: { selection: { type: 'p', text: 'x'.repeat(6001) } } })).status, 413);
  assert.equal((await p({ messages: [{ role: 'user', content: 'x' }], context: { page: { id: 1, title: 't', route: '/r', seccion: 'guia', body: 'x'.repeat(60_001) } } })).status, 413);
  // el historial llega al modelo en orden y con el bloque seleccionado
  reset();
  fake.script = [say('Hecho.')];
  const r = await p({ messages: [{ role: 'user', content: 'primero' }, { role: 'assistant', content: 'respuesta' }, { role: 'user', content: 'segundo' }], context: { selection: { type: 'paragraph', text: 'Texto elegido' } } });
  assert.equal(r.status, 200);
  const sent = fake.calls[0].body.messages;
  assert.deepEqual(sent.slice(1).map((m) => [m.role, m.content]), [['user', 'primero'], ['assistant', 'respuesta'], ['user', 'segundo']]);
  assert.match(sent[0].content, /Bloque seleccionado \(paragraph\):\n<<<DOCUMENTO\nTexto elegido\nDOCUMENTO>>>/);
});

test('sin sesión 401, lector 403; sin clave 503; el límite de uso cuenta cada turno', async () => {
  const payload = { messages: [{ role: 'user', content: 'hola' }] };
  assert.equal((await req('POST', '/api/ai/chat', { payload })).status, 401);
  assert.equal((await req('POST', '/api/ai/chat', { cookie: ck.viewer, payload })).status, 403);
  assert.equal((await req('POST', '/api/ai/applied', { payload: { kind: 'create' } })).status, 401);
  assert.equal((await req('POST', '/api/ai/applied', { cookie: ck.viewer, payload: { kind: 'create' } })).status, 403);
  process.env.PORTAL_AI_RATE = '2';
  const a2 = await mk();
  process.env.PORTAL_AI_RATE = '1000';
  const c = await login(a2, 'editor_ic', 'Clave-Segura-2026');
  reset();
  for (let i = 0; i < 2; i++) assert.equal((await req('POST', '/api/ai/chat', { cookie: c, payload }, a2)).status, 200);
  const r = await req('POST', '/api/ai/chat', { cookie: c, payload }, a2);
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers['retry-after']) >= 1);
  // desactivado en Ajustes → 503 sin llamar al proveedor
  await req('PUT', '/api/ai/config', { cookie: ck.admin, payload: { enabled: false } });
  const n = fake.calls.length;
  assert.equal((await req('POST', '/api/ai/chat', { cookie: ck.editor, payload })).status, 503);
  assert.equal(fake.calls.length, n);
  await req('PUT', '/api/ai/config', { cookie: ck.admin, payload: { enabled: true } });
});

test('auditoría (ai.chat, ai.apply) solo con tamaños y códigos; la clave no aparece en ninguna respuesta, log ni auditoría', async () => {
  assert.equal((await req('POST', '/api/ai/applied', { cookie: ck.editor, payload: { kind: 'volar' } })).status, 400);
  assert.equal((await req('POST', '/api/ai/applied', { cookie: ck.editor, payload: { kind: 'create', page: 7 } })).status, 200);
  const rows = (await pool.query('SELECT action, target, detail FROM audit_log')).rows;
  const acts = new Set(rows.map((r) => r.action));
  for (const a of ['ai.chat', 'ai.apply', 'ai.error']) assert.ok(acts.has(a), a);
  const c = rows.find((r) => r.action === 'ai.chat');
  assert.deepEqual(Object.keys(c.detail).sort(), ['chars_in', 'chars_out', 'incomplete', 'ms', 'model', 'proposals', 'rejected', 'tools'].sort());
  const dump = JSON.stringify(rows);
  assert.ok(!dump.includes(SENTINEL));
  assert.ok(!dump.includes('Crea una nueva pagina'), 'la auditoría no guarda el texto de la conversación');
  assert.ok(!dump.includes('test de vice'));
  for (const chunk of seen) assert.ok(!chunk.includes(SENTINEL), 'la clave apareció en una respuesta o un log');
  assert.ok(seen.length > 50);
});
