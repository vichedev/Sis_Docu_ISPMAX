# Inventario EXT — Servicios externos y cómo conseguir lo que ISPMAX pide fuera de ISPMAX

> Alcance: FE `pages/dashboard/emails/**`, `ajustes/{mensajeria,pasarelas-pago,firma-electronica,facturacion,inteligencia-artificial}`, `empresas/components/FormEmpresa.vue`, `Gestion-Red/{smartOLT,adminOLT,routers}/**/Api|FormRouter`, `boot/apiSearchPlaces.js`; BE `email/**`, `cloud-api/**`, `pasarelas-pago/payments-gateway.client.ts`, `firma-electronica/signature-gateway.client.ts`, `facturacion/factus/**`, `tasa-bcv/**`, `companies/master-suscripcion.service.ts`, `common/utils/mikrotik.service.ts`, `ia/**`. Código `main-2026-11-04` (BE `f0d1ebf7`, FE `e7d5d06b`).
>
> Convención de citas: `FE:` = `frontend-isp-main/src/`, `BE:` = `backend-isp-main/src/`. Todo lo marcado ✅ se leyó en código; la ayuda de terceros se consultó en la web el 2026-11-05 (fuentes en cada sección). Nada está marcado 🖥️ (sin instancia ni cuentas reales).

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| EXT-001 | Correo saliente (SMTP): servidor, puerto, usuario, contraseña, seguridad, prueba e interruptor | `/ajustes/mensajeria` → «Datos del servidor correo» (y `/email/edit/:email_id`) | `variables.config.servidor.correo` | completo |
| EXT-002 | Correo con Gmail / Google Workspace: contraseña de aplicación | `/ajustes/mensajeria` → «Datos del servidor correo» | `variables.config.servidor.correo` | completo (cuenta de Google ❓) |
| EXT-003 | Correo con Outlook / Microsoft 365 (sin página: ver motivo) | `/ajustes/mensajeria` → «Datos del servidor correo» | `variables.config.servidor.correo` | completo (cuenta de Microsoft ❓) |
| EXT-004 | WhatsApp Oficial · Número dedicado (Meta): credenciales | `/ajustes/mensajeria` → WhatsApp → «Oficial» | `variables.vincular.whatsApp` | completo (Meta ❓) |
| EXT-005 | WhatsApp Oficial · Coexistencia (Dualhook): credenciales | `/ajustes/mensajeria` → WhatsApp → «Oficial» | `variables.vincular.whatsApp` | completo (Dualhook ❓, ayuda no consultada) |
| EXT-006 | WhatsApp no oficial (QR) | `/ajustes/mensajeria` → WhatsApp → «No oficial» | `variables.vincular.whatsApp` | completo (servicio de WhatsApp ❓) |
| EXT-007 | PayPhone: Token y Store ID | `/ajustes/pasarelas-pago` → «PayPhone» | `ajuste.pasarelas-pago` | completo (PayPhone ❓) |
| EXT-008 | dLocal Go: API Key, Secret Key, país y ambiente | `/ajustes/pasarelas-pago` → «dLocal Go» | `ajuste.pasarelas-pago` | completo (dLocal Go ❓) |
| EXT-009 | Pago Internet: URL del sistema y API key (informativo) | `/ajustes/pasarelas-pago` → «Pago Internet» | `ajuste.pasarelas-pago` | completo |
| EXT-010 | Dátil (firma de contratos): API key y URL del portal | `/ajustes/firma-electronica` | `ajuste.firma-electronica` | completo (Dátil ❓) |
| EXT-011 | SRI (Ecuador): certificado `.p12` y clave de la empresa | `/ajustes/empresa` → «Cargar Certificado» | `index.empresa`, `ajuste.empresa` | completo (SRI ❓) |
| EXT-012 | Factus (Colombia): credenciales y datos del emisor | `/ajustes/facturacion` → «Factus» | `variables.facturacion` | completo (Factus ❓) |
| EXT-013 | SmartOLT: dominio, API KEY y webhook | `/smartOLT` → pestaña «API» | `smartOLT.index` | completo (SmartOLT ❓) |
| EXT-014 | AdminOLT: subdominio y API Key | `/adminOLT` → pestaña «API» | `adminOLT.index` | completo (AdminOLT ❓) |
| EXT-015 | Routers MikroTik: usuario/contraseña de API, puertos | `/router/add` | `router.add` | completo (router ❓) |
| EXT-016 | Mapas: Mapbox (token) y Esri (imagen satelital) | `/mapa-nap`, `/mapa-clientes` | `index.mapa`, `mapa-clientes.index` | completo |
| EXT-017 | Tasa BCV (Venezuela): fuente de la tasa | `/ajustes/facturacion` → tarjeta «Tasa BCV» | `variables.facturacion` | completo |
| EXT-018 | OpenAI: token y modelo | `/ajustes/inteligencia-artificial` | `ajuste.ia` | completo (OpenAI ❓) |
| EXT-019 | Servicio de licencia / suscripción (master) | botón «Licencia» de `/ajustes` | sin permiso propio | completo |
| EXT-020 | Ubicación de técnicos: geolocalización del dispositivo | `/mapa-nap` (capa «Técnicos») | `index.mapa` | completo |
| EXT-021 | PDF y conversión de documentos (LibreOffice, Puppeteer) | sin pantalla | — | completo |
| EXT-022 | Redis (colas Bull y caché) | sin pantalla | — | completo |
| EXT-023 | Avisos internos a Slack (operación de la instalación) | sin pantalla | — | completo |
| EXT-024 | Servicios auxiliares: MyMemory, consulta de IP pública, Cloudinary (logo del correo), CDN en PDF, prueba de velocidad | sin pantalla | — | completo |
| EXT-025 | Referencia pública «Servicios externos» | `docs/referencia/servicios-externos` | — | completo |
| EXT-026 | Preguntas frecuentes de correo y servicios externos | `docs/preguntas/correo-y-servicios-externos` | — | completo |

