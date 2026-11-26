import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { withBase } from '@rspress/core/runtime';

interface TourSpot {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TourStep {
  image: string;
  alt?: string;
  title: string;
  text: string;
  spot?: TourSpot | null;
  link?: { label: string; route: string } | null;
  width?: number;
  height?: number;
}

interface TourData {
  slug: string;
  title?: string;
  description?: string;
  steps: TourStep[];
}

export interface TourProps {
  /** Slug del tour: se carga `assets/tours/<id>.json`. */
  id: string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** `**negrita**` → <strong>; el resto es texto plano (nunca HTML). */
function renderText(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

const pct = (n: number) => `${Math.min(100, Math.max(0, n))}%`;

/** Clases comunes: mismo lenguaje que las figuras (marco, sombra) y los botones del tema (theme/components/ui.tsx). */
const box =
  'my-8 max-w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(20_23_38/0.04),0_10px_28px_-10px_rgb(20_23_38/0.16)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_10px_28px_-10px_rgb(0_0_0/0.6)] print:shadow-none';
const btn =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1';

/**
 * Tour guiado sobre capturas: cada paso muestra una imagen con un recuadro
 * resaltado (el resto se atenúa) y una tarjeta con título, texto y enlace.
 * Datos: `assets/tours/<id>.json` (lo exporta el portal). Teclado: ← → Inicio Fin y Esc (vuelve al paso 1).
 */
export default function Tour({ id }: TourProps) {
  const [data, setData] = useState<TourData | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !SLUG_RE.test(id)) {
      setState('error');
      return;
    }
    let cancelled = false;
    setState('loading');
    setIndex(0);
    fetch(withBase(`/assets/tours/${id}.json`))
      .then(r => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((j: TourData) => {
        if (cancelled) return;
        if (!j || !Array.isArray(j.steps) || j.steps.length === 0) throw new Error('vacío');
        setData(j);
        setState('ok');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const steps = data?.steps ?? [];
  const total = steps.length;

  // Precarga la imagen del paso siguiente.
  useEffect(() => {
    const next = steps[index + 1];
    if (next) new Image().src = withBase(`/assets/${next.image}`);
  }, [steps, index]);

  // Reserva la altura del paso más alto para que la tarjeta no salte al cambiar de paso.
  const { reserve, maxWidth } = useMemo(() => {
    const ratios = steps.filter(s => s.width && s.height).map(s => (s.width as number) / (s.height as number));
    const widths = steps.map(s => s.width).filter((w): w is number => !!w);
    return {
      reserve: ratios.length ? Math.min(...ratios) : null,
      maxWidth: widths.length ? Math.max(...widths) : null,
    };
  }, [steps]);

  const go = useCallback(
    (n: number) => setIndex(Math.min(Math.max(n, 0), Math.max(total - 1, 0))),
    [total],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(total - 1);
    else if (e.key === 'Escape') go(0);
    else return;
    e.preventDefault();
  };

  if (state === 'loading') {
    return (
      <div className={`${box} isp-tour--loading`} role="status" aria-live="polite">
        <div className="flex min-h-40 items-center justify-center p-4 text-center text-sm text-fg-subtle">Cargando tour…</div>
      </div>
    );
  }
  if (state === 'error' || !data) {
    return (
      <div className={`${box} isp-tour--error`} role="status">
        <div className="flex min-h-40 items-center justify-center p-4 text-center text-sm text-fg-subtle">No se pudo cargar el tour guiado.</div>
      </div>
    );
  }

  const step = steps[index];
  const spot = step.spot;
  const stageStyle: CSSProperties = {};
  if (step.width && step.height) stageStyle.aspectRatio = `${step.width} / ${step.height}`;
  const frameStyle: CSSProperties = {};
  if (reserve) frameStyle.aspectRatio = String(reserve);
  const rootStyle: CSSProperties = {};
  if (maxWidth) rootStyle.maxWidth = `min(100%, ${maxWidth}px)`;

  return (
    <div
      ref={rootRef}
      className={box}
      style={rootStyle}
      role="group"
      aria-roledescription="tour guiado"
      aria-label={data.title || 'Tour guiado'}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="w-full border-b border-line bg-figure" style={frameStyle}>
        <div className="relative w-full overflow-hidden" style={stageStyle}>
          <img
            key={step.image}
            className="pointer-events-none block h-auto w-full select-none"
            src={withBase(`/assets/${step.image}`)}
            alt={step.alt || step.title}
            width={step.width}
            height={step.height}
            decoding="async"
            draggable={false}
            data-nozoom
          />
          {spot ? (
            <div
              className="pointer-events-none absolute box-border rounded-lg border-2 border-accent-400 shadow-[0_0_0_100vmax_rgb(10_12_24/0.55),0_0_0_5px_rgb(56_189_248/0.3)] transition-[left,top,width,height] duration-300 motion-reduce:transition-none"
              aria-hidden="true"
              style={{ left: pct(spot.x), top: pct(spot.y), width: pct(spot.w), height: pct(spot.h) }}
            />
          ) : null}
        </div>
      </div>

      <div aria-hidden="true" className="h-1 bg-bg-mute">
        <div className="h-full rounded-r-full bg-linear-to-r from-brand-600 to-accent-400 transition-[width] duration-300" style={{ width: pct(((index + 1) / total) * 100) }} />
      </div>
      <div className="px-5 pt-4 pb-1.5 max-sm:px-4 max-sm:pt-3.5 max-sm:pb-1" aria-live="polite" aria-atomic="true">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-tint px-2.5 py-0.5 font-display text-[12px] font-bold text-brand">
            Paso {index + 1} de {total}
          </span>
          <span className="text-[12px] text-fg-subtle max-sm:hidden" aria-hidden="true">
            ← → para avanzar
          </span>
        </div>
        <p className="mt-1 mb-1 font-display text-[1.08rem] leading-[1.35] font-semibold tracking-[-0.015em] text-fg">{step.title}</p>
        <p className="m-0 text-[0.95rem] leading-[1.65] text-fg-muted [&_strong]:text-fg">{renderText(step.text)}</p>
        {step.link ? (
          <a className="mt-2.5 inline-flex items-center gap-1 text-[0.9rem] font-semibold text-brand underline decoration-brand/30 underline-offset-[3px] hover:decoration-brand" href={withBase(step.link.route)} target="_blank" rel="noopener noreferrer">
            {step.link.label}
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        ) : null}
      </div>

      <div className="flex justify-end gap-2.5 px-5 pt-3.5 pb-4.5 max-sm:px-4 max-sm:pt-3 max-sm:pb-4">
        <button type="button" className={`${btn} border-line bg-surface text-fg shadow-xs hover:enabled:border-brand/45 hover:enabled:text-brand`} onClick={() => go(index - 1)} disabled={index === 0}>
          Anterior
        </button>
        <button
          type="button"
          className={`${btn} border-brand-600 bg-brand-600 text-white shadow-[0_6px_18px_-6px_rgb(91_75_216/0.6)] hover:enabled:border-brand-700 hover:enabled:bg-brand-700`}
          onClick={() => go(index + 1)}
          disabled={index >= total - 1}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
