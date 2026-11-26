# Inventario RED1 — Red: Routers, Redes IPv4/IPv6 y Planes de servicio
> Alcance: FE `src/pages/dashboard/Gestion-Red/{routers,redes-ipv4,redes-ipv6,internet}/**` y `src/pages/dashboard/red/getIp.vue`; BE `src/{router,mikrotik,mikrotik-resources,red-ipv4,red-ipv6,internet}` + `src/common/utils/{mikrotik.service,pcq-addresslist.utils,control-velocidad,red-utils,onu-corte.utils}.ts`. Para efectos cruzados se leyeron además (solo lo necesario) `monitoreo-trafico/*`, `app.service.ts`, `app-queue.processor.ts`, `customers/customers.service.ts` y `ajustes/servicios/*`. Generado desde el ZIP del 2026-10-06.

**Convenciones.** Citas `FE:pages/dashboard/...:línea` y `BE:modulo/archivo.ts:línea` (rutas relativas a `src/`). ✅ = leído en código. ❓ = inferido / pendiente de ver en la UI real (aún no hay instancia: nada va marcado 🖥️). Textos entre comillas = literales de la interfaz; si vienen del backend se indica.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| RED-001 | Listado de Routers (estado, versión, acciones) | `/router` · `index.routers` | `index.routers` (+ por botón) | completo |
| RED-002 | Alta de router: campos y qué configura ISPMAX en el MikroTik al guardar | `/router/add` · `router.add` | `crear.router` | completo |
| RED-003 | Edición de router: qué cambia en el equipo al guardar y cambio de Control de velocidad | `/router/edit/:router_id` · `router.edit` (pestaña "Datos & Configuración") | `editar.router` | completo |
| RED-004 | Pestaña Monitoreo del router (info, tráfico en vivo, interfaz WAN) | `/router/edit/:router_id` pestaña "Monitoreo" | `editar.router` (ruta) | completo |
| RED-005 | Pestaña Gráficos del router (histórico por interfaz) | `/router/edit/:router_id` pestaña "Gráficos" | `editar.router` (ruta) | completo |
| RED-006 | Comprobar conexión (un router) y Verificar conexión (todos) | `/router` | `ping.router` | completo |
| RED-007 | Reparar router / Reparar todos: efectos exactos | `/router` | `reparar.router` | completo |
| RED-008 | Referencia: objetos que ISPMAX crea en el MikroTik por modo (Colas simples, PCQ+Address List, Ninguno, PPPoE, amarre) | (transversal) | — | completo |
| RED-009 | Activar/Inactivar y Eliminar router | `/router` | `activar.inactivar.router`, `eliminar.router` | completo |
| RED-010 | Migrar clientes a otro router + Historial de migraciones | `/router` (modal) | `editar.router` (migrar); historial: `ping.router` o `reparar.router` | completo |
| RED-011 | Amarre IP/MAC: Aplicar amarre masivo y Auditar amarre | `/router` (modal) | `reparar.router` (+ router con "Seguridad alterna") | completo |
| RED-012 | Clientes del router (modal + Excel) | `/router` (clic en "Total Clientes") | sin clave propia | completo |
| RED-013 | Detección de router caído, auto-reparación y avisos | (cron backend) + badge en `/router` | — | completo |
| RED-014 | Listado de Redes IPv4 | `/redes-ipv4` · `index.red_ipv4` | `index.red_ipv4` | completo |
| RED-015 | Alta/edición de Red IPv4 (segmento) | `/redes-ipv4/add` · `crear.red_ipv4`; `/redes-ipv4/edit/:id` · `editar.red_ipv4` | `crear.red_ipv4`, `editar.red_ipv4` | completo |
| RED-016 | Inspeccionar red IPv4: clientes, IPs libres, ping, Excel | `/redes-ipv4` (modal) | sin clave propia | completo |
| RED-017 | Trasladar clientes entre redes IPv4 (mismo router) + revertir | `/redes-ipv4` (modal) | `editar.red_ipv4` | completo |
| RED-018 | Excel de redes IPv4: plantilla, importar, exportar | `/redes-ipv4` | sin clave propia | completo |
| RED-019 | Lista de corte por red y mecanismo de corte en MikroTik (tipo de corte) | `/redes-ipv4` (campo "Lista de corte") | `crear/editar.red_ipv4` | completo |
| RED-020 | Listado de Redes IPv6 | `/redes-ipv6` · `redesIpv6.index` | `redesIpv6.index` | completo |
| RED-021 | Alta/edición de Red IPv6 | `/redes-ipv6/add` · `crear.red_ipv6`; `/redes-ipv6/edit/:id` · `redesIpv6.edit` | `crear.red_ipv6`, `redesIpv6.edit` | completo |
| RED-022 | Inspección IPv6 (clientes, subredes libres) y Excel IPv6 | `/redes-ipv6` | sin clave propia | completo |
| RED-023 | Listado de Planes de servicio ("Servicios de Internet") | `/servicios/internet` · `index.planes` | `index.planes` | completo |
| RED-024 | Alta/edición de plan (pestañas Facturación / Parámetros Técnicos) | `/servicios/internert/add` · `crear.planes`; `/servicios/internert/edit/:id` · `editar.planes` | `crear.planes`, `editar.planes` | completo |
| RED-025 | Qué pasa con clientes, router y facturas al editar un plan | (efectos de RED-024) | — | completo |
| RED-026 | Migrar clientes de un plan a otro | `/servicios/internet` (modal) | `editar.planes` | completo |
| RED-027 | Clientes del plan (modal + Excel), Activar/Inactivar y Eliminar plan | `/servicios/internet` | `activar.inactivar.planes`, `eliminar.planes` | completo |
| RED-028 | Excel de planes: plantilla, importar, exportar | `/servicios/internet` | sin clave propia | completo |
| RED-029 | Corte de servicio: cómo se materializa en MikroTik y OLT, y config. por router | (cron/cola) + Ajustes › Configuración de Cortes (`/ajustes/servicio`) | `variables.dias-habilitados`, `variables.horario.cortes`, `variables.reintentos.mikrotik`, `variables.aplicar-cortes`, `variables.opciones-cortes` | completo |
| RED-030 | "Obtener IP" (herramienta suelta) | `/red/getIp` · `getIp` | `getIp` (sin ítem de menú) | completo |
| RED-031 | Permisos, alcance por router y menú | transversal | todas las del dominio | completo |

## Modelo de datos y relaciones (referencia)

- **Router** (`routers`, `BE:router/entities/router.entity.ts`): credenciales API, versión RouterOS, modo de control de velocidad, PPPoE, seguridad alterna, NAT, `corteConfig` (jsonb), estado de monitoreo (`online`, `ultimo_visto`, `caido_desde`, `fallos_consecutivos`, `slack_alertado`, `version_ros`), `interfaz_wan`, borrado lógico (`deleted_at`). ✅ `:16-129`.
- **RedIpv4** (`redes-ipv4`): `router_id`, `nombre`, `red`, `cidr` (texto largo, p. ej. `24 (255.255.255.0/24 - 254 hosts, 256 IP)`; el backend usa solo lo anterior al primer espacio), `tipo_uso`, `gateway`, `broadcast`, `lista_corte`, `color`, `nota_pago`, `isActive`, borrado lógico. ✅ `BE:red-ipv4/entities/red-ipv4.entity.ts:5-60`.
- **RedIpv6** (`redes-ipv6`): `router`, `nombre`, `red`, `mascara`, `subred`, `isActive`, borrado lógico. ✅ `BE:red-ipv6/entities/red-ipv6.entity.ts:4-37`.
- **Internet = plan** (`internet`): **una fila por router y por nombre de plan**; la UI agrega filas del mismo nombre. ✅ `BE:internet/entities/internet.entity.ts:5-78`, `BE:internet/internet.service.ts:89-138`.
- **Servicio de cliente** (`servicios-clientes`, entidad `ServicioCliente`): referencia `router_id`, `perfil_internet` (plan), `red_id` (red IPv4), `ipv4`, `ipv6`, `isActive` (suspendido = false), `deleted` + `deleted_at` (retirado). ✅ `BE:customers/entities/ServicioCliente.entity.ts:41-67,152-188`.
- Una **red IPv4 no guarda a sus clientes**: se calcula por rango (`servicio.ipv4 <<= red/cidr`) dentro del router. ✅ `BE:red-ipv4/red-ipv4.service.ts:777-833`. La relación `servicio.red_id` existe y se usa para la lista de corte, el gateway PPPoE y el traslado.
- Todos los endpoints de este dominio llevan solo `@Auth()` (JWT + usuario existente): **no hay verificación de permisos en backend** (ver RED-031).

---

## RED-001 · Listado de Routers

- **Ruta UI / name:** `/router` · `index.routers` · menú Gestión de Red → "Routers" (`FE:layouts/SideBarMenu.vue:129-139`).
- **Archivos:** FE: `pages/dashboard/Gestion-Red/routers/IndexPage.vue`, `components/{ClientesRouterModal,ModalMigrarRouter,ModalHistorialMigraciones,AuditoriaAmarreModal}.vue` · BE: `router/router.controller.ts`, `router/router.service.ts`, `router/router-monitor.service.ts`, `mikrotik/mikrotik.controller.ts`.
- **Para qué sirve:** ver los equipos MikroTik registrados, su estado de conexión y lanzar las operaciones de red (reparar, comprobar, migrar, amarre). ✅
- **Acceso:** ítem de menú y ruta requieren `index.routers` (el guard exige un permiso con el mismo nombre que la ruta; SUPER-ADMINISTRADOR pasa siempre) ✅ `FE:router/auth-guard.ts`. Cada botón valida su clave (tabla abajo).
- **Secciones / pestañas:** una sola tabla ("Listado de Routers"), con buscador, botón pantalla completa y modales.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Agregar Router" (en móvil: botón flotante "+") | Va a `/router/add` | `crear.router` | — | oculto en pantallas `xs` salvo el flotante ✅ `:462-469,809-822` |
| "Reparar todos" (tooltip "Reparar todos los routers activos") | Repara uno a uno los routers activos | `reparar.router` | `POST /mikrotik/reparar-router/:id` (en bucle) | ver RED-007 |
| "Historial migraciones" | Abre modal | visible si `ping.router` **o** `reparar.router` (mismo contenedor) | `GET /red-ipv4/historial-migraciones` | ver RED-010 ✅ `:416,434-440` |
| "Verificar conexión" (tooltip "Chequear ahora el estado de conexión de todos los routers") | Ejecuta el chequeo de conexión de todos los routers activos | visible si `ping.router` o `reparar.router` | `POST /router/verificar-conexion` | ver RED-006 |
| Icono lápiz (tooltip "Editar router") | `/router/edit/:id` | `editar.router` | — | solo fila activa |
| Icono engranajes (tooltip "Reparar router") | Confirma y repara | `reparar.router` | `POST /mikrotik/reparar-router/:id` | RED-007 |
| Icono router (tooltip "Comprobar conexión al router") | Ping API | `ping.router` | `POST /mikrotik/realizar-ping?router_id=` | RED-006 |
| Icono swap (tooltip "Migrar clientes a otro router") | Modal de migración | `editar.router` | `POST /red-ipv4/migrar-router` | RED-010 |
| Icono enlace (tooltip "Aplicar amarre masivo") | Amarra IP/MAC | `reparar.router` y router con `seguridad_alterna` no vacía | `POST /mikrotik/aplicar-amarre-masivo/:id` | RED-011 |
| Icono fact_check (tooltip "Auditar amarre (IP real vía ONU)") | Modal de auditoría | idem | `/mikrotik/auditoria-amarre/...` | RED-011 |
| Icono "x" (tooltip "Desactivar router") | Inactiva | `activar.inactivar.router` | `PATCH /router/:id/false` | RED-009 |
| Icono "✓" (fila inactiva) | Activa | `activar.inactivar.router` | `PATCH /router/:id/true` | RED-009 |
| Icono papelera (fila inactiva) | Elimina | `eliminar.router` | `DELETE /router/:id` | RED-009 |
| Insignia con el nº de "Total Clientes" (tooltip "Ver clientes de este router") | Abre modal de clientes | sin clave | `GET /router/:id/clientes` | RED-012 |

  Las acciones editar/reparar/ping/migrar/amarre/auditar/desactivar **solo aparecen en filas activas**; en filas inactivas solo "activar" y "eliminar" ✅ `FE:routers/IndexPage.vue:614-770`.

- **Filtros y columnas de tabla:** buscador "Buscar..." (filtro del cliente sobre las filas cargadas). Columnas literales: `#`, `Nombre Router`, `IP/Host`, `Total Clientes`, `Versión RouterOS`, `Control Velocidad`, `Estado`, `acciones` ✅ `:35-44`. Debajo del nombre, insignias: `PPPoE Queue` / `PPPoE Perfil` (si `control_pppoe`), `Amarre MAC`, `Amarre MAC+DHCP` ✅ `:506-538`. "Total Clientes" sale de `POST /dashboard/clientes-servicios {router:[id]}` ✅ `:155-165`. "Versión RouterOS": fila inactiva `—`; online `v<version>` (o `En línea` si aún no hay versión) con tooltip "Visto hace X"; offline `Sin conexión` + "caído hace X" o "visto hace X" ✅ `:553-581`. "Control Velocidad": `Ninguno` / `PCQ + Address List` / `Colas simples` (cualquier valor desconocido se muestra "Colas simples") ✅ `:20-33,583-591`.
- **Estados posibles:** `isActive` → "Activo"/"Inactivo"; `online` (booleano mantenido por el monitor, RED-013).
- **Reglas de negocio (backend):**
  - `GET /router` devuelve todos los routers (con `password_api` y `user_api` en claro) ordenados por `created_at DESC`; si el usuario tiene routers asignados, solo esos ✅ `BE:router/router.service.ts:181-198`, `BE:router/router.controller.ts:66-73`.
  - `GET /router/:estado?` con `true` devuelve solo activos (`ParseBoolPipe`, por defecto false) ✅.
  - Borrado lógico (`deleted_at`): el router eliminado desaparece de todos los listados ✅.
- **Efectos secundarios externos:** ninguno al listar (al abrir la página solo se leen datos de BD). `Verificar conexión` sí toca MikroTik (RED-006).
- **Mensajes de error/éxito (texto exacto):** vacío: "No se encontró ningun Resultado". Error de carga: `error.response.data.message` (backend). Activar/inactivar: éxito = `msg` del backend "Actualizado Exitosamente". Eliminar: confirmación "Estas seguro de eliminar este router?" (título "Confirmar", botones "Eliminar"/"Cancelar"); éxito "Registro eliminado exitosamente"; error de backend "No se puede eliminar este router, porque tiene clientes." / "No se puede eliminar este router." ✅ `FE:composables/useHelpers.js:48-67`, `BE:router/router.service.ts:277-281`.
- **Relaciones con otros módulos:** redes IPv4/IPv6, planes, cajas NAP, usuarios (`users.routers` limita qué routers ve cada usuario), clientes, cortes, SmartOLT/AdminOLT, monitoreo de tráfico.
- **Casos límite y advertencias:**
  - `rows[index]` se usa con `props.rowIndex`: con paginación/orden, el spinner de "Comprobar conexión" puede mostrarse en otra fila (el `router_id` enviado sí es el correcto) ✅ `:252-272`. ❓ confirmar en UI.
  - El componente `ModalImportarClientes.vue` está importado pero **nunca se abre** (no hay botón que ponga `showModalImportClients` en true) y su lógica es de prueba (`console.log`) → código muerto ✅ `:49,785-787`.
- **Preguntas probables de usuarios:**
  1. ¿Qué significa "Sin conexión" en la columna Versión RouterOS y cuánto tarda en aparecer?
  2. ¿Por qué no veo algunos routers? (alcance por usuario / router inactivo).
  3. ¿Qué diferencia hay entre "Reparar", "Comprobar conexión" y "Verificar conexión"?
  4. ¿Para qué sirve el número azul de "Total Clientes"?
  5. ¿Puedo eliminar un router que tiene clientes? (No: ver RED-009).
  6. ¿Qué significan las etiquetas "PPPoE Perfil", "PPPoE Queue", "Amarre MAC"?
  7. ¿Por qué un router inactivo no tiene botón de reparar?
  8. ¿Qué es "PCQ + Address List" en Control Velocidad?
- **Pendiente de validar en UI:** ❓ comportamiento visual de paginación persistida (`estadosStore.paginationRouter`); ❓ si el botón "Historial migraciones" aparece para roles con solo `index.routers`.

---

## RED-002 · Alta de router (Agregar Router)

- **Ruta UI / name:** `/router/add` · `router.add` · botón "Agregar Router" de RED-001. Migas: "Inicio" › "Routers" › "Agregar"; título "Agregar Router".
- **Archivos:** FE: `routers/AddRouter.vue`, `routers/components/FormRouter.vue`, `routers/composables/useRouter.js` · BE: `router/router.controller.ts:29-36`, `router/router.service.ts:32-53`, `router/dto/create-router.dto.ts`, `common/utils/mikrotik.service.ts`, `mikrotik/mikrotik.service.ts:62-116`.
- **Para qué sirve:** registrar un MikroTik y dejarlo accesible para ISPMAX (API, firewall y, en v7, certificado + REST/HTTPS). ✅
- **Acceso:** `crear.router` (ruta: `permisoPorRuta['router.add']` ✅ `FE:router/auth-guard.ts`).
- **Secciones / pestañas:** formulario único (en alta no hay pestañas Monitoreo/Gráficos).
- **Botones y acciones:** "Regresar" (a `/router`, solo ancho > 600 px), "Guardar Cambios" (submit), botón de mapa dentro de "Ubicación" (abre `ModalMapBox` y escribe `lng, lat`).
- **Campos de formulario:** (etiquetas literales de `FE:FormRouter.vue`)

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Nombre Router:" | texto (mayúsculas visuales) | Sí (FE) | BE: `@IsNotEmpty @IsString`, **se guarda en MAYÚSCULAS** (`@Transform toUpperCase`) | No hay chequeo de nombre repetido ✅ `BE:create-router.dto.ts:7-10` |
| "Usuario (API):" | texto | Sí | `@IsNotEmpty @IsString` | Usuario del MikroTik con permiso API |
| "Contraseña (API):" | texto con ojo | Sí | `@IsString` | Se guarda **en claro** (`varchar 110`) y se devuelve en `GET /router` y `GET /router/find/:id` |
| "Version RouterOS:" | select | Sí | `RouterOS v6.x hasta v7.8` → `RouterOS V6.x`; `RouterOS ≥ v7.9 (o superior)` → `RouterOS V7.x` | Decide REST/HTTPS (v7) o API binaria (v6) en TODO el sistema |
| "Puerto API:" | texto, placeholder `8728` | No (FE) | si vacío el FE envía **"8728"**; BE `@IsNotEmpty` | Valor por defecto real: **8728** ✅ `FE:useRouter.js:107` |
| "Puerto SSL:" | número, placeholder `443`, solo si versión v7 | No | si vacío el FE envía **"443"** (también en v6) | Puerto del servicio `www-ssl` (REST) ✅ `:106` |
| "Control de velocidad:" | select | Sí | `Colas Simples`→`colas_simples`; `PCQ + Address List`→`pcq_addresslist`; `Ninguno`→`ninguno` | ver RED-008 |
| "Seguridad alterna:" | select (clearable) | No | `Ninguno` (vacío), `Amarre de IP y Mac`, `Amarre de IP y Mac + DHCP Leases`; deshabilitado con hint "No compatible con PPPoE" cuando "Soporte PPPoE" está activo | al activar PPPoE se limpia ✅ `:496` |
| "Soporte PPPoE:" | toggle "Habilitado"/"Deshabilitado" | No | `control_pppoe` boolean | |
| "Modo PPPoE:" | select, solo si PPPoE habilitado | No | `Con Profile PPP (Queue dinámicos)`=`perfil` (por defecto); `Con Queues estáticos`=`queue`; `Sin control (lo maneja el ISP)`=`ninguno` | hints en el propio formulario (abajo) |
| "IP / Host:" | texto | Sí | el FE filtra caracteres a `[a-zA-Z0-9-.:/]`; BE `@IsNotEmpty @IsString` | `varchar(18)` en BD: un hostname > 18 caracteres falla al guardar ❓ |
| "Sucursal:" | multi-select (chips) | Sí | opciones = sucursales de la empresa + `TODOS` (valor `null`); BE `@IsNotEmpty @IsArray` | `TODOS` ≡ `[null]` (visibilidad) |
| "Sucursal para pagos automáticos:" | select (clearable) | No | solo aparece si `GET /cloud-api/config` → `whatsapp_activo === true`; ofrece solo sucursales que atiende el router | **No se persiste** (ver hallazgo H-01) |
| "Detrás de NAT:" | toggle | No | `detras_nat` | Tooltip: "Actívalo si el RouterOS está detrás de NAT: no se restringe por IP en servicios ni firewall, porque tras el NAT la IP de origen no coincide." (+ "El Puerto SSL sí se aplica al router." en v7) |
| "Ubicación:" | texto, placeholder "Coordenadas Longitud, Latitud" | No | libre | |
| "Máx. conexiones:" | número 1–50 (BE) | No | **oculto** (`v-if="false && …"`); BE `@Min(1) @Max(50)`, solo v7; defecto 10 | sigue guardándose/usándose ✅ `FE:FormRouter.vue:730-770`, `BE:mikrotik-resources.service.ts:73-111` |

  - **Campo no visible:** `tipo_router` se envía fijo `"MikroTik"` (`FE:useRouter.js:15`); es requerido por el BE.
  - Validación FE: faltante → "Debes completar este campo" (campos `nombre,user_api,tipo_router,registro_trafico,ip_host,password_api,sucursal,control_velocidad`) ✅ `FE:useRouter.js:61-98`.
  - Hints dinámicos (con "Soporte PPPoE" activo) ✅ `FE:FormRouter.vue:22-52`:
    - Control de velocidad: "⚠ Los PPPoE quedarán SIN límite: en modo Queue el perfil PPP no lleva rate-limit y aquí no se crea ninguna cola" (Queue + Ninguno); "Aplica también a los clientes PPPoE (modo Queue)"; "Solo aplica a clientes IPoE: la velocidad de los PPPoE la manejas tú" (modo Ninguno); "Solo aplica a clientes IPoE: a los PPPoE los limita el perfil PPP" (modo Perfil).
    - Modo PPPoE: "ISPMAX crea una cola por cliente y deja el perfil PPP sin rate-limit"; "ISPMAX no toca la velocidad: no escribe rate-limit en el perfil ni crea colas. Para ISPs que la manejan por queue tree propio o por la OLT"; "ISPMAX escribe el rate-limit en el perfil PPP; el MikroTik crea una cola dinámica por sesión".

