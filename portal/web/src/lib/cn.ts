import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/* tailwind-merge debe conocer los tokens propios para no fusionar clases distintas. */
const twMerge = extendTailwindMerge({
  extend: { theme: { shadow: ['pop'] } },
});

/** Une clases condicionales y resuelve conflictos de Tailwind (la última gana). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
