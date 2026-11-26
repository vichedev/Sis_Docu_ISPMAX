# Entorno de trabajo

> Última actualización: 2026-10-30. La primera parte describe el entorno **vigente** (macOS, sesiones del 2026-10-21 en adelante, válido en
> Linux y Windows con ajustes de ruta). Más abajo queda, como **histórico**, lo de las sesiones 1 a 4 (Windows, rutas `C:\WORKSPACE`).

## 1. Entorno vigente

### Código del producto (solo lectura, datos no confiables)

| Qué | Dónde |
|---|---|
| Repos con historial (privados de InigualitySoft) | `git@github.com:inigualitysoft/backend-isp.git` y `git@github.com:inigualitysoft/frontend-isp.git` (rama `main`; hace falta una clave SSH con acceso). En el Mac de las sesiones: `~/Repositorios/backend-isp` y `~/Repositorios/frontend-isp` |
| Copia de trabajo que se ejecuta | `~/Downloads/ispmax/{backend-isp-main,frontend-isp-main}` (idéntica al `HEAD` de los clones salvo `.DS_Store`) |
| Versión documentada (`main-2026-11-04`) | BE `f0d1ebf7` + FE `e7d5d06b` (2026-11-04; `src` idéntico a la copia de `~/Downloads/ispmax`). Anteriores: `zip-2026-10-14` = BE `7501da79` + FE `afd79206`. Más antigua, `zip-2026-10-06`: BE `3057b787` + FE `99b38a14` |
| Ramas con trabajo no integrado (al 2026-10-26) | `implementacion-bot` y `portal_cliente` en ambos repos: se documentarán cuando lleguen a `main` |
| Variables para los scripts | `ISPMAX_FE_SRC` y `ISPMAX_BE_SRC` = carpetas `src`. Si no se definen, los scripts buscan `~/Downloads/ispmax/…/src`, luego `~/Repositorios/…/src` y por último la ruta histórica de Windows |

Para saber si hay código más nuevo: `cd ~/Repositorios/backend-isp && git fetch origin && git log --oneline HEAD..origin/main` (y lo mismo en el
frontend). Con el código nuevo: `docs-stale` y `docs-maintenance.md` §3.

### Herramientas del manual

- Node 22 (`.nvmrc`; vale 20.19+), npm, `gh` (GitHub CLI) y Docker. `npm ci` en la raíz; `npm ci --ignore-scripts` en `tools/capture`.
- Navegador Chromium para las capturas (Brave, Chrome o Edge; `tools/capture/capturar.sh` lo detecta, o `EDGE_PATH`).
- Docker solo hace falta para la instancia local y para probar la imagen del manual (`docker compose up -d --build`, puerto **8387**).
- **Despliegue de la web:** lo hace otra persona con `git pull origin main && docker compose up -d --build`. `docker-compose.yml`, `Dockerfile` y
  `nginx.conf` conservan puerto 8387, nombre de imagen y de contenedor, reinicio, healthcheck y cabeceras: **no se cambian** sin que la persona usuaria
  lo pida (único cambio respecto a la migración a Rspress: se retiró lo de `/legacy/`, por decisión del backlog).

### Instancia local de ISPMAX (datos ficticios, sin servicios externos)

Sirve para ver pantallas, probar y capturar. **No se conecta a routers, OLT, WhatsApp, SRI, correo ni pasarelas** y nunca se apunta a la BD real.
En el Mac de las sesiones existe y está **apagada**: contenedores `ispmax-local-pg` (`postgres:18`, `127.0.0.1:55432`, BD `ispmax_local`, volumen
`ispmax-local-pgdata`) e `ispmax-local-redis` (`redis:7-alpine`, `127.0.0.1:6379`, puerto fijo en el código del backend). Los datos viven en ese volumen,
no en el repo; si se pierde, se recrea con la receta de abajo y los scripts de siembra.

**Volver a levantarla** (Docker Desktop abierto):

