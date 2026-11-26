// npm run parity — paridad completa del manual dinámico con el build estático de Rspress (lento: no entra en npm test).
//   1. BD propia (PORTAL_PARITY_DB, def. ispmax_manual_parity) con el corpus importado (se borra al final salvo --keep).
//   2. Referencia estática: `node scripts/manual-corpus.mjs build` (npm run build:corpus de la raíz) con la misma
//      PORTAL_PUBLIC_URL (def. https://doc.ispmax.ec; --sin-url = vacía). --no-build reutiliza el último build.
//   3. Motor dinámico (tema de portal/site/dist; compílelo antes con npm run site:build) contra esa BD y comparación
//      (site/tools/parity.mjs): cuerpo byte a byte, <head>, 404 e índice del buscador.
// Sale con código 1 si alguna página no es idéntica. Uso: npm run parity [-- --keep] [-- --no-build] [-- --sin-url]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { REPO } from '../config.mjs';
import { ensureOwnDb, dropOwnDb } from './own-db.mjs';
import { runParity, summary, DEFAULT_DIST } from './parity.mjs';

const args = new Set(process.argv.slice(2));
const DB = process.env.PORTAL_PARITY_DB || 'ispmax_manual_parity';
const publicUrl = args.has('--sin-url') ? '' : process.env.PORTAL_PUBLIC_URL ?? 'https://doc.ispmax.ec';
const t0 = Date.now();

const url = await ensureOwnDb(DB, { log: console.log });
console.log(`[paridad] BD ${DB} lista (${Math.round((Date.now() - t0) / 1000)} s)`);

if (!args.has('--no-build')) {
  console.log(`[paridad] build estático de referencia (PORTAL_PUBLIC_URL=${publicUrl || '(vacía)'})…`);
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'manual-corpus.mjs'), 'build'], {
    cwd: REPO,
    env: { ...process.env, PORTAL_PUBLIC_URL: publicUrl },
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.error('[paridad] el build estático falló.');
    process.exit(1);
  }
}
if (!fs.existsSync(path.join(DEFAULT_DIST, 'index.html'))) {
  console.error(`[paridad] no hay build estático en ${DEFAULT_DIST}.`);
  process.exit(1);
}

const { createSiteEngine } = await import('../engine.mjs');
const pool = new pg.Pool({ connectionString: url, max: 4 });
let code = 0;
try {
  const engine = await createSiteEngine({ pool, publicUrl });
  const res = await runParity({ engine });
  console.log(`[paridad] ${summary(res)}`);
  for (const d of res.diffs.slice(0, 12)) console.log('  -', d.route, '|', d.where, '|', d.metricDiff.join(',') || '-', d.head ? `| head: -${d.head.soloEstatico.length} +${d.head.soloDinamico.length}` : '');
  const out = path.join(REPO, 'portal', 'work-test', 'parity-report.json');
  fs.writeFileSync(out, JSON.stringify(res, null, 2));
  console.log(`[paridad] informe: ${path.relative(REPO, out)} · motor: ${JSON.stringify(engine.stats().compiler)}`);
  const ok = res.identicalBody === res.total && res.headEqual === res.total && !res.missingStatic.length && res.notFound.identicalBody && (!res.search || res.search.identical === res.search.static);
  if (!ok) code = 1;
  engine.close();
} finally {
  await pool.end();
  if (!args.has('--keep')) await dropOwnDb(DB).catch(e => console.error(`[paridad] no se pudo borrar ${DB}: ${e.message}`));
}
console.log(`[paridad] ${code ? 'FALLO' : 'OK'} en ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(code);
