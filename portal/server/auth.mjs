// Autenticación, sesiones, roles, auditoría y ajustes (Adenda 5: autenticación endurecida).
//
// Sesiones: token aleatorio de 32 bytes solo en la cookie; en la BD, su SHA-256. Se crea uno nuevo en cada inicio de
// sesión (sin fijación), caduca por inactividad (PORTAL_SESSION_IDLE_H) y de forma absoluta (PORTAL_SESSION_MAX_DAYS).
// Cookie HttpOnly, SameSite=Strict, Path=/; con https efectivo, Secure y nombre __Host-portal_session.
// Bloqueo anti fuerza bruta persistente (login_attempts/login_locks), mensajes genéricos, tiempos igualados con una
// comparación bcrypt real cuando el usuario no existe o está inactivo, TOTP (RFC 6238) con secretos cifrados,
// códigos de recuperación de un solo uso y sesión restringida (cambio de contraseña o alta de 2FA obligatorios).
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { httpError, parseId } from './routes/util.mjs';
import { passwordProblems, POLICY_SUMMARY } from './passwordPolicy.mjs';
import { verifyTotp, newTotpSecret, base32Encode, otpauthUrl } from './security/totp.mjs';
import { loadSecretKey, createSecretBox, sha256 } from './security/secrets.mjs';
import { normalizeIp } from './config.mjs';

export const COOKIE = 'portal_session';
export const COOKIE_SECURE = '__Host-portal_session';
export const BCRYPT_COST = 12;
const RANK = { viewer: 1, editor: 2, admin: 3 };

// Bloqueos: por usuario+IP, por IP y (salvaguarda si la IP se pudiera falsificar) por usuario en todas las IP.
export const LOCK_RULES = {
  windowMin: 15,
  user_ip: { max: 5, baseMin: 15, capMin: 24 * 60 },
  ip: { max: 20, baseMin: 15, capMin: 24 * 60 },
  user: { max: 30, baseMin: 15, capMin: 60 },
};
const CHALLENGE_MIN = 5;
const CHALLENGE_MAX_ATTEMPTS = 5;
const PENDING_2FA_MIN = 15;
const RECOVERY_COUNT = 10;
const RC_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_INFLIGHT_LOGINS = 8;
const GENERIC_FAIL = 'Usuario o contraseña incorrectos.';
const SESSION_REQUIRED = 'Sesión requerida.';

/** Ruta decodificada y normalizada (sin query, barras repetidas colapsadas). null si la codificación no es válida. */
export function requestPath(url) {
  const raw = String(url || '/').split('?')[0];
  try {
    return decodeURIComponent(raw).replace(/\/{2,}/g, '/');
  } catch {
    return null;
  }
}

/** ¿La petición va a la API? Por la ruta que resolvió el enrutador o por la ruta decodificada (`/%61pi/…` también). */
export function isApiRequest(request) {
  const route = request.routeOptions?.url;
  if (route && (route === '/api' || route.startsWith('/api/'))) return true;
  const p = requestPath(request.url);
  return p === null || /^\/api(\/|$)/i.test(p);
}