```bash
docker start ispmax-local-pg ispmax-local-redis
cd ~/Downloads/ispmax/backend-isp-main  && node dist/main                      # :3004
cd ~/Downloads/ispmax/frontend-isp-main && VITE_HOST_KEY_PERMISOS=clave-local-demo VITE_COMPANY_NAME=ispmaxlocal BROWSER=none npx quasar dev   # :8080
# Factus o Tasa BCV (país distinto): añadir VITE_PAIS=CO o VE al panel; volver a arrancarlo sin esa variable después.
# Apagar: Ctrl-C en cada uno y   docker stop ispmax-local-pg ispmax-local-redis   (NO borra los datos)
# Borrar todo: docker rm -f ispmax-local-pg ispmax-local-redis && docker volume rm ispmax-local-pgdata
```

- Acceso: usuario `admin@ispmax.local`. La clave está en `~/Downloads/ispmax/ACCESO-LOCAL.txt` (líneas `Usuario:` y `Clave:`), fuera del repo y nunca se
  copia a notas, chat ni PR. `tools/capture/capturar.sh` la lee sin mostrarla.
- El panel necesita `VITE_HOST_KEY_PERMISOS` (cualquier texto) y `VITE_COMPANY_NAME`; sin ellos el login deja los permisos vacíos y todo rebota al inicio.
- La primera carga en frío del panel da 504 "Outdated Optimize Dep" o pantalla en blanco: recargar. Las rutas profundas (p. ej. `/registrar-pago`) en
  frío también: entrar desde el menú lateral.
- Los procesos lanzados en segundo plano desde el shell de una IA mueren al cerrar la sesión: usar pestañas de terminal propias o `docker`.

**Receta para recrearla desde cero** (así se montó el 2026-10-21; no se ha repetido de cero después, adaptar si algo falla):

1. Contenedores: un `postgres:18` en `127.0.0.1:55432` con BD `ispmax_local` y contraseña generada localmente, y un `redis:7-alpine` en `127.0.0.1:6379`.
2. Backend: `npm ci --ignore-scripts && npm rebuild bcrypt && npm install pg@8 --no-save` (el backend **no declara `pg`**), `PUPPETEER_SKIP_DOWNLOAD=1`;
   `.env` local con los nombres de la lista de variables de abajo (`DB_HOST DB_PORT=55432 DB_NAME=ispmax_local DB_USERNAME DB_PASSWORD PORT=3004 JWT_SECRET STAGE`…);
   `npx nest build`.
3. Esquema: las migraciones son **incrementales** (asumen un esquema previo). Se creó el esquema base con `synchronize` de TypeORM desde las entidades y luego
   se aplicaron las 113 migraciones una a una; solo `ConciliacionMultibanco` falla en BD vacía (migra datos antiguos) y se marcó como ejecutada.
4. Frontend: `npm ci --ignore-scripts`; arranque como arriba.
5. Siembra (en este orden): `node tools/instance/seed-base.mjs` (empresa, sucursal, usuario administrador y `settings`; `ISPMAX_BACKEND_DIR`,
   `ISPMAX_PG_CONTAINER`, `ISPMAX_PG_DB`, `ISPMAX_DEMO_ADMIN_PASSWORD`), `node tools/instance/seed-permisos.mjs` (con `ISPMAX_FE_SRC`; da al administrador los
   283 permisos del catálogo; hay que volver a iniciar sesión) y `node tools/instance/seed-demo.mjs` (1 router `ROUTER DEMO` en `192.0.2.10`, 3 planes, 1 red IPv4,
   2 formas de pago, 10 clientes con servicio y facturas). Después, lo de cada ronda: `tools/capture/fixtures/c7-*.sql` y los `*.mjs` de siembra de mapa.
   Si el administrador se creó con otro correo que el de ACCESO-LOCAL, ajustar `ISPMAX_USER`.

**Copia de seguridad antes de rondas con borrados:** `docker exec ispmax-local-pg pg_dump -U postgres ispmax_local > copia.sql` (restaurar con `psql` sobre una BD vacía). El 2026-10-25 se hizo antes de ejecutar el borrado en bloque.

