# Inventario BAN — Bandeja de conversaciones (CRM WhatsApp), llamadas, avisos a grupos y perfil del negocio
> Alcance: FE `pages/dashboard/ajustes/bot/components/message/**`, `bot/composables/{useMessages,useChatPrefs,useLlamadas,useLlamadasGlobal,useLlamadasIa,useAudioRecorder,useFotosPerfil,resumenIa,useBotSession,useAsistenteIa}`, `bot/IndexPage.vue`, `bot/components/config/IndexConfiguraciones.vue` (solo horas de silencio y apagado general), `layouts/LlamadasGlobal.vue`, `composables/waApi.js`, `pages/dashboard/ajustes/mensajeria/components/{AvisosGrupos,PerfilNegocioWa}.vue`, `pages/dashboard/ajustes/IndexPage.vue` (círculo CRM) · BE `cloud-api/**` (llamadas, bloqueados, perfil, plantillas de chat), `avisos-grupo/**`, `customers/` (barra del cliente), `companies/` (licencia y token del bot). Código `main-2026-11-04` (BE `f0d1ebf7`, FE `e7d5d06b`).
>
> Convención de citas: `FE:` = `frontend-isp-main/src/`, `BE:` = `backend-isp-main/src/`. ✅ = leído en código. Nada está marcado 🖥️.
>
> **Límite de lectura:** la bandeja habla con un **servicio aparte, el bot de WhatsApp** (variable `VITE_API_WHATSAPP`: `/api/tickets`, `/api/queues`, `/api/settings`, `/api/bot-exclusiones`, `/api/llamadas`, `/api/grupos`, `/api/resumen-ia`, `/api/sugerencia-ia`) y a su WebSocket (`VITE_WEBSOCKET`). Ese servicio **no está en el código disponible**: de él solo se documenta lo que el panel envía, lo que espera recibir y los textos que el propio panel pinta. Lo que decide el bot (cuándo marca "Pide asesor", cuántas horas calla, qué eventos de aviso existen en el CRM y cuál es el título de cada módulo de avisos) queda marcado ❓.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| BAN-001 | Acceso al CRM WhatsApp: círculo de Ajustes, pestaña Mensajes y aviso "Tu plan no incluye el CRM WhatsApp" | Ajustes → CRM WhatsApp · `/ajustes/bot?view=messages` | `bot.messages.ver` (más uno de `bot.dashboard.ver`, `bot.colas.ver`, `bot.vouchers.ver`, `bot.config.ver` para entrar a la ruta) | completo |
| BAN-002 | Lista de chats: pestañas Bandeja/Abiertos/Cerrados, búsqueda, filtro por cola, paginación, sonido y "Cerrar todo" | pestaña Mensajes | `bot.messages.ver`, `bot.messages.ver-todos`, `bot.messages.aceptar-rechazar`, `bot.messages.cerrar` | completo |
| BAN-003 | Marcas de cada chat en la lista: Pide asesor, espera, Lo empezó la empresa, bot silenciado, bloqueado, punto de estado del servicio, llamada con el asistente | pestaña Mensajes | `bot.messages.ver` | completo |
| BAN-004 | Aceptar, rechazar, ver sin marcar como leído, cerrar y reabrir un chat | lista y cabecera del chat | `bot.messages.aceptar-rechazar`, `bot.messages.cerrar`, `bot.messages.reabrir` | completo |
| BAN-005 | Responder: texto con formato, emoji, adjuntos, nota de voz, firma, citar, editar y eliminar mensajes | caja de respuesta del chat | `bot.messages.enviar`, `bot.messages.editar-mensaje`, `bot.messages.eliminar-mensaje` | completo |
| BAN-006 | WhatsApp Oficial: ventana de 24 h, "Enviar plantilla" y recordatorio de abrir la app del celular | cabecera y barra de respuesta del chat | `bot.messages.enviar` | completo |
| BAN-007 | Nuevo chat con un cliente | botón **Nuevo** · diálogo "Nuevo chat" | `bot.messages.nuevo-chat` | completo |
| BAN-008 | Derivar un chat a otro usuario | botón **Derivar** · diálogo "Derivar chat" | `bot.messages.derivar` | completo |
| BAN-009 | Interruptores del bot: por chat, apagado general, "Que responda el bot" y horas de silencio cuando la empresa empieza la conversación | cabecera del chat, barra de la lista, Configuraciones | `bot.config.horario` (apagado general y horas de silencio) | completo |
| BAN-010 | Números sin bot (y privados) | botón de la barra del bot · diálogo "Números sin bot" | ninguno propio en el panel | completo |
| BAN-011 | Bloquear y desbloquear números en WhatsApp | cabecera del chat · diálogo "Números bloqueados" | `bot.messages.bloquear` | completo |
| BAN-012 | Barra del cliente en el chat (estado del servicio, deuda, ONU) y botón Ver cliente | cabecera del chat | `bot.messages.ver-cliente` | completo |
| BAN-013 | Resumen IA del chat y respuesta sugerida al operador | tarjeta sobre el chat · botón ✨ | `bot.messages.enviar` (sugerencia); sin permiso propio (resumen) | completo |
| BAN-014 | Llamadas de WhatsApp en el panel: contestar, rechazar, espera, llamar, pasar al asistente | aviso flotante · botón **Llamar** · Mensajería (interruptor) | `bot.messages.llamadas`, `bot.messages.enviar`, `variables.vincular.whatsApp` | completo |
| BAN-015 | Avisos a grupos de WhatsApp | Ajustes → Mensajería → tarjeta "Avisos a grupos de WhatsApp" | `variables.vincular.whatsApp` (entrar) + uno de `bot.config.ver`, `tickets.edit`, `instalaciones.edit`, `mapa.incidentes.gestionar`, `variables.facturacion`, `ajuste.cobros` | completo |
| BAN-016 | Perfil del negocio en WhatsApp (número dedicado) | Ajustes → Mensajería → WhatsApp → Oficial | `variables.vincular.whatsApp` | completo |

## BAN-001 · Acceso al CRM WhatsApp
- **Ruta UI / name:** `/ajustes/bot` · `ajuste.bot` · Ajustes → círculo **CRM WhatsApp** (FE:pages/dashboard/ajustes/IndexPage.vue:552-573). La pestaña de la bandeja se llama **Mensajes** (FE:pages/dashboard/ajustes/bot/IndexPage.vue:140) y se abre sola cuando es la primera permitida; la URL admite `?view=messages`.
- **Archivos:** FE: `pages/dashboard/ajustes/bot/IndexPage.vue`, `pages/dashboard/ajustes/IndexPage.vue`, `router/auth-guard.ts` · BE: `customers/customers.service.ts` (`licenciaSuscripcion`), `customers/customers.controller.ts`, `companies/master-suscripcion.service.ts`, `companies/companies.controller.ts`.
- **Para qué sirve:** entrada a la bandeja de conversaciones de WhatsApp (CRM). Si el plan no incluye el CRM, muestra un aviso en lugar de las pestañas.
- **Acceso:**
  - Ruta: el guard deja entrar con cualquiera de `bot.dashboard.ver`, `bot.messages.ver`, `bot.colas.ver`, `bot.vouchers.ver`, `bot.config.ver` (FE:router/auth-guard.ts:88-95, `ajusteBot`). ✅
  - Círculo en Ajustes: solo si `connected || botOficial` (WhatsApp no oficial vinculado u Oficial activo), la licencia no dice `crm === false` y el usuario tiene alguno de esos cinco permisos (FE:ajustes/IndexPage.vue:553). ✅
  - Pestaña **Mensajes**: `bot.messages.ver` (FE:bot/IndexPage.vue:43). En el editor de roles el grupo se llama **Bot → Messages** (FE:pages/dashboard/usuarios/permisos/gestion-variables-permisos.json:172-190). ✅