## EXT-001 · Correo saliente (SMTP)

- **Ruta UI / name:** `/ajustes/mensajeria` (pestaña «Configuración», tarjeta «Datos del servidor correo») · ruta oculta `/email/edit/:email_id` (`email.edit`).
- **Archivos:** FE: `FE:pages/dashboard/emails/components/FormEmail.vue`, `FE:pages/dashboard/emails/composables/useEmail.ts`, `FE:pages/dashboard/ajustes/mensajeria/IndexPage.vue:283-297` · BE: `BE:email/email.service.ts`, `BE:email/email.controller.ts`, `BE:email/dto/create-email.dto.ts`, `BE:email/entities/email.entity.ts`.
- **Para qué sirve:** ✅ el correo del ISP: comprobantes electrónicos (`sendComprobantes`), mensajes y notificaciones (`sendMessage`) y el correo de prueba (`testing`). Una sola configuración por instalación (`findOne` toma la primera fila).
- **Acceso:** ✅ tarjeta visible con `variables.config.servidor.correo` (`FE:pages/dashboard/ajustes/mensajeria/IndexPage.vue:283`). El backend solo exige `@Auth()` (`BE:email/email.controller.ts:7`).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Probar Configuración | Abre el diálogo «Correo del cliente»; **Enviar** manda el correo de prueba con los valores del formulario (guardados o no) | `variables.config.servidor.correo` | `POST /email/testing` | `FE:FormEmail.vue:43-70,187` |
  | Guardar | Guarda host, puerto, usuario, contraseña, seguridad | ídem | `PATCH /email/:id` | aviso `Cambios guardado exitosamente` (`BE:email/email.service.ts:337`) |
  | Usar correo para notificaciones (interruptor) | Guarda `activo` al instante | ídem | `PATCH /email/:id` | avisos «Correo activado como canal.» / «Correo desactivado: no se enviará por este canal.» (`FE:FormEmail.vue:30-41`) |

- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Host/servidor | texto (`trim`) | sí | columna `varchar(70)` | `FE:FormEmail.vue:108-112` |
  | Puerto | texto numérico | sí | solo dígitos (`allowOnlyNumber`) | sin valor por defecto |
  | Usuario/Correo | texto | sí | `varchar(75)` | es también el remitente (`from: usuario`, `BE:email/email.service.ts:36,192,252`) |
  | Contraseña | texto/contraseña (`trim`) | sí | `varchar(75)` | `trim` solo recorta los extremos; los espacios intermedios se conservan |
  | Seguridad | `SSL`, `TLS`, `NONE` | sí | consejo: «SSL → puerto 465 · TLS/STARTTLS → 587 · NONE → sin cifrado» (`FE:FormEmail.vue:174`) | `secure` solo con SSL; `requireTLS` solo con TLS (`BE:email/email.service.ts:26-27`) |
  | Correo del cliente (diálogo) | email | sí | solo para la prueba | destinatario de la prueba |

