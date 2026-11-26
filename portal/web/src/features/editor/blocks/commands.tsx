/* Iconos y comandos de los menús «+» y «/» (sobre INSERT_COMMANDS del modelo). */
import type { ReactNode } from 'react';
import {
  Braces, ChevronRight, Code, GalleryHorizontal, Grid2x2, Heading2, Heading3, Image, Info, LayoutGrid, Lightbulb, List, ListChecks,
  ListOrdered, Minus, OctagonAlert, Pilcrow, Route, Search, Table, Tag, TextQuote, TriangleAlert,
} from 'lucide-react';
import type { CommandItem } from '@/components/ui';
import type { Block, BlockType } from '@/lib/blocks/index.ts';
import { INSERT_COMMANDS, type InsertCommand } from '../model/doc';

const I = 16;
const CMD_ICON: Record<string, ReactNode> = {
  heading2: <Heading2 size={I} />, heading3: <Heading3 size={I} />, paragraph: <Pilcrow size={I} />, list: <List size={I} />, olist: <ListOrdered size={I} />,
  lead: <TextQuote size={I} />, kicker: <Tag size={I} />, steps: <ListChecks size={I} />, tip: <Lightbulb size={I} />, info: <Info size={I} />,
  warning: <TriangleAlert size={I} />, danger: <OctagonAlert size={I} />, details: <ChevronRight size={I} />, cards: <LayoutGrid size={I} />,
  table: <Table size={I} />, code: <Code size={I} />, divider: <Minus size={I} />, image: <Image size={I} />, imageRow: <GalleryHorizontal size={I} />,
  imageGrid: <Grid2x2 size={I} />, tour: <Route size={I} />, searchTerms: <Search size={I} />, raw: <Braces size={I} />,
};

const TYPE_ICON: Record<BlockType, ReactNode> = {
  heading: CMD_ICON.heading2, paragraph: CMD_ICON.paragraph, list: CMD_ICON.list, image: CMD_ICON.image, imageRow: CMD_ICON.imageRow, steps: CMD_ICON.steps,
  callout: CMD_ICON.tip, cards: CMD_ICON.cards, table: CMD_ICON.table, code: CMD_ICON.code, kicker: CMD_ICON.kicker, lead: CMD_ICON.lead,
  divider: CMD_ICON.divider, tour: CMD_ICON.tour, searchTerms: CMD_ICON.searchTerms, raw: CMD_ICON.raw,
};
export const typeIcon = (t: BlockType): ReactNode => TYPE_ICON[t];
/** Icono de un comando de inserción (variantes: subtítulo, tipos de aviso, cuadrícula…). */
export const commandIcon = (id: string): ReactNode => CMD_ICON[id];

/** Nombre del bloque en la barra (más concreto que el tipo: «Subtítulo», «Aviso: Importante»…). */
export function blockName(b: Block): string {
  switch (b.type) {
    case 'heading': return b.level === 1 ? 'Título principal' : b.level === 2 ? 'Título' : b.level === 3 ? 'Subtítulo' : `Título ${b.level}`;
    case 'paragraph': return 'Texto';
    case 'list': return b.ordered ? 'Lista numerada' : 'Lista';
    case 'callout': return b.kind === 'details' ? 'Pregunta' : 'Aviso';
    case 'imageRow': return b.kind === 'grid' ? 'Cuadrícula' : 'Fila de imágenes';
    case 'image': return 'Imagen';
    case 'steps': return 'Pasos';
    case 'cards': return 'Tarjetas';
    case 'table': return 'Tabla';
    case 'code': return 'Código';
    case 'kicker': return 'Antetítulo';
    case 'lead': return 'Entradilla';
    case 'divider': return 'Divisor';
    case 'tour': return 'Tour';
    case 'searchTerms': return 'Términos de búsqueda';
    case 'raw': return 'MDX';
  }
}

export const COMMAND_ITEMS: CommandItem[] = INSERT_COMMANDS.map((c) => ({ id: c.id, label: c.label, description: c.hint, keywords: c.keywords, group: c.group, icon: CMD_ICON[c.id] }));
export const commandById = (id: string): InsertCommand => INSERT_COMMANDS.find((c) => c.id === id) ?? INSERT_COMMANDS[2];

/** Bloques de imagen recién insertados: abren la galería al montarse. */
export const autoPick = new Set<string>();

/** El menú «/» se maneja escribiendo en el párrafo: las teclas de navegación se reenvían a la lista abierta. */
export function forwardToMenu(key: string) {
  const list = document.querySelector('[data-radix-popper-content-wrapper] [role="listbox"]');
  list?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}
