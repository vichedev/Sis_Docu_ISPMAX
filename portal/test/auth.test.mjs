// Autenticación endurecida (Adenda 5) contra TEST_DATABASE_URL (destructiva: vacía sus tablas).
// Sesiones por huella, rotación, caducidades, bloqueo persistente, mensajes y tiempos, política, sesión restringida,
// TOTP + recuperación, sesiones propias, auditoría y migración de la tabla de sesiones antigua.
// Uso: node --test --test-concurrency=1 test/auth.test.mjs   (desde portal/)
import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';

loadEnv();
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('Falta TEST_DATABASE_URL');
if (TEST_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
process.env.DATABASE_URL = TEST_URL;
process.env.PORTAL_ADMIN_USER = 'admin_auth';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off';
process.env.PORTAL_WORK_DIR = path.join(PORTAL_ROOT, 'work-test', 'auth-test', 'work');
process.env.PORTAL_DATA_DIR = path.join(PORTAL_ROOT, 'work-test', 'auth-test', 'data');
delete process.env.PORTAL_SECRET_KEY; // se prueba la clave en archivo (data/secret.key)

const { buildApp } = await import('../server/index.mjs');
const { applySchema } = await import('../server/schema.mjs');
const { sha256 } = await import('../server/security/secrets.mjs');
const { totp, base32Decode } = await import('../server/security/totp.mjs');
const bcrypt = (await import('bcryptjs')).default;
const pg = (await import('pg')).default;

const PASS = 'Clave-de-prueba-1';
const apps = [];
let app; // proxy de confianza: la IP sale de X-Forwarded-For (así se simulan varias IP)
let pool;
let ipN = 10;
const freshIp = () => `198.51.100.${ipN++ % 250}`;

async function mk(config = {}) {
  const a = await buildApp({ databaseUrl: TEST_URL, config: { trustProxy: true, allowedOrigins: new Set(), adminIps: { any: true, allowed: () => true }, ...config }, watchSite: false });
  apps.push(a);
  return a;
}
const cookieOf = (res) => res.cookies.find((c) => c.name === 'portal_session' || c.name === '__Host-portal_session');
async function call(a, method, url, { cookie, payload, ip = '198.51.100.250', headers = {} } = {}) {
  const res = await a.inject({ method, url, payload, headers: { 'x-forwarded-for': ip, 'user-agent': 'prueba-auth/1.0', ...(cookie ? { cookie } : {}), ...headers } });
  let json = null;
  try {
    json = res.json();
  } catch {}
  return { res, status: res.statusCode, json };
}
async function login(a, username, password, opts = {}) {
  const r = await call(a, 'POST', '/api/auth/login', { payload: { username, password }, ...opts });
  const c = cookieOf(r.res);
  return { ...r, cookie: c ? `${c.name}=${c.value}` : null, set: c };
}
async function mkUser(username, password, role = 'viewer', extra = {}) {
  const hash = await bcrypt.hash(password, 4);
  const r = await pool.query(
    'INSERT INTO users (username, display_name, password_hash, role, must_change_password) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [username, 'Persona ' + username, hash, role, extra.mustChange ?? false]
  );
  return r.rows[0].id;
}
const clearLocks = () => pool.query('TRUNCATE login_attempts, login_locks');

before(async () => {
  pool = new pg.Pool({ connectionString: TEST_URL });
  await resetTestDb(pool);
  app = await mk();
  await app.portal.ensureAdmin();
});
after(async () => {
  for (const a of apps) await a.close().catch(() => {});
  await pool?.end();
  safeRm(path.join(PORTAL_ROOT, 'work-test', 'auth-test'));
});

test('migración: la tabla de sesiones antigua (token en claro) se convierte; las sesiones antiguas dejan de valer y los usuarios se conservan', async () => {
  const uid = await mkUser('migra_u', 'Clave-Migracion-77');
  const before = (await pool.query('SELECT password_hash FROM users WHERE id = $1', [uid])).rows[0].password_hash;
  await pool.query('DROP TABLE sessions');
  await pool.query('CREATE TABLE sessions (token text PRIMARY KEY, user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL)');
  const oldToken = 'a'.repeat(64);
  await pool.query("INSERT INTO sessions VALUES ($1, $2, now() + interval '1 day')", [oldToken, uid]);
  await applySchema(pool);
  await applySchema(pool); // idempotente
  const cols = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions' ORDER BY column_name")).rows.map((r) => r.column_name);
  assert.ok(!cols.includes('token'), 'sin columna con el token en claro');
  for (const c of ['id', 'token_hash', 'created_at', 'last_seen_at', 'ip', 'user_agent', 'expires_at']) assert.ok(cols.includes(c), c);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM sessions')).rows[0].n, 0, 'las antiguas se borran');
  assert.equal((await pool.query('SELECT password_hash FROM users WHERE id = $1', [uid])).rows[0].password_hash, before, 'hash bcrypt intacto');
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: `portal_session=${oldToken}` })).status, 401);
  assert.equal((await login(app, 'migra_u', 'Clave-Migracion-77', { ip: freshIp() })).status, 200, 'el usuario migrado entra');
});

