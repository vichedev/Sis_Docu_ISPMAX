# Contrato del portal (leer completo antes de escribir código)

Portal administrativo del manual ISPMAX. **PostgreSQL es la fuente de verdad** del contenido; Rspress sigue generando el sitio público.
Flujo: editar en el portal → BD → **Publicar** (exporta BD → `.mdx`/assets en un directorio de trabajo, `npm run build`, deja `dist/`).
Solo local por ahora: **sin Docker**. Node 24, módulos ESM (`.mjs`), sin TypeScript en el servidor.

## Reglas
- Trabaja solo en tus carpetas (abajo). Nunca edites archivos de otro agente; si necesitas un cambio, descríbelo en tu informe final.
- Nunca modifiques `docs/`, `assets/`, `src/`, `scripts/` ni `rspress.config.ts` del repo (solo se LEEN). Todo lo generado va a `portal/work/` o `portal/data/` (ignorados por Git).
- BD: `DATABASE_URL` (datos reales del portal) y `TEST_DATABASE_URL` (pruebas destructivas: úsala para `TRUNCATE`/pruebas de ida y vuelta). Esquema en `db/schema.sql` (no lo cambies; si falta algo, pídelo en el informe). Usa `server/db.mjs` (`db.query`, `tx`) y `server/env.mjs`.
- No toques otras bases de PostgreSQL. Credenciales solo desde `portal/.env`; nunca las escribas en código, logs ni informes.
- Comandos externos (`git`, `pg_dump`, `npm`): `execFile`/`spawn` con **lista de argumentos y lista blanca**, nunca `exec` con texto concatenado ni `shell: true`.
- Datos ficticios siempre; no subas nada a Git (no hagas commit).
- Español en textos de interfaz, mensajes y comentarios. Informe final corto.

## Carpetas y dueños
| Ruta | Dueño |
|---|---|
| `portal/server/sync/**` | Agente SYNC |
| `portal/server/ops/**` | Agente OPS |
| `portal/server/index.mjs`, `auth.mjs`, `routes/**`, `portal/test/api.*` | Agente API |
| `portal/web/**` | Agente WEB |
| `portal/README.md` | Agente DOC (al final) |
| `portal/db/`, `server/db.mjs`, `env.mjs`, `migrate.mjs`, `CONTRACT.md` | Coordinación (no editar) |

## Módulos con interfaz fija
- **SYNC** exporta desde `server/sync/index.mjs`:
  - `importFromRepo({ pool, repoRoot, overwrite:'all'|'unedited', log })` → `{pages, assets, siteFiles, skipped}`. Lee `docs/**/*.mdx`, `assets/**` y `site_files` (`docs/sidebar.json`, `src/legacy-routes.json`, `docs/index.mdx` va como página con route `/`).
  - `exportToDir({ pool, outDir, log })` → escribe en `outDir` un árbol idéntico a `docs/` (mdx), `assets/` y los `site_files`. Páginas `draft` o con `deleted_at` NO se exportan. Une `redirects` a `src/legacy-routes.json` (conservando el formato actual). Si `fm_raw` existe y `frontmatter` no cambió desde el import, usa `fm_raw` (byte a byte).
  - `buildFrontmatter(obj)` → texto YAML en el mismo estilo del repo; `parsePage(src)`.
  - `registerSyncRoutes(app, ctx)` (ver rutas). `ctx = { pool, db, tx, requireRole, audit, repoRoot, getSetting }`.
  - **Criterio de aceptación:** `npm run roundtrip` (importa el repo a `TEST_DATABASE_URL`, exporta, compara con el repo) debe dar **0 diferencias en las 285 páginas y los assets** (compara bytes). Informa cifras reales.
- **OPS** exporta desde `server/ops/index.mjs`: `registerOpsRoutes(app, ctx)` con el mismo `ctx`, más `ctx.sync = { exportToDir, importFromRepo }`.
  - Publicar: crear `portal/work/site/` (copia ligera del repo: `rspress.config.ts, tsconfig.json, package.json, package-lock.json, scripts/, src/, styles/`, `node_modules` enlazado a `../../node_modules` del repo por junction/symlink), `exportToDir` sobre ese directorio, ejecutar `npm run build` allí, y reemplazar `portal/data/site/` de forma atómica con el `dist/` resultante. Registrar el log en `publish_jobs` (kind `publish`). Un solo trabajo a la vez (409 si hay otro `running`).
  - Git: `status` (rama, remoto, último commit, commits por detrás/adelante tras `git fetch`), `update` = `git fetch` + `git merge --ff-only` en el repo (`repo_path`), solo si el árbol está limpio (si no, error claro; nunca `reset --hard` ni `checkout .`). Tras actualizar, devuelve qué archivos de contenido cambiaron (`docs/`, `assets/`) y ofrece reimportar con `overwrite:'unedited'` (no pisa páginas editadas en el portal).
  - Respaldo: `pg_dump` (formato custom `-Fc`, ruta `PG_DUMP_PATH`) a `portal/data/backups/ispmax-manual-AAAAMMDD-HHMMSS.dump`; descarga por HTTP; restauración con `pg_restore` solo admin con confirmación explícita. Retención configurable (`backup_keep`, def. 20). La clave de la BD se pasa por variable `PGPASSWORD` del proceso hijo, nunca por argumentos ni en logs.
  - Servir el sitio publicado: `GET /manual/*` desde `portal/data/site/` (estático, `@fastify/static`).
