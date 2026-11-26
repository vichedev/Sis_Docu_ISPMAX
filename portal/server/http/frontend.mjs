// Todo lo que no es la API, en el mismo puerto que la API (sustituye al Nginx del contenedor antiguo):
//   /            manual público generado (portal/data/site, o PORTAL_DATA_DIR/site), con URLs limpias, 404 propio,
//                caché, ETag y cabeceras de seguridad equivalentes a las del nginx.conf anterior.
//   /admin/      panel (SPA compilada en portal/web/dist con base /admin/); /admin → 301 /admin/.
//   /healthz     estado para el healthcheck del contenedor (público, sin datos sensibles).
// El sitio se sirve siempre desde la carpeta actual (el publicador la reemplaza de forma atómica) y con la base con
// la que se generó (site-meta.json): un sitio nuevo o una base nueva se ven sin reiniciar.
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import staticPlugin from '@fastify/static';
import { opsPaths, siteBaseError, getSiteBase, DEFAULT_BASE } from '../ops/publish.mjs';
import { requestPath } from '../auth.mjs';
import { registerSeoRoutes } from './seo.mjs';
import { HIDDEN_404_URL } from './adminPath.mjs';

// ── Cabeceras de seguridad (las del nginx.conf anterior, `always`) ─────────────────────────────────────────────
const CSP_SITE =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'";
// Panel (/admin/**): sin scripts en línea salvo los del index.html compilado, autorizados por su huella (scriptHashes),
// sin ser enmarcable por nadie. Previsualiza imágenes locales antes de subirlas (blob:).
export const CSP_ADMIN =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
// API (/api/**): respuestas de datos; nada se ejecuta ni se enmarca (también si se abre un archivo directamente).
export const CSP_API = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; sandbox";
/** Cabeceras propias del panel y la API (además de SECURITY_HEADERS). */
export const PANEL_HEADERS = { 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };
export const PANEL_ROBOTS = 'noindex, nofollow, noarchive';

