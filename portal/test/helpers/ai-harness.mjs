// Arnés común de las pruebas del asistente de IA: Groq FALSO local (scripteado, con SSE), servidor en proceso,
// usuarios por rol y captura de respuestas/logs para comprobar que la clave nunca sale.
// Uso: const h = await setupAi('nombre'); ... await h.cleanup();
import { resetTestDb } from './reset-db.mjs';
import { safeRm } from './safe-rm.mjs';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { loadEnv, PORTAL_ROOT } from '../../server/env.mjs';

export const SENTINEL = 'gsk_CENTINELA_HARNESS_3d5f10c9e2a74b68a1d0';
export const tc = (name, args, id = 'c' + Math.random().toString(36).slice(2, 8)) => ({ role: 'assistant', content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) } }] });
export const say = (content) => ({ role: 'assistant', content });

export async function setupAi(name) {
  loadEnv();
  let url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Falta TEST_DATABASE_URL');
  if (url === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
  const pg = (await import('pg')).default;
  const own = process.env.PORTAL_TEST_DB_NAME;
  if (own) {
    if (!/^[a-z0-9_]{3,60}$/.test(own) || own === 'ispmax_manual') throw new Error('PORTAL_TEST_DB_NAME no válido.');
    const u = new URL(url);
    const adm = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: '/postgres' }).toString() });
    await adm.connect();
    if (!(await adm.query('SELECT 1 FROM pg_database WHERE datname = $1', [own])).rowCount) await adm.query(`CREATE DATABASE "${own}" ENCODING 'UTF8'`);
    await adm.end();
    u.pathname = '/' + own;
    url = u.toString();
  }
  process.env.DATABASE_URL = url;
  process.env.PORTAL_ADMIN_USER = 'admin_h';
  process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
  process.env.PORTAL_SITE_AUTO = 'off';
  process.env.PORTAL_RENDER_MODE = 'static';
  process.env.PORTAL_ALLOW_INTERNAL_SETTINGS = '1';
  const RUN = path.join(PORTAL_ROOT, 'work-test', name);
  process.env.PORTAL_WORK_DIR = path.join(RUN, 'work');
  process.env.PORTAL_DATA_DIR = path.join(RUN, 'data');
  // vacías, no borradas: loadEnv() las volvería a leer de portal/.env
  process.env.GROQ_API_KEY = '';
  process.env.GROQ_MODEL = '';
  process.env.PORTAL_AI_RATE = '1000';
  process.env.PORTAL_AI_TPM = '1000000'; // sin esperas por presupuesto salvo en las pruebas que lo piden
  process.env.PORTAL_AI_HISTORY_DAYS = '';
  process.env.GROQ_TIMEOUT_MS = '1500';
  const { buildApp } = await import('../../server/index.mjs');
  const { parseIpAllowList } = await import('../../server/config.mjs');

  // ---- Groq falso: cada llamada consume el siguiente paso de fake.script (mensaje o función(body) → mensaje)
  const fake = { script: [], loop: false, mode: 'script', calls: [], closed: 0, server: null, retryAfter: null, rateOnce: 0, limits: null, usage: null };
  const tok = (x) => Math.ceil(JSON.stringify(x ?? '').length / 3);
  const limitHeaders = () => (fake.limits ? { 'x-ratelimit-limit-tokens': String(fake.limits.limit ?? 8000), 'x-ratelimit-remaining-tokens': String(fake.limits.remaining ?? 8000), 'x-ratelimit-reset-tokens': fake.limits.reset ?? '0s', 'x-ratelimit-limit-requests': String(fake.limits.reqLimit ?? 1000), 'x-ratelimit-remaining-requests': String(fake.limits.reqRemaining ?? 999) } : {});
  const usageFor = (body, message) => (fake.usage ? fake.usage(body, message) : { prompt_tokens: tok(body?.messages) + tok(body?.tools), completion_tokens: tok(message), total_tokens: tok(body?.messages) + tok(body?.tools) + tok(message) });
  const sse = (res, message, slow, usage) => {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', ...limitHeaders() });
    const chunk = (delta, finish = null) => `data: ${JSON.stringify({ id: 'x', object: 'chat.completion.chunk', model: 'fake', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
    const parts = [];
    if (message.tool_calls) parts.push(chunk({ role: 'assistant', tool_calls: message.tool_calls.map((t, i) => ({ index: i, ...t })) }));
    else {
      const txt = message.content ?? '';
      parts.push(chunk({ role: 'assistant', content: '' }));
      for (let i = 0; i < txt.length; i += 12) parts.push(chunk({ content: txt.slice(i, i + 12) }));
    }
    parts.push(`data: ${JSON.stringify({ id: 'x', object: 'chat.completion.chunk', model: 'fake', choices: [{ index: 0, delta: {}, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }], x_groq: { usage } })}\n\n`, 'data: [DONE]\n\n');
    let i = 0;
    const tick = () => {
      if (res.destroyed || res.writableEnded) return;
      if (i < parts.length) { res.write(parts[i++]); setTimeout(tick, slow ? 250 : 0); } else res.end();
    };
    tick();
  };
  function startFake() {
    fake.server = http.createServer((req, res) => {
      res.on('close', () => { if (!res.writableFinished) fake.closed++; });
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', () => {
        let body = null;
        try { body = JSON.parse(raw); } catch {}
        fake.calls.push({ auth: req.headers.authorization, body });
        const send = (st, txt, extra = {}) => { res.writeHead(st, { 'content-type': 'application/json', ...limitHeaders(), ...extra }); res.end(txt); };
        const ra = fake.retryAfter != null ? { 'retry-after': String(fake.retryAfter) } : {};
        if (fake.mode === 'rate' || fake.rateOnce > 0) { if (fake.rateOnce > 0) fake.rateOnce--; return send(429, JSON.stringify({ error: { message: `limit ${SENTINEL}` } }), ra); }
        if (fake.mode === 'auth') return send(401, JSON.stringify({ error: { message: `bad key ${SENTINEL}` } }));
        if (fake.mode === 'badreq') return send(400, JSON.stringify({ error: { message: 'tool_use_failed' } }));
        const step = fake.loop ? tc('list_outline', {}) : fake.script.length ? fake.script.shift() : say('Listo.');
        const message = typeof step === 'function' ? step(body) : step;
        const usage = usageFor(body, message);
        if (body?.stream) return sse(res, fake.mode === 'slowstream' ? say('x'.repeat(400)) : message, fake.mode === 'slowstream', usage);
        send(200, JSON.stringify({ id: 'x', object: 'chat.completion', model: 'fake', choices: [{ index: 0, finish_reason: message.tool_calls ? 'tool_calls' : 'stop', message }], usage }));
      });
    });
    return new Promise((resolve) => fake.server.listen(0, '127.0.0.1', () => { process.env.GROQ_BASE_URL = `http://127.0.0.1:${fake.server.address().port}`; resolve(); }));
  }
  const reset = () => { fake.script = []; fake.loop = false; fake.mode = 'script'; fake.calls = []; fake.closed = 0; fake.retryAfter = null; fake.rateOnce = 0; fake.limits = null; fake.usage = null; };

  // ---- captura de todo lo que sale
  const seen = [];
  const origs = {};
  for (const k of ['log', 'warn', 'error', 'info']) {
    origs[k] = console[k];
    console[k] = (...a) => { seen.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
  }

  safeRm(RUN);
  await startFake();
  const pool = new pg.Pool({ connectionString: url });
  await resetTestDb(pool);
  const apps = [];
  const mk = async () => {
    const a = await buildApp({ databaseUrl: url, watchSite: false, config: { trustProxy: false, allowedOrigins: new Set(), adminIps: parseIpAllowList(''), probeThreshold: 100000 } });
    apps.push(a);
    return a;
  };
  const app = await mk();
  await app.portal.ensureAdmin();
  const login = async (a, u, p) => {
    const r = await a.inject({ method: 'POST', url: '/api/auth/login', payload: { username: u, password: p } });
    assert.equal(r.statusCode, 200, r.body);
    return `portal_session=${r.cookies.find((x) => x.name === 'portal_session').value}`;
  };
  const ck = { admin: await login(app, 'admin_h', 'Clave-de-prueba-1') };
  const req = async (method, urlPath, { cookie, payload } = {}, a = app) => {
    const res = await a.inject({ method, url: urlPath, payload, headers: cookie ? { cookie } : {} });
    seen.push(res.body);
    let json = null;
    try { json = JSON.parse(res.body); } catch {}
    return { status: res.statusCode, json, body: res.body, headers: res.headers };
  };
  for (const role of ['viewer', 'editor', 'editor2']) {
    const r = await req('POST', '/api/users', { cookie: ck.admin, payload: { username: `${role}_h`, password: 'Clave-Segura-2026', role: role === 'editor2' ? 'editor' : role } });
    assert.equal(r.status, 201, r.body);
    ck[role] = await login(app, `${role}_h`, 'Clave-Segura-2026');
  }
  assert.equal((await req('PUT', '/api/ai/config', { cookie: ck.admin, payload: { apiKey: SENTINEL, model: 'openai/gpt-oss-120b', enabled: true } })).status, 200);

  /** POST /api/ai/chat con stream:true → eventos SSE parseados [{event, data}]. */
  const stream = async (payload, cookie = ck.editor, a = app) => {
    const res = await a.inject({ method: 'POST', url: '/api/ai/chat', payload: { ...payload, stream: true }, headers: { cookie } });
    seen.push(res.body);
    const events = [];
    if (/text\/event-stream/.test(res.headers['content-type'] || '')) {
      for (const block of res.body.split('\n\n')) {
        const ev = /^event: (.+)$/m.exec(block)?.[1];
        const data = /^data: (.+)$/m.exec(block)?.[1];
        if (ev) events.push({ event: ev, data: JSON.parse(data) });
      }
    }
    return { status: res.statusCode, headers: res.headers, body: res.body, events, json: events.length ? null : (() => { try { return JSON.parse(res.body); } catch { return null; } })() };
  };
  const mkPage = async (seccion, slug, title, extra = {}) => {
    const r = await req('POST', '/api/pages', { cookie: ck.editor, payload: { seccion, slug, title, tipo: seccion === 'tareas' ? 'tarea' : seccion === 'guia' ? 'guia' : 'problema', ...extra } });
    assert.equal(r.status, 201, r.body);
    return r.json;
  };
  const cleanup = async () => {
    for (const k of Object.keys(origs)) console[k] = origs[k];
    await fake.server?.close();
    for (const a of apps) await a.close().catch(() => {});
    await pool?.end();
    safeRm(RUN);
  };
  return { fake, reset, seen, pool, app, apps, mk, login, ck, req, stream, mkPage, cleanup, SENTINEL };
}
