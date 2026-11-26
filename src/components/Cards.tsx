import type { ReactNode } from 'react';

export interface CardsProps {
  children?: ReactNode;
  /** Columnas en escritorio (1, 2 o 3). En móvil siempre es 1. */
  columns?: number;
}

/** Columnas por ancho: < 640 px una; 640-960 px como mucho dos; > 960 px las pedidas. */
const COLS: Record<number, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 min-[960px]:grid-cols-3',
};

/** Rejilla de tarjetas — equivale a `.grid-2` / `.grid-3` del manual original. */
export default function Cards({ children, columns = 3 }: CardsProps) {
  return <div className={`my-8 grid grid-cols-1 gap-4 ${COLS[columns] ?? COLS[3]}`}>{children}</div>;
}
