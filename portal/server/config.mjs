// Configuración de despliegue leída de variables de entorno (proxy inverso, panel, IPs, cookies).
// Funciones puras: reciben `env` (por defecto process.env) para poder probarlas sin tocar el proceso.
import net from 'node:net';
import path from 'node:path';
import { PORTAL_ROOT } from './env.mjs';
import { parseAdminPath, DEFAULT_ADMIN_PATH } from './http/adminPath.mjs';

const TRUE_RE = /^(1|true|yes|si|sí|on)$/i;
const FALSE_RE = /^(0|false|no|off)$/i;

/** Booleano de entorno con valor por defecto cuando no está definida o está vacía. */
export function envBool(v, def) {
  const s = String(v ?? '').trim();
  if (!s) return def;
  if (TRUE_RE.test(s)) return true;
  if (FALSE_RE.test(s)) return false;
  return def;
}

const splitList = v =>
  String(v ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/**
 * PORTAL_TRUST_PROXY → opción `trustProxy` de Fastify: `true|false`, un número de saltos o una lista de IP/CIDR
 * separada por comas (solo se confía en X-Forwarded-* si la conexión llega desde esas direcciones).
 */
export function parseTrustProxy(v) {
  const s = String(v ?? '').trim();
  if (!s || FALSE_RE.test(s)) return false;
  // `true` = UN proxy delante (se confía solo en quien conecta y se toma la última IP de X-Forwarded-For). Con la
  // confianza total de Fastify (`trustProxy: true`) la IP sería la PRIMERA de X-Forwarded-For, que el cliente puede
  // escribir aunque haya un proxy que añade la suya ($proxy_add_x_forwarded_for): saltaría la lista de IPs del panel
  // y el bloqueo por IP. Con varios proxys encadenados, use el número de saltos (2…) o sus IP/CIDR.
  if (TRUE_RE.test(s)) return 1;
  if (/^\d+$/.test(s)) return Number(s);
  const list = splitList(s);
  for (const item of list) {
    if (!parseCidr(item)) throw new Error(`PORTAL_TRUST_PROXY: "${item}" no es una IP ni un rango CIDR válido.`);
  }
  return list;
}

/** `::ffff:1.2.3.4` → `1.2.3.4`; quita corchetes y zona IPv6. Devuelve null si no es una IP. */
export function normalizeIp(ip) {
  let s = String(ip ?? '').trim().replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const m = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (m) s = m[1];
  return net.isIP(s) ? s : null;
}

/** "10.0.0.0/8", "192.0.2.7", "2001:db8::/32" → { address, prefix, family } o null. */
export function parseCidr(item) {
  const [addr, bits, extra] = String(item).trim().split('/');
  if (extra !== undefined) return null;
  const a = normalizeIp(addr);
  if (!a) return null;
  const family = net.isIP(a) === 6 ? 'ipv6' : 'ipv4';
  const max = family === 'ipv6' ? 128 : 32;
  if (bits === undefined || bits === '') return { address: a, prefix: max, family };
  if (!/^\d+$/.test(bits) || Number(bits) > max) return null;
  return { address: a, prefix: Number(bits), family };
}

/**
 * PORTAL_ADMIN_ALLOWED_IPS → función `allowed(ip)`. Vacío = todas las IP. Lanza un error claro si una entrada
 * no es válida (mejor no arrancar que abrir el panel por un error de escritura).
 */
export function parseIpAllowList(v) {
  const list = splitList(v);
  if (!list.length) return { any: true, entries: [], allowed: () => true };
  const bl = new net.BlockList();
  for (const item of list) {
    const c = parseCidr(item);
    if (!c) throw new Error(`PORTAL_ADMIN_ALLOWED_IPS: "${item}" no es una IP ni un rango CIDR válido.`);
    if (c.prefix === (c.family === 'ipv6' ? 128 : 32)) bl.addAddress(c.address, c.family);
    else bl.addSubnet(c.address, c.prefix, c.family);
  }
  return {
    any: false,
    entries: list,
    allowed(ip) {
      const a = normalizeIp(ip);
      if (!a) return false;
      return bl.check(a, net.isIP(a) === 6 ? 'ipv6' : 'ipv4');
    },
  };
}

/**
 * PORTAL_PUBLIC_URL → URL pública del manual ("https://doc.ispmax.ec"): vacía = no definida (''). Debe ser http(s),
 * sin barra final, sin consulta ni fragmento; se admite una ruta ("https://x.ec/manual"). Lanza un error claro si no.
 */
export function parsePublicUrl(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  let u;
  try {
    u = new URL(s);
  } catch {
    throw new Error(`PORTAL_PUBLIC_URL: "${s}" no es una URL válida (ejemplo: https://doc.ispmax.ec).`);
  }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('PORTAL_PUBLIC_URL debe empezar por http:// o https://.');
  if (u.username || u.password || u.search || u.hash) throw new Error('PORTAL_PUBLIC_URL no admite usuario, consulta ni fragmento.');
  if (s.endsWith('/')) throw new Error('PORTAL_PUBLIC_URL no debe terminar en "/" (ejemplo: https://doc.ispmax.ec).');
  return s;
}

export const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

/** Número de entorno con valor por defecto y rango; fuera de rango o no numérico → error claro. */
export function envNumber(name, v, def, min, max) {
  const s = String(v ?? '').trim();
  if (!s) return def;
  const n = Number(s);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} debe ser un número entre ${min} y ${max}.`);
  return n;
}

/**
 * Valor de `trustProxy` para Fastify. `true` (confianza total: IP = la PRIMERA de X-Forwarded-For, falsificable) se
 * trata como 1 salto. Los saltos se pasan como función `(dirección, salto) => salto < n`: la versión instalada de
 * Fastify trata un número como «no confiar en nada» (X-Forwarded-* ignoradas por completo).
 */
export function normalizeTrustProxy(t) {
  const hops = t === true ? 1 : typeof t === 'number' ? t : null;
  if (hops === null) return t;
  if (hops <= 0) return false;
  const fn = (_addr, i) => i < hops;
  fn.hops = hops;
  return fn;
}

/** Todo lo que el servidor HTTP necesita del entorno, validado. */
export function readServerConfig(env = process.env) {
  const restart = String(env.PORTAL_RESTART_MODE || '').trim();
  if (restart && !['exit', 'respawn'].includes(restart)) throw new Error('PORTAL_RESTART_MODE debe ser "exit" o "respawn".');
  const update = String(env.PORTAL_UPDATE_MODE || '').trim();
  if (update && !['inline', 'entrypoint'].includes(update)) throw new Error('PORTAL_UPDATE_MODE debe ser "inline" o "entrypoint".');
  const adminPath = parseAdminPath(env.PORTAL_ADMIN_PATH);
  return {
    port: Number(env.PORTAL_PORT) || 4380,
    host: env.PORTAL_HOST || '127.0.0.1',
    trustProxy: parseTrustProxy(env.PORTAL_TRUST_PROXY),
    allowedOrigins: new Set(splitList(env.PORTAL_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS)),
    adminIps: parseIpAllowList(env.PORTAL_ADMIN_ALLOWED_IPS),
    adminEnabled: envBool(env.PORTAL_ADMIN_ENABLED, true),
    cookieSecure: envBool(env.PORTAL_COOKIE_SECURE, false),
    // Ruta del panel (oculta si no es /admin o con PORTAL_HIDE_ADMIN=true) y umbral de sondeos por IP (5 min).
    adminPath,
    hideAdmin: adminPath !== DEFAULT_ADMIN_PATH || envBool(env.PORTAL_HIDE_ADMIN, false),
    probeThreshold: envNumber('PORTAL_PROBE_THRESHOLD', env.PORTAL_PROBE_THRESHOLD, 20, 3, 10000),
    // Sesiones: caducidad por inactividad (horas) y absoluta (días).
    sessionIdleHours: envNumber('PORTAL_SESSION_IDLE_H', env.PORTAL_SESSION_IDLE_H, 12, 0.05, 720),
    sessionMaxDays: envNumber('PORTAL_SESSION_MAX_DAYS', env.PORTAL_SESSION_MAX_DAYS, 7, 0.01, 90),
    publicUrl: parsePublicUrl(env.PORTAL_PUBLIC_URL),
    restartMode: restart || 'exit',
    updateMode: update || 'inline',
    webDist: path.resolve(env.PORTAL_WEB_DIST || path.join(PORTAL_ROOT, 'web', 'dist')),
  };
}
