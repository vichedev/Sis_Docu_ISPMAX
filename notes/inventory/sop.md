# Inventario SOP — Soporte: tickets, instalaciones y técnicos de campo
> Alcance: FE `pages/dashboard/tickets/**`, `pages/dashboard/instalaciones/**`, `composables/useLatidoUbicacion.js`, `layouts/BotonJornada.vue` (+ `composables/useUbicacion.js`, `composables/useAppIspmax.js`, `composables/useWaCanal.js`, `components/DragAndDropUploadImage.vue`, `pages/dashboard/ajustes/ticket/**`, `ajustes/instalacion/**`, `ajustes/plantillas/components/PlantillaTicket.vue`, capa "Técnicos" de `Gestion-Red/mapa-nap/IndexPage.vue`, pestaña Tickets de la ficha del cliente) · BE `ticket/**` (incl. `firma/`, `materiales/`, `visitas/`, `pdf-plantillas/`), `respuestas-tickets/**`, `instalaciones/**`, `respuestas-instalaciones/**`, `ubicacion-tecnicos/**` (+ `materiales/materiales.service.ts`, partes de `customers/customers.service.ts` que tocan `instalacion_id`). Generado desde el ZIP del 2026-10-06.

> Convención de citas: `FE:` = `frontend-isp-main/src/…`, `BE:` = `backend-isp-main/src/…`. ✅ = leído en código. ❓ = inferido o por comprobar en la UI. Nada está marcado 🖥️ (no hay instancia).

> **Advertencia transversal (aplica a todas las secciones):** el backend NO exige permisos por funcionalidad. `@Auth()` solo comprueba que el JWT sea válido y el usuario esté activo (`BE:auth/guards/user-role/user-role.guard.ts:8-19`, `BE:auth/strategies/jwt.strategy.ts:33-62`). Todos los permisos `tickets.*` / `instalaciones.*` se aplican **solo en el frontend** (ocultar botones y bloquear rutas). La única excepción en este dominio es `mapa.tecnicos.index` (`BE:ubicacion-tecnicos/ubicacion-tecnicos.service.ts:121-128`) y la regla de reasignación de instalaciones (`BE:instalaciones/instalaciones.service.ts:766-773`). ✅

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| SOP-001 | Listado de tickets (tarjetas, filtros, columnas, acciones de fila) | `/tickets` · `tickets.index` · menú Gestion de Clientes → Tickets | `tickets.index`; `tickets.ver_otros`; `tickets.add`; `tickets.edit`; `ticket.delete`; `ticket.reenviar_msg` | completo |
| SOP-002 | Crear ticket ("Nuevo Ticket") | `/tickets/add` · `tickets.add` | `tickets.add`; `tickets.asignar_otros` | completo |
| SOP-003 | Detalle y edición del ticket (pestañas Detalles / Formulario Ticket / Materiales) | `/tickets/edit/:id` · `tickets.edit` | `tickets.edit` (ruta); creador o SUPER-ADMINISTRADOR (pestaña Formulario) | completo |
| SOP-004 | Ciclo de vida del ticket: estados, cambio de estado, cierre y reapertura | botón "Cambiar Estado" en `tickets.edit` | `tickets.cambiar_estado_otros`; creador; técnico asignado | completo |
| SOP-005 | Respuestas del ticket (comentarios, adjuntos, aviso al otro usuario) | sección "LISTADO DE RESPUESTAS" en `tickets.edit` | (sin permiso propio; ruta `tickets.edit`) | completo |
| SOP-006 | Visita del técnico: marcar llegada / salida con ubicación | tarjeta "Visita del técnico" en `tickets.edit` | técnico asignado, apoyo (si ajuste) o SUPER-ADMINISTRADOR | completo |
| SOP-007 | Materiales del ticket (equipos entregados y accesorios) | pestaña "Materiales" de `tickets.edit` | `tickets.edit` | completo |
| SOP-008 | Firma del ticket por el cliente (electrónica o en el dispositivo) | botón de firma en `/tickets` y en `tickets.edit` | `tickets.edit`; modo `firmaTicketModo` | completo |
| SOP-009 | Técnicos de apoyo en el ticket | campo "Técnicos de apoyo" (Form) + Ajustes | `tickets.asignar_otros` + ajuste `ticketApoyoHabilitado` | completo |
| SOP-010 | Notificaciones del ticket (WhatsApp/correo, campana, reenvío manual, plantillas) | modal "Enviar Notificación" + toggles del formulario | `ticket.reenviar_msg` / `cliente.ticket.reenviar_msg` | completo |
| SOP-011 | Impresión y exportación: PDF/Excel del listado, PDF del ticket, formato Word | botón "Reporte", icono PDF, Ajustes → Plantillas | (sin permiso propio) | completo |
| SOP-012 | Reportes de tickets: Productividad y Por Cliente | `/tickets/reportes` · `tickets.reportes` | `tickets.index` (mapeado en el guard) | completo |
| SOP-013 | Tickets desde la ficha del cliente | Cliente → pestaña "Tickets" | `cliente.ticket.index/agregar/editar/eliminar/reenviar_msg/asignar_otros` | completo |
| SOP-014 | Listado de instalaciones (tarjetas, filtros, exportación) | `/instalaciones` · `instalaciones.index` | `instalaciones.index/add/edit/delete/notificar/imprimir` | completo |
| SOP-015 | Crear instalación ("Nueva Instalación") | `/instalaciones/add` · `instalaciones.add` | `instalaciones.add` | completo |
| SOP-016 | Detalle y edición de la instalación (pestañas Detalles / Formulario Instalación / Materiales) | `/instalaciones/edit/:id` · `instalaciones.edit` | `instalaciones.edit`; creador o SUPER-ADMINISTRADOR (pestaña Formulario) | completo |
| SOP-017 | Ciclo de vida de la instalación: estados, transiciones, motivo y reagendado | botón "Cambiar Estado" en `instalaciones.edit` | (solo `instalaciones.completar` para INSTALADO) | completo |
| SOP-018 | Reasignar técnico de una instalación (con motivo e historial) | botón "Reasignar" en Detalles | `instalaciones.edit` + creador/SUPER-ADMINISTRADOR | completo |
| SOP-019 | Checklist de instalación | sección "Checklist de instalación" en Detalles | (sin permiso propio) | completo |
| SOP-020 | Respuestas de la instalación | sección "LISTADO DE RESPUESTAS" | (sin permiso propio) | completo |
| SOP-021 | Materiales de la instalación (productos y accesorios, stock, venta/comodato) | pestaña "Materiales" | (sin permiso propio) | completo |
| SOP-022 | Pre-asignación técnica (borrador de plan/router/red/NAP/IP) | tarjeta "Pre-asignación técnica" en el formulario | (pestaña Formulario) | completo |
| SOP-023 | Completar instalación: alta de cliente/servicio y qué se transfiere | "Cambiar Estado → INSTALADO" → `/clientes/add` o ficha del cliente | `instalaciones.completar` (+ permisos de cliente) | completo |
| SOP-024 | Notificaciones de instalación (por estado, reenvío manual, plantillas) | modal "Enviar Notificación de Instalación"; Ajustes → Plantillas → Instalación | `instalaciones.notificar`; `variables.ver.plantilla.instalacion` | completo |
| SOP-025 | Hoja de instalación (PDF) y exportación del listado (Excel/PDF) | icono impresora; botón "Reporte" | `instalaciones.imprimir` | completo |
| SOP-026 | Reportes / KPIs de instalaciones | `/instalaciones/reportes` · `instalaciones.reportes` | `instalaciones.index` (mapeado en el guard) | completo |
| SOP-027 | Ubicación de técnicos: aviso periódico desde el panel | automático al iniciar sesión (rol "TECNICO") | rol cuyo nombre sea TECNICO | completo |
| SOP-028 | Jornada del técnico en la app ISPMAX | botón de ubicación en la cabecera (solo app) | rol TECNICO + app Android | completo |
| SOP-029 | Capa "Técnicos" del Mapa de Red (qué ve el administrador) | `/mapa-nap` · `index.mapa` → menú de capas → "Técnicos" | `mapa.tecnicos.index` | completo |
| SOP-030 | Matriz de permisos y control de acceso del dominio | Usuarios → Roles → "Tickets" / "Instalaciones" | catálogo `gestion-clientes-permisos.json` | completo |
| SOP-031 | Ajustes que gobiernan tickets e instalaciones | Ajustes → Plantillas → Tickets / Instalación / Formato de Ticket | `variables.ver/edita.plantilla.ticket`, `variables.ver.plantilla.instalacion` | completo |

---

## SOP-001 · Listado de tickets
- **Ruta UI / name:** `/tickets` · `tickets.index` · menú lateral "Gestion de Clientes" → "Tickets" (visible con `tickets.index`) (`FE:layouts/SideBarMenu.vue:277-286`). ✅
- **Archivos:** FE: `pages/dashboard/tickets/IndexPage.vue`, `components/ResumenCardsTickets.vue`, `composables/useTicket.js` · BE: `ticket/ticket.controller.ts`, `ticket/ticket.service.ts` (`findAll` 646-769, `getResumen` 915-959).
- **Para qué sirve:** lista paginada de órdenes de soporte, con tarjetas de conteo por estado, filtros y las acciones por fila (editar, eliminar, reenviar aviso, firmar, descargar PDF).
- **Acceso:** entrar requiere el permiso de ruta `tickets.index` (guard por nombre de ruta, `FE:router/auth-guard.ts:136-137`). Ver tickets de otros requiere `tickets.ver_otros` o rol SUPER-ADMINISTRADOR (`FE:…/tickets/IndexPage.vue:56-58`). ✅
- **Secciones / pestañas:** (1) fila de 7 tarjetas; (2) barra superior con botones y buscador; (3) fila de filtros; (4) tabla.
- **Tarjetas (`GET /ticket/stats/resumen`):** TOTAL, HOY, ABIERTOS, EN PROCESO, RESUELTOS, CERRADOS, CANCELADOS (`FE:…/ResumenCardsTickets.vue:31-81`). "HOY" = tickets creados hoy **pero contados dentro del rango de fechas elegido**: si hoy queda fuera del rango, marca 0 (`BE:ticket/ticket.service.ts:931-934`, a diferencia de Instalaciones, que lo calcula aparte). ✅

- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Nuevo | abre `/tickets/add` | `tickets.add` | — | `FE:…/IndexPage.vue:290-296` |
  | Reportes | abre `/tickets/reportes` | ninguno extra (guard lo mapea a `tickets.index`) | — | icono `analytics` |
  | Columnas del reporte (selector cascada) | elige columnas extra para el listado PDF/Excel y el PDF del ticket | ninguno | `GET /ticket/pdf/campos-extra` | selección guardada en `localStorage` clave `ticket/columnas-reporte` (`FE:…/useTicket.js:93-105,253-260`) |
  | Reporte ▾ → "Descargar PDF" / "Descargar Excel" | descarga el listado filtrado | ninguno | `GET /ticket/download/pdf` · `/download/excel` | ver SOP-011 |
  | OCULTAR COLUMNAS | oculta columnas de la tabla (guardado en el store del usuario `visibleColumnsTickes`) | ninguno | — | `FE:…/IndexPage.vue:344-372` |
  | Buscar... | búsqueda de texto (debounce 900 ms) | ninguno | `GET /ticket?filter=` | busca en asunto, nombre del cliente, técnico, operador, turno, prioridad y estado (`BE:ticket.service.ts:689-701`) |
  | icono lápiz "Editar Ticket" | abre `/tickets/edit/:id` | `tickets.edit` | — | `FE:…/IndexPage.vue:554-571` |
  | icono papelera "Eliminar Ticket" | confirma y borra (borrado lógico) | `ticket.delete` **y** ser el operador que lo creó (`claim.id === row.operador.id`) | `DELETE /ticket/:id` | un SUPER-ADMINISTRADOR que no lo creó NO ve el botón (`FE:…/IndexPage.vue:573-593`) |
  | icono enviar "Enviar mensaje de notificación" | abre el modal de reenvío (SOP-010) | `ticket.reenviar_msg` y estado ≠ CERRADO/CANCELADO | `POST /ticket/notification` | `FE:…/IndexPage.vue:595-615` |
  | icono firma ("Firmar en este dispositivo" / "Enviar a firmar al cliente" / estado de firma) | abre el diálogo de firma (SOP-008) | `tickets.edit` + (modo manuscrita, o firma electrónica configurada) | ver SOP-008 | el icono cambia de color según el trámite (`FE:…/IndexPage.vue:617-637`) |
  | icono PDF rojo "Descargar reporte PDF" | descarga el PDF del ticket | ninguno | `GET /ticket/download/pdf/:id` | ver SOP-011 |

- **Filtros y columnas de tabla:**
  - Filtros (etiquetas exactas): **Respuesta:** Todos / Respondidos / No respondidos · **Estado:** multi-selección ABIERTO, EN PROCESO, RESUELTO, CERRADO, CANCELADO · **Prioridad:** multi-selección Baja, Media, Alta, Critico · **Técnico:** multi (solo con `puedeVerDeOtros`) · **Operador:** multi (idem) · **Fechas:** rango (por defecto el mes en curso, `FE:…/useTicket.js:82-86`). (`FE:…/IndexPage.vue:399-548`) ✅
  - El rango de fechas filtra por **fecha de creación** (`created_at`), no por fecha de visita (`BE:ticket.service.ts:686-687`). Sin rango y sin cliente/servicio el backend aplica el mes actual por omisión (668-674). ✅
  - Columnas: N° (secuencial con 7 dígitos), Cliente (enlace a la ficha, nueva pestaña), Asunto, Fecha Visita, Turno / Hora ("Mañana - 09:30"), Técnico (+ insignia "+N" con tooltip "Técnicos de apoyo:"), Operador, Prioridad, Fecha Creación (DD/MM/YYYY HH:mm), Ultima Respuesta (fecha relativa o "Sin Respuesta"), Estado (insignia de color), acciones (columna fija a la derecha). (`FE:…/IndexPage.vue:39-52`)
  - Orden: `created_at` descendente fijo (`BE:ticket.service.ts:751`). Paginación 10 por defecto.
- **Reglas de visibilidad (importante):**
  - Con `tickets.ver_otros`/SUPER-ADMINISTRADOR: ve todos; los selectores Técnico/Operador son opcionales.
  - Sin ese permiso: el frontend manda `tecnico = operador = mi id`, y el backend devuelve los tickets donde soy responsable **o** de apoyo **o** creador (`BE:ticket.service.ts:707-721`). ✅
  - Filtrar por Técnico incluye también los tickets donde esa persona es de apoyo (`BE:…:708-710`). ✅
- **Estados posibles:** ABIERTO, EN_PROCESO, RESUELTO, CERRADO, CANCELADO (`BE:ticket/entities/ticket.entity.ts:8-14`). Colores: ABIERTO azul, EN_PROCESO naranja, RESUELTO verde, CERRADO teal, CANCELADO rojo (`FE:…/useTicket.js:375-396`).
- **Reglas de negocio (backend):**
  1. La lista une cliente (obligatorio), técnico, apoyos (id y nombre), operador y servicio (id y dirección) y agrega `ultimaRespuesta` por ticket (`BE:ticket.service.ts:676-759`). ✅
  2. Las tarjetas **no usan los mismos filtros que la tabla**: `getResumen` ignora Estado, Respuesta y búsqueda, no considera técnicos de apoyo y combina Técnico y Operador con **AND** (la lista usa OR) (`BE:ticket.service.ts:944-946` vs `712-721`). Para un usuario sin `tickets.ver_otros` (tecnico = operador = yo) las tarjetas cuentan solo tickets que él mismo creó y que además tiene asignados. ✅
  3. Borrado: `softDelete` + log `DELETE`; no devuelve materiales ni libera equipos (`BE:ticket.service.ts:882-913`). ✅
- **Efectos secundarios externos:** ninguno al listar. Al abrir la página, si hay trámites de firma "pending/in_progress" el listado se refresca solo cada 15 s mientras la pestaña esté visible (`FE:…/IndexPage.vue:190-215`). ✅
- **Mensajes de error/éxito (texto exacto):** `'Ticket Eliminado'` (positive), `'Fallo al eliminar el ticket'` (negative, si el backend no trae mensaje), diálogo `¿Deseas eliminar el ticket 0000123?` con botones "Eliminar"/"Cancelar"; vacío: `No se encontró ningun resultado.` (`FE:…/IndexPage.vue:117-130,755-758`).
- **Relaciones con otros módulos:** Cliente (enlace a `cliente.edit`), Usuarios (`/auth/users` alimenta los selectores), Firma electrónica (`/tickets-firma/solicitudes?ticketIds=`).
- **Casos límite y advertencias:**
  - Existe texto "Mis tickets" en Ajustes y en el formulario, pero **no hay una pantalla con ese nombre**: es esta misma lista filtrada por la persona (ver reglas). ✅
  - `Eliminar` exige ser el creador aunque se sea SUPER-ADMINISTRADOR (el botón no aparece); aun así el endpoint no lo exige. ✅
  - La acción "enviar" se oculta en CERRADO/CANCELADO pero sí está disponible en RESUELTO.
  - La tabla guarda página/tamaño de página en el store (`estadosStore.paginationTicket`).
- **Preguntas probables de usuarios:**
  1. "¿Por qué solo veo mis tickets?" → no tiene `tickets.ver_otros`.
  2. "¿Por qué no me aparece el botón de eliminar?" → solo el operador que creó el ticket, y con permiso `ticket.delete`.
  3. "¿El filtro de fechas es por la fecha de visita?" → no, es por creación.
  4. "¿Por qué los números de arriba no coinciden con la tabla?" → las tarjetas no aplican estado/búsqueda y combinan técnico+operador con AND.
  5. "¿Qué significa el +2 junto al técnico?" → dos técnicos de apoyo.
  6. "¿Cómo veo solo los tickets sin respuesta?" → filtro Respuesta = No respondidos.
  7. "¿Puedo ocultar columnas?" → sí, selector "OCULTAR COLUMNAS"; se recuerda por usuario.
- **Pendiente de validar en UI:** ❓ comportamiento visual del selector "Columnas del reporte"; ❓ si "Ultima Respuesta" muestra el aviso automático de cambio de estado (el código sí lo cuenta como respuesta, ver SOP-004).

---

## SOP-002 · Crear ticket
- **Ruta UI / name:** `/tickets/add` · `tickets.add` · botón "Nuevo" del listado; también como diálogo "Agregar Ticket" desde la ficha del cliente (SOP-013). ✅
- **Archivos:** FE: `AddTicket.vue`, `components/FormTicket.vue`, `composables/useTicket.js` · BE: `ticket.controller.ts:15-22`, `ticket.service.ts:138-186`, `dto/create-ticket.dto.ts`.
- **Para qué sirve:** abrir una orden de soporte para un cliente y uno de sus servicios, asignarla a un técnico y agendar la visita.
- **Acceso:** `tickets.add` (ruta). Asignar a una persona distinta de uno mismo: `tickets.asignar_otros` o `cliente.ticket.asignar_otros` (`FE:…/FormTicket.vue:42`); sin ese permiso el selector solo ofrece al propio usuario y lo preselecciona (`FormTicket.vue:111-114`). ✅
- **Campos de formulario (etiqueta exacta del frontend):**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Cliente: | select con búsqueda (debounce 700 ms) | Sí (FE+BE UUID) | busca por nombre o documento; solo clientes cuyo servicio esté en los routers del usuario | `POST customers/find-customer-by-name-document`; al elegir se cargan sus servicios (`FormTicket.vue:117-151`; `BE:customers.service.ts:1862-1929`) |
  | Plan o Servicio: | select | Sí (FE+BE UUID) | muestra "Plan / IPV4 / Precio"; si el cliente tiene un solo servicio se autoselecciona | un ticket pertenece a un servicio |
  | Persona de soporte: | select (muestra nombre + rol) | Sí (FE+BE UUID) | lista **todos** los usuarios activos de `/auth/users` (no solo rol técnico) | queda como técnico responsable |
  | Técnicos de apoyo: (opcional) | multi-select con chips | No | sin el responsable; solo si ajuste `ticketApoyoHabilitado` y permiso de asignar a otros | ayuda: `Reciben el aviso del ticket y lo ven en "Mis tickets"` |
  | Asunto: | texto autogrow | Sí | `capitalize` automático de la primera letra; FE+BE (string) | sin longitud máxima |
  | Fecha de visita: | selector de fecha (solo lectura) | Sí | máscara `DD/MM/YYYY`; solo hoy o posterior (`date >= today` con fecha UTC) | se guarda como texto |
  | Turno: | select | Sí | "Turno mañana" → `Mañana`; "Turno tarde" → `Tarde` | define el rango de la hora |
  | Hora(Opcional): | selector de hora 24 h | No | solo con turno elegido: Mañana 08:00–12:00, Tarde 13:00–18:00; si se cambia el turno y la hora queda fuera se borra | `FormTicket.vue:18-71`; BE no valida el rango |
  | Prioridad: | select | Sí | `Baja`, `Media`, `Alta`, `Critico` (sin tilde) | BE: string ≤10, sin enum |
  | Agendado desde: | select | Sí | `Oficina`, `Cliente`, `Vía telefónica`, `Presencial`, `Página Web`, `Redes sociales` | origen del pedido; BE: string ≤18, sin enum |
  | Detalle(Opcional): | editor enriquecido (HTML) | No | barra: alinear, negrita/cursiva/subrayado, imprimir, pantalla completa, listas, deshacer, ver código | se guarda HTML |
  | Notificar al cliente por: | toggles Email (activo por defecto) y "WatsApp" (sic) | — | `FE useTicket.js:22-31` | ver SOP-010 |
  | Notificar al tecnico por: / Notificar a los técnicos por: | toggles Email y "WatsApp" | — | cambia el texto si hay apoyos | ver SOP-010 |
  | Adjuntar archivo(Opcional): | arrastrar y soltar | No | cualquier tipo, máx. 8 archivos, 500 MB c/u | se suben a `POST /files/upload-image/images-services` |
  Botones: **Regresar** (oculto en móvil y en edición) y **Abrir Ticket** (en edición: **Editar Ticket**). Antes de enviar: diálogo `¿Deseas agregar el ticket?` (Agregar / Cancelar). (`FormTicket.vue:659-681`, `useTicket.js:161-166`)
- **Campos obligatorios en frontend:** customer, tecnico, asunto, fechaVisita, turno, prioridad, agendado, servicio; mensaje `Debes completar este campo` (`useTicket.js:113-136`). En backend: customer, tecnico, servicio (UUID), asunto, fechaVisita, prioridad, agendado, turno (string no vacío) y `notificacion` (no vacío) (`BE:dto/create-ticket.dto.ts`). `hora`, `detalle`, `files`, `apoyos` son opcionales.
- **Reglas de negocio (backend):**
  1. Se crea con estado `ABIERTO` (default) y `operador` = usuario que lo crea; `secuencial` autoincremental único (`BE:ticket.entity.ts:40-42,93-98`; `ticket.service.ts:143-147`). ✅
  2. Los técnicos de apoyo se guardan solo si el ajuste está activo; se descartan duplicados y el responsable (`ticket.service.ts:80-92,141-147`). ✅
  3. Se registra log `CREATE` "Ticket creado exitosamente" ligado al servicio (`:152-163`). ✅
  4. Si algún toggle de notificación está activo, se envían WhatsApp/correo en segundo plano (no bloquea) (`:168-176`). ✅
  5. Siempre (con o sin toggles) se crea una notificación en la campana "Ticket Asignado" para el responsable y cada apoyo y se empuja por websocket (`:178`, `95-118`). ✅
  6. No se valida en backend que la fecha sea futura, que el servicio pertenezca al cliente, ni el estado del servicio. ✅
- **Efectos secundarios externos:** WhatsApp (Baileys o Cloud API), correo SMTP, websocket `HOST_WEBSOCKET` (SOP-010).
- **Mensajes (texto exacto):** éxito `Ticket agregado correctamente` (positive); error `Fallo al guardar el ticket` / mensaje del backend `Fallo al guardar el ticket.`.
- **Relaciones con otros módulos:** Clientes/Servicios (cliente y servicio), Usuarios (técnico/operador/apoyos), Ajustes (apoyo), Mensajería (registro en "Mensajes Enviados", origen `ticket`), Logs del cliente.
- **Casos límite y advertencias:**
  - `today` se calcula con `new Date().toISOString()` (UTC): en Ecuador (UTC−5) a partir de las 19:00 el calendario ya no deja elegir el día actual (`FormTicket.vue:16`). ❓ confirmar en UI.
  - Etiqueta mal escrita "WatsApp" en los toggles (`FormTicket.vue:614,632`).
  - Un cliente sin servicios no puede tener ticket (el servicio es obligatorio).
  - El selector "Persona de soporte" no filtra por rol: aparece cualquier usuario activo.
- **Preguntas probables de usuarios:**
  1. "¿Puedo abrir un ticket sin seleccionar servicio?" → no, es obligatorio.
  2. "¿Puedo asignarlo a un compañero?" → solo con permiso "Asignar a otros".
  3. "¿Para qué sirve 'Agendado desde'?" → registra por qué canal llegó el pedido.
  4. "¿La hora es obligatoria?" → no; además depende del turno.
  5. "¿Le llega aviso al cliente automáticamente?" → solo si deja activado Email/WhatsApp en el formulario.
  6. "¿Cuántos archivos puedo adjuntar?" → hasta 8 (formulario) y 7 por cada respuesta.
  7. "¿Por qué no puedo elegir la fecha de hoy?" → posible desfase UTC después de las 19:00.
- **Pendiente de validar en UI:** ❓ que el calendario bloquea el día actual tras las 19:00; ❓ orden/forma exacta del selector de cliente (HTML con resaltado); ❓ comportamiento del botón "Regresar" en móvil.

---

## SOP-003 · Detalle y edición del ticket
- **Ruta UI / name:** `/tickets/edit/:id` · `tickets.edit` · icono lápiz del listado, o desde la ficha del cliente con `?edit=true` (muestra "Regresar" en lugar de migas). ✅
- **Archivos:** FE: `EditTicket.vue`, `components/TabPanels.vue`, `DetalleTicket.vue`, `FormTicket.vue`, `MaterialesTicket.vue` · BE: `ticket.controller.ts:173-186`, `ticket.service.ts` (`findOne` 771-787, `update` 789-880).
- **Para qué sirve:** ver toda la información del ticket (estado, personas, fechas, cliente, servicio, adjuntos, visitas, respuestas), cambiar su estado y —si corresponde— editarlo o gestionar materiales.
- **Acceso:** la ruta exige `tickets.edit` (el guard compara el nombre de ruta con los permisos, `FE:router/auth-guard.ts:136-137`). **Solo `tickets.index` no basta para abrir un ticket.** ✅
- **Secciones / pestañas** (`TabPanels.vue:29-50`): "Detalles" (siempre), "Formulario Ticket" (solo SUPER-ADMINISTRADOR o el operador que lo creó), "Materiales" (cuando el ticket cargó).
- **Cabecera:** título `TICKET #0000123`; migas Inicio › Tickets › Editar.
- **Pestaña Detalles — datos mostrados:** Asunto; Estado (insignia con icono); Persona Asignada; Técnicos de apoyo (chips, si hay); Prioridad; Ultimo mensaje (relativo o "No hay respuestas"); Fecha creación; Fecha de visita; Turno (con hora); Abierto por; Agendado; Fecha cierre ("Aún abierto" si no hay); Tiempo resolución (si cerrado: duración `Xd Yh Zm`; si no: "En curso - …"); Detalle (HTML, "No se agrego detalle"); Archivos adjuntos (solo lectura); tarjeta "Visita del técnico" (SOP-006); panel "Información del cliente" (tabla Plan, Costo, IPV4, Instalado, Router, Dirección, Estado Activo/Inactivo; y lista Nombres con enlace, Ubicación provincia-cantón-parroquia, Dirección, Coordenadas con enlace a Google Maps, Celular, Email, N° Documento); y "LISTADO DE RESPUESTAS" (SOP-005). (`DetalleTicket.vue:182-664`)
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Firmar / Enviar a firmar / (estado de firma) | ver SOP-008 | `tickets.edit` | `/tickets-firma/*` | oculto si no hay modo disponible |
  | Cambiar Estado ▾ | cambia el estado (SOP-004) | ver SOP-004 | `PATCH /ticket/:id` + `POST /respuestas-tickets` | |
  | Editar Ticket (pestaña Formulario) | guarda cambios del formulario | creador del ticket o SUPER-ADMINISTRADOR (`FormTicket.vue:670-672`) | `PATCH /ticket/:id` | ver reglas |
  | Agregar Respuesta | SOP-005 | — | `POST /respuestas-tickets` | |
  | Marcar llegada / Marcar salida | SOP-006 | técnico/apoyo/SUPER-ADMIN | `POST /tickets-visitas/:id` | |
  | Agregar equipo / Agregar accesorio | SOP-007 | `tickets.edit` | `POST /tickets-materiales/:id` | |
- **Reglas de negocio (backend) al editar (`PATCH /ticket/:id`):**
  1. No hay máquina de estados: acepta cualquier valor del enum desde cualquier estado; un valor inválido produce el error de Postgres como `BadRequest` (`BE:update dto IsString`, `ticket.service.ts:876-879`). ✅
  2. `fecha_cierre` se pone a "ahora" al pasar a RESUELTO/CERRADO/CANCELADO si estaba vacía, y se borra al pasar a ABIERTO/EN_PROCESO (`:794-807`). ✅
  3. Responsable nuevo ⇒ se le quita de apoyos; los apoyos solo cambian si el ajuste está activo (`:797-819`). ✅
  4. Quienes se **suman** al ticket (responsable nuevo o apoyo nuevo) reciben campana "Ticket Asignado" y, si el ticket tiene marcados los toggles del técnico, WhatsApp/correo (`:842-859`). ✅
  5. Se registra log `UPDATE` "Ticket actualizado" con el detalle de cambios (campos: ignora cliente/operador/servicio/apoyos y añade `tecnicos_apoyo`) (`:821-873`). ✅
  6. No hay control de concurrencia ni de propiedad en el backend.
- **Estados posibles:** ver SOP-004.
- **Mensajes (texto exacto):** `Ticket editado correctamente`; `'Ticket actualizado exitosamente'` (respuesta del backend); error `Fallo al guardar el ticket`.
- **Relaciones con otros módulos:** Cliente/servicio (datos mostrados desde `servicio.perfil_internet`, `router_id`), Archivos (`/uploads/images-services/`), Firma, Materiales (equipos/stock), Logs del cliente.
- **Casos límite y advertencias:**
  - Un usuario con `cliente.ticket.editar` (ficha del cliente) pero sin `tickets.edit` verá el icono pero el guard lo redirige: permisos inconsistentes (`TicketsPage.vue:236` vs `auth-guard.ts`). ✅
  - Al guardar el formulario se envía **todo** el formulario (incluye `estado` y `notificacion`); `files` reemplaza la lista completa (adjuntos conservados por nombre).
  - El "Costo", "Instalado", etc. muestran datos del servicio actual, no una foto histórica.
  - La pestaña Formulario no ofrece cambiar el estado; eso solo ocurre con "Cambiar Estado".
