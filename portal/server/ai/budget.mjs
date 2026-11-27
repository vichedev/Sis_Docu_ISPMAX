// Presupuesto de tokens por minuto del proveedor (el plan gratuito de Groq da ~8.000 tokens/min por organización).
// Se cuenta lo realmente usado (campo usage de las respuestas; si falta, una estimación chars/3) en una ventana deslizante
// de 60 s, por clave de API. Antes de cada llamada, si no cabe, se espera un poco o se avisa con los segundos exactos.
import crypto from 'node:crypto';

export const DEFAULT_TPM = 8000;
export const MAX_AUTO_WAIT_S = 8; // espera automática máxima antes de una llamada
export const MAX_RETRY_WAIT_S = 10; // reintento automático tras un 429 del proveedor

export function tpmLimit(env = process.env) {
  const n = Number.parseInt(String(env.PORTAL_AI_TPM ?? '').trim(), 10);
  return Number.isInteger(n) && n >= 500 && n <= 1_000_000 ? n : DEFAULT_TPM;
}

/** Estimación de tokens: caracteres / 3 (conservadora para español y JSON). */
export const estimateTokens = (x) => Math.ceil((typeof x === 'string' ? x : JSON.stringify(x ?? '')).length / 3);

/** Huella corta de la clave (nunca la clave) para agrupar el consumo. */
export const budgetKey = (apiKey) => crypto.createHash('sha256').update(String(apiKey)).digest('hex').slice(0, 12);

/** «2m59.56s», «7.66s», «120ms», «45» → segundos (número) o null. */
export function parseDuration(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  let total = 0;
  let any = false;
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    any = true;
    const n = Number(m[1]);
    total += m[2] === 'ms' ? n / 1000 : m[2] === 'h' ? n * 3600 : m[2] === 'm' ? n * 60 : n;
  }
  return any ? total : null;
}

export function createBudget({ limit = DEFAULT_TPM, windowMs = 60_000, now = () => Date.now() } = {}) {
  const log = new Map(); // key -> [{ t, n }]
  const live = (key) => {
    const t = now();
    const list = (log.get(key) ?? []).filter((e) => t - e.t < windowMs);
    log.set(key, list);
    return list;
  };
  return {
    limit,
    used: (key) => live(key).reduce((n, e) => n + e.n, 0),
    record(key, tokens) {
      if (!Number.isFinite(tokens) || tokens <= 0) return;
      live(key).push({ t: now(), n: Math.round(tokens) });
      if (log.size > 200) for (const k of log.keys()) if (!live(k).length) log.delete(k);
    },
    /** Segundos (entero) que hay que esperar para que quepan `need` tokens; 0 si caben ya (o si no hay nada que esperar). */
    waitFor(key, need) {
      const list = live(key);
      const used = list.reduce((n, e) => n + e.n, 0);
      if (used === 0 || used + need <= limit) return 0;
      const t = now();
      let freed = 0;
      for (const e of list) {
        freed += e.n;
        if (used - freed + need <= limit) return Math.max(1, Math.ceil((e.t + windowMs - t) / 1000));
      }
      return Math.max(1, Math.ceil((list[list.length - 1].t + windowMs - t) / 1000));
    },
  };
}
