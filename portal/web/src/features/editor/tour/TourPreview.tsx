/*
 * Vista previa gráfica de un tour dentro del lienzo: como el componente <Tour> del manual (captura con el
 * recuadro resaltado y el resto atenuado, «Paso n de N», título y texto), con Anterior/Siguiente para hojear.
 */
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { RichText } from '@/features/tours/RichText';
import type { TourStep } from '@/features/tours/tourModel';

const pct = (n: number) => `${Math.min(100, Math.max(0, n))}%`;

export function TourPreview({ steps, title, className }: { steps: Partial<TourStep>[]; title: string; className?: string }) {
  const [i, setI] = useState(0);
  const total = steps.length;
  useEffect(() => { if (i > total - 1) setI(Math.max(0, total - 1)); }, [i, total]);
  const [broken, setBroken] = useState(false);
  const step = steps[Math.min(i, total - 1)];
  useEffect(() => setBroken(false), [step?.image]);
  if (!step) return null;
  const spot = step.spot;
  return (
    <div role="group" aria-roledescription="vista previa del tour" aria-label={title} className={cn('overflow-hidden rounded-lg border border-line bg-bg', className)} data-testid="tour-preview">
      <div className="border-b border-line bg-subtle">
        <div className="relative mx-auto w-fit max-w-full overflow-hidden leading-none">
          {step.image && !broken ? (
            <img key={step.image} src={api.assetUrl(step.image)} alt={step.alt || step.title || ''} draggable={false} onError={() => setBroken(true)}
              className="pointer-events-none block h-auto max-h-[360px] w-auto max-w-full select-none" />
          ) : (
            <div className="flex min-h-[140px] min-w-[260px] flex-col items-center justify-center gap-1 px-4 text-center text-sm leading-normal text-ink-3"><ImageOff size={18} /> No se encuentra la captura</div>
          )}
          {spot && step.image && !broken && (
            <div aria-hidden="true" data-testid="preview-spot" style={{ left: pct(spot.x), top: pct(spot.y), width: pct(spot.w), height: pct(spot.h) }}
              className="pointer-events-none absolute box-border rounded-md border-2 border-signal shadow-[0_0_0_100vmax_rgb(10_14_24/0.55),0_0_0_4px_rgb(56_189_248/0.28)] transition-[left,top,width,height] duration-300" />
          )}
        </div>
      </div>
      <div className="flex items-start gap-3 px-4 py-3" aria-live="polite" aria-atomic="true">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-xs font-semibold text-accent-ink" data-testid="preview-count">Paso {i + 1} de {total}</span>
            <span aria-hidden="true" className="flex gap-1">
              {steps.map((_, n) => <span key={n} className={cn('h-1.5 rounded-[3px]', n === i ? 'w-4 bg-accent' : 'w-1.5 bg-line-strong')} />)}
            </span>
          </div>
          <p className="m-0 truncate text-[15px] font-semibold leading-snug text-ink">{step.title || <span className="font-normal text-ink-3">Paso sin título</span>}</p>
          {step.text ? <p className="m-0 mt-0.5 line-clamp-2 text-sm leading-normal text-ink-2"><RichText text={step.text} /></p> : null}
        </div>
        {total > 1 && (
          <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
            <IconButton size="icon-sm" label="Paso anterior" icon={<ChevronLeft size={16} />} disabled={i === 0} onClick={() => setI(i - 1)} />
            <IconButton size="icon-sm" label="Paso siguiente" icon={<ChevronRight size={16} />} disabled={i >= total - 1} onClick={() => setI(i + 1)} />
          </div>
        )}
      </div>
    </div>
  );
}