/** CSP del panel con las huellas de los <script> en línea del HTML (el index.html de Vite lleva el del tema). */
export function adminCspFor(html) {
  const hashes = [];
  for (const m of String(html).matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    hashes.push(`'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
  return hashes.length ? CSP_ADMIN.replace("script-src 'self'", `script-src 'self' ${[...new Set(hashes)].join(' ')}`) : CSP_ADMIN;
}
export const SECURITY_HEADERS = {
  'x-frame-options': 'SAMEORIGIN',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()',
  'cross-origin-opener-policy': 'same-origin',
};
// HSTS solo con protocolo efectivo https (directo o detrás de un proxy en el que se confía: request.protocol).
export const HSTS = 'max-age=31536000';

// ── Caché ────────────────────────────────────────────────────────────────────────────────────────────────────
export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';
export const CACHE_HTML = 'no-cache';
export const CACHE_SHORT = 'public, max-age=3600, must-revalidate';
const IMG_FONT_RE = /\.(?:webp|png|jpe?g|gif|ico|svg|avif|woff2?|ttf|eot)$/i;

/**
 * Cache-Control por archivo (ruta relativa a la raíz servida, con "/").
 * - Bundles con hash en el nombre: los de Rspress (`static/…`) y los de Vite (`assets/…` del panel): un año, inmutables.
 * - HTML y JSON sin hash (índices, tours): `no-cache` (se revalida con ETag en cada visita: los cambios se ven ya).
 * - Imágenes, fuentes, CSS y JS sin hash: 1 h con revalidación. El nginx anterior daba un año a las imágenes, pero
 *   ahora el contenido cambia en vivo desde el panel y una imagen reemplazada no debe quedar en caché un año.
 */
export function cacheControlFor(rel, { hashedDirs = ['static/'] } = {}) {
  const r = rel.replace(/^\/+/, '');
  if (/\.html?$/i.test(r)) return CACHE_HTML;
  if (hashedDirs.some(d => r.startsWith(d))) return CACHE_IMMUTABLE;
  if (/\.json$/i.test(r)) return CACHE_HTML;
  if (IMG_FONT_RE.test(r) || /\.(?:css|m?js)$/i.test(r)) return CACHE_SHORT;
  return CACHE_SHORT;
}

// ── Rutas seguras ────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Ruta relativa segura dentro de la raíz servida, o null si debe responderse 404: codificación inválida, bytes
 * nulos, barras invertidas, segmentos ocultos (`.git`, `.env`), `.`/`..` (también codificados: `%2e%2e`), o
 * restos de doble codificación que al decodificar otra vez darían separadores o puntos (`%252e%252e%252f`).
 */
export function safeRelPath(urlPath) {
  const raw = String(urlPath || '/').split('?')[0].split('#')[0];
  let dec;
  try {
    dec = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (/[\0\\]/.test(dec)) return null;
  if (/%(?:2e|2f|5c|00)/i.test(dec)) return null; // doble codificación de ".", "/", "\" o NUL
  const segs = dec.split('/').filter(Boolean);
  if (segs.some(s => s.startsWith('.'))) return null; // ocultos, "." y ".."
  // Copias y archivos que nunca forman parte del sitio generado (si alguien los deja en la carpeta, no se sirven).
  if (segs.some(s => /(?:\.(?:bak|old|orig|save|swp|swo|tmp|sql|dump|key|pem|env|log|ispmax)|~)$/i.test(s))) return null;
  if (segs.some(s => s.length > 255)) return null;
  return segs.join('/') + (dec.endsWith('/') && segs.length ? '/' : '');
}

/** ¿`abs` está dentro de `root`? (tras resolver). */
function inside(root, abs) {
  const r = path.resolve(root);
  const a = path.resolve(abs);
  return a === r || a.startsWith(r.endsWith(path.sep) ? r : r + path.sep);
}

async function fileStat(abs) {
  try {
    const st = await fsp.stat(abs);
    return st.isFile() ? st : null;
  } catch {
    return null;
  }
}

/**
 * Equivalente a `try_files $uri $uri.html $uri/index.html` del nginx anterior, más `x.html` → `x/index.html`
 * (enlaces a una carpeta con .html). Devuelve la ruta relativa del archivo existente o null.
 */
export async function resolveSiteFile(root, rel) {
  const clean = rel.replace(/\/+$/, '');
  const cands = [];
  if (!rel || rel.endsWith('/')) cands.push(clean ? `${clean}/index.html` : 'index.html');
  else {
    cands.push(clean, `${clean}.html`, `${clean}/index.html`);
    if (/\.html$/i.test(clean)) cands.push(`${clean.replace(/\.html$/i, '')}/index.html`);
  }
  for (const c of cands) {
    const abs = path.join(root, ...c.split('/'));
    if (!inside(root, abs)) continue;
    if (await fileStat(abs)) return c;
  }
  return null;
}

/** Inserta (o sustituye) `<base href>` en el <head> del index.html del panel. */
export function injectBase(html, href) {
  const tag = `<base href="${String(href).replace(/["<>&]/g, '')}">`;
  if (/<base\b[^>]*>/i.test(html)) return html.replace(/<base\b[^>]*>/i, tag);
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${tag}`) : tag + html;
}

// ── Páginas propias (autocontenidas, sin recursos externos) ──────────────────────────────────────────────────
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function simplePage({ title, heading, text, link, refresh }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${refresh ? `<meta http-equiv="refresh" content="${Number(refresh)}">\n` : ''}<title>${esc(title)}</title>
<style>
:root{color-scheme:light dark;--bg:#f7f7fb;--fg:#1d1b2e;--muted:#5d5a72;--card:#fff;--line:#e3e1ef;--brand:#5b4bd8}
@media (prefers-color-scheme:dark){:root{--bg:#13121c;--fg:#ecebf5;--muted:#a9a6bf;--card:#1c1a29;--line:#2d2a40;--brand:#8f84f0}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:520px;width:100%;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px 26px}
.mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#5b4bd8,#38bdf8);margin-bottom:16px}
h1{font-size:1.3rem;margin:0 0 8px}p{margin:0 0 12px;color:var(--muted)}a{color:var(--brand);font-weight:600}
</style>
</head>
<body>
<main>
<div class="mark" aria-hidden="true"></div>
<h1>${esc(heading)}</h1>
<p>${esc(text)}</p>
${link ? `<p><a href="${esc(link.href)}">${esc(link.label)}</a></p>\n` : ''}</main>
</body>
</html>
`;
}

export const preparingPage = ({ adminLink = true } = {}) =>
  simplePage({
    title: 'El manual se está preparando',
    heading: 'El manual se está preparando',
    text: 'El sistema se acaba de instalar o se está generando el manual por primera vez. Vuelva a intentarlo en unos minutos; esta página se recarga sola.',
    link: adminLink ? { href: '/admin/', label: 'Ir al panel de administración' } : null,
    refresh: 30,
  });