- **Estados posibles:** `isActive` nace en `true` (default de la columna) ✅ `BE:router.entity.ts:87-88`; monitoreo: `online` nace en `true`.
- **Reglas de negocio (backend)** — `RouterService.create` ✅ `BE:router/router.service.ts:32-53`:
  1. Crea la entidad (sin guardar todavía).
  2. **`cleanupSSLConfiguration`** contra `ip_host:puerto_api`: borra de `/ip/firewall/filter` toda regla cuyo comentario contenga "ISPMAX" (sin distinguir mayúsculas), deja `www-ssl` en `disabled=yes`, `certificate=none`, `port=443`, `address=` vacío, libera `address` del servicio `api`, y elimina certificados cuyo nombre contenga `ispmax`. Todo es *best effort*: si no conecta, sigue sin error ✅ `BE:common/utils/mikrotik.service.ts:386-495`.
  3. **`configurarRouterSSL`** ✅ `BE:mikrotik/mikrotik.service.ts:62-116`:
     - `checkRouterAccessible`: abre API (puerto `puerto_api`, timeout efectivo 7 s), lee `/system/resource` y **fija el servicio `api`**: sin NAT → `port=<puerto_api>`, `address=<IP pública del servidor>` (la obtiene de api.ipify.org / ifconfig.me / icanhazip.com), `disabled=no`; con NAT → `address=` vacío y `disabled=no` sin tocar el puerto ✅ `:115-145`. Si no conecta: error "No se logró realizar la conexión al router por API sin SSL".
     - **v7**: exige RouterOS ≥ 7.9 ("Versión del RouterOS no compatible, es necesario contar la version 7.9 o superior"); luego `configureSSL` (RED-008 §A).
     - **v6** (o "hasta v7.8"): solo `configureFirewallApi`: borra la regla con comentario `Acepta RouterOS API-ISPMAX` y crea una nueva `input/accept tcp dst-port=<puerto_api>` (con `src-address=<IP servidor>` salvo NAT), al inicio de la cadena.
  4. Guarda el router, invalida caché de permisos y de resumen del sistema.
  5. Cualquier error se devuelve como `BadRequestException(error.message)`; el FE lo muestra tal cual.
- **Efectos secundarios externos:** MikroTik (servicios `api`/`www-ssl`, firewall filter, certificados, ver arriba); consulta HTTP a servicios de IP pública. No toca colas, listas ni PPPoE en el alta (los clientes se cargan con Reparar o al crear servicios).
- **Mensajes de error/éxito (texto exacto):** éxito "Router creado exitosamente"; error: `error.response.data.message` o "Fallo el crear el router". Mensajes de backend más probables: "No se logró realizar la conexión al router por API sin SSL"; "Versión del RouterOS no compatible, es necesario contar la version 7.9 o superior"; "Error configurando SSL: …"; "El certificado ispmax no completó el proceso de firma"; "No se pudo determinar la IP del servidor"; "No se pudo configurar el firewall del API: …".
- **Relaciones con otros módulos:** al guardar se refresca `/auth/get-routers` (selectores de router de toda la app) ✅ `FE:useRouter.js:122-123`.
- **Casos límite y advertencias:**
  - **Prueba de conexión:** el formulario no tiene botón "Probar"; la "prueba" es el propio guardado (si no conecta por API, no se crea) ✅. La pantalla de alta muestra spinner "Procesando..." (el texto "Preparando router..." para v7 nunca se muestra por un bug: usa `formRouter.registro_trafico` sin `.value`) ✅ `FE:useRouter.js:113`.
  - El alta con v7 tarda: `delay(1000)`+`delay(4000)`+hasta 10×2000 ms de espera de firma+`delay(3000)` de verificación (≈ 9–28 s) ✅ `BE:common/utils/mikrotik.service.ts:247,258,277-285,355`.
  - La API debe estar **habilitada y alcanzable desde el servidor ISPMAX** antes de guardar; con "Detrás de NAT" apagado ISPMAX restringe el servicio `api` y el firewall a la IP pública del servidor (si el router llega a ver otra IP de origen, quedará sin acceso).
  - El usuario API debe poder escribir en `/ip/service`, `/ip/firewall/filter`, `/certificate` (el código lo hace sin comprobación previa).
- **Preguntas probables de usuarios:**
  1. ¿Qué puerto API debo poner? (8728 si lo deja vacío; Puerto SSL 443).
  2. ¿Qué cambia ISPMAX en mi MikroTik al guardar? (RED-008).
  3. ¿Qué elijo en "Version RouterOS" si tengo 7.8? (la primera opción: "v6.x hasta v7.8").
  4. ¿Para qué sirve "Detrás de NAT"?
  5. ¿Por qué falla con "No se logró realizar la conexión al router por API sin SSL"?
  6. ¿Puedo poner un nombre de dominio en IP/Host?
  7. ¿Qué diferencia hay entre Sucursal y "Sucursal para pagos automáticos"?
  8. ¿Qué es "Seguridad alterna" y por qué se deshabilita con PPPoE?
- **Pendiente de validar en UI:** ❓ longitud real aceptada en IP/Host (`varchar(18)`); ❓ que "Sucursal para pagos automáticos" efectivamente no se guarda (H-01); ❓ mensaje exacto cuando el usuario API no tiene permisos de escritura.

---

## RED-003 · Edición de router y cambio de Control de velocidad

- **Ruta UI / name:** `/router/edit/:router_id` · `router.edit`. Migas "Inicio" › "Routers" › "Editar"; título "Editar Router". Pestañas: "Datos & Configuración" (icono settings), "Monitoreo" (speed), "Gráficos" (show_chart) ✅ `FE:routers/EditRouter.vue:53-89`.
- **Archivos:** FE: `routers/EditRouter.vue`, `components/FormRouter.vue` (mismo formulario que RED-002 con `edit=true`) · BE: `router/router.controller.ts:84-109`, `router/router.service.ts:108-174`, `common/utils/mikrotik.service.ts:556-575`, `mikrotik/mikrotik-queue.processor.ts:45-66`.
- **Para qué sirve:** modificar datos del router y, si corresponde, reaplicar configuración en el equipo. ✅
- **Acceso:** `editar.router` (ruta por `permisoPorRuta['router.edit']`). El formulario carga `GET /router/find/:id` (incluye la contraseña API).
- **Campos:** los de RED-002 (misma pantalla). En edición se envía `{...formRouter, puerto_ssl||"443", puerto_api||"8728"}` y el BE descarta propiedades que no están en el DTO (`whitelist: true`, `BE:main.ts`).
- **Botones y acciones:** "Regresar", "Guardar Cambios" → `PATCH /router/:id`.
- **Reglas de negocio (backend)** — `RouterService.update` ✅ `BE:router/router.service.ts:108-174`:
  1. Lee el router actual. `needsSSLReconfiguration` compara campos: v7 → `ip_host, puerto_ssl, registro_trafico, detras_nat`; v6 → `puerto_api, registro_trafico, detras_nat`. Si cambió alguno ⇒ `cleanupSSLConfiguration` (mismo borrado de RED-002 §2, ahora contra los datos **nuevos**).
  2. Si el DTO dice **v7**: `configurarRouterSSL` **siempre** (aunque no cambie nada). Eso implica conectar por API, reescribir el servicio `api`, y `configureSSL`, que **no regenera el certificado si el REST/SSL ya responde** ("REST API SSL ya estaba configurado"); si no responde, recrea certificado, `www-ssl` y reglas de firewall.
  3. Si es **v6**: solo se reconfigura cuando cambia **"Detrás de NAT"** (sirve para quitar/poner la restricción por IP del servicio `api` y la regla `Acepta RouterOS API-ISPMAX`). Cualquier otro cambio en v6 es solo BD.
  4. `routerRepository.update(id, dto)`; invalida caché de permisos y resumen.
  5. **Cambio de Control de velocidad** (comparación textual con el valor guardado) ✅ `:142-167`:
     | Modo anterior → nuevo | Qué ocurre |
     |---|---|
     | cualquier cambio que involucre `pcq_addresslist` | se **encola** el job `aplicarControlVelocidad` (limpia el modo anterior y aplica el nuevo); mensaje "Registro actualizado. El cambio de control de velocidad se está aplicando en el router." |
     | `colas_simples` → `ninguno` | síncrono: `eliminarQueuesRouter` (borra las `/queue/simple` cuyo target sea `<IP>/32` de un servicio del router) |
     | `ninguno` → `colas_simples` | síncrono: `repararRouter` (crea colas de todos los clientes; puede tardar minutos) |
     | sin cambio de modo | mensaje "Registro actualizado exitosamente" |
     El job (Bull, cola `…-mikrotik`, 1 intento): si el modo anterior era `colas_simples` → `eliminarQueuesRouter`; si era `pcq_addresslist` → `limpiarRouter` (borra mangle/árbol/tipos/listas `ISPMAX-*`); si el nuevo es `colas_simples` → `repararRouter`; si es PCQ → `sincronizarRouter` (las advertencias solo quedan en el log) ✅ `BE:mikrotik/mikrotik-queue.processor.ts:45-66`.
  6. Valores desconocidos de `control_velocidad` se tratan como `colas_simples` ✅ `BE:common/utils/control-velocidad.ts:26-31`.
- **Efectos secundarios externos:** los de RED-002 (v7 siempre) + colas/listas según la tabla anterior; cola Bull para PCQ.
- **Mensajes de error/éxito:** éxito "Router editado exitosamente"; error `error.response.data.message` o "Fallo el editar el router"; BE: `{ok:true,msg}` ("Registro actualizado exitosamente" / "Registro actualizado. El cambio de control de velocidad se está aplicando en el router.").
- **Casos límite y advertencias:**
  - **Un router v7 fuera de línea no se puede editar** (ni para cambiar el nombre o la sucursal): `configurarRouterSSL` falla y el guardado **no se realiza** (error "No se logró realizar la conexión al router por API sin SSL") ✅. En v6 sí se puede (salvo cambiar NAT).
  - **Cambiar "Puerto API" no cambia el puerto del servicio en el equipo**: ISPMAX conecta ya con el puerto nuevo, de modo que el valor debe coincidir con el que el router ya escucha; en v6 el cambio dispara `cleanup` (que intenta con el puerto nuevo) y luego no reconfigura nada ✅ `:113-136`.
  - Pasar de v7 a v6 ejecuta `cleanup` (borra reglas "ISPMAX", cert. y desactiva www-ssl) y **no** vuelve a crear la regla `Acepta RouterOS API-ISPMAX` (solo cambia NAT dispara `configurarRouterSSL` en v6) ✅.
  - `ninguno → colas_simples` se ejecuta dentro de la petición HTTP: en routers con miles de abonados puede superar el timeout del navegador ❓.
  - La contraseña API viaja y se guarda en claro; el campo no tiene "dejar vacío para no cambiar".
- **Preguntas probables de usuarios:**
  1. ¿Por qué no me deja guardar si el router está apagado?
  2. ¿Qué pasa con las colas si cambio de "Colas Simples" a "Ninguno"?
  3. ¿Cuánto tarda el cambio a "PCQ + Address List" y cómo sé que terminó? (no hay indicador: solo mensaje y log).
  4. ¿Puedo cambiar el Puerto API desde ISPMAX? (No: primero hay que cambiarlo en el router).
  5. ¿Qué pasa al cambiar la versión de RouterOS en el formulario?
  6. ¿Se pierde la configuración de los clientes al editar?
- **Pendiente de validar en UI:** ❓ tiempo real de guardado en v7 con router sano; ❓ si el toast de PCQ llega antes de que termine el job; ❓ que el campo "Sucursal para pagos automáticos" se vacíe al reabrir (H-01).

---

## RED-004 · Pestaña "Monitoreo" del router

- **Ruta UI / name:** `/router/edit/:router_id` → pestaña "Monitoreo" (icono speed). Solo se monta al abrir la pestaña (`v-if="tab === 'monitoreo'"`). La interfaz elegida se comparte con la pestaña "Gráficos" (`v-model:interfaz`) ✅ `FE:routers/EditRouter.vue:74-87`.
- **Archivos:** FE: `routers/components/MonitoreoRouter.vue` · BE: `monitoreo-trafico/monitoreo-trafico.controller.ts:92-125`, `monitoreo-trafico/monitoreo-router.service.ts:26-98,292-315`.
- **Para qué sirve:** ver recursos del equipo, tráfico en vivo de una interfaz y **marcar la interfaz WAN** que alimenta el total de tráfico del Dashboard. ✅
- **Acceso:** el que permite abrir la ruta de edición (`editar.router`). Los endpoints solo exigen JWT (cualquier usuario autenticado podría llamarlos).
- **Secciones:**
  1. Tarjeta "Interfaz de salida (WAN)": texto "Marca la interfaz uplink a internet (la que recibe la descarga). Se usa para el total de tráfico del dashboard."; select "Interfaz WAN" (clearable); estado "Configurada" / "Sin configurar".
  2. "Información del Router": filas `Uptime`, `Versión`, `Board`, `Arquitectura`, `CPU` (`<cpu> × <n> (<MHz> MHz)`), `Memoria libre`, `Memoria total`, `Disco libre`; barras "Carga de CPU: x%" y "Memoria usada: x%". Vacío: "Sin información disponible."
  3. "Tráfico Actual" con insignia "EN VIVO", select "Interfaz", tarjetas "RX (descarga)" y "TX (subida)" en Mbps y gráfico de líneas ("Iniciando captura en vivo..." mientras no hay muestras).
- **Botones y acciones:** cambiar "Interfaz WAN" guarda al instante (`PATCH /monitoreo-trafico/router/:id/wan {interfaz}`; `null` la quita) y además posiciona el monitoreo y los gráficos en esa interfaz ✅ `:112-125`.
- **Reglas de negocio (backend):**
  - `info` → `/system/resource` (v6 API / v7 REST); `interfaces` → `/interface/print`, descartando nombres vacíos o que empiecen por `<` (interfaces dinámicas PPPoE) ✅ `BE:monitoreo-router.service.ts:26-70`.
  - `trafico-vivo` → `/interface/monitor-traffic once` → `rx-bits-per-second`/`tx-bits-per-second` a Mbps (2 decimales). El FE consulta cada **3 s** y conserva 60 puntos (3 min) ✅ `FE:MonitoreoRouter.vue:29,85-90`.
  - WAN: guarda `routers.interfaz_wan`; el Dashboard suma solo las filas históricas cuya interfaz es la WAN de cada router (`trafico_interfaz_hora`, 7 días) ✅ `BE:monitoreo-trafico.service.ts:263-283`. Sin WAN, ese router no aporta al total.
  - Timeouts: v7 REST 15 s; v6 API 15 s con espera de conexión de 8 s ✅ `BE:monitoreo-router.service.ts:319-373`.
- **Efectos secundarios externos:** solo lectura al MikroTik (el único cambio es BD: `interfaz_wan`).
- **Mensajes de error/éxito:** banner rojo con `error.response.data.message` o "No se pudo conectar al router."; BE: "No se pudo conectar al router: <motivo>", "Error consultando el router: <detalle>", "El parámetro interfaz es requerido", "Router no encontrado".
- **Relaciones:** Dashboard (tráfico total), RED-005, `monitoreo-trafico` (colector).
- **Casos límite:** el gráfico en vivo se detiene si falla una lectura puntual (no muestra error). El nombre guardado de la WAN es texto: si en el equipo se renombra la interfaz, el total del dashboard deja de reconocerla ❓.
- **Preguntas probables:** ¿Qué interfaz marco como WAN? · ¿Por qué el total del Dashboard sale en cero? · ¿Qué significa "EN VIVO"? · ¿Por qué no aparecen mis interfaces PPPoE? · ¿Cada cuánto se actualiza?
- **Pendiente de validar en UI:** ❓ aspecto del gráfico y si el select de interfaz marca las deshabilitadas (`running/disabled` se devuelven pero el FE no las usa).

---

## RED-005 · Pestaña "Gráficos" del router

- **Ruta UI / name:** `/router/edit/:router_id` → pestaña "Gráficos" (icono show_chart).
- **Archivos:** FE: `routers/components/GraficosRouter.vue` · BE: `monitoreo-trafico/monitoreo-router.service.ts:229-290`, colector `monitoreo-trafico/monitoreo-trafico-collector.service.ts`.
- **Para qué sirve:** histórico de tráfico (Entrada RX / Salida TX en Mbps) de una interfaz del router. ✅
- **Acceso:** igual que RED-004.
- **Secciones:** select "Seleccionar Interfaz" + botón "Actualizar" + 4 gráficos:

