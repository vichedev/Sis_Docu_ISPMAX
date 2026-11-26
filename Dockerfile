# ─────────────────────────────────────────────────────────────
# ISPMAX · Manual + Portal — imagen de ejecución
#
# La imagen NO contiene el código. La aplicación corre desde la copia del
# repositorio montada en /app (ver docker-compose.yml), de modo que el botón
# "Actualizar el sistema" del panel (git pull + npm ci + compilar + reinicio)
# funcione dentro del contenedor. La imagen solo aporta Node, git, el cliente
# de PostgreSQL 17 (pg_dump/pg_restore) y el script de arranque.
#
# Sistema anterior (Nginx estático): Dockerfile.legacy
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine

LABEL org.opencontainers.image.title="ISPMAX Manual + Portal"
LABEL org.opencontainers.image.vendor="InigualitySoft"

# git: actualizar el código · openssh-client: git por SSH · postgresql17-client: pg_dump/pg_restore
# tini: PID 1 · su-exec: bajar de root a PUID:PGID · bash/curl/wget: arranque y healthcheck
RUN apk add --no-cache git openssh-client postgresql17-client tini su-exec bash curl wget ca-certificates \
 && git config --system --add safe.directory /app \
 && git config --system --add safe.directory '*' \
 && mkdir -p /app /var/lib/ispmax /tmp/home

COPY docker/entrypoint.sh /usr/local/bin/ispmax-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/ispmax-entrypoint && chmod 0755 /usr/local/bin/ispmax-entrypoint

ENV NODE_ENV=production \
    PUID=1000 \
    PGID=1000 \
    HOME=/tmp/home \
    PORTAL_PORT=8387 \
    PORTAL_HOST=0.0.0.0 \
    PORTAL_WORK_DIR=/var/lib/ispmax/work \
    PORTAL_DATA_DIR=/var/lib/ispmax/data \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

WORKDIR /app
EXPOSE 8387

# El primer arranque instala dependencias y compila el panel: puede tardar varios minutos.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10m --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8387/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/ispmax-entrypoint"]
CMD ["node", "portal/server/index.mjs"]
