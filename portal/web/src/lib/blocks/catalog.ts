/* Catálogo de tipos de bloque para el menú "+" y "/" de la interfaz (orden de aparición y textos). */
import type { BlockType } from './types.ts';

export interface BlockTypeInfo {
  type: BlockType;
  label: string;
  /** Qué produce en el manual. */
  hint: string;
  /** Palabras para filtrar en el menú "/". */
  keywords: string[];
  /** false: no se ofrece al insertar (solo aparece al analizar páginas existentes). */
  insertable: boolean;
}

export const BLOCK_TYPES: readonly BlockTypeInfo[] = [
  { type: 'heading', label: 'Título', hint: 'Encabezado de sección (## o ###).', keywords: ['titulo', 'subtitulo', 'encabezado', 'seccion', 'h2', 'h3'], insertable: true },
  { type: 'paragraph', label: 'Texto', hint: 'Párrafo con negrita, enlaces y código.', keywords: ['texto', 'parrafo', 'p'], insertable: true },
  { type: 'list', label: 'Lista', hint: 'Lista con viñetas o numerada.', keywords: ['lista', 'viñetas', 'numerada', 'ul', 'ol'], insertable: true },
  { type: 'steps', label: 'Pasos', hint: 'Pasos numerados (<Steps>).', keywords: ['pasos', 'procedimiento', 'steps'], insertable: true },
  { type: 'image', label: 'Imagen', hint: 'Captura con pie (<Figure>).', keywords: ['imagen', 'captura', 'figura', 'foto'], insertable: true },
  { type: 'imageRow', label: 'Fila de imágenes', hint: 'Varias capturas en una fila o cuadrícula (<FigRow>/<FigGrid>).', keywords: ['fila', 'cuadricula', 'galeria', 'imagenes'], insertable: true },
  { type: 'callout', label: 'Aviso', hint: 'Nota, importante, advertencia, información o pregunta desplegable (:::).', keywords: ['aviso', 'nota', 'importante', 'advertencia', 'dato', 'pregunta', 'details'], insertable: true },
  { type: 'cards', label: 'Tarjetas', hint: 'Rejilla de tarjetas con enlace (<Cards>).', keywords: ['tarjetas', 'cards', 'rejilla'], insertable: true },
  { type: 'table', label: 'Tabla', hint: 'Tabla con encabezado.', keywords: ['tabla', 'columnas', 'filas'], insertable: true },
  { type: 'code', label: 'Código', hint: 'Bloque de código.', keywords: ['codigo', 'code', 'comando'], insertable: true },
  { type: 'kicker', label: 'Antetítulo', hint: 'Etiqueta sobre el título (<Kicker>).', keywords: ['antetitulo', 'kicker', 'etiqueta'], insertable: true },
  { type: 'lead', label: 'Entradilla', hint: 'Frase destacada bajo el título (<Lead>).', keywords: ['entradilla', 'lead', 'resumen'], insertable: true },
  { type: 'divider', label: 'Divisor', hint: 'Línea horizontal (---).', keywords: ['divisor', 'linea', 'separador', 'hr'], insertable: true },
  { type: 'tour', label: 'Tour', hint: 'Recorrido guiado sobre capturas (<Tour>).', keywords: ['tour', 'recorrido', 'guiado'], insertable: true },
  { type: 'searchTerms', label: 'Términos de búsqueda', hint: 'Palabras para el buscador; no se ven (<SearchTerms>).', keywords: ['busqueda', 'terminos', 'sinonimos'], insertable: true },
  { type: 'raw', label: 'MDX', hint: 'Código MDX tal cual.', keywords: ['mdx', 'codigo', 'raw', 'html'], insertable: true },
];

export const BLOCK_LABELS: Readonly<Record<BlockType, string>> = Object.fromEntries(BLOCK_TYPES.map(t => [t.type, t.label])) as Record<BlockType, string>;
