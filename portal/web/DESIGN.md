# Diseño del portal (portal/web)

Guía corta para quien añada pantallas (p. ej. el constructor por bloques). Todo se compone con la
librería de `src/components/ui`; ninguna pantalla define estilos propios repetidos.

## Principios

- **Herramienta sobria, no plantilla.** Jerarquía por tipografía, espacio y líneas de 1 px. Sin degradados,
  sin cristal, sin sombras salvo en capas flotantes (menús, diálogos, avisos), sin emojis como iconos.
- **Violeta ISPMAX con contención**: solo acción principal (una por zona), foco, selección y la pestaña activa.
  El **cian** solo marca «trabajo en curso» (punto que late en `StatusBadge status="running"`).
- **Una acción principal por zona** (`variant="primary"`); el resto `secondary` o `ghost`.
- **Confirmación solo para lo destructivo** (`ConfirmDialog`); lo reversible se hace y se ofrece «Deshacer» en el toast.
- **Estados siempre resueltos**: carga (`Spinner`/`SkeletonRows`), vacío útil con una acción (`EmptyState`), error con «Reintentar» (`ErrorState`).
- Español, frases cortas, verbo en infinitivo en botones («Crear página», «Publicar ahora»).

## Pila

Tailwind CSS v4 (`@tailwindcss/vite`, configuración CSS-first en `src/index.css`) · primitivas Radix (`radix-ui`) ·
`class-variance-authority` + `clsx` + `tailwind-merge` (`cn` en `src/lib/cn.ts`) · `lucide-react` (trazo 1,75) ·
`@dnd-kit/*` · fuentes empaquetadas `@fontsource-variable/ibm-plex-sans` (interfaz) y `jetbrains-mono` (código).

## Tokens (`src/index.css`)

Variables semánticas en `:root` y `[data-theme='dark']`, expuestas por `@theme inline` como utilidades. La paleta por
defecto de Tailwind está **desactivada** (`--color-*: initial`): solo existen estos colores.

| Utilidad | Uso |
|---|---|
| `bg-bg` · `bg-side` · `bg-subtle` · `bg-muted` · `bg-raised` | lienzo · barras laterales · cabeceras de tabla/código/hover · pulsado/selección neutra · menús y diálogos |
| `border-line` · `border-line-strong` | bordes de 1 px (superficies) · bordes de controles |
| `text-ink` · `text-ink-2` · `text-ink-3` · `text-ink-4` | texto · secundario · apagado (AA) · solo decorativo (asas, separadores) |
| `bg-accent` · `hover:bg-accent-hover` · `text-accent-fg` | botón principal |
| `bg-accent-soft` · `border-accent-line` · `text-accent-ink` | selección (fila activa, opción elegida), enlaces |
| `ring-ring` · `outline-accent` | foco (anillo de 3 px en campos; contorno de 2 px en el resto) |
| `text-ok`/`bg-ok-soft` · `text-warn`/`bg-warn-soft`/`bg-warn-dot` · `text-danger`/`bg-danger-soft` | estados |
| `bg-signal` | cian: solo «en curso» |
| `shadow-pop` · `bg-scrim` | capas flotantes · velo de diálogos |

Tipografía: `text-xs` 12 · `text-sm` 13 · `text-base` 14 (cuerpo) · `text-lg` 16 · `text-xl` 19 · `text-2xl` 22 (título de pantalla).
Radios: `rounded-sm` 4 (etiquetas) · `rounded-md` 6 (controles) · `rounded-lg` 8 (paneles, diálogos).
Animaciones: `animate-fade-in`, `animate-fade` (diálogos), `animate-flash`; `prefers-reduced-motion` las anula globalmente.
Tema: `useTheme()` (`src/lib/theme.ts`) escribe `data-theme` en `<html>`; usar la variante `dark:` solo si un token no basta.
Contraste comprobado (AA, ≥ 4,5:1): `ink-3` sobre `bg` 5,5 · `side` 5,1 · `muted` 4,7 (oscuro: 6,0 · 6,2 · 4,9); botón principal 6,1 (claro) y 4,9 (oscuro);
selección `accent-ink` sobre `accent-soft` 6,8/6,9; avisos y errores ≥ 5,4.

## Componentes (`src/components/ui`, importar de `@/components/ui`)

| Componente | Props clave / variantes |
|---|---|
| `Button` | `variant`: primary · secondary · ghost · danger · danger-ghost · link; `size`: sm · md · lg · icon · icon-sm; `asChild` (para `<a>`) |
| `IconButton` | `label` (obligatorio: nombre accesible + tooltip), `icon`, `shortcut` |
| `Input` · `Textarea` · `SearchInput` | `size` sm/md, `mono`; `Textarea code`; `SearchInput onValueChange` |
| `Select` | `options` o `groups`, `value` (nunca `''`: usar p. ej. `'all'`), `aria-label` o `id` + `Label` |
| `Checkbox` · `Switch` | `checked`, `onCheckedChange`, `label`, `description` |
| `Field` · `Label` · `HelpText` · `FieldStack` · `FieldRow` | `Field label help error optional` con hijo-función `(id, describedBy) => control` |
| `Badge` · `StatusBadge` · `Tag` | `Badge tone` neutral/accent/ok/warn/danger + `dot`; `StatusBadge status` published/draft/ok/running/error |
| `Card` · `Panel` · `List`/`ListItem` · `DescriptionList` | `Panel title description actions flush`; `DescriptionList items stacked` |
| `Table` · `THead` · `TBody` · `TR` · `TH` · `TD` · `useSort` · `Pager` | `TH sort onSort hide narrow`; `TD hide narrow numeric muted`; `TR onClick` (fila navegable) |
| `Tabs` · `TabsList` · `TabsTrigger` · `TabsContent` · `SegmentedControl` | pestañas con subrayado violeta; segmentado para 2-4 opciones |
| `Dialog` · `ConfirmDialog` · `Sheet` | `size` sm/md/lg/xl, `footer`, `position="top"`; `ConfirmDialog danger requireText="RESTAURAR"`; `Sheet side` (móvil) |
| `DropdownMenu` · `Popover` · `Tooltip` | `items` con `{label, icon, onSelect, href, danger, shortcut}`, `{separator}`, `{radio}`; `open/onOpenChange` controlables |
| `useToast` / `ToastProvider` | `toast(texto, tipo, {label:'Deshacer', run})` con tipo ok, error o info |
| `Spinner` · `Skeleton` · `SkeletonRows` · `EmptyState` · `Callout` · `ErrorState` · `Kbd` · `Avatar` | estados y piezas menores |
| `PageHeader` · `Breadcrumbs` | cabecera de pantalla (usar a través de `Page`) y migas |
| `CommandPalette` | Ctrl+K global (montada en `AppShell`; `commands` con `group`, `keywords`) |
| `CodeBlock` · `LogViewer` · `CopyButton` | fragmentos copiables, registro con autodesplazamiento |
| `Stepper` | `steps: [{label, state: todo/active/done/fail, detail}]` |
| `FileDropzone` | `accept`, `multiple`, `files`, `onFiles`, `hint` |
| `ImagePicker` · `AssetTile` · `AssetGrid` | diálogo para elegir una imagen existente (buscador, carpetas, miniaturas) → `onSelect(asset)` |
| `RegionSelector` | `src`, `value {x,y,w,h}` en % (0-100), `onChange`; ratón y teclado (flechas, Alt+flechas, Supr) |
| `Prose` | tipografía de lectura para `renderPreview(mdx)` (`src/lib/mdx.ts`) |
| Kit de editor: `DragHandle` · `Toolbar`/`ToolbarButton`/`ToolbarSeparator` · `FloatingToolbar` · `InsertLine` · `CommandList` · `SlashMenu` | asa de arrastre, barra accesible, barra flotante anclada a un `DOMRect`, «+» entre bloques, lista filtrable y menú «/» |

