# Inventario EXT-1xx (correo) — Cómo configurar el servidor de correo de ISPMAX (Gmail y otros proveedores), versión didáctica

> Alcance: FE `pages/dashboard/emails/components/FormEmail.vue`, `pages/dashboard/emails/composables/useEmail.ts`, `pages/dashboard/ajustes/mensajeria/IndexPage.vue` (tarjeta del correo) · BE `email/{email.controller,email.service}.ts`, `email/dto/create-email.dto.ts`, `email/entities/email.entity.ts` y los llamadores de `EmailService`. Código `main-2026-11-04` (BE `f0d1ebf7`, FE `e7d5d06b`). Completa los EXT-001 a EXT-003 de `nuevo-servicios-externos.md` (el lado ISPMAX está allí; aquí se añade lo que lleva la versión didáctica y el proveedor distinto de Gmail).
>
> Convención: `FE:` = `frontend-isp-main/src/`, `BE:` = `backend-isp-main/src/`. ✅ = leído en código; las ayudas oficiales se leyeron en la web el 2026-11-05 (URL en cada sección). Nada está marcado 🖥️ (sin instancia ni cuentas reales).

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| EXT-101 | Preparar la cuenta de Google para el correo: verificación en dos pasos y contraseña de aplicación | `/ajustes/mensajeria` → «Datos del servidor correo» (pasos en Google) | `variables.config.servidor.correo` | completo (Google ❓) |
| EXT-102 | Mapa de datos del servidor correo: Host/servidor, Puerto, Usuario/Correo, Contraseña, Seguridad (qué hace cada valor de Seguridad) | `/ajustes/mensajeria` → «Datos del servidor correo» | `variables.config.servidor.correo` | completo |
| EXT-103 | Probar Configuración: ventana «Correo del cliente», correo de prueba, mensajes y tiempos de espera | ídem | ídem | completo |
| EXT-104 | Interruptor «Usar correo para notificaciones» y qué correos salen con esa cuenta (incluye el correo de recuperación, que no sale por aquí) | ídem | ídem | completo |
| EXT-105 | Diagnóstico de errores de la prueba y de los envíos (535, 534, Greeting never received, Connection timeout, ENOTFOUND, aviso sin respuesta, traducción del error) | ídem | ídem | completo (textos de Google ❓) |
| EXT-106 | La opción de contraseñas de aplicación no aparece en Google (causas) | pasos en Google | — | completo (Google ❓) |
| EXT-107 | Correo con otro proveedor: qué datos pedir y a qué campo va cada uno; cómo traducir «SSL/TLS» y «STARTTLS» a Seguridad | `/ajustes/mensajeria` → «Datos del servidor correo» | `variables.config.servidor.correo` | completo (proveedores ❓) |
| EXT-108 | Correo con Microsoft 365 / Exchange Online (SMTP AUTH) y cuentas personales de Outlook.com | ídem | ídem | completo (Microsoft ❓) |
| EXT-109 | Correo con el hosting (cPanel) y con Zoho Mail | ídem | ídem | completo (cPanel y Zoho ❓) |

## EXT-101 · Preparar la cuenta de Google (verificación en dos pasos y contraseña de aplicación)

