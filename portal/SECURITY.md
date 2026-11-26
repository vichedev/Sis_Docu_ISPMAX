# Seguridad del portal del manual ISPMAX

Estado al 2026-11-26 (Adenda 5 de `CONTRACT.md`). Este documento resume qué se protege, cómo, con qué variables, qué se probó y qué no.

## 1. Modelo de amenazas (breve)

| Activo | Quién lo ataca | Cómo | Control principal |
|---|---|---|---|
| Cuentas del panel (sobre todo admin) | Cualquiera en Internet | Fuerza bruta, relleno de credenciales, contraseñas por defecto | Bloqueo persistente, política de contraseñas, 2FA, ruta oculta, lista de IPs |
| Sesión de un admin | Sitio malicioso que visita el admin; red insegura | CSRF, robo o fijación de cookie | Cookie `__Host-`/`Secure`/`HttpOnly`/`SameSite=Strict`, Origin + `Sec-Fetch-Site`, rotación, caducidades |
| Datos y acciones de la API | Visitante anónimo o rol bajo | Endpoints sin autenticación, trucos de ruta, métodos alternativos | Sesión obligatoria en todo `/api/*`, matriz de roles comprobada en pruebas |
| El manual (mismo origen que el panel) | Un editor malicioso | Código en MDX que corre en el navegador de un admin (escalada editor → admin) | Contenido publicado sin código ejecutable (`server/routes/mdxSafety.mjs`) |
| Secretos del servidor | Visitante anónimo | `/.env`, `.git`, copias `.bak`, trazas de error, `/healthz` | Servidor estático con lista negra de rutas, errores genéricos, salud sin datos |
| Semillas 2FA y códigos | Quien obtenga un volcado de la BD | Lectura de la tabla `users` | AES-256-GCM con clave fuera de la BD; códigos y tokens solo como huella SHA-256 |
| Disponibilidad del login | Atacante con muchas peticiones | bcrypt cuesta CPU | Máximo 8 verificaciones simultáneas, bloqueos por IP/usuario |

Fuera de alcance: el proxy inverso y su TLS, el sistema operativo, Docker y PostgreSQL (se configuran en el despliegue), y el contenido que un admin importa en un paquete `.ispmax` (un admin ya puede todo).

## 2. Controles implementados

**Sesiones** (`server/auth.mjs`). Token aleatorio de 32 bytes solo en la cookie; en `sessions.token_hash` se guarda su SHA-256 (nunca el token). Cada inicio de sesión crea un token nuevo y borra la sesión que traía el navegador (sin fijación). Caducidad por inactividad (`PORTAL_SESSION_IDLE_H`, def. 12 h) y absoluta (`PORTAL_SESSION_MAX_DAYS`, def. 7 días). Se guardan `created_at`, `last_seen_at`, `ip` y `user_agent`. Cookie `HttpOnly`, `SameSite=Strict`, `Path=/`; con https efectivo (o `PORTAL_COOKIE_SECURE=true`) `Secure` y nombre `__Host-portal_session`; sin https, `portal_session`. Cambiar la contraseña cierra las demás sesiones; desactivar, cambiar de rol o fijar la contraseña de una persona cierra las suyas. `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id` y `POST /api/auth/sessions/revoke-others`.

**Migración.** El esquema (`db/schema.sql`, idempotente) se aplica al arrancar el servidor con un candado consultivo (`server/schema.mjs`), también desde `admin-cli` y `migrate`. La tabla de sesiones antigua (token en claro) se convierte y **sus sesiones se borran: todos deben volver a iniciar sesión una vez**. Los usuarios y sus hashes bcrypt se conservan; al entrar bien, un hash con coste menor que 12 se rehace con coste 12.

