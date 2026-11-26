/*
 * Lógica pura de las rutas (sin imports; probada con `node --test test/settings.test.mjs`):
 * secciones de Ajustes y redirecciones de las direcciones antiguas.
 */

export type SettingsSection = 'general' | 'manual' | 'seguridad' | 'sistema' | 'respaldos' | 'info';
export const SETTINGS_SECTIONS: SettingsSection[] = ['general', 'manual', 'seguridad', 'sistema', 'respaldos', 'info'];
export const DEFAULT_SETTINGS_SECTION: SettingsSection = 'general';

/** Segmento de `#/ajustes/:seccion` → sección válida (lo desconocido cae en «general»). */
export function settingsSection(seg?: string | null): SettingsSection {
  return (SETTINGS_SECTIONS as string[]).includes(seg ?? '') ? (seg as SettingsSection) : DEFAULT_SETTINGS_SECTION;
}
export const settingsPath = (s: SettingsSection) => `/ajustes/${s}`;

/** Ruta del manual publicado (estado del sitio generado). */
export const SITE_PATH = '/manual';

/**
 * Direcciones antiguas → nueva dirección (o null si no hay que redirigir).
 * `#/sistema` y `#/publicar` (la antigua pantalla «Sistema») llevan a Ajustes › Actualización del sistema;
 * quien no administra no puede entrar en Ajustes, así que va al Manual publicado, que es lo que sí podía ver allí.
 * `#/ajustes` sin sección y `#/ajustes/<desconocida>` llevan a la sección General.
 */
export function legacyRedirect(path: string, isAdmin = true): string | null {
  const seg = path.split('?')[0]!.split('/').filter(Boolean);
  if (seg[0] === 'sistema' || seg[0] === 'publicar') return isAdmin ? settingsPath('sistema') : SITE_PATH;
  if (seg[0] === 'ajustes' && (seg.length === 1 || !(SETTINGS_SECTIONS as string[]).includes(seg[1]!))) return settingsPath(DEFAULT_SETTINGS_SECTION);
  return null;
}
