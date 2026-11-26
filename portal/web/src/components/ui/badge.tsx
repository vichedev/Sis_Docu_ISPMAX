/**
 * Badge: etiqueta pequeña. tone: neutral · accent · ok · warn · danger. `dot` añade el punto de estado.
 * StatusBadge: estado normalizado con punto (`running` lleva el cian ISPMAX pulsando).
 *   status: published · draft · ok · running · error · neutral, o un texto con `label`.
 * Tag: etiqueta mínima sin borde (p. ej. «Próximamente», «Nueva»).
 */
import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const badge = cva('inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 align-middle text-[12.5px] font-medium', {
  variants: {
    tone: {
      neutral: 'border-line bg-bg text-ink-2',
      accent: 'border-accent-line bg-accent-soft text-accent-ink',
      ok: 'border-line bg-bg text-ink-2',
      warn: 'border-transparent bg-warn-soft text-warn',
      danger: 'border-line bg-bg text-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
const dotTone = { neutral: 'bg-ink-4', accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn-dot', danger: 'bg-danger', running: 'bg-signal animate-pulse' } as const;

export interface BadgeProps extends VariantProps<typeof badge> { children: ReactNode; dot?: boolean | keyof typeof dotTone; className?: string; title?: string }
export function Badge({ tone, dot, children, className, title }: BadgeProps) {
  const d = dot === true ? (tone ?? 'neutral') : dot || null;
  return <span className={cn(badge({ tone }), d && 'pl-[7px]', className)} title={title}>{d && <span aria-hidden="true" className={cn('size-1.5 rounded-full', dotTone[d])} />}{children}</span>;
}

const STATUS: Record<string, { tone: NonNullable<BadgeProps['tone']>; dot: keyof typeof dotTone; label: string }> = {
  published: { tone: 'ok', dot: 'ok', label: 'Publicada' },
  draft: { tone: 'warn', dot: 'warn', label: 'Borrador' },
  ok: { tone: 'ok', dot: 'ok', label: 'Correcto' },
  running: { tone: 'neutral', dot: 'running', label: 'En curso' },
  error: { tone: 'danger', dot: 'danger', label: 'Con error' },
  neutral: { tone: 'neutral', dot: 'neutral', label: '' },
};
export function StatusBadge({ status, label, className }: { status: string; label?: ReactNode; className?: string }) {
  const s = STATUS[status] ?? STATUS.neutral;
  return <Badge tone={s.tone} dot={s.dot} className={className}>{label ?? (s.label || status)}</Badge>;
}

export function Tag({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent'; className?: string }) {
  return <span className={cn('inline-flex h-[18px] shrink-0 items-center whitespace-nowrap rounded-sm px-1.5 align-middle text-[11.5px] font-medium', tone === 'accent' ? 'bg-accent-soft text-accent-ink' : 'bg-muted text-ink-3', className)}>{children}</span>;
}
