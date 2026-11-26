/*
 * Marco de la aplicación: navegación lateral (o carril de iconos en el espacio de contenido),
 * barra superior con migas, búsqueda (Ctrl+K), estado del manual (chip), Borradores y menú de usuario.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Dialog as D } from 'radix-ui';
import { CircleHelp, CloudDownload, ExternalLink, FilePen, Info, RefreshCw, FilePlus, ImagePlus, KeyRound, ListTree, LogOut, Menu as MenuIcon, Monitor, Moon, Search, Sun } from 'lucide-react';
import { Avatar, Breadcrumbs, Button, CommandPalette, Dialog, DropdownMenu, Kbd, useToast, type Command, type Crumb } from '@/components/ui';
import { api } from '@/lib/api';
import { can, errText, useAuth } from '@/lib/auth';
import { siteApi } from '@/lib/api.site';
import { useHotkeys, useLocalStorage } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';
import { ROLE_LABEL, go } from '@/lib/util';
import { cn } from '@/lib/cn';
import { NAV_ITEMS, type Route } from '@/routes';
import { Coach } from '@/features/onboarding/Coach';
import { useOnboarding } from '@/features/onboarding/useOnboarding';
import { DraftsLink, SiteChip, useSite } from '@/features/system/site';
import { AppSidebar } from './AppSidebar';
import { CrumbsCtx } from './Page';
import { siteHref } from '@/lib/siteHref';

function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const rows: [ReactNode, string][] = [
    [<><Kbd>Ctrl</Kbd><Kbd>K</Kbd></>, 'Buscar páginas y acciones'],
    [<><Kbd>Ctrl</Kbd><Kbd>S</Kbd></>, 'Guardar la página'],
    [<><Kbd>Ctrl</Kbd><Kbd>B</Kbd></>, 'Negrita en el editor'],
    [<><Kbd>↑</Kbd><Kbd>↓</Kbd><Kbd>←</Kbd><Kbd>→</Kbd></>, 'Moverse por el árbol de páginas'],
    [<><Kbd>Espacio</Kbd> y flechas</>, 'Mover una página con el asa del árbol'],
    [<Kbd>Esc</Kbd>, 'Cerrar diálogos y menús'],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm" title="Atajos de teclado">
      <dl className="m-0 divide-y divide-line">
        {rows.map(([k, d], i) => <div key={i} className="flex items-center justify-between gap-4 py-2"><dd className="m-0 text-ink-2">{d}</dd><dt className="flex gap-1">{k}</dt></div>)}
      </dl>
    </Dialog>
  );
}

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { user, setUser } = useAuth();
  const { status: site, refresh } = useSite();
  const toast = useToast();
  const { pref, setPref, isDark } = useTheme();
  const tour = useOnboarding();
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [keys, setKeys] = useState(false);
  const [railPref, setRailPref] = useLocalStorage('portal-nav-rail', false);
  const workspace = route.name === 'content';
  const rail = workspace || railPref;
  useHotkeys({ 'mod+k': () => setPalette((p) => !p) });

  const nav = NAV_ITEMS.find((n) => n.name === route.name);
  const defaultCrumbs: Crumb[] = route.name === 'home' || !nav ? [{ label: 'Inicio' }] : [...(nav.section ? [{ label: nav.section }] : []), { label: nav.label }];
  const crumbsFallback: Crumb[] = route.name === 'account' ? [{ label: 'Mi cuenta' }] : defaultCrumbs;
  const name = user.display_name || user.username;
  const logout = async () => { try { await api.logout(); } catch { /* ya sin sesión */ } setUser(null); };

  const commands = useMemo<Command[]>(() => {
    const l: Command[] = [];
    if (can(user, 'editor')) {
      l.push({ id: 'new', label: 'Crear página', icon: <FilePlus size={16} />, run: () => go('/contenido?nueva=1'), keywords: 'nueva alta' });
      l.push({ id: 'up', label: 'Subir imagen', icon: <ImagePlus size={16} />, run: () => go('/imagenes?subir=1'), keywords: 'captura figura' });
    }
    l.push({ id: 'account', group: 'Preferencias', label: 'Mi cuenta: contraseña, 2FA y sesiones', icon: <KeyRound size={16} />, run: () => go('/cuenta'), keywords: 'contraseña seguridad verificación dos pasos sesiones perfil' });
    l.push({ id: 'drafts', label: 'Ver los borradores', icon: <FilePen size={16} />, run: () => go('/borradores'), keywords: 'publicar nuevas páginas' });
    if (can(user, 'admin')) {
      l.push({ id: 'sys', label: 'Actualizar el sistema', icon: <CloudDownload size={16} />, run: () => go('/ajustes/sistema'), keywords: 'ajustes versión novedades reiniciar código' });
      l.push({ id: 'info', label: 'Información del sistema', icon: <Info size={16} />, run: () => go('/ajustes/info'), keywords: 'ajustes soporte versión docker base de datos copiar' });
    }
    if (can(user, 'editor')) l.push({ id: 'rebuild', label: 'Actualizar el manual ahora', icon: <RefreshCw size={16} />, run: () => { siteApi.rebuild().then(() => { toast('Actualizando el manual…', 'info'); refresh(); }).catch((e: unknown) => toast(errText(e), 'error')); }, keywords: 'reconstruir publicar sitio' });
    l.push({ id: 'list', label: 'Ver todas las páginas en una tabla', icon: <ListTree size={16} />, run: () => go('/paginas'), keywords: 'lista filtrar borradores' });
    for (const n of NAV_ITEMS) if (!n.soon && can(user, n.min)) { const I = n.icon; l.push({ id: `nav${n.path}`, group: 'Ir a', label: n.label, icon: <I size={16} />, run: () => go(n.path) }); }
    l.push({ id: 'site', group: 'Ir a', label: 'Ver el manual (pestaña nueva)', icon: <ExternalLink size={16} />, run: () => window.open(siteHref('', site?.siteUrl), '_blank', 'noopener,noreferrer') });
    l.push({ id: 'theme', group: 'Preferencias', label: 'Cambiar entre modo claro y oscuro', icon: <Moon size={16} />, run: () => setPref(isDark() ? 'light' : 'dark'), keywords: 'tema' });
    l.push({ id: 'tour', group: 'Preferencias', label: 'Ver el recorrido guiado', icon: <CircleHelp size={16} />, run: () => void tour.start(), keywords: 'ayuda tutorial' });
    return l;
  }, [user, setPref, isDark, tour, site?.siteUrl, toast, refresh]);

  const sidebarProps = { active: route.name, onTour: () => { setDrawer(false); void tour.start(); }, onShortcuts: () => setKeys(true) };

  return (
    <CrumbsCtx.Provider value={setCrumbs}>
      <div className="flex min-h-screen">
        <a href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById('contenido')?.focus(); }}
          className="fixed -top-10 left-2 z-[2000] rounded-md bg-accent px-3 py-2 text-accent-fg focus:top-2">Saltar al contenido</a>

        <aside aria-label="Navegación principal" className={cn('sticky top-0 z-40 h-screen shrink-0 border-r border-line max-md:hidden', rail ? 'w-14' : 'w-[236px]')}>
          <AppSidebar rail={rail} onToggleRail={workspace ? undefined : () => setRailPref(!railPref)} {...sidebarProps} />
        </aside>

        <D.Root open={drawer} onOpenChange={setDrawer}>
          <D.Portal>
            <D.Overlay className="fixed inset-0 z-[800] bg-scrim md:hidden" />
            <D.Content aria-label="Navegación principal" className="fixed inset-y-0 left-0 z-[801] w-[260px] border-r border-line shadow-pop focus:outline-none md:hidden" onClick={(e) => { if ((e.target as HTMLElement).closest('a[href^="#"]')) setDrawer(false); }}>
              <D.Title className="sr-only">Navegación principal</D.Title>
              <D.Description className="sr-only">Secciones del portal</D.Description>
              <AppSidebar rail={false} {...sidebarProps} />
            </D.Content>
          </D.Portal>
        </D.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-2.5 border-b border-line bg-bg pl-6 pr-4 max-md:gap-1.5 max-md:px-3">
            <Button variant="ghost" size="icon" className="-ml-1.5 md:hidden" aria-label="Abrir menú" onClick={() => setDrawer(true)}><MenuIcon size={18} /></Button>
            <Breadcrumbs className="flex-1" items={crumbs ?? crumbsFallback} />
            <button type="button" data-coach="search" onClick={() => setPalette(true)} aria-label="Buscar páginas y acciones (Ctrl+K)"
              className="flex h-8 w-60 cursor-pointer items-center gap-2 rounded-md border border-line bg-subtle pl-2.5 pr-1.5 text-[13.5px] text-ink-3 hover:border-line-strong hover:text-ink-2 max-lg:w-8 max-lg:justify-center max-lg:border-transparent max-lg:bg-transparent max-lg:p-0">
              <Search size={16} /><span className="flex-1 text-left max-lg:hidden">Buscar…</span><span className="flex gap-0.5 max-lg:hidden"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
            </button>
            <DraftsLink />
            <SiteChip />
            <DropdownMenu label="Menú de usuario" header={<><strong className="text-[13.5px] font-semibold">{name}</strong><small className="text-[12.5px] text-ink-3">{user.username} · {ROLE_LABEL[user.role]}</small></>}
              trigger={<button type="button" aria-label="Menú de usuario" className="grid cursor-pointer place-items-center rounded-full p-0.5 data-[state=open]:[&>span]:border-ink-4 hover:[&>span]:border-ink-4"><Avatar name={name} /></button>}
              items={[
                { radio: { value: pref, onValueChange: (v) => setPref(v as typeof pref), options: [
                  { value: 'light', label: 'Claro', icon: <Sun size={16} /> }, { value: 'dark', label: 'Oscuro', icon: <Moon size={16} /> }, { value: 'system', label: 'Según el sistema', icon: <Monitor size={16} /> },
                ] } },
                { separator: true },
                { label: 'Mi cuenta', icon: <KeyRound size={16} />, onSelect: () => go('/cuenta') },
                { label: 'Cerrar sesión', icon: <LogOut size={16} />, onSelect: () => void logout() },
              ]} />
          </header>
          <main id="contenido" tabIndex={-1} className={cn('flex min-w-0 flex-1 flex-col focus:outline-none', workspace && 'max-lg:block')}>{children}</main>
        </div>

        <CommandPalette open={palette} onOpenChange={setPalette} commands={commands} />
        <ShortcutsDialog open={keys} onOpenChange={setKeys} />
        {tour.steps && <Coach steps={tour.steps} onClose={tour.close} />}
      </div>
    </CrumbsCtx.Provider>
  );
}