- **Ruta UI / name:** pasos fuera de ISPMAX (`https://myaccount.google.com/`, `.../signinoptions/two-step-verification`, `.../apppasswords`); el resultado se carga en `/ajustes/mensajeria` → «Datos del servidor correo».
- **Archivos:** FE `FE:pages/dashboard/emails/components/FormEmail.vue` · BE `BE:email/email.service.ts`. Página: `docs/tareas/ajustes/configurar-el-correo-con-gmail.mdx`.
- **Para qué sirve:** ✅ el código solo autentica con usuario y contraseña (`auth: { user, pass }`, `BE:email/email.service.ts:32,188,248`); no hay OAuth. Con Gmail/Workspace eso exige una contraseña de aplicación.
- **Hechos de la ayuda de Google (2026-11-05):**
  - `support.google.com/accounts/answer/185833`: contraseñas de «16 dígitos» solo con verificación en dos pasos; la opción no aparece con 2SV solo por llaves de seguridad, con cuenta de trabajo/centro educativo/otra organización o con Protección Avanzada; «cada contraseña de aplicación solo se puede comprobar una vez»; se revocan al cambiar la contraseña de la cuenta; se quitan con «Quitar» desde `myaccount.google.com/apppasswords`; no se recomiendan y casi siempre no son necesarias (hay «Iniciar sesión con Google»). **La página no describe la pantalla de creación ni dice si los espacios del código importan.**
  - `support.google.com/accounts/answer/185839`: activar 2SV = `myaccount.google.com` → «Seguridad e inicio de sesión» → «Cómo inicias sesión en Google» → «Activar» junto a «Verificación en dos pasos». No describe cómo se ve cuando ya está activada.
  - `knowledge.workspace.google.com/admin/security/how-2-step-verification-works-with-legacy-apps`: no se puede exigir llave de seguridad y a la vez dejar usar contraseñas de aplicación; las contraseñas de aplicación evitan la 2SV y Google las desaconseja.
- **Efectos secundarios externos:** cuenta de Google.
- **Preguntas probables de usuarios:** «dónde saco el código de aplicación de gmail», «qué contraseña pongo», «cómo activo la verificación en dos pasos», «cómo sé si mi cuenta es de Workspace».
- **Pendiente de validar en UI:** ❓ nombres de botones y campos de la pantalla de contraseñas de aplicación; ❓ si Google acepta el código con espacios; ❓ cómo se ve la 2SV ya activada; ❓ si una cuenta de Workspace con 2SV puede crear contraseñas (la ayuda de Google no describe un interruptor de administrador).

## EXT-102 · Mapa de datos del servidor correo

- **Ruta UI / name:** `/ajustes/mensajeria` (pestaña «Configuración»), tarjeta «Datos del servidor correo» a la derecha de la de WhatsApp (`col-md-7`), debajo en pantalla angosta (`FE:pages/dashboard/ajustes/mensajeria/IndexPage.vue:155-176,282-299`).
- **Archivos:** FE `FE:pages/dashboard/emails/components/FormEmail.vue:108-185` · BE `BE:email/dto/create-email.dto.ts`, `BE:email/entities/email.entity.ts`.
- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Host/servidor: | texto (`v-model.trim`) | sí | `varchar(70)` | `FE:FormEmail.vue:112` |
  | Puerto: | texto (número en móvil) | sí | `allowOnlyNumber` borra lo que no sea dígito al soltar la tecla | `FE:FormEmail.vue:72-74,122-123` |
  | Usuario/Correo: | texto (`trim`) | sí | `varchar(75)`; es también el remitente (`from: usuario`, `BE:email/email.service.ts:36,192,252`) | `FE:FormEmail.vue:134` |
  | Contraseña: | contraseña con ojo (icono `visibility`) y llave | sí | `varchar(75)`; `trim` solo recorta extremos | `FE:FormEmail.vue:141-160` |
  | Seguridad: | lista `SSL`, `TLS`, `NONE` | sí | tooltip del icono «i»: «SSL → puerto 465 · TLS/STARTTLS → 587 · NONE → sin cifrado» | `FE:FormEmail.vue:166-179` |

- **Reglas de negocio (backend):** ✅ `secure: seguridad === 'SSL'`, `requireTLS: seguridad === 'TLS'` (`BE:email/email.service.ts:26-27,182-183,242-243`). Con `TLS`, nodemailer envía `STARTTLS` aunque el servidor no lo anuncie y falla con «Error upgrading connection with STARTTLS» si no responde 2xx (`node_modules/nodemailer/lib/smtp-connection/index.js:1303,1388-1399`); con `NONE` (o vacío) usa STARTTLS solo si el servidor lo ofrece (`:1303`). Una sola fila de configuración por instalación (`findOne` toma la primera, `BE:email/email.service.ts:295-306`).
- **Mensajes (texto exacto):** `Cambios guardado exitosamente` (BE `:337`), aviso `warning` con `message` del servidor si el guardado falla (`FE:useEmail.ts:59`).
- **Preguntas probables de usuarios:** «qué pongo en cada campo», «qué puerto uso», «ssl o tls», «usuario es el correo completo».
- **Pendiente de validar en UI:** ❓ aspecto de la tarjeta en pantalla estrecha.

