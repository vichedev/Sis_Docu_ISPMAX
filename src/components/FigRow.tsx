import type { ReactNode } from 'react';

/** Fila de figuras que comparten línea (`.fig-row` del original). */
export default function FigRow({ children }: { children?: ReactNode }) {
  return (
    <div className="my-8 flex flex-wrap items-start gap-5.5 max-sm:gap-4 [&>figure]:m-0 [&>figure]:flex-[0_1_auto] max-sm:[&>figure]:max-w-full max-sm:[&>figure]:basis-full">
      {children}
    </div>
  );
}