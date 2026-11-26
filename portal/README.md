# Portal del manual ISPMAX

Portal administrativo para editar el manual de ISPMAX sin tocar archivos a mano.

## 1. Qué es

- **PostgreSQL es la fuente de verdad.** Las páginas, la estructura, las imágenes, los tours y los ajustes viven en la base de datos `ispmax_manual`.
- **El contenido no está en el repositorio.** `docs/` solo tiene una portada de aviso y `assets/imgs/` se eliminó (se conserva `assets/logo/`). El contenido se lleva a otro sistema con un paquete `.ispmax` (sección 5).
- **Un solo puerto.** En producción (8387): `/` es el manual público, `/admin/` el panel, `/api` la API y `/healthz` la comprobación de salud. Mientras no haya contenido, `/` responde 503 «El manual se está preparando».
- **Despliegue con Docker:** ver `portal/DEPLOY.md`.

## 2. Requisitos

- **Node.js 22.12 o superior** (el manual pide `^20.19 || >=22.12`). El portal se desarrolló y probó con Node 24. Comprueba con `node -v`.
- **PostgreSQL** local, con un usuario que pueda crear bases.
- **`pg_dump`** (y `pg_restore` para restaurar). Viene con PostgreSQL. La ruta se indica en `PG_DUMP_PATH`.
- Git, solo para actualizar el código del sistema (Ajustes → Actualización del sistema). El contenido no se toma de Git.

## 3. Primera puesta en marcha (Windows PowerShell)

Todos los comandos se ejecutan dentro de `portal\`.

1. Copia la plantilla y rellénala:
   ```powershell
   Copy-Item .env.example .env
   ```
   Edita `.env` y pon tu contraseña de PostgreSQL en `DATABASE_URL` y `TEST_DATABASE_URL`. Cambia también `PORTAL_ADMIN_PASSWORD`. El archivo `.env` no se sube a Git.
2. Crea la base `ispmax_manual` en pgAdmin (y `ispmax_manual_test` si vas a usar las pruebas).
3. Instala las dependencias:
   ```powershell
   npm install
   npm run web:install
   ```
4. Compila la interfaz:
   ```powershell
   npm run web:build
   ```
5. Prepara la base. Aplica el esquema (no importa contenido):
   ```powershell
   npm run setup
   ```
   El manual se carga después con un paquete `.ispmax` (sección 5).
6. Arranca el portal:
   ```powershell
   npm start
   ```
7. Abre **http://127.0.0.1:4380**. Entra con `PORTAL_ADMIN_USER` y `PORTAL_ADMIN_PASSWORD`. El usuario admin se crea solo si todavía no hay usuarios.

El manual publicado se ve en **`http://127.0.0.1:4380/`** cuando hay contenido. La base de rutas es `/` por defecto (`PORTAL_SITE_BASE`).

## Instalación en un servidor

Para un servidor Linux (Debian/Ubuntu) use el instalador. Crea la base, escribe `.env` (permisos 600), instala dependencias, compila la interfaz, aplica el esquema, crea el administrador inicial y, si se pide, carga un paquete `.ispmax` e instala un servicio systemd. Es idempotente y registra en `portal/install.log` (sin contraseñas).

```bash
cd portal
ISPMAX_DB_PASSWORD='clave-de-postgres' ISPMAX_ADMIN_PASSWORD='clave-larga-del-admin' \
  ./install.sh --yes --admin-user soporte --service --content /ruta/paquete.ispmax
```

- Sin `--yes` pregunta cada dato y pide las contraseñas de forma oculta. `./install.sh --help` lista todas las opciones (`--db-host`, `--db-name`, `--db-admin-user` para crear la base, `--port`, `--host`, `--env-file`, `--skip-deps`, `--no-service`, `--install-node`).
- Requisitos: Node 22.12 o superior, npm y PostgreSQL; `psql` y `pg_dump` (paquete `postgresql-client`) para los respaldos completos.
- Las contraseñas nunca van como argumento: se leen de `ISPMAX_DB_PASSWORD`, `ISPMAX_DB_ADMIN_PASSWORD` e `ISPMAX_ADMIN_PASSWORD`, o se piden por teclado. La del administrador exige 10 caracteres o más y no puede ser obvia.
- Si no se carga contenido al instalar, se sube el `.ispmax` desde el Inicio del portal (tarjeta «Cargar el contenido del manual»), desde Publicación → Respaldos, o con `npm run content:import -- paquete.ispmax --yes`.
- Crear o restablecer administradores después: `ISPMAX_ADMIN_PASSWORD=... npm run admin:create -- --user nombre [--name "Nombre"]` y `npm run admin:reset -- --user nombre`.
- Actualizar el sistema: iniciar sesión y usar Ajustes → Actualización del sistema.
- Con `--host 0.0.0.0` ponga un proxy HTTPS delante (el instalador imprime un ejemplo de Nginx) y use `--https` para marcar la cookie como segura.

## 4. Uso diario

Menú **Contenido**:

- **Páginas**: lista con filtros y búsqueda. Desde aquí se crea una página con plantilla según su tipo (tarea, guía, problema, pregunta, referencia o concepto).
- **Editor de página**: metadatos en un formulario simple. El botón "avanzado" muestra el frontmatter completo. El cuerpo se escribe en MDX, con barra para insertar Paso, Aviso y Captura. Muestra validación en vivo, revisiones y aviso si otra persona cambió la página.
- **Imágenes**: arrastra o pega una imagen en el editor. Se convierte a WebP y se inserta el código de la figura. También puedes subirla desde la pantalla Imágenes.
- **Estructura**: árbol por sección y grupo. Arrastra páginas para cambiar su orden o pasarlas de grupo, y renombra grupos.
- **Tours**: secuencias de pasos sobre capturas del manual.

Menú **Publicación**:

- **Borradores**: páginas nuevas o sin publicar.
- **Manual publicado**: el sitio que se sirve en `/`.
- **Respaldos**: ver sección 6.

## 5. Contenido (paquete `.ispmax`)

- **Crear:** en Publicación → Respaldos, o con `npm run content:export` desde `portal/` (deja `ispmax-contenido-AAAAMMDD-HHMMSS.ispmax` en `portal/data/backups/content/`).
- **Cargar:** con la tarjeta «Cargar el contenido del manual» en el Inicio de un sistema vacío, en Publicación → Respaldos, o con `npm run content:import -- archivo.ispmax --yes`.
- **Pruebas:** leen el contenido del paquete más reciente de `portal/data/backups/content/`. Sin paquete se saltan con aviso. Ver `portal/test/README.md`.

## 6. Ajustes, sistema y respaldos

**Ajustes** (solo admin) tiene estas secciones:

- **General**: título del sitio y WhatsApp de contacto. Se aplican al manual publicado.
- **Actualización del manual**: `auto_publish` y su espera.
- **Actualización del sistema**: botón con pasos y reinicio. No tiene campos de Git: usa la rama y el remoto del propio repositorio.
- **Respaldos**: cuántas copias conservar (`backup_keep`, por defecto 20).
- **Información del sistema**: solo lectura.

Ninguna clave guarda contraseñas. **No son editables** `site_url`, `site_base`, `repo_path`, `git_remote`, `git_branch`, `build_command`, `restart_mode` ni `backup_dir`: los fija el despliegue con variables de entorno (`PORTAL_SITE_BASE`, `PORTAL_RESTART_MODE`, `PORTAL_REPO_PATH`, `PORTAL_UPDATE_MODE`, etc.). La lista completa está en el comentario inicial de `portal/server/index.mjs`.

**Respaldos** (Publicación → Respaldos):

- **Crear** y **descargar** se hacen desde el navegador. Los archivos se guardan en una carpeta fija dentro del volumen de datos.
- **Restaurar** (solo admin): escribe `RESTAURAR` en el cuadro de confirmación. Sin esa palabra exacta no se hace nada.

## 7. Roles

- **admin**: todo. Incluye Ajustes (y la actualización del sistema), Usuarios, Respaldos (restaurar) y Auditoría.
- **editor**: crea y edita páginas, estructura, imágenes y tours. No administra el sistema.
- **viewer**: solo lectura.

Cada rol ve solo los menús y botones que le corresponden. Un admin no puede borrarse a sí mismo ni dejar el sistema sin admin.

## 8. Qué no hace todavía

- El orden relativo entre grupos no se guarda.
- El cuerpo de las páginas nuevas se guarda con saltos de línea LF.

## 9. Desarrollo

- `npm test` (en `portal/`): 83 pruebas de API, frontmatter, estructura, sitio, sistema, contenido, producción y ajustes. Necesita `TEST_DATABASE_URL` y el corpus de contenido (ver `portal/test/README.md`).
- `cd web && node --test test/*.test.mjs`: 70 pruebas de la interfaz.
- `npm run web:dev`: interfaz en modo desarrollo, en **http://127.0.0.1:5173**. Hace proxy de `/api` al puerto 4380, así que `npm start` debe estar en marcha.
- `npm run roundtrip`: importa el corpus de pruebas a la base de pruebas, exporta y compara byte a byte. Debe dar cero diferencias.
- **Aviso:** `npm run roundtrip` y `npm test` vacían `TEST_DATABASE_URL`. No apuntes esa variable a la base con tu contenido real.

## 10. Solución de problemas

- **`/` responde 503 «El manual se está preparando».** No hay contenido en la base. Carga un paquete `.ispmax` (sección 5).
- **El puerto 4380 está ocupado.** Otro programa, o un `npm start` anterior, usa el puerto. Cierra ese proceso o cambia `PORTAL_PORT` en `.env`.
- **Falla el build de Rspack al publicar.** El sitio anterior se mantiene. Revisa el log de la construcción en el panel.
- **La sesión caducó.** Vuelve a entrar en la pantalla de acceso. Los cambios guardados en la base no se pierden.