Arrastrar y soltar (`src/components/dnd`): `useDndSensors()` (ratón con umbral + teclado), `announcements()` en español,
`SortableList` (lista plana; el asa recibe `handle`) y utilidades de árbol `flattenTree`, `getProjection`, `applyMove`,
`buildTree`, `removeChildrenOf`, `moveSibling`, `indent`, `outdent` (árbol de páginas hasta 3 niveles; sirven para bloques anidados).

Diseño de pantalla (`src/components/layout`): `AppShell` (navegación, barra superior con el estado del manual y Borradores, menú de usuario,
paleta, recorrido) · `Page title description actions width` (marco común, ver «Marcos de página») · `pageFrame(width)` (mismas clases para pantallas sin `Page`) · `useBreadcrumbs(items)` · `SaveBar`.

### Marcos de página

Todas las pantallas de administración van **centradas con márgenes simétricos** y el mismo relleno lateral (32 px; 16 px en móvil); la cabecera
(título, descripción, acciones) va dentro del marco, alineada con el contenido. Nunca contenido pegado a la izquierda con vacío a la derecha.

| `width` | Máximo | Pantallas |
|---|---|---|
| `narrow` | 1040 px | formularios, ajustes y árboles: Ajustes, Estructura, «Sin permiso» y «No encontrada» |
| `default` | 1240 px | listas y paneles: Borradores, Manual publicado, Respaldos, Usuarios, Tours |
| `wide` | 1440 px | tablas anchas, imágenes y auditoría: Todas las páginas, Imágenes, Auditoría |
| `centered` | 1440 px | Inicio (igual que `wide`; se conserva el nombre) |
| `pageFrame('full')` / editor de tours | 1680 px | editor de tours (tres columnas) |

El espacio de Contenido (árbol + editor + panel) no usa marco: ocupa todo el ancho. Comprobado a 1920, 1440, 1024 y 390 px, con el menú lateral
expandido y contraído, en claro y oscuro (márgenes izquierdo y derecho iguales, sin desplazamiento horizontal).

## Reglas de composición

1. Cada pantalla: `<Page title description actions>` + `Panel`/`Table`/`EmptyState`. El espacio de contenido es la excepción (tres columnas).
2. Listas de registros → `Table` (densa); nunca rejillas de tarjetas iguales. Las únicas rejillas son de imágenes (`AssetGrid`).
3. Formularios → `FieldStack` de `Field`; ayuda visible bajo el campo, error en el mismo sitio.
4. Acciones por fila → `DropdownMenu` con `IconButton` «…»; acciones destructivas al final, tras un separador, con `danger`.
5. Clases nuevas solo con tokens (`bg-subtle`, `text-ink-3`…); nada de hex sueltos. Si algo se repite dos veces, va a `components/ui`.
6. Accesibilidad: todo control con nombre (`label`/`aria-label`), foco visible (lo da la base), teclado en menús/árbol/paleta,
   `aria-live` en estados que cambian. Probar a 390 px: la navegación pasa a un panel lateral y las tablas ocultan columnas con `hide`.

## Carpetas

```text
src/
  index.css            Tailwind + tokens + base mínima
  App.tsx · main.tsx   sesión y enrutado
  routes/index.ts      rutas hash y menú (NAV)
  lib/                 api, cn, hooks (useAsync, useJob, useUnsavedChanges, useHotkeys, useLocalStorage, useMediaQuery…),
                       auth (sesión, roles, estadísticas), theme, util, assets, mdx (vista previa y esquema)
                       blocks/ → motor de bloques (otro agente; no tocar desde aquí)
  components/ui/       librería (25 archivos, 70 componentes exportados)
  components/dnd/      arrastrar y soltar reutilizable
  components/layout/   AppShell, AppSidebar, Page
  features/<área>/     pantallas: auth, dashboard, pages, editor, structure, images, drafts, system (manual publicado, actualización e información del sistema), backups, settings, users, audit, onboarding
```

## Tours (`src/features/tours`)

Editor visual de recorridos guiados sobre capturas. Ruta `#/tours` (lista) y `#/tours/:id` (editor); API en `src/lib/api.tours.ts` (`toursApi`).

| Archivo | Qué hace |
|---|---|
| `tourModel.ts` | Lógica pura sin imports (probada con `node --test test/tours.test.mjs`): tipos, `validateTour` (las mismas reglas que la API al publicar, con paso y motivo), `splitBold`, `slugify`, `move`, `freeSlug`, `signature` |
| `ToursPage.tsx` | Tabla con búsqueda y filtro (Todos · Publicados · Borradores · Eliminados). Menú por fila: abrir, copiar `<Tour id="…" />`, duplicar, publicar/despublicar, eliminar con «Deshacer» (y «Recuperar» en Eliminados). Estado vacío con los tres pasos |
| `NewTourDialog.tsx` | Asistente: título + identificador (autogenerado, editable, fijo después) → crea borrador y abre el editor |
| `TourEditor.tsx` | Cabecera (título, descripción, estado, Probar, Guardar `Ctrl+S`, Publicar/Despublicar), `StepList` · captura con `RegionSelector` · formulario del paso (título, texto con **negrita** `Ctrl+B`, alt, enlace con `PagePicker`) |
| `StepList.tsx` | Pasos con miniatura y recuadro; `SortableList` (asa de arrastre y teclado), duplicar y eliminar paso (con «Deshacer» local) |
| `StepPanels.tsx` | Piezas compartidas con el editor de bloques: `useTourSteps`, `StepStage`, `StepForm` (incluye `PagePicker`), `FirstStepGuide` |
| `TourPlayer.tsx` | «Probar tour» a pantalla completa: mismo comportamiento que `src/components/Tour.tsx` (recuadro resaltado, «Paso n de N», Anterior/Siguiente, ←/→/Inicio/Fin); aquí `Esc` cierra la vista previa |