## EXT-103 · Probar Configuración

- **Ruta UI / name:** botón **Probar Configuración** (`FE:FormEmail.vue:186-192`) → diálogo «Correo del cliente» con campo de correo y botones «Cancelar» / «Enviar» (`FE:FormEmail.vue:204-224`).
- **Archivos:** FE `FE:FormEmail.vue:43-70` · BE `BE:email/email.controller.ts:13-16`, `BE:email/email.service.ts:19-150`.
- **Reglas:** ✅ `POST /email/testing` usa los valores del formulario (guardados o no) y `parseInt(puerto)`; no mira el interruptor. Tiempos: `greetingTimeout`, `connectionTimeout` y `dnsTimeout` de 10 000 ms (`:28-30`); en envíos reales 12 000 ms (`:184-186,244-246`). Remitente `from: usuario`; asunto `Prueba de correo exitosa - Sistema ISPMAX` (`:38`); el cuerpo incluye una imagen alojada en Cloudinary.
- **Mensajes (texto exacto):** éxito `Correo Enviado Exitosamente` (aviso positivo); error: `message` de la respuesta; si no hay `message`, `<code> - <command>`; si la petición no obtiene respuesta, `Hubo un error al enviar el email, por favor verique bien sus datos` (`FE:FormEmail.vue:55-66`). El diálogo se cierra en éxito y en error (`:51-52,68`).
- **Error del servidor:** ✅ `BadRequestException(msgTraducido)`, con el texto de nodemailer traducido inglés→español por `api.mymemory.translated.net` (sin tiempo de espera propio); si falla, el original (`BE:email/email.service.ts:147-162`). nodemailer arma `Invalid login: <respuesta del servidor>` (`index.js:1577` + `_formatError:805-808`), `Greeting never received` (`:718`), `Connection timeout` (`:237`).
- **Pendiente de validar en UI:** ❓ apariencia exacta del aviso rojo con texto traducido; ❓ cuánto tarda en aparecer cuando el traductor no responde.

## EXT-104 · Interruptor «Usar correo para notificaciones» y correos que salen con la cuenta

- **Ruta UI / name:** interruptor de la misma tarjeta (`FE:FormEmail.vue:84-103`); leyenda: «Si lo apagas, ninguna acción intenta enviar por correo ni registra sus logs.»
- **Reglas:** ✅ guarda al instante con `PATCH /email/:id` `{ activo }`; avisos `Correo activado como canal.` / `Correo desactivado: no se enviará por este canal.`; si falla, revierte (`FE:FormEmail.vue:28-41`). `estaActivo()` exige `activo !== false` y host, usuario y contraseña no vacíos (`BE:email/email.service.ts:309-319`). `sendMessage` lanza `El canal de correo está desactivado` salvo con `omitirInterruptor` (`:229-235`); `sendComprobantes` no comprueba el interruptor, pero el procesador de facturas sí, salvo que el usuario elija el canal (`BE:comprobantes-electronicos/facturas/invoice-queue.processor.ts:620,1020`). Fallos de envío real: `Error: getaddrinfo ENOTFOUND <host>` (código `EDNS`) o `Fallo al enviar el correo` (`:221-225,269-272`).
- **Correos que salen con esta cuenta** (llamadores de `EmailService`): comprobantes electrónicos (`invoice-queue.processor.ts:630,1060`); recibo de pago (`pagos/notificar-cobro-queue.processor.ts:137`); recordatorios de pago (`pagos/notificar-recortatorio-pago-queue.processor.ts:1008`); bienvenida (`customers/customer-queue.processor.ts:280`) y aviso de instalado (`customers/customers.service.ts:843`); cargo recurrente (`servicios-recurrente/servicios-recurrente-queue.processor.ts:274`); enlace de pago (`pasarelas-pago/envio-cobro.service.ts:142`); contratos (`contratos/contratos.service.ts:742`, `contratos-archivos/contratos-archivos.service.ts:390`), tickets (`ticket/ticket.service.ts:566`), instalaciones (`instalaciones/instalaciones.service.ts:497`); promesas de pago (`promesas-pago/promesas-pago-notificacion.service.ts:160`); alertas de monitoreo (`monitoreo-dispositivos/monitoreo-dispositivos-notifier.service.ts:526`); mensajes masivos (`mensajes-masivos/mensajes-masivos-queue.processor.ts:202,276`); acceso al portal (`portal/portal.service.ts:461`, con `omitirInterruptor = true`).
- **No salen con esta cuenta:** el correo de «olvidé mi contraseña» del panel y del portal usa `sendDesdeSistema` con `MAIL_HOST/PORT/USER/PASSWORD` del entorno (`BE:email/email.service.ts:276-289`; `auth/auth.service.ts:513`, `portal/portal.service.ts:131`).
- **Límites de Google citados:** Workspace, `smtp.gmail.com`: 2 000 mensajes por día (`knowledge.workspace.google.com/admin/gmail/send-email-from-a-printer-scanner-or-app`); páginas de límites de Workspace (`.../gmail-sending-limits-in-google-workspace`): 2 000 mensajes/día, 500 en cuentas de prueba, 10 000 destinatarios/día, bloqueo de hasta 24 h al superarlo; cuenta personal (`support.google.com/mail/answer/22839`): más de 500 mensajes en un día, vuelve a enviar entre 1 y 24 h (la página no aclara SMTP).
- **Pendiente de validar en UI:** ❓ que cada flujo respete el interruptor como indica el código.

