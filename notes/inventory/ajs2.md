# Inventario AJS2 — Mensajería, plantillas, contratos, pasarelas de pago, firma electrónica y formas de pago

> Alcance: FE `src/pages/dashboard/ajustes/{plantillas,contratos,mensajeria,pasarelas-pago,firma-electronica,formas-pago}` + `formas-pago/` + `detalle-formas-pago/` (y, por estar embebidos como pestañas de Plantillas, `ajustes/ticket/` y `ajustes/instalacion/`); BE `src/{plantillas,contratos,contratos-archivos,mensajes-masivos,cloud-api,email,pasarelas-pago,firma-electronica,forma-pago,detalle-forma-pago}` y, para ubicar cada plantilla en su evento, los procesadores que las consumen (`pagos/`, `customers/`, `promesas-pago/`, `servicios-recurrente/`, `ticket/`, `instalaciones/`). Generado desde el ZIP del 2026-10-06.
>
> Convenciones de cita: `FE:` = `frontend-isp-main/src/…`, `BE:` = `backend-isp-main/src/…`. Todo lo marcado ✅ se leyó en código. Nada está marcado 🖥️ (no hay instancia). Lo no confirmado va en "Pendiente de validar en UI" con ❓.
>
> Nota de lectura: en el backend **ningún** endpoint de este dominio comprueba permisos finos; solo `@Auth()` (JWT válido) — `BE:auth/guards/user-role/user-role.guard.ts` solo exige que exista `req.user`. Los permisos (`variables.*`, `ajuste.*`, `index.*`…) se aplican **únicamente en el frontend** (ocultan botones/pestañas y el guard de rutas).

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| MSG-001 | Catálogo maestro de plantillas editables (nombre, canal, evento, variables) | Ajustes › Plantillas (+ Contratos, Tickets, Instalación) | ver §MSG-002 | completo |
| MSG-002 | Contenedor "Plantillas" y acceso | `/ajustes/plantillas` · `ajuste.plantillas` | `ajuste.plantillas` + `variables.ver.*` | completo |
| MSG-003 | Plantilla · Recordatorio de pago (+ Probar, ▶ Ejecutar ahora) | pestaña "Recordatorio de pago" | `variables.ver.recordatorio.pago` / `variables.edita.recordatorio.pago` | completo |
| MSG-004 | Plantilla · Mensaje de Bienvenida | pestaña "Mensaje de Bienvenida" | `variables.ver.mensaje.bienvenida` / `variables.edita.mensaje.bienvenida` | completo |
| MSG-005 | Plantilla · Aviso de pagos recibidos (servicio / libre) | pestaña "Aviso de pagos recibidos" | `variables.ver.pago.recibido` / `variables.edita.pago.recibido` | completo |
| MSG-006 | Plantilla · Promesa de pago | pestaña "Promesa de pago" | `variables.ver.promesa.pago` / `variables.edita.promesa.pago` | completo |
| MSG-007 | Formato de impresión de pagos (ticket/recibo) + impresora térmica | pestaña "Formato de impresion de pagos" | `variables.ver.plantilla.impresion.pagos` / `variables.edita.plantilla.impresion.pagos` | completo (FE); BE solo preview |
| MSG-008 | Plantillas · Tickets (mensaje cliente/técnico, firma del ticket, técnicos de apoyo) | pestaña "Tickets" | `variables.ver.plantilla.ticket` / `variables.edita.plantilla.ticket` | completo |
| MSG-009 | Plantillas · Aviso Contrato / Aviso Documento (mensaje) | pestaña "Aviso Contrato" | `variables.ver.plantilla.mensaje.contrato` / `variables.edita.plantilla.mensaje.contrato` | completo |
| MSG-010 | Plantilla Documento (.docx de contrato) + Variables.pdf + vista previa | pestaña "Plantilla Documento" | `variables.ver.plantilla.documentos.contrato` / `variables.agrega.…` / `variables.edita.…` | completo |
| MSG-011 | Formato de Ticket (.docx) | pestaña "Formato de Ticket" | `variables.ver.plantilla.documentos.contrato` (+ edita.documentos) | completo |
| MSG-012 | Plantilla · Cargo Recurrente | pestaña "Cargo Recurrente" | `variables.ver.cargo.recurrente` / `variables.edita.cargo.recurrente` (⚠ no están en el catálogo) | completo |
| MSG-013 | Plantillas · Instalación (notificaciones por estado + checklist) | pestaña "Instalación" | `variables.ver.plantilla.instalacion` (⚠ no está en el catálogo) | completo |
| MSG-014 | Control "WhatsApp Oficial" por plantilla (aprobación en Meta, sincronizar, vincular aprobada) | dentro de cada pestaña | sin permiso propio | completo |
| MSG-015 | Contenedor Ajustes › Mensajería | `/ajustes/mensajeria` · `ajuste.mensajeria` | `variables.vincular.whatsApp` / `variables.config.servidor.correo` | completo |
| MSG-016 | WhatsApp No oficial (Baileys): vincular por QR, cerrar sesión | Mensajería › WhatsApp › "No oficial" | `variables.vincular.whatsApp` | completo (gateway externo no leído) |
| MSG-017 | WhatsApp Oficial (Cloud API vía Dualhook): credenciales, webhook, overflow, límites | Mensajería › WhatsApp › "Oficial" | `variables.vincular.whatsApp` | completo |
| MSG-018 | Selección de canal y reglas de envío (interruptor "Usar WhatsApp…", canal activo, override) | Mensajería + diálogos de envío | `variables.vincular.whatsApp` | completo |
| MSG-019 | Servidor de correo (SMTP) y prueba | Mensajería › "Datos del servidor correo" | `variables.config.servidor.correo` | completo |
| MSG-020 | Mensajes Masivos · Nuevo envío | Mensajería › Mensajes Masivos › "Nuevo envío" | sin permiso propio | completo |
| MSG-021 | Mensajes Masivos · Historial (cancelar / reanudar) | pestaña "Historial" | sin permiso propio | completo |
| MSG-022 | Mensajes Masivos · Mensajes enviados (detalle por destinatario, reenviar, eliminar) | pestaña "Mensajes enviados" | sin permiso propio | completo |
| MSG-023 | Contratos (BE): ciclo de vida, API y generación del PDF (.docx → LibreOffice) | Cliente › Documentos › Listado de Contratos (ver SRV-010/011) + Plantillas | `cliente.contrato.index/agregar/editar/eliminar/descargar/notificacion`; plantillas: `variables.*.plantilla.documentos.contrato` | completo |
| MSG-024 | Notificar contrato / documento al cliente | Cliente › Documentos › icono Enviar Notificación | `cliente.contrato.notificacion` · `cliente.documento.notificacion` | completo |
| MSG-025 | Firma de Contratos: configuración del proveedor (Dátil) | `/ajustes/firma-electronica` · `ajuste.firma-electronica` | tile: `variables.ver.plantilla.*contrato*` + `ajuste.plantillas`; ruta: `ajuste.firma-electronica` (fuera de catálogo: solo SUPER-ADMINISTRADOR) | completo |
| MSG-026 | Envío a firmar (contratos) y aviso de firma completada (webhook) | Cliente › Documentos › Listado de Contratos › "Enviar a firmar" | sin permiso propio (se ve con `cliente.contrato.index`) | completo |
| MSG-027 | Certificado .p12 de la empresa (SRI): carga, validación, vencimiento | Ajustes › Empresa (cruce) + banner en cabecera | `ajuste.empresa` / `index.empresa` | completo |
| MSG-028 | Pasarelas de Pagos (contenedor, "Cobrar con", pestaña Pago Internet) | `/ajustes/pasarelas-pago` · `ajuste.pasarelas-pago` | tile: `index.forma-pago`/`index.detalle-forma-pago` + `ajuste.forma-pago`; ruta: `ajuste.pasarelas-pago` (fuera de catálogo: solo SUPER-ADMINISTRADOR) | completo |
| MSG-029 | PayPhone: credenciales, comprobación, vigencia del enlace | pestaña "PayPhone" | idem | completo |
| MSG-030 | dLocal Go: credenciales, país, sandbox | pestaña "dLocal Go" | idem | completo |
| MSG-031 | Webhook de pasarelas y asiento automático del pago | `POST /api/pasarelas-pago/webhook` | público (firma HMAC) | completo (config); flujo de cobro = otro agente |
| MSG-032 | Formas de pago | Ajustes › Formas de pagos › "Formas de pago" | `index.forma-pago`, `crear.`, `editar.`, `activar.inactivar.`, `eliminar.forma-pago` | completo |
| MSG-033 | Detalle de formas de pago (bancos/cuentas) | Ajustes › Formas de pagos › "Detalle formas pago" | `index.detalle-forma-pago`, `crear.`, `editar.`, `activar.inactivar.`, `eliminar.detalle-forma-pago` | completo |
| MSG-034 | Uso de formas de pago en "Registrar pago" y pagos automáticos | Registrar pago / modales de pago | — | completo (lado catálogo) |

---

## MSG-001 · Catálogo maestro de plantillas editables

- **Dónde se editan:** Ajustes › Plantillas (11 pestañas) y, dentro de ellas, las sub-pestañas de Tickets, Aviso Contrato e Instalación. Las plantillas de **mensaje** (texto con `{ variable }`) viven como columnas del registro `settings` (se guardan con `PATCH /settings/:id`, `BE:settings/settings.controller.ts:41`; sin permiso fino) y las de **documento** (.docx) como filas de `plantilla` (`BE:plantillas/entities/plantilla.entity.ts:5`).
- **Cómo se reemplazan las variables ✅:** `HelpersService.adaptarParaWhatsapp` (`BE:common/utils/helpers.service.ts:45`). Regex `\{\s*clave\s*\}` **sin distinguir mayúsculas** (admite `{cliente}` y `{ cliente }`); primero "sana" etiquetas de formato metidas dentro de las llaves (`:32`). Una variable que el sistema no conoce **se queda escrita tal cual** en el mensaje. Para WhatsApp no oficial convierte negrita→`*x*`, cursiva→`_x_`, listas→guiones/números, quita subrayado y alineación (`:63-123`); para correo deja el HTML.
- **Canal oficial (Meta) ✅:** el texto del editor se convierte a formato Meta con `{{1}} {{2}}…` (`BE:cloud-api/template-converter.ts:182`); al enviar, cada `{{n}}` se rellena con la variable que ocupó esa posición; si alguna llega **vacía**, el envío falla con *"El cliente tiene datos incompletos: la(s) variable(s) … llegó vacía. Meta rechaza plantillas con parámetros vacíos."* (`BE:cloud-api/cloud-api.service.ts:1463-1470`).
- **Casi todos los mensajes automáticos quedan registrados** en "Mensajes enviados" (tabla `mensajes-masivos-detalle`) con su `origen` (ver MSG-022). **No** se registran el *Aviso Documento* (`contratos-archivos.service.ts` no usa `MensajesMasivosService`) ni el *Enlace de pago* (`envio-cobro.service.ts`) ✅.

### 1.1 Plantillas de mensaje (texto)

| # | Nombre en pantalla (pestaña › bloque) | Campo en `settings` / tipo Meta | Canal(es) | Evento que la dispara | Asunto del correo |
|---|---|---|---|---|---|
| 1 | Recordatorio de pago › **Antes del vencimiento** | `plantillaNotificacion.antes` · `recordatorio_pago_antes` | WhatsApp (oficial o no) + Correo, según lo marcado en cada cliente | Cron diario a las horas de `cronNotificacion` (3 horarios, por defecto `06:15`) para los servicios con factura **FACT. DE SERVICIO** en *NO PAGADO/PENDIENTE* cuyo recordatorio del cliente cae hoy "N días antes del vencimiento", donde "vencimiento" es la **fecha de corte con días de gracia** (`fechaCorteMasDiasGracia`) (`BE:pagos/notificar-recortatorio-pago-queue.processor.ts:188-250,452-453`). También ▶ "Ejecutar ahora", "Probar" y envío manual desde el perfil del cliente. | `<empresa> - Recordatorio de pago` (`:1004`) |
| 2 | Recordatorio de pago › **Durante el vencimiento** | `plantillaNotificacion.durante` · `recordatorio_pago_durante` | ídem | Mismo cron; el día de la fecha de corte, o cuando el cliente tiene "Notificar suspensión" (`:201,216-223`) | ídem |
| 3 | Recordatorio de pago › **Después del vencimiento** | `plantillaNotificacion.despues` · `recordatorio_pago_despues` | ídem | Mismo cron; "N días después del vencimiento" (`:235`) | ídem |
| 4 | **Mensaje de Bienvenida** | `sendWelcomeMessage.msg` (+ `.activo`, `.whatsApp`, `.email`) · `bienvenida` | WhatsApp y/o Correo (casillas "Enviar por") | Al **crear un cliente** si el toggle "Enviar mensaje de bienvenida" está activo (`FE:pages/dashboard/clientes/composables/useCliente.js:604-609`) y manualmente con "Enviar mensaje bienvenida" (`FE:pages/dashboard/clientes/components/modals/ModalMessageWelcome.vue:78`) | `<empresa> - BIENVENIDO/A` (`BE:customers/customer-queue.processor.ts:278`) |
| 5 | **Aviso de pagos recibidos** › "Factura de Servicio" | `plantillaMsgPagoRecibo` · `pago_recibido_servicio` | WhatsApp + Correo (según el diálogo "enviar comprobante por") | Al **registrar un pago** y marcar enviar comprobante; reenvío desde Ventas; **automático** al asentarse un cobro de pasarela (`tipo_envio:'ambas'`, `BE:registro-pagos/registrar-abono.service.ts:711-745`) | `asuntoCorreoPagoRecibido`; si está vacío: `<empresa> - confirmación de pago, servicio de internet` (`BE:pagos/notificar-cobro-queue.processor.ts:86-94`) |
| 6 | **Aviso de pagos recibidos** › "Factura Libre" | `plantillaMsgPagoReciboLibre` (si está vacío cae a la de servicio) · `pago_recibido_libre` | ídem | ídem, cuando el pago es de una factura **FACT. LIBRE** (`:76-79`) | `asuntoCorreoPagoReciboLibre` (mismo valor por defecto) |
| 7 | **Promesa de pago** | `plantillaPromesaPago` · `promesa_pago` | WhatsApp + Correo | Al registrar una promesa marcando "Notificar al cliente" y reenvío desde el listado de promesas mientras siga vigente (`BE:promesas-pago/promesas-pago-notificacion.service.ts:43-123`) | `Promesa de pago hasta el <fecha_promesa>` (`:164`) |
| 8 | **Cargo Recurrente** | `plantillaMsgCargoRecurrente` · `cargo_recurrente` | WhatsApp + Correo | Envío manual del comprobante de un cargo recurrente (job `enviarComprobanteRecurrente`, `BE:servicios-recurrente/servicios-recurrente-queue.processor.ts:32`) | `<empresa> - Cargo recurrente registrado` (`:274`) |
| 9 | **Aviso Contrato** › "Plantilla mensaje contrato" | `plantillaMsgContrato` · `contrato` | WhatsApp + Correo | "Notificar" un contrato al cliente (`POST /contratos/notification`, `BE:contratos/contratos.controller.ts:22`) | `<empresa> - NOTIFICACIÓN - CONTRATO` (`BE:contratos/contratos.service.ts:741`) |
| 10 | **Aviso Contrato** › "Plantilla mensaje documento" | `plantillaMsgDocumento` · `documento` | WhatsApp + Correo | "Notificar" un documento subido (`POST /contratos-archivos/notification`) | `<empresa> - NOTIFICACIÓN - CONTRATO` (`BE:contratos-archivos/contratos-archivos.service.ts:372`) |
| 11 | **Tickets** › "Plantilla mensaje cliente" | `plantillaTicketCliente` · `ticket_cliente` | WhatsApp + Correo | Crear/asignar un ticket con notificación activada y "reenviar notificación" (`BE:ticket/ticket.service.ts:223-360`) | `<empresa> - NOTIFICACIÓN - TICKET` (`:546`) |
| 12 | **Tickets** › "Plantilla mensaje tecnico" | `plantillaTicketTecnico` · `ticket_tecnico` | WhatsApp + Correo | Ídem, al técnico responsable y a los de apoyo (`:386-517`) | ídem |
| 13 | **Instalación** › "Notificaciones por estado" › Cliente › Agendada / En proceso / Instalado / Reprogramada / Cancelada | `notifInstalacionCliente.<ESTADO>` · `instalacion_cliente_<estado>` | WhatsApp y Correo (cada uno con su propio texto; el correo con asunto) | Cada cambio de estado de la instalación + creación (AGENDADA) + "Enviar Notificación" (`BE:instalaciones/instalaciones.service.ts:313-472`) | `notifInstalacionCliente.<ESTADO>.email.subject` o `Actualización de instalación - <empresa>` (`:402-405`) |
| 14 | ídem › Técnico › Agendada / En proceso | `notifInstalacionTecnico.<ESTADO>` · `instalacion_tecnico_<estado>` | ídem | Ídem (solo AGENDADA y EN_PROCESO, `:421`) | `…subject` o `Asignación de instalación - <empresa>` (`:450-453`) |
| 15 | *(sin pantalla)* **Enlace de pago** (cobro por pasarela) | tipo Meta `enlace_pago`; texto fijo en código | WhatsApp + Correo | "Enviar enlace de cobro" desde la factura (`POST /pasarelas-pago/cobro/:pagoId/enviar`, `BE:pasarelas-pago/pasarelas-pago.controller.ts:198`) | `<empresa> - Pago de la factura N° <n>` (`BE:pasarelas-pago/envio-cobro.service.ts:140`) |
| 16 | *(sin editor global)* **Mensaje masivo** (texto libre o plantilla de campaña) | se escribe en cada envío; plantillas de campaña en `waTemplates` (origen `campana`) | WhatsApp, Correo o Ambos | Envío manual desde Mensajería › Mensajes Masivos (MSG-020) | `<empresa> - Mensaje` (`BE:mensajes-masivos/mensajes-masivos-queue.processor.ts:206`) |

### 1.2 Variables por plantilla (significado exacto y ejemplo de reemplazo)

Las que muestra la pantalla son las de `TablaVariables` (clic = copiar). Se contrastan con lo que el backend realmente arma.

| Plantilla | Variable | Significado exacto (código) | Ejemplo de reemplazo |
|---|---|---|---|
| Recordatorio de pago (3 etapas) | `{ cliente }` | `customer.nombres` | `Juan Pérez` |
| | `{ corte }` | Fecha de corte `DD/MM/YYYY`. Con "Sumar días de gracia en fecha de pago" activo (`sumarDiaGracias`) es la fecha **con** gracia (`fechaCorte` del resumen, ajustada al próximo día de corte habilitado del router); si no, la fecha sin gracia. Si hay promesa de pago activa, usa su `fecha_limite` (`BE:pagos/notificar-recortatorio-pago-queue.processor.ts:432-452`) | `15/07/2026` |
| | `{ total }` | Importe **sin símbolo**, 2 decimales (`deuda.toFixed(2)`). Con "Sumar meses atrasados en el total" activo = deuda de todos los meses atrasados; inactivo = solo la factura pendiente **con saldo** más antigua (`:403-430`) | `25.00` |
| | `{ plan }` | `perfil_internet.nombre_plan` | `Plan 100 Megas` |
| | `{ empresa }` | `company.nombre_comercial` | `Mi Empresa ISP` |
| | `{ enlace_pago }` | URL de cobro de la pasarela de la **factura pendiente más antigua**; solo se ofrece si hay pasarela "lista para cobrar" (`FE:pages/dashboard/ajustes/plantillas/components/RecordatorioPago.vue:36-41`). Si no se pudo generar, el backend **elimina del mensaje el párrafo/línea** que la contenía (`:635`, `:69-87`) | `https://…` |
| | `{ monto_enlace }` | Importe que cobra ese enlace (`cobro.monto`, 2 decimales) | `25.00` |
| Bienvenida | `{ cliente }` | nombres del cliente | `Juan Pérez` |
| | `{ fecha_pago }` | Fecha de corte `DD/MM/YYYY`: la del primer pago no pagado (respetando los meses de tolerancia); si no hay pendientes, el día de pago del mes siguiente (`BE:customers/customer-queue.processor.ts:88-103`) | `05/11/2026` |
| | `{ plan }` | nombre del plan del servicio | `Plan 50 Megas` |
| | `{ costo }` | Precio del servicio; **más IVA** si el servicio factura "Mas impuestos" (15/14/12 % según `company.iva`, o la tarifa estándar del país) (`:109-120`). Sin símbolo | `28.75` |
| | `{ empresa }` | nombre comercial | `Mi Empresa ISP` |
| Aviso de pagos recibidos | `{ cliente }`, `{ plan }`, `{ empresa }` | igual que arriba | |
| | `{ rango_fecha }` | Periodo de consumo `fecha_facturacion` según "Tipo de periodo de consumo" de Impresión (MSG-007): *Completo* = 01 al fin del mes de corte; *Relativo* = mismo día del mes anterior al día de corte; *Relativo adelantado* = del día de corte al mismo día del mes siguiente (`BE:pagos/pagos.service.ts:1415-1430`) | `27/05/2025 al 27/06/2025` |
| | (asunto del correo) | Acepta las mismas 4 variables (`{ empresa }`, `{ cliente }`, `{ plan }`, `{ rango_fecha }`); el FE solo anuncia `{ empresa }` y `{ cliente }` (`FE:pages/dashboard/ajustes/plantillas/components/AvisoPagoRecibido.vue:170-173`; `BE:pagos/notificar-cobro-queue.processor.ts:91-94`) | |
| Promesa de pago | `{ cliente }` | nombres | |
| | `{ fecha_promesa }` | `fecha_limite` de la promesa `DD/MM/YYYY` | `20/07/2026` |
| | `{ total }` | `total_servicio` de la factura; si la promesa es de **grupo**, la **suma** de las órdenes vigentes del grupo; 2 decimales (`BE:promesas-pago/promesas-pago-notificacion.service.ts:131-153`) | `25.00` |
| | `{ plan }`, `{ empresa }` | plan de la factura; nombre comercial | |
| | `{ nota }` | nota escrita en la promesa (vacío si no hay) | |
| Cargo recurrente | `{ cliente }`, `{ empresa }` | nombres (`Cliente` si no hay); nombre comercial | |
| | `{ tipo_pago }` | modalidad guardada en el cargo (`Mensualmente`, `Un solo pago`, `En X cuotas`) | `Mensualmente` |
| | `{ monto }` | monto del cargo, 2 decimales, **sin símbolo** | `25.00` |
| | `{ estado }` | Pendiente / Activo / Completado / Suspendido / Cancelado (`BE:servicios-recurrente/servicios-recurrente-queue.processor.ts:61-67`) | `Activo` |
| | `{ tipo_factura }` | `FACT. DE SERVICIO` / `FACT. LIBRE` (valor crudo del cargo) | `FACT. DE SERVICIO` |
| | `{ facturas_generadas }` | cantidad de facturas ya generadas por el cargo | `3` |
| | `{ fecha_inicio }` | fecha de creación del cargo `toLocaleDateString('es-EC')` | `1/7/2026` |
| | `{ items }` | lista "• descripción — $precio (+ imp.)" una por línea (WhatsApp) o con `<br>` (correo); descuentos con `-N%` (`:84-122`) | `• Internet 100 Megas — $25.00` |
| Aviso Contrato / Aviso Documento | `{ cliente }` | nombres | |
| | `{ contrato }` | **título** del contrato (o del documento subido) | `Contrato de Servicio N° 123` |
| | `{ plan }` | nombre del plan; `Plan no especificado` si el servicio no tiene plan | |
| | `{ empresa }` | nombre comercial | |
| | `{ fecha_contrato }` | `fechaInicio` del contrato/documento tal cual se guardó (`YYYY/MM/DD` o `YYYY-MM-DD`) | `2026-07-15` |
| Ticket · mensaje al cliente | `{ cliente }`, `{ asunto }`, `{ detalle }`, `{ prioridad }`, `{ turno }` | campos del ticket | |
| | `{ fecha_visita }`, `{ hora_visita }` | fecha y hora de la visita (`hora` vacía si no se indicó) | |
| | `{ tecnico }`, `{ telefono_tecnico }` | nombre y celular del técnico asignado | |
| Ticket · mensaje al técnico | las 9 anteriores (con `{ tecnico }` = nombre de **quien recibe**) más `{ telefono_cliente }`, `{ coordenadas_cliente }` (enlace `https://maps.google.com/maps?q=…`), `{ ipv4 }`, `{ direccion }` (dirección del servicio) | `BE:ticket/ticket.service.ts:255-269,399-403` | |
| Instalación (cliente/técnico) | `{cliente}`, `{tecnico}`, `{fecha_instalacion}`, `{direccion}`, `{telefono}`, `{empresa}`; `{plan}`, `{precio}`, `{ipv4}`, `{ssid_wifi}`, `{password_wifi}` (solo estado INSTALADO); `{motivo}` (REPROGRAMADA/CANCELADA); `{ubicacion}` (enlace a Google Maps, solo plantillas del técnico) | `FE:pages/dashboard/ajustes/instalacion/NotificacionesEstadoConfig.vue:86-111`; BE además calcula `{correo}` que **no** se anuncia (`BE:instalaciones/instalaciones.service.ts:360`) | |
| Enlace de pago (sin editor) | `cliente`, `factura` (nº), `total` (monto), `enlace` (URL), `empresa` | `BE:pasarelas-pago/envio-cobro.service.ts:84-90` | |
| Mensaje masivo | `{nombre_cliente}`, `{cedula_cliente}`, `{celular_cliente}`, `{email_cliente}`, `{plan_cliente}`, `{valor_plan}` (precio del servicio), `{dia_pago}` (fecha de corte del resumen; si falla, `dia_pago` de la factura), `{deuda_cliente}` (`$X.XX de N factura(s)`), `{estado_cliente}` (`Activo`/`Inactivo` del servicio), `{empresa}` | `BE:mensajes-masivos/mensajes-masivos-queue.processor.ts:127-138` | `{deuda_cliente}` → `$25.00 de 1 factura(s)` |

### 1.3 Plantillas de documento (.docx, llaves simples `{variable}`)

| Nombre en pantalla | Para qué | Variables | Evento |
|---|---|---|---|
| **Plantilla Documento** (tarjetas) | Contrato del servicio | Catálogo de `variables-contrato.ts` (ver MSG-010) + campos personalizados del cliente | "Generar Contrato" en el perfil del cliente; "Enviar a firmar" |
| **Formato de Ticket** | Orden de servicio del ticket (impresión y firma) | `GET /ticket/plantilla/variables` (grupos: Ticket, Cliente, Servicio, Técnico/Operador, Empresa, Visita del técnico, Materiales usados, Firma electrónica, Fecha de impresión) (`BE:ticket/variables-ticket.ts:127-350`) | Imprimir/descargar el ticket |

### 1.4 Otros "formatos" editables (no son mensajes)

| Nombre | Dónde | Resumen |
|---|---|---|
| **Formato de impresión de pagos** | Plantillas › "Formato de impresion de pagos" | Orden/visibilidad/estilo de bloques del recibo/factura térmicos, papel y márgenes, impresora local (MSG-007) |
| *Nota por defecto del pago* | Ajustes › **Facturación** (otro agente) | `plantillaNotaPago`, variables `{mes} {mes_mayus} {anio} {mes_anio} {cliente} {plan} {n_factura}` (`BE:settings/entities/setting.entity.ts:307-310`) |

---

## MSG-002 · Ajustes › Plantillas (contenedor, pestañas y permisos)

- **Ruta UI / name:** `/ajustes/plantillas` · `ajuste.plantillas` · menú lateral **Ajustes** → tarjeta circular **Plantillas** (icono `edit_document`). La ruta está declarada **dos veces** idéntica (`FE:router/routes.ts:410-415` y `:440-445`) ✅.
- **Archivos:** FE `pages/dashboard/ajustes/plantillas/IndexPage.vue`, `components/*`, `composables/usePlantillas.js`, `style/style.css`; BE `plantillas/*`, `settings/*`.
- **Para qué sirve:** editar los textos de los mensajes automáticos y los formatos/documentos que ISPMAX envía o imprime.
- **Acceso ✅:**
  - Tarjeta en el hub: `tieneAlguno([variables.ver.recordatorio.pago, variables.ver.mensaje.bienvenida, variables.ver.pago.recibido, variables.ver.plantilla.impresion.pagos, variables.ver.plantilla.ticket, variables.ver.plantilla.mensaje.contrato, variables.ver.plantilla.documentos.contrato])` **y** `ajuste.plantillas` (`FE:pages/dashboard/ajustes/IndexPage.vue:220-232`). Observa que `variables.ver.promesa.pago`, `variables.ver.cargo.recurrente` y `variables.ver.plantilla.instalacion` **no** están en esa lista: un rol que solo tenga esas no ve la tarjeta.
  - Guard de ruta: la rama `ajuste.plantillas` está **comentada** (`FE:router/auth-guard.ts:115-118`), así que se exige `permisos.includes('ajuste.plantillas')` o SUPER-ADMINISTRADOR (`:135-140`).
  - Al montar, si el usuario no tiene ninguno de los 10 permisos `ver` → redirige al `dashboard` (`FE:…/plantillas/IndexPage.vue:97-114`).
  - Selecciona automáticamente la primera pestaña permitida (`:69-77`).