- **API** arranca todo: `index.mjs` crea Fastify (puerto `PORTAL_PORT`, def. 4380), cookies, auth, monta rutas propias + `registerSyncRoutes` + `registerOpsRoutes`, sirve la interfaz compilada `portal/web/dist/` en `/` (SPA con fallback a `index.html`, salvo `/api` y `/manual`), crea el admin inicial desde `PORTAL_ADMIN_USER/PORTAL_ADMIN_PASSWORD` si no hay usuarios (bcryptjs).
  - `requireRole(...roles)` es un `preHandler`. Jerarquía: `admin` ⊃ `editor` ⊃ `viewer` (pasar `'editor'` permite también admin).
  - `audit(userId, action, target, detail)` inserta en `audit_log`.
  - `getSetting(key, default)`.

## API HTTP (JSON; errores `{error:"mensaje en español"}` con código HTTP correcto)
Auth por cookie `portal_session` (HttpOnly, SameSite=Lax). Todo `/api/*` exige sesión salvo login/setup.

**Auth**: `POST /api/auth/login {username,password}` → `{user}` · `POST /api/auth/logout` · `GET /api/auth/me` → `{user:{id,username,display_name,role}}` · `PUT /api/auth/password {current,new}`.
**Estadísticas**: `GET /api/stats` → `{pages,drafts,assets,users,lastPublish:{status,finished_at}|null,lastBackup:{filename,created_at}|null,bySeccion:[{seccion,count}]}`.
**Páginas** (viewer lee, editor escribe):
- `GET /api/pages?seccion=&q=&status=&limit=&offset=` → `{total, items:[{id,route,title,seccion,grupo,orden,status,version,updated_at,updated_by_name}]}` (`q` usa full-text `spanish` + ILIKE en título/ruta).
- `GET /api/pages/:id` → página completa `{id,route,file_path,seccion,title,description,grupo,orden,frontmatter,body,status,version,updated_at}`.
- `POST /api/pages {seccion, slug, title, tipo:'tarea'|'guia'|'problema'|'pregunta'|'referencia'|'concepto', grupo?, description?}` → crea con plantilla del tipo (frontmatter completo y secciones vacías, `status:'draft'`), `orden` = último+1 del grupo. Ruta = `/{seccion}/{modulo?}/{slug}` (para `tareas` el módulo sale de `modulo` en el cuerpo de la petición, opcional en las otras).
- `PUT /api/pages/:id {title?,description?,grupo?,orden?,frontmatter?,body?,status?,version}` → 409 si `version` no coincide; incrementa `version`, guarda revisión, `updated_at`.
- `POST /api/pages/:id/move {seccion?,grupo?,slug?,modulo?}` → cambia ruta/archivo y registra `redirects`.
- `DELETE /api/pages/:id` (soft: `deleted_at`) · `POST /api/pages/:id/restore`.
- `GET /api/pages/:id/revisions` → lista · `POST /api/pages/:id/revisions/:revId/restore`.
- `POST /api/pages/validate {body, frontmatter}` → `{ok, problems:[{level,message,line?}]}` (detecta `<texto>`/`{llaves}` sueltos, frontmatter inválido, componentes desconocidos, rutas de imagen inexistentes).
**Estructura**: `GET /api/structure` → `{secciones:[{key,label,grupos:[{name,pages:[{id,title,route,orden,status}]}]}]}` · `PUT /api/structure/order {seccion, grupos:[{name,pageIds:[]}]}` (reescribe `grupo` y `orden` 1..n; permite mover páginas entre grupos y renombrar/crear grupos) · `GET/PUT /api/structure/guia-sidebar` (contenido de `docs/sidebar.json` en `site_files`).
**Assets**: `GET /api/assets?prefix=&q=` → lista sin bytes · `GET /api/assets/file?path=…` → bytes con su mime · `POST /api/assets` (multipart: `file`, `folder` ej. `imgs/acceso/contrasena`, `name?`) → convierte a WebP con sharp (calidad 82, sin ampliar), nombra `NN-nombre.webp` (NN correlativo en la carpeta) → `{path,width,height,url,snippet}` donde `snippet` es el `<Figure …/>` listo (misma sintaxis que las páginas actuales: `src="/assets/imgs/…"`, `width`, `height`, `max`) · `DELETE /api/assets?path=…` (409 si alguna página lo referencia, con la lista).
**Ajustes** (admin): `GET /api/settings` → `{settings:{clave:valor}, definitions:[{key,label,help,type,secret?}]}` · `PUT /api/settings {clave:valor,…}`. Claves: `site_title`, `site_url`, `repo_path` (def. raíz del repo), `git_remote`, `git_branch` (def. `main`), `build_command` (def. `npm run build`), `backup_dir`, `backup_keep`, `auto_publish` (bool), `contact_whatsapp`. Ninguna clave guarda contraseñas.
**Usuarios** (admin): `GET/POST /api/users`, `PUT/DELETE /api/users/:id` (no permitir borrarse a sí mismo ni dejar el sistema sin admin).
**Auditoría**: `GET /api/audit?limit=&offset=&action=`.
**Importación** (SYNC, admin): `POST /api/import {overwrite:'unedited'|'all'}` → `{jobId}` · `GET /api/jobs/:id` → `{id,kind,status,log,started_at,finished_at}` · `GET /api/jobs?kind=&limit=` (OPS y SYNC comparten `publish_jobs`).
**OPS** (admin salvo lectura): `POST /api/publish` → `{jobId}` · `GET /api/publish/status` · `GET /api/git/status` · `POST /api/git/update {reimport?:boolean}` → `{jobId}` · `GET /api/backups` · `POST /api/backups` → `{id,filename,size}` · `GET /api/backups/:id/download` (attachment) · `DELETE /api/backups/:id` · `POST /api/backups/:id/restore {confirm:"RESTAURAR"}`.