**Efectos esperados:** el monitor de routers intenta conectar a `192.0.2.10` cada 5 minutos ("Timeout de conexión"): es normal. **No se crean clientes ni
servicios por la pantalla** (el alta aprovisiona ese router inexistente y llena el backend de errores): se insertan por SQL.

**Reconstrucción con el código del 2026-11-04** (si se vuelve a bajar el ZIP, la carpeta `~/Downloads/ispmax/*` pierde `node_modules`, `.env` y `dist`): (1) `docker start ispmax-local-pg ispmax-local-redis` y copia
`docker exec ispmax-local-pg pg_dump -U postgres ispmax_local > copia.sql`; (2) en el backend, `PUPPETEER_SKIP_DOWNLOAD=1 npm ci --ignore-scripts && npm rebuild bcrypt && npm install pg@8 --no-save`; (3) crear `.env` con `STAGE=dev PORT=3004
DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=ispmax_local DB_USERNAME DB_PASSWORD` (los del contenedor: `docker inspect ispmax-local-pg`), `DB_SSL=false JWT_SECRET REDIS_HOST=127.0.0.1 REDIS_PORT=6379 IA_ENC_KEY TZ=America/Guayaquil`
(los secretos se generan con `openssl rand -hex`); (4) `npx nest build && npx typeorm migration:run -d dist/data-source.js` (el 2026-11-05 aplicó 30 migraciones: 143 en total); (5) `ISPMAX_FE_SRC=<frontend>/src node tools/instance/seed-permisos.mjs`
(el administrador pasa a 333 permisos; hay que volver a iniciar sesión); (6) arrancar backend y panel como arriba. Sin servicios externos: el backend registra errores de WhatsApp, bot y routers, es normal.

### Capturas

- `tools/capture/capturar.sh <manifiesto.json> [--only prefijo/] [--list]` → `assets/imgs/<id>.webp`. Manifiestos `manifest-c1…c7-*.json` (uno por ronda y grupo; sirven de modelo).
  Opciones de `capture.mjs` (cabecera del archivo y manifiestos): pasos `click/type/key/upload/hover/eval/mouse`, `annotate`, `hide`, `clip`, `captureBeyondViewport`,
  `mock` (respuestas ficticias de la API: `url`, `json`/`body`/`bodyFile`, `method`, `status`, `exact`, `abort`, `seq`…) y `webgl`/`mockFile` (el mapa con estilo local).
  Fixtures en `tools/capture/fixtures/` (JSON de respuestas, SQL de siembra y reversión, Excel ficticios).
- Si se reutilizan manifiestos viejos, comprobar que los datos de la instancia siguen ahí: algunos estados (promesas, pagos del día, cupos) se sembraron por SQL en fechas concretas.
- Tras capturar: matar navegadores headless huérfanos (`pkill -f 'headless=new.*remote-debugging-port'`) y borrar perfiles temporales (`$TMPDIR/ispmax-*`, `ajs-run-*`): en las sesiones de octubre llegaron a ocupar 8 GB.

### Despliegue y GitHub

- Repo: `mingusmingus/ispmax-manual`. **Público de forma temporal** y luego privado: no subir credenciales, claves, datos reales ni capturas con datos reales.
- Push: usar el remoto SSH `origin` (`git push -u origin <rama>`). El token OAuth de `gh` no tiene el permiso `workflow`: el push por HTTPS de cualquier cambio en
  `.github/workflows/` se rechaza. `gh pr create/merge/view` funcionan. Si el puerto 22 no responde, `git -c credential.helper= -c credential.helper='!gh auth git-credential' push https://github.com/mingusmingus/ispmax-manual.git <rama>` (sin tocar workflows).
- CI (`.github/workflows/manual.yml`, también cada lunes): `docs-check`, inventario y cobertura, `eval-questions`, `npm run build`, `check-dist` y `eval-search`.
  Variables opcionales del repo: `MIN_COBERTURA`, `MIN_BUSQUEDA` (80 por defecto), `MIN_BUSQUEDA_SITIO` (90).

