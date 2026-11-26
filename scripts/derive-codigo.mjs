#!/usr/bin/env node
/**
 * derive-codigo — completa `codigo:` en el frontmatter de las guías que no lo tienen.
 *
 * Toma los archivos que cada inventario cita en la línea "Archivos" de las funcionalidades que la página
 * documenta, los resuelve contra el código fuente por nombre de archivo (solo si es único) y escribe
 * `codigo:` con rutas `FE:`/`BE:` relativas a `src`. Es heurístico: revise el resultado con `git diff`.
 *
 *   node scripts/derive-codigo.mjs            # muestra lo que haría
 *   node scripts/derive-codigo.mjs --write    # escribe el frontmatter
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT, DOCS, loadPages, asList } from './lib/manual.mjs';
import { FE_SRC, BE_SRC } from './lib/manual.mjs';

const WRITE = process.argv.includes('--write');
const FE = FE_SRC;
const BE = BE_SRC;

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'migrations'].includes(e)) continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(vue|js|ts)$/.test(e)) out.push(p);
  }
  return out;
};
const toPosix = s => s.split(path.sep).join('/');

const index = new Map();
for (const [tag, base] of [['FE', FE], ['BE', BE]]) {
  for (const f of walk(base)) {
    const key = path.basename(f);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ tag, rel: toPosix(path.relative(base, f)) });
  }
}

// ID → nombres de archivo citados en el inventario
const invDir = path.join(ROOT, 'notes', 'inventory');
const filesById = new Map();
for (const f of readdirSync(invDir).filter(n => n.endsWith('.md') && !n.startsWith('_'))) {
  const txt = readFileSync(path.join(invDir, f), 'utf8');
  for (const sec of txt.split(/^## /m).slice(1)) {
    const id = sec.match(/^([A-Z]{2,4}-\d{3})\b/)?.[1];
    if (!id) continue;
    const line = sec.split('\n').find(l => /\*\*Archivos:?\*\*/.test(l)) ?? '';
    const names = [...line.matchAll(/`([^`]+?\.(?:vue|js|ts))`/g)].map(m => path.basename(m[1]));
    if (names.length) filesById.set(id, [...new Set([...(filesById.get(id) ?? []), ...names])]);
  }
}

let changed = 0;
for (const p of loadPages()) {
  if (!p.route.startsWith('/guia/') || asList(p.fm.codigo).length) continue;
  const names = [...new Set(asList(p.fm.funcionalidades).flatMap(id => filesById.get(id) ?? []))];
  const refs = [];
  for (const n of names) {
    const hit = index.get(n);
    if (hit?.length === 1) refs.push(`${hit[0].tag}:${hit[0].rel}`);
  }
  const uniq = [...new Set(refs)].slice(0, 10);
  if (!uniq.length) {
    console.log(`- ${p.route}: sin archivos resolubles`);
    continue;
  }
  console.log(`+ ${p.route}: ${uniq.length} archivos`);
  if (WRITE) {
    const file = path.join(DOCS, p.route.replace(/^\//, '') + '.mdx');
    const s = readFileSync(file, 'utf8');
    const block = 'codigo:\n' + uniq.map(r => `  - ${r}`).join('\n') + '\n';
    const out = s.replace(/\nverificado:/, '\n' + block + 'verificado:');
    if (out !== s) {
      writeFileSync(file, out);
      changed++;
    }
  }
}
console.log(WRITE ? `Actualizadas ${changed} páginas.` : 'Use --write para escribir.');
