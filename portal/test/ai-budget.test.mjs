// Presupuesto de tokens del asistente (plan gratuito de Groq: ~8.000 tokens/min): 429 del proveedor (reintento corto y mensaje
// con segundos), espera por presupuesto con el usage real, indicador de consumo (GET /api/ai/usage) y tokens por turno.
// Groq falso con usage y cabeceras x-ratelimit-*. Uso: node --test --test-concurrency=1 test/ai-budget.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupAi, tc, say, SENTINEL } from './helpers/ai-harness.mjs';
import { getCorpus } from './helpers/corpus.mjs';
import { loadOutline, outlineCompact } from '../server/ai/proposals.mjs';
import { parseDuration, createBudget } from '../server/ai/budget.mjs';

let h;
const msg = (text, extra = {}) => ({ messages: [{ role: 'user', content: text }], ...extra });
const chat = (text, extra) => h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: msg(text, extra) });
const tok = (x) => Math.ceil(JSON.stringify(x ?? '').length / 3);
let keyN = 0;
/** Otra clave = otra cuenta de consumo (el estado de límites va por huella de clave): aísla las pruebas entre sí. */
const freshKey = async () => assert.equal((await h.req('PUT', '/api/ai/config', { cookie: h.ck.admin, payload: { apiKey: `${SENTINEL}_${++keyN}` } })).status, 200);
const turnTokens = () => h.fake.calls.reduce((n, c) => n + tok(c.body.messages) + tok(c.body.tools), 0);

before(async () => { h = await setupAi('ai-budget-test'); });
after(async () => { await h?.cleanup(); });

test('parseDuration: formatos de Groq («2m59.56s», «7.66s», «120ms», «45»)', () => {
  assert.equal(parseDuration('7.66s'), 7.66);
  assert.ok(Math.abs(parseDuration('2m59.56s') - 179.56) < 1e-9);
  assert.equal(parseDuration('120ms'), 0.12);
  assert.equal(parseDuration('45'), 45);
  assert.equal(parseDuration('1h2m'), 3720);
  assert.equal(parseDuration(''), null);
  assert.equal(parseDuration(null), null);
  assert.equal(parseDuration('abc'), null);
});

test('createBudget: ventana deslizante de 60 s; la espera es lo que tarda en liberarse lo justo', () => {
  let t = 0;
  const b = createBudget({ limit: 1000, now: () => t });
  assert.equal(b.waitFor('k', 900), 0, 'sin consumo no hay espera');
  b.record('k', 600); t = 10_000; b.record('k', 300);
  assert.equal(b.used('k'), 900);
  assert.equal(b.waitFor('k', 50), 0);
  assert.equal(b.waitFor('k', 300), 50, 'hace falta que caduque el primer registro (a los 60 s): quedan 50 s');
  assert.equal(b.waitFor('k', 950), 60 - 0 === 60 ? 60 : 0, 'si hay que liberar todo, hasta el último registro');
  t = 61_000;
  assert.equal(b.used('k'), 300, 'el primer registro ya salió de la ventana');
  assert.equal(b.waitFor('other', 5000), 0, 'cada clave tiene su cuenta');
});

test('429 corto del proveedor (retry-after 1 s): el servidor espera y reintenta UNA vez; el turno tiene éxito', async () => {
  h.reset();
  h.fake.rateOnce = 1;
  h.fake.retryAfter = 1;
  h.fake.script = [say('Hola, ¿en qué te ayudo?')];
  const t0 = Date.now();
  const r = await chat('hola');
  assert.equal(r.status, 200, r.body);
  assert.equal(r.json.reply, 'Hola, ¿en qué te ayudo?');
  assert.equal(h.fake.calls.length, 2, 'una llamada rechazada y un reintento');
  assert.ok(Date.now() - t0 >= 900, 'esperó el retry-after');
  // en streaming se ve el paso «Esperando cupo de la IA…»
  h.reset();
  h.fake.rateOnce = 1;
  h.fake.retryAfter = 1;
  h.fake.script = [say('Listo.')];
  const s = await h.stream(msg('hola'));
  const waits = s.events.filter((e) => e.event === 'activity' && e.data.tool === 'wait');
  assert.deepEqual(waits.map((e) => e.data.state), ['start', 'done']);
  assert.equal(waits[0].data.label, 'Esperando cupo de la IA');
  assert.equal(s.events.at(-1).event, 'done');
});

