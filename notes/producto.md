# Producto ISPMAX — hechos verificados en código

> Fuente: ZIP del 2026-10-06 (frontend + backend). Marca: ✅ código · 🖥️ UI real · ❓ sin verificar.
> Esta nota crece: añadir aquí cada módulo a medida que se lee. El inventario formal irá a `docs-inventory.md`.

## Backend — módulos Nest registrados (`src/app.module.ts`) ✅

69 controladores, 79 entidades, 100 servicios, 111 migraciones. Módulos importados:

- **Acceso/empresa:** auth, roles-and-permisos, companies, sucursal, settings, logs, notifications, deploy (token de servicio), database (respaldos), custom-fields, files.
- **Clientes y servicios:** customers, servicios-recurrente, servicios-recurrente-pagos, servicios-personalizado, contratos, contratos-archivos, plantillas, instalaciones, respuestas-instalaciones, ticket, respuestas-tickets, ubicacion-tecnicos, grupos-facturacion, equipos.
- **Red:** router, mikrotik, mikrotik-resources, internet (planes), caja-nap, red-fibra, puertos, red-ipv4, red-ipv6, smart-olt, admin-olt, monitoreo-trafico, monitoreo-dispositivos.
- **Finanzas:** invoices, proforma, crear-facturas, facturacion-automatica, pago-mes-adelantado, pagos, registro-pagos, facturas-pagos, transacciones, forma-pago, detalle-forma-pago, promesas-pago, ingresos-egresos, conciliacion-bancaria, pasarelas-pago, tasa-bcv.
- **Facturación electrónica:** comprobantes-electronicos (facturas SRI), firma-electronica, facturacion/factus.
- **Almacén:** products, categories, providers, buys, materiales.
- **Mensajería:** email, cloud-api (WhatsApp Cloud), mensajes-masivos.
- **Otros:** dashboard, ServeStatic (`/api/sri`, `/api/images-user`, `/api/uploads`), Bull queues (`app`, `respaldo-bd`), Schedule (cron).

Dependencias relevantes: `node-routeros-v2` (MikroTik), `puppeteer`, `libreoffice-convert`,
`docxtemplater` (contratos .docx → PDF), `exceljs`, `nodemailer`, `openai` ❓ (para qué se usa: sin verificar),
`pdf-lib`, `pdf-parse`, `socket.io`.

## Frontend — rutas (`src/router/routes.ts`) ✅

Layout `MainLayout.vue`; todas con `meta.requiresAuth: true` salvo `/login`
(`ingresos-egresos` no declara `meta`). El nombre de la ruta (`name`) es la **clave de permiso**
que valida `validarPermisos(...)`.

