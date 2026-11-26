# Inventario INC — Incidentes de red, caídas masivas, avisos a clientes y estado de la ONU

> Alcance: BE `incidentes-red/**`, `common/utils/estado-onu.util.ts`, `monitoreo-trafico/monitoreo-conexion.service.ts`, `monitoreo-dispositivos/**` (clientes por equipo y alertas), `router/router-monitor.service.ts` (solo el vínculo con incidentes), `avisos-grupo/avisos-grupo.service.ts` (solo los eventos de red), `smart-olt` (lectura de estado y señal), migraciones `1790100000000` a `1790600000000`; FE `mapa-nap/components/{ZonasIncidentes,AvisoEnvioDialog}.vue`, `layouts/AvisoMantenimientoProgress.vue`, `monitoreo-red/components/{ClientesDispositivo,ConfigNotificaciones}.vue`, `smartOLT/components/Api/WebhookSmartOlt.vue`, `ajustes/plantillas/components/AvisoMantenimiento.vue`, `clientes/components/editar/Servicios/ResumenOnu.vue`, `boot/version-nueva.js`. Generado desde el código `main-2026-11-04` (BE `f0d1ebf7`, FE `e7d5d06b`).
> Convención de citas: `FE:` = `frontend-isp-main/src/`, `BE:` = `backend-isp-main/src/`. `FE:MN/` = `FE:pages/dashboard/Gestion-Red/mapa-nap/components/`, `FE:MR/` = `FE:pages/dashboard/Gestion-Red/monitoreo-red/components/`, `BE:IR/` = `BE:incidentes-red/`. Todo lo marcado ✅ está leído en código; ❓ = pendiente de validar en pantalla o con el servicio real.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| INC-001 | Panel «Red» del mapa: lista de incidentes, detalle, historial y aviso superior | `/mapa-nap` → botón «Zonas y caídas masivas» | `index.mapa` (ver); `mapa.incidentes.gestionar` (gestionar) | completo |
| INC-002 | Detección automática de caídas masivas por agrupación (caja NAP, PON, router, zona, cercanía) | sin pantalla propia; interruptor «Detección automática» en el panel | `mapa.incidentes.gestionar` (interruptor) | completo |
| INC-003 | Incidentes por router sin conexión, antena o sector caído y PON caído | sin pantalla propia (aparecen en el panel) | `mapa.incidentes.gestionar` (cerrar) | completo |
| INC-004 | Declarar una falla o un mantenimiento a mano (inmediato o programado) | panel «Red» → «Declarar falla o mantenimiento» | `mapa.incidentes.gestionar` | completo |
| INC-005 | Editar, resolver, descartar o cancelar un incidente | panel «Red» → detalle del incidente | `mapa.incidentes.gestionar` | completo |
| INC-006 | Zonas del mapa (dibujar, renombrar, redibujar, eliminar) | panel «Red» → pestaña «Zonas» | `mapa.incidentes.gestionar` | completo |
| INC-007 | Aviso por WhatsApp a los clientes afectados (cola, canales, plantillas, resultado) | sin pantalla propia; se configura en el panel y en Ajustes → Plantillas | `mapa.incidentes.gestionar` | completo |
| INC-008 | Seguimiento y cancelación del envío (recuadro flotante y diálogo «Aviso a los clientes afectados») | recuadro flotante en todo el panel; detalle del incidente | `mapa.incidentes.gestionar` (cancelar) | completo |
| INC-009 | Respuesta del bot durante un incidente y aviso «ya volvió» a los que preguntaron | sin pantalla propia (chat de WhatsApp) | sin permiso | completo (canal externo ❓) |
| INC-010 | Avisos al equipo: campanita, Alertas de red por correo/WhatsApp y grupo de WhatsApp | campanita del panel; Monitoreo de Red → Alertas; Ajustes → Mensajería | `index.monitoreo_red`; ajustes del bot | completo |
| INC-011 | Webhook de SmartOLT (eventos en tiempo real) | `/smartOLT` → pestaña `API` → «Eventos en tiempo real (webhook)» | `smartOLT.index` (ver); `mapa.incidentes.gestionar` (guardar) | completo (servicio externo ❓) |
| INC-012 | Clientes que dependen de un equipo (antena, sector) en Monitoreo de Red | `/monitoreo-red` → detalle del dispositivo | `index.monitoreo_red`; `mapa.incidentes.gestionar` (editar) | completo |
| INC-013 | Plantillas «Aviso de mantenimiento» y «Aviso de caída masiva» | `/ajustes/plantillas` → pestañas homónimas | `mapa.incidentes.gestionar` (pestañas) | completo |
| INC-014 | Resumen de la ONU (estado, desde cuándo y señal) bajo el SN del servicio | `/clientes/edit/:client_id` → Servicios → columna «ONU SN»; barra del chat | sin permiso propio | completo (OLT ❓) |
| INC-015 | Estado de conexión y estado de la ONU guardados en cada servicio | sin pantalla propia (alimenta el mapa, el panel y el bot) | sin permiso | completo |
| INC-016 | Aviso de versión nueva de ISPMAX (recarga automática) | cualquier pantalla | sin permiso | completo |

## INC-001 · Panel «Red» del mapa