- **Secciones / pestañas del CRM:** Resumen, **Mensajes**, Colas, Plantillas (solo canal Oficial), Conocimiento, Endpoints (solo un correo concreto), Comprobantes, Configuraciones (FE:bot/IndexPage.vue:139-146). Solo **Mensajes** pertenece a este inventario.
- **Reglas:**
  - Licencia: `GET /customers/licencia-suscripcion` devuelve `crm: licencia.crm_habilitado_efectivo !== false` (BE:customers/customers.service.ts:143-144). Con la empresa vinculada al master y `crm === false`, el panel muestra el aviso y oculta las pestañas (FE:bot/IndexPage.vue:25-27, 113-124). La licencia se vuelve a leer al volver a la pestaña del navegador (FE:bot/IndexPage.vue:33-36; commit `0e1f79ca`). ✅
  - Cuando cambia la licencia en el master, el backend le avisa al bot para que no use su caché de 2 minutos (BE:companies/master-suscripcion.service.ts:296-305). ✅
  - El bot consulta `GET /companies/bot/crm-habilitado` (solo con token de servicio); sin dato devuelve `crm: true` (BE:companies/companies.controller.ts:32-37). ✅
- **Mensajes (texto exacto):** título "Tu plan no incluye el CRM WhatsApp"; "El panel de chats y el bot que responde solo a tus clientes son parte del CRM WhatsApp. Los recordatorios y avisos por WhatsApp siguen funcionando."; "Para habilitarlo, comunícate con tu proveedor de ISPMAX." (FE:bot/IndexPage.vue:116-123). "Primero conecta el WhatsApp de la empresa" cuando la empresa no tiene número (FE:useMessages.js:114).
- **Efectos externos:** el panel pide un token al backend (`GET /companies/bot-token`) y con él llama al servicio del bot (FE:composables/waApi.js:10-25; BE:companies/companies.controller.ts:26-30). Ante 401/403 limpia el token y reintenta una vez (FE:waApi.js:41-50). ✅ El `sessionId` del bot es el `numero_whatsApp` de la empresa (FE:bot/composables/useBotSession.js:1-28). ✅
- **Pendiente de validar en UI:** ❓ qué ve exactamente un usuario con `bot.messages.ver` si el canal no oficial está desvinculado (el círculo exige `connected || botOficial`).

## BAN-002 · Lista de chats
- **Ruta UI / name:** `/ajustes/bot?view=messages` · columna izquierda (FE:message/IndexMessages.vue:1298-1804).
- **Archivos:** FE: `message/IndexMessages.vue`, `composables/useMessages.js`, `composables/useChatPrefs.js`, `composables/useFotosPerfil.js` · BE: ninguno (todo va al servicio del bot).
- **Para qué sirve:** ver y filtrar las conversaciones de WhatsApp de la empresa, en tiempo real.
- **Acceso:** `bot.messages.ver`. Sin `bot.messages.ver-todos`, el panel pide al bot solo los chats de su usuario (`assignedTo`) (FE:useMessages.js:75, 124). ✅
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | **Buscar...** | filtra por texto (espera 300 ms) | — | `GET /api/tickets?filter=` (bot) | 10 chats por página (FE:useMessages.js:26-31) |
  | **Colas** / nombre de la cola / "N colas" | filtro por colas, multiselección; **Limpiar** | — | `GET /api/queues` (bot) | "Sin colas configuradas" si no hay |
  | **Bandeja**, **Abiertos**, **Cerrados** | pestañas por estado (`waiting`, `open`, `closed`) | — | `GET /api/tickets?status=` | la última pestaña se recuerda (FE:useMessages.js:71) |
  | **Cerrar todo** | cierra de golpe los chats que cumplen el filtro actual | Bandeja: `bot.messages.aceptar-rechazar`; Abiertos: `bot.messages.cerrar` | `PATCH /api/tickets/close-all` | no existe en Cerrados (FE:IndexMessages.vue:310-315) |
  | **Nuevo** | abre "Nuevo chat" (BAN-007) | `bot.messages.nuevo-chat` | — | — |
  | campana (icono) | sonido al llegar un mensaje: **Activado** y cinco tonos (Pop, Ding, Campanita, Burbuja, Aviso doble) | — | — | solo este navegador (localStorage `bot/chat-prefs`; FE:useChatPrefs.js) |
- **Reglas:** el panel se conecta por WebSocket al bot (cabecera `autentication` = número de WhatsApp de la empresa) y reacciona a `nuevo-mensaje`, `mensaje-eliminado`, `mensaje-editado`, `mensaje-estado`, `nuevo-ticket`, `ticket-actualizado`, `chat-en-espera`, `ticket-derivado`, `tickets-cerrados` (FE:useMessages.js:716-789). Reconecta cada 30 s y renueva la conexión a los 50 minutos (FE:useMessages.js:61, 791-798). Cada fila muestra hora (`HH:mm`, "Ayer" o `DD/MM/YY`), vista previa, cola, responsable y N msj (FE:IndexMessages.vue:682-688, 1633-1716). Pie: "N chat(s)" y paginador si hay más de una página (FE:IndexMessages.vue:1782-1803). ✅
- **Mensajes (texto exacto):** "Sin tickets"; "Cargando..."; "Selecciona un ticket para ver la conversación"; "¿Rechazar todos?" / "¿Cerrar todos?" con "Se cerrarán los N ticket(s) de la bandeja|los abiertos que coinciden con el filtro actual."; "N ticket(s) cerrados"; "No había tickets para cerrar"; "No hay tickets para cerrar" (FE:useMessages.js:280-327). Tooltips de **Cerrar todo**: "Rechazar y cerrar todos los tickets de la bandeja (según el filtro actual)" / "Cerrar todos los tickets abiertos (según el filtro actual)".
- **Casos límite:** los "tickets" de la bandeja son conversaciones del bot, no los tickets de soporte del módulo Tickets. ✅
- **Pendiente de validar en UI:** ❓ si `assignedTo` incluye también los chats sin responsable (el panel trata como propios los que no tienen responsable: `esMio`, FE:useMessages.js:77-78).

