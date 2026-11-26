// Actualización automática del sitio (Adenda 3): las rutas que cambian algo visible llaman a markDirty(motivo);
// se espera `auto_publish_delay` segundos sin cambios (debounce) y se construye una sola vez. Nunca hay dos
// construcciones a la vez: si llega un cambio durante una, se programa otra al terminar. Si el build falla,
// el sitio anterior sigue sirviéndose (lo garantiza el publicador) y el estado queda en `error` sin reintentar
// en bucle: el siguiente cambio vuelve a intentarlo.
import fs from 'node:fs';
import path from 'node:path';
import { opsPaths, readMeta, parseResult, getSiteBase, DEFAULT_BASE } from './publish.mjs';
import { ConflictError } from './jobs.mjs';
import { codeFingerprint } from './codefp.mjs';
import { getInternal } from '../settings.mjs';
import { normDrive } from '../env.mjs';
import { routesFromReason } from './site-dynamic.mjs';

const MAX_REASONS = 50;
export const DEFAULT_DELAY_S = 8;
const MAX_BACKOFF_MS = 60 * 60_000;
/** Intervalo de la vigilancia periódica (PORTAL_SITE_WATCH_S, def. 45 s; 0 = apagada; mín. 5 s). */
export const watchMs = (env = process.env) => {
  const s = String(env.PORTAL_SITE_WATCH_S ?? '').trim();
  if (s === '') return 45_000;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(5, n) * 1000;
};

/** PORTAL_SITE_AUTO=off desactiva las construcciones automáticas en este proceso (pruebas de la API). */
export const autoDisabledByEnv = () => /^(0|off|false|no)$/i.test(String(process.env.PORTAL_SITE_AUTO || '').trim());

const clampDelay = v => {
  const n = Number(v);
  return Math.min(120, Math.max(1, Number.isFinite(n) ? n : DEFAULT_DELAY_S));
};
const errorLine = logText => {
  const m = String(logText || '').match(/^ERROR: (.+)$/m);
  return m ? m[1].slice(0, 500) : null;
};