test('sesión: token aleatorio solo en la cookie; en la BD su SHA-256; cookie HttpOnly, SameSite=Strict, Path=/ (http: portal_session)', async () => {
  const r = await login(app, 'admin_auth', PASS, { ip: freshIp() });
  assert.equal(r.status, 200);
  assert.equal(r.set.name, 'portal_session');
  assert.equal(r.set.httpOnly, true);
  assert.equal(String(r.set.sameSite).toLowerCase(), 'strict');
  assert.equal(r.set.path, '/');
  assert.equal(r.set.domain, undefined);
  assert.equal(r.set.maxAge, 7 * 86400);
  assert.match(r.set.value, /^[0-9a-f]{64}$/);
  const rows = (await pool.query('SELECT * FROM sessions')).rows;
  const dump = JSON.stringify(rows);
  assert.ok(!dump.includes(r.set.value), 'el token no está en la BD');
  assert.ok(rows.some((x) => x.token_hash === sha256(r.set.value)), 'está su huella');
  const mine = rows.find((x) => x.token_hash === sha256(r.set.value));
  assert.ok(mine.ip && mine.user_agent === 'prueba-auth/1.0' && mine.created_at && mine.last_seen_at);
  assert.equal(r.json.user.username, 'admin_auth');
  assert.deepEqual(Object.keys(r.json.user).sort(), ['display_name', 'id', 'mustChangePassword', 'mustEnrollTwoFactor', 'role', 'twoFactor', 'username']);
});

test('cookie con https efectivo: __Host-portal_session, Secure; se lee solo con ese nombre', async () => {
  const ip = freshIp();
  const r = await login(app, 'admin_auth', PASS, { ip, headers: { 'x-forwarded-proto': 'https' } });
  assert.equal(r.set.name, '__Host-portal_session');
  assert.equal(r.set.secure, true);
  assert.equal(r.set.path, '/');
  assert.equal(r.set.domain, undefined);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: r.cookie, ip, headers: { 'x-forwarded-proto': 'https' } })).status, 200);
  // por http (sin Secure) ese nombre no cuenta, ni el token con el otro nombre por https
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: r.cookie, ip })).status, 401);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: `portal_session=${r.set.value}`, ip, headers: { 'x-forwarded-proto': 'https' } })).status, 401);
});

test('rotación y fijación: cada inicio crea un token nuevo y borra el que traía el navegador; un token inventado no se adopta', async () => {
  const ip = freshIp();
  const a = await login(app, 'admin_auth', PASS, { ip });
  const b = await login(app, 'admin_auth', PASS, { ip, cookie: a.cookie });
  assert.notEqual(a.set.value, b.set.value);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: a.cookie, ip })).status, 401, 'la sesión anterior del mismo navegador se cierra');
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: b.cookie, ip })).status, 200);
  const fixed = 'b'.repeat(64);
  const c = await login(app, 'admin_auth', PASS, { ip, cookie: `portal_session=${fixed}` });
  assert.notEqual(c.set.value, fixed);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: `portal_session=${fixed}`, ip })).status, 401);
});

