import { isExternalUrl, removeBase, useI18n, useLocation, useNav } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import { useEffect, useState } from 'react';
import { resultados } from '../../src/search/hooks.mjs';
import type { Resultado } from '../../src/search/hooks.mjs';
import { SupportBand } from '../components/Footer';
import { Icon } from '../components/Icon';
import type { NavItem } from '../components/TopBar';
import { IconTile, buttonClass } from '../components/ui';
import { SECTIONS, sectionOf, sectionOfNav } from '../lib/sections';
import { useNavLink } from '../lib/routes';
import { useShell } from './shell';

/** Palabras de la dirección que no existe ("/guia/registrar-pagos.html" → "registrar pagos"). */
function guessFrom(pathname: string) {
  const last = decodeURIComponent(removeBase(pathname))
    .replace(/\.html$/, '')
    .split('/')
    .filter(Boolean)
    .pop();
  return (last ?? '').replace(/[-_.]+/g, ' ').trim();
}

/** Página 404: explica, propone páginas parecidas a la dirección (buscador del sitio) y da las secciones. */
export function NotFoundLayout() {
  const t = useI18n();
  const { openSearch } = useShell();
  const { pathname } = useLocation();
  const nav = useNav() as NavItem[];
  const navLink = useNavLink();
  const [guess, setGuess] = useState('');
  const [similar, setSimilar] = useState<Resultado[]>([]);

  // Solo en el navegador: el HTML estático de 404 no conoce la dirección pedida.
  useEffect(() => {
    const g = guessFrom(pathname);
    setGuess(g);
    if (!g) return;
    let alive = true;
    resultados(g, 5)
      .then(r => alive && setSimilar(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  const sections = nav.filter(i => (i.link && !isExternalUrl(i.link)) || i.items);

  return (
    <main id="contenido" tabIndex={-1} className="outline-none">
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgb(91_75_216/0.12),transparent)] dark:bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgb(124_109_250/0.16),transparent)]" />
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-16 pb-14 text-center sm:pt-24">
          <div aria-hidden="true" className="relative mb-7 flex items-center justify-center">
            <span className="font-display text-[7rem] leading-none font-extrabold tracking-[-0.06em] text-transparent [-webkit-text-stroke:2px_var(--isp-line)] sm:text-[9rem]">404</span>
            <span className="absolute inline-flex size-16 items-center justify-center rounded-2xl bg-surface text-brand shadow-xl ring-1 ring-line">
              <Icon name="signalOff" className="size-8" strokeWidth={2} />
            </span>
          </div>
          <p className="mb-3 font-display text-[12px] font-bold tracking-[0.12em] text-brand uppercase">Error 404 · Página sin señal</p>
          <h1 className="font-display text-[1.9rem] leading-tight font-bold tracking-[-0.03em] text-balance text-fg sm:text-[2.4rem]">{t('notFoundText')}</h1>
          <p className="mt-3 max-w-lg text-[16px] text-fg-muted">
            Puede que la página haya cambiado de nombre o que el enlace esté incompleto. Búsquela por su tema o vuelva a la portada.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => openSearch(guess)} className={buttonClass('primary', 'lg')}>
              <Icon name="search" className="size-4.5" strokeWidth={2} />
              {guess ? `Buscar «${guess}»` : 'Buscar en el manual'}
            </button>
            <Link href="/" className={buttonClass('secondary', 'lg')}>
              <Icon name="home" className="size-4.5" />
              {t('takeMeHomeText')}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        {similar.length ? (
          <section aria-labelledby="similares" className="pt-12">
            <h2 id="similares" className="mb-4 font-display text-lg font-bold tracking-[-0.02em] text-fg">
              ¿Buscaba alguna de estas páginas?
            </h2>
            <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
              {similar.map(r => {
                const s = sectionOf(r.ruta);
                return (
                  <li key={r.ruta}>
                    <Link href={r.ruta} className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-bg-soft">
                      <IconTile size="sm" section={s} icon={s ? SECTIONS[s].icon : 'book'} className="mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-fg group-hover:text-brand">{r.titulo}</span>
                        {r.descripcion ? <span className="mt-0.5 line-clamp-1 block text-[13px] text-fg-subtle">{r.descripcion}</span> : null}
                      </span>
                      <Icon name="arrowRight" className="mt-1 size-4 shrink-0 text-fg-faint group-hover:text-brand" strokeWidth={2} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="secciones-404" className="pt-12">
          <h2 id="secciones-404" className="mb-4 font-display text-lg font-bold tracking-[-0.02em] text-fg">
            O empiece por una sección
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map(item => {
              const key = sectionOfNav(item);
              if (!key) return null;
              const link = navLink(item);
              if (!link) return null;
              return (
                <li key={item.text}>
                  <Link href={link} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-[border-color,box-shadow] hover:border-brand/45 hover:shadow-md">
                    <IconTile section={key} icon={SECTIONS[key].icon} />
                    <span className="min-w-0">
                      <span className="block font-display font-semibold text-fg">{item.text}</span>
                      <span className="block truncate text-[12.5px] text-fg-subtle">{SECTIONS[key].blurb}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <SupportBand className="mt-14" />
      </div>
    </main>
  );
}
