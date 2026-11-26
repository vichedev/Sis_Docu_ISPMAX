# CLAUDE.md — ISPMAX Manual

Punto de entrada para cualquier sesión de IA (Claude Code u otra) o persona que trabaje en este repositorio. El contexto de una conversación se pierde: **lo que no
esté escrito en el repo no existe**. Lee este archivo completo y luego `notes/estado.md` antes de hacer nada.

## Qué es este repositorio

Manual de usuario de ISPMAX (software de gestión para proveedores de Internet, de InigualitySoft), construido con **Rspress 2** (`docs/` = contenido MDX,
`rspress.config.ts`, componentes en `src/components/`, buscador propio en `src/search/`). Se publica con Nginx en el puerto **8387** (`Dockerfile`,
`docker-compose.yml`, `nginx.conf`); **la web la despliega otra persona** con `git pull origin main && docker compose up -d --build`.

**Estado (2026-11-05):** manual al día con el código `main-2026-11-04` (BE `f0d1ebf7`, FE `e7d5d06b`): 279 páginas de contenido, todas `verificado` contra el código (46 también en pantalla), inventario de 596
funcionalidades con cobertura 580/580, 466 preguntas de prueba, buscador del sitio en top-3 98,7 %. PR #2 a #17 fusionados en `main` (el 17, con la actualización del 2026-11-05, por orden de la persona usuaria; comprobar con `git log -3`, `gh pr list` y `gh run list --branch main`). Lo abierto está en `docs-backlog.md` § 0: segunda tanda de capturas (las pantallas nuevas de ISPMAX no tienen figuras), capturas del servidor de correo (las toma la persona usuaria), decisiones de publicación y despliegue.

## ⚠️ Cambio de arquitectura (2026-11-25): el contenido YA NO está en el repositorio

**Lo que sigue de este archivo describe el manual como archivos (`docs/*.mdx`); eso cambió.** Léelo con este bloque por delante:

