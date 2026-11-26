#!/usr/bin/env bash
# Instalador del Portal del manual ISPMAX (Linux Debian/Ubuntu; también WSL y Git Bash).
# Uso: ./install.sh --help
# Idempotente: puede ejecutarse varias veces. No guarda ni imprime contraseñas; el registro va a portal/install.log.
set -euo pipefail

PORTAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$PORTAL_DIR/.." && pwd)"
LOG_FILE="$PORTAL_DIR/install.log"
UNIT_NAME="ispmax-portal"
UNIT_PATH="/etc/systemd/system/${UNIT_NAME}.service"
NODE_MIN_MAJOR=22
NODE_MIN_MINOR=12

# ---- Colores solo con terminal -------------------------------------------------
if [ -t 1 ]; then C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[1m'; C_0=$'\033[0m'; else C_R=''; C_G=''; C_Y=''; C_B=''; C_0=''; fi

# ---- Opciones (valores por defecto) --------------------------------------------
DB_HOST="${ISPMAX_DB_HOST:-}"; DB_PORT="${ISPMAX_DB_PORT:-}"; DB_NAME="${ISPMAX_DB_NAME:-}"; DB_USER="${ISPMAX_DB_USER:-}"
DB_PASS="${ISPMAX_DB_PASSWORD:-}"; DB_ADMIN_USER=""; DB_ADMIN_PASS="${ISPMAX_DB_ADMIN_PASSWORD:-}"
PORT=""; HOST=""; ADMIN_USER="${ISPMAX_ADMIN_USER:-}"; ADMIN_PASS="${ISPMAX_ADMIN_PASSWORD:-}"
CONTENT=""; SERVICE=""; ASSUME_YES=0; SKIP_DEPS=0; SKIP_BUILD=0; ENV_FILE=""; INSTALL_NODE=0; OVERWRITE_ENV=0
HTTPS=0; SERVICE_USER=""; ADMIN_PATH="${ISPMAX_ADMIN_PATH:-}"; ADMIN_PATH_NEW=0
unset ISPMAX_ADMIN_PASSWORD ISPMAX_DB_PASSWORD ISPMAX_DB_ADMIN_PASSWORD  # solo se pasan por entorno a cada orden que las necesita

usage() {
  cat <<'EOF'
Instalador del Portal del manual ISPMAX.

Uso:  ./install.sh [opciones]

Base de datos (PostgreSQL):
  --db-host H          Servidor (def. 127.0.0.1)          --db-port N     Puerto (def. 5432)
  --db-name N          Base de datos (def. ispmax_manual) --db-user U     Usuario (def. postgres)
  --db-admin-user U    Usuario con permiso CREATEDB para crear la base si no existe
  Contraseñas por entorno (nunca por argumento): ISPMAX_DB_PASSWORD, ISPMAX_DB_ADMIN_PASSWORD

Servidor:
  --port N             Puerto del portal (def. 4380)
  --host H             Dirección de escucha (def. 127.0.0.1; 0.0.0.0 exige proxy HTTPS delante)
  --https              Marca la cookie de sesión como segura (úselo si el acceso es por HTTPS)
  --env-file RUTA      Archivo de variables (def. portal/.env)
  --overwrite-env      Sobrescribe el archivo de variables existente (con copia .bak)

Administrador y contenido:
  --admin-user U       Usuario administrador inicial (def. admin)
  Contraseña por entorno: ISPMAX_ADMIN_PASSWORD (o se pide de forma oculta)
  --content ARCHIVO    Paquete .ispmax que se importa al final
  --admin-path /RUTA   Ruta secreta del panel (def.: se genera /panel-<16 hex>, se guarda en el .env y se muestra una vez).
                       /admin y /api directos responden como una página inexistente. Capa EXTRA de seguridad.

Servicio y pasos:
  --service            Instala y arranca un servicio systemd (ispmax-portal)
  --no-service         No crea servicio (se arranca a mano con npm start)
  --service-user U     Usuario que ejecuta el servicio (def. propietario del repositorio)
  --skip-deps          No ejecuta npm ci       --skip-build   No compila la interfaz
  --install-node       Si falta Node.js, ofrece instalarlo (Debian/Ubuntu, NodeSource, sudo)
  --yes                No pregunta nada (modo no interactivo)
  -h, --help           Esta ayuda

Ejemplo no interactivo:
  ISPMAX_DB_PASSWORD=... ISPMAX_ADMIN_PASSWORD=... ./install.sh --yes --admin-user soporte --service
EOF
}

# ---- Utilidades ----------------------------------------------------------------
TMP_FILES=()
cleanup() { local rc=$?; stty echo 2>/dev/null || true; for f in "${TMP_FILES[@]:-}"; do [ -n "$f" ] && rm -f "$f"; done
  if [ $rc -ne 0 ]; then printf '%s\n' "${C_R}La instalación se interrumpió (código $rc). Revise $LOG_FILE y vuelva a ejecutar: es seguro repetirlo.${C_0}" >&2; fi; }
trap cleanup EXIT
trap 'exit 130' INT TERM

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >> "$LOG_FILE"; }
say() { printf '%s\n' "$*"; log "$*"; }
step() { printf '\n%s\n' "${C_B}== $* ==${C_0}"; log "== $* =="; }
ok() { printf '%s\n' "${C_G}OK${C_0}  $*"; log "OK  $*"; }
warn() { printf '%s\n' "${C_Y}Aviso:${C_0} $*" >&2; log "AVISO $*"; }
die() { printf '%s\n' "${C_R}Error:${C_0} $*" >&2; log "ERROR $*"; exit 1; }

INTERACTIVE=1
is_interactive() { [ "$INTERACTIVE" = 1 ]; }

ask() { # ask VAR "Pregunta" "defecto"
  local var="$1" q="$2" def="${3:-}" cur="${!1:-}" a
  if [ -n "$cur" ]; then return 0; fi
  if is_interactive; then read -r -p "$q${def:+ [$def]}: " a || true; printf -v "$var" '%s' "${a:-$def}"; else printf -v "$var" '%s' "$def"; fi
}
ask_secret() { # ask_secret VAR "Pregunta" confirmar(0/1)
  local var="$1" q="$2" conf="${3:-1}" a b
  if [ -n "${!var:-}" ]; then return 0; fi
  is_interactive || return 1
  read -r -s -p "$q: " a || true; echo
  if [ "$conf" = 1 ]; then read -r -s -p "Repita: " b || true; echo; [ "$a" = "$b" ] || die "Las contraseñas no coinciden."; fi
  printf -v "$var" '%s' "$a"
}
confirm() { # confirm "Pregunta" -> 0 si sí (sin interacción: no)
  is_interactive || return 1
  local a; read -r -p "$1 [s/N]: " a || true; [[ "$a" =~ ^[sSyY] ]]
}

# Ejecuta una orden registrando su salida en el log; si falla, muestra el final.
run() { local desc="$1"; shift; log "RUN $desc: $1 ..."; printf '%s ... ' "$desc"
  if "$@" >> "$LOG_FILE" 2>&1; then printf '%s\n' "${C_G}listo${C_0}"; else
    printf '%s\n' "${C_R}falló${C_0}"; tail -n 15 "$LOG_FILE" >&2; die "Falló: $desc"; fi; }

# ---- Argumentos ----------------------------------------------------------------
need_val() { [ $# -ge 2 ] && [ -n "$2" ] || die "Falta el valor de $1"; }
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0;;
    --db-host) need_val "$@"; DB_HOST="$2"; shift 2;; --db-host=*) DB_HOST="${1#*=}"; shift;;
    --db-port) need_val "$@"; DB_PORT="$2"; shift 2;; --db-port=*) DB_PORT="${1#*=}"; shift;;
    --db-name) need_val "$@"; DB_NAME="$2"; shift 2;; --db-name=*) DB_NAME="${1#*=}"; shift;;
    --db-user) need_val "$@"; DB_USER="$2"; shift 2;; --db-user=*) DB_USER="${1#*=}"; shift;;
    --db-admin-user) need_val "$@"; DB_ADMIN_USER="$2"; shift 2;; --db-admin-user=*) DB_ADMIN_USER="${1#*=}"; shift;;
    --port) need_val "$@"; PORT="$2"; shift 2;; --port=*) PORT="${1#*=}"; shift;;
    --host) need_val "$@"; HOST="$2"; shift 2;; --host=*) HOST="${1#*=}"; shift;;
    --admin-user) need_val "$@"; ADMIN_USER="$2"; shift 2;; --admin-user=*) ADMIN_USER="${1#*=}"; shift;;
    --admin-path) need_val "$@"; ADMIN_PATH="$2"; shift 2;; --admin-path=*) ADMIN_PATH="${1#*=}"; shift;;
    --content) need_val "$@"; CONTENT="$2"; shift 2;; --content=*) CONTENT="${1#*=}"; shift;;
    --env-file) need_val "$@"; ENV_FILE="$2"; shift 2;; --env-file=*) ENV_FILE="${1#*=}"; shift;;
    --service-user) need_val "$@"; SERVICE_USER="$2"; shift 2;; --service-user=*) SERVICE_USER="${1#*=}"; shift;;
    --service) SERVICE=yes; shift;; --no-service) SERVICE=no; shift;;
    --yes|-y) ASSUME_YES=1; shift;; --skip-deps) SKIP_DEPS=1; shift;; --skip-build) SKIP_BUILD=1; shift;;
    --install-node) INSTALL_NODE=1; shift;; --overwrite-env) OVERWRITE_ENV=1; shift;; --https) HTTPS=1; shift;;
    *) die "Opción desconocida: $1 (use --help)";;
  esac
