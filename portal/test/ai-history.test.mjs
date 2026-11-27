// Asistente de IA, fase 3: streaming SSE, preguntas con respuestas rápidas (ask_choice), menciones y HISTORIAL guardado
// (aislamiento entre usuarios, retención, borrado, regenerar, secreto de la clave). Groq falso (test/helpers/ai-harness.mjs).
// Uso: node --test --test-concurrency=1 test/ai-history.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setupAi, tc, say, SENTINEL } from './helpers/ai-harness.mjs';
import { PORTAL_ROOT } from '../server/env.mjs';

let h;
let ids = {};
const msg = (text) => ({ messages: [{ role: 'user', content: text }] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toolMsgs = (i) => h.fake.calls[i].body.messages.filter((m) => m.role === 'tool').map((m) => m.content);

before(async () => {
  h = await setupAi('ai-history-test');
  const a = await h.mkPage('guia', 'introduccion', 'Introducción', { grupo: 'Inicio' });
  const b = await h.mkPage('guia', 'acceso', 'Acceso y navegación', { grupo: 'Inicio' });
  ids = { a: a.id, b: b.id };
  await h.req('PUT', `/api/pages/${a.id}`, { cookie: h.ck.editor, payload: { version: a.version, body: 'Hola mundo\n\nSegundo párrafo con texto.\n' } });
});
after(async () => { await h?.cleanup(); });

test('streaming SSE: meta → activity → proposal (ya validada) → delta → done; sin compresión y con las cabeceras del panel', async () => {
  h.reset();
  h.fake.script = [tc('list_outline', {}), tc('propose_create_page', { title: 'Nueva', tipo: 'guia', seccion: 'guia', grupo: 'Inicio', usar_plantilla: true }), say('Propongo crear la página «Nueva» en Inicio.')];
  const r = await h.stream(msg('crea una página nueva en inicio'));
  assert.equal(r.status, 200, r.body);
  assert.match(r.headers['content-type'], /text\/event-stream/);
  assert.equal(r.headers['content-encoding'], undefined);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  const kinds = r.events.map((e) => e.event);
  assert.equal(kinds[0], 'meta');
  assert.equal(kinds[kinds.length - 1], 'done');
  assert.ok(kinds.indexOf('proposal') > kinds.indexOf('activity'));
  const act = r.events.filter((e) => e.event === 'activity').map((e) => `${e.data.tool}:${e.data.state}`);
  assert.deepEqual(act, ['list_outline:start', 'list_outline:done', 'propose_create_page:start', 'propose_create_page:done']);
  assert.match(r.events.find((e) => e.event === 'activity').data.label, /Consultando las secciones/);
  const deltas = r.events.filter((e) => e.event === 'delta').map((e) => e.data.text).join('');
  assert.equal(deltas, 'Propongo crear la página «Nueva» en Inicio.');
  assert.ok(r.events.filter((e) => e.event === 'delta').length > 1, 'el texto llega en trozos');
  const done = r.events.at(-1).data;
  assert.equal(done.reply, deltas);
  assert.equal(done.proposals.length, 1);
  assert.deepEqual(r.events.find((e) => e.event === 'proposal').data.proposal, done.proposals[0]);
  assert.ok(done.conversation_id > 0 && done.message_id > 0);
  assert.ok(!r.body.includes(SENTINEL));
  assert.equal(h.fake.calls[0].body.stream, true);
});

test('streaming: una propuesta maliciosa NO se envía (se valida en el servidor antes) y se informa en done.rejected', async () => {
  h.reset();
  h.fake.script = [tc('propose_create_page', { title: 'Mala', tipo: 'guia', seccion: 'guia', blocks: [{ type: 'paragraph', text: '<script>alert(1)</script>' }] }), say('hecho')];
  const r = await h.stream(msg('crea'));
  assert.equal(r.events.filter((e) => e.event === 'proposal').length, 0);
  assert.equal(r.events.at(-1).data.rejected.length, 1);
  assert.deepEqual(r.events.at(-1).data.proposals, []);
  assert.ok(!r.body.includes('alert(1)'), 'el contenido peligroso no sale por el stream');
});

test('errores: antes de empezar a transmitir son JSON normales (400/401/403/503); durante el stream, un evento error', async () => {
  const bad = await h.stream({ messages: [{ role: 'system', content: 'x' }] });
  assert.equal(bad.status, 400);
  assert.equal((await h.stream(msg('hola'), h.ck.viewer)).status, 403);
  assert.equal((await h.stream(msg('hola'), 'portal_session=' + 'a'.repeat(64))).status, 401);
  h.reset();
  h.fake.mode = 'rate';
  const rate = await h.stream(msg('hola'));
  assert.equal(rate.status, 200);
  const err = rate.events.find((e) => e.event === 'error').data;
  assert.equal(err.status, 429);
  assert.equal(err.code, 'AI_RATE_LIMIT');
  assert.ok(!rate.body.includes(SENTINEL));
  h.reset();
  h.fake.mode = 'auth';
  const auth = (await h.stream(msg('hola'))).events.find((e) => e.event === 'error').data;
  assert.equal(auth.status, 502);
  assert.equal(auth.code, 'AI_KEY_INVALID');
  h.reset();
  // límite de uso: se comprueba antes de transmitir (JSON 429)
  process.env.PORTAL_AI_RATE = '1';
  const a2 = await h.mk();
  process.env.PORTAL_AI_RATE = '1000';
  const c = await h.login(a2, 'editor_h', 'Clave-Segura-2026');
  assert.equal((await h.stream(msg('uno'), c, a2)).status, 200);
  const lim = await h.stream(msg('dos'), c, a2);
  assert.equal(lim.status, 429);
  assert.ok(Number(lim.headers['retry-after']) >= 1);
});

test('cancelar corta el stream en el servidor: se aborta la llamada al proveedor y no se guarda nada', async () => {
  h.reset();
  h.fake.mode = 'slowstream';
  const a = await h.mk();
  await a.listen({ port: 0, host: '127.0.0.1' });
  const port = a.server.address().port;
  const cookie = await h.login(a, 'editor_h', 'Clave-Segura-2026');
  const before = (await h.pool.query("SELECT count(*)::int AS n FROM audit_log WHERE action = 'ai.chat'")).rows[0].n;
  const convs = (await h.pool.query('SELECT count(*)::int AS n FROM ai_conversations')).rows[0].n;
  const ctl = new AbortController();
  const res = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ ...msg('cuéntame algo largo'), stream: true }), signal: ctl.signal });
  assert.equal(res.status, 200);
  const reader = res.body.getReader();
  let got = '';
  const dec = new TextDecoder();
  while (!/event: delta/.test(got)) { const c = await reader.read(); if (c.done) break; got += dec.decode(c.value); }
  assert.match(got, /event: delta/, 'ya llegó texto del modelo');
  ctl.abort();
  await reader.cancel().catch(() => {});
  await sleep(1200);
  assert.ok(h.fake.closed >= 1, 'el proveedor vio cerrarse la conexión');
  assert.equal((await h.pool.query("SELECT count(*)::int AS n FROM audit_log WHERE action = 'ai.chat'")).rows[0].n, before);
  assert.equal((await h.pool.query('SELECT count(*)::int AS n FROM ai_conversations')).rows[0].n, convs, 'nada guardado');
  h.reset();
});

