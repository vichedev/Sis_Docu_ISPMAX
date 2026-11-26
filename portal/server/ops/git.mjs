// Git del repo del manual: solo `git` por execFile, sin shell y con lista blanca de subcomandos.
// Nunca: reset, checkout, clean, push, stash, init. "Sin repositorio" es un estado normal, no un error.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { safeEnv } from './proc.mjs';
import { getInternal } from '../settings.mjs';

const REF_RE = /^(?!-)(?!.*\.\.)[A-Za-z0-9._\/-]+$/;
const NAME_RE = /^(?!-)[A-Za-z0-9._-]+$/;
const URL_RE = /^(https:\/\/[^\s]+|ssh:\/\/[^\s]+|file:\/\/[^\s]+|[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[^\s]+)$/;
const SHA_RE = /^[0-9a-f]{7,64}$/;

/** Oculta usuario/clave embebidos en una URL (https://usuario:clave@host/...). */
export const redactUrl = u => (u ? String(u).replace(/\/\/[^@\/\s]+@/, '//***@') : u);

export const isGitUrl = s => typeof s === 'string' && URL_RE.test(s) && !s.startsWith('-');

/** Línea útil del error de git (la de "fatal:" si existe). */
const firstErr = s => (s.split(/\r?\n/).find(l => /^fatal:/.test(l)) || s.split(/\r?\n/)[0] || '').replace(/^fatal:\s*/, '');

function httpError(status, message, extra = {}) {
  const e = new Error(message);
  e.statusCode = status;
  Object.assign(e, extra);
  return e;
}

/** Comprueba que la invocación sea de las permitidas (forma exacta de cada subcomando). */
function allowed(args) {
  const [sub, a1] = args;
  switch (sub) {
    case 'status':
    case 'rev-parse':
    case 'rev-list':
    case 'log':
      return true;
    case 'fetch':
      return args.slice(1).every(a => a === '--no-tags' || a === '--prune' || NAME_RE.test(a) || isGitUrl(a) || REF_RE.test(a));
    case 'merge':
      return a1 === '--ff-only' && args.length === 3 && REF_RE.test(args[2]);
    case 'config':
      return args.length === 3 && a1 === '--get' && /^branch.[A-Za-z0-9._/-]+.(remote|merge)$/.test(args[2]);
    case 'diff':
      return a1 === '--name-only' && args.slice(2).every(a => SHA_RE.test(a));
    case 'remote':
      return (
        args.length === 1 ||
        (a1 === 'get-url' && args.length === 3 && NAME_RE.test(args[2])) ||
        (['add', 'set-url'].includes(a1) && args.length === 4 && NAME_RE.test(args[2]) && isGitUrl(args[3]))
      );
    default:
      return false;
  }
}

/**
 * `safe.directory=<repo>` por variables GIT_CONFIG_* (equivalen a `-c` en la línea de órdenes, que git sí respeta
 * para esta clave). En un contenedor el repositorio suele pertenecer a otro usuario (volumen o COPY como root) y
 * git se niega con «dubious ownership». Se añade a las GIT_CONFIG_* que ya hubiera en el entorno, sin pisarlas.
 */
export function safeDirectoryEnv(repo, env = process.env) {
  const n = Number.parseInt(env.GIT_CONFIG_COUNT, 10);
  const i = Number.isInteger(n) && n >= 0 ? n : 0;
  return {
    GIT_CONFIG_COUNT: String(i + 1),
    [`GIT_CONFIG_KEY_${i}`]: 'safe.directory',
    [`GIT_CONFIG_VALUE_${i}`]: path.resolve(repo).replace(/\\/g, '/'),
  };
}

export function git(repo, args, { timeoutMs = 30_000 } = {}) {
  if (!allowed(args)) return Promise.reject(new Error(`Orden git no permitida: ${args[0]}`));
  const env = safeEnv({
    ...safeDirectoryEnv(repo),
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '',
    GIT_PROTOCOL_FROM_USER: '0',
    GIT_ALLOW_PROTOCOL: 'https:ssh:file',
    // Que git no suba a carpetas padre si repo_path no es un repositorio.
    GIT_CEILING_DIRECTORIES: path.dirname(path.resolve(repo)),
    LC_ALL: 'C',
  });
  return new Promise(resolve => {
    execFile('git', args, { cwd: repo, env, timeout: timeoutMs, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err ? (err.code ?? 1) : 0, stdout: String(stdout), stderr: String(stderr).trim(), killed: !!err?.killed });
    });
  });
}

