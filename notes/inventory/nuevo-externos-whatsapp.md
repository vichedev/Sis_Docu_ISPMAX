# Inventario EXT (WhatsApp Oficial, Dualhook y OpenAI) — cómo conseguir lo que ISPMAX pide fuera de ISPMAX

> Alcance: FE `pages/dashboard/ajustes/mensajeria/{IndexPage.vue, components/WhatsappCloudApi.vue, components/PerfilNegocioWa.vue}`, `pages/dashboard/ajustes/bot/components/message/IndexMessages.vue` (aviso de abrir la app), `pages/dashboard/ajustes/inteligencia-artificial/IndexPage.vue`; BE `cloud-api/{cloud-api.controller.ts, cloud-api.service.ts, dto/save-credentials.dto.ts}`, `ia/{ia.controller.ts, ia.service.ts, ia-crypto.util.ts, dto/ia-config.dto.ts}`. Código `main-2026-11-04`.
>
> Convención de citas: `FE:` = `frontend-isp-main/src/`, `BE:` = `backend-isp-main/src/`. ✅ = leído en código. Nada está marcado 🖥️ (sin instancia ni cuentas reales). La ayuda oficial de terceros se leyó en la web el 2026-11-05 (fuentes en cada sección); nada se probó con cuentas reales de Meta, Dualhook ni OpenAI.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| EXT-120 | Elegir entre Coexistencia (Dualhook) y Número dedicado (Meta): qué exige y qué permite ISPMAX en cada modo | `/ajustes/mensajeria` → WhatsApp → «Oficial» (selector de modo) | `variables.vincular.whatsApp` | completo |
| EXT-121 | Meta: Phone Number ID y WABA ID (Messaging account ID) | `/ajustes/mensajeria` → «Oficial» → «Número dedicado (Meta)» → «Phone Number ID», «WABA ID» | `variables.vincular.whatsApp` | completo (Meta ❓) |
| EXT-122 | Meta: Access Token permanente de un usuario del sistema | ídem → «Access Token» | `variables.vincular.whatsApp` | completo (Meta ❓) |
| EXT-123 | Meta: App Secret (opcional) | ídem → bloque «Webhook de tu app de Meta» → «App Secret (opcional)» | `variables.vincular.whatsApp` | completo (Meta ❓) |
| EXT-124 | Meta: Verify Token y webhook de la app (Callback URL) | ídem → bloque «Webhook de tu app de Meta» → «Webhook URL», «Verify Token» | `variables.vincular.whatsApp` | completo (Meta ❓) |
| EXT-125 | Meta: registrar el número con el PIN de 6 dígitos | ídem → botón «Registrar» → «Registrar el número en la Cloud API» | `variables.vincular.whatsApp` | completo (Meta ❓) |
| EXT-126 | Dualhook: crear la cuenta y conectar el número de la app WhatsApp Business (Embedded Signup) | `/ajustes/mensajeria` → «Oficial» → «Coexistencia (Dualhook)» | `variables.vincular.whatsApp` | completo (Dualhook ❓) |
| EXT-127 | Dualhook: Outbound API key (`dh_live_…`) | ídem → «Access Token» | `variables.vincular.whatsApp` | completo (Dualhook ❓) |
| EXT-128 | Dualhook: Phone Number ID y WABA ID de la conexión | ídem → «Phone Number ID», «WABA ID» | `variables.vincular.whatsApp` | parcial (la ayuda de Dualhook no dice la pantalla) |
| EXT-129 | Dualhook: Webhook Override (URL y Verify Token de ISPMAX) | ídem → bloque «Webhook para Dualhook» | `variables.vincular.whatsApp` | completo (Dualhook ❓) |
| EXT-130 | OpenAI: crear la clave de API | `/ajustes/inteligencia-artificial` → «Token de OpenAI (sk-...)» | `ajuste.ia`, `bot.config.ver` | completo (OpenAI ❓) |
| EXT-131 | OpenAI: saldo (créditos), límites y quién cobra | ídem | `ajuste.ia`, `bot.config.ver` | completo (OpenAI ❓) |
| EXT-132 | ISPMAX: pegar el token, elegir Modelo, Verificar y Guardar | ídem → «Modelo», «Verificar», «Guardar» | `ajuste.ia`, `bot.config.ver` | completo |
| EXT-133 | ISPMAX: Quitar token y sus efectos | ídem → «Quitar token» | `ajuste.ia`, `bot.config.ver` | completo |

