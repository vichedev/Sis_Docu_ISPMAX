# Inventario POR — Portal del cliente
> Alcance: FE `pages/portal-cliente/**`, `pages/sesion/RestablecerPassword.vue`, `stores/auth-cliente.ts`, `router/portal-guard.ts`, `router/routes.ts` (rutas `/portal/*`), `pages/dashboard/portal-pagos/**`, `pages/dashboard/tickets/{SolicitudesPortalPage,SolicitudPortalPage}.vue` (+ `components/AccionesSolicitudPortal.vue`, `composables/solicitudPortal.js`, `ListRespuestas.vue`), `pages/dashboard/instalaciones/components/{FormInstalaciones,ListRespuestasInstalacion}.vue`, `pages/dashboard/clientes/components/modals/ModalCredencialesPortal.vue`, `pages/dashboard/ajustes/{cobros-promesas,ticket}/**`, `pages/dashboard/promesas-pago/IndexPage.vue` · BE `portal/**`, `respuestas-tickets/**`, `respuestas-instalaciones/**`, `promesas-pago/promesas-pago.service.ts` (partes del portal), `ticket/ticket.service.ts` (`avisarClienteEnCamino`), `ticket/bot/**` (en camino), `common/utils/documento.ts`; migraciones `Portal*`, `TicketMensajesCliente`, `TicketPlantillaEnCamino`, `InstalacionDesdeTicketYPortal`, `InstalacionMensajesCliente`, `PromesaSolicitudCliente`. Generado desde el código del 2026-11-04 (BE `f0d1ebf7`, FE `e7d5d06b`).

> Convención de citas: `FE:` = `frontend-isp-main/src/…`, `BE:` = `backend-isp-main/src/…`. ✅ = leído en código. Nada está marcado 🖥️.

> **Nota transversal:** el cliente se autentica con `@AuthCliente()` (estrategia `jwt-cliente`, JWT con `type: 'cliente'`); las rutas del panel que usa este dominio usan `@Auth()` (sesión de personal válida) sin permiso por funcionalidad en el backend. Los permisos (`portal-pagos.index`, `tickets.index`, `cliente.portal.credenciales`…) se aplican en el menú, el botón y la ruta del frontend. ✅ `BE:portal/auth/decorators/auth-cliente.decorator.ts:4-8`, `BE:auth/decorators/auth.decorator.ts`.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| POR-001 | Inicio de sesión del portal del cliente | `/portal/login` · `portal.login` | ninguno (público) | completo |
| POR-002 | Recuperar y restablecer la contraseña por correo | `/portal/login` (diálogo) · `/portal/restablecer-password` | ninguno (público) | completo |
| POR-003 | Estructura del portal, sesión y cambio obligatorio de la clave temporal | `/portal/*` · `PortalClienteLayout` | sesión de cliente | completo |
| POR-004 | Inicio del portal: estado de cuenta | `/portal` · `portal.inicio` | sesión de cliente | completo |
| POR-005 | Facturas del cliente: lista, filtros y descarga de comprobantes | `/portal/facturas` · `portal.facturas` | sesión de cliente | completo |
| POR-006 | Pagar una factura: en línea, transferencia o comprobante | `/portal/facturas/:id/pagar` · `portal.facturas.pagar` | sesión de cliente | completo |
| POR-007 | Promesa de pago pedida por el cliente | botón **Promesa** en `/portal/facturas` | sesión de cliente; ajuste de empresa | completo |
| POR-008 | Consumo y prueba de velocidad | `/portal/consumo` · `portal.consumo` | sesión de cliente | completo |
| POR-009 | Contratos del cliente | `/portal/contratos` · `portal.contratos` | sesión de cliente | completo |
| POR-010 | Soporte: lista de solicitudes y nueva solicitud (problema o instalación) | `/portal/tickets` · `portal.tickets` | sesión de cliente | completo |
| POR-011 | Detalle de una solicitud o ticket y conversación | `/portal/tickets/:id` · `/portal/tickets/ticket/:id` | sesión de cliente | completo |
| POR-012 | Perfil del cliente, avatar y cambio de contraseña | `/portal/perfil` · `portal.perfil` | sesión de cliente | completo |
| POR-013 | Acceso al portal desde la ficha del cliente (enviar credenciales) | Clientes → acción **Acceso al portal** | `cliente.portal.credenciales` | completo |
| POR-014 | Pagos del portal: bandeja de comprobantes | `/portal-pagos` · `portal-pagos.index` · Finanzas → Pagos del portal | `portal-pagos.index` | completo |
| POR-015 | Validar o rechazar un comprobante del portal | modal **Comprobante** en `/portal-pagos` | `portal-pagos.index` (+ cobro con el modal de pago) | completo |
| POR-016 | Solicitudes del portal: bandeja y detalle | `/tickets/portal` · `/tickets/portal/:id` | `tickets.index` | completo |
| POR-017 | Atender una solicitud: completar como ticket, crear instalación o rechazar | `/tickets/add?solicitud=` · `/instalaciones/add?solicitud=` | `tickets.add` / `instalaciones.add` | completo |
| POR-018 | Mensajes del cliente y respuestas del personal en tickets e instalaciones | **Listado de respuestas** del ticket y de la instalación | `tickets.edit` / `instalaciones.edit` | completo |
| POR-019 | Promesas pedidas desde el portal: ajuste de la empresa y origen | Ajustes → Cobros y promesas · `/promesas-pago` | `ajuste.cobros` o `bot.config.promesas` | completo |
| POR-020 | Mensaje del técnico en camino (Ajustes → Plantillas → Tickets) | Ajustes → Plantillas → Tickets → pestaña **Mensaje técnico en camino** | `variables.ver.plantilla.ticket`; `variables.edita.plantilla.ticket` | completo |

---

## POR-001 · Inicio de sesión del portal del cliente
- **Ruta UI / name:** `/portal/login` · `portal.login`. Misma dirección del panel; el cliente recibe el enlace por correo o WhatsApp (POR-013). ✅ `FE:router/routes.ts:527-531`.
- **Archivos:** FE: `pages/portal-cliente/Login.vue`, `router/portal-guard.ts`, `stores/auth-cliente.ts`, `pages/portal-cliente/composables/usePortalApi.js` · BE: `portal/portal.controller.ts`, `portal/portal.service.ts`, `portal/auth/dto/login-portal.dto.ts`.
- **Para qué sirve:** el cliente entra con su cédula (o el correo de la ficha) y su clave.
- **Acceso:** público. Con sesión válida, `/portal/login` redirige a `/portal` (`FE:router/portal-guard.ts:26-27`); sin sesión, cualquier `/portal/*` con `requiresPortalAuth` redirige al login (`:23-24`). ✅
- **Botones y campos:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Usuario (placeholder "Tu cédula") | escribe la cédula o el correo | público | — | obligatorio, mín. 5 y máx. 100 caracteres (`BE:portal/auth/dto/login-portal.dto.ts:5-8`) |
  | Contraseña (placeholder "••••••••") | clave | público | — | obligatoria, mín. 6 y máx. 50 (`login-portal.dto.ts:10-13`) |
  | Iniciar sesión | entra al portal | público | `POST /portal/auth/login` | guarda el token y los nombres; marca `ultimo_acceso` (`BE:portal/portal.service.ts:96`) |
  | ¿Olvidaste tu contraseña? | abre el diálogo de POR-002 | público | — | `FE:pages/portal-cliente/Login.vue:219` |