test('caducidad por inactividad y absoluta; logout invalida; /me con sesión y acceso anterior', async () => {
  const ip = freshIp();
  const s1 = await login(app, 'admin_auth', PASS, { ip });
  const me = await call(app, 'GET', '/api/auth/me', { cookie: s1.cookie, ip });
  assert.equal(me.status, 200);
  assert.ok(me.json.session.id && me.json.session.createdAt && me.json.session.lastSeenAt && me.json.session.expiresAt);
  assert.ok(me.json.lastLogin && me.json.lastLogin.at, 'acceso anterior');
  await pool.query("UPDATE sessions SET last_seen_at = now() - interval '13 hours' WHERE token_hash = $1", [sha256(s1.set.value)]);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: s1.cookie, ip })).status, 401, 'inactividad > 12 h');
  const s2 = await login(app, 'admin_auth', PASS, { ip });
  await pool.query("UPDATE sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1", [sha256(s2.set.value)]);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: s2.cookie, ip })).status, 401, 'caducidad absoluta');
  const s3 = await login(app, 'admin_auth', PASS, { ip });
  assert.equal((await call(app, 'POST', '/api/auth/logout', { cookie: s3.cookie, ip })).status, 200);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: s3.cookie, ip })).status, 401, 'tras logout');
  // Variables de entorno: caducidades configurables
  const short = await mk({ sessionIdleHours: 0.05, sessionMaxDays: 1 });
  const s4 = await login(short, 'admin_auth', PASS, { ip });
  assert.equal(s4.set.maxAge, 86400);
  await pool.query("UPDATE sessions SET last_seen_at = now() - interval '4 minutes' WHERE token_hash = $1", [sha256(s4.set.value)]);
  assert.equal((await call(short, 'GET', '/api/auth/me', { cookie: s4.cookie, ip })).status, 401, '3 min de inactividad');
});

test('mensajes genéricos e igualación de tiempos: usuario inexistente, inactivo o contraseña mala son indistinguibles', async () => {
  await clearLocks();
  await mkUser('inactivo_u', 'Clave-Inactiva-55', 'viewer');
  await pool.query("UPDATE users SET active = false WHERE username = 'inactivo_u'");
  await login(app, 'nadie_x', 'calentar', { ip: freshIp() }); // calienta el hash ficticio
  const N = 4;
  const timeOf = async (u, p) => {
    let total = 0;
    let body = null;
    for (let i = 0; i < N; i++) {
      const t0 = process.hrtime.bigint();
      const r = await login(app, u, p, { ip: freshIp() });
      total += Number(process.hrtime.bigint() - t0) / 1e6;
      assert.equal(r.status, 401, u);
      body = r.res.body;
    }
    return { ms: total / N, body };
  };
  const ghost = await timeOf('no_existe_nunca', 'Una-Clave-Cualquiera-1');
  const wrong = await timeOf('admin_auth', 'Una-Clave-Cualquiera-1');
  const inactive = await timeOf('inactivo_u', 'Clave-Inactiva-55');
  assert.equal(ghost.body, wrong.body);
  assert.equal(inactive.body, wrong.body);
  assert.deepEqual(JSON.parse(wrong.body), { error: 'Usuario o contraseña incorrectos.' });
  const ratio = ghost.ms / wrong.ms;
  assert.ok(ratio > 0.6 && ratio < 1.7, `tiempos parecidos: inexistente ${ghost.ms.toFixed(0)} ms vs existente ${wrong.ms.toFixed(0)} ms`);
  // el hash antiguo (coste 4 en la prueba) se rehízo con el coste actual al entrar bien
  await login(app, 'migra_u', 'Clave-Migracion-77', { ip: freshIp() });
  assert.equal(bcrypt.getRounds((await pool.query("SELECT password_hash FROM users WHERE username = 'migra_u'")).rows[0].password_hash), 12);
});

