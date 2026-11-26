/**
 * Card: superficie con borde de 1px (sin sombra).
 * Panel: Card con cabecera (título, descripción, acciones). `flush` quita el relleno del cuerpo
 * para listas y tablas que llegan hasta el borde.
 * List / ListItem: filas separadas por líneas dentro de un Panel flush.
 */
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const Card = ({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'aside' }) =>
  <As className={cn('min-w-0 rounded-lg border border-line bg-bg', className)}>{children}</As>;

export function Panel({ title, description, actions, children, flush, className, bodyClassName }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string; bodyClassName?: string;
}) {
  return (
    <Card className={className}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="flex items-center gap-2 text-[14.5px] font-semibold leading-snug">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(flush ? '' : 'p-4', bodyClassName)}>{children}</div>
    </Card>
  );
}

export const List = ({ children, className }: { children: ReactNode; className?: string }) => <ul className={cn('m-0 list-none divide-y divide-line p-0', className)}>{children}</ul>;
export function ListItem({ children, href, className, external }: { children: ReactNode; href?: string; className?: string; external?: boolean }) {
  const cls = cn('flex items-center justify-between gap-4 px-4 py-2.5 text-ink', className);
  return <li>{href ? <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className={cn(cls, 'hover:bg-subtle hover:no-underline')}>{children}</a> : <div className={cls}>{children}</div>}</li>;
}

/** Pares clave-valor alineados (estado, propiedades). */
export function DescriptionList({ items, className, stacked }: { items: [ReactNode, ReactNode][]; className?: string; stacked?: boolean }) {
  return (
    <dl className={cn('m-0 grid grid-cols-1 gap-x-5 gap-y-2 text-[13.5px]', !stacked && 'sm:grid-cols-[minmax(110px,max-content)_1fr] sm:gap-y-2.5', className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className={cn('m-0 mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5', !stacked && 'sm:mb-0')}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
