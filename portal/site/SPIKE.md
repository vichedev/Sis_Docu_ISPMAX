# Spike: manual público dibujado al pedirlo (SSR desde PostgreSQL), sin reconstrucciones

> **Integrado (2026-11-26).** El motor ya sirve el manual en el portal (`PORTAL_RENDER_MODE=dynamic`, por defecto): rutas en
> `portal/server/http/frontend.mjs`, programador en `portal/server/ops/site-dynamic.mjs`, seguridad del contenido en
> `safety.mjs` + `compiler.mjs` + `compile-child.mjs` (proceso con permisos), LRU con límite de bytes en `engine.mjs`, menú y
> buscador desde `scripts/lib/nav-core.mjs` y `scripts/lib/search-core.mjs` (compartidos con el build estático). El servidor del
> corte (`serve.mjs`) y `tools/invalidation.mjs` se retiraron (los cubren `test/site-dynamic.test.mjs` y el portal). Paridad:
> `npm run parity` (`tools/parity-run.mjs`); rendimiento y memoria: `node --expose-gc site/tools/bench.mjs`. Tema: `npm run
> site:build` (cliente con base relativa; ya no hace falta recompilarlo para otra base del sitio). Lo de abajo es el informe
> original del corte vertical; las rutas `site/serve.mjs` y la BD `ispmax_manual_spike` ya no existen.

Fecha: 2026-11-26 · Máquina: Windows 11, Node 24.13 (producción: Node 22 en Docker/Alpine) · Rspress 2.0.18, React 19.2.8
Corpus: paquete `ispmax-contenido-20261125-170800.ispmax` importado en una base propia (`ispmax_manual_spike`, 285 páginas,
270 imágenes, 2 tours) con `PORTAL_TEST_DB_NAME=ispmax_manual_spike node server/dev-test-server.mjs 4408`.
Referencia estática: `npm run build:corpus` (25,5 s en esta máquina), con y sin `PORTAL_PUBLIC_URL=https://doc.ispmax.ec`.

**Recomendación: GO**, con las condiciones de la sección 8. Todas las cifras de este informe salen de las herramientas de
`portal/site/tools/` (y de las de `scratchpad` citadas), no de estimaciones.

## 1. Qué se construyó (todo nuevo, nada existente modificado)

| Pieza | Archivo | Qué hace |
|---|---|---|
| Compilador MDX | `portal/site/mdx.mjs` | El **mismo pipeline de Rspress** (`createMDXOptions` + `createProcessor` de `@rspress/core/dist`, con sus plugins remark/rehype y `src/plugins/rehypeLinksNewTab.ts`), salida `function-body`. Quita el frontmatter interno igual que `stripFrontmatterLoader`. |
| Hilo de compilación | `portal/site/compile-worker.mjs` | Compila y minifica (esbuild) fuera del hilo principal: el servidor sigue respondiendo mientras compila la página más pesada. |
| Configuración | `portal/site/config.mjs` | Carga **`rspress.config.ts` del repo** en memoria (esbuild) y genera `siteData`/i18n con `createSiteData`/`getI18nData` de Rspress: menú superior, redes, contacto, textos, SEO… sin duplicarlos. `config-stub/_nav.json` (`{}`) solo existe porque el config lee ese archivo al importarse. |
| Menús y portadas | `portal/site/nav.mjs` | `scripts/build-nav.mjs` traducido a filas de la BD (grupos, `orden`, `padre`, `menu`, `sidebar.json` de /guia) + las portadas de sección generadas (`/tareas/`…). |
| Buscador | `portal/site/search.mjs` | `scripts/build-search-data.mjs` sobre la BD (mismo formato y pesos; motor `src/search/engine.mjs` intacto). |
| Motor | `portal/site/engine.mjs` | `renderRoute`, módulos de página, datos del sitio, índice, imágenes y tours desde la BD, caché e invalidación. |
| Servidor del corte | `portal/site/serve.mjs` | Fastify en un puerto propio (4409): `/`, `/_site/*`, `/assets/*`, `/sitemap.xml`, `/robots.txt`, iconos. En la migración serían unas rutas más de `frontend.mjs`. |
| Cliente/SSR | `portal/site/client/` | `vite.config.mjs`, `entry-client.tsx`, `entry-server.tsx`, `App.tsx` y el **shim** (`shim/runtime.tsx`, `shim/theme-original.ts`, `shim/search-data.ts`, `shim/legacy-routes.ts`). |
| Herramientas | `portal/site/tools/` | `parity.mjs`, `bench.mjs`, `invalidation.mjs`, `static-server.mjs`. |