- **Reglas de negocio (backend):** ✅
  - Tiempos de espera: 10 s en la prueba (`greetingTimeout`, `connectionTimeout`, `dnsTimeout`, `BE:email/email.service.ts:28-30`) y 12 s en los envíos reales (`:184-186,244-246`).
  - Con `NONE`, nodemailer sigue usando STARTTLS si el servidor lo anuncia (`secure:false`, `requireTLS:false`; comportamiento de `node_modules/nodemailer/lib/smtp-connection/index.js:1303`).
  - Error de la prueba: el mensaje de nodemailer se traduce inglés→español con `api.mymemory.translated.net` (`BE:email/email.service.ts:153-162`); si falla la traducción, se devuelve el original. Se lanza `BadRequestException(msgTraducido)`.
  - Envíos reales: error `EDNS` → `Error: getaddrinfo ENOTFOUND <host>`; cualquier otro → `Fallo al enviar el correo` (`:222-225,269-272`).
  - El interruptor apagado → `El canal de correo está desactivado` (`:234-235`), salvo envío manual (`omitirInterruptor`) y comprobantes electrónicos.
  - El correo de recuperación de acceso no usa esta configuración: `sendDesdeSistema` lee `MAIL_HOST/PORT/USER/PASSWORD` del entorno (`:276-289`).
- **Efectos secundarios externos:** servidor SMTP del proveedor; MyMemory (traducción del error); imagen del logo del correo de prueba en Cloudinary (`:60`).
- **Mensajes de error/éxito (texto exacto):** `Correo Enviado Exitosamente` (BE, prueba y envíos); `Hubo un error al enviar el email, por favor verique bien sus datos` (FE, cuando la petición no obtiene respuesta, `FE:FormEmail.vue:64`); si el servidor responde sin `message`: `<code> - <command>` (`:62`); asunto de la prueba `Prueba de correo exitosa - Sistema ISPMAX` (`BE:email/email.service.ts:38`).
- **Preguntas probables de usuarios:** «dónde saco el código de aplicación de Gmail», «contraseña de app gmail», «no puedo configurar el correo», «qué puerto uso con Gmail», «el correo de prueba falla», «puedo usar Outlook», «uso el correo de mi hosting».
- **Pendiente de validar en UI:** ❓ aspecto del aviso de error con un mensaje traducido real; que MyMemory responda desde el servidor del ISP (límites de uso del servicio gratuito).

## EXT-002 · Correo con Gmail / Google Workspace (contraseña de aplicación)

- **Ruta UI / name:** `/ajustes/mensajeria` · «Datos del servidor correo».
- **Archivos:** FE: ídem EXT-001 · BE: ídem EXT-001. Páginas: `docs/tareas/ajustes/configurar-el-correo-con-gmail.mdx`, `docs/problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion.mdx`.
- **Para qué sirve:** conectar el correo de ISPMAX con Gmail o Google Workspace usando una contraseña de aplicación (el código solo autentica con usuario y contraseña; no hay OAuth).
- **Valores a cargar:** host `smtp.gmail.com`; puerto 587 + `TLS`, o 465 + `SSL`; usuario = dirección completa; contraseña = contraseña de aplicación de 16 caracteres.
- **Fuentes de Google (consultadas el 2026-11-05):**
  - Contraseñas de aplicación (`support.google.com/accounts/answer/185833`): se crean en `https://myaccount.google.com/apppasswords`; requieren verificación en dos pasos; pueden no aparecer en cuentas de trabajo/centro educativo, con verificación solo por claves de seguridad o con Protección Avanzada; al cambiar la contraseña de la cuenta se revocan; «Cada contraseña de aplicación solo se puede comprobar una vez». **La página no da los pasos ni los nombres de campo de la creación, ni dice si los espacios del código importan.**
  - Verificación en dos pasos (`support.google.com/accounts/answer/185839`): `https://myaccount.google.com/signinoptions/two-step-verification`.
  - SMTP de Workspace (`knowledge.workspace.google.com/admin/gmail/send-email-from-a-printer-scanner-or-app`): `smtp.gmail.com`, SSL 465, TLS 587, usuario con la dirección completa y «contraseña de la app», límite de 2 000 mensajes por día, «apps menos seguras» sin soporte en Workspace desde el 2025-05-01 (hay que usar OAuth).
  - Gmail para clientes (`support.google.com/mail/answer/7104828`): `smtp.gmail.com`, TLS/STARTTLS 587; con verificación en dos pasos se puede probar una contraseña de aplicación. (La ayuda de Gmail desaconseja las contraseñas de aplicación cuando existe «Iniciar sesión con Google».)
  - Errores típicos de Gmail (foros y guías de terceros, no la ayuda oficial): `535-5.7.8 Username and Password not accepted`, `534-5.7.9 Application-specific password required`. nodemailer arma `Invalid login: <respuesta del servidor>` (`node_modules/nodemailer/lib/smtp-connection/index.js:1577`), `Greeting never received` y `Connection timeout` (`:718,237`).
