import { isExternalUrl, useNav } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import { useEffect, useRef } from 'react';
import { useShell } from '../layout/shell';
import { cn } from '../lib/cn';
import { sectionOfNav } from '../lib/sections';
import { SECTIONS } from '../lib/sections';
import { Icon } from './Icon';
import { Sidebar } from './Sidebar';
import { SocialLinks } from './SocialLinks';
import { ThemeToggle } from './ThemeToggle';
import { NavEntry, useNavActive } from './TopBar';
import type { NavItem } from './TopBar';
import { Eyebrow, IconTile, iconButtonClass } from './ui';

/**
 * Menú móvil (< lg): panel lateral con el buscador, las secciones del manual y el menú de la sección actual.
 * Es un <dialog> modal nativo (foco atrapado, fondo inerte, Esc). Solo se monta al abrirlo; se cierra con Esc,
 * con el fondo, con el botón o al navegar (ShellProvider).
 */
export function MobileMenu() {
  const { menuOpen } = useShell();
  return menuOpen ? <Drawer /> : null;
}

function Drawer() {
  const { setMenuOpen, openSearch } = useShell();
  const nav = useNav() as NavItem[];
  const isActive = useNavActive();
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => setMenuOpen(false);

  useEffect(() => {
    const d = dialog.current;
    const opener = document.activeElement as HTMLElement | null;
    if (d && !d.open) d.showModal();
    d?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (d?.open) d.close();
      opener?.focus?.();
    };
  }, []);

  const row = (active: boolean) =>
    cn(
      'group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[15px] font-medium transition-colors',
      active ? 'bg-brand-tint text-brand' : 'text-fg hover:bg-bg-soft',
    );

  return (
    <dialog
      ref={dialog}
      id="menu-movil"
      aria-label="Menú del manual"
      onCancel={e => {
        e.preventDefault();
        close();
      }}
      onClick={e => e.target === e.currentTarget && close()}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-[rgb(8_9_20/0.5)] backdrop:backdrop-blur-[2px] lg:hidden"
    >
      <div className="flex h-full w-[min(22rem,88vw)] animate-slide-in flex-col bg-bg shadow-2xl">
        <div className="flex h-topbar shrink-0 items-center justify-between gap-2 border-b border-line px-4">
          <span className="font-display text-[15px] font-bold tracking-[-0.02em]">Menú</span>
          <button type="button" onClick={close} aria-label="Cerrar el menú" className={iconButtonClass} data-autofocus>
            <Icon name="close" />
          </button>
        </div>

        <div data-scrollbox className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
          <button
            type="button"
            onClick={() => openSearch()}
            className="mt-4 flex h-11 w-full items-center gap-2.5 rounded-xl border border-line bg-bg-soft px-3.5 text-left text-[15px] text-fg-subtle"
          >
            <Icon name="search" className="size-4.5" strokeWidth={2} />
            Buscar en el manual…
          </button>

          <nav aria-label="Secciones del manual" className="mt-5">
            <Eyebrow className="mb-2 px-2">Secciones</Eyebrow>
            <ul className="space-y-0.5">
              {nav.map(item => {
                const section = sectionOfNav(item);
                if (item.items) {
                  return (
                    <li key={item.text} className="pt-2">
                      <div className="flex items-center gap-3 px-2 py-1.5 text-[15px] font-medium text-fg">
                        <IconTile size="sm" section="referencia" icon={SECTIONS.referencia.icon} />
                        {item.text}
                      </div>
                      <ul className="mt-0.5 ml-5 space-y-0.5 border-l border-line pl-3">
                        {item.items.map(sub => (
                          <li key={sub.text}>
                            <NavEntry
                              item={sub}
                              className={cn(row(isActive(sub)), 'py-1 text-sm')}
                            />
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }
                const external = !!item.link && isExternalUrl(item.link);
                const active = isActive(item);
                return (
                  <li key={item.text}>
                    <Link
                      href={item.link!}
                      className={row(active)}
                      aria-current={active ? 'page' : undefined}
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      <IconTile size="sm" section={section} icon={section ? SECTIONS[section].icon : 'headset'} />
                      <span className="flex-1">{item.text}</span>
                      {external ? <Icon name="external" className="size-4 text-fg-subtle" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-6 border-t border-line pt-5">
            <Sidebar />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-line px-3 py-2">
          <SocialLinks className="flex" />
          <ThemeToggle />
        </div>
      </div>
    </dialog>
  );
}
