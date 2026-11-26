import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@rspress/core';
import type { Sidebar } from '@rspress/core';
import tailwindcss from '@tailwindcss/postcss';
import rehypeLinksNewTab from './src/plugins/rehypeLinksNewTab';

/* Rutas. El CÓDIGO (tema, componentes, estilos, plugins) va junto a este archivo; el CONTENIDO (docs/, índice del
   buscador, redirecciones, dist/) también, salvo que lo cambien estas variables (opcionales; las usa
   `scripts/manual-corpus.mjs` para ver el contenido real sin tocar docs/ del repo):
     ISPMAX_DOCS_DIR      carpeta docs/ (páginas .mdx, _nav.json, public/)
     ISPMAX_SEARCH_DATA   índice del buscador (def. src/search/data.json; lo escribe scripts/build-search-data.mjs)
     ISPMAX_LEGACY_ROUTES redirecciones del manual antiguo (def. src/legacy-routes.json)
     ISPMAX_DIST_DIR      salida del build (def. dist/) */
const here = (...p: string[]) => path.join(__dirname, ...p);
const fromEnv = (name: string, fallback: string) => (process.env[name] ? path.resolve(process.env[name] as string) : fallback);
const DOCS_DIR = fromEnv('ISPMAX_DOCS_DIR', here('docs'));
const SEARCH_DATA = fromEnv('ISPMAX_SEARCH_DATA', here('src', 'search', 'data.json'));
const LEGACY_ROUTES = fromEnv('ISPMAX_LEGACY_ROUTES', here('src', 'legacy-routes.json'));
const DIST_DIR = fromEnv('ISPMAX_DIST_DIR', here('dist'));
/* SEO: URL pública del sitio (PORTAL_PUBLIC_URL, sin barra final; la define el despliegue). Vacía o inválida = sin
   canonical, og:url ni og:image (deben ser absolutas): theme/seo/HeadTags.tsx las omite y aquí se avisa. */
const publicUrlRaw = (process.env.PORTAL_PUBLIC_URL || '').trim();
const PUBLIC_URL = (() => {
  try {
    const u = new URL(publicUrlRaw);
    return /^https?:$/.test(u.protocol) && !u.search && !u.hash && !publicUrlRaw.endsWith('/') ? publicUrlRaw : '';
  } catch {
    return '';
  }
})();
if (!PUBLIC_URL) {
  console.warn(
    publicUrlRaw
      ? `[seo] PORTAL_PUBLIC_URL "${publicUrlRaw}" no es una URL http(s) sin barra final: se omiten canonical, og:url y og:image.`
      : '[seo] PORTAL_PUBLIC_URL no está definida: se omiten canonical, og:url y og:image.',
  );
}
const component = (name: string) => here('src', 'components', `${name}.tsx`);

/* Barras laterales: `scripts/build-nav.mjs` las genera en `docs/_nav.json` desde el frontmatter de cada
   página (`grupo`, `orden`). /guia conserva el orden de `docs/sidebar.json` y añade las páginas nuevas. */
type NavGroup = { sectionHeader: string; items: { text: string; link: string; tag?: string }[] };
const rawNav: Record<string, NavGroup[]> = JSON.parse(readFileSync(path.join(DOCS_DIR, '_nav.json'), 'utf8'));

const sidebar: Sidebar = Object.fromEntries(
  Object.entries(rawNav).map(([prefix, groups]) => [
    prefix,
    groups.flatMap(group => [{ sectionHeaderText: group.sectionHeader }, ...group.items]),
  ]),
);

const WHATSAPP = 'https://wa.me/593959967843';

const svg = {
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.51a8.31 8.31 0 0 0 4.83 1.55V6.69h-1.9z"/></svg>',
};

/**
 * Datos del pie y de contacto que pinta el tema propio (`theme/components/Footer.tsx`). Es una clave propia de
 * `themeConfig` (Rspress la pasa tal cual a `useSite().site.themeConfig`); el portal sustituye aquí también el
 * título y el enlace de WhatsApp (`portal/server/ops/branding.mjs`).
 */
const contacto = {
  marca: 'Manual ISPMAX',
  descripcion: 'Documento de referencia para administradores, operadores y técnicos de la plataforma ISPMAX.',
  telefono: { texto: '+593 95 996 7843', href: 'tel:+593959967843' },
  correo: { texto: 'info@inigualitysoft.com', href: 'mailto:info@inigualitysoft.com' },
  whatsapp: WHATSAPP,
  copyright: '© 2026 InigualitySoft',
};

