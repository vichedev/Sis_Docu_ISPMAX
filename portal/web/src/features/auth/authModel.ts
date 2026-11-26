/*
 * Lógica pura de autenticación (sin imports; probada con `node --test test/auth.test.mjs`):
 * temporizador de bloqueo, política de contraseñas (espejo de la del servidor, que es quien decide),
 * códigos de un solo uso y de recuperación, y texto legible del navegador/dispositivo.
 */

/* ---------- Bloqueo por intentos ---------- */

/** 125 → «02:05». Nunca negativo. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Texto para lectores de pantalla: «unos 14 minutos», «menos de un minuto». */
export function spokenWait(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  if (s < 60) return 'menos de un minuto';
  const m = Math.ceil(s / 60);
  return m === 1 ? 'un minuto' : `unos ${m} minutos`;
}

/** Segundos de espera que indica el servidor (`retryAfter`); sin dato válido, 60 s. */
export function retryAfterSeconds(data: unknown, fallback = 60): number {
  const v = data && typeof data === 'object' ? (data as { retryAfter?: unknown }).retryAfter : undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.min(Math.ceil(n), 24 * 3600) : fallback;
}

/** Segundos que faltan hasta `until` (ms desde la época); 0 si ya pasó. */
export const lockRemaining = (until: number, now: number) => Math.max(0, Math.ceil((until - now) / 1000));

/* ---------- Códigos ---------- */

/** Deja solo los dígitos (pegado con espacios o guiones: «123 456», «123-456») y recorta a `max`. */
export function digitsOnly(raw: string, max = 6): string {
  return String(raw ?? '').replace(/\D/g, '').slice(0, max);
}

/** Reparte un texto pegado en `n` casillas; las que faltan quedan vacías. */
export function splitDigits(raw: string, n = 6): string[] {
  const d = digitsOnly(raw, n);
  return Array.from({ length: n }, (_, i) => d[i] ?? '');
}

/** Código de recuperación tal como se escribe: sin espacios y en minúsculas. */
export const normalizeRecovery = (raw: string) => String(raw ?? '').trim().replace(/\s+/g, '').toLowerCase();

/** ¿Parece un código de recuperación (no solo 6 dígitos) con la longitud mínima razonable? */
export const looksLikeRecovery = (raw: string) => normalizeRecovery(raw).length >= 8;

/** Secreto de 2FA en grupos de 4 para teclearlo a mano: «JBSW Y3DP EHPK 3PXP». */
export const groupSecret = (secret: string) => String(secret ?? '').replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();

/** Contenido del archivo `.txt` con los códigos de recuperación. */
export function recoveryCodesText(codes: string[], username: string, when: Date = new Date()): string {
  return [
    'ISPMAX · Portal del manual',
    `Códigos de recuperación de ${username}`,
    `Generados el ${when.toISOString().slice(0, 10)}`,
    '',
    'Cada código sirve una sola vez, en lugar del código de la aplicación.',
    'Guárdelos en un lugar seguro y no los comparta.',
    '',
    ...codes.map((c, i) => `${String(i + 1).padStart(2, '0')}. ${c}`),
    '',
  ].join('\n');
}

/* ---------- Política de contraseñas ---------- */

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
// Lista corta de referencia; el servidor aplica la lista completa y su veredicto manda.
const COMMON = ['password', 'contrasena', 'admin', 'admin1234', 'administrador', 'qwerty', 'letmein', 'welcome', 'changeme', 'cambiame', 'ispmax', 'ispmax123', 'portal', 'agenteprueba', 'iloveyou', 'abc123', 'monkey', 'dragon', 'login'];

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lettersDigits = (s: string) => fold(s).replace(/[^a-z0-9]/g, '');

export interface PasswordCheck { id: 'length' | 'user' | 'common' | 'repeat'; label: string; ok: boolean }

