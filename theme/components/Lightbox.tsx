import { useLocation } from '@rspress/core/runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Icon } from './Icon';

interface Shot {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
}

/** Datos de una imagen ampliable: el botón `[data-zoom]` que envuelve cada captura de <Figure>. */
function read(button: HTMLElement): Shot | null {
  const img = button.querySelector('img');
  if (!img) return null;
  const caption = button.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
  return {
    src: img.currentSrc || img.src,
    alt: img.alt,
    caption,
    width: img.naturalWidth || Number(img.getAttribute('width')) || undefined,
    height: img.naturalHeight || Number(img.getAttribute('height')) || undefined,
  };
}

/**
 * Ampliación de las capturas del documento: clic (o Intro/Espacio sobre la imagen) abre un <dialog> modal nativo
 * (foco atrapado, fondo inerte) con la imagen a tamaño real, su pie y navegación entre las capturas de la página.
 * Teclado: ← → anterior/siguiente, Inicio/Fin, Esc cierra y devuelve el foco a la imagen. Sustituye a medium-zoom.
 */
export function Lightbox({ root }: { root: RefObject<HTMLElement | null> }) {
  const [shots, setShots] = useState<HTMLElement[]>([]);
  const [index, setIndex] = useState(-1);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]');
      if (!button || !el.contains(button)) return;
      e.preventDefault();
      const all = Array.from(el.querySelectorAll<HTMLElement>('[data-zoom]'));
      opener.current = button;
      setShots(all);
      setIndex(all.indexOf(button));
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [root, pathname]);

  const close = useCallback(() => setIndex(-1), []);
  const open = index >= 0;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('[data-close]')?.focus();
    } else if (!open && d.open) {
      d.close();
      opener.current?.focus();
    }
  }, [open]);

  useEffect(close, [pathname, close]);

  const go = (n: number) => setIndex(Math.min(Math.max(n, 0), shots.length - 1));
  const shot = open && shots[index] ? read(shots[index]) : null;
  const many = shots.length > 1;
  const nav = 'inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30';

  return (
    <dialog
      ref={dialog}
      aria-label={shot ? `Imagen ampliada: ${shot.alt || shot.caption}` : 'Imagen ampliada'}
      onCancel={e => {
        e.preventDefault();
        close();
      }}
      onClick={e => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.backdrop !== undefined) close();
      }}
      onKeyDown={e => {
        if (e.key === 'ArrowRight') go(index + 1);
        else if (e.key === 'ArrowLeft') go(index - 1);
        else if (e.key === 'Home') go(0);
        else if (e.key === 'End') go(shots.length - 1);
        else return;
        e.preventDefault();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-white backdrop:bg-[rgb(6_7_14/0.88)] backdrop:backdrop-blur-sm"
    >
      {shot ? (
        <div data-backdrop className="flex h-full flex-col items-center justify-center gap-3 p-3 pt-16 pb-5 sm:p-8 sm:pt-16">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-3 py-3 sm:px-6">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium tabular-nums" aria-live="polite">
              {many ? `${index + 1} / ${shots.length}` : 'Imagen'}
            </span>
            <button type="button" onClick={close} data-close className={nav} aria-label="Cerrar (Esc)">
              <Icon name="close" className="size-5" strokeWidth={2} />
            </button>
          </div>
          <img
            key={shot.src}
            src={shot.src}
            alt={shot.alt}
            width={shot.width}
            height={shot.height}
            className="h-auto max-h-[calc(100dvh-10rem)] w-auto max-w-full animate-fade-in rounded-lg object-contain shadow-2xl"
            data-nozoom
          />
          {shot.caption ? <p className="max-w-3xl text-center text-[14px] leading-snug text-white/85">{shot.caption}</p> : null}
          {many ? (
            <div className="flex items-center gap-3">
              <button type="button" className={nav} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Imagen anterior">
                <Icon name="chevronLeft" className="size-5" strokeWidth={2} />
              </button>
              <button type="button" className={nav} onClick={() => go(index + 1)} disabled={index >= shots.length - 1} aria-label="Imagen siguiente">
                <Icon name="chevronRight" className="size-5" strokeWidth={2} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