## Interfaz (WEB)
SPA React + Vite + TypeScript en `portal/web/`, build a `portal/web/dist/`, `npm run dev` con proxy de `/api` y `/manual` a `http://127.0.0.1:4380`. Sin librerías de UI pesadas (CSS propio; modo claro/oscuro). Español.
Pantallas: Login · Panel (stats, último publicado, acciones rápidas) · Páginas (lista con filtros/búsqueda, crear con plantilla) · Editor de página (metadatos en formulario simple; "avanzado" para frontmatter completo; cuerpo MDX con barra para insertar Paso/Aviso/Captura; subir imagen por arrastrar/pegar con el `snippet` insertado; validación en vivo con `/api/pages/validate`; revisiones; guardar con control de versión y aviso de conflicto) · Estructura (árbol por sección/grupo con arrastrar y soltar y renombrar grupos) · Imágenes (galería, subir, buscar, copiar snippet) · Publicar y Git (publicar con log en vivo por sondeo, estado de Git, actualizar desde Git) · Respaldos (crear, descargar, restaurar con confirmación) · Ajustes (formulario generado desde `definitions`) · Usuarios · Auditoría. Menús y botones según rol.
Vista previa: botón "Ver sitio publicado" → `/manual/`.

---
# Adenda: rediseño y tours (2026-11-25)

## Tours (datos y API)
Un tour es una secuencia de pasos sobre capturas del manual. Tabla `tours` (ver `db/schema.sql`).
Paso: `{ image:"imgs/clientes/lista/01-pantalla.webp" (ruta relativa a assets/, debe existir en `assets`), alt?:string, title:string, text:string (texto corto, admite **negrita**), spot?:{x,y,w,h} | null (rectángulo resaltado en % de la imagen, 0-100), link?:{label:string, route:string} | null (enlace a una página del manual, ej. "/tareas/clientes/crear-un-cliente") }`.
API (editor+ escribe, viewer lee; mismos formatos de error y 409 por `version` que páginas):
- `GET /api/tours?q=&status=` → `{items:[{id,slug,title,description,status,stepsCount,version,updated_at,updated_by_name}]}`
- `GET /api/tours/:id` → `{id,slug,title,description,steps,status,version,updated_at}`
- `POST /api/tours {slug,title,description?}` → crea en `draft` con 0 pasos. `slug` `[a-z0-9-]`, único (409 si existe, también borrado).
- `PUT /api/tours/:id {title?,description?,steps?,status?,version}` → valida pasos (imagen existente en `assets`, `spot` dentro de 0-100, textos no vacíos al publicar; `published` exige ≥1 paso); 409 si la versión no coincide.
- `DELETE /api/tours/:id` (soft) · `POST /api/tours/:id/restore` · `POST /api/tours/:id/duplicate {slug}`.
- Respuestas incluyen `snippet: '<Tour id="slug" />'`.
Exportación (SYNC): cada tour `published` y no borrado se escribe en `assets/tours/<slug>.json` con `{"slug","title","description","steps":[…]}` (2 espacios, salto final LF). La importación de repo NO trata `assets/tours/*.json` como assets: los lee como tours (si no existen en BD). `validate` de páginas conoce `<Tour id="…" />`: error si falta `id`, aviso si el tour no existe o está en borrador.
Manual (repo, solo AÑADIR): `src/components/Tour.tsx` (+ estilos en `styles/`), registrado en `rspress.config.ts` junto a los demás componentes. `<Tour id="slug" />` carga `withBase('/assets/tours/<slug>.json')`; muestra la captura con el rectángulo resaltado, título, texto, "Paso n de N", Anterior/Siguiente, teclado (←/→/Esc), enlace opcional, accesible (aria, foco), modo claro/oscuro del manual y sin saltos de maquetación.
Estadísticas: `GET /api/stats` añade `unpublished:{pages,assets,tours,total}` = elementos modificados desde que empezó el último trabajo `publish` con estado `ok` (o todos si nunca se publicó).

