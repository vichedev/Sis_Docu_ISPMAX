// Grupos del menú: identidad normalizada (caso «INICIO» frente a «🚀 INICIO») y la IA nunca crea grupos duplicados.
// (La persistencia de grupos vacíos la prueba el agente de GRUPOS.) Groq falso scripteado (test/helpers/ai-harness.mjs).
// Uso: node --test --test-concurrency=1 test/ai-groups.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupAi, tc, say } from './helpers/ai-harness.mjs';
import { normName, resolveGroup } from '../server/routes/groups.mjs';

let h;
const EMOJI = '🚀 INICIO';
const names = (st, key) => st.secciones.find((s) => s.key === key).grupos.map((g) => g.name);
const structure = async () => (await h.req('GET', '/api/structure', { cookie: h.ck.editor })).json;
const toolMsgs = (i) => h.fake.calls[i].body.messages.filter((m) => m.role === 'tool').map((m) => m.content);
const chat = (t) => h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: { messages: [{ role: 'user', content: t }] } });
let ids = {};

before(async () => {
  h = await setupAi('ai-groups-test');
  const intro = await h.mkPage('guia', 'introduccion', 'Introducción');
  const acceso = await h.mkPage('guia', 'acceso', 'Acceso y navegación');
  const pagos = await h.mkPage('guia', 'pagos', 'Pagos');
  const sidebar = [
    { sectionHeader: EMOJI, items: [{ text: 'Introducción', link: '/guia/introduccion' }, { text: 'Acceso y navegación', link: '/guia/acceso' }] },
    { sectionHeader: '💰 FINANZAS', items: [{ text: 'Pagos', link: '/guia/pagos' }] },
  ];
  await h.pool.query("INSERT INTO site_files (path, content) VALUES ('docs/sidebar.json', $1) ON CONFLICT (path) DO UPDATE SET content = EXCLUDED.content", [JSON.stringify(sidebar)]);
  ids = { intro: intro.id, acceso: acceso.id, pagos: pagos.id };
});
after(async () => { await h?.cleanup(); });

test('normName: minúsculas, sin acentos, sin emoji ni signos, espacios colapsados', () => {
  for (const v of ['inicio', 'INICIO', 'Inicio ', '  inicio', 'início', 'ÍNICIO', '🚀 INICIO', '🚀  Inicio!!']) assert.equal(normName(v), 'inicio', v);
  assert.equal(normName('Acceso  y   navegación'), 'acceso y navegacion');
  assert.equal(normName('🚀'), '');
  const sec = { grupos: [{ name: EMOJI }, { name: 'General' }] };
  assert.equal(resolveGroup(sec, 'inicio'), EMOJI);
  assert.equal(resolveGroup(sec, 'Otro'), null);
  assert.equal(resolveGroup(sec, ''), null);
});

test('REGRESIÓN del usuario: «tipo plantilla en la zona de inicio, llamada test de vice» usa el grupo EXISTENTE de la Guía', async () => {
  h.reset();
  h.fake.script = [tc('list_outline', {}), tc('propose_create_page', { title: 'test de vice', tipo: 'guia', seccion: 'guia', grupo: 'INICIO', usar_plantilla: true }), say('Propongo crear «test de vice» en el grupo Inicio de la Guía.')];
  const before = (await h.pool.query('SELECT count(*)::int AS n FROM pages')).rows[0].n;
  const r = await chat('Crea una nueva pagina, tipo plantilla en la zona de inicio, llama test de vice');
  assert.equal(r.status, 200, r.body);
  const p = r.json.proposals[0];
  assert.equal(p.grupo, EMOJI, 'nombre canónico, no «INICIO»');
  assert.equal(p.newGroup, false);
  assert.equal(p.usesTemplate, true);
  assert.equal(p.route, '/guia/test-de-vice');
  assert.match(toolMsgs(1)[0], /nombre EXACTO/);
  assert.match(toolMsgs(1)[0], /grupo "🚀 INICIO": \[\d+\] Introducción · \[\d+\] Acceso y navegación/);
  assert.equal((await h.pool.query('SELECT count(*)::int AS n FROM pages')).rows[0].n, before, 'proponer no crea nada');
  // el modelo ve los nombres reales en la definición de la herramienta
  const def = h.fake.calls[0].body.tools.find((t) => t.function.name === 'propose_create_page').function;
  assert.match(def.description, /guia: «🚀 INICIO», «💰 FINANZAS»/);
  assert.match(def.parameters.properties.grupo.description, /EXACTO/);
  // «Crear borrador»: lo que hace el panel (con el nombre que sea, incluso el escrito a mano)
  const c = await h.req('POST', '/api/pages', { cookie: h.ck.editor, payload: { seccion: 'guia', slug: p.slug, title: p.title, tipo: 'guia', grupo: 'INICIO' } });
  assert.equal(c.status, 201, c.body);
  assert.equal(c.json.grupo, EMOJI, 'el servidor revalida al crear: «INICIO» se resuelve al grupo existente');
  assert.equal(c.json.status, 'draft');
  const st = await structure();
  const gs = names(st, 'guia');
  assert.equal(gs.filter((n) => normName(n) === 'inicio').length, 1, `sin grupo duplicado: ${gs.join(' | ')}`);
  const inicio = st.secciones.find((s) => s.key === 'guia').grupos.find((g) => g.name === EMOJI);
  assert.ok(inicio.pages.some((x) => x.title === 'test de vice'), 'la página nueva cuelga del grupo existente');
});

