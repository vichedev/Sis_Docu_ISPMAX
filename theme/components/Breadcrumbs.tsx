import { removeBase, useActiveMatcher, useLocation, useNav, usePage, usePages, useSidebar } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import { Fragment } from 'react';
import { cn } from '../lib/cn';
import { SECTIONS, sectionOf, splitEmoji } from '../lib/sections';
import type { SectionKey } from '../lib/sections';
import { Icon } from './Icon';
import { toGroups } from './Sidebar';
import type { NavItem } from './TopBar';
import { useNavActive } from './TopBar';

/** Ruta comparable: sin .html, sin /index y sin barra final. */
const norm = (r: string) => r.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/';

export interface Crumb {
  text: string;
  /** Ruta sin base (para <Link>); sin enlace en los niveles que no tienen página propia (grupos del menú). */
  link?: string;
  section?: SectionKey | null;
}

/**
 * Migas de pan de la página actual: Inicio › sección del menú superior › grupo del menú lateral › página.
 * Exportado para reutilizarlo (p. ej. datos estructurados BreadcrumbList en theme/seo/).
 */
export function useBreadcrumbs(): Crumb[] {
  const { page } = usePage();
  const { pages } = usePages();
  const { pathname } = useLocation();
  const nav = useNav() as NavItem[];
  const isNavActive = useNavActive();
  const isActive = useActiveMatcher();
  const groups = toGroups(useSidebar() as never);
  const path = decodeURIComponent(removeBase(pathname)).replace(/\.html$/, '');
  const section = sectionOf(path);
  const exists = (route: string) => pages.some(p => p.routePath === route || p.routePath === route.replace(/\/$/, ''));

  const crumbs: Crumb[] = [{ text: 'Inicio', link: '/' }];
  const navItem = nav.find(i => isNavActive(i));
  if (navItem) {
    const link = navItem.link ?? (section === 'referencia' && exists('/referencia/') ? '/referencia/' : undefined);
    crumbs.push({ text: splitEmoji(navItem.text)[1], link, section });
  } else if (section === 'referencia') {
    const ref = nav.find(i => i.items);
    if (ref) crumbs.push({ text: ref.text, link: exists('/referencia/') ? '/referencia/' : undefined, section });
  }
  const group = groups.find(g => g.items.some(i => i.link && isActive(i.link)));
  if (group?.header && group.header !== crumbs[crumbs.length - 1].text) crumbs.push({ text: group.header, section });
  const title = page.title || '';
  // La página no se repite si es la misma que la de la sección (p. ej. /tareas/).
  const last = crumbs[crumbs.length - 1];
  const same = last.link && norm(last.link) === norm(path);
  if (title && !same && !(crumbs.length > 1 && last.text === title)) crumbs.push({ text: title, link: path, section });
  return crumbs;
}

/** Migas de pan visibles encima del título (el último nivel es la página actual: aria-current). */
export function Breadcrumbs() {
  const crumbs = useBreadcrumbs();
  if (crumbs.length < 2) return null;
  return (
    <nav aria-label="Migas de pan" className="mb-5 print:hidden">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[12.5px] text-fg-subtle">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const tone = c.section ? SECTIONS[c.section] : null;
          const content =
            i === 0 ? (
              <>
                <Icon name="home" className="size-3.5" strokeWidth={2} />
                <span className="sr-only">{c.text}</span>
              </>
            ) : i === 1 && tone ? (
              <>
                <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone.dot)} />
                {c.text}
              </>
            ) : (
              c.text
            );
          return (
            <Fragment key={`${c.text}-${i}`}>
              <li className={cn('inline-flex min-w-0 items-center', last ? 'max-w-full' : '', i === 2 && !last ? 'max-sm:hidden' : '')}>
                {last ? (
                  <span aria-current="page" className="truncate font-medium text-fg-muted">
                    {content}
                  </span>
                ) : c.link ? (
                  <Link
                    href={c.link}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-bg-mute hover:text-fg',
                      i === 0 && '-ml-1',
                      i === 1 && 'font-semibold',
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <span className={cn('inline-flex items-center gap-1.5 px-1', i === 1 && 'font-semibold')}>{content}</span>
                )}
              </li>
              {!last ? (
                <li aria-hidden="true" className={cn('text-fg-faint', i === 2 ? 'max-sm:hidden' : '')}>
                  <Icon name="chevronRight" className="size-3" strokeWidth={2.25} />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