- **Preguntas probables de usuarios:**
  1. "¿Por qué no veo la pestaña 'Formulario Ticket'?" → solo el creador o un SUPER-ADMINISTRADOR.
  2. "¿Puedo cambiar el cliente de un ticket?" → el campo existe en el formulario pero no hay restricción especial; se vuelve a elegir cliente y servicio ❓.
  3. "¿Qué es el tiempo de resolución?" → desde la creación hasta el cierre.
  4. "¿Dónde está el PDF firmado?" → entre los adjuntos del ticket.
  5. "¿Por qué mi compañero técnico no puede marcar llegada?" → solo el responsable (o apoyo si el ajuste lo permite).
  6. "¿Se puede reabrir un ticket cerrado?" → sí, ver SOP-004.
- **Pendiente de validar en UI:** ❓ si al cambiar el cliente en edición se recargan correctamente los servicios (el formulario de edición precarga solo el cliente actual); ❓ apariencia del bloque "Visita del técnico".

---

## SOP-004 · Ciclo de vida del ticket: estados, cambio de estado, cierre y reapertura
- **Ruta UI / name:** botón "Cambiar Estado" (split, icono `autorenew`) en `tickets.edit` → pestaña Detalles. ✅
- **Archivos:** FE: `components/DetalleTicket.vue:29-52,154-178,230-336` · BE: `ticket.service.ts:789-880`, `entities/ticket.entity.ts:8-14`.
- **Para qué sirve:** mover el ticket entre ABIERTO, EN PROCESO, RESUELTO, CERRADO y CANCELADO, dejando constancia automática en las respuestas.
- **Estados posibles:**
  | Estado (valor) | Etiqueta del menú | Significado operativo | `fecha_cierre` |
  |---|---|---|---|
  | `ABIERTO` | ABIERTO | creado/reabierto, sin atender | se borra (null) |
  | `EN_PROCESO` | EN PROCESO | el técnico lo está atendiendo | se borra (null) |
  | `RESUELTO` | RESUELTO | solucionado, a la espera de cierre administrativo | se fija (si estaba vacía) |
  | `CERRADO` | CERRADO | cerrado definitivamente | se fija |
  | `CANCELADO` | CANCELADO | anulado sin atención | se fija |
- **Transiciones permitidas:** **todas contra todas** (cualquier estado ≠ actual aparece en el menú); no hay orden obligatorio ni validación en backend (`DetalleTicket.vue:240-334`, `BE:ticket.service.ts:801-807`). ✅
- **Quién puede cada cambio (frontend):**
  | Hacia | Quién |
  |---|---|
  | ABIERTO (reabrir) | operador que creó el ticket, o `tickets.cambiar_estado_otros`, o SUPER-ADMINISTRADOR |
  | EN_PROCESO | técnico responsable, o apoyo (si `ticketApoyoHabilitado` y `ticketApoyoGestiona`), o `tickets.cambiar_estado_otros`/SUPER-ADMINISTRADOR |
  | RESUELTO | igual que EN_PROCESO |
  | CERRADO | operador creador, o `tickets.cambiar_estado_otros`/SUPER-ADMINISTRADOR |
  | CANCELADO | operador creador, o `tickets.cambiar_estado_otros`/SUPER-ADMINISTRADOR |
  (`DetalleTicket.vue:29-43,240-334`.) Quien creó el ticket **no** puede pasarlo a EN PROCESO/RESUELTO si no es el técnico y no tiene `cambiar_estado_otros`. El backend no verifica nada de esto. ✅
- **Flujo al elegir un estado:**
  1. Diálogo `¿Deseas actualizar el estado del ticket a CERRADO ?` (botones "Actualizar" / "Cancelar").
  2. En paralelo: `PATCH /ticket/:id {estado}` y `POST /respuestas-tickets` con el texto `CAMBIO EL ESTADO DEL TICKET A <b><i>ESTADO</i></b>` (`DetalleTicket.vue:162-169`). ✅
  3. Éxito: `Estado actualizado` (positive). Error: mensaje del backend o `Fallo al eliminar el ticket` (texto copiado de otra función).
- **Reglas de negocio:**
  1. El aviso de cambio de estado **no** envía WhatsApp/correo al cliente ni campana al técnico; solo queda en el hilo de respuestas. ✅
  2. Esa respuesta automática cuenta como "primera respuesta" para el tiempo promedio de respuesta y para el filtro "Respondidos" (`BE:ticket.service.ts:986-1000,735-742`). ✅
  3. Ese tipo de respuesta no se puede editar ni borrar desde la UI (se detecta por el texto) (`ListRespuestas.vue:138-142`).
  4. En CERRADO y CANCELADO ya no se pueden marcar visitas ni se ofrece el reenvío de aviso; RESUELTO sí permite ambas (`BE:visitas.service.ts:71-73`, `IndexPage.vue:595-599`). ✅
  5. No existen SLA, plazos ni escalado automático; "Tiempo resolución" es informativo (creación → cierre). ✅
  6. Eliminar a un usuario con tickets ABIERTO o EN_PROCESO (como técnico o como operador) lo impide: `No se puede eliminar a "…": tiene N ticket(s) en proceso. Reasígnalos o ciérralos antes de eliminar.` (RESUELTO no cuenta) (`BE:auth/auth.service.ts:406-440`). ✅
- **Prioridades / tipos:** no hay tipos ni categorías de ticket; solo `prioridad` (Baja, Media, Alta, Critico) y `agendado` (canal de origen). La prioridad no dispara ninguna regla (solo filtros y reportes). ✅
- **Casos límite y advertencias:**
  - Si el PATCH tiene éxito y el POST de la respuesta falla (o al revés), el estado y el hilo quedan desalineados; `Promise.all` no revierte.
  - `getResumen` y reportes cuentan por estado actual, no por historial.
  - Pasar de RESUELTO a CERRADO conserva la fecha de cierre original (no se vuelve a fijar) (`ticket.service.ts:802`). ✅
- **Preguntas probables de usuarios:**
  1. "¿Cómo reabro un ticket cerrado?" → Cambiar Estado → ABIERTO (creador o con permiso).
  2. "¿Quién puede cerrar?" → el creador o quien tenga "Cambiar estado de otros".
  3. "¿Por qué yo (técnico) no puedo cerrarlo?" → cerrar/cancelar es del operador que lo abrió.
  4. "¿Qué diferencia hay entre RESUELTO y CERRADO?" → ambos fijan fecha de cierre; el cierre lo hace quien abrió el ticket (convención, no hay regla técnica).
  5. "¿El cliente recibe aviso al cerrarse?" → no.
  6. "¿Hay límite de tiempo (SLA)?" → no.
- **Pendiente de validar en UI:** ❓ cómo se ve el menú para un usuario sin ningún permiso especial que no es creador ni técnico (menú vacío); ❓ texto del aviso en el hilo.

---

## SOP-005 · Respuestas del ticket (comentarios y adjuntos)
- **Ruta UI / name:** sección "LISTADO DE RESPUESTAS" al final de la pestaña Detalles de `tickets.edit`. ✅
- **Archivos:** FE: `components/ListRespuestas.vue`, `components/AgregarRespuesta.vue` · BE: `respuestas-tickets/respuestas-tickets.controller.ts`, `.service.ts`, `dto/create-respuestas-ticket.dto.ts`, `entities/respuestas-ticket.entity.ts`.
- **Para qué sirve:** hilo de comentarios del ticket entre operador, técnico, apoyos y terceros; cada comentario puede llevar archivos. Es también donde queda el aviso automático de cada cambio de estado.
- **Acceso:** sin permiso propio; cualquiera que pueda abrir el ticket (`tickets.edit`) puede responder. Editar/eliminar: solo el autor de la respuesta y nunca las de cambio de estado (`FE:…/ListRespuestas.vue:138-142,213-217`). ✅
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Agregar Respuesta | abre el diálogo "Agregar Respuesta" | — | — | |
  | Agregar Respuesta / Editar Respuesta (dentro del diálogo) | guarda | — | `POST /respuestas-tickets` · `PATCH /respuestas-tickets/:id` | deshabilitado si el texto tiene menos de 3 caracteres (`AgregarRespuesta.vue:175`) |
  | icono lápiz "Editar respuesta" | edita texto y adjuntos | autor | `PATCH` | no aparece en respuestas de cambio de estado |
  | icono papelera "Eliminar respuesta" | borra (lógico) | autor | `DELETE /respuestas-tickets/:id` | |
- **Campos de formulario:**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Respuesta: | editor enriquecido | Sí | mínimo 3 caracteres (FE); BE: string no vacío | HTML |
  | Adjuntar archivo(opcional): | arrastrar y soltar | No | cualquier tipo, máx. 7 archivos, 100 MB c/u (tamaño por omisión del componente) | se suben a la carpeta `images-services` |
  Diálogo previo: `¿Deseas agregar esta respuesta?` / `¿Deseas editar esta respuesta?`.
- **Reglas de negocio:**
  1. Cada respuesta muestra foto, nombre y una etiqueta de rol **relativa a este ticket**: Soporte (técnico responsable), Asignador (operador que lo creó), Apoyo, Tercero (`ListRespuestas.vue:33-38`). ✅
  2. Al **agregar** una respuesta (no al editar) el frontend crea una notificación en la campana para "la otra parte": si quien responde es el técnico responsable → al operador; en cualquier otro caso → al técnico responsable (nunca a los de apoyo). Título `Ticket Respondido`, texto `El usuario {nombre} agregó una respuesta al ticket 0000123`, y la empuja por websocket (`AgregarRespuesta.vue:46-64`). ✅
  3. Backend: crea con el usuario autenticado; `PATCH`/`DELETE` no comprueban autoría ni estado del ticket (solo el frontend lo restringe) (`BE:respuestas-tickets/respuestas-tickets.service.ts:17-76`). ✅
  4. Listado ordenado por fecha descendente (la más nueva primero) (`BE:…service.ts:26-32`). ✅
  5. Los cambios de estado generan una respuesta con el texto `CAMBIO EL ESTADO DEL TICKET A <b><i>ESTADO</i></b>` (SOP-004); la UI las reconoce por ese texto.
- **Mensajes (texto exacto):** éxito `Ticket agregado correctamente` / `Ticket editado correctamente` (dice "Ticket" aunque es una respuesta, `AgregarRespuesta.vue:78`); error `Fallo al guardar el ticket`; eliminar: `Respuesta eliminada`, diálogo `¿Deseas eliminar esta respuesta?`; vacío `No se encontró ninguna respuesta`.
- **Efectos secundarios externos:** campana + websocket; no envía WhatsApp ni correo.
- **Casos límite y advertencias:**
  - Las respuestas se muestran con `v-html` y el editor guarda HTML sin sanear (riesgo de contenido inyectado) ✅ (`ListRespuestas.vue:190-194`).
  - Los adjuntos quitados al editar se borran del disco al guardar (`DELETE /files/images-services/{archivo}`).
  - La ruta `GET /respuestas-tickets/ultima-respuesta/:ticket_id` está mal cableada (lee `@Param('id')`, que no existe) y no se usa desde el frontend (`BE:respuestas-tickets.controller.ts:34-37`). ✅
  - Responder no cambia el estado del ticket.
- **Preguntas probables de usuarios:**
  1. "¿Quién ve mi respuesta?" → todos los que abren el ticket; solo el técnico u operador recibe aviso en la campana.
  2. "¿Puedo borrar una respuesta de otra persona?" → no desde la pantalla.
  3. "¿Por qué no puedo editar el mensaje 'CAMBIO EL ESTADO…'?" → es un registro automático.
  4. "¿Cuántos archivos puedo subir?" → 7 por respuesta.
  5. "¿El cliente ve las respuestas?" → no hay portal de cliente; son internas.
  6. "¿Se envía correo al responder?" → no.
- **Pendiente de validar en UI:** ❓ aspecto de las etiquetas Soporte/Asignador/Apoyo/Tercero; ❓ cómo se ve una respuesta con HTML complejo.

---

## SOP-006 · Visita del técnico: marcar llegada y salida
- **Ruta UI / name:** tarjeta "Visita del técnico" dentro de Detalles de `tickets.edit`. ✅
- **Archivos:** FE: `components/VisitaTicket.vue`, `src/composables/useUbicacion.js`, `src/utils/mensajeError.js` · BE: `ticket/visitas/tickets-visitas.controller.ts`, `.service.ts`, `veredicto.ts`, `dto/marcar-visita.dto.ts`, `entities/ticket-marca.entity.ts`, `common/utils/coordenadas.util.ts`.
- **Para qué sirve:** dejar constancia de que el técnico estuvo en el domicilio del cliente y cuánto tiempo, con dos marcas (llegada y salida) con la ubicación del celular o de la app.
- **Acceso:** el botón aparece solo si eres el técnico responsable, un técnico de apoyo (con ajustes `ticketApoyoHabilitado` + `ticketApoyoGestiona` activos) o SUPER-ADMINISTRADOR, y el ticket no está CERRADO/CANCELADO (`VisitaTicket.vue:50-57,179`). El backend repite la regla y devuelve 403 `Sólo el técnico asignado puede marcar la visita de este ticket` (`BE:ticket/visitas/tickets-visitas.service.ts:52-69`). ✅
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Marcar llegada / Marcar salida | lee el GPS y registra la marca; alterna según la última marca | técnico/apoyo/SUPER-ADMIN | `POST /tickets-visitas/:ticketId` | mientras busca muestra `Buscando GPS…`, `Ubicando… ±N m`, `Guardando…` |
  | icono mapa | abre Google Maps (origen = punto de la marca, destino = casa del cliente) | — | — | tooltip `Ver en el mapa junto a la casa del cliente` o `Ver en el mapa` |
- **Textos de la tarjeta:** `Visita del técnico`; chip `{duración} en el lugar`; `En el lugar desde {hora}`; `Última salida: {hora}`; `Todavía no se marcó la llegada.`; aviso `El servicio no tiene coordenadas cargadas: la visita se registra, pero no se puede comprobar la distancia al cliente.`; cada fila: `Llegada · 12/10 08:30` / `Salida · …`, `{usuario} · a 35 m del cliente · ±12 m · GPS de la app`.
- **Veredicto de cada marca** (`BE:ticket/visitas/veredicto.ts:9-37`): distancia ≤ **150 m** → "En el lugar"; ≤ **500 m** → "Cerca"; más → "Lejos"; si el equipo informó precisión peor que **100 m** → "Ubicación imprecisa"; si el servicio no tiene coordenadas → "Cliente sin coordenadas". ✅
- **Reglas de negocio (backend):**
  1. Las marcas alternan: no se puede marcar llegada dos veces (`La llegada ya está marcada. Falta marcar la salida.`) ni salida sin llegada (`Primero hay que marcar la llegada.`) (`tickets-visitas.service.ts:88-95`). ✅
  2. Estado CERRADO/CANCELADO: `El ticket está cerrado: ya no se pueden marcar visitas` (usa el estado en minúsculas) (`:71-73`). ✅
  3. Ubicación inválida (fuera de rango, 0,0): `La ubicación que mandó el equipo no es válida. Probá de nuevo con el GPS encendido.` (`:77-81`). ✅
  4. La distancia al cliente se calcula contra `servicio.coordenadas` ("longitud, latitud") y se **congela** en la marca (`:97-109`; `coordenadas.util.ts:22-46`). ✅
  5. Se guarda: tipo, latitud, longitud, precisión, distancia, origen (`navegador`|`app`), dispositivo (user agent ≤250), nota (≤500; la pantalla no la envía), momento de captura (`ticket-marca.entity.ts:50-91`). ✅
  6. Marcar **no** cambia el estado del ticket.
  7. Resumen: empareja cada llegada con la salida siguiente; `minutosEnSitio` suma todas las visitas (`:126-163`). ✅
- **Captura del GPS (frontend):** toma la mejor lectura hasta 20 s o hasta ±30 m; en el navegador exige contexto seguro (https) y con la app usa el plugin nativo (`useUbicacion.js:292-307`). Mensajes de error: `No se dio permiso para usar la ubicación. Habilitalo en los permisos del navegador para este sitio y volvé a intentar.`, `El equipo no pudo determinar la ubicación. Revisá que el GPS esté encendido.`, `El GPS tardó demasiado en responder. Probá al aire libre o cerca de una ventana.`, `La ubicación sólo funciona con https. Abrí el sistema desde su dirección segura.`, `Este navegador no permite obtener la ubicación.` (textos con voseo). ✅
- **Mensajes (éxito):** `Llegada marcada · En el lugar (35 m del cliente)` / `Salida marcada · …` (tipo warning si el veredicto es "lejos").
- **Efectos secundarios externos:** ninguno (solo el enlace a Google Maps).
- **Relaciones con otros módulos:** variables del formato Word (`hora_llegada`, `hora_salida`, `tiempo_en_sitio`, `distancia_llegada`, `verificacion_visita`, `total_visitas`, SOP-011); capa de técnicos del mapa (SOP-029: "Ticket #… · Estado" mientras la última marca sea llegada).
- **Casos límite y advertencias:**
  - `GET/POST /tickets-visitas/:ticketId` no validan que el id sea UUID (un id inválido produce error de base de datos).
  - Marcas en cualquier estado distinto de CERRADO/CANCELADO (incluido RESUELTO) son válidas.
  - Coordenadas del cliente guardadas como "lng, lat": un orden mal cargado da distancias absurdas (la utilidad solo corrige cuando es seguro).
  - Una PC o un celular sin satélite suele dar >100 m de error → "Ubicación imprecisa".
- **Preguntas probables de usuarios:**
  1. "¿Por qué sale 'Lejos' si estaba en la casa?" → coordenadas del servicio mal cargadas o GPS impreciso.
  2. "¿Puedo marcar la salida sin llegada?" → no.
  3. "¿Marcar la salida cierra el ticket?" → no, hay que cambiar el estado aparte.
  4. "¿Puede marcar otra persona por el técnico?" → no, salvo un SUPER-ADMINISTRADOR (queda registrado quién fue).
  5. "¿Funciona desde la oficina/PC?" → sí, pero la precisión suele ser mala.
  6. "¿Se puede volver otro día?" → sí, cada llegada/salida forma una visita nueva.
- **Pendiente de validar en UI:** ❓ aspecto del chip de veredicto; ❓ comportamiento del permiso de ubicación en Safari/iOS.

---

## SOP-007 · Materiales del ticket (equipos entregados y accesorios)
- **Ruta UI / name:** pestaña "Materiales" de `tickets.edit` (icono `inventory_2`). ✅
- **Archivos:** FE: `components/MaterialesTicket.vue` + modales **compartidos** `pages/dashboard/instalaciones/components/AgregarProductoModal.vue` y `AgregarAccesorioModal.vue` · BE: `ticket/materiales/tickets-materiales.controller.ts`, `.service.ts`, `dto/material-ticket.dto.ts`, `materiales/materiales.service.ts`, `instalaciones/entities/instalacion-equipo.entity.ts`.
- **Para qué sirve:** registrar qué equipos del inventario se entregaron y qué accesorios (cable, conectores…) se gastaron en un soporte, descontando del almacén en el momento.
- **Acceso:** pestaña visible con el ticket cargado; botones de agregar/quitar/editar solo con `tickets.edit` (`MaterialesTicket.vue:34`). ✅
- **Tablas:** **Equipos entregados** (Tipo, Descripción, Nº MAC, Nº Serie, Condición [chip Libre/Comodato/Venta], Acciones) y **Accesorios utilizados** (Descripción, Cantidad con "Mts"/"Uds" según la categoría, Acciones). Vacíos: `Ningún equipo agregado.` / `Ningún accesorio agregado.` Nota al pie: `Lo que se agregue acá descuenta del inventario en el momento. Al quitarlo, vuelve.`
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Agregar equipo | abre el modal "Productos" | `tickets.edit` | `POST /tickets-materiales/:ticketId` (`tipo: producto`) | reserva el equipo y lo vincula al servicio |
  | Agregar accesorio | abre "Accesorios" | `tickets.edit` | `POST` (`tipo: accesorio`) | descuenta stock |
  | lápiz "Cambiar la cantidad" | modal "Editar accesorio" | `tickets.edit` | `PATCH /tickets-materiales/:ticketId/:asignacionId` | ajusta stock por diferencia |
  | papelera "Quitar el equipo" / "Quitar y devolver al stock" | confirma (`¿Quitar el equipo?` / `¿Quitar el accesorio?`) y quita | `tickets.edit` | `DELETE /tickets-materiales/:ticketId/:asignacionId` | equipo: `El equipo vuelve a quedar disponible en inventario y se desvincula del servicio del cliente.`; accesorio: `Se devuelven N Uds al stock.` |
- **Campos del modal "Productos":** Categoría producto (de `/categories`), Producto (equipos `estado=disponible` de esa categoría, etiqueta `SN: … / Mac: … ($ costo)`), Tipo de producto (Antena, Router, Radio, Switch o texto libre → `descripcion`), Condición (`Préstamo/Comodato` por omisión, `Venta (Facturar)`; "Libre" ya no se ofrece), y si es venta: Precio de venta (>0; se precarga con el costo), Forma de pago (Un solo pago, Mensualmente, Pago en 2…12 Cuotas), Tipo de factura (Factura de servicio / Factura libre). Validaciones: `Seleccione un producto`, `Ingresa un precio de venta mayor a 0`, `Selecciona la forma de pago`, `Selecciona el tipo de factura`. (`AgregarProductoModal.vue:15-162`)
- **Campos del modal "Accesorios":** Categoría, Accesorio (`nombre (Stock: n Uds|Mts)`), Descripción (se autocompleta con el nombre), Cantidad (Metros/Unidades; ≥1 y ≤ stock disponible). Éxito `Accesorio agregado` / `Accesorio actualizado`. (`AgregarAccesorioModal.vue:113-153`)
- **Reglas de negocio (backend):**
  1. Equipo: pasa a `pendiente_asignacion`; si ya estaba así → `Este equipo ya está asignado a otra visita` (`BE:materiales/materiales.service.ts:264-275`). ✅
  2. Accesorio: `UPDATE … SET cantidad = cantidad - n WHERE cantidad >= n` atómico; si no alcanza: `Stock insuficiente de "X". Disponible: a, solicitado: b` (`:219-238`). Todo en transacción. ✅
  3. **Particular del ticket:** si es producto con equipo y el ticket tiene servicio, el equipo se **vincula en el acto** al servicio: `equipos.servicio_id`, `tipo_vinculacion` (`venta` / `comodato` / `null` si "libre"), `estado = no_disponible`, entrada de historial con `origen: 'ticket'` y `ticket_id`, y `servicios-clientes.equipo_id` (`BE:ticket/materiales/tickets-materiales.service.ts:56-122`). ✅
  4. **No se crea ningún cargo recurrente ni se actualiza el costo del equipo** al marcar "Venta" en un ticket; precio/forma de pago/tipo de factura solo quedan guardados en la asignación. En instalaciones sí se genera el cargo (SOP-021/023). ✅
  5. Quitar: equipo → `servicio_id = null`, `tipo_vinculacion = null`, `estado = disponible` y `servicio.equipo_id = null`; la fila se borra lógicamente (`tickets-materiales.service.ts:124-141`). ✅
  6. El backend no comprueba el estado del ticket ni quién agrega.
- **Casos límite y advertencias:**
  - El modal es el mismo de instalaciones: su título es `¿Agregar equipo a la instalación?`, el texto de confirmación habla de "finalizar la instalación (al crear el cliente)… se generará el cargo de venta" y el éxito dice `Producto agregado a la instalación`, **aunque se use en un ticket** (`AgregarProductoModal.vue:114-155`). En tickets esas frases son falsas: el equipo se vincula al instante y no hay cargo. ✅
  - `servicios-clientes.equipo_id` es una sola columna: entregar un segundo equipo en otro ticket reemplaza la referencia "actual" del servicio (el vínculo en `equipos` del primero sigue). ✅
  - Eliminar el ticket (borrado lógico) no devuelve materiales (SOP-001).
- **Preguntas probables de usuarios:**
  1. "Cambié el router del cliente en la visita, ¿dónde lo registro?" → pestaña Materiales → Agregar equipo (Comodato o Venta).
  2. "Marqué 'Venta' pero no me generó cobro" → en tickets no se crea el cargo; hay que facturarlo aparte.
  3. "¿Por qué no aparece el equipo en la lista?" → solo equipos `disponible` de la categoría elegida.
  4. "¿Se descuenta el cable al agregarlo?" → sí, en ese momento.
  5. "Me equivoqué de equipo" → Quitar el equipo (vuelve a disponible y se desvincula).
  6. "¿Qué pasa con el equipo viejo del cliente?" → el sistema no lo retira solo ❓.
- **Pendiente de validar en UI:** ❓ cómo muestra la ficha del cliente → Recursos un equipo entregado por ticket (origen "directo"); ❓ si el modal muestra otros textos cuando no recibe `estado`.

---

## SOP-008 · Firma del ticket por el cliente
- **Ruta UI / name:** icono de firma en la fila del listado (`/tickets`) y botón en Detalles de `tickets.edit` ("Firmar" / "Enviar a firmar" o el estado del trámite). ✅
- **Archivos:** FE: `components/FirmaTicketDialog.vue`, `FirmaManuscritaDialog.vue`, `PadFirma.vue`, `composables/useFirmaTicket.js`, `src/composables/useFirmaElectronica.js`, `pages/dashboard/ajustes/ticket/FirmaTicket.vue` · BE: `ticket/firma/tickets-firma.controller.ts`, `.service.ts`, `dto/*`, `ticket/ticket.service.ts:1402-1543`, `firma-electronica/firma-tramites.service.ts` (solo lo que usa el ticket), `firma-electronica/ancla-firma.ts`.
- **Para qué sirve:** que el cliente conforme la orden de servicio, por enlace electrónico con el proveedor (valor legal) o dibujando en el celular/tableta del técnico (constancia equivalente a papel).
- **Acceso:** `tickets.edit`. El modo lo decide el ajuste `firmaTicketModo` (`electronica` por omisión | `manuscrita`), excluyentes (`BE:settings/entities/setting.entity.ts:250-251`). En modo electrónico el botón existe solo si la firma electrónica está configurada (`/firma-electronica/disponibilidad`); en manuscrita siempre (`FE:…/tickets/IndexPage.vue:175-176`). ✅
- **Modo electrónico — diálogo "Firma del cliente":**
  | Elemento | Detalle |
  |---|---|
  | Lista de tickets | los 30 tickets más nuevos del mismo cliente que no estén CANCELADO; marcados "· ya está esperando firma" (deshabilitados) o "· ya firmado antes" (`BE:ticket/firma/tickets-firma.service.ts:198-248`) |
  | Vista previa | icono `preview`: abre el PDF tal como se enviaría, sin crear trámite (`GET /tickets-firma/preparado/:id`) |
  | Validación | `POST /tickets-firma/validar`; si falla, banner "No se puede enviar todavía" con la lista |
  | Enviar | `Enviar a firmar` / `Enviar a firmar (n)`; un solo enlace y un trámite aunque vayan varios tickets (el proveedor cobra por trámite) |
  | Estado del trámite | Esperando firma · En proceso · Firmado · Rechazado · Vencido · Anulado · Desconocido; botón "Actualizar"; copiar enlace; "Descargar"; huella SHA-256 |
  Éxito: `Ticket enviado a firmar` / `{n} tickets enviados a firmar`. Al completarse, el PDF firmado se agrega solo a los adjuntos del ticket (`BE:tickets-firma.service.ts:47-51,502-506`). ✅
- **Problemas que bloquean el envío (texto del backend):** `No se seleccionó ningún ticket`; `No se encontraron N de los tickets`; `Los tickets son de clientes distintos. Un envío tiene un solo firmante.`; `El ticket no tiene cliente asignado, así que no hay quién firme`; `El cliente no tiene número o tipo de documento cargado`; `El proveedor de firma sólo acepta cédula o RUC ecuatorianos. Un cliente con pasaporte tiene que firmar en papel.`; `El cliente no tiene correo cargado`; `No hay un formato de ticket en Word cargado. El formato del sistema no se puede firmar: subí el tuyo en Ajustes → Plantillas → Formato de Ticket.`; `El formato "…" no indica dónde va la firma. Agregá la variable {firma_cliente}…`; `El formato "…" pide la firma del ISP ({firma_isp}) pero la empresa no tiene cargado su certificado de firma electrónica.`; `N de los tickets ya están esperando firma. Hay que esperar o anular ese trámite antes de reenviarlos.` (`BE:tickets-firma.service.ts:59-137`; `firma-tramites.service.ts:154-172`). ✅
- **Modo manuscrito — diálogo "Firma del ticket N° 0000123":** recuadros "Firma del cliente" y "Firma del técnico" (este solo si el ticket tiene técnico), botones "Deshacer" (borra el último trazo) y "Limpiar"; texto `Pasale el equipo al cliente para que firme. Se puede firmar sólo uno de los dos: se guarda lo que esté completo.`; botón **Guardar firma**; sin trazo: `Falta firmar: el recuadro está vacío`; éxito `Firma guardada en el ticket`. Ya firmado: banner `Firmado el {fecha}` + `El documento quedó entre los adjuntos del ticket.` + lista de firmantes + `Capturado por {nombre}` + aviso `Una firma dibujada vale como constancia de conformidad, igual que la de papel. No es una firma electrónica con validez legal.`; botones "Firmar de nuevo" y "Descargar" (`ticket-0000123-firmado.pdf`). (`FirmaManuscritaDialog.vue`)
- **Reglas de negocio (manuscrita, backend):**
  1. Exige el formato Word con `{firma_cliente}` (y `{firma_tecnico}` si firma el técnico); si no encuentra la marca: `No se encontró {firma_cliente} en el documento generado de "ticket 0000123". Revisar que el formato de ticket de Ajustes tenga la variable escrita con una sola llave, y volver a guardarla.` No hay formato alternativo (`firma-tramites.service.ts:258-272`). ✅
  2. Valida que cada firma sea un PNG real (`La firma del cliente no llegó como una imagen PNG válida`) y ≤3 MB; mínimo una (`No se recibió ninguna firma para estampar`) (`tickets-firma.service.ts:306-336,410-420`; `dto/firmar-manuscrito.dto.ts`). ✅
  3. Estampa cada firma en todas las apariciones de su marca; si el formato pide `{firma_isp}` y hay certificado, el sello del ISP va al final (`:343-356`). ✅
  4. Guarda el PDF como `firmado-manuscrita-{numero}-{timestamp}` en uploads, lo agrega a `files`, **reemplaza y borra** el firmado anterior y guarda `firma_manuscrita` = {archivo, firmadoEn, registradoPor{id,nombre}, firmantes[]} (`:356-385`). ✅
  5. No exige estado del ticket ni verifica quién firma.
