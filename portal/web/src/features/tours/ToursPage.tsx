/* Lista de tours: buscar, filtrar, abrir, duplicar, publicar y eliminar (con «Deshacer»). */
import { useMemo, useState } from 'react';
import { Copy, CopyPlus, Ellipsis, EyeOff, PencilLine, Plus, Rocket, RotateCcw, Route as RouteIcon, Search, Trash2 } from 'lucide-react';
import { Button, CodeBlock, DropdownMenu, EmptyState, ErrorState, IconButton, SearchInput, SegmentedControl, SkeletonRows, StatusBadge, TBody, TD, TH, THead, TR, Table, useSort, useToast } from '@/components/ui';
import { Page, useBreadcrumbs } from '@/components/layout/Page';
import { ApiError } from '@/lib/api';
import { toursApi, type TourRow } from '@/lib/api.tours';
import { errText, can, useAuth } from '@/lib/auth';
import { useAsync, useDebounced } from '@/lib/hooks';
import { copy, fmtDate, go, relTime, statsChanged } from '@/lib/util';
import { NewTourDialog } from './NewTourDialog';
import { freeSlug, toApi, toEdit, validateTour } from './tourModel';

type Filter = 'all' | 'published' | 'draft' | 'deleted';
type SortKey = 'title' | 'status' | 'steps' | 'updated';

