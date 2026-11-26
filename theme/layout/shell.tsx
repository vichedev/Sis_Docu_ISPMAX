import { useLocation } from '@rspress/core/runtime';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** Estado compartido del armazón: menú móvil y paleta de búsqueda (con una consulta inicial opcional). */
interface Shell {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  searchOpen: boolean;
  /** Consulta con la que se abrió la paleta (chips de la portada, página 404). */
  searchQuery: string;
  openSearch: (query?: string) => void;
  closeSearch: () => void;
}

const noop = () => {};
const ShellContext = createContext<Shell>({
  menuOpen: false,
  setMenuOpen: noop,
  searchOpen: false,
  searchQuery: '',
  openSearch: noop,
  closeSearch: noop,
});

export const useShell = () => useContext(ShellContext);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { pathname } = useLocation();

  // Al cambiar de página se cierran el menú móvil y la paleta.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Sin desplazamiento del fondo mientras hay una capa abierta.
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = before;
    };
  }, [menuOpen, searchOpen]);

  const openSearch = useCallback((query = '') => {
    setSearchQuery(query);
    setMenuOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const value = useMemo(
    () => ({ menuOpen, setMenuOpen, searchOpen, searchQuery, openSearch, closeSearch }),
    [menuOpen, searchOpen, searchQuery, openSearch, closeSearch],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
