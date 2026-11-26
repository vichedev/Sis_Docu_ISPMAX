/* Cliente de la API de tours (`/api/tours`). Mismos errores y control de versión (409) que el resto del panel. */
import { apiUrl } from './apiBase';
import { ApiError, UNAUTH_EVENT } from './api';
import type { TourStep } from '@/features/tours/tourModel';

export interface TourRow {
  id: number; slug: string; title: string; description: string; status: 'draft' | 'published';
  stepsCount: number; version: number; updated_at: string; updated_by_name?: string | null; snippet: string;
}
export interface Tour {
  id: number; slug: string; title: string; description: string; steps: Partial<TourStep>[]; status: 'draft' | 'published';
  version: number; updated_at: string; snippet: string;
}
export interface TourSave { title?: string; description?: string; steps?: TourStep[]; status?: 'draft' | 'published'; version: number }

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

const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const toursApi = {
  list: async (f: { q?: string; status?: string } = {}) => (await call<{ items: TourRow[] }>('GET', '/api/tours' + qs(f))).items,
  get: (id: number | string) => call<Tour>('GET', `/api/tours/${id}`),
  create: (b: { slug: string; title: string; description?: string }) => call<Tour>('POST', '/api/tours', b),
  save: (id: number, b: TourSave) => call<Tour>('PUT', `/api/tours/${id}`, b),
  remove: (id: number) => call<unknown>('DELETE', `/api/tours/${id}`),
  restore: (id: number) => call<Tour>('POST', `/api/tours/${id}/restore`),
  duplicate: (id: number, slug: string) => call<Tour>('POST', `/api/tours/${id}/duplicate`, { slug }),
};
