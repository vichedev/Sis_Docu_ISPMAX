/* Cuerpos de los bloques de texto: título, párrafo (con menú «/»), lista, antetítulo, entradilla, divisor, términos, código, MDX y tabla. */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { Braces, Minus, Plus, Search, X } from 'lucide-react';
import type { HandleProps } from '@/components/dnd';
import { Button, DragHandle, IconButton, SlashMenu } from '@/components/ui';
import { buildTable, insertItem, moveItem, parseTable, removeItem, replaceItem, type TableData } from '@/lib/blocks/index.ts';
import { cn } from '@/lib/cn';
import { blockFromCommand } from '../model/doc';
import { COMMAND_ITEMS, commandById, forwardToMenu } from './commands';
import { useEditor } from './context';
import { Inline } from './Inline';
import { RichText } from './RichText';
import { SortableItems, useItemIds } from './Sortable';
import { S } from './styles';
import { MdView, type BodyProps } from './BlockList';

export function HeadingBody({ block: b, update, nav }: BodyProps<'heading'>) {
  const H = `h${Math.min(6, Math.max(1, b.level))}` as 'h2';
  return (
    <H className={cn('m-0', S.h[b.level], S.hGap[b.level])}>
      <RichText as="span" blockId={b.id} label={b.level <= 2 ? 'Título de sección' : 'Subtítulo'} value={b.text} singleLine
        placeholder={b.level <= 2 ? 'Título de la sección' : 'Subtítulo'} onChange={(v) => update({ text: v }, `${b.id}:text`)}
        onEnter={(before, after) => nav.split({ text: before }, after)} onBackspaceEmpty={nav.removeSelf} onArrowOut={nav.out} />
    </H>
  );
}

export function ParagraphBody({ block: b, update, nav }: BodyProps<'paragraph'>) {
  const [slash, setSlash] = useState<{ q: string; el: HTMLTextAreaElement } | null>(null);
  const slashKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!slash) return false;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); forwardToMenu(e.key); return true; }
    if (e.key === 'Escape') { e.preventDefault(); setSlash(null); return true; }
    return false;
  };
  return (
    <div className={S.p}>
      <RichText blockId={b.id} label="Texto" value={b.md} placeholder="Escriba texto o pulse / para insertar un bloque" onChange={(v) => update({ md: v }, `${b.id}:md`)}
        onEnter={(before, after) => nav.split({ md: before }, after)} onBackspaceEmpty={nav.removeSelf} onArrowOut={nav.out}
        onSlash={(q, el) => setSlash(q == null ? null : { q, el })} slashKey={slashKey} />
      <SlashMenu open={!!slash} onOpenChange={(o) => { if (!o) setSlash(null); }} anchor={slash?.el} query={slash?.q ?? ''} autoFocus={false}
        items={COMMAND_ITEMS} emptyText="Ningún bloque coincide" onSelect={(it) => { setSlash(null); nav.replaceWith(blockFromCommand(commandById(it.id))); }} />
    </div>
  );
}

export function ListBody({ block: b, update, nav, active }: BodyProps<'list'>) {
  const ed = useEditor();
  const ids = useItemIds(b.items.length);
  const box = useRef<HTMLDivElement>(null);
  const focusKey = (k: string | undefined, where: 'start' | 'end') => {
    if (!k) return;
    ed.caret.current = where;
    box.current?.querySelector<HTMLElement>(`[data-item="${k}"] [data-field]`)?.focus();
  };
  const item = (k: string, i: number, handle?: HandleProps) => (
    <div data-item={k} role="listitem" className={cn('group/item relative', !ed.readOnly && 'pr-6')}>
      <RichText blockId={b.id} label={`Elemento ${i + 1} de la lista`} value={b.items[i]} placeholder="Elemento de la lista"
        view={(v) => (v.includes('\n') ? <MdView md={v} /> : <Inline md={v} live={ed.readOnly} />)}
        onChange={(v) => update({ items: replaceItem(b.items, i, v) }, `${b.id}:item:${k}`)}
        onEnter={(before, after) => {
          if (!before && !after && i === b.items.length - 1 && b.items.length > 1) { ids.remove(i); nav.split({ items: removeItem(b.items, i) }, ''); return; }
          const nk = ids.insert(i + 1);
          flushSync(() => update({ items: insertItem(replaceItem(b.items, i, before), i + 1, after) }));
          focusKey(nk, 'start');
        }}
        onBackspaceEmpty={() => {
          if (b.items.length <= 1) { nav.removeSelf(); return; }
          const prev = ids.ids[i - 1] ?? ids.ids[i + 1];
          ids.remove(i);
          flushSync(() => update({ items: removeItem(b.items, i) }));
          focusKey(prev, 'end');
        }}
        onArrowOut={(dir) => {
          const j = i + (dir === 'prev' ? -1 : 1);
          if (j < 0 || j >= b.items.length) nav.out(dir); else focusKey(ids.ids[j], dir === 'prev' ? 'end' : 'start');
        }} />
      {handle && <span className={cn('absolute right-0 top-1 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100', active ? 'max-md:opacity-70' : 'max-md:hidden')}><DragHandle ref={handle.ref} attributes={handle.attributes} listeners={handle.listeners} label={`Arrastrar el elemento ${i + 1}`} /></span>}
    </div>
  );
  const listCls = cn('m-0', S.list, b.ordered ? 'list-decimal' : 'list-disc');
  const style = b.ordered && b.start !== 1 ? { counterReset: `list-item ${b.start - 1}` } : undefined;
  if (ed.readOnly) return <div role="list" className={listCls} style={style}>{ids.ids.map((k, i) => <div key={k} className="[display:list-item] [&+&]:mt-1">{item(k, i)}</div>)}</div>;
  return (
    <div ref={box} role="list">
      <SortableItems ids={ids.ids} label={() => 'el elemento'} className={listCls} style={style} itemClassName="[display:list-item] [&+&]:mt-1"
        onMove={(f, t) => { ids.move(f, t); update({ items: moveItem(b.items, f, t) }); }}
        render={(k, i, h) => item(k, i, h)} />
    </div>
  );
}

