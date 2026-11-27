# Despliegue con Docker (manual + portal en un solo puerto)

Sustituye al contenedor antiguo `ispmax-manual` (Nginx estático) por el sistema nuevo, en el **mismo puerto (8387)**:

| Ruta | Qué sirve |
|---|---|
| `/` | El manual, **dibujado al pedirlo desde la base de datos** (modo dinámico, por defecto): guardar en el panel = visible en la siguiente visita, sin construir nada. Responde 503 «El manual se está preparando» mientras no haya páginas publicadas |
| `/admin/` o la ruta secreta (`PORTAL_ADMIN_PATH`) | El panel de administración (con ruta secreta, `/admin` responde como una página inexistente) |
| `/api` (o `<ruta secreta>/api`) | La API |
| `/healthz` | Comprobación de salud (la usa Docker) |

La aplicación **no está dentro de la imagen**: corre desde la copia del repositorio montada en `/app`. Así el botón «Actualizar el sistema» del panel funciona dentro del contenedor: en Docker solo trae el código (git) y reinicia; `docker/entrypoint.sh` instala dependencias, compila el panel **y el tema del manual** y migra el esquema al arrancar. PostgreSQL 17 va en un segundo contenedor (`ispmax-manual-db`) sin puerto publicado.

## 0. Manual dinámico (desde 2026-11-26)

- **El contenido nunca se compila en disco.** Cada página se compila y se pinta en memoria la primera vez que se pide (o en segundo plano justo después de guardarla) y se guarda en una caché LRU (`PORTAL_SITE_CACHE_MB`, def. 256). No hay «Publicando…», ni trabajos `publish`, ni `portal/work/site`, ni `<datos>/site`.
- **El tema** (React + Tailwind del repo: `theme/`, `src/components/`, `styles/`) **se compila una vez por despliegue**: `cd portal && npm run site:build` (Vite, ~6-10 s) → `portal/site/dist/` (no se versiona). En Docker lo hace `docker/entrypoint.sh` tras compilar el panel, solo si cambió el commit o algún `package-lock.json` (marca `state/site-build.sha`). Si falta, el servidor arranca igual (panel y API disponibles), escribe en el registro `Falta el tema compilado del manual…` y el manual responde 503 con un aviso; `GET /api/site/status` da `state: "error"` y el mensaje.
- **Primer arranque en modo dinámico:** borra lo que quedó del flujo anterior (`<PORTAL_WORK_DIR>/site`, `<PORTAL_DATA_DIR>/site`, `site.tmp-*`, `site.old-*`, `site-meta.json`; lo registra con los MB liberados) y poda `publish_jobs` (deja los 20 últimos `publish` y recorta registros de más de 32 KB conservando la línea `RESULTADO`).
- Variables: `PORTAL_RENDER_MODE` (`dynamic` por defecto; `static` vuelve al build de Rspress por publicación, como alternativa temporal), `PORTAL_SITE_CACHE_MB`, `PORTAL_SITE_WARMUP` (`lazy` por defecto: portada, portadas de sección y las más visitadas; `all`: todas al arrancar, ~10 s en segundo plano), `PORTAL_SITE_COMPILER` (`process` por defecto: proceso hijo con el modelo de permisos de Node; `thread`, `inline`), `PORTAL_SITE_COMPILE_TIMEOUT_S` (def. 30). No hace falta definir ninguna.
- Métricas (solo admin): `GET /api/system/info` → `site.metrics` (páginas, en caché, bytes, límite, compilaciones, tiempos medios, memoria del proceso).
- Seguridad del contenido que se evalúa en el servidor: `portal/SECURITY.md` § 8.

## 1. Lista de comprobación previa

