#!/usr/bin/env node
/**
 * docs-coverage — matriz funcionalidad ↔ documentación y métricas del manual.
 *
 *   node scripts/docs-coverage.mjs            # escribe docs-coverage.md y notes/_generated/metrics.json
 *   node scripts/docs-coverage.mjs --check    # además falla (exit 1) si la cobertura baja de --min (def. 0)
 *   node scripts/docs-coverage.mjs --min 60
 *
 * Entradas:
 *   - notes/_generated/inventory.json   (scripts/build-inventory.mjs)
 *   - frontmatter de cada página: `funcionalidades: [ID,…]`, `estado`, `verificado`, `tipo`, `modulo`
 *   - user-questions.md (bloque de preguntas; ver scripts/eval-questions.mjs) si existe
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadPages, asList } from './lib/manual.mjs';

const args = process.argv.slice(2);
const min = args.includes('--min') ? Number(args[args.indexOf('--min') + 1]) : 0;

const invFile = path.join(ROOT, 'notes', '_generated', 'inventory.json');
if (!existsSync(invFile)) {
  console.error('Falta notes/_generated/inventory.json: ejecute primero scripts/build-inventory.mjs');
  process.exit(2);
}
const allFeatures = JSON.parse(readFileSync(invFile, 'utf8'));
const pages = loadPages();

// Funcionalidades excluidas por decisión (notes/exclusiones.md): se muestran aparte y no cuentan en el denominador.
const exclFile = path.join(ROOT, 'notes', 'exclusiones.md');
const excluded = new Map();
if (existsSync(exclFile)) {
  for (const line of readFileSync(exclFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\|\s*([A-Z]{2,4}-\d{3})\s*\|\s*(.+?)\s*\|\s*$/);
    if (m) excluded.set(m[1], m[2]);
  }
}
const features = allFeatures.filter(f => !excluded.has(f.id));

// ID → páginas que lo cubren
const coveredBy = new Map();
for (const p of pages) {
  for (const id of asList(p.fm.funcionalidades)) {
    if (!coveredBy.has(id)) coveredBy.set(id, []);
    coveredBy.get(id).push(p);
  }
}
const known = new Set(allFeatures.map(f => f.id));
const unknownRefs = [...coveredBy.keys()].filter(id => !known.has(id));

const withImage = p => p.images.length > 0;
const isPending = p => /pendiente|parcial/.test(String(p.fm.estado ?? '')) || /pendiente/.test(String(p.fm.verificado?.metodo ?? ''));

const covered = features.filter(f => coveredBy.has(f.id));
// Verificada: al menos una página que la cubre fue contrastada con el código y/o la UI (metodo ≠ pendiente).
// Las que además tienen puntos sin probar en la UI figuran como páginas "parcial" (ver paginasPendientesDeValidacion).
const verified = features.filter(f => (coveredBy.get(f.id) ?? []).some(p => String(p.fm.verificado?.metodo ?? 'pendiente') !== 'pendiente'));
const pct = n => (features.length ? Math.round((n / features.length) * 1000) / 10 : 0);

// por módulo (prefijo)
const mods = new Map();
for (const f of features) {
  const k = f.id.split('-')[0];
  if (!mods.has(k)) mods.set(k, { total: 0, doc: 0 });
  mods.get(k).total++;
  if (coveredBy.has(f.id)) mods.get(k).doc++;
}

const questionFile = path.join(ROOT, 'user-questions.md');
let questions = { total: 0, variantes: 0 };
if (existsSync(questionFile)) {
  const rows = readFileSync(questionFile, 'utf8').split(/\r?\n/).filter(l => /^\|\s*Q-[A-Z]+-\d+/.test(l));
  questions.total = rows.length;
  questions.variantes = rows.reduce((n, l) => n + (l.split('|')[6]?.split('¶').filter(s => s.trim()).length ?? 0), 0);
}

const metrics = {
  generado: new Date().toISOString(),
  funcionalidadesDetectadas: allFeatures.length,
  funcionalidadesExcluidas: excluded.size,
  funcionalidadesEnAlcance: features.length,
  funcionalidadesDocumentadas: covered.length,
  coberturaPorcentaje: pct(covered.length),
  funcionalidadesVerificadas: verified.length,
  coberturaVerificadaPorcentaje: pct(verified.length),
  paginas: pages.length,
  paginasConCaptura: pages.filter(withImage).length,
  paginasPendientesDeValidacion: pages.filter(isPending).length,
  paginasSinMetadatos: pages.filter(p => p.route !== '/' && !p.fm.tipo).length,
  referenciasAIdDesconocido: unknownRefs.length,
  modulosSinDocumentacion: [...mods.entries()].filter(([, v]) => v.doc === 0).map(([k]) => k),
  preguntas: questions,
};

mkdirSync(path.join(ROOT, 'notes', '_generated'), { recursive: true });
writeFileSync(path.join(ROOT, 'notes', '_generated', 'metrics.json'), JSON.stringify(metrics, null, 2));

const today = new Date().toISOString().slice(0, 10);
let md = `# Cobertura documental

> **Generado** por \`scripts/docs-coverage.mjs\` el ${today}. No editar a mano.
> Una funcionalidad cuenta como *documentada* si al menos una página la lista en \`funcionalidades\` de su frontmatter.

## Resumen

| Métrica | Valor |
|---|---:|
| Funcionalidades detectadas | ${metrics.funcionalidadesDetectadas} |
| Excluidas del manual por decisión (notes/exclusiones.md) | ${metrics.funcionalidadesExcluidas} |
| Funcionalidades en alcance | ${metrics.funcionalidadesEnAlcance} |
| Funcionalidades documentadas | ${metrics.funcionalidadesDocumentadas} |
| **Cobertura (referenciadas por alguna página)** | **${metrics.coberturaPorcentaje} %** |
| Funcionalidades con página **verificada** contra código/UI | ${metrics.funcionalidadesVerificadas} |
| **Cobertura verificada** | **${metrics.coberturaVerificadaPorcentaje} %** |
| Páginas | ${metrics.paginas} |
| Páginas con capturas | ${metrics.paginasConCaptura} |
| Páginas pendientes de validación (estado parcial/pendiente) | ${metrics.paginasPendientesDeValidacion} |
| Páginas sin metadatos de trazabilidad | ${metrics.paginasSinMetadatos} |
| Referencias a IDs inexistentes | ${metrics.referenciasAIdDesconocido} |
| Preguntas en el banco / variantes | ${questions.total} / ${questions.variantes} |
| Módulos sin ninguna documentación | ${metrics.modulosSinDocumentacion.join(', ') || 'ninguno'} |

## Cobertura por dominio

| Dominio | Funcionalidades | Documentadas | % |
|---|---:|---:|---:|
${[...mods.entries()].map(([k, v]) => `| ${k} | ${v.total} | ${v.doc} | ${v.total ? Math.round((v.doc / v.total) * 100) : 0} % |`).join('\n')}

## Matriz funcionalidad ↔ página

| ID | Funcionalidad | Ruta UI | Páginas que la documentan | Capturas | Estado |
|---|---|---|---|---|---|
`;
for (const f of features) {
  const ps = coveredBy.get(f.id) ?? [];
  const links = ps.map(p => `[${p.route}](${p.route})`).join(', ') || '—';
  const caps = ps.some(withImage) ? 'sí' : ps.length ? 'no' : '—';
  const estado = ps.length ? (ps.some(p => String(p.fm.verificado?.metodo ?? 'pendiente') !== 'pendiente') ? (ps.some(p => !isPending(p)) ? 'verificada' : 'verificada en código; UI parcial') : 'pendiente de validar') : 'sin documentar';
  md += `| ${f.id} | ${f.nombre.slice(0, 80).replace(/\|/g, '\\|')} | ${f.ruta.slice(0, 50).replace(/\|/g, '\\|')} | ${links} | ${caps} | ${estado} |\n`;
}
if (excluded.size) {
  const esc = t => String(t).replace(/[|]/g, '/');
  const filas = allFeatures.filter(f => excluded.has(f.id)).map(f => '| ' + f.id + ' | ' + esc(f.nombre.slice(0, 80)) + ' | ' + esc(excluded.get(f.id)) + ' |');
  md += '\n## Excluidas del manual por decisión\n\n| ID | Funcionalidad | Motivo |\n|---|---|---|\n' + filas.join('\n') + '\n';
}
if (unknownRefs.length) md += `\n## IDs referenciados que no existen en el inventario\n\n${unknownRefs.map(i => `- ${i}`).join('\n')}\n`;
writeFileSync(path.join(ROOT, 'docs-coverage.md'), md);

console.log(`Cobertura: ${covered.length}/${features.length} (${metrics.coberturaPorcentaje} %) · verificada: ${verified.length} (${metrics.coberturaVerificadaPorcentaje} %) · páginas ${pages.length} · con captura ${metrics.paginasConCaptura}`);
if (args.includes('--check') && metrics.coberturaVerificadaPorcentaje < min) {
  console.error(`Cobertura verificada ${metrics.coberturaVerificadaPorcentaje} % < mínimo ${min} %`);
  process.exit(1);
}