| Tarjeta | Subtítulo | Fuente / ventana (BE) |
|---|---|---|
| "Gráfico Diario" | "Promedio de 5 minutos" | `trafico_interfaz_muestra`, últimas 24 h |
| "Gráfico Semanal" | "Promedio por hora" | `trafico_interfaz_hora`, últimos 7 días |
| "Gráfico Mensual" | "Promedio por hora" | `trafico_interfaz_hora`, últimos 30 días |
| "Gráfico Anual" | "Promedio por día" | `trafico_interfaz_dia`, últimos 365 días |

  Leyenda "Entrada (RX)" / "Salida (TX)"; vacío "Sin datos aún para este período."; error "No se pudo obtener las interfaces del router." ✅ `FE:GraficosRouter.vue:24-29,157-233`.
- **Reglas de negocio:** el colector corre cada 5 min sobre routers **activos** (`@Cron('*/5 * * * *')`), lee `/interface` (y `/queue/simple` salvo en modo PCQ) y guarda deltas por interfaz; agrega por hora (min 4) y por día (00:10); retención: muestras 8 días, horas 60 días, días 400 días ✅ `BE:monitoreo-trafico-collector.service.ts:106,516-537,617-737`. Si entre dos lecturas pasan más de 30 min (`MAX_GAP_SEG`) no se registra muestra (solo se refresca el contador); si el contador del router se reinició, el delta de esa lectura queda en 0 ✅ `:76-80,378-415,466-475`.
- **Efectos externos:** el colector lee el MikroTik cada 5 min; la pantalla solo lee BD.
- **Pendiente de validar en UI:** ❓ datos reales tras un día de operación; ❓ comportamiento en routers v6 sin ninguna interfaz de nombre estático.
- **Preguntas probables:** ¿Por qué el gráfico anual está vacío en un router nuevo? · ¿Qué mide "Promedio de 5 minutos"? · ¿Se guardan los gráficos de routers inactivos? (no: solo se recolectan activos).

---

## RED-006 · Comprobar conexión (un router) y Verificar conexión (todos)

- **Ruta UI:** botones en `/router` (RED-001). Permiso `ping.router`.
- **Archivos:** FE `routers/IndexPage.vue:97-140,252-272` · BE `mikrotik/mikrotik.controller.ts:53-63`, `mikrotik/mikrotik.service.ts:2469-2507`, `mikrotik-resources/mikrotik-resources.service.ts:152-180`, `router/router.controller.ts:18-27`, `router/router-monitor.service.ts:50-57`.
- **Comprobar conexión al router (icono router):**
  - `POST /mikrotik/realizar-ping?router_id=<id>` ✅. v6: abre API (`puerto_api`) y lee `/interface/print`; v7: `GET /system/resource` por REST (puerto SSL, timeout 8 s). **No** modifica nada.
  - Respuestas (texto del backend, mostrado en un toast azul si contiene "Se logró conectar al mikrotik", rojo si no): v6 `Se logró conectar al mikrotik: <ip>` / `No se logró conectar al router.`; v7 `Se logró conectar al mikrotik` / `No se logró conectar al Router (Usuario o contraseña incorrectas)` (401) / `No se logró conectar al Router ()` (otro HTTP) / `No se recibió respuesta del MikroTik` / `Error al intentar conectar: <msg>`. FE ante excepción: "Ha ocurrido un error".
  - En v7 prueba el REST/HTTPS, no el puerto API 8728.
- **Verificar conexión (botón superior):** `POST /router/verificar-conexion` → ejecuta **el mismo ciclo del monitor** (RED-013) sobre todos los routers activos y devuelve la lista actualizada ✅.
  - Resultado en toast: "Todos los routers respondieron" (verde) o "Sin conexión: <nombres>" / "Sin conexión (<n>): <nombres>" (naranja); si falla el servicio: "No se pudo completar la verificación de conexión" y recarga la tabla ✅ `FE:100-140`.
  - **Falso "todo bien" en el primer fallo:** el monitor solo marca `online=false` tras **2 chequeos fallidos seguidos**; con un único fallo, el botón responde "Todos los routers respondieron" aunque un equipo no haya contestado ✅ `BE:router-monitor.service.ts:33,102-108`.
  - Al segundo fallo seguido el botón puede **disparar la auto-reparación** de v7 (regenera certificado/servicios/firewall) y notificar a Slack (RED-013).
- **Mensajes:** ver arriba. **Efectos externos:** lectura (Comprobar) / lectura + posible reconfiguración SSL (Verificar).
- **Preguntas probables:** ¿Por qué "Verificar conexión" dice que todos responden si uno está caído? · ¿Qué diferencia hay entre Comprobar y Verificar? · ¿Qué significa "Usuario o contraseña incorrectas"? · ¿Verificar corrige algo?
- **Pendiente de validar en UI:** ❓ tiempo que tarda "Verificar conexión" con varios routers caídos (timeouts 7–20 s, concurrencia 5).

---

## RED-007 · Reparar router / Reparar todos

- **Ruta UI:** `/router` · botones "Reparar todos" (tooltip "Reparar todos los routers activos") e icono engranajes (tooltip "Reparar router"). Permiso `reparar.router`.
- **Archivos:** FE `routers/IndexPage.vue:198-242,304-359` · BE `mikrotik/mikrotik.controller.ts:42-46`, `mikrotik/mikrotik.service.ts:2406-2467`, `mikrotik-resources/mikrotik-resources.service.ts:182-263,623-1040`, `mikrotik/pcq-addresslist.service.ts`, `app-queue.processor.ts:63-66,114-707`.
- **Para qué sirve:** empujar al MikroTik el estado actual de todos los clientes del router ("reconciliar"), y reactivar clientes que ya están al día. ✅
- **Flujo (por router):**
  1. Diálogo "Confirmar": "¿Deseas reparar el router <nombre>?" (OK "SI", "Cancelar"). Loading "Reparando router <nombre>, por favor espere...".
  2. `POST /mikrotik/reparar-router/:id` → `repararRouter(id, reactivarAlDia=true)`.
  3. Carga planes + servicios + clientes + red del router. **Aprovisionamiento masivo** de todos los servicios con `deleted=false` y cliente (activos **y suspendidos**): v7 por REST, v6 por API (RED-008).
  4. Si el router es PCQ → `sincronizarRouter` y devuelve `advertencias`.
  5. Porque el controlador pasa `reactivarAlDia=true`, **encola** `cortesServicios {routerId, reparacionManual:true}` en la cola `…-app`: reevalúa fecha de pago de todos los servicios del router; **reactiva** a los que estén al día (BD) y **suspende solo si hoy es día de corte** de ese router; deshabilita/habilita ONU en SmartOLT/AdminOLT cuando hay transición de estado y el canal está activo; no crea facturas ni envía Slack; y vuelve a empujar el router completo ✅ `BE:app-queue.processor.ts:114-707` (condiciones `:196,604`).
  6. Respuesta `{ msg: "Clientes agregados exitosamente", advertencias }`.
- **Reparar todos:** diálogo "¿Deseas reparar todos los routers activos (<n>)?" (OK "SI, REPARAR TODOS"); sin activos: "No hay routers activos para reparar". Recorre **en serie** los routers activos; al final: "Reparación completada: <x> OK, <y> fallidos" (+ " — con advertencias: <routers> (repáralos de a uno para ver el detalle)") con color verde / naranja / rojo ✅.
- **Mensajes (texto exacto):** éxito "Router reparado exitosamente."; con PCQ y advertencias: se muestran toasts fijos amarillos (botón "Entendido") **en lugar de** el mensaje de éxito; error: `error.response.data.error` o "ocurrio un error al reparar el router". Advertencias del backend: "El router tiene FastTrack activo en /ip/firewall/filter. El tráfico fasttrackeado NO pasa por mangle, así que esos abonados quedarían SIN límite. Hay que desactivar esa regla para que el control PCQ funcione."; "El plan "X" no tiene bajada ni subida configurada. En RouterOS eso se traduce en pcq-rate=0, que significa SIN LÍMITE…"; "Los planes "A", "B" comparten el mismo nombre normalizado (SLUG)…"; "N cliente(s) de este router se conectan por PPPoE y no entran al PCQ…" ✅ `BE:pcq-addresslist.service.ts:309-323,395-483`.
- **Reglas/efectos clave (qué hace y qué NO hace):**
  - No borra nada que no sea de ISPMAX **salvo** (a) colas simples cuyo `target` contiene la IP de un cliente cuando el router **no** está en `colas_simples` (modos `ninguno` y `pcq`), (b) en PCQ: objetos huérfanos con prefijo `ISPMAX-`, (c) en PPPoE modo ≠ queue: la cola simple de la IP del cliente ✅ `BE:mikrotik.service.ts:804-813,748-756`.
  - Para clientes suspendidos: los saca de la lista del plan y los deja en la lista de corte (RED-019); para activos al revés.
  - Un PPPoE con perfil existente que ya tiene `rate-limit` **no** se corrige si cambió la velocidad del plan (solo se escribe el rate-limit cuando el perfil no lo tiene) ✅ `BE:mikrotik.service.ts:159-163`, `mikrotik-resources.service.ts:311-318`.
  - En routers v7 el lote va por tandas (`max(10, max_conexiones×10)`), reintenta una vez los fallidos y aborta si el router deja de responder ("El router no está accesible o no responde (se cayó o no hay ruta). Operación cancelada.") ✅ `BE:mikrotik-resources.service.ts:940-982,1030-1038`.
  - Con 0 clientes igualmente asegura la regla RAW de "Impagos" ✅.
- **Efectos secundarios externos:** MikroTik (colas, listas, RAW, PPP, ARP/DHCP, PCQ), SmartOLT/AdminOLT (transiciones), cola Bull `…-app`.
- **Casos límite y advertencias:**
  - En routers con miles de abonados puede tardar minutos (el manual actual ya lo advierte); la UI bloquea con un loading global.
  - Dos operaciones en paralelo contra el mismo router pueden saturar el pool de conexiones REST (comentario del código en `mikrotik.service.ts:2395-2404`).
  - Si algún cliente falla, el lote reporta error agregado y el router queda parcialmente actualizado (los demás sí se aplican).
- **Preguntas probables:** ¿Qué hace exactamente "Reparar"? · ¿Puede cortar a clientes? (sí, solo en día de corte) · ¿Reactiva a quienes ya pagaron? (sí) · ¿Por qué tarda tanto? · ¿Reparar borra mis colas propias? (en `Ninguno`/PCQ borra las simples con IP de cliente) · ¿Hace falta reparar tras migrar/trasladar? (sí).
- **Pendiente de validar en UI:** ❓ texto real del toast cuando `data.error` es "Bad Request" (el BE devuelve un arreglo de mensajes en algunos fallos); ❓ duración real en un router de ~1 000 abonados.

---

## RED-008 · Referencia: qué crea ISPMAX en el MikroTik, por modo

> Esta sección es transversal: describe los objetos que ISPMAX escribe/lee. Aplica a Reparar (RED-007), alta/edición de servicios de clientes y cortes. Todo está duplicado en dos implementaciones: **v6** (API binaria, `MikrotikService`) y **v7** (REST, `MikrotikResourcesService`) con la misma lógica funcional.

### A. Acceso y seguridad (alta/edición del router)

| Qué | Detalle | Cita |
|---|---|---|
| Servicio `api` | `port=<Puerto API>`, `address=<IP pública del servidor>` (vacío si "Detrás de NAT"), `disabled=no` | `BE:common/utils/mikrotik.service.ts:115-145` |
| Servicio `www-ssl` (v7) | `certificate=ispmax`, `port=<Puerto SSL>`, `address=<IP servidor>` (vacío con NAT), `disabled=no` | `:297-313` |
| Certificado (v7) | nombre `ispmax`, CN `isp-max.net`, `key-usage=key-cert-sign,crl-sign`, 3650 días, firmado con `ca-crl-host=ssl.isp-max.net`; si ya existía uno con ese nombre lo borra y recrea | `:242-285` |
| Firewall filter | reglas `input/accept tcp` al inicio de la cadena: `Acepta REST API SSL-ISPMAX` (dst-port = Puerto SSL, solo v7) y `Acepta RouterOS API-ISPMAX` (dst-port = Puerto API); `src-address=<IP servidor>` salvo NAT | `:315-347,507-551` |
| Limpieza | elimina toda regla filter con "ISPMAX" en el comentario, resetea `www-ssl`, libera `address` de `api`, borra certificados con "ispmax" | `:386-495` |

### B. Regla de corte (todas las versiones y modos)

Por cada lista de corte en uso (siempre `Impagos` + las `lista_corte` de las redes), ISPMAX asegura **una regla en `/ip firewall raw`** (y `/ipv6 firewall raw` si hay paquete ipv6): `chain=prerouting action=drop src-address-list=<lista> comment=<lista>`, y la **mueve a la posición 0** ✅ `BE:mikrotik.service.ts:1519-1554`, v7 `mikrotik-resources.service.ts:1875-1936`. La IP del cliente suspendido se agrega a esa address-list con comentario = nombre del cliente. No hay redirección a página de aviso ni cola de castigo (grep de `dst-nat/redirect/hotspot` = 0 resultados) ✅.

### C. Modo `colas_simples`

Una `/queue/simple` por servicio (IPoE, o PPPoE con modo "queue"): `name = "<CLIENTE EN MAYÚSCULAS> | <IPv4>"`, `target = <IPv4>/32` (+ `, <IPv6>/128` si hay), `max-limit = <subida>M/<descarga>M`, `limit-at = ceil(vel × Limit At / 100)` por sentido, `priority = <prio>/<prio>`; y **solo si Burst Limit, Threshold y Time son > 0**: `burst-limit = ceil(vel × (1 + BurstLimit/100))`, `burst-threshold = ceil(vel × Threshold/100)`, `burst-time = <t>/<t>` ✅ `BE:mikrotik.service.ts:504-531,640-656`; v7 `mikrotik-resources.service.ts:698-720,837-850`. Si la cola ya existe (por IP) no se vuelve a crear ni se actualiza su velocidad en "Reparar" (solo la edición del plan / del servicio la reescribe).

### D. Address-list del plan ("Addresslist")

Si el plan define "Addresslist": servicio **activo** → su IPv4 (y IPv6) entra en esa lista con comentario = cliente; **suspendido** → sale de ella y entra en la lista de corte. Cambiar la Addresslist del plan **mueve** las entradas por IP (job `editAddressListPlanMikrotik`, 2 intentos, backoff 60 s) y omite suspendidos y entradas que estén en la lista de corte ✅ `BE:mikrotik/mikrotik-edit-name-queue.processor.ts:162-271`.

### E. Modo `pcq_addresslist` (PCQ por plan)

Por **plan activo** (slug = nombre en MAYÚSCULAS, sin tildes, no `[A-Z0-9]`→`-`, máx. 30; vacío → `SIN-NOMBRE`) ✅ `BE:common/utils/pcq-addresslist.utils.ts:28-71`:

| Objeto | Nombre / contenido |
|---|---|
| address-list | `ISPMAX-<SLUG>`; cada IPv4 de abonado con comentario `ISPMAX-PCQ \| <CLIENTE>` |
| `/queue/type` ×2 | `ISPMAX-<SLUG>-D` (`pcq-classifier=dst-address`, `pcq-rate=<bajada>M`) y `ISPMAX-<SLUG>-U` (`src-address`, `<subida>M`); `pcq-limit=50`, `pcq-total-limit=20000` |
| `/ip firewall mangle` ×2 | `chain=forward action=mark-packet passthrough=no`, `dst-address-list=ISPMAX-<SLUG>`→marca `…-D`; `src-address-list=…`→marca `…-U`; comentario `ISPMAX-PCQ:<SLUG>:D\|U` |
| `/queue/tree` ×2 | `ISPMAX-<SLUG>-D/-U`, `parent=global`, `packet-mark` y `queue` anteriores, `priority` = prioridad del plan (1–8) |

Reglas: IPv6 queda fuera de PCQ; `pcq-rate=0` = sin límite, por eso se advierte si el plan no tiene velocidad; **no hay contador, burst ni limit-at por cliente** ✅ `BE:mikrotik/pcq-addresslist.service.ts:47-48,128-251,255-300`. Un plan **inactivo** se trata como inexistente: sus objetos y membresías se borran en la siguiente sincronización (sus clientes quedarían sin límite) ✅ `:408-409,235-250`.

### F. PPPoE (`control_pppoe` activo y servicio `tipo_conexion=PPPoE` con usuario)

- **Perfil PPP** con el **nombre del plan** (`nombre_plan`): `dns-server=1.1.1.1,8.8.8.8`; `rate-limit=<subida>M/<descarga>M` solo en modo `perfil`; en `queue`/`ninguno` el perfil se deja **sin** rate-limit (y si lo tenía, se vacía).
- **Secret**: `name=<usuario>`, `password`, `remote-address=<IPv4 del servicio>`, `local-address=<gateway de la red>` (campo Gateway, o primera IP si está vacío y CIDR ≤ 30), `profile=<plan>`, `service=pppoe`, `comment=<CLIENTE>`; `disabled=true` si el servicio está suspendido. Un secret existente solo se corrige en `disabled` y `local-address` ✅ `BE:mikrotik.service.ts:143-221`, `common/utils/red-utils.ts:10-35`.
- Suspender = secret `disabled` + IP a la lista de corte (desactivar el secret no baja la sesión activa) ✅ `:1191-1203`.
- Modo `queue` + `colas_simples` → además una cola simple por cliente; modo `queue` + PCQ → su IP entra a la lista del plan; modos `perfil`/`ninguno` quedan fuera del PCQ ✅ `:3460-3474`, `pcq-addresslist.service.ts:395-441`.

### G. Seguridad alterna (amarre)

`Amarre de IP y Mac`: ARP estático `address+mac-address+interface` (la interfaz sale de la entrada dinámica; si no hay entrada dinámica, no amarra), comentario = cliente. `Amarre de IP y Mac + DHCP Leases`: además lease estático (make-static del dinámico o `add`). En "Reparar" se amarra a todo servicio que tenga MAC guardada (con un `ping` previo de 2 paquetes a quienes no estén en la tabla ARP); el "amarre masivo" (RED-011) en cambio **omite los PPPoE** ✅ `BE:mikrotik.service.ts:324-409,578-585,933-967,2925,2955`.

### H. ¿Quién limita a quién? (resumen verificado en código)

| `control_velocidad` | Cliente IPoE | PPPoE "Con Profile PPP" | PPPoE "Con Queues estáticos" | PPPoE "Sin control" |
|---|---|---|---|---|
| Colas simples | cola simple por cliente | rate-limit del perfil (cola dinámica por sesión) | cola simple por cliente (perfil sin límite) | nadie desde ISPMAX |
| PCQ + Address List | lista `ISPMAX-<PLAN>` + árbol PCQ | rate-limit del perfil (excluido del PCQ) | lista `ISPMAX-<PLAN>` | nadie |
| Ninguno | nadie; **Reparar borra** colas simples con la IP del cliente | rate-limit del perfil | **sin límite** (aviso en el formulario) | nadie |


---

## RED-009 · Activar / Inactivar y Eliminar router

- **Ruta UI:** `/router`, columna "acciones". Permisos `activar.inactivar.router` y `eliminar.router`.
- **Archivos:** FE `routers/IndexPage.vue:167-196,616-770` · BE `router/router.controller.ts:111-124`, `router/router.service.ts:243-282`.
- **Botones y acciones:**

| Etiqueta | Qué hace | Endpoint | Efectos |
|---|---|---|---|
| Icono "x" (tooltip "Desactivar router") | `isActive=false` | `PATCH /router/:id/false` | solo BD + invalida caché de permisos y de resumen; **no toca el MikroTik** |
| Icono "✓" (solo fila inactiva) | `isActive=true` | `PATCH /router/:id/true` | ídem |
| Icono papelera (solo fila **inactiva**) | confirma "Estas seguro de eliminar este router?" y borra | `DELETE /router/:id` | borrado lógico (`softDelete`) |

