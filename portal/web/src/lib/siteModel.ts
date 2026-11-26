/*
 * Lógica pura del estado del manual (sin imports; probada con `node --test test/live.test.mjs`).
 * `GET /api/site/status` trae `mode`: `dynamic` (el servidor dibuja el manual en vivo desde la base de datos: guardar = visible
 * al instante, sin reconstrucciones) o `static` (el manual se reconstruye en segundo plano tras guardar). Un servidor que
 * aún no envía `mode` se trata como `static`: todo queda como antes.
 */

export interface LiveStatusLike {
  mode?: string | null;
  state?: string | null;
  live?: boolean | null;
  message?: string | null;
  cache?: { pages?: number | null; compiled?: number | null; htmlCached?: number | null; bytes?: number | null } | null;
  themeBuiltAt?: string | null;
  lastChange?: { route?: string | null; at?: string | null } | null;
}

/** ¿El servidor sirve el manual en vivo (sin reconstrucciones)? Único punto de decisión del panel. */
export const isLive = (s: LiveStatusLike | null | undefined): boolean => !!s && s.mode === 'dynamic';

/** En vivo y funcionando (el tema compilado existe). Si no, `error` con `message`. */
export const liveOk = (s: LiveStatusLike | null | undefined): boolean => isLive(s) && s?.state !== 'error' && s?.live !== false;

/** Texto del aviso de error en modo en vivo. */
export const liveProblem = (s: LiveStatusLike | null | undefined): string =>
  (s?.message ?? '').trim() || 'Falta el diseño compilado del manual. Pida a quien administra el sistema que use «Actualizar el sistema» (Ajustes) o recompile el tema.';

/** 1536 → «1,5 KB»; 5242880 → «5 MB». */
export function fmtBytes(n?: number | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${Math.round(n)} B`;
  const u = ['KB', 'MB', 'GB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v >= 10 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1).replace('.', ',')} ${u[i]}`;
}

/** Texto del aviso tras guardar una página (modo en vivo o estático). */
export function savedMessage(pageStatus: string, s: (LiveStatusLike & { autoPublish?: boolean }) | null | undefined): string {
  if (pageStatus !== 'published') return 'Borrador guardado · no aparece en el manual hasta que lo publique';
  if (isLive(s)) return 'Guardado · ya está visible en el manual';
  return s?.autoPublish === false ? 'Guardado · pulse «Actualizar ahora» para que el manual lo muestre' : 'Guardado · el manual se actualiza en unos segundos';
}
export function publishedMessage(s: LiveStatusLike | null | undefined): string {
  return isLive(s) ? 'Publicada · ya está en el manual' : 'Publicada · el manual se actualiza en unos segundos';
}
export function publishedManyMessage(count: number, s: LiveStatusLike | null | undefined): string {
  const head = count === 1 ? 'Se publicó 1 página' : `Se publicaron ${count} páginas`;
  return `${head} · ${isLive(s) ? (count === 1 ? 'ya está en el manual' : 'ya están en el manual') : 'el manual se actualiza en unos segundos'}`;
}

/** Resultado de «Vaciar caché» (`{ok, cleared}`; tolera que falte `cleared`). */
export function clearedMessage(r: { cleared?: number | null } | null | undefined): string {
  const n = r?.cleared;
  return n == null ? 'Caché vaciada' : n === 1 ? 'Caché vaciada · 1 página' : `Caché vaciada · ${n} páginas`;
}
