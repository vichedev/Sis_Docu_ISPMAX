// Índice del buscador DESDE LA BD: la lógica es la de scripts/lib/search-core.mjs (la misma que usa
// scripts/build-search-data.mjs en el build estático). El motor (src/search/engine.mjs) no cambia.
import { buildSearchIndex as buildCore, searchPageFromSource } from '../../scripts/lib/search-core.mjs';

/** docs: [{ route, source }] (source = .mdx completo, como el exportado), en orden de ruta. */
export function buildSearchIndex(docsIn) {
  const pages = docsIn.map(({ route, source }) => searchPageFromSource(route, source)).sort((a, b) => (a.route < b.route ? -1 : 1));
  return buildCore(pages);
}