test('ask_choice: la pregunta llega con respuestas rápidas y el turno termina; las opciones inválidas se rechazan', async () => {
  h.reset();
  h.fake.script = [tc('list_outline', {}), tc('ask_choice', { question: '¿En qué grupo la creo?', options: ['Inicio', 'General', { label: 'Otro', value: 'Otro grupo' }] }), say('no debería llegar')];
  const r = await h.stream(msg('crea una página nueva en la guía'));
  const done = r.events.at(-1).data;
  assert.equal(done.reply, '¿En qué grupo la creo?');
  assert.deepEqual(done.choices, { question: '¿En qué grupo la creo?', options: [{ label: 'Inicio', value: 'Inicio' }, { label: 'General', value: 'General' }, { label: 'Otro', value: 'Otro grupo' }] });
  assert.equal(r.events.filter((e) => e.event === 'choices').length, 1);
  assert.equal(h.fake.calls.length, 2, 'tras ask_choice no se vuelve a llamar al modelo');
  const saved = await h.req('GET', `/api/ai/conversations/${done.conversation_id}`, { cookie: h.ck.editor });
  assert.equal(saved.json.messages[1].choices.options.length, 3);
  // inválidas
  for (const options of [['solo una'], ['<b>x</b>', 'y'], ['a', '{process.env.X}'], Array.from({ length: 9 }, (_, i) => 'o' + i)]) {
    h.reset();
    h.fake.script = [tc('ask_choice', { question: 'p', options }), say('ok')];
    const x = await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: msg('x') });
    assert.equal(x.json.choices, null, JSON.stringify(options));
    assert.match(toolMsgs(1)[0], /^Error:/);
  }
});