- **Reglas de negocio (backend):**
  - Inactivar excluye al router de: monitor de conexión (RED-013), colector de tráfico, jobs de corte (`router.isActive`) y de "Reparar todos" ✅ `BE:router-monitor.service.ts:60`, `monitoreo-trafico-collector.service.ts:146-150`, `app-queue.processor.ts:174-176`. Los clientes del router **no se suspenden** ni se modifican.
  - Aun inactivo, el router **sigue apareciendo** en los selectores de Router de la app (`GET /auth/get-routers` no filtra por `isActive`) ✅ `BE:auth/auth.service.ts:286-315`; en cambio el destino de "Migrar" sí lo filtra (RED-010).
  - Eliminar: bloquea si el router tiene **servicios vivos** (relación `plan_internet`; los retirados no cuentan) → "En uso" ⇒ mensaje "No se puede eliminar este router, porque tiene clientes." También ante FK `23503`. Otro error: "No se puede eliminar este router." ✅ `BE:router.service.ts:256-282`.
  - Eliminar **no** borra ni mueve redes IPv4/IPv6, planes ni cajas NAP del router (quedan apuntando a un router con `deleted_at`) ✅ (no hay código que lo haga).
- **Efectos secundarios externos:** ninguno en el MikroTik (no se limpian colas/reglas/certificados al eliminar).
- **Mensajes:** éxito "Actualizado Exitosamente" (backend) / "Registro eliminado exitosamente" (FE); tras eliminar, el FE recarga `/auth/get-routers` y la tabla.
- **Casos límite:** el chequeo de "en uso" usa una consulta con `router.company_id = :id OR router.id = :id` (compara la empresa con el id del router; inocuo pero extraño) ✅ `:259-263`. Para eliminar un router con clientes hay que migrarlos (RED-010) o retirarlos.
- **Preguntas probables:** ¿Por qué no puedo eliminar el router? · ¿Qué pasa con los clientes si inactivo el router? · ¿Inactivar apaga el internet de los clientes? (No) · ¿Se borra la configuración del MikroTik al eliminar? (No) · ¿Cómo recupero un router eliminado? (no hay pantalla).
- **Pendiente de validar en UI:** ❓ si un router inactivo sigue ofreciéndose en el selector de alta de redes/planes.

---

## RED-010 · Migrar clientes a otro router + Historial de migraciones

- **Ruta UI:** `/router` → icono swap (tooltip "Migrar clientes a otro router"); botón "Historial migraciones". Permiso `editar.router` (migrar). Es distinto del traslado entre **redes** (RED-017).
- **Archivos:** FE `routers/components/ModalMigrarRouter.vue`, `ModalHistorialMigraciones.vue` · BE `red-ipv4/red-ipv4.controller.ts:20-31,74-77`, `red-ipv4/red-ipv4.service.ts:1065-1182`, `red-ipv4/entities/migracion-router-log.entity.ts`.
- **Para qué sirve:** reasignar **todas las redes IPv4 de un router** (con sus clientes, planes y cajas NAP) a otro router, en la base de datos. ✅
- **Secciones:** Modal "Migrar clientes a otro router": "Router origen" (fijo), "Router destino" (solo routers **activos** distintos del origen), aviso "Se moverán todas las redes IPv4 junto con sus clientes, planes y cajas NAP al router destino.", botones "Cancelar" / "Migrar". Confirmación: título "Confirmar migración", "¿Estás seguro de mover todos los clientes de <origen> al router <destino>?" (OK "Sí, migrar"). Tras migrar: "Migración completada" + "<n> redes movidas de <origen> a <destino>" + aviso "Si fue un error, puedes revertir ahora. Una vez cerrado este modal podrás revertir desde el historial de migraciones." + botones "Cerrar" / "Deshacer migración".
- **Historial migraciones:** modal "Historial de migraciones" con `<origen> → <destino>`, "<n> redes · <fecha>", "Revertido el <fecha>", botón "Revertir" (confirmación "Confirmación": "¿Estás seguro de que deseas revertir este registro?") o insignia "Revertido"; vacío "No hay migraciones registradas".
- **Endpoints:** `POST /red-ipv4/migrar-router {router_origen_id, router_destino_id}`; `POST /red-ipv4/revertir/:logId`; `GET /red-ipv4/historial-migraciones`.
- **Reglas de negocio (backend)** ✅ `BE:red-ipv4.service.ts:1065-1182`:
  1. Toma **todas** las redes IPv4 (activas e inactivas, no eliminadas) del router origen; si no hay: "El router origen no tiene redes IPv4 asignadas".
  2. Por cada red, para **cada servicio** con `red_id` = esa red: busca en el destino un plan con **el mismo `nombre_plan`**; si no existe, **crea una copia** del plan en el destino (copia solo: nombre, descripción, precio, impuesto, descarga, subida, limit_at, burst_limit, prioridad, address_list, ice, valor_ice, tipo_ice, isActive; **no copia** `burst_threshold`, `burst_time` ni `codigo`) ✅ `:1068-1073,1098-1100`. Actualiza el servicio: `router_id` y `perfil_internet`.
  3. Mueve las **cajas NAP** referenciadas por esos servicios al router destino.
  4. Borra (DELETE físico) los planes del origen que quedaron **sin ningún servicio** (contando incluso retirados) ✅ `:1115-1125`.
  5. Actualiza `red.router_id` y guarda `migracion_router_log` (`redes_migradas` = ids, `revertido`, `revertido_at`).
  6. **Revertir** (`revertirMigracion`): vuelve a ejecutar la misma migración de cada red hacia el router origen, **con todos los servicios que tenga la red en ese momento** (incluidos los creados después) y marca el log como revertido.
  7. **No** hay ninguna operación en MikroTik (ni colas, ni listas, ni secrets, ni limpieza en el origen) ✅.
- **Efectos secundarios externos:** ninguno directo. Los clientes migrados **no existen aún en el router destino** hasta que se ejecute "Reparar" en él, y el router origen conserva sus colas/listas/secrets hasta que se limpien a mano.
- **Mensajes:** "Error al migrar" / "Error al revertir" (o `message` del backend); éxito del historial = `msg` "Migración revertida exitosamente"; errores BE: "Log de migración no encontrado", "Esta migración ya fue revertida".
- **Casos límite y advertencias:**
  - No migra redes IPv6 (siguen en el origen) ni servicios con `red_id` vacío ✅.
  - Editar el campo "Router" de **una** red IPv4 (RED-015) ejecuta la misma lógica para esa red, **sin registro en el historial** ✅ `:1028-1030`.
  - Si el plan del origen se llama igual pero con otra capitalización, no lo reconoce (comparación exacta) y crea una copia.
  - El historial hace `INNER JOIN` con ambos routers (`getHistorialMigraciones`): si alguno fue eliminado (borrado lógico), la fila probablemente deja de listarse ❓ `:1175-1182`.
  - El FE no avisa que hay que "Reparar" el destino (el modal de traslado entre redes sí lo hace).
- **Preguntas probables:** ¿Qué pasa con los clientes en el MikroTik después de migrar? · ¿Puedo migrar solo algunas redes? (No desde esta pantalla) · ¿Se pierde la velocidad (burst) de los planes? (ver H-05) · ¿Se puede deshacer? (sí, mientras siga el log) · ¿Hay que reparar el router destino?
- **Pendiente de validar en UI:** ❓ comportamiento si la red tiene servicios en otro router (datos inconsistentes); ❓ si el selector de destino incluye routers fuera del alcance del usuario.

---

## RED-011 · Amarre IP/MAC: Aplicar amarre masivo y Auditar amarre

- **Ruta UI:** `/router`, iconos "Aplicar amarre masivo" (enlace, morado) y "Auditar amarre (IP real vía ONU)" (fact_check). Solo si el router tiene "Seguridad alterna" y el usuario tiene `reparar.router`.
- **Archivos:** FE `IndexPage.vue:277-302`, `components/AuditoriaAmarreModal.vue` · BE `mikrotik/mikrotik.controller.ts:65-100`, `mikrotik/mikrotik.service.ts:2868-3322`.
- **A. Aplicar amarre masivo**
  - Diálogo: título "Aplicar amarre masivo"; "¿Aplicar amarre a todos los clientes conectados de <b><router></b>? Solo se procesarán clientes activos que estén online en este momento." (OK "Aplicar", Cancelar); loading "Aplicando amarre en <router>, por favor espere..."; resultado "Amarre aplicado: <n> clientes. Sin conexión: <n>. Errores: <n>."; error "Error al aplicar amarre masivo".
  - Backend `POST /mikrotik/aplicar-amarre-masivo/:id` ✅ `:2900-2979`: lee **una vez** la tabla ARP (y los leases DHCP si el modo es "+ DHCP Leases"); para cada servicio `deleted=false` **no PPPoE** (activo **o suspendido**) toma la MAC del lease (si hay) o de ARP (descarta `00:00:00:00:00:00`); sin MAC → cuenta como "Sin conexión"; con MAC → crea/actualiza ARP estático (+ lease estático) **y guarda `mac_address` en BD**.
  - **Contradicción texto/código:** el diálogo promete "solo clientes activos", pero no se filtra por `isActive` (se amarran también suspendidos) ✅.
  - Riesgo: la MAC que haya en ARP en ese instante queda fijada; si en esa IP hay un equipo equivocado, se bloquea el equivocado ❓.
- **B. Auditar amarre** (modal "Auditoría de amarre — <router>")
  - Texto inicial: "La auditoría consulta la MAC real de cada cliente vía su ONU vinculada, busca esa MAC en el MikroTik (leases/ARP) para conocer la IP real, y la compara con la IP del sistema. Solo detecta: ninguna corrección se aplica hasta que tú la acciones." Botón "Iniciar auditoría".
  - Backend ✅ `:2993-3208`: `POST /mikrotik/auditoria-amarre/:id` arranca un proceso en segundo plano (estado en Redis `auditoria-amarre:<id>`, TTL 2 h); `GET` devuelve progreso/resultado; `POST …/cancelar` corta y deja resultado parcial; `POST …/aplicar {correcciones:[{servicio_id,ip,mac}]}`.
  - Por cada servicio no PPPoE: pide a **SmartOLT** (`obtenerInfoCompleteOnu(sn)`) las MACs que ve la ONU (pausa 150 ms por ONU; si SmartOLT responde "rate limit" corta y marca `parcial` con `retry_after`); si no hay SN usa la `mac_address` guardada; busca la MAC en leases (prioridad) y ARP del router y compara la IP.
  - Estados de fila: `ok`, `ip_incorrecta`, `conflicto` (dos servicios reclaman la misma IP real, o la IP real la ocupa en el sistema otro servicio que no se corrige), `offline` ("El router no ve esta MAC ahora"), `sin_datos` ("La ONU no reporta MACs (¿equipo apagado?)"), `sin_onu` ("Sin ONU vinculada ni MAC guardada"), `corregido`.
  - Pestañas: "Por corregir (n)", "Conflictos (n)", "Correctos (n)", "No verificables (n)". Botones: "Cancelar y ver lo inspeccionado", "Re-ejecutar", "Corregir todos (n)" (aplica a lo filtrado por el buscador "Buscar cliente, IP o MAC"), "Corregir". Confirmación "Aplicar correcciones": "Se corregirán <n> servicio(s): se actualizará IPv4/MAC (y su red) en el sistema y se re-amarrará en el MikroTik (se libera el amarre de la IP vieja). ¿Continuar?".
  - **Aplicar correcciones**: libera ARP/lease de la IP vieja, amarra IP+MAC correctas y actualiza en BD `ipv4`, `mac_address` y `red_id` (la red del router cuyo rango contiene la IP) ✅ `:3229-3322`. No vuelve a verificar duplicados de IP al aplicar.
- **Efectos externos:** MikroTik (ARP/DHCP), SmartOLT (consultas de ONU, límite horario de su API).
- **Casos límite:** la auditoría usa SmartOLT para **todo** servicio con SN (no distingue AdminOLT) ✅ `:3095-3101`; tras un traslado de red (RED-017) el propio modal advierte no auditar hasta que los equipos tomen la IP nueva.
- **Preguntas probables:** ¿Qué hace el amarre masivo? · ¿Por qué "Sin conexión" si el cliente tiene internet? (no está en ARP/lease en ese momento) · ¿Es seguro "Corregir todos"? · ¿Para qué sirve la auditoría? · ¿Qué es un conflicto? · ¿Por qué se detiene con "límite de consultas por hora de la API SmartOLT"?
- **Pendiente de validar en UI:** ❓ aspecto de la tabla de resultados; ❓ cuánto tarda con ~1 000 ONU (150 ms + latencia SmartOLT por ONU).

---

## RED-012 · Clientes del router (modal + Excel)

- **Ruta UI:** `/router` → clic en la insignia de "Total Clientes" (tooltip "Ver clientes de este router"). Sin clave de permiso propia.
- **Archivos:** FE `routers/components/ClientesRouterModal.vue` · BE `router/router.controller.ts:38-61`, `router/router.service.ts:59-106`.
- **Contenido:** título "Clientes del router: <nombre>"; buscador "Buscar por nombre, documento o IP..." (servidor, debounce 400 ms); columnas `Cliente` (enlace "Ir al perfil del cliente" → `cliente.edit`), `Documento`, `IPv4`, `Plan`, `Estado` ("Activo"/"Inactivo"); paginación 10/20/50; vacío "Este router no tiene clientes."; botón "Excel" (tooltip "Descargar clientes del router en Excel").
- **Reglas:** servicios con `router_id` = router y `deleted=false`; filtro `ILIKE` sobre nombre, documento (texto) e IPv4; orden por nombre ✅. El Excel reutiliza `downloadExcelCustomers(router, con_clientes=true, estado 'Todos')`: mismo formato que "Exportar Clientes" (incluye columna "DEUDA TOTAL") ✅ `BE:router.service.ts:102-106`.
- **Mensajes:** "No se pudo generar el Excel".
- **Preguntas probables:** ¿Por qué el total no coincide con la pantalla de Clientes? (❓ el badge viene de `/dashboard/clientes-servicios`; la lista cuenta servicios no retirados) · ¿Puedo exportar los clientes de un solo router?
- **Pendiente de validar en UI:** ❓ diferencia entre el número del badge y el total de la tabla.

---

## RED-013 · Detección de router caído, auto-reparación y avisos

- **Ruta UI:** no hay pantalla propia: es un cron del backend; su resultado se ve en la columna "Versión RouterOS" de `/router` y en Slack. "Verificar conexión" (RED-006) lo dispara a mano.
- **Archivos:** BE `router/router-monitor.service.ts` (completo), `router/router.module.ts`, entidad `router.entity.ts:99-116`.
- **Cuándo corre:** `@Cron('*/5 * * * *')` (cada 5 min) con **advisory lock** de Postgres (`730551005`) para que solo una instancia ejecute el ciclo ✅ `:36,45-62`.
- **Algoritmo** ✅ `:55-162`:
  1. Toma routers con `isActive=true`. Chequea en lotes de 5 en paralelo: "conecta" = `obtenerVersionRouterOS` devuelve versión (v6: API puerto con timeout; v7: `GET /system/resource`).
  2. **Histéresis:** un fallo aislado solo incrementa `fallos_consecutivos`; se actúa al llegar a **2** (`UMBRAL_FALLOS`) ≈ 5–10 min.
  3. **Anti-tormenta:** si caen `≥ max(3, ceil(60 % del total))` routers a la vez, se trata como problema del servidor/upstream: se marca `online=false`/`caido_desde` sin reparar ni alertar uno a uno y se manda **un aviso general en cada ciclo** mientras dure la tormenta (no hay marca de "ya avisado").
  4. **Auto-reparación (solo v7):** `configurarRouterSSL` (regenera certificado/servicios/firewall si el REST no responde) y se vuelve a chequear. En v6 no se intenta nada.
  5. Si repara: `online=true`, `fallos=0`, aviso "auto-reparó". Si no: `online=false`, `caido_desde=now`, `slack_alertado=true` y aviso 🔴 (una sola vez por corte).
  6. Al recuperar: `online=true`, `ultimo_visto`, `version_ros` actualizada y, si hubo alerta, aviso ✅ con la duración ("12 min", "1 h 5 min").
- **Qué se notifica (textos de Slack, solo si existe la variable `URL_SLACK`; `CLIENTE` = nombre de la instalación):**
  - `⚠️ *<n>/<total> routers sin conexión* — <CLIENTE>` + "Posible problema de red del servidor o del upstream (no de cada router)."
  - `🔧 *<router>* (<ip>) había perdido conexión y se *auto-reparó* — <CLIENTE>`
  - `🔴 *<router>* (<ip>) *sin conexión* — <CLIENTE>` + "La auto-reparación no funcionó; requiere revisión manual."
  - `✅ *<router>* (<ip>) *recuperó conexión* tras <duración> — <CLIENTE>`
  - **No hay** notificación dentro de la app, correo ni WhatsApp por caída de router ✅ (el servicio no usa `NotificationsService`). La única señal en pantalla es la insignia naranja "Sin conexión" ("caído hace X"/"visto hace X").
- **Campos usados:** `online`, `ultimo_visto`, `caido_desde`, `fallos_consecutivos`, `slack_alertado`, `version_ros`.
- **Efectos secundarios externos:** lectura al MikroTik cada 5 min; en v7 caído: reconfiguración SSL (cert. `ispmax`, `www-ssl`, reglas "…-ISPMAX"); Slack.
- **Casos límite:** si `URL_SLACK` no está definida, un corte pasa sin ningún aviso; un router v6 caído nunca "se repara"; durante una caída masiva no se envían avisos de recuperación individuales (porque `slack_alertado` no se marcó) ✅ `:110-118,206-223`.
- **Preguntas probables:** ¿Cuánto tarda en marcar un router como caído? · ¿Quién me avisa cuando se cae un router? · ¿Qué es la auto-reparación y qué toca en mi MikroTik? · ¿Por qué un router v6 no se auto-repara? · ¿Por qué recibo el mismo aviso general cada 5 minutos cuando se caen muchos routers?
- **Pendiente de validar en UI:** ❓ que el canal Slack esté configurado en la instalación real (variable de entorno, no visible en la UI).


---

## RED-014 · Listado de Redes IPv4

- **Ruta UI / name:** `/redes-ipv4` · `index.red_ipv4` · menú Gestión de Red → "Redes IPv4" (`FE:layouts/SideBarMenu.vue:141-151`).
- **Archivos:** FE `redes-ipv4/IndexPage.vue`, `composables/useRedIpv4.js`, `components/{ClientesRedModal,TrasladarClientesModal,ModalCargarExcel}.vue` · BE `red-ipv4/red-ipv4.controller.ts`, `red-ipv4.service.ts`, `entities/red-ipv4.entity.ts`.
- **Para qué sirve:** administrar los **segmentos** (bloques de IPv4 + CIDR) de cada router, de los cuales se asigna IP a los clientes; ver su ocupación. ✅
- **Acceso:** `index.red_ipv4`. Cada acción valida su propia clave.
- **Secciones:** tabla "Redes IPv4" con selector "Router:" (opciones = `estadosStore.routers`, con "TODOS" si el usuario tiene más de un router; el valor elegido se **comparte** con Planes e IPv6 mediante `routerSelectedPlanes`), botón "Nuevo", menú Excel, selector "OCULTAR COLUMNAS", buscador "Buscar...".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Nuevo" (móvil: "+") | `/redes-ipv4/add` | `crear.red_ipv4` | — | |
| Menú Excel › "Importar Excel" | Modal "Carga masiva de redes" | sin clave | `POST /red-ipv4` por fila | RED-018 |
| Menú Excel › "Descargar Plantilla" | Descarga `plantilla.xlsx` | sin clave | `POST /red-ipv4/download-excel-router/false` | exige router elegido: "Debes elegir algún router" |
| Menú Excel › "Exportar Redes" | Descarga redes (todas si TODOS) | sin clave | `POST /red-ipv4/download-excel-router/true` | |
| Icono lupa (tooltip "Inspeccionar red: clientes y comprobar IPs libres por ping") o clic en la barra "Uso IPS" (tooltip "Ver clientes de esta red") | Modal RED-016 | sin clave | — | |
| Icono swap (tooltip "Trasladar los clientes de esta red a otra del mismo router") | Modal RED-017 | `editar.red_ipv4` | — | solo red activa |
| Icono lápiz | `/redes-ipv4/edit/:id?uso=<IPs usadas>` | `editar.red_ipv4` | — | solo red activa |
| Icono "x" / "✓" | Inactiva / activa | `activar.inactivar.red_ipv4` | `PATCH /red-ipv4/:id/:estado` | solo cambia el flag |
| Icono papelera (solo inactiva) | Elimina | `eliminar.red_ipv4` | `DELETE /red-ipv4/:id` | "Estas seguro de eliminar esta red IPv4?" |

