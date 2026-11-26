import { useLocation, useNavigate, withBase } from '@rspress/core/runtime';
import { useEffect } from 'react';
// src/legacy-routes.json (o ISPMAX_LEGACY_ROUTES; alias en rspress.config.ts). El portal lo exporta con sus redirecciones.
import legacyRoutes from '@isp/legacy-routes';

const ROUTES = legacyRoutes as Record<string, string>;

/**
 * Compatibilidad con las URLs del manual antiguo.
 *
 * La versión HTML era una sola página con anclas (`/index.html#routers`).
 * Cualquier enlace guardado por los usuarios sigue funcionando: si llegamos a
 * la portada con un hash conocido, saltamos a la página equivalente.
 */
export default function LegacyHashRedirect() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const target = ROUTES[id];
    if (!target) return;

    // Solo redirigimos desde la portada o desde /index.html; dentro de una
    // página el hash sigue siendo un ancla legítima hacia un encabezado.
    const here = pathname.replace(/\/index\.html$/, '/');
    if (here !== withBase('/') && here !== '/') return;

    // El enrutador ya tiene la base del sitio como `basename`: la ruta va sin ella (con withBase se duplicaba
    // en sitios publicados bajo una subcarpeta: /manual/manual/guia/...).
    navigate(target, { replace: true });
  }, [pathname, hash, navigate]);

  return null;
}