- **Secciones / pestañas** (vertical en escritorio; en móvil un selector "Sección de plantilla"): 

| Etiqueta de pestaña | `name` | Componente | Permiso para ver (`tieneAlguno`) | Permiso para guardar |
|---|---|---|---|---|
| Recordatorio de pago | `recordatorio_pago` | `RecordatorioPago.vue` | `variables.ver.recordatorio.pago` | `variables.edita.recordatorio.pago` |
| Mensaje de Bienvenida | `tecnico` | `MensajeBienvenida.vue` | `variables.ver.mensaje.bienvenida` | `variables.edita.mensaje.bienvenida` |
| Aviso de pagos recibidos | `pagos_recibidos` | `AvisoPagoRecibido.vue` | `variables.ver.pago.recibido` | `variables.edita.pago.recibido` |
| Promesa de pago | `promesa_pago` | `PromesaPago.vue` | `variables.ver.promesa.pago` | `variables.edita.promesa.pago` |
| Formato de impresion de pagos | `impresion_pagos` | `ImpresionPagos.vue` | `variables.ver.plantilla.impresion.pagos` | `variables.edita.plantilla.impresion.pagos` |
| Tickets | `ticket` | `../ticket/IndexPage.vue` | `variables.ver.plantilla.ticket` | `variables.edita.plantilla.ticket` (solo en las 2 plantillas de mensaje) |
| Aviso Contrato | `aviso_contrato` | `../contratos/IndexPage.vue` | `variables.ver.plantilla.mensaje.contrato` **o** `variables.ver.plantilla.mensaje.documento` | `variables.edita.plantilla.mensaje.contrato` (ambas sub-pestañas) |
| Plantilla Documento | `documento_plantilla` | `PlantillaDocumento.vue` | `variables.ver.plantilla.documentos.contrato` | `variables.edita.plantilla.documentos.contrato` (editar) · `variables.agrega.plantilla.documentos.contrato` (agregar) |
| Formato de Ticket | `documento_ticket` | `PlantillaTicket.vue` | `variables.ver.plantilla.documentos.contrato` | `variables.edita.plantilla.documentos.contrato` |
| Cargo Recurrente | `cargo_recurrente` | `AvisoCargoRecurrente.vue` | `variables.ver.cargo.recurrente` | `variables.edita.cargo.recurrente` |
| Instalación | `instalacion` | `../instalacion/IndexPage.vue` | `variables.ver.plantilla.instalacion` | ninguno (los botones "Guardar" no están protegidos) |

- **Reglas de negocio:**
  - Los permisos `variables.ver.cargo.recurrente`, `variables.edita.cargo.recurrente`, `variables.ver.plantilla.instalacion` y `variables.ver.plantilla.mensaje.documento` **no existen en el catálogo** que ofrece "Roles y Permisos" (`FE:pages/dashboard/usuarios/permisos/gestion-variables-permisos.json`, grupo "Plantillas"); por tanto solo un SUPER-ADMINISTRADOR puede ver las pestañas *Cargo Recurrente* e *Instalación* ✅.
  - En el backend no hay control por permiso: cualquier usuario autenticado puede llamar `PATCH /settings/:id` o `/plantillas` (`BE:plantillas/plantillas.controller.ts:8-41`).
- **Mensajes (texto exacto):** guardar → `Actualización exitosa` (posición top). Errores de carga de la lista de documentos → `Error al cargar plantillas`; `No se pudo cargar la plantilla`; `Error al cargar el formato de ticket` (`FE:…/composables/usePlantillas.js:38,51,64`).
- **Relaciones:** Mensajería (canal), Pasarelas de pago (`{ enlace_pago }`), Firma electrónica (`{firma_cliente}`), Clientes (envíos manuales).
- **Pendiente de validar en UI:** ❓ aspecto de la pestaña *Tickets* cuando el usuario solo tiene el permiso de ver (los botones "Guardar cambios" desaparecen en mensajes, pero "Guardar" de *Firma del ticket* y *Técnicos de apoyo* no están condicionados).

---

## MSG-003 · Plantilla · Recordatorio de pago

- **Ruta UI / name:** `/ajustes/plantillas` → pestaña **Recordatorio de pago**.
- **Archivos:** FE `…/plantillas/components/RecordatorioPago.vue`, `WaTemplateControl.vue`, `TablaVariables.vue`; BE `pagos/pagos.controller.ts:245-298`, `pagos/pagos.service.ts:82-162,1744-1879`, `pagos/notificar-recortatorio-pago-queue.processor.ts`, `app.controller.ts:33`.
- **Para qué sirve:** definir los 3 textos (antes / durante / después), los 3 horarios diarios de envío y las opciones de monto/adjunto de los recordatorios automáticos de cobro.
- **Acceso:** ver `variables.ver.recordatorio.pago`; guardar y ▶ `variables.edita.recordatorio.pago` (`FE:…/RecordatorioPago.vue:297-299,586`).
- **Secciones:** columna izquierda *Variables que puedes usar en las plantillas*, *Horarios de recordatorios*, *Opciones de envío*; columna derecha *Plantillas de Notificación* (3 acordeones).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Toggle "Enviar recordatorio de pagos:" | Activa/desactiva todo el módulo (`enviarAvisoPago`) | edita | (se guarda con Guardar) | Desactivado: editor, horarios y "Probar" quedan inhabilitados; el job sale sin hacer nada (`BE:…processor.ts:286`) |
| ▶ (tooltip "Ejecutar este recordatorio ahora") por horario | Diálogo `Ejecutar recordatorio #n` → envío **real** inmediato | `variables.edita.recordatorio.pago` | `POST /pagos/recordatorio-pago/ejecutar/:index` | Usa lo **guardado** en BD, no lo que esté sin guardar; rechaza si ya hay corrida activa |
| Probar (tooltip "Enviar un recordatorio de prueba a tu correo/WhatsApp") | Abre diálogo "Probar notificación" | — | `POST /pagos/recordatorio-pago/probar` | Usa el texto del editor aunque no esté guardado |
| ⟳ (tooltip "Actualizar estado de aprobación (WhatsApp Oficial)") | Sincroniza estados con Meta; solo si hay WhatsApp Oficial conectado | — | `POST /cloud-api/templates/sync` | Notify `Estados actualizados` |
| Guardar cambios | Guarda **todo** `settings` | `variables.edita.recordatorio.pago` | `PATCH /settings/:id` → `PUT /programar-queue/recordatoriosPago` → `PUT /pagos/agregar-colas-recordatorio-pago` | Reprograma los 3 crons y dispara `AppService.init()` (limpia colas antiguas, reprograma cortes, promesas, ingresos/egresos recurrentes, `BE:app.service.ts:31-49`). Sin `try/catch`: si falla, el botón queda en "loading" y no hay aviso (`FE:…:44-52`) |
| Diálogo ¿Deseas ejecutar ahora…? | Texto: *"¿Deseas ejecutar **ahora** el recordatorio #n? Se enviará **de verdad** a los clientes que hoy correspondan a este recordatorio (el mismo envío que haría el automático de las HH:mm)."* Botones `Sí, ejecutar` / `Cancelar` | | | Éxito: `Recordatorio #n iniciado.` |

- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Enviar recordatorio de pagos | toggle | — | `enviarAvisoPago` (BE default `true`, `BE:settings/entities/setting.entity.ts:106`) | |
| Recordatorio de pago #1/#2/#3 (hora) | `q-input` readonly + `q-time` | — | `HH:mm`; `cronNotificacion[]` (default `06:15` ×3) | El cron real es `${min} ${hora} * * *` (`BE:pagos/pagos.service.ts:134-154`), zona horaria del servidor |
| Sumar días de gracia en fecha de pago | toggle | — | `sumarDiaGracias` (default `true`) | Caption: *"Extiende la fecha límite mostrada con los días de gracia configurados."* |
| Sumar meses atrasados en el total | toggle | — | `sumarMesesAtrasados` (default `true`) | Caption: *"Activo: { total } es la deuda completa del servicio. Inactivo: solo la factura pendiente más antigua, la misma que cobra el enlace de pago."* |
| Adjuntar documento PDF de pago | toggle | — | `plantillaNotificacion.adjuntarPdf` | Caption: *"Incluye el comprobante PDF en el recordatorio enviado."* |
| Antes / Durante / Después del vencimiento | `q-editor` (HTML) | no (pero vacío falla, ver abajo) | texto con `{ variable }` | Toolbar: alineación, negrita, cursiva, subrayado, imprimir, pantalla completa, listas, deshacer/rehacer, ver código |
| Diálogo Probar › Etapa a probar | select | sí | Antes del vencimiento / Durante el vencimiento / Después del vencimiento | |
| Diálogo Probar › Canal | select | sí | Correo / WhatsApp / Ambos | |
| Diálogo Probar › Correo de prueba | email | si canal incluye correo | placeholder `tu-correo@ejemplo.com` | |
| Diálogo Probar › WhatsApp de prueba | `vue3-q-tel-input` | si canal incluye WhatsApp | país por defecto `VITE_TEL_DEFAULT_COUNTRY` | |

- **Estados posibles de la plantilla WhatsApp Oficial:** Sin enviar · En revisión · Aprobada · Rechazada · Pausada · Modificada (ver MSG-014).
- **Reglas de negocio (backend) ✅:**
  1. Un cron BullMQ por horario (`recordatoriosPago0/1/2`), solo en la instancia primaria (`BE:pagos/pagos.service.ts:102-154`); `recordatorio` = `recordatorio_{n}` selecciona qué configuración de cada cliente se evalúa.
  2. Candidatos: facturas con `factura.recordatorio_dias[recordatorio_n].dia` distinto de `Desactivado`, sin `Ninguno` en `recordatorio_pago`, pagos `FACT. DE SERVICIO` en `NO PAGADO`/`PENDIENTE` (`:314-321`). La configuración por cliente vive en su ficha ("Recordatorios de pago": canales `Ninguno/Correo/WhatsApp`; `Recordatorio #n` = `Desactivado` / `Notificar suspensión` / `1…25 Día(s)` + `Antes del vencimiento`/`Después del vencimiento`, `FE:pages/dashboard/clientes/components/ConfigNotifications.vue:8-12,45-57,92-137`).
  3. Hoy le toca si `cumpleCondicion`: `Notificar suspensión` → etapa *durante* el día de la fecha de corte; `N días` + *Antes* → etapa *antes*; *Después* → etapa *después* (`:188-250`).
  4. No reenvía el mismo día por el mismo canal: caché `…-mensajes-enviados-<fecha>` (`:471-481,668,1001`).
  5. Si el cliente pagó mientras corría la lista, lo salta (`siguenPendientes`, `:126-138,580`).
  6. Canal: oficial = plantilla aprobada por etapa (`recordatorio_pago_<etapa>`) con el primer PDF pendiente como cabecera si la plantilla lo lleva; no oficial = texto + cada PDF como archivo `comprobante-pago-pendiente-N.pdf`, previo chequeo `check-number` (`:681-872`). Correo con asunto `<empresa> - Recordatorio de pago` y los PDFs adjuntos (`:1003-1015`).
  7. **Espaciado anti-baneo:** 30 s entre mensajes con canal oficial; **2 a 3 min al azar** con el no oficial; no espera tras el último ni cuando el envío falló (`:1109-1144`).
  8. Cancelable desde el widget de progreso (`POST /pagos/recordatorio-cancelar`, `BE:pagos/pagos.controller.ts:294-298`); comprueba cada 2 s.
  9. Cada resultado queda en "Mensajes enviados" con origen `recordatorio_pago` y en los logs del servicio (`SEND_WHATSAPP`, `SEND_EMAIL`, `*_ERROR`).
- **Efectos secundarios externos:** WhatsApp (gateway Baileys `HOST_API_WHATSAPP` o Cloud API/Dualhook), SMTP, Chromium/puppeteer para los PDF, Redis/Bull (cron y progreso), pasarela de pago (genera un cobro por cada mensaje que use `{ enlace_pago }`/`{ monto_enlace }`, `:618-637`), WebSocket (`/api/enviar-notificacion/...`).
- **Mensajes de error/éxito (exactos):**
  - `Indica un correo para la prueba` / `Indica un número de WhatsApp para la prueba` (FE, tipo `warning`).
  - `✅ Correo enviado` / `❌ Correo: <error>` / `✅ WhatsApp enviado` / `❌ WhatsApp: <error>`; si no hubo error el diálogo se cierra; si hubo, notify `warning` con los fragmentos unidos por ` · ` (`FE:…:172-178`).
  - `No se pudo enviar la prueba`, `No se pudo iniciar el recordatorio`, `No se pudo sincronizar`.
  - BE: `La plantilla seleccionada está vacía. Escribe un mensaje antes de probar.`; `Indica un correo para la prueba.`; `Indica un número de WhatsApp para la prueba.`; `El envío de recordatorios está desactivado en la configuración.`; `Recordatorio no válido.`; `Ya hay un envío de recordatorios en curso. Espera a que termine.` (`BE:pagos/pagos.service.ts:1788-1848`).
  - Notificaciones en campana (tabla `notifications`): `WhatsApp Desvinculado`, `Falla al enviar WhatsApp Oficial`, `Cliente sin WhatsApp`, `Falla al enviar WhatsApp`, `Falla al enviar Email` (`BE:…processor.ts:345,756,895-902,1066`).
- **Relaciones con otros módulos:** Clientes (ficha › Facturación/Notificaciones), Promesas de pago (la fecha de corte usa la promesa activa), Pasarelas de pago, Mensajería (canal, interruptores), Cortes (días/horas habilitados desplazan `{ corte }`: `fechaCorteEfectiva`, `:171-186`).
- **Casos límite y advertencias:**
  - **Texto de una etapa vacío:** `job.data.plantillaNotificacion[etapa] || job.data.plantillaNotificacion` cae al objeto completo y el reemplazo de variables falla (error técnico registrado como mensaje *fallido*) (`:614`). ✅ (lectura de código; efecto exacto en UI ❓).
  - **Notificación "WhatsApp Desvinculado" aunque el ISP use solo el canal oficial:** al inicio de cada corrida consulta la sesión **Baileys** sin mirar el proveedor activo y avisa a todos los usuarios activos (`:333-356`) ✅.
  - La *facturas omitidas* (`cantidadFacturasIgnorar`) sigue vigente en BD pero **se retiró del UI** (comentario `FE:…:317-318`); el manual actual (`docs/guia/logs-plantillas.mdx`) todavía lo lista.
  - "Probar" con WhatsApp **oficial** envía la plantilla **aprobada** de esa etapa (no el texto del editor) y con datos de prueba; `{ enlace_pago }` no se rellena en la prueba (`:1193-1224`).
  - El guardado envía `plantillaNotificacion` completo; si una etapa quedó en blanco al guardar, queda en blanco.
- **Preguntas probables de usuarios:**
  1. ¿Por qué mi cliente no recibió el recordatorio hoy? (revisar: toggle activo, horario, configuración del cliente "Recordatorios de pago", factura en NO PAGADO, canal activo, ya se envió hoy, número sin WhatsApp).
  2. ¿A qué hora salen los recordatorios y puedo cambiarla? (3 horarios; sí, con el selector de hora y Guardar cambios).
  3. ¿Qué diferencia hay entre "Antes", "Durante" y "Después"? (relativo a la fecha de corte con gracia del cliente).
  4. ¿Por qué `{ total }` muestra la deuda de varios meses? (opción "Sumar meses atrasados en el total").
  5. ¿Cómo pruebo el mensaje sin molestar a clientes? (botón Probar).
  6. ¿Qué pasa si presiono ▶? (envía de verdad a todos los que hoy corresponden).
  7. ¿Por qué WhatsApp tarda minutos entre mensaje y mensaje? (intervalo anti-baneo 2–3 min en no oficial; 30 s oficial).
  8. ¿Por qué aparece "En revisión"/"Modificada"? (aprobación de Meta; ver MSG-014).
- **Pendiente de validar en UI:** ❓ comportamiento visual del widget de progreso; ❓ qué ve el usuario si una etapa queda vacía; ❓ formato exacto de `{ total }` con símbolo de moneda (el código envía solo el número).

---

## MSG-004 · Plantilla · Mensaje de Bienvenida

- **Ruta UI / name:** `/ajustes/plantillas` → pestaña **Mensaje de Bienvenida** (`name="tecnico"`, nombre interno heredado).
- **Archivos:** FE `…/components/MensajeBienvenida.vue`, `…/clientes/components/modals/ModalMessageWelcome.vue`; BE `customers/customer-queue.processor.ts:36-375`, `customers/customers.service.ts:3073`, `customers/customers.controller.ts:376`.
- **Para qué sirve:** texto que recibe un cliente nuevo (o al reenviar manualmente) con su plan, costo y fecha de pago.
- **Acceso:** ver `variables.ver.mensaje.bienvenida`; guardar `variables.edita.mensaje.bienvenida`.
- **Campos:**

| Etiqueta | Tipo | Valores | Notas |
|---|---|---|---|
| Enviar mensaje de bienvenida: | toggle | `sendWelcomeMessage.activo` | Si está apagado el alta de cliente no dispara el mensaje; el envío manual sigue disponible |
| Enviar por: WhatsApp / Correo | 2 checkboxes | `sendWelcomeMessage.whatsApp` / `.email` | Solo aplican al envío automático al crear cliente |
| Editor | `q-editor` | `sendWelcomeMessage.msg` | Variables: `{ cliente } { fecha_pago } { plan } { costo } { empresa }` (ver MSG-001) |
| Plantilla WhatsApp Oficial | `WaTemplateControl` tipo `bienvenida` | | solo si hay WhatsApp Oficial conectado |

- **Botones:** `Guardar cambios` → `PATCH /settings/:id` + notify `Actualización exitosa`; ⟳ "Actualizar estado de aprobación".
- **Reglas de negocio ✅:**
  - Disparo automático: tras crear el cliente, el FE llama `POST /customers/message-welcome {cliente_id, ipv4}` solo si `data.sendWelcomeMessage.activo` (`FE:clientes/composables/useCliente.js:604-609`). El job usa las casillas WhatsApp/Correo de la configuración (`BE:customer-queue.processor.ts:355-361`).
  - Disparo manual: modal "Enviar mensaje bienvenida" con "Enviar por: WhatsApp / Email / Ambas" y canal oficial/no oficial si ambos existen (`FE:…/ModalMessageWelcome.vue`); el canal elegido **ignora** las casillas.
  - Respeta los interruptores globales: si WhatsApp o correo están apagados no intenta ni registra (`:349-361`).
  - Canal oficial: `resolverCanalOficial(empresa, override)`; usa la plantilla aprobada `bienvenida`; si el canal es no oficial verifica `session/info` y `check-number` (mensajes de error `WhatsApp desvinculado`, `Cliente no usa WhatsApp`).
  - Si no se envió por ningún canal **no es error**: la corrida termina en silencio (`:366-369`) y el modal ya mostró `Mensaje de bienvenida enviado` (el API solo encola, `customers.service.ts:3073-3088`).
- **Mensajes (exactos):** FE manual: `Mensaje de bienvenida enviado`; errores del backend se muestran como `warning`.
- **Casos límite:** el servicio elegido es el indicado por `servicio_id`/`ipv4`, o el primero activo no eliminado; sin servicios → `Cliente sin servicios disponibles` (queda solo en log del job).
- **Preguntas probables:** ¿por qué no le llegó la bienvenida al cliente nuevo? · ¿puedo reenviarla? · ¿qué fecha de pago pone? · ¿por qué el costo incluye IVA? · ¿sale por WhatsApp y correo a la vez? · ¿se cobra el mensaje oficial?
- **Pendiente de validar en UI:** ❓ si al crear cliente el toggle de bienvenida aparece también en el formulario de alta.

---

## MSG-005 · Plantilla · Aviso de pagos recibidos

- **Ruta UI:** `/ajustes/plantillas` → **Aviso de pagos recibidos**.
- **Archivos:** FE `…/components/AvisoPagoRecibido.vue`; BE `pagos/notificar-cobro-queue.processor.ts`, `pagos/pagos.service.ts:288-305`, `pagos/pagos.controller.ts:117-125`.
- **Para qué sirve:** mensaje de confirmación con el comprobante (PDF) cuando se registra un pago.
- **Acceso:** ver `variables.ver.pago.recibido`; guardar `variables.edita.pago.recibido`.
- **Campos:**

| Etiqueta | Tipo | Notas |
|---|---|---|
| Editando la plantilla para: **Factura de Servicio** / **Factura Libre** | `q-btn-toggle` | Alterna qué campo se edita (`plantillaMsgPagoRecibo` / `plantillaMsgPagoReciboLibre`) y su asunto/adjunto |
| Asunto del correo | input, placeholder `Ej: { empresa } - Confirmación de pago` | Hint: *"Cabecera del email. Puedes usar { empresa } y { cliente }. Si lo dejas vacío, se usa uno por defecto."* |
| Editor | `q-editor` | Variables `{ cliente } { rango_fecha } { plan } { empresa }` |
| Adjuntar el PDF del comprobante al enviar | checkbox | Texto: *"Si lo desactivas, el aviso de pago se envía solo con el mensaje (correo y WhatsApp), sin el archivo PDF adjunto. Aplica a la Factura de Servicio / Factura Libre."* (default `true`) |
| WhatsApp Oficial › tipo | `WaTemplateControl` `pago_recibido_servicio` / `pago_recibido_libre`, **permite documento** | Toggle "Adjuntar PDF (comprobante)" dentro del diálogo "Enviar a WhatsApp Oficial" |

- **Reglas ✅:** elige plantilla por `tipo_factura === 'FACT. LIBRE'` y, si la libre está vacía, usa la de servicio (`BE:…notificar-cobro-queue.processor.ts:76-79`); el PDF solo se genera si "adjuntar" está activo (`:98-103`); canal por `info.tipo_envio` (`email`/`whatsapp`/`ambas`) y por interruptores; oficial con override `info.wa_provider`; correo con adjunto `comprobante-pago-recibo.pdf` (`:113-127`); WhatsApp no oficial envía texto (`?fastMode=true`) y después el PDF por `send-media/file` (`:310-336`).
- **Casos límite ✅:** si la plantilla oficial aprobada **lleva PDF en la cabecera** y se apaga "Adjuntar el PDF", el envío oficial falla con *La plantilla "pago_recibido_servicio" lleva un PDF adjunto pero no se generó el archivo a enviar.* (`BE:cloud-api/cloud-api.service.ts:1481-1485`; este procesador no pasa generador perezoso). Para el pago por pasarela el aviso sale **siempre por ambos canales** a la ficha del cliente (`BE:registro-pagos/registrar-abono.service.ts:737-745`).
- **Preguntas probables:** ¿puedo enviar el recibo sin PDF? · ¿por qué el correo trae otro asunto? · ¿qué es `{ rango_fecha }`? · ¿por qué la factura libre usa otro texto? · ¿se envía solo al pagar?
- **Pendiente:** ❓ qué casillas ofrece el diálogo de registrar pago (`ModalPago.vue:476`, `PayComponent.vue:488`) — pertenece al agente de pagos.

---

## MSG-006 · Plantilla · Promesa de pago

- **Ruta UI:** `/ajustes/plantillas` → **Promesa de pago**.
- **Archivos:** FE `…/components/PromesaPago.vue`; BE `promesas-pago/promesas-pago-notificacion.service.ts`.
- **Acceso:** ver `variables.ver.promesa.pago`; guardar `variables.edita.promesa.pago`.
- **Contenido:** tabla de variables (`{ cliente } { fecha_promesa } { total } { plan } { empresa } { nota }`), banner informativo (*"Este mensaje se envía al registrar una promesa de pago, si marcas Notificar al cliente. Desde el listado de promesas también puedes reenviarlo eligiendo el canal, mientras la promesa siga vigente."*), editor, `WaTemplateControl` tipo `promesa_pago`, botón `Guardar cambios` (`PATCH /settings/:id`).
- **Reglas ✅:** solo promesas con `isActive` y `estado === 'activa'` (`BE:…:43-45,69-70`); sin plantilla → error; el canal elegido manualmente **ignora** los interruptores de canal (`:97-107`); en oficial usa la plantilla aprobada `promesa_pago` (`:188-194`); el correo va con asunto `Promesa de pago hasta el DD/MM/YYYY` (`:164`).
- **Errores (exactos):** `No se encontró la promesa de pago.` · `La promesa ya no está vigente: no se puede notificar.` · `No hay plantilla de promesa de pago configurada. Créala en Ajustes › Plantillas.` · `No se envió por ningún canal: revisa que el cliente tenga correo o celular y que el canal esté activo.` (`:66-120`).
- **Preguntas probables:** ¿cuándo se envía? · ¿puedo reenviar una promesa vencida? (no) · ¿qué total muestra si la promesa es de varias facturas? (la suma del grupo).

---

## MSG-007 · Formato de impresión de pagos (ticket / recibo) e impresora térmica

- **Ruta UI:** `/ajustes/plantillas` → **Formato de impresion de pagos** (sin tilde en la etiqueta).
- **Archivos:** FE `…/plantillas/components/ImpresionPagos.vue` (1190 líneas); BE `pagos/formato-impresion.config.ts`, `pagos/pagos.service.ts:1529-1620` (vista previa), `pagos/pagos.service.ts:1415-1431` (periodo), `files/files.controller.ts:34-47` (descarga de instaladores).
- **Para qué sirve:** definir qué bloques lleva el comprobante (Factura o Recibo), en qué orden y con qué estilo, el ancho del papel y si se imprime en una impresora térmica local.
- **Acceso:** ver `variables.ver.plantilla.impresion.pagos`; guardar `variables.edita.plantilla.impresion.pagos` (`FE:…:1180`).
- **Secciones:** (1) *Orden de los bloques del ticket* (toggle `Factura | Recibo`) con vista previa PDF en vivo; (2) *Papel y márgenes*; (3) acordeón *Formato de impresión de pagos — Impresora térmica (API local) y programa para el equipo de caja*.
- **Bloques (id → etiqueta en pantalla) ✅** `FE:…:46-60`, `BE:pagos/formato-impresion.config.ts:23-37`:

| id | Etiqueta | Solo en | ¿Se puede ocultar? | Personalización disponible |
|---|---|---|---|---|
| `logo` | Logo | ambos | sí (toggle `mostrarLogo`) | alineación, negrita, **ancho del logo** (Normal / 60·80·100·120·140 px) |
| `razon_social` | Nombre de la empresa (emisor) | ambos | sí (`mostrarRazonSocial`) | alineación, negrita, tamaño |
| `tipo_servicio` | Título "SERVICIO DE INTERNET" | ambos | sí (`mostrarTipoServicio`) | + **Texto del bloque** (vacío = `SERVICIO DE INTERNET`) |
| `datos_emisor` | Datos del emisor (sucursal, RUC, ambiente…) | ambos | **no en Factura** (candado) | acordeón para elegir emisor: *Nombre Comercial* / *Razón Social* (`emisor`) |
| `numeracion_abono` | Numeración del abono | ambos | sí | "Aparece solo cuando el documento es un abono numerado" |
| `numero_factura` | Nº de factura + clave de acceso | **Factura** | no | |
| `datos_cliente` | Datos del cliente (fecha, documento, nombre, dirección) | ambos | no en Factura | |
| `periodo_servicio` | Periodo de facturación / suspensión | ambos | sí (`mostrarFechaSuspension`) | acordeón *Tipo de periodo de consumo que se imprime*: **Completo** ("del 01 al 30 o 31 del mes de corte"), **Relativo** ("del mismo día del mes anterior al día de corte (ej. 27/05/2025 al 27/06/2025)"), **Relativo adelantado** ("del día de corte al mismo día del mes siguiente (ej. 27/06/2025 al 27/07/2025)") |
| `detalle` | Detalle de productos/servicios | ambos | no en Factura | |
| `totales` | Totales | ambos | no en Factura | |
| `total_texto` | Total en letras (SON:) | ambos | sí (`mostrarTotalTexto`) | |
| `nota_recibo` | Nota "sin valor tributario" | **Recibo** | sí | + Texto del bloque (vacío = `ESTE DOCUMENTO NO TIENE VALOR TRIBUTARIO`) |
| `pie_pagina` | Pie de página | ambos | sí | acordeón con editor propio (`piePagina` para Factura, `piePaginaRecibo` para Recibo) |

- **Botones y controles:**