## Diseño de la interfaz (portal/web)
Marca ISPMAX: violeta `#5b4bd8` / cian `#38bdf8` (ver `styles/index.css` y `assets/logo/` del manual). Debe sentirse una herramienta profesional sobria, no una plantilla de IA.

---
# Adenda 2: constructor por bloques y subsecciones (2026-11-25)
Objetivo de la persona usuaria: un panel donde se elige un ítem del sidebar del manual (los que ya existen) o se crea uno nuevo, y se construye la página con **bloques** (título, subtítulo, texto, lista, imagen, fila/cuadrícula de imágenes, pasos, aviso/dato importante, tarjetas, tabla, código, divisor, tour) colocables donde se quiera con arrastrar y soltar, "+" entre bloques y menú "/"; las secciones admiten **subsecciones** dependientes de una principal. El resultado sigue siendo MDX con los componentes actuales del manual (nada de cambiar cómo se ve el manual).

## Motor de bloques (`portal/web/src/lib/blocks/**`, TypeScript con sintaxis borrable para que `node --test` lo ejecute directamente)
- `parseMdx(body): Block[]` y `serializeBlocks(blocks): string`. Cada bloque guarda `raw` (el texto original exacto) y `dirty`. Serializar un bloque no editado emite su `raw`; solo se regenera lo editado. **Criterio:** parse→serialize idéntico byte a byte en las 285 páginas importadas (comprobar leyendo `docs/**/*.mdx` del repo). Lo que no se reconoce se conserva como bloque `raw` editable como código.
- Tipos: `heading{level,text}`, `paragraph{md}`, `list{ordered,items}`, `image{src,alt,caption,width,height,max,variant}`, `imageRow{kind:'row'|'grid',images}`, `steps{steps:[{title,md}]}`, `callout{kind:'tip'|'warning'|'danger'|'info',title,md}`, `cards{cards:[{title,href,md}]}`, `table{md}`, `code{lang,code}`, `kicker`, `lead`, `divider`, `tour{id}`, `raw{code}`.
## Subsecciones
- `pages.parent_id` (ya en el esquema). Frontmatter `padre: "/ruta/del/padre"` solo cuando hay padre. `scripts/build-nav.mjs` anida los hijos bajo el ítem del padre (`items`, plegable) ordenados por `orden`; **sin `padre` en ninguna página el `_nav.json` generado debe quedar idéntico al actual**.
- API: `GET /api/structure` → nodos `{id,title,route,orden,status,children:[Nodo]}` por grupo (clave `pages`, anidados); `PUT /api/structure/order {seccion, grupos:[{name, nodes:[{id,children:[…]}]}]}` (profundidad máx. 3, sin ciclos; sigue aceptando `pageIds` plano); `/guia` (sidebar.json) con la misma forma. Crear un grupo nuevo = darle nombre.
- **Árbol = menú real del manual (2026-11-25).** `GET /api/structure` devuelve `{secciones, menu}`. Cada sección trae `sectionIndex` (la portada `/tareas`, `/problemas`…, que no es un grupo) y `grupos` en el **mismo orden que `scripts/build-nav.mjs`**: «General» primero y el resto alfabético; ítems por `orden` (999 si la página no tiene) y título; el grupo de una página sin `grupo` sale de su subcarpeta (capitalizada) o «General». Los nodos llevan `menu` (texto del menú del manual, con emoji en la Guía) cuando difiere del título. Solo se listan grupos con páginas o creados desde el panel (`structure_groups`); `DELETE /api/structure/groups {seccion,name}` borra un grupo vacío (409 si tiene páginas, 404 si no existe). `menu` es el menú superior de `rspress.config.ts` (`server/routes/topnav.mjs`: Guía · Quiero hacer… · Tengo un problema · Preguntas · Referencia (desplegable con 7 ítems + barra lateral de `/referencia` y `/conceptos`) · Soporte (enlace externo)). Prueba: `test/structure-nav.test.mjs` (0 diferencias con `docs/_nav.json` y con la config; ejecutar con `--test-concurrency=1`, comparte base con `api.test.mjs`).