- **Seguimiento del trámite electrónico (backend, `firma-electronica/*`, leído completo):** ✅
  1. **Envío:** `FirmaTramitesService.crearTramite` genera un `referenceId` `ISPMAX-{uuid}`, congela el PDF en `static/uploads/images-services/enviado-{referenceId}-{i}.pdf`, y hace `POST {SIGNATURE_GATEWAY_URL}/v1/signature-requests` con `organizationCode`, `level`, un único firmante (documento, tipo `cedula`/`ruc`/`passport` según `tipo_documento` SRI 05/04/06, correo, nombre, celular en E.164 con `CODIGO_PAIS_TELEFONO` o `+593`) y un `placement` por cada ancla `{firma_cliente}` ubicada (BE:firma-electronica/firma-tramites.service.ts:376-431,842-848). Si el gateway rechaza, borra los PDF congelados y traduce los índices `documents[n]`/`placements[n]` de los detalles al nombre del documento (`:429-431,485-508`). Se guarda una fila `solicitudes_firma` (estado inicial = `status` del gateway o `pending`, `urlFirma` = `signingUrl`, `expiraEn` = `expiresAt`, datos del firmante copiados) con sus `solicitudes_firma_documentos` y un log `SolicitudFirma · CREATE` (`:433-472`; entidades `entities/solicitud-firma*.entity.ts`).
  2. **Estados del trámite** (vocabulario del gateway replicado): `pending`, `in_progress`, `completed`, `rejected`, `expired`, `cancelled`, `unknown`; finales = completed, rejected, expired, cancelled (BE:firma-electronica/entities/solicitud-firma.entity.ts:21-36). El panel los rotula "Esperando firma", "En proceso", "Firmado", "Rechazado", "Vencido", "Anulado", "Desconocido" (FE:pages/dashboard/tickets/components/FirmaTicketDialog.vue:212-220); se consideran "vigentes" `pending`, `in_progress`, `unknown` (`:224-226`). Con `unknown` el backend **no pisa** el estado anterior (`firma-tramites.service.ts:687-689`). Rechazado, vencido y anulado muestran "Trámite finalizado sin firma" y `{estado} · el ticket vuelve a quedar disponible para reenviarlo`, más el `motivo` que dio el proveedor (FE:FirmaTicketDialog.vue:338-355).
  3. **Vencimiento:** el plazo lo fija el proveedor/gateway y llega en `expiresAt`; ISPMAX solo lo guarda y lo muestra ("Vence el {dd/mm/aaaa}.") mientras el trámite está vigente (BE:firma-tramites.service.ts:442,692; FE:FirmaTicketDialog.vue:346). No hay cron propio que cambie un trámite a `expired`: el cambio viene del gateway (aviso o "Actualizar"). ISPMAX no define ni cobra el plazo; el cobro es "por solicitud" según los comentarios del código (`:372-375`).
  4. **Aviso (webhook) y sondeo:** el gateway avisa a `POST /api/contratos-firma/webhook` (única URL por organización, compartida con contratos; la URL sale de `DOMINIO` + esa ruta, o de `SIGNATURE_GATEWAY_WEBHOOK_URL` en desarrollo) y se registra con `PATCH /v1/organizations/{code}` junto con `SIGNATURE_GATEWAY_WEBHOOK_SECRET` al guardar credenciales (BE:firma-electronica/signature-gateway.client.ts:198-257; BE:contratos/firma/contratos-firma.controller.ts:96-112). El aviso se autentica con HMAC-SHA256 de `{x-gateway-timestamp}.{cuerpo crudo}` en la cabecera `x-gateway-signature` (`sha256=…`), tolerancia de 300 s; sin el secreto configurado el aviso se acepta sin verificar y se deja un warning en el log (BE:firma-tramites.service.ts:48-49,765-804). Errores: 401 `Faltan las cabeceras de firma del aviso` / `El aviso tiene un timestamp fuera de la ventana permitida (Ns)` / `Firma inválida`. Para un `referenceId` desconocido responde `{recibido:true, aplicado:false}`; cualquier excepción al aplicar se registra y se responde 200 `{recibido:true, aplicado:false}` para que el gateway no reintente en bucle (`:519-536`; controlador `:104-111`). El botón **Actualizar** (`POST /tickets-firma/solicitudes/:referenceId/refrescar`) consulta al gateway (`POST /v1/signature-requests/{ref}/refresh`); si el trámite ya es final y `completed`, solo reintenta bajar los firmados faltantes (`:546-560`). Un comentario del código dice que "el gateway ya sondea solo" (sondeo del lado del gateway; ISPMAX no tiene cron de sondeo ✅ no hay llamadas a `refrescar` fuera de los controladores).
  5. **Al completarse:** `aplicarEstado` guarda `firmadoEn` (`completedAt`), `motivo` (`reason`), `evidencia` (`evidence`, JSON tal cual) y por cada documento descarga el PDF (`GET /v1/signature-requests/{ref}/documents/{orden}`), lo guarda como `firmado-{referenceId}-{orden}.pdf`, anota el `hash` SHA-256 que informa el gateway y llama al manejador `ticket` que lo suma a los adjuntos (`agregarArchivo`) (BE:firma-tramites.service.ts:683-763; BE:ticket/firma/tickets-firma.service.ts:47-51,502-506). Si un PDF no se puede bajar, queda un log `No se pudo descargar el documento firmado "…". Se puede reintentar desde el panel con "Actualizar".` y no frena a los demás. Cada cambio de estado deja el log `El trámite de firma pasó de "{anterior}" a "{nuevo}"` (`:703-715`).
  6. **Descarga:** `GET /tickets-firma/solicitudes/:referenceId/documento/:orden`; errores `Ese documento todavía no está firmado` / `El archivo firmado no está en el servidor. Probá con "Actualizar" para volver a bajarlo.` (`:664-681`).
  7. **Disponibilidad:** `GET /firma-electronica/disponibilidad` devuelve `{habilitado, niveles, motivo}`; sin `SIGNATURE_GATEWAY_URL`/`SIGNATURE_GATEWAY_API_KEY`: `El servidor no tiene configurado el gateway de firma (SIGNATURE_GATEWAY_URL y SIGNATURE_GATEWAY_API_KEY).`; gateway caído: `No se pudo contactar al gateway de firma electrónica.`; otros motivos: `No hay ningún proveedor de firma electrónica configurado.` / `Las credenciales están cargadas pero todavía no se comprobaron.` / `Ningún proveedor configurado está en condiciones de firmar.` El panel oculta el botón si no está habilitado (BE:firma-electronica/disponibilidad-firma.service.ts:31-76; FE:composables/useFirmaElectronica.js:32-58).
  8. **Sello del ISP (`{firma_isp}`):** se aplica al final (después de las firmas dibujadas, antes de enviar al proveedor) con `POST {HOST_API_FACTURACION}/firma-pdf/firmar` (microservicio de facturación, con el nombre y la clave del certificado .p12 de la empresa); sello de 5,29 × 1,69 cm, QR "compacto". Errores: `Falta configurar HOST_API_FACTURACION: sin esa URL no se puede aplicar la firma del ISP.`, `No se pudo aplicar la firma del ISP a "{archivo}": {motivo}` (BE:firma-electronica/firma-isp.service.ts:18-36,72-138).
  9. **Proveedor:** el único rotulado en el panel es `datil` → "Dátil"; niveles "Electrónica simple" (`simple`) y "Electrónica acreditada" (`accredited`) (FE:FirmaTicketDialog.vue:238-243). Las credenciales viven cifradas en el gateway, no en ISPMAX; el backend solo hace de intermediario (`GET/PUT /firma-electronica/config`, `POST /firma-electronica/probar`, `PATCH …/ajustes`, `DELETE …`, `GET /firma-electronica/catalogo`; todos solo con JWT) (BE:firma-electronica/firma-electronica.controller.ts:19-84).
  - **Límite de lectura:** el `signature-gateway` (servicio externo que habla con Dátil y fija estados, plazo de vencimiento, cobro y sondeo) y el microservicio de facturación (`HOST_API_FACTURACION`) no están en el ZIP; de ellos solo se conoce el contrato HTTP que consume ISPMAX (rutas y campos citados arriba).
- **Efectos secundarios externos:** electrónica → proveedor de firma (Dátil vía gateway); el aviso con el enlace al correo del cliente lo manda el proveedor/gateway (ISPMAX no envía correo ni WhatsApp en este flujo: solo pasa el correo y el celular del firmante al gateway ✅ BE:firma-electronica/firma-tramites.service.ts:399-421; BE:ticket/firma/tickets-firma.service.ts:146-185), de modo que lo que dice el banner "El enlace le llegó a {correo}" depende del proveedor ❓ (solo la UI real lo confirma); manuscrita → ninguno (solo `HOST_API_FACTURACION` si el formato pide `{firma_isp}`).
- **Casos límite y advertencias:**
  - La variable `{firma_tecnico}` funciona (existe en las anclas) pero **no figura en el catálogo de variables** que muestra Ajustes (solo `firma_cliente` y `firma_isp`) (`BE:ticket/variables-ticket.ts:329-341` vs `firma-electronica/ancla-firma.ts:27-31`); solo se menciona en el aviso de Ajustes → "Firma del ticket". ✅
  - El `nivel` (simple/acreditada) existe en el backend pero la pantalla nunca lo envía: siempre "simple" (`tickets-firma.controller.ts:30-33`, `FirmaTicketDialog.vue:129-131`). ✅
  - Cambiar el modo en Ajustes no migra trámites existentes.
- **Preguntas probables de usuarios:**
  1. "¿La firma dibujada tiene validez legal?" → no, es constancia de conformidad.
  2. "No me deja enviar a firmar" → revisar documento y correo del cliente y el formato Word con `{firma_cliente}`.
  3. "¿Se pueden firmar varios tickets del mismo cliente juntos?" → sí, con un solo enlace.
  4. "¿Dónde queda el PDF firmado?" → en los adjuntos del ticket.
  5. "Firmé mal, ¿puedo repetir?" → "Firmar de nuevo": reemplaza el documento anterior.
  6. "¿Y si el cliente tiene pasaporte?" → solo firma en papel (no aplica la electrónica).
- **Pendiente de validar en UI:** ❓ aspecto/tamaño del recuadro de firma en celular; ❓ plazo real de vencimiento y cuándo el gateway pasa un trámite a `expired` (lo decide el servicio externo, ver `Límite de lectura`). Resueltos con el código: los 7 estados posibles del trámite y su rótulo, cómo llega el estado (aviso HMAC o botón Actualizar) y que ISPMAX no tiene cron de sondeo.

---

## SOP-009 · Técnicos de apoyo en el ticket
- **Ruta UI / name:** campo "Técnicos de apoyo:" en el formulario del ticket (SOP-002/003) y Ajustes → Plantillas → Tickets → pestaña "Técnicos de apoyo". ✅
- **Archivos:** FE: `components/FormTicket.vue:73-98,288-322`, `composables/useTicket.js:50-54`, `pages/dashboard/ajustes/ticket/TecnicosApoyo.vue` · BE: `ticket/entities/ticket.entity.ts:48-59` (tabla `ticket_tecnicos_apoyo`), `ticket/ticket.service.ts:80-92,141-147,796-819,842-859`, `settings/entities/setting.entity.ts:258-262`.
- **Para qué sirve:** sumar más personas a un ticket que tiene un único técnico responsable (el que firma, cuenta en productividad y marca visita).
- **Acceso:** el campo se muestra con `tickets.asignar_otros` (o `cliente.ticket.asignar_otros`) **y** el ajuste `ticketApoyoHabilitado` (`FormTicket.vue:76`). Ajustes: ver SOP-031.
- **Ajustes (textos):** "Técnicos de apoyo en los tickets"; toggle "Permitir técnicos de apoyo en los tickets" (agrega el campo; apagado, los ya asignados se conservan); toggle "Los técnicos de apoyo gestionan el ticket como el responsable" (pueden marcar llegada/salida y pasar a **En proceso** o **Resuelto**; cerrar/cancelar sigue siendo del operador o de quien tenga permiso de cambiar estado de tickets ajenos); botón "Guardar". Ambos valores por omisión `false`. ✅
- **Reglas de negocio:**
  1. Se descartan duplicados y el propio responsable (`idsApoyo`, `ticket.service.ts:80-83`) ✅.
  2. Con el ajuste apagado, crear/editar ignoran `apoyos` y los tickets existentes los conservan (`:90-92,799`). ✅
  3. Notificación: cada apoyo recibe la campana "Ticket Asignado" con el texto `Se te agregó como técnico de apoyo en el ticket: 0000123, con el asunto: …, por el usuario …`, y los mensajes WhatsApp/correo llevan al final la nota `Usted va como técnico de apoyo. Responsable del ticket: {nombre} ({celular}).` (`:101-107,404-408,412-413,492-493`). ✅
  4. Aparecen en el listado (insignia "+N"), en Detalles (chips), en el filtro Técnico y en la vista filtrada "Mis tickets"; **no** cuentan en los reportes de productividad ni en las tarjetas (SOP-001/012). ✅
  5. Las respuestas de un apoyo no notifican a nadie más que al técnico responsable u operador (SOP-005).
- **Preguntas probables de usuarios:**
  1. "¿Para qué sirve el técnico de apoyo?" → para que otra persona vea, reciba aviso y, si se configura, trabaje el ticket.
  2. "¿El apoyo puede cerrar el ticket?" → no, solo En proceso/Resuelto (y marcar visita).
  3. "No veo el campo" → falta el ajuste o el permiso de asignar a otros.
  4. "¿Quién figura en los reportes?" → solo el responsable.
- **Pendiente de validar en UI:** ❓ efecto visual del ajuste apagado en tickets que ya tenían apoyos.

---

## SOP-010 · Notificaciones del ticket (WhatsApp, correo, campana y reenvío manual)
- **Ruta UI / name:** toggles "Notificar al cliente por:" / "Notificar al tecnico por:" del formulario (SOP-002); icono "Enviar mensaje de notificación" del listado y de la ficha del cliente → modal "Enviar Notificación"; campana de la cabecera. ✅
- **Archivos:** FE: `components/NotificacionModal.vue`, `src/composables/useWaCanal.js`, `pages/dashboard/ajustes/ticket/PlantillaMsgCliente.vue`, `PlantillaMsgTecnico.vue` · BE: `ticket/ticket.service.ts` (`create` 138-186, `sendNotification` 188-221, `enviarNotificacionWhatsApp` 223-542, `enviarEmail` 544-581, `sendMsgWhatsApp` 584-644, `avisarAsignacionEnPanel` 95-118), `cloud-api/cloud-api.service.ts` (`resolverCanalOficial` 418-422, `esCanalOficial` 372-386, `enviarPlantillaPorTipo` 1419-1520), `cloud-api/template-converter.ts` (completo), `email/email.service.ts:229-274`, `common/utils/helpers.service.ts:42-52`.
- **Para qué sirve:** avisar al cliente y al técnico (y a los de apoyo) por WhatsApp/correo cuando se abre o se reenvía un ticket, y alertar en la campana a quien recibe la asignación o una respuesta.
- **Acceso:** reenviar: `ticket.reenviar_msg` (listado) / `cliente.ticket.reenviar_msg` (ficha del cliente), solo si el ticket no está CERRADO/CANCELADO. Plantillas: `variables.ver.plantilla.ticket` / `variables.edita.plantilla.ticket` (Ajustes). ✅
- **Disparadores (qué mensajes se envían solos):**
  | Evento | Qué se envía | A quién | Condición |
  |---|---|---|---|
  | Crear ticket | WhatsApp y/o correo con la plantilla "cliente" | cliente | toggle marcado en el formulario (`notificacion.cliente.*`) |
  | Crear ticket | WhatsApp y/o correo con la plantilla "técnico" (+ nota de apoyo) | responsable y cada técnico de apoyo | toggle del técnico marcado |
  | Crear ticket | campana "Ticket Asignado" + websocket | responsable y apoyos | **siempre** (sin condición) |
  | Editar: cambia el responsable o se suma un apoyo | campana "Ticket Asignado" y, si el ticket guarda toggles de técnico activos, WhatsApp/correo | solo los recién sumados | `BE:ticket.service.ts:842-859` |
  | Agregar una respuesta | campana "Ticket Respondido" (hecha desde el frontend) | operador o técnico (la otra parte) | siempre |
  | Cambiar estado | **nada** (solo la respuesta automática en el hilo) | — | — |
  | Reenviar manual | mensaje con la plantilla del destinatario elegido + campana "Ticket Asignado" si se reenvía al técnico (`ticket.service.ts:212-214`) | cliente o "Persona asignada" (solo el responsable) | `POST /ticket/notification` |
- **Modal "Enviar Notificación" (campos):**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Notificar a: | select | — | `Cliente` / `Persona asignada` | cambia teléfono/correo precargados |
  | Enviar por: | select | Sí | `WhatsApp` / `Email` / `Ambas` | sin elegir: `Debes completar este campo` |
  | Canal de WhatsApp: | botones `Oficial` / `No oficial` | — | solo si están configurados ambos canales y se envía por WhatsApp | por omisión el canal activo de la empresa |
  | Celular del cliente: | teléfono con país | Sí si WhatsApp | el rótulo dice "del cliente" aunque se elija "Persona asignada" | |
  | Email del cliente: | correo | Sí si Email | regex simple; `Ingresa un email valido` | mismo rótulo |
  Botón **Enviar**; éxito `Notificación enviada` (positive); en error muestra `error.response.data.message` (warning). (`NotificacionModal.vue`)
- **Plantillas y variables:**
  - Textos en Ajustes → Plantillas → Tickets → "Plantilla mensaje cliente" / "Plantilla mensaje tecnico" (editor HTML; el mismo texto se usa para WhatsApp y para el cuerpo del correo) (`BE:setting.entity.ts:233-237`).
  - El correo sale con asunto `{nombre comercial} - NOTIFICACIÓN - TICKET` (`BE:ticket.service.ts:546`).
  - Variables documentadas en pantalla — cliente: `{ cliente }`, `{ fecha_visita }`, `{ asunto }`, `{ detalle }`, `{ tecnico }`, `{ prioridad }`, `{ turno }`, `{ hora_visita }`, `{ telefono_tecnico }`; técnico: `{ cliente }`, `{ fecha_visita }`, `{ asunto }`, `{ detalle }`, `{ tecnico }`, `{ prioridad }`, `{ turno }`, `{ hora_visita }`, `{ telefono_cliente }`, `{ coordenadas_cliente }`, `{ ipv4 }`, `{ direccion }` (`FE:ajustes/ticket/PlantillaMsgCliente.vue:8-18`, `PlantillaMsgTecnico.vue:8-21`). El backend entrega las 13 a ambas plantillas (`BE:ticket.service.ts:255-269`); se reemplazan sin distinguir mayúsculas y con o sin espacios dentro de las llaves (`helpers.service.ts:45-51`). ✅
  - `{coordenadas_cliente}` es un enlace de Google Maps armado con las coordenadas del servicio (con el orden corregido); `{tecnico}` en la plantilla del técnico es el nombre de **quien recibe** el mensaje (`:399-403`).
  - **Sin plantilla por defecto** ✅: las columnas `plantillaTicketCliente` / `plantillaTicketTecnico` son `text` nullable sin valor inicial (BE:settings/entities/setting.entity.ts:236-240) y el editor del panel arranca con `''` (FE:pages/dashboard/ajustes/ticket/composables/useConfigTicket.js:6-7,18-19). `adaptarParaWhatsapp(null, …)` devuelve cadena vacía (BE:common/utils/helpers.service.ts:42-52), de modo que, por la vía no oficial, el envío se intenta con **mensaje vacío**: el WhatsApp pasa `message: ''` al gateway (BE:ticket/ticket.service.ts:584-609) y el correo sale con cuerpo vacío (`message.html = msg`, BE:email/email.service.ts:251-257); qué hace el gateway con un mensaje vacío no está en el ZIP ❓. Por la vía oficial no se usa este texto, sino la plantilla aprobada (siguiente punto).
  - **Plantillas aprobadas por tipo** ✅: en Ajustes → Plantillas → Tickets, bajo el editor, aparece el bloque "Plantilla WhatsApp Oficial" (botón de sincronizar con tooltip "Actualizar estado de aprobación", control `WaTemplateControl` con tipo `ticket_cliente` o `ticket_tecnico`) solo si `GET /cloud-api/config` devuelve `conectado` (FE:ajustes/ticket/PlantillaMsgCliente.vue:29-42,95-108; PlantillaMsgTecnico.vue:32-45,98-111). El detalle del control (Enviar a aprobar, usar la aprobada) está en MSG-014. Al "Enviar a aprobar" el HTML del editor se convierte con `htmlToMetaTemplate`: variables `{ nombre }` → `{{1}} {{2}}…` en orden de aparición y sin duplicar, negrita → `*texto*`, cursiva → `_texto_`, listas → líneas con guion, se descartan subrayado, alineación y títulos (con aviso en `warnings`: "El subrayado no se muestra en WhatsApp; el texto irá sin subrayar.", "Las listas se enviarán como líneas simples con guiones.", "La alineación (centrado/derecha) no aplica en WhatsApp.", "Los títulos irán como texto normal en negrita.") (BE:cloud-api/template-converter.ts:118-125,143-207). Reglas duras de Meta que valida `validateMetaBody`: `El mensaje está vacío.`; máximo 1024 caracteres (`El mensaje supera 1024 caracteres (tiene N). Acórtalo para poder aprobarlo.`); no puede empezar con una variable (`El mensaje no puede EMPEZAR con una variable; agrega texto antes.`), ni terminar con una (`El mensaje no puede TERMINAR con una variable; agrega texto o una firma después.`), ni dos variables seguidas (`Dos variables no pueden ir juntas; sepáralas con texto.`) (`:256-277`). Para cada variable de ticket el ejemplo que se manda a Meta es fijo (p. ej. `cliente` = "Juan Pérez", `fecha_visita` = "16/07/2026", `asunto` = "Sin conexión", `turno` = "Mañana", `hora_visita` = "09:30", `ipv4` = "10.0.0.25"); una variable que no está en esa tabla lleva el ejemplo "Ejemplo" (`:23-74,202-204`). Estados locales de la plantilla: `APROBADA`, `RECHAZADA` (Meta REJECTED/DISABLED), `PAUSADA`, `PENDIENTE` (PENDING/IN_APPEAL/otros) (`:291-307`).
  - **Envío por el canal oficial** ✅ (BE:cloud-api/cloud-api.service.ts:1419-1520, llamado desde BE:ticket/ticket.service.ts:274-308,457-489): `enviarPlantillaPorTipo(empresa, destino, 'ticket_cliente'|'ticket_tecnico', variables)` falla con `No hay plantilla de WhatsApp Oficial para "ticket_cliente". Créala y envíala a aprobar.` si nunca se envió a aprobar, y con `La plantilla "ticket_cliente" no está aprobada (estado: PENDIENTE|…|sin enviar).` si no está `APROBADA` (antes hace una sincronización con Meta por si el estado local estaba desactualizado). Meta no admite parámetros vacíos: cada variable se limpia (saltos y tabuladores → espacio) y, si alguna de las que usa la plantilla llega vacía (p. ej. `hora_visita` sin hora, `ipv4`, `direccion` o `coordenadas_cliente` sin dato en el servicio), falla con `El cliente tiene datos incompletos: la(s) variable(s) {nombres} llegó vacía. Meta rechaza plantillas con parámetros vacíos.` Los errores de este camino se capturan y solo quedan como registro `fallido` en Mensajes Enviados (con el mensaje de error); **no** crean campana ni log del cliente. Si la plantilla lleva cabecera de documento (`hasDocumentHeader`) y no hay archivo, lanza `La plantilla "…" lleva un PDF adjunto pero no se generó el archivo a enviar.`, caso que no aplica a tickets porque no se pasa documento.
  - **Qué canal se usa** ✅: `resolverCanalOficial(empresa, override)` → `override` `cloud_api`/`oficial` = oficial; `baileys`/`no_oficial` = no oficial; sin override, `esCanalOficial`: oficial solo si `wa_provider = 'cloud_api'` y, con **overflow** activo, mientras los envíos oficiales del día no lleguen al tope (`wa_oficial_limite_diario`, por omisión 250); al llegar al tope los avisos de ticket salen por el no oficial (BE:cloud-api/cloud-api.service.ts:359-432). Cualquier error al leer la empresa devuelve "no oficial". En el alta del ticket no se manda `wa_provider` (siempre canal activo); solo el modal de reenvío lo puede forzar. El interruptor global "Usar WhatsApp…" (`whatsappActivo`) **no** se consulta en el flujo de ticket (BE:ticket/ticket.service.ts no llama a `whatsappActivo`).
  - **Correo y su interruptor** ✅: `enviarEmail` llama `EmailService.sendMessage(empresa, html, destino, asunto)` **sin** `omitirInterruptor`, así que si el canal de correo está apagado en Mensajería lanza `El canal de correo está desactivado` y el aviso cae en la campana `Falla al enviar Email` incluso en el reenvío manual (BE:email/email.service.ts:229-235; BE:ticket/ticket.service.ts:544-581). Errores del SMTP: `Error: getaddrinfo ENOTFOUND {host}` o `Fallo al enviar el correo` (BE:email/email.service.ts:268-273). Texto de la campana: `No se logró enviar el mensaje de notificación del ticket al {cliente|técnico} {nombre} con el email {correo}, por favor revisar el servidor de correo configurado e intente de nuevo.` (BE:ticket/ticket.service.ts:569-573).
  - **Texto de la campana de WhatsApp** ✅: título `WhatsApp Desvinculado` (si el motivo es `WhatsApp desvinculado`) o `Error en WhatsApp`; descripción `No se logró la notificación del ticket al {cliente|técnico} {nombre} con el número {celular}. Motivo: {motivo}`; los motivos posibles de ISPMAX son `WhatsApp desvinculado` (sesión no conectada), `Número no usa WhatsApp` (check-number) o el mensaje de axios si el gateway no responde (BE:ticket/ticket.service.ts:584-644).
  - **Alta de ticket: envío sin esperar** ✅: `create` guarda el ticket, registra el log `Ticket creado exitosamente`, lanza `enviarNotificacionWhatsApp` **sin await** (cualquier fallo solo va a consola) solo si algún toggle está marcado, y después crea las campanas "Ticket Asignado"; la respuesta del alta no depende de los envíos (BE:ticket/ticket.service.ts:138-186).
- **Canales:**
  - WhatsApp **oficial** (Cloud API): plantilla aprobada de tipo `ticket_cliente` / `ticket_tecnico`; se usa si el canal activo es oficial (con tope diario opcional) o si el modal lo fuerza (`ticket.service.ts:274-308,457-489`).
  - WhatsApp **no oficial** (gateway Baileys): comprueba que la sesión esté conectada y que el número exista (`WhatsApp desvinculado`, `Número no usa WhatsApp`) y envía el texto (`:584-609`).
  - Correo: `EmailService.sendMessage` con el SMTP configurado.
- **Registro y fallas:** cada envío queda en "Mensajes Enviados" (origen `ticket`, estado enviado/fallido) y en los logs del cliente (`SEND_EMAIL`, `SEND_EMAIL_ERROR`, `SEND_WHATSAPP_ERROR`, `SEND_NOTIFICATION_SUCCESS`). Si falla el correo o el WhatsApp no oficial se crea una campana al usuario que actuó: `Falla al enviar Email` / `WhatsApp Desvinculado` / `Error en WhatsApp` con el motivo (`:569-576,631-640`). En el canal oficial las fallas solo quedan en "Mensajes Enviados" (sin campana). ✅
- **Reglas de negocio / advertencias:**
  1. `POST /ticket/notification` siempre responde `ok`: los errores de envío se capturan dentro de `enviarNotificacionWhatsApp` y no suben (`:539-541`), así que el modal muestra "Notificación enviada" aunque haya fallado; la señal es la campana. ✅
  2. Si algo falla antes (ticket inexistente) el mensaje de error es `Fallo al guardar el ticket.` (texto reutilizado) (`:218-219`).
  3. Campana "Ticket Asignado": texto `Se te ah asignado el ticket: 0000123, con el asunto: …, por el usuario …` (con la errata "ah") para el responsable (`:104-106`). ✅
  4. Reenviar al cliente usa el celular/correo escritos en el modal, no los del cliente guardado.
- **Relaciones con otros módulos:** Mensajería (Mensajes Enviados, canal oficial), Ajustes → Mensajería (sesión WhatsApp, SMTP), Logs, Usuarios (celular/correo del técnico).
- **Preguntas probables de usuarios:**
  1. "El cliente no recibió el WhatsApp" → revisar campana (WhatsApp desvinculado/número inválido) y Mensajes Enviados.
  2. "¿Por qué dice 'Notificación enviada' y no llegó?" → el modal no refleja fallos.
  3. "¿Se avisa al cliente cuando cierro el ticket?" → no.
  4. "¿Puedo editar el texto del mensaje?" → Ajustes → Plantillas → Tickets.
  5. "¿Qué variables puedo usar?" → las de la tabla de Ajustes (9 y 12), más las que el backend entrega.
  6. "¿Por qué el técnico recibe dos avisos?" → campana + WhatsApp/correo si lo marcaste.
- **Pendiente de validar en UI:** ❓ qué hace el gateway de WhatsApp no oficial con un mensaje vacío (servicio externo, ver `Límite de lectura`); ❓ aspecto del bloque "Plantilla WhatsApp Oficial" bajo el editor. Resueltos con el código: conversión de la plantilla al formato de Meta (`template-converter.ts` leído completo), ausencia de plantilla por defecto, errores del canal oficial y reglas de selección de canal.
- **Límite de lectura:** el gateway de WhatsApp no oficial (`HOST_API_WHATSAPP`: `/api/whatsapp/session/:id/info`, `/check-number`, `/send`), Meta Cloud API y el servidor SMTP no están en el ZIP; de ellos solo se conoce lo que ISPMAX envía y espera.

---

## SOP-011 · Impresión y exportación de tickets (PDF, Excel, formato Word)
- **Ruta UI / name:** botón "Reporte" (listado), icono PDF rojo de cada fila, selector "Columnas del reporte", y Ajustes → Plantillas → "Formato de Ticket". ✅
- **Archivos:** FE: `composables/useTicket.js:262-373` · BE: `ticket/ticket.service.ts:1269-1396,1545-1779`, `ticket/pdf-plantillas/campos-extra-ticket.ts`, `tickets.hbs`, `ticket-detalle.hbs`, `variables-ticket.ts`.
- **Para qué sirve:** sacar el listado filtrado o un ticket individual en PDF/Excel y, si la empresa sube su propio formato Word, imprimir el ticket con ese diseño.
- **Acceso:** ninguno extra (el botón es visible para quien ve el listado). Subir/quitar el formato: `variables.edita.plantilla.documentos.contrato` (permiso de plantillas de documentos) (`FE:ajustes/plantillas/components/PlantillaTicket.vue:35-36`). ✅
- **Listado (`GET /ticket/download/pdf|excel`):**
  - Envía los filtros de la pantalla (Estado, Prioridad, Respuesta, Técnico, Operador, rango de fechas, columnas) **sin el texto de búsqueda** (`useTicket.js:288-291`). Trae todos los registros (sin paginar). ✅
  - Columnas: la selección del usuario; por omisión Cliente, Asunto, Dirección Servicio, Técnico, Operador, Prioridad, Fecha Creación, Estado (`campos-extra-ticket.ts:47-292`). Catálogo en tres grupos: "Detalle del ticket" (Asunto, Técnico, Operador, Prioridad, Fecha Creación, Estado, Ultimo mensaje, Fecha de visita, Turno, Hora, Agendado, Fecha cierre, Tiempo resolución, Detalle), "Información del cliente" (Cliente, Ubicación, Dirección del cliente, Coordenadas, Celular, Email, N° Documento) e "Información del servicio" (Dirección Servicio, Plan, Costo, IPV4, Instalado, Router, Estado del servicio).
  - PDF horizontal A4 titulado `REPORTE DE TICKETS` con rango, Estado/Prioridad/Respuesta, total y totales por estado; archivo `tickets.pdf`. Excel: hoja "Tickets", título `REPORTE DE TICKETS`, cabecera `N°` + columnas, totales `Abiertos:`, `En Proceso:`, `Resueltos:`, `Cerrados:`, `Cancelados:`; archivo `tickets.xlsx` (`ticket.service.ts:1315-1396,1681-1779`). ✅