## BAN-003 · Marcas de cada chat en la lista
- **Ruta UI / name:** misma lista (FE:IndexMessages.vue:1547-1777).
- **Archivos:** FE: `message/IndexMessages.vue`, `message/whatsapp-chat.css`, `composables/useLlamadasIa.js` · BE: `customers/customers.service.ts` (`estadoConexionPorCedula`).
- **Acceso:** `bot.messages.ver`; las marcas dependen de datos que manda el servicio del bot (`pideAsesorDesde`, `esperaDesde`, `alertaEsperaAt`, `silencioEmpresaHasta`, `botEnabled`). ✅
- **Para qué sirve:** distinguir de un vistazo quién espera, quién atiende y qué debe hacerse.
- **Marcas:**
  | Marca | Cuándo sale | Texto exacto |
  |---|---|---|
  | **Pide asesor** (chip bajo el estado, rojo si ya pasó el límite) | `pideAsesorDesde` y el chat no está cerrado ni en Bandeja | "Pide asesor · {tiempo}"; tooltip "El bot pasó este chat a un asesor y nadie le ha respondido todavía" (l.1666-1677) |
  | Pide asesor corto (ícono de asesor y "2m", "1h50", "3d" bajo el avatar) | en Bandeja con `pideAsesorDesde` | tooltip "Pide asesor · {tiempo}. El bot pasó este chat a un asesor y nadie le ha respondido todavía" (l.1607-1616) |
  | Reloj de espera (⏳, rojo si `alertaEsperaAt`) | `esperaDesde` y sin `pideAsesorDesde` | "{n} min" / "{n} h" / "{n} d" / "recién"; tooltip "Esperando respuesta de un asesor" (l.1679-1687) |
  | **Lo empezó la empresa** (ícono de teléfono) | `silencioEmpresaHasta` en el futuro y bot no silenciado | tooltip "Lo empezó la empresa desde el teléfono: el bot no responde hasta hoy a las HH:mm" / "el D mmm a las HH:mm" (l.1624-1629, 728-738) |
  | Bot silenciado (ícono de robot) | `botEnabled === false` | tooltip "Bot silenciado en este chat" (l.1620-1623) |
  | Ícono de bloqueo | número bloqueado en WhatsApp | tooltip "Número bloqueado en WhatsApp" (l.1630-1632) |
  | Punto de color sobre el avatar | el chat tiene cédula identificada | verde `online`, rojo `los`, ámbar `power_fail`, gris `offline`/`sin_trafico`; tooltip "{cliente} — {estado}" (l.844-850, 1561-1604) |
  | Número azul en el punto | cliente con varios servicios activos | menú "¿De cuál servicio ver el estado?", con plan y dirección ("Sin dirección"), insignia **Suspendido** (l.1568-1589) |
  | "En llamada con el asistente" | la IA atiende una llamada de ese cliente | l.1657-1662 |
  | Candado en la vista previa | último mensaje es nota interna | tooltip "Nota interna: el cliente no la ve" (l.1643-1645) |
  | Checks | último mensaje saliente: "No se pudo enviar", "Enviando…", "Enviado", "Entregado", "Leído", "Escuchado" | FE:IndexMessages.vue:696-705 |
- **Reglas:** los textos del punto de estado salen del backend: "En línea", "Corte de fibra (LOS)", "Equipo apagado / sin energía", "Sin conexión", "Sin tráfico en los últimos 20 min", "Con internet (tráfico en los últimos 20 min)", "Varios servicios: elige de cuál ver el estado" (BE:customers/customers.service.ts:3469-3640). El estado de la ONU guardado vale 7 minutos; si no, consulta SmartOLT y lo guarda 1 minuto (BE:customers/customers.service.ts:3478-3560). El panel guarda cada respuesta 2 minutos (FE:IndexMessages.vue:842). Los estados `sin_datos` y `sin_medicion` no pintan punto (FE:IndexMessages.vue:878). ✅
- **Efectos externos:** SmartOLT (estado de la ONU), AdminOLT.
- **Pendiente de validar en UI:** ❓ cuándo el bot fija `pideAsesorDesde`, `esperaDesde` y `alertaEsperaAt` (lo decide el servicio del bot); el límite en minutos para el rojo es "Marcar en rojo si un cliente espera a un asesor más de" en Configuraciones (FE:IndexConfiguraciones.vue:975-1000).

## BAN-004 · Aceptar, rechazar, ver sin leer, cerrar y reabrir
- **Ruta UI / name:** fila en Bandeja y cabecera del chat.
- **Archivos:** FE: `composables/useMessages.js` · BE: ninguno.
- **Acceso:** `bot.messages.aceptar-rechazar` (aceptar y rechazar), `bot.messages.cerrar`, `bot.messages.reabrir`; sin ellos los botones no se muestran (FE:message/IndexMessages.vue:95-100). ✅
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | check verde (tooltip **Aceptar**) | acepta el chat: pasa a **Abiertos** y queda a su nombre | `bot.messages.aceptar-rechazar` | `PATCH /api/tickets/:id/accept` `{userId}` | notifica "Ticket aceptado" |
  | X roja (tooltip **Rechazar**) | cierra el chat desde la bandeja | `bot.messages.aceptar-rechazar` | `PATCH /api/tickets/:id/close` | confirma "¿Rechazar ticket?" → **Rechazar**; "Ticket rechazado" |
  | ojo (tooltip "Ver la conversación sin marcarla como leída") | abre el chat sin avisar a WhatsApp que se leyó | — | — | solo canal no oficial; barra "Viendo sin marcar como leído" (FE:IndexMessages.vue:1732-1746, 2498-2503) |
  | **Cerrar** (candado) / "Cerrar ticket" | cierra el chat abierto | `bot.messages.cerrar` | `PATCH /api/tickets/:id/close` | confirma "¿Cerrar ticket?" → **Cerrar**; "Ticket cerrado" |
  | **Reabrir** | reabre un chat cerrado | `bot.messages.reabrir` | `PATCH /api/tickets/:id/reopen` | confirma "¿Reabrir ticket?" → **Reabrir**; "Ticket reabierto" |
- **Reglas:** en Bandeja no se puede responder: "Acepta el ticket desde la bandeja para responder." (FE:IndexMessages.vue:2498-2504). Un chat cerrado: "Este ticket está cerrado." (l.2485-2497). Al abrir un chat con la pestaña visible, el panel marca los mensajes como leídos (`PATCH /api/tickets/:id/read`) tras 600 ms; en Oficial lo marca el bot (FE:useMessages.js:154-178; IndexMessages.vue:1065-1067). Cerrar o reabrir envía el usuario (`userId`) salvo con `ver-todos`. Tecla Esc cierra la conversación seleccionada (FE:IndexMessages.vue:1258-1265). ✅
- **Mensajes (texto exacto):** los de arriba más "Error al aceptar el ticket", "Error al rechazar el ticket", "Error al cerrar el ticket", "Error al reabrir el ticket" (si el bot no manda otro).
- **Pendiente de validar en UI:** ❓ qué restricciones aplica el bot a `accept`/`close` (por ejemplo, chat ya aceptado por otro usuario).

