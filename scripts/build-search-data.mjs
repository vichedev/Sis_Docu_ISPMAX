#!/usr/bin/env node
/**
 * Genera `src/search/data.json`, el índice que usa el buscador del sitio (`src/search/engine.mjs`).
 * Pesos por campo: título ×4, encabezados ×3, sinónimos ×3, descripción ×2, texto ×1 (los mismos que
 * `eval-questions.mjs`). Se ejecuta antes de `rspress dev` y `rspress build` (ver `package.json`).
 * El archivo no se versiona.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, SEARCH_DATA, loadPages, asList } from './lib/manual.mjs';
import { tokens } from '../src/search/engine.mjs';

const pages = loadPages().filter(p => p.route !== '/' && p.title);
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
const data = {
  N: docs.length,
  avg: docs.reduce((n, d) => n + d.len, 0) / Math.max(docs.length, 1),
  vocab: [...vocab.keys()],
  df,
  docs,
};
const out = SEARCH_DATA; // src/search/data.json o ISPMAX_SEARCH_DATA
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data));
console.log(`[búsqueda] ${docs.length} páginas, ${vocab.size} términos → ${path.relative(ROOT, out)} (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