done
[ "$ASSUME_YES" = 1 ] && INTERACTIVE=0
[ -t 0 ] || INTERACTIVE=0

: > /dev/null
touch "$LOG_FILE" 2>/dev/null || die "No se puede escribir $LOG_FILE"
chmod 600 "$LOG_FILE" 2>/dev/null || true
log "=== Instalación iniciada (interactivo=$INTERACTIVE) en $PORTAL_DIR ==="

case "$ENV_FILE" in "") ENV_FILE="$PORTAL_DIR/.env";; /*|[A-Za-z]:*) ;; *) ENV_FILE="$(pwd)/$ENV_FILE";; esac
mkdir -p "$(dirname "$ENV_FILE")"
case "$CONTENT" in "") ;; /*|[A-Za-z]:*) ;; *) CONTENT="$(pwd)/$CONTENT";; esac
if [ -n "$CONTENT" ]; then [ -f "$CONTENT" ] || die "No existe el paquete: $CONTENT"; fi

# ---- Requisitos ----------------------------------------------------------------
node_ok() { command -v node >/dev/null 2>&1 || return 1
  local v; v="$(node -v 2>/dev/null | sed 's/^v//')"; local ma="${v%%.*}" rest="${v#*.}"; local mi="${rest%%.*}"
  [ "${ma:-0}" -gt "$NODE_MIN_MAJOR" ] || { [ "${ma:-0}" -eq "$NODE_MIN_MAJOR" ] && [ "${mi:-0}" -ge "$NODE_MIN_MINOR" ]; }; }

install_node_debian() {
  [ -r /etc/os-release ] && . /etc/os-release || die "No se reconoce el sistema."
  case "${ID:-}${ID_LIKE:-}" in *debian*|*ubuntu*) ;; *) die "--install-node solo funciona en Debian/Ubuntu.";; esac
  command -v sudo >/dev/null 2>&1 || [ "$(id -u)" = 0 ] || die "Se necesita sudo o ser root."
  local S=""; [ "$(id -u)" = 0 ] || S="sudo"
  say "Se instalará Node.js 22 desde NodeSource (descarga https://deb.nodesource.com/setup_22.x y ejecuta apt-get)."
  if is_interactive; then confirm "¿Continuar?" || die "Instalación de Node cancelada."; fi
  local t; t="$(mktemp)"; TMP_FILES+=("$t")
  curl -fsSL https://deb.nodesource.com/setup_22.x -o "$t"
  $S bash "$t" >> "$LOG_FILE" 2>&1
  $S apt-get install -y nodejs >> "$LOG_FILE" 2>&1
}

check_requirements() {
  step "Requisitos"
  case "$(uname -s)" in Linux*|MINGW*|MSYS*|CYGWIN*) ;; *) die "Sistema no soportado: $(uname -s). Use Linux, WSL o Git Bash.";; esac
  if ! node_ok; then
    printf '%s\n' "Node.js $NODE_MIN_MAJOR.$NODE_MIN_MINOR o superior no está instalado (versión actual: $(node -v 2>/dev/null || echo ninguna))." >&2
    if [ "$INSTALL_NODE" = 1 ]; then install_node_debian; node_ok || die "Node sigue sin cumplir la versión mínima."
    else
      cat >&2 <<'EOF'
Instálelo y vuelva a ejecutar este script. En Debian/Ubuntu:
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
o ejecute de nuevo con --install-node (pide confirmación). Alternativa: https://nodejs.org o nvm.
EOF
      die "Falta Node.js $NODE_MIN_MAJOR.$NODE_MIN_MINOR+."
    fi
  fi
  ok "Node $(node -v)"
  command -v npm >/dev/null 2>&1 || die "Falta npm (viene con Node.js)."
  ok "npm $(npm -v)"
  HAVE_PSQL=0
  if command -v psql >/dev/null 2>&1; then HAVE_PSQL=1; ok "psql disponible"; else warn "No hay psql: la base se comprobará con Node (módulo pg). Para instalarlo: sudo apt-get install -y postgresql-client"; fi
  if command -v pg_dump >/dev/null 2>&1; then ok "pg_dump disponible"; else warn "No hay pg_dump: los respaldos completos de la base no funcionarán hasta instalarlo (postgresql-client)."; fi
  command -v git >/dev/null 2>&1 && ok "git disponible" || say "git no está instalado (opcional: solo la pestaña Publicar y Git lo usa)."
  command -v curl >/dev/null 2>&1 || true
}

# ---- Datos ---------------------------------------------------------------------
USER_RE='^[a-z0-9._-]{3,32}$'
validate_admin_path() { ( cd "$PORTAL_DIR" && ISPMAX_CHK_PATH="$ADMIN_PATH" node --input-type=module - <<'JS'
const m = await import('./server/http/adminPath.mjs');
try { m.parseAdminPath(process.env.ISPMAX_CHK_PATH); } catch (e) { console.error(e.message); process.exit(1); }
JS
); }
validate_password() { ( cd "$PORTAL_DIR" && ISPMAX_ADMIN_PASSWORD="$ADMIN_PASS" ISPMAX_CHK_USER="$ADMIN_USER" node --input-type=module - <<'JS'
const m = await import('./server/admin-cli.mjs');
const e = m.validatePassword(process.env.ISPMAX_ADMIN_PASSWORD, process.env.ISPMAX_CHK_USER);
if (e) { console.error(e); process.exit(1); }
JS
); }

collect() {
  step "Datos de la instalación"
  ask DB_HOST "Servidor PostgreSQL" 127.0.0.1; ask DB_PORT "Puerto PostgreSQL" 5432
  ask DB_NAME "Nombre de la base" ispmax_manual; ask DB_USER "Usuario de la base" postgres
  ask PORT "Puerto del portal" 4380; ask HOST "Dirección de escucha (127.0.0.1 solo local)" 127.0.0.1
  ask ADMIN_USER "Usuario administrador inicial" admin
  [[ "$DB_NAME" =~ ^[A-Za-z0-9_]{1,63}$ ]] || die "Nombre de base no válido (use letras, números y _)."
  [[ "$DB_USER" =~ ^[A-Za-z0-9_.@-]{1,63}$ ]] || die "Usuario de base no válido."
  [[ "$DB_HOST" =~ ^[A-Za-z0-9_.:-]+$ ]] || die "Servidor de base no válido."
  [[ "$DB_PORT" =~ ^[0-9]{1,5}$ ]] || die "Puerto de base no válido."
  [[ "$PORT" =~ ^[0-9]{1,5}$ ]] && [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || die "Puerto del portal no válido."
  [[ "$HOST" =~ ^[A-Za-z0-9_.:-]+$ ]] || die "Dirección de escucha no válida."
  [[ "$ADMIN_USER" =~ $USER_RE ]] || die "Usuario administrador no válido: 3 a 32 caracteres, minúsculas, números, punto, guion y guion bajo."
  if [ "$HOST" = 0.0.0.0 ] || [ "$HOST" = :: ]; then warn "Escucha en todas las interfaces: ponga un proxy HTTPS (Nginx/Caddy) delante y no exponga el puerto $PORT a Internet."; fi
  if [ ! -f "$ENV_FILE" ] || [ "$OVERWRITE_ENV" = 1 ] || { is_interactive && ask_overwrite_env; }; then
    WRITE_ENV=1
    if [ -z "$DB_PASS" ]; then ask_secret DB_PASS "Contraseña de la base de datos (vacía si no tiene)" 0 || true; fi
    [ -n "$DB_PASS" ] || warn "Contraseña de base vacía."
    if [ -n "$DB_ADMIN_USER" ] && [ -z "$DB_ADMIN_PASS" ]; then ask_secret DB_ADMIN_PASS "Contraseña de $DB_ADMIN_USER" 0 || true; fi
  else
    WRITE_ENV=0; say "Se conserva $ENV_FILE existente (use --overwrite-env para regenerarlo)."
  fi
  if [ -z "$ADMIN_PASS" ]; then ask_secret ADMIN_PASS "Contraseña del administrador (mínimo 10 caracteres)" 1 || die "Falta la contraseña del administrador: defina ISPMAX_ADMIN_PASSWORD."; fi
  [ -n "$ADMIN_PASS" ] || die "Falta la contraseña del administrador."
  validate_password || die "Contraseña del administrador no válida."
  if [ -n "$ADMIN_PATH" ]; then validate_admin_path || die "Ruta del panel no válida."; fi
  [ -n "$SERVICE" ] || { if is_interactive && command -v systemctl >/dev/null 2>&1 && confirm "¿Instalar y arrancar un servicio systemd?"; then SERVICE=yes; else SERVICE=no; fi; }
}
ask_overwrite_env() { confirm "Ya existe $ENV_FILE. ¿Sobrescribirlo (se guarda copia .bak)?"; }

# ---- Base de datos -------------------------------------------------------------
db_helper() { # db_helper ensure|check ; parámetros por entorno
  ( cd "$PORTAL_DIR" && PGH="$DB_HOST" PGPT="$DB_PORT" PGN="$DB_NAME" PGU="$DB_USER" PGPW="$DB_PASS" PGAU="$DB_ADMIN_USER" PGAPW="$DB_ADMIN_PASS" MODE="$1" \
    node --input-type=module - <<'JS'
import pg from 'pg';
const e = process.env;
const conn = (user, pw, db) => new pg.Client({ host: e.PGH, port: Number(e.PGPT), user, password: pw || undefined, database: db });
const fail = (m) => { console.error(m); process.exit(1); };
try {
  if (e.MODE === 'ensure') {
    const au = e.PGAU || e.PGU, ap = e.PGAU ? e.PGAPW : e.PGPW;
    const c = conn(au, ap, 'postgres');
    await c.connect();
    const r = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [e.PGN]);
    if (r.rows.length) console.log('La base ya existe.');
    else {
      await c.query(`CREATE DATABASE "${e.PGN}"` + (e.PGAU && e.PGAU !== e.PGU ? ` OWNER "${e.PGU}"` : ''));
      console.log('Base creada.');
    }
    await c.end();
  }
  const t = conn(e.PGU, e.PGPW, e.PGN);
  await t.connect();
  await t.query('SELECT 1');
  await t.end();
  console.log('Conexión correcta.');
} catch (err) {
  fail(`${err.code || 'ERROR'}: ${err.message}`);
}
JS
  ); }

ensure_database() {
  step "Base de datos"
  if [ "$WRITE_ENV" = 0 ]; then
    run "Comprobando la conexión definida en $ENV_FILE" bash -c 'cd "$1" && PORTAL_ENV_FILE="$2" node --input-type=module -e "import pg from \"pg\"; import {loadEnv} from \"./server/env.mjs\"; loadEnv(); const c=new pg.Client({connectionString:process.env.DATABASE_URL}); await c.connect(); await c.query(\"SELECT 1\"); await c.end();"' _ "$PORTAL_DIR" "$ENV_FILE"
    return
  fi
  if [ "$HAVE_PSQL" = 1 ]; then
    local au="${DB_ADMIN_USER:-$DB_USER}" ap="$DB_PASS"; [ -n "$DB_ADMIN_USER" ] && ap="$DB_ADMIN_PASS"
    local ex
    ex="$(PGPASSWORD="$ap" psql -h "$DB_HOST" -p "$DB_PORT" -U "$au" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>>"$LOG_FILE")" || die "No se pudo conectar a PostgreSQL como $au en $DB_HOST:$DB_PORT."
    if [ "$ex" = 1 ]; then ok "La base $DB_NAME ya existe"
    else
      local owner=""; [ -n "$DB_ADMIN_USER" ] && [ "$DB_ADMIN_USER" != "$DB_USER" ] && owner=" OWNER \"$DB_USER\""
      PGPASSWORD="$ap" psql -h "$DB_HOST" -p "$DB_PORT" -U "$au" -d postgres -c "CREATE DATABASE \"$DB_NAME\"$owner" >> "$LOG_FILE" 2>&1 || die "No se pudo crear la base $DB_NAME (¿falta --db-admin-user con permiso CREATEDB?)."
      ok "Base $DB_NAME creada"
    fi
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc 'SELECT 1' >/dev/null 2>>"$LOG_FILE" || die "No se pudo conectar a $DB_NAME como $DB_USER."
    ok "Conexión correcta"
  else
    [ -d "$PORTAL_DIR/node_modules/pg" ] || { [ "$SKIP_DEPS" = 0 ] && install_deps_portal_only; }
    [ -d "$PORTAL_DIR/node_modules/pg" ] || die "Sin psql se necesita portal/node_modules (módulo pg): quite --skip-deps."
    local out; out="$(db_helper ensure 2>&1)" || { log "db_helper: $out"; die "Base de datos: $out"; }
    log "db_helper: $out"; ok "$(printf '%s' "$out" | tr '\n' ' ')"
  fi
}
install_deps_portal_only() { run "Instalando dependencias del portal (para comprobar la base)" npm --prefix "$PORTAL_DIR" ci; }

# ---- .env ----------------------------------------------------------------------
write_env() {
  step "Archivo de variables"
  if [ "$WRITE_ENV" = 0 ]; then
    ok "Se conserva $ENV_FILE"
    if ! grep -qE '^PORTAL_ADMIN_PATH=.+' "$ENV_FILE" 2>/dev/null; then
      [ -n "$ADMIN_PATH" ] || ADMIN_PATH="/panel-$(node -e "process.stdout.write(require('crypto').randomBytes(8).toString('hex'))")"
      printf '
# Ruta secreta del panel (añadida por install.sh)
PORTAL_ADMIN_PATH=%s
' "$ADMIN_PATH" >> "$ENV_FILE"; ADMIN_PATH_NEW=1
      ok "Añadida PORTAL_ADMIN_PATH (ruta del panel; se muestra al final)"
    fi
    return
  fi
  [ -n "$ADMIN_PATH" ] || ADMIN_PATH="/panel-$(node -e "process.stdout.write(require('crypto').randomBytes(8).toString('hex'))")"
  ADMIN_PATH_NEW=1
  if [ -f "$ENV_FILE" ]; then cp -p "$ENV_FILE" "$ENV_FILE.bak"; chmod 600 "$ENV_FILE.bak" 2>/dev/null || true; ok "Copia previa en $ENV_FILE.bak"; fi
  local pgd=""; if command -v pg_dump >/dev/null 2>&1; then pgd="$(command -v pg_dump)"; command -v cygpath >/dev/null 2>&1 && pgd="$(cygpath -m "$pgd")"; fi
  ( cd "$PORTAL_DIR" && F="$ENV_FILE" PGH="$DB_HOST" PGPT="$DB_PORT" PGN="$DB_NAME" PGU="$DB_USER" PGPW="$DB_PASS" PPORT="$PORT" PHOST="$HOST" PGD="$pgd" PSEC="$HTTPS" PAP="$ADMIN_PATH" \
    node --input-type=module - <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
const e = process.env;
const enc = encodeURIComponent;
const url = `postgresql://${enc(e.PGU)}${e.PGPW ? ':' + enc(e.PGPW) : ''}@${e.PGH.includes(':') ? '[' + e.PGH + ']' : e.PGH}:${e.PGPT}/${enc(e.PGN)}`;
const lines = ['# Generado por install.sh. No subir a Git. Sin contraseña del administrador (vive solo en la base, con hash).',
  `DATABASE_URL=${url}`, `PORTAL_PORT=${e.PPORT}`, `PORTAL_HOST=${e.PHOST}`];
if (e.PGD) lines.push(`PG_DUMP_PATH=${e.PGD}`);
if (e.PSEC === '1') lines.push('PORTAL_COOKIE_SECURE=1');
// Seguridad (portal/SECURITY.md): ruta secreta del panel, clave de cifrado de la 2FA y caducidad de sesiones.
lines.push(`PORTAL_ADMIN_PATH=${e.PAP}`, `PORTAL_SECRET_KEY=${crypto.randomBytes(32).toString('hex')}`, 'PORTAL_SESSION_IDLE_H=12', 'PORTAL_SESSION_MAX_DAYS=7');
fs.writeFileSync(e.F, lines.join('\n') + '\n', { mode: 0o600 });
fs.chmodSync(e.F, 0o600);
JS
  ) || die "No se pudo escribir $ENV_FILE"
  ok "Escrito $ENV_FILE (permisos 600)"
}

# ---- Pasos de npm --------------------------------------------------------------
child_env() { # ejecuta una orden con el entorno limpio de variables del portal y apuntando al env-file
  env -u DATABASE_URL -u TEST_DATABASE_URL -u PORTAL_ADMIN_USER -u PORTAL_ADMIN_PASSWORD PORTAL_ENV_FILE="$ENV_FILE" "$@"; }

install_deps() {
  step "Dependencias"
  if [ "$SKIP_DEPS" = 1 ]; then say "Omitido (--skip-deps)."; return; fi
  run "npm ci en la raíz del repositorio" npm --prefix "$REPO_ROOT" ci
  run "npm ci en portal/" npm --prefix "$PORTAL_DIR" ci
  run "npm ci en portal/web/" npm --prefix "$PORTAL_DIR/web" ci
}
build_web() {
  step "Interfaz"
  if [ "$SKIP_BUILD" = 1 ]; then say "Omitido (--skip-build)."; return; fi
  run "Compilando la interfaz" npm --prefix "$PORTAL_DIR" run web:build
}
migrate() { step "Esquema"; run "Aplicando el esquema" child_env npm --prefix "$PORTAL_DIR" run migrate; }
create_admin() {
  step "Administrador"
  local out rc=0
  out="$(cd "$PORTAL_DIR" && ISPMAX_ADMIN_PASSWORD="$ADMIN_PASS" child_env node server/admin-cli.mjs create --user "$ADMIN_USER" 2>&1)" || rc=$?
  log "admin-cli: $out"
  [ $rc -eq 0 ] || die "No se pudo crear el administrador: $out"
  ok "$(printf '%s' "$out" | head -n1)"
}
import_content() {
  step "Contenido"
  if [ -z "$CONTENT" ]; then say "Sin --content: podrá cargar el paquete .ispmax desde el Inicio del portal, o con: npm run content:import -- archivo.ispmax"; return; fi
  run "Importando $(basename "$CONTENT")" child_env npm --prefix "$PORTAL_DIR" run content:import -- "$CONTENT" --yes
}

# ---- Servicio ------------------------------------------------------------------
unit_text() {
  local u="$SERVICE_USER"; [ -n "$u" ] || u="$(stat -c %U "$PORTAL_DIR" 2>/dev/null || id -un)"
  cat <<EOF
[Unit]
Description=Portal del manual ISPMAX
After=network.target postgresql.service

[Service]
Type=simple
User=$u
WorkingDirectory=$PORTAL_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$(command -v node) server/index.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
}
setup_service() {
  step "Servicio"
  if [ "$SERVICE" != yes ]; then say "Sin servicio. Para arrancar a mano:  cd \"$PORTAL_DIR\" && PORTAL_ENV_FILE=\"$ENV_FILE\" npm start"; return; fi
  local unit; unit="$(mktemp)"; TMP_FILES+=("$unit"); unit_text > "$unit"
  local S=""; [ "$(id -u)" = 0 ] || { command -v sudo >/dev/null 2>&1 && S=sudo; }
  if ! command -v systemctl >/dev/null 2>&1 || { [ "$(id -u)" != 0 ] && [ -z "$S" ]; }; then
    warn "No hay systemd o permisos de root: no se instaló el servicio. Contenido de $UNIT_PATH:"; cat "$unit"; return; fi
  $S install -m 644 "$unit" "$UNIT_PATH"
  run "systemctl daemon-reload" $S systemctl daemon-reload
  run "Habilitando y arrancando $UNIT_NAME" $S systemctl enable --now "$UNIT_NAME"
  run "Reiniciando $UNIT_NAME" $S systemctl restart "$UNIT_NAME"
  ok "Servicio $UNIT_NAME activo (journalctl -u $UNIT_NAME -f)"
}

summary() {
  local shown="$HOST"; { [ "$HOST" = 0.0.0.0 ] || [ "$HOST" = :: ]; } && shown="$(hostname 2>/dev/null || echo servidor)"
  local p="$PORT"; [ "$WRITE_ENV" = 0 ] && p="$(grep -E '^PORTAL_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)" && p="${p:-$PORT}"
  step "Instalación terminada"
  if [ "$ADMIN_PATH_NEW" = 1 ]; then printf '%s
  %s/
' "${C_B}Ruta del panel (anótela en un lugar seguro: no se volverá a mostrar; está en el .env como PORTAL_ADMIN_PATH):${C_0}" "$ADMIN_PATH"; fi
  cat <<EOF
URL:              http://$shown:$p   (manual en /; panel en la ruta secreta)
Administrador:    $ADMIN_USER  (la contraseña es la que indicó; no se guardó en ningún archivo)
Variables:        $ENV_FILE
Registro:         $LOG_FILE
Cargar contenido: desde el Inicio del portal (subir un .ispmax) o  npm run content:import -- paquete.ispmax --yes
Actualizar:       iniciar sesión y usar Sistema -> Actualizar
Cambiar clave:    ISPMAX_ADMIN_PASSWORD=... npm run admin:reset -- --user $ADMIN_USER   (--2fa-off quita la verificación en dos pasos)
$( [ "$SERVICE" = yes ] || echo "Arranque manual:   cd \"$PORTAL_DIR\" && PORTAL_ENV_FILE=\"$ENV_FILE\" npm start" )

Ejemplo de proxy Nginx con HTTPS (solo ayuda; no se instala):
  server {
    listen 443 ssl;
    server_name portal.example.com;
    ssl_certificate     /etc/letsencrypt/live/portal.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.example.com/privkey.pem;
    client_max_body_size 200m;
    location / {
      proxy_pass http://127.0.0.1:$p;
      proxy_set_header Host \$host;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
  }
Con HTTPS vuelva a ejecutar con --https (o añada PORTAL_COOKIE_SECURE=1 al .env) para marcar la cookie como segura.
EOF
  log "Instalación terminada correctamente"
}

WRITE_ENV=1; HAVE_PSQL=0
check_requirements
collect
ensure_database
write_env
install_deps
build_web
migrate
create_admin
import_content
setup_service
summary
