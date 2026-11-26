/*
 * Inicio: estado del manual en una frase, indicadores, el manual por secciones (como su menú), pendientes,
 * continuar editando, actividad y una vista del manual publicado. Composición centrada (Page width="centered")
 * con rejilla por consultas de contenedor: 1 columna → 2 (≥ 42rem) → 3 (≥ 64rem). Lógica pura en homeModel.ts.
 */
import { useMemo, useState } from 'react';
import { ArrowUpRight, FileCheck2, FilePen, FilePlus, ImagePlus, Images, Route as RouteIcon, Users } from 'lucide-react';
import { Button, Callout } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { api } from '@/lib/api';
import { siteApi } from '@/lib/api.site';
import { toursApi } from '@/lib/api.tours';
import { can, useAuth, useStats } from '@/lib/auth';
import { useAsync, useWindowEvent } from '@/lib/hooks';
import { CONTENT_EVENT, STATS_EVENT, fmtDate, relTime } from '@/lib/util';
import { cn } from '@/lib/cn';
import { useSite, useSiteLabel } from '@/features/system/site';
import { ContentLoadCard } from '@/features/backups/ContentLoadCard';
import { NewTourDialog } from '@/features/tours/NewTourDialog';
import { ActivityPanel, AttentionPanel, MetricStrip, RecentPanel, SectionsPanel, SitePanel, type Metric } from './HomePanels';
import { attentionItems, greeting, plural, sectionOverview } from './homeModel';
import { siteHref } from '@/lib/siteHref';
import { isLive } from '@/lib/siteModel';

const DOT = { live: 'bg-ok', idle: 'bg-ok', pending: 'bg-warn-dot', building: 'animate-pulse bg-signal', error: 'bg-danger', loading: 'bg-ink-4' } as const;

