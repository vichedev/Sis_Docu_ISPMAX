// Motor del manual dinámico (SSR): dibuja cada página en el momento de pedirla, desde PostgreSQL, con el tema real
// (compilado una vez por despliegue con `npm run site:build`). Nada se escribe en disco.
//
//   createSiteEngine({ pool, publicUrl, base, log, cacheMb, compiler }) → {
//     renderRoute(pathname)        → { status, html, br, etag, cache, ms }   documento HTML completo (head SEO incluido)
//     pageModule(routePath)        → { code, etag } | null                    módulo ES de la página (navegación cliente)
//     bootScript(hash)             → { code, etag } | null                    datos del sitio (menús, páginas, i18n)
//     searchIndex()                → { json, etag }                           índice del buscador (motor src/search)
//     asset(rel) / tour(slug)      → { body, type, etag } | null              imágenes y tours desde la BD
//     themeAsset(rel) / brandFile(name)                                      recursos del tema compilado e iconos
//     ensureFresh(), invalidate({ routes }), clear(), warm({ all }), setBase(b), stats(), close()
//   }
//
// Caché en memoria (LRU con límite de bytes, `cacheMb`), invalidada por una firma barata de la BD (una consulta,
// < 1 ms, compartida entre peticiones simultáneas y como mucho cada SIG_TTL_MS; `invalidate()` la fuerza al momento):
//   · módulo compilado por página: clave = id:version:updated_at (o hash del texto en las portadas generadas);
//   · HTML por ruta: clave = estructura (menús, títulos, marca, base) + contenido de la página. Un cambio de cuerpo
//     solo invalida esa página; uno de título, grupo, orden, estado, menú o marca invalida el HTML de todas (no su
//     módulo compilado: repintar cuesta ~10 ms por página).
// Seguridad del contenido: safety.mjs (lista de permitidos en el AST, compilación aislada, verificación del código
// compilado y evaluación en un contexto vm).
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform as esbuildTransform } from 'esbuild';
import { renderPage as renderPageSource, effectiveFrontmatter } from '../server/sync/parse.mjs';
import { tourJson, mergeRedirects } from '../server/sync/export.mjs';
import { pagePublicPath } from '../server/http/seo.mjs';
import { mdxSecurityProblems } from '../server/routes/mdxSafety.mjs';
import { applyBranding } from '../server/ops/branding.mjs';
import { toBrowserModule } from './mdx.mjs';
import { assertSafeCompiledCode, evaluateIsolated } from './safety.mjs';
import { createCompiler } from './compiler.mjs';
import { buildNav, navToSidebar, hubSource, HUBS } from './nav.mjs';
import { loadRspressConfig, buildSiteData, REPO } from './config.mjs';
import { buildSearchIndex } from './search.mjs';

import { themeStatus, CLIENT_DIST, SSR_ENTRY, MANIFEST } from './theme.mjs';

export { themeStatus, SITE_DIST } from './theme.mjs';
const BRAND_DIR = path.join(REPO, 'theme', 'seo', 'brand');
const hash = s => crypto.createHash('sha256').update(s).digest('base64url').slice(0, 16);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const SIG_TTL_MS = 250;
/** Ruta con la que se pinta el 404 (fija: el cuerpo es el mismo para cualquier dirección inexistente). */
const NOT_FOUND_PATH = '/404';
const FAIL_RETRY_MS = 60_000;

export const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Falta el tema compilado (npm run site:build). */
export class ThemeMissingError extends Error {
  constructor(detail) {
    super(`Falta el tema compilado del manual (${detail}). Compílelo con «npm run site:build» en la carpeta portal (en Docker lo hace el arranque del contenedor).`);
    this.code = 'ISP_THEME_MISSING';
  }
}

// Mismo script que Rspress pone en el <head> para aplicar el modo oscuro antes de pintar (sin parpadeo).
const DARK_SCRIPT =
  "{;const saved = localStorage.getItem('rspress-theme-appearance');const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;const defaultTheme = 'auto';const theme = saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : defaultTheme;const isDark = theme === 'auto' ? preferDark : theme === 'dark';document.documentElement.classList.toggle('dark', isDark);document.documentElement.classList.toggle('rp-dark', isDark);document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';}";

