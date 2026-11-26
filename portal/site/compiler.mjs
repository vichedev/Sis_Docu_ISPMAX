// Compilación MDX fuera del proceso principal, con límites. Modos (PORTAL_SITE_COMPILER):
//   process (def.) proceso hijo con el modelo de permisos de Node (compile-child.mjs): solo lectura de dependencias,
//                  sin escritura, sin procesos hijos, sin entorno ni BD. Si el Node no admite --permission, se avisa
//                  y el hijo corre igualmente sin entorno ni credenciales.
//   thread         hilo de trabajo (worker_threads) sin variables de entorno. Comparte el sistema de archivos.
//   inline         en el propio proceso (herramientas y pruebas; sin límite de tiempo real).
// Una sola compilación a la vez (cola), tiempo máximo por página (PORTAL_SITE_COMPILE_TIMEOUT_S, def. 30) y cierre
// tras un rato sin trabajo para devolver la memoria al sistema. Si una página agota el tiempo, se mata el proceso,
// esa página falla (aviso en su lugar) y las demás siguen en un proceso nuevo.
import { fork } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePage, configureMdx, transpileTs, LINKS_PLUGIN_FILE, REPO } from './mdx.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORTAL = path.resolve(HERE, '..');

const real = p => {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
};

/** Banderas del modelo de permisos para el hijo, o [] si este Node no lo admite. */
export function permissionFlags() {
  const flags = process.allowedNodeEnvironmentFlags;
  const perm = flags.has('--permission') ? '--permission' : flags.has('--experimental-permission') ? '--experimental-permission' : null;
  if (!perm) return [];
  const reads = [
    path.join(REPO, 'node_modules'),
    path.join(PORTAL, 'node_modules'),
    HERE,
    path.join(REPO, 'src', 'plugins'),
    path.join(PORTAL, 'server', 'routes', 'mdxSafety.mjs'),
    path.join(PORTAL, 'server', 'routes', 'validate.mjs'),
    path.join(PORTAL, 'server', 'routes', 'util.mjs'),
  ];
  const out = [perm, '--allow-addons'];
  for (const r of reads) {
    for (const p of new Set([r, real(r)].filter(Boolean))) {
      out.push(`--allow-fs-read=${p}`);
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) out.push(`--allow-fs-read=${path.join(p, '*')}`);
    }
  }
  return out;
}