- **Ruta UI / name:** `/mapa-nap` · `index.mapa` · botón con icono `crisis_alert` (tooltip «Zonas y caídas masivas») sobre el mapa; se abre el panel «Red».
- **Archivos:** FE: `FE:MN/ZonasIncidentes.vue`, `FE:pages/dashboard/Gestion-Red/mapa-nap/IndexPage.vue:4600` · BE: `BE:IR/incidentes-red.controller.ts`, `BE:IR/incidentes-red.service.ts`.
- **Para qué sirve:** ver las caídas masivas y mantenimientos abiertos o programados, abrir su detalle (clientes afectados, causa, avisos) y consultar los cerrados.
- **Acceso:** el componente se monta con el mapa (`index.mapa`); las lecturas (`GET /incidentes-red`, `/:id`, `/zonas`, `/config`) solo piden sesión (`BE:IR/incidentes-red.controller.ts:15-25,45-48,75-83`). Los botones de gestión se muestran con `mapa.incidentes.gestionar` (`FE:pages/dashboard/Gestion-Red/mapa-nap/IndexPage.vue:1233`); el servidor exige ese permiso o el rol SUPER-ADMINISTRADOR (`BE:IR/incidentes-red.service.ts:82-87`).
- **Secciones / pestañas:** cabecera «Red»; pestañas «Incidentes (N)» y «Zonas (N)» (`FE:MN/ZonasIncidentes.vue:922`); lista, detalle y «Ver las cerradas».
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | (botón `crisis_alert`) | abre el panel; insignia roja si hay alguna falla, ámbar si solo mantenimientos | ver | `GET /incidentes-red?estado=abierto` | se recarga cada 60 s (`ZonasIncidentes.vue:156`) |
  | Volver | cierra el detalle | ver | — | — |
  | Ver las cerradas | lista los últimos 30 incidentes no abiertos | ver | `GET /incidentes-red?estado=todos&limite=30` | filtra `estado !== 'abierto'` (`:135-141`) |
  | Chips En línea / Sin conexión / Sin datos (N) y «Todos» | filtran los clientes afectados (se pueden combinar) | ver | — | `:616-628` |
  | Buscar cliente, dirección o celular | filtra por texto sin tildes | ver | — | solo si hay más de 5 afectados (`:1066`) |
  | clic en un afectado | el mapa vuela a su punto y muestra su nombre | ver | — | sin coordenadas: «Este cliente no tiene coordenadas» |
- **Estados posibles:** `programado`, `abierto`, `resuelto`, `descartado` (`BE:IR/entities/incidente-red.entity.ts:5`). Panel: «abierto» incluye programados (`BE:IR/incidentes-red.service.ts:144`).
- **Reglas de negocio:** el aviso rojo superior («N caída(s) masiva(s) · ⚡ N corte(s) de luz · N mantenimiento(s)») solo aparece con el panel cerrado y sin dibujar, y no cuenta los programados (`ZonasIncidentes.vue:70-76,879-890`). Colores: mantenimiento ámbar `#f59e0b`, corte de luz violeta `#7c3aed`, otras fallas rojo `#dc2626` (`:196-198`). Nombre según causa: «Mantenimiento», «Probable corte de luz», «Probable fibra cortada», «Router sin conexión», «Antena sin respuesta», «Caída masiva» (`:211-223`). Niveles: Router, Puerto PON, Antena / sector, Caja NAP, Zona, Clientes cercanos, Área marcada (`:186-194`). Detalle: afectados con estado de conexión, quién preguntó al bot (`BE:IR/incidentes-red.service.ts:153-173`).
- **Efectos secundarios externos:** ninguno al consultar.
- **Mensajes de error/éxito (texto exacto):** «No se pudo abrir el incidente»; «No hay caídas masivas abiertas.»; «Se detectan solas cuando varios clientes de la misma caja, router, zona o cuadra se quedan sin conexión a la vez.»; «Todavía no hay incidentes cerrados.»; «Ningún afectado coincide con "…".»; «Ningún afectado con ese estado.».
- **Relaciones con otros módulos:** mapa (capas de zonas, áreas, puntos y etiquetas `#N título`), bot (diagnóstico), Monitoreo de Red.
- **Casos límite y advertencias:** «Ver las cerradas» incluye también los programados (el filtro solo excluye `abierto`) y los rotula «falsa alarma» al no ser `resuelto` (`:1165-1185`) ❓ a comprobar en pantalla.
- **Preguntas probables de usuarios:** ¿Dónde veo las caídas masivas? · ¿Qué significa el aviso rojo arriba del mapa? · ¿Por qué un incidente está en violeta? · ¿Dónde veo los mantenimientos programados? · ¿Cómo sé a quién afecta?
- **Pendiente de validar en UI:** ❓ aspecto real del panel y del mapa (Mapbox).

## INC-002 · Detección automática de caídas masivas

- **Ruta UI / name:** sin pantalla; interruptor «Detección automática» en la lista de incidentes.
- **Archivos:** BE: `BE:IR/deteccion-masiva.service.ts`, `BE:monitoreo-trafico/monitoreo-conexion.service.ts`, `BE:IR/geo.util.ts`, migración `1790100000000-IncidentesRedZonas.ts` · FE: `FE:MN/ZonasIncidentes.vue:82-94`.
- **Para qué sirve:** abrir un incidente cuando varios clientes que estaban en línea se caen a la vez en el mismo lugar.
- **Acceso:** interruptor visible con `mapa.incidentes.gestionar`; `PATCH /incidentes-red/config` exige el permiso (`BE:IR/incidentes-red.controller.ts:50-54`). Valor guardado en `settings.incidentes_auto` (por defecto `true`, `BE:migrations/1790100000000-IncidentesRedZonas.ts`).
- **Reglas de negocio (backend):**
  - Cron `*/5 * * * *` con retraso aleatorio de hasta 45 s; lee SmartOLT, AdminOLT y las sesiones PPPoE de cada router y guarda `online` / `offline` / `sin_datos` (`BE:monitoreo-trafico/monitoreo-conexion.service.ts:51-146`). Después llama a `DeteccionMasivaService.procesar()` (`:143-146`).
  - Servicios considerados: activos, no borrados, con estado `online` u `offline`; los que llevan más de 24 h sin conexión se descartan (`BE:IR/deteccion-masiva.service.ts:18,527-570`).
  - «Caída nueva»: sin conexión, estaba en línea en la pasada anterior (`conexion_caida.tras_online`) y empezó hace 15 min o menos (`:16,566`).
  - Umbrales (mínimo de caídos nuevos y proporción sobre el total del grupo): router 8 y 50 %; PON 4 y 50 %; caja NAP 3 y 50 %; zona 4 y 30 %; cercanía 4 y 50 % dentro de 300 m, para los caídos que no entraron en un grupo anterior y tienen coordenadas (`:20-29`). Orden de agrupación: router, PON, caja NAP, zona, cercanía (`:228-234`).
  - Cercanía: radio del área = máx(150, distancia al punto más lejano + 100) m (`:605-640`).
  - Los incidentes abiertos suman a los que se caen después en el mismo grupo (`:134-139`, `:493-525`).
  - Cierre automático: cuando vuelve a estar en línea al menos el 80 % de los afectados (`ceil`), solo en `origen = 'auto'`, `tipo = 'falla'` y causa distinta de `router` y `antena` (`:31,158-172`).
  - Falsa alarma: los servicios de un incidente descartado hace menos de 60 min no arman otro (`:33,213-217`).
  - Con el interruptor apagado se siguen sumando y cerrando los abiertos, pero no se crean nuevos por agrupación (`:210`). No afecta a los incidentes por router caído, antena o PON caído por evento.
  - Causa probable: si el 60 % o más de los caídos tiene `estado_onu = power_fail` → `energia`; si el 60 % o más `los` → `fibra`; si no, sin causa (`:40,50-57`). Se recalcula al sumarse caídos nuevos (`:146-152`).
  - Título: «Router …», «PON …», «Caja NAP …», «Zona …» o «Clientes cercanos», más « · zona» si el centro cae en una zona dibujada (`:631-660`).
  - Lock entre instancias: `tomarLockCron('monitoreo-conexion:detectar')` (`BE:monitoreo-trafico/monitoreo-conexion.service.ts:59`, tabla `cron_locks`).
