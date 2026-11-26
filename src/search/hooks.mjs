/**
 * Buscador del sitio: une el motor (`engine.mjs`, BM25 con sinónimos, raíces y prefijos) con su índice
 * (`@isp/search-data` = src/search/data.json o ISPMAX_SEARCH_DATA; lo genera scripts/build-search-data.mjs).
 *
 *   resultados(query, limit)  → [{ ruta, titulo, descripcion, tipo, modulo }]  — lo usa la paleta Ctrl+K del tema
 *                                (theme/components/SearchPalette.tsx). El índice se descarga al primer uso.
 *   afterSearch(query, res)   → gancho `search.searchHooks` del buscador de serie de Rspress (rspress.config.ts);
 *                                el tema propio no lo muestra, pero se conserva por compatibilidad.
 *
 * `scripts/eval-search.mjs` mide el mismo motor con el banco de preguntas.
 */
import { buscar, tokens } from './engine.mjs';

export const TIPOS = {
  tarea: 'Tarea',
  guia: 'Guía',
  problema: 'Problema',
  faq: 'Preguntas frecuentes',
  referencia: 'Referencia',
  concepto: 'Concepto',
  indice: 'Índice',
};

let datos;
/** Descarga (una vez) el índice del buscador. */
export const cargarIndice = () => (datos ??= import('@isp/search-data').then(m => m.default ?? m));

export async function resultados(query, limit = 8) {
  if (!tokens(query).length) return [];
  const encontrados = buscar(await cargarIndice(), query, { limit });
  return encontrados.map(({ doc }) => ({
    ruta: doc.r,
    titulo: doc.t,
    descripcion: doc.d,
    tipo: TIPOS[doc.k] ?? '',
    modulo: doc.m,
  }));
}

export async function afterSearch(query, searchResult) {
  try {
    const encontrados = await resultados(query, 8);
    if (!encontrados.length) return;
    const result = [];
    for (const r of encontrados) {
      result.push({
        type: 'title',
        title: r.titulo,
        header: r.tipo ? `${r.tipo} · ${r.titulo}` : r.titulo,
        link: r.ruta,
        query,
        highlightInfoList: [],
      });
      if (r.descripcion) {
        result.push({ type: 'content', title: r.titulo, header: r.titulo, link: r.ruta, query, statement: r.descripcion, highlightInfoList: [] });
      }
    }
    searchResult.splice(0, searchResult.length, { group: searchResult[0]?.group ?? 'default', renderType: 'default', result });
  } catch {
    /* se conserva el resultado de serie */
  }
}