## BAN-005 · Responder
- **Ruta UI / name:** barra de respuesta (FE:IndexMessages.vue:2484-2752).
- **Archivos:** FE: `IndexMessages.vue`, `composables/useMessages.js`, `composables/useAudioRecorder.js`, `composables/useWhatsappFormat.js` · BE: `cloud-api/cloud-api.service.ts` (`enviarArchivoDesdeBot`, canal Oficial).
- **Acceso:** `bot.messages.enviar` (responder), `bot.messages.editar-mensaje`, `bot.messages.eliminar-mensaje`; sin `enviar` el chat queda en solo lectura (FE:message/IndexMessages.vue:2523-2526). ✅
- **Botones y campos:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | **Escribe un mensaje...** | caja de texto; Enter envía | `bot.messages.enviar` | `POST /api/tickets/:id/reply` | la selección muestra barra de formato: Negrita, Cursiva, Tachado, Monoespacio, Lista numerada, Lista con viñetas, Cita |
  | emoji | selector de emojis | — | — | oculto en móvil (va en el menú **+**) |
  | clip / **+** | menú **Imagen**, **Video**, **Audio**, **Documento** (`.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar`) | — | `POST /api/tickets/:id/reply-media` | diálogo "Enviar archivos" con campo "Añade un pie de foto (opcional)", **Cancelar**, **Enviar** |
  | ✨ | pide una respuesta sugerida (BAN-013) | — | `POST /api/sugerencia-ia/tickets/:id` | solo si "Sugerir respuestas al operador" está encendido |
  | credencial (badge / person_off) | enviar con o sin el nombre del agente | — | — | se guarda en este navegador (`replyWithSignature`, por defecto apagado; FE:stores/auth-user.ts:245, 270) |
  | micrófono | graba una nota de voz (máx. 5 min); **Cancelar grabación**, **Enviar nota de voz** | — | `reply-media` con `ptt` | aparece en lugar de enviar cuando la caja está vacía |
  | menú de cada burbuja | **Responder**, **Copiar**, **Editar**, **Eliminar para todos** | `bot.messages.editar-mensaje`, `bot.messages.eliminar-mensaje` | `PATCH/DELETE /api/tickets/:id/messages/:mid` | Editar (solo texto propio) y Eliminar (mensajes propios que no son notas internas) **solo si el canal no es Oficial** |
- **Reglas:** al responder un asesor, el panel marca el chat como "bot no atiende" y el bot calla en esa conversación hasta el próximo chat (FE:IndexMessages.vue:658-676; tooltip de **Bot**, l.1917-1921). Notas internas del bot se pintan con candado y "Nota interna · el cliente no la ve". Mensajes eliminados por el cliente: "El cliente eliminó este mensaje" / "Lo eliminó para todos en su WhatsApp; aquí se conserva para que sepas qué decía." Interactivos (botones, lista, formulario, enlace, tarjetas) se pintan con la opción que tocó el cliente (FE:IndexMessages.vue:2323-2378). Sin `bot.messages.enviar`: "Solo lectura: no tienes permiso para responder." ✅
- **Mensajes (texto exacto):** "¿Eliminar mensaje para todos?" "El mensaje también se eliminará del WhatsApp del cliente. Esta acción no se puede deshacer."; "Mensaje eliminado"; "Mensaje editado"; diálogo "Editar mensaje" (máx. 4096; "WhatsApp solo permite editar dentro de los primeros ~15 minutos."); "Error al enviar el mensaje"; "Error al enviar el archivo"; "No se pudo iniciar la grabación".
- **Efectos externos:** WhatsApp (envío al cliente). **Pendiente de validar:** ❓ tamaño máximo de archivo en el canal no oficial; en Oficial el backend acepta hasta 100 MB (BE:cloud-api/cloud-api.controller.ts:90-95).

## BAN-006 · WhatsApp Oficial: ventana de 24 h y plantillas
- **Ruta UI / name:** cabecera (línea del chat) y barra de respuesta.
- **Archivos:** FE: `IndexMessages.vue:184-263, 2397-2482`, `useMessages.js:855-870` · BE: `cloud-api/cloud-api.controller.ts:133-138, 279-283`, `cloud-api/cloud-api.service.ts:1563-1625, 2475-2481`.
- **Para qué sirve:** con el canal Oficial solo se escribe texto libre hasta 24 h después del último mensaje del cliente; después, o para iniciar un chat, solo con plantillas aprobadas.
- **Acceso:** `bot.messages.enviar`; solo con el canal Oficial (`esOficial`). ✅
- **Reglas:**
  - `esOficial` = canal del chat o del bot es `cloud`. La ventana es `ventanaHasta` (24 h desde el último mensaje del cliente; el panel la recalcula con cada mensaje entrante). Texto: "Ventana abierta: quedan {h} h {m} min" / "Ventana de 24 h cerrada: solo plantillas" / "El cliente no ha escrito: solo plantillas". Tooltip: "Con WhatsApp Oficial se puede escribir texto libre hasta 24 h después del último mensaje del cliente. Después, o para iniciar un chat, solo plantillas aprobadas (Meta las cobra)." (FE:IndexMessages.vue:191-202, 2114-2125) ✅
  - Ventana cerrada: la barra dice "Pasaron 24 h desde el último mensaje del cliente." o "El cliente todavía no te ha escrito." + "Solo puedes escribirle con una plantilla aprobada." y el botón **Enviar plantilla** (l.2528-2543).
  - Diálogo **Enviar plantilla**: "Solo plantillas aprobadas por Meta. Cada envío se cobra según su categoría."; lista las de chat con estado `APROBADA` (`GET /cloud-api/templates/chat`); campo **Plantilla** (nombre en Meta, texto y categoría); una caja por variable `{{n}} · variable` (las variables `cliente` y `empresa` se completan solas); vista "Así le llegará:"; **Cancelar** y **Enviar** (activo con todas las variables llenas). Sin plantillas: "No hay plantillas de chat aprobadas. Créalas en la pestaña Plantillas del Bot." (l.2397-2482)
  - Backend `POST /cloud-api/bot/plantilla`: rechaza lo que no sea plantilla de chat aprobada ("\"{nombre}\" no es una plantilla de chat aprobada"), las que llevan archivo en la cabecera o botones con datos ("Esa plantilla lleva un archivo o botones con datos y no se puede mandar desde el chat") y parámetros vacíos ("Completa todos los datos de la plantilla") (BE:cloud-api/cloud-api.service.ts:1563-1612). ✅
  - Recordatorio del celular (solo Oficial en modo coexistencia): banner ámbar "Abre la app WhatsApp Business del celular al menos una vez por semana." o "Hace N días que no se escribe desde la app del celular." + "Meta desconecta WhatsApp Oficial si pasan 14 días sin abrirla."; sale si no hay actividad hace 10 días o más; **Entendido** lo oculta 3 días en este navegador (FE:IndexMessages.vue:265-296, 1508-1521).
- **Efectos externos:** WhatsApp Oficial (Meta): cada plantilla se cobra por categoría.
- **Pendiente de validar en UI:** ❓ si un chat nuevo recién creado muestra siempre "El cliente todavía no te ha escrito".

## BAN-007 · Nuevo chat
- **Ruta UI / name:** botón **Nuevo** (FE:IndexMessages.vue:1401-1411) · FE:message/NuevoChatDialog.vue.
- **Archivos:** FE: `message/NuevoChatDialog.vue`, `composables/useMessages.js:510-537` · BE: ninguno propio (búsqueda de clientes de `promesas-pago`).
- **Acceso:** `bot.messages.nuevo-chat`.
- **Campos y botones:** **Cliente:** (búsqueda por nombre o documento, espera 700 ms; "Escribe para buscar un cliente"), **Cola (opcional):** (placeholder "Sin cola", precarga la cola si hay una sola en el filtro), **Cancelar**, **Abrir chat** (activo solo con un cliente con celular). Avisos: "Este cliente no tiene un número de celular registrado." o el celular elegido.
- **Reglas:** `POST /api/tickets/manual` `{number, customerName, queueId}`; luego cambia a **Abiertos** y abre el chat (FE:useMessages.js:510-537). ✅
- **Mensajes:** "Abriendo chat..."; "Primero conecta el WhatsApp de la empresa"; "No se pudo abrir el chat".
- **Efectos externos:** el bot crea el chat; con Oficial hace falta una plantilla para el primer mensaje (BAN-006).

