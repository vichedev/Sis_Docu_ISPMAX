import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './Icon';

/**
 * Botón flotante "Volver arriba" (< xl; en xl+ está al pie del índice). Aparece tras bajar ~1,5 pantallas.
 * Un único listener pasivo de scroll, sin re-render mientras no cambia la visibilidad.
 */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShow(window.scrollY > window.innerHeight * 1.5));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0 })}
      aria-label="Volver arriba"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={cn(
        'fixed right-4 bottom-4 z-30 inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface/95 text-fg-muted shadow-lg backdrop-blur transition-[opacity,transform] hover:text-brand sm:right-6 sm:bottom-6 xl:hidden print:hidden',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <Icon name="arrowUp" className="size-5" strokeWidth={2} />
    </button>
  );
}