- [ ] Docker Engine con Compose v2 (`docker compose version`) y su usuario puede ejecutar `docker` (grupo `docker`).
- [ ] La copia del repositorio está en el servidor (`git clone` o `git pull`) y la rama trae los archivos nuevos: `Dockerfile`, `docker-compose.yml`, `docker/entrypoint.sh`, `install-docker.sh`, `Dockerfile.legacy`, `docker-compose.legacy.yml`, `nginx.conf.legacy`.
- [ ] El repositorio pertenece a un usuario normal (no root): el contenedor ejecutará la aplicación con ese UID/GID.
- [ ] Salida a Internet desde el contenedor en el primer arranque (npm y, al actualizar, el remoto de Git).
- [ ] Espacio libre: unos 2 GB para imagen, dependencias y volúmenes.
- [ ] Si el repositorio es privado: credenciales para `git pull` dentro del contenedor (sección 5).
- [ ] Anotado el puerto y el contenedor actuales: `docker ps --filter name=ispmax-manual`. Si lo gestiona Portainer (stack `ispmax-manual`), el instalador elimina **el contenedor**, no el stack; ver sección 8.
- [ ] Paquete de contenido `.ispmax` (necesario: sin él `/` responde 503; si no se tiene a mano, se puede cargar después desde el panel).

## 2. Instalación

Desde la raíz del repositorio:

```bash
ISPMAX_ADMIN_PASSWORD='una-clave-larga-de-10-o-mas-caracteres' \
  bash install-docker.sh --yes --admin-user soporte
# con restricción de IP para /admin/ y paquete de contenido:
#   --admin-ips 203.0.113.10,10.0.0.0/8   --content /ruta/paquete.ispmax
```

Sin `--yes` pregunta cada dato y pide la contraseña de forma oculta. `bash install-docker.sh --help` lista las opciones (`--public-port`, `--overwrite-env`, `--no-build`, `--wait-timeout`).

El script, en orden: comprueba Docker; **avisa del contenedor antiguo y pide confirmación** (o `--yes`) antes de detenerlo y eliminarlo, sin tocar volúmenes ni imágenes; escribe `.env` (permisos 600, contraseña de PostgreSQL aleatoria que no se muestra; un `.env` existente se conserva y se guarda `.env.bak` si usa `--overwrite-env`); detecta `PUID/PGID` del propietario del repositorio; ejecuta `docker compose up -d --build`; espera a `healthy` mostrando el avance de los logs; crea el administrador (la contraseña viaja solo por entorno y stdin, nunca por argumentos) y, con `--content`, importa el paquete. Registro sin contraseñas en `install-docker.log`.

**El primer arranque tarda varios minutos** (instala dependencias de la raíz, `portal/` y `portal/web/` y compila el panel y el tema del manual). Los siguientes tardan segundos: el arranque solo repite `npm ci` si cambió algún `package-lock.json` y solo recompila el panel y el tema si cambió el commit o el lock.

Variables (`.env`, plantilla `.env.docker.example`): `POSTGRES_PASSWORD`, `PORTAL_PUBLIC_PORT`, `PUID`, `PGID`, `PORTAL_TRUST_PROXY`, `PORTAL_ADMIN_ENABLED`, `PORTAL_ADMIN_ALLOWED_IPS`, `PORTAL_COOKIE_SECURE`, `PORTAL_ALLOWED_ORIGINS`, `PORTAL_PUBLIC_URL`, `PORTAL_ADMIN_PATH`, `PORTAL_PROBE_THRESHOLD`, `PORTAL_SECRET_KEY`, `PORTAL_SESSION_IDLE_H`, `PORTAL_SESSION_MAX_DAYS`, `GIT_DEPLOY_KEY_FILE`, `TZ`. Las de seguridad se explican en `portal/SECURITY.md`.

**Seguridad del acceso (2026-11-26).** El instalador genera una ruta secreta para el panel (`--admin-path` para elegirla; si no, `/panel-<16 hex>`), la guarda en `.env` y **la muestra una sola vez**: anótela. Con ella, `/admin` y `/api` directos responden como cualquier página inexistente y la API pasa a `<ruta>/api/`. Es una capa extra: siguen siendo imprescindibles una contraseña fuerte (la política exige 10+ caracteres, no comunes ni derivadas del usuario), la verificación en dos pasos (Mi cuenta; puede exigirse a los admins en Ajustes → Seguridad) y, si se puede, `PORTAL_ADMIN_ALLOWED_IPS`. También genera `PORTAL_SECRET_KEY` (cifra los secretos de la 2FA; **guárdela con los respaldos** y no la cambie con la 2FA en uso). Con un `.env` existente, añade `PORTAL_ADMIN_PATH` si falta y no toca lo demás (sin `PORTAL_SECRET_KEY`, la clave se crea en el volumen de datos).