Reglas de diseño: un paso nace con captura (galería o subida a `imgs/tours/`); sin captura la API lo rechaza. Se guarda también como borrador incompleto;
**Publicar** valida antes (≥1 paso, título, texto, recuadro dentro de 0-100, imagen existente) y lista los pasos que fallan (panel ámbar, punto ámbar en el paso, clic para ir a él).
Conflicto 409: diálogo con «Seguir editando», «Recargar y descartar lo mío» y «Guardar el mío encima». Cambios sin guardar: aviso al salir (`useUnsavedChanges`).
Maquetación: tres columnas desde 1500 px; por debajo, el formulario pasa bajo la captura para que esta ocupe el ancho (el recuadro se dibuja con precisión). En móvil todo se apila.
Recorrido propio de 4 pasos con `Coach` la primera vez (`portal-coach-tours-v1`); no sale mientras esté pendiente el recorrido general (`portal-coach-v2`). Se repite con el botón «?» de la cabecera.
Lector (`viewer`): todo en solo lectura, sin Guardar/Publicar/Nuevo.

## Editor de bloques (`src/features/editor`)

Lienzo que se ve como la página del manual y se edita en el sitio. Pestañas del editor de página: **Bloques** | Código MDX | Vista previa | Revisiones.
El cuerpo MDX (`form.body`) es la única fuente: el lienzo lo analiza con `parseMdx` y emite `docText(bloques)`; solo se regenera el bloque tocado.

| Archivo | Qué hace |
|---|---|
| `BlockEditor.tsx` | Estado e historial (Ctrl+Z / Ctrl+Y, también botones), sincronía con el texto (al volver de Código MDX reanaliza y lo apila en el historial), pegar/soltar imágenes, `ref.focusLine`, garantía de no destrucción (si `serializeBlocks(parseMdx(body)) !== body`, lienzo en solo lectura con aviso y `onSafety(false)`). `BlockPreview`: lo mismo en solo lectura (pestaña Vista previa) |
| `model/*.ts` | Lógica pura probada con `node --test test/editor.test.mjs`: `history` (instantáneas; el tecleo seguido en un campo se funde en una entrada), `doc` (`docText` omite bloques nuevos vacíos, `blockLines`/`blockAtLine` para validación y esquema, `roundTripOk`, `INSERT_COMMANDS`), `text` (formato de la selección, «/»), `inline` (Markdown en línea → nodos) |
| `blocks/BlockList.tsx` | Lista (también anidada en pasos y avisos: `NestedBlocks`): «+» entre bloques, asa de arrastre (dnd-kit, `moveBlock`), barra del bloque activo (convertir a…, ajustes, **B** *I* `código` enlace, subir/bajar, duplicar, eliminar con «Deshacer»), Alt+↑/↓, Ctrl+Mayús+D |
| `blocks/RichText.tsx` | Campo de texto: vista formateada → área autoajustable al hacer clic o Tab. Intro crea el bloque siguiente (Mayús+Intro, salto de línea), Retroceso en vacío lo borra, flechas en los extremos saltan de bloque, «/» en un párrafo vacío abre el menú |
| `blocks/bodies.tsx` · `items.tsx` · `media.tsx` | Cada tipo: título, texto, lista, antetítulo, entradilla, divisor, términos, código, MDX, tabla por celdas · pasos (el número es el asa), tarjetas, avisos · imagen (galería, subida, alt, pie, ancho), fila/cuadrícula; el tour está en `tour/TourBody.tsx` |
| `palette/BlockPalette.tsx` · `palette/Thumbs.tsx` | Paleta de bloques (ver abajo) |
| `tour/*` | Tour desde una imagen: `TourStudio`, `TourBody`, `TourPreview`, `TourPicker`, `fromImages`, `tourData` (ver abajo) |
| `blocks/settings.tsx` · `commands.tsx` · `styles.ts` | Ajustes por tipo en la barra · iconos y menú «+»/«/» · tipografía aproximada a `styles/index.css` del manual |

Reglas: el foco pasa al bloque nuevo de forma síncrona (`flushSync`) para que las teclas tras Intro no caigan en el anterior; los controles de ítems
se ven al pasar el ratón (en móvil, solo en el bloque activo); los títulos de aviso y de paso son campos secundarios (al enfocar un bloque se prefiere su texto).
Guardar sin cambios no hace nada; `grupo`/`orden` solo se envían si cambiaron (el servidor rechaza `grupo: null` y los escribe en el frontmatter).
`docText` tampoco escribe los huecos nuevos sin rellenar (imagen sin elegir, fila vacía, tour sin elegir); lo que ya venía en el MDX se conserva tal cual.

### Paleta de bloques (`palette/`, `model/palette.ts`)

Panel derecho del editor de página con dos pestañas: **Añadir bloque** (paleta, solo editores y con el lienzo editable) y **En esta página**
(esquema y propiedades, como antes). Se abre también con el botón «Añadir bloque» de la barra de la página; por debajo de 1280 px va en un `Sheet`.
La pestaña elegida se recuerda (`portal-editor-side`).

- Fichas en cinco categorías (`PALETTE_GROUPS`): **Texto** (título, subtítulo, párrafo, lista, lista numerada, entradilla, antetítulo) · **Medios**
  (imagen, fila, cuadrícula, tour guiado) · **Estructura** (pasos, tarjetas, tabla, divisor) · **Destacados** (importante, nota o consejo, información,
  advertencia, desplegable) · **Avanzado** (código, términos de búsqueda, MDX libre). Cada ficha: miniatura esquemática (`Thumbs.tsx`, solo tokens),
  icono y nombre corto; la descripción va en `title` y en texto para lectores de pantalla.
