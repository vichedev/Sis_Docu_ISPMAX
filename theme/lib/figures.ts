import { createContext, useContext } from 'react';

/**
 * Orden de las figuras dentro del documento que se está pintando. `DocContent` crea un contador nuevo en cada render
 * de la página; la primera `<Figure>` (casi siempre el LCP) se carga con prioridad y sin `lazy`, las demás en diferido.
 * El orden de render es el mismo en el HTML estático y en el navegador: no hay diferencias de hidratación.
 */
export const FigureCounter = createContext<{ n: number }>({ n: 0 });

/** ¿Es esta la primera figura del documento? (incrementa el contador: llamar una sola vez por figura). */
export function useIsFirstFigure() {
  const counter = useContext(FigureCounter);
  counter.n += 1;
  return counter.n === 1;
}