- **PDF del ticket (`GET /ticket/download/pdf/:id`):**
  1. Si hay un **Formato de Ticket** Word cargado y el servidor puede convertirlo (LibreOffice), se rellena con las variables y se devuelve ese PDF (`ticket.service.ts:1493-1543,1551-1552`).
  2. Si el Word tiene una llave mal escrita, responde 400 `El formato de ticket tiene un problema: falta la llave de cierre en "…".` (no cae al formato del sistema) (`:1529-1531`; `variables-ticket.ts:391-405`).
  3. Si no hay formato, el archivo no existe en disco o no se puede convertir, usa el formato del sistema (`ticket-detalle.hbs`): cabecera de empresa, `TICKET # 0000123`, secciones **Datos del Cliente**, **Información Ticket**, **Información Servicios**, ASUNTO, DESCRIPCIÓN, **Información Adicional** (solo las columnas elegidas que no están ya en el cuerpo), un cuadro fijo de **Observaciones** con 8 verificaciones, **NOTAS:** y líneas de firma Cliente/Técnico. ✅
  4. Archivo `ticket-0000123.pdf`.
- **Variables del formato Word** (`GET /ticket/plantilla/variables`, se escriben con una llave `{variable}`; las secciones repetibles se abren/cierran con `{#equipos} … {/equipos}`): grupos **Ticket** (numero_ticket, asunto, detalle, estado, prioridad, turno, hora_visita, fecha_visita, agendado, fecha_creacion, fecha_cierre, departamento, total_respuestas, ultima_respuesta), **Cliente** (cliente_nombres/documento/celular/email/direccion), **Servicio** (servicio_ip/plan/usuario_ppp/caja_nap/puerto_nap/router/ubicacion/direccion/fecha_instalacion), **Personal** (tecnico_nombre/celular, operador_nombre/celular), **Empresa** (empresa_nombre/razon_social/nombre_comercial/ruc/direccion/telefono/email), **Visita del técnico** (hora_llegada, hora_salida, tiempo_en_sitio, distancia_llegada, verificacion_visita, total_visitas), **Materiales usados** (equipos, accesorios, hay_materiales, hay_equipos, hay_accesorios, total_equipos, total_accesorios, equipos_texto, accesorios_texto), **Firma electrónica** (firma_cliente, firma_isp), **Fecha de impresión** (fecha_actual, hora_actual, dia_actual, mes_actual, anio_actual) (`variables-ticket.ts:127-353`). Una variable inexistente sale vacía. ✅
- **Reglas / efectos:** usa Puppeteer/Chromium (en Linux `SISTEMA=linux` → `/usr/bin/chromium`) y LibreOffice para Word→PDF; las tres rutas de descarga devuelven el binario.
- **Casos límite y advertencias:**
  - En el formato del sistema el campo Detalle se imprime con `{{detalle}}` (escapado): el HTML del editor puede salir como texto con etiquetas visibles (`ticket-detalle.hbs`, `ticket.service.ts:1594`). ❓ confirmar en UI. ✅ lectura.
  - El formato del sistema **no incluye las respuestas** (solo trae estilos de ellas) y muestra `00/00/0000 00:00:00` como fecha de cierre si sigue abierto (`ticket.service.ts:1592`). ✅
  - Los errores de descarga con `arraybuffer` muestran el texto genérico (`Error al descargar el reporte` / `Error al descargar el reporte del ticket`) porque el mensaje del backend llega como buffer (`useTicket.js:336-338,368-370`).
  - Solo se permite **un** formato de ticket (el más reciente por `updated_at`) (`ticket.service.ts:1445-1450`).
- **Preguntas probables de usuarios:**
  1. "¿Puedo imprimir con mi propio diseño?" → sí, subir un Word en Ajustes → Plantillas → Formato de Ticket.
  2. "Salió 'El formato de ticket tiene un problema…'" → llave sin cerrar en el Word.
  3. "¿Puedo elegir las columnas del Excel?" → sí, "Columnas del reporte".
  4. "¿El reporte respeta mi búsqueda?" → no, solo los filtros.
  5. "¿Por qué no salen las respuestas en el PDF?" → el formato del sistema no las imprime (en Word sí está `ultima_respuesta`).
- **Pendiente de validar en UI:** ❓ vista real del PDF por defecto (HTML escapado del detalle); ❓ comportamiento sin LibreOffice en el servidor (cae al formato del sistema, solo registra error en logs).

---

## SOP-012 · Reportes de tickets: Productividad y Por Cliente
- **Ruta UI / name:** `/tickets/reportes` · `tickets.reportes` · botón "Reportes" del listado (`FE:router/routes.ts:362-366`). ✅
- **Archivos:** FE: `ReportesPage.vue`, `components/ReporteProductividad.vue`, `components/ReporteClientes.vue` · BE: `ticket.controller.ts:40-144`, `ticket.service.ts:961-1267,1820-2089`, `pdf-plantillas/productividad.hbs`, `clientes.hbs`.
- **Para qué sirve:** medir cuántos tickets atiende cada técnico y en cuánto tiempo, y detectar clientes con reclamos repetidos.
- **Acceso:** el guard mapea `tickets.reportes` → `tickets.index` (`FE:router/auth-guard.ts:85`); el botón no pide más permiso. El backend no restringe: cualquier usuario autenticado ve la productividad de todos. ✅
- **Cabecera:** flecha atrás, "Reportes de Tickets", selector **Fechas** (rango; por omisión el mes en curso) y pestañas **Productividad** / **Por Cliente**. El rango filtra por fecha de creación del ticket.
- **Pestaña Productividad:**
  - Controles: **Periodo:** Diario / Semanal / Mensual; **Técnico:** Todos o uno; botones PDF y Excel (deshabilitados sin datos).
  - Una tarjeta por técnico: nombre, `N tickets`, insignias `Abiertos`, `En Proceso`, `Resueltos`, `Cerrados`, `Cancelados`; **Tiempo prom. respuesta**; **Por prioridad** (Baja, Media, Alta, Critico); desplegable `Tickets por periodo (diario|semanal|mensual)` con Periodo/Tickets. Sin datos: `No se encontraron tickets en el rango seleccionado.`
  - Reglas: se agrupa por técnico **responsable** (los de apoyo no cuentan; sin técnico → "Sin asignar"); **tiempo de respuesta** = desde la creación hasta la primera respuesta de cualquier usuario (incluye el aviso automático de cambio de estado), `N/A` si no hubo; los periodos se rotulan `DD/MM`, `DD/MM - DD/MM` (semana ISO) o `Mes AAAA` (`BE:ticket.service.ts:961-1113`). ✅
  - Excel `productividad.xlsx` (hoja "Productividad", título `REPORTE DE PRODUCTIVIDAD POR TÉCNICO`, columnas N°, Técnico, Total, Abiertos, En Proceso, Resueltos, Cerrados, Cancelados, T. Prom. Respuesta, Baja, Media, Alta, Crítico + una por periodo, fila TOTAL); PDF `productividad.pdf` (`:1833-1992`).
- **Pestaña Por Cliente:**
  - Buscador `Buscar cliente...` (filtra en pantalla por nombre, documento o correo; **no** afecta a las descargas) y botones PDF/Excel.
  - Tres tarjetas: `Clientes con tickets`, `Total de tickets`, `Clientes con ≥3 tickets`.
  - Por cliente: nombre/documento, `N tickets`, insignias por estado, `Tiempo prom. atención (N finalizados)` (creación → cierre; usa `updated_at` si falta `fecha_cierre`; solo RESUELTO/CERRADO/CANCELADO), `Último ticket`, `Por prioridad`, **Problemas recurrentes (n)** (los 5 asuntos más repetidos, coincidencia de texto exacto, rojo si ≥2 veces) y **Servicios relacionados (n)** (IP y cantidad, o `Sin servicios vinculados`).
  - "Repetitivo" = 3 o más tickets en el rango (`BE:…:1249,1258`). Excel `tickets-por-cliente.xlsx` (hoja "Clientes"; 16 columnas, filas repetitivas en amarillo); PDF `tickets-por-cliente.pdf` con marca "REP". ✅
- **Casos límite y advertencias:**
  - El manual actual habla de un reporte "Resumen" por estado y prioridad: **no existe** en esta pantalla; el resumen son las tarjetas del listado (`docs/guia/tickets.mdx`, sección "Reportes de tickets"). ✅
  - "Tiempo prom. respuesta" se contamina con los avisos automáticos de cambio de estado: pasar un ticket a EN PROCESO cuenta como "primera respuesta".
  - Los reportes cuentan por **estado actual** de tickets creados en el rango, no por fecha de cierre.
  - Errores: `Error al cargar productividad`, `Error al cargar el reporte`, `Error al descargar el reporte` (warning).
- **Preguntas probables de usuarios:**
  1. "¿Dónde veo cuántos tickets cerró cada técnico?" → Reportes → Productividad.
  2. "¿Cómo detecto clientes problemáticos?" → pestaña Por Cliente; "REP" y tarjeta ≥3.
  3. "¿Se cuentan los técnicos de apoyo?" → no, solo el responsable.
  4. "¿Por qué el tiempo de respuesta es tan corto?" → el cambio de estado cuenta como respuesta.
  5. "¿Puedo descargarlo?" → sí, PDF y Excel por pestaña.
- **Pendiente de validar en UI:** ❓ vista de las tarjetas en pantallas pequeñas; ❓ si el gráfico por periodo de semanas que cruzan año se rotula bien.

---

## SOP-013 · Tickets desde la ficha del cliente
- **Ruta UI / name:** Clientes → ficha del cliente (`cliente.edit`) → pestaña "Tickets" (visible con `cliente.ticket.index`) (`FE:pages/dashboard/clientes/components/editar/IndexPage.vue:79-84,135-141`). ✅
- **Archivos:** FE: `pages/dashboard/clientes/components/editar/Servicios/TicketsPage.vue` (reutiliza `FormTicket.vue` y `NotificacionModal.vue`) · BE: los mismos endpoints de ticket (`GET /ticket?customer=`).
- **Para qué sirve:** ver y abrir tickets desde la propia ficha, con cliente y servicio ya elegidos.
- **Acceso (claves propias):** `cliente.ticket.index` (ver), `cliente.ticket.agregar`, `cliente.ticket.editar`, `cliente.ticket.eliminar`, `cliente.ticket.reenviar_msg`, `cliente.ticket.asignar_otros` (`FE:usuarios/permisos/gestion-clientes-permisos.json:40-48`). ✅
- **Tabla:** columnas N°, Asunto, Fecha Visita, Turno / Hora, Tecnico, `Asignado Por:`, Prioridad, Estado, Acciones; buscador `Buscar...`; botón **Abrir ticket** (diálogo "Agregar Ticket" con el mismo formulario del SOP-002; cliente y servicio seleccionados). Acciones: editar (abre `tickets.edit?edit=true`), eliminar (`cliente.ticket.eliminar` + ser el operador), enviar notificación (estado ≠ CERRADO/CANCELADO). Vacío: `No se encontró ningun servicio.` (texto reutilizado). (`TicketsPage.vue:19-30,166-299`)
- **Reglas:**
  1. Lista con `customer={id}`: trae **todos** los tickets del cliente, sin rango de fechas por omisión (el default del mes solo se aplica si no hay cliente ni servicio) (`BE:ticket.service.ts:668-674`); aunque haya selector de servicios arriba, no se filtra por servicio. ✅
  2. Para asignar a otra persona vale `cliente.ticket.asignar_otros` o `tickets.asignar_otros`.
- **Casos límite:**
  - El icono de edición se muestra con `cliente.ticket.editar`, pero `tickets.edit` es la clave que exige la ruta: un rol que solo tenga `cliente.ticket.editar` será redirigido (permiso inconsistente) (`FE:router/auth-guard.ts:136-137`). ✅
  - La tabla asume `tecnico` y `operador` presentes (`row.tecnico.fullName`); un técnico eliminado rompería la fila ❓.
- **Preguntas probables de usuarios:**
  1. "¿Dónde veo el historial de tickets de un cliente?" → ficha del cliente → Tickets.
  2. "No puedo editar desde la ficha" → falta `tickets.edit` además de `cliente.ticket.editar`.
  3. "¿Se ven los tickets de todos sus servicios?" → sí, el selector de servicio no filtra la tabla.
- **Pendiente de validar en UI:** ❓ comportamiento del selector de servicios en esta pestaña; ❓ columna "Asignado Por:" (es el operador).

---

## SOP-014 · Listado de instalaciones
- **Ruta UI / name:** `/instalaciones` · `instalaciones.index` · menú "Gestion de Clientes" → "Instalaciones" (`FE:layouts/SideBarMenu.vue:288-297`). ✅
- **Archivos:** FE: `pages/dashboard/instalaciones/Indexpage.vue`, `components/ResumenCardsInstalaciones.vue`, `composables/useInstalaciones.js` · BE: `instalaciones/instalaciones.controller.ts`, `instalaciones.service.ts` (`findAll` 597-686, `getResumenStats` 1164-1206, `exportarListadoExcel` 1505-1576, `exportarListadoPDF` 1582-1677).
- **Para qué sirve:** lista las órdenes de instalación (clientes nuevos por conectar) con su estado, técnico y fecha agendada.
- **Acceso:** `instalaciones.index` (ruta y menú). Acciones por fila con `instalaciones.edit`, `instalaciones.delete`, `instalaciones.notificar`, `instalaciones.imprimir`; el botón "Nueva Instalación" con `instalaciones.add`. No existe un permiso "ver de otros": solo el rol SUPER-ADMINISTRADOR (`claim.roles[0]`) ve todas (`Indexpage.vue:143-144`). ✅
- **Tarjetas** (`GET /instalaciones/stats/resumen?desde&hasta`): TOTAL, HOY, PENDIENTES, AGENDADAS, EN PROCESO, INSTALADAS, REPROGRAMADAS, CANCELADAS (`ResumenCardsInstalaciones.vue:32-89`). Cuentan por fecha de creación dentro del rango; "HOY" se calcula aparte (creadas en el día actual). **No se filtran por usuario**: cada técnico ve los conteos globales aunque su tabla muestre solo las suyas (`BE:instalaciones.service.ts:1164-1206`). ✅
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Nueva Instalación | abre `/instalaciones/add` | `instalaciones.add` | — | |
  | Reportes | abre `/instalaciones/reportes` | ninguno extra (guard lo mapea a `instalaciones.index`) | — | |
  | Reporte ▾ (split) | clic directo = Excel; menú: "Excel (.xlsx)" ("Tabla tal cual la ves en pantalla"), "PDF" ("Tabla impresa horizontal") | ninguno | `GET /instalaciones/export/excel` · `/export/pdf` | ver SOP-025 |
  | OCULTAR COLUMNAS | oculta columnas (todas menos Acciones) | ninguno | — | no se guarda entre sesiones |
  | Buscar... | texto libre (debounce 300 ms) | ninguno | `GET /instalaciones?filter=` | busca en nombre del técnico, dirección, cédula, teléfono y estado |
  | lápiz "Editar Instalación" | abre `/instalaciones/edit/:id` | `instalaciones.edit` | — | |
  | papelera "Eliminar Instalación" | confirma y borra (lógico) | `instalaciones.delete` | `DELETE /instalaciones/:id` | sin comprobación de creador/estado |
  | enviar "Enviar Notificación" | abre el modal (SOP-024) | `instalaciones.notificar` | `POST /instalaciones/notification` | en cualquier estado |
  | impresora "Imprimir Hoja de Instalación" | genera e imprime el PDF | `instalaciones.imprimir` | `GET /instalaciones/pdf/:id` | cualquier estado |
- **Filtros (etiquetas exactas):** **Estado:** Todos / Pendiente / Agendada / En proceso / Instalado / Reprogramada / Cancelada (uno solo) · **Técnico:** Todos + usuarios · **Operador:** Todos + usuarios · **Rango:** selector de rango de fechas (por omisión del día 1 del mes a hoy, no permite fechas futuras; la "x" lo limpia y trae todo el histórico). El rango es sobre la fecha de **creación** (`created_at`). (`Indexpage.vue:34-74,359-408`) ✅
- **Columnas:** N° (7 dígitos), Cliente (enlace a la ficha si existe un cliente con esa cédula; si no, texto que intenta buscarlo), Cédula, Teléfono, Dirección, F/H Instalación, Técnico, Estado (insignia), Acciones (fija a la derecha). (`Indexpage.vue:106-123`)
- **Reglas de negocio (backend):**
  1. Orden `created_at` descendente; pagina con `page`/`limit` (10 por defecto). ✅
  2. Parámetro `tecnico` = (técnico **o** operador) — así un técnico ve las que creó y las que le asignaron; `tecnico_id` y `operador_id` son los selectores de la pantalla (`BE:…:622-632`). ✅
  3. Cada fila trae `cliente_id` resuelto por coincidencia **exacta** de `numero_cedula` con `customers.numero_documento` (`:659-676`). ✅
  4. La búsqueda **no incluye el nombre del cliente** (sí lo incluyen exportaciones y reportes) (`:609-620` vs `1228-1236`). ✅
- **Mensajes (texto exacto):** `Instalación eliminada` (positive), `Fallo al eliminar la instalación`, diálogo `¿Deseas eliminar la instalación #0000123?`; `No se encontró ningún resultado.`; abrir cliente: `No se encontró el cliente` (warning) o `No se encontró el cliente revise que tenga un servicio activo o que el número de cédula sea correcto` (negative); imprimir: `Error al generar la hoja de instalación`.
- **Relaciones con otros módulos:** Clientes (enlace por cédula), Usuarios (selectores), Mensajería (notificación), Almacén (materiales).
- **Casos límite y advertencias:**
  - "Buscar..." no encuentra por nombre del cliente aunque esa sea la expectativa natural; sí por cédula, teléfono o dirección. ✅
  - El rol que no sea literalmente SUPER-ADMINISTRADOR solo ve lo suyo, aunque sea administrativo.
  - Eliminar no libera equipos reservados ni devuelve accesorios (SOP-021). ✅
- **Preguntas probables de usuarios:**
  1. "No encuentro una instalación escribiendo el nombre del cliente" → buscar por cédula/teléfono o usar el filtro.
  2. "¿Por qué solo veo algunas instalaciones?" → no eres SUPER-ADMINISTRADOR: ves las tuyas (técnico u operador).
  3. "¿Por qué las tarjetas suman más que mi tabla?" → las tarjetas son globales.
  4. "¿Qué es 'HOY'?" → instalaciones creadas hoy.
  5. "¿Cómo borro una instalación?" → papelera (permiso eliminar).
  6. "¿Se pueden ver instalaciones antiguas?" → quitar el rango de fechas con la "x".
- **Pendiente de validar en UI:** ❓ comportamiento de la "x" del rango y de la hora de corte `hasta`; ❓ si "OCULTAR COLUMNAS" muestra todas marcadas al entrar.

---

## SOP-015 · Crear instalación ("Nueva Instalación")
- **Ruta UI / name:** `/instalaciones/add` · `instalaciones.add` · botón "Nueva Instalación". ✅
- **Archivos:** FE: `AddInstalacion.vue`, `components/FormInstalaciones.vue`, `composables/useInstalaciones.js` · BE: `instalaciones.controller.ts:19-26`, `instalaciones.service.ts:62-86`, `dto/create-instalacione.dto.ts`.
- **Para qué sirve:** registrar un cliente potencial que será visitado e instalado: datos de contacto, técnico, fecha y hora, ubicación y qué avisar.
- **Acceso:** `instalaciones.add`. ✅
- **Campos de formulario:**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Número de cédula: | texto (máx. 13, con contador) + lupa / Enter | Sí (FE) | busca cliente existente con ≥3 caracteres | BE: texto libre |
  | Cliente: | texto en MAYÚSCULAS (placeholder "Nombre del cliente") | Sí (FE) | se convierte a mayúsculas al escribir | varchar(200) |
  | Técnico: | select (muestra `Nombres: … Rol: …`) | Sí (FE+BE UUID) | lista todos los usuarios activos | en edición queda deshabilitado |
  | Estado: | select | — | al crear: Pendiente (por omisión), Agendada, En proceso | |
  | Fecha - Hora instalación: | calendario → reloj | Sí (FE) | máscara `DD/MM/YYYY HH:mm`; solo hoy o posterior (fecha UTC) | se guarda como texto |
  | Teléfono: | teléfono con país | Sí (FE) | varchar(20) | |
  | Correo: | texto | Sí (FE) | sin validación de formato; varchar(100) | |
  | Dirección: | texto autogrow | No | | |
  | Ubicación (coordenadas): | texto "Longitud, Latitud" + botón de mapa | No | el mapa devuelve `lng, lat` | |
  | Notas (Opcional): | editor HTML | No | | |
  | Pre-asignación técnica | tarjeta | No | ver SOP-022 | |
  | Notificar al cliente por: | toggles Email (activo) / WhatsApp | — | | ver SOP-024 |
  | Notificar al técnico por: | toggles Email / WhatsApp (ambos apagados) | — | | |
  | Adjuntar archivo (Opcional): | arrastrar y soltar | No | cualquier tipo, 8 archivos, 500 MB c/u | |
  Botones: **Regresar**, **Guardar Instalación**; diálogo `¿Deseas agregar la instalación?` (Agregar / Cancelar). Campos faltantes: `Debes completar este campo`. (`FormInstalaciones.vue:84-446`; `useInstalaciones.js:52-64,134-182`)
- **Búsqueda del cliente por cédula:** `GET /customers/find-customer/{cédula}`; si trae un cliente, autocompleta Cliente, Teléfono, Correo y Dirección; sin resultado: `No se encontró ningún cliente — puedes llenar los campos manualmente`; error: `Error al buscar el cliente`. El backend responde **un solo cliente** y busca por coincidencia parcial `LIKE %term%` en el documento, así que el menú de "coincidencias" del formulario no llega a mostrarse y una cédula incompleta puede traer otro cliente (`BE:customers/customers.service.ts:1931-1960`). ✅
- **Reglas de negocio (backend):**
  1. Solo `tecnico` es obligatorio (UUID); `estado` opcional validado con el enum; el resto son strings opcionales (`create-instalacione.dto.ts`). El frontend exige seis campos que el backend no. ✅
  2. Se guarda con `operador` = usuario actual, `secuencial` autoincremental y estado `PENDIENTE` si no se envía (`instalaciones.service.ts:62-69`; entidad L14-21,40-60). ✅
  3. Si algún toggle de notificación viene activo se envían los avisos **de la plantilla AGENDADA** (aunque la instalación se cree PENDIENTE o EN PROCESO) en segundo plano (`:71-79,165-170`). ✅
  4. No hay log de auditoría del módulo de instalaciones; solo el historial de reasignaciones y las respuestas automáticas de estado. ✅
  5. No evita duplicados (misma cédula puede tener varias instalaciones).
- **Mensajes (texto exacto):** éxito `Instalación agregada correctamente`; error `Fallo al guardar la instalación` (FE) / `Fallo al guardar la instalación.` (BE).
- **Efectos secundarios externos:** WhatsApp/correo según toggles y plantilla AGENDADA activa (SOP-024).
- **Casos límite y advertencias:**
  - El calendario usa fecha UTC: tras las 19:00 en Ecuador no deja elegir hoy (`FormInstalaciones.vue:266`). ❓
  - Correo es obligatorio en pantalla aunque el cliente no tenga (en los envíos masivos se usa un correo ficticio `…@sin-email.local` según un comentario de código) (`NotificacionInstalacionModal.vue:30-32`).
  - Estado y notificación: crear como "En proceso" manda el mensaje "Instalación confirmada" (plantilla AGENDADA).
- **Preguntas probables de usuarios:**
  1. "¿Por qué me pide correo si el cliente no tiene?" → es obligatorio en pantalla.
  2. "¿Qué pasa si la cédula ya es cliente?" → se autocompletan sus datos.
  3. "¿Puedo crearla ya como Instalado?" → no desde la pantalla; se completa con el flujo de cliente.
  4. "¿Cómo pongo las coordenadas?" → botón de mapa o escribir `longitud, latitud`.
  5. "¿Se avisa al técnico?" → solo si marcas Email/WhatsApp del técnico y la plantilla está activa.
  6. "¿Quién ve la instalación?" → el técnico asignado, quien la creó y SUPER-ADMINISTRADOR.
- **Pendiente de validar en UI:** ❓ cómo reacciona el formulario cuando el cliente ya existe con varios servicios; ❓ si el selector de técnico muestra el HTML de la etiqueta.

---

## SOP-016 · Detalle y edición de la instalación
- **Ruta UI / name:** `/instalaciones/edit/:id` · `instalaciones.edit` · lápiz del listado; también desde la ficha del cliente (chip "Instalación #…" de Recursos). ✅
- **Archivos:** FE: `EditInstalacion.vue`, `components/DetalleInstalacion.vue`, `FormInstalaciones.vue`, `ChecklistInstalacion.vue`, `ListRespuestasInstalacion.vue` · BE: `instalaciones.controller.ts:130-143`, `instalaciones.service.ts:688-745`.
- **Acceso:** ruta `instalaciones.edit`. Pestaña "Formulario Instalación" solo para SUPER-ADMINISTRADOR o el operador que la creó (`EditInstalacion.vue:19-25`). ✅
- **Cabecera:** `INSTALACIÓN #0000123`; migas Inicio › Instalaciones › Editar.
- **Pestañas:** **Detalles** (lectura + acciones), **Formulario Instalación** (condicional), **Materiales** (SOP-021).
- **Pestaña Detalles — contenido:** Cliente (enlace "Ir al perfil del cliente"); botón "Cambiar Estado"; Estado (con `Motivo:` si es REPROGRAMADA/CANCELADA); Cédula; Técnico (+ botón "Reasignar"); Teléfono; Fecha Instalación; Correo; Dirección; Ubicación; Notas; Archivos adjuntos; "Historial de reasignaciones (n)"; "LISTADO DE RESPUESTAS"; "Checklist de instalación". (`DetalleInstalacion.vue:105-361`)
- **Ir al cliente:** busca por cédula; si no existe: `Este cliente aún no está registrado en el sistema.` (`DetalleInstalacion.vue:55-72`).
- **Pestaña Formulario:** el mismo formulario del SOP-015 con técnico bloqueado (`Para cambiarlo, usa Reasignar en el detalle.`), Estado con las seis opciones y botón `Editar Instalación`; diálogo `¿Deseas editar la instalación?`; éxito `Instalación editada correctamente`.
- **Reglas de negocio (backend, `PATCH /instalaciones/:id`):**
  1. El campo `tecnico` se **ignora siempre** en este endpoint (solo `reasignar-tecnico` lo cambia) (`:716-718`). ✅
  2. Si el estado nuevo es `CANCELADA`, se borra la pre-asignación (`:705-708`). ✅
  3. Si cambia el estado y el nuevo no es `INSTALADO`, se envían las notificaciones de ese estado (`:722-738`). ✅
  4. No valida transiciones, ni motivo obligatorio, ni el estado actual para permitir editar. ✅
  5. `PATCH` es el mismo camino que usa el checklist y los cambios de estado.
- **Casos límite y advertencias:**
  - **Atajo de estado:** el selector "Estado" de esta pestaña ofrece INSTALADO, REPROGRAMADA y CANCELADA y los guarda **sin** pedir motivo, sin crear cliente/servicio y sin exigir el checklist; INSTALADO así no envía el mensaje de bienvenida (ese se dispara al crear el servicio) (`FormInstalaciones.vue:201-216`). ✅
  - `fecha_instalacion` y `motivo_estado` quedan tal cual; solo "Cambiar Estado" limpia el motivo en estados que no lo piden.
  - Los datos mostrados vienen del formulario cargado (no refrescan solos).
- **Preguntas probables de usuarios:**
  1. "No veo la pestaña 'Formulario Instalación'" → solo SUPER-ADMINISTRADOR o quien creó la instalación.
  2. "No puedo cambiar el técnico en el formulario" → usar Reasignar.
  3. "Puse INSTALADO en el formulario y no se creó el cliente" → ese camino no crea cliente; usar Cambiar Estado → INSTALADO.
  4. "¿Cómo veo quién cambió el técnico?" → Historial de reasignaciones.
- **Pendiente de validar en UI:** ❓ cómo se ve la pestaña para un técnico que no es el creador (solo Detalles y Materiales).

---

## SOP-017 · Ciclo de vida de la instalación: estados, transiciones, motivos y reagendado
- **Ruta UI / name:** botón "Cambiar Estado" (split, icono `autorenew`) en Detalles de `instalaciones.edit`. ✅
- **Archivos:** FE: `DetalleInstalacion.vue:75-100,136-165`, `EditInstalacion.vue:69-230`, `DialogReagendar.vue` · BE: `instalaciones.service.ts:700-745`, `entities/instalacione.entity.ts:14-21,62-64`.
- **Estados (`InstalacionEstado`):**
  | Estado | Significado operativo | Color/etiqueta |
  |---|---|---|
  | `PENDIENTE` | registrada, sin visita confirmada (estado inicial) | naranja · PENDIENTE |
  | `AGENDADA` | con fecha y técnico confirmados | azul · AGENDADA |
  | `EN_PROCESO` | el técnico está en camino o en sitio | ámbar · EN PROCESO |
  | `INSTALADO` | completada: existe el servicio del cliente (estado final) | verde · INSTALADO |
  | `REPROGRAMADA` | se cambió la fecha (lleva motivo y nueva fecha) | naranja oscuro · REPROGRAMADA |
  | `CANCELADA` | anulada (lleva motivo) | rojo · CANCELADA |
- **Transiciones que ofrece la pantalla** (`DetalleInstalacion.vue:85-92`, solo frontend):
  | Desde | Hacia |
  |---|---|
  | PENDIENTE | AGENDADA, EN_PROCESO, INSTALADO, REPROGRAMADA, CANCELADA |
  | AGENDADA | EN_PROCESO, INSTALADO, REPROGRAMADA, CANCELADA |
  | EN_PROCESO | INSTALADO, REPROGRAMADA, CANCELADA |
  | REPROGRAMADA | PENDIENTE, AGENDADA, EN_PROCESO, INSTALADO, CANCELADA |
  | CANCELADA | PENDIENTE (reactivar) |
  | INSTALADO | ninguna (sin botón "Cambiar Estado") |
  El backend **no valida** transiciones: acepta cualquier estado del enum (`@IsEnum`) desde cualquier otro. ✅
- **Qué pide cada cambio:**
  | Hacia | Diálogo / acción | Resultado |
  |---|---|---|
  | PENDIENTE / AGENDADA / EN_PROCESO | `¿Marcar como pendiente?` / `¿Marcar como agendada?` / `¿Marcar como en proceso?` (Actualizar / Cancelar) | PATCH `{estado, motivo_estado: null}` |
  | REPROGRAMADA | diálogo "Reagendar instalación": **Motivo** (textarea, mín. 3: `Mínimo 3 caracteres`, placeholder `Indica el motivo del reagendado (mín. 3 caracteres)`) y **Nueva fecha y hora** (`DD/MM/AAAA HH:mm`, solo hoy o después; `Selecciona una fecha y hora`); botón **Reagendar** | PATCH `{estado, motivo_estado, fecha_instalacion}` |
  | CANCELADA | prompt `Motivo de cancelación` ("Indica el motivo (mínimo 3 caracteres):"), luego `¿Cancelar la instalación?` / `Motivo: …` (botones **Cancelar instalación** / **Volver**) | PATCH `{estado, motivo_estado}`; borra la pre-asignación |
  | INSTALADO | `¿Completar instalación?` — "Para marcar como INSTALADO necesitamos registrar al cliente y su servicio. Serás redirigido al formulario correspondiente." (Continuar / Cancelar) | no cambia aún: ver SOP-023 |
