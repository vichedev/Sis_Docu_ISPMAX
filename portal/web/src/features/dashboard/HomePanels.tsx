/* Piezas del Inicio: indicadores, el manual por secciones, pendientes, recientes, actividad y vista del manual publicado. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, ChevronRight, CircleAlert, CircleCheck, FileText, Info, ServerCog, TriangleAlert } from 'lucide-react';
import { Avatar, Button, ErrorState, Panel, Skeleton, Tag } from '@/components/ui';
import { api } from '@/lib/api';
import type { SiteStatus } from '@/lib/api.site';
import { useAsync } from '@/lib/hooks';
import { ACTION_LABEL, fmtDate, recentPages, relTime, store } from '@/lib/util';
import { cn } from '@/lib/cn';
import { fmtDur } from '@/features/system/site';
import { actionText, plural, shownTarget, type AttentionItem, type SectionRow } from './homeModel';
import { siteHref } from '@/lib/siteHref';

export const More = ({ href, children }: { href: string; children: ReactNode }) =>
  <a href={href} className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-ink-3 hover:text-accent-ink hover:no-underline">{children}<ArrowRight size={14} aria-hidden="true" /></a>;

/* ---------- Indicadores ---------- */

export interface Metric { key: string; label: string; icon: ReactNode; value: number | null; context?: ReactNode; href?: string; tone?: 'warn' }

/* Cinco celdas sin huecos: 2+2+1 (móvil) · 3+2 (medio) · 5 (ancho). */
const SPAN = ['@2xl:col-span-2 @5xl:col-span-1', '@2xl:col-span-2 @5xl:col-span-1', '@2xl:col-span-2 @5xl:col-span-1', '@2xl:col-span-3 @5xl:col-span-1', 'col-span-2 @2xl:col-span-3 @5xl:col-span-1'];