- **Efectos secundarios externos:** Google (SMTP).
- **Preguntas probables de usuarios:** «código de aplicación gmail», «contraseña de aplicación», «gmail no acepta la contraseña», «no me aparece contraseñas de aplicación en google», «cuántos correos puedo enviar con gmail».
- **Pendiente de validar en UI:** ❓ pasos y nombres de campo de `myaccount.google.com/apppasswords` (la ayuda oficial no los describe); ❓ si Google acepta el código con espacios; ❓ textos exactos de los avisos de Google tras la traducción de MyMemory; ❓ comportamiento con cuentas de Workspace con restricciones del administrador.

## EXT-003 · Correo con Outlook / Microsoft 365 (decisión: sin página)

- **Ruta UI / name:** `/ajustes/mensajeria` · «Datos del servidor correo».
- **Para qué sirve:** documentar por qué no hay una guía paso a paso.
- **Hechos:** ✅ el código solo autentica con usuario y contraseña (no OAuth). Microsoft (`learn.microsoft.com/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission` y `.../how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365`, consultadas el 2026-11-05): servidor `smtp.office365.com`, puerto 587 con STARTTLS; SMTP AUTH puede estar desactivado en la organización o por buzón (casilla «Authenticated SMTP» en el centro de administración de Microsoft 365); no es compatible con los valores de seguridad predeterminados de Microsoft Entra; la autenticación básica de ese envío está «programada para su retiro» y Microsoft recomienda OAuth. Cuentas personales (Outlook.com, Hotmail): no consultadas.
- **Decisión:** no se escribe página. La pregunta se responde en `docs/preguntas/correo-y-servicios-externos.mdx` y en la tabla de referencia.
- **Pendiente de validar en UI:** ❓ si el SMTP AUTH sigue habilitado en la cuenta del cliente; ❓ cuentas personales.

## EXT-004 · WhatsApp Oficial · Número dedicado (Meta)

- **Ruta UI / name:** `/ajustes/mensajeria` → WhatsApp → pestaña «Oficial» → modo «Número dedicado (Meta)».
- **Archivos:** FE: `FE:pages/dashboard/ajustes/mensajeria/components/WhatsappCloudApi.vue` (modos en `:24-27`, campos en `:628-654`) · BE: `BE:cloud-api/cloud-api.service.ts` (`PERMISOS_WA` en `:1099`; rechazo de llaves `dh_live_` en `:193,540`).
- **Para qué sirve:** ✅ guía de «conseguir» las credenciales en Meta: `docs/tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta.mdx`.
- **Qué pide ISPMAX:** Phone Number ID, WABA ID, Access Token (usuario del sistema, empieza con `EAA`, permisos `whatsapp_business_messaging` y `whatsapp_business_management`), App Secret opcional, Verify Token (lo genera ISPMAX).
- **Fuente de Meta (consultada el 2026-11-05):** `developers.facebook.com/docs/whatsapp/cloud-api/get-started`: Business Settings → System users → Add → Assign Assets (Manage app, Manage WhatsApp Business accounts) → Generate token con `whatsapp_business_messaging`, `whatsapp_business_management` y `business_management`; el panel «API Setup» muestra el «Messaging account ID». La página no dice dónde se muestra el Phone Number ID ni el plazo de 24 h del token de prueba (eso lo dice el panel de ISPMAX).
- **Pendiente de validar en UI:** ❓ rutas y nombres actuales de las pantallas de Meta; ❓ cómo se ve el aviso «El token es temporal…» con un token real.

