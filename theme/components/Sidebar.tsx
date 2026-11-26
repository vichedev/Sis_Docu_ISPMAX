import { removeBase, useActiveMatcher, useLocation, useNav, useSidebar } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { SECTIONS, sectionOf, splitEmoji } from '../lib/sections';
import { Icon } from './Icon';
import type { NavItem } from './TopBar';
import { useNavActive } from './TopBar';
import { IconTile } from './ui';

/** Elemento del menú tal como lo entrega `useSidebar()` (rspress.config.ts → docs/_nav.json). */
interface Item {
  text: string;
  link?: string;
  tag?: string;
  items?: Item[];
  collapsed?: boolean;
}
type Raw = Item | { sectionHeaderText: string } | { dividerType: string };

export interface Group {
  header?: string;
  items: Item[];
}

/** Agrupa la lista plana de Rspress ({sectionHeaderText}, ítems, …) en grupos con encabezado. */
export function toGroups(raw: Raw[]): Group[] {
  const groups: Group[] = [];
  for (const entry of raw) {
    if ('sectionHeaderText' in entry) groups.push({ header: entry.sectionHeaderText, items: [] });
    else if ('dividerType' in entry) continue;
    else {
      if (!groups.length) groups.push({ items: [] });
      groups[groups.length - 1].items.push(entry);
    }
  }
  return groups.filter(g => g.items.length);
}

function contains(item: Item, isActive: (link: string) => boolean): boolean {
  return (!!item.link && isActive(item.link)) || (item.items ?? []).some(i => contains(i, isActive));
}

/** Por encima de este número de páginas, la sección arranca con los grupos plegados salvo el de la página actual. */
const FOLD_OVER = 40;

