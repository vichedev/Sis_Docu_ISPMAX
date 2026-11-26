/*
 * Tipos del motor de bloques del portal.
 *
 * Una página (cuerpo MDX, sin frontmatter) se representa como una lista de bloques. Cada bloque guarda
 * su texto original exacto (`raw`) y si se editó (`dirty`). Al serializar, un bloque no editado se emite
 * con su `raw`; uno editado se regenera desde sus campos con la sintaxis del manual.
 *
 * Solo sintaxis borrable de TypeScript (sin enums ni namespaces): Node 24 lo ejecuta tal cual.
 */

export type Eol = '\n' | '\r\n';

/** Campos comunes a todos los bloques. */
export interface BlockMeta {
  /** Identificador estable (generado; no depende del contenido). Se conserva al editar y al convertir. */
  id: string;
  /** Texto original exacto del bloque, sin el salto de línea final. Vacío en bloques creados en el portal. */
  raw: string;
  /** true si el bloque se editó (o es nuevo): se regenera desde sus campos al serializar. */
  dirty: boolean;
  /** Separador que sigue al bloque en el original: salto de línea final más las líneas en blanco. */
  sep: string;
  /** Texto en blanco que precede al primer bloque del documento (solo lo lleva un bloque). */
  pre?: string;
  /**
   * Interno: id del bloque que lo seguía al analizar (`null` si era el último). El serializador lo usa
   * para saber si dos bloques siguen siendo vecinos originales y puede conservar un separador sin línea en blanco.
   */
  nextId?: string | null;
  /** Fin de línea del documento del que salió el bloque. */
  eol?: Eol;
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** `## Texto` */
export interface HeadingBlock extends BlockMeta {
  type: 'heading';
  level: HeadingLevel;
  /** Markdown en línea (admite **negrita**, `código`, `<Badge>`). */
  text: string;
}

/** Párrafo (o varias líneas de texto Markdown seguidas). */
export interface ParagraphBlock extends BlockMeta {
  type: 'paragraph';
  md: string;
}

export type BulletMarker = '-' | '*' | '+';
export type OrderedDelimiter = '.' | ')';

/** Lista con viñetas o numerada. Cada elemento es Markdown; sus líneas de continuación van sin sangría. */
export interface ListBlock extends BlockMeta {
  type: 'list';
  ordered: boolean;
  /** Primer número de una lista numerada (normalmente 1). */
  start: number;
  /** Viñeta (`-`) o delimitador (`.`) de la lista numerada. */
  marker: BulletMarker | OrderedDelimiter;
  /** true si los elementos van separados por una línea en blanco. */
  loose: boolean;
  items: string[];
}

/** Atributos de `<Figure … />` en el orden en que los escribe el manual. */
export interface ImageData {
  /** Ruta pública, p. ej. `/assets/imgs/clientes/listado/01-listado.webp`. */
  src: string;
  alt: string;
  caption: string;
  width: number | null;
  height: number | null;
  /** Ancho máximo CSS, p. ej. `1100px`. */
  max: string;
  /** `compact`, `start`, `hero` o vacío. */
  variant: string;
}

/** `<Figure src="…" alt="…" caption="…" width={…} height={…} max="…" />` */
export interface ImageBlock extends BlockMeta, ImageData {
  type: 'image';
}

/** `<FigRow>` (fila) o `<FigGrid>` (cuadrícula) con una `<Figure />` por línea. */
export interface ImageRowBlock extends BlockMeta {
  type: 'imageRow';
  kind: 'row' | 'grid';
  images: ImageData[];
}

/** Un paso de `<Steps>`. `title` (opcional) se escribe como primera línea en negrita. */
export interface StepItem {
  title: string;
  /** Markdown del paso (puede llevar figuras, listas, avisos…). */
  md: string;
}

/** `<Steps>` con `<Step>` separados por líneas en blanco por dentro. */
export interface StepsBlock extends BlockMeta {
  type: 'steps';
  steps: StepItem[];
}

/** Tipos de aviso `:::tipo Título`. `details` es el desplegable de las preguntas frecuentes. */
export type CalloutKind = 'tip' | 'info' | 'warning' | 'danger' | 'details' | 'note' | 'caution';

/** `:::warning Importante` … `:::` */
export interface CalloutBlock extends BlockMeta {
  type: 'callout';
  kind: CalloutKind;
  /** Título del aviso (texto tras el tipo). Vacío: el tema pone el suyo. */
  title: string;
  md: string;
  /** true: línea en blanco tras la apertura y antes del cierre (estilo más frecuente del manual). */
  padded: boolean;
}

export interface CardItem {
  title: string;
  /** Ruta del manual (`/guia/…`) o vacío. */
  href: string;
  /** Emoji o vacío. */
  icon: string;
  md: string;
}

/** `<Cards columns={3}>` con `<Card title="…">` */
export interface CardsBlock extends BlockMeta {
  type: 'cards';
  /** Columnas en escritorio (1-3); `null` = sin atributo (el componente usa 3). */
  columns: number | null;
  cards: CardItem[];
}

/** Tabla GFM (`| a | b |`). Ver `parseTable`/`buildTable` para editarla por celdas. */
export interface TableBlock extends BlockMeta {
  type: 'table';
  md: string;
}

/** Bloque de código con valla (```lang). */
export interface CodeBlock extends BlockMeta {
  type: 'code';
  lang: string;
  /** Resto de la línea de apertura tras el lenguaje (p. ej. `title="x.ts"`). */
  meta: string;
  code: string;
}

/** `<Kicker>Quiero hacer… · Clientes</Kicker>` */
export interface KickerBlock extends BlockMeta {
  type: 'kicker';
  text: string;
}

/** `<Lead>Una frase…</Lead>` */
export interface LeadBlock extends BlockMeta {
  type: 'lead';
  text: string;
}

/** `---` */
export interface DividerBlock extends BlockMeta {
  type: 'divider';
}

/** `<Tour id="slug" />`. El campo se llama `slug` porque `id` es el id del bloque. */
export interface TourBlock extends BlockMeta {
  type: 'tour';
  /** Slug del tour (atributo `id` de `<Tour>`). */
  slug: string;
}

/** `<SearchTerms terms="…" />` (términos para el buscador; no se ve en la página). */
export interface SearchTermsBlock extends BlockMeta {
  type: 'searchTerms';
  terms: string;
}

/** Lo que el motor no reconoce: se conserva tal cual y se edita como código. */
export interface RawBlock extends BlockMeta {
  type: 'raw';
  code: string;
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | ImageBlock
  | ImageRowBlock
  | StepsBlock
  | CalloutBlock
  | CardsBlock
  | TableBlock
  | CodeBlock
  | KickerBlock
  | LeadBlock
  | DividerBlock
  | TourBlock
  | SearchTermsBlock
  | RawBlock;

export type BlockType = Block['type'];

/** Bloque de un tipo concreto. */
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export type MetaKey = keyof BlockMeta;

/** Campos de contenido de un tipo de bloque (sin los metadatos ni `type`). */
export type BlockData<T extends BlockType> = Omit<BlockOf<T>, MetaKey | 'type'>;

/** Cambios aceptados por `updateBlock` para un tipo de bloque. */
export type BlockPatch<T extends BlockType> = Partial<BlockData<T>>;

/** Entrada del esquema "En esta página". */
export interface OutlineItem {
  /** Bloque que contiene el encabezado. */
  blockId: string;
  /** Posición del bloque en la lista. */
  index: number;
  level: HeadingLevel;
  /** Texto Markdown del encabezado. */
  text: string;
  /** Texto legible (sin Markdown ni etiquetas). */
  label: string;
  /** Ancla que genera el manual (`#slug`), con sufijo `-1`, `-2` si se repite. */
  slug: string;
  /** true si el encabezado está dentro de un bloque `raw`. */
  inRaw: boolean;
}

export interface ParseOptions {
  /** Generador de ids (por defecto, uno propio con prefijo aleatorio). */
  makeId?: () => string;
}

export interface SerializeOptions {
  /** Fin de línea para los bloques regenerados. Por defecto, el del documento analizado o `\n`. */
  eol?: Eol;
}