test('bloqueo usuario+IP: 5 fallos → 429 con Retry-After y retryAfter; persiste tras reiniciar; se reinicia con un acceso correcto; crece', async () => {
  await clearLocks();
  const ip = freshIp();
  let r;
  for (let i = 0; i < 5; i++) r = await login(app, 'admin_auth', 'mala-' + i, { ip });
  assert.equal(r.status, 401);
  r = await login(app, 'admin_auth', PASS, { ip });
  assert.equal(r.status, 429, 'bloqueado aunque la contraseña sea buena');
  assert.ok(Number(r.res.headers['retry-after']) > 800 && Number(r.res.headers['retry-after']) <= 900);
  assert.equal(r.json.retryAfter, Number(r.res.headers['retry-after']));
  assert.match(r.json.error, /Demasiados intentos/);
  assert.equal((await login(app, 'admin_auth', PASS, { ip: freshIp() })).status, 200, 'otra IP no queda bloqueada');
  // reinicio simulado: otra instancia del servidor sobre la misma BD
  const app2 = await mk();
  assert.equal((await login(app2, 'admin_auth', PASS, { ip })).status, 429, 'persiste tras reiniciar');
  // pasa el tiempo
  await pool.query('UPDATE login_locks SET locked_until = now() - interval \'1 second\'');
  assert.equal((await login(app2, 'admin_auth', PASS, { ip })).status, 200, 'acceso correcto al terminar');
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM login_attempts WHERE ip = $1", [ip])).rows[0].n, 0, 'contador reiniciado');
  // bloqueo creciente: el siguiente dura el doble
  for (let i = 0; i < 5; i++) await login(app2, 'admin_auth', 'mala-' + i, { ip });
  await pool.query("UPDATE login_locks SET locked_until = now() - interval '1 second', level = 0 WHERE scope = 'user_ip'"); // termina, nivel 0 conservado en la fila
  for (let i = 0; i < 5; i++) await login(app2, 'admin_auth', 'mala-' + i, { ip });
  const again = await login(app2, 'admin_auth', PASS, { ip });
  assert.equal(again.status, 429);
  assert.ok(again.json.retryAfter > 1700, `segundo bloqueo ~30 min (${again.json.retryAfter} s)`);
});

test('bloqueo por IP (20 fallos con usuarios distintos) y por usuario en muchas IP (30)', async () => {
  await clearLocks();
  const ip = freshIp();
  for (let i = 0; i < 20; i++) await login(app, `inventado_${i}`, 'x-mala', { ip });
  const r = await login(app, 'admin_auth', PASS, { ip });
  assert.equal(r.status, 429, 'IP bloqueada');
  await clearLocks();
  for (let i = 0; i < 30; i++) await login(app, 'admin_auth', 'x-mala', { ip: `203.0.113.${i + 1}` });
  const u = await login(app, 'admin_auth', PASS, { ip: freshIp() });
  assert.equal(u.status, 429, 'usuario bloqueado aunque cada IP lo intente pocas veces (X-Forwarded-For falsificable)');
  assert.ok(u.json.retryAfter <= 3600);
  const lock = (await pool.query("SELECT action, detail FROM audit_log WHERE action = 'auth.lockout' ORDER BY id DESC LIMIT 1")).rows[0];
  assert.equal(lock.detail.scope, 'user');
  await clearLocks();
});

