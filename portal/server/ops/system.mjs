// Actualizar el SISTEMA (código) desde Git (Adenda 3). El contenido vive en la BD: aquí nunca se reimporta.
// Pasos: árbol limpio → git fetch + merge --ff-only → npm ci donde cambió package.json/lock → npm run migrate →
// compilar la interfaz → reconstruir el sitio → informar needsRestart. Nunca reset/checkout/clean/stash/push.
// Comandos: git (lista blanca de git.mjs) y npm por `node npm-cli.js` con lista blanca propia; sin shell.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { git, redactUrl } from './git.mjs';
import { run, safeEnv, npmCommand } from './proc.mjs';
import { ConflictError } from './jobs.mjs';
import { parseResult, readMeta, getSiteBase, opsPaths } from './publish.mjs';
import { getInternal } from '../settings.mjs';

const PROCESS_START = Date.now();

/** Modo de reinicio del despliegue: PORTAL_RESTART_MODE (`exit`|`respawn`) o `exit`. */
export const defaultRestartMode = (env = process.env) => (String(env.PORTAL_RESTART_MODE || '').trim() === 'respawn' ? 'respawn' : 'exit');

/**
 * Modo de actualización (PORTAL_UPDATE_MODE): `inline` (def.: fetch, merge, npm ci, migrate, compilar y reconstruir en el propio
 * proceso) o `entrypoint` (Docker: solo fetch + merge --ff-only; dependencias, migración y compilación las hace
 * docker/entrypoint.sh al reiniciar el contenedor, porque ahí las dependencias viven en volúmenes).
 */
export const defaultUpdateMode = (env = process.env) => (String(env.PORTAL_UPDATE_MODE || '').trim() === 'entrypoint' ? 'entrypoint' : 'inline');

/** Directorios (relativos al repo) con dependencias propias. */
export const NPM_DIRS = ['', 'portal', 'portal/web'];
/** Scripts de npm permitidos (además de `npm ci`). */
export const NPM_SCRIPTS = new Set(['migrate', 'web:build']);

export function npmAllowed(args) {
  return (args.length === 1 && args[0] === 'ci') || (args.length === 2 && args[0] === 'run' && NPM_SCRIPTS.has(args[1]));
}

/** Directorios donde hace falta `npm ci` según los archivos cambiados (rutas con "/"). */
export function npmDirsToInstall(files) {
  const set = new Set(files);
  return NPM_DIRS.filter(d => {
    const pre = d ? `${d}/` : '';
    return set.has(`${pre}package.json`) || set.has(`${pre}package-lock.json`);
  });
}

// Cambios que obligan a reconstruir el sitio publicado (theme/: tema propio de Rspress con Tailwind).
const SITE_RE = /^(rspress\.config\.ts|tsconfig\.json|package(-lock)?\.json|src\/|styles\/|theme\/|scripts\/|portal\/server\/(ops\/publish\.mjs|sync\/))/;
const WEB_RE = /^portal\/web\//;
const SERVER_RE = /^portal\/(server\/|db\/|package(-lock)?\.json$)/;

/** Qué hay que hacer según los archivos cambiados. */
export function plan(files) {
  return {
    npmDirs: npmDirsToInstall(files),
    web: files.some(f => WEB_RE.test(f)),
    site: files.some(f => SITE_RE.test(f)),
    restart: files.some(f => SERVER_RE.test(f)),
  };
}

/** Oculta credenciales de URLs (https://usuario:clave@host) en cualquier texto. */
export const redactText = s => String(s).replace(/(\w+:\/\/)[^@\/\s]+@/g, '$1***@');

function httpError(status, message, extra = {}) {
  const e = new Error(message);
  e.statusCode = status;
  Object.assign(e, extra);
  return e;
}