test('429 largo (retry-after 30 s): mensaje del plan gratuito con los segundos exactos y SIN reintento automático', async () => {
  process.env.PORTAL_AI_TPM = '8000'; // el mensaje cita el límite configurado (def. 8.000)
  h.reset();
  h.fake.mode = 'rate';
  h.fake.retryAfter = 30;
  const r = await chat('hola');
  assert.equal(r.status, 429);
  assert.equal(r.json.code, 'AI_PROVIDER_LIMIT');
  assert.equal(r.json.retryAfter, 30);
  assert.equal(r.json.error, 'La IA está al límite de su plan gratuito (8.000 tokens/min). Puedes reintentar en 30 s.');
  assert.equal(h.fake.calls.length, 1, 'no se reenvía el turno entero');
  assert.ok(!r.body.includes(SENTINEL));
  // distinto del límite propio del portal
  assert.doesNotMatch(r.json.error, /portal|peticiones cada/);
  // sin retry-after: se usa x-ratelimit-reset-tokens
  await freshKey();
  h.reset();
  h.fake.mode = 'rate';
  h.fake.limits = { limit: 8000, remaining: 0, reset: '2m59.56s' };
  const r2 = await chat('hola');
  assert.equal(r2.json.retryAfter, 180);
  assert.match(r2.json.error, /Puedes reintentar en 180 s/);
  // sin ninguna cabecera: mensaje sin segundos
  await freshKey();
  h.reset();
  h.fake.mode = 'rate';
  const r3 = await chat('hola');
  assert.match(r3.json.error, /Espera unos segundos y reintenta/);
  process.env.PORTAL_AI_TPM = '1000000';
  await freshKey();
});

test('presupuesto local: con el usage real acumulado, el siguiente turno no se envía si no cabe (aviso con segundos, sin llamar al proveedor)', async () => {
  process.env.PORTAL_AI_TPM = '1500';
  const a2 = await h.mk();
  process.env.PORTAL_AI_TPM = '1000000';
  const c = await h.login(a2, 'editor_h', 'Clave-Segura-2026');
  h.reset();
  h.fake.usage = () => ({ prompt_tokens: 1300, completion_tokens: 100, total_tokens: 1400 });
  h.fake.script = [say('Primera respuesta.'), say('No debería llegar.')];
  const first = await h.req('POST', '/api/ai/chat', { cookie: c, payload: msg('uno') }, a2);
  assert.equal(first.status, 200, first.body);
  const n = h.fake.calls.length;
  const second = await h.req('POST', '/api/ai/chat', { cookie: c, payload: msg('dos') }, a2);
  assert.equal(second.status, 429);
  assert.equal(second.json.code, 'AI_PROVIDER_LIMIT');
  assert.ok(second.json.retryAfter >= 50 && second.json.retryAfter <= 60, `segundos exactos: ${second.json.retryAfter}`);
  assert.match(second.json.error, /\(1\.500 tokens\/min\)|plan gratuito/);
  assert.equal(h.fake.calls.length, n, 'no se llamó al proveedor');
  // en streaming: evento error con los segundos
  const st = await h.stream(msg('tres'), c, a2);
  const err = st.events?.find((e) => e.event === 'error')?.data ?? st.json;
  assert.equal(err.code ?? st.json?.code, 'AI_PROVIDER_LIMIT');
});

test('espera automática corta: con la lectura del proveedor (quedan 50 tokens, reinicio en 2 s) espera y sigue', async () => {
  h.reset();
  h.fake.limits = { limit: 8000, remaining: 50, reset: '2s' };
  h.fake.script = [say('Uno.'), say('Dos.')];
  assert.equal((await chat('primero')).status, 200);
  const t0 = Date.now();
  const s = await h.stream(msg('segundo'));
  assert.ok(Date.now() - t0 >= 1500, 'esperó el reinicio del cupo');
  const waits = s.events.filter((e) => e.event === 'activity' && e.data.tool === 'wait');
  assert.deepEqual(waits.map((e) => e.data.state), ['start', 'done']);
  assert.equal(s.events.at(-1).data.reply, 'Dos.');
});

