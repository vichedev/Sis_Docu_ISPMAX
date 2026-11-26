import { safeRm } from './helpers/safe-rm.mjs';
// Actualizar el sistema desde Git (ops/system.mjs) con repositorios temporales en portal/work-test/git-test/
// (remoto file://). npm se simula inyectando el ejecutor: no se instala nada. El reinicio `respawn` se prueba con
// un script mínimo propio, no con el servidor real. No usa la BD.
// Uso: node --test test/system.test.mjs   (desde portal/)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { PORTAL_ROOT } from '../server/env.mjs';
import { createGit } from '../server/ops/git.mjs';
import { createSystem, npmAllowed, npmDirsToInstall, plan, redactText } from '../server/ops/system.mjs';

// Estas pruebas fijan repo_path/restart_mode por la tabla simulada (en producción los fija el entorno).
process.env.PORTAL_ALLOW_INTERNAL_SETTINGS = '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.join(PORTAL_ROOT, 'work-test', 'git-test', `run-${process.pid}`);
const REMOTE = path.join(ROOT, 'remote.git');
const SEED = path.join(ROOT, 'seed'); // donde "desarrollo" hace commits y los sube
const REPO = path.join(ROOT, 'sistema'); // la instalación que se actualiza
const NOREPO = path.join(ROOT, 'sin-repo');
const PORT = 4388;

