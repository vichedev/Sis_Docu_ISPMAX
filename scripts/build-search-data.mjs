#!/usr/bin/env node
/**
 * Genera `src/search/data.json`, el índice que usa el buscador del sitio (`src/search/engine.mjs`).
 * Pesos por campo: título ×4, encabezados ×3, sinónimos ×3, descripción ×2, texto ×1 (los mismos que
 * `eval-questions.mjs`). Se ejecuta antes de `rspress dev` y `rspress build` (ver `package.json`).
 * El archivo no se versiona. La lógica vive en scripts/lib/search-core.mjs (la misma del manual dinámico del portal).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, SEARCH_DATA, loadPages } from './lib/manual.mjs';
import { buildSearchIndex } from './lib/search-core.mjs';

const data = buildSearchIndex(loadPages());
const out = SEARCH_DATA; // src/search/data.json o ISPMAX_SEARCH_DATA
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data));
console.log(`[búsqueda] ${data.docs.length} páginas, ${data.vocab.length} términos → ${path.relative(ROOT, out)} (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