- **Efectos secundarios externos:** consultas a SmartOLT/AdminOLT y a los routers (PPPoE); al abrirse, avisos de INC-010.
- **Mensajes de error/éxito (texto exacto):** «Detección automática encendida»; «Detección automática apagada: solo quedan las que declares a mano»; «No se pudo cambiar».
- **Relaciones con otros módulos:** SmartOLT, AdminOLT, routers, cajas NAP, mapa (zonas).
- **Casos límite y advertencias:** clientes sin router, sin caja, sin PON y sin coordenadas no entran en ningún grupo; sin SmartOLT/AdminOLT/PPPoE un servicio queda `sin_datos` y no cuenta.
- **Preguntas probables de usuarios:** ¿Cuántos clientes tienen que caerse para que se declare una caída masiva? · ¿Cada cuánto revisa? · ¿Cómo apago la detección automática? · ¿Por qué no se abrió el incidente si se cayeron 5 clientes? · ¿Cuándo se cierra solo?
- **Pendiente de validar en UI:** ❓ comportamiento con una OLT real (SmartOLT/AdminOLT) y con routers reales.

## INC-003 · Incidentes por router, antena o sector y PON caído

- **Ruta UI / name:** sin pantalla; aparecen en el panel «Red» como «Router sin conexión» y «Antena sin respuesta»; el PON caído como «Puerto PON».
- **Archivos:** BE: `BE:IR/deteccion-masiva.service.ts:285-330,341-415,427-490`, `BE:router/router-monitor.service.ts`, `BE:IR/smartolt-eventos.service.ts:224-246`.
- **Para qué sirve:** abrir un incidente cuando cae el equipo que da servicio a un grupo de clientes, aunque la OLT los vea en línea.
- **Acceso:** automático; cerrarlos a mano exige `mapa.incidentes.gestionar`.
- **Reglas de negocio (backend):**
  - Router: el monitor de routers (cada 5 min) lo marca sin conexión tras 2 fallos y fuera de una «tormenta» y sin autorreparación → `abrirPorRouter` abre un incidente con todos sus servicios activos, causa `router`, inicio en `caido_desde` (`BE:IR/deteccion-masiva.service.ts:285-316`, `BE:router/router-monitor.service.ts`, diff de la tormenta: 3 o más routers a la vez). Al recuperarse el router se cierra (`cerrarPorRouter`, `:319-331`).
  - Antena/sector: cron cada minuto; para los dispositivos de Monitoreo de Red con clientes activos asignados, si el dispositivo está `offline` abre el incidente (causa `antena`, título «Antena/Sector/Radio/Enlace/Torre/Equipo + nombre»); si vuelve a `online` cierra los automáticos (`:341-415`).
  - PON: los eventos `pon.outage_started` y `pon.outage_ended` de SmartOLT abren o cierran el incidente del PON; si ya había uno que cubre al menos la mitad de los clientes del PON, solo se completa la causa (`:427-490`, `BE:IR/smartolt-eventos.service.ts:110-117`).
  - Estos incidentes no se cierran por la regla del 80 %: los cierra el monitor de routers, el cron de antenas o el evento del PON (`:158-165`).
- **Efectos secundarios externos:** SmartOLT (webhook); avisos de INC-010 (para router y antena el grupo de WhatsApp usa sus propios eventos `router_caido` y `antena_caida`, `:117-120`).
- **Mensajes de error/éxito (texto exacto):** chips del detalle «El sistema no se comunica con el router», «El Monitoreo de Red no recibe respuesta del equipo» y sus tooltips (`ZonasIncidentes.vue:~1000-1030`).
- **Casos límite y advertencias:** «Router sin conexión» puede ser una falsa alarma si solo falla el acceso de administración: se descarta como falsa alarma (texto del aviso). El aviso a todos los afectados (INC-007) no se manda en los de router.
- **Preguntas probables de usuarios:** ¿Por qué se abrió un incidente cuando se cayó un router? · ¿Se cierra solo el de la antena? · ¿Qué hago si el router sí tiene internet?
- **Pendiente de validar en UI:** ❓ con routers, OLT y antenas reales.

## INC-004 · Declarar una falla o un mantenimiento a mano

- **Ruta UI / name:** panel «Red» → «Declarar falla o mantenimiento» (también desde el menú ⋮ de cada zona).
- **Archivos:** FE: `FE:MN/ZonasIncidentes.vue:746-808,1282-1380` · BE: `BE:IR/incidentes-red.service.ts:211-325`, `BE:IR/dto/incidentes-red.dto.ts:45-86`.
- **Para qué sirve:** registrar una falla conocida o un mantenimiento (ya o en una fecha futura) sobre una zona, una caja NAP o un área dibujada, para que el bot y los clientes lo sepan.
- **Acceso:** `mapa.incidentes.gestionar` (botón y servidor).
- **Campos de formulario:**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Mantenimiento / Falla | botones | sí | `falla` o `mantenimiento` | por defecto Mantenimiento |
  | ¿Dónde? | opciones | sí | Zona (si hay zonas) · Caja NAP (si hay cajas en el mapa) · Dibujar el área | el DTO admite también `router_id`; la pantalla no lo ofrece |
  | Zona / Caja NAP | selector con búsqueda | según opción | — | zona muestra «nombre (N clientes)» |
  | Dibujar en el mapa / Volver a dibujar | botón | según opción | polígono con al menos 3 puntos | «✓ Área marcada» |
  | Qué les dice el bot a los afectados (opcional) | texto | no | máx. 1000 | ejemplos en el hint |
  | Empieza (vacío = ahora) | fecha y hora | no | solo Mantenimiento | «Si es más adelante, queda programado y se activa solo a esa hora.» |
  | Hora estimada de fin (opcional) | fecha y hora | no | debe ser posterior al inicio | — |
  | Avisar a los clientes afectados por WhatsApp | selector | no | No avisar · Al registrarlo · 1 hora antes · 3 horas antes · 1 día antes (0, 1, 3, 24 h) | solo Mantenimiento (`:760-770`) |
  | Registrar | botón | — | deshabilitado hasta elegir zona, caja o área | — |
