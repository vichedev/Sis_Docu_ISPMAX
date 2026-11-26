/* Hooks reutilizables del portal. */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { store } from './util';

/** Carga de datos con estados uniformes (`data`, `error`, `loading`, `reload`). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn().then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e: unknown) => { if (alive) setError(e); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}
export type AsyncState<T> = ReturnType<typeof useAsync<T>>;

export function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

const RUNNING = ['running', 'queued', 'pending'];
/** Sondea un trabajo del servidor (publicación, Git, importación) hasta que termina. */
export function useJob(fetchJob: (id: number) => Promise<{ status: string; log: string }>) {
  const [id, setId] = useState<number | null>(null);
  const [job, setJob] = useState<{ status: string; log: string } | null>(null);
  const fetchRef = useRef(fetchJob);
  fetchRef.current = fetchJob;
  useEffect(() => {
    if (id == null) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const j = await fetchRef.current(id);
        if (!alive) return;
        setJob(j);
        if (RUNNING.includes(j.status)) timer = setTimeout(tick, 1000);
      } catch { if (alive) timer = setTimeout(tick, 2500); }
    };
    void tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [id]);
  const running = id != null && (!job || RUNNING.includes(job.status));
  const start = useCallback((jobId: number) => { setJob(null); setId(jobId); }, []);
  return { job, running, id, start };
}

/**
 * Protege cambios sin guardar: aviso del navegador al recargar/cerrar y confirmación
 * al cambiar de pantalla dentro del portal (el router es por hash).
 * Un único oyente de `hashchange`, registrado al cargar este módulo, va ANTES que el router (usePath): si no,
 * el router desmonta la pantalla (y con ella su protección) en el mismo evento y no se llega a preguntar.
 * `allow(hash)`: destinos que conservan los cambios (p. ej. otra sección de Ajustes), sin preguntar.
 */
interface Guard { message: string; allow: (hash: string) => boolean; last: string }
const guards = new Set<Guard>();
let reverting = false;
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', (e) => {
    if (reverting) { reverting = false; e.stopImmediatePropagation(); return; }
    const h = window.location.hash;
    for (const g of guards) {
      if (g.allow(h)) { g.last = h; continue; }
      if (!window.confirm(g.message)) { reverting = true; e.stopImmediatePropagation(); window.location.hash = g.last; return; }
      g.last = h;
    }
  });
}
export function useUnsavedChanges(dirty: boolean, message = 'Hay cambios sin guardar. ¿Salir de todos modos?', allow?: (hash: string) => boolean) {
  const allowRef = useRef(allow);
  allowRef.current = allow;
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const g: Guard = { message, allow: (h) => allowRef.current?.(h) ?? false, last: window.location.hash };
    guards.add(g);
    window.addEventListener('beforeunload', before);
    return () => { guards.delete(g); window.removeEventListener('beforeunload', before); };
  }, [dirty, message]);
}

type Hotkeys = Record<string, (e: KeyboardEvent) => void>;
/**
 * Atajos globales. Claves con formato `mod+k`, `mod+s`, `alt+arrowup`, `escape`
 * (`mod` = Ctrl o Cmd). Con `allowInInputs` también actúan dentro de campos de texto.
 */
export function useHotkeys(map: Hotkeys, { allowInInputs = true } = {}) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!allowInInputs && t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const key = [(e.ctrlKey || e.metaKey) && 'mod', e.altKey && 'alt', e.shiftKey && 'shift', e.key.toLowerCase()].filter(Boolean).join('+');
      const fn = ref.current[key];
      if (fn) { e.preventDefault(); fn(e); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allowInInputs]);
}

/** Estado persistido en localStorage (solo comodidades por navegador). */
export function useLocalStorage<T>(key: string, def: T) {
  const [v, setV] = useState<T>(() => store.get(key, def));
  useEffect(() => { store.set(key, v); }, [key, v]);
  return [v, setV] as const;
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}

/** Escucha un evento global de `window` (p. ej. CONTENT_EVENT). */
export function useWindowEvent(name: string, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => { const f = () => ref.current(); window.addEventListener(name, f); return () => window.removeEventListener(name, f); }, [name]);
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
/** Atrapa el foco dentro de `ref` (para capas propias; los diálogos Radix ya lo hacen). */
export function useFocusTrap(ref: RefObject<HTMLElement>, active = true) {
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const f = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], b = f[f.length - 1];
      if (!ref.current.contains(document.activeElement)) { e.preventDefault(); a.focus(); return; }
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && document.contains(prev)) prev.focus(); };
  }, [ref, active]);
}
