/**
 * Las cinco secciones del manual (las del menú superior) con su icono y su color. Es la única fuente de esta
 * correspondencia: la usan la portada, las migas de pan, el menú lateral, el menú móvil y la paleta de búsqueda.
 * Cada color es una pareja AA (texto -700 sobre claro, -300 sobre oscuro) escrita entera para que Tailwind la detecte.
 */
import type { IconName } from '../components/Icon';

export type SectionKey = 'guia' | 'tareas' | 'problemas' | 'preguntas' | 'referencia';

export interface SectionInfo {
  key: SectionKey;
  icon: IconName;
  /** Qué encuentra el lector (portada y menú móvil). */
  blurb: string;
  /** Texto e icono con el color de la sección. */
  text: string;
  /** Fondo suave del icono o del chip. */
  tile: string;
  /** Borde al pasar el ratón. */
  hover: string;
  /** Punto o barra de color. */
  dot: string;
}

export const SECTIONS: Record<SectionKey, SectionInfo> = {
  guia: {
    key: 'guia',
    icon: 'book',
    blurb: 'Recorrido completo por cada módulo y pantalla.',
    text: 'text-brand-700 dark:text-brand-300',
    tile: 'bg-brand-500/10 dark:bg-brand-400/15',
    hover: 'hover:border-brand-500/45',
    dot: 'bg-brand-500',
  },
  tareas: {
    key: 'tareas',
    icon: 'checks',
    blurb: 'Procedimientos cortos, paso a paso.',
    text: 'text-sky-700 dark:text-sky-300',
    tile: 'bg-sky-500/10 dark:bg-sky-400/15',
    hover: 'hover:border-sky-500/45',
    dot: 'bg-sky-500',
  },
  problemas: {
    key: 'problemas',
    icon: 'lifebuoy',
    blurb: 'Del síntoma a la causa y la solución.',
    text: 'text-rose-700 dark:text-rose-300',
    tile: 'bg-rose-500/10 dark:bg-rose-400/15',
    hover: 'hover:border-rose-500/45',
    dot: 'bg-rose-500',
  },
  preguntas: {
    key: 'preguntas',
    icon: 'help',
    blurb: 'Respuestas breves, agrupadas por tema.',
    text: 'text-amber-700 dark:text-amber-300',
    tile: 'bg-amber-500/12 dark:bg-amber-400/15',
    hover: 'hover:border-amber-500/50',
    dot: 'bg-amber-500',
  },
  referencia: {
    key: 'referencia',
    icon: 'library',
    blurb: 'Estados, permisos, glosario y valores exactos.',
    text: 'text-teal-700 dark:text-teal-300',
    tile: 'bg-teal-500/10 dark:bg-teal-400/15',
    hover: 'hover:border-teal-500/45',
    dot: 'bg-teal-500',
  },
};

/** Sección de una ruta (sin la base del sitio). Refleja los `activeMatch` del menú de rspress.config.ts. */
export function sectionOf(path: string): SectionKey | null {
  const p = path.replace(/\.html$/, '');
  if (/^\/guia\/(estados|rutinas|faq|glosario)(\/|$)/.test(p)) return 'referencia';
  if (p.startsWith('/guia/')) return 'guia';
  if (p.startsWith('/tareas/') || p === '/tareas') return 'tareas';
  if (p.startsWith('/problemas/') || p === '/problemas') return 'problemas';
  if (p.startsWith('/preguntas/') || p === '/preguntas') return 'preguntas';
  if (/^\/(referencia|conceptos)(\/|$)/.test(p)) return 'referencia';
  return null;
}

/** Sección de un elemento del menú superior: por su enlace o, si es un desplegable, "referencia". */
export function sectionOfNav(item: { link?: string; items?: unknown[] }): SectionKey | null {
  if (item.items) return 'referencia';
  return item.link ? sectionOf(item.link.endsWith('/') ? item.link : `${item.link}/`) ?? sectionOf(item.link) : null;
}

/** Icono para los enlaces conocidos (desplegable "Referencia", módulos de la portada). */
const ICON_BY_LINK: Record<string, IconName> = {
  '/guia/estados': 'activity',
  '/guia/rutinas': 'calendar',
  '/guia/faq': 'help',
  '/guia/glosario': 'bookmark',
  '/referencia/permisos': 'key',
  '/referencia/automatizaciones': 'zap',
  '/conceptos/': 'bulb',
  '/guia/inicio': 'book',
  '/guia/primeros-pasos': 'login',
  '/guia/dashboard': 'gauge',
  '/guia/routers': 'router',
  '/guia/clientes': 'users',
  '/guia/registrar-pago': 'wallet',
  '/guia/proveedores': 'box',
  '/guia/ajustes': 'sliders',
};

/** Icono por palabras del título, si el enlace no está en la tabla (p. ej. una tarjeta nueva de la portada). */
const ICON_BY_WORD: [RegExp, IconName][] = [
  [/acceso|sesi[oó]n|ingreso/i, 'login'],
  [/dashboard|indicador/i, 'gauge'],
  [/red|router|olt|mikrotik/i, 'router'],
  [/cliente/i, 'users'],
  [/finanza|caja|pago|factura|cobr/i, 'wallet'],
  [/almac[eé]n|inventario|producto/i, 'box'],
  [/ajuste|configura/i, 'sliders'],
  [/bot|inteligencia/i, 'bot'],
  [/bandeja|chat|mensaj/i, 'chat'],
  [/incidente|monitoreo/i, 'activity'],
  [/permiso|rol/i, 'key'],
  [/concepto/i, 'bulb'],
  [/referencia|glosario/i, 'library'],
];

export function iconFor(link?: string, title = ''): IconName | null {
  const clean = link?.replace(/\.html$/, '');
  if (clean && ICON_BY_LINK[clean]) return ICON_BY_LINK[clean];
  return ICON_BY_WORD.find(([re]) => re.test(title))?.[1] ?? null;
}

/** Separa el emoji inicial de un texto de menú ("🔐 Permisos" → ["🔐", "Permisos"]). */
export function splitEmoji(text: string): [string, string] {
  const m = /^(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)\s*/u.exec(text);
  return m ? [m[1], text.slice(m[0].length)] : ['', text];
}
