/**
 * Índice del buscador del sitio (`src/search/engine.mjs`): lógica ÚNICA de scripts/build-search-data.mjs (build
 * estático, desde docs/) y de portal/site/search.mjs (manual dinámico, desde la BD).
 * Pesos por campo: título ×4, encabezados ×3, sinónimos ×3, descripción ×2, texto ×1 (los de `eval-questions.mjs`).
 */
import { asList, bodyText, bodyHeadings, parseFrontmatter } from './manual.mjs';
import { tokens } from '../../src/search/engine.mjs';

/** Texto completo de una página (.mdx con frontmatter) → lo que necesita el índice (como `loadPages`). */
export function searchPageFromSource(route, source) {
  const { data, body } = parseFrontmatter(source);
  return { route, fm: data, title: data.title, text: bodyText(body), headings: bodyHeadings(body) };
}

/** pages: [{ route, title, fm, text, headings }] → índice (sin la portada `/` ni páginas sin título; en el orden recibido). */
export function buildSearchIndex(pagesIn) {
  const pages = pagesIn.filter(p => p.route !== '/' && p.title);
  const vocab = new Map();
  const idDe = w => {
    if (!vocab.has(w)) vocab.set(w, vocab.size);
    return vocab.get(w);
  };
  const campo = (texto, peso) => Array.from({ length: peso }, () => tokens(texto)).flat();
  const docs = pages.map(p => {
    const lista = [
      ...campo(String(p.title ?? ''), 4),
      ...campo(p.headings.join(' '), 3),
      ...campo(asList(p.fm.sinonimos).join(' '), 3),
      ...campo(String(p.fm.description ?? ''), 2),
      ...tokens(p.text),
    ];
    const tf = new Map();
    for (const w of lista) tf.set(idDe(w), (tf.get(idDe(w)) ?? 0) + 1);
    return {
      r: p.route,
      t: String(p.title),
      d: String(p.fm.description ?? '').slice(0, 170),
      k: String(p.fm.tipo ?? ''),
      m: String(p.fm.modulo ?? ''),
      len: lista.length,
      tf: [...tf].flat(),
    };
  });
  const df = Array.from({ length: vocab.size }, () => 0);
  for (const d of docs) for (let i = 0; i < d.tf.length; i += 2) df[d.tf[i]]++;
  return { N: docs.length, avg: docs.reduce((n, d) => n + d.len, 0) / Math.max(docs.length, 1), vocab: [...vocab.keys()], df, docs };
}
