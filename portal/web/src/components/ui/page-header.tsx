/**
 * PageHeader: título de pantalla (h1), descripción y acciones a la derecha.
 * Breadcrumbs: migas de pan; el último elemento es la página actual (aria-current).
 */
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export function PageHeader({ title, description, actions, meta, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; meta?: ReactNode; className?: string }) {
  return (
    <header className={cn('mb-5 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-[1_1_320px]">
        <h1 className="text-2xl font-semibold tracking-[-0.015em] max-sm:text-xl">{title}</h1>
        {description && <p className="mt-1 max-w-[75ch] text-ink-3">{description}</p>}
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
    </header>
  );
}

export interface Crumb { label: ReactNode; href?: string }
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Ruta de navegación" className={cn('min-w-0', className)}>
      <ol className="m-0 flex min-w-0 list-none items-center p-0 text-[13.5px] text-ink-3">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} aria-current={last ? 'page' : undefined} className={cn('flex min-w-0 items-center whitespace-nowrap', last ? 'min-w-12 font-medium text-ink' : 'shrink-0 max-sm:hidden', !last && i < items.length - 2 && 'max-xl:hidden')}>
              {i > 0 && <ChevronRight size={14} aria-hidden="true" className={cn('mx-1 text-ink-4', 'max-sm:hidden', i === items.length - 2 && 'max-xl:hidden')} />}
              {c.href && !last ? <a href={c.href} className="text-ink-3 hover:text-ink">{c.label}</a> : <span className="truncate">{c.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