- **Reglas de negocio (backend):**
  - Afectados: servicios activos (`isActive`) no borrados dentro de la zona/área (con coordenadas) o de la caja NAP; sin ninguno, se rechaza (`:211-273`, `:437-455`).
  - Inicio más de 1 minuto en el futuro → estado `programado`; si no, `abierto` (`:275-278`). Se abre solo en la primera revisión de conexión posterior a esa hora (`BE:IR/deteccion-masiva.service.ts:247-281`).
  - `fin_estimado` debe ser posterior al inicio (`:279-281`).
  - Un incidente manual nunca se cierra solo (`origen = 'manual'`).
  - Al registrar se avisa al grupo de WhatsApp (evento `caida_masiva`) y, si corresponde, se arma el aviso a los clientes (`:303-323`).
- **Efectos secundarios externos:** grupo de WhatsApp, WhatsApp de la empresa (INC-007).
- **Mensajes de error/éxito (texto exacto):** éxito «Mantenimiento programado para {fecha}: N cliente(s) afectados» o «{Mantenimiento|Falla} registrada: N cliente(s) afectados»; error «No se pudo registrar»; servidor: «Elige la zona, la caja NAP, el router o dibuja el área afectada», «La zona no existe», «La caja NAP no existe», «La hora de inicio no es válida», «La hora de fin tiene que ser después del inicio», «En … no hay clientes con el servicio activo (…). No hace falta avisarles: el bot ya les explica el corte.», «En … no hay clientes[ con coordenadas].», «El área debe tener al menos 3 puntos».
- **Preguntas probables de usuarios:** ¿Cómo aviso de un mantenimiento a mis clientes? · ¿Cómo programo un mantenimiento para esta noche? · ¿Por qué dice que no hay clientes en la zona? · ¿Puedo declarar una falla de un router? · ¿Cuándo sale el aviso?
- **Pendiente de validar en UI:** ❓ dibujo del área sobre el mapa real.

## INC-005 · Editar, resolver, descartar o cancelar un incidente

- **Ruta UI / name:** detalle del incidente en el panel «Red».
- **Archivos:** FE: `FE:MN/ZonasIncidentes.vue:660-720` · BE: `BE:IR/incidentes-red.service.ts:327-369`.
- **Para qué sirve:** ajustar lo que dice el bot y la hora estimada, y cerrar el incidente.
- **Acceso:** `mapa.incidentes.gestionar`; sin él los campos quedan de solo lectura (`:readonly="!puedeGestionar"`).
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Guardar | guarda mensaje al cliente y hora estimada | gestionar | `PATCH /incidentes-red/:id` | hora nueva reinicia el aviso de «pasó su hora estimada»; vacío = sin hora |
  | Resuelto | cierra como `resuelto`; avisa «ya volvió» a quienes preguntaron | gestionar | `POST /incidentes-red/:id/resolver` | si estaba `abierto`: aviso al bot y al grupo |
  | Falsa alarma | cierra como `descartado`; el bot vuelve a revisar cada cliente | gestionar | `POST /incidentes-red/:id/descartar` | evita que los mismos servicios armen otro durante 60 min |
  | Cancelar mantenimiento | solo en `programado`: cierra como `descartado`, no se activa ni sale el aviso pendiente | gestionar | `POST …/descartar` | — |
- **Reglas de negocio (backend):** un incidente ya cerrado no se puede cerrar de nuevo («El incidente ya está cerrado», `:348`); título y notas editables por API, la pantalla edita mensaje y hora (`:327-342`); «pasó su hora estimada» se avisa una vez a la campanita (`BE:IR/deteccion-masiva.service.ts:174-184`).
- **Efectos secundarios externos:** WhatsApp (aviso «ya volvió»), grupo.
- **Mensajes de error/éxito (texto exacto):** «Guardado: el bot ya lo usa con los afectados»; «No se pudo guardar»; «No se pudo cerrar»; diálogos «Marcar como resuelto», «Descartar (falsa alarma)», «Cancelar el mantenimiento» con sus textos (`:678-700`); «Volver».
- **Preguntas probables de usuarios:** ¿Cómo cierro un incidente? · ¿Qué diferencia hay entre Resuelto y Falsa alarma? · ¿Cómo cancelo un mantenimiento? · ¿Por qué el incidente sigue abierto?
- **Pendiente de validar en UI:** —

## INC-006 · Zonas del mapa

