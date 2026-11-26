/*
 * Paleta de bloques: fichas por categoría (Texto · Medios · Estructura · Destacados · Avanzado) con icono, nombre y
 * miniatura. Clic o Intro inserta tras el bloque seleccionado (o al final); arrastrar una ficha al lienzo inserta
 * en el hueco marcado (datos BLOCK_MIME). Flechas: moverse entre fichas; ↓ desde el buscador entra en la rejilla.
 */
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { CornerDownRight, LayoutTemplate } from 'lucide-react';
import { SearchInput } from '@/components/ui';
import { cn } from '@/lib/cn';
import { commandIcon } from '../blocks/commands';
import { BLOCK_MIME, paletteSections, type PaletteItem } from '../model/palette';
import { PaletteThumb } from './Thumbs';

const COLS = 2;

export function BlockPalette({ onInsert, target, disabled, draggable = true, className }: {
  onInsert: (id: string) => void;
  /** Bloque tras el que se insertará (null: al final de la página). */
  target: string | null;
  /** Motivo por el que no se puede insertar ahora (y acción para resolverlo). */
  disabled?: ReactNode;
  draggable?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState('');
  const sections = useMemo(() => paletteSections(q), [q]);
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const [focus, setFocus] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const off = !!disabled;

  const focusAt = (i: number) => {
    const n = Math.max(0, Math.min(flat.length - 1, i));
    setFocus(n);
    grid.current?.querySelector<HTMLButtonElement>(`[data-pi="${n}"]`)?.focus();
  };
  const onGridKey = (e: KeyboardEvent) => {
    const i = Number((e.target as HTMLElement).dataset.pi ?? -1);
    if (i < 0) return;
    const go: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + COLS, ArrowUp: i - COLS, Home: 0, End: flat.length - 1 };
    if (e.key in go) {
      e.preventDefault();
      if (e.key === 'ArrowUp' && i < COLS) { grid.current?.parentElement?.querySelector<HTMLInputElement>('input')?.focus(); return; }
      focusAt(go[e.key]);
    }
  };
  const onSearchKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' && flat.length) { e.preventDefault(); focusAt(0); }
    else if (e.key === 'Enter' && flat[0] && !off) { e.preventDefault(); onInsert(flat[0].id); }
  };
  const onDragStart = (e: DragEvent, it: PaletteItem) => {
    e.dataTransfer.setData(BLOCK_MIME, it.id);
    e.dataTransfer.effectAllowed = 'copy';
    setDragging(it.id);
  };

  let n = -1;
  return (
    <div className={cn('flex min-h-0 flex-col', className)} data-testid="block-palette">
      <div className="flex flex-col gap-2 border-b border-line px-4 pb-3 pt-3">
        <SearchInput size="sm" aria-label="Buscar bloque" placeholder="Buscar bloque…" value={q} onValueChange={(v) => { setQ(v); setFocus(0); }} onKeyDown={onSearchKey} data-testid="palette-search" />
        {disabled ? <div className="text-sm text-ink-3">{disabled}</div> : (
          <p className="m-0 flex items-start gap-1.5 text-xs leading-snug text-ink-3" aria-live="polite" data-testid="palette-target">
            <CornerDownRight size={13} className="mt-px shrink-0" />
            <span>{target ? <>Clic: se inserta después de <b className="font-medium text-ink-2">{target}</b></> : <>Clic: se inserta al final de la página</>}{draggable && ' · o arrástrelo al lienzo'}</span>
          </p>
        )}
      </div>
      <div ref={grid} className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-1" onKeyDown={onGridKey}>
        {!flat.length && (
          <div className="mt-6 flex flex-col items-center gap-1.5 text-center text-sm text-ink-3">
            <LayoutTemplate size={18} /> Ningún bloque coincide con «{q}».
            <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-accent-ink underline" onClick={() => setQ('')}>Ver todos</button>
          </div>
        )}
        {sections.map((s) => (
          <section key={s.group.id} aria-labelledby={`pal-${s.group.id}`}>
            <h3 id={`pal-${s.group.id}`} className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">{s.group.label}</h3>
            <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
              {s.items.map((it) => {
                const i = ++n;
                return (
                  <li key={it.id} className="min-w-0">
                    <button type="button" data-pi={i} data-cmd={it.id} tabIndex={i === Math.min(focus, flat.length - 1) ? 0 : -1} disabled={off}
                      draggable={draggable && !off} onDragStart={(e) => onDragStart(e, it)} onDragEnd={() => setDragging(null)}
                      onClick={() => onInsert(it.id)} onFocus={() => setFocus(i)} title={it.hint}
                      className={cn('group/tile relative flex w-full min-w-0 cursor-pointer flex-col gap-1.5 rounded-lg border border-line bg-side p-1.5 text-left text-ink transition-colors',
                        'hover:border-accent-line hover:bg-accent-soft focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50',
                        draggable && !off && 'active:cursor-grabbing', dragging === it.id && 'border-accent opacity-60')}>
                      <PaletteThumb id={it.id} />
                      <span className="flex min-w-0 items-start gap-1.5 px-0.5 pb-0.5">
                        <span className="mt-px shrink-0 text-ink-3 group-hover/tile:text-accent-ink [&_svg]:size-[14px]">{commandIcon(it.id)}</span>
                        <span className="line-clamp-2 min-w-0 text-[12.5px] font-medium leading-[1.2]">{it.short}</span>
                      </span>
                      <span className="sr-only">. {it.hint}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