- **Reglas (backend):**
  - Puede entrar quien no sea consumidor final (`tipo_documento = '07'`), no esté eliminado y tenga al menos un servicio no retirado (`deleted = false`; activo o suspendido). `BE:portal/portal.service.ts:53-61`. ✅
  - El usuario se compara con `numero_documento` (mayúsculas, sin espacios) o con el correo (minúsculas); si coincide con varios clientes gana el que coincida con la clave. `BE:portal/portal.service.ts:67-91`. ✅
  - Sin fila en `portal_credenciales` (nunca se enviaron credenciales ni se restableció la clave) no hay clave que coincida. `:81-90`. ✅
  - La clave se recorta (`trim`) antes de comparar. `:86`. ✅
  - El token no tiene vencimiento configurado (`expiresIn` comentado). `BE:auth/auth.module.ts:29-30`. ✅
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** *Usuario o contraseña incorrectos* (`BE:portal/portal.service.ts:94`); *El usuario es obligatorio*, *La contraseña es obligatoria* (`FE:Login.vue:17-18`); *No se pudo iniciar sesión* (`:88`). Pie: *¿No tienes tus credenciales? Solicítalas a tu proveedor.* (`:235`). Título: *Portal del cliente* / *Bienvenido de nuevo* / *Ingresa con el usuario y la clave que te enviamos.* (`:172-174`).
- **Relaciones con otros módulos:** clientes (documento, correo, servicios), POR-013 (credenciales).
- **Casos límite:** un cliente retirado o sin servicios no entra aunque tenga clave; una sesión abierta cuyo cliente deja de estar habilitado recibe 401 *Acceso no disponible, hable con su proveedor* y el portal cierra la sesión (`BE:portal/auth/strategies/jwt-cliente.strategy.ts:20-28`, `FE:composables/usePortalApi.js:17-26`). ✅

## POR-002 · Recuperar y restablecer la contraseña por correo
- **Ruta UI / name:** diálogo **Recuperar acceso** en `/portal/login`; pantalla `/portal/restablecer-password` · `portal.restablecer-password` (`FE:router/routes.ts:17-20`). ✅
- **Archivos:** FE: `pages/portal-cliente/Login.vue:84-135`, `pages/sesion/RestablecerPassword.vue` (misma pantalla del panel; `esPortal` por ruta) · BE: `portal/portal.service.ts:105-182`, `portal/auth/dto/recuperar-password-portal.dto.ts`, plantilla `auth/plantillas/recuperar-password.hbs`.
- **Para qué sirve:** el cliente pide un enlace por correo y define una clave nueva.
- **Acceso:** público; límite por IP: 3 pedidos por minuto para el enlace y 5 por minuto para restablecer (`BE:portal/portal.controller.ts:27,33`). ✅
- **Botones y campos:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Usuario (tu cédula) | cédula del cliente | público | — | solo cédula (no correo) para recuperar (`portal.service.ts:108`) |
  | Enviar enlace | envía el correo | público | `POST /portal/auth/recuperar-password` | el enlace vence en 15 minutos (`:119`) |
  | Entendido | cierra el aviso *Revisa tu bandeja* | público | — | muestra el correo enmascarado |
  | Nueva contraseña / Confirmar contraseña | define la clave | público | `POST /portal/auth/restablecer-password` | mín. 8, máx. 50 (`recuperar-password-portal.dto.ts:15-18`); no puede ser igual al documento (`portal.service.ts:153`) |
  | Guardar contraseña | guarda y redirige al login en 3 s | público | idem | borra el token del caché (`:169`) |
- **Reglas (backend):** el correo sale a la dirección de la ficha del cliente, con enlace `…/portal/restablecer-password?token=…&exp=…`; si el cliente no tenía fila en `portal_credenciales`, se crea con `debe_cambiar = false`. `BE:portal/portal.service.ts:116-171`. ✅ El correo sale por `sendDesdeSistema` (`:131`). ✅
- **Efectos secundarios externos:** correo (SMTP del sistema). Caché (token 15 min).
- **Mensajes de error/éxito (texto exacto):** *No existe una cuenta registrada con esa cédula* (404, `:111`); *Tu cuenta no tiene un correo registrado, contacta a tu proveedor* (`:114`); *No se pudo enviar el correo, intenta más tarde o contacta a tu proveedor* (`:138`); *El enlace no es válido o ya venció, solicita uno nuevo* (`:147,151`); *La contraseña no puede ser igual a su documento* (`:154`); *Contraseña actualizada, ya puedes iniciar sesión* (`:171`); límite: *Demasiadas peticiones, espere unos segundos e intente de nuevo* (`BE:app.module.ts:100`). FE: *Revisa tu bandeja*, *Enviamos un enlace para crear una nueva contraseña a …*, *El enlace vence en 15 minutos. Si no lo ves, revisa el spam.*, *Este enlace ya no es válido*, *Listo, ya está.*, *Tu contraseña fue actualizada. Te llevamos al inicio de sesión en un momento.* (`FE:Login.vue:255-263`, `RestablecerPassword.vue:103-118`).
- **Casos límite:** el enlace base es `process.env.DOMINIO` (en `STAGE=dev` usa el origen de la petición) (`:116`). Un enlace sirve una sola vez. ✅

## POR-003 · Estructura del portal, sesión y cambio obligatorio de la clave temporal
- **Ruta UI / name:** `/portal` con hijos (`FE:router/routes.ts:532-592`). ✅
- **Archivos:** FE: `pages/portal-cliente/layouts/PortalClienteLayout.vue`, `components/ModalCambiarPassword.vue`, `components/AvatarCliente.vue`, `stores/auth-cliente.ts` · BE: `portal/portal.service.ts:184-198` (`me`).
- **Para qué sirve:** marco común: menú, modo oscuro, perfil y cierre de sesión.
- **Acceso:** sesión de cliente.
- **Secciones:** menú **Inicio**, **Facturas**, **Consumo**, **Contratos**, **Soporte**, **Perfil** (`FE:PortalClienteLayout.vue:8-15`); en celular, barra inferior con los mismos seis (`:45-57`). Cabecera *Bienvenido:* + nombres; botón de modo claro/oscuro; menú del avatar con **Mi perfil** y **Cerrar sesión** (`:63-93`). Tarjeta lateral *¿Necesitas ayuda?* / *Reporta un problema con tu servicio.* / **Ir a soporte** (`:134-141`). ✅
- **Reglas:** si `debe_cambiar` es verdadero (clave temporal) se abre el diálogo no cerrable **Crea tu contraseña**: *Ingresaste con una clave temporal. Por tu seguridad, define una propia para continuar.* Campos **Nueva contraseña** (mín. 8, *Mínimo 8 caracteres (obligatorio)*) y **Confirmar contraseña**; botón **Guardar contraseña** (`FE:ModalCambiarPassword.vue:57-120`, `PortalClienteLayout.vue:27-29`). Con clave temporal no se pide la actual (`BE:portal.service.ts:344-348`). ✅
- **Mensajes:** *Contraseña actualizada*; *Las contraseñas no coinciden*; *Debe tener al menos 8 caracteres* (`ModalCambiarPassword.vue:27-43`).
- **Casos límite:** la sesión y el modo oscuro se guardan en el navegador (`persist` en `localStorage`, `stores/auth-cliente.ts:20-22`); cerrar sesión borra token, nombres y `debe_cambiar`. ✅