- **Ruta UI / name:** panel «Red» → pestaña «Zonas».
- **Archivos:** FE: `FE:MN/ZonasIncidentes.vue:795-875,1186-1280` · BE: `BE:IR/incidentes-red.service.ts:91-138`, `BE:IR/entities/zona-red.entity.ts`, `BE:IR/geo.util.ts`.
- **Para qué sirve:** dibujar barrios o sectores para nombrar las caídas, agrupar clientes sin caja NAP y declarar mantenimientos por zona.
- **Acceso:** ver: sesión; crear/editar/eliminar: `mapa.incidentes.gestionar`.
- **Botones y acciones:** «Mostrar las zonas en el mapa» (preferencia guardada en el navegador, `mapa-nap:ver-zonas`); «Dibujar una zona nueva»; por zona: «Ver en el mapa», menú ⋮ → «Declarar falla o mantenimiento», «Nombre y color», «Volver a dibujar el área», «Eliminar».
- **Campos de formulario:** «Nombre (barrio, sector…)» (máx. 120, obligatorio), color (8 opciones: `#1e88e5 #8e24aa #00897b #f4511e #6d4c41 #3949ab #c0ca33 #d81b60`), «Notas (opcional)». Guía de dibujo: «Clic para marcar cada esquina · clic en la primera (o doble clic) para cerrar · Esc para cancelar».
- **Reglas de negocio (backend):** polígono válido = al menos 3 puntos distintos con coordenadas numéricas (`geo.util.ts:poligonoValido`); borrado lógico (`softDelete`); el listado cuenta clientes activos con coordenadas dentro y cuántos están sin conexión (`:91-104`).
- **Mensajes de error/éxito (texto exacto):** «Zona guardada»; «Ponle un nombre a la zona»; «Área de la zona actualizada»; «No se pudo guardar la zona»; «No se pudo actualizar el área»; «No se pudo eliminar»; «El área debe tener al menos 3 puntos»; «La zona no existe»; diálogo «Eliminar zona» («¿Eliminar la zona "…"? Los clientes no se tocan; solo deja de dibujarse y de usarse para agrupar caídas.»).
- **Casos límite y advertencias:** la pestaña «ZONAS» de SmartOLT es otra cosa (catálogo de zonas de la OLT).
- **Preguntas probables de usuarios:** ¿Cómo dibujo una zona? · ¿Para qué sirven las zonas? · ¿Cómo borro una zona? · ¿Cuántos clientes hay en una zona?
- **Pendiente de validar en UI:** ❓ dibujo con Mapbox GL Draw.

## INC-007 · Aviso por WhatsApp a los clientes afectados

- **Ruta UI / name:** sin pantalla propia: opción en «Declarar falla o mantenimiento» (mantenimiento), interruptor «Avisar a los afectados por WhatsApp» (caída masiva) y plantillas en Ajustes → Plantillas.
- **Archivos:** BE: `BE:IR/avisos-clientes.service.ts`, `BE:IR/incidentes-texto.util.ts`, `BE:IR/entities/incidente-aviso.entity.ts`, migraciones `1790300000000`, `1790400000000`, `1790500000000` · FE: `FE:MN/ZonasIncidentes.vue:95-110,225-248`.
- **Para qué sirve:** avisar por WhatsApp a todos los clientes (no solo a los que escriben) de un mantenimiento o de una caída masiva detectada sola.
- **Acceso:** `mapa.incidentes.gestionar` para activar el interruptor (`PATCH /incidentes-red/config`).
- **Reglas de negocio (backend):**
  - Mantenimiento: `aviso_previo_horas` 0, 1, 3 o 24; 0 = al registrarlo; N = desde N horas antes del inicio (`avisos-clientes.service.ts:34-38`). Un cron cada minuto revisa los programados dentro de la revisión de conexión (`deteccion-masiva.service.ts:247-255`).
  - Caída masiva automática: con `settings.incidentes_aviso_proactivo` encendido, a los 10 min de abierta, si es `falla`, `auto`, causa distinta de `router` y aún sin aviso (`deteccion-masiva.service.ts:38,192-208`).
  - Cola: una fila por **cliente** (`DISTINCT ON customers.id`), teléfono convertido con `convertirFormatoTelefono`; con menos de 10 dígitos queda `sin_celular` (`avisos-clientes.service.ts:132-166`). Estados: `pendiente`, `enviado`, `fallido`, `sin_celular`, `cancelado`.
  - Despacho (cron cada minuto, lock `incidentes-red:avisos`): WhatsApp Oficial hasta 30 por minuto con 1 s de pausa; por QR uno cada 2 minutos; sin canal conectado se reintenta cada minuto (`:23-26,172-224`).
  - Plantillas: texto de `settings.plantillaAvisoMantenimiento` / `plantillaAvisoFalla` o el de fábrica; variables mantenimiento `cliente`, `empresa`, `inicio`, `fin` («que terminemos (te avisaremos)» si no hay hora); caída `cliente`, `empresa`, `inicio`, `causa` («por un corte de energía eléctrica», «por un daño en la fibra óptica», «por una falla en la antena que te da servicio», «por una falla en la red») (`:226-262`, `incidentes-texto.util.ts:39-65`). Oficial: plantillas `aviso_mantenimiento` y `aviso_falla`.
  - Al cerrarse el incidente, lo pendiente se cancela con el error «El mantenimiento se cerró antes de terminar el aviso» (`:189-193`); al terminar, campanita «📣 Terminó el aviso del mantenimiento|de la caída #N» (`:339-356`).
- **Efectos secundarios externos:** WhatsApp (Oficial vía Cloud API o QR vía `HOST_API_WHATSAPP/api/whatsapp/send`); Meta cobra cada envío Oficial (texto de la pantalla).
- **Mensajes de error/éxito (texto exacto):** «Se avisará por WhatsApp a los afectados de las caídas que duren más de 10 minutos»; «Aviso a los afectados apagado: solo se les responde a los que escriben»; tooltips del interruptor (`ZonasIncidentes.vue:~1115-1128`).
- **Preguntas probables de usuarios:** ¿Cómo aviso a mis clientes de un mantenimiento? · ¿Se avisa a todos si hay una caída? · ¿Cada cuánto sale un mensaje? · ¿Por qué un cliente no recibió el aviso?
- **Pendiente de validar en UI:** ❓ envío real por WhatsApp Oficial y por QR.

## INC-008 · Seguimiento y cancelación del envío

