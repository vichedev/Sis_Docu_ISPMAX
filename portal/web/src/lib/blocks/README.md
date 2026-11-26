# Motor de bloques (`src/lib/blocks`)

Convierte el cuerpo MDX de una página del manual (lo que va después del frontmatter, igual que `body` en
`/api/pages/:id`) en una lista de bloques editables, y la lista de vuelta en MDX con la sintaxis de las
páginas existentes. Sin dependencias; TypeScript con sintaxis borrable (Node 24 lo ejecuta directo y Vite lo
empaqueta). Pruebas: `node --test portal/web/test/blocks.test.mjs`.

## Garantías

- **Sin pérdida:** `serializeBlocks(parseMdx(x)) === x` byte a byte para cualquier texto (CRLF/LF, sin salto
  final, vacío). Se comprueba con las 285 páginas de `docs/` (cuerpo y archivo completo).
- **Tipo solo si es exacto:** un trozo recibe un tipo únicamente si regenerarlo desde sus campos da su texto
  original. Si no, queda `raw` (se edita como código). Editar un campo nunca pierde nada que el tipo no guarde.
  En `docs/` solo 2 de 6734 bloques quedan `raw` (un comentario `{/* … */}` y una cita `>`).
- **Mínimo cambio:** un bloque no tocado se emite con su `raw`; los separadores originales (líneas en blanco)
  se conservan. Editar un título cambia solo esa línea.
- **MDX válido al regenerar:** los campos de texto pasan por `escapeMdxText` (`{` `}` sueltos → `\{` `\}`;
  `<texto>` que no es un componente del manual ni una etiqueta HTML conocida bien cerrada → `\<texto>`;
  respeta `código`, vallas y lo ya escapado). Es idempotente y no cambia ninguna página real.
- **Inmutable:** todas las funciones devuelven arrays nuevos. Los `id` son generados (no dependen del
  contenido) y se conservan al editar, mover y convertir.

## API

```ts
import { parseMdx, serializeBlocks, newBlock, insertBlock, moveBlock, removeBlock, duplicateBlock,
  updateBlock, mapBlock, convertBlock, convertTargets, reparseBlock, outline, parseTable, buildTable,
  insertItem, removeItem, moveItem, replaceItem, imageFromAsset, escapeMdxText, BLOCK_TYPES } from '@/lib/blocks/index.ts';

let blocks = parseMdx(page.body);                       // Block[]
blocks = updateBlock(blocks, id, { text: 'Requisitos' }); // marca dirty; sin cambio real devuelve igual
blocks = insertBlock(blocks, index, newBlock('callout', { kind: 'warning', md: 'Cuidado.' }));
blocks = moveBlock(blocks, id, toIndex);                // toIndex = posición final en el resultado
blocks = duplicateBlock(blocks, id);                    // copia justo después, id nuevo
blocks = removeBlock(blocks, id);
blocks = convertBlock(blocks, id, 'callout');           // solo destinos de convertTargets(block)
blocks = reparseBlock(blocks, rawId);                   // tras editar un raw como código
const body = serializeBlocks(blocks);                   // → PUT /api/pages/:id { body }
```

| Función | Qué hace |
|---|---|
| `parseMdx(body, {makeId?})` | Divide en bloques (divisor propio por líneas; respeta `:::`, `<Steps>`, `<Cards>`, `<FigRow>`, vallas y JSX multilínea). |
| `serializeBlocks(blocks, {eol?})` | MDX. Fin de línea del documento original (o `eol`). |
| `blockText(block)` / `renderBlock(block)` | MDX de un bloque (`raw` si no se editó) / regenerado desde sus campos (LF). |
| `newBlock(type, init?)` | Bloque nuevo con valores por defecto válidos (ver tabla). `dirty: true`. |
| `insertBlock` `removeBlock` `moveBlock` `duplicateBlock` | Estructura. `removeBlock` pasa el blanco inicial del documento al nuevo primero. |
| `updateBlock(blocks, id, patch)` | Cambia campos de contenido (ignora `id`, `type`, `raw`…). |
| `mapBlock(blocks, id, fn)` | Sustituye con `fn(block)` conservando id y metadatos. |
| `convertTargets(block)` / `convertBlock(blocks, id, type)` | Conversión que conserva el texto (párrafo → aviso, lista ↔ pasos, imagen → fila…). Añade línea en blanco con los vecinos. |
| `reparseBlock(blocks, id)` | Vuelve a analizar un `raw` y lo sustituye por los bloques que salgan. |
| `insertItem` `removeItem` `moveItem` `replaceItem` | Arrays internos (pasos, tarjetas, imágenes, elementos de lista). |
| `outline(blocks, {minLevel?, maxLevel?})` | Encabezados `{blockId,index,level,text,label,slug,inRaw}` para "En esta página" (el manual muestra 2-3). `slug` = ancla de `docs-check` con `-1`, `-2` si se repite. |
| `parseTable(md)` / `buildTable(t)` | Tabla GFM ↔ `{header, align, rows}` (estilo `\| a \| b \|` y `\|---\|---\|`; `\|` y saltos de línea en celdas se escapan / pasan a `<br/>`). |
| `imageFromAsset({path,width,height,alt?,caption?})` | Datos de `<Figure>` para una imagen de la galería: `src=/assets/<path>`, `max` = ancho si ≤ 1100 px, si no `1100px` (convención del manual). |
| `escapeMdxText(text)` | El escape que se aplica al regenerar; útil para avisar en vivo (`escapeMdxText(x) !== x`). |
| `BLOCK_TYPES` / `BLOCK_LABELS` | Catálogo para los menús "+" y "/": `{type,label,hint,keywords,insertable}`. |
| `CALLOUT_TITLES` | Título habitual por tipo de aviso: Nota, Información, Importante, Advertencia, Pregunta… |

