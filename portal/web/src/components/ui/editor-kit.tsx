/**
 * Piezas para editores (bloques, MDX, tours):
 *   DragHandle      — asa de arrastre (recibe los props de dnd-kit: <DragHandle {...handle} label="Mover bloque" />).
 *   Toolbar         — barra de herramientas accesible (Radix Toolbar: flechas entre botones).
 *     ToolbarButton (icono + tooltip, `active`), ToolbarSeparator.
 *   FloatingToolbar — Toolbar flotante anclada a un rectángulo (selección de texto, bloque activo).
 *   InsertLine      — línea fina con «+» entre bloques; aparece al pasar o enfocar.
 *   CommandList     — lista filtrable con teclado (base del menú «/» y de selectores).
 *   SlashMenu       — CommandList en un Popover anclado a un elemento o rectángulo (menú «/»).
 */
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Popover as P, Toolbar as T } from 'radix-ui';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { GripVertical, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Tooltip } from './tooltip';

export const DragHandle = forwardRef<HTMLButtonElement, { attributes?: DraggableAttributes; listeners?: DraggableSyntheticListeners; label?: string; className?: string; disabled?: boolean }>(
  ({ attributes, listeners, label = 'Arrastrar para mover', className, disabled }, ref) => (
    <button ref={ref} type="button" aria-label={label} disabled={disabled} {...attributes} {...listeners}
      className={cn('grid h-7 w-5 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-ink-4 hover:bg-muted hover:text-ink-2 active:cursor-grabbing disabled:cursor-default disabled:opacity-0', className)}>
      <GripVertical size={15} />
    </button>
  ),
);
DragHandle.displayName = 'DragHandle';

export const Toolbar = ({ children, label, className }: { children: ReactNode; label: string; className?: string }) =>
  <T.Root aria-label={label} className={cn('flex items-center gap-0.5', className)}>{children}</T.Root>;
export function ToolbarButton({ label, icon, onClick, active, disabled, shortcut }: { label: string; icon: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean; shortcut?: string }) {
  return (
    <Tooltip content={shortcut ? `${label} (${shortcut})` : label}>
      <T.Button aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}
        className="inline-flex h-7 min-w-7 cursor-pointer items-center justify-center gap-0.5 rounded-md px-1 text-ink-2 hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-muted aria-pressed:text-ink">{icon}</T.Button>
    </Tooltip>
  );
}
export const ToolbarSeparator = () => <T.Separator className="mx-1.5 h-[18px] w-px shrink-0 bg-line" />;

export function FloatingToolbar({ rect, children, label, offset = 8 }: { rect: DOMRect | null; children: ReactNode; label: string; offset?: number }) {
  if (!rect) return null;
  const style: CSSProperties = { top: Math.max(8, rect.top - 36 - offset), left: Math.max(8, rect.left) };
  return <div style={style} className="fixed z-[960] animate-fade-in rounded-lg border border-line bg-raised p-1 shadow-pop"><Toolbar label={label}>{children}</Toolbar></div>;
}

export function InsertLine({ onInsert, label = 'Insertar bloque aquí', className }: { onInsert: (anchor: HTMLElement) => void; label?: string; className?: string }) {
  return (
    <div className={cn('group/ins relative flex h-3 items-center', className)}>
      <span className="h-px flex-1 bg-transparent group-focus-within/ins:bg-accent-line group-hover/ins:bg-accent-line" />
      <Tooltip content={label}>
        <button type="button" aria-label={label} onClick={(e) => onInsert(e.currentTarget)}
          className="absolute left-1/2 grid size-5 -translate-x-1/2 cursor-pointer place-items-center rounded-full border border-line-strong bg-bg text-ink-3 opacity-0 hover:border-accent hover:text-accent-ink focus-visible:opacity-100 group-hover/ins:opacity-100">
          <Plus size={12} />
        </button>
      </Tooltip>
    </div>
  );
}