## BAN-008 · Derivar un chat
- **Ruta UI / name:** botón **Derivar** (FE:IndexMessages.vue:1943-1955) · FE:message/DerivarChatDialog.vue.
- **Archivos:** FE: `message/DerivarChatDialog.vue`, `message/IndexMessages.vue:797-801, 1943-1955`, `composables/useMessages.js:356-387` · BE: `auth/` (`GET /auth/users`, lista de usuarios).
- **Acceso:** `bot.messages.derivar` y chat no cerrado y (`ver-todos` o chat propio) (FE:IndexMessages.vue:797-801).
- **Campos y botones:** título "Derivar chat"; "Conversación"; "Responsable actual" (nombre o "Sin dueño (en bandeja)"); **Derivar a:** `Selecciona un usuario` (usuarios activos de `GET /auth/users`, sin uno mismo ni el responsable actual; "Sin usuarios disponibles"); nota "El chat pasará a la lista del usuario elegido y dejará de aparecer en la tuya."; **Cancelar**, **Derivar**.
- **Reglas:** `PATCH /api/tickets/:id/assign` `{userId, fromUserId}`; al destinatario le llega el evento `ticket-derivado` y el aviso "Te derivaron una conversación"; quien deriva sin `ver-todos` deja de ver el chat (FE:useMessages.js:356-387, 767-780). No cambia la cola. ✅
- **Mensajes:** "Chat derivado a {nombre}"; "Derivando..."; "Error al derivar el chat"; "No se pudo cargar la lista de usuarios".

## BAN-009 · Interruptores del bot, "Que responda el bot" y horas de silencio
- **Ruta UI / name:** cabecera del chat (**Bot**), barra "Bot atendiendo los chats", banner del chat y Configuraciones → "Horario de atención del bot".
- **Archivos:** FE: `IndexMessages.vue:1471-1506, 1904-1922, 2131-2153`, `useMessages.js:390-481`, `bot/components/config/IndexConfiguraciones.vue:52-56, 99-102, 139-140, 677-709` · BE: ninguno (settings del bot).
- **Acceso:** apagado general y horas de silencio: `bot.config.horario` (y `bot.config.ver` para ver la pestaña **Configuraciones**); interruptor **Bot** del chat y **Que responda el bot**: sin permiso en el panel (FE:IndexMessages.vue:793, 1904). ✅
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | **Bot** (interruptor del chat) | silencia o reactiva el bot para ese número, para siempre | — | `PATCH /api/tickets/:id/bot` `{enabled}` | "Bot silenciado en este chat" / "El bot vuelve a atender este chat" |
  | interruptor de la barra | apaga o enciende el bot por completo | `bot.config.horario` | `PATCH /api/settings` `{bot_encendido}` | "Bot atendiendo los chats" / "Bot apagado: no llegan chats nuevos"; "Bot encendido: vuelve a atender los chats" / "Bot apagado: no responderá ni llegarán chats nuevos a la bandeja" |
  | **Que responda el bot** | libera un chat que empezó la empresa: el bot responde desde el próximo mensaje del contacto | — | `PATCH /api/bot-exclusiones/liberar-chat-empresa` `{remoteJid}` | "Listo: el bot responde desde el próximo mensaje" |
  | **No responder cuando la empresa empieza la conversación** (interruptor) | activa el silencio | `bot.config.horario` | `PATCH /api/settings` `{silencio_chat_empresa}` | por defecto activo |
  | **Durante** (selector) | horas de silencio: 1, 2, 4, 8, 12, 24, 48 y 72 horas ("2 días", "3 días") | `bot.config.horario` | `{horas_silencio_chat_empresa}` | por defecto 24; "desde lo último que escribiste" |
  | **Guardar** | guarda toda la pestaña Configuraciones | `bot.config.horario` o `bot.config.cobro-ia` | `PATCH /api/settings` | notifica "Configuración guardada" |
- **Reglas:** el banner "Esta conversación la empezó la empresa desde el teléfono: el bot no responde hasta {hora}." sale si el chat no está cerrado, `botEnabled !== false` y `silencioEmpresaHasta` está en el futuro (FE:IndexMessages.vue:728-738, 2132-2153). El texto de ayuda de la configuración: "Si le escribes primero a alguien desde el celular (o WhatsApp Web) … el bot no responde lo que te conteste durante ese tiempo. Sus mensajes sí llegan a la Bandeja, marcados como «Lo empezó la empresa» … Para que nunca lo atienda, agrégalo en Números sin bot." (FE:IndexConfiguraciones.vue:700-708). El apagado general bloquea incluso el aviso de horario (tooltip, l.1500-1504). Tooltip de **Bot**: "El bot atiende este número. Clic para silenciarlo para siempre (para atender solo esta conversación no hace falta: al responder tú, el bot calla hasta el próximo chat)" / "Bot silenciado: no responde a este contacto. Clic para reactivarlo". ✅
- **Pendiente de validar en UI:** ❓ cómo cuenta el bot "desde lo último que escribiste" y si el interruptor general afecta a las llamadas.

## BAN-010 · Números sin bot
- **Ruta UI / name:** ícono de persona tachada en la barra del bot (tooltip "Números sin bot") · FE:message/NumerosSinBotDialog.vue.
- **Archivos:** FE: `message/NumerosSinBotDialog.vue`, `message/IndexMessages.vue:1480-1483, 2887` · BE: ninguno (servicio del bot `/api/bot-exclusiones`).
- **Acceso:** el botón sale con la barra del bot (`botGlobal !== null`, WhatsApp vinculado); el panel no pide permiso propio.
- **Campos y botones:** campo de celular con país (7 a 15 dígitos), **Nombre (opcional)** (ej. "Técnico Luis", máx. 80), interruptor "Privado: que no salga en la bandeja (no se guarda lo que escriba)", **Agregar**. Listas: "Agregados a mano" (nombre o número, "Ya escribió" / "Todavía no escribe", interruptor privado, papelera "Quitar: el bot vuelve a atenderlo") y "Apagados desde un chat" (**Activar bot**). Vacío: "El bot atiende a todos los números".
- **Reglas:** `GET/POST/DELETE /api/bot-exclusiones`, `PATCH /api/bot-exclusiones/:id/privado`, `PATCH .../privado-chat`, `PATCH .../reactivar-chat` (FE:NumerosSinBotDialog.vue:21-117). Sin bot: sus mensajes llegan a la bandeja; privado: ni se guardan ni se ven. ✅
- **Mensajes:** "Listo: el bot no le responderá a ese número"; "Listo: sus mensajes no se guardarán ni saldrán en la bandeja"; "El bot vuelve a atender ese número"; "El bot vuelve a atender ese chat"; "Privado: ya no sale en la bandeja y no se guarda lo que escriba"; "Vuelve a salir en la bandeja (sin bot)"; "No se pudo agregar el número".

