/*
 * Lista de bloques del lienzo (también la de dentro de pasos y avisos): «+» entre bloques, arrastre por el asa,
 * barra del bloque activo (convertir, ajustes, formato, subir/bajar, duplicar, eliminar) y Alt+↑/↓.
 * Con `readOnly` en el contexto pinta lo mismo sin controles (vista previa).
 */
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { ArrowDown, ArrowUp, Bold, ChevronDown, CircleAlert, Code, Copy, Italic, Link2, Plus, Trash2 } from 'lucide-react';
import { Button, DragHandle, DropdownMenu, IconButton, InsertLine, SlashMenu, Tooltip } from '@/components/ui';
import type { HandleProps } from '@/components/dnd';
import {
  BLOCK_LABELS, convertBlock, convertTargets, duplicateBlock, insertBlock, mapBlock, moveBlock, newBlock, parseMdx, removeBlock, updateBlock,
  type AnyBlockPatch, type Block, type BlockOf, type BlockType,
} from '@/lib/blocks/index.ts';
import { cn } from '@/lib/cn';
import { blockFromCommand, docText } from '../model/doc';
import { linkSelection, wrapSelection } from '../model/text';
import { autoPick, blockName, COMMAND_ITEMS, commandById, typeIcon } from './commands';
import { Ctx, useEditor } from './context';
import { Inline } from './Inline';
import { SortableItems } from './Sortable';
import { BlockSettings } from './settings';
import { CodeBody, DividerBody, HeadingBody, KickerBody, LeadBody, ListBody, ParagraphBody, RawBody, SearchTermsBody, TableBody } from './bodies';
import { ImageBody, ImageRowBody, TourBody } from './media';
import { CalloutBody, CardsBody, StepsBody } from './items';

export type Commit = (next: Block[], opts?: { key?: string }) => void;

/** Tipos que abren su selector al insertarse (galería o lista de tours). */
const AUTO_PICK = new Set<BlockType>(['image', 'imageRow', 'tour']);

export interface Nav {
  /** Intro: aplica `patch` a este bloque y crea debajo un párrafo con `rest` (enfocado). */
  split: (patch: AnyBlockPatch, rest: string) => void;
  /** Retroceso en vacío: quita el bloque y enfoca el anterior. */
  removeSelf: () => void;
  /** Flechas en el borde del campo: pasa al bloque vecino. */
  out: (dir: 'prev' | 'next') => void;
  /** Menú «/»: sustituye este bloque por otro. */
  replaceWith: (b: Block) => void;
}

export interface BodyProps<T extends BlockType = BlockType> {
  block: BlockOf<T>;
  update: (patch: AnyBlockPatch, key?: string) => void;
  /** Cambio sobre la lista completa (convertir, reanalizar…). */
  apply: (fn: (blocks: Block[]) => Block[]) => void;
  nav: Nav;
  active: boolean;
  depth: number;
}

const raf = (f: () => void) => requestAnimationFrame(() => requestAnimationFrame(f));

function Body(p: BodyProps) {
  switch (p.block.type) {
    case 'heading': return <HeadingBody {...(p as BodyProps<'heading'>)} />;
    case 'paragraph': return <ParagraphBody {...(p as BodyProps<'paragraph'>)} />;
    case 'list': return <ListBody {...(p as BodyProps<'list'>)} />;
    case 'image': return <ImageBody {...(p as BodyProps<'image'>)} />;
    case 'imageRow': return <ImageRowBody {...(p as BodyProps<'imageRow'>)} />;
    case 'steps': return <StepsBody {...(p as BodyProps<'steps'>)} />;
    case 'callout': return <CalloutBody {...(p as BodyProps<'callout'>)} />;
    case 'cards': return <CardsBody {...(p as BodyProps<'cards'>)} />;
    case 'table': return <TableBody {...(p as BodyProps<'table'>)} />;
    case 'code': return <CodeBody {...(p as BodyProps<'code'>)} />;
    case 'kicker': return <KickerBody {...(p as BodyProps<'kicker'>)} />;
    case 'lead': return <LeadBody {...(p as BodyProps<'lead'>)} />;
    case 'divider': return <DividerBody />;
    case 'tour': return <TourBody {...(p as BodyProps<'tour'>)} />;
    case 'searchTerms': return <SearchTermsBody {...(p as BodyProps<'searchTerms'>)} />;
    case 'raw': return <RawBody {...(p as BodyProps<'raw'>)} />;
  }
}