export function createCompiler({ mode = process.env.PORTAL_SITE_COMPILER || 'process', timeoutMs, idleMs = 30_000, log = () => {} } = {}) {
  const tmo = timeoutMs ?? Math.max(2, Number(process.env.PORTAL_SITE_COMPILE_TIMEOUT_S) || 30) * 1000;
  let effective = ['process', 'thread', 'inline'].includes(mode) ? mode : 'process';
  const queue = [];
  let current = null; // { job, timer }
  let child = null; // proceso o hilo
  let ready = null; // promesa de arranque
  let idleTimer = null;
  let linksCode = null;
  const stats = { compiles: 0, failures: 0, timeouts: 0, restarts: 0, mode: effective, sandboxed: false };

  async function start() {
    linksCode ??= await transpileTs(LINKS_PLUGIN_FILE);
    if (effective === 'process') {
      const flags = permissionFlags();
      stats.sandboxed = flags.length > 0;
      if (!flags.length) log('[site] Aviso: este Node no admite --permission; el proceso de compilación corre sin el modelo de permisos.');
      const c = fork(path.join(HERE, 'compile-child.mjs'), [], {
        execArgv: [...flags, '--max-old-space-size=1024', '--no-warnings'],
        env: { NODE_ENV: 'production' },
        cwd: HERE,
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
        serialization: 'advanced',
        windowsHide: true,
      });
      let errText = '';
      c.stderr?.on('data', d => {
        if (errText.length < 4000) errText += String(d);
      });
      return attach(c, () => errText);
    }
    if (effective === 'thread') {
      const w = new Worker(new URL('./compile-worker.mjs', import.meta.url), { env: {}, resourceLimits: { maxOldGenerationSizeMb: 1024 } });
      return attach(w, () => '');
    }
    configureMdx({ linksNewTabCode: linksCode });
    return null;
  }

  function attach(c, errText) {
    child = c;
    return new Promise((resolve, reject) => {
      let ok = false;
      const onMsg = m => {
        if (m?.type === 'ready') {
          ok = true;
          resolve(c);
          return;
        }
        if (!current || m?.id !== current.job.id) return;
        const { job, timer } = current;
        clearTimeout(timer);
        current = null;
        stats.compiles++;
        if (m.ok) job.resolve({ code: m.code, pageMeta: m.pageMeta, ms: m.ms });
        else {
          stats.failures++;
          const e = new Error(m.error);
          if (m.problems) e.problems = m.problems;
          if (m.unsafe) e.code = 'ISP_CONTENT_UNSAFE';
          job.reject(e);
        }
        pump();
      };
      const onExit = code => {
        if (child === c) {
          child = null;
          ready = null;
        }
        if (!ok) {
          const msg = errText().split(/\r?\n/).find(l => /error/i.test(l)) || `código ${code}`;
          if (effective === 'process') {
            log(`[site] El proceso de compilación no arrancó (${msg.slice(0, 200)}); se usa un hilo de trabajo.`);
            effective = 'thread';
            stats.mode = 'thread';
            stats.sandboxed = false;
          }
          reject(new Error(`no arrancó el compilador: ${msg.slice(0, 200)}`));
          return;
        }
        if (current && current.child === c) {
          // Murió con una página en curso (memoria, señal): esa página falla; el resto sigue en otro proceso.
          const { job, timer } = current;
          clearTimeout(timer);
          current = null;
          stats.failures++;
          job.reject(new Error(`el compilador terminó inesperadamente (${code})`));
        }
        pump();
      };
      c.on('message', onMsg);
      c.on('exit', onExit);
      c.on('error', e => log(`[site] compilador: ${e.message}`));
      c.postMessage ? c.postMessage({ type: 'init', linksNewTabCode: linksCode }) : c.send({ type: 'init', linksNewTabCode: linksCode });
    });
  }

  function kill() {
    const c = child;
    child = null;
    ready = null;
    if (!c) return;
    try {
      if (c.terminate) c.terminate();
      else c.kill('SIGKILL');
    } catch {}
  }

  // El proceso/hilo solo mantiene vivo al principal mientras compila (una herramienta que espera una compilación no
  // debe terminar antes; un servidor cerrado o una prueba terminada no deben quedarse colgados por él).
  const hold = (c, on) => {
    try {
      if (on) {
        c.ref?.();
        c.channel?.ref?.();
        c.stderr?.ref?.();
      } else {
        c.unref?.();
        c.channel?.unref?.();
        c.stderr?.unref?.();
      }
    } catch {}
  };
  function scheduleIdle() {
    clearTimeout(idleTimer);
    if (!child || queue.length || current) return;
    hold(child, false);
    idleTimer = setTimeout(kill, idleMs);
    idleTimer.unref?.();
  }

  async function pump() {
    if (current || !queue.length) return scheduleIdle();
    clearTimeout(idleTimer);
    const job = queue.shift();
    if (effective === 'inline') {
      current = { job, timer: null };
      try {
        await (ready ??= start());
        job.resolve(await compilePage(job.source, job.filePath));
        stats.compiles++;
      } catch (e) {
        stats.failures++;
        job.reject(e);
      }
      current = null;
      return pump();
    }
    current = { job, timer: null }; // reservado antes de esperar: nunca dos páginas a la vez
    try {
      if (!child) ready = start();
      await ready;
    } catch {
      // Arranque fallido: se reintenta una vez (con el modo de respaldo si el proceso con permisos no arrancó).
      try {
        ready = start();
        await ready;
      } catch (e2) {
        current = null;
        stats.failures++;
        job.reject(e2);
        return pump();
      }
    }
    const c = child;
    if (!c) {
      current = null;
      queue.unshift(job);
      return pump();
    }
    const timer = setTimeout(() => {
      if (current?.job !== job) return;
      current = null;
      stats.timeouts++;
      stats.failures++;
      stats.restarts++;
      kill();
      job.reject(Object.assign(new Error(`la compilación superó ${Math.round(tmo / 1000)} s`), { code: 'ISP_COMPILE_TIMEOUT' }));
      pump();
    }, tmo);
    timer.unref?.();
    current = { job, timer, child: c };
    hold(c, true);
    const msg = { id: job.id, source: job.source, filePath: job.filePath };
    if (c.postMessage) c.postMessage(msg);
    else c.send(msg);
  }

  let seq = 0;
  let closed = false;
  return {
    compile(source, filePath) {
      if (closed) return Promise.reject(new Error('compilador cerrado'));
      return new Promise((resolve, reject) => {
        queue.push({ id: ++seq, source, filePath, resolve, reject });
        pump();
      });
    },
    close() {
      closed = true;
      clearTimeout(idleTimer);
      for (const j of queue.splice(0)) j.reject(new Error('compilador cerrado'));
      if (current) {
        clearTimeout(current.timer);
        current.job.reject(new Error('compilador cerrado'));
        current = null;
      }
      kill();
    },
    stats: () => ({ ...stats, queued: queue.length, busy: !!current, alive: !!child }),
  };
}
