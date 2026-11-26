/*
 * Tours para el lienzo: índice de todos los tours no eliminados (publicados y borradores) y detalle por
 * identificador, con caché compartida. `refreshTours()` la invalida y avisa a todos los bloques (tras crear o
 * editar un tour desde el editor de bloques).
 */
import { useEffect, useState } from 'react';
import { toursApi, type Tour, type TourRow } from '@/lib/api.tours';

let index: Promise<TourRow[]> | null = null;
const details = new Map<string, Promise<Tour | null>>();
const subs = new Set<() => void>();

export function loadTourIndex(): Promise<TourRow[]> {
  index ??= toursApi.list().catch((e) => { index = null; throw e; });
  return index;
}

/** Tour completo (con pasos) por su identificador; null si no existe. */
export function loadTour(slug: string): Promise<Tour | null> {
  let p = details.get(slug);
  if (!p) {
    p = loadTourIndex().then((l) => { const r = l.find((t) => t.slug === slug); return r ? toursApi.get(r.id) : null; });
    p.catch(() => details.delete(slug));
    details.set(slug, p);
  }
  return p;
}

export function refreshTours() {
  index = null;
  details.clear();
  subs.forEach((f) => f());
}

function useVersion() {
  const [v, setV] = useState(0);
  useEffect(() => { const f = () => setV((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return v;
}

/** Lista de tours (null mientras carga) y si falló la carga. */
export function useTourIndex() {
  const v = useVersion();
  const [state, setState] = useState<{ tours: TourRow[] | null; error: boolean }>({ tours: null, error: false });
  useEffect(() => {
    let alive = true;
    loadTourIndex().then((t) => { if (alive) setState({ tours: t, error: false }); }).catch(() => { if (alive) setState({ tours: [], error: true }); });
    return () => { alive = false; };
  }, [v]);
  return state;
}

/** Detalle de un tour por identificador para la vista previa gráfica del bloque. */
export function useTourDetail(slug: string) {
  const v = useVersion();
  const [state, setState] = useState<{ tour: Tour | null; loading: boolean; error: boolean }>({ tour: null, loading: !!slug, error: false });
  useEffect(() => {
    if (!slug) { setState({ tour: null, loading: false, error: false }); return; }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: false }));
    loadTour(slug).then((t) => { if (alive) setState({ tour: t, loading: false, error: false }); }).catch(() => { if (alive) setState({ tour: null, loading: false, error: true }); });
    return () => { alive = false; };
  }, [slug, v]);
  return state;
}
