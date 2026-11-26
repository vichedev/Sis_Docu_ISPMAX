# Inventario maestro de funcionalidades de ISPMAX

> **Generado** por `scripts/build-inventory.mjs` desde `notes/inventory/*.md` el 2026-11-05. No editar a mano:
> corregir el inventario de origen y volver a generar.
> Fuente: código del ZIP del 2026-10-06 (frontend + backend). Marca de lectura: **completo** = leído de extremo a extremo;
> **parcial** = quedó algo sin leer; ❓ = requiere validación en la UI.
> Cobertura documental de cada fila: ver [docs-coverage.md](docs-coverage.md).

**Total: 596 funcionalidades en 18 dominios.**

| Dominio | Funcionalidades | Parciales | Con ❓ |
|---|---:|---:|---:|
| Acceso, usuarios, roles y panel (`ACC`) | 45 | 0 | 40 |
| Ajustes del sistema (`AJS`) | 39 | 0 | 33 |
| Plantillas, mensajería y pagos (configuración) (`MSG`) | 34 | 0 | 24 |
| Almacén (`ALM`) | 25 | 0 | 16 |
| Automatizaciones y procesos en segundo plano (`AUT`) | 39 | 0 | 29 |
| Clientes (`CLI`) | 34 | 0 | 28 |
| Servicios del cliente, contratos y facturación automática (`SRV`) | 30 | 0 | 29 |
| Cobranza: pagos, promesas, conciliación (`COB`) | 29 | 0 | 24 |
| Bandeja de conversaciones, CRM y avisos a grupos (`BAN`) | 16 | 0 | 9 |
| Bot de WhatsApp y asistente de IA (`BOT`) | 33 | 1 | 7 |
| Conexión con servicios externos (`EXT`) | 77 | 3 | 47 |
| Ventas, facturación electrónica e ingresos/egresos (`VEN`) | 33 | 0 | 25 |
| Incidentes de red y avisos a clientes (`INC`) | 16 | 0 | 14 |
| Portal del cliente (`POR`) | 20 | 0 | 0 |
| SmartOLT y AdminOLT (`OLT`) | 34 | 0 | 34 |
| Routers, redes IP y planes (`RED`) | 31 | 0 | 28 |
| Cajas NAP, mapa y monitoreo (`NET`) | 30 | 0 | 29 |
| Tickets, instalaciones y técnicos (`SOP`) | 31 | 0 | 31 |

Detalle por pantalla (campos, botones, reglas, mensajes): `notes/inventory/<dominio>.md`.