/** Botones de formato en línea; no roban el foco al área de texto. */
function FormatButtons() {
  const ed = useEditor();
  const t = ed.textTarget;
  if (!t) return null;
  const keep = (e: MouseEvent) => e.preventDefault();
  return (
    <>
      <span className="mx-1 h-[18px] w-px bg-line" />
      <IconButton size="icon-sm" label="Negrita" shortcut="Ctrl+B" icon={<Bold size={15} />} onMouseDown={keep} onClick={() => t.apply((v, s, e) => wrapSelection(v, s, e, '**'))} />
      <IconButton size="icon-sm" label="Cursiva" shortcut="Ctrl+I" icon={<Italic size={15} />} onMouseDown={keep} onClick={() => t.apply((v, s, e) => wrapSelection(v, s, e, '*'))} />
      <IconButton size="icon-sm" label="Código" shortcut="Ctrl+E" icon={<Code size={15} />} onMouseDown={keep} onClick={() => t.apply((v, s, e) => wrapSelection(v, s, e, '`', '`', 'código'))} />
      <IconButton size="icon-sm" label="Enlace" shortcut="Ctrl+K" icon={<Link2 size={15} />} onMouseDown={keep} onClick={() => t.apply(linkSelection)} />
    </>
  );
}

function BlockShell({ block: b, index, blocks, onChange, depth, handle }: { block: Block; index: number; blocks: Block[]; onChange: Commit; depth: number; handle?: HandleProps }) {
  const ed = useEditor();
  const active = ed.activeId === b.id;
  const probs = ed.problems.get(b.id);

  const update = (patch: AnyBlockPatch, key?: string) => onChange(updateBlock(blocks, b.id, patch), { key: key ?? b.id });
  // Siempre sobre la lista más reciente: los diálogos (p. ej. «Crear tour con esta imagen») aplican el cambio al terminar.
  const applyRef = useRef<(fn: (bl: Block[]) => Block[]) => void>(() => {});
  applyRef.current = (fn) => onChange(fn(blocks));
  const apply = useCallback((fn: (bl: Block[]) => Block[]) => applyRef.current(fn), []);
  const nav: Nav = {
    split: (patch, rest) => {
      const nb = newBlock('paragraph', { md: rest });
      // Síncrono: las teclas que siguen a Intro deben caer ya en el bloque nuevo.
      flushSync(() => onChange(insertBlock(updateBlock(blocks, b.id, patch), index + 1, nb)));
      ed.focusBlock(nb.id, 'start');
    },
    removeSelf: () => {
      const prev = blocks[index - 1] ?? blocks[index + 1];
      flushSync(() => onChange(removeBlock(blocks, b.id)));
      if (prev) ed.focusBlock(prev.id, 'end');
    },
    out: (dir) => { const t = blocks[index + (dir === 'prev' ? -1 : 1)]; if (t) ed.focusBlock(t.id, dir === 'prev' ? 'end' : 'start'); },
    replaceWith: (nb) => {
      if (AUTO_PICK.has(nb.type)) autoPick.add(b.id);
      flushSync(() => onChange(mapBlock(blocks, b.id, () => nb)));
      ed.focusBlock(b.id, 'start');
    },
  };
  const move = (d: -1 | 1) => {
    const to = index + d;
    if (to < 0 || to >= blocks.length) return;
    onChange(moveBlock(blocks, b.id, to));
    raf(() => { const el = document.querySelector<HTMLElement>(`[data-block-id="${b.id}"]`); el?.scrollIntoView({ block: 'nearest' }); el?.focus({ preventScroll: true }); });
  };
  const duplicate = () => onChange(duplicateBlock(blocks, b.id));
  const remove = () => {
    onChange(removeBlock(blocks, b.id));
    ed.setActive(null);
    ed.notify(`${blockName(b)} eliminado`, 'info', { label: 'Deshacer', run: ed.undo });
  };
  const convert = (t: BlockType) => { onChange(convertBlock(blocks, b.id, t)); raf(() => ed.focusBlock(b.id, 'start')); };

  if (ed.readOnly) {
    return <div data-block-id={b.id} data-block-index={index} className="min-w-0"><Body block={b} update={update} apply={apply} nav={nav} active={false} depth={depth} /></div>;
  }

  const onKey = (e: KeyboardEvent) => {
    if (!e.currentTarget.contains(e.target as Node)) return; // teclas de un diálogo abierto desde el bloque
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); e.stopPropagation(); move(e.key === 'ArrowUp' ? -1 : 1); }
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); e.stopPropagation(); duplicate(); }
    else if (e.key === 'Escape' && e.target === e.currentTarget) ed.setActive(null);
  };
  const targets = convertTargets(b);
  const grip = handle && <DragHandle ref={handle.ref} attributes={handle.attributes} listeners={handle.listeners} label={`Arrastrar para mover: ${blockName(b)}`} />;

  return (
    <div data-block-id={b.id} data-block-index={index} data-top={depth === 0 ? '' : undefined} tabIndex={-1} onKeyDown={onKey} aria-label={blockName(b)}
      onMouseDown={(e) => { if (!e.currentTarget.contains(e.target as Node)) return; e.stopPropagation(); if (!active) ed.setActive(b.id); }}
      className="group/blk relative min-w-0 rounded-md outline-none">
      {depth === 0 && grip && (
        <div className={cn('absolute -left-9 top-0 flex h-full items-start pt-0.5 opacity-0 transition-opacity group-hover/blk:opacity-100 focus-within:opacity-100 max-md:hidden', active && 'opacity-100')}>{grip}</div>
      )}
      {active && (
        <div role="toolbar" aria-label={`Acciones del bloque ${blockName(b)}`}
          onMouseDown={(e) => { e.stopPropagation(); if (!(e.target as HTMLElement).closest('input,textarea')) e.preventDefault(); }}
          className="absolute bottom-full right-0 z-30 mb-1.5 flex max-w-[min(100%,calc(100vw-24px))] animate-fade-in flex-wrap items-center justify-end gap-0.5 rounded-lg border border-line bg-raised p-0.5 shadow-pop">
          {grip && <span className={cn(depth === 0 && 'md:hidden')}>{grip}</span>}
          {targets.length ? (
            <DropdownMenu align="start" label="Convertir en" items={targets.map((t) => ({ label: t === 'raw' ? 'Convertir en código MDX' : `Convertir en ${BLOCK_LABELS[t].toLowerCase()}`, icon: typeIcon(t), onSelect: () => convert(t) }))}
              trigger={<Button variant="ghost" size="sm" className="gap-1.5 px-2 text-ink" aria-label={`${blockName(b)}: convertir en otro tipo`}>{typeIcon(b.type)}<span className="max-[420px]:hidden">{blockName(b)}</span><ChevronDown size={13} className="text-ink-3" /></Button>} />
          ) : <span className="inline-flex h-7 items-center gap-1.5 px-2 text-sm font-medium text-ink">{typeIcon(b.type)}<span className="max-[420px]:hidden">{blockName(b)}</span></span>}
          <BlockSettings block={b} update={update} apply={apply} />
          {ed.textTarget?.blockId === b.id && <FormatButtons />}
          <span className="mx-1 h-[18px] w-px bg-line" />
          <IconButton size="icon-sm" label="Subir" shortcut="Alt+↑" icon={<ArrowUp size={15} />} disabled={index === 0} onClick={() => move(-1)} />
          <IconButton size="icon-sm" label="Bajar" shortcut="Alt+↓" icon={<ArrowDown size={15} />} disabled={index === blocks.length - 1} onClick={() => move(1)} />
          <IconButton size="icon-sm" label="Duplicar" shortcut="Ctrl+Mayús+D" icon={<Copy size={15} />} onClick={duplicate} />
          <IconButton size="icon-sm" label="Eliminar bloque" icon={<Trash2 size={15} />} className="hover:text-danger" onClick={remove} />
        </div>
      )}
      <div className={cn('-mx-2 rounded-md px-2 py-0.5 transition-shadow', active ? 'shadow-[0_0_0_1px_var(--accent-line)]' : depth === 0 && 'hover:shadow-[0_0_0_1px_var(--border)]',
        probs && 'shadow-[inset_3px_0_0_var(--danger),0_0_0_1px_var(--border)]', ed.flashId === b.id && 'animate-flash')}>
        <Body block={b} update={update} apply={apply} nav={nav} active={active} depth={depth} />
      </div>
      {probs && (
        <ul className="m-0 mt-1 list-none p-0 text-sm text-danger">
          {probs.map((p, i) => <li key={i} className={cn('flex items-start gap-1.5', p.level !== 'error' && 'text-warn')}><CircleAlert size={14} className="mt-0.5" />{p.message}</li>)}
        </ul>
      )}
    </div>
  );
}

