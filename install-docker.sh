#!/usr/bin/env bash
# Instalador del sistema ISPMAX (manual + portal) con Docker Compose, en el puerto 8387 (configurable).
# Uso: ./install-docker.sh --help
# Idempotente: puede ejecutarse varias veces. No imprime ni registra contraseñas; el registro va a install-docker.log.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$ROOT/install-docker.log"
CONTAINER="ispmax-manual"
ENV_FILE="$ROOT/.env"
IMPORT_DIR="/var/lib/ispmax/import"
POLL_INTERVAL="${ISPMAX_POLL_INTERVAL:-5}"

if [ -t 1 ]; then C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[1m'; C_0=$'\033[0m'; else C_R=''; C_G=''; C_Y=''; C_B=''; C_0=''; fi

ADMIN_USER="${ISPMAX_ADMIN_USER:-}"
ADMIN_PASS="${ISPMAX_ADMIN_PASSWORD:-}"
PUBLIC_PORT="${ISPMAX_PUBLIC_PORT:-}"
ADMIN_IPS="${ISPMAX_ADMIN_IPS:-}"
PUBLIC_URL="${ISPMAX_PUBLIC_URL:-}"; PUBLIC_URL_ARG=""; DEFAULT_PUBLIC_URL="https://doc.ispmax.ec"
ADMIN_PATH="${ISPMAX_ADMIN_PATH:-}"; ADMIN_PATH_NEW=0
CONTENT=""; ASSUME_YES=0; NO_BUILD=0; OVERWRITE_ENV=0; WAIT_TIMEOUT=1500
unset ISPMAX_ADMIN_PASSWORD   # la contraseña solo viaja por entorno a la orden que la necesita

usage() {
  cat <<'EOF'
Instalador de ISPMAX (manual + portal) con Docker Compose.

Uso:  ./install-docker.sh [opciones]

  --admin-user U       Usuario administrador inicial (def. admin)
                       Contraseña: variable ISPMAX_ADMIN_PASSWORD (NUNCA por argumento) o se pide de forma oculta.
  --public-port N      Puerto público del servidor (def. 8387; el proxy inverso apunta a IP:N)
  --public-url URL     Dirección pública del manual para SEO (canonical, sitemap, robots), sin barra final
                       (def. https://doc.ispmax.ec; "none" la deja sin definir). Se guarda como PORTAL_PUBLIC_URL en .env
  --admin-path /RUTA   Ruta secreta del panel (un segmento: minúsculas, números, _ o -; de 3 a 64). Sin indicarla se
                       genera /panel-<16 hex aleatorios>, se guarda en .env (PORTAL_ADMIN_PATH) y se muestra UNA vez al
                       final. /admin y /api directos responden como cualquier página inexistente. Capa EXTRA: no
                       sustituye a la contraseña fuerte, la verificación en dos pasos ni la lista de IPs.
  --admin-ips LISTA    Restringe el panel y la API a estas IP/CIDR separadas por comas (def. sin restricción)
  --content ARCHIVO    Paquete .ispmax que se importa al final (también puede subirse desde el panel -> Inicio)
  --overwrite-env      Regenera .env (se guarda copia .env.bak). Sin esta opción, un .env existente se conserva.
  --no-build           No reconstruye la imagen (usa ispmax-manual:latest existente)
  --wait-timeout SEG   Espera máxima a que el contenedor esté sano (def. 1500; el primer arranque instala dependencias)
  --yes, -y            No pregunta nada (modo no interactivo; sustituye al contenedor antiguo sin pedir confirmación)
  -h, --help           Esta ayuda

Qué hace: comprueba Docker, sustituye el contenedor antiguo "ispmax-manual" (sin borrar volúmenes ni imágenes),
escribe .env (permisos 600, contraseña de base aleatoria), levanta db + ispmax-manual, espera a que esté "healthy",
crea el administrador y, si se pide, importa el paquete de contenido.

Ejemplo no interactivo:
  ISPMAX_ADMIN_PASSWORD='clave-larga-del-admin' ./install-docker.sh --yes --admin-user soporte --content /ruta/paquete.ispmax
EOF
}

# ---- Utilidades -----------------------------------------------------------------
log()  { printf '%s %s\n' "$(date '+%F %T')" "$*" >> "$LOG_FILE"; }
say()  { printf '%s\n' "$*"; log "$*"; }
step() { printf '\n%s\n' "${C_B}== $* ==${C_0}"; log "== $* =="; }
ok()   { printf '%s\n' "${C_G}OK${C_0}  $*"; log "OK  $*"; }
warn() { printf '%s\n' "${C_Y}Aviso:${C_0} $*" >&2; log "AVISO $*"; }
die()  { printf '%s\n' "${C_R}Error:${C_0} $*" >&2; log "ERROR $*"; exit 1; }
cleanup() { local rc=$?; stty echo 2>/dev/null || true
  if [ $rc -ne 0 ] && [ $rc -ne 130 ]; then printf '%s\n' "${C_R}La instalación se interrumpió (código $rc). Revise $LOG_FILE; es seguro volver a ejecutar el script.${C_0}" >&2; fi; }
trap cleanup EXIT
trap 'exit 130' INT TERM

INTERACTIVE=1
confirm() { [ "$INTERACTIVE" = 1 ] || return 1; local a; read -r -p "$1 [s/N]: " a || true; [[ "$a" =~ ^[sSyY] ]]; }

need_val() { [ $# -ge 2 ] && [ -n "$2" ] || die "Falta el valor de $1"; }
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0;;
    --admin-user) need_val "$@"; ADMIN_USER="$2"; shift 2;; --admin-user=*) ADMIN_USER="${1#*=}"; shift;;
    --public-port) need_val "$@"; PUBLIC_PORT="$2"; shift 2;; --public-port=*) PUBLIC_PORT="${1#*=}"; shift;;
    --public-url) need_val "$@"; PUBLIC_URL="$2"; shift 2;; --public-url=*) PUBLIC_URL="${1#*=}"; shift;;
    --admin-ips) need_val "$@"; ADMIN_IPS="$2"; shift 2;; --admin-ips=*) ADMIN_IPS="${1#*=}"; shift;;
    --admin-path) need_val "$@"; ADMIN_PATH="$2"; shift 2;; --admin-path=*) ADMIN_PATH="${1#*=}"; shift;;
    --content) need_val "$@"; CONTENT="$2"; shift 2;; --content=*) CONTENT="${1#*=}"; shift;;
    --wait-timeout) need_val "$@"; WAIT_TIMEOUT="$2"; shift 2;;
    --overwrite-env) OVERWRITE_ENV=1; shift;; --no-build) NO_BUILD=1; shift;;
    --yes|-y) ASSUME_YES=1; shift;;
    --admin-password|--password|--pass) die "La contraseña nunca se pasa por argumento: use la variable ISPMAX_ADMIN_PASSWORD o déjela para el prompt oculto.";;
    *) die "Opción desconocida: $1 (use --help)";;
  esac
