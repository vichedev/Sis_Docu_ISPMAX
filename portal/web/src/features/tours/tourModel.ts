/* Lógica pura de los tours (sin React ni imports: se prueba con `node --test portal/web/test/tours.test.mjs`). */

export interface Spot { x: number; y: number; w: number; h: number }
export interface TourLink { label: string; route: string }
export interface TourStep { image: string; alt: string; title: string; text: string; spot: Spot | null; link: TourLink | null }
/** Paso en edición: lleva una clave estable para el arrastre y las listas de React. */
export type EditStep = TourStep & { key: string };
export interface Issue { step: number | null; field: 'steps' | 'image' | 'title' | 'text' | 'spot' | 'link'; message: string }

export const LIMITS = { title: 200, text: 2000, alt: 300, link: 120, maxSteps: 100 } as const;

let seq = 0;
export const newKey = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

export const emptyStep = (image = ''): EditStep => ({ key: newKey(), image, alt: '', title: '', text: '', spot: null, link: null });
export const toEdit = (steps: Partial<TourStep>[]): EditStep[] =>
  steps.map((s) => ({ key: newKey(), image: s.image ?? '', alt: s.alt ?? '', title: s.title ?? '', text: s.text ?? '', spot: s.spot ?? null, link: s.link ?? null }));
export const toApi = (steps: EditStep[]): TourStep[] => steps.map(({ key: _k, ...s }) => s);
/** Copia con clave nueva (duplicar un paso). */
export const cloneStep = (s: EditStep): EditStep => ({ ...s, key: newKey(), spot: s.spot && { ...s.spot }, link: s.link && { ...s.link } });

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function spotIssue(p: Spot | null): string | null {
  if (!p) return null;
  const ok = [p.x, p.y, p.w, p.h].every((n) => typeof n === 'number' && Number.isFinite(n));
  if (!ok) return 'El recuadro necesita x, y, ancho y alto.';
  if (p.x < 0 || p.y < 0 || p.w <= 0 || p.h <= 0 || p.x > 100 || p.y > 100 || p.w > 100 || p.h > 100 || p.x + p.w > 100.0001 || p.y + p.h > 100.0001) return 'El recuadro debe quedar dentro de la imagen (0 a 100 %).';
  return null;
}

/** Comprobaciones que la API hace al publicar, con el paso y el motivo. `known` (opcional): imágenes que existen. */
export function validateTour(steps: TourStep[], known?: Set<string>): Issue[] {
  const out: Issue[] = [];
  if (steps.length < 1) out.push({ step: null, field: 'steps', message: 'Añada al menos un paso.' });
  if (steps.length > LIMITS.maxSteps) out.push({ step: null, field: 'steps', message: `Un tour admite como máximo ${LIMITS.maxSteps} pasos.` });
  steps.forEach((s, i) => {
    if (!s.image) out.push({ step: i, field: 'image', message: 'Elija una captura.' });
    else if (known && !known.has(s.image)) out.push({ step: i, field: 'image', message: 'La imagen ya no existe en la galería.' });
    if (!s.title.trim()) out.push({ step: i, field: 'title', message: 'Falta el título.' });
    else if (s.title.length > LIMITS.title) out.push({ step: i, field: 'title', message: `El título supera ${LIMITS.title} caracteres.` });
    if (!s.text.trim()) out.push({ step: i, field: 'text', message: 'Falta el texto: explique qué hacer.' });
    else if (s.text.length > LIMITS.text) out.push({ step: i, field: 'text', message: `El texto supera ${LIMITS.text} caracteres.` });
    const si = spotIssue(s.spot);
    if (si) out.push({ step: i, field: 'spot', message: si });
    if (s.link) {
      if (!s.link.label.trim()) out.push({ step: i, field: 'link', message: 'El enlace necesita un texto.' });
      if (!s.link.route.startsWith('/') || s.link.route.startsWith('//') || /[\s\\]/.test(s.link.route)) out.push({ step: i, field: 'link', message: 'El enlace debe apuntar a una página del manual.' });
    }
  });
  return out;
}

/** Problemas de un paso (para marcarlo en la lista). */
export const issuesOf = (issues: Issue[], i: number) => issues.filter((x) => x.step === i);

/** `**negrita**` → trozos, igual que el componente del manual (el resto es texto plano). */
export function splitBold(text: string): { bold: boolean; text: string }[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== '').map((p) => (/^\*\*[^*]+\*\*$/.test(p) ? { bold: true, text: p.slice(2, -2) } : { bold: false, text: p }));
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const a = list.slice();
  a.splice(to, 0, a.splice(from, 1)[0]!);
  return a;
}

/** Slug libre para duplicar: `base-copia`, `base-copia-2`… */
export function freeSlug(base: string, taken: Set<string>): string {
  const b = slugify(base) || 'tour';
  let s = `${b}-copia`;
  for (let n = 2; taken.has(s); n++) s = `${b}-copia-${n}`;
  return s;
}

/** Firma estable para detectar cambios sin guardar. */
export const signature = (title: string, description: string, steps: EditStep[]) => JSON.stringify([title, description, toApi(steps)]);
