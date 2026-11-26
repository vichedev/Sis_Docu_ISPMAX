import { useI18n, useLocation, usePage } from '@rspress/core/runtime';
import { renderInlineMarkdown, useActiveAnchor } from '@rspress/core/theme-original';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './Icon';
import { Eyebrow } from './ui';

/** Encabezado de `page.toc` (mismo tipo que espera useActiveAnchor). */
type Header = Parameters<typeof useActiveAnchor>[0][number];

const useHeaders = () => (usePage().page.toc ?? []) as Header[];

/** Texto plano de un encabezado (puede traer `código` o **negrita** en Markdown en línea). */
const plain = (s: string) => s.replace(/[`*_]/g, '');

/**
 * Lista del índice. Sale de `page.toc` (h2-h4 calculados al compilar), así que va en el HTML estático; el encabezado
 * visible se marca con `useActiveAnchor` de Rspress (usa el scroll-padding-top de <html>).
 */
function TocList({ headers, activeId, onNavigate }: { headers: Header[]; activeId: string; onNavigate?: () => void }) {
  return (
    <ul className="relative border-l border-line text-[13px] leading-snug">
      {headers.map((h, i) => {
        const on = activeId === h.id;
        return (
          <li key={`${h.id}-${i}`}>
            <a
              href={`#${h.id}`}
              onClick={onNavigate}
              aria-current={on ? 'location' : undefined}
              className={cn(
                '-ml-px block border-l-2 py-[5px] pr-2 transition-colors',
                h.depth <= 2 ? 'pl-3.5' : h.depth === 3 ? 'pl-6.5' : 'pl-9.5 text-[12.5px]',
                on ? 'border-brand font-semibold text-brand' : 'border-transparent text-fg-subtle hover:border-fg-faint hover:text-fg',
              )}
              {...renderInlineMarkdown(h.text)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function BackToTopLink() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0 })}
      className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-subtle transition-colors hover:text-brand"
    >
      <Icon name="arrowUp" className="size-3.5" strokeWidth={2} />
      Volver arriba
    </button>
  );
}

/** Columna derecha (xl+): índice con seguimiento de lectura; el activo se mantiene a la vista en índices largos. */
export function Toc() {
  const headers = useHeaders();
  const t = useI18n();
  const { activeAnchorId } = useActiveAnchor(headers);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('[aria-current="location"]');
    const scroller = el?.closest<HTMLElement>('[data-scrollbox]');
    if (!el || !scroller) return;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    if (top < 60 || top > scroller.clientHeight - 60) scroller.scrollTop += top - scroller.clientHeight / 2;
  }, [activeAnchorId]);

  if (!headers.length) return null;
  return (
    <nav ref={box} aria-labelledby="toc-titulo">
      <Eyebrow id="toc-titulo" className="mb-3 flex items-center gap-1.5">
        <Icon name="list" className="size-3.5" strokeWidth={2.25} />
        {t('outlineTitle')}
      </Eyebrow>
      <TocList headers={headers} activeId={activeAnchorId ?? ""} />
      <BackToTopLink />
    </nav>
  );
}

/**
 * Barra fija "En esta página" bajo la barra superior (< xl): muestra el apartado que se está leyendo y despliega el
 * índice. Se cierra con Esc, con un clic fuera o al elegir un apartado.
 */
export function MobileTocBar() {
  const headers = useHeaders();
  const t = useI18n();
  const { activeAnchorId } = useActiveAnchor(headers);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('[aria-current="location"]')?.scrollIntoView({ block: 'nearest' });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!headers.length) return null;
  const current = headers.find(h => h.id === activeAnchorId);
  return (
    <div ref={ref} className="sticky top-topbar z-30 border-b border-line bg-bg/90 backdrop-blur-xl xl:hidden print:hidden">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="flex h-subbar w-full items-center gap-2 px-4 text-left text-[13px] sm:px-8 lg:px-12"
      >
        <Icon name="list" className="size-4 shrink-0 text-brand" strokeWidth={2} />
        <span className="shrink-0 font-semibold text-fg">{t('outlineTitle')}</span>
        {current ? (
          <>
            <Icon name="chevronRight" className="size-3.5 shrink-0 text-fg-faint" strokeWidth={2.25} />
            <span className="min-w-0 truncate text-fg-subtle">{plain(current.text)}</span>
          </>
        ) : null}
        <Icon name="chevronDown" className={cn('ml-auto size-4 shrink-0 text-fg-subtle transition-transform', open && 'rotate-180')} strokeWidth={2} />
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute inset-x-3 top-full mt-1.5 max-h-[min(60vh,28rem)] animate-rise overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-4 shadow-[0_24px_48px_-12px_rgb(15_18_40/0.3)] sm:inset-x-8 lg:inset-x-12 dark:shadow-[0_24px_48px_-12px_rgb(0_0_0/0.6)]"
      >
        <TocList headers={headers} activeId={activeAnchorId ?? ""} onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );
}
