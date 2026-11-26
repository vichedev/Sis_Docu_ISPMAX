#!/usr/bin/env node
/**
 * docs-check — verificación estática del manual (sin dependencias externas).
 *
 * Errores (hacen fallar el CI):
 *   · enlace interno a una página inexistente;
 *   · imagen referenciada que no existe en assets/imgs;
 *   · página sin `title`;
 *   · página con `tipo` y sin `modulo` / `verificado.fecha`, o con `tipo` desconocido;
 *   · dos páginas que declaran el mismo `slug` de ruta (no puede ocurrir) o `funcionalidades` con formato inválido.
 * Avisos:
 *   · ancla inexistente; imagen sin uso; página sin descripción; huérfana (ni en el menú ni enlazada);
 *   · página heredada sin metadatos de trazabilidad; tarea/problema sin enlaces a guía o referencia.
 *
 * Uso:
 *   node scripts/docs-check.mjs            # informe legible; exit 1 si hay errores
 *   node scripts/docs-check.mjs --json     # informe JSON por stdout
 *   node scripts/docs-check.mjs --warn     # no falla aunque haya errores
 *   node scripts/docs-check.mjs --strict   # los metadatos heredados faltantes también son errores
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, DOCS, IMGS, loadPages, asList } from './lib/manual.mjs';

const args = new Set(process.argv.slice(2));
const TIPOS = ['tarea', 'guia', 'problema', 'faq', 'referencia', 'concepto'];

const pages = loadPages();
const routes = new Set(pages.map(p => p.route));
const byRoute = new Map(pages.map(p => [p.route, p]));
const slug = t =>
  t
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');

// Sidebar heredado + navegación del tema
const sidebarRoutes = new Set();
const sidebarFile = path.join(DOCS, 'sidebar.json');
if (existsSync(sidebarFile)) for (const g of JSON.parse(readFileSync(sidebarFile, 'utf8'))) for (const it of g.items ?? []) sidebarRoutes.add(it.link);
const navFile = path.join(DOCS, '_nav.json');
if (existsSync(navFile))
  for (const groups of Object.values(JSON.parse(readFileSync(navFile, 'utf8'))))
    for (const g of groups) for (const it of g.items ?? []) sidebarRoutes.add(it.link);
const cfg = readFileSync(path.join(ROOT, 'rspress.config.ts'), 'utf8');
const navRoutes = new Set([...cfg.matchAll(/link:\s*'(\/[^']+)'/g)].map(m => m[1].replace(/\/$/, '')));

const errors = [];
const warnings = [];
const add = (list, kind, file, msg) => list.push({ kind, file, msg });

/** Detecta frontmatter YAML que rompe la página (p. ej. un ": " dentro de un escalar sin comillas). */
function yamlSospechoso(raw) {
  const m = raw.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return [];
  const out = [];
  m[1].split(/\r?\n/).forEach((line, i) => {
    const mm = line.match(/^(\s*(?:-\s+)?[A-Za-z_][\w.-]*):\s+(.*)$/);
    if (!mm) return;
    const v = mm[2].trim();
    if (!v || /^["'[{|>]/.test(v)) return;
    const corto = line.trim().slice(0, 90);
    if (/:\s/.test(v)) out.push(`línea ${i + 2}: valor sin comillas con ": " → ${corto}`);
    else if (/\s#/.test(v)) out.push(`línea ${i + 2}: valor sin comillas con " #" → ${corto}`);
    else if (/^[*&!%@`]/.test(v)) out.push(`línea ${i + 2}: valor que empieza con un indicador YAML → ${corto}`);
  });
  return out;
}

const linkedFrom = new Map();
for (const p of pages) {
  for (const msg of yamlSospechoso(readFileSync(path.join(ROOT, p.file), 'utf8')))
    add(errors, 'frontmatter-yaml', p.file, `YAML inválido (la página se vería como texto plano): ${msg}`);
  const isIndex = p.fm.tipo === 'indice';
  if (!p.title && p.route !== '/') add(errors, 'sin-titulo', p.file, 'Falta `title` en el frontmatter.');
  if (!p.fm.description && p.route !== '/') add(warnings, 'sin-descripcion', p.file, 'Falta `description`.');

  if (p.route !== '/' && !isIndex) {
    const falta = ['modulo', 'tipo'].filter(k => !p.fm[k]);
    if (!p.fm.verificado?.fecha) falta.push('verificado.fecha');
    if (p.fm.tipo) {
      if (falta.length) add(errors, 'metadatos', p.file, `Faltan en el frontmatter: ${falta.join(', ')}`);
      if (!TIPOS.includes(p.fm.tipo)) add(errors, 'tipo-invalido', p.file, `tipo "${p.fm.tipo}" no válido (${TIPOS.join(', ')})`);
      if (['tarea', 'problema'].includes(p.fm.tipo) && !p.links.some(l => /^\/(guia|problemas|tareas|referencia|conceptos)\//.test(l)))
        add(warnings, 'sin-enlaces', p.file, 'Debe enlazar a su guía, referencia o página relacionada.');
    } else add(args.has('--strict') ? errors : warnings, 'sin-metadatos', p.file, 'Página heredada sin metadatos de trazabilidad (tipo, modulo, verificado).');
    for (const id of asList(p.fm.funcionalidades)) if (!/^[A-Z]{2,5}-\d{3}$/.test(id)) add(errors, 'id-invalido', p.file, `ID de funcionalidad inválido: ${id}`);
  }

  for (const raw of p.links) {
    const [target, frag] = raw.split('#');
    const clean = target.replace(/\/$/, '') || '/';
    if (/^\/(assets|legacy)\b/.test(clean) || /\.(webp|png|jpg|svg|pdf|xlsx)$/.test(clean)) continue;
    if (!routes.has(clean)) {
      add(errors, 'enlace-roto', p.file, `Enlace a página inexistente: ${raw}`);
      continue;
    }
    if (!linkedFrom.has(clean)) linkedFrom.set(clean, new Set());
    linkedFrom.get(clean).add(p.file);
    if (frag && !byRoute.get(clean).headings.map(slug).includes(frag)) add(warnings, 'ancla-rota', p.file, `Ancla inexistente: ${raw}`);
  }

  for (const img of p.images) if (!existsSync(path.join(IMGS, img.replace('/assets/imgs/', '')))) add(errors, 'imagen-faltante', p.file, `No existe ${img}`);
}

// Imágenes sin uso (recursivo)
const listImgs = (dir, pre = '') =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? listImgs(path.join(dir, e.name), `${pre}${e.name}/`) : /\.(webp|png|jpg|jpeg|svg)$/i.test(e.name) ? [`${pre}${e.name}`] : [],
  );
const allImages = existsSync(IMGS) ? listImgs(IMGS) : [];
const used = new Set(pages.flatMap(p => p.images.map(i => i.replace('/assets/imgs/', ''))));
const unusedImages = allImages.filter(f => !used.has(f));
for (const f of unusedImages) add(warnings, 'imagen-sin-uso', `assets/imgs/${f}`, 'Ninguna página la referencia.');

// Huérfanas
for (const p of pages) {
  if (p.route === '/' || p.fm.tipo === 'indice') continue;
  if (!sidebarRoutes.has(p.route) && !navRoutes.has(p.route) && !(linkedFrom.get(p.route)?.size > 0))
    add(warnings, 'huerfana', p.file, 'No está en el menú ni la enlaza ninguna página.');
}

const stats = {
  paginas: pages.length,
  palabras: pages.reduce((n, p) => n + p.words, 0),
  paginasConImagen: pages.filter(p => p.images.length).length,
  paginasSinImagen: pages.filter(p => !p.images.length).map(p => p.route),
  paginasConMetadatos: pages.filter(p => p.fm.tipo).length,
  imagenes: allImages.length,
  imagenesSinUso: unusedImages.length,
  enlacesInternos: pages.reduce((n, p) => n + p.links.length, 0),
  errores: errors.length,
  avisos: warnings.length,
};

if (args.has('--json')) {
  console.log(JSON.stringify({ stats, errors, warnings, pages: pages.map(({ headings, body, text, ...p }) => p) }, null, 2));
} else {
  const fmt = l => l.map(e => `  [${e.kind}] ${e.file} — ${e.msg}`).join('\n');
  console.log(`Páginas: ${stats.paginas} (${stats.paginasConMetadatos} con metadatos) · Palabras: ${stats.palabras} · Con imagen: ${stats.paginasConImagen}`);
  console.log(`Imágenes: ${stats.imagenes} (${stats.imagenesSinUso} sin uso) · Enlaces internos: ${stats.enlacesInternos}`);
  console.log(`\nERRORES (${errors.length})\n${fmt(errors) || '  ninguno'}`);
  const w = warnings.filter(x => x.kind !== 'sin-metadatos');
  console.log(`\nAVISOS (${warnings.length}${warnings.length !== w.length ? `; ${warnings.length - w.length} páginas heredadas sin metadatos` : ''})\n${fmt(w) || '  ninguno'}`);
}

process.exit(errors.length && !args.has('--warn') ? 1 : 0);
