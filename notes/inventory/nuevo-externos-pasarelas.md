# Inventario EXT (pasarelas de pago) — Conseguir credenciales y elegir la pasarela

> Alcance: FE `pages/dashboard/ajustes/pasarelas-pago/**`, `composables/usePasarelasPago.js`; BE `pasarelas-pago/**`, `registro-pagos/registro-pagos.guard.ts` (solo la mención a Pago Internet). Código `main-2026-11-04` (BE `f0d1ebf7`, FE `e7d5d06b`). Los IDs EXT-140 a EXT-147 complementan EXT-007, EXT-008 y EXT-009 de `nuevo-servicios-externos.md`.
>
> Convención de citas: `FE:` = `frontend-isp-main/src/`, `BE:` = `backend-isp-main/src/`. Todo lo marcado ✅ se leyó en código; la ayuda de terceros se consultó en la web oficial el 2026-11-05 (fuentes al final). Nada está marcado 🖥️ (sin cuentas reales ni instancia para este bloque).

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| EXT-140 | Conseguir el Token y el Store ID de PayPhone y cargarlos | `/ajustes/pasarelas-pago` → «PayPhone» | `ajuste.pasarelas-pago` | completo (PayPhone ❓) |
| EXT-141 | Conseguir la API Key y la Secret Key de dLocal Go, elegir país y ambiente | `/ajustes/pasarelas-pago` → «dLocal Go» | `ajuste.pasarelas-pago` | completo (dLocal Go ❓) |
| EXT-142 | Elegir la pasarela de pago (país, modelo de cobro, costos de la fuente oficial) | `/ajustes/pasarelas-pago` | `ajuste.pasarelas-pago` | completo |
| EXT-143 | Pago Internet: URL del sistema y API key (solo lectura) | `/ajustes/pasarelas-pago` → «Pago Internet» | `ajuste.pasarelas-pago` | parcial (la fuente oficial no explica esos dos datos; sin página propia) |
| EXT-144 | Vigencia del enlace de cobro (1 a 168 horas, 72 por defecto) | `/ajustes/pasarelas-pago` → «PayPhone» → «Vigencia del enlace de cobro» | `ajuste.pasarelas-pago` | completo |
| EXT-145 | «Cobrar con»: elegir la pasarela cuando hay más de una lista | `/ajustes/pasarelas-pago` (recuadro azul superior) | `ajuste.pasarelas-pago` | completo |
| EXT-146 | Comprobación de credenciales: Guardar, Probar credenciales, etiquetas Verificada, Rechazada y Sin verificar | `/ajustes/pasarelas-pago` → PayPhone y dLocal Go | `ajuste.pasarelas-pago` | completo (pasarelas ❓) |
| EXT-147 | Cómo se asienta el cobro: aviso firmado, abono «PASARELA DE PAGO», pago doble y alertas | sin pantalla propia; resultado en `/cobros-pasarela` | — | completo (pasarelas ❓) |

## EXT-140 · Conseguir el Token y el Store ID de PayPhone