- **Clic** inserta tras el bloque seleccionado (el de primer nivel que lo contiene) o al final; un párrafo vacío seleccionado se sustituye. La línea
  «Clic: se inserta después de …» dice dónde. El bloque nuevo queda seleccionado, enfocado y resaltado; imagen y fila abren la galería y tour abre
  la lista de tours. Desde otra pestaña (Código MDX…) primero vuelve al lienzo para no trabajar sobre texto viejo.
- **Arrastrar** una ficha al lienzo (arrastre nativo con el tipo `BLOCK_MIME`; dnd-kit sigue moviendo los bloques por el asa): el lienzo marca el hueco
  con una línea violeta «Soltar aquí» (`dropIndex` por el punto medio de cada bloque de primer nivel) e inserta ahí. En el `Sheet` (móvil) solo clic.
- **Teclado**: ↓ desde el buscador entra en las fichas, flechas/Inicio/Fin se mueven (dos columnas), Intro o Espacio insertan; Intro en el buscador
  inserta la primera coincidencia. Buscador sin tildes ni mayúsculas (nombre, palabras clave, categoría).
- Lector: sin pestaña ni botón. Página que el lienzo no reproduce byte a byte: la paleta explica que se edita en Código MDX.
- Los avisos (`toast`) salen abajo a la derecha, encima de la paleta: insertar no muestra aviso (el bloque nuevo se resalta y Ctrl+Z deshace).

### Tour desde una imagen (`tour/`)

- Con un bloque **imagen** seleccionado, su barra muestra **«Crear tour con esta imagen»**; en una **fila/cuadrícula**, «Crear tour con estas imágenes»
  (todas, en orden) y un botón por imagen. Solo imágenes de la galería del portal (`tourImagePath`).
- `TourStudio.tsx`: diálogo a pantalla completa que reutiliza `StepList`, `TourPlayer` y las piezas extraídas de `features/tours/StepPanels.tsx`
  (`useTourSteps`, `StepStage` con `RegionSelector`, `StepForm`, `FirstStepGuide`; `TourEditor` usa las mismas). Título obligatorio; el identificador se
  genera del título y se muestra el que tendrá (primer libre de `slugCandidates`: `crear-cliente`, `crear-cliente-2`…; si choca con uno eliminado, el
  servidor responde 409 y se prueba el siguiente). Pie con el estado en vivo («Listo para publicar» / «Faltan N puntos…», clic lleva al paso).
- **Guardar y añadir al manual**: `POST /api/tours` + `PUT` con los pasos y `status: published` si `validateTour` no encuentra problemas; si los hay,
  queda en **borrador** (botón «Guardar borrador y añadir») y el aviso dice qué falta. Después inserta `<Tour id="…" />` **justo debajo** de la imagen
  (o de la fila) en la misma lista, lo selecciona y lo resalta. La página queda «Sin guardar»: el aviso recuerda guardarla.
- **Bloque tour** (`TourBody.tsx`): vista previa gráfica (`TourPreview`: captura con el recuadro y el resto atenuado, «Paso n de N», título, texto y
  Anterior/Siguiente), **Editar tour** (abre `TourStudio` con los datos del tour; un tour publicado no se guarda incompleto), **Probar** (`TourPlayer`)
  y **Cambiar** (`TourPicker`: todos los tours, borradores marcados, «Crear un tour nuevo»). Borrador o identificador inexistente: aviso ámbar en el bloque.
- Estados: 409 → «Seguir editando / Recargar y descartar lo mío / Guardar el mío encima»; Esc o cerrar con cambios → confirmar descarte; galería vacía o
  sin coincidencias → estado vacío del `ImagePicker` y subida; recuadro fuera de 0-100 → lo marca `validateTour` (el `RegionSelector` no deja salir).
  Ctrl+S dentro del diálogo guarda el tour, no la página. Lector: ve la vista previa y «Probar», sin crear ni editar.
- `tourData.ts`: caché de `GET /api/tours` (todos los no eliminados) y del detalle por identificador; `refreshTours()` tras guardar avisa a todos los bloques.

## Menú del panel (IA)

| Grupo | Pantallas (en este orden) | Rol mínimo |
|---|---|---|
| — | Inicio `#/` | lector |
| Contenido | Páginas `#/contenido` · Estructura `#/estructura` · Imágenes `#/imagenes` · Tours `#/tours` | lector |
| Publicación | Borradores `#/borradores` · **Manual publicado** `#/manual` · Respaldos `#/respaldos` (admin) | lector |
| Administración | Usuarios `#/usuarios` · Auditoría `#/auditoria` · **Ajustes** `#/ajustes/:seccion` | admin |

Rutas en `src/routes/index.ts` (`NAV`, `parseRoute`); la lógica pura en `src/routes/paths.ts` (`SETTINGS_SECTIONS`, `settingsSection`, `legacyRedirect`;
probada con `node --test test/settings.test.mjs`). Direcciones antiguas: `#/sistema` y `#/publicar` → `#/ajustes/sistema` (quien no administra → `#/manual`);
`#/ajustes` o una sección desconocida → `#/ajustes/general`. `App.tsx` las sustituye con `location.replace` (sin entrada en el historial).
La paleta Ctrl+K añade «Actualizar el sistema» e «Información del sistema» (admin) y «Actualizar el manual ahora» (en vivo: «Vaciar la caché del manual»); el chip del manual enlaza a «Manual publicado».

## Modo en vivo del manual (`mode: 'dynamic'`)

El servidor dibuja el manual desde la base de datos: **guardar = ya está visible**. No hay reconstrucciones, trabajos de actualización ni esperas.
`GET /api/site/status` trae `mode` (`dynamic` | `static`), `state` (`live` | `error` en vivo; `idle` | `pending` | `building` | `error` en estático), `cache {pages, compiled, htmlCached, bytes}`, `themeBuiltAt`, `lastChange {route, at}` y `message`.
Un servidor sin `mode` se trata como `static` (todo queda como antes). **Una sola decisión: `isLive(status)`** (`src/lib/siteModel.ts`, lógica pura con pruebas en `test/live.test.mjs`, junto a `liveOk`, `fmtBytes` y los textos de los toasts). No comparar `mode` a mano.

