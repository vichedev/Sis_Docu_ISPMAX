/* Lógica pura del respaldo portátil del contenido (sin imports; probada con test/content-package.test.mjs). */

export type ImportMode = 'replace' | 'merge';
export const CONFIRM_WORD = 'CARGAR';
export const MAX_PACKAGE_BYTES = 300 * 1024 * 1024;
/** Carga por terminal para quien despliega (Docker): copiar el archivo al contenedor y cargarlo. */
export const DOCKER_COPY_COMMAND = 'docker compose cp archivo.ispmax ispmax-manual:/var/lib/ispmax/import/';
export const DOCKER_IMPORT_COMMAND = 'docker compose exec ispmax-manual npm --prefix portal run content:import -- /var/lib/ispmax/import/archivo.ispmax --yes';

export interface ContentCounts { pages: number; drafts: number; assets: number; tours: number; redirects?: number; siteFiles?: number; revisions?: number }

/** ¿Hay que escribir CARGAR? Solo al reemplazar sobre una base que ya tiene contenido. */
export const needsConfirm = (mode: ImportMode, hasContent: boolean) => mode === 'replace' && hasContent;

/** Modo por defecto: reemplazar en un sistema vacío; en uno con contenido, lo seguro es añadir. */
export const defaultMode = (hasContent: boolean): ImportMode => (hasContent ? 'merge' : 'replace');

/** Problema evidente del archivo elegido (antes de subirlo), o null. */
export function fileProblem(f: { name: string; size: number }): string | null {
  if (!/\.ispmax$/i.test(f.name)) return 'El archivo no es un respaldo del manual: debe terminar en .ispmax.';
  if (f.size <= 0) return 'El archivo está vacío.';
  if (f.size > MAX_PACKAGE_BYTES) return 'El archivo supera el máximo de 300 MB.';
  return null;
}

/** ¿Se puede enviar? Archivo válido por nombre y tamaño, y confirmación escrita si corresponde. */
export function canImport(file: { name: string; size: number } | null, mode: ImportMode, hasContent: boolean, typed: string) {
  if (!file || fileProblem(file)) return false;
  return !needsConfirm(mode, hasContent) || typed.trim() === CONFIRM_WORD;
}

/** Huella corta legible: 12 caracteres en dos grupos. */
export const shortHash = (h?: string | null) => (h ? `${h.slice(0, 6)} ${h.slice(6, 12)}` : '');

/** Texto de conteos: «285 páginas · 12 borradores · 270 imágenes · 3 tours». */
export function countsText(c?: Partial<ContentCounts> | null, withRevisions = false) {
  if (!c) return '';
  const n = (v: number | undefined, one: string, many: string) => (v == null ? null : `${v} ${v === 1 ? one : many}`);
  const parts = [n(c.pages, 'página', 'páginas'), c.drafts ? n(c.drafts, 'borrador', 'borradores') : null, n(c.assets, 'imagen', 'imágenes'), n(c.tours, 'tour', 'tours')];
  if (withRevisions && c.revisions) parts.push(n(c.revisions, 'revisión', 'revisiones'));
  return parts.filter(Boolean).join(' · ');
}

/** Mensaje comprensible para un error de la API del paquete. */
export function importErrorText(status: number, message: string): string {
  if (status === 413) return 'El archivo es demasiado grande: el máximo es 300 MB.';
  if (status === 409) return 'Ya hay una importación en curso. Espere a que termine e inténtelo de nuevo.';
  if (status === 403) return 'Solo un administrador puede cargar contenido.';
  if (status === 0) return message || 'No se pudo conectar con el servidor del portal.';
  if (status === 400) {
    if (/CARGAR/.test(message)) return 'La base ya tiene contenido: para reemplazarlo hay que escribir CARGAR en la confirmación.';
    return `El archivo no es un respaldo válido del manual, o está dañado o alterado. ${message}`.trim();
  }
  return message || `Error ${status}`;
}

/** Extrae el resultado de la línea «Importado (modo): …» del registro del trabajo. */
export function parseImportResult(log: string): { counts: ContentCounts; skipped: number; safetyFile: string | null } | null {
  const m = /Importado \((?:replace|merge)\): (\d+) páginas \((\d+) borradores\), (\d+) imágenes, (\d+) tours, (\d+) redirecciones, (\d+) archivos de apoyo, (\d+) revisiones; omitido por existir: (\d+)/.exec(log);
  if (!m) return null;
  const s = /Paquete de seguridad: (\S+?\.ispmax)/.exec(log);
  return {
    counts: { pages: +m[1], drafts: +m[2], assets: +m[3], tours: +m[4], redirects: +m[5], siteFiles: +m[6], revisions: +m[7] },
    skipped: +m[8], safetyFile: s ? s[1] : null,
  };
}

/** Última línea útil del registro (para mostrar el avance). */
export function lastLogLine(log: string) {
  const ls = log.split('\n').map((l) => l.trim()).filter((l) => l && !/^\[proceso \d+\]/.test(l));
  return ls[ls.length - 1] ?? '';
}
