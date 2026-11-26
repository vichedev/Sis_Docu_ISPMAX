# Sis_Docu_ISPMAX — Manual y portal de ISPMAX

Manual de usuario de ISPMAX (software de gestión para proveedores de Internet, de InigualitySoft) y el **portal de administración** con el que se edita.

- **Manual público** (`/`): sitio de documentación generado con [Rspress 2](https://rspress.rs) y un tema propio con Tailwind CSS v4 (`theme/`).
- **Portal** (`portal/`): panel de administración (React + Tailwind), API (Fastify) y base de datos PostgreSQL. **El contenido del manual vive en la base de datos, no en este repositorio.**
- Un solo proceso sirve todo en el puerto **8387**: `/` manual, la ruta secreta del panel, `/healthz` y el sitemap.

> **El contenido no está en el código.** Las páginas, imágenes, tours y la estructura se llevan en un paquete `.ispmax` que se carga una vez desde el panel (o por consola). Ese archivo **no** se sube a Git.

## Instalar en un servidor con Docker (producción)

Requisitos: Docker con Compose v2 y Git. El proxy inverso que ya apunta a `IP:8387` no necesita cambios.

```bash
git clone https://github.com/vichedev/Sis_Docu_ISPMAX.git
cd Sis_Docu_ISPMAX
ISPMAX_ADMIN_PASSWORD='una-clave-larga-y-unica' ./install-docker.sh --yes --admin-user soporte
```

El instalador sustituye el contenedor antiguo `ispmax-manual` (sin borrar volúmenes ni imágenes), genera la clave de la base de datos y una **ruta secreta aleatoria para el panel** (se muestra una sola vez), levanta PostgreSQL y la aplicación, espera a que esté `healthy` y crea el administrador. Después carga el contenido:

1. Entra en la ruta secreta del panel que mostró el instalador, inicia sesión (te pedirá cambiar la clave si es débil).
2. En **Inicio → Cargar el contenido del manual**, sube el archivo `.ispmax`.
3. El manual se genera solo (≈30 s) y queda en `/`.

También por terminal: `./install-docker.sh --content /ruta/paquete.ispmax` (ver `./install-docker.sh --help`).

**Guía completa** (proxy, cabeceras, lista de IPs, repositorio privado, copias de seguridad, actualización y vuelta atrás): [`portal/DEPLOY.md`](portal/DEPLOY.md). **Seguridad**: [`portal/SECURITY.md`](portal/SECURITY.md).

## Qué NO está en este repositorio (a propósito)

Archivos `.env`, claves, la ruta secreta del panel, contraseñas, copias de la base de datos (`*.dump`), paquetes de contenido (`*.ispmax`), `node_modules` y `dist`. El `.gitignore` los bloquea. El instalador genera los secretos en el servidor.

## Desarrollo local

Node.js 22 y PostgreSQL. Ver `portal/README.md` para el portal. Para ver el manual con el contenido real mientras se diseña (necesita un paquete `.ispmax` en `portal/data/backups/content/`):

```bash
npm ci
npm run dev:corpus      # manual en http://localhost:3001 con recarga en caliente
npm run build:corpus    # compila y ejecuta check-dist y la evaluación del buscador
```

Pruebas: `cd portal && npm test` (servidor, necesita PostgreSQL y `TEST_DATABASE_URL`) y `cd portal/web && node --test test/*.test.mjs` (panel).

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `portal/` | Servidor, panel (`web/`), esquema SQL, instaladores, pruebas y guías |
| `theme/`, `styles/`, `src/` | Tema Tailwind de Rspress, componentes MDX y buscador del manual público |
| `scripts/` | Utilidades del manual (menú, buscador, comprobaciones, SEO) |
| `docker/`, `Dockerfile`, `docker-compose.yml`, `install-docker.sh` | Despliegue (`*.legacy`: el sistema anterior, Nginx estático) |
| `notes/`, `docs-*.md`, `CLAUDE.md` | Notas del proyecto y guías de mantenimiento |
| `tools/` | Capturas reproducibles y siembra de la instancia local de ISPMAX |
