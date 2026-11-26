/**
 * Utilidades compartidas por los scripts de verificación del manual (sin dependencias externas).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// ISPMAX_DOCS_DIR / ISPMAX_ASSETS_DIR (opcionales) sustituyen a docs/ y assets/imgs/: permiten usar el contenido
// materializado desde un paquete .ispmax (portal/test/helpers/corpus.mjs). Sin ellas, todo queda como siempre.
export const DOCS = process.env.ISPMAX_DOCS_DIR ? path.resolve(process.env.ISPMAX_DOCS_DIR) : path.join(ROOT, 'docs');
export const IMGS = process.env.ISPMAX_ASSETS_DIR ? path.resolve(process.env.ISPMAX_ASSETS_DIR) : path.join(ROOT, 'assets', 'imgs');
// Raíz de assets/ (imgs/, logo/, tours/) que copia sync-assets: la carpeta padre de ISPMAX_ASSETS_DIR o assets/.
export const ASSETS = process.env.ISPMAX_ASSETS_DIR ? path.dirname(IMGS) : path.join(ROOT, 'assets');
// Índice del buscador (build-search-data lo escribe, eval-search y el tema lo leen) y salida del build. Las mismas
// variables las lee rspress.config.ts.
export const SEARCH_DATA = process.env.ISPMAX_SEARCH_DATA ? path.resolve(process.env.ISPMAX_SEARCH_DATA) : path.join(ROOT, 'src', 'search', 'data.json');
export const DIST = process.env.ISPMAX_DIST_DIR ? path.resolve(process.env.ISPMAX_DIST_DIR) : path.join(ROOT, 'dist');

export const walk = (dir, ext) =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return ['public', '_generated', 'node_modules'].includes(e.name) ? [] : walk(p, ext);
    return p.endsWith(ext) ? [p] : [];
  });

/** docs/guia/x.mdx → /guia/x ; docs/index.mdx → / */
export const routeOf = file => {
  const rel = path.relative(DOCS, file).replace(/\\/g, '/').replace(/\.mdx?$/, '');
  return '/' + rel.replace(/(^|\/)index$/, '').replace(/\/$/, '');
};

export const slug = text =>
  text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');

/** Frontmatter YAML mínimo: escalares, listas en línea `[a, b]`, listas con guiones y un nivel de anidación. */
export function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  const lines = m[1].split(/\r?\n/);
  const scalar = v => {
    v = v.trim();
    if (/^\[.*\]$/.test(v))
      return v
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    return v.replace(/^["']|["']$/g, '');
  };
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rest] = kv;
    if (rest.trim() !== '') {
      data[key] = scalar(rest);
      continue;
    }
    // bloque: lista con guiones o mapa anidado
    const list = [];
    const map = {};
    let j = i + 1;
    for (; j < lines.length && /^\s+/.test(lines[j]); j++) {
      const item = lines[j].match(/^\s+-\s+(.*)$/);
      const nested = lines[j].match(/^\s+([A-Za-z_][\w-]*):\s*(.*)$/);
      if (item) list.push(item[1].replace(/^["']|["']$/g, ''));
      else if (nested) map[nested[1]] = scalar(nested[2]);
    }
    data[key] = list.length ? list : Object.keys(map).length ? map : '';
    i = j - 1;
  }
  return { data, body: src.slice(m[0].length) };
}

export function loadPages() {
  return walk(DOCS, '.mdx').map(file => {
    const src = readFileSync(file, 'utf8');
    const { data, body } = parseFrontmatter(src);
    const text = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\]\([^)]*\)/g, ' ')
      .replace(/[#*`|>:_\[\]]/g, ' ');
    return {
      file: path.relative(ROOT, file).replace(/\\/g, '/'),
      route: routeOf(file),
      fm: data,
      title: data.title,
      body,
      text,
      words: text.split(/\s+/).filter(Boolean).length,
      headings: [...body.matchAll(/^#{1,6}\s+(.+)$/gm)].map(h => h[1].trim()),
      links: [
        ...[...body.matchAll(/\]\((\/[^)\s]*)\)/g)].map(m => m[1]),
        ...[...body.matchAll(/(?:href|link|to)=["'](\/[^"']*)["']/g)].map(m => m[1]),
      ],
      images: [
        ...[...body.matchAll(/(?:src|image)=["'](\/assets\/imgs\/[^"']+)["']/g)].map(m => m[1]),
        ...[...body.matchAll(/!\[[^\]]*\]\((\/assets\/imgs\/[^)\s]+)\)/g)].map(m => m[1]),
      ],
    };
  });
}

export const asList = v => (Array.isArray(v) ? v : v ? [v] : []);

// La normalización y el motor de búsqueda viven en `src/search/engine.mjs` (se comparten con el navegador).
export { fold, stem, tokens } from '../../src/search/engine.mjs';

/**
 * Carpetas `src` del código de ISPMAX (solo lectura). Se toman de `ISPMAX_FE_SRC` / `ISPMAX_BE_SRC` y, si no
 * están definidas, de la primera ubicación que exista: copia de trabajo en Descargas, clon con historial en
 * ~/Repositorios o la ruta de las primeras sesiones (Windows).
 */
const fuente = (variable, candidatos) =>
  process.env[variable] ?? candidatos.find(c => existsSync(c)) ?? candidatos[candidatos.length - 1];
const casa = os.homedir();
export const FE_SRC = fuente('ISPMAX_FE_SRC', [
  path.join(casa, 'Downloads', 'ispmax', 'frontend-isp-main', 'src'),
  path.join(casa, 'Repositorios', 'frontend-isp', 'src'),
  'C:/WORKSPACE/_ispmax-src/frontend/frontend-isp-main/src',
]);
export const BE_SRC = fuente('ISPMAX_BE_SRC', [
  path.join(casa, 'Downloads', 'ispmax', 'backend-isp-main', 'src'),
  path.join(casa, 'Repositorios', 'backend-isp', 'src'),
  'C:/WORKSPACE/_ispmax-src/backend/backend-isp-main/src',
]);

export { existsSync };