Cómo reproducir (desde `portal/`): `npx vite build -c site/client/vite.config.mjs && npx vite build -c site/client/vite.config.mjs --ssr`
(8 s) → `node site/serve.mjs 4409` → `node site/tools/parity.mjs`, `node --expose-gc site/tools/bench.mjs`,
`node site/tools/invalidation.mjs` (con el portal de pruebas en 4408).

### Cómo funciona

```
petición /guia/routers ──► firma de la BD (1 consulta, ~1 ms) ──► ¿HTML en caché con la misma clave? ──sí──► 304/200 (brotli)
                                                                      │no
                     MDX compilado en caché (clave id:versión:updated_at)? ──no──► hilo: Rspress MDX → function-body
                                                                      │
             bundle SSR (Vite, tema real): renderToString(App) + unhead → documento completo → caché (brotli)
navegador: HTML + /_site/boot.<hash>.js (menús, páginas, i18n; inmutable) + entry (tema) + /_site/p/guia/routers.js
           → hidratación; al navegar: import('/_site/p/<ruta>.js') (no-cache + ETag) → mismo Link/nprogress de Rspress
```

Estado al terminar: servidores 4408/4409/4410 detenidos, base `ispmax_manual_spike` borrada, `portal/work-test/dts-4408/`
borrada. Cambios fuera de `portal/site/`: solo `portal/package.json` y `package-lock.json` (`vite` como devDependency).
`portal/work-test/manual-dev/dist` quedó del último `build:corpus` (con `PORTAL_PUBLIC_URL=https://doc.ispmax.ec`).
`portal/site/dist/` (bundles del tema) lo ignora Git (`dist/`). No se hizo commit.

## 2. Inventario de APIs de Rspress que usa el tema y cómo se cubren

`theme/**` y `src/components/**` se compilan **sin tocar una línea**; Vite sustituye tres módulos por alias.

| Módulo | Exportaciones usadas | Cobertura |
|---|---|---|
| `@rspress/core/runtime` | `usePage`, `useFrontmatter`, `useSite`, `usePages`, `useNav`, `useSidebar`, `useLocaleSiteData`, `useActiveMatcher`, `useI18n`, `useLocation`, `useNavigate`, `Content`, `Head`, `useHead`, `withBase`, `removeBase`, `normalizeImagePath`, `isExternalUrl`, `ThemeContext` (+ las que piden las piezas reutilizadas: `preloadLink`, `cleanUrlByConfig`, `initPageData`, `warmPageData`, `pathnameToRouteService`, `isActive`, `isEqualPath`) | `shim/runtime.tsx`: hooks copiados de `@rspress/core/dist/runtime` (10–20 líneas cada uno) con los datos del servidor en vez de los módulos virtuales (`virtual-site-data`, `virtual-page-data`, `virtual-routes`, `virtual-i18n-text`). Funciones puras de `@rspress/shared`, `react-router-dom` real y `@unhead/react` real. **Rutas dinámicas**: `pathnameToRouteService` consulta la lista de páginas que manda el servidor y `preload()` importa `/_site/p/<ruta>.js`. |
| `@rspress/core/theme-original` | `Link`, `useLinkNavigate`, `CodeBlock`, `usePrevNextPage`, `useActiveAnchor`, `useScrollReset`, `useScrollAfterNav`, `renderInlineMarkdown`, `useThemeState` (+ `CodeButtonGroup`, `SvgWrapper`, iconos, `copyToClipboard`, `getCopyableText` que piden esas piezas) | `shim/theme-original.ts`: **reexporta los archivos compilados de `@rspress/core/dist/theme/`** (los mismos que empaqueta Rspress). No se reescribe nada. |
| `@rspress/core/theme` | `Badge`, `Callout`, `Link` (desde `src/components`) | Alias a `theme/index.tsx` (como hace `themeDir`). |
| `@isp/search-data`, `@isp/legacy-routes` | índice y redirecciones | `shim/search-data.ts` (descarga `/_site/search.json`), `shim/legacy-routes.ts` (de los datos del sitio). |
| `@mdx-js/react` | `MDXProvider` | El real. Los componentes globales (`markdown.globalComponents`) llegan por un `MDXProvider` externo en `App.tsx` en vez de `import` en cada .mdx. |