## POR-004 · Inicio del portal: estado de cuenta
- **Ruta UI / name:** `/portal` · `portal.inicio`.
- **Archivos:** FE: `pages/portal-cliente/modules/inicio/InicioPage.vue` · BE: `portal/portal.service.ts:252-333` (`GET /portal/inicio`), `registro-pagos/consulta-deuda.service.ts`.
- **Para qué sirve:** resume lo que debe, el estado de cada servicio y los últimos pagos.
- **Secciones:** tarjeta principal con un solo estado (`FE:InicioPage.vue:31-68`): *Servicio suspendido* (*Regulariza tu pago para reconectarte*), *Promesa de pago* (*Tienes plazo hasta el …*), *Pago pendiente* (*Venció el …* o *Paga para evitar el corte*), *Vence hoy / Vence en N días* (≤ 5 días), *Estás al día*. Monto: *Total a pagar* / *Próxima factura* / *Próximas facturas* / *Sin saldo pendiente*; botón **Pagar ahora** (a `/portal/facturas`). Cuatro tarjetas: *Servicios activos*, *Facturas pendientes*, *Promesa de pago hasta* o *Próximo vencimiento*, *Último pago*. Bloques **Mi servicio** (estado *Conectado*, *Sin conexión*, *Activo*, *Suspendido*; enlace *Mi internet no funciona*) y **Últimos pagos** (*Pago recibido*, *Aún no tienes pagos registrados.*). Accesos rápidos: *Mis facturas*, *Mi consumo*, *Soporte*, *Mis contratos*. ✅
- **Reglas (backend):** últimos 4 abonos válidos de las 10 facturas con pago más reciente (`:262-284`); `promesa_hasta` = máxima fecha límite de promesas activas, solo si hay deuda (`:286-295`); `suspendido` = algún servicio no activo (`:300`). ✅
- **Mensajes:** *No pudimos cargar tu información. Intenta de nuevo en unos minutos.* (`:180`).

## POR-005 · Facturas del cliente: lista, filtros y descarga de comprobantes
- **Ruta UI / name:** `/portal/facturas` · `portal.facturas`.
- **Archivos:** FE: `modules/facturas/FacturasPage.vue`, `components/FacturaCard.vue`, `components/FacturasFiltros.vue`, `composables/useFacturas.js` · BE: `portal/facturas/portal-facturas.controller.ts`, `portal-facturas.service.ts`, `dto/listar-facturas-portal.dto.ts`.
- **Para qué sirve:** ver facturas, su estado, pagar y bajar recibos o facturas electrónicas.
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Estado (Todas / Pendientes / Pagadas) | filtra | cliente | `GET /portal/facturas?estado=` | `FE:useFacturas.js:28-32` |
  | Servicio (Todos los servicios) | filtra por servicio | cliente | `?servicio_id=` | solo si hay más de un servicio (`FacturasFiltros.vue:30`) |
  | Pagar | abre `/portal/facturas/:id/pagar` | cliente | — | solo con saldo (`FacturaCard.vue:63`) |
  | Ver detalle | idem, factura pagada | cliente | — | `:81` |
  | Descarga de recibo (icono) / RIDE / XML | descarga el comprobante de un abono | cliente | `GET /portal/facturas/:id/abono/:abono/:formato` | formato `recibo`, `ride` o `xml` (`portal-facturas.controller.ts:26-39`) |