**Al actualizar a esta versión todas las sesiones abiertas se cierran** (las antiguas guardaban el token en claro): cada persona vuelve a iniciar sesión. Si alguna contraseña no cumple la política, el panel pedirá cambiarla al entrar.

Fijados en `docker-compose.yml` (no en `.env`): `PORTAL_RESTART_MODE=exit` y `PORTAL_UPDATE_MODE=entrypoint`. Las demás variables `PORTAL_*` (por ejemplo `PORTAL_SITE_BASE`) están listadas en el comentario inicial de `portal/server/index.mjs`.

**SEO e indexación (`PORTAL_PUBLIC_URL`).** URL pública del manual, sin barra final (`https://doc.ispmax.ec`; plantilla y `--public-url` de `install-docker.sh`). La usan: el `<link rel="canonical">`, `og:url`/`og:image` y los datos estructurados (se leen al arrancar: tras cambiarla, `docker compose up -d`; en modo `static`, además «Reconstruir ahora») y `/sitemap.xml` y `/robots.txt` (en vivo). Vacía = sin definir: el sitio se genera sin canonical (aviso en el registro del build) y el sitemap usa el host de la petición (`X-Forwarded-*` solo con `PORTAL_TRUST_PROXY`). Se ve, solo lectura, en `GET /api/system/info` (`site.publicUrl`). Con HTTPS detrás del proxy (`X-Forwarded-Proto: https`) el servidor añade `Strict-Transport-Security`. `/robots.txt` y `/sitemap.xml` no requieren sesión.

## 3. Proxy inverso

Si el proxy ya apunta a `IP:8387` (y a su dominio) **no hay que cambiar nada**. Debe:

- Reenviar `Host` y `X-Forwarded-For`, `X-Forwarded-Proto` (y `X-Forwarded-Host` si lo usa). Con `PORTAL_TRUST_PROXY=true` (valor de la plantilla) el portal confía en **un** proxy: toma como IP del cliente la **última** de `X-Forwarded-For` (la que añade el proxy) y el esquema de `X-Forwarded-Proto`. Si hay dos proxys encadenados (por ejemplo un CDN delante de Nginx) ponga `PORTAL_TRUST_PROXY=2`; lo más seguro es la IP o CIDR de los proxys. Con un valor equivocado todas las personas compartirían IP: el bloqueo por IP (20 fallos) y el de sondeos afectarían a todas (el manual público nunca se bloquea). Hasta el 2026-11-26 `true` tomaba la **primera** IP, que el cliente puede inventar: se podía saltar la lista de IPs (corregido).
- Admitir cuerpos grandes (paquetes `.ispmax`): por ejemplo `client_max_body_size 200m;` en Nginx.
- Con HTTPS y `X-Forwarded-Proto: https` la cookie ya es `Secure` y se llama `__Host-portal_session` (y se envía HSTS). `PORTAL_COOKIE_SECURE=true` la fuerza aunque el proxy no envíe el esquema (entonces no se puede entrar por `http://IP:8387`).
- No exponer el puerto 8387 directamente a Internet si usa `PORTAL_ADMIN_ALLOWED_IPS`: el proxy debe ser el único camino, o la IP real podría falsificarse con cabeceras.

Ejemplo Nginx:

```nginx
location / {
  proxy_pass http://127.0.0.1:8387;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $remote_addr;   # o $proxy_add_x_forwarded_for (el portal toma la última IP)
  proxy_set_header X-Forwarded-Proto $scheme;
  client_max_body_size 200m;
}
```

**Lista de IPs para el panel y la API:** `PORTAL_ADMIN_ALLOWED_IPS=203.0.113.10,10.0.0.0/8` (IP o CIDR, separadas por comas; vacío = sin restricción). Tras cambiarla: `docker compose up -d`. `PORTAL_ADMIN_ENABLED=false` apaga el panel por completo.

## 4. Cargar el contenido y primer acceso

