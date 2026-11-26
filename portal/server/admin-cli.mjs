// Crea o restablece un administrador del portal desde la terminal.
//   npm run admin:create -- --user <nombre> [--name "Nombre visible"] [--force] [--test]
//   npm run admin:reset  -- --user <nombre> [--2fa-off] [--test]   (--2fa-off: quita la verificación en dos pasos)
// La contraseña NUNCA va como argumento: se lee de ISPMAX_ADMIN_PASSWORD, de stdin (si no hay terminal) o se pide oculta.
// Usa DATABASE_URL (portal/.env o PORTAL_ENV_FILE); con --test, TEST_DATABASE_URL. Nunca imprime la contraseña ni el hash.
import readline from 'node:readline';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { passwordError } from './passwordPolicy.mjs';

const COST = 12; // el mismo que server/auth.mjs (BCRYPT_COST)
const USER_RE = /^[a-z0-9._-]{3,32}$/;

const argv = process.argv.slice(2);
const cmd = argv.find((a) => !a.startsWith('--') && ['create', 'reset'].includes(a));
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : undefined;
};
const flag = (name) => argv.includes(`--${name}`);

export function validateUser(u) {
  if (typeof u !== 'string' || !USER_RE.test(u)) return 'El usuario debe tener de 3 a 32 caracteres: minúsculas, números, punto, guion y guion bajo.';
  return null;
}
/** Política única del portal (server/passwordPolicy.mjs). Devuelve el problema (texto) o null. */
export function validatePassword(p, user) {
  return passwordError(p, user);
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(prompt)) process.stderr.write(s); };
    rl.question(prompt, (a) => { rl.close(); process.stderr.write('\n'); resolve(a); });
    rl.on('SIGINT', () => { rl.close(); reject(new Error('Cancelado.')); });
  });
}
async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8').split(/\r?\n/)[0];
}
async function getPassword() {
  if (process.env.ISPMAX_ADMIN_PASSWORD) return process.env.ISPMAX_ADMIN_PASSWORD;
  if (!process.stdin.isTTY) {
    const p = await readStdin();
    if (!p) throw new Error('No hay contraseña: defina ISPMAX_ADMIN_PASSWORD o envíela por stdin.');
    return p;
  }
  const a = await readHidden('Contraseña: ');
  const err = validatePassword(a, opt('user'));
  if (err) throw new Error(err);
  const b = await readHidden('Repita la contraseña: ');
  if (a !== b) throw new Error('Las contraseñas no coinciden.');
  return a;
}

async function main() {
  if (!cmd) {
    console.error('Uso:\n  admin:create -- --user <nombre> [--name "Nombre visible"] [--force] [--test]\n  admin:reset  -- --user <nombre> [--2fa-off] [--test]\n' +
      'La contraseña se toma de ISPMAX_ADMIN_PASSWORD, de stdin o se pide de forma oculta.');
    process.exitCode = 2;
    return;
  }
  const user = opt('user');
  const uerr = validateUser(user);
  if (uerr) throw new Error(uerr);
  const password = await getPassword();
  const perr = validatePassword(password, user);
  if (perr) throw new Error(perr);
  const bcrypt = (await import('bcryptjs')).default;
  const { cliPool } = await import('./sync/common.mjs');
  const { pool, test } = cliPool(argv);
  try {
    // Esquema idempotente (también migra una base antigua: sesiones con token en claro → huella).
    const { applySchema } = await import('./schema.mjs');
    await applySchema(pool);
    const ex = (await pool.query('SELECT id, role FROM users WHERE username = $1', [user])).rows[0];
    const hash = await bcrypt.hash(password, COST);
    const audit = (uid, action, detail) =>
      pool.query('INSERT INTO audit_log (user_id, action, target, detail) VALUES ($1,$2,$3,$4)', [uid, action, user, JSON.stringify(detail)]).catch(() => {});
    if (cmd === 'create') {
      if (ex && ex.role === 'admin' && !flag('force')) {
        console.log(`El administrador "${user}" ya existe: no se cambió nada. Use "npm run admin:reset -- --user ${user}" para cambiar su contraseña (o --force).`);
        return;
      }
      if (ex) {
        await pool.query("UPDATE users SET password_hash=$1, role='admin', active=true, must_change_password=false, password_changed_at=now() WHERE id=$2", [hash, ex.id]);
        await pool.query('DELETE FROM sessions WHERE user_id=$1', [ex.id]);
        await audit(ex.id, 'admin.create', { via: 'cli', forced: true });
        console.log(`Usuario "${user}" actualizado como administrador.`);
      } else {
        const name = opt('name') || 'Administrador';
        const r = await pool.query("INSERT INTO users (username, display_name, password_hash, role, password_changed_at) VALUES ($1,$2,$3,'admin', now()) RETURNING id", [user, name, hash]);
        await audit(r.rows[0].id, 'admin.create', { via: 'cli' });
        console.log(`Administrador "${user}" creado.`);
      }
    } else {
      if (!ex) throw new Error(`El usuario "${user}" no existe. Use admin:create.`);
      await pool.query('UPDATE users SET password_hash=$1, active=true, must_change_password=false, password_changed_at=now() WHERE id=$2', [hash, ex.id]);
      await pool.query('DELETE FROM sessions WHERE user_id=$1', [ex.id]);
      // Persona que perdió el teléfono y los códigos de recuperación: --2fa-off quita su verificación en dos pasos.
      if (flag('2fa-off')) {
        await pool.query('UPDATE users SET totp_enabled=false, totp_secret_enc=NULL, totp_pending_enc=NULL, totp_pending_at=NULL, totp_last_step=NULL, totp_enabled_at=NULL WHERE id=$1', [ex.id]);
        await pool.query('DELETE FROM recovery_codes WHERE user_id=$1', [ex.id]);
      }
      // Desbloqueo: los intentos fallidos de ese usuario dejan de contar.
      await pool.query('DELETE FROM login_attempts WHERE username=$1', [user.toLowerCase()]);
      await pool.query("DELETE FROM login_locks WHERE (scope='user' AND key=$1) OR (scope='user_ip' AND split_part(key, '|', 1) = $1)", [user.toLowerCase()]);
      await audit(ex.id, 'admin.reset', { via: 'cli', twoFactorOff: flag('2fa-off') });
      console.log(`Contraseña de "${user}" restablecida (sesiones cerradas${flag('2fa-off') ? ', verificación en dos pasos desactivada' : ''}).`);
    }
    console.log(`Base: ${test ? 'TEST_DATABASE_URL' : 'DATABASE_URL'}`);
  } finally {
    await pool.end();
  }
}

// Solo se ejecuta como script (install.sh importa este módulo para validar sin dependencias).
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((e) => {
    console.error(`Error: ${e.message}`);
    process.exitCode = 1;
  });
}