---
# Adenda 3: guardar = en vivo, publicar = solo lo nuevo, Git = solo código (2026-11-25)
> **Nota:** superada en parte; ver Adenda 4. Ya no existe la pantalla «Publicar y Git» (ahora Ajustes → Actualización del sistema), `site_base` vale `/` por defecto (lo fija `PORTAL_SITE_BASE`) y los ajustes de Git y de reinicio no son editables.

Decisión de la persona usuaria (prevalece sobre lo anterior donde choque):
- **El contenido vive en el sistema (PostgreSQL), no en Git.** Guardar un cambio en una página/estructura/imagen/tour **ya publicado** actualiza el manual **automáticamente** (reconstrucción en segundo plano, ~35 s; la interfaz muestra el progreso). **Publicar** significa sacar a la luz algo NUEVO (una página/sección/módulo en `draft`). Los borradores y sus cambios no tocan el sitio.
- **Git se usa solo para actualizar el CÓDIGO del sistema** (componentes, scripts, el propio portal). Ya no hay "importar/reimportar contenido desde Git" en la interfaz ni en el flujo normal (el contenido de la BD manda siempre; `POST /api/import` queda como herramienta avanzada oculta).
- Producción: el manual se sirve desde el sitio generado por el portal. La base de rutas es el ajuste `site_base` (def. `/manual/` en local; `/` cuando Nginx sirva el volumen del portal).

## Actualización automática del sitio (OPS)
- `ctx.site.markDirty(reason)`: lo llaman las rutas que cambian algo **visible** (página `published` creada/editada/movida/borrada/restaurada o que pasa de/a `published`; cambios de estructura/orden/padre/grupo; assets de páginas publicadas; tours `published`; ajustes que afecten al sitio). **Debounce** (ajuste `auto_publish_delay`, def. 8 s), **coalescencia** (si ya hay una construcción en curso, se programa una más al terminar, nunca en paralelo) y respeta `auto_publish` (def. `true`). Si falla el build, el sitio anterior sigue sirviéndose.
- `GET /api/site/status` → `{ state:'idle'|'pending'|'building'|'error', pendingReasons:[string], nextRunInMs:number|null, building:{jobId,startedAt}|null, lastBuild:{status,finishedAt,durationMs,pages,jobId}|null, drafts:number, siteUrl:string }`.
- `POST /api/site/rebuild` (editor+) → fuerza una construcción ya (`{jobId}`); `GET /api/jobs/:id` para el log.
- `POST /api/pages/:id/publish` · `POST /api/pages/:id/unpublish` · `POST /api/pages/publish-drafts {ids?:number[]}` (sin `ids` = todos los borradores) → cambian `status`, suben `version`, guardan revisión y llaman a `markDirty`. `GET /api/stats` añade `drafts` y conserva `unpublished` solo por compatibilidad.
## Actualizar el sistema desde Git (solo código)
- `GET /api/system/version` → `{ initialized, branch, remote, commit, subject, date, clean, behind, ahead, canUpdate, message? }` (hace `git fetch` si hay remoto; sin repositorio → `initialized:false` + mensaje útil).
- `POST /api/system/update` (admin) → `{jobId}`. Pasos con log: comprobar árbol limpio → `git fetch` + `git merge --ff-only` → si cambiaron `package-lock.json`/`package.json` (raíz, `portal/`, `portal/web/`) `npm ci` en ese directorio (lista blanca; sin shell) → `npm run migrate` (esquema idempotente) → compilar la interfaz (`portal/web`) → reconstruir el sitio → informar `needsRestart` si cambió código del servidor. Nunca `reset`, `checkout`, `clean`, `stash` ni `push`. Si algo falla, no reinicia y deja el sistema como estaba (el sitio anterior sigue sirviéndose; informar el paso que falló).
- `POST /api/system/restart` (admin, confirmación `{confirm:"REINICIAR"}`): ajuste `restart_mode`: `exit` (def., para Docker/pm2/servicio que reinicia el proceso) o `respawn` (local: lanza un proceso nuevo desacoplado con los mismos argumentos y sale; el nuevo reintenta el puerto unos segundos).
- Los endpoints `/api/git/*` y `/api/publish*` siguen funcionando como alias (compat.) pero la interfaz usa los nuevos.
## Interfaz
- Barra superior: **sustituir el botón "Publicar N"** por un indicador del sitio (Al día · Actualizando… · Error con "Ver log") y, aparte, el acceso a **Borradores (N)** para publicar lo nuevo.
- En la página: Guardar (si la página está publicada, el aviso dice "Guardado · el manual se actualiza en ~35 s" y se ve el progreso) y, si es borrador, el botón principal es **Publicar**.
- Pantalla "Publicar y Git" → **Sistema**: estado y log del sitio con "Reconstruir ahora"; **Actualizar el sistema** (versión actual, novedades disponibles, botón actualizar con log por pasos y reinicio); Respaldos siguen aparte. Sin ninguna mención a importar contenido desde Git.

