// Asistente de IA (Groq) para el editor. La IA PROPONE y la persona APRUEBA: ninguna de estas rutas guarda ni publica
// contenido; la página nueva la crea el panel con POST /api/pages (borrador) solo cuando la persona pulsa «Crear borrador».
//   GET  /api/ai/status        (editor)  { enabled, configured, model }
//   GET  /api/ai/outline       (editor)  secciones, grupos y páginas para sugerir ubicación
//   POST /api/ai/assist        (editor)  { action, text, instruction?, context? } → { text, avisos, model }
//   POST /api/ai/draft-page    (editor)  { description, parent? } → { proposal, model }
//   GET/PUT /api/ai/config     (admin)   clave (cifrada en la BD), modelo e interruptor; nunca devuelve la clave
//   POST /api/ai/test          (admin)   llamada mínima real al proveedor
import {
  httpError, parseId, intParam, isPlainObject,
} from './util.mjs';
import { TIPOS } from './pages.mjs';
import { createAiConfig, validModel, SUGGESTED_MODELS } from '../ai/config.mjs';
import { loadOutline, outlineText, outlineCompact, buildCreateProposal } from '../ai/proposals.mjs';
import { createToolbox, selectTools, needsOutline, withImageDocs } from '../ai/chatTools.mjs';
import { createBudget, budgetKey, estimateTokens, tpmLimit, MAX_AUTO_WAIT_S, MAX_RETRY_WAIT_S } from '../ai/budget.mjs';
import { createHistory, autoTitle, historyDays } from '../ai/history.mjs';
import { PassThrough } from 'node:stream';
import { CHAT_LIMITS, CHAT_BUDGET, chatSystem, compactMessages } from '../ai/prompts.mjs';
import { chatJson, chatWithTools, chatWithToolsStream, translateError, providerLimitError } from '../ai/groq.mjs';
import { ACTIONS, LIMITS, assistMessages, draftMessages } from '../ai/prompts.mjs';
import { checkAssistOutput, checkDraftOutput } from '../ai/output.mjs';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
const KEY_RE = /^[\x21-\x7e]{8,300}$/;


/** Límite de uso por usuario: `max` peticiones por ventana. Memoria del proceso (se reinicia con el servidor). */
export function createRateLimiter({ max = 20, windowMs = 10 * 60_000, now = () => Date.now() } = {}) {
  const hits = new Map();
  return {
    hit(userId) {
      const t = now();
      const list = (hits.get(userId) ?? []).filter((x) => t - x < windowMs);
      if (list.length >= max) {
        hits.set(userId, list);
        return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (t - list[0])) / 1000)) };
      }
      list.push(t);
      hits.set(userId, list);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
      return { ok: true };
    },
  };
}

/** Respuesta resumida cuando el turno termina con propuestas (evita una llamada final al modelo solo para resumir la tarjeta). */
export function synthReply(props) {
  if (props.length > 1) return 'Preparé ' + props.length + ' propuestas. Revísalas y aplica las que quieras.';
  const p = props[0];
  if (p.kind === 'create') return 'Te propongo crear «' + p.title + '» en ' + p.route + ' como borrador. Revisa la tarjeta, ajusta lo que quieras y pulsa «Crear borrador».';
  if (p.kind === 'edit') return 'Te propongo estos cambios en «' + p.page.title + '». Revisa el cambio y pulsa «Aplicar».';
  return 'Te propongo mover «' + p.page.title + '». Revisa y pulsa «Aplicar».';
}

export function parseRate(env = process.env) {
  const n = Number.parseInt(String(env.PORTAL_AI_RATE ?? '').trim(), 10);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 20;
}