Lo único del tema que **no** se pudo reutilizar tal cual: nada del tema propio. De Rspress no se usan `App.js`/`ClientApp.js`/
`ssrServerEntry.js`/`route.js`/`initPageData.js` (dependen de módulos virtuales calculados al compilar y de una lista de rutas
fija al cargar el módulo); se reescribieron en ~150 líneas copiando su lógica (`App.tsx`, entradas, shim).

Trampas encontradas: (1) `remarkContainerSyntax` añade `import { Callout as $$$callout$$$ } from '@rspress/core/theme'` →
se quita con un plugin remark propio (el componente ya llega por `MDXProvider`); (2) `@rspress/core` declara `sideEffects`
solo para `*.css`: importar `dist/theme/styles/index.js` no trae su CSS → se importan los `.css` uno a uno; (3) para que los
`useId` coincidan con el HTML estático, `App.tsx` reproduce la forma de hijos de `App.js` (`[false, <Layout/>, [globales]]`).

## 3. Paridad del compilador MDX (285 páginas reales)

`node site/tools/parity.mjs` compara `#__rspress_root` (todo el cuerpo: barra, menú lateral, migas, artículo, índice,
anterior/siguiente, pie) y el `<head>` de cada página dinámica con el `dist/` de `build:corpus`.

| Comparación | Resultado |
|---|---|
| Cuerpo **idéntico byte a byte** (sin normalizar nada, ni los id de React) | **285/285 (100 %)** |
| Métricas del artículo (texto visible, encabezados nivel+id+texto, imágenes, enlaces, tablas, avisos, pasos, código, figuras) | 285/285 |
| `<head>` (title, description, robots, OG, Twitter, theme-color, iconos, keywords del frontmatter) sin URL pública | 285/285 |
| `<head>` **con `PORTAL_PUBLIC_URL`** (canonical, hreflang, og:url, og:image, **JSON-LD** BreadcrumbList/TechArticle) | 285/285 |
| 404 (cuerpo) | idéntico |
| Índice del buscador (`/_site/search.json` frente a `search-data.json`) | 284/284 documentos iguales; `eval-search --check 90` con el índice dinámico: **1.º 74,9 % · top-3 98,7 % · top-5 99,9 %** (idéntico al estático) |