1. Abra `https://su-dominio<ruta secreta>/` (la que mostró el instalador; o `/admin/` si no hay ruta secreta) y entre con el usuario creado. Active la verificación en dos pasos en **Mi cuenta**.
2. **Inicio → tarjeta «Cargar el contenido del manual»** con el paquete `.ispmax` (o `bash install-docker.sh --content paquete.ispmax`, o desde Publicación → Respaldos). Hasta entonces `/` responde 503 «El manual se está preparando».
3. Si el manual no refleja el contenido cargado, revise **Publicación → Manual publicado**.

Cambiar la clave: `docker compose exec -u "$(id -u):$(id -g)" -e ISPMAX_ADMIN_PASSWORD ispmax-manual node portal/server/admin-cli.mjs reset --user soporte` (con la variable definida en su shell; si no, léala por stdin). Desbloquea al usuario y cierra sus sesiones; con `--2fa-off` además quita su verificación en dos pasos (teléfono y códigos perdidos). ¿Olvidó la ruta secreta? Está en `.env` (`PORTAL_ADMIN_PATH`).

Comprobación de seguridad sin credenciales y solo lectura: `cd portal && npm run security:scan -- https://doc.ispmax.ec --admin-path <ruta>` (ver `portal/SECURITY.md` § 6).

## 5. Repositorio privado: credenciales para `git pull` dentro del contenedor

El botón «Actualizar el sistema» ejecuta `git fetch` + `git merge --ff-only` en `/app` (usa la rama y el remoto del propio repositorio). Con un repositorio privado necesita credenciales. Opciones:

**A. Clave de despliegue SSH (recomendada).** Cree una clave solo para esto, agregue su parte pública como *deploy key* de solo lectura en el repositorio y cambie el remoto a SSH:

```bash
ssh-keygen -t ed25519 -N '' -f /srv/ispmax/deploy_key -C ispmax-deploy
git remote set-url origin git@github.com:ORGANIZACION/REPO.git
# en .env:
GIT_DEPLOY_KEY_FILE=/srv/ispmax/deploy_key
docker compose up -d
```

Se monta **de solo lectura** en el contenedor y el arranque la copia a un lugar con permisos 600 (`known_hosts` se aprende la primera vez). Riesgo: quien tenga acceso al contenedor o al volumen puede leer esa clave; con permiso de solo lectura el daño se limita a leer el repositorio.

**B. Token en la URL del remoto.** `git remote set-url origin https://USUARIO:TOKEN@github.com/ORGANIZACION/REPO.git` (token con permiso de solo lectura de contenido). Riesgo: el token queda **en texto plano** en `.git/config`, visible para quien lea el repositorio en el servidor y en algunas salidas de `git remote -v`. Use un token de alcance mínimo y caducidad corta, y no lo suba a ningún sitio.

En ambos casos, `git pull` manual en el host sigue funcionando igual que antes.

## 6. Copias de seguridad

- **Base de datos (lo imprescindible):** vive en el volumen `ispmax_pgdata`. Desde el servidor: `docker compose exec -T db pg_dump -U ispmax -Fc ispmax_manual > ispmax_$(date +%F).dump`.
- **Desde el panel:** **Publicación → Respaldos** genera un respaldo `.ispmax` del contenido y un `pg_dump` de la base (la imagen trae `pg_dump`/`pg_restore` de la versión 17, la del servidor `postgres:17-alpine`). Se crean y descargan desde el navegador y se guardan en una carpeta fija del volumen `ispmax_data` (`/var/lib/ispmax`); copie los archivos fuera del servidor periódicamente.
- **Volúmenes:** `ispmax_pgdata` (base), `ispmax_data` (sitio generado, respaldos, paquetes). Los volúmenes `ispmax_node_modules_*` se pueden borrar sin pérdida (se reinstalan).
- Restaurar: importe el `.ispmax` desde el panel, o `pg_restore` con el `.dump` sobre una base vacía.

## 7. Actualización

