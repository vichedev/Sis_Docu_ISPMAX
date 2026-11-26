import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { cn } from '../lib/cn';

export interface CalloutProps {
  type: 'tip' | 'note' | 'important' | 'warning' | 'caution' | 'danger' | 'info' | 'details';
  title?: string;
  children?: ReactNode;
}

interface Tono {
  label: string;
  icon: IconName;
  /** Fondo, filete izquierdo y color del título/icono (pareja AA claro/oscuro). */
  box: string;
  ink: string;
}

const TONOS: Record<CalloutProps['type'], Tono> = {
  tip: {
    label: 'Consejo',
    icon: 'bulb',
    box: 'border-l-emerald-500 bg-emerald-500/[0.06] dark:bg-emerald-400/[0.07]',
    ink: 'text-emerald-700 dark:text-emerald-300',
  },
  info: {
    label: 'Información',
    icon: 'info',
    box: 'border-l-sky-500 bg-sky-500/[0.06] dark:bg-sky-400/[0.07]',
    ink: 'text-sky-700 dark:text-sky-300',
  },
  note: {
    label: 'Nota',
    icon: 'note',
    box: 'border-l-fg-faint bg-bg-soft',
    ink: 'text-fg',
  },
  important: {
    label: 'Importante',
    icon: 'star',
    box: 'border-l-brand bg-brand-tint',
    ink: 'text-brand',
  },
  warning: {
    label: 'Atención',
    icon: 'alert',
    box: 'border-l-amber-500 bg-amber-500/[0.08] dark:bg-amber-400/[0.07]',
    ink: 'text-amber-800 dark:text-amber-300',
  },
  caution: {
    label: 'Precaución',
    icon: 'alertCircle',
    box: 'border-l-orange-500 bg-orange-500/[0.07] dark:bg-orange-400/[0.07]',
    ink: 'text-orange-800 dark:text-orange-300',
  },
  danger: {
    label: 'Peligro',
    icon: 'octagon',
    box: 'border-l-red-500 bg-red-500/[0.06] dark:bg-red-400/[0.08]',
    ink: 'text-red-700 dark:text-red-300',
  },
  details: { label: 'Detalles', icon: 'chevronRight', box: '', ink: 'text-fg' },
};

/** Título visible: el del contenido o, si Rspress puso el de serie ("Tip", "WARNING"…), el rótulo en español. */
function labelOf(type: CalloutProps['type'], title?: string) {
  const t = title?.trim();
  return !t || t.toLowerCase() === type ? TONOS[type].label : t;
}

/** Contenido del aviso: márgenes de los bloques internos ajustados a la caja. */
const cuerpo =
  'text-[15px] leading-[1.7] text-fg-muted [&_p]:my-2 [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_figure]:my-4 [&_ul]:my-2 [&_ol]:my-2';

/**
 * Aviso del contenido. Lo usan los bloques `:::tip|info|warning|danger|details Título` (Rspress los convierte en este
 * componente) y `<Callout type="…" title="…">` dentro de otros contenedores. `details` es plegable (<details>).
 */
export function Callout({ type = 'note', title, children }: CalloutProps) {
  const tono = TONOS[type] ?? TONOS.note;
  const label = labelOf(type, title);

  if (type === 'details') {
    return (
      <details className="group my-6 rounded-xl border border-line bg-surface shadow-xs open:bg-bg-soft/60 print:break-inside-avoid">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl px-4 py-3 font-display text-[14.5px] font-semibold text-fg transition-colors select-none hover:text-brand [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-bg-mute text-fg-subtle transition-transform group-open:rotate-90">
            <Icon name="chevronRight" className="size-3.5" strokeWidth={2.5} />
          </span>
          {label}
        </summary>
        <div className={cn(cuerpo, 'border-t border-line-soft px-4 pt-3 pb-4')}>{children}</div>
      </details>
    );
  }

  return (
    <div
      role="note"
      className={cn('my-6 flex gap-3 rounded-xl border border-line border-l-[3px] py-3.5 pr-4 pl-3.5 print:break-inside-avoid', tono.box)}
    >
      <Icon name={tono.icon} className={cn('mt-0.75 size-4.5 shrink-0', tono.ink)} strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <p className={cn('mb-1 font-display text-[14.5px] leading-snug font-semibold tracking-[-0.01em]', tono.ink)}>{label}</p>
        <div className={cuerpo}>{children}</div>
      </div>
    </div>
  );
}

export default Callout;
