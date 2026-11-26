import type { ReactNode } from 'react';

/** Párrafo de entradilla (`.section-desc` del original): más grande, bajo el título. */
export default function Lead({ children }: { children?: ReactNode }) {
  return <p className="mt-3 mb-9 text-[1.14rem] leading-[1.65] text-pretty text-fg-muted max-sm:text-[1.05rem]">{children}</p>;
}