| Etiqueta / icono | Qué hace | Notas |
|---|---|---|
| ⠿ arrastrar / ▲ ▼ | Reordena bloques (cada tipo guarda su propio orden) | `ordenFactura`/`ordenRecibo`; ids desconocidos se descartan y los que faltan se reinsertan en su posición por defecto (`BE:formato-impresion.config.ts:79-102`) |
| 👁 "Ocultar bloque" / "Mostrar bloque" | Visibilidad | En Factura los 5 fiscales muestran 🔒 y el tooltip *Obligatorio en factura (no se puede ocultar)* |
| ⚙ "Personalizar bloque" | Menú: Alineación (izq./centro/der.), Negrita, Tamaño de letra (Normal (auto), 8–14 px) | "Quitar personalización" restablece el bloque |
| Restaurar orden por defecto | Vuelve al orden histórico | Texto auxiliar: *Los cambios se reflejan solos en la vista previa; presiona "Guardar cambios" para aplicarlos.* |
| Ancho de la hoja (mm, 40–120) · Margen izq. · Margen der. | Papel; aplica a Factura y Recibo | Defaults del entity: ancho 43, márgenes 0 (`BE:settings/entities/setting.entity.ts:187-203`) |
| Vista previa (iframe PDF) | `POST /pagos/formato-impresion/preview` con el **borrador** completo (debounce 900 ms) | Tooltips: *Actualizar ahora*, *Abrir en pestaña completa*; texto: *Vista previa en vivo (Factura\|Recibo) — usa el último pago como muestra* |
| Toggle "Usar impresora térmica (API local)." | `usarApiImpresora` | Texto: *Al activar esta opción, la impresión se enviará al programa de impresora térmica ejecutándose en localhost:3008 en lugar de generar un PDF.* |
| Imprimir página de prueba | `POST http://localhost:3008/api/impresion/prueba` (timeout 5 s) desde el **navegador** | Chips: `Impresora conectada` · `Programa no encontrado en localhost:3008` · `Error al enviar a la impresora` |
| Descargar para Windows (.exe) / Descargar para macOS | abre `/api/files/download/impresion-win.exe` / `impresion-mac` en pestaña nueva | Endpoint **público** con lista blanca de 2 nombres; Windows 10/11 64-bit, macOS 10.15+ (Intel) |
| Guardar cambios | `PATCH /settings/:id` (todo `formSettings`) | `Actualización exitosa` |

- **Reglas (backend) ✅:** la vista previa toma la **última factura** con detalle y sucursal; si no hay → `Aún no hay pagos registrados para usar como muestra en la vista previa`; si el pago no tiene sucursal/empresa → `El pago de muestra no tiene sucursal o empresa asociada: no se puede generar la vista previa.`; para Factura sin clave de acceso arma una clave **DEMO** con el RUC real (`BE:pagos/pagos.service.ts:1555-1582`).
- **Efectos externos:** descarga/ejecución local de `impresion-win.exe` (programa en el PC de caja, puerto 3008); Chromium en el servidor para el PDF.
- **Relaciones:** `{ rango_fecha }` de los avisos de pago usa el mismo "Tipo de periodo de consumo" (MSG-001 §1.2); Registrar pago / Transacciones usan este formato al imprimir.
- **Casos límite:** el default de `configImpresion` en el entity define `MargenDer` con **M mayúscula** mientras el FE usa `margenDer` (`BE:settings/entities/setting.entity.ts:201`) — el margen derecho por defecto no se lee hasta que se guarde; el programa local debe estar corriendo "cada vez que uses el sistema" (texto de la UI).
- **Preguntas probables:** ¿cómo cambio el ancho del ticket (58/80 mm)? · ¿cómo oculto el logo? · ¿por qué no puedo ocultar los datos del emisor? · ¿cómo imprimo sin abrir PDF? · ¿qué hago si dice "Programa no encontrado en localhost:3008"? · ¿cómo hago que el programa arranque con Windows? (acordeón: `shell:startup` + acceso directo).
- **Pendiente de validar en UI:** ❓ comportamiento de impresión real con `usarApiImpresora` (el consumidor está en pantallas de pago, fuera de alcance); ❓ el programa `impresion-*` no forma parte del código leído.

---

## MSG-008 · Plantillas › Tickets (mensajes, firma del ticket y técnicos de apoyo)

- **Ruta UI:** `/ajustes/plantillas` → **Tickets** (4 sub-pestañas con iconos).
- **Archivos:** FE `ajustes/ticket/{IndexPage,PlantillaMsgCliente,PlantillaMsgTecnico,FirmaTicket,TecnicosApoyo}.vue`, `composables/useConfigTicket.js`; BE `ticket/ticket.service.ts:223-560`, `settings/*`.
- **Acceso:** pestaña `variables.ver.plantilla.ticket`; "Guardar cambios" de los 2 mensajes `variables.edita.plantilla.ticket`. *Firma del ticket* y *Técnicos de apoyo* no comprueban permiso (`FE:…/FirmaTicket.vue`, `TecnicosApoyo.vue`).
- **Sub-pestañas:**

| Sub-pestaña | Contenido | Campo |
|---|---|---|
| **Plantilla mensaje cliente** | Variables `{ cliente } { fecha_visita } { asunto } { detalle } { tecnico } { prioridad } { turno } { hora_visita } { telefono_tecnico }`, editor, control Meta `ticket_cliente` | `plantillaTicketCliente` |
| **Plantilla mensaje tecnico** | Las anteriores + `{ telefono_cliente } { coordenadas_cliente } { ipv4 } { direccion }`; control Meta `ticket_tecnico` | `plantillaTicketTecnico` |
| **Firma del ticket** | Pregunta *"¿Cómo firma el cliente la orden de servicio?"* con 2 tarjetas: **Firma electrónica** (*"Se le manda un enlace al correo del cliente y firma desde donde esté. Tiene validez legal y la cobra el proveedor por cada trámite."*) y **Firma en el dispositivo** (*"El técnico le acerca el celular o la tableta y el cliente firma con el dedo, ahí mismo. No cuesta nada y no necesita internet del cliente, pero vale como constancia de conformidad, igual que una firma en papel: no es firma electrónica."*). Si es manuscrita: aviso para agregar `{firma_tecnico}` | `firmaTicketModo` = `electronica` (default) \| `manuscrita` |
| **Técnicos de apoyo** | Toggles *Permitir técnicos de apoyo en los tickets* y *Los técnicos de apoyo gestionan el ticket como el responsable* (este depende del primero) | `ticketApoyoHabilitado`, `ticketApoyoGestiona` (default `false`) |

- **Botones:** `Guardar cambios` (mensajes) y `Guardar` (firma / apoyo) → `PATCH /settings/:id` con solo los campos de esa sub-pestaña + `invalidarSettings()` + notify `Datos actualizados`.
- **Reglas (backend) ✅:** `enviarNotificacionWhatsApp` arma las variables (`:255-269`), usa la plantilla oficial `ticket_cliente`/`ticket_tecnico` si `resolverCanalOficial(empresa, detalle.wa_provider)` o el texto adaptado si no (`:274-334,457-515`); a cada técnico (responsable + apoyos) le sustituye `{ tecnico }` y `{ telefono_tecnico }` y agrega al final *"Usted va como técnico de apoyo. Responsable del ticket: …"* (`:399-413,493`); el correo no usa asunto configurable (`<empresa> - NOTIFICACIÓN - TICKET`).
- **Casos límite:** el texto oficial **no** lleva la nota de apoyo (solo el no oficial y el correo); el FE anuncia `{firma_tecnico}` pero el catálogo del *Formato de Ticket* solo lista `{firma_cliente}` y `{firma_isp}` (`BE:ticket/variables-ticket.ts:327-343`; `FE:…/FirmaTicket.vue`) — ver Hallazgos.
- **Preguntas probables:** ¿qué dice el mensaje al técnico? · ¿puedo poner la ubicación? (`{ coordenadas_cliente }`) · ¿cómo hago que el cliente firme la orden en el celular del técnico? · ¿cuánto cuesta la firma electrónica? (la cobra el proveedor por trámite).

---

## MSG-009 · Plantillas › Aviso Contrato (mensaje de contrato y de documento)

- **Ruta UI:** `/ajustes/plantillas` → **Aviso Contrato** → sub-pestañas **Plantilla mensaje contrato** (icono `description`) y **Plantilla mensaje documento** (icono `folder_open`).
- **Archivos:** FE `ajustes/contratos/{IndexPage,AvisoContrato,AvisoDocumento}.vue`; BE `contratos/contratos.service.ts:559-736`, `contratos-archivos/contratos-archivos.service.ts:255-390`.
- **Acceso:** ver `variables.ver.plantilla.mensaje.contrato` (o `…mensaje.documento`, inexistente en catálogo); guardar `variables.edita.plantilla.mensaje.contrato` en **ambas**.
- **Campos:** variables `{ cliente } { contrato } { plan } { empresa } { fecha_contrato }`, editor, control Meta `contrato` / `documento`; `Guardar cambios` → `PATCH /settings/:id` (`Actualización exitosa`).
- **Reglas ✅:**
  - Se dispara desde el perfil del cliente › Contratos/Documentos › *Notificar* (`FE:…/Contratos_Pdf/NotificacionContratoModal.vue:81`: `/contratos/notification` o `/contratos-archivos/notification`).
  - **Contrato:** genera el PDF **antes** de decidir el canal (`BE:contratos.service.ts:606`); por Baileys envía el texto y luego el PDF `contrato-<título>.pdf` (`:789-837`); por correo adjunta el PDF; por **canal oficial solo viaja la plantilla de texto** (no se adjunta el archivo; `:624-641`). 
  - **Documento:** igual, adjunta el archivo subido por Baileys/correo; oficial solo texto (`BE:contratos-archivos.service.ts:310`).
  - Errores propagados: `No se encontró el contrato asociado`; `WhatsApp desvinculado`; `Número no usa WhatsApp`; `Fallo al enviar el email de notificación del contrato. por favor revisar el servidor de correo configurado e intente de nuevo <detalle>`.
- **Preguntas probables:** ¿el cliente recibe el PDF por WhatsApp oficial? (no, solo el texto aprobado) · ¿qué es `{ contrato }`? (el título).

---

## MSG-010 · Plantilla Documento (.docx de contrato): carga, variables, vista previa y generación

- **Ruta UI:** `/ajustes/plantillas` → **Plantilla Documento** (tarjetas + diálogo).
- **Archivos:** FE `…/components/{PlantillaDocumento,FormPlantilla}.vue`, `composables/usePlantillas.js`, `style/style.css`, `public/plantillas/{Plantilla_Ejemplo,Variables}.docx`; BE `plantillas/*`, `contratos/contratos.service.ts`, `contratos/variables-contrato.ts`, `common/utils/libreoffice.util.ts`, `files/files.service.ts`.
- **Para qué sirve:** subir el contrato del ISP en Word con variables entre llaves; el sistema lo rellena por cliente y lo convierte a PDF.
- **Acceso:** ver/pestaña `variables.ver.plantilla.documentos.contrato`; abrir/editar una tarjeta `variables.edita.plantilla.documentos.contrato`; tarjeta "Agregar nueva plantilla" `variables.agrega.plantilla.documentos.contrato`. **El botón ✕ "Eliminar plantilla" no está protegido por permiso** (`FE:…/PlantillaDocumento.vue:108-111`) ✅.
- **Botones y acciones:**

| Etiqueta | Qué hace | Endpoint | Restricciones / efectos |
|---|---|---|---|
| Descargar Plantilla/Variables › **Variables.pdf** (caption *Incluye tus campos personalizados*) | Descarga un PDF con todas las variables + campos personalizados de la empresa | `GET /contratos/variables/pdf` | Se genera con Handlebars + puppeteer (`BE:contratos.service.ts:910-964`); error `Error al generar el PDF de variables` |
| Descargar Plantilla/Variables › **Plantilla Ejemplo.docx** | Descarga estático `/plantillas/Plantilla_Ejemplo.docx` | — | existe también `Variables.docx` en `public/plantillas` pero **no** está enlazado ✅ |
| Tarjeta de plantilla | Abre "Editar Plantilla" | `GET /plantillas?tipo=contrato` | solo con permiso editar |
| ✕ (tooltip `Eliminar plantilla`) | Diálogo `¿Deseas eliminar la plantilla "<nombre>"?` · `Eliminar`/`Cancelar` | `DELETE /plantillas/:id` | **soft delete**; `409` *No se puede eliminar la plantilla porque está siendo utilizada por uno o más contratos* (`BE:plantillas.service.ts:155-166`); éxito `Plantilla eliminada` |
| Agregar nueva plantilla | Abre "Agregar Plantilla" | | |
| Guardar / Editar | Diálogo de confirmación `¿Deseas agregar/editar la plantilla?` → sube el .docx y crea/actualiza | `POST /files/upload-image/images-services` luego `POST/PATCH /plantillas` | Éxito `Plantilla agregada exitosamente` / `Plantilla editada exitosamente`; error = mensaje del backend o `No se pudo guardar la plantilla` |
| Ver documento (solo al editar, sección *Documento*: "Se muestra con datos de ejemplo, para revisar cómo queda antes de usarla con un cliente.") | Abre visor a pantalla completa `Vista previa — <nombre>` | `GET /contratos/plantillas/:id/vista-previa` | PDF `inline`; error `No se pudo generar la vista previa del documento` |

- **Campos del diálogo:**

| Etiqueta | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Nombre de la Plantilla: | texto | sí | `Debes completar este campo`; nombre **único global** (409 `La plantilla ya existe`, `BE:plantillas.service.ts:27-32`) |
| Archivo (WORD): | drag & drop, 1 archivo, tope 500 MB | sí | `Debes seleccionar al menos un archivo` (warning top). La UI acepta `.doc` y `.docx` (`application/msword` y OOXML, `FE:components/DragAndDropUploadImage.vue:63-72`) pero **solo .docx genera**: `Solo se permiten archivos .docx (<archivo>)` (`BE:contratos.service.ts:217-219`) |
| Firma electrónica (info, solo si el proveedor de firma está listo y es edición) | texto | — | verde: *El documento tiene `{firma_cliente}`. La firma se ubica sola donde esté esa variable…*; naranja: *Falta agregar `{firma_cliente}` en el documento… Sin esa variable no se puede enviar a firmar.* |

- **Almacenamiento ✅:** el .docx se guarda con nombre aleatorio `<32 hex>.docx` en `static/uploads/images-services/` (`BE:files/files.service.ts:8-24`), servido en `/api/uploads/images-services/<archivo>`; la fila `plantilla` guarda `nombre`, `files[]` (varios posibles; el FE permite 1), `tipo` (`contrato`|`ticket`), `tieneAnclaFirma` (se recalcula al guardar mirando el XML del .docx por `{firma_cliente}`, incluso en encabezados/pies, `BE:firma-electronica/ancla-firma.ts:91-120`). Al reemplazar el archivo el FE borra el anterior (`DELETE /files/images-services/<archivo>`); al eliminar la plantilla **no** se borra el archivo del disco.
- **Generación del PDF ✅ (`POST /contratos/generate-pdf-report/:contratoId`, `BE:contratos.service.ts:173-283`):**
  1. Carga contrato + plantilla + servicio + cliente + plan + router + empresa.
  2. Datos = campos personalizados del cliente (`custom_data`, van **primero** para que una variable del sistema los pise) + catálogo de variables (`:883-906`) + variables extra (anclas de firma).
  3. Por cada archivo de la plantilla: `docxtemplater` (delimitadores `{ }`, `paragraphLoop`, `linebreaks`, `nullGetter` ⇒ variable inexistente = texto vacío) → buffer .docx → **LibreOffice headless** `soffice --headless --nologo --norestore --convert-to pdf:writer_pdf_Export` en carpeta temporal por conversión (`BE:common/utils/libreoffice.util.ts:18-80`; rutas `LIBREOFFICE_PATH_LINUX/WINDOWS`, `LIBREOFFICE_CWD_*`; si falta, esa excepción queda en el registro del servidor y el usuario solo ve `Error procesando documento: <archivo>`, ver MSG-023).
  4. Une los PDF con `pdf-lib` y responde `Content-Disposition: attachment; filename="contrato.pdf"`. **No se persiste**: se regenera cada vez (solo el trámite de firma congela una copia).
  5. Errores de llaves mal cerradas se traducen (X = nombre del **archivo guardado**, un código aleatorio, no el nombre de la plantilla): `La plantilla "X" tiene N error(es) en sus variables: falta la llave "{" que abre «…» (cerca de: «…»); … Corrige las llaves en el documento Word y vuelve a generarlo.` (`BE:contratos/variables-contrato.ts:482-503`); otros: `No hay archivos en la plantilla`, `Archivo no encontrado: <f>`, `Ocurrió un error al generar el PDF del contrato. Intente nuevamente.`
  6. En pantalla el cliente ve el diálogo *"Valor de Instalación — Ingrese el valor de la instalación para este contrato:"* (default `0.00`, botón `Generar Contrato`) y el PDF se abre en ventana nueva (`FE:clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue:306-345`); popup bloqueado → `El navegador bloqueó la ventana. Permite las ventanas emergentes de este sitio.`
- **Variables disponibles en el .docx ✅** (`BE:contratos/variables-contrato.ts:53-337`; escribir `{clave}`):

| Grupo | Claves |
|---|---|
| Fecha actual | `dia`, `mes` (letras), `año`, `añoCorto`, `fechaCompleta` (14 de agosto de 2026), `fecha_actual` (dd/mm/aaaa) |
| Contrato | `numeroContrato` (servicio.contrato), `tituloContrato`, `fechaInicioContrato`, `fechaFinContrato`, `contrato_duracion` (meses) |
| Cliente | `nombre_cliente`, `tipoDocumento`, `cedula_cliente`, `celular_cliente`, `correo_cliente`, `direccion_cliente`, `provincia_cliente`, `canton_cliente`, `parroquia_cliente` |
| Empresa | `nombre_empresa`, `ruc_empresa` |
| Servicio de internet | `direccionInstalacion`, `coordenadas`, `precioServicio`, `fechaInstalacion`, `ipv4`, `ipv6`, `fechaMaximoPago`, `aplicarCorte`, `valorInstalacion` (el que se escribe en el diálogo), `precio_total` (instalación + precio) |
| Plan de internet | `nombrePlan`, `descripcionPlan`, `precioPlan`, `velocidadDescarga`, `velocidadSubida` |
| Firma electrónica | `firma_cliente` (obligatoria para enviar a firmar; repetible), `firma_isp` (opcional) — valen vacío al imprimir |
| Equipos y accesorios | `tipo_N`, `serie_N`, `mac_N`, `plan_N`, `modo_N` (Venta/Comodato), `precio_N` del equipo N; `accesorio_N`, `categoria_N`, `cantidad_N`, `unidad_N` (Mts/Uds); `total_equipos`, `total_accesorios` |
| Campos personalizados | cada campo definido en Ajustes › Base de datos › Campos personalizados: `{<nombre>}`; los de tipo *selector* añaden `{<nombre>_<opcion>}` que vale `X` si el cliente eligió esa opción (`variables-contrato.ts:419-470`) |

- **Mensajes (exactos):** ver tablas anteriores.
- **Relaciones:** Cliente › Contratos (crear contrato eligiendo plantilla; estados `Esperando aprobación de cliente`, `Activo`, `Anulado`, `Finalizado`; duraciones 0/1/2/3/6/12/24/36/48/60 meses, `BE:contratos/enums/contrato.enums.ts`), Documentos (`contratos_archivos`: al subir el firmado el contrato pasa a `Activo` con `fechaFirmado`, `BE:contratos-archivos.service.ts:34-72`), Firma electrónica (MSG-025/026), Campos personalizados.
- **Casos límite y advertencias:** `contrato.fechaInicio` es texto libre (`text`), no fecha; `.doc` antiguo sube pero no convierte; el cliente en `{firma_*}` pide cédula/RUC válidos para firma electrónica; la vista previa de una plantilla de **ticket** usa las variables de contrato (ver MSG-011).
- **Preguntas probables:** ¿cómo pongo el nombre del cliente en el contrato? (`{nombre_cliente}`) · ¿qué archivo tipo Word acepta? (.docx) · ¿por qué dice "tiene N error(es) en sus variables"? (llaves) · ¿dónde queda guardado el PDF? (no se guarda; se genera al vuelo) · ¿puedo usar mis campos personalizados? (sí, por su nombre) · ¿por qué no puedo eliminar la plantilla? (hay contratos que la usan).
- **Pendiente de validar en UI:** ❓ cómo se ve la grilla de tarjetas (`style.css`); ❓ si el diálogo muestra el aviso naranja de firma aun sin proveedor configurado (solo se muestra con `firmaDisponible`).

---

## MSG-011 · Plantilla › Formato de Ticket (.docx)

- **Ruta UI:** `/ajustes/plantillas` → **Formato de Ticket** (`name=documento_ticket`).
- **Archivos:** FE `…/components/PlantillaTicket.vue` (reutiliza `FormPlantilla.vue`); BE `plantillas/*` (`tipo='ticket'`), `ticket/variables-ticket.ts`, `ticket/ticket.controller.ts:147-151`.
- **Para qué sirve:** reemplazar el formato de impresión de la orden de servicio por un Word propio. Solo existe **uno**.
- **Acceso:** pestaña `variables.ver.plantilla.documentos.contrato`; botones `variables.edita.plantilla.documentos.contrato`.
- **Texto en pantalla:** banner *"Sube tu propio formato de ticket en Word y escribe dentro las variables entre llaves, por ejemplo {numero_ticket}. Al imprimir un ticket se rellenan con sus datos. Mientras no subas ninguno se usa el formato del sistema, el que ves hoy."*; sin formato: *"Todavía no hay un formato propio"* + *"Los tickets se imprimen con el formato del sistema."* + botón `Subir formato de ticket`; con formato: nombre, archivos, ✏ (tooltip `Reemplazar el formato`), 🗑 (tooltip `Quitar el formato y volver al del sistema`) → diálogo `¿Quitar el formato de ticket?` / *Los tickets volverán a imprimirse con el formato del sistema.* → `Formato de ticket quitado`.
- **Variables:** *Haz clic en una para copiarla y pégala dentro de tu documento de Word.* Grupos con contador "N variables" desde `GET /ticket/plantilla/variables` (error `No se pudieron cargar las variables disponibles`). Catálogo (`BE:ticket/variables-ticket.ts:127-350`): **Ticket** (`numero_ticket`, `asunto`, `detalle`, `estado`, `prioridad`, `turno`, `hora_visita`, `fecha_visita`, `agendado`, `fecha_creacion`, `fecha_cierre`, `departamento`, `total_respuestas`, `ultima_respuesta`), **Cliente** (`cliente_nombres`, `cliente_documento`, `cliente_celular`, `cliente_email`, `cliente_direccion`), **Servicio** (`servicio_ip`, `servicio_plan`, `servicio_usuario_ppp`, `servicio_caja_nap`, `servicio_puerto_nap`, `servicio_router`, `servicio_ubicacion`, `servicio_direccion`, `servicio_fecha_instalacion`), **Técnico/Operador** (`tecnico_nombre`, `tecnico_celular`, `operador_nombre`, `operador_celular`), **Empresa** (`empresa_nombre`, `empresa_razon_social`, `empresa_nombre_comercial`, `empresa_ruc`, `empresa_direccion`, `empresa_telefono`, `empresa_email`), **Visita del técnico** (`hora_llegada`, `hora_salida`, `tiempo_en_sitio`, `distancia_llegada`, `verificacion_visita`, `total_visitas`), **Materiales usados** (secciones repetibles `{#equipos}…{/equipos}`, `{#accesorios}…{/accesorios}`; `hay_materiales`, `hay_equipos`, `hay_accesorios`, `total_equipos`, `total_accesorios`, `equipos_texto`, `accesorios_texto`), **Firma electrónica** (`firma_cliente`, `firma_isp`), **Fecha de impresión** (`fecha_actual`, `hora_actual`, `dia_actual`, `mes_actual`, `anio_actual`).
- **Reglas ✅:** `POST /plantillas` con `tipo:'ticket'`: si ya hay otro → `409 Ya hay un formato de ticket cargado. Edítalo o elimínalo para subir otro.` (`BE:plantillas.service.ts:34-47`). El nombre también debe ser único entre **todas** las plantillas.
- **Casos límite:** (a) La **vista previa** del diálogo "Ver documento" sirve `GET /contratos/plantillas/:id/vista-previa`, que rellena con **variables de contrato** (`BE:contratos.service.ts:310`), por lo que las variables del ticket salen vacías ✅; (b) `PlantillaTicket.editar()` deja `file: null` en el archivo actual (`FE:…/PlantillaTicket.vue:65`); si el usuario guarda sin elegir un archivo nuevo, `uploadImages(null)` envía un campo vacío al upload (`FE:…/usePlantillas.js:131`) ❓ riesgo de error `No se pudo guardar la plantilla`.
- **Preguntas probables:** ¿cómo cambio el logo del ticket impreso? · ¿puedo tener dos formatos? (no) · ¿cómo vuelvo al formato original? (Quitar).

---

## MSG-012 · Plantilla › Cargo Recurrente

- **Ruta UI:** `/ajustes/plantillas` → **Cargo Recurrente**.
- **Archivos:** FE `…/components/AvisoCargoRecurrente.vue`; BE `servicios-recurrente/servicios-recurrente-queue.processor.ts:32-300`.
- **Acceso:** `variables.ver.cargo.recurrente` / `variables.edita.cargo.recurrente` (⚠ **no existen en el catálogo**: solo SUPER-ADMINISTRADOR).
- **Campos:** tabla de variables (9), editor `plantillaMsgCargoRecurrente`, control Meta `cargo_recurrente`, `Guardar cambios` → `PATCH /settings/:id` (`Actualización exitosa`).
- **Reglas ✅:** si el texto está vacío el backend usa uno por defecto: *"Estimado/a { cliente }, le informamos que { empresa } ha registrado un cargo recurrente en su cuenta. Tipo de pago: { tipo_pago } Monto: { monto } Estado: { estado } Facturas generadas: { facturas_generadas } Para consultas, comuníquese con nosotros. ¡Gracias por su preferencia!"* (`:70-73`); en oficial exige plantilla aprobada `cargo_recurrente`; origen del registro `cargo`.
- **Preguntas probables:** ¿cuándo se envía? (cuando el operador envía el comprobante del cargo) · ¿puedo mostrar los ítems? (`{ items }`).

---

## MSG-013 · Plantilla › Instalación (notificaciones por estado y checklist)

- **Ruta UI:** `/ajustes/plantillas` → **Instalación** → sub-pestañas **Notificaciones por estado** (icono `notifications_active`) y **Checklist instalación** (icono `check_circle`).
- **Archivos:** FE `ajustes/instalacion/{IndexPage,NotificacionesEstadoConfig,ChecklistConfig}.vue`; BE `instalaciones/instalaciones.service.ts`, `instalaciones/defaults/notif-templates.ts`, `settings/settings.service.ts:36-53`.
- **Acceso:** `variables.ver.plantilla.instalacion` (⚠ fuera de catálogo); sin permiso de edición.
- **Notificaciones por estado:** tarjeta *"📨 Notificaciones automáticas por estado — Cuando una instalación cambia de estado, el sistema envía automáticamente este mensaje al cliente o al técnico (WhatsApp y/o email)."*
  - Selectores: **Destinatario** (`Cliente` / `Técnico`), **Estado** (Cliente: Agendada, En proceso, Instalado, Reprogramada, Cancelada; Técnico: Agendada, En proceso), toggle `Notificación ACTIVA` / `Notificación DESACTIVADA`.
  - Chips de variables con tooltip (clic copia `{variable}`): Cliente-Agendada/En proceso: `cliente tecnico fecha_instalacion direccion telefono empresa`; Instalado: `cliente tecnico plan precio ipv4 ssid_wifi password_wifi empresa`; Reprogramada: `cliente tecnico fecha_instalacion motivo direccion empresa`; Cancelada: `cliente motivo empresa`; Técnico: `cliente tecnico fecha_instalacion direccion telefono ubicacion empresa`.
  - Bloques: **Mensaje de WhatsApp** (editor; tip *"💡 El formato se adapta automáticamente a WhatsApp (negrita → \*texto\*, cursiva → \_texto\_)."* + control Meta `instalacion_<destinatario>_<estado>`) y **Mensaje de Email** (`Asunto del email` máx. 200 + editor).
  - Banner: *"La notificación solo se envía si el cliente activó el canal correspondiente al crear la instalación (WhatsApp o email)."*
  - `Guardar Cambios` → `PATCH /settings/:id` (todo) → `Plantilla guardada` / error `Error al guardar`.
- **Reglas ✅:** los valores por defecto (seed, formato HTML con `{cliente}` sin espacios) los crea `SettingsService.create` para empresas nuevas y migraciones para existentes (`BE:instalaciones/defaults/notif-templates.ts`); si el estado no tiene plantilla activa, `enviarNotificacionCambioEstado` sale en silencio; el botón manual "Enviar Notificación" falla con `La plantilla del CLIENTE para el estado "<ESTADO>" no está activada en Ajustes › Notificaciones por estado.` o `…está activa pero vacía. Configúrala en Ajustes.` (`BE:instalaciones.service.ts:198-206`); el técnico solo para AGENDADA y EN_PROCESO y solo si tiene celular/correo y el operador no desactivó ese canal al crear la instalación; registra en "Mensajes enviados" con origen `instalacion` (`:572-596`).
- **Checklist:** tarjeta *"✅ Checklist de Instalación — Configura los pasos que el técnico debe completar antes de marcar la instalación como INSTALADO."*; por ítem: texto (máx. 120, contador, placeholder *Item N (ej. 'Probó la señal con el cliente')*), toggle `Obligatorio`/`Opcional`, flechas ▲▼, 🗑 (tooltip `Eliminar item`); `Agregar item`; `Guardar Cambios` → `PATCH /settings/:id` **+** `PUT /programar-queue/cortesServicios` (reprograma el proceso de cortes, `BE:app.controller.ts:33-47`) + `Actualización exitosa`. Si algún ítem queda vacío **no pasa nada** (sin mensaje, `FE:…/ChecklistConfig.vue:48-53`) ✅.
- **Preguntas probables:** ¿por qué el cliente no recibió el aviso de "Instalado"? (plantilla desactivada/vacía, canal desactivado al crear, sin teléfono) · ¿cómo pongo la clave del Wi-Fi? (`{password_wifi}`).