test('«inicio», «INICIO», «Inicio », «início» y «🚀 inicio» resuelven al mismo grupo; no se crea duplicado', async () => {
  for (const v of ['inicio', 'INICIO', 'Inicio ', 'início', '🚀 inicio', '  ÍNICIO ']) {
    h.reset();
    h.fake.script = [tc('propose_create_page', { title: 'Página ' + v.trim(), tipo: 'guia', seccion: 'guia', grupo: v, usar_plantilla: true }), say('ok')];
    const r = await chat('crea');
    assert.equal(r.json.proposals.length, 1, v);
    assert.equal(r.json.proposals[0].grupo, EMOJI, v);
    assert.equal(r.json.proposals[0].newGroup, false, v);
    const c = await h.req('POST', '/api/pages', { cookie: h.ck.editor, payload: { seccion: 'guia', slug: 'v' + normName(v).length + Math.random().toString(36).slice(2, 5), title: 'x', tipo: 'guia', grupo: v } });
    assert.equal(c.json.grupo, EMOJI, v);
  }
  assert.equal(names(await structure(), 'guia').filter((n) => normName(n) === 'inicio').length, 1);
});

test('grupo nuevo: solo con new_group=true; si el nombre normalizado ya existe se rechaza; sin él se pide uno existente', async () => {
  // new_group con un nombre que ya existe (aunque escrito distinto) → rechazado
  h.reset();
  h.fake.script = [tc('propose_create_page', { title: 'A', tipo: 'guia', seccion: 'guia', grupo: 'inicio', new_group: true, usar_plantilla: true }), say('no pude')];
  let r = await chat('crea');
  assert.deepEqual(r.json.proposals, []);
  assert.match(toolMsgs(1)[0], /Error: El grupo «inicio» ya existe \(se llama «🚀 INICIO»\)/);
  // grupo inexistente sin new_group → error con la lista de grupos existentes
  h.reset();
  h.fake.script = [tc('propose_create_page', { title: 'B', tipo: 'guia', seccion: 'guia', grupo: 'Marketing', usar_plantilla: true }), say('ok')];
  r = await chat('crea');
  assert.deepEqual(r.json.proposals, []);
  assert.match(toolMsgs(1)[0], /No existe el grupo «Marketing».*«🚀 INICIO», «💰 FINANZAS»/);
  // realmente nuevo, con la confirmación explícita → propuesta con newGroup
  h.reset();
  h.fake.script = [tc('propose_create_page', { title: 'C', tipo: 'guia', seccion: 'guia', grupo: 'Marketing', new_group: true, usar_plantilla: true }), say('ok')];
  r = await chat('crea un grupo nuevo Marketing con una página C');
  assert.equal(r.json.proposals.length, 1);
  assert.equal(r.json.proposals[0].grupo, 'Marketing');
  assert.equal(r.json.proposals[0].newGroup, true);
  assert.equal(names(await structure(), 'guia').includes('Marketing'), false, 'proponer no crea el grupo');
  // el panel crea la página: ahora sí existe el grupo y solo uno
  const c = await h.req('POST', '/api/pages', { cookie: h.ck.editor, payload: { seccion: 'guia', slug: 'c-marketing', title: 'C', tipo: 'guia', grupo: 'Marketing' } });
  assert.equal(c.json.grupo, 'Marketing');
  assert.equal(names(await structure(), 'guia').filter((n) => normName(n) === 'marketing').length, 1);
});

test('mover con la IA: el grupo se resuelve igual (existente → canónico; inexistente → error)', async () => {
  h.reset();
  h.fake.script = [tc('propose_move_page', { page: ids.pagos, grupo: 'inicio' }), tc('propose_move_page', { page: ids.pagos, grupo: 'Inventado' }), say('ok')];
  const r = await chat('mueve pagos a inicio');
  assert.equal(r.json.proposals.length, 1);
  assert.equal(r.json.proposals[0].payload.grupo, EMOJI);
  assert.match(toolMsgs(2)[1], /No existe el grupo «Inventado»/);
});