export default function ToursPage() {
  const { user } = useAuth();
  const toast = useToast();
  const editor = can(user, 'editor');
  const [status, setStatus] = useState<Filter>('all');
  const [qText, setQText] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const q = useDebounced(qText, 300);
  useBreadcrumbs([{ label: 'Contenido' }, { label: 'Tours' }]);
  const { data, error, loading, reload } = useAsync(() => toursApi.list({ q, status: status === 'all' ? '' : status }), [q, status]);
  const items = useMemo(() => data ?? [], [data]);
  const { sorted, props } = useSort<TourRow, SortKey>(items, (t, k) => (k === 'updated' ? +new Date(t.updated_at) : k === 'steps' ? t.stepsCount : k === 'status' ? t.status : t.title.toLowerCase()));
  const filtered = status !== 'all' || !!q;
  const deleted = status === 'deleted';

  const changed = () => { statsChanged(); reload(); };

  const duplicate = async (t: TourRow) => {
    setBusy(t.id);
    try {
      const taken = new Set((await toursApi.list()).map((x) => x.slug));
      let copyRow;
      for (let n = 0; ; n++) {
        try { copyRow = await toursApi.duplicate(t.id, freeSlug(t.slug, taken)); break; }
        catch (e) { if (e instanceof ApiError && e.status === 409 && n < 5) { taken.add(freeSlug(t.slug, taken)); continue; } throw e; }
      }
      toast('Copia creada como borrador');
      statsChanged();
      go(`/tours/${copyRow.id}`);
    } catch (e) { toast(errText(e), 'error'); }
    setBusy(null);
  };

  const setPublished = async (t: TourRow, publish: boolean) => {
    setBusy(t.id);
    try {
      const full = await toursApi.get(t.id);
      if (publish) {
        const issues = validateTour(toApi(toEdit(full.steps)) as never);
        if (issues.length) {
          const i = issues[0]!;
          toast(`No se puede publicar: ${i.step == null ? '' : `paso ${i.step + 1}: `}${i.message}`, 'error', { label: 'Abrir tour', run: () => go(`/tours/${t.id}`) });
          setBusy(null);
          return;
        }
      }
      await toursApi.save(t.id, { status: publish ? 'published' : 'draft', version: full.version });
      toast(publish ? 'Tour publicado' : 'Tour devuelto a borrador');
      changed();
    } catch (e) { toast(errText(e), 'error'); }
    setBusy(null);
  };

  const remove = async (t: TourRow) => {
    try {
      await toursApi.remove(t.id);
      toast(`Tour «${t.title}» eliminado`, 'ok', { label: 'Deshacer', run: () => { void toursApi.restore(t.id).then(() => { toast('Tour recuperado'); changed(); }).catch((e) => toast(errText(e), 'error')); } });
      changed();
    } catch (e) { toast(errText(e), 'error'); }
  };
  const restore = async (t: TourRow) => {
    try { await toursApi.restore(t.id); toast('Tour recuperado'); changed(); } catch (e) { toast(errText(e), 'error'); }
  };
  const copySnippet = async (t: TourRow) => toast((await copy(t.snippet)) ? 'Fragmento copiado: péguelo en una página' : 'No se pudo copiar', 'info');

  return (
    <Page title="Tours" description="Recorridos paso a paso sobre las capturas del manual: dónde ir y qué hacer."
      actions={editor && <Button variant="primary" data-testid="new-tour" onClick={() => setCreating(true)}><Plus size={16} /> Nuevo tour</Button>}>
      {(data?.length || filtered) ? (
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
          <SearchInput className="w-full sm:w-[340px]" aria-label="Buscar tours" placeholder="Buscar por título, identificador o descripción" value={qText} onValueChange={setQText} />
          <SegmentedControl label="Estado" value={status} onValueChange={setStatus}
            options={[{ value: 'all', label: 'Todos' }, { value: 'published', label: 'Publicados' }, { value: 'draft', label: 'Borradores' }, { value: 'deleted', label: 'Eliminados' }]} />
          <span className="flex-1" />
          {data && <span className="text-sm text-ink-3">{data.length} {data.length === 1 ? 'tour' : 'tours'}</span>}
        </div>
      ) : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonRows cols={5} /> : !items.length ? (
        filtered
          ? <EmptyState icon={<Search size={20} />} title={deleted ? 'No hay tours eliminados' : 'Ningún tour coincide'} action={<Button onClick={() => { setQText(''); setStatus('all'); }}>Quitar filtros</Button>}>Pruebe con otras palabras o quite los filtros.</EmptyState>
          : (
            <EmptyState icon={<RouteIcon size={20} />} title="Aún no hay tours" action={editor && <Button variant="primary" onClick={() => setCreating(true)}><Plus size={16} /> Crear el primer tour</Button>}>
              <p className="m-0">Un tour guía al lector sobre una captura: resalta una zona y dice qué hacer en ella. Se crea en tres pasos:</p>
              <ol className="mx-auto my-3 max-w-[420px] list-none space-y-1 p-0 text-left text-ink-2">
                <li><b className="text-ink">1.</b> Elija una captura de la galería.</li>
                <li><b className="text-ink">2.</b> Marque la zona sobre la imagen.</li>
                <li><b className="text-ink">3.</b> Escriba qué hacer. Repita para cada paso.</li>
              </ol>
              <CodeBlock className="mx-auto max-w-[360px] text-left" code={'<Tour id="mi-tour" />'} copyLabel="Copiar fragmento" />
              <p className="mb-0 mt-2 text-sm text-ink-3">Así se inserta un tour publicado en cualquier página.</p>
            </EmptyState>
          )
      ) : (
        <Table dim={loading || busy != null}>
          <THead><tr>
            <TH {...props('title')}>Título</TH><TH {...props('status')}>Estado</TH><TH hide="sm" {...props('steps')}>Pasos</TH><TH hide="md" {...props('updated')}>Última edición</TH><TH narrow><span className="sr-only">Acciones</span></TH>
          </tr></THead>
          <TBody>
            {sorted.map((t) => (
              <TR key={t.id} onClick={() => !deleted && go(`/tours/${t.id}`)}>
                <TD className="min-w-[200px]">
                  <a href={`#/tours/${t.id}`} className="block font-medium text-ink" onClick={(e) => deleted && e.preventDefault()}>{t.title}</a>
                  <span className="block font-mono text-xs text-ink-3">{t.slug}</span>
                </TD>
                <TD>{deleted ? <span className="text-sm text-ink-3">Eliminado</span> : <StatusBadge status={t.status} />}</TD>
                <TD hide="sm" numeric>{t.stepsCount}</TD>
                <TD hide="md" className="whitespace-nowrap"><span title={fmtDate(t.updated_at)}>{relTime(t.updated_at)}</span>{t.updated_by_name && <span className="block text-sm text-ink-3">{t.updated_by_name}</span>}</TD>
                <TD narrow>
                  <DropdownMenu label={`Acciones de ${t.title}`} trigger={<IconButton size="icon-sm" tooltip={false} label={`Acciones de ${t.title}`} icon={<Ellipsis size={16} />} />} items={deleted
                    ? [{ label: 'Recuperar', icon: <RotateCcw size={16} />, onSelect: () => void restore(t), disabled: !editor }]
                    : [
                      { label: editor ? 'Abrir y editar' : 'Abrir', icon: <PencilLine size={16} />, onSelect: () => go(`/tours/${t.id}`) },
                      { label: 'Copiar fragmento', icon: <Copy size={16} />, onSelect: () => void copySnippet(t) },
                      ...(editor ? [
                        { label: 'Duplicar', icon: <CopyPlus size={16} />, onSelect: () => void duplicate(t) },
                        t.status === 'published'
                          ? { label: 'Despublicar', icon: <EyeOff size={16} />, onSelect: () => void setPublished(t, false) }
                          : { label: 'Publicar', icon: <Rocket size={16} />, onSelect: () => void setPublished(t, true) },
                        { separator: true } as const,
                        { label: 'Eliminar', icon: <Trash2 size={16} />, danger: true, onSelect: () => void remove(t) },
                      ] : []),
                    ]} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <NewTourDialog open={creating} onOpenChange={setCreating} />
    </Page>
  );
}
