/*
 * Estado del manual publicado en vivo: SiteProvider sondea GET /api/site/status (~2 s con actividad, ~15 s en reposo),
 * SiteChip es el indicador de la barra superior (popover con detalles y «Actualizar ahora») y DraftsLink el acceso a Borradores.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, ExternalLink, FileText, LoaderCircle, RefreshCw, ScrollText, TriangleAlert } from 'lucide-react';
import { Button, Dialog, LogViewer, Popover, Spinner, StatusBadge, useToast } from '@/components/ui';
import { siteApi, type SiteStatus } from '@/lib/api.site';
import { can, errText, useAuth } from '@/lib/auth';
import { useWindowEvent } from '@/lib/hooks';
import { CONTENT_EVENT, STATS_EVENT, fmtDate, jobState, relTime } from '@/lib/util';
import { cn } from '@/lib/cn';
import { setSiteBase, siteHref } from '@/lib/siteHref';
import { clearedMessage, isLive, liveOk, liveProblem } from '@/lib/siteModel';

const FAST_MS = 2000;
const IDLE_MS = 15000;
const FAST_AFTER_CHANGE_MS = 20000;
/** Modo en vivo: no hay nada que esperar, basta un sondeo tranquilo. */
const LIVE_MS = 25000;

interface SiteCtxValue { status: SiteStatus | null; error: boolean; fetchedAt: number; refresh: () => void }
const SiteCtx = createContext<SiteCtxValue>({ status: null, error: false, fetchedAt: 0, refresh: () => {} });
export const useSite = () => useContext(SiteCtx);

export function SiteProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [error, setError] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fastUntil = useRef(0);
  const prev = useRef<SiteStatus | null>(null);
  const alive = useRef(true);
  const loop = useRef<() => void>(() => {});

  const tick = useCallback(async () => {
    clearTimeout(timer.current);
    let next = IDLE_MS;
    try {
      const s = await siteApi.status();
      if (!alive.current) return;
      const p = prev.current;
      const live = isLive(s);
      if (!live && p && p.state === 'building' && s.state !== 'building') {
        if (s.lastBuild?.status === 'error' || s.state === 'error') toast('No se pudo actualizar el manual; el anterior sigue publicado', 'error');
        else toast('El manual se actualizó');
      }
      prev.current = s;
      setSiteBase(s.siteUrl);
      setStatus(s); setError(false); setFetchedAt(Date.now());
      if (live) next = LIVE_MS;
      else if (s.state === 'pending' || s.state === 'building' || Date.now() < fastUntil.current) next = FAST_MS;
    } catch {
      if (!alive.current) return;
      setError(true);
      next = IDLE_MS;
    }
    timer.current = setTimeout(() => loop.current(), next);
  }, [toast]);
  loop.current = () => { void tick(); };

  useEffect(() => {
    alive.current = true;
    void tick();
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, [tick]);

  /** Tras guardar algo, el servidor tarda un instante en marcar el sitio como «pendiente»: se sondea rápido un rato. */
  const bump = useCallback(() => {
    // En vivo el estado no cambia al guardar (solo el contador de borradores y «último cambio»): una sola consulta.
    fastUntil.current = isLive(prev.current) ? 0 : Date.now() + FAST_AFTER_CHANGE_MS;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => loop.current(), 350);
  }, []);
  useWindowEvent(CONTENT_EVENT, bump);
  useWindowEvent(STATS_EVENT, bump);

  const refresh = useCallback(() => { fastUntil.current = isLive(prev.current) ? 0 : Date.now() + FAST_AFTER_CHANGE_MS; void tick(); }, [tick]);
  return <SiteCtx.Provider value={{ status, error, fetchedAt, refresh }}>{children}</SiteCtx.Provider>;
}

