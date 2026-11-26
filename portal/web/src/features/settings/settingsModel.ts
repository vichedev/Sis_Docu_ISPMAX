/*
 * Lógica pura de Ajustes (sin imports; probada con `node --test test/settings.test.mjs`).
 * El servidor devuelve solo los ajustes editables con su `section`; si es una versión anterior, se reparten con
 * FALLBACK_SECTION y los ajustes internos (rutas, Git, comandos, carpetas) no se muestran nunca.
 */

export type EditableSection = 'general' | 'manual' | 'respaldos';
export interface SettingDefLike { key: string; label: string; help?: string; type: string; min?: number; max?: number; options?: string[]; section?: string }

/** Orden y sección de los ajustes que el panel sabe mostrar. */
export const FALLBACK_SECTION: Record<string, EditableSection> = {
  site_title: 'general', contact_whatsapp: 'general',
  auto_publish: 'manual', auto_publish_delay: 'manual',
  backup_keep: 'respaldos',
};
const KEY_ORDER = Object.keys(FALLBACK_SECTION);

/** Ajustes internos que el panel no muestra aunque un servidor antiguo los devuelva (los gestiona el sistema). */
export const HIDDEN_KEYS = ['site_url', 'site_base', 'repo_path', 'git_remote', 'git_branch', 'build_command', 'restart_mode', 'backup_dir'];

const EDITABLE: EditableSection[] = ['general', 'manual', 'respaldos'];

/** Reparte las definiciones por sección, en un orden estable, sin los ajustes internos. */
export function groupSettings<D extends SettingDefLike>(defs: D[] | null | undefined): Record<EditableSection, D[]> {
  const out: Record<EditableSection, D[]> = { general: [], manual: [], respaldos: [] };
  for (const d of defs ?? []) {
    if (!d || HIDDEN_KEYS.includes(d.key)) continue;
    const s = (EDITABLE as string[]).includes(d.section ?? '') ? (d.section as EditableSection) : FALLBACK_SECTION[d.key];
    if (s) out[s].push(d);
  }
  const rank = (k: string) => { const i = KEY_ORDER.indexOf(k); return i < 0 ? 99 : i; };
  for (const s of EDITABLE) out[s].sort((a, b) => rank(a.key) - rank(b.key));
  return out;
}

/** Claves cuyo valor difiere del guardado. */
export const dirtyKeys = (keys: string[], vals: Record<string, unknown>, base: Record<string, unknown>) =>
  keys.filter((k) => !same(vals[k], base[k]));
const same = (a: unknown, b: unknown) => a === b || (a == null && b === '') || (a === '' && b == null);

/** «+593 95 996 7843» → «593959967843». null si no es válido; '' si está vacío (mismo criterio que el servidor). */
export function whatsappDigits(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (!/^[\d\s+().-]+$/.test(s)) return null;
  const d = s.replace(/\D/g, '');
  return d.length >= 8 && d.length <= 15 ? d : null;
}

/** Mensaje de error del WhatsApp de contacto, o null si vale. */
export function whatsappProblem(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (!/^[\d\s+().-]+$/.test(s)) return 'Escriba solo el número: dígitos, espacios, «+», guiones o paréntesis.';
  const n = s.replace(/\D/g, '').length;
  if (n < 8) return 'El número es demasiado corto: incluya el código del país (p. ej. 593 para Ecuador).';
  if (n > 15) return 'El número es demasiado largo: como máximo 15 dígitos con el código del país.';
  return null;
}

/** Error de un número con mínimo y máximo, o null. */
export function numberProblem(v: unknown, min = 1, max = 1000): string | null {
  if (v === '' || v == null) return 'Escriba un número.';
  const n = Number(v);
  if (!Number.isInteger(n)) return 'Escriba un número entero.';
  if (n < min || n > max) return `Debe estar entre ${min} y ${max}.`;
  return null;
}

/** Texto del título que verá el lector: vacío = el nombre original del manual. */
export const DEFAULT_SITE_TITLE = 'Manual ISPMAX';
export const shownTitle = (v: unknown) => String(v ?? '').trim() || DEFAULT_SITE_TITLE;
