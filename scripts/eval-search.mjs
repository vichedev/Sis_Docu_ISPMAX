#!/usr/bin/env node
/**
 * eval-search — prueba el BUSCADOR DEL SITIO con el banco de preguntas (`user-questions.md`).
 *
 * El sitio muestra los resultados de `src/search/engine.mjs` (BM25 con sinónimos y raíces; ver
 * `src/search/hooks.mjs`). Este script ejecuta ese mismo motor sobre `src/search/data.json` y mide en qué
 * posición queda la página esperada. A diferencia de `eval-questions.mjs`, que evalúa el contenido con su propio
 * BM25, aquí se usa exactamente el código que corre en el navegador.
 *
 * Con `--defecto` mide además el buscador de serie de Rspress (FlexSearch sobre `dist/static/search_index.*.json`,
 * con límite de 7 resultados por campo, como en el panel). Sirve de referencia: ese buscador solo muestra
 * páginas donde la frase aparece literal, así que su cifra es una cota superior de lo que vería la persona usuaria.
 *
 *   node scripts/build-search-data.mjs && node scripts/eval-search.mjs
 *   node scripts/eval-search.mjs --k 5 --check 90   # falla si el % de variantes en el top-K es < 90
 *   node scripts/eval-search.mjs --lista            # muestra las variantes que quedan fuera del top-K
 *   node scripts/eval-search.mjs --defecto          # añade el buscador de serie de Rspress (requiere `npm run build`)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, SEARCH_DATA, DIST } from './lib/manual.mjs';
import { buscar } from '../src/search/engine.mjs';

const args = process.argv.slice(2);
const K = args.includes('--k') ? Number(args[args.indexOf('--k') + 1]) : 5;
const MIN = args.includes('--check') ? Number(args[args.indexOf('--check') + 1]) : null;
const LISTA = args.includes('--lista');

// ── banco de preguntas (mismo formato que eval-questions) ──────────────
const bank = [];
for (const line of readFileSync(path.join(ROOT, 'user-questions.md'), 'utf8').split(/\r?\n/)) {
  if (!/^\|\s*Q-[A-Z]+-\d+/.test(line)) continue;
  const c = line.split('|').slice(1, -1).map(s => s.trim());
  const [id, , , pagina, , variantes] = c;
  bank.push({
    id,
    paginas: pagina.split(/\s+o\s+/).map(s => s.replace(/[`\s]/g, '').replace(/\/$/, '')).filter(Boolean),
    variantes: (variantes ?? '').split('¶').map(s => s.trim()).filter(Boolean),
  });
}

function medir(nombre, buscarRutas) {
  let total = 0, top1 = 0, top3 = 0, topK = 0, ninguno = 0;
  const fallos = [];
  for (const q of bank) {
    for (const v of q.variantes) {
      total++;
      const rutas = buscarRutas(v);
      if (!rutas.length) ninguno++;
      const pos = rutas.findIndex(x => q.paginas.includes(x));
      if (pos === 0) top1++;
      if (pos !== -1 && pos < 3) top3++;
      if (pos !== -1 && pos < K) topK++;
      else fallos.push({ id: q.id, texto: v, pos: pos === -1 ? null : pos + 1, hallados: rutas.length, esperado: q.paginas.join(' o ') });
    }
  }
  const pct = n => ((n / Math.max(total, 1)) * 100).toFixed(1);
  console.log(`${nombre} · preguntas ${bank.length} · variantes ${total} · 1.º ${pct(top1)} % · top-3 ${pct(top3)} % · top-${K} ${topK} (${pct(topK)} %) · sin resultados ${pct(ninguno)} %`);
  if (LISTA) for (const f of fallos.slice(0, 60)) console.log(`  ${f.id} | «${f.texto}» | pos ${f.pos ?? '—'} de ${f.hallados} | esperado ${f.esperado}`);
  return Number(pct(topK));
}

// ── buscador del sitio ─────────────────────────────────────────────
const dataFile = SEARCH_DATA; // src/search/data.json o ISPMAX_SEARCH_DATA
if (!existsSync(dataFile)) {
  console.error(`Falta ${path.relative(ROOT, dataFile)}: ejecuta \`node scripts/build-search-data.mjs\`.`);
  process.exit(2);
}
const data = JSON.parse(readFileSync(dataFile, 'utf8'));
const pctSitio = medir('Buscador del sitio', v => buscar(data, v, { limit: 20 }).map(r => r.doc.r.replace(/\/$/, '') || '/'));

// ── referencia: buscador de serie de Rspress ─────────────────────────────
if (args.includes('--defecto')) {
  const { Document } = createRequire(import.meta.url)('flexsearch');
  const staticDir = path.join(DIST, 'static'); // dist/ o ISPMAX_DIST_DIR
  const idxFile = existsSync(staticDir) ? readdirSync(staticDir).find(f => /^search_index\..*\.json$/.test(f)) : null;
  if (!idxFile) {
    console.error('No hay índice de Rspress: ejecuta `npm run build` antes.');
    process.exit(2);
  }
  const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const index = new Document({
    tokenize: 'full',
    document: { id: 'id', store: true, index: ['normalizedTitle', 'headers', 'normalizedContent'] },
    cache: 100,
  });
  for (const p of JSON.parse(readFileSync(path.join(staticDir, idxFile), 'utf8'))) {
    index.add(p.routePath, {
      id: p.routePath,
      normalizedContent: norm(p.content),
      headers: p.toc.map(h => norm(h.text)).join(' '),
      normalizedTitle: norm(p.title),
    });
  }
  medir('Buscador de serie de Rspress (cota superior)', v => {
    const vistos = new Set();
    const salida = [];
    for (const campo of index.search(v, { limit: 7, index: ['normalizedTitle', 'headers', 'normalizedContent'], enrich: true }))
      for (const r of campo.result) {
        const id = String(r.id).replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/';
        if (!vistos.has(id)) { vistos.add(id); salida.push(id); }
      }
    return salida;
  });
}

if (MIN != null && pctSitio < MIN) {
  console.error(`Por debajo del mínimo (${MIN} %).`);
  process.exit(1);
}
