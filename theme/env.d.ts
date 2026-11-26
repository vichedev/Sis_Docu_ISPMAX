// Declaraciones para TypeScript (solo editor; el build no comprueba tipos).
declare module '*.css';

/** Índice del buscador generado por scripts/build-search-data.mjs (alias en rspress.config.ts). */
declare module '@isp/search-data' {
  const data: unknown;
  export default data;
}

/** Redirecciones del manual antiguo: id de ancla → ruta (alias en rspress.config.ts). */
declare module '@isp/legacy-routes' {
  const routes: Record<string, string>;
  export default routes;
}