test('GET /api/ai/usage: lectura de las cabeceras de Groq sin la clave; roles; «Actualizar» hace una llamada mínima (max_tokens = 1)', async () => {
  assert.equal((await h.req('GET', '/api/ai/usage')).status, 401);
  assert.equal((await h.req('GET', '/api/ai/usage', { cookie: h.ck.viewer })).status, 403);
  assert.equal((await h.req('POST', '/api/ai/usage/refresh', { cookie: h.ck.viewer })).status, 403);
  h.reset();
  h.fake.limits = { limit: 8000, remaining: 5200, reset: '31s', reqLimit: 1000, reqRemaining: 977 };
  h.fake.script = [say('ok')];
  await chat('cuánto llevo');
  const u = (await h.req('GET', '/api/ai/usage', { cookie: h.ck.editor })).json;
  assert.equal(u.available, true);
  assert.equal(u.source, 'proveedor');
  assert.equal(u.tokensLimit, 8000);
  assert.equal(u.tokensRemaining, 5200);
  assert.ok(u.resetInSec > 25 && u.resetInSec <= 31);
  assert.equal(u.requestsLimit, 1000);
  assert.equal(u.requestsRemaining, 977);
  assert.ok(u.updatedAt);
  assert.ok(!JSON.stringify(u).includes('gsk_') && !('apiKey' in u));
  // «Actualizar»: una sola llamada con max_tokens = 1
  h.reset();
  h.fake.limits = { limit: 8000, remaining: 4000, reset: '10s', reqLimit: 1000, reqRemaining: 970 };
  h.fake.script = [say('{"ok":1}')];
  const rf = await h.req('POST', '/api/ai/usage/refresh', { cookie: h.ck.editor });
  assert.equal(rf.status, 200, rf.body);
  assert.equal(h.fake.calls.length, 1);
  assert.equal(h.fake.calls[0].body.max_completion_tokens, 1);
  assert.equal(rf.json.tokensRemaining, 4000);
  assert.equal(rf.json.requestsRemaining, 970);
});

test('el turno informa del consumo: done.usage, tokens en la auditoría (solo cifras) y turno de crear página ≤ 2 llamadas y ≤ 3.000 tokens', async () => {
  const g = await h.mkPage('guia', 'introduccion', 'Introducción', { grupo: 'Inicio' });
  h.reset();
  h.fake.limits = { limit: 8000, remaining: 6000, reset: '20s' };
  h.fake.script = [tc('propose_create_page', { title: 'test de vice', tipo: 'guia', seccion: 'guia', grupo: 'inicio', usar_plantilla: true }), say('no se usa')];
  const s = await h.stream(msg('Crea una nueva pagina, tipo plantilla en la zona de inicio, llama test de vice', { context: { page: { id: g.id, title: g.title, route: g.route, seccion: 'guia' } } }));
  const done = s.events.at(-1).data;
  assert.equal(done.proposals.length, 1);
  assert.equal(done.usage.tokensRemaining, 6000);
  assert.equal(h.fake.calls.length, 1, 'con la estructura en el prompt basta una llamada');
  assert.ok(turnTokens() <= 3000, `tokens del turno: ${turnTokens()}`);
  const a = (await h.pool.query("SELECT detail FROM audit_log WHERE action = 'ai.chat' ORDER BY id DESC LIMIT 1")).rows[0].detail;
  assert.ok(a.prompt_tokens > 200 && a.completion_tokens > 10);
  assert.ok(!JSON.stringify(a).includes('test de vice'));
  // herramientas relevantes: crear no ofrece editar ni mover
  assert.deepEqual(h.fake.calls[0].body.tools.map((t) => t.function.name), ['list_outline', 'search_pages', 'read_page', 'propose_create_page', 'ask_choice']);
  assert.equal(h.fake.calls[0].body.max_completion_tokens, 1800);
  assert.equal(h.fake.calls[0].body.reasoning_effort, 'low');
  // «qué secciones hay» solo con herramientas de lectura
  h.reset();
  h.fake.script = [say('Hay seis.')];
  await chat('¿Qué secciones hay?');
  assert.deepEqual(h.fake.calls[0].body.tools.map((t) => t.function.name), ['list_outline', 'search_pages', 'read_page', 'ask_choice']);
});

test('historial compacto en el servidor: los mensajes viejos van recortados y las propuestas anteriores no viajan', async () => {
  h.reset();
  h.fake.script = [say('ok')];
  const big = 'palabra '.repeat(400);
  const messages = [];
  for (let i = 0; i < 6; i++) messages.push({ role: i % 2 ? 'assistant' : 'user', content: `${i} ${big}`.slice(0, 2000) });
  messages.push({ role: 'user', content: 'pregunta final' });
  const r = await h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: { messages } });
  assert.equal(r.status, 200, r.body);
  const sent = h.fake.calls[0].body.messages.slice(1);
  assert.ok(sent.length <= 8);
  assert.ok(sent.slice(0, -1).every((m) => m.content.length <= 501));
  assert.equal(sent.at(-1).content, 'pregunta final');
  assert.ok(sent.reduce((n, m) => n + m.content.length, 0) <= 4000);
});