---

## MSG-014 · Control "WhatsApp Oficial" de cada plantilla (aprobación en Meta)

- **Dónde:** bloque `WaTemplateControl` bajo cada editor (Recordatorio ×3, Bienvenida, Pago recibido ×2, Promesa, Cargo, Contrato, Documento, Ticket cliente/técnico, Instalación ×7). Solo se muestra si `GET /cloud-api/config` devuelve `conectado=true` (`FE:…/RecordatorioPago.vue:63-74`).
- **Archivos:** FE `…/components/WaTemplateControl.vue`; BE `cloud-api/cloud-api.controller.ts:200-248`, `cloud-api.service.ts:1255-1983`, `template-converter.ts`.
- **Para qué sirve:** WhatsApp Oficial solo permite enviar fuera de la ventana de 24 h **plantillas aprobadas por Meta**; este control convierte el texto, lo envía a aprobar y muestra el estado. Sin plantilla aprobada, el envío por canal oficial falla.
- **Elementos en pantalla:**

| Elemento | Qué hace | Endpoint |
|---|---|---|
| Insignia de estado: `Sin enviar` (BORRADOR), `En revisión` (PENDIENTE), `Aprobada`, `Rechazada` (tooltip *Motivo: …*), `Pausada`, `Modificada — reenviar` | Compara el **texto visible** del editor con `textoEnviado`; si difiere → Modificada | estado de `GET /cloud-api/templates/state` |
| Contador `n/1024` (rojo si >1024) | Conversión en vivo con debounce 600 ms | `POST /cloud-api/templates/preview` |
| Nombre Meta (`estado.metaName`, p. ej. `recordatorio_pago_antes_v2`) | tooltip *Nombre de la plantilla en Meta* | |
| Categoría aprobada (`Utilidad`/`Marketing`/`Autenticación`) | tooltip *Categoría con la que Meta aprobó la plantilla (puede diferir de la que elegiste)* | |
| `Enviar a aprobar` / `Reenviar` | Abre diálogo **Enviar a WhatsApp Oficial** | |
| Diálogo: *Así llegará el mensaje a WhatsApp:* + advertencias (subrayado, listas, alineación, títulos) + errores de validación + `El texto es idéntico al de «…». Meta rechaza plantillas duplicadas; cámbialo para diferenciarlas.` | | `templates/preview` |
| Selector **Categoría** `UTILITY`/`MARKETING` (hint *UTILITY para avisos de servicio/pago; MARKETING para promociones.*) | | |
| Toggle **Adjuntar PDF (comprobante)** (solo pestañas con `permite-documento`: recordatorios y pago recibido) | *La plantilla llevará un archivo PDF en la cabecera. El comprobante real (distinto por cliente) se adjunta automáticamente en cada envío. Si cambias esta opción debes reenviar la plantilla a aprobación.* | |
| Botón `Enviar a aprobar` / `Reenviar de todas formas` | | `POST /cloud-api/templates/submit`; éxito `Plantilla enviada a aprobación de Meta.` |
| Texto fijo | *La aprobación de Meta puede tardar de minutos a 24 h. No podrás enviarla por WhatsApp Oficial hasta que sea aprobada.* | |
| Banner `Este texto ya está aprobado en Meta como …` + `Usar la aprobada` | Vincula sin re-aprobar | `POST /cloud-api/templates/candidata` y `/vincular` |
| Banner `En Meta hay una plantilla aprobada (…) pero con otro texto.` + `Ver opciones` → diálogo **Plantilla ya aprobada en Meta** (Antes/Después, mapeo `{{n}}` → dato de ISPMax) con `Usar el texto aprobado` / `Crear una nueva` | | |
| ⟳ sincronizar (en cada pestaña) | Refresca estados contra Meta; notify `Estados actualizados` | `POST /cloud-api/templates/sync` |

- **Reglas (backend) ✅:**
  1. **Conversión** (`template-converter.ts`): variables `{ nombre }` (letras, dígitos, `_`, tildes) → `{{1}}…` por orden de aparición y sin duplicar; negrita→`*`, cursiva→`_`; resto de formato se descarta con advertencia. Ejemplos para Meta salen de `VAR_EXAMPLES` (`Juan Pérez`, `15/07/2026`, `$25.00`, `Plan 100 Megas`…; `Ejemplo` si no se conoce) (`:24-74`).
  2. **Validación** (`validateMetaBody`, `:256-277`): mensaje vacío; **> 1024 caracteres**; no puede **empezar** ni **terminar** con variable; dos variables no pueden ir juntas. Textos: `El mensaje está vacío.` · `El mensaje supera 1024 caracteres (tiene N). Acórtalo para poder aprobarlo.` · `El mensaje no puede EMPEZAR con una variable; agrega texto antes.` · `El mensaje no puede TERMINAR con una variable; agrega texto o una firma después.` · `Dos variables no pueden ir juntas; sepáralas con texto.`
  3. **Duplicados:** otro tipo con el mismo cuerpo → `El contenido es idéntico al de "<tipo>". Meta rechaza plantillas duplicadas; cambia algo para diferenciarlas.` (`cloud-api.service.ts:1554-1560`).
  4. **Nombre en Meta:** `metaTemplateName(tipo)` (minúsculas, `[a-z0-9_]`); si ya existe/está bloqueado (Meta bloquea un nombre 4 semanas tras borrarlo) se crea `<base>_v2`, `_v3`… (`:97-128,1686-1711`). Si la existente está APROBADA/RECHAZADA/PAUSADA con `metaId` se **edita por ID** y conserva nombre (`:1659-1678`).
  5. **Estados** (`mapMetaStatus`): `APPROVED→APROBADA`; `REJECTED/DISABLED→RECHAZADA`; `PAUSED→PAUSADA`; `PENDING/IN_APPEAL/PENDING_DELETION/otros→PENDIENTE`. `BORRADOR` = nunca enviada o borrada en Meta (`syncTemplates`, `:1762-1792`).
  6. **Cabecera/pie/botones** (solo campañas): encabezado de texto ≤ 60; pie ≤ 60; ≤ 10 botones, texto ≤ 25; URL/teléfono obligatorios (`:1584,1623,1631-1645`).
  7. **Límite de cambios de plantillas del relay Dualhook:** 10 unidades/min (muestra de cabecera 4, crear/editar 6, borrar 10); ante `429` espera `Retry-After` (máx. 55 s) y reintenta una vez; si no, `Dualhook limita los cambios de plantillas por minuto. Espera N s y vuelve a intentarlo.` (`:169-210,130-136`).
  8. **Envío:** `enviarPlantillaPorTipo` sincroniza antes de fallar si la local no está aprobada; errores: `No hay plantilla de WhatsApp Oficial para "<tipo>". Créala y envíala a aprobar.` · `La plantilla "<tipo>" no está aprobada (estado: <estado>).` (`:1431-1452`).
- **Efectos externos:** Meta Graph API (`graph.facebook.com`, v22.0 por defecto) o relay `api.dualhook.com` (v25.0) según el token (ver MSG-017).
- **Casos límite:** una plantilla aprobada en otra instalación se puede **vincular** si su nombre es `base` o `base_vN`, idioma `es*`, sin variables con nombre, sin cabecera imagen/video, sin botones con variables (`:1802-1856`); una plantilla de Meta no puede servir a dos avisos (`:1930-1935`).
- **Preguntas probables:** ¿por qué mi mensaje "En revisión" no sale? · ¿cuánto tarda Meta? (minutos a 24 h) · ¿por qué dice Modificada? (cambié el texto) · ¿por qué rechazó Meta? (ver tooltip *Motivo*) · ¿por qué no puedo terminar con `{ empresa }`? · ¿por qué el nombre termina en `_v2`?
- **Pendiente de validar en UI:** ❓ si `rejectedReason` se muestra siempre; ❓ mensajes reales de Meta.

---

## MSG-015 · Ajustes › Mensajería (contenedor)

- **Ruta UI / name:** `/ajustes/mensajeria` · `ajuste.mensajeria` · menú lateral **Ajustes** → tarjeta **Mensajeria** (icono `send`, sin tilde).
- **Archivos:** FE `pages/dashboard/ajustes/mensajeria/IndexPage.vue`, `components/{WhatsappCloudApi,MensajesMasivos}.vue`, `components/mensajes-masivos/*`, `composables/*`, `pages/dashboard/empresas/components/ModalWhatsapp.vue`, `pages/dashboard/emails/components/FormEmail.vue`; BE `cloud-api/*`, `email/*`, `mensajes-masivos/*`.
- **Para qué sirve:** vincular el WhatsApp (no oficial por QR / oficial por Cloud API), configurar el correo saliente y lanzar mensajes masivos.
- **Acceso ✅:** tarjeta si `variables.config.servidor.correo` **o** `variables.vincular.whatsApp` (`FE:ajustes/IndexPage.vue:256-260`); guard `ajusteMensajeria` = esas dos claves (`FE:router/auth-guard.ts:57-60,120-123`); en el menú lateral el grupo Ajustes aparece con cualquiera de ellas (`FE:layouts/SideBarMenu.vue:429-430`). Cada tarjeta interna se oculta por su permiso: *WhatsApp* → `variables.vincular.whatsApp`; *Datos del servidor correo* → `variables.config.servidor.correo` (`FE:…/IndexPage.vue:157,281`). La pestaña **Mensajes Masivos no pide ningún permiso** (`:145,303-305`) ✅.
- **Secciones / pestañas:** `Configuración` (icono `settings`) y `Mensajes Masivos` (icono `campaign`).
- **Al abrir:** `GET /companies` (toma `data[0].numero_whatsApp`), consulta de sesión no oficial y `GET /cloud-api/config` (`:116-120`).
- **Pendiente de validar en UI:** ❓ cómo se ve la página si el usuario solo tiene permiso de correo (la pestaña Mensajes Masivos sigue visible).

---

## MSG-016 · WhatsApp No oficial (Baileys): vincular por QR y cerrar sesión

- **Ruta UI:** Mensajería › Configuración › tarjeta **WhatsApp** (cabecera azul) › pestaña **No oficial** (insignia `Activo` si es el canal vigente).
- **Para qué sirve:** enlazar el WhatsApp normal de la empresa escaneando un QR; los mensajes salen por un gateway externo (Baileys).
- **Acceso:** `variables.vincular.whatsApp`.
- **Elementos:**

| Etiqueta | Qué hace | Endpoint / efecto |
|---|---|---|
| Banner *"Canal no oficial: al no estar aprobado por WhatsApp, un uso inadecuado (envíos masivos o mensajes muy seguidos) puede provocar restricciones en el número. Úsalo con moderación; para campañas, el canal Oficial es más seguro."* | aviso | |
| `Vincular WhatsApp:` + campo **Numero vinculado** (solo lectura) | muestra el número una vez conectado (`info.number`) | `GET ${VITE_API_WHATSAPP}/api/whatsapp/session/<sesión>/info` (llamada **directa del navegador** al gateway) |
| Botón **Vincular WhatsApp** (icono `qr_code_2`, si no está conectado) | abre el modal **WhatsApp API QR** | `GET ${VITE_API_WHATSAPP}/api/whatsapp/qr/<sesión>` + WebSocket `VITE_WEBSOCKET` (cabecera `autentication: <sesión>`) |
| Modal: *"Escanea el siguiente código QR con tu aplicación de WhatsApp"* | muestra QR; evento `notificacion` `tipo:'qr'` actualiza imagen, `qrImage:'timeout'` muestra botón ⟳ para pedir otro QR; `tipo:'open'` cierra el modal | notify `Dispositivo vinculado.` y vuelve a consultar el estado |
| Botón **Cerrar sesión** (icono `logout`, si está conectado) | diálogo `¿Deseas cerrar la sesion de WhatsApp?` · `Cerrar Sessión` / `Cancelar` | `DELETE ${VITE_API_WHATSAPP}/api/whatsapp/session/<sesión>` → notify `Dispositivo Desvinculado.` (error: `error.response.data.message`) |
| **Usar este canal para enviar** (si el canal activo no es Baileys) | `wa_provider='baileys'` | `POST /cloud-api/credentials {wa_provider:'baileys'}` → `Canal no oficial activado.` |

- **Estados de conexión (los que ve el usuario):** *desconectado* (campo vacío + botón Vincular), *timeout* (QR caducado, botón ⟳), *conectado* (número visible + Cerrar sesión). Si el gateway no responde: notify `warning` `Fallo al cargar el QR.` (`FE:empresas/composables/useSetting.js:163-166`).
- **Reglas ✅:**
  - `companies.numero_whatsApp` **no es un teléfono**: es el **id de sesión** del gateway. Si está vacío, el FE crea una sesión nueva (`POST ${VITE_API_WHATSAPP}/api/session {nameSession:'<VITE_COMPANY_NAME>_<100-999>'}`) y la guarda con `POST /companies/<id>` (form-data `numero_whatsApp`) (`FE:pages/dashboard/empresas/composables/useSetting.js:145-175`).
  - El backend habla con el mismo gateway (`HOST_API_WHATSAPP`): `GET /api/whatsapp/session/<id>/info`, `GET /api/whatsapp/check-number`, `POST /api/whatsapp/send` (a veces `?fastMode=true`), `POST /api/whatsapp/send-media/file`.
  - Antes de enviar verifica `connected` y `check-number`; errores literales: `WhatsApp desvinculado`, `Cliente no usa WhatsApp` / `Número no usa WhatsApp`, `No se pudo contactar al servicio de WhatsApp` (según módulo).
  - El estado de canales se cachea 45 s (`BE:cloud-api/cloud-api.service.ts:434-469`; `FE:composables/useWaCanal.js:4`).
- **Efectos externos:** gateway Baileys (servicio aparte, **no incluido** en este código), WebSocket de notificaciones (`HOST_WEBSOCKET`).
- **Casos límite:** Meta/WhatsApp puede restringir el número por envíos seguidos — por eso los intervalos mínimos (30 s en masivos, 2–3 min en recordatorios).
- **Preguntas probables:** ¿cómo vinculo el WhatsApp? · ¿por qué dice "WhatsApp Desvinculado"? · ¿puedo usar el mismo número en el celular y en el sistema? (sí con Baileys, es multi-dispositivo; con oficial + overflow requiere coexistencia) · ¿por qué me banearon el número? · ¿qué hago si el QR caduca?
- **Pendiente de validar en UI:** ❓ comportamiento del gateway externo (código no incluido); ❓ si el QR se refresca solo.

---

## MSG-017 · WhatsApp Oficial (Cloud API vía Dualhook): credenciales, webhook, overflow y límites

- **Ruta UI:** Mensajería › Configuración › tarjeta **WhatsApp** › pestaña **Oficial**.
- **Archivos:** FE `…/mensajeria/components/WhatsappCloudApi.vue`; BE `cloud-api/cloud-api.controller.ts`, `cloud-api.service.ts`, `dto/save-credentials.dto.ts`, `companies/entities/company.entity.ts:54-83`.
- **Para qué sirve:** enviar por la API oficial de WhatsApp Business con plantillas aprobadas. La instancia **no** habla con Meta directamente en el caso normal: usa **Dualhook** como proveedor (relay) y una "Outbound API key" `dh_live_…`.
- **Acceso:** `variables.vincular.whatsApp`.
- **Datos requeridos (campos):**

| Etiqueta | Tipo | Obligatorio | Validación / notas |
|---|---|---|---|
| **Phone Number ID** | texto | sí (FE) | FE: `Completa Phone Number ID y WABA ID.` si falta (`:159-162`); en BD `varchar(50)` |
| **WABA ID** | texto | sí (FE) | `varchar(50)`; si el número responde pero el WABA no → banner *"El número responde, pero el WABA ID no. Las plantillas no funcionarán hasta corregirlo."* |
| **Access Token** | contraseña (ojo para ver) | solo la primera vez | hint: *"Outbound API key de Dualhook (empieza con dh_live_)"*; con token ya guardado: *"Ya hay un token guardado; deja vacío para no cambiarlo"*; **nunca** se devuelve al navegador (`getConfig` solo dice `conectado`) pero se guarda **en claro** (`text`, sin cifrar) |
| Verify Token (acordeón *Webhook para Dualhook*) | texto | no | 8–120 caracteres ASCII imprimibles sin espacios: `El verify token debe tener entre 8 y 120 caracteres, sin espacios ni acentos.` (`BE:cloud-api.service.ts:264-270`) |
| Overflow › toggle `Activo/Desactivado` y **Tope diario del oficial** | switch + número (≥1) | no | `wa_overflow`, `wa_oficial_limite_diario` (default **250**); se guarda al cambiar el toggle y al salir del campo (`blur`) |

- **Botones y acciones:**

| Etiqueta | Qué hace | Endpoint | Resultado/mensaje |
|---|---|---|---|
| Guardar y activar | Guarda credenciales, deja `wa_provider='cloud_api'`, valida contra el proveedor y devuelve el diagnóstico | `POST /cloud-api/credentials` | Éxito: `WhatsApp Oficial conectado (<nombre verificado>).`; guardado pero inválido: warning `Guardado, pero las credenciales no responden: <error|revisa el token/IDs>` |
| Probar (si hay credenciales) | Verifica número + WABA | `GET /cloud-api/verify` | Estado: `Verificando conexión…` → `Conectado: <name> · <phone>` / `Las credenciales no responden: <error>` |
| Limpiar credenciales | Diálogo *"¿Seguro que deseas borrar las credenciales de WhatsApp Oficial? El canal volverá al No oficial (Baileys). Las plantillas ya creadas en Meta no se borran."* (`No` / `Sí, limpiar`) | `POST /cloud-api/clear` | `Credenciales borradas. Canal No oficial activo.`; deja `wa_provider='baileys'` |
| Generar otro / Guardar token | Regenera (24 bytes hex) o guarda el verify token | `POST /cloud-api/webhook-token` | `Verify token guardado. Actualízalo en Dualhook.` |
| 📋 Copiar | Copia URL/token | — | `URL copiado` / `Token copiado` |

- **Estados de conexión (texto en pantalla):** `Sin configurar` · `Credenciales guardadas` (sin verificar) · `Verificando conexión…` · `Conectado: <nombre> · <teléfono>` · `Las credenciales no responden: <error>`. Línea adicional `Este mes: N mensajes · Utilidad N · Marketing N …` solo si hay analítica.
- **Webhook:** URL a registrar en Dualhook › *Webhook Override* = `<DOMINIO>/api/cloud-api/webhook` (si falta `DOMINIO` el campo dice *"Falta configurar el dominio del servidor"*, `BE:cloud-api.service.ts:279-283`). 
  - `GET /api/cloud-api/webhook?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…` → responde el `challenge` si el token coincide con el guardado en BD (precedencia: BD → `META_VERIFY_TOKEN` → literal `ispmax_dev_token_123`); si no, `403 Forbidden` (`BE:cloud-api.controller.ts:35-46`, `service:247-254`). Al abrir el panel por primera vez se genera y guarda uno propio (`:300-305`).
  - `POST /api/cloud-api/webhook` → responde siempre `200 EVENT_RECEIVED` y procesa en segundo plano; **sin verificación de firma** (solo existe verify token para el GET). Hace 2 cosas: registra en el log los mensajes entrantes (no se guardan ni se muestran) y aplica estados `sent → delivered → read` (o `failed`) al registro de "Mensajes enviados" que tenga ese `wamid` (nunca retrocede; `failed` marca el envío como *fallido* y guarda el motivo) (`:578-625`).
- **Enrutamiento de la API:** token `EAA…` ⇒ `graph.facebook.com` (versión `META_GRAPH_VERSION`, default v22.0); cualquier otro (p. ej. `dh_live_…`) ⇒ relay `DUALHOOK_API_URL` (default `https://api.dualhook.com`, v25.0) y **esa llave jamás se manda a Meta** (`:165-232`). Con el relay no hay: analítica/costos (`El consumo y el costo no se pueden consultar con la llave de Dualhook: su API no expone la analítica del WABA. Revísalo en el panel de Dualhook.`), `subscribed_apps` ni subida resumible (se usa un POST propio a `/<waba>/message_template_media`).
- **Reglas de envío ✅:** `send()` exige `phoneNumberId` y token (`La empresa no tiene WhatsApp Cloud API configurado`), timeout 15 s, suma 1 al contador diario (clave `wa-oficial-hoy:<empresa>:<YYYY-MM-DD>`, TTL 26 h, `:61-79`); el error `(#100) Invalid parameter` añade *" — verifica que el número del cliente sea válido y distinto al número del propio ISP."* (`:656-660`). Los números se normalizan a solo dígitos (`:629-631`) y antes pasan por `convertirFormatoTelefono`: respeta `+…` y `00…`, reemplaza el `0` local por el código del país y, si no trae código, lo antepone; el código por defecto sale de la variable `PAIS` del servidor (EC 593, CO 57, PE 51, BO 591, MX 52, VE 58, CL 56, AR 54; si no, 593) (`BE:pagos/helpers/facturacion-utils.ts:385-452`).
- **Overflow (límites):** con `wa_overflow` activo y canal activo oficial, envía por oficial **hasta `wa_oficial_limite_diario` mensajes al día** y el resto por Baileys (misma línea; "coexistencia"); sin overflow no hay tope en ISPMax y Meta rechaza al superar su tier. Texto UI: *"Según tu nivel en Meta (empieza en 250/día). Enviados hoy por el oficial: N / tope"* y, en masivos, *"Meta limita los envíos diarios por el canal oficial según tu nivel (empiezas en ~250 destinatarios/24 h hasta verificar el negocio), y las plantillas MARKETING requieren que el cliente haya dado consentimiento."* El bloque Overflow solo aparece si hay credenciales **y** (Baileys vinculado **o** overflow ya activo) (`FE:…:439-441`).
- **Efectos externos:** Dualhook/Meta (HTTP, timeouts 12–30 s); cache (Redis) para canales y contador; disco para encabezados de campañas (`static/uploads/wa-headers/<empresa>/`).
- **Casos límite y advertencias:** el contador diario usa fecha **UTC** (`:63-67`); el token de acceso se guarda sin cifrar y `GET /companies` devuelve toda la fila de empresa (ver Hallazgos); `saveCredentials` acepta guardar parcial (si solo llega `wa_provider`, no toca credenciales).
- **Preguntas probables:** ¿dónde consigo el Phone Number ID y WABA ID? (en Dualhook/Meta) · ¿qué es el Access Token? (Outbound API key `dh_live_…`) · ¿por qué dice "no responden"? · ¿cuántos mensajes puedo enviar al día? (según tu nivel en Meta; tope configurable de 250 por defecto para overflow) · ¿por qué el WhatsApp oficial no deja enviar texto libre? (solo plantillas aprobadas) · ¿qué pasa si limpio credenciales? (vuelve a Baileys; plantillas siguen en Meta).
- **Pendiente de validar en UI:** ❓ cuándo se muestra el resumen mensual (solo con llave `EAA`); ❓ pasos exactos del panel de Dualhook (fuera del código).

---

## MSG-018 · Selección de canal y reglas de envío (interruptores, canal activo, override manual)

- **Dónde:** tarjeta WhatsApp (toggle y pestañas) y tarjeta de correo; selectores "Canal WhatsApp" en los diálogos de envío manual.
- **Interruptores globales ✅:**

| Etiqueta | Campo | Efecto | Endpoint |
|---|---|---|---|
| **Usar WhatsApp para notificaciones** (caption *"Si lo apagas, ninguna acción intenta enviar por WhatsApp ni registra sus logs."*) | `companies.whatsapp_activo` (default `true`) | Apagado: ningún proceso intenta WhatsApp **ni registra** su detalle | `POST /cloud-api/whatsapp-activo {activo}` · notify `WhatsApp activado como canal.` / `WhatsApp desactivado: no se enviará por este canal.` (revierte si falla) |
| **Usar correo para notificaciones** (caption *"Si lo apagas, ninguna acción intenta enviar por correo ni registra sus logs."*) | `Email.activo` (default `true`) | Ídem para correo; `EmailService.sendMessage` lanza `El canal de correo está desactivado` | `PATCH /email/:id {activo}` · notify `Correo activado como canal.` / `Correo desactivado: no se enviará por este canal.` |

- **Excepciones al interruptor ✅:** el **envío manual** con canal elegido por el operador lo ignora en promesas de pago (`omitirInterruptor`, `BE:promesas-pago-notificacion.service.ts:97-107`); el envío del comprobante electrónico (SRI/Factus) por correo no lo respeta ("es un documento legal", `BE:email.service.ts:175-176`); los recordatorios y avisos de pago sí.
- **Canal WhatsApp activo (`wa_provider`):** `baileys` (defecto) | `cloud_api`. Cambia al guardar credenciales oficiales (→ `cloud_api`), al pulsar *Usar este canal para enviar* o *Limpiar credenciales* (→ `baileys`).
- **Cómo decide cada envío ✅ (`BE:cloud-api.service.ts:372-422`):**
  - Automáticos (cron, bienvenida automática, instalaciones, tickets sin override): `esCanalOficial` = proveedor `cloud_api` **y** (overflow apagado **o** usados hoy < tope).
  - Manuales con selector: `resolverCanalOficial(empresa, override)`: `cloud_api`/`oficial` ⇒ oficial; `baileys`/`no_oficial` ⇒ no oficial; sin override ⇒ canal activo.
  - Selector en pantalla: aparece **solo si** hay oficial **y** no oficial disponibles (`mostrarSelector`); si solo hay uno se usa ese; si hay ambos arranca en el canal activo (`FE:composables/useWaCanal.js:54-66`). Etiquetas: `Oficial` / `No oficial`.
  - Disponibilidad: *oficial* = `wa_cloud_phone_number_id` + token guardados; *no oficial* = sesión Baileys `connected` (consulta con timeout 6 s) (`:434-469`).
- **Preguntas probables:** ¿cómo dejo de enviar WhatsApp temporalmente? (apagar el interruptor) · ¿por qué un aviso salió por el no oficial si tengo el oficial? (overflow/tope diario o selección manual) · ¿puedo usar solo correo? (sí, apagar WhatsApp).

---

## MSG-019 · Servidor de correo (SMTP) y prueba

- **Ruta UI:** Mensajería › Configuración › tarjeta **Datos del servidor correo**. (También existe la ruta `/email/edit/:email_id` · `email.edit`, con el mismo formulario, solo alcanzable por enlace; `emails/IndexPage.vue` **no está enrutada**.)
- **Archivos:** FE `pages/dashboard/emails/components/FormEmail.vue`, `composables/useEmail.ts`, `EditEmail.vue`; BE `email/email.controller.ts`, `email.service.ts`, `entities/email.entity.ts`, `dto/create-email.dto.ts`.
- **Acceso:** `variables.config.servidor.correo`.
- **Campos ✅:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Usar correo para notificaciones | toggle (guarda al instante) | — | `activo` | ver MSG-018 |
| Host/servidor: | texto | sí (`required`) | `varchar(70)` | |
| Puerto: | texto (solo dígitos) | sí | `int`; el FE filtra no-numéricos | |
| Usuario/Correo: | texto | sí | `varchar(75)`; también es el **remitente** (`from: usuario`) | `autocomplete="off"` |
| Contraseña: | contraseña (ojo) | sí | `varchar(75)`; guardada **en claro** | |
| Seguridad: | select `SSL` · `TLS` · `NONE` | sí | `secure = (seguridad==='SSL')`, `requireTLS = (seguridad==='TLS')`; tooltip *"SSL → puerto 465 · TLS/STARTTLS → 587 · NONE → sin cifrado"* | |

- **Botones:**

| Etiqueta | Qué hace | Endpoint | Resultado |
|---|---|---|---|
| Probar Configuración | Abre diálogo **Correo del cliente** (campo email, `Cancelar` / `Enviar`) y manda un correo "Prueba de correo exitosa - Sistema ISPMAX" | `POST /email/testing` (usa los valores **del formulario**, aunque no estén guardados) | `Correo Enviado Exitosamente`; error: mensaje traducido al español con la API pública `api.mymemory.translated.net` (si falla la traducción, el texto original), o `<code> - <command>`; fallback FE `Hubo un error al enviar el email, por favor verique bien sus datos` |
| Guardar | Guarda host/puerto/usuario/clave/seguridad/activo | `PATCH /email/:id` | `Cambios guardado exitosamente` |

