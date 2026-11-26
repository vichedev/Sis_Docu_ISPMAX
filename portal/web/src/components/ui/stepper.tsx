/**
 * Stepper: línea de tiempo vertical de un proceso (p. ej. publicar).
 *   steps: [{ label, state: 'todo' | 'active' | 'done' | 'fail', detail? }]
 *   Cada estado se anuncia también en texto para lectores de pantalla.
 */
import type { ReactNode } from 'react';
import { Check, LoaderCircle, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export type StepState = 'todo' | 'active' | 'done' | 'fail';
const SR: Record<StepState, string> = { todo: 'pendiente', active: 'en curso', done: 'hecho', fail: 'falló' };

export function Stepper({ steps, className }: { steps: { label: ReactNode; state: StepState; detail?: ReactNode }[]; className?: string }) {
  return (
    <ol className={cn('m-0 list-none p-0', className)}>
      {steps.map((s, i) => (
        <li key={i} className={cn('relative flex items-start gap-3 py-1.5 text-[13.5px]',
          i < steps.length - 1 && "after:absolute after:bottom-[-6px] after:left-[10.5px] after:top-[30px] after:w-px after:content-['']",
          s.state === 'done' ? 'text-ink-2 after:bg-ok/50' : 'after:bg-line',
          s.state === 'todo' && 'text-ink-3', s.state === 'active' && 'font-medium text-ink', s.state === 'fail' && 'font-medium text-danger')}>
          <span aria-hidden="true" className={cn('relative z-[1] grid size-[22px] shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums',
            s.state === 'todo' && 'border-line-strong bg-bg text-ink-3',
            s.state === 'active' && 'border-accent bg-bg text-accent-ink ring-3 ring-ring',
            s.state === 'done' && 'border-ok bg-ok text-white dark:text-black',
            s.state === 'fail' && 'border-danger bg-danger text-white dark:text-black')}>
            {s.state === 'done' ? <Check size={12} strokeWidth={2.5} /> : s.state === 'fail' ? <X size={12} strokeWidth={2.5} /> : s.state === 'active' ? <LoaderCircle size={12} className="animate-spin" /> : i + 1}
          </span>
          <span className="pt-0.5">{s.label}{s.detail && <span className="block text-sm font-normal text-ink-3">{s.detail}</span>}</span>
          <span className="sr-only">: {SR[s.state]}</span>
        </li>
      ))}
    </ol>
  );
}
