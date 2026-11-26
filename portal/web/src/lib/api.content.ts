/* Cliente de la API del paquete portable de contenido (`/api/content`). */
import { apiUrl } from './apiBase';
import { ApiError, UNAUTH_EVENT } from './api';
import type { ContentCounts, ImportMode } from '@/features/backups/contentModel';

export interface ContentFile {
  id: number; filename: string; size: number; created_at: string; user_name: string | null; exists: boolean;
  sha256: string | null; counts: ContentCounts | null; includeRevisions: boolean | null; reason: string | null;
}
export interface ContentSummary {
  counts: ContentCounts; hasContent: boolean; assetsBytes: number; lastPackage: ContentFile | null;
}
export interface ContentExport { id: number; filename: string; size: number; sha256: string; counts: ContentCounts }

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

/** Sube el paquete con progreso real (XHR: fetch no informa de la subida). */
export function uploadPackage(file: File, mode: ImportMode, confirm: string | undefined, onProgress: (loaded: number, total: number) => void): { promise: Promise<{ jobId: number }>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ jobId: number }>((resolve, reject) => {
    const fd = new FormData();
    fd.append('mode', mode);
    if (confirm) fd.append('confirm', confirm);
    fd.append('file', file, file.name);
    xhr.open('POST', apiUrl('/api/content/import'));
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total); };
    xhr.onerror = () => reject(new ApiError(0, 'No se pudo conectar con el servidor del portal.'));
    xhr.onabort = () => reject(new ApiError(0, 'Subida cancelada.'));
    xhr.onload = () => {
      let data: unknown = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* sin cuerpo */ }
      if (xhr.status >= 200 && xhr.status < 300 && data && typeof (data as { jobId?: unknown }).jobId === 'number') return resolve(data as { jobId: number });
      if (xhr.status === 401) window.dispatchEvent(new Event(UNAUTH_EVENT));
      const msg = data && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `Error ${xhr.status}`;
      reject(new ApiError(xhr.status, msg, data));
    };
    xhr.send(fd);
  });
  return { promise, abort: () => xhr.abort() };
}

export const contentApi = {
  summary: () => call<ContentSummary>('GET', '/api/content/summary'),
  files: async () => (await call<{ items: ContentFile[] }>('GET', '/api/content/files')).items,
  exportPackage: (includeRevisions: boolean) => call<ContentExport>('POST', '/api/content/export', { includeRevisions }),
  downloadUrl: (id: number) => apiUrl(`/api/content/files/${id}/download`),
  remove: (id: number) => call<{ ok: boolean }>('DELETE', `/api/content/files/${id}`),
};
