import { CircleHelp, Lightbulb, ListChecks, Map as MapIcon, Table2, TriangleAlert, type LucideIcon } from 'lucide-react';

export interface PageType { tipo: string; seccion: string; label: string; icon: LucideIcon; text: string }
/** Tipos de página (definen la plantilla y la sección por defecto). */
export const PAGE_TYPES: PageType[] = [
  { tipo: 'tarea', seccion: 'tareas', label: 'Tarea', icon: ListChecks, text: 'Pasos para hacer algo concreto en ISPMAX: crear un cliente, emitir una factura.' },
  { tipo: 'guia', seccion: 'guia', label: 'Guía', icon: MapIcon, text: 'Recorrido por una pantalla o un flujo completo, de principio a fin.' },
  { tipo: 'problema', seccion: 'problemas', label: 'Problema', icon: TriangleAlert, text: 'Un síntoma, su causa y cómo resolverlo.' },
  { tipo: 'pregunta', seccion: 'preguntas', label: 'Pregunta', icon: CircleHelp, text: 'Respuesta breve a una duda frecuente.' },
  { tipo: 'referencia', seccion: 'referencia', label: 'Referencia', icon: Table2, text: 'Datos de consulta: permisos, mensajes, campos.' },
  { tipo: 'concepto', seccion: 'conceptos', label: 'Concepto', icon: Lightbulb, text: 'Explica una idea del producto, sin pasos.' },
];
export const typeForSection = (s: string) => PAGE_TYPES.find((t) => t.seccion === s) ?? PAGE_TYPES[1];
/** El frontmatter guarda `faq` para preguntas; el resto coincide con el tipo. */
export const tipoFromFrontmatter = (fm: unknown, seccion: string) => {
  const t = (fm && typeof fm === 'object' && 'tipo' in fm ? String((fm as { tipo: unknown }).tipo) : '') || typeForSection(seccion).tipo;
  return t === 'faq' ? 'pregunta' : PAGE_TYPES.some((p) => p.tipo === t) ? t : typeForSection(seccion).tipo;
};
/** Módulo de una ruta de tareas: /tareas/<modulo>/<slug>. */
export const moduloOf = (route: string) => { const p = route.split('/').filter(Boolean); return p[0] === 'tareas' && p.length > 2 ? p[1] : ''; };
export const slugOf = (route: string) => route.split('/').filter(Boolean).pop() ?? '';