done
[ "$ASSUME_YES" = 1 ] && INTERACTIVE=0
[ -t 0 ] || INTERACTIVE=0
[[ "$WAIT_TIMEOUT" =~ ^[0-9]+$ ]] || die "--wait-timeout debe ser un número de segundos."

touch "$LOG_FILE" 2>/dev/null || die "No se puede escribir $LOG_FILE"
chmod 600 "$LOG_FILE" 2>/dev/null || true
log "=== Instalación iniciada (interactivo=$INTERACTIVE) en $ROOT ==="
cd "$ROOT"

case "$CONTENT" in "") ;; /*|[A-Za-z]:*) ;; *) CONTENT="$(pwd)/$CONTENT";; esac
if [ -n "$CONTENT" ]; then
  [ -f "$CONTENT" ] || die "No existe el paquete: $CONTENT"
  case "$CONTENT" in *.ispmax) ;; *) warn "El archivo no termina en .ispmax; se intentará importar de todos modos.";; esac
fi

dc() { docker compose "$@"; }
run() { local desc="$1"; shift; log "RUN $desc"; printf '%s ... ' "$desc"
  if "$@" >> "$LOG_FILE" 2>&1; then printf '%s\n' "${C_G}listo${C_0}"
  else printf '%s\n' "${C_R}falló${C_0}"; tail -n 25 "$LOG_FILE" >&2; die "Falló: $desc"; fi; }

# ---- Requisitos -----------------------------------------------------------------
check_requirements() {
  step "Requisitos"
  command -v docker >/dev/null 2>&1 || die "No se encontró 'docker'. Instálelo: https://docs.docker.com/engine/install/"
  docker compose version >/dev/null 2>&1 || die "Falta Docker Compose v2 ('docker compose'). Instale el plugin docker-compose-plugin."
  docker info >/dev/null 2>&1 || die "No se puede hablar con Docker. ¿Está el servicio activo y su usuario en el grupo 'docker'? (pruebe con sudo o: sudo usermod -aG docker \$USER y vuelva a entrar)"
  ok "Docker $(docker version -f '{{.Server.Version}}' 2>/dev/null || echo '?') · $(docker compose version --short 2>/dev/null || echo compose)"
  local f; for f in docker-compose.yml Dockerfile docker/entrypoint.sh portal/package.json; do [ -f "$ROOT/$f" ] || die "Falta $f: ejecute el script desde la raíz del repositorio actualizado."; done
  [ -d "$ROOT/.git" ] || warn "Esto no es una copia de Git (.git): el botón «Actualizar el sistema» del panel no funcionará."
  ok "Archivos del repositorio presentes"
}

# ---- Datos ----------------------------------------------------------------------
USER_RE='^[a-z0-9._-]{3,32}$'
OBVIOUS=" 12345 123456 12345678 123456789 1234567890 0123456789 admin admin123 admin1234 admin12345 administrador administrator password password1 password123 password1234 passw0rd p@ssw0rd contrasena contraseña clave clave123 clave1234 secreto qwerty qwerty123 qwertyuiop asdfghjkl letmein letmein123 welcome bienvenido changeme cambiame cambia-esto cambiaesto ispmax ispmax123 ispmax1234 ispmax2026 abc1234567 admin123456 agente-prueba una-clave-larga-de-10-o-mas-caracteres clave-larga-del-admin "
password_error() { # filtro previo; la política completa (portal/server/passwordPolicy.mjs) la aplica admin-cli en el contenedor
  local p="$1" u="$2" lp="${1,,}" lu="${2,,}"
  [ "${#p}" -ge 10 ] || { echo "La contraseña debe tener al menos 10 caracteres."; return; }
  [ "${#p}" -le 128 ] || { echo "La contraseña es demasiado larga (máximo 128)."; return; }
  [ "$lp" != "$lu" ] || { echo "La contraseña no puede ser igual al usuario."; return; }
  local rest="${lp//"$lu"/}"; rest="${rest//[^a-z0-9]/}"
  if [ "${#lu}" -ge 3 ] && [ "$rest" != "${lp//[^a-z0-9]/}" ] && { [ "${#rest}" -lt 6 ] || [[ "$rest" =~ ^[0-9]*$ ]]; }; then echo "La contraseña no puede ser una variación del usuario."; return; fi
  case "$OBVIOUS" in *" $lp "*) echo "La contraseña es demasiado común. Elija otra."; return;; esac
  [ -n "${p//"${p:0:1}"/}" ] || { echo "La contraseña es demasiado obvia. Elija otra."; return; }
}
ADMIN_PATH_RE='^/[a-z0-9][a-z0-9_-]{2,63}$'
admin_path_error() { # mismas reglas que portal/server/http/adminPath.mjs (el servidor las vuelve a comprobar)
  local p="$1"
  [[ "$p" =~ $ADMIN_PATH_RE ]] || { echo "--admin-path no válida: un solo segmento como /panel-1a2b3c4d5e6f7a8b (minúsculas, números, _ o -; 3 a 64)."; return; }
  case "${p#/}" in api|assets|static|healthz|robots.txt|sitemap.xml|manual|tareas|guia|problemas|preguntas|referencia|conceptos) echo "--admin-path usa un nombre reservado. Elija otro."; return;; esac
}
gen_hex() { if command -v openssl >/dev/null 2>&1; then openssl rand -hex "$1"; else head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; fi; }

env_get() { [ -f "$ENV_FILE" ] && grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true; }

collect() {
  step "Datos de la instalación"
  if [ -z "$ADMIN_USER" ]; then
    if [ "$INTERACTIVE" = 1 ]; then read -r -p "Usuario administrador inicial [admin]: " ADMIN_USER || true; fi
    ADMIN_USER="${ADMIN_USER:-admin}"
  fi
  [[ "$ADMIN_USER" =~ $USER_RE ]] || die "Usuario administrador no válido: 3 a 32 caracteres, minúsculas, números, punto, guion y guion bajo."
  if [ -z "$PUBLIC_PORT" ]; then PUBLIC_PORT="$(env_get PORTAL_PUBLIC_PORT)"; fi
  PUBLIC_PORT="${PUBLIC_PORT:-8387}"
  [[ "$PUBLIC_PORT" =~ ^[0-9]{1,5}$ ]] && [ "$PUBLIC_PORT" -ge 1 ] && [ "$PUBLIC_PORT" -le 65535 ] || die "Puerto público no válido: $PUBLIC_PORT"
  PUBLIC_URL_ARG="$PUBLIC_URL"
  if [ -z "$PUBLIC_URL" ]; then PUBLIC_URL="$(env_get PORTAL_PUBLIC_URL)"; fi
  if [ -z "$PUBLIC_URL" ] && [ -f "$ENV_FILE" ] && [ "$OVERWRITE_ENV" != 1 ]; then :; elif [ -z "$PUBLIC_URL" ]; then PUBLIC_URL="$DEFAULT_PUBLIC_URL"; fi
  [ "$PUBLIC_URL" != "none" ] || PUBLIC_URL=""
  [[ -z "$PUBLIC_URL" || "$PUBLIC_URL" =~ ^https?://[A-Za-z0-9._:-]+(/[A-Za-z0-9._~/-]*[A-Za-z0-9._~-])?$ ]] || die "--public-url no válida: use http(s)://dominio sin barra final (ejemplo: $DEFAULT_PUBLIC_URL)."
  [[ "$ADMIN_IPS" =~ ^[0-9a-fA-F:./,\ ]*$ ]] || die "--admin-ips solo admite IP/CIDR separadas por comas."
  if [ -z "$ADMIN_PASS" ]; then
    [ "$INTERACTIVE" = 1 ] || die "Falta la contraseña del administrador: defina ISPMAX_ADMIN_PASSWORD (no se acepta por argumento)."
    local a b
    read -r -s -p "Contraseña del administrador (mínimo 10 caracteres): " a || true; echo
    read -r -s -p "Repita la contraseña: " b || true; echo
    [ "$a" = "$b" ] || die "Las contraseñas no coinciden."
    ADMIN_PASS="$a"
  fi
  local e; e="$(password_error "$ADMIN_PASS" "$ADMIN_USER")"; [ -z "$e" ] || die "$e"
  ADMIN_PATH="${ADMIN_PATH%/}"
  if [ -n "$ADMIN_PATH" ]; then e="$(admin_path_error "$ADMIN_PATH")"; [ -z "$e" ] || die "$e"; fi
  ok "Usuario $ADMIN_USER · puerto público $PUBLIC_PORT"
}

# ---- Contenedor antiguo ---------------------------------------------------------
handle_legacy() {
  step "Contenedor existente"
  local id; id="$(docker ps -a -q --filter "name=^${CONTAINER}\$" 2>/dev/null | head -n1 || true)"
  if [ -z "$id" ]; then ok "No hay un contenedor llamado $CONTAINER"; return; fi
  local lab img st ports
  lab="$(docker inspect -f '{{index .Config.Labels "ispmax.manual.system"}}' "$CONTAINER" 2>/dev/null || true)"
  img="$(docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || echo '?')"
  st="$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo '?')"
  if [ "$lab" = "portal" ]; then ok "Ya existe el contenedor del sistema nuevo (estado: $st); Compose lo actualizará"; return; fi
  ports="$(docker port "$CONTAINER" 2>/dev/null | tr '\n' ' ' || true)"
  say "Existe el contenedor antiguo '$CONTAINER' (imagen $img, estado $st, puertos: ${ports:-ninguno})."
  say "Se SUSTITUIRÁ por el sistema nuevo para liberar el nombre y el puerto. No se borran volúmenes ni imágenes."
  say "Para volver atrás: ver portal/DEPLOY.md (archivos *.legacy). Si lo gestionaba Portainer, el stack antiguo quedará sin contenedor."
  if [ "$ASSUME_YES" != 1 ]; then confirm "¿Detener y eliminar el contenedor antiguo '$CONTAINER'?" || die "Cancelado: el contenedor antiguo sigue intacto."; fi
  run "Deteniendo $CONTAINER" docker stop "$CONTAINER"
  run "Eliminando el contenedor $CONTAINER (sin volúmenes ni imágenes)" docker rm "$CONTAINER"
}

# ---- .env -----------------------------------------------------------------------
gen_secret() { if command -v openssl >/dev/null 2>&1; then openssl rand -hex 24; else head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; fi; }
owner_of() { stat -c '%u %g' "$1" 2>/dev/null || stat -f '%u %g' "$1" 2>/dev/null || echo "$(id -u) $(id -g)"; }

write_env() {
  step "Archivo de variables (.env)"
  if [ -f "$ENV_FILE" ] && [ "$OVERWRITE_ENV" != 1 ]; then
    ok "Se conserva el .env existente (use --overwrite-env para regenerarlo)"
    [ -n "$(env_get POSTGRES_PASSWORD)" ] || die "El .env existente no define POSTGRES_PASSWORD. Complételo o use --overwrite-env."
    [ -z "$ADMIN_IPS" ] || warn "--admin-ips se ignora porque se conserva el .env: edite PORTAL_ADMIN_ALLOWED_IPS a mano."
    local ep; ep="$(env_get PORTAL_PUBLIC_PORT)"; [ -z "$ep" ] || PUBLIC_PORT="$ep"
    if [ -z "$(env_get PORTAL_PUBLIC_URL)" ]; then warn "El .env no define PORTAL_PUBLIC_URL: el sitio se genera sin canonical y el sitemap usa el host de la petición. Añada PORTAL_PUBLIC_URL=$DEFAULT_PUBLIC_URL y ejecute docker compose up -d."
    elif [ -n "${PUBLIC_URL_ARG:-}" ] && [ "$PUBLIC_URL_ARG" != "$(env_get PORTAL_PUBLIC_URL)" ]; then warn "--public-url se ignora porque se conserva el .env: edite PORTAL_PUBLIC_URL a mano."; fi
    # Ruta oculta del panel: si el .env conservado no la tiene, se añade (no depende de ningún dato guardado).
    local ep2; ep2="$(env_get PORTAL_ADMIN_PATH)"
    if [ -z "$ep2" ]; then
      [ -n "$ADMIN_PATH" ] || ADMIN_PATH="/panel-$(gen_hex 8)"
      printf '\n# Ruta secreta del panel (añadida por install-docker.sh el %s)\nPORTAL_ADMIN_PATH=%s\n' "$(date '+%F %T')" "$ADMIN_PATH" >> "$ENV_FILE"
      ADMIN_PATH_NEW=1; ok "Añadida PORTAL_ADMIN_PATH al .env (ruta del panel; se muestra al final)"
    else
      [ -z "$ADMIN_PATH" ] || [ "$ADMIN_PATH" = "$ep2" ] || warn "--admin-path se ignora porque se conserva el .env: edite PORTAL_ADMIN_PATH a mano."
      ADMIN_PATH="$ep2"
    fi
    [ -n "$(env_get PORTAL_SECRET_KEY)" ] || say "El .env no define PORTAL_SECRET_KEY: la clave de cifrado de la verificación en dos pasos se genera en el volumen de datos (secret.key). No la añada después sin leer portal/SECURITY.md."
    return
  fi
  [ -n "$ADMIN_PATH" ] || { ADMIN_PATH="/panel-$(gen_hex 8)"; }
  ADMIN_PATH_NEW=1
  if [ -f "$ENV_FILE" ]; then cp -p "$ENV_FILE" "$ENV_FILE.bak"; chmod 600 "$ENV_FILE.bak" 2>/dev/null || true; ok "Copia previa en .env.bak"; fi
  local uid gid tz dbpass; read -r uid gid <<<"$(owner_of "$ROOT")"
  [ "$uid" != 0 ] || warn "El repositorio pertenece a root (UID 0): la aplicación correrá como root. Lo recomendable es un usuario normal propietario del repositorio."
  tz="$(cat /etc/timezone 2>/dev/null || true)"; tz="${tz:-UTC}"
  dbpass="$(gen_secret)"
  ( umask 077
    {
      echo "# Generado por install-docker.sh el $(date '+%F %T'). No subir a Git. Sin contraseña del administrador."
      echo "POSTGRES_PASSWORD=$dbpass"
      echo "POSTGRES_USER=ispmax"
      echo "POSTGRES_DB=ispmax_manual"
      echo "PORTAL_PUBLIC_PORT=$PUBLIC_PORT"
      echo "PUID=$uid"
      echo "PGID=$gid"
      echo "TZ=$tz"
      echo "PORTAL_TRUST_PROXY=true"
      echo "PORTAL_ADMIN_ENABLED=true"
      echo "PORTAL_ADMIN_ALLOWED_IPS=$ADMIN_IPS"
      echo "PORTAL_COOKIE_SECURE="
      echo "PORTAL_ALLOWED_ORIGINS="
      echo "PORTAL_PUBLIC_URL=$PUBLIC_URL"
      echo "PORTAL_ADMIN_PATH=$ADMIN_PATH"
      echo "PORTAL_PROBE_THRESHOLD=20"
      echo "PORTAL_SECRET_KEY=$(gen_hex 32)"
      echo "PORTAL_SESSION_IDLE_H=12"
      echo "PORTAL_SESSION_MAX_DAYS=7"
      echo "GIT_DEPLOY_KEY_FILE="
    } > "$ENV_FILE" )
  chmod 600 "$ENV_FILE"
  ok "Escrito .env (permisos 600; PUID=$uid PGID=$gid; contraseña de la base y clave de cifrado generadas, no se muestran)"
}

# ---- Levantar -------------------------------------------------------------------
bring_up() {
  step "Contenedores"
  run "Validando docker-compose.yml" dc config -q
  if [ "$NO_BUILD" = 1 ]; then
    run "Levantando servicios (sin reconstruir la imagen)" dc up -d
  else
    say "Construyendo la imagen y levantando servicios (la primera vez puede tardar unos minutos)..."
    run "docker compose up -d --build" dc up -d --build
  fi
}

wait_healthy() {
  step "Esperando a que el sistema esté listo"
  say "El primer arranque instala dependencias y compila el panel: puede tardar varios minutos."
  local deadline=$((SECONDS + WAIT_TIMEOUT)) last="" line st health run
  while :; do
    st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo 'missing|missing')"
    health="${st%%|*}"; run="${st##*|}"
    line="$(docker logs --tail 1 "$CONTAINER" 2>&1 | tail -n1 | cut -c1-160 || true)"
    if [ -n "$line" ] && [ "$line" != "$last" ]; then printf '  %s\n' "$line"; last="$line"; fi
    case "$health" in healthy) ok "El contenedor está healthy"; return 0;; esac
    case "$run" in
      exited|dead|missing) docker logs --tail 40 "$CONTAINER" >> "$LOG_FILE" 2>&1 || true
        docker logs --tail 30 "$CONTAINER" >&2 || true
        die "El contenedor se detuvo (estado: $run). Revise la salida anterior o: docker compose logs ispmax-manual";;
    esac
    if [ "$SECONDS" -ge "$deadline" ]; then
      docker logs --tail 40 "$CONTAINER" >> "$LOG_FILE" 2>&1 || true
      die "Pasaron $WAIT_TIMEOUT s sin llegar a healthy (estado: $health/$run). Siga con: docker compose logs -f ispmax-manual y vuelva a ejecutar este script."
    fi
    sleep "$POLL_INTERVAL"
  done
}

# ---- Administrador y contenido --------------------------------------------------
create_admin() {
  step "Administrador"
  local uid gid out rc=0; uid="$(env_get PUID)"; gid="$(env_get PGID)"; uid="${uid:-1000}"; gid="${gid:-1000}"
  # La contraseña viaja solo por entorno (y por stdin como respaldo); nunca en argumentos.
  out="$(printf '%s\n' "$ADMIN_PASS" | ISPMAX_ADMIN_PASSWORD="$ADMIN_PASS" docker compose exec -T -u "$uid:$gid" -e ISPMAX_ADMIN_PASSWORD \
        "$CONTAINER" node portal/server/admin-cli.mjs create --user "$ADMIN_USER" 2>&1)" || rc=$?
  log "admin-cli: $out"
  [ $rc -eq 0 ] || die "No se pudo crear el administrador: $out"
  ok "$(printf '%s' "$out" | head -n1)"
}

import_content() {
  step "Contenido"
  if [ -z "$CONTENT" ]; then say "Sin --content: suba el paquete .ispmax desde el panel -> Inicio cuando quiera."; return; fi
  local uid gid base dest; uid="$(env_get PUID)"; gid="$(env_get PGID)"; uid="${uid:-1000}"; gid="${gid:-1000}"
  base="$(basename "$CONTENT" | tr -c 'A-Za-z0-9._\n-' '_')"; dest="$IMPORT_DIR/$base"
  run "Copiando $(basename "$CONTENT") al volumen de datos" dc cp "$CONTENT" "$CONTAINER:$dest"
  run "Ajustando propietario del paquete" dc exec -T -u 0 "$CONTAINER" chown "$uid:$gid" "$dest"
  run "Importando el paquete (reemplaza el contenido actual; se guarda antes un paquete de seguridad)" \
    dc exec -T -u "$uid:$gid" "$CONTAINER" node portal/server/content/cli.mjs import "$dest" --yes
  dc exec -T -u "$uid:$gid" "$CONTAINER" rm -f "$dest" >> "$LOG_FILE" 2>&1 || true
  say "Si el sitio no refleja el contenido enseguida, use el panel -> Ajustes -> Sistema -> «Reconstruir ahora»."
}

summary() {
  local ip; ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"; ip="${ip:-IP-DEL-SERVIDOR}"
  step "Instalación terminada"
  local panel="${ADMIN_PATH:-/admin}"
  if [ "$ADMIN_PATH_NEW" = 1 ] && [ "$panel" != "/admin" ]; then
    printf '%s\n' "${C_B}Ruta del panel (anótela en un lugar seguro: no se volverá a mostrar; está en .env como PORTAL_ADMIN_PATH):${C_0}"
    printf '  %s/\n' "$panel"
  fi
  cat <<EOF
Manual:           http://$ip:$PUBLIC_PORT/
Panel:            http://$ip:$PUBLIC_PORT<ruta del panel>/   (/admin y /api directos responden como una página inexistente)
Administrador:    $ADMIN_USER  (la contraseña es la que indicó; no se guardó en ningún archivo)
Variables:        $ENV_FILE (permisos 600)      Registro: $LOG_FILE
Cargar contenido: panel -> Inicio (subir un .ispmax)  o  ./install-docker.sh --content paquete.ispmax
Ver logs:         docker compose logs -f ispmax-manual
Actualizar:       iniciar sesión en el panel -> Ajustes -> Sistema -> Actualizar el sistema (git pull + dependencias + reinicio)
Cambiar clave:    docker compose exec -u \$(id -u):\$(id -g) -e ISPMAX_ADMIN_PASSWORD ispmax-manual node portal/server/admin-cli.mjs reset --user $ADMIN_USER   (añada --2fa-off si perdió la verificación en dos pasos)
Volver al antiguo: docker compose down && docker compose -f docker-compose.legacy.yml up -d --build   (datos intactos; ver portal/DEPLOY.md)
El proxy inverso que ya apuntaba a IP:$PUBLIC_PORT no necesita cambios (debe reenviar Host y X-Forwarded-*).
EOF
  log "Instalación terminada correctamente"
}

check_requirements
collect
handle_legacy
write_env
bring_up
wait_healthy
create_admin
import_content
summary
