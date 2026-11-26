import { isExternalUrl, normalizeImagePath, removeBase, useLocation, useNav, useSite } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useShell } from '../layout/shell';
import { cn } from '../lib/cn';
import { iconFor, splitEmoji } from '../lib/sections';
import { Icon } from './Icon';
import { MobileMenu } from './MobileMenu';
import { SearchButton } from './SearchPalette';
import { SocialLinks } from './SocialLinks';
import { ThemeToggle } from './ThemeToggle';
import { iconButtonClass } from './ui';

export interface NavItem {
  text: string;
  link?: string;
  activeMatch?: string;
  items?: NavItem[];
}

/** ¿El ítem del menú superior corresponde a la página actual? (`activeMatch` de rspress.config.ts o prefijo). */
export function useNavActive() {
  const { pathname } = useLocation();
  const path = decodeURIComponent(removeBase(pathname));
  const match = (item: NavItem): boolean => {
    if (item.items) return item.items.some(match);
    if (!item.link || isExternalUrl(item.link)) return false;
    if (item.activeMatch) return new RegExp(item.activeMatch).test(path);
    const base = item.link.replace(/\.html$/, '').replace(/\/$/, '');
    return path.replace(/\.html$/, '').replace(/\/$/, '') === base;
  };
  return match;
}

const itemClass = (active: boolean) =>
  cn(
    'inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13.5px] font-medium whitespace-nowrap transition-colors',
    active ? 'bg-brand-tint text-brand' : 'text-fg-muted hover:bg-bg-mute hover:text-fg',
  );

/** Enlace de un menú con su icono (o su emoji si no hay icono propio). Lo usan el desplegable y el menú móvil. */
export function NavEntry({ item, className, onKeyDown }: { item: NavItem; className?: string; onKeyDown?: (e: ReactKeyboardEvent) => void }) {
  const [emoji, text] = splitEmoji(item.text);
  const icon = iconFor(item.link, text);
  return (
    <Link href={item.link!} className={className} onKeyDown={onKeyDown}>
      <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-bg-mute text-fg-muted transition-colors group-hover:bg-brand-tint group-hover:text-brand">
        {icon ? <Icon name={icon} className="size-4" /> : <span className="text-sm">{emoji}</span>}
      </span>
      <span>{text}</span>
    </Link>
  );
}

/**
 * Desplegable del menú superior ("Referencia"): botón de divulgación + lista de enlaces.
 * Teclado: Intro/Espacio/↓ abren y llevan al primero, ↑ ↓ Inicio Fin recorren, Esc cierra y devuelve el foco.
 */
function NavDropdown({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const links = () => Array.from(ref.current?.querySelectorAll<HTMLAnchorElement>('ul a') ?? []);
  const focusAt = (i: number) => {
    const all = links();
    all[(i + all.length) % all.length]?.focus();
  };

  const onButtonKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusAt(e.key === 'ArrowDown' ? 0 : -1));
    } else if (e.key === 'Escape') setOpen(false);
  };
  const onListKey = (e: ReactKeyboardEvent) => {
    const all = links();
    const i = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'ArrowDown') focusAt(i + 1);
    else if (e.key === 'ArrowUp') focusAt(i - 1);
    else if (e.key === 'Home') focusAt(0);
    else if (e.key === 'End') focusAt(-1);
    else if (e.key === 'Escape') {
      setOpen(false);
      button.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={button}
        type="button"
        className={itemClass(active)}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={onButtonKey}
      >
        {item.text}
        <Icon name="chevronDown" className={cn('size-3.5 transition-transform', open && 'rotate-180')} strokeWidth={2.25} />
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute top-full right-0 z-50 mt-2 w-72 origin-top-right animate-rise rounded-2xl border border-line bg-surface p-1.5 shadow-[0_24px_48px_-12px_rgb(15_18_40/0.25)] dark:shadow-[0_24px_48px_-12px_rgb(0_0_0/0.6)]"
      >
        <ul onKeyDown={onListKey}>
          {item.items!.map(sub => (
            <li key={sub.text}>
              <NavEntry
                item={sub}
                className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-soft hover:text-fg focus-visible:bg-bg-soft focus-visible:text-fg"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Marca de la barra: isotipo + nombre. */
function Brand() {
  const { site } = useSite();
  const name = site.logoText || site.title;
  return (
    <Link href="/" className="group mr-3 flex shrink-0 items-center gap-2.5 rounded-lg" aria-label={`${name}, ir a la portada`}>
      {site.logo ? (
        <img
          src={normalizeImagePath(String(site.logo))}
          alt=""
          width={56}
          height={29}
          className="h-7 w-auto transition-transform group-hover:-rotate-3 max-sm:h-6"
          decoding="async"
          data-nozoom
        />
      ) : null}
      <span className="font-display text-[15px] font-bold tracking-[-0.025em] text-fg max-[360px]:hidden">{name}</span>
    </Link>
  );
}

/** Barra superior fija: marca, menú principal (lg+), buscador, modo claro/oscuro y redes; en móvil, botón de menú. */
export function TopBar() {
  const nav = useNav() as NavItem[];
  const isActive = useNavActive();
  const { menuOpen, setMenuOpen } = useShell();

  return (
    <>
      <header className="sticky top-0 z-40 h-topbar border-b border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150 print:hidden">
        {/* Filete de marca: violeta → cian. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-brand-600 via-brand-400 to-accent-400" />
        <div className="mx-auto flex h-full max-w-shell items-center gap-1 px-4 sm:px-6">
          <Brand />

          <nav aria-label="Principal" className="hidden items-center gap-0.5 lg:flex">
            {nav.map(item => {
              const active = isActive(item);
              if (item.items) return <NavDropdown key={item.text} item={item} active={active} />;
              const external = !!item.link && isExternalUrl(item.link);
              return (
                <Link
                  key={item.text}
                  href={item.link!}
                  className={itemClass(active)}
                  aria-current={active ? 'page' : undefined}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {item.text}
                  {external ? (
                    <>
                      <Icon name="external" className="size-3.5 opacity-60" strokeWidth={2} />
                      <span className="sr-only"> (se abre en otra pestaña)</span>
                    </>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <SearchButton />
            <ThemeToggle />
            <SocialLinks className="hidden border-l border-line pl-1.5 xl:flex" />
            <button
              type="button"
              className={cn(iconButtonClass, '-mr-1.5 lg:hidden')}
              aria-label="Abrir el menú"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      {/* Fuera del <header>: su backdrop-filter haría de contenedor de los elementos fixed. */}
      <MobileMenu />
    </>
  );
}