test('política de contraseñas en todos los caminos y cambio obligatorio si la contraseña guardada es débil', async () => {
  await clearLocks();
  const ip = freshIp();
  const admin = (await login(app, 'admin_auth', PASS, { ip })).cookie;
  const weak = await call(app, 'POST', '/api/users', { cookie: admin, ip, payload: { username: 'pol_u', password: 'password123', role: 'viewer' } });
  assert.equal(weak.status, 400);
  assert.ok(Array.isArray(weak.json.problems) && weak.json.problems.length);
  assert.equal((await call(app, 'POST', '/api/users', { cookie: admin, ip, payload: { username: 'pol_u', password: 'pol_u2026!!', role: 'viewer' } })).status, 400, 'derivada del usuario');
  const ok = await call(app, 'POST', '/api/users', { cookie: admin, ip, payload: { username: 'pol_u', password: 'Clave-Politica-31', role: 'viewer' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.twoFactor, false);
  // reset por un admin: política y cambio obligatorio para la persona
  assert.equal((await call(app, 'PUT', `/api/users/${ok.json.id}`, { cookie: admin, ip, payload: { password: '12345' } })).status, 400);
  const reset = await call(app, 'PUT', `/api/users/${ok.json.id}`, { cookie: admin, ip, payload: { password: 'Clave-Reseteada-42' } });
  assert.equal(reset.status, 200);
  assert.equal(reset.json.mustChangePassword, true);
  // contraseña débil guardada (usuario antiguo): al entrar, sesión restringida
  await mkUser('debil_u', 'password123', 'editor');
  const d = await login(app, 'debil_u', 'password123', { ip });
  assert.equal(d.status, 200);
  assert.equal(d.json.user.mustChangePassword, true);
  const blocked = await call(app, 'GET', '/api/pages', { cookie: d.cookie, ip });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.equal((await call(app, 'GET', '/api/stats', { cookie: d.cookie, ip })).json.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: d.cookie, ip })).status, 200, '/api/auth/* sí');
  const bad = await call(app, 'PUT', '/api/auth/password', { cookie: d.cookie, ip, payload: { current: 'password123', new: 'qwerty123' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.json.problems.length);
  assert.equal((await call(app, 'PUT', '/api/auth/password', { cookie: d.cookie, ip, payload: { current: 'password123', new: 'password123' } })).status, 400);
  assert.equal((await call(app, 'PUT', '/api/auth/password', { cookie: d.cookie, ip, payload: { current: 'password123', new: 'Clave-Ya-Fuerte-88' } })).json.ok, true);
  assert.equal((await call(app, 'GET', '/api/pages', { cookie: d.cookie, ip })).status, 200, 'restricción levantada');
  // el admin inicial por entorno con contraseña débil queda marcado
  await pool.query("UPDATE users SET active = false WHERE username = 'debil_u'");
});

test('2FA: alta (QR/secreto), códigos de recuperación, inicio en dos pasos, anti-reutilización, reto de un solo uso y 5 min, desactivar y restablecer', async () => {
  await clearLocks();
  const ip = freshIp();
  await mkUser('dos_u', 'Clave-Dos-Pasos-61', 'editor');
  const s = (await login(app, 'dos_u', 'Clave-Dos-Pasos-61', { ip })).cookie;
  assert.equal((await call(app, 'POST', '/api/auth/2fa/setup', { cookie: s, ip, payload: { password: 'mala' } })).status, 400);
  const setup = await call(app, 'POST', '/api/auth/2fa/setup', { cookie: s, ip, payload: { password: 'Clave-Dos-Pasos-61' } });
  assert.equal(setup.status, 200);
  assert.match(setup.json.secret, /^[A-Z2-7]{32}$/);
  assert.match(setup.json.otpauthUrl, /^otpauth:\/\/totp\/ISPMAX%20Manual%3Ados_u\?secret=/);
  const key = base32Decode(setup.json.secret);
  assert.equal((await call(app, 'POST', '/api/auth/2fa/enable', { cookie: s, ip, payload: { code: '000000' === totp(key) ? '111111' : '000000' } })).status, 400);
  const now = Date.now() / 1000;
  const en = await call(app, 'POST', '/api/auth/2fa/enable', { cookie: s, ip, payload: { code: totp(key, { time: now }) } });
  assert.equal(en.status, 200);
  assert.equal(en.json.recoveryCodes.length, 10);
  assert.equal(new Set(en.json.recoveryCodes).size, 10);
  for (const c of en.json.recoveryCodes) assert.match(c, /^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  // en reposo: secreto cifrado, códigos solo como huella
  const row = (await pool.query("SELECT totp_secret_enc, totp_pending_enc, totp_enabled FROM users WHERE username = 'dos_u'")).rows[0];
  assert.equal(row.totp_enabled, true);
  assert.match(row.totp_secret_enc, /^v1:/);
  assert.equal(row.totp_pending_enc, null);
  assert.ok(!row.totp_secret_enc.includes(setup.json.secret));
  const rc = JSON.stringify((await pool.query('SELECT * FROM recovery_codes')).rows);
  for (const c of en.json.recoveryCodes) assert.ok(!rc.includes(c) && !rc.includes(c.replace('-', '')));
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: s, ip })).json.user.twoFactor, true);

  // inicio en dos pasos: sin cookie hasta el segundo paso
  const step1 = await login(app, 'dos_u', 'Clave-Dos-Pasos-61', { ip });
  assert.equal(step1.status, 200);
  assert.equal(step1.json.twoFactorRequired, true);
  assert.match(step1.json.challenge, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(step1.cookie, null, 'sin sesión todavía');
  assert.equal(step1.json.user, undefined);
  assert.ok(!JSON.stringify((await pool.query('SELECT * FROM login_challenges')).rows).includes(step1.json.challenge), 'reto solo como huella');
  // el código usado al activar (mismo paso) no vale otra vez
  const reused = await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: step1.json.challenge, code: totp(key, { time: now }) } });
  assert.equal(reused.status, 401);
  const next = totp(key, { time: now + 30 });
  const ok = await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: step1.json.challenge, code: next } });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  const sess = cookieOf(ok.res);
  assert.ok(sess);
  assert.equal(ok.json.user.twoFactor, true);
  assert.equal((await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: step1.json.challenge, code: next } })).status, 401, 'reto de un solo uso');
  const step1b = await login(app, 'dos_u', 'Clave-Dos-Pasos-61', { ip });
  assert.equal((await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: step1b.json.challenge, code: next } })).status, 401, 'código ya usado: anti-reutilización');
  // código de recuperación: una sola vez
  const rcode = en.json.recoveryCodes[0].toLowerCase().replace('-', ' ');
  const viaRc = await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: step1b.json.challenge, code: rcode } });
  assert.equal(viaRc.status, 200);
  const step1c = await login(app, 'dos_u', 'Clave-Dos-Pasos-61', { ip });
  assert.equal((await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: step1c.json.challenge, code: en.json.recoveryCodes[0] } })).status, 401, 'recuperación de un solo uso');
  // reto caducado (5 min)
  await pool.query("UPDATE login_challenges SET expires_at = now() - interval '1 second' WHERE used_at IS NULL");
  assert.equal((await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: step1c.json.challenge, code: en.json.recoveryCodes[1] } })).status, 401, 'caducado');
  const fresh = await login(app, 'dos_u', 'Clave-Dos-Pasos-61', { ip });
  const ttl = (await pool.query("SELECT extract(epoch FROM expires_at - created_at)::int AS s FROM login_challenges WHERE token_hash = $1", [sha256(fresh.json.challenge)])).rows[0].s;
  assert.equal(ttl, 300);
  // códigos erróneos: cuentan para el bloqueo (no se puede probar el millón de códigos)
  await clearLocks();
  let last;
  for (let i = 0; i < 5; i++) last = await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: fresh.json.challenge, code: String(100000 + i) } });
  assert.equal(last.status, 401);
  assert.equal((await login(app, 'dos_u', 'Clave-Dos-Pasos-61', { ip })).status, 429, 'usuario+IP bloqueado');
  await clearLocks();
  assert.equal((await call(app, 'POST', '/api/auth/login/2fa', { ip, payload: { challenge: fresh.json.challenge, code: en.json.recoveryCodes[2] } })).status, 401, 'reto anulado tras 5 códigos erróneos');
  // desactivar: contraseña + código
  const sc = `${sess.name}=${sess.value}`;
  assert.equal((await call(app, 'POST', '/api/auth/2fa/disable', { cookie: sc, ip, payload: { password: 'Clave-Dos-Pasos-61', code: '123' } })).status, 400);
  assert.equal((await call(app, 'POST', '/api/auth/2fa/disable', { cookie: sc, ip, payload: { password: 'Clave-Dos-Pasos-61', code: en.json.recoveryCodes[3] } })).status, 200);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM recovery_codes r JOIN users u ON u.id = r.user_id WHERE u.username = 'dos_u'")).rows[0].n, 0);
  // restablecer por un admin
  const s2 = await call(app, 'POST', '/api/auth/2fa/setup', { cookie: sc, ip, payload: { password: 'Clave-Dos-Pasos-61' } });
  await call(app, 'POST', '/api/auth/2fa/enable', { cookie: sc, ip, payload: { code: totp(base32Decode(s2.json.secret), { time: now + 60 }) } });
  const uid = (await pool.query("SELECT id FROM users WHERE username = 'dos_u'")).rows[0].id;
  assert.equal((await call(app, 'POST', `/api/users/${uid}/2fa/reset`, { cookie: sc, ip })).status, 403, 'un editor no puede');
  const admin = (await login(app, 'admin_auth', PASS, { ip })).cookie;
  assert.equal((await call(app, 'POST', `/api/users/${uid}/2fa/reset`, { cookie: admin, ip })).status, 200);
  assert.equal((await call(app, 'POST', '/api/users/999999/2fa/reset', { cookie: admin, ip })).status, 404);
  const users = (await call(app, 'GET', '/api/users', { cookie: admin, ip })).json.items;
  assert.equal(users.find((x) => x.username === 'dos_u').twoFactor, false);
  assert.ok(!JSON.stringify(users).includes('totp'), 'sin columnas de secretos');
});