export function createSite({ ctx, jobs, publisher, servedBase = DEFAULT_BASE, logger = null }) {
  let pending = []; // motivos aún no construidos
  let timer = null;
  let nextRunAt = null;
  let building = null; // { jobId, startedAt, done }
  let rerun = false;
  let closed = false;
  let preJobError = null; // fallo antes de crear el trabajo (no queda en publish_jobs)
  let builds = 0; // construcciones lanzadas por este proceso (para pruebas y diagnóstico)
  // Fallos seguidos: la vigilancia periódica no reintenta en bucle (espera exponencial o hasta que cambie algo).
  const failures = { n: 0, fp: null, retryAt: 0 };
  let watchTimer = null;
  let watchBusy = false;
  let lastChange = null;

  const warn = m => logger?.warn?.(`[sitio] ${m}`);

  async function autoOn() {
    if (autoDisabledByEnv()) return false;
    return (await ctx.getSetting('auto_publish', true)) !== false;
  }
  const delayMs = async () => clampDelay(await ctx.getSetting('auto_publish_delay', DEFAULT_DELAY_S)) * 1000;

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
    nextRunAt = null;
  }

  function addReasons(list) {
    for (const r of list) {
      const s = String(r || 'cambio').slice(0, 200);
      if (!pending.includes(s)) pending.push(s);
    }
    if (pending.length > MAX_REASONS) pending = pending.slice(-MAX_REASONS);
  }

  /** Programa (o reprograma: debounce) una construcción automática. */
  async function schedule({ delay } = {}) {
    if (closed) return;
    if (!(await autoOn())) {
      clearTimer();
      return;
    }
    const d = delay ?? (await delayMs());
    if (closed) return;
    if (building) {
      rerun = true;
      return;
    }
    clearTimer();
    nextRunAt = Date.now() + d;
    timer = setTimeout(() => {
      timer = null;
      nextRunAt = null;
      runBuild({ trigger: 'auto' }).catch(e => warn(`no se pudo lanzar la construcción: ${e.message}`));
    }, d);
    timer.unref?.();
  }

  /**
   * Marca el sitio como desfasado. No espera nada (las rutas no se bloquean). Un cambio que no es visible
   * (un borrador) NO debe llamar aquí: lo decide cada ruta.
   */
  function markDirty(reason) {
    if (closed) return;
    lastChange = { route: routesFromReason(reason)[0] ?? null, at: new Date().toISOString() };
    addReasons([reason]);
    if (building) {
      rerun = true;
      return;
    }
    schedule().catch(e => warn(e.message));
  }

  async function runBuild({ trigger = 'auto', userId = null } = {}) {
    if (building) {
      rerun = true;
      throw new ConflictError('Ya hay una construcción del sitio en curso.');
    }
    clearTimer();
    const reasons = pending;
    pending = [];
    rerun = false;
    const slot = { jobId: null, startedAt: new Date().toISOString(), done: null };
    building = slot; // reserva síncrona: nunca dos a la vez dentro del proceso
    let started;
    try {
      started = await publisher.publish(userId, { reasons, trigger });
    } catch (e) {
      building = null;
      addReasons(reasons);
      if (e.statusCode === 409) {
        // Otro proceso (u otra ruta) está construyendo con la misma BD: se reintenta más tarde.
        schedule().catch(() => {});
      } else {
        preJobError = { status: 'error', finishedAt: new Date().toISOString(), durationMs: 0, pages: null, jobId: null, error: e.message };
        pending = [];
      }
      throw e;
    }
    builds++;
    slot.jobId = started.jobId;
    const fpAtStart = await fingerprint().catch(() => null);
    slot.done = started.done.then(res => {
      building = null;
      preJobError = null;
      if (res?.status === 'error') {
        warn(`la construcción #${slot.jobId} falló; se conserva el sitio anterior.`);
        failures.n++;
        failures.fp = fpAtStart;
        failures.retryAt = Date.now() + Math.min(MAX_BACKOFF_MS, watchMs() * 2 ** failures.n);
      } else if (res?.status === 'ok') {
        failures.n = 0;
        failures.fp = null;
        failures.retryAt = 0;
      }
      if (!closed && (rerun || pending.length)) {
        rerun = false;
        schedule().catch(() => {});
      }
      return res;
    });
    return { jobId: started.jobId, done: slot.done };
  }

  /** POST /api/site/rebuild: construye ya. 409 (con jobId) si ya hay una en curso. */
  async function rebuild(userId, { trigger = 'manual', reason = 'reconstrucción manual' } = {}) {
    if (building) {
      const e = new ConflictError('Ya hay una construcción del sitio en curso.');
      e.jobId = building.jobId;
      throw e;
    }
    addReasons([reason]);
    const r = await runBuild({ trigger, userId });
    return r;
  }

  /** Para la actualización del sistema: espera a la que esté en curso y lanza otra; resuelve con su resultado. */
  async function buildAndWait(userId, { reason = 'actualización del sistema', trigger = 'system' } = {}) {
    for (let i = 0; building && i < 50; i++) await (building.done ?? new Promise(r => setTimeout(r, 500))).catch(() => {});
    addReasons([reason]);
    const r = await runBuild({ trigger, userId });
    const res = await r.done;
    return { jobId: r.jobId, ...res };
  }

  async function lastBuildFromDb() {
    const r = await ctx.db.query(
      `SELECT id, status, log, started_at, finished_at FROM publish_jobs
        WHERE kind = 'publish' AND status <> 'running' ORDER BY id DESC LIMIT 1`,
    );
    const j = r.rows[0];
    if (!j) return null;
    const res = parseResult(j.log);
    const out = {
      status: j.status,
      finishedAt: j.finished_at,
      durationMs: j.finished_at && j.started_at ? new Date(j.finished_at) - new Date(j.started_at) : null,
      pages: res?.pages ?? null,
      jobId: j.id,
    };
    if (j.status === 'error') out.error = errorLine(j.log);
    return out;
  }

  async function status() {
    // Un `running` de un proceso que ya no existe no debe verse como "construyendo" para siempre.
    if (!building) await jobs?.reapStale?.('publish').catch(() => {});
    const [lastDb, drafts, runningDb, base, auto, delay] = await Promise.all([
      lastBuildFromDb(),
      ctx.db.query("SELECT count(*)::int AS n FROM pages WHERE status = 'draft' AND deleted_at IS NULL"),
      building ? null : ctx.db.query("SELECT id, started_at FROM publish_jobs WHERE kind = 'publish' AND status = 'running' ORDER BY id DESC LIMIT 1"),
      getSiteBase(ctx),
      autoOn(),
      delayMs(),
    ]);
    let lastBuild = lastDb;
    if (preJobError && (!lastDb || new Date(preJobError.finishedAt) > new Date(lastDb.finishedAt))) lastBuild = preJobError;
    let b = building ? { jobId: building.jobId, startedAt: building.startedAt } : null;
    if (!b && runningDb?.rows[0]) b = { jobId: runningDb.rows[0].id, startedAt: runningDb.rows[0].started_at };
    const state = b ? 'building' : pending.length ? 'pending' : lastBuild?.status === 'error' ? 'error' : 'idle';
    const siteUrl = base;
    // servedBase puede ser una función (el servidor sirve el sitio con la base con la que se generó: sin reinicios).
    const served = typeof servedBase === 'function' ? servedBase() : servedBase;
    const meta = await readMeta().catch(() => null);
    return {
      // Contrato común con el modo dinámico (ops/site-dynamic.mjs).
      mode: 'static',
      live: false,
      cache: { pages: meta?.pages ?? 0, compiled: 0, htmlCached: 0, bytes: 0 },
      themeBuiltAt: null,
      lastChange,
      state,
      pendingReasons: [...pending],
      nextRunInMs: nextRunAt ? Math.max(0, nextRunAt - Date.now()) : null,
      building: b,
      lastBuild,
      drafts: drafts.rows[0].n,
      siteUrl,
      // extras (no rompen la forma del contrato)
      autoPublish: auto,
      delayMs: delay,
      siteExists: fs.existsSync(path.join(opsPaths().dataSite, 'index.html')),
      servedBase: served,
      restartRequired: typeof servedBase === 'function' ? false : (base !== '/' ? base : null) !== servedBase,
    };
  }

  /** ¿Está el sitio desfasado respecto a la BD? Devuelve el motivo o null. */
  async function staleReason() {
    const { dataSite } = opsPaths();
    const published = (await ctx.db.query("SELECT count(*)::int AS n FROM pages WHERE status = 'published' AND deleted_at IS NULL")).rows[0].n;
    if (!fs.existsSync(path.join(dataSite, 'index.html'))) return published > 0 ? 'el sitio publicado no existe todavía' : null;
    const meta = await readMeta();
    // El sitio se generó con otra base (p. ej. /manual/ antes de que la base por defecto pasara a /).
    if (meta?.base && meta.base !== (await getSiteBase(ctx))) return `el sitio se generó con la base ${meta.base}`;
    // El tema o el código del sistema cambió (p. ej. tras «Actualizar el sistema»): el HTML publicado es de la versión anterior.
    if (meta) {
      const repoRoot = normDrive(path.resolve((await getInternal(ctx, 'repo_path')) || ctx.repoRoot));
      if (meta.code !== codeFingerprint(repoRoot)) return 'el tema o el código del manual cambió desde la última construcción';
    }
    let since = null;
    if (meta?.startedAt) since = new Date(meta.startedAt);
    else if (meta?.finishedAt) since = new Date(new Date(meta.finishedAt).getTime() - (meta.durationMs || 0));
    if (!since || Number.isNaN(since.getTime())) {
      const r = await ctx.db.query("SELECT started_at FROM publish_jobs WHERE kind = 'publish' AND status = 'ok' ORDER BY id DESC LIMIT 1");
      since = r.rows[0]?.started_at ?? null;
    }
    if (!since) return 'no consta cuándo se construyó el sitio';
    const r = await ctx.db.query(
      `SELECT (SELECT count(*) FROM pages WHERE status = 'published' AND updated_at > $1)
            + (SELECT count(*) FROM page_revisions WHERE created_at > $1 AND snapshot->>'status' = 'published')
            + (SELECT count(*) FROM tours WHERE updated_at > $1 AND (status = 'published' OR deleted_at IS NOT NULL))
            + (SELECT count(*) FROM assets WHERE updated_at > $1)
            + (SELECT count(*) FROM site_files WHERE updated_at > $1)
            + (SELECT count(*) FROM settings WHERE key = 'site_base' AND updated_at > $1) AS n`,
      [since],
    );
    return Number(r.rows[0].n) > 0 ? 'cambios guardados después de la última construcción' : null;
  }

  /** Al arrancar: si el sitio está desfasado (cambios sin construir antes de un reinicio), programa un build. */
  async function init() {
    if (!(await autoOn())) return null;
    const reason = await staleReason();
    if (reason) {
      addReasons([`al arrancar: ${reason}`]);
      await schedule();
    }
    return reason;
  }

  /** Huella barata del contenido: la última modificación de lo que puede cambiar el sitio. */
  async function fingerprint() {
    const r = await ctx.db.query(
      `SELECT GREATEST(
          (SELECT max(updated_at) FROM pages), (SELECT max(created_at) FROM page_revisions),
          (SELECT max(updated_at) FROM assets), (SELECT max(updated_at) FROM tours),
          (SELECT max(updated_at) FROM site_files), (SELECT max(updated_at) FROM settings WHERE key = 'site_base')
        ) AS fp,
        (SELECT count(*) FROM pages WHERE status = 'published' AND deleted_at IS NULL) AS n`,
    );
    const row = r.rows?.[0];
    if (!row) return null;
    return `${row.fp ? new Date(row.fp).toISOString() : '-'}|${row.n}`;
  }

  /**
   * Vigilancia periódica (cada `PORTAL_SITE_WATCH_S` s, def. 45; 0 = apagada): detecta cambios escritos en la BD
   * por otro proceso (p. ej. `npm run content:import` por consola) y llama a markDirty. Respeta `auto_publish`,
   * no actúa si hay algo pendiente o construyéndose y, tras un fallo, no reintenta hasta que cambie el contenido o
   * pase la espera exponencial (2^n × intervalo, máx. 1 h).
   */
  async function watchTick() {
    if (closed || watchBusy || building || pending.length || timer) return null;
    watchBusy = true;
    try {
      if (!(await autoOn())) return null;
      const reason = await staleReason();
      if (!reason) return null;
      if (failures.n > 0) {
        const fp = await fingerprint().catch(() => null);
        if (fp === failures.fp && Date.now() < failures.retryAt) return null;
      }
      if (closed || building || pending.length) return null;
      markDirty('contenido cambiado fuera del servidor');
      return reason;
    } catch (e) {
      warn(`vigilancia: ${e.message}`);
      return null;
    } finally {
      watchBusy = false;
    }
  }

  function startWatch(intervalMs = watchMs()) {
    if (watchTimer || !intervalMs) return false;
    watchTimer = setInterval(() => watchTick().catch(() => {}), intervalMs);
    watchTimer.unref?.();
    return true;
  }

  /** Reprograma tras cambiar `auto_publish` o `auto_publish_delay`. */
  async function settingsChanged() {
    if (pending.length && !building) await schedule();
    else if (!(await autoOn())) clearTimer();
  }

  function close() {
    closed = true;
    clearTimer();
    if (watchTimer) clearInterval(watchTimer);
    watchTimer = null;
  }

  return {
    markDirty,
    rebuild,
    buildAndWait,
    status,
    init,
    staleReason,
    settingsChanged,
    close,
    watchTick,
    startWatch,
    fingerprint,
    get failures() {
      return { ...failures };
    },
    isBuilding: () => !!building,
    get builds() {
      return builds;
    },
  };
}
