/* Editor de un tour: pasos a la izquierda, captura con recuadro editable al centro, formulario del paso a la derecha. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleHelp, Play, Rocket, EyeOff, Save } from 'lucide-react';
import { Button, Callout, CopyButton, Dialog, ErrorState, Input, ImagePicker, Spinner, StatusBadge, useToast } from '@/components/ui';
import { useBreadcrumbs } from '@/components/layout/Page';
import { api, ApiError, type Asset } from '@/lib/api';
import { toursApi, type Tour } from '@/lib/api.tours';
import { assetRel } from '@/lib/assets';
import { can, errText, useAuth } from '@/lib/auth';
import { useAsync, useHotkeys, useUnsavedChanges } from '@/lib/hooks';
import { statsChanged, store } from '@/lib/util';
import { Coach, useCoachSeen, type CoachStep } from '@/features/onboarding/Coach';
import { StepList } from './StepList';
import { FirstStepGuide, StepForm, StepStage, useTourSteps } from './StepPanels';
import { TourPlayer } from './TourPlayer';
import { LIMITS, issuesOf, signature, toApi, toEdit, validateTour, type Issue, type Spot, type TourStep } from './tourModel';

const COACH_KEY = 'portal-coach-tours-v1';
const GENERAL_COACH_KEY = 'portal-coach-v2';

export default function TourEditor({ id }: { id: number }) {
  const { data, error, loading, reload } = useAsync(() => toursApi.get(id), [id]);
  if (error) return <div className="mx-auto w-full max-w-[1040px] px-8 py-7 max-md:px-4"><ErrorState error={error} onRetry={reload} title="No se pudo abrir el tour" /><Button className="mt-3" asChild><a href="#/tours">Volver a Tours</a></Button></div>;
  if (loading && !data) return <div className="p-8"><Spinner block /></div>;
  if (!data) return null;
  return <Editor key={`${data.id}-${data.version}-${data.updated_at}`} tour={data} reload={reload} />;
}

function Editor({ tour, reload }: { tour: Tour; reload: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = can(user, 'editor');
  const [title, setTitle] = useState(tour.title);
  const [description, setDescription] = useState(tour.description ?? '');
  const assets = useAsync(() => api.assets({}), []);
  const { steps, setSteps, setSel, cur, curIdx, update, addWith, upload, uploading, duplicate, remove } = useTourSteps(() => toEdit(tour.steps), () => { assets.reload(); statsChanged(); });
  const [status, setStatus] = useState(tour.status);
  const [version, setVersion] = useState(tour.version);
  const [base, setBase] = useState(() => signature(tour.title, tour.description ?? '', toEdit(tour.steps)));
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [pick, setPickRaw] = useState<'add' | 'change' | null>(null);
  const [pickN, setPickN] = useState(0); // remonta el selector para que cada apertura empiece limpia
  const setPick = (m: 'add' | 'change' | null) => { if (m) setPickN((n) => n + 1); setPickRaw(m); };
  const [preview, setPreview] = useState(false);
  const [coach, setCoach] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<'add' | 'change'>('add');
  const [seen, markSeen] = useCoachSeen(COACH_KEY);

  const known = useMemo(() => (assets.data ? new Set(assets.data.map((a) => assetRel(a.path))) : undefined), [assets.data]);

  const issues = useMemo(() => validateTour(toApi(steps) as TourStep[], known), [steps, known]);
  const dirty = signature(title, description, steps) !== base;
  useUnsavedChanges(dirty);
  const crumbs = useMemo(() => [{ label: 'Contenido' }, { label: 'Tours', href: '#/tours' }, { label: tour.title }], [tour.title]);
  useBreadcrumbs(crumbs);

  /* Recorrido propio del editor: solo la primera vez, y nunca encima del recorrido general. */
  useEffect(() => {
    if (seen || !store.get(GENERAL_COACH_KEY, false)) return;
    const t = setTimeout(() => setCoach(true), 900);
    return () => clearTimeout(t);
  }, [seen]);
  const coachSteps: CoachStep[] = useMemo(() => [
    { target: '[data-coach="tour-steps"]', placement: 'right', title: 'Los pasos del tour', body: <p className="m-0">Cada paso es una captura. Añada pasos con <b>Añadir paso</b> y arrástrelos por el asa para cambiar el orden.</p> },
    { target: '[data-coach="tour-stage"]', placement: 'top', title: 'Marque la zona', body: <p className="m-0">Arrastre sobre la captura para dibujar el recuadro que se resalta. Puede moverlo, cambiar su tamaño o ajustarlo con las flechas.</p> },
    { target: '[data-coach="tour-form"]', placement: 'left', title: 'Escriba qué hacer', body: <p className="m-0">Título y texto del paso; use <b>Negrita</b> para destacar botones o campos. Opcionalmente, enlace a la página del manual con más detalle.</p> },
    { target: '[data-coach="tour-actions"]', placement: 'bottom', title: 'Pruebe y publique', body: <p className="m-0"><b>Probar tour</b> muestra lo que verá el lector. <b>Guardar</b> conserva el borrador; <b>Publicar</b> lo lleva al manual en la próxima publicación.</p> },
  ], []);

  /* Persistencia */
  const persist = useCallback(async (next?: 'draft' | 'published', force = false) => {
    if (!canEdit || saving) return false;
    const target = next ?? status;
    if (target === 'published') {
      const bad = validateTour(toApi(steps) as TourStep[], known);
      if (bad.length) {
        setShowIssues(true);
        const b = bad[0]!;
        if (b.step != null) setSel(steps[b.step]!.key);
        toast(`No se puede publicar: ${b.step == null ? '' : `paso ${b.step + 1}: `}${b.message}${bad.length > 1 ? ` (y ${bad.length - 1} más)` : ''}`, 'error');
        return false;
      }
    }
    setSaving(true);
    try {
      const v = force ? (await toursApi.get(tour.id)).version : version;
      const t = await toursApi.save(tour.id, { title: title.trim() || tour.title, description, steps: toApi(steps) as TourStep[], status: target, version: v });
      setVersion(t.version); setStatus(t.status); setConflict(false); setShowIssues(false);
      setBase(signature(title.trim() || tour.title, description, steps));
      statsChanged();
      toast(target === 'published' && status !== 'published' ? 'Tour publicado' : target === 'draft' && status === 'published' ? 'Tour devuelto a borrador' : `Guardado · versión ${t.version}`);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && /cambi/.test(e.message)) setConflict(true); else toast(errText(e), 'error');
      return false;
    } finally { setSaving(false); }
  }, [canEdit, saving, status, steps, known, version, title, description, tour.id, tour.title, toast]);
  useHotkeys({ 'mod+s': () => void persist() });

  /* Pasos */
  const choose = (a: Asset) => {
    const rel = assetRel(a.path);
    if (pick === 'change' && cur) update(cur.key, { image: rel });
    else addWith(rel);
  };

  const curIssues = (field: Issue['field']) => (showIssues && curIdx >= 0 ? issuesOf(issues, curIdx).find((x) => x.field === field)?.message : undefined);
  const snippet = tour.snippet;
  const stepsReady = !!steps.length;

  return (
    <div className="mx-auto w-full max-w-[1680px] animate-fade-in px-8 pb-14 pt-5 max-md:px-4">
      {/* Cabecera */}
      <div className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-3 border-b border-line pb-4">
        <div className="min-w-[260px] max-w-[760px] flex-1">
          <div className="flex items-center gap-3">
            <Input aria-label="Título del tour" data-testid="tour-title" value={title} maxLength={LIMITS.title} readOnly={!canEdit} onChange={(e) => setTitle(e.target.value)}
              className="h-10 border-transparent bg-transparent px-2 text-xl font-semibold hover:border-line focus:bg-bg" />
            <StatusBadge status={status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 text-sm text-ink-3">
            <span className="flex items-center gap-1">Identificador <code className="font-mono text-ink-2" data-testid="tour-slug">{tour.slug}</code></span>
            <span className="flex items-center gap-1"><code className="font-mono text-ink-2">{snippet}</code><CopyButton text={snippet} label="Copiar fragmento" /></span>
          </div>
          <Input aria-label="Descripción del tour" placeholder="Descripción (opcional, nota interna)" size="sm" value={description} maxLength={1000} readOnly={!canEdit} onChange={(e) => setDescription(e.target.value)}
            className="mt-2 max-w-[560px] border-transparent bg-transparent px-2 hover:border-line focus:bg-bg" />
        </div>
        <div data-coach="tour-actions" className="ml-auto flex flex-wrap items-center gap-2">
          {dirty && <span className="text-sm text-warn" role="status">Cambios sin guardar</span>}
          <Button onClick={() => setPreview(true)} data-testid="try-tour"><Play size={15} /> Probar tour</Button>
          {canEdit && (
            <>
              <Button variant={dirty ? 'primary' : 'secondary'} disabled={saving || !dirty} onClick={() => void persist()} data-testid="save-tour"><Save size={15} /> Guardar</Button>
              {status === 'published'
                ? <Button disabled={saving} onClick={() => void persist('draft')} data-testid="unpublish-tour"><EyeOff size={15} /> Despublicar</Button>
                : <Button variant={dirty ? 'secondary' : 'primary'} disabled={saving} onClick={() => void persist('published')} data-testid="publish-tour"><Rocket size={15} /> Publicar</Button>}
            </>
          )}
          <IconHelp onClick={() => setCoach(true)} />
        </div>
      </div>

      {showIssues && issues.length > 0 && (
        <Callout tone="warn" className="mb-4">
          <strong>Revise estos puntos antes de publicar</strong>
          <ul className="mb-0 mt-1.5 list-disc space-y-0.5 pl-5" data-testid="issues">
            {issues.map((x, n) => (
              <li key={n}>{x.step == null ? x.message : (
                <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left text-ink underline" onClick={() => setSel(steps[x.step!]!.key)}>Paso {x.step + 1}</button>
              )}{x.step != null && <>: {x.message}</>}</li>
            ))}
          </ul>
        </Callout>
      )}

      {/* Pasos | captura | formulario. Por debajo de 1500 px el formulario pasa bajo la captura para que esta tenga espacio. */}
      <div className="grid items-start gap-5 lg:grid-cols-[256px_minmax(0,1fr)] min-[1500px]:grid-cols-[272px_minmax(0,1fr)_340px] max-lg:grid-cols-1">
        <div data-coach="tour-steps" className="lg:row-span-2 min-[1500px]:row-span-1 lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto">
          {stepsReady ? (
            <StepList steps={steps} selected={cur?.key ?? null} onSelect={setSel} onReorder={setSteps} onAdd={() => setPick('add')} onDuplicate={duplicate} onDelete={remove} issues={showIssues ? issues : []} readOnly={!canEdit} />
          ) : (
            <div className="rounded-lg border border-line p-3.5 text-sm text-ink-3">Aún no hay pasos.</div>
          )}
        </div>

        <div data-coach="tour-stage" className="min-w-0">
          {cur ? (
            <StepStage cur={cur} curIdx={curIdx} total={steps.length} canEdit={canEdit} uploading={uploading}
              onChangeImage={() => setPick('change')} onUploadOther={() => { uploadFor.current = 'change'; fileRef.current?.click(); }}
              onSpot={(r: Spot | null) => update(cur.key, { spot: r })} onClearSpot={() => update(cur.key, { spot: null })} imageIssue={curIssues('image')} spotIssue={curIssues('spot')} />
          ) : (
            <FirstStepGuide canEdit={canEdit} uploading={uploading} onPick={() => setPick('add')} onUpload={(f) => void upload(f, 'add')} />
          )}
        </div>

        <div data-coach="tour-form" className="min-w-0">
          {cur && <StepForm cur={cur} curIdx={curIdx} canEdit={canEdit} update={update} issue={curIssues} />}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden data-testid="file-input" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void upload(f, uploadFor.current); }} />
      <ImagePicker key={pickN} open={pick != null} onOpenChange={(o) => !o && setPick(null)} onSelect={choose} title={pick === 'change' ? 'Cambiar la captura del paso' : 'Elegir la captura del nuevo paso'} confirmLabel="Usar esta captura" />
      <TourPlayer open={preview} onOpenChange={setPreview} title={title} steps={toApi(steps) as TourStep[]} />
      {coach && <Coach label="Recorrido del editor de tours" steps={coachSteps} onClose={() => { setCoach(false); markSeen(); }} />}
      <Dialog open={conflict} onOpenChange={setConflict} title="Otra persona guardó este tour" description="La versión del servidor es más reciente que la que abrió."
        footer={<>
          <Button className="mr-auto" onClick={() => setConflict(false)}>Seguir editando</Button>
          <Button onClick={() => { setConflict(false); reload(); }}>Recargar y descartar lo mío</Button>
          <Button variant="primary" onClick={() => void persist(undefined, true)}>Guardar el mío encima</Button>
        </>}>
        <p className="m-0 text-ink-2">Puede seguir editando y decidir después, recargar la versión del servidor (se pierde lo que cambió aquí) o guardar su versión encima.</p>
      </Dialog>
    </div>
  );
}

function IconHelp({ onClick }: { onClick: () => void }) {
  return <Button variant="ghost" size="icon" aria-label="Ver la guía del editor" title="Ver la guía del editor" onClick={onClick}><CircleHelp size={17} /></Button>;
}