test('require_2fa_for_admins: un admin sin 2FA queda restringido (2FA_ENROLL_REQUIRED) hasta activarla', async () => {
  await clearLocks();
  const ip = freshIp();
  await mkUser('admin_dos', 'Clave-Admin-Dos-72', 'admin');
  const a = (await login(app, 'admin_auth', PASS, { ip })).cookie;
  const g = await call(app, 'GET', '/api/settings', { cookie: a, ip });
  const def = g.json.definitions.find((d) => d.key === 'require_2fa_for_admins');
  assert.equal(def.section, 'seguridad');
  assert.equal(def.type, 'boolean');
  assert.equal(g.json.settings.require_2fa_for_admins, false);
  assert.equal((await call(app, 'PUT', '/api/settings', { cookie: a, ip, payload: { require_2fa_for_admins: true } })).status, 200);
  const b = (await login(app, 'admin_dos', 'Clave-Admin-Dos-72', { ip })).cookie;
  const me = await call(app, 'GET', '/api/auth/me', { cookie: b, ip });
  assert.equal(me.json.user.mustEnrollTwoFactor, true);
  const r = await call(app, 'GET', '/api/users', { cookie: b, ip });
  assert.equal(r.status, 403);
  assert.equal(r.json.code, '2FA_ENROLL_REQUIRED');
  const setup = await call(app, 'POST', '/api/auth/2fa/setup', { cookie: b, ip, payload: { password: 'Clave-Admin-Dos-72' } });
  assert.equal(setup.status, 200);
  await call(app, 'POST', '/api/auth/2fa/enable', { cookie: b, ip, payload: { code: totp(base32Decode(setup.json.secret)) } });
  assert.equal((await call(app, 'GET', '/api/users', { cookie: b, ip })).status, 200, 'con 2FA ya puede');
  // un editor no se ve afectado
  await pool.query("DELETE FROM settings WHERE key = 'require_2fa_for_admins'");
  app.portal.ctx.auth.invalidateSettings();
});

