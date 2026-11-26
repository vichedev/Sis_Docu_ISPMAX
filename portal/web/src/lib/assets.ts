import type { Asset } from './api';

/** Ruta relativa a `assets/` (sin barra inicial ni prefijo `assets/`). */
export const assetRel = (p: string) => p.replace(/^\/?(assets\/)?/, '');
export const assetName = (p: string) => assetRel(p).split('/').pop() ?? p;
/** Carpeta de agrupación: los dos primeros niveles (`imgs/clientes`). */
export const assetFolder = (p: string) => { const parts = assetRel(p).split('/'); return parts.length > 2 ? parts.slice(0, 2).join('/') : parts.slice(0, -1).join('/') || '(raíz)'; };
export const folderLabel = (f: string) => f.replace(/^imgs\//, '');
/** Fragmento `<Figure />` con la misma sintaxis que las páginas del manual. */
export const figureSnippet = (a: Asset) => {
  const dims = a.width && a.height ? ` width={${a.width}} height={${a.height}} max="${a.width}px"` : '';
  return `<Figure src="/assets/${assetRel(a.path)}" alt=""${dims} />`;
};
export function foldersOf(list: Asset[]) {
  const m = new Map<string, number>();
  for (const a of list) { const f = assetFolder(a.path); m.set(f, (m.get(f) ?? 0) + 1); }
  return Array.from(m.entries()).sort((x, y) => x[0].localeCompare(y[0]));
}
