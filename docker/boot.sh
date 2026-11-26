#!/bin/sh
# Ejecuta el arranque DEL REPOSITORIO montado en /app (se actualiza con git pull); si no existe, el de la imagen.
if [ -f /app/docker/entrypoint.sh ]; then exec bash /app/docker/entrypoint.sh "$@"; fi
exec bash /usr/local/bin/ispmax-entrypoint "$@"