const BRAND_KEYS = ['site_title', 'contact_whatsapp'];
const SIG_SQL = `SELECT
  (SELECT count(*) || ':' || coalesce(max(updated_at)::text, '') || ':' || coalesce(sum(version), 0) FROM pages WHERE deleted_at IS NULL AND status = 'published')
  || '|' || (SELECT count(*) || ':' || coalesce(max(updated_at)::text, '') FROM pages)
  || '|' || (SELECT count(*) || ':' || coalesce(max(updated_at)::text, '') FROM site_files)
  || '|' || (SELECT count(*) || ':' || coalesce(max(created_at)::text, '') FROM redirects)
  || '|' || (SELECT coalesce(string_agg(key || '=' || value::text, ',' ORDER BY key), '') FROM settings WHERE key = ANY('{site_title,contact_whatsapp}'::text[])) AS sig`;

const PAGES_SQL = `SELECT p.id, p.route, p.file_path, p.seccion, p.title, p.description, p.grupo, p.orden, p.frontmatter, p.fm_raw,
  p.version, p.updated_at, pp.route AS parent_route
  FROM pages p LEFT JOIN pages pp ON pp.id = p.parent_id
  WHERE p.deleted_at IS NULL AND p.status = 'published' ORDER BY p.file_path`;

/** LRU con límite de bytes (Map en orden de uso). */
export class ByteLRU {
  constructor(maxBytes) {
    this.max = maxBytes;
    this.map = new Map();
    this.bytes = 0;
    this.evictions = 0;
  }
  get(k) {
    const e = this.map.get(k);
    if (!e) return undefined;
    this.map.delete(k);
    this.map.set(k, e);
    return e.v;
  }
  peek(k) {
    return this.map.get(k)?.v;
  }
  set(k, v, bytes) {
    this.delete(k);
    this.map.set(k, { v, bytes });
    this.bytes += bytes;
    for (const [key, e] of this.map) {
      if (this.bytes <= this.max || this.map.size <= 1) break;
      if (key === k) continue;
      this.map.delete(key);
      this.bytes -= e.bytes;
      this.evictions++;
    }
  }
  delete(k) {
    const e = this.map.get(k);
    if (!e) return false;
    this.map.delete(k);
    this.bytes -= e.bytes;
    return true;
  }
  deleteWhere(fn) {
    let n = 0;
    for (const k of [...this.map.keys()]) if (fn(k) && this.delete(k)) n++;
    return n;
  }
  count(prefix) {
    let n = 0;
    let b = 0;
    for (const [k, e] of this.map) {
      if (k.startsWith(prefix)) {
        n++;
        b += e.bytes;
      }
    }
    return { n, bytes: b };
  }
  clear() {
    const n = this.map.size;
    this.map.clear();
    this.bytes = 0;
    return n;
  }
}