export function registerAiRoutes(app, ctx) {
  const { db, requireRole, audit } = ctx;
  const editor = { preHandler: requireRole('editor'), bodyLimit: 64 * 1024 };
  const editorGet = { preHandler: requireRole('editor') };
  const admin = { preHandler: requireRole('admin'), bodyLimit: 16 * 1024 };
  const adminGet = { preHandler: requireRole('admin') };
  const cfgStore = createAiConfig({ db });
  const limiter = createRateLimiter({ max: parseRate() });
  const history = createHistory(db);
  // Retención: poda al arrancar y cada 6 h (PORTAL_AI_HISTORY_DAYS, def. 90; 0 = sin caducidad).
  const prune = () => history.prune(historyDays()).catch((e) => console.error('[ai] poda del historial:', e.message));
  void prune();
  const pruneTimer = setInterval(prune, 6 * 3600 * 1000);
  pruneTimer.unref?.();
  app.addHook('onClose', async () => clearInterval(pruneTimer));

  /** Configuración efectiva; 503 si falta clave o está desactivada. */
  async function requireEnabled() {
    const c = await cfgStore.resolve();
    if (!c.configured) throw httpError(503, 'La IA no está configurada. Una persona administradora debe poner la clave en Ajustes.', { code: 'AI_DISABLED' });
    if (!c.switchOn) throw httpError(503, 'El asistente de IA está desactivado en Ajustes.', { code: 'AI_DISABLED' });
    return c;
  }
  function useQuota(request, reply) {
    const r = limiter.hit(request.user.id);
    if (!r.ok) {
      reply.header('Retry-After', String(r.retryAfter));
      throw httpError(429, `Llegaste al límite de uso del asistente del portal (${parseRate()} peticiones cada 10 minutos). Inténtalo en ${Math.ceil(r.retryAfter / 60)} min.`, { code: 'AI_RATE_LIMIT', retryAfter: r.retryAfter });
    }
  }
  const text = (v, campo, max, { vacio = false } = {}) => {
    if (v === undefined || v === null) {
      if (vacio) return '';
      throw httpError(400, `Falta el campo ${campo}.`);
    }
    if (typeof v !== 'string') throw httpError(400, `El campo ${campo} debe ser texto.`);
    if (!vacio && !v.trim()) throw httpError(400, `El campo ${campo} no puede estar vacío.`);
    if (v.length > max) throw httpError(413, `El campo ${campo} es demasiado largo (máx. ${max} caracteres).`);
    return v;
  };

  // ---- estado y esquema (editor)
  app.get('/api/ai/status', editorGet, async () => {
    const c = await cfgStore.resolve();
    return { enabled: c.enabled, configured: c.configured, model: c.model };
  });
  app.get('/api/ai/outline', editorGet, async () => ({ secciones: await loadOutline(ctx) }));

  // ---- configuración (admin). La clave NUNCA se devuelve.
  const configView = async () => {
    const c = await cfgStore.resolve();
    return { ...cfgStore.publicView(c), suggestedModels: SUGGESTED_MODELS, rate: parseRate() };
  };
  app.get('/api/ai/config', adminGet, configView);
  app.put('/api/ai/config', admin, async (request) => {
    const b = request.body;
    if (!isPlainObject(b)) throw httpError(400, 'Envía un objeto con la configuración.');
    const known = new Set(['apiKey', 'model', 'enabled', 'clearKey']);
    for (const k of Object.keys(b)) if (!known.has(k)) throw httpError(400, `Campo desconocido: ${k}.`);
    const changed = [];
    const patch = {};
    if (b.clearKey === true) {
      await cfgStore.clearKey();
      changed.push('key_removed');
    } else if (b.apiKey !== undefined && b.apiKey !== null && b.apiKey !== '') {
      if (typeof b.apiKey !== 'string' || !KEY_RE.test(b.apiKey.trim())) throw httpError(400, 'La clave no tiene un formato válido (sin espacios, de 8 a 300 caracteres).');
      patch.apiKey = b.apiKey.trim();
      changed.push('key_set');
    }
    if (b.model !== undefined) {
      if (!validModel(b.model)) throw httpError(400, 'El nombre del modelo no es válido.');
      patch.model = b.model;
      changed.push('model');
    }
    if (b.enabled !== undefined) {
      if (typeof b.enabled !== 'boolean') throw httpError(400, 'El campo enabled debe ser verdadero o falso.');
      patch.enabled = b.enabled;
      changed.push('enabled');
    }
    await cfgStore.save(patch);
    await audit(request.user.id, 'ai.config', null, { changed, ...(patch.model ? { model: patch.model } : {}), ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}) });
    return configView();
  });

  app.post('/api/ai/test', admin, async (request) => {
    const b = isPlainObject(request.body) ? request.body : {};
    const c = await cfgStore.resolve();
    const cfg = { ...c };
    if (b.apiKey !== undefined && b.apiKey !== null && b.apiKey !== '') {
      if (typeof b.apiKey !== 'string' || !KEY_RE.test(b.apiKey.trim())) throw httpError(400, 'La clave no tiene un formato válido.');
      cfg.apiKey = b.apiKey.trim(); // solo para esta llamada: no se guarda
    }
    if (b.model !== undefined) {
      if (!validModel(b.model)) throw httpError(400, 'El nombre del modelo no es válido.');
      cfg.model = b.model;
    }
    if (!cfg.apiKey) return { ok: false, code: 'AI_DISABLED', error: 'Falta la clave de IA: pégala y guarda o pruébala antes de guardar.' };
    const t0 = Date.now();
    let out;
    try {
      const r = await chatJson({
        cfg, maxTokens: 200, temperature: 0,
        messages: [{ role: 'system', content: 'Responde solo con un objeto JSON.' }, { role: 'user', content: 'Devuelve exactamente {"ok": true} en JSON.' }],
      });
      out = { ok: true, model: r.model, ms: Date.now() - t0 };
    } catch (e) {
      out = { ok: false, code: e.extra?.code ?? 'AI_PROVIDER_ERROR', error: e.statusCode ? e.message : translateError(e).message };
    }
    await audit(request.user.id, 'ai.test', null, { ok: out.ok, ...(out.ok ? {} : { code: out.code }) });
    return out;
  });

  // ---- acciones sobre un texto
  app.post('/api/ai/assist', editor, async (request, reply) => {
    const b = isPlainObject(request.body) ? request.body : {};
    if (typeof b.action !== 'string' || !Object.hasOwn(ACTIONS, b.action)) throw httpError(400, `Acción no válida. Usa: ${Object.keys(ACTIONS).join(', ')}.`);
    const body = text(b.text, 'text', LIMITS.text);
    const instruction = text(b.instruction, 'instruction', LIMITS.instruction, { vacio: true }).trim();
    if (b.action === 'custom' && !instruction) throw httpError(400, 'Escribe la instrucción para la IA.');
    const context = text(b.context, 'context', LIMITS.context, { vacio: true }).trim();
    const cfg = await requireEnabled();
    useQuota(request, reply);
    const t0 = Date.now();
    let result;
    let tok = {};
    try {
      const r = await chatJson({ cfg, messages: assistMessages({ action: b.action, text: body, instruction, context }), onLimits: noteLimits(bkeyOf(cfg)) });
      if (r.usage) { budget.record(bkeyOf(cfg), r.usage.total); tok = { prompt_tokens: r.usage.prompt, completion_tokens: r.usage.completion }; }
      result = { ...(await checkAssistOutput(r.json, { input: body })), model: r.model };
    } catch (e) {
      await audit(request.user.id, 'ai.error', `assist:${b.action}`, { code: e.extra?.code ?? 'error', chars_in: body.length });
      throw e;
    }
    await audit(request.user.id, 'ai.assist', b.action, { chars_in: body.length, chars_out: result.text.length, model: result.model, ms: Date.now() - t0, ...tok });
    return result;
  });

  // ---- página nueva (solo PROPUESTA: no crea nada)
  app.post('/api/ai/draft-page', editor, async (request, reply) => {
    const b = isPlainObject(request.body) ? request.body : {};
    const description = text(b.description, 'description', LIMITS.description);
    let parentHint = '';
    if (b.parent !== undefined && b.parent !== null && b.parent !== '') {
      const pr = await db.query('SELECT title, route FROM pages WHERE id = $1 AND deleted_at IS NULL', [parseId(b.parent, 'parent')]);
      if (!pr.rowCount) throw httpError(404, 'La página padre indicada no existe.');
      parentHint = `${pr.rows[0].title} (${pr.rows[0].route})`;
    }
    const cfg = await requireEnabled();
    useQuota(request, reply);
    const secs = await loadOutline(ctx);
    const t0 = Date.now();
    let proposal;
    let model;
    try {
      const r = await chatJson({ cfg, maxTokens: 6000, messages: draftMessages({ description, outline: outlineText(secs), parentHint }), onLimits: noteLimits(bkeyOf(cfg)) });
      if (r.usage) budget.record(bkeyOf(cfg), r.usage.total);
      model = r.model;
      proposal = await buildCreateProposal(ctx, { ...(await checkDraftOutput(r.json)), usesTemplate: false });
    } catch (e) {
      await audit(request.user.id, 'ai.error', 'draft-page', { code: e.extra?.code ?? 'error', chars_in: description.length });
      throw e;
    }
    await audit(request.user.id, 'ai.draft_page', proposal.route, { chars_in: description.length, chars_out: proposal.body.length, model, ms: Date.now() - t0 });
    return { proposal, model };
  });


  // ---- chat conversacional con herramientas (solo lectura y propuestas: nada se escribe)
  // Con `stream: true` responde por SSE (eventos meta, activity, delta, reset, proposal, choices, done, error); sin él, JSON.
  const chatRoute = { preHandler: requireRole('editor'), bodyLimit: 256 * 1024, compress: false };
  function parseChat(b) {
    if (!isPlainObject(b)) throw httpError(400, 'Cuerpo no válido.');
    if (!Array.isArray(b.messages) || !b.messages.length) throw httpError(400, 'Falta el campo messages.');
    if (b.messages.length > CHAT_LIMITS.messages) throw httpError(413, `Demasiados mensajes (máx. ${CHAT_LIMITS.messages}).`);
    let total = 0;
    const messages = b.messages.map((m) => {
      if (!isPlainObject(m) || !['user', 'assistant'].includes(m.role)) throw httpError(400, 'Cada mensaje necesita role user o assistant.');
      const content = text(m.content, 'content', CHAT_LIMITS.message).trim();
      total += content.length;
      return { role: m.role, content };
    });
    if (total > CHAT_LIMITS.total) throw httpError(413, 'La conversación es demasiado larga. Empieza una nueva.');
    if (messages[messages.length - 1].role !== 'user') throw httpError(400, 'El último mensaje debe ser del usuario.');
    const c = isPlainObject(b.context) ? b.context : {};
    const context = {};
    if (isPlainObject(c.page)) {
      const pid = Number(c.page.id);
      if (!Number.isInteger(pid) || pid < 1) throw httpError(400, 'Página de contexto no válida.');
      context.page = {
        id: pid, title: text(c.page.title, 'page.title', 200, { vacio: true }), route: text(c.page.route, 'page.route', 300, { vacio: true }),
        seccion: text(c.page.seccion, 'page.seccion', 40, { vacio: true }),
        ...(c.page.body !== undefined ? { body: text(c.page.body, 'page.body', CHAT_LIMITS.pageBody, { vacio: true }) } : {}),
      };
    }
    if (isPlainObject(c.selection)) context.selection = { type: text(c.selection.type, 'selection.type', 40, { vacio: true }), text: text(c.selection.text, 'selection.text', CHAT_LIMITS.selection, { vacio: true }) };
    if (c.mentions !== undefined) {
      if (!Array.isArray(c.mentions) || c.mentions.length > 5) throw httpError(400, 'Menciones no válidas (máx. 5).');
      context.mentions = c.mentions.map((m) => {
        const id = Number(m?.id);
        if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Mención no válida.');
        return { id, title: text(m.title, 'mention.title', 200, { vacio: true }), route: text(m.route, 'mention.route', 300, { vacio: true }) };
      });
    }
    if (c.attachments !== undefined) {
      if (!Array.isArray(c.attachments) || c.attachments.length > 12) throw httpError(400, 'Imágenes adjuntas no válidas (máx. 12).');
      const seen = new Set();
      context.attachments = c.attachments.map((x) => {
        if (!isPlainObject(x) || typeof x.ref !== 'string' || !/^img\d{1,2}$/.test(x.ref) || seen.has(x.ref)) throw httpError(400, 'Imagen adjunta no válida.');
        seen.add(x.ref);
        if (typeof x.path !== 'string' || x.path.length > 250 || !/^[a-z0-9][a-z0-9/_.-]*$/.test(x.path) || x.path.includes('..') || x.path.includes('//')) throw httpError(400, 'Ruta de imagen no válida.');
        if (x.size !== undefined && !['full', 'medium', 'small'].includes(x.size)) throw httpError(400, 'Ancho de imagen no válido.');
        return { ref: x.ref, path: x.path, name: text(x.name, 'attachment.name', 120, { vacio: true }), caption: text(x.caption, 'attachment.caption', 300, { vacio: true }), alt: text(x.alt, 'attachment.alt', 300, { vacio: true }), size: x.size, where: text(x.where, 'attachment.where', 120, { vacio: true }) };
      });
    }
    let conversationId = null;
    if (b.conversation_id !== undefined && b.conversation_id !== null) conversationId = parseId(b.conversation_id, 'conversation_id');
    return { messages, context, conversationId, regenerate: b.regenerate === true, stream: b.stream === true };
  }

  // ---- consumo de tokens del proveedor: presupuesto local (ventana de 60 s) + última lectura de las cabeceras de Groq
  const tpm = tpmLimit();
  const budget = createBudget({ limit: tpm });
  const lastLimits = new Map(); // clave (huella) -> { ...limits, at }
  const bkeyOf = (cfg) => budgetKey(cfg.apiKey);
  /** Lo que se sabe del consumo (sin la clave): lectura del proveedor si la hay y, si no, la cuenta local. */
  function usageView(key) {
    const now = Date.now();
    const l = lastLimits.get(key);
    const used = budget.used(key);
    let out = { tpm, localUsed: used, available: false };
    if (l) {
      const left = l.resetInSec != null ? Math.max(0, Math.ceil(l.resetInSec - (now - l.at) / 1000)) : null;
      const fresh = left === null || left > 0; // pasado el reinicio, el cupo vuelve a estar entero
      out = {
        ...out, available: true, source: 'proveedor', tokensLimit: l.tokensLimit ?? tpm,
        tokensRemaining: fresh ? (l.tokensRemaining ?? null) : (l.tokensLimit ?? tpm), resetInSec: fresh ? left : 0,
        requestsLimit: l.requestsLimit, requestsRemaining: l.requestsRemaining, updatedAt: new Date(l.at).toISOString(),
      };
    } else if (used > 0) {
      out = { ...out, available: true, source: 'local', tokensLimit: tpm, tokensRemaining: Math.max(0, tpm - used), resetInSec: budget.waitFor(key, tpm) || null, requestsLimit: null, requestsRemaining: null, updatedAt: new Date().toISOString() };
    }
    return out;
  }
  /** Segundos que hay que esperar antes de una llamada de `need` tokens (el mayor entre la cuenta local y la lectura del proveedor). */
  function waitSeconds(key, need) {
    let w = budget.waitFor(key, need);
    const l = lastLimits.get(key);
    if (l?.tokensRemaining != null && l.resetInSec != null) {
      const left = l.resetInSec - (Date.now() - l.at) / 1000;
      if (left > 0 && l.tokensRemaining < need) w = Math.max(w, Math.ceil(left));
    }
    return w;
  }
  const noteLimits = (key) => (l) => { if (l) lastLimits.set(key, { ...l, at: Date.now() }); };
  const sleepAbortable = (s, signal) => new Promise((resolve, reject) => {
    const t = setTimeout(resolve, Math.max(0, s) * 1000);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('cancelado')); }, { once: true });
  });

  app.get('/api/ai/usage', editorGet, async () => {
    const c = await cfgStore.resolve();
    return c.apiKey ? usageView(bkeyOf(c)) : { available: false, tpm };
  });
  /** Actualizar a petición de la persona: una llamada mínima (max_tokens = 1) solo para leer las cabeceras. */
  app.post('/api/ai/usage/refresh', { preHandler: requireRole('editor'), bodyLimit: 1024 }, async (request, reply) => {
    const cfg = await requireEnabled();
    useQuota(request, reply);
    const key = bkeyOf(cfg);
    try {
      const r = await chatJson({ cfg, maxTokens: 1, temperature: 0, messages: [{ role: 'user', content: 'Responde {"ok":1} en JSON.' }], onLimits: noteLimits(key) });
      if (r.usage) budget.record(key, r.usage.total);
    } catch (e) {
      if (e.extra?.code !== 'AI_FORMAT' && e.extra?.code !== 'AI_BAD_RESPONSE') throw e; // con max_tokens=1 el JSON sale cortado: solo importan las cabeceras
    }
    return usageView(key);
  });

  /** Bucle de herramientas de un turno. `emit(tipo, datos)` recibe los eventos en vivo (activity, delta, reset, proposal, choices). */
  async function runChat({ cfg, messages, context, ctl, stream, emit }) {
    const key = bkeyOf(cfg);
    const outline = await loadOutline(ctx);
    const toolbox = createToolbox({ ctx, context, onEvent: (ev) => {
      if (ev.type === 'activity') emit('activity', { id: ev.id, tool: ev.tool, label: ev.label, state: ev.state });
      else if (ev.type === 'proposal') emit('proposal', { proposal: ev.proposal });
      else if (ev.type === 'choices') emit('choices', ev.choice);
    } });
    const hist = compactMessages(messages);
    const recent = hist.slice(-3).map((m) => m.content).join(' ');
    let tools = selectTools(recent, !!context.page);
    if (context.attachments?.length) tools = withImageDocs(tools);
    const msgs = [{ role: 'system', content: chatSystem(context, needsOutline(recent, !!context.page) ? outlineCompact(outline, CHAT_BUDGET.outlineChars) : '') }, ...hist];
    const t0 = Date.now();
    let finalText = '';
    let model = cfg.model;
    let steps = 0;
    let incomplete = false;
    let retried = false;
    let waits = 0;
    const tokens = { prompt: 0, completion: 0 };
    const waitStep = async (secs) => {
      const id = 9000 + ++waits;
      emit('activity', { id, tool: 'wait', label: 'Esperando cupo de la IA', state: 'start' });
      await sleepAbortable(secs, ctl.signal);
      emit('activity', { id, tool: 'wait', label: 'Esperando cupo de la IA', state: 'done' });
    };
    const callOnce = () => (stream
      ? chatWithToolsStream({ cfg, messages: msgs, tools, maxTokens: CHAT_BUDGET.maxOutput, signal: ctl.signal, onLimits: noteLimits(key), onDelta: (t) => emit('delta', { text: t }), onReset: () => emit('reset', {}) })
      : chatWithTools({ cfg, messages: msgs, tools, maxTokens: CHAT_BUDGET.maxOutput, signal: ctl.signal, onLimits: noteLimits(key) }));
    /** Una llamada al modelo con presupuesto: espera cupo si hace falta (máx. 8 s), reintenta UNA vez un 429 corto del proveedor. */
    const callModel = async () => {
      const need = estimateTokens(msgs) + estimateTokens(tools) + 300;
      const w = waitSeconds(key, need);
      if (w > MAX_AUTO_WAIT_S) throw providerLimitError(w);
      if (w > 0) await waitStep(w);
      for (;;) {
        try {
          const r = await callOnce();
          const u = r.usage ?? { prompt: estimateTokens(msgs) + estimateTokens(tools), completion: estimateTokens(r.message) };
          budget.record(key, u.total ?? u.prompt + u.completion);
          tokens.prompt += u.prompt;
          tokens.completion += u.completion;
          return r;
        } catch (e) {
          const ra = e.extra?.retryAfter;
          if (e.extra?.code === 'AI_PROVIDER_LIMIT' && !retried && ra && ra <= MAX_RETRY_WAIT_S) { retried = true; await waitStep(ra); continue; }
          throw e;
        }
      }
    };
    for (let i = 0; ; i++) {
      if (i >= CHAT_LIMITS.toolIterations || Date.now() - t0 > CHAT_LIMITS.totalMs) { incomplete = true; break; }
      let r;
      try {
        r = await callModel();
      } catch (e) {
        if (e.extra?.code !== 'AI_TOOLS_FAILED' || i > 0 || steps > 0) throw e;
        r = await callModel(); // un reintento: gpt-oss a veces falla al formar la llamada
      }
      model = r.model;
      const calls = Array.isArray(r.message.tool_calls) ? r.message.tool_calls : [];
      if (!calls.length) { finalText = typeof r.message.content === 'string' ? r.message.content : ''; break; }
      msgs.push({ role: 'assistant', content: r.message.content ?? null, tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.function?.name, arguments: c.function?.arguments ?? '{}' } })) });
      const before = toolbox.proposals.length;
      const results = [];
      for (const c of calls.slice(0, 4)) {
        steps++;
        const out = await toolbox.run(c.function?.name, c.function?.arguments);
        results.push({ name: c.function?.name, out });
        msgs.push({ role: 'tool', tool_call_id: c.id, content: out });
      }
      if (toolbox.choice) { finalText = typeof r.message.content === 'string' && r.message.content.trim() ? r.message.content : toolbox.choice.question; break; } // pregunta aclaratoria: el turno termina
      // Propuestas registradas sin errores: el turno termina aquí (ahorra la llamada final al modelo, que solo resumiría la tarjeta).
      if (results.length && results.every((x) => /^propose_/.test(x.name ?? '') && !x.out.startsWith('Error')) && toolbox.proposals.length > before) {
        const said = typeof r.message.content === 'string' && r.message.content.trim();
        finalText = said ? r.message.content : synthReply(toolbox.proposals);
        if (!said) emit('delta', { text: finalText });
        break;
      }
    }
    const props = toolbox.proposals;
    let replyText = finalText.trim().slice(0, 4000);
    if (!replyText) replyText = incomplete ? (props.length ? 'Preparé las propuestas de abajo. Revísalas antes de aplicarlas.' : 'No pude terminar: la petición necesitó demasiados pasos. Pídemelo de forma más concreta.') : (props.length ? 'Preparé las propuestas de abajo. Revísalas antes de aplicarlas.' : 'No tengo una respuesta para eso. ¿Puedes darme más detalle?');
    return { reply: replyText, proposals: props, rejected: toolbox.rejected, choices: toolbox.choice, incomplete, model, steps, ms: Date.now() - t0, tokens, usage: usageView(key) };
  }

  app.post('/api/ai/chat', chatRoute, async (request, reply) => {
    const { messages, context, conversationId, regenerate, stream } = parseChat(request.body);
    const cfg = await requireEnabled();
    const uid = request.user.id;
    // La conversación (si se indica) debe ser MÍA; se comprueba antes de gastar cuota.
    if (conversationId) await history.conv(uid, conversationId);
    useQuota(request, reply);
    if (context.mentions?.length) { // los datos de las menciones salen de la BD, no del cliente
      const m = await db.query('SELECT id, title, route FROM pages WHERE id = ANY($1) AND deleted_at IS NULL', [context.mentions.map((x) => x.id)]);
      context.mentions = m.rows;
    }
    if (context.attachments?.length) { // solo imágenes que ESTA persona subió (las ajenas o inexistentes se rechazan)
      const r = await db.query('SELECT path, width, height, updated_by FROM assets WHERE path = ANY($1)', [context.attachments.map((x) => x.path)]);
      const by = new Map(r.rows.map((x) => [x.path, x]));
      context.attachments = context.attachments.map((x) => {
        const row = by.get(x.path);
        if (!row || row.updated_by !== uid) throw httpError(400, 'La imagen «' + x.ref + '» no existe o no la subiste tú.');
        return { ...x, width: row.width, height: row.height };
      });
    }
    const ctl = new AbortController();
    const charsIn = messages.reduce((n, m) => n + m.content.length, 0);
    const lastUser = messages[messages.length - 1].content;

    const finish = async (out) => {
      let convId = conversationId;
      let messageId = null;
      try {
        if (!convId) convId = (await history.create(uid, { title: autoTitle(messages.find((m) => m.role === 'user')?.content ?? lastUser), pageId: context.page?.id ?? null })).id;
        messageId = await history.saveTurn(uid, convId, { userText: lastUser, regenerate, reply: out.reply, proposals: out.proposals, choices: out.choices });
      } catch (e) {
        if (e.statusCode === 413) throw e;
        console.error('[ai] no se pudo guardar el historial:', e.message);
      }
      await audit(uid, 'ai.chat', null, { chars_in: charsIn, chars_out: out.reply.length, tools: out.steps, proposals: out.proposals.length, rejected: out.rejected.length, incomplete: out.incomplete, model: out.model, ms: out.ms, prompt_tokens: out.tokens.prompt, completion_tokens: out.tokens.completion, ...(context.attachments?.length ? { images: context.attachments.length } : {}) });
      return { reply: out.reply, proposals: out.proposals, rejected: out.rejected, choices: out.choices, incomplete: out.incomplete, model: out.model, conversation_id: convId, message_id: messageId, usage: out.usage };
    };
    const failed = (e) => audit(uid, 'ai.error', 'chat', { code: e.extra?.code ?? 'error', chars_in: charsIn });

    if (!stream) {
      reply.raw.on('close', () => { if (!reply.raw.writableFinished) ctl.abort(); });
      let out;
      try { out = await runChat({ cfg, messages, context, ctl, stream: false, emit: () => {} }); } catch (e) { await failed(e); throw e; }
      return finish(out);
    }

    // Streaming SSE. Las propuestas se validan en el servidor ANTES de enviarse (cada evento `proposal` ya pasó los controles).
    const pt = new PassThrough();
    const emit = (type, data) => { if (!pt.writableEnded && !pt.destroyed) pt.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); };
    reply.raw.on('close', () => { if (!reply.raw.writableFinished) { ctl.abort(); pt.destroy(); } });
    reply.header('content-type', 'text/event-stream; charset=utf-8').header('cache-control', 'no-store').header('x-accel-buffering', 'no');
    void (async () => {
      try {
        emit('meta', { conversation_id: conversationId });
        const out = await runChat({ cfg, messages, context, ctl, stream: true, emit });
        if (ctl.signal.aborted) return;
        emit('done', await finish(out));
      } catch (e) {
        if (!ctl.signal.aborted) {
          await failed(e).catch(() => {});
          emit('error', { status: e.statusCode ?? 500, code: e.extra?.code ?? null, message: e.expose ? e.message : 'Error interno del servidor.', ...(e.extra?.retryAfter ? { retryAfter: e.extra.retryAfter } : {}) });
        }
      } finally { if (!pt.destroyed) pt.end(); }
    })();
    return reply.send(pt);
  });

  // ---- historial de conversaciones (solo las mías)
  const hGet = { preHandler: requireRole('editor') };
  const hWrite = { preHandler: requireRole('editor'), bodyLimit: 4 * 1024 };
  app.get('/api/ai/conversations', hGet, async (request) => {
    const q = request.query ?? {};
    return history.list(request.user.id, { q: typeof q.q === 'string' ? q.q : '', limit: intParam(q.limit, 30, 1, 100), offset: intParam(q.offset, 0, 0, 1e6) });
  });
  app.post('/api/ai/conversations', hWrite, async (request, reply) => {
    const b = isPlainObject(request.body) ? request.body : {};
    const title = text(b.title, 'title', 120, { vacio: true }).trim() || 'Conversación nueva';
    const c = await history.create(request.user.id, { title, pageId: b.page_id ? parseId(b.page_id, 'page_id') : null });
    reply.code(201);
    return c;
  });
  app.get('/api/ai/conversations/:id', hGet, async (request) => {
    const r = await history.open(request.user.id, parseId(request.params.id));
    // Las imágenes no se guardan en el historial (solo su ruta dentro de la propuesta): si se eliminaron después, la tarjeta lo indica.
    const paths = new Set();
    for (const m of r.messages) for (const p of m.proposals ?? []) for (const x of JSON.stringify(p).matchAll(/\/assets\/([a-z0-9][a-z0-9/_.-]*\.webp)/g)) paths.add(x[1]);
    if (paths.size) {
      const ex = new Set((await db.query('SELECT path FROM assets WHERE path = ANY($1)', [[...paths]])).rows.map((x) => x.path));
      for (const m of r.messages) for (const p of m.proposals ?? []) {
        const miss = [...new Set([...JSON.stringify(p).matchAll(/\/assets\/([a-z0-9][a-z0-9/_.-]*\.webp)/g)].map((x) => x[1]))].filter((x) => !ex.has(x));
        if (miss.length) p.missingImages = miss;
      }
    }
    return r;
  });
  app.put('/api/ai/conversations/:id', hWrite, async (request) => {
    const title = text(request.body?.title, 'title', 120).trim();
    if (!title) throw httpError(400, 'El título no puede estar vacío.');
    await history.rename(request.user.id, parseId(request.params.id), title);
    return { ok: true };
  });
  app.delete('/api/ai/conversations/:id', hGet, async (request) => {
    await history.remove(request.user.id, parseId(request.params.id));
    return { ok: true };
  });
  app.delete('/api/ai/conversations', hGet, async (request) => {
    const n = await history.removeAll(request.user.id);
    await audit(request.user.id, 'ai.history_clear', null, { conversations: n });
    return { ok: true, deleted: n };
  });
  app.put('/api/ai/messages/:id/proposal-state', hWrite, async (request) => {
    const b = isPlainObject(request.body) ? request.body : {};
    if (!['applied', 'discarded'].includes(b.state)) throw httpError(400, 'Estado no válido.');
    const index = Number(b.index);
    if (!Number.isInteger(index) || index < 0 || index > 20) throw httpError(400, 'Índice no válido.');
    await history.setProposalState(request.user.id, parseId(request.params.id), index, b.state, { openPageId: b.open_page_id ? parseId(b.open_page_id, 'open_page_id') : undefined });
    return { ok: true };
  });

  // El panel avisa de que la persona APLICÓ una propuesta (queda en la auditoría; el cambio en sí lo audita la ruta de páginas).
  app.post('/api/ai/applied', { preHandler: requireRole('editor'), bodyLimit: 4 * 1024 }, async (request) => {
    const b = isPlainObject(request.body) ? request.body : {};
    if (!['create', 'edit', 'move', 'rewrite', 'insert'].includes(b.kind)) throw httpError(400, 'Tipo no válido.');
    await audit(request.user.id, 'ai.apply', b.kind, { page: typeof b.page === 'number' ? b.page : null });
    return { ok: true };
  });
}
