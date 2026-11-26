// Política de contraseñas ÚNICA del portal. La usan: creación de usuarios y restablecimiento por un admin
// (routes/admin.mjs), cambio de contraseña (auth.mjs), el inicio de sesión (marca must_change_password si la contraseña
// guardada ya no cumple), el admin inicial por entorno, admin-cli.mjs e install.sh (importa admin-cli sin dependencias).
// Sin dependencias: solo funciones puras.

export const MIN_LENGTH = 10;
export const MAX_LENGTH = 128;

// Contraseñas comunes o de instalación (comparación exacta, en minúsculas). Incluye las de las pruebas y guías antiguas.
const COMMON = new Set([
  '12345', '123456', '1234567', '12345678', '123456789', '1234567890', '0123456789', '9876543210', '11111111', '00000000',
  'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'contrasena',
  'contraseña', 'contrasena1', 'contrasena123', 'contraseña123', 'clave', 'clave123', 'clave1234', 'clave12345', 'secreto',
  'admin', 'admin123', 'admin1234', 'admin12345', 'admin123456', 'administrador', 'administrator', 'root', 'toor', 'ispmax',
  'ispmax123', 'ispmax1234', 'ispmax2024', 'ispmax2025', 'ispmax2026', 'qwerty', 'qwerty123', 'qwertyuiop', 'asdfghjkl',
  'zxcvbnm', 'abc123', 'abc12345', 'abc1234567', 'abcd1234', 'letmein', 'letmein123', 'welcome', 'welcome1', 'welcome123',
  'bienvenido', 'bienvenido1', 'iloveyou', 'monkey', 'dragon', 'sunshine', 'football', 'changeme', 'cambiame', 'cambia-esto',
  'cambiaesto', 'cambiar', 'agente-prueba', 'agenteprueba', 'clave-de-prueba', 'manual', 'manual123', 'portal', 'portal123',
  'soporte', 'soporte123', 'usuario', 'usuario123', 'test', 'test1234', 'prueba', 'prueba123', 'prueba1234', 'demo', 'demo1234',
  'una-clave-larga-de-10-o-mas-caracteres', 'clave-larga-del-admin',
]);
// Palabras base muy comunes: "Password2026!" o "Admin_12345" siguen siendo débiles (raíz común + números/símbolos).
const COMMON_STEMS = new Set([
  'password', 'passw0rd', 'contrasena', 'contraseña', 'clave', 'secreto', 'secret', 'admin', 'administrador', 'administrator',
  'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'letmein', 'welcome', 'bienvenido', 'iloveyou', 'changeme', 'cambiame',
  'cambiaesto', 'ispmax', 'root', 'usuario', 'prueba', 'test', 'demo', 'abc', 'abcd', 'abcdef', 'manual', 'portal', 'soporte',
]);
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'abcdefghijklmnopqrstuvwxyz'];

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** ¿Todo el texto es una secuencia ascendente/descendente (abcdef…, 987654…) o un trozo de una fila del teclado? */
function isSequence(s) {
  if (s.length < 4) return false;
  let up = true;
  let down = true;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (d !== 1) up = false;
    if (d !== -1) down = false;
  }
  if (up || down) return true;
  return KEYBOARD_ROWS.some((r) => r.includes(s) || [...r].reverse().join('').includes(s));
}

/** ¿Es la repetición de un trozo de 1 a 4 caracteres (aaaaaaaaaa, abcabcabca, 12121212…)? */
function isRepetition(s) {
  for (let n = 1; n <= 4 && n < s.length; n++) {
    const chunk = s.slice(0, n);
    if (chunk.repeat(Math.ceil(s.length / n)).slice(0, s.length) === s) return true;
  }
  return false;
}

/**
 * Comprueba una contraseña. Devuelve la lista de problemas (vacía = cumple), en español y sin repetir la contraseña.
 * `username` (opcional) para rechazar contraseñas iguales o derivadas del usuario.
 */
export function passwordProblems(password, username = '') {
  const problems = [];
  if (typeof password !== 'string' || !password) return ['Escribe una contraseña.'];
  const len = [...password].length;
  if (len < MIN_LENGTH) problems.push(`Debe tener al menos ${MIN_LENGTH} caracteres.`);
  if (len > MAX_LENGTH) problems.push(`Debe tener como máximo ${MAX_LENGTH} caracteres.`);
  const p = fold(password);
  const alnum = p.replace(/[^a-z0-9ñ]/g, '');
  const letters = p.replace(/[^a-zñ]/g, '');
  const rest = p.replace(/[a-zñ]/g, '');
  const u = fold(username || '').trim();
  if (u && u.length >= 3) {
    const ua = u.replace(/[^a-z0-9ñ]/g, '');
    const rev = [...p].reverse().join('');
    // Sin el usuario, ¿queda algo con sustancia? (admin2026!, soporte.soporte, 2026admin… son derivadas)
    const without = ua ? alnum.split(ua).join('') : alnum;
    if (p === u || rev === u || alnum === ua || (ua && alnum.includes(ua) && (without.length < 6 || /^\d*$/.test(without)))) {
      problems.push('No puede ser igual al usuario ni una variación de él.');
    }
  }
  if (COMMON.has(p) || COMMON.has(alnum) || (COMMON_STEMS.has(letters) && rest.length <= 8)) {
    problems.push('Es una contraseña demasiado común o de instalación. Elige otra.');
  }
  if (len >= 1 && (isRepetition(p) || isSequence(p) || isSequence(alnum) || new Set(p).size < 4)) {
    problems.push('No puede ser solo una repetición o una secuencia (aaaa, 1234, qwerty…).');
  }
  return problems;
}

/** Atajo: `null` si cumple; si no, el primer problema (texto). */
export function passwordError(password, username = '') {
  const p = passwordProblems(password, username);
  return p.length ? p[0] : null;
}

/** Texto de ayuda de la política (para mensajes de error y la interfaz). */
export const POLICY_SUMMARY = `Mínimo ${MIN_LENGTH} caracteres (máximo ${MAX_LENGTH}); que no sea el usuario ni una variación, ni una contraseña común, ni una repetición o secuencia.`;
