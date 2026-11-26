#!/usr/bin/env node
/**
 * seo-check — audita el SEO del sitio ya construido (HTML de `dist/` o de la carpeta publicada por el portal).
 *
 *   node scripts/seo-check.mjs [dist] [--site-url https://doc.ispmax.ec] [--base /] [--json informe.json]
 *                              [--lighthouse URL[,URL…]]  [--strict]
 *
 * Revisa por página: lang="es", <title> único y de ≤ 65 caracteres, meta description de 70-160 (única), un solo <h1>,
 * canonical absoluto y coherente con la ruta del archivo, Open Graph y Twitter completos, meta robots, JSON-LD
 * parseable (y TechArticle/BreadcrumbList en las páginas de contenido), imágenes con alt/width/height, iconos y
 * manifiesto, y enlaces internos (reutiliza scripts/check-dist.mjs). Sale con código 1 si hay incumplimientos
 * (`error`); los avisos (`aviso`) solo cuentan con --strict.
 *
 * --site-url: URL pública esperada (def. PORTAL_PUBLIC_URL o la del canonical de la portada). Sin ninguna, se avisa
 * de que las páginas no llevan canonical.
 * --lighthouse: ejecuta Lighthouse (binario `lighthouse` o LIGHTHOUSE_BIN; Chrome/Edge con CHROME_PATH) en móvil sobre
 * esas URL (servidas por el portal o `npm run preview`) e imprime las puntuaciones. No forma parte de la salida de error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = n => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const flags = new Set(['--strict']);
const positional = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
const D = path.resolve(positional[0] || process.env.ISPMAX_DIST_DIR || 'dist');
const BASE = (opt('--base') || '/').replace(/\/?$/, '/');
const strict = args.includes('--strict');
const TITLE_MAX = 65;
const DESC_MIN = 70;
const DESC_MAX = 160;

const walk = d => fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
if (!fs.existsSync(D)) { console.error(`No existe ${D}`); process.exit(2); }
const files = walk(D);
const rel = f => path.relative(D, f).split(path.sep).join('/');
const htmls = files.filter(f => f.endsWith('.html'));
const have = new Set(files.map(rel));

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&hellip;/g, '…');
const attrs = tag => {
  const o = {};
  for (const m of tag.matchAll(/([\w:-]+)(?:="([^"]*)"|='([^']*)')?/g)) if (m[1] !== tag.slice(1).split(/\s/)[0]) o[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? '');
  return o;
};
const metaOf = (html, key, by = 'name') => {
  const out = [];
  for (const m of html.matchAll(/<meta\s[^>]*>/g)) { const a = attrs(m[0]); if (a[by] === key) out.push(a.content ?? ''); }
  return out;
};
const linkOf = (html, relName) => [...html.matchAll(/<link\s[^>]*>/g)].map(m => attrs(m[0])).filter(a => (a.rel || '').split(/\s+/).includes(relName));

/** Ruta pública esperada de un archivo del sitio: a/b.html → /a/b; a/index.html → /a/; index.html → /. */
const expectedPath = f => {
  if (f === 'index.html') return BASE;
  if (f.endsWith('/index.html')) return BASE + f.slice(0, -'index.html'.length);
  return BASE + f.replace(/\.html$/, '');
};

const issues = []; // { level, path, msg }
const add = (level, p, msg) => issues.push({ level, path: p, msg });

let siteUrl = (opt('--site-url') || process.env.PORTAL_PUBLIC_URL || '').replace(/\/$/, '');
const homeHtml = fs.existsSync(path.join(D, 'index.html')) ? fs.readFileSync(path.join(D, 'index.html'), 'utf8') : '';
if (!siteUrl) {
  const c = linkOf(homeHtml, 'canonical')[0]?.href;
  if (c) siteUrl = new URL(c).origin;
}
if (!siteUrl) add('aviso', '(sitio)', 'No hay URL pública (PORTAL_PUBLIC_URL / --site-url): las páginas no llevan canonical ni og:url/og:image absolutos.');

const titles = new Map();
const descs = new Map();
const pageRows = [];
let imgCount = 0;

