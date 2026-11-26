/* Miniaturas de la paleta: un dibujo esquemático de cómo se ve cada bloque en el manual (solo tokens; decorativas). */
import type { ReactNode } from 'react';
import { Image } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CalloutKind } from '@/lib/blocks/index.ts';
import { CALLOUT_STYLE } from '../blocks/styles';

const L = ({ w, className }: { w: string; className?: string }) => <span className={cn('block h-[3px] shrink-0 rounded-full bg-line-strong', className)} style={{ width: w }} />;
const Pic = ({ className, children }: { className?: string; children?: ReactNode }) => (
  <span className={cn('relative grid place-items-center overflow-hidden rounded-[3px] border border-line-strong bg-subtle text-ink-4', className)}>{children ?? <Image size={12} strokeWidth={1.75} />}</span>
);
const Col = ({ children, className }: { children: ReactNode; className?: string }) => <span className={cn('flex w-full flex-col gap-[5px]', className)}>{children}</span>;

function Callout({ kind }: { kind: CalloutKind }) {
  const st = CALLOUT_STYLE[kind];
  return (
    <span className={cn('flex w-full flex-col gap-[5px] rounded-[3px] border-l-[3px] px-2 py-1.5', st.box)}>
      <span className={cn('text-[9px] font-semibold leading-none', st.title)}>{kind === 'details' ? '▸ Pregunta' : kind === 'warning' ? 'Importante' : kind === 'danger' ? 'Advertencia' : kind === 'info' ? 'Información' : 'Nota'}</span>
      <L w="85%" /><L w="60%" />
    </span>
  );
}

const DRAW: Record<string, () => ReactNode> = {
  heading2: () => <Col><span className="block h-px w-full bg-line" /><span className="block h-[7px] w-[70%] rounded-[2px] bg-ink" /><L w="90%" /><L w="65%" /></Col>,
  heading3: () => <Col><span className="block h-[6px] w-[50%] rounded-[2px] bg-ink-2" /><L w="92%" /><L w="70%" /></Col>,
  paragraph: () => <Col><L w="96%" /><L w="88%" /><L w="94%" /><L w="55%" /></Col>,
  list: () => <Col>{['80%', '64%', '72%'].map((w, i) => <span key={i} className="flex items-center gap-1.5"><span className="size-[4px] rounded-full bg-ink-3" /><L w={w} /></span>)}</Col>,
  olist: () => <Col>{['78%', '62%', '70%'].map((w, i) => <span key={i} className="flex items-center gap-1"><span className="w-2 text-[8px] font-semibold leading-none text-ink-3">{i + 1}.</span><L w={w} /></span>)}</Col>,
  lead: () => <Col><span className="block h-[5px] w-[92%] rounded-full bg-ink-3" /><span className="block h-[5px] w-[70%] rounded-full bg-ink-3" /></Col>,
  kicker: () => <Col><span className="block h-[3px] w-[38%] rounded-full bg-accent" /><span className="block h-[7px] w-[72%] rounded-[2px] bg-ink" /></Col>,
  image: () => <Col className="items-center"><Pic className="h-[30px] w-[78%]" /><L w="44%" /></Col>,
  imageRow: () => <span className="flex w-full items-start gap-1"><Pic className="h-[30px] flex-1" /><Pic className="h-[30px] flex-1" /><Pic className="h-[30px] flex-1" /></span>,
  imageGrid: () => <span className="grid w-[82%] grid-cols-2 gap-1"><Pic className="h-[16px]" /><Pic className="h-[16px]" /><Pic className="h-[16px]" /><Pic className="h-[16px]" /></span>,
  tour: () => (
    <Col className="items-center">
      <Pic className="h-[30px] w-[82%]">
        <span className="absolute inset-0 bg-[rgb(10_14_24/0.35)]" />
        <span className="absolute left-[30%] top-[25%] h-[45%] w-[34%] rounded-[2px] border-[1.5px] border-signal bg-subtle" />
      </Pic>
      <span className="flex w-[82%] items-center justify-between"><span className="text-[8px] font-semibold leading-none text-accent-ink">Paso 1 de 3</span><span className="flex gap-0.5"><span className="h-[3px] w-2 rounded-full bg-accent" /><span className="size-[3px] rounded-full bg-line-strong" /><span className="size-[3px] rounded-full bg-line-strong" /></span></span>
    </Col>
  ),
  steps: () => (
    <span className="flex w-full flex-col gap-1 border-l-2 border-line pl-2.5">
      {['74%', '60%'].map((w, i) => <span key={i} className="relative flex flex-col gap-[3px]"><span className="absolute -left-[15px] top-[-1px] grid size-[9px] place-items-center rounded-full bg-accent text-[6px] font-bold leading-none text-accent-fg">{i + 1}</span><L w={w} /><L w="40%" /></span>)}
    </span>
  ),
  cards: () => <span className="grid w-full grid-cols-2 gap-1.5">{[0, 1].map((i) => <span key={i} className="flex flex-col gap-[4px] rounded-[3px] border border-line-strong bg-bg p-1.5"><span className="block h-[4px] w-[70%] rounded-[2px] bg-ink-2" /><L w="90%" /><L w="60%" /></span>)}</span>,
  table: () => (
    <span className="grid w-full grid-cols-3 overflow-hidden rounded-[3px] border border-line-strong">
      {Array.from({ length: 9 }, (_, i) => <span key={i} className={cn('h-[10px] border-b border-r border-line', i < 3 && 'bg-subtle', i % 3 === 2 && 'border-r-0', i >= 6 && 'border-b-0')} />)}
    </span>
  ),
  divider: () => <Col className="justify-center"><L w="70%" /><span className="my-1 block h-px w-full bg-ink-3" /><L w="55%" /></Col>,
  warning: () => <Callout kind="warning" />,
  tip: () => <Callout kind="tip" />,
  info: () => <Callout kind="info" />,
  danger: () => <Callout kind="danger" />,
  details: () => <Callout kind="details" />,
  code: () => <span className="flex w-full flex-col gap-[4px] rounded-[3px] border border-line bg-subtle px-2 py-1.5 font-mono"><L w="52%" className="bg-accent-line" /><L w="78%" className="bg-ink-4" /><L w="40%" className="bg-ink-4" /></span>,
  searchTerms: () => <span className="flex w-full flex-wrap gap-1">{['cortar', 'suspender', 'baja'].map((t) => <span key={t} className="rounded-sm border border-line-strong bg-bg px-1 text-[8px] leading-[12px] text-ink-3">{t}</span>)}</span>,
  raw: () => <span className="font-mono text-[11px] font-semibold text-ink-3">{'</>'}</span>,
};

export function PaletteThumb({ id }: { id: string }) {
  return (
    <span aria-hidden="true" className="flex h-[52px] w-full items-center justify-center overflow-hidden rounded-md border border-line bg-bg px-2.5 py-2">
      {DRAW[id]?.() ?? null}
    </span>
  );
}
