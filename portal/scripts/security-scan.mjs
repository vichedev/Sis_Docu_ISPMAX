#!/usr/bin/env node
// Barrido de seguridad de una instancia EN MARCHA del portal, sin credenciales y sin modificar nada.
//   npm run security:scan -- https://doc.ispmax.ec [--admin-path /ruta] [--audit] [--json] [--insecure]
//   npm run security:scan -- --audit            (solo npm audit de portal/, portal/web/ y la raíz)
// Qué hace: para cada ruta conocida de la API pide sin sesión (GET/HEAD/OPTIONS y, en las que escriben, el método real
// con un cuerpo JSON ROTO: si la sesión fallara, el servidor respondería 400 al leer el cuerpo y no ejecutaría nada);
// trucos de ruta; CORS; cabeceras del manual y del panel; archivos sensibles; /healthz, robots.txt y sitemap.xml; y, con
// --admin-path, que /api y /admin directos sean indistinguibles de una ruta inexistente. Informe: cada ruta y su veredicto.
// Aviso: las rutas de escaneo (/.env, /wp-admin…) cuentan como sondeos: la IP que ejecuta el barrido puede quedar
// 30 min sin acceso al PANEL (nunca al manual). Se piden al final.
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PORTAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Matriz de rutas y rol mínimo (la misma que comprueba test/security.test.mjs contra las rutas registradas).
// public = sin sesión · session = cualquier sesión · viewer ⊂ editor ⊂ admin
export const ROUTE_MATRIX = {
  'POST /api/auth/login': 'public', 'POST /api/auth/login/2fa': 'public',
  'POST /api/auth/logout': 'session', 'GET /api/auth/me': 'session', 'GET /api/auth/sessions': 'session',
  'DELETE /api/auth/sessions/:id': 'session', 'POST /api/auth/sessions/revoke-others': 'session', 'PUT /api/auth/password': 'session',
  'POST /api/auth/2fa/setup': 'session', 'POST /api/auth/2fa/enable': 'session', 'POST /api/auth/2fa/disable': 'session',
  'POST /api/users/:id/2fa/reset': 'admin',
  'GET /sitemap.xml': 'public', 'GET /robots.txt': 'public', 'GET /healthz': 'public', 'GET /*': 'public',
  'GET /api/pages': 'viewer', 'POST /api/pages/validate': 'viewer', 'GET /api/pages/:id': 'viewer', 'POST /api/pages': 'editor',
  'PUT /api/pages/:id': 'editor', 'POST /api/pages/:id/move': 'editor', 'DELETE /api/pages/:id': 'editor', 'POST /api/pages/:id/restore': 'editor',
  'GET /api/pages/:id/revisions': 'viewer', 'GET /api/pages/:id/revisions/:revId': 'viewer', 'POST /api/pages/:id/revisions/:revId/restore': 'editor',
  'POST /api/pages/publish-drafts': 'editor', 'POST /api/pages/:id/publish': 'editor', 'POST /api/pages/:id/unpublish': 'editor',
  'GET /api/structure': 'viewer', 'PUT /api/structure/order': 'editor', 'POST /api/structure/groups': 'editor', 'PUT /api/structure/groups': 'editor',
  'DELETE /api/structure/groups': 'editor', 'GET /api/structure/guia-sidebar': 'viewer', 'PUT /api/structure/guia-sidebar': 'editor',
  'GET /api/assets': 'viewer', 'GET /api/assets/file': 'viewer', 'POST /api/assets': 'editor', 'DELETE /api/assets': 'editor',
  'GET /api/stats': 'viewer', 'GET /api/settings': 'admin', 'PUT /api/settings': 'admin',
  'GET /api/users': 'admin', 'POST /api/users': 'admin', 'PUT /api/users/:id': 'admin', 'DELETE /api/users/:id': 'admin', 'GET /api/audit': 'admin',
  'GET /api/tours': 'viewer', 'GET /api/tours/:id': 'viewer', 'POST /api/tours': 'editor', 'PUT /api/tours/:id': 'editor', 'DELETE /api/tours/:id': 'editor',
  'POST /api/tours/:id/restore': 'editor', 'POST /api/tours/:id/duplicate': 'editor',
  'POST /api/import': 'admin', 'GET /api/jobs/:id': 'viewer', 'GET /api/jobs': 'viewer',
  'GET /api/site/status': 'viewer', 'POST /api/site/rebuild': 'editor',
  'GET /api/system/version': 'viewer', 'GET /api/system/info': 'admin', 'POST /api/system/update': 'admin', 'POST /api/system/restart': 'admin',
  'POST /api/publish': 'admin', 'GET /api/publish/status': 'viewer', 'GET /api/git/status': 'viewer', 'POST /api/git/update': 'admin',
  'GET /api/backups': 'viewer', 'POST /api/backups': 'admin', 'GET /api/backups/:id/download': 'admin', 'DELETE /api/backups/:id': 'admin',
  'POST /api/backups/:id/restore': 'admin',
  'GET /api/content/summary': 'viewer', 'POST /api/content/export': 'admin', 'GET /api/content/files': 'viewer',
  'GET /api/content/files/:id/download': 'admin', 'DELETE /api/content/files/:id': 'admin', 'POST /api/content/import': 'admin',
};

