/*
 * Coach: recorrido guiado ligero (spotlight + tarjeta). Reutilizable (onboarding y tours del portal).
 *
 *   <Coach steps={[{ target: '[data-coach="nav"]', title: 'Menú', body: '…' }]} onClose={(completed) => …} />
 *
 * - `target`: selector CSS del elemento a resaltar. Si no existe o no se ve (p. ej. en móvil),
 *   la tarjeta aparece abajo y centrada sin resaltar nada.
 * - `route`: ruta hash a la que navegar antes del paso (p. ej. '/contenido/12'); espera hasta 2,5 s al elemento.
 * - Teclado: → / ← avanzan y retroceden, Esc cierra. Foco atrapado en la tarjeta; el paso se anuncia.
 * - Respeta `prefers-reduced-motion` (regla global en index.css).
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import { useFocusTrap } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { go, store } from '@/lib/util';

export interface CoachStep { target?: string; title: string; body: ReactNode; route?: string; placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right' }

/** Recuerda en este navegador si un recorrido ya se vio. */
export function useCoachSeen(key: string): [boolean, () => void] {
  const [seen, setSeen] = useState(() => store.get<boolean>(key, false));
  return [seen, useCallback(() => { store.set(key, true); setSeen(true); }, [key])];
}

const PAD = 6, GAP = 12, CARD_W = 340;
const currentRoute = () => (window.location.hash.replace(/^#/, '') || '/').split('?')[0];
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function visibleRect(sel?: string): DOMRect | null {
  const el = sel ? document.querySelector<HTMLElement>(sel) : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return null;
  return r;
}

export function Coach({ steps, onClose, startAt = 0, label = 'Recorrido guiado' }: { steps: CoachStep[]; onClose: (completed: boolean) => void; startAt?: number; label?: string }) {
  const [idx, setIdx] = useState(startAt);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const tid = useId();
  const step = steps[idx];
  const last = idx === steps.length - 1;
  useFocusTrap(card, ready);

  useEffect(() => {
    if (!step) return;
    let alive = true;
    setReady(false);
    if (step.route && currentRoute() !== step.route) go(step.route);
    const t0 = Date.now();
    const find = () => {
      if (!alive) return;
      const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
      if (el || !step.target || Date.now() - t0 > 2500) {
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
        setTimeout(() => { if (alive) { setRect(visibleRect(step.target)); setReady(true); } }, el ? 80 : 0);
      } else setTimeout(find, 80);
    };
    find();
    return () => { alive = false; };
  }, [step]);

  useEffect(() => {
    if (!ready) return;
    const f = () => setRect(visibleRect(step?.target));
    window.addEventListener('resize', f);
    window.addEventListener('scroll', f, true);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('scroll', f, true); };
  }, [ready, step]);

  useLayoutEffect(() => {
    const c = card.current;
    if (!c || !ready) return;
    const w = Math.min(CARD_W, innerWidth - 32), h = c.offsetHeight;
    if (!rect || innerWidth < 560) { setPos(null); return; }
    const space = { bottom: innerHeight - rect.bottom - PAD, top: rect.top - PAD, right: innerWidth - rect.right - PAD, left: rect.left - PAD };
    const order = [...(step?.placement && step.placement !== 'auto' ? [step.placement] : []), 'bottom', 'right', 'top', 'left'] as const;
    const cx = (x: number) => Math.max(16, Math.min(x, innerWidth - w - 16));
    const cy = (y: number) => Math.max(16, Math.min(y, innerHeight - h - 16));
    for (const s of order) {
      if ((s === 'bottom' || s === 'top') && space[s] >= h + GAP + 8) { setPos({ top: s === 'bottom' ? rect.bottom + PAD + GAP : rect.top - PAD - GAP - h, left: cx(rect.left + rect.width / 2 - w / 2) }); return; }
      if ((s === 'right' || s === 'left') && space[s] >= w + GAP + 8) { setPos({ top: cy(rect.top + rect.height / 2 - h / 2), left: s === 'right' ? rect.right + PAD + GAP : rect.left - PAD - GAP - w }); return; }
    }
    setPos(null);
  }, [rect, ready, idx, step]);

  const next = useCallback(() => { if (last) onClose(true); else setIdx((i) => i + 1); }, [last, onClose]);
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(false); }
      else if (e.key === 'ArrowRight' && !typing) { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' && !typing) { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [next, prev, onClose]);
  useEffect(() => { if (ready) card.current?.querySelector<HTMLElement>('[data-coach-primary]')?.focus(); }, [ready, idx]);

  if (!step) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1100]">
      {rect
        ? <div className="pointer-events-none fixed rounded-lg shadow-[0_0_0_9999px_var(--scrim)] outline-2 outline-accent transition-[top,left,width,height] duration-200" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
        : <div className="fixed inset-0 bg-scrim" />}
      <div ref={card} role="dialog" aria-modal="true" aria-labelledby={tid} aria-describedby={`${tid}-b`} aria-roledescription={label}
        style={pos ? { top: pos.top, left: pos.left, width: Math.min(CARD_W, innerWidth - 32) } : undefined}
        className={cn('fixed z-[1] rounded-lg border border-line bg-raised px-4 pb-3.5 pt-3 shadow-pop transition-opacity duration-150', ready ? 'opacity-100' : 'opacity-0',
          !pos && 'bottom-6 left-1/2 w-[min(380px,calc(100vw-32px))] -translate-x-1/2 max-sm:bottom-3')}>
        <div className="-mr-2 mb-0.5 flex items-center justify-between">
          <span aria-live="polite" className="text-xs font-medium text-accent-ink">Paso {idx + 1} de {steps.length}</span>
          <IconButton size="icon-sm" label="Cerrar el recorrido" tooltip={false} icon={<X size={16} />} onClick={() => onClose(false)} />
        </div>
        <h2 id={tid} className="mb-1.5 text-[15.5px] font-semibold">{step.title}</h2>
        <div id={`${tid}-b`} className="text-[13.5px] text-ink-2">{step.body}</div>
        <div className="mt-3.5 flex items-center gap-2">
          <div aria-hidden="true" className="mr-auto flex gap-1">
            {steps.map((_, i) => <span key={i} className={cn('h-1.5 rounded-[3px] transition-[width]', i === idx ? 'w-4 bg-accent' : i < idx ? 'w-1.5 bg-ink-4' : 'w-1.5 bg-line-strong')} />)}
          </div>
          {idx > 0 ? <Button size="sm" onClick={prev}>Anterior</Button> : <Button size="sm" variant="ghost" onClick={() => onClose(false)}>Omitir</Button>}
          <Button size="sm" variant="primary" data-coach-primary onClick={next}>{last ? 'Terminar' : 'Siguiente'}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