## EXT-120 · Elegir entre Coexistencia (Dualhook) y Número dedicado (Meta)

- **Ruta UI / name:** `/ajustes/mensajeria` → tarjeta «WhatsApp» → pestaña «Oficial» → selector `MODOS` (`FE:pages/dashboard/ajustes/mensajeria/components/WhatsappCloudApi.vue:24-27`).
- **Página:** `docs/tareas/ajustes/elegir-entre-coexistencia-y-numero-dedicado.mdx`.
- **Qué hace cada modo en el código (✅):**
  - Una sola conexión oficial por empresa; el modo se guarda en `wa_cloud_modo` (`BE:cloud-api/cloud-api.service.ts:307-309`, `:341`).
  - El token decide el destino: `EAA…` → `graph.facebook.com`; cualquier otro → relay de Dualhook (`:192-194`, `:239-243`). En modo dedicado se rechaza una llave que no empieza con `EAA` (`:538-542`).
  - Solo dedicado: llamadas (`:836-899`), perfil del negocio (`:986-989`), bloquear números (`:924-974`, `perfilDisponible`), registrar con PIN (`:1215-1240`), App Secret/firma del webhook (`:1247-1257`), suscripción automática del webhook (`:557-560`, `:1160-1208`), diagnóstico del token y del webhook (`:642-704`), formularios de WhatsApp del bot (`:1481-1484`), consumo y costo en el panel (`:2160-2167`: con la llave de Dualhook responde «El consumo y el costo no se pueden consultar con la llave de Dualhook…»).
  - Solo coexistencia: overflow con el no oficial y tope diario (`:348`, `:412`, `:427`, `:441`; `FE:…/WhatsappCloudApi.vue:782-820`); aviso de abrir la app (`FE:pages/dashboard/ajustes/bot/components/message/IndexMessages.vue:265-290`, `:1512-1517`, 10 días; «Meta desconecta WhatsApp Oficial si pasan 14 días sin abrirla»); límite de cambios de plantillas de Dualhook (`BE:…:196-237`, `:157-163`).
  - Al guardar en dedicado se apaga el overflow (`:525-529`). Al cambiar de modo se exige pegar el token del modo nuevo (`FE:…:303-309`). Si cambia el WABA ID se resincronizan las plantillas (`BE:…:532-534`, `:566-572`).
  - «Limpiar credenciales» solo borra los datos de ISPMAX (`BE:…:577-588`); no desconecta nada en Dualhook ni en Meta.
- **Fuentes oficiales (consultadas el 2026-11-05):** Meta, coexistencia (`developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users`: versión 2.24.17 o superior de la app; sin llamadas de voz/video por la API; listas de difusión, mensajes temporales, vistas únicas y ubicación en vivo desactivados en chats individuales; grupos no sincronizados; 20 mensajes por segundo; desconexión por inactividad de ~14 días; mensajes de la app gratis); Meta, números (`…/business-phone-numbers/phone-numbers`: «Numbers already in use with WhatsApp cannot be registered unless they are deleted first»); Meta, llamadas (`…/calling`: número en Cloud API y no en la app, límite de al menos 2.000 destinatarios únicos diarios, campo `calls`); Meta, precios (`developers.facebook.com/docs/whatsapp/pricing`); Dualhook (`dualhook.com/docs/coexistence`: perfil por la API devuelve 409 en coexistencia, sin Calling API, 13 días de latido; `dualhook.com/docs/pricing`: planes por conexiones, prueba de 14 días con método de pago, sin cargo por mensaje).
- **Pendiente de validar en UI:** ❓ cifras de precio y condiciones de Meta/Dualhook (cambian); ❓ comportamiento real de la desconexión a los 14 días.

