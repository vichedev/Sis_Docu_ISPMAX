#!/bin/bash
# Arranque del contenedor ispmax-manual. Idempotente. No crea administradores ni lee contraseñas.
# Fase 1 (root): prepara carpetas y permisos y baja a PUID:PGID.
# Fase 2 (usuario): dependencias, panel, esquema y servidor.
set -euo pipefail

APP=/app
STATE=/var/lib/ispmax/state
PUID="${PUID:-1000}"; PGID="${PGID:-1000}"
ts() { date '+%F %T'; }
log() { printf '[entrypoint %s] %s\n' "$(ts)" "$*"; }
die() { printf '[entrypoint %s] ERROR: %s\n' "$(ts)" "$*" >&2; exit 1; }

# ── Fase 1: root ─────────────────────────────────────────────
if [ "$(id -u)" = "0" ] && [ -z "${ISPMAX_DROPPED:-}" ]; then
  [[ "$PUID" =~ ^[0-9]+$ && "$PGID" =~ ^[0-9]+$ ]] || die "PUID/PGID deben ser números (recibido PUID='$PUID' PGID='$PGID')."
  [ -d "$APP/portal" ] || die "No hay código en $APP/portal. El repositorio debe montarse como volumen en $APP (ver docker-compose.yml)."
  mkdir -p "$STATE" /var/lib/ispmax/work /var/lib/ispmax/data /var/lib/ispmax/import /tmp/home
  for d in /var/lib/ispmax /var/lib/ispmax/state /var/lib/ispmax/work /var/lib/ispmax/data /var/lib/ispmax/import /tmp/home \
           "$APP/node_modules" "$APP/portal/node_modules" "$APP/portal/web/node_modules"; do
    [ -d "$d" ] || continue
    if [ "$(stat -c %u:%g "$d")" != "$PUID:$PGID" ]; then
      log "Ajustando propietario de $d a $PUID:$PGID"
      # Carpetas de datos: completas. Puntos de montaje de node_modules (se rellenan solos): solo la raíz.
      case "$d" in */node_modules) chown "$PUID:$PGID" "$d";; *) chown -R "$PUID:$PGID" "$d";; esac
    fi
  done
  if [ "$PUID" != "0" ] && [ "$(stat -c %u "$APP")" != "$PUID" ]; then
    log "AVISO: $APP pertenece al UID $(stat -c %u "$APP"), no a PUID=$PUID. Git y npm podrían no poder escribir. Defina PUID/PGID en .env con el propietario del repositorio."
  fi
  # Clave de despliegue SSH opcional (montada de solo lectura): se copia con permisos válidos para ssh.
  if [ -s /run/keys/deploy_key ]; then
    mkdir -p /tmp/home/.ssh
    cp /run/keys/deploy_key /tmp/home/.ssh/id_deploy
    chmod 700 /tmp/home/.ssh; chmod 600 /tmp/home/.ssh/id_deploy
    chown -R "$PUID:$PGID" /tmp/home/.ssh
    log "Clave de despliegue SSH instalada para git."
  fi
  export ISPMAX_DROPPED=1 HOME=/tmp/home
  if [ "$PUID" = "0" ]; then
    log "AVISO: se ejecuta como root (PUID=0); los archivos que Git actualice quedarán de root."
    exec bash "$0" "$@"
  fi
  exec su-exec "$PUID:$PGID" bash "$0" "$@"
fi

# ── Fase 2: usuario normal ───────────────────────────────────
cd "$APP"
export HOME="${HOME:-/tmp/home}"
if [ -s "$HOME/.ssh/id_deploy" ]; then
  export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/id_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$HOME/.ssh/known_hosts"
fi

log "ISPMAX Manual + Portal · node $(node -v) · usuario $(id -u):$(id -g)"
[ -n "${DATABASE_URL:-}" ] || die "Falta DATABASE_URL. Defínala en el entorno del contenedor (docker-compose.yml la arma con POSTGRES_PASSWORD del archivo .env)."
[ -w "$APP" ] || die "$APP no es escribible por $(id -u):$(id -g). Ajuste PUID/PGID en .env al propietario del repositorio."
{ [ -f "$APP/package.json" ] && [ -f "$APP/portal/package.json" ]; } || die "Faltan package.json en $APP o en $APP/portal: ¿el volumen apunta al repositorio correcto?"
mkdir -p "$STATE"

[ -d "$APP/.git" ] || log "AVISO: $APP no es un repositorio Git; «Actualizar el sistema» no funcionará."

# Espera a la base de datos (máx. ~2 min)
log "Esperando a la base de datos..."
ok=0
for _ in $(seq 1 60); do
  if pg_isready -q -d "$DATABASE_URL" -t 3; then ok=1; break; fi
  sleep 2
done
[ "$ok" = 1 ] || die "La base de datos no respondió en 2 minutos. Revise: docker compose logs db"
log "Base de datos lista."

sha() { if [ -f "$1" ]; then sha256sum "$1" | cut -d' ' -f1; else echo none; fi; }

