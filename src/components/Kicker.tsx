import type { ReactNode } from 'react';

/** Etiqueta de sección sobre el título (`.section-kicker` del original), con el filete violeta → cian de la marca. */
export default function Kicker({ children }: { children?: ReactNode }) {
  return (
    <p className="mt-0 mb-3 inline-flex items-center gap-2.5 font-display text-[11.5px] font-bold tracking-[0.12em] text-brand uppercase before:h-0.5 before:w-5 before:shrink-0 before:rounded-full before:bg-linear-to-r before:from-brand-600 before:to-accent-400">
      {children}
    </p>
  );
}