Las únicas diferencias del `<head>` son las de recursos del build (CSS/JS/`preload` de fragmentos; el estático trae además
`X-UA-Compatible` y `generator`), excluidas a propósito. Cobertura de sintaxis del corpus: avisos `:::` (241 páginas),
tablas GFM (~285), comentarios `{/* */}` (153), `<SearchTerms>` (279), `<Steps>` (127), `<Cards>` (5), `<FigRow>`/`<FigGrid>` (3),
`<Callout>` anidado (1), HTML en línea (1), `<Tour>` (1). **No hay bloques de código ``` en el corpus**: Shiki está en el
pipeline (es el de Rspress) pero su salida no se ha podido comparar con contenido real.

## 4. Corte vertical: `renderPage(ruta)` con todo el armazón

`engine.renderRoute(ruta)` devuelve el documento completo (head SEO de `theme/seo/`, menú lateral desde la BD, índice,
anterior/siguiente, migas, pie). Probado en las 285 páginas + 404 (sección 3), y en el navegador (Edge headless,
`scratchpad/vis/interact.mjs`) en el dinámico y en el estático con el mismo guion:

| Prueba | Dinámico | Estático |
|---|---|---|
| Hidratación sin errores (`onRecoverableError`) en /guia/routers, /, /tareas/, /referencia/mensajes-del-sistema | OK (0) | OK |
| Navegación cliente sin recarga (menú lateral; una sola petición: `/_site/p/guia/redes-ipv4.js`) y botón Atrás | OK | OK |
| Ctrl+K con índice generado desde la BD; Intro abre el resultado sin recarga | OK («Registrar un pago» primero) | OK (mismo orden) |
| Modo oscuro (conmuta y guarda `rspress-theme-appearance`) | OK | OK |
| Visor de imágenes (`<dialog>`) | OK | OK |
| Tour (`<Tour>` en /guia/ajustes; JSON desde la tabla `tours` con ETag): avanza de paso | OK | OK |
| 404 con estado HTTP 404 y «páginas parecidas» (buscador) | OK | OK |
| Errores de consola (salvo el propio 404 de la prueba) | 0 | 0 |
| /referencia/mensajes-del-sistema (2 MB de HTML) hasta hidratada, con el servidor en caliente | 1 480 ms | 1 492 ms |

(Con el servidor en frío esa página tarda más la primera vez: 3,3 s de servidor por la compilación, ver sección 5.)

## 5. Caché, invalidación y rendimiento

### Invalidación (`node site/tools/invalidation.mjs`, portal de pruebas en 4408 + manual dinámico en 4409)

| Caso | Resultado |
|---|---|
| Guardar el **cuerpo** por la API del portal (PUT /api/pages/:id) | La siguiente petición ya trae el cambio: **141 ms** después de que responde el guardado (161 ms desde que empieza). La otra página sigue en caché (`x-site-cache: hit`). El módulo de navegación también cambia. |
| Editar el cuerpo por **SQL propio** (sin pasar por el portal) | Siguiente petición con el cambio en **88 ms**; la otra página sigue en caché. |
| Cambiar el **título** de una tarea (sale en el menú de todas las tareas) | Otra tarea ya muestra el título nuevo en su menú en **31 ms** (se repinta; su MDX compilado se conserva); la siguiente es `hit`. |
| **Página nueva** (crear + publicar por la API) | Sirve 200 a los **82 ms** de publicar, con su aviso `:::tip`, aparece en la portada de sección y en el índice del buscador. En borrador: 404. Al borrarla: 404. |
| Revalidación | `If-None-Match` → 304. |

Detección: una consulta de firma por petición (`count/max(updated_at)/sum(version)` de `pages` + `site_files` + `redirects`;
~1 ms) — funciona también con ediciones que no pasan por el portal. En la integración se puede sumar el aviso de
`ctx.site.markDirty()` que el portal ya emite en cada cambio visible.

Clave de caché: MDX compilado por `id:version:updated_at`; HTML por estructura (menús, títulos, estados) + contenido. Un
cambio de cuerpo invalida **solo esa página**; uno de título/grupo/orden/estado/menú invalida el HTML de todas (repintar las
285 con el MDX ya compilado cuesta 4,7 s en total, de forma perezosa: cada una al pedirla, p50 10 ms).

### Tiempos (en proceso, `node --expose-gc site/tools/bench.mjs`; compilación en el hilo principal)

| Medida | p50 | p95 | máx | total 285 |
|---|---|---|---|---|
| Frío (compilar MDX + pintar) | 30 ms | 123 ms | 3 461 ms (mensajes del sistema) | 16,5 s |
| · de ello compilar | 13,9 ms | 43,8 ms | 2 982 ms | 8,2 s |
| · de ello pintar (renderToString + head) | 10,3 ms | 79,8 ms | 472 ms | 7,7 s |
| Templado (MDX en caché, HTML no) | 10,2 ms | 64,4 ms | 131 ms | 4,7 s |
| Caliente (HTML en caché + consulta de firma) | **0,5 ms** | 0,7 ms | 1,1 ms | — |

Por HTTP (Fastify, brotli precomprimido): página en caché p50 **5,8 ms**, p95 9,2 ms; la más pesada (2 MB de HTML) 25 ms en
caliente. Precompilar las 285 páginas al arrancar: **7,8–8,8 s** en segundo plano. Con la compilación en el hilo aparte,
mientras se recompila «mensajes del sistema» (6,4 s con el arranque del hilo) otra página responde en p50 9 ms / máx 27 ms.

### Memoria

Montón vivo con las 285 páginas compiladas y el HTML en caché: **≈ 70–85 MB** (`heapUsed` tras GC). El HTML se guarda
comprimido (brotli 5): sin eso eran 150 MB. **El RSS en Windows queda en 450–650 MB** tras compilar todo (el montón de
V8 crece durante la compilación y Windows no devuelve esa memoria; con el hilo aparte el `heapTotal` baja a 73 MB pero el
RSS no). Hay que medirlo en el contenedor Linux y, si sigue alto, compilar bajo demanda (sin precompilar todo), poner un
LRU al MDX compilado y/o reciclar el hilo de compilación. Para comparar: hoy cada publicación lanza un build de Rspress que
consume más que eso durante 35–86 s.

### Tamaño en el navegador (primera visita a /guia/routers, gzip)

| | Estático (Rspress) | Dinámico |
|---|---|---|
| JS inicial | 211 KB (855 KB sin comprimir: incluye los datos de las 285 páginas) + 11 KB del fragmento de la página | **150 KB** (517 KB): tema 105 KB + runtime 18 KB + datos del sitio 17,7 KB (inmutable por estructura) + página 9,6 KB |
| CSS | 19,3 KB | 18,8 KB (las mismas 161 reglas; solo cambia el minificador) |
| HTML | 25,4 KB | 25,3 KB |
| Navegación a otra página | fragmento de ruta (~11 KB) | módulo de página (~10 KB) |
| Índice del buscador (al abrir Ctrl+K) | 196 KB | 193 KB |
| Compilación por despliegue | build completo 25,5 s aquí / 86 s en el servidor | **tema: 3,6 s (cliente) + 4,6 s (SSR)**; contenido: nunca |

## 6. Verificación visual (Edge headless + pixelmatch)

`scratchpad/vis/shots.mjs`: 10 páginas (portada, /guia/routers, /guia/mapa con Steps+FigRow, /guia/clientes con `details`,
/guia/ajustes con Tour, /tareas/, una tarea, un problema con avisos y tablas, /referencia/mensajes-del-sistema, 404) ×
claro/oscuro × 1440/390 px, dinámico frente a estático, página completa hasta 5 000 px de alto.

**40 de 40 pares idénticos píxel a píxel** (pixelmatch, umbral 0,1: 0 píxeles distintos; mismas alturas de página, p. ej.
/guia/routers 14 439 px, mensajes del sistema 292 822 px a 1440). 0 errores de consola y 0 errores de hidratación en las 80
cargas. Capturas revisadas a ojo (portada 390 oscuro, /guia/mapa 1440 oscuro con tabla, /guia/ajustes 1440 claro con el tour
y un aviso `important`): `scratchpad/vis/shots/` (no se versionan).

La primera pasada dio 3–10 % de píxeles distintos y páginas 7–150 px más bajas: faltaba el CSS de serie de Rspress
(trampa 2 de la sección 2). Corregido, la comparación es la de arriba.

## 7. Huecos, riesgos y lo que falta para la migración completa

**Huecos del corte (no implementados, sin dificultad técnica conocida)**

- Integración en `portal/server/http/frontend.mjs` (sustituir `sendSite` y el 503 «preparando»), con la base del sitio
  (`site_base`: el shim ya usa `withBase`; falta probar `/manual/`), la redirección `/manual/*` y `healthz.site`.
- Marca del portal (`site_title`, `contact_whatsapp`): aplicar `ops/branding.mjs` al config cargado y recalcular al cambiar.
- `<Figure>` con base distinta de `/`: hoy lo parchea `publish.mjs` (`patchFigure`); en dinámico iría como transformación
  del plugin de Vite (mismo reemplazo) o en el shim.
- Enlaces rotos: el build de Rspress falla con enlaces internos muertos; el motor no los comprueba (no hay `routeService`).
  Debe hacerlo el portal al guardar (ya valida rutas en `routes/validate.mjs`).
- Clases de Tailwind escritas en el contenido: hoy **0 páginas** usan `className`; si se usaran, el CSS del tema (compilado
  por despliegue) no las tendría. Opciones: compilar al vuelo con la API de Tailwind v4 o restringirlo en el editor.
- Un módulo de página ya cargado en una pestaña abierta no se refresca si alguien edita esa página mientras tanto (el HTML
  sí); al recargar, sí. Se resuelve añadiendo la versión a la URL del módulo si se considera necesario.
- `llms.txt`/cabeceras `Link`: el config actual no los usa (no aplica). `robots.txt` y `sitemap.xml` ya eran dinámicos
  (`seo.mjs`); el corte los sirve con las mismas funciones.
- Duplicación temporal: `nav.mjs`/`search.mjs` copian `build-nav`/`build-search-data`; hay que extraer un módulo común.

**Riesgos**

1. **APIs internas de Rspress** (`@rspress/core/dist/...`: `createMDXOptions`, `createProcessor`, `createSiteData`,
   `getI18nData`, componentes de `dist/theme`). No son API pública: una actualización de Rspress puede moverlas. Mitigación:
   versión fijada y `parity.mjs` en CI (la paridad de hoy es 285/285 byte a byte). Si algún día se abandona Rspress, el
   compilador es `@mdx-js/mdx` + los mismos plugins y el tema sigue sin cambios.
2. **El MDX se evalúa en el proceso del servidor** (`new Function` del cuerpo compilado). Hoy se evaluaba en el proceso de
   build, con el mismo nivel de confianza; el portal rechaza expresiones al guardar (`mdxSafety.mjs`) y el motor lo vuelve a
   comprobar antes de compilar (defensa en profundidad para ediciones por SQL; las 285 páginas pasan).
3. **Memoria** (sección 5): RSS alto en Windows; medir en Linux antes de decidir precompilar todo.
4. **Primera visita tras editar la página más pesada**: 3–6 s (mensajes del sistema). Mitigación: compilar en segundo plano
   justo al guardar (el portal ya avisa con `markDirty`).

**Estimación de esfuerzo (una persona, días de trabajo)**

| Pieza | Días |
|---|---|
| Integrar el motor en `frontend.mjs` (base, `/manual`, 404, cabeceras, healthz) y retirar el 503 «preparando» | 1,5 |
| Módulo común menú/portadas/buscador (build-nav, build-search-data, structure.mjs) + prueba de paridad del menú | 1 |
| Invalidación con `markDirty` + compilación en segundo plano al guardar; LRU/límites de memoria y medición en Linux | 1,5 |
| Panel: «Guardar = en vivo» real, quitar la construcción del sitio de «Publicar», trabajos y estado; «Actualizar el sistema» recompila el tema | 2 |
| Marca, `site_base` y `<Figure>`, comprobación de enlaces rotos al guardar | 1,5 |
| Docker: paso de compilación del tema en `entrypoint.sh` (como el panel), dependencias (`vite`, `esbuild` como dependencia directa) | 0,5 |
| Pruebas: adaptar `site.test`, `seo.test`, `production.test`; `parity.mjs` contra instantáneas; prueba de navegador | 2,5 |
| Limpieza del flujo antiguo (publish build, `work/site`, `data/site`), `DEPLOY.md`, `notes/portal.md`, `CLAUDE.md` | 1 |
| **Total** | **≈ 11,5 días** (2,5 semanas con revisión) |

**Impacto en Docker**: el `entrypoint.sh` ganaría un paso igual al del panel: «compilar el tema del manual si cambió el
commit» (`npx vite build -c site/client/vite.config.mjs && … --ssr`, 8 s aquí). Desaparecen el build de Rspress por
publicación, `portal/work/site/` (copia del repo + `node_modules` enlazado) y el reemplazo atómico de `portal/data/site/`.
Dependencias nuevas en `portal/`: `vite@7.3.8` (devDependency; ~22 MB en disco con rollup y esbuild, que ya se instalan con
`--include=dev`). `esbuild` se usa también en tiempo de ejecución (cargar `rspress.config.ts`, minificar módulos de página):
en la migración, como dependencia directa. El resto (`@mdx-js/*`, remark/rehype, Shiki, React, react-dom/server, unhead,
react-router) ya está en el `node_modules` de la raíz por Rspress.

## 8. Recomendación: GO

- **Paridad**: 285/285 páginas con el cuerpo idéntico byte a byte, `<head>` SEO idéntico (con y sin URL pública), 404
  idéntico, índice del buscador idéntico y mismas cifras de `eval-search`. Visualmente: 40/40 capturas idénticas píxel a
  píxel (10 páginas × claro/oscuro × 1440/390), sin errores de consola ni de hidratación.
- **Cero reconstrucciones**: guardar → contenido nuevo en la siguiente petición en < 0,2 s (API) / < 0,1 s (SQL), las demás
  páginas siguen en caché; página nueva visible a los 82 ms; nada se escribe en disco.
- **Rendimiento**: 0,5 ms en caliente en proceso, ~6 ms por HTTP; frío p50 30 ms; JS de la primera visita un 32 % menor que el estático (150 KB frente a 222 KB gzip).
- **Coste**: ≈ 11,5 días; el diseño no se duplica (el tema se compila tal cual con tres alias).

Condiciones: (1) medir la memoria en el contenedor Linux y ajustar la política de precompilación; (2) fijar la versión de
Rspress y llevar `parity.mjs` a CI; (3) comprobar enlaces rotos en el portal al guardar (el build ya no lo hará);
(4) compilar en segundo plano al guardar para que nadie espere los 3 s de la página más pesada.
