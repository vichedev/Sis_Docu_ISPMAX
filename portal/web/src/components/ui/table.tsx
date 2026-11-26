/**
 * Table: tabla densa y legible (filas de ~40px, cabecera fija, números tabulares).
 *   <Table><THead><TR><TH sort=… onSort=…>Título</TH></TR></THead><TBody><TR onClick=…><TD>…</TD></TR></TBody></Table>
 *   TH `sort`: 'asc' | 'desc' | false (columna ordenable) → anuncia aria-sort.
 *   TR `onClick` la hace navegable (el primer enlace de la fila sigue siendo el acceso por teclado).
 *   `hide`: 'sm' | 'md' oculta la columna en pantallas estrechas.
 * useSort: ordena en el cliente una lista por la clave elegida.
 */
import { useMemo, useState, type MouseEvent, type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/cn';

const hideCls = { sm: 'max-sm:hidden', md: 'max-md:hidden' } as const;

export function Table({ children, className, dim, flush }: { children: ReactNode; className?: string; dim?: boolean; flush?: boolean }) {
  return (
    <div className={cn('overflow-auto bg-bg', flush ? 'rounded-b-lg' : 'rounded-lg border border-line', className)}>
      <table className={cn('w-full border-separate border-spacing-0 text-[13.5px] transition-opacity', dim && 'opacity-55')}>{children}</table>
    </div>
  );
}
export const THead = ({ children }: { children: ReactNode }) => <thead>{children}</thead>;
export const TBody = ({ children }: { children: ReactNode }) => <tbody className="[&>tr:last-child>td]:border-b-0">{children}</tbody>;

export function TR({ children, onClick, className }: { children: ReactNode; onClick?: (e: MouseEvent<HTMLTableRowElement>) => void; className?: string }) {
  const handle = onClick ? (e: MouseEvent<HTMLTableRowElement>) => { if (!(e.target as HTMLElement).closest('a,button,input,[role=menu]')) onClick(e); } : undefined;
  return <tr onClick={handle} className={cn(onClick && 'cursor-pointer [&:hover>td]:bg-subtle', className)}>{children}</tr>;
}

interface THProps extends ThHTMLAttributes<HTMLTableCellElement> { sort?: 'asc' | 'desc' | false; onSort?: () => void; hide?: keyof typeof hideCls; narrow?: boolean }
export function TH({ children, sort, onSort, hide, narrow, className, ...p }: THProps) {
  const sortable = sort !== undefined && onSort;
  return (
    <th aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
      className={cn('sticky top-0 z-[1] whitespace-nowrap border-b border-line bg-subtle px-3 py-2 text-left text-[12.5px] font-medium text-ink-3 first:pl-4 last:pr-3', narrow && 'w-px', hide && hideCls[hide], className)} {...p}>
      {sortable ? (
        <button type="button" onClick={onSort} className="-mx-1 inline-flex cursor-pointer items-center gap-1 rounded-sm px-1 hover:text-ink">
          {children}{sort === 'asc' ? <ArrowUp size={12} /> : sort === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-50" />}
        </button>
      ) : children}
    </th>
  );
}

interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> { hide?: keyof typeof hideCls; narrow?: boolean; numeric?: boolean; muted?: boolean }
export function TD({ children, hide, narrow, numeric, muted, className, ...p }: TDProps) {
  return <td className={cn('border-b border-line px-3 py-[9px] align-middle first:pl-4 last:pr-3', narrow && 'w-px whitespace-nowrap text-right', numeric && 'tabular-nums', muted && 'text-ink-3', hide && hideCls[hide], className)} {...p}>{children}</td>;
}

export type SortState<K extends string> = { key: K; dir: 'asc' | 'desc' } | null;
export function useSort<T, K extends string>(items: T[], get: (item: T, key: K) => string | number | null | undefined, initial: SortState<K> = null) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const sorted = useMemo(() => {
    if (!sort) return items;
    const f = sort.dir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const x = get(a, sort.key) ?? '', y = get(b, sort.key) ?? '';
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true })) * f;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sort]);
  const props = (key: K) => ({ sort: (sort?.key === key ? sort.dir : false) as 'asc' | 'desc' | false, onSort: () => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' })) });
  return { sorted, sort, props };
}

/** Pager: paginación simple «1–50 de 285 · Anterior · Siguiente». */
export function Pager({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (o: number) => void }) {
  if (total <= limit) return null;
  const btn = 'inline-flex h-7 cursor-pointer items-center rounded-md border border-line-strong bg-bg px-2.5 text-sm font-medium hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <nav aria-label="Paginación" className="mt-3 flex items-center justify-end gap-2 text-sm">
      <span className="mr-1 text-ink-3">{offset + 1}–{Math.min(total, offset + limit)} de {total}</span>
      <button type="button" className={btn} disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>Anterior</button>
      <button type="button" className={btn} disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>Siguiente</button>
    </nav>
  );
}