- **Ruta UI / name:** `/ajustes/pasarelas-pago` · `ajuste.pasarelas-pago` · Ajustes → tarjeta «Pasarelas de Pagos» → pestaña «PayPhone» (`FE:pages/dashboard/ajustes/IndexPage.vue:503`, `FE:router/routes.ts:416-418`).
- **Archivos:** FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/PayphoneConfig.vue`, `FE:pages/dashboard/ajustes/pasarelas-pago/IndexPage.vue` · BE: `BE:pasarelas-pago/pasarelas-pago.controller.ts`, `BE:pasarelas-pago/payments-gateway.client.ts`.
- **Para qué sirve:** ✅ cargar las credenciales de una aplicación PayPhone de tipo API (perfil `api`, `PayphoneConfig.vue:16`) para habilitar el cobro por enlace (`payment_link`).
- **Acceso:** ✅ la ruta usa `ajuste.pasarelas-pago` (no figura en el catálogo de permisos); la tarjeta de Ajustes se muestra con `index.forma-pago` o `index.detalle-forma-pago` más `ajuste.forma-pago`; en la práctica la abre el SUPER-ADMINISTRADOR (ya documentado en `docs/guia/pasarelas-pago.mdx`).
- **Campos:** «Token» (contraseña con ojo; `autocomplete="new-password"`; ayuda: «Copialo completo con el botón de copiar de Payphone Developer: son varios cientos de caracteres y cortarlo es el error más común.» `PayphoneConfig.vue:328-350`) y «Store ID» (ayuda: «Identificador de la sucursal en Payphone. No es el mismo número que aparece junto al token identificando a la aplicación.» `:352-364`). Ambos obligatorios: `Completá el token y el Store ID` (`:125-128`). Se envían con `.trim()` (`:138-139`): recorta los extremos, no el interior.
- **Botones:** «Guardar» (PUT `/pasarelas-pago/config`, aviso «Credenciales guardadas», vacía el Token y llama enseguida a «probar», `:124-160`) · «Probar credenciales» (POST `/pasarelas-pago/probar`, desactivado sin credenciales guardadas, ayuda «Guardá las credenciales primero», `:162-194,382-394`) · «Borrar configuración» (diálogo; con cobros abiertos: «Hay cobros sin resolver» y «Borrar igual», `:213-290`).
- **Mensajes:** «Payphone aceptó las credenciales» / «Payphone rechazó las credenciales» (`:173-174`); «No se pudieron guardar», «No se pudo comprobar» (genéricos; se sustituyen por `response.data.message` si existe, `:156,181-184`); etiquetas «Sin configurar», «Verificada», «Rechazada» (con motivo en tooltip o «Payphone rechazó estas credenciales») y «Sin verificar» con «Todavía no se comprobó contra Payphone. El cobro por enlace no se ofrece hasta que la comprobación pase.» (`:91-112`).
- **Perfiles sin uso:** ✅ recuadro «Credenciales que ISPMAX no usa» para perfiles distintos de `api` (Cajita y Botón de Pago), con «Borrar» (`:440-474`). El DTO explica que `api` habilita enlaces y `web` la Cajita y el Botón de Pago (`BE:pasarelas-pago/dto/credenciales.dto.ts`).
- **Sin interruptor de ambiente:** ✅ el formulario de PayPhone no envía `isSandbox`; el ambiente lo define la aplicación en PayPhone.
- **Credenciales:** ✅ no se guardan en ISPMAX; viven cifradas en el servicio de pagos; el backend solo hace de intermediario (`BE:pasarelas-pago/payments-gateway.client.ts:10-15`) y nunca devuelve valores, solo qué llaves hay (`:88-91`).
- **Fuente externa (PayPhone, oficial):** Developer: `https://appdeveloper.payphonetodoesposible.com/` (login con RUC o cédula, correo y contraseña de un usuario con rol «Desarrollador» y tienda activa; lo crea un Administrador de PayPhone Business en «Usuarios» → «Crear Usuario»); «+ Agregar» → Nombre, Descripción, Categoría, Plataforma de Desarrollo, «Tipo de Aplicación» (WEB o API; WEB añade «Dominio Web» y «URL de Respuesta») → «Guardar» → pestaña «Credenciales»: Token y StoreId con botón de copiar. Ambientes PRUEBAS (aprueba todo, sin banco) y PRODUCCIÓN (dinero real). Registro de comercio: `https://appstore.payphonetodoesposible.com/login`, requiere RUC/NIT. Catálogo de errores con códigos 802, 1, 100, 1004.
- **Pendiente de validar / no confirmado:** ❓ dónde se cambia una aplicación de PRUEBAS a PRODUCCIÓN (la guía no lo dice); ❓ si ISPMAX muestra tal cual los mensajes del catálogo de PayPhone en el motivo del rechazo; ❓ si la pestaña «Credenciales» exige abrir primero la aplicación.

## EXT-141 · Conseguir la API Key y la Secret Key de dLocal Go