/** Textos de interfaz en español (Rspress solo trae `en` y `zh` de serie). */
const es = (value: string) => ({ en: value, zh: value, es: value });

/**
 * Campos del frontmatter que son metadatos INTERNOS del equipo (trazabilidad con el código de ISPMAX): rutas de archivos
 * del producto (`codigo`), identificadores de funcionalidad, sinónimos de búsqueda, permisos, rutas y roles. Rspress los
 * empaqueta con cada página en el JavaScript público y en su índice de búsqueda; aquí se descartan antes de empaquetar.
 * (`build-search-data` lee los sinónimos del frontmatter ANTES de este paso, así que el buscador propio no se ve afectado.)
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { INTERNAL_KEYS: INTERNAL_FRONTMATTER } = require('./src/plugins/internalFrontmatter.cjs') as { INTERNAL_KEYS: Set<string> };
const stripInternalFrontmatter = (page: { frontmatter?: Record<string, unknown> }) => {
  const fm = page.frontmatter;
  if (!fm) return;
  for (const key of INTERNAL_FRONTMATTER) delete fm[key];
  const v = fm.verificado as Record<string, unknown> | undefined;
  if (v && typeof v === 'object') {
    delete v.metodo;
    delete v.version; // versión interna de ISPMAX (rama del producto): no se muestra ni debe viajar en el JavaScript público
  }
};
const ispmaxPublicFrontmatter = {
  name: 'ispmax-public-frontmatter',
  async extendPageData(pageData: { frontmatter?: Record<string, unknown> }) {
    stripInternalFrontmatter(pageData);
  },
  async modifySearchIndexData(pages: { frontmatter?: Record<string, unknown> }[]) {
    for (const page of pages) stripInternalFrontmatter(page);
  },
};

export default defineConfig({
  root: DOCS_DIR,
  plugins: [ispmaxPublicFrontmatter],
  outDir: DIST_DIR,
  lang: 'es',

  title: 'Manual ISPMAX',
  description:
    'Manual de usuario de ISPMAX: guía práctica para administradores, operadores y técnicos de la plataforma de gestión de ISP.',

  // En la barra va solo el isotipo: el nombre ya lo pone `logoText`.
  logo: '/assets/logo/ispmax-isotipo.png',
  logoText: 'Manual ISPMAX',

  /* El <head> por página (título, descripción, canonical, Open Graph, Twitter, robots, iconos, theme-color, JSON-LD)
     lo emite theme/seo/HeadTags.tsx; aquí solo lo común que no depende de la página. */
  head: [['meta', { name: 'format-detection', content: 'telephone=no' }]],

  route: { cleanUrls: true },

  /* Tema propio (Tailwind CSS v4): `theme/index.tsx` sustituye el Layout de Rspress. Ruta absoluta para que no
     dependa del directorio desde el que se lanza `rspress` (ver scripts/manual-corpus.mjs). */
  themeDir: here('theme'),
  // Único CSS propio: Tailwind (tokens, utilidades). El tema anterior queda en styles/legacy/ fuera del build.
  globalStyles: here('styles', 'tailwind.css'),
  globalUIComponents: [component('LegacyHashRedirect')],

  markdown: {
    // Los vínculos del contenido se abren en otra pestaña (ver src/plugins/rehypeLinksNewTab.ts).
    rehypePlugins: [rehypeLinksNewTab],
    globalComponents: [
      component('Figure'),
      component('Cards'),
      component('Card'),
      component('Steps'),
      component('Step'),
      component('Kicker'),
      component('Lead'),
      component('FigRow'),
      component('FigGrid'),
      component('Badge'),
      component('Callout'),
      component('SearchTerms'),
      component('Tour'),
    ],
  },


  search: {
    mode: 'local',
    codeBlocks: false,
    // El tema propio usa su paleta (Ctrl+K, theme/components/SearchPalette.tsx) con el mismo motor BM25 que este gancho.
    searchHooks: here('src', 'search', 'hooks.mjs'),
  },

  i18nSource: {
    outlineTitle: es('En esta página'),
    prevPageText: es('Anterior'),
    nextPageText: es('Siguiente'),
    searchPlaceholderText: es('Buscar módulo, opción o función…'),
    searchNoResultsText: es('Sin resultados para'),
    searchSuggestedQueryText: es('Prueba con otra búsqueda, por ejemplo router, factura, pago o cliente.'),
    searchPanelCancelText: es('Cancelar'),
    themeText: es('Tema'),
    menuTitle: es('Menú'),
    languagesText: es('Idiomas'),
    versionsText: es('Versiones'),
    lastUpdatedAuthorText: es('Última edición por'),
    sourceCodeText: es('Código fuente'),
    openInText: es('Abrir en'),
    editLinkText: es('Editar esta página'),
    copyMarkdownText: es('Copiar como Markdown'),
    copyMarkdownLinkText: es('Copiar enlace en Markdown'),
    promptCopyText: es('Copiar'),
    promptCopiedText: es('Copiado'),
    promptExpandText: es('Desplegar'),
    promptCollapseText: es('Plegar'),
    scrollToTopText: es('Volver arriba'),
    lastUpdatedText: es('Última actualización'),
    notFoundText: es('No encontramos esta página del manual.'),
    takeMeHomeText: es('Ir al inicio'),
    codeButtonGroupCopyButtonText: es('Copiar'),
    codeButtonGroupWrapButtonText: es('Ajustar líneas'),
    'overview.filterNameText': es('Filtrar'),
    'overview.filterPlaceholderText': es('Escribe una palabra'),
    'overview.filterNoResultText': es('Sin coincidencias'),
  },

  themeConfig: {
    darkMode: true,
    enableAppearanceAnimation: true,
    sidebar,

    nav: [
      /* Menú original (Guía · Referencia · Soporte) + las secciones por intención añadidas. */
      { text: 'Guía', link: '/guia/inicio', activeMatch: '^/guia/(?!estados|rutinas|faq|glosario)' },
      { text: 'Quiero hacer…', link: '/tareas/', activeMatch: '^/tareas/' },
      { text: 'Tengo un problema', link: '/problemas/', activeMatch: '^/problemas/' },
      { text: 'Preguntas', link: '/preguntas/', activeMatch: '^/preguntas/' },
      {
        text: 'Referencia',
        items: [
          { text: '🚦 Estados del sistema', link: '/guia/estados' },
          { text: '✅ Rutinas diarias', link: '/guia/rutinas' },
          { text: '❓ Preguntas frecuentes', link: '/guia/faq' },
          { text: '📖 Glosario', link: '/guia/glosario' },
          { text: '🔐 Permisos y roles', link: '/referencia/permisos' },
          { text: '⚙️ Automatizaciones', link: '/referencia/automatizaciones' },
          { text: '💡 Conceptos', link: '/conceptos/' },
        ],
      },
      { text: 'Soporte', link: WHATSAPP },
    ],

    socialLinks: [
      { icon: { svg: svg.whatsapp }, mode: 'link', content: WHATSAPP },
      { icon: 'instagram', mode: 'link', content: 'https://www.instagram.com/rednuevaconexion.ec/?hl=es' },
      { icon: { svg: svg.tiktok }, mode: 'link', content: 'https://www.tiktok.com/@maat.ec' },
    ],

    // Clave propia (no es de Rspress): la lee theme/components/Footer.tsx.
    ...({ contacto, seo: { siteUrl: PUBLIC_URL } } as object),
  },

  builderConfig: {
    html: { title: 'Manual ISPMAX' },
    // Iconos, manifiesto e imagen social (theme/seo/brand/, generados por scripts/seo-brand.mjs) en la raíz del sitio.
    output: { copy: [{ from: here('theme', 'seo', 'brand'), to: '.' }] },
    resolve: {
      alias: {
        // Archivos generados o de contenido que el tema importa; su ubicación depende de las variables de arriba.
        '@isp/search-data': SEARCH_DATA,
        '@isp/legacy-routes': LEGACY_ROUTES,
      },
    },
    tools: {
      // El frontmatter interno (rutas del código de ISPMAX, funcionalidades, sinónimos…) no debe llegar al JavaScript público:
      // un loader previo lo descarta del texto de cada .mdx antes de que Rspress lo empaquete (no modifica archivos).
      rspack: (config: { module?: { rules?: unknown[] } }) => {
        config.module ??= {};
        config.module.rules ??= [];
        config.module.rules.unshift({
          test: /.mdx?$/,
          enforce: 'pre',
          use: [{ loader: here('src', 'plugins', 'stripFrontmatterLoader.cjs') }],
        });
      },
      /* Tailwind CSS v4 (CSS-first: la configuración está en styles/tailwind.css). `base` es la carpeta donde detecta
         clases automáticamente: las páginas .mdx; el tema y src/ se declaran con @source en el CSS. */
      postcss: (_opts, { addPlugins }) => {
        addPlugins(tailwindcss({ base: DOCS_DIR }));
      },
    },
  },
});