## BAN-011 · Bloquear y desbloquear números
- **Ruta UI / name:** ícono de bloqueo en la cabecera del chat y botón de la barra del bot (tooltip "Números bloqueados") · FE:message/NumerosBloqueadosDialog.vue.
- **Archivos:** FE: `IndexMessages.vue:1096-1184, 1972-1998`, `NumerosBloqueadosDialog.vue` · BE: `cloud-api/cloud-api.controller.ts:178-197`, `cloud-api/cloud-api.service.ts:900-985`.
- **Acceso:** `bot.messages.bloquear` y canal Oficial con número dedicado (`bloqueoDisponible`, FE:IndexMessages.vue:1100); el botón del chat solo con número visible (`@s.whatsapp.net`).
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | ícono de bloqueo (tooltip "Bloquear este número en WhatsApp (spam)"; en móvil **Bloquear número**) | bloquea; cierra el chat | `bot.messages.bloquear` | `POST /cloud-api/bloqueados` `{numero}` | diálogo "Bloquear número" → **Bloquear** |
  | **Bloqueado** (rojo) / **Desbloquear** | desbloquea | `bot.messages.bloquear` | `POST /cloud-api/bloqueados/quitar` | diálogo "Desbloquear número" → **Desbloquear** |
  | **Desbloquear** (lista) | desbloquea desde la lista | idem | idem | — |
  | **Reintentar** | vuelve a consultar la lista | — | `GET /cloud-api/bloqueados` | — |
- **Reglas:** Meta solo deja bloquear a quien escribió en las últimas 24 h; no se puede bloquear el propio número; máximo 64 000 bloqueados (BE:cloud-api/cloud-api.service.ts:905-948). Un número bloqueado no puede escribir a la empresa ni la empresa a él. Barra del chat bloqueado: "Número bloqueado en WhatsApp: no puede escribirte ni recibir tus mensajes." ✅
- **Mensajes:** "¿Bloquear a +N en WhatsApp?" con "No podrá volver a escribirle a la empresa y la empresa tampoco a él. La conversación se cerrará. Puedes desbloquearlo después desde Números bloqueados."; "+N bloqueado y conversación cerrada"; "+N bloqueado en WhatsApp"; "+N desbloqueado: ya puede volver a escribir"; BE: "No se pudo bloquear el número: {motivo}", "WhatsApp solo deja bloquear a quien te escribió en las últimas 24 horas (o el número no tiene WhatsApp)", "No puedes bloquear tu propio número", "Se alcanzó el máximo de números bloqueados (64 000)", "WhatsApp está limitando los cambios: espera un momento y vuelve a intentar", "Número inválido", "Bloquear números desde aquí necesita WhatsApp Oficial con número dedicado"; "Consultando en WhatsApp…", "No hay números bloqueados.".
- **Efectos externos:** WhatsApp Oficial (Meta `block_users`).

## BAN-012 · Barra del cliente y Ver cliente
- **Ruta UI / name:** línea de datos del chat (FE:message/ResumenClienteChat.vue) y botón **Ver cliente**.
- **Archivos:** FE: `ResumenClienteChat.vue`, `IndexMessages.vue:811-838, 984-1055, 2758-2797`, `clientes/components/editar/IndexPage.vue`, `Servicios/ResumenOnu.vue` · BE: `customers/customers.controller.ts:408-427`, `customers/customers.service.ts:3654-3680` (`resumenCrm`), `buscarClienteBot`.
- **Acceso:** barra sin permiso propio; **Ver cliente** con `bot.messages.ver-cliente`.
- **Reglas:** identifica al cliente por las cédulas del chat (la que confirmó el bot, luego las de 10 o 13 dígitos escritas por el cliente) con `GET /customers/buscar-cliente-bot/:cedula` (coincidencia exacta de documento); solo muestra datos si todas apuntan a un mismo cliente (FE:ResumenClienteChat.vue:50-62). `GET /customers/resumen-crm/:id` da plan, activo, SN, origen de la ONU; `GET /resumen-cliente?servicio_id` da la deuda. Muestra **Activo** o **Suspendido** (solo si no hay ONU), **Debe {moneda}{monto}** (naranja si no venció, rojo si ya pasó la fecha de pago), el resumen de la ONU (clic abre "Detalles de la ONU · {SN}") y **+N** para otros servicios. Tooltip de deuda: "{n} factura(s) por pagar", "Vence|Venció el {fecha}", "corte el {fecha}". **Ver cliente** abre la ficha dentro del chat con **Volver al chat** y las pestañas Resumen, Servicios, Consumo, Tickets, Facturación/Pagos; con varias cédulas pide elegir ("Clientes en este chat": "Se detectaron varias cédulas en la conversación. Elige el cliente que quieres ver:"); sin cédula abre "Buscar cliente" ("Cliente:", "Escribe para buscar un cliente"). ✅
- **Efectos externos:** SmartOLT / AdminOLT (estado y señal de la ONU).

## BAN-013 · Resumen IA y respuesta sugerida
- **Ruta UI / name:** tarjeta "Resumen IA" sobre los mensajes y caja ✨.
- **Archivos:** FE: `ResumenIaCard.vue`, `SugerenciaIa.vue`, `composables/resumenIa.js`, `composables/useAsistenteIa.js` · BE: ninguno (servicio del bot + token de OpenAI de la empresa).
- **Acceso:** el interruptor "Sugerir respuestas al operador" y "Resumen con IA al cerrar chats y llamadas" están en Configuraciones y exigen el token de OpenAI (otro inventario).
- **Botones y acciones:** **Resumir con IA** (`POST /api/resumen-ia/tickets/:id`), ⟳ "Volver a resumir (con lo último de la conversación)"; **Usar**, "Sugerir otra" (`forzar`), **Cerrar** de la sugerencia (`POST /api/sugerencia-ia/tickets/:id`, espera hasta 90 s).
- **Reglas:** el resumen muestra motivo (14 valores, p. ej. "Consulta de deuda", "Sin internet / falla", "Promesa de pago"), resultado ("Resuelto por el bot", "Resuelto por un asesor", "Quedó pendiente", "Sin resolver", "Sin respuesta"), ánimo (Molesto, Neutral, Satisfecho), texto, "Pendiente: …" y origen ("De la llamada", "Al cerrar el chat", "Pedido a mano") (FE:resumenIa.js; ResumenIaCard.vue:76-102). La sugerencia sale sola 2,5 s después de que escribe el cliente si el chat está abierto, el bot no lo atiende y el último mensaje es del cliente; no se envía sola; "Usar" la pone en la caja (FE:SugerenciaIa.vue:77-96, 98-108). ✅
- **Mensajes:** "Preparando una respuesta sugerida…", "Revísala antes de enviar: no se manda sola.", "Al responder tú, el bot deja de contestar en esta conversación (vuelve en el próximo chat).", "El último mensaje del cliente ya está respondido. La sugerencia sale cuando el cliente escribe.", "No hay nada que sugerir ahora", "No se pudo armar la sugerencia", "No se pudo armar el resumen".
- **Efectos externos:** OpenAI (por el bot).

