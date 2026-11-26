/*
 * Editor de tour a pantalla completa dentro del editor de bloques («Crear tour con esta imagen» / «Editar tour»).
 * Reutiliza las piezas de features/tours: StepList (pasos con arrastre), StepStage (RegionSelector), StepForm y TourPlayer.
 *   - Crear: la(s) imagen(es) de partida son los primeros pasos; título obligatorio; el identificador se genera del
 *     título (si existe, prueba `-2`, `-3`…). Guardar = POST /api/tours + PUT con los pasos; publica si es válido,
 *     si no queda en borrador y lo dice. Después avisa (onSaved) para insertar o actualizar el bloque <Tour>.
 *   - Editar: carga el tour por identificador; guardar = PUT con su versión (409 → diálogo de conflicto).
 *     Un tour publicado no se guarda incompleto (se marcan los puntos que faltan).
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Dialog as D } from 'radix-ui';
import { CircleAlert, CircleCheck, Play, Route, Save, X } from 'lucide-react';
import { Button, Callout, ConfirmDialog, Dialog, ErrorState, IconButton, ImagePicker, Input, Spinner, StatusBadge, useToast } from '@/components/ui';
import { api, ApiError, type Asset } from '@/lib/api';
import { toursApi, type Tour } from '@/lib/api.tours';
import { assetRel } from '@/lib/assets';
import { errText } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { statsChanged } from '@/lib/util';
import { cn } from '@/lib/cn';
import { StepList } from '@/features/tours/StepList';
import { FirstStepGuide, StepForm, StepStage, useTourSteps } from '@/features/tours/StepPanels';
import { TourPlayer } from '@/features/tours/TourPlayer';
import { LIMITS, emptyStep, issuesOf, signature, toApi, toEdit, validateTour, type EditStep, type Issue, type Spot, type TourStep } from '@/features/tours/tourModel';
import { slugCandidates } from '../model/palette';
import type { TourRequest } from '../blocks/context';
import { loadTourIndex, refreshTours, useTourIndex } from './tourData';

type Saved = { id: number; slug: string; status: 'draft' | 'published'; version: number };

/** Crea el tour con el primer identificador libre derivado del título. */
async function createUnique(title: string, taken: Set<string>): Promise<Tour> {
  for (const slug of slugCandidates(title)) {
    if (taken.has(slug)) continue;
    try { return await toursApi.create({ slug, title }); }
    catch (e) { if (!(e instanceof ApiError && e.status === 409)) throw e; }
  }
  throw new Error('No se encontró un identificador libre para este título. Pruebe con otro título.');
}

/** Lo que el contenido actual hace al pedir cerrar (Esc, X) y con las teclas (Ctrl+S). */
type Bind = { current: { close: () => void; key?: (e: KeyboardEvent) => void } };