- **Ruta UI / name:** `/ajustes/pasarelas-pago` → pestaña «dLocal Go».
- **Archivos:** FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/DlocalGoConfig.vue` · BE: los mismos del servicio de pagos.
- **Para qué sirve:** ✅ cargar las claves de la «Integración por API» de dLocal Go (perfil `default`, `DlocalGoConfig.vue:16`), el país y el ambiente.
- **Campos:** «API Key» (`:202-211`), «Secret Key» (oculta, ayuda: «Además de autenticar, firma las notificaciones de pago. Copiala completa.» `:213-233`), «País desde el que se cobra» (12 países: Perú, Bolivia, Colombia, México, Ecuador, Argentina, Brasil, Chile, Costa Rica, Guatemala, Paraguay, Uruguay; `:21-34`; ayuda: define moneda y medios de pago, `:245-250`), interruptor de ambiente (`:254-290`): gris «Ambiente de producción» / «Los cobros son reales.»; naranja «Ambiente de PRUEBAS» / «Los cobros no mueven dinero real.» y, en pruebas, la nota «Las credenciales salen de una cuenta distinta: dashboard-sbx.dlocalgo.com. Las de tu cuenta normal no funcionan acá.»
- **Reglas:** «Completá la API Key y la Secret Key» y «Elegí el país desde el que se cobra» (`:78-86`); `.trim()` en ambas claves; se envía `isSandbox`; al guardar vacía las claves y llama a «probar» (`:92-108`); país y ambiente se restauran al recargar (`:72-76`).
- **Mensajes:** «dLocal Go aceptó las credenciales» / «dLocal Go rechazó las credenciales» (`:127-128`); etiquetas con los mismos estados que PayPhone (`:48-66`).
- **Ayuda interna de ISPMAX:** ✅ el panel dice «Configuración → Desarrolladores → Integración» (`:362-366`), distinto de la guía oficial («Integrations» / «Integraciones» → «API Integration» / «Integración por API»). Se avisa en la página.
- **Fuente externa (dLocal Go, oficial):** producción `https://dashboard.dlocalgo.com/`, pruebas `https://dashboard-sbx.dlocalgo.com/` (cuentas y claves distintas; lo de la cuenta de pruebas no se replica); «Integrations» → «API Integration» → ventana «Install dLocal Go on your site» → «API Key» y «Secret Key» (en pruebas «Sandbox API Key» / «Sandbox Secret Key»); centro de ayuda en español: «Integraciones» → tarjeta «Integración por API». Error 403 «Invalid Credentials.» (código 3001) = credenciales del ambiente equivocado. Las claves quedan ligadas al sitio declarado al crear la cuenta (uso en otro sitio puede bloquear la cuenta). Activación: paso 1 (hasta 3 000 USD) y paso 2 (documentos y banco; sin límite y retiros; revisión de hasta 72 h). Monto mínimo: 1 dólar o equivalente (artículo de 2023).
- **Pendiente de validar / no confirmado:** ❓ si el dominio de ISPMAX debe coincidir con el «Sitio web de tu empresa» declarado en dLocal Go; ❓ significado de «Merchant has no authorization to use this API.» (3003); ❓ si ISPMAX muestra tal cual los mensajes de dLocal Go; ❓ qué moneda cobra dLocal Go cuando la de la instalación no coincide con la del país (la guía dice que convierte en el checkout).

## EXT-142 · Elegir la pasarela de pago

- **Ruta UI / name:** `/ajustes/pasarelas-pago` (las tres pestañas).
- **Archivos:** FE: `FE:pages/dashboard/ajustes/pasarelas-pago/IndexPage.vue` (`PASARELAS` con país de cada una, `:10-29`; tabs, `:211-245`) · BE: `BE:pasarelas-pago/disponibilidad.service.ts`.
- **Contenido verificado:** ✅ PayPhone: «Ecuador» (el adaptador usa 593 por defecto, `PayphoneConfig.vue:141-144`). dLocal Go: «Perú · Bolivia · Colombia · México · y más» + selector de 12 países. Pago Internet: etiqueta «Ecuador · Latinoamérica» (`PagoInternetConfig.vue:39-41`). La marca «Lista para cobrar» solo aparece si el perfil que habilita `payment_link` está verificado (`IndexPage.vue:114-127,229-236`).
- **Fuente externa (oficial):** PayPhone: comisión «5% + IVA de ese porcentaje» sobre el monto recibido con tarjeta, sin costos fijos ni suscripciones (payphone.app y docs.payphone.app). dLocal Go: sin costos fijos; comisión por transacción según medio de pago y país del pagador, más impuesto local; países donde se puede vender: Argentina, Bolivia, Brasil, Chile, Colombia, Costa Rica, Ecuador, Guatemala, México, Paraguay, Panamá, República Dominicana, Perú, Uruguay, Indonesia, Malasia, Kenia, Nigeria. Pago Internet: plan de 50 USD al mes + 0,12 USD por pago procesado; recargo a cargo del cliente que paga; solo Ecuador por ahora; canales Banco Pichincha, Red Activa, Western Union, Deuna, cobro recurrente por PayPhone; acreditación en hasta 24 horas bajo ciertas condiciones.
- **Pendiente de validar:** ❓ tarifas vigentes (cambian); ❓ lista de países de dLocal Go (la define dLocal Go).

