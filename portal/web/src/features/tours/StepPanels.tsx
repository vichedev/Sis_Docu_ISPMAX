/*
 * Piezas del editor de tours compartidas con el editor de bloques («Crear tour con esta imagen»):
 *   useTourSteps   — estado de los pasos (selección, añadir con captura, duplicar, eliminar con «Deshacer», subir captura).
 *   StepStage      — captura del paso con el recuadro editable (RegionSelector) y sus acciones.
 *   StepForm       — formulario del paso: título, texto con **negrita**, descripción de la imagen y enlace.
 *   FirstStepGuide — estado vacío «Empiece por una captura» (galería o subida).
 * Se extrajeron de TourEditor sin cambiar su marcado ni su comportamiento.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Images, Link2, Trash2, Upload, X } from 'lucide-react';
import { Button, Field, FileDropzone, Input, RegionSelector, Textarea, useToast } from '@/components/ui';
import { Toolbar, ToolbarButton } from '@/components/ui/editor-kit';
import { api } from '@/lib/api';
import { assetRel } from '@/lib/assets';
import { errText } from '@/lib/auth';
import { PagePicker } from './PagePicker';
import { LIMITS, cloneStep, emptyStep, type EditStep, type Issue, type Spot, type TourStep } from './tourModel';

export const UPLOAD_FOLDER = 'imgs/tours';

/** Estado de los pasos de un tour en edición. `onUploaded` se llama tras subir una captura (recargar galería, contadores…). */
export function useTourSteps(initial: () => EditStep[], onUploaded?: () => void) {
  const toast = useToast();
  const [steps, setSteps] = useState<EditStep[]>(initial);
  const [sel, setSel] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const cur = useMemo(() => steps.find((s) => s.key === sel) ?? steps[0] ?? null, [steps, sel]);
  const curIdx = cur ? steps.indexOf(cur) : -1;
  useEffect(() => { if (!sel && steps[0]) setSel(steps[0].key); }, [sel, steps]);

  const update = useCallback((key: string, patch: Partial<TourStep>) => setSteps((l) => l.map((s) => (s.key === key ? { ...s, ...patch } : s))), []);
  const addWith = (image: string) => {
    const s = emptyStep(image);
    setSteps((l) => { const i = cur ? l.indexOf(cur) + 1 : l.length; return [...l.slice(0, i), s, ...l.slice(i)]; });
    setSel(s.key);
  };
  const upload = async (files: File[], mode: 'add' | 'change') => {
    const f = files.find((x) => x.type.startsWith('image/'));
    if (!f) { if (files.length) toast('Solo se pueden subir imágenes', 'error'); return; }
    setUploading(true);
    try {
      const r = await api.uploadAsset(f, UPLOAD_FOLDER);
      const rel = assetRel(r.path);
      if (mode === 'change' && cur) update(cur.key, { image: rel }); else addWith(rel);
      onUploaded?.();
      toast(`Imagen subida: ${rel}`);
    } catch (e) { toast(errText(e), 'error'); }
    setUploading(false);
  };
  const duplicate = (key: string) => {
    const src = steps.find((s) => s.key === key);
    if (!src) return;
    const c = cloneStep(src);
    setSteps((l) => { const i = l.findIndex((s) => s.key === key) + 1; return [...l.slice(0, i), c, ...l.slice(i)]; });
    setSel(c.key);
  };
  const remove = (key: string) => {
    const i = steps.findIndex((s) => s.key === key);
    const gone = steps[i];
    if (!gone) return;
    const rest = steps.filter((s) => s.key !== key);
    setSteps(rest);
    setSel(rest[Math.min(i, rest.length - 1)]?.key ?? null);
    toast(`Paso ${i + 1} eliminado`, 'ok', { label: 'Deshacer', run: () => { setSteps((l) => [...l.slice(0, i), gone, ...l.slice(i)]); setSel(gone.key); } });
  };
  return { steps, setSteps, sel, setSel, cur, curIdx, update, addWith, upload, uploading, duplicate, remove };
}

export function StepStage({ cur, curIdx, total, canEdit, uploading, onChangeImage, onUploadOther, onSpot, onClearSpot, imageIssue, spotIssue }: {
  cur: EditStep; curIdx: number; total: number; canEdit: boolean; uploading: boolean;
  onChangeImage: () => void; onUploadOther: () => void; onSpot: (r: Spot | null) => void; onClearSpot: () => void; imageIssue?: string; spotIssue?: string;
}) {
  const imageUrl = cur.image ? api.assetUrl(cur.image) : '';
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm font-medium text-ink-2">Paso {curIdx + 1} de {total}</span>
        {canEdit && <>
          <Button size="sm" onClick={onChangeImage} data-testid="change-image"><Images size={14} /> Cambiar imagen</Button>
          <Button size="sm" disabled={uploading} onClick={onUploadOther}><Upload size={14} /> {uploading ? 'Subiendo…' : 'Subir otra'}</Button>
          <Button size="sm" variant="ghost" disabled={!cur.spot} onClick={onClearSpot} data-testid="clear-spot"><X size={14} /> Quitar recuadro</Button>
        </>}
      </div>
      {cur.image ? (
        <RegionSelector key={cur.key + cur.image} src={imageUrl} alt={cur.alt || cur.title} value={cur.spot} disabled={!canEdit} onChange={onSpot} />
      ) : <div className="grid h-60 place-items-center rounded-md border border-dashed border-line-strong text-ink-3">Este paso no tiene captura.</div>}
      {imageIssue && <p className="mt-1.5 text-sm text-danger">{imageIssue}</p>}
      {spotIssue && <p className="mt-1.5 text-sm text-danger">{spotIssue}</p>}
      {!cur.spot && cur.image && <p className="mt-1.5 text-sm text-ink-3">Sin recuadro, el paso muestra la captura completa sin resaltar nada.</p>}
      <p className="mt-1 break-all font-mono text-xs text-ink-4">{cur.image}</p>
    </>
  );
}