## EXT-005 · WhatsApp Oficial · Coexistencia (Dualhook)

- **Qué pide ISPMAX:** Phone Number ID, WABA ID y como Access Token la «Outbound API key» de Dualhook (`dh_live_…`); en Dualhook, «Webhook Override» con la URL y el Verify Token de ISPMAX (`FE:pages/dashboard/ajustes/mensajeria/components/WhatsappCloudApi.vue:476,649,675`).
- **Decisión:** no hay página de «conseguir»: no se consultó la ayuda de Dualhook (`dualhook.com`). Aparece en la tabla de referencia y en la guía de Mensajería.
- **Pendiente de validar en UI:** ❓ todo lo que ocurre en la consola de Dualhook.

## EXT-006 · WhatsApp no oficial (QR)

- **Qué pide ISPMAX:** nada fuera de ISPMAX salvo un teléfono con WhatsApp; el servicio de WhatsApp (`HOST_API_WHATSAPP`) lo aporta la instalación. Cubierto por `docs/tareas/mensajeria/vincular-whatsapp.mdx`.

## EXT-007 · PayPhone

- **Ruta UI / name:** `/ajustes/pasarelas-pago` → «PayPhone» · `ajuste.pasarelas-pago`.
- **Archivos:** FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/PayphoneConfig.vue` (`label="Token"` `:332`, `label="Store ID"` `:355`) · BE: `BE:pasarelas-pago/payments-gateway.client.ts` (las credenciales viven cifradas en el servicio de pagos, no en ISPMAX).
- **Para qué sirve:** guía de «conseguir» el Token y el Store ID: `docs/tareas/ajustes/conseguir-el-token-y-el-store-id-de-payphone.mdx`.
- **Fuente de PayPhone (consultada el 2026-11-05):** `docs.payphone.app/configuracion-de-ambiente-y-credenciales` y `docs.payphone.app/api-link`: consola `https://appdeveloper.payphonetodoesposible.com/`; «+ Agregar»; campos Nombre, Descripción, Categoría, Plataforma de Desarrollo, Tipo de Aplicación = API; Guardar; pestaña «Credenciales» con Token y StoreId; ambientes PRUEBAS/PRODUCCIÓN. No se confirma requisito de cuenta Business.
- **Mensajes (texto exacto, FE):** `Credenciales guardadas`, `Payphone aceptó las credenciales`, `Payphone rechazó las credenciales`, `Completá el token y el Store ID`.
- **Pendiente de validar en UI:** ❓ pasos reales en PayPhone Developer; ❓ cómo se elige PRUEBAS/PRODUCCIÓN y si ISPMAX distingue ambientes de PayPhone (no se vio ese selector en el panel).

## EXT-008 · dLocal Go

- **Ruta UI / name:** `/ajustes/pasarelas-pago` → «dLocal Go» · `ajuste.pasarelas-pago`.
- **Archivos:** FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/DlocalGoConfig.vue` (`API Key` `:205`, `Secret Key` `:217`, `País desde el que se cobra` `:242`, banner del ambiente de pruebas) · BE: ídem EXT-007.
- **Para qué sirve:** `docs/tareas/ajustes/conseguir-la-api-key-y-la-secret-key-de-dlocal-go.mdx`.
- **Fuente de dLocal Go (consultada el 2026-11-05):** `docs.dlocalgo.com/integration-api`: panel de producción `https://dashboard.dlocalgo.com/` y de pruebas `https://dashboard-sbx.dlocalgo.com/`; Integrations → API Integration → ventana «Install dLocal Go on your site» → API Key y Secret Key (en pruebas, «Sandbox API Key» y «Sandbox Secret Key»); las claves de producción solo funcionan con la cuenta activada.
- **Mensajes (texto exacto, FE):** `Credenciales guardadas`, `dLocal Go aceptó las credenciales`, `dLocal Go rechazó las credenciales`, `Completá la API Key y la Secret Key`, `Elegí el país desde el que se cobra`.
- **Pendiente de validar en UI:** ❓ pasos reales en el panel de dLocal Go.