## EXT-121 · Meta: Phone Number ID y WABA ID

- **Ruta UI / name:** `/ajustes/mensajeria` → «Oficial» → «Número dedicado (Meta)» → campos «Phone Number ID» y «WABA ID» (`FE:…/WhatsappCloudApi.vue:626-638`; los dos son obligatorios: aviso «Completa Phone Number ID y WABA ID.» en `:299-302`).
- **Página:** `docs/tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta.mdx`.
- **Qué hace el backend (✅):** guarda ambos en la empresa (`BE:…:521-522`), y valida contra Meta: número (`display_phone_number,verified_name,…`) y WABA (`fields=name`); si el número responde y la WABA no, `wabaValid=false` y el banner «El número responde, pero el WABA ID no. Las plantillas no funcionarán hasta corregirlo.» (`:649-699`; `FE:…:562-572`). Errores de Meta sin traducir en «Guardado, pero las credenciales no responden: …» (`FE:…:361-365`).
- **Fuentes oficiales (2026-11-05):** `…/whatsapp/get-started` (panel «API Setup»; muestra el «Messaging account ID»; el «Phone number ID» no tiene etiqueta nombrada en la página, aparece como `phone_number_id` en el webhook); `…/whatsapp-business-accounts/` («Your existing WABA ID now identifies your Messaging account»; **Settings → Accounts → Messaging accounts / WhatsApp accounts**); `…/business-phone-numbers/phone-numbers` (**WhatsApp Manager → Account tools → Phone numbers**; ID por la API); `…/solution-providers` (no usada).
- **Pendiente de validar en UI:** ❓ etiqueta exacta del Phone number ID en el panel; ❓ dónde se ve el WABA ID en WhatsApp Manager hoy.

## EXT-122 · Meta: Access Token permanente (usuario del sistema)

- **Ruta UI / name:** campo «Access Token» (`FE:…/WhatsappCloudApi.vue:639-659`; pista «Token de un usuario del sistema de Meta (empieza con EAA)»).
- **Qué hace el backend (✅):** exige permisos `whatsapp_business_messaging` y `whatsapp_business_management` (`BE:…:1099`), y considera permanente solo el token sin `expires_at` (`:1105-1126`); si vence, el punto ámbar «El token es temporal y vence el …: usa el de un usuario del sistema» (`FE:…:197-211`). Faltan permisos: «Al token le faltan permisos: …». Vacío al guardar no cambia el token guardado.
- **Fuentes oficiales (2026-11-05):** `…/whatsapp/get-started` y `…/whatsapp/access-tokens` (Business Settings → **System users** → **Add** → **Assign assets** → **Manage app** / **Manage WhatsApp Business accounts** (Full control) → **Generate token** → `business_management`, `whatsapp_business_management`, `whatsapp_business_messaging`; el rol puede ser Admin o Employee); `developers.facebook.com/docs/business-management-apis/system-users/install-apps-and-generate-tokens/` (tokens «Nunca vence» o «Válido por 60 días»; algunas empresas están obligadas a tokens con vencimiento); `developers.facebook.com/blog/post/2022/12/05/auth-tokens/` (el token de prueba del panel «expires in less than 24 hours»).
- **Pendiente de validar en UI:** ❓ si hoy Business Settings ofrece «Nunca vence» para este permiso; ❓ qué hace ISPMAX con un token de 60 días a medio vencer (se lee `expires_at` en cada verificación).

## EXT-123 · Meta: App Secret (opcional)