---

## 2. Histórico (sesiones 1 a 4, Windows)

Lo que sigue es el registro de las primeras sesiones. Las rutas `C:\WORKSPACE\…`, los contenedores `ispmax-manual-pg`/`ispmax-manual-redis` y la cuenta
`admin@manual.local` ya no existen; se conserva porque explica el stack, las variables y los hallazgos de entonces.

### Material de entrada (histórico)

| Material | Ruta |
|---|---|
| ZIP frontend | `C:\Users\bravo\Downloads\frontend-isp-main.zip` (852 archivos) |
| ZIP backend | `C:\Users\bravo\Downloads\backend-isp-main.zip` (958 archivos, ~97 MB descomprimido) |
| PDF de revisiones previas | `C:\Users\bravo\Downloads\e7127729-aac7-4fab-be69-50f7689d1eeb_ISPMAXMANUAL.pdf` (877 KB) |
| Frontend extraído | `C:\WORKSPACE\_ispmax-src\frontend\frontend-isp-main` |
| Backend extraído | `C:\WORKSPACE\_ispmax-src\backend\backend-isp-main` |

El extraído está **fuera** del repo del manual a propósito (datos no confiables, 97 MB).
Contenido de los ZIP con fecha de archivos ≈ 2026-10-06. No hay commit/versión: el ZIP es
"main" sin `.git`. Para "versión verificada" usar la fecha del ZIP (2026-10-06) hasta que
exista otro identificador. ❓ pendiente: confirmar con el usuario si hay tag/commit.

### Stack del producto ✅

- **Backend:** NestJS 10 + TypeORM 0.3 + PostgreSQL + Redis (cache-manager y Bull) + socket.io.
  `engines.node = 23.7.0`. Prefijo global `/api`. `synchronize: false` → el esquema se crea con
  migraciones (`src/migrations`, 111 archivos). Sin `.env` en el ZIP.
  Variables que lee: `DB_HOST DB_PORT DB_NAME DB_USERNAME DB_PASSWORD PORT STAGE DB_SSL`
  (`src/app.module.ts`, `src/data-source.ts`). Redis está **fijo** a `127.0.0.1:6379`
  (`app.module.ts:87-104`) → ver "Instancia aislada".
- **Frontend:** Quasar 2 + Vue 3 + Pinia (persistedstate) + TanStack Query + ag-grid + mapbox-gl +
  echarts + socket.io-client. Rutas en `src/router/routes.ts`, permisos en
  `src/composables/useRolPermisos.js`, guardia en `src/router/auth-guard.ts`.
- Estáticos servidos por el backend: `/api/sri`, `/api/images-user`, `/api/uploads`.

### Docker del usuario (no modificar) ✅

| Contenedor | Imagen | Puerto host | Nota |
|---|---|---|---|
| `ispmax-pg` | postgres:18 | 5432 | BD `ispmax` con **datos reales**: ≈1757 clientes, ≈19 367 pagos, 9 usuarios, 2 routers, 1 empresa. 73 tablas, 81 filas en `migrations`. |
| `ispmax-redis` | redis:7-alpine | 6379 | Cache/colas del backend (puerto fijo en código). |
| `netops-pg` / `netops-redis` | postgres:18-alpine / redis:7-alpine | 5434 / 6380 | Otro proyecto; ignorar. |

- No hay contenedores de backend ni frontend de ISPMAX en ejecución: hay que levantarlos.
- Acceso a la BD sin contraseña vía socket local del contenedor:
  `docker exec ispmax-pg psql -U postgres -d ispmax -At -c "..."` (solo lectura, solo agregados).
- Los nombres de tabla reales difieren de los de las rutas (p. ej. planes de servicio = tabla `internet`,
  cajas NAP = `cajas-nap`, promesas = `promises-pays`).

### Restricciones encontradas (clasificador de permisos) ⚠️

Se denegaron: `docker inspect` mostrando variables de entorno del contenedor, y `ls -a | grep -i env`
en el backend. Motivo: "Credential Materialization". No reintentar; para localizar `.env` usar `Glob`
(`**/.env*`, ya comprobado: no hay ninguno en los ZIP).