- **Normal:** panel → **Ajustes → Actualización del sistema**: trae el código (git) y reinicia. Las dependencias, la compilación del panel y del tema del manual y la migración del esquema las aplica `docker/entrypoint.sh` al arrancar. El reinicio hace salir el proceso y Docker lo vuelve a levantar (`restart: unless-stopped`). Fuera de Docker (`PORTAL_UPDATE_MODE=inline`), el propio proceso ejecuta `npm run site:build` si cambió el tema y pide reiniciar.
- **El contenido no se actualiza aquí:** se edita en el panel y se ve al guardar.
- **Cambios en `Dockerfile`, `docker-compose.yml` o `docker/entrypoint.sh`** (no los aplica el botón): en el servidor, `git pull && docker compose up -d --build`.
- Ver logs: `docker compose logs -f ispmax-manual`. Estado: `docker compose ps`.

## 8. Plan de vuelta atrás

Se conservan los archivos del sistema anterior: `Dockerfile.legacy`, `docker-compose.legacy.yml`, `nginx.conf.legacy`.

```bash
docker compose down                      # detiene el sistema nuevo; NO borra volúmenes (sin -v)
docker compose -f docker-compose.legacy.yml up -d --build   # vuelve al Nginx estático en 8387
```

- Los datos del sistema nuevo (`ispmax_pgdata`, `ispmax_data`) quedan intactos para volver a probar. No use `docker compose down -v` salvo que quiera borrarlos.
- Los dos usan el mismo nombre de contenedor (`ispmax-manual`): hay que bajar uno antes de subir el otro.
- Portainer: el stack `ispmax-manual` original queda sin contenedor tras la instalación. Para volver, puede redeplegarlo desde Portainer o usar el comando anterior; no lo borre hasta confirmar que no lo necesita.
- Si el nuevo falla al arrancar, el instalador ya eliminó el contenedor antiguo: use la vuelta atrás de arriba (la imagen `ispmax-manual:latest` antigua se **reemplaza** al construir la nueva; el comando `--build` la regenera desde `Dockerfile.legacy`).

## 9. Problemas frecuentes

| Síntoma | Qué hacer |
|---|---|
| `healthy` no llega | `docker compose logs -f ispmax-manual`: el primer arranque es lento; si hay `ERROR`, el mensaje indica el paso (dependencias, panel, esquema). |
| `EACCES`/«no es escribible» | `PUID`/`PGID` de `.env` no coinciden con el propietario del repositorio: `stat -c '%u %g' .` y corrija, luego `docker compose up -d`. |
| `POSTGRES_PASSWORD` vacío | Compose se niega a arrancar: falta `.env`; ejecute el instalador. |
| Cambié la contraseña de la base en `.env` y no entra | PostgreSQL solo usa `POSTGRES_PASSWORD` al crear el volumen. Cambie la clave dentro de la base (`ALTER USER`) o recree el volumen (borra datos). |
| «Actualizar el sistema» no puede hacer pull | Falta credencial para repositorio privado (sección 5) o el árbol tiene cambios locales. |
| `/` responde 503 «El manual se está preparando» | No hay páginas publicadas en la base: cargue un paquete `.ispmax` (sección 4). |
| `/` responde 503 «El manual no está disponible en este momento» | Falta el tema compilado (modo dinámico). En el registro: `Falta el tema compilado del manual`. Ver las líneas `[tema]` del arranque; a mano: `docker compose exec -u "$(id -u):$(id -g)" ispmax-manual sh -c 'cd portal && npm run site:build'` y `docker compose restart ispmax-manual`. |
| Volver temporalmente al manual estático | `PORTAL_RENDER_MODE=static` en el entorno del contenedor y `docker compose up -d` (reconstruye en cada publicación como antes). |

## 10. Qué NO se pudo probar sin Docker

Todo este despliegue se escribió en un equipo Windows **sin Docker**. Se verificó: sintaxis de ambos `.sh` (`bash -n`), validez del YAML de Compose (librería `yaml`), que todas las variables `${VAR}` del compose están en `.env.docker.example`, coherencia de nombres/volúmenes/puertos/healthchecks, y el flujo de `install-docker.sh` contra un `docker` simulado (incluida la ausencia de la contraseña en argumentos y registros). **No se probó:**