- **Ruta UI / name:** bloque «Webhook de tu app de Meta» → «App Secret (opcional)» (`FE:…/WhatsappCloudApi.vue:751-777`; `maxlength` 32; pista «En tu app de Meta: Configuración › Básica. Se aplica al guardar la conexión»).
- **Qué hace el backend (✅):** validación `^([0-9a-fA-F]{32})?$` con «El App Secret son 32 caracteres (letras a-f y números)» (`BE:cloud-api/dto/save-credentials.dto.ts:30-34`); con el secreto guardado, ISPMAX comprueba `X-Hub-Signature-256` (HMAC-SHA256 del cuerpo) y responde 401 a lo que no coincide (`BE:cloud-api/cloud-api.controller.ts:58-62`; `BE:…service:1247-1257`). Solo en dedicado.
- **Fuentes oficiales (2026-11-05):** `developers.facebook.com/docs/graph-api/webhooks/getting-started` y `…/webhooks/create-webhook-endpoint` (cabecera `X-Hub-Signature-256`; validar con el app secret); `developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings` (el app secret está en la configuración básica; «If your App Secret is compromised, you should reset it immediately»).
- **Pendiente de validar en UI:** ❓ etiquetas y botones exactos para mostrar el App secret.

## EXT-124 · Meta: Verify Token y webhook de la app

- **Ruta UI / name:** bloque «Webhook de tu app de Meta» (en coexistencia «Webhook para Dualhook») → «Webhook URL» (solo lectura, copiar), «Verify Token» (editable), «Generar otro», «Guardar token» (`FE:…/WhatsappCloudApi.vue:664-747`).
- **Qué hace el backend (✅):** URL = `DOMINIO` + `/api/cloud-api/webhook` (`BE:…:312-315`; si falta `DOMINIO` el campo dice «Falta configurar el dominio del servidor», `FE:…:687`); Verify Token se genera al primer `GET /cloud-api/config` (24 bytes hex = 48 caracteres, `BE:…:283-285`, `:329-337`) y se acepta entre 8 y 120 caracteres imprimibles sin espacios (`:291-304`); Meta lo usa solo en el `GET` de verificación (`BE:…controller:45-56`). En dedicado, al guardar la conexión ISPMAX suscribe la WABA con `override_callback_uri` (`BE:…service:1160-1208`) y avisa «Conectado, pero no se pudo suscribir el webhook: …» o el aviso largo del campo «messages». Estado: «Los mensajes llegan a ISPMAX (webhook suscrito)» / «Los mensajes van a otra URL …» / «Hay N apps suscritas …» (`FE:…:213-229`).
- **Fuentes oficiales (2026-11-05):** `…/webhooks/create-webhook-endpoint` (App Dashboard → **WhatsApp → Configuration**; con el caso de uso de WhatsApp, **Use cases → Customize → Configuration**; campos **Callback URL** y **Verify token**; Meta envía un `GET` con `hub.mode`, `hub.challenge`, `hub.verify_token` y espera 200 con el desafío; certificado TLS válido, sin autofirmados); `…/webhooks/getting-started`.
- **Pendiente de validar en UI:** ❓ botón exacto «Verify and Save» (la página de Meta no lo nombra; sí lo hace la sección de Embedded Signup del caso de uso).

## EXT-125 · Meta: registrar el número con el PIN