- **Filtros y columnas:** `Nombre` (con cuadrito del color del mapa; tooltips "Sin color asignado (automático en el mapa)" / "Color en el mapa: <#hex>"), `Red`, `Uso IPS`, `CIDR` (solo el número), `Router`, `Estado`, `acciones` ✅ `FE:IndexPage.vue:33-41,379-396`. "Uso IPS": barra con `%` y "(<usadas> de <total>)"; color verde < 70 %, naranja 70–90 %, rojo ≥ 90 % ✅ `:29-31`.
- **Cómo se calcula "Uso IPS" (FE):** total = hosts − 2 (red y broadcast); /31 = 2; /32 = 1. Usadas = IPs de servicios del **mismo router** dentro del rango (según `GET /customers/get-ips/:router`) **+ 1 por el gateway** (solo CIDR ≤ 30) ✅ `:104-158`. (El backend usa un cálculo equivalente pero independiente en `ips-libres`.)
- **Estados posibles:** `isActive` "Activo"/"Inactivo". Al **crear** un servicio de cliente solo se ofrecen redes activas (`/red-ipv4/true`); al **editar** se incluyen inactivas ✅ `FE:clientes/components/ServicioInternet.vue:519-522`.
- **Reglas de negocio (backend):**
  - `GET /red-ipv4?routerId=…` lista las redes del router (más recientes primero); `GET /red-ipv4/true?routerId=…` solo activas ✅ `:747-757`.
  - `PATCH /red-ipv4/:id/:estado` solo actualiza `isActive` y devuelve `{ok, msg:'Actualizado Exitosamente'}` ✅ `:880-888`.
  - **Eliminar** = `softDelete` **sin comprobar clientes** (ni en backend ni en frontend; el FE solo muestra el botón con la red inactiva) ✅ `BE:red-ipv4.service.ts:1054-1063`. El mensaje "No es posible eliminar esta red, se encuentra en uso por uno o más servicios." solo aparecería ante violación de FK (no ocurre con borrado lógico).
- **Mensajes (texto exacto):** vacío "No se encontró ningun Resultado"; éxito de eliminar "Registro eliminado exitosamente"; error `error.response.data.message`.
- **Relaciones con otros módulos:** clientes (selector de red e IP), cajas NAP y mapa (color de la red), cobros ("Nota al cobrar"), cortes (lista de corte), PPPoE (gateway).
- **Casos límite y advertencias:**
  - Dos routers pueden tener redes con el **mismo rango**; el conteo FE ya filtra por router. El solapamiento se valida solo **dentro** del mismo router (RED-015).
  - Con un único router (sin "TODOS") la carga depende de que `routerSelectedPlanes` ya apunte a él (lo fija el login/MainLayout) ✅ `FE:layouts/MainLayout.vue:437-438`.
  - El manual actual afirma que no se puede eliminar una red con clientes: en código no existe esa validación (H-07).
- **Preguntas probables:** ¿Por qué mi red no aparece? (selector Router) · ¿Qué significa el porcentaje "Uso IPS"? · ¿Puedo borrar una red con clientes? · ¿Por qué solo puedo eliminar redes inactivas? · ¿Qué es el cuadrito de color?
- **Pendiente de validar en UI:** ❓ orden de columnas ocultas persistido (`authUserStore.visibleColumnsRedes`); ❓ qué ocurre en la UI con clientes cuya red fue eliminada.

---

## RED-015 · Alta y edición de Red IPv4 (segmento)

- **Ruta UI / name:** `/redes-ipv4/add` · `crear.red_ipv4` ("Nueva Red IPv4"; migas "Inicio" › "Redes" › "Nuevo"); `/redes-ipv4/edit/:id` · `editar.red_ipv4` ("Editar Red IPv4").
- **Archivos:** FE `redes-ipv4/{AddPage,EditPage}.vue`, `components/FormRedIpv4.vue`, `composables/useRedIpv4.js` · BE `red-ipv4/red-ipv4.controller.ts:15-18,149-152`, `red-ipv4.service.ts:128-144,719-745,999-1052`, `dto/create-red-ipv4.dto.ts`.
- **Para qué sirve:** definir un bloque IPv4 de un router; fija gateway, broadcast, lista de corte, color y nota de cobro de los clientes que caen en él. ✅
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Nombre:" (placeholder "NOMBRE DE RED") | texto | Sí | se envía en MAYÚSCULAS | |
| "Router:" | select (`routerSinTodos`) | Sí | UUID de router | En edición **se puede cambiar**: mueve servicios, planes y cajas NAP (RED-010) |
| "Red:" | texto, solo `[0-9.]` | Sí | hint "Ejm: 192.168.0.0"; al completar 4 octetos muestra "IP Privada"/"IP Publica"; deshabilitado si la red ya tiene > 1 IP usada (`?uso>1`) | BE: IPv4 válida ("La red ingresada no es una dirección IPv4 válida") |
| "CIDR:" | select agrupado "CLASE A / B / C" | Sí | solo editable cuando se ha tecleado una "Red" de 4 octetos (el bloqueo `allowSelectCIDR` solo cambia al teclear en "Red": en edición permanece de solo lectura mientras no se toque ese campo); las clases habilitadas dependen de la IP (10.x → A/B/C; 172.16–31 → B/C; 192.168 → C; públicas por primer octeto); valor guardado = texto completo p. ej. `24 (255.255.255.0/24 - 254 hosts, 256 IP)` | BE: debe estar entre 1 y 32 ("El CIDR de la red no es válido") |
| "Gateway:" | texto | No (se autocalcula) | al elegir red+CIDR se rellena con **red + 1**; valida IPv4 dentro del rango ("IP no válida" / "IP fuera del rango de la red (a - b)") | Si queda vacío (redes antiguas) el backend usa red+1 para CIDR ≤ 30 (`gatewayEfectivoRed`) |
| "Broadcast:" | texto | No | autocalculado = última IP del rango | |
| "Lista de corte:" (placeholder "Impagos (por defecto)") | texto, máx. 50 | No | `^[A-Za-z0-9_.-]+$` ("Solo letras, números, punto, guion y guion bajo (sin espacios)"); hint "Address-list de Mikrotik para los cortes de esta red. Vacío = Impagos." | RED-019 |
| "Color en el mapa:" (en "Personalización (opcional)") | texto + selector | No | `#RRGGBB`; hint "Color de los clientes de esta red en el mapa NAP. Vacío = automático." | |
| "Nota al cobrar:" | área, máx. 500 | No | hint "Se precarga en el campo Notas al registrar un pago de un servicio de esta red. Útil para diferenciar, por ejemplo, los abonados de TV."; chips de variables `{mes}`, `{mes_mayus}`, `{anio}`, `{mes_anio}`, `{cliente}`, `{plan}`, `{n_factura}` | Vacío = nota general de Facturación |
| (oculto) `tipo_uso` | — | — | siempre `"Estatico"`; sin ninguna otra lectura en el sistema | campo vestigial |

  Botones: "Regresar", "Guardar Cambios". Campos obligatorios en FE: nombre, router, cidr, red ("Debes completar este campo") ✅ `FE:useRedIpv4.js:40,65-77`.

- **Reglas de negocio (backend):**
  - `create`: CIDR 1–32; **no solapar** con otra red del mismo router (dos prefijos se solapan si comparten los primeros min(cidr₁,cidr₂) bits): "La red <red>/<cidr> se solapa con la red existente "<nombre>" (<red>/<cidr>) en el mismo router" ✅ `:128-144,719-745`.
  - `update`: si cambian `gateway`/`broadcast`, no pueden coincidir con la IP de un servicio de la red ("La IP <ip> ingresada en gateway|broadcast ya está asignada a un cliente."); revalida solapamiento si cambian red/cidr/router; si cambia el router mueve servicios (RED-010); si cambia `lista_corte` mueve suspendidos (RED-019) ✅ `:999-1052`.
  - DTO: `nombre`, `red`, `cidr`, `tipo_uso` requeridos; `lista_corte` máx. 50 + regex; `color` `^(#[0-9A-Fa-f]{6})?$`; `nota_pago` máx. 500 ✅ `BE:dto/create-red-ipv4.dto.ts`.
- **Mensajes (texto exacto):** éxito **"Router agregado exitosamente"** / **"Router editado exitosamente"** (el texto dice "Router" aunque es una red) ✅ `FE:useRedIpv4.js:135`; error `error.response.data.message`. Mensajes de validación del DTO: "La lista de corte no puede superar los 50 caracteres", "La lista de corte solo admite letras, números, punto, guion y guion bajo (sin espacios)", "El color debe ser hexadecimal, por ejemplo #1976D2", "La nota no puede superar los 500 caracteres".
- **Qué representa un segmento y cómo se asigna IP a un cliente** (flujo en `ServicioInternet.vue`, módulo clientes) ✅ `:458-665`:
  1. El formulario del servicio pide el router y lista las redes **activas** de ese router.
  2. Redes ≤ /24 se parten en bloques /24 (opción "A.B.C.0 (<n> Ips disponibles) <NOMBRE>"); redes /25–/32 se muestran enteras ("<red>/<cidr> (<n> Ips disponibles) <NOMBRE>").
  3. La lista de IPs excluye: terminadas en `.0`, la gateway y el broadcast (los configurados; si no hay, la primera y última del bloque), y todas las IPs de servicios no retirados del router (`GET /customers/get-ips/:router`).
  4. En alta se **preselecciona la primera IP libre**.
  5. El backend **no valida duplicados de IP** en altas manuales: solo en importación por Excel ("ya existe un cliente con esta ipv4: …") ✅ `BE:customers/customers.service.ts:268-279`.
- **Efectos secundarios externos:** crear/editar la red no toca el MikroTik, salvo: cambio de `lista_corte` (RED-019) y cambio de router (solo BD).
- **Casos límite:**
  - La red de un cliente se determina por `red_id`; el uso/listado de clientes de la red, por rango de IP. Si una IP del cliente queda fuera del rango, no aparece en "Clientes" de la red ✅.
  - Las etiquetas del CIDR muestran la máscara con "/24" fija (p. ej. `255.255.255.128/24`) aunque el prefijo real sea otro: es solo texto ✅ `FE:FormRedIpv4.vue:40-84`.
  - En edición, el campo "Red" queda bloqueado cuando hay clientes (parámetro `uso>1` en la URL); un acceso directo sin ese parámetro lo deja editable ❓.
- **Preguntas probables:** ¿Qué pongo en "Lista de corte"? · ¿Para qué sirve el Gateway? (es el `local-address` de los PPPoE) · ¿Por qué no puedo cambiar la Red? · ¿Puedo crear dos redes iguales en routers distintos? (sí) · ¿Qué hace "Nota al cobrar"? · ¿Qué es "Color en el mapa"?
- **Pendiente de validar en UI:** ❓ comportamiento de los selects de CIDR al editar una red /25–/32; ❓ validación `lazy-rules` de Gateway/Broadcast al guardar.

---

## RED-016 · Inspeccionar red IPv4: clientes, IPs libres, ping y Excel

- **Ruta UI:** `/redes-ipv4` → icono lupa / barra "Uso IPS". Sin clave propia.
- **Archivos:** FE `redes-ipv4/components/ClientesRedModal.vue` · BE `red-ipv4.controller.ts:79-117`, `red-ipv4.service.ts:52-75,151-209,777-878`, `monitoreo-dispositivos/monitoreo-dispositivos-collector.service.ts:222-289`.
- **Secciones:** cabecera "Red <nombre> <red>/<cidr>"; pestañas "Clientes" e "IPs libres".
- **Pestaña "Clientes":** tabla paginada en servidor (`GET /red-ipv4/:id/clientes?page&limit&filter`), columnas `Cliente` (enlace "Ir al perfil del cliente"), `IPv4`, `Plan`, `Estado` ("Activo"/"Suspendido"), `Ping`; botones "Probar conexión" (tooltip "Hace ping (ICMP y, si no responde, ARP) a las IPs de esta página"), "Excel" (tooltip "Descargar clientes de esta red en Excel"), buscador "Buscar...". Vacío: "Esta red no tiene clientes con IPv4 en su rango".
- **Pestaña "IPs libres":** "<n> IPs libres de <m> usables" (y "— mostrando las primeras <k>"; el FE pide 100); botón "Comprobar si están en uso" (muestra "Comprobando x/y…"); columnas `IP libre`, `Ping`, copiar (toast "IP <ip> copiada al portapapeles"); aviso naranja "<n> IP(s) marcadas como libres sí responden: hay equipos usándolas que no están registrados en el sistema."; insignias "En uso · <ms> ms" / "En uso" / "Libre" / "Sin comprobar"; si no hay: "Esta red no tiene IPs disponibles".
- **Reglas de negocio (backend):**
  - Clientes: servicios `deleted=false` del **router de la red** con `ipv4 <<= red/cidr` (cast seguro a `inet`), ordenados por IP ✅.
  - IPs libres: rango usable (CIDR ≤ 30 excluye red y broadcast; /31 y /32 no) menos IPs de servicios, gateway y broadcast; si la red no tiene gateway definido se reserva la primera usable ✅ `:166-209`.
  - Ping: `POST /red-ipv4/:id/ping {ips}` — máx. **256** IPs por llamada (el FE envía de a 15); se ejecuta **desde el router de la red** (ICMP 2 paquetes y, si no responde, ARP) y devuelve `online`, `latencia_ms`, `perdida_pct`, `metodo` (`icmp`/`arp`) ✅.
  - Excel: servicios del rango (activos y suspendidos; retirados excluidos) con `downloadExcelCustomers`; archivo `clientes_<nombre>.xlsx` ✅.
- **Efectos externos:** el ping genera tráfico ICMP/ARP desde el MikroTik; el resto es lectura de BD.
- **Mensajes:** "No se recibió ninguna IP para comprobar", "Máximo 256 IPs por consulta", "La red no tiene un router asociado con acceso API", "No se pudo conectar al router para hacer el ping: <motivo>", "No se pudo completar la comprobación", "No se pudo generar el Excel"; tooltips de ping "Responde solo por ARP (el equipo filtra ICMP)" / "Detectada por ARP (el equipo filtra ICMP)".
- **Preguntas probables:** ¿Cómo sé qué IPs están realmente libres? · ¿Por qué una IP "libre" responde ping? · ¿Desde dónde sale el ping? · ¿Por qué el ping solo prueba 10 clientes? (página actual) · ¿Se pueden exportar los clientes de una red?
- **Pendiente de validar en UI:** ❓ tiempos de la comprobación de 100 IPs; ❓ si el botón "Probar conexión" se limita a la página visible.

---

## RED-017 · Trasladar clientes entre redes IPv4 (mismo router)

- **Ruta UI:** `/redes-ipv4` → icono swap (tooltip "Trasladar los clientes de esta red a otra del mismo router"). Permiso `editar.red_ipv4`.
- **Archivos:** FE `redes-ipv4/components/TrasladarClientesModal.vue` · BE `red-ipv4.controller.ts:33-72`, `red-ipv4.service.ts:211-693`, `entities/migracion-red-log.entity.ts`.
- **Para qué sirve:** cambiar a todos los clientes de una red a otra red del mismo router (cambio de IP masivo con reversión). ✅
- **Pantalla:** cabecera "Trasladar clientes de <nombre> (<red>/<cidr>)"; "Red destino" (hint "Solo se listan redes del mismo router" / "Este router no tiene otra red IPv4 a la que trasladar"); botón "Previsualizar"; aviso "Previsualizar solo calcula y muestra el resultado. No modifica ningún cliente."; chips `Clientes`, `Se trasladan`, `Sin IP`, `Misma posición`, `Libres después`; tabla `Cliente`, `IP actual`, `IP propuesta`, `Detalle` ("Conserva el mismo final" u otro motivo), buscador "Buscar cliente o IP"; botón "Trasladar <n> cliente(s)"; sección "Traslados anteriores (<n>)" con "Revertir" / chip "Revertido".
- **Reglas de negocio (backend)** ✅:
  1. **Previsualizar** (`POST /red-ipv4/migrar-clientes/previsualizar`): exige redes distintas y del **mismo router** ("La red de origen y la de destino son la misma"; "Solo se pueden trasladar clientes entre redes del mismo router"). Para cada servicio de la red origen propone la IP con **el mismo desplazamiento** dentro del destino si cabe y está libre ("Conserva el mismo final"); si no, la primera libre, con motivo: "Su IP actual no pertenece a <origen>; se le asigna la primera libre" / "La IP equivalente (<ip>) ya está ocupada en <destino>" / "La red destino es más chica y no tiene esa posición". Sin IPv4 válida: "El servicio no tiene una IPv4 válida asignada"; sin lugar: "No quedan IPs libres en la red destino".
  2. **Ejecutar** (`POST /red-ipv4/migrar-clientes`): recalcula la previa; solo **un** traslado/reversión por router a la vez ("Ya hay un traslado en proceso para este router"); si nada es trasladable: "No hay ningún cliente que se pueda trasladar a <destino>". Corre en segundo plano (estado en Redis `migracion-red:<router>`, 1 h); el FE consulta cada 1,5 s ("Trasladando x de y…", "No cierres esta ventana hasta que termine.").
  3. Por cada cliente: actualiza BD (`ipv4`, `red_id`) y luego aplica en el MikroTik con la misma rutina de edición de servicio (cola simple → nuevo target/nombre; secret PPPoE → `remote-address`; limpia la IP vieja de las address-list; PCQ → mueve la membresía). Los errores se acumulan por cliente.
  4. Al final: **desconecta las sesiones PPPoE** de los trasladados (para que tomen la IP nueva) y **reinscribe en la lista de corte de la red destino** a los suspendidos con su IP nueva; guarda `migracion_red_log` (solo si hubo ≥ 1) con el usuario que lo hizo.
  5. **Revertir** (`POST /red-ipv4/migrar-clientes/:log_id/revertir`): devuelve a cada cliente a su `ipv4_anterior` y a la red origen, con el mismo proceso en segundo plano; no valida que la IP anterior siga libre. Errores: "No se encontró ese traslado", "Ese traslado ya fue revertido", "Ya hay una operación en proceso para este router".
