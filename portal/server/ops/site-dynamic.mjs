// Manual DINÁMICO (PORTAL_RENDER_MODE=dynamic, por defecto): el sitio se dibuja al pedirlo desde la BD con el motor
// de portal/site/engine.mjs. Guardar = en vivo: no hay construcciones, ni trabajos `publish`, ni nada escrito en disco.
// Este módulo es el «programador» que ven las rutas (ctx.site): la misma interfaz que ops/site.mjs (markDirty, status,
// rebuild…), pero markDirty solo invalida la caché afectada y compila en segundo plano lo tocado.
// Al arrancar borra los restos del flujo estático (<PORTAL_WORK_DIR>/site, <PORTAL_DATA_DIR>/site, site-meta.json) y
// poda publish_jobs (últimos 20 `publish`; registros largos recortados).
import fs from 'node:fs';
import path from 'node:path';
import { opsPaths, getSiteBase } from './publish.mjs';

/** Modo de dibujo del manual: PORTAL_RENDER_MODE=dynamic (def.) | static. */
export const renderModeOf = (env = process.env) => (String(env.PORTAL_RENDER_MODE || '').trim().toLowerCase() === 'static' ? 'static' : 'dynamic');
/** Calentamiento al arrancar: lazy (def.: portada, secciones y las más visitadas) | all (todas las páginas). */
export const warmupOf = (env = process.env) => (String(env.PORTAL_SITE_WARMUP || '').trim().toLowerCase() === 'all' ? 'all' : 'lazy');
/** Límite de la caché del motor en MB (def. 256; mín. 16). */
export const cacheMbOf = (env = process.env) => {
  const n = Number(String(env.PORTAL_SITE_CACHE_MB ?? '').trim());
  return Number.isFinite(n) && n >= 16 ? Math.min(n, 16384) : 256;
};

const inside = (root, p) => {
  const r = path.resolve(root);
  const a = path.resolve(p);
  return a !== r && a.startsWith(r + path.sep);
};