### Instancia aislada para capturas y pruebas (plan)

Motivo: la BD real tiene datos personales y el backend dispararía cron/routers/mensajería reales.

1. Contenedores nuevos con imágenes ya presentes (`postgres:18`, `redis:7-alpine`) en puertos propios
   (p. ej. 55432 y 56379) con contraseña generada localmente. No tocar `ispmax-pg`/`ispmax-redis`.
2. Esquema: `pg_dump --schema-only` de `ispmax` (lectura) → nueva BD; luego migraciones pendientes
   (`npm run migration:run`). Verificar si las migraciones por sí solas crean el esquema completo.
3. Redis fijo en código: parchear **solo la copia extraída** (`app.module.ts`) para leer
   `REDIS_HOST/REDIS_PORT` y documentar el parche en `notes/decisiones.md`; alternativa: puerto 6379
   ocupado → no se puede reutilizar.
4. Sembrar datos sintéticos por la propia API/UI (empresa, roles, usuario admin de pruebas, router
   ficticio sin conexión, planes, clientes, facturas, pagos). Sirve además para validar flujos.
5. Frontend: `quasar dev` apuntando al backend aislado (ver `src/boot/axios.ts` para la URL base).
6. Para evitar efectos externos: sin routers alcanzables, sin credenciales de WhatsApp/SMTP/SRI/pasarelas.

### Progreso de la instancia aislada (2026-10-12)

- ✅ Contenedores propios: `ispmax-manual-pg` (postgres:18, `127.0.0.1:55432`, BD `ispmax_manual`) y
  `ispmax-manual-redis` (redis:7-alpine, `127.0.0.1:56379`). Etiqueta `purpose=ispmax-manual-docs`
  (para listar/borrar: `docker ps -a --filter label=purpose=ispmax-manual-docs`).
- ✅ Esquema copiado con `pg_dump --schema-only` desde `ispmax` (solo lectura) + filas de la tabla
  `migrations` (81). 73 tablas, 0 datos. Faltan por aplicar las migraciones nuevas del código (111 archivos).
- ✅ Credenciales locales generadas en `C:\WORKSPACE\_ispmax-src\instance\secrets.env` (fuera del repo;
  NO copiar a notas ni a git). Usuario admin de pruebas se creará con la contraseña `ADMIN_PASSWORD` de ese archivo.
- ✅ `npm ci --ignore-scripts` en backend y frontend (logs en `...\instance\npm-*.log`); `npm rebuild bcrypt`.
  `PUPPETEER_SKIP_DOWNLOAD=1`. **El backend no declara `pg` en `package.json`** (el driver de Postgres no se instala
  con `npm ci`): se instaló con `npm install pg@8 --no-save`. Hallazgo para desarrollo.
- ✅ Parches SOLO en la copia extraída (originales guardados en `...\instance\*.orig`):
  `src/app.module.ts` → Redis `REDIS_HOST/REDIS_PORT` (antes fijo 6379);
  `quasar.config.js` → `devServer.open=false`.
- ✅ Migraciones aplicadas con `npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts` (de 81 → 113 filas en
  `migrations`). Backend compilado con `npx nest build` (≈90 s). `.env` local en el backend y en el frontend
  (fuera del repo, con credenciales generadas).
- ✅ Siembra mínima con `tools/instance/seed-base.mjs` (empresa "ISP Demo", sucursal "Matriz", usuario
  `admin@manual.local` rol SUPER-ADMINISTRADOR, fila `settings`). No hay endpoint público de bootstrap:
  todo el API está tras `@Auth()` salvo `POST /api/auth/login`.
- 🔄 Arranque: backend `node dist/main` (puerto **3004**, log en `...\instance\backend.log`); frontend `npx quasar dev`
  (puerto **8080**, proxy `/api` → `localhost:3004`, router en modo hash: `http://localhost:8080/#/login`).

### Capturas de pantalla