- **Ruta UI / name:** punto ámbar «El número no está registrado en la Cloud API» + botón «Registrar» → diálogo «Registrar el número en la Cloud API» con campo «PIN (6 dígitos)» (`FE:…/WhatsappCloudApi.vue:414-445`).
- **Qué hace el backend (✅):** `POST /cloud-api/registrar-numero` → `POST {PHONE_NUMBER_ID}/register` con `pin` (`BE:…service:1215-1240`); «Guarda primero el Phone Number ID y el Access Token.» sin ellos; solo dedicado («El registro del número es solo para número dedicado.»); código 133016 → «Meta bloqueó el registro por demasiados intentos (10 en 72 h). Espera y vuelve a intentarlo.»; otros → «No se pudo registrar el número: …»; DTO «El PIN son 6 dígitos» (`dto/save-credentials.dto.ts:36-39`). Éxito: «Número registrado en la Cloud API.».
- **Fuentes oficiales (2026-11-05):** `…/business-phone-numbers/registration` (POST `PHONE_NUMBER_ID/register` con `messaging_product` y `pin`; si el número ya tiene verificación en dos pasos se usa su PIN, si no el PIN enviado pasa a serlo; 10 solicitudes por número en 72 horas, error 133016; el número se agrega y verifica en WhatsApp Manager, no se registra desde WhatsApp Manager ni el App Dashboard); `…/business-phone-numbers/two-step-verification` (cambiar/restablecer el PIN en WhatsApp Manager; Meta está retirando el PIN de forma gradual para números elegibles); `…/phone-numbers` (los números ya en uso con WhatsApp no se pueden registrar sin eliminarlos antes).
- **Pendiente de validar en UI:** ❓ cómo se comporta «Registrar» con números elegibles a los que Meta ya no pide PIN.

## EXT-126 · Dualhook: cuenta y conexión del número (Embedded Signup)

- **Ruta UI / name:** `/ajustes/mensajeria` → «Oficial» → «Coexistencia (Dualhook)»; recuadro azul con enlace «Ir a Dualhook» (`dualhook.com`) (`FE:…/WhatsappCloudApi.vue:474-478`).
- **Página:** `docs/tareas/ajustes/conseguir-las-credenciales-de-dualhook.mdx`.
- **Qué hace ISPMAX (✅):** en coexistencia el `Access Token` es la llave del relay (`BE:…:192-194`); no hay botón «Registrar» (`:1217-1219`); no hay checklist de Meta (`:642`). Aviso de abrir la app a los 10 días (`FE:…IndexMessages.vue:265-290`).
- **Fuentes oficiales (2026-11-05):** `dualhook.com/docs/getting-started` (organización → **New Connection** → nombre, webhook URL, verify token de al menos 16 caracteres → Embedded Signup → **Test Ping**), `dualhook.com/docs/embedded-signup-walkthrough` (pantallas de Meta: **Continue**, **Phone number** con insignia **Registered** / **Enter a new phone number**, **Next**, **Confirm**, **Finish**; en el celular **Connect to the Business Platform** → **Connect**; pantalla **Finalizing your connection**; botones **Test verification GET** y **Retry connection**), `…/embedded-signup`, `…/connection-not-appearing`, `…/coexistence` (app 2.24.17 o superior; elegibilidad según antigüedad y calidad), `…/heartbeat` (latido de 13 días), `…/pricing`.
- **Pendiente de validar en UI:** ❓ todo lo que ocurre en la consola de Dualhook y en la ventana de Meta.

## EXT-127 · Dualhook: Outbound API key

- **Ruta UI / name:** «Access Token» con pista «Outbound API key de Dualhook (empieza con dh_live_)» (`FE:…/WhatsappCloudApi.vue:645-649`).
- **Qué hace el backend (✅):** cualquier token que no empiece con `EAA` se manda al relay `DUALHOOK_API_URL` (por defecto `https://api.dualhook.com`) con versión `v25.0` (`BE:…:239-250`); la llave nunca debe mandarse a Meta (comentario `:176-190`).
- **Fuentes oficiales (2026-11-05):** `dualhook.com/docs/runtime-api` («An organization admin creates it from Connection → Overview → Outbound API key»; se muestra una vez; Dualhook guarda solo una huella SHA-256; una llave por conexión; rotación con gracia de 1 o 24 horas; hosts `api.dualhook.com/v25.0`), `…/runtime-api-reference` (llaves revocadas o vencidas → 401), `…/billing-enforcement` (suscripción no válida bloquea la conexión; la llave se conserva y vuelve a servir al reactivar).
- **Pendiente de validar en UI:** ❓ etiqueta exacta del botón que crea la llave; ❓ pasos de rotación (la ayuda los remite a otra guía).