/** Borra un árbol SIN seguir enlaces simbólicos ni uniones (Windows): devuelve los bytes liberados. */
export function removeTree(p) {
  let st;
  try {
    st = fs.lstatSync(p);
  } catch {
    return 0;
  }
  if (st.isSymbolicLink()) {
    try {
      fs.unlinkSync(p);
    } catch {
      fs.rmdirSync(p); // unión de Windows
    }
    return 0;
  }
  if (!st.isDirectory()) {
    fs.unlinkSync(p);
    return st.size;
  }
  let bytes = 0;
  for (const e of fs.readdirSync(p)) bytes += removeTree(path.join(p, e));
  for (let i = 0; ; i++) {
    try {
      fs.rmdirSync(p);
      break;
    } catch (e) {
      if (i > 10 || !['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(e.code)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  return bytes;
}

/** Restos del manual estático: <work>/site, <data>/site, <data>/site.tmp-*, <data>/site.old-*, <data>/site-meta.json. */
export function cleanupStaticLeftovers({ log = () => {} } = {}) {
  const { workDir, dataDir, workSite, dataSite, siteMeta } = opsPaths();
  const targets = [];
  if (inside(workDir, workSite)) targets.push(workSite);
  if (inside(dataDir, dataSite)) targets.push(dataSite);
  try {
    for (const e of fs.readdirSync(dataDir)) if (/^site\.(tmp|old)-\d+$/.test(e)) targets.push(path.join(dataDir, e));
  } catch {}
  if (inside(dataDir, siteMeta)) targets.push(siteMeta);
  const removed = [];
  let bytes = 0;
  for (const t of targets) {
    if (!fs.existsSync(t)) continue;
    try {
      const b = removeTree(t);
      bytes += b;
      removed.push({ path: path.relative(path.dirname(path.dirname(t)), t).replace(/\\/g, '/'), bytes: b });
    } catch (e) {
      log(`[sitio] No se pudo borrar ${path.basename(t)}: ${e.code || e.message}`);
    }
  }
  if (removed.length) log(`[sitio] Modo dinámico: borrados los restos del sitio estático (${removed.map(r => `${r.path} ${(r.bytes / 1048576).toFixed(1)} MB`).join(', ')}; ${(bytes / 1048576).toFixed(1)} MB liberados).`);
  return { removed, bytes };
}

const KEEP_PUBLISH = 20;
const LONG_LOG = 32 * 1024;
/**
 * Poda de publish_jobs: borra los trabajos `publish` terminados salvo los últimos 20 y recorta los registros de más de
 * 32 KB que no estén entre los 20 más recientes de su tipo (import, backup, git_update…) y los de esos 20 `publish`
 * (salida del build antiguo). Conserva el principio, el final y la línea RESULTADO.
 */
export async function prunePublishJobs(db) {
  const del = await db.query(
    `DELETE FROM publish_jobs WHERE kind = 'publish' AND status <> 'running'
       AND id NOT IN (SELECT id FROM publish_jobs WHERE kind = 'publish' ORDER BY id DESC LIMIT $1)`,
    [KEEP_PUBLISH],
  );
  const trim = await db.query(
    `WITH ranked AS (SELECT id, kind, row_number() OVER (PARTITION BY kind ORDER BY id DESC) AS rn FROM publish_jobs WHERE status <> 'running')
     UPDATE publish_jobs j
        SET log = left(j.log, 4096) || E'\\n[… registro recortado al pasar al manual dinámico …]\\n'
                  || coalesce((regexp_match(j.log, '(RESULTADO: [^\\n]*)'))[1] || E'\\n', '') || right(j.log, 8192)
       FROM ranked r
      WHERE r.id = j.id AND length(j.log) > $1 AND (r.kind = 'publish' OR r.rn > $2)
      RETURNING j.id`,
    [LONG_LOG, KEEP_PUBLISH],
  );
  return { deleted: del.rowCount, trimmed: trim.rowCount };
}

/** Ruta afectada por un motivo de markDirty («página editada: /x», «página movida: /a → /b»). */
export function routesFromReason(reason) {
  const s = String(reason || '');
  const out = [];
  for (const m of s.matchAll(/(?:^|[\s:→])(\/[A-Za-z0-9/_.~-]*)/g)) out.push(m[1]);
  return out;
}

/**
 * createDynamicSite({ ctx, logger, createEngine }) → interfaz de ctx.site para el modo dinámico.
 * `createEngine` (inyectable en pruebas) por defecto carga portal/site/engine.mjs.
 */
export async function createDynamicSite({ ctx, logger = null, createEngine = null, warmup = warmupOf(), cacheMb = cacheMbOf(), cleanup = true } = {}) {
  const warn = m => (logger?.warn ? logger.warn(m) : console.warn(m));
  const info = m => (logger?.info ? logger.info(m) : process.env.PORTAL_SITE_DEBUG ? console.log(m) : undefined);
  let engine = null;
  let themeError = null;
  let closed = false;
  const startedAt = Date.now();
  let lastChange = null;
  let cleaned = null;
  let pruned = null;

  const base = await getSiteBase(ctx).catch(() => '/');
  try {
    const mod = createEngine ? { createSiteEngine: createEngine } : await import('../../site/engine.mjs');
    engine = await mod.createSiteEngine({ pool: ctx.pool, publicUrl: ctx.config?.publicUrl ?? '', base, cacheMb, log: info });
  } catch (e) {
    if (e.code !== 'ISP_THEME_MISSING') throw e;
    themeError = e.message;
    // Error claro al arrancar: el panel y la API siguen; el manual muestra un aviso (503) hasta compilar el tema.
    console.error(`[portal] ${e.message}`);
  }

  if (cleanup) {
    try {
      cleaned = cleanupStaticLeftovers({ log: m => console.log(m) });
    } catch (e) {
      warn(`[sitio] limpieza: ${e.message}`);
    }
    try {
      pruned = await prunePublishJobs(ctx.db);
      if (pruned.deleted || pruned.trimmed) console.log(`[sitio] publish_jobs: ${pruned.deleted} trabajos «publish» antiguos borrados, ${pruned.trimmed} registros recortados.`);
    } catch (e) {
      warn(`[sitio] poda de publish_jobs: ${e.message}`);
    }
  }

  if (engine) {
    const run = warmup === 'all' ? engine.warm({ all: true }) : engine.warm();
    run.then(
      w => info(`[sitio] calentamiento (${warmup}) en ${Math.round(w.ms)} ms`),
      e => warn(`[sitio] calentamiento: ${e.message}`),
    );
  }

  function markDirty(reason, { routes } = {}) {
    if (closed) return;
    const list = routes ?? routesFromReason(reason);
    lastChange = { route: list[0] ?? null, at: new Date().toISOString() };
    engine?.invalidate({ routes: list, reason });
  }

  async function status() {
    const [drafts, b] = await Promise.all([
      ctx.db.query("SELECT count(*)::int AS n FROM pages WHERE status = 'draft' AND deleted_at IS NULL"),
      getSiteBase(ctx).catch(() => base),
    ]);
    const s = engine?.stats();
    const out = {
      mode: 'dynamic',
      state: engine ? 'live' : 'error',
      live: !!engine,
      cache: s ? { pages: s.pages, compiled: s.compiled, htmlCached: s.htmlCached, bytes: s.bytes } : { pages: 0, compiled: 0, htmlCached: 0, bytes: 0 },
      themeBuiltAt: engine?.themeBuiltAt ?? null,
      lastChange: lastChange ?? (s?.lastChange ? { route: s.lastChange.route, at: s.lastChange.at } : null),
      drafts: drafts.rows[0].n,
      siteUrl: b,
    };
    if (themeError) out.message = themeError;
    return out;
  }

  /** POST /api/site/rebuild en dinámico: vacía la caché y la vuelve a calentar (sin trabajos). */
  async function rebuild() {
    if (!engine) {
      const e = new Error(themeError || 'El manual dinámico no está disponible.');
      e.statusCode = 503;
      throw e;
    }
    const cleared = engine.clear();
    engine.warm().catch(e => warn(`[sitio] calentamiento: ${e.message}`));
    return { ok: true, cleared };
  }

  return {
    mode: 'dynamic',
    get engine() {
      return engine;
    },
    themeError: () => themeError,
    markDirty,
    status,
    rebuild,
    /** «Actualizar el sistema»: no hay nada que construir (el contenido se dibuja al pedirlo). */
    async buildAndWait() {
      return { jobId: null, status: 'ok', skipped: true };
    },
    async init() {
      return null;
    },
    async staleReason() {
      return null;
    },
    async settingsChanged() {},
    startWatch: () => false,
    watchTick: async () => null,
    isBuilding: () => false,
    get builds() {
      return 0;
    },
    get failures() {
      return { n: 0, fp: null, retryAt: 0 };
    },
    metrics() {
      const s = engine?.stats() ?? null;
      const mem = process.memoryUsage();
      return {
        mode: 'dynamic',
        live: !!engine,
        warmup,
        cacheLimitMB: cacheMb,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        ...(s
          ? {
              pages: s.pages,
              compiled: s.compiled,
              htmlCached: s.htmlCached,
              bytes: s.bytes,
              compiledBytes: s.compiledBytes,
              htmlBytes: s.htmlBytes,
              evictions: s.evictions,
              compiles: s.counters.compiles,
              compileMs: s.counters.compileMs,
              avgCompileMs: s.counters.compiles ? Math.round(s.counters.compileMs / s.counters.compiles) : null,
              renders: s.counters.renders,
              renderMs: s.counters.renderMs,
              avgRenderMs: s.counters.renders ? Math.round(s.counters.renderMs / s.counters.renders) : null,
              htmlHits: s.counters.htmlHits,
              htmlMisses: s.counters.htmlMisses,
              sharedRequests: s.counters.shared,
              compileFailures: s.counters.compileFailures,
              unsafePages: s.counters.unsafe,
              compiler: { mode: s.compiler.mode, sandboxed: s.compiler.sandboxed, timeouts: s.compiler.timeouts, alive: s.compiler.alive },
              themeBuiltAt: s.themeBuiltAt,
            }
          : { message: themeError }),
        memoryMB: { rss: +(mem.rss / 1048576).toFixed(1), heapUsed: +(mem.heapUsed / 1048576).toFixed(1) },
        cleanup: cleaned ? { removed: cleaned.removed.length, freedMB: +(cleaned.bytes / 1048576).toFixed(1) } : null,
        pruned,
      };
    },
    close() {
      closed = true;
      engine?.close();
    },
  };
}