## EXT-009 a EXT-024 (sin página propia; solo tabla de referencia)

- **EXT-009 Pago Internet:** pestaña informativa con «URL del sistema» y «API key» (`FE:pages/dashboard/ajustes/pasarelas-pago/components/PagoInternetConfig.vue`); la afiliación es en el sitio del proveedor. Cubierto por `/guia/pasarelas-pago`.
- **EXT-010 Dátil:** campos «API key» y «URL del portal» (`FE:pages/dashboard/ajustes/firma-electronica/components/DatilConfig.vue:267-285`); el propio panel dice que la API key «se genera en Dátil: Admin → Configuración → Integración → Generar API key» y se muestra una sola vez. Las credenciales viven cifradas en el servicio de firma (`BE:firma-electronica/signature-gateway.client.ts`). Ayuda oficial de Dátil (`datil.dev`) **no consultada**. Facturas migradas desde otro sistema abren la vista de Dátil (`FE:pages/dashboard/clientes/components/editar/PagoItem.vue:192-194`).
- **EXT-011 SRI:** «Cargar Certificado» (`.p12`) y «Clave Certificado», más «Fecha Exp. Firma Electrónica» (`FE:pages/dashboard/empresas/components/FormEmpresa.vue:242-317`); el `.p12` se envía al servicio de facturación (`BE:firma-electronica/firma-isp.service.ts:99-100`; `HOST_API_FACTURACION`). Dónde se obtiene el `.p12` (entidad certificadora) y cómo operar en el SRI: **no consultado**.
- **EXT-012 Factus:** «Ambiente», «Client ID», «Client Secret», «Email (usuario Factus)», «Contraseña» (`FE:pages/dashboard/ajustes/facturacion/components/FactusConfig.vue:168-211`); el panel enlaza `factus.com.co` y `developers.factus.com.co`. Cubierto por `docs/tareas/facturacion/configurar-la-integracion-con-factus.mdx`. Ayuda de Factus **no consultada** para los pasos fuera de ISPMAX.
- **EXT-013 SmartOLT:** `dominio` (placeholder `https://mi-dominio.smartolt.com`) y API (`FE:pages/dashboard/Gestion-Red/smartOLT/components/Api/FormApi.vue`). El panel del webhook dice: «En SmartOLT entra a General › API key y toca Editar en tu API key», pegar la URL en el panel «Webhook», marcar «ONU status changed», «PON outage started», «PON outage ended» y «OLT statuses out of date», copiar el «Signing secret» (`whsec_…`) y probar con «Send test event» (`FE:…/Api/WebhookSmartOlt.vue`; funcionalidad INC-011). Ayuda oficial de SmartOLT **no encontrada** (3 intentos): solo hay texto del propio panel de ISPMAX.
- **EXT-014 AdminOLT:** «Subdominio» (acepta `miempresa` o `miempresa.adminolt.com`) y «API Key» (`FE:pages/dashboard/Gestion-Red/adminOLT/components/Api/FormApi.vue`). Ayuda oficial de AdminOLT **no consultada**.
- **EXT-015 MikroTik:** «Usuario (API)», «Contraseña (API)», «Version RouterOS», «Puerto API» (8728), «Puerto SSL» (443), «Detrás de NAT» (`FE:pages/dashboard/Gestion-Red/routers/components/FormRouter.vue`). Al agregar o reparar, si el router no está detrás de NAT, ISPMAX averigua la IP pública del servidor con `api.ipify.org`, `ifconfig.me` o `icanhazip.com` (`BE:common/utils/mikrotik.service.ts:150-175`).
- **EXT-016 Mapas:** `access_token` de Mapbox: tres pantallas lo leen de `VITE_MAPBOX_TOKEN` (`mapa-clientes/IndexPage.vue:28`, `mapa-nap/IndexPage.vue:94`, `portal-cliente/.../PruebaVelocidad.vue:73`) y otros componentes traen uno incluido en el código (`FE:components/ModalMapBox.vue:46`, `FE:boot/apiSearchPlaces.js:8`, `Maps/MapVistaAdminOlt.vue`). No hay pantalla donde la persona usuaria cargue un token. Imagen satelital: `server.arcgisonline.com` (Esri) por defecto o Mapbox (`mapa-nap/IndexPage.vue:72`). Rutas por calles: API Directions de Mapbox (`mapa-nap/IndexPage.vue:2169,3657`).
- **EXT-017 Tasa BCV:** la fuente es la variable de entorno `API_BCV` del servidor; lee `promedio` (`BE:tasa-bcv/tasa-bcv.service.ts:20,65`). Sin pantalla de credenciales.
- **EXT-018 OpenAI:** «Token de OpenAI (sk-...)» y «Modelo» (opciones `gpt-4o-mini`, `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-4o`, `gpt-6-luna`; se puede escribir otro) en `FE:pages/dashboard/ajustes/inteligencia-artificial/IndexPage.vue:12,186,209`; el token se cifra en el servidor (`BE:ia/ia-crypto.util.ts`). Botones «Quitar token», «Verificar», «Guardar». Aún sin página en `docs/` al 2026-11-05.
- **EXT-019 Licencia:** `HOST_API_MASTER` + `MASTER_SERVICE_TOKEN` del entorno (`BE:companies/master-suscripcion.service.ts:78-79,185-186`); con `ES_INSTANCIA_GESTION=true` se desactiva (`:54`). Cubierto por `/guia/licencia`.
- **EXT-020 GPS:** `navigator.geolocation.watchPosition` en el dispositivo del técnico (`FE:composables/useUbicacion.js:199-214`, `FE:composables/useLatidoUbicacion.js`); se envía a `POST /ubicacion-tecnicos`. Cubierto por `/guia/ubicacion-tecnicos`.
- **EXT-021 PDF:** `LIBREOFFICE_PATH_*`/`LIBREOFFICE_CWD_*` del entorno para convertir `.docx` a PDF; Puppeteer para PDF desde HTML; las plantillas HTML cargan Bootstrap, JsBarcode y fuentes desde CDN (`BE:comprobantes-electronicos/plantillas/factura.ts:35-37`, `BE:pagos/PlantillaFacturaAbono.ts:65-68`).
- **EXT-022 Redis:** `REDIS_HOST`/`REDIS_PORT` del entorno.
- **EXT-023 Slack:** `URL_SLACK` del entorno; `axios.post` con avisos de cortes y errores (`BE:app-queue.processor.ts:107,613`). Operación interna de la instalación; no se publica en la tabla de referencia.
- **EXT-024 Auxiliares:** MyMemory (traducción del error del correo de prueba), consulta de IP pública (EXT-015), Cloudinary (imagen del logo en el correo de prueba, `BE:email/email.service.ts:60`), prueba de velocidad del portal (`speed.cloudflare.com`, `FE:pages/portal-cliente/modules/consumo/PruebaVelocidad.vue:119`), enlaces a Google Maps y `wa.me`.