## EXT-128 · Dualhook: Phone Number ID y WABA ID de la conexión

- **Ruta UI / name:** campos «Phone Number ID» y «WABA ID» en modo coexistencia (`FE:…/WhatsappCloudApi.vue:475-476`: «Pega el Phone Number ID y el WABA ID de tu conexión en Dualhook»).
- **Fuentes oficiales (2026-11-05):** `dualhook.com/docs/getting-started` (campos de la conexión `waba_id` y `phone_number_id`), `…/phone-numbers` (en Meta: **Accounts → Messaging accounts → WhatsApp Manager → Phone numbers** muestra el `phone_number_id`), `…/whatsapp-business-accounts` y `…/messaging-accounts` (el `waba_id` es el Messaging account ID).
- **Pendiente de validar en UI:** ❓ la ayuda de Dualhook **no indica** en qué pantalla de la conexión se muestran; la página lo dice y remite al soporte de Dualhook.

## EXT-129 · Dualhook: Webhook Override con la URL y el Verify Token de ISPMAX

- **Ruta UI / name:** bloque «Webhook para Dualhook»: «En Dualhook, Webhook Override: pega esta URL y este token, y guarda. Los dos valores tienen que coincidir o Meta rechaza la verificación.» (`FE:…/WhatsappCloudApi.vue:674-678`); si se cambia el token: «el próximo Save Changes de allá falla si no coincide» (`:740-743`); aviso al guardar el token «Verify token guardado. Actualízalo en Dualhook.» (`:99`).
- **Fuentes oficiales (2026-11-05):** `dualhook.com/docs/webhook-override` (la URL y el verify token se piden antes de abrir Embedded Signup; límite de 200 caracteres para la URL; mismo URL y token para todas las conexiones de la misma WABA; campos `messages`, `smb_message_echoes`, `smb_app_state_sync`, `history`; pestaña **Debug**), `…/getting-started`, `…/billing-enforcement` (botón **Update webhook** en la tarjeta de la conexión).
- **Pendiente de validar en UI:** ❓ la ayuda de Dualhook no nombra la pantalla ni el botón «Webhook Override»/«Save Changes» con el que ISPMAX los menciona.

## EXT-130 · OpenAI: crear la clave de API

- **Ruta UI / name:** `/ajustes/inteligencia-artificial` → tarjeta «Conexión con OpenAI» → «Token de OpenAI (sk-...)» (`FE:pages/dashboard/ajustes/inteligencia-artificial/IndexPage.vue:186`; permisos `ajuste.ia` o `bot.config.ver`, `FE:router/auth-guard.ts:78-79`).
- **Página:** `docs/tareas/ajustes/conseguir-el-token-de-openai-para-ispmax.mdx`.
- **Fuentes oficiales (2026-11-05):** `developers.openai.com/api/reference/overview` (claves estándar en `platform.openai.com/settings/organization/api-keys`; claves de administración en otra página; «Remember that your API key is a secret»; revocar surte efecto en segundos), `developers.openai.com/api/docs/quickstart` (botón «Create an API Key»; guardar la clave en un lugar seguro), `…/guides/error-codes` («Incorrect API key provided»: revisar errores de tipeo o espacios).
- **Pendiente de validar en UI:** ❓ nombre actual del botón y flujo de proyectos en `platform.openai.com`. La ayuda `help.openai.com` devolvió 403 a la lectura directa.

## EXT-131 · OpenAI: saldo, límites y quién cobra

