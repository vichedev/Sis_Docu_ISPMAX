// Cifrado en reposo de secretos (semillas TOTP) con AES-256-GCM. La clave sale de PORTAL_SECRET_KEY (64 caracteres
// hex, base64 de 32 bytes o una frase de 32+ caracteres, que se deriva con SHA-256) o, si falta, del archivo
// <PORTAL_DATA_DIR>/secret.key (permisos 600), que se genera al primer uso. Nunca se registra ni se devuelve la clave.
// Formato guardado: "v1:<iv b64url>:<tag b64url>:<cifrado b64url>". El AAD ata el valor a su uso (p. ej. "totp:<id>"):
// copiar el secreto de un usuario a otro no sirve.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { dataDir } from '../settings.mjs';

const b64u = (b) => Buffer.from(b).toString('base64url');

/** Interpreta PORTAL_SECRET_KEY. Lanza con un mensaje claro (sin el valor) si no sirve. */
export function parseSecretKey(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, 'hex');
  if (/^[A-Za-z0-9+/_-]{43}=?$/.test(s)) {
    const b = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (b.length === 32) return b;
  }
  if (s.length >= 32) return crypto.createHash('sha256').update(s, 'utf8').digest();
  throw new Error('PORTAL_SECRET_KEY es demasiado corta: use 64 caracteres hexadecimales (openssl rand -hex 32).');
}

export function keyFile(env = process.env) {
  return path.join(dataDir(env), 'secret.key');
}

/** Clave del sistema: entorno o archivo (se crea con 0600 si no existe). Devuelve { key, source }. */
export function loadSecretKey(env = process.env) {
  const fromEnv = parseSecretKey(env.PORTAL_SECRET_KEY);
  if (fromEnv) return { key: fromEnv, source: 'env' };
  const f = keyFile(env);
  try {
    const txt = fs.readFileSync(f, 'utf8').trim();
    const k = parseSecretKey(txt);
    if (k) return { key: k, source: 'file' };
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error(`No se pudo leer la clave de cifrado (${path.basename(f)}): ${e.code || 'error'}.`);
  }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const hex = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(f, hex + '\n', { mode: 0o600, flag: 'wx' });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e; // otro proceso la creó a la vez: se usa la suya
    return { key: parseSecretKey(fs.readFileSync(f, 'utf8')), source: 'file' };
  }
  try {
    fs.chmodSync(f, 0o600);
  } catch {}
  return { key: Buffer.from(hex, 'hex'), source: 'file-new' };
}

export function createSecretBox(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('La clave de cifrado debe tener 32 bytes.');
  return {
    encrypt(plain, aad = '') {
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', key, iv);
      c.setAAD(Buffer.from(aad, 'utf8'));
      const ct = Buffer.concat([c.update(Buffer.from(plain)), c.final()]);
      return `v1:${b64u(iv)}:${b64u(c.getAuthTag())}:${b64u(ct)}`;
    },
    /** Devuelve un Buffer o lanza (clave distinta, valor manipulado o AAD distinto). */
    decrypt(stored, aad = '') {
      const m = /^v1:([A-Za-z0-9_-]+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]*)$/.exec(String(stored || ''));
      if (!m) throw new Error('Secreto cifrado con un formato desconocido.');
      const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(m[1], 'base64url'));
      d.setAAD(Buffer.from(aad, 'utf8'));
      d.setAuthTag(Buffer.from(m[2], 'base64url'));
      return Buffer.concat([d.update(Buffer.from(m[3], 'base64url')), d.final()]);
    },
  };
}

/** Huella SHA-256 en hex (tokens de sesión, retos y códigos de recuperación: valores aleatorios de alta entropía). */
export const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
