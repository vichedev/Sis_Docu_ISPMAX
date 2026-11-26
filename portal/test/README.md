# Pruebas del portal y corpus de contenido

Varias pruebas y herramientas necesitan el contenido real del manual (285 páginas, 270 imágenes y 3 archivos de apoyo):
`portal/test/{content,structure-nav}.test.mjs`, `portal/web/test/{blocks,editor}.test.mjs`, `npm run roundtrip` y
`server/dev-test-server.mjs` (importación inicial de su base propia). Ninguna lee `docs/` ni `assets/` con rutas fijas: todas
piden el **corpus** a `portal/test/helpers/corpus.mjs`.

## `getCorpus()`

Devuelve `{ available, source, root, docsDir, assetsDir, extraFiles, skipReason }`. `root` es una raíz «tipo repo»
(`docs/`, `assets/`, `src/legacy-routes.json`), lo que espera `importFromRepo`. Orden de decisión:

1. `ISPMAX_CORPUS_DIR`: una raíz tipo repo ya preparada.
2. `ISPMAX_FORCE_CORPUS=1`: se ignora el repo (así se prueba el escenario sin `docs/`).
3. El repo, mientras tenga >= 250 `.mdx` en `docs/`.
4. El paquete `.ispmax` más reciente de `portal/data/backups/content/` (o `ISPMAX_CORPUS_PACKAGE`: archivo o carpeta).
   Se **materializa** en `portal/work-test/corpus/` con la misma lógica que `exportToDir` (`renderPage`, tours, redirecciones
   y archivos de apoyo; solo páginas publicadas). La caché se identifica por el sha256 del paquete: un paquete nuevo la
   reconstruye solo. Varios procesos a la vez se coordinan con un candado (`corpus.lock`).

Si no hay repo ni paquete, `corpusSkip` trae el motivo y las pruebas que lo necesitan se **saltan** (`skip`) mostrándolo; nunca
fallan en silencio. Todas imprimen `# corpus: <origen> (<ruta>)` al empezar.

## Cómo generar o regenerar el paquete

Desde `portal/`, con la base real cargada (`DATABASE_URL`): `npm run content:export` (deja `ispmax-contenido-AAAAMMDD-HHMMSS.ispmax`
en `portal/data/backups/content/`). El paquete exportado desde la base refleja lo que se haya editado en el portal: si, por
ejemplo, se cambió el menú de `/guia`, `docs/sidebar.json` del corpus difiere del que tuviera el repo (es lo esperado).

## Variables

| Variable | Efecto |
|---|---|
| `ISPMAX_CORPUS_DIR` | Usa esa raíz tipo repo tal cual. |
| `ISPMAX_FORCE_CORPUS=1` | Ignora el repo; usa el paquete. |
| `ISPMAX_CORPUS_PACKAGE` | Paquete (o carpeta de paquetes) a materializar en vez del más reciente. |
| `ISPMAX_DOCS_DIR`, `ISPMAX_ASSETS_DIR` | Para los scripts de la raíz (`scripts/lib/manual.mjs`): sustituyen a `docs/` y `assets/imgs/`. |

Para usar los scripts de la raíz sobre el corpus: `ISPMAX_DOCS_DIR=<root>/docs ISPMAX_ASSETS_DIR=<root>/assets/imgs node scripts/docs-check.mjs`.
`build-nav` **escribe** `_nav.json` y los `index.mdx` de cada sección en `ISPMAX_DOCS_DIR`: ejecútelo sobre una copia (así lo hace
`structure-nav.test.mjs`, en `portal/work-test/nav-test/`), no sobre la caché del corpus ni sobre el repo.

## Ejecutar

```
cd portal && npm test                                   # 83 pruebas (usa TEST_DATABASE_URL)
cd portal/web && node --test test/*.test.mjs            # 70 pruebas
cd portal && npm run roundtrip                          # ida y vuelta, 0 diferencias
ISPMAX_FORCE_CORPUS=1 npm test                          # igual, sin mirar el repo
```
