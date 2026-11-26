#!/usr/bin/env bash
# Ejecuta `capture.mjs` con la cuenta de pruebas de la instancia local, sin mostrar la clave.
#
#   tools/capture/capturar.sh manifest-c6-factus-bcv.json [--only prefijo/] [--list]
#
# Variables (todas opcionales):
#   ISPMAX_ACCESO   archivo con las líneas "Usuario: …" y "Clave: …" de la instancia local
#                   (def. ~/Downloads/ispmax/ACCESO-LOCAL.txt; vive fuera del repo y NO se versiona)
#   ISPMAX_USER / ISPMAX_PASS   si ya están definidas, no se lee el archivo
#   ISPMAX_URL      panel (def. http://localhost:8080; solo se aceptan hosts locales)
#   EDGE_PATH       navegador Chromium: Brave, Chrome o Edge (se detecta en macOS y Linux si no se indica)
set -euo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${ISPMAX_USER:-}" || -z "${ISPMAX_PASS:-}" ]]; then
  ACC="${ISPMAX_ACCESO:-$HOME/Downloads/ispmax/ACCESO-LOCAL.txt}"
  [[ -f "$ACC" ]] || { echo "Falta el archivo de acceso ($ACC). Define ISPMAX_USER e ISPMAX_PASS o ISPMAX_ACCESO." >&2; exit 2; }
  export ISPMAX_USER="$(awk -F': *' '/^Usuario/{print $2}' "$ACC" | tr -d '\r ')"
  export ISPMAX_PASS="$(awk -F': *' '/^Clave/{print $2}' "$ACC" | tr -d '\r')"
fi

if [[ -z "${EDGE_PATH:-}" ]]; then
  for c in "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
           "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
           "$(command -v google-chrome || true)" "$(command -v chromium || true)" "$(command -v brave-browser || true)"; do
    [[ -n "$c" && -x "$c" ]] && { export EDGE_PATH="$c"; break; }
  done
fi

cd "$AQUI"
[[ -d node_modules ]] || { echo "Falta instalar las dependencias: (cd tools/capture && npm ci --ignore-scripts)" >&2; exit 2; }
M="${1:?Uso: capturar.sh <manifiesto.json> [--only prefijo/] [--list]}"; shift
exec node capture.mjs --manifest "$M" "$@"
