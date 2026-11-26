# Tema del manual público (Rspress 2 + Tailwind CSS v4)

Tema propio del manual (no del panel). Sustituye al CSS a mano (`styles/index.css`): **el único CSS del proyecto es
`styles/tailwind.css`** (tokens, `@layer base` mínimo, `@source`); todo lo demás son utilidades en `theme/**` y
`src/components/**`. El CSS anterior ya no está en el repo (copia completa fuera: `../RESPALDO-TEMA-ANTERIOR/`).
Estado: **diseño final** (2026-11-25).

## 1. Decisiones de diseño (y por qué)

- **Identidad.** Violeta ISPMAX `#5b4bd8` (`brand-600`) como color de acción y cian `#38bdf8` (`accent-400`) solo como
  acento decorativo (no tiene contraste para texto sobre blanco). Firma visual repetida: el **filete violeta → cian**
  (borde superior de la barra, `Kicker`, barra de progreso del tour, pie). El logotipo (naranja/amarillo/azul petróleo)
  se respeta tal cual sobre una placa clara; sus colores están en `@theme` (`logo-*`) solo para decoración.
- **Cinco secciones con color propio** (`theme/lib/sections.ts`, única fuente): Guía violeta (libro), Quiero hacer… cian
  (lista con marcas), Tengo un problema rosa (salvavidas), Preguntas ámbar (bocadillo), Referencia verde azulado
  (biblioteca). El color dice dónde está el lector: migas de pan, cabecera del menú lateral, portada, menú móvil,
  resultados y filtros de la paleta, 404. Cada pareja de color es AA (texto `-700` en claro, `-300` en oscuro).
- **Tipografía.** Sora (títulos, rótulos) + Inter (texto, 16 px / 1,75, medida 46 rem ≈ 75 caracteres), autoalojadas
  (solo se descarga el subconjunto latino). Código: fuente monoespaciada del sistema (JetBrains Mono costaba 40 KB con
  prioridad máxima en casi todas las páginas por el código en línea; `@fontsource-variable/jetbrains-mono` ya no se usa).
  Escala: h1 2,45 rem; h2 1,55 rem con filete superior (separa bloques en páginas largas); h3 1,2; h4 1,03.
- **Iconos.** SVG lineales propios en línea (`theme/components/Icon.tsx`, sin dependencias). Los emojis que vienen del
  contenido (menú lateral, tarjetas `Card`) se respetan; en la interfaz (desplegable, portada, paleta) se sustituyen por
  iconos cuando el enlace es conocido (`iconFor` en `sections.ts`), y si no, se muestra el emoji.