## Metadatos de cada bloque

`id` (estable), `type`, `raw` (texto original exacto sin el salto final), `dirty`, `sep` (salto final y
líneas en blanco que lo siguen), `pre` (blanco al principio del documento; lo lleva un solo bloque y se emite
al inicio aunque ese bloque se mueva), `nextId` (interno: vecino original; permite conservar separadores sin
línea en blanco mientras dos bloques sigan juntos), `eol`.

## Tipos de bloque y MDX que producen

| Tipo | Campos | MDX generado |
|---|---|---|
| `heading` | `level` 1-6, `text` | `## Antes de empezar` |
| `paragraph` | `md` | `Pulse **Guardar**.` (varias líneas tal cual) |
| `list` | `ordered`, `start`, `marker` (`-` `*` `+` / `.` `)`), `loose`, `items[]` | `- uno`<br>`- dos`<br>`  continuación` · `1. a`<br>`2. b` |
| `image` | `src`, `alt`, `caption`, `width`, `height`, `max`, `variant` | `<Figure src="/assets/imgs/x/01-a.webp" alt="…" caption="…" width={800} height={400} max="600px" />` (los vacíos se omiten; con `"` dentro: `caption={"…"}`) |
| `imageRow` | `kind` `row`\|`grid`, `images[]` | `<FigRow>` (o `<FigGrid>`) + una `<Figure … />` por línea + `</FigRow>` |
| `steps` | `steps[{title, md}]` | `<Steps>`<br>`<Step>`<br><br>`Abra **Clientes**.`<br><br>`</Step>`<br>`</Steps>`; `title` (opcional) se escribe como `**Título**` en la primera línea del paso. Ninguna página actual lo usa. |
| `callout` | `kind` `tip`\|`info`\|`warning`\|`danger`\|`details`\|`note`\|`caution`, `title`, `md`, `padded` | `:::warning Importante`<br><br>`Texto.`<br><br>`:::` (`padded: false` → sin las líneas en blanco interiores). `details` = pregunta desplegable de `preguntas/`. |
| `cards` | `columns` (o `null`), `cards[{title, href, icon, md}]` | `<Cards columns={3}>`<br>`<Card icon="🚀" title="…" href="/guia/…">`<br><br>`Texto.`<br><br>`</Card>`<br>`</Cards>` |
| `table` | `md` | tabla GFM tal cual (editar por celdas con `parseTable`/`buildTable`) |
| `code` | `lang`, `meta`, `code` | ```` ```bash ```` … (la valla crece si el código contiene ```` ``` ````) |
| `kicker` | `text` | `<Kicker>Quiero hacer… · Clientes</Kicker>` |
| `lead` | `text` | `<Lead>Una frase: qué se logra y cuándo se usa.</Lead>` |
| `divider` | — | `---` |
| `tour` | `slug` | `<Tour id="crear-cliente" />` |
| `searchTerms` | `terms` | `<SearchTerms terms="cortar servicio suspender" />` |
| `raw` | `code` | el código tal cual |

Valores por defecto de `newBlock`: título `## Título de la sección`; aviso `:::tip Nota` con línea en blanco
interior (el estilo más frecuente: 526 de los 750 avisos de `docs/`); con `{kind:'warning'}` el título pasa a `Importante`, `danger` →
`Advertencia`; tarjetas a 2 columnas; tabla de 2 columnas; `tour.slug` y `image.src` vacíos (la interfaz debe
pedirlos: `<Tour id="" />` compila pero el validador del portal lo rechaza).

Diferencias con la Adenda 2 del contrato: `tour` guarda el slug en `slug` (no `id`, que es el id del bloque);
`callout` añade `padded` y los tipos `details`, `note`, `caution`; `list` añade `start`, `marker`, `loose`;
`cards` añade `columns` y cada tarjeta `icon`; `code` añade `meta`; tipo extra `searchTerms` (279 páginas).

## Contenido anidado

`md` de pasos, tarjetas y avisos es Markdown con bloques dentro (figuras, listas, avisos). Para editarlo por
bloques: `const inner = parseMdx(step.md)` … `updateBlock(blocks, id, { steps: replaceItem(b.steps, i, { ...step, md: serializeBlocks(inner) }) })`
(la ida y vuelta interior también es exacta).

## Limitaciones

- Un trozo que no siga el estilo exacto del manual (Figure en varias líneas, lista con separación mixta,
  numeración `1. 1. 1.`, `<Callout>` componente, comentarios, citas, HTML) queda `raw`: correcto pero se edita como código.
- Los `id` duran lo que la sesión: al recargar la página se generan otros (no se guardan en el MDX).
- El escape es heurístico (como `validate` del servidor): no valida JSX profundo; la validación final sigue
  siendo `POST /api/pages/validate`.
- Encabezados Setext (`Título\n===`) quedan dentro del párrafo y no salen en `outline` (no hay en `docs/`).