/** Reglas de la política, evaluadas en vivo. Con la contraseña vacía todas quedan sin cumplir. */
export function passwordChecks(pw: string, username = ''): PasswordCheck[] {
  const p = pw ?? '';
  const f = lettersDigits(p);
  const u = lettersDigits(username);
  const empty = p.length === 0;
  const hasUser = u.length >= 3 && f.includes(u);
  const common = COMMON.some((c) => f === c || (c.length >= 6 && f.length <= c.length + 3 && f.includes(c)))
    || /^(?:0123456789|1234567890|abcdefghij|qwertyuiop)/.test(f);
  const repeat = p.length > 0 && (new Set(p).size <= 2 || /^(.{1,3})\1+$/.test(p));
  return [
    { id: 'length', label: `Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`, ok: p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
    { id: 'user', label: 'No contiene su nombre de usuario', ok: !empty && !hasUser },
    { id: 'common', label: 'No es una contraseña común', ok: !empty && !common },
    { id: 'repeat', label: 'No son solo caracteres repetidos', ok: !empty && !repeat },
  ];
}

export const passwordOk = (pw: string, username = '') => passwordChecks(pw, username).every((c) => c.ok);

export interface Strength { score: 0 | 1 | 2 | 3 | 4; label: string }
/** Medidor orientativo (0 vacía · 1 inválida · 2 aceptable · 3 buena · 4 muy fuerte). No sustituye a la política. */
export function passwordStrength(pw: string, username = ''): Strength {
  const labels = ['', 'Débil', 'Aceptable', 'Buena', 'Muy fuerte'] as const;
  if (!pw) return { score: 0, label: '' };
  if (!passwordOk(pw, username)) return { score: 1, label: pw.length < PASSWORD_MIN ? 'Demasiado corta' : 'No cumple la política' };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  const unique = new Set(pw).size;
  let pts = 0;
  if (pw.length >= 14) pts += 1;
  if (pw.length >= 20) pts += 1;
  if (kinds >= 3) pts += 1;
  if (unique >= 8) pts += 1;
  const score = Math.max(2, Math.min(4, 1 + pts)) as 2 | 3 | 4;
  return { score, label: labels[score] };
}

/* ---------- Dispositivo legible ---------- */

/** «Mozilla/5.0 (Windows NT 10.0…) Edg/120.0» → { browser: 'Edge 120', os: 'Windows', device: 'Edge 120 en Windows' } */
export function parseUserAgent(ua: string | null | undefined): { browser: string; os: string; device: string } {
  const s = String(ua ?? '');
  if (!s.trim()) return { browser: 'Navegador desconocido', os: '', device: 'Dispositivo desconocido' };
  const ver = (re: RegExp) => s.match(re)?.[1]?.split('.')[0] ?? '';
  let browser = '';
  const pick = (name: string, re: RegExp) => { const v = ver(re); browser = v ? `${name} ${v}` : name; };
  if (/Edg(e|A|iOS)?\//.test(s)) pick('Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/);
  else if (/OPR\/|Opera/.test(s)) pick('Opera', /(?:OPR|Opera)\/([\d.]+)/);
  else if (/Firefox\/|FxiOS\//.test(s)) pick('Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/);
  else if (/(Chrome|CriOS)\//.test(s)) pick('Chrome', /(?:Chrome|CriOS)\/([\d.]+)/);
  else if (/Safari\//.test(s) && /Version\//.test(s)) pick('Safari', /Version\/([\d.]+)/);
  else if (/curl\//i.test(s)) pick('curl', /curl\/([\d.]+)/i);
  else if (/node|undici|axios|python|java|go-http/i.test(s)) browser = 'Script o herramienta';
  else browser = 'Navegador desconocido';
  let os = '';
  if (/Windows NT/.test(s)) os = 'Windows';
  else if (/Android/.test(s)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(s)) os = 'iOS';
  else if (/Mac OS X|Macintosh/.test(s)) os = 'macOS';
  else if (/CrOS/.test(s)) os = 'ChromeOS';
  else if (/Linux|X11/.test(s)) os = 'Linux';
  const mobile = /Mobi|iPhone|Android.*Mobile/.test(s);
  const device = os ? `${browser} en ${os}${mobile ? ' (móvil)' : ''}` : browser;
  return { browser, os, device };
}
