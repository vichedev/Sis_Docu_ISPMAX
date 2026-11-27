/*
 * «Crear página con IA»: 1) la persona describe la página con sus notas; 2) la IA PROPONE título, dirección, sección
 * del menú y bloques; 3) la persona revisa/edita y pulsa «Crear borrador». La propuesta no crea nada: el borrador se
 * crea con las mismas rutas de siempre (POST /api/pages y PUT /api/pages/:id) y nace como borrador (no se publica).
 */
import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, LoaderCircle, Sparkles } from 'lucide-react';
import { Button, Callout, Dialog, Field, FieldRow, FieldStack, Input, Select, Textarea, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { aiApi, type DraftProposal, type OutlineSection } from '@/lib/api.ai';
import { can, errText, useAuth } from '@/lib/auth';
import { go, SECCIONES } from '@/lib/util';
import { createDraft } from './applyActions';
import { BlockPreview } from '@/features/editor/BlockEditor';
import { AI_LIMITS, aiErrorInfo, bodyWithTitle, draftFormFrom, draftProblems, routeOf, type AiErrorInfo, type DraftForm } from './aiModel';

const NONE = '__ninguna';
const TIPOS = [['tarea', 'Tarea'], ['guia', 'Guía de pantalla'], ['problema', 'Problema'], ['pregunta', 'Pregunta frecuente'], ['referencia', 'Referencia'], ['concepto', 'Concepto']] as const;

export function AiDraftDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiErrorInfo | null>(null);
  const [proposal, setProposal] = useState<DraftProposal | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDesc(''); setBusy(false); setError(null); setProposal(null); setForm(null); setCreating(false); setCreateError('');
    aiApi.outline().then((r) => setOutline(r.secciones)).catch(() => setOutline([]));
  }, [open]);

  const set = <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const sec = outline.find((s) => s.key === form?.seccion);
  const parents = useMemo(() => (sec?.grupos ?? []).flatMap((g) => g.pages.filter((p) => !p.parent_id).map((p) => ({ value: String(p.id), label: `${p.title}${g.name ? ` · ${g.name}` : ''}` }))), [sec]);

  const propose = async () => {
    setBusy(true); setError(null);
    try {
      const r = await aiApi.draftPage({ description: desc });
      setProposal(r.proposal); setForm(draftFormFrom(r.proposal));
    } catch (e) {
      setError(e instanceof ApiError ? aiErrorInfo(e.status, e.message, e.data) : { kind: 'other', message: 'No se pudo completar la acción.', canRetry: true });
    } finally { setBusy(false); }
  };

  const problems = form ? draftProblems(form) : [];
  const create = async () => {
    if (!form || problems.length || creating) return;
    setCreating(true); setCreateError('');
    try {
      const { page, saveError } = await createDraft(form);
      onOpenChange(false);
      if (saveError) toast(`Se creó el borrador pero no se pudo cargar el contenido propuesto: ${errText(saveError)}`, 'error');
      else toast('Borrador creado con la propuesta de la IA. Revísalo antes de publicar.');
      go(`/contenido/${page.id}`);
    } catch (e) { setCreateError(errText(e)); } finally { setCreating(false); }
  };

  const footer = !proposal ? (
    <>
      <Button className="mr-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
      <Button variant="primary" disabled={busy || !desc.trim() || desc.length > AI_LIMITS.description} onClick={() => void propose()}>
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />} Proponer página
      </Button>
    </>
  ) : (
    <>
      <Button className="mr-auto" disabled={creating} onClick={() => { setProposal(null); setForm(null); }}>Volver a la descripción</Button>
      <Button disabled={creating} onClick={() => onOpenChange(false)}>Descartar</Button>
      <Button variant="primary" disabled={creating || problems.length > 0} onClick={() => void create()}>{creating && <LoaderCircle size={16} className="animate-spin" />} Crear borrador</Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!creating) onOpenChange(o); }} size="lg" title="Crear página con IA"
      description="Describe la página con tus notas. La IA propone y tú revisas: no se crea nada hasta pulsar «Crear borrador»." footer={footer}>
      {!proposal || !form ? (
        <div className="flex flex-col gap-3">
          <Field label="¿Qué página quieres crear?" help={`Pega tus notas, pasos o lo que sepas (máx. ${AI_LIMITS.description} caracteres). La IA no inventa funciones: lo que falte quedará marcado como «Pendiente de validación».`}>
            {(id, d) => <Textarea id={id} aria-describedby={d} rows={9} value={desc} maxLength={AI_LIMITS.description + 200} disabled={busy} placeholder="Ejemplo: Cómo registrar el pago de un cliente. Entrar a Clientes, abrir al cliente, pulsar Cobrar…" onChange={(e) => setDesc(e.target.value)} />}
          </Field>
          {busy && <p className="m-0 flex items-center gap-2 text-sm text-ink-3" aria-live="polite"><LoaderCircle size={14} className="animate-spin" /> La IA está armando la propuesta… puede tardar hasta un minuto.</p>}
          {error && !busy && (
            <Callout tone={error.kind === 'rate' || error.kind === 'input' ? 'warn' : 'danger'} icon={<CircleAlert size={16} className="mt-0.5" />} action={error.canRetry ? <Button size="sm" onClick={() => void propose()}>Reintentar</Button> : undefined}>
              <strong>{error.kind === 'rate' ? 'Límite de uso.' : error.kind === 'rejected' ? 'Propuesta descartada.' : error.kind === 'config' ? 'La IA no está disponible.' : 'No se pudo.'}</strong> {error.message}
              {error.kind === 'config' && can(user, 'admin') && <> <a href="#/ajustes/ia" onClick={() => onOpenChange(false)}>Abrir Ajustes</a>.</>}
            </Callout>
          )}
        </div>
      ) : (
        <FieldStack>
          {proposal.motivo && <Callout><strong>Dónde encaja.</strong> {proposal.motivo}</Callout>}
          {proposal.avisos.length > 0 && <Callout tone="warn"><strong>Revisa:</strong><ul className="m-0 mt-1 list-disc pl-5">{proposal.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul></Callout>}
          <FieldRow>
            <Field label="Título">{(id) => <Input id={id} value={form.title} maxLength={200} onChange={(e) => set('title', e.target.value)} />}</Field>
            <Field label="Tipo de página">{(id) => <Select id={id} value={form.tipo} onValueChange={(v) => set('tipo', v)} options={TIPOS.map(([value, label]) => ({ value, label }))} />}</Field>
          </FieldRow>
          <Field label="Descripción" help="Una frase: qué se logra con esta página.">{(id, d) => <Input id={id} aria-describedby={d} value={form.description} maxLength={1000} onChange={(e) => set('description', e.target.value)} />}</Field>
          <FieldRow>
            <Field label="Sección del menú">{(id) => <Select id={id} value={form.seccion} onValueChange={(v) => { set('seccion', v); set('parentId', null); }} options={Object.entries(SECCIONES).map(([value, label]) => ({ value, label }))} />}</Field>
            <Field label="Módulo" optional={form.seccion !== 'tareas'} help={form.seccion === 'tareas' ? 'Obligatorio en las tareas (por ejemplo: clientes).' : undefined}>
              {(id, d) => <><Input id={id} aria-describedby={d} list="ai-modulos" value={form.modulo} placeholder="clientes" onChange={(e) => set('modulo', e.target.value.trim().toLowerCase())} />
                <datalist id="ai-modulos">{(sec?.modulos ?? []).map((m) => <option key={m} value={m} />)}</datalist></>}
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Grupo" optional>{(id) => <><Input id={id} list="ai-grupos" value={form.grupo} placeholder="Sin grupo" onChange={(e) => set('grupo', e.target.value)} />
              <datalist id="ai-grupos">{(sec?.grupos ?? []).filter((g) => g.name).map((g) => <option key={g.name} value={g.name} />)}</datalist></>}</Field>
            <Field label="Subsección de" optional>{(id) => <Select id={id} value={form.parentId ? String(form.parentId) : NONE} onValueChange={(v) => set('parentId', v === NONE ? null : Number(v))} options={[{ value: NONE, label: 'Ninguna (nivel principal)' }, ...parents]} />}</Field>
          </FieldRow>
          <Field label="Dirección (slug)" help={<>Quedará en <code className="font-mono">{routeOf(form.seccion, form.modulo, form.slug)}</code> como <b>borrador</b>.</>}>
            {(id, d) => <Input id={id} aria-describedby={d} mono value={form.slug} maxLength={100} onChange={(e) => set('slug', e.target.value.toLowerCase())} />}
          </Field>
          <div>
            <h3 className="mb-1.5 text-xs font-semibold text-ink-3">Contenido propuesto (vista previa)</h3>
            <div className="max-h-[320px] overflow-auto rounded-md border border-line bg-bg p-4"><BlockPreview value={bodyWithTitle(form.body, form.title)} /></div>
            <p className="mb-0 mt-1.5 text-sm text-ink-3">Podrás editarlo después en el editor. Nada se publica solo.</p>
          </div>
          {problems.length > 0 && <Callout tone="warn"><ul className="m-0 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Callout>}
          {createError && <Callout tone="danger"><strong>No se creó.</strong> {createError}</Callout>}
        </FieldStack>
      )}
    </Dialog>
  );
}