| Ruta | name (clave de permiso) | Vista |
|---|---|---|
| `/login` | login | `sesion/Login.vue` |
| `/` | dashboard | `panel/IndexPage.vue` |
| `/clientes/:estado_servicio?` | index.clientes | `clientes/IndexPage.vue` |
| `/clientes/add` | crear.cliente | `clientes/AddCliente.vue` |
| `/clientes/edit/:client_id` | cliente.edit | `clientes/EditCliente.vue` |
| `/mapa-clientes` | mapa-clientes.index | `mapa-clientes/IndexPage.vue` |
| `/tickets` · `/tickets/add` · `/tickets/edit/:id` · `/tickets/reportes` | tickets.index/add/edit/reportes | `tickets/*` |
| `/instalaciones` · `/add` · `/edit/:id` · `/reportes` | instalaciones.index/add/edit/reportes | `instalaciones/*` |
| `/registrar-pago` | registrar.pago | `registrar-pago/TabsIndex.vue` |
| `/promesas-pago` | promesa-pago.index | `promesas-pago/IndexPage.vue` |
| `/ventas/:tipo?/:fecha?` | index.facturas_libre | `ventas/IndexPage.vue` |
| `/ventas/add/:venta_id?` | crear.factura | `ventas/AddVenta.vue` |
| `/transacciones/:showToday?` | pagos-registrados.index | `transacciones/IndexPage.vue` |
| `/cobros-pasarela` | cobros-pasarela.index | `cobros-pasarela/IndexPage.vue` |
| `/conciliacion-bancaria` | conciliacion-bancaria.index | `conciliacion-bancaria/IndexPage.vue` |
| `/ingresos-egresos` | index.ingresos_egresos | `ingresos-egresos/IndexPage.vue` |
| `/personas` | index.personas | `personas/IndexPage.vue` |
| `/proveedores` | index.proveedores | `proveedores/IndexPage.vue` |
| `/compras/:fecha?` · `/compras/add` | index.compras / crear.compra | `compras/*` |
| `/productos` | index.productos | `productos/IndexPage.vue` |
| `/categories` | index.categories (permiso real: `index.category`) | `categories/IndexPage.vue` |
| `/equipos` | index.equipos | `equipos/IndexPage.vue` |
| `/router` · `/router/add` · `/router/edit/:router_id` | index.routers / router.add / router.edit | `Gestion-Red/routers/*` |
| `/redes-ipv4` · `/add` · `/edit/:id` | index.red_ipv4 / crear.red_ipv4 / editar.red_ipv4 | `Gestion-Red/redes-ipv4/*` |
| `/redes-ipv6` · `/add` · `/edit/:id` | redesIpv6.index / crear.red_ipv6 / redesIpv6.edit | `Gestion-Red/redes-ipv6/*` |
| `/servicios/internet` · `/servicios/internert/add` · `/servicios/internert/edit/:id` (sic) | index.planes / crear.planes / editar.planes | `Gestion-Red/internet/*` |
| `/cajas-nap` · `/add` · `/edit/:id` | index.caja_nap / crear.caja_nap / editar.caja_nap | `Gestion-Red/cajas-nap/*` |
| `/mapa-nap` | index.mapa | `Gestion-Red/mapa-nap/IndexPage.vue` |
| `/monitoreo-red` | index.monitoreo_red | `Gestion-Red/monitoreo-red/IndexPage.vue` |
| `/smartOLT` · `/unconfigured/:olt_id` · `/authorize/:olt_id` · `/onu-view/:unique_external_id` | smartOLT.* | `Gestion-Red/smartOLT/*` |
| `/adminOLT` · `/onu/:sn` · `/no-autorizadas` · `/autorizar` | adminOLT.* | `Gestion-Red/adminOLT/*` |
| `/personalizado` | personalizado.index | `Gestion-Red/personalizado/IndexPage.vue` |
| `/usuarios` · `/add` · `/edit/:term` · `/usuario/edit/:term/profile` | index.usuario / crear.usuario / editar.usuario(.profile) | `usuarios/*` |
| `/roles-permisos` | index.rol | `roles-permisos/IndexPage.vue` |
| `/empresa/edit/:empresa_id` | index.empresa | `empresas/EditEmpresa.vue` |
| `/email/edit/:email_id` | email.edit | `emails/EditEmail.vue` |
| `/red/getIp` | getIp | `red/getIp.vue` |
| `/ajustes` | ajustes.index | `ajustes/IndexPage.vue` |
| `/ajustes/servicio` · `facturacion` · `pasarelas-pago` · `firma-electronica` · `smartolt` · `logs` · `plantillas` · `empresa` · `forma-pago` · `mensajeria` · `sistema` · `base-datos` | ajuste.* | `ajustes/<sección>/IndexPage.vue` |

Rutas **no** presentes en el menú lateral pero sí en el router: usuarios, roles-permisos, empresa/edit,
email/edit, red/getIp (entrada por Ajustes u otros enlaces ❓ por verificar en UI).

## Frontend — menú lateral (`src/layouts/SideBarMenu.vue`) ✅

Cada ítem se muestra solo si el rol tiene el permiso (`validarPermisos`); el grupo, si tiene alguno (`tieneAlguno`).

- **Dashboard** (`/`) — visible si hay algún permiso `dashboard.*` (total_clientes, facturas_pagadas,
  transacciones_hoy, facturas_no_pagadas, resumen_facturacion, pagos_mes, resumen_sistema, ultimos_pago).
- **Gestión de Red:** Routers, Redes IPv4, Redes IPv6, Planes de servicio, Cajas Nap,
  Mapa de Red y Clientes, Monitoreo de Red, SmartOLT, AdminOLT, Personalizado.
- **Gestión de Clientes:** Clientes, Tickets, Instalaciones.
- **Finanzas:** Registrar Pago, Ingresos / Egresos, Personas, Ventas, Transacciones (`/transacciones/true`),
  Cobros por pasarela, Conciliación bancaria.