const forbiddenPage = () =>
  simplePage({
    title: 'Acceso no permitido',
    heading: 'Acceso no permitido',
    text: 'El panel de administración no está disponible desde esta dirección de red. Si necesita acceso, pida a la persona responsable que añada su IP a la lista permitida.',
  });

const disabledPage = () =>
  simplePage({
    title: 'Panel deshabilitado',
    heading: 'El panel de administración está deshabilitado',
    text: 'En esta instalación el panel y la API están desactivados (PORTAL_ADMIN_ENABLED=false). El manual público sigue disponible.',
    link: { href: '/', label: 'Ir al manual' },
  });

const noPanelPage = () =>
  simplePage({
    title: 'Panel no compilado',
    heading: 'El panel no está compilado',
    text: 'No se encontró la interfaz compilada del panel (portal/web/dist). Compílela con «npm run web:build» en la carpeta portal.',
  });

const notFoundPage = () =>
  simplePage({ title: 'Página no encontrada', heading: 'Página no encontrada', text: 'La dirección no existe.', link: { href: '/', label: 'Ir al manual' } });

// ── Registro ─────────────────────────────────────────────────────────────────────────────────────────────────
const isAdminPath = p => /^\/admin(\/|$)/i.test(p);
const isApiPath = p => /^\/api(\/|$)/i.test(p);

/**
 * Puerta de /admin y /api: PORTAL_ADMIN_ENABLED=false (503) y PORTAL_ADMIN_ALLOWED_IPS (403) con la IP real
 * (`request.ip`, que respeta PORTAL_TRUST_PROXY). No afecta a / ni a /healthz. Se registra antes que la sesión.
 */
export function registerAdminGate(app, config) {
  app.decorate('genericNotFound', null);
  app.addHook('onRequest', async (request, reply) => {
    const p = requestPath(request.url) ?? '/';
    const route = request.routeOptions?.url || '';
    const api = isApiPath(p) || route === '/api' || route.startsWith('/api/');
    const admin = !api && isAdminPath(p);
    if (!api && !admin) return;
    const probeBlocked = !!app.probes?.blocked?.(request.ip);
    const ipDenied = !!(config.adminIps && !config.adminIps.any && !config.adminIps.allowed(request.ip));
    // Modo oculto: deshabilitado, IP no permitida o bloqueada por sondeos = el mismo 404 que cualquier ruta inexistente.
    if (config.hideAdmin && (config.adminEnabled === false || ipDenied || probeBlocked) && app.genericNotFound) {
      return app.genericNotFound(request, reply);
    }
    for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...PANEL_HEADERS })) reply.header(k, v);
    if (probeBlocked) {
      reply.code(403).header('cache-control', 'no-store');
      return api
        ? reply.header('content-security-policy', CSP_API).send({ error: 'Acceso bloqueado temporalmente desde esta dirección IP.' })
        : reply.type('text/html; charset=utf-8').header('content-security-policy', CSP_ADMIN).send(forbiddenPage());
    }
    if (config.adminEnabled === false) {
      reply.code(503).header('retry-after', '3600').header('cache-control', 'no-store');
      return api
        ? reply.header('content-security-policy', CSP_API).send({ error: 'El panel de administración y la API están deshabilitados en esta instalación.' })
        : reply.type('text/html; charset=utf-8').header('content-security-policy', CSP_ADMIN).send(disabledPage());
    }
    if (config.adminIps && !config.adminIps.any && !config.adminIps.allowed(request.ip)) {
      reply.code(403).header('cache-control', 'no-store');
      return api
        ? reply.header('content-security-policy', CSP_API).send({ error: 'Acceso no permitido desde esta dirección IP.' })
        : reply.type('text/html; charset=utf-8').header('content-security-policy', CSP_ADMIN).send(forbiddenPage());
    }
  });
}

/**
 * Registra /healthz, /admin y el sitio. `ctx` aporta `db` y `getSetting`. Devuelve `{ currentBase, siteExists }`.
 * Opciones: `webDist` (carpeta de la SPA), `adminEnabled`.
 */
