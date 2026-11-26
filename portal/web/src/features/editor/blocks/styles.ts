/*
 * Tipografía del lienzo, aproximada a la del manual publicado (styles/index.css de la raíz):
 * cuerpo 15,5 px / 1,75, títulos con tracking negativo, h2 con filete superior, pasos con círculo violeta,
 * figuras con marco, tarjetas, antetítulo en versalitas violeta y entradilla. Solo tokens del portal.
 */
import type { CalloutKind } from '@/lib/blocks/index.ts';

export const S = {
  doc: 'text-[15.5px] leading-[1.75] text-ink-2 max-sm:text-[15px]',
  p: 'text-ink-2',
  h: {
    1: 'text-[2rem] font-bold leading-tight tracking-[-0.022em] text-ink',
    2: 'border-t border-line pt-6 text-[1.5rem] font-semibold leading-snug tracking-[-0.022em] text-ink',
    3: 'text-[1.18rem] font-semibold leading-snug tracking-[-0.018em] text-ink',
    4: 'text-[1.02rem] font-semibold leading-snug text-ink',
    5: 'text-[0.95rem] font-semibold text-ink',
    6: 'text-[0.9rem] font-semibold text-ink-2',
  } as Record<number, string>,
  /** Espacio sobre cada título (el manual separa mucho las secciones). */
  hGap: { 1: 'mt-2', 2: 'mt-6', 3: 'mt-3', 4: 'mt-2', 5: 'mt-1', 6: 'mt-1' } as Record<number, string>,
  kicker: 'text-[11.5px] font-bold uppercase tracking-[0.11em] text-accent-ink',
  lead: 'text-[1.08rem] leading-[1.7] text-ink-2',
  list: 'pl-6 marker:text-ink-3',
  code: 'overflow-x-auto rounded-lg border border-line bg-subtle px-4 py-3 font-mono text-[13px] leading-[1.6] text-ink',
  figureFrame: 'overflow-hidden rounded-lg border border-line bg-subtle shadow-[0_1px_2px_rgb(20_20_30/0.06)]',
  caption: 'mt-2 text-center text-[13.5px] text-ink-3',
  stepNum: 'absolute -left-[1.9rem] top-0.5 grid size-[30px] -translate-x-1/2 place-items-center rounded-full bg-accent text-[0.85rem] font-semibold text-accent-fg outline-4 outline-bg max-sm:-left-6 max-sm:size-[26px]',
  steps: 'ml-[0.85rem] border-l-2 border-line pl-[1.9rem] max-sm:ml-3 max-sm:pl-6',
  card: 'flex min-w-0 flex-col rounded-lg border border-line bg-bg px-[1.15rem] py-4 shadow-[0_1px_2px_rgb(20_20_30/0.05)]',
  cardTitle: 'text-[1rem] font-semibold tracking-[-0.01em] text-ink',
  cardBody: 'text-[14px] leading-[1.65] text-ink-2',
  table: 'w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-line text-[14px]',
  th: 'border-b border-line bg-subtle px-3 py-2 text-left align-top font-semibold text-ink',
  td: 'border-b border-line px-3 py-2 align-top text-ink-2',
};

/** Aviso `:::tipo`: barra lateral y fondo suave por tipo, como los del manual. */
export const CALLOUT_STYLE: Record<CalloutKind, { box: string; title: string }> = {
  tip: { box: 'border-l-accent bg-accent-soft/60', title: 'text-accent-ink' },
  note: { box: 'border-l-accent bg-accent-soft/60', title: 'text-accent-ink' },
  info: { box: 'border-l-ink-4 bg-subtle', title: 'text-ink' },
  warning: { box: 'border-l-warn-dot bg-warn-soft', title: 'text-warn' },
  caution: { box: 'border-l-warn-dot bg-warn-soft', title: 'text-warn' },
  danger: { box: 'border-l-danger bg-danger-soft', title: 'text-danger' },
  details: { box: 'border-l-line-strong bg-subtle', title: 'text-ink' },
};

export const CALLOUT_KINDS: { value: CalloutKind; label: string }[] = [
  { value: 'tip', label: 'Nota' },
  { value: 'info', label: 'Información' },
  { value: 'warning', label: 'Importante' },
  { value: 'danger', label: 'Advertencia' },
  { value: 'details', label: 'Pregunta desplegable' },
  { value: 'note', label: 'Nota (note)' },
  { value: 'caution', label: 'Precaución' },
];