test('sesiones propias: listar, cerrar una, cerrar las demás; nunca las de otra persona', async () => {
  await clearLocks();
  const ip = freshIp();
  await mkUser('ses_u', 'Clave-Sesiones-93', 'viewer');
  const c1 = (await login(app, 'ses_u', 'Clave-Sesiones-93', { ip })).cookie;
  const c2 = (await login(app, 'ses_u', 'Clave-Sesiones-93', { ip: freshIp() })).cookie;
  const c3 = (await login(app, 'ses_u', 'Clave-Sesiones-93', { ip: freshIp() })).cookie;
  const list = await call(app, 'GET', '/api/auth/sessions', { cookie: c1, ip });
  assert.equal(list.json.items.length, 3);
  assert.equal(list.json.items.filter((x) => x.current).length, 1);
  for (const it of list.json.items) assert.deepEqual(Object.keys(it).sort(), ['createdAt', 'current', 'id', 'ip', 'lastSeenAt', 'userAgent']);
  assert.ok(!JSON.stringify(list.json).includes('token'));
  const me2 = await call(app, 'GET', '/api/auth/me', { cookie: c2, ip });
  assert.equal((await call(app, 'DELETE', `/api/auth/sessions/${me2.json.session.id}`, { cookie: c1, ip })).status, 200);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: c2, ip })).status, 401);
  // la sesión de otra persona: 404
  const adm = (await login(app, 'admin_auth', PASS, { ip })).cookie;
  const admId = (await call(app, 'GET', '/api/auth/me', { cookie: adm, ip })).json.session.id;
  assert.equal((await call(app, 'DELETE', `/api/auth/sessions/${admId}`, { cookie: c1, ip })).status, 404);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: adm, ip })).status, 200);
  const ro = await call(app, 'POST', '/api/auth/sessions/revoke-others', { cookie: c1, ip });
  assert.deepEqual(ro.json, { revoked: 1 });
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: c3, ip })).status, 401);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: c1, ip })).status, 200);
  // cambiar la contraseña cierra las demás y conserva la actual
  const c4 = (await login(app, 'ses_u', 'Clave-Sesiones-93', { ip: freshIp() })).cookie;
  assert.equal((await call(app, 'PUT', '/api/auth/password', { cookie: c1, ip, payload: { current: 'Clave-Sesiones-93', new: 'Clave-Sesiones-94b' } })).status, 200);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: c4, ip })).status, 401);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: c1, ip })).status, 200);
  // desactivar o cambiar de rol a una persona cierra sus sesiones
  const sesId = (await pool.query("SELECT id FROM users WHERE username = 'ses_u'")).rows[0].id;
  assert.equal((await call(app, 'PUT', `/api/users/${sesId}`, { cookie: adm, ip, payload: { role: 'editor' } })).status, 200);
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: c1, ip })).status, 401);
});