- **Después de cada cambio (frontend):** `POST /respuestas-instalaciones` con `CAMBIO EL ESTADO DE LA INSTALACIÓN A <b><i>ESTADO</i></b>.` + ` Motivo: …` + ` Nueva fecha: …`; mensaje `Estado actualizado` (error `Error al actualizar estado`). (`EditInstalacion.vue:151-177`) ✅
- **Reglas de negocio (backend):**
  1. Notificaciones automáticas por cambio de estado: cliente en AGENDADA, EN_PROCESO, REPROGRAMADA, CANCELADA (y INSTALADO desde el alta del servicio); técnico en AGENDADA y EN_PROCESO; PENDIENTE no notifica (SOP-024). ✅
  2. El motivo no es obligatorio en el backend; la exigencia de 3 caracteres es solo del diálogo. ✅
  3. INSTALADO se fija **también** por el flujo de cliente (SOP-023) y desde el selector de la pestaña Formulario (SOP-016).
  4. Cancelar o eliminar no libera los equipos reservados ni devuelve el stock de los accesorios (solo se anula la pre-asignación) (`:705-708`, `832-845`). ✅
  5. "Tiempo" de reportes = `updated_at − created_at` de las INSTALADO (se desvirtúa si se edita después) (`:1306-1310`). ✅
  6. No hay SLA, vencimientos ni recordatorios automáticos.
- **Quién puede:** cualquier usuario con acceso a la pantalla de edición (`instalaciones.edit`) ve "Cambiar Estado"; para INSTALADO se exige `instalaciones.completar` (`No tienes permiso para completar instalaciones. El operador puede hacerlo.`). No se comprueba ser el técnico ni el creador.
- **Preguntas probables de usuarios:**
  1. "¿Cómo reprogramo?" → Cambiar Estado → REPROGRAMADA, con motivo y nueva fecha.
  2. "¿Puedo reactivar una cancelada?" → sí, a PENDIENTE.
  3. "¿Se puede deshacer INSTALADO?" → la pantalla no ofrece salida; hay que corregir por otras vías ❓.
  4. "¿Quién cambia el estado?" → cualquiera que pueda abrir la instalación.
  5. "¿Por qué no se notificó al cliente al pasar a Pendiente?" → no existe plantilla para PENDIENTE.
- **Pendiente de validar en UI:** ❓ aspecto de los diálogos; ❓ si CANCELADA→PENDIENTE restaura la pre-asignación (no: se perdió).

---

## SOP-018 · Reasignar técnico de una instalación
- **Ruta UI / name:** botón "Reasignar" junto al técnico en Detalles de `instalaciones.edit`. ✅
- **Archivos:** FE: `DetalleInstalacion.vue:27-34,211-228`, `DialogReasignarTecnico.vue`, `EditInstalacion.vue:232-253` · BE: `instalaciones.controller.ts:151-159`, `instalaciones.service.ts:756-830`, `dto/reasignar-tecnico.dto.ts`.
- **Para qué sirve:** cambiar el técnico dejando constancia (motivo, quién, cuándo) y avisar.
- **Acceso:** frontend: `instalaciones.edit` **y** (SUPER-ADMINISTRADOR o creador); oculto en INSTALADO/CANCELADA. Backend: SUPER-ADMINISTRADOR o el operador creador, con error 403 `Solo el operador que creó la instalación puede reasignar su técnico.` (no revisa `instalaciones.edit`) (`:766-773`). ✅
- **Diálogo "Reasignar técnico":** `Técnico actual` (solo lectura), **Técnico nuevo** (select; placeholder `Selecciona el técnico que se hará cargo`; excluye al actual; etiqueta `Nombre — ROL`), **Motivo** (textarea; `¿Por qué se reasigna el técnico? (mín. 3 caracteres)`; `Mínimo 3 caracteres`), aviso `Se notificará automáticamente al técnico nuevo con la plantilla configurada para el estado actual de la instalación.`; botones **Cancelar** / **Reasignar**. (`DialogReasignarTecnico.vue`)
- **Validaciones (DTO):** `El técnico nuevo es obligatorio.`, `El id de técnico debe ser un UUID válido.`, `El motivo de la reasignación es obligatorio.`, `El motivo debe tener al menos 3 caracteres.`; además `El técnico seleccionado no existe.` (`dto/reasignar-tecnico.dto.ts`, `:781-788`).
- **Reglas de negocio:**
  1. Si el técnico elegido ya es el actual: responde `El técnico seleccionado ya está asignado.` sin cambios (`:775-779`). ✅
  2. Agrega al `historial_reasignaciones` {fecha, técnico anterior (id/nombre), técnico nuevo (id/nombre), motivo, operador (id/nombre)} (append-only) y cambia `tecnico` (`:792-811`). ✅
  3. Notifica con `enviarNotificacionCambioEstado(fresca, estadoActual)`: es decir **envía las plantillas del estado actual tanto al cliente como al técnico**; el cliente vuelve a recibir su aviso (con el nombre del técnico nuevo) y el técnico solo si la plantilla de su estado existe (AGENDADA/EN_PROCESO) **y** el creador no apagó sus toggles (`notificacion.tecnico.*`, por omisión apagados) (`:813-819`, `:421-466`). ✅
  4. No cambia el `operador`.
- **Historial en pantalla:** desplegable `Historial de reasignaciones (n)` con línea de tiempo (`Anterior → Nuevo`, `Motivo:`, `Reasignado por:`), la más reciente primero. (`DetalleInstalacion.vue:313-348`)
- **Mensajes (texto exacto):** `Técnico reasignado correctamente` (FE; el BE devuelve `Técnico reasignado exitosamente`), error `Error al reasignar técnico`, `No se pudo cargar la lista de técnicos.`
- **Casos límite y advertencias:**
  - La promesa del diálogo ("se notificará al técnico nuevo") **no se cumple con los toggles por omisión**: al crear la instalación los toggles del técnico quedan en falso, por lo que el técnico nuevo no recibe nada, mientras que el cliente sí recibe el aviso por Email (toggle por omisión activo). ✅
  - En INSTALADO/CANCELADA el backend sí permite reasignar (solo la pantalla lo oculta).
- **Preguntas probables de usuarios:**
  1. "¿Por qué no puedo reasignar si tengo permiso de editar?" → solo el creador o SUPER-ADMINISTRADOR.
  2. "El técnico nuevo no recibió el aviso" → toggles del técnico apagados o sin plantilla para el estado.
  3. "¿El cliente se entera?" → recibe el mensaje del estado actual con el nombre del nuevo técnico.
  4. "¿Dónde queda el motivo?" → Historial de reasignaciones.
- **Pendiente de validar en UI:** ❓ texto exacto que recibe el cliente tras una reasignación en estado AGENDADA.

---

## SOP-019 · Checklist de instalación
- **Ruta UI / name:** (uso) tarjeta "Checklist de instalación" en Detalles de `instalaciones.edit`; (configuración) Ajustes → Plantillas → "Instalación" → pestaña "Checklist instalación". ✅
- **Archivos:** FE: `components/ChecklistInstalacion.vue`, `pages/dashboard/ajustes/instalacion/ChecklistConfig.vue`, `EditInstalacion.vue:82-104` · BE: `entities/instalacione.entity.ts:84-87` (`checklist_completado`), `settings/entities/setting.entity.ts:217-220` (`checklistInstalacion`), `instalaciones.service.ts:1087-1107`.
- **Para qué sirve:** lista de pasos configurable que el técnico va marcando antes de dar por terminada la instalación, con quién y cuándo.
- **Configuración (Ajustes):** título "✅ Checklist de Instalación", subtítulo "Configura los pasos que el técnico debe completar antes de marcar la instalación como INSTALADO."; cada ítem: flechas subir/bajar, texto (máx. 120, ej. 'Probó la señal con el cliente'), toggle `Obligatorio`/`Opcional` (obligatorio por omisión), icono "Eliminar item"; botones "Agregar item" y "Guardar Cambios" (no guarda si algún texto está vacío, sin aviso). Vacío: `Aún no hay items. Agrega uno con el botón de abajo.` (`ChecklistConfig.vue`)
- **Uso:** encabezado con chips `{n}/{total} completados` y `Obligatorios: {a}/{b}`; cada ítem con casilla; al marcar muestra `✓ {usuario} · DD/MM/YYYY HH:mm`; insignia `Obligatorio`. Sin checklist: `No hay checklist configurado. El administrador puede definirlo en Ajustes › Plantillas › Instalación › Checklist instalación.` Deshabilitado en INSTALADO y CANCELADA. (`ChecklistInstalacion.vue:94-157`)
- **Persistencia:** cada clic hace `PATCH /instalaciones/:id` con el arreglo completo `checklist_completado` [{item_id, completado, fecha, usuario_id, usuario}]; si falla se revierte y muestra `Error al guardar el checklist`. ✅
- **Reglas de negocio:**
  1. La obligatoriedad se exige **solo en el frontend**, al pulsar INSTALADO: diálogo `Checklist incompleto` — "No se puede finalizar la instalación. Faltan items obligatorios:" + lista, botón `Entendido`. Si la lectura de ajustes falla, no bloquea (`EditInstalacion.vue:82-104`). El backend no valida el checklist al crear el servicio. ✅
  2. Los ítems se identifican por `id` (UUID); borrar un ítem en Ajustes deja huérfana su marca histórica.
  3. La hoja impresa incluye la tabla ✓ / Item / Tipo (Obligatorio u Opcional) / Marcado por · fecha (`hoja-instalacion.hbs:322-350`). ✅
- **Casos límite y advertencias:**
  - Dos personas marcando a la vez pueden pisarse: cada una envía su arreglo completo.
  - Cualquier usuario que vea la instalación puede marcar; no se exige ser el técnico.
- **Preguntas probables de usuarios:**
  1. "¿Dónde configuro los pasos?" → Ajustes → Plantillas → Instalación → Checklist instalación.
  2. "No me deja finalizar" → faltan ítems obligatorios.
  3. "¿Quién marcó un ítem?" → se muestra el nombre y la hora.
  4. "¿Puedo desmarcar?" → sí, mientras no esté INSTALADO/CANCELADA.
- **Pendiente de validar en UI:** ❓ permiso necesario para ver/editar la pestaña de Ajustes (usa `variables.ver.plantilla.instalacion`, que no existe en el catálogo de permisos; ver SOP-031).

---

## SOP-020 · Respuestas de la instalación
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** sección "LISTADO DE RESPUESTAS" al final de la pestaña **Detalles** de `instalaciones.edit` (`FE:pages/dashboard/instalaciones/components/DetalleInstalacion.vue:351`). ✅
- **Archivos:** FE: `pages/dashboard/instalaciones/components/ListRespuestasInstalacion.vue`, `components/AgregarRespuestaInstalacion.vue`, `EditInstalacion.vue` (respuesta automática de estado, `:151-177`), `src/components/DragAndDropUploadImage.vue` · BE: `respuestas-instalaciones/respuestas-instalaciones.controller.ts`, `respuestas-instalaciones.service.ts`, `dto/create-respuesta-instalacion.dto.ts`, `entities/respuesta-instalacion.entity.ts`.
- **Para qué sirve:** hilo de comentarios internos de la instalación (cada uno con texto enriquecido y archivos) y, además, bitácora de los cambios de estado hechos desde el botón "Cambiar Estado" (SOP-017). Es la contraparte de SOP-005 en instalaciones, con menos funciones: **no avisa a nadie**.
- **Acceso:** sin permiso propio; cualquiera que pueda abrir la instalación (`instalaciones.edit`) puede responder. Editar y eliminar solo ve los iconos el **autor** (`claim.id === respuesta.usuario.id`) y **nunca** en las respuestas cuyo texto contiene `CAMBIO EL ESTADO DE LA INSTALACIÓN A` (`ListRespuestasInstalacion.vue:123-125, 175-178`). ✅
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Agregar Respuesta (cabecera de la lista, icono `format_list_bulleted_add`) | abre el diálogo | — | — | |
  | Agregar Respuesta / Editar Respuesta (dentro del diálogo) | guarda | — | `POST /respuestas-instalaciones` · `PATCH /respuestas-instalaciones/:id` | deshabilitado si el texto tiene menos de 3 caracteres (`AgregarRespuestaInstalacion.vue:148`) |
  | lápiz (tooltip `Editar respuesta`) | abre el diálogo con el texto y los adjuntos | autor (solo UI) | — | oculto en respuestas de cambio de estado |
  | papelera (tooltip `Eliminar respuesta`) | confirma y borra | autor (solo UI) | `DELETE /respuestas-instalaciones/:id` | borrado lógico |
- **Campos del diálogo (título `Agregar Respuesta` / `Editar Respuesta`):**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Respuesta: | editor enriquecido (alineación, negrita, cursiva, subrayado, imprimir, pantalla completa, listas, deshacer/rehacer, ver código) | Sí | mínimo 3 caracteres (FE); BE: texto no vacío | se guarda como HTML |
  | Adjuntar archivo(opcional): | arrastrar y soltar | No | cualquier tipo, máximo **7** archivos, **100 MB** cada uno (tamaño por omisión del componente, `DragAndDropUploadImage.vue:21-26`) | se suben a la carpeta `images-services` con `POST /files/upload-image/images-services`; los quitados al editar se borran del disco al guardar (`AgregarRespuestaInstalacion.vue:46-50`) |
  Diálogo previo: `¿Deseas agregar esta respuesta?` (botón **Agregar**) o `¿Deseas editar esta respuesta?` (botón **Editar**), con **Cancelar**. (`:19-24`)
- **Qué muestra cada respuesta:** foto del autor (o la imagen por omisión), nombre completo, texto, adjuntos en modo lectura y fecha `DD/MM/YYYY HH:mma`; la más reciente arriba (`respuestas-instalaciones.service.ts:24-30`). Sin respuestas: `No se encontró ninguna respuesta`. A diferencia de SOP-005, **no hay etiqueta de rol** (Soporte / Asignador / Apoyo / Tercero). ✅
- **Reglas de negocio:**
  1. El backend crea la respuesta con el usuario autenticado; el DTO exige `instalacion` (UUID), `respuesta` (texto) y admite `files` (arreglo de nombres) (`dto/create-respuesta-instalacion.dto.ts`). ✅
  2. **No hay avisos**: ni campana, ni WhatsApp, ni correo, ni websocket al crear una respuesta (el servicio solo guarda; el componente no llama a notificaciones). SOP-005 sí avisa al técnico/operador. ✅
  3. `PATCH` y `DELETE` no comprueban autoría ni estado de la instalación: la restricción "solo el autor" es solo de pantalla (`respuestas-instalaciones.service.ts:39-54`). `PATCH` con un id inexistente responde 400 `No se encontró la respuesta con el id <id>`; `DELETE` sin coincidencia, 404 `Respuesta con ID <id> no encontrada`. ✅
  4. Las respuestas `CAMBIO EL ESTADO DE LA INSTALACIÓN A <ESTADO>.` (+ ` Motivo: …` + ` Nueva fecha: …`) las crea **el frontend**, con un `POST` posterior al `PATCH` del estado, dentro del mismo `try` (`EditInstalacion.vue:158-166`). Si el `POST` falla, el estado ya cambió en el servidor pero la pantalla muestra `Error al actualizar estado` y no refresca. ✅
  5. **No dejan respuesta** los cambios de estado hechos desde la pestaña **Formulario Instalación** (SOP-016), la reasignación de técnico (queda en el "Historial de reasignaciones", SOP-018) ni el paso a INSTALADO por el alta del servicio (SOP-023): el backend de clientes no escribe respuestas (`grep` de `respuesta` en `BE:customers/customers.service.ts` sin coincidencias). ✅
- **Mensajes (texto exacto):** éxito `Respuesta agregada correctamente` / `Respuesta editada correctamente`; error `Fallo al guardar la respuesta` (o el mensaje del backend, `Fallo al guardar la respuesta.`); eliminar: `¿Deseas eliminar esta respuesta?` (**Eliminar** / **Cancelar**), `Respuesta eliminada`, `Fallo al eliminar la respuesta`. A diferencia de SOP-005, el aviso de éxito dice "Respuesta", no "Ticket". ✅
- **Efectos secundarios externos:** ninguno (solo archivos en disco).
- **Casos límite y advertencias:**
  - El texto se pinta con `v-html` y se guarda sin sanear (`ListRespuestasInstalacion.vue:156`), igual que en SOP-005. ✅
  - La respuesta de estado no se puede editar ni borrar desde la pantalla, pero sí por API (sin control de autoría). ✅
- **Preguntas probables de usuarios:**
  1. "¿Quién se entera cuando respondo?" → nadie recibe aviso; hay que abrir la instalación.
  2. "¿Por qué no puedo borrar el mensaje 'CAMBIO EL ESTADO…'?" → es el registro automático del cambio de estado.
  3. "¿Cuántos archivos puedo subir?" → 7 por respuesta, 100 MB cada uno.
  4. "Puse INSTALADO desde el formulario y no quedó registro" → ese camino no escribe respuesta.
  5. "¿Puedo corregir mi respuesta?" → sí, con el lápiz, si la escribió usted.
- **Pendiente de validar en UI:** ❓ aspecto del hilo en móvil (cabecera con fecha y botones); ❓ si se ven los adjuntos de imagen y los de otros tipos con vista previa.

---

## SOP-021 · Materiales de la instalación (productos y accesorios, stock, venta/comodato)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`. Comparte el motor de SOP-007 (`materiales/materiales.service.ts`) pero con reglas propias de instalación.
- **Ruta UI / name:** pestaña **Materiales** (icono `inventory_2`) de `instalaciones.edit` (`FE:pages/dashboard/instalaciones/EditInstalacion.vue:432, 453-609`). ✅
- **Archivos:** FE: `EditInstalacion.vue:255-377, 617-679`, `components/AgregarProductoModal.vue`, `components/AgregarAccesorioModal.vue` · BE: `instalaciones/instalaciones.controller.ts:179-223`, `instalaciones.service.ts:849-1064`, `dto/create-instalacion-equipo.dto.ts`, `entities/instalacion-equipo.entity.ts`, `materiales/materiales.service.ts`, `customers/customers.service.ts:990-1076` (`procesarEquiposVentaDeInstalacion`).
- **Para qué sirve:** registrar los equipos del inventario que se instalarán o entregaron (comodato o venta) y los accesorios gastados (cable, conectores…), descontándolos del almacén al instante.
- **Acceso:** pestaña visible para cualquiera que abra la instalación (ruta `instalaciones.edit`); los botones **no** comprueban permisos propios (`EditInstalacion.vue` no usa `validarPermisos` para materiales). El backend solo exige sesión. ✅
- **Tablas:** **Productos Instalados** (Tipo, Descripción, Nº Mac, Nº Serie, Condición, Acciones) y **Accesorios Utilizados** (Descripción, Cantidad, Acciones). Vacíos: `Ningún producto agregado.` / `Ningún accesorio agregado.` La condición se rotula `Libre`, `Préstamo/Comodato` o `Venta (Facturar)` (`:264-271`). Si la fila no tiene equipo (ver "placeholder") la descripción lleva la insignia `Sin equipo asignado` con el tooltip "Es solo una nota de planificación. El equipo real nunca se eligió del inventario." (`:498-516`).
- **Botones y acciones:**
  | Etiqueta | Qué hace | Endpoint | Restricciones/efectos |
  |---|---|---|---|
  | Agregar Producto | abre el modal **Productos** (recibe la ruta y el estado de la instalación) | `POST /instalaciones/:id/equipos` (`tipo: producto`) | reserva el equipo (`pendiente_asignacion`) |
  | Agregar Accesorio | abre el modal **Accesorios** | `POST /instalaciones/:id/equipos` (`tipo: accesorio`) | descuenta stock |
  | lápiz (tooltip `Editar`), solo accesorios | modal **Editar accesorio** | `PATCH /instalaciones/:id/equipos/:asignacionId` | ajusta stock por diferencia o por cambio de accesorio |
  | eslabón (tooltip `Asignar equipo del inventario`), solo filas sin equipo | diálogo **Vincular equipo del inventario** | `PATCH /instalaciones/:id/equipos/:asignacionId/vincular-equipo` | solo escribe `equipo_id`; no cambia estado ni genera cargos |
  | papelera (tooltip `Eliminar`) | confirma y quita | `DELETE /instalaciones/:id/equipos/:asignacionId` | devuelve stock / libera el equipo |
- **Modal "Productos"** (`AgregarProductoModal.vue`): **Categoría producto** (de `GET /categories`; `Seleccionar..`), **Producto** (equipos con `estado=disponible` de esa categoría, etiqueta `SN: … / Mac: … ($ costo)`), **Tipo de producto** (Antena, Router, Radio, Switch o texto libre; se guarda en `descripcion`), **Condición** (`Préstamo/Comodato` por omisión o `Venta (Facturar)`; "Libre" ya no se ofrece, `:41-44`), y solo en venta: **Precio de venta** (se precarga con el costo del equipo), **Forma de pago** (`Un solo pago`, `Mensualmente`, `Pago en 2 Cuotas` … `Pago en 12 Cuotas`) y **Tipo de factura** (`Factura de servicio` = `FACT. DE SERVICIO`, `Factura libre` = `FACT. LIBRE`). Botones **Cerrar** / **Agregar**. Validaciones: `Seleccione un producto`, `Ingresa un precio de venta mayor a 0`, `Selecciona la forma de pago`, `Selecciona el tipo de factura` (`:98-111`). Confirmación `¿Agregar equipo a la instalación?` (**Agregar** / **Cancelar**) con un texto según el estado (ver abajo).
- **Modal "Accesorios"** (`AgregarAccesorioModal.vue`; título `Accesorios` o `Editar accesorio`): **Categoría**, **Accesorio** (`nombre (Stock: n Uds|Mts)`), **Descripción** (se autocompleta con el nombre), **Cantidad (Unidades)** / **Cantidad (Metros)**. Validaciones: `Seleccione una categoría`, `Seleccione un accesorio`, `La cantidad debe ser al menos 1`, `Solo hay N Uds|Mts disponibles` (en edición cuenta la cantidad ya consumida). Éxito `Accesorio agregado` / `Accesorio actualizado`; botones **Cerrar** / **Agregar** o **Guardar cambios**. (`:113-153`)
- **Reglas de negocio (backend):**
  1. Alta de **producto** (`MaterialesService.asignar`, transacción): exige `equipo_id` (400 `equipo_id es requerido para tipo producto`), el equipo debe existir (404 `Equipo no encontrado`) y no estar ya `pendiente_asignacion` (400 `Este equipo ya está asignado a otra visita`); lo deja en `pendiente_asignacion` (`materiales.service.ts:99-105, 264-275`). **No** exige que el equipo esté `disponible`: la lista del modal solo ofrece disponibles, pero por API se podría reservar uno `no_disponible`. ✅
  2. Alta de **accesorio**: exige `accesorio_id` (400 `accesorio_id es requerido para tipo accesorio`) y descuenta con `UPDATE … WHERE cantidad >= n` atómico; si no alcanza, 400 `Stock insuficiente de "<nombre>". Disponible: a, solicitado: b` (`:108-113, 219-238`). ✅
  3. DTO: `tipo` obligatorio (`producto`/`accesorio`); `cantidad` entero ≥ 1 (por omisión 1); `condicion` ∈ `libre`/`prestamo_comodato`/`venta`; `precio_venta` numérico; `tipo_pago` y `tipo_factura` texto (`dto/create-instalacion-equipo.dto.ts`). Los campos de venta solo se guardan si `condicion = venta` (`materiales.service.ts:125-127`). ✅
  4. **Venta antes de completar:** el equipo queda solo reservado; se vincula al servicio y se crea el cargo cuando se da de alta el servicio de la instalación (SOP-023). **Venta con la instalación ya INSTALADO:** se vincula en el acto y se crea el cargo (`instalaciones.service.ts:866-884, 895-968`): `equipos.servicio_id`, `tipo_vinculacion='venta'`, `costo = precio`, `estado = no_disponible`, entrada de historial (`origen: 'instalacion'`), `servicios-clientes.equipo_id`, y un cargo recurrente "Factura" activo con el equipo como ítem (descripción `<CATEGORÍA> - SERIE <serie>` en mayúsculas, `tipo_pago` y `tipo_factura` elegidos; IVA = `equipo.impuesto`). Si el precio resulta ≤ 0, no hace nada (`:909-910`). ✅
  5. **Comodato (`Préstamo/Comodato`) nunca se vincula solo:** ni al completar (`procesarEquiposVentaDeInstalacion` filtra `condicion = venta`, `customers.service.ts:998-1005`) ni con la instalación ya INSTALADO (`asignarEquipo` solo actúa si `condicion === 'venta'`, `:866-884`). El equipo queda en **Pendiente Asignación** hasta que alguien lo vincule a mano desde Almacén › Equipos (**Vincular a servicio**). Los textos del modal dicen lo contrario ("se vinculará al servicio del cliente", éxito `Equipo vinculado al cliente`). ✅ (ver hallazgo)
  6. **Quitar** (`removeEquipo`, `:1020-1064`): accesorio → devuelve la cantidad al stock; producto sin servicio → `estado = disponible`; producto vinculado → borra (borrado lógico) el cargo de venta **si no tiene facturas**, pone `servicios-clientes.equipo_id = null`, y deja el equipo `disponible` con `servicio_id` y `tipo_vinculacion` en nulo. La fila se borra lógicamente (`materiales.service.ts:188-207`). ✅
  7. **Placeholder** (fila de producto sin `equipo_id`): el modal actual no las crea (exige equipo); existen por datos anteriores o porque la FK al equipo es `ON DELETE SET NULL` (`entities/instalacion-equipo.entity.ts:40-42`). `vincular-equipo` valida: 400 `equipo_id es requerido`, 404 `Asignación no encontrada`, 400 `Solo se puede vincular equipo a asignaciones de tipo producto`, 400 `Esta asignación ya tiene un equipo vinculado`, 404 `Equipo no encontrado`; éxito `Equipo vinculado al placeholder` (`:980-1018`). No reserva el equipo ni lo vincula al cliente. ✅
  8. En **Almacén › Equipos**, un equipo `Pendiente Asignación` muestra el ojo **Ver instalación asignada** (modal `Instalación Asignada`) vía `GET /equipos/instalacion/:id` (`BE:equipos/equipos.service.ts:159-175`). Desvincular un equipo de su servicio borra las asignaciones de producto de instalaciones (`:124-132`). ✅
  9. En la ficha del cliente › **Recursos** los equipos salen del vínculo con el servicio (origen `instalacion` si hubo asignación) y los **accesorios** de las instalaciones que originaron sus servicios (`customers.service.ts:854-988`). ✅
- **Textos de confirmación del modal "Productos" según el estado de la instalación** (`:113-126`): con la instalación **no** INSTALADO: venta → "El equipo se asignará a la instalación. Cuando se finalice la instalación (al crear el cliente), se vinculará y se generará el cargo de venta."; otra condición → "…se vinculará al servicio del cliente." Con INSTALADO: venta → "El cliente ya está instalado: el equipo se vinculará automáticamente al servicio y se generará el cargo de venta."; otra → "…se vinculará automáticamente al servicio." Éxitos: `Producto agregado a la instalación`, `Equipo vinculado y cargo generado`, `Equipo vinculado al cliente`; error `Error al agregar producto`. En tickets estos mismos textos aparecen aunque no apliquen (SOP-007).
- **Mensajes de la tabla (texto exacto):** diálogo `¿Eliminar <Producto|nombre del accesorio>?` (**Eliminar** / **Cancelar**) con: accesorio "Se devolverán N unidad(es) al stock."; producto con la instalación INSTALADO y venta "El equipo se desvinculará del servicio del cliente y, si su cargo de venta aún no ha sido facturado, se eliminará."; INSTALADO sin venta "El equipo se desvinculará del servicio del cliente y quedará disponible."; resto "Se removerá de la instalación y el equipo quedará disponible." Éxito `Asignación eliminada`; error `Error al eliminar`. (`:341-377`) El título de los productos siempre dice `¿Eliminar Producto?`: el código busca `row.categoria_id?.nombre`, que no existe en la asignación (la categoría cuelga de `equipo_id`). ✅
  Diálogo "Vincular equipo del inventario": banner "Este ítem se planificó como "<descripción|Producto>" pero no se eligió un equipo del inventario. Elegí el equipo real que terminó en el cliente para recuperar la trazabilidad."; campo **Equipo del inventario** (`Buscar por N° serie, MAC o categoría…`; sin datos `No hay equipos en el inventario`); botones **Cancelar** / **Vincular**; avisos `Elige un equipo del listado`, `Equipo vinculado al registro de la instalación`, `No se pudo cargar el listado de equipos`, `No se pudo vincular el equipo`. La lista trae **todos** los equipos, sin filtrar por estado (`:302-309`).
- **Casos límite y advertencias:**
  - Cancelar o eliminar una instalación **no** libera los equipos reservados ni devuelve el stock de accesorios (SOP-014, SOP-017): hay que quitarlos antes desde esta pestaña. ✅
  - Una venta con precio vacío o ≤ 0 se omite sin aviso al completar (`customers.service.ts:1017-1018`): el equipo queda `pendiente_asignacion` y sin cargo. ✅
  - Si el equipo vendido se agrega **después** de INSTALADO y el servicio de la instalación no existe (instalación pasada a INSTALADO por el selector del formulario, SOP-016), no hay servicio al que vincular: solo se reserva. ✅
  - Dos personas agregando el mismo accesorio a la vez: la resta es atómica; la segunda recibe `Stock insuficiente …` si ya no alcanza.
- **Preguntas probables de usuarios:**
  1. "Agregué un router en comodato y no aparece en el cliente" → el comodato no se vincula solo: vincular desde Equipos.
  2. "Marqué Venta y no veo el cobro" → se crea un cargo recurrente al dar de alta el servicio (o en el acto si ya está INSTALADO); revisar los cargos del servicio.
  3. "No aparece el equipo en la lista" → solo equipos `Disponible` de la categoría elegida.
  4. "¿Se descuenta el cable al agregarlo?" → sí, al instante; al quitarlo vuelve.
  5. "Cancelé la instalación y el equipo sigue reservado" → quitarlo en Materiales antes de cancelar.
  6. "¿Qué es 'Sin equipo asignado'?" → una nota de planificación antigua; vincule el equipo real con el eslabón.
- **Pendiente de validar en UI:** ❓ aspecto de la insignia y del diálogo de vínculo; ❓ si **Vincular a servicio** (Almacén) acepta un equipo en `Pendiente Asignación`; ❓ qué muestra la ficha del cliente › Recursos para un comodato nunca vinculado.

---