/** Frase de estado bajo el saludo: «El manual está al día · 285 páginas publicadas · actualizado hace 5 min · Ver el manual». */
function SiteSentence({ published }: { published: number | null }) {
  const { status } = useSite();
  const s = useSiteLabel();
  const missing = status?.siteExists === false && s.key === 'idle';
  const head = s.key === 'live' ? 'El manual está en vivo'
    : s.key === 'error' && isLive(status) ? 'El manual no se puede mostrar'
    : s.key === 'idle' ? (missing ? 'El manual todavía no se ha generado' : 'El manual está al día')
    : s.key === 'pending' ? `Hay cambios pendientes${s.short ? ` · ${s.short}` : ''}`
    : s.key === 'building' ? `Actualizando el manual… ${s.short}`
    : s.key === 'error' ? 'No se pudo actualizar el manual · el anterior sigue publicado'
    : s.label;
  const live = isLive(status);
  const at = live ? status?.lastChange?.at : status?.lastBuild?.finishedAt;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', missing ? 'bg-warn-dot' : DOT[s.key])} />
      <span aria-live="polite" className={cn(s.key === 'error' ? 'text-danger' : 'text-ink-2')}>{head}</span>
      {published != null && <><span aria-hidden="true" className="text-ink-4">·</span><span>{plural(published, 'página publicada', 'páginas publicadas')}</span></>}
      {at && s.key !== 'building' && <><span aria-hidden="true" className="text-ink-4">·</span><span title={fmtDate(at)}>{live ? 'último cambio' : 'actualizado'} {relTime(at)}</span></>}
      {status && !missing && <><span aria-hidden="true" className="text-ink-4">·</span>
        <a href={siteHref('', status.siteUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium">Ver el manual<ArrowUpRight size={14} aria-hidden="true" /></a></>}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isEditor = can(user, 'editor');
  const isAdmin = can(user, 'admin');
  const shared = useStats().stats;
  const { status: site } = useSite();
  const [newTour, setNewTour] = useState(false);

  const st = useAsync(() => api.stats(), []);
  const tree = useAsync(() => api.structure(), []);
  const tours = useAsync(() => toursApi.list(), []);
  // Sin consultar el remoto (fetch=0): el Inicio no debe esperar a Git; Ajustes › Actualización del sistema lo comprueba al abrirlo.
  const ver = useAsync(() => (isAdmin ? siteApi.version(false) : Promise.resolve(null)), [isAdmin]);
  useWindowEvent(STATS_EVENT, st.reload);
  useWindowEvent(CONTENT_EVENT, tree.reload);

  const s = st.data ?? shared;
  const first = (user.display_name || user.username).split(' ')[0];
  const published = s ? s.pages - s.drafts : null;
  const tourRows = tours.data;
  const toursPublished = tourRows ? tourRows.filter((t) => t.status === 'published').length : null;
  const toursDraft = tourRows ? tourRows.length - (toursPublished ?? 0) : null;
  const overview = useMemo(() => (s ? sectionOverview(s.bySeccion, tree.data?.secciones) : null), [s, tree.data]);

  const attention = attentionItems({
    role: user.role, now: Date.now(),
    drafts: s?.drafts ?? site?.drafts,
    toursDraft,
    site: site ? { state: site.state, mode: site.mode, message: site.message, siteExists: site.siteExists, autoPublish: site.autoPublish } : null,
    behind: ver.data?.behind, needsRestart: ver.data?.needsRestart,
    lastBackupAt: s ? (s.lastBackup?.created_at ?? null) : undefined,
  });
  const attentionLoading = !s || !site || tours.loading;

  const metrics: Metric[] = [
    { key: 'pub', label: 'Páginas publicadas', icon: <FileCheck2 size={15} />, value: published, href: '#/paginas?estado=published',
      context: s ? (s.drafts ? `de ${s.pages.toLocaleString('es')} en total` : 'todas las páginas') : null },
    { key: 'drafts', label: 'Borradores', icon: <FilePen size={15} />, value: s?.drafts ?? null, href: '#/borradores',
      context: s ? (s.drafts ? 'esperan a publicarse' : 'ninguno pendiente') : null, tone: s?.drafts ? 'warn' : undefined },
    { key: 'img', label: 'Imágenes', icon: <Images size={15} />, value: s?.assets ?? null, href: '#/imagenes', context: 'en la galería' },
    { key: 'tours', label: 'Tours publicados', icon: <RouteIcon size={15} />, value: toursPublished, href: '#/tours',
      context: tours.error ? 'no se pudo consultar' : toursDraft ? plural(toursDraft, 'en borrador', 'en borrador') : toursPublished === 0 ? 'ninguno todavía' : 'recorridos guiados' },
    { key: 'users', label: 'Personas con acceso', icon: <Users size={15} />, value: s?.users ?? null, href: isAdmin ? '#/usuarios' : undefined, context: 'cuentas activas' },
  ];

  return (
    <Page width="centered" title={`${greeting(new Date().getHours())}, ${first}`}
      description={<SiteSentence published={published} />}
      actions={isEditor && (
        <nav aria-label="Acciones rápidas" className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
          <Button asChild><a href="#/imagenes?subir=1"><ImagePlus size={16} /> Subir imagen</a></Button>
          <Button onClick={() => setNewTour(true)}><RouteIcon size={16} /> Nuevo tour</Button>
          <Button asChild variant="primary"><a href="#/contenido?nueva=1" data-coach="create"><FilePlus size={16} /> Crear página</a></Button>
        </nav>
      )}>
      <div className="@container">
        {isAdmin && user.twoFactor === false && (
          <Callout tone="warn" className="mb-5" action={<Button size="sm" asChild><a href="#/cuenta">Activar ahora</a></Button>}>
            <strong>Su cuenta de administrador no tiene verificación en dos pasos.</strong> Con ella, aunque alguien conozca su contraseña no podrá entrar al portal.
          </Callout>
        )}
        <MetricStrip items={metrics} loading={!s} />

        <div className="grid grid-cols-1 items-start gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {/* Columna de avisos: primero en el orden de lectura (lo que pide acción). En escritorio, a la derecha ocupando dos filas. */}
          <aside aria-label="Pendientes y manual publicado" className="flex min-w-0 flex-col gap-5 @2xl:col-span-2 @5xl:col-span-1 @5xl:col-start-3 @5xl:row-span-2 @5xl:row-start-1">
            {/* Sistema recién desplegado y vacío: primer paso = cargar el paquete de contenido (.ispmax). Solo para administradores. */}
            {s && s.pages === 0 && isAdmin && <ContentLoadCard onDone={st.reload} />}
            <AttentionPanel items={attention} loading={attentionLoading} />
            <SitePanel status={site} />
          </aside>

          <SectionsPanel className="@2xl:col-span-2 @5xl:col-start-1 @5xl:row-start-1"
            rows={overview?.rows ?? null} other={overview?.other ?? 0} loading={tree.loading} error={st.error} onRetry={st.reload} />
          <RecentPanel canEdit={isEditor} className={cn('h-full', !isAdmin && '@2xl:col-span-2', '@5xl:row-start-2 @5xl:col-start-1')} />
          {isAdmin && <ActivityPanel className="h-full @5xl:row-start-2 @5xl:col-start-2" />}
        </div>
      </div>
      {isEditor && <NewTourDialog open={newTour} onOpenChange={setNewTour} />}
    </Page>
  );
}
