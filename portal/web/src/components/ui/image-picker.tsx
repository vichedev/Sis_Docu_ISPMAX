/**
 * AssetTile: miniatura de una imagen del manual (nombre y medidas). `selected` marca la elegida.
 * ImagePicker: diálogo para elegir una imagen existente, con buscador, filtro por carpeta y miniaturas.
 *   <ImagePicker open onOpenChange onSelect={(asset) => …} title="Elegir captura" />
 *   Reutilizable por el editor de páginas y por el de tours.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import { api, type Asset } from '../../lib/api';
import { assetFolder, assetName, assetRel, folderLabel, foldersOf } from '../../lib/assets';
import { useAsync, useDebounced } from '../../lib/hooks';
import { fmtSize } from '../../lib/util';
import { cn } from '../../lib/cn';
import { Dialog } from './dialog';
import { SearchInput } from './input';
import { Select } from './select';
import { EmptyState, ErrorState, Spinner } from './feedback';
import { Button } from './button';

export function AssetTile({ asset, selected, onClick, className }: { asset: Asset; selected?: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} title={assetRel(asset.path)}
      className={cn('flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-line bg-bg text-left text-ink hover:border-line-strong', selected && 'border-accent shadow-[0_0_0_1px_var(--accent)] hover:border-accent', className)}>
      <span className="relative block aspect-[16/10] min-h-0 shrink-0 overflow-hidden border-b border-line bg-subtle">
        <img loading="lazy" src={api.assetUrl(assetRel(asset.path))} alt="" className="absolute inset-0 size-full object-cover object-left-top" />
      </span>
      <span className="truncate px-2 pt-1.5 text-[12.5px] font-medium">{assetName(asset.path)}</span>
      <span className="px-2 pb-1.5 text-[11.5px] tabular-nums text-ink-3">{asset.width && asset.height ? `${asset.width}×${asset.height}` : ''}{asset.size ? ` · ${fmtSize(asset.size)}` : ''}</span>
    </button>
  );
}

export const AssetGrid = ({ children, className }: { children: ReactNode; className?: string }) =>
  <ul className={cn('m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-0 max-sm:grid-cols-[repeat(auto-fill,minmax(136px,1fr))] max-sm:gap-2', className)}>{children}</ul>;

export function ImagePicker({ open, onOpenChange, onSelect, title = 'Elegir una imagen', confirmLabel = 'Usar esta imagen' }: { open: boolean; onOpenChange: (o: boolean) => void; onSelect: (a: Asset) => void; title?: string; confirmLabel?: string }) {
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('all');
  const [sel, setSel] = useState<Asset | null>(null);
  const dq = useDebounced(q, 250);
  const { data, error, loading, reload } = useAsync(() => (open ? api.assets({ q: dq }) : Promise.resolve([] as Asset[])), [dq, open]);
  const all = data ?? [];
  const folders = useMemo(() => foldersOf(all), [all]);
  const items = folder === 'all' ? all : all.filter((a) => assetFolder(a.path) === folder);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="xl" title={title} bodyClassName="min-h-[50vh]"
      footer={<><span className="mr-auto truncate font-mono text-xs text-ink-3">{sel ? assetRel(sel.path) : 'Ninguna seleccionada'}</span>
        <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button variant="primary" disabled={!sel} onClick={() => { if (sel) { onSelect(sel); onOpenChange(false); } }}>{confirmLabel}</Button></>}>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchInput className="max-w-sm" aria-label="Buscar imágenes" placeholder="Buscar por nombre o carpeta" value={q} onValueChange={setQ} autoFocus />
        <Select className="w-56" aria-label="Carpeta" value={folder} onValueChange={setFolder}
          options={[{ value: 'all', label: `Todas las carpetas (${all.length})` }, ...folders.map(([f, n]) => ({ value: f, label: `${folderLabel(f)} (${n})` }))]} />
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Spinner block /> : items.length === 0 ? (
        <EmptyState compact icon={<ImageOff size={20} />} title="Ninguna imagen coincide">Pruebe con otro nombre o carpeta.</EmptyState>
      ) : (
        <AssetGrid>
          {items.slice(0, 120).map((a) => <li key={a.path}><AssetTile asset={a} selected={sel?.path === a.path} onClick={() => setSel(a)} /></li>)}
        </AssetGrid>
      )}
    </Dialog>
  );
}