- **Reglas (backend) ✅:**
  - Hay **una sola fila** de configuración por instalación: `findOne(id)` **ignora el id** y devuelve la primera por `id ASC` (`BE:email/email.service.ts:280-291`), igual que `estaActivo()` (`:294-302`). El FE pide `/email/<email_id>` aun cuando en Mensajería no hay `email_id` (queda `undefined`) y funciona por eso ✅. La fila **no se crea desde el código** (no hay POST): se asume sembrada por el despliegue ❓.
  - `estaActivo()` = existe fila **y** `activo !== false` **y** host, usuario y password no vacíos (`:294-302`): sin esos datos el sistema considera el canal *apagado* y deja de registrar fallos de correo.
  - Conexión: timeouts 10 s (prueba) / 12 s (envíos), `tls: { ciphers: 'SSLv3', rejectUnauthorized: false }` ⇒ **acepta certificados no válidos** (`:26-31,187,247`).
  - Errores al enviar: `Error: getaddrinfo ENOTFOUND <host>` (DNS) o `Fallo al enviar el correo`; en los avisos de módulos se envuelve en mensajes como *"…revisar el servidor de correo configurado e intente de nuevo"*.
- **Efectos externos:** servidor SMTP del ISP; `api.mymemory.translated.net` (envía el texto del error SMTP).
- **Casos límite:** el remitente es el mismo `usuario` (si no es una dirección de correo completa, muchos SMTP lo rechazan); sin plantilla de asunto editable para casi ningún mensaje; no hay `reply-to`; límites del proveedor (p. ej. Gmail 500/día) no se controlan.
- **Preguntas probables:** ¿qué puerto/seguridad uso con Gmail/Office365? (587 + TLS / 465 + SSL) · ¿por qué la prueba falla con "Invalid login"? · ¿puedo usar otro correo para recordatorios y otro para facturas? (no, uno solo) · ¿por qué los correos llegan a spam?
- **Pendiente de validar en UI:** ❓ existencia de la fila `Email` en instancias nuevas; ❓ comportamiento con `NONE` (nodemailer puede aplicar STARTTLS oportunista).

---

## MSG-020 · Mensajes Masivos › Nuevo envío

- **Ruta UI:** Ajustes › Mensajería › pestaña **Mensajes Masivos** › sub-pestaña **Nuevo envío** (icono `send`). Sub-pestañas hermanas: **Historial** (`history`) y **Mensajes enviados** (`list`).
- **Archivos:** FE `…/mensajeria/components/MensajesMasivos.vue`, `mensajes-masivos/NuevoEnvio.vue` (1031 líneas), `composables/useFiltrosClientes.js`, `composables/useWaCanal.js`; BE `mensajes-masivos/{controller,service,queue.processor}.ts`, `entities/*`, `cloud-api/*`.
- **Para qué sirve:** enviar un mismo aviso (texto libre o plantilla aprobada) a un conjunto de clientes filtrado, espaciando los envíos.
- **Acceso:** ninguno propio (visible para cualquiera que entre a Mensajería; el backend solo pide JWT).
- **Secciones:** aviso de uso responsable, filtros + conteo, editor / plantilla, panel derecho (variables, canal, intervalo), botón enviar.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Filtrar por Router | select (clearable) | no | routers del usuario (`estadosStore.routerSinTodos`) | Se manda como cabecera `router-id: ["<id>"]` |
| Filtrar por Red IPv4 | select | no | deshabilitado sin router; `GET /red-ipv4?routerId=` | `red_ipv4_id` |
| Filtrar por Plan | select | no | deshabilitado sin router; `GET /internet/planes-disponibles/<router>` | se envía como filtro de texto `planes contains <nombre_plan>` |
| Estado cliente | select | sí (default `Todos`) | `Todos`, `Activos`, `Inactivos`, `Pagados`, `No Pagados`, `Suspendidos`, `Clientes con IP sin facturación` | query `?estado=` |
| **Total clientes:** (badge) | solo lectura | — | `GET /customers/ids` con los mismos filtros y `excludeRetirados=true`, debounce 500 ms | Los clientes **retirados nunca** se incluyen (`BE:mensajes-masivos.service.ts:55-62`) |
| Mensaje a enviar: | `q-editor` HTML | sí en canal no oficial | no vacío sin etiquetas: `Escribe un mensaje antes de enviar` | contador `N caracteres` |
| Insertar variable: (chips) | clic | — | `{nombre_cliente} {cedula_cliente} {celular_cliente} {email_cliente} {plan_cliente} {valor_plan} {dia_pago} {deuda_cliente} {estado_cliente} {empresa}` | si el cursor no está en el editor, se **agrega al final** (el código busca `.ql-editor` de Quill y `q-editor` no lo tiene) |
| Canal de envío: | botones | sí | `WhatsApp` · `Correo` · `Ambos` (valores `whatsapp`/`correo`/`ambos`) | |
| Canal WhatsApp: | botones `Oficial` / `No oficial` | solo si hay WhatsApp y están disponibles ambos canales | | Si solo hay oficial: plantilla obligatoria |
| Plantilla aprobada (WhatsApp Oficial): | select | sí en canal oficial | lista de `GET /cloud-api/templates/aprobadas` (incluye **también** las plantillas del sistema aprobadas, p. ej. recordatorios) | hint: *No tienes plantillas aprobadas. Crea una y espera la aprobación de Meta.* |
| Mapeo de variables | un select por `{{n}}` | sí | auto-mapeo heurístico por nombre (`/(cliente\|nombre)/`→`nombre_cliente`, etc.); obligatorio elegir dato | |
| Intervalo entre mensajes: | número, sufijo `seg` | sí | **mínimo 30** (FE corrige y muestra `Mínimo 30 segundos`); default 30; el BE usa 60 si no llega y **no valida mínimo** | |

- **Botones y acciones:**

| Etiqueta | Qué hace | Endpoint | Restricciones / efectos |
|---|---|---|---|
| **Enviar mensaje** (deshabilitado sin clientes o sin mensaje/plantilla) | Diálogo `¿Confirmar envío masivo?` — *Se enviará el mensaje (o la plantilla) a **N cliente(s)** con un intervalo de **S segundos** entre cada envío.* `Enviar`/`Cancelar` | `POST /mensajes-masivos?estado=<estado>` con cabecera `router-id` y cuerpo `{canal, intervalo, filters (JSON), red_ipv4_id, mensaje, wa_provider, plantilla?}` | Éxito `Envío iniciado para N cliente(s)`; limpia el formulario |
| Mis plantillas (solo oficial) | Diálogo **Mis plantillas de campaña**: lista con estado (`Aprobada`/`En revisión`/`Rechazada`/`Pausada`/`Sin enviar`), 🗑 `Eliminar plantilla` | `GET /cloud-api/templates/campana` · `DELETE /cloud-api/templates/campana/:tipo` | Eliminar: *¿Eliminar la plantilla **x**? Se borrará también en Meta y no se podrá usar en campañas.* → `Plantilla eliminada` |
| Crear plantilla (solo oficial) | Diálogo **Crear plantilla para campaña** con vista previa estilo WhatsApp | `POST /cloud-api/templates/submit` (`origen:'campana'`) | `Plantilla enviada a aprobación. Aparecerá aquí cuando Meta la apruebe.` |

- **Diálogo "Crear plantilla para campaña" — campos:** *Nombre de la plantilla* (ej. `promo septiembre`; se convierte a identificador Meta `[a-z0-9_]`, o `masivo_<timestamp>` si queda vacío); editor (solo negrita/cursiva); variables `{nombre_cliente}…`; **Encabezado (opcional)**: `Ninguno` / `Texto` (máx. 60) / `Archivo` (imagen, PDF o video, *el mismo para todos*); **Pie de página (opcional)** máx. 60, *"Texto corto al final, sin variables ni emojis."*; **Botones (opcional)** hasta 10: `Respuesta rápida` / `Enlace (URL)` / `Llamar (teléfono)` (texto máx. 25; avisos `El botón "x" necesita una URL` / `…un teléfono`); **Categoría** `MARKETING` (default) / `UTILITY` (*MARKETING para promociones; UTILITY para avisos de servicio.*); botón `Enviar a aprobar`. Validaciones FE: `Escribe el contenido de la plantilla`, `Escribe el texto del encabezado`, `Sube el archivo del encabezado`, `Máximo 10 botones`.
- **Reglas (backend) ✅:**
  1. `crearEnvioMasivo` obtiene los ids con los mismos filtros de la tabla de clientes; si no hay: responde `{msg:'No hay clientes que coincidan con los filtros', total:0}` (`:55-66`).
  2. Crea el registro (`estado='pendiente'`, `total_clientes`, `filtros{filters, red_ipv4_id, estado, routerIds}`, `usuario`) y encola **un job por cliente** en la cola `mensajes-masivos` con `delay = i × intervalo` y `attempts: 2` (`:69-104`); pasa a `en_proceso`.
  3. Cada job (`enviarMensaje`): si el masivo está `cancelado` sale sin registrar; carga el cliente con **todos sus servicios**; por **cada servicio** arma las variables (incluye deuda y fecha de corte de ese servicio) y envía; guarda **un detalle por servicio** pero suma **un solo** enviado/fallido por cliente (éxito si al menos un servicio salió) (`:42-240`).
  4. WhatsApp no oficial: verifica sesión y número una sola vez por cliente (`WhatsApp desvinculado`, `Cliente no usa WhatsApp`); oficial: arma `components` con los parámetros mapeados + encabezado multimedia fijo (se sube a Meta una vez por campaña y se cachea 20 h) (`:157-197`; `BE:cloud-api.service.ts:991-1011`).
  5. **Overflow en masivo:** si se pidió oficial y ya no hay cuota (`hayCuotaOficial`), ese cliente sale por Baileys con el texto de la plantilla ya renderizado (`:140-196`).
  6. Correo: asunto fijo `<empresa> - Mensaje`; cuerpo = texto resuelto; si el cliente no tiene email, el error de SMTP queda en el detalle.
  7. Reintentos: 2 intentos por job; si el job falla definitivamente (`OnQueueFailed`) se registra un detalle `fallido` con el error y se cuenta como fallido (`:315-326`).
- **Efectos externos:** Redis/Bull (delayed jobs), gateway Baileys, Cloud API/Dualhook, SMTP.
- **Mensajes (texto exacto):** `No hay clientes que coincidan con los filtros`; `Selecciona una plantilla aprobada`; `Escribe un mensaje antes de enviar`; `Error al enviar mensajes`; `Plantilla enviada a aprobación…`.
- **Casos límite y advertencias:**
  - El aviso *"Aviso de uso responsable — leer antes de enviar"* (solo no oficial) dice que el uso para spam/publicidad no solicitada es responsabilidad exclusiva del usuario.
  - El tiempo total = N × intervalo (p. ej. 1 000 clientes × 30 s ≈ 8 h 20 min); la lista se calcula **al enviar**, no se actualiza.
  - Un cliente sin celular (o con número inválido) aparece como `fallido` con el error del canal.
  - Con **Ambos**, WhatsApp y correo salen en el mismo paso; si uno falla y el otro no, el detalle queda `enviado` con el error concatenado (`canal_usado` solo lista el que salió).
  - El `intervalo` mínimo de 30 s es **solo del FE**.
- **Preguntas probables:** ¿cuántos mensajes puedo mandar? · ¿cuánto tarda? · ¿puedo cancelar? (sí, Historial) · ¿por qué dice "plantilla aprobada"? (oficial) · ¿qué variable uso para la deuda? (`{deuda_cliente}`) · ¿por qué algunos clientes recibieron el mensaje duplicado? (tenían varios servicios: un mensaje por servicio) · ¿se envía a clientes retirados? (no).
- **Pendiente de validar en UI:** ❓ si al elegir `Correo` también aparece el selector de plantilla; ❓ cómo se muestra el conteo cuando el router no está elegido (se cuentan todos los routers).

---

## MSG-021 · Mensajes Masivos › Historial (cancelar / reanudar)

- **Ruta UI:** Mensajería › Mensajes Masivos › **Historial**.
- **Para qué sirve:** ver las campañas lanzadas, su avance y cancelarlas o reanudarlas.
- **Columnas ✅ (`FE:…/HistorialEnvios.vue:19-28`):** `Fecha` (dd/mm/aaaa hh:mm) · `Canal` · `Estado` · `Total` · `Enviados` · `Fallidos` · `Usuario` · acciones. Tabla paginada en servidor (5/10/20/50), botón `Actualizar`, vacío: *No se encontró ningún registro*.
- **Estados posibles (`BE:mensajes-masivos/entities/mensaje-masivo.entity.ts:15`):**

| Estado | Significado | Color |
|---|---|---|
| `pendiente` | creado, aún sin iniciar (breve) | blue-grey |
| `en_proceso` | con jobs encolados/ejecutándose | blue |
| `completado` | todos procesados y **ningún** fallido | teal |
| `con_errores` | todos procesados y hubo al menos un fallido (o ninguno enviado) (`:312-318`) | orange |
| `cancelado` | detenido por el operador | red |

- **Acciones:**

| Icono (title) | Cuándo | Diálogo | Endpoint | Efecto |
|---|---|---|---|---|
| `list_alt` — *Ver mensajes enviados* | siempre | — | — | Salta a "Mensajes enviados" filtrado por esa campaña |
| `stop_circle` — *Cancelar envío* | `en_proceso` o `pendiente` | *Cancelar envío — ¿Cancelar el envío masivo? Los mensajes pendientes no se enviarán.* (`Cancelar envío` / `No`) | `PATCH /mensajes-masivos/:id/cancelar` | Marca `cancelado` y **elimina los jobs pendientes** de la cola; msg `Envío cancelado. N mensajes pendientes eliminados.`; si no aplica: `Solo se puede cancelar un envío en proceso o pendiente` |
| `play_circle` — *Reanudar envío* | `cancelado` | *Reanudar envío — ¿Reanudar el envío? Se enviarán solo los mensajes pendientes (sin repetir los ya enviados).* | `PATCH /mensajes-masivos/:id/reanudar` | Recalcula la audiencia con los filtros originales, **excluye** clientes que ya tienen detalle y re-encola; msgs: `Envío reanudado para N clientes restantes`, `No quedan clientes pendientes, envío marcado como completado`, `Solo se puede reanudar un envío cancelado` |

- **Reglas ✅:** los reenvíos de más de 5 mensajes (desde "Mensajes enviados") aparecen aquí como una campaña `Reenvío de N mensaje(s)` con `intervalo 30` (`BE:…service.ts:363-374`); el estado final se evalúa cada vez que termina un cliente (`actualizarContadorMasivo`, `:305-319`).
- **Casos límite ✅:**
  - **Reanudar pierde `wa_provider`, `plantilla` y `usuario`** (el job de reanudación solo lleva `canal` y `mensaje`, `:261-270`): una campaña de **plantilla oficial** reanudada se envía por Baileys con el cuerpo de la plantilla **sin rellenar los `{{n}}`**. 
  - Cancelar no revierte lo ya enviado; un job que ya empezó termina.
  - `con_errores` se usa también cuando **todos** fallaron (no hay estado "fallido").
- **Preguntas probables:** ¿cómo detengo una campaña que lancé por error? · ¿qué significa "con errores"? · ¿al reanudar se duplican mensajes? (no, salta los que ya tienen registro) · ¿por qué la campaña sigue "en proceso" horas? (espaciado entre mensajes).

---

## MSG-022 · Mensajes Masivos › Mensajes enviados (detalle por destinatario, reenviar, eliminar)

- **Ruta UI:** Mensajería › Mensajes Masivos › **Mensajes enviados**; se abre filtrada por campaña desde el icono *Ver mensajes enviados* del Historial.
- **Para qué sirve:** bitácora de los mensajes que ISPMAX intentó enviar (masivos y la mayoría de automáticos), con su resultado y, en WhatsApp oficial, el estado de entrega.
- **Filtros ✅:**

| Etiqueta | Valores | Parámetro |
|---|---|---|
| Origen | Todos · Masivo · Recordatorio · Cobro · Bienvenida · Ticket · Cargo · Contrato · Instalación | `origen` = `masivo`, `recordatorio_pago`, `notificar_cobro`, `bienvenida`, `ticket`, `cargo`, `contrato`, `instalacion` |
| Envío específico (solo si Origen=Masivo) | campañas recientes `dd/mm/aaaa — canal — N clientes (estado)` (últimas 100) | `GET /mensajes-masivos/:id/detalles` |
| Estado | Todos · Enviado · Fallido | `estado` = `enviado`/`fallido` |
| Fechas (rango, formato `YYYY/MM/DD`) | día único o rango; `X` para limpiar | `fechaDesde`, `fechaHasta` (incluye el último día completo, `BE:…service.ts:174-180`) |
| Buscar (debounce 400 ms) | texto libre | `buscar` contra nombre del cliente, destino, mensaje, canal, origen y error (`:158-173`) |

- **Columnas:** `Cliente` (enlace a la ficha `cliente.edit` si hay `customer_id`) · `Estado` (insignia `enviado`/`fallido`; si es oficial, ✔ `Enviado` / ✔✔ `Entregado` / ✔✔ azul `Leído` / ⚠ `No entregado`) · `Origen` (insignia de color) · `Canal` (texto crudo + insignia `Oficial`/`No oficial` solo si `canal_usado === 'whatsapp'`) · `Destino` · `Mensaje` (primeros 60 caracteres sin etiquetas; clic abre diálogo **Mensaje enviado**) · `Error` · `Fecha` (columna fija a la derecha).
- **Acciones sobre filas seleccionadas (casillas):**

| Botón | Diálogo | Endpoint | Efecto |
|---|---|---|---|
| **Eliminar** | *Eliminar registros — ¿Eliminar N registro(s) seleccionado(s)? Esta acción no se puede deshacer.* | `DELETE /mensajes-masivos/detalles` (body `{ids}`) | Borrado lógico (`deleted_at`); `N registro(s) eliminado(s)` |
| **Reenviar** | *Reenviar mensajes — ¿Reenviar N mensaje(s) seleccionado(s)?* | `POST /mensajes-masivos/detalles/reenviar` | Encola un job por mensaje con **30 s** entre cada uno; > 5 ⇒ crea campaña de reenvío visible en Historial; msg `N mensaje(s) encolado(s) con intervalo de 30s[ — puedes seguir el progreso en Historial]` |
| Actualizar | — | — | recarga |

- **Reglas (backend) ✅:**
  - Los módulos que envían escriben aquí con `registrarMensajeIndividual` (`origen`; excepciones: *Aviso Documento* y *Enlace de pago*, que no registran): `recordatorio_pago`, `bienvenida`, `notificar_cobro`, `ticket`, `cargo`, `contrato`, `promesa_pago`, `instalacion`, `envio_comprobante` (envío de factura electrónica, `BE:comprobantes-electronicos/facturas/invoice-queue.processor.ts`), `masivo`. Si el canal de correo está apagado, los registros de correo **no se guardan** (`canalRegistrable`, `:35-41`).
  - Estado de entrega oficial: llega por el webhook (MSG-017) y solo avanza (`sent<delivered<read`; `failed` fuerza `fallido`).
  - **Reenvío** (`reenviar-mensaje-individual`, `BE:…queue.processor.ts:242-313`): reenvía el **texto guardado** (`mensaje_enviado`) al `numero_destino`; WhatsApp **siempre por Baileys** (`WhatsApp desvinculado` si no hay sesión) y correo con asunto `<empresa> - Mensaje`. 
- **Casos límite ✅:**
  - Los orígenes `promesa_pago` y `envio_comprobante` **no tienen etiqueta ni filtro** en la pantalla (se ven con el texto crudo/gris y no se pueden filtrar por Origen).
  - Los envíos oficiales guardan el texto con prefijo `[Plantilla: <tipo>]\n\n…`; si se **reenvía**, ese prefijo viaja como parte del mensaje por Baileys; los fallidos del oficial no guardan texto.
  - Un detalle con `canal_usado='whatsapp, correo'` (masivo en "Ambos") se reenvía **solo por WhatsApp** (la rama de correo es `else if`).
  - `canal_usado` mezcla `email` y `correo` según el módulo.
  - Los detalles de masivo se guardan **uno por servicio** del cliente, así que el conteo de filas puede superar el "Total" de la campaña.
- **Preguntas probables:** ¿cómo sé si el cliente recibió o leyó el WhatsApp? (checks en oficial) · ¿por qué un mensaje dice "Cliente no usa WhatsApp"? · ¿puedo volver a mandar los fallidos? (seleccionar → Reenviar) · ¿dónde veo los recordatorios que se enviaron? (Origen = Recordatorio) · ¿se puede exportar? (no hay botón).
- **Pendiente de validar en UI:** ❓ etiqueta que se ve para `promesa_pago`; ❓ si las filas `deleted_at` desaparecen del filtro (TypeORM excluye eliminados lógicos en `createQueryBuilder` por defecto).

---

## MSG-023 · Contratos (backend): ciclo de vida, API y generación del PDF
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`. La carga de la plantilla .docx, el catálogo de variables y la vista previa están en MSG-010; las pantallas del cliente (listado, formulario, imprimir) se describen en SRV-010/SRV-011 de `cli2.md`. Aquí van las reglas del módulo `contratos`.
- **Ruta UI / name:** ficha del cliente (`cliente.edit`) → pestaña **Documentos** (icono `folder`; se dibuja con `cliente.contrato.index` **o** `cliente.documento.index`, `FE:pages/dashboard/clientes/components/editar/IndexPage.vue:85-90`) → bloque **Listado de Contratos** (`FE:…/Servicios/DocumentPage.vue:30-32`, `Contratos_Pdf/Contratos.vue`). Si el cliente tiene más de un servicio aparece arriba el selector de servicio (`SelectorServiciosCliente`, `DocumentPage.vue:10-28`); los contratos son de **un servicio**, y al cambiarlo se vuelve a pedir la lista (`useContratos.js:179-188`). ✅
- **Archivos:** FE: `Contratos_Pdf/Contratos.vue`, `FormContrato.vue`, `clientes/composables/useContratos.js` · BE: `contratos/contratos.controller.ts`, `contratos.service.ts`, `dto/create-contrato.dto.ts`, `dto/filter-contrato.dto.ts`, `entities/contrato.entity.ts`, `enums/contrato.enums.ts`, `variables-contrato.ts`, `common/utils/libreoffice.util.ts`, `contratos-archivos/contratos-archivos.service.ts:37-80`.
- **Para qué sirve:** registrar el contrato de cada servicio (título, vigencia, estado, plantilla) y producir su PDF rellenando el .docx de la plantilla con los datos del cliente.
- **Acceso (solo frontend):** `cliente.contrato.index` (bloque), `.agregar` (botón **Agregar Contrato**), `.editar` (lápiz), `.eliminar` (papelera), `.descargar` (impresora **Ver / Imprimir Contrato PDF**), `.notificacion` (avión **Enviar Notificación**) (`Contratos.vue:402, 442, 457, 505, 520`; catálogo `gestion-clientes-permisos.json:56-65`). El backend de `contratos` solo exige sesión (`@Auth()`). Las plantillas se gestionan con `variables.ver|agrega|edita.plantilla.documentos.contrato` (MSG-010). ✅
- **Endpoints** (`contratos.controller.ts`):
  | Método y ruta | Qué hace | Respuesta / errores |
  |---|---|---|
  | `POST /contratos` | crea el contrato | `Contrato creado correctamente`; 500 `Error al crear contrato` |
  | `GET /contratos?servicio&plantilla&estado&duracion&filter&page&limit` | lista | `Contratos obtenidos correctamente`; 500 `Error al obtener contratos` |
  | `GET /contratos/:id` | detalle con plantilla, servicio, cliente y plan | 404 `Contrato con id <id> no encontrado` |
  | `PATCH /contratos/:id` | edita | `Contrato actualizado correctamente`; 500 `Error al actualizar contrato:` |
  | `DELETE /contratos/:id` | borrado lógico del contrato **y de su documento** | `Contrato con #<id> y su documento asociado eliminado correctamente`; 404 `Contrato con ID <id> no encontrado` |
  | `POST /contratos/generate-pdf-report/:contratoId` | PDF del contrato (cuerpo `{valorInstalacion}`) | archivo `contrato.pdf` |
  | `GET /contratos/plantillas/:plantillaId/vista-previa` · `GET /contratos/variables/pdf` | MSG-010 | |
  | `POST /contratos/notification` | avisar al cliente (MSG-024) | `ok` |
- **Datos del contrato (DTO `CreateContratoDto`):** `titulo` (texto; columna 255), `fechaInicio` (texto obligatorio, el frontend manda `AAAA/MM/DD`), `fechaFin` (texto opcional), `duracion` (0, 1, 2, 3, 6, 12, 24, 36, 48 o 60 meses; 0 = indefinido), `estado`, `fechaFirmado` (opcional), `plantillaId` y `servicioId` (texto, sin comprobar que sean UUID válidos o existan) (`dto/create-contrato.dto.ts`). Las fechas se guardan como **texto**, no como fecha. ✅
- **Formulario del cliente** (`FormContrato.vue`, título `Agregar Contrato` / `Editar Contrato`): **Título:**, **Fecha Inicio:** (calendario `YYYY/MM/DD`, hoy por omisión), **Duración:** (`Indefinido`, `1 mes`, `2 meses`, `3 meses`, `6 meses`, `12 meses`, `24 meses`, `36 meses`, `48 meses`, `60 meses`), **Fecha Fin:** (solo al editar; solo lectura, `Indefinido` si la duración es 0; se recalcula sumando los meses a la fecha de inicio), **Estado:** (`Esperando aprobación de cliente`, `Activo`, `Anulado`, `Finalizado`), **Fecha de Firma:** (solo al editar, bloqueada), **Plantilla:** (todas las plantillas; **solo se puede cambiar mientras el estado sea `Esperando aprobación de cliente`**). Obligatorios: título, fecha de inicio, fecha fin (salvo indefinido), duración, estado y plantilla, con `Debes completar este campo`. Diálogo `¿Deseas agregar el contrato?` / `¿Deseas editar el contrato?`; éxito `Contrato agregado exitosamente` / `Contrato editado exitosamente`; error: mensaje del backend o `No se pudo guardar el contrato`. El **Estado** no tiene valor por omisión: hay que elegirlo. (`FormContrato.vue:24-27, 71-79, 94-282`; `useContratos.js:27-177`) ✅
- **Listado** (`Listado de Contratos`): columnas Título, Inicio, Finaliza (`Indefinido` si la duración es 0), Firmado (`--/--/----` si no hay), Duración (`N mes|meses`), Estado (insignia: `Activo` verde, `Anulado` rojo, el resto naranja), Plantilla, Acciones; buscador **Buscar...**; vacío `No se encontraron contratos`. (`Contratos.vue:13-37, 412, 427-437, 540`)
- **Barra superior y filas ✅ (`Contratos.vue:349-545`):** título de la tabla `Listado de Contratos`; botón `Agregar Contrato` (con `cliente.contrato.agregar`); cuadro `Buscar...` (espera 300 ms) que filtra **en el navegador** sobre los contratos ya cargados (valores mostrados en las columnas, p. ej. `Indefinido`), no vuelve a consultar al servidor; botón de pantalla completa (tooltip `Pantalla Completa` / `Salir Pantalla Completa`). Con la firma electrónica disponible (MSG-025) se añade una columna de casillas con `Seleccionar todos` y, con contratos marcados, el botón `Enviar a firmar (N)` (MSG-026). Iconos de cada fila, en este orden: `edit` **Editar** (`cliente.contrato.editar`), `send` **Enviar Notificación** (`.notificacion`, MSG-024), `draw` estado del trámite de firma (si lo hay; tooltip `<estado> — ver enlace`), `preview` **Ver cómo se enviaría a firmar — no crea el trámite** (solo con firma disponible), `print` **Ver / Imprimir Contrato PDF** (`.descargar`), `delete` **Eliminar** (`.eliminar`). La tabla muestra 10 filas por página (`pagination` con `rowsPerPage: 10`); como el servidor entrega como máximo 10 contratos (regla 1), nunca hay segunda página.
- **Formulario ✅ (`FormContrato.vue:94-301`):** botón de envío `Guardar` (alta) / `Editar` (edición); cierra con la `x` del encabezado. Al abrir (alta o edición) se pide `GET /plantillas?tipo=contrato` (todas las de tipo contrato, sin paginar, `BE:plantillas/plantillas.service.ts:77-91`; error `Error al cargar plantillas`) y en el alta se pone la fecha de hoy; en edición se carga la fila tal cual (no se vuelve a pedir `GET /contratos/:id`; `getContrato` está definido y no se usa). Cada cambio de **Fecha Inicio** o **Duración** recalcula la **Fecha Fin** sumando los meses (`YYYY/MM/DD`) o la vacía si es indefinido (`:29-50`); en el alta ese campo no se muestra pero sí se valida, por eso solo falla si la duración no se eligió. El envío manda además el `servicioId` del selector (`useContratos.js:153-158`); el servidor descarta con `whitelist` los campos de más (`plantilla`, `num`…).
- **Estados y quién los cambia** (`ContratoEstado`):
  | Estado | Cómo se llega |
  |---|---|
  | `Esperando aprobación de cliente` | elegido a mano; mientras esté así se puede cambiar la plantilla. No es requisito para enviar a firmar: el backend no mira el estado (MSG-026) |
  | `Activo` | a mano; **automático** al subir el documento firmado en **Documentos** (`fechaFirmado` = hoy `AAAA/MM/DD`) y al firmar el cliente electrónicamente (`contratos-archivos.service.ts:55-63`; `contratos/firma/contratos-firma.service.ts:303-308`) |
  | `Anulado` | solo a mano |
  | `Finalizado` | **lo pone el navegador**: al cargar el listado, cada contrato con `fechaFin` y estado distinto de Finalizado cuya fecha de fin ya llegó se muestra como Finalizado y se envía un `PATCH {estado: Finalizado}` por contrato, sin esperar respuesta y ignorando el error. La comparación es `new Date(fechaFin) < ahora`, y `AAAA/MM/DD` se lee como las 00:00 locales de ese día: **el mismo día de la fecha fin ya pasa a Finalizado** (no al día siguiente). También alcanza a los `Anulado`, que quedan como `Finalizado` (`useContratos.js:68-78`). No hay proceso programado en el servidor: si nadie abre la pestaña, el contrato sigue `Activo` en la base. ✅ |
  El backend no valida transiciones: acepta cualquier estado desde cualquier otro (`contratos.service.ts:443-510`). ✅