## EXT-105 · Diagnóstico de errores de la prueba y de los envíos

- **Página:** `docs/problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion.mdx` (árbol por síntoma A a I).
- **Hechos:** ✅ `Greeting never received` (10 s sin saludo; típico con `TLS` en 465, donde el servidor espera cifrado desde el inicio), `Connection timeout` (10 s sin conectar), `Invalid login: <respuesta>` (autenticación), `getaddrinfo ENOTFOUND <host>` (nombre sin resolver), `Hubo un error al enviar el email, por favor verique bien sus datos` (sin respuesta de ISPMAX). Los textos `535-5.7.8 Username and Password not accepted` y `534-5.7.9 Application-specific password required` son las respuestas habituales de Google; **no figuran en la ayuda oficial consultada** (`support.google.com/mail/?p=BadCredentials` no devolvió contenido legible).
- **Ayudas leídas:** `support.google.com/accounts/answer/6010255` (apps menos seguras: Google puede bloquear el acceso de aplicaciones que no cumplen sus estándares; para Workspace deja de admitir las que solo usan usuario y contraseña), `support.google.com/mail/answer/78892` (los mensajes enviados por SMTP se copian a «Enviados»).
- **Pendiente de validar en UI:** ❓ textos exactos tras la traducción; ❓ error de TLS al usar `SSL` en 587.

## EXT-106 · No aparece la opción de contraseñas de aplicación

- **Hechos:** ✅ (ayuda de Google, 185833) cuatro causas oficiales: 2SV desactivada, 2SV solo con llaves de seguridad, cuenta de trabajo/centro educativo/organización, Protección Avanzada. ISPMAX no ofrece «Iniciar sesión con Google». La ayuda consultada no describe un interruptor para que un administrador habilite la opción.
- **Pendiente de validar en UI:** ❓ comportamiento real en Workspace.

## EXT-107 · Correo con otro proveedor: qué pedir y a qué campo va

- **Página:** `docs/tareas/ajustes/configurar-el-correo-con-otro-proveedor.mdx`.
- **Hechos:** ✅ los cinco campos de EXT-102; decisión por puerto: 465 → `SSL`, 587 → `TLS` (tooltip de ISPMAX). **Usuario y remitente son el mismo campo** (`from: usuario`): un proveedor que use un usuario que no sea dirección de correo puede fallar. Las pruebas usan la contraseña tal cual; no hay OAuth.
- **Pendiente de validar en UI:** ❓ con cualquier proveedor real.

## EXT-108 · Microsoft 365 / Exchange Online y Outlook.com