## EXT-143 · Pago Internet: URL del sistema y API key (solo lectura)

- **Ruta UI / name:** `/ajustes/pasarelas-pago` → pestaña «Pago Internet» (`TAB_PAGO_INTERNET`, `IndexPage.vue:33,239-244,308-310`).
- **Archivos:** FE: `FE:pages/dashboard/ajustes/pasarelas-pago/components/PagoInternetConfig.vue` · BE: `BE:registro-pagos/registro-pagos.guard.ts` (comentario que nombra a «Pago Internet» como integración con token propio).
- **Qué muestra:** ✅ «URL del sistema» (`window.location.origin`, `:22,74-86`) y «API key» (de `VITE_PAGO_INTERNET_API_KEY`, `:14`; oculta, con ojo y copiar, `:93-118`; sin valor: «Sin configurar» y el aviso «No hay API key configurada…», `:98-101`). No guarda nada ni participa en «Cobrar con».
- **Ayuda interna de ISPMAX:** «Cómo afiliarte» afirma que el formulario de afiliación pide la URL del sistema y la API key (`:121-167`).
- **Fuente externa (oficial, pagointernet.ec):** el formulario público «Quiero afiliarme» pide: Nombre Comercial del ISP, Nombre del responsable, Teléfono, Correo electrónico, Sistema administrativo actual (ISPMAX figura en la lista) y una contraseña para el panel de incorporación (`https://onboarding.pagointernet.ec/login`). **No pide ni explica** URL del sistema ni API key; la sección «Integraciones» solo muestra logotipos y la API REST sin detalle.
- **Decisión:** no se crea la tarea «Conseguir la API key de Pago Internet»: la fuente oficial no explica lo que ISPMAX muestra. `docs/guia/pasarelas-pago.mdx` (líneas 83 y 90) y `docs/referencia/servicios-externos.mdx` (fila de Pago Internet) afirman que la afiliación pide esos dos datos y que se pegan en el formulario; no coincide con lo observado en el sitio (informado a la coordinación; no son páginas de este encargo). Pregunta `Q-AJS-003` de `user-questions.md` apunta a esa guía.
- **Pendiente de validar:** ❓ en qué paso de la afiliación se usan la URL y la API key; ❓ si la «API key» de la pestaña es uno de los tokens de `REGISTRO_PAGOS_TOKENS` (no confirmado).

## EXT-144 · Vigencia del enlace de cobro

- **Ruta UI:** pestaña «PayPhone» → «Vigencia del enlace de cobro» → «Guardar vigencia» (`PayphoneConfig.vue:32-78,411-438`).
- **Reglas:** ✅ entero de 1 a 168; por defecto 72; mensaje de error «Un número entero entre 1 y 168 horas»; aviso «Vigencia actualizada» o «No se pudo guardar la vigencia»; el botón se activa solo si el valor cambió y es válido. Se guarda en los ajustes (`vigenciaEnlacePagoHoras`) y rige para los enlaces de cualquier pasarela. BE: `BE:pasarelas-pago/cobros.service.ts:17,25,289-304` (tope 168; si el valor es inválido usa 72).

## EXT-145 · «Cobrar con»

