#!/usr/bin/env node
/**
 * eval-questions — prueba el manual con el banco de preguntas (`user-questions.md`).
 *
 * Para cada variante de cada pregunta comprueba, usando solo el contenido del manual:
 *   1. BÚSQUEDA: la página indicada aparece entre los K primeros resultados de una búsqueda
 *      léxica (BM25 sobre título, encabezados, sinónimos, descripción y texto).
 *   2. RESPUESTA: la página contiene las frases clave de la columna "Esperado".
 *
 * Formato de fila en user-questions.md (una tabla por dominio):
 *   | ID | Intención | Rol | Página | Esperado | Variantes |
 *   | Q-CLI-001 | Ubicar dónde subir el contrato | soporte | /tareas/clientes/adjuntar-contrato | pestaña Documentos; Subir | ¿Dónde guardo el contrato de adhesión? ¶ cómo subo el contrato de un cliente |
 *
 *   - Esperado: frases separadas por `;` (se comparan sin tildes ni mayúsculas).
 *   - Variantes: separadas por `¶`; la primera es la formulación canónica.
 *   - Página: ruta del manual; puede ser `a | b` ... no: usar `a o b` para aceptar varias.
 *
 * Uso:
 *   node scripts/eval-questions.mjs              # informe + docs-validation.md + notes/_generated/eval.json
 *   node scripts/eval-questions.mjs --k 3        # tamaño del top-K (def. 3)
 *   node scripts/eval-questions.mjs --check 80   # falla si el % de variantes halladas en top-K < 80
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadPages, asList, fold, tokens } from './lib/manual.mjs';

const args = process.argv.slice(2);
const K = args.includes('--k') ? Number(args[args.indexOf('--k') + 1]) : 3;
const MIN = args.includes('--check') ? Number(args[args.indexOf('--check') + 1]) : null;

const file = path.join(ROOT, 'user-questions.md');
if (!existsSync(file)) {
  console.error('No existe user-questions.md');
  process.exit(2);
}

// ── banco de preguntas ────────────────────────────────────────────────
const bank = [];
for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
  if (!/^\|\s*Q-[A-Z]+-\d+/.test(line)) continue;
  const c = line.split('|').slice(1, -1).map(s => s.trim());
  const [id, intencion, rol, pagina, esperado, variantes] = c;
  bank.push({
    id,
    intencion,
    rol,
    paginas: pagina.split(/\s+o\s+/).map(s => s.replace(/[`\s]/g, '')).filter(Boolean),
    esperado: (esperado ?? '').split(';').map(s => s.trim()).filter(Boolean),
    variantes: (variantes ?? '').split('¶').map(s => s.trim()).filter(Boolean),
  });
}

// ── índice BM25 ───────────────────────────────────────────────────────
const pages = loadPages().filter(p => p.route !== '/');
const docs = pages.map(p => {
  const field = (text, w) => Array.from({ length: w }, () => tokens(text)).flat();
  const syn = [...asList(p.fm.sinonimos), ...String(p.fm.description ?? '').split(' ')].join(' ');
  const t = [
    ...field(String(p.title ?? ''), 4),
    ...field(p.headings.join(' '), 3),
    ...field(asList(p.fm.sinonimos).join(' '), 3),
    ...field(String(p.fm.description ?? ''), 2),
    ...tokens(p.text),
  ];
  return { page: p, t, len: t.length, tf: t.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map()) };
});
const N = docs.length;
const avg = docs.reduce((n, d) => n + d.len, 0) / Math.max(N, 1);
const df = new Map();
for (const d of docs) for (const w of d.tf.keys()) df.set(w, (df.get(w) ?? 0) + 1);

function search(q) {
  const qt = tokens(q);
  return docs
    .map(d => {
      let s = 0;
      for (const w of qt) {
        const f = d.tf.get(w) ?? 0;
        if (!f) continue;
        const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
        s += (idf * f * 2.2) / (f + 1.2 * (1 - 0.75 + (0.75 * d.len) / avg));
      }
      return { route: d.page.route, score: s };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ── evaluación ────────────────────────────────────────────────────────
const byRoute = new Map(pages.map(p => [p.route, p]));
const results = [];
for (const q of bank) {
  const targets = q.paginas.map(r => byRoute.get(r)).filter(Boolean);
  const missingPages = q.paginas.filter(r => !byRoute.has(r));
  const hay = targets.map(p => fold(p.text + ' ' + p.headings.join(' ') + ' ' + asList(p.fm.sinonimos).join(' ')));
  const faltan = q.esperado.filter(e => !hay.some(h => h.includes(fold(e))));
  const variants = q.variantes.map(v => {
    const r = search(v);
    const rank = r.findIndex(x => q.paginas.includes(x.route));
    return { texto: v, rank: rank === -1 ? null : rank + 1, top: r.slice(0, K).map(x => x.route) };
  });
  results.push({
    id: q.id,
    intencion: q.intencion,
    rol: q.rol,
    paginas: q.paginas,
    paginaExiste: missingPages.length === 0 && targets.length > 0,
    esperadoFaltante: faltan,
    respondida: missingPages.length === 0 && faltan.length === 0 && q.esperado.length > 0,
    variantes: variants,
  });
}

const totalVar = results.reduce((n, r) => n + r.variantes.length, 0);
const foundVar = results.reduce((n, r) => n + r.variantes.filter(v => v.rank && v.rank <= K).length, 0);
const top1 = results.reduce((n, r) => n + r.variantes.filter(v => v.rank === 1).length, 0);
const answered = results.filter(r => r.respondida).length;
const pctFound = totalVar ? Math.round((foundVar / totalVar) * 1000) / 10 : 0;

mkdirSync(path.join(ROOT, 'notes', '_generated'), { recursive: true });
writeFileSync(
  path.join(ROOT, 'notes', '_generated', 'eval.json'),
  JSON.stringify({ k: K, preguntas: results.length, variantes: totalVar, halladasTopK: foundVar, top1, respondidas: answered, results }, null, 2),
);

// ── docs-validation.md ────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
let md = `# Validación del manual con preguntas reales

> **Generado** por \`scripts/eval-questions.mjs\` el ${today}. Banco de origen: [user-questions.md](user-questions.md).
> Método: cada variante se busca en el propio manual (BM25 sobre título, encabezados, sinónimos, descripción y texto)
> y se comprueba que (1) la página esperada queda entre los ${K} primeros resultados y (2) esa página contiene las
> frases clave de la respuesta esperada. Una pregunta que falla indica documentación incompleta o difícil de encontrar.

| Métrica | Valor |
|---|---:|
| Preguntas (intenciones) | ${results.length} |
| Variantes de formulación | ${totalVar} |
| Variantes con la página correcta en el top-${K} | ${foundVar} (${pctFound} %) |
| Variantes con la página correcta en 1.º lugar | ${top1} |
| Preguntas cuya página contiene la respuesta esperada | ${answered} / ${results.length} |

## Resultados

| ID | Intención | Página esperada | Respondida | Hallada en top-${K} | Faltan frases |
|---|---|---|:---:|:---:|---|
`;
for (const r of results) {
  const ok = r.variantes.filter(v => v.rank && v.rank <= K).length;
  md += `| ${r.id} | ${r.intencion.slice(0, 70)} | ${r.paginas.join(' o ')}${r.paginaExiste ? '' : ' ⚠ no existe'} | ${r.respondida ? '✅' : '❌'} | ${ok}/${r.variantes.length} | ${r.esperadoFaltante.join('; ') || '—'} |\n`;
}
const bad = results.flatMap(r => r.variantes.filter(v => !(v.rank && v.rank <= K)).map(v => ({ r, v })));
if (bad.length) {
  md += `\n## Variantes que no encuentran la página\n\n| ID | Formulación | Posición | Top-${K} devuelto |\n|---|---|---|---|\n`;
  for (const { r, v } of bad.slice(0, 300)) md += `| ${r.id} | ${v.texto.replace(/\|/g, '/')} | ${v.rank ?? '—'} | ${v.top.join(', ') || '—'} |\n`;
}
writeFileSync(path.join(ROOT, 'docs-validation.md'), md);

console.log(`Preguntas: ${results.length} · variantes: ${totalVar} · en top-${K}: ${foundVar} (${pctFound} %) · 1.º: ${top1} · respondidas: ${answered}/${results.length}`);
if (MIN !== null && pctFound < MIN) {
  console.error(`Búsqueda: ${pctFound} % < mínimo ${MIN} %`);
  process.exit(1);
}
