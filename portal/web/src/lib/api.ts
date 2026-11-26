import { ACCESS_EVENT, accessKind } from './access';
import { apiUrl } from './apiBase';
export type Role = 'admin' | 'editor' | 'viewer';
export interface User {
  id: number; username: string; display_name: string; role: Role;
  /** Adenda 5: ausentes en servidores anteriores. */
  twoFactor?: boolean; mustChangePassword?: boolean; mustEnrollTwoFactor?: boolean;
}
export interface PageRow { id: number; route: string; title: string; seccion: string; grupo: string | null; orden: number; status: string; version: number; updated_at: string; updated_by_name?: string | null }
export interface Page extends PageRow { file_path: string; description: string | null; frontmatter: Record<string, unknown>; body: string }
export interface Problem { level: string; message: string; line?: number }
export interface Revision { id: number; version?: number; created_at: string; user_name?: string | null; author?: string | null; title?: string }
export interface StructurePage { id: number; title: string; /** Texto del ítem en el menú del manual (con emoji en la Guía). */ menu?: string; route: string; orden: number; status: string; children?: StructurePage[] }
/** Nodo para guardar el orden anidado (Adenda 2): hasta 3 niveles de páginas. */
export interface OrderNode { id: number; children: OrderNode[] }
export interface StructureGroup { name: string; pages: StructurePage[] }
export interface PageRef { id: number; title: string; route: string; status: string }
export interface StructureSection { key: string; label: string; /** Portada de la sección (/tareas, /problemas…); null si no existe. */ sectionIndex: PageRef | null; grupos: StructureGroup[] }
/** Menú superior del manual: secciones con barra lateral, un desplegable (Referencia) y un enlace externo (Soporte). */
export interface StructureMenuItem { text: string; link: string; page: PageRef | null }
export interface StructureMenu { key: string; text: string; kind: 'section' | 'dropdown' | 'external'; seccion: string | null; extraSecciones: string[]; href: string | null; help: string | null; items: StructureMenuItem[] }
export interface Stats { pages: number; drafts: number; assets: number; users: number; lastPublish: { status: string; finished_at: string } | null; lastBackup: { filename: string; created_at: string } | null; bySeccion: { seccion: string; count: number }[]; unpublished?: { pages: number; assets: number; tours: number; total: number } }
export interface Asset { path: string; size?: number; width?: number; height?: number; mime?: string; created_at?: string }
export interface UploadResult { path: string; width: number; height: number; url: string; snippet: string }
export interface Job { id: number; kind: string; status: string; log: string; started_at: string; finished_at: string | null }
export interface Backup { id: number; filename: string; size: number; created_at: string }
export interface SettingDef { key: string; label: string; help?: string; type: string; secret?: boolean; options?: string[]; min?: number; max?: number }
export interface UserRow extends User { created_at?: string; last_login?: string | null }
export interface AuditRow { id: number; created_at: string; user_name?: string | null; username?: string | null; action: string; target?: string | null; detail?: unknown }

export interface SessionInfo { id?: string | number; createdAt?: string; lastSeenAt?: string; expiresAt?: string }
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) { super(message); this.status = status; this.data = data; }
}

/** Evento global: la sesión caducó o no existe. App lo escucha y muestra el login. */
export const UNAUTH_EVENT = 'portal:unauthorized';
/** Evento global: el servidor exige primero cambiar la contraseña o activar 2FA (403 con `code`). */
export const RESTRICTED_EVENT = 'portal:restricted';
export type RestrictedCode = 'PASSWORD_CHANGE_REQUIRED' | '2FA_ENROLL_REQUIRED';
export { ACCESS_EVENT } from './access';

export async function request<T>(method: string, url: string, body?: unknown, form?: FormData): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} };
  if (form) init.body = form;
  else if (body !== undefined) { (init.headers as Record<string, string>)['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  let res: Response;
  try { res = await fetch(apiUrl(url), init); }
  catch { throw new ApiError(0, 'No se pudo conectar con el servidor del portal.'); }
  const text = await res.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
      ? (data as { error: string }).error : `Error ${res.status}`;
    const rc = res.status === 403 && data && typeof data === 'object' ? (data as { code?: unknown }).code : undefined;
    if (rc === 'PASSWORD_CHANGE_REQUIRED' || rc === '2FA_ENROLL_REQUIRED') window.dispatchEvent(new CustomEvent(RESTRICTED_EVENT, { detail: rc }));
    // Acceso bloqueado por el servidor: responde 404 sin motivo; se muestra un error de conexión genérico.
    if (res.status === 404 && /^\/api\/auth\/(me|login)(\?|$)/.test(url)) throw new ApiError(0, 'No se pudo conectar con el servidor del portal.');
    const ak = accessKind(res.status, url);
    if (ak) window.dispatchEvent(new CustomEvent(ACCESS_EVENT, { detail: { kind: ak, message: msg } }));
    else if (res.status === 401 && !/^\/api\/auth\/(login|password|2fa)/.test(url)) window.dispatchEvent(new Event(UNAUTH_EVENT));
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

const q = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};
const list = <T,>(d: unknown, ...keys: string[]): T[] => {
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === 'object') for (const k of keys) { const v = (d as Record<string, unknown>)[k]; if (Array.isArray(v)) return v as T[]; }
  return [];
};

