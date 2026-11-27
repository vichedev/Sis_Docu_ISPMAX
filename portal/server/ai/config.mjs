// Configuración del asistente de IA. La clave se guarda CIFRADA (AES-256-GCM, security/secrets.mjs, AAD «ai-key») en la
// tabla settings (`ai_key_enc`); la que está guardada en Ajustes manda y, si no hay, se usa GROQ_API_KEY del entorno.
// Estas claves de settings no están en la lista de ajustes del panel (GET/PUT /api/settings no las tocan) ni en
// CONTENT_SETTINGS (el paquete .ispmax no las incluye). Nada de aquí devuelve ni registra la clave.
import { loadSecretKey, createSecretBox } from '../security/secrets.mjs';
import { DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS } from './groq.mjs';

export const AI_KEYS = { key: 'ai_key_enc', model: 'ai_model', enabled: 'ai_enabled' };
export const SUGGESTED_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const AAD = 'ai-key';
const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;

export const validModel = (m) => typeof m === 'string' && MODEL_RE.test(m);

export function createAiConfig({ db, env = process.env }) {
  let box = null;
  const secretBox = () => (box ??= createSecretBox(loadSecretKey(env).key));
  const get = async (key) => {
    const r = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
    return r.rows.length ? r.rows[0].value : null;
  };
  const put = (key, value) =>
    db.query(
      'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()',
      [key, JSON.stringify(value)]
    );

  /** Estado resuelto. `apiKey` solo se usa dentro del servidor (nunca sale por la API). */
  async function resolve() {
    const [enc, model, enabledRaw] = await Promise.all([get(AI_KEYS.key), get(AI_KEYS.model), get(AI_KEYS.enabled)]);
    let apiKey = '';
    let source = null;
    let unreadable = false;
    if (typeof enc === 'string' && enc) {
      try {
        apiKey = secretBox().decrypt(enc, AAD).toString('utf8').trim();
        if (apiKey) source = 'ajustes';
      } catch {
        unreadable = true; // la clave maestra cambió: se avisa y se cae al entorno
      }
    }
    if (!apiKey) {
      const e = String(env.GROQ_API_KEY || '').trim();
      if (e) {
        apiKey = e;
        source = 'entorno';
      }
    }
    const switchOn = enabledRaw !== false; // por defecto activo
    const configured = !!apiKey;
    const m = validModel(model) ? model : String(env.GROQ_MODEL || '').trim() || DEFAULT_MODEL;
    const t = Number(env.GROQ_TIMEOUT_MS);
    return {
      apiKey, source, unreadable, configured, switchOn, enabled: configured && switchOn, model: m,
      baseUrl: String(env.GROQ_BASE_URL || '').trim() || DEFAULT_BASE_URL,
      timeoutMs: Number.isFinite(t) && t >= 100 ? t : DEFAULT_TIMEOUT_MS,
    };
  }

  /** Vista pública: sin la clave. */
  const publicView = (c) => ({ configured: c.configured, source: c.source, model: c.model, enabled: c.enabled, active: c.switchOn, unreadable: c.unreadable });

  async function save({ apiKey, model, enabled }) {
    if (apiKey !== undefined) await put(AI_KEYS.key, secretBox().encrypt(apiKey, AAD));
    if (model !== undefined) await put(AI_KEYS.model, model);
    if (enabled !== undefined) await put(AI_KEYS.enabled, enabled);
  }
  async function clearKey() {
    await db.query('DELETE FROM settings WHERE key = $1', [AI_KEYS.key]);
  }
  return { resolve, publicView, save, clearKey };
}