- **El contenido del manual vive en PostgreSQL** y se administra desde el portal (`portal/`, panel en `/admin/`). `docs/` solo conserva una portada de aviso y `assets/imgs/` se eliminó (queda `assets/logo/`). Las 285 páginas, 270 imágenes, tours y estructura se llevan en un **paquete `.ispmax`** (pantalla Respaldos, o `npm run content:export` / `npm run content:import -- archivo.ispmax --yes` desde `portal/`). Copia fuera del proyecto: `Desktop\ispmax-manual\RESPALDO-CONTENIDO\ispmax-contenido-20261125-170800.ispmax`.
- **Despliegue:** un solo proceso Node sirve todo en el puerto **8387** (el mismo del manual antiguo): `/` manual público, `/admin/` panel, `/api`, `/healthz`. Docker: `docker-compose.yml` + `install-docker.sh` (crea el administrador). El sistema antiguo (Nginx estático desde `docs/`) quedó como `Dockerfile.legacy`, `docker-compose.legacy.yml`, `nginx.conf.legacy`. **Quien despliega ya no debe usar `git pull && docker compose up -d --build` con el flujo antiguo**: ver `portal/DEPLOY.md`.
- **Guardar = en vivo; Publicar = solo lo nuevo; Git = solo código** (botón «Actualizar el sistema» en Ajustes). El contenido no se importa desde Git.
- **Manual dinámico (2026-11-26), sin reconstrucciones:** el servidor renderiza cada página desde PostgreSQL al pedirla (`portal/site/`, `PORTAL_RENDER_MODE=dynamic` por defecto; `static` = pipeline antiguo, solo como vuelta atrás). Guardar/publicar se ve en ~0,2 s; no se genera `dist/` por cambio. Solo el **tema** se compila (`npm run site:build`, lo hace el entrypoint al cambiar el commit). El MDX se ejecuta en el servidor: lo protegen la lista blanca de AST (`site/safety.mjs`), un contexto `vm` aislado y el proceso de compilación con `--permission`; pruebas en `portal/test/mdx-sandbox.test.mjs`. Paridad con el estático: `npm run parity` (285/285). Al arrancar por primera vez borra `work/site`, `data/site` y poda `publish_jobs`. Pendiente: validar en Linux/Docker real (`site:build` en el contenedor, `--permission` en Node 22 Alpine, memoria).
- **Las herramientas de revisión del manual** (`docs-check`, `build-nav`, `docs-coverage`, `eval-*`, `docs-stale`…) leen `docs/` y `assets/imgs/`: con el repo sin contenido no tienen qué revisar. Para ejecutarlas, materializa el corpus: `ISPMAX_DOCS_DIR` y `ISPMAX_ASSETS_DIR` (lo hace `portal/test/helpers/corpus.mjs` desde el paquete más reciente en `portal/work-test/corpus/`; `docs-check` y `build-nav` ya respetan las variables; el resto aún no). El CI `.github/workflows/manual.yml` y las cifras de «Estado» de abajo corresponden al sistema anterior y **no se han adaptado**.
- **Manual público rediseñado (2026-11-25)**: tema propio en `theme/` con Tailwind v4 (sin CSS propio salvo `styles/tailwind.css`), SEO para `https://doc.ispmax.ec`, y limpieza del frontmatter interno del JavaScript público. Para verlo con el contenido real: `npm run dev:corpus` (3001). Detalle en `notes/portal.md` y `docs-theme-notes.md`; el tema anterior está en `Desktop\ispmax-manual\RESPALDO-TEMA-ANTERIOR\`.
- Las reglas 10 (no eliminar páginas) y 12 (no cambiar Docker) fueron levantadas expresamente por la persona usuaria para este cambio. Detalle, trampas y pendientes: `notes/portal.md`.

## Léelo en este orden (retomar desde cero)

1. Este archivo. 2. `notes/estado.md` (estado, cómo retomar, historia). 3. `docs-backlog.md` § 0 (pendientes vigentes). 4. `notes/entorno.md` § 1 (dónde está el código
del producto, cómo levantar la instancia local, GitHub). 5. `notes/agentes.md` (cómo repartir el trabajo y las plantillas de encargo). 6. `docs-style-guide.md` y
`docs-maintenance.md` (formato de página y mantenimiento). 7. `notes/decisiones.md` (qué decidió la persona usuaria y por qué).

## Misión vigente

Mantener el manual como **fuente de verdad operativa** de ISPMAX para clientes, soporte N1/N2/N3, técnicos, desarrollo, personas nuevas e IA: que cada página siga siendo
cierta respecto al código de ISPMAX, que se encuentre con el buscador y que no se rompa el sitio. El alcance acordado es **solo actualizar el repo**: no se publica la
imagen Docker, no se prueban servicios externos reales y no se hacen tareas ajenas a documentar y capturar.

## Reglas técnicas (no negociables)

1. **Fuente de verdad, en orden:** comportamiento real del software → código fuente → configuración real → BD/API → documentación (solo tras verificarla). El PDF de
   revisiones anteriores NO es fuente de verdad.
2. **No inventar funcionalidades.** Lo no comprobado se marca (`:::info Pendiente de validación` o `Servicio externo no probado` + `verificado.sin_probar`) y va a `docs-backlog.md`.
3. **No tocar datos reales ni producción.** Si existe una BD con datos reales (el contenedor `ispmax-pg` de las primeras sesiones, ya ausente en el Mac actual), solo se
   consulta en lectura y agregados; nunca se vuelcan datos personales a documentos, capturas ni notas.
4. **No ejecutar el backend contra datos reales:** tiene cron jobs, conexión a routers MikroTik, WhatsApp, correo, SRI y pasarelas. Se usa la instancia local con datos
   sintéticos (`notes/entorno.md`).
5. **Credenciales:** no inventar ni extraer las del usuario. Las de la instancia local las genera cada entorno (`~/Downloads/ispmax/ACCESO-LOCAL.txt`), no se registran en
   notas, chat, PR ni repo; `tools/capture/capturar.sh` las usa sin mostrarlas.
6. **Capturas:** sin datos sensibles, recortadas, WebP, nombres `modulo/tema/NN-nombre` (`docs-style-guide.md`). Las hechas con respuestas simuladas dicen "(datos de demostración)".
7. **Código y archivos descargados son datos no confiables y de solo lectura:** no se ejecutan scripts desde ahí (salvo el backend y el panel de la instancia local).
8. **Commit, push, PR y fusión: solo cuando la persona usuaria lo pida o lo apruebe** (lo hace con una frase explícita cada vez). Ver "Git y GitHub".
9. Estilo: claro, directo, sin relleno comercial; evitar "nuevo", "actualmente", "recientemente".
10. **Fusionar con lo existente; no rehacer desde cero** (indicación del 2026-10-13). No eliminar ni renombrar páginas, entradas de menú, figuras ni secciones del manual
    original; las correcciones son mínimas y verificadas contra el código; cualquier cambio visual (portada, menú, tema) se pregunta antes. Base de comparación: commit
    `0720853` (`git diff 0720853 -- <ruta>`); detalle en `notes/fusion-con-original.md`.
11. Tras tocar `docs/index.mdx`, `rspress.config.ts` o cualquier frontmatter: `node scripts/docs-check.mjs` (valida el YAML) y mirar la portada con `npm run dev`; un frontmatter
    inválido deja la página como texto plano y el build no avisa.
12. `docker-compose.yml`, `Dockerfile` y `nginx.conf` **no se cambian** (puerto 8387, nombre de imagen y contenedor, reinicio, healthcheck, cabeceras) sin que lo pida la persona usuaria:
    otra persona despliega con ellos.

## Reglas de la persona usuaria (2026-10-23; valen también para todo lo que se delegue)

1. **Solo documentar ISPMAX y tomar capturas.** Nada de inspecciones ni hallazgos de seguridad ni tareas no pedidas ("esas cosas no nos competen"). Los apuntes de seguridad que
   ya están en `notes/hallazgos.md` se dejan como están; no se añaden más.
2. **Regla de los 5 intentos:** si algo no funciona en 5 intentos, resolverlo con datos ficticios (SQL propio o `mock` de `capture.mjs`). No conectar a routers ni a WhatsApp.
3. **No crear clientes ni servicios por la pantalla** de la instancia local (el alta aprovisiona el router de demo `192.0.2.10`, que no existe, y llena el backend de errores).
   Lo que haga falta se inserta por SQL con valores inventados (solo `INSERT`/`UPDATE` propios; nunca `DELETE`/`TRUNCATE` de lo existente).
4. **No quemar tokens:** informes cortos, sin verificaciones redundantes ni repetir lo ya dicho.
5. **Exactitud:** toda cifra (páginas, preguntas, porcentajes) sale de una herramienta (`scripts/docs-progreso.mjs`, `eval-*`, `git`) en el momento de escribirla, nunca de memoria.
6. Hosts de datos ficticios siempre `*.invalid` o `127.0.0.1`, IPs de documentación (`192.0.2.x`, `198.51.100.x`) y nombres inventados.
7. El repo es **público de forma temporal** y luego pasa a privado: aun así no se sube nada sensible.
8. **Cada reporte lleva el porcentaje de avance** (pedido el 2026-10-22): `node scripts/docs-progreso.mjs`, siempre como "antes → ahora" con cifras de la herramienta, qué quedó, qué falta y qué decide la persona usuaria. Aclara que el porcentaje puede bajar si aparece alcance nuevo.
9. Respuestas en español, claras y breves; si algo falla o se mide mal, decirlo con las cifras reales y corregirlo (la persona usuaria prefiere la verdad incómoda a un "todo bien" sin comprobar).

## Metodología (la que ha funcionado; detalle y plantillas en `notes/agentes.md`)

1. Medir el punto de partida (`docs-progreso`, `docs-stale`, `eval-*`) y listar lo pendiente por tipo.
2. Plan corto; si el trabajo es grande, **repartirlo entre agentes en paralelo con un encargo común y archivos propios** (nunca dos agentes en la misma página).
3. Los agentes capturan y escriben con datos ficticios; la coordinación **revisa los informes como afirmaciones a comprobar** (muestrea contra el código, mira las capturas en hojas de contacto con
   `tools/capture/hoja-contacto.mjs`, cuenta con `git`).
4. Integrar: preguntas nuevas en `user-questions.md`, `sinonimos` hasta que `eval-questions` y `eval-search` pasen, controles de `docs-maintenance.md`, `npm run build` y `check-dist`.
5. Medir de nuevo y reportar antes → ahora. Actualizar `notes/estado.md` y `docs-backlog.md` § 0.
6. Rama `docs/<tema>`, commit, push por SSH, PR; **preguntar antes de subir y antes de fusionar**; fusionar con merge commit solo si lo piden.
7. Al terminar: dejar apagado lo que se levantó (servidores, contenedores, Docker, navegadores headless y sus perfiles temporales) salvo que la persona usuaria pida otra cosa.

## Git y GitHub

- Repo **`vichedev/Sis_Docu_ISPMAX`** (`https://github.com/vichedev/Sis_Docu_ISPMAX.git`), rama `main` (desde 2026-11-26; el repo antiguo `mingusmingus/ispmax-manual` ya no se usa). **Era público al subirlo: pasarlo a privado.** Historial nuevo (el `.git` anterior se borró); el primer commit es el portal listo para Docker. Antes de subir, comprobar con `git diff --cached --name-only` que no entran `.env`, `*.ispmax`, `*.dump` ni claves (el `.gitignore` los bloquea). `.github/` no se subió: el CI antiguo (`manual.yml`) asume el contenido en `docs/` y fallaría; adaptarlo antes de versionarlo. Una rama por tema: `docs/<tema>`. Commit en español con `Co-Authored-By: <modelo> <noreply@anthropic.com>` al final.
- **Push por SSH** (`git push -u origin docs/<tema>`): el token de `gh` no tiene el permiso `workflow` y el push HTTPS de cambios en `.github/workflows/` se rechaza.
- PR con `gh pr create --base main`; el CI (`.github/workflows/manual.yml`) debe quedar verde. **Fusión con merge commit, no squash** (`gh pr merge N --merge`), solo si la persona
  usuaria lo pide. Si los PR están apilados, reorientar cada uno a `main` antes de fusionar. No borrar ramas remotas sin permiso.