- **Ruta UI / name:** recuadro flotante abajo a la izquierda (todo el panel) y diálogo «Aviso a los clientes afectados» desde el detalle del incidente.
- **Archivos:** FE: `FE:layouts/AvisoMantenimientoProgress.vue`, `FE:MN/AvisoEnvioDialog.vue`, `FE:MN/ZonasIncidentes.vue:233-248` · BE: `BE:IR/avisos-clientes.service.ts:264-315`.
- **Para qué sirve:** ver cuántos avisos van, a quién se envió, qué falló y detener lo que falta.
- **Acceso:** ver: sesión; «Cancelar envío»: `mapa.incidentes.gestionar` (`AvisoMantenimientoProgress.vue:15`, `AvisoEnvioDialog.vue:20`).
- **Botones y acciones:** recuadro «Avisando caída masiva #N» / «Avisando mantenimiento #N» con contador `enviados+fallidos / total−sin celular`, porcentaje, «Próximo mensaje en m:ss (uno cada 2 min por el WhatsApp del QR)» o «Enviando…», «N fallaron», «N aviso(s) más en cola», minimizar, «Ver mensajes», «Cancelar envío». Diálogo: filtros «Todos (N)», «Enviados (N)», «Por enviar (N)», «Fallaron (N)», «Sin celular (N)», «Cancelados (N)»; columnas Cliente, Teléfono, Estado, Fecha, Mensaje; insignias enviado, falló, por enviar, sin celular, cancelado, y Oficial / No oficial; se refresca cada 5 s abierto. Recuadro se actualiza cada 15 s.
- **Reglas de negocio (backend):** `GET /incidentes-red/avisos/progreso` (envíos con pendientes), `GET /:id/avisos`, `POST /:id/avisos/cancelar` (exige permiso); cancelar marca lo pendiente como `cancelado` con el error «Cancelado desde el panel» y no revierte lo enviado.
- **Mensajes de error/éxito (texto exacto):** «Cancelar envío» / «¿Detener el aviso a los clientes que faltan? Los mensajes ya enviados no se revierten.» («No» / «Sí, cancelar»); «No se pudo cancelar»; «No hay mensajes en esta lista.»; chip del detalle «Aviso por WhatsApp: N de M enviados · faltan N, N fallaron, N sin celular, N cancelados», «Aviso por WhatsApp: preparando el envío…», «Aviso por WhatsApp a los afectados: {fecha}».
- **Preguntas probables de usuarios:** ¿Cómo veo a quién se envió el aviso? · ¿Cómo detengo el envío? · ¿Por qué el aviso sale tan lento?
- **Pendiente de validar en UI:** ❓ aspecto del recuadro.

## INC-009 · Respuesta del bot durante un incidente y aviso «ya volvió»

- **Ruta UI / name:** sin pantalla (chat de WhatsApp del cliente).
- **Archivos:** BE: `BE:pagos/cobro-bot/diagnostico-bot.service.ts:120-137,257-290`, `BE:IR/incidentes-red.service.ts:379-433`, `BE:IR/avisos-clientes.service.ts:76-127`.
- **Para qué sirve:** que el bot diga «ya se sabe» a los afectados que escriben, no abra un reporte técnico por cada uno y les avise cuando el servicio vuelve.
- **Acceso:** sin permiso de pantalla: lo usa el bot cuando un cliente escribe por WhatsApp; el aviso «ya volvió» sale al cerrar el incidente (`mapa.incidentes.gestionar` para cerrarlo).
- **Reglas de negocio (backend):** el diagnóstico busca un incidente `abierto` que incluya al servicio (o comparta caja, router, PON, antena, zona o área); con el equipo del cliente en línea solo valen los declarados a mano y los de causa `router` o `antena`; un corte de luz del sector solo se usa si el equipo del cliente está sin energía o sin datos (`diagnostico-bot.service.ts:120-137`). Se anota la consulta (servicio, hora, sesión y chat) en `consultas` (`incidentes-red.service.ts:408-420`). Texto que recibe la IA: mantenimiento, corte de energía, router, antena, fibra o falla general, más «La empresa informa: "…"» y la hora estimada si hay (`:257-290`). «Ya volvió»: a las consultas de las últimas 23 h, una vez por incidente, por `HOST_API_WHATSAPP/api/bot/aviso-chat`, con pausa de 1,5 s (`avisos-clientes.service.ts:17-18,76-118`); no se manda al descartar.
- **Efectos secundarios externos:** WhatsApp (bot).
- **Pendiente de validar en UI:** ❓ conversación real con el bot.

## INC-010 · Avisos al equipo

- **Ruta UI / name:** campanita del panel; Monitoreo de Red → botón «Alertas»; Ajustes → Mensajería (grupo de avisos).
- **Acceso:** campanita: usuarios activos con rol SUPER-ADMINISTRADOR o ADMINISTRADOR; «Alertas»: quien abre Monitoreo de Red (`index.monitoreo_red`); grupo: permisos del bot y de los avisos (Ajustes → Mensajería).
- **Archivos:** BE: `BE:monitoreo-dispositivos/monitoreo-dispositivos-notifier.service.ts:160-215`, `BE:IR/deteccion-masiva.service.ts:117-120,682-761`, `BE:avisos-grupo/avisos-grupo.service.ts` · FE: `FE:MR/ConfigNotificaciones.vue`.
- **Reglas de negocio (backend):**
  - Campanita: usuarios activos con rol SUPER-ADMINISTRADOR o ADMINISTRADOR (`notifier:741-748`).
  - Correo/WhatsApp (Alertas de red): solo si «Enviar alertas de red por correo y WhatsApp» está activo y hay destinos; la recuperación solo con «Avisar también cuando vuelva…»; los incidentes se avisan apenas se detectan (sin el retardo «Antes de avisar», que es solo para equipos); con WhatsApp Oficial sale la plantilla `alerta_red` (variables `empresa`, `alerta`, `resumen`, `hora`) (`notifier:165-215,534-560`).
  - Grupo de WhatsApp (canal no oficial; lo elige Ajustes → Mensajería): eventos `caida_masiva`, `caida_resuelta`, `router_caido`, `antena_caida`; los incidentes de router y antena no repiten el aviso de caída masiva (`deteccion-masiva.service.ts:117-120`).
  - Solo las caídas detectadas (automáticas) llaman a la campanita y a las Alertas de red; las declaradas a mano avisan al grupo (`incidentes-red.service.ts:303-319`).
- **Mensajes (texto exacto):** «🔴 Posible caída masiva #N», «⚡ Probable corte de luz #N», «🔴 Probable fibra cortada #N», «📡 Router sin conexión #N», «📶 {título} sin respuesta #N», «🟢 Volvió la energía #N», «🟢 El router volvió #N», «🟢 {título} volvió #N», «🟢 Se restableció la caída #N», «⏰ El incidente #N pasó su hora estimada», «🛠 Empezó el mantenimiento #N», «📣 Terminó el aviso del mantenimiento|de la caída #N», «⚠️ SmartOLT no lee la OLT …». Texto del interruptor «Enviar alertas de red por correo y WhatsApp» y aclaración («Avisa cuando se cae un equipo monitoreado (antena, radio, backhaul) y cuando se detecta una caída masiva de clientes (corte de luz, fibra cortada o falla de la red).») (`ConfigNotificaciones.vue:221-231`).
- **Pendiente de validar en UI:** ❓ correo, WhatsApp y grupo reales.

