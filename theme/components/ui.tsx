/**
 * Piezas pequeñas y repetidas del tema (en vez de clases CSS propias): botones, teclas, iconos con fondo,
 * rótulos de grupo. Si una combinación de utilidades se repite en tres sitios, va aquí.
 */
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { SECTIONS } from '../lib/sections';
import type { SectionKey } from '../lib/sections';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/** Clases de botón: `primary` (violeta), `secondary` (borde), `ghost` (solo texto). Tamaños md (40 px) y lg (48 px). */
export function buttonClass(variant: 'primary' | 'secondary' | 'ghost' = 'secondary', size: 'sm' | 'md' | 'lg' = 'md') {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
    size === 'sm' && 'h-9 px-3.5 text-[13px]',
    size === 'md' && 'h-10 px-4 text-sm',
    size === 'lg' && 'h-12 px-5.5 text-[15px]',
    variant === 'primary' &&
      'bg-brand-600 text-white shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_6px_18px_-6px_rgb(91_75_216/0.6)] hover:bg-brand-700',
    variant === 'secondary' && 'border border-line bg-surface text-fg shadow-xs hover:border-brand/45 hover:text-brand',
    variant === 'ghost' && 'text-fg-muted hover:bg-bg-mute hover:text-fg',
  );
}

/** Botón cuadrado de icono de la barra (36 px). */
export const iconButtonClass =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-bg-mute hover:text-fg';

/** Tecla de atajo. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-md border border-line bg-bg px-1.5 font-sans text-[11px] font-semibold text-fg-subtle shadow-[0_1px_0_var(--isp-line)]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Icono sobre un cuadro de color (el de la sección, o el violeta de la marca). */
export function IconTile({
  icon,
  section,
  emoji,
  size = 'md',
  className,
}: {
  icon?: IconName | null;
  section?: SectionKey | null;
  emoji?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const tone = section ? SECTIONS[section] : null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        size === 'sm' && 'size-7 rounded-lg',
        size === 'md' && 'size-10 rounded-xl',
        size === 'lg' && 'size-12 rounded-2xl',
        tone ? cn(tone.tile, tone.text) : 'bg-brand-tint text-brand',
        className,
      )}
    >
      {icon ? (
        <Icon name={icon} className={size === 'sm' ? 'size-4' : size === 'md' ? 'size-5' : 'size-6'} />
      ) : (
        <span className={size === 'sm' ? 'text-sm' : 'text-xl'}>{emoji}</span>
      )}
    </span>
  );
}

/** Rótulo de grupo en versalitas (menú lateral, paleta, pie, índice). */
export function Eyebrow({ children, className, id, as: Tag = 'p' }: { children: ReactNode; className?: string; id?: string; as?: 'p' | 'h2' | 'h3' | 'span' }) {
  return (
    <Tag id={id} className={cn('font-display text-[11px] font-bold tracking-[0.09em] text-fg-subtle uppercase', className)}>
      {children}
    </Tag>
  );
}