export const api = {
  login: (username: string, password: string) => request<{ user: User }>('POST', '/api/auth/login', { username, password }),
  logout: () => request<unknown>('POST', '/api/auth/logout'),
  me: () => request<{ user: User; session?: SessionInfo; lastLogin?: { at: string; ip?: string | null } | null }>('GET', '/api/auth/me'),
  changePassword: (current: string, nuevo: string) => request<unknown>('PUT', '/api/auth/password', { current, new: nuevo }),
  stats: () => request<Stats>('GET', '/api/stats'),

  pages: (f: { seccion?: string; q?: string; status?: string; limit?: number; offset?: number }) => request<{ total: number; items: PageRow[] }>('GET', '/api/pages' + q(f)),
  page: (id: number | string) => request<Page>('GET', `/api/pages/${id}`),
  createPage: (b: Record<string, unknown>) => request<Page>('POST', '/api/pages', b),
  savePage: (id: number, b: Record<string, unknown>) => request<Page>('PUT', `/api/pages/${id}`, b),
  movePage: (id: number, b: Record<string, unknown>) => request<Page>('POST', `/api/pages/${id}/move`, b),
  deletePage: (id: number) => request<unknown>('DELETE', `/api/pages/${id}`),
  restorePage: (id: number) => request<unknown>('POST', `/api/pages/${id}/restore`),
  revisions: async (id: number) => list<Revision>(await request<unknown>('GET', `/api/pages/${id}/revisions`), 'items', 'revisions'),
  restoreRevision: (id: number, revId: number) => request<unknown>('POST', `/api/pages/${id}/revisions/${revId}/restore`),
  validate: (body: string, frontmatter: unknown) => request<{ ok: boolean; problems: Problem[] }>('POST', '/api/pages/validate', { body, frontmatter }),

  structure: () => request<{ secciones: StructureSection[]; menu: StructureMenu[] }>('GET', '/api/structure'),
  createGroup: (seccion: string, name: string) => request<unknown>('POST', '/api/structure/groups', { seccion, name }),
  renameGroup: (seccion: string, from: string, to: string) => request<unknown>('PUT', '/api/structure/groups', { seccion, from, to }),
  deleteGroup: (seccion: string, name: string) => request<unknown>('DELETE', '/api/structure/groups', { seccion, name }),
  saveOrder: (seccion: string, grupos: { name: string; nodes: OrderNode[] }[]) => {
    const flat = (n: OrderNode[]): number[] => n.flatMap((x) => [x.id, ...flat(x.children)]);
    // `nodes` anidado (Adenda 2) y `pageIds` plano para servidores anteriores.
    return request<unknown>('PUT', '/api/structure/order', { seccion, grupos: grupos.map((g) => ({ name: g.name, nodes: g.nodes, pageIds: flat(g.nodes) })) });
  },
  sidebar: () => request<unknown>('GET', '/api/structure/guia-sidebar'),
  saveSidebar: (content: unknown) => request<unknown>('PUT', '/api/structure/guia-sidebar', content),

  assets: async (f: { prefix?: string; q?: string }) => list<Asset>(await request<unknown>('GET', '/api/assets' + q(f)), 'items', 'assets'),
  assetUrl: (path: string) => apiUrl('/api/assets/file' + q({ path })),
  uploadAsset: (file: Blob, folder: string, name?: string) => {
    const fd = new FormData();
    fd.append('folder', folder);
    if (name) fd.append('name', name);
    fd.append('file', file, (file as File).name || 'captura.png');
    return request<UploadResult>('POST', '/api/assets', undefined, fd);
  },
  deleteAsset: (path: string) => request<unknown>('DELETE', '/api/assets' + q({ path })),

  settings: () => request<{ settings: Record<string, unknown>; definitions: SettingDef[] }>('GET', '/api/settings'),
  saveSettings: (s: Record<string, unknown>) => request<unknown>('PUT', '/api/settings', s),

  users: async () => list<UserRow>(await request<unknown>('GET', '/api/users'), 'items', 'users'),
  createUser: (b: Record<string, unknown>) => request<UserRow>('POST', '/api/users', b),
  updateUser: (id: number, b: Record<string, unknown>) => request<UserRow>('PUT', `/api/users/${id}`, b),
  deleteUser: (id: number) => request<unknown>('DELETE', `/api/users/${id}`),

  audit: async (f: { limit?: number; offset?: number; action?: string }) => {
    const d = await request<unknown>('GET', '/api/audit' + q(f));
    return { items: list<AuditRow>(d, 'items', 'rows', 'audit'), total: (d && typeof d === 'object' && 'total' in d) ? Number((d as { total: number }).total) : undefined };
  },

  importRepo: (overwrite: 'unedited' | 'all') => request<{ jobId: number }>('POST', '/api/import', { overwrite }),
  job: (id: number) => request<Job>('GET', `/api/jobs/${id}`),
  jobs: async (kind?: string, limit = 10) => list<Job>(await request<unknown>('GET', '/api/jobs' + q({ kind, limit })), 'items', 'jobs'),
  publish: () => request<{ jobId: number }>('POST', '/api/publish'),
  publishStatus: () => request<Record<string, unknown>>('GET', '/api/publish/status'),

  backups: async () => list<Backup>(await request<unknown>('GET', '/api/backups'), 'items', 'backups'),
  createBackup: () => request<{ id: number; filename: string; size: number }>('POST', '/api/backups'),
  backupUrl: (id: number) => apiUrl(`/api/backups/${id}/download`),
  deleteBackup: (id: number) => request<unknown>('DELETE', `/api/backups/${id}`),
  restoreBackup: (id: number) => request<unknown>('POST', `/api/backups/${id}/restore`, { confirm: 'RESTAURAR' }),
};