// Avisos de npm audit (alta/crítica) aceptados, con su justificación (ver portal/SECURITY.md § Dependencias).
export const ACCEPTED_ADVISORIES = {
  '@fastify/static': 'El portal no usa el listado de directorios ni el enrutado de @fastify/static (serve:false); solo reply.sendFile con rutas ya validadas por safeRelPath. La corrección exige la versión mayor 11 (pendiente de probar con Fastify 5).',
  sharp: 'libvips solo procesa imágenes que sube un editor autenticado (y paquetes .ispmax de un admin). La corrección exige sharp 0.35 (versión mayor: cambia la salida WebP); pendiente de una actualización probada.',
  vite: 'Solo afecta al servidor de desarrollo de Vite (npm run web:dev); producción sirve el panel ya compilado.',
  esbuild: 'Solo afecta al servidor de desarrollo (dependencia de Vite).',
};

const SENSITIVE = [
  '/.env', '/portal/.env', '/.env.bak', '/.git/config', '/.git/HEAD', '/data/', '/data/secret.key', '/work/', '/node_modules/', '/server/',
  '/server/index.mjs', '/db/schema.sql', '/portal/db/schema.sql', '/package.json', '/portal/package.json', '/index.html.bak', '/install-docker.log',
  '/docker-compose.yml', '/%2e%2e/%2e%2e/.env', '/..%2f..%2f.env', '/%252e%252e/.env', '/static/../../.env',
];
const TRICKS = ['/API/stats', '//api/stats', '/./api/stats', '/api/./stats', '/api%2fstats', '/%61pi/stats', '/%2561pi/stats', '/api/stats;x', '/api/stats/', '/x/../api/stats', '/api/users/', '/%61pi/users'];
const SECRET_RE = /DATABASE_URL|POSTGRES_PASSWORD|CREATE TABLE|"dependencies"|\[core\]|PRIVATE KEY|password_hash/i;

function rawRequest(base, method, rawPath, { headers = {}, body = null, insecure = false } = {}) {
  const u = new URL(base);
  const lib = u.protocol === 'https:' ? https : http;
  const prefix = u.pathname.replace(/\/$/, '');
  return new Promise((resolve) => {
    const r = lib.request(
      {
        method, host: u.hostname, port: u.port || undefined, path: prefix + rawPath, rejectUnauthorized: !insecure, timeout: 15000, agent: false,
        // Content-Length explícito: sin él, Node envía el cuerpo de un DELETE como si fuera otra petición (400 del servidor HTTP).
        headers: { 'user-agent': 'ispmax-security-scan/1.0', ...(body != null ? { 'content-length': Buffer.byteLength(body) } : {}), ...headers },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.length < 64 && chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8').slice(0, 200_000) }));
      }
    );
    r.on('timeout', () => r.destroy(new Error('tiempo agotado')));
    r.on('error', (e) => resolve({ status: 0, headers: {}, body: '', error: e.message }));
    if (body != null) r.end(body);
    else r.end();
  });
}

