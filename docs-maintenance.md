# Mantenimiento del manual

Cómo evitar que el manual vuelva a quedar abandonado: qué se mide, qué se automatiza y qué hace una persona
(o Claude) cuando el producto cambia. Solo se automatiza lo que da una señal accionable.

## 1. Mapa de herramientas

| Herramienta | Qué hace | Cuándo corre | Falla el CI si… |
|---|---|---|---|
| `scripts/docs-check.mjs` | Enlaces internos y anclas rotas, imágenes inexistentes/sin uso, páginas huérfanas, metadatos obligatorios, duplicados | cada PR, push a `main`, lunes | hay **errores** (los avisos no fallan) |
| `scripts/build-inventory.mjs` | Consolida `notes/inventory/*.md` → `docs-inventory.md` + `notes/_generated/inventory.json` | cada PR | (solo genera) |
| `scripts/docs-coverage.mjs` | Matriz funcionalidad ↔ página, % de cobertura, módulos sin documentar → `docs-coverage.md`, `metrics.json` | cada PR | cobertura < `MIN_COBERTURA` (variable del repo) |
| `scripts/eval-questions.mjs` | Busca cada pregunta del banco en el manual y verifica que la página correcta sale en el top‑3 y contiene la respuesta → `docs-validation.md` | cada PR | búsqueda < `MIN_BUSQUEDA` (def. 80 %) |
| `scripts/eval-search.mjs` | Mide el **buscador del sitio** (`src/search/engine.mjs`, el mismo código que corre en el navegador) con el banco de preguntas: % de variantes en el 1.º, top‑3 y top‑5. `--defecto` añade el buscador de serie de Rspress como referencia; `--lista` muestra las que fallan | cada PR (tras compilar) | el top‑5 baja de `MIN_BUSQUEDA_SITIO` (90 %) |
| `scripts/docs-progreso.mjs` | Mide el avance (7 ejes, ver abajo) y lista lo pendiente: páginas `parcial`, tareas sin captura, guías con capturas antiguas. `--listas` detalla | a mano, al cerrar cada bloque | — |
| `scripts/build-search-data.mjs` | Genera `src/search/data.json` (índice del buscador: título, encabezados, `sinonimos`, descripción y texto de cada página). Corre dentro de `npm run dev` y `npm run build`; no se versiona | cada compilación | — |
| `scripts/check-dist.mjs` | Recorre `dist/` y falla si hay enlaces, imágenes, scripts o anclas locales que no existen (p. ej. un enlace a una carpeta sin barra final) | cada PR (tras compilar) | hay enlaces rotos |
| `scripts/docs-stale.mjs` | Compara hashes del código citado en `codigo:` con los registrados; rutas inexistentes; rutas sin documentar; verificaciones antiguas | **a mano o cron local** (necesita el código del producto) | con `--fail`, hay sospechas |
| `scripts/gen-permisos.mjs` | Regenera `docs/referencia/catalogo-permisos.mdx` desde los JSON de permisos del frontend | a mano, tras un cambio de permisos | — |
| `scripts/gen-mensajes.mjs` | Regenera `docs/referencia/mensajes-del-sistema.mdx` (avisos y errores del backend y del frontend). `--auditar` lista lo omitido; `--seco` no escribe | a mano, tras un cambio de producto (necesita el código) | — |
| `tools/capture` | Regenera capturas desde la instancia local (Edge, Chrome o Brave: `EDGE_PATH`; `npm ci --ignore-scripts` en `tools/capture`). Atajo: `tools/capture/capturar.sh <manifiesto>` (lee la cuenta de pruebas sin mostrarla) | a mano, tras un cambio de UI | — |
| `tools/instance` | Siembra de la instancia aislada: `seed-base`, `seed-demo` y `seed-permisos` (da al administrador los permisos del catálogo; sin ellos el panel rebota al inicio) | a mano | — |

