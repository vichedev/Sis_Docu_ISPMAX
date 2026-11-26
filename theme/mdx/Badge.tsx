import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface BadgeProps {
  children?: ReactNode;
  /** tip (verde) · info (azul) · warning (ámbar) · danger (rojo). Def.: tip. */
  type?: 'tip' | 'info' | 'warning' | 'danger';
  /** Compatibilidad con `<Badge text="…" />`. */
  text?: string;
  /** Solo borde (equivale al `.badge.gray` del manual original con `type="info"`). */
  outline?: boolean;
}

const RELLENO: Record<NonNullable<BadgeProps['type']>, string> = {
  tip: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  info: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  warning: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  danger: 'bg-red-500/12 text-red-700 dark:text-red-300',
};
const BORDE: Record<NonNullable<BadgeProps['type']>, string> = {
  tip: 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300',
  info: 'border-line text-fg-subtle',
  warning: 'border-amber-500/50 text-amber-800 dark:text-amber-300',
  danger: 'border-red-500/50 text-red-700 dark:text-red-300',
};

/** Etiqueta de estado en línea (mismas props que el Badge de Rspress). */
export function Badge({ children, type = 'tip', text, outline = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-px align-[0.08em] text-xs leading-5 font-semibold whitespace-nowrap',
        outline ? cn('border', BORDE[type] ?? BORDE.info) : RELLENO[type] ?? RELLENO.tip,
      )}
    >
      {children || text}
    </span>
  );
}

export default Badge;