**Bloqueo anti fuerza bruta** (tablas `login_attempts` y `login_locks`, persisten tras reiniciar). Usuario+IP: 5 fallos en 15 min → bloqueo de 15 min, que se duplica en cada reincidencia (30, 60… máx. 24 h; vuelve a 15 min tras 24 h sin bloqueos). IP: 20 fallos en 15 min (con cualquier usuario). Usuario en todas las IP: 30 fallos en 15 min → 15 min (máx. 1 h; salvaguarda si la IP se pudiera falsificar). Respuesta **429** con `Retry-After` y `{error, retryAfter}`. Un acceso correcto reinicia el contador usuario+IP. Los códigos 2FA erróneos y las contraseñas erróneas al confirmar (2FA, cambio de contraseña) cuentan igual. Desbloqueo manual: `admin:reset` borra los intentos de ese usuario.

**Mensajes y tiempos.** Fallo de inicio de sesión siempre «Usuario o contraseña incorrectos.» (usuario inexistente, inactivo o contraseña mala). Siempre se hace una comparación bcrypt completa: si el usuario no existe se compara contra un hash real de coste 12 generado al arrancar. *Hallazgo corregido:* antes se comparaba contra un hash mal formado que bcryptjs descarta en 0 ms, frente a ~60–250 ms con un usuario real: se podía saber por el tiempo qué usuarios existen.

**Política de contraseñas** (`server/passwordPolicy.mjs`, única): 10 a 128 caracteres; no igual ni derivada del usuario (`soporte2026!`); no en la lista de comunes o de instalación (`admin1234`, `12345`, `password`, `agente-prueba`…) ni una raíz común con números (`Password2026!`); no repeticiones ni secuencias (`aaaa…`, `abcabc…`, `1234…`, `qwerty…`). Se aplica al crear usuarios, al cambiar la contraseña, al fijarla un admin (la persona deberá cambiarla al entrar), en `admin-cli` e instaladores (que la importan o la replican). Al iniciar sesión correctamente, si la contraseña guardada ya no cumple, `users.must_change_password = true`.

**Verificación en dos pasos** (TOTP RFC 6238, SHA-1, 6 dígitos, 30 s, ventana ±1, `server/security/totp.mjs` con `node:crypto`). El secreto se cifra con AES-256-GCM (`server/security/secrets.mjs`, AAD ligado al usuario); la clave sale de `PORTAL_SECRET_KEY` o del archivo `<PORTAL_DATA_DIR>/secret.key` (0600, se crea al primer uso). 10 códigos de recuperación de un solo uso (solo su huella). Un código TOTP ya aceptado no vale otra vez (`users.totp_last_step`, actualización atómica). El primer paso del login devuelve un reto opaco (solo su huella en `login_challenges`), de 5 min y un solo uso; 5 códigos erróneos lo anulan. Un admin puede restablecer la 2FA de otra persona (`POST /api/users/:id/2fa/reset`); por consola, `admin:reset -- --user X --2fa-off`.

**Sesión restringida.** Con `must_change_password`, o con el ajuste `require_2fa_for_admins` y un admin sin 2FA, la sesión solo puede usar `/api/auth/*`; el resto da **403** `{error, code:'PASSWORD_CHANGE_REQUIRED'|'2FA_ENROLL_REQUIRED'}`.

**CSRF.** En métodos que escriben: `Origin` igual al host efectivo (o en `PORTAL_ALLOWED_ORIGINS`) y `Sec-Fetch-Site` distinto de `cross-site` (`same-site` solo con un Origin permitido). Además la cookie es `SameSite=Strict`.