Subir `MIN_COBERTURA` y `MIN_BUSQUEDA` en *Settings → Variables* del repositorio a medida que el manual madura
(objetivo: 90 % y 90 %). Bajarlos exige justificación en el PR.

## 2. Qué es "una verificación"

Cada página lleva en el frontmatter:

```yaml
codigo: [FE:pages/dashboard/clientes/AddCliente.vue, BE:customers/customers.service.ts]
verificado: { fecha: 2026-10-12, version: zip-2026-10-06, metodo: codigo+ui }
```

Verificar = leer el código citado **y**, cuando es posible, reproducir el procedimiento en la instancia aislada.
Después se ejecuta `node scripts/docs-stale.mjs --record`, que guarda en `docs/_trace.json` el hash de cada
archivo citado. A partir de ahí, cualquier cambio en esos archivos marca la página como sospechosa.

## 3. Cuando el producto cambia (flujo recomendado)

1. Obtener el código nuevo (ZIP o repos) y apuntar `ISPMAX_FE_SRC` / `ISPMAX_BE_SRC`. Si hay historial git
   (`frontend-isp`, `backend-isp`), el commit exacto de la versión verificada se halla comparando los hashes de
   `docs/_trace.json` con `git show <commit>:src/<ruta>` (los hashes son SHA-256 de 16 hex del archivo con LF);
   `git diff <commit> HEAD -- src/<ruta>` da entonces el cambio real y su sentido, que `docs-stale` no puede dar.
   Versión actual: FE `99b38a14` y BE `3057b787` (ZIP del 2026-10-06) → FE `afd79206` y BE `7501da79` (`zip-2026-10-14`) →
   FE `e7d5d06b` y BE `f0d1ebf7` (2026-11-04), etiqueta `main-2026-11-04`. `docs-stale` solo vigila los archivos listados en `codigo:`: un cambio en
   un archivo sin citar (p. ej. una pasarela nueva) no avisa; conviene un `git diff --stat` completo entre commits.
2. `node scripts/docs-stale.mjs` → `notes/_generated/stale.md`: páginas con código cambiado, rutas nuevas
   sin documentar, rutas desaparecidas.
3. Para cada página sospechosa: leer el diff del archivo citado, actualizar el texto, reproducir en la instancia,
   regenerar capturas (`tools/capture --only <prefijo>`), actualizar `verificado`.
4. Funcionalidad nueva → alta en `notes/inventory/<dominio>.md` (ID nuevo), página(s) con `funcionalidades: [ID]`,
   al menos una pregunta en `user-questions.md`.
5. Regenerar lo generado a partir del código: `node scripts/gen-permisos.mjs` y `node scripts/gen-mensajes.mjs`.
6. `node scripts/docs-stale.mjs --record` al terminar; commit; el CI valida enlaces, cobertura y preguntas.
7. Capturas: las páginas con figura generada por `tools/capture` se regeneran con `node capture.mjs --only <prefijo>` (los datos que necesita cada una están en `notes/entorno.md`: la instancia lee la caché de Redis, así que tras cambiar ajustes por SQL hay que borrar la clave `settings:findAll`).

## 4. Cuando alguien reporta que el manual no ayudó

1. Añadir la pregunta tal como la escribió a `user-questions.md` (con rol, página esperada y frases clave).
2. `node scripts/eval-questions.mjs` — si falla por búsqueda: añadir `sinonimos` / encabezado / FAQ;
   si falla por contenido: completar la página.
3. Si el problema es nuevo: crear página en `docs/problemas/` y enlazarla desde la tarea.

## 5. Revisión periódica (mensual, 30 min)

- `docs-coverage.md`: ¿hay dominios por debajo de la meta? ¿páginas "parcial/pendiente" que ya se pueden validar?
- Páginas con `verificado.sin_probar`: ¿hay ahora una instalación con ese servicio (router, OLT, WhatsApp, SRI, pasarela…)? Si sí, probar lo que dice su aviso `Servicio externo no probado` y retirar la etiqueta.
- `docs-validation.md`: variantes que no encuentran su página.
- `notes/_generated/stale.md`: verificaciones con más de 180 días.
- `docs-backlog.md`: priorizar lo que depende de datos de usuario (capturas de flujos con servicios externos).

