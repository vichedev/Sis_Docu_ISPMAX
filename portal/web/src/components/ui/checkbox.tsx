/**
 * Checkbox y Switch (Radix). Con `label` se envuelven en su etiqueta clicable;
 * `description` añade una línea de ayuda debajo.
 *   Checkbox: elecciones que se aplican al pulsar un botón (p. ej. «Reimportar»).
 *   Switch: ajustes que toman efecto al guardar la sección (activar/desactivar).
 */
import { useId, type ReactNode } from 'react';
import { Checkbox as C, Switch as Sw } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

interface BoolProps { checked: boolean; onCheckedChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean; id?: string; className?: string }

function Wrap({ id, label, description, control, className, disabled }: { id: string; label?: ReactNode; description?: ReactNode; control: ReactNode; className?: string; disabled?: boolean }) {
  if (!label) return <>{control}</>;
  return (
    <div className={cn('flex items-start gap-2.5', disabled && 'opacity-60', className)}>
      <span className="mt-0.5 flex">{control}</span>
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5 text-[13.5px] text-ink">
        <span>{label}</span>
        {description && <span className="text-sm text-ink-3">{description}</span>}
      </label>
    </div>
  );
}

export function Checkbox({ checked, onCheckedChange, label, description, disabled, id, className }: BoolProps) {
  const auto = useId();
  const cid = id ?? auto;
  return <Wrap id={cid} label={label} description={description} className={className} disabled={disabled} control={
    <C.Root id={cid} checked={checked} disabled={disabled} onCheckedChange={(v) => onCheckedChange(v === true)}
      className="grid size-4 shrink-0 cursor-pointer place-items-center rounded-sm border border-line-strong bg-bg text-accent-fg hover:border-ink-4 disabled:cursor-not-allowed data-[state=checked]:border-accent data-[state=checked]:bg-accent">
      <C.Indicator><Check size={12} strokeWidth={3} /></C.Indicator>
    </C.Root>} />;
}

export function Switch({ checked, onCheckedChange, label, description, disabled, id, className }: BoolProps) {
  const auto = useId();
  const cid = id ?? auto;
  return <Wrap id={cid} label={label} description={description} className={className} disabled={disabled} control={
    <Sw.Root id={cid} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange}
      className="relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full bg-line-strong transition-colors disabled:cursor-not-allowed data-[state=checked]:bg-accent">
      <Sw.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform data-[state=checked]:translate-x-4" />
    </Sw.Root>} />;
}
