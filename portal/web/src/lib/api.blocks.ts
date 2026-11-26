/* Lecturas que necesita el constructor por bloques (tours publicados para el bloque Tour). Mismos errores que src/lib/api.ts. */
import { apiUrl } from './apiBase';
import { ApiError, UNAUTH_EVENT } from './api';

export interface TourSummary { id: number; slug: string; title: string; description?: string; status: string; stepsCount: number }

async function get<T>(url: string): Promise<T> {
  let res: Response;
  try { res = await fetch(apiUrl(url), { credentials: 'same-origin' }); } catch { throw new ApiError(0, 'No se pudo conectar con el servidor del portal.'); }
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

export const blocksApi = {
  /** Tours publicados (los únicos que el manual puede mostrar). */
  publishedTours: async () => {
    const d = await get<{ items?: TourSummary[] } | TourSummary[]>('/api/tours?status=published');
    return Array.isArray(d) ? d : d.items ?? [];
  },
};