---
# Adenda 4: estado final del contenido, despliegue y panel (2026-11-25)
Prevalece sobre todo lo anterior donde choque. En particular sustituye el encabezado «Solo local por ahora: sin Docker», la interfaz «Publicar y Git», las claves de Ajustes de la sección base (`repo_path`, `git_remote`, `git_branch`, `backup_dir`, `site_url`, `build_command`) y lo indicado en la Adenda 3 sobre `site_base` y la pantalla Sistema.

## Contenido
- El repositorio **ya no contiene el contenido del manual**: `docs/` solo tiene una portada de aviso y `assets/imgs/` se eliminó (se conserva `assets/logo/`). El contenido vive en PostgreSQL.
- Se lleva a otro sistema con un paquete `.ispmax`. Crear: pantalla Respaldos o `npm run content:export`. Cargar: tarjeta «Cargar el contenido del manual» en el Inicio de un sistema vacío, pantalla Respaldos, o `npm run content:import -- archivo.ispmax --yes`.
- `npm run setup` aplica el esquema e importa desde `docs/`; como `docs/` solo trae la portada, no carga el manual.
- Las pruebas leen un corpus materializado desde el paquete más reciente de `portal/data/backups/content/` (ver `portal/test/README.md`). Sin paquete se saltan con aviso.

## Despliegue (un solo puerto)
- Producción: puerto **8387**. `/` manual público, `/admin/` panel, `/api` API, `/healthz` salud. `GET /` responde 503 «El manual se está preparando» mientras no haya contenido.
- Docker: `docker-compose.yml` (servicios `ispmax-manual` y `db`), `install-docker.sh`, `docker/entrypoint.sh`. El repositorio se monta en `/app`. Los `*.legacy` son el sistema antiguo.
- Con `PORTAL_UPDATE_MODE=entrypoint` (Docker), «Actualizar el sistema» solo trae el código (git) y reinicia; `docker/entrypoint.sh` instala dependencias, compila el panel y migra al arrancar.
- `PORTAL_SITE_BASE` (def. `/`), `PORTAL_RESTART_MODE` (def. `exit`), `PORTAL_REPO_PATH`, `PORTAL_UPDATE_MODE` (`inline` | `entrypoint`), etc., se fijan por entorno. Lista completa: comentario inicial de `portal/server/index.mjs`.
- Seguridad: `PORTAL_TRUST_PROXY=true` solo si el puerto no es accesible sin pasar por el proxy; mejor la IP/CIDR del proxy. `PORTAL_ADMIN_ALLOWED_IPS` limita `/admin` y `/api`.

## Panel
- **Ajustes** (solo admin), secciones:
  - General: título del sitio y WhatsApp, que se aplican al manual publicado.
  - Actualización del manual: `auto_publish` y espera.
  - Actualización del sistema: botón con pasos y reinicio. Sin campos de Git: usa la rama y el remoto del propio repositorio.
  - Respaldos: cuántas copias conservar. Se crean y descargan desde el navegador; carpeta fija en el volumen de datos.
  - Información del sistema: solo lectura.
- **No editables** (los fija el despliegue): `site_url`, `site_base`, `repo_path`, `git_remote`, `git_branch`, `build_command`, `restart_mode`, `backup_dir`.
- **Menú:** Contenido (Páginas, Estructura, Imágenes, Tours) · Publicación (Borradores, Manual publicado, Respaldos) · Administración (Usuarios, Auditoría, Ajustes).
- `#/sistema` redirige a `#/ajustes/sistema`. La antigua pantalla «Sistema» / «Publicar y Git» ya no existe.

## Pruebas
- `npm test` en `portal/`: 83 pruebas. `node --test test/*.test.mjs` en `portal/web`: 70 pruebas.
- Editor de bloques: **paleta de bloques** visible (panel lateral con los tipos: título, subtítulo, párrafo, lista, imagen, cuadrícula, pasos, aviso, tarjetas, tabla, código, divisor, tour…) interactiva: clic inserta tras el bloque seleccionado, arrastrar a una posición concreta del lienzo. Al seleccionar un bloque de **imagen**, acción **"Crear tour con esta imagen"**: abre el editor de tour (reutilizando el de `features/tours`) con esa imagen como paso 1 (dibujar recuadro, texto, más pasos), lo guarda/publica y **inserta el bloque `tour` justo debajo de la imagen**.

