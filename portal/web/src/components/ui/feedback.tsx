/**
 * Piezas de estado:
 *   Spinner     — carga en línea o en bloque (`block`).
 *   Skeleton    — bloque fantasma; SkeletonRows: tabla fantasma (evita saltos de maquetación).
 *   EmptyState  — vacío útil: icono, título, texto y UNA acción principal.
 *   Callout     — aviso en línea: info · ok · warn · danger.
 *   ErrorState  — error de carga con «Reintentar».
 *   Kbd         — tecla. Avatar — iniciales.
 */
import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { errText } from '../../lib/auth';
import { initials } from '../../lib/util';
import { Button } from './button';

export function Spinner({ label = 'Cargando…', block, className }: { label?: string; block?: boolean; className?: string }) {
  return <div role="status" className={cn('flex items-center gap-2 text-[13.5px] text-ink-3', block && 'px-1 py-6', className)}><LoaderCircle size={16} className="animate-spin" /><span>{label}</span></div>;
}

export const Skeleton = ({ className }: { className?: string }) => <span aria-hidden="true" className={cn('block h-2.5 animate-pulse rounded-[3px] bg-muted', className)} />;
export function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-lg border border-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-6 border-b border-line px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }, (_, j) => <Skeleton key={j} className={j === 0 ? 'w-2/5' : 'flex-1'} />)}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children, action, className, compact }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-line-strong text-center text-ink-3', compact ? 'px-4 py-8' : 'px-6 py-12', className)}>
      {icon && <div className="mb-1.5 grid size-10 place-items-center rounded-lg border border-line bg-subtle text-ink-3">{icon}</div>}
      <strong className="text-[15px] font-semibold text-ink">{title}</strong>
      {children && <div className="max-w-[46ch] text-[13.5px]">{children}</div>}
      {action && <div className="mt-2.5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

const calloutTone = {
  info: 'border-line bg-subtle text-ink-2 [&>svg]:text-ink-3',
  ok: 'border-transparent bg-ok-soft text-ink [&>svg]:text-ok',
  warn: 'border-transparent bg-warn-soft text-ink [&>svg]:text-warn',
  danger: 'border-transparent bg-danger-soft text-ink [&>svg]:text-danger',
};
export function Callout({ tone = 'info', icon, children, action, className }: { tone?: keyof typeof calloutTone; icon?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[13.5px]', calloutTone[tone], className)}>
      {icon ?? (tone === 'ok' ? <CircleCheck size={16} className="mt-0.5" /> : tone === 'info' ? <Info size={16} className="mt-0.5" /> : <CircleAlert size={16} className="mt-0.5" />)}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'No se pudo cargar' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return <Callout tone="danger" action={onRetry && <Button size="sm" onClick={onRetry}>Reintentar</Button>}><strong>{title}.</strong> {errText(error)}</Callout>;
}

export const Kbd = ({ children, className }: { children: ReactNode; className?: string }) =>
  <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-b-2 border-line-strong bg-bg px-1 font-sans text-[11px] font-medium text-ink-3', className)}>{children}</kbd>;

export const Avatar = ({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) =>
  <span aria-hidden="true" className={cn('inline-grid shrink-0 place-items-center rounded-full border border-line bg-muted font-semibold text-ink-2', size === 'sm' ? 'size-7 text-[11px]' : 'size-[30px] text-xs')}>{initials(name)}</span>;