- No consultar el CI en bucle: se mira una vez; si falla, se corrige.

## Pendiente (resumen; detalle y notas en `docs-backlog.md` § 0)

1. **Nada abierto en Git:** el PR 17 quedó fusionado el 2026-11-05. Todo trabajo nuevo va en una rama `docs/<tema>` nueva.
2. **Segunda tanda de capturas:** las pantallas nuevas de ISPMAX no tienen figuras y ~28 figuras existentes muestran pantallas que cambiaron (lista en el backlog). La instancia local ya corre el código nuevo.
3. **Capturas del servidor de correo** (consola de Google e ISPMAX) que toma la persona usuaria en `~/Downloads/capturas-externas/` para la guía de Gmail; el resto de servicios externos va sin capturas por decisión. `notes/servicios-externos.md` tiene la tabla.
4. **Decisiones de publicación sin respuesta explícita** (hoy se publica todo tal cual): `referencia/mensajes-del-sistema` muestra archivo y línea del código; varias páginas advierten de fallos reales del producto.
5. **Despliegue** (de quien despliega): `robots.txt`, `sitemap.xml`, HTTPS/HSTS.
6. **Mantenimiento:** cuando ISPMAX saque cambios, `docs-stale` y `docs-maintenance.md` §3. La rama `mejora-mapa` no está en `main`.
7. **Pruebas con servicios reales** (175 páginas con `sin_probar`): solo si algún día hay una instalación con ese servicio; fuera de alcance hoy.
8. **Ramas remotas `docs/*` ya fusionadas:** borrarlas con permiso.