test('menciones @: la página sale de la BD (no del cliente) y llega al modelo; máx. 5', async () => {
  h.reset();
  h.fake.script = [say('Vale.')];
  const r = await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: { ...msg('compara con @Introducción'), context: { mentions: [{ id: ids.a, title: 'TÍTULO FALSO', route: '/falso' }, { id: 999999, title: 'x', route: '/x' }] } } });
  assert.equal(r.status, 200);
  const sys = h.fake.calls[0].body.messages[0].content;
  assert.match(sys, /\[\d+\] «Introducción» \/guia\/introduccion/);
  assert.ok(!sys.includes('FALSO') && !sys.includes('/falso'));
  const six = Array.from({ length: 6 }, () => ({ id: ids.a, title: 't', route: '/r' }));
  assert.equal((await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: { ...msg('x'), context: { mentions: six } } })).status, 400);
});

test('historial: se crea con título automático, se lista, se abre y se continúa; las propuestas guardan su estado', async () => {
  h.reset();
  h.fake.script = [tc('propose_edit_page', { page: ids.a, ops: [{ op: 'replace', find: 'Segundo párrafo', replace: '2.º párrafo' }] }), say('Propongo un cambio.')];
  const first = await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: msg('Mejora la redacción del segundo párrafo de la página de introducción por favor, y también el tono') });
  const convId = first.json.conversation_id;
  assert.ok(convId);
  const list = (await h.req('GET', '/api/ai/conversations', { cookie: h.ck.editor })).json;
  const c = list.items.find((x) => x.id === convId);
  assert.match(c.title, /^Mejora la redacción del segundo párrafo de la página de…$/);
  assert.equal(c.messages, 2);
  assert.ok(list.total >= 1);
  const open = (await h.req('GET', `/api/ai/conversations/${convId}`, { cookie: h.ck.editor })).json;
  assert.deepEqual(open.messages.map((m) => m.role), ['user', 'assistant']);
  const p = open.messages[1].proposals[0];
  assert.equal(p.kind, 'edit');
  assert.equal(p.state, 'pending');
  assert.equal(p.after, undefined, 'no se guarda el cuerpo completo de la página');
  assert.equal(p.expired, true);
  // estado aplicada
  const st = await h.req('PUT', `/api/ai/messages/${open.messages[1].id}/proposal-state`, { cookie: h.ck.editor, payload: { index: 0, state: 'applied' } });
  assert.equal(st.status, 200);
  assert.equal((await h.req('PUT', `/api/ai/messages/${open.messages[1].id}/proposal-state`, { cookie: h.ck.editor, payload: { index: 5, state: 'applied' } })).status, 404);
  assert.equal((await h.req('PUT', `/api/ai/messages/${open.messages[1].id}/proposal-state`, { cookie: h.ck.editor, payload: { index: 0, state: 'borrada' } })).status, 400);
  // continuar la conversación
  h.reset();
  h.fake.script = [say('Hecho.')];
  const next = await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: { ...msg('gracias'), conversation_id: convId } });
  assert.equal(next.json.conversation_id, convId);
  const again = (await h.req('GET', `/api/ai/conversations/${convId}`, { cookie: h.ck.editor })).json;
  assert.deepEqual(again.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.equal(again.messages[1].proposals[0].state, 'applied');
  assert.equal(again.conversation.title, c.title, 'el título no cambia');
  // regenerar: reemplaza la última respuesta sin duplicar el mensaje de la persona
  h.reset();
  h.fake.script = [say('Otra respuesta.')];
  await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: { ...msg('gracias'), conversation_id: convId, regenerate: true } });
  const reg = (await h.req('GET', `/api/ai/conversations/${convId}`, { cookie: h.ck.editor })).json;
  assert.deepEqual(reg.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.equal(reg.messages[3].content, 'Otra respuesta.');
  // renombrar
  assert.equal((await h.req('PUT', `/api/ai/conversations/${convId}`, { cookie: h.ck.editor, payload: { title: 'Mi tema' } })).status, 200);
  assert.equal((await h.req('PUT', `/api/ai/conversations/${convId}`, { cookie: h.ck.editor, payload: { title: '  ' } })).status, 400);
  assert.equal((await h.req('GET', '/api/ai/conversations?q=tema', { cookie: h.ck.editor })).json.items.length, 1);
  assert.equal((await h.req('GET', '/api/ai/conversations?q=otra respuesta', { cookie: h.ck.editor })).json.items.length, 1, 'busca también en el texto');
  assert.equal((await h.req('GET', '/api/ai/conversations?q=zzzz', { cookie: h.ck.editor })).json.total, 0);
  // nueva vacía
  const nue = await h.req('POST', '/api/ai/conversations', { cookie: h.ck.editor, payload: { title: 'Vacía', page_id: ids.a } });
  assert.equal(nue.status, 201);
});