/** Host efectivo normalizado (`host[:puerto]`, sin el puerto por defecto del protocolo). */
function normHost(host, proto = 'http') {
  if (!host) return null;
  try {
    return new URL(`${proto}://${String(host).split(',')[0].trim()}`).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Comprobación de origen (CSRF) para métodos que escriben. Se acepta si no hay `Origin` (clientes no navegador),
 * si coincide con el host efectivo de la petición (`X-Forwarded-Host` cuando se confía en el proxy; si no, `Host`)
 * o si está en PORTAL_ALLOWED_ORIGINS.
 */
export function originAllowed(request, allowedOrigins = new Set()) {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  let o;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(o.protocol)) return false;
  const proto = request.protocol || 'http';
  const hosts = new Set();
  hosts.add(normHost(request.host, proto));
  const fwd = request.headers['x-forwarded-host'];
  if (fwd && request.host !== request.headers.host) {
    for (const h of String(fwd).split(',')) hosts.add(normHost(h, proto));
  }
  hosts.delete(null);
  if (hosts.has(o.host.toLowerCase())) return true;
  if (fwd && request.host !== request.headers.host) {
    for (const h of hosts) if (h.replace(/:\d+$/, '') === o.hostname.toLowerCase()) return true;
  }
  return false;
}

/**
 * Fetch Metadata (`Sec-Fetch-Site`) en métodos que escriben: los navegadores modernos la envían siempre. Se rechaza
 * `cross-site`; `same-site` (otro subdominio u otro puerto) solo si su Origin está en PORTAL_ALLOWED_ORIGINS.
 */
export function fetchSiteAllowed(request, allowedOrigins = new Set()) {
  const s = String(request.headers['sec-fetch-site'] || '').toLowerCase();
  if (!s || s === 'same-origin' || s === 'none') return true;
  if (s === 'same-site') return !!request.headers.origin && allowedOrigins.has(request.headers.origin);
  return false;
}

const WRITE_SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const clip = (s, n) => (s == null ? null : String(s).slice(0, n));

export function createAuth({ db, tx, repoRoot, config = {} }) {
  const allowedOrigins = config.allowedOrigins ?? new Set();
  const cookieSecureForced = config.cookieSecure === true;
  const idleMs = Math.round((config.sessionIdleHours ?? 12) * 3600 * 1000);
  const maxMs = Math.round((config.sessionMaxDays ?? 7) * 86400 * 1000);
  const lastSeenEveryMs = Math.min(60_000, Math.max(1000, Math.floor(idleMs / 10)));

  async function audit(userId, action, target = null, detail = null) {
    try {
      await db.query('INSERT INTO audit_log (user_id, action, target, detail) VALUES ($1,$2,$3,$4)', [
        userId ?? null,
        action,
        target == null ? null : String(target),
        detail == null ? null : JSON.stringify(detail),
      ]);
    } catch (e) {
      console.error('[audit] no se pudo registrar:', e.message);
    }
  }

  async function getSetting(key, def = null) {
    const r = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
    if (r.rows.length) return r.rows[0].value;
    if (key === 'repo_path' && def == null) return repoRoot;
    return def;
  }

  // Ajuste require_2fa_for_admins con caché breve (se consulta en cada petición con sesión).
  let req2fa = { at: 0, v: false };
  async function require2faForAdmins() {
    if (Date.now() - req2fa.at < 5000) return req2fa.v;
    let v = false;
    try {
      v = (await getSetting('require_2fa_for_admins', false)) === true;
    } catch {}
    req2fa = { at: Date.now(), v };
    return v;
  }
  const invalidateSettings = () => (req2fa = { at: 0, v: false });

  function requireRole(...roles) {
    const min = Math.min(...roles.map((r) => RANK[r] ?? 99));
    const fn = async function (request) {
      if (!request.user) throw httpError(401, SESSION_REQUIRED);
      if ((RANK[request.user.role] ?? 0) < min) throw httpError(403, 'No tienes permiso para esta acción.');
    };
    // Rol mínimo legible por la auditoría de rutas (test/security.test.mjs).
    fn.minRole = Object.keys(RANK).find((k) => RANK[k] === min) ?? 'admin';
    return fn;
  }

  // ── Secretos (clave AES perezosa: solo se crea el archivo si alguien usa 2FA) ──
  let box = null;
  function secretBox() {
    if (!box) box = createSecretBox(loadSecretKey().key);
    return box;
  }

  // Hash bcrypt real (coste BCRYPT_COST) para igualar tiempos cuando el usuario no existe o está inactivo.
  let dummyHash = null;
  const getDummyHash = () => (dummyHash ??= bcrypt.hash(crypto.randomBytes(18).toString('base64'), BCRYPT_COST));

  // ── Cookie ──
  /** `Secure` si el protocolo efectivo es https (X-Forwarded-Proto con proxy de confianza) o PORTAL_COOKIE_SECURE=true. */
  const secureFor = (request) => cookieSecureForced || request.protocol === 'https';
  const cookieName = (request) => (secureFor(request) ? COOKIE_SECURE : COOKIE);
  const cookieOpts = (request) => ({ httpOnly: true, sameSite: 'strict', path: '/', secure: secureFor(request) });
  function setCookie(request, reply, token) {
    reply.setCookie(cookieName(request), token, { ...cookieOpts(request), maxAge: Math.floor(maxMs / 1000) });
  }
  function clearCookie(request, reply) {
    reply.clearCookie(cookieName(request), cookieOpts(request));
  }
  const tokenOf = (request) => {
    const t = request.cookies?.[cookieName(request)];
    return typeof t === 'string' && /^[0-9a-f]{64}$/.test(t) ? t : null;
  };
  const clientIp = (request) => normalizeIp(request.ip) || String(request.ip || 'desconocida').slice(0, 64);
  const who = (request) => ({ ip: clientIp(request), ua: clip(request.headers['user-agent'] || '', 200) });

  // ── Sesiones ──
  async function createSession(c, userId, request) {
    const token = crypto.randomBytes(32).toString('hex');
    const r = await c.query(
      `INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent)
       VALUES ($1,$2, now() + make_interval(secs => $3), $4, $5) RETURNING id, created_at`,
      [sha256(token), userId, maxMs / 1000, clientIp(request), clip(request.headers['user-agent'] || '', 300)]
    );
    return { token, id: r.rows[0].id };
  }

  async function sessionFromRequest(request) {
    const token = tokenOf(request);
    if (!token) return null;
    const r = await db.query(
      `SELECT s.id AS session_id, s.created_at, s.last_seen_at, s.expires_at,
              u.id, u.username, u.display_name, u.role, u.must_change_password, u.totp_enabled
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND u.active AND s.expires_at > now()
          AND s.last_seen_at > now() - make_interval(secs => $2)`,
      [sha256(token), idleMs / 1000]
    );
    const row = r.rows[0];
    if (!row) return null;
    if (Date.now() - new Date(row.last_seen_at).getTime() > lastSeenEveryMs) {
      await db.query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [row.session_id]).catch(() => {});
      row.last_seen_at = new Date();
    }
    return row;
  }

  async function flagsFor(u) {
    const mustEnrollTwoFactor = u.role === 'admin' && !u.totp_enabled && (await require2faForAdmins());
    return { twoFactor: !!u.totp_enabled, mustChangePassword: !!u.must_change_password, mustEnrollTwoFactor };
  }
  async function publicUser(u) {
    return { id: u.id, username: u.username, display_name: u.display_name, role: u.role, ...(await flagsFor(u)) };
  }

  // ── Bloqueo anti fuerza bruta (persistente) ──
  const keys = (username, ip) => ({ user_ip: `${username}|${ip}`, ip, user: username });
  async function lockedSeconds(username, ip) {
    const k = keys(username, ip);
    const r = await db.query(
      `SELECT ceil(extract(epoch FROM max(locked_until) - now()))::int AS s FROM login_locks
        WHERE locked_until > now() AND ((scope = 'user_ip' AND key = $1) OR (scope = 'ip' AND key = $2) OR (scope = 'user' AND key = $3))`,
      [k.user_ip, k.ip, k.user]
    );
    return Math.max(0, r.rows[0]?.s || 0);
  }
  async function lock(scope, key, rule) {
    const r = await db.query(
      `INSERT INTO login_locks (scope, key, locked_until, level, updated_at)
       VALUES ($1, $2, now() + make_interval(secs => $3 * 60.0), 0, now())
       ON CONFLICT (scope, key) DO UPDATE SET
         level = CASE WHEN login_locks.locked_until < now() - interval '24 hours' THEN 0 ELSE LEAST(login_locks.level + 1, 20) END,
         locked_until = now() + make_interval(secs => LEAST($4 * 60.0, $3 * 60.0 * power(2,
           CASE WHEN login_locks.locked_until < now() - interval '24 hours' THEN 0 ELSE LEAST(login_locks.level + 1, 20) END))),
         updated_at = now()
       RETURNING level, ceil(extract(epoch FROM locked_until - now()))::int AS seconds`,
      [scope, key, rule.baseMin, rule.capMin]
    );
    return r.rows[0];
  }
  /** Registra un fallo y bloquea lo que supere su umbral. Devuelve los segundos del bloqueo creado (0 si ninguno). */
  async function recordFailure(username, ip, request, userId = null) {
    await db.query('INSERT INTO login_attempts (username, ip) VALUES ($1,$2)', [username, ip]);
    const c = (
      await db.query(
        `SELECT count(*) FILTER (WHERE username = $1 AND ip = $2)::int AS user_ip,
                count(*) FILTER (WHERE ip = $2)::int AS ip,
                count(*) FILTER (WHERE username = $1)::int AS "user"
           FROM login_attempts WHERE created_at > now() - make_interval(mins => $3) AND (username = $1 OR ip = $2)`,
        [username, ip, LOCK_RULES.windowMin]
      )
    ).rows[0];
    const k = keys(username, ip);
    let seconds = 0;
    for (const scope of ['user_ip', 'ip', 'user']) {
      if (c[scope] < LOCK_RULES[scope].max) continue;
      const l = await lock(scope, k[scope], LOCK_RULES[scope]);
      seconds = Math.max(seconds, l.seconds);
      if (scope === 'user_ip') await db.query('DELETE FROM login_attempts WHERE username = $1 AND ip = $2', [username, ip]);
      else if (scope === 'ip') await db.query('DELETE FROM login_attempts WHERE ip = $1', [ip]);
      else await db.query('DELETE FROM login_attempts WHERE username = $1', [username]);
      await audit(userId, 'auth.lockout', username, { scope, level: l.level, seconds: l.seconds, ...who(request) });
    }
    return seconds;
  }
  async function resetFailures(username, ip) {
    const k = keys(username, ip);
    await db.query('DELETE FROM login_attempts WHERE username = $1 AND ip = $2', [username, ip]);
    await db.query("DELETE FROM login_locks WHERE scope = 'user_ip' AND key = $1", [k.user_ip]);
  }
  function tooMany(reply, seconds) {
    const s = Math.max(1, Math.ceil(seconds));
    reply.header('retry-after', String(s));
    const min = Math.ceil(s / 60);
    throw httpError(429, `Demasiados intentos. Espera ${min} ${min === 1 ? 'minuto' : 'minutos'} e inténtalo de nuevo.`, { retryAfter: s });
  }

  // Limpieza ocasional (como mucho cada 10 min): intentos viejos, retos y sesiones caducadas.
  let lastCleanup = 0;
  async function cleanup() {
    if (Date.now() - lastCleanup < 10 * 60_000) return;
    lastCleanup = Date.now();
    await db.query("DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'").catch(() => {});
    await db.query("DELETE FROM login_challenges WHERE expires_at < now() - interval '1 hour'").catch(() => {});
    await db
      .query('DELETE FROM sessions WHERE expires_at < now() OR last_seen_at < now() - make_interval(secs => $1)', [idleMs / 1000])
      .catch(() => {});
    await db.query("DELETE FROM login_locks WHERE locked_until < now() - interval '2 days'").catch(() => {});
  }

  // Límite de verificaciones bcrypt simultáneas (cada una cuesta ~¼ s de CPU): evita agotar el servidor.
  let inflight = 0;
  async function withSlot(reply, fn) {
    if (inflight >= MAX_INFLIGHT_LOGINS) {
      reply.header('retry-after', '2');
      throw httpError(429, 'Hay demasiados inicios de sesión a la vez. Inténtalo en unos segundos.', { retryAfter: 2 });
    }
    inflight++;
    try {
      return await fn();
    } finally {
      inflight--;
    }
  }

  // ── Usuarios ──
  async function hashPassword(p) {
    return bcrypt.hash(p, BCRYPT_COST);
  }

  async function ensureAdmin() {
    const n = (await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n;
    if (n > 0) return false;
    const username = process.env.PORTAL_ADMIN_USER;
    const password = process.env.PORTAL_ADMIN_PASSWORD;
    if (!username || !password) {
      console.warn('[auth] No hay usuarios y faltan PORTAL_ADMIN_USER/PORTAL_ADMIN_PASSWORD: no se creó el admin inicial.');
      return false;
    }
    const weak = passwordProblems(password, username).length > 0;
    if (weak) console.warn('[auth] La contraseña inicial no cumple la política: se pedirá cambiarla en el primer acceso.');
    const hash = await hashPassword(password);
    await db.query(
      "INSERT INTO users (username, display_name, password_hash, role, must_change_password, password_changed_at) VALUES ($1,$2,$3,'admin',$4, now())",
      [username, 'Administrador', hash, weak]
    );
    console.log(`[auth] Admin inicial creado: ${username}`);
    return true;
  }

  // ── Recuperación y TOTP ──
  function newRecoveryCodes() {
    const out = [];
    for (let i = 0; i < RECOVERY_COUNT; i++) {
      const b = crypto.randomBytes(10);
      let s = '';
      for (const x of b) s += RC_ALPHABET[x & 31];
      out.push(`${s.slice(0, 5)}-${s.slice(5)}`);
    }
    return out;
  }
  const normRecovery = (code) => String(code ?? '').toUpperCase().replace(/[\s-]/g, '');
  const rcHash = (userId, norm) => sha256(`rc:${userId}:${norm}`);
  const isRecoveryShape = (n) => n.length === 10 && [...n].every((ch) => RC_ALPHABET.includes(ch));

  /** Verifica un código TOTP del secreto activo (con anti-reutilización atómica) o consume un código de recuperación. */
  async function verifySecondFactor(u, code) {
    const c = String(code ?? '').trim();
    if (/^\d{6}$/.test(c.replace(/\s/g, ''))) {
      if (!u.totp_secret_enc) return { ok: false };
      let key;
      try {
        key = secretBox().decrypt(u.totp_secret_enc, `totp:${u.id}`);
      } catch {
        console.error(`[auth] No se pudo descifrar el secreto 2FA del usuario ${u.id} (¿cambió PORTAL_SECRET_KEY?).`);
        return { ok: false };
      }
      const minStep = u.totp_last_step == null ? null : Number(u.totp_last_step);
      const step = verifyTotp(key, c, { minStep });
      if (step === null) return { ok: false };
      const r = await db.query('UPDATE users SET totp_last_step = $2 WHERE id = $1 AND (totp_last_step IS NULL OR totp_last_step < $2)', [u.id, step]);
      return { ok: r.rowCount === 1, method: 'totp' };
    }
    const n = normRecovery(c);
    if (!isRecoveryShape(n)) return { ok: false };
    const r = await db.query('UPDATE recovery_codes SET used_at = now() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL RETURNING id', [u.id, rcHash(u.id, n)]);
    if (r.rowCount !== 1) return { ok: false };
    const left = (await db.query('SELECT count(*)::int AS n FROM recovery_codes WHERE user_id = $1 AND used_at IS NULL', [u.id])).rows[0].n;
    return { ok: true, method: 'recovery', left };
  }

  async function userRow(id) {
    return (await db.query('SELECT * FROM users WHERE id = $1', [id])).rows[0] || null;
  }

  /** Comprueba la contraseña de quien ya tiene sesión (2FA, cambio de contraseña) contando los fallos para el bloqueo. */
  async function checkOwnPassword(request, reply, u, password, message = 'La contraseña no es correcta.') {
    if (typeof password !== 'string' || !password || password.length > 1024) throw httpError(400, 'Escribe tu contraseña.');
    const uname = u.username.toLowerCase();
    const ip = clientIp(request);
    const s = await lockedSeconds(uname, ip);
    if (s > 0) tooMany(reply, s);
    const ok = await withSlot(reply, () => bcrypt.compare(password, u.password_hash));
    if (!ok) {
      await recordFailure(uname, ip, request, u.id);
      throw httpError(400, message);
    }
  }

  const publicPaths = new Set(['/api/auth/login', '/api/auth/login/2fa']);

  function registerAuth(app) {
    app.decorateRequest('user', null);
    app.decorateRequest('session', null);
    // Sesión + CSRF (Origin y Sec-Fetch-Site) para todo /api. La ruta se decide por lo que resolvió el enrutador (que
    // decodifica `%61pi` → `api`) y por la ruta decodificada, no por el texto crudo de la URL.
    app.addHook('onRequest', async (request, reply) => {
      if (!isApiRequest(request)) return;
      reply.header('cache-control', 'no-store');
      if (!WRITE_SAFE.has(request.method) && (!originAllowed(request, allowedOrigins) || !fetchSiteAllowed(request, allowedOrigins))) {
        throw httpError(403, 'Origen no permitido.');
      }
      const row = await sessionFromRequest(request);
      const route = request.routeOptions?.url;
      if (!row) {
        if (!(route && publicPaths.has(route))) throw httpError(401, SESSION_REQUIRED);
        return;
      }
      request.user = { id: row.id, username: row.username, display_name: row.display_name, role: row.role };
      const flags = await flagsFor(row);
      request.session = {
        id: Number(row.session_id),
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        expiresAt: new Date(Math.min(new Date(row.expires_at).getTime(), new Date(row.last_seen_at).getTime() + idleMs)),
        flags,
      };
      // Sesión restringida: solo /api/auth/* hasta cambiar la contraseña o activar la verificación en dos pasos.
      const p = route || requestPath(request.url) || '';
      if ((flags.mustChangePassword || flags.mustEnrollTwoFactor) && !p.startsWith('/api/auth/')) {
        const code = flags.mustChangePassword ? 'PASSWORD_CHANGE_REQUIRED' : '2FA_ENROLL_REQUIRED';
        throw httpError(
          403,
          flags.mustChangePassword
            ? 'Debes cambiar tu contraseña antes de continuar.'
            : 'Debes activar la verificación en dos pasos antes de continuar.',
          { code }
        );
      }
    });

    const small = { bodyLimit: 16 * 1024 };

    /** Crea la sesión (rotando la que trajera el navegador), reinicia los fallos y audita. */
    async function finishLogin(request, reply, u, detail = {}) {
      const uname = u.username.toLowerCase();
      const ip = clientIp(request);
      const prev = tokenOf(request);
      const s = await tx(async (c) => {
        if (prev) await c.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(prev)]);
        return createSession(c, u.id, request);
      });
      setCookie(request, reply, s.token);
      await resetFailures(uname, ip);
      await audit(u.id, 'auth.login', u.username, { ...who(request), session: Number(s.id), ...detail });
      return { user: await publicUser(u) };
    }

    app.post('/api/auth/login', small, async (request, reply) => {
      const { username, password } = request.body || {};
      if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password || username.length > 100 || password.length > 1024) {
        throw httpError(400, 'Escribe usuario y contraseña.');
      }
      cleanup().catch(() => {});
      const name = username.trim();
      const uname = name.toLowerCase();
      const ip = clientIp(request);
      const locked = await lockedSeconds(uname, ip);
      if (locked > 0) tooMany(reply, locked);
      const u = (await db.query('SELECT * FROM users WHERE username = $1', [name])).rows[0];
      // Siempre una comparación bcrypt completa (también si el usuario no existe o está inactivo): mismo tiempo.
      const ok = await withSlot(reply, async () => bcrypt.compare(password, u ? u.password_hash : await getDummyHash()));
      if (!u || !ok || !u.active) {
        await recordFailure(uname, ip, request, u?.id ?? null);
        const reason = !u ? 'unknown_user' : !u.active ? 'inactive' : 'bad_password';
        await audit(u?.id ?? null, 'auth.login_failed', clip(name, 100), { reason, ...who(request) });
        throw httpError(401, GENERIC_FAIL);
      }
      // La contraseña (en claro solo aquí) ya no cumple la política: cambio obligatorio.
      if (!u.must_change_password && passwordProblems(password, u.username).length) {
        await db.query('UPDATE users SET must_change_password = true WHERE id = $1', [u.id]);
        u.must_change_password = true;
      }
      // Hash antiguo con menos coste: se rehace con el actual (transparente; el hash anterior se sustituye).
      try {
        if (bcrypt.getRounds(u.password_hash) < BCRYPT_COST) {
          await db.query('UPDATE users SET password_hash = $2 WHERE id = $1 AND password_hash = $3', [u.id, await hashPassword(password), u.password_hash]);
        }
      } catch {}
      if (u.totp_enabled) {
        const challenge = crypto.randomBytes(32).toString('base64url');
        await db.query(
          `INSERT INTO login_challenges (token_hash, user_id, ip, user_agent, expires_at)
           VALUES ($1,$2,$3,$4, now() + make_interval(mins => $5))`,
          [sha256(challenge), u.id, ip, clip(request.headers['user-agent'] || '', 300), CHALLENGE_MIN]
        );
        await audit(u.id, 'auth.2fa_challenge', u.username, who(request));
        return { twoFactorRequired: true, challenge };
      }
      return finishLogin(request, reply, u, { method: 'password' });
    });

    app.post('/api/auth/login/2fa', small, async (request, reply) => {
      const { challenge, code } = request.body || {};
      if (typeof challenge !== 'string' || typeof code !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || !code.trim() || code.length > 40) {
        throw httpError(400, 'Escribe el código de verificación.');
      }
      const ch = (
        await db.query(
          `SELECT c.id AS challenge_id, c.attempts, u.* FROM login_challenges c JOIN users u ON u.id = c.user_id
            WHERE c.token_hash = $1 AND c.used_at IS NULL AND c.expires_at > now()`,
          [sha256(challenge)]
        )
      ).rows[0];
      if (!ch || !ch.active || !ch.totp_enabled) throw httpError(401, 'La verificación caducó o no es válida. Vuelve a iniciar sesión.');
      const uname = ch.username.toLowerCase();
      const ip = clientIp(request);
      const locked = await lockedSeconds(uname, ip);
      if (locked > 0) tooMany(reply, locked);
      const v = await verifySecondFactor(ch, code);
      if (!v.ok) {
        await db.query(
          `UPDATE login_challenges SET attempts = attempts + 1, used_at = CASE WHEN attempts + 1 >= $2 THEN now() ELSE used_at END WHERE id = $1`,
          [ch.challenge_id, CHALLENGE_MAX_ATTEMPTS]
        );
        await recordFailure(uname, ip, request, ch.id);
        await audit(ch.id, 'auth.2fa_failed', ch.username, who(request));
        throw httpError(401, 'Código incorrecto.');
      }
      const used = await db.query('UPDATE login_challenges SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id', [ch.challenge_id]);
      if (!used.rowCount) throw httpError(401, 'La verificación caducó o no es válida. Vuelve a iniciar sesión.');
      if (v.method === 'recovery') await audit(ch.id, 'auth.2fa_recovery_used', ch.username, { left: v.left, ...who(request) });
      return finishLogin(request, reply, ch, { method: v.method === 'recovery' ? '2fa_recovery' : '2fa' });
    });

    app.post('/api/auth/logout', async (request, reply) => {
      const token = tokenOf(request);
      if (token) await db.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
      clearCookie(request, reply);
      await audit(request.user?.id, 'auth.logout', request.user?.username, who(request));
      return { ok: true };
    });

    app.get('/api/auth/me', async (request) => {
      const u = await userRow(request.user.id);
      const last = await db.query(
        `SELECT created_at, detail->>'ip' AS ip FROM audit_log
          WHERE user_id = $1 AND action = 'auth.login' AND created_at < $2 ORDER BY id DESC LIMIT 1`,
        [request.user.id, request.session.createdAt]
      );
      const s = request.session;
      return {
        user: await publicUser(u),
        session: { id: s.id, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt },
        lastLogin: last.rows[0] ? { at: last.rows[0].created_at, ip: last.rows[0].ip ?? null } : null,
      };
    });

    // ── Sesiones propias ──
    app.get('/api/auth/sessions', async (request) => {
      const r = await db.query(
        `SELECT id, created_at, last_seen_at, ip, user_agent FROM sessions
          WHERE user_id = $1 AND expires_at > now() AND last_seen_at > now() - make_interval(secs => $2) ORDER BY last_seen_at DESC`,
        [request.user.id, idleMs / 1000]
      );
      return {
        items: r.rows.map((x) => ({
          id: Number(x.id),
          current: Number(x.id) === request.session.id,
          createdAt: x.created_at,
          lastSeenAt: x.last_seen_at,
          ip: x.ip,
          userAgent: x.user_agent,
        })),
      };
    });

    app.delete('/api/auth/sessions/:id', async (request, reply) => {
      const id = parseId(request.params.id);
      const r = await db.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id', [id, request.user.id]);
      if (!r.rowCount) throw httpError(404, 'Sesión no encontrada.');
      if (id === request.session.id) clearCookie(request, reply);
      await audit(request.user.id, 'session.revoke', request.user.username, { session: id, current: id === request.session.id, ...who(request) });
      return { ok: true };
    });

    app.post('/api/auth/sessions/revoke-others', async (request) => {
      const r = await db.query('DELETE FROM sessions WHERE user_id = $1 AND id <> $2', [request.user.id, request.session.id]);
      await audit(request.user.id, 'session.revoke', request.user.username, { others: r.rowCount, ...who(request) });
      return { revoked: r.rowCount };
    });

    // ── Contraseña ──
    app.put('/api/auth/password', small, async (request, reply) => {
      const { current, new: next } = request.body || {};
      if (typeof current !== 'string' || typeof next !== 'string') throw httpError(400, 'Faltan datos.');
      const u = await userRow(request.user.id);
      await checkOwnPassword(request, reply, u, current, 'La contraseña actual no es correcta.');
      const problems = passwordProblems(next, u.username);
      if (next === current) problems.push('La contraseña nueva debe ser distinta de la actual.');
      if (problems.length) throw httpError(400, `La contraseña nueva no cumple la política: ${problems[0]}`, { problems, policy: POLICY_SUMMARY });
      const hash = await hashPassword(next);
      await tx(async (c) => {
        await c.query('UPDATE users SET password_hash = $1, must_change_password = false, password_changed_at = now() WHERE id = $2', [hash, u.id]);
        await c.query('DELETE FROM sessions WHERE user_id = $1 AND id <> $2', [u.id, request.session.id]);
      });
      await resetFailures(u.username.toLowerCase(), clientIp(request));
      await audit(u.id, 'auth.password', u.username, who(request));
      return { ok: true };
    });

    // ── Verificación en dos pasos ──
    app.post('/api/auth/2fa/setup', small, async (request, reply) => {
      const u = await userRow(request.user.id);
      if (u.totp_enabled) throw httpError(409, 'La verificación en dos pasos ya está activada. Desactívala antes para configurarla de nuevo.');
      await checkOwnPassword(request, reply, u, request.body?.password);
      const secret = newTotpSecret();
      const b32 = base32Encode(secret);
      await db.query('UPDATE users SET totp_pending_enc = $2, totp_pending_at = now() WHERE id = $1', [u.id, secretBox().encrypt(secret, `totp-pending:${u.id}`)]);
      await audit(u.id, 'auth.2fa_setup', u.username, who(request));
      return { secret: b32, otpauthUrl: otpauthUrl({ secret: b32, account: u.username }) };
    });

    app.post('/api/auth/2fa/enable', small, async (request, reply) => {
      const code = request.body?.code;
      if (typeof code !== 'string' || !/^\d{6}$/.test(code.replace(/\s/g, ''))) throw httpError(400, 'Escribe el código de 6 dígitos de tu aplicación.');
      const u = await userRow(request.user.id);
      if (u.totp_enabled) throw httpError(409, 'La verificación en dos pasos ya está activada.');
      if (!u.totp_pending_enc || !u.totp_pending_at || Date.now() - new Date(u.totp_pending_at).getTime() > PENDING_2FA_MIN * 60_000) {
        throw httpError(400, 'La configuración caducó. Vuelve a empezar la activación.');
      }
      const uname = u.username.toLowerCase();
      const ip = clientIp(request);
      const locked = await lockedSeconds(uname, ip);
      if (locked > 0) tooMany(reply, locked);
      let secret;
      try {
        secret = secretBox().decrypt(u.totp_pending_enc, `totp-pending:${u.id}`);
      } catch {
        throw httpError(400, 'La configuración no es válida. Vuelve a empezar la activación.');
      }
      const step = verifyTotp(secret, code);
      if (step === null) {
        await recordFailure(uname, ip, request, u.id);
        throw httpError(400, 'El código no es correcto. Revisa la hora del teléfono y vuelve a intentarlo.');
      }
      const codes = newRecoveryCodes();
      await tx(async (c) => {
        await c.query(
          `UPDATE users SET totp_enabled = true, totp_secret_enc = $2, totp_last_step = $3, totp_enabled_at = now(),
             totp_pending_enc = NULL, totp_pending_at = NULL WHERE id = $1`,
          [u.id, secretBox().encrypt(secret, `totp:${u.id}`), step]
        );
        await c.query('DELETE FROM recovery_codes WHERE user_id = $1', [u.id]);
        for (const rc of codes) await c.query('INSERT INTO recovery_codes (user_id, code_hash) VALUES ($1,$2)', [u.id, rcHash(u.id, normRecovery(rc))]);
      });
      await audit(u.id, 'auth.2fa_enable', u.username, who(request));
      return { recoveryCodes: codes };
    });

    app.post('/api/auth/2fa/disable', small, async (request, reply) => {
      const u = await userRow(request.user.id);
      if (!u.totp_enabled) throw httpError(409, 'La verificación en dos pasos no está activada.');
      await checkOwnPassword(request, reply, u, request.body?.password);
      const code = request.body?.code;
      if (typeof code !== 'string' || !code.trim() || code.length > 40) throw httpError(400, 'Escribe un código de tu aplicación o un código de recuperación.');
      const v = await verifySecondFactor(u, code);
      if (!v.ok) {
        await recordFailure(u.username.toLowerCase(), clientIp(request), request, u.id);
        throw httpError(400, 'Código incorrecto.');
      }
      await disable2fa(db, u.id);
      await audit(u.id, 'auth.2fa_disable', u.username, who(request));
      return { ok: true };
    });

    // Admin: restablecer la verificación en dos pasos de otra persona (perdió el teléfono y los códigos).
    app.post('/api/users/:id/2fa/reset', { preHandler: requireRole('admin') }, async (request) => {
      const id = parseId(request.params.id);
      const u = await userRow(id);
      if (!u) throw httpError(404, 'Usuario no encontrado.');
      await disable2fa(db, id);
      await audit(request.user.id, 'auth.2fa_reset', u.username, { userId: id, ...who(request) });
      return { ok: true };
    });
  }

  async function disable2fa(c, id) {
    await c.query(
      `UPDATE users SET totp_enabled = false, totp_secret_enc = NULL, totp_pending_enc = NULL, totp_pending_at = NULL,
         totp_last_step = NULL, totp_enabled_at = NULL WHERE id = $1`,
      [id]
    );
    await c.query('DELETE FROM recovery_codes WHERE user_id = $1', [id]);
  }

  return { audit, getSetting, requireRole, registerAuth, ensureAdmin, hashPassword, invalidateSettings, who };
}