| Pieza | En vivo |
|---|---|
| `SiteProvider` | sondeo cada 25 s (sin ráfagas tras guardar; basta una consulta). No hay toast de «se actualizó» |
| `SiteChip` | «Manual en vivo» (verde). Popover: «Los cambios se publican al instante. No hay reconstrucciones», páginas en caché, último cambio (enlace a la ruta), **Ver el manual**, **Vaciar caché** (editor+; `POST /api/site/rebuild` → `{ok, cleared}`, sin `jobId`). `state: 'error'` → «Manual con problemas» con `message` |
| Manual publicado (`SitePage.tsx` → `LiveSitePage`) | estado, páginas publicadas y borradores, último cambio, caché (compiladas y tamaño), diseño compilado (`themeBuiltAt`), dirección y vista previa. Sin registro ni historial de construcciones |
| Toasts | guardar publicada: «Guardado · ya está visible en el manual»; publicar: «Publicada · ya está en el manual» con acción **Ver** (abre la ruta); borradores en lote: «… · ya están en el manual» |
| Ajustes › Actualización del manual | explicación («El manual se sirve en vivo; no hay nada que programar»); `auto_publish*` no llegan y no se muestran |
| Inicio / Pendientes | sin «cambios pendientes», «sin generar» ni «automático apagado»; solo `error` (falta el diseño compilado) con `message` |
| Actualizar el sistema | el diálogo dice que se trae el código y se recompila el diseño del manual (rápido, sin tocar el contenido); pasos, registro y reinicio no cambian |
| Recorrido | el paso «El estado del manual» describe el modo en vivo |

## Sitio, borradores y manual publicado (Adenda 3: guardar = en vivo, publicar = solo lo nuevo, Git = solo código)

API en `src/lib/api.site.ts` (`siteApi`, `problemsOf`, `parseUpdateResult`); no hay en la interfaz ninguna importación de contenido desde Git.

| Archivo | Qué hace |
|---|---|
| `features/system/site.tsx` | `SiteProvider` (en `App.tsx`) sondea `GET /api/site/status` cada ~2 s con actividad (pendiente, construyendo o 20 s tras guardar algo: escucha `CONTENT_EVENT`) y cada ~15 s en reposo; avisa con un toast al acabar una construcción. `SiteChip` (barra superior, `data-coach="site"`): «Manual al día» · «Cambios pendientes · se actualiza en Ns» · «Actualizando el manual… · Ns» · «Error al actualizar» + enlace «Ver log»; popover con motivos pendientes, última actualización, páginas, duración, **Actualizar ahora** (editor+), **Ver el manual**, **Ver log** (`JobLogDialog`) y «Más detalles en Manual publicado». `DraftsLink`: «Borradores (N)». `SiteInline`: línea del editor |
| `features/drafts/DraftsPage.tsx` | Tabla de borradores con selección múltiple, **Publicar seleccionadas** y **Publicar todas** (`publish-drafts`); los `skipped` salen con el motivo y los problemas, y el admin puede **Publicar de todos modos** (`force`). Estado vacío útil |
| `features/system/SitePage.tsx` | **Manual publicado** (`#/manual`, lector+): el manual público. Estado, última actualización, páginas, duración, dirección, borradores, cambios que esperan, error con motivo, **Actualizar ahora** (editor+), **Ver el manual**, «Ver el registro» y una línea con la actualización automática (de `/api/site/status`) con «Cambiar» → Ajustes (admin). Vista previa de la portada (`SitePreview` del Inicio; oculta en móvil) |

Editor de página (cabecera, `PageEditor.tsx`): página **publicada** → botón **Guardar** (toast «Guardado · el manual se actualiza en unos segundos») y «Pasar a borrador…» en el menú «…» (confirmación: la quita del manual).
Página **borrador** → **Publicar** (principal; guarda antes si hay cambios; 400 con `problems` → diálogo con la lista y «Publicar de todos modos» solo para admin) y «Guardar borrador» (secundario), con un aviso «Borrador: no aparece en el manual». Portadas con `generado: true` → solo lectura con el aviso «Esta portada se genera sola a partir del menú…».

## Ajustes (`src/features/settings`, solo administradores)

`#/ajustes/:seccion` con navegación interna: columna de secciones fija a la izquierda dentro del marco `narrow` (desde 42rem de ancho de contenedor,
`@container` + `@2xl`); por debajo, un `Select`. Migas «Administración › Ajustes › Sección». **Sin rutas, carpetas, comandos ni campos de Git**: los ajustes internos
(`site_url`, `site_base`, `repo_path`, `git_remote`, `git_branch`, `build_command`, `restart_mode`, `backup_dir`) los fija el despliegue; el servidor los rechaza (400) y
`groupSettings` los oculta aunque un servidor antiguo los devuelva.

| Sección | Contenido |
|---|---|
| General `general` | `site_title` y `contact_whatsapp` (validación con el mismo criterio que el servidor: 8-15 dígitos; se guarda solo con dígitos) + **Vista previa** esquemática (pestaña, cabecera, «Soporte» y pie con `wa.me/…`). Tras guardar: si el sitio queda pendiente, «el manual publicado se actualiza en unos segundos»; si no, toast con «Actualizar ahora» |
| Actualización del manual `manual` | `auto_publish` (interruptor) y `auto_publish_delay` (1-120) |
| Actualización del sistema `sistema` | `features/system/SystemUpdate.tsx`: versión instalada (commit corto, rama, asunto, fecha), novedades (`behind`), copia local, cómo se actualiza según `updateMode`; **Actualizar el sistema** con confirmación que enumera `updatePlan(mode)` (Docker `entrypoint`: «trae el código nuevo y reinicia el sistema; al volver puede tardar unos minutos instalando y compilando»); línea «Paso n/N» + `Stepper` + registro en vivo (N sale del registro: `parseSteps`/`stepLabels`), resultado de `RESULTADO:`; aviso **Falta reiniciar** con **Reiniciar** (escribir REINICIAR) y `RestartWait` (recarga sola; en Docker espera hasta 10 min antes de avisar). `canUpdate:false` → `message` y botón bloqueado; sin repositorio (`initialized:false`) → aviso «no se puede actualizar desde el panel» |
| Respaldos `respaldos` | Solo `backup_keep`; explica que los respaldos se crean y **descargan** en la pantalla Respaldos y se guardan en el volumen de datos del servidor |
| Información del sistema `info` | `features/system/SystemInfo.tsx`: `GET /api/system/info` (versión, entorno Docker/local, Node, tiempo en marcha, base de datos conectada, sitio generado y base, acceso: panel, IP, proxy, cookie). **Copiar información** (`infoText`, texto plano sin rutas ni credenciales) y «Ver el texto que se copia». Si el servidor responde 404, se arma con `/api/system/version` y `/api/site/status` y lo dice |