---
# Adenda 5: autenticación endurecida y auditoría de endpoints (2026-11-26)
Objetivo de la persona usuaria: login rediseñado y **seguro con los protocolos estándar**, y detección/corrección de endpoints abiertos sin autenticación.

## Servidor (SEG-SERVIDOR)
- **Sesiones:** token aleatorio de 32 bytes; en BD se guarda **solo su SHA-256** (nunca el token); se **rota al iniciar sesión** (sin fijación); `last_seen_at`, caducidad **por inactividad** (`PORTAL_SESSION_IDLE_H`, def. 12) y **absoluta** (`PORTAL_SESSION_MAX_DAYS`, def. 7); se guardan `created_at`, `ip`, `user_agent`. Cookie `HttpOnly`, `SameSite=Strict`, `Path=/`; con https (efectivo): `Secure` y nombre `__Host-portal_session`; sin https: `portal_session`. Cambiar la contraseña revoca las demás sesiones (ya existe). El esquema se **aplica solo al arrancar** el servidor (idempotente), para que `npm start` local no exija `migrate`.
- **Bloqueo anti fuerza bruta persistente** (tabla `login_attempts`): por (usuario+IP) 5 fallos en 15 min → bloqueo creciente (15 min, 30, 60…); por IP 20 fallos en 15 min → bloqueo; devuelve **429** con cabecera `Retry-After` y `{error, retryAfter}`; se reinicia con un acceso correcto. Mensaje de fallo **siempre genérico** («Usuario o contraseña incorrectos.»); **igualar tiempos** con comparación bcrypt ficticia cuando el usuario no existe o está inactivo.
- **Política de contraseñas** única (`server/passwordPolicy.mjs`): ≥ 10 caracteres, ≤ 128, no igual/derivada del usuario, no en lista de contraseñas comunes/de instalación (incluye `admin1234`, `12345`, `password`, `agente-prueba`…), no solo repeticiones. Se aplica al crear usuario, `PUT /api/auth/password`, reset por admin y `admin-cli`. Al **iniciar sesión correctamente**, si la contraseña (en claro, solo en ese instante) incumple la política → `users.must_change_password=true`.
- **Verificación en dos pasos (TOTP, RFC 6238, SHA-1, 6 dígitos, 30 s, ventana ±1)** opcional por usuario, implementada con `node:crypto` (sin dependencias). Secretos **cifrados en reposo** (AES-256-GCM, clave en `PORTAL_SECRET_KEY` o, si falta, archivo `<data>/secret.key` 0600 generado al primer uso). 10 **códigos de recuperación** de un solo uso (solo su hash en BD). Un código TOTP ya usado no se acepta dos veces.
- **Sesión restringida:** si `must_change_password` o (ajuste `require_2fa_for_admins` y el admin no tiene 2FA), la sesión solo puede llamar a `/api/auth/*`; el resto devuelve **403** `{error, code:'PASSWORD_CHANGE_REQUIRED'|'2FA_ENROLL_REQUIRED'}`.
- **Cabeceras** en `/api/**` y `/admin/**`: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` y CSP con `frame-ancestors 'none'`; CSP del panel: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'` (el sitio público `/` conserva su CSP y `frame-ancestors 'self'`). Comprobación `Sec-Fetch-Site` además del `Origin` en métodos que escriben.
- **Auditoría** (`audit_log`): `auth.login`, `auth.login_failed` (sin la contraseña; con usuario, IP y UA), `auth.lockout`, `auth.2fa_*`, `auth.logout`, `auth.password`, `session.revoke`; `GET /api/auth/me` incluye `lastLogin` (el acceso anterior).
## API de autenticación
- `POST /api/auth/login {username,password}` → `200 {user}` (cookie) · `200 {twoFactorRequired:true, challenge}` (sin cookie aún; `challenge` opaco de 5 min y un solo uso) · `401 {error}` · `429 {error,retryAfter}`.
- `POST /api/auth/login/2fa {challenge, code}` (`code`: 6 dígitos o código de recuperación) → `200 {user}` + cookie · `401` · `429`.
- `GET /api/auth/me` → `{user:{id,username,display_name,role,twoFactor:boolean,mustChangePassword:boolean,mustEnrollTwoFactor:boolean}, session:{id,createdAt,lastSeenAt,expiresAt}, lastLogin:{at,ip}|null}`.
- `GET /api/auth/sessions` → `{items:[{id,current,createdAt,lastSeenAt,ip,userAgent}]}` · `DELETE /api/auth/sessions/:id` · `POST /api/auth/sessions/revoke-others` → `{revoked:n}`.
- `PUT /api/auth/password {current,new}` → `{ok}` o `400 {error, problems:[string]}`.
- 2FA: `POST /api/auth/2fa/setup {password}` → `{secret, otpauthUrl}` (pendiente) · `POST /api/auth/2fa/enable {code}` → `{recoveryCodes:[10 strings]}` (se muestran una sola vez) · `POST /api/auth/2fa/disable {password, code}` · admin: `POST /api/users/:id/2fa/reset`.
- Ajuste editable `require_2fa_for_admins` (bool, def. false; sección `seguridad`) en `GET/PUT /api/settings`.
## Auditoría de endpoints
- `portal/test/security.test.mjs` enumera **todas las rutas registradas** (hook `onRoute`) y comprueba: sin sesión, cada `/api/*` (todos los métodos, con parámetros ficticios) → **401/403/404 nunca 2xx ni datos**, salvo la lista blanca explícita (`/healthz`, `/sitemap.xml`, `/robots.txt`, `/api/auth/login`, `/api/auth/login/2fa`, sitio público, estáticos del panel); con sesión `viewer`, las rutas de editor/admin → 403; trucos de ruta (mayúsculas, `//`, `/./`, `%2f`, `%61pi`, `;`, barra final, `..`), `HEAD`/`OPTIONS`/override de método, cabeceras `X-Forwarded-*` falsas, CORS sin `Access-Control-Allow-Origin`, archivos sensibles no servidos (`/.env`, `/portal/.env`, `/data/`, `/work/`, `/node_modules/`, `/server/`, `/db/schema.sql`), mensajes de error sin trazas, `npm audit` (alta/crítica = 0 o justificadas).
- `npm run security:scan -- <urlBase>` (`portal/scripts/security-scan.mjs`): el mismo barrido contra una instancia en marcha (p. ej. `https://doc.ispmax.ec`), solo lectura y sin credenciales, informe con cada ruta y su veredicto.
## Ruta de administración oculta (2026-11-26)
- `PORTAL_ADMIN_PATH` (def. `/admin`): un segmento `^/[a-z0-9][a-z0-9_-]{2,63}$`; reservadas `api`, `assets`, `static`, `healthz`, `robots.txt`, `sitemap.xml`, `manual` y las secciones del manual; si coincide con el primer segmento de una página publicada, el servidor no arranca. **Modo oculto** = ruta ≠ `/admin` o `PORTAL_HIDE_ADMIN=true`. Nunca se escribe la ruta real en archivos versionados ni pruebas (centinela `/zz-secreto-test`).
- Siempre: la SPA se sirve en `${P}/` con `<base href="${P}/">` inyectado al servirla y la API responde también en `${P}/api/*` (reescritura interna a `/api/*`: rutas y pruebas siguen en `/api/*`). **Contrato con la interfaz:** el panel se compila con `base: './'` y calcula la API como `new URL('api/', document.baseURI)`.
- Modo oculto: `/api/*` directo, `/admin*` y variantes, y además IP no permitida, panel deshabilitado o IP bloqueada por sondeos → **el mismo 404** que una ruta inexistente del manual (cuerpo, código, cabeceras). `${P}` → 301 `${P}/`. `robots.txt` no nombra el panel ni la API; panel y API llevan `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- Sondeos: por IP real, accesos a rutas de escaneo (y en modo oculto `/admin*`/`/api*` directos) en 5 min ≥ `PORTAL_PROBE_THRESHOLD` (def. 20) → 30 min sin panel ni API para esa IP (el manual nunca); auditoría `security.probe` una vez por bloqueo.
- Instaladores: `--admin-path`; si no, `/panel-<16 hex>` en `.env`, mostrada una vez. Pruebas: `test/hidden-admin.test.mjs`; `security:scan -- <url> --admin-path <ruta>`. Detalle y riesgos: `portal/SECURITY.md` § 4.
- Servidor de pruebas: `dev-test-server.mjs` toma `PORTAL_ADMIN_PATH` solo del entorno de la orden (no de `portal/.env`); usuario `agente` / `Agente-Prueba-2026!`.
## Interfaz (SEG-UI)
- **Login rediseñado**, paso de 2FA, cuenta atrás de bloqueo, aviso de Bloq Mayús, mostrar/ocultar contraseña, estados de carga/error accesibles, claro/oscuro, responsive, `autocomplete` correcto para gestores de contraseñas. Pantalla **Mi cuenta** (`#/cuenta`): cambiar contraseña con checklist de política, activar/desactivar 2FA (QR + secreto manual + códigos de recuperación), sesiones activas con «cerrar esta/otras». Pantalla obligatoria para `mustChangePassword` / `mustEnrollTwoFactor`. Usuarios: botón «Restablecer 2FA». Ajustes: sección Seguridad con `require_2fa_for_admins`.