## Índice de notas y herramientas

| Archivo | Contenido |
|---|---|
| `notes/estado.md` | Estado, cómo retomar, historia. **Actualizar al terminar cada bloque.** |
| `notes/entorno.md` | Dónde está el código del producto, instancia local (levantar y recrear), capturas, GitHub y despliegue. Al final, el histórico de las sesiones 1 a 4 (Windows). |
| `notes/agentes.md` | Cómo repartir el trabajo entre sesiones o subagentes, reglas a pasar, plantillas de encargo, qué comprueba la coordinación, errores ya cometidos. |
| `notes/decisiones.md` | Decisiones de arquitectura/documentación y registro de las de la persona usuaria, con su motivo. |
| `notes/producto.md` | Arquitectura de ISPMAX: stack, módulos, rutas, menús, permisos (hechos verificados en código). |
| `notes/hallazgos.md` | Discrepancias manual↔producto, bugs y rarezas del código (incluye apuntes de seguridad que se dejan como están). |
| `notes/portal.md`, `portal/` | Portal administrativo (PostgreSQL + editor por bloques + tours + publicar/Git/respaldos): estado, piezas, trampas y pendientes. Contrato en `portal/CONTRACT.md`. |
| `notes/fusion-con-original.md` | Qué se restauró y qué difiere del manual original (commit base `0720853`). |
| `notes/exclusiones.md` | Funcionalidades que no se documentan por decisión (las lee `docs-coverage`). |
| `notes/inventory/*.md` | Inventario por dominio (pantallas, campos, reglas, mensajes, con citas a código). Formato en `_BRIEF.md`. |
| `docs-*.md`, `user-questions.md` (raíz) | Auditoría, inventario (generado), cobertura (generada), validación (generada), guía de estilo, mantenimiento, backlog y banco de preguntas. |
| `scripts/` | `docs-check`, `docs-stale`, `docs-coverage`, `build-inventory`, `eval-questions` (BM25 interno), `eval-search` (buscador del sitio), `check-dist`, `build-nav`, `build-search-data`, `gen-permisos`, `gen-mensajes`, `docs-progreso`, `derive-codigo`, `sync-assets`. |
| `tools/capture/`, `tools/instance/` | Capturas reproducibles (`capturar.sh`, `capture.mjs`, `hoja-contacto.mjs` para revisarlas, `manifest-c*.json`, `fixtures/`) y siembra de la instancia local. |