## 6. Alcance y límites

- Las comprobaciones detectan **cambios**, no verdad: una página sin cambios de código puede estar mal desde el
  inicio. Por eso existe el banco de preguntas y la verificación en la UI.
- El código del producto no vive en este repositorio: el CI público no puede ejecutar `docs-stale`. Se ejecuta
  localmente o en un job con acceso a los repos privados.
- La instancia de capturas es sintética y aislada; nunca apuntar `tools/capture` a un entorno real
  (la herramienta solo acepta `localhost`).

### Medir el avance

`node scripts/docs-progreso.mjs` (siempre la fuente de las cifras; nunca teclearlas a mano). Siete ejes ponderados, 100 puntos:

| Eje | Peso | Qué mide |
|---|---:|---|
| A Cobertura funcional | 15 | funcionalidades con página / en alcance (`docs-coverage.md`) |
| B Páginas por escribir | 20 | (tareas + referencias hechas) / (hechas + pendientes conocidas, `PEND_ESCRIBIR` en el script) |
| C Páginas sin pendientes | 25 | páginas de contenido `verificado` / total |
| D Capturas al día | 10 | figuras de la instancia ficticia (en subcarpeta) / todas; las de nombre plano son antiguas |
| E Servicios externos reales | 10 | flujos probados contra el servicio real: 0 (fuera de alcance por decisión de la persona usuaria) |
| F Inventarios con evidencia | 5 | grupos de inventario con lectura completa (todos) |
| G Publicación | 15 | CI verde (1/3) + fusionado a `main` (1/3) + imagen Docker publicada (1/3; la despliega otra persona, fuera de alcance) |

Estado al 2026-10-30: **85,0 %** (94,4 % sin E; 100 % del alcance acordado, sin E ni imagen). Historia: 50,5 % (2026-10-22) → 55,5 → 68,7 → 70,3 → 76,4 → 84,2 → 85,0
(2026-10-26). Cuenta con que el porcentaje puede **bajar** si aparece alcance nuevo (más páginas pendientes o código nuevo que invalide páginas). Se mueve más cerrando páginas `parcial` (eje C, 25 puntos) y publicando (eje G) que escribiendo páginas nuevas. En cada reporte se muestra antes → ahora.

### El buscador del sitio

El buscador de serie de Rspress solo muestra páginas donde la frase escrita aparece **literal** en un título, encabezado o párrafo, y no lee los `sinonimos` del frontmatter: con preguntas naturales casi nunca devuelve algo. Por eso `src/search/hooks.mjs` (enganchado con `search.searchHooks` en `rspress.config.ts`) sustituye sus resultados por los de `src/search/engine.mjs`: BM25 sobre título, encabezados, sinónimos, descripción y texto, con raíces de palabra y búsqueda por prefijo mientras se escribe. Si algo falla, el panel conserva el resultado de serie.

- Una página se encuentra por lo que dicen su título, sus encabezados, su `description` y sus `sinonimos`: al escribir una página nueva, pon en `sinonimos` las formas reales de preguntarlo.
- Tras cambiar `engine.mjs` o los pesos de `build-search-data.mjs`: `node scripts/build-search-data.mjs && node scripts/eval-search.mjs --lista`.
- Probar en el navegador (`npm run build`, imagen o `npm run preview`, `Cmd/Ctrl+K`): "no aparece el cliente al cobrar" debe devolver «No encuentro al cliente en Registrar Pago».

## 7. Qué NO se publica

El sitio del manual puede ser público. Fuera de `docs/` quedan los hallazgos de seguridad, cuentas internas,
endpoints y secretos de despliegue (`notes/`, `docs-backlog.md`). Ver `notes/decisiones.md`.
