// Ruta de administración configurable y oculta (PORTAL_ADMIN_PATH / PORTAL_HIDE_ADMIN) y protección contra sondeos.
//
// - El panel se sirve en `${P}/` y la API también en `${P}/api/*` (siempre; el panel compilado con base './' calcula
//   la API como new URL('api/', document.baseURI)). Internamente la URL se reescribe a /admin/* y /api/* (rewriteUrl de
//   Fastify), así las rutas, la sesión y las pruebas siguen en /api/*.
// - Modo oculto (P ≠ /admin o PORTAL_HIDE_ADMIN=true): /api/* directo, /admin*, y sus variantes (/API, /%61pi, //api…)
//   se reescriben a una ruta interna inexistente y reciben EXACTAMENTE el 404 de cualquier ruta inexistente del manual.
// - Sondeos: por IP, accesos a rutas típicas de escaneo (/wp-*, /.env, *.php, /admin*, /api* directo…) en una ventana
//   deslizante; superado el umbral, esa IP no llega al panel ni a la API durante un tiempo (el manual público sigue).
// La ruta P nunca se escribe en respuestas públicas, robots.txt, sitemap ni registros.

export const DEFAULT_ADMIN_PATH = '/admin';
export const RESERVED_ADMIN_SEGMENTS = ['api', 'assets', 'static', 'healthz', 'robots.txt', 'sitemap.xml', 'manual'];
// Primer segmento de todas las páginas del manual (secciones): tampoco puede usarse.
export const SECTION_SEGMENTS = ['tareas', 'guia', 'problemas', 'preguntas', 'referencia', 'conceptos'];
const ADMIN_PATH_RE = /^\/[a-z0-9][a-z0-9_-]{2,63}$/;
/** Ruta interna (nunca visible: no se refleja en ninguna respuesta) a la que se reescribe lo que debe dar el 404 genérico. */
export const HIDDEN_404_URL = '/.portal-nf';

/** PORTAL_ADMIN_PATH → '/ruta' validada (sin barra final). Lanza con un mensaje claro que no repite el valor. */
export function parseAdminPath(v) {
  let s = String(v ?? '').trim();
  if (!s) return DEFAULT_ADMIN_PATH;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  if (!ADMIN_PATH_RE.test(s)) {
    throw new Error('PORTAL_ADMIN_PATH no es válida: debe ser un solo segmento como /panel-1a2b3c4d5e6f7a8b (minúsculas, números, _ o -, de 3 a 64 caracteres).');
  }
  const seg = s.slice(1);
  if (RESERVED_ADMIN_SEGMENTS.includes(seg) || SECTION_SEGMENTS.includes(seg)) {
    throw new Error('PORTAL_ADMIN_PATH usa un nombre reservado del sistema o de una sección del manual: elija otro.');
  }
  return s;
}

/** Comprueba que la ruta no coincide con el primer segmento de una página publicada (`routes`: lista de rutas). */
export function adminPathCollision(adminPath, routes) {
  const seg = adminPath.slice(1);
  return routes.some((r) => String(r || '').split('/').filter(Boolean)[0] === seg);
}

const decodeNorm = (raw) => {
  try {
    return decodeURIComponent(raw).replace(/\/{2,}/g, '/');
  } catch {
    return null;
  }
};

/**
 * Reescritura de URL (opción rewriteUrl de Fastify). Devuelve { url, via } con via: 'admin' (entró por P),
 * 'hidden' (debe dar el 404 genérico) o null (sin cambios).
 */
export function rewriteFor(url, { adminPath = DEFAULT_ADMIN_PATH, hidden = false } = {}) {
  const u = String(url || '/');
  const qi = u.indexOf('?');
  const raw = qi >= 0 ? u.slice(0, qi) : u;
  const q = qi >= 0 ? u.slice(qi) : '';
  const P = adminPath;
  if (raw === `${P}/api` || raw.startsWith(`${P}/api/`)) return { url: raw.slice(P.length) + q, via: 'admin' };
  if (raw === P || raw.startsWith(`${P}/`)) return { url: '/admin' + raw.slice(P.length) + q, via: 'admin' };
  if (!hidden) return { url: u, via: null };
  const n = decodeNorm(raw);
  if (n === null || /^\/(api|admin)(\/|$)/i.test(n)) return { url: HIDDEN_404_URL, via: 'hidden' };
  return { url: u, via: null };
}

// Rutas típicas de escaneo automático (sobre la ruta original decodificada, en minúsculas).
const PROBE_RE =
  /^\/(?:wp-|wp\/|wordpress|administrator|admin\.php|phpmyadmin|pma\b|myadmin|login|signin|user\/login|actuator|server-status|server-info|cgi-bin|xmlrpc|\.env|\.git|\.svn|\.hg|\.aws|\.ssh|\.ds_store|\.htaccess|\.htpasswd|config\.(?:json|php|yml|yaml)|vendor\/phpunit|boaform|hnap1|manager\/html|_ignition|telescope|solr|owa\/|autodiscover|remote\/login|druid|console\b)|\.(?:php\d?|asp|aspx|jsp|cgi)$/i;

/** ¿Es un sondeo? En modo oculto también /admin* y /api* directos (en el modo por defecto son el panel real). */
export function isProbePath(originalUrl, { hidden = false, via = null } = {}) {
  if (via === 'admin') return false;
  const n = decodeNorm(String(originalUrl || '/').split('?')[0]);
  if (n === null) return true;
  if (PROBE_RE.test(n)) return true;
  return hidden && /^\/(api|admin)(\/|$)/i.test(n);
}

/**
 * Contador de sondeos por IP en memoria (ventana deslizante). `hit(ip, path)` devuelve true si con este acceso la IP
 * quedó bloqueada (para auditar UNA vez); `blocked(ip)` dice si está bloqueada ahora.
 */
export function createProbeGuard({ threshold = 20, windowMs = 5 * 60_000, blockMs = 30 * 60_000, maxIps = 10_000, now = () => Date.now() } = {}) {
  const hits = new Map(); // ip -> { times: number[], paths: string[] }
  const blocks = new Map(); // ip -> hasta (ms)
  function prune(map, limit) {
    if (map.size <= limit) return;
    const drop = map.size - limit;
    let i = 0;
    for (const k of map.keys()) {
      if (i++ >= drop) break;
      map.delete(k);
    }
  }
  return {
    threshold,
    blocked(ip) {
      const until = blocks.get(ip);
      if (!until) return false;
      if (until > now()) return true;
      blocks.delete(ip);
      return false;
    },
    /** Registra un sondeo; devuelve { blockedNow, count, paths } */
    hit(ip, p) {
      const t = now();
      let h = hits.get(ip);
      if (!h) {
        h = { times: [], paths: [] };
        hits.set(ip, h);
        prune(hits, maxIps);
      }
      h.times = h.times.filter((x) => t - x < windowMs);
      h.times.push(t);
      if (h.paths.length < 10) h.paths.push(String(p).slice(0, 80));
      if (h.times.length >= threshold && !this.blocked(ip)) {
        blocks.set(ip, t + blockMs);
        prune(blocks, maxIps);
        const out = { blockedNow: true, count: h.times.length, paths: h.paths };
        hits.delete(ip);
        return out;
      }
      return { blockedNow: false, count: h.times.length };
    },
    reset() {
      hits.clear();
      blocks.clear();
    },
  };
}