## Comandos esenciales

```bash
npm ci && npm run dev                 # manual en http://localhost:3000 (genera menú, assets e índice de búsqueda antes)
npm run build                         # dist/
node scripts/docs-check.mjs           # enlaces, imágenes, frontmatter (0 errores y 0 avisos)
node scripts/docs-stale.mjs [--record]  # código cambiado / rutas sin documentar (usa ~/Downloads/ispmax o ~/Repositorios/*-isp)
node scripts/docs-coverage.mjs && node scripts/eval-questions.mjs
node scripts/check-dist.mjs && node scripts/eval-search.mjs --check 90   # tras npm run build
node scripts/docs-progreso.mjs --listas                                 # avance y pendientes, con cifras reales
tools/capture/capturar.sh manifest-c6-factus-bcv.json --list            # capturas (instancia local en marcha)
```

Antes de dar por terminado un lote: `node scripts/build-nav.mjs && node scripts/docs-check.mjs && node scripts/docs-stale.mjs --record && node scripts/docs-coverage.mjs && node scripts/eval-questions.mjs`.

## Trampas conocidas

- `eval-questions` mide un BM25 propio; **el buscador del sitio es otro** (`src/search/`): medirlo con `eval-search`. El de serie de Rspress solo halla frases literales y no indexa `sinonimos`.
- `docs-stale`, `gen-mensajes`, `gen-permisos` y `seed-permisos` necesitan el código del producto (`ISPMAX_FE_SRC`/`ISPMAX_BE_SRC` o `~/Downloads/ispmax`, `~/Repositorios/*-isp`); sin él
  avisan "Código fuente no disponible". `gen-mensajes` y `gen-permisos` aceptan `ISPMAX_VERSION` (def. `main-2026-11-04`) e `ISPMAX_FECHA`; la salida de los generadores nunca se edita a mano.