- **Reglas de negocio (backend):**
  1. **Listado:** el filtro por servicio solo se aplica si llega un `servicio` no vacío (`:122-124`): el panel manda `servicio: serviceClientSelected || null` (`useContratos.js:62-66`), de modo que sin servicio elegido la consulta devolvería los 10 contratos más recientes de **todos** los clientes (❓ si la pestaña puede abrirse sin servicio). Filtro de texto sobre título, estado y duración; ordena por `fechaInicio` descendente (texto); **página de 10 por omisión** (`limit || 10`) y la ficha del cliente no pide más, de modo que un servicio con más de 10 contratos solo muestra los 10 más recientes. (`:97-162`). ✅
  2. **Eliminar** borra lógicamente el contrato y su registro de **Documentos** (`softDelete` por `contratoId`); no borra los PDF del disco ni anula trámites de firma abiertos (`:512-556`). El diálogo del cliente avisa `¿Deseas eliminar el contrato "<título>"?.` + "Se eliminará también el documento asociado a este contrato." y confirma `Contrato y documento asociado eliminados`. ✅
  3. **Registro en el historial del cliente** (Logs): crear, editar (con el detalle de cambios, usando el nombre de la plantilla y la IP del servicio) y eliminar escriben en `Contrato` con el servicio como entidad (`:73-84, 470-499, 535-546`); los envíos de correo y WhatsApp del contrato también (`SEND_EMAIL`, `SEND_WHATSAPP`, y sus `…_ERROR`). ✅
  4. **Generación del PDF** (`generatePdfReport`, `:173-283`): ver el detalle en MSG-010. Particularidades: `valorInstalacion` (opcional, 0 por omisión) alimenta `{valorInstalacion}` y `{precio_total}`; los datos incluyen los **equipos y accesorios** del servicio (`getRecursosCliente`, SRV/SOP-021) y los **campos personalizados** del cliente; cada archivo de la plantilla se convierte por separado y se unen en un PDF; **no se guarda en disco ni en base**, se regenera en cada petición. Errores devueltos al usuario: 404 `Contrato no encontrado`; 400 `No hay archivos en la plantilla`; 404 `Archivo no encontrado: <archivo>`; 400 `Solo se permiten archivos .docx (<archivo>)`; 400 `La plantilla "<archivo>" tiene N error(es) en sus variables: … Corrige las llaves en el documento Word y vuelve a generarlo.` (el nombre que se cita es el **archivo guardado**, un código aleatorio de 32 caracteres, no el nombre de la plantilla); 500 `Error procesando documento: <archivo>`; 500 `Ocurrió un error al generar el PDF del contrato. Intente nuevamente.` ✅
  5. **Fallos de LibreOffice llegan genéricos:** si falta la ruta de LibreOffice en el servidor o la conversión falla, la excepción pasa por el mismo `catch` y el usuario solo ve `Error procesando documento: <archivo>` (el texto `Falta configurar la ruta de LibreOffice…` queda en el registro del servidor) (`contratos.service.ts:221-259`; `libreoffice.util.ts:31-36`). La conversión no tiene límite de tiempo: un LibreOffice colgado deja la petición esperando (`libreoffice.util.ts:57-91`). ✅
  6. El PDF se abre en una ventana nueva; si el navegador la bloquea: `El navegador bloqueó la ventana. Permite las ventanas emergentes de este sitio.` Antes se pide `Valor de Instalación` — "Ingrese el valor de la instalación para este contrato:" (por omisión `0.00`, **Generar Contrato** / **Cancelar**) (`Contratos.vue:281-345`).
- **Relaciones:** Plantillas (MSG-010), Documentos (`contratos_archivos`), Firma (MSG-025/026), Mensajería (MSG-024, MSG-022), Campos personalizados (AJS-017), Equipos y accesorios (SOP-021).
- **Casos límite y advertencias:**
  - `duracion` y `fechaFin` son independientes en el backend: la fecha fin la calcula el frontend, y el paso a `Finalizado` usa solo `fechaFin`.
  - `fechaInicio` es texto libre: si no es `AAAA/MM/DD`, el orden del listado y el cálculo de fin dejan de ser fiables.
  - Cambiar la plantilla de un contrato ya `Activo` solo se bloquea en la pantalla.
- **Preguntas probables de usuarios:**
  1. "¿Por qué mi contrato aparece Finalizado?" → su fecha fin ya pasó; se actualiza al abrir la pestaña.
  2. "No puedo cambiar la plantilla" → solo mientras está `Esperando aprobación de cliente`.
  3. "Dice 'Error procesando documento'" → la plantilla tiene un problema (llaves mal cerradas) o falla la conversión a PDF; revisar la plantilla o avisar a soporte.
  4. "¿Dónde queda guardado el PDF?" → no se guarda; se genera al imprimir.
  5. "Solo veo 10 contratos" → el listado trae los 10 más recientes por fecha de inicio.
  6. "¿Qué pasa con el documento al eliminar el contrato?" → se elimina también.
- **Límite de lectura:** la conversión .docx → PDF la hace LibreOffice instalado en el servidor (`libreoffice.util.ts`), fuera del ZIP; no se pueden leer sus mensajes ni su fidelidad con Word. Todo el código de `contratos/`, `contratos-archivos/` y de la ficha del cliente (listado, formulario, composable) está leído.
- **Pendiente de validar en UI:** ❓ aspecto del diálogo `Valor de Instalación`; ❓ si el PDF de una plantilla con varias páginas respeta el formato de Word en LibreOffice.

---

## MSG-024 · Notificar contrato / documento al cliente
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`. Los textos de los mensajes (plantillas Aviso Contrato / Aviso Documento) y su control de WhatsApp Oficial están en MSG-009 y MSG-014.
- **Ruta UI / name:** ficha del cliente → **Documentos** → icono de avión **Enviar Notificación** de cada contrato o de cada documento → diálogo **Enviar Notificación de Contrato** / **Enviar Notificación de Documento** (`FE:…/Servicios/Contratos_Pdf/NotificacionContratoModal.vue`, `Contratos.vue:441-455`). ✅
- **Archivos:** FE: `NotificacionContratoModal.vue` (parámetro `tipo` = `contrato`|`documento`), `src/composables/useWaCanal.js` · BE: `contratos/contratos.service.ts:559-736`, `contratos-archivos/contratos-archivos.service.ts:244-460`, `contratos-archivos.controller.ts:22-29`, `cloud-api/cloud-api.service.ts` (`resolverCanalOficial`, `enviarPlantillaPorTipo`).
- **Acceso:** `cliente.contrato.notificacion` / `cliente.documento.notificacion` (solo frontend).
- **Campos del diálogo:** **Enviar por:** (`WhatsApp`, `Email`, `Ambas`), **Canal de WhatsApp:** (`Oficial` / `No oficial`; solo si la empresa tiene los dos canales y se envía por WhatsApp; por omisión el único disponible o el canal activo), **Celular del cliente:** (teléfono con país), **Email del cliente:**; botón **Enviar**. Los datos del cliente se precargan (para contratos se lee el contrato; para documentos, el cliente de la fila). Validaciones: `Debes completar este campo` (canal, celular si WhatsApp/Ambas, correo si Email/Ambas) e `Ingresa un email valido` (si el correo tiene más de 5 caracteres). Éxito `Notificación de contrato enviada` / `Notificación de documento enviada`; error: aviso `warning` con el mensaje del backend o `Error al enviar notificación`. El diálogo se cierra siempre. (`NotificacionContratoModal.vue:33-129, 156-290`) ✅
- **Reglas de negocio (backend):**
  1. **Contrato:** genera el PDF **antes** de decidir el canal (`generatePdfReport`, `:606`), de modo que una plantilla dañada impide también el aviso por WhatsApp oficial (que no lo adjunta). Variables del texto: `cliente`, `contrato` (título), `plan` (`Plan no especificado` si no hay), `empresa`, `fecha_contrato` (fecha de inicio); en un **documento**, `contrato` y `fecha_contrato` salen del título y la fecha del propio documento (`:610-616`; `contratos-archivos.service.ts:292-298`). ✅
  2. **WhatsApp oficial** (`resolverCanalOficial(empresa, wa_provider)`): envía la plantilla aprobada `contrato` (documento: `documento`) con esas variables; **no adjunta el archivo** (`:624-652`; `contratos-archivos.service.ts:306-338`). **No oficial (Baileys):** comprueba sesión (`WhatsApp desvinculado`) y número (`Número no usa WhatsApp`), envía el texto de `plantillaMsgContrato` (documento: `plantillaMsgDocumento`) y luego el PDF `contrato-<título con guiones>.pdf` (documento: cada archivo del documento) (`:653-681, 789-837`; `contratos-archivos.service.ts:439-520`). ✅
  3. **Correo:** asunto `<empresa> - NOTIFICACIÓN - CONTRATO` (también para documentos), cuerpo = la plantilla, adjunto = el PDF del contrato o los archivos del documento (todos declarados `application/pdf`) (`contratos.service.ts:684-729, 739-786`; `contratos-archivos.service.ts:370-437`). Error: 400 `Fallo al enviar el email de notificación del contrato. por favor revisar el servidor de correo configurado e intente de nuevo <detalle>`. ✅
  4. **Con "Ambas"**, si WhatsApp falla se corta y **el correo no se envía** (la excepción sale antes de la rama de correo). ✅
  5. **Bitácora:** los avisos de **contrato** se registran en Mensajería › **Mensajes enviados** con origen `contrato` (enviado/fallido, canal, proveedor, destino); los de **documento** **no** (MSG-022). Ambos dejan huella en el historial del cliente (Logs). ✅
  6. Si el contrato no existe: 404 `Contrato con id <id> no encontrado` (en el reenvío por la ruta de aviso, 400 `No se encontró el contrato asociado`).
- **Casos límite y advertencias:**
  - El correo del documento adjunta los archivos con tipo `application/pdf` aunque sean imágenes u otros formatos.
  - El PDF del contrato enviado usa `valorInstalacion = 0`: `{valorInstalacion}` y `{precio_total}` salen con 0 (el valor que se escribe al imprimir no viaja al aviso). ✅
  - En el canal oficial el cliente no recibe el contrato, solo el aviso aprobado.
- **Preguntas probables de usuarios:**
  1. "El cliente recibió el mensaje pero no el contrato" → canal oficial: solo viaja el texto; usar el canal no oficial o el correo.
  2. "Elegí Ambas y no llegó el correo" → falló WhatsApp primero.
  3. "¿Dónde veo que se envió?" → Mensajes enviados, origen Contrato (los documentos no se registran), o el historial del cliente.
  4. "El PDF dice 0 de instalación" → el aviso no usa el valor de instalación del diálogo de impresión.
- **Pendiente de validar en UI:** ❓ aspecto del selector de canal; ❓ nombre real del archivo adjunto en WhatsApp.

---

## MSG-025 · Firma de Contratos: configuración del proveedor (Dátil)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** `/ajustes/firma-electronica` · `ajuste.firma-electronica` · Ajustes → tarjeta **Firma de Contratos** (`FE:pages/dashboard/ajustes/firma-electronica/IndexPage.vue`, `ajustes/IndexPage.vue:473-502`). ✅
- **Archivos:** FE: `ajustes/firma-electronica/IndexPage.vue`, `components/DatilConfig.vue`, `src/composables/useFirmaElectronica.js` · BE: `firma-electronica/firma-electronica.controller.ts`, `dto/credenciales.dto.ts`, `disponibilidad-firma.service.ts`, `signature-gateway.client.ts`.
- **Para qué sirve:** cargar y comprobar las credenciales del proveedor de firma electrónica (hoy solo **Dátil**, Ecuador) con las que los clientes firman sus contratos desde el celular.
- **Acceso:**
  - **Tarjeta:** se muestra con `variables.ver.plantilla.mensaje.contrato` **o** `variables.ver.plantilla.documentos.contrato`, **y** `ajuste.plantillas` (`ajustes/IndexPage.vue:473-486`).
  - **Ruta:** el guard exige un permiso llamado como la ruta, `ajuste.firma-electronica`, que **no existe en ningún catálogo** y no tiene excepción en `permisoPorRuta`: solo el rol SUPER-ADMINISTRADOR entra; los demás ven la tarjeta, pulsan y el guard los devuelve a su primera pantalla `…index` (`FE:router/auth-guard.ts`, comprobación `permisos.includes(to.name)`). ✅ (ver hallazgo)
  - **Backend:** solo `@Auth()`.
- **Qué ve:** cabecera `Firma de Contratos` con flecha **Volver a ajustes** y **Recargar**; aviso azul "Con esto los clientes firman su contrato desde el celular — Al configurar un proveedor se habilitan el marcador de posición de firma en las plantillas y el envío a firmar desde el perfil del cliente. Sin credenciales configuradas, los contratos siguen funcionando como hasta ahora: se imprimen, se firman a mano y se suben."; una pestaña por proveedor del catálogo del gateway (Dátil, con tilde verde **Lista para firmar** cuando las credenciales pasaron la comprobación); chip `Ecuador`, botones **Documentación** y **Ir a Dátil** (tooltip "Desde el portal se obtienen la API key y la URL del tenant"). Si el gateway no responde: aviso rojo `No se pudo contactar al servicio de firma de contratos` + el motivo + una pista con los nombres de las variables del servidor que hay que revisar. (`IndexPage.vue:66-217`)
- **Pestaña Dátil** (`DatilConfig.vue`):
  | Elemento | Detalle |
  |---|---|
  | Chip de estado | `Sin configurar`, `Sin verificar` ("Todavía no se comprobó contra Dátil. La firma de contratos no se ofrece hasta que la comprobación pase."), `Verificada`, `Rechazada` (con el mensaje del proveedor o "Dátil rechazó estas credenciales") |
  | Chips de nivel | `Firma Acreditada` ("Certificado emitido por una entidad acreditada por ARCOTEL. Equivale a firma manuscrita.") y/o `Firma Simple` ("El firmante acepta el documento y se guarda evidencia. Ante un reclamo, la carga de la prueba es del ISP."), según los niveles que habilitan las credenciales |
  | **API key** | texto oculto con ojo; ayuda "Se genera en Dátil: Admin → Configuración → Integración → Generar API key. Se muestra una sola vez." |
  | **URL del portal** | `https://mi-empresa.datil.id`; solo el host, sin rutas (`^https?://[^/]+/?$`); error "Debe ser sólo el host, sin /api/v1 ni ninguna otra ruta" |
  | **Guardar** / **Reemplazar credenciales** | guarda (`PUT /firma-electronica/config`, perfil `default`, `isDefault: true`) y comprueba enseguida (`POST /firma-electronica/probar`) |
  | **Comprobar** | repite la comprobación; muestra el resultado del proveedor (`ok` + mensaje) |
  | **Quitar** | diálogo `Quitar credenciales` — "Los contratos que ya están esperando firma siguen su curso en Dátil, pero no vas a poder enviar nuevos hasta volver a configurar. ¿Continuar?" (**Quitar** / **Cancelar**) → `DELETE /firma-electronica/config/datil/default` |
  | **Ajustes del trámite** (solo con credenciales) | **Intentos de verificación de identidad** (entero 3–10, por omisión 3; ayuda "Por firmante. Mínimo 3, que es lo que usa Dátil por defecto.") + **Guardar ajustes** → `PATCH /firma-electronica/config/datil/default/ajustes {maxRetries}`; nota: "Si el firmante agota los intentos hay que rehacer el trámite, y eso se cobra de nuevo. Subirlo ayuda cuando la validación falla por mala señal, poca luz o una cámara pobre —no cuando hay dudas sobre quién está firmando." |
- **Mensajes (texto exacto):** `Completá la API key y la URL del portal`; `La URL debe ser sólo el host, sin rutas. Ej: https://mi-empresa.datil.id`; `Credenciales guardadas`; `No se pudieron guardar las credenciales`; `No se pudo comprobar contra Dátil`; `Los intentos van de 3 a 10`; `Ajustes guardados`; `No se pudieron guardar los ajustes`; `Credenciales quitadas`; `No se pudieron quitar`. (`DatilConfig.vue:86-213`)
- **Reglas de negocio (backend):**
  1. **Las credenciales no se guardan en ISPMAX**: viajan a un servicio externo (signature-gateway) que las cifra; ISPMAX solo recibe qué llaves hay y el veredicto de la última comprobación (`lastVerifiedOk`, `lastVerificationMessage`, `enabledLevels`, `settings`). La API key del gateway no llega al navegador (`firma-electronica.controller.ts:12-18`; `signature-gateway.client.ts:12-17`). ✅
  2. **Código del ISP en el gateway:** sale del dominio del servidor (`https://serviinter.ispmax.ec/` → `serviinter-ispmax-ec`); sin dominio útil (localhost o IP) cae al nombre de la base de datos. Sin ninguno: 503 `Falta DOMINIO en el servidor…` (`:26-70`). ✅
  3. Al **guardar** o **probar**, ISPMAX da de alta la organización en el gateway si no existe (404 → crea) y le registra a dónde avisar cuando un trámite termina: `<dominio>/api/contratos-firma/webhook` y el secreto del aviso (`:171-215`). ✅
  4. **Disponibilidad** (`GET /firma-electronica/disponibilidad`): `habilitado` solo si el gateway informa un proveedor comprobado y apto; si no, un motivo: `El servidor no tiene configurado el gateway de firma…`, `No se pudo contactar al gateway de firma electrónica.`, `No hay ningún proveedor de firma electrónica configurado.`, `Las credenciales están cargadas pero todavía no se comprobaron.` o `Ningún proveedor configurado está en condiciones de firmar.` No existe un interruptor aparte: la función existe si hay credenciales comprobadas (`disponibilidad-firma.service.ts:21-77`). El panel la consulta para ofrecer la variable de firma en las plantillas y el botón **Enviar a firmar**; en error asume "no disponible". ✅
  5. `maxRetries`: entero entre 3 y 10 (DTO `GuardarAjustesDto`, sin mensaje propio: por API el rechazo sale en inglés estándar de la validación) (`dto/credenciales.dto.ts:70-88`). ✅
  6. Los errores del gateway se reenvían con su código y mensaje (`signature-gateway.client.ts:271-291`); sin respuesta: 502 `No se pudo contactar al gateway de firma`.
- **Casos límite y advertencias:**
  - El perfil siempre es `default`; el catálogo solo ofrece Dátil: cualquier otro proveedor que anuncie el gateway muestra "todavía no hay una pantalla de configuración para él en ISPMAX".
  - El cobro de cada trámite lo hace el proveedor (por solicitud, no por documento): lo dicen los comentarios y el tooltip de **Enviar a firmar**.
  - Quitar las credenciales con trámites vivos no los cancela.
- **Preguntas probables de usuarios:**
  1. "No me abre Firma de Contratos" → la ruta es solo para SUPER-ADMINISTRADOR aunque se vea la tarjeta.
  2. "Dice Sin verificar" → pulsar **Comprobar**.
  3. "¿Qué URL pongo?" → solo el host del portal, sin `/api/v1`.
  4. "¿Firma simple o acreditada?" → depende de las credenciales; la simple deja la carga de la prueba al ISP.
  5. "¿Dónde se guarda mi API key?" → cifrada en el servicio de firma, no se puede volver a leer.
- **Pendiente de validar en UI:** ❓ resultado real de la comprobación con una cuenta Dátil; ❓ lista de niveles que devuelve el proveedor.

---