test('aislamiento: cada persona ve SOLO sus conversaciones (también el administrador); no se puede leer, escribir ni borrar la de otra', async () => {
  h.reset();
  h.fake.script = [say('Hola, soy privado.')];
  const mine = (await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: msg('mi conversación secreta') })).json.conversation_id;
  const n = h.fake.calls.length;
  for (const who of ['editor2', 'admin']) {
    const ck = h.ck[who];
    assert.ok(!(await h.req('GET', '/api/ai/conversations', { cookie: ck })).body.includes('secreta'), `${who} no la ve en la lista`);
    assert.equal((await h.req('GET', `/api/ai/conversations/${mine}`, { cookie: ck })).status, 404, who);
    assert.equal((await h.req('PUT', `/api/ai/conversations/${mine}`, { cookie: ck, payload: { title: 'x' } })).status, 404, who);
    assert.equal((await h.req('DELETE', `/api/ai/conversations/${mine}`, { cookie: ck })).status, 404, who);
    const msgId = (await h.pool.query('SELECT id FROM ai_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT 1', [mine])).rows[0].id;
    assert.equal((await h.req('PUT', `/api/ai/messages/${msgId}/proposal-state`, { cookie: ck, payload: { index: 0, state: 'applied' } })).status, 404, who);
    assert.equal((await h.req('POST', '/api/ai/chat', { cookie: ck, payload: { ...msg('hola'), conversation_id: mine } })).status, 404, `${who}: no puede continuar la de otra persona`);
  }
  assert.equal(h.fake.calls.length, n, 'ni siquiera se llamó al proveedor');
  assert.equal((await h.req('GET', '/api/ai/conversations', { cookie: h.ck.viewer })).status, 403);
  // «Borrar historial» solo borra el mío
  await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor2, payload: msg('conversación de la otra persona') });
  const del = await h.req('DELETE', '/api/ai/conversations', { cookie: h.ck.editor });
  assert.equal(del.status, 200);
  assert.ok(del.json.deleted >= 1);
  assert.equal((await h.req('GET', '/api/ai/conversations', { cookie: h.ck.editor })).json.total, 0);
  assert.equal((await h.req('GET', '/api/ai/conversations', { cookie: h.ck.editor2 })).json.total, 1, 'la de editor2 sigue');
  assert.equal((await h.pool.query('SELECT count(*)::int AS n FROM ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id JOIN users u ON u.id = c.user_id WHERE u.username = $1', ['editor_h'])).rows[0].n, 0, 'mensajes borrados en cascada');
  // borrar una
  const other = (await h.req('GET', '/api/ai/conversations', { cookie: h.ck.editor2 })).json.items[0].id;
  assert.equal((await h.req('DELETE', `/api/ai/conversations/${other}`, { cookie: h.ck.editor2 })).status, 200);
  assert.equal((await h.req('GET', `/api/ai/conversations/${other}`, { cookie: h.ck.editor2 })).status, 404);
});