/** Espera a que el puerto quede libre (el proceso anterior lo está soltando). */
export async function waitPortFree(port, host = '127.0.0.1', { timeoutMs = 15_000, intervalMs = 250 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const libre = await new Promise(resolve => {
      const s = net.createServer();
      s.once('error', () => resolve(false));
      s.listen({ port, host, exclusive: true }, () => s.close(() => resolve(true)));
    });
    if (libre) return true;
    if (Date.now() - t0 > timeoutMs) return false;
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

/**
 * Escucha en el puerto reintentando unos segundos si está ocupado (reinicio `respawn`: el proceso anterior aún
 * lo tiene). `listen` es una función que intenta escuchar una vez (p. ej. `() => app.listen({port, host})`).
 */
export async function listenWithRetry(listen, { port, host = '127.0.0.1', timeoutMs = 15_000 } = {}) {
  const t0 = Date.now();
  for (let i = 0; ; i++) {
    if (i > 0 || process.env.PORTAL_RESPAWNED === '1') await waitPortFree(port, host, { timeoutMs: Math.max(500, timeoutMs - (Date.now() - t0)) });
    try {
      return await listen();
    } catch (e) {
      if (e.code !== 'EADDRINUSE' || Date.now() - t0 > timeoutMs) throw e;
    }
  }
}

/** Lanza una copia desacoplada de este proceso (mismos argumentos y entorno). Devuelve el pid. */
export function respawnSelf({ execPath = process.execPath, args = [...process.execArgv, ...process.argv.slice(1)], env = process.env, cwd = process.cwd() } = {}) {
  const child = spawn(execPath, args, {
    cwd,
    env: { ...env, PORTAL_RESPAWNED: '1' },
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: false,
  });
  child.unref();
  return child.pid;
}

export function createSystem({ ctx, jobs, site, gitOps, exec = run, restarter = null, updateMode: updateModeOpt = null }) {
  const restartMode = async () => ((await getInternal(ctx, 'restart_mode')) === 'respawn' ? 'respawn' : 'exit');
  const updateMode = () => (updateModeOpt === 'inline' || updateModeOpt === 'entrypoint' ? updateModeOpt : defaultUpdateMode());

  /** npm con lista blanca: `node npm-cli.js ci` o `node npm-cli.js run <script permitido>` (o `npm` del PATH en Linux). */
  async function npm(dir, args, log, { extraEnv = {}, redact = [] } = {}) {
    if (!npmAllowed(args)) throw new Error(`Orden npm no permitida: npm ${args.join(' ')}`);
    const cmd = npmCommand();
    if (!cmd) throw new Error('No se encontró npm-cli.js junto a Node (defina PORTAL_NPM_CLI).');
    const env = safeEnv({ FORCE_COLOR: '0', NO_COLOR: '1', npm_config_update_notifier: 'false', npm_config_fund: 'false', npm_config_audit: 'false', ...extraEnv });
    log(`$ npm ${args.join(' ')}   (en ${dir})`);
    const r = await exec(cmd.cmd, [...cmd.args, ...args], { cwd: dir, env, log, timeoutMs: 20 * 60_000, capture: false, redact });
    if (r.code !== 0) throw new Error(`npm ${args.join(' ')} terminó con código ${r.code}.`);
  }

  /** GET /api/system/info (solo lectura; sin secretos, usuarios de la BD ni rutas absolutas del servidor). */
  async function info() {
    const cfg = ctx.config || {};
    const st = await gitOps.status({ fetch: false }).catch(() => null);
    const c = st?.initialized ? st.lastCommit : null;
    let database = { connected: false, name: null, serverVersion: null };
    try {
      const r = await ctx.db.query('SELECT current_database() AS name, current_setting($1) AS v', ['server_version']);
      database = { connected: true, name: r.rows[0]?.name ?? null, serverVersion: r.rows[0]?.v ?? null };
    } catch {}
    const meta = await readMeta();
    const base = await getSiteBase(ctx);
    const exists = fs.existsSync(path.join(opsPaths().dataSite, 'index.html'));
    let docker = String(process.env.PORTAL_DOCKER || '').trim() === '1';
    if (!docker) docker = fs.existsSync('/.dockerenv');
    const v = await version({ fetch: false });
    return {
      version: c ? { commit: c.hash, shortCommit: c.short, branch: st.branch, date: c.date, subject: c.subject } : null,
      runtime: { node: process.version, platform: process.platform, docker, uptimeSec: Math.round(process.uptime()) },
      database,
      site: { base, exists, pages: meta?.pages ?? null, lastBuild: meta?.finishedAt ?? null, publicUrl: cfg.publicUrl || null },
      access: {
        adminEnabled: cfg.adminEnabled !== false,
        adminIpRestricted: !!cfg.adminIps && cfg.adminIps.any === false,
        behindProxy: !!cfg.trustProxy,
        cookieSecure: cfg.cookieSecure === true ? 'on' : 'auto',
      },
      update: { mode: updateMode(), canUpdate: v.canUpdate, ...(v.message ? { message: v.message } : {}) },
      // Solo una pista: nunca la ruta del servidor.
      dataDir: process.env.PORTAL_DATA_DIR ? 'volumen de datos' : 'data',
      restartMode: await restartMode(),
    };
  }

  async function lastUpdate() {
    const job = await jobs.latest('git_update');
    if (!job) return null;
    return { jobId: job.id, status: job.status, startedAt: job.started_at, finishedAt: job.finished_at, result: parseResult(job.log) };
  }

  async function needsRestartNow() {
    const lu = await lastUpdate();
    return !!(lu?.status === 'ok' && lu.result?.needsRestart && lu.finishedAt && new Date(lu.finishedAt).getTime() > PROCESS_START);
  }

  /** GET /api/system/version */
  async function version({ fetch = true } = {}) {
    const s = await gitOps.status({ fetch });
    const base = { updateMode: updateMode(), restartMode: await restartMode(), needsRestart: await needsRestartNow(), lastUpdate: await lastUpdate() };
    if (!s.initialized) {
      return {
        initialized: false,
        branch: null,
        commit: null,
        subject: null,
        date: null,
        clean: null,
        behind: null,
        ahead: null,
        canUpdate: false,
        message: s.message,
        ...base,
      };
    }
    const clean = !s.dirty;
    const reasons = [];
    if (s.sourceError) reasons.push(s.sourceError);
    else if (s.fetchError) reasons.push(s.fetchError);
    if (!clean) reasons.push(`Hay ${s.changedCount} cambios locales sin confirmar: no se actualiza para no perderlos.`);
    if (s.ahead > 0) reasons.push(`La rama local tiene ${s.ahead} commits que no están en el remoto; no se puede avanzar sin fusionar.`);
    const canUpdate = reasons.length === 0 && s.fetched && s.behind > 0;
    if (!reasons.length && s.behind === 0) reasons.push('El sistema está al día.');
    return {
      initialized: true,
      branch: s.branch,
      commit: s.lastCommit?.hash ?? null,
      shortCommit: s.lastCommit?.short ?? null,
      subject: s.lastCommit?.subject ?? null,
      date: s.lastCommit?.date ?? null,
      clean,
      behind: s.behind,
      ahead: s.ahead,
      canUpdate,
      ...(reasons.length ? { message: reasons.join(' ') } : {}),
      changedFiles: clean ? [] : s.changedFiles.slice(0, 20),
      ...base,
    };
  }

  /** POST /api/system/update → { jobId } */
  async function update(userId) {
    const cfg = await gitOps.precheck(); // 409 sin tocar nada: sin repo, árbol sucio, sin rama/remoto/upstream
    const portalDir = path.join(cfg.repo, 'portal');
    const mode = updateMode();
    const { jobId } = await jobs.start(
      'git_update',
      userId,
      async ({ log: rawLog }) => {
        const log = (...p) => rawLog(...p.map(x => (typeof x === 'string' ? redactText(x) : x)));
        const { repo, branch, remote, upstream } = cfg;
        const ref = `refs/remotes/${remote.name}/${upstream}`;
        const result = { ok: false, updateMode: mode, updated: false, from: null, to: null, files: 0, steps: [], failedStep: null, merged: false, needsRestart: false };
        const fin = () => log(`RESULTADO: ${JSON.stringify(result)}`);
        let step = null;
        const begin = (n, name) => {
          step = name;
          log(`Paso ${n}/7 · ${name}`);
        };
        const done = (status, detail) => result.steps.push({ step, status, ...(detail ? { detail } : {}) });
        try {
          begin(1, 'Comprobar el árbol de trabajo');
          const st = await git(repo, ['status', '--porcelain=v2', '--branch']);
          if (!st.ok) throw new Error(`git status falló: ${st.stderr}`);
          const changed = st.stdout.split(/\r?\n/).filter(l => /^[12u] /.test(l));
          if (changed.length) throw new Error(`Hay ${changed.length} cambios locales sin confirmar; no se actualiza para no perderlos.`);
          log('Árbol limpio.');
          done('ok');

          begin(2, `Traer y avanzar (git fetch ${remote.name} ${upstream} + git merge --ff-only)`);
          const f = await git(repo, ['fetch', '--no-tags', remote.name, upstream], { timeoutMs: 120_000 });
          if (!f.ok) throw new Error(`No se pudo contactar con el remoto "${remote.name}" (${f.killed ? 'tiempo agotado' : f.stderr.split(/\r?\n/).pop()}). No se modificó nada.`);
          const v = await git(repo, ['rev-parse', '--verify', '--quiet', ref]);
          if (!v.ok) throw new Error(`No existe la rama remota ${remote.name}/${upstream}. No se modificó nada.`);
          const c = await git(repo, ['rev-list', '--left-right', '--count', `HEAD...${ref}`]);
          const [ahead, behind] = c.stdout.trim().split(/\s+/).map(Number);
          log(`Commits por detrás: ${behind} · por delante: ${ahead}`);
          if (behind === 0) {
            log('El sistema ya está al día; no hay nada que hacer.');
            done('ok', 'al día');
            result.ok = true;
            fin();
            return result;
          }
          if (ahead > 0) throw new Error('La rama local tiene commits que no están en el remoto; no se puede avanzar sin fusionar. No se modificó nada.');
          const from = (await git(repo, ['rev-parse', 'HEAD'])).stdout.trim();
          const m = await git(repo, ['merge', '--ff-only', ref], { timeoutMs: 120_000 });
          if (m.stdout.trim()) log(m.stdout.trim());
          if (!m.ok) throw new Error(`git merge --ff-only falló: ${m.stderr}`);
          const to = (await git(repo, ['rev-parse', 'HEAD'])).stdout.trim();
          Object.assign(result, { merged: true, updated: true, from, to });
          const d = await git(repo, ['diff', '--name-only', from, to]);
          const files = d.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          result.files = files.length;
          log(`Avanzado ${from.slice(0, 8)} → ${to.slice(0, 8)}: ${files.length} archivos cambiados.`);
          for (const p of files.slice(0, 100)) log(`  ${p}`);
          const todo = plan(files);
          result.needsRestart = todo.restart;
          done('ok', `${from.slice(0, 8)}→${to.slice(0, 8)}`);

          if (mode === 'entrypoint') {
            // Docker: dependencias, migración y compilación las aplica docker/entrypoint.sh al reiniciar el contenedor.
            for (const [n, name] of [[3, 'Instalar dependencias'], [4, 'Actualizar el esquema de la base'], [5, 'Compilar la interfaz del portal'], [6, 'Reconstruir el sitio']]) {
              begin(n, name);
              done('omitido', 'se aplica al reiniciar');
            }
            result.needsRestart = true;
            begin(7, 'Reinicio');
            log('Dependencias, migración y compilación se aplicarán al reiniciar.');
            log('Hace falta reiniciar el portal (Sistema → Reiniciar): al arrancar, el contenedor instala dependencias, migra y compila lo que haga falta.');
            done('ok');
            result.ok = true;
            await ctx.audit(userId ?? null, 'system.update', repo, { from, to, files: files.length, needsRestart: true, updateMode: mode }).catch(() => {});
            fin();
            return result;
          }

          begin(3, 'Instalar dependencias (npm ci) donde cambiaron');
          if (!todo.npmDirs.length) log('Ningún package.json/package-lock.json cambió; no hace falta npm ci.');
          for (const rel of todo.npmDirs) {
            const dir = rel ? path.join(repo, ...rel.split('/')) : repo;
            if (site?.isBuilding?.()) {
              log('Esperando a que termine la construcción del sitio en curso…');
              for (let i = 0; site.isBuilding() && i < 2400; i++) await new Promise(r => setTimeout(r, 500));
            }
            await npm(dir, ['ci'], log);
          }
          done('ok', todo.npmDirs.map(d => d || '.').join(', ') || 'nada');

          begin(4, 'Actualizar el esquema de la base (npm run migrate)');
          if (fs.existsSync(path.join(portalDir, 'package.json'))) {
            const dbUrl = ctx.databaseUrl || process.env.DATABASE_URL;
            let pass = '';
            try {
              pass = decodeURIComponent(new URL(dbUrl).password || '');
            } catch {}
            await npm(portalDir, ['run', 'migrate'], log, { extraEnv: dbUrl ? { DATABASE_URL: dbUrl } : {}, redact: [dbUrl, pass].filter(Boolean) });
            done('ok');
          } else {
            log('No existe portal/package.json en el repositorio; se omite.');
            done('omitido');
          }

          begin(5, 'Compilar la interfaz del portal (npm run web:build)');
          const webDist = path.join(portalDir, 'web', 'dist', 'index.html');
          if (todo.web || todo.npmDirs.includes('portal/web') || (fs.existsSync(path.join(portalDir, 'web', 'package.json')) && !fs.existsSync(webDist))) {
            await npm(portalDir, ['run', 'web:build'], log);
            result.needsRestart = true; // el servidor lee web/dist al arrancar
            done('ok');
          } else {
            log('La interfaz no cambió; no se recompila.');
            done('omitido');
          }

          begin(6, 'Reconstruir el sitio');
          if (todo.site && site) {
            const b = await site.buildAndWait(userId, { reason: `actualización del sistema ${from.slice(0, 8)}→${to.slice(0, 8)}` });
            log(`Construcción #${b.jobId}: ${b.status}`);
            if (b.status !== 'ok') throw new Error(`La construcción #${b.jobId} falló (ver su log); se conserva el sitio anterior.`);
            done('ok', `trabajo ${b.jobId}`);
          } else {
            log('Ningún cambio afecta a la construcción del sitio; no se reconstruye.');
            done('omitido');
          }

          begin(7, 'Reinicio');
          log(result.needsRestart ? 'Cambió código del servidor o de la interfaz: hace falta reiniciar el portal (Sistema → Reiniciar).' : 'No hace falta reiniciar.');
          done('ok');
          result.ok = true;
          await ctx.audit(userId ?? null, 'system.update', repo, { from, to, files: files.length, needsRestart: result.needsRestart, updateMode: mode }).catch(() => {});
          fin();
          return result;
        } catch (e) {
          result.failedStep = step;
          if (result.merged) result.needsRestart = false; // no se reinicia tras un fallo
          done('error', redactText(e.message));
          log(`Falló el paso «${step}». No se reinicia; el sitio anterior sigue publicándose.`);
          fin();
          throw new Error(`Falló el paso «${step}»: ${redactText(e.message)}`);
        }
      },
      'Ya hay una actualización del sistema en curso.',
    );
    return { jobId };
  }

  /** POST /api/system/restart {confirm:"REINICIAR", force?} */
  async function restart(userId, { confirm, force = false } = {}) {
    if (confirm !== 'REINICIAR') throw httpError(400, 'Para reiniciar escriba exactamente REINICIAR en la confirmación.');
    if (site?.isBuilding?.() || (await jobs.anyRunning())) throw new ConflictError('Hay un trabajo en curso (construcción, actualización o respaldo); espere a que termine.');
    const lu = await lastUpdate();
    if (!force && lu?.status === 'error' && lu.result?.merged) {
      throw httpError(409, `La última actualización falló en el paso «${lu.result.failedStep}» después de avanzar el código: corríjalo y actualice de nuevo antes de reiniciar (o envíe force:true).`, {
        jobId: lu.jobId,
      });
    }
    const mode = await restartMode();
    await ctx.audit(userId ?? null, 'system.restart', mode, null).catch(() => {});
    if (restarter) setTimeout(() => Promise.resolve(restarter(mode)).catch(() => {}), 300).unref?.();
    return {
      ok: true,
      mode,
      message:
        mode === 'respawn'
          ? 'Reiniciando: se lanza un proceso nuevo y este se cierra. Vuelva a cargar en unos segundos.'
          : 'El portal se cierra; el servicio que lo gestiona (Docker, pm2, servicio del sistema) debe volver a arrancarlo.',
    };
  }

  return { version, info, update, restart, lastUpdate, redactUrl };
}