`tools/capture/` (package propio con `puppeteer-core` + `sharp`): `node capture.mjs [--only prefijo/] [--list]` lee
`manifest.json` (id, ruta, pasos, recorte, anotaciones numeradas, ocultar selectores) e inicia sesión con la cuenta
de pruebas. Salida: `assets/imgs/<id>.webp` (≤1600 px, calidad 82). Solo acepta `localhost`. **Edge** (único navegador
Chromium presente en esta máquina) se lanza aparte y se conecta por puerto de depuración, porque su proceso lanzador
termina enseguida y `puppeteer.launch` lo da por fallido. Resolución real 1440×900 (la del panel integrado de Claude
es mucho menor: no usarlo para capturas finales, solo para explorar).

### Cómo levantar / detener la instancia aislada

```bash
docker start ispmax-manual-pg ispmax-manual-redis
cd /c/WORKSPACE/_ispmax-src/backend/backend-isp-main  && node dist/main
cd /c/WORKSPACE/_ispmax-src/frontend/frontend-isp-main && npx quasar dev
# detener y borrar todo:
docker rm -f ispmax-manual-pg ispmax-manual-redis
```

### Variables de entorno (solo nombres) ✅

Backend (`process.env.*`): `PORT STAGE DB_HOST DB_PORT DB_NAME DB_USERNAME DB_PASSWORD DB_SSL JWT_SECRET
REDIS_HOST REDIS_PORT TZ INTERVALO_MINUTOS (cron diario = "<min> 0 * * *")` · identidad de instancia:
`CLIENTE SISTEMA DOMINIO NOMBRE_EMPRESA PAIS MONEDA MONEDA_SIMBOLO MONEDA_CODIGO MONEDA_NOMBRE MONEDA_FRACCION
IVA_ESTANDAR APP_TIMEZONE APP_LOCALE CODIGO_PAIS_TELEFONO ES_INSTANCIA_GESTION INSTANCIA_DIRECCION` ·
servicios externos: `HOST_API_WHATSAPP API_WHATSAPP HOST_WEBSOCKET HOST_API_FACTURACION FACTURACION_PROVIDER
FACTURACION_ELECTRONICA HOST_API HOST_API_MASTER MASTER_SERVICE_TOKEN SERVICE_TOKEN REGISTRO_PAGOS_TOKEN(S)
PAYMENTS_GATEWAY_{URL,API_KEY,WEBHOOK_SECRET,MERCHANT_CODE,MERCHANT_NAME} SIGNATURE_GATEWAY_{URL,API_KEY,
WEBHOOK_SECRET,WEBHOOK_URL} META_{APP_ID,VERIFY_TOKEN,GRAPH_VERSION} DUALHOOK_{API_URL,GRAPH_VERSION}
OPENAI_{API_KEY,MODEL} API_BCV URL_SLACK LIBREOFFICE_{PATH,CWD}_{WINDOWS,LINUX} SERVER_IP`.

Frontend (`import.meta.env.VITE_*`, fijadas al compilar): `VITE_AMBIENTE (dev → usa VITE_BASE_URL/api; otro → /api)
VITE_BASE_URL VITE_COMPANY_NAME VITE_HOST_KEY_PERMISOS VITE_PAIS (def. EC) VITE_FACTURACION_PROVIDER
(sri|factus|ninguno) VITE_FACTURACION_ELECTRONICA VITE_MONEDA_{SIMBOLO,CODIGO,LOCALE} (def. $ USD en-US)
VITE_APP_TIMEZONE (def. America/Guayaquil) VITE_TEL_DEFAULT_COUNTRY VITE_WEBSOCKET VITE_API_WHATSAPP
VITE_HOST_API_FACTURACION VITE_MAPBOX_TOKEN VITE_OCULTAR_MESES_PLAZO VITE_CONSUMIDOR_FINAL_ID`.
→ **El comportamiento de la UI depende del país/proveedor de facturación/moneda de cada instalación.**
El manual debe describir el caso base (Ecuador, SRI, USD) y marcar las diferencias.