- **Mensajes/avisos en pantalla (textos exactos):** al terminar "Traslado terminado: <n> cliente(s)" / "Reversión terminada: <n> cliente(s)"; resultado "Se trasladaron <n> cliente(s) a <destino>." (+ "Se reiniciaron <n> sesión(es) PPPoE." / "<n> suspendido(s) quedaron bloqueados con su IP nueva."); aviso naranja **"Ahora entrá a Routers → Reparar ese router: corrige el gateway (local-address) de los secrets PPPoE, que sigue apuntando a la red anterior."** y **"No corras la auditoría de amarre hasta que los equipos hayan tomado la IP nueva: corrige el sistema con lo que ve en el router y te revertiría el traslado."**; si hubo fallos: "<n> cliente(s) quedaron con la IP cambiada en el sistema pero fallaron en el MikroTik. Se arreglan con Reparar". Antes de ejecutar, diálogo "Confirmar traslado" con avisos sobre clientes no PPPoE ("se quedan sin servicio hasta reconfigurarlo" si tienen IP fija en el CPE).
- **Efectos externos:** MikroTik (colas, listas, secrets, sesiones PPPoE), no toca ONU.
- **Casos límite y advertencias:**
  - La edición de servicio que usa el traslado limpia la IP vieja pero **no** agrega la IP nueva a la "Addresslist" del plan ni cambia ARP/lease estáticos por la nueva IP: eso lo completa un "Reparar" ✅ `BE:mikrotik.service.ts:1127-1162` ❓ (efecto observable en equipo).
  - Los clientes no PPPoE con IP fija en el CPE quedan sin servicio hasta reconfigurarlos.
  - Un router v7 caído hace fallar el aplicado por cliente (quedan con BD cambiada y MikroTik sin cambiar).
- **Preguntas probables:** ¿Qué pasa con los clientes que tienen IP fija? · ¿Puedo trasladar solo algunos clientes? (no) · ¿Puedo deshacerlo? (sí, "Revertir") · ¿Por qué debo reparar el router después? · ¿Por qué algunos clientes "se quedan donde están"?
- **Pendiente de validar en UI:** ❓ comportamiento visual al cerrar el modal con el traslado en curso; ❓ cuánto tarda con ~200 clientes.

---

## RED-018 · Excel de redes IPv4: plantilla, importar y exportar

- **Ruta UI:** `/redes-ipv4` → menú Excel. Sin clave de permiso propia.
- **Archivos:** FE `redes-ipv4/components/ModalCargarExcel.vue`, `composables/useRedIpv4.js:81-115` · BE `red-ipv4.service.ts:890-997`, `red-ipv4.controller.ts:127-142`.
- **Formato:** hoja `redes`; fila 1 título "PLANTILLA DE REDES IPV4" (combinada A1:E1); fila 2 cabeceras `NOMBRE`, `RED`, `CLASE`, `CIDR`, `ROUTER`; datos desde la fila 3. `CLASE` = A (CIDR 8–15), B (16–23) o C (resto), solo informativa. Lista desplegable de ROUTER (con el router elegido) en filas 3–199.
- **Importar ("Carga masiva de redes" › "Cargar redes"):** lee la 1.ª hoja del primer archivo, filas desde el índice 2; arma `{nombre, red, cidr, router_id, tipo_uso:'Estatico'}` y envía `POST /red-ipv4` **una por una**; lista de resultados con filtro "Correctas (n)" / "todos (n)" / "Errores (n)" y tooltip con el mensaje de error de cada fila ✅ `FE:ModalCargarExcel.vue:69-168`.
- **Particularidades de la importación (código):**
  - El router se resuelve **una sola vez** (`hasRouterId`) con la primera fila que lo trae: todas las filas del archivo se importan en ese mismo router, aunque la columna ROUTER diga otro ✅ `:94-98`. `GET /router/find-router-by-name/:nombre` busca por nombre exacto.
  - Las celdas numéricas no cuentan como valor (`element[i]?.length > 0`): si CIDR se teclea como número (24) la fila se omite en silencio ✅ `:90-92` ❓ (depende de cómo Excel guarde la celda).
  - Filas con campos faltantes se omiten sin aviso; no se calculan gateway/broadcast (el backend los deriva al usarlos).
  - Todas las validaciones del alta (CIDR, solapamiento) se aplican por fila y aparecen como "Errores".
- **Exportar Redes:** `with_data=true` incluye nombre, red, clase, CIDR (texto completo), router; sin router elegido exporta todas.
- **Mensajes:** "Debes elegir algún router" (plantilla sin router), "Debes completar este campo", "Debes subir un archivo excel".
- **Pendiente de validar en UI:** ❓ los dos puntos marcados arriba (router único / CIDR numérico).

---

## RED-019 · Lista de corte por red y mecanismo de corte en MikroTik ("tipo de corte")

- **Ruta UI:** `/redes-ipv4/add|edit/:id` → "Lista de corte:". El resto del mecanismo es automático.
- **Archivos:** BE `red-ipv4.service.ts:81-126`, `mikrotik/mikrotik.service.ts:1217-1554`, `mikrotik-resources.service.ts:1406-1936`, `common/utils/onu-corte.utils.ts`.
- **Para qué sirve:** elegir el nombre de la address-list de MikroTik donde se coloca a los clientes **suspendidos** de esa red (por defecto `Impagos`). ✅
- **Cómo se materializa el corte (único mecanismo de red encontrado):**
  1. Se asegura (crea y sube al primer lugar) la regla **RAW** `drop` sobre `src-address-list=<lista>` en `prerouting` (IPv4 y, si existe, IPv6) — RED-008 §B.
  2. La IPv4 (e IPv6) del servicio suspendido se agrega a esa lista con comentario = nombre del cliente; se retira de la lista del plan ("Addresslist", solo en servicios no PPPoE). Reactivar hace lo inverso (y vuelve a poner la IP en la lista del plan).
  3. Servicios PPPoE: además se **deshabilita el secret** (la sesión viva no cae por eso; el bloqueo efectivo lo da la lista).
  4. Si el router tiene el canal OLT activo en su configuración de cortes: **deshabilita la ONU** en SmartOLT/AdminOLT (RED-029).
  - **No existe** redirección a una página de aviso ni limitación de velocidad como "tipo de corte": es bloqueo total por IP ✅ (sin `dst-nat/redirect/hotspot` en el código del dominio).
- **Reglas al cambiar la lista de una red existente** ✅ `BE:red-ipv4.service.ts:81-126`: si el valor normalizado (vacío ≡ `Impagos`) cambió, se buscan los servicios **suspendidos** (`isActive=false`, `deleted=false`) de la red con IP y se **mueven** de la lista vieja a la nueva (IPv4+IPv6), asegurando antes la regla de la nueva; si la lista vieja ya no la usa **ninguna otra red del mismo router** y no es `Impagos`, se elimina su regla RAW. Es *best effort*: un fallo se escribe en el log y **no** impide guardar la red.
- **Casos límite:**
  - Cada red puede tener su propia lista: un router puede tener varias reglas RAW de corte (una por lista).
  - Un nombre de lista con espacios o símbolos se rechaza (DTO y FE) para no romper la regla del firewall.
  - Los clientes **activos** no se tocan al cambiar la lista (solo los suspendidos).
- **Preguntas probables:** ¿Qué es "Impagos"? · ¿Puedo tener otra lista para un barrio? · ¿Por qué un cliente cortado sigue navegando? (regla RAW ausente/ordenada o lista distinta) · ¿El corte redirige a una página de pago? (no).
- **Pendiente de validar en UI:** ❓ si existe alguna redirección configurada fuera de ISPMAX en instalaciones reales (no la crea ISPMAX).


---

## RED-020 · Listado de Redes IPv6

- **Ruta UI / name:** `/redes-ipv6` · `redesIpv6.index` · menú Gestión de Red → "Redes IPv6".
- **Archivos:** FE `redes-ipv6/IndexPage.vue`, `composables/useRedIpv6.js`, `components/{ClientesRedModal,ModalCargarExcel}.vue` · BE `red-ipv6/red-ipv6.controller.ts`, `red-ipv6.service.ts`, `dto/*.ts`, `entities/red-ipv6.entity.ts`.
- **Para qué sirve:** administrar los prefijos IPv6 de cada router y sus subredes entregadas a clientes. ✅
- **Acceso:** `redesIpv6.index`.
- **Secciones:** tabla "Redes IPv6" paginada en servidor; filtros "Router:" (comparte `routerSelectedPlanes`) y "Estado:" (`Todos` / `Activos` / `Inactivos`); "Nuevo", menú Excel, "OCULTAR COLUMNAS", buscador "Buscar...".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Nuevo" | `/redes-ipv6/add` | `crear.red_ipv6` | — | |
| Menú Excel › "Importar Excel" / "Descargar Plantilla" / "Exportar Redes" | RED-022 | sin clave | `POST /red-ipv6/download-excel-router/:con_datos` | plantilla exige router: "Debes elegir algún router" |
| Barra "Uso Subredes" (tooltip "Ver clientes de esta red") | Modal RED-022 | sin clave | — | |
| Icono lápiz (tooltip "Editar Red ipv6") | `/redes-ipv6/edit/:id` | `redesIpv6.edit` | — | solo red activa |
| Icono papelera (tooltip "Eliminar Red") | diálogo "¿Deseas eliminar la red <nombre>?" (OK "Eliminar") | `eliminar.red_ipv6` | `GET /red-ipv6/existe-ip-creadas` y `DELETE /red-ipv6/:id` | solo red **inactiva** |
| Icono bloquear/check (tooltip "Inactivar Red" / "Activar Red") | alterna `isActive` | `activar.inactivar.red_ipv6` | `PATCH /red-ipv6/:id {isActive}` | |

- **Filtros y columnas:** `Nombre`, `Red`, `Mascara`, `Subred`, `Uso Subredes`, `Router`, `Estado`, `acciones` ✅ `FE:IndexPage.vue:33-42`. Filtro servidor: nombre, red, máscara, subred o nombre de router (`ILIKE`) ✅ `BE:red-ipv6.service.ts:78-116`.
- **"Uso Subredes":** `usados` = cantidad de subredes `/subred` **distintas** que contienen alguna IPv6 de servicios no retirados del router y dentro del prefijo; `total = 2^(subred − máscara)`. Dos clientes dentro de la misma subred cuentan 1 ✅ `BE:133-149`. Colores como en IPv4 (70/90 %).
- **Estados:** `isActive`. Retirada = `deleted_at`.
- **Reglas de negocio (backend):** el borrado (`DELETE /red-ipv6/:id`) es `softDelete` **sin verificar clientes en backend**; la verificación existe solo en el FE: antes de borrar consulta `GET /red-ipv6/existe-ip-creadas?red_id` (true si algún servicio del router tiene una IPv6 dentro del prefijo) ✅ `BE:370-383,504-512`, `FE:81-101`.
- **Mensajes (texto exacto):** "No es posible borrar la red, porque tiene clientes activos"; "Red Eliminada"; error `message` o "Fallo al eliminar la red". Al activar/inactivar con error el FE llama `mostrarNotify("Fallo al activar|inactivar la red", error.message)` con los **argumentos invertidos** (tipo ← texto, mensaje ← detalle del error) ✅ `FE:72-79`.
- **Casos límite:** la tabla recarga con `estadosStore.paginationRedIpv6.page` aunque cambie el filtro; con `limit=0` el backend devuelve sin paginar ✅.
- **Preguntas probables:** ¿Qué significa "Uso Subredes"? · ¿Por qué no puedo eliminar la red? · ¿Puedo ver qué clientes usan el prefijo? · ¿Qué diferencia hay entre Máscara y Subred?
- **Pendiente de validar en UI:** ❓ toast real al fallar activar/inactivar (por el bug de argumentos); ❓ columna "Router" cuando el router fue eliminado (`props.row.router.nombre` sin comprobación).

---

## RED-021 · Alta y edición de Red IPv6

- **Ruta UI / name:** `/redes-ipv6/add` · `crear.red_ipv6` ("Nueva Red IPv6"); `/redes-ipv6/edit/:id` · `redesIpv6.edit` ("Editar Red IPv6").
- **Archivos:** FE `redes-ipv6/{AddPage,EditPage}.vue`, `components/FormRedIpv6.vue`, `composables/useRedIpv6.js` · BE `red-ipv6.controller.ts:14-17,80-86`, `red-ipv6.service.ts:25-76,475-502`, `dto/create-red-ipv6.dto.ts`.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Nombre de la red:" | texto | Sí | BE: se guarda en MAYÚSCULAS | |
| "Router:" | select | Sí | UUID | deshabilitado en edición si la red ya tiene clientes |
| "RED:" (placeholder "Ej: abc2:34fd:cdb1::") | texto | Sí | BE: `@IsIP("6")` máx. 39: "El campo red debe ser una dirección IPv6 válida (ej: 2803:2540:1c:: o 2803:2540:1c::2b)" | `debounce="15000"`: el valor del modelo (y por tanto el autoajuste) tarda 15 s o hasta salir del campo ❓ |
| "Máscara:" | select 1–128 | Sí | BE `@IsPositive` | al elegir, "Subred" se iguala y su lista se limita a ≥ máscara |
| "Subred:" | select ≥ máscara | Sí | BE: "La subred no puede ser menor que la máscara de la red" | al teclear una red nueva (solo alta): máscara 48 y subred 64 por defecto |

- **Reglas de negocio (backend):** no solapar con otra red IPv6 del **mismo router** (comparten los primeros min(máscaras) bits): "La red <red>/<máscara> se solapa con la red existente "<nombre>" (<red>/<máscara>) en el mismo router" ✅ `:46-76`; en edición se revalida si se envía red/máscara/subred/router (el FE los manda siempre) ✅ `:481-495`. Fallo genérico al guardar: "Fallo al guardar la red ipv6".
- **Edición con clientes:** si `existe-ip-creadas` es true, el FE bloquea router, red, máscara y subred (solo se puede cambiar el nombre) ✅ `FE:EditPage.vue:13-20`; el backend **no** lo impone.
- **Mensajes:** éxito "Red ipv6 agregado exitosamente" / "Red ipv6 editado exitosamente"; error `message` o "No se logró agregar la red"; si el primer mensaje contiene "dirección IPv6" marca el campo RED con error.
- **Efectos externos:** ninguno en MikroTik al guardar. La IPv6 de cada cliente se añade a su cola (target `…/128`) y a listas (Addresslist del plan / lista de corte) cuando el servicio se crea o se repara el router, y solo si el router tiene el paquete `ipv6` habilitado; en v6 sin el paquete, crear la cola con IPv6 falla con "El router no tiene instalado el paquete ipv6." ✅ `BE:mikrotik.service.ts:504-512`.
- **Relaciones:** formulario de servicio del cliente (selección de subred libre), Excel de clientes (la columna opcional "IPv6" solo aparece si el router tiene redes IPv6 **activas**) ✅ `BE:mikrotik.service.ts:1813-1823`, PCQ (**excluye IPv6**).
- **Preguntas probables:** ¿Qué pongo en Máscara y en Subred? (p. ej. /48 y /64) · ¿Por qué no puedo cambiar el prefijo? · ¿Puedo tener el mismo prefijo en dos routers? (sí) · ¿Se configura algo en el MikroTik al crear la red? (no).
- **Pendiente de validar en UI:** ❓ el retardo de 15 s en "RED"; ❓ mensajes al guardar con máscara > 128 (el select limita a 128).

---

## RED-022 · Inspección IPv6 (clientes, subredes libres) y Excel IPv6

- **Ruta UI:** `/redes-ipv6` → barra "Uso Subredes". Sin clave propia.
- **Archivos:** FE `redes-ipv6/components/{ClientesRedModal,ModalCargarExcel}.vue` · BE `red-ipv6.service.ts:164-299,385-473`.
- **Modal:** cabecera "Red <nombre> <red>/<máscara>"; pestañas "Clientes" y "Subredes /<subred> libres". Clientes: columnas `Cliente`, `IPv6`, `IPv4`, `Plan`, `Estado` ("Activo"/"Suspendido"); vacío "Esta red no tiene clientes con IPv6 asignada"; botón "Excel" (`GET /red-ipv6/:id/exportar-excel`, descarga `clientes_<nombre>.xlsx`). Subredes libres: "<n> subredes libres de <total>" (muestra las primeras 20; "clic en una subred para copiarla"; toast "Subred <x> copiada al portapapeles"); vacío "Esta red no tiene subredes disponibles".
- **Reglas:** libres = subredes `/subred` desde el inicio del prefijo que ningún servicio del router ocupa (primeras `limit`, por defecto 20); el formato mostrado es `<primeros grupos>::/<subred>` ✅ `:241-299`. El filtro de clientes se evalúa en JS con `ipaddr.js` (sin paginación).
- **Excel IPv6:** hoja `redes`, título "PLANTILLA DE REDES IPV6", cabeceras `NOMBRE`, `RED`, `MASCARA`, `SUBRED`, `ROUTER`, datos desde la fila 3 ✅ `:390-473`. Importación "Carga masiva de redes IPv6" › "Cargar redes": mismo patrón que IPv4 (envía `POST /red-ipv6` una por una; resultado "Correctas/todos/Errores"); acepta celdas numéricas (usa `tieneValor`) pero **resuelve el router una sola vez** (`hasRouterId`) igual que IPv4 ✅ `FE:ModalCargarExcel.vue:68-113,167-171`. Errores de array se unen con ", ".
- **Preguntas probables:** ¿Cómo sé qué subred /64 asignar al siguiente cliente? · ¿Por qué mi IPv6 no aparece en la red? (no cae dentro del prefijo/ router distinto) · ¿Puedo importar muchas redes por Excel?
- **Pendiente de validar en UI:** ❓ rendimiento con prefijos /32 (gran cantidad de subredes; el backend limita a `usadas + limit` iteraciones).

---

## RED-023 · Listado de Planes de servicio ("Servicios de Internet")

- **Ruta UI / name:** `/servicios/internet` · `index.planes` · menú Gestión de Red → "Planes de servicio". Título de la tabla: **"Servicios de Internet"**.
- **Archivos:** FE `internet/IndexPage.vue`, `components/{ModalClientesPlan,ModalMigrarPlan,ModalCargarExcel}.vue`, `composables/useInternet.js` · BE `internet/internet.controller.ts`, `internet.service.ts`, `entities/internet.entity.ts`.
- **Para qué sirve:** catálogo de planes (velocidad + precio/impuestos) por router; es lo que se asigna a cada servicio de cliente. ✅
- **Acceso:** `index.planes`.
- **Secciones:** tabla con selector **"Por Router:"** (`estadosStore.routers`, con "TODOS"), "Nuevo", menú Excel, "OCULTAR COLUMNAS", "Buscar...".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Nuevo" | `/servicios/internert/add` (sic) | `crear.planes` | — | |
| Menú Excel (Importar / Descargar Plantilla / Exportar Planes) | RED-028 | sin clave | `POST /internet/download-excel/:con_datos` | |
| Cifras de "Suspendidos", "Activos", "Total" (enlace si > 0) | Modal "Clientes del plan" (RED-027) | sin clave | `GET /internet/clientes-por-plan/:nombre` | |
| Icono lápiz | `/servicios/internert/edit/:id` | `editar.planes` | — | solo plan activo |
| Icono swap (tooltip "Migrar clientes a otro plan") | Modal RED-026 | `editar.planes` | `PATCH /internet/migrar-clientes` | solo plan activo |
| Icono "x" / "✓" | Inactiva / activa **en todos los routers** | `activar.inactivar.planes` | `PATCH /internet/:id/:estado` | |
| Icono papelera (solo inactivo) | Elimina el plan en **todos** los routers | `eliminar.planes` | `DELETE /internet/eliminar-plan/:nombre` | "Estas seguro de eliminar este servicio de internet?" |

- **Filtros y columnas:** `Nombre`, `Descargar Mbps`, `Subida Mbps`, `Suspendidos`, `Activos`, `Total`, `Precio` (símbolo + `precio_plan`), `Estado`, `acciones` ✅ `FE:IndexPage.vue:11-51`.
- **Reglas de negocio (backend):** `GET /internet/planes-disponibles/:router_id?` ✅ `BE:internet.service.ts:89-138`:
  - Con router elegido: filas del router, **sin duplicados por nombre** (insensible a mayúsculas).
  - Con `TODOS` (`'null'`): agrupa filas por nombre (minúsculas) sumando `total/activos/suspendidos` y muestra los datos (precio, velocidad, estado, id) de la **primera fila** (más reciente).
  - Conteos: `total` = servicios con `deleted=false`; `activos` = `isActive`; `suspendidos` = `!isActive` (los retirados no cuentan).
