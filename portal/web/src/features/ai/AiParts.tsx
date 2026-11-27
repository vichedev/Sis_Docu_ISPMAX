/*
 * Piezas del chat del asistente: markdown seguro, línea de actividad en vivo y tarjetas de propuesta
 * (página nueva editable, edición con diff, mover). Todo con componentes de @/components/ui, sin HTML crudo.
 */
import { useMemo, useState } from 'react';
import { BookOpen, Check, CircleAlert, Clock, FilePlus, ListTree, LoaderCircle, MessageCircleQuestion, MoveRight, Pencil, Search } from 'lucide-react';
import { Badge, Button, Callout, Input, Select } from '@/components/ui';
import type { CreateProposal, EditProposal, MoveProposal, OutlineSection } from '@/lib/api.ai';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { BlockPreview } from '@/features/editor/BlockEditor';
import { figuresIn } from './imageModel';
import { NEW_GROUP, NO_GROUP, bodyWithTitle, cardFormFrom, cardGroup, cardProblems, cardToDraft, draftProblems, groupNames, lineDiff, parseMd, proposalKindLabel, resolveGroupClient, routeOf, slugOf, type CardForm, type DiffLine, type DraftForm, type MdInline } from './aiModel';

const TIPOS = [['tarea', 'Tarea'], ['guia', 'Guía de pantalla'], ['problema', 'Problema'], ['pregunta', 'Pregunta frecuente'], ['referencia', 'Referencia'], ['concepto', 'Concepto']] as const;
const SECCIONES: [string, string][] = [['tareas', 'Tareas'], ['guia', 'Guía'], ['problemas', 'Problemas'], ['preguntas', 'Preguntas'], ['referencia', 'Referencia'], ['conceptos', 'Conceptos']];

function Inline({ nodes }: { nodes: MdInline[] }) {
  return <>{nodes.map((n, i) => (n.t === 'b' ? <strong key={i}>{n.v}</strong> : n.t === 'i' ? <em key={i}>{n.v}</em> : n.t === 'code' ? <code key={i} className="rounded-sm bg-muted px-1 py-px font-mono text-[12.5px]">{n.v}</code> : <span key={i}>{n.v}</span>))}</>;
}
/** Markdown seguro: se convierte en elementos de React (nunca en HTML). */
export function Md({ text }: { text: string }) {
  const blocks = useMemo(() => parseMd(text), [text]);
  return (
    <div className="flex flex-col gap-1.5 break-words text-[13.5px] leading-relaxed">
      {blocks.map((b, i) => b.type === 'p' ? <p key={i} className="m-0 whitespace-pre-wrap"><Inline nodes={b.inline} /></p>
        : b.type === 'code' ? <pre key={i} className="m-0 overflow-auto rounded-md border border-line bg-subtle p-2 font-mono text-[12.5px]">{b.text}</pre>
        : b.type === 'ul' ? <ul key={i} className="m-0 list-disc pl-5">{b.items.map((it, j) => <li key={j}><Inline nodes={it} /></li>)}</ul>
        : <ol key={i} className="m-0 list-decimal pl-5">{b.items.map((it, j) => <li key={j}><Inline nodes={it} /></li>)}</ol>)}
    </div>
  );
}