Cada sección editable guarda con su botón (pie con «N cambios sin guardar» / «Guardado» / «Sin cambios», «Descartar», error en un aviso). Los cambios se
conservan al pasar de una sección a otra (punto ámbar en el menú interno); salir de Ajustes con cambios pide confirmación (`useUnsavedChanges(dirty, msg, allow)`:
un único oyente de `hashchange` registrado al cargar `lib/hooks.ts`, antes que el router, para poder preguntar antes de que se desmonte la pantalla).
Lógica pura en `settingsModel.ts` y `features/system/systemModel.ts` (`node --test test/settings.test.mjs`).

## Inicio (`src/features/dashboard`)

`Page width="centered"` (máx. 1440 px, centrada, como el resto de marcos). Rejilla por **consultas de contenedor**
(`@container`): 1 columna → 2 desde 42rem (`@2xl`) → 3 desde 64rem (`@5xl`), así responde también con el menú contraído.

| Zona | Datos | Notas |
|---|---|---|
| Cabecera | `useSite`/`useSiteLabel`, `/api/stats` | Saludo según la hora y una frase de estado con punto de color («El manual está al día · N páginas publicadas · actualizado hace … · Ver el manual»). Acciones rápidas (editor+): Subir imagen · Nuevo tour (abre `NewTourDialog`) · **Crear página** (principal) |
| Indicadores (`MetricStrip`) | `/api/stats`, `/api/tours` | Una sola superficie dividida por líneas (5 celdas; 2+2+1 · 3+2 · 5). Número grande, etiqueta y contexto real (nunca tendencias inventadas); cada celda enlaza a su pantalla (Personas solo para admin) |
| Pendientes (`AttentionPanel`) | `attentionItems()` | Columna derecha, primero en el orden de lectura. Error al actualizar, manual sin generar, cambios sin llevar con el automático apagado, borradores, tours en borrador; solo admin: reinicio pendiente, `behind > 0` (de `/api/system/version?fetch=0`: no consulta el remoto) y respaldo inexistente o de más de 7 días. Vacío: «Todo en orden». Lector: avisos sin botones |
| Hueco | — | Debajo de Pendientes, para tarjetas de aviso o primeros pasos (`<Panel>`), p. ej. «Respaldo del contenido» |
| Manual publicado (`SitePanel`) | `/api/site/status` | Miniatura del sitio (`siteUrl` del servidor vía `siteHref`; «/» por defecto): `iframe` `sandbox=""` (sin scripts: solo el HTML generado), escalado con `ResizeObserver`, cargado al acercarse a la vista, sin foco ni puntero; el enlace es el contenedor. Oculta en móvil (< 640 px) para no gastar datos. La consola registra «Blocked script execution…»: es el efecto esperado del `sandbox` |
| El manual de un vistazo (`SectionsPanel`) | `/api/stats` `bySeccion` + `/api/structure` | Las 5 secciones del menú del manual en su orden (Referencia suma Conceptos); páginas, grupos con páginas, borradores y barra neutra proporcional a la mayor. Clic abre esa sección en Estructura (`portal-structure-top`). La portada va en una nota aparte |
| Continuar editando (`RecentPanel`) · Actividad reciente (`ActivityPanel`, admin) | `recentPages()` · `/api/audit` | Filas de dos líneas (título/acción + ruta en mono). Actividad sin `auth.*`; acciones sin texto en `ACTION_LABEL` se resuelven con `EXTRA_ACTION_LABEL`/`actionText`; `job:N` no se muestra. Lector: «Vistas hace poco» |

Lógica pura en `homeModel.ts` (sin imports; `node --test test/home.test.mjs`). Carga con esqueletos por zona; error de estadísticas con `ErrorState` y «Reintentar».

## Huecos preparados

- **Árbol de contenido** (`features/structure/ContentTree.tsx`): primer nivel = menú superior del manual (Guía · Quiero hacer… · Tengo un problema · Preguntas · Referencia · Soporte), en acordeón (una abierta; se recuerda en `localStorage`). Dentro, la barra lateral real: «Portada de la sección» fija, encabezados de grupo en versalitas (11 px, `tracking-[0.07em]`, `text-ink-3`) con contador, ítems con su texto/emoji (`menu`) y sangría de 14 px por nivel. «Referencia» añade el bloque «Menú desplegable» (7 enlaces, no se reordenan: salen de `rspress.config.ts`) y las barras de `/referencia` y `/conceptos`; «Soporte» es informativo (enlace externo). Cada grupo: «+» crear página, menú (renombrar, eliminar si está vacío; subir/bajar solo en la Guía); «+ Nuevo grupo» al final de cada barra (se guarda al crearlo). El orden de los grupos fuera de la Guía lo fija el servidor (como `build-nav`). Un grupo es una entidad: si se queda sin páginas sigue en el árbol con su cabecera, el recuento 0 y la nota discreta «Sin páginas…»; «Eliminar grupo» solo se habilita vacío (con páginas el ítem indica cuántas tiene) y «Renombrar grupo» llama a `PUT /api/structure/groups` (atómico; la grafía «inicio» frente a «🚀 INICIO» cuenta como el mismo grupo). Lógica pura en `features/structure/groupModel.ts`. Filtro con contexto «Sección › Grupo».
- **Subsecciones**: el árbol envía `PUT /api/structure/order` con `nodes` anidados y `pageIds` planos (compatibilidad).

## Verificar

`npm run build` (TS estricto + Vite) y `node mock/server.mjs 4391` (simulador con datos ficticios; sirve `dist/` y lee en solo
lectura las capturas de `assets/imgs` del repositorio para las miniaturas). Usuarios de prueba: `admin` / `ana` / `leo`, clave `demo1234`.

## Respaldos y paquete de contenido (`src/features/backups`)

Pantalla `#/respaldos` (solo administradores) con dos bloques en este orden: **Respaldo del contenido del manual** (portátil, recomendado: se lleva a otro servidor) y **Copia completa de la base de datos** (avanzado, `pg_dump`; incluye usuarios y sesiones, solo sirve en el mismo sistema). API en `src/lib/api.content.ts` (`contentApi`, `uploadPackage` con XHR para el progreso real de subida).