## Acceso, usuarios, roles y panel

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| ACC-001 | Inicio de sesión (login) | `/login` · `login` | pública | FE: `pages/sesion/Login.vue`, `stores/auth-user.ts`, `boot/axios.ts`, `composables/useHel… | completo ❓ |
| ACC-002 | Ciclo de sesión: JWT, expiración, inactividad, cierre y refresco de permisos | transversal (guard, axios, MainLayout) | — | FE: `router/auth-guard.ts`, `router/index.ts`, `boot/axios.ts`, `stores/auth-user.ts`, `l… | completo ❓ |
| ACC-003 | Modelo de roles y permisos: cómo se aplica (guard, menú, backend) | transversal | `SUPER-ADMINISTRADOR` + claves por nombre de ruta | FE: `composables/useRolPermisos.js`, `router/auth-guard.ts`, `layouts/SideBarMenu.vue`, `… | completo ❓ |
| ACC-004 | Roles y Permisos: listado, crear, editar, eliminar rol | `/roles-permisos` · `index.rol` | `index.rol`, `crear.rol`, `editar.rol`, `eliminar.rol` | FE: `pages/dashboard/roles-permisos/IndexPage.vue`, `components/FormRol.vue`, `composable… | completo ❓ |
| ACC-005 | Catálogo de permisos (árbol de selección por grupos) | componente `ListPermisos` (en Roles y en Usuarios) | — | FE: `pages/dashboard/usuarios/components/ListPermisos.vue` y los 6 JSON `pages/dashboard/… | completo ❓ |
| ACC-006 | Usuarios: listado | `/usuarios` · `index.usuario` | `index.usuario`, `crear.usuario`, `editar.usuario`, `eliminar.usuario` | FE: `pages/dashboard/usuarios/IndexPage.vue`, `composables/useUser.js` · BE: `auth/auth.c… | completo ❓ |
| ACC-007 | Usuarios: crear / editar (formulario) | `/usuarios/add` · `crear.usuario`; `/usuarios/edit/:term` · `editar.u… | `crear.usuario`, `editar.usuario` | FE: `pages/dashboard/usuarios/AddUser.vue`, `EditUser.vue`, `components/FormUser.vue`, `c… | completo ❓ |
| ACC-008 | Mi Perfil | `/usuario/edit/:term/profile` · `editar.usuario.profile` | ninguno (guard lo deja pasar) | FE: `pages/dashboard/usuarios/EditUser.vue` + `components/FormUser.vue` (mismo formulario… | completo ❓ |
| ACC-009 | Baja de usuario (borrado lógico) y estado Activo/Inactivo | `/usuarios` (botón papelera) · `PATCH /auth/edit/:id` | `eliminar.usuario`, `editar.usuario` | FE: `usuarios/IndexPage.vue:79-85`, `composables/useHelpers.js:48-67` · BE: `auth/auth.co… | completo ❓ |
| ACC-010 | Restricción de acceso por día y horario | formulario de usuario · login · refresco de permisos | — | FE: `usuarios/components/FormUser.vue:553-684`, `composables/useUser.js:149-185` · BE: `a… | completo ❓ |
| ACC-011 | Dashboard: página, filtros Router/Sucursal y control por permisos | `/` · `dashboard` | `dashboard.*` | FE: `pages/dashboard/panel/IndexPage.vue`, `composables/useDashboard.js`, `components/*.v… | completo ❓ |
| ACC-012 | Tarjeta "Total de clientes / Total de servicios" | `/` | `dashboard.total_clientes` | FE: `panel/components/ClientesAndServicios.vue`, `useDashboard.js:379-389` · BE: `dashboa… | completo ❓ |
| ACC-013 | Tarjeta "Total Facturas Pagadas" | `/` | `dashboard.facturas_pagadas` (+ depende de `dashboard.pagos_mes`) | FE: `TotalFacturasPagadas.vue`, `GraficoVentas.vue:194-282` · BE: `dashboard.service.ts:1… | completo ❓ |
| ACC-014 | Tarjeta "TRANSACCIONES HOY" | `/` | `dashboard.transacciones_hoy` | FE: `TransaccionesHoy.vue`, `useDashboard.js:353-363` · BE: `dashboard.service.ts:476-536… | completo ❓ |
| ACC-015 | Tarjeta "Total Facturas No Pagadas" | `/` | `dashboard.facturas_no_pagadas` (+ depende de `dashboard.pagos_mes`) | FE: `TotalFacturasNoPagadas.vue`, `GraficoVentas.vue:223-242` · BE: `dashboard.service.ts… | completo ❓ |
| ACC-016 | Tarjeta "Resumen del Facturación" | `/` | `dashboard.resumen_facturacion` | FE: `ResumenFacturacion.vue` · BE: `dashboard.service.ts:662-737`. | completo ❓ |
| ACC-017 | Gráfico "Total de pagos por semana/mes" (con filtro de fecha) | `/` | `dashboard.pagos_mes` | FE: `GraficoVentas.vue`, `boot/echarts.js` · BE: `dashboard.service.ts:197-387,432-461`. | completo ❓ |
| ACC-018 | Tabla "Últimos pagos registrados" | `/` | `dashboard.ultimos_pagos` | FE: `UltimosPagos.vue`, `useDashboard.js:327-338` · BE: `dashboard.service.ts:538-605`. | completo ❓ |
| ACC-019 | Tarjeta "Resumen del sistema" | `/` | `dashboard.resumen_sistema` | FE: `ResumenSistema.vue`, `useDashboard.js:365-377` · BE: `dashboard.service.ts:607-649`,… | completo ❓ |
| ACC-020 | Gráfico "Tráfico Clientes — Últimos 7 días" | `/` | `dashboard.resumen_sistema` | FE: `TraficoClientes.vue` · BE: `monitoreo-trafico/monitoreo-trafico.controller.ts:65-71`… | completo ❓ |
| ACC-021 | Tabla "Clientes con mayor consumo" | `/` | `dashboard.resumen_sistema` | FE: `TopConsumidores.vue` · BE: `monitoreo-trafico.controller.ts:73-91`, `monitoreo-trafi… | completo ❓ |
| ACC-022 | Tabla "Monitoreo de Red" en el panel | `/` | `index.monitoreo_red` + ajuste `mostrarMonitoreoDashboard` | FE: `panel/components/MonitoreoRed.vue` (reutiliza `DetalleDispositivo.vue` y `useMonitor… | completo ❓ |
| ACC-023 | Cabecera del layout (bienvenida, rol, tema oscuro, perfil / cambiar de empresa / cerrar s… | `MainLayout.vue` | ninguno | FE: `layouts/MainLayout.vue`, `layouts/ChipPlanSuscripcion.vue`, `layouts/EstadoSRI.vue`,… | completo ❓ |
| ACC-024 | Menú lateral | `SideBarMenu.vue` | `validarPermisos`/`tieneAlguno` por ítem | FE: `layouts/SideBarMenu.vue`, `layouts/MainLayout.vue`, `components/EssentialLink.vue`,… | completo ❓ |
| ACC-025 | Notificaciones (campana) y canal en vivo (WebSocket) | cabecera → campana | ninguno | FE: `layouts/Notifications.vue`, `stores/estados-mantenedor.ts` · BE: `notifications/noti… | completo ❓ |
| ACC-026 | Jornada y ubicación del técnico | cabecera (botón) · latido de ubicación | rol `TECNICO` (no es permiso) | FE: `layouts/BotonJornada.vue`, `composables/useLatidoUbicacion.js`, `composables/useAppI… | completo ❓ |
| ACC-027 | Chip de plan de suscripción / licencia | cabecera; Ajustes → "Licencia" | ninguno | FE: `layouts/ChipPlanSuscripcion.vue`, `layouts/MainLayout.vue`, `pages/dashboard/ajustes… | completo ❓ |
| ACC-028 | Chip "SRI" (estado del servicio) y reenvío automático de comprobantes | cabecera | `company.requiere_facturacion` + facturación electrónica activa | FE: `layouts/EstadoSRI.vue`, `stores/estados-mantenedor.ts`, `layouts/Notifications.vue`,… | completo ❓ |
| ACC-029 | Widget "Enviando recordatorios" (progreso de envío) | flotante en todas las pantallas | ninguno | FE: `layouts/RecordatorioProgress.vue` · BE: `pagos/pagos.controller.ts`, `pagos/pagos.se… | completo ❓ |
| ACC-030 | Empresa: datos, logo, firma electrónica | Ajustes → Empresa → pestaña "Empresa" · `/empresa/edit/:empresa_id` | `index.empresa`, `editar.empresa`, `ajuste.empresa` | FE: `pages/dashboard/ajustes/empresa/IndexPage.vue`, `pages/dashboard/empresas/EditEmpres… | completo ❓ |
| ACC-031 | Sucursales: listado, crear, editar, activar/inactivar, eliminar | Ajustes → Empresa → pestaña "Sucursales" | `index.sucursal`, `crear.sucursal`, `editar.sucursal`, `activar.inact… | FE: `pages/dashboard/sucursales/IndexPage.vue`, `pages/dashboard/sucursales/AddSucursal.v… | completo ❓ |
| ACC-032 | Resolución de la sucursal de cobro (cobros automáticos) | sin UI propia (API) | token de servicio o JWT | FE: `pages/dashboard/clientes/components/ConfigSucursalCobro.vue`, `pages/dashboard/clien… | completo ❓ |
| ACC-033 | Servidor de correo (SMTP): configuración, prueba, interruptor | Ajustes → Mensajería; `/email/edit/:email_id` | `variables.config.servidor.correo`, `editar.correo` | FE: `pages/dashboard/emails/components/FormEmail.vue`, `pages/dashboard/emails/composable… | completo ❓ |
| ACC-034 | "Obtener IP" (herramienta MikroTik; excluida del manual; el endpoint que llama no existe) | `/red/getIp` · `getIp` | ninguno en catálogo (solo SUPER-ADMIN) | FE: `pages/dashboard/red/getIp.vue` · BE: `mikrotik/mikrotik.controller.ts`. | completo ❓ |
| ACC-035 | Parámetros transversales: moneda, país, zona horaria, IVA, facturación electrónica | variables de entorno FE/BE | — | FE: `composables/usePais.js`, `composables/useMoneda.js`, `composables/appTimezone.js`, `… | completo ❓ |
| ACC-036 | Tareas programadas y colas (cortes, facturas, promesas, ingresos/egresos) | endpoints `/programar-queue`, `/aplicar-cortes`, `/generar-facturas`,… | solo `@Auth()` | BE: `app.controller.ts`, `app.service.ts`, `app-queue.processor.ts`, `config/queue.config… | completo ❓ |
| ACC-037 | Logs (API de auditoría) | API `/logs` (UI en Ajustes → Logs, otro dominio) | `ver.logs` (solo FE) | BE: `logs/logs.controller.ts`, `logs/logs.service.ts`, `logs/entities/log.entity.ts`, `lo… | completo ❓ |
| ACC-038 | Actualización del sistema (deploy) | Ajustes → Sistema · `POST /deploy` | solo e-mail fijo en FE; JWT o token de servicio en BE | FE: `pages/dashboard/ajustes/sistema/IndexPage.vue`, `pages/dashboard/ajustes/IndexPage.v… | completo ❓ |
| ACC-039 | Imágenes y archivos estáticos (logo, foto de perfil, SRI, uploads) | `/api/images/:file`, `/api/images-user`, `/api/uploads`, `/api/sri` | públicos | BE: `app.controller.ts`, `app.module.ts`, `companies/companies.controller.ts`, `auth/auth… | completo ❓ |
| ACC-040 | Caché Redis y consistencia (permisos, usuarios, resumen del sistema) | transversal | — | BE: `app.module.ts`, `app.service.ts`, `common/utils/cache-invalidation.service.ts`, `com… | completo ❓ |
| ACC-041 | Recuperar la contraseña por correo (enlace de 15 min) | `/login` → "¿Olvidaste tu contraseña?" · `POST /auth/recuperar-passwo… | pública | FE: `pages/sesion/Login.vue:107-155` · BE: `auth/auth.controller.ts:68-72`, `auth/auth.se… | completo (envío real ❓) |
| ACC-042 | "¿Olvidaste tu correo?": buscar la cuenta por celular o usuario | `/login` (cuadro de recuperación) · `POST /auth/recuperar-correo` | pública | FE: `Login.vue:143-155` · BE: `auth.controller.ts:73-78`, `auth.service.ts:467-492` (`rec… | completo |
| ACC-043 | Bloqueo automático por 5 intentos fallidos y reactivación al restablecer | `POST /auth/login` · `POST /auth/restablecer-password` | pública | BE: `auth/auth.service.ts:372-380` (login), `:411-433` (`registrarIntentoFallido`), `:520… | completo |
| ACC-044 | Página pública de restablecimiento | `/restablecer-password` · `restablecer-password` | pública | FE: `pages/sesion/RestablecerPassword.vue` · BE: `auth.controller.ts:79-84`, `auth.servic… | completo |
| ACC-045 | Límite de peticiones ("Demasiadas peticiones…") | transversal (backend) | — | BE: `app.module.ts:90-100,245` (`ThrottlerModule` + `APP_GUARD`), `common/guards/app-thro… | completo |

## Ajustes del sistema

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| AJS-001 | Panel de Ajustes: tarjetas y accesos | `/ajustes` · `ajustes.index` | ver sección AJS-001 (una por tarjeta) | FE: `pages/dashboard/ajustes/IndexPage.vue` · `layouts/SideBarMenu.vue:419-442` · `router… | completo ❓ |
| AJS-002 | Licencia (diálogo: plan, cupo, facturas de la suscripción) | `/ajustes` → tarjeta "Licencia" | ninguno (solo si `vinculado`) | FE: `ajustes/IndexPage.vue:12-99, 504-674` · `stores/auth-user` (`licenciaInfo` persistid… | completo ❓ |
| AJS-003 | Cortes · Días habilitados para cortes (global) | `/ajustes/servicio` · `ajuste.servicio` | `variables.dias-habilitados` | FE: `ajustes/servicios/IndexPage.vue` · `servicios/components/DiasAplicarCortes.vue` · `e… | completo ❓ |
| AJS-004 | Cortes · Horarios de cortes (global) | idem | `variables.horario.cortes` | FE: `servicios/components/HoraCorte.vue` · `IndexPage.vue:155-158`. BE: `settings.entity.… | completo ❓ |
| AJS-005 | Cortes · Reintentos automáticos + "Aplicar Cortes/Activación" (global) | idem | `variables.reintentos.mikrotik` · `variables.opciones-cortes` · `vari… | FE: `servicios/components/ConfigurarReintentosCortes.vue` · `IndexPage.vue:160-167`. BE:… | completo ❓ |
| AJS-006 | Cortes · Aplicar cortes manualmente | idem | `variables.aplicar-cortes` | FE: `ConfigurarReintentosCortes.vue:51-71, 198-212`. BE: `app.controller.ts:33-60` · `app… | completo ❓ |
| AJS-007 | Cortes · Configuración personalizada por router | idem (selector "Configurar cortes de") | sin permiso propio | FE: `IndexPage.vue:44-56, 86-152` · `servicios/composables/useCorteRouter.js` · `servicio… | completo ❓ |
| AJS-008 | Motor de cortes y reintentos (cron, MikroTik, SmartOLT, AdminOLT, Slack) | — (backend) | — | BE: `app.controller.ts` · `app.service.ts` · `app-queue.processor.ts` · `common/utils/onu… | completo (el push interno a MikroTik `repararRouter` se resume, no se lee entero) ❓ |
| AJS-009 | Facturación · reglas generales, anulación, registro de pagos | `/ajustes/facturacion` · `ajuste.facturacion` | `variables.facturacion` | FE: `ajustes/facturacion/IndexPage.vue` · `facturacion/components/FacturacionPage.vue` ·… | completo ❓ |
| AJS-010 | Facturación · botón "Generar facturas pendientes" | idem | `variables.facturacion` | FE: `FacturacionPage.vue:31-96, 291-328, 448-468`. BE: `app.controller.ts:62-70` · `app.s… | completo ❓ |
| AJS-011 | Facturación · Factus (Colombia/DIAN) | idem, pestaña "Factus" (solo `VITE_PAIS=CO`) | `variables.facturacion` | FE: `ajustes/facturacion/components/FactusConfig.vue` · BE: `facturacion/factus/factus.co… | completo ❓ |
| AJS-012 | Facturación · Tasa BCV (Venezuela) | idem (solo `VITE_PAIS=VE`) | `variables.facturacion` | FE: `facturacion/components/TasaBcvConfig.vue`. BE: `tasa-bcv/tasa-bcv.controller.ts` · `… | completo ❓ |
| AJS-013 | OLTs · Reinicio automático de ONUs (SmartOLT) | `/ajustes/smartolt` · `ajuste.smartolt`, pestaña SmartOLT | `variables.reintentos.smartOLT` | FE: `ajustes/smartOLT/IndexPage.vue:291` · `servicios/components/CronSmartOLT.vue`. BE: `… | completo ❓ |
| AJS-014 | OLTs · Reinicio automático de ONUs (AdminOLT) | idem, pestaña AdminOLT | `variables.reintentos.smartOLT` | FE: `servicios/components/CronAdminOLT.vue` (llamado en `smartOLT/IndexPage.vue:562`). BE… | completo ❓ |
| AJS-015 | OLTs · Perfil TR-069, Tipo de ONU y Mgmt IP por defecto (SmartOLT) | idem, pestaña SmartOLT | sin permiso propio (entra con `variables.reintentos.smartOLT` o `vari… | FE: `ajustes/smartOLT/IndexPage.vue:11-207, 293-508`. Consumidores FE: `Gestion-Red/smart… | completo ❓ |
| AJS-016 | OLTs · Validación de ONUs (SmartOLT / AdminOLT) | idem, ambas pestañas | sin permiso propio | FE: `smartOLT/IndexPage.vue:209-255, 510-607`. BE: `smart-olt/smart-olt.controller.ts:323… | completo ❓ |
| AJS-017 | Base de datos · Campos personalizados | `/ajustes/base-datos` · `ajuste.base-datos`, pestaña | `base-datos.campos` | FE: `ajustes/base-datos/IndexPage.vue` · `base-datos/components/CamposPersonalizados.vue`… | completo ❓ |
| AJS-018 | Base de datos · Eliminar datos (borrado lógico masivo de clientes) | idem (tarjeta dentro de la pestaña Campos personalizados) | `base-datos.campos` | FE: `CamposPersonalizados.vue:135-222, 343-436`. BE: `database/database.controller.ts:11-… | completo ❓ |
| AJS-019 | Base de datos · Cambios masivos de facturación y recordatorios | idem, pestaña | `base-datos.cambios-masivos` | FE: `base-datos/components/CambiosMasivos.vue`. BE: `database/database.controller.ts:20-2… | completo ❓ |
| AJS-020 | Base de datos · Ubicaciones | idem, pestaña | sin permiso propio | FE: `base-datos/components/GestionUbicaciones.vue` · `src/apis/ubicaciones` · `composable… | completo ❓ |
| AJS-021 | Logs · Historial de actividad del sistema | `/ajustes/logs` · `ajuste.logs` | `ver.logs` | FE: `ajustes/logs/IndexPage.vue` · `ajustes/servicios/components/LogsGenerales.vue` (698… | completo ❓ |
| AJS-022 | Sistema · Actualizar Sistema (deploy) | `/ajustes/sistema` · `ajuste.sistema` | cuenta reservada (email fijo) / SUPER-ADMINISTRADOR por URL | FE: `ajustes/sistema/IndexPage.vue` (68 líneas) · `ajustes/IndexPage.vue:386-409` · `rout… | completo ❓ |
| AJS-023 | Instalación · Notificaciones por estado | `/ajustes/plantillas` → pestaña "Instalación" → "Notificaciones por e… | `variables.ver.plantilla.instalacion` | FE: `ajustes/instalacion/IndexPage.vue` · `instalacion/NotificacionesEstadoConfig.vue` ·… | completo ❓ |
| AJS-024 | Instalación · Checklist de instalación | idem → "Checklist instalación" | `variables.ver.plantilla.instalacion` | FE: `instalacion/ChecklistConfig.vue`. Consumidores FE: `instalaciones/EditInstalacion.vu… | completo ❓ |
| AJS-025 | Ticket · Plantilla mensaje cliente | `/ajustes/plantillas` → "Tickets" → "Plantilla mensaje cliente" | `variables.ver.plantilla.ticket` · editar `variables.edita.plantilla.… | FE: `ajustes/ticket/IndexPage.vue` · `ticket/PlantillaMsgCliente.vue` · `ticket/composabl… | completo ❓ |
| AJS-026 | Ticket · Plantilla mensaje técnico | idem → "Plantilla mensaje tecnico" | idem | FE: `ticket/PlantillaMsgTecnico.vue`. BE: `ticket/ticket.service.ts:380-500` · `ticket/va… | completo |
| AJS-027 | Ticket · Firma del ticket (electrónica / manuscrita) | idem → "Firma del ticket" | `variables.ver.plantilla.ticket` (sin permiso de edición propio) | FE: `ticket/FirmaTicket.vue`; consumidor `tickets/composables/useFirmaTicket.js:28-40`, `… | completo ❓ |
| AJS-028 | Ticket · Técnicos de apoyo | idem → "Técnicos de apoyo" | `variables.ver.plantilla.ticket` (sin permiso de edición propio) | FE: `ticket/TecnicosApoyo.vue`. Consumidores FE: `tickets/components/FormTicket.vue:80` ·… | completo ❓ |
| AJS-029 | Empresa · datos fiscales, logo, certificado | `/ajustes/empresa` · `ajuste.empresa`, pestaña "Empresa" | `ajuste.empresa` + `index.empresa` · guardar `editar.empresa` | FE: `pages/dashboard/ajustes/empresa/IndexPage.vue` (l.1-94) · `pages/dashboard/empresas/… | completo ❓ |
| AJS-030 | Empresa · Sucursales | idem, pestaña "Sucursales" | `index.sucursal` · `crear.sucursal` · `editar.sucursal` · `activar.in… | FE: `pages/dashboard/ajustes/empresa/sucursales/IndexPage.vue` (l.1-34) · `pages/dashboar… | completo ❓ |
| AJS-031 | API de ajustes (`/settings`): contrato, defaults y consumidores de cada clave | — (backend) | solo JWT (sin permisos) | BE: `settings/settings.controller.ts` (l.7-56) · `settings/settings.service.ts` (l.15-165… | completo (las 56 columnas de `settings`; los lectores de las plantillas `MSG-*` y de impresión se citan, no se leen a fondo) ❓ |
| AJS-032 | Catálogo de permisos de Ajustes (clave → qué abre) | Roles y Permisos → grupo "Ajustes" | — | FE: `pages/dashboard/usuarios/permisos/gestion-variables-permisos.json` (l.1-351) · `page… | completo ❓ |
| AJS-033 | Facturación · Pasarela "Pago Internet" (pestaña informativa con URL del sistema y API key) | `/ajustes/pasarelas-pago` → pestaña "Pago Internet" | mismos permisos que Formas de pago (`ajuste.forma-pago`) | FE: `ajustes/pasarelas-pago/IndexPage.vue` (`TAB_PAGO_INTERNET`), `components/PagoInterne… | completo ❓ |
| AJS-034 | Facturación · Tasa BCV: "Recordatorio de pago: enviar el valor del plan" (solo Venezuela) | `/ajustes/facturacion` → Tasa BCV | `variables.facturacion` | FE: `facturacion/components/TasaBcvConfig.vue:7,21,125-137` · BE: `tasa-bcv/dto/tasa-bcv.… | completo ❓ |
| AJS-101 | Cobros y promesas: promesas de pago (plazo, límites, canales, solo titular) | `/ajustes/cobros-promesas` · `ajuste.cobros` | `ajuste.cobros` o `bot.config.promesas` | FE: `pages/dashboard/ajustes/cobros-promesas/IndexPage.vue` · BE: `settings/entities/sett… | completo |
| AJS-102 | Cobros y promesas: antigüedad máxima del comprobante de pago | misma pantalla | ídem |  | completo (parte del bot: ❓) |
| AJS-103 | Cobros y promesas: ventas y traslados por WhatsApp (cobertura y costos) | misma pantalla | ídem |  | completo (parte del bot: ❓) |
| AJS-104 | Empresa → Cuentas bancarias (cuentas de recepción; "Dársela al cliente") | `/ajustes/empresa` → Empresa → Cuentas bancarias | `editar.empresa` (editar) | FE: `pages/dashboard/empresas/EditEmpresa.vue:46-67`, `components/CuentasBancarias.vue` ·… | completo (parte del bot: ❓) |
| AJS-105 | Empresa → Régimen SRI (RIMPE, agente de retención, contribuyente especial) | `/ajustes/empresa` → Datos de la empresa | `editar.empresa` | FE: `components/FormEmpresa.vue:323-405`, `composables/useEmpresa.js` (`OPCIONES_REGIMEN_… | completo |

## Plantillas, mensajería y pagos (configuración)

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| MSG-001 | Catálogo maestro de plantillas editables (nombre, canal, evento, variables) | Ajustes › Plantillas (+ Contratos, Tickets, Instalación) | ver §MSG-002 |  | completo |
| MSG-002 | Contenedor "Plantillas" y acceso | `/ajustes/plantillas` · `ajuste.plantillas` | `ajuste.plantillas` + `variables.ver.*` | FE `pages/dashboard/ajustes/plantillas/IndexPage.vue`, `components/*`, `composables/usePl… | completo ❓ |
| MSG-003 | Plantilla · Recordatorio de pago (+ Probar, ▶ Ejecutar ahora) | pestaña "Recordatorio de pago" | `variables.ver.recordatorio.pago` / `variables.edita.recordatorio.pag… | FE `…/plantillas/components/RecordatorioPago.vue`, `WaTemplateControl.vue`, `TablaVariabl… | completo ❓ |
| MSG-004 | Plantilla · Mensaje de Bienvenida | pestaña "Mensaje de Bienvenida" | `variables.ver.mensaje.bienvenida` / `variables.edita.mensaje.bienven… | FE `…/components/MensajeBienvenida.vue`, `…/clientes/components/modals/ModalMessageWelcom… | completo ❓ |
| MSG-005 | Plantilla · Aviso de pagos recibidos (servicio / libre) | pestaña "Aviso de pagos recibidos" | `variables.ver.pago.recibido` / `variables.edita.pago.recibido` | FE `…/components/AvisoPagoRecibido.vue`; BE `pagos/notificar-cobro-queue.processor.ts`, `… | completo |
| MSG-006 | Plantilla · Promesa de pago | pestaña "Promesa de pago" | `variables.ver.promesa.pago` / `variables.edita.promesa.pago` | FE `…/components/PromesaPago.vue`; BE `promesas-pago/promesas-pago-notificacion.service.t… | completo |
| MSG-007 | Formato de impresión de pagos (ticket/recibo) + impresora térmica | pestaña "Formato de impresion de pagos" | `variables.ver.plantilla.impresion.pagos` / `variables.edita.plantill… | FE `…/plantillas/components/ImpresionPagos.vue` (1190 líneas); BE `pagos/formato-impresio… | completo (FE); BE solo preview ❓ |
| MSG-008 | Plantillas · Tickets (mensaje cliente/técnico, firma del ticket, técnicos de apoyo) | pestaña "Tickets" | `variables.ver.plantilla.ticket` / `variables.edita.plantilla.ticket` | FE `ajustes/ticket/{IndexPage,PlantillaMsgCliente,PlantillaMsgTecnico,FirmaTicket,Tecnico… | completo |
| MSG-009 | Plantillas · Aviso Contrato / Aviso Documento (mensaje) | pestaña "Aviso Contrato" | `variables.ver.plantilla.mensaje.contrato` / `variables.edita.plantil… | FE `ajustes/contratos/{IndexPage,AvisoContrato,AvisoDocumento}.vue`; BE `contratos/contra… | completo |
| MSG-010 | Plantilla Documento (.docx de contrato) + Variables.pdf + vista previa | pestaña "Plantilla Documento" | `variables.ver.plantilla.documentos.contrato` / `variables.agrega.…`… | FE `…/components/{PlantillaDocumento,FormPlantilla}.vue`, `composables/usePlantillas.js`,… | completo ❓ |
| MSG-011 | Formato de Ticket (.docx) | pestaña "Formato de Ticket" | `variables.ver.plantilla.documentos.contrato` (+ edita.documentos) | FE `…/components/PlantillaTicket.vue` (reutiliza `FormPlantilla.vue`); BE `plantillas/*`… | completo |
| MSG-012 | Plantilla · Cargo Recurrente | pestaña "Cargo Recurrente" | `variables.ver.cargo.recurrente` / `variables.edita.cargo.recurrente`… | FE `…/components/AvisoCargoRecurrente.vue`; BE `servicios-recurrente/servicios-recurrente… | completo |
| MSG-013 | Plantillas · Instalación (notificaciones por estado + checklist) | pestaña "Instalación" | `variables.ver.plantilla.instalacion` (⚠ no está en el catálogo) | FE `ajustes/instalacion/{IndexPage,NotificacionesEstadoConfig,ChecklistConfig}.vue`; BE `… | completo |
| MSG-014 | Control "WhatsApp Oficial" por plantilla (aprobación en Meta, sincronizar, vincular aprob… | dentro de cada pestaña | sin permiso propio | FE `…/components/WaTemplateControl.vue`; BE `cloud-api/cloud-api.controller.ts:200-248`,… | completo ❓ |
| MSG-015 | Contenedor Ajustes › Mensajería | `/ajustes/mensajeria` · `ajuste.mensajeria` | `variables.vincular.whatsApp` / `variables.config.servidor.correo` | FE `pages/dashboard/ajustes/mensajeria/IndexPage.vue`, `components/{WhatsappCloudApi,Mens… | completo ❓ |
| MSG-016 | WhatsApp No oficial (Baileys): vincular por QR, cerrar sesión | Mensajería › WhatsApp › "No oficial" | `variables.vincular.whatsApp` |  | completo (gateway externo no leído) ❓ |
| MSG-017 | WhatsApp Oficial (Cloud API vía Dualhook): credenciales, webhook, overflow, límites | Mensajería › WhatsApp › "Oficial" | `variables.vincular.whatsApp` | FE `…/mensajeria/components/WhatsappCloudApi.vue`; BE `cloud-api/cloud-api.controller.ts`… | completo ❓ |
| MSG-018 | Selección de canal y reglas de envío (interruptor "Usar WhatsApp…", canal activo, overrid… | Mensajería + diálogos de envío | `variables.vincular.whatsApp` |  | completo |
| MSG-019 | Servidor de correo (SMTP) y prueba | Mensajería › "Datos del servidor correo" | `variables.config.servidor.correo` | FE `pages/dashboard/emails/components/FormEmail.vue`, `composables/useEmail.ts`, `EditEma… | completo ❓ |
| MSG-020 | Mensajes Masivos · Nuevo envío | Mensajería › Mensajes Masivos › "Nuevo envío" | sin permiso propio | FE `…/mensajeria/components/MensajesMasivos.vue`, `mensajes-masivos/NuevoEnvio.vue` (1031… | completo ❓ |
| MSG-021 | Mensajes Masivos · Historial (cancelar / reanudar) | pestaña "Historial" | sin permiso propio |  | completo |
| MSG-022 | Mensajes Masivos · Mensajes enviados (detalle por destinatario, reenviar, eliminar) | pestaña "Mensajes enviados" | sin permiso propio |  | completo ❓ |
| MSG-023 | Contratos (BE): ciclo de vida, API y generación del PDF (.docx → LibreOffice) | Cliente › Documentos › Listado de Contratos (ver SRV-010/011) + Plant… | `cliente.contrato.index/agregar/editar/eliminar/descargar/notificacio… | FE: `Contratos_Pdf/Contratos.vue`, `FormContrato.vue`, `clientes/composables/useContratos… | completo ❓ |
| MSG-024 | Notificar contrato / documento al cliente | Cliente › Documentos › icono Enviar Notificación | `cliente.contrato.notificacion` · `cliente.documento.notificacion` | FE: `NotificacionContratoModal.vue` (parámetro `tipo` = `contrato`\|`documento`), `src/co… | completo ❓ |
| MSG-025 | Firma de Contratos: configuración del proveedor (Dátil) | `/ajustes/firma-electronica` · `ajuste.firma-electronica` | tile: `variables.ver.plantilla.*contrato*` + `ajuste.plantillas`; rut… | FE: `ajustes/firma-electronica/IndexPage.vue`, `components/DatilConfig.vue`, `src/composa… | completo ❓ |
| MSG-026 | Envío a firmar (contratos) y aviso de firma completada (webhook) | Cliente › Documentos › Listado de Contratos › "Enviar a firmar" | sin permiso propio (se ve con `cliente.contrato.index`) | FE: `Contratos_Pdf/Contratos.vue:57-247`, `EnviarAFirmarDialog.vue`, `src/composables/use… | completo ❓ |
| MSG-027 | Certificado .p12 de la empresa (SRI): carga, validación, vencimiento | Ajustes › Empresa (cruce) + banner en cabecera | `ajuste.empresa` / `index.empresa` | FE: `empresas/components/FormEmpresa.vue`, `empresas/EditEmpresa.vue`, `empresas/composab… | completo ❓ |
| MSG-028 | Pasarelas de Pagos (contenedor, "Cobrar con", pestaña Pago Internet) | `/ajustes/pasarelas-pago` · `ajuste.pasarelas-pago` | tile: `index.forma-pago`/`index.detalle-forma-pago` + `ajuste.forma-p… | FE: `pasarelas-pago/IndexPage.vue`, `components/{PayphoneConfig,DlocalGoConfig,PagoIntern… | completo ❓ |
| MSG-029 | PayPhone: credenciales, comprobación, vigencia del enlace | pestaña "PayPhone" | idem | FE: `PayphoneConfig.vue` · BE: `pasarelas-pago.controller.ts:130-167`, `dto/credenciales.… | completo ❓ |
| MSG-030 | dLocal Go: credenciales, país, sandbox | pestaña "dLocal Go" | idem | FE: `DlocalGoConfig.vue` · BE: `pasarelas-pago.controller.ts:130-167`, `dto/credenciales.… | completo ❓ |
| MSG-031 | Webhook de pasarelas y asiento automático del pago | `POST /api/pasarelas-pago/webhook` | público (firma HMAC) | BE: `pasarelas-pago/pasarelas-pago.controller.ts:28-40, 207-221`, `pasarelas-pago.service… | completo (config); flujo de cobro = otro agente ❓ |
| MSG-032 | Formas de pago | Ajustes › Formas de pagos › "Formas de pago" | `index.forma-pago`, `crear.`, `editar.`, `activar.inactivar.`, `elimi… | FE: `ajustes/formas-pago/IndexPage.vue`, `formas-pago/{IndexPage,AddRol,EditRol}.vue`, `f… | completo ❓ |
| MSG-033 | Detalle de formas de pago (bancos/cuentas) | Ajustes › Formas de pagos › "Detalle formas pago" | `index.detalle-forma-pago`, `crear.`, `editar.`, `activar.inactivar.`… | FE: `detalle-formas-pago/{IndexPage,AddRol,EditRol}.vue`, `components/FormFormaPago.vue`,… | completo ❓ |
| MSG-034 | Uso de formas de pago en "Registrar pago" y pagos automáticos | Registrar pago / modales de pago | — |  | completo (lado catálogo) ❓ |

## Almacén

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| ALM-001 | Modelo del almacén: producto vs servicio vs equipo vs accesorio vs material; stock, preci… | (transversal) Menú Almacén | — | FE: `layouts/SideBarMenu.vue`, `router/routes.ts:21-25,45-55,117-121,447-457` · BE: `prod… | completo ❓ |
| ALM-002 | Productos y Servicios: listado, filtros, columnas, activar/inactivar, eliminar | `/productos` · `index.productos` | `index.productos`, `activar.inactivar.productos`, `editar.productos`,… | FE: `productos/IndexPage.vue`, `productos/composables/useProducts.js`, `productos/BtnImpo… | completo ❓ |
| ALM-003 | Productos y Servicios: alta/edición (formulario) | diálogo "Agregar/Editar Producto/Servicio" | `crear.productos`, `editar.productos` | FE: `productos/components/FormProduct.vue`, `productos/composables/useProducts.js`, `comp… | completo ❓ |
| ALM-004 | Productos: Ajustar stock (con motivo y log) | diálogo "Ajustar stock" | `ajustar.stock` | FE: `productos/IndexPage.vue:69-105` · BE: `products/products.controller.ts:51-60`, `prod… | completo ❓ |
| ALM-005 | Productos: importar/plantilla/exportar Excel | botón Excel de `/productos` | (sin permiso propio) | FE: `productos/BtnImportacion.vue`, `productos/components/ModalCargarExcel.vue` · BE: `pr… | completo ❓ |
| ALM-006 | Compras: listado, filtros, detalle, anular, exportar Excel | `/compras/:fecha?` · `index.compras` | `index.compras`, `anular.compra`, `crear.compra` | FE: `compras/IndexPage.vue`, `components/DetalleProducts.vue` · BE: `buys/buys.controller… | completo ❓ |
| ALM-007 | Compras: registrar compra | `/compras/add` · `crear.compra` | `crear.compra` | FE: `compras/AddCompra.vue`, `composables/useProduct.js` · BE: `buys/buys.controller.ts:2… | completo ❓ |
| ALM-008 | Equipos: listado, filtros y acciones por fila | `/equipos` · `index.equipos` (tabla "Equipos") | `index.equipos`, `crear.equipo`, `editar.equipo`, `eliminar.equipo`,… | FE: `equipos/IndexPage.vue`, `equipos/composables/useEquipos.js`, `equipos/components/{Fo… | completo ❓ |
| ALM-009 | Equipos: alta/edición (formulario) | diálogo "Agregar/Editar Equipo" | `crear.equipo`, `editar.equipo` | FE: `equipos/components/FormEquipo.vue`, `equipos/composables/useEquipos.js` · BE: `equip… | completo ❓ |
| ALM-010 | Equipos: vincular / desvincular a servicio de cliente (comodato o venta) | diálogo "Vincular equipo a servicio" | `vincular.equipo` | FE: `equipos/components/VincularEquipo.vue`, `equipos/composables/useVincularEquipo.js` ·… | completo ❓ |
| ALM-011 | Equipos: historial e "instalación asignada" | diálogos "Historial del Equipo" e "Instalación Asignada" | `ver.equipo` (historial); ninguno (instalación) | FE: `equipos/components/HistorialEquipo.vue`, `equipos/components/InstalacionEquipoModal.… | completo ❓ |
| ALM-012 | Equipos: plantilla, exportar e importar Excel | menú Excel de la tabla "Equipos" | (sin permiso propio) | FE: `equipos/IndexPage.vue:145-180`, `equipos/components/ImportarEquiposModal.vue` · BE:… | completo ❓ |
| ALM-013 | Accesorios: listado, alta/edición, eliminar | `/equipos` (tabla "Accesorios") | `crear.accesorio`, `editar.accesorio`, `eliminar.accesorio` | FE: `equipos/IndexPage.vue`, `equipos/components/FormAccesorio.vue`, `equipos/composables… | completo ❓ |
| ALM-014 | Accesorios: historial de uso | diálogo "Historial del Accesorio" | (sin permiso propio) | FE: `equipos/components/HistorialAccesorio.vue` · BE: `equipos/equipos.service.ts:240-345… | completo ❓ |
| ALM-015 | Accesorios: plantilla, exportar e importar Excel | menú Excel de la tabla "Accesorios" | (sin permiso propio) | FE: `equipos/IndexPage.vue:182-217`, `equipos/components/ImportarAccesoriosModal.vue` · B… | completo ❓ |
| ALM-016 | Materiales en instalaciones y soportes: reserva de equipos y consumo de accesorios (backe… | pestañas Materiales en Instalaciones y Tickets | `tickets.edit` (ticket); sin permiso propio en la pestaña de instalac… | BE: `materiales/materiales.service.ts`, `materiales/materiales.module.ts`, `instalaciones… | completo ❓ |
| ALM-017 | Proveedores: listado, activar/inactivar, eliminar | `/proveedores` · `index.proveedores` | `index.proveedores`, `editar.proveedor`, `activar.proveedor`, `inacti… |  | completo |
| ALM-018 | Proveedores: alta/edición (formulario) | diálogo "Nuevo/Editar Proveedor" | `crear.proveedor`, `editar.proveedor` |  | completo |
| ALM-019 | Categorías: listado, alta/edición, eliminar | `/categories` · `index.categories` | `index.category`, `crear.category`, `editar.category`, `eliminar.cate… |  | completo |
| ALM-020 | Componentes compartidos: `DetalleProducts`, `SelectProduct`, `DragAndDropUploadImage`, `u… | (transversal: Compras, Ventas, otros) | — |  | completo |
| ALM-021 | Catálogo y comprobación de permisos del dominio Almacén | Roles y permisos · menú · guardia de rutas | todas las claves anteriores |  | completo |
| ALM-101 | Compras: cargar la compra desde el XML de la factura del proveedor | `/compras/add` → Cargar XML de la factura | `crear.compra` | FE: `pages/dashboard/compras/AddCompra.vue`, `components/DialogImportarXml.vue` · BE: `bu… | completo |
| ALM-102 | Compras: cargar desde el PDF (RIDE) de la factura (clave SRI o IA) | mismo botón, si hay IA | `crear.compra` | BE: `buys/compras-pdf.service.ts`, `buys/buys.controller.ts` (`GET importacion/opciones`,… | completo |
| ALM-103 | Compras: botón/chip de retención en el listado | `/compras` · columna acciones | `compras.retencion.emitir` | FE: `pages/dashboard/compras/IndexPage.vue` (bloque "Retenciones (Ecuador / SRI)", column… | completo |
| ALM-104 | Campo de fecha DD/MM/AAAA con calendario (`InputFecha`) | Agregar compra, Emitir retención | — | FE: `components/InputFecha.vue`; lo usan Agregar compra (Fecha de compra), Emitir retenci… | completo |

## Automatizaciones y procesos en segundo plano

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| AUT-001 | Creación mensual de facturas (cron del día 1) | Ajustes → Facturación (🧾 Facturación) | `variables.facturacion` |  | completo ❓ |
| AUT-002 | Creación anticipada de facturas (dentro del job de corte; base "Por mes" / "Por fecha de… | Cliente → Facturación/Pagos → Configuración (campo "Creación Anticipa… | `variables.facturacion` |  | completo ❓ |
| AUT-003 | "Generar facturas pendientes" (disparo manual de AUT-001+002) | Ajustes → Facturación → "Generar facturas ahora" | `variables.facturacion` |  | completo |
| AUT-004 | Facturación automática (emisión electrónica programada, cron por minuto) | Cliente → Facturación/Pagos → "Facturación Automática:"; Grupos de fa… | permisos del cliente/grupo |  | completo ❓ |
| AUT-005 | Emisión del comprobante electrónico en cola `-factura` y envío al cliente | (sin pantalla propia; estado en Facturas/Transacciones) | — |  | completo ❓ |
| AUT-006 | Reenvío automático de comprobantes no autorizados (cada 2 h) | (sin pantalla) | — |  | completo |
| AUT-007 | Motor de corte, suspensión y reactivación (`repararYSetearEstadosServicios`) | Ajustes → Configuración de Cortes; estado en Clientes | `variables.dias-habilitados`, `variables.horario.cortes`, `variables.… |  | completo ❓ |
| AUT-008 | Agenda de cortes por router y recuperación de cortes perdidos por reinicio | Ajustes → Configuración de Cortes ("Configurar cortes de") | idem |  | completo |
| AUT-009 | Reintentos automáticos de routers que fallan en el corte | Ajustes → Configuración de Cortes ("🔧 Configuración de reintentos au… | `variables.reintentos.mikrotik` |  | completo |
| AUT-010 | Corte/activación de ONU (SmartOLT/AdminOLT) y verificación con reintentos | Ajustes → Configuración de Cortes ("Aplicar Cortes/Activación:") | `variables.opciones-cortes` |  | completo |
| AUT-011 | Promesas de pago: estado automático y efecto en el corte | Promesas de pago; ficha del cliente | `promesa-pago.index` |  | completo |
| AUT-012 | Recalcular el estado de un servicio tras un evento (`GET /activar-desactivar-servicio/:id… | (sin pantalla; lo llaman muchas pantallas) | — |  | completo |
| AUT-013 | Cobro por pasarela: webhook → abono automático → reconexión | Cobros por pasarela | `cobros-pasarela.index` |  | completo ❓ |
| AUT-014 | Registro de pagos por HTTP (integraciones/bots/cajas externas) | (sin pantalla; token `x-registro-pagos-token`) | — |  | completo |
| AUT-015 | Recordatorios de pago (cron, hasta 3 horarios diarios) | Ajustes → Plantillas → "Recordatorio de pago"; Cliente → Notificacion… | `variables.ver.recordatorio.pago`, `variables.edita.recordatorio.pago` |  | completo ❓ |
| AUT-016 | Recibo/aviso de pago recibido al cliente (cola `notificar-cobro`) | Ajustes → Plantillas → "Aviso de pagos recibidos" | `variables.ver.pago.recibido` |  | completo |
| AUT-017 | Mensaje de bienvenida al crear cliente | Ajustes → Plantillas → "Mensaje de Bienvenida" | `variables.ver.mensaje.bienvenida` |  | completo |
| AUT-018 | Aviso de promesa de pago al cliente | Ajustes → Plantillas → "Promesa de pago" | `variables.ver.promesa.pago` | BE: `promesas-pago/promesas-pago-notificacion.service.ts` · `promesas-pago/promesas-pago.… | completo ❓ |
| AUT-019 | Avisos automáticos de instalaciones y tickets | Ajustes → Plantillas → Instalación / Tickets | `variables.ver.plantilla.instalacion`, `variables.ver.plantilla.ticke… | BE: `instalaciones/instalaciones.service.ts` · `instalaciones/defaults/notif-templates.ts… | completo ❓ |
| AUT-020 | Envío masivo de mensajes (cola con intervalo) | Ajustes → Mensajería → Mensajes Masivos | — (icono Mensajería: `variables.config.servidor.correo` o `variables.… | BE: `mensajes-masivos/mensajes-masivos.controller.ts` · `mensajes-masivos/mensajes-masivo… | completo ❓ |
| AUT-021 | Estado de entrega de WhatsApp Oficial (webhook Meta/Dualhook) y tope diario "overflow" | Ajustes → Mensajería | `variables.vincular.whatsApp` | BE: `cloud-api/cloud-api.controller.ts` · `cloud-api/cloud-api.service.ts` · `companies/e… | completo ❓ |
| AUT-022 | Respaldos de BD — no existen en el backend (cola `-respaldo-bd` huérfana) | (solo el aviso de Ajustes → Base de datos → "Eliminar datos") | — | BE: `app.module.ts` · `scripts/deploy.sh` (no es código de `src/`) · FE: `pages/dashboard… | completo ❓ |
| AUT-023 | Heartbeat de routers (cada 5 min) con auto-reparación y aviso a Slack | Gestión de Red → Routers (insignia "Sin conexión"; botón "Verificar c… | `ping.router` o `reparar.router` (solo el botón) | BE: `router/router-monitor.service.ts` · `router/router.controller.ts` · `router/entities… | completo ❓ |
| AUT-024 | Vigilancia de equipos por ping (cada minuto) | Gestión de Red → Monitoreo de Red | `index.monitoreo_red` | BE: `monitoreo-dispositivos/monitoreo-dispositivos-collector.service.ts` · `monitoreo-dis… | completo ❓ |
| AUT-025 | Alertas de caída/recuperación (campanita + correo/WhatsApp agrupado) | Monitoreo de Red → "Alertas" | `index.monitoreo_red` | BE: `monitoreo-dispositivos/monitoreo-dispositivos-notifier.service.ts` · `monitoreo-disp… | completo ❓ |
| AUT-026 | Detección de estado de conexión de clientes (cada 5 min) | Mapa (color y filtro "Sin conexión"); Cliente → Consumo ("Disponibili… | `index.mapa` · `servicio.index` | BE: `monitoreo-trafico/monitoreo-conexion.service.ts` · `monitoreo-trafico/monitoreo-traf… | completo ❓ |
| AUT-027 | Recolección y consolidación de tráfico (5 min / hora / día) | Cliente → Consumo; Dashboard (Tráfico Clientes, Clientes con mayor co… | `servicio.index` (Consumo) | BE: `monitoreo-trafico/monitoreo-trafico-collector.service.ts` · `monitoreo-trafico/monit… | completo ❓ |
| AUT-028 | Colas MikroTik: editar plan, lista address-list, nombre de cliente, modo de control de ve… | Planes de servicio; Routers; Cliente | — | BE: `mikrotik/mikrotik-queue.processor.ts` · `mikrotik/mikrotik-edit-name-queue.processor… | completo ❓ |
| AUT-029 | Reinicio programado de ONUs SmartOLT | Ajustes → OLTs → SmartOLT ("🕓 Configuración de reinicio automático d… | `variables.reintentos.smartOLT` | BE: `smart-olt/smart-olt.service.ts` · `smart-olt/reinicio-smartolt-queue.processor.ts` ·… | completo ❓ |
| AUT-030 | Reinicio programado de ONUs AdminOLT | Ajustes → OLTs → AdminOLT | `variables.reintentos.smartOLT` | BE: `admin-olt/admin-olt.service.ts` · `admin-olt/reinicio-adminolt-queue.processor.ts` ·… | completo ❓ |
| AUT-031 | Marcado automático de ONU inválida | Cliente → Servicios (icono de advertencia junto al SN); Ajustes → OLT… | — | BE: `smart-olt/smart-olt.service.ts` · `smart-olt/smart-olt.controller.ts` · `admin-olt/a… | completo ❓ |
| AUT-032 | Tasa BCV (cron diario a la hora configurada, def. 00:05; solo `PAIS=VE`) | Ajustes → Facturación → "💱 Tasa BCV (Venezuela)" | `variables.facturacion` | BE: `tasa-bcv/tasa-bcv.service.ts` · `tasa-bcv/tasa-bcv.controller.ts` · `tasa-bcv/tasa-b… | completo ❓ |
| AUT-033 | Ingresos/egresos recurrentes (cron diario a las 00:00) | Ingresos / Egresos | `index.ingresos_egresos` | BE: `ingresos-egresos/ingresos-egresos.queue.processor.ts` · `ingresos-egresos/ingresos-e… | completo ❓ |
| AUT-034 | Firma electrónica: webhook de estado y descarga de firmados | Cliente → Documentos → Contratos; Tickets (diálogo de firma) | — | BE: `firma-electronica/firma-tramites.service.ts` · `firma-electronica/signature-gateway.… | completo (aviso, estado y descarga; el envío está en las fichas de contratos y tickets) ❓ |
| AUT-035 | Notificaciones en vivo (no hay gateways socket.io en este backend) | Campanita | — | BE: `notifications/notifications.service.ts` · `notifications/notifications.controller.ts… | completo ❓ |
| AUT-036 | Limpieza de colas y caché al arrancar y al guardar la pestaña "Recordatorio de pago" (inc… | (invisible) | — | BE: `app.service.ts` · `app.controller.ts` · `app.module.ts` · `settings/settings.service… | completo ❓ |
| AUT-037 | Retención de datos de monitoreo (clientes 8/45/400 días; interfaces de router 8/60/400; l… | (invisible) | — | BE: `monitoreo-trafico/monitoreo-trafico-collector.service.ts` · `monitoreo-trafico/monit… | completo ❓ |
| AUT-038 | Caché del resumen del cliente ("fecha máxima de pago"; sin caducidad por tiempo) | Clientes (columnas Dia de Corte, Deuda Actual…); Mapa (ventana del cl… | — | BE: `app.service.ts` · `app.controller.ts` · `app-queue.processor.ts` · `common/utils/fec… | completo ❓ |
| AUT-039 | Tareas de arranque varias (módulos que actúan en `onModuleInit`) | (invisible) | — | BE: `main.ts` · `app.controller.ts` · `app.service.ts` · `smart-olt/smart-olt.service.ts`… | completo ❓ |

## Clientes

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| CLI-001 | Listado de clientes: filtros superiores, búsqueda y paginación | `/clientes` (`index.clientes`) · menú Gestion de Clientes → Clientes | `index.clientes` | FE: `pages/dashboard/clientes/IndexPage.vue`, `composables/useClientesIndex.js`, `composa… | completo ❓ |
| CLI-002 | Columnas y filtros por columna de la tabla | `/clientes` | (ninguno específico) | FE: `composables/useClientesIndex.js:65-410`, `cell_renders/*.vue`, `composables/translat… | completo ❓ |
| CLI-003 | Selección múltiple y acciones masivas | `/clientes` | `cliente.activar.inactivar`, `retirar.cliente`, `eliminar.cliente` | FE: `IndexPage.vue:85-157`, `:783-849` (selección), `:956-1023` (`accionMasiva`) · BE: `c… | completo ❓ |
| CLI-004 | Importar Excel / Descargar Plantilla / Exportar Clientes | `/clientes` → botón Excel | (sin permiso en el front) | FE: `IndexPage.vue:851-904` (descarga), `components/modals/ModalCargarExcel.vue` · BE: `m… | completo ❓ |
| CLI-005 | Acciones por fila (Editar, Suspender/Activar, Retirar, Eliminar, Ver detalles) | `/clientes` columna Acciones | `cliente.edit`, `cliente.activar.inactivar`, `retirar.cliente`, `elim… | FE: `cell_renders/ActionCellRenderer.vue` · BE: `customers.controller.ts:324-332`, `:343-… | completo ❓ |
| CLI-006 | Ver detalles → "Listado de Servicios" (reactivar servicio retirado / eliminar definitivam… | diálogo desde `/clientes` | `detalles.cliente` | FE: `pages/dashboard/clientes/RecuperarCliente.vue`, `cell_renders/ActionCellRenderer.vue… | completo ❓ |
| CLI-007 | Estados del cliente y del servicio; motor de corte/reactivación automática | transversal | — | BE: `customers/entities/customer.entity.ts`, `customers/entities/ServicioCliente.entity.t… | completo (efecto visual ❓) ❓ |
| CLI-008 | Crear cliente — paso "Datos Personales" | `/clientes/add` (`crear.cliente`) | `crear.cliente` | FE: `AddCliente.vue`, `components/FormCliente.vue` (stepper), `components/DatosPersonales… | completo ❓ |
| CLI-009 | Crear cliente — paso "Facturación y Notificaciones" | `/clientes/add` | `crear.cliente` | FE: `components/FactAndNot.vue`, `components/ConfigNotifications.vue`, `composables/useCl… | completo ❓ |
| CLI-010 | Crear cliente — paso "Servicios" (router, plan, IP, PPPoE, NAP, Wi-Fi) | `/clientes/add` | `crear.cliente` | FE: `components/ServicioInternet.vue`, `components/editar/Servicios/FormRedIpv6.vue` (CLI… | completo ❓ |
| CLI-011 | Guardado del alta: qué crea el backend y qué puede fallar | `POST /api/customers` | — | FE: `useCliente.js:558-635` (`onSubmit`) · BE: `customers.service.ts:254-531` (`create`),… | completo ❓ |
| CLI-012 | Mensaje de bienvenida (automático y manual) | alta / `ModalMessageWelcome` | `servicio.bienvenida` (fila), `variables.edita.mensaje.bienvenida` | FE: `components/modals/ModalMessageWelcome.vue`, `composables/useCliente.js:600-610`, `sr… | completo ❓ |
| CLI-013 | Editar cliente: estructura y pestañas | `/clientes/edit/:client_id` (`cliente.edit`) | `cliente.edit` + `resumen.index`… | FE: `EditCliente.vue`, `components/editar/IndexPage.vue`, `composables/useEditCliente.js`… | completo ❓ |
| CLI-014 | Pestaña Resumen (datos del cliente, resumen de notificaciones, info adicional) | `?view=resumen` | `resumen.index`, `resumen.editar_cliente`, `resumen.notificaciones` | FE: `components/editar/ResumenPage.vue`, `ResumenNotificaciones.vue`, `InfoAdicionalCampo… | completo ❓ |
| CLI-015 | Facturación/Pagos › Configuración del cliente (FactAndNot en modo edición) | `?view=facturacion` → Configuración | `cliente.factura.configuracion.index`, `cliente.factura.configuracion… | FE: `components/editar/ConfiguracionPage.vue` (envoltorio de `FactAndNot.vue` con `edit=t… | completo ❓ |
| CLI-016 | Recordatorios de pago por cliente | Configuración → Notificaciones | idem | FE: `components/ConfigNotifications.vue` · BE: `pagos/notificar-recortatorio-pago-queue.p… | completo ❓ |
| CLI-017 | Facturación automática por servicio | Configuración | idem | FE: `components/ConfigFacturacionAutomatica.vue` · BE: `facturacion-automatica` (otro mód… | completo ❓ |
| CLI-018 | Facturar a tercero (datos de facturación distintos) | Configuración / banner de cobro | idem | FE: `components/ConfigFacturacionTercero.vue`, `components/BannerFacturacionTercero.vue`… | completo ❓ |
| CLI-019 | Pagos automáticos: sucursal de cobro (bot / pasarelas) | Configuración | idem | FE: `components/ConfigSucursalCobro.vue` · BE: `PATCH /customers/servicio/:id/sucursal-fa… | completo ❓ |
| CLI-020 | Imágenes del servicio (carga de archivos) | paso "Imagenes" (vista de servicio) | — | FE: `components/editar/StepUploadImages.vue`, `src/components/DragAndDropUploadImage.vue`… | completo ❓ |
| CLI-021 | Recursos del cliente (equipos y accesorios) | componente `RecursosCliente` | (ninguno; pestaña `servicio.index`) | FE: `components/editar/RecursosCliente.vue` (+ `VincularEquipoClienteModal.vue` y `Select… | completo ❓ |
| CLI-022 | Facturas del cliente (pestaña Facturas / PagoItem) | `?view=facturacion` → Facturas | `cliente.factura.index` … | FE: `components/editar/IndexFacturas.vue`, `PagoItem.vue`, `composables/useEditCliente.js… | completo ❓ |
| CLI-023 | Modales de cobro y facturación (pago, nueva factura, factura libre, etc.) | `components/modals` | ver sección | FE: `pages/dashboard/clientes/components/modals/*.vue` (`ModalPago`, `ModalNuevaFactura`,… | completo ❓ |
| CLI-024 | Cobro por enlace (pasarela) | `CobroEnlaceDialog` | `cliente.factura.add` | FE: `components/editar/CobroEnlaceDialog.vue`, `src/composables/usePasarelasPago.js`, `sr… | completo ❓ |
| CLI-025 | Suspender / activar servicio (manual) | `/clientes` y pestaña Servicios | `cliente.activar.inactivar` | FE: `ActionCellRenderer.vue:309-349`, `composables/useServicios.js:116-152` · BE: `PUT /c… | completo |
| CLI-026 | Retirar servicio / cliente | `/clientes` | `retirar.cliente` | FE: `ActionCellRenderer.vue:351-382`, `useServicios.js:154-202` · BE: `DELETE /customers/… | completo ❓ |
| CLI-027 | Eliminar cliente | `/clientes` | `eliminar.cliente` | FE: `ActionCellRenderer.vue` (diálogo `ELIMINAR`) · BE: `DELETE /customers/:id` (`custome… | completo |
| CLI-028 | Cambio de plan, IP, router, MAC, PPPoE de un servicio | formulario "Servicios" en edición | `servicio.editar` (CLI2) | FE: `components/ServicioInternet.vue:767-889` (`actualizarServicio`), `components/FormCli… | completo ❓ |
| CLI-029 | API backend `customers`: catálogo de endpoints y guardas | `/api/customers/` | — | BE: `customers.controller.ts`, `customers.service.ts`, `customer-queue.processor.ts`, `cu… | completo |
| CLI-030 | Validaciones de cédula/RUC, correo, teléfono y coordenadas (transversal) | alta/edición | — |  | completo |
| CLI-031 | Límite de clientes por suscripción | alta / importación / reactivación | — | BE: `customers.service.ts:88-176`, `companies/master-suscripcion.service.ts` · FE: `Modal… | completo ❓ |
| CLI-032 | Campos personalizados del cliente (`custom_data`) | alta, resumen, listado | — | FE: `DatosPersonales.vue:89-101,415-470`, `ResumenPage.vue`, `InfoAdicionalCampos.vue`, `… | completo ❓ |
| CLI-033 | Columna «Fact. Automática» del listado | `/clientes` | — | FE: `composables/useClientesIndex.js:58-100,366-381` (`etiquetaFacturacionAutomatica`, `d… | completo (el backend no la envía ⚠️) |
| CLI-034 | Estado «Retirado» al exportar (y qué hace la importación con él) | `/clientes` → Excel | — | FE: `IndexPage.vue:851-904` (`downloadFile`), `components/modals/ModalCargarExcel.vue:349… | completo |

## Servicios del cliente, contratos y facturación automática

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| SRV-001 | Listado de servicios de internet del cliente (tabla, filtro, "Ver retirados") | `/clientes/edit/:client_id?view=servicios` · pestaña "Servicios" | `cliente.edit` + `servicio.index` | FE: `clientes/components/editar/ServiciosPage.vue`, `clientes/composables/useServicios.js… | completo ❓ |
| SRV-002 | Agregar servicio a un cliente (incluye alta desde una instalación) | modal "Nuevo Servicio" (botón "Agregar Servicio") | `servicio.agregar` | FE: `ServiciosPage.vue:133-174`, `clientes/components/FormCliente.vue`, `FactAndNot.vue`,… | completo ❓ |
| SRV-003 | Editar / actualizar un servicio | modal "Editar Servicio" (icono lápiz) | `servicio.editar` | FE: `ServiciosPage.vue:476-482`, `FormCliente.vue`, `FactAndNot.vue`, `ServicioInternet.v… | completo (campos generales del formulario resumidos; detalle en CLI1) ❓ |
| SRV-004 | Suspender / activar un servicio (manual) | icono power / check en la fila | `servicio.activar.suspender` | FE: `useServicios.js:116-152` · BE: `customers.controller.ts:325-332`, `customers.service… | completo ❓ |
| SRV-005 | Retirar un servicio, ver retirados, restaurar y eliminar definitivamente | iconos "Retirar", "Ver información / Restaurar", "Eliminar definitiva… | `servicio.retirar` (restaurar y eliminar: sin permiso en FE) | FE: `useServicios.js:154-202,204-246,248-268` · BE: `customers.controller.ts:353-374`, `c… | completo ❓ |
| SRV-006 | Enviar mensaje de bienvenida | icono mano "Enviar mensaje de bienvenida" | `servicio.bienvenida` | FE: `clientes/components/modals/ModalMessageWelcome.vue`, `composables/useWaCanal.js` · B… | completo ❓ |
| SRV-007 | Vincular / desvincular ONU (SmartOLT y AdminOLT) desde el servicio | iconos SmartOLT / "ADM" en la fila | `servicio.vincular.onu` | FE: `editar/Servicios/VincularOnu.vue`, `VincularOnuAdminOLT.vue`, `ServiciosPage.vue:124… | completo (detalle de la ONU en otro dominio) ❓ |
| SRV-008 | Equipos vinculados y accesorios usados del cliente; vincular/desvincular equipo | bloque inferior de la pestaña Servicios | sin permiso en FE (visible con `servicio.index`) | FE: `editar/RecursosCliente.vue`, `editar/VincularEquipoClienteModal.vue`, (muerto) `edit… | completo ❓ |
| SRV-009 | Selector de servicios del cliente (compartido por varias pestañas) | `q-select` en Documentos, Cargos, Facturas, Logs, Consumo, Equipos | — | FE: `editar/SelectorServiciosCliente.vue`, estado compartido en `composables/useEditClien… | completo |
| SRV-010 | Contratos: listado, crear, editar y eliminar | pestaña "Documentos" › "Listado de Contratos" | `cliente.contrato.index/agregar/editar/eliminar` | FE: `clientes/components/editar/Servicios/DocumentPage.vue`, `clientes/components/editar/… | completo ❓ |
| SRV-011 | Contrato: ver / imprimir PDF generado desde plantilla | icono impresora "Ver / Imprimir Contrato PDF" | `cliente.contrato.descargar` | FE: `clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue` (281-345) · BE: `c… | completo ❓ |
| SRV-012 | Documentos (contrato firmado en PDF): subir, editar, descargar, eliminar | pestaña "Documentos" › "Listado de Documentos" | `cliente.documento.index/agregar/editar/descargar/eliminar` | FE: `clientes/components/editar/Servicios/Contratos_Pdf/Documentos.vue`, `clientes/compon… | completo ❓ |
| SRV-013 | Enviar notificación de contrato o de documento (WhatsApp / correo) | icono avión "Enviar Notificación" | `cliente.contrato.notificacion` · `cliente.documento.notificacion` | FE: `clientes/components/editar/Servicios/Contratos_Pdf/NotificacionContratoModal.vue`, `… | completo ❓ |
| SRV-014 | Firma electrónica del contrato (enviar a firmar, vista previa, enlace, estado) | botones "Enviar a firmar", "Ver cómo se enviaría a firmar", icono láp… | sin permiso en FE (depende de disponibilidad del gateway) | FE: `clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue` (62-220), `cliente… | completo ❓ |
| SRV-015 | Ciclo de vida del contrato (resumen transversal de SRV-010…014) | — | — |  | completo ❓ |
| SRV-016 | Cargos recurrentes: listado, agregar, editar, ver detalle, cambiar estado, eliminar | `/clientes/edit/:id?view=facturacion` › sub-pestaña "Cargos" | `cliente.factura.configuracion.index` (acciones sin permiso propio) | FE: `clientes/components/editar/FacturacionPagos.vue`, `clientes/components/editar/Servic… | completo ❓ |
| SRV-017 | Cargos recurrentes: estados, aplicación a las facturas, cuotas, saldo a favor / en contra | tabla de Cargos + generador mensual | — | FE: `clientes/components/editar/Servicios/Recurrentes/TableServiciosRecurrentes.vue`, `cl… | completo ❓ |
| SRV-018 | Cargo recurrente: enviar comprobante / mensaje al cliente | icono avión "Enviar Mensaje" | sin permiso en FE | FE: `clientes/components/modals/ModalEnviarComprobante.vue`, `composables/useWaCanal.js`… | completo ❓ |
| SRV-019 | Grupos de facturación: crear, agregar/quitar servicios, deshacer | sub-pestaña "Grupos" | `cliente.factura.configuracion.index` (hace de permiso de edición) | FE: `clientes/components/editar/GruposFacturacion.vue`, `clientes/components/editar/Terce… | completo ❓ |
| SRV-020 | Grupo: "Facturar a tercero (todo el grupo)" | panel expandible dentro de cada grupo | ídem | FE: `clientes/components/editar/TerceroGrupo.vue`, `clientes/components/BannerFacturacion… | completo ❓ |
| SRV-021 | Grupo: "Facturación automática del grupo" | panel expandible dentro de cada grupo | ídem | FE: `clientes/components/editar/ConfigAutomaticaGrupo.vue`, `composables/useFacturacion.j… | completo ❓ |
| SRV-022 | "Cobrar grupo": cobro grupal con UNA factura electrónica y "Confirmar pago" de lo ya fact… | pestaña Facturas › botón "cobrar grupo" | `cliente.factura.add` | FE: `clientes/components/modals/ModalCobroGrupo.vue`, `clientes/components/editar/IndexFa… | completo ❓ |
| SRV-023 | Facturación automática por servicio: emisión de factura electrónica "sin pago" (config +… | Facturación/Pagos › Configuración › "Facturación Automática:" | `cliente.factura.configuracion.index/edit` | FE: `clientes/components/ConfigFacturacionAutomatica.vue`, `clientes/components/FactAndNo… | completo ❓ |
| SRV-024 | Generación mensual de facturas (cron día 1, creación anticipada, "Generar facturas pendie… | Ajustes › Facturación + campos de Facturación del servicio | `variables.facturacion` (ajuste) · config por servicio sin permiso ap… | FE: `clientes/components/FactAndNot.vue`, `ajustes/facturacion/components/FacturacionPage… | completo ❓ |
| SRV-025 | Meses adelantados (pago por adelantado de varios meses) | modal de pago › "Meses Adelantados" | `cliente.factura.add` | FE: `clientes/components/modals/ModalPago.vue` (63-224), `registrar-pago/components/PayCo… | completo ❓ |
| SRV-026 | Consumo del cliente: tráfico, disponibilidad, tiempo real, ping | `/clientes/edit/:id?view=consumo` · pestaña "Consumo" | `servicio.index` | FE: `clientes/components/editar/Consumo/ConsumoPage.vue` · BE: `monitoreo-trafico/monitor… | completo ❓ |
| SRV-027 | Mapa de clientes | `/mapa-clientes` (`mapa-clientes.index`), sin entrada de menú | permiso inexistente en el catálogo → solo SUPER-ADMINISTRADOR | FE: `mapa-clientes/IndexPage.vue` · BE: `router/router.controller.ts` (76-82), `router/ro… | completo ❓ |
| SRV-028 | Logs del cliente (eventos del servicio) | pestaña "Logs" | `cliente.logs.index` | FE: `clientes/components/logs/IndexpageLogs.vue`, `clientes/components/logs/composables/u… | completo ❓ |
| SRV-029 | Tickets del cliente (pestaña) | pestaña "Tickets" | `cliente.ticket.*` | FE: `clientes/components/editar/Servicios/TicketsPage.vue`, `tickets/components/FormTicke… | completo (el módulo Tickets es de otro inventario) ❓ |
| SRV-030 | N° de contrato del servicio (número correlativo) | columna "N° Contrato" y campo "N° de contrato" | `servicio.index` / `cliente.factura.configuracion.edit` | FE: `clientes/components/FactAndNot.vue`, `clientes/components/editar/ServiciosPage.vue`,… | completo ❓ |

## Cobranza: pagos, promesas, conciliación

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| COB-001 | Registrar pago: buscar cliente y elegir la factura | `/registrar-pago` (pestaña "Registrar pago") · `registrar.pago` | `registrar.pago` (entrada a la ruta), `registrar.promesa-pago` | FE: `pages/dashboard/registrar-pago/TabsIndex.vue`, `components/FormPromisePay.vue`, `com… | completo ❓ |
| COB-002 | Registrar pago: formulario de cobro (forma de pago, monto, descuento, nota, N° transacció… | idem | `registrar.pago` | FE: `registrar-pago/components/PayComponent.vue`, `DetalleFacturaPago.vue`, `composables/… | completo ❓ |
| COB-003 | Qué ocurre al guardar un pago (backend `PATCH /pagos/:id`: estado de factura, abono, log,… | — | solo JWT en backend | BE: `pagos/pagos.controller.ts:174-184`, `pagos/pagos.service.ts:495-715` (`update`), `pa… | completo ❓ |
| COB-004 | Reactivación automática del servicio tras el pago (MikroTik / OLT) | — | — | BE: `app.controller.ts:24-30`, `app.service.ts:484-499`, `app-queue.processor.ts:68-74, 1… | completo (motor de cortes: ramas de pago; el resto de cortes lo cubre otro inventario) ❓ |
| COB-005 | Saldo restante y excedente → siguiente factura (cargos "saldo") | idem | — | FE: `PayComponent.vue:392-415`, `clientes/composables/useEditCliente.js:353-387`, `Detall… | completo ❓ |
| COB-006 | Pago de meses adelantados | idem | — | FE: `PayComponent.vue:81-237, 979-1070` · BE: `pagos/pagos.controller.ts:148-152`, `pagos… | completo ❓ |
| COB-007 | Confirmar el pago de una factura electrónica ya emitida ("sin pago") | idem | `registrar.pago` | FE: `registrar-pago/components/ConfirmarPagoSinPago.vue` · BE: `grupos-facturacion/grupos… | completo ❓ |
| COB-008 | Acciones tras pagar en Registrar pago: estado, descargar, imprimir, anular, editar, agreg… | idem | ninguna (sin `validarPermisos`) | FE: `registrar-pago/components/AccionesPago.vue`, `clientes/components/modals/ModalEditar… | completo ❓ |
| COB-009 | Anular / revertir un pago (abono, pago completo, factura del mes, nota de crédito) | Registrar pago · Transacciones · ficha del cliente | `pagos-registrados.eliminar` / `finanzas.pagos-registrados.eliminar`… | FE: `registrar-pago/components/AccionesPago.vue:72-109`, `transacciones/ActionCellRendere… | completo ❓ |
| COB-010 | Editar un pago registrado (modal "Editar Pago") | Transacciones · Registrar pago · ficha del cliente | `pagos-registrados.editar` / `finanzas.pagos-registrados.editar` / `c… | FE: `clientes/components/modals/ModalEditarPago.vue` · BE: `PATCH /pagos/{id}` (COB-003). | completo ❓ |
| COB-011 | Promesas de pago: listado | `/promesas-pago` · pestaña "Promesas de pago" | `promesa-pago.index` | FE: `promesas-pago/IndexPage.vue`, `composables/usePromise.js`, `components/ModalHistoria… | completo ❓ |
| COB-012 | Promesas de pago: crear y editar | pestaña "Registrar pago" (Tipo de pago = Promesa de pago) · modal del… | `registrar.promesa-pago`, `promesa-pago.crear`, `promesa-pago.editar` | FE: `registrar-pago/components/FormPromisePay.vue:406-533`, `registrar-pago/composables/u… | completo ❓ |
| COB-013 | Promesas de pago: cancelar, notificar al cliente, historial y cliente reincidente | listado / modal | `promesa-pago.eliminar` | FE: `IndexPage.vue:93-150, 506-560`, `components/ModalHistorialPromesas.vue`, `composable… | completo ❓ |
| COB-014 | Promesas de pago: ciclo de vida (activa/cumplida/incumplida/cancelada) y efecto sobre el… | — | — | BE: `promesas-pago/entities/promesas-pago.entity.ts:7-68`, `promesas-pago.service.ts:65-9… | completo ❓ |
| COB-015 | Transacciones (pagos registrados): listado, filtros, columnas, "ver hoy" | `/transacciones/:showToday?` · `pagos-registrados.index` | `pagos-registrados.index`, `pagos-registrados.ver-otros` | FE: `transacciones/IndexPage.vue`, `composables/useTransation.js`, `composables/translate… | completo ❓ |
| COB-016 | Transacciones: acciones por fila y reportes (PDF / Excel) | idem | `pagos-registrados.imprimir/editar/eliminar` | FE: `transacciones/ActionCellRenderer.vue`, `composables/useTransation.js:236-432` · BE:… | completo ❓ |
| COB-017 | Recibo / comprobante de pago: PDF, impresión térmica y envío al cliente | varias | `*.imprimir`, `cliente.factura.imprimir` | FE: `transacciones/composables/useTransation.js:360-432` · BE: `pagos/pagos.controller.ts… | completo (plantillas PDF: solo entradas/salidas) ❓ |
| COB-018 | Cobros por pasarela: pantalla de control (estados, asentado, duplicados) | `/cobros-pasarela` · `cobros-pasarela.index` | `cobros-pasarela.index` | FE: `cobros-pasarela/IndexPage.vue`, `components/PanelCobros.vue`, `src/composables/usePa… | completo ❓ |
| COB-019 | Cobros por pasarela: generar y enviar el enlace de cobro | ficha del cliente → "Generar enlace de cobro" | `cliente.factura.add` | FE: `clientes/components/editar/{IndexFacturas,CobroEnlaceDialog}.vue`, `clientes/compone… | completo ❓ |
| COB-020 | Cobros por pasarela: webhook del gateway y asentado automático del abono | — (sistema) | firma HMAC | BE: `pasarelas-pago/pasarelas-pago.controller.ts:207-221`, `pasarelas-pago.service.ts:74-… | completo ❓ |
| COB-021 | Conciliación bancaria: pantalla y flujo de uso | `/conciliacion-bancaria` · `conciliacion-bancaria.index` | `conciliacion-bancaria.index/conciliar/exportar/eliminar` |  | completo |
| COB-022 | Conciliación bancaria: lectura del PDF con IA, cupo mensual y reglas de emparejamiento | — | — |  | completo |
| COB-023 | API externa de registro de pagos (bots / recaudadores) | `/api/registro-pagos` | token de integración o JWT |  | completo |
| COB-024 | Tasa BCV (solo instancias Venezuela) | Ajustes › Facturación | `variables.facturacion` |  | completo |
| COB-025 | Diagnóstico: "el cliente pagó y sigue pendiente / suspendido" | — | — |  | completo (análisis de código) |
| COB-026 | Recordatorios de pago (envío automático, ejecución bajo demanda y envío manual por factur… | Ajustes › Plantillas › "Recordatorio de pago"; ficha del cliente › Fa… | `variables.ver/edita.recordatorio.pago`, `cliente.send.recordatorio` | BE: `pagos/notificar-recortatorio-pago-queue.processor.ts` · `pagos/pagos.service.ts:60-1… | completo ❓ |
| COB-027 | Límite de facturas sin pagar para dejar de facturar a suspendidos | Ajustes › Facturación › "Facturas sin pagar para dejar de crear" | `variables.facturacion` | FE: `FacturacionPage.vue`, `empresas/composables/useSetting.js:11,188` (defecto 1) · BE:… | completo ❓ |
| COB-028 | "Día de pago al cobrar": interruptor del modal de pago (reemplaza el campo por cliente) | `/registrar-pago` · modal de pago del perfil del cliente | `registrar.pago` · `cliente.factura.add` (modal) | FE: `registrar-pago/components/PayComponent.vue:86-89, 378, 563, 1077-1103` · `clientes/c… | completo ❓ |
| COB-029 | Vencimiento por defecto de la factura manual con días de gracia (`ModalNuevaFactura`) | Perfil del cliente › Facturación/Pagos › Agregar factura | `cliente.factura.servicio` | FE: `clientes/components/modals/ModalNuevaFactura.vue:77, 231-262`. | completo ❓ |

## Bandeja de conversaciones, CRM y avisos a grupos

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| BAN-001 | Acceso al CRM WhatsApp: círculo de Ajustes, pestaña Mensajes y aviso "Tu plan no incluye… | Ajustes → CRM WhatsApp · `/ajustes/bot?view=messages` | `bot.messages.ver` (más uno de `bot.dashboard.ver`, `bot.colas.ver`,… | FE: `pages/dashboard/ajustes/bot/IndexPage.vue`, `pages/dashboard/ajustes/IndexPage.vue`,… | completo ❓ |
| BAN-002 | Lista de chats: pestañas Bandeja/Abiertos/Cerrados, búsqueda, filtro por cola, paginación… | pestaña Mensajes | `bot.messages.ver`, `bot.messages.ver-todos`, `bot.messages.aceptar-r… | FE: `message/IndexMessages.vue`, `composables/useMessages.js`, `composables/useChatPrefs.… | completo ❓ |
| BAN-003 | Marcas de cada chat en la lista: Pide asesor, espera, Lo empezó la empresa, bot silenciad… | pestaña Mensajes | `bot.messages.ver` | FE: `message/IndexMessages.vue`, `message/whatsapp-chat.css`, `composables/useLlamadasIa.… | completo ❓ |
| BAN-004 | Aceptar, rechazar, ver sin marcar como leído, cerrar y reabrir un chat | lista y cabecera del chat | `bot.messages.aceptar-rechazar`, `bot.messages.cerrar`, `bot.messages… | FE: `composables/useMessages.js` · BE: ninguno. | completo ❓ |
| BAN-005 | Responder: texto con formato, emoji, adjuntos, nota de voz, firma, citar, editar y elimin… | caja de respuesta del chat | `bot.messages.enviar`, `bot.messages.editar-mensaje`, `bot.messages.e… | FE: `IndexMessages.vue`, `composables/useMessages.js`, `composables/useAudioRecorder.js`,… | completo ❓ |
| BAN-006 | WhatsApp Oficial: ventana de 24 h, "Enviar plantilla" y recordatorio de abrir la app del… | cabecera y barra de respuesta del chat | `bot.messages.enviar` | FE: `IndexMessages.vue:184-263, 2397-2482`, `useMessages.js:855-870` · BE: `cloud-api/clo… | completo ❓ |
| BAN-007 | Nuevo chat con un cliente | botón Nuevo · diálogo "Nuevo chat" | `bot.messages.nuevo-chat` | FE: `message/NuevoChatDialog.vue`, `composables/useMessages.js:510-537` · BE: ninguno pro… | completo |
| BAN-008 | Derivar un chat a otro usuario | botón Derivar · diálogo "Derivar chat" | `bot.messages.derivar` | FE: `message/DerivarChatDialog.vue`, `message/IndexMessages.vue:797-801, 1943-1955`, `com… | completo |
| BAN-009 | Interruptores del bot: por chat, apagado general, "Que responda el bot" y horas de silenc… | cabecera del chat, barra de la lista, Configuraciones | `bot.config.horario` (apagado general y horas de silencio) | FE: `IndexMessages.vue:1471-1506, 1904-1922, 2131-2153`, `useMessages.js:390-481`, `bot/c… | completo ❓ |
| BAN-010 | Números sin bot (y privados) | botón de la barra del bot · diálogo "Números sin bot" | ninguno propio en el panel | FE: `message/NumerosSinBotDialog.vue`, `message/IndexMessages.vue:1480-1483, 2887` · BE:… | completo |
| BAN-011 | Bloquear y desbloquear números en WhatsApp | cabecera del chat · diálogo "Números bloqueados" | `bot.messages.bloquear` | FE: `IndexMessages.vue:1096-1184, 1972-1998`, `NumerosBloqueadosDialog.vue` · BE: `cloud-… | completo |
| BAN-012 | Barra del cliente en el chat (estado del servicio, deuda, ONU) y botón Ver cliente | cabecera del chat | `bot.messages.ver-cliente` | FE: `ResumenClienteChat.vue`, `IndexMessages.vue:811-838, 984-1055, 2758-2797`, `clientes… | completo |
| BAN-013 | Resumen IA del chat y respuesta sugerida al operador | tarjeta sobre el chat · botón ✨ | `bot.messages.enviar` (sugerencia); sin permiso propio (resumen) | FE: `ResumenIaCard.vue`, `SugerenciaIa.vue`, `composables/resumenIa.js`, `composables/use… | completo |
| BAN-014 | Llamadas de WhatsApp en el panel: contestar, rechazar, espera, llamar, pasar al asistente | aviso flotante · botón Llamar · Mensajería (interruptor) | `bot.messages.llamadas`, `bot.messages.enviar`, `variables.vincular.w… | FE: `composables/useLlamadas.js`, `useLlamadasGlobal.js`, `useLlamadasIa.js`, `LlamadasWi… | completo ❓ |
| BAN-015 | Avisos a grupos de WhatsApp | Ajustes → Mensajería → tarjeta "Avisos a grupos de WhatsApp" | `variables.vincular.whatsApp` (entrar) + uno de `bot.config.ver`, `ti… | FE: `mensajeria/IndexPage.vue:302-308`, `AvisosGrupos.vue`, `composables/gruposCache.js`… | completo ❓ |
| BAN-016 | Perfil del negocio en WhatsApp (número dedicado) | Ajustes → Mensajería → WhatsApp → Oficial | `variables.vincular.whatsApp` | FE: `PerfilNegocioWa.vue` · BE: `cloud-api/cloud-api.controller.ts:198-217`, `cloud-api/c… | completo |

## Bot de WhatsApp y asistente de IA

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| BOT-001 | CRM WhatsApp: acceso, pestañas, permisos y licencia | `/ajustes/bot` (círculo CRM WhatsApp de Ajustes) | `bot.dashboard.ver`, `bot.messages.ver`, `bot.colas.ver`, `bot.vouche… | FE: `pages/dashboard/ajustes/bot/IndexPage.vue` · BE: `companies/companies.controller.ts`… | completo ❓ |
| BOT-002 | Resumen del bot (indicadores, gráficos, tiempos de atención, llamadas) | pestaña Resumen | `bot.dashboard.ver` | FE: `bot/components/dashboard/{IndexDashboard,FiltroFechas,TiemposAtencion,ConsumoIa,Enca… | completo ❓ |
| BOT-003 | Comprobantes que recibe el bot (listado, filtros, detalle, ir al chat, eliminar) | pestaña Comprobantes | `bot.vouchers.ver`, `.ver-detalle`, `.ir-chat`, `.eliminar` | FE: `bot/components/vouchers/IndexVouchers.vue`, `bot/composables/useVouchers.js`. | completo ❓ |
| BOT-004 | Colas: listado y diseñador de flujos (menú, pasos, formulario, simulador, cola para técni… | pestaña Colas | `bot.colas.ver`, `.crear`, `.editar`, `.eliminar` | FE: `bot/components/colas/IndexColas.vue`, `colas/editor/` (EditorFlujo, LienzoFlujo, Pan… | completo ❓ |
| BOT-005 | Conocimiento del asistente (artículos, categorías, imágenes, importar, volver a leer) | pestaña Conocimiento | `bot.config.ver` (+ asistente activo o token de IA) | FE: `bot/components/conocimiento/IndexConocimiento.vue`. | completo ❓ |
| BOT-006 | Preguntas que el asistente no supo responder | pestaña Conocimiento | `bot.config.ver` | FE: `bot/components/conocimiento/PreguntasSinRespuesta.vue`. | completo |
| BOT-007 | Plantillas del bot (plantillas que necesita el bot y plantillas de chat) | pestaña Plantillas | `bot.config.ver` (solo WhatsApp Oficial) | FE: `bot/components/plantillas/{PlantillasDelBot,IndexPlantillasChat}.vue`; BE: `cloud-ap… | completo |
| BOT-008 | Configuraciones: horario, pausa, mensaje fuera de horario, cierre por inactividad, silenc… | pestaña Configuraciones · tarjeta Horario de atención del bot | `bot.config.ver` + `bot.config.horario` | FE: `bot/components/config/IndexConfiguraciones.vue`. | completo |
| BOT-009 | Configuraciones: cómo atiende el bot (menú, IA que guía, asistente) y presentación del as… | tarjeta Inteligencia artificial | `bot.config.ver` + `bot.config.cobro-ia` | FE: `bot/components/config/IndexConfiguraciones.vue` | completo |
| BOT-010 | Configuraciones: comprobantes con IA, registro automático, saldo y envío del recibo | tarjeta Inteligencia artificial | `bot.config.cobro-ia` | FE: `bot/components/config/IndexConfiguraciones.vue` | completo |
| BOT-011 | Configuraciones: llamadas con el asistente (voz) | tarjeta Inteligencia artificial | `bot.config.cobro-ia` | FE: `bot/components/config/IndexConfiguraciones.vue` | completo |
| BOT-012 | Configuraciones: protección de datos, resumen con IA, sugerencias, aviso de espera y devo… | tarjeta Inteligencia artificial | `bot.config.cobro-ia` | FE: `bot/components/config/IndexConfiguraciones.vue` | completo |
| BOT-013 | Simulador del asistente | botón Probar el asistente | `bot.config.ver` | FE: `bot/components/config/SimuladorAsistente.vue`. | completo |
| BOT-014 | Ajustes › Inteligencia artificial (token de OpenAI, modelo, dónde se usa, consumo) | `/ajustes/inteligencia-artificial` | `ajuste.ia` o `bot.config.ver` | FE: `ajustes/inteligencia-artificial/IndexPage.vue`, `bot/components/dashboard/ConsumoIa.… | completo |
| BOT-015 | Credenciales de IA que el bot pide al backend | `GET/POST /ia/bot/credenciales` (sin pantalla) | token de servicio | BE: `ia/ia.controller.ts:39-48`, `ia/solo-service-token.guard.ts`, `ia/ia.service.ts:95-1… | completo |
| BOT-016 | Ajustes › Cobros y promesas (reglas de la empresa para el bot y el portal) | `/ajustes/cobros-promesas` | `ajuste.cobros` o `bot.config.promesas` | FE: `ajustes/cobros-promesas/IndexPage.vue` · BE: `settings/` (`PATCH /settings/:id`), `p… | completo ❓ |
| BOT-017 | Promesa de pago pedida por el cliente al bot o al portal | sin pantalla (`/promesas-pago/solicitar-bot`, portal) | token de servicio | BE: `promesas-pago/promesas-pago.service.ts:911-1150`, `promesas-pago.controller.ts`. | completo |
| BOT-018 | Cobro por el bot: registrar el pago de un comprobante | sin pantalla (`POST /cobro-bot/cobrar`) | token de servicio | BE: `pagos/cobro-bot/cobro-bot.service.ts`, `reparto.util.ts`, `banco.util.ts`, `dto/cobr… | completo |
| BOT-019 | Comprobante que paga varias cuentas (cobro repartido) | sin pantalla (`POST /cobro-bot/cobrar-repartido`) | token de servicio | BE: `cobro-bot.service.ts:544-656`, `dto/cobrar-repartido-bot.dto.ts`. | completo |
| BOT-020 | Comprobante repetido o en revisión; pago reportado que queda como promesa | `GET /cobro-bot/comprobante/:referencia`, `POST /promesas-pago/regist… | token de servicio | BE: `cobro-bot.service.ts:658-718`, `promesas-pago/promesas-pago.service.ts:790-877`. | completo |
| BOT-021 | Quién es el titular: número de la ficha, protección de datos, búsqueda por nombre y por t… | sin pantalla (`/cobro-bot/titular`, `buscar-por-nombre`, `candidatos-… | token de servicio | BE: `pagos/cobro-bot/titular.util.ts`, `cobro-bot.service.ts:165-215`, `ventas-bot.servic… | completo |
| BOT-022 | Enlace de pago en línea | sin pantalla (`GET /cobro-bot/enlace-pago/:cedula`) | token de servicio | BE: `pagos/cobro-bot/enlace-pago-bot.service.ts:35-130`. | completo |
| BOT-023 | Recibo, factura electrónica y XML de pagos ya hechos | sin pantalla (`POST /cobro-bot/comprobantes-pago`) | token de servicio | BE: `pagos/cobro-bot/comprobantes-bot.service.ts`, `dto/comprobantes-pago-bot.dto.ts`. | completo |
| BOT-024 | Diagnóstico "no tengo internet" y reportes técnicos del cliente | sin pantalla (`/cobro-bot/diagnostico`, `/reportes`) | token de servicio | BE: `pagos/cobro-bot/diagnostico-bot.service.ts`. | completo |
| BOT-025 | Reinicio remoto del equipo | sin pantalla (`POST /cobro-bot/reiniciar-equipo`) | token de servicio | BE: `gestiones-bot.service.ts:554-620`. | completo |
| BOT-026 | Cambio de nombre y contraseña del Wi‑Fi | sin pantalla (`POST /cobro-bot/cambiar-wifi`) | token de servicio | BE: `gestiones-bot.service.ts:360-523`, `wifi-datos.util.ts`, `dto/gestiones-bot.dto.ts:8… | completo |
| BOT-027 | Cambio de plan: opciones y datos de retención | sin pantalla (`GET /cobro-bot/cambio-plan/:cedula`) | token de servicio | BE: `pagos/cobro-bot/cambio-plan-bot.service.ts`. | completo |
| BOT-028 | Ventas: cobertura, solicitud de instalación y datos precargados | sin pantalla (`/cobro-bot/cobertura`, `solicitud-instalacion`) | token de servicio | BE: `pagos/cobro-bot/ventas-bot.service.ts:84-320`. | completo ❓ |
| BOT-029 | Traslado y baja o suspensión temporal | sin pantalla (`/cobro-bot/traslado`, `solicitud-baja`) | token de servicio | BE: `ventas-bot.service.ts:520-640`. | completo |
| BOT-030 | Gestiones del titular: correo y celular, facturar a tercero, historial de pagos, contrato | sin pantalla (`/cobro-bot/actualizar-contacto`, `facturar-tercero`, `… | token de servicio | BE: `gestiones-bot.service.ts:69-358`. | completo |
| BOT-031 | Gráfica de tráfico de hoy | sin pantalla (`GET /trafico-bot/:cedula`) | token de servicio | BE: `monitoreo-trafico/trafico-bot.controller.ts`, `trafico-bot.service.ts:32-90`. | completo |
| BOT-032 | Planes que ofrece el bot: "Mostrar en el bot" y tarjeta con imagen | Gestión de Red › Internet (planes) | `editar.planes` | FE: `pages/dashboard/Gestion-Red/internet/IndexPage.vue:52-61, 63-75, 142-155, 366-382` ·… | completo |
| BOT-033 | Catálogo de endpoints para los flujos de las colas | pestaña Endpoints (oculta) | cuenta fija en el código | FE: `bot/components/endpoints/{IndexEndpoints,FormEndpointDoc}.vue`, `bot/composables/use… | parcial |

## Conexión con servicios externos

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| EXT-101 | Preparar la cuenta de Google para el correo: verificación en dos pasos y contraseña de ap… | `/ajustes/mensajeria` → «Datos del servidor correo» (pasos en Google) | `variables.config.servidor.correo` | FE `FE:pages/dashboard/emails/components/FormEmail.vue` · BE `BE:email/email.service.ts`.… | completo (Google ❓) ❓ |
| EXT-102 | Mapa de datos del servidor correo: Host/servidor, Puerto, Usuario/Correo, Contraseña, Seg… | `/ajustes/mensajeria` → «Datos del servidor correo» | `variables.config.servidor.correo` | FE `FE:pages/dashboard/emails/components/FormEmail.vue:108-185` · BE `BE:email/dto/create… | completo ❓ |
| EXT-103 | Probar Configuración: ventana «Correo del cliente», correo de prueba, mensajes y tiempos… | ídem | ídem | FE `FE:FormEmail.vue:43-70` · BE `BE:email/email.controller.ts:13-16`, `BE:email/email.se… | completo ❓ |
| EXT-104 | Interruptor «Usar correo para notificaciones» y qué correos salen con esa cuenta (incluye… | ídem | ídem |  | completo ❓ |
| EXT-105 | Diagnóstico de errores de la prueba y de los envíos (535, 534, Greeting never received, C… | ídem | ídem |  | completo (textos de Google ❓) ❓ |
| EXT-106 | La opción de contraseñas de aplicación no aparece en Google (causas) | pasos en Google | — |  | completo (Google ❓) ❓ |
| EXT-107 | Correo con otro proveedor: qué datos pedir y a qué campo va cada uno; cómo traducir «SSL/… | `/ajustes/mensajeria` → «Datos del servidor correo» | `variables.config.servidor.correo` |  | completo (proveedores ❓) ❓ |
| EXT-108 | Correo con Microsoft 365 / Exchange Online (SMTP AUTH) y cuentas personales de Outlook.com | ídem | ídem |  | completo (Microsoft ❓) ❓ |
| EXT-109 | Correo con el hosting (cPanel) y con Zoho Mail | ídem | ídem |  | completo (cPanel y Zoho ❓) ❓ |
| EXT-180 | Conseguir o renovar la firma electrónica `.p12` del SRI y cargarla con su clave | `/ajustes/empresa` → Empresa → «Datos de la empresa» → «Cargar Certif… | `ajuste.empresa`, `index.empresa`, `editar.empresa` | FE: `FE:pages/dashboard/empresas/components/FormEmpresa.vue` (interruptor «Requiere Factu… | completo (SRI y entidades ❓) ❓ |
| EXT-181 | Vigencia de la firma: «Fecha Exp. Firma Electrónica» y franja de aviso (vencida, por venc… | `/ajustes/empresa`; franja bajo la barra superior | `index.empresa` | FE: `FE:layouts/MainLayout.vue:298-377` · BE: `BE:companies/companies.service.ts:126-249`… | completo ❓ |
| EXT-182 | Usos del `.p12` fuera de la factura: retenciones habilitadas y `{firma_isp}` en contratos… | sin pantalla propia | — | BE: `BE:comprobantes-electronicos/facturas/invoice-queue.processor.ts:212-213` y `:320` (… | completo ❓ |
| EXT-183 | Dátil (firma de contratos): conseguir la API key y la URL del portal y guardarlas | `/ajustes/firma-electronica` → «Dátil» | `ajuste.plantillas` + `variables.ver.plantilla.mensaje.contrato` o `v… | FE: `FE:pages/dashboard/ajustes/firma-electronica/IndexPage.vue` (proveedor Dátil con `si… | completo (Dátil ❓) ❓ |
| EXT-184 | Dátil: estados de las credenciales (Sin configurar, Sin verificar, Verificada, Rechazada)… | `/ajustes/firma-electronica` → «Dátil» | ídem EXT-183 | FE: `FE:pages/dashboard/ajustes/firma-electronica/components/DatilConfig.vue:33-57,126-15… | completo (Dátil ❓) ❓ |
| EXT-185 | Dátil: «Ajustes del trámite» — intentos de verificación de identidad (3 a 10) | `/ajustes/firma-electronica` → «Dátil» | ídem EXT-183 | FE: `DatilConfig.vue:152-188,303-337` · BE: `BE:firma-electronica/dto/credenciales.dto.ts… | completo |
| EXT-186 | Factus (Colombia): conseguir Client ID, Client Secret, usuario (email) y contraseña de la… | `/ajustes/facturacion` → «Factus» | `variables.facturacion` | FE: `FE:pages/dashboard/ajustes/facturacion/components/FactusConfig.vue` («Client ID» `:1… | completo (Factus ❓) ❓ |
| EXT-187 | Factus: ambiente «Pruebas (sandbox)» o «Producción» y paso de uno a otro | `/ajustes/facturacion` → «Factus» → «Ambiente» | `variables.facturacion` | FE: `FactusConfig.vue:9-13,168` (lista «Ambiente»: «Pruebas (sandbox)» = `https://api-san… | completo (Factus ❓) ❓ |
| EXT-188 | Factus: «Probar conexión» (OAuth2 con las credenciales guardadas) | `/ajustes/facturacion` → «Factus» | `variables.facturacion` | FE: `FactusConfig.vue:104-112,278` · BE: `factus.controller.ts:47-52`, `factus.service.ts… | completo (Factus ❓) |
| EXT-189 | Factus: «Sincronizar empresa» (datos del emisor a `PUT /v2/companies`) | `/ajustes/facturacion` → «Factus» | `variables.facturacion` | FE: `FactusConfig.vue:117-128,294-301` (guarda con `PATCH /config` y luego `POST /sincron… | completo (Factus ❓) ❓ |
| EXT-140 | Conseguir el Token y el Store ID de PayPhone y cargarlos | `/ajustes/pasarelas-pago` → «PayPhone» | `ajuste.pasarelas-pago` | FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/PayphoneConfig.vue`, `FE:pages/… | completo (PayPhone ❓) ❓ |
| EXT-141 | Conseguir la API Key y la Secret Key de dLocal Go, elegir país y ambiente | `/ajustes/pasarelas-pago` → «dLocal Go» | `ajuste.pasarelas-pago` | FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/DlocalGoConfig.vue` · BE: los m… | completo (dLocal Go ❓) ❓ |
| EXT-142 | Elegir la pasarela de pago (país, modelo de cobro, costos de la fuente oficial) | `/ajustes/pasarelas-pago` | `ajuste.pasarelas-pago` | FE: `FE:pages/dashboard/ajustes/pasarelas-pago/IndexPage.vue` (`PASARELAS` con país de ca… | completo ❓ |
| EXT-143 | Pago Internet: URL del sistema y API key (solo lectura) | `/ajustes/pasarelas-pago` → «Pago Internet» | `ajuste.pasarelas-pago` | FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/PagoInternetConfig.vue` · BE: `… | parcial (la fuente oficial no explica esos dos datos; sin página propia) ❓ |
| EXT-144 | Vigencia del enlace de cobro (1 a 168 horas, 72 por defecto) | `/ajustes/pasarelas-pago` → «PayPhone» → «Vigencia del enlace de cobr… | `ajuste.pasarelas-pago` |  | completo |
| EXT-145 | «Cobrar con»: elegir la pasarela cuando hay más de una lista | `/ajustes/pasarelas-pago` (recuadro azul superior) | `ajuste.pasarelas-pago` |  | completo |
| EXT-146 | Comprobación de credenciales: Guardar, Probar credenciales, etiquetas Verificada, Rechaza… | `/ajustes/pasarelas-pago` → PayPhone y dLocal Go | `ajuste.pasarelas-pago` |  | completo (pasarelas ❓) |
| EXT-147 | Cómo se asienta el cobro: aviso firmado, abono «PASARELA DE PAGO», pago doble y alertas | sin pantalla propia; resultado en `/cobros-pasarela` | — |  | completo (pasarelas ❓) |
| EXT-160 | Conseguir la API key de SmartOLT y cargar dominio + API key | `/smartOLT` → pestaña «API» | `smartOLT.index` | FE: `…/smartOLT/components/Api/FormApi.vue`, `…/Api/composables/useApi.js`, `…/Api/Webhoo… | completo (SmartOLT ❓: la ayuda oficial no explica cómo se crea la clave) ❓ |
| EXT-161 | Conseguir el subdominio y la API Key (token) de AdminOLT y cargarlos | `/adminOLT` → pestaña «API» | `adminOLT.index` (solo SUPER-ADMINISTRADOR) | FE: `…/adminOLT/components/Api/FormApi.vue`, `…/Api/composables/useApi.js`, `…/adminOLT/c… | completo (AdminOLT ❓) ❓ |
| EXT-162 | Preparar un MikroTik antes de agregarlo (servicio api, usuario/grupo, puertos, ruta) | `/router/add` | `crear.router` | FE: `FE:pages/dashboard/Gestion-Red/routers/components/FormRouter.vue`, `composables/useR… | completo (router ❓) ❓ |
| EXT-163 | Menú SmartOLT/AdminOLT oculto cuando solo una plataforma tiene credenciales reales | menú lateral → «Gestion de Red» | `smartOLT.index`, `adminOLT.index` |  | completo |
| EXT-164 | Cupo de la API de SmartOLT: caché, pausa por 429 y avisos | sin pantalla (mensaje *SmartOLT en pausa por límite de llamadas*) | — |  | completo |
| EXT-165 | Qué configura ISPMAX en el MikroTik al guardar (servicios api/www-ssl, certificado `ispma… | `/router/add`, `/router/edit/:router_id` | `crear.router`, `editar.router` |  | completo (router ❓) |
| EXT-166 | Permisos mínimos del grupo de usuarios de RouterOS (`api`, `rest-api`, `read`, `write`, `… | `/router/add` | `crear.router` |  | parcial (deducido; sin probar en router) ❓ |
| EXT-167 | Interruptor «Detrás de NAT» | `/router/add`, `/router/edit/:router_id` | `crear.router`, `editar.router` |  | completo (comportamiento en redes reales ❓) ❓ |
| EXT-168 | Comprobar la conexión de un router y mensajes de error del alta | `/router` (icono «Comprobar conexión al router», «Verificar conexión») | `ping.router` |  | completo |
| EXT-169 | Revisión de conexión de ONU cada 5 minutos (SmartOLT y AdminOLT); AdminOLT sin webhook | sin pantalla | — |  | completo |
| EXT-120 | Elegir entre Coexistencia (Dualhook) y Número dedicado (Meta): qué exige y qué permite IS… | `/ajustes/mensajeria` → WhatsApp → «Oficial» (selector de modo) | `variables.vincular.whatsApp` |  | completo ❓ |
| EXT-121 | Meta: Phone Number ID y WABA ID (Messaging account ID) | `/ajustes/mensajeria` → «Oficial» → «Número dedicado (Meta)» → «Phone… | `variables.vincular.whatsApp` |  | completo (Meta ❓) ❓ |
| EXT-122 | Meta: Access Token permanente de un usuario del sistema | ídem → «Access Token» | `variables.vincular.whatsApp` |  | completo (Meta ❓) ❓ |
| EXT-123 | Meta: App Secret (opcional) | ídem → bloque «Webhook de tu app de Meta» → «App Secret (opcional)» | `variables.vincular.whatsApp` |  | completo (Meta ❓) ❓ |
| EXT-124 | Meta: Verify Token y webhook de la app (Callback URL) | ídem → bloque «Webhook de tu app de Meta» → «Webhook URL», «Verify To… | `variables.vincular.whatsApp` |  | completo (Meta ❓) ❓ |
| EXT-125 | Meta: registrar el número con el PIN de 6 dígitos | ídem → botón «Registrar» → «Registrar el número en la Cloud API» | `variables.vincular.whatsApp` |  | completo (Meta ❓) ❓ |
| EXT-126 | Dualhook: crear la cuenta y conectar el número de la app WhatsApp Business (Embedded Sign… | `/ajustes/mensajeria` → «Oficial» → «Coexistencia (Dualhook)» | `variables.vincular.whatsApp` |  | completo (Dualhook ❓) ❓ |
| EXT-127 | Dualhook: Outbound API key (`dh_live_…`) | ídem → «Access Token» | `variables.vincular.whatsApp` |  | completo (Dualhook ❓) ❓ |
| EXT-128 | Dualhook: Phone Number ID y WABA ID de la conexión | ídem → «Phone Number ID», «WABA ID» | `variables.vincular.whatsApp` |  | parcial (la ayuda de Dualhook no dice la pantalla) ❓ |
| EXT-129 | Dualhook: Webhook Override (URL y Verify Token de ISPMAX) | ídem → bloque «Webhook para Dualhook» | `variables.vincular.whatsApp` |  | completo (Dualhook ❓) ❓ |
| EXT-130 | OpenAI: crear la clave de API | `/ajustes/inteligencia-artificial` → «Token de OpenAI (sk-...)» | `ajuste.ia`, `bot.config.ver` |  | completo (OpenAI ❓) ❓ |
| EXT-131 | OpenAI: saldo (créditos), límites y quién cobra | ídem | `ajuste.ia`, `bot.config.ver` |  | completo (OpenAI ❓) ❓ |
| EXT-132 | ISPMAX: pegar el token, elegir Modelo, Verificar y Guardar | ídem → «Modelo», «Verificar», «Guardar» | `ajuste.ia`, `bot.config.ver` |  | completo ❓ |
| EXT-133 | ISPMAX: Quitar token y sus efectos | ídem → «Quitar token» | `ajuste.ia`, `bot.config.ver` |  | completo ❓ |
| EXT-001 | Correo saliente (SMTP): servidor, puerto, usuario, contraseña, seguridad, prueba e interr… | `/ajustes/mensajeria` → «Datos del servidor correo» (y `/email/edit/:… | `variables.config.servidor.correo` | FE: `FE:pages/dashboard/emails/components/FormEmail.vue`, `FE:pages/dashboard/emails/comp… | completo ❓ |
| EXT-002 | Correo con Gmail / Google Workspace: contraseña de aplicación | `/ajustes/mensajeria` → «Datos del servidor correo» | `variables.config.servidor.correo` | FE: ídem EXT-001 · BE: ídem EXT-001. Páginas: `docs/tareas/ajustes/configurar-el-correo-c… | completo (cuenta de Google ❓) ❓ |
| EXT-003 | Correo con Outlook / Microsoft 365 (sin página: ver motivo) | `/ajustes/mensajeria` → «Datos del servidor correo» | `variables.config.servidor.correo` |  | completo (cuenta de Microsoft ❓) ❓ |
| EXT-004 | WhatsApp Oficial · Número dedicado (Meta): credenciales | `/ajustes/mensajeria` → WhatsApp → «Oficial» | `variables.vincular.whatsApp` | FE: `FE:pages/dashboard/ajustes/mensajeria/components/WhatsappCloudApi.vue` (modos en `:2… | completo (Meta ❓) ❓ |
| EXT-005 | WhatsApp Oficial · Coexistencia (Dualhook): credenciales | `/ajustes/mensajeria` → WhatsApp → «Oficial» | `variables.vincular.whatsApp` |  | completo (Dualhook ❓, ayuda no consultada) ❓ |
| EXT-006 | WhatsApp no oficial (QR) | `/ajustes/mensajeria` → WhatsApp → «No oficial» | `variables.vincular.whatsApp` |  | completo (servicio de WhatsApp ❓) |
| EXT-007 | PayPhone: Token y Store ID | `/ajustes/pasarelas-pago` → «PayPhone» | `ajuste.pasarelas-pago` | FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/PayphoneConfig.vue` (`label="To… | completo (PayPhone ❓) ❓ |
| EXT-008 | dLocal Go: API Key, Secret Key, país y ambiente | `/ajustes/pasarelas-pago` → «dLocal Go» | `ajuste.pasarelas-pago` | FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/DlocalGoConfig.vue` (`API Key`… | completo (dLocal Go ❓) ❓ |
| EXT-009 | Pago Internet: URL del sistema y API key (informativo) | `/ajustes/pasarelas-pago` → «Pago Internet» | `ajuste.pasarelas-pago` |  | completo |
| EXT-010 | Dátil (firma de contratos): API key y URL del portal | `/ajustes/firma-electronica` | `ajuste.firma-electronica` |  | completo (Dátil ❓) |
| EXT-011 | SRI (Ecuador): certificado `.p12` y clave de la empresa | `/ajustes/empresa` → «Cargar Certificado» | `index.empresa`, `ajuste.empresa` |  | completo (SRI ❓) |
| EXT-012 | Factus (Colombia): credenciales y datos del emisor | `/ajustes/facturacion` → «Factus» | `variables.facturacion` |  | completo (Factus ❓) |
| EXT-013 | SmartOLT: dominio, API KEY y webhook | `/smartOLT` → pestaña «API» | `smartOLT.index` |  | completo (SmartOLT ❓) |
| EXT-014 | AdminOLT: subdominio y API Key | `/adminOLT` → pestaña «API» | `adminOLT.index` |  | completo (AdminOLT ❓) |
| EXT-015 | Routers MikroTik: usuario/contraseña de API, puertos | `/router/add` | `router.add` |  | completo (router ❓) |
| EXT-016 | Mapas: Mapbox (token) y Esri (imagen satelital) | `/mapa-nap`, `/mapa-clientes` | `index.mapa`, `mapa-clientes.index` |  | completo |
| EXT-017 | Tasa BCV (Venezuela): fuente de la tasa | `/ajustes/facturacion` → tarjeta «Tasa BCV» | `variables.facturacion` |  | completo |
| EXT-018 | OpenAI: token y modelo | `/ajustes/inteligencia-artificial` | `ajuste.ia` |  | completo (OpenAI ❓) |
| EXT-019 | Servicio de licencia / suscripción (master) | botón «Licencia» de `/ajustes` | sin permiso propio |  | completo |
| EXT-020 | Ubicación de técnicos: geolocalización del dispositivo | `/mapa-nap` (capa «Técnicos») | `index.mapa` |  | completo |
| EXT-021 | PDF y conversión de documentos (LibreOffice, Puppeteer) | sin pantalla | — |  | completo |
| EXT-022 | Redis (colas Bull y caché) | sin pantalla | — |  | completo |
| EXT-023 | Avisos internos a Slack (operación de la instalación) | sin pantalla | — |  | completo |
| EXT-024 | Servicios auxiliares: MyMemory, consulta de IP pública, Cloudinary (logo del correo), CDN… | sin pantalla | — |  | completo |
| EXT-025 | Referencia pública «Servicios externos» | `docs/referencia/servicios-externos` | — |  | completo |
| EXT-026 | Preguntas frecuentes de correo y servicios externos | `docs/preguntas/correo-y-servicios-externos` | — |  | completo |

## Ventas, facturación electrónica e ingresos/egresos

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| VEN-101 | Retenciones: listado, filtros, columnas y estados | `/retenciones` · `retenciones.index` (Finanzas → Retenciones, solo Ec… | `retenciones.index` | FE: `pages/dashboard/retenciones/IndexPage.vue` · BE: `comprobantes-electronicos/retencio… | completo |
| VEN-102 | Retenciones: detalle de solo lectura | diálogo "Retención N°" | — | FE: `pages/dashboard/retenciones/components/DetalleRetencion.vue`. | completo |
| VEN-103 | Retenciones: emitir (desde una compra y "Nueva retención" a mano) | diálogo "Emitir retención" / "Nueva retención" | `compras.retencion.emitir` | FE: `pages/dashboard/compras/components/DialogRetencion.vue`, `catalogosRetencion.js`, `c… | completo |
| VEN-104 | Retenciones: reenviar al SRI y descargar RIDE/XML | botones de la fila | `retenciones.reenviar` (reenviar) |  | completo |
| VEN-105 | Retenciones: marcar como anulada y borrar rechazadas | botones de la fila | `retenciones.anular`, `retenciones.eliminar` |  | completo |
| VEN-106 | Retenciones: reporte PDF y Excel | botón Reporte | — (backend: `retenciones.index` o `compras.retencion.emitir`) |  | completo |
| VEN-107 | Retenciones: requisitos de emisión (SRI, firma, secuencial, identificación, códigos) | (transversal) | — |  | completo |
| VEN-001 | Listado de Ventas (facturas libres) | `/ventas/:tipo?/:fecha?` · `index.facturas_libre` | `index.facturas_libre` | FE: `pages/dashboard/ventas/IndexPage.vue`, `pages/dashboard/ventas/useVentas.js`, `compo… | completo ❓ |
| VEN-002 | Nueva factura / venta | `/ventas/add/:venta_id?` · `crear.factura` | `crear.factura` | FE: `pages/dashboard/ventas/AddVenta.vue`, `composables/useProduct.js`, `pages/dashboard/… | completo ❓ |
| VEN-003 | Cálculo de totales, IVA, ICE y descuentos de la venta | (dentro de VEN-002) | — | FE: `composables/useProduct.js:83-157`, `pages/dashboard/ventas/AddVenta.vue:704-766` · B… | completo ❓ |
| VEN-004 | Emisión electrónica de una venta (cola, numeración, envío al SRI) | (backend, tras VEN-002) | — | BE: `invoices/invoices.service.ts:39-129`, `invoices/invoices.controller.ts:15-23`, `invo… | completo ❓ |
| VEN-005 | Estados del comprobante y por qué falla | columna Estado | — | FE: `pages/dashboard/ventas/IndexPage.vue:456-511`, `pages/dashboard/ventas/useVentas.js:… | completo ❓ |
| VEN-006 | Reenviar factura electrónica / reintentos | botón retweet · cron 2 h · latido SRI | `reenviar.factura` | FE: `ventas/IndexPage.vue:137-140`, `stores/estados-mantenedor.ts:98-112`, `layouts/Estad… | completo ❓ |
| VEN-007 | Anular factura (nota de crédito) | botón ✕ en listado | `anular.factura` | FE: `ventas/IndexPage.vue:75-135, 592-605`, `composables/useFacturacion.js:595-616` · BE:… | completo ❓ |
| VEN-008 | Eliminar comprobante | botón papelera en listado | `eliminar.factura` | FE: `ventas/useVentas.js:173-197` · BE: `invoices/invoices.controller.ts:68-72`, `invoice… | completo ❓ |
| VEN-009 | Detalle del comprobante y descargas RIDE/XML/Nota crédito | diálogo "Detalle de la Factura" | — (ver detalle sin permiso propio) | FE: `components/DetalleProducts.vue`, `composables/useFacturacion.js:126-151, 659-736` ·… | completo ❓ |
| VEN-010 | Reenviar comprobantes por WhatsApp/correo | diálogo "Enviar Comprobantes" | ninguno propio (el botón no valida permiso) | FE: `ventas/ModalReenviarComproantes.vue`, `composables/useWaCanal.js` · BE: `facturas.co… | completo ❓ |
| VEN-011 | Imprimir comprobante | botón impresora | `imprimir.factura` | FE: `ventas/IndexPage.vue`, `pages/dashboard/transacciones/composables/useTransation.js:3… | completo ❓ |
| VEN-012 | Exportar ventas a Excel | Descargar Documento → Descargar EXCEL | — (sin permiso propio) | FE: `ventas/useVentas.js:20-138`. | completo |
| VEN-013 | Requisitos SRI: empresa, certificado .p12, sucursal, ambiente, secuenciales + aviso de fi… | Ajustes → Empresa / Sucursales · banner global | `editar.empresa` (guardar) | FE: `pages/dashboard/empresas/composables/useEmpresa.js`, `components/FormEmpresa.vue`, `… | completo ❓ |
| VEN-014 | Chip "SRI" (estado del servicio) y reintento al volver el SRI | cabecera | — | FE: `layouts/EstadoSRI.vue`, `stores/estados-mantenedor.ts:98-112`, `layouts/Notification… | completo ❓ |
| VEN-015 | Factus (Colombia): configuración | Ajustes → Facturación → pestaña Factus | `variables.facturacion` | FE: `ajustes/facturacion/components/FactusConfig.vue`, `sucursales/components/FormSucursa… | completo ❓ |
| VEN-016 | Factus: emisión, nota crédito y descargas | (backend + listado) | — | BE: `facturacion/factus/factus-invoice.service.ts`, `factus-pago.service.ts`, `factus.ser… | completo ❓ |
| VEN-017 | Proformas (cláusulas) | sin pantalla | — | BE: `proforma/proforma.controller.ts`, `proforma.service.ts`, `entities/proforma.entity.t… | completo ❓ |
| VEN-018 | Retenciones | no existe | — |  | completo ❓ |
| VEN-019 | Generación automática de facturas de servicio (`crear-facturas`) + botón "Generar factura… | Ajustes → Facturación | `variables.facturacion` | BE: `crear-facturas/crear-facturas.service.ts`, `app.service.ts:197-236`, `app-queue.proc… | completo ❓ |
| VEN-020 | Estados de la factura de servicio y reglas de anulación/eliminación (backend) | perfil del cliente (otro inventario) | `cliente.*` (otro inventario) | BE: `pagos/pagos.service.ts:891-1350`, `pagos/pagos.controller.ts:203-243`, `facturas-pag… | completo ❓ |
| VEN-021 | Ingresos / Egresos: listado, filtros, tarjetas y estadísticas | `/ingresos-egresos` · `index.ingresos_egresos` | `index.ingresos_egresos` | FE: `pages/dashboard/ingresos-egresos/IndexPage.vue`, `composables/useIngresoEgreso.js`,… | completo ❓ |
| VEN-022 | Ingresos / Egresos: crear, editar, eliminar y recurrencia | diálogo "Nuevo Registro / Editar Registro" | `crear.` / `editar.` / `eliminar.ingresos_egresos` | FE: `components/FormIngresoEgreso.vue`, `composables/useIngresoEgreso.js:86-137, 403-458`… | completo ❓ |
| VEN-023 | Ingresos / Egresos: reporte PDF/Excel | botón Reporte → "Generar reporte" | `reporte.ingresos_egresos` | FE: `ModalReporteIE.vue`, `useIngresoEgreso.js:238-305` · BE: `ingresos-egresos.controlle… | completo ❓ |
| VEN-024 | Personas: listado y acciones | `/personas` · `index.personas` | `index.personas` + sub-permisos | FE: `pages/dashboard/personas/IndexPage.vue`, `composables/usePersona.js` · BE: `customer… | completo ❓ |
| VEN-025 | Personas: formulario Agregar/Editar | diálogo "Agregar Persona" | `crear.persona` / `editar.persona` | FE: `components/FormPerson.vue`, `composables/usePersona.js:55-77`, `clientes/composables… | completo ❓ |
| VEN-026 | Menú ICE (MenuSetearModoIce) | menú dentro de modales de Clientes | — |  | completo ❓ |

## Incidentes de red y avisos a clientes

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| INC-001 | Panel «Red» del mapa: lista de incidentes, detalle, historial y aviso superior | `/mapa-nap` → botón «Zonas y caídas masivas» | `index.mapa` (ver); `mapa.incidentes.gestionar` (gestionar) | FE: `FE:MN/ZonasIncidentes.vue`, `FE:pages/dashboard/Gestion-Red/mapa-nap/IndexPage.vue:4… | completo ❓ |
| INC-002 | Detección automática de caídas masivas por agrupación (caja NAP, PON, router, zona, cerca… | sin pantalla propia; interruptor «Detección automática» en el panel | `mapa.incidentes.gestionar` (interruptor) | BE: `BE:IR/deteccion-masiva.service.ts`, `BE:monitoreo-trafico/monitoreo-conexion.service… | completo ❓ |
| INC-003 | Incidentes por router sin conexión, antena o sector caído y PON caído | sin pantalla propia (aparecen en el panel) | `mapa.incidentes.gestionar` (cerrar) | BE: `BE:IR/deteccion-masiva.service.ts:285-330,341-415,427-490`, `BE:router/router-monito… | completo ❓ |
| INC-004 | Declarar una falla o un mantenimiento a mano (inmediato o programado) | panel «Red» → «Declarar falla o mantenimiento» | `mapa.incidentes.gestionar` | FE: `FE:MN/ZonasIncidentes.vue:746-808,1282-1380` · BE: `BE:IR/incidentes-red.service.ts:… | completo ❓ |
| INC-005 | Editar, resolver, descartar o cancelar un incidente | panel «Red» → detalle del incidente | `mapa.incidentes.gestionar` | FE: `FE:MN/ZonasIncidentes.vue:660-720` · BE: `BE:IR/incidentes-red.service.ts:327-369`. | completo |
| INC-006 | Zonas del mapa (dibujar, renombrar, redibujar, eliminar) | panel «Red» → pestaña «Zonas» | `mapa.incidentes.gestionar` | FE: `FE:MN/ZonasIncidentes.vue:795-875,1186-1280` · BE: `BE:IR/incidentes-red.service.ts:… | completo ❓ |
| INC-007 | Aviso por WhatsApp a los clientes afectados (cola, canales, plantillas, resultado) | sin pantalla propia; se configura en el panel y en Ajustes → Plantill… | `mapa.incidentes.gestionar` | BE: `BE:IR/avisos-clientes.service.ts`, `BE:IR/incidentes-texto.util.ts`, `BE:IR/entities… | completo ❓ |
| INC-008 | Seguimiento y cancelación del envío (recuadro flotante y diálogo «Aviso a los clientes af… | recuadro flotante en todo el panel; detalle del incidente | `mapa.incidentes.gestionar` (cancelar) | FE: `FE:layouts/AvisoMantenimientoProgress.vue`, `FE:MN/AvisoEnvioDialog.vue`, `FE:MN/Zon… | completo ❓ |
| INC-009 | Respuesta del bot durante un incidente y aviso «ya volvió» a los que preguntaron | sin pantalla propia (chat de WhatsApp) | sin permiso | BE: `BE:pagos/cobro-bot/diagnostico-bot.service.ts:120-137,257-290`, `BE:IR/incidentes-re… | completo (canal externo ❓) ❓ |
| INC-010 | Avisos al equipo: campanita, Alertas de red por correo/WhatsApp y grupo de WhatsApp | campanita del panel; Monitoreo de Red → Alertas; Ajustes → Mensajería | `index.monitoreo_red`; ajustes del bot | BE: `BE:monitoreo-dispositivos/monitoreo-dispositivos-notifier.service.ts:160-215`, `BE:I… | completo ❓ |
| INC-011 | Webhook de SmartOLT (eventos en tiempo real) | `/smartOLT` → pestaña `API` → «Eventos en tiempo real (webhook)» | `smartOLT.index` (ver); `mapa.incidentes.gestionar` (guardar) | FE: `FE:pages/dashboard/Gestion-Red/smartOLT/components/Api/WebhookSmartOlt.vue` · BE: `B… | completo (servicio externo ❓) ❓ |
| INC-012 | Clientes que dependen de un equipo (antena, sector) en Monitoreo de Red | `/monitoreo-red` → detalle del dispositivo | `index.monitoreo_red`; `mapa.incidentes.gestionar` (editar) | FE: `FE:MR/ClientesDispositivo.vue`, `FE:MR/DetalleDispositivo.vue` · BE: `BE:monitoreo-d… | completo |
| INC-013 | Plantillas «Aviso de mantenimiento» y «Aviso de caída masiva» | `/ajustes/plantillas` → pestañas homónimas | `mapa.incidentes.gestionar` (pestañas) | FE: `FE:pages/dashboard/ajustes/plantillas/components/AvisoMantenimiento.vue`, `FE:pages/… | completo ❓ |
| INC-014 | Resumen de la ONU (estado, desde cuándo y señal) bajo el SN del servicio | `/clientes/edit/:client_id` → Servicios → columna «ONU SN»; barra del… | sin permiso propio | FE: `FE:pages/dashboard/clientes/components/editar/Servicios/ResumenOnu.vue`, `FE:pages/d… | completo (OLT ❓) ❓ |
| INC-015 | Estado de conexión y estado de la ONU guardados en cada servicio | sin pantalla propia (alimenta el mapa, el panel y el bot) | sin permiso | BE: `BE:common/utils/estado-onu.util.ts`, `BE:monitoreo-trafico/monitoreo-conexion.servic… | completo ❓ |
| INC-016 | Aviso de versión nueva de ISPMAX (recarga automática) | cualquier pantalla | sin permiso | FE: `FE:boot/version-nueva.js`. | completo ❓ |

## Portal del cliente

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| POR-001 | Inicio de sesión del portal del cliente | `/portal/login` · `portal.login` | ninguno (público) | FE: `pages/portal-cliente/Login.vue`, `router/portal-guard.ts`, `stores/auth-cliente.ts`,… | completo |
| POR-002 | Recuperar y restablecer la contraseña por correo | `/portal/login` (diálogo) · `/portal/restablecer-password` | ninguno (público) | FE: `pages/portal-cliente/Login.vue:84-135`, `pages/sesion/RestablecerPassword.vue` (mism… | completo |
| POR-003 | Estructura del portal, sesión y cambio obligatorio de la clave temporal | `/portal/*` · `PortalClienteLayout` | sesión de cliente | FE: `pages/portal-cliente/layouts/PortalClienteLayout.vue`, `components/ModalCambiarPassw… | completo |
| POR-004 | Inicio del portal: estado de cuenta | `/portal` · `portal.inicio` | sesión de cliente | FE: `pages/portal-cliente/modules/inicio/InicioPage.vue` · BE: `portal/portal.service.ts:… | completo |
| POR-005 | Facturas del cliente: lista, filtros y descarga de comprobantes | `/portal/facturas` · `portal.facturas` | sesión de cliente | FE: `modules/facturas/FacturasPage.vue`, `components/FacturaCard.vue`, `components/Factur… | completo |
| POR-006 | Pagar una factura: en línea, transferencia o comprobante | `/portal/facturas/:id/pagar` · `portal.facturas.pagar` | sesión de cliente | FE: `modules/facturas/PagarPage.vue`, `components/{PagoEnLinea,PagoTransferencia,PagoComp… | completo |
| POR-007 | Promesa de pago pedida por el cliente | botón Promesa en `/portal/facturas` | sesión de cliente; ajuste de empresa | FE: `modules/facturas/components/FacturaCard.vue:8-22,64-78`, `composables/useFacturas.js… | completo |
| POR-008 | Consumo y prueba de velocidad | `/portal/consumo` · `portal.consumo` | sesión de cliente | FE: `modules/consumo/{ConsumoPage,ConsumoHistorial,PruebaVelocidad}.vue` · BE: `portal/co… | completo |
| POR-009 | Contratos del cliente | `/portal/contratos` · `portal.contratos` | sesión de cliente | FE: `modules/contratos/ContratosPage.vue` · BE: `portal/contratos/portal-contratos.contro… | completo |
| POR-010 | Soporte: lista de solicitudes y nueva solicitud (problema o instalación) | `/portal/tickets` · `portal.tickets` | sesión de cliente | FE: `modules/tickets/TicketsPage.vue`, `components/SolicitudCard.vue`, `estadoSolicitud.j… | completo |
| POR-011 | Detalle de una solicitud o ticket y conversación | `/portal/tickets/:id` · `/portal/tickets/ticket/:id` | sesión de cliente | FE: `modules/tickets/TicketDetallePage.vue`, `components/ConversacionCliente.vue` · BE: `… | completo |
| POR-012 | Perfil del cliente, avatar y cambio de contraseña | `/portal/perfil` · `portal.perfil` | sesión de cliente | FE: `modules/perfil/PerfilPage.vue`, `components/{PerfilDatos,PerfilSeguridad}.vue`, `com… | completo |
| POR-013 | Acceso al portal desde la ficha del cliente (enviar credenciales) | Clientes → acción Acceso al portal | `cliente.portal.credenciales` | FE: `pages/dashboard/clientes/components/modals/ModalCredencialesPortal.vue`, `composable… | completo |
| POR-014 | Pagos del portal: bandeja de comprobantes | `/portal-pagos` · `portal-pagos.index` · Finanzas → Pagos del portal | `portal-pagos.index` | FE: `pages/dashboard/portal-pagos/IndexPage.vue`, `composables/usePortalPagos.js` · BE: `… | completo |
| POR-015 | Validar o rechazar un comprobante del portal | modal Comprobante en `/portal-pagos` | `portal-pagos.index` (+ cobro con el modal de pago) | FE: `portal-pagos/components/ModalValidarPago.vue`, `clientes/components/modals/ModalPago… | completo |
| POR-016 | Solicitudes del portal: bandeja y detalle | `/tickets/portal` · `/tickets/portal/:id` | `tickets.index` | FE: `tickets/SolicitudesPortalPage.vue`, `SolicitudPortalPage.vue`, `components/AccionesS… | completo |
| POR-017 | Atender una solicitud: completar como ticket, crear instalación o rechazar | `/tickets/add?solicitud=` · `/instalaciones/add?solicitud=` | `tickets.add` / `instalaciones.add` | FE: `tickets/components/FormTicket.vue:100-165`, `tickets/composables/useTicket.js:178-20… | completo |
| POR-018 | Mensajes del cliente y respuestas del personal en tickets e instalaciones | Listado de respuestas del ticket y de la instalación | `tickets.edit` / `instalaciones.edit` | FE: `tickets/components/ListRespuestas.vue:14-82`, `tickets/components/AgregarRespuesta.v… | completo |
| POR-019 | Promesas pedidas desde el portal: ajuste de la empresa y origen | Ajustes → Cobros y promesas · `/promesas-pago` | `ajuste.cobros` o `bot.config.promesas` | FE: `pages/dashboard/ajustes/cobros-promesas/IndexPage.vue`, `pages/dashboard/promesas-pa… | completo |
| POR-020 | Mensaje del técnico en camino (Ajustes → Plantillas → Tickets) | Ajustes → Plantillas → Tickets → pestaña Mensaje técnico en camino | `variables.ver.plantilla.ticket`; `variables.edita.plantilla.ticket` | FE: `ajustes/ticket/PlantillaMsgEnCamino.vue`, `composables/useConfigTicket.js` · BE: `ti… | completo |

## SmartOLT y AdminOLT

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| OLT-001 | SmartOLT · Panel principal (selector de OLT, uptime/temperatura, tarjetas, pestañas) | `/smartOLT` · `smartOLT.index` | `smartOLT.index` | FE: `FE:S/IndexPage.vue`, `FE:S/composables/smartOLTComposable.js`, `FE:S/components/Card… | completo ❓ |
| OLT-002 | SmartOLT · Pestaña API (dominio + API Key) | `/smartOLT` → pestaña `API` | `smartOLT.index` (sin permiso propio) | FE: `FE:S/components/Api/FormApi.vue`, `FE:S/components/Api/composables/useApi.js` · BE:… | completo ❓ |
| OLT-003 | SmartOLT · Listado "ONUS CONFIGURADOS" (filtros, caché, vinculación) | `/smartOLT` → `ONUS CONFIGURADOS` | `smartOLT.index`, `smartOLT.vincular_cliente`, `smartOLT.reiniciar_on… | FE: `FE:S/components/Onus/IndexPageOnus.vue`, `.../composables/useOnus.js`, `FE:S/BaseTab… | completo ❓ |
| OLT-004 | SmartOLT · ONUs no configuradas (esperando autorización) | `/smartOLT/unconfigured/:olt_id` · `smartOLT_unconfigured.index` | `smartOLT_unconfigured.index`, `smartOLT.authorize` | FE: `FE:S/components/Unconfigured/IndexPage.vue`, `.../hooks/useUnconfigured.js` · BE: `s… | completo ❓ |
| OLT-005 | SmartOLT · Autorizar ONU (formulario, configuración avanzada, vincular opcional) | `/smartOLT/authorize/:olt_id` · `smartOLT.authorize` | `smartOLT.authorize`, `smartOLT.vincular_cliente` | FE: `FE:S/components/Authorize/IndexPage.vue`, `.../composables/useAuthorize.js`, `.../co… | completo ❓ |
| OLT-006 | SmartOLT · Vista de una ONU (datos, estado, señal, gráficos) | `/smartOLT/onu-view/:unique_external_id` · `smartOLT_onu-view.index` | `smartOLT.index` (la ruta se mapea a este permiso) | FE: `FE:S/components/OnuView/IndexPage.vue`, `.../composables/useOnuView.js`, `.../compos… | completo ❓ |
| OLT-007 | SmartOLT · Reiniciar / Habilitar-Deshabilitar / Eliminar ONU | listado y vista de ONU | `smartOLT.reiniciar_onu`, `smartOLT.habilitar_desabilitar_onu`, `smar… | FE: `FE:S/components/Onus/components/{ReiniciarOnuModal,Desabilitar_HabilitarOnuModal,Del… | completo ❓ |
| OLT-008 | SmartOLT · Mantenimiento: Get status, Running Config, Resync, Restaurar fábrica, Ubicació… | vista de ONU | ninguno propio | FE: `FE:S/components/OnuView/IndexPage.vue`, `.../components/{RunningConfigModal,ResyncOn… | completo (1 punto ❓) ❓ |
| OLT-009 | SmartOLT · Cambiar WiFi, Acceso del router, TR-069, Mgmt IP, Modo ONU | vista de ONU / ficha de servicio / autorizar | ninguno propio | FE: `FE:S/components/OnuView/IndexPage.vue:36-124`, `.../components/Tr069MgmtConfigModal.… | completo ❓ |
| OLT-010 | SmartOLT · Cambios masivos (perfil de velocidad y habilitar/deshabilitar) | `/smartOLT` → botón `Cambios masivos` | ninguno propio | FE: `FE:S/components/Onus/components/{CambiarPerfilMasivoModal,HabilitarMasivoModal}.vue`… | completo ❓ |
| OLT-011 | SmartOLT · Perfiles de velocidad (solo lectura) | `/smartOLT` → `PROFILES` | `smartOLT.index` | FE: `FE:S/components/Profiles/IndexPageProfiles.vue`, `.../composables/useSpeedProfiles.j… | completo ❓ |
| OLT-012 | SmartOLT · VLANs (listar y agregar) | `/smartOLT` → `VLANS` | `smartOLT.index` | FE: `FE:S/components/Vlans/IndexPageVlans.vue`, `.../AddVlan.vue`, `.../components/FormVl… | completo ❓ |
| OLT-013 | SmartOLT · Zonas (listar y agregar) | `/smartOLT` → `ZONAS` | `smartOLT.index` | FE: `FE:S/components/Zonas/IndexPageZonas.vue`, `.../AddZonas.vue`, `.../components/Modal… | completo ❓ |
| OLT-014 | Vinculación ONU↔cliente (SmartOLT, 3 puntos de entrada) | listado, autorizar y ficha del cliente | `smartOLT.vincular_cliente`, `servicio.vincular.onu` | FE: `FE:S/components/Onus/components/VincularClienteOnu.vue`, `.../composables/useVincula… | completo ❓ |
| OLT-015 | AdminOLT · Panel principal | `/adminOLT` · `adminOLT.index` | `adminOLT.index` (no existe en el catálogo de permisos) | FE: `FE:A/IndexPage.vue`, `FE:A/composables/adminOLTComposable.js`, `FE:A/components/Card… | completo ❓ |
| OLT-016 | AdminOLT · Pestaña API (subdominio + API Key) | `/adminOLT` → `API` | `adminOLT.index` | FE: `FE:A/components/Api/FormApi.vue`, `FE:A/components/Api/composables/useApi.js` · BE:… | completo ❓ |
| OLT-017 | AdminOLT · Listado "ONUS CONFIGURADOS" | `/adminOLT` → `ONUS CONFIGURADOS` | `adminOLT.index` | FE: `FE:A/components/Onus/IndexPageOnus.vue`, `.../composables/useOnus.js`, `.../componen… | completo ❓ |
| OLT-018 | AdminOLT · ONUs en espera de autorización | `/adminOLT/no-autorizadas` · `adminOLT.no-autorizadas` | `adminOLT.no-autorizadas` (no existe en catálogo) | FE: `FE:A/components/NoAutorizadas/IndexPageNoAutorizadas.vue` · BE: `admin-olt.controlle… | completo ❓ |
| OLT-019 | AdminOLT · Autorizar ONU | `/adminOLT/autorizar` · `adminOLT.autorizar` | `adminOLT.autorizar` (no existe en catálogo) | FE: `FE:A/components/NoAutorizadas/FormAutorizarOnu.vue`, `.../components/VincularCliente… | completo ❓ |
| OLT-020 | AdminOLT · Detalle de ONU y herramientas | `/adminOLT/onu/:sn` · `adminOLT.onu-detail` | `adminOLT.onu-detail` (no existe en catálogo) | FE: `FE:A/components/Onus/OnuDetail.vue` · BE: `admin-olt.controller.ts:69` (`GET onu-por… | completo ❓ |
| OLT-021 | Vinculación ONU↔cliente (AdminOLT) | listado, autorizar y ficha del cliente | `servicio.vincular.onu` (ficha) | FE: `FE:A/components/Onus/components/VincularClienteOnu.vue`, `FE:A/components/Onus/compo… | completo ❓ |
| OLT-022 | AdminOLT · OLTs (perfiles de línea y VLANs por OLT) | `/adminOLT` → `OLTs` | `adminOLT.index` | FE: `FE:A/components/Olts/IndexPageOlts.vue` · BE: `admin-olt.controller.ts:26` (`olt/lis… | completo ❓ |
| OLT-023 | AdminOLT · Zonas (crear, editar, eliminar) | `/adminOLT` → `ZONAS` | `adminOLT.index` | FE: `FE:A/components/Zonas/IndexPageZonas.vue`, `.../composables/useZonas.js` · BE: `admi… | completo ❓ |
| OLT-024 | AdminOLT · Perfiles de velocidad (solo lectura) | `/adminOLT` → `PROFILES` | `adminOLT.index` | FE: `FE:A/components/Profiles/IndexPageProfiles.vue`, `.../composables/useSpeedProfiles.j… | completo ❓ |
| OLT-025 | AdminOLT · NAPs (solo lectura) | `/adminOLT` → `NAPs` | `adminOLT.index` | FE: `FE:A/components/Naps/IndexPageNaps.vue` · BE: `admin-olt.controller.ts:223` (`GET na… | completo ❓ |
| OLT-026 | AdminOLT · Maps (solo lectura) | `/adminOLT` → `MAPS` | `adminOLT.index` | FE: `…/adminOLT/components/Maps/IndexPageMaps.vue` (484 líneas, leído completo), `…/Maps/… | completo ❓ |
| OLT-027 | Corte y reactivación de servicio vía ONU (y su relación con Ajustes/reintentos) | automático, manual y ficha del cliente | `variables.opciones-cortes`, `variables.aplicar-cortes`, `servicio.ac… | BE: `BE:common/utils/onu-corte.utils.ts`, `BE:app-queue.processor.ts:81-112, 114-707, 770… | completo ❓ |
| OLT-028 | Reinicio automático programado de ONUs (colas `reiniciar-onus*`) | Ajustes → OLTs | `variables.reintentos.smartOLT` | FE: `FE:AJ/servicios/components/CronSmartOLT.vue`, `FE:AJ/servicios/components/CronAdminO… | completo ❓ |
| OLT-029 | Tareas en cola de verificación de habilitación/deshabilitación y cómo ver su resultado | sin pantalla propia (Logs) | `ver.logs`, `variables.opciones-logs` | BE: `smart-olt/habilitacion-onu-queue.processor.ts`, `smart-olt.service.ts:1072-1090, 115… | completo ❓ |
| OLT-030 | Validación de ONUs contra la plataforma, `onu_invalida` y revalidación | Ajustes → OLTs, ficha del cliente | `variables.reintentos.smartOLT` (pestañas), `servicio.vincular.onu` | FE: `FE:AJ/smartOLT/IndexPage.vue:210-252, 511-590`, `FE:CL/components/editar/ServiciosPa… | completo ❓ |
| OLT-031 | Ajustes → OLTs: valores por defecto (TR-069, Mgmt IP, tipo de ONU) | `/ajustes/smartolt` · `ajuste.smartolt` | `variables.reintentos.smartOLT`, `variables.opciones-cortes` | FE: `FE:AJ/smartOLT/IndexPage.vue` · BE: `PATCH /settings/:id` (`BE:settings/entities/set… | completo ❓ |
| OLT-032 | Matriz de permisos y control de acceso (front vs back) | transversal | todos los de OLT |  | completo ❓ |
| OLT-033 | Estados de ONU y su significado | transversal | — | FE: `pages/dashboard/Gestion-Red/smartOLT/components/Onus/IndexPageOnus.vue:90-165, 291-3… | completo ❓ |
| OLT-034 | Caché, límites de la API y comportamiento ante errores | transversal | — |  | completo ❓ |

## Routers, redes IP y planes

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| RED-001 | Listado de Routers (estado, versión, acciones) | `/router` · `index.routers` | `index.routers` (+ por botón) | FE: `pages/dashboard/Gestion-Red/routers/IndexPage.vue`, `components/{ClientesRouterModal… | completo ❓ |
| RED-002 | Alta de router: campos y qué configura ISPMAX en el MikroTik al guardar | `/router/add` · `router.add` | `crear.router` | FE: `routers/AddRouter.vue`, `routers/components/FormRouter.vue`, `routers/composables/us… | completo ❓ |
| RED-003 | Edición de router: qué cambia en el equipo al guardar y cambio de Control de velocidad | `/router/edit/:router_id` · `router.edit` (pestaña "Datos & Configura… | `editar.router` | FE: `routers/EditRouter.vue`, `components/FormRouter.vue` (mismo formulario que RED-002 c… | completo ❓ |
| RED-004 | Pestaña Monitoreo del router (info, tráfico en vivo, interfaz WAN) | `/router/edit/:router_id` pestaña "Monitoreo" | `editar.router` (ruta) | FE: `routers/components/MonitoreoRouter.vue` · BE: `monitoreo-trafico/monitoreo-trafico.c… | completo ❓ |
| RED-005 | Pestaña Gráficos del router (histórico por interfaz) | `/router/edit/:router_id` pestaña "Gráficos" | `editar.router` (ruta) | FE: `routers/components/GraficosRouter.vue` · BE: `monitoreo-trafico/monitoreo-router.ser… | completo ❓ |
| RED-006 | Comprobar conexión (un router) y Verificar conexión (todos) | `/router` | `ping.router` | FE `routers/IndexPage.vue:97-140,252-272` · BE `mikrotik/mikrotik.controller.ts:53-63`, `… | completo ❓ |
| RED-007 | Reparar router / Reparar todos: efectos exactos | `/router` | `reparar.router` | FE `routers/IndexPage.vue:198-242,304-359` · BE `mikrotik/mikrotik.controller.ts:42-46`,… | completo ❓ |
| RED-008 | Referencia: objetos que ISPMAX crea en el MikroTik por modo (Colas simples, PCQ+Address L… | (transversal) | — |  | completo |
| RED-009 | Activar/Inactivar y Eliminar router | `/router` | `activar.inactivar.router`, `eliminar.router` | FE `routers/IndexPage.vue:167-196,616-770` · BE `router/router.controller.ts:111-124`, `r… | completo ❓ |
| RED-010 | Migrar clientes a otro router + Historial de migraciones | `/router` (modal) | `editar.router` (migrar); historial: `ping.router` o `reparar.router` | FE `routers/components/ModalMigrarRouter.vue`, `ModalHistorialMigraciones.vue` · BE `red-… | completo ❓ |
| RED-011 | Amarre IP/MAC: Aplicar amarre masivo y Auditar amarre | `/router` (modal) | `reparar.router` (+ router con "Seguridad alterna") | FE `IndexPage.vue:277-302`, `components/AuditoriaAmarreModal.vue` · BE `mikrotik/mikrotik… | completo ❓ |
| RED-012 | Clientes del router (modal + Excel) | `/router` (clic en "Total Clientes") | sin clave propia | FE `routers/components/ClientesRouterModal.vue` · BE `router/router.controller.ts:38-61`,… | completo ❓ |
| RED-013 | Detección de router caído, auto-reparación y avisos | (cron backend) + badge en `/router` | — | BE `router/router-monitor.service.ts` (completo), `router/router.module.ts`, entidad `rou… | completo ❓ |
| RED-014 | Listado de Redes IPv4 | `/redes-ipv4` · `index.red_ipv4` | `index.red_ipv4` | FE `redes-ipv4/IndexPage.vue`, `composables/useRedIpv4.js`, `components/{ClientesRedModal… | completo ❓ |
| RED-015 | Alta/edición de Red IPv4 (segmento) | `/redes-ipv4/add` · `crear.red_ipv4`; `/redes-ipv4/edit/:id` · `edita… | `crear.red_ipv4`, `editar.red_ipv4` | FE `redes-ipv4/{AddPage,EditPage}.vue`, `components/FormRedIpv4.vue`, `composables/useRed… | completo ❓ |
| RED-016 | Inspeccionar red IPv4: clientes, IPs libres, ping, Excel | `/redes-ipv4` (modal) | sin clave propia | FE `redes-ipv4/components/ClientesRedModal.vue` · BE `red-ipv4.controller.ts:79-117`, `re… | completo ❓ |
| RED-017 | Trasladar clientes entre redes IPv4 (mismo router) + revertir | `/redes-ipv4` (modal) | `editar.red_ipv4` | FE `redes-ipv4/components/TrasladarClientesModal.vue` · BE `red-ipv4.controller.ts:33-72`… | completo ❓ |
| RED-018 | Excel de redes IPv4: plantilla, importar, exportar | `/redes-ipv4` | sin clave propia | FE `redes-ipv4/components/ModalCargarExcel.vue`, `composables/useRedIpv4.js:81-115` · BE… | completo ❓ |
| RED-019 | Lista de corte por red y mecanismo de corte en MikroTik (tipo de corte) | `/redes-ipv4` (campo "Lista de corte") | `crear/editar.red_ipv4` | BE `red-ipv4.service.ts:81-126`, `mikrotik/mikrotik.service.ts:1217-1554`, `mikrotik-reso… | completo ❓ |
| RED-020 | Listado de Redes IPv6 | `/redes-ipv6` · `redesIpv6.index` | `redesIpv6.index` | FE `redes-ipv6/IndexPage.vue`, `composables/useRedIpv6.js`, `components/{ClientesRedModal… | completo ❓ |
| RED-021 | Alta/edición de Red IPv6 | `/redes-ipv6/add` · `crear.red_ipv6`; `/redes-ipv6/edit/:id` · `redes… | `crear.red_ipv6`, `redesIpv6.edit` | FE `redes-ipv6/{AddPage,EditPage}.vue`, `components/FormRedIpv6.vue`, `composables/useRed… | completo ❓ |
| RED-022 | Inspección IPv6 (clientes, subredes libres) y Excel IPv6 | `/redes-ipv6` | sin clave propia | FE `redes-ipv6/components/{ClientesRedModal,ModalCargarExcel}.vue` · BE `red-ipv6.service… | completo ❓ |
| RED-023 | Listado de Planes de servicio ("Servicios de Internet") | `/servicios/internet` · `index.planes` | `index.planes` | FE `internet/IndexPage.vue`, `components/{ModalClientesPlan,ModalMigrarPlan,ModalCargarEx… | completo ❓ |
| RED-024 | Alta/edición de plan (pestañas Facturación / Parámetros Técnicos) | `/servicios/internert/add` · `crear.planes`; `/servicios/internert/ed… | `crear.planes`, `editar.planes` | FE `internet/{AddPage,EditPage}.vue`, `components/{FormInternet,TabFacturacion,TabTecnico… | completo ❓ |
| RED-025 | Qué pasa con clientes, router y facturas al editar un plan | (efectos de RED-024) | — |  | completo ❓ |
| RED-026 | Migrar clientes de un plan a otro | `/servicios/internet` (modal) | `editar.planes` | FE `internet/components/ModalMigrarPlan.vue` · BE `internet.controller.ts:110-120`, `inte… | completo ❓ |
| RED-027 | Clientes del plan (modal + Excel), Activar/Inactivar y Eliminar plan | `/servicios/internet` | `activar.inactivar.planes`, `eliminar.planes` | FE `internet/components/ModalClientesPlan.vue`, `IndexPage.vue:105-127` · BE `internet.se… | completo ❓ |
| RED-028 | Excel de planes: plantilla, importar, exportar | `/servicios/internet` | sin clave propia | FE `internet/components/ModalCargarExcel.vue`, `composables/useInternet.js:228-257` · BE… | completo ❓ |
| RED-029 | Corte de servicio: cómo se materializa en MikroTik y OLT, y config. por router | (cron/cola) + Ajustes › Configuración de Cortes (`/ajustes/servicio`) | `variables.dias-habilitados`, `variables.horario.cortes`, `variables.… | BE: `app.service.ts:31-50, 239-338, 340-418, 419-444` · `app.controller.ts:32-49, 52-60,… | completo ❓ |
| RED-030 | "Obtener IP" (herramienta suelta) | `/red/getIp` · `getIp` | `getIp` (sin ítem de menú) |  | completo |
| RED-031 | Permisos, alcance por router y menú | transversal | todas las del dominio |  | completo |

## Cajas NAP, mapa y monitoreo

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| NET-001 | Cajas NAP — listado, ocupación de puertos, activar/inactivar, eliminar | `/cajas-nap` · `index.caja_nap` | `index.caja_nap`; botones: `crear.caja_nap`, `editar.caja_nap`, `acti… | FE: `pages/dashboard/Gestion-Red/cajas-nap/IndexPage.vue`, `components/ClientesCajaModal.… | completo ❓ |
| NET-002 | Cajas NAP — crear y editar (formulario) | `/cajas-nap/add` · `crear.caja_nap`; `/cajas-nap/edit/:id` · `editar.… | `crear.caja_nap`, `editar.caja_nap` | FE: `cajas-nap/AddPage.vue`, `EditPage.vue`, `components/FormNap.vue`, `composables/useNa… | completo ❓ |
| NET-003 | Cajas NAP — clientes de una caja (modal) y Excel de clientes | Modal "Ver clientes de esta caja" en `/cajas-nap` | (`index.caja_nap`) | FE: `cajas-nap/components/ClientesCajaModal.vue`, `cajas-nap/IndexPage.vue:74-81,552-561,… | completo ❓ |
| NET-004 | Cajas NAP — carga masiva por Excel, plantilla y exportación | Modal "Carga masiva de cajas NAP" · menú Excel | `crear.caja_nap` (importar); plantilla/exportación sin permiso | FE: `cajas-nap/components/ModalCargarExcel.vue`, `IndexPage.vue:228-266` · BE: `caja-nap.… | completo ❓ |
| NET-005 | Cajas NAP — reporte PDF (endpoint Excel sin botón) | Botón "PDF" en `/cajas-nap` | sin permiso | FE: `cajas-nap/IndexPage.vue:197-226,383-396` · BE: `caja-nap.controller.ts:76-122`, `caj… | completo ❓ |
| NET-006 | Asignación de cliente a puerto NAP y modelo de puertos | Sección "Red física (NAP)" del servicio del cliente; importación de c… | los del formulario de cliente/instalación | FE: `pages/dashboard/clientes/components/ServicioInternet.vue` (`retirarIpsUsadas` 454-47… | completo ❓ |
| NET-007 | Selector de coordenadas (ModalMapBox) | Modal "Coordenadas Seleccionada" | los de la pantalla que lo abre | FE: `src/components/ModalMapBox.vue`, `src/boot/apiSearchPlaces.js`, `src/composables/use… | completo ❓ |
| NET-008 | Mapa de Red y Clientes — vista principal, búsqueda, filtros, capas, popups | `/mapa-nap` · `index.mapa` | `index.mapa` | FE: `pages/dashboard/Gestion-Red/mapa-nap/IndexPage.vue` (5 421 líneas: script 1-4062, pl… | completo (estilos CSS no auditados) ❓ |
| NET-009 | Mapa — red de fibra física: postes, mangas, nodos, tendido (visualización) | Capas de `/mapa-nap` | `index.mapa` | FE: `mapa-nap/IndexPage.vue:415-1016` · BE: `red-fibra/red-fibra.controller.ts:16-19`, `r… | completo ❓ |
| NET-010 | Mapa — modo edición (postes, tramos, mover cajas/clientes, acometidas) | Botón "Editar red" de `/mapa-nap` | `editar.red.mapa` | FE: `mapa-nap/IndexPage.vue:1018-1703, 4236-4336, 4574-4704` · BE: `red-fibra.controller.… | completo ❓ |
| NET-011 | Mapa — importar KMZ/KML y deshacer importación | Barra de edición → "Importar KMZ" | `editar.red.mapa` | FE: `mapa-nap/components/ModalImportarKmz.vue`, `mapa-nap/utils/kmz.js`, `IndexPage.vue:4… | completo ❓ |
| NET-012 | Mapa — capa Técnicos (ubicación) | Capas y filtros → "Ver dónde están" | `mapa.tecnicos.index` (también en backend) | FE: `mapa-nap/IndexPage.vue:3602-3808`, `src/composables/useLatidoUbicacion.js`, `src/com… | completo ❓ |
| NET-013 | Mapa — distancias, rutas y "¿Cómo llegar aquí?" | `/mapa-nap` | `index.mapa` | FE: `mapa-nap/IndexPage.vue:393-413, 1705-2120, 3329-3482`. | completo ❓ |
| NET-014 | Monitoreo de Red — listado y resumen | `/monitoreo-red` · `index.monitoreo_red` | `index.monitoreo_red` | FE: `pages/dashboard/Gestion-Red/monitoreo-red/IndexPage.vue`, `composables/useMonitoreoR… | completo ❓ |
| NET-015 | Monitoreo de Red — alta/edición de dispositivo | Diálogo en `/monitoreo-red` | `index.monitoreo_red` | FE: `monitoreo-red/components/FormDispositivo.vue`, `composables/useMonitoreoRed.js:130-1… | completo ❓ |
| NET-016 | Monitoreo de Red — detalle: ping manual, latencia, disponibilidad | Diálogo "Historial / Ping" | `index.monitoreo_red` | FE: `monitoreo-red/components/DetalleDispositivo.vue` · BE: `monitoreo-dispositivos.contr… | completo ❓ |
| NET-017 | Monitoreo de Red — Alertas (correo, WhatsApp, campanita) y "Mostrar en el Dashboard" | Diálogo "Alertas de red"; toggle | `index.monitoreo_red` | FE: `monitoreo-red/components/ConfigNotificaciones.vue` · BE: `monitoreo-dispositivos-not… | completo ❓ |
| NET-018 | Colector de ping de dispositivos (cron cada minuto) | Sin pantalla | — | BE: `monitoreo-dispositivos/monitoreo-dispositivos-collector.service.ts`, `common/utils/l… | completo ❓ |
| NET-019 | Monitoreo de tráfico — recolección, consolidación y retención (cron) | Sin pantalla | — | BE: `monitoreo-trafico/monitoreo-trafico-collector.service.ts`, `entities/trafico-*.entit… | completo ❓ |
| NET-020 | Monitoreo de tráfico — consumo, disponibilidad y ping del cliente | `/clientes/edit/:client_id` → pestaña "Consumo" | permisos de la ficha de cliente | FE: `clientes/components/editar/Consumo/ConsumoPage.vue` (1 229 líneas, leído completo),… | completo ❓ |
| NET-021 | Monitoreo de tráfico — Router (Monitoreo/Gráficos/WAN) y Dashboard (Tráfico Clientes, Cli… | `/router/edit/:id` pestañas; Dashboard `/` | `dashboard.resumen_sistema` (tarjetas); permisos de router | FE: `routers/EditRouter.vue` (94 líneas), `routers/components/MonitoreoRouter.vue` (391),… | completo ❓ |
| NET-022 | Detección de conexión real de clientes (cron 5 min) | Sin pantalla (se ve en el mapa y en "Consumo") | — | BE: `monitoreo-trafico/monitoreo-conexion.service.ts`, `monitoreo-trafico/entities/conexi… | completo ❓ |
| NET-023 | Heartbeat de routers y auto-reparación (cron 5 min) | `/router` ("Verificar conexión", badge "Sin conexión") | — | BE: `router/router-monitor.service.ts`, `router/router.controller.ts:21-27`; FE: `Gestion… | completo (UI en inventario de Routers) ❓ |
| NET-024 | Servicios Personalizados — qué son y listado | `/personalizado` · `personalizado.index` | `personalizado.index` (no asignable desde roles) | FE: `pages/dashboard/Gestion-Red/personalizado/IndexPage.vue`, `components/FormPersonaliz… | completo ❓ |
| NET-025 | Servicios Personalizados — crear/editar y aplicar el cambio a usos | Diálogo "Nuevo/Editar Perfil" | `personalizado.index` | FE: `components/FormPersonalizado.vue`, `composables/usePersonalizado.js` · BE: `servicio… | completo ❓ |
| NET-026 | Servicios Personalizados — "En uso" y eliminar | Diálogo de usos | `personalizado.index` | FE: `components/UsosPersonalizado.vue`, `IndexPage.vue:51-66` · BE: `service.ts:62-68,291… | completo ❓ |
| NET-027 | Referencia — modelo de datos de red física y monitoreo | Sin pantalla | — | BE: `caja-nap/entities/caja-nap.entity.ts`, `puertos/entities/puerto.entity.ts`, `red-fib… | completo |
| NET-028 | Referencia — useUbicacion, useUbicacionLabels, useHelperRedes, useLatidoUbicacion | Sin pantalla | — | FE: `src/composables/useUbicacion.js`, `useUbicacionLabels.js`, `useHelperRedes.js`, `use… | completo ❓ |
| NET-029 | Cajas NAP — caja principal / secundaria (formulario y columna "Tipo de caja") | `/cajas-nap`, `/cajas-nap/add`, `/cajas-nap/edit/:id` | `crear.caja_nap`, `editar.caja_nap` | FE: `cajas-nap/components/FormNap.vue:16-61, 341-410`, `cajas-nap/composables/useNap.js:1… | completo (código del 2026-10-14) ❓ |
| NET-030 | Mapa — enlaces entre cajas, ★ de caja principal y "Clientes sin caja NAP" | `/mapa-nap` · `index.mapa` | `index.mapa` | FE: `mapa-nap/IndexPage.vue` (estado `:46-49`; `principal` en el modelo de cajas `:179-18… | completo (código del 2026-10-14) ❓ |

## Tickets, instalaciones y técnicos

| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |
|---|---|---|---|---|---|
| SOP-001 | Listado de tickets (tarjetas, filtros, columnas, acciones de fila) | `/tickets` · `tickets.index` · menú Gestion de Clientes → Tickets | `tickets.index`; `tickets.ver_otros`; `tickets.add`; `tickets.edit`;… | FE: `pages/dashboard/tickets/IndexPage.vue`, `components/ResumenCardsTickets.vue`, `compo… | completo ❓ |
| SOP-002 | Crear ticket ("Nuevo Ticket") | `/tickets/add` · `tickets.add` | `tickets.add`; `tickets.asignar_otros` | FE: `AddTicket.vue`, `components/FormTicket.vue`, `composables/useTicket.js` · BE: `ticke… | completo ❓ |
| SOP-003 | Detalle y edición del ticket (pestañas Detalles / Formulario Ticket / Materiales) | `/tickets/edit/:id` · `tickets.edit` | `tickets.edit` (ruta); creador o SUPER-ADMINISTRADOR (pestaña Formula… | FE: `EditTicket.vue`, `components/TabPanels.vue`, `DetalleTicket.vue`, `FormTicket.vue`,… | completo ❓ |
| SOP-004 | Ciclo de vida del ticket: estados, cambio de estado, cierre y reapertura | botón "Cambiar Estado" en `tickets.edit` | `tickets.cambiar_estado_otros`; creador; técnico asignado | FE: `components/DetalleTicket.vue:29-52,154-178,230-336` · BE: `ticket.service.ts:789-880… | completo ❓ |
| SOP-005 | Respuestas del ticket (comentarios, adjuntos, aviso al otro usuario) | sección "LISTADO DE RESPUESTAS" en `tickets.edit` | (sin permiso propio; ruta `tickets.edit`) | FE: `components/ListRespuestas.vue`, `components/AgregarRespuesta.vue` · BE: `respuestas-… | completo ❓ |
| SOP-006 | Visita del técnico: marcar llegada / salida con ubicación | tarjeta "Visita del técnico" en `tickets.edit` | técnico asignado, apoyo (si ajuste) o SUPER-ADMINISTRADOR | FE: `components/VisitaTicket.vue`, `src/composables/useUbicacion.js`, `src/utils/mensajeE… | completo ❓ |
| SOP-007 | Materiales del ticket (equipos entregados y accesorios) | pestaña "Materiales" de `tickets.edit` | `tickets.edit` | FE: `components/MaterialesTicket.vue` + modales compartidos `pages/dashboard/instalacione… | completo ❓ |
| SOP-008 | Firma del ticket por el cliente (electrónica o en el dispositivo) | botón de firma en `/tickets` y en `tickets.edit` | `tickets.edit`; modo `firmaTicketModo` | FE: `components/FirmaTicketDialog.vue`, `FirmaManuscritaDialog.vue`, `PadFirma.vue`, `com… | completo ❓ |
| SOP-009 | Técnicos de apoyo en el ticket | campo "Técnicos de apoyo" (Form) + Ajustes | `tickets.asignar_otros` + ajuste `ticketApoyoHabilitado` | FE: `components/FormTicket.vue:73-98,288-322`, `composables/useTicket.js:50-54`, `pages/d… | completo ❓ |
| SOP-010 | Notificaciones del ticket (WhatsApp/correo, campana, reenvío manual, plantillas) | modal "Enviar Notificación" + toggles del formulario | `ticket.reenviar_msg` / `cliente.ticket.reenviar_msg` | FE: `components/NotificacionModal.vue`, `src/composables/useWaCanal.js`, `pages/dashboard… | completo ❓ |
| SOP-011 | Impresión y exportación: PDF/Excel del listado, PDF del ticket, formato Word | botón "Reporte", icono PDF, Ajustes → Plantillas | (sin permiso propio) | FE: `composables/useTicket.js:262-373` · BE: `ticket/ticket.service.ts:1269-1396,1545-177… | completo ❓ |
| SOP-012 | Reportes de tickets: Productividad y Por Cliente | `/tickets/reportes` · `tickets.reportes` | `tickets.index` (mapeado en el guard) | FE: `ReportesPage.vue`, `components/ReporteProductividad.vue`, `components/ReporteCliente… | completo ❓ |
| SOP-013 | Tickets desde la ficha del cliente | Cliente → pestaña "Tickets" | `cliente.ticket.index/agregar/editar/eliminar/reenviar_msg/asignar_ot… | FE: `pages/dashboard/clientes/components/editar/Servicios/TicketsPage.vue` (reutiliza `Fo… | completo ❓ |
| SOP-014 | Listado de instalaciones (tarjetas, filtros, exportación) | `/instalaciones` · `instalaciones.index` | `instalaciones.index/add/edit/delete/notificar/imprimir` | FE: `pages/dashboard/instalaciones/Indexpage.vue`, `components/ResumenCardsInstalaciones.… | completo ❓ |
| SOP-015 | Crear instalación ("Nueva Instalación") | `/instalaciones/add` · `instalaciones.add` | `instalaciones.add` | FE: `AddInstalacion.vue`, `components/FormInstalaciones.vue`, `composables/useInstalacion… | completo ❓ |
| SOP-016 | Detalle y edición de la instalación (pestañas Detalles / Formulario Instalación / Materia… | `/instalaciones/edit/:id` · `instalaciones.edit` | `instalaciones.edit`; creador o SUPER-ADMINISTRADOR (pestaña Formular… | FE: `EditInstalacion.vue`, `components/DetalleInstalacion.vue`, `FormInstalaciones.vue`,… | completo ❓ |
| SOP-017 | Ciclo de vida de la instalación: estados, transiciones, motivo y reagendado | botón "Cambiar Estado" en `instalaciones.edit` | (solo `instalaciones.completar` para INSTALADO) | FE: `DetalleInstalacion.vue:75-100,136-165`, `EditInstalacion.vue:69-230`, `DialogReagend… | completo ❓ |
| SOP-018 | Reasignar técnico de una instalación (con motivo e historial) | botón "Reasignar" en Detalles | `instalaciones.edit` + creador/SUPER-ADMINISTRADOR | FE: `DetalleInstalacion.vue:27-34,211-228`, `DialogReasignarTecnico.vue`, `EditInstalacio… | completo ❓ |
| SOP-019 | Checklist de instalación | sección "Checklist de instalación" en Detalles | (sin permiso propio) | FE: `components/ChecklistInstalacion.vue`, `pages/dashboard/ajustes/instalacion/Checklist… | completo ❓ |
| SOP-020 | Respuestas de la instalación | sección "LISTADO DE RESPUESTAS" | (sin permiso propio) | FE: `pages/dashboard/instalaciones/components/ListRespuestasInstalacion.vue`, `components… | completo ❓ |
| SOP-021 | Materiales de la instalación (productos y accesorios, stock, venta/comodato) | pestaña "Materiales" | (sin permiso propio) | FE: `EditInstalacion.vue:255-377, 617-679`, `components/AgregarProductoModal.vue`, `compo… | completo ❓ |
| SOP-022 | Pre-asignación técnica (borrador de plan/router/red/NAP/IP) | tarjeta "Pre-asignación técnica" en el formulario | (pestaña Formulario) | FE: `components/SeccionPreAsignacion.vue`, `composables/useInstalaciones.js:22`, `cliente… | completo ❓ |
| SOP-023 | Completar instalación: alta de cliente/servicio y qué se transfiere | "Cambiar Estado → INSTALADO" → `/clientes/add` o ficha del cliente | `instalaciones.completar` (+ permisos de cliente) | FE: `instalaciones/EditInstalacion.vue:72-130, 179-189`, `clientes/AddCliente.vue:12-76`,… | completo ❓ |
| SOP-024 | Notificaciones de instalación (por estado, reenvío manual, plantillas) | modal "Enviar Notificación de Instalación"; Ajustes → Plantillas → In… | `instalaciones.notificar`; `variables.ver.plantilla.instalacion` | FE: `components/NotificacionInstalacionModal.vue`, `Indexpage.vue:478-490`, `components/F… | completo ❓ |
| SOP-025 | Hoja de instalación (PDF) y exportación del listado (Excel/PDF) | icono impresora; botón "Reporte" | `instalaciones.imprimir` | FE: `Indexpage.vue` · BE: `instalaciones/instalaciones.controller.ts:95-128, 167-177`, `i… | completo ❓ |
| SOP-026 | Reportes / KPIs de instalaciones | `/instalaciones/reportes` · `instalaciones.reportes` | `instalaciones.index` (mapeado en el guard) | FE: `ReportesPage.vue`, `components/ReportesInstalaciones.vue`, `components/ResumenCardsI… | completo ❓ |
| SOP-027 | Ubicación de técnicos: aviso periódico desde el panel | automático al iniciar sesión (rol "TECNICO") | rol cuyo nombre sea TECNICO | FE: `composables/useLatidoUbicacion.js`, `composables/useUbicacion.js`, `composables/useA… | completo ❓ |
| SOP-028 | Jornada del técnico en la app ISPMAX | botón de ubicación en la cabecera (solo app) | rol TECNICO + app Android | FE: `layouts/BotonJornada.vue`, `composables/useAppIspmax.js`, `composables/useUbicacion.… | completo ❓ |
| SOP-029 | Capa "Técnicos" del Mapa de Red (qué ve el administrador) | `/mapa-nap` · `index.mapa` → menú de capas → "Técnicos" | `mapa.tecnicos.index` | FE: `Gestion-Red/mapa-nap/IndexPage.vue:3780-4020, 4691-4698, 4739-4744, 5175-5210` · BE:… | completo ❓ |
| SOP-030 | Matriz de permisos y control de acceso del dominio | Usuarios → Roles → "Tickets" / "Instalaciones" | catálogo `gestion-clientes-permisos.json` |  | completo ❓ |
| SOP-031 | Ajustes que gobiernan tickets e instalaciones | Ajustes → Plantillas → Tickets / Instalación / Formato de Ticket | `variables.ver/edita.plantilla.ticket`, `variables.ver.plantilla.inst… | FE: `ajustes/plantillas/IndexPage.vue`, `ajustes/ticket/{IndexPage,PlantillaMsgCliente,Pl… | completo ❓ |
