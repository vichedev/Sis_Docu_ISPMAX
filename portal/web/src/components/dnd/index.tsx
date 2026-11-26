/*
 * Arrastrar y soltar reutilizable (@dnd-kit):
 *   useDndSensors()       — ratón/táctil (con umbral) y teclado (Espacio para coger, flechas, Espacio para soltar).
 *   announcements(label)  — mensajes en español para lectores de pantalla.
 *   SortableList          — lista vertical reordenable genérica (p. ej. bloques de una página):
 *       <SortableList items={blocks} getId={(b) => b.id} onReorder={setBlocks} renderItem={(b, handle) => <Row handle={handle} />} />
 *     `handle` trae los props para <DragHandle {...handle} /> (solo el asa inicia el arrastre).
 *   Árbol anidado: ver ./tree.ts (flattenTree, getProjection, applyMove, buildTree, indent/outdent).
 */
import { useState, type ReactNode } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type Announcements, type DraggableAttributes, type DraggableSyntheticListeners, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/cn';

export * from './tree';

export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] } }),
  );
}

export function announcements(label: (id: UniqueIdentifier) => string): Announcements {
  return {
    onDragStart: ({ active }) => `Ha cogido ${label(active.id)}. Use las flechas para moverlo y Espacio para soltarlo.`,
    onDragOver: ({ active, over }) => (over ? `${label(active.id)} está sobre ${label(over.id)}.` : `${label(active.id)} no está sobre ninguna zona.`),
    onDragEnd: ({ active, over }) => (over ? `${label(active.id)} se soltó sobre ${label(over.id)}.` : `${label(active.id)} se soltó.`),
    onDragCancel: ({ active }) => `Movimiento cancelado. ${label(active.id)} vuelve a su sitio.`,
  };
}

export interface HandleProps { ref: (el: HTMLElement | null) => void; attributes: DraggableAttributes; listeners: DraggableSyntheticListeners }

function SortableRow({ id, children, disabled }: { id: string; disabled?: boolean; children: (h: HandleProps, dragging: boolean) => ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn('relative', isDragging && 'z-10 opacity-40')}>
      {children({ ref: setActivatorNodeRef, attributes, listeners }, isDragging)}
    </div>
  );
}

export function SortableList<T>({ items, getId, onReorder, renderItem, label, overlay, disabled, className }: {
  items: T[]; getId: (t: T) => string; onReorder: (next: T[], from: number, to: number) => void;
  renderItem: (item: T, handle: HandleProps, dragging: boolean) => ReactNode; label?: (t: T) => string; overlay?: (item: T) => ReactNode; disabled?: boolean; className?: string;
}) {
  const sensors = useDndSensors();
  const [active, setActive] = useState<string | null>(null);
  const byId = (id: UniqueIdentifier) => items.find((t) => getId(t) === id);
  const activeItem = active ? byId(active) : undefined;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} accessibility={{ announcements: announcements((id) => { const t = byId(id); return t && label ? label(t) : 'el elemento'; }) }}
      onDragStart={(e) => setActive(String(e.active.id))} onDragCancel={() => setActive(null)}
      onDragEnd={({ active: a, over }) => {
        setActive(null);
        if (!over || a.id === over.id) return;
        const from = items.findIndex((t) => getId(t) === a.id), to = items.findIndex((t) => getId(t) === over.id);
        onReorder(arrayMove(items, from, to), from, to);
      }}>
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((t) => <SortableRow key={getId(t)} id={getId(t)} disabled={disabled}>{(h, d) => renderItem(t, h, d)}</SortableRow>)}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>{activeItem && overlay ? <div className="rounded-md bg-raised shadow-pop">{overlay(activeItem)}</div> : null}</DragOverlay>
    </DndContext>
  );
}
