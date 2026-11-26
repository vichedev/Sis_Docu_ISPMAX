/**
 * Sustituto de `@isp/legacy-routes` (alias de Vite): redirecciones del manual antiguo (id de ancla → ruta). Las manda
 * el servidor con los datos del sitio (src/legacy-routes.json de la BD + tabla `redirects`).
 */
import { __getSiteData } from './runtime';

const routes: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_t, k: string) => ((__getSiteData() as unknown as { legacyRoutes?: Record<string, string> }).legacyRoutes ?? {})[k],
});
export default routes;
