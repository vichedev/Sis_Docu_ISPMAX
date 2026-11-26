/**
 * Sustituto de `@isp/search-data` (alias de Vite). `src/search/hooks.mjs` lo importa de forma diferida
 * (`import('@isp/search-data')`) al abrir la paleta: aquí se descarga el índice que el servidor genera desde la BD
 * (mismo formato que scripts/build-search-data.mjs). La URL lleva la versión del índice: caché inmutable.
 */
import { __getSiteData, withBase } from './runtime';

const site = __getSiteData() as unknown as { searchIndex?: string };
const url = withBase(site.searchIndex || '/_site/search.json');
const data = await fetch(url, { credentials: 'same-origin' }).then(r => {
  if (!r.ok) throw new Error(`Índice del buscador: HTTP ${r.status}`);
  return r.json();
});
export default data;