export function KickerBody({ block: b, update, nav }: BodyProps<'kicker'>) {
  return <RichText blockId={b.id} label="Antetítulo" className={S.kicker} value={b.text} singleLine placeholder="Antetítulo · Módulo"
    onChange={(v) => update({ text: v }, `${b.id}:text`)} onEnter={(a, c) => nav.split({ text: a }, c)} onBackspaceEmpty={nav.removeSelf} onArrowOut={nav.out} />;
}

export function LeadBody({ block: b, update, nav }: BodyProps<'lead'>) {
  return <RichText blockId={b.id} label="Entradilla" className={S.lead} value={b.text} singleLine placeholder="Una frase: qué se logra y cuándo se usa."
    onChange={(v) => update({ text: v }, `${b.id}:text`)} onEnter={(a, c) => nav.split({ text: a }, c)} onBackspaceEmpty={nav.removeSelf} onArrowOut={nav.out} />;
}

export function DividerBody() {
  return <div className="flex h-6 items-center" aria-label="Divisor"><hr className="m-0 w-full border-0 border-t border-line-strong" /></div>;
}

export function SearchTermsBody({ block: b, update }: BodyProps<'searchTerms'>) {
  const ed = useEditor();
  if (ed.readOnly) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed border-line-strong px-3 py-2 text-sm">
      <Search size={14} className="mt-[3px] text-ink-3" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-ink-3">Términos de búsqueda · no se ven en la página</div>
        <RichText blockId={b.id} label="Términos de búsqueda" format={false} singleLine value={b.terms} className="text-ink-2" placeholder="palabras que la gente busca, separadas por espacios"
          view={(v) => <span>{v}</span>} onChange={(v) => update({ terms: v }, `${b.id}:terms`)} />
      </div>
    </div>
  );
}

/** Área de código autoajustable (bloques de código, MDX y tablas que no se pueden editar por celdas). */
function CodeArea({ value, onChange, label, placeholder, readOnly, onFocus }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string; readOnly?: boolean; onFocus?: () => void }) {
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget, s = el.selectionStart, en = el.selectionEnd;
      onChange(el.value.slice(0, s) + '  ' + el.value.slice(en));
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    }
  };
  return <textarea aria-label={label} value={value} readOnly={readOnly} placeholder={placeholder} spellCheck={false} rows={1} onKeyDown={onKey} onFocus={onFocus}
    onChange={(e) => onChange(e.target.value)} data-field=""
    className="block min-h-[1.6em] w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-mono text-[13px] leading-[1.6] text-ink outline-none [field-sizing:content] [tab-size:2] placeholder:text-ink-4 focus-visible:outline-none" />;
}

export function CodeBody({ block: b, update, active }: BodyProps<'code'>) {
  const ed = useEditor();
  return (
    <div className={cn(S.code, 'relative')}>
      {(active || b.lang) && (ed.readOnly ? <span className="absolute right-3 top-2 font-mono text-xs text-ink-3">{b.lang}</span>
        : <input aria-label="Lenguaje del código" value={b.lang} onChange={(e) => update({ lang: e.target.value.replace(/\s/g, '') }, `${b.id}:lang`)} placeholder="lenguaje (bash, json…)"
          className="absolute right-2 top-1.5 h-6 w-36 rounded-sm border border-line bg-bg px-1.5 text-right font-mono text-xs text-ink-2 outline-none focus:border-accent" />)}
      {ed.readOnly ? <pre className="m-0 whitespace-pre-wrap font-mono">{b.code}</pre>
        : <CodeArea label="Código" value={b.code} placeholder="Escriba o pegue el código" onChange={(v) => update({ code: v }, `${b.id}:code`)} onFocus={() => ed.setActive(b.id)} />}
    </div>
  );
}