## BAN-014 · Llamadas de WhatsApp en el panel
- **Ruta UI / name:** aviso flotante abajo a la derecha en todo el panel (FE:layouts/LlamadasGlobal.vue; FE:message/LlamadasWidget.vue), botón **Llamar** del chat y interruptor **Recibir llamadas de WhatsApp** en Mensajería.
- **Archivos:** FE: `composables/useLlamadas.js`, `useLlamadasGlobal.js`, `useLlamadasIa.js`, `LlamadasWidget.vue`, `layouts/LlamadasGlobal.vue`, `mensajeria/components/WhatsappCloudApi.vue:32-65, 595-621` · BE: `cloud-api/cloud-api.controller.ts:98-124, 165-176`, `cloud-api/cloud-api.service.ts:700-905`.
- **Acceso:** `bot.messages.llamadas` (aviso y contestar). **Llamar** exige además `bot.messages.enviar`, canal Oficial **número dedicado**, llamadas activadas y número visible (`@s.whatsapp.net` o `@bsuid`) (FE:IndexMessages.vue:1195-1199). El interruptor: `variables.vincular.whatsApp`.
- **Botones y acciones:** (tooltips literales)
  | Etiqueta | Qué hace | Endpoint (bot) |
  |---|---|---|
  | **Contestar** / "Termina la llamada en curso" | contesta la llamada que suena | `POST /api/llamadas/:id/contestar` y `/aceptar` |
  | **Rechazar** | rechaza | `.../rechazar` |
  | "Contestar y dejar en espera: el cliente escucha un tono hasta que lo atiendas" | solo si ya hay otra llamada activa | `.../contestar`, `.../aceptar` |
  | "Pasar al asistente: la IA contesta y atiende la llamada" | solo si `iaDisponible` | `.../asistente` |
  | **Abrir el chat** | lleva al chat de la llamada | — |
  | **Silenciar** / **Activar micrófono** | silencia el micrófono | — |
  | "Poner en espera (el cliente escucha un tono)" | pausa la activa | — |
  | "Retomar la llamada" / "Retomar (la llamada actual pasa a espera)" | retoma una en espera | — |
  | **Colgar** | termina | `.../colgar` |
  | **Llamar** ("Llamar por WhatsApp (Meta la cobra por minuto)" / "Ya tienes una llamada en curso") | llamada saliente | `GET/POST /api/llamadas/ticket/:id/permiso`, `POST .../llamar` |
  | **Ver todas** / **Ver menos** | pliega las llamadas que suenan (se ven 2) | — |
  | **Recibir llamadas de WhatsApp** | prende/apaga la Calling API en Meta | `GET/POST /cloud-api/llamadas` |
- **Reglas:** el audio va por WebRTC entre el navegador y WhatsApp (servidor STUN público de Google); pide permiso de micrófono (FE:useLlamadas.js:30, 287). Estados: "Conectando…", "Llamando…", "Sonando…", "En llamada · m:ss". Timbre sintético con WebAudio mientras haya llamadas sonando y ninguna activa. Escucha solo si la empresa usa Oficial con número dedicado; si no logra activar, reintenta cada 30 s hasta 10 veces y al volver a la pestaña (FE:useLlamadasGlobal.js:27-80, 83-113). Llamar: consulta el permiso del cliente; si falta, el diálogo "Pedir permiso para llamar" ("… todavía no autorizó que lo llames. ¿Le enviamos la solicitud por WhatsApp? Solo le llega si escribió en las últimas 24 horas. Cuando acepte te avisamos y podrás llamarlo.", **Enviar solicitud**); Meta permite 1 solicitud por día y 2 por semana (BE:cloud-api/cloud-api.service.ts:807-812). Backend: acciones `pre_accept`, `accept`, `reject`, `terminate`, `connect`; errores 138006 ("El cliente todavía no autorizó que lo llames: envíale la solicitud de permiso."), 138000 ("Las llamadas no están activadas en el número (Ajustes › Mensajería)."), 138012 ("Se alcanzó el límite de llamadas con este cliente; intenta mañana.") (BE:cloud-api/cloud-api.service.ts:745-751). Activar: `settings.calling` `ENABLED`; Meta exige límite de mensajería de 2000 o más ("Meta todavía no permite llamadas en este número: pide un límite de mensajería de 2000 o más …"); el interruptor solo aparece con número dedicado conectado y llamadas disponibles; texto: "Tus clientes ven el botón de llamar y contestas desde Bot › Messages." y tooltip "Meta exige que el número tenga un límite de mensajería de 2000 o más. En tu app de Meta suscribe también el campo calls en Webhooks. Fuera del horario del bot la llamada se rechaza y el cliente recibe el aviso de fuera de horario. Recibir llamadas no tiene costo." ✅
- **Mensajes:** "La llamada terminó"; "{nombre} colgó mientras estaba en espera"; "{nombre} autorizó que lo llames" / "{nombre} no autorizó que lo llames"; "Solicitud de permiso enviada"; "Permite el uso del micrófono en el navegador para llamar" / "…para contestar"; "El asistente contestó la llamada"; "WhatsApp no permite llamar a este cliente ahora (límite de llamadas). Intenta más tarde."; "Llamadas activadas. WhatsApp puede tardar en mostrar el botón de llamar a tus clientes."; "Llamadas desactivadas."
- **Efectos externos:** WhatsApp Oficial (Calling API de Meta), micrófono del navegador, STUN de Google, IA de voz (asistente) vía el bot.
- **Pendiente de validar en UI:** ❓ cómo aplica el bot la regla "devolver la llamada" (commit `4d313554`): vive en el servicio del bot.

## BAN-015 · Avisos a grupos de WhatsApp
- **Ruta UI / name:** `/ajustes/mensajeria` → pestaña Configuración → tarjeta "Avisos a grupos de WhatsApp" (FE:mensajeria/components/AvisosGrupos.vue).
- **Archivos:** FE: `mensajeria/IndexPage.vue:302-308`, `AvisosGrupos.vue`, `composables/gruposCache.js` · BE: `avisos-grupo/avisos-grupo.service.ts`, `avisos-grupo/avisos-programados.service.ts`, `avisos-grupo/avisos-grupo.module.ts` y los emisores en `ticket/ticket.service.ts`, `instalaciones/instalaciones.service.ts`, `customers/customers.service.ts`, `pasarelas-pago/pasarelas-pago.service.ts`, `router/router-monitor.service.ts`, `monitoreo-dispositivos/monitoreo-dispositivos-notifier.service.ts`, `incidentes-red/{deteccion-masiva,smartolt-eventos}.service.ts`.
- **Acceso:** para entrar a Mensajería, `variables.vincular.whatsApp` o `variables.config.servidor.correo`. La tarjeta sale solo con canal activo **no oficial** y sesión vinculada, y con alguno de `bot.config.ver`, `tickets.edit`, `instalaciones.edit`, `mapa.incidentes.gestionar`, `variables.facturacion`, `ajuste.cobros` (FE:mensajeria/IndexPage.vue:304). Cada módulo de avisos se muestra con su propio permiso y el del CRM además depende del plan (FE:AvisosGrupos.vue:29-52). ✅
- **Botones y campos:** **Actualizar grupos**, **Crear grupo** (diálogo "Crear grupo": **Nombre del grupo** máx. 100, **Participantes** con país, **Agregar otro número** hasta 50, "El número del bot queda como administrador del grupo.", **Cancelar**, **Crear**); por aviso, selector **Grupo** (o "No avisar"; "Ningún grupo con ese nombre") y botón de envío "Enviar un mensaje de prueba a este grupo"; **Guardar avisos** (insignia "Sin guardar").
- **Reglas:** cada sección dice "N de M activos". Guardar envía `PATCH /api/settings` `{avisos_grupos: {evento: {activo, grupo_id, grupo_nombre}}}`; la lista de grupos viene de `GET /api/grupos` y se guarda 10 min (FE:gruposCache.js); prueba `POST /api/grupos/avisos/prueba`; crear `POST /api/grupos`. Si en el grupo solo escriben admins y el bot no lo es: "En ese grupo solo escriben los administradores y el bot no lo es." ISPMAX avisa con `POST {HOST_API_WHATSAPP}/api/grupos/avisos/crm` `{sessionId, evento, texto (≤3000), clave}`; si no hay grupo configurado el bot no hace nada y un fallo solo queda en el log (BE:avisos-grupo/avisos-grupo.service.ts:36-55). Eventos de ISPMAX (BE:avisos-grupo/avisos-grupo.service.ts:6-19):
  | Evento | Cuándo | Primera línea del aviso |
  |---|---|---|
  | `ticket_nuevo` | al crear un ticket | "🎫 Ticket nuevo {…}" (ticket.service.ts:189) |
  | `ticket_asignado` | cambia el técnico | "🔁 Ticket reasignado {…}" (ticket.service.ts:972) |
  | `ticket_cerrado` | pasa a un estado de cierre | "✅ Ticket {estado} {…}" / "🚫" si cancelado (ticket.service.ts:981) |
  | `instalacion_nueva` | al crear una instalación | "🆕 Instalación nueva #N ({estado})" (instalaciones.service.ts:95) |
  | `instalacion_cambio` | cambia de estado (salvo INSTALADO) o se reasigna el técnico | "📅 Instalación #N: {estado} (antes …)" / "🔁 Instalación #N: técnico reasignado" |
  | `instalacion_terminada` | al instalarse | "🏁 Instalación terminada #N" (customers.service.ts:755) |
  | `caida_masiva` / `caida_resuelta` | incidente masivo que no es de un router ni de una antena | (deteccion-masiva.service.ts:113-120) |
  | `router_caido` | router sin conexión tras auto-reparar, 'N de M routers' en tormenta, router recuperado, OLT sin lectura en SmartOLT y su vuelta | "🔴 Router sin conexión: …", "🟢 El router … volvió", "🔴 OLT sin conexión: …", "🟢 La OLT … volvió" |
  | `antena_caida` | antenas/radios sin respuesta o que vuelven (una tanda por mensaje, hasta 20 líneas) | "📶 Equipo sin respuesta" / "🟢 Volvió a responder" |
  | `firma_por_vencer` | cron diario 08:00; avisa a 15, 7, 3, 1 y 0 días y a −1, −3 y −7 | "⚠️ La firma electrónica vence en N días" / "⛔ La firma electrónica vence HOY" / "⛔ La firma electrónica venció el …" |
  | `resumen_cortes` | cron cada 10 min; una vez al día cuando terminó el corte (30 min sin registros) | "📋 Resumen de cortes — …" |
  | `pago_pasarela` | pago por pasarela con problema | "💳 {título del problema}" (pasarelas-pago.service.ts:264) |
  Además, el bot manda los avisos propios del CRM (cliente que pide asesor, solicitud de instalación, comprobante por revisar…) ❓. Cada aviso lleva una clave para no repetirse (p. ej. `ticket:{id}:nuevo`). ✅
