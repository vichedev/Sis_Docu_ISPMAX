/*
 * Bloque <Tour id="…" /> en el lienzo: vista previa gráfica del tour (captura con el recuadro y «Paso n de N»),
 * con «Editar tour» (abre TourStudio con sus datos), «Probar» (TourPlayer) y «Cambiar» (TourPicker).
 * Sin tour elegido: elegir uno o crear uno nuevo. Recién insertado abre la lista de tours.
 */
import { useEffect, useState } from 'react';
import { ArrowLeftRight, Pencil, Play, Plus, Route } from 'lucide-react';
import { Button, Spinner, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TourPlayer } from '@/features/tours/TourPlayer';
import { toEdit, toApi, type TourStep } from '@/features/tours/tourModel';
import { autoPick } from '../blocks/commands';
import { useEditor } from '../blocks/context';
import type { BodyProps } from '../blocks/BlockList';
import { TourPicker } from './TourPicker';
import { TourPreview } from './TourPreview';
import { useTourDetail } from './tourData';

export function TourBody({ block: b, update }: BodyProps<'tour'>) {
  const ed = useEditor();
  const { tour, loading, error } = useTourDetail(b.slug);
  const [picker, setPicker] = useState(false);
  const [play, setPlay] = useState(false);
  const canEdit = !ed.readOnly && !!ed.openTour;
  useEffect(() => { if (autoPick.has(b.id)) { autoPick.delete(b.id); if (!ed.readOnly) setPicker(true); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createNew = () => ed.openTour?.({ mode: 'create', images: [], onSaved: ({ slug }) => update({ slug }) });
  const edit = () => { if (b.slug) ed.openTour?.({ mode: 'edit', slug: b.slug }); };
  const pickerEl = !ed.readOnly && <TourPicker open={picker} onOpenChange={setPicker} current={b.slug} onSelect={(slug) => update({ slug })} onCreate={ed.openTour ? createNew : undefined} />;

  if (!b.slug) {
    if (ed.readOnly) return null;
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-line-strong bg-subtle px-4 py-6 text-center text-sm text-ink-3" data-testid="tour-empty">
        <span className="grid size-10 place-items-center rounded-[11px] bg-accent-soft text-accent-ink"><Route size={18} /></span>
        <span className="max-w-[46ch]">Un tour guía al lector paso a paso sobre capturas, con la zona importante resaltada.</span>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => setPicker(true)} data-testid="tour-choose"><ArrowLeftRight size={14} /> Elegir un tour</Button>
          {ed.openTour && <Button size="sm" variant="ghost" onClick={createNew}><Plus size={14} /> Crear tour nuevo</Button>}
        </div>
        {pickerEl}
      </div>
    );
  }

  const steps = (tour?.steps ?? []) as Partial<TourStep>[];
  const draft = tour?.status === 'draft';
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-bg p-3 shadow-[0_1px_2px_rgb(20_20_30/0.05)]" data-testid="tour-block" data-slug={b.slug}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent-ink"><Route size={17} /></span>
        <div className="min-w-[min(100%,15rem)] flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold leading-snug text-ink">{tour ? tour.title : b.slug}</span>
            {draft && <StatusBadge status="draft" />}
          </div>
          <div className={cn('text-sm leading-snug', (!tour && !loading) || draft ? 'text-warn' : 'text-ink-3')}>
            {tour ? (draft ? 'Borrador: no se verá en el manual hasta publicarlo. Complételo con «Editar tour».' : `Tour guiado · ${steps.length} ${steps.length === 1 ? 'paso' : 'pasos'} · ${b.slug}`)
              : loading ? 'Cargando tour…' : error ? 'No se pudo cargar el tour.' : 'No hay ningún tour con este identificador.'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tour && steps.length > 0 && <Button size="sm" variant="ghost" onClick={() => setPlay(true)} data-testid="tour-play"><Play size={14} /> Probar</Button>}
          {canEdit && tour && <Button size="sm" onClick={edit} data-testid="tour-edit"><Pencil size={14} /> Editar tour</Button>}
          {!ed.readOnly && <Button size="sm" variant="ghost" onClick={() => setPicker(true)} aria-label="Cambiar el tour de este bloque"><ArrowLeftRight size={14} /><span className="max-sm:hidden">Cambiar</span></Button>}
        </div>
      </div>
      {loading && !tour ? <div className="py-6"><Spinner block /></div>
        : tour && steps.length > 0 ? <TourPreview steps={steps} title={tour.title} />
        : tour ? <p className="m-0 rounded-md border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-3">Este tour aún no tiene pasos.</p> : null}
      {tour && <TourPlayer open={play} onOpenChange={setPlay} title={tour.title} steps={toApi(toEdit(steps)) as TourStep[]} />}
      {pickerEl}
    </div>
  );
}
