import { isExternalUrl, normalizeImagePath, useFrontmatter, useNav, usePages } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import { useMemo, useRef } from 'react';
import { SupportBand } from '../components/Footer';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { Lightbox } from '../components/Lightbox';
import { SUGERENCIAS, useModKey } from '../components/SearchPalette';
import type { NavItem } from '../components/TopBar';
import { IconTile, Kbd, buttonClass } from '../components/ui';
import { cn } from '../lib/cn';
import { SECTIONS, iconFor, sectionOf, sectionOfNav, splitEmoji } from '../lib/sections';
import type { SectionKey } from '../lib/sections';
import { DocContent } from './DocLayout';
import { normRoute, useNavLink } from '../lib/routes';
import { useShell } from './shell';

interface Hero {
  name?: string;
  text?: string;
  tagline?: string;
  image?: { src?: string | { light: string; dark: string }; alt?: string };
  actions?: { theme?: 'brand' | 'alt'; text: string; link: string }[];
}
interface Feature {
  icon?: string;
  title: string;
  details?: string;
  link?: string;
}

/* ── Datos de la portada que salen de las páginas del sitio (siempre ciertos: se calculan al compilar) ─────────── */
type PageLite = { routePath: string; title?: string; frontmatter?: Record<string, unknown> };

const clean = (r: string) => r.replace(/\.html$/, '').replace(/\/index$/, '/');

function useSiteFacts() {
  const { pages } = usePages() as unknown as { pages: PageLite[] };
  return useMemo(() => {
    const bySection: Record<SectionKey, number> = { guia: 0, tareas: 0, problemas: 0, preguntas: 0, referencia: 0 };
    const titles = new Map<string, string>();
    let verified = 0;
    for (const p of pages) {
      const route = clean(p.routePath);
      titles.set(route, p.title ?? '');
      const s = sectionOf(route);
      if (s && !route.endsWith('/')) bySection[s]++;
      const fm = p.frontmatter ?? {};
      if (fm.estado === 'verificado') verified++;
    }
    const total = pages.filter(p => clean(p.routePath) !== '/' && !/404/.test(p.routePath)).length;
    return { bySection, titles, verified, total };
  }, [pages]);
}

/* ── Perfiles: rutas de lectura (solo se muestran las páginas que existen; el texto es su título real) ───────── */
const PERFILES: { key: string; icon: IconName; title: string; who: string; routes: string[] }[] = [
  {
    key: 'cliente',
    icon: 'user',
    title: 'Empieza con ISPMAX',
    who: 'Su empresa acaba de adoptar la plataforma.',
    routes: ['/guia/inicio', '/guia/primeros-pasos', '/guia/dashboard', '/tareas/cobranza/registrar-un-pago', '/guia/faq'],
  },
  {
    key: 'soporte',
    icon: 'headset',
    title: 'Soporte',
    who: 'Atiende a los abonados y resuelve incidencias.',
    routes: ['/problemas/', '/referencia/mensajes-del-sistema', '/guia/estados', '/tareas/soporte/crear-un-ticket'],
  },
  {
    key: 'tecnico',
    icon: 'wrench',
    title: 'Técnico de red',
    who: 'Instala, configura la red y atiende averías.',
    routes: ['/guia/routers', '/tareas/red/agregar-un-router', '/guia/mapa', '/guia/smartolt', '/guia/instalaciones'],
  },
  {
    key: 'admin',
    icon: 'shield',
    title: 'Administrador',
    who: 'Configura la empresa, los usuarios y los permisos.',
    routes: ['/guia/ajustes', '/referencia/permisos', '/tareas/acceso/crear-un-usuario', '/referencia/automatizaciones', '/guia/rutinas'],
  },
];

/* ── Piezas ─────────────────────────────────────────────────────────────────────────────────────────── */

/** Título de bloque de la portada: rótulo de color + h2 + entradilla. */
function BlockTitle({ eyebrow, title, lead, id }: { eyebrow: string; title: string; lead?: string; id: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="mb-2 font-display text-[12px] font-bold tracking-[0.12em] text-brand uppercase">{eyebrow}</p>
      <h2 id={id} className="font-display text-[1.75rem] leading-tight font-bold tracking-[-0.028em] text-balance text-fg sm:text-[2rem]">
        {title}
      </h2>
      {lead ? <p className="mt-2.5 text-[16px] leading-relaxed text-fg-muted">{lead}</p> : null}
    </div>
  );
}