## EXT-025 · Referencia pública «Servicios externos»

- **Página:** `docs/referencia/servicios-externos.mdx`. Dos tablas (servicios con pantalla y servicios sin pantalla) y una lista de auxiliares. Enlaza solo páginas existentes.

## EXT-026 · Preguntas frecuentes de correo y servicios externos

- **Página:** `docs/preguntas/correo-y-servicios-externos.mdx`. 16 preguntas; las de Gmail son las que no tenían respuesta («Sin resultados para gmail»).

## Hallazgos del dominio

- El buscador del sitio no tenía ninguna página con «gmail», «contraseña de aplicación» ni «código de aplicación» (grep en `docs/` al 2026-11-05: 0 coincidencias).
- `docs/guia/mensajeria.mdx` solo dice «SSL suele usar 465 y TLS 587» y «Contraseña: clave de la cuenta»; no explica la contraseña de aplicación de Gmail.
- El error de la prueba de correo pasa por un traductor en línea (MyMemory): la redacción visible puede variar y depende de que ese servicio responda.
- El aviso `Fallo al enviar el correo` de los envíos reales no incluye el motivo; solo **Probar Configuración** muestra el detalle.
- Ayudas oficiales no halladas o no consultadas: SmartOLT, AdminOLT, Dátil, Dualhook, Factus, SRI (certificado `.p12`).