export interface CommandItem { id: string; label: string; icon?: ReactNode; description?: string; keywords?: string; group?: string; disabled?: boolean }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Lista filtrable. Con `query` controlada (menú «/» escribiendo en el editor) o con su propio campo (`searchable`). */
export function CommandList({ items, onSelect, query: q0, searchable, placeholder = 'Filtrar…', emptyText = 'Sin resultados', onEscape, className, autoFocus = true }: {
  items: CommandItem[]; onSelect: (item: CommandItem) => void; query?: string; searchable?: boolean; placeholder?: string; emptyText?: string; onEscape?: () => void; className?: string; autoFocus?: boolean;
}) {
  const [own, setOwn] = useState('');
  const q = norm((q0 ?? own).trim());
  const list = useMemo(() => items.filter((i) => !q || norm(`${i.label} ${i.keywords ?? ''} ${i.description ?? ''}`).includes(q)), [items, q]);
  const [active, setActive] = useState(0);
  const lid = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setActive(0), [q]);
  useEffect(() => { box.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);
  useEffect(() => { if (autoFocus && !searchable) box.current?.focus(); }, [autoFocus, searchable]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(list.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = list[active]; if (it && !it.disabled) onSelect(it); }
    else if (e.key === 'Escape' && onEscape) { e.preventDefault(); onEscape(); }
  };
  let last: string | undefined;
  return (
    <div className={cn('flex min-w-[260px] flex-col', className)} onKeyDown={onKey}>
      {searchable && <input autoFocus={autoFocus} value={own} onChange={(e) => setOwn(e.target.value)} placeholder={placeholder} role="combobox" aria-expanded="true" aria-controls={lid}
        aria-activedescendant={list[active] ? `${lid}-${active}` : undefined} className="h-9 border-b border-line bg-transparent px-3 text-[13.5px] text-ink outline-none focus-visible:outline-none" />}
      <div ref={box} id={lid} role="listbox" tabIndex={searchable ? -1 : 0} aria-activedescendant={!searchable && list[active] ? `${lid}-${active}` : undefined} className="max-h-72 overflow-y-auto p-1 focus-visible:outline-none">
        {list.length === 0 && <p className="px-3 py-4 text-center text-sm text-ink-3">{emptyText}</p>}
        {list.map((it, i) => {
          const head = it.group && it.group !== last ? <div className="px-2 pb-1 pt-2 text-[11.5px] font-medium text-ink-3">{it.group}</div> : null;
          last = it.group;
          return (
            <div key={it.id}>
              {head}
              <div id={`${lid}-${i}`} data-i={i} role="option" aria-selected={i === active} aria-disabled={it.disabled} onMouseMove={() => setActive(i)} onClick={() => !it.disabled && onSelect(it)}
                className={cn('flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5', i === active && 'bg-muted', it.disabled && 'cursor-not-allowed opacity-50')}>
                {it.icon && <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-bg text-ink-2">{it.icon}</span>}
                <span className="flex min-w-0 flex-col"><span className="truncate text-[13.5px]">{it.label}</span>{it.description && <span className="truncate text-xs text-ink-3">{it.description}</span>}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Menú «/»: Popover anclado a `anchor` (elemento) o a `rect` (posición del cursor). */
export function SlashMenu({ open, onOpenChange, anchor, rect, ...list }: { open: boolean; onOpenChange: (o: boolean) => void; anchor?: HTMLElement | null; rect?: DOMRect | null } & Parameters<typeof CommandList>[0]) {
  const virtual = useMemo(() => ({ current: { getBoundingClientRect: () => rect ?? anchor?.getBoundingClientRect() ?? new DOMRect() } }), [rect, anchor]);
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Anchor virtualRef={virtual} />
      <P.Portal>
        <P.Content align="start" sideOffset={6} collisionPadding={8} onOpenAutoFocus={(e) => { if (list.query !== undefined) e.preventDefault(); }}
          className="z-[960] w-[300px] overflow-hidden rounded-lg border border-line bg-raised shadow-pop focus:outline-none data-[state=open]:animate-fade-in">
          <CommandList {...list} onEscape={() => onOpenChange(false)} />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