- **Estados posibles:** `isActive` del plan (Activo/Inactivo); soft delete (`deleted_at`).
- **Mensajes:** "No se encontró ningun resultado"; errores de carga `message`.
- **Relaciones:** servicios de clientes (`perfil_internet`), routers, facturación (precio/IVA/ICE/descripcion/código), PPPoE (nombre = perfil PPP), PCQ (nombre → listas y objetos).
- **Casos límite:** si el mismo plan tiene precios distintos por router, en "TODOS" solo se ve uno; el id de la fila agrupada determina qué registro abre "editar".
- **Preguntas probables:** ¿Por qué el plan aparece una sola vez si tengo 3 routers? · ¿Qué diferencia hay entre Suspendidos e Inactivos? · ¿Por qué no puedo eliminar el plan? · ¿Cambiar el nombre afecta a los clientes?
- **Pendiente de validar en UI:** ❓ qué fila/ID abre "Editar" cuando "Por Router" = TODOS y los routers difieren.

---

## RED-024 · Alta y edición de plan (pestañas "Facturación" y "Parámetros Técnicos")

- **Ruta UI / name:** `/servicios/internert/add` · `crear.planes` (título "Nuevo Perfil"; migas "Inicio" › "Internet" › "Agregar"); `/servicios/internert/edit/:id` · `editar.planes` ("Editar Perfil").
- **Archivos:** FE `internet/{AddPage,EditPage}.vue`, `components/{FormInternet,TabFacturacion,TabTecnico}.vue`, `composables/useInternet.js` · BE `internet.controller.ts:14-19,102-108`, `internet.service.ts:49-71,586-670`, `dto/create-internet.dto.ts`, `dto/update-internet.dto.ts`.
- **Secciones / pestañas:** "Facturación" (icono receipt_long) y "Parámetros Técnicos" (settings); botones "Salir" y "Guardar Cambios".
- **Campos — pestaña "Facturación":**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Nombre Plan:" | texto (mayúsculas) | Sí | BE: MAYÚSCULAS; FE consulta `GET /internet/check-nombre` (500 ms): "Ya existe un plan con este nombre" | La verificación es por nombre en **todo el sistema** (cualquier router) |
| "Descripción:" | texto, hint "* Texto para la facturación" | No | máx. 200 (BD) | Si está vacía, la factura usa el nombre del plan ✅ `BE:pagos/helpers/facturacion-utils.ts:43-50` |
| "Código:" | texto, hint "* Código alfanumérico para la factura electrónica (opcional, máx. 25)" | No | `^[A-Za-z0-9\-_.\/]{1,25}$`: "El código solo permite alfanuméricos y los símbolos - _ . / (máx. 25 caracteres)" | vacío → `null` |
| "Precio Plan:" | número, placeholder "0.00", hint "Valor neto sin iva" | Sí | decimal(8,2); el FE limita a 2 decimales | |
| "Impuesto IVA:" | select | Sí | opciones **`0%` y la tarifa estándar del país** (EC: `15%`) | BE acepta cualquier entero |
| "ICE:" (solo Ecuador) | select | No | "No aplica" / "Por porcentaje" / "Por valor fijo" | |
| "Valor Ice:" y "Codigo Ice:" | número / select con búsqueda | Sí si ICE ≠ "No aplica" | "El valor debe ser mayor a 0" / código de catálogo | |

- **Campos — pestaña "Parámetros Técnicos":**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Descarga Mbps:" | entero | Sí | **BE ≥ 1**: "Descarga Mbps debe ser mayor a 0" (el FE deja pasar 0) | máx-limit de bajada |
| "Subida Mbps:" | entero | Sí | **BE ≥ 1**: "Subida Mbps debe ser mayor a 0" | máx-limit de subida |
| "Limit At:" | entero % | No | 0–100 ("Limit At es un porcentaje del plan: debe estar entre 0 y 100") | limit-at = % de la velocidad |
| "Burst Limit:" | entero % | No | BE ≥ 0 (sin tope); FE lo limita a 100 | % **adicional** sobre la velocidad |
| "Burst Threshold:" | entero % | No | 0–100 | % de la velocidad |
| "Burst Time:" | entero seg, hint "Tiempo de ráfaga" | No | ≥ 0 | |
| "Prioridad:" | select | Sí | `Baja (8)`, `Baja (7)`, `Normal (6)`, `Normal (5)`, `Normal (4)`, `Alto (3)`, `Alto (2)`, `Alto (1)` | 1 = más alta |
| "Addresslist:" | texto, hint "*Opcional Lista personalizada ejm: clientes (sin espacios)" | No | `^[A-Za-z0-9_.-]*$` (FE limpia caracteres): "El Addresslist no admite espacios ni caracteres especiales (solo letras, números, guion, guion bajo y punto)." | RED-008 §D |
| "Router:" | multi-select (chips) | Sí | `TODOS` (= todos los routers) o varios | "Debes elegir una opción" |

  Regla FE de burst: "todo o nada": "Para usar burst completa Burst Limit, Threshold y Time (los 3 mayores a 0)" ✅ `FE:useInternet.js:207-223`. Tipos de plan: no existe un campo "tipo"; la única variante es ICE (porcentaje/valor).
- **Botones y acciones:** "Guardar Cambios" ejecuta (alta) un `POST /internet` **por cada router**; (edición) un `PATCH /internet/actualizar-planes` por router + `PATCH /mikrotik/update-queue` si cambió algún campo técnico ✅ `FE:useInternet.js:259-366`.
- **Reglas de negocio (backend):**
  - **Alta = upsert**: si ya existe un plan con ese nombre en ese router (comparación sin mayúsculas ni espacios sobrantes), **se actualiza** en lugar de crear otro ✅ `:37-71`.
  - Edición: localiza el plan por (router, nombre anterior) y, si no existe, lo **crea** (por eso editar un plan con "TODOS" lo crea en routers donde faltaba) ✅ `:586-603`.
  - Efectos: RED-025.
- **Mensajes (texto exacto):** éxito "Plan agregado exitosamente" / "Plan editado exitosamente"; "Precio actualizado en <n> servicio(s) y <m> factura(s) no pagada(s)."; errores: `message` del backend; si se quita un router en uso: "No se puede quitar el router <nombre> porque esta en uso".
- **Casos límite y advertencias:**
  - Quitar routers del plan al editar ejecuta `DELETE /internet/eliminar-plan/<nombre>/<router>` **después** de guardar el resto: no es transaccional.
  - El nombre del plan se usa como **nombre de perfil PPP** y como base de las listas/objetos PCQ (RED-008) ✅.
  - Como el FE rechaza nombres que ya existen en cualquier router, para tener el mismo plan en otro router **después** del alta hay que **editar** el plan y añadir el router en el selector (el alta con ese nombre no se permite).
  - Importe del IVA que se factura: ver RED-025.
- **Preguntas probables:** ¿Para qué sirve "Limit At"? · ¿Qué es burst y por qué debo llenar los tres campos? · ¿El precio incluye IVA? (No: "Valor neto sin iva") · ¿Qué es Addresslist? · ¿Puedo tener el mismo plan en varios routers? · ¿Qué significa Prioridad? · ¿Para qué sirve el Código?
- **Pendiente de validar en UI:** ❓ opciones reales del select IVA en una instalación Ecuador (código lee `IVA_VALORES` por país); ❓ valor mostrado en "Impuesto IVA" para planes importados con 12 % o 14 %.

---

## RED-025 · Qué pasa al editar un plan (clientes, router y facturas)

- **Origen:** efectos de RED-024 (edición). Archivos: BE `internet.service.ts:586-731`, `mikrotik/mikrotik.controller.ts:102-107`, `mikrotik/mikrotik.service.ts:983-1041`, `mikrotik/mikrotik-queue.processor.ts:68-184`, `mikrotik-edit-name-queue.processor.ts:162-271`, `crear-facturas/crear-facturas.service.ts:205-260`.
- **Tabla de efectos:**

| Cambio en el plan | Qué ocurre con los clientes existentes | Qué ocurre en el MikroTik |
|---|---|---|
| **Precio** | Diálogo "El precio del plan cambió": "El precio pasó de <a> a <n>. ¿Qué deseas actualizar?" + "Solo se afectan los que tienen el precio estándar (<a>); los de precio personalizado y las facturas ya emitidas/pagadas NO se tocan." Opciones: "Precio de los servicios de clientes" (por defecto marcada) y "Facturas / recibos NO pagados (sin emitir)"; botones "Cancelar (solo el plan)" / "Aplicar". Servicios: solo los que tienen `precio` = precio anterior; facturas: `estadoSRI = 'NO PAGADO'`, no "FACT. LIBRE", solo el ítem de servicio con precio estándar ✅ | nada |
| **Impuesto IVA / ICE / Código** | Solo el plan. Las facturas **futuras** leen IVA/ICE/descripcion del plan al crearse (`perfil_internet.impuesto`; si el comprobante es "Recibo", IVA 0) ✅ `crear-facturas.service.ts:214,230-260`; las ya creadas conservan sus ítems | nada |
| **Descripción / Nombre** | Facturas no pagadas con el texto "automático" anterior pasan al nuevo texto (`actualizarFacturasNoPagadas`); las editadas a mano se respetan ✅ | **nada** (no figura en `CAMPOS_TECNICOS`): perfil PPP y objetos PCQ siguen con el nombre viejo hasta el próximo "Reparar"; los secrets PPPoE existentes conservan su perfil anterior ❓ |
| **Velocidad, Limit At, Burst, Prioridad** (campos técnicos) | — | `PATCH /mikrotik/update-queue` → job Bull `editQueueMikrotik` (1 intento): **solo para el router cuyo registro de plan se cargó** (usa `perfil_internet_id` = id del plan abierto) ✅. Colas simples/Ninguno: borra las colas y **todas las entradas de address-list con la IP** de los servicios del plan en ese router (incluida la lista de corte de los suspendidos) y ejecuta **Reparar completo** del router; PCQ: `sincronizarRouter`; PPPoE "Con Profile PPP": el rate-limit del perfil **no** se actualiza si ya tenía uno |
| **Addresslist** | — | Job `editAddressListPlanMikrotik`: mueve por IP las entradas de la lista anterior a la nueva (o las crea/elimina); omite suspendidos y entradas en la lista de corte |
| **Router (añadir/quitar)** | Alta de filas en routers nuevos (crea el plan); quitar un router **elimina** el plan allí solo si no tiene clientes | nada hasta crear servicios/reparar |

- **Casos límite:**
  - Con el plan en varios routers, el FE llama `update-queue` para cada router pero con el **mismo** `perfil_internet_id`; en el backend `filterServicesById(perfil, router)` solo encuentra servicios del router dueño de ese plan, así que **los demás routers no se refrescan** y quedan con la velocidad anterior hasta "Reparar" ✅ `FE:useInternet.js:315-321`, `BE:customers.service.ts:2016-2030`, `mikrotik-queue.processor.ts:77-85` ❓ (confirmar en operación).
  - El job elimina entradas de address-list por IP durante unos segundos, incluyendo clientes suspendidos, hasta que Reparar los vuelve a poner en la lista de corte (ventana de desbloqueo).
  - Si no hay clientes del plan en el router, el job termina sin sincronizar (tampoco PCQ).
- **Preguntas probables:** ¿Si cambio el precio, cambian las facturas ya emitidas? · ¿Y los clientes con precio especial? · ¿Cuánto tarda en reflejarse un cambio de velocidad en el router? · ¿Tengo que reparar el router después de cambiar la velocidad? · ¿Qué pasa si renombro un plan?
- **Pendiente de validar en UI:** ❓ el caso multi-router; ❓ valor del texto del toast cuando no se marca ninguna opción de propagación.

---

## RED-026 · Migrar clientes de un plan a otro

- **Ruta UI:** `/servicios/internet` → icono swap (tooltip "Migrar clientes a otro plan"). Permiso `editar.planes`.
- **Archivos:** FE `internet/components/ModalMigrarPlan.vue` · BE `internet.controller.ts:110-120`, `internet.service.ts:257-325`.
- **Pantalla:** título "Migrar clientes de plan"; "Mover los clientes de <origen> a otro plan."; select "Plan destino"; casilla "Actualizar el precio de los clientes al del plan destino" (marcada); aviso "Se migran los clientes activos y suspendidos (no los retirados). Después se recalcula automáticamente la velocidad en el router de cada cliente. Si algún router no tiene el plan destino, esos clientes se omiten."; botones "Cancelar" / "Migrar". Confirmación: "Se moverán los clientes activos y suspendidos de "<origen>" a "<destino>"[, actualizando su precio al del plan destino]. ¿Continuar?".
- **Reglas (backend)** ✅: valida "Plan origen y destino son requeridos", "El plan origen y destino no pueden ser el mismo", "Plan origen no encontrado", "Plan destino no encontrado". Para cada fila de plan origen busca el destino **en el mismo router**; si no existe cuenta los servicios como `omitidos`; si existe actualiza `perfil_internet` de los servicios no retirados y, si se pidió, `precio = precio_plan del destino` (sobrescribe también precios personalizados). Devuelve `{migrados, omitidos, refrescos}`.
- **Efectos externos:** el FE dispara `PATCH /mikrotik/update-queue {router_id, perfil_internet_id=<plan destino>}` por cada router afectado, sin esperar ni reportar fallos (`.catch(()=>{})`) → mismo job de RED-025. Los secrets PPPoE no cambian de perfil en ese proceso ❓.
- **Mensajes:** `Migrados <n> cliente(s) a "<destino>".` + ` <n> omitido(s): su router no tiene el plan destino.` + ` Aplicando velocidades en <n> router(es)...`; "Selecciona el plan destino"; error `message` o "No se pudo migrar".
- **Casos límite:** facturas pendientes mantienen su precio; sin comprobación de que el plan destino esté activo ni de que ambos tengan velocidad; el destino se elige por **nombre** entre los planes de la lista cargada.
- **Preguntas probables:** ¿Se actualiza el precio de los clientes? (sí si deja la casilla) · ¿Qué pasa con los clientes cuyo router no tiene el plan destino? · ¿Los clientes PPPoE cambian de velocidad?
- **Pendiente de validar en UI:** ❓ efecto real en clientes PPPoE (perfil PPP anterior).

---

## RED-027 · Clientes del plan, Activar/Inactivar y Eliminar plan

- **Ruta UI:** `/servicios/internet` (cifras de la tabla, iconos de la columna "acciones").
- **Archivos:** FE `internet/components/ModalClientesPlan.vue`, `IndexPage.vue:105-127` · BE `internet.service.ts:144-250,733-795`.
- **Modal "Clientes del plan: <nombre>":** filtros "Buscar por nombre, documento o IP...", select "Estado" (`Todos` / `Activos` / `Suspendidos`), select "Router"; columnas `Cliente`, `Documento`, `IP`, `Router`, `Estado` ("Activo"/"Inactivo"), icono "Ver cliente"; botón "Excel" (tooltip "Descargar clientes del plan en Excel"); vacío "Sin clientes para este filtro."; error "No se pudieron cargar los clientes del plan". El **Excel respeta router y búsqueda pero no el filtro Estado** (envía solo `filter` y `router`) ✅ `FE:21-49`, `BE:207-250`.
- **Activar/Inactivar:** `PATCH /internet/:id/:estado` actualiza `isActive` de **todas** las filas con ese `nombre_plan` (todos los routers) ✅ `:733-752`. Sin impacto directo en el router, salvo en modo PCQ: un plan inactivo se trata como inexistente en la siguiente sincronización (RED-008 §E). No impide asignarlo a clientes por API; el selector de servicios filtra por activos (`GET /internet/true`) ❓.
- **Eliminar:** `DELETE /internet/eliminar-plan/:nombre_plan/:router_id?`; solo con servicios **vivos** = 0 (los retirados no impiden); si hay: error 500 "No se puede eliminar porque ya está en uso"; si no existe: "No se encontró el plan a eliminar". Es `softDelete` de las filas (por router o todas) ✅ `:754-795`. Texto de confirmación FE: "Estas seguro de eliminar este servicio de internet?" (éxito "Registro eliminado exitosamente").
- **Preguntas probables:** ¿Por qué el total del plan no coincide con otra pantalla? · ¿Puedo eliminar un plan en un solo router? (solo editando el plan y quitando ese router) · ¿Inactivar un plan afecta a sus clientes? (en routers PCQ sí).
- **Pendiente de validar en UI:** ❓ que el modal indique estado "Inactivo" para suspendidos (etiqueta distinta de "Suspendido" del conteo).

---

## RED-028 · Excel de planes: plantilla, importar y exportar

- **Ruta UI:** `/servicios/internet` → menú Excel. Sin clave de permiso propia.
- **Archivos:** FE `internet/components/ModalCargarExcel.vue`, `composables/useInternet.js:228-257` · BE `internet.service.ts:379-531`.
- **Formato:** hoja `planes`; fila 1 "PLANES DE INTERNET"; fila 2 cabeceras: `Nombre Plan *`, `Descripción`, `Código`, `Precio Plan *`, `Impuesto IVA *`, `Descarga Mbps *`, `Subida Mbps *`, `Limit At`, `Burst Limit`, `Burst Threshold`, `Burst Time`, `Prioridad *`, `Address List`, `Router *`; listas: Impuesto = `Sin IVA,12%,14%,15%`; Prioridad = `Baja (8)…Alto (1)`; Router = nombres + `TODOS` (filas 3–199). Archivo `plantilla-planes.xlsx`. "Exportar Planes" agrupa por nombre; en Router escribe "TODOS LOS ROUTERS" si el plan existe en más de un router.
- **Importar ("Carga masiva de planes" › "Cargar planes"):** valida por fila: faltantes ("faltan campos: …"), "Limit At (x) debe estar entre 0 y 100 %", "Burst Threshold (x) debe estar entre 0 y 100 %" (mensaje con "Fila <n>"); envía `POST /internet` por plan (si Router = `TODOS`, una vez por router) ✅ `FE:69-216`. Por ser **upsert**, importar un nombre que ya existe en ese router **actualiza** el plan (no avisa) ✅.
- **Particularidades:** un nombre de router que no esté en la lista hace fallar `listRouters.find(...).value` (TypeError) y detiene el resto de la importación ✅ `:210-211` ❓; el Excel permite IVA 12 %/14 % aunque el formulario solo ofrece 0 % y la tarifa estándar.
- **Pendiente de validar en UI:** ❓ mensaje visible cuando falla la lectura del router.

---

## RED-029 · Corte de servicio: cómo se materializa en MikroTik y OLT, y configuración por router