function g(cwd, ...args) {
  return execFileSync('git', ['-c', 'user.name=Prueba', '-c', 'user.email=prueba@example.invalid', '-c', 'init.defaultBranch=main', '-c', 'core.autocrlf=false', ...args], {
    stdio: ['ignore', 'pipe', 'ignore'],
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}
function write(dir, rel, text) {
  const p = path.join(dir, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}
function commitAndPush(files, msg) {
  for (const [rel, text] of Object.entries(files)) write(SEED, rel, text);
  g(SEED, 'add', '-A');
  g(SEED, 'commit', '-m', msg);
  g(SEED, 'push', 'origin', 'main');
}

// Trabajos en memoria con la misma interfaz que jobs.mjs (start/latest/anyRunning).
function memJobs() {
  const rows = [];
  return {
    rows,
    async start(kind, userId, fn) {
      if (rows.some(r => r.kind === kind && r.status === 'running')) {
        const e = new Error('en curso');
        e.statusCode = 409;
        throw e;
      }
      const row = { id: rows.length + 1, kind, status: 'running', log: '', started_at: new Date(), finished_at: null };
      rows.push(row);
      const log = (...p) => (row.log += p.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + '\n');
      const done = (async () => {
        try {
          const r = await fn({ log, jobId: row.id });
          row.status = 'ok';
          return { status: 'ok', ...r };
        } catch (e) {
          row.status = 'error';
          log(`ERROR: ${e.message}`);
          return { status: 'error', error: e };
        } finally {
          row.finished_at = new Date();
        }
      })();
      return { jobId: row.id, done };
    },
    async latest(kind) {
      return [...rows].reverse().find(r => r.kind === kind) || null;
    },
    async anyRunning() {
      return rows.some(r => r.status === 'running');
    },
  };
}

function setup({ repo = REPO, failOn = null, restartMode = 'exit', updateMode = 'inline' } = {}) {
  const settings = { repo_path: repo, restart_mode: restartMode };
  const ctx = {
    repoRoot: repo,
    databaseUrl: 'postgres://usuario:clave-secreta@127.0.0.1:5432/ficticia',
    getSetting: async (k, d) => (k in settings ? settings[k] : d),
    audit: async () => {},
    db: { query: async () => ({ rows: [] }) },
  };
  const jobs = memJobs();
  const execCalls = [];
  const exec = async (cmd, args, opts) => {
    execCalls.push({ cmd, args: args.slice(1), cwd: opts.cwd, env: opts.env });
    if (failOn && args.slice(1).join(' ') === failOn) return { code: 1 };
    return { code: 0 };
  };
  const siteCalls = [];
  const site = {
    isBuilding: () => false,
    buildAndWait: async (userId, o) => (siteCalls.push(o), { jobId: 99, status: 'ok' }),
  };
  const restarts = [];
  const gitOps = createGit({ ctx, jobs });
  const system = createSystem({ ctx, jobs, site, gitOps, exec, updateMode, restarter: mode => restarts.push(mode) });
  return { ctx, jobs, system, execCalls, siteCalls, restarts, settings };
}

before(() => {
  safeRm(ROOT);
  fs.mkdirSync(NOREPO, { recursive: true });
  g(ROOT, 'init', '--bare', REMOTE);
  fs.mkdirSync(SEED, { recursive: true });
  g(SEED, 'init');
  g(SEED, 'remote', 'add', 'origin', pathToFileURL(REMOTE).href);
  commitAndPush(
    {
      'README.md': 'Sistema de prueba\n',
      'package.json': '{ "name": "ficticio", "version": "1.0.0" }\n',
      'portal/package.json': '{ "name": "portal-ficticio", "scripts": { "migrate": "node -e 0", "web:build": "node -e 0" } }\n',
      'portal/server/x.mjs': 'export const v = 1;\n',
      'portal/web/dist/index.html': '<!doctype html>\n',
      'docs/a.mdx': '# A\n',
    },
    'inicio',
  );
  g(ROOT, 'clone', pathToFileURL(REMOTE).href, REPO);
});
after(() => {
  safeRm(ROOT);
});

test('lista blanca de npm, directorios de npm ci y plan por archivos cambiados; credenciales ocultas', () => {
  assert.equal(npmAllowed(['ci']), true);
  assert.equal(npmAllowed(['run', 'migrate']), true);
  assert.equal(npmAllowed(['run', 'web:build']), true);
  for (const bad of [['install'], ['run', 'build'], ['ci', '--ignore-scripts'], ['run', 'migrate', '--', 'x'], ['exec', 'rm'], []]) assert.equal(npmAllowed(bad), false, bad.join(' '));
  assert.deepEqual(npmDirsToInstall(['package-lock.json', 'portal/web/package.json', 'portal/server/a.mjs', 'docs/package.json']), ['', 'portal/web']);
  assert.deepEqual(plan(['docs/x.mdx', 'assets/a.webp']), { npmDirs: [], web: false, site: false, theme: false, restart: false });
  assert.deepEqual(plan(['src/components/Tour.tsx', 'portal/server/ops/site.mjs', 'portal/web/src/App.tsx']), { npmDirs: [], web: true, site: true, theme: true, restart: true });
  assert.equal(redactText('fatal: https://usuario:clave@example.invalid/r.git no existe'), 'fatal: https://***@example.invalid/r.git no existe');
});

test('sin repositorio: initialized:false con mensaje útil; update 409 sin tocar nada', async () => {
  const { system } = setup({ repo: NOREPO });
  const v = await system.version();
  assert.equal(v.initialized, false);
  assert.equal(v.canUpdate, false);
  assert.match(v.message, /No hay un repositorio Git/);
  assert.ok(!('repoPath' in v) && !('remote' in v), 'la respuesta no expone ruta ni remoto');
  assert.equal(v.updateMode, 'inline');
  await assert.rejects(system.update(1), e => e.statusCode === 409 && /No hay un repositorio Git/.test(e.message));
});

test('al día: version sin novedades; update termina ok sin pasos posteriores', async () => {
  const { system, jobs, execCalls } = setup();
  const v = await system.version();
  assert.equal(v.initialized, true);
  assert.equal(v.branch, 'main');
  assert.ok(!('remote' in v) && !('repoPath' in v));
  assert.equal(v.clean, true);
  assert.equal(v.behind, 0);
  assert.equal(v.ahead, 0);
  assert.equal(v.canUpdate, false);
  assert.match(v.message, /al día/);
  assert.match(v.commit, /^[0-9a-f]{40}$/);
  assert.equal(v.subject, 'inicio');
  const { jobId } = await system.update(1);
  const row = jobs.rows.find(r => r.id === jobId);
  while (row.status === 'running') await sleep(20);
  assert.equal(row.status, 'ok', row.log);
  assert.match(row.log, /ya está al día/);
  assert.equal(execCalls.length, 0);
});

test('árbol sucio: version clean:false y update rechazado (409) sin modificar nada', async () => {
  const { system } = setup();
  const f = path.join(REPO, 'README.md');
  const orig = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, orig + 'cambio local\n');
  try {
    const v = await system.version();
    assert.equal(v.clean, false);
    assert.equal(v.canUpdate, false);
    assert.match(v.message, /cambios locales/);
    assert.ok(v.changedFiles.some(x => x.includes('README.md')));
    await assert.rejects(system.update(1), e => e.statusCode === 409 && /cambios locales/.test(e.message));
  } finally {
    fs.writeFileSync(f, orig);
  }
  assert.equal(fs.readFileSync(f, 'utf8'), orig);
});

test('avance: fetch + ff, npm ci solo donde cambió package.json, migrate, interfaz, sitio y needsRestart', async () => {
  const { system, jobs, execCalls, siteCalls } = setup();
  const head0 = g(REPO, 'rev-parse', 'HEAD');
  commitAndPush(
    {
      'package.json': '{ "name": "ficticio", "version": "1.1.0" }\n',
      'src/components/Nuevo.tsx': 'export default () => null;\n',
      'portal/server/x.mjs': 'export const v = 2;\n',
      'portal/web/src/App.tsx': 'export {};\n',
      'docs/a.mdx': '# A cambiada (no se reimporta)\n',
    },
    'novedades',
  );
  const v = await system.version();
  assert.equal(v.behind, 1);
  assert.equal(v.canUpdate, true);
  assert.equal(v.message, undefined);
  const { jobId } = await system.update(1);
  const row = jobs.rows.find(r => r.id === jobId);
  while (row.status === 'running') await sleep(20);
  assert.equal(row.status, 'ok', row.log);
  const res = JSON.parse(row.log.match(/^RESULTADO: (.+)$/m)[1]);
  assert.equal(res.ok, true);
  assert.equal(res.updated, true);
  assert.equal(res.from, head0);
  assert.equal(res.to, g(REPO, 'rev-parse', 'HEAD'));
  assert.notEqual(res.to, head0);
  assert.equal(res.needsRestart, true);
  assert.equal(res.files, 5);
  assert.equal(res.updateMode, 'inline');
  // npm: ci solo en la raíz (su package.json cambió), luego migrate y web:build en portal/
  assert.deepEqual(
    execCalls.map(c => [path.relative(REPO, c.cwd).replace(/\\/g, '/'), c.args.join(' ')]),
    [['', 'ci'], ['portal', 'run migrate'], ['portal', 'run web:build']],
  );
  assert.ok(execCalls.every(c => c.cmd === process.execPath), 'npm por node npm-cli.js, sin shell');
  const mig = execCalls.find(c => c.args.join(' ') === 'run migrate');
  assert.equal(mig.env.DATABASE_URL, 'postgres://usuario:clave-secreta@127.0.0.1:5432/ficticia'); // la BD del propio servidor, por entorno
  assert.ok(!row.log.includes('clave-secreta'), 'la clave no sale en el log');
  assert.equal(siteCalls.length, 1);
  assert.doesNotMatch(row.log, /reimport/i);
  const v2 = await system.version();
  assert.equal(v2.behind, 0);
  assert.equal(v2.needsRestart, true);
});

test('fallo a mitad (npm ci): trabajo en error con el paso; no reinicia; restart lo bloquea salvo force', async () => {
  const { system, jobs, restarts, siteCalls } = setup({ failOn: 'ci' });
  commitAndPush({ 'portal/web/package-lock.json': '{ "lockfileVersion": 3 }\n' }, 'cambia el lock de la interfaz');
  const { jobId } = await system.update(1);
  const row = jobs.rows.find(r => r.id === jobId);
  while (row.status === 'running') await sleep(20);
  assert.equal(row.status, 'error');
  const res = JSON.parse(row.log.match(/^RESULTADO: (.+)$/m)[1]);
  assert.equal(res.ok, false);
  assert.equal(res.merged, true);
  assert.match(res.failedStep, /npm ci/);
  assert.equal(res.needsRestart, false);
  assert.match(row.log, /No se reinicia/);
  assert.equal(siteCalls.length, 0, 'no se reconstruye el sitio tras el fallo');
  assert.equal(restarts.length, 0);
  await assert.rejects(system.restart(1, { confirm: 'REINICIAR' }), e => e.statusCode === 409 && /falló/.test(e.message));
  await assert.rejects(system.restart(1, { confirm: 'reiniciar' }), e => e.statusCode === 400);
  const r = await system.restart(1, { confirm: 'REINICIAR', force: true });
  assert.equal(r.mode, 'exit');
  await sleep(500);
  assert.deepEqual(restarts, ['exit']);
});

test('credenciales del remoto ocultas (version no lo expone; el estado de git lo oculta)', async () => {
  const { system, ctx, jobs } = setup();
  const prev = g(REPO, 'remote', 'get-url', 'origin');
  g(REPO, 'remote', 'set-url', 'origin', 'https://usuario:clave-remota@example.invalid/sistema.git');
  try {
    const v = await system.version({ fetch: false });
    assert.ok(!JSON.stringify(v).includes('clave-remota') && !('remote' in v));
    const st = await createGit({ ctx, jobs }).status({ fetch: false });
    assert.equal(st.remote.url, 'https://***@example.invalid/sistema.git');
    assert.ok(!JSON.stringify(st).includes('clave-remota'));
  } finally {
    g(REPO, 'remote', 'set-url', 'origin', prev);
  }
});

test('rama, remoto y upstream salen del repositorio tal cual (sin ajustes): rama distinta de main con su upstream', async () => {
  const dir = path.join(ROOT, 'otra-rama');
  g(ROOT, 'clone', pathToFileURL(REMOTE).href, dir);
  g(dir, 'checkout', '-b', 'trabajo');
  g(dir, 'push', '-u', 'origin', 'trabajo:release');
  const { system, jobs } = setup({ repo: dir });
  assert.equal(g(dir, 'config', '--get', 'branch.trabajo.merge'), 'refs/heads/release');
  let v = await system.version();
  assert.equal(v.branch, 'trabajo');
  assert.equal(v.canUpdate, false);
  assert.match(v.message, /al día/);
  // el upstream avanza
  const w = path.join(ROOT, 'otra-rama-seed');
  g(ROOT, 'clone', pathToFileURL(REMOTE).href, w);
  g(w, 'checkout', '-b', 'release', 'origin/release');
  write(w, 'docs/b.mdx', '# B\n');
  g(w, 'add', '-A');
  g(w, 'commit', '-m', 'avance en release');
  g(w, 'push', 'origin', 'release');
  v = await system.version();
  assert.equal(v.behind, 1);
  assert.equal(v.canUpdate, true);
  const { jobId } = await system.update(1);
  const row = jobs.rows.find(r => r.id === jobId);
  while (row.status === 'running') await sleep(20);
  assert.equal(row.status, 'ok', row.log);
  assert.equal(g(dir, 'rev-parse', 'HEAD'), g(w, 'rev-parse', 'HEAD'));
  assert.equal(g(dir, 'rev-parse', '--abbrev-ref', 'HEAD'), 'trabajo', 'no cambia de rama');
});

test('sin remoto o sin upstream: canUpdate false con mensaje para el administrador del servidor; update 409', async () => {
  const dir = path.join(ROOT, 'sin-remoto');
  g(ROOT, 'clone', pathToFileURL(REMOTE).href, dir);
  g(dir, 'checkout', '-b', 'local');
  let { system } = setup({ repo: dir });
  let v = await system.version({ fetch: false });
  assert.equal(v.canUpdate, false);
  assert.match(v.message, /no sigue a ninguna rama remota/);
  assert.match(v.message, /administrador del servidor/);
  await assert.rejects(system.update(1), e => e.statusCode === 409 && /no sigue a ninguna rama remota/.test(e.message));
  g(dir, 'remote', 'remove', 'origin');
  ({ system } = setup({ repo: dir }));
  v = await system.version({ fetch: false });
  assert.equal(v.canUpdate, false);
  assert.match(v.message, /no tiene un remoto configurado/);
  await assert.rejects(system.update(1), e => e.statusCode === 409 && /remoto/.test(e.message));
});

test('modo entrypoint (Docker): solo fetch + merge --ff-only; sin npm ni compilaciones; needsRestart y updateMode', async () => {
  const dir = path.join(ROOT, 'docker');
  g(ROOT, 'clone', pathToFileURL(REMOTE).href, dir);
  g(dir, 'checkout', 'main');
  const { system, jobs, execCalls, siteCalls } = setup({ repo: dir, updateMode: 'entrypoint' });
  // avance con cambios de dependencias, servidor e interfaz (todo lo que en modo inline dispararía npm/compilaciones)
  commitAndPush({ 'package.json': '{ "name": "ficticio", "version": "2.0.0" }\n', 'portal/web/package-lock.json': '{ "lockfileVersion": 3 }\n', 'portal/server/x.mjs': 'export const v = 3;\n' }, 'cambios para Docker');
  const v = await system.version();
  assert.equal(v.updateMode, 'entrypoint');
  assert.equal(v.canUpdate, true);
  const head0 = g(dir, 'rev-parse', 'HEAD');
  const { jobId } = await system.update(1);
  const row = jobs.rows.find(r => r.id === jobId);
  while (row.status === 'running') await sleep(20);
  assert.equal(row.status, 'ok', row.log);
  const res = JSON.parse(row.log.match(/^RESULTADO: (.+)$/m)[1]);
  assert.equal(res.ok, true);
  assert.equal(res.updated, true);
  assert.equal(res.updateMode, 'entrypoint');
  assert.equal(res.needsRestart, true);
  assert.equal(res.from, head0);
  assert.equal(res.to, g(dir, 'rev-parse', 'HEAD'));
  assert.notEqual(res.to, head0);
  assert.equal(execCalls.length, 0, 'ni npm ci ni migrate ni web:build');
  assert.equal(siteCalls.length, 0, 'ni reconstruye el sitio');
  assert.match(row.log, /Dependencias, migración y compilación se aplicarán al reiniciar/);
  const v2 = await system.version({ fetch: false });
  assert.equal(v2.needsRestart, true);
  assert.equal(v2.behind, 0);
  // protecciones intactas: árbol sucio sigue bloqueando
  fs.appendFileSync(path.join(dir, 'README.md'), 'cambio local\n');
  await assert.rejects(system.update(1), e => e.statusCode === 409 && /cambios locales/.test(e.message));
  g(dir, 'checkout', '--', 'README.md');
});

test('la lista blanca de git no admite reset/checkout/clean/stash/push ni config arbitrario', async () => {
  const { git } = await import('../server/ops/git.mjs');
  for (const bad of [['reset', '--hard'], ['checkout', 'main'], ['clean', '-fd'], ['stash'], ['push'], ['config', 'user.name', 'x'], ['config', '--get', 'core.editor'], ['config', '--unset', 'branch.main.remote']]) {
    await assert.rejects(git(REPO, bad), /no permitida/, bad.join(' '));
  }
  assert.equal((await git(REPO, ['config', '--get', 'branch.main.remote'])).stdout.trim(), 'origin');
});

test('respawn: un script mínimo se relanza desacoplado y el nuevo proceso reintenta el puerto hasta que queda libre', async () => {
  const dir = path.join(ROOT, 'respawn');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, 'pids.txt');
  const script = path.join(dir, 'demo.mjs');
  const sys = pathToFileURL(path.join(PORTAL_ROOT, 'server', 'ops', 'system.mjs')).href;
  fs.writeFileSync(
    script,
    `import http from 'node:http';
import fs from 'node:fs';
import { listenWithRetry, respawnSelf } from ${JSON.stringify(sys)};
const [port, out] = [Number(process.argv[2]), process.argv[3]];
const gen = Number(process.env.GEN || 0);
const server = http.createServer((req, res) => {
  if (req.url === '/restart') {
    res.end('ok');
    respawnSelf({ env: { ...process.env, GEN: String(gen + 1) } });
    setTimeout(() => server.close(() => process.exit(0)), 1500); // suelta el puerto tarde: el nuevo debe reintentar
  } else res.end(JSON.stringify({ pid: process.pid, gen }));
});
await listenWithRetry(() => new Promise((ok, ko) => { server.once('error', ko); server.listen(port, '127.0.0.1', () => { server.off('error', ko); ok(); }); }), { port });
fs.appendFileSync(out, process.pid + ' ' + gen + '\\n');
if (gen >= 1) setTimeout(() => process.exit(0), 4000).unref?.();
if (gen >= 1) setTimeout(() => server.close(), 4000);
`,
  );
  const get = p =>
    new Promise((ok, ko) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => { let b = ''; r.on('data', c => (b += c)); r.on('end', () => ok(b)); }).on('error', ko));
  const lines = () => (fs.existsSync(out) ? fs.readFileSync(out, 'utf8').trim().split('\n').filter(Boolean) : []);
  const child = spawn(process.execPath, [script, String(PORT), out], { stdio: 'ignore', windowsHide: true, env: { ...process.env, GEN: '0' } });
  try {
    for (let i = 0; lines().length < 1 && i < 100; i++) await sleep(100);
    const first = JSON.parse(await get('/'));
    assert.equal(first.gen, 0);
    assert.equal(await get('/restart'), 'ok');
    for (let i = 0; lines().length < 2 && i < 150; i++) await sleep(100);
    assert.equal(lines().length, 2, 'el proceso nuevo arrancó');
    const second = JSON.parse(await get('/'));
    assert.equal(second.gen, 1);
    assert.notEqual(second.pid, first.pid);
    const [p0, p1] = lines().map(l => Number(l.split(' ')[0]));
    assert.equal(p0, first.pid);
    assert.equal(p1, second.pid);
    // el proceso original ya salió
    await sleep(300);
    assert.notEqual(child.exitCode, null);
  } finally {
    try { child.kill(); } catch {}
    for (let i = 0; i < 60; i++) {
      try {
        await get('/');
        await sleep(100);
      } catch {
        break; // el puerto quedó libre: la copia nueva terminó sola
      }
    }
  }
});
