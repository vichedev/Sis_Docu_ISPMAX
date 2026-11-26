/* Lista de pasos (izquierda del editor): miniatura con su recuadro, título, orden por arrastre y acciones. */
import { CopyPlus, Ellipsis, Plus, Trash2 } from 'lucide-react';
import { Button, DropdownMenu, IconButton } from '@/components/ui';
import { DragHandle } from '@/components/ui/editor-kit';
import { SortableList } from '@/components/dnd';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { EditStep, Issue } from './tourModel';

export function Thumb({ step, className }: { step: EditStep; className?: string }) {
  return (
    <span className={cn('relative block aspect-[16/10] w-[68px] shrink-0 overflow-hidden rounded-sm border border-line bg-subtle', className)}>
      {step.image && <img src={api.assetUrl(step.image)} alt="" loading="lazy" draggable={false} className="absolute inset-0 size-full object-cover object-left-top" />}
      {step.spot && <span aria-hidden="true" className="absolute border border-accent bg-accent/15" style={{ left: `${step.spot.x}%`, top: `${step.spot.y}%`, width: `${step.spot.w}%`, height: `${step.spot.h}%` }} />}
    </span>
  );
}

export function StepList({ steps, selected, onSelect, onReorder, onAdd, onDuplicate, onDelete, issues, readOnly }: {
  steps: EditStep[]; selected: string | null; onSelect: (key: string) => void; onReorder: (next: EditStep[]) => void; onAdd: () => void;
  onDuplicate: (key: string) => void; onDelete: (key: string) => void; issues: Issue[]; readOnly?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="m-0 text-xs font-semibold text-ink-3">Pasos ({steps.length})</h2>
        {!readOnly && <Button size="sm" onClick={onAdd} data-testid="add-step"><Plus size={14} /> Añadir paso</Button>}
      </div>
      <SortableList
        className="flex flex-col gap-1.5" items={steps} getId={(s) => s.key} disabled={readOnly} label={(s) => `el paso ${steps.indexOf(s) + 1}`}
        onReorder={onReorder}
        overlay={(s) => <div className="flex items-center gap-2 p-2"><Thumb step={s} /><span className="truncate text-[13.5px] font-medium">{s.title || 'Sin título'}</span></div>}
        renderItem={(s, handle) => {
          const n = steps.indexOf(s);
          const bad = issues.some((x) => x.step === n);
          const active = s.key === selected;
          return (
            <div data-testid="step-item" data-key={s.key} className={cn('group flex items-center gap-1 rounded-lg border bg-bg py-1.5 pl-0.5 pr-1', active ? 'border-accent-line bg-accent-soft' : 'border-line hover:border-line-strong')}>
              <DragHandle {...handle} disabled={readOnly} label={`Arrastrar el paso ${n + 1} para reordenar`} />
              <button type="button" onClick={() => onSelect(s.key)} aria-current={active ? 'step' : undefined}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm bg-transparent p-0 text-left text-ink">
                <Thumb step={s} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-ink-3">Paso {n + 1}</span>
                  <span className={cn('block truncate text-[13.5px] font-medium', !s.title && 'font-normal text-ink-3')}>{s.title || 'Sin título'}</span>
                </span>
                {bad && <span role="img" aria-label="Este paso tiene problemas" title="Este paso tiene problemas" className="mr-1 size-2 shrink-0 rounded-full bg-warn-dot" />}
              </button>
              {!readOnly && (
                <DropdownMenu label={`Acciones del paso ${n + 1}`} trigger={<IconButton size="icon-sm" tooltip={false} label={`Acciones del paso ${n + 1}`} icon={<Ellipsis size={16} />} />} items={[
                  { label: 'Duplicar paso', icon: <CopyPlus size={16} />, onSelect: () => onDuplicate(s.key) },
                  { separator: true },
                  { label: 'Eliminar paso', icon: <Trash2 size={16} />, danger: true, onSelect: () => onDelete(s.key) },
                ]} />
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
