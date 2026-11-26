// TOTP (RFC 6238) sobre HOTP (RFC 4226) con node:crypto, sin dependencias. Por defecto SHA-1, 6 dígitos y pasos de
// 30 s (lo que esperan Google Authenticator, Aegis, 1Password, Microsoft Authenticator…). Base32 según RFC 4648.
import crypto from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** Base32 → Buffer. Ignora espacios, guiones y relleno `=`; mayúsculas o minúsculas. Lanza si hay caracteres no válidos. */
export function base32Decode(str) {
  const s = String(str).toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of s) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('Secreto base32 no válido.');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** HOTP(K, C) del RFC 4226 (truncado dinámico). `counter` entero ≥ 0 (Number o BigInt). */
export function hotp(key, counter, { digits = 6, algorithm = 'sha1' } = {}) {
  const c = Buffer.alloc(8);
  c.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac(algorithm, key).update(c).digest();
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

/** Paso de tiempo T = floor((t - T0) / X) (RFC 6238 §4.2). */
export const timeStep = (timeSec = Date.now() / 1000, period = 30) => Math.floor(timeSec / period);

export function totp(key, { time = Date.now() / 1000, period = 30, digits = 6, algorithm = 'sha1' } = {}) {
  return hotp(key, timeStep(time, period), { digits, algorithm });
}

/**
 * Verifica un código con ventana ±`window` pasos. Devuelve el paso que coincide (para impedir reutilizarlo) o null.
 * Comparación en tiempo constante. `minStep`: los pasos ≤ minStep se rechazan (ya usados).
 */
export function verifyTotp(key, code, { time = Date.now() / 1000, period = 30, digits = 6, algorithm = 'sha1', window = 1, minStep = null } = {}) {
  const c = String(code ?? '').replace(/\s/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(c)) return null;
  const now = timeStep(time, period);
  let found = null;
  for (let d = -window; d <= window; d++) {
    const step = now + d;
    if (step < 0) continue;
    const exp = Buffer.from(hotp(key, step, { digits, algorithm }));
    const got = Buffer.from(c);
    // Se recorren todos los pasos (sin salir antes) para no filtrar por tiempo cuál coincidió.
    if (crypto.timingSafeEqual(exp, got) && (minStep === null || step > minStep) && found === null) found = step;
  }
  return found;
}

export function newTotpSecret(bytes = 20) {
  return crypto.randomBytes(bytes);
}

/** URI `otpauth://` (formato de Google Authenticator Key Uri) para el código QR. */
export function otpauthUrl({ secret, account, issuer = 'ISPMAX Manual', digits = 6, period = 30 }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const q = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(digits), period: String(period) });
  return `otpauth://totp/${label}?${q.toString()}`;
}
