/*
 * Reordenación con arrastre para el lienzo (bloques e ítems internos). Igual que SortableList de
 * components/dnd, pero con estrategia vertical o en rejilla (filas de imágenes) y por ids.
 * Solo el asa inicia el arrastre (ratón con umbral, táctil o teclado: Espacio, flechas, Espacio).
 */
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { DndContext, closestCenter, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { announcements, useDndSensors, type HandleProps } from '@/components/dnd';
import { cn } from '@/lib/cn';
import { insertItem, moveItem, removeItem } from '@/lib/blocks/index.ts';
import { syncIds } from '../model/doc';

let seq = 0;
const makeKey = () => `it${++seq}`;

/**
 * Claves estables para los ítems de un bloque (pasos, tarjetas, imágenes, elementos de lista), que no
 * tienen id propio. Llame a move/insert/remove justo antes de cambiar los datos para que las claves sigan a cada ítem.
 */
export function useItemIds(n: number) {
  const ref = useRef<string[]>([]);
  ref.current = syncIds(ref.current, n, makeKey);
  return {
    ids: ref.current,
    move: (from: number, to: number) => { ref.current = moveItem(ref.current, from, to); },
    insert: (i: number) => { const k = makeKey(); ref.current = insertItem(ref.current, i, k); return k; },
    remove: (i: number) => { ref.current = removeItem(ref.current, i); },
  };
}

function Row({ id, disabled, className, children }: { id: string; disabled?: boolean; className?: string; children: (h: HandleProps, dragging: boolean) => ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn('relative', isDragging && 'z-20 opacity-50', className)}>
      {children({ ref: setActivatorNodeRef, attributes, listeners }, isDragging)}
    </div>
  );
}

export function SortableItems({ ids, onMove, render, label, grid, disabled, className, itemClassName, style }: {
  ids: string[]; onMove: (from: number, to: number) => void; render: (id: string, index: number, handle: HandleProps, dragging: boolean) => ReactNode;
  label: (id: UniqueIdentifier) => string; grid?: boolean; disabled?: boolean; className?: string; itemClassName?: string; style?: CSSProperties;
}) {
  const sensors = useDndSensors();
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} accessibility={{ announcements: announcements(label) }}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id)), to = ids.indexOf(String(over.id));
        if (from >= 0 && to >= 0) onMove(from, to);
      }}>
      <SortableContext items={ids} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy} disabled={disabled}>
        <div className={className} style={style}>
          {ids.map((id, i) => <Row key={id} id={id} disabled={disabled} className={itemClassName}>{(h, d) => render(id, i, h, d)}</Row>)}
        </div>
      </SortableContext>
    </DndContext>
  );
}
