/*
 * TourPlayer: «Probar tour» a pantalla completa. Reproduce el comportamiento de `src/components/Tour.tsx` del manual:
 * captura con el recuadro resaltado (el resto atenuado), «Paso n de N», Anterior/Siguiente y teclado ← → Inicio Fin.
 * Esc cierra la vista previa (en el manual vuelve al paso 1).
 */
import { useEffect, useState } from 'react';
import { Dialog as D } from 'radix-ui';
import { ArrowUpRight, X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { RichText } from './RichText';
import type { TourStep } from './tourModel';
import { siteHref } from '@/lib/siteHref';

const pct = (n: number) => `${Math.min(100, Math.max(0, n))}%`;

export function TourPlayer({ open, onOpenChange, title, steps, startAt = 0 }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; steps: TourStep[]; startAt?: number }) {
  const [i, setI] = useState(startAt);
  useEffect(() => { if (open) setI(Math.min(startAt, Math.max(steps.length - 1, 0))); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = steps.length;
  const go = (n: number) => setI(Math.min(Math.max(n, 0), Math.max(total - 1, 0)));
  const step = steps[i];

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1);
      else if (e.key === 'Home') go(0); else if (e.key === 'End') go(total - 1); else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, i, total]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[900] bg-scrim" />
        <D.Content aria-describedby={undefined} data-testid="tour-player" className="fixed inset-0 z-[901] flex flex-col bg-bg focus:outline-none data-[state=open]:animate-fade">
          <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line pl-5 pr-3 max-sm:pl-4">
            <D.Title className="m-0 min-w-0 flex-1 truncate text-[15px] font-semibold">{title || 'Tour sin título'}</D.Title>
            <span className="rounded-sm bg-subtle px-2 py-0.5 text-xs font-medium text-ink-2 max-sm:hidden">Vista previa: así lo verá el lector</span>
            <D.Close asChild><IconButton label="Cerrar la vista previa (Esc)" tooltip={false} icon={<X size={18} />} /></D.Close>
          </header>
          {!step ? (
            <div className="grid flex-1 place-items-center p-8 text-ink-3">Este tour aún no tiene pasos.</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 max-sm:px-3 max-sm:py-4">
              <div role="group" aria-roledescription="tour guiado" aria-label={title || 'Tour guiado'} className="mx-auto flex w-full max-w-[1000px] flex-col gap-3.5">
                <div className="flex justify-center overflow-hidden rounded-lg border border-line bg-subtle p-0">
                  <div className="relative inline-block max-w-full overflow-hidden leading-none">
                    <img key={step.image} src={api.assetUrl(step.image)} alt={step.alt || step.title} draggable={false} className="block h-auto max-h-[58vh] w-auto max-w-full" />
                    {step.spot && (
                      <div aria-hidden="true" data-testid="player-spot" style={{ left: pct(step.spot.x), top: pct(step.spot.y), width: pct(step.spot.w), height: pct(step.spot.h) }}
                        className="pointer-events-none absolute box-border rounded-md border-2 border-signal shadow-[0_0_0_100vmax_rgb(10_14_24/0.55),0_0_0_4px_rgb(56_189_248/0.28)] transition-[left,top,width,height] duration-300" />
                    )}
                  </div>
                </div>
                <div aria-live="polite" aria-atomic="true" className="rounded-lg border border-line bg-raised px-5 py-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-accent-ink">Paso {i + 1} de {total}</span>
                    <span aria-hidden="true" className="flex gap-1">
                      {steps.map((_, n) => <span key={n} className={cn('h-1.5 rounded-[3px]', n === i ? 'w-4 bg-accent' : 'w-1.5 bg-line-strong')} />)}
                    </span>
                  </div>
                  <p className="m-0 text-lg font-semibold">{step.title || <span className="text-ink-3">Sin título</span>}</p>
                  <p className="mb-0 mt-1.5 text-base text-ink-2"><RichText text={step.text} /></p>
                  {step.link && <a href={siteHref(step.link.route)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-medium text-accent-ink">{step.link.label}<ArrowUpRight size={14} /></a>}
                </div>
                <div className="flex justify-between gap-2">
                  <Button onClick={() => go(i - 1)} disabled={i === 0}>Anterior</Button>
                  <Button variant="primary" onClick={() => go(i + 1)} disabled={i >= total - 1}>Siguiente</Button>
                </div>
              </div>
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
