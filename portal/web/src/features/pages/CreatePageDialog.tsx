/* Creación guiada: 1) tipo de página, 2) datos y vista previa de dónde quedará en el menú. */
import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Field, FieldRow, FieldStack, HelpText, Input, Label, Select, Tag, Textarea, useToast } from '@/components/ui';
import { api, type StructureSection } from '@/lib/api';
import { errText } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { SECCIONES, contentChanged, go, slugify } from '@/lib/util';
import { cn } from '@/lib/cn';
import { PAGE_TYPES, moduloOf, typeForSection } from './constants';
import { nestPage } from './pageActions';

const NEW_GROUP = '__nuevo';
const NO_GROUP = '__sin';

function MenuPreview({ sec, grupo, title, loading }: { sec?: StructureSection; grupo: string; title: string; loading: boolean }) {
  if (loading) return <p className="text-sm text-ink-3">Cargando el menú…</p>;
  const groups = sec?.grupos ?? [];
  const list = groups.some((g) => g.name === grupo) ? groups : [...groups, { name: grupo, pages: [] }];
  return (
    <div aria-label="Vista previa del menú" className="max-h-80 overflow-auto rounded-lg border border-line bg-side px-1.5 py-2.5 text-sm">
      <div className="px-2 pb-1.5 text-[12.5px] font-semibold text-ink-2">{sec?.label ?? 'Sección'}</div>
      <ul className="m-0 list-none p-0">
        {list.map((g) => {
          const mine = g.name === grupo;
          return (
            <li key={g.name || '(sin grupo)'} className="py-0.5">
              <span className={cn('block px-2 py-0.5 text-[12.5px]', mine ? 'font-medium text-ink' : 'text-ink-3')}>{g.name || 'Sin grupo'}{!mine && <span> · {g.pages.length}</span>}</span>
              {mine && (
                <ul className="m-0 list-none p-0">
                  {g.pages.length > 3 && <li className="truncate py-0.5 pl-[18px] pr-2 text-ink-4">… {g.pages.length - 3} más</li>}
                  {g.pages.slice(-3).map((p) => <li key={p.id} className="truncate py-0.5 pl-[18px] pr-2 text-ink-2">{p.title}</li>)}
                  <li className="flex items-center justify-between gap-1.5 rounded-sm bg-accent-soft py-0.5 pl-[18px] pr-2 font-medium text-ink shadow-[inset_2px_0_0_var(--accent)]"><span className="truncate">{title || 'Página nueva'}</span><Tag tone="accent">Nueva</Tag></li>
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CreatePageDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: { seccion: string; grupo?: string; parentId?: number } | null }) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [tipo, setTipo] = useState('tarea');
  const [seccion, setSeccion] = useState('tareas');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [modulo, setModulo] = useState('');
  const [grupoSel, setGrupoSel] = useState('');
  const [grupoNuevo, setGrupoNuevo] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const struct = useAsync(() => (open ? api.structure() : Promise.resolve(null)), [open]);
  const sec = struct.data?.secciones.find((s) => s.key === seccion);
  const grupo = grupoSel === NEW_GROUP ? grupoNuevo.trim() : grupoSel === NO_GROUP ? '' : grupoSel;
  const modulos = useMemo(() => Array.from(new Set((sec?.grupos ?? []).flatMap((g) => g.pages.map((p) => moduloOf(p.route))).filter(Boolean))).sort(), [sec]);

  useEffect(() => {
    if (!open) return;
    setTitle(''); setSlug(''); setSlugTouched(false); setModulo(''); setModuloTouched(false); setGrupoNuevo(''); setDescription(''); setBusy(false);
    if (initial) { const t = typeForSection(initial.seccion); setTipo(t.tipo); setSeccion(initial.seccion); setStep(2); }
    else { setTipo('tarea'); setSeccion('tareas'); setStep(1); }
  }, [open, initial]);
  useEffect(() => {
    if (!sec) return;
    const want = initial && initial.seccion === sec.key ? initial.grupo ?? '' : sec.grupos[0]?.name ?? '';
    setGrupoSel(want === '' ? NO_GROUP : want);
  }, [sec, initial]);

  const [moduloTouched, setModuloTouched] = useState(false);
  useEffect(() => {
    if (moduloTouched || seccion !== 'tareas') return;
    const g = sec?.grupos.find((x) => (x.name || NO_GROUP) === grupoSel);
    const counts = new Map<string, number>();
    for (const p of g?.pages ?? []) { const m = moduloOf(p.route); if (m) counts.set(m, (counts.get(m) ?? 0) + 1); }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    setModulo(best ?? slugify(grupo));
  }, [grupoSel, sec, seccion, moduloTouched, grupo]);
  const needModulo = seccion === 'tareas';
  const route = `/${seccion}/${needModulo && modulo ? `${modulo}/` : ''}${slug || '…'}`;
  const valid = title.trim() && slug && (!needModulo || modulo) && !(grupoSel === NEW_GROUP && !grupoNuevo.trim());
  const submit = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { seccion, slug, title: title.trim(), tipo };
      if (grupo) body.grupo = grupo;
      if (description) body.description = description;
      if (modulo) body.modulo = modulo;
      const p = await api.createPage(body);
      if (initial?.parentId && initial.seccion === seccion) await nestPage(seccion, p.id, initial.parentId).catch(() => toast('Se creó, pero no se pudo colocar como subpágina', 'error'));
      toast('Página creada como borrador');
      contentChanged();
      onOpenChange(false);
      go(`/contenido/${p.id}`);
    } catch (e) { toast(errText(e), 'error'); setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size={step === 1 ? 'md' : 'lg'} title="Crear página"
      description={initial?.parentId ? 'Subpágina' : step === 1 ? 'Paso 1 de 2 · Tipo de página' : 'Paso 2 de 2 · Datos y ubicación'}
      footer={step === 1
        ? <><Button onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" onClick={() => setStep(2)}>Siguiente</Button></>
        : <><Button className="mr-auto" onClick={() => setStep(1)}>Cambiar el tipo</Button><Button variant="primary" disabled={busy || !valid} onClick={submit}>{busy ? 'Creando…' : 'Crear borrador'}</Button></>}>
      {step === 1 ? (
        <div role="radiogroup" aria-label="Tipo de página" className="overflow-hidden rounded-lg border border-line">
          {PAGE_TYPES.map((t) => {
            const I = t.icon;
            const on = tipo === t.tipo;
            return (
              <label key={t.tipo} className={cn('flex cursor-pointer items-start gap-3 border-t border-line px-3.5 py-3 first:border-t-0 hover:bg-subtle', on && 'bg-accent-soft hover:bg-accent-soft')}>
                <input type="radio" name="tipo" className="mt-0.5 size-4 accent-[var(--accent)]" checked={on} onChange={() => { setTipo(t.tipo); setSeccion(t.seccion); }} />
                <I size={18} className={cn('mt-px', on ? 'text-accent-ink' : 'text-ink-3')} />
                <span className="flex min-w-0 flex-1 flex-col"><strong className="font-medium">{t.label}</strong><small className="text-[12.5px] text-ink-3">{t.text}</small></span>
                <span className="self-center text-[12.5px] text-ink-3 max-sm:hidden">{SECCIONES[t.seccion]}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <FieldStack>
            <Field label="Título">{(id) => <Input id={id} autoFocus value={title} placeholder="Por ejemplo: Registrar un pago" onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />}</Field>
            <FieldRow>
              <Field label="Sección">{(id) => <Select id={id} value={seccion} onValueChange={setSeccion} options={Object.entries(SECCIONES).map(([k, v]) => ({ value: k, label: v }))} />}</Field>
              {needModulo && <Field label="Módulo" help={modulos.length ? `Existentes: ${modulos.slice(0, 4).join(', ')}${modulos.length > 4 ? '…' : ''}` : 'Parte de la dirección: /tareas/módulo/…'}>
                {(id, d) => <><Input id={id} aria-describedby={d} list="modulos-dl" value={modulo} onChange={(e) => { setModulo(slugify(e.target.value)); setModuloTouched(true); }} placeholder="clientes" /><datalist id="modulos-dl">{modulos.map((m) => <option key={m} value={m} />)}</datalist></>}
              </Field>}
            </FieldRow>
            <Field label="Grupo del menú">{(id) => <Select id={id} value={grupoSel} onValueChange={setGrupoSel}
              options={[...(sec?.grupos ?? []).map((g) => ({ value: g.name || NO_GROUP, label: g.name || 'Sin grupo' })), { value: NEW_GROUP, label: 'Grupo nuevo…' }]} />}</Field>
            {grupoSel === NEW_GROUP && <Field label="Nombre del grupo nuevo">{(id) => <Input id={id} autoFocus value={grupoNuevo} onChange={(e) => setGrupoNuevo(e.target.value)} />}</Field>}
            <Field label="Identificador en la dirección" help={<>Dirección: <code>{route}</code></>}>
              {(id, d) => <Input id={id} aria-describedby={d} mono value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />}</Field>
            <Field label="Descripción" optional>{(id) => <Textarea id={id} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Una frase: qué resuelve la página." />}</Field>
          </FieldStack>
          <aside className="flex flex-col gap-2">
            <Label>Así quedará en el menú</Label>
            <MenuPreview sec={sec} grupo={grupo} title={title} loading={struct.loading && !struct.data} />
            <HelpText>Se crea como borrador con la plantilla de «{PAGE_TYPES.find((t) => t.tipo === tipo)?.label}». No aparece en el manual hasta que la publique (botón Publicar).</HelpText>
          </aside>
        </div>
      )}
    </Dialog>
  );
}
