import { useEffect, useState } from 'react';

/** Router mínimo por hash (`#/paginas/12?x=1`): sin dependencias ni fallback de servidor. */
const read = () => (window.location.hash.replace(/^#/, '') || '/').split('?')[0];
export function usePath(): string {
  const [p, setP] = useState(read());
  useEffect(() => {
    const f = () => setP(read());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return p;
}
export const go = (path: string) => { window.location.hash = path; };
/** Lee un parámetro de la parte `?…` del hash. */
export const hashParam = (name: string) => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get(name) ?? '';
/** Quita los parámetros del hash sin crear una entrada de historial. */
export const clearHashParams = () => {
  const h = window.location.hash.split('?')[0];
  if (h !== window.location.hash) history.replaceState(null, '', h || '#/');
};

export const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(+d) ? s : d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
};
export const fmtTime = (s?: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(+d) ? '' : d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
};
export const fmtDay = (s?: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(+d)) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((+today - +day) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};
/** Tiempo relativo corto: "hace 5 min", "hace 2 h", "hace 3 días". */
export const relTime = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(+d)) return s;
  const sec = Math.round((Date.now() - +d) / 1000);
  if (sec < 45) return 'ahora mismo';
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  if (days < 7) return days === 1 ? 'ayer' : `hace ${days} días`;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
};
export const fmtSize = (n?: number) => {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
};
export const SECCIONES: Record<string, string> = { tareas: 'Tareas', guia: 'Guía', problemas: 'Problemas', preguntas: 'Preguntas', referencia: 'Referencia', conceptos: 'Conceptos' };
export const TIPOS = ['tarea', 'guia', 'problema', 'pregunta', 'referencia', 'concepto'] as const;
export const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };
export const ROLE_LABEL = { admin: 'Administrador', editor: 'Editor', viewer: 'Lector' } as const;
export const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', published: 'Publicada' };
export const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/** Estado de un trabajo (publicación, Git, importación) normalizado. */
export const jobState = (s?: string) =>
  s === 'ok' || s === 'success' || s === 'done' ? 'ok' : s === 'running' || s === 'queued' || s === 'pending' ? 'running' : s ? 'error' : 'none';

/* ---------- Almacenamiento local (solo comodidades por navegador) ---------- */
export const store = {
  get<T>(key: string, def: T): T { try { const v = localStorage.getItem(key); return v == null ? def : (JSON.parse(v) as T); } catch { return def; } },
  set(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};
export interface RecentPage { id: number; title: string; route: string; at: string }
const RECENT_KEY = 'portal-recent-pages';
export const recentPages = () => store.get<RecentPage[]>(RECENT_KEY, []);
export const pushRecent = (p: Omit<RecentPage, 'at'>) => {
  const l = recentPages().filter((x) => x.id !== p.id);
  store.set(RECENT_KEY, [{ ...p, at: new Date().toISOString() }, ...l].slice(0, 8));
};

/** Quita una página de «Abiertas hace poco» (al eliminarla o si ya no existe). */
export const forgetRecent = (id: number) => store.set(RECENT_KEY, recentPages().filter((x) => x.id !== id));

/** Aviso global para que la barra superior refresque el contador de cambios sin publicar. */
export const STATS_EVENT = 'portal:stats';
export const statsChanged = () => window.dispatchEvent(new Event(STATS_EVENT));

/** Acciones de auditoría en lenguaje llano (verbo en pasado). */
export const ACTION_LABEL: Record<string, string> = {
  'page.create': 'creó la página', 'page.update': 'editó la página', 'page.delete': 'eliminó la página', 'page.restore': 'recuperó la página',
  'page.move': 'movió la página', 'page.revision_restore': 'restauró una revisión de',
  'asset.upload': 'subió la imagen', 'asset.delete': 'eliminó la imagen',
  'structure.reorder': 'reordenó la estructura de', 'structure.order': 'reordenó la estructura de', 'structure.sidebar': 'editó la barra lateral de la guía',
  'publish': 'publicó el manual', 'git.update': 'actualizó desde Git', 'git.remote': 'configuró el remoto de Git',
  'page.publish': 'publicó', 'page.unpublish': 'pasó a borrador', 'system.update': 'actualizó el sistema', 'system.restart': 'reinició el sistema',
  'backup.create': 'creó un respaldo', 'backup.delete': 'eliminó un respaldo', 'backup.restore': 'restauró un respaldo',
  'settings.update': 'cambió los ajustes', 'user.create': 'creó el usuario', 'user.update': 'modificó el usuario', 'user.delete': 'eliminó el usuario',
  'auth.login': 'inició sesión', 'auth.login_failed': 'falló al iniciar sesión', 'auth.password': 'cambió su contraseña',
  'tour.create': 'creó el tour', 'tour.update': 'editó el tour', 'tour.delete': 'eliminó el tour', 'tour.restore': 'recuperó el tour',
};
export const ACTION_GROUPS: { label: string; actions: string[] }[] = [
  { label: 'Páginas', actions: ['page.create', 'page.update', 'page.move', 'page.delete', 'page.restore', 'page.revision_restore'] },
  { label: 'Imágenes', actions: ['asset.upload', 'asset.delete'] },
  { label: 'Estructura', actions: ['structure.reorder', 'structure.sidebar'] },
  { label: 'Tours', actions: ['tour.create', 'tour.update', 'tour.delete', 'tour.restore'] },
  { label: 'Publicación y sistema', actions: ['page.publish', 'page.unpublish', 'publish', 'system.update', 'system.restart', 'git.update', 'git.remote'] },
  { label: 'Respaldos', actions: ['backup.create', 'backup.restore', 'backup.delete'] },
  { label: 'Administración', actions: ['settings.update', 'user.create', 'user.update', 'user.delete'] },
  { label: 'Sesiones', actions: ['auth.login', 'auth.login_failed', 'auth.password'] },
];

/** Aviso global: cambió el contenido (árbol, títulos, estados). Refresca árbol y contador. */
export const CONTENT_EVENT = 'portal:content';
export const contentChanged = () => { window.dispatchEvent(new Event(CONTENT_EVENT)); statsChanged(); };

export const TIPO_POR_SECCION: Record<string, string> = { tareas: 'tarea', guia: 'guia', problemas: 'problema', preguntas: 'pregunta', referencia: 'referencia', conceptos: 'concepto' };
