// Utilidades compartidas de las rutas propias del portal.
export function httpError(status, message, extra = {}) {
  const e = new Error(message);
  e.statusCode = status;
  e.extra = extra;
  e.expose = true; // mensaje escrito para el usuario: se puede mostrar (también con 5xx, p. ej. 503)
  return e;
}

export const SECCIONES = [
  { key: 'tareas', label: 'Quiero hacer…' },
  { key: 'guia', label: 'Guía' },
  { key: 'problemas', label: 'Tengo un problema' },
  { key: 'preguntas', label: 'Preguntas' },
  { key: 'referencia', label: 'Referencia' },
  { key: 'conceptos', label: 'Conceptos' },
];
export const SECCION_KEYS = SECCIONES.map((s) => s.key);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
export function checkSlug(v, campo = 'slug') {
  if (typeof v !== 'string' || !SLUG_RE.test(v)) {
    throw httpError(400, `El campo ${campo} solo admite minúsculas, números y guiones (máx. 100).`);
  }
  return v;
}

export function parseId(v, campo = 'id') {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) throw httpError(400, `Valor no válido para ${campo}.`);
  return n;
}

export function intParam(v, def, min, max) {
  if (v === undefined || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// Ruta pública a partir de sus partes: /seccion/modulo?/slug
export function buildRoute(seccion, modulo, slug) {
  return '/' + [seccion, modulo || null, slug].filter(Boolean).join('/');
}
export function routeToFile(route) {
  if (route.split('/').includes('..')) throw httpError(400, 'Ruta no válida.');
  return route.replace(/^\//, '') + '.mdx';
}
// Parte una ruta /seccion[/modulo]/slug.
export function splitRoute(route) {
  const p = route.replace(/^\//, '').split('/');
  if (p.length === 1) return { seccion: 'raiz', modulo: null, slug: p[0] };
  if (p.length === 2) return { seccion: p[0], modulo: null, slug: p[1] };
  return { seccion: p[0], modulo: p.slice(1, -1).join('/'), slug: p[p.length - 1] };
}

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
export function sameJson(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (isPlainObject(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}
export function escapeLike(s) {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}
