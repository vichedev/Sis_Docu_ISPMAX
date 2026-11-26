/* Elegir el tour de un bloque <Tour>: buscador sobre todos los tours (los borradores se marcan) y «Crear un tour nuevo». */
import { useMemo, useState } from 'react';
import { Plus, Route } from 'lucide-react';
import { Button, Dialog, EmptyState, ErrorState, SearchInput, Spinner, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { norm } from '../model/palette';
import { refreshTours, useTourIndex } from './tourData';

export function TourPicker({ open, onOpenChange, current, onSelect, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; current?: string; onSelect: (slug: string) => void; onCreate?: () => void;
}) {
  const { tours, error } = useTourIndex();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const w = norm(q.trim());
    return (tours ?? []).filter((t) => !w || norm(`${t.title} ${t.slug} ${t.description ?? ''}`).includes(w));
  }, [tours, q]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="md" title="Elegir un tour" description="El bloque muestra el tour en el manual. Los borradores no se ven hasta publicarlos."
      bodyClassName="min-h-[300px]"
      footer={<>
        {onCreate && <Button className="mr-auto" onClick={() => { onOpenChange(false); onCreate(); }} data-testid="tour-picker-create"><Plus size={15} /> Crear un tour nuevo</Button>}
        <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
      </>}>
      <SearchInput aria-label="Buscar tours" placeholder="Buscar por título o identificador" value={q} onValueChange={setQ} autoFocus className="mb-3" />
      {error ? <ErrorState error={new Error('No se pudo cargar la lista de tours.')} onRetry={refreshTours} />
        : !tours ? <Spinner block />
        : !list.length ? (
          <EmptyState compact icon={<Route size={20} />} title={tours.length ? 'Ningún tour coincide' : 'Aún no hay tours'}>
            {tours.length ? 'Pruebe con otras palabras.' : 'Cree el primero desde una imagen del lienzo o con «Crear un tour nuevo».'}
          </EmptyState>
        ) : (
          <ul className="m-0 max-h-[360px] list-none divide-y divide-line overflow-auto rounded-lg border border-line p-0" data-testid="tour-picker-list">
            {list.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => { onSelect(t.slug); onOpenChange(false); }} aria-current={t.slug === current ? 'true' : undefined}
                  className={cn('flex w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left text-ink hover:bg-subtle focus-visible:bg-subtle', t.slug === current && 'bg-accent-soft')}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-medium">{t.title}</span>
                    <span className="truncate font-mono text-xs text-ink-3">{t.slug} · {t.stepsCount} {t.stepsCount === 1 ? 'paso' : 'pasos'}</span>
                  </span>
                  <StatusBadge status={t.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
    </Dialog>
  );
}