export async function createSiteEngine({
  pool,
  publicUrl = '',
  base = '/',
  log = () => {},
  cacheMb = Number(process.env.PORTAL_SITE_CACHE_MB) || 256,
  compiler: compilerOpt = null,
} = {}) {
  const theme = themeStatus();
  if (!theme.ok) throw new ThemeMissingError(`no existe ${theme.missing.join(', ')}`);
  let ssr;
  let manifest;
  try {
    ssr = await import(pathToFileURL(SSR_ENTRY).href);
    manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch (e) {
    throw new ThemeMissingError(`no se pudo cargar: ${e.message}`);
  }
  const entry = Object.values(manifest).find(m => m.isEntry);
  if (!entry) throw new ThemeMissingError('el manifiesto no tiene entrada');
  const rawConfig = await loadRspressConfig({ publicUrl });
  const compiler = compilerOpt ?? createCompiler({ log });
  let siteBase = base;

  const st = {
    sig: null,
    checkedAt: 0,
    dirty: true,
    sigPromise: null,
    structure: null, // { hash, site, bootCode, pagesByRoute, config, configHead, brand }
    cache: new ByteLRU(Math.max(16, cacheMb) * 1048576), // 'c:<contentKey>' → módulo compilado · 'h:<ruta>' → HTML
    search: null, // { key, json, etag }
    hits: new Map(), // ruta → visitas (para calentar las más visitadas)
    lastChange: null,
    counters: { renders: 0, htmlHits: 0, htmlMisses: 0, compiles: 0, compileMs: 0, renderMs: 0, compileFailures: 0, unsafe: 0, shared: 0 },
  };
  const inflight = new Map(); // compilaciones en curso (contentKey → promesa): una sola por página
  const renders = new Map(); // pintados en curso (clave HTML → promesa): avalancha de peticiones = un solo pintado

  /** Firma de la BD (compartida entre peticiones simultáneas; como mucho cada SIG_TTL_MS salvo invalidate()). */
  async function ensureFresh({ force = false } = {}) {
    if (!force && !st.dirty && st.structure && Date.now() - st.checkedAt < SIG_TTL_MS) return false;
    // Una comprobación en curso se comparte; si se invalidó DESPUÉS de empezar (dirty), se encadena otra.
    if (st.sigPromise) return st.dirty || force ? st.sigPromise.then(() => ensureFresh({ force })) : st.sigPromise;
    st.sigPromise = (async () => {
      st.dirty = false;
      const { rows } = await pool.query(SIG_SQL);
      const sig = `${rows[0].sig}|${siteBase}`;
      st.checkedAt = Date.now();
      if (sig === st.sig && st.structure) return false;
      await rebuildStructure();
      st.sig = sig;
      return true;
    })().finally(() => {
      st.sigPromise = null;
    });
    return st.sigPromise;
  }

  async function rebuildStructure() {
    const t0 = performance.now();
    const [pages, files, redirects, brandRows] = await Promise.all([
      pool.query(PAGES_SQL),
      pool.query(`SELECT path, content FROM site_files WHERE path IN ('docs/sidebar.json', 'src/legacy-routes.json')`),
      pool.query('SELECT from_route, to_route FROM redirects ORDER BY from_route'),
      pool.query('SELECT key, value FROM settings WHERE key = ANY($1::text[])', [BRAND_KEYS]),
    ]);
    const brandOf = k => {
      const v = brandRows.rows.find(r => r.key === k)?.value;
      return typeof v === 'string' ? v.trim() : '';
    };
    const brand = { title: brandOf('site_title'), whatsapp: brandOf('contact_whatsapp') };
    const config = applyBranding(rawConfig, brand);
    const configHead = (config.head ?? []).map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}>`).join('');
    const file = p => files.rows.find(f => f.path === p)?.content ?? null;
    const lite = pages.rows.map(r => {
      const fm = effectiveFrontmatter(r);
      return { row: r, route: r.route, file: `docs/${r.file_path}`, fm, title: fm.title };
    });
    const nav = buildNav(lite, file('docs/sidebar.json'));
    const sidebar = navToSidebar(nav);
    const siteData = await buildSiteData(config, { sidebar, base: siteBase });
    let legacyRoutes = {};
    try {
      legacyRoutes = JSON.parse(mergeRedirects(file('src/legacy-routes.json') ?? '{}', redirects.rows));
    } catch {
      /* sin redirecciones */
    }
    // Lista de páginas (usePages) y clave de contenido de cada una. Las portadas de sección se generan del menú.
    const pagesByRoute = new Map();
    for (const p of lite) {
      const r = p.row;
      const sec = r.route.slice(1);
      const generated = r.route.split('/').length === 2 && HUBS[sec] && /(^|\/)index\.mdx$/.test(r.file_path);
      const source = generated ? hubSource(sec, nav, lite) : null;
      const contentKey = generated ? `hub:${sec}:${hash(source)}` : `${r.id}:${r.version}:${new Date(r.updated_at).toISOString()}`;
      const routePath = pagePublicPath(r.route, r.file_path);
      const fm = generated ? { title: HUBS[sec][0], description: HUBS[sec][1], modulo: 'general', tipo: 'indice', generado: true } : p.fm;
      pagesByRoute.set(routePath, {
        id: r.id,
        routePath,
        route: r.route,
        filePath: r.file_path,
        title: String(fm.title ?? r.title ?? ''),
        contentKey,
        source,
        generated: !!generated,
        entry: {
          routePath,
          title: String(fm.title ?? ''),
          // Sin versión en la URL del módulo (ver más abajo): constante.
          v: '0',
          lang: config.lang || 'es',
          _relativePath: r.file_path,
          // Solo lo que usa el tema de la lista de páginas (portada: estado; resto: ruta y título).
          frontmatter: { ...(fm.estado ? { estado: fm.estado } : {}), ...(fm.pageType ? { pageType: fm.pageType } : {}) },
        },
      });
    }
    const site = { ...siteData, pages: [...pagesByRoute.values()].map(p => p.entry), pagePrefix: '/_site/p', legacyRoutes, searchIndex: '/_site/search.json' };
    // La versión de cada página NO va en los datos del sitio (si fuera, cualquier edición invalidaría todo):
    // los módulos de página se sirven sin versión en la URL, con `no-cache` + ETag.
    const bootJson = JSON.stringify(site);
    const structHash = hash(bootJson);
    const structureChanged = structHash !== st.structure?.hash;
    // __ISP_ASSET_BASE__: base de los recursos del tema para las URL que el cliente calcula en JS (vite.config.mjs).
    const bootCode = `window.__ISP_ASSET_BASE__=${JSON.stringify(`${siteBase}_site/`)};window.__ISP_SITE__=${bootJson.replace(/</g, '\\u003c')};\n`;
    st.structure = { hash: structHash, site, bootCode, pagesByRoute, config, configHead, brand };
    if (structureChanged) st.cache.deleteWhere(k => k.startsWith('h:'));
    // Módulos de páginas que ya no existen (o versiones anteriores): fuera.
    const live = new Set([...pagesByRoute.values()].map(p => `c:${p.contentKey}`));
    st.cache.deleteWhere(k => k.startsWith('c:') && !live.has(k));
    log(`[site] estructura ${structureChanged ? 'nueva' : 'igual'} (${pagesByRoute.size} páginas) en ${Math.round(performance.now() - t0)} ms`);
  }

  /** Texto .mdx de la página (desde la BD). Defensa en profundidad: lo que no pasa mdxSafety se sustituye por un aviso. */
  async function sourceOf(p) {
    if (p.source != null) return { source: p.source };
    const { rows } = await pool.query('SELECT p.*, pp.route AS parent_route FROM pages p LEFT JOIN pages pp ON pp.id = p.parent_id WHERE p.id = $1', [p.id]);
    const row = rows[0];
    if (!row) return { source: placeholderSource(p.title, 'Esta página ya no existe.'), failed: 'gone' };
    // El portal ya rechaza al guardar lo que no es seguro, pero una fila editada por SQL o importada no pasa por ahí.
    const problems = mdxSecurityProblems({ body: row.body, frontmatter: row.frontmatter });
    if (problems.length) {
      st.counters.unsafe++;
      log(`[site] ${p.route}: contenido no permitido (${problems.length} problemas); se muestra un aviso en su lugar.`);
      return { source: placeholderSource(row.title), failed: 'unsafe' };
    }
    return { source: renderPageSource(row) };
  }

  function placeholderSource(title, text = 'Esta página tiene contenido no permitido o con errores y no se muestra. Corríjala desde el panel.') {
    const t = String(title || 'Página').replace(/[\u0000-\u001f]/g, ' ').slice(0, 200);
    const h = t.replace(/[<>{}\\`*_#[\]|!:~^$&]/g, '').trim() || 'Página';
    return `---\ntitle: ${JSON.stringify(t)}\n---\n\n# ${h}\n\n:::danger\n${text}\n:::\n`;
  }

  async function compileSafe(source, filePath) {
    const r = await compiler.compile(source, filePath);
    // Capa 4: el código que vuelve del compilador se verifica aquí, en el proceso que lo va a evaluar.
    assertSafeCompiledCode(r.code);
    const Component = evaluateIsolated(r.code, ssr.mdxRuntime);
    const module = (await esbuildTransform(toBrowserModule(r.code, r.pageMeta), { minify: true, format: 'esm', target: 'es2022' })).code;
    return { pageMeta: r.pageMeta, Component, module, ms: r.ms, codeBytes: Buffer.byteLength(r.code) };
  }

  async function compiledOf(p) {
    const k = `c:${p.contentKey}`;
    const c0 = st.cache.get(k);
    if (c0 && !(c0.failed === 'timeout' && Date.now() - c0.at > FAIL_RETRY_MS)) return c0;
    let job = inflight.get(p.contentKey);
    if (job) st.counters.shared++;
    else {
      job = compileNow(p).finally(() => inflight.delete(p.contentKey));
      inflight.set(p.contentKey, job);
    }
    return job;
  }

  async function compileNow(p) {
    const t0 = performance.now();
    let source;
    let failed;
    try {
      ({ source, failed } = await sourceOf(p));
    } catch (e) {
      // Fila ilegible (frontmatter roto…): aviso en su lugar.
      log(`[site] ${p.route}: no se pudo leer (${String(e.message).slice(0, 200)}).`);
      source = placeholderSource(p.title);
      failed = 'error';
    }
    let c;
    try {
      c = await compileSafe(source, p.filePath);
    } catch (e) {
      // Contenido que no compila o no pasa la seguridad: esa página muestra un aviso; el resto del sitio sigue igual.
      st.counters.compileFailures++;
      failed = e.code === 'ISP_COMPILE_TIMEOUT' ? 'timeout' : e.code === 'ISP_CONTENT_UNSAFE' ? 'unsafe' : 'error';
      if (failed === 'unsafe') st.counters.unsafe++;
      log(`[site] ${p.route}: no se pudo compilar (${failed}: ${String(e.message).slice(0, 300)}); se muestra un aviso en su lugar.`);
      c = await compileSafe(placeholderSource(p.title), p.filePath);
    }
    const ms = performance.now() - t0;
    const rec = { ...c, failed: failed ?? null, at: Date.now(), moduleEtag: `"m-${hash(c.module)}"` };
    // Tamaño estimado: el código evaluado ocupa en el montón ~2 veces su texto (fuente + bytecode), más el módulo del
    // navegador (medido con las 285 páginas: ver portal/site/SPIKE.md e informe de la integración).
    st.cache.set(`c:${p.contentKey}`, rec, 2 * c.codeBytes + Buffer.byteLength(c.module) + 2048);
    st.counters.compiles++;
    st.counters.compileMs += ms;
    // Se descartan las versiones anteriores de la misma página.
    st.cache.deleteWhere(k => k !== `c:${p.contentKey}` && k.startsWith(`c:${p.id}:`));
    return rec;
  }

  function template({ appHtml, routePath, notFound }) {
    const { config, configHead, pagesByRoute } = st.structure;
    const p = pagesByRoute.get(routePath);
    const assetUrl = f => `${siteBase}_site/${f}`;
    const entryJs = assetUrl(entry.file);
    const entryCss = (entry.css ?? []).map(assetUrl);
    const entryImports = (entry.imports ?? []).map(k => assetUrl(manifest[k].file));
    const pageModule = !notFound && p ? `<link rel="modulepreload" href="${esc(siteBase + ssr.pageModuleUrl(p.entry).slice(1))}">` : '';
    return `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(config.title)}</title>
<script>${DARK_SCRIPT}</script>
${entryCss.map(h => `<link href="${esc(h)}" rel="stylesheet">`).join('\n')}
<link rel="modulepreload" href="${esc(entryJs)}">
${entryImports.map(h => `<link rel="modulepreload" href="${esc(h)}">`).join('\n')}
${pageModule}
${configHead}
</head>
  <body>
    <div id="__rspress_root">${appHtml}</div>
    <div id="__rspress_modal_container"></div>
    <script src="${esc(`${siteBase}_site/boot.${st.structure.hash}.js`)}"></script>
    <script type="module" src="${esc(entryJs)}"></script>
  </body>
</html>
`;
  }

  const view = (rec, html) => ({
    etag: rec.etag,
    br: rec.br,
    get html() {
      return html ?? zlib.brotliDecompressSync(rec.br).toString('utf8');
    },
  });

  /** Ruta pedida (sin la base) → ruta de una página publicada o null. */
  function resolveRoute(pathname) {
    const { pagesByRoute } = st.structure;
    let routePath;
    try {
      routePath = decodeURIComponent(pathname);
    } catch {
      return null;
    }
    routePath = routePath.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
    if (routePath !== '/' && !pagesByRoute.has(routePath)) {
      if (pagesByRoute.has(routePath + '/')) routePath += '/';
      else if (routePath.endsWith('/') && pagesByRoute.has(routePath.slice(0, -1))) routePath = routePath.slice(0, -1);
    }
    return pagesByRoute.has(routePath) ? routePath : null;
  }

  /** Documento de una ruta (o el 404 si no es una página publicada; `notFound: true` lo pide directamente). */
  async function renderRoute(pathname, { notFound = false } = {}) {
    const t0 = performance.now();
    await ensureFresh();
    const routePath = notFound ? null : resolveRoute(pathname);
    const p = routePath ? st.structure.pagesByRoute.get(routePath) : null;
    const structHash = st.structure.hash;
    const key = p ? `${structHash}|${p.contentKey}` : `${structHash}|404`;
    const cacheKey = `h:${p ? routePath : NOT_FOUND_PATH}`;
    if (p) st.hits.set(routePath, (st.hits.get(routePath) ?? 0) + 1);
    if (st.hits.size > 5000) st.hits.clear();
    const hit = st.cache.get(cacheKey);
    if (hit && hit.key === key) {
      st.counters.htmlHits++;
      return { status: p ? 200 : 404, ...view(hit), ms: performance.now() - t0, cache: 'hit' };
    }
    st.counters.htmlMisses++;
    let job = renders.get(key);
    if (job) st.counters.shared++;
    else {
      job = paint(p, routePath, cacheKey).finally(() => renders.delete(key));
      renders.set(key, job);
    }
    const r = await job;
    return { status: p ? 200 : 404, ...r, ms: performance.now() - t0, cache: 'miss' };
  }

  async function paint(p, routePath, cacheKey) {
    // Primero lo asíncrono (compilar); después, sin esperas intermedias, el pintado: el estado global del bundle SSR
    // (datos del sitio, página registrada) no puede mezclarse con el de otro pintado simultáneo.
    const c = p ? await compiledOf(p) : null;
    // Si la estructura cambió mientras se compilaba, se pinta con la nueva (y se guarda con su clave).
    const structure = st.structure;
    const tr = performance.now();
    ssr.__setSiteData(structure.site);
    ssr.__clearPages();
    let pageData;
    if (p) {
      ssr.__registerPage(p.entry, { default: c.Component, meta: c.pageMeta });
      pageData = ssr.buildPageData(p.entry, c.pageMeta);
    } else pageData = ssr.notFoundPageData();
    const { appHtml, head } = ssr.renderApp(p ? routePath : NOT_FOUND_PATH, pageData);
    let html = await ssr.renderDocument(template({ appHtml, routePath, notFound: !p }), head);
    // El bundle SSR se compila con /_site/ (p. ej. la precarga de fuentes): con otra base del sitio, se antepone.
    if (siteBase !== '/') html = html.replaceAll('="/_site/', `="${siteBase}_site/`);
    const renderMs = performance.now() - tr;
    // En caché se guarda comprimido (brotli 5): unas 8 veces menos memoria y nada que comprimir por petición.
    const rec = { key: `${structure.hash}|${p ? p.contentKey : '404'}`, etag: `"h-${hash(html)}"`, br: zlib.brotliCompressSync(html, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }) };
    st.cache.set(cacheKey, rec, rec.br.length + 512);
    st.counters.renders++;
    st.counters.renderMs += renderMs;
    return view(rec, html);
  }

  async function pageModule(routePath) {
    await ensureFresh();
    const r = resolveRoute(routePath);
    if (!r) return null;
    const c = await compiledOf(st.structure.pagesByRoute.get(r));
    return { code: c.module, etag: c.moduleEtag };
  }

  function bootScript(h) {
    if (!st.structure || h !== st.structure.hash) return null;
    return { code: st.structure.bootCode, etag: `"b-${h}"` };
  }

  async function searchIndex() {
    await ensureFresh();
    const key = st.sig;
    if (st.search?.key === key) return st.search;
    const t0 = performance.now();
    const { rows } = await pool.query(`SELECT p.*, pp.route AS parent_route FROM pages p LEFT JOIN pages pp ON pp.id = p.parent_id
      WHERE p.deleted_at IS NULL AND p.status = 'published'`);
    const byId = new Map([...st.structure.pagesByRoute.values()].map(p => [p.id, p]));
    const docs = rows.map(r => ({ route: r.route, source: byId.get(r.id)?.source ?? renderPageSource(r) }));
    const json = JSON.stringify(buildSearchIndex(docs));
    st.search = { key, json, etag: `"s-${hash(json)}"`, ms: performance.now() - t0 };
    log(`[site] índice del buscador: ${(json.length / 1024).toFixed(0)} KB en ${Math.round(st.search.ms)} ms`);
    return st.search;
  }

  async function asset(rel) {
    const { rows } = await pool.query('SELECT mime, bytes, updated_at, size FROM assets WHERE path = $1', [rel]);
    if (rows[0]) return { body: rows[0].bytes, type: rows[0].mime, etag: `"a-${hash(rel + new Date(rows[0].updated_at).toISOString() + rows[0].size)}"` };
    // Logotipos que siguen en el repo (assets/logo/) si no están en la BD.
    if (/^logo\/[\w.-]+\.(png|svg|webp)$/.test(rel)) {
      const abs = path.join(REPO, 'assets', ...rel.split('/'));
      if (fs.existsSync(abs)) {
        const body = fs.readFileSync(abs);
        return { body, type: MIME[path.extname(abs)] ?? 'application/octet-stream', etag: `"r-${hash(body)}"` };
      }
    }
    return null;
  }

  async function tour(slug) {
    const [t, dims] = await Promise.all([
      pool.query("SELECT slug, title, description, steps, updated_at FROM tours WHERE slug = $1 AND deleted_at IS NULL AND status = 'published'", [slug]),
      pool.query('SELECT path, width, height FROM assets WHERE width IS NOT NULL AND height IS NOT NULL'),
    ]);
    if (!t.rows[0]) return null;
    const body = tourJson(t.rows[0], new Map(dims.rows.map(d => [d.path, d])));
    return { body, type: 'application/json; charset=utf-8', etag: `"t-${hash(body)}"` };
  }

  // Recursos del tema compilado (dist/client/assets: nombres con hash, inmutables) e iconos de theme/seo/brand.
  const themeFiles = new Map();
  for (const f of fs.readdirSync(path.join(CLIENT_DIST, 'assets'))) themeFiles.set(f, null);
  function themeAsset(name) {
    if (!themeFiles.has(name)) return null;
    let body = themeFiles.get(name);
    if (!body) themeFiles.set(name, (body = fs.readFileSync(path.join(CLIENT_DIST, 'assets', name))));
    return { body, type: MIME[path.extname(name)] ?? 'application/octet-stream', etag: `"t-${hash(body)}"` };
  }
  const brandNames = new Set(fs.existsSync(BRAND_DIR) ? fs.readdirSync(BRAND_DIR) : []);
  const brandCache = new Map();
  function brandFile(name) {
    if (!brandNames.has(name)) return null;
    let r = brandCache.get(name);
    if (!r) {
      const body = fs.readFileSync(path.join(BRAND_DIR, name));
      brandCache.set(name, (r = { body, type: MIME[path.extname(name)] ?? 'application/octet-stream', etag: `"i-${hash(body)}"` }));
    }
    return r;
  }

  // ── Invalidación y calentamiento ──
  let warmQueue = new Set();
  let warming = null;
  /** Un guardado: la próxima petición vuelve a mirar la BD, y se compilan/pintan en segundo plano las rutas tocadas. */
  function invalidate({ routes = [], reason = null } = {}) {
    st.dirty = true;
    st.lastChange = { route: routes[0] ?? null, at: new Date().toISOString(), ...(reason ? { reason: String(reason).slice(0, 200) } : {}) };
    for (const r of routes) if (r) warmQueue.add(r);
    scheduleWarm(150);
  }
  let warmTimer = null;
  let closed = false;
  function scheduleWarm(ms) {
    if (closed) return;
    clearTimeout(warmTimer);
    warmTimer = setTimeout(() => {
      warmTimer = null;
      runWarm().catch(e => log(`[site] calentamiento: ${e.message}`));
    }, ms);
    warmTimer.unref?.();
  }
  /** Las más visitadas primero (y la portada y las de sección si aún no hay visitas). */
  function topRoutes(n = 20) {
    const fixed = ['/', ...Object.keys(HUBS).map(s => `/${s}/`), '/guia/inicio'];
    const byHits = [...st.hits.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
    return [...new Set([...byHits.slice(0, n), ...fixed])];
  }
  async function runWarm() {
    if (warming) return warming;
    warming = (async () => {
      await ensureFresh();
      const routes = [...warmQueue, ...topRoutes()];
      warmQueue = new Set();
      for (const r of routes) {
        if (closed) return;
        const rp = resolveRoute(r.replace(/\/+$/, '') || '/') ?? resolveRoute(r);
        if (!rp) continue;
        const p = st.structure.pagesByRoute.get(rp);
        const h = st.cache.peek(`h:${rp}`);
        if (h && h.key === `${st.structure.hash}|${p.contentKey}`) continue;
        await renderRoute(rp);
        await new Promise(res => setImmediate(res)); // cede el bucle entre página y página
      }
    })().finally(() => {
      warming = null;
      if (warmQueue.size && !closed) scheduleWarm(50);
    });
    return warming;
  }
  /** Calienta: las más visitadas (lazy) o todas (all). */
  async function warm({ all = false } = {}) {
    const t0 = performance.now();
    await ensureFresh();
    if (all) for (const r of st.structure.pagesByRoute.keys()) warmQueue.add(r);
    await runWarm();
    return { pages: st.structure.pagesByRoute.size, ms: performance.now() - t0 };
  }
  /** Vacía la caché (módulos, HTML, índice): devuelve cuántas entradas había. */
  function clear() {
    const n = st.cache.clear() + (st.search ? 1 : 0);
    st.search = null;
    st.sig = null;
    st.dirty = true;
    return n;
  }
  function setBase(b) {
    if (b === siteBase) return false;
    siteBase = b;
    st.dirty = true;
    st.sig = null;
    return true;
  }

  const stats = () => {
    const compiled = st.cache.count('c:');
    const html = st.cache.count('h:');
    return {
      pages: st.structure?.pagesByRoute.size ?? 0,
      compiled: compiled.n,
      htmlCached: html.n,
      bytes: st.cache.bytes + (st.search?.json.length ?? 0),
      compiledBytes: compiled.bytes,
      htmlBytes: html.bytes,
      limitBytes: st.cache.max,
      evictions: st.cache.evictions,
      structureHash: st.structure?.hash ?? null,
      lastChange: st.lastChange,
      counters: { ...st.counters, compileMs: Math.round(st.counters.compileMs), renderMs: Math.round(st.counters.renderMs) },
      compiler: compiler.stats(),
      themeBuiltAt: theme.builtAt,
    };
  };

  return {
    renderRoute,
    pageModule,
    bootScript,
    searchIndex,
    asset,
    tour,
    themeAsset,
    brandFile,
    ensureFresh,
    invalidate,
    warm,
    clear,
    setBase,
    stats,
    hasPages: () => (st.structure?.pagesByRoute.size ?? 0) > 0,
    structure: () => st.structure,
    base: () => siteBase,
    themeBuiltAt: theme.builtAt,
    dropHtml: () => st.cache.deleteWhere(k => k.startsWith('h:')),
    close() {
      closed = true;
      clearTimeout(warmTimer);
      compiler.close();
    },
    ssr,
  };
}
