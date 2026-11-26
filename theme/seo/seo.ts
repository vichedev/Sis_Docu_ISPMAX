/**
 * Lógica pura del SEO (sin React): título, ruta canónica y datos estructurados JSON-LD.
 * Constantes de marca en `SEO`; la URL pública llega por `themeConfig.seo.siteUrl` (rspress.config.ts).
 */
export type SeoConfig = { siteUrl?: string };

export const SEO = {
  siteName: 'Manual ISPMAX',
  author: 'InigualitySoft',
  locale: 'es_EC',
  /** Archivos de `theme/seo/brand/` que `output.copy` deja en la raíz del sitio (generados por scripts/seo-brand.mjs). */
  ogImage: 'og-ispmax.png',
  ogImageAlt: 'ISPMAX, sistema de gestión de clientes: manual de usuario',
  logo: 'icon-512.png',
  /** Mismos fondos que `--isp-bg` en styles/tailwind.css (claro y oscuro). Si el diseño los cambia, actualizar aquí. */
  themeColor: { light: '#ffffff', dark: '#0b0c14' },
  /** Longitud máxima del <title> (Google recorta hacia los 60 caracteres). */
  titleMax: 65,
  descMin: 70,
  descMax: 160,
  /** Página de entrada de cada sección (para las migas de pan). */
  sectionHome: {
    guia: '/guia/inicio',
    tareas: '/tareas/',
    problemas: '/problemas/',
    preguntas: '/preguntas/',
    referencia: '/referencia/',
    conceptos: '/conceptos/',
  } as Record<string, string>,
  sectionName: {
    guia: 'Guía',
    tareas: 'Tareas',
    problemas: 'Problemas',
    preguntas: 'Preguntas',
    referencia: 'Referencia',
    conceptos: 'Conceptos',
  } as Record<string, string>,
};

/** Corta en el último espacio antes de `max` caracteres y añade "…" (el texto completo sigue en la página). */
export function clampText(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–—(]+$/, '') + '…';
}

/** Meta description de 70-160 caracteres: recorta las largas y completa las cortas con la marca. */
export function metaDescription(text: string, fallbackTail = 'Manual de usuario de ISPMAX.') {
  let t = text.replace(/\s+/g, ' ').trim();
  if (t && t.length < SEO.descMin) t = `${t}${/[.!?…]$/.test(t) ? '' : '.'} ${fallbackTail}`;
  return clampText(t, SEO.descMax);
}

const joinTitle = (title: string, suffix?: string) => {
  if (!suffix) return title;
  const t = title.trim();
  const s = suffix.trim();
  return s.startsWith('-') || s.startsWith('|') ? `${t} ${s}` : `${t} - ${s}`;
};

/** <title>: "Página - Manual ISPMAX"; si pasa de `titleMax`, solo el título de la página (si cabe). */
export function pageTitle({ type, raw, suffix, mainTitle }: { type: string; raw: string; suffix?: string; mainTitle: string }) {
  if (type === 'doc' || type === 'doc-wide') {
    if (!raw) return mainTitle;
    const full = joinTitle(raw, suffix || mainTitle);
    return full.length > SEO.titleMax ? clampText(raw, SEO.titleMax) : full;
  }
  if (type === 'home') return joinTitle(mainTitle, suffix);
  if (type === '404') return joinTitle('404', mainTitle);
  return mainTitle;
}

/** Ruta limpia (sin ".html" ni "/index"); conserva la barra final de las portadas de sección ("/tareas/"). */
export function canonicalPath(routePath: string, _base = '/') {
  let p = (routePath || '/').split('#')[0].split('?')[0];
  p = p.replace(/\.html$/i, '').replace(/\/index$/i, '/');
  if (!p.startsWith('/')) p = '/' + p;
  return p || '/';
}

export type JsonLdInput = {
  siteUrl: string;
  canonical: string;
  type: string;
  title: string;
  description: string;
  siteName: string;
  routePath: string;
  grupo?: string;
  fecha?: string;
  image: string;
  logo: string;
  sectionLinks: Record<string, string>;
  homeUrl: string;
  contacto?: { correo?: { texto?: string }; telefono?: { texto?: string } };
};

/** `verificado.fecha` (AAAA-MM-DD) → fecha ISO válida, o undefined. */
export function isoDate(v?: unknown) {
  const s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : '';
  return /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s.slice(0, 10))) ? s.slice(0, 10) : undefined;
}

/**
 * Un único bloque `@graph`: Organization, WebSite, BreadcrumbList y TechArticle (en las páginas de contenido).
 * El grupo del menú no se incluye en las migas porque no tiene URL propia (Google exige `item` salvo en la última).
 * Sin SearchAction: el sitio no tiene una URL `?q=` real (el buscador es local y se abre con Ctrl+K).
 */
export function buildJsonLd(i: JsonLdInput) {
  const org = {
    '@type': 'Organization',
    '@id': `${i.homeUrl}#organization`,
    name: SEO.author,
    ...(i.logo ? { logo: { '@type': 'ImageObject', url: i.logo, width: 512, height: 512 } } : {}),
    ...(i.contacto?.correo?.texto || i.contacto?.telefono?.texto
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            availableLanguage: 'es',
            ...(i.contacto?.correo?.texto ? { email: i.contacto.correo.texto } : {}),
            ...(i.contacto?.telefono?.texto ? { telephone: i.contacto.telefono.texto.replace(/\s+/g, ' ') } : {}),
          },
        }
      : {}),
  };
  const site = {
    '@type': 'WebSite',
    '@id': `${i.homeUrl}#website`,
    url: i.homeUrl,
    name: i.siteName,
    inLanguage: 'es',
    publisher: { '@id': org['@id'] },
  };
  const graph: Record<string, unknown>[] = [org, site];

  if (i.type === 'doc' || i.type === 'doc-wide') {
    const seg = i.routePath.split('/').filter(Boolean);
    const first = seg[0] ?? '';
    const items: { name: string; item?: string }[] = [{ name: 'Inicio', item: i.homeUrl }];
    const sectionUrl = i.sectionLinks[first];
    if (SEO.sectionName[first] && sectionUrl && sectionUrl !== i.canonical) items.push({ name: SEO.sectionName[first], item: sectionUrl });
    items.push({ name: i.title });
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${i.canonical}#breadcrumb`,
      itemListElement: items.map((it, n) => ({
        '@type': 'ListItem',
        position: n + 1,
        name: it.name,
        ...(n < items.length - 1 ? { item: it.item } : { item: i.canonical }),
      })),
    });
    const modified = isoDate(i.fecha);
    graph.push({
      '@type': 'TechArticle',
      '@id': `${i.canonical}#article`,
      headline: i.title.slice(0, 110),
      ...(i.description ? { description: i.description } : {}),
      inLanguage: 'es',
      url: i.canonical,
      mainEntityOfPage: { '@type': 'WebPage', '@id': i.canonical },
      isPartOf: { '@id': site['@id'] },
      publisher: { '@id': org['@id'] },
      author: { '@id': org['@id'] },
      ...(i.image ? { image: i.image } : {}),
      ...(modified ? { dateModified: modified } : {}),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