## INC-011 · Webhook de SmartOLT

- **Ruta UI / name:** `/smartOLT` → pestaña `API` → bloque «Eventos en tiempo real (webhook)».
- **Archivos:** FE: `FE:pages/dashboard/Gestion-Red/smartOLT/components/Api/WebhookSmartOlt.vue` · BE: `BE:IR/smartolt-eventos.controller.ts`, `BE:IR/smartolt-eventos.service.ts`.
- **Para qué sirve:** que SmartOLT avise al instante de cambios de estado de ONU y PON caídos, en vez de esperar la revisión de 5 minutos.
- **Acceso:** ver: `smartOLT.index`; guardar o quitar el «Signing secret»: `mapa.incidentes.gestionar` (FE `WebhookSmartOlt.vue:18,120`; BE `smartolt-eventos.controller.ts:67-76`).
- **Campos de formulario:** URL (solo lectura, con copiar), «Signing secret (whsec_…)» / «Cambiar el Signing secret» (contraseña), botones Guardar y Quitar. Insignia «Configurado» / «Sin configurar».
- **Reglas de negocio (backend):**
  - URL: `${DOMINIO}/api/smart-olt-eventos/webhook` (sin la variable no hay URL, `smartolt-eventos.controller.ts:51-65`).
  - Sin login: se acepta solo con firma Standard Webhooks (cabeceras `webhook-id`, `webhook-timestamp`, `webhook-signature`; HMAC-SHA256 base64 de `id.ts.cuerpo` con el secreto sin `whsec_`); tolerancia de reloj 10 min (`smartolt-eventos.service.ts:12-13,45-86`).
  - Rechazo: responde 401 «Invalid signature» y guarda el motivo para la pantalla: «Llegan eventos de SmartOLT pero en ISPMAX no está guardado el Signing secret», «Llegó un pedido sin la firma de SmartOLT», «La hora del evento no coincide con la del servidor (revisa el reloj del servidor)», «La firma no coincide: el Signing secret guardado en ISPMAX no es el de SmartOLT».
  - Eventos: `onu.status_changed` (actualiza `estado_conexion`, `estado_onu` y el historial de caídas de los servicios activos con ese SN y `onu_source = 'smartOLT'` o vacío, y programa la detección al minuto), `pon.outage_started`, `pon.outage_ended`, `olt.status_stale` (campanita y grupo «OLT sin conexión: …»), `olt.status_fresh`, `webhook.test`. Responde 200 enseguida y procesa aparte; descarta `webhook-id` repetidos (últimos 1000) (`:99-203`).
  - AdminOLT no tiene webhook: se revisa solo cada 5 min.
- **Mensajes de error/éxito (texto exacto):** «Signing secret guardado», «Webhook desconectado», «URL copiada», «No se pudo copiar», «No se pudo guardar»; «Primero guarda arriba el dominio y la API KEY de SmartOLT.»; «Falta la variable DOMINIO del servidor (la dirección pública del sistema): pídesela a soporte.»; «Último evento: hace … (tipo)», «Todavía no llegó ningún evento.»; «No se pudo cargar esta configuración: el servidor todavía no tiene esta función (hay que actualizarlo o reiniciarlo).».
- **Pasos en SmartOLT (texto de la pantalla):** General › API key › Editar → panel Webhook → pegar la URL y marcar solo ONU status changed, PON outage started, PON outage ended y OLT statuses out of date → copiar el Signing secret (`whsec_`) → «Send test event».
- **Pendiente de validar en UI:** ❓ SmartOLT real (formato del evento, nombres de campos).

## INC-012 · Clientes que dependen de un equipo

- **Ruta UI / name:** `/monitoreo-red` → detalle del dispositivo → «Clientes que dependen de este equipo».
- **Archivos:** FE: `FE:MR/ClientesDispositivo.vue`, `FE:MR/DetalleDispositivo.vue` · BE: `BE:monitoreo-dispositivos/monitoreo-dispositivos.controller.ts`, `BE:monitoreo-dispositivos/monitoreo-dispositivos.service.ts`.
- **Para qué sirve:** asignar a una antena o sector los clientes que dependen de ella, para abrir una caída masiva si deja de responder.
- **Acceso:** `index.monitoreo_red`; agregar/quitar solo con `mapa.incidentes.gestionar` (FE `ClientesDispositivo.vue:17,99,143`).
- **Campos de formulario:** «Agregar cliente (nombre, cédula, IP o dirección)» (mín. 2 letras, 25 resultados); botón ✕ «Quitar de este equipo».
- **Reglas de negocio (backend):** `GET :id/clientes`, `PATCH :id/clientes` (reemplaza la lista, hasta 2000 servicios; los demás se quitan), `GET buscar-clientes` (nombre, documento, IPv4 o dirección). Un servicio pertenece a un solo equipo: al elegirlo desde otro se avisa «{cliente} estaba en "{equipo}": queda en este equipo». Solo cuentan los servicios activos al abrir el incidente (`deteccion-masiva.service.ts:341-415`).
- **Mensajes (texto exacto):** «Ningún cliente asignado todavía.»; «Escribe al menos 2 letras»; insignia «suspendido»; «N cliente(s)»; «No se pudo guardar».
- **Pendiente de validar en UI:** —

## INC-013 · Plantillas «Aviso de mantenimiento» y «Aviso de caída masiva»