| Archivo | Qué hace |
|---|---|
| `contentModel.ts` | Lógica pura (probada con `node --test test/content-package.test.mjs`): `needsConfirm` (CARGAR solo al reemplazar con contenido), `defaultMode`, `canImport`, `fileProblem`, `importErrorText` (400/409/413 en español), `parseImportResult` (lee la línea «Importado (…)» del registro del trabajo), `countsText`, `shortHash` |
| `ContentBackupPanel.tsx` | Resumen vivo (páginas, borradores, imágenes y peso, tours), «Crear respaldo del contenido» con opción de historial, lista (fecha, quién, tamaño, conteos, huella con copiar, descargar, eliminar con confirmación), «Cargar contenido» (el archivo se elige desde el equipo) y, plegado, «Cargar por terminal» para quien despliega con Docker: `docker compose cp archivo.ispmax ispmax-manual:/var/lib/ispmax/import/` y `docker compose exec ispmax-manual npm --prefix portal run content:import -- /var/lib/ispmax/import/archivo.ispmax --yes`, con botón copiar. Ningún texto sobre carpetas del servidor |
| `ContentLoadCard.tsx` | `ContentLoader` (archivo → modo → aviso → CARGAR → barra de subida → sondeo del trabajo `GET /api/jobs/:id` → resultado) y **`ContentLoadCard`**, tarjeta autónoma para un sistema vacío (arrastrar el `.ispmax` reemplaza sin confirmación; para no administradores solo explica). Reutilizable en el Inicio: `<ContentLoadCard onDone={…} />` |

El espacio de contenido (`ContentWorkspace`) muestra `ContentLoadCard` en lugar de «Elija una página» cuando el árbol tiene 0 páginas. Con contenido existente el modo por defecto es «Añadir solo lo que falta»; «Reemplazar» exige escribir CARGAR y el servidor guarda antes un respaldo de seguridad (aparece en la lista). Al terminar se emite `contentChanged()` y el chip del sitio avisa de que el manual se actualiza.

## Base `/admin/` y enlaces al sitio

El panel se sirve en `/admin/` (Vite `base`), el manual en `/` y la API en `/api/*`. Todo enlace al sitio sale de `siteHref(ruta, siteUrl?)` (`src/lib/siteHref.ts`; base de `GET /api/site/status`) y se abre con `target="_blank" rel="noopener"`. Un 403 o 503 en `/api/auth/me` o `/api/auth/login` muestra `AccessBlockedPage` («Acceso restringido desde esta red» / «El panel está deshabilitado») en vez del login.

## Acceso y cuenta (`src/features/auth`, Adenda 5)

- **Sin rutas fijas:** el panel puede servirse desde cualquier ruta (`PORTAL_ADMIN_PATH`). El build usa `base: './'`; el servidor inyecta `<base href="…/">`
  y la API vive en `<base>api/`. Todo cliente pasa sus URL `/api/…` por `apiUrl()` (`src/lib/apiBase.ts`, `new URL('api/', document.baseURI)`; sin `<base>`: `/api/`).
  No escribir `/api` ni la ruta del panel a mano fuera de ese módulo; no mostrar la ruta del panel en pantallas ni textos. En desarrollo, Vite simula `/admin/` con `<base>` y proxy `/admin/api/*`.
- `authModel.ts` (lógica pura con pruebas en `test/auth.test.mjs`): cuenta atrás de bloqueo, política de contraseñas con medidor, códigos pegados, dispositivo legible desde el user-agent.
- `LoginPage` (usuario/contraseña → paso 2FA con `OtpInput` de 6 casillas o código de recuperación) dentro de `AuthShell` (panel de marca + formulario; una columna en móvil).
  Errores genéricos, `429` con `retryAfter` → botón deshabilitado y cuenta atrás, aviso de Bloq Mayús, `autocomplete` estándar.
- `AccountPage` (`#/cuenta`, menú de usuario): `PasswordForm` con checklist en vivo, `TwoFactorEnroll` (contraseña → QR generado en el navegador con `qrcode` + secreto copiable → códigos de recuperación una sola vez), desactivar 2FA, sesiones activas.
- `RestrictedPage`: pantalla completa sin menú cuando `/api/auth/me` trae `mustChangePassword`/`mustEnrollTwoFactor` o una respuesta `403` con `code` (`PASSWORD_CHANGE_REQUIRED` | `2FA_ENROLL_REQUIRED`, evento `RESTRICTED_EVENT`).
- Usuarios: «Restablecer 2FA…». Ajustes › Seguridad: `require_2fa_for_admins`.


## Asistente de IA (`src/features/ai`, `src/lib/api.ai.ts`)

La IA **propone** y la persona **aprueba**: nada se guarda ni se publica solo. Servidor: `portal/server/routes/ai.mjs` (ver `portal/SECURITY.md` § 9).

| Pieza | Qué hace |
|---|---|
| Botón «Asistente IA» (cabecera de `PageEditor`) | Abre `AiAssistantSheet` (Sheet derecho ancho). Deshabilitado si `GET /api/ai/status` dice `enabled:false`, con la ayuda **«Configura la clave de IA en Ajustes»** y, solo para administradores, el enlace «Abrir Ajustes» (`#/ajustes/ia`); sin revelar nada más. Aparece solo para quien puede editar |
| `AiAssistantSheet` | Texto de origen (el bloque seleccionado del lienzo, editable, o texto pegado) → acciones rápidas (Reescribir, Acortar, Expandir, Corregir redacción, Convertir en pasos) o instrucción libre → resultado con **Antes / Después** (diferencia por líneas) y avisos → **Aplicar** / **Descartar**. Aplicar reemplaza el bloque (o inserta tras el seleccionado si el texto se editó/pegó) y lanza un toast con **Deshacer** (un paso del historial). Estados: cargando, error de límite de uso (aviso ámbar), propuesta descartada por validación (con «Reintentar»), IA no disponible (enlace a Ajustes solo admin) |
| `BlockEditorHandle` | Añade `getSelectedBlock()`, `replaceBlock(id, mdx)`, `insertMdx(mdx)` y `undo()`; usan el motor de bloques (`parseMdx`, texto original conservado: la fidelidad 285/285 no cambia) |
| `AiDraftDialog` («Crear con IA» en la lista de páginas y en el espacio de contenido; «Crear página con IA…» en el menú del editor) | Descripción → propuesta editable (título, tipo, descripción, sección, módulo, grupo, subsección, dirección) + vista previa del contenido con `BlockPreview` → **Crear borrador** (`POST /api/pages` y `PUT /api/pages/:id`; nace `draft`). Nunca publica |
| Ajustes › Asistente de IA (`settings/AiSection.tsx`, admin) | Interruptor, clave (`type=password`, nunca se rellena con la guardada), modelo (lista sugerida + texto libre), **Guardar**, **Probar conexión** (llamada mínima real) y **Quitar clave**. Muestra el origen: «Clave guardada en Ajustes» / «Clave del servidor (archivo .env)» / «Sin clave» |
| `aiModel.ts` | Lógica pura probada con `node --test test/ai.test.mjs`: estado del botón, mensajes de error, límites de entrada, diferencia antes/después y validación del formulario |

