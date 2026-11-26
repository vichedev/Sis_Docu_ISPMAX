/*
 * Historial de deshacer/rehacer por instantáneas (puro e inmutable).
 * Las ediciones seguidas con la misma `key` (escribir en el mismo campo) dentro de `window` ms se funden
 * en una sola entrada, para que Ctrl+Z deshaga una palabra o frase y no cada tecla.
 */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** Clave de la última edición (para fundir tecleo continuo); null = no fundir. */
  key: string | null;
  /** Momento (ms) de la última edición. */
  at: number;
}

export interface PushOptions {
  key?: string | null;
  now?: number;
  /** Máximo de entradas guardadas hacia atrás. */
  limit?: number;
  /** Ventana (ms) para fundir ediciones con la misma clave. */
  window?: number;
}

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], key: null, at: 0 };
}

export function pushHistory<T>(h: History<T>, next: T, o: PushOptions = {}): History<T> {
  if (next === h.present) return h;
  const now = o.now ?? Date.now();
  const key = o.key ?? null;
  const limit = o.limit ?? 200;
  const win = o.window ?? 1200;
  if (key && key === h.key && now - h.at < win && h.past.length) {
    return { past: h.past, present: next, future: [], key, at: now };
  }
  const past = [...h.past, h.present];
  return { past: past.length > limit ? past.slice(past.length - limit) : past, present: next, future: [], key, at: now };
}

export const canUndo = <T>(h: History<T>): boolean => h.past.length > 0;
export const canRedo = <T>(h: History<T>): boolean => h.future.length > 0;

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  const prev = h.past[h.past.length - 1];
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], key: null, at: 0 };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  const [next, ...rest] = h.future;
  return { past: [...h.past, h.present], present: next, future: rest, key: null, at: 0 };
}

/** Corta la fusión: la próxima edición abre entrada nueva aunque tenga la misma clave. */
export const breakMerge = <T>(h: History<T>): History<T> => (h.key ? { ...h, key: null } : h);