/** Reloj de 1 s mientras `on`. */
export function useNow(on: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

export const fmtDur = (ms?: number | null) => {
  if (ms == null) return '—';
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
};

/** Texto corto y tono del estado del sitio. */
export function useSiteLabel() {
  const { status, error, fetchedAt } = useSite();
  const now = useNow(status?.state === 'pending' || status?.state === 'building');
  if (!status) return { key: 'loading' as const, label: error ? 'Sin conexión' : 'Comprobando…', short: '', detail: '' };
  if (isLive(status)) {
    if (!liveOk(status)) return { key: 'error' as const, label: 'Manual con problemas', short: '', detail: liveProblem(status) };
    return { key: 'live' as const, label: 'Manual en vivo', short: '', detail: 'Los cambios se publican al instante. No hay reconstrucciones.' };
  }
  if (status.state === 'building') {
    const secs = status.building?.startedAt ? Math.max(0, Math.round((now - new Date(status.building.startedAt).getTime()) / 1000)) : 0;
    return { key: 'building' as const, label: 'Actualizando el manual…', short: `${secs} s`, detail: `En curso desde hace ${secs} s (suele tardar unos 35 a 50 s).` };
  }
  if (status.state === 'pending') {
    const left = status.nextRunInMs == null ? null : Math.max(0, Math.ceil((status.nextRunInMs - (now - fetchedAt)) / 1000));
    return { key: 'pending' as const, label: 'Cambios pendientes', short: left == null ? '' : `se actualiza en ${left} s`, detail: left == null ? 'La actualización automática está desactivada: use «Actualizar ahora».' : `El manual se actualizará solo en ${left} s.` };
  }
  if (status.state === 'error') return { key: 'error' as const, label: 'Error al actualizar', short: '', detail: status.lastBuild?.error ?? 'La última actualización falló. El manual anterior sigue publicado.' };
  if (!status.siteExists && status.siteExists !== undefined) return { key: 'idle' as const, label: 'Manual sin construir', short: '', detail: 'Todavía no se ha generado el manual.' };
  return { key: 'idle' as const, label: 'Manual al día', short: '', detail: 'Lo publicado coincide con lo guardado.' };
}

/** Registro de un trabajo (sondea mientras corre). */
export function JobLogDialog({ jobId, open, onOpenChange, title = 'Registro del trabajo' }: { jobId: number | null; open: boolean; onOpenChange: (o: boolean) => void; title?: string }) {
  const [job, setJob] = useState<{ status: string; log: string; started_at?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open || jobId == null) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    setJob(null); setErr(null);
    const run = async () => {
      try {
        const j = await siteApi.job(jobId);
        if (!alive) return;
        setJob(j);
        if (jobState(j.status) === 'running') t = setTimeout(run, 1500);
      } catch (e) { if (alive) setErr(errText(e)); }
    };
    void run();
    return () => { alive = false; clearTimeout(t); };
  }, [open, jobId]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="lg" title={<span className="inline-flex items-center gap-2">{title} {jobId != null && <span className="text-ink-3">#{jobId}</span>} {job && <StatusBadge status={jobState(job.status) === 'none' ? 'neutral' : jobState(job.status)} />}</span>}
      description={job?.started_at ? fmtDate(job.started_at) : undefined}>
      {err ? <p role="alert" className="text-danger">{err}</p> : !job ? <Spinner label="Cargando el registro…" /> : <LogViewer log={job.log} running={jobState(job.status) === 'running'} />}
    </Dialog>
  );
}

/** «Vaciar caché» del modo en vivo (POST /api/site/rebuild vacía y recalienta la caché; no hay trabajo que seguir). */
export function useClearCache() {
  const toast = useToast();
  const { refresh } = useSite();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async () => {
    setBusy(true);
    try { const r = await siteApi.rebuild(); toast(clearedMessage(r)); refresh(); }
    catch (e) { toast(errText(e), 'error'); }
    finally { setBusy(false); }
  }, [toast, refresh]);
  return { busy, run };
}

const TONE = {
  loading: 'border-line text-ink-3',
  idle: 'border-line text-ink-2 hover:border-line-strong',
  live: 'border-line text-ink-2 hover:border-line-strong',
  pending: 'border-transparent bg-warn-soft text-warn',
  building: 'border-line text-ink-2 hover:border-line-strong',
  error: 'border-line text-danger hover:border-line-strong',
} as const;