test('corpus real (si lo hay): la estructura compacta cuesta ≈ 5 veces menos y un turno de crear página cabe en ~3.000 tokens', async (t) => {
  const corpus = getCorpus();
  if (!corpus.available) return t.skip(corpus.skipReason);
  const { importFromRepo } = await import('../server/sync/index.mjs');
  await importFromRepo({ pool: h.pool, repoRoot: corpus.root, overwrite: 'all', log: () => {} });
  const ctx = h.app.portal.ctx;
  const secs = await loadOutline(ctx);
  const compact = outlineCompact(secs, 3000);
  // formato anterior (títulos de hasta 12 páginas por grupo en el prompt)
  const old = secs.map((s) => `- seccion "${s.key}" (${s.label})${s.modulos.length ? `; módulos: ${s.modulos.slice(0, 40).join(', ')}` : ''}\n` + s.grupos.slice(0, 30).map((g) => `    grupo "${g.name || '(sin grupo)'}": ${g.pages.slice(0, 12).map((p) => `[${p.id}] ${p.title.slice(0, 60)}`).join(' · ')}`).join('\n')).join('\n');
  const tCompact = Math.ceil(compact.length / 3);
  const tOld = Math.ceil(old.length / 3);
  console.log(`# estructura del corpus real: antes ${tOld} tokens, ahora ${tCompact}`);
  assert.ok(tCompact <= 900, `compacta: ${tCompact} tokens`);
  assert.ok(tOld >= tCompact * 3, `antes ${tOld} vs ahora ${tCompact}`);
  assert.match(compact, /- guia \(Guía\): .*«Inicio» \(\d+\)/);
  // crear una página en «inicio» con la estructura real
  const guia = (await ctx.loadStructure()).secciones.find((s) => s.key === 'guia');
  const inicio = guia.grupos.find((g) => /inicio/i.test(g.name));
  h.reset();
  h.fake.script = [tc('propose_create_page', { title: 'test de vice', tipo: 'guia', seccion: 'guia', grupo: 'INICIO', usar_plantilla: true })];
  const c1 = await chat('Crea una nueva pagina, tipo plantilla en la zona de inicio, llama test de vice');
  assert.equal(c1.json.proposals[0].grupo, inicio.name);
  console.log(`# crear página (corpus real): ${h.fake.calls.length} llamada(s), ${turnTokens()} tokens`);
  assert.ok(h.fake.calls.length <= 2 && turnTokens() <= 3000, `crear: ${turnTokens()}`);
  // editar la página abierta (cuerpo real)
  const pg = (await h.pool.query("SELECT id, title, route, seccion, body FROM pages WHERE route LIKE '/guia/%' AND length(body) > 3000 ORDER BY id LIMIT 1")).rows[0];
  const line = pg.body.split('\n').find((l) => l.length > 60 && /^[A-ZÁÉÍÓÚ][^#<*|>`:{}-]+$/.test(l));
  const find = line.slice(0, 45);
  h.reset();
  h.fake.script = [tc('read_page', { page: pg.id }), tc('propose_edit_page', { page: pg.id, ops: [{ op: 'replace', find, replace: find.toUpperCase() }] })];
  const e1 = await chat('Mejora esta página: revisa la redacción', { context: { page: { id: pg.id, title: pg.title, route: pg.route, seccion: pg.seccion, body: pg.body } } });
  assert.equal(e1.json.proposals.length, 1, e1.body);
  console.log(`# editar página abierta (corpus real, ${pg.body.length} caracteres): ${h.fake.calls.length} llamadas, ${turnTokens()} tokens`);
  assert.ok(h.fake.calls.length <= 2 && turnTokens() <= 4000, `editar: ${turnTokens()}`);
  // «¿qué secciones hay?»
  h.reset();
  h.fake.script = [say('Seis secciones.')];
  await chat('¿Qué secciones y grupos tiene el manual y qué hay en cada una?');
  console.log(`# ¿qué secciones hay? (corpus real): ${h.fake.calls.length} llamada, ${turnTokens()} tokens`);
  assert.ok(h.fake.calls.length === 1 && turnTokens() <= 2500, `secciones: ${turnTokens()}`);
});
