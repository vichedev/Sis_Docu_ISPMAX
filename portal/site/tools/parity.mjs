// Paridad página a página: HTML estático (npm run build:corpus → portal/work-test/manual-dev/dist) frente al HTML
// dinámico (motor SSR contra una BD con el mismo corpus). Lo usa `npm run parity` (parity-run.mjs); también se puede
// lanzar suelto contra la BD de site/db.mjs: node site/tools/parity.mjs [--out informe.json]
//   1. Cuerpo (#__rspress_root) idéntico byte a byte (PARITY_NORM_IDS=1 normaliza los id de React `_R_…_`).
//   2. Si no, métricas del artículo: texto visible, encabezados (nivel, id, texto), imágenes, enlaces, tablas,
//      avisos, pasos, bloques de código; y si la diferencia está dentro o fuera del artículo.
//   3. <head>: mismas etiquetas meta/link/script ld+json (salvo las de recursos del build: css/js/preload).
//   4. Índice del buscador: mismos documentos (título, descripción, tipo, módulo, longitud y términos).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO } from '../config.mjs';

export const DEFAULT_DIST = path.join(REPO, 'portal', 'work-test', 'manual-dev', 'dist');
export const DEFAULT_SEARCH = path.join(REPO, 'portal', 'work-test', 'manual-dev', 'search-data.json');

const fileOf = r => (r === '/' ? 'index.html' : r.endsWith('/') ? `${r.slice(1)}index.html` : `${r.slice(1)}.html`);
const body = s => s.slice(s.indexOf('<div id="__rspress_root">'), s.indexOf('<div id="__rspress_modal_container">'));
const normIds = process.env.PARITY_NORM_IDS ? s => s.replace(/_R_[0-9a-z]+_/g, '_R_') : s => s;
const article = s => {
  const i = s.indexOf('<article data-doc');
  if (i < 0) return '';
  return s.slice(i, s.indexOf('</article>', i));
};
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');
const text = h => decode(h.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const all = (re, s) => [...s.matchAll(re)];
function metrics(a) {
  return {
    text: text(a),
    headings: all(/<h([1-6])\b[^>]*?id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g, a).map(m => `${m[1]}#${m[2]}:${text(m[3])}`),
    images: all(/<img\b[^>]*?src="([^"]*)"/g, a).map(m => m[1]),
    links: all(/<a\b[^>]*?href="([^"]*)"/g, a).map(m => m[1].replace(/\.html(?=$|#)/, '')),
    tables: all(/<table\b/g, a).length,
    callouts: all(/role="note"|<details\b/g, a).length,
    steps: all(/\[counter-increment:isp-step\]/g, a).length,
    code: all(/<pre\b/g, a).length,
    figures: all(/<figure\b/g, a).length,
  };
}
const headTags = s =>
  all(/<(meta|link)\b[^>]*>|<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, s.slice(0, s.indexOf('</head>')))
    .map(m => m[0].replace(/\s*\/>$/, '>'))
    .filter(t => !/stylesheet|modulepreload|rel="preload"|X-UA-Compatible|name="generator"|charset|viewport/.test(t))
    .sort();

/** Documentos del índice del buscador por ruta, con los términos como palabras (los id del vocabulario cambian con el orden). */
function searchDocs(idx) {
  const out = new Map();
  for (const d of idx.docs) {
    const tf = [];
    for (let i = 0; i < d.tf.length; i += 2) tf.push(`${idx.vocab[d.tf[i]]}:${d.tf[i + 1]}`);
    out.set(d.r, JSON.stringify({ t: d.t, d: d.d, k: d.k, m: d.m, len: d.len, tf: tf.sort() }));
  }
  return out;
}