/** Indicador del manual publicado en la barra superior. */
export function SiteChip() {
  const { user } = useAuth();
  const toast = useToast();
  const { status, refresh } = useSite();
  const s = useSiteLabel();
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState(false);
  const [busy, setBusy] = useState(false);
  const canRebuild = can(user, 'editor');
  const building = status?.state === 'building';
  const logId = status?.building?.jobId ?? status?.lastBuild?.jobId ?? null;
  const rebuild = async () => {
    setBusy(true);
    try { await siteApi.rebuild(); toast('Actualizando el manual…', 'info'); refresh(); }
    catch (e) { toast(errText(e), 'error'); }
    finally { setBusy(false); }
  };
  const live = isLive(status);
  const clear = useClearCache();
  const Icon = s.key === 'idle' || s.key === 'live' ? CircleCheck : s.key === 'building' ? LoaderCircle : s.key === 'error' ? CircleAlert : s.key === 'pending' ? TriangleAlert : RefreshCw;
  const lb = status?.lastBuild;
  return (
    <>
      <Popover open={open} onOpenChange={setOpen} align="end" className="w-80" label="Estado del manual"
        trigger={
          <button type="button" data-coach="site" aria-label={`Estado del manual: ${s.label}${s.short ? ', ' + s.short : ''}`}
            className={cn('inline-flex h-8 max-w-[340px] cursor-pointer items-center gap-1.5 rounded-md border bg-bg px-2.5 text-[13px] font-medium max-sm:px-2', TONE[s.key])}>
            <Icon size={15} aria-hidden="true" className={cn((s.key === 'idle' || s.key === 'live') && 'text-ok', s.key === 'building' && 'animate-spin text-ink-3')} />
            <span className="truncate max-sm:hidden" aria-live="polite">{s.label}{s.short && <span className="font-normal tabular-nums"> · {s.short}</span>}</span>
          </button>
        }>
        {live ? (
        <div className="flex flex-col gap-3 text-[13.5px]">
          <div>
            <strong className="flex items-center gap-2 text-[14px]">{s.label}</strong>
            {s.key !== 'error' && <p className="mt-1 text-ink-2">{s.detail}</p>}
          </div>
          {s.key === 'error' && <p role="alert" className="m-0 rounded-md bg-danger-soft px-2.5 py-2 text-danger">{s.detail}</p>}
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-ink-2">
            <dt className="text-ink-3">Páginas en caché</dt><dd className="m-0 tabular-nums">{status?.cache?.pages != null ? status.cache.pages.toLocaleString('es') : '—'}</dd>
            <dt className="text-ink-3">Último cambio</dt>
            <dd className="m-0 min-w-0">{status?.lastChange?.at
              ? <span title={fmtDate(status.lastChange.at)}>{relTime(status.lastChange.at)}{status.lastChange.route ? <> · <a href={siteHref(status.lastChange.route, status.siteUrl)} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[12px]">{status.lastChange.route}</a></> : null}</span>
              : 'Aún no consta'}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            {status?.siteUrl && <Button size="sm" variant="primary" asChild><a href={siteHref('', status.siteUrl)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Ver el manual</a></Button>}
            {canRebuild && <Button size="sm" disabled={clear.busy} onClick={() => void clear.run()}><RefreshCw size={14} className={clear.busy ? 'animate-spin' : ''} /> Vaciar caché</Button>}
          </div>
          <a href="#/manual" onClick={() => setOpen(false)} className="text-[13px]">Más detalles en Manual publicado</a>
        </div>
        ) : (
        <div className="flex flex-col gap-3 text-[13.5px]">
          <div>
            <strong className="flex items-center gap-2 text-[14px]">{s.label}</strong>
            <p className="mt-1 text-ink-2">{s.detail}</p>
          </div>
          {status?.state === 'error' && <p className="rounded-md bg-subtle px-2.5 py-2 text-ink-2">El manual anterior sigue publicado. {logId != null ? 'Revise el registro para ver el motivo y vuelva a intentarlo.' : 'Corrija lo que indica el mensaje y vuelva a intentarlo.'}</p>}
          {!!status?.pendingReasons?.length && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-3">Cambios que esperan</div>
              <ul className="m-0 max-h-24 list-disc overflow-y-auto pl-4 text-ink-2">{status.pendingReasons.slice(-5).map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-ink-2">
            <dt className="text-ink-3">Última actualización</dt><dd className="m-0" title={fmtDate(lb?.finishedAt)}>{lb?.finishedAt ? `${relTime(lb.finishedAt)}${lb.status === 'error' ? ' (con error)' : ''}` : 'Aún no consta'}</dd>
            {lb?.pages != null && <><dt className="text-ink-3">Páginas</dt><dd className="m-0 tabular-nums">{lb.pages}</dd></>}
            {lb?.durationMs ? <><dt className="text-ink-3">Duración</dt><dd className="m-0 tabular-nums">{fmtDur(lb.durationMs)}</dd></> : null}
            {status?.autoPublish === false && <><dt className="text-ink-3">Automático</dt><dd className="m-0">Desactivado</dd></>}
          </dl>
          <div className="flex flex-wrap gap-2">
            {canRebuild && <Button variant="primary" size="sm" disabled={busy || building} onClick={() => void rebuild()}><RefreshCw size={14} className={building ? 'animate-spin' : ''} /> {building ? 'Actualizando…' : 'Actualizar ahora'}</Button>}
            {status?.siteUrl && <Button size="sm" asChild><a href={siteHref('', status.siteUrl)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Ver el manual</a></Button>}
            {logId != null && <Button size="sm" variant={s.key === 'error' ? 'secondary' : 'ghost'} onClick={() => { setOpen(false); setLog(true); }}><ScrollText size={14} /> Ver log</Button>}
          </div>
          <a href="#/manual" onClick={() => setOpen(false)} className="text-[13px]">Más detalles en Manual publicado</a>
        </div>
        )}
      </Popover>
      {s.key === 'error' && logId != null && <button type="button" onClick={() => setLog(true)} className="cursor-pointer text-[13px] text-accent-ink underline max-lg:hidden">Ver log</button>}
      <JobLogDialog jobId={logId} open={log} onOpenChange={setLog} title="Registro de la actualización del manual" />
    </>
  );
}

/** Acceso discreto a la pantalla de Borradores. */
export function DraftsLink() {
  const { status } = useSite();
  const n = status?.drafts;
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1.5 text-ink-2 max-sm:px-2">
      <a href="#/borradores" data-coach="drafts" title={n ? `${n} ${n === 1 ? 'página en borrador' : 'páginas en borrador'}` : 'Páginas en borrador'}>
        <FileText size={15} /><span className="max-md:hidden">Borradores</span>
        {n != null && <span className="tabular-nums" aria-label={`${n} borradores`}><span className="max-md:hidden">(</span>{n > 999 ? '999+' : n}<span className="max-md:hidden">)</span></span>}
      </a>
    </Button>
  );
}

/** Línea del editor: explica que el manual se actualiza solo y muestra el estado. */
export function SiteInline({ className }: { className?: string }) {
  const s = useSiteLabel();
  const { status } = useSite();
  if (!status) return null;
  const live = isLive(status);
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-normal text-ink-3', className)} aria-live="polite" title={live ? 'Los cambios guardados en páginas publicadas se ven al instante' : 'Las páginas publicadas actualizan el manual solo al guardarlas'}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', s.key === 'idle' || s.key === 'live' ? 'bg-ok' : s.key === 'building' ? 'animate-pulse bg-signal' : s.key === 'pending' ? 'bg-warn-dot' : s.key === 'error' ? 'bg-danger' : 'bg-ink-4')} />
      {!live && status.autoPublish === false ? 'Actualización automática desactivada' : `${s.label}${s.short ? ' · ' + s.short : ''}`}
    </span>
  );
}