test('retención: PORTAL_AI_HISTORY_DAYS poda al arrancar (def. 90; 0 = nunca)', async () => {
  h.reset();
  h.fake.script = [say('a'), say('b')];
  const old = (await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: msg('conversación antigua') })).json.conversation_id;
  const recent = (await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: msg('conversación reciente') })).json.conversation_id;
  await h.pool.query("UPDATE ai_conversations SET updated_at = now() - interval '60 days' WHERE id = $1", [old]);
  await h.pool.query("UPDATE ai_conversations SET updated_at = now() - interval '120 days' WHERE id = $1", [recent]);
  process.env.PORTAL_AI_HISTORY_DAYS = '0'; // sin caducidad
  await h.mk();
  await sleep(300);
  assert.equal((await h.pool.query('SELECT count(*)::int AS n FROM ai_conversations WHERE id = ANY($1)', [[old, recent]])).rows[0].n, 2);
  process.env.PORTAL_AI_HISTORY_DAYS = '90'; // def.: borra la de 120 días, conserva la de 60
  await h.mk();
  await sleep(300);
  assert.deepEqual((await h.pool.query('SELECT id::int AS id FROM ai_conversations WHERE id = ANY($1)', [[old, recent]])).rows.map((r) => r.id), [old]);
  process.env.PORTAL_AI_HISTORY_DAYS = '30';
  await h.mk();
  await sleep(300);
  assert.equal((await h.pool.query('SELECT count(*)::int AS n FROM ai_conversations WHERE id = $1', [old])).rows[0].n, 0);
  process.env.PORTAL_AI_HISTORY_DAYS = '';
});

test('privacidad: nada de claves en el historial; el chat no va al paquete .ispmax, a la auditoría ni a los respaldos pg_dump', async () => {
  h.reset();
  h.fake.script = [say('respuesta de prueba única')];
  await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: msg('texto de conversación único xyz') });
  const rows = JSON.stringify((await h.pool.query('SELECT * FROM ai_messages')).rows) + JSON.stringify((await h.pool.query('SELECT * FROM ai_conversations')).rows);
  assert.ok(!rows.includes(SENTINEL));
  // auditoría: solo tamaños
  const audit = JSON.stringify((await h.pool.query('SELECT action, target, detail FROM audit_log')).rows);
  assert.ok(!audit.includes('texto de conversación único') && !audit.includes('respuesta de prueba única'));
  assert.ok(audit.includes('ai.history_clear'));
  // paquete de contenido
  const { exportPackage, readPackage } = await import('../server/content/package.mjs');
  const out = path.join(PORTAL_ROOT, 'work-test', 'ai-history-test', 'p.ispmax');
  await exportPackage({ pool: h.pool, outFile: out, includeRevisions: true });
  const pkg = JSON.stringify((await readPackage(out)).data);
  assert.ok(!pkg.includes('texto de conversación único') && !pkg.includes('respuesta de prueba única') && !pkg.includes('ai_messages'));
  // respaldos pg_dump: la estructura se conserva, los datos del chat se excluyen a propósito
  const src = fs.readFileSync(path.join(PORTAL_ROOT, 'server', 'ops', 'backup.mjs'), 'utf8');
  assert.match(src, /--exclude-table-data=ai_messages/);
  assert.match(src, /--exclude-table-data=ai_conversations/);
  for (const chunk of h.seen) assert.ok(!chunk.includes(SENTINEL), 'la clave apareció en una respuesta o un log');
});