- **Ruta UI / name:** el corte no tiene pantalla propia. Se configura en **Ajustes → Configuración de Cortes** (`/ajustes/servicio` · `ajuste.servicio`; tarjeta "Configuración de Cortes" de `ajustes.index`) y se dispara por (a) cron semanal por router, (b) **Aplicar cortes manualmente**, (c) **Reparar router** (RED-007), (d) **Activar/Suspender** un servicio desde su ficha y (e) pagos, anulaciones y promesas (recalculo por servicio). ✅
- **Archivos:** BE: `app.service.ts:31-50, 239-338, 340-418, 419-444` · `app.controller.ts:32-49, 52-60, 81-101` · `app-queue.processor.ts:63-112, 114-707, 770-862` · `customers/customers.service.ts:2613-2748, 2763-2816, 2900-2960` · `mikrotik/mikrotik.service.ts:424-981, 1177-1554, 2411-2464, 2513-2580` · `mikrotik-resources/mikrotik-resources.service.ts:182-262, 623-775, 1042-1249, 1366-1601, 1875-1936` · `common/utils/onu-corte.utils.ts` · `smart-olt/smart-olt.service.ts:1043-1200` · `smart-olt/habilitacion-onu-queue.processor.ts` · `admin-olt/admin-olt.service.ts:352-395` · `admin-olt/habilitacion-adminolt-queue.processor.ts` · `router/entities/router.entity.ts:9-14, 119` · `settings/entities/setting.entity.ts:106-160` · FE: `pages/dashboard/ajustes/servicios/IndexPage.vue`, `…/composables/useCorteRouter.js`, `…/components/{CorteConfigCards,DiasAplicarCortes,HoraCorte,ConfigurarReintentosCortes}.vue`, `pages/dashboard/ajustes/IndexPage.vue:109-140`, `router/auth-guard.ts:37-45, 100-103`, `pages/dashboard/empresas/composables/useSetting.js:208-213`.
- **Para qué sirve:** cerrar de punta a punta lo que RED-008/RED-019 describen por partes: quién decide el corte, qué se escribe en MikroTik y en la OLT, y qué parte de esa decisión se puede cambiar por router. El motor de decisión (qué cliente se corta y cuándo) está en AUT-007; la agenda en AUT-008; los reintentos en AUT-009; la ONU en AUT-010/OLT-027. Aquí se verifica el recorrido completo y se cierra la configuración por router.
- **Acceso:** ruta `ajuste.servicio`: basta **una** de `variables.dias-habilitados`, `variables.facturacion`, `variables.horario.cortes`, `variables.reintentos.mikrotik`, `variables.reintentos.smartOLT`, `variables.aplicar-cortes`, `variables.opciones-cortes` (FE:router/auth-guard.ts:37-45, 100-103). La tarjeta del menú de Ajustes se ve con alguna de `dias-habilitados`, `horario.cortes`, `reintentos.mikrotik`, `aplicar-cortes` (FE:ajustes/IndexPage.vue:109-140). Dentro: Días (`variables.dias-habilitados`), Horarios (`variables.horario.cortes`), bloque de reintentos (cualquiera de `reintentos.mikrotik`, `aplicar-cortes`, `opciones-cortes`), casillas "Aplicar Cortes/Activación" (`variables.opciones-cortes`) y botón "Aplicar cortes manualmente" (`variables.aplicar-cortes`). La vista de **un router** (selector, interruptor, tarjetas y Guardar) **no comprueba permisos**. Backend: `GET /corte-config/global`, `GET|PATCH /corte-config/router/:routerId`, `PUT /programar-queue/:queue`, `POST /aplicar-cortes` llevan solo `@Auth()` (BE:app.controller.ts:32-60, 81-101).
- **Recorrido completo del corte (✅ código):**
  1. **Agenda.** `programarCortes()` borra todos los repetibles `cortesServicios` y, **por cada router no eliminado (activo o no)**, crea uno por día habilitado con hora válida: cron `<min> <hora> * * <día>`, `jobId = corte-<routerId>-<día>`, datos `{dia, routerId, configReintentos}`, `attempts: 1`. Días, horas y reintentos salen de `router.corteConfig` si existe y, si no, de `settings` (`cfg.horasPorDia ?? global`, `diasCorte ?? diasCortes`, `configReintentos ?? global`). Un día sin toggle **no** crea repetible (BE:app.service.ts:294-338). Se reconstruye al arrancar la instancia 0, al `PUT /programar-queue/cortesServicios` y al guardar la config de un router (`guardarCorteConfigRouter`, :438-444). Recuperación tras reinicio: AUT-008.
  2. **Ejecución.** `cortesServicios` → `repararYSetearEstadosServicios` (BE:app-queue.processor.ts:63-66, 114-707): lee los servicios `deleted = false` del router con sus facturas impagas, decide por servicio suspender/reactivar (tolerancia, gracia, promesas; AUT-007) y **solo cambia `isActive` en BD** con `CustomersService.suspenderServicio` (idempotente; escribe el log `SUSPENDER_SERVICIO`/`ACTIVAR_SERVICIO` "Servicio suspendido"/"Servicio activado", sin tocar el router, BE:customers.service.ts:2763-2816). Un servicio de un router con `isActive = false` cambia en BD pero ese router no se empuja (:174-193, 604-605).
  3. **Empuje a MikroTik.** Si algún router del job tiene hoy como día de corte, o el job es por servicio, o es reparación manual, llama `MikrotikService.repararRouter(routerId, false, servicio_id)` por router (:597-648). `repararRouter` elige v6 o v7 por `registro_trafico` (`RouterOS V7.x` → `mikrotikV7`), reconcilia **todos** los servicios del router (o solo `servicio_id`) con `estado = isActive` y, si el control es PCQ, sincroniza los objetos por plan (BE:mikrotik.service.ts:2411-2464, 2513-2580; mikrotik-resources.service.ts:182-262).
  4. **Qué se escribe por servicio** (lotes de 160 con `allSettled` en v6, `mikrotik.service.ts:708-926`; v7 `addQueue`, `mikrotik-resources.service.ts:1042-1249`):
     | Servicio | Suspendido (`isActive = false`) | Activo |
     |---|---|---|
     | IPoE / PPPoE sin control | la IP (y la IPv6 si el router tiene el paquete) **sale** de la address-list del plan ("Addresslist") y **entra** a la lista de corte de su red (`red.lista_corte` o `Impagos`) con comentario = cliente (v6 :864-907; v7 :1177-1238) | sale de la lista de corte y vuelve a la del plan (v6 :818-861; v7 :1115-1175) |
     | PPPoE con `control_pppoe` | secret `disabled=true` **y** la IP entra a la lista de corte (el secret deshabilitado no baja la sesión viva) (v6 :724-795; v7 :1045-1096) | secret habilitado y la IP sale de la lista |
     | Cola simple / PCQ | **no se toca**: la cola (o la pertenencia al PCQ) se mantiene; solo se crea si falta o se borra si el router ya no usa colas (:804-813) | igual |
     | Regla de corte | antes de cada lote asegura, por lista usada, la regla `/ip firewall raw` `chain=prerouting action=drop src-address-list=<lista>` y la **mueve a la posición 0** (también `/ipv6/firewall/raw` si hay IPv6). En v6 (`darPrioridadReglaImpagos`) **reafirma** `action=drop` y el comentario aunque la regla exista (:1519-1554); en v7 (`aplicarReglaImpagos`) solo la crea y la reubica, sin corregir `action` (mikrotik-resources.service.ts:1898-1936) | — |
     El bloqueo efectivo es el `drop` por IP origen: no hay redirección a página de aviso ni cola de castigo (RED-019).
  5. **Errores en el lote.** Un cliente que falla no detiene a los demás; al terminar el lote el router se rechaza con los errores unidos por ` | ` y pasa a `routersFallidos` (mikrotik.service.ts:922-931). Solo `already have such entry`/`name` se ignora. Reintentos: AUT-009 (job `reintentarRoutersFallidos`, `repararRouter(routerId)` del router **completo**, hasta `nReintento` veces cada `intervalo` minutos; por servicio, 6 veces cada 60 s) (BE:app-queue.processor.ts:770-862).
  6. **Canal OLT.** Para cada servicio: `aplicarCortes = resolverAplicarCortes(router.corteConfig?.aplicarCortes, setting.aplicarCortes)` (la del router pisa **clave por clave** a la global); `esSmartOLT = aplicarCortes.smartOLT && sn && onu_source = 'smartOLT'`, igual para AdminOLT; sin `onu_source` y con `sn` se asume SmartOLT (BE:common/utils/onu-corte.utils.ts:21-50; app-queue.processor.ts:213-219). `aplicarEstadoOnu` actúa solo si hubo **transición** (servicio que pasó de activo a suspendido o viceversa) o el job trae `sincronizarOnus` (corte manual), y omite una ONU `onu_invalida` sin transición (:81-112).
     - **SmartOLT:** `desabilitarOnu(sn)`/`habilitarOnu(sn)`: lee `onu_status` de la señal; si ya está `offline` (al deshabilitar) u `online` (al habilitar) no envía nada; si no, `POST <dominio>/api/onu/disable|enable/<sn>`; si la lectura de señal falló **y** la orden falla, marca `onu_invalida`; agenda `verificarEstadoOnu` (2 intentos, primer chequeo a los 35 s, backoff fijo de 60 s) que reenvía la orden si el estado no coincide, y al agotarse deja el log `VERIFICACION_FALLIDA` "No se verificó estado después de N intentos" (BE:smart-olt.service.ts:1043-1200; habilitacion-onu-queue.processor.ts:14-60).
     - **AdminOLT:** `deshabilitarOnuPorSn`/`habilitarOnuPorSn`: busca la ONU por SN (si no existe, no hace nada), `POST /onu/disable|enable/<id>/` y agenda la verificación (4 intentos, 35 s y 60 s) (BE:admin-olt.service.ts:352-395; habilitacion-adminolt-queue.processor.ts). Estas acciones automáticas **no** dejan log de acción (solo si hay `user`, `admin-olt.service.ts:323, 338`).
     - Un fallo de OLT se captura y se avisa por Slack solo si hubo transición; **no** aborta el corte del servicio (la ONU puede quedar habilitada con el servicio suspendido).
  7. **Corte/activación individual** (botón de la ficha): `PUT /customers/activeOrSuspendService/:id` empuja **primero** a MikroTik (v6 `activeOrSuspendService`, v7 equivalente; usa `lista_corte` de la red) y **solo si responde** guarda `isActive` y actúa sobre la ONU con el mismo `resolverAplicarCortes`; un fallo de MikroTik devuelve 400 "Error al editar el cliente en mikrotik" y el estado no cambia; los fallos de OLT solo se registran en el logger (BE:customers.service.ts:2640-2748; mikrotik.service.ts:1177-1215; mikrotik-resources.service.ts:1366-1403). `activeOrSuspendServiceQueue` (:2613-2638) no la llama nadie y no hay procesador para su job.
  8. **Retiro (no es un corte):** `retirarServicio` borra el cliente del router y, si el ajuste **global** `aplicarCortes.smartOLT`/`.adminOLT` está activo, **elimina** la ONU de la plataforma; aquí no se aplica la configuración por router (BE:customers.service.ts:2917-2960).
- **Configuración por router (Ajustes › Configuración de Cortes, ✅ FE `ajustes/servicios`):**
  | Elemento (texto exacto) | Qué hace |
  |---|---|
  | Tarjeta "Configurar cortes de" | selector con "🌐 Global (por defecto)" y los routers; siempre arranca en Global (`IndexPage.vue:42-56`) |
  | "Usar configuración global" / "Personalizado para este router" | interruptor; apagado ⇒ `corteConfig = null` |
  | 📅 "Días habilitados para cortes" | un interruptor por día (Domingo…Sábado); valores `0..6` |
  | 🕓 "Horarios de cortes" | un reloj por día; por defecto del formulario `09:00` |
  | 🔧 "Configuración de reintentos automáticos" | "Número de intentos al aplicar cortes:" (Veces, tope 20) y "Tiempo entre cada reintento:" (Minutos, tope 1440) |
  | "Aplicar Cortes/Activación:" | casillas Mikrotik · SmartOLT · AdminOLT |
  | "Guardar Cambios" (router) | `PATCH /corte-config/router/:routerId` con `{corteConfig}` (o `null`) y reprograma la agenda de **todos** los routers (BE:app.service.ts:438-444) |
  | "Guardar Cambios" (global) | `PATCH /settings/:id` (todo el objeto de ajustes) + `PUT /programar-queue/cortesServicios`; avisa "Actualización exitosa"; si Número de intentos o Tiempo quedan vacíos los pone en 4 y 60 (`IndexPage.vue:22-39`; `useSetting.js:208-213`) |
  | "Aplicar cortes manualmente" › **Activar** (solo vista Global) | diálogo "¿Deseas aplicar los cortes manual?" (**Aceptar**/Cancelar); `PUT /programar-queue/cortesServicios` + `POST /aplicar-cortes`; aviso "Aplicando cortes."; encola un job por router con `sincronizarOnus: true` y `jobId aplicarCorteManual-<router>-<día>` (BE:app.service.ts:256-281) |

  Forma guardada (`routers.corteConfig`, jsonb nulo por defecto; BE:router/entities/router.entity.ts:9-14): `{horasPorDia, diasCorte[], configReintentos{nReintento, intervalo}, aplicarCortes{mikrotik, smartOLT, adminOLT}}`. Al personalizar por primera vez el formulario se rellena con la configuración **global** vigente (o `09:00`, días `1-5`, `4`/`60`, `mikrotik` sí / SmartOLT y AdminOLT no si faltan) y al guardar se escribe el bloque completo, incluidas las **tres** casillas (`useCorteRouter.js:7-110`). Avisos al guardar un router: "El router volverá a usar la configuración global.", "Configuración de cortes del router guardada.", "Guardado. Sin días marcados, este router no aplicará cortes automáticos.", error "No se pudo guardar." (carga: "No se pudo cargar la configuración de cortes.").
  Defaults globales (`settings`): `diasCortes = []`, `horasPorDia` = `00:01` los 7 días, `configReintentos = {nReintento: 4, intervalo: 60}`, `aplicarCortes = {mikrotik: true, smartOLT: false}` (sin clave `adminOLT`) (BE:settings/entities/setting.entity.ts:106-160).
  Quién más lee `corteConfig`: el motor de corte (días y canales), la agenda, y los recordatorios de pago, que desplazan la fecha de corte que muestran al siguiente día habilitado del router (BE:pagos/notificar-recortatorio-pago-queue.processor.ts:158-184).
- **Estados posibles:** servicio `isActive` activo/suspendido (CLI-*); entradas de la lista de corte en MikroTik; ONU habilitada/deshabilitada (OLT-033).
- **Reglas de negocio (backend):** la config del router reemplaza **por bloque** a la global (`horasPorDia`, `diasCorte`, `configReintentos` con `??`) y **clave por clave** en `aplicarCortes`; `aplicarCortes.mikrotik` **no se lee en ningún punto** del backend (el empuje a MikroTik no depende de ella) ✅ (búsqueda `aplicarCortes` en `src/`: solo `.smartOLT` y `.adminOLT`).
- **Mensajes (texto exacto, logs del módulo "Cortes y red", `entityType = corte_servicio`, acción `RUN`):** "🔧 Aplicando cortes en los routers: …" (app-queue.processor.ts:619) · "✅  Corte aplicado correctamente al router: <nombre>" (:640, con dos espacios) · "🟠 Corte inactivo para el dia <día>" (:698) · "⏳ Reintento de cortes fallidos en N minutos: …" (:667) · "⚠️ Reintento de cortes fallidos en …" con una línea "• <router> — intento k/N" (:793) · "✅ Router reparado correctamente: <router>" (:814) · "🚫 Se alcanzó el máximo de N reintentos para el router <router>." (:833; el aviso a Slack añade "DE *** <CLIENTE>"). Por servicio: `SUSPENDER_SERVICIO` "Servicio suspendido" / `ACTIVAR_SERVICIO` "Servicio activado"; ONU: `DESABILITAR_ONU` "ONU deshabilitada" / `HABILITAR_ONU` "ONU habilitada" (SmartOLT).
- **Efectos secundarios externos:** MikroTik (REST v7 / API v6: address-list, raw, secrets PPP, colas, ARP/DHCP), SmartOLT/AdminOLT (API), Slack (`URL_SLACK`), Redis/Bull (cola `-app`, `-habilitacion-onus*`), tabla `logs`. Sin WhatsApp ni correo al cliente por el corte.
- **Casos límite y advertencias (✅ salvo marca):**
  1. **Reintentos del router en 0.** En la vista de un router el campo "Número de intentos" admite vacío y `0`; al guardar queda `nReintento: 0` (`Number(valor) || 0`, `useCorteRouter.js:71-77`; `CorteConfigCards.vue:11-14`) y el tope pasa a 0: igualmente se encola un reintento tras `intervalo` minutos y, si falla, el log dice "Se alcanzó el máximo de 0 reintentos". En la vista Global el mínimo es 1 y el vacío se guarda como 4.
  2. **Todo o nada en las casillas por router.** El backend mezcla `aplicarCortes` clave por clave, pero la pantalla del router siempre guarda las tres, así que un router personalizado desde la UI deja de heredar cambios posteriores de la casilla global de SmartOLT/AdminOLT.
  3. **Alta de un servicio suspendido por la vía individual** (`createClient`, `estado = false`): su IP entra siempre a la lista `Impagos`, aunque la red tenga otra `lista_corte` (v6 :555-576; v7 :746-770). La reparación posterior lo coloca en la lista de su red, pero no lo saca de `Impagos`, y al reactivarlo solo se quita de la lista de su red ❓ (efecto en un router real).
  4. **Retiro y OLT:** la eliminación de la ONU al retirar un servicio depende del ajuste global, no del router (punto 8 del recorrido).
  5. **Historial de cortes en Ajustes:** el componente `LogsCortes.vue` ("📋 Historial del proceso de cortes", permiso del catálogo `variables.opciones-logs`) no se importa en ninguna pantalla; los registros del corte se ven en Ajustes → Logs (`ver.logs`) ✅.
  6. El corte manual no salta el calendario: suspende solo si hoy es día habilitado del router (AUT-007); el recálculo por servicio (`servicio_id`) suspende cualquier día de la semana mientras exista al menos un día habilitado (AUT-012).
- **Preguntas probables:** ¿Por qué un router no corta los viernes? (día sin toggle en su configuración o en la global). ¿Puedo tener otro horario para un barrio/router? (sí, "Personalizado para este router"). ¿Por qué el corte no desactivó la ONU? (casilla SmartOLT/AdminOLT apagada en el router o global, ONU sin `sn`/`onu_source`, o ya estaba `offline`). ¿Qué hace la casilla Mikrotik? (nada). ¿Por qué un cliente cortado sigue navegando? (RED-019). ¿Qué pasa si el router no responde en el corte? (se reintenta; AUT-009). ¿Un cambio de configuración de cortes cuándo rige? (al guardar: se reconstruye la agenda).
- **Pendiente de validar en UI:** ❓ aspecto de la tarjeta de un router personalizado y del aviso "Sin días marcados…"; ❓ el efecto visible en un router RouterOS v7 real del `drop` (v7 no reafirma `action`); ❓ qué ve el usuario si `PATCH /corte-config` falla.

---

## Hallazgos del dominio (cierre de RED-029)
- **Cierre:** `aplicarCortes.mikrotik` no tiene efecto; coincide con `docs/guia/cortes.mdx` ("La casilla Mikrotik … no tiene efecto").
- **Cierre:** `docs/guia/cortes.mdx` (Reintentos automáticos: "1 a 20; 4 si queda vacío") es cierto en la vista Global; en la de un router personalizado, vacío o 0 se guarda como 0 (`useCorteRouter.js:71-77`).
- **Cierre:** `docs/guia/cortes.mdx` dice que las casillas de "Aplicar cortes en" "se combinan una a una con la global": es lo que hace el backend (`resolverAplicarCortes`), pero la pantalla del router guarda siempre las tres casillas.
- **Cierre:** v6 reafirma `action=drop` de la regla `raw` en cada corrida y v7 no (`mikrotik.service.ts:1519-1554` vs `mikrotik-resources.service.ts:1898-1936`).
- **Cierre:** `createClient` (alta individual suspendida) usa `Impagos` fijo en v6 y v7, ignorando `red.lista_corte`.
- **Cierre:** `LogsCortes.vue` y `CustomersService.activeOrSuspendServiceQueue` son código sin uso.
