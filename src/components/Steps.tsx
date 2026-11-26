import type { ReactNode } from 'react';

/**
 * Lista de pasos numerada. Reproduce `.steps` del manual original sin exigir encabezados (nuestros pasos son
 * párrafos con capturas). La numeración es un contador CSS (`isp-step`) que incrementa cada `<Step>`; la línea que
 * une los números es un degradado de la marca que se apaga hacia el final.
 */
export default function Steps({ children }: { children?: ReactNode }) {
  return (
    <div className="relative my-9 ml-4 pl-9 [counter-reset:isp-step] before:absolute before:top-4 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-linear-to-b before:from-brand-500/70 before:via-brand-500/25 before:to-line max-sm:ml-3.5 max-sm:pl-7 print:before:bg-line">
      {children}
    </div>
  );
}