- **Fuentes (2026-11-05):** `learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365` (servidor `smtp.office365.com`, puerto 587 recomendado o 25, TLS/STARTTLS habilitado con TLS 1.2 o 1.3; puerto 465 no sirve; usuario y contraseña del buzón; buzón con licencia; 10 000 destinatarios/día y 30 mensajes/minuto; «SMTP AUTH is disabled for organizations created after January 2020 but you can enable it per-mailbox»; error `5.7.60 SMTP; Client doesn't have permissions to send as this sender`; autenticación básica de ese envío «scheduled for deprecation»); `learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission` (SMTP AUTH: Microsoft 365 admin center → Users → Active users → usuario → Mail → Email apps → Manage email apps → casilla «Authenticated SMTP» → Save changes; opción de organización «Turn off SMTP AUTH protocol for your organization» en Exchange admin center → Mail flow; con security defaults SMTP AUTH ya está desactivado; una directiva de autenticación puede bloquear la básica); `.../deprecation-of-basic-authentication-exchange-online` (el fin de la básica también impide contraseñas de aplicación con apps sin 2SV; remite al anuncio vigente del calendario de SMTP AUTH); `techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835` (2026-01-27, actualizado 2026-01-29: sin cambios hasta diciembre de 2026; a finales de diciembre de 2026 desactivada por defecto en tenants existentes, los administradores podrán habilitarla; tenants nuevos tras diciembre de 2026: no disponible por defecto; fecha definitiva de retiro en el segundo semestre de 2027); `support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040` (Outlook.com: `smtp-mail.outlook.com`, 587, STARTTLS, «Outlook.com requires the use of Modern Auth / OAuth2»).
- **Decisión de la página:** se avisa del retiro con fechas atribuidas al anuncio de Microsoft y la advertencia de que ya cambió antes; ISPMAX no tiene OAuth.
- **Pendiente de validar en UI:** ❓ nada se probó con una cuenta de Microsoft; ❓ si `tls: { ciphers: 'SSLv3' }` del código (`BE:email/email.service.ts:31,187,247`) permite negociar con Exchange Online (TLS 1.3 no depende de esa opción en Node, pero no se probó).

## EXT-109 · Hosting (cPanel) y Zoho Mail

- **Fuentes (2026-11-05):** `docs.cpanel.net/cpanel/email/set-up-mail-client/` (cPanel » Home » Email » Email Accounts → «Connect Devices» → «Set Up Mail Client» → «Mail Client Manual Settings»; tabla «Secure SSL/TLS Settings (Recommended)»: SMTP 465, servidor = dominio de la cuenta si tiene certificado válido o el hostname del servidor; tabla «Non-SSL Settings (NOT Recommended)»: SMTP 587, `mail.example.com`; el proveedor de hosting puede desactivar la interfaz en WHM); `www.zoho.com/mail/help/zoho-smtp.html` (`smtp.zoho.com` 465 SSL para usuarios personales y organizaciones gratuitas; `smtppro.zoho.com` 465 SSL para organizaciones de pago con dominio; `smtp.zoho.com` 587 TLS; autenticación obligatoria; usuario = dirección completa; el remitente debe coincidir con la cuenta o un alias; contraseña específica para aplicaciones con 2FA; no usar el puerto 25; el servidor exacto depende del tipo de cuenta y del centro de datos).
- **No confirmado en la ayuda:** cómo habilitar SMTP/IMAP en Zoho; pasos para crear la contraseña específica de Zoho; límites diarios de Zoho y cPanel; hosts regionales de Zoho (la página no los lista).
- **Pendiente de validar en UI:** ❓ todo con cuentas reales.

## Hallazgos del dominio

- ✅ `Usuario/Correo` hace de usuario de inicio de sesión y de remitente a la vez; proveedores cuyo usuario no es una dirección (p. ej. identificadores de cPanel distintos del correo) pueden fallar.
- ✅ El error de la prueba se envía a un traductor externo sin tiempo de espera propio (`BE:email/email.service.ts:153-162`), por lo que el aviso rojo puede tardar si el traductor no responde.
