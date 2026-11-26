/* Cliente de la API del sitio, de los borradores y del sistema (Adenda 3 de CONTRACT.md). */
import { apiUrl } from './apiBase';
import { ApiError, UNAUTH_EVENT, type Job, type Page, type Problem } from './api';

export type SiteState = 'live' | 'idle' | 'pending' | 'building' | 'error';
export interface SiteLastBuild { status: string; finishedAt: string | null; durationMs: number | null; pages: number | null; jobId: number | null; error?: string | null }
export interface SiteStatus {
  /** `dynamic`: el servidor dibuja el manual en vivo (sin reconstrucciones); `static` (o ausente): se reconstruye tras guardar. Ver `lib/siteModel.ts`. */
  mode?: 'dynamic' | 'static';
  state: SiteState;
  live?: boolean;
  cache?: { pages?: number; compiled?: number; htmlCached?: number; bytes?: number };
  themeBuiltAt?: string | null;
  lastChange?: { route: string; at: string } | null;
  message?: string;
  /** Solo modo estático: pueden faltar en modo en vivo. */
  pendingReasons?: string[];
  nextRunInMs?: number | null;
  building?: { jobId: number | null; startedAt: string } | null;
  lastBuild?: SiteLastBuild | null;
  drafts: number;
  siteUrl: string;
  autoPublish?: boolean;
  delayMs?: number;
  siteExists?: boolean;
  servedBase?: string;
  restartRequired?: boolean;
}

export interface UpdateResult {
  ok: boolean; updated: boolean; from: string | null; to: string | null; files: number;
  steps: { step: string; status: string; detail?: string }[]; failedStep: string | null; merged: boolean; needsRestart: boolean;
}
export type UpdateMode = 'git' | 'entrypoint' | string;
/** GET /api/system/version. Ya no trae `repoPath` ni `remote`: el panel no muestra datos de Git (los gestiona «Actualizar el sistema»). */
export interface SystemVersion {
  initialized: boolean; branch: string | null; commit: string | null; shortCommit?: string | null; subject: string | null; date: string | null;
  clean: boolean | null; behind: number | null; ahead: number | null; canUpdate: boolean; message?: string;
  changedFiles?: string[]; restartMode: 'exit' | 'respawn'; needsRestart: boolean;
  /** `entrypoint` (Docker): la actualización solo trae el código y pide reiniciar; el contenedor instala y compila al arrancar. */
  updateMode?: UpdateMode;
  lastUpdate: { jobId: number; status: string; startedAt: string; finishedAt: string | null; result: UpdateResult | null } | null;
}
/** GET /api/system/info (solo admin). Todo opcional: el servidor puede no tenerlo aún. */
export interface SystemInfo {
  version?: Partial<SystemVersion> | string | null;
  runtime?: { node?: string | null; platform?: string | null; docker?: boolean | null; uptimeSec?: number | null };
  database?: { connected?: boolean | null; name?: string | null; serverVersion?: string | null };
  site?: { base?: string | null; exists?: boolean | null; pages?: number | null; lastBuild?: string | { finishedAt?: string | null; status?: string; pages?: number | null } | null };
  access?: { adminEnabled?: boolean | null; adminIpRestricted?: boolean | null; behindProxy?: boolean | null; cookieSecure?: boolean | string | null };
  update?: { mode?: UpdateMode | null; canUpdate?: boolean | null; message?: string | null };
  restartMode?: string | null;
}
export interface PublishedPage { id: number; route: string; title: string; version: number }
export interface SkippedPage { id: number; route?: string; reason: string; problems?: Problem[] }
export interface PublishDraftsResult { count: number; published: PublishedPage[]; skipped: SkippedPage[] }

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) { (init.headers as Record<string, string>)['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  let res: Response;
  try { res = await fetch(apiUrl(url), init); } catch { throw new ApiError(0, 'No se pudo conectar con el servidor del portal.'); }
  const text = await res.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const msg = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `Error ${res.status}`;
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTH_EVENT));
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

/** Problemas que el servidor devuelve en un 400 al publicar una página con errores. */
export const problemsOf = (e: unknown): Problem[] => {
  const d = e instanceof ApiError ? e.data : null;
  const p = d && typeof d === 'object' ? (d as { problems?: unknown }).problems : null;
  return Array.isArray(p) ? (p as Problem[]) : [];
};

export const siteApi = {
  status: () => call<SiteStatus>('GET', '/api/site/status'),
  /** Estático: encola una reconstrucción (`jobId`). En vivo: vacía y recalienta la caché (`cleared`). */
  rebuild: () => call<{ jobId?: number; ok?: boolean; cleared?: number }>('POST', '/api/site/rebuild'),
  job: (id: number) => call<Job>('GET', `/api/jobs/${id}`),
  publishPage: (id: number, b: { version?: number; force?: boolean } = {}) => call<Page>('POST', `/api/pages/${id}/publish`, b),
  unpublishPage: (id: number, b: { version?: number } = {}) => call<Page>('POST', `/api/pages/${id}/unpublish`, b),
  publishDrafts: (b: { ids?: number[]; force?: boolean } = {}) => call<PublishDraftsResult>('POST', '/api/pages/publish-drafts', b),
  version: (fetch = true) => call<SystemVersion>('GET', '/api/system/version' + (fetch ? '' : '?fetch=0')),
  update: () => call<{ jobId: number }>('POST', '/api/system/update'),
  restart: () => call<{ ok: boolean; mode: string; message: string }>('POST', '/api/system/restart', { confirm: 'REINICIAR' }),
  info: () => call<SystemInfo>('GET', '/api/system/info'),
};

/** Último `RESULTADO: {…}` del registro de una actualización del sistema. */
export function parseUpdateResult(log: string): UpdateResult | null {
  const m = [...log.matchAll(/^RESULTADO: (.+)$/gm)].pop();
  if (!m) return null;
  try { return JSON.parse(m[1]!) as UpdateResult; } catch { return null; }
}