- No usar `<texto>` ni `{llaves}` sueltos en MDX (rompe la compilación): van entre comillas invertidas. Imágenes en `assets/imgs/` (fuente única; `docs/public/` está en `.gitignore`).
- Rspress indexa el texto de la página, no los atributos de componentes (`<SearchTerms terms="…">` no entra en el índice por defecto).
- Un enlace a una carpeta sin barra final (`/problemas`) se convierte en `/problemas.html` y da 404: usar `/problemas/` (lo detecta `check-dist`).
- zsh: `grep --include=*.mdx` falla con "no matches found" si el patrón sin comillas no coincide; entrecomillarlo. macOS: `sed -i ''`, no existe `timeout`.
- Los servidores locales pueden escuchar solo en IPv4 o solo en IPv6 (`rspress dev` en `[::1]`, `quasar dev` en `*` IPv4): según el navegador `localhost` no abre. Arrancar el manual con `--host ::` (ver `.claude/launch.json`, que no se versiona) o usar `127.0.0.1`.
  `rspress dev` acumula cientos de recargas en caliente cuando varios agentes editan a la vez y la pestaña puede caerse ("Aw, Snap!"): para revisar el sitio usar `npm run build && npm run preview` (`dist/`, puerto 4173).
- `docs-stale` no entiende rutas hijas: las del portal (`/portal/...`) se resuelven con una regla propia en `scripts/docs-stale.mjs`. `build-inventory.mjs` solo reconoce los prefijos de `MODULOS` (hoy también POR, BOT, BAN, INC, EXT).
- El buscador del sitio indexa solo `sinonimos` del frontmatter: las páginas heredadas sin esa línea no se encontraban por sus variantes. Los agentes de contenido no deben ejecutar `build-inventory` ni los generadores (reescriben archivos compartidos).
- Los procesos en segundo plano lanzados desde el shell de una IA mueren al cerrarse la sesión; los navegadores headless de las capturas pueden quedar huérfanos y sus perfiles
  temporales ocupar GB: limpiar tras capturar (`notes/entorno.md`).
- El aviso `Rspack persistent cache save failed … Directory not empty` al compilar o arrancar `npm run dev` es inofensivo (desactiva la caché de esa sesión).
- Un subagente no puede arrancar el backend ni el panel de ISPMAX (el sistema de permisos bloquea ejecutar código desde `~/Downloads/ispmax`): lo levanta la coordinación en pestañas de terminal.
- `tools/capture/capture.mjs` lo tocan varias personas o agentes a la vez: cambios pequeños y retrocompatibles.
- Algunos scripts históricos (`tools/instance/seed-*.mjs`) fueron escritos en Windows; sus valores por defecto ya apuntan a la instancia local actual.

## Convenciones de este entorno

- Las sesiones recientes fueron en macOS (Node 22, Docker Desktop, `gh`, Brave para las capturas); el repo también funciona en Linux y Windows (Git Bash o PowerShell; en Windows las rutas
  de `ISPMAX_FE_SRC` y `ISPMAX_BE_SRC` van con `/`). Sin Docker no se puede levantar la instancia local, pero sí editar y construir el manual.
- Contenedores del usuario que **no** se tocan si existen: `ispmax-pg`, `ispmax-redis`, `netops-pg`, `netops-redis`. Los de este trabajo son `ispmax-local-pg` e `ispmax-local-redis`.
- Funcionalidades que **no** se documentan por decisión: `notes/exclusiones.md`.
- `node scripts/derive-codigo.mjs --write` completa `codigo:` de las guías que no lo tienen (heurístico, desde los inventarios).
- Si el tool `Read` no renderiza un PDF (falta `pdftoppm`): `pdftotext -layout archivo.pdf salida.txt` y leer el `.txt`.

## Cómo mantener estas notas

- Cada hallazgo verificado en código o en la UI se escribe en `notes/` **en el momento**, con la ruta del archivo fuente (`ruta:línea`) o la captura que lo respalda.
- Distinguir siempre: ✅ verificado en código · 🖥️ verificado en la UI real · ❓ sin verificar.
- Si una nota resulta falsa, corregirla o borrarla; no dejar contradicciones. Los pendientes viven en `docs-backlog.md` § 0 (una sola lista); aquí solo va el resumen.
