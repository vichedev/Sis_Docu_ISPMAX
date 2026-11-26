/**
 * Tema propio del Manual ISPMAX (Rspress 2 + Tailwind CSS v4).
 *
 * Rspress resuelve `@rspress/core/theme` primero en esta carpeta (`themeDir` en rspress.config.ts) y después en su
 * tema de serie, pero por carpeta, no por exportación: por eso se reexporta todo el tema original y se sustituye
 * solo lo propio. Una exportación explícita gana a la del `export *`.
 *
 *   Layout                 armazón completo (barra superior, menú lateral, documento, índice, pie, buscador)
 *   Callout                avisos `:::tip|info|warning|danger|details` del MDX y el componente <Callout>
 *   Badge                  etiquetas <Badge type="…">
 *   getCustomMDXComponent  elementos del MDX (h1-h4, p, listas, tablas, citas, código, enlaces, imágenes)
 *
 * Lo que no se sustituye (Link, CodeBlock, hooks como useThemeState o usePrevNextPage) sigue viniendo de Rspress.
 */
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/sora/wght.css';

export * from '@rspress/core/theme-original';

export { Layout } from './layout/Layout';
export { Badge } from './mdx/Badge';
export { Callout } from './mdx/Callout';
export { getCustomMDXComponent } from './mdx';