export function BlockList({ blocks, onChange, depth, className }: { blocks: Block[]; onChange: Commit; depth: number; className?: string }) {
  const ed = useEditor();
  const [menu, setMenu] = useState<{ index: number; anchor: HTMLElement } | null>(null);
  const ids = useMemo(() => blocks.map((b) => b.id), [blocks]);

  if (ed.readOnly) {
    return <div className={cn('flex min-w-0 flex-col gap-4', className)}>{blocks.map((b, i) => <BlockShell key={b.id} block={b} index={i} blocks={blocks} onChange={onChange} depth={depth} />)}</div>;
  }

  const insertAt = (index: number, id: string) => {
    const c = commandById(id);
    const b = blockFromCommand(c);
    onChange(insertBlock(blocks, index, b));
    if (AUTO_PICK.has(c.type)) autoPick.add(b.id);
    ed.setActive(b.id);
    raf(() => ed.focusBlock(b.id, 'start'));
  };
  const label = (id: string | number) => { const b = blocks.find((x) => x.id === id); return b ? `el bloque ${blockName(b)}` : 'el bloque'; };

  return (
    <div className={cn('min-w-0', className)}>
      <SortableItems ids={ids} label={label} onMove={(from, to) => onChange(moveBlock(blocks, blocks[from].id, to))}
        render={(_id, i, handle) => (
          <>
            {(i > 0 || depth === 0) && <InsertLine className={depth ? 'h-2.5' : 'h-4'} label="Insertar bloque aquí" onInsert={(a) => setMenu({ index: i, anchor: a })} />}
            <BlockShell block={blocks[i]} index={i} blocks={blocks} onChange={onChange} depth={depth} handle={handle} />
          </>
        )} />
      <InsertLine className={depth ? 'h-2.5' : 'h-4'} label="Insertar bloque al final" onInsert={(a) => setMenu({ index: blocks.length, anchor: a })} />
      {depth === 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
          <Tooltip content="Insertar un bloque al final">
            <Button variant="ghost" size="sm" className="-ml-2.5 text-ink-2" onClick={(e) => setMenu({ index: blocks.length, anchor: e.currentTarget })}><Plus size={15} /> Añadir bloque</Button>
          </Tooltip>
          <span>o escriba <kbd className="rounded-sm border border-line-strong bg-subtle px-1 font-mono text-xs">/</kbd> en un párrafo vacío</span>
        </div>
      )}
      <SlashMenu open={!!menu} onOpenChange={(o) => { if (!o) setMenu(null); }} anchor={menu?.anchor} items={COMMAND_ITEMS} searchable placeholder="Buscar bloque…" emptyText="Ningún bloque coincide"
        onSelect={(it) => { if (menu) insertAt(menu.index, it.id); setMenu(null); }} />
    </div>
  );
}