- **Almacén:** Proveedores, Compras, Productos y Servicios, Categorías, Equipos.
- **Ajustes** (`/ajustes`) — visible con cualquiera de: `variables.dias-habilitados`, `variables.facturacion`,
  `variables.horario.cortes`, `variables.reintentos.mikrotik`, `variables.reintentos.smartOLT`,
  `variables.aplicar-cortes`, `variables.opciones-cortes`, `variables.vincular.whatsApp`,
  `variables.config.servidor.correo`, `ajuste.empresa`, `ajuste.forma-pago`, `ajuste.plantillas`.
- Cabecera: "Empresa: <nombre_comercial>".

Otros elementos de layout a documentar tras leerlos: `MainLayout.vue` (601 líneas), `Notifications.vue`,
`BotonJornada.vue`, `ChipPlanSuscripcion.vue`, `EstadoSRI.vue`, `RecordatorioProgress.vue`.

## Cambios del código del 2026-10-13/14 respecto al ZIP del 2026-10-06 ✅ (para N2/N3; no se publica en `docs/`)

Rango: FE `99b38a14`→`afd79206`, BE `3057b787`→`7501da79` (`git diff --stat`: 22 archivos de FE, 24 de BE, 2 migraciones).

- **Límite de peticiones** (`BE:app.module.ts`, `common/guards/app-throttler.guard.ts`): `ThrottlerModule` global con dos
  ventanas (60 peticiones/10 s y 150/min) contadas **por usuario del JWT** y, sin JWT válido, por IP; se salta con la
  cabecera `x-service-token` (= `SERVICE_TOKEN`). Estricto por IP: `login` 10/min, `recuperar-password` 3/min,
  `recuperar-correo` 3/min, `restablecer-password` 5/min. Respuesta 429 "Demasiadas peticiones, espere unos segundos e
  intente de nuevo". `main.ts` añade `trust proxy = 1` (la IP real viene del proxy).
- **Recuperación de acceso** (`BE:auth/auth.service.ts`, `auth.controller.ts`): claves en Redis `recovery:<token>` (15 min,
  un solo uso), `recovery-ref:<ref>` (10 min, "¿Olvidaste tu correo?"), `login:fails:<id>` (15 min) y `login:lock:<id>`
  (24 h; marca el bloqueo automático para que restablecer reactive **solo** esos casos). El correo sale con
  `EmailService.sendDesdeSistema` (variables `MAIL_HOST/PORT/USER/PASSWORD` del entorno, no la configuración de correo
  de la empresa); el enlace usa `DOMINIO` (o la cabecera `Origin` con `STAGE=dev`). Si `DOMINIO` no está definido y la
  petición no trae `Origin`, `recuperar-password` responde 500 (probado 2026-10-21 en la instancia local con curl;
  desde el navegador sí funciona).
- **Cajas NAP principal/secundaria:** columna `caja_principal_id` (migración `CajaPrincipal`); el backend rechaza ciclos
  ("Enlace inválido: la caja elegida depende (directa o indirectamente) de esta misma caja").
- **Facturación a suspendidos:** columna `limiteFacturasImpagasSuspendidos` en `settings` (migración
  `LimiteFacturasImpagasSuspendidos`), validada 1–12 en `create-setting.dto.ts`.
- **Pasarela "Pago Internet":** solo pestaña informativa en el frontend (URL del sistema + `VITE_PAGO_INTERNET_API_KEY`);
  no hay módulo propio en el backend.
- **Instancia local (`ispmax-local-*`):** el frontend arrancó sin `VITE_HOST_KEY_PERMISOS` ni `VITE_COMPANY_NAME` y el
  usuario `admin` sin `permisos` en la BD (el guard rebota todo al inicio); ver `notes/entorno.md`.

## Pendiente de leer (siguiente) ❓

- `src/composables/useRolPermisos.js` y `src/router/auth-guard.ts` (modelo de permisos y mapa nombre→permiso).
- `src/layouts/MainLayout.vue` (cabecera, jornada, notificaciones, perfil, cierre de sesión, inactividad `v-idle`).
- Catálogo de permisos en backend (`roles-and-permisos`) y roles base (`auth/interfaces/valid-roles.ts`).
- Cada módulo de `src/pages/dashboard/**` con su controlador backend.