run_prefixed() { # run_prefixed <dir> <prefijo> <orden...>  (conserva el código de salida de la orden)
  local dir="$1" pre="$2"; shift 2
  ( cd "$dir" && "$@" 2>&1 | sed "s/^/  [$pre] /"; exit "${PIPESTATUS[0]}" )
}

# npm ci solo si cambió el package-lock.json o faltan los módulos (marcador con hash en el volumen)
ensure_deps() { # ensure_deps <dir> <nombre>
  local dir="$1" name="$2" mark="$STATE/deps-$2.sha" cur
  # `-dev`: se instalan también las dependencias de desarrollo (vite, typescript, tailwind… compilan el panel). Cambiar este
  # sufijo invalida las marcas de instalaciones anteriores hechas solo con las de producción.
  cur="$(sha "$dir/package-lock.json")-$(sha "$dir/package.json")-$(node -v)-dev"
  if [ -f "$mark" ] && [ "$(cat "$mark")" = "$cur" ] && [ -d "$dir/node_modules/.bin" ]; then
    log "Dependencias de $name al día (sin cambios en package-lock.json)."; return
  fi
  log "Instalando dependencias de $name (npm ci)... puede tardar varios minutos."
  rm -f "$mark"
  if ! run_prefixed "$dir" "npm $name" npm ci --include=dev --no-audit --no-fund; then
    # Un volumen montado en node_modules no se puede borrar entero: se vacía su contenido y se reintenta una vez.
    log "npm ci falló en $name; se vacía node_modules y se reintenta una vez."
    find "$dir/node_modules" -mindepth 1 -delete 2>/dev/null || true
    run_prefixed "$dir" "npm $name" npm ci --include=dev --no-audit --no-fund || die "npm ci falló en $name. Revise la salida anterior."
  fi
  echo "$cur" > "$mark"
  log "Dependencias de $name instaladas."
}
ensure_deps "$APP" raiz
ensure_deps "$APP/portal" portal
ensure_deps "$APP/portal/web" panel

# Compilar el panel si cambió el commit o el lock, o no existe dist
head_id="nogit"
if [ -d .git ]; then head_id="$(git rev-parse HEAD 2>/dev/null || echo nogit)"; fi
web_cur="$head_id-$(sha portal/web/package-lock.json)"
web_mark="$STATE/web-build.sha"
if [ -f portal/web/dist/index.html ] && [ -f "$web_mark" ] && [ "$(cat "$web_mark")" = "$web_cur" ]; then
  log "Panel ya compilado para este commit."
else
  log "Compilando el panel (portal/web)..."
  rm -f "$web_mark"
  if run_prefixed portal/web panel npm run build; then
    echo "$web_cur" > "$web_mark"
    log "Panel compilado."
  elif [ -f portal/web/dist/index.html ]; then
    log "AVISO: la compilación del panel falló; se conserva la versión anterior. Revise las líneas [panel] de arriba."
  else
    log "Para ver el error completo: docker compose logs ispmax-manual | grep -B40 'panel falló'"
    die "La compilación del panel falló y no hay una versión anterior. Revise la salida anterior."
  fi
fi

# Tema del manual dinámico (portal/site/dist: cliente + SSR, con Vite). El CONTENIDO nunca se compila aquí: se dibuja
# al pedirlo desde la base. Solo si cambió el commit o algún package-lock.json, o no existe el tema compilado.
if [ "${PORTAL_RENDER_MODE:-dynamic}" != "static" ]; then
  site_cur="$head_id-$(sha package-lock.json)-$(sha portal/package-lock.json)"
  site_mark="$STATE/site-build.sha"
  if [ -f portal/site/dist/server/entry-server.js ] && [ -f portal/site/dist/client/.vite/manifest.json ] && [ -f "$site_mark" ] && [ "$(cat "$site_mark")" = "$site_cur" ]; then
    log "Tema del manual ya compilado para este commit."
  else
    log "Compilando el tema del manual (portal/site, npm run site:build)..."
    rm -f "$site_mark"
    if run_prefixed portal tema npm run site:build; then
      echo "$site_cur" > "$site_mark"
      log "Tema del manual compilado."
    elif [ -f portal/site/dist/server/entry-server.js ]; then
      log "AVISO: la compilación del tema falló; se conserva la versión anterior. Revise las líneas [tema] de arriba."
    else
      # No se detiene el arranque: el panel y la API siguen disponibles y el manual muestra un aviso (503) hasta compilarlo.
      log "ERROR: la compilación del tema falló y no hay una versión anterior: el manual público mostrará un aviso. Revise las líneas [tema] de arriba."
    fi
  fi
fi

log "Aplicando el esquema de la base de datos..."
node portal/server/migrate.mjs || die "La migración del esquema falló."

log "Arrancando el portal en ${PORTAL_HOST:-0.0.0.0}:${PORTAL_PORT:-8387} (manual en /; el panel y su API, bajo la ruta de PORTAL_ADMIN_PATH)."
exec "$@"