const stepIcon = (label: string) => /Esperando/i.test(label) ? Clock : /secciones|estructura/i.test(label) ? ListTree : /Buscando/i.test(label) ? Search : /Leyendo/i.test(label) ? BookOpen : /pregunta/i.test(label) ? MessageCircleQuestion : /nueva/i.test(label) ? FilePlus : /mov/i.test(label) ? MoveRight : Pencil;
/** Línea de actividad: lo que hace la IA en vivo («Consultando las secciones…»), que se resuelve al terminar. */
export function ActivityLine({ steps, running }: { steps: { id: number; label: string; state: 'start' | 'done' | 'failed' }[]; running: boolean }) {
  if (!steps.length) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-ink-3" aria-label="Actividad del asistente">
      {steps.map((s) => {
        const I = stepIcon(s.label);
        return (
          <li key={s.id} className="flex items-center gap-2">
            {s.state === 'start' && running ? <LoaderCircle size={14} className="animate-spin text-accent" /> : s.state === 'failed' ? <CircleAlert size={14} className="text-warn" /> : <Check size={14} className="text-ok" />}
            <I size={13} className="text-ink-4" />
            <span className={cn(s.state === 'start' && running && 'text-ink-2')}>{s.label}{s.state === 'start' && running ? '…' : ''}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function DiffPane({ title, lines, tone }: { title: string; lines: DiffLine[]; tone: 'del' | 'add' }) {
  return (
    <section aria-label={title}>
      <h4 className="mb-1 mt-0 text-xs font-semibold text-ink-3">{title}</h4>
      <pre className="m-0 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-subtle p-2.5 font-mono text-[12.5px] leading-relaxed text-ink">
        {lines.map((l, i) => <span key={i} className={cn('block', l.kind === tone && (tone === 'del' ? 'bg-danger-soft' : 'bg-ok-soft'))}>{l.text || ' '}</span>)}
      </pre>
    </section>
  );
}

export function CardShell({ kind, title, children, state, error, actions, done, note }: { kind: string; title: string; children: React.ReactNode; state: string; error?: string; actions: React.ReactNode; done?: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-raised p-3" data-testid="ai-proposal" data-state={state}>
      <div className="flex items-center gap-2"><Badge tone="accent">{proposalKindLabel(kind)}</Badge><span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{title}</span>
        {state === 'applied' && <Badge tone="ok" dot>Aplicada</Badge>}{state === 'discarded' && <Badge tone="neutral">Descartada</Badge>}</div>
      {children}
      {error && <Callout tone="danger"><strong>No se aplicó.</strong> {error}</Callout>}
      {note}
      {state === 'applied' ? done : state === 'discarded' ? null : <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
    </div>
  );
}

/** Dónde quedará la página en el menú: el grupo con sus páginas y la nueva resaltada. */
export function MiniTree({ seccionLabel, group, pages, title, isNewGroup }: { seccionLabel: string; group: string; pages: { id: number; title: string }[]; title: string; isNewGroup: boolean }) {
  const shown = pages.slice(-3);
  return (
    <div aria-label="Dónde quedará en el menú" className="rounded-md border border-line bg-side px-2 py-2 text-sm">
      <div className="px-1 pb-1 text-[12px] font-semibold text-ink-3">{seccionLabel}</div>
      <div className="px-1 text-[12.5px] font-medium text-ink-2">{group || 'Sin grupo'}{isNewGroup && <span className="ml-1.5 font-normal text-accent-ink">(grupo nuevo)</span>}</div>
      <ul className="m-0 list-none p-0">
        {pages.length > 3 && <li className="truncate py-0.5 pl-4 pr-1 text-ink-4">… {pages.length - 3} más</li>}
        {shown.map((p) => <li key={p.id} className="truncate py-0.5 pl-4 pr-1 text-ink-3">{p.title}</li>)}
        <li className="flex items-center justify-between gap-1.5 rounded-sm bg-accent-soft py-0.5 pl-4 pr-1.5 font-medium text-ink shadow-[inset_2px_0_0_var(--accent)]"><span className="truncate">{title || 'Página nueva'}</span><Badge tone="accent">Nueva</Badge></li>
      </ul>
    </div>
  );
}

/** Miniaturas REALES de las imágenes que la propuesta coloca, junto a su pie; avisa si alguna se eliminó después. */
export function FigureStrip({ text, missing }: { text: string; missing?: string[] }) {
  const figs = figuresIn(text);
  if (!figs.length) return null;
  return (
    <ul aria-label="Imágenes de la propuesta" className="m-0 flex list-none flex-col gap-1.5 p-0" data-testid="ai-figure-strip">
      {figs.map((f) => {
        const gone = missing?.includes(f.path);
        return (
          <li key={f.path} className="flex items-center gap-2 rounded-md border border-line bg-bg p-1.5 text-sm">
            {gone ? <span className="grid size-12 shrink-0 place-items-center rounded-md border border-dashed border-line text-[11px] text-ink-4">Sin imagen</span>
              : <img src={api.assetUrl(f.path)} alt="" width={48} height={48} className="size-12 shrink-0 rounded-md border border-line object-cover" />}
            <span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink-2">{f.caption || 'Sin pie'}</span><span className="block truncate text-xs text-ink-3">Alt: {f.alt || '—'}</span></span>
            {gone && <Badge tone="warn">Imagen eliminada</Badge>}
          </li>
        );
      })}
    </ul>
  );
}

/** Tarjeta de PÁGINA NUEVA con todo editable (sección, grupo, tipo, título y dirección) antes de «Crear borrador». */
export function CreateCard({ proposal, outline, state, error, applying, openPageId, expired, missing, onApply, onDiscard, onAskChanges, onOpen }: {
  proposal: CreateProposal; outline: OutlineSection[]; state: string; error?: string; applying: boolean; openPageId?: number; expired?: boolean; missing?: string[];
  onApply: (draft: DraftForm) => void; onDiscard: () => void; onAskChanges: () => void; onOpen: () => void;
}) {
  const [f, setF] = useState<CardForm>(() => cardFormFrom(proposal, outline));
  const [more, setMore] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const set = <K extends keyof CardForm>(k: K, v: CardForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const names = groupNames(outline, f.seccion);
  const sec = outline.find((s) => s.key === f.seccion);
  const grupo = cardGroup(f);
  const canon = grupo ? resolveGroupClient(outline, f.seccion, grupo) : null;
  const isNew = f.groupSel === NEW_GROUP && !canon;
  const treePages = (sec?.grupos.find((g) => g.name === (canon ?? grupo))?.pages ?? []).map((p) => ({ id: p.id, title: p.title }));
  const draft = cardToDraft(f, proposal, outline);
  const problems = [...draftProblems(draft), ...cardProblems(f, outline)];
  const options = [...names.map((n) => ({ value: n, label: n })), { value: NO_GROUP, label: 'Sin grupo' }, { value: NEW_GROUP, label: 'Nuevo grupo…' }];
  const readOnly = state !== 'pending' && state !== 'error';
  return (
    <CardShell kind="create" title={f.title || proposal.title} state={state} error={error}
      done={openPageId ? <div className="flex justify-end"><Button size="sm" onClick={onOpen}>Abrir</Button></div> : null}
      actions={<><Button size="sm" variant="ghost" disabled={applying} onClick={onAskChanges}>Pedir cambios</Button><Button size="sm" disabled={applying} onClick={() => setMore((m) => !m)} aria-expanded={more}>Editar</Button><Button size="sm" disabled={applying} onClick={onDiscard}>Descartar</Button>
        <Button size="sm" variant="primary" disabled={applying || problems.length > 0} onClick={() => onApply(draft)}>{applying && <LoaderCircle size={14} className="animate-spin" />}Crear borrador</Button></>}>
      {proposal.motivo && <p className="m-0 text-sm text-ink-3">{proposal.motivo}</p>}
      {!readOnly && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-3">Título<Input value={f.title} maxLength={200} aria-label="Título de la página" onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugOf(e.target.value)); }} /></label>
          <div className="flex flex-col gap-1 text-xs font-medium text-ink-3"><span id={`g-${proposal.slug}`}>Grupo del menú</span>
            <Select aria-labelledby={`g-${proposal.slug}`} value={f.groupSel} onValueChange={(v) => set('groupSel', v)} options={options} /></div>
          {f.groupSel === NEW_GROUP && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-3">Nombre del grupo nuevo<Input value={f.newGroup} maxLength={120} aria-label="Nombre del grupo nuevo" onChange={(e) => set('newGroup', e.target.value)} /></label>
              {canon && <Callout tone="warn">Ya existe el grupo «{canon}»: se usará ese, no se crea uno nuevo.</Callout>}
              {isNew && f.newGroup.trim() && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.confirmNew} onChange={(e) => set('confirmNew', e.target.checked)} /> Confirmo crear el grupo nuevo «{f.newGroup.trim()}»</label>}
            </div>
          )}
        </div>
      )}
      <MiniTree seccionLabel={SECCIONES.find(([k]) => k === f.seccion)?.[1] ?? f.seccion} group={canon ?? grupo} pages={treePages} title={f.title} isNewGroup={isNew} />
      {more && !readOnly && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1 text-xs font-medium text-ink-3"><span id={`s-${proposal.slug}`}>Sección</span>
            <Select aria-labelledby={`s-${proposal.slug}`} value={f.seccion} onValueChange={(v) => { const first = groupNames(outline, v)[0]; setF((x) => ({ ...x, seccion: v, groupSel: first ?? NO_GROUP, newGroup: '', confirmNew: false })); }} options={SECCIONES.map(([value, label]) => ({ value, label }))} /></div>
          <div className="flex flex-col gap-1 text-xs font-medium text-ink-3"><span id={`t-${proposal.slug}`}>Tipo de página</span>
            <Select aria-labelledby={`t-${proposal.slug}`} value={f.tipo} onValueChange={(v) => set('tipo', v)} options={TIPOS.map(([value, label]) => ({ value, label }))} /></div>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-3">Dirección (slug)<Input mono value={f.slug} maxLength={100} aria-label="Dirección de la página" onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase()); }} /></label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-3">Módulo{f.seccion === 'tareas' ? '' : ' (opcional)'}<Input list="ai-card-modulos" value={f.modulo} aria-label="Módulo" onChange={(e) => set('modulo', e.target.value.trim().toLowerCase())} />
            <datalist id="ai-card-modulos">{(sec?.modulos ?? []).map((m) => <option key={m} value={m} />)}</datalist></label>
        </div>
      )}
      <p className="m-0 text-sm text-ink-3">Quedará en <code className="font-mono text-[12.5px]">{routeOf(f.seccion, f.modulo, f.slug)}</code> como <b className="font-medium text-ink-2">borrador</b>{proposal.usesTemplate ? ' (estructura base del tipo)' : ''}.</p>
      {!readOnly && problems.length > 0 && <Callout tone="warn"><ul className="m-0 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Callout>}
      {expired && <Callout tone="warn">Propuesta guardada de una conversación anterior: revisa los datos antes de crearla.</Callout>}
      <FigureStrip text={proposal.body} missing={missing} />
      <details className="text-sm"><summary className="cursor-pointer text-ink-2">Ver el contenido propuesto</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border border-line bg-bg p-3"><BlockPreview value={bodyWithTitle(proposal.body, f.title)} /></div></details>
    </CardShell>
  );
}

export function EditCard({ proposal, state, error, applying, expired, missing, onApply, onDiscard, onAskChanges }: { proposal: EditProposal; state: string; error?: string; applying: boolean; expired?: boolean; missing?: string[]; onApply: () => void; onDiscard: () => void; onAskChanges: () => void }) {
  const e = proposal;
  const d = lineDiff(e.hunk.before, e.hunk.after);
  return (
    <CardShell kind="edit" title={e.page.title} state={state} error={error}
      actions={<><Button size="sm" variant="ghost" disabled={applying} onClick={onAskChanges}>Pedir cambios</Button><Button size="sm" disabled={applying} onClick={onDiscard}>Descartar</Button>
        <Button size="sm" variant="primary" disabled={applying || expired} onClick={onApply}>{applying && <LoaderCircle size={14} className="animate-spin" />}Aplicar</Button></>}>
      <p className="m-0 text-sm text-ink-2"><span className="font-mono text-[12.5px]">{e.page.route}</span> · {e.page.isOpen ? 'página abierta' : 'otra página'}</p>
      {expired ? <Callout tone="warn">Esta edición es de una conversación anterior y ya no se puede aplicar: pídela de nuevo.</Callout> : (
        <>
          {e.page.status === 'published' && !e.page.isOpen && <Callout tone="warn">Está publicada: al aplicar se guarda y se ve al instante en el manual. Se crea una revisión para poder volver.</Callout>}
          {e.page.isOpen && state === 'pending' && <p className="m-0 text-sm text-ink-3">Se aplica en el editor sin guardar; podrás deshacerlo.</p>}
        </>
      )}
      <FigureStrip text={e.hunk.after} missing={missing} />
      <DiffPane title="Antes" lines={d.before} tone="del" />
      <DiffPane title="Después" lines={d.after} tone="add" />
    </CardShell>
  );
}

export function MoveCard({ proposal, state, error, applying, onApply, onDiscard, onAskChanges }: { proposal: MoveProposal; state: string; error?: string; applying: boolean; onApply: () => void; onDiscard: () => void; onAskChanges: () => void }) {
  const m = proposal;
  return (
    <CardShell kind="move" title={m.page.title} state={state} error={error}
      actions={<><Button size="sm" variant="ghost" disabled={applying} onClick={onAskChanges}>Pedir cambios</Button><Button size="sm" disabled={applying} onClick={onDiscard}>Descartar</Button>
        <Button size="sm" variant="primary" disabled={applying} onClick={onApply}>{applying && <LoaderCircle size={14} className="animate-spin" />}Aplicar</Button></>}>
      <p className="m-0 text-sm text-ink-2">{m.summary}</p>
      <p className="m-0 text-sm text-ink-3">Ahora: {m.page.seccion}{m.page.grupo ? ` › ${m.page.grupo}` : ''}. Se coloca al final del destino.</p>
    </CardShell>
  );
}