## SOP-022 · Pre-asignación técnica (borrador de plan/router/red/NAP/IP)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** tarjeta **Pre-asignación técnica** `(opcional)` dentro del formulario de la instalación (alta `/instalaciones/add` y pestaña **Formulario Instalación**), junto a **Notas (Opcional):** (`FE:pages/dashboard/instalaciones/components/FormInstalaciones.vue:378-381`). ✅
- **Archivos:** FE: `components/SeccionPreAsignacion.vue`, `composables/useInstalaciones.js:22`, `clientes/AddCliente.vue:49-75`, `clientes/components/editar/ServiciosPage.vue:133-174`, `clientes/components/ServicioInternet.vue:1000-1032` · BE: `instalaciones/dto/create-instalacione.dto.ts:64-82`, `entities/instalacione.entity.ts:89-110` (`pre_asignacion` jsonb), `instalaciones.service.ts:705-708`, `customers/customers.service.ts:824-845` (`construirPreAsignacionDesdeServicio`).
- **Para qué sirve:** dejar anotado, al agendar la visita, con qué router, plan, red, caja, puerto e IP se piensa instalar, para que el formulario del servicio aparezca prellenado cuando se complete la instalación (SOP-023). **No reserva nada**: la IP, el puerto y el plan solo se ocupan al guardar el servicio (comentario del código en `entities/instalacione.entity.ts:89-93`). ✅
- **Acceso:** el mismo del formulario (`instalaciones.add`; pestaña Formulario solo creador/SUPER-ADMINISTRADOR, SOP-016). Sin permiso propio.
- **Campos (aparecen al activar el interruptor):**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Pre-asignar recursos / No pre-asignar (interruptor) | toggle | — | apagado ⇒ `pre_asignacion = null` | texto de ayuda cuando está apagado: "Activa el toggle si quieres pre-asignar plan, router, red, caja NAP, puerto e IP antes de la visita técnica. Los recursos se liberan automáticamente si se cancela la instalación." |
  | Router * | select (routers del usuario) | marcado con `*` pero **no se valida** | `Selecciona un router` | al cambiarlo se vacían todos los demás campos y se recargan los catálogos de ese router |
  | Plan Internet | select | No | planes activos del router, `nombre (símbolo precio)`; `Sin planes para este router`; aviso `Este router no tiene planes de internet configurados` | al elegirlo se copia el precio al campo Precio |
  | Red / Sub-red (IPv4) | select | No | `X.X.X.0 (N Ips disponibles) NOMBRE`; `Sin redes` | las redes con prefijo ≤ /24 se parten en subredes /24; /25–/32 van enteras |
  | IP sugerida | select editable | No | IPs libres de la subred (excluye .0, gateway y broadcast, y las ya usadas por servicios del router); acepta escribir una IP | `Sin IPs libres en esta sub-red`; elige la primera libre por omisión |
  | Caja NAP | select | No | cajas del router; `Sin cajas` | |
  | Puerto NAP | select | No | `Puerto N`, solo puertos libres; `Sin puertos libres` | |
  | Precio | número | No | mínimo 0, paso 0,01; `Se autocompleta al elegir plan` | |
  | Asignar dirección IPv6 (casilla) | checkbox | — | requiere router | `(Primero elige router)` |
  | Pool IPv6 / Sub-red IPv6 / IPv6 | selects | No | pools activos del router (rótulo: `red/máscara`, barra vertical y nombre); casilla con tooltip "Guardar como sub-red /n en vez de una IP /128" (si está marcada, no se pide la IPv6) | `Sin pools IPv6 para este router`, `Sin sub-redes`, `Sin IPv6 disponibles` |
  Texto de ayuda de la tarjeta: "Estos datos pre-llenan el formulario de servicio cuando la instalación se complete. Elige primero el router — los demás campos se filtran según ese router." (`SeccionPreAsignacion.vue:465-470`)
- **Reglas de negocio:**
  1. El frontend manda `pre_asignacion` dentro del `POST`/`PATCH` de la instalación; el backend la guarda tal cual (JSON), sin validar sus campos ni que existan el router, el plan o la IP (`create-instalacione.dto.ts:64-82` solo declara el tipo; `@IsOptional`). ✅
  2. Pasar la instalación a **CANCELADA** por `PATCH` la pone en `null` (`instalaciones.service.ts:705-708`); la tarjeta pasa a solo lectura con el aviso "La instalación está cancelada. Los recursos pre-asignados fueron liberados; esta sección queda en solo lectura." Reactivar la instalación (CANCELADA → PENDIENTE) no la restaura. ✅
  3. Al completar la instalación (SOP-023) el backend **sobrescribe** `pre_asignacion` con los valores reales del servicio creado (router, plan, red, caja, puerto, IP, tipo de conexión, precio, IPv6) y la tarjeta queda en solo lectura: "La instalación ya está finalizada. Los datos reflejan los recursos realmente usados al crear el servicio y no se pueden modificar." (`customers.service.ts:402-410, 614-622, 824-845`; `SeccionPreAsignacion.vue:14-24`). ✅
  4. **No hay control de duplicados**: dos instalaciones pueden pre-asignar la misma IP o el mismo puerto; el filtro solo descarta IPs y puertos de servicios ya creados (`/customers/get-ips/<router>`, `SeccionPreAsignacion.vue:90-101`). Si la IP se ocupa antes de completar, el alta del servicio la valida como cualquier otra. ✅
  5. Al abrir el alta de cliente desde la instalación se aplica en cascada (router → plan → red → caja → puerto → IP → precio → IPv6) y el operador puede cambiar cualquier valor (`AddCliente.vue:49-75`, `ServicioInternet.vue:1000-1032`). ✅
- **Casos límite y advertencias:**
  - Con el interruptor encendido y sin router, se guarda un borrador con todo en `null`.
  - `precio` se envía como texto porque el DTO del servicio exige texto numérico (`@IsNumberString`, comentario en `SeccionPreAsignacion.vue:362-367`), mientras que la entidad lo declara numérico.
  - La red se guarda como `id|índice` de subred; al reabrir una pre-asignación guardada por el flujo de completar (solo `id`) se infiere la subred por la IP (`normalizarRedIdSiNecesario`, `:369-388`).
- **Preguntas probables de usuarios:**
  1. "¿Pre-asignar bloquea la IP?" → no; solo la prellena.
  2. "¿Por qué mis campos se borraron al cambiar de router?" → todos dependen del router.
  3. "Cancelé y reactivé la instalación y perdí la pre-asignación" → se borra al cancelar y no se restaura.
  4. "¿Dónde veo lo que finalmente se usó?" → en la misma tarjeta, ya en solo lectura, después de INSTALADO.
- **Pendiente de validar en UI:** ❓ cómo se ve la tarjeta con muchas redes; ❓ si el selector de red conserva la subred correcta al reabrir.

---

## SOP-023 · Completar instalación: alta de cliente/servicio y qué se transfiere
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14` y cerrada en la ronda de cierre (2026-10-25). Alcance: lo que cambia por llegar desde una instalación; los campos de los formularios de cliente y de servicio están en CLI-008 a CLI-011 (alta de cliente), SRV-002 (servicio nuevo en un cliente existente) y CLI-012/SRV-006 (bienvenida), todos con estado completo.
- **Ruta UI / name:** **Cambiar Estado → INSTALADO** en Detalles de `instalaciones.edit` → `/clientes/add?instalacion_id=…` (`crear.cliente`) si la cédula no es cliente, o la ficha del cliente `cliente.edit` con `?instalacion_id=…&view=servicios` si ya lo es. ✅
- **Archivos:** FE: `instalaciones/EditInstalacion.vue:72-130, 179-189`, `clientes/AddCliente.vue:12-76`, `clientes/composables/useCliente.js:570-624`, `clientes/components/editar/ServiciosPage.vue:133-174`, `clientes/composables/useServicios.js:62-110` · BE: `customers/dto/create-servicio.dto.ts:241-247`, `customers/customers.service.ts:158-176, 261-531, 546-721, 744-845, 990-1076`.
- **Para qué sirve:** convertir la instalación en un cliente con servicio activo. El estado INSTALADO no se fija a mano: lo fija el backend al guardar el servicio.
- **Acceso:** `instalaciones.completar` (catálogo: "Completar (crea cliente/servicio)") más los permisos de la pantalla de clientes. Sin él: `No tienes permiso para completar instalaciones. El operador puede hacerlo.` (`EditInstalacion.vue:73-75`). Solo frontend. ✅
- **Pasos previos en la pantalla** (`:72-130`), en este orden:
  1. Diálogo `¿Completar instalación?` — "Para marcar como INSTALADO necesitamos registrar al cliente y su servicio. Serás redirigido al formulario correspondiente." (**Continuar** / **Cancelar**).
  2. Permiso `instalaciones.completar` (aviso arriba).
  3. Cédula obligatoria: `La instalación no tiene cédula registrada para buscar/crear el cliente.`
  4. **Checklist** obligatorio: si faltan ítems obligatorios, diálogo `Checklist incompleto` — "No se puede finalizar la instalación. Faltan items obligatorios:" + lista (**Entendido**). Si falla la lectura de `/settings`, no bloquea. (SOP-019)
  5. `GET /customers/find-customer/<cédula>`: si hay un cliente, va a su ficha; si no, al alta. La búsqueda es parcial (`numero_documento LIKE %cédula%`, devuelve el primero), por lo que una cédula puede coincidir con otro documento que la contenga y llevar al cliente equivocado (`customers.service.ts:1931-1960`). ✅
- **Qué se prellena:**
  | Destino | Origen en la instalación | Cita |
  |---|---|---|
  | Cliente: nombres, número de documento, celular, email, dirección | `nombre_cliente`, `numero_cedula`, `telefono`, `correo`, `direccion` | `AddCliente.vue:30-34` |
  | Tipo de documento | por la longitud del número: 10 dígitos ⇒ Cédula (`05`), 13 ⇒ RUC (`04`), otra ⇒ Pasaporte (`06`) | `:36-43` |
  | Servicio: dirección y coordenadas | `direccion`, `ubicacion` | `:45-47` |
  | Servicio: router, plan, red, caja, puerto, IP, tipo de conexión, precio, IPv6 | `pre_asignacion` (SOP-022) | `:49-75` |
  No se copian la fecha de instalación, las notas, los archivos, el técnico ni el checklist; en el flujo de cliente existente tampoco el correo ni el teléfono (la ficha ya los tiene).
- **Qué hace el backend al guardar** (`POST /customers` o `POST /customers/agregar-servicio`, con `instalacion_id` en el servicio):
  1. Dentro de la **misma transacción** del alta: pone la instalación en `INSTALADO`, reescribe su `pre_asignacion` con los valores reales y procesa los productos en **venta** (vincula el equipo al servicio, crea el cargo recurrente; SOP-021) (`customers.service.ts:402-417, 614-629`). ✅
  2. El resto del alta es el normal: contrato nuevo, factura/pagos iniciales y alta en el MikroTik (PPPoE/colas/address-list) salvo carga por Excel (`:453-486, 647-677`). Si el MikroTik falla, la transacción se revierte y la instalación **no** queda INSTALADO (`:520-530`). ✅
  3. Tras confirmar, envía en segundo plano el aviso **INSTALADO** al cliente si la plantilla está activa (SOP-024) (`:505-517, 695-707`). ✅
  4. `instalacion_id` se valida solo como UUID: `No se encontró la instalación <valor>, por favor verificar si ya existe.` se emite únicamente cuando el valor no es un UUID válido (`create-servicio.dto.ts:243-246`). El backend **no** verifica que la instalación exista, no esté cancelada ni ya esté INSTALADO: el botón solo se oculta en la pantalla. ✅
  5. Límite de la suscripción: si ya se alcanzó el máximo de clientes, 400 `Tu suscripción permite un máximo de N clientes y actualmente tienes M. Contacta a ventas para ampliar tu plan.` (`:158-176, 261, 548`). ✅
- **Diferencia entre los dos caminos de prellenado** ✅: en el **alta de cliente nuevo** (`AddCliente.vue`) los valores de `pre_asignacion` se copian al formulario tal cual, sin comprobar si la IP, la caja o el puerto siguen libres (FE:clientes/AddCliente.vue:24-73); si falla la lectura de la instalación el operador completa a mano (`catch` vacío, `:73`). Al guardar sale el diálogo `¿Deseas agregar este cliente?` (**Guardar** / **Cancelar**) (FE:clientes/composables/useCliente.js:562-566). En **cliente existente** (`ServiciosPage` abre el modal "Nuevo Servicio" solo con `?instalacion_id=`) se llama `GET /instalaciones/:id` y se aplica `aplicarPreasignacion`, que **sí** comprueba disponibilidad: si la IPv4 ya no está en el listado de la red queda el campo vacío (`(campo vacío — elige otra del listado)`), si el puerto NAP ya no está libre queda `(elige otro libre)`, y se muestra el diálogo `Recursos pre-asignados no disponibles` — "Algunos recursos reservados en la instalación ya están en uso por otro servicio:" + lista `{recurso}: pre-asignado {valor} ya en uso. Asignado: {valor}` + "Se eligieron alternativas disponibles. Verifica antes de guardar." (**Entendido**) (FE:clientes/components/editar/ServiciosPage.vue:133-174; FE:clientes/components/ServicioInternet.vue:902-962). Si falla la lectura de la instalación se abre el modal vacío con solo el `instalacion_id` (`ServiciosPage.vue:170-172`).
- **Errores al guardar** ✅: cualquier fallo revierte la transacción (`revertirTransaccion`) y la instalación sigue como estaba. Un error del MikroTik se devuelve como arreglo `['Error al agregar cliente a mikrotik', <detalle del router>]` (BE:customers/customers.service.ts:520-529 para el alta; `:714-720` para el servicio), y el panel lo muestra en un aviso `warning` con una lista de dos viñetas (FE:composables/useHelpers.js:69-92; FE:clientes/composables/useCliente.js:629-630; FE:clientes/composables/useServicios.js:107-110). Errores de base de datos pasan por `handleDBExceptions` (p. ej. documento duplicado, ver CLI-011). Además, en el alta de cliente nuevo, si el documento no existe pero el nombre coincide con otro cliente, el alta crea un homónimo (CLI-011, regla 6).
- **Después del alta (frontend):** cliente nuevo → `Cliente agregado exitosamente`; si el ajuste de bienvenida está activo (`sendWelcomeMessage.activo`) se llama a `POST /customers/message-welcome`; luego vuelve a `instalaciones.edit` de la instalación (`useCliente.js:596-624`). Servicio a cliente existente → aviso con el texto del backend (`Servicio agregado exitosamente`) y vuelve a la instalación (`useServicios.js:62-110`). Errores: aviso `warning` con el mensaje del backend (`No se logro agregar el servicio` si no hay mensaje). El **mensaje de bienvenida** solo se envía en el alta de cliente nuevo; el de INSTALADO, en ambos caminos. Un cliente nuevo puede recibir los dos. ✅
- **Casos límite y advertencias:**
  - Los comodatos **no** se vinculan (SOP-021, regla 5) y los accesorios quedan asociados a la instalación (aparecen en Recursos del cliente por el vínculo `servicios-clientes.instalacion_id`).
  - Si el operador sale del formulario sin guardar, la instalación sigue como estaba; no hay estado intermedio.
  - El backend de clientes solo toca la instalación al crear el servicio (`customers.service.ts:402-417, 614-629`): dar de baja o retirar después ese servicio no cambia el estado de la instalación (sigue INSTALADO).
  - Completar no escribe una respuesta en el hilo (SOP-020, regla 5).
- **Mensajes (texto exacto):** los de "Pasos previos"; `Cliente agregado exitosamente`; `Servicio agregado exitosamente`; `Error al agregar cliente a mikrotik` (BE, con el detalle del router).
- **Preguntas probables de usuarios:**
  1. "No me deja marcar INSTALADO" → falta `instalaciones.completar`, la cédula o ítems obligatorios del checklist.
  2. "¿Por qué me llevó a otro cliente?" → la búsqueda por cédula es parcial; verificar el documento en la ficha.
  3. "El cliente ya existe, ¿se duplica?" → no; se abre su ficha con el modal de servicio nuevo.
  4. "El cliente recibió dos mensajes" → bienvenida (cliente nuevo) más el aviso INSTALADO.
  5. "Dio error del MikroTik y la instalación sigue pendiente" → la transacción se revierte.
  6. "¿Dónde quedó el router que le dejé en comodato?" → hay que vincularlo desde Equipos.
- **Pendiente de validar en UI:** ❓ aspecto del formulario de cliente prellenado y del modal de servicio. Resueltos con el código: con una IP distinta de la sugerida el backend reescribe `pre_asignacion` con los valores reales del servicio (`router_id`, `plan_id`, `red_id`, `caja_id`, `puerto_id`, `ip_sugerida = ipv4`, `tipo_conexion`, `precio`, `asignar_ipv6`, `ipv6`, `ipv6_subneting`) ✅ BE:customers/customers.service.ts:824-845; si el MikroTik no responde el operador ve el aviso de dos viñetas descrito arriba y la instalación no cambia.

---

## SOP-024 · Notificaciones de instalación (por estado, reenvío manual, plantillas)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14` y cerrada en la ronda de cierre (2026-10-25). Las plantillas y variables se editan en MSG-013 y el control de WhatsApp Oficial es MSG-014. `Límite de lectura:` el gateway de WhatsApp no oficial (`HOST_API_WHATSAPP`, variable `VITE_API_WHATSAPP`/`API_WHATSAPP` en el aviso INSTALADO), Meta Cloud API y el servidor SMTP no están en el ZIP; solo se conocen las rutas y campos que ISPMAX les manda (`GET /api/whatsapp/session/:id/info`, `GET /api/whatsapp/check-number`, `POST /api/whatsapp/send` con `sessionId`, `number`, `message`).
- **Ruta UI / name:** (envío manual) icono de enviar `Enviar Notificación` en cada fila de `/instalaciones` → diálogo **Enviar Notificación de Instalación**; (automático) sin pantalla; (configuración) Ajustes → Plantillas → **Instalación** → **Notificaciones por estado** (MSG-013). ✅
- **Archivos:** FE: `components/NotificacionInstalacionModal.vue`, `Indexpage.vue:478-490`, `components/FormInstalaciones.vue:383-398`, `composables/useInstalaciones.js:16-19` · BE: `instalaciones/instalaciones.service.ts:62-86, 88-134, 136-300, 313-472, 474-595, 700-745, 756-830`, `instalaciones/defaults/notif-templates.ts`, `customers/customers.service.ts:744-822`, `settings/settings.service.ts:36-53`.
- **Para qué sirve:** avisar al cliente y al técnico por WhatsApp y/o correo cuando la instalación se agenda, cambia de estado, se reasigna o se completa; y permitir reenviar el aviso a mano.
- **Acceso:** botón manual con `instalaciones.notificar` (solo frontend). Los avisos automáticos no dependen de permisos. ✅
- **Cuándo se envía solo** (al crear la instalación y al completarla el envío va en segundo plano; en el cambio de estado y en la reasignación el backend espera a que terminen los envíos antes de responder, de modo que la pantalla puede tardar; en todos los casos los errores se capturan y nunca impiden la operación):
  | Momento | Plantilla (estado) | Cliente | Técnico | Cita |
  |---|---|---|---|---|
  | Crear la instalación (si hay algún interruptor activo) | **AGENDADA**, aunque nazca PENDIENTE o EN PROCESO | por los canales marcados en "Notificar al cliente por:" | por los marcados en "Notificar al técnico por:" | `instalaciones.service.ts:71-79, 170` |
  | `PATCH` que cambia el estado a uno distinto (menos INSTALADO) | la del estado nuevo | AGENDADA, EN_PROCESO, REPROGRAMADA, CANCELADA | AGENDADA y EN_PROCESO | `:722-738` |
  | Reasignar técnico | la del estado actual | sí (con el nombre del técnico nuevo) | el técnico nuevo, si hay plantilla de ese estado | `:813-819` |
  | Alta del servicio de la instalación (SOP-023) | **INSTALADO** | sí | no | `customers.service.ts:505-517, 744-822` |
  PENDIENTE no tiene plantilla. El técnico nunca recibe REPROGRAMADA, CANCELADA ni INSTALADO. ✅
- **Reglas de envío automático** (`enviarNotificacionCambioEstado`, `:313-472`):
  1. Sale en silencio si no hay plantilla **activa** con contenido para ese estado (`:333-336`).
  2. Respeta los interruptores guardados en la instalación (`notificacion.cliente|tecnico.whatsApp|email`): se envía salvo que el valor sea exactamente `false`. Como el alta ofrece por omisión **Email del cliente activado y todo lo demás apagado** (`useInstalaciones.js:16-19`), los cambios de estado posteriores llegan al cliente **solo por correo** y al técnico por nada, salvo que se hayan marcado al crear o se editen en el formulario. Si la instalación no tiene ese dato (columna vacía), se envía por todo canal disponible. ✅
  3. Destinos: teléfono y correo **de la instalación** para el cliente; celular y correo del **usuario técnico** para el técnico.
  4. Variables disponibles en el texto (`{variable}`, sin distinguir mayúsculas ni espacios internos): `cliente`, `tecnico` (`—` si no hay), `fecha_instalacion` (texto tal como se escribió), `direccion`, `telefono`, `correo`, `empresa`, `motivo` (el del cambio o `motivo_estado`), `ubicacion` (enlace `https://maps.google.com/maps?q=<coordenadas>`), y solo en INSTALADO `plan`, `precio`, `ipv4`, `ssid_wifi`, `password_wifi` (`:354-370`). La pantalla de ajustes solo anuncia las que tienen sentido por estado, pero el backend rellena todas. ✅
  5. Asunto del correo: el de la plantilla, o `Actualización de instalación - <empresa>` (cliente) / `Asignación de instalación - <empresa>` (técnico) (`:402-404, 450-452`).
  6. WhatsApp: si la empresa tiene el canal **oficial** activo, envía la plantilla aprobada de tipo `instalacion_<cliente|tecnico>_<estado en minúsculas>` (MSG-014) y **no** usa Baileys; si no, Baileys con las comprobaciones `WhatsApp desvinculado` y `Número no usa WhatsApp` (`:496-567`). ✅
  7. Cada envío (menos el aviso INSTALADO) queda en **Mensajería › Mensajes Masivos › Mensajes enviados** con origen `instalacion`, canal, proveedor (`baileys`/`cloud_api`), destino y texto (nulo si falló) (`:574-595`, MSG-022). No se guarda `customer_id`. ✅
  8. Si falla un envío y hay usuario que ejecutó la acción, le llega una notificación de campana: `Falla al enviar Email`, `WhatsApp Desvinculado` o `Error en WhatsApp` con el motivo, y se empuja por websocket (`:480-491, 552-562`). ✅
  9. **El aviso INSTALADO es un camino aparte** (`notificarInstaladoLocal`): siempre por Baileys (nunca por canal oficial), sin comprobar si la sesión está vinculada ni si el número usa WhatsApp, sin registro en "Mensajes enviados" y sin notificación de campana si falla (solo `console.error`); usa otra variable de entorno para la dirección del gateway que el resto del módulo, y deja solo los dígitos del teléfono sin aplicar `convertirFormatoTelefono` (el resto del módulo sí lo aplica y agrega el código de país a los números locales), así que un teléfono guardado en formato local (`0…`) saldría sin código de país ❓. Solo corre si la plantilla INSTALADO del cliente está activa y el interruptor no es `false` (`customers.service.ts:757-818`, teléfono en `:790`). ✅
- **Reenvío manual** (diálogo **Enviar Notificación de Instalación**, `POST /instalaciones/notification`):
  | Campo | Tipo | Obligatorio | Valores / validación |
  |---|---|---|---|
  | Notificar a: | select | Sí | `Cliente` · `Técnico asignado` (al cambiarlo se llenan el celular y el correo de esa persona) |
  | Enviar por: | select | Sí | `WhatsApp` · `Email` · `Ambas` |
  | Celular: | teléfono con país | Sí si WhatsApp/Ambas | validación del componente; `Debes completar este campo` |
  | Email: | correo | Sí si Email/Ambas | `Ingresa un email valido` (solo si tiene más de 5 caracteres y es un canal elegido); `Debes completar este campo` |
  Botón **Enviar**. Éxito `Notificación enviada`; cualquier error: aviso `warning` con el mensaje del backend o `Fallo al enviar la notificación` (`NotificacionInstalacionModal.vue:56-78`). El diálogo se cierra siempre. ✅
  - Usa la plantilla del **estado actual** de la instalación (en INSTALADO completa `plan`, `precio`, `ipv4`, `ssid_wifi` y `password_wifi` desde el servicio ligado) y los datos escritos en el diálogo (`:165-188`).
  - Si no se envía por ningún canal, el backend responde 400 con la razón (`:115-122, 193-206`): `La plantilla del CLIENTE para el estado "<ESTADO>" no está activada en Ajustes › Notificaciones por estado.`; `…está activa pero vacía. Configúrala en Ajustes.`; `La plantilla del TÉCNICO para el estado "<ESTADO>" no está configurada (solo hay plantillas para AGENDADA y EN_PROCESO).`; o `No se pudo enviar la notificación. Verifica que la plantilla para el estado "<ESTADO>" esté activa en Ajustes › Notificaciones por estado.` Esa ruta de menú no existe con ese nombre: la pantalla está en Ajustes › Plantillas › Instalación › Notificaciones por estado. ✅
  - Éxito del backend: `Notificación enviada (WhatsApp Cliente, Email Cliente).` (no se muestra: el frontend pinta su propio texto). Otros errores: `Fallo al enviar la notificación de instalación.`
  - El reenvío usa el correo escrito en el diálogo también para el técnico, y el celular escrito como destino del técnico (`:257, 279`).
- **Valores por omisión de las plantillas** (empresas nuevas y migraciones): las cinco del cliente y las dos del técnico llegan **activas** y rellenas, en HTML (`notif-templates.ts:45-196`); la de cliente EN_PROCESO promete "Llegará en aproximadamente 30 minutos." como texto fijo; la de INSTALADO imprime la clave del Wi-Fi (`{password_wifi}`) en el mensaje. Textos y asuntos exactos ✅ (BE:instalaciones/defaults/notif-templates.ts):
  | Destinatario / estado | Asunto del correo | WhatsApp (resumen del texto) |
  |---|---|---|
  | Cliente · AGENDADA (`:46-68`) | `Instalación confirmada - {empresa}` | "Hola *{cliente}* 👋, Tu instalación de internet con *{empresa}* está confirmada para:" fecha, técnico y dirección; "Te enviaremos otro aviso cuando el técnico esté en camino." y "Si necesitas reagendar, contáctanos." |
  | Cliente · EN_PROCESO (`:69-83`) | `Técnico en camino - {empresa}` | "Nuestro técnico *{tecnico}* está en camino a tu domicilio. Llegará en aproximadamente 30 minutos." (el correo no lleva el plazo) |
  | Cliente · INSTALADO (`:84-110`) | `¡Bienvenido a {empresa}! Tu internet está listo` | "¡Tu internet ya está listo! 🎉" con Plan, SSID Wi-Fi, Clave, Mensualidad (`${precio}`) y Dirección IP; cierra "¡Bienvenido a *{empresa}*!" |
  | Cliente · REPROGRAMADA (`:111-128`) | `Instalación reagendada - {empresa}` | "Lamentamos informarte que tu instalación se reagendó:" nueva fecha y motivo |
  | Cliente · CANCELADA (`:129-145`) | `Instalación cancelada - {empresa}` | "Tu instalación fue cancelada:" motivo; "Si quieres revisar alternativas, contáctanos." |
  | Técnico · AGENDADA (`:149-174`) | `Nueva instalación agendada - {cliente}` | "🔧 *Nueva instalación agendada*" con cliente, fecha, dirección, ubicación (enlace) y teléfono del cliente; "Revisa los detalles en el sistema." |
  | Técnico · EN_PROCESO (`:175-195`) | `Instalación iniciada - {cliente}` | "🔧 *Instalación en proceso*" con cliente, fecha, dirección y ubicación; "¡A trabajar!" |
  En el cuerpo del correo del técnico la ubicación es el enlace "Abrir en Google Maps". Las plantillas del cliente usan `{motivo}`, `{plan}`, `{precio}`, `{ipv4}`, `{ssid_wifi}` y `{password_wifi}` solo en los estados donde tienen valor.
- **Relaciones con otros módulos:** Mensajería (MSG-013, MSG-014, MSG-017, MSG-022), Clientes (SOP-023), Usuarios (celular/correo del técnico).
- **Casos límite y advertencias:**
  - Cliente sin teléfono o sin correo: el canal se omite sin aviso. El formulario exige correo, pero acepta cualquier texto.
  - Cambiar el estado desde la pestaña **Formulario** también dispara el aviso (es el mismo `PATCH`), pero el INSTALADO puesto así no (SOP-016).
  - Crear la instalación como EN PROCESO manda el mensaje "Instalación confirmada" (plantilla AGENDADA).
  - En el envío oficial, las variables que la plantilla de Meta no declare no viajan; el control de aprobación está en MSG-014.
- **Preguntas probables de usuarios:**
  1. "El cliente no recibió el aviso de 'Reprogramada'" → plantilla desactivada o vacía, canal apagado al crear la instalación, o cliente sin correo.
  2. "¿Por qué al técnico nuevo no le llegó nada tras reasignar?" → sus interruptores están apagados o no hay plantilla de ese estado.
  3. "¿Se manda el aviso al marcar INSTALADO desde el formulario?" → no; solo al completar con el alta del servicio.
  4. "¿Dónde veo lo que se envió?" → Mensajes enviados, origen Instalación (excepto el aviso INSTALADO).
  5. "El mensaje dice 30 minutos y tardamos más" → es texto fijo de la plantilla por omisión; editarlo en Ajustes.
  6. "Me sale 'Ajustes › Notificaciones por estado'" → es Ajustes › Plantillas › Instalación.
- **Canal oficial en instalaciones** ✅: `sendMsgWhatsApp` usa `esCanalOficial(empresa)` **sin** override manual (el reenvío manual de instalaciones no deja elegir canal, a diferencia del de tickets); si el oficial está activo (y no se alcanzó el tope diario con overflow) llama `enviarPlantillaPorTipo` con el tipo `instalacion_{cliente|tecnico}_{estado en minúsculas}` y devuelve `waProvider: 'cloud_api'`; un fallo (plantilla inexistente o no aprobada, variable vacía) se devuelve como `ok:false` con el mensaje y **no** crea campana (la campana solo existe en la vía Baileys) (BE:instalaciones/instalaciones.service.ts:496-567; BE:cloud-api/cloud-api.service.ts:372-386,1419-1520). Los mensajes de esa vía son los de SOP-010 (`No hay plantilla de WhatsApp Oficial para "instalacion_cliente_agendada". Créala y envíala a aprobar.`, `La plantilla "…" no está aprobada (estado: …).`, `El cliente tiene datos incompletos: la(s) variable(s) … llegó vacía. Meta rechaza plantillas con parámetros vacíos.`). Como `variables` lleva `precio`, `ipv4`, `ssid_wifi`, etc. vacíos fuera de INSTALADO, una plantilla oficial de otro estado que los use fallaría por variable vacía.
- **Aviso INSTALADO con empresa solo oficial** ✅ (resuelve el ❓ anterior): `notificarInstaladoLocal` nunca usa el canal oficial; envía por el gateway no oficial solo `if (sessionWhatsApp)` (campo `numero_whatsApp` de la empresa) y, si no hay sesión guardada, omite el WhatsApp sin aviso ni registro; el correo sí sale siempre que haya plantilla de correo, `inst.correo` y el interruptor no sea `false`, vía `EmailService.sendMessage` (sujeto al interruptor global de correo; si está apagado el `catch` solo lo manda a consola) (BE:customers/customers.service.ts:744-822). Es decir, una empresa que opera solo con WhatsApp Oficial no recibe el WhatsApp del aviso INSTALADO.
- **Pendiente de validar en UI:** ❓ el formato con el que el control `vue3-q-tel-input` guarda el teléfono de la instalación (con o sin prefijo de país): el aviso INSTALADO manda solo los dígitos tal como se guardaron (BE:customers/customers.service.ts:790), mientras los demás avisos aplican `convertirFormatoTelefono` (BE:pagos/helpers/facturacion-utils.ts:421-450); ❓ qué responde el gateway no oficial a los envíos (ver `Límite de lectura`). Resueltos con el código: el texto exacto de las plantillas por omisión, y el comportamiento del aviso INSTALADO en empresas solo oficiales.

---

