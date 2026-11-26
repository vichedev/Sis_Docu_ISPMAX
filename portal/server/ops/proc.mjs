// Ejecución de procesos hijos sin shell (lista de argumentos), con salida volcada al log.
// Funciona igual en Windows y en Linux (imagen node:alpine): npm se lanza como `node npm-cli.js …` (sin npm.cmd
// ni shell) y, si no se encuentra npm-cli.js, en Linux/macOS se usa `npm` del PATH.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Entorno del hijo sin credenciales del portal (las de PG se añaden explícitamente donde hacen falta). */
export function safeEnv(extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(DATABASE_URL|TEST_DATABASE_URL|PORTAL_ADMIN_PASSWORD|PORTAL_ADMIN_USER)$/.test(k)) continue;
    if (/^PG(PASSWORD|PASSFILE|HOST|PORT|USER|DATABASE|SERVICE|SSLMODE)$/.test(k)) continue;
    env[k] = v;
  }
  return { ...env, ...extra };
}

/** Procesos hijos vivos (para detenerlos en un apagado ordenado). */
const children = new Set();

/** Detiene un hijo y, en POSIX, todo su grupo (npm → node rspress → …). */
function killTree(child, signal = 'SIGTERM') {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (child.__group && process.platform !== 'win32') process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    try {
      child.kill(signal);
    } catch {}
  }
}

/** Apagado: detiene todos los procesos hijos en curso. Devuelve cuántos había. */
export function killChildren(signal = 'SIGTERM') {
  const n = children.size;
  for (const c of children) killTree(c, signal);
  return n;
}
export const runningChildren = () => children.size;

/**
 * Lanza `cmd args` sin shell. `log(line)` recibe cada línea de stdout/stderr (si se pasa).
 * Resuelve `{ code, stdout, stderr }`; nunca rechaza por código distinto de 0 (lo decide quien llama).
 */
export function run(cmd, args, { cwd, env, log, timeoutMs = 10 * 60_000, capture = true, redact = [] } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    // En POSIX el hijo encabeza su propio grupo para poder detener también a sus nietos (timeout o apagado).
    const group = process.platform !== 'win32';
    try {
      child = spawn(cmd, args, { cwd, env: env ?? safeEnv(), shell: false, windowsHide: true, detached: group });
    } catch (e) {
      reject(e);
      return;
    }
    child.__group = group;
    children.add(child);
    let stdout = '';
    let stderr = '';
    const limpia = s => redact.reduce((t, r) => (r ? t.split(r).join('***') : t), s);
    const lineas = (prefix, store) => {
      let resto = '';
      return chunk => {
        const text = chunk.toString('utf8');
        if (capture) store(text);
        if (!log) return;
        resto += text;
        const parts = resto.split(/\r?\n/);
        resto = parts.pop();
        for (const p of parts) if (p.trim()) log(limpia(prefix + p));
      };
    };
    child.stdout.on('data', lineas('', t => (stdout += t)));
    child.stderr.on('data', lineas('', t => (stderr += t)));
    const timer = setTimeout(() => {
      log?.(`Tiempo agotado (${Math.round(timeoutMs / 1000)} s): se detiene el proceso.`);
      killTree(child);
    }, timeoutMs);
    child.on('error', e => {
      clearTimeout(timer);
      children.delete(child);
      reject(e);
    });
    child.on('close', code => {
      clearTimeout(timer);
      children.delete(child);
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Candidatos de npm-cli.js, en orden: PORTAL_NPM_CLI, npm_execpath (si es npm), junto a Node al estilo Windows
 * (`<dir de node>/node_modules/npm/bin/npm-cli.js`) y al estilo Linux/macOS
 * (`<dir de node>/../lib/node_modules/npm/bin/npm-cli.js`, p. ej. /usr/local/lib/… en node:alpine), también con
 * la ruta real de Node si `execPath` es un enlace simbólico.
 */
export function npmCliCandidates({ execPath = process.execPath, env = process.env, platform = process.platform, realpath = p => fs.realpathSync(p) } = {}) {
  const P = platform === 'win32' ? path.win32 : path.posix;
  const execs = [execPath];
  try {
    const real = realpath(execPath);
    if (real && real !== execPath) execs.push(real);
  } catch {}
  const out = [env.PORTAL_NPM_CLI, env.npm_execpath];
  for (const e of execs) {
    const dir = P.dirname(e);
    out.push(P.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'));
    out.push(P.join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  }
  return [...new Set(out.filter(p => p && /npm-cli\.js$/.test(p)))];
}

/** Ruta de npm-cli.js para ejecutar npm como `node npm-cli.js …`, o null. */
export function npmCli(opts = {}) {
  const exists = opts.exists ?? fs.existsSync;
  return npmCliCandidates(opts).find(p => exists(p)) || null;
}

/**
 * Cómo lanzar npm sin shell: `{ cmd, args }` donde `args` va antes de los argumentos de npm.
 * Windows: solo `node npm-cli.js` (npm.cmd exigiría shell). Linux/macOS: npm-cli.js o, si no aparece, `npm` del PATH.
 * Devuelve null si no hay forma segura (Windows sin npm-cli.js).
 */
export function npmCommand(opts = {}) {
  const { execPath = process.execPath, platform = process.platform } = opts;
  const cli = npmCli(opts);
  if (cli) return { cmd: execPath, args: [cli], via: 'npm-cli.js' };
  if (platform === 'win32') return null;
  return { cmd: 'npm', args: [], via: 'PATH' };
}
