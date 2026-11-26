/*
 * Lógica pura del Inicio (sin imports: se prueba con `node --test test/home.test.mjs`).
 * Pendientes que merecen acción, el contenido agrupado como el menú del manual, saludo y textos de la actividad.
 */

export type HomeRole = 'admin' | 'editor' | 'viewer';
const RANK: Record<HomeRole, number> = { viewer: 1, editor: 2, admin: 3 };
const atLeast = (r: HomeRole, min: HomeRole) => RANK[r] >= RANK[min];

export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es')} ${n === 1 ? one : many}`;

/** Saludo según la hora local (0-23). */
export const greeting = (hour: number) => (hour >= 6 && hour < 12 ? 'Buenos días' : hour >= 12 && hour < 20 ? 'Buenas tardes' : 'Buenas noches');

/** Días completos transcurridos desde `iso` (null si no hay fecha válida). */
export function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 86400000));
}

/* ---------- Pendientes ---------- */

export const BACKUP_MAX_DAYS = 7;
export type AttentionTone = 'danger' | 'warn' | 'info';
export interface AttentionItem { id: string; tone: AttentionTone; title: string; detail?: string; action?: { label: string; href: string } }
export interface AttentionInput {
  role: HomeRole;
  now: number;
  /** Páginas en borrador (de /api/stats o /api/site/status). */
  drafts?: number | null;
  /** Tours en borrador (de /api/tours); undefined = no se pudo saber. */
  toursDraft?: number | null;
  /** Estado del manual publicado (de /api/site/status). */
  site?: { state: string; siteExists?: boolean; autoPublish?: boolean; error?: string | null } | null;
  /** Commits del remoto que faltan (de /api/system/version). */
  behind?: number | null;
  needsRestart?: boolean;
  /** Fecha del último respaldo: null = no hay ninguno; undefined = no se sabe (no se avisa). */
  lastBackupAt?: string | null;
}

const ORDER: Record<AttentionTone, number> = { danger: 0, warn: 1, info: 2 };

/**
 * Lista de cosas que merecen acción, de más a menos grave. Solo lo que aplica y con datos reales:
 * un dato desconocido (undefined/null) no genera aviso. El lector ve los avisos del contenido y del manual, sin botones;
 * respaldos y actualización del sistema solo los ve el administrador.
 */
export function attentionItems(i: AttentionInput): AttentionItem[] {
  const out: AttentionItem[] = [];
  const editor = atLeast(i.role, 'editor');
  const admin = atLeast(i.role, 'admin');
  const site = { label: 'Ver el manual publicado', href: '#/manual' };
  const sys = { label: 'Abrir la actualización del sistema', href: '#/ajustes/sistema' };

  if (i.site?.state === 'error') {
    out.push({ id: 'site-error', tone: 'danger', title: 'No se pudo actualizar el manual',
      detail: 'El anterior sigue publicado. El registro de Manual publicado indica el motivo.', action: editor ? { label: 'Ver el motivo', href: '#/manual' } : undefined });
  } else if (i.site && i.site.siteExists === false && i.site.state !== 'building') {
    out.push({ id: 'site-missing', tone: 'warn', title: 'El manual todavía no se ha generado', detail: 'Hasta entonces la dirección pública no muestra nada.', action: editor ? site : undefined });
  }
  if (i.site?.state === 'pending' && i.site.autoPublish === false) {
    out.push({ id: 'site-manual', tone: 'info', title: 'Hay cambios guardados sin llevar al manual', detail: 'La actualización automática está desactivada.', action: editor ? { label: 'Actualizar', href: '#/manual' } : undefined });
  }
  if (i.drafts != null && i.drafts > 0) {
    out.push({ id: 'drafts', tone: 'warn', title: `${plural(i.drafts, 'página espera', 'páginas esperan')} a publicarse`, detail: 'Los borradores no salen en el manual hasta publicarlos.', action: editor ? { label: 'Revisar borradores', href: '#/borradores' } : undefined });
  }
  if (i.toursDraft != null && i.toursDraft > 0) {
    out.push({ id: 'tours', tone: 'info', title: `${plural(i.toursDraft, 'tour en borrador', 'tours en borrador')}`, detail: 'Un tour en borrador no se muestra en las páginas que lo incluyen.', action: editor ? { label: 'Ver tours', href: '#/tours' } : undefined });
  }
  if (admin && i.needsRestart) {
    out.push({ id: 'restart', tone: 'warn', title: 'Falta reiniciar el sistema', detail: 'La última actualización del sistema lo necesita para aplicarse.', action: sys });
  }
  if (admin && i.behind != null && i.behind > 0) {
    out.push({ id: 'update', tone: 'info', title: 'Hay una actualización del sistema', detail: `${plural(i.behind, 'cambio', 'cambios')} en el repositorio que aún no se han aplicado.`, action: { label: 'Ver novedades', href: '#/ajustes/sistema' } });
  }
  if (admin && i.lastBackupAt !== undefined) {
    const d = daysSince(i.lastBackupAt, i.now);
    if (i.lastBackupAt === null) out.push({ id: 'backup', tone: 'warn', title: 'Todavía no hay ningún respaldo', detail: 'Un respaldo permite recuperar el contenido si algo sale mal.', action: { label: 'Ir a Respaldos', href: '#/respaldos' } });
    else if (d != null && d > BACKUP_MAX_DAYS) out.push({ id: 'backup', tone: 'warn', title: `El último respaldo es de hace ${d} días`, detail: `Conviene hacer uno al menos cada ${BACKUP_MAX_DAYS} días.`, action: { label: 'Ir a Respaldos', href: '#/respaldos' } });
  }
  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
}

