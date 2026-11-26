/**
 * Sustituto de `@rspress/core/runtime` para el manual dinámico (alias de Vite). Misma API que usa el tema
 * (theme/**, src/components/**) y las piezas del tema de serie que se reutilizan (Link, CodeBlock, hooks), pero
 * alimentada por datos que llegan del servidor (BD) en vez de los módulos virtuales que Rspress genera al compilar:
 *
 *   virtual-site-data   → __ISP_SITE__  (título, menú superior, menús laterales, themeConfig, textos i18n)
 *   virtual-page-data   → __ISP_SITE__.pages (lista ligera de páginas: ruta, título, versión)
 *   virtual-routes      → rutas DINÁMICAS: cada página es un módulo /_site/p/<ruta>.js?v=<versión> que se importa al
 *                         navegar (o se registra en el servidor antes de pintar).
 *
 * Las funciones puras se reutilizan de @rspress/shared (las mismas que usa Rspress) y los hooks copian la lógica de
 * @rspress/core/dist/runtime (ver los comentarios); lo único propio es de dónde salen los datos.
 */
import {
  addLeadingSlash,
  addTrailingSlash,
  cleanUrl,
  isDataUrl,
  isExternalUrl,
  isProduction,
  matchSidebar,
  normalizeHref,
  removeBase as sharedRemoveBase,
  removeHash,
  removeTrailingSlash,
  withBase as sharedWithBase,
  withSiteOrigin as sharedWithSiteOrigin,
} from '@rspress/shared';
import { createContext, Fragment, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export * from 'react-router-dom';
export { isDataUrl, isExternalUrl, matchNavbar, matchSidebar, normalizeHref } from '@rspress/shared';
export { Head, useHead } from '@unhead/react';
export { addLeadingSlash, addTrailingSlash, isProduction, removeTrailingSlash };

/* ── Datos del sitio (los fija el arranque: cliente = __ISP_SITE__, servidor = antes de cada render) ──────────── */
export interface PageEntry {
  routePath: string;
  title: string;
  /** Versión del contenido (cambia al guardar): parte de la URL del módulo de la página. */
  v: string;
  lang?: string;
  description?: string;
  frontmatter?: Record<string, unknown>;
  _relativePath?: string;
}
export interface SiteData {
  base: string;
  title: string;
  description: string;
  lang: string;
  logo: string;
  logoText: string;
  icon: string;
  siteOrigin: string;
  route: { cleanUrls: boolean; useTransitions?: boolean; prefetchLink?: boolean };
  markdown: { showLineNumbers: boolean; defaultWrapCode: boolean };
  themeConfig: Record<string, any>;
  i18n: Record<string, string>;
  pages: PageEntry[];
  /** Prefijo de los módulos de página (p. ej. "/_site/p"). */
  pagePrefix: string;
}

let SITE: SiteData = {
  base: '/',
  title: '',
  description: '',
  lang: 'es',
  logo: '',
  logoText: '',
  icon: '',
  siteOrigin: '',
  route: { cleanUrls: true },
  markdown: { showLineNumbers: false, defaultWrapCode: false },
  themeConfig: {},
  i18n: {},
  pages: [],
  pagePrefix: '/_site/p',
};
let ROUTES = new Map<string, PageEntry>();

const normalizeRoutePath = (routePath: string) =>
  cleanUrl(decodeURIComponent(routePath)).replace(/\.html$/, '').replace(/\/index$/, '/').toLowerCase();
const key = (p: string) => {
  const n = normalizeRoutePath(p);
  return n.endsWith('/') ? n : `${n}/`;
};

/** Fija los datos del sitio (y el índice de rutas). Idempotente para el mismo objeto. */
export function __setSiteData(site: SiteData) {
  if (site === SITE) return;
  SITE = site;
  ROUTES = new Map(site.pages.map(p => [key(p.routePath), p]));
  routeCache.clear();
}
export const __getSiteData = () => SITE;

/* ── Módulos de página ────────────────────────────────────────────────────────────────────────────────────── */
export interface PageModule {
  default: (props: Record<string, unknown>) => ReactNode;
  meta: { title: string; headingTitle: string; toc: { id: string; text: string; depth: number }[]; frontmatter: Record<string, unknown> };
}
const LOADED = new Map<string, PageModule>(); // routePath@v → módulo
const LOADING = new Map<string, Promise<PageModule>>();
const modKey = (p: PageEntry) => `${p.routePath}@${p.v}`;

/** Servidor (SSR): registra el módulo ya evaluado de una página antes de pintarla. */
export function __registerPage(entry: PageEntry, mod: PageModule) {
  LOADED.set(modKey(entry), mod);
}
export function __clearPages() {
  LOADED.clear();
}

/** URL del módulo de una página: /_site/p/guia/routers.js?v=… (la portada de sección: /_site/p/tareas/index.js). */
export const pageModuleUrl = (p: PageEntry) =>
  `${SITE.pagePrefix}${p.routePath.endsWith('/') ? `${p.routePath}index` : p.routePath}.js?v=${encodeURIComponent(p.v)}`;

function loadModule(entry: PageEntry): Promise<PageModule> {
  const k = modKey(entry);
  const done = LOADED.get(k);
  if (done) return Promise.resolve(done);
  let p = LOADING.get(k);
  if (!p) {
    if (import.meta.env.SSR) return Promise.reject(new Error(`Página no registrada en el servidor: ${k}`));
    p = import(/* @vite-ignore */ withBase(pageModuleUrl(entry))).then((m: PageModule) => {
      LOADED.set(k, m);
      LOADING.delete(k);
      return m;
    });
    p.catch(() => LOADING.delete(k));
    LOADING.set(k, p);
  }
  return p;
}

interface RouteInfo {
  path: string;
  filePath: string;
  entry: PageEntry;
  preload: () => Promise<PageModule>;
}
const routeCache = new Map<string, RouteInfo>();

/** Equivalente de `pathnameToRouteService` de Rspress (route.js), con la lista de páginas que manda el servidor. */
export function pathnameToRouteService(pathname: string): RouteInfo | undefined {
  const k = key(pathname);
  const hit = routeCache.get(k);
  if (hit && ROUTES.get(k) === hit.entry) return hit;
  const entry = ROUTES.get(k);
  if (!entry) return undefined;
  const info = { path: entry.routePath, filePath: entry._relativePath ?? '', entry, preload: () => loadModule(entry) };
  routeCache.set(k, info);
  return info;
}

/** Igual que `matchPath`/`isActive` de Rspress (route.js). */
function matchPath(pattern: string, pathname: string) {
  const a = normalizeRoutePath(pattern);
  const b = normalizeRoutePath(pathname);
  return (a.endsWith('/') ? a : `${a}/`) === (b.endsWith('/') ? b : `${b}/`) ? { path: pattern } : null;
}
export function isActive(itemLink: string, currentPathname: string) {
  return matchPath(itemLink, currentPathname) !== null;
}
export const preloadLink = (link: string) => {
  if (SITE.route?.prefetchLink === false) return;
  pathnameToRouteService(link)?.preload().catch(() => {});
};

/* ── Datos de página (initPageData.js de Rspress) ────────────────────────────────────────────────────────── */
export function buildPageData(entry: PageEntry, meta: PageModule['meta']) {
  const frontmatter = meta.frontmatter ?? {};
  return {
    pagePath: entry._relativePath ?? '',
    ...entry,
    lang: entry.lang ?? SITE.lang,
    version: '',
    _relativePath: entry._relativePath ?? '',
    description: (frontmatter.description as string | undefined) ?? entry.description,
    pageType: (frontmatter.pageType as string) || 'doc',
    title: meta.title,
    headingTitle: meta.headingTitle,
    frontmatter,
    toc: meta.toc ?? [],
  };
}
export const notFoundPageData = () => ({
  pagePath: '',
  pageType: '404',
  routePath: '/404',
  lang: SITE.lang,
  frontmatter: {},
  title: '404',
  toc: [],
  version: '',
  _filepath: '',
  _relativePath: '',
});

export async function initPageData(routePath: string) {
  const route = pathnameToRouteService(routePath);
  if (route) {
    const mod = await route.preload();
    return buildPageData(route.entry, mod.meta);
  }
  return notFoundPageData();
}

const slots: ({ routePath: string; data: unknown } | undefined)[] = [undefined, undefined, undefined];
export function warmPageData(routePath: string, data: unknown) {
  slots[0] = { routePath, data };
}
export function consumeCachedPageData(routePath: string) {
  if (slots[0]?.routePath === routePath) {
    const data = slots[0].data;
    slots[2] = slots[1];
    slots[1] = slots[0];
    slots[0] = undefined;
    return data;
  }
  if (slots[2]?.routePath === routePath) {
    const data = slots[2].data;
    slots[0] = slots[1];
    slots[1] = slots[2];
    slots[2] = undefined;
    return data;
  }
  return undefined;
}
export function setCurrentPageData(routePath: string, data: unknown) {
  slots[2] = slots[1];
  slots[1] = { routePath, data };
}

/* ── Contextos y hooks (hooks/*.js de Rspress) ───────────────────────────────────────────────────────────── */
export const PageContext = createContext<{ data?: any; setData?: (d: any) => void }>({});
export const ThemeContext = createContext<{ theme?: string; setTheme?: (t: string) => void }>({});

export function usePage() {
  return { page: useContext(PageContext).data };
}
export const useFrontmatter = () => {
  const { page } = usePage();
  return { frontmatter: (page?.frontmatter ?? {}) as Record<string, any> };
};
export const useLang = () => usePage().page?.lang || '';
export const useVersion = () => usePage().page?.version || '';
export const useSite = () => ({ site: SITE as any });
export const usePages = () => ({ pages: SITE.pages as any[] });
export function usePageData() {
  const { page } = usePage();
  return { page, siteData: { ...SITE, pages: SITE.pages } };
}
export function useDark() {
  return useContext(ThemeContext).theme === 'dark';
}
export function useLocaleSiteData() {
  const tc = SITE.themeConfig ?? {};
  return { nav: tc.nav, sidebar: tc.sidebar, title: undefined as string | undefined, description: undefined as string | undefined };
}
export function useNav() {
  const { nav } = useLocaleSiteData();
  return Array.isArray(nav) ? nav : [...(nav?.default ?? [])];
}
export const getSidebarDataGroup = (sidebar: Record<string, any[]>, currentPathname: string) => {
  const names = Object.keys(sidebar).sort((a, b) => b.length - a.length);
  for (const name of names) if (matchSidebar(name, currentPathname)) return sidebar[name];
  return [];
};
export function useSidebar() {
  const { sidebar } = useLocaleSiteData();
  const { pathname } = useLocation();
  const p = decodeURIComponent(pathname);
  return useMemo(() => getSidebarDataGroup(sidebar ?? {}, p), [sidebar, p]);
}
export const useActiveMatcher = () => {
  const { pathname } = useLocation();
  return useCallback((link: string) => isActive(link, decodeURIComponent(pathname)), [pathname]);
};
export function useI18n() {
  return useCallback((k: string, params?: Record<string, string>) => {
    const text = SITE.i18n[k];
    if (typeof text !== 'string') throw new Error(`i18n key "${k}" not found`);
    return text.replace(/\{\{(\w+)\}\}/g, (_, p1) => params?.[p1] ?? `${p1}`);
  }, []);
}
export function useWindowSize(initialWidth?: number, initialHeight?: number) {
  const [size, setSize] = useState({ width: initialWidth ?? Infinity, height: initialHeight ?? Infinity });
  useLayoutEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const on = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setSize({ width: window.innerWidth, height: window.innerHeight }), 150);
    };
    setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', on);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener('resize', on);
    };
  }, []);
  return size;
}
export function NoSSR({ children }: { children?: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on ? <>{children}</> : null;
}
export const BrowserOnly = ({ children, fallback = null }: { children: () => ReactNode; fallback?: ReactNode }) => {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return <>{on ? children() : fallback}</>;
};

/** Contenido de la página actual (Content.js de Rspress: el módulo de la ruta, dentro de Suspense). */
export const Content = ({ fallback = <Fragment /> }: { fallback?: ReactNode }) => {
  const { pathname } = useLocation();
  const route = pathnameToRouteService(pathname);
  const mod = route ? LOADED.get(modKey(route.entry)) : undefined;
  const C = mod?.default;
  return <Suspense fallback={fallback}>{C ? <C /> : null}</Suspense>;
};

/* ── utils.js de Rspress ─────────────────────────────────────────────────────────────────────────────────── */
export const withBase = (url = '/') => sharedWithBase(url, SITE.base);
export const removeBase = (url: string) => sharedRemoveBase(url, SITE.base);
export const withSiteOrigin = (url: string) => sharedWithSiteOrigin(url, SITE.siteOrigin);
export const isEqualPath = (a: string, b: string) =>
  removeBase(normalizeHref(removeHash(a), true)) === removeBase(normalizeHref(removeHash(b), true));
export const normalizeHrefInRuntime = (link: string) => normalizeHref(link, Boolean(SITE.route?.cleanUrls));
export const cleanUrlByConfig = (link: string) => (SITE.route?.cleanUrls ? normalizeHref(link, true) : link);
const isAbsoluteUrl = (p: string) => isExternalUrl(p) || isDataUrl(p) || p.startsWith('//');
export function normalizeImagePath(imagePath: string) {
  if (isAbsoluteUrl(imagePath)) return imagePath;
  if (!imagePath.startsWith('/')) return imagePath;
  return withBase(imagePath);
}
export function routePathToMdPath(routePath: string) {
  return withBase(normalizeHref(routePath, false).replace(/\.html(?=#|\?|$)/, '.md'));
}