## MSG-026 · Envío a firmar (contratos) y aviso de firma completada
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14` y cerrada con la lectura completa del lado de ISPMAX (`contratos/firma/`, `firma-electronica/`, panel). La firma de órdenes de servicio (tickets) comparte el mismo trámite y el mismo aviso: está en SOP-008.
> **Límite de lectura:** el gateway de firma (`SIGNATURE_GATEWAY_URL`) y el proveedor (Dátil) son servicios externos que no vienen en el ZIP; lo que contestan (estados, textos de rechazo, cobro, correo y pantalla que ve el firmante) solo se conoce por lo que ISPMAX espera recibir. El microservicio de facturación (`HOST_API_FACTURACION`), que aplica la firma del ISP, tampoco está en el ZIP.
- **Ruta UI / name:** ficha del cliente → **Documentos** → **Listado de Contratos**: casillas de selección + botón **Enviar a firmar (N)**; icono `draw` de estado del trámite; icono `preview` **Ver cómo se enviaría a firmar — no crea el trámite** (`FE:…/Contratos_Pdf/Contratos.vue`, `EnviarAFirmarDialog.vue`). ✅
- **Archivos:** FE: `Contratos_Pdf/Contratos.vue:57-247`, `EnviarAFirmarDialog.vue`, `src/composables/useFirmaElectronica.js` · BE: `contratos/firma/contratos-firma.controller.ts`, `contratos-firma.service.ts`, `dto/enviar-a-firmar.dto.ts`, `firma-electronica/firma-tramites.service.ts`, `ancla-firma.ts`, `firma-isp.service.ts`, `entities/solicitud-firma*.entity.ts`.
- **Para qué sirve:** que el cliente firme el contrato desde su celular con un enlace; al terminar, el documento firmado y el estado `Activo` aparecen solos.
- **Acceso:** la columna de casillas y los botones **solo aparecen si la firma está disponible** (MSG-025). No hay permiso propio: se ven con el bloque de contratos (`cliente.contrato.index`). El backend solo exige sesión; el webhook es público y se protege con firma HMAC. ✅
- **Flujo en pantalla:**
  1. Seleccionar uno o varios contratos del mismo cliente → **Enviar a firmar (N)** (tooltip "Van todos en un solo trámite: el cliente firma una vez y se cobra una firma").
  2. Diálogo **Enviar a firmar**: valida con `POST /contratos-firma/validar`; si hay problemas, aviso rojo `No se puede enviar todavía` con la lista y el botón **Enviar a firmar** deshabilitado; si no, lista "Documento a firmar" / "N documentos a firmar" y el aviso "Van todos en un solo trámite, así que el cliente firma una sola vez y se cobra una sola firma."
  3. **Enviar a firmar** (`POST /contratos-firma/enviar`; el panel no manda `nivel`, el backend usa `simple`): éxito `Contratos enviados a firmar`; error con el mensaje del backend o `No se pudo enviar a firmar`.
  4. Vista de resultado (`EnviarAFirmarDialog.vue:157-221`): chip de estado (`Esperando firma`, `En proceso`, `Firmado`, `Rechazado`, `Vencido`, `Anulado`, `Desconocido`), botón **Actualizar**, aviso "Esperando que el cliente firme" / "Trámite finalizado" — "El enlace le llegó a <correo>. Vence el <fecha>. Firmado el <fecha>.", campo con el **enlace de firma** (texto «Enlace de firma, por si preferís mandárselo vos:») y copiar (`Enlace copiado`; error `No se pudo copiar. Seleccioná el enlace y copialo a mano.`), mientras el trámite está vivo el texto «Cuando el cliente firme, los documentos aparecen solos en el listado de abajo y el contrato pasa a Activo. No hay que subir nada a mano.», y la lista de documentos (`Firmado` / `Pendiente`; el sufijo « · agregado por el proveedor» depende de `agregadoPorProveedor`, que **ningún código de ISPMAX escribe** y por tanto es siempre `false`). La fecha se muestra con `toLocaleDateString('es-EC')`. Botones `Cancelar` (antes de enviar) / `Cerrar` (después) y `Enviar a firmar` (deshabilitado si la validación falla). **Actualizar** hace `POST /contratos-firma/solicitudes/:referenceId/refrescar`, reemplaza el resultado y avisa a la grilla para que recargue (`:44-67`); error `No se pudo actualizar`. Reabrir desde el icono `draw` usa `GET /contratos-firma/solicitudes/:referenceId` (error `No se pudo cargar el trámite`).
  5. En cada fila aparece el icono de estado del último trámite del contrato (`Esperando firma`, `Firma en proceso`, `Firmado electrónicamente`, `Firma rechazada`, `Firma vencida`, `Firma anulada` + " — ver enlace"), que reabre el diálogo.
  6. **Actualización automática:** mientras haya trámites `pending`, `in_progress` o `unknown` y la pestaña esté visible, el panel consulta cada **15 s**; cuando uno pasa a firmado, recarga contratos y documentos y avisa `El cliente firmó. Se actualizaron los contratos y sus documentos.` (`Contratos.vue:120-160`). ✅
  7. **Vista previa** (`GET /contratos-firma/preparado/:contratoId`): abre `Documento preparado para firmar` con el PDF tal como se enviaría (incluida la firma del ISP) y, bajo el título, de dónde salió la posición de cada firma; no crea trámite ni gasta una solicitud. Error: el mensaje del backend o `No se pudo preparar el documento`.
- **Validaciones antes de enviar** (`contratos-firma.service.ts:55-123`; todos los motivos juntos, se unen con ` · `):
  | Motivo (texto exacto) | Causa |
  |---|---|
  | `No se seleccionó ningún contrato` / `No se encontraron N de los contratos` | lista vacía o ids inexistentes |
  | `Los contratos son de clientes distintos. Un envío tiene un solo firmante.` | mezcla de clientes |
  | `El cliente no tiene número o tipo de documento cargado` | falta documento |
  | `El proveedor de firma sólo acepta cédula o RUC ecuatorianos. Un cliente con pasaporte tiene que firmar en papel.` | pasaporte |
  | `El cliente no tiene correo cargado` | falta correo |
  | `El contrato "<título>" no tiene plantilla asignada` | sin plantilla |
  | `La plantilla "<nombre>" no indica dónde va la firma. Agregá la variable {firma_cliente} en el documento, donde deba quedar la firma del cliente.` | la plantilla no tiene `{firma_cliente}` (`tieneAnclaFirma`, MSG-010) |
  | `La plantilla "<nombre>" pide la firma del ISP ({firma_isp}) pero la empresa no tiene cargado su certificado de firma electrónica.` | `{firma_isp}` sin certificado `.p12` de la empresa (MSG-027) |
  | `N de los contratos ya están esperando firma. Hay que anular o esperar ese trámite antes de reenviarlos.` | ya hay un trámite no final |
  | `Hay contratos con el mismo título: …` | nombres de archivo repetidos |
- **Qué hace el backend al enviar** (`firma-tramites.service.ts`):
  1. Por cada contrato genera el PDF **dos veces** (con marcas y con espacios) para ubicar `{firma_cliente}` (y `{firma_isp}`) sobre el documento ya paginado y centrar el sello; si el segundo render pagina distinto, usa el primero con la marca tapada (`:212-303`). Si no encuentra la marca: 400 `No se encontró {firma_cliente} en el documento generado de "<título>". Revisar que la plantilla "<nombre>" tenga la variable escrita con una sola llave, y volver a guardarla.`
  2. Si la plantilla pide `{firma_isp}`, firma **antes** con el certificado de la empresa (así la firma del proveedor entra como revisión incremental y las dos quedan válidas) (`:305-331`).
  3. **Congela** el PDF enviado en `static/uploads/images-services/enviado-<referencia>-<n>.pdf` y manda al gateway: código de la organización, referencia `ISPMAX-<uuid>`, nivel, firmante (documento, tipo, correo, nombre, celular en formato internacional con el código de país por omisión), marcas de posición y los PDF en base64 (`:376-421`). Si el gateway rechaza, borra los PDF congelados y traduce los índices del error a los nombres de los documentos (`:423-431, 485-508`). ✅
  4. Guarda la solicitud (`solicitudes_firma` + documentos) con referencia, estado, enlace de firma, vencimiento, datos del firmante y posiciones usadas, y escribe en el historial `Se enviaron N contrato(s) a firmar a <cliente> (<correo>)` (`:433-475`).
- **Aviso de firma completada** (`POST /api/contratos-firma/webhook`, público): el gateway avisa cuando un trámite llega a un estado final. Se verifica la firma HMAC-SHA256 del cuerpo crudo (`x-gateway-signature` = `sha256=` + HMAC de `"{timestamp}.{cuerpo}"` con el secreto compartido) y que `x-gateway-timestamp` esté a ±300 s; **si el servidor no tiene secreto configurado, el aviso se acepta sin verificar** y solo se deja una advertencia en el registro (`:765-804`). Cualquier error al aplicarlo se registra y se responde `{recibido:true, aplicado:false}` (200) para que el gateway no reintente (`contratos-firma.controller.ts:96-112`). Un aviso de un trámite desconocido también responde 200. ✅
- **Al completarse:** el estado `completed` descarga cada PDF firmado (`firmado-<referencia>-<n>.pdf`, con su hash) y, por contrato, crea un registro en **Documentos** (título del contrato, descripción `Firmado electrónicamente · trámite <primer bloque de la referencia>`, fecha de hoy) y pone el contrato en `Activo` con la fecha de firma. **Si el contrato ya tenía un documento en Documentos, no hace nada de eso**: el manejador termina antes de crear el registro y antes de cambiar el estado, de modo que el contrato conserva su estado y su fecha de firma, y el PDF firmado queda solo en el trámite (`firmado-<referencia>-<n>.pdf`) (`contratos-firma.service.ts:277-282`). La fecha de firma es la **fecha UTC** del servidor (`toISOString`), por lo que de noche en Ecuador (después de las 19:00) queda la fecha del día siguiente (`:290,307`). Si una descarga falla, queda en el historial `No se pudo descargar el documento firmado "<nombre>". Se puede reintentar desde el panel con "Actualizar".` (`firma-tramites.service.ts:683-763`; `contratos-firma.service.ts:273-309`). Estados que no actualizan el contrato: rechazado, vencido, anulado. ✅
- **API de ISPMAX (`contratos-firma.controller.ts`) ✅:**
  | Método y ruta | Qué hace | Notas |
  |---|---|---|
  | `POST /contratos-firma/validar` | `{contratoIds}` → `{puedeEnviar, problemas[], cantidad}` | `@Auth()`; `contratoIds`: arreglo no vacío de UUID v4 (`dto/enviar-a-firmar.dto.ts`); un id mal formado sale como error de validación estándar en inglés |
  | `POST /contratos-firma/enviar` | `{contratoIds, nivel?}` (`nivel`: `simple` por omisión o `accredited`) | si `puedeEnviar` es falso: 400 con los problemas unidos por ` · `; devuelve el detalle del trámite |
  | `GET /contratos-firma/preparado/:contratoId` | PDF `inline` con cabecera `X-Origen-Firma` | 404 `No se encontró el contrato`; no guarda nada |
  | `GET /contratos-firma/solicitudes?servicioId=` | trámites del servicio (más nuevo primero), con `contratoIds` | el panel toma, por contrato, el primero que lo menciona |
  | `GET /contratos-firma/solicitudes/:referenceId` | detalle: estado, enlace, vencimiento, firmante, documentos (`firmado`, `hash`, `agregadoPorProveedor`) | 404 `No existe el trámite de firma "<ref>"` |
  | `POST /contratos-firma/solicitudes/:referenceId/refrescar` | consulta al gateway y aplica el estado; si el trámite ya es final no consulta, y si está `completed` reintenta bajar los firmados que falten | |
  | `POST /contratos-firma/webhook` | aviso del gateway (público, HMAC) | siempre HTTP 200 |
- **Lo que viaja al gateway ✅ (`firma-tramites.service.ts:376-431`; `signature-gateway.client.ts`):** `POST /v1/signature-requests` con `organizationCode`, `referenceId` (`ISPMAX-<uuid>`), `level`, un firmante (`identityDocument`, `identityDocumentType` = `cedula`/`ruc`/`passport` según `tipo_documento` `05`/`04`/`06`, `email`, `name`, `phone` en formato E.164 si hay celular: el `0` inicial se cambia por `CODIGO_PAIS_TELEFONO` o `+593`), `placements` (`documentIndex`, `page`, `x`, `y` en cm) y `documents` (`name`, `contentBase64`). La respuesta aporta `providerId`, `providerRequestId`, `status`, `signingUrl` y `expiresAt`. Otras llamadas: `GET /v1/signature-requests/:ref`, `POST …/:ref/refresh`, `GET …/:ref/documents/:n` (PDF), `GET /v1/organizations/providers/catalog` (de ahí sale el tamaño del sello, `capabilities.stampSizeCm`; sin él la firma se apoya en la esquina de la marca). Cabecera `x-api-key`, tiempo máximo 60 s, sin límite de tamaño. Solo el tipo de documento `04`, `05` y `06` está mapeado: otro (p. ej. `07`) produce `El cliente no tiene número o tipo de documento cargado` (`firma-tramites.service.ts:39-44,154-172`).
- **Posición de la firma ✅ (`ancla-firma.ts`):** las marcas son `{firma_cliente}` (token `FIRMACLIENTEAQUI`), `{firma_tecnico}` (`FIRMATECNICOAQUI`, tickets) y `{firma_isp}` (`FIRMAISPAQUI`). Se busca el token con pdf.js sobre el PDF paginado (tolerando que LibreOffice lo parta en fragmentos) y se manda el centro del sello (5,29 × 1,69 cm) sobre la marca; se admiten varias apariciones (varias páginas) y todas se envían como `placements`. La firma del ISP se aplica **antes** de enviar: `POST {HOST_API_FACTURACION}/firma-pdf/firmar` con el .p12 de la empresa (nombre y clave) y sello QR compacto; falla con `No se pudo aplicar la firma del ISP a "<archivo>": <motivo>`, o `Falta configurar HOST_API_FACTURACION: sin esa URL no se puede aplicar la firma del ISP.` (`firma-isp.service.ts:72-138`).
- **Modelo de datos ✅:** `solicitudes_firma` (tipo `contrato`|`ticket`, `referenceId` único, `providerId`, `providerRequestId`, `nivel`, `estado`, `urlFirma`, `expiraEn`, `firmadoEn`, `motivo`, datos del firmante copiados al enviar, `evidencia` JSON tal como la dio el proveedor, `servicioId`, usuario) y `solicitudes_firma_documentos` (`contratoId` o `ticketId`, `orden`, `nombreArchivo`, `posicionFirma` JSON, `archivoEnviado`, `archivoFirmado`, `hash`, `agregadoPorProveedor`). Estados: `pending`, `in_progress`, `completed`, `rejected`, `expired`, `cancelled` (finales: los cuatro últimos) y `unknown`, que **no sobrescribe** un estado bueno (`entities/solicitud-firma*.entity.ts`; `firma-tramites.service.ts:683-697`). Un contrato puede tener varios trámites (cada reenvío es uno nuevo); `contarEnTramite` bloquea solo si hay uno no final (incluido `unknown`).
- **Aviso: datos que usa ✅ (`aplicarEstado`, `:683-716`):** `referenceId`, `status`, `providerRequestId`, `expiresAt`, `completedAt`, `reason`, `evidence` y `documents[{position|name, hash}]`. Registra en Logs (`entityType SolicitudFirma`): al enviar `CREATE` «Se enviaron N contrato(s) a firmar a <cliente> (<correo>)»; en cada cambio de estado `UPDATE` «El trámite de firma pasó de "<anterior>" a "<nuevo>"» (sin usuario); y si falla una descarga «No se pudo descargar el documento firmado "<nombre>". Se puede reintentar desde el panel con "Actualizar".». Una firma HMAC inválida, un timestamp fuera de ±300 s o cabeceras ausentes lanzan 401 internamente, pero el controlador lo captura y responde `200 {recibido:true, aplicado:false}`: el gateway nunca ve el rechazo (`contratos-firma.controller.ts:96-112`; `firma-tramites.service.ts:765-804`). El cuerpo crudo para la HMAC lo guarda `main.ts:24-33`.
- **Variables de entorno que intervienen ✅:** `SIGNATURE_GATEWAY_URL`, `SIGNATURE_GATEWAY_API_KEY`, `SIGNATURE_GATEWAY_WEBHOOK_SECRET`, `SIGNATURE_GATEWAY_WEBHOOK_URL` (solo desarrollo), `DOMINIO`, `DB_NAME`, `NOMBRE_EMPRESA`, `CODIGO_PAIS_TELEFONO`, `HOST_API_FACTURACION`.
- **Casos límite y advertencias:**
  - Un trámite vencido, rechazado o anulado **no cambia el estado del contrato**; como el trámite ya es final, el contrato se puede enviar de nuevo (cada intento es una solicitud nueva).
  - No existe en el panel ni en la API de ISPMAX una acción para **anular** un trámite (`contratos-firma.controller.ts`: solo validar, enviar, preparado, solicitudes, refrescar y webhook); el mensaje de validación dice "anular o esperar" ❓ (la anulación sería en el proveedor).
  - Un celular sin código de país se completa con el prefijo por omisión del servidor (+593 si no hay variable).
  - El sondeo de 15 s solo corre con la pestaña visible; el aviso del gateway es lo que normalmente actualiza el estado. El sondeo consulta la base de ISPMAX (`GET /contratos-firma/solicitudes`), no al proveedor: `Actualizar` (`refrescar`) es lo único que le pide el estado al gateway.
  - Los PDF enviados y firmados quedan en `static/uploads/images-services/` con los nombres `enviado-ISPMAX-<uuid>-<n>.pdf` y `firmado-ISPMAX-<uuid>-<n>.pdf`; si el gateway rechaza el envío, los enviados se borran.
  - La firma en el panel solo se ofrece para contratos; `nivel: accredited` existe en la API pero el panel nunca lo manda.
- **Preguntas probables de usuarios:**
  1. "No me aparecen las casillas" → la firma electrónica no está configurada o no pasó la comprobación (MSG-025).
  2. "Dice que la plantilla no indica dónde va la firma" → agregar `{firma_cliente}` en el .docx.
  3. "El cliente es extranjero" → con pasaporte no se puede firmar electrónicamente.
  4. "¿Se cobra por contrato?" → por solicitud: varios contratos en un envío = una firma.
  5. "El cliente ya firmó y sigue pendiente" → pulsar **Actualizar** en el diálogo.
  6. "¿Dónde queda el contrato firmado?" → en Documentos del cliente.
- **Pendiente de validar en UI:** ❓ mensajes reales del proveedor ante rechazos y qué ve el cliente al abrir el enlace (servicio externo, ver `Límite de lectura`); ❓ si Dátil permite anular un trámite desde su portal (ISPMAX no tiene ninguna acción de anulación, `contratos-firma.controller.ts`).

---

## MSG-027 · Certificado .p12 de la empresa (firma del SRI): carga, validación y aviso de vencimiento
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14` y cerrada con la lectura completa de `companies/`, de la ficha de empresa y del aviso de la cabecera. El formulario completo de **Ajustes › Empresa** está en AJS-029 y ACC-030; aquí va lo del certificado.
> **Límite de lectura:** el microservicio de facturación (`HOST_API_FACTURACION`: `/files/upload-signature`, `/certificado/info`, `/firma-pdf/firmar`, `/v1/factura/emision`) no viene en el ZIP; solo se conoce lo que ISPMAX le envía y lo que espera recibir.
- **Ruta UI / name:** (carga) Ajustes → **Empresa** → formulario de empresa, o directamente `/empresa/edit/:empresa_id` (`index.empresa`, `FE:router/routes.ts:45-47`); los campos del certificado solo se dibujan si el país es Ecuador (`ES_ECUADOR`). (Aviso) franja bajo la barra superior, en cualquier pantalla, para empresas que requieren facturación electrónica (`FE:pages/dashboard/empresas/components/FormEmpresa.vue:236-326`, `layouts/MainLayout.vue:108-135, 292-373`). ✅
- **Archivos:** FE: `empresas/components/FormEmpresa.vue`, `empresas/EditEmpresa.vue`, `empresas/composables/useEmpresa.js`, `layouts/MainLayout.vue`, `composables/useFacturacionElectronica.js` · BE: `companies/companies.controller.ts`, `companies.service.ts`, `entities/company.entity.ts:100-120`, `dto/create-company.dto.ts`, `helpers/fileFilter.helper.ts`, `helpers/fileNamer.helper.ts`, `deploy/service-token.guard.ts`, `firma-electronica/firma-isp.service.ts:55-61`, `comprobantes-electronicos/facturas/invoice-queue.processor.ts:208-212`.
- **Campos (solo Ecuador):** **Cargar Certificado:** (archivo `.p12`, selector con `accept=".p12"`; otro tipo: `El tipo de archivo es invalido`; si ya hay uno guardado, la etiqueta muestra su nombre y una `x` quita el archivo recién elegido), **Clave Certificado:** (con ojo `visibility`; se recorta con `trim`), **Obligado Contabilidad:** (interruptor), **Fecha Exp. Firma Electrónica:** (solo lectura, `DD/MM/YYYY HH:mma`; al abrir sale de la fecha guardada, `EditEmpresa.vue:24`). Permiso para guardar: `editar.empresa` (botón **Guardar Cambios**, `FormEmpresa.vue:335-348`). ✅
- **Validación al guardar (frontend) ✅ (`useEmpresa.js:77-113,133-198`):** solo si **Requiere Facturación** está activo, hay un archivo nuevo elegido y la clave no está vacía, el navegador abre el .p12 con `node-forge` y la clave escrita; si no abre: `La contraseña del certificado esta incorrecta` bajo **Clave Certificado**; si abre, toma el nombre del titular (atributo CN del sujeto) como **Razón Social**, la caducidad (`notAfter`) en ISO y la muestra en **Fecha Exp.**. Con Ecuador y facturación activa, `clave_certificado` e `iva` pasan a ser obligatorios (`Debes completar este campo`). **Ese error no impide guardar**: `onSubmit` usa `if (await !validarCampos(true)) return`, que nunca corta (`useEmpresa.js:203`; H-7 de `acc.md`), de modo que el diálogo `¿Deseas realizar la edición?` aparece igual y el archivo y la clave erróneos se guardan; en ese caso `fecha_caducidad_certificado` conserva la fecha anterior (se reenvía la que se cargó al abrir, `EditEmpresa.vue:25`, `useEmpresa.js:233`). Éxito: `Información editada`.
- **Reglas de negocio (backend):**
  1. **Subida:** `POST /companies/:id?` recibe multipart con `archivo_certificado` y `logo`. El filtro de archivos acepta los tipos `jpg`, `jpeg`, `png` y `x-pkcs12` en **ambos** campos; cualquier otro se descarta sin error (`callback(null, false)`). Los archivos se renombran a `<uuid>.p12` (certificado) o `<uuid>.<ext>` (imagen) y el nombre original se pierde; el .p12 queda en `static/SRI/FIRMAS` y el logo en `public/images` (`fileFilter.helper.ts`, `fileNamer.helper.ts`, `controller:69-86`). Con archivo nuevo, se borra el anterior si `archivo_certificado_old` no es el texto `null` ni el mismo nombre (`:92-100`).
  2. **Reenvío al microservicio:** al guardar con archivo nuevo, el .p12 se reenvía a `{HOST_API_FACTURACION}/files/upload-signature`; **cualquier fallo se ignora en silencio** (`catch (error) {}`, `companies.service.ts:215-229`). La base guarda el nombre (`archivo_certificado`), la clave (`clave_certificado`, `varchar(300)`, tal cual) y la caducidad (`fecha_caducidad_certificado`, texto ISO) (`entity:112-119`). Sin archivo nuevo, `archivo_certificado` toma el valor de `archivo_certificado_old`, que el panel manda como el texto `null` cuando no hay certificado (`:238-241`; H-30 de `ajs1.md`).
  3. **Autorización:** `POST /companies/:id?` lleva `ServiceTokenGuard`: pasa con la cabecera `x-service-token` igual a `SERVICE_TOKEN` o con un JWT válido en `Authorization: Bearer` (firmado con `JWT_SECRET`), sin comprobar permisos (`controller:69-70`; `deploy/service-token.guard.ts`). `handleExceptions` convierte un error cuyo `response.statusCode` sea 400 en `La clave del certificado es incorrecta`, pero ningún paso del servicio lanza ese 400 (el reenvío al microservicio está silenciado): **el servidor no valida nunca la clave del .p12**. Los demás errores salen como 500 `error server - comunicarse con el admin` (también el 404 `No se encontró ninguna empresa`), salvo claves foráneas y duplicados (`:283-295`) ✅.
  4. **Estado del certificado** (`GET /companies/estado-certificado/:empresa_id`, `@Auth()`): 404 `Empresa no encontrada`; `no_aplica` (la empresa no requiere facturación) devuelve solo `{estado}`; `sin_certificado` (columna `archivo_certificado` vacía; el texto `null` cuenta como cargado); `desconocido` (hay archivo pero la fecha guardada no sirve y no se pudo obtener); `vencido` (días < 0), `por_vencer` (**15 días o menos**, `UMBRAL_DIAS`) y `vigente`; devuelve además `fecha_caducidad` (ISO) y `dias_restantes` (`Math.ceil`: hoy ⇒ 0). Si la fecha guardada no es una fecha válida (p. ej. `false` o vacía) y hay clave, pide la caducidad a `POST {HOST_API_FACTURACION}/certificado/info` (`{nombre_certificado, password}` ⇒ `fechaCaducidad`), la guarda en ISO y sigue; un fallo del microservicio se registra y degrada a `desconocido` (`companies.service.ts:98-203`). Una fecha guardada válida pero equivocada se acepta sin contrastarla con el archivo.
  5. **Banner** (`MainLayout.vue:292-373`): se consulta **una sola vez** al montar el layout y solo si la instalación tiene facturación electrónica activa (`VITE_FACTURACION_ELECTRONICA` distinto de `false/0/no/off`, `useFacturacionElectronica.js`) y `claim.company.requiere_facturacion` del JWT (que no se refresca hasta volver a entrar) es verdadero; un error se ignora. `vencido` → «Tu firma electrónica venció el DD/MM/AAAA. El SRI no autorizará tus facturas hasta que la actualices.» (rojo; sin fecha: «venció.»); `por_vencer` → «Tu firma electrónica vence en N día(s) (DD/MM/AAAA). Renuévala para no interrumpir la facturación.»; `sin_certificado` → «Tu empresa requiere facturación pero no tiene una firma electrónica cargada. Súbela para poder emitir comprobantes.»; `vigente`, `desconocido` y `no_aplica` no pintan nada. Botones **Actualizar firma** (va a `index.empresa` con `empresa_id = claim.company.id`; el guard exige `index.empresa`) y ✕ **Ocultar por hoy** (guarda la fecha en `localStorage['cert-aviso-cerrado:<empresa>']`). ✅
  6. **Quién usa el .p12:** (a) emisión al SRI: la cola envía `archivo_certificado` y `clave_certificado` junto con los datos de la empresa a `POST {HOST_API_FACTURACION}/v1/factura/emision` (`invoice-queue.processor.ts:208-212,303`); (b) firma del ISP en contratos y tickets: `puedeFirmar` exige archivo **y** clave no vacíos, y se envían a `POST {HOST_API_FACTURACION}/firma-pdf/firmar` (`firma-isp.service.ts:55-61,94-118`). El archivo vive en el microservicio; ISPMAX solo envía su nombre y clave. ✅
  7. `DELETE /companies/:id` (`@Auth()`) ignora el `id` recibido: borra la primera empresa que encuentra y elimina del disco su .p12 y su logo (`companies.service.ts:252-272`; la interfaz no lo ofrece).
- **Casos límite y advertencias:** (1) la clave del certificado se guarda tal cual en la columna `clave_certificado` (sin cifrado en la entidad); la API de estado no la devuelve, pero `GET /companies` sí devuelve la fila completa (H-3 de `acc.md`). (2) El aviso depende de que la fecha de caducidad guardada sea correcta; solo se corrige sola cuando es ilegible. (3) Colombia (Factus) y otros países no ven los campos del certificado, pero el aviso se decide por `VITE_FACTURACION_ELECTRONICA` y no por el proveedor: una instalación de Colombia con esa variable sin definir y `requiere_facturacion` activo recibiría `sin_certificado` y el botón **Actualizar firma** abriría una ficha sin campos de certificado (❓ según el `.env` de la instalación). (4) Cambiar solo la clave sin elegir archivo no actualiza la caducidad ni reenvía el archivo.
- **Preguntas probables de usuarios:** ¿por qué me sale el aviso rojo de firma vencida? · ¿cómo subo la nueva firma? (Ajustes → Empresa → Cargar Certificado + Clave Certificado) · ¿el banner se puede ocultar? (por hoy) · ¿por qué dice que la clave es incorrecta y aun así guardó? (el aviso no bloquea el guardado) · ¿por qué el aviso sigue con la fecha vieja después de cambiar la firma? (se reenvía la fecha anterior si la clave no abrió el archivo).
- **Pendiente de validar en UI:** ❓ aspecto del banner; ❓ qué responde el microservicio de facturación cuando no recibió el archivo (servicio externo, ver `Límite de lectura`).

---

## MSG-028 · Pasarelas de Pagos (contenedor, "Cobrar con", Pago Internet)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`. Los cobros, el enlace y el webhook están en COB-018…COB-020; la pestaña **Pago Internet** también en AJS-033.
- **Ruta UI / name:** `/ajustes/pasarelas-pago` · `ajuste.pasarelas-pago` · Ajustes → tarjeta **Pasarelas de Pagos** (`FE:pages/dashboard/ajustes/pasarelas-pago/IndexPage.vue`, `ajustes/IndexPage.vue:443-470`). ✅
- **Archivos:** FE: `pasarelas-pago/IndexPage.vue`, `components/{PayphoneConfig,DlocalGoConfig,PagoInternetConfig}.vue`, `src/composables/usePasarelasPago.js` · BE: `pasarelas-pago/pasarelas-pago.controller.ts:52-167`, `payments-gateway.client.ts`, `disponibilidad.service.ts`, `dto/credenciales.dto.ts`, `settings/entities/setting.entity.ts:95-104`.
- **Para qué sirve:** configurar las plataformas con las que ISPMAX genera el enlace de cobro (tarjeta desde el celular) y elegir cuál usar cuando hay más de una.
- **Acceso:**
  - **Tarjeta:** `index.forma-pago` **o** `index.detalle-forma-pago`, **y** `ajuste.forma-pago` (se reutiliza el permiso de formas de pago, `ajustes/IndexPage.vue:443-455`).
  - **Ruta:** el guard exige `ajuste.pasarelas-pago`, permiso que **no está en ningún catálogo**: solo SUPER-ADMINISTRADOR entra; los demás ven la tarjeta y el guard los devuelve a su primera pantalla (`auth-guard.ts`). ✅
  - **Backend:** `@Auth()` en todo salvo el webhook (MSG-031).
- **Qué ve:** cabecera `Pasarelas de Pagos` con **Volver a ajustes** y **Recargar**; una pestaña por pasarela que reporta el gateway (hoy **PayPhone** y **dLocal Go**, con tilde **Lista para cobrar** solo si el perfil que habilita el cobro por enlace pasó la comprobación) y una pestaña propia **Pago Internet** (icono wifi). Si el servicio de pagos no responde: aviso `No se pudo contactar al servicio de pagos` con el motivo y una pista con los nombres de las variables del servidor a revisar; si responde sin pasarelas: "El servicio de pagos respondió, pero no reportó ninguna pasarela disponible." (`IndexPage.vue:135-322`)
- **Cobrar con** (solo si hay **más de una** pasarela lista): aviso "Hay más de una pasarela lista para cobrar — Los enlaces de cobro se generan con una sola. Elegí con cuál." + selector **Cobrar con**; al elegir guarda `pasarelaPreferida` (`PATCH /settings/:id`) y avisa `Los cobros se harán con <PayPhone|dLocal Go>`; error `No se pudo guardar`. Sin elección se usa la primera por orden alfabético (`disponibilidad.service.ts:119-156`). ✅
- **Pestaña Pago Internet** (`PagoInternetConfig.vue`): chip `Ecuador · Latinoamérica`, botón **Ir a Pago Internet** (tooltip "Desde ahí se hace la afiliación"), campos de solo lectura **URL del sistema** (dominio con el que se abrió ISPMAX, con copiar) y **API key** (oculta, con ojo y copiar; viene de una variable de construcción del frontend: si falta, "No hay API key configurada: definir VITE_PAGO_INTERNET_API_KEY en el .env del front y reiniciarlo." y placeholder `Sin configurar`), y la guía **Cómo afiliarte** en 3 pasos. No guarda nada ni llama al backend; la API key se incrusta en el JavaScript que se entrega al navegador. El cobro de Pago Internet entra por el registro de pagos por HTTP (AUT-014). ✅
- **Reglas de negocio (backend):**
  1. **Las credenciales no se guardan en ISPMAX**: se envían a un servicio externo (payments-gateway) que las cifra; solo se lee qué llaves hay y el veredicto de la última comprobación (`payments-gateway.client.ts:12-17`). El comercio se identifica con un código derivado del dominio del servidor (igual que en la firma, MSG-025) y se crea solo la primera vez, registrando la URL de aviso `<dominio>/api/pasarelas-pago/webhook` y el secreto (`:21-70, 175-236`). ✅
  2. **Disponibilidad** (`GET /pasarelas-pago/disponibilidad`, caché de 60 s, se invalida al guardar, probar o borrar): hay pasarela si al menos una tiene credenciales aceptadas **y habilita el método `payment_link`**. Motivos: `No se pudo contactar al servicio de pasarelas de pago`, `No hay ninguna pasarela de pagos configurada`, el mensaje de rechazo del proveedor, o `Las credenciales cargadas son válidas pero no habilitan el cobro por enlace. En Payphone hace falta una aplicación tipo API.` (`:53-117, 158-175`). ✅
  3. **Borrar** credenciales: el gateway rechaza con `PENDING_PAYMENTS` si quedan cobros sin resolver; el panel muestra la lista y permite **Borrar igual** (`?force=true`) (`controller:144-158`; `PayphoneConfig.vue:225-290`). ✅
  4. El mínimo cobrable lo informa cada pasarela (`montoMinimoCentavos`) y se aplica al generar el enlace (COB-019).
- **Casos límite y advertencias:** (1) pestañas distintas de PayPhone, dLocal Go y Pago Internet no tienen pantalla: se muestra "todavía no hay una pantalla de configuración para ella en ISPMAX". (2) La caché de 60 s puede mantener unos segundos el estado anterior en otras pantallas. (3) `pasarelaPreferida` solo se ofrece con más de una pasarela lista.
- **Preguntas probables de usuarios:** ¿por qué no me deja entrar a Pasarelas de Pagos? (ruta solo SUPER-ADMINISTRADOR) · ¿cómo elijo PayPhone o dLocal Go? (Cobrar con) · ¿qué es Pago Internet? (afiliación de terceros; aquí se copian URL y API key) · ¿por qué no sale el icono del enlace en la factura? (no hay pasarela lista, COB-019).
- **Pendiente de validar en UI:** ❓ aspecto del aviso y del selector; ❓ cómo llegan los pagos de Pago Internet al registro por HTTP.

---

## MSG-029 · PayPhone: credenciales, comprobación y vigencia del enlace
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** `/ajustes/pasarelas-pago` → pestaña **PayPhone** (`FE:…/pasarelas-pago/components/PayphoneConfig.vue`). Acceso como MSG-028. ✅
- **Archivos:** FE: `PayphoneConfig.vue` · BE: `pasarelas-pago.controller.ts:130-167`, `dto/credenciales.dto.ts`, `payments-gateway.client.ts`, `cobros.service.ts:12-30, 285-305`, `settings/entities/setting.entity.ts:95-101`, `settings/dto/create-setting.dto.ts:200-214`.
- **Para qué sirve:** cargar el token y el Store ID de una aplicación **tipo API** de PayPhone (la que habilita el cobro por enlace), comprobarlos y fijar cuántas horas vale el enlace.
- **Qué ve:** bloque **Aplicación tipo API** — "Habilita el cobro por enlace, para enviarle al cliente por WhatsApp." con insignia `Sin configurar`, `Sin verificar` ("Todavía no se comprobó contra Payphone. El cobro por enlace no se ofrece hasta que la comprobación pase."), `Verificada` o `Rechazada` (mensaje del proveedor o "Payphone rechazó estas credenciales") y los métodos que habilita; campos **Token** (oculto con ojo; tooltip "Copialo completo con el botón de copiar de Payphone Developer: son varios cientos de caracteres y cortarlo es el error más común.") y **Store ID** (tooltip "Identificador de la sucursal en Payphone. No es el mismo número que aparece junto al token identificando a la aplicación."); botones **Borrar configuración**, **Probar credenciales** (deshabilitado hasta guardar: tooltip `Guardá las credenciales primero`) y **Guardar**; panel **Dónde conseguir estos datos** (4 pasos: crear una aplicación tipo API en Payphone Developer, copiar el token completo, copiar el Store ID, probar antes de cobrar — la comprobación es de solo lectura). (`:293-559`)
- **Acciones y mensajes (texto exacto):**
  | Acción | Endpoint | Mensajes |
  |---|---|---|
  | **Guardar** | `PUT /pasarelas-pago/config` `{providerId:'payphone', profile:'api', credentials:{token, storeId}, settings:{lang:'es'}}` y luego prueba | falta un dato: `Completá el token y el Store ID`; `Credenciales guardadas`; error `No se pudieron guardar`. El token se borra de la pantalla al guardar |
  | **Probar credenciales** | `POST /pasarelas-pago/probar` | `Payphone aceptó las credenciales` / `Payphone rechazó las credenciales` / `No se pudo comprobar`; detalle por verificación (nombre, mensaje, pista) en un recuadro verde o rojo |
  | **Borrar configuración** | `DELETE /pasarelas-pago/config/payphone/api` | diálogo `Borrar configuración` — "Se eliminan el token y el Store ID de Payphone. El cobro por enlace deja de ofrecerse en las facturas y en los recordatorios hasta que se vuelvan a cargar." (**Borrar** / **Cancelar**); `Configuración eliminada`; si hay cobros abiertos: diálogo `Hay cobros sin resolver` con la lista (referencia, monto, estado, vencimiento) y **Borrar igual** |
  | **Guardar vigencia** | `PATCH /settings/:id {vigenciaEnlacePagoHoras}` | `Vigencia actualizada`; error `No se pudo guardar la vigencia` |