Estado de cada paso: ver `notes/estado.md`.

### Datos demo y efectos secundarios (2026-10-12, 2.ª sesión)

- `tools/instance/seed-demo.mjs` sembró 1 router de ejemplo (`ROUTER DEMO`, `192.0.2.10`, IP de documentación: nunca
  conecta), 3 planes, 1 red IPv4, 2 formas de pago y 10 clientes con 30 facturas. La empresa demo tiene
  `requiere_facturacion=false` (sin el aviso de firma electrónica en las capturas).
- El monitor de routers del backend intenta conectar a `192.0.2.10` cada 5 minutos y registra "sigue sin conexión":
  es esperado. No hay Slack ni WhatsApp configurados, por lo que no sale nada al exterior.
- Búsqueda en Registrar Pago: los nombres demo llevan tilde (`MARÍA`); buscar `LEMA` o `MARÍA` (no `MARIA`).
- El servidor de desarrollo de Vite a veces deja `/registrar-pago` en blanco la primera carga: `tools/capture`
  reintenta con una recarga cuando falla `waitFor`.
- Capturas: `cd tools/capture && node capture.mjs [--only prefijo]`; textos de pantalla:
  `node dump-text.mjs <ruta sin "/" inicial> [--eval "<js>"]`.

### Instancia local sobre el código nuevo (2026-10-21, sesión de actualización a `zip-2026-10-14`)

- Código: `~/Downloads/ispmax/{backend,frontend}-isp-main` (idéntico al `HEAD` de `~/Repositorios/{backend,frontend}-isp`,
  que **tienen historial git**: sirven para ver qué cambió, ver `docs-maintenance.md` §3). No se ejecuta nada desde
  esas carpetas salvo lo que el usuario ya levantó (backend `node dist/main` en :3004 y `quasar dev` en :8080).
- Contenedores `ispmax-local-pg` (postgres:18, `127.0.0.1:55432`, BD `ispmax_local`) y `ispmax-local-redis`. Usuario
  `admin@ispmax.local`; la clave está en `~/Downloads/ispmax/ACCESO-LOCAL.txt` (no se copia a notas ni al repo).
- Datos demo: `ISPMAX_PG_CONTAINER=ispmax-local-pg ISPMAX_PG_DB=ispmax_local node tools/instance/seed-demo.mjs`
  (idempotente; 3 planes, 1 router `ROUTER DEMO`, 10 clientes, 30 facturas).
- **Permisos:** `seed-base.mjs` crea el administrador con `permisos` vacío y el guard del panel rebota toda pantalla al
  inicio. `ISPMAX_FE_SRC=~/Downloads/ispmax/frontend-isp-main/src node tools/instance/seed-permisos.mjs` carga los 283
  valores del catálogo (hay que volver a iniciar sesión).
- **Variables del frontend:** el panel debe arrancar con `VITE_HOST_KEY_PERMISOS` (cualquier texto) y
  `VITE_COMPANY_NAME` (p. ej. `ispmaxlocal`); sin la primera, el login deja los permisos cifrados vacíos y no se puede
  navegar autenticado (la clave de `localStorage` queda `auth/user/undefined`). Ejemplo, desde `frontend-isp-main`:
  `VITE_HOST_KEY_PERMISOS=clave-local VITE_COMPANY_NAME=ispmaxlocal BROWSER=none npx quasar dev`.
- Se puede comprobar sin sesión (probado): el modal "¿Olvidaste tu contraseña?" del login, `/restablecer-password`, el
  bloqueo a los 5 intentos fallidos (`POST /api/auth/login`), los 429 del límite de peticiones y el restablecimiento
  con un token escrito a mano en Redis (`SET recovery:<64 hex> '"<id de usuario>"' EX 900`). El correo del sistema no
  está configurado: "No se pudo enviar el correo…" es lo esperado.
- Un navegador reutiliza el origen `http://localhost:8080`; `recuperar-password` con `curl` necesita la cabecera
  `Origin` (sin `DOMINIO` definido responde 500).