export async function registerFrontend(app, ctx, { webDist, adminEnabled = true, healthTimeoutMs = 2000 } = {}) {
  const adminPath = ctx.config?.adminPath || '/admin';
  const hidden = ctx.config?.hideAdmin === true;
  // reply.sendFile(rel, root): ETag, Last-Modified, 304, Range y protección de rutas del módulo `send`.
  fs.mkdirSync(opsPaths().dataSite, { recursive: true });
  await app.register(staticPlugin, { root: opsPaths().dataSite, serve: false, decorateReply: true });

  // Cabeceras de seguridad en todas las respuestas (como `add_header … always`).
  app.addHook('onSend', async (request, reply, payload) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!reply.hasHeader(k)) reply.header(k, v);
    const p = requestPath(request.url) ?? '/';
    const route = request.routeOptions?.url || '';
    // El 404 genérico del modo oculto se trata como cualquier respuesta pública (mismas cabeceras).
    const pub = request.portalPublic404 === true;
    const api = !pub && (isApiPath(p) || route === '/api' || route.startsWith('/api/'));
    const admin = !pub && !api && isAdminPath(p);
    if (api || admin) {
      for (const [k, v] of Object.entries(PANEL_HEADERS)) reply.header(k, v);
      reply.header('x-robots-tag', PANEL_ROBOTS);
      reply.header('cache-control', api && /\bprivate\b/.test(String(reply.getHeader('cache-control') || '')) ? reply.getHeader('cache-control') : 'no-store');
    }
    if (api) {
      // Nada de la API se guarda en cachés (solo las imágenes del panel admiten caché privada con revalidación).
      reply.header('content-security-policy', CSP_API);
      reply.header('cross-origin-resource-policy', 'same-origin');
    } else if (admin) {
      if (!reply.hasHeader('content-security-policy')) reply.header('content-security-policy', CSP_ADMIN);
    }
    if (!reply.hasHeader('content-security-policy')) reply.header('content-security-policy', CSP_SITE);
    if (request.protocol === 'https' && !reply.hasHeader('strict-transport-security')) reply.header('strict-transport-security', HSTS);
    return payload;
  });

  // ── Base y existencia del sitio, con caché breve (sin consultas por petición) ──
  let settingBase = await getSiteBase(ctx).catch(() => DEFAULT_BASE);
  let settingAt = Date.now();
  let cache = { at: 0, exists: false, base: settingBase };
  const TTL = 1000;
  async function state() {
    const now = Date.now();
    if (now - settingAt > 10_000) {
      settingAt = now;
      getSiteBase(ctx)
        .then(b => (settingBase = b))
        .catch(() => {});
    }
    if (now - cache.at < TTL) return cache;
    const { dataSite, siteMeta } = opsPaths();
    const exists = !!(await fileStat(path.join(dataSite, 'index.html')));
    let base = settingBase;
    if (exists) {
      try {
        const m = JSON.parse(await fsp.readFile(siteMeta, 'utf8'));
        if (m?.base && !siteBaseError(m.base)) base = m.base;
      } catch {}
    }
    cache = { at: now, exists, base, root: dataSite };
    return cache;
  }
  const refresh = () => {
    cache.at = 0;
    settingAt = 0;
  };

  // ── /sitemap.xml y /robots.txt (públicos; rutas más específicas que la comodín) ──
  registerSeoRoutes(app, ctx, { currentBase: async () => (await state()).base, hideAdmin: hidden });

  // ── /healthz ──
  app.get('/healthz', async (request, reply) => {
    let db = false;
    let timer;
    try {
      await Promise.race([
        ctx.db.query('SELECT 1'),
        new Promise((_, ko) => {
          timer = setTimeout(() => ko(new Error('timeout')), healthTimeoutMs);
        }),
      ]);
      db = true;
    } catch {
      db = false;
    } finally {
      clearTimeout(timer);
    }
    const site = (await state()).exists;
    reply.header('cache-control', 'no-store');
    return reply.code(db ? 200 : 503).send({ ok: db, db, site });
  });

  // ── /admin (SPA) ──
  const webIndex = () => path.join(webDist, 'index.html');
  async function sendAdmin(request, reply, p) {
    if (!adminEnabled) return reply.code(503).type('text/html; charset=utf-8').send(disabledPage());
    if (!(await fileStat(webIndex()))) return reply.code(503).header('cache-control', 'no-store').type('text/html; charset=utf-8').send(noPanelPage());
    const rel = safeRelPath(p.slice('/admin'.length));
    if (rel === null) return reply.code(404).type('text/html; charset=utf-8').header('cache-control', 'no-store').send(notFoundPage());
    const file = rel && !rel.endsWith('/') ? rel : null;
    if (file && (await fileStat(path.join(webDist, ...file.split('/'))))) {
      reply.header('cache-control', cacheControlFor(file, { hashedDirs: ['assets/'] }));
      return reply.sendFile(file, webDist, { cacheControl: false, dotfiles: 'deny' });
    }
    // Un archivo con extensión que no existe es un 404 (no la SPA): evita servir HTML como JS/CSS.
    if (file && path.posix.extname(file)) return reply.code(404).type('text/html; charset=utf-8').header('cache-control', 'no-store').send(notFoundPage());
    // <base href> con la ruta real del panel (el panel se compila con base './' y calcula la API desde document.baseURI).
    const { html, csp } = await adminIndex();
    return reply.header('cache-control', 'no-store').header('content-security-policy', csp).type('text/html; charset=utf-8').send(html);
  }
  // CSP del index.html del panel con las huellas de sus scripts en línea (se recalcula si el archivo cambia).
  let idxCache = { mtime: -1, html: '', csp: CSP_ADMIN };
  async function adminIndex() {
    const st = await fsp.stat(webIndex());
    if (st.mtimeMs !== idxCache.mtime) {
      const raw = await fsp.readFile(webIndex(), 'utf8');
      idxCache = { mtime: st.mtimeMs, html: injectBase(raw, adminPath + '/'), csp: adminCspFor(raw) };
    }
    return idxCache;
  }

  // ── Sitio ──
  async function sendSite(request, reply, p) {
    const st = await state();
    const base = st.base;
    if (!st.exists) {
      return reply
        .code(503)
        .header('retry-after', '30')
        .header('x-robots-tag', 'noindex, nofollow')
        .header('cache-control', 'no-store')
        .type('text/html; charset=utf-8')
        .send(preparingPage({ adminLink: adminEnabled && !hidden }));
    }
    const q = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
    let sub;
    if (base === '/') {
      // Compatibilidad con la base antigua: /manual/* → /*.
      if (/^\/manual(\/|$)/.test(p)) return reply.redirect((p.slice('/manual'.length) || '/') + q, 301);
      sub = p;
    } else {
      const pre = base.replace(/\/$/, '');
      if (p === pre) return reply.redirect(base + q, 301);
      if (!p.startsWith(base)) {
        if (p === '/') return reply.redirect(base + q, 302);
        return notFound(reply, st);
      }
      sub = p.slice(pre.length);
    }
    const rel = safeRelPath(sub);
    if (rel === null) return notFound(reply, st);
    const file = await resolveSiteFile(st.root, rel);
    if (!file) return notFound(reply, st);
    reply.header('cache-control', cacheControlFor(file));
    return reply.sendFile(file, st.root, { cacheControl: false, dotfiles: 'deny' });
  }

  async function notFound(reply, st) {
    const p404 = path.join(st.root, '404.html');
    let body;
    try {
      body = await fsp.readFile(p404);
    } catch {
      body = notFoundPage();
    }
    return reply.code(404).type('text/html; charset=utf-8').header('cache-control', CACHE_HTML).send(body);
  }

  // Ruta comodín: lo que no es /api ni /healthz. Las rutas de la API, más específicas, tienen prioridad.
  app.route({
    method: ['GET', 'HEAD'],
    url: '/*',
    handler: async (request, reply) => {
      const p = requestPath(request.url);
      if (p === null) return reply.code(400).type('text/html; charset=utf-8').send(notFoundPage());
      if (isApiPath(p)) return reply.code(404).send({ error: 'No encontrado.' });
      if (/^\/admin$/i.test(p)) {
        const q = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
        return reply.redirect(adminPath + '/' + q, 301);
      }
      if (isAdminPath(p)) return sendAdmin(request, reply, p);
      return sendSite(request, reply, p);
    },
  });

  // 404 genérico: el mismo que recibe cualquier ruta inexistente del manual (modo oculto del panel).
  app.genericNotFound = (request, reply) => {
    request.portalPublic404 = true;
    if (['GET', 'HEAD'].includes(request.method)) return sendSite(request, reply, HIDDEN_404_URL);
    return reply.code(404).send({ error: 'No encontrado.' });
  };

  app.setNotFoundHandler((request, reply) => {
    const p = requestPath(request.url) ?? '/';
    if (isApiPath(p) || !['GET', 'HEAD'].includes(request.method)) return reply.code(404).send({ error: 'No encontrado.' });
    return reply.code(404).type('text/html; charset=utf-8').send(notFoundPage());
  });

  return {
    currentBase: () => cache.base ?? settingBase,
    siteExists: async () => (await state()).exists,
    refresh,
  };
}