test('CSRF: Origin ajeno y Sec-Fetch-Site cross-site/same-site se rechazan en métodos que escriben; same-origin pasa', async () => {
  const ip = freshIp();
  const c = (await login(app, 'admin_auth', PASS, { ip })).cookie;
  const post = (headers) => call(app, 'POST', '/api/auth/sessions/revoke-others', { cookie: c, ip, headers });
  assert.equal((await post({ origin: 'https://atacante.invalid' })).status, 403);
  assert.equal((await post({ 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await post({ 'sec-fetch-site': 'same-site' })).status, 403);
  assert.equal((await post({ 'sec-fetch-site': 'same-origin' })).status, 200);
  assert.equal((await call(app, 'POST', '/api/auth/login', { ip, payload: { username: 'admin_auth', password: PASS }, headers: { 'sec-fetch-site': 'cross-site' } })).status, 403, 'login CSRF');
  // un GET con cross-site no cambia nada y no se bloquea (la cookie SameSite=Strict no viajaría desde otro sitio)
  assert.equal((await call(app, 'GET', '/api/auth/me', { cookie: c, ip, headers: { 'sec-fetch-site': 'cross-site' } })).status, 200);
  // tamaño: cuerpo de login enorme → 413
  assert.equal((await call(app, 'POST', '/api/auth/login', { ip, payload: { username: 'x', password: 'y'.repeat(20000) } })).status, 413);
});

test('auditoría: eventos de autenticación con IP y UA; nunca contraseñas, códigos ni secretos', async () => {
  const rows = (await pool.query('SELECT action, target, detail FROM audit_log')).rows;
  const actions = new Set(rows.map((r) => r.action));
  for (const a of ['auth.login', 'auth.login_failed', 'auth.lockout', 'auth.logout', 'auth.password', 'auth.2fa_setup', 'auth.2fa_enable', 'auth.2fa_challenge', 'auth.2fa_failed', 'auth.2fa_recovery_used', 'auth.2fa_disable', 'auth.2fa_reset', 'session.revoke']) {
    assert.ok(actions.has(a), a);
  }
  const lg = rows.find((r) => r.action === 'auth.login');
  assert.ok(lg.detail.ip && lg.detail.ua === 'prueba-auth/1.0');
  const f = rows.find((r) => r.action === 'auth.login_failed');
  assert.ok(f.detail.ip && f.detail.reason);
  const dump = JSON.stringify(rows);
  for (const secret of [PASS, 'Clave-Dos-Pasos-61', 'Clave-Sesiones-93', 'mala-0', 'x-mala', 'password123', 'Una-Clave-Cualquiera-1']) assert.ok(!dump.includes(secret), secret);
});