/** Fila de indicadores: una sola superficie dividida por líneas de 1 px (no tarjetas sueltas). */
export function MetricStrip({ items, loading }: { items: Metric[]; loading: boolean }) {
  return (
    <section aria-label="Indicadores del manual" className="mb-5 overflow-hidden rounded-lg border border-line bg-bg">
      <ul className="-ml-px -mt-px grid list-none grid-cols-2 p-0 @2xl:grid-cols-6 @5xl:grid-cols-5">
        {items.map((m, i) => {
          const body = (
            <>
              <span className="flex items-center gap-1.5 text-[13px] text-ink-3 [&>svg]:shrink-0">{m.icon}{m.label}</span>
              {loading && m.value == null
                ? <Skeleton className="mt-3 h-6 w-16" />
                : <span className="mt-2 block text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{m.value == null ? '—' : m.value.toLocaleString('es')}</span>}
              <span className={cn('mt-2 block min-h-[18px] text-[12.5px] leading-[18px]', m.tone === 'warn' ? 'text-warn' : 'text-ink-3')}>{loading && m.value == null ? '' : m.context}</span>
              {m.href && <ChevronRight size={15} aria-hidden="true" className="absolute right-3 top-3.5 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}
            </>
          );
          const cls = 'group relative block h-full px-5 py-4 text-ink no-underline max-sm:px-4';
          return (
            <li key={m.key} className={cn('min-w-0 border-l border-t border-line', SPAN[i] ?? '')}>
              {m.href ? <a href={m.href} className={cn(cls, 'hover:bg-subtle hover:no-underline')}>{body}</a> : <div className={cls}>{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- El manual de un vistazo ---------- */

/** Abre la sección en el árbol de Estructura (recuerda la sección abierta igual que el propio árbol). */
const openSection = (key: string) => { store.set('portal-structure-top', key); store.set('portal-tree-top', key); };

export function SectionsPanel({ rows, other, loading, error, onRetry, className }: { rows: SectionRow[] | null; other: number; loading: boolean; error?: unknown; onRetry?: () => void; className?: string }) {
  return (
    <Panel flush className={className} bodyClassName="@container" title="El manual de un vistazo" description="Las secciones del menú del manual y su contenido" actions={<More href="#/estructura">Estructura</More>}>
      {error && !rows ? <div className="p-4"><ErrorState error={error} onRetry={onRetry} /></div> : !rows ? (
        <ul aria-hidden="true" className="m-0 list-none divide-y divide-line p-0">
          {Array.from({ length: 5 }, (_, i) => <li key={i} className="flex items-center gap-6 px-4 py-4"><Skeleton className="w-40" /><Skeleton className="flex-1" /><Skeleton className="w-8" /></li>)}
        </ul>
      ) : (
        <>
          <ul className="m-0 list-none divide-y divide-line p-0" aria-busy={loading || undefined}>
            {rows.map((r) => (
              <li key={r.key}>
                <a href="#/estructura" onClick={() => openSection(r.key)} aria-label={`${r.label}: ${plural(r.count, 'página', 'páginas')}. Abrir en Estructura`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-4 gap-y-2 px-4 py-3 text-ink no-underline hover:bg-subtle hover:no-underline @lg:grid-cols-[minmax(0,1fr)_minmax(80px,32%)_48px_16px]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.label}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-ink-3">
                      <span className="truncate">{r.hint}</span>
                      {r.groups != null && r.groups > 0 && <><span aria-hidden="true" className="text-ink-4">·</span><span className="whitespace-nowrap">{plural(r.groups, 'grupo', 'grupos')}</span></>}
                      {!!r.drafts && <Tag className="bg-warn-soft text-warn">{plural(r.drafts, 'borrador', 'borradores')}</Tag>}
                    </span>
                  </span>
                  <span aria-hidden="true" className="col-span-3 row-start-2 h-1.5 overflow-hidden rounded-sm bg-muted @lg:col-span-1 @lg:row-start-auto">
                    <span className="block h-full rounded-sm bg-ink-4 transition-[width] group-hover:bg-ink-3" style={{ width: `${Math.max(r.count ? 2 : 0, r.share * 100)}%` }} />
                  </span>
                  <span className="text-right text-[15px] font-medium tabular-nums">{r.count.toLocaleString('es')}</span>
                  <ChevronRight size={15} aria-hidden="true" className="text-ink-4 group-hover:text-ink-3" />
                </a>
              </li>
            ))}
          </ul>
          {other > 0 && <p className="m-0 border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">Además, {plural(other, 'página', 'páginas')} fuera del menú (la portada del manual).</p>}
        </>
      )}
    </Panel>
  );
}

/* ---------- Pendientes ---------- */

const TONE_ICON = {
  danger: <CircleAlert size={16} className="text-danger" />,
  warn: <TriangleAlert size={16} className="text-warn" />,
  info: <Info size={16} className="text-ink-3" />,
};

export function AttentionPanel({ items, loading, className }: { items: AttentionItem[]; loading: boolean; className?: string }) {
  return (
    <Panel flush className={className} title={<>Pendientes{items.length > 0 && <span className="rounded-sm bg-muted px-1.5 text-[12px] font-medium tabular-nums text-ink-2">{items.length}</span>}</>}>
      <div aria-live="polite">
        {loading && !items.length ? (
          <div aria-hidden="true" className="flex flex-col gap-3 px-4 py-4"><Skeleton className="w-3/4" /><Skeleton className="w-1/2" /></div>
        ) : !items.length ? (
          <div className="flex items-start gap-3 px-4 py-4">
            <CircleCheck size={18} className="mt-px shrink-0 text-ok" aria-hidden="true" />
            <div><strong className="font-medium">Todo en orden</strong><p className="m-0 mt-0.5 text-[13px] text-ink-3">No hay borradores por publicar ni avisos pendientes.</p></div>
          </div>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                <span aria-hidden="true" className="mt-0.5 shrink-0">{TONE_ICON[it.tone]}</span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-medium leading-snug">{it.title}</p>
                  {it.detail && <p className="m-0 mt-0.5 text-[12.5px] text-ink-3">{it.detail}</p>}
                  {it.action && <Button asChild size="sm" className="mt-2"><a href={it.action.href}>{it.action.label}</a></Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

/* ---------- Continuar editando ---------- */

export function RecentPanel({ className, canEdit }: { className?: string; canEdit: boolean }) {
  const recent = recentPages().slice(0, 6);
  return (
    <Panel flush className={className} title={canEdit ? 'Continuar editando' : 'Vistas hace poco'} actions={<More href="#/contenido">Páginas</More>}>
      {recent.length === 0 ? (
        <div className="px-4 py-5 text-[13.5px] text-ink-3">
          <p className="m-0">Las páginas que abra en este navegador aparecerán aquí para retomarlas.</p>
          <Button asChild size="sm" className="mt-3"><a href="#/contenido">{canEdit ? 'Abrir el árbol de páginas' : 'Ver las páginas'}</a></Button>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {recent.map((p) => (
            <li key={p.id}>
              <a href={`#/contenido/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 text-ink no-underline hover:bg-subtle hover:no-underline">
                <FileText size={16} aria-hidden="true" className="shrink-0 text-ink-3" />
                <span className="flex min-w-0 flex-1 flex-col"><span className="truncate font-medium">{p.title}</span><span className="truncate font-mono text-xs text-ink-3">{p.route}</span></span>
                <time dateTime={p.at} title={fmtDate(p.at)} className="shrink-0 whitespace-nowrap text-[12.5px] text-ink-3">{relTime(p.at)}</time>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Actividad reciente (admin) ---------- */

export function ActivityPanel({ className }: { className?: string }) {
  const { data, error, loading, reload } = useAsync(() => api.audit({ limit: 20 }), []);
  const items = (data?.items ?? []).filter((r) => !r.action.startsWith('auth.')).slice(0, 6);
  return (
    <Panel flush className={className} title="Actividad reciente" actions={<More href="#/auditoria">Auditoría</More>}>
      {loading && !data ? (
        <ul aria-hidden="true" className="m-0 list-none divide-y divide-line p-0">
          {Array.from({ length: 4 }, (_, i) => <li key={i} className="flex items-center gap-3 px-4 py-3"><span className="size-7 shrink-0 animate-pulse rounded-full bg-muted" /><Skeleton className="flex-1" /><Skeleton className="w-12" /></li>)}
        </ul>
      ) : error && !data ? <div className="p-4"><ErrorState error={error} onRetry={reload} title="No se pudo cargar la actividad" /></div>
        : !items.length ? <p className="m-0 px-4 py-5 text-[13.5px] text-ink-3">Todavía no hay actividad registrada.</p> : (
          <ol className="m-0 list-none divide-y divide-line p-0">
            {items.map((r) => {
              const who = r.user_name || r.username;
              const target = r.action === 'content.import' ? '' : shownTarget(r.target);
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  {who ? <Avatar name={who} size="sm" /> : <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-subtle text-ink-3"><ServerCog size={14} /></span>}
                  <p className="m-0 flex min-w-0 flex-1 flex-col text-[13.5px] leading-snug">
                    <span><span className="font-medium">{who || 'Sistema'}</span> <span className="text-ink-2">{actionText(r.action, ACTION_LABEL)}</span></span>
                    {target && <span className="truncate font-mono text-xs text-ink-3" title={target}>{target}</span>}
                  </p>
                  <time dateTime={r.created_at} title={fmtDate(r.created_at)} className="shrink-0 whitespace-nowrap text-[12.5px] text-ink-3">{relTime(r.created_at)}</time>
                </li>
              );
            })}
          </ol>
        )}
    </Panel>
  );
}

/* ---------- Vista del manual publicado ---------- */

const FRAME_W = 1280;
const FRAME_H = 800;

/** Miniatura estática del manual: iframe aislado (sin scripts ni interacción), cargado solo al acercarse a la vista. */
export function SitePreview({ url }: { url: string }) {
  const box = useRef<HTMLAnchorElement>(null);
  const [scale, setScale] = useState(0);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale((e?.contentRect.width ?? 0) / FRAME_W));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);
  return (
    <a ref={box} href={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir el manual publicado en otra pestaña"
      className="group relative block aspect-[16/10] overflow-hidden rounded-md border border-line bg-subtle dark:[&>iframe]:brightness-[.88]">
      {near && scale > 0 && (
        <iframe src={url} title="Vista previa del manual publicado" aria-hidden="true" tabIndex={-1} sandbox="" loading="lazy" onLoad={() => setLoaded(true)}
          className={cn('pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
          style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }} />
      )}
      {!loaded && <span className="absolute inset-0 grid place-items-center text-[12.5px] text-ink-3">Cargando la vista previa…</span>}
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-sm border border-line bg-raised px-1.5 py-0.5 text-[12px] font-medium text-ink-2 opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        Abrir <ArrowUpRight size={13} aria-hidden="true" />
      </span>
    </a>
  );
}

export function SitePanel({ status, className }: { status: SiteStatus | null; className?: string }) {
  const lb = status?.lastBuild;
  const exists = status ? status.siteExists !== false : null;
  const url = siteHref('', status?.siteUrl);
  const rows: [string, ReactNode][] = [
    ['Dirección', <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[12.5px]">{url}<ArrowUpRight size={13} aria-hidden="true" /></a>],
    ['Actualizado', lb?.finishedAt ? <time dateTime={lb.finishedAt} title={fmtDate(lb.finishedAt)}>{relTime(lb.finishedAt)}{lb.status === 'error' ? ' (con error)' : ''}</time> : <span className="text-ink-3">Aún no consta</span>],
    ...(lb?.durationMs ? [['Duración', <span className="tabular-nums">{fmtDur(lb.durationMs)}</span>] as [string, ReactNode]] : []),
    ...(lb?.pages != null ? [['Páginas generadas', <span className="tabular-nums">{lb.pages.toLocaleString('es')}</span>] as [string, ReactNode]] : []),
  ];
  return (
    <Panel className={className} title="Manual publicado" actions={<More href="#/manual">Detalles</More>} bodyClassName="@container">
      {!status ? <div aria-hidden="true" className="flex flex-col gap-3"><Skeleton className="aspect-[16/10] h-auto w-full rounded-md" /><Skeleton className="w-1/2" /></div> : (
        <div className="grid gap-4 @md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @md:items-start">
          {exists ? <div className="max-sm:hidden"><SitePreview url={url} /></div> : (
            <div className="grid aspect-[16/10] place-items-center rounded-md border border-dashed max-sm:aspect-auto max-sm:py-6 border-line-strong px-4 text-center text-[13px] text-ink-3">El manual todavía no se ha generado.</div>
          )}
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13px]">
            {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-3">{k}</dt><dd className="m-0 min-w-0 truncate text-ink-2">{v}</dd></div>)}
          </dl>
        </div>
      )}
    </Panel>
  );
}
