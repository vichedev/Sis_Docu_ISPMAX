import type { ReactNode } from 'react';

/** Rejilla de figuras a dos columnas (`.fig-grid` del original). */
export default function FigGrid({ children }: { children?: ReactNode }) {
  return <div className="my-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-start gap-5.5 [&>figure]:m-0 [&>figure]:max-w-full">{children}</div>;
}