## SOP-025 · Hoja de instalación (PDF) y exportación del listado (Excel/PDF)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** (hoja) icono de impresora, tooltip **Imprimir Hoja de Instalación**, en cada fila de `/instalaciones`; (listado) botón dividido **Reporte** → `Excel (.xlsx)` / `PDF` en el mismo listado (`FE:pages/dashboard/instalaciones/Indexpage.vue:78-105, 196-212, 292-320`). ✅
- **Archivos:** FE: `Indexpage.vue` · BE: `instalaciones/instalaciones.controller.ts:95-128, 167-177`, `instalaciones.service.ts:1066-1155, 1505-1677, 1706-1719`, `PlantillaHojaInstalacion.ts`, `pdf-plantillas/hoja-instalacion.hbs`, `pdf-plantillas/listado-instalaciones.hbs`.
- **Acceso:** la hoja requiere `instalaciones.imprimir` en la pantalla; **Reporte** no tiene permiso propio. El backend solo exige sesión. ✅
- **Hoja de instalación** (`GET /instalaciones/pdf/:id`, PDF A4 vertical con márgenes 10/8 mm, generado con Chromium sin interfaz): título `HOJA DE INSTALACIÓN # 0000123`; encabezado con logo (o `default.png`), nombre comercial, `RUC:`, dirección matriz y `Tel:` de la empresa; secciones:
  | Sección | Contenido |
  |---|---|
  | Datos del Cliente | Nombre y Apellidos, Cédula, Teléfono, Correo, Dirección, Fecha de Instalación (texto tal como se guardó), Técnico Asignado |
  | Servicio Contratado | **solo si existe un servicio ligado a la instalación** (INSTALADO por el flujo de cliente): Plan, N° IP, Tipo conexión, Router, Red / AP; Caja NAP, Puerto NAP, SN ONU, MAC y Contrato (si lo tiene); y, si hay PPPoE, **Usuario PPPoE** y **Password PPPoE** |
  | Equipos Instalados | Equipo (categoría), Descripción, N° Mac, N° Serie, Condición (`Libre`, `Préstamo/Comodato`, `Venta`); vacío: `Sin equipos asignados` |
  | Accesorios Utilizados | Material, Cantidad; vacío: `Sin accesorios asignados` |
  | Checklist de Instalación | solo si hay checklist configurado: ✓, Item, Tipo (`Obligatorio`/`Opcional`), Marcado por / fecha |
  | OBSERVACIONES: | las notas de la instalación |
  | Firmas | dos líneas: nombre del cliente / `Cliente` y nombre del técnico / `Técnico` |
  Impresión: el frontend abre el PDF en una ventana nueva y lanza la impresión; error `Error al generar la hoja de instalación` (`Indexpage.vue:196-212`). ✅
- **Exportación del listado:**
  | Formato | Archivo | Contenido |
  |---|---|---|
  | Excel (`GET /instalaciones/export/excel`) | `instalaciones-AAAA-MM-DD.xlsx`, hoja `Instalaciones`, con filtro automático | N°, Cliente, Cédula, Teléfono, Dirección, F/H Instalación, Técnico, Estado, **Motivo** |
  | PDF (`GET /instalaciones/export/pdf`) | `instalaciones-AAAA-MM-DD.pdf`, A4 horizontal | título `LISTADO DE INSTALACIONES`, rango, total, fecha de generación; N°, Cliente, Cédula, Teléfono, Dirección, F/H Instalación, Técnico, Estado (con color) |
  N° con 7 dígitos; orden por secuencial descendente. Avisos: `EXCEL generado` / `PDF generado`, error `Error al exportar EXCEL|PDF`. (`:78-105`)
- **Reglas de negocio:**
  1. Filtros que viajan: rango de fechas (sobre `created_at`, el día final incluye hasta las 23:59:59), **Estado** y el texto de **Buscar...**. **No viajan** los selectores **Técnico** ni **Operador**: el DTO de exportación no los declara y la validación descarta lo desconocido (`dto/reporte-instalaciones.dto.ts`; `main.ts` con `whitelist: true`). ✅
  2. Para quien no es SUPER-ADMINISTRADOR el frontend añade `tecnico=<su id>`; en la exportación eso filtra **solo por técnico asignado**, mientras que la tabla filtra por técnico **o** operador (`instalaciones.service.ts:1515` frente a `:622-632`). Un operador ve en pantalla instalaciones que no salen en su Excel/PDF. ✅
  3. La búsqueda de la exportación sí incluye el **nombre del cliente**; la de la pantalla no (`:1524` frente a `:609-620`). ✅
  4. El Excel agrega la columna Motivo aunque el rótulo diga "Tabla tal cual la ves en pantalla".
  5. Descarga el listado completo del filtro, sin paginar. ✅
- **Casos límite y advertencias:**
  - **La hoja imprime la contraseña PPPoE del cliente en claro** (`hoja-instalacion.hbs`, bloque `Password PPPoE`) y el papel queda en manos del técnico y del cliente. ✅
  - Las notas se escapan al imprimir (`{{instalacion.notas}}`), pero se guardan como HTML del editor: la hoja puede mostrar etiquetas como `<p>` en texto plano ❓.
  - Si la instalación no tiene servicio ligado (cancelada, o INSTALADO por el selector del formulario), la sección Servicio Contratado no aparece.
  - El PDF necesita Chromium en el servidor; si no está disponible la API falla (error genérico `Error al generar la hoja de instalación`).
- **Preguntas probables de usuarios:**
  1. "¿Dónde imprimo la orden para el técnico?" → icono de impresora en la fila.
  2. "La hoja no trae el plan ni la IP" → solo aparecen cuando la instalación ya generó el servicio.
  3. "Mi Excel trae menos instalaciones que la pantalla" → para operadores filtra solo por técnico asignado.
  4. "¿Puedo exportar solo las de un técnico?" → no con el selector; usar la búsqueda por nombre del técnico.
  5. "¿El PDF del listado es vertical?" → horizontal.
- **Pendiente de validar en UI:** ❓ cómo se ve la hoja con notas en HTML; ❓ si el navegador bloquea la ventana de impresión; ❓ aspecto del PDF del listado con muchas filas.

---

## SOP-026 · Reportes / KPIs de instalaciones
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** `/instalaciones/reportes` · `instalaciones.reportes` · botón **Reportes** (icono `insights`) del listado; migas `Inicio › Instalaciones › Reportes / KPIs` (`FE:pages/dashboard/instalaciones/ReportesPage.vue`, `Indexpage.vue:287-290`). ✅
- **Archivos:** FE: `ReportesPage.vue`, `components/ReportesInstalaciones.vue`, `components/ResumenCardsInstalaciones.vue` (tarjetas del listado) · BE: `instalaciones/instalaciones.controller.ts:42-89`, `instalaciones.service.ts:1164-1206, 1215-1368, 1376-1497, 1682-1704`, `dto/reporte-instalaciones.dto.ts`, `PlantillaReporteInstalaciones.ts`, `pdf-plantillas/reporte-instalaciones.hbs`.
- **Para qué sirve:** medir el módulo en un rango de fechas: cuántas instalaciones hay por estado, cuántas se completan, cómo rinde cada técnico y por qué se reprograman o cancelan.
- **Acceso:** el guard de rutas lo deja entrar con `instalaciones.index` (`FE:router/auth-guard.ts`, mapa `permisoPorRuta`); el botón **Reportes** no tiene permiso propio. El backend solo exige sesión. ✅
- **Filtros:** **Rango de fechas** (por omisión del día 1 del mes a hoy; no admite fechas futuras; la "x" lo limpia y trae todo el histórico; botón **Cerrar** del calendario), **Técnico** (`Todos los técnicos` + todos los usuarios de `/auth/users`) y **Exportar** (botón dividido; clic directo = Excel). El rango es sobre la fecha de **creación**. (`ReportesInstalaciones.vue:204-285, 188-197`)
- **Contenido en pantalla:**
  | Bloque | Qué muestra |
  |---|---|
  | Tarjetas | `Total instalaciones`, `Instaladas`, `Pendientes`, `Tasa de éxito` (en %) |
  | Distribución por estado | gráfico de dona con Pendiente, Agendada, En proceso, Instalado, Reprogramada, Cancelada (solo los estados con datos) |
  | Tendencia diaria | líneas `Creadas` e `Instaladas` por día |
  | Productividad por técnico | columnas Técnico, Total, Instaladas, Canceladas, Reprog., % Éxito (insignia verde ≥ 80, naranja ≥ 50, roja menos), Tiempo (días); vacío `Sin datos en el rango seleccionado.` |
  | Top motivos (Reprogramada / Cancelada) | Motivo, Estado, Cantidad; vacío `No hay motivos registrados en el rango.` |
- **Reglas de negocio (backend, `GET /instalaciones/reportes/resumen`):**
  1. **Pendientes** = PENDIENTE + AGENDADA + EN_PROCESO (REPROGRAMADA no cuenta como pendiente y va aparte) (`:1257`). **Tasa de éxito** = INSTALADO ÷ total del rango × 100, con un decimal; las canceladas y reprogramadas están en el denominador (`:1255-1260`). ✅
  2. **Tendencia:** `Creadas` por `created_at`; `Instaladas` por `updated_at` de las que hoy están INSTALADO, con el mismo rango y técnico (`:1264-1295`). Editar una instalación ya instalada corre su fecha de "instalada". ✅
  3. **Productividad:** solo instalaciones con técnico; ordenada por total descendente; `Tiempo (días)` = promedio de `updated_at − created_at` de las INSTALADO, un decimal, `—` si no hay (`:1298-1333`). ✅
  4. **Top motivos:** solo REPROGRAMADA/CANCELADA; agrupa por texto del motivo (sin motivo = `Sin motivo`); máximo 10 (`:1336-1351`). Cuenta el estado **actual**: una reprogramada que luego se instaló deja de aparecer. ✅
  5. El DTO admite además `estado` y `filter` (búsqueda por técnico, dirección, cédula, teléfono o nombre del cliente) para alinear las exportaciones con el listado, pero la pantalla de reportes no los envía (`dto/reporte-instalaciones.dto.ts`). ✅
  6. **No se filtra por usuario:** quien llegue a esta pantalla ve los datos de todos (igual que las tarjetas del listado, SOP-014). ✅
- **Exportar:** `Excel (.xlsx)` ("Resumen + listado detallado + por técnico") → `reporte-instalaciones-AAAA-MM-DD.xlsx` con tres hojas: `Resumen` (KPIs, distribución, top motivos), `Listado` (#, Cliente, Cédula, Teléfono, Dirección, Técnico, Estado, Motivo, F. instalación, Creada, Actualizada) y `Por Técnico`; `PDF` ("Reporte ejecutivo con KPIs y gráficas") → `reporte-instalaciones-AAAA-MM-DD.pdf`, A4 vertical, título `REPORTE DE INSTALACIONES` con rango, técnico filtrado (`Todos los técnicos`) y fecha, tarjetas `Total`, `Instaladas`, `Pendientes`, `Tasa de éxito`, y las tablas de estado, técnicos y motivos. El PDF no lleva la dona ni las líneas de tendencia; muestra una barra de porcentaje por estado. Avisos `EXCEL generado`/`PDF generado`, error `Error al exportar EXCEL|PDF`. ✅
- **Mensajes (texto exacto):** error de carga `Error al cargar el reporte` (o el mensaje del backend).
- **Casos límite y advertencias:**
  - Si el rango es muy largo y hay miles de instalaciones, las consultas corren sobre toda la tabla sin paginar ❓.
  - El filtro de técnico de la pantalla usa la lista de todos los usuarios, no solo los técnicos.
  - Instalaciones eliminadas (borrado lógico) no cuentan.
  - Las tarjetas del listado (SOP-014) y estas tarjetas usan reglas distintas: las del listado separan Agendadas y En proceso y agregan `HOY`.
- **Preguntas probables de usuarios:**
  1. "¿Qué cuenta como 'Pendientes'?" → Pendiente, Agendada y En proceso.
  2. "¿Cómo se calcula el % de éxito?" → instaladas entre todas las del rango.
  3. "¿Por qué el tiempo promedio cambia?" → se mide con la última modificación; editar una instalación ya instalada lo altera.
  4. "¿Puedo ver solo mi productividad?" → filtrar por Técnico; no hay restricción por usuario.
  5. "El PDF no trae gráficos" → solo tarjetas y tablas.
- **Pendiente de validar en UI:** ❓ aspecto de la dona y la tendencia con rangos largos; ❓ rendimiento con historial grande.

---

## SOP-027 · Ubicación de técnicos: aviso periódico desde el panel
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`.
- **Ruta UI / name:** automático al abrir el panel (no hay pantalla); aviso único `Tu ubicación` la primera vez. Lo ve la central en el mapa (SOP-029). ✅
- **Archivos:** FE: `composables/useLatidoUbicacion.js`, `composables/useUbicacion.js`, `composables/useAppIspmax.js`, `layouts/MainLayout.vue:239, 278, 401-406` · BE: `ubicacion-tecnicos/ubicacion-tecnicos.controller.ts:14-17`, `ubicacion-tecnicos.service.ts:41-63`, `dto/guardar-ubicacion.dto.ts`, `entities/ubicacion-tecnico.entity.ts`, `common/utils/coordenadas.util.ts:47-56`.
- **Para qué sirve:** que la central sepa dónde está cada técnico (para decidir a quién asignarle un soporte) mientras tiene el sistema abierto. No es un rastreo continuo ni un historial.
- **Quién avisa:** solo quien tenga un **rol llamado `TECNICO`** (comparación sin distinguir mayúsculas contra cualquiera de sus roles, `useLatidoUbicacion.js:33, 168-171`). No importa el permiso: los demás usuarios no envían nada. ✅
- **Cuándo avisa** (`useLatidoUbicacion.js:25-27, 82-110, 168-178`):
  | Regla | Valor |
  |---|---|
  | Frecuencia | cada **2 minutos** (`MINUTOS_ENTRE_AVISOS`), y al volver a la pestaña |
  | Solo si la pestaña es visible | sí; con la pantalla apagada o en otra app no manda nada |
  | Solo si el permiso de ubicación **ya** está concedido | sí; este aviso nunca lo pide por su cuenta |
  | Si hay **jornada** de la app en curso | se calla (la app avisa por su cuenta, SOP-028) |
  | Qué se envía en cada ciclo | solo si se movió **40 m o más** desde el último envío (`METROS_PARA_AVISAR`) **o** pasaron **10 minutos** (`MINUTOS_QUIETO`, para que la central sepa que sigue conectado) |
  | Precisión buscada | 60 m, esperando hasta 12 s por una lectura |
  Se detiene al cerrar el panel (`onBeforeUnmount`).
- **Aviso informativo (una sola vez por usuario y navegador):** diálogo `Tu ubicación` — "Mientras tengas el sistema abierto, tu ubicación se comparte con la central para saber a quién asignarle cada soporte. Con el sistema cerrado no se comparte nada." Botones **Activar** / **Ahora no**; se recuerda en `localStorage` (`ispmax/aviso-ubicacion/<id>`). Si ya dio el permiso al marcar una visita, no se muestra. **Activar** pide el permiso del navegador o de la app; con **Ahora no** no se vuelve a preguntar y el técnico no aparece en el mapa. (`:116-165`)
- **Reglas de negocio (backend, `POST /ubicacion-tecnicos`):**
  1. Cada usuario guarda **solo la suya** (usa el usuario del token); no se acepta la de otro (`ubicacion-tecnicos.service.ts:40-41`). ✅
  2. DTO: `latitud` (−90 a 90) y `longitud` (−180 a 180) numéricas obligatorias; `precision` (≥ 0), `origen` (`navegador` o `app`), `dispositivo` (máx. 250 caracteres) y `capturada_en` (milisegundos) opcionales (`dto/guardar-ubicacion.dto.ts`). Se descarta un par fuera de rango o el `0,0` de un GPS sin señal: 400 `La ubicación que mandó el equipo no es válida.` (`:44-46`; `coordenadas.util.ts:48-56`). ✅
  3. Se guarda **una fila por usuario** (tabla `tecnico_ubicaciones`) que se **pisa** con cada aviso: último punto, precisión, origen, dispositivo (agente del navegador), momento de la lectura y momento de llegada. No hay histórico; el recorrido, si hace falta, sale de las marcas de visita de los tickets (`entities/ubicacion-tecnico.entity.ts:15-27`). ✅
- **Mensajes (texto exacto, de `useUbicacion.js`):** `No se dio permiso para usar la ubicación. Habilitalo en los permisos del navegador para este sitio y volvé a intentar.`; `El equipo no pudo determinar la ubicación. Revisá que el GPS esté encendido.`; `El GPS tardó demasiado en responder. Probá al aire libre o cerca de una ventana.`; `La ubicación sólo funciona con https. Abrí el sistema desde su dirección segura.`; `Este navegador no permite obtener la ubicación.` Estos mensajes se muestran al marcar una visita (SOP-006); el aviso periódico falla en silencio y reintenta en el siguiente latido.
- **Casos límite y advertencias:**
  - Los navegadores solo entregan la ubicación en `https` (o `localhost`).
  - Quien no tenga un rol llamado exactamente `TECNICO` (por ejemplo "Técnico de campo") **no** avisa nunca: el nombre del rol es parte de la regla. ✅
  - El dato es personal: la central lo ve con `mapa.tecnicos.index` (SOP-029). El aviso informativo es la única notificación al técnico.
- **Preguntas probables de usuarios:**
  1. "No aparezco en el mapa" → rol distinto de TECNICO, permiso de ubicación no concedido, pestaña oculta o sesión sin abrir.
  2. "¿Se comparte mi ubicación con el sistema cerrado?" → no; solo con la pestaña abierta (o con la jornada de la app, SOP-028).
  3. "¿Cada cuánto se actualiza?" → cada 2 minutos si se movió; cada 10 si está quieto.
  4. "Dije 'Ahora no' y quiero activarlo" → dar el permiso de ubicación al marcar una visita; el aviso no vuelve a salir.
- **Pendiente de validar en UI:** ❓ aspecto del diálogo `Tu ubicación`; ❓ si el rol "TECNICO" viene creado de fábrica en una instalación nueva (la pantalla de roles impide borrar un rol con ese nombre, `FE:pages/dashboard/roles-permisos/IndexPage.vue:142`).

---

## SOP-028 · Jornada del técnico en la app ISPMAX
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14` y cerrada en la ronda de cierre (2026-10-25). Se lee el panel completo y el backend; el servicio nativo de Android no está en el ZIP (ver `Límite de lectura`).
- **Ruta UI / name:** botón circular de ubicación en la barra superior del panel, antes del menú del usuario; **solo dentro de la app ISPMAX** y solo para el rol `TECNICO` (`FE:layouts/MainLayout.vue:59-60`, `layouts/BotonJornada.vue`). ✅
- **Archivos:** FE: `layouts/BotonJornada.vue`, `composables/useAppIspmax.js`, `composables/useUbicacion.js:84-99`, `composables/useHelpers.js:34`, `layouts/MainLayout.vue:96-98, 255-264` · BE: `ubicacion-tecnicos/ubicacion-tecnicos.service.ts` (recibe `origen: 'app'`; caduca el dato a las 12 h).
- **Para qué sirve:** compartir la ubicación con la central **aunque la app se cierre o la pantalla se apague**, mediante un servicio de Android con notificación fija. Complementa SOP-027, que solo avisa con el panel abierto.
- **Cuándo se ve el botón:** `enLaApp && esTecnico` y que la app instalada incluya el método `iniciarJornada` (`appConJornada()`); con una versión vieja de la app no aparece (`useAppIspmax.js:42-51`; `BotonJornada.vue:26, 120`). En un navegador normal nunca aparece. ✅
- **Estados del botón:** inactivo (icono `location_off`, gris; tooltip `Iniciar jornada: compartir tu ubicación con la central`) y activo (icono `share_location`, verde, punto pulsante; tooltip `En jornada desde las HH:mm. Tocá para terminarla.`) (`:119-134`).
- **Diálogos y avisos (texto exacto):**
  | Acción | Diálogo | Botones | Resultado |
  |---|---|---|---|
  | Iniciar | `Iniciar jornada` — "Mientras dure la jornada, la app comparte tu ubicación con la central cada 2 minutos, aunque la cierres o apagues la pantalla. Vas a ver una notificación fija mientras esté activa. Termina cuando toques Terminar jornada, al cerrar sesión, o sola a las 12 horas." | **Iniciar** / **Cancelar** | pide el permiso de ubicación precisa, inicia el servicio con el token de la sesión; aviso `Jornada iniciada`; si falla, `No se pudo iniciar la jornada.` o el mensaje del error |
  | Terminar | `Terminar jornada` — "Estás en jornada desde las HH:mm. Al terminarla se deja de compartir tu ubicación." | **Terminar** / **Seguir** | aviso `Jornada terminada` |
  (`BotonJornada.vue:54-99`)
- **Reglas de negocio:**
  1. Al iniciar, el panel entrega a la app el **token de la sesión** para que el servicio se identifique ante el backend con el panel cerrado (`useAppIspmax.js:65-76`). Si la app no tiene el método: `Esta versión de la app no permite iniciar la jornada.` ✅
  2. **Retoma** la jornada si Android cerró el servicio o cambió la sesión: al montar y al volver a la pestaña relee el estado y vuelve a llamar a `iniciarJornada` con la sesión actual (`BotonJornada.vue:43-52, 101-112`). ✅
  3. **Terminan la jornada:** el botón, el toque en la notificación de Android (el botón se actualiza al volver, `BotonJornada.vue:101-112`), **cerrar sesión** (`useHelpers.js:34`) ✅ y las 12 horas (texto del diálogo; lo ejecuta la app, fuera del ZIP ❓).
  4. Mientras hay jornada, el aviso del navegador (SOP-027) se calla (`useLatidoUbicacion.js:85-86`). ✅
  5. El backend recibe las lecturas de la app por el mismo `POST /ubicacion-tecnicos` con `origen = 'app'` y las muestra con la etiqueta `GPS de la app` (SOP-029). Pasadas 12 horas sin avisos, el técnico desaparece del mapa. ✅
  6. El menú del usuario dentro de la app agrega **Cambiar de empresa** (diálogo `Cambiar de empresa` — "La app se va a reiniciar y te va a pedir la dirección del panel.", botones **Cambiar** / **Cancelar**): la app olvida la empresa y vuelve a pedir la dirección del panel (`MainLayout.vue:96-98, 255-264`; `useAppIspmax.js:33`). ✅
- **Contrato panel ↔ app** ✅ (FE:composables/useAppIspmax.js:12-88): el panel sabe que corre dentro de la app si existe `window.Capacitor` con `nativePromise` y `isNativePlatform()` y la lista `PluginHeaders` contiene un plugin llamado `Ispmax`. Métodos que invoca de ese plugin: `cambiarIsp` (Cambiar de empresa), `estadoJornada` (devuelve `{activa, desde}` con `desde` en milisegundos; ante error o ausencia se toma `{activa:false}`), `iniciarJornada` (recibe `{token}`; "Empieza la jornada, o la retoma si ya estaba en curso"), `terminarJornada` (si falla, se ignora). El botón solo existe si el plugin declara el método `iniciarJornada` (versiones viejas del APK no lo tienen). Para pedir y comprobar el permiso de ubicación usa el plugin `Geolocation` (`checkPermissions`, `requestPermissions {permissions:['location']}`) (FE:composables/useUbicacion.js:68-100; FE:composables/useLatidoUbicacion.js:36-44).
- **Dónde más aparece "Cambiar de empresa"** ✅: además del menú del usuario, la pantalla de **inicio de sesión** dentro de la app muestra "Estás entrando a {dominio}" (dominio = `window.location.host`) y el botón **Cambiar de empresa** (icono `swap_horiz`) con el mismo diálogo (FE:pages/sesion/Login.vue:12-32,258-271).
- **Cerrar sesión** ✅ llama `terminarJornada()` antes de limpiar el estado ("En la app, cerrar sesión termina la jornada: sin sesión, nadie la está usando.") (FE:composables/useHelpers.js:29-34).
- **Backend: qué sabe de la jornada** ✅: nada. Las lecturas que manda el servicio de la app llegan al mismo `POST /ubicacion-tecnicos` que el aviso del panel (SOP-027) con `origen = 'app'` y el token de la sesión; el servicio solo valida `IsIn(['navegador','app'])` y **no comprueba el rol `TECNICO`** ni que exista una jornada (BE:ubicacion-tecnicos/dto/guardar-ubicacion.dto.ts:24-26; BE:ubicacion-tecnicos/ubicacion-tecnicos.service.ts:41-63). Las "12 horas" del backend (`HORAS_VISIBLE`) son solo la ventana en que el mapa muestra a un técnico tras su último aviso (BE:ubicacion-tecnicos.service.ts:22,80); **no** terminan la jornada: el fin automático a las 12 h lo dice el texto del diálogo y lo ejecutaría la app. El comentario de cabecera del servicio dice "No hay seguimiento con la app cerrada", anterior a la jornada (`:24-30`), y ya no describe el producto.
- **Qué hay realmente en el ZIP de la app** ✅: `frontend-isp-main/src-capacitor` es un proyecto Capacitor 5 base: `capacitor.config.json` con `appId: org.rnc.app`, `appName: Red Nueva Conexion`, `webDir: www` y `server.url: http://192.168.1.42:9500` (servidor de desarrollo); `MainActivity` es un `BridgeActivity` vacío; `AndroidManifest.xml` declara solo el permiso `INTERNET` y la actividad principal (sin servicio, sin permisos de ubicación, sin notificación fija); `package.json` depende solo de `@capacitor/android|app|cli|core` (FE:src-capacitor/capacitor.config.json; FE:src-capacitor/android/app/src/main/java/org/rnc/app/MainActivity.java; FE:src-capacitor/android/app/src/main/AndroidManifest.xml; FE:src-capacitor/package.json). Ahí **no existe** el plugin `Ispmax`, el servicio de jornada ni el plugin de geolocalización: el APK que usan los técnicos se construye fuera de este repositorio.
- **Límite de lectura:** el plugin nativo `Ispmax` y el servicio de Android de la jornada (frecuencia real de 2 minutos, fin a las 12 horas, notificación fija, uso del token, comportamiento sin internet, consumo de batería) no están en el ZIP; solo se conoce su contrato con el panel (arriba) y lo que anuncian los textos del panel.
- **Mensajes de permiso (de `useUbicacion.js:20-53, 84-99`):** `No se dio permiso para usar la ubicación. Habilitalo en Ajustes → Aplicaciones → ISPMAX → Permisos.`; `Diste permiso de ubicación aproximada, y para marcar la visita hace falta la precisa. Cambialo en Ajustes → Aplicaciones → ISPMAX → Permisos → Ubicación.`; `La ubicación del teléfono está apagada. Activala desde la barra de ajustes rápidos y volvé a intentar.`; `Para marcar la visita hace falta activar la ubicación del teléfono.`; `Los servicios de Google del teléfono necesitan una actualización para usar el GPS.`; `Los servicios de Google del teléfono no respondieron. Probá de nuevo.`
- **Casos límite y advertencias:**
  - Todo el comportamiento "con la app cerrada" (frecuencia real, consumo de batería, qué pasa sin internet, almacenamiento del token) depende del código nativo de Android, que no está en el ZIP (`Límite de lectura`) ❓.
  - El token de sesión queda en poder de la app mientras dura la jornada; el panel no vuelve a revisar su vigencia.
  - Con la jornada activa el técnico sigue necesitando permiso de ubicación **precisa**; la aproximada se rechaza.
- **Preguntas probables de usuarios:**
  1. "No veo el botón de jornada" → solo en la app ISPMAX (versión reciente) y con el rol TECNICO.
  2. "¿Qué pasa si cierro la app?" → con la jornada activa sigue compartiendo; sin ella, no.
  3. "¿Cómo la termino?" → botón, notificación fija, cerrar sesión o a las 12 horas.
  4. "Me pide 'ubicación precisa'" → habilitarla en los permisos de la app.
  5. "¿Cómo cambio de empresa en la app?" → menú del usuario → Cambiar de empresa.
- **Pendiente de validar en UI:** ❓ todo el servicio nativo (frecuencia, 12 h, notificación fija): solo comprobable con el APK real; ❓ aspecto del botón y de la insignia pulsante. Resuelto con el código: el backend no distingue jornada de aviso del navegador (misma ruta, mismo registro) y el ZIP no trae el servicio nativo.

---

## SOP-029 · Capa "Técnicos" del Mapa de Red (qué ve el administrador)
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14` y cerrada en la ronda de cierre (2026-10-25). Todo el código del ZIP que toca la capa (panel y backend) está leído; lo que solo se ve con técnicos reales en Mapbox queda en ❓.
- **Ruta UI / name:** `/mapa-nap` · `index.mapa` → icono **Capas y filtros** (tooltip) → bloque **Técnicos** → casilla **Ver dónde están** (`FE:pages/dashboard/Gestion-Red/mapa-nap/IndexPage.vue:4685-4698`). ✅
- **Archivos:** FE: `Gestion-Red/mapa-nap/IndexPage.vue:3780-4020, 4691-4698, 4739-4744, 5175-5210` · BE: `ubicacion-tecnicos/ubicacion-tecnicos.controller.ts:19-23`, `ubicacion-tecnicos.service.ts:13-22, 72-128, 130-183`, `ticket/visitas/entities/ticket-marca.entity.ts`.
- **Para qué sirve:** ver sobre el mapa dónde fue el último aviso de cada técnico y en qué ticket está, para asignar soportes.
- **Acceso:** el bloque solo se muestra con `mapa.tecnicos.index` (catálogo Gestión de Red › Mapa: "Ver ubicación de los técnicos", `FE:…/permisos/gestion-red-permisos.json:78`). **Es el único permiso de este dominio que el backend también exige**: `GET /ubicacion-tecnicos` responde 403 `No tenés permiso para ver la ubicación de los técnicos` salvo al rol SUPER-ADMINISTRADOR o a quien tenga esa clave (`ubicacion-tecnicos.service.ts:121-128`). ✅
- **Qué ve:**
  | Elemento | Detalle |
  |---|---|
  | Casilla **Ver dónde están** | ayuda: "Se actualiza mientras están en jornada o tienen el sistema abierto."; se recuerda en el navegador (`localStorage` `mapa-nap:ver-tecnicos`); se refresca cada **60 s** (`:3796-3818, 3969-3992`) |
  | Marcador | círculo con las iniciales (o la foto del usuario); el color indica antigüedad: verde ≤ 5 min, ámbar ≤ 30 min, gris más viejo (`colorTecnico`, `:3818`) |
  | Leyenda **Técnicos (último aviso)** | `Hace menos de 5 min`, `Hace menos de 30 min`, `Más viejo` |
  | Ficha (al pulsar el marcador) | nombre; `hace un momento` / `hace N min` / `hace N h M min`; `± N m` de precisión; `GPS de la app` o `navegador`; el ticket en curso (`Ticket #N · Estado`, cliente, dirección) o `Sin visita marcada en este momento`; botones **Llamar** (`tel:`) y **WhatsApp** (`wa.me`), o `Sin celular cargado` (`:3864-3900`) |
- **Reglas de negocio (backend, `listar`):**
  1. Devuelve a los usuarios con fila de ubicación cuyo último aviso tiene **menos de 12 horas** (`HORAS_VISIBLE`) y que estén activos y no eliminados (`:75-94`). ✅
  2. **No se filtra por routers ni por sucursales del usuario que consulta**: ve a todos. ✅
  3. "En qué ticket está" = la última marca de visita del técnico en un ticket que no esté CERRADO ni CANCELADO, **solo si esa marca es una llegada** (si la última es una salida, no está en ningún lado) (`:137-183`). ✅
  4. Devuelve nombre, celular, foto, roles, coordenadas, precisión, origen y minutos desde el último aviso; no incluye el dispositivo. ✅
  5. El número de WhatsApp se arma suponiendo Ecuador: `0…` de 10 dígitos pasa a `593…` (`paraWhatsapp`, `:3849-3858`). ❓ en otros países.
- **Cómo se dibuja y se refresca** ✅ (FE:Gestion-Red/mapa-nap/IndexPage.vue:3787-4010):
  1. `puedeVerTecnicos = validarPermisos('mapa.tecnicos.index')` (`:3796`); `mostrarTecnicos` arranca en `puedeVerTecnicos && preferencia guardada` (`:3810`), así que quitar el permiso apaga la capa aunque el navegador la recuerde. Al abrir la pantalla con la capa prendida se carga tras `prepararMapa` (`:4007`).
  2. Al marcar la casilla: `GET /ubicacion-tecnicos` y luego cada 60 s (`setInterval`); al desmarcarla se vacía la lista, se quitan los marcadores y se detiene el reloj; al salir de la pantalla se limpian los marcadores y el reloj (`:3946-3993,4010-4021`). La edad y el color de cada marcador se calculan con `minutos` que trae el servidor en cada consulta, así que entre refrescos pueden estar desfasados hasta 1 minuto.
  3. Cada técnico es un `mapboxgl.Marker` (círculo de 34 px con iniciales de las dos primeras palabras del nombre; 40 px con borde de color si carga la foto) con `title` `{nombre} · {hace cuánto}` y un popup de la ficha (`:3907-3944`; estilos `.marcador-tecnico` `:5175-5210`). Si la foto no carga se queda con las iniciales.
  4. **Independencia de las demás capas:** los marcadores de técnicos viven en `markersTecnicos`, separados de `markers` (clientes/cajas/routers); `limpiarMarcadoresYRutas` y el recorte por ventana visible (`actualizarMarkersVisibles`) solo recorren `markers`, de modo que cambiar el **Tipo** del mapa, los filtros de router/sucursal o activar tendido/postes **no** quita ni mueve a los técnicos (`:3549-3600,2971-2990`). El mapa se crea una sola vez (`inicializarMapa`, `:3683-3700`). No hay agrupación ni límite: con muchos técnicos se dibujan todos.
  5. La foto se pide a `/api/images-user/<archivo>` (en `VITE_AMBIENTE = 'dev'`, a `${VITE_BASE_URL}/api`) (`:3838`). Los textos del nombre, ticket y dirección se escapan (`< > & "`) antes de ir al HTML de la ficha.
  6. Hora/edad en la ficha: `hace un momento` (≤ 1 min), `hace N min` (< 60), `hace H h` o `hace H h M min` (`:3820-3828`).
- **Permiso y usuario en el backend** ✅: `exigirPermiso` lee `user.roles` y `user.permisos` del usuario autenticado; `JwtStrategy.validate` los carga de la base en cada petición (`user.roles`, `user.permisos`, `user.routers`, `user.sucursales`), de modo que quitar el permiso surte efecto en la siguiente consulta sin esperar a que caduque el token (BE:auth/strategies/jwt.strategy.ts:33-62; BE:ubicacion-tecnicos/ubicacion-tecnicos.service.ts:121-128).
- **Mensajes (texto exacto):** `No se pudo cargar la ubicación de los técnicos. Se vuelve a intentar cada minuto.` (un solo aviso por falla; la capa no se apaga).
- **Casos límite y advertencias:**
  - Un punto de hace horas se ve gris: "dónde estuvo", no "dónde está". No hay seguimiento con la app cerrada (salvo la jornada, SOP-028).
  - Solo aparecen quienes enviaron una ubicación; un técnico sin permiso de ubicación o sin rol `TECNICO` no sale (SOP-027).
  - La foto se pide a `/api/images-user/<archivo>`; si no carga, quedan las iniciales.
  - El permiso `mapa.tecnicos.index` solo existe en el catálogo de Gestión de Red; un rol sin él no ve ni el bloque ni los datos.
- **Preguntas probables de usuarios:**
  1. "No veo la opción Técnicos en el mapa" → falta el permiso "Ver ubicación de los técnicos".
  2. "El técnico sale gris" → su último aviso fue hace más de 30 minutos.
  3. "No sale ningún técnico" → ninguno tiene el sistema abierto con permiso de ubicación, o pasaron más de 12 horas.
  4. "¿Puedo llamarlo desde el mapa?" → sí, la ficha trae Llamar y WhatsApp.
  5. "¿Por qué dice 'Sin visita marcada'?" → no tiene una llegada sin salida en un ticket abierto.
- **Pendiente de validar en UI:** ❓ aspecto de marcadores y ficha con técnicos reales y Mapbox. Resuelto con el código: el comportamiento con muchos técnicos (se dibujan todos, sin agrupar) y con el filtro por tipo de mapa (no afecta a la capa).

---

## SOP-030 · Matriz de permisos y control de acceso del dominio
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14`. Resume las claves ya citadas en SOP-001…SOP-029.
- **Ruta UI / name:** Usuarios → **Roles** (`roles-permisos`) → catálogo de permisos, grupos **Tickets** e **Instalaciones** (`FE:pages/dashboard/usuarios/permisos/gestion-clientes-permisos.json:123-148`), pestaña **Tickets** del grupo "Clientes perfil(edición)" (`:43-48`) y **Gestión de Red › Mapa** (`gestion-red-permisos.json:78`). ✅
- **Cómo se aplica el control:**
  1. **Ruta:** el guard exige un permiso con el **mismo nombre que la ruta** (`tickets.index`, `tickets.add`, `tickets.edit`, `instalaciones.index`, `instalaciones.add`, `instalaciones.edit`); las pantallas de reportes se miden contra `tickets.index` / `instalaciones.index` (`FE:router/auth-guard.ts`, `permisoPorRuta`). Sin permiso redirige al primer permiso `…index` del usuario. SUPER-ADMINISTRADOR (primer rol) pasa siempre. ✅
  2. **Botones:** `validarPermisos('clave')` oculta el control; acepta varias claves separadas por coma (basta una) y devuelve verdadero siempre para SUPER-ADMINISTRADOR (`FE:composables/useRolPermisos.js`). ✅
  3. **Backend:** `@Auth()` solo valida el JWT y que el usuario esté activo. Ningún endpoint de tickets o instalaciones comprueba permisos de este catálogo. Excepciones: `GET /ubicacion-tecnicos` (`mapa.tecnicos.index`), reasignar técnico de instalación (SUPER-ADMINISTRADOR o creador), y reglas propias de tickets (SOP-004, SOP-006). Quien conozca la API puede saltarse cualquier botón oculto. ✅
- **Instalaciones:**
  | Clave | Etiqueta del catálogo | Qué habilita (frontend) | Cita |
  |---|---|---|---|
  | `instalaciones.index` | Ver | ruta del listado, menú **Gestion de Clientes › Instalaciones**, reportes | `SideBarMenu.vue:288-297`; `auth-guard.ts` |
  | `instalaciones.add` | Crear | ruta de alta y botón **Nueva Instalación** | `Indexpage.vue:282` |
  | `instalaciones.edit` | Editar | ruta de edición, lápiz de la fila, botón **Reasignar** (más creador/SUPER-ADMINISTRADOR) | `Indexpage.vue:458`; `DetalleInstalacion.vue:30-34` |
  | `instalaciones.delete` | Eliminar | papelera de la fila | `Indexpage.vue:468` |
  | `instalaciones.notificar` | Notificar | envío manual de aviso | `Indexpage.vue:478` |
  | `instalaciones.imprimir` | Imprimir | hoja de instalación | `Indexpage.vue:492` |
  | `instalaciones.completar` | Completar (crea cliente/servicio) | **Cambiar Estado → INSTALADO** | `EditInstalacion.vue:73` |
  Sin clave propia: **Reportes**, **Reporte** (exportar), materiales, respuestas, checklist, pre-asignación y pestaña **Formulario Instalación** (esta última por rol/creador, no por permiso). No existe "ver instalaciones de otros": solo el rol SUPER-ADMINISTRADOR (`claim.roles[0]`) ve todas; el resto ve las suyas como técnico u operador (`Indexpage.vue:143-144`).
- **Tickets** (detalle en SOP-001…SOP-013): `tickets.index` (Ver), `tickets.ver_otros` (Ver de otros), `tickets.add` (Crear), `tickets.edit` (Editar; también materiales y firma), `ticket.delete` (Eliminar), `ticket.reenviar_msg` ("reenviar msg notif."), `tickets.asignar_otros` (Asignar a otros), `tickets.cambiar_estado_otros` (Cambiar estado de otros). Nótese la inconsistencia `tickets.*` / `ticket.*`.
- **Ficha del cliente › Tickets:** `cliente.ticket.index` (Ver; pestaña), `cliente.ticket.agregar`, `cliente.ticket.editar`, `cliente.ticket.eliminar`, `cliente.ticket.reenviar_msg`, `cliente.ticket.asignar_otros` (`FE:pages/dashboard/clientes/components/editar/Servicios/TicketsPage.vue:166, 236, 258, 279`; `IndexPage.vue:80, 135`). ✅
- **Ubicación de técnicos:** `mapa.tecnicos.index` ("Ver ubicación de los técnicos"), exigido también en el backend (SOP-029).
- **Ajustes relacionados** (SOP-031): `variables.ver.plantilla.ticket`, `variables.edita.plantilla.ticket`, `variables.ver.plantilla.documentos.contrato` (pestaña Formato de Ticket), `variables.ver.plantilla.instalacion` (⚠ no está en ningún catálogo: solo SUPER-ADMINISTRADOR, o un rol que ya la tuviera guardada, ve la pestaña **Instalación**).
- **Reglas de acceso por rol/propiedad (no son permisos):**
  | Regla | Dónde se aplica |
  |---|---|
  | SUPER-ADMINISTRADOR ve todas las instalaciones; los demás, las que crearon o tienen asignadas | frontend (parámetro `tecnico`) y backend (`tecnico OR operador`) |
  | Pestaña **Formulario Instalación**: creador o SUPER-ADMINISTRADOR | frontend (`EditInstalacion.vue:23-25`) |
  | Reasignar técnico: creador o SUPER-ADMINISTRADOR; 403 `Solo el operador que creó la instalación puede reasignar su técnico.` | frontend y backend (`instalaciones.service.ts:766-773`) |
  | Editar/eliminar respuestas: solo el autor | solo frontend |
  | Un usuario con tickets (ABIERTO, EN_PROCESO) o instalaciones (PENDIENTE, AGENDADA, EN_PROCESO, REPROGRAMADA) en curso, como técnico u operador, **no se puede eliminar**: 400 `No se puede eliminar a "<nombre>": tiene N ticket(s) y M instalación(es) en proceso. Reasígnalos o ciérralos antes de eliminar.` | backend (`BE:auth/auth.service.ts:545-585`) |
- **Casos límite y advertencias:**
  - Todo permiso de este dominio se puede saltar por API (excepto los indicados). Para que un botón oculto tenga efecto real hay que reforzarlo en el backend.
  - Un rol con `instalaciones.index` pero sin `instalaciones.completar` puede abrir la instalación y elegir "Cambiar Estado → INSTALADO"; tras confirmar `¿Completar instalación?`, el aviso `No tienes permiso para completar instalaciones. El operador puede hacerlo.` lo detiene.
  - Los técnicos de apoyo de tickets no tienen reflejo en instalaciones: no hay apoyos en instalaciones.
- **Preguntas probables de usuarios:**
  1. "¿Qué permiso necesita un técnico?" → `instalaciones.index` (y `.edit` para abrir y editar), más `tickets.index`/`tickets.edit` para soportes.
  2. "¿Quién puede crear el cliente desde la instalación?" → quien tenga `instalaciones.completar` y los permisos de clientes.
  3. "Tengo permiso de editar y no puedo reasignar" → solo el creador o un SUPER-ADMINISTRADOR.
  4. "No puedo eliminar a un usuario" → tiene tickets o instalaciones en curso: reasignarlos.
  5. "¿Dónde configuro las plantillas de instalación?" → pestaña Instalación; solo la ve SUPER-ADMINISTRADOR (falta la clave en el catálogo).
- **Pendiente de validar en UI:** ❓ cómo presenta la pantalla de roles los grupos **Tickets** e **Instalaciones** (jerarquía exacta).

---

## SOP-031 · Ajustes que gobiernan tickets e instalaciones
> Sección añadida en la ronda 2 (2026-10-22), contrastada con el código `zip-2026-10-14` y cerrada en la ronda de cierre (2026-10-25). Es un índice: cada fila de la tabla se contrastó con la entidad, el DTO y los lugares donde se lee la clave; el detalle de cada pantalla está en MSG-008, MSG-011, MSG-013 y MSG-014 (y, en `ajs1.md`, AJS-023…AJS-028), y el formato de ticket (.docx) en MSG-010/MSG-011.
- **Ruta UI / name:** Ajustes → **Plantillas** (`/ajustes/plantillas`, `ajuste.plantillas`) → pestañas **Tickets**, **Formato de Ticket** e **Instalación** (`FE:pages/dashboard/ajustes/plantillas/IndexPage.vue:19-67, 83-95`). ✅
- **Archivos:** FE: `ajustes/plantillas/IndexPage.vue`, `ajustes/ticket/{IndexPage,PlantillaMsgCliente,PlantillaMsgTecnico,FirmaTicket,TecnicosApoyo}.vue`, `ajustes/ticket/composables/useConfigTicket.js`, `ajustes/instalacion/{IndexPage,NotificacionesEstadoConfig,ChecklistConfig}.vue` · BE: `settings/entities/setting.entity.ts:217-265`, `settings/dto/create-setting.dto.ts:119-195`, `settings/settings.service.ts:36-53`, `instalaciones/defaults/notif-templates.ts`.
- **Para qué sirve:** reunir en un solo lugar qué ajustes cambian el comportamiento de los tickets y de las instalaciones, dónde se editan y quién los lee.
- **Acceso:** la pantalla Plantillas se abre con cualquiera de las claves `variables.ver.*` de sus pestañas; si no tiene ninguna, redirige al Inicio (`IndexPage.vue:97-111`). Cada pestaña se muestra con su clave: **Tickets** `variables.ver.plantilla.ticket`; **Formato de Ticket** `variables.ver.plantilla.documentos.contrato`; **Instalación** `variables.ver.plantilla.instalacion` (⚠ fuera de catálogo). Las pestañas Firma del ticket, Técnicos de apoyo, Notificaciones por estado y Checklist no comprueban permiso de edición (solo los mensajes de ticket usan `variables.edita.plantilla.ticket`). El backend no valida ninguno (`PATCH /settings/:id` solo exige sesión). ✅
- **Ajustes (todos viven en la tabla de ajustes de la empresa y se guardan con `PATCH /settings/:id`):**
  | Pantalla (pestaña › sub-pestaña) | Clave | Valores | Por omisión | Quién lo lee |
  |---|---|---|---|---|
  | Tickets › **Plantilla mensaje cliente** | `plantillaTicketCliente` | HTML con `{ cliente } { fecha_visita } { asunto } { detalle } { tecnico } { prioridad } { turno } { hora_visita } { telefono_tecnico }` | vacío (texto, nulo) | `BE:ticket/ticket.service.ts:310, 338` (MSG-008) |
  | Tickets › **Plantilla mensaje tecnico** | `plantillaTicketTecnico` | ídem + `{ telefono_cliente } { coordenadas_cliente } { ipv4 } { direccion }` | vacío | `ticket.service.ts:411, 491` |
  | Tickets › **Firma del ticket** | `firmaTicketModo` | `electronica` (Firma electrónica) / `manuscrita` (Firma en el dispositivo) | `electronica` | `FE:tickets/composables/useFirmaTicket.js:36`; `BE:ticket/firma/tickets-firma.controller.ts:88` (SOP-008) |
  | Tickets › **Técnicos de apoyo** | `ticketApoyoHabilitado` | encendido/apagado | apagado | `ticket.service.ts:91`; `FormTicket.vue:80` (SOP-009) |
  | Tickets › **Técnicos de apoyo** | `ticketApoyoGestiona` (depende del anterior) | encendido/apagado | apagado | `tickets-visitas.service.ts:63`; `DetalleTicket.vue:48`; `VisitaTicket.vue:45` |
  | Formato de Ticket | registro de `plantillas` con `tipo = 'ticket'` (un solo documento .docx; no es un campo de ajustes) | .docx con variables entre llaves | sin formato propio: se imprime con el formato del sistema | `BE:plantillas/*`, `ticket/variables-ticket.ts` (MSG-011, SOP-011) |
  | Instalación › **Notificaciones por estado** | `notifInstalacionCliente`, `notifInstalacionTecnico` | por estado: `activo`, `whatsApp` (HTML), `email.subject` (máx. 200 en pantalla), `email.body` (HTML); cliente: AGENDADA, EN_PROCESO, INSTALADO, REPROGRAMADA, CANCELADA; técnico: AGENDADA, EN_PROCESO | plantillas de `defaults/notif-templates.ts`, todas activas; `{}` en la base si nunca se sembraron | `BE:instalaciones.service.ts:190-191, 330-331`; `customers.service.ts:757` (SOP-024) |
  | Instalación › **Checklist instalación** | `checklistInstalacion` | lista de `{ id, label (máx. 120), obligatorio, orden }` | `[]` | FE `EditInstalacion.vue:84-85`; BE `instalaciones.service.ts:1088-1107` (SOP-019, SOP-025) |
  Guardados: `Datos actualizados` (Tickets), `Plantilla guardada` (Notificaciones por estado), `Actualización exitosa` (Checklist, que además reprograma el proceso de cortes, MSG-013).
  Contraste con el código ✅: en la entidad las columnas son `plantillaTicketCliente`/`plantillaTicketTecnico` `text` nullable sin valor inicial; `firmaTicketModo` `text` con `'electronica'`; `ticketApoyoHabilitado` y `ticketApoyoGestiona` `boolean` con `false`; `checklistInstalacion` `jsonb` `[]`; `notifInstalacionCliente`/`Tecnico` `jsonb` `{}` (BE:settings/entities/setting.entity.ts:217-265). El DTO acepta las plantillas de ticket como `string` opcional (BE:settings/dto/create-setting.dto.ts:128-134) y no hay migración que las siembre (solo `firmaTicketModo` y `ticketApoyoHabilitado` tienen migración con su valor inicial: BE:migrations/1788100000000-FirmaManuscritaTicket.ts:26, BE:migrations/1789100000000-TicketApoyoHabilitado.ts:8). Lectores confirmados: `plantillaTicket*` en BE:ticket/ticket.service.ts:310,338,411,491; `ticketApoyoHabilitado` en BE:ticket/ticket.service.ts:90-92 y FE:tickets/components/FormTicket.vue:80; `ticketApoyoGestiona` (siempre junto con el anterior) en BE:ticket/visitas/tickets-visitas.service.ts:63, FE:tickets/components/DetalleTicket.vue:48 y VisitaTicket.vue:45; `firmaTicketModo` en FE:tickets/composables/useFirmaTicket.js:36 y FE:ajustes/ticket/FirmaTicket.vue; `notifInstalacion*` en BE:instalaciones/instalaciones.service.ts:190-191,330-331 y BE:customers/customers.service.ts:757; `checklistInstalacion` en FE:instalaciones/EditInstalacion.vue:84-85 y BE:instalaciones/instalaciones.service.ts:1088-1089.
  **Pestañas de Ajustes › Tickets** (`ajustes/ticket/IndexPage.vue`): `Plantilla mensaje cliente`, `Plantilla mensaje tecnico`, `Firma del ticket`, `Técnicos de apoyo` (FE:pages/dashboard/ajustes/ticket/IndexPage.vue:15-58). Todas guardan con `PATCH /settings/{id}` y, solo desde esta pantalla, el panel invalida su copia de los ajustes (`invalidarSettings`) y muestra `Datos actualizados` (FE:ajustes/ticket/composables/useConfigTicket.js:26-31).
  **Dónde queda el Formato de Ticket** ✅: el .docx se sube con `uploadImages(file, "images-services")` y se guarda en `static/uploads/images-services/<archivo>` de la raíz del backend; el registro `plantillas` (`tipo = 'ticket'`, un solo registro: segundo intento ⇒ 409 `Ya hay un formato de ticket cargado. Edítalo o elimínalo para subir otro.`) guarda solo el nombre del archivo en `files` y `tieneAnclaFirma` (se recalcula al guardar mirando si el .docx trae `{firma_cliente}`). El archivo se sirve en `/api/uploads/images-services/<archivo>` y los envíos a firmar lo leen de disco con `process.cwd()/static/uploads/images-services` (FE:ajustes/plantillas/composables/usePlantillas.js:131,148; BE:plantillas/plantillas.service.ts:28-52,108-118; BE:files/files.service.ts:10,29; BE:app.module.ts:164-165; BE:firma-electronica/firma-tramites.service.ts:46,176-178). Eliminar el registro es un borrado lógico; la única comprobación es que ningún contrato activo use la plantilla (409 `No se puede eliminar la plantilla porque está siendo utilizada por uno o más contratos`), así que un formato de ticket, que ningún contrato referencia, se puede eliminar siempre; el archivo .docx no se borra del disco en este endpoint (BE:plantillas/plantillas.service.ts:149-185).
- **Reglas de negocio:**
  1. Las plantillas de instalación se **siembran** solo al crear la empresa (si vienen vacías) y por migraciones en las existentes; si un estado queda sin plantilla activa o con WhatsApp y correo vacíos, ese aviso no sale (`instalaciones.service.ts:333-336`). ✅
  2. Un cambio de ajustes aplica de inmediato a los avisos siguientes del **backend**: `SettingsService.update` invalida la caché del servidor (`settings:findAll`) en cada `PATCH` (BE:settings/settings.service.ts:61-74,87-104). El **panel** guarda su propia copia de los ajustes durante 60 segundos (FE:composables/useSettings.js:4-35), de modo que pantallas como el formulario de ticket o el detalle pueden tardar hasta un minuto en reflejar un cambio hecho por otro usuario; no reescribe lo ya enviado. ✅
  3. `ticketApoyoGestiona` solo tiene efecto si `ticketApoyoHabilitado` está activo (lo comprueban ambos lados: `!!ajustes?.ticketApoyoHabilitado && !!ajustes?.ticketApoyoGestiona`). ✅
  4. La entidad de ajustes no contiene claves de plazos (SLA), vencimientos ni recordatorios de visitas o instalaciones, ni de campos obligatorios de estos formularios (búsqueda de `sla`, `vencim`, `recordatorio`, `visita`, `agenda` y `reprogram` en `settings/entities/setting.entity.ts`: sin claves de este dominio fuera de las de la tabla). ✅
  5. El canal WhatsApp (Baileys u Oficial) y el servidor de correo que usan todos estos avisos se configuran en Ajustes › Mensajería (MSG-015…MSG-019).
- **Casos límite y advertencias:**
  - La ruta de menú que citan los mensajes de error del backend (`Ajustes › Notificaciones por estado`) no coincide con la real (Ajustes › Plantillas › Instalación › Notificaciones por estado) (SOP-024).
  - Quien edite las plantillas de instalación sin la clave `variables.ver.plantilla.instalacion` no podrá: la pestaña no se muestra (solo SUPER-ADMINISTRADOR, o roles que ya la tengan guardada).
  - `PATCH /settings/:id` manda el objeto de ajustes completo desde la pestaña de notificaciones (`NotificacionesEstadoConfig.vue:121-132`): dos administradores guardando a la vez se pisan.
- **Preguntas probables de usuarios:**
  1. "¿Dónde cambio el mensaje de 'Instalación agendada'?" → Ajustes › Plantillas › Instalación › Notificaciones por estado.
  2. "¿Cómo hago que el cliente firme en el celular del técnico?" → Ajustes › Plantillas › Tickets › Firma del ticket.
  3. "¿Cómo activo técnicos de apoyo?" → Tickets › Técnicos de apoyo.
  4. "¿Puedo hacer obligatorios pasos antes de instalar?" → sí: Instalación › Checklist instalación (Obligatorio).
  5. "No veo la pestaña Instalación" → falta una clave que no existe en el catálogo: pedir a un SUPER-ADMINISTRADOR.
- **Pendiente de validar en UI:** ❓ aspecto de las cuatro pestañas de Ajustes › Tickets. Resueltos con el código: los valores iniciales de `plantillaTicketCliente`/`plantillaTicketTecnico` (nulos; el editor del panel arranca vacío) y la ubicación del archivo del Formato de Ticket (`static/uploads/images-services/`).

---

## Hallazgos del dominio

> Ronda de cierre (2026-10-25). Solo se recogen aquí los hallazgos de las secciones cerradas en esa ronda (SOP-008, 010, 023, 024, 028, 029 y 031); los de las demás secciones están en cada una.

- Cierre: **SOP-008** — ISPMAX no tiene tarea programada que sondee los trámites de firma: el estado cambia por el aviso del gateway (`POST /api/contratos-firma/webhook`, URL única por organización y compartida con contratos) o por el botón **Actualizar** (BE:firma-electronica/firma-tramites.service.ts:519-560). El plazo de vencimiento, el cobro por trámite y los estados reales los fija el gateway externo (fuera del ZIP). Sin `SIGNATURE_GATEWAY_WEBHOOK_SECRET` el aviso se acepta sin verificar y queda un warning en el log (`:765-776`).
- Cierre: **SOP-008** — El texto del banner "El enlace le llegó a {correo}" supone que el proveedor envió el correo; ISPMAX solo entrega correo y celular del firmante al gateway (BE:ticket/firma/tickets-firma.service.ts:146-185).
- Cierre: **SOP-010** — Los avisos del ticket por correo pasan por `EmailService.sendMessage` sin `omitirInterruptor`: con el canal de correo apagado en Mensajería fallan también en el **reenvío manual**, aunque el comentario del parámetro dice que `omitirInterruptor` es para el envío manual: el único llamador que lo pasa es el aviso de promesas de pago con el canal elegido por el usuario (BE:email/email.service.ts:229-235; BE:promesas-pago/promesas-pago-notificacion.service.ts:160-170; BE:ticket/ticket.service.ts:544-581; BE:instalaciones/instalaciones.service.ts:474-478).
- Cierre: **SOP-010** — Por el canal oficial, una plantilla inexistente o no aprobada, o una variable vacía (`hora_visita`, `ipv4`, `direccion`, `coordenadas_cliente`), solo deja un registro `fallido` en Mensajes Enviados: no hay campana ni log del cliente, a diferencia de la vía no oficial (BE:ticket/ticket.service.ts:274-308,457-489; BE:cloud-api/cloud-api.service.ts:1419-1520).
- Cierre: **SOP-010** — `plantillaTicketCliente`/`plantillaTicketTecnico` nacen nulas; sin texto, el aviso no oficial sale con mensaje vacío (WhatsApp) o correo en blanco (BE:settings/entities/setting.entity.ts:236-240).
- Cierre: **SOP-023** — El alta de cliente nuevo copia la pre-asignación sin comprobar disponibilidad; el alta sobre cliente existente sí comprueba IP/puerto y avisa con `Recursos pre-asignados no disponibles` (FE:clientes/AddCliente.vue:24-73 frente a FE:clientes/components/ServicioInternet.vue:902-962). Al completar, `construirPreAsignacionDesdeServicio` reescribe la pre-asignación con la `ipv6` real del servicio y deduce `ipv6_subneting` por la presencia de `/`, pero ya no escribe `subred_ipv6` (que el formulario de la instalación sí guardaba): la sub-red original no se conserva en la instalación INSTALADO (BE:customers/customers.service.ts:824-845; FE:instalaciones/components/SeccionPreAsignacion.vue:52,615).
- Cierre: **SOP-024** — El aviso **INSTALADO** va siempre por el gateway no oficial, solo si la empresa tiene `numero_whatsApp` guardado, sin registro en Mensajes Enviados ni campana; una empresa que opera solo con WhatsApp Oficial no lo recibe por WhatsApp (BE:customers/customers.service.ts:744-822). El reenvío manual de instalaciones no permite elegir canal (no hay `wa_provider`), al contrario que el de tickets (BE:instalaciones/instalaciones.service.ts:496-523).
- Cierre: **SOP-028** — `frontend-isp-main/src-capacitor` es un proyecto Capacitor base (`org.rnc.app`, "Red Nueva Conexion", `server.url` de desarrollo `http://192.168.1.42:9500`, solo permiso `INTERNET`): no contiene el plugin `Ispmax`, ni el servicio de jornada, ni la geolocalización nativa. El comentario del servicio backend ("No hay seguimiento con la app cerrada") es anterior a la jornada (BE:ubicacion-tecnicos/ubicacion-tecnicos.service.ts:24-30).
- Cierre: **SOP-028** — `POST /ubicacion-tecnicos` no valida que quien avisa tenga el rol `TECNICO` ni que haya jornada: esa regla vive solo en el panel (FE:composables/useLatidoUbicacion.js:33,168-171).
- Cierre: **SOP-029** — Los marcadores de técnicos son independientes de las demás capas y no se agrupan; la edad y el color solo se recalculan en cada consulta (cada 60 s) (FE:Gestion-Red/mapa-nap/IndexPage.vue:3946-3993).
- Cierre: **SOP-031** — El panel guarda los ajustes en memoria 60 s (`TTL_MS`); solo la pantalla Ajustes › Tickets invalida esa copia al guardar. El backend invalida su caché en cada `PATCH /settings/:id` (FE:composables/useSettings.js:4-35; BE:settings/settings.service.ts:87-104).
- Cierre: contraste con el manual — **guia/ubicacion-tecnicos.mdx** y **problemas/soporte/no-veo-la-ubicacion-de-un-tecnico.mdx** dicen que quien responde "Ahora no" "no aparecerá en el mapa": es cierto mientras no conceda el permiso, pero el aviso periódico comprueba el permiso en cada ciclo, así que empieza a avisar en cuanto lo concede (por ejemplo al marcar una visita) (FE:composables/useLatidoUbicacion.js:36-60,82-88,140).
- Cierre: contraste con el manual — **problemas/soporte/no-veo-la-ubicacion-de-un-tecnico.mdx** (fila "Sin visita marcada") describe "la última marca del técnico"; el backend toma la última marca **entre los tickets que no están CERRADO ni CANCELADO** (el filtro va antes del `DISTINCT ON`), por lo que una llegada en un ticket cerrado no oculta una llegada anterior en un ticket abierto (BE:ubicacion-tecnicos/ubicacion-tecnicos.service.ts:137-181).
- Cierre: contraste con el manual — **tareas/soporte/programar-y-completar-una-instalacion.mdx** (paso "Si la cédula ya es de un cliente…") manda a pulsar **Agregar Servicio**; con `?instalacion_id=` la ficha abre sola el modal **Nuevo Servicio** ya precargado (FE:clientes/components/editar/ServiciosPage.vue:133-174). La guía `guia/instalaciones.mdx` ("abre su pestaña Servicios con el formulario de un servicio nuevo precargado") sí lo describe bien.
- Cierre: contraste con el manual — **problemas/soporte/el-ticket-no-avisa.mdx** no menciona que, por el canal oficial, las fallas (plantilla sin aprobar o variable vacía como `hora_visita`) no generan campana, solo registro `fallido` en Mensajes Enviados, ni la causa "variable vacía" (BE:cloud-api/cloud-api.service.ts:1432-1470).

