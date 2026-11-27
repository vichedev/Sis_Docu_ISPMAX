// Cliente de Groq con el SDK oficial (groq-sdk). La clave la resuelve ./config.mjs (Ajustes cifrada o entorno) y se
// pasa aquí; no se registra y ningún mensaje de error la incluye (los cuerpos de error del proveedor se descartan:
// solo se usa su código HTTP). Reintentos del SDK desactivados: el límite de uso se informa tal cual.
import Groq from 'groq-sdk';
import { httpError } from '../routes/util.mjs';

export const DEFAULT_BASE_URL = 'https://api.groq.com';
export const DEFAULT_MODEL = 'openai/gpt-oss-120b';
export const DEFAULT_TIMEOUT_MS = 45_000;

/** Error del proveedor ya traducido a un mensaje para la persona usuaria (sin datos del proveedor). */
export function providerError(kind) {
  switch (kind) {
    case 'rate':
      return httpError(429, 'Se alcanzó el límite de uso de la IA; inténtalo en unos minutos.', { code: 'AI_RATE_LIMIT' });
    case 'auth':
      // 502 y no 401: un 401 haría que el panel crea que la sesión caducó.
      return httpError(502, 'La clave de IA no es válida. Revísala en Ajustes.', { code: 'AI_KEY_INVALID' });
    case 'timeout':
      return httpError(504, 'La IA tardó demasiado en responder. Inténtalo de nuevo.', { code: 'AI_TIMEOUT' });
    case 'network':
      return httpError(502, 'No se pudo conectar con el servicio de IA. Inténtalo más tarde.', { code: 'AI_UNREACHABLE' });
    case 'format':
      return httpError(502, 'La IA devolvió una respuesta que no se pudo usar. Inténtalo de nuevo.', { code: 'AI_BAD_RESPONSE' });
    default:
      return httpError(502, 'El servicio de IA no pudo atender la petición. Inténtalo más tarde.', { code: 'AI_PROVIDER_ERROR' });
  }
}

/** Extrae un objeto JSON de un texto (admite vallas ```json y texto alrededor). null si no hay. */
export function extractJson(text) {
  if (typeof text !== 'string') return null;
  let s = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1].trim();
  const obj = (t) => {
    try {
      const v = JSON.parse(t);
      return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };
  const direct = obj(s);
  if (direct) return direct;
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  return a >= 0 && b > a ? obj(s.slice(a, b + 1)) : null;
}

/** Traduce un error del SDK (o de red) a un error HTTP propio. Nunca copia el texto del proveedor. */
export function translateError(e) {
  if (e instanceof Groq.APIConnectionTimeoutError || e?.name === 'AbortError') return providerError('timeout');
  if (e instanceof Groq.APIConnectionError) return providerError('network');
  const st = e?.status;
  if (st === 429) return providerError('rate');
  if (st === 401 || st === 403) return providerError('auth');
  if (typeof st === 'number') return providerError('other');
  return providerError('network');
}

/**
 * Pide una respuesta JSON al modelo. `cfg`: { apiKey, model, baseUrl, timeoutMs } (de config.mjs).
 * Si el modelo no admite response_format, se reintenta una vez sin él. Devuelve { json, model }.
 */
export async function chatJson({ cfg, messages, maxTokens = 4000, temperature = 0.3 }) {
  if (!cfg?.apiKey) throw httpError(503, 'Falta configurar la clave de IA.', { code: 'AI_DISABLED' });
  const client = new Groq({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl || DEFAULT_BASE_URL, timeout: cfg.timeoutMs || DEFAULT_TIMEOUT_MS, maxRetries: 0 });
  const base = { model: cfg.model || DEFAULT_MODEL, messages, temperature, max_completion_tokens: maxTokens, stream: false };
  if (/^openai\/gpt-oss/.test(base.model)) base.reasoning_effort = 'low';
  let res;
  try {
    try {
      res = await client.chat.completions.create({ ...base, response_format: { type: 'json_object' } });
    } catch (e) {
      if (e?.status === 400 && /response_format|json_object|json mode/i.test(String(e?.message || ''))) res = await client.chat.completions.create(base);
      else throw e;
    }
  } catch (e) {
    throw translateError(e);
  }
  const json = extractJson(res?.choices?.[0]?.message?.content);
  if (!json) throw providerError('format');
  return { json, model: base.model };
}

