/* Bloques con ítems o contenido anidado: pasos (<Steps>), tarjetas (<Cards>) y avisos (:::tipo). */
import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { ChevronRight, Info, Lightbulb, Link2, OctagonAlert, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { Button, DragHandle, IconButton, Tooltip } from '@/components/ui';
import type { HandleProps } from '@/components/dnd';
import { CALLOUT_TITLES, insertItem, moveItem, removeItem, replaceItem, type CardItem, type CalloutKind } from '@/lib/blocks/index.ts';
import { cn } from '@/lib/cn';
import { useEditor } from './context';
import { Inline } from './Inline';
import { RichText } from './RichText';
import { SortableItems, useItemIds } from './Sortable';
import { CALLOUT_STYLE, S } from './styles';
import { MdView, NestedBlocks, type BodyProps } from './BlockList';

function focusItem(blockId: string, key: string) {
  document.querySelector<HTMLElement>(`[data-block-id="${blockId}"] [data-item="${key}"] [data-field]`)?.focus();
}

export function StepsBody({ block: b, update, depth, active }: BodyProps<'steps'>) {
  const ed = useEditor();
  const ids = useItemIds(b.steps.length);
  const box = useRef<HTMLDivElement>(null);
  // «Añadir paso» a la vista si el bloque o algo de dentro está activo (o al pasar el ratón).
  const within = active || (!!ed.activeId && !!box.current?.querySelector(`[data-block-id="${ed.activeId}"]`));
  const add = () => {
    const k = ids.insert(b.steps.length);
    flushSync(() => update({ steps: insertItem(b.steps, b.steps.length, { title: '', md: '' }) }));
    ed.caret.current = 'start';
    focusItem(b.id, k);
  };
  const step = (k: string, i: number, h?: HandleProps) => {
    const s = b.steps[i];
    return (
      <div data-item={k} className={cn('group/item relative', !ed.readOnly && 'pr-8')}>
        {!ed.readOnly && h ? (
          <Tooltip content="Arrastrar para mover el paso">
            <button type="button" ref={h.ref} {...h.attributes} {...h.listeners} aria-label={`Paso ${i + 1}: arrastrar para mover`}
              className={cn(S.stepNum, 'z-10 cursor-grab touch-none hover:bg-accent-hover active:cursor-grabbing')}>{i + 1}</button>
          </Tooltip>
        ) : <span aria-hidden="true" className={S.stepNum}>{i + 1}</span>}
        {!ed.readOnly && b.steps.length > 1 && (
          <IconButton size="icon-sm" label={`Quitar el paso ${i + 1}`} icon={<Trash2 size={14} />} className={cn('absolute right-0 top-0 size-7 opacity-0 hover:text-danger group-hover/item:opacity-100 focus-visible:opacity-100', active ? 'max-md:opacity-70' : 'max-md:hidden')}
            onClick={() => { ids.remove(i); update({ steps: removeItem(b.steps, i) }); ed.notify(`Paso ${i + 1} eliminado`, 'info', { label: 'Deshacer', run: ed.undo }); }} />
        )}
        {s.title && <RichText blockId={b.id} label={`Título del paso ${i + 1}`} secondary singleLine value={s.title} className="mb-1 font-semibold text-ink"
          onChange={(v) => update({ steps: replaceItem(b.steps, i, { ...s, title: v }) }, `${b.id}:title:${k}`)} />}
        <NestedBlocks md={s.md} depth={depth + 1} onChange={(md, key) => update({ steps: replaceItem(b.steps, i, { ...s, md }) }, key ?? `${b.id}:step:${k}`)} />
      </div>
    );
  };
  return (
    <div ref={box} className={cn(S.steps, 'py-1')}>
      {ed.readOnly ? ids.ids.map((k, i) => <div key={k} className="[&+&]:mt-6">{step(k, i)}</div>)
        : <SortableItems ids={ids.ids} label={(id) => `el paso ${ids.ids.indexOf(String(id)) + 1}`} itemClassName="[&+&]:mt-4"
          onMove={(f, t) => { ids.move(f, t); update({ steps: moveItem(b.steps, f, t) }); }} render={(k, i, h) => step(k, i, h)} />}
      {!ed.readOnly && <Button variant="ghost" size="sm" className={cn('-ml-2 mt-2 text-ink-3', !within && 'opacity-0 group-hover/blk:opacity-100 focus-visible:opacity-100 max-md:hidden')} onClick={add}><Plus size={14} /> Añadir paso</Button>}
    </div>
  );
}

const emptyCard = (): CardItem => ({ title: '', href: '', icon: '', md: '' });

export function CardsBody({ block: b, update, active }: BodyProps<'cards'>) {
  const ed = useEditor();
  const ids = useItemIds(b.cards.length);
  const cols = b.columns ?? 3;
  const set = (i: number, c: Partial<CardItem>, key: string) => update({ cards: replaceItem(b.cards, i, { ...b.cards[i], ...c }) }, key);
  const card = (k: string, i: number, h?: HandleProps) => {
    const c = b.cards[i];
    const edit = !ed.readOnly;
    return (
      <div data-item={k} className={cn(S.card, 'group/item relative h-full', edit && h && 'pr-12')}>
        {c.icon || (edit && active) ? (
          edit ? <input aria-label={`Icono de la tarjeta ${i + 1} (emoji)`} value={c.icon} maxLength={8} placeholder="＋" onFocus={() => ed.setActive(b.id)}
            onChange={(e) => set(i, { icon: e.target.value.trim() }, `${b.id}:icon:${k}`)}
            className="mb-3 grid size-10 rounded-[11px] border-0 bg-accent-soft p-0 text-center text-[1.3rem] leading-10 text-ink outline-none placeholder:text-base placeholder:text-ink-4 focus:shadow-[0_0_0_2px_var(--accent)]" />
            : <span aria-hidden="true" className="mb-3 grid size-10 place-items-center rounded-[11px] bg-accent-soft text-[1.3rem]">{c.icon}</span>
        ) : null}
        <RichText blockId={b.id} label={`Título de la tarjeta ${i + 1}`} singleLine value={c.title} placeholder="Título de la tarjeta" className={cn(S.cardTitle, 'mb-1')}
          onChange={(v) => set(i, { title: v }, `${b.id}:title:${k}`)} />
        <RichText blockId={b.id} label={`Texto de la tarjeta ${i + 1}`} value={c.md} placeholder="Descripción breve" className={S.cardBody}
          view={(v) => <MdView md={v} />} onChange={(v) => set(i, { md: v }, `${b.id}:md:${k}`)} />
        {edit && (active || c.href) ? (
          <label className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
            <Link2 size={13} className="shrink-0" />
            <input aria-label={`Enlace de la tarjeta ${i + 1}`} value={c.href} placeholder="/ruta/de/la/pagina (opcional)" onFocus={() => ed.setActive(b.id)}
              onChange={(e) => set(i, { href: e.target.value.trim() }, `${b.id}:href:${k}`)}
              className="h-6 min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1 font-mono text-xs text-ink-2 outline-none hover:border-line focus:border-accent" />
          </label>
        ) : !edit && c.href ? <span className="mt-2 font-mono text-xs text-ink-3">→ {c.href}</span> : null}
        {edit && h && (
          <div className={cn('absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100', active ? 'max-md:opacity-80' : 'max-md:hidden')}>
            <DragHandle ref={h.ref} attributes={h.attributes} listeners={h.listeners} label={`Arrastrar la tarjeta ${i + 1}`} />
            {b.cards.length > 1 && <IconButton size="icon-sm" label={`Quitar la tarjeta ${i + 1}`} icon={<Trash2 size={14} />} className="size-6" onClick={() => { ids.remove(i); update({ cards: removeItem(b.cards, i) }); }} />}
          </div>
        )}
      </div>
    );
  };
  const grid = cn('grid gap-4', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2 max-sm:grid-cols-1' : 'grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1');
  return (
    <div className="py-1">
      {ed.readOnly ? <div className={grid}>{ids.ids.map((k, i) => <div key={k}>{card(k, i)}</div>)}</div>
        : <SortableItems ids={ids.ids} grid label={() => 'la tarjeta'} className={grid} onMove={(f, t) => { ids.move(f, t); update({ cards: moveItem(b.cards, f, t) }); }} render={(k, i, h) => card(k, i, h)} />}
      {!ed.readOnly && (active || !b.cards.length) && (
        <Button variant="ghost" size="sm" className="-ml-2 mt-2 text-ink-3" onClick={() => { const k = ids.insert(b.cards.length); flushSync(() => update({ cards: insertItem(b.cards, b.cards.length, emptyCard()) })); ed.caret.current = 'start'; focusItem(b.id, k); }}>
          <Plus size={14} /> Añadir tarjeta
        </Button>
      )}
    </div>
  );
}

const KIND_ICON: Record<CalloutKind, typeof Info> = { tip: Lightbulb, note: Lightbulb, info: Info, warning: TriangleAlert, caution: TriangleAlert, danger: OctagonAlert, details: ChevronRight };

export function CalloutBody({ block: b, update, depth }: BodyProps<'callout'>) {
  const ed = useEditor();
  const st = CALLOUT_STYLE[b.kind] ?? CALLOUT_STYLE.info;
  const Icon = KIND_ICON[b.kind] ?? Info;
  return (
    <div className={cn('rounded-r-lg border-l-4 px-4 py-3 text-[15px]', st.box)}>
      <div className={cn('mb-1.5 flex items-center gap-1.5 text-[14.5px] font-semibold', st.title)}>
        <Icon size={16} className={cn(b.kind === 'details' && 'rotate-90')} />
        {ed.readOnly ? <span><Inline md={b.title || CALLOUT_TITLES[b.kind]} live /></span>
          : <RichText as="span" blockId={b.id} label="Título del aviso" secondary singleLine value={b.title} placeholder={CALLOUT_TITLES[b.kind]} className="min-w-0 flex-1"
            onChange={(v) => update({ title: v }, `${b.id}:title`)} />}
      </div>
      <NestedBlocks md={b.md} depth={depth + 1} onChange={(md, key) => update({ md }, key ?? `${b.id}:md`)} />
    </div>
  );
}