**Cabeceras.** `/api/**` y el panel: `Cache-Control: no-store` (las imágenes de `/api/assets/file`: `private, no-cache`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex, nofollow, noarchive`. CSP del panel: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-…'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` (las huellas son las de los `<script>` en línea del `index.html` compilado, calculadas al servirlo). CSP de la API: `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; sandbox`. El manual público conserva su CSP (`frame-ancestors 'self'`) y HSTS con https efectivo.

**Ruta de administración oculta** (`PORTAL_ADMIN_PATH`, `server/http/adminPath.mjs`). Ver § 4.

**Contenido sin código.** El manual comparte origen con el panel: una página publicada con `export const x = fetch('/api/users', …)`, `onError={…}`, `javascript:`, `<script>`, `<iframe srcdoc>`, expresiones `{…}` o `head` con algo que no sea `<meta>` se ejecutaría en el navegador de un admin con su sesión. *Hallazgo corregido:* un editor podía escalar a admin así. Ahora el contenido **publicado** (guardar una página publicada, publicar —también con `force`—, publicar borradores, restaurar una revisión publicada) se rechaza con 400 si lleva algo ejecutable; los borradores se pueden guardar. `POST /api/pages/validate` lo muestra como error. Los enlaces del menú de la Guía no admiten `javascript:`/`data:`. Comprobado sobre las 285 páginas del corpus: 0 falsos positivos.

**Errores.** Un error inesperado responde `{error:"Error interno del servidor."}` (sin mensaje, traza ni ruta; también en las rutas de OPS). Los mensajes escritos para el usuario (`httpError`) se muestran con su código.

**Archivos.** El servidor estático rechaza segmentos ocultos (`.env`, `.git`), `..` (también codificado o doblemente codificado), barras invertidas, NUL y, desde ahora, copias y volcados (`*.bak`, `*.old`, `*.orig`, `*.swp`, `*~`, `*.sql`, `*.dump`, `*.key`, `*.pem`, `*.env`, `*.log`, `*.ispmax`).

**Proxy de confianza.** *Hallazgo corregido:* con `PORTAL_TRUST_PROXY=true` (valor de la plantilla Docker) Fastify tomaba como IP del cliente la **primera** de `X-Forwarded-For`, que escribe el propio cliente aunque el proxy añada la suya (`$proxy_add_x_forwarded_for`): se podía saltar `PORTAL_ADMIN_ALLOWED_IPS` y el bloqueo por IP enviando `X-Forwarded-For: <IP permitida>`. Ahora `true` = **un** proxy delante (se toma la última IP, la que añade el proxy). *Hallazgo corregido:* con un número (`PORTAL_TRUST_PROXY=2`) la versión instalada de Fastify no confiaba en nada; ahora se traduce a una función de saltos. Con dos proxys encadenados (CDN + Nginx) use `2`, o mejor la IP/CIDR de los proxys.

**Otros cambios.** `GET /api/system/version` y `/api/git/status` solo hacen `git fetch` (red) si quien pregunta es admin. Auditoría (`audit_log`) de `auth.login`, `auth.login_failed` (con usuario, motivo, IP y UA; nunca la contraseña), `auth.lockout`, `auth.2fa_*`, `auth.logout`, `auth.password`, `session.revoke`, `security.probe`; `GET /api/auth/me` incluye `lastLogin` (el acceso anterior).

## 3. Variables

| Variable | Def. | Efecto |
|---|---|---|
| `PORTAL_SESSION_IDLE_H` | 12 | Horas de inactividad hasta que caduca una sesión (0,05–720). |
| `PORTAL_SESSION_MAX_DAYS` | 7 | Duración máxima de una sesión (0,01–90). |
| `PORTAL_SECRET_KEY` | — | Clave AES de los secretos 2FA (64 hex; `openssl rand -hex 32`). Vacía: `<datos>/secret.key`. **No la cambie con 2FA en uso**: los códigos TOTP dejarían de validar (quedan los de recuperación y el restablecimiento por un admin). Guárdela junto a los respaldos de la BD: un `pg_dump` restaurado sin esa clave pierde la 2FA. |
| `PORTAL_ADMIN_PATH` | `/admin` | Ruta del panel (§ 4). |
| `PORTAL_HIDE_ADMIN` | — | `true` oculta también con `/admin`. |
| `PORTAL_PROBE_THRESHOLD` | 20 | Sondeos por IP en 5 min antes de bloquear 30 min el panel y la API a esa IP. |
| `PORTAL_TRUST_PROXY` | false | `true` = 1 proxy; número de saltos; o IP/CIDR del proxy (recomendado). |
| `PORTAL_COOKIE_SECURE`, `PORTAL_ALLOWED_ORIGINS`, `PORTAL_ADMIN_ALLOWED_IPS` | — | Ver `server/index.mjs`. |

Ajuste del panel (Ajustes → Seguridad): `require_2fa_for_admins` (def. no). Actívelo cuando su propia cuenta ya tenga 2FA.

## 4. Ruta de administración oculta

`PORTAL_ADMIN_PATH=/panel-1a2b3c4d5e6f7a8b` (un segmento: minúsculas, números, `_` o `-`; 3 a 64; no `api`, `assets`, `static`, `healthz`, `robots.txt`, `sitemap.xml`, `manual` ni una sección del manual; si coincide con el comienzo de una página publicada el servidor no arranca). `install-docker.sh`/`install.sh` generan `/panel-<16 hex>` si no se indica `--admin-path`, la guardan en `.env` y la muestran **una sola vez**.

Con una ruta distinta de `/admin` (o `PORTAL_HIDE_ADMIN=true`): el panel se sirve en `<ruta>/` (con `<base href="<ruta>/">` inyectado) y la API **solo** en `<ruta>/api/*` (internamente se reescribe a `/api/*`). `/api/*` directo, `/admin*`, sus variantes (`/API`, `/%61pi`, `//api`) y cualquier otra cosa devuelven **exactamente** el mismo 404 que una ruta inexistente del manual (cuerpo, código y cabeceras). Una IP no permitida, el panel deshabilitado o una IP bloqueada por sondeos reciben ese mismo 404 (no 403/503). `robots.txt` no nombra el panel ni la API (se protegen con `X-Robots-Tag`), y ni el sitemap, ni el HTML/JS/CSS/JSON del manual, ni sus cabeceras o su 404 contienen la ruta ni `/api/` (comprobado por un rastreo en `test/hidden-admin.test.mjs` sobre un sitio de prueba).

Sondeos: por IP real (según `PORTAL_TRUST_PROXY`) se cuentan accesos a rutas de escaneo (`/wp-*`, `/.env`, `/.git*`, `*.php`, `/phpmyadmin`, `/actuator`, `/server-status`, `/login`…, y en modo oculto `/admin*` y `/api*` directos). Al llegar a `PORTAL_PROBE_THRESHOLD` en 5 min, esa IP queda 30 min sin panel ni API (en memoria: se olvida al reiniciar); el manual público nunca se bloquea. Se audita una vez por bloqueo (`security.probe`). **Riesgo:** con un proxy mal configurado todas las peticiones llegan con la IP del proxy y un escáner bloquearía el panel para todos durante 30 min (el manual sigue).

**Es una capa extra, no un control principal.** No sustituye a la contraseña fuerte, la 2FA ni la lista de IPs. Una palabra del diccionario se adivina: use un sufijo aleatorio largo. La ruta puede filtrarse por el historial o los marcadores del navegador, capturas de pantalla, registros del proxy o de un CDN, o la cabecera `Referer` (mitigada con `Referrer-Policy: no-referrer`; los enlaces externos del panel deben llevar `rel="noopener noreferrer"`). Si se filtra, cámbiela en `.env` y `docker compose up -d`.

## 5. Qué se probó (cifras de `npm test`, 2026-11-26)

- `test/auth-unit.test.mjs`: vectores oficiales de HOTP (RFC 4226, apéndice D) y TOTP (RFC 6238, apéndice B, SHA-1/256/512), base32, ventana y anti-reutilización, política, cifrado (manipulación, otro AAD u otra clave fallan), clave en archivo, huella, ruta oculta, sondeos, contenido MDX, proxy.
- `test/auth.test.mjs`: migración de la tabla antigua, huella en BD, cookie por protocolo, rotación y fijación, caducidades, mensajes y tiempos, bloqueos (persisten tras reiniciar, crecen, por IP y por usuario), política en todos los caminos, sesión restringida, 2FA completa, `require_2fa_for_admins`, sesiones propias, CSRF, auditoría sin secretos.
- `test/security.test.mjs`: enumeración de **todas** las rutas registradas (hook `onRoute`) contra la matriz `ROUTE_MATRIX` de `scripts/security-scan.mjs`; barrido sin sesión de cada `/api/*` con 7 métodos; viewer/editor contra rutas de rol superior; 27 trucos de ruta; HEAD/OPTIONS/override de método; CORS; `X-Forwarded-*` falsas; 37 rutas de archivos sensibles; errores sin trazas (incluido un 500 forzado); fugas en `/healthz`, `/api/system/info`, robots y sitemap; cabeceras; límites de tamaño; contenido con código.
- `test/hidden-admin.test.mjs`: 404 indistinguible, ruta real, IP/deshabilitado/sondeos, robots/sitemap, rastreo de descubribilidad, validación y colisión, modo por defecto.

Prueba real (2026-11-26, `dev-test-server` en el puerto 4405 con base propia, después borrada): login, bloqueo con `Retry-After`, política, 2FA con códigos TOTP reales, recuperación, sesiones, sesión restringida y CSRF con `fetch` real, y `security:scan` con 314 comprobaciones (modo por defecto) y 324 (modo oculto), 0 fallos. Rastreo del manual real construido (600 URL: 286 HTML, 152 JS, CSS, JSON, manifiesto, imágenes, robots, sitemap, 404): **0 apariciones de la ruta del panel**; la cadena `/api/` aparece en 11 páginas (y sus bundles JS) porque documentan rutas de la API **del producto ISPMAX** (`/api/cloud-api/webhook`, `/api/registro-pagos`…) o enlaces externos; no se refieren a este portal y quitarlas exigiría cambiar el contenido del manual.

**No probado:** el despliegue real detrás del proxy de `doc.ispmax.ec` (cadena de proxys, si hay CDN), HTTPS real (`__Host-` y HSTS solo con `inject` y `X-Forwarded-Proto`), navegadores reales con `Sec-Fetch-Site`, la carga sostenida contra bcrypt, y la interfaz de 2FA (otro agente).

## 6. Barrido contra una instancia en marcha

```bash
cd portal
npm run security:scan -- https://doc.ispmax.ec                       # modo por defecto (/admin)
npm run security:scan -- https://doc.ispmax.ec --admin-path /RUTA     # con la ruta oculta (no la deje en el historial)
npm run security:scan -- --audit                                      # npm audit de portal/, portal/web/ y la raíz
```

En Git Bash (Windows) anteponga `MSYS_NO_PATHCONV=1`: si no, convierte `/RUTA` en una ruta de Windows. Solo lectura y sin credenciales: lee rutas y, en las que escriben, envía el método con un cuerpo JSON roto (si la sesión fallara, el servidor respondería 400 al leer el cuerpo, sin ejecutar nada). Informe con cada ruta y su veredicto; código de salida 1 si hay fallos. Las rutas de archivos sensibles van al final porque cuentan como sondeos: la IP que ejecuta el barrido puede quedar 30 min sin panel (nunca sin manual). Ejecútelo desde una IP que no sea la de trabajo.

## 7. Dependencias (`npm audit`, 2026-11-26)

| Paquete | Gravedad | Situación |
|---|---|---|
| raíz: `react-router`, `react-router-dom` | alta | **Corregido** con `npm audit fix` (sin `--force`): raíz con 0 vulnerabilidades. |
| portal: `@fastify/static` | alta | Aceptado: no se usa el listado de directorios ni su enrutado (`serve:false`); solo `sendFile` con rutas validadas por `safeRelPath`. La corrección exige la versión mayor 11. |
| portal: `sharp` (libvips) | alta | Aceptado de momento: solo procesa imágenes de editores autenticados y paquetes de un admin. Corrección: sharp 0.35 (mayor; cambia la salida WebP). Recomendado actualizar en un cambio aparte y probado. |
| portal: `glob`, `minimatch` | moderada | Dependencias de `@fastify/static`; no se usan con datos del usuario. |
| portal/web: `vite`, `esbuild` | alta/moderada | Solo el servidor de desarrollo; producción sirve el panel compilado. |

`npm run security:scan -- --audit` lista lo que haya y falla si aparece algo alto/crítico no aceptado (`ACCEPTED_ADVISORIES`).