- **Vigencia del enlace de cobro:** campo en **horas** (entero de 1 a 168; error "Un número entero entre 1 y 168 horas"), por omisión **72**; botón **Guardar vigencia** (solo si cambió y es válido). Backend: columna `vigenciaEnlacePagoHoras` (por omisión 72); el DTO rechaza `La vigencia del enlace de pago debe ser un número entero de horas.`, `La vigencia del enlace de pago debe ser de al menos 1 hora.` y `La vigencia del enlace de pago no puede superar 168 horas (7 días).`; al generar el enlace se vuelve a acotar a 1–168 y, si no se puede leer, se usan 72 (`cobros.service.ts:12-30, 289-305`). La pasarela **no permite anular** un enlace emitido: mientras esté vigente cobra el importe con el que se generó aunque se edite la factura (COB-019). ✅
- **Reglas de negocio:**
  1. PayPhone tiene dos perfiles de credenciales: `api` (cobro por enlace) y `web` (Cajita / Botón de Pago). ISPMAX solo usa `api`; los demás perfiles se listan en el aviso **Credenciales que ISPMAX no usa** ("Quedaron de las pruebas de Cajita y Botón de Pago. No habilitan el cobro por enlace y no intervienen en la facturación.") con **Borrar** por perfil (diálogo `Borrar credenciales "<perfil>"`) (`PayphoneConfig.vue:114-116, 247-257, 443-475`). ✅
  2. El idioma se fija en `es` y el código de país no se pide (PayPhone opera en Ecuador).
  3. Guardar no valida nada en el proveedor: la comprobación llama al API de PayPhone (solo lectura) y su veredicto decide si se ofrece el cobro (`lastVerifiedOk`). ✅
- **Casos límite y advertencias:** (1) pegar el token cortado produce un rechazo difícil de diagnosticar. (2) Borrar credenciales con cobros abiertos no los cancela: el seguimiento se retoma solo si se vuelven a cargar **las mismas** credenciales (texto del diálogo). (3) Cambiar la vigencia no afecta enlaces ya emitidos.
- **Preguntas probables de usuarios:** ¿qué tipo de aplicación creo en PayPhone? (tipo API) · ¿dónde pongo las horas del enlace? (Vigencia del enlace de cobro) · ¿por qué dice Rechazada? (token incompleto o Store ID equivocado) · ¿puedo usar la aplicación WEB? (no sirve para el enlace).
- **Pendiente de validar en UI:** ❓ respuesta real de la comprobación; ❓ qué métodos muestra el chip.

---

## MSG-030 · dLocal Go: credenciales, país y ambiente de pruebas
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** `/ajustes/pasarelas-pago` → pestaña **dLocal Go** (`FE:…/pasarelas-pago/components/DlocalGoConfig.vue`). Acceso como MSG-028. ✅
- **Archivos:** FE: `DlocalGoConfig.vue` · BE: `pasarelas-pago.controller.ts:130-167`, `dto/credenciales.dto.ts` (`settings` y `isSandbox`), `aplicar-pago.service.ts:21-27`.
- **Para qué sirve:** habilitar el cobro por enlace con dLocal Go (Perú, Bolivia, Colombia, México y más).
- **Campos:**
  | Etiqueta | Tipo | Obligatorio | Valores / notas |
  |---|---|---|---|
  | API Key | texto | Sí | si ya hay credenciales: placeholder "Ya hay credenciales guardadas. Escribí unas nuevas para reemplazarlas." |
  | Secret Key | texto oculto con ojo | Sí | tooltip "Además de autenticar, firma las notificaciones de pago. Copiala completa." |
  | País desde el que se cobra | selector | Sí | Perú (PE), Bolivia (BO), Colombia (CO), México (MX), Ecuador (EC), Argentina (AR), Brasil (BR), Chile (CL), Costa Rica (CR), Guatemala (GT), Paraguay (PY), Uruguay (UY); tooltip "Define la moneda y los medios de pago que se le ofrecen al cliente. Sin esto, dLocal le pregunta el país al pagador — que para un cliente de internet no tiene sentido." Se guarda en `settings.country` |
  | Ambiente (interruptor) | toggle | — | `Ambiente de producción` ("Los cobros son reales.") o `Ambiente de PRUEBAS` ("Los cobros no mueven dinero real."); en pruebas: "Las credenciales salen de una cuenta distinta: dashboard-sbx.dlocalgo.com. Las de tu cuenta normal no funcionan acá." Se guarda como `isSandbox` |
  Insignia de estado, **Borrar configuración**, **Probar credenciales** y **Guardar** como en MSG-029; panel **Dónde conseguir estos datos** (panel de dLocal Go → Configuración → Desarrolladores → Integración; "Son dos claves distintas y las dos hacen falta. Fijate de qué ambiente son"; elegir el país; probar antes de cobrar). (`:2-33, 158-410`)
- **Mensajes (texto exacto):** `Completá la API Key y la Secret Key`; `Elegí el país desde el que se cobra`; `Credenciales guardadas`; `dLocal Go aceptó las credenciales` / `dLocal Go rechazó las credenciales`; `No se pudo comprobar`; diálogo `Borrar configuración` — "Se eliminan las credenciales de dLocal Go. El cobro por enlace deja de ofrecerse hasta que se vuelvan a cargar."; `Configuración eliminada`; `No se pudo borrar`. Estados: `Sin configurar`, `Sin verificar` ("Todavía no se comprobó contra dLocal Go. El cobro por enlace no se ofrece hasta que la comprobación pase."), `Verificada`, `Rechazada` ("dLocal Go rechazó estas credenciales" o el mensaje del proveedor).
- **Reglas de negocio:** (1) perfil `default`; (2) al recargar la configuración se rellenan el país y el ambiente guardados (no son secretos) (`:68-71`); (3) el sandbox es otro servidor con cuenta propia: mezclar credenciales produce `Invalid Credentials`; (4) al cobrar, el pago se asienta con operador `dLocal Go` y detalle de forma de pago `DLOCAL GO` (MSG-034). ✅
- **Casos límite y advertencias:** guardar con el ambiente equivocado deja las credenciales "Rechazadas"; el país elegido define la moneda del cobro, no la de la factura (COB-019 compara contra el mínimo de la pasarela).
- **Preguntas probables de usuarios:** ¿qué país elijo? (el de la operación del ISP) · ¿por qué me dice Invalid Credentials? (ambiente de pruebas con claves de producción o al revés) · ¿cobra dinero real en pruebas? (no).
- **Pendiente de validar en UI:** ❓ lista de métodos que reporta el gateway; ❓ comportamiento fuera de los 12 países de la lista.

---

## MSG-031 · Webhook de pasarelas y asiento automático del pago (configuración)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`. El flujo completo de cobro (pantalla de control, enlace, anulaciones) está en COB-018…COB-020 y COB-023; aquí lo que depende de la configuración.
- **Ruta UI / name:** `POST /api/pasarelas-pago/webhook` (sin pantalla; lo llama el payments-gateway). ✅
- **Archivos:** BE: `pasarelas-pago/pasarelas-pago.controller.ts:28-40, 207-221`, `pasarelas-pago.service.ts:8-241`, `aplicar-pago.service.ts:8-135`, `dto/webhook-pago.dto.ts`, `payments-gateway.client.ts:175-236`, `registro-pagos/registrar-abono.service.ts:976-1075`.
- **Autenticación:** sin JWT; firma HMAC-SHA256 del cuerpo crudo con `x-gateway-signature` (`sha256=` + HMAC de `"{timestamp}.{cuerpo}"`), `x-gateway-timestamp` a ±300 s y `x-gateway-delivery` para trazabilidad. Errores 401: `PAYMENTS_GATEWAY_WEBHOOK_SECRET no está configurado: el webhook está deshabilitado`, `No se recibió el cuerpo crudo…`, `Faltan las cabeceras de firma`, `El aviso tiene un timestamp fuera de la ventana permitida (Ns)`, `Firma inválida`. A diferencia del aviso de firma de contratos (MSG-026), **sin secreto el webhook de pagos queda cerrado**. ✅
- **Cómo se configura:** al guardar la primera credencial, ISPMAX crea el comercio en el gateway y le registra `notificationUrl = <DOMINIO>/api/pasarelas-pago/webhook` y el secreto compartido; sin dominio configurado se registra una advertencia y los cobros "quedarán pagados pero sin asentar en la factura"; si el secreto del servidor no coincide con el del gateway, "la notificación llega y se descarta en silencio" (comentarios del código) (`payments-gateway.client.ts:175-236`). ✅
- **Qué hace por evento:** `payment.approved` → aplica el pago; `payment.duplicated` → solo alerta; otros → acuse de recibo. Mapa de datos del aviso → abono (`aplicar-pago.service.ts:45-77`): factura = `metadata.pagoId`; monto = `amountCents / 100`; N° de transacción y clave de idempotencia = código de autorización, o id de transacción del proveedor, o `paymentId`; forma de pago **`PASARELA DE PAGO`** (código SRI `20`); detalle **`PAYPHONE`** o **`DLOCAL GO`**; nota `Cobro PayPhone` / `Cobro dLocal Go`; operador = nombre de la pasarela; el excedente pasa a favor. Con `metadata.grupoComprobante` confirma todas las órdenes del comprobante agrupado. ✅
- **Alertas al panel** (evento global por WebSocket): `Pago recibido pero NO registrado` (no se pudo aplicar: aplicar a mano), `Pago registrado sin comprobante` (no salió el comprobante electrónico) y `El cliente pagó dos veces el mismo enlace` (detalle "Se registró N cobro(s) de más sobre este enlace. El abono de la factura está bien; hay que devolver o acreditar la diferencia."). Si no hay servidor de WebSocket configurado, no se avisa. (`pasarelas-pago.service.ts:47-66, 117-240`) ✅
- **Reglas de negocio:** (1) los avisos repetidos se descartan con una lista **en memoria** (se pierde al reiniciar y no se comparte entre instancias); la idempotencia real descansa en la clave del abono (`:19-32`). (2) El aviso se marca como procesado antes de aplicarlo; ante un error al aplicar se responde 200 `{received:true, aplicado:false, motivo:'error'}` para que el gateway no reintente (`:117-209`). (3) Una pasarela con otro nombre se asienta con su identificador (`nombreDe`). ✅
- **Casos límite y advertencias:** (1) pagos sin `metadata.pagoId` no se asientan solos (`sin-pagoId`). (2) La forma de pago `PASARELA DE PAGO` y su detalle se crean solos la primera vez (MSG-034). (3) Si el backend estuvo caído y el gateway agotó los reintentos, el cobro se resuelve desde **Cobros por pasarela** (COB-018).
- **Preguntas probables de usuarios:** ¿por qué el cliente pagó y la factura sigue pendiente? (COB-018: Registrar este cobro) · ¿quién aparece como operador? (PayPhone / dLocal Go) · ¿qué forma de pago queda? (PASARELA DE PAGO).
- **Pendiente de validar en UI:** ❓ comportamiento con varias instancias del backend; ❓ aspecto de las alertas permanentes.

---

## MSG-032 · Formas de pago (Ajustes › Formas de pagos › "Formas de pago")
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** `/ajustes/forma-pago` · `ajuste.forma-pago` · Ajustes → tarjeta **Formas de pagos** → pestaña **Formas de pago** (`FE:pages/dashboard/ajustes/formas-pago/IndexPage.vue`, `pages/dashboard/formas-pago/IndexPage.vue`). ✅
- **Archivos:** FE: `ajustes/formas-pago/IndexPage.vue`, `formas-pago/{IndexPage,AddRol,EditRol}.vue`, `formas-pago/components/FormFormaPago.vue`, `formas-pago/composables/useFormaPago.js`, `src/composables/usePais.js:107-136` · BE: `forma-pago/forma-pago.controller.ts`, `forma-pago.service.ts`, `dto/create-forma-pago.dto.ts`, `entities/forma-pago.entity.ts`.
- **Para qué sirve:** catálogo de las formas con que se cobra (efectivo, transferencia, tarjeta…); cada una lleva el **código fiscal** que viaja al comprobante electrónico.
- **Acceso:** tarjeta con `index.forma-pago` o `index.detalle-forma-pago` y `ajuste.forma-pago`; la ruta `ajuste.forma-pago` sí existe en el catálogo (grupo "Configurar formas pago"). Pestaña con `index.forma-pago`. Acciones: `crear.forma-pago`, `editar.forma-pago`, `activar.inactivar.forma-pago`, `eliminar.forma-pago`. El backend solo exige sesión. ✅
- **Listado** (título "Listado de formas de pagos"): columnas **#**, **Nombre**, **Detalle** (descripción del código; si el código no está en el catálogo del país, se muestra el código tal cual), **Estado** (`Activo`/`Inactivo`), **Acciones**; buscador **Buscar...**; vacío `No se encontró registros`. Botón **Agregar Forma de Pago** (oculto en pantallas pequeñas; el botón flotante `+` del móvil apunta a una variable inexistente y no abre el formulario). (`IndexPage.vue:7-13, 104-298`) ✅
- **Acciones por fila:** activa → lápiz **Editar** y ✕ **Desactivar**; inactiva → ✓ **Activar** y papelera **Eliminar**. Es decir, **solo se puede eliminar una forma inactiva** y **solo se puede editar una activa**. Cambiar el estado: `PATCH /forma-pago/:id {isActive}` → `Se actualizo el estado`. (`:186-263`)
- **Campos del formulario** (`Agregar forma de pago` / `Editar forma de pago`):
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Nombre: | texto | Sí | `Debes completar este campo`; se envía en MAYÚSCULAS; columna de 60 caracteres | sin control de duplicados |
  | Codigo forma de pago: | selector | Sí | catálogo del país (ver abajo); columna de 60 | **Ecuador (SRI):** `SIN UTILIZACION DEL SISTEMA FINANCIERO` 01, `COMPENSACIÓN DE DEUDAS` 15, `TARJETA DE DÉBITO` 16, `DINERO ELECTRÓNICO` 17, `TARJETA PREPAGO` 18, `TARJETA DE CRÉDITO` 19, `OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO` 20, `ENDOSO DE TÍTULOS` 21. **Colombia:** Efectivo 10, Consignación 42, Transferencia 47, Cheque 20, Tarjeta Débito 49, Tarjeta Crédito 48, Bonos 71, Vales 72, Medio de pago no definido 1. Otros países usan el de Ecuador |
  Botón **Guardar** / **Editar**; éxito `Forma de pago agregado exitosamente` / `Forma de pago editado exitosamente`; error: mensaje del backend. (`FormFormaPago.vue`; `useFormaPago.js:37-81`; `usePais.js:107-136`)
- **Reglas de negocio (backend):**
  1. Crear/editar no valida el código contra el catálogo ni la unicidad del nombre (`forma-pago.service.ts:21-25, 67-81`; DTO `nombre` y `codigo_forma_pago` texto obligatorio, `company_id` UUID obligatorio). ✅
  2. **Eliminar** (`remove`, `:83-129`): confirmación `Confirmar` — "Estas seguro de eliminar la forma de pago: <nombre>" (**Eliminar** / **Cancelar**); rechazos 400: `No es posible eliminar esta forma de pago, se encuentra en uso en pagos registrados.` (algún abono vigente la usa) y `No es posible eliminar esta forma de pago, tiene detalles asociados. Eliminá primero los detalles desde la pestaña "Detalle formas pago".`; éxito `Registro eliminado exitosamente`. El borrado es físico (no hay `deleted_at`). ✅
  3. `GET /forma-pago` devuelve todas (activas e inactivas) de la empresa del encabezado `company-id`; `GET /forma-pago/true` devolvería solo las activas, pero el frontend pide siempre la lista completa y filtra en pantalla (Registrar pago filtra las inactivas; Ventas y Conciliación no) (MSG-034). ✅
- **Casos límite y advertencias:**
  - **Guardar sin elegir el código no muestra ningún mensaje**: al crear, el formulario se reinicia sin la clave `codigo_forma_pago` y la validación falla con un error de programa al leer su longitud (`useFormaPago.js:29-50`: reinicia `{nombre, codigo, empresa}` pero valida `codigo_forma_pago`, y `validaciones` no tiene esa clave). El botón parece no hacer nada ❓ (confirmar en la UI).
  - `GET /forma-pago/:id` choca con la ruta `:estado?` (se evalúa primero) y responde 400 de validación: la ruta de detalle por UUID no se usa (`forma-pago.controller.ts:18-29`).
  - El código fiscal se lee de la forma al emitir el comprobante de cada pago (`PayComponent.vue:456`): cambiar el código de una forma afecta a los comprobantes que se emitan después.
- **Preguntas probables de usuarios:** ¿cómo agrego "Transferencia"? (Agregar Forma de Pago, nombre y código 20 u otro según su contador) · ¿por qué no puedo eliminar? (está en uso: inactivarla) · ¿por qué no me deja editar? (solo las activas) · ¿qué código elijo para efectivo? (`SIN UTILIZACION DEL SISTEMA FINANCIERO`, 01).
- **Pendiente de validar en UI:** ❓ comportamiento de Guardar sin código; ❓ aspecto del selector con el chip del código.

---

## MSG-033 · Detalle de formas de pago (bancos y cuentas)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** `/ajustes/forma-pago` → pestaña **Detalle formas pago** (`FE:pages/dashboard/detalle-formas-pago/IndexPage.vue`). ✅
- **Archivos:** FE: `detalle-formas-pago/{IndexPage,AddRol,EditRol}.vue`, `components/FormFormaPago.vue`, `composables/useFormaPago.js` · BE: `detalle-forma-pago/detalle-forma-pago.controller.ts`, `detalle-forma-pago.service.ts`, `dto/create-detalle-forma-pago.dto.ts`, `entities/detalle-forma-pago.entity.ts`.
- **Para qué sirve:** subdividir una forma de pago en canales concretos (un banco, una cuenta, un recaudador). Es lo que luego se elige en **Registrar pago** y lo que usa la conciliación bancaria.
- **Acceso:** pestaña con `index.detalle-forma-pago`; acciones `crear.|editar.|activar.inactivar.|eliminar.detalle-forma-pago`. Backend: solo sesión. ✅
- **Listado** ("Listado detalle formas de pagos"): columnas **#**, **Nombre**, **Forma de pago**, **Estado**, **Acciones**; botón **Agregar detalle**; buscador **Buscar...**. Igual que en MSG-032: editar y desactivar solo en filas activas; activar y eliminar en inactivas. (`IndexPage.vue:7-13`)
- **Campos** (`Agregar Detalle` / `Editar Detalle`): **Nombre:** (texto, se envía en MAYÚSCULAS, columna de 60) y **Forma de pago:** (selector con **todas** las formas de la empresa, activas e inactivas), ambos obligatorios (`Debes completar este campo`). Éxito `Detalle forma de pago agregado exitosamente` / `Detalle forma de pago editado exitosamente`. (`FormFormaPago.vue`; `useFormaPago.js:102-151`)
- **Reglas de negocio (backend):**
  1. El listado trae el detalle con su forma de pago (`relations: forma_pago_id`) filtrado por la empresa del encabezado `company-id` (`detalle-forma-pago.service.ts:27-44`). ✅
  2. **Eliminar** (`:82-99`): confirmación "Estas seguro de eliminar el detalle forma de pago: <nombre>"; rechazo 400 `No es posible eliminar este detalle de forma de pago, se encuentra en uso en pagos registrados.` si algún abono vigente lo usa; si no, borrado físico. ✅
  3. Los detalles pueden crearse solos: un pago automático (pasarelas, registro por HTTP) crea el detalle por nombre si no existe, activo (MSG-034). ✅
- **Casos límite y advertencias:** (1) editar un detalle no cambia el nombre ya guardado en los pagos históricos (cada abono guarda el nombre y el id). (2) Mover un detalle a otra forma de pago cambia en qué lista aparece al registrar pagos nuevos. (3) No hay control de nombres repetidos.
- **Preguntas probables de usuarios:** ¿cómo agrego mi cuenta del Banco Pichincha? (Agregar detalle: nombre y forma de pago "TRANSFERENCIA") · ¿para qué sirve el detalle? (elegir la cuenta al cobrar y conciliar) · ¿por qué no puedo eliminar un detalle? (hay pagos que lo usan: inactivarlo).
- **Pendiente de validar en UI:** ❓ aspecto del selector de forma de pago; ❓ efecto de cambiar la forma de pago de un detalle ya usado.

---

## MSG-034 · Uso de formas de pago al registrar pagos y en cobros automáticos
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`. Estado `completo` en el lado del catálogo; el registro del pago es COB-002/COB-003.
- **Dónde se usan:**
  | Lugar | Qué ofrece | Cita |
  |---|---|---|
  | **Registrar pago** (formulario de cobro) | **Forma de pago:** (obligatoria, `Debes completar este campo`) y **Detalle Forma de pago:** (opcional, `Ninguno` por omisión, filtrado por la forma elegida); solo formas y detalles **activos** | `FE:composables/useFormPago.js:3, 51-96, 112-120`; `registrar-pago/components/PayComponent.vue:610-662` |
  | **Editar un pago ya registrado** | conserva la forma/detalle del pago aunque estén inactivos y los rotula `(inactivo)` | `FE:composables/useFacturacion.js:153-190` |
  | **Ventas** (nueva factura) | todas las formas de pago de la empresa, **incluidas las inactivas**, con su código | `FE:pages/dashboard/ventas/AddVenta.vue:248-253` |
  | **Ingresos y egresos** | formas de pago **activas** (`GET /ingresos-egresos/formas-pago`: solo id y nombre, sin filtrar por empresa) | `FE:pages/dashboard/ingresos-egresos/composables/useIngresoEgreso.js:345-348`; `BE:ingresos-egresos/ingresos-egresos.service.ts:604-609` |
  | **Conciliación bancaria** | lista todas las formas y detalles (bancos) para elegir contra qué se concilia | `FE:pages/dashboard/conciliacion-bancaria/composables/useConciliacion.js:126-140` |
  | **Facturación automática** | cada configuración guarda forma y detalle de pago; la factura usa el código SRI de la forma (`01` si no hay) | `BE:facturacion-automatica/facturacion-automatica.service.ts:257-264, 312, 463` |
  | **Cobros automáticos** (pasarelas y registro de pagos por HTTP) | crean la forma y el detalle por nombre si no existen | `BE:registro-pagos/registrar-abono.service.ts:976-1075` |
- **Reglas de negocio:**
  1. **Activas/inactivas:** al registrar un pago nuevo solo se ofrecen formas y detalles activos; inactivar una forma no toca los pagos históricos (cada abono guarda el id y el nombre de la forma y del detalle) (`useFacturacion.js:153-190`). ✅
  2. **Código fiscal:** el código de la forma elegida viaja al comprobante electrónico (`forma_pago: codigo` en el pago, `PayComponent.vue:317-334, 456`). ✅
  3. **Cobros automáticos** (`resolverFormaPago`, `registrar-abono.service.ts:976-1075`): si el origen manda `forma_pago_id` la usa; si manda solo el nombre, la busca por nombre (mayúsculas) en la empresa y, **si no existe, la crea activa** con el código SRI válido que le indiquen (si no es uno de los códigos de la tabla 24 del SRI, usa el genérico); si existe con un código que el SRI no reconoce, **lo corrige**; igual con el detalle por nombre. Las pasarelas usan `PASARELA DE PAGO` (código `20`) y los detalles `PAYPHONE` / `DLOCAL GO` (MSG-031). Sin empresa deducible: 404 `No se pudo determinar la empresa de la factura N° <n>. Crear manualmente la forma de pago "<nombre>" y reintentar.` ✅
  4. Una forma creada así queda en el catálogo y se puede editar, inactivar o eliminar como cualquier otra; si se inactiva, el siguiente cobro automático la sigue usando (se busca por nombre sin mirar el estado). ✅
  5. **Ventas:** con total mayor a 50 y forma `01` (código "SIN UTILIZACION DEL SISTEMA FINANCIERO") bloquea con el mensaje `La factura supera los $500.00, debes elegir otra forma de pago`; el umbral del código es **50**, no 500 como dice el texto (`AddVenta.vue:139-143`) ✅ (ver hallazgo).
- **Casos límite y advertencias:** (1) si todas las formas están inactivas, Registrar pago no ofrece ninguna y no deja guardar. (2) Un detalle nuevo creado por un cobro automático aparece en el catálogo con el nombre en mayúsculas. (3) En Colombia el catálogo de códigos es otro (MSG-032).
- **Preguntas probables de usuarios:** ¿por qué mi forma de pago no sale en Registrar pago? (inactiva o sin detalle: el detalle es opcional) · ¿qué es "PASARELA DE PAGO"? (la forma que crean solos los cobros por enlace) · ¿puedo borrar PASARELA DE PAGO? (solo si no tiene pagos ni detalles; se vuelve a crear con el siguiente cobro).
- **Pendiente de validar en UI:** ❓ cómo se ve `(inactivo)` en la edición de un pago; ❓ qué muestra Ventas con total entre 50 y 500.

## Hallazgos del dominio (cierre de lectura: MSG-023, MSG-026, MSG-027)

- Cierre MSG-023: el paso a `Finalizado` ocurre el mismo día de la fecha fin (se compara `new Date('AAAA/MM/DD')` a las 00:00 con la hora actual) y también alcanza a los contratos `Anulado` ✅ `FE:clientes/composables/useContratos.js:68-78`. `getContrato` está definido y no se usa (código muerto) ✅ `useContratos.js:89-97`.
- Cierre MSG-023: sin `servicio` el servidor devuelve los 10 contratos más recientes de todos los clientes; el panel manda `servicio: serviceClientSelected || null` ✅ `BE:contratos/contratos.service.ts:122-124`, `FE:useContratos.js:62-66` (❓ si la pestaña puede abrirse sin servicio).
- Cierre MSG-026: si el contrato ya tenía un documento en **Documentos**, el trámite firmado no crea el documento ni pasa el contrato a `Activo` ni fija la fecha de firma (el PDF firmado queda solo en el trámite). `docs/guia/firma-electronica.mdx` (tabla «Firmado electrónicamente») y `docs/tareas/clientes/enviar-un-contrato-a-firmar.mdx` (fila «Firmado electrónicamente») lo presentan como automático sin esa excepción ✅ `BE:contratos/firma/contratos-firma.service.ts:277-282`.
- Cierre MSG-026: la fecha de firma es la fecha UTC del servidor (`toISOString`) ✅ `contratos-firma.service.ts:290,307` (igual al subir un documento a mano, `contratos-archivos.service.ts:60`). `agregadoPorProveedor` no se escribe en ningún lado: la etiqueta «agregado por el proveedor» del diálogo no puede aparecer ✅ `BE:firma-electronica/firma-tramites.service.ts:449-461`. Un aviso con firma HMAC inválida responde igualmente `200 {recibido:true, aplicado:false}` ✅ `contratos-firma.controller.ts:96-112`.
- Cierre MSG-027: la validación del .p12 en el navegador no impide guardar y el servidor nunca valida la clave; con una clave errónea se guardan archivo y clave y la fecha de caducidad conserva la anterior ✅ `FE:empresas/composables/useEmpresa.js:203,233`, `BE:companies/companies.service.ts:215-229`. `docs/guia/roles-empresa.mdx` (fila «Clave Certificado») solo dice que se muestra *La contraseña del certificado esta incorrecta*, sin aclarar que el guardado continúa.
- Cierre MSG-027: el aviso de firma se decide con `VITE_FACTURACION_ELECTRONICA` y no con el proveedor: una instalación de Colombia con la variable sin definir puede recibir `sin_certificado` aunque la ficha no muestre campos de certificado ✅ `FE:layouts/MainLayout.vue:295-309`, `FE:composables/useFacturacionElectronica.js` (❓ según el `.env`). `docs/guia/primeros-pasos.mdx` («Aviso de firma electrónica») no menciona esa condición ni el umbral de 15 días.

