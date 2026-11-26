/* Rutas del portal (router por hash). Una sola fuente para el menú, las migas y la paleta. */
import { DatabaseBackup, FileText, FilePen, Globe, House, Images, ListTree, Route as RouteIcon, ScrollText, Settings2, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/api';
import { usePath } from '@/lib/util';
import { SITE_PATH, settingsSection, type SettingsSection } from './paths';

export { legacyRedirect, settingsPath, settingsSection, SETTINGS_SECTIONS, SITE_PATH, type SettingsSection } from './paths';

export type RouteName = 'home' | 'content' | 'pages' | 'structure' | 'images' | 'tours' | 'drafts' | 'site' | 'backups' | 'settings' | 'users' | 'audit' | 'account' | 'notfound';
export interface Route { name: RouteName; id?: number; path: string; section?: SettingsSection }

export interface NavItem { name: RouteName; path: string; label: string; icon: LucideIcon; min: Role; soon?: boolean }
export interface NavGroup { section: string | null; items: NavItem[] }

export const NAV: NavGroup[] = [
  { section: null, items: [{ name: 'home', path: '/', label: 'Inicio', icon: House, min: 'viewer' }] },
  { section: 'Contenido', items: [
    { name: 'content', path: '/contenido', label: 'Páginas', icon: FileText, min: 'viewer' },
    { name: 'structure', path: '/estructura', label: 'Estructura', icon: ListTree, min: 'viewer' },
    { name: 'images', path: '/imagenes', label: 'Imágenes', icon: Images, min: 'viewer' },
    { name: 'tours', path: '/tours', label: 'Tours', icon: RouteIcon, min: 'viewer' },
  ] },
  { section: 'Publicación', items: [
    { name: 'drafts', path: '/borradores', label: 'Borradores', icon: FilePen, min: 'viewer' },
    { name: 'site', path: SITE_PATH, label: 'Manual publicado', icon: Globe, min: 'viewer' },
    { name: 'backups', path: '/respaldos', label: 'Respaldos', icon: DatabaseBackup, min: 'admin' },
  ] },
  { section: 'Administración', items: [
    { name: 'users', path: '/usuarios', label: 'Usuarios', icon: Users, min: 'admin' },
    { name: 'audit', path: '/auditoria', label: 'Auditoría', icon: ScrollText, min: 'admin' },
    { name: 'settings', path: '/ajustes', label: 'Ajustes', icon: Settings2, min: 'admin' },
  ] },
];
export const NAV_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, section: g.section })));

const BY_SEG: Record<string, RouteName> = {
  contenido: 'content', paginas: 'pages', estructura: 'structure', imagenes: 'images', tours: 'tours',
  borradores: 'drafts', manual: 'site', respaldos: 'backups', ajustes: 'settings', usuarios: 'users', auditoria: 'audit', cuenta: 'account',
};

export function parseRoute(path: string): Route {
  const seg = path.split('/').filter(Boolean);
  if (!seg.length) return { name: 'home', path };
  // Compatibilidad: #/paginas/12 → editor del espacio de contenido.
  if (seg[0] === 'paginas' && seg[1]) return { name: 'content', id: Number(seg[1]), path };
  const name = BY_SEG[seg[0]!];
  if (!name) return { name: 'notfound', path };
  if ((name === 'content' || name === 'tours') && seg[1]) return { name, id: Number(seg[1]) || undefined, path };
  if (name === 'settings') return { name, path, section: settingsSection(seg[1]) };
  return { name, path };
}

export const useRoute = () => parseRoute(usePath());