/** Compara el motor con un build estático → informe. */
export async function runParity({ engine, dist = DEFAULT_DIST, searchData = DEFAULT_SEARCH }) {
  await engine.ensureFresh();
  const routes = [...engine.structure().pagesByRoute.keys()].sort();
  const res = { total: routes.length, identicalBody: 0, articleIdentical: 0, metricsEqual: 0, headEqual: 0, missingStatic: [], diffs: [] };
  const t0 = performance.now();
  for (const r of routes) {
    const file = path.join(dist, ...fileOf(r).split('/'));
    if (!fs.existsSync(file)) {
      res.missingStatic.push(r);
      continue;
    }
    const s = fs.readFileSync(file, 'utf8');
    const d = (await engine.renderRoute(r)).html;
    const [bs, bd] = [normIds(body(s)), normIds(body(d))];
    const [as, ad] = [article(bs), article(bd)];
    const [ms, md] = [metrics(as), metrics(ad)];
    const sameMetrics = JSON.stringify(ms) === JSON.stringify(md);
    const [hs, hd] = [headTags(s), headTags(d)];
    const sameHead = JSON.stringify(hs) === JSON.stringify(hd);
    if (bs === bd) res.identicalBody++;
    if (as === ad) res.articleIdentical++;
    if (sameMetrics) res.metricsEqual++;
    if (sameHead) res.headEqual++;
    if (bs !== bd || !sameHead) {
      let i = 0;
      while (i < bs.length && bs[i] === bd[i]) i++;
      const where = as === ad ? 'fuera del artículo' : 'artículo';
      const metricDiff = Object.keys(ms).filter(k => JSON.stringify(ms[k]) !== JSON.stringify(md[k]));
      res.diffs.push({
        route: r,
        where: bs === bd ? 'solo <head>' : where,
        metricDiff,
        head: sameHead ? null : { soloEstatico: hs.filter(x => !hd.includes(x)), soloDinamico: hd.filter(x => !hs.includes(x)) },
        context: bs === bd ? null : { estatico: bs.slice(Math.max(0, i - 160), i + 160), dinamico: bd.slice(Math.max(0, i - 160), i + 160) },
      });
    }
  }
  res.ms = Math.round(performance.now() - t0);
  // 404
  {
    const s = fs.readFileSync(path.join(dist, '404.html'), 'utf8');
    const d = (await engine.renderRoute('/ruta-que-no-existe')).html;
    res.notFound = { identicalBody: normIds(body(s)) === normIds(body(d)), headEqual: JSON.stringify(headTags(s)) === JSON.stringify(headTags(d)) };
    if (!res.notFound.identicalBody) {
      const [bs, bd] = [normIds(body(s)), normIds(body(d))];
      let i = 0;
      while (i < bs.length && bs[i] === bd[i]) i++;
      res.notFound.context = { estatico: bs.slice(Math.max(0, i - 160), i + 200), dinamico: bd.slice(Math.max(0, i - 160), i + 200) };
    }
  }
  // Buscador
  if (fs.existsSync(searchData)) {
    const a = searchDocs(JSON.parse(fs.readFileSync(searchData, 'utf8')));
    const b = searchDocs(JSON.parse((await engine.searchIndex()).json));
    let same = 0;
    const differ = [];
    for (const [r, v] of a) if (b.get(r) === v) same++;
    else differ.push(r);
    res.search = { static: a.size, dynamic: b.size, identical: same, differ: differ.slice(0, 10), onlyDynamic: [...b.keys()].filter(r => !a.has(r)).slice(0, 10) };
  }
  return res;
}

export function summary(res) {
  return (
    `páginas ${res.total} · cuerpo idéntico ${res.identicalBody} (${((100 * res.identicalBody) / Math.max(1, res.total)).toFixed(1)} %) · artículo idéntico ${res.articleIdentical} · ` +
    `métricas iguales ${res.metricsEqual} · <head> igual ${res.headEqual} · sin estático ${res.missingStatic.length} · 404 cuerpo ${res.notFound.identicalBody ? 'igual' : 'distinto'}` +
    (res.search ? ` · buscador ${res.search.identical}/${res.search.static} documentos iguales` : '') +
    ` · ${res.ms} ms`
  );
}

// Uso suelto (BD de site/db.mjs).
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const outArg = process.argv.indexOf('--out');
  const OUT = outArg > 0 ? process.argv[outArg + 1] : null;
  const { createPool } = await import('../db.mjs');
  const { createSiteEngine } = await import('../engine.mjs');
  const pool = createPool();
  const engine = await createSiteEngine({ pool, publicUrl: process.env.SPIKE_PUBLIC_URL || '' });
  const res = await runParity({ engine, dist: process.env.SPIKE_STATIC_DIST || DEFAULT_DIST });
  console.log(summary(res));
  for (const d of res.diffs.slice(0, 12)) console.log('-', d.route, '|', d.where, '|', d.metricDiff.join(',') || '-', d.head ? `| head: -${d.head.soloEstatico.length} +${d.head.soloDinamico.length}` : '');
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
  engine.close();
  await pool.end();
}
