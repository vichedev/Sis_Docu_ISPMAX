import { Head, useFrontmatter, useHead, useLocaleSiteData, usePage, useSite, withBase } from '@rspress/core/runtime';
import { createElement, memo, useMemo } from 'react';
import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import soraLatin from '@fontsource-variable/sora/files/sora-latin-wght-normal.woff2?url';
import { buildJsonLd, canonicalPath, metaDescription, pageTitle, SEO, type SeoConfig } from './seo';

/**
 * Etiquetas del <head> de cada página (zona del agente de SEO; el Layout solo monta este componente):
 * <title>, descripción, canonical absoluto, hreflang, robots, Open Graph, Twitter Card, theme-color, iconos,
 * precarga de fuentes y datos estructurados JSON-LD. Más las etiquetas `head` del frontmatter.
 *
 * La URL pública sale de `themeConfig.seo.siteUrl` (rspress.config.ts, variable PORTAL_PUBLIC_URL). Sin ella no se
 * emiten canonical, og:url ni og:image (deben ser absolutas) ni JSON-LD con URLs.
 * La lógica pura (títulos, rutas, JSON-LD) está en ./seo.ts y la prueba `scripts/seo-check.mjs` sobre dist/.
 */
type HeadEntry = [string, Record<string, string>];

export const HeadTags = memo(function HeadTags() {
  const { page } = usePage();
  const { site } = useSite();
  const { frontmatter } = useFrontmatter();
  const locale = useLocaleSiteData();
  const head = frontmatter.head as HeadEntry[] | undefined;
  const seo = ((site.themeConfig as { seo?: SeoConfig } | undefined)?.seo ?? {}) as SeoConfig;
  const siteUrl = seo.siteUrl || '';

  const mainTitle = site.title || locale.title || '';
  const type = page.pageType;
  const isDoc = type === 'doc' || type === 'doc-wide';
  const raw = ((frontmatter.title as string | undefined) ?? page.title) || '';
  const suffix = frontmatter.titleSuffix as string | undefined;
  const title = pageTitle({ type, raw, suffix, mainTitle });
  const description = metaDescription((page.description as string | undefined) || site.description || locale.description || '');

  const own = useMemo(() => {
    const keys = new Set<string>();
    for (const [tag, attrs] of head ?? []) {
      if (tag === 'meta' && attrs?.property) keys.add(attrs.property);
      if (tag === 'meta' && attrs?.name) keys.add(attrs.name);
    }
    return keys;
  }, [head]);

  const noindex = type === '404' || frontmatter.noindex === true || (frontmatter.seo as { noindex?: boolean } | undefined)?.noindex === true;
  const routePath = page.routePath || '/';
  // Ruta canónica con la base del sitio (p. ej. /manual/) y sin ".html".
  const path = withBase(canonicalPath(routePath, site.base || '/'));
  const canonical = siteUrl && !noindex && type !== '404' ? siteUrl + path : '';
  const asset = (file: string) => withBase(`/${file}`);
  const absolute = (file: string) => (siteUrl ? siteUrl + asset(file) : '');
  const image = absolute(SEO.ogImage);

  const jsonLd = useMemo(
    () =>
      canonical
        ? buildJsonLd({
            siteUrl,
            canonical,
            type,
            title: raw || mainTitle,
            description,
            siteName: SEO.siteName,
            routePath,
            grupo: frontmatter.grupo as string | undefined,
            fecha: (frontmatter.verificado as { fecha?: string } | undefined)?.fecha,
            image,
            logo: absolute(SEO.logo),
            sectionLinks: Object.fromEntries(Object.entries(SEO.sectionHome).map(([k, v]) => [k, siteUrl + withBase(v)])),
            homeUrl: siteUrl + withBase('/'),
            contacto: (site.themeConfig as { contacto?: { correo?: { texto?: string }; telefono?: { texto?: string } } } | undefined)?.contacto,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canonical, type, raw, description, routePath, frontmatter.grupo, frontmatter.verificado],
  );

  useHead({
    htmlAttrs: { lang: page.lang || site.lang || 'es' },
    title: title || undefined,
    meta: [
      own.has('og:type') ? undefined : { property: 'og:type', content: isDoc ? 'article' : 'website' },
      { property: 'og:site_name', content: SEO.siteName },
      { property: 'og:locale', content: SEO.locale },
      title && !own.has('og:title') ? { property: 'og:title', content: title } : undefined,
      description && !own.has('description') ? { name: 'description', content: description } : undefined,
      description && !own.has('og:description') ? { property: 'og:description', content: description } : undefined,
      canonical ? { property: 'og:url', content: canonical } : undefined,
      image ? { property: 'og:image', content: image } : undefined,
      image ? { property: 'og:image:type', content: 'image/png' } : undefined,
      image ? { property: 'og:image:width', content: '1200' } : undefined,
      image ? { property: 'og:image:height', content: '630' } : undefined,
      image ? { property: 'og:image:alt', content: SEO.ogImageAlt } : undefined,
      { name: 'twitter:card', content: 'summary_large_image' },
      title ? { name: 'twitter:title', content: title } : undefined,
      description ? { name: 'twitter:description', content: description } : undefined,
      image ? { name: 'twitter:image', content: image } : undefined,
      image ? { name: 'twitter:image:alt', content: SEO.ogImageAlt } : undefined,
      { name: 'robots', content: noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1' },
      { name: 'color-scheme', content: 'light dark' },
      { name: 'theme-color', content: SEO.themeColor.light, media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: SEO.themeColor.dark, media: '(prefers-color-scheme: dark)' },
      { name: 'author', content: SEO.author },
      { name: 'application-name', content: SEO.siteName },
    ],
    link: [
      canonical ? { rel: 'canonical', href: canonical } : undefined,
      canonical ? { rel: 'alternate', hreflang: 'es', href: canonical } : undefined,
      canonical ? { rel: 'alternate', hreflang: 'x-default', href: canonical } : undefined,
      { rel: 'icon', href: asset('favicon.ico'), sizes: '48x48' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: asset('favicon-32.png') },
      { rel: 'apple-touch-icon', sizes: '180x180', href: asset('apple-touch-icon.png') },
      { rel: 'manifest', href: asset('site.webmanifest') },
      // Fuentes críticas (latin de Inter y Sora): la URL con hash sale del propio build, así la caché sigue siendo válida.
      { rel: 'preload', as: 'font', type: 'font/woff2', href: interLatin, crossorigin: 'anonymous' },
      { rel: 'preload', as: 'font', type: 'font/woff2', href: soraLatin, crossorigin: 'anonymous' },
    ],
    script: jsonLd
      ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(jsonLd).replace(/</g, '\\u003c'), key: 'ld-json' }]
      : [],
  });

  const tags = useMemo(
    () => head?.map(([tag, attrs], i) => (tag ? createElement(tag, { key: i, ...attrs }) : null)) ?? null,
    [head],
  );
  return <Head>{tags}</Head>;
});