/** Markdown con bloques dentro (pasos, avisos): lista anidada editable que se escribe de vuelta como texto. */
export function NestedBlocks({ md, onChange, depth }: { md: string; onChange: (md: string, key?: string) => void; depth: number }) {
  const ed = useEditor();
  const cache = useRef<{ md: string; blocks: Block[] } | null>(null);
  if (!cache.current || cache.current.md !== md) {
    const parsed = md.trim() ? parseMdx(md) : [];
    cache.current = { md, blocks: parsed.length || ed.readOnly ? parsed : [newBlock('paragraph', { md: '' })] };
  }
  const change: Commit = (next, opts) => {
    const t = docText(next);
    cache.current = { md: t, blocks: next.length ? next : [newBlock('paragraph', { md: '' })] };
    onChange(t, opts?.key);
  };
  return <BlockList blocks={cache.current.blocks} onChange={change} depth={depth} />;
}

const noop = () => {};
/** Markdown de bloque en solo lectura (descripciones de tarjetas, elementos de lista con varias líneas). */
export function MdView({ md }: { md: string }) {
  const ed = useEditor();
  const blocks = useMemo(() => parseMdx(md), [md]);
  if (blocks.length === 1 && blocks[0].type === 'paragraph') return <Inline md={blocks[0].md} live={ed.readOnly} />;
  return <Ctx.Provider value={{ ...ed, readOnly: true }}><BlockList blocks={blocks} onChange={noop} depth={9} className="gap-2" /></Ctx.Provider>;
}
