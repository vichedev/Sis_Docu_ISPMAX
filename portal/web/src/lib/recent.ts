/* «Abiertas hace poco»: la lista vive en el navegador, así que se contrasta con el servidor y se limpian las páginas que ya no existen. */
import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { forgetRecent, recentPages, type RecentPage } from './util';

export function useRecentPages(limit: number): RecentPage[] {
  const [list, setList] = useState<RecentPage[]>(() => recentPages().slice(0, limit));
  useEffect(() => {
    let alive = true;
    const current = recentPages();
    void Promise.all(current.map(async (p) => {
      try { const pg = await api.page(p.id); if (pg.deleted_at) forgetRecent(p.id); } catch (e) { if (e instanceof ApiError && e.status === 404) forgetRecent(p.id); }
    })).then(() => { if (alive) setList(recentPages().slice(0, limit)); });
    return () => { alive = false; };
  }, [limit]);
  return list;
}