- **Mensajes (texto exacto):** "Avisos a grupos guardados"; "Mensaje de prueba enviado al grupo"; "No se envió la prueba"; "No se pudo leer la lista de grupos"; "Escribe el nombre del grupo y al menos un número"; "Grupo creado"; "Grupo creado. No usan WhatsApp: …"; "No tienes permiso para configurar estos avisos."
- **Efectos externos:** WhatsApp no oficial (grupos). Comparten el mismo bot que el CRM.
- **Pendiente de validar en UI:** ❓ título y ayuda de cada evento y a qué módulo (permiso) pertenece cada uno: los manda el servicio del bot.

## BAN-016 · Perfil del negocio en WhatsApp
- **Ruta UI / name:** Ajustes → Mensajería → Configuración → tarjeta WhatsApp → pestaña **Oficial** → modo **Número dedicado (Meta)** → sección **Perfil del negocio en WhatsApp** (FE:mensajeria/components/PerfilNegocioWa.vue; se muestra con `esDedicado && modo === modoGuardado && conectado`, WhatsappCloudApi.vue:623).
- **Archivos:** FE: `PerfilNegocioWa.vue` · BE: `cloud-api/cloud-api.controller.ts:198-217`, `cloud-api/cloud-api.service.ts:984-1100`, `cloud-api/dto/perfil-negocio.dto.ts`.
- **Acceso:** `variables.vincular.whatsApp` (tarjeta). El backend exige solo sesión y número dedicado.
- **Campos y botones:** foto + nombre (solo lectura) + número; **Cambiar foto** (JPG o PNG; el panel recorta al centro a 640×640 px y sube JPG; backend máx. 5 MB); **Info** (139), **Descripción del negocio** (512), **Dirección** (256), **Correo de contacto** (128), **Categoría** (17 opciones: Servicios profesionales, Otro, Tienda / comercio, Educación, Entretenimiento, Finanzas, Gobierno, Salud, Hotel / alojamiento, Restaurante, Viajes y transporte, Automotriz, Belleza, Ropa, Alimentos, Eventos, Sin fines de lucro), **Sitio web**, **Segundo sitio web (opcional)** (256; se antepone `https://`), **Guardar perfil**, **Reintentar**.
- **Reglas:** se consulta al abrir la sección (`GET /cloud-api/perfil`); guardar `POST /cloud-api/perfil`; foto `POST /cloud-api/perfil/foto` (sube a la app de Meta y asigna). El campo vacío borra ese dato en Meta, salvo **Info**: Meta no la acepta vacía y se conserva la anterior. El nombre visible no se cambia desde aquí (lo revisa Meta: Administrador de WhatsApp → Números de teléfono) ni el horario. Validaciones del backend: "La info admite hasta 139 caracteres", "La descripción admite hasta 512 caracteres", "La dirección admite hasta 256 caracteres", "El correo admite hasta 128 caracteres", "El correo no es válido", "WhatsApp admite hasta 2 sitios web", "Cada sitio web debe empezar con http:// o https://", "Categoría no válida". ✅
- **Mensajes:** "Consultando el perfil en WhatsApp…"; "Perfil actualizado. WhatsApp puede tardar unos minutos en mostrarlo a tus clientes."; "Foto actualizada. WhatsApp puede tardar unos minutos en mostrarla a tus clientes."; "No se pudo consultar el perfil en WhatsApp"; "No se pudo guardar el perfil"; "No se pudo cambiar la foto"; "Elige una imagen (JPG o PNG)"; BE: "WhatsApp no aceptó el perfil: …", "El perfil del negocio se edita desde aquí solo con número dedicado", "La foto debe ser una imagen JPG o PNG", "La foto no puede pesar más de 5 MB", "WhatsApp no aceptó la foto: …".
- **Efectos externos:** WhatsApp Oficial (Meta: `whatsapp_business_profile`, subida de la foto con la app dueña del token).

## Hallazgos del dominio
- La bandeja no vive en `backend-isp`: todo el estado de los chats está en el servicio del bot; el panel solo guarda el sonido y la firma en el navegador.
- `LlamadasGlobal.vue` escucha por su propio WebSocket y por eso el aviso de llamada sale en cualquier módulo, no solo en Mensajes.
- El interruptor **Bot** del chat y **Que responda el bot** no comprueban permiso en el panel (FE:IndexMessages.vue:1904, 2141); el apagado general sí exige `bot.config.horario`.
- Las categorías aceptadas por el backend del perfil (21) son más que las 17 que ofrece la lista (faltan ALCOHOL, ONLINE_GAMBLING, OTC_DRUGS, PHYSICAL_GAMBLING).
- El tooltip del interruptor de llamadas nombra "Bot › Messages", mientras la pestaña se llama **Mensajes**.
