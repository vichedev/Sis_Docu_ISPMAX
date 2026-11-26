/*
 * Dirección de la API calculada en tiempo de ejecución (sin imports; probada con `node --test test/auth.test.mjs`).
 * El panel puede servirse desde cualquier ruta del servidor: el servidor inyecta `<base href="…/">` en index.html
 * y la API vive en `<base>api/`. Sin `<base>` (servidores anteriores) se usa `/api/`.
 */

/** Prefijo de la API (con barra inicial y final) a partir del `baseURI` del documento. */
export function apiPrefix(baseURI?: string | null, hasBase = true): string {
  if (!baseURI || !hasBase) return '/api/';
  try { return new URL('api/', baseURI).pathname; } catch { return '/api/'; }
}

/** `/api/pages?x=1` → `<prefijo>pages?x=1`. Lo que no empiece por `/api/` se devuelve igual. */
export function apiPath(path: string, prefix: string): string {
  return path.startsWith('/api/') ? prefix + path.slice(5) : path;
}

let cached: string | null = null;
/** Prefijo de la API de este documento (se calcula una vez). */
export function apiBase(): string {
  if (cached === null) {
    const hasBase = typeof document !== 'undefined' && !!document.querySelector('base[href]');
    cached = apiPrefix(typeof document !== 'undefined' ? document.baseURI : null, hasBase);
  }
  return cached;
}
/** Dirección real de una ruta de la API escrita como `/api/…`. */
export const apiUrl = (path: string) => apiPath(path, apiBase());
