// /sitemap.xml y /robots.txt del manual público. Públicos (sin sesión; no dependen de PORTAL_ADMIN_ENABLED).
//  - sitemap.xml: páginas PUBLICADAS de la BD (sin borradores ni eliminadas ni `noindex`), `lastmod` = updated_at.
//    URLs limpias (sin ".html"; las portadas de carpeta con "/" final, como el canonical que emite el tema).
//  - robots.txt: permite todo el manual, veta /admin/ y /api/ y apunta al sitemap.
// URL absoluta: PORTAL_PUBLIC_URL; si no está definida, el host efectivo de la petición (request.protocol/host de
// Fastify, que solo leen X-Forwarded-* cuando PORTAL_TRUST_PROXY confía en quien conecta).

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const HOST_RE = /^(?:[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*|\[[0-9A-Fa-f:.]+\])(?::\d{1,5})?$/;

export const SITEMAP_TTL_MS = 60_000;

/** Origen absoluto sin barra final: PORTAL_PUBLIC_URL o el de la petición. `source`: 'config' | 'request'. */
export function effectiveOrigin(request, config = {}) {
  if (config.publicUrl) return { origin: config.publicUrl, source: 'config' };
  const proto = request.protocol === 'https' ? 'https' : 'http';
  const host = String(request.host || request.hostname || '').split(',')[0].trim();
  return { origin: `${proto}://${HOST_RE.test(host) ? host.toLowerCase() : 'localhost'}`, source: 'request' };
}

/** Ruta de una página (/tareas/x) → ruta pública limpia. `isIndex`: la fuente es carpeta/index.mdx (barra final). */
export function pagePublicPath(route, filePath = '') {
  let r = String(route || '/').replace(/\/+$/, '') || '';
  if (!r) return '/';
  if (/(^|\/)index\.mdx?$/i.test(filePath || '')) r += '/';
  return r;
}

/** Filas de `pages` → entradas `{ loc, lastmod }` (con URL absoluta), sin duplicados y ordenadas por ruta. */
export function sitemapEntries(rows, { origin, base = '/' }) {
  const b = base === '/' ? '' : base.replace(/\/$/, '');
  const seen = new Map();
  for (const r of rows) {
    const fm = r.frontmatter || {};
    if (fm.noindex === true || fm.seo?.noindex === true) continue;
    const loc = origin + b + pagePublicPath(r.route, r.file_path);
    const mod = r.updated_at ? new Date(r.updated_at) : null;
    const lastmod = mod && !Number.isNaN(mod.getTime()) ? mod.toISOString() : null;
    const prev = seen.get(loc);
    if (!prev || (lastmod && (!prev.lastmod || lastmod > prev.lastmod))) seen.set(loc, { loc, lastmod });
  }
  return [...seen.values()].sort((a, b2) => (a.loc < b2.loc ? -1 : a.loc > b2.loc ? 1 : 0));
}

export function sitemapXml(entries) {
  const body = entries.map(e => `  <url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** robots.txt. Con el panel oculto no se nombra ninguna ruta del panel ni de la API (las protege X-Robots-Tag). */
export function robotsTxt(origin, { hideAdmin = false } = {}) {
  const deny = hideAdmin ? [] : ['Disallow: /admin/', 'Disallow: /api/'];
  return ['User-agent: *', 'Allow: /', ...deny, '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
}

/**
 * Registra GET/HEAD /sitemap.xml y /robots.txt. `ctx.db` aporta la BD; `currentBase()` la base con la que se
 * publicó el sitio (frontend.mjs). La lista se guarda en memoria SITEMAP_TTL_MS para no consultar en cada visita.
 */
export function registerSeoRoutes(app, ctx, { currentBase = async () => '/', hideAdmin = false } = {}) {
  let cache = { at: 0, base: null, rows: null };
  async function rows() {
    const base = await currentBase();
    if (cache.rows && cache.base === base && Date.now() - cache.at < SITEMAP_TTL_MS) return cache.rows;
    const r = await ctx.db.query(
      `SELECT route, file_path, frontmatter, updated_at FROM pages WHERE status = 'published' AND deleted_at IS NULL ORDER BY route`,
    );
    cache = { at: Date.now(), base, rows: r.rows };
    return r.rows;
  }
  const config = () => ctx.config || {};

  app.route({
    method: ['GET', 'HEAD'],
    url: '/sitemap.xml',
    handler: async (request, reply) => {
      const { origin } = effectiveOrigin(request, config());
      const base = await currentBase();
      const xml = sitemapXml(sitemapEntries(await rows(), { origin, base }));
      return reply
        .header('cache-control', 'public, max-age=300')
        .header('x-robots-tag', 'noindex')
        .type('application/xml; charset=utf-8')
        .send(xml);
    },
  });
  app.route({
    method: ['GET', 'HEAD'],
    url: '/robots.txt',
    handler: async (request, reply) => {
      const { origin } = effectiveOrigin(request, config());
      // El Sitemap: va a la raíz del dominio público; con PORTAL_PUBLIC_URL con ruta, solo su origen.
      let root = origin;
      try {
        root = new URL(origin).origin;
      } catch {}
      return reply.header('cache-control', 'public, max-age=3600').type('text/plain; charset=utf-8').send(robotsTxt(root, { hideAdmin }));
    },
  });
  return { invalidate: () => (cache = { at: 0, base: null, rows: null }) };
}
