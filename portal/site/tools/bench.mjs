// Rendimiento y memoria del motor SSR en proceso (sin red): por página, en frío (compilar MDX + pintar), templado
// (MDX en caché, HTML no) y en caliente (HTML en caché); memoria con las 285 páginas en caché y con un límite pequeño.
// Uso (desde portal/): node --expose-gc site/tools/bench.mjs [--db nombre] [--cache-mb 256] [--out informe.json]
//   BD: una base propia con el corpus (site/tools/own-db.mjs; def. ispmax_manual_bench, se crea si no existe).
import fs from 'node:fs';
import pg from 'pg';
import { ensureOwnDb } from './own-db.mjs';
import { createSiteEngine } from '../engine.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const DB = arg('--db', process.env.PORTAL_BENCH_DB || 'ispmax_manual_bench');
const cacheMb = Number(arg('--cache-mb', 256));
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(1);
};
const sum = a => a.reduce((x, y) => x + y, 0);
const mem = () => {
  globalThis.gc?.();
  const m = process.memoryUsage();
  return { rssMB: +(m.rss / 1048576).toFixed(0), heapMB: +(m.heapUsed / 1048576).toFixed(0), heapTotalMB: +(m.heapTotal / 1048576).toFixed(0), externalMB: +(m.external / 1048576).toFixed(0) };
};

const pool = new pg.Pool({ connectionString: await ensureOwnDb(DB, { log: console.log }), max: 4 });
const m0 = mem();
const t0 = performance.now();
const engine = await createSiteEngine({ pool, publicUrl: 'https://doc.ispmax.ec', cacheMb });
await engine.ensureFresh();
const boot = performance.now() - t0;
const m1 = mem();
const routes = [...engine.structure().pagesByRoute.keys()];
const cold = [];
for (const r of routes) cold.push((await engine.renderRoute(r)).ms);
const m2 = mem();
const st2 = engine.stats();
const hot = [];
for (let i = 0; i < 3; i++) for (const r of routes) hot.push((await engine.renderRoute(r)).ms);
engine.dropHtml(); // lo que pasa al cambiar un título o el menú: se repinta con el módulo ya compilado
const warm = [];
for (const r of routes) warm.push((await engine.renderRoute(r)).ms);
const big = '/referencia/mensajes-del-sistema';
const report = {
  db: DB,
  cacheLimitMB: cacheMb,
  pages: routes.length,
  bootMs: Math.round(boot),
  coldMs: { total: Math.round(sum(cold)), p50: pct(cold, 50), p95: pct(cold, 95), max: pct(cold, 100) },
  warmMs: { total: Math.round(sum(warm)), p50: pct(warm, 50), p95: pct(warm, 95), max: pct(warm, 100) },
  hotMs: { p50: pct(hot, 50), p95: pct(hot, 95), max: pct(hot, 100) },
  heaviestColdMs: +cold[routes.indexOf(big)].toFixed(0),
  memory: { start: m0, afterBoot: m1, allPagesCached: m2 },
  cacheAfterCold: { compiled: st2.compiled, htmlCached: st2.htmlCached, bytesMB: +(st2.bytes / 1048576).toFixed(1), limitMB: +(st2.limitBytes / 1048576).toFixed(0), evictions: st2.evictions },
  counters: engine.stats().counters,
  compiler: engine.stats().compiler,
};
console.log(JSON.stringify(report, null, 2));
const out = arg('--out', null);
if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
engine.close();
await pool.end();