/** Llamada con herramientas (tool-calling). Devuelve el mensaje del asistente (content y/o tool_calls). */
export async function chatWithTools({ cfg, messages, tools, maxTokens = 3000, temperature = 0.2, signal }) {
  if (!cfg?.apiKey) throw httpError(503, 'Falta configurar la clave de IA.', { code: 'AI_DISABLED' });
  const client = new Groq({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl || DEFAULT_BASE_URL, timeout: cfg.timeoutMs || DEFAULT_TIMEOUT_MS, maxRetries: 0 });
  const model = cfg.model || DEFAULT_MODEL;
  const body = { model, messages, tools, tool_choice: 'auto', temperature, max_completion_tokens: maxTokens, stream: false };
  if (/^openai\/gpt-oss/.test(model)) body.reasoning_effort = 'low';
  try {
    const res = await client.chat.completions.create(body, signal ? { signal } : undefined);
    const msg = res?.choices?.[0]?.message;
    if (!msg) throw providerError('format');
    return { message: msg, model };
  } catch (e) {
    if (e?.statusCode) throw e; // ya traducido
    if (e?.status === 400) throw httpError(502, 'El modelo no pudo usar las herramientas del asistente. Prueba con las acciones rápidas o reformula la petición.', { code: 'AI_TOOLS_FAILED' });
    throw translateError(e);
  }
}

/**
 * Igual que chatWithTools pero con streaming (stream:true): `onDelta(texto)` recibe el texto a medida que llega y
 * `onReset()` avisa si, tras haber enviado texto, el modelo empieza a pedir herramientas (ese texto era un preámbulo).
 */
export async function chatWithToolsStream({ cfg, messages, tools, maxTokens = 3000, temperature = 0.2, signal, onDelta, onReset }) {
  if (!cfg?.apiKey) throw httpError(503, 'Falta configurar la clave de IA.', { code: 'AI_DISABLED' });
  const client = new Groq({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl || DEFAULT_BASE_URL, timeout: cfg.timeoutMs || DEFAULT_TIMEOUT_MS, maxRetries: 0 });
  const model = cfg.model || DEFAULT_MODEL;
  const body = { model, messages, tools, tool_choice: 'auto', temperature, max_completion_tokens: maxTokens, stream: true };
  if (/^openai\/gpt-oss/.test(model)) body.reasoning_effort = 'low';
  let content = '';
  let streamed = 0;
  let sawCall = false;
  const calls = [];
  try {
    const stream = await client.chat.completions.create(body, signal ? { signal } : undefined);
    for await (const chunk of stream) {
      const d = chunk?.choices?.[0]?.delta;
      if (!d) continue;
      if (Array.isArray(d.tool_calls)) {
        if (!sawCall && streamed > 0) onReset?.();
        sawCall = true;
        for (const t of d.tool_calls) {
          const i = t.index ?? 0;
          calls[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } };
          if (t.id) calls[i].id = t.id;
          if (t.function?.name) calls[i].function.name += t.function.name;
          if (t.function?.arguments) calls[i].function.arguments += t.function.arguments;
        }
      }
      if (typeof d.content === 'string' && d.content) {
        content += d.content;
        if (!sawCall) { streamed += d.content.length; onDelta?.(d.content); }
      }
    }
  } catch (e) {
    if (e?.statusCode) throw e;
    if (e?.status === 400) throw httpError(502, 'El modelo no pudo usar las herramientas del asistente. Prueba con las acciones rápidas o reformula la petición.', { code: 'AI_TOOLS_FAILED' });
    throw translateError(e);
  }
  const list = calls.filter(Boolean);
  return { message: { role: 'assistant', content: content || null, ...(list.length ? { tool_calls: list } : {}) }, model };
}