const isData = (r) => /application\/json/.test(r.headers['content-type'] || '') && r.body.length > 0 && !/^\{"error"/.test(r.body);
const fill = (u) => u.replace(/:[A-Za-z]+/g, '1');
const stripVolatile = (h) => Object.fromEntries(Object.entries(h).filter(([k]) => !['date', 'etag', 'last-modified', 'connection', 'keep-alive', 'age', 'cf-ray', 'x-request-id', 'set-cookie', 'report-to', 'nel', 'server-timing'].includes(k)));

export async function scan(base, { adminPath = null, insecure = false, log = () => {} } = {}) {
  const results = [];
  const add = (ok, check, detail) => {
    results.push({ ok, check, detail });
    log(`${ok === true ? 'OK   ' : ok === 'warn' ? 'AVISO' : 'FALLO'} ${check}${detail ? ' — ' + detail : ''}`);
  };
  const req = (m, p, o = {}) => rawRequest(base, m, p, { ...o, insecure });
  const hidden = !!adminPath && adminPath !== '/admin';
  const apiPrefix = hidden ? adminPath : '';

  const h0 = await req('GET', '/healthz');
  if (!h0.status) {
    add(false, 'conexión', h0.error);
    return results;
  }
  // 1. API sin sesión
  for (const [key, role] of Object.entries(ROUTE_MATRIX)) {
    const [method, url] = key.split(' ');
    if (!url.startsWith('/api/') || role === 'public') continue;
    const p = apiPrefix + fill(url);
    const reads = ['GET', 'HEAD', 'OPTIONS'];
    for (const m of method === 'GET' ? reads : [...reads, method]) {
      const r = await req(m, p, m === method && m !== 'GET' ? { headers: { 'content-type': 'application/json' }, body: '{' } : {});
      const ok = [401, 403, 404, 405].includes(r.status) && !isData(r) && !r.headers['access-control-allow-origin'];
      add(ok, `${m} ${p}`, `${r.status}${r.headers['access-control-allow-origin'] ? ' con CORS' : ''}${ok ? '' : ' (esperado 401/403/404)'}`);
    }
  }
  // 2. Modo oculto: /api y /admin directos = 404 de una ruta inexistente
  if (hidden) {
    const rnd = `/${crypto.randomBytes(6).toString('hex')}-no-existe`;
    const ref = await req('GET', rnd);
    for (const p of ['/api/auth/me', '/api/stats', '/admin/', '/admin', '/API/stats', '/%61pi/auth/me']) {
      const r = await req('GET', p);
      const same = r.status === ref.status && r.body === ref.body && JSON.stringify(stripVolatile(r.headers)) === JSON.stringify(stripVolatile(ref.headers));
      add(same, `oculto: GET ${p} indistinguible de una ruta inexistente`, `${r.status}`);
    }
    const me = await req('GET', `${adminPath}/api/auth/me`);
    add(me.status === 401, 'oculto: la API responde en la ruta del panel (sin sesión 401)', String(me.status));
  }
  // 3. Trucos de ruta
  for (const t of TRICKS) {
    const r = await req('GET', t);
    // 503 = «el manual se está preparando» (sin sitio todavía): tampoco da datos.
    add([400, 401, 403, 404, 503].includes(r.status) && !isData(r), `truco ${t}`, String(r.status));
  }
  // 4. CORS y preflight
  const pre = await req('OPTIONS', `${apiPrefix}/api/auth/me`, { headers: { origin: 'https://atacante.invalid', 'access-control-request-method': 'GET' } });
  add(!pre.headers['access-control-allow-origin'], 'CORS: preflight sin Access-Control-Allow-Origin', String(pre.status));
  // 5. Cabeceras
  const home = await req('GET', '/');
  add(/frame-ancestors/.test(home.headers['content-security-policy'] || ''), 'manual: CSP con frame-ancestors', '');
  add(home.headers['x-content-type-options'] === 'nosniff', 'manual: nosniff', '');
  if (base.startsWith('https:')) add(/max-age=\d+/.test(home.headers['strict-transport-security'] || ''), 'manual: HSTS', home.headers['strict-transport-security'] || 'sin HSTS');
  const panelUrl = (adminPath || '/admin') + '/';
  const panel = await req('GET', panelUrl);
  if (panel.status === 200) {
    add(panel.headers['cache-control'] === 'no-store', 'panel: Cache-Control no-store', panel.headers['cache-control']);
    add(panel.headers['x-frame-options'] === 'DENY' && /frame-ancestors 'none'/.test(panel.headers['content-security-policy'] || ''), 'panel: no enmarcable', '');
    add(!/script-src[^;]*unsafe-inline/.test(panel.headers['content-security-policy'] || ''), 'panel: script-src sin unsafe-inline', '');
    add(panel.headers['referrer-policy'] === 'no-referrer', 'panel: Referrer-Policy no-referrer', panel.headers['referrer-policy']);
  } else add('warn', `panel: ${panelUrl} no respondió 200`, `${panel.status} (¿IP no permitida o ruta distinta?)`);
  // 6. Datos públicos
  let hz = {};
  try {
    hz = JSON.parse(h0.body);
  } catch {}
  add(JSON.stringify(Object.keys(hz).sort()) === '["db","ok","site"]', '/healthz solo {ok,db,site}', h0.body.slice(0, 80));
  const info = await req('GET', `${apiPrefix}/api/system/info`);
  add([401, 403, 404].includes(info.status), '/api/system/info exige sesión de admin', String(info.status));
  const robots = await req('GET', '/robots.txt');
  add(!hidden || (!robots.body.includes(adminPath) && !/\/api\/|admin/i.test(robots.body)), hidden ? 'robots.txt no nombra el panel ni la API' : 'robots.txt (modo por defecto: veta /admin/ y /api/)', '');
  const sm = await req('GET', '/sitemap.xml');
  // (las páginas pueden llamarse /guia/adminolt o /referencia/api-…: se busca la ruta del panel y "/api/" completos)
  add(!/\/admin\/|\/api\//.test(sm.body) && (!adminPath || !sm.body.includes(adminPath + '/')), 'sitemap.xml sin panel ni API', String(sm.status));
  for (const [n, r] of [['/', home], ['/robots.txt', robots], ['/sitemap.xml', sm]]) {
    if (hidden) add(!r.body.includes(adminPath) && !JSON.stringify(r.headers).includes(adminPath), `${n}: no contiene la ruta del panel`, '');
  }
  // 7. Enumeración por mensaje: dos usuarios inventados (nunca uno real) dan el mismo mensaje genérico
  const fake = () => `zz-${crypto.randomBytes(5).toString('hex')}`;
  const l1 = await req('POST', `${apiPrefix}/api/auth/login`, { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: fake(), password: crypto.randomBytes(9).toString('hex') }) });
  add([401, 429].includes(l1.status) && !/no existe|inexistente|desconocido/i.test(l1.body), 'login: mensaje genérico (sin revelar si el usuario existe)', `${l1.status} ${l1.body.slice(0, 60)}`);
  // 8. Archivos sensibles (al final: cuentan como sondeos)
  for (const p of SENSITIVE) {
    const r = await req('GET', p);
    add([400, 403, 404, 503].includes(r.status) && !SECRET_RE.test(r.body), `no se sirve ${p}`, String(r.status));
  }
  return results;
}