for (const f of htmls) {
  const r = rel(f);
  const is404 = r === '404.html';
  const html = fs.readFileSync(f, 'utf8');
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const P = '/' + r;

  if (!/<html[^>]*\blang="es"/.test(html)) add('error', P, 'Falta lang="es" en <html>.');

  // título
  const title = decode((head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
  if (!title) add('error', P, 'Sin <title>.');
  else {
    if (title.length > TITLE_MAX) add('aviso', P, `Título de ${title.length} caracteres (máx. ${TITLE_MAX}): «${title}»`);
    if (!is404) titles.set(title, [...(titles.get(title) || []), P]);
  }
  // descripción
  const d = metaOf(head, 'description');
  if (!is404) {
    if (d.length !== 1) add('error', P, d.length ? 'Más de una meta description.' : 'Sin meta description.');
    else {
      const t = d[0].trim();
      if (t.length < DESC_MIN || t.length > DESC_MAX) add('aviso', P, `Descripción de ${t.length} caracteres (${DESC_MIN}-${DESC_MAX}): «${t.slice(0, 60)}…»`);
      descs.set(t, [...(descs.get(t) || []), P]);
    }
  }
  // h1
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (!is404 && h1 !== 1) add('error', P, `${h1} elementos <h1> (debe haber uno).`);

  // robots
  const robots = metaOf(head, 'robots')[0] || '';
  if (!robots) add('error', P, 'Sin meta robots.');
  else if (is404 ? !/noindex/.test(robots) : /noindex/.test(robots)) add('error', P, `meta robots inesperado: «${robots}».`);

  // canonical y Open Graph
  const canon = linkOf(head, 'canonical').map(a => a.href);
  if (!is404) {
    if (siteUrl) {
      if (canon.length !== 1) add('error', P, canon.length ? 'Más de un canonical.' : 'Sin canonical.');
      else {
        const want = siteUrl + expectedPath(r);
        if (!/^https?:\/\//.test(canon[0])) add('error', P, `Canonical no absoluto: ${canon[0]}`);
        else if (canon[0] !== want) add('error', P, `Canonical incoherente: ${canon[0]} (esperado ${want}).`);
      }
      const hl = linkOf(head, 'alternate').filter(a => a.hreflang);
      if (!hl.some(a => a.hreflang === 'es' && a.href === canon[0])) add('error', P, 'Falta hreflang="es" apuntando al canonical.');
      const ogUrl = metaOf(head, 'og:url', 'property')[0];
      if (ogUrl !== canon[0]) add('error', P, `og:url (${ogUrl}) no coincide con el canonical.`);
      const img = metaOf(head, 'og:image', 'property')[0] || '';
      if (!/^https?:\/\//.test(img)) add('error', P, 'og:image ausente o no absoluta.');
      else if (!have.has(new URL(img).pathname.replace(/^\//, ''))) add('error', P, `og:image no existe en el sitio: ${img}`);
      if (!metaOf(head, 'twitter:image')[0]) add('error', P, 'Sin twitter:image.');
    }
    for (const k of ['og:title', 'og:description', 'og:site_name', 'og:locale', 'og:type']) if (!metaOf(head, k, 'property')[0]) add('error', P, `Falta ${k}.`);
    if (metaOf(head, 'twitter:card')[0] !== 'summary_large_image') add('error', P, 'twitter:card debe ser summary_large_image.');
    if (metaOf(head, 'og:locale', 'property')[0] && metaOf(head, 'og:locale', 'property')[0] !== 'es_EC') add('aviso', P, 'og:locale distinto de es_EC.');
    const ogType = metaOf(head, 'og:type', 'property')[0];
    const wantType = r === 'index.html' ? 'website' : 'article';
    if (ogType && ogType !== wantType) add('aviso', P, `og:type ${ogType} (esperado ${wantType}).`);
    if (metaOf(head, 'theme-color').length < 2) add('error', P, 'Faltan los theme-color claro y oscuro.');
    if (!metaOf(head, 'color-scheme')[0]) add('error', P, 'Sin color-scheme.');
    for (const need of ['icon', 'apple-touch-icon', 'manifest']) if (!linkOf(head, need).length) add('error', P, `Falta <link rel="${need}">.`);
  }
  // recursos locales de <head> (iconos, manifiesto, fuentes)
  for (const a of [...linkOf(head, 'icon'), ...linkOf(head, 'apple-touch-icon'), ...linkOf(head, 'manifest'), ...linkOf(head, 'preload')]) {
    if (a.href && !/^(https?:)?\/\//.test(a.href) && !have.has(a.href.replace(/^\//, '').split('?')[0])) add('error', P, `Recurso del <head> inexistente: ${a.href}`);
  }
  if (/fonts\.(googleapis|gstatic)\.com/.test(html)) add('error', P, 'Referencia a Google Fonts (las fuentes deben ir autoalojadas).');

  // JSON-LD
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const types = new Set();
  if (!is404) {
    if (!ldBlocks.length && siteUrl) add('error', P, 'Sin JSON-LD.');
    for (const b of ldBlocks) {
      try {
        const j = JSON.parse(b);
        if (j['@context'] !== 'https://schema.org') add('error', P, 'JSON-LD sin @context schema.org.');
        for (const n of j['@graph'] || [j]) types.add(n['@type']);
        const art = (j['@graph'] || []).find(n => n['@type'] === 'TechArticle');
        if (art) {
          if (!art.headline || !art.description) add('error', P, 'TechArticle sin headline o description.');
          if (art.url !== canon[0]) add('error', P, 'TechArticle.url no coincide con el canonical.');
        }
      } catch (e) {
        add('error', P, `JSON-LD no parseable: ${e.message}`);
      }
    }
    if (ldBlocks.length) {
      const need = r === 'index.html' ? ['Organization', 'WebSite'] : ['Organization', 'WebSite', 'BreadcrumbList', 'TechArticle'];
      for (const t of need) if (!types.has(t)) add('error', P, `JSON-LD sin ${t}.`);
    }
  }

  // imágenes
  for (const m of html.matchAll(/<img\s[^>]*>/g)) {
    imgCount++;
    const a = attrs(m[0]);
    if (!('alt' in a)) add('error', P, `<img> sin alt: ${a.src}`);
    if (!a.width || !a.height) add('aviso', P, `<img> sin width/height: ${a.src}`);
  }
  pageRows.push({ path: P, title, canonical: canon[0], h1 });
}

for (const [t, ps] of titles) if (ps.length > 1) add('error', ps[0], `Título repetido en ${ps.length} páginas: «${t}» → ${ps.slice(0, 4).join(', ')}${ps.length > 4 ? '…' : ''}`);
for (const [t, ps] of descs) if (ps.length > 1) add('aviso', ps[0], `Descripción repetida en ${ps.length} páginas: «${t.slice(0, 50)}…» → ${ps.slice(0, 4).join(', ')}`);

// enlaces internos: scripts/check-dist.mjs
const here = path.dirname(fileURLToPath(import.meta.url));
const cd = spawnSync(process.execPath, [path.join(here, 'check-dist.mjs'), D], { encoding: 'utf8' });
const cdLine = (cd.stdout || '').split('\n')[0];
if (cd.status !== 0) for (const l of (cd.stdout || '').split('\n').filter(x => /^(ROTO|ANCLA)/.test(x))) add('error', '(enlaces)', l);

// ── informe ──
const by = lvl => issues.filter(i => i.level === lvl);
const groupMsg = lvl => {
  const g = new Map();
  for (const i of by(lvl)) {
    const k = i.msg.replace(/«[^»]*»/g, '«…»').replace(/\d+ (caracteres|páginas|elementos)/g, 'N $1').replace(/: \S+$/, '').replace(/\(.*?\)/g, '');
    g.set(k, [...(g.get(k) || []), i]);
  }
  return g;
};
console.log(`seo-check ${D}`);
console.log(`páginas HTML ${htmls.length} (${htmls.length - (have.has('404.html') ? 1 : 0)} de contenido) · imágenes <img> ${imgCount} · URL pública ${siteUrl || '(no definida)'}`);
console.log(`enlaces: ${cdLine}`);
for (const lvl of ['error', 'aviso']) {
  const g = groupMsg(lvl);
  console.log(`\n${lvl.toUpperCase()}: ${by(lvl).length}`);
  for (const [k, list] of g) {
    console.log(`  [${list.length}] ${k}`);
    for (const i of list.slice(0, 5)) console.log(`      ${i.path}  ${i.msg}`);
    if (list.length > 5) console.log(`      … y ${list.length - 5} más`);
  }
}
const dist = { titulos_unicos: titles.size, descripciones_unicas: descs.size };
console.log(`\nresumen: errores ${by('error').length} · avisos ${by('aviso').length} · títulos distintos ${dist.titulos_unicos}/${pageRows.length - (have.has('404.html') ? 1 : 0)}`);
if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify({ dir: D, siteUrl, pages: pageRows.length, issues }, null, 1));

// ── Lighthouse (opcional) ──
const lh = opt('--lighthouse');
if (lh) {
  const bin = process.env.LIGHTHOUSE_BIN || 'lighthouse';
  console.log('\nLighthouse (móvil):');
  for (const url of lh.split(',').map(s => s.trim()).filter(Boolean)) {
    const out = path.join(process.env.TEMP || process.env.TMPDIR || '.', `lh-${Date.now()}.json`);
    const r = spawnSync(
      bin,
      [url, '--output=json', `--output-path=${out}`, '--quiet', '--chrome-flags=--headless=new --no-sandbox', '--only-categories=performance,accessibility,best-practices,seo'],
      { encoding: 'utf8', shell: process.platform === 'win32' },
    );
    if (r.status !== 0 || !fs.existsSync(out)) { console.log(`  ${url}  ERROR ${String(r.stderr || r.error || '').slice(0, 200)}`); continue; }
    const j = JSON.parse(fs.readFileSync(out, 'utf8'));
    fs.rmSync(out, { force: true });
    const s = Object.fromEntries(Object.entries(j.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    console.log(`  ${url}  rendimiento ${s.performance} · accesibilidad ${s.accessibility} · mejores prácticas ${s['best-practices']} · SEO ${s.seo}`);
  }
}
process.exit(by('error').length || (strict && by('aviso').length) ? 1 : 0);