/** Arcos de "velocímetro" (eco del logotipo) detrás del logo del héroe. Decorativo. */
function GaugeArcs() {
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-x-0 top-[4%] w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="isp-arc" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5b4bd8" />
          <stop offset="0.55" stopColor="#8b7dfb" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path d="M 10 280 A 190 190 0 0 1 390 280" fill="none" stroke="url(#isp-arc)" strokeWidth="1.5" strokeDasharray="2 9" opacity="0.55" strokeLinecap="round" />
      <path d="M 45 280 A 155 155 0 0 1 355 280" fill="none" stroke="url(#isp-arc)" strokeWidth="10" opacity="0.14" strokeLinecap="round" />
      <path d="M 45 280 A 155 155 0 0 1 300 158" fill="none" stroke="url(#isp-arc)" strokeWidth="10" opacity="0.55" strokeLinecap="round" />
      <path d="M 85 280 A 115 115 0 0 1 315 280" fill="none" stroke="url(#isp-arc)" strokeWidth="1.5" opacity="0.35" />
    </svg>
  );
}

function Hero({ hero, facts }: { hero: Hero; facts: ReturnType<typeof useSiteFacts> }) {
  const { openSearch } = useShell();
  const mod = useModKey();
  const src = hero.image?.src;
  const words = (hero.name ?? '').trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  const primary = hero.actions?.filter(a => a.theme === 'brand') ?? [];
  const others = hero.actions?.filter(a => a.theme !== 'brand') ?? [];

  return (
    <section aria-labelledby="portada-titulo" className="relative isolate overflow-hidden border-b border-line">
      {/* Fondo: retícula fina que se desvanece + halos de marca. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--isp-line-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--isp-line-soft)_1px,transparent_1px)] bg-size-[44px_44px] mask-[radial-gradient(ellipse_80%_70%_at_50%_0%,black_35%,transparent_75%)]" />
        <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(91_75_216/0.16),transparent)] dark:bg-[radial-gradient(closest-side,rgb(124_109_250/0.2),transparent)]" />
        <div className="absolute top-10 -right-40 size-[30rem] rounded-full bg-[radial-gradient(closest-side,rgb(56_189_248/0.14),transparent)] dark:bg-[radial-gradient(closest-side,rgb(56_189_248/0.12),transparent)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-10 lg:pt-20 lg:pb-24">
        <div>
          {facts.verified ? (
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pr-3.5 pl-2 text-[12.5px] font-medium text-fg-muted shadow-xs backdrop-blur">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <Icon name="check" className="size-3" strokeWidth={3} />
              </span>
              {facts.verified} páginas comprobadas con ISPMAX
            </p>
          ) : null}

          {hero.name ? (
            <h1 id="portada-titulo" className="font-display text-[2.9rem] leading-[1.02] font-extrabold tracking-[-0.045em] text-fg sm:text-[3.6rem] lg:text-[4.1rem]">
              {words.join(' ')}
              {last ? (
                <>
                  {' '}
                  <span className="bg-linear-to-r from-brand-600 via-brand-500 to-accent-400 bg-clip-text pr-1 text-transparent dark:from-brand-300 dark:via-brand-400 print:text-fg">
                    {last}
                  </span>
                </>
              ) : null}
            </h1>
          ) : null}
          {hero.text ? <p className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-fg sm:text-2xl">{hero.text}</p> : null}
          {hero.tagline ? <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-fg-muted">{hero.tagline}</p> : null}

          {/* Buscador protagonista: abre la paleta. */}
          <div className="mt-8 max-w-xl">
            <button
              type="button"
              onClick={() => openSearch()}
              aria-haspopup="dialog"
              className="group flex h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface pr-3 pl-4.5 text-left shadow-[0_1px_2px_rgb(20_23_38/0.05),0_12px_32px_-12px_rgb(91_75_216/0.25)] transition-[border-color,box-shadow] hover:border-brand/50 hover:shadow-[0_1px_2px_rgb(20_23_38/0.05),0_16px_40px_-12px_rgb(91_75_216/0.4)] dark:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)]"
            >
              <Icon name="search" className="size-5 shrink-0 text-brand" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate text-[15.5px] text-fg-subtle">Busque un módulo, una tarea o un problema…</span>
              <span className="hidden shrink-0 gap-1 sm:inline-flex">
                <Kbd>{mod}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[13px]">
              <span className="mr-1 text-fg-subtle">Lo más buscado:</span>
              {SUGERENCIAS.slice(0, 4).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => openSearch(s)}
                  className="rounded-full border border-line bg-surface/70 px-2.5 py-1 font-medium text-fg-muted transition-colors hover:border-brand/45 hover:text-brand"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {primary.length || others.length ? (
            <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-3">
              {primary.map(a => (
                <Link key={a.text} href={a.link} className={buttonClass('primary', 'lg')}>
                  {a.text}
                  <Icon name="arrowRight" className="size-4.5" strokeWidth={2} />
                </Link>
              ))}
              {others.map(a => (
                <Link key={a.text} href={a.link} className="group inline-flex items-center gap-0.5 text-[14px] font-semibold text-fg-muted transition-colors hover:text-brand">
                  {a.text}
                  <Icon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {src ? (
          <div className="relative mx-auto hidden w-full lg:block">
            <GaugeArcs />
            <div className="relative mx-auto mt-[30%] w-[80%] rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_40px_80px_-32px_rgb(40_30_120/0.45)] ring-1 ring-black/5 backdrop-blur-md sm:p-8 dark:border-white/10 dark:bg-[#f7f7fc] dark:shadow-[0_40px_90px_-30px_rgb(124_109_250/0.55)]">
              {/* Una sola imagen (la versión clara, sobre una placa siempre clara): se descarga una vez, con prioridad,
                  en los dos modos; es el LCP en escritorio. Bajo 1024 px la composición no se muestra y el <source>
                  con un GIF de 1 px en línea evita descargar los ~300 KB del logo (en móvil el LCP es el texto). */}
              <picture>
                <source media="(max-width: 1023.98px)" srcSet="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" />
                <img
                  src={normalizeImagePath(typeof src === 'string' ? src : src.light)}
                  alt={hero.image?.alt ?? ''}
                  width={1200}
                  height={630}
                  className="relative h-auto w-full"
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  data-nozoom
                />
              </picture>
            </div>
            {/* Cifras reales del manual (de las páginas publicadas). */}
            {facts.bySection.tareas ? (
              <p className="absolute top-[6%] right-0 flex items-center gap-2.5 rounded-2xl border border-line bg-surface/90 py-2 pr-3.5 pl-2 text-[13px] shadow-lg backdrop-blur max-sm:hidden">
                <IconTile size="sm" section="tareas" icon="checks" />
                <span>
                  <strong className="block font-display text-[15px] leading-tight text-fg">{facts.bySection.tareas}</strong>
                  <span className="text-fg-subtle">tareas paso a paso</span>
                </span>
              </p>
            ) : null}
            {facts.bySection.problemas ? (
              <p className="absolute bottom-[-6%] left-0 flex items-center gap-2.5 rounded-2xl border border-line bg-surface/90 py-2 pr-3.5 pl-2 text-[13px] shadow-lg backdrop-blur max-sm:hidden">
                <IconTile size="sm" section="problemas" icon="lifebuoy" />
                <span>
                  <strong className="block font-display text-[15px] leading-tight text-fg">{facts.bySection.problemas}</strong>
                  <span className="text-fg-subtle">problemas resueltos</span>
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Las cinco secciones del menú superior, con su color, su icono y cuántas páginas tienen. */
function SectionPaths({ facts }: { facts: ReturnType<typeof useSiteFacts> }) {
  const nav = useNav() as NavItem[];
  const items = nav.filter(i => !i.link || !isExternalUrl(i.link));
  const navLink = useNavLink();
  return (
    <section aria-labelledby="portada-secciones" className="pt-16 lg:pt-20">
      <BlockTitle id="portada-secciones" eyebrow="Secciones del manual" title="Encuentre la respuesta según lo que necesita" lead="Cinco puertas de entrada al mismo contenido: elija la que mejor describe su pregunta." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item, i) => {
          const key = sectionOfNav(item);
          if (!key) return null;
          const tone = SECTIONS[key];
          const link = navLink(item);
          const subs = item.items?.slice(0, 4) ?? [];
          return (
            <li
              key={item.text}
              className={cn(
                'group relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-xs transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg',
                tone.hover,
                i === 0 && 'sm:col-span-2 lg:col-span-1',
              )}
            >
              <IconTile size="lg" section={key} icon={tone.icon} />
              <h3 className="mt-4 font-display text-[17px] font-bold tracking-[-0.015em] text-fg">
                {link ? (
                  <Link href={link} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand">
                    {item.text}
                  </Link>
                ) : (
                  item.text
                )}
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{tone.blurb}</p>
              {subs.length ? (
                <ul className="relative z-10 mt-3 flex flex-wrap gap-1.5">
                  {subs.map(s => (
                    <li key={s.text}>
                      <Link href={s.link!} className="inline-flex rounded-md bg-bg-mute px-2 py-0.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-brand-tint hover:text-brand">
                        {splitEmoji(s.text)[1]}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className={cn('mt-auto flex items-center justify-between pt-5 text-[12.5px] font-semibold', tone.text)}>
                {facts.bySection[key] ? `${facts.bySection[key]} páginas` : ''}
                <Icon name="arrowRight" className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Módulos de ISPMAX: tarjetas `features` del frontmatter de la portada. Las que ya son una sección del menú
 * superior (Quiero hacer…, Tengo un problema…) se omiten aquí porque están en el bloque anterior.
 */
function Modules({ features }: { features: Feature[] }) {
  const nav = useNav() as NavItem[];
  const navLinks = new Set(nav.flatMap(i => (i.items ? i.items : [i])).map(i => normRoute(i.link)));
  const guia = nav.find(i => sectionOfNav(i) === 'guia');
  // Además de los enlaces del menú, las portadas de sección (/tareas/, /problemas/, /preguntas/, /conceptos/).
  const shown = features.filter(f => !f.link || (!navLinks.has(normRoute(f.link)) && sectionOf(f.link) === 'guia'));
  if (!shown.length) return null;
  const card = 'group relative flex flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5 transition-[border-color,box-shadow] hover:border-brand/45 hover:shadow-lg';
  return (
    <section aria-labelledby="portada-modulos" className="pt-20">
      <BlockTitle id="portada-modulos" eyebrow="Guía por módulos" title="Todos los módulos de ISPMAX" lead="Cada pantalla de la plataforma explicada: qué muestra, qué significa cada campo y qué pasa al guardar." />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {shown.map(f => {
          const icon = iconFor(f.link, f.title);
          return (
            <li key={f.title} className={card}>
              <IconTile icon={icon} emoji={f.icon} />
              <h3 className="mt-4 font-display text-[15.5px] font-semibold tracking-[-0.01em] text-fg">
                {f.link ? (
                  <Link href={f.link} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand">
                    {f.title}
                  </Link>
                ) : (
                  f.title
                )}
              </h3>
              {f.details ? <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted max-sm:hidden">{f.details}</p> : null}
              {f.link ? (
                <Icon name="arrowRight" className="absolute top-5 right-5 size-4 -translate-x-1 text-brand opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={2} />
              ) : null}
            </li>
          );
        })}
        {guia?.link ? (
          <li className="relative col-span-2 flex flex-col justify-center rounded-2xl border border-dashed sm:col-span-1 border-brand/35 bg-brand-tint p-5">
            <p className="font-display text-[15.5px] font-semibold text-fg">¿Busca otro módulo?</p>
            <p className="mt-1 text-[13.5px] text-fg-muted">La guía completa recorre la plataforma de principio a fin.</p>
            <Link href={guia.link} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand after:absolute after:inset-0">
              Ver toda la guía
              <Icon name="arrowRight" className="size-4" strokeWidth={2} />
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function Profiles({ facts }: { facts: ReturnType<typeof useSiteFacts> }) {
  const perfiles = PERFILES.map(p => ({
    ...p,
    links: p.routes
      .map(r => ({ r, t: facts.titles.get(r) ?? facts.titles.get(r.replace(/\/$/, '')) }))
      .filter((x): x is { r: string; t: string } => !!x.t)
      .slice(0, 4),
  })).filter(p => p.links.length >= 2);
  if (!perfiles.length) return null;
  return (
    <section aria-labelledby="portada-perfiles" className="pt-20">
      <BlockTitle id="portada-perfiles" eyebrow="Rutas de lectura" title="Por dónde empezar según su perfil" lead="Las páginas que más le sirven en su día a día, en el orden en que conviene leerlas." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {perfiles.map(p => (
          <li key={p.key} className="flex flex-col rounded-2xl border border-line bg-bg-soft p-5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-xl bg-surface text-fg shadow-xs ring-1 ring-line">
                <Icon name={p.icon} className="size-5" />
              </span>
              <h3 className="font-display text-[16px] font-bold tracking-[-0.015em] text-fg">{p.title}</h3>
            </div>
            <p className="mt-2.5 text-[13.5px] text-fg-muted">{p.who}</p>
            <ol className="mt-4 space-y-1">
              {p.links.map((l, i) => (
                <li key={l.r}>
                  <Link href={l.r} className="group flex items-start gap-2.5 rounded-lg py-1.5 text-[14px] font-medium text-fg transition-colors hover:text-brand">
                    <span aria-hidden="true" className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface font-display text-[11px] font-bold text-brand ring-1 ring-line group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                      {i + 1}
                    </span>
                    <span className="min-w-0">{l.t}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Portada (`pageType: home`): `hero` y `features` del frontmatter de docs/index.mdx, y su contenido MDX si lo hay. */
export function HomeLayout() {
  const { frontmatter } = useFrontmatter();
  const hero = (frontmatter.hero ?? {}) as Hero;
  const features = (frontmatter.features ?? []) as Feature[];
  const facts = useSiteFacts();
  const body = useRef<HTMLDivElement>(null);

  return (
    <main id="contenido" tabIndex={-1} className="outline-none">
      <Hero hero={hero} facts={facts} />
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <SectionPaths facts={facts} />
        <Modules features={features} />
        <Profiles facts={facts} />
        <div ref={body} data-doc className="mt-16 text-[16px] leading-[1.75] empty:hidden">
          <DocContent />
        </div>
        <SupportBand className="mt-20" />
      </div>
      <Lightbox root={body} />
    </main>
  );
}