export function RawBody({ block: b, update }: BodyProps<'raw'>) {
  const ed = useEditor();
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-subtle">
      <div className="flex items-center gap-1.5 border-b border-dashed border-line-strong px-3 py-1.5 text-xs text-ink-3">
        <Braces size={13} /> MDX sin bloque: se conserva tal cual{!ed.readOnly && ' y se edita como código'}
      </div>
      <div className="px-3 py-2">
        {ed.readOnly ? <pre className="m-0 whitespace-pre-wrap font-mono text-[13px] text-ink-2">{b.code}</pre>
          : <CodeArea label="Código MDX" value={b.code} placeholder="Código MDX" onChange={(v) => update({ code: v }, `${b.id}:code`)} onFocus={() => ed.setActive(b.id)} />}
      </div>
    </div>
  );
}

function TableView({ t }: { t: TableData }) {
  const ed = useEditor();
  const al = (i: number) => (t.align[i] === 'center' ? 'text-center' : t.align[i] === 'right' ? 'text-right' : '');
  return (
    <div className="overflow-x-auto">
      <table className={S.table}>
        <thead><tr>{t.header.map((h, i) => <th key={i} className={cn(S.th, al(i))}><Inline md={h} live={ed.readOnly} /></th>)}</tr></thead>
        <tbody>{t.rows.map((r, j) => <tr key={j} className="[&:last-child>td]:border-b-0">{r.map((c, i) => <td key={i} className={cn(S.td, al(i))}><Inline md={c.replace(/<br\s*\/?>/g, '\n')} live={ed.readOnly} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Cell({ value, onChange, label, head }: { value: string; onChange: (v: string) => void; label: string; head?: boolean }) {
  return <textarea aria-label={label} value={value} rows={1} onChange={(e) => onChange(e.target.value.replace(/\r?\n/g, ' '))}
    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
    className={cn('block w-full min-w-[6rem] resize-none overflow-hidden rounded-sm border-0 bg-transparent p-0 outline-none [field-sizing:content] focus:bg-accent-soft/50 focus:shadow-[0_0_0_3px_var(--accent-soft)]', head && 'font-semibold text-ink')} />;
}

export function TableBody({ block: b, update, active }: BodyProps<'table'>) {
  const ed = useEditor();
  const t = useMemo(() => parseTable(b.md), [b.md]);
  if (!t) {
    return ed.readOnly ? <pre className={S.code}>{b.md}</pre>
      : <div className={S.code}><CodeArea label="Tabla en Markdown" value={b.md} onChange={(v) => update({ md: v }, `${b.id}:md`)} onFocus={() => ed.setActive(b.id)} /></div>;
  }
  if (ed.readOnly || !active) return <div onClick={() => ed.setActive(b.id)}><TableView t={t} /></div>;
  const set = (n: TableData) => update({ md: buildTable(n) }, `${b.id}:cells`);
  const cols = t.header.length;
  const addCol = () => set({ header: [...t.header, `Columna ${cols + 1}`], align: [...t.align, null], rows: t.rows.map((r) => [...r, '']) });
  const delCol = (i: number) => cols > 1 && set({ header: removeItem(t.header, i), align: removeItem(t.align, i), rows: t.rows.map((r) => removeItem(r, i)) });
  return (
    <div>
      <div className="overflow-x-auto">
        <table className={S.table}>
          <thead><tr>{t.header.map((h, i) => (
            <th key={i} className={cn(S.th, 'group/col relative pr-7')}>
              <Cell head label={`Encabezado de la columna ${i + 1}`} value={h} onChange={(v) => set({ ...t, header: replaceItem(t.header, i, v) })} />
              {cols > 1 && <IconButton size="icon-sm" label={`Quitar la columna ${i + 1}`} icon={<X size={13} />} className="absolute right-0.5 top-1 size-6 opacity-0 group-hover/col:opacity-100 focus-visible:opacity-100" onClick={() => delCol(i)} />}
            </th>
          ))}<th className={cn(S.th, 'w-8 px-1')} aria-hidden /></tr></thead>
          <tbody>{t.rows.map((r, j) => (
            <tr key={j} className="group/row [&:last-child>td]:border-b-0">
              {r.map((c, i) => <td key={i} className={S.td}><Cell label={`Fila ${j + 1}, columna ${i + 1}`} value={c} onChange={(v) => set({ ...t, rows: replaceItem(t.rows, j, replaceItem(r, i, v)) })} /></td>)}
              <td className={cn(S.td, 'w-8 px-1')}><IconButton size="icon-sm" label={`Quitar la fila ${j + 1}`} icon={<Minus size={13} />} className="size-6 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100" onClick={() => set({ ...t, rows: removeItem(t.rows, j) })} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-1.5 flex gap-1">
        <Button variant="ghost" size="sm" className="text-ink-3" onClick={() => set({ ...t, rows: [...t.rows, Array.from({ length: cols }, () => '')] })}><Plus size={14} /> Fila</Button>
        <Button variant="ghost" size="sm" className="text-ink-3" onClick={addCol}><Plus size={14} /> Columna</Button>
      </div>
    </div>
  );
}

