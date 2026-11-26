/*
 * Única fuente de las direcciones del sitio publicado (el manual). La base la da el servidor
 * (`GET /api/site/status` → `siteUrl`: «/» por defecto, «/manual/» u otra si lo pide el ajuste `site_base`).
 * Nada fuera de este archivo debe escribir «/manual/» a mano.
 */

let current = '/';

/** Base con barra inicial y final («/», «/manual/», «https://host/m/»). Vacío o inválido → «/». */
export function normalizeBase(u?: string | null): string {
  const t = (u ?? '').trim();
  if (!t) return '/';
  if (/^https?:\/\//i.test(t)) return t.replace(/\/+$/, '') + '/';
  if (t.startsWith('//')) return '/';
  return '/' + t.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/') + (/^\/*$/.test(t) ? '' : '/');
}

/** Fija la base global (la usan los lugares sin acceso al estado: vista previa MDX, enlaces del editor). */
export function setSiteBase(u?: string | null): void { current = normalizeBase(u); }
export const getSiteBase = () => current;

/** Dirección pública de una ruta del manual (`/tareas/x`, `/x#ancla`, `#ancla`, «» = portada). Sin dobles barras. */
export function siteHref(route = '', base?: string | null): string {
  const b = base == null ? current : normalizeBase(base);
  const r = route.trim();
  if (!r || r === '/') return b;
  if (r.startsWith('#') || r.startsWith('?')) return b + r;
  return b + r.replace(/^\/+/, '');
}
