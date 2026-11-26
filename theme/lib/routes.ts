import { usePages } from '@rspress/core/runtime';
import { useMemo } from 'react';

/** ¿Existe una página con esta ruta? (con o sin barra final). Para no enlazar nunca a páginas que no están. */
export function useRouteExists() {
  const { pages } = usePages();
  const routes = useMemo(() => new Set(pages.map(p => p.routePath.replace(/\.html$/, '').replace(/\/$/, '') || '/')), [pages]);
  return (route: string) => routes.has(route.replace(/\.html$/, '').replace(/\/$/, '') || '/');
}

/** Enlace de un elemento del menú superior; para un desplegable ("Referencia"), su índice /referencia/ si existe. */
export function useNavLink() {
  const exists = useRouteExists();
  return (item: { link?: string; items?: { link?: string }[] }) =>
    item.link ?? (exists('/referencia/') ? '/referencia/' : item.items?.[0]?.link);
}

/** Ruta comparable: sin .html, sin /index y sin barra final ("/tareas/index.html" → "/tareas"). */
export const normRoute = (r = '') => r.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/';