/* ---------- El manual de un vistazo (mismo orden que el menú superior del manual) ---------- */

export interface MenuSection { key: string; label: string; secciones: string[]; hint: string }
export const MENU_SECTIONS: MenuSection[] = [
  { key: 'guia', label: 'Guía', secciones: ['guia'], hint: 'Cada módulo de ISPMAX explicado' },
  { key: 'tareas', label: 'Quiero hacer…', secciones: ['tareas'], hint: 'Tareas paso a paso' },
  { key: 'problemas', label: 'Tengo un problema', secciones: ['problemas'], hint: 'Síntoma, causa y solución' },
  { key: 'preguntas', label: 'Preguntas', secciones: ['preguntas'], hint: 'Respuestas cortas' },
  { key: 'referencia', label: 'Referencia', secciones: ['referencia', 'conceptos'], hint: 'Permisos, automatizaciones y conceptos' },
];

interface TreePage { status: string; children?: TreePage[] }
interface TreeSection { key: string; sectionIndex: { status: string } | null; grupos: { name: string; pages: TreePage[] }[] }
export interface SectionRow { key: string; label: string; hint: string; tree: string; count: number; share: number; groups: number | null; drafts: number | null }

const countDrafts = (l: TreePage[]): number => l.reduce((n, p) => n + (p.status === 'draft' ? 1 : 0) + countDrafts(p.children ?? []), 0);

/**
 * Filas del resumen por sección: páginas (de /api/stats `bySeccion`), grupos y borradores (de /api/structure, si llegó).
 * `share` es la proporción respecto a la sección mayor (0-1) para la barra. `other` = páginas fuera del menú (la portada).
 */
export function sectionOverview(bySeccion: { seccion: string; count: number }[], structure?: TreeSection[] | null): { rows: SectionRow[]; other: number } {
  const count = new Map(bySeccion.map((x) => [x.seccion, x.count]));
  const tree = new Map((structure ?? []).map((s) => [s.key, s]));
  const used = new Set<string>();
  const rows = MENU_SECTIONS.map((m) => {
    let groups: number | null = structure ? 0 : null;
    let drafts: number | null = structure ? 0 : null;
    let n = 0;
    for (const k of m.secciones) {
      used.add(k);
      n += count.get(k) ?? 0;
      const t = tree.get(k);
      if (t && groups != null && drafts != null) {
        groups += t.grupos.filter((g) => g.pages.length > 0).length;
        drafts += countDrafts(t.grupos.flatMap((g) => g.pages)) + (t.sectionIndex?.status === 'draft' ? 1 : 0);
      }
    }
    return { key: m.key, label: m.label, hint: m.hint, tree: m.secciones[0]!, count: n, share: 0, groups, drafts };
  });
  const max = Math.max(1, ...rows.map((r) => r.count));
  for (const r of rows) r.share = r.count / max;
  const other = bySeccion.filter((x) => !used.has(x.seccion)).reduce((n, x) => n + x.count, 0);
  return { rows, other };
}

/* ---------- Actividad ---------- */

/** Acciones que aún no tienen texto en `ACTION_LABEL` (lib/util). */
export const EXTRA_ACTION_LABEL: Record<string, string> = {
  'structure.group_create': 'creó un grupo en', 'structure.group_rename': 'renombró un grupo de', 'structure.group_delete': 'eliminó un grupo de',
  'content.export': 'descargó un respaldo del contenido', 'content.import': 'importó contenido', 'content.delete': 'eliminó el paquete de contenido',
};

/** Texto de una acción de auditoría: el conocido, el de respaldo o uno legible a partir de la clave. */
export function actionText(action: string, known: Record<string, string>): string {
  const t = known[action] ?? EXTRA_ACTION_LABEL[action];
  if (t) return t;
  const verb = action.split('.').pop() ?? action;
  return `realizó «${verb.replace(/_/g, ' ')}» en`;
}

/** Objetivo mostrable: los identificadores internos de trabajo (`job:12`) no aportan nada. */
export const shownTarget = (t?: string | null) => (t && !/^job:\d+$/.test(t) ? t : '');