export const hasRepo = repo => fs.existsSync(path.join(repo, '.git'));

/** Analiza `git status --porcelain=v2 --branch`. */
export function parseStatus(out) {
  const r = { oid: null, branch: null, upstream: null, ahead: null, behind: null, changed: [], untracked: 0 };
  for (const line of out.split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith('# branch.oid ')) r.oid = line.slice(13) === '(initial)' ? null : line.slice(13);
    else if (line.startsWith('# branch.head ')) r.branch = line.slice(14) === '(detached)' ? null : line.slice(14);
    else if (line.startsWith('# branch.upstream ')) r.upstream = line.slice(18);
    else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+) -(\d+)/);
      if (m) [r.ahead, r.behind] = [Number(m[1]), Number(m[2])];
    } else if (/^[12u] /.test(line)) {
      const parts = line.split(' ');
      const p = line.startsWith('2 ') ? line.split('\t')[0].split(' ').slice(9).join(' ') : parts.slice(line.startsWith('u ') ? 10 : 8).join(' ');
      r.changed.push(`${parts[1]} ${p}`);
    } else if (line.startsWith('? ')) r.untracked++;
  }
  return r;
}

export function createGit({ ctx, jobs }) {
  const settings = async () => ({ repo: path.resolve((await getInternal(ctx, 'repo_path')) || ctx.repoRoot) });

  /**
   * Origen de la actualización según el repositorio tal cual está en el servidor: rama actual, su remoto
   * (`branch.<rama>.remote`, por defecto origin) y su upstream (`branch.<rama>.merge`, o la misma rama si existe
   * la referencia remota). Nada de esto se configura desde el panel.
   */
  async function resolveSource(repo, branch) {
    if (!branch) return { branch: null, remote: null, upstream: null, reason: 'El repositorio está en un estado sin rama (HEAD separado); no se puede actualizar.' };
    const cfg = async k => {
      const r = await git(repo, ['config', '--get', `branch.${branch}.${k}`]);
      return r.ok ? r.stdout.trim() : '';
    };
    let name = await cfg('remote');
    if (!name || name === '.' || !NAME_RE.test(name)) name = 'origin';
    const list = await git(repo, ['remote']);
    const names = list.ok ? list.stdout.split(/\r?\n/).filter(Boolean) : [];
    if (!names.includes(name)) {
      return {
        branch,
        remote: { name, url: null, configured: false },
        upstream: null,
        reason: 'El repositorio del servidor no tiene un remoto configurado. Un administrador del servidor debe configurarlo (por ejemplo, clonar de nuevo el repositorio o ejecutar «git remote add origin <URL>» y «git branch --set-upstream-to=origin/<rama>»).',
      };
    }
    const u = await git(repo, ['remote', 'get-url', name]);
    const remote = { name, url: u.ok ? redactUrl(u.stdout.trim()) : null, configured: true };
    let upstream = (await cfg('merge')).replace(/^refs\/heads\//, '');
    if (!upstream || !REF_RE.test(upstream)) {
      const has = await git(repo, ['rev-parse', '--verify', '--quiet', `refs/remotes/${name}/${branch}`]);
      upstream = has.ok ? branch : '';
    }
    if (!upstream) {
      return {
        branch,
        remote,
        upstream: null,
        reason: `La rama «${branch}» no sigue a ninguna rama remota. Un administrador del servidor debe indicarlo (por ejemplo, «git branch --set-upstream-to=${name}/${branch}»).`,
      };
    }
    return { branch, remote, upstream, reason: null };
  }

  async function localState(repo) {
    const s = await git(repo, ['status', '--porcelain=v2', '--branch']);
    if (!s.ok) throw httpError(500, `git status falló: ${s.stderr || s.code}`);
    return parseStatus(s.stdout);
  }

  async function lastCommit(repo) {
    const l = await git(repo, ['log', '-1', '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s']);
    if (!l.ok || !l.stdout.trim()) return null;
    const [hash, short, author, date, subject] = l.stdout.trim().split('\x1f');
    return { hash, short, author, date, subject };
  }

  async function aheadBehind(repo, ref) {
    const v = await git(repo, ['rev-parse', '--verify', '--quiet', ref]);
    if (!v.ok) return null;
    const c = await git(repo, ['rev-list', '--left-right', '--count', `HEAD...${ref}`]);
    if (!c.ok) return null;
    const [ahead, behind] = c.stdout.trim().split(/\s+/).map(Number);
    return { ahead, behind };
  }

  async function fetchRemote(repo, remote, branch) {
    return git(repo, ['fetch', '--no-tags', remote, branch], { timeoutMs: 60_000 });
  }

  async function lastUpdate() {
    const job = await jobs.latest('git_update');
    if (!job) return null;
    const m = job.log.match(/^RESULTADO: (.+)$/m);
    let result = null;
    try {
      result = m ? JSON.parse(m[1]) : null;
    } catch {}
    return { jobId: job.id, status: job.status, started_at: job.started_at, finished_at: job.finished_at, result };
  }

  async function status({ fetch = true } = {}) {
    const { repo } = await settings();
    if (!hasRepo(repo)) {
      return {
        initialized: false,
        repoPath: repo,
        message: 'No hay un repositorio Git en la carpeta del sistema. Para poder actualizar desde el panel, el sistema debe estar instalado como un clon de Git (git clone …) con su remoto configurado.',
      };
    }
    const st = await localState(repo);
    const src = await resolveSource(repo, st.branch);
    const res = {
      initialized: true,
      repoPath: repo,
      branch: st.branch,
      upstream: src.upstream,
      remote: src.remote,
      lastCommit: st.oid ? await lastCommit(repo) : null,
      dirty: st.changed.length > 0,
      changedFiles: st.changed.slice(0, 200),
      changedCount: st.changed.length,
      untrackedCount: st.untracked,
      fetched: false,
      fetchError: null,
      ahead: null,
      behind: null,
      sourceError: src.reason,
      lastUpdate: await lastUpdate(),
    };
    if (src.reason) {
      res.message = src.reason;
      return res;
    }
    if (fetch) {
      const f = await fetchRemote(repo, src.remote.name, src.upstream);
      res.fetched = f.ok;
      if (!f.ok) res.fetchError = `No se pudo consultar el remoto «${src.remote.name}»: ${f.killed ? 'tiempo agotado' : firstErr(f.stderr) || 'error'}`;
    }
    const ab = st.oid ? await aheadBehind(repo, `refs/remotes/${src.remote.name}/${src.upstream}`) : null;
    if (ab) Object.assign(res, ab);
    return res;
  }

  /** Comprobaciones previas de `update` (lanzan 409 sin modificar nada). Devuelve { repo, branch, remote, upstream }. */
  async function precheck() {
    const { repo } = await settings();
    if (!hasRepo(repo)) throw httpError(409, 'No hay un repositorio Git en la carpeta del sistema; no se puede actualizar desde el panel.');
    const st = await localState(repo);
    if (st.changed.length) {
      throw httpError(409, `El repositorio tiene ${st.changed.length} cambios locales sin confirmar; no se actualiza para no perderlos.`, {
        files: st.changed.slice(0, 50),
      });
    }
    if (!st.oid) throw httpError(409, 'El repositorio no tiene commits todavía.');
    const src = await resolveSource(repo, st.branch);
    if (src.reason) throw httpError(409, src.reason);
    return { repo, branch: src.branch, remote: src.remote, upstream: src.upstream };
  }

  // La actualización (fetch + merge --ff-only + dependencias + migración + interfaz + sitio) está en system.mjs:
  // el contenido vive en la BD y ya no se reimporta desde Git.

  return { status, precheck };
}
