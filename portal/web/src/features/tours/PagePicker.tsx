/* Selector de página del manual (buscador sobre GET /api/pages): devuelve `{label, route}` para el enlace de un paso. */
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Dialog, EmptyState, ErrorState, SearchInput, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { SECCIONES } from '@/lib/util';
import type { TourLink } from './tourModel';

export function PagePicker({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (o: boolean) => void; onSelect: (l: TourLink) => void }) {
  const [text, setText] = useState('');
  const q = useDebounced(text, 250);
  const { data, error, loading, reload } = useAsync(() => (open ? api.pages({ q, limit: 40, status: '' }) : Promise.resolve(null)), [q, open]);
  const items = data?.items ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="md" title="Enlazar una página del manual" description="El lector verá un enlace al final del paso." bodyClassName="min-h-[320px]">
      <SearchInput aria-label="Buscar páginas" placeholder="Buscar por título, dirección o texto" value={text} onValueChange={setText} autoFocus className="mb-3" />
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Spinner block /> : !items.length ? (
        <EmptyState compact icon={<FileText size={20} />} title="Ninguna página coincide">Pruebe con otras palabras.</EmptyState>
      ) : (
        <ul className="m-0 max-h-[360px] list-none divide-y divide-line overflow-auto rounded-lg border border-line p-0" data-testid="page-picker-list">
          {items.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { onSelect({ label: p.title, route: p.route }); onOpenChange(false); }}
                className="flex w-full cursor-pointer flex-col px-3.5 py-2 text-left text-ink hover:bg-subtle focus-visible:bg-subtle">
                <span className="text-[13.5px] font-medium">{p.title}</span>
                <span className="font-mono text-xs text-ink-3">{SECCIONES[p.seccion] ?? p.seccion} · {p.route}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