- La construcción real de la imagen (en particular que `postgresql17-client` exista en la versión de Alpine de `node:22-alpine`).
- El `entrypoint.sh` real: cambio de propietario y bajada a `PUID:PGID` con `su-exec`, `npm ci` sobre volúmenes en `node_modules` (npm puede fallar al borrar el punto de montaje; el script vacía el contenido y reintenta, pero «Actualizar el sistema» del panel ejecuta su propio `npm ci` sin ese rodeo), compilación del panel y `migrate.mjs` dentro del contenedor.
- Permisos del bind mount `./:/app` (dueño de los archivos que cree Git/npm) y los directorios vacíos `node_modules` que Docker crea en el host como puntos de montaje (están en `.gitignore`).
- `git` dentro del contenedor (`safe.directory`, clave SSH, token), y el reinicio por `exit` con `restart: unless-stopped`.
- El comportamiento de `docker compose exec -e VAR` sin valor en su versión de Compose (el instalador envía además la contraseña por stdin como respaldo).
- Que el servidor responda en `/`, `/admin/`, `/api`, `/healthz` con las variables `PORTAL_*` (depende de `portal/server`, que se implementa aparte) y trate como «sin definir» las variables vacías (`PORTAL_ADMIN_ALLOWED_IPS=`, `PORTAL_COOKIE_SECURE=`, `PORTAL_ALLOWED_ORIGINS=`).
- La sustitución real del contenedor antiguo y el comportamiento de Portainer con el stack existente.
- **Manual dinámico (2026-11-26):** el paso `npm run site:build` del `entrypoint.sh` dentro del contenedor (Vite con `NODE_ENV=production` y `npm ci --include=dev`), el proceso de compilación con `--permission` en Node 22/Alpine (en Windows con Node 24 sí se probó; si el Node no lo admite, se avisa y se usa un hilo sin entorno) y la memoria real en Linux (en Windows: ver `portal/site/SPIKE.md` y el informe de la integración).


## 11. Asistente de IA (Groq)

El editor tiene un asistente (reescribir, acortar, expandir, corregir, pasos) y «Crear página con IA». La IA propone y una persona aprueba: nada se guarda ni se publica solo, y lo creado nace como borrador.

- **Clave:** se puede poner desde el panel, en **Ajustes → Asistente de IA** (solo administradores): se guarda **cifrada en la base de datos** (AES-256-GCM, la misma clave maestra que la 2FA: `PORTAL_SECRET_KEY` o `<datos>/secret.key`), sobrevive a reinicios y a «Actualizar el sistema», y manda sobre el entorno. El `.env` sigue valiendo como alternativa: `GROQ_API_KEY` en `.env` (Docker la pasa al contenedor). Sin ninguna de las dos, el botón del editor queda deshabilitado («Configura la clave de IA en Ajustes»).
- **Si cambia o se pierde la clave maestra** (`PORTAL_SECRET_KEY`/`secret.key`), la clave guardada en Ajustes deja de poder leerse: Ajustes lo avisa y basta pegarla otra vez. El paquete `.ispmax` **no** lleva la clave; un `pg_dump` completo la lleva cifrada.
- Variables opcionales: `GROQ_MODEL` (def. `openai/gpt-oss-120b`; el modelo elegido en Ajustes manda), `PORTAL_AI_RATE` (peticiones por persona cada 10 min, def. 20). `GROQ_BASE_URL` existe solo para pruebas (servidor falso).
- Hace falta salida a internet del contenedor hacia `api.groq.com` (HTTPS). Sin ella, el asistente responde «No se pudo conectar con el servicio de IA» y el resto del portal sigue igual.
- Qué sale a un servicio externo y qué no: `portal/SECURITY.md` § 9.

- Historial del asistente: `PORTAL_AI_HISTORY_DAYS` (def. 90; 0 = sin caducidad). Las conversaciones viven en las tablas `ai_*` de la BD, no entran en el paquete `.ispmax` ni en los respaldos `pg_dump` (datos excluidos a propósito).

- Límite de tokens: `PORTAL_AI_TPM` (def. 8000, el plan gratuito de Groq). El asistente cuenta los tokens usados por minuto y espera unos segundos o avisa antes de pasarse. Las imágenes que se adjuntan al chat no salen del servidor (la IA solo recibe su texto).
