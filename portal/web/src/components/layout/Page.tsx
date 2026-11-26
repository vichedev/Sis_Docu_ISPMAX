/**
 * Marco común de las pantallas (todas menos el espacio de contenido):
 *   <Page title description actions width="narrow|default|wide|centered">…</Page>
 * useBreadcrumbs(items): una pantalla de detalle sustituye las migas por defecto.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { PageHeader, type Crumb } from '@/components/ui';
import { cn } from '@/lib/cn';

export const CrumbsCtx = createContext<(c: Crumb[] | null) => void>(() => {});
export function useBreadcrumbs(items: Crumb[] | null) {
  const set = useContext(CrumbsCtx);
  const key = JSON.stringify(items?.map((i) => [typeof i.label === 'string' ? i.label : '', i.href]));
  useEffect(() => { set(items); return () => set(null); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Marcos de página: siempre centrados (márgenes simétricos) y con el mismo relleno lateral; la cabecera va dentro del
 * marco, así que queda alineada con el contenido.
 *   narrow   · formularios, ajustes y árboles: una columna cómoda (máx. 1040 px)
 *   default  · listas y paneles (máx. 1240 px)
 *   wide     · tablas anchas, imágenes y auditoría (máx. 1440 px)
 *   centered · Inicio (máx. 1440 px; mismo ancho que `wide`, se conserva por compatibilidad)
 */
export const PAGE_WIDTHS = { narrow: 'max-w-[1040px]', default: 'max-w-[1240px]', wide: 'max-w-[1440px]', centered: 'max-w-[1440px]' } as const;
export type PageWidth = keyof typeof PAGE_WIDTHS;
/** Clases del marco común, para pantallas que no usan <Page> (p. ej. el editor de tours). */
export const pageFrame = (width: PageWidth | 'full' = 'default') => cn('mx-auto w-full animate-fade-in px-8 pb-14 pt-7 max-md:px-4 max-md:pt-5', width === 'full' ? 'max-w-[1680px]' : PAGE_WIDTHS[width]);
export function Page({ title, description, actions, meta, width = 'default', children, className }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; meta?: ReactNode; width?: PageWidth; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn(pageFrame(width), className)}>
      <PageHeader title={title} description={description} actions={actions} meta={meta} />
      {children}
    </div>
  );
}

/** Barra fija inferior para cambios pendientes (orden del árbol, ajustes). */
export function SaveBar({ children }: { children: ReactNode }) {
  return (
    <div role="region" aria-label="Cambios sin guardar" className="sticky bottom-4 z-20 mt-4 flex animate-fade-in flex-wrap items-center gap-2 rounded-lg border border-line-strong bg-raised py-2.5 pl-4 pr-3 text-[13.5px] shadow-pop">
      {children}
    </div>
  );
}