- **Ruta UI / name:** texto de la tarjeta: «Se guarda cifrado y nunca se muestra completo. El consumo lo cobra OpenAI directamente en tu cuenta.» (`FE:…inteligencia-artificial/IndexPage.vue:216-219`); mensajes «La cuenta de OpenAI no tiene créditos» (`BE:ia/ia.service.ts:121`).
- **Qué hace el backend (✅):** `probar` hace una petición mínima (`max_completion_tokens: 16`, `timeout` 15 s, sin reintentos) (`:108-123`); un 429 que no sea `insufficient_quota` se toma como token válido (`:118`).
- **Fuentes oficiales (2026-11-05):** `developers.openai.com/api/docs/guides/rate-limits` (niveles de uso que suben con las compras de créditos; límites en **Settings → Organization → Limits**), `developers.openai.com/api/docs/quickstart` (sección «Add credits» / «Go to billing»), `developers.openai.com/api/docs/guides/chatgpt-api-credits` (créditos de API para suscriptores Pro y Business, con condiciones; las cuentas de ChatGPT y de la API deben compartir correo), `…/guides/error-codes` (códigos de facturación como `credit_balance_exhausted`).
- **Pendiente de validar en UI:** ❓ importes mínimos de recarga y expiración de créditos (`help.openai.com` no se pudo leer; no se copian a la página).

## EXT-132 · ISPMAX: pegar el token, elegir Modelo, Verificar y Guardar

- **Ruta UI / name:** `/ajustes/inteligencia-artificial` (`FE:…IndexPage.vue`): «Token de OpenAI (sk-...)» (`:186`, ojo para ver lo escrito), «Modelo» (`:209`, lista `MODELOS` `:15`, valor por defecto `gpt-4o-mini` `:20-22`), «Verificar» (`:228`; apagado sin token escrito ni guardado), «Guardar» (`:234`; apagado sin cambios). Avisos: «Token válido y con créditos» (`:71`), «Configuración de IA guardada» (`:57`).
- **Qué hace el backend (✅):** `PATCH /ia/config` prueba el token nuevo con el modelo y, si falla, devuelve el motivo y no guarda (`BE:ia/ia.service.ts:46-67`); si solo cambia el modelo, lo prueba con el token guardado; el token se guarda cifrado (AES-256-GCM, `BE:ia/ia-crypto.util.ts`) y se muestra enmascarado `sk-••••••••` + 4; `MODELO_IA_DEFAULT = 'gpt-4o-mini'` (`:10`); motivos: 401 «El token de OpenAI no es válido», `insufficient_quota` «La cuenta de OpenAI no tiene créditos», 404 «El modelo de OpenAI elegido no existe o no tienes acceso», sin token «No hay token de OpenAI configurado» (`:76-82`, `:119-124`); límite del DTO: 300 caracteres de token y 80 de modelo (`dto/ia-config.dto.ts`).
- **Pendiente de validar en UI:** ❓ cuánto tarda la verificación con una cuenta real.

## EXT-133 · ISPMAX: Quitar token

- **Ruta UI / name:** botón «Quitar token» (solo con token guardado; `FE:…IndexPage.vue:223`) → diálogo «Quitar el token de OpenAI» («Las funciones con IA (asistente de WhatsApp, lectura de comprobantes…) dejarán de funcionar hasta que ingreses otro. ¿Continuar?») → «Quitar» → aviso «Token quitado» (`:79-96`).
- **Qué hace el backend (✅):** `DELETE /ia/config/token` pone `openai_api_key = null` (`BE:ia/ia.service.ts:69-73`); no revoca la clave en OpenAI. Insignia «Ilegible» si el token guardado no se descifra (cambió el secreto del servidor): el botón «Quitar token» no se muestra (`config.configurado` es falso) y el campo pide volver a ingresarlo. Con funciones de IA activas y sin token: «Hay funciones con IA activas pero no hay token: no funcionarán hasta que lo ingreses.» (`FE:…:291`).
- **Pendiente de validar en UI:** ❓ comportamiento de cada función cuando el token se quita a mitad de una conversación del bot.
