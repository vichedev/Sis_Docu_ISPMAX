/*
 * Manual publicado: el sitio público que ven los lectores. Estado, última actualización, páginas, duración,
 * registro, «Actualizar ahora» y «Ver el manual». La actualización automática se configura en Ajustes › Actualización del manual,
 * y la del sistema (código) en Ajustes › Actualización del sistema.
 */
import { useState } from 'react';
import { ExternalLink, RefreshCw, ScrollText, Settings2 } from 'lucide-react';
import { Button, Callout, DescriptionList, Panel, Skeleton, StatusBadge, useToast } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { siteApi } from '@/lib/api.site';
import { can, errText, useAuth } from '@/lib/auth';
import { fmtDate, relTime } from '@/lib/util';
import { siteHref } from '@/lib/siteHref';
import { SitePreview } from '@/features/dashboard/HomePanels';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { fmtBytes, isLive, liveOk, liveProblem } from '@/lib/siteModel';
import { JobLogDialog, fmtDur, useClearCache, useSite, useSiteLabel } from './site';

/** Modo en vivo: el servidor dibuja el manual desde la base de datos; guardar = visible al instante. Sin registro ni construcciones. */
function LiveSitePage() {
  const { user } = useAuth();
  const { status } = useSite();
  const clear = useClearCache();
  const st = useAsync(() => api.stats(), []);
  const url = siteHref('', status?.siteUrl);
  const ok = liveOk(status);
  const published = st.data ? st.data.pages - st.data.drafts : null;
  const lc = status?.lastChange;
  const cache = status?.cache;
  return (
    <Page title="Manual publicado" description="El manual que ven los lectores. Se dibuja en vivo desde lo que guarda aquí: cada cambio en una página publicada se ve al instante. Los borradores no aparecen hasta que se publican."
      actions={<>
        {can(user, 'editor') && <Button disabled={!status || clear.busy} onClick={() => void clear.run()}><RefreshCw size={16} className={clear.busy ? 'animate-spin' : ''} /> Vaciar caché</Button>}
        <Button variant="primary" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Ver el manual</a></Button>
      </>}>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel title="Estado">
          {!status ? <div aria-hidden="true" className="flex flex-col gap-2.5"><Skeleton className="w-2/3" /><Skeleton className="w-1/2" /><Skeleton className="w-3/5" /></div> : (
            <div className="flex flex-col gap-4">
              <DescriptionList items={[
                ['Estado', <StatusBadge status={ok ? 'ok' : 'error'} label={ok ? 'Manual en vivo' : 'Con problemas'} />],
                ['Páginas publicadas', published != null ? <span className="tabular-nums">{published.toLocaleString('es')}</span> : <span className="text-ink-3">—</span>],
                ['Borradores', <span className="flex items-center gap-2"><span className="tabular-nums">{status.drafts}</span> <a href="#/borradores">ver borradores</a></span>],
                ['Último cambio', lc?.at ? <span title={fmtDate(lc.at)}>{relTime(lc.at)}{lc.route ? <> · <a href={siteHref(lc.route, status.siteUrl)} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[12.5px]">{lc.route}</a></> : null}</span> : <span className="text-ink-3">Aún no consta</span>],
                ['Caché', cache?.pages != null || cache?.bytes != null ? <span className="tabular-nums">{cache?.compiled != null ? `${cache.compiled.toLocaleString('es')} páginas compiladas` : `${(cache?.pages ?? 0).toLocaleString('es')} páginas`} · {fmtBytes(cache?.bytes)}</span> : <span className="text-ink-3">—</span>],
                ['Diseño del manual', status.themeBuiltAt ? <span title={fmtDate(status.themeBuiltAt)}>compilado {relTime(status.themeBuiltAt)}</span> : <span className="text-ink-3">No consta</span>],
                ['Dirección', <a href={url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[12.5px]">{url}</a>],
              ]} />
              {!ok && <Callout tone="danger"><strong>El manual no se puede mostrar.</strong> {liveProblem(status)}</Callout>}
              <p className="m-0 border-t border-line pt-3 text-sm text-ink-3">
                Los cambios se publican al instante: no hay reconstrucciones ni nada que esperar. «Vaciar caché» solo hace falta si algo no se ve como debe; el manual vuelve a prepararse solo.
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Vista previa" description="Así se ve ahora la portada del manual publicado." className="max-sm:hidden">
          {!status ? <Skeleton className="aspect-[16/10] h-auto w-full rounded-md" /> : ok ? <SitePreview url={url} /> : (
            <div className="grid aspect-[16/10] place-items-center rounded-md border border-dashed border-line-strong px-4 text-center text-[13px] text-ink-3">El manual no se puede mostrar todavía.</div>
          )}
        </Panel>
      </div>
    </Page>
  );
}

export default function SitePage() {
  const { status } = useSite();
  return isLive(status) ? <LiveSitePage /> : <StaticSitePage />;
}

function StaticSitePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { status, refresh } = useSite();
  const s = useSiteLabel();
  const [log, setLog] = useState(false);
  const [busy, setBusy] = useState(false);
  const isAdmin = can(user, 'admin');
  const lb = status?.lastBuild;
  const logId = status?.building?.jobId ?? lb?.jobId ?? null;
  const building = status?.state === 'building';
  const url = siteHref('', status?.siteUrl);
  const exists = status ? status.siteExists !== false : null;

  const rebuild = async () => {
    setBusy(true);
    try { await siteApi.rebuild(); toast('Actualizando el manual…', 'info'); refresh(); } catch (e) { toast(errText(e), 'error'); } finally { setBusy(false); }
  };

  const auto = status?.autoPublish;
  const delay = status?.delayMs != null ? Math.round(status.delayMs / 1000) : null;

  return (
    <Page title="Manual publicado" description="El manual público que ven los lectores. Al guardar algo ya publicado, se actualiza solo en segundo plano; los borradores no lo cambian hasta que se publican."
      actions={<>
        {can(user, 'editor') && <Button variant="primary" disabled={!status || busy || building} onClick={() => void rebuild()}><RefreshCw size={16} className={building ? 'animate-spin' : ''} /> {building ? 'Actualizando…' : 'Actualizar ahora'}</Button>}
        <Button asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Ver el manual</a></Button>
      </>}>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel title="Estado" actions={logId != null ? <Button size="sm" variant="ghost" onClick={() => setLog(true)}><ScrollText size={14} /> Ver el registro</Button> : undefined}>
          {!status ? <div aria-hidden="true" className="flex flex-col gap-2.5"><Skeleton className="w-2/3" /><Skeleton className="w-1/2" /><Skeleton className="w-3/5" /></div> : (
            <div className="flex flex-col gap-4">
              <DescriptionList items={[
                ['Estado', <><StatusBadge status={s.key === 'idle' ? 'ok' : s.key === 'building' ? 'running' : s.key === 'error' ? 'error' : 'neutral'} label={s.short ? <>{s.label} · {s.short}</> : s.label} /></>],
                ['Última actualización', lb?.finishedAt ? <span title={fmtDate(lb.finishedAt)}>{relTime(lb.finishedAt)}{lb.status === 'error' ? ' (con error)' : ''} <span className="text-ink-3">· {fmtDate(lb.finishedAt)}</span></span> : <span className="text-ink-3">Aún no consta</span>],
                ['Páginas', lb?.pages != null ? <span className="tabular-nums">{lb.pages.toLocaleString('es')}</span> : <span className="text-ink-3">—</span>],
                ['Duración', <span className="tabular-nums">{fmtDur(lb?.durationMs)}</span>],
                ['Dirección', <a href={url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[12.5px]">{url}</a>],
                ['Borradores', <span className="flex items-center gap-2"><span className="tabular-nums">{status.drafts}</span> <a href="#/borradores">ver borradores</a></span>],
              ]} />
              {s.key === 'pending' && <p className="m-0 text-sm text-ink-3">{s.detail}</p>}
              {status.state === 'error' && <Callout tone="danger"><strong>La última actualización falló.</strong> El manual anterior sigue publicado.{lb?.error && <> Motivo: <code>{lb.error}</code></>} {logId != null && 'Revise el registro, corrija y pulse «Actualizar ahora».'}</Callout>}
              {status.restartRequired && <Callout tone="warn"><strong>Hace falta reiniciar el sistema</strong> para servir el manual con la configuración nueva.{isAdmin && <> Hágalo en <a href="#/ajustes/sistema">Ajustes › Actualización del sistema</a>.</>}</Callout>}
              {!!status.pendingReasons?.length && (
                <div className="border-t border-line pt-3">
                  <div className="mb-1 text-sm font-medium text-ink-2">Cambios que esperan</div>
                  <ul className="m-0 max-h-40 list-disc overflow-y-auto pl-5 text-sm text-ink-2">{status.pendingReasons.slice(-8).map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}
              <div className="border-t border-line pt-3 text-sm text-ink-3">
                <span className="font-medium text-ink-2">Actualización automática: </span>
                {auto === false ? 'desactivada. Los cambios esperan hasta que pulse «Actualizar ahora».'
                  : auto ? `activada${delay ? `, ${delay} s después del último cambio guardado` : ''}.` : 'según los ajustes.'}
                {isAdmin && <> <a href="#/ajustes/manual" className="inline-flex items-center gap-1"><Settings2 size={13} aria-hidden="true" /> Cambiar</a></>}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Vista previa" description="Así se ve ahora la portada del manual publicado." className="max-sm:hidden">
          {!status ? <Skeleton className="aspect-[16/10] h-auto w-full rounded-md" /> : exists ? <SitePreview url={url} /> : (
            <div className="grid aspect-[16/10] place-items-center rounded-md border border-dashed border-line-strong px-4 text-center text-[13px] text-ink-3">El manual todavía no se ha generado. Pulse «Actualizar ahora» para generarlo.</div>
          )}
        </Panel>
      </div>
      <JobLogDialog jobId={logId} open={log} onOpenChange={setLog} title="Registro de la actualización del manual" />
    </Page>
  );
}