export function TourStudio({ req, onClose }: { req: TourRequest | null; onClose: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => { if (req) setN((x) => x + 1); }, [req]);
  const bind: Bind = useRef({ close: onClose });
  return (
    <D.Root open={!!req} onOpenChange={(o) => { if (!o) bind.current.close(); }}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[900] bg-scrim data-[state=open]:animate-fade" />
        <D.Content aria-describedby={undefined} data-testid="tour-studio" onKeyDown={(e) => bind.current.key?.(e)}
          onEscapeKeyDown={(e) => { e.preventDefault(); bind.current.close(); }} onInteractOutside={(e) => e.preventDefault()}
          className="fixed inset-2 z-[901] flex flex-col overflow-hidden rounded-lg border border-line bg-bg shadow-pop focus:outline-none data-[state=open]:animate-fade max-sm:inset-0 max-sm:rounded-none">
          {req && (req.mode === 'edit'
            ? <EditLoader key={n} req={req} onClose={onClose} bind={bind} />
            : <Studio key={n} req={req} tour={null} onClose={onClose} bind={bind} />)}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

function EditLoader({ req, onClose, bind }: { req: Extract<TourRequest, { mode: 'edit' }>; onClose: () => void; bind: Bind }) {
  const { data, error, loading, reload } = useAsync(async () => {
    const row = (await toursApi.list()).find((t) => t.slug === req.slug);
    if (!row) throw new Error(`No hay ningún tour con el identificador «${req.slug}».`);
    return toursApi.get(row.id);
  }, [req.slug]);
  if (data) return <Studio key={`${data.id}-${data.version}`} req={req} tour={data} onClose={onClose} reload={reload} bind={bind} />;
  bind.current = { close: onClose };
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line pl-5 pr-3">
        <D.Title className="m-0 flex-1 text-[15px] font-semibold">Editar tour</D.Title>
        <D.Close asChild><IconButton label="Cerrar" tooltip={false} icon={<X size={18} />} /></D.Close>
      </header>
      <div className="p-8">{error && !loading ? <ErrorState error={error} onRetry={reload} title="No se pudo abrir el tour" /> : <Spinner block />}</div>
    </>
  );
}

function Studio({ req, tour, onClose, reload, bind }: { req: TourRequest; tour: Tour | null; onClose: () => void; reload?: () => void; bind: Bind }) {
  const toast = useToast();
  const creating = req.mode === 'create';
  const initial = useMemo<EditStep[]>(() => (tour ? toEdit(tour.steps) : creating ? req.images.map((im) => ({ ...emptyStep(im.path), alt: im.alt })) : []), []); // eslint-disable-line react-hooks/exhaustive-deps
  const assets = useAsync(() => api.assets({}), []);
  const known = useMemo(() => (assets.data ? new Set(assets.data.map((a) => assetRel(a.path))) : undefined), [assets.data]);
  const { steps, setSteps, setSel, cur, curIdx, update, addWith, upload, uploading, duplicate, remove } = useTourSteps(() => initial, () => { assets.reload(); statsChanged(); });
  const [title, setTitle] = useState(tour?.title ?? '');
  const [titleErr, setTitleErr] = useState('');
  const [saved, setSaved] = useState<Saved | null>(tour ? { id: tour.id, slug: tour.slug, status: tour.status, version: tour.version } : null);
  const [base] = useState(() => signature(tour?.title ?? '', '', initial));
  const [saving, setSaving] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pick, setPickRaw] = useState<'add' | 'change' | null>(null);
  const [pickN, setPickN] = useState(0);
  const setPick = (m: 'add' | 'change' | null) => { if (m) setPickN((x) => x + 1); setPickRaw(m); };
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<'add' | 'change'>('add');
  const titleRef = useRef<HTMLInputElement>(null);

  const issues = useMemo(() => validateTour(toApi(steps) as TourStep[], known), [steps, known]);
  const valid = issues.length === 0;
  const dirty = signature(title, '', steps) !== base;
  const published = saved?.status === 'published';
  const { tours: index } = useTourIndex();
  const taken = useMemo(() => new Set((index ?? []).map((t) => t.slug)), [index]);
  /** Identificador que tendrá: el primero libre entre los candidatos (si choca con uno eliminado, el servidor lo dirá y se prueba el siguiente). */
  const slugPreview = saved?.slug ?? (title.trim() ? slugCandidates(title).find((x) => !taken.has(x)) ?? slugCandidates(title)[0] : '');
  const curIssues = (field: Issue['field']) => (showIssues && curIdx >= 0 ? issuesOf(issues, curIdx).find((x) => x.field === field)?.message : undefined);

  useEffect(() => { if (creating) requestAnimationFrame(() => titleRef.current?.focus()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestClose = () => { if (dirty && !saving) setDiscard(true); else onClose(); };
  const choose = (a: Asset) => {
    const rel = assetRel(a.path);
    if (pick === 'change' && cur) update(cur.key, { image: rel }); else addWith(rel);
  };
  const goIssue = (x: Issue) => { setShowIssues(true); if (x.step != null && steps[x.step]) setSel(steps[x.step]!.key); };

  const save = async (force = false) => {
    if (saving) return;
    const t = title.trim();
    if (!t) { setTitleErr('Escriba el título del tour: lo ve el lector y de él sale el identificador.'); titleRef.current?.focus(); return; }
    if (!valid) {
      setShowIssues(true);
      if (published) { goIssue(issues[0]!); toast('El tour ya está publicado: complete los puntos marcados antes de guardar.', 'error'); return; }
    }
    if (!steps.length) { toast('Añada al menos un paso con su captura.', 'error'); return; }
    setSaving(true);
    try {
      let s = saved;
      if (!s) { const c = await createUnique(t, taken); s = { id: c.id, slug: c.slug, status: c.status, version: c.version }; setSaved(s); }
      const version = force ? (await toursApi.get(s.id)).version : s.version;
      const r = await toursApi.save(s.id, { title: t, steps: toApi(steps) as TourStep[], status: valid ? 'published' : 'draft', version });
      setSaved({ id: r.id, slug: r.slug, status: r.status, version: r.version });
      setConflict(false);
      refreshTours(); statsChanged();
      void loadTourIndex().catch(() => {});
      req.onSaved?.({ slug: r.slug, status: r.status });
      const first = issues[0];
      if (r.status === 'published') toast(creating ? `Tour «${t}» publicado y añadido ${req.mode === 'create' && req.images.length ? 'bajo la imagen' : 'a la página'}. Guarde la página para conservarlo.` : `Tour guardado · versión ${r.version}`);
      else toast(`Tour guardado como borrador (no se verá en el manual): ${first ? `${first.step == null ? '' : `paso ${first.step + 1}: `}${first.message}` : 'complete los pasos'}${issues.length > 1 ? ` (y ${issues.length - 1} más)` : ''}. Ábralo con «Editar tour» para terminarlo.`, 'info');
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && /cambi/.test(e.message)) setConflict(true);
      else toast(errText(e), 'error');
    } finally { setSaving(false); }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Ctrl+S guarda el tour (y no la página que hay detrás).
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); e.stopPropagation(); void save(); }
  };

  const primaryLabel = creating && !tour ? (valid ? 'Guardar y añadir al manual' : 'Guardar borrador y añadir') : 'Guardar cambios';
  bind.current = { close: requestClose, key: onKeyDown };
  return (
    <>
      <header className="flex shrink-0 flex-wrap items-start gap-x-4 gap-y-2 border-b border-line py-3 pl-5 pr-3 max-sm:pl-4">
        <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink max-sm:hidden"><Route size={17} /></span>
        <div className="min-w-0 flex-1">
          <D.Title className="m-0 text-xs font-semibold text-ink-3">{tour ? 'Editar tour' : req.mode === 'create' && req.images.length ? (req.images.length > 1 ? 'Crear tour con estas imágenes' : 'Crear tour con esta imagen') : 'Crear tour'}</D.Title>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Input ref={titleRef} aria-label="Título del tour" data-testid="studio-title" value={title} maxLength={LIMITS.title} placeholder="Título del tour"
              aria-invalid={!!titleErr || undefined} onChange={(e) => { setTitle(e.target.value); setTitleErr(''); }}
              className="h-9 min-w-[240px] max-w-[560px] flex-1 border-transparent bg-transparent px-2 text-lg font-semibold hover:border-line focus:bg-bg max-sm:min-w-0" />
            {saved && <StatusBadge status={saved.status} />}
          </div>
          {titleErr ? <p className="m-0 mt-1 px-2 text-sm text-danger" role="alert">{titleErr}</p> : (
            <p className="m-0 mt-1 px-2 text-sm text-ink-3">
              Identificador {slugPreview ? <code className="font-mono text-ink-2" data-testid="studio-slug">{slugPreview}</code> : <span data-testid="studio-slug">: se genera del título (p. ej. «Crear un cliente» → <code className="font-mono">crear-un-cliente</code>)</span>}{!saved && slugPreview && <span className="max-sm:hidden"> · se genera del título; no se puede cambiar después</span>}
            </p>
          )}
        </div>
        <IconButton label="Cerrar" tooltip={false} icon={<X size={18} />} onClick={requestClose} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 max-sm:px-3">
        {showIssues && issues.length > 0 && (
          <Callout tone="warn" className="mb-4">
            <strong>{published ? 'Complete estos puntos para guardar' : 'Para publicar el tour falta'}</strong>
            <ul className="mb-0 mt-1.5 list-disc space-y-0.5 pl-5" data-testid="studio-issues">
              {issues.map((x, k) => (
                <li key={k}>{x.step == null ? x.message : (
                  <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left text-ink underline" onClick={() => goIssue(x)}>Paso {x.step + 1}</button>
                )}{x.step != null && <>: {x.message}</>}</li>
              ))}
            </ul>
          </Callout>
        )}
        <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_330px]">
          <div className="lg:row-span-2 xl:row-span-1 lg:sticky lg:top-0">
            {steps.length ? (
              <StepList steps={steps} selected={cur?.key ?? null} onSelect={setSel} onReorder={setSteps} onAdd={() => setPick('add')} onDuplicate={duplicate} onDelete={remove} issues={showIssues ? issues : []} />
            ) : <div className="rounded-lg border border-line p-3.5 text-sm text-ink-3">Aún no hay pasos.</div>}
            {steps.length > 0 && <p className="mb-0 mt-2 px-0.5 text-xs text-ink-3">Cada paso es una captura con un recuadro y un texto. Añada pasos con otras imágenes de la galería o súbalas.</p>}
          </div>
          <div className="min-w-0">
            {cur ? (
              <StepStage cur={cur} curIdx={curIdx} total={steps.length} canEdit uploading={uploading}
                onChangeImage={() => setPick('change')} onUploadOther={() => { uploadFor.current = 'change'; fileRef.current?.click(); }}
                onSpot={(r: Spot | null) => update(cur.key, { spot: r })} onClearSpot={() => update(cur.key, { spot: null })} imageIssue={curIssues('image')} spotIssue={curIssues('spot')} />
            ) : <FirstStepGuide canEdit uploading={uploading} onPick={() => setPick('add')} onUpload={(f) => void upload(f, 'add')} />}
          </div>
          <div className="min-w-0">
            {cur && <StepForm cur={cur} curIdx={curIdx} canEdit update={update} issue={curIssues} wideCols="xl:grid-cols-1" />}
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-subtle px-5 py-3 max-sm:px-3">
        <button type="button" onClick={() => (valid ? undefined : issues[0] && goIssue(issues[0]))} aria-live="polite" data-testid="studio-status"
          className={cn('mr-auto flex min-w-0 items-center gap-1.5 border-0 bg-transparent p-0 text-left text-sm', valid ? 'cursor-default text-ok' : 'cursor-pointer text-warn hover:underline')}>
          {valid ? <><CircleCheck size={15} className="shrink-0" /> Listo para publicar</> : <><CircleAlert size={15} className="shrink-0" /><span className="min-w-0">{issues.length === 1 ? 'Falta 1 punto para publicar' : `Faltan ${issues.length} puntos para publicar`}<span className="max-sm:hidden">: {issues[0]?.step == null ? '' : `paso ${issues[0].step + 1}, `}{issues[0]?.message.toLowerCase()}</span></span></>}
        </button>
        <Button onClick={() => setPreview(true)} disabled={!steps.length} data-testid="studio-try"><Play size={15} /> Probar</Button>
        <Button onClick={requestClose}>Cancelar</Button>
        <Button variant="primary" disabled={saving || !steps.length || (!!tour && !dirty)} onClick={() => void save()} data-testid="studio-save"><Save size={15} /> {saving ? 'Guardando…' : primaryLabel}</Button>
      </footer>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; void upload(f, uploadFor.current); }} />
      <ImagePicker key={pickN} open={pick != null} onOpenChange={(o) => !o && setPick(null)} onSelect={choose} title={pick === 'change' ? 'Cambiar la captura del paso' : 'Elegir la captura del nuevo paso'} confirmLabel="Usar esta captura" />
      <TourPlayer open={preview} onOpenChange={setPreview} title={title} steps={toApi(steps) as TourStep[]} />
      <ConfirmDialog open={discard} onOpenChange={setDiscard} title="¿Descartar el tour?" danger confirmLabel="Descartar" onConfirm={() => { setDiscard(false); onClose(); }}>
        {saved ? 'Se pierden los cambios que no guardó.' : 'El tour no se ha guardado: se pierden los pasos y el texto que escribió.'}
      </ConfirmDialog>
      <Dialog open={conflict} onOpenChange={setConflict} title="Otra persona guardó este tour" description="La versión del servidor es más reciente que la que abrió."
        footer={<>
          <Button className="mr-auto" onClick={() => setConflict(false)}>Seguir editando</Button>
          {reload && <Button onClick={() => { setConflict(false); reload(); }}>Recargar y descartar lo mío</Button>}
          <Button variant="primary" onClick={() => void save(true)}>Guardar el mío encima</Button>
        </>}>
        <p className="m-0 text-ink-2">Puede seguir editando y decidir después, recargar la versión del servidor (se pierde lo que cambió aquí) o guardar su versión encima.</p>
      </Dialog>
    </>
  );
}