- **Estados:** chip *Pagada*, *Vencida*, *Pago parcial*, *Pendiente* (`useFacturas.js:42-50`); *Comprobante en revisión*, *Comprobante rechazado: …*, chip *Promesa hasta el …*, *Sin comprobantes aún*. Etiquetas: *Saldo a pagar* / *Total pagado*, *Factura #N*, *Vence …*. ✅
- **Reglas (backend):** excluye facturas anuladas (`estadoSRI = 'ANULADO'`); pendientes = `estadoSRI` nulo o *NO PAGADO*/*PENDIENTE*; vencimiento = día de pago + días de gracia del servicio; vencida si hay saldo y ya pasó; un abono con factura electrónica baja RIDE y XML, el resto es un recibo (PDF). `BE:portal-facturas.service.ts:14-65,100-140,142-166`. ✅
- **Mensajes:** *¡Estás al día!*, *No tienes facturas pendientes de pago. Gracias por tu puntualidad.*, *Aún no tienes facturas*, *No pudimos cargar tus facturas. Intenta de nuevo en unos minutos.*, *No se pudo descargar el comprobante*; BE: *Comprobante no encontrado*, *Este pago no tiene factura electrónica*.
- **Efectos externos:** PDF del recibo (`pagosService.generarFacturaAbono`); RIDE/XML (`invoicesService.downloadRideXml`).

## POR-006 · Pagar una factura: en línea, transferencia o comprobante
- **Ruta UI / name:** `/portal/facturas/:id/pagar` · `portal.facturas.pagar`.
- **Archivos:** FE: `modules/facturas/PagarPage.vue`, `components/{PagoEnLinea,PagoTransferencia,PagoComprobante}.vue`, `composables/useFacturas.js` · BE: `portal/pagos/portal-pagos.controller.ts`, `portal-pagos.service.ts`, `portal-comprobante.service.ts`, `dto/crear-pago-portal.dto.ts`, `entities/portal-pago.entity.ts`.
- **Para qué sirve:** el cliente paga con tarjeta (pasarela), transfiere y sube el comprobante, o solo sube el comprobante de un pago ya hecho.
- **Secciones:** a la izquierda el detalle (**Factura**, **Detalle**, *Subtotal*, *Descuento*, *IVA*, *Total factura*, *Pagado*, **Saldo a pagar**) y **Comprobantes enviados** (chips *Pendiente*, *Validado*, *Rechazado*; *Motivo: …*); a la derecha *¿Cómo quieres pagar?* con tres métodos (`FE:PagarPage.vue:13-17,130-155`): **Pagar en línea** (*Con tarjeta*; solo si hay pasarela disponible), **Transferencia** (*Nuestras cuentas*; solo si hay cuentas visibles), **Subir comprobante** (*Ya pagué*; siempre). ✅
- **Botones y campos:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Ir a pagar | abre la pasarela en pestaña nueva y espera la confirmación (revisa cada 4 s hasta 20 min) | cliente | `POST /portal/facturas/:id/enlace-pago` | genera el mismo cobro que el panel; *Tu pago ya fue recibido y se está registrando* si ya está pagado (`portal-pagos.service.ts:70-78`) |
  | Abrir de nuevo / Ya pagué, verificar / Cancelar | reabre, consulta o deja de esperar | cliente | `GET /portal/facturas/:id` | `PagoEnLinea.vue:17-19` |
  | Ya transferí, subir comprobante | pasa al método comprobante | cliente | — | `PagoTransferencia.vue:27` |
  | Comprobante (imagen, máx. 5 MB) | adjunta la imagen; en celular **Tomar foto** / **Subir archivo** | cliente | `POST /portal/pagos/archivo` | solo imágenes; 5 MB (`PagoComprobante.vue:7,21-30`, `portal-pagos.controller.ts:37`) |
  | Nota (opcional) | texto de hasta 300 caracteres | cliente | — | `crear-pago-portal.dto.ts:12-15` |
  | Enviar comprobante | crea la solicitud de revisión | cliente | `POST /portal/pagos` | una sola pendiente por factura |
- **Reglas (backend):**
  - La factura se busca por el cliente del token y no puede estar anulada. `BE:portal-pagos.service.ts:210-221`. ✅
  - Sin saldo: *Esta factura no tiene saldo pendiente*; con otro comprobante pendiente: *Ya tienes un comprobante en revisión para esta factura* (revisado antes de leer con IA y otra vez bajo candado). `:80-112,291-294`. ✅
  - Lectura con IA (opcional): solo si existe `HOST_API_WHATSAPP`, el archivo y un token de IA configurado; si no, el comprobante entra sin lectura. Con lectura: rechaza por antigüedad (`comprobante_dias_max` de Ajustes → Cobros y promesas), por referencia ya registrada, o si la cuenta destino no coincide con las cuentas de la empresa (salvo que no haya cuentas configuradas). `BE:portal-comprobante.service.ts:20-66`. ✅
  - Pasarela disponible = al menos un proveedor con método `payment_link`. Cuentas que se muestran = `cuentas_recepcion` sin `ocultar_al_cliente`. `BE:portal-pagos.service.ts:61-67`, `BE:pasarelas-pago/disponibilidad.service.ts`. ✅
  - Estados del comprobante: `PENDIENTE`, `APROBADO`, `RECHAZADO` (`entities/portal-pago.entity.ts:6`). ✅
- **Efectos externos:** pasarela de pago; servicio de lectura de comprobantes (IA, vía el servicio de WhatsApp); aviso en tiempo real a todo el personal (`portal_pago`, `portal-pagos.service.ts:322-334`). Crea la forma de pago **PORTAL CLIENTE** (código 20) por empresa al iniciar (`:44-57`).
- **Mensajes (texto exacto):** *Comprobante enviado. Lo revisaremos y registraremos tu pago.*; *Adjunta el comprobante*; *Solo se aceptan imágenes*; *La imagen supera los 5 MB*; *Ya tienes un comprobante en revisión para esta factura. Te avisaremos cuando registremos tu pago.*; *Tu comprobante anterior fue rechazado: …*; *El comprobante tiene N días. Solo se aceptan comprobantes de hasta N días.*; *El comprobante N° X ya fue registrado en otro pago.*; *No pudimos confirmar que el comprobante sea de una transferencia a las cuentas de la empresa. Revisa que hayas pagado a una de las cuentas indicadas.*; *No se pudo generar el enlace de pago*; *¡Pago recibido!* / *Pago parcial recibido*; *No encontramos la factura.*

## POR-007 · Promesa de pago pedida por el cliente
- **Ruta UI / name:** botón **Promesa** en cada tarjeta de `/portal/facturas`.
- **Archivos:** FE: `modules/facturas/components/FacturaCard.vue:8-22,64-78`, `composables/useFacturas.js:200-222` · BE: `portal/pagos/portal-pagos.controller.ts:48-62`, `promesas-pago/promesas-pago.service.ts:84-103,109-291`.
- **Para qué sirve:** darle plazo para pagar sin que se corte el servicio, sin intervención del personal.
- **Acceso:** el botón solo aparece si la empresa lo habilita (**Portal del cliente** en Ajustes → Cobros y promesas, POR-019), la factura tiene saldo y no tiene promesa activa. ✅ `FacturaCard.vue:64`.
- **Botones y campos:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Promesa | abre el diálogo **Promesa de pago** | cliente | `GET /portal/promesas/opciones` | `habilitada` y `dias_max` |
  | Días (control deslizante 1 a máximo) | plazo | cliente | — | *¿Cuántos días necesitas para pagar? Hasta N.* |
  | Confirmar | registra la promesa | cliente | `POST /portal/facturas/promesa/:id` | `dias` entero ≥ 1 (`solicitar-promesa-portal.dto.ts`) |
- **Reglas (backend):** `dias_max` = `dias_promesa_pago` (3 por defecto). Se rechaza si el cliente es reincidente (`promesa_max_incumplidas`, 2 por defecto; 0 = sin límite), si ya pidió el máximo del mes (`promesa_max_mes`, 1 por defecto; cuenta pedidos con `origen` `solicitud` o `portal`), si la factura no tiene saldo o ya tiene promesa activa. El plazo se cuenta desde el vencimiento (si aún no vence) o desde hoy. Crea la promesa con `origen = 'portal'` y nota *Promesa de pago solicitada por el cliente desde el portal (N día(s) de plazo).*, la extiende a las demás facturas vencidas del servicio y reevalúa el servicio. `BE:promesas-pago.service.ts:129-291,150-171,182-183`. ✅ No hay aprobación del personal. ✅
- **Efectos externos:** reevaluación del servicio en el router (`verifyAndApplyServiceStatus`); no envía aviso al cliente por este canal (`notificar` solo en llamadas, `:280`).
- **Mensajes:** *Listo, tienes plazo para pagar hasta el …*; *No se pudo registrar la promesa de pago*; BE: *La empresa no da promesas de pago por el portal: contacta a un asesor.*; *Por promesas anteriores sin cumplir no se puede dar otra por este medio: un asesor puede revisarlo.*; *Ya pidió una promesa de pago este mes: solo se da una al mes por este medio.*; *Ya pidió N promesas de pago este mes: es el máximo por este medio.*; *Su deuda ya tiene una promesa de pago activa hasta el …*; *Esta factura no tiene un saldo pendiente por pagar.*

## POR-008 · Consumo y prueba de velocidad
- **Ruta UI / name:** `/portal/consumo` · `portal.consumo`.
- **Archivos:** FE: `modules/consumo/{ConsumoPage,ConsumoHistorial,PruebaVelocidad}.vue` · BE: `portal/consumo/portal-consumo.{controller,service}.ts`.
- **Secciones:** pestañas **Mi consumo** y **Prueba de velocidad** (`ConsumoPage.vue:11-12`). En **Mi consumo**: selector **Servicio** (si hay más de uno), **Rango de fechas**, botones **Hoy / Semana / Mes / Año**, tarjetas *Total Bajada*, *Total Subida*, *Tráfico Total*, gráfica (*Bajada*, *Subida*, Mbps; en **Año**, barras en GB por mes) y tabla (*Fecha / Hora*, *Volumen Bajada*, *Volumen Subida*, *Tráfico Total*). Aviso: *Se muestra el volumen de datos consumido (MB/GB) y la velocidad promedio en Mbps. Se actualiza cada 5 minutos.* ✅
- **Reglas (backend):** muestra solo los servicios del cliente no retirados cuyo router no tiene control de velocidad *ninguno*; `GET /portal/consumo/:servicioId?rango=hoy|semana|mes|anio&desde&hasta` consulta `obtenerConsumoCliente`. `BE:portal-consumo.service.ts:17-50`. ✅
- **Prueba de velocidad:** corre en el navegador del cliente con `@cloudflare/speedtest` contra `speed.cloudflare.com`; omite la pérdida de paquetes; botón **Iniciar** / **Reintentar**, **Pausar** / **Reanudar**; muestra Descarga, Carga, Latencia y un mapa (Mapbox). Error: *No se pudo completar la prueba. Intenta de nuevo.* No pasa por el backend de ISPMAX. `FE:PruebaVelocidad.vue`. ✅
- **Mensajes:** *El consumo de tu servicio no está disponible.* (sin servicios medibles).

## POR-009 · Contratos del cliente
- **Ruta UI / name:** `/portal/contratos` · `portal.contratos`.
- **Archivos:** FE: `modules/contratos/ContratosPage.vue` · BE: `portal/contratos/portal-contratos.controller.ts`, `portal-documentos.service.ts`.
- **Para qué sirve:** consultar los contratos y archivos de los servicios del cliente (incluidos los retirados).
- **Botones y campos:** filtro **Servicio** (si hay más de uno); por tarjeta: título, chip de estado, *Inicio*, *Finaliza* (*Indefinido* si duración 0), *Firmado*, *Duración* (*N mes/meses*), botón **Ver contrato** (abre `/api/uploads/images-services/<archivo>`). `FE:ContratosPage.vue:50-130`. ✅
- **Reglas (backend):** lista `contratos-archivos` de todos los servicios del cliente (con `withDeleted`), los más recientes primero, paginados. `BE:portal-documentos.service.ts:20-58`. ✅
- **Mensajes:** *Aún no tienes contratos*; *Cuando tengas un contrato con nosotros, lo verás aquí para consultarlo cuando quieras.*; *Este servicio todavía no tiene contratos registrados.*

## POR-010 · Soporte: lista de solicitudes y nueva solicitud
- **Ruta UI / name:** `/portal/tickets` · `portal.tickets` (menú **Soporte**).
- **Archivos:** FE: `modules/tickets/TicketsPage.vue`, `components/SolicitudCard.vue`, `estadoSolicitud.js` · BE: `portal/tickets/portal-tickets.controller.ts`, `portal-tickets.service.ts`, `dto/crear-ticket-portal.dto.ts`, `dto/listar-tickets-portal.dto.ts`, `entities/portal-ticket.entity.ts`.
- **Para qué sirve:** ver las solicitudes y tickets propios y crear una solicitud de soporte o de instalación nueva.
- **Botones y campos de la nueva solicitud** (`FE:TicketsPage.vue:343-545`):
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Nueva solicitud | abre el formulario *Nueva solicitud de soporte* | cliente | `GET /portal/servicios`, `/portal/tickets/lista` | — |
  | ¿Qué ocurre? (*Sin internet*, *Internet lento*, *Cortes intermitentes*, *Problemas con el WiFi*, *Otro problema*, *Nueva instalación*) | tipo | cliente | — | sin servicios solo ofrece *Nueva instalación* (`:62`) |
  | ¿Qué servicio tiene el problema? / Elige el servicio | servicio | cliente | — | obligatorio para problemas |
  | ¿Qué tan urgente es? (*No tengo servicio*, *Funciona con problemas*, *Es una consulta*) | urgencia ALTA/MEDIA/BAJA | cliente | — | no aplica a instalación |
  | Asunto | texto | cliente | — | obligatorio solo con *Otro problema*; máx. 150 |
  | Cuéntanos con más detalle | detalle | cliente | — | obligatorio, máx. 1000 |
  | Adjuntar archivo | hasta 8 archivos, 500 MB c/u | cliente | `POST /portal/tickets/archivo` | se guardan en `images-services` |
  | Teléfono de contacto; Mejor horario (Mañana / Tarde / Cualquiera) | contacto | cliente | — | — |
  | Solicitar instalación: ¿Para quién? (*Para mí* / *Para otra persona*), Elige el plan, Dirección donde se instalará, Ubicación en el mapa (opcional), y para otra persona: nombre, tipo y N° de documento, correo y teléfono | datos de la instalación | cliente | `GET /portal/planes` | planes activos con **Mostrar en el bot** (`BE:internet/internet.service.ts:836-866`) |
  | Enviar solicitud | crea la solicitud | cliente | `POST /portal/tickets` | `portal_tickets` en estado `PENDIENTE` |
- **Reglas (backend):** máximo 5 solicitudes `PENDIENTE` por cliente; el servicio debe ser del cliente (instalación sin servicio); instalación exige dirección y plan de la lista; con otra persona exige nombre, documento válido, tipo de documento (05, 04, 06), correo y teléfono. `BE:portal-tickets.service.ts:131-197`. ✅ Avisa en tiempo real al personal (`portal_solicitud`, `:105-120`). ✅
- **Estados que ve el cliente (etapas):** *En revisión*, *Recibida*, *Agendada*, *En proceso*, *Finalizada*, *Cancelada* (`FE:estadoSolicitud.js:2-15`, `BE:dto/listar-tickets-portal.dto.ts:5-12`). La lista junta las solicitudes no atendidas (o atendidas con instalación) y todos los tickets del cliente, vengan del portal o del panel (`:76-119,199-210`). ✅
- **Mensajes:** *Solicitud enviada, la revisaremos y te contactaremos*; *Aún no tienes solicitudes*; *Elige el servicio y el tipo de problema*; *Elige el plan que te interesa*; BE: *Tienes varias solicitudes en revisión, espera a que las atendamos*; *El servicio no es válido*; *Indica la dirección de la instalación*; *Elige un plan de la lista*; *Describe el problema*.

## POR-011 · Detalle de una solicitud o ticket y conversación
- **Ruta UI / name:** `/portal/tickets/:id` (solicitud) · `/portal/tickets/ticket/:id` (ticket real).
- **Archivos:** FE: `modules/tickets/TicketDetallePage.vue`, `components/ConversacionCliente.vue` · BE: `portal-tickets.service.ts:121-129,212-316`.
- **Secciones:** Estado, Instalación o Ticket, Fecha creación, Visita, Tipo, Servicio, Dirección, Plan elegido, Para, Urgencia, Contacto, Mejor horario, Archivos adjuntos, Detalle, *Motivo del rechazo*, y **Conversación** (`TicketDetallePage.vue:70-176`). ✅
- **Botones y campos:** caja *Escribe un mensaje* (máx. 1000) y botón enviar (`ConversacionCliente.vue:116-130`). Se oculta si el ticket está `CERRADO`/`CANCELADO` o la instalación `INSTALADO`/`CANCELADA`. Una solicitud sin ticket ni instalación dice: *Revisaremos tu solicitud y te contactaremos. Cuando se convierta en ticket podrás seguir la conversación aquí.* ✅
- **Reglas (backend):** el hilo junta las respuestas del personal (con sus archivos; el HTML se limpia con `sinHtml`, incluye los cambios de estado) y los mensajes del cliente (`ticket_mensajes_cliente` / `instalacion_mensajes_cliente`). El mensaje avisa en tiempo real (`portal_mensaje`) al técnico, operador y técnicos de apoyo. `BE:portal-tickets.service.ts:219-254,268-304,335-345`. ✅ Los archivos del personal se ven en `/api/uploads/images-services/`. ✅
- **Mensajes:** *Aún no hay mensajes. Te responderemos por aquí.*; *No pudimos cargar la conversación*; *No pudimos enviar el mensaje*; *Escribe el mensaje*; *Tú* / *Soporte*; BE: *Ticket no encontrado*, *Instalación no encontrada*, *Solicitud no encontrada*.

## POR-012 · Perfil del cliente, avatar y cambio de contraseña
- **Ruta UI / name:** `/portal/perfil` · `portal.perfil`.
- **Archivos:** FE: `modules/perfil/PerfilPage.vue`, `components/{PerfilDatos,PerfilSeguridad}.vue`, `composables/usePerfil.js`, `components/ModalElegirAvatar.vue` · BE: `portal.service.ts:200-250,335-359`, `auth/dto/{actualizar-perfil,cambiar-password}.dto.ts`.
- **Secciones:** datos (*Documento*, *Correo*, *Celular*, *Dirección*, ubicación por niveles), *Cliente desde …*, nota *Para cambiar tu nombre o documento comunícate con soporte.*; tarjeta **Cambiar contraseña** (*Último acceso: …*). ✅
- **Botones y campos:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Editar / Guardar / Cancelar (por campo) | edita correo, celular, dirección o ubicación | cliente | `PATCH /portal/perfil` | correo válido y no vacío; celular normalizado (7 a 20); dirección máx. 250 (`actualizar-perfil.dto.ts`) |
  | Elige tu avatar (**Todos / Hombre / Mujer**, **Más opciones**) | cambia el avatar | cliente | — | solo se guarda en el navegador (`useAvatarCliente.js`) |
  | Contraseña actual / Nueva contraseña / Confirmar nueva contraseña | cambia la clave | cliente | `POST /portal/auth/cambiar-password` | actual obligatoria salvo clave temporal; nueva mín. 8, máx. 50; distinta del documento |
  | Actualizar contraseña | guarda | cliente | idem | — |
- **Mensajes:** *Datos actualizados*; *Contraseña actualizada*; *No se pudieron guardar los cambios*; *No se pudo cambiar la contraseña*; *Debes completar este campo*; *Ingresa un correo válido*; BE: *La contraseña actual no es correcta*; *La contraseña no puede ser igual a su documento*; *El correo no puede quedar vacío*; *El correo no es válido*; *El celular no es válido*.

## POR-013 · Acceso al portal desde la ficha del cliente (enviar credenciales)
- **Ruta UI / name:** listado **Gestión de Clientes → Clientes** → acción **Acceso al portal** (icono de llave, menú de acciones y fila). `FE:pages/dashboard/clientes/cell_renders/ActionCellRenderer.vue:73-80,163-175`. ✅
- **Archivos:** FE: `pages/dashboard/clientes/components/modals/ModalCredencialesPortal.vue`, `composables/useWaCanal.js` · BE: `portal/portal.controller.ts:76-92`, `portal.service.ts:361-523`, `auth/dto/enviar-credenciales.dto.ts`.
- **Para qué sirve:** generar una clave temporal y mandarla al cliente por WhatsApp, correo o ambos.
- **Acceso:** permiso `cliente.portal.credenciales` (*Enviar acceso al portal*), cliente no *Retirado* (`ActionCellRenderer.vue:74,164`). ✅
- **Botones y campos:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Enviar por: WhatsApp / Email / Ambas | canal | `cliente.portal.credenciales` | — | `ModalCredencialesPortal.vue:105-116` |
  | Canal de WhatsApp: Oficial / No oficial | elige el canal | idem | — | solo aparece si hay ambos (`useWaCanal.js`); el oficial no puede iniciar conversación sin plantilla: *El canal oficial requiere una plantilla aprobada; elige el canal no oficial o el correo* (`portal.service.ts:493-494`) |
  | Celular del cliente | destino WhatsApp | idem | — | obligatorio con WhatsApp/Ambas: *Ingresa el celular del cliente* |
  | Email del cliente | destino correo | idem | — | el formulario lo exige siempre: *Ingresa el email del cliente: es su usuario* (`:37-38`); si se corrige se guarda en la ficha (`portal.service.ts:422-423`) |
  | Enviar credenciales / Reenviar credenciales | envía | idem | `POST /portal/credenciales/:customerId/enviar` | genera una clave de 10 caracteres sin caracteres ambiguos (`:30,441-443`); *Se generará una clave nueva: la anterior dejará de funcionar.* |
- **Estado mostrado** (`GET /portal/credenciales/:customerId/estado`, `portal.service.ts:362-374`): *Ya activó su acceso* (`debe_cambiar` falso), *Credenciales enviadas el …, aún no ingresa*, *Aún no se le han enviado credenciales*, y *Último ingreso: …*. ✅
- **Reglas (backend):** el cliente debe estar habilitado y tener número de documento (*El cliente necesita número de documento: es su usuario del portal*); para correo, un email (*El cliente necesita un email para enviarle el acceso por correo*). La clave nueva se guarda **solo si al menos un canal envió**; si todos fallan responde 400 con los errores y la clave anterior sigue vigente. Cada canal se registra como mensaje individual `[Credenciales del portal]` (origen `credenciales_portal`, sin la clave). `BE:portal.service.ts:378-439,511-523`. ✅
- **Efectos externos:** WhatsApp (sesión no oficial de la empresa: comprueba que esté vinculada y que el número use WhatsApp) y correo de la empresa con el logo.
- **Mensajes:** *Credenciales enviadas*; *No se pudieron enviar las credenciales*; *Correo: …* / *WhatsApp: …* (errores por canal); *WhatsApp desvinculado*; *El número no usa WhatsApp*; *El cliente no tiene acceso al portal (retirado o consumidor final)*. Texto de WhatsApp: *Hola …, ya puedes ingresar al portal de clientes de …*, *Usuario (tu cédula): …*, *Clave temporal: …*, *Al ingresar por primera vez te pediremos crear tu propia contraseña.* El enlace enviado es `<origen del panel>/portal/login`.
- **Hallazgo:** el aviso del formulario dice que el email "es su usuario", pero el usuario del portal es la cédula (el correo solo se acepta para quien ya tenía credenciales). ✅

## POR-014 · Pagos del portal: bandeja de comprobantes
- **Ruta UI / name:** `/portal-pagos` · `portal-pagos.index` · menú **Finanzas → Pagos del portal** (`FE:layouts/SideBarMenu.vue:65-70`). ✅
- **Archivos:** FE: `pages/dashboard/portal-pagos/IndexPage.vue`, `composables/usePortalPagos.js` · BE: `portal/pagos/portal-pagos.controller.ts:64-69`, `portal-pagos.service.ts:120-171`.
- **Para qué sirve:** revisar los comprobantes que suben los clientes.
- **Acceso:** permiso `portal-pagos.index` (*Pagos del portal → Ver*). ✅
- **Filtros y columnas:** selector **Estado** (Todos, Pendientes, Aprobados, Rechazados) y búsqueda *Cliente o cédula* (`IndexPage.vue:84-110`); columnas **Cliente**, **N° Factura**, **Monto pagado**, **Referencia**, **Fecha**, **Estado**, **acciones** (`:6-20`). Botón por fila: *Validar comprobante* (pendiente) o *Ver comprobante*. Vacío: *No se encontró ningun resultado*. ✅
- **Reglas (backend):** pendientes primero, luego por fecha descendente (`:133-134`); al listar, concilia: una pendiente cuya factura se anuló pasa a `RECHAZADO` (*La factura fue anulada*) y la que ya está pagada pasa a `APROBADO` (*La factura ya fue pagada desde otro lado*); una aprobada cuyo abono se anuló pasa a `RECHAZADO` (*El pago fue anulado*). `:225-289`. ✅
- **Efectos externos:** se refresca solo al llegar el aviso `portal_pago` (`FE:layouts/Notifications.vue:197-200`). No hay contador en el menú. ✅

## POR-015 · Validar o rechazar un comprobante del portal
- **Ruta UI / name:** modal **Comprobante** sobre `/portal-pagos`.
- **Archivos:** FE: `portal-pagos/components/ModalValidarPago.vue`, `clientes/components/modals/ModalPago.vue` · BE: `portal-pagos.service.ts:173-205`, `dto/rechazar-pago-portal.dto.ts`, `dto/vincular-pago-portal.dto.ts`.
- **Para qué sirve:** cobrar la factura con el modal de pago habitual o rechazar el comprobante con un motivo que verá el cliente.
- **Botones y campos:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Validar comprobante (icono) | abre el comprobante y el modal **Agregar Pago** con forma de pago **PORTAL CLIENTE** y el N° de transacción leído | `portal-pagos.index` | `GET /pagos/find/...` | si la factura ya está pagada o anulada avisa y no cobra (`ModalValidarPago.vue:77-82`) |
  | Guardar (en **Agregar Pago**) | registra el abono | el del modal de pago | `PATCH /pagos/:id` | al terminar llama a vincular |
  | Rechazar | abre *Motivo (lo verá el cliente)* | `portal-pagos.index` | `POST /portal/pagos/:id/rechazar` | motivo obligatorio, máx. 500 |
  | Volver / Rechazar (confirmar) | cancela o confirma | idem | idem | *Comprobante rechazado* |
- **Reglas (backend):** `vincular` cierra la solicitud como `APROBADO` con el `abono_uuid` registrado y el revisor; `rechazar` solo si está `PENDIENTE`. `BE:portal-pagos.service.ts:175-205`. ✅ La tarjeta **Leído por IA** muestra *Monto leído*, *Comisión*, *Fecha*, *Referencia*, *Banco emisor*, *Banco destino*, *Cuenta destino*, *Beneficiario*, *Pagador* y las marcas *Cuenta de la empresa* / *Cuenta sin confirmar* (`ModalValidarPago.vue:22-37,166-180`). ✅
- **Mensajes:** *Comprobante rechazado*; *No pudimos rechazar el comprobante*; *No pudimos cargar la factura para registrar el pago*; *La factura ya fue pagada desde otro lado*; *La factura fue anulada*; *El pago se registró, pero no pudimos marcar el comprobante como aprobado. Revísalo en la bandeja.*; BE: *Comprobante no encontrado*, *El comprobante ya fue atendido*, *Escribe el motivo*.
- **Casos límite:** si se cierra **Agregar Pago** sin guardar, la solicitud sigue pendiente. El cliente no recibe aviso automático; ve el estado en su factura (*Validado* / *Rechazado: motivo*). ✅

## POR-016 · Solicitudes del portal: bandeja y detalle
- **Ruta UI / name:** `/tickets/portal` · `tickets.portal` y `/tickets/portal/:id` · `tickets.portal.detalle`; se llega con el botón **Solicitudes del portal** (con contador) del listado de **Tickets** (`FE:pages/dashboard/tickets/IndexPage.vue:311-325`). ✅
- **Archivos:** FE: `tickets/SolicitudesPortalPage.vue`, `SolicitudPortalPage.vue`, `components/AccionesSolicitudPortal.vue`, `composables/solicitudPortal.js` · BE: `portal/tickets/portal-tickets.controller.ts:98-109`, `portal-tickets.service.ts:320-345`.
- **Acceso:** la ruta se entra con `tickets.index` (`FE:router/auth-guard.ts:107-108`). ✅
- **Filtros y columnas:** **Estado** (Pendientes, Atendidas, Rechazadas, Todas), búsqueda *Cliente, cédula o asunto*; columnas **Fecha**, **Cliente**, **Servicio**, **Asunto**, **Estado** (con *Ticket #N* o *Instalación #N*). Botones por fila: *Ver solicitud*, *Completar* o *Crear instalación*, *Rechazar*, *Ver ticket*, *Ver instalación*. Vacío: *No hay solicitudes*. ✅
- **Detalle:** Estado, Cliente, Documento, Celular, Correo, Fecha creación, Tipo, Plan, Contrato, Dirección, Ubicación (*Ver en el mapa*), Plan solicitado, Para, Urgencia (*Sin servicio*, *Con problemas*, *Consulta*), Contacto, Horario preferido, Detalle, Archivos, *Motivo del rechazo*. ✅
- **Reglas:** pendientes primero (`CASE pt.estado`), luego por fecha. Se refresca con el aviso `portal_solicitud`. Estados: `PENDIENTE` (*Pendiente*), `ATENDIDO` (*Atendida*), `RECHAZADO` (*Rechazada*). ✅
- **Mensajes:** *No pudimos cargar las solicitudes*; *No pudimos cargar la solicitud*.

## POR-017 · Atender una solicitud: completar como ticket, crear instalación o rechazar
- **Ruta UI / name:** `/tickets/add?solicitud=<id>` · `/instalaciones/add?solicitud=<id>` · diálogo **Rechazar solicitud**.
- **Archivos:** FE: `tickets/components/FormTicket.vue:100-165`, `tickets/composables/useTicket.js:178-203`, `instalaciones/components/FormInstalaciones.vue:86-126`, `instalaciones/composables/useInstalaciones.js:164-183`, `instalaciones/AddInstalacion.vue:33` · BE: `portal-tickets.service.ts:347-380`.
- **Para qué sirve:** convertir la solicitud en ticket o instalación (prellenados) o rechazarla.
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Completar | abre el formulario de ticket prellenado (cliente y servicio fijos; *Agendado desde: Portal cliente*; prioridad según la urgencia; archivos adjuntos copiados) | `tickets.add` | `POST /portal/solicitudes/completar/:id` | marca la solicitud `ATENDIDO` y enlaza el ticket |
  | Crear instalación | abre **Nueva Instalación desde el portal** prellenada (cliente o persona a instalar, dirección, ubicación, notas con plan, detalle y horario) | `instalaciones.add` | `POST /portal/solicitudes/completar-instalacion/:id` | marca `ATENDIDO` y enlaza la instalación |
  | Rechazar | diálogo **Rechazar solicitud**, campo *Motivo (lo verá el cliente)*, botones **Cancelar** / **Rechazar** | `tickets.index` | `PATCH /portal/solicitudes/rechazar/:id` | motivo obligatorio, máx. 500 |
- **Reglas (backend):** solo `PENDIENTE` (*La solicitud ya fue atendida*); una solicitud de instalación no se completa como ticket (*Es una solicitud de instalación: atiéndela con "Crear instalación"*); el ticket y la instalación se crean con el formulario normal (con sus avisos opcionales por WhatsApp o correo). Tras guardar vuelve a `/tickets/portal`. `BE:portal-tickets.service.ts:347-380`. ✅
- **Mensajes:** *Solicitud rechazada*; *No pudimos rechazar la solicitud*; *La solicitud ya fue atendida*; *No pudimos cargar la solicitud*; *Ticket agregado correctamente*; *Instalación agregada correctamente*; *Completa: …* (campos faltantes de la instalación).

## POR-018 · Mensajes del cliente y respuestas del personal en tickets e instalaciones
- **Ruta UI / name:** sección **Listado de respuestas** de `/tickets/edit/:id` y `/instalaciones/edit/:id`.
- **Archivos:** FE: `tickets/components/ListRespuestas.vue:14-82`, `tickets/components/AgregarRespuesta.vue`, `instalaciones/components/ListRespuestasInstalacion.vue:14-73` · BE: `portal-tickets.controller.ts:111-123`, `respuestas-tickets/respuestas-tickets.service.ts`, `respuestas-instalaciones/respuestas-instalaciones.service.ts`.
- **Para qué sirve:** el personal ve lo que escribe el cliente y el cliente ve las respuestas del personal con sus archivos.
- **Reglas:** el panel pide `GET /portal/tickets/mensajes-cliente/:ticketId` y `GET /portal/instalaciones/mensajes-cliente/:instalacionId`, y mezcla los mensajes del cliente con las respuestas (ordenadas por fecha, la más nueva arriba). En el ticket el autor sale como *Cliente*; en la instalación, con la insignia *Cliente*. Los mensajes del cliente no se editan ni se eliminan desde el panel. Al guardar una respuesta del personal el backend avisa por websocket a la sala `portal-<id>` del cliente (`portal_mensaje`); el cliente ve texto limpio de HTML y los archivos adjuntos. El mensaje del cliente avisa al técnico, operador y apoyos, pero no genera notificación en la campana: solo refresca el listado si está abierto (`FE:layouts/Notifications.vue:187-190`). ✅
- **Botones:** **Agregar Respuesta** (hasta 7 archivos, ver `docs/guia/tickets`), *Editar respuesta*, *Eliminar respuesta* (solo del autor).

## POR-019 · Promesas pedidas desde el portal: ajuste de la empresa y origen
- **Ruta UI / name:** Ajustes → **Cobros y promesas** (`ajuste.cobros`) y `/promesas-pago`.
- **Archivos:** FE: `pages/dashboard/ajustes/cobros-promesas/IndexPage.vue`, `pages/dashboard/promesas-pago/IndexPage.vue:386-392` · BE: `settings` (`promesa_solicitud_portal`), migración `1789900000000-ReglasCobroEmpresa.ts`.
- **Campos:** **Días de plazo** (1 a 28), **Promesas por mes que puede pedir el cliente** (vacío = sin límite), **No dar promesas con incumplidas en el último año**, y el interruptor **Portal del cliente** ("Desde su sesión en el portal.") bajo *El cliente puede pedir una promesa por su cuenta desde*. Nota: *En cualquier canal se aplican los límites de arriba. Al registrarla se reactiva el servicio si estaba cortado.* (`IndexPage.vue:178-253`). Valor inicial: apagado (`promesa_solicitud_portal ... DEFAULT false`). ✅
- **Reglas:** las promesas con `origen = 'portal'` salen en el listado de **Promesas de pago** con **Operador** = *PORTAL CLIENTE* (`FE:promesas-pago/IndexPage.vue:390`). Acceso al ajuste: `ajuste.cobros` o `bot.config.promesas` (`FE:ajustes/IndexPage.vue:599-604`). ✅

## POR-020 · Mensaje del técnico en camino (Ajustes → Plantillas → Tickets)
- **Ruta UI / name:** `/ajustes/plantillas` · `ajuste.plantillas` → pestaña **Tickets** (`FE:pages/dashboard/ajustes/plantillas/IndexPage.vue:214-218,305-311`) → pestaña **Mensaje técnico en camino** (`FE:pages/dashboard/ajustes/ticket/IndexPage.vue:34-37`). No es del portal: lo manda el técnico desde el bot de WhatsApp.
- **Archivos:** FE: `ajustes/ticket/PlantillaMsgEnCamino.vue`, `composables/useConfigTicket.js` · BE: `ticket/bot/plantilla-en-camino.ts`, `ticket/ticket.service.ts:596-670` (`avisarClienteEnCamino`), `ticket/bot/ticket-bot.service.ts:491-520`, migración `1789400000000-TicketPlantillaEnCamino.ts`.
- **Campos y botones:** editor de texto, tabla de variables (`{ cliente }`, `{ tecnico }`, `{ telefono_tecnico }`, `{ tiempo_llegada }`, `{ asunto }`, `{ numero_ticket }`, `{ fecha_visita }`), bloque *Plantilla WhatsApp Oficial* (solo con Oficial conectado), botón **Guardar cambios** (permiso `variables.edita.plantilla.ticket`). ✅
- **Reglas:** vacío = texto por defecto (*Hola … soy …, técnico asignado a tu solicitud …* / *🚗 Voy en camino: llego en aproximadamente …*); con WhatsApp Oficial sale la plantilla aprobada `ticket_en_camino`; sin celular responde *el cliente no tiene celular registrado*; no repite el aviso si el técnico ya avisó hace poco; deja una respuesta en el ticket (*🚗 Avisó al cliente que va en camino*). ✅

---

## Hallazgos del dominio
1. `ModalCredencialesPortal.vue:37-38` exige email aunque se envíe solo por WhatsApp y dice que "es su usuario"; el usuario real es la cédula (`BE:portal.service.ts:68`). ✅
2. No existe aprobación del personal para la promesa pedida desde el portal: se crea sola con `origen = 'portal'` (`BE:promesas-pago.service.ts:271-287`). ✅
3. Los controles de antigüedad, duplicado y cuenta del comprobante solo corren si la lectura con IA tuvo efecto (`BE:portal-comprobante.service.ts:22-25`). ✅
4. El cliente no recibe aviso automático al validar o rechazar un comprobante: lo ve en su factura. ✅
5. El mensaje del cliente en un ticket no genera campana al personal (solo refresco en vivo). ✅
6. La sesión del cliente no vence por tiempo (`expiresIn` comentado). ✅
7. `PlantillaMsgEnCamino` pertenece al bot de técnicos, no al portal. ✅
8. Hay una ruta `HolaMundoPage.vue` sin enrutar en `pages/portal-cliente/`. ✅
