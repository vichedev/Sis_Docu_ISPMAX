/**
 * Motor de búsqueda del manual (sin dependencias: se usa en el navegador y en Node).
 *
 * Por qué existe: el buscador local de Rspress (FlexSearch) solo muestra resultados donde la frase escrita
 * aparece TAL CUAL en un título, encabezado o párrafo, y no conoce los sinónimos del frontmatter. Con preguntas
 * naturales ("¿cómo cobro a un cliente?") casi nunca devuelve algo. Este motor puntúa con BM25 sobre el título,
 * los encabezados, los sinónimos, la descripción y el texto de cada página, reduciendo las palabras a su raíz.
 * `src/search/hooks.mjs` lo conecta con el panel de búsqueda y `scripts/eval-search.mjs` lo mide con el banco
 * de preguntas.
 */

/** Normalización: minúsculas, sin tildes ni signos. */
export const fold = s =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const STOP = new Set(
  'a al algo ante con como cual cuando de del desde donde el ella ellos en es esta este esto la las le les lo los me mi mis muy ni no nos o para pero por que se si sin sobre su sus te tu tus un una uno unos y ya yo puedo puede hago hacer debo tengo hay ser son soy fue'.split(' '),
);

/** Reducción muy ligera a la raíz, suficiente para español. */
export const stem = w => {
  if (w.length <= 4) return w;
  return w
    .replace(/(mente|aciones|acion|adores|ador|ancias|ancia|ables|able|ibles|ible|ando|iendo|ados|adas|ado|ada|idos|idas|ido|ida|ares|ar|er|ir|es|os|as|s)$/, '')
    .replace(/(a|o|e)$/, '');
};

export const tokens = s =>
  fold(s)
    .split(' ')
    .filter(w => w && !STOP.has(w) && w.length > 1)
    .map(stem);

/**
 * Formato de `data` (lo genera `scripts/build-search-data.mjs`):
 * { N, avg, vocab: string[], df: number[], docs: [{ r, t, d, k, m, len, tf: [idTermino, frecuencia, …] }] }
 */
const preparados = new WeakMap();
function preparar(data) {
  let p = preparados.get(data);
  if (p) return p;
  const id = new Map(data.vocab.map((w, i) => [w, i]));
  const postings = data.vocab.map(() => []);
  data.docs.forEach((d, i) => {
    for (let j = 0; j < d.tf.length; j += 2) postings[d.tf[j]].push([i, d.tf[j + 1]]);
  });
  p = { id, postings };
  preparados.set(data, p);
  return p;
}

/**
 * Devuelve las páginas más relevantes para `query`: [{ doc, score }].
 * Un término que no está en el índice se trata como prefijo (para resultados mientras se escribe).
 */
export function buscar(data, query, { limit = 8 } = {}) {
  const { id, postings } = preparar(data);
  const pesos = new Map(); // idTermino → peso
  for (const t of tokens(query)) {
    if (id.has(t)) pesos.set(id.get(t), Math.max(pesos.get(id.get(t)) ?? 0, 1));
    else if (t.length >= 3) {
      let n = 0;
      for (let i = 0; i < data.vocab.length && n < 12; i++) {
        if (data.vocab[i].startsWith(t)) { pesos.set(i, Math.max(pesos.get(i) ?? 0, 0.6)); n++; }
      }
    }
  }
  const puntos = new Map();
  for (const [tid, peso] of pesos) {
    const df = data.df[tid];
    const idf = Math.log(1 + (data.N - df + 0.5) / (df + 0.5));
    for (const [di, f] of postings[tid]) {
      const len = data.docs[di].len;
      puntos.set(di, (puntos.get(di) ?? 0) + (peso * idf * f * 2.2) / (f + 1.2 * (1 - 0.75 + (0.75 * len) / data.avg)));
    }
  }
  return [...puntos]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([di, score]) => ({ doc: data.docs[di], score }));
}