Reglas: sin degradados ni emojis; solo componentes de `@/components/ui`; textos en español con verbo en infinitivo en los botones; `useAiStatus()` es la única fuente del estado (se refresca con el evento `portal:ai-config` al guardar Ajustes).


### Asistente conversacional (fase 2: chat con herramientas)

`AiAssistantSheet` es ahora **un chat** (Sheet derecho de 560 px) que sustituye al panel de «texto seleccionado»: historial de la sesión (se conserva al cerrar y reabrir; «Nueva conversación» lo vacía), caja de mensaje siempre activa (Enter envía, Mayús+Enter salta de línea), estado «Pensando…» con **Cancelar** (aborta la petición) y errores en el propio hilo (límite de uso en ámbar; clave/IA no disponible con enlace a Ajustes solo para administradores; propuesta descartada por seguridad). Vacío: aviso y chips de arranque («Crear una página en una sección», «Mejorar esta página», «¿Qué secciones hay?», «Acortar el bloque seleccionado»; los que necesitan página o bloque salen deshabilitados con ayuda). Las acciones rápidas anteriores quedan como **atajos** sobre el bloque seleccionado y dan una tarjeta antes/después.

En cada turno el panel envía el historial acotado (`buildHistory`: últimos 12 mensajes y 12 000 caracteres; las notas de lo aplicado o descartado viajan como mensajes del asistente), la página abierta con su texto actual del editor (`buildContext`) y el bloque seleccionado. Servidor: `POST /api/ai/chat` (`portal/server/routes/ai.mjs`, `ai/chatTools.mjs`): bucle de herramientas de lectura (`list_outline`, `search_pages`, `read_page`) y de **propuesta** (`propose_create_page`, `propose_edit_page`, `propose_move_page`), máx. 6 pasos y 90 s; ninguna escribe en la BD.

Tarjetas de propuesta (`CardShell`), cada una con **Aplicar** / **Descartar**:
| Tipo | Vista previa | Al aplicar |
|---|---|---|
| Página nueva | dirección, sección › grupo, tipo (o «estructura base» si pidió plantilla), «Borrador (no se publica)», contenido con `BlockPreview` | `createDraft` (POST + PUT de páginas; nace `draft`) y botón **Abrir** |
| Edición de la página abierta | diff antes/después del tramo cambiado | se aplica al editor **sin guardar** (solo si el texto no cambió desde la propuesta) con toast **Deshacer** |
| Edición de otra página | diff + aviso si está publicada («se ve al instante») | `PUT /api/pages/:id` con la versión de la propuesta (409 si cambió); **Deshacer** restaura la revisión anterior |
| Mover | origen → destino | `POST /api/pages/:id/move` (al final del destino) |

Tras aplicar o descartar, el chat añade una nota («Se creó el borrador…») que se envía en los turnos siguientes. `POST /api/ai/applied` deja `ai.apply` en la auditoría. Lógica pura probada en `test/ai.test.mjs` (`aiModel.ts`, `applyActions.ts` es la única parte con llamadas).


### Asistente: fase 3 (chat interactivo, grupos sin duplicados e historial)

- **Streaming.** `streamChat` (`lib/api.ai.ts`) lee el SSE de `POST /api/ai/chat` (`stream:true`): `meta`, `activity` (pasos en vivo), `delta` (texto), `reset`, `proposal` (ya validada en el servidor), `choices`, `done` y `error`. La línea de actividad (`ActivityLine`, iconos lucide: «Consultando las secciones del manual», «Leyendo…», «Preparando la propuesta…») se resuelve con una marca al terminar; mientras no llega texto se ve un esqueleto. **Cancelar** aborta el `fetch` y el servidor corta la llamada al proveedor sin guardar nada. El hilo es una región `role="log"` con `aria-live="polite"`.
- **Respuestas rápidas.** Si falta un dato, la IA llama a `ask_choice` y el hilo muestra botones con los valores reales (por ejemplo los grupos de la sección); un clic envía la respuesta. El turno termina ahí.
- **Tarjeta de página nueva editable** (`CreateCard` en `AiParts.tsx`): título y **grupo del menú** siempre visibles (desplegable con los grupos EXISTENTES de la sección, «Sin grupo» y «Nuevo grupo…»); «Editar» abre sección, tipo, dirección y módulo. Un grupo nuevo exige el nombre y una casilla de confirmación, y se rechaza si el nombre normalizado ya existe (se usa el existente). Muestra el miniárbol de dónde quedará la página resaltada, la vista previa del contenido (`BlockPreview`) y **Pedir cambios** (rellena la caja con el contexto), **Descartar** y **Crear borrador**. Al crear, el servidor vuelve a resolver el grupo (`canonicalGroupFor`).
- **Entrada.** Enter envía, Mayús+Enter salta de línea, **/** abre comandos (`/crear`, `/mejorar`, `/mover`, `/secciones`), **@** busca páginas (`api.pages`) y las añade al contexto (el servidor las relee de la BD), flecha arriba recupera el último mensaje, Esc cierra el menú y luego el panel. Cada respuesta tiene **Copiar** y la última, **Regenerar**. El texto del asistente se dibuja con `Md` (negrita, cursiva, código y listas como elementos de React; nunca `dangerouslySetInnerHTML`).
- **Bienvenida contextual** (`contextChips`): «Escribir el primer borrador» (página casi vacía), «Revisar y mejorar la redacción» (publicada) o «Completar y pulir este borrador», más «Crear una página en una sección», «¿Qué secciones hay?» y «Acortar el bloque seleccionado» si hay selección.
- **Historial** (`AiHistory.tsx`, botón «Historial» del panel): lista de MIS conversaciones con búsqueda, fecha corta, número de mensajes y página; abrir restaura el chat con el estado de cada propuesta (aplicada, descartada) y se puede continuar; renombrar, borrar una y **Borrar historial** (con confirmación). Servidor: `/api/ai/conversations*` (solo las del usuario), `PORTAL_AI_HISTORY_DAYS`, ver `SECURITY.md` § 9.