function SidebarItem({ item, depth }: { item: Item; depth: number }) {
  const isActive = useActiveMatcher();
  const active = !!item.link && isActive(item.link);
  const hasChildren = !!item.items?.length;
  const [open, setOpen] = useState(() => !item.collapsed || contains(item, isActive));
  const [emoji, text] = splitEmoji(item.text);

  const label = (
    <span className="flex min-w-0 flex-1 items-start gap-2">
      {emoji ? (
        <span aria-hidden="true" className="w-4.5 shrink-0 text-center text-[13px] leading-[1.45rem]">
          {emoji}
        </span>
      ) : null}
      <span className="min-w-0">
        {text}
        {item.tag ? <span className="ml-1.5 rounded bg-brand-tint px-1 text-[10px] font-semibold text-brand uppercase">{item.tag}</span> : null}
      </span>
    </span>
  );
  const row = cn(
    'relative flex w-full items-start rounded-lg px-2.5 py-[5px] text-left text-[13.5px] leading-[1.45rem] transition-colors',
    active
      ? 'bg-brand-tint font-semibold text-brand before:absolute before:inset-y-1.5 before:-left-px before:w-[3px] before:rounded-full before:bg-brand'
      : 'text-fg-muted hover:bg-bg-mute/70 hover:text-fg',
  );

  return (
    <li>
      <div className="flex items-start">
        {item.link ? (
          <Link href={item.link} className={row} aria-current={active ? 'page' : undefined}>
            {label}
          </Link>
        ) : (
          <button type="button" className={row} onClick={() => setOpen(!open)} aria-expanded={open}>
            {label}
          </button>
        )}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? `Plegar ${text}` : `Desplegar ${text}`}
            className="mt-0.5 rounded-md p-1.5 text-fg-subtle hover:bg-bg-mute hover:text-fg"
          >
            <Icon name="chevronRight" className={cn('size-3.5 transition-transform', open && 'rotate-90')} strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <ul className={cn('mt-0.5 space-y-px border-l border-line pl-2', depth === 0 ? 'ml-3' : 'ml-2')}>
          {item.items!.map(child => (
            <SidebarItem key={child.link ?? child.text} item={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Nombre e icono de la sección actual (encabeza el menú lateral). */
function SectionHeading() {
  const { pathname } = useLocation();
  const nav = useNav() as NavItem[];
  const isActive = useNavActive();
  const key = sectionOf(decodeURIComponent(removeBase(pathname)));
  if (!key) return null;
  const item = nav.find(i => isActive(i));
  const label = item?.text ?? key;
  return (
    <div className="mb-5 flex items-center gap-2.5 px-1.5">
      <IconTile size="sm" section={key} icon={SECTIONS[key].icon} />
      <div className="min-w-0">
        <p className="font-display text-[14px] leading-tight font-bold text-fg">{label}</p>
        <p className="truncate text-[11.5px] text-fg-subtle">{SECTIONS[key].blurb}</p>
      </div>
    </div>
  );
}

/**
 * Menú lateral de la sección actual (/guia/, /tareas/, …): grupos plegables con encabezado, página activa marcada
 * (aria-current) y llevada a la vista dentro del menú al cargar y al navegar. Secciones largas (> 40 páginas)
 * arrancan con los grupos plegados salvo el de la página actual.
 */
export function Sidebar({ heading = true }: { heading?: boolean }) {
  const groups = toGroups(useSidebar() as Raw[]);
  const isActive = useActiveMatcher();
  const { pathname } = useLocation();
  const uid = useId();
  const nav = useRef<HTMLElement>(null);
  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);
  const activeGroup = groups.findIndex(g => g.items.some(i => contains(i, isActive)));
  const key = (g: Group, i: number) => `${g.header ?? ''}-${i}`;

  const [closed, setClosed] = useState<Set<string>>(() =>
    total > FOLD_OVER ? new Set(groups.map(key).filter((_, i) => i !== activeGroup)) : new Set(),
  );

  // Al navegar, el grupo de la página actual se despliega y la página se lleva a la vista dentro del menú.
  useEffect(() => {
    if (activeGroup >= 0) {
      const k = key(groups[activeGroup], activeGroup);
      setClosed(prev => (prev.has(k) ? new Set([...prev].filter(x => x !== k)) : prev));
    }
    requestAnimationFrame(() => {
      const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
      const box = el?.closest<HTMLElement>('[data-scrollbox]');
      if (!el || !box) return;
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top;
      if (top < 80 || top > box.clientHeight - 80) box.scrollTop += top - box.clientHeight / 3;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!groups.length) return null;
  const toggle = (k: string) =>
    setClosed(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <nav ref={nav} aria-label="Páginas de esta sección" data-sidebar>
      {heading ? <SectionHeading /> : null}
      <div className="space-y-4">
        {groups.map((g, i) => {
          const k = key(g, i);
          const open = !closed.has(k);
          const listId = `${uid}-l${i}`;
          return (
            <section key={k} aria-labelledby={g.header ? `${uid}-g${i}` : undefined}>
              {g.header ? (
                <div className="mb-1">
                  <button
                    type="button"
                    id={`${uid}-g${i}`}
                    onClick={() => toggle(k)}
                    aria-expanded={open}
                    aria-controls={listId}
                    className="group flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-left font-display text-[11px] font-bold tracking-[0.08em] text-fg-subtle uppercase transition-colors hover:text-fg"
                  >
                    <span className="min-w-0 flex-1">{g.header}</span>
                    {!open ? <span className="text-[10.5px] font-semibold tracking-normal normal-case">{g.items.length}</span> : null}
                    <Icon name="chevronDown" className={cn('size-3.5 shrink-0 opacity-60 transition-transform group-hover:opacity-100', !open && '-rotate-90')} strokeWidth={2.25} />
                  </button>
                </div>
              ) : null}
              <ul id={listId} hidden={!open} className="space-y-px">
                {g.items.map(item => (
                  <SidebarItem key={item.link ?? item.text} item={item} depth={0} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </nav>
  );
}