function npmCli() {
  const cands = [process.env.PORTAL_NPM_CLI, path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), process.env.npm_execpath].filter(Boolean);
  return cands.find((c) => /npm-cli\.js$/.test(c)) || null;
}

/** `npm audit --json` de una carpeta → { counts, items:[{name, severity, fix}] } (lista blanca de argumentos, sin shell). */
export function auditSummary(dir) {
  const cli = npmCli();
  return new Promise((resolve) => {
    const [cmd, args] = cli ? [process.execPath, [cli, 'audit', '--json']] : ['npm', ['audit', '--json']];
    execFile(cmd, args, { cwd: dir, maxBuffer: 50 * 1024 * 1024, timeout: 180_000, shell: false }, (err, stdout) => {
      try {
        const j = JSON.parse(stdout);
        const items = Object.entries(j.vulnerabilities || {}).map(([name, v]) => ({ name, severity: v.severity, fix: v.fixAvailable === true ? 'npm audit fix' : v.fixAvailable ? `mayor: ${v.fixAvailable.name}@${v.fixAvailable.version}` : 'sin corrección' }));
        resolve({ counts: j.metadata?.vulnerabilities || {}, items });
      } catch {
        resolve({ counts: null, items: [], error: err ? err.message.split('\n')[0] : 'salida no válida' });
      }
    });
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  };
  const base = argv.find((a) => /^https?:\/\//.test(a));
  const json = argv.includes('--json');
  const audit = argv.includes('--audit');
  const adminPath = opt('admin-path') || null;
  if (!base && !audit) {
    console.error('Uso: npm run security:scan -- <urlBase> [--admin-path /ruta] [--audit] [--json] [--insecure]');
    process.exitCode = 2;
    return;
  }
  let fails = 0;
  const out = { base: base || null, results: [], audit: null };
  if (base) {
    if (!json) console.log(`Barrido de ${base}${adminPath ? ' (con ruta del panel indicada)' : ''} — solo lectura, sin credenciales\n`);
    out.results = await scan(base, { adminPath, insecure: argv.includes('--insecure'), log: json ? () => {} : (l) => console.log(l) });
    fails += out.results.filter((r) => r.ok === false).length;
  }
  if (audit) {
    out.audit = {};
    for (const [label, dir] of [['portal', PORTAL_ROOT], ['portal/web', path.join(PORTAL_ROOT, 'web')], ['raíz', path.dirname(PORTAL_ROOT)]]) {
      const s = await auditSummary(dir);
      out.audit[label] = s;
      const open = s.items.filter((x) => ['high', 'critical'].includes(x.severity) && !ACCEPTED_ADVISORIES[x.name]);
      fails += open.length;
      if (!json) {
        console.log(`\nnpm audit ${label}: ${s.counts ? JSON.stringify(s.counts) : s.error}`);
        for (const x of s.items) console.log(`  ${x.severity.padEnd(8)} ${x.name} (${x.fix})${ACCEPTED_ADVISORIES[x.name] ? ' — aceptado: ' + ACCEPTED_ADVISORIES[x.name] : ''}`);
      }
    }
  }
  if (json) console.log(JSON.stringify(out, null, 2));
  else {
    const n = out.results.length;
    console.log(`\nResumen: ${n} comprobaciones, ${out.results.filter((r) => r.ok === true).length} correctas, ${out.results.filter((r) => r.ok === 'warn').length} avisos, ${fails} fallos.`);
  }
  process.exitCode = fails ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