- **Ruta UI / name:** `/ajustes/plantillas` → pestañas «Aviso de mantenimiento» y «Aviso de caída masiva».
- **Archivos:** FE: `FE:pages/dashboard/ajustes/plantillas/components/AvisoMantenimiento.vue`, `FE:pages/dashboard/ajustes/plantillas/IndexPage.vue:75-80,109-110,246-253,349-361` · BE: `settings.plantillaAvisoMantenimiento`, `settings.plantillaAvisoFalla`.
- **Acceso:** las pestañas se muestran con `mapa.incidentes.gestionar`; la pantalla redirige al Dashboard si la persona no tiene ninguno de los permisos `variables.ver.…` de plantillas (`IndexPage.vue:114-128`).
- **Campos:** editor de texto (negrita, cursiva, subrayado), tabla de variables, «Guardar cambios»; con WhatsApp Oficial conectado, «Plantilla WhatsApp Oficial (Meta la cobra por cada envío)» y control de envío a Meta. Variables mantenimiento: `{ cliente }`, `{ empresa }`, `{ inicio }`, `{ fin }`; caída: `{ cliente }`, `{ empresa }`, `{ inicio }`, `{ causa }`. Meta no admite empezar ni terminar con variable ni dos variables seguidas (comentario del código).
- **Mensajes (texto exacto):** «Plantilla guardada», «No se pudo guardar», «No se pudo cargar la plantilla», «Se envía de a uno: por el WhatsApp del QR, uno cada 2 minutos.», «Estado actualizado».
- **Pendiente de validar en UI:** ❓ aprobación real en Meta.

## INC-014 · Resumen de la ONU

- **Ruta UI / name:** `/clientes/edit/:client_id` → Servicios → columna «ONU SN»; también la barra del chat de la bandeja.
- **Archivos:** FE: `FE:pages/dashboard/clientes/components/editar/Servicios/ResumenOnu.vue`, `FE:pages/dashboard/clientes/components/editar/ServiciosPage.vue:352-406`, `FE:pages/dashboard/ajustes/bot/components/message/ResumenClienteChat.vue:148-160` · BE: `BE:smart-olt/smart-olt.service.ts:1665-1710`, `BE:smart-olt/smart-olt.controller.ts:250`, `GET /admin-olt/onu-por-sn/:sn`.
- **Para qué sirve:** mostrar el estado de la ONU, desde cuándo y la señal sin abrir la OLT.
- **Acceso:** sin permiso propio: se muestra a quien abre la pestaña Servicios del perfil del cliente o la barra del chat.
- **Reglas de negocio:** SmartOLT: `GET /smart-olt/obtener-senal-onu/:sn` pide señal y estado por separado y devuelve lo que llegó (`senal_no_disponible`, `estado_no_disponible`); AdminOLT: `GET /admin-olt/onu-por-sn/:sn` (`estado`, `optical_rx_power`, `signal_level`, sin hora de cambio). Caché de 1 min por SN y estado del servicio; un reintento a los 2,5 s; si el servicio se activa o suspende, relee a los 8, 20 y 40 s hasta que cambie el estado (`ResumenOnu.vue:2-6,69-147`). No se muestra si la ONU está marcada inválida (SmartOLT). Iconos: online verde `public`; offline y power fail grises (`public`, `electrical_services`); los rojo `link_off`; otro estado, `help`. Señal: critical rojo, warning naranja, very good/good verde.
- **Mensajes (texto exacto):** «Aplicando cambio…» (tooltip «La OLT tarda unos segundos en habilitar o deshabilitar la ONU»), «OLT sin respuesta», «Estado sin lectura», «Señal sin lectura», «Volver a consultar», «Señal: {nivel}».
- **Pendiente de validar en UI:** ❓ OLT real.

## INC-015 · Estado de conexión y estado de la ONU del servicio

- **Acceso:** sin pantalla ni permiso propio; alimenta el mapa, el panel de incidentes y el bot.
- **Archivos:** BE: `BE:common/utils/estado-onu.util.ts`, `BE:monitoreo-trafico/monitoreo-conexion.service.ts:233-323`, `BE:smart-olt/smart-olt.service.ts:802-830`, `BE:admin-olt/admin-olt.service.ts:171-185`, migración `1790200000000-EstadoOnuServicio.ts`.
- **Reglas:** `estado_conexion` ∈ `online`, `offline`, `sin_datos`; `estado_onu` ∈ `online`, `los`, `power_fail`, `offline` o vacío. `estadoOnuDe(texto)`: vacío → sin dato; empieza por «online», contiene «working» o es «up» → `online`; contiene «los» → `los`; contiene «power», «dying» o «gasp» → `power_fail`; otro texto → `offline`. SmartOLT cuenta `online` solo si el texto es exactamente «online»; AdminOLT si contiene «online» o «working» o es «up». También guarda OLT y PON de cada ONU (`olt_ref`, `pon`) y abre/cierra `conexion_caida`.
- **Pendiente de validar en UI:** ❓ textos reales que envía cada plataforma.

## INC-016 · Aviso de versión nueva

- **Acceso:** cualquier persona con sesión abierta; sin permiso.
- **Archivos:** FE: `FE:boot/version-nueva.js`.
- **Reglas:** tras publicar una versión, quien tenía ISPMAX abierto pide archivos con el nombre viejo; el sistema detecta ese error (`vite:preloadError` o error del router) y recarga solo hacia la pantalla a la que iba; una sola vez cada 30 s. Si vuelve a fallar dentro de ese plazo, muestra «Hay una versión nueva de ISPMAX. Recarga la página para continuar.» con el botón «Recargar» y sin cerrarse solo (`:13-57`).
- **Pendiente de validar en UI:** ❓ reproducir un cambio de versión.

## Hallazgos del dominio

- El DTO de «declarar» admite `router_id`, pero la pantalla solo ofrece zona, caja NAP o área dibujada (`BE:IR/dto/incidentes-red.dto.ts:61-63` vs `FE:MN/ZonasIncidentes.vue:1305-1312`).
- «Ver las cerradas» filtra solo `estado !== 'abierto'`: los programados aparecen allí y se rotulan «falsa alarma» ❓ (`FE:MN/ZonasIncidentes.vue:135-141,1165-1185`).
- El tooltip del interruptor de aviso dice que no se avisa en caídas «de router»; el código excluye solo la causa `router`, no `antena` (`BE:IR/deteccion-masiva.service.ts:197-203`).
- El reporte por zona (`GET /incidentes-red/reporte`) y la pestaña «Reporte» se retiraron (commits `4bed5cc2`, `c3a8fae6`).
- Los endpoints de lectura del módulo solo piden sesión; la gestión pide `mapa.incidentes.gestionar`; ese permiso no está en el catálogo de permisos vigente del manual.