- **Ruta UI:** recuadro azul «Hay más de una pasarela lista para cobrar» con el selector «Cobrar con» (`IndexPage.vue:160-190`); aviso «Los cobros se harán con {PayPhone | dLocal Go}» (`:104`).
- **Reglas:** ✅ sin elección, se usa la primera por orden alfabético del `providerId` (dLocal Go antes que PayPhone) y se avisa solo en el log; si la elegida no está habilitada, se usa la primera habilitada (`BE:pasarelas-pago/disponibilidad.service.ts:85-152`). Un enlace abierto de otra pasarela no se reutiliza (`BE:pasarelas-pago/cobros.service.ts:130-157`).

## EXT-146 · Comprobación de credenciales

- ✅ «Guardar» no valida por sí mismo: tras guardar se llama a «probar» (`PayphoneConfig.vue:151-154`, `DlocalGoConfig.vue:108`). El backend invalida la caché de disponibilidad al guardar, probar y borrar (`BE:pasarelas-pago/pasarelas-pago.controller.ts:130-167`). La disponibilidad se cachea 60 s y exige método `payment_link` (`BE:pasarelas-pago/disponibilidad.service.ts:7-17`). Motivos si no hay pasarela: «No hay ninguna pasarela de pagos configurada», el mensaje de rechazo, o «Las credenciales cargadas son válidas pero no habilitan el cobro por enlace. En Payphone hace falta una aplicación tipo API.» (`:158-174`). «No hay ninguna pasarela de pagos lista para cobrar. Configurala en Ajustes → Pasarelas de Pagos.» al generar un enlace (`BE:pasarelas-pago/cobros.service.ts:115-120`).
- Aviso rojo «No se pudo contactar al servicio de pagos» con la nota sobre `PAYMENTS_GATEWAY_URL` y `PAYMENTS_GATEWAY_API_KEY` (`IndexPage.vue:196-209`).

## EXT-147 · Cómo se asienta el cobro

- ✅ Al guardar credenciales por primera vez el backend da de alta el comercio en el servicio de pagos y registra la URL de aviso `{DOMINIO}/api/pasarelas-pago/webhook` (y el secreto, si está definido); sin `DOMINIO` el pago queda «pagado pero sin asentar» (`BE:pasarelas-pago/payments-gateway.client.ts:175-232`). El aviso se verifica con HMAC SHA-256 sobre `{timestamp}.{cuerpo}` y tolerancia de 300 s (`BE:pasarelas-pago/pasarelas-pago.service.ts:16,81-118`).
- Pago aprobado → abono con forma de pago «PASARELA DE PAGO» (código SRI 20), detalle `PAYPHONE` o `DLOCAL GO`, nota «Cobro {pasarela}», usuario = nombre de la pasarela, excedente a favor (`BE:pasarelas-pago/aplicar-pago.service.ts:9-24,45-77`). Comprobante agrupado: confirma todas las órdenes (`:87-134`).
- Pago doble: no toca la factura; alerta «El cliente pagó dos veces el mismo enlace»; sin registrar: «Pago recibido pero NO registrado»; sin comprobante: «Pago registrado sin comprobante»; también al grupo de WhatsApp (`BE:pasarelas-pago/pasarelas-pago.service.ts:147-215,251-276`).

## Fuentes oficiales consultadas (2026-11-05)

- PayPhone: `https://docs.payphone.app/configuracion-de-ambiente-y-credenciales`, `https://docs.payphone.app/api-link`, `https://docs.payphone.app/codigos-de-error`, `https://docs.payphone.app/prestashop`, `https://docs.payphone.app/notificacion-externa`, `https://docs.payphone.app/`, `https://www.payphone.app/`, `https://learn.payphone.app/`.
- dLocal Go: `https://docs.dlocalgo.com/integration-api` y sus páginas `authentication`, `errors/payment-http-errors`, `payments/create-a-payment`, `payments/notifications`, `faq-preguntas-frecuentes`; `https://dlocalgo.com/`; centro de ayuda `https://helpcenter.dlocalgo.com/es/` (artículos 7339130, 7339388, 7065328, 9566694, 7229140, 9251261, 7240013, 7338944).
- Pago Internet: `https://www.pagointernet.ec/` y `https://onboarding.pagointernet.ec/login`.
- No se usaron foros, blogs ni vídeos. `help.payphone.app` respondió 403 al intentar abrirlo.