- **Portada** (`HomeLayout`): héroe con buscador protagonista (abre la paleta; "Lo más buscado" la abre ya con la
  consulta), sello "N páginas comprobadas con ISPMAX `versión`", logo sobre placa clara con arcos de velocímetro (eco del
  logo) y dos cifras reales (tareas y problemas); bloque de las cinco secciones (con nº de páginas); módulos (tarjetas
  `features` del frontmatter **que apuntan a /guia/** y no son ya un enlace del menú: Quiero hacer…, Tengo un problema,
  Preguntas y Conceptos están en el bloque de secciones); rutas de lectura por perfil (empieza con ISPMAX, soporte,
  técnico, administrador: solo se muestran las páginas que existen y con su título real); franja de soporte. **Todas las
  cifras se calculan de `usePages()` al compilar** (no hay números escritos a mano).
- **Lectura.** Migas de pan; índice a la derecha (xl+) con seguimiento y "Volver arriba"; bajo 1280 px, barra fija
  "En esta página · apartado actual" con desplegable; botón flotante "volver arriba" (< xl); pie de documento con
  "Comprobado con ISPMAX `versión` · fecha" (frontmatter `verificado`) y enlace de ayuda; anterior/siguiente.
- **Enlaces del contenido**: todos abren en otra pestaña (plugin rehype existente), así que llevan un icono ↗ discreto
  y el texto oculto "(se abre en otra pestaña)"; al imprimir se añade la dirección.
- **Capturas**: marco con sombra suave; la imagen va en un botón `[data-zoom]` y abre el **visor propio**
  (`Lightbox.tsx`): `<dialog>` modal nativo (foco atrapado, Esc, ← → entre las capturas de la página, foco devuelto).
  Sustituye a medium-zoom: el selector de `mediumZoom` de `rspress.config.ts` (`.isp-doc img…`) ya no encuentra nada
  porque el contenedor se marca ahora con `data-doc`. La opción `mediumZoom` puede borrarse del config.
- **Rendimiento.** Sin CLS (figuras con `width`/`height` + `aspect-ratio`; el tour reserva el alto del paso más alto;
  la barra móvil del índice es fija); **la primera `<Figure>` de cada página va `eager` + `fetchpriority="high"`** (suele
  ser el LCP; contador por render en `theme/lib/figures.ts`, igual en SSR y en el navegador) y las demás `lazy` +
  `decoding="async"`; en la portada **una sola imagen** de logo (la clara sobre placa clara, en los dos modos), `eager` +
  `fetchpriority="high"`, sin descargar la oscura; bajo 1024 px la composición del logo no se muestra y un `<source>` con un GIF de 1 px en línea evita descargarlo (en móvil el LCP es el texto del héroe). El índice del buscador se descarga al abrir la paleta o en la 404.
- **Accesibilidad.** Enlace "Saltar al contenido"; landmarks (`header`, `nav` con nombre, `main#contenido`, `aside`,
  `footer`); `aria-current` en menú, migas e índice; `aria-expanded` en desplegables y grupos; menú móvil, paleta y
  visor como `<dialog>` modal nativo; desplegable "Referencia" con flechas, Inicio/Fin y Esc; foco visible global
  (`:focus-visible` en la capa base); `prefers-reduced-motion` global; tablas desplazables enfocables solo si se
  desplazan. Contraste: `fg-muted`/`fg-subtle` ≥ 4,5:1 sobre `bg` y `bg-soft` en los dos modos; **`fg-faint` nunca
  para texto** (solo iconos y filetes).
- **Impresión.** Sin barra, menús, índice, migas, pie ni botones; modo oscuro impreso en claro (variables en
  `@media print`); sombras fuera; `break-inside-avoid` en figuras, avisos, pasos y filas; `break-after-avoid` en títulos.

## 2. Tokens (`styles/tailwind.css`)

| Token (utilidad) | Claro | Oscuro | Uso |
|---|---|---|---|
| `bg` | `#ffffff` | `#0b0c14` | fondo de página (**`theme-color` del SEO: claro `#ffffff`, oscuro `#0b0c14`**) |
| `bg-soft` / `bg-mute` | `#f6f6fb` / `#ececf4` | `#10121c` / `#191c29` | pie, cabeceras de tabla / hover, chips |
| `surface` | `#ffffff` | `#121421` | tarjetas, paneles, diálogos |
| `fg` / `fg-muted` / `fg-subtle` | `#141726` / `#424959` / `#5d6577` | `#eceef6` / `#b8bece` / `#9098ab` | títulos / texto / secundario |
| `fg-faint` | `#a0a6b4` | `#4f5668` | solo iconos y filetes |
| `line` / `line-soft` | `#e3e4ee` / `#efeff6` | `#252839` / `#1a1d2b` | bordes |
| `brand` / `brand-strong` / `brand-tint` | `#5b4bd8` / `#4a3ac4` / 8 % | `#a093fd` / `#bab1fe` / 14 % | enlaces, activo, fondos suaves |
| `brand-50…950`, `accent-300/400/500`, `logo-*` | escala fija | | botones (`brand-600`, texto blanco 6,4:1), degradados |
| `h-topbar` 4 rem · `h-subbar` 2,75 rem · `w-sidebar` 17,5 rem · `w-toc` 15 rem · `max-w-doc` 46 rem · `max-w-shell` 92 rem | | | armazón |
| `animate-fade-in` · `animate-rise` · `animate-slide-in` | | | apertura de capas |

Capa base: valores de cada modo, `color-scheme`, impresión en claro, `:focus-visible`, `::selection`, movimiento
reducido y el puente `--rp-*` (incluye `--rp-nav-height` y `--rp-sidebar-menu-height` = alto de la barra "En esta
página" bajo 1280 px, para que los saltos a anclas no queden tapados).

## 3. Catálogo de piezas

**Armazón (`theme/`)**

| Archivo | Qué es |
|---|---|
| `layout/Layout.tsx` | raíz: `HeadTags` (SEO), enlace de salto, barra, contenido según `pageType`, pie, paleta |
| `layout/DocLayout.tsx` | documento: menú lateral (lg+), barra de índice (< xl), migas, artículo `[data-doc]`, `DocMeta`, anterior/siguiente, índice (xl+), visor, volver arriba. `DocContent` (MDX + contador de figuras) |
| `layout/HomeLayout.tsx` | portada (ver §1) |
| `layout/NotFoundLayout.tsx` | 404: "página sin señal", botón "Buscar «palabras de la dirección»", **páginas parecidas** (buscador del sitio con las palabras de la URL), secciones y soporte |
| `layout/shell.tsx` | estado: menú móvil y paleta (`openSearch(consulta?)`, `closeSearch`) |
| `components/TopBar.tsx` | barra: marca, menú (lg+), desplegable con teclado, buscar, tema, redes (xl+), botón de menú (< lg). Exporta `NavEntry`, `useNavActive` |
| `components/Sidebar.tsx` | menú lateral: cabecera de sección, grupos plegables (secciones de > 40 páginas arrancan plegadas salvo el grupo actual), activo con barra, lleva el activo a la vista. Exporta `toGroups` |
| `components/Breadcrumbs.tsx` | migas + **`useBreadcrumbs()`** (Inicio › sección › grupo › página; reutilizable para JSON-LD) |
| `components/Toc.tsx` | `Toc` (columna) y `MobileTocBar` (barra fija con desplegable) |
| `components/SearchPalette.tsx` | `SearchButton`, `SearchPalette` (dialog), `Highlight`, `SUGERENCIAS`, `useModKey` |
| `components/MobileMenu.tsx` | panel lateral (dialog): buscar, secciones con icono, menú de la sección, redes y tema |
| `components/Lightbox.tsx` | visor de capturas |
| `components/Footer.tsx` | `Footer` (marca, secciones, referencia, contacto) y `SupportBand`; `useContacto` |
| `components/DocMeta.tsx`, `PrevNext.tsx`, `BackToTop.tsx`, `ThemeToggle.tsx`, `SocialLinks.tsx` | piezas del documento y de la barra |
| `components/Icon.tsx` | iconos SVG (`<Icon name="…" />`) |
| `components/ui.tsx` | `buttonClass(variant, size)`, `iconButtonClass`, `Kbd`, `IconTile`, `Eyebrow` |
| `mdx/index.tsx` | h1-h6 (ancla que copia el enlace), p, listas, cita, código, tabla con sombras de desplazamiento, enlaces con ↗, img |
| `mdx/Callout.tsx` | avisos `tip/info/note/important/warning/caution/danger` (icono + filete de color, títulos por defecto en español) y `details` plegable |
| `mdx/Badge.tsx` | etiquetas |
| `lib/sections.ts`, `lib/routes.ts`, `lib/figures.ts`, `lib/cn.ts` | secciones e iconos; `useRouteExists`, `useNavLink`, `normRoute`; contador de figuras; unir clases |

**Componentes MDX (`src/components/`, mismas props que siempre)**: `Figure` (botón de ampliar, primera figura
prioritaria; **mantener el literal `src={src}` y no importar `withBase`**: lo parchea `publish.mjs`), `FigRow`,
`FigGrid`, `Cards`/`Card`, `Steps`/`Step` (números en círculo violeta unidos por una línea en degradado), `Kicker`
(con el filete de marca), `Lead`, `Badge`, `Callout`, `Tour` (marco de figura, barra de progreso, chip "Paso N de M",
botones del tema), `SearchTerms` (invisible), `LegacyHashRedirect`.

## 4. Arquitectura y convenciones

**Cómo resuelve Rspress el tema.** `@rspress/core/theme` apunta primero a `theme/` y después al tema de serie, por
carpeta. `theme/index.tsx` reexporta todo el original y sustituye `Layout`, `Callout`, `Badge` y
`getCustomMDXComponent`. Los avisos `:::` importan `Callout` del tema (el nuestro).

**CSS y capas.** Orden: `rp-base` (preflight de Rspress) → `theme` → `base` → `components` → `utilities`. El CSS de
Rspress que sigue cargándose va sin capa y gana a las capas: el tema no aplica utilidades a `.rp-*` ni a `body`, y las
variables `--rp-*` se fijan desde la capa base con `!important`.

**Detección de clases.** `@source "../theme"` y `@source "../src"`; las `.mdx` se detectan desde la carpeta `docs/`
activa (`base` del plugin de PostCSS).

**Convenciones.**
- Solo utilidades en el JSX; nada de CSS nuevo. Clases condicionales con `cn()`. Una combinación repetida en tres
  sitios va a un componente o a `ui.tsx`, no a CSS.
- Colores de estado y de sección siempre como pareja claro/oscuro escrita entera (Tailwind solo ve literales).
- Modo oscuro: variante `dark:` (clase `dark` en `<html>`, la pone Rspress antes de pintar). Lo que depende del modo
  se elige con `dark:hidden`/`dark:block`, no con estado de React.
- Capas modales con `<dialog>` + `showModal()`; se montan solo al abrirse.
- Marcadores sin CSS: `data-doc` (contenedor del documento: visor), `data-zoom` (captura ampliable), `data-nozoom`,
  `data-scrollbox` (contenedor con desplazamiento propio: menú e índice), `rp-toc-include` (encabezados del índice).
- Rutas escritas a mano en el tema: limpias (sin `.html`; el config usa `cleanUrls`) y comprobadas con
  `useRouteExists` cuando pueden no existir (perfiles de la portada, `/referencia/`).
- Textos de interfaz en español; los de Rspress con `useI18n()` (`i18nSource` del config).

**Añadir un componente MDX.** `src/components/Nombre.tsx` (export default), añadirlo a `markdown.globalComponents` en
`rspress.config.ts` y comprobar con `npm run build:corpus`.

**Ver el manual real.** `npm run dev:corpus` (puerto 3001), `npm run build:corpus` (build + `check-dist` +
`eval-search --check 90`), `npm run preview:corpus`. Usan `portal/work-test/manual-dev/`. Detener `dev:corpus` antes
de `build:corpus` (comparten la carpeta).

## 5. Pendiente / fuera de esta zona

- `rspress.config.ts`: la opción `mediumZoom` ya no tiene efecto (puede quitarse); `enableScrollToTop` tampoco.
- Logos de la portada (`assets/logo/ISPMAX*.png`, 1200×630, ~300 KB): una versión WebP de ~800 px reduciría el LCP.
- Las capturas no tienen variantes de tamaño (`srcset`/`sizes`): requeriría generarlas al sincronizar assets.
- La CSP del portal aún permite Google Fonts (ya no hace falta) y el lienzo del editor (`portal/web`) aproxima la
  tipografía anterior.