export function StepForm({ cur, curIdx, canEdit, update, issue, wideCols = 'min-[1500px]:grid-cols-1' }: {
  cur: EditStep; curIdx: number; canEdit: boolean; update: (key: string, patch: Partial<TourStep>) => void; issue: (field: Issue['field']) => string | undefined;
  /** Clase que vuelve a una columna cuando el formulario va en su propia columna (por defecto, desde 1500 px como en el editor de tours). */
  wideCols?: string;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [pickPage, setPickPage] = useState(false);
  /* Texto: negrita */
  const bold = () => {
    const el = textRef.current;
    if (!el) return;
    const a = el.selectionStart, b = el.selectionEnd, v = cur.text;
    const mid = v.slice(a, b) || 'texto';
    const next = `${v.slice(0, a)}**${mid}**${v.slice(b)}`;
    update(cur.key, { text: next });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + 2, a + 2 + mid.length); });
  };
  return (
    <div className="rounded-lg border border-line p-4">
      <h2 className="mb-3 mt-0 text-xs font-semibold text-ink-3">Paso {curIdx + 1}: qué verá el lector</h2>
      <div className={`grid gap-4 md:grid-cols-2 ${wideCols}`}>
       <div className="flex min-w-0 flex-col gap-4">
        <Field label="Título" error={issue('title')}>
          {(fid, d) => <Input id={fid} aria-describedby={d} data-testid="step-title" value={cur.title} maxLength={LIMITS.title} readOnly={!canEdit} onChange={(e) => update(cur.key, { title: e.target.value })} placeholder="Por ejemplo: Abra el menú Clientes" />}
        </Field>
        <Field label="Texto" error={issue('text')} help={<span className="flex justify-between gap-2"><span>Admite <b>**negrita**</b> con <kbd className="font-sans">Ctrl+B</kbd>.</span><span className="tabular-nums">{cur.text.length}/{LIMITS.text}</span></span>}>
          {(fid, d) => (
            <div>
              {canEdit && <Toolbar label="Formato del texto" className="mb-1"><ToolbarButton label="Negrita" shortcut="Ctrl+B" icon={<Bold size={15} />} onClick={bold} /></Toolbar>}
              <Textarea ref={textRef} id={fid} aria-describedby={d} data-testid="step-text" rows={6} value={cur.text} maxLength={LIMITS.text} readOnly={!canEdit} placeholder="Explique qué hacer en la zona resaltada."
                onChange={(e) => update(cur.key, { text: e.target.value })}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); e.stopPropagation(); bold(); } }} />
            </div>
          )}
        </Field>
       </div>
       <div className="flex min-w-0 flex-col gap-4">
        <Field label="Descripción de la imagen" optional help="Para lectores de pantalla. Si se deja vacío se usa el título.">
          {(fid, d) => <Input id={fid} aria-describedby={d} value={cur.alt} maxLength={LIMITS.alt} readOnly={!canEdit} onChange={(e) => update(cur.key, { alt: e.target.value })} />}
        </Field>
        <Field label="Enlace a una página" optional error={issue('link')}>
          {(fid) => cur.link ? (
            <div className="space-y-2" data-testid="link-box">
              <Input id={fid} aria-label="Texto del enlace" value={cur.link.label} maxLength={LIMITS.link} readOnly={!canEdit} onChange={(e) => update(cur.key, { link: { ...cur.link!, label: e.target.value } })} />
              <p className="m-0 break-all font-mono text-xs text-ink-3">{cur.link.route}</p>
              {canEdit && <div className="flex gap-2"><Button size="sm" onClick={() => setPickPage(true)}>Cambiar página</Button><Button size="sm" variant="ghost" onClick={() => update(cur.key, { link: null })}><Trash2 size={14} /> Quitar enlace</Button></div>}
            </div>
          ) : (
            <Button id={fid} disabled={!canEdit} onClick={() => setPickPage(true)} data-testid="add-link"><Link2 size={15} /> Elegir una página del manual</Button>
          )}
        </Field>
       </div>
      </div>
      <PagePicker open={pickPage} onOpenChange={setPickPage} onSelect={(l) => update(cur.key, { link: l })} />
    </div>
  );
}

export function FirstStepGuide({ canEdit, uploading, onPick, onUpload }: { canEdit: boolean; uploading: boolean; onPick: () => void; onUpload: (files: File[]) => void }) {
  return (
    <div className="rounded-lg border border-line p-6 max-sm:p-4" data-testid="empty-guide">
      <h2 className="m-0 text-lg font-semibold">Empiece por una captura</h2>
      <ol className="mb-5 mt-3 list-none space-y-1.5 p-0 text-ink-2">
        <li><b className="text-ink">1. Elija una captura</b> de la galería o suba una nueva.</li>
        <li><b className="text-ink">2. Marque la zona</b> que debe resaltarse.</li>
        <li><b className="text-ink">3. Escriba qué hacer</b> en ese paso. Después añada los siguientes.</li>
      </ol>
      {canEdit ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="primary" size="lg" className="h-full min-h-32 flex-col" onClick={onPick} data-testid="first-pick"><Images size={20} /> Elegir de la galería</Button>
          <FileDropzone accept="image/*" onFiles={onUpload} hint="PNG, JPG o WebP">
            <span>{uploading ? 'Subiendo…' : <>Subir una captura nueva<br /><span className="text-xs">Arrastre aquí o haga clic</span></>}</span>
          </FileDropzone>
        </div>
      ) : <p className="m-0 text-ink-3">Este tour no tiene pasos.</p>}
    </div>
  );
}
