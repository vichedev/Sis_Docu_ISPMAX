# Inventario RED2 — Red física: Cajas NAP, Mapa de red, Monitoreo y Servicios personalizados
> Alcance: FE `src/pages/dashboard/Gestion-Red/{cajas-nap,mapa-nap,monitoreo-red,personalizado}/**`, `src/components/ModalMapBox.vue`, `src/composables/{useUbicacion,useUbicacionLabels,useHelperRedes,useLatidoUbicacion}.js` (+ consumidores de tráfico en Routers/Clientes/Dashboard) · BE `src/{caja-nap,puertos,red-fibra,monitoreo-trafico,monitoreo-dispositivos,servicios-personalizado,ubicacion-tecnicos}`, `src/router/router-monitor.service.ts`. Generado desde el ZIP del 2026-10-06.
> Convención de citas: `FE:` = `C:\WORKSPACE\_ispmax-src\frontend\frontend-isp-main\src\…`; `BE:` = `…\backend\backend-isp-main\src\…`. Todo marcado ✅ salvo lo listado en "Pendiente de validar en UI" (❓).
> Nota transversal ✅: en el backend `@Auth()` solo exige JWT válido y que exista usuario (`BE:auth/decorators/auth.decorator.ts`, `BE:auth/guards/user-role/user-role.guard.ts:10-18`); **ninguno de los controladores de este alcance valida permisos por clave**. Los permisos (`index.caja_nap`, `editar.red.mapa`, …) solo los aplica el frontend (menú, guard de ruta y `v-if`). Único permiso exigido en backend en este alcance: `mapa.tecnicos.index` (`BE:ubicacion-tecnicos/ubicacion-tecnicos.service.ts:37,145-152`). El propio backend lo reconoce: "en este sistema los permisos se validan del lado del panel" (mismo archivo:92-94).
> Nota transversal ✅: `SUPER-ADMINISTRADOR` pasa todo `validarPermisos(...)` (`FE:composables/useRolPermisos.js:11-15`) y el guard de rutas (`FE:router/auth-guard.ts` línea `jwtValue.claim.roles[0] === "SUPER-ADMINISTRADOR"`). El guard exige por defecto un permiso con el **mismo nombre que la ruta**.

## Resumen de funcionalidades
| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| NET-001 | Cajas NAP — listado, ocupación de puertos, activar/inactivar, eliminar | `/cajas-nap` · `index.caja_nap` | `index.caja_nap`; botones: `crear.caja_nap`, `editar.caja_nap`, `activar.inactivar.caja_nap`, `eliminar.caja_nap` | completo |
| NET-002 | Cajas NAP — crear y editar (formulario) | `/cajas-nap/add` · `crear.caja_nap`; `/cajas-nap/edit/:id` · `editar.caja_nap` | `crear.caja_nap`, `editar.caja_nap` | completo |
| NET-003 | Cajas NAP — clientes de una caja (modal) y Excel de clientes | Modal "Ver clientes de esta caja" en `/cajas-nap` | (`index.caja_nap`) | completo |
| NET-004 | Cajas NAP — carga masiva por Excel, plantilla y exportación | Modal "Carga masiva de cajas NAP" · menú Excel | `crear.caja_nap` (importar); plantilla/exportación sin permiso | completo |
| NET-005 | Cajas NAP — reporte PDF (endpoint Excel sin botón) | Botón "PDF" en `/cajas-nap` | sin permiso | completo |
| NET-006 | Asignación de cliente a puerto NAP y modelo de puertos | Sección "Red física (NAP)" del servicio del cliente; importación de clientes; pre-asignación de instalaciones | los del formulario de cliente/instalación | completo |
| NET-007 | Selector de coordenadas (ModalMapBox) | Modal "Coordenadas Seleccionada" | los de la pantalla que lo abre | completo |
| NET-008 | Mapa de Red y Clientes — vista principal, búsqueda, filtros, capas, popups | `/mapa-nap` · `index.mapa` | `index.mapa` | completo (estilos CSS no auditados) |
| NET-009 | Mapa — red de fibra física: postes, mangas, nodos, tendido (visualización) | Capas de `/mapa-nap` | `index.mapa` | completo |
| NET-010 | Mapa — modo edición (postes, tramos, mover cajas/clientes, acometidas) | Botón "Editar red" de `/mapa-nap` | `editar.red.mapa` | completo |
| NET-011 | Mapa — importar KMZ/KML y deshacer importación | Barra de edición → "Importar KMZ" | `editar.red.mapa` | completo |
| NET-012 | Mapa — capa Técnicos (ubicación) | Capas y filtros → "Ver dónde están" | `mapa.tecnicos.index` (también en backend) | completo |
| NET-013 | Mapa — distancias, rutas y "¿Cómo llegar aquí?" | `/mapa-nap` | `index.mapa` | completo |
| NET-014 | Monitoreo de Red — listado y resumen | `/monitoreo-red` · `index.monitoreo_red` | `index.monitoreo_red` | completo |
| NET-015 | Monitoreo de Red — alta/edición de dispositivo | Diálogo en `/monitoreo-red` | `index.monitoreo_red` | completo |
| NET-016 | Monitoreo de Red — detalle: ping manual, latencia, disponibilidad | Diálogo "Historial / Ping" | `index.monitoreo_red` | completo |
| NET-017 | Monitoreo de Red — Alertas (correo, WhatsApp, campanita) y "Mostrar en el Dashboard" | Diálogo "Alertas de red"; toggle | `index.monitoreo_red` | completo |
| NET-018 | Colector de ping de dispositivos (cron cada minuto) | Sin pantalla | — | completo |
| NET-019 | Monitoreo de tráfico — recolección, consolidación y retención (cron) | Sin pantalla | — | completo |
| NET-020 | Monitoreo de tráfico — consumo, disponibilidad y ping del cliente | `/clientes/edit/:client_id` → pestaña "Consumo" | permisos de la ficha de cliente | completo |
| NET-021 | Monitoreo de tráfico — Router (Monitoreo/Gráficos/WAN) y Dashboard (Tráfico Clientes, Clientes con mayor consumo) | `/router/edit/:id` pestañas; Dashboard `/` | `dashboard.resumen_sistema` (tarjetas); permisos de router | completo |
| NET-022 | Detección de conexión real de clientes (cron 5 min) | Sin pantalla (se ve en el mapa y en "Consumo") | — | completo |
| NET-023 | Heartbeat de routers y auto-reparación (cron 5 min) | `/router` ("Verificar conexión", badge "Sin conexión") | — | completo (UI en inventario de Routers) |
| NET-024 | Servicios Personalizados — qué son y listado | `/personalizado` · `personalizado.index` | `personalizado.index` (no asignable desde roles) | completo |
| NET-025 | Servicios Personalizados — crear/editar y aplicar el cambio a usos | Diálogo "Nuevo/Editar Perfil" | `personalizado.index` | completo |
| NET-026 | Servicios Personalizados — "En uso" y eliminar | Diálogo de usos | `personalizado.index` | completo |
| NET-027 | Referencia — modelo de datos de red física y monitoreo | Sin pantalla | — | completo |
| NET-028 | Referencia — useUbicacion, useUbicacionLabels, useHelperRedes, useLatidoUbicacion | Sin pantalla | — | completo |
| NET-029 | Cajas NAP — caja principal / secundaria (formulario y columna "Tipo de caja") | `/cajas-nap`, `/cajas-nap/add`, `/cajas-nap/edit/:id` | `crear.caja_nap`, `editar.caja_nap` | completo (código del 2026-10-14) |
| NET-030 | Mapa — enlaces entre cajas, ★ de caja principal y "Clientes sin caja NAP" | `/mapa-nap` · `index.mapa` | `index.mapa` | completo (código del 2026-10-14) |

---

## NET-001 · Cajas NAP — listado
- **Ruta UI / name:** `/cajas-nap` · `index.caja_nap` · menú lateral → Gestión de Red → "Cajas Nap" (`FE:layouts/SideBarMenu.vue:177-187`). Título de la tabla: "Cajas Nap".
- **Archivos:** FE: `pages/dashboard/Gestion-Red/cajas-nap/IndexPage.vue`, `components/ClientesCajaModal.vue`, `components/ModalCargarExcel.vue` · BE: `caja-nap/caja-nap.controller.ts`, `caja-nap/caja-nap.service.ts`, `caja-nap/entities/caja-nap.entity.ts`, `puertos/entities/puerto.entity.ts`, `customers/customers.service.ts` (`getIpsUtilizadas`).
- **Para qué sirve:** ver las cajas NAP (cajas de distribución de fibra) por router, con la capacidad de puertos y qué puertos están ocupados y por quién; punto de partida para crear/editar, importar, exportar y reportar.
- **Acceso:** menú con `index.caja_nap` (`SideBarMenu.vue:178`); la ruta exige el mismo permiso por nombre. Botones: `crear.caja_nap`, `editar.caja_nap`, `activar.inactivar.caja_nap`, `eliminar.caja_nap` (catálogo en `FE:pages/dashboard/usuarios/permisos/gestion-red-permisos.json:48-58`: Ver / Crear / Editar / Activar/Inactivar / Eliminar). Backend: solo JWT.
- **Secciones / pestañas:** una sola tabla con barra superior (selector "Router:", botón Nuevo, menú Excel, botón PDF, "OCULTAR COLUMNAS", búsqueda, pantalla completa).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Nuevo | Va a `/cajas-nap/add` | `crear.caja_nap` | — | Oculto en pantallas xs; en xs aparece un botón flotante "+" con el mismo permiso (`IndexPage.vue:338-345,605-617`) |
| Menú Excel (icono) → "Importar Excel" | Abre el modal "Carga masiva de cajas NAP" (NET-004) | `crear.caja_nap` | — | Oculto en xs |
| Menú Excel → "Descargar Plantilla" | Descarga `plantilla_cajas_nap.xlsx` vacía | ninguno | `POST /caja-nap/plantilla-excel?con_datos=false` | Envía los nombres de los routers del usuario (`IndexPage.vue:234-266`) |
| Menú Excel → "Exportar Cajas NAP" (caption "En formato de plantilla (editable y re-importable)") | Descarga `cajas_nap.xlsx` con las cajas del router y búsqueda actuales | ninguno | `POST /caja-nap/plantilla-excel?con_datos=true&filter=` | Respeta router y texto de búsqueda |
| PDF (tooltip "Reporte de cajas NAP en PDF (resumen + detalle de ocupación)") | Descarga `reporte_cajas_nap.pdf` | ninguno | `GET /caja-nap/reporte/pdf` | Ver NET-005 |
| OCULTAR COLUMNAS | Multi-select de columnas visibles | — | — | Preferencia persistida en `localStorage` (store Pinia `persist`, `FE:stores/auth-user.ts:137-145,243-245`); lo mismo ocurre con el router elegido (`estados-mantenedor.ts:53-55`); por defecto: acciones, nombre, ubicacion, coordenadas, puertos, detalles, estado |
| Buscar… | Filtra en servidor (debounce 300 ms) | — | `GET /caja-nap?filter=` | Busca en nombre, ubicación y coordenadas (ILIKE) (`BE:caja-nap/caja-nap.service.ts:65-70`) |
| Icono "groups" (tooltip "Ver clientes de esta caja") | Abre modal de clientes (NET-003) | ninguno | `GET /caja-nap/:id/clientes` | Siempre visible |
| Icono lápiz | Va a `/cajas-nap/edit/:id` | `editar.caja_nap` | — | Solo si la caja está `isActive` |
| Icono "close" | Desactiva la caja | `activar.inactivar.caja_nap` | `PATCH /caja-nap/:id/false` | Solo si `isActive`. Sin diálogo de confirmación. Muestra el `msg` del backend ("Actualizado Exitosamente") |
| Icono "done" | Reactiva la caja | `activar.inactivar.caja_nap` | `PATCH /caja-nap/:id/true` | Solo si NO `isActive` |
| Icono "delete" | Elimina la caja | `eliminar.caja_nap` | `DELETE /caja-nap/:id` | Solo si NO `isActive`. Diálogo: título "Confirmar", mensaje "Estas seguro de eliminar esta Caja Nap?", botones "Eliminar"/"Cancelar" (`FE:composables/useHelpers.js:48-67`). Éxito: "Registro eliminado exitosamente" |

- **Campos de formulario:** ninguno (ver NET-002).
- **Filtros y columnas de tabla:** selector "Router:" (opciones `estadosStore.routers`, incluye "TODOS"; comparte la variable `routerSelectedPlanes` con Planes de servicio: `FE:stores/estados-mantenedor.ts:26`) → al cambiar vuelve a página 1 y manda header `router-id`. Columnas: **Nombre**, **Ubicación**, **Coordenadas**, **Puertos** (ancho 200 px, no ordenable), **Detalles**, **Estado**, **acciones** (columna fija a la derecha al hacer scroll). Orden en servidor solo por Nombre, Ubicación, Coordenadas y Estado (el orden "Estado" usa `isActive`, no el texto) (`BE:caja-nap.service.ts:75-87`); sin orden: más nuevas primero (`created_at DESC`). Paginación server-side, 10 por página por defecto.
- **Estados posibles:**
  - Columna **Puertos**: cuadrito numerado por puerto; verde (`secondary`) = libre; rojo (`red-9`) = ocupado. Tooltip en ocupados: "Cliente: …", "Plan: …" y "Click para ver el perfil del cliente" (clic → `cliente.edit`). Si dos servicios apuntaran al mismo puerto solo se muestra uno (mapa `puertosInfo` por id de puerto) (`IndexPage.vue:105-138,448-491`).
  - Columna **Estado** (texto `estado` de la caja): `Activo` → insignia verde "Activo"; `En mantenimiento` → insignia ámbar con texto **"Inactivo"**; `Desactivada` → insignia roja con texto **"Inactivo"** (`IndexPage.vue:493-520`). Cualquier otro valor no muestra nada.
  - Ojo ✅: "activa/inactiva" (`isActive`, lo que cambian los botones ✕/✓) es **independiente** del campo `estado` (Activo/Desactivada/En mantenimiento, lo que se edita en el formulario). Los botones ✕/✓ no tocan `estado` (`BE:caja-nap.service.ts:606-614`).
- **Reglas de negocio (backend):**
  - Listado: join de router y puertos (eager); filtra por header `router-id` salvo valor vacío o `'null'` (`BE:caja-nap.service.ts:58-63`). Sin `page`+`limit` devuelve array completo (compatibilidad con selects) (`:91-93`).
  - Ocupación: el front cruza los puertos con `GET /customers/get-ips/:router_id` (servicios con `deleted = false`, incluye **suspendidos**; excluye retirados) (`BE:customers/customers.service.ts:1966-1993`). Un puerto es "ocupado" si algún servicio no retirado lo referencia.
  - Activar/Desactivar solo hace `UPDATE isActive` (`BE:caja-nap.service.ts:606-614`). No bloquea si hay clientes en la caja.
  - Eliminar: `remove()` real (borrado físico); los puertos caen por `ON DELETE CASCADE` (`BE:puertos/entities/puerto.entity.ts:16`); si hay servicios apuntando a la caja, la FK puede impedir el borrado → ver Casos límite.
- **Efectos secundarios externos:** ninguno (no toca MikroTik, OLT, WhatsApp ni correo).
- **Mensajes de error/éxito (texto exacto):** "Error al cargar cajas NAP" (si el backend no manda mensaje), "No se encontró ningun Resultado" (tabla vacía, con "ningun" sin tilde), "No se pudo generar el reporte Excel|PDF", "No se pudo descargar la plantilla", "No se pudo exportar las cajas NAP".
- **Relaciones con otros módulos:** Routers (cada caja pertenece a un router; al borrar el router se borran sus cajas: `BE:caja-nap/entities/caja-nap.entity.ts:12` `onDelete: 'CASCADE'`); Clientes/servicios (`caja_id`, `puerto_id` en `servicios-clientes`); Instalaciones (pre-asignación `caja_id`/`puerto_id`); Mapa de Red (NET-008); exportación de clientes (`downloadExcelCustomers`).
- **Casos límite y advertencias:**
  - La columna "Estado" puede mostrar "Activo" para una caja desactivada (`isActive=false`) porque pinta el texto `estado`; el lápiz y ✕ desaparecen y aparece ✓ y papelera.
  - El borrado en el backend no captura errores de BD: si la caja tiene servicios ligados, Nest responde 500 "Internal server error" y el front (`confirmDelete`) solo traduce el código `23503` si viene en el cuerpo; no hay filtro global que lo agregue (❓ validar en UI qué mensaje sale).
  - El selector "Router:" usa `routerSelectedPlanes`: un cambio aquí cambia también el router seleccionado en Planes de servicio.
  - `v-if="estadosStore.routerSinTodos !== 0"` (`IndexPage.vue:309`) siempre es verdadero (es un array), por lo que el título alternativo "Cajas Nap" centrado nunca se muestra.
  - La búsqueda no incluye router, detalles ni potencia.
- **Preguntas probables de usuarios:**
  1. ¿Cómo sé cuántos puertos libres le quedan a una caja? (cuadritos verdes en la columna Puertos; reporte PDF).
  2. ¿Por qué un puerto sale rojo si el cliente está suspendido? (los suspendidos siguen ocupando puerto; solo se libera al **retirar** el servicio).
  3. ¿Cómo desactivo una caja sin borrarla? (✕ en acciones; permiso Activar/Inactivar).
  4. ¿Por qué no puedo eliminar una caja? (solo se ofrece si está inactiva; y no si tiene clientes asignados).
  5. ¿Por qué mi caja dice "Inactivo" pero la edité como "Activo"? (distinguir estado vs activa/inactiva).
  6. ¿Cómo veo qué cliente está en el puerto 7? (pasar el cursor/clic en el cuadrito rojo, o icono "groups").
  7. ¿Puedo ver todas las cajas de todos mis routers? (Router: "TODOS").
  8. ¿Cómo oculto columnas que no uso? (OCULTAR COLUMNAS).
- **Pendiente de validar en UI:** ❓ mensaje real al intentar eliminar una caja con clientes; ❓ opciones de "filas por página" de la tabla (Quasar por defecto); ❓ si la tabla muestra "TODOS" como primera opción en el selector para usuarios con un solo router.

## NET-002 · Cajas NAP — crear y editar (formulario)
- **Ruta UI / name:** `/cajas-nap/add` · `crear.caja_nap` ("Nueva Caja NAP"); `/cajas-nap/edit/:id` · `editar.caja_nap` ("Editar Caja NAP"). Migas: "Inicio" › "Cajas Nap" › "Nuevo"/"Editar".
- **Archivos:** FE: `cajas-nap/AddPage.vue`, `EditPage.vue`, `components/FormNap.vue`, `composables/useNap.js`, `src/components/ModalMapBox.vue` · BE: `caja-nap.controller.ts` (`POST /caja-nap`, `PATCH /caja-nap/:id`, `GET /caja-nap/:id`), `caja-nap.service.ts` (`create` 29-48, `update` 561-604), `dto/create-caja-nap.dto.ts`, `dto/update-caja-nap.dto.ts`.
- **Para qué sirve:** dar de alta una caja NAP con su ubicación, coordenadas, cantidad de puertos y router; el backend crea los puertos 1…N automáticamente.
- **Acceso:** guard de ruta por nombre (`crear.caja_nap` / `editar.caja_nap`); botones de la lista con los mismos permisos.
- **Secciones / pestañas:** formulario de una sola sección en dos columnas + modal de mapa para coordenadas.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Icono de ubicación junto a Coordenadas | Abre el modal "Coordenadas Seleccionada" (NET-007) | — | — | Entrega "lng, lat" |
| Regresar | Vuelve a la lista | — | — | Oculto en < 600 px |
| Guardar Cambios | Valida y guarda | crear/editar | `POST /caja-nap` o `PATCH /caja-nap/:id` | Tras guardar espera 500 ms y vuelve al listado |

- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Nombre: | texto (se muestra en MAYÚSCULAS), placeholder "Caja N1" | Sí (FE y BE) | FE: no vacío ("Debes completar este campo"); BE: `@IsString @IsNotEmpty`, se convierte a MAYÚSCULAS (`dto:11-14`); columna `varchar(100)` | No hay unicidad en backend |
| Coordenadas: | texto, placeholder "Coordenadas Longitud, Latitud" | No | BE `@IsOptional`; columna `varchar(100)` | Formato del sistema: **longitud, latitud** (`BE:common/utils/coordenadas.util.ts:19-26`). El modal escribe `"lng, lat"` (`FormNap.vue:15-18`). Acepta también DMS al leer en el mapa |
| Ubicación: | texto, placeholder "Av. xxx 123", hint "* Indicar una descripción" | Sí | `@IsNotEmpty`; `varchar(100)` | |
| Puertos: | texto (numérico en móvil), placeholder "16" | Sí (FE: no vacío ni 0) | Solo dígitos (se quita lo que no sea `\d`); BE opcional (`puertos?: string`) | En edición se carga con la cantidad actual de puertos |
| Detalles: | texto multilínea, placeholder "Poste 5" | No en FE (no está en `camposRequeridos`) | BE opcional, pero columna `detalles varchar(250)` **NOT NULL** | Se envía "" si está vacío |
| Estado: | select: `Activo`, `Desactivada`, `En mantenimiento` | Sí | `@IsNotEmpty` (BE no valida el listado) | Es texto libre en BD (`varchar(25)`) |
| Potencia: | número, placeholder "Potencia" | No | Solo `-`, dígitos y `.` | `varchar(6)` en BD; en la plantilla Excel se pide dBm (ej. -18.5) |
| Detalles adicionales: | texto multilínea, placeholder "color de hilo - numero de spletter" | No | `text` | |
| Router: | select (routers del usuario sin "TODOS") | Sí | `@IsUUID` | Editable también al editar |

- **Filtros y columnas de tabla:** n/a.
- **Estados posibles:** `estado` ∈ {Activo, Desactivada, En mantenimiento}; `isActive` (true por defecto) no se edita aquí (el DTO con `whitelist` lo descarta).
- **Reglas de negocio (backend):**
  - Crear: guarda la caja y luego crea `N` puertos numerados 1…N (`BE:caja-nap.service.ts:36-42`). Si `puertos` no viene, crea 0 puertos.
  - Editar: `update(id, resto)`; si cambian las **coordenadas** (comparación de texto exacta) se borra `trazado_acometida` de todos los servicios de la caja (el mapa vuelve al trazado automático) (`:569-577`).
  - Editar cantidad de puertos: si **sube**, agrega los puertos faltantes (`:586-594`); si **baja**, intenta eliminar los puertos con número > nuevo total, sin comprobar si están ocupados (`:579-584`).
  - Errores: `23505` → 400 con el detalle; cualquier otro error de BD → 500 "Unexpected error, check server logs" (`:626-632`).
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** validación "Debes completar este campo"; éxito: **"Router agregado exitosamente"** / **"Router editado exitosamente"** (texto heredado del módulo Router, `FE:cajas-nap/composables/useNap.js:89`); error: el `message` del backend (warning).
- **Relaciones con otros módulos:** Routers; Mapbox (selector de coordenadas); servicios de clientes (`trazado_acometida`).
- **Casos límite y advertencias:**
  - El `forEach(async …)` que elimina puertos al bajar la cantidad no se espera (`:580-584`): el backend responde "Registro actualizado exitosamente" aunque algún puerto no se haya podido borrar (p. ej. por estar asignado a un servicio y la FK). Al editar y luego recargar, el número de puertos puede no coincidir (❓).
  - `potencia` admite máximo 6 caracteres (p. ej. "-18.55"); más largo → error 500 genérico. Igual con `nombre`/`ubicacion` > 100 y `detalles` > 250.
  - No hay validación de duplicados en backend (solo la importación Excel valida nombre+router).
  - Cambiar el router de una caja que ya tiene clientes no mueve a los clientes.
- **Preguntas probables de usuarios:**
  1. ¿Cuántos puertos pongo? (el número real de puertos del splitter/caja; se pueden aumentar después).
  2. ¿Puedo reducir los puertos si ya hay clientes? (el sistema no lo impide pero podría fallar silenciosamente; mover antes a los clientes).
  3. ¿En qué orden van las coordenadas? (longitud, latitud; usar el botón del mapa).
  4. ¿Qué es "Potencia"? (nivel de señal en dBm medido en la caja; solo informativo).
  5. ¿Qué diferencia hay entre estado "Desactivada" y desactivar con ✕? (ver NET-001).
  6. ¿Por qué mi nombre se guarda en mayúsculas? (el sistema convierte a mayúsculas).
- **Pendiente de validar en UI:** ❓ comportamiento real al bajar puertos con clientes asignados; ❓ si el título "Editar" de las migas usa el ícono "add_circle" (cosmético).

## NET-003 · Cajas NAP — "Ver clientes de esta caja" (modal) y Excel de clientes
- **Ruta UI / name:** modal dentro de `/cajas-nap` (icono "groups").
- **Archivos:** FE: `cajas-nap/components/ClientesCajaModal.vue`, `cajas-nap/IndexPage.vue:74-81,552-561,629-631` · BE: `caja-nap.controller.ts:52-72`, `caja-nap.service.ts` (`clientesDeCaja` 146-197, `exportarClientesCaja` 203-229), `mikrotik/mikrotik.service.ts` (`downloadExcelCustomers` 1622-1930, `generateExcelClients` 1975-2386), plantilla `static/resource/clientes.xlsx` — todos leídos completos.
- **Para qué sirve:** listar, con paginación y búsqueda, los clientes (servicios) conectados a una caja y bajar su Excel.
- **Acceso:** sin permiso específico en FE (el icono "groups" con tooltip "Ver clientes de esta caja" se muestra en **todas** las filas del listado, también en cajas desactivadas, `IndexPage.vue:552-561`); backend solo JWT, sin comprobar los routers permitidos del usuario.
- **Secciones / pestañas:** título "Caja NAP {nombre}" (con la ubicación en gris al lado si existe), tabla, botón "Excel", búsqueda.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Excel (tooltip "Descargar clientes de esta caja en Excel") | Descarga `clientes_{nombre}.xlsx` (el nombre lo pone el front; el backend manda `clientes_caja.xlsx`) | ninguno | `GET /caja-nap/:id/exportar-excel` (UUID) | Reutiliza el generador de "Exportar clientes"; incluye activos, suspendidos **y retirados** (ver reglas); error "No se pudo generar el Excel" (aviso `warning`) |
| Buscar… | Filtra (debounce 400 ms) por nombre, IPv4 o documento | — | `GET /caja-nap/:id/clientes?filter=` | |
| Nombre del cliente (tooltip "Ir al perfil del cliente") | Navega a `cliente.edit` | — | — | |
| Cerrar (X) | Cierra | — | — | |

- **Campos de formulario:** ninguno.
- **Filtros y columnas de tabla:** **Puerto** (insignia o "—" si no tiene), **Cliente**, **Documento**, **IPv4**, **Plan**, **Estado**. Orden: puerto ascendente (NULL al final), luego nombre. 10 por página. Vacío: "Esta caja NAP no tiene clientes asignados".
- **Columnas del Excel** ✅ (plantilla `static/resource/clientes.xlsx`, hoja `clientes`; las hojas `redes` y `lista` van ocultas con los desplegables; `mikrotik.service.ts:1975-2386`): fila 1 con los grupos `CLIENTES` (A), `FACTURACIÓN` (G) y `DETALLE DEL SERVICIO` (P). Fila 2: A `CLIENTE`, B `TIPO DOC.` (`Cedula` / `RUC` / `Pasaporte`), C `NUM DOC.`, D `CELULAR`, E `EMAIL`, F `DIRECCION`, G `TIPO`, H `DIA PAGO`, I `TIPO IMPUESTO`, J `DIA DE GRACIA`, K `APLICAR CORTE`, L `TIPO COMPROBANTE`, M `CREAR FACTURA`, N `RECORDATORIO PAGO` (solo el primer canal), O `MESES ATRASADOS` (`Ninguno` o N), P `ROUTER`, Q `SERVICIO` (plan), R `RED IPV4:`, S `IPV4`, T `CAJA NAP`, U `PUERTO NAP`, V `PRECIO`, W `DIRECCIÓN` (del servicio), X `COORDENADAS(LNG, LAT)`, Y `ESTADO` (`Activo` / `Inactivo` / `Retirado`), Z `INSTALADO` (`DD/MM/AAAA`). Se marca con ` *` el encabezado de A, E, G, H, I, J, K, L, P, Q, R, S y V. A partir de AA van columnas **según los routers de la caja**: `Usuario PPPoE *` y `Contraseña PPPoE *` (si algún router tiene `control_pppoe`), `MAC Address` (si la seguridad alterna es "Amarre de IP y Mac" o "… + DHCP Leases"), `IPv6` (si hay redes IPv6 activas) y siempre `SN ONU`; después una columna por **campo personalizado** de cliente (nombre del campo); al final `DEUDA TOTAL` (formato `(meses) monto`, p. ej. `(1) 20.00`; vacía si no debe) y la leyenda "(*) = Obligatorio". `MESES ATRASADOS` / `DEUDA TOTAL` cuentan las facturas `NO PAGADO` y `PENDIENTE` del servicio cuyo vencimiento real (`dia_pago` + días de gracia) cae en el mes actual o antes. La red (R) se deduce de la IPv4 comparando los tres primeros octetos con las redes de los routers.
- **Estados posibles:** Estado = `Activo` (servicio `isActive`) o `Suspendido` (`isActive=false`) (`ClientesCajaModal.vue:165-174`).
- **Reglas de negocio (backend):**
  - **Listado** (`GET /caja-nap/:id/clientes?page&limit&filter`): servicios con `caja_id = :id` y `deleted = false` (excluye **retirados**) (`BE:caja-nap.service.ts:159-167`); valida que la caja exista (`findOne`, 400 "No se encontro el registro con el id …"). `page` y `limit` valen 1 y 10 si no llegan o no son números; `filter` busca con `ILIKE %texto%` en `customer.nombres`, `servicio.ipv4` y `customer.numero_documento`; orden `puerto` ascendente (sin puerto al final) y luego nombre; respuesta `{ data: [{ servicio_id, customer_id, cliente, documento, celular, ipv4, plan, puerto, isActive }], meta: { total, page, lastPage } }` (el `celular` llega pero la tabla no lo muestra) ✅ :153-197 · controller:52-60. En la pantalla, el filtro de la tabla pasa por `@request` con espera de 400 ms, 10 filas por página y el cliente es un enlace a `cliente.edit` ✅ ClientesCajaModal.vue:56-103.
  - **Excel** (`GET /caja-nap/:id/exportar-excel`): toma **todos** los servicios con ese `caja_id` **sin filtrar `deleted`** (`caja-nap.service.ts:210-222`) y llama `downloadExcelCustomers('todos', true, [], 'Todos', '{}', 0, routers, servicios)`. Con `serviciosIds` informado el generador no aplica el filtro `deleted` y deja pasar a los retirados (`mikrotik.service.ts:1754,1900`), así que **el Excel incluye servicios retirados** con `ESTADO = Retirado`, a diferencia de la lista del modal. Quedan fuera solo los eliminados definitivamente (`deleted_at`) ✅. El comentario del código ("los retirados/soft-deleted siguen excluidos por TypeORM") solo vale para esos últimos.
  - Si la caja no tiene servicios usa un UUID de relleno y devuelve la plantilla sin filas. Si `downloadExcelCustomers` falla internamente, captura el error con `console.log` y devuelve `undefined`: el endpoint responde un cuerpo vacío con cabecera de Excel (❓ qué ve el usuario).
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** "Error al cargar clientes" (si no hay mensaje de backend), "No se pudo generar el Excel".
- **Relaciones con otros módulos:** Clientes (perfil), exportación de clientes (mismo formato que Clientes → Exportar).
- **Casos límite y advertencias:** el Excel se genera en modo "todos" con los routers involucrados (por si la caja tuviera servicios en más de un router); si la caja no tiene clientes devuelve un Excel sin filas. **El Excel y el modal no cuentan lo mismo:** el modal excluye retirados y el Excel los incluye como `Retirado`. **La columna `TIPO` (G) sale invertida:** el código escribe `Prepago (Adelantado)` cuando el cliente es `postpago` y `Postpago (Vencido)` cuando es `prepago` (`mikrotik.service.ts:2328-2330`; la importación lee `Postpago (Vencido)` → `postpago` en `ModalCargarExcel.vue:234`), así que volver a importar el archivo exportado invierte el tipo de facturación. La misma función sirve a "Exportar clientes", a la exportación por plan, por red IPv4/IPv6 y por caja.
- **Preguntas probables de usuarios:** 1) ¿Cómo saco la lista de clientes de una caja para un mantenimiento? 2) ¿Por qué no aparece un cliente retirado? 3) ¿Qué significa "—" en Puerto? (servicio con caja pero sin puerto) 4) ¿Puedo avisar a esos clientes? (usar el Excel/mensajes masivos).
- **Pendiente de validar en UI:** ❓ qué descarga el usuario si la generación falla en el backend (cuerpo vacío con cabecera de Excel); ❓ que la columna `TIPO` salga invertida en el archivo real (el código lo indica así).

## NET-004 · Cajas NAP — Carga masiva por Excel, plantilla y exportación
- **Ruta UI / name:** modal "Carga masiva de cajas NAP" dentro de `/cajas-nap` (menú Excel → "Importar Excel").
- **Archivos:** FE: `cajas-nap/components/ModalCargarExcel.vue`, `IndexPage.vue:228-266` · BE: `caja-nap.service.ts` (`generarPlantillaExcel` 414-516), `caja-nap.controller.ts:93-109`.
- **Para qué sirve:** crear muchas cajas desde un Excel, o exportar las existentes en el mismo formato para editarlas y re-importarlas.
- **Acceso:** "Importar Excel" requiere `crear.caja_nap`; "Descargar Plantilla"/"Exportar Cajas NAP" sin permiso.
- **Secciones / pestañas:** selector de archivo, filtro "Correctas / Todos / Errores", lista por caja, botón "Cargar cajas NAP".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Subir archivo excel: (acepta `.xls, .xlsx`) | Lee la primera hoja en el navegador (SheetJS) | — | — | Error de campo: "Debes completar este campo" |
| Cargar cajas NAP | Valida filas y crea **una caja por petición** | `crear.caja_nap` | `GET /caja-nap` (para detectar existentes) y `POST /caja-nap` por fila | Muestra spinner/✓/✗ por caja; al terminar refresca la lista |
| Correctas (n) / Todos (n) / Errores (n) | Filtra la lista de resultados | — | — | La etiqueta de "Todos" se escribe en minúscula: "todos (n)" |

- **Campos de formulario (columnas del Excel; fila 1 título "CAJAS NAP", fila 2 encabezados, datos desde la fila 3):**

| Columna / encabezado | Obligatorio | Validación |
|---|---|---|
| A "Nombre *" | Sí | Se pasa a MAYÚSCULAS |
| B "Ubicación *" | Sí | — |
| C "Coordenadas" (nota: "Longitud, Latitud. Ej: -79.8891, -2.1894") | No | — |
| D "Puertos *" (nota: "Cantidad de puertos de la caja (entero mayor a 0)") | Sí | `^[1-9]\d*$` → "Puertos (x) debe ser un entero mayor a 0" |
| E "Detalles" | No | — |
| F "Estado *" | Sí | Lista: Activo, Desactivada, En mantenimiento (sin distinguir mayúsculas) → "Estado (x) debe ser: Activo, Desactivada, En mantenimiento" |
| G "Potencia" (nota: "Potencia en dBm. Ej: -18.5") | No | Numérica → "Potencia (x) debe ser numérica" |
| H "Detalles adicionales" | No | — |
| I "Router *" | Sí | Por **nombre** (mayúsculas indiferentes) → "Router (x) no existe" |

- **Filtros y columnas de tabla:** n/a.
- **Estados posibles:** por fila: cargando / success / error (con tooltip del motivo).
- **Reglas de negocio:**
  - Duplicados: se descartan filas cuya combinación NOMBRE+router ya existe o se repite en el archivo: "ya existe una caja con este nombre en el router" (solo en frontend) (`ModalCargarExcel.vue:62-70,116-122`).
  - Faltantes: "faltan campos: Nombre, Ubicación, …"; mensaje por fila "Fila N: …".
  - La plantilla trae listas desplegables (Estado, Router desde hoja oculta "listas", Puertos entero > 0) en las filas 3 a máx(500, filas+200) (`BE:caja-nap.service.ts:493-511`); "Exportar" la llena con las cajas existentes (router y búsqueda actuales) ordenadas por nombre.
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito:** por caja: el `message` del backend o "Error al guardar la caja".
- **Relaciones con otros módulos:** Routers (nombres); Clientes (la plantilla de clientes lista cajas/puertos libres, ver NET-006).
- **Casos límite y advertencias:** importar un archivo exportado vuelve a crear todo como "ya existe" (se marca error por duplicado, no actualiza); **no existe importación para actualizar** cajas existentes. Cajas sin coordenadas se guardan pero no aparecen en el mapa.
- **Preguntas probables de usuarios:** 1) ¿Cómo cargo 200 cajas de una vez? 2) ¿Puedo modificar cajas con Excel? (no; solo crear). 3) ¿Por qué mi fila da "Router no existe"? (usar el nombre exacto). 4) ¿Qué formato de coordenadas? (longitud, latitud). 5) ¿Qué pasa con las filas con error? (no se crean; las demás sí).
- **Pendiente de validar en UI:** ❓ que SheetJS (`XLSX`) esté disponible globalmente en la pantalla (se usa sin import en `ModalCargarExcel.vue:42`).

## NET-005 · Cajas NAP — Reporte PDF (y reporte Excel sin botón)
- **Ruta UI / name:** botón "PDF" en `/cajas-nap`.
- **Archivos:** FE: `cajas-nap/IndexPage.vue:197-226,383-396` · BE: `caja-nap.controller.ts:76-122`, `caja-nap.service.ts` (`getReporteCajas` 236-318, `generarReporteExcel` 321-405, `generarReportePDF` 519-532), `caja-nap/PlantillaReporteCajasNap.ts`.
- **Para qué sirve:** resumen de capacidad (cajas, puertos totales/ocupados/libres, % de ocupación global y por caja) y detalle por caja, respetando router y búsqueda.
- **Acceso:** sin permiso específico en FE; backend solo JWT.
- **Botones y acciones:** "PDF" → `GET /caja-nap/reporte/pdf` (header `router-id`, query `filter`); descarga `reporte_cajas_nap.pdf`. El endpoint `GET /caja-nap/reporte/excel` existe y `descargarReporte('excel')` está implementada, pero **no hay botón que la invoque** (`IndexPage.vue:197-226` vs. botones 348-396).
- **Campos de formulario:** ninguno.
- **Filtros y columnas:** PDF A4 horizontal con logo y nombre comercial de la empresa, "Router: …", "Búsqueda: …", "Generado: …", tarjetas "Cajas NAP", "Puertos totales", "Ocupados", "Libres", "Ocupación global"; "Estado de las cajas: Activo: n …"; tabla Nombre, Router, Ubicación, Coordenadas, Puertos, Ocup., Libres, % Ocupación (barra), Potencia, Estado; pie "{n} caja(s) listada(s)"; vacío: "No hay cajas NAP que coincidan con los filtros aplicados." (`BE:PlantillaReporteCajasNap.ts:200-285`).
- **Estados posibles:** semáforo de ocupación: **verde < 70 %**, **naranja 70–89 %**, **rojo ≥ 90 %** (`PlantillaReporteCajasNap.ts:24-25`; Excel igual `caja-nap.service.ts:397`). Insignias de estado: Activo / "Mant." (En mantenimiento) / "Inactivo" (Desactivada) (`:29-33`).
- **Reglas de negocio:** puerto ocupado = existe un servicio con `deleted = false` que lo referencia (suspendidos cuentan) (`BE:caja-nap.service.ts:256-262`); `ocupacion = round(usados/total·1000)/10`; el nombre del router en el encabezado es el de la primera caja, o "Todos".
- **Efectos secundarios externos:** el PDF se genera abriendo Chromium con **puppeteer** en el servidor (`PlantillaReporteCajasNap.ts:63-84`; en Linux usa `/usr/bin/chromium` si `SISTEMA=linux`).
- **Mensajes de error/éxito:** "No se pudo generar el reporte PDF".
- **Relaciones:** Empresa (logo `public/images/{logo}` o `default.png`, `caja-nap.service.ts:534-547`).
- **Casos límite y advertencias:** el reporte no filtra por estado de la caja (incluye inactivas); `puertos` por caja = cantidad de filas de puertos; el umbral del reporte (90 %) difiere del del mapa (100 % = rojo) (ver NET-008).
- **Preguntas probables de usuarios:** 1) ¿Cómo saco el reporte de ocupación para planificar ampliaciones? 2) ¿Por qué el PDF tarda? (renderiza en servidor). 3) ¿Se puede en Excel? (el endpoint existe pero la pantalla solo ofrece PDF y "Exportar Cajas NAP"). 4) ¿Qué significa naranja/rojo? 5) ¿Incluye cajas desactivadas? (sí).
- **Pendiente de validar en UI:** ❓ tiempo de generación y que Chromium esté instalado en el servidor de producción.

## NET-006 · Asignación de cliente a puerto NAP y modelo de puertos
- **Ruta UI / name:** no es una pantalla propia: sección "Red física (NAP)" del servicio de internet del cliente (`/clientes/add`, `/clientes/edit/:client_id` → servicio) y pre-asignación de instalaciones.
- **Archivos:** FE: `pages/dashboard/clientes/components/ServicioInternet.vue` (`retirarIpsUsadas` 454-478, `getCajasNap` 667-677, `getPuertosCajaNap` 679-694, `aplicarPreasignacion` 900-963, `loadInit` 965-1040, plantilla 1436-1507), `clientes/composables/useCliente.js:90,147,413-419`, `clientes/composables/useServicios.js:30-110`, `clientes/AddCliente.vue:58`, `clientes/components/editar/ServiciosPage.vue:158`, `clientes/components/modals/ModalCargarExcel.vue:316-337,734-747,826`, `instalaciones/components/SeccionPreAsignacion.vue` (completo, 685 líneas) · BE: `puertos/entities/puerto.entity.ts`, `puertos/puertos.{controller,service}.ts` (vacíos), `customers/entities/ServicioCliente.entity.ts:70-75`, `customers/customers.service.ts` (`create` 370-379, `agregar_servicio` 575-590, `getIpsUtilizadas` 1967-1992, `construirPreAsignacionDesdeServicio` 826-846, actualización 2500-2510, `retirarServicio` 2896-2989), `customers/customers.controller.ts:32-39,231-235`, `instalaciones/instalaciones.service.ts:698-709`, `instalaciones/entities/instalacione.entity.ts:89-109`, `instalaciones/dto/create-instalacione.dto.ts:64-82` — todos leídos completos.
- **Para qué sirve:** vincular el servicio de un cliente a una caja NAP y a uno de sus puertos para saber qué puerto ocupa cada cliente.
- **Acceso:** el del formulario de servicio de cliente (otro inventario); backend solo JWT.
- **Botones y acciones / campos:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Caja(s) Nap: | select con búsqueda, con "x" para limpiar | No | Opciones: todas las cajas del router del servicio (`GET /caja-nap` con header `router-id`) | No filtra por estado ni `isActive` (incluye desactivadas y en mantenimiento) |
| Puerto Nap: | select (aparece al elegir caja) | Sí si hay caja: "Elige una opción" | Lista "Puerto N" de puertos **libres** + opción "Ninguno" | Libres = no usados por ningún servicio no retirado del router (`ServicioInternet.vue:455-465,679-694`) |

- **Reglas de negocio:**
  - **Alta de cliente con servicio** (`POST /customers`, `:370-379`): si la caja viene vacía o el puerto **no es un UUID** (p. ej. "Ninguno" o vacío), el backend **descarta ambos** campos y guarda el servicio sin caja ni puerto ✅.
  - **Edición del servicio** (`PUT /customers/actualizarDatosServicio/:id`, la que usa el botón de guardar de `ServicioInternet.vue:821`; `customers.service.ts:2500-2507`): la misma comprobación **quita caja y puerto del `UPDATE`**, no los pone en nulo. Por eso, en un servicio que ya tiene caja y puerto, dejar la caja vacía (la "x"), elegir "Ninguno" o cambiar de caja con "Ninguno" **no desasigna nada**: los valores guardados se conservan ✅ (el código nunca escribe `NULL` en esas columnas; solo `PATCH /customers/actualizarServicio/:id`, de cuerpo libre y sin pantalla de este módulo, podría hacerlo).
  - **Agregar un servicio a un cliente existente** (`POST /customers/agregar-servicio`, body sin DTO, `:575-590`) usa otra comprobación: descarta caja y puerto solo si alguno de los dos tiene **longitud 0** (`servicio.caja_id.length === 0 || servicio.puerto_id.length === 0`). La opción "Ninguno" (texto de 7 letras) **no** se descarta: el valor `"Ninguno"` llega a `puerto_id` (columna uuid) y el guardado falla en la base; el controlador de errores de ese servicio solo traduce los códigos `23505` / `23503`, el resto sale como 500 `Unexpected error, check server logs` (`:3212-3223`) ✅ código; ❓ confirmar el mensaje en pantalla (el front lo mostraría como el aviso `warning` del modal "Agregar Servicio" con ese texto).
  - **No hay validación en backend** de que el puerto no esté ya ocupado, ni restricción única en la tabla: solo el frontend oculta los puertos usados (✅ no encontrado ningún chequeo ni índice único; ver Hallazgos).
  - **Cómo calcula el front los puertos libres** ✅ `ServicioInternet.vue:454-478,667-694`: al elegir router pide `GET /customers/get-ips/<router_id>` (devuelve los servicios con `deleted = false` de ese router, **suspendidos incluidos**, con su caja y puerto; `customers.service.ts:1967-1992`) y guarda los `puerto_id` en uso; `GET /caja-nap` con la cabecera `router-id` trae **todas** las cajas del router (activas, desactivadas, en mantenimiento y llenas, ordenadas por creación) con sus puertos. Al elegir una caja la lista de puertos es "Ninguno" + los "Puerto N" que no estén en uso, ordenados por número; una caja llena solo ofrece "Ninguno". Cambiar de caja vacía el puerto; la "x" del campo vacía caja y puerto; cambiar de router o de plan reinicia ambos (:1046-1058). Validación: si hay caja y el puerto está vacío, "Elige una opción" (`useCliente.js:413-419`). **Al editar** un servicio con puerto, el puerto actual se añade a la lista aunque figure en uso (:983-995); si luego se cambia de caja y se vuelve, el propio puerto ya no se ofrece.
  - Retirar un servicio (`deleted=true`) **no limpia** `caja_id`/`puerto_id` (`customers.service.ts:2940`): el puerto se vuelve a ver libre en lista y formularios porque esas consultas excluyen `deleted=true`, pero el servicio retirado sigue apuntando a él.
  - **Importación masiva de clientes** (`ModalCargarExcel.vue`, columnas T `CAJA NAP` y U `PUERTO NAP`): solo se procesan si **ambas** celdas traen valor; con una sola se ignoran las dos sin aviso. La caja se busca entre las del router de la fila por **nombre exacto** tras cambiar `_` por espacio y recortar (`caja.nombre == celda.replace(/_/g," ").trim()`); el puerto, por número entre los de esa caja. Si no se encuentra: error de fila "No se encontro la caja con el nombre <celda>" / "No se encontro el puerto <celda>" (:316-337,734-740). Ojo: la lista desplegable de cajas del Excel sale de `convertirAValidoEnExcel`, que cambia por `_` todo carácter fuera de `A-Za-z0-9._` (y antepone `_` si empieza por un número); elegir del desplegable una caja llamada, por ejemplo, "Caja-01" deja "Caja_01", que la importación convierte en "Caja 01" y **no encuentra** (mikrotik.service.ts:1805,1943-1951 · ModalCargarExcel.vue:316-318). El importador no comprueba si el puerto ya está ocupado.
  - **Pre-asignación en instalaciones** (`SeccionPreAsignacion.vue`, tarjeta "Pre-asignación técnica", interruptor "Pre-asignar recursos"): elige "Router" y luego "Caja NAP" (placeholders "Primero elige router" / "Selecciona una caja" / "Sin cajas") y "Puerto NAP" ("Primero elige caja" / "Selecciona un puerto" / "Sin puertos libres"), con los mismos cálculos de puertos libres (`get-ips` y `GET /caja-nap`). Se guarda en `instalaciones.pre_asignacion` (jsonb con `caja_id` y `puerto_id` UUID) y **no reserva nada**: el comentario de la entidad dice que la reserva real ocurre al guardar el servicio, y la lista de puertos libres no mira las pre-asignaciones de otras instalaciones, así que dos instalaciones pueden pre-asignar el mismo puerto (`instalacione.entity.ts:89-109`). Al cancelar la instalación el backend pone `pre_asignacion = null` (`instalaciones.service.ts:703-708`); el texto de la tarjeta dice "Los recursos se liberan automáticamente si se cancela la instalación". Con la instalación en `INSTALADO` o `CANCELADA` la sección queda de solo lectura con los avisos "La instalación ya está finalizada. Los datos reflejan los recursos realmente usados al crear el servicio y no se pueden modificar." / "La instalación está cancelada. Los recursos pre-asignados fueron liberados; esta sección queda en solo lectura." (SeccionPreAsignacion.vue:10-23).
  - **Al completar la instalación** (alta o `agregar-servicio` con `instalacion_id`): `aplicarPreasignacion` precarga plan, red, IPv4, caja, puerto y precio; si la IPv4 o el puerto ya no están libres deja el campo vacío y muestra el diálogo "Recursos pre-asignados no disponibles" ("Algunos recursos reservados en la instalación ya están en uso por otro servicio: … Puerto NAP: pre-asignado puerto reservado ya en uso. Asignado: (elige otro libre) … Se eligieron alternativas disponibles. Verifica antes de guardar.", botón "Entendido"; `ServicioInternet.vue:900-963`). Tras guardar, el backend marca la instalación `INSTALADO` y reescribe `pre_asignacion` con los valores **realmente usados** (`construirPreAsignacionDesdeServicio`, `customers.service.ts:614-627,826-846`).
- **Modelo de datos (puertos):** `puertos(id uuid, cajaNap_id → cajas-nap ON DELETE CASCADE, puerto int, isActive bool default true)`; `isActive` del puerto **no se usa** en ninguna pantalla ni servicio (el front lo sobrescribe localmente con "ocupado"). El módulo `puertos` no expone endpoints (controlador y servicio vacíos). Los puertos solo se crean/borran desde `caja-nap.service.ts`.
- **Efectos secundarios externos:** ninguno.
- **Relaciones:** Mapa (NET-008) pinta cliente→caja con línea y distancia; reporte de ocupación (NET-005).
- **Casos límite y advertencias:** un puerto puede quedar asignado a dos servicios si se edita por API o dos usuarios eligen el mismo a la vez; los suspendidos mantienen puerto; la cantidad de puertos "libres" del reporte y de la lista usan `deleted=false`, pero el mapa **no** filtra `deleted` (ver NET-008). La plantilla Excel de clientes (hoja oculta `lista`) marca como ocupado el puerto con cualquier servicio asociado, **incluidos los retirados** (`puerto.plan_internet.length == 0`, `mikrotik.service.ts:1805-1806`), mientras que la pantalla los da por libres. "Agregar Servicio" con caja y "Ninguno" falla (regla arriba).
- **Preguntas probables de usuarios:** 1) ¿Cómo asigno un puerto al cliente? 2) ¿Por qué no veo el puerto 5 en la lista? (está ocupado). 3) ¿Qué pasa con el puerto cuando retiro al cliente? (queda libre). 4) ¿Para qué sirve "Ninguno"? (guardar el alta sin puerto; al editar un servicio con puerto no lo quita y en "Agregar Servicio" a un cliente existente falla con una caja elegida). 5) ¿Puedo cambiar de puerto a un cliente? (sí, editando su servicio y eligiendo otro puerto libre; quitarlo no es posible desde la edición). 6) ¿Dos clientes en un mismo puerto? (splitter; el sistema no lo permite desde la pantalla).
- **Resuelto con el código:** el selector de caja **no** oculta cajas llenas ni desactivadas (una caja llena solo ofrece "Ninguno"); al editar, el puerto actual aparece en la lista aunque la caja esté desactivada porque `GET /caja-nap` devuelve todas.
- **Pendiente de validar en UI:** ❓ mensaje exacto que ve el usuario al guardar "Agregar Servicio" con caja y puerto "Ninguno"; ❓ que al editar un servicio y vaciar caja/puerto la pantalla muestre otra vez los valores guardados al recargar.

## NET-007 · Selector de coordenadas (ModalMapBox)
- **Ruta UI / name:** modal reutilizable "Coordenadas Seleccionada" (cajas NAP, routers, servicio de cliente, instalaciones).
- **Archivos:** FE: `src/components/ModalMapBox.vue`, `src/boot/apiSearchPlaces.js`, `src/composables/useUbicacion.js` · BE: ninguno.
- **Para qué sirve:** elegir en un mapa Mapbox el punto de un elemento y devolver `{lng, lat}`.
- **Acceso:** el de la pantalla que lo abre.
- **Botones y acciones:** clic en el mapa mueve el marcador; "Acercar Mapa"/"Disminuir Mapa" (zoom 1–19), "Ir a mi ubicación", "Ver satélite"/"Ver mapa" (alterna `streets-v12` / `satellite-streets-v12`), "Pantalla completa"/"Restaurar tamaño", buscador de lugares (geocoding, 6 resultados, español, sesgado a la posición actual), "Agregar Coordenadas" (emite `coordenadasSelected`), cerrar (X). Cabecera: "Coordenadas Seleccionada", "Lng:" y "Lat:" con 6 decimales en móvil.
- **Reglas:** centro inicial = coordenada guardada (decimal "lng, lat" o DMS) → si no hay, GPS del equipo (precisión deseada 100 m, máx. 8 s) → si falla, **Babahoyo (-79.5333, -1.8025)** (`ModalMapBox.vue:13,119-120`). Si no hay permiso de ubicación muestra el aviso del navegador/app (ver NET-028).
- **Efectos externos:** llamadas a `api.mapbox.com` (estilos, geocoding). **Token público `pk.…` embebido en el código** (`FE:components/ModalMapBox.vue:46` y `FE:boot/apiSearchPlaces.js:8`), distinto del `VITE_MAPBOX_TOKEN` que usa el mapa de red.
- **Casos límite:** coordenadas guardadas con formato inválido caen al GPS/Babahoyo; el botón "Ir a mi ubicación" falla en silencio si no hay GPS.
- **Preguntas probables:** 1) ¿Por qué el mapa abre en otra ciudad? (no hay coordenada ni GPS: usa un punto por defecto de Ecuador). 2) ¿Cómo busco una calle? (cuadro de búsqueda del mapa). 3) ¿Por qué pide mi ubicación? (para centrar). 4) ¿Qué formato guarda? (longitud, latitud).
- **Pendiente de validar en UI:** ❓ comportamiento del botón "Ir a mi ubicación" sin GPS.

## NET-008 · Mapa de Red y Clientes — vista principal
- **Ruta UI / name:** `/mapa-nap` · `index.mapa` · menú Gestión de Red → "Mapa de Red y Clientes" (`FE:layouts/SideBarMenu.vue:189-199`).
- **Archivos:** FE: `pages/dashboard/Gestion-Red/mapa-nap/IndexPage.vue` (5 421 líneas: script 1-4062, plantilla 4064-4706, estilos 4708-5421) · BE: `caja-nap/caja-nap.controller.ts:43-50` + `caja-nap.service.ts:119-142` (`obtener-cajas-y-clientes`), `customers/customers.controller.ts:179-186` + `customers.service.ts:1770-1855` (`/customers/mapa/clientes`), `app.controller.ts:74-80` (`/resumen-cliente`), `red-fibra/*`.
- **Para qué sirve:** ver sobre Mapbox las cajas NAP (con ocupación), los clientes (por estado de servicio y de conexión), la fibra física (postes, mangas, nodos, tendido) y, con permiso, los técnicos; buscar, medir distancias caja→cliente y, con permiso, editar la red.
- **Acceso:** menú `index.mapa`; guard por nombre de ruta. Sub-permisos (catálogo "Ver Mapa", `gestion-red-permisos.json:72-80`): `editar.red.mapa` ("Editar red (postes, líneas y mover elementos)") y `mapa.tecnicos.index` ("Ver ubicación de los técnicos"). Backend: JWT; `mapa.tecnicos.index` se exige además en `GET /ubicacion-tecnicos`. Los endpoints del mapa aplican el alcance de routers del usuario (`users.routers`): cajas (`caja-nap.service.ts:129-132`) y clientes (`customers.service.ts:1772-1798`).
- **Secciones / pestañas:** mapa a pantalla del bloque; arriba a la izquierda "ROUTERS", "BUSCAR CAJA / CLIENTE" (o "Buscar cliente") y "Tipo"; a la derecha una columna de botones; barra de edición y menú de capas.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| ROUTERS (select) | Recarga el mapa para el router elegido | — | recarga datos | Solo visible si el usuario tiene más de un router (`routers.length > 1`). Si tiene exactamente uno, se preselecciona (`IndexPage.vue:3812-3816`) |
| Tipo (select): "Cajas Nap y Clientes" (por defecto), "Clientes", "Cajas Nap" | Cambia qué se dibuja y de dónde salen los datos | — | `caja-nap/obtener-cajas-y-clientes` o `customers/mapa/clientes` | "Clientes" no muestra cajas ni líneas; "Cajas Nap" no muestra clientes |
| BUSCAR CAJA / CLIENTE (autocompletar, clearable) | Busca por nombre/ubicación de caja y por nombre o documento de cliente; vuela a zoom 18 y resalta | — | local | Lista con iconos hub (caja) y person (cliente); "Sin cajas ni clientes que coincidan". En modo "Clientes" el campo es "Buscar cliente" (tooltip "Este cliente tiene varios servicios" si aplica) |
| zoom_in / zoom_out | ±1 nivel (1–19) | — | — | |
| my_location | Vuela a tu ubicación | — | — | Sin GPS: "No tenemos tu ubicación. Habilitá los permisos del navegador y recargá." |
| satellite_alt / map (tooltip "Ver satélite" / "Ver mapa") | Alterna calles ↔ satélite | — | — | Reaplica capas tras `setStyle` |
| fullscreen (tooltip "Pantalla completa" / "Salir de pantalla completa (ESC)") | Pantalla completa por CSS | — | — | |
| edit_location_alt (tooltip "Editar red (postes y líneas)" / "Salir del modo edición") | Entra/sale del modo edición (NET-010) | `editar.red.mapa` (el botón no se ve sin permiso) | — | Al activarlo sin permiso: warning "No tienes permiso para editar la red" |
| layers (tooltip "Capas y filtros") | Menú de capas, colores, satélite, leyenda | — | — | Detalle abajo |

- **Menú "Capas y filtros":**
  - **Mostrar clientes:** checkboxes "Activos", "Suspendidos", "Sin conexión" (los tres marcados por defecto).
  - **Colorear por:** "Estado" | "Red" (preferencia en `localStorage` `mapa-nap:colorear-por`). En "Red" cada cliente toma el color configurado de su red IPv4 (`red.color`); sin color se pinta por estado. Lista **Redes** con checkbox por red (nombre y cantidad), botones "Ver todas"/"Ocultar todas" (estado y red se combinan con AND).
  - **Red de fibra:** "Postes y cajas", "Mangas", "Nodos", "Códigos de postes", "Tendido de fibra".
  - **Técnicos:** "Ver dónde están" (solo con `mapa.tecnicos.index`) — NET-012.
  - **Imagen satelital:** "Esri (por defecto)" | "Mapbox" ("Aplica al modo satélite; compara cuál se ve mejor en tu zona.").
  - **Comportamiento:** "Abrir info al pasar el cursor" (desactivado por defecto: "la info se abre solo al hacer clic").
  - **Leyenda:** Clientes (Activo / Suspendido / Sin conexión), Técnicos (hace < 5 min / < 30 min / más viejo), Postes (Poste, Poste municipal, C. NAP, No pasa fibra), Cajas NAP "borde = ocupación" (Con espacio < 70 %, Casi llena 70–99 %, Llena 100 %).
- **Campos de formulario:** ninguno (solo controles).
- **Filtros y columnas de tabla:** n/a. Cajas sin coordenadas no se dibujan (`getCajasNap` filtra `coordenadas.length > 0`; coordenadas no interpretables tampoco).
- **Estados posibles (colores):**
  - **Cliente (silueta de persona):** verde `#22c55e` ACTIVO = servicio `isActive` y conexión distinta de `offline`; naranja `#f59e0b` SIN CONEXIÓN = `isActive` y `estado_conexion = 'offline'`; rojo `#ef4444` INACTIVO/Suspendido = `isActive=false` (`IndexPage.vue:2318-2332`). `estado_conexion` ∈ online/offline/sin_datos (NET-022); `sin_datos` se pinta como activo.
  - **Caja NAP (tarjeta blanca con borde):** verde `#16a34a` < 70 % ocupación, naranja `#f59e0b` 70–99 %, rojo `#dc2626` 100 %, gris `#64748b` sin puertos (`:2380-2390`). Ocupación del mapa = puertos con servicio / total de puertos.
  - **Poste/mangas/nodos:** ver NET-009. **Técnicos:** NET-012.
- **Reglas de negocio (backend):**
  - `GET /caja-nap/obtener-cajas-y-clientes`: cajas con puertos → servicio (`plan_internet`) → cliente, plan y red; filtra por routers permitidos y por header `router-id`; el parámetro `estado` **nunca llega** (la ruta no lo declara), por lo que devuelve cajas activas e inactivas (`caja-nap.controller.ts:43-50`).
  - La consulta del mapa **no filtra `deleted = false`**: servicios retirados que conservan `puerto_id` pueden aparecer ocupando el puerto (❓ validar). Solo el borrado lógico (`deleted_at`) queda fuera automáticamente.
  - `GET /customers/mapa/clientes`: clientes con ≥ 1 servicio con coordenadas (no soft-deleted), con todos sus servicios no soft-deleted, y las `ubicacion` de los routers (para centrar). Un cliente con varios servicios aparece una vez por servicio con coordenadas.
  - Si hay varios servicios por puerto solo se dibuja el primero (`plan_internet[0]`, `IndexPage.vue:143`).
- **Efectos secundarios externos:** tiles/estilos/geocoding/Directions de **Mapbox** (token `VITE_MAPBOX_TOKEN`, fijado al compilar, `IndexPage.vue:90`); imágenes de **Esri World Imagery** (`server.arcgisonline.com`) como satélite por defecto; llamadas a `/resumen-cliente` al abrir popups de cliente. No toca MikroTik.
- **Mensajes de error/éxito (texto exacto):** "Se cargaron N clientes, pero ninguno tiene coordenadas válidas para el buscador." (warning); "No se pudo cargar la lista de clientes del mapa (HTTP …)" (negative); "Ocurrió un error al dibujar algunos datos en el mapa."; "No se encontró coordenadas en clientes o router"; "El cliente no tiene coordenadas válidas"; geolocalización: `<mensaje> La opción "Cómo llegar" estará desactivada.`; en el popup de pago: "Cargando información de pago…" / "No se pudo cargar info de pago".
- **Popups (qué ve el usuario):**
  - **Caja** (clic en la tarjeta; ancho hasta 600 px, 2 columnas): "Caja Nap:", "Ubicación:" ("Sin ubicación" si vacía), "Detalles:", "N° de puertos:", "Ocupación:" (`usados/total (x%)`), "Puertos disponibles:" (lista o "Ninguno"), "Coordenadas:", opcional "Detalles Adicionales:" y "Potencia:", "Estado:" (texto `estado`); columna "Clientes por puerto (N)" con nº de puerto, nombre, distancia en línea recta y punto de color de estado ("Ninguno" si vacía); botón "📍 ¿CÓMO LLEGAR AQUÍ?". Pasar el cursor por una fila resalta la línea; clic vuela al cliente.
  - **Cliente:** 👤 nombre (clic → `/clientes/edit/:id`), 🏠 dirección, 🪪 documento, 📞 celular; tarjeta del servicio: plan + insignia (ACTIVO / INACTIVO / SIN CONEXIÓN), 📍 dirección, 📡 IPv4, 🔢 Puerto NAP, 📏 Distancia a la caja, 🔌 ONU SN (clic → ONU en SmartOLT/AdminOLT), 💰 precio; resumen de pago ("Día de pago", "Día de corte", "Deuda · N factura(s)" o "Al día · Sin deuda"); "Otros servicios (N)" y "Sin coordenadas"; botón "📍 ¿CÓMO LLEGAR AQUÍ?".
- **Relaciones con otros módulos:** Cajas NAP/puertos, Clientes (servicio, `coordenadas`, `estado_conexion`, `trazado_acometida`), Redes IPv4 (color), SmartOLT/AdminOLT (SN), Facturación (`/resumen-cliente`: día de pago, corte, deuda), Técnicos (tickets/visitas), Routers.
- **Casos límite y advertencias:**
  - El mapa de red pinta clientes como **capa** (GPU) y cajas como marcadores DOM, que solo existen dentro de la vista (+ ½ pantalla de margen). Con miles de clientes el rendimiento depende de la capa.
  - Un cliente sin coordenadas no aparece; coordenadas guardadas en formato no soportado tampoco (el buscador avisa).
  - El orden de coordenadas guardadas es `lng,lat`; en DMS (`1°48'9"S 79°32'0"W`) se interpreta como lat, lng.
  - Mapa de red usa `VITE_MAPBOX_TOKEN`, pero el selector de coordenadas (NET-007) y el mapa de AdminOLT tienen un token **embebido**; si el token de entorno falta o caduca solo el mapa de red falla (❓).
  - El umbral de rojo en el mapa (100 %) difiere del reporte (≥ 90 %).
- **Preguntas probables de usuarios:**
  1. ¿Por qué no veo una caja en el mapa? (sin coordenadas, o coordenadas con formato inválido, o router no permitido).
  2. ¿Qué significan los colores de los clientes? (verde activo / rojo suspendido / naranja activo sin conexión real).
  3. ¿Cómo encuentro a un cliente por cédula? (BUSCAR CAJA / CLIENTE).
  4. ¿Por qué sale "Sin conexión" si está pagado? (el estado de conexión lo mide el sistema contra ONU/PPPoE).
  5. ¿Cómo veo el satélite? (botón satélite; puede elegir Esri o Mapbox en Capas).
  6. ¿Qué es el borde de la caja? (ocupación de puertos).
  7. ¿Cómo marco quién está cerca de un caído? (usar buscador por caja y lista "Clientes por puerto").
  8. ¿Por qué no me deja editar? (necesita el permiso "Editar red").
- **Pendiente de validar en UI:** ❓ retirados en el mapa; ❓ comportamiento con varios routers y "TODOS" (rendimiento); ❓ visibilidad del menú de vistas de importación fuera del modo edición (no está: ver NET-011).

## NET-009 · Mapa — Red de fibra física: postes, mangas, nodos y tendido (visualización)
- **Ruta UI / name:** capa dentro de `/mapa-nap`.
- **Archivos:** FE: `mapa-nap/IndexPage.vue:415-1016` · BE: `red-fibra/red-fibra.controller.ts:16-19`, `red-fibra.service.ts:28-50`, `entities/poste.entity.ts`, `entities/tramo-fibra.entity.ts`.
- **Para qué sirve:** mostrar el relevamiento físico: postes, cajas/NAP puntuales, mangas de empalme, nodos/cabecera y el tendido de fibra con su longitud.
- **Acceso:** `index.mapa`.
- **Qué ve el usuario:**
  - **Puntos (tipo → ícono/color):** `poste` verde `#2e7d32`; `poste municipal` morado `#8e24aa`; `c_nap` cajita turquesa `#00838f`; `no pasa fibra` gris `#455a64`; `manga` domo naranja `#ef6c00`; `nodo` rombo rojo `#c62828` (`IndexPage.vue:654-663`). Código del poste debajo del ícono (rojo) desde zoom 14.
  - **Tendido:** línea del color del tramo (por defecto `#1565c0`, 3 px) con etiqueta de longitud total al centro desde zoom 14 (`m` si < 1 km, si no `km` con 2 decimales).
  - **Interacción:** clic en un poste → popup "Poste {código|s/n}", "Tipo: …", "Observación: …". Los tramos solo son clicables en modo edición.
  - **Filtros:** "Postes y cajas" (poste, poste municipal, no pasa fibra, c_nap), "Mangas", "Nodos" (separados porque son pocos y relevantes), "Códigos de postes" (depende de "Postes y cajas"), "Tendido de fibra".
- **Modelo de datos ✅:** `postes(id, router_id → routers CASCADE, codigo varchar50 null, tipo varchar40 default 'poste', observacion text null, lat double, lng double, import_id uuid null, import_nombre varchar255 null, isActive default true, created_at, updated_at)`; `tramos_fibra(id, router_id CASCADE, nombre varchar100 null, tipo varchar40 default 'fibra', color varchar20 null, path jsonb [[lng,lat],…], notas text null, import_id, import_nombre, isActive, created_at, updated_at)`. El tipo es **texto libre** en BD (no hay catálogo validado en backend).
- **Reglas de negocio (backend):** `GET /red-fibra/mapa` (header `router-id`; vacío o `'null'` = todos) devuelve postes y tramos con `isActive = true` ordenados por código/fecha, **sin aplicar el alcance de routers del usuario** (`red-fibra.service.ts:28-50`).
- **Efectos secundarios externos:** ninguno.
- **Casos límite y advertencias:**
  - Un punto de tipo `c_nap` en el mapa es solo un marcador del relevamiento: **no está vinculado a ninguna caja NAP** de la tabla `cajas-nap` (no hay relación en el modelo).
  - "tipo" de tramo (`fibra`, `troncal`, `distribucion`) no cambia el dibujo; solo el color y el nombre.
  - La leyenda no incluye "Manga" ni "Nodo".
  - No hay forma en la UI de desactivar (`isActive`): se elimina.
- **Preguntas probables de usuarios:** 1) ¿Qué diferencia hay entre una caja NAP y un "C. NAP" del mapa? (la primera es el registro con puertos y clientes; la segunda es un punto del relevamiento). 2) ¿Cómo oculto los postes y dejo solo la troncal? (Capas → Red de fibra). 3) ¿Qué significa un poste gris? ("no pasa fibra"). 4) ¿Cómo sé cuántos metros tiene un tramo? (etiqueta o formulario del tramo). 5) ¿Por qué no veo el código? (zoom ≥ 14 y casilla "Códigos de postes").
- **Pendiente de validar en UI:** ❓ aspecto de los íconos y etiquetas; ❓ rendimiento con miles de postes.

## NET-010 · Mapa — Modo edición de la red (postes, tramos, mover cajas/clientes, acometidas)
- **Ruta UI / name:** botón "edit_location_alt" en `/mapa-nap`.
- **Archivos:** FE: `mapa-nap/IndexPage.vue:1018-1703, 4236-4336, 4574-4704` · BE: `red-fibra.controller.ts:43-79`, `red-fibra.service.ts:206-305`, `caja-nap.service.ts:561-604`, `customers.controller.ts:304-312` (`PATCH /customers/actualizarServicio/:id`).
- **Para qué sirve:** dibujar y corregir la red física y reubicar cajas/clientes directamente sobre el mapa.
- **Acceso:** `editar.red.mapa` (botón oculto sin permiso). Backend: solo JWT (cualquier usuario autenticado podría llamar a estos endpoints).
- **Secciones / pestañas:** barra superior de edición (Poste · Línea · Importar KMZ · vista · Guardar trazado/Cancelar) y diálogos.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Poste (herramienta) | Cursor en cruz; clic en el mapa abre "Nuevo poste"; si se hace clic sobre un poste existente abre ese poste | `editar.red.mapa` | `POST /red-fibra/postes` | Pregunta el router si no se conoce ("¿A qué router pertenece?" — "La red se guarda por router. Elegí a cuál se agrega lo que dibujes."; botones Continuar/Cancelar) |
| Línea (herramienta) | Traza una polilínea (clic = vértice, doble clic = terminar) y abre "Nuevo tramo de fibra" | idem | `POST /red-fibra/tramos` | Al terminar, los vértices a ≤ 12 m de un poste se **imantan** al poste; aviso "N vértice(s) imantado(s) a postes" |
| Poste → Eliminar | Diálogo "Eliminar poste" / "¿Eliminar el poste X?" | idem | `DELETE /red-fibra/postes/:id` | Éxito "Poste eliminado" |
| Poste → Mover | Marcador naranja arrastrable; al soltar guarda | idem | `PATCH /red-fibra/postes/:id` | Aviso "Arrastra el marcador naranja a la nueva posición; al soltarlo se guarda"; "Ubicación del poste actualizada" |
| Poste → Guardar | Crea/actualiza | idem | `POST`/`PATCH` | "Poste creado" / "Poste actualizado"; error "No se pudo guardar el poste" |
| Clic en un tramo | Abre el formulario del tramo (si no hay herramienta activa) | idem | — | El poste tiene prioridad sobre el tramo en los clics |
| Tramo → Editar trazado | Pasa el tramo a edición de vértices; "Guardar trazado" / "Cancelar" en la barra | idem | `PATCH /red-fibra/tramos/:id {path}` | Mínimo 2 puntos ("El trazado debe tener al menos 2 puntos"); también se imanta a postes |
| Tramo → Eliminar | "Eliminar tramo" / "¿Eliminar este tramo de fibra (X)?" | idem | `DELETE /red-fibra/tramos/:id` | "Tramo eliminado" |
| Arrastrar una caja NAP | Diálogo "Mover caja NAP" / "¿Guardar la nueva ubicación de X?" (Guardar/Cancelar) | idem | `PATCH /caja-nap/:id {coordenadas:"lng,lat"}` | Descarta los trazados manuales de acometida de esa caja; éxito "Ubicación actualizada"; error "No se pudo actualizar la ubicación" |
| Arrastrar un cliente (silueta) | Diálogo "Mover cliente"; idem | idem | `PATCH /customers/actualizarServicio/:id {coordenadas, trazado_acometida:null}` | Cambia la `coordenadas` del servicio del cliente |
| Clic en una línea verde (acometida) | Diálogo "Acometida del cliente" con "Trazado actual: manual (dibujado a mano) / automático (ruta por calles)" | idem | — | Botones "Ajustar trazado", "Restaurar automático", "Cerrar" |
| Ajustar trazado → Guardar trazado | Guarda el recorrido manual de la acometida (extremos fijos en caja y cliente) | idem | `PATCH /customers/actualizarServicio/:id {trazado_acometida}` | "Trazado de la acometida guardado" / "Acometida guardada · N vértice(s) imantado(s) a postes" |
| Restaurar automático | Borra el trazado manual | idem | `PATCH … {trazado_acometida:null}` | "La acometida volvió al trazado automático" |

- **Campos de formulario:**

| Formulario | Campo | Tipo | Obligatorio | Validación / valores |
|---|---|---|---|---|
| Poste ("Nuevo poste" / "Editar poste") | Código / número (opcional) | texto | No | BE máx. 50; vacío → `null` |
| | Tipo | select | No | `poste`, `poste municipal`, `c_nap`, `manga`, `nodo`, `no pasa fibra` (por defecto `poste`; BE máx. 40, sin lista cerrada) |
| | Observación (ej: no pasa fibra) | texto | No | texto libre |
| | 📍 lat, lng | informativo (6 decimales) | — | BE: `@IsNumber` |
| Tramo ("Nuevo tramo de fibra" / "Editar tramo") | Nombre (opcional) | texto | No | BE máx. 100 |
| | Tipo | select | No | `fibra`, `troncal`, `distribucion` (BE máx. 40) |
| | Color | selector de color | No | por defecto `#1565c0` (BE máx. 20) |
| | Notas (opcional) | texto | No | texto libre |
| | 🧵 n vértices · 📏 longitud | informativo | — | BE: `path` ≥ 2 vértices `[lng,lat]` en rango (`validarPath`) |

- **Estados posibles:** herramienta activa ∈ {ninguna, poste, línea}; ayuda contextual junto a la barra: "Haz clic en el mapa donde va el poste" / "Clic para trazar la línea · doble clic para terminar" / "Clic en poste/línea para editar · arrastra cajas o clientes para moverlos".
- **Reglas de negocio (backend):** `validarPath` exige `[lng,lat]` numéricos y dentro de rango (`red-fibra.service.ts:296-305`); `findPoste`/`findTramo` responden 400 "No se encontró el poste con el id …"/"No se encontró el tramo con el id …"; errores de BD → 500 "Unexpected error, check server logs". Elemento creado queda con `import_id = NULL` (= "dibujado a mano").
- **Efectos secundarios externos:** ninguno (no sincroniza con MikroTik ni OLT).
- **Relaciones:** Cajas NAP (coordenadas), Clientes (coordenadas del servicio, `trazado_acometida`), Routers (dueño del poste/tramo).
- **Casos límite y advertencias:**
  - `PATCH /customers/actualizarServicio/:id` acepta cualquier campo del servicio (`@Body() any`, sin DTO) — el mapa solo manda `coordenadas` y `trazado_acometida`.
  - Las coordenadas del mapa se guardan como `"lng,lat"` sin espacio; el formulario de caja las guarda `"lng, lat"` con espacio: ambas se leen igual, pero el reseteo de acometidas compara texto exacto.
  - Salir del modo edición cancela cualquier trazado o movimiento pendiente.
  - Eliminar poste/tramo es borrado físico (no hay papelera); lo importado se puede deshacer en bloque (NET-011).
- **Preguntas probables:** 1) ¿Cómo agrego un poste? (modo edición → Poste → clic). 2) ¿Cómo corrijo la ubicación de una caja? (arrastrarla y confirmar). 3) ¿Por qué mi línea se "pegó" a un poste? (imantado a 12 m). 4) ¿Se pierde el trazado manual si muevo la caja? (sí, vuelve a automático). 5) ¿Cómo muevo un cliente que está mal ubicado? (arrastrarlo; se guarda en su servicio). 6) ¿Puedo deshacer? (solo por importación; no hay "deshacer" general).
- **Pendiente de validar en UI:** ❓ aspecto de la barra de edición en móvil; ❓ si al mover un cliente multi-servicio solo cambia ese servicio.

## NET-011 · Mapa — Importar KMZ/KML y deshacer importación
- **Ruta UI / name:** botón "Importar KMZ" de la barra de edición (modal "Importar KMZ").
- **Archivos:** FE: `mapa-nap/components/ModalImportarKmz.vue`, `mapa-nap/utils/kmz.js`, `IndexPage.vue:425-531,1209-1214` · BE: `red-fibra/red-fibra.controller.ts:24-38`, `red-fibra.service.ts:59-204`, `dto/importar-red-fibra.dto.ts`.
- **Para qué sirve:** cargar de golpe el relevamiento exportado de Google Earth (postes, NAP, mangas, nodos y líneas) sin tocar lo dibujado a mano.
- **Acceso:** `editar.red.mapa` (en la barra de edición). Backend: JWT.
- **Botones y acciones:**

| Etiqueta | Qué hace | Endpoint | Restricciones/efectos |
|---|---|---|---|
| Archivo .kmz o .kml | Lee y analiza **en el navegador** y muestra el resumen antes de guardar | — | Error: "El archivo debe ser .kmz o .kml", "El KMZ no contiene ningún archivo .kml", "El archivo KML está dañado o no es válido.", "El archivo no contiene puntos ni líneas que se puedan importar." |
| Importar | Envía los elementos normalizados | `POST /red-fibra/importar` (`router_id`, `nombre_archivo`, `omitir_duplicados:true`, `postes`, `tramos`) | Requiere router destino (si no se conoce, el sistema lo pregunta antes de abrir el modal). Éxito: "Importación completada: N punto(s) y M línea(s)." + " Se omitieron X punto(s) ya existentes." |
| Al terminar, mostrar solo lo importado (toggle; "Es solo una vista: lo que ya existía en el mapa no se borra…") | Tras importar, la vista queda en esa importación y se encuadra | — | Desmarcado: vista "Todo" |
| Selector de vista (icono layers; aparece si hay importaciones) | "Todo", "Solo dibujado a mano", o una importación (nombre, "n elemento(s) · fecha") | `GET /red-fibra/importaciones` | Solo es una vista: no borra nada. Solo se ve en modo edición |
| Papelera en cada importación (tooltip "Deshacer esta importación") | Diálogo "¿Deshacer esta importación?": "Se eliminarán los N elemento(s) que creó … Lo que hayas dibujado a mano en el mapa no se toca." (botones "Deshacer"/"Cancelar") | `DELETE /red-fibra/importaciones/:import_id` | Éxito: "Importación deshecha: se eliminaron N elemento(s)" |

- **Reglas de importación (frontend):** la **carpeta** del KML decide el tipo: nombre con "manga" → `manga`; con "nap" o "caja" → `c_nap`; con "nodo" o "cabecera" → `nodo`; cualquier otra → `poste`; un punto llamado exactamente "NODO" es `nodo`. El nombre del Placemark pasa a `codigo`, la descripción a `observacion`. Las líneas se guardan como tramos `fibra` con el color de su estilo KML. Polígonos/MultiGeometry se ignoran ("se omitirán por no tener una geometría admitida (solo se importan puntos y líneas)") (`utils/kmz.js:16-23,109-170`).
- **Reglas de negocio (backend):** una transacción (todo o nada); cada elemento lleva un `import_id` común y `import_nombre`; duplicados de **postes** = misma lat/lng a 6 decimales + mismo tipo en el router (se omiten); los **tramos no se de-duplican** (reimportar duplica las líneas). Deshacer elimina solo elementos con ese `import_id`; si no hay ninguno: 400 "No se encontraron elementos de esa importación". DTO: `codigo` ≤ 50, `tipo` ≤ 40, `nombre` ≤ 100, `color` ≤ 20, `nombre_archivo` ≤ 255; límite de cuerpo 50 MB.
- **Efectos secundarios externos:** ninguno.
- **Casos límite y advertencias:** un nombre de Placemark de más de 50 caracteres hace fallar la validación de **todo** el lote (400, mensaje por campo) (❓ probar); el selector de vista no se muestra fuera del modo edición, así que tras salir queda la última vista elegida hasta recargar.
- **Preguntas probables:** 1) ¿Qué formato debe tener mi KMZ? (carpetas MANGA / NAP / NODO…). 2) ¿Puedo importar dos veces el mismo archivo? (los puntos repetidos se omiten; las líneas se duplican). 3) ¿Cómo revierto una importación equivocada? (papelera de la importación). 4) ¿Importa cajas NAP con puertos? (no: solo puntos del mapa). 5) ¿Se mezcla con lo que dibujé? (convive; se puede filtrar).
- **Pendiente de validar en UI:** ❓ tamaño máximo práctico de KMZ; ❓ texto exacto al fallar validación de DTO (lista de mensajes).

## NET-012 · Mapa — Capa "Técnicos" (ubicación en vivo aproximada)
- **Ruta UI / name:** casilla "Ver dónde están" en Capas y filtros de `/mapa-nap`.
- **Archivos:** FE: `mapa-nap/IndexPage.vue:3602-3808`, `src/composables/useLatidoUbicacion.js`, `src/composables/useUbicacion.js` · BE: `ubicacion-tecnicos/ubicacion-tecnicos.controller.ts`, `ubicacion-tecnicos.service.ts`.
- **Para qué sirve:** saber dónde estaba hace unos minutos cada técnico respecto de cajas y clientes, y con qué ticket está.
- **Acceso:** `mapa.tecnicos.index` ("Ver ubicación de los técnicos") o `SUPER-ADMINISTRADOR`; **se exige también en backend** (403 "No tenés permiso para ver la ubicación de los técnicos").
- **Qué ve el usuario:** un círculo con iniciales (o foto) por técnico; color según antigüedad del último aviso: verde ≤ 5 min, ámbar ≤ 30 min, gris más viejo. Ficha: nombre, "hace un momento / hace N min / hace N h", "±N m", "GPS de la app" o "navegador", ticket "Ticket #N · Estado / cliente / dirección" o "Sin visita marcada en este momento", botones "Llamar" y "WhatsApp" (celular normalizado a 593…) o "Sin celular cargado". Texto de ayuda: "Se actualiza mientras están en jornada o tienen el sistema abierto." Se vuelve a consultar cada 60 s; la preferencia se guarda en `localStorage` (`mapa-nap:ver-tecnicos`).
- **Reglas de negocio (backend):** el panel del técnico (rol `TECNICO`) avisa su posición si ya dio permiso de ubicación: cada ~2 min, solo si se movió ≥ 40 m o pasaron 10 min, solo con la pestaña visible y sin jornada de la app activa (`FE:composables/useLatidoUbicacion.js:25-27,74-79,82-120,176`); `POST /ubicacion-tecnicos` hace upsert del **último punto** por usuario (no hay historial; rechaza coordenadas inválidas o 0,0). `GET` devuelve usuarios activos con aviso en las **últimas 12 horas** (`HORAS_VISIBLE`) y el ticket en que están (última marca "llegada" sin salida, ticket no cerrado ni cancelado).
- **Efectos secundarios externos:** WhatsApp/telefonía solo como enlaces `wa.me` y `tel:` en la ficha.
- **Mensajes:** "No se pudo cargar la ubicación de los técnicos. Se vuelve a intentar cada minuto." (aviso único). Al técnico se le explica una vez: título "Tu ubicación".
- **Casos límite y advertencias:** no es rastreo continuo; con la app/pantalla cerrada no hay avisos; no muestra técnicos de otros roles; la lista no está filtrada por router.
- **Preguntas probables:** 1) ¿Por qué no aparece un técnico? (no dio permiso de ubicación, no tiene el sistema abierto o pasaron 12 h). 2) ¿Es en tiempo real? (aproximado, cada pocos minutos). 3) ¿Qué es el color gris? (último aviso hace más de 30 min). 4) ¿Puedo ver el historial de recorrido? (no se guarda).
- **Pendiente de validar en UI:** ❓ aspecto de las fichas y la foto.

## NET-013 · Mapa — Distancias, rutas y "¿Cómo llegar aquí?"
- **Ruta UI / name:** funciones transversales de `/mapa-nap`.
- **Archivos:** FE: `mapa-nap/IndexPage.vue:393-413, 1705-2120, 3329-3482`.
- **Para qué sirve:** estimar cuánta fibra de acometida se necesita (distancia caja→cliente), ver el recorrido sugerido y trazar una ruta de manejo hasta una caja o cliente.
- **Acceso:** `index.mapa`.
- **Qué ve el usuario / reglas:**
  - **Distancias** en m o km: línea verde caja→cliente con etiqueta al centro (desde zoom 15) en el modo "Cajas Nap y Clientes"; "Distancia a la caja" en el popup del cliente y distancia por cliente en el popup de la caja. Inicialmente es la **recta**; luego se reemplaza por el recorrido "por calles" (perfil *walking* de Mapbox Directions) y se corrige la distancia cuando llega. Se descarta el recorrido si resulta > 4× la recta + 30 m; enlaces < 20 m no consultan la API.
  - **Caché en el navegador** (`localStorage` `mapa-nap:rutas-fibra:v2`): cada par caja-cliente se consulta una sola vez por navegador; concurrencia 6; un trazado manual guardado (NET-010) tiene prioridad sobre el automático.
  - **"📍 ¿CÓMO LLEGAR AQUÍ?":** requiere GPS; dibuja una ruta de **manejo** (*driving*) desde tu posición y muestra "Distancia aproximada: N km." en un popup. Sin ubicación: "Necesitamos tu ubicación para calcular la ruta. Habilitá los permisos del navegador y recargá."; sin coordenadas de caja: "La caja nap no cuenta con coordenadas".
  - **No existe herramienta de medición libre** (regla): las únicas medidas son las anteriores y la longitud de cada tramo de fibra.
- **Efectos secundarios externos:** cada ruta calculada consume cuota de **Mapbox Directions** con `VITE_MAPBOX_TOKEN`.
- **Casos límite y advertencias:** la "distancia de acometida" es estimada (no es la longitud de cable instalada); cambiar la coordenada de la caja o del cliente invalida la entrada del caché automáticamente (la clave incluye ambas coordenadas).
- **Preguntas probables:** 1) ¿Esa distancia es la que debo tender? (aproximada). 2) ¿Por qué primero sale una recta? (se refina cuando llega la ruta). 3) ¿Cómo llego a la caja? (botón ¿CÓMO LLEGAR AQUÍ?; necesita tu ubicación). 4) ¿Por qué sale distinta la distancia en el popup de la caja y del cliente? (recta vs recorrido cacheado).
- **Pendiente de validar en UI:** ❓ consumo de cuota de Directions con muchos clientes.

## NET-014 · Monitoreo de Red — listado y resumen de dispositivos
- **Ruta UI / name:** `/monitoreo-red` · `index.monitoreo_red` · menú Gestión de Red → "Monitoreo de Red" (`FE:layouts/SideBarMenu.vue:201-211`). Encabezado de la página: "Monitoreo de Red" (icono lan).
- **Archivos:** FE: `pages/dashboard/Gestion-Red/monitoreo-red/IndexPage.vue`, `composables/useMonitoreoRed.js`, `components/{FormDispositivo,DetalleDispositivo,ConfigNotificaciones}.vue` · BE: `monitoreo-dispositivos/monitoreo-dispositivos.controller.ts`, `monitoreo-dispositivos.service.ts`, `entities/monitor-dispositivo*.entity.ts`.
- **Para qué sirve:** vigilar con *ping* (desde un router MikroTik) equipos de la red que no son routers: antenas, radios, backhaul, torres, sectores y clientes con IP fija; ver quién está caído y desde cuándo.
- **Acceso:** menú y ruta con `index.monitoreo_red` ("Monitoreo de Red › Ver", `gestion-red-permisos.json:81-87`). **No hay permisos separados** para crear/editar/eliminar/configurar alertas: quien ve la pantalla puede hacerlo todo. Backend: JWT.
- **Secciones / pestañas:** cabecera con toggle y botones; 4 tarjetas de resumen; filtros; tabla.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Mostrar en el Dashboard (toggle; tooltip: "Muestra esta misma tabla dentro del Dashboard, encima de "Clientes con mayor consumo". Aplica para toda la empresa.") | Activa/desactiva la tabla en el Dashboard | `index.monitoreo_red` | `PATCH /settings/:id {mostrarMonitoreoDashboard}` | Avisos: "La tabla se mostrará en el Dashboard" / "La tabla ya no se mostrará en el Dashboard"; error "No se pudo guardar la opción" |
| Alertas (tooltip "A qué correos y números de WhatsApp avisar cuando un equipo se cae o vuelve.") | Abre "Alertas de red" (NET-017) | idem | — | |
| Nuevo dispositivo | Abre el formulario (NET-015) | idem | — | |
| Auto (toggle) + refrescar | Recarga la tabla cada 30 s | — | — | Por defecto activo |
| Historial / Ping (icono insights) | Abre el detalle (NET-016) | — | — | |
| Editar | Abre el formulario | — | `PATCH` | |
| Eliminar | Diálogo "Eliminar dispositivo": "¿Seguro que deseas eliminar X (IP)? Se conservará su historial de caídas." | — | `DELETE /monitoreo-dispositivos/:id` | Éxito "Dispositivo eliminado"; error "No se pudo eliminar el dispositivo" |

- **Campos de formulario (filtros):** "Buscar por nombre o IP" (debounce 400 ms), "Estado" (Todos / En línea / Caídos / Sin datos), "Categoría" (Todas + Antena, Radio, Backhaul, Torre, Sector, Cliente, Otro), "Router" (Todos + routers del usuario). Se recuerdan en el navegador (`localStorage` `monitoreo_red_prefs`: filtros y filas por página 10/20/50; la página no).
- **Filtros y columnas de tabla:** Estado (icono), Nombre (con icono "Alertas silenciadas para este equipo" si `notificar=false`), IP, Categoría, Router, Latencia (solo si está en línea: "N ms", si no "—"), Última revisión (tiempo relativo o "Nunca"; insignia "Inactivo" si el monitoreo está apagado), Acciones. Vacío: "No hay dispositivos monitoreados".
- **Tarjetas de resumen:** "Total activos", "En línea", "Caídos", "Sin datos" (solo dispositivos con monitoreo activo; **no cambian con los filtros** ni se limitan por router: `BE:monitoreo-dispositivos.service.ts:283-319`).
- **Estados posibles:** `online` = "En línea" (icono check verde), `offline` = "Caído" (cancel rojo), `sin_datos` = "Sin datos" (help gris; aún no revisado o reiniciado).
- **Reglas de negocio (backend):** listado ordenado: caídos primero, luego sin datos, luego en línea, por nombre (`:65-73`); excluye borrados lógicos; **no se filtra por routers asignados al usuario** (el controlador no recibe al usuario).
- **Efectos secundarios externos:** el listado no genera tráfico a equipos; el *ping* lo hace el colector (NET-018).
- **Mensajes de error/éxito:** "No se pudo cargar los dispositivos".
- **Relaciones con otros módulos:** Routers (origen del ping), Dashboard (tabla opcional con el mismo componente de detalle), Ajustes/Settings (`mostrarMonitoreoDashboard`, `monitoreoNotificaciones`), Notificaciones (campanita), Redes IPv4 (el "inspector" reutiliza el colector para comprobar IP libres: `BE:red-ipv4/red-ipv4.service.ts:68`).
- **Casos límite y advertencias:** el usuario ve y gestiona dispositivos de **todos** los routers aunque tenga alcance limitado; los contadores superiores incluyen routers no visibles para él; los campos `lat`, `lng` y `sucursal_id` existen en el DTO pero la pantalla no los usa (los equipos **no** aparecen en el mapa de red).
- **Preguntas probables de usuarios:**
  1. ¿Qué equipos puedo monitorear? (cualquier IP alcanzable desde un router: antenas, radios, torres, etc.; no los routers MikroTik ni las OLT, que tienen su propio chequeo).
  2. ¿Por qué un equipo está en "Sin datos"? (nunca se revisó, se acaba de crear/reactivar/cambió de IP o router).
  3. ¿Cada cuánto se actualiza? (cada 30 s la pantalla; el ping real cada 1, 2 o 5 min según el equipo).
  4. ¿Cómo dejo de recibir avisos de un equipo que parpadea? (desactivar "Notificar caídas de este equipo").
  5. ¿Se pierde el historial al eliminar? (no, "se conservará su historial de caídas").
  6. ¿Cómo lo veo en el Dashboard? (toggle "Mostrar en el Dashboard").
- **Pendiente de validar en UI:** ❓ el aspecto del toggle para usuarios sin permiso de editar Settings (el PATCH a `/settings` puede requerir otros permisos); ❓ cómo se ve la tabla en el Dashboard con filtros guardados (`dashboard_monitoreo_red_prefs`).

## NET-015 · Monitoreo de Red — alta y edición de dispositivo
- **Ruta UI / name:** diálogo "Nuevo dispositivo" / "Editar dispositivo" en `/monitoreo-red`.
- **Archivos:** FE: `monitoreo-red/components/FormDispositivo.vue`, `composables/useMonitoreoRed.js:130-152` · BE: `monitoreo-dispositivos.controller.ts:29-31,96-102`, `service.ts:20-30,105-135`, `dto/create-dispositivo.dto.ts`.
- **Para qué sirve:** registrar el equipo a vigilar y cómo se decide que "cayó".
- **Acceso:** el de la pantalla (`index.monitoreo_red`).
- **Botones y acciones:** "Agregar" / "Guardar cambios" (submit), "Cancelar".
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Importar desde cliente (opcional) (solo al crear; hint "Busca un cliente con IP fija para autocompletar nombre, IP y router") | buscador | No | ≥ 2 letras ("Escribe al menos 2 letras (nombre o IP)"); máx. 25 resultados con IPv4 | Autocompleta Nombre, IP, Router y Categoría "Cliente"; aviso "Datos del cliente cargados. Revisa y guarda." |
| Nombre * (hint "Ej. Antena Sector Norte, Backhaul Torre 1") | texto | Sí | FE "Requerido"; BE `@IsString`, ≤ 120 | |
| Dirección IP * (placeholder 10.0.0.1) | texto | Sí | FE: IPv4 `a.b.c.d` ("IP inválida (ej. 10.0.0.1)"); BE: cualquier texto ≤ 45 (acepta IPv6) | |
| Categoría | select | No | antena, radio, backhaul, torre, sector, cliente, otro (BE `@IsIn`); por defecto Antena en el alta | Solo informativa (icono/filtro) |
| Router (origen del ping) * | select | Sí | `@IsUUID`; BE verifica que exista: 400 "El router indicado no existe" | Preselecciona el primero; el ping sale desde ese router |
| Intervalo | select | No | "Cada 1 min", "Cada 2 min", "Cada 5 min" (BE `@IsIn([1,2,5])`) | Defecto 1 |
| Fallos p/ caída (hint "Ciclos") | número ≥ 1 | No | BE `@Min(1)`; defecto 3 | Ciclos consecutivos sin respuesta para marcar caído |
| Paquetes (hint "Por ping") | número ≥ 1 | No | BE `@Min(1)`, **sin máximo**; defecto 3 | Paquetes ICMP/ARP por ciclo |
| Método de ping (hint "Auto sirve para equipos que bloquean el ping ICMP") | select | No | "Auto (ICMP y si falla, ARP)", "Solo ICMP (ping normal)", "Solo ARP (capa 2)" | |
| Notas (opcional) | texto largo | No | | |
| Monitoreo activo | toggle | — | defecto sí | Apagado = no se pinga |
| Notificar caídas de este equipo (tooltip: "Se sigue monitoreando y su historial se registra igual; solo deja de enviar correo/WhatsApp y campanita. Útil para el equipo que parpadea y no vale la pena avisar.") | toggle | — | defecto sí | |

- **Estados posibles:** ver NET-014.
- **Reglas de negocio (backend):**
  - Al **editar**, si se reactiva el monitoreo, o cambia la IP o el router, el estado vuelve a `sin_datos`, `fallos_consecutivos = 0`, `caido_desde = null` y se **cierra** la caída abierta (`service.ts:112-130`).
  - Eliminar = borrado lógico + cierre de caída abierta (`:137-144`).
  - No hay chequeo de IP duplicada.
- **Efectos secundarios externos:** ninguno al guardar; el siguiente ciclo del colector (≤ 1 min) lo pingará.
- **Mensajes de error/éxito (texto exacto):** "Dispositivo agregado", "Dispositivo actualizado", "No se pudo guardar el dispositivo", `Fallo al guardar el dispositivo: …` (BE), "El router indicado no existe".
- **Relaciones con otros módulos:** Routers (credenciales API/SSL del router para ejecutar el ping), Clientes (importación).
- **Casos límite y advertencias:** un `paquetes` muy alto alarga el ciclo del router (tope de 60 s por router y 4 min por ciclo en el colector); el ping manual sí limita a 1–10 paquetes. Un cliente con IP dinámica/PPPoE no aplica (la búsqueda solo trae servicios con IPv4).
- **Preguntas probables:** 1) ¿Qué router elijo? (el que tenga ruta/capa 2 hasta el equipo). 2) ¿Qué es "Fallos p/ caída"? (cuántos ciclos seguidos sin respuesta antes de marcarlo caído). 3) ¿Cuándo usar ARP? (equipos que bloquean ICMP en el mismo segmento del router). 4) ¿Cuántos paquetes pongo? (3 es el valor por defecto). 5) ¿Por qué se pone "Sin datos" al editar? (se reinicia al cambiar IP/router o reactivar). 6) ¿Puedo importar un cliente? (solo con IP fija).
- **Pendiente de validar en UI:** ❓ máximos prácticos de "Paquetes".

## NET-016 · Monitoreo de Red — detalle del dispositivo (ping manual, latencia, disponibilidad)
- **Ruta UI / name:** diálogo "Historial / Ping" en `/monitoreo-red` y en la tabla del Dashboard.
- **Archivos:** FE: `monitoreo-red/components/DetalleDispositivo.vue` · BE: `monitoreo-dispositivos.controller.ts:59-94`, `service.ts:147-198,229-280`, `collector.service.ts:484-570`.
- **Para qué sirve:** ver la salud de un equipo: ping ahora, gráfico de latencia y disponibilidad con la lista de caídas.
- **Acceso:** `index.monitoreo_red`.
- **Secciones / pestañas:** cabecera (nombre, "IP · router", insignia de estado), selector de ventana, ping, gráfico, disponibilidad.
- **Botones y acciones:**

| Etiqueta | Qué hace | Endpoint | Restricciones/efectos |
|---|---|---|---|
| "7 días" / "30 días" / "90 días" | Cambia la ventana de disponibilidad | `GET /monitoreo-dispositivos/:id/disponibilidad?dias=` | BE limita 1–365 |
| ARP (toggle; tooltip "Verifica al equipo por ARP (capa 2) en vez de ICMP. Útil cuando el equipo bloquea el ping normal. Solo funciona si está en el mismo segmento de red del router.") | Cambia a ARP y **ejecuta el ping enseguida** | `GET …/ping?arp=true` | Requiere entrada ARP en el router |
| Ping ahora | Envía 5 paquetes desde el router | `GET /monitoreo-dispositivos/:id/ping?paquetes=5` | BE limita 1–10; muestra Recibidos x/y, Pérdida %, Latencia y tabla (#, Host o MAC, TTL, Tiempo / "Tiempo agotado") |
| Hora / Día / Semana (gráfico "Latencia (ping)") | Serie de latencia | `GET …/latencia?periodo=` | hora = 1 h cruda; día = 24 h cruda; semana = 7 d promedio por hora; mín/prom/máx al pie |

- **Filtros y columnas:** tabla de caídas "Inicio / Fin / Duración" (hasta 100; "En curso" si no ha terminado).
- **Estados posibles:** tarjeta "Estado": "CAÍDO AHORA" (rojo) / "ACTIVO" (verde). Color del % de disponibilidad: ≥ 99 verde, ≥ 95 ámbar, < 95 rojo.
- **Reglas de negocio (backend):** disponibilidad = (minutos de la ventana − minutos caídos dentro de la ventana) / minutos de la ventana; caídas en curso cuentan hasta ahora; "Tiempo caído" en horas; el historial de caídas **no se purga** (solo las muestras de latencia, 30 días: NET-018).
- **Efectos secundarios externos:** el *ping manual* abre conexión API/REST al router MikroTik y envía ICMP/ARP al equipo.
- **Mensajes de error/éxito (texto exacto):** "Enviando ping...", "No se pudo ejecutar el ping.", "El equipo no está en la tabla ARP del router; no se puede hacer ARP ping", "No se pudo conectar al router: …", "El router del dispositivo no existe", "Dispositivo no encontrado", "Aún no hay muestras de latencia. Se registran en cada ciclo de ping.", "Sin caídas registradas en el período. 👍", "Sin información de disponibilidad.".
- **Relaciones con otros módulos:** Routers; mismo componente se usa en el Dashboard.
- **Casos límite y advertencias:** el gráfico de "Semana" promedia por hora (puede ocultar picos de minutos); la ventana de latencia depende de la retención de 30 días; un equipo "Inactivo" no genera muestras nuevas.
- **Preguntas probables:** 1) ¿Cómo hago ping a un equipo desde la plataforma? 2) ¿Por qué da "no está en la tabla ARP"? 3) ¿Qué disponibilidad es aceptable? (el color da la referencia 99/95 %). 4) ¿Desde cuándo está caído? (tabla de caídas, "En curso"). 5) ¿Por qué el gráfico está vacío? (sin muestras aún).
- **Pendiente de validar en UI:** ❓ comportamiento del ping manual con router V7 y certificado no válido.

## NET-017 · Monitoreo de Red — "Alertas de red" (correo, WhatsApp y campanita)
- **Ruta UI / name:** diálogo "Alertas de red" (botón "Alertas") en `/monitoreo-red`.
- **Archivos:** FE: `monitoreo-red/components/ConfigNotificaciones.vue` · BE: `monitoreo-dispositivos-notifier.service.ts`, `settings/entities/setting.entity.ts:60-78`, `settings/dto/create-setting.dto.ts:62-70`.
- **Para qué sirve:** definir a quién avisar y con qué retardo cuando un equipo monitoreado se cae o vuelve.
- **Acceso:** `index.monitoreo_red`; se guarda en el registro de Settings de la empresa (campo `monitoreoNotificaciones`).
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Enviar alertas cuando un equipo se caiga | toggle | — | defecto **apagado** | Sin esto no sale correo ni WhatsApp (la campanita sí, ver reglas) |
| Correos a notificar (hint "Escribe el correo y presiona Enter. Puedes agregar varios.") | chips | No | FE: regex; error `"x" no parece un correo válido`; se pasan a minúsculas, sin repetir | |
| WhatsApp a notificar (hint "Número con o sin código de país (ej. 0991234567). Enter para agregar.") | chips | No | FE `^\+?[\d\s\-()]{8,18}$`; BE normaliza y exige 8–15 dígitos; error `"x" no parece un número válido` | |
| Antes de avisar | select | — | "Avisar de inmediato" (0), "Esperar 2 minutos", "Esperar 5 minutos" (defecto), "Esperar 10 minutos", "Esperar 15 minutos", "Esperar 30 minutos" | BE limita 0–60 |
| Avisar también cuando el equipo vuelva | toggle | — | defecto sí | |

- **Botones y acciones:** "Enviar prueba" (tooltip "Guarda la configuración y envía un mensaje de prueba a cada destino."; deshabilitado sin destinos) → `POST /monitoreo-dispositivos/notificaciones/prueba`; "Cancelar"; "Guardar" → `PATCH /settings/:id {monitoreoNotificaciones}` ("Configuración de alertas guardada").
- **Reglas de negocio (backend):**
  - **Campanita (panel):** inmediata en la transición del colector, a **todos los usuarios activos con rol SUPER-ADMINISTRADOR o ADMINISTRADOR**, independiente del interruptor y de los destinos; solo se omite si el equipo tiene `notificar=false` (`notifier.service.ts:102-146,589-596`). Texto: título "🔴 Equipo caído: {nombre}" y "El equipo {nombre} ({ip}) del router {router} dejó de responder. Caída detectada a las {hora}."; al volver "🟢 Equipo recuperado: …" "… volvió a responder. Estuvo caído {duración}.". Además intenta un push por websocket (`HOST_WEBSOCKET`).
  - **Correo/WhatsApp:** cron cada minuto (`:148`). Primero marca como "despachado" lo que nunca se avisará: caídas más cortas que el retardo, equipos silenciados o eliminados. Luego agrupa en **un solo mensaje** las caídas pendientes (máx. 100 por ciclo) cuyo inicio ≤ ahora − retardo y que siguen caídas o duraron ≥ retardo. Las recuperaciones solo se avisan si se avisó la caída y "Avisar también…" está activo.
  - Si alertas desactivadas o sin destinos, los eventos se marcan despachados igual (para no acumular).
  - Asuntos: "🔴 Equipo caído: {nombre} — {empresa}", "🔴 {n} equipos caídos — {empresa}", "🟢 Equipo recuperado: {nombre} — {empresa}", "🟢 {n} equipos recuperados — {empresa}", prueba: "🔔 Prueba de alertas de red — {empresa}". El correo es HTML con tabla Equipo / IP / Router / Desde-Volvió; el WhatsApp es texto con viñetas.
  - **No hay reintentos:** el evento se marca despachado después de intentar el envío, haya salido o no; el fallo queda en el log del servidor.
- **Efectos secundarios externos:** **correo** vía el SMTP de la empresa (`EmailService.sendMessage(company_id,…)`); **WhatsApp no oficial** (gateway `HOST_API_WHATSAPP` `/api/whatsapp/send` con la sesión = número de WhatsApp de la empresa); **Notificaciones internas** (campanita) y websocket.
- **Mensajes de error/éxito (texto exacto):** resultado de prueba: "No hay destinatarios configurados. Agrega al menos un correo o un número de WhatsApp.", "Prueba enviada a N destino(s).", "x de y envíos correctos."; por destino: "La empresa no tiene configuración de correo", "El gateway de WhatsApp no está configurado en el servidor", "La empresa no tiene número de WhatsApp vinculado", "El canal de WhatsApp está desactivado en la empresa", "La sesión de WhatsApp está desvinculada", "No se pudo consultar la sesión de WhatsApp". Banners: "Agrega al menos un correo o un número de WhatsApp; si no, no se enviará nada." y "El WhatsApp sale por el canal no oficial vinculado a la empresa. Si la sesión está desvinculada, la alerta igual se envía por correo. La campanita del panel avisa siempre, al instante.".
- **Relaciones con otros módulos:** Ajustes › Mensajería (canal WhatsApp y SMTP), Notificaciones, Usuarios (roles).
- **Casos límite y advertencias:** el retardo aplica **solo** a correo/WhatsApp; la campanita no espera. Los destinatarios son una lista libre (no son usuarios del sistema). Una caída que dure menos que el retardo nunca genera mensaje. `monitoreoNotificaciones` no se valida en el DTO de settings (`any`): se normaliza al leerla.
- **Preguntas probables:** 1) ¿A quién le llegan los avisos? (a los correos/WhatsApp configurados, y la campanita a administradores). 2) ¿Por qué no me llegó el WhatsApp? (sesión desvinculada, canal desactivado o alertas apagadas; usar "Enviar prueba"). 3) ¿Cuánto tarda en avisar? (ciclos de ping × intervalo + "Antes de avisar"). 4) ¿Por qué recibí un solo correo por 20 equipos? (agrupa los de la misma ventana). 5) ¿Cómo silencio un equipo? (en su formulario). 6) ¿Puedo avisar a un técnico específico? (solo agregando su correo/número a la lista).
- **Pendiente de validar en UI:** ❓ que el rol `ADMINISTRADOR` exista con ese nombre exacto en instancias reales; ❓ permiso real para guardar `/settings`.

## NET-018 · Colector de ping de dispositivos (proceso automático)
- **Ruta UI / name:** sin pantalla; alimenta NET-014/016/017.
- **Archivos:** BE: `monitoreo-dispositivos/monitoreo-dispositivos-collector.service.ts`, `common/utils/lock-cron.ts`.
- **Para qué sirve:** pinga cada equipo desde su router, mantiene el estado y registra latencia y caídas.
- **Reglas de negocio (backend):**
  - Corre **cada minuto** (`@Cron('* * * * *')`, `:80`); toma el equipo cuyo `ultimo_ping_en` es nulo o es anterior a `now() − intervalo_min` (`:105-114`). Una sola instancia del clúster vigila (lock en Postgres).
  - Agrupa por router; solo routers activos y no borrados (si no, el equipo se omite y queda como está); hasta 5 routers en paralelo; tope 60 s por router; un ciclo colgado > 4 min se descarta (`:69-72,136`).
  - Conexión: RouterOS v7 (`registro_trafico = 'RouterOS V7.x'`) por REST HTTPS (`puerto_ssl` o 443, sin validar certificado) o v6 por API (`puerto_api` o 8728, conexión máx. 8 s).
  - Método `auto`: ICMP y, si no hay respuesta o falla, ARP por la interfaz de la tabla ARP del router (`:315-360`).
  - **Máquina de estados** (`:393-460`): respuesta (`recibidos > 0`) → `online`, fallos = 0, y si estaba `offline` se cierra la caída y se avisa recuperación; sin respuesta → `fallos_consecutivos + 1`; al alcanzar `umbral_fallos` pasa a `offline`, se abre caída (`monitor_dispositivo_caida`) y se avisa; antes del umbral conserva el estado anterior.
  - Si falla el **router** (no el equipo) no se marca ninguna caída (evita falsos positivos).
  - Cada ciclo inserta una muestra (`latencia_ms` = promedio de respuestas OK, `NULL` si no respondió; `perdida_pct`).
  - **Retención:** muestras de latencia 30 días (borrado diario 00:35, `:466-480`); caídas sin límite.
- **Efectos secundarios externos:** conexión a MikroTik por API/REST y envío de ping ICMP/ARP; llamadas internas al notificador.
- **Casos límite y advertencias:** tiempo hasta marcar caído ≈ `umbral_fallos × intervalo_min` (con valores por defecto ≈ 3 min), más el retardo de correo/WhatsApp. Un equipo con muchos paquetes o router lento consume el tope de 60 s del router y los demás equipos del mismo router se omiten ese ciclo (❓).
- **Preguntas probables:** 1) ¿Cada cuánto se revisa un equipo? (1, 2 o 5 min). 2) ¿Por qué un equipo "parpadea"? (umbral bajo/equipo inestable). 3) ¿Qué pasa si se cae el router? (no se marcan caídas de sus equipos). 4) ¿Cuánto historial hay? (latencia 30 días; caídas sin límite).
- **Pendiente de validar en UI:** ❓ instancia con PgBouncer y comportamiento del lock.

## NET-019 · Monitoreo de tráfico — recolección, consolidación y retención (proceso automático)
- **Ruta UI / name:** sin pantalla; alimenta el tab "Consumo" del cliente, los gráficos del router y dos tarjetas del Dashboard.
- **Archivos:** BE: `monitoreo-trafico/monitoreo-trafico-collector.service.ts`, `entities/trafico-*.entity.ts`, `common/utils/control-velocidad.ts`.
- **Para qué sirve:** guardar consumo (MB, Mbps) por cliente y por interfaz de router a lo largo del tiempo.
- **Reglas de negocio (backend):**
  - **Recolección cada 5 min** (`@Cron('*/5 * * * *')`, `:106`) en todos los routers activos (hasta 5 en paralelo, tope duro 30 s por router, ciclo colgado > 15 min se libera). v7 por REST, v6 por API.
  - **Clientes:** para cada servicio no retirado (`deleted=false`, incluidos suspendidos) se busca su **cola simple** (`/queue/simple`, por IPv4 del `target`) o su **interfaz dinámica PPPoE** `<pppoe-USUARIO>`. Los routers con control de velocidad "pcq_addresslist" no tienen cola por cliente: se omite la lectura de colas y solo se mide por PPPoE e interfaces (`:520`).
  - **Interfaces:** todas las interfaces estáticas/físicas del router (nombres que no empiezan con `<`) alimentan el histórico del router (`bytes_in` = RX, `bytes_out` = TX).
  - **Muestra** = diferencia del contador acumulado con la lectura anterior. Se descarta si el hueco entre lecturas > 30 min (solo se refresca la línea base). Si el contador se reinició o viene "congelado" se estima con la tasa instantánea; saltos mayores al `max-limit` de la cola ×2 se corrigen; tope de cordura 5 000 Mbps por intervalo (`:80-87,466-495`).
  - **Consolidación:** por hora (minuto 4 de cada hora) → `trafico_hora` / `trafico_interfaz_hora`; por día (00:10, zona horaria de la app) → `trafico_dia` / `trafico_interfaz_dia`.
  - **Retención** (00:25 diario, `:721-733`): muestras 8 días; horas 45 días (clientes) y 60 días (interfaces); días 400 días.
- **Efectos secundarios externos:** lectura de colas e interfaces del MikroTik (no escribe en el router).
- **Casos límite y advertencias:** clientes solo-ONU (SmartOLT/AdminOLT) sin cola/PPPoE en el router no tienen datos numéricos; servicios con IP duplicada en la misma cola pueden confundirse; los "Retirados" dejan de medirse.
- **Preguntas probables:** 1) ¿Cada cuánto se actualiza el consumo? (cada 5 min). 2) ¿Cuánto historial se guarda? (5 min: 24 h visibles/8 días en BD; por hora: 45 días; por día: 400 días). 3) ¿Por qué un cliente no tiene datos? (sin cola/PPPoE/IP, o router en control "ninguno"/PCQ). 4) ¿Por qué hay picos raros? (reinicios de contador; el sistema filtra los imposibles).
- **Pendiente de validar en UI:** ❓ routers v6 con contadores cacheados (comportamiento real).

## NET-020 · Monitoreo de tráfico — consumo, disponibilidad y ping del cliente (pestaña "Consumo")
- **Ruta UI / name:** `/clientes/edit/:client_id` → pestaña "Consumo" (`FE:pages/dashboard/clientes/components/editar/IndexPage.vue:75-76,131`).
- **Archivos:** FE: `clientes/components/editar/Consumo/ConsumoPage.vue` (1 229 líneas, leído completo), `clientes/components/editar/IndexPage.vue:73-78,126-132`, `clientes/composables/useEditCliente.js:78-112` (de ahí salen `servicios`) · BE: `monitoreo-trafico.controller.ts:17-62`, `monitoreo-trafico.service.ts:18-260`, `monitoreo-router.service.ts:105-228,319-440`, `monitoreo-trafico-collector.service.ts`, `monitoreo-conexion.service.ts`, `entities/*` (todos leídos completos), `smart-olt.service.ts:1605-1626`. El detalle pantalla por pantalla y la mecánica del colector están también en SRV-026 (misma pestaña); aquí se resume lo verificado.
- **Para qué sirve:** ver cuánto consume el cliente, su disponibilidad (cortes) y diagnosticar con ping y tráfico en vivo.
- **Acceso:** pestaña "Consumo" con `servicio.index` (`IndexPage.vue:73-78`); backend JWT, sin comprobar routers permitidos ni permiso.
- **Botones y acciones:** selector "Servicio" (solo si el cliente tiene más de un servicio no retirado; suspendidos incluidos); "Rango de fechas" (calendario, no futuro; **no existe para servicios SmartOLT**, ni sin referencia o sin medición posible); rangos "Hoy", "Semana", "Mes", "Año", "Tiempo real" (no disponible con "Gráfico ONU"); "Gráfico ONU" / "Datos router" (solo SmartOLT); "Ping" (solo con IPv4; modal con "Reenviar ping", ARP); clic en el gráfico de la ONU para ampliarlo; tabla "Fecha / Hora · Volumen Bajada · Volumen Subida · Tráfico Total" (10 por página, lo más reciente primero).
- **Gráficos y etiquetas** ✅ `ConsumoPage.vue:186-355`: líneas "Bajada" (verde) y "Subida" (azul) con eje Y "Mbps" y tooltip a 2 decimales; en "Año" barras apiladas con eje "GB" desde el primer mes con datos hasta diciembre; en "Tiempo real" eje Y desde 0 y eje X `HH:mm:ss`. Eje X: `Hoy` `HH:mm`, `Semana` `DD/MM HH:mm`, `Mes` `DD/MM`, rango personalizado `DD/MM/AAAA` (por día) o `DD/MM HH:mm` (por hora), `Año` `MMM AAAA`. Tarjetas: "Total Bajada", "Total Subida", "Tráfico Total" (MB hasta 1 000 y luego GB) y "Pico de velocidad". Tarjeta "Disponibilidad — últimos 30 días" (verde ≥ 99 %, amarillo ≥ 95 %, rojo por debajo) con "Última lectura: hace …", que es la antigüedad del último punto de **consumo**, no de la detección de conexión.
- **Reglas de negocio (backend):**
  - `hoy` = últimas 24 h de muestras de 5 min; `semana` = horas de 7 días; `mes` = horas de 30 días; `anio` = un punto por mes del año calendario (mes actual desde horas, anteriores desde días); rango personalizado = horas si el inicio está dentro de ~44 días, si no días (`:18-120`). Rango inválido: 400 `rango debe ser hoy, semana, mes o anio`; fechas inválidas: 400 `Fechas desde/hasta inválidas (use YYYY-MM-DD)` (el front manda `YYYY/MM/DD`, que el backend normaliza). Como las horas se consolidan al minuto 4 de la hora siguiente (SRV-026 / NET-019), `semana`, `mes`, `anio` y el rango personalizado **no incluyen la hora en curso**.
  - Descarta lecturas > 5 000 Mbps. Devuelve Mbps medio, pico (`mbps_*_max`) y MB (bajada = `in`, subida = `out`).
  - **Disponibilidad:** `conexion_caida` de los últimos N días (1–365, por defecto 30; valor no numérico → 30): % disponibilidad = (minutos de la ventana − minutos caídos) / minutos de la ventana, días con servicio/con cortes (días calendario con al menos una caída), tiempo caído, lista de las 50 más recientes; una caída abierta cuenta hasta "ahora" y marca `CAÍDO AHORA`. La detección (NET-022) solo revisa servicios activos: una caída abierta de un servicio suspendido, retirado o en `sin_datos` no se cierra sola (`monitoreo-conexion.service.ts:60-64,211-241`).
  - **Vivo:** lee la tasa de la cola o de la interfaz PPPoE en el router (la pantalla pregunta cada 5 s; no se almacena). **Ping:** hasta 10 paquetes, ARP opcional.
- **Efectos secundarios externos:** conexión al MikroTik para vivo/ping; para SmartOLT la imagen de tráfico se pide a SmartOLT (`/smart-olt/onu-traffic-graph/:sn/:tipo`).
- **Mensajes (texto exacto):** banner azul "Este cliente está vinculado a SmartOLT; el consumo se muestra con el gráfico de tráfico que entrega la propia ONU."; "Vista anual: volumen de datos consumido mes a mes durante el año <año>. El mes en curso se actualiza día a día."; "La velocidad del plan se mide en Mbps; esta vista muestra el volumen de datos consumido (en MB/GB). La recolección se realiza cada 5 minutos desde el router."; "Enviando ping..."; "No se pudo obtener el gráfico de SmartOLT para esta ONU."; banners "Este servicio no tiene IP, usuario PPPoE ni ONU SmartOLT asignados, por lo que no se puede registrar su consumo."; "El consumo de este servicio no se puede medir: el router está en control de velocidad "ninguno" (no se crean colas) y el servicio no usa PPPoE ni tiene una ONU vinculada. …"; "AdminOLT no provee gráficos de tráfico; el consumo mostrado proviene de la cola del router (si el cliente tiene una configurada)."; modo vivo: "Modo Tiempo real: se consulta el router cada 5 segundos. Estos datos no se almacenan, solo se grafican en vivo."; "Sin datos de consumo aún. La recolección se realiza cada 5 minutos."; "Sin registros de consumo"; "Sin cortes registrados en el período. 👍". Errores de backend: "El servicio no tiene router asignado", "El servicio no tiene una IP para hacer ping", "Servicio no encontrado", "No se pudo conectar al router: …", "Error consultando el router: …".
- **Relaciones con otros módulos:** Clientes, Routers, SmartOLT/AdminOLT, NET-022 (disponibilidad).
- **Casos límite y advertencias:** el rango "Año" y el personalizado antiguo usan datos diarios (sin detalle horario); "Disponibilidad" se basa en el estado de ONU/PPPoE, no en el ping. Las ONU antiguas con `onu_source` vacío no entran en la detección; un servicio AdminOLT en un router `ninguno` / `pcq_addresslist` y sin PPPoE ve el aviso de "no se puede medir" aunque tenga ONU; si la consulta del histórico falla la pantalla queda en ceros sin aviso; el sondeo del modo vivo ignora fallos puntuales. El colector solo mide servicios por IPv4 de cola o por interfaz `<pppoe-usuario>` (NET-019).
- **Preguntas probables:** 1) ¿Por qué mi cliente no tiene datos de consumo? 2) ¿Qué significa "Tiempo real"? 3) ¿La disponibilidad mide los cortes por falta de pago? (no: mide conexión real, ver NET-022). 4) ¿De dónde sale el gráfico de un cliente SmartOLT? (de la ONU o del router según el selector). 5) ¿Puedo ver el consumo de hace 6 meses? (por día hasta ~400 días).
- **Resuelto con el código:** etiquetas, leyendas y colores de los ejes del gráfico (arriba) y banners según tipo de servicio.
- **Pendiente de validar en UI:** ❓ aspecto del gráfico PNG de la ONU (lo genera SmartOLT).

## NET-021 · Monitoreo de tráfico — Router (Monitoreo/Gráficos/WAN) y Dashboard (Tráfico Clientes, Clientes con mayor consumo)
- **Ruta UI / name:** `/router/edit/:router_id` → pestañas "Monitoreo" y "Gráficos" (`FE:pages/dashboard/Gestion-Red/routers/EditRouter.vue:62-89`); Dashboard `/` (`FE:pages/dashboard/panel/IndexPage.vue:67-74`).
- **Archivos:** FE: `routers/EditRouter.vue` (94 líneas), `routers/components/MonitoreoRouter.vue` (391), `routers/components/GraficosRouter.vue` (233), `panel/IndexPage.vue:40-70`, `panel/components/TraficoClientes.vue` (248), `panel/components/TopConsumidores.vue` (237), `panel/components/MonitoreoRed.vue` (NET-014) · BE: `monitoreo-trafico.controller.ts:64-136`, `monitoreo-router.service.ts`, `monitoreo-trafico.service.ts:263-440` — todos leídos completos.
- **Acceso:** pestañas del router: la ruta `router.edit` exige `editar.router` (`FE:router/auth-guard.ts:81-83`) y las pestañas "Datos & Configuración", "Monitoreo" y "Gráficos" no tienen permiso propio; Dashboard: `dashboard.resumen_sistema` gobierna "Tráfico Clientes" y "Clientes con mayor consumo" (`panel/IndexPage.vue:62-70`); `index.monitoreo_red` + toggle para la tabla de monitoreo. Backend: solo `@Auth()`; los endpoints del Dashboard filtran por `usuario.routers`, los de `router/:router_id/*` no comprueban ese alcance.
- **Qué ve el usuario:**
  - **Router › Monitoreo** (`MonitoreoRouter.vue`; pestaña con icono `speed`; la interfaz elegida se comparte con "Gráficos"): tarjeta "Interfaz de salida (WAN)" — "Marca la interfaz uplink a internet (la que recibe la descarga). Se usa para el total de tráfico del dashboard." — con `q-select` "Interfaz WAN" (con "x" para quitarla) y el indicador "Configurada" / "Sin configurar"; al elegir llama `PATCH …/wan` **sin aviso de éxito ni de error** (un fallo se ignora) y apunta el monitoreo y los gráficos a esa interfaz. Tarjeta "Información del Router" con las filas Uptime, Versión, Board, Arquitectura, CPU (`<cpu> × <núcleos> (<MHz> MHz)`), Memoria libre, Memoria total y Disco libre (unidades B / KiB / MiB / GiB) y dos barras: "Carga de CPU: N%" y "Memoria usada: N%"; vacío: "Sin información disponible."; si el router no responde, banner rojo con el mensaje del backend o "No se pudo conectar al router.". Tarjeta "Tráfico Actual" con la insignia `EN VIVO`, `q-select` "Interfaz" y tarjetas "RX (descarga)" (rojo) y "TX (subida)" (azul) en Mbps; consulta cada **3 s** y conserva 60 puntos (3 min); gráfico con leyenda "RX (descarga)" / "TX (subida)", eje Y "Mbps" desde 0 y eje X `HH:mm:ss`; antes del primer dato dice "Iniciando captura en vivo..."; un fallo puntual no detiene el sondeo. La lista de interfaces excluye las dinámicas (nombre que empieza por `<`) y se pide junto con la información (`MonitoreoRouter.vue:34-54`).
  - **Router › Gráficos** (`GraficosRouter.vue`): `q-select` "Seleccionar Interfaz" (por omisión la WAN del router si está en la lista; si no, la primera) y botón "Actualizar"; cuatro tarjetas "Gráfico Diario" ("Promedio de 5 minutos"), "Gráfico Semanal" ("Promedio por hora"), "Gráfico Mensual" ("Promedio por hora") y "Gráfico Anual" ("Promedio por día"), pedidas en paralelo; un periodo que falla se muestra como vacío. Leyenda "Entrada (RX)" (verde) / "Salida (TX)" (azul), eje Y "Mbps" desde 0; eje X `HH:mm` (diario), `ddd HH:mm` (semanal), `DD/MM` (mensual) y `DD/MM/AA` (anual); vacío: "Sin datos aún para este período."; error de interfaces: "No se pudo obtener las interfaces del router.".
  - **Dashboard › "Tráfico Clientes — Últimos 7 días"** (`TraficoClientes.vue`): botón de refrescar (no se actualiza solo) y **no sigue** los filtros Router/Sucursal del Dashboard (pide `GET /monitoreo-trafico/dashboard/trafico-clientes` sin parámetros). Serie horaria con la **suma de las interfaces WAN marcadas** de los routers del usuario; leyenda "Descarga" (azul) y "Subida" (verde), eje Y "Mbps", eje X `DD/MM HH:mm`; cifra grande "Velocidad promedio (7 días)" (promedio de descarga + promedio de subida; desde 1 000 Mbps se escribe en Gbps), dona "Descarga"/"Subida" con `N% Descarga` al centro (solo si el promedio total es > 0), "Descarga prom.", "Subida prom." y "Pico: x ↓ · y ↑" (máximos de los promedios horarios). Avisos: naranja "Aún no has marcado la interfaz WAN de ningún router. Hazlo en la pestaña Monitoreo de cada router para ver el tráfico total de la red." (cuando `routers_con_wan = 0`), azul "N de M routers tienen interfaz WAN marcada. El total solo considera esos." (cuando 0 < N < M; M = routers activos del usuario) y, sin puntos, "Sin datos de tráfico aún.".
  - **Dashboard › "Clientes con mayor consumo"** (`TopConsumidores.vue`): tooltip "Incluye solo clientes medidos desde el router (colas simples o PPPoE). Los clientes solo-ONU no tienen datos numéricos (SmartOLT entrega únicamente gráficos)."; `q-select` "Router" (solo si el usuario tiene routers; la opción TODOS = sin filtro aparece únicamente si tiene más de uno, `BE:auth/auth.service.ts:294-322`), campo "Buscar cliente..." (espera 400 ms; busca por nombre), conmutador "Hoy" / "7 días" (por omisión) / "Mes"; tabla "#" (insignia naranja del 1 al 3, gris después), "Cliente" (enlace a `cliente.edit` con `?view=consumo`; tooltip "Clic: ver consumo · Clic derecho / central: abrir en otra pestaña"), "Plan", "Router" ("—" si faltan), "Bajada", "Subida", "Total" (MB hasta 1 000 y luego GB), 10 por página con opciones 10 / 20 / 50; cambiar router o periodo vuelve a la página 1; vacío: "Sin datos de consumo en el período."; un error de la consulta deja la tabla vacía sin aviso.
- **Reglas de negocio (backend):** `GET /monitoreo-trafico/router/:id/wan` devuelve `{interfaz_wan}` (404 `Router no encontrado` si no existe o está eliminado); `PATCH /monitoreo-trafico/router/:id/wan {interfaz}` guarda `routers.interfaz_wan` (vacío o nulo la quita; devuelve `{ok, interfaz_wan}`); el total del Dashboard solo suma interfaces cuyo nombre coincide con `interfaz_wan` (sin WAN el router no cuenta); ambos endpoints aplican el alcance de routers del usuario (`usuario.routers`). Top consumidores: `trafico_dia` desde el inicio del periodo (7 días o mes calendario) + muestras de hoy; límite 1–50 por página. Histórico de interfaz: diario = muestras 24 h; semanal/mensual = horas (7/30 días); anual = días (365). `info` lee `/system/resource` y devuelve uptime, versión, board, arquitectura, plataforma, CPU (modelo, núcleos, frecuencia, carga), memoria y disco libres/totales; `interfaces` devuelve nombre, tipo, `running` y `disabled` de las que no empiezan por `<`; `trafico-vivo` usa `monitor-traffic once` (RX/TX en bps y Mbps con 2 decimales); para RouterOS v7 todo va por REST https (puerto SSL o 443, 15 s) y para v6 por API (conexión 8 s); los fallos salen como 400 `No se pudo conectar al router: …` (solo v6) o `Error consultando el router: …`. Por interfaz, `gb_in`/`gb_out` se calculan pero el panel no los muestra. La serie del Dashboard sale solo de `trafico_interfaz_hora` (la WAN del router, nombre igual a `interfaz_wan`), por lo que no incluye la hora en curso. El ranking toma `trafico_dia` desde el inicio del periodo más las muestras de hoy (calendario en `APP_TIMEZONE`: "hoy" desde las 00:00, "7 días" = hoy y los 6 anteriores, "mes" desde el día 1) y excluye servicios retirados y clientes eliminados; `limit` se acota a 1-50 y el valor por omisión del periodo es `semana`. ✅ `monitoreo-trafico.service.ts:263-434` · `monitoreo-router.service.ts:26-98,229-315`.
- **Efectos secundarios externos:** lectura del MikroTik (info, interfaces, monitor-traffic).
- **Mensajes:** "No se pudo conectar al router.", "No se pudo obtener las interfaces del router.", errores de backend "Router no encontrado", "El parámetro interfaz es requerido", "periodo debe ser daily, weekly, monthly o yearly".
- **Casos límite y advertencias:** si ningún router tiene WAN, "Tráfico Clientes" queda vacío; `traficoVivo` por interfaz usa `monitor-traffic once`.
- **Preguntas probables:** 1) ¿Qué es la interfaz WAN y por qué debo marcarla? 2) ¿Por qué el Dashboard no muestra tráfico? (sin WAN). 3) ¿Qué cliente consume más? (tabla Top). 4) ¿Cuánto tarda en actualizar el en vivo? (3 s). 5) ¿Por qué un cliente solo-ONU no aparece en el top?
- **Resuelto con el código:** etiquetas de ejes, leyendas y colores de los cuatro gráficos y de las dos tarjetas del Dashboard (arriba).
- **Pendiente de validar en UI:** ❓ aspecto de las tarjetas de información del router con datos reales (formato de `Uptime` y de la versión según RouterOS v6/v7).

## NET-022 · Detección de conexión de clientes (estado de conexión real)
- **Ruta UI / name:** sin pantalla propia; se ve como color naranja "Sin conexión" en el mapa (NET-008) y como "Disponibilidad" en el tab Consumo (NET-020).
- **Archivos:** BE: `monitoreo-trafico/monitoreo-conexion.service.ts`, `monitoreo-trafico/entities/conexion-caida.entity.ts`, `customers/entities/ServicioCliente.entity.ts:163-168`.
- **Para qué sirve:** saber si el servicio de cada cliente está realmente conectado (distinto de si está activo/suspendido por pago).
- **Reglas de negocio (backend):**
  - Cada 5 min (`@Cron('*/5 * * * *')`, `:47`), para servicios con `isActive = true` y `deleted = false`: estado inicial `sin_datos`.
  - **SmartOLT:** `onu_source='smartOLT'` y `sn`: estado de la ONU (`online/offline`). **AdminOLT:** igual con AdminOLT.
  - **PPPoE (sin OLT):** `tipo_conexion = 'PPPoE'` con usuario y router: `online` si el usuario está en `/ppp/active` del router; si no, `offline`. Si el router falla queda `sin_datos`.
  - Otros (IP fija/cola sin PPPoE/ONU): permanecen `sin_datos`.
  - Se guarda `estado_conexion` y `conexion_revisada_en`; abre una fila en `conexion_caida` al pasar a `offline` y la cierra al volver `online`.
- **Efectos secundarios externos:** consultas a SmartOLT/AdminOLT y a `/ppp/active` de MikroTik (solo lectura).
- **Casos límite y advertencias:** los servicios **suspendidos** no se revisan (conservan su último estado); en el mapa `sin_datos` se ve como activo (verde).
- **Preguntas probables:** 1) ¿Qué significa naranja en el mapa? (activo según el sistema pero la ONU/PPPoE no está conectada). 2) ¿Por qué un cliente con IP fija nunca sale "sin conexión"? (no se mide). 3) ¿Cada cuánto se actualiza? (5 min).
- **Pendiente de validar en UI:** ❓ lugares del cliente donde se muestra `estado_conexion` (solo se encontró uso en el mapa).

## NET-023 · Heartbeat de routers (chequeo de conexión y auto-reparación)
- **Ruta UI / name:** botón "Verificar conexión" y badges "Sin conexión" en `/router` (inventario de Routers); aquí el proceso.
- **Archivos:** BE: `router/router-monitor.service.ts`, `router/router.controller.ts:21-27`; FE: `Gestion-Red/routers/IndexPage.vue:98-135,447,558-577`.
- **Para qué sirve:** detectar routers caídos o sin API, intentar repararlos y avisar al operador de la plataforma.
- **Reglas de negocio (backend):**
  - Cada 5 min (`:45`) o al pulsar "Verificar conexión" (`POST /router/verificar-conexion`) chequea todos los routers activos (5 en paralelo) leyendo la versión de RouterOS.
  - Histéresis: 2 fallos seguidos (~10 min) antes de actuar (`UMBRAL_FALLOS = 2`, `:33`).
  - **Anti-tormenta:** si caen ≥ 3 o ≥ 60 % de los routers a la vez se trata como problema general: un único aviso y sin reparar uno por uno (`:83`).
  - **Auto-reparación (solo V7):** vuelve a configurar SSL/api-ssl (`configurarRouterSSL`); si conecta, se marca online y se avisa que "se auto-reparó"; si no, se marca `slack_alertado` (un aviso por corte). V6 no se repara.
  - Estado en `routers`: `online`, `ultimo_visto`, `caido_desde`, `fallos_consecutivos`, `slack_alertado`, `version_ros`.
- **Efectos secundarios externos:** MikroTik (lectura de versión y, en V7, reconfiguración de certificado/api-ssl); **Slack** (webhook `URL_SLACK` del servidor, con el texto "… sin conexión — {CLIENTE}", "… se auto-reparó", "… recuperó conexión tras N min", "N/M routers sin conexión"). **No** envía correo ni WhatsApp al ISP.
- **Mensajes (frontend):** "Todos los routers respondieron", "Sin conexión: {nombre}", "Sin conexión (N): …", tooltips "Visto hace …"/"caído hace …".
- **Casos límite y advertencias:** el aviso por Slack llega al canal de la plataforma (variable de entorno), no a usuarios del ISP; los equipos del Monitoreo de Red (NET-014) no se ven afectados por este chequeo.
- **Preguntas probables:** 1) ¿Por qué un router aparece "Sin conexión"? 2) ¿Se repara solo? (V7: intenta reconfigurar SSL). 3) ¿Quién recibe el aviso? (el operador de la plataforma por Slack; el ISP ve el badge). 4) ¿Cada cuánto se verifica? (5 min o manual).
- **Pendiente de validar en UI:** ❓ etiqueta y ubicación exacta del botón "Verificar conexión" en la tabla de routers.

## NET-024 · Servicios Personalizados — qué son y listado
- **Ruta UI / name:** `/personalizado` · `personalizado.index` · menú Gestión de Red → "Personalizado" (`FE:layouts/SideBarMenu.vue:237-247`). Título de la tabla: "Servicios Personalizados".
- **Archivos:** FE: `pages/dashboard/Gestion-Red/personalizado/IndexPage.vue`, `components/FormPersonalizado.vue`, `components/UsosPersonalizado.vue`, `composables/usePersonalizado.js`; consumidor: `pages/dashboard/clientes/components/modals/AddProductService.vue` · BE: `servicios-personalizado/servicios-personalizado.{controller,service}.ts`, `aplicar-cambio-personalizado.ts`, `entities/servicios-personalizado.entity.ts`, `dto/*.ts`.
- **Para qué sirve:** es un **catálogo de conceptos de cobro propios del ISP** (importe fijo, valor negativo o **descuento en %** sobre el precio del plan, con IVA e ICE) que luego se **agregan manualmente** a una factura libre o a un cargo recurrente de un cliente. **No están relacionados con la red física ni con el servicio de internet**: viven en Gestión de Red solo por ubicación de menú. En el modal "Agregar Productos/Servicios." aparecen en el grupo "Personalizado", junto al grupo "Producto/Servicio" (`AddProductService.vue:15-24,60-69`).
- **Acceso:** menú y ruta `personalizado.index`. ✅ **Esa clave no figura en el catálogo de permisos** (`gestion-red-permisos.json`, `gestion-clientes-permisos.json`, etc.), por lo que no se puede asignar desde el editor de roles: en la práctica solo `SUPER-ADMINISTRADOR` ve el menú y entra a la ruta, salvo que un rol antiguo ya la contenga en base de datos. Dentro de la pantalla ningún botón está condicionado por permiso. Backend: JWT.
- **Secciones / pestañas:** una tabla con búsqueda y paginación en servidor (10 por página).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Nuevo | Abre "Nuevo Perfil" (NET-025) | ninguno en FE | — | |
| Buscar… | Filtra (debounce 300 ms) | — | `GET /servicios-personalizado?page&limit&filter` | Busca en nombre, precio e impuesto (ILIKE) |
| Editar Perfil (tooltip) | Abre "Editar Perfil" | ninguno | — | |
| Eliminar Perfil (tooltip) | Diálogo "¿Deseas eliminar el perfil?" (Eliminar/Cancelar) | ninguno | `DELETE /servicios-personalizado/:id` | Borrado lógico; aviso "Ticket Eliminado" (texto heredado) |
| En uso → N (tooltip "Ver qué clientes lo tienen") | Abre la lista de usos (NET-026) | ninguno | `GET …/:id/usos` | Solo si N > 0; si es 0 se muestra "0" |
| Pantalla completa | Alterna | — | — | |

- **Filtros y columnas de tabla:** **Nombre**, **Precio** (descuento → "{valor}%" en rojo; valores negativos en rojo), **Impuesto** (el número guardado: 0, 15…), **ICE** ("$valor" si es valor fijo, "valor%" si es tarifa, "No Aplica"), **En uso**, **acciones**. Orden: más nuevos primero. Vacío: "No se encontró ningun resultado.".
- **Estados posibles:** no tiene estado activo/inactivo; solo existe o está eliminado (borrado lógico).
- **Reglas de negocio (backend):** `en_uso` = número de servicios distintos que lo tienen en (a) cargos recurrentes en estado `pendiente`/`activo` o (b) facturas con estado SRI `NO PAGADO`/`PENDIENTE`, contando solo servicios no retirados y, si el usuario tiene routers asignados, solo los de esos routers (`BE:servicios-personalizado.service.ts:21-60`). El catálogo en sí es global (no por router).
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** éxito de borrado "Ticket Eliminado"; error `error.response.data.message ?? 'Fallo al eliminar el ticket'`; BE: "Fallo al guardar el servicio personalizado", "No se encontró la perfil con el id …", "Perfil con ID … no encontrada".
- **Relaciones con otros módulos:** Clientes (cargos recurrentes y facturas libres), Facturación (IVA/ICE para el SRI), Países (ICE solo con `VITE_PAIS=EC`).
- **Casos límite y advertencias:** el personalizado se **copia** al agregarlo: editarlo o eliminarlo no cambia lo ya agregado, salvo que se use "Aplicar el cambio…" (NET-025). Eliminarlo no avisa si está en uso. El campo "Descripción" **no se copia** al ítem de la factura (`AddProductService.vue:44-56` solo copia nombre, precio, IVA, ICE, tipo, stock, es_descuento): la factura lleva el nombre.
- **Preguntas probables de usuarios:**
  1. ¿Qué es "Personalizado"? (catálogo de cobros/descuentos extra para facturas y cargos).
  2. ¿Cómo cobro una reconexión o instalación? (crearla aquí y agregarla a la factura/cargo del cliente).
  3. ¿Cómo hago un descuento del 10 %? (Precio 10 y marcar "Aplicar como descuento %").
  4. ¿Por qué no veo el menú "Personalizado"? (el permiso no es asignable desde roles; ver Hallazgos).
  5. ¿Qué pasa con las facturas ya emitidas si cambio el precio? (no cambian, salvo opción de aplicar).
  6. ¿Qué es la columna "En uso"? (clientes que lo tienen en cargos activos o facturas sin pagar).
- **Pendiente de validar en UI:** ❓ si en instancias reales `personalizado.index` está asignado a roles no super-admin; ❓ cómo aparece "Descripción" (si en algún lugar); ❓ columna "Impuesto" sin símbolo %.

## NET-025 · Servicios Personalizados — crear/editar y "aplicar el cambio a quienes ya lo tienen"
- **Ruta UI / name:** diálogo "Nuevo Perfil"/"Editar Perfil" en `/personalizado`.
- **Archivos:** FE: `components/FormPersonalizado.vue`, `composables/usePersonalizado.js` · BE: `servicios-personalizado.controller.ts:14-56`, `service.ts:70-171`, `aplicar-cambio-personalizado.ts`, `dto/create-servicios-personalizado.dto.ts`.
- **Para qué sirve:** definir el concepto y, al editarlo, decidir si el nuevo valor se propaga a cargos recurrentes y facturas pendientes que ya lo tienen.
- **Acceso:** el de la pantalla.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Nombre: | texto (multilínea) | Sí | "Debes completar este campo"; BE `@IsString`, se guarda en MAYÚSCULAS | |
| Precio: | texto numérico, con "%" y casilla (tooltip "Aplicar como descuento %") | Sí | Hasta 2 decimales ("Solo se permiten 2 decimales"); como descuento debe ser > 0 ("El valor debe ser mayor a 0"); BE `@IsNumberString` | Acepta negativos si no es descuento |
| Impuesto: | select | No | "Sin IVA" (0) o la tarifa estándar del país (EC: 15 %); BE `@IsNumber` | Deshabilitado si es descuento o precio ≤ 0 (se fuerza a 0) |
| ICE: (solo Ecuador) | select | No | "No aplica", "Por porcentaje", "Por valor fijo" | Deshabilitado si es descuento o precio ≤ 0 |
| Valor: (si hay ICE) | texto numérico | Sí si hay ICE | "$" o "%" | |
| Codigo: (si hay ICE) | select con búsqueda | Sí si hay ICE | Catálogo SRI (p. ej. 3011 "ICE-CIGARRILLOS RUBIOS", 3092 "ICE-SERVICIOS DE TELEVISIÓN PREPAGADA"…) en `usePersonalizado.js:31-87` | Se guarda como número |
| Descripción: | texto largo (3 filas) | No en FE; BE `@IsString` obligatorio (se envía "") | | No llega al ítem de factura |
| Aplicar el cambio a los N cliente(s) que lo tienen (toggle; solo al editar un concepto con "En uso" > 0) | toggle | — | Texto: "Actualiza sus cargos recurrentes (desde la próxima factura) y las facturas pendientes. Las facturas pagadas, con abonos o ya emitidas no se tocan." | Muestra vista previa: "Se actualizarán N cargo(s) recurrente(s) y M factura(s) pendiente(s).", "No hay nada que actualizar: ya tienen este valor.", y la lista "N factura(s) no se tocan (revisar a mano)" |

- **Botones y acciones:** "Guardar Cambios" → diálogo "¿Deseas agregar el perfil?" / "¿Deseas editar el perfil?" (+ aviso "El valor nuevo se aplicará también a los cargos recurrentes y a las facturas pendientes de los clientes que lo tienen." si aplica) con "Agregar"/"Editar" y "Cancelar".
- **Estados posibles:** n/a.
- **Reglas de negocio (backend):**
  - Crear: `POST /servicios-personalizado` con nombre en mayúsculas; `valor_ice` = 0 y `tipo_ice` = null si no hay ICE. `nuevoPrecio` es un booleano obligatorio en el DTO pero la pantalla ya no lo expone (siempre `false`).
  - Vista previa: `POST /:id/impacto` calcula sin escribir.
  - Editar con `aplicar_a_usos=true`: en **una transacción** actualiza el concepto y reescribe la línea en (a) cargos recurrentes `pendiente`/`activo` y (b) facturas `NO PAGADO`/`PENDIENTE`; recalcula `monto`/`total_servicio`; invalida la caché de "fecha máxima de pago" de los servicios tocados (`service.ts:135-158`).
  - Una factura **no se toca** y se reporta si: "tiene abonos o comprobante emitido", "el servicio tiene más de un cargo recurrente con este personalizado", "su cargo recurrente ya no está activo", o "el total guardado no cuadra con sus ítems: revisarla a mano" (`service.ts:242-286`).
  - Los descuentos en % se calculan sobre el precio del plan (`base`) y se guardan como importe negativo; sin IVA ni ICE propios (siguen al servicio).
- **Efectos secundarios externos:** ninguno (no emite comprobantes; solo cambia datos de cargos/facturas pendientes).
- **Mensajes de error/éxito (texto exacto):** "Perfil agregado", "Perfil editado", con propagación: "Perfil editado. Se actualizaron N cargo(s) recurrente(s) y M factura(s) pendiente(s)" + "; K factura(s) quedaron sin cambios (revisar a mano)" + "."; errores: `error.response.data.message`.
- **Relaciones con otros módulos:** Clientes (cargos recurrentes `servicios-recurrentes.detalleItems`, facturas `pagos.detalleFacturaLibre`), Facturación electrónica (IVA/ICE), caché de fechas de pago.
- **Casos límite y advertencias:** la propagación no altera facturas ya emitidas ni con abonos; no hay "deshacer"; el nombre se guarda en mayúsculas aunque se escriba en minúsculas; el catálogo de códigos ICE es el del SRI (Ecuador).
- **Preguntas probables:** 1) ¿Cómo cambio el precio de un concepto en todos mis clientes? (editar y activar "Aplicar el cambio…"). 2) ¿Por qué algunas facturas "no se tocan"? (tienen abonos o ya fueron emitidas). 3) ¿Por qué no puedo poner IVA? (descuento o precio ≤ 0). 4) ¿Qué es ICE y el código? (impuesto especial, solo Ecuador). 5) ¿Un descuento es sobre qué valor? (el precio del plan del servicio).
- **Pendiente de validar en UI:** ❓ cómo se ve el aviso cuando varias facturas se omiten; ❓ diferencias con Países distintos de EC.

## NET-026 · Servicios Personalizados — "En uso" y eliminación
- **Ruta UI / name:** diálogo de usos en `/personalizado` (botón N en columna "En uso").
- **Archivos:** FE: `components/UsosPersonalizado.vue`, `IndexPage.vue:51-66` · BE: `service.ts:62-68,291-299`.
- **Para qué sirve:** saber qué clientes tienen el concepto antes de cambiarlo o quitarlo.
- **Acceso:** el de la pantalla.
- **Qué ve el usuario:** título = nombre; subtítulo "N cliente(s) lo tienen en uso: cargos recurrentes activos y facturas sin pagar"; tabla "Cliente" (enlace al perfil + dirección), "Documento", "Dónde" ("Cargo recurrente #N" o "Factura #N" + "Fecha de pago: dd/mm/aaaa"), "Estado" (activo/pendiente/NO PAGADO/PENDIENTE), "Detalle" (tipo de pago o tipo de factura); 10/25/50/todos por página; vacío "Ningún cliente lo tiene en uso."; error "No se pudo cargar dónde se usa".
- **Reglas de negocio (backend):** la consulta SQL cruza los JSON de ítems (`detalleItems`/`detalleFacturaLibre`) por el id del personalizado; respeta el alcance de routers del usuario.
- **Eliminar:** borrado lógico (`softDelete`); no desvincula ni altera lo ya copiado.
- **Casos límite:** un cliente con el concepto en un cargo y en una factura aparece en dos filas pero cuenta como uno.
- **Preguntas probables:** 1) ¿A quién le estoy cobrando esto? 2) ¿Puedo borrarlo si está en uso? (sí, no afecta lo ya agregado). 3) ¿Por qué un cliente aparece dos veces? (cargo + factura).
- **Pendiente de validar en UI:** ❓ formato de "Detalle" (valores reales de `tipo_pago`).

## NET-027 · Referencia — modelo de datos de red física (cajas, puertos, postes, tramos) y monitoreo
- **Ruta UI / name:** sin pantalla; tablas que respaldan lo anterior.
- **Archivos:** BE: `caja-nap/entities/caja-nap.entity.ts`, `puertos/entities/puerto.entity.ts`, `red-fibra/entities/{poste,tramo-fibra}.entity.ts`, `monitoreo-dispositivos/entities/*`, `monitoreo-trafico/entities/*`, `ubicacion-tecnicos/entities/ubicacion-tecnico.entity.ts`, `servicios-personalizado/entities/*`, `customers/entities/ServicioCliente.entity.ts:70-90,163-168`.
- **Tablas:**

| Tabla | Campos clave | Notas |
|---|---|---|
| `cajas-nap` | id, router_id (CASCADE), nombre(100), coordenadas(100, "lng, lat"), ubicacion(100), detalles(250), estado(25), potencia(6), detalles_adicionales, isActive, created_at/updated_at | Sin índice único; `estado` texto libre |
| `puertos` | id, cajaNap_id (CASCADE), puerto int, isActive (sin uso) | 1…N por caja; sin endpoints propios |
| `servicios-clientes` (extracto) | caja_id, puerto_id (nullable, ManyToOne eager), coordenadas(200, "lng,lat"), trazado_acometida jsonb, estado_conexion, conexion_revisada_en, isActive, deleted | Un puerto puede referenciarse por varios servicios (sin restricción) |
| `postes` | ver NET-009 | Por router |
| `tramos_fibra` | ver NET-009 | Por router, `path` jsonb |
| `monitor_dispositivo` | id, nombre(120), ip(45), categoria, router_id, intervalo_min, umbral_fallos, paquetes, metodo_ping, activo, notificar, notas, sucursal_id, lat, lng, estado, fallos_consecutivos, ultima_latencia_ms, ultima_perdida_pct, ultimo_ping_en, caido_desde, deleted_at | `lat`/`lng`/`sucursal_id` sin uso en UI |
| `monitor_dispositivo_caida` | dispositivo_id, inicio, fin, aviso_caida_en, aviso_recuperacion_en | Sin purga |
| `monitor_dispositivo_muestra` | dispositivo_id, ts, latencia_ms, perdida_pct | 30 días |
| `trafico_muestra/hora/dia`, `trafico_contador` | servicio_id, router_id, ts/hora/dia, bytes_in, bytes_out, segundos, mbps_*_max | 8 / 45 / 400 días |
| `trafico_interfaz_muestra/hora/dia`, `trafico_interfaz_contador` | router_id, interfaz, … | 8 / 60 / 400 días |
| `conexion_caida` | servicio_id, inicio, fin | Sin purga |
| `tecnico_ubicaciones` | usuario_id (PK), latitud, longitud, precision_m, origen (`navegador`/`app`), dispositivo, capturada_en, actualizado_en | Una fila por usuario; visible 12 h |
| `servicios-personalizados` | id, nombre, precio (texto), nuevoPrecio, es_descuento, impuesto, ice, valor_ice, tipo_ice, descripcion, deleted_at | Global (sin router) |
| `routers` (extracto monitoreo) | interfaz_wan, online, ultimo_visto, caido_desde, fallos_consecutivos, slack_alertado, version_ros | NET-021/023 |
| `settings` (extracto) | mostrarMonitoreoDashboard (bool, defecto false), monitoreoNotificaciones (jsonb, defecto `{activo:false, correos:[], whatsapps:[], retardoMin:5, avisarRecuperacion:true}`) | NET-014/017 |

- **Preguntas probables:** 1) ¿Un poste y una caja NAP son lo mismo? (no). 2) ¿Dónde se guardan las coordenadas del cliente? (en el servicio, `coordenadas`). 3) ¿Por qué puertos "libres" sin cliente activo? (se cuentan los servicios no retirados).

## NET-028 · Referencia — composables de ubicación y de redes (useUbicacion, useUbicacionLabels, useHelperRedes)
- **Ruta UI / name:** sin pantalla.
- **Archivos:** FE: `src/composables/useUbicacion.js`, `useUbicacionLabels.js`, `useHelperRedes.js`, `useLatidoUbicacion.js`.
- **`useUbicacion`:** obtiene la ubicación del equipo (GPS de la app ISPMAX vía puente nativo, o API del navegador) escuchando hasta lograr la precisión deseada o agotar el tiempo (por defecto 30 m / 20 s; el mapa de red y el selector de coordenadas piden 100 m / 8 s). Devuelve latitud, longitud, precisión, `origen` ('app' o 'navegador'). Mensajes (voseo) al usuario: "No se dio permiso para usar la ubicación. Habilitalo en los permisos del navegador para este sitio y volvé a intentar.", "El equipo no pudo determinar la ubicación. Revisá que el GPS esté encendido.", "El GPS tardó demasiado en responder. Probá al aire libre o cerca de una ventana.", "La ubicación sólo funciona con https. Abrí el sistema desde su dirección segura.", "Este navegador no permite obtener la ubicación.", y en la app: "La ubicación del teléfono está apagada. Activala desde la barra de ajustes rápidos y volvé a intentar.", "Diste permiso de ubicación aproximada, y para marcar la visita hace falta la precisa. …". Lo usan el selector de coordenadas, el mapa de red (centrado y "Cómo llegar"), las visitas de tickets y el latido de técnicos.
- **`useLatidoUbicacion`:** aviso periódico de ubicación del rol `TECNICO` (NET-012). Diálogo único "Tu ubicación": "Mientras tengas el sistema abierto, tu ubicación se comparte con la central para saber a quién asignarle cada soporte. Con el sistema cerrado no se comparte nada." (botones "Activar"/"Ahora no").
- **`useUbicacionLabels`:** **no tiene relación con mapas**: define los nombres de los niveles administrativos (por defecto Ecuador "Provincia/Cantón/Parroquia"; MX Estado/Municipio/Colonia; CO Departamento/Municipio/Corregimiento; VE Estado/Municipio/Parroquia; BO Departamento/Provincia/Municipio; PE Departamento/Provincia/Distrito), sobrescribibles desde Ajustes › Base de datos › Ubicaciones (`GestionUbicaciones.vue`).
- **`useHelperRedes`:** utilidades de IPv4 (agrupar IPs por red/CIDR, calcular dirección de red, resolver la red de una IP); lo usan el servicio de internet del cliente y la pre-asignación de instalaciones; **no interviene en cajas NAP ni en mapas**.
- **Pendiente de validar en UI:** ❓ mensajes de permiso de ubicación en la app móvil real.

---

## NET-029 · Cajas NAP — caja principal / secundaria (formulario y columna "Tipo de caja")
> Alta posterior al ZIP del 2026-10-06 (FE `99b38a14` / BE `3057b787`): código del 2026-10-14 (commit FE `4803c58f` "Cajas principales y sus cajas secundarias"; migración `1789000000000-CajaPrincipal`).
- **Ruta UI / name:** `/cajas-nap` (columna), `/cajas-nap/add` y `/cajas-nap/edit/:id` (campos en el formulario).
- **Archivos:** FE: `cajas-nap/components/FormNap.vue:16-61, 341-410`, `cajas-nap/composables/useNap.js:16`, `cajas-nap/EditPage.vue:9-13`, `cajas-nap/IndexPage.vue:41-46, 499-520`, `stores/auth-user.ts:143` (columna visible por defecto `caja_principal`) · BE: `caja-nap/entities/caja-nap.entity.ts:22-24`, `dto/create-caja-nap.dto.ts:37-40`, `caja-nap.service.ts` (`create` 31-35, `findAll` 64-65, `getCajasAndClients` 133-134, `findOne` 559-566, `validarCajaPrincipal` 571-588, `update` 590-602), `migrations/1789000000000-CajaPrincipal.ts`.
- **Para qué sirve:** indicar que una caja NAP se alimenta de otra (jerarquía principal → secundaria). Es informativo y de ubicación: no cambia puertos, ocupación ni clientes.
- **Acceso:** los del formulario de caja (`crear.caja_nap` / `editar.caja_nap`); la columna se ve con `index.caja_nap`.
- **Campos de formulario (al final del formulario):**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Tipo de caja | grupo de opciones | — | `Principal` (por defecto) / `Secundaria` | Pasa solo a `Secundaria` si la caja ya tiene `caja_principal_id`; volver a `Principal` pone `caja_principal_id = null` (`FormNap.vue:39-54`). |
| Sale de la caja | q-select | Sí, si el tipo es `Secundaria` | Opciones = cajas del router elegido (`GET /caja-nap` con cabecera `router-id`) menos la propia; sin elegir: error `Elige de qué caja principal sale` y no envía (`FormNap.vue:16-37, 56-62, 405`) | Al cambiar el router, si la principal elegida no está en las opciones se descarta (`:28-31`). Texto sin opciones: `Sin otras cajas en este router`. |

- **Columna del listado:** `Tipo de caja` (`name: caja_principal`, sin orden): insignia `★ Principal` (llena) si no tiene principal, o `Secundaria` (contorno) y debajo `de <nombre de la principal>` (`IndexPage.vue:41-46, 499-520`). El backend devuelve solo `principal.id` y `principal.nombre` en el listado (`caja-nap.service.ts:64-65`).
- **Reglas de negocio (backend):**
  - `create`: guarda `caja_principal: { id }` o `null` (`:31-35`); no valida que exista, ni que sea del mismo router.
  - `update`: si llega `caja_principal_id`, `validarCajaPrincipal` sube por la cadena de principales y, si encuentra la propia caja, responde 400 `Enlace inválido: la caja elegida depende (directa o indirectamente) de esta misma caja` (`:571-594`). `caja_principal_id: null` borra el enlace; ausente (`undefined`) no lo toca (`:600-601`).
  - FK `caja_principal_id` → `cajas-nap(id)` con `ON DELETE SET NULL` (`migrations/1789000000000-CajaPrincipal.ts`): eliminar la principal deja a sus secundarias como principales.
  - La plantilla/importación/exportación Excel de cajas **no** incluye el campo (`grep caja_principal` solo aparece en los puntos anteriores).
- **Mensajes:** `Elige de qué caja principal sale` (FE); `Enlace inválido: …` (BE, se muestra como aviso `warning` por `useNap.js`); el éxito conserva el texto heredado `Router agregado/editado exitosamente`.
- **Relaciones con otros módulos:** NET-030 (mapa), NET-001/002 (listado y formulario), routers (RED-0xx: migrar router mueve cajas NAP).
- **Casos límite y advertencias:** (1) El backend no comprueba que la principal pertenezca al mismo router: solo la UI filtra por router. (2) `migrarRouter` / cambiar el router de una red mueve las cajas NAP de los servicios migrados (`red-ipv4.service.ts:1111-1113`) pero **no** toca `caja_principal_id`: una secundaria puede quedar enlazada a una principal de otro router ❓. (3) Un UUID inexistente produce error de FK, que `handleDBExceptions` convierte en 500 `Unexpected error, check server logs`. (4) Desactivar una caja (`setEstado`) no afecta el enlace.
- **Preguntas probables:** ¿Cómo marco que una caja sale de otra? (Tipo de caja → Secundaria + Sale de la caja). ¿Por qué no me deja elegir una caja? (solo del mismo router y no puede ser circular). ¿Qué pasa si borro la principal? (las secundarias quedan principales). ¿Se puede importar por Excel? (no).
- **Pendiente de validar en UI:** ❓ aspecto real de la insignia y del selector; ❓ efecto de migrar un router con cajas enlazadas.

---

## NET-030 · Mapa — enlaces entre cajas, ★ de caja principal y "Clientes sin caja NAP"
> Alta posterior al ZIP del 2026-10-06: código del 2026-10-14 (`mapa-nap/IndexPage.vue`).
- **Ruta UI / name:** `/mapa-nap` · `index.mapa` (menú **Capas y filtros**).
- **Archivos:** FE: `mapa-nap/IndexPage.vue` (estado `:46-49`; `principal` en el modelo de cajas `:179-185`; enlaces `:1930-2025`; ficha `:2288-2302`; marcador ★ `:2349-2357`; clientes sin caja `:3234-3285`; limpieza de capas `enlaces-` `:3578-3583`; llamadas `:3774-3776, 4158`; menú `:4599-4604, 4688`; leyenda `:4757-4760`) · BE: `caja-nap.service.ts:133-134` (`getCajasAndClients` agrega `caja_principal.id/nombre/coordenadas`), `GET /customers/mapa/clientes`.
- **Para qué sirve:** ver en el mapa la jerarquía de cajas y, opcionalmente, los clientes con coordenadas que no tienen caja asignada.
- **Enlaces entre cajas:** capa GeoJSON `enlaces-cajas` (línea violeta `#8e24aa`, discontinua, 3,5 px) y etiqueta de distancia (`minzoom 14`) para cada caja con `principal` y coordenadas válidas en ambas; usa la ruta de fibra estimada si está en caché (`obtenerRutaFibra`) y, si no, la recta (`:1941-2025`). Se dibuja cuando el tipo de mapa **no** es `Clientes` (`:3776, 4158`). Casilla **Enlaces entre cajas** (`mostrarEnlacesCajas`, por defecto `true`, no se recuerda) junto a **Tendido de fibra**.
- **Marcador y ficha:** una caja que es principal de otras recibe la clase `marker-caja-principal` (★ violeta en la esquina) y `title` `Caja principal de: …`; una secundaria, `Secundaria de <principal>`. La ficha agrega `Caja principal:` o `Cajas secundarias:` (`:2288-2302, 2349-2357`).
- **Leyenda:** bloque **Jerarquía de cajas**: `Caja principal (con ★)` y `Enlace principal → secundaria` (`:4757-4760`).
- **Clientes sin caja NAP:** solo con tipo `Cajas Nap y Clientes`; casilla **Clientes sin caja NAP** (`mostrarClientesSinCaja`), con la ayuda `Suma a los que no están asignados a ninguna caja.`; se recuerda en `localStorage` (`mapa-nap:clientes-sin-caja`). Al activarla, `dibujarClientesSinCaja` pide `/customers/mapa/clientes` y agrega un marcador por cada servicio con coordenadas válidas que no esté ya dibujado dentro de una caja; respeta los filtros Activos/Suspendidos/Sin conexión (`aplicarFiltrosClientes`). No tienen acometida.
- **Casos límite y advertencias:** (1) El enlace no se edita desde el modo edición; se define en el formulario de la caja (NET-029). (2) Si la principal no tiene coordenadas válidas, no se dibuja el enlace. (3) La preferencia "Clientes sin caja NAP" es por navegador.
- **Preguntas probables:** ¿Qué es la estrella violeta? (caja principal). ¿Cómo oculto las líneas violetas? (Enlaces entre cajas). ¿Cómo veo clientes sin caja? (Clientes sin caja NAP).
- **Pendiente de validar en UI:** ❓ rendimiento con muchos clientes sin caja; ❓ qué estados de servicio incluye exactamente `/customers/mapa/clientes` (retirados, ver hallazgo 5).

---

## Hallazgos del dominio

**A. Seguridad y permisos**
1. **El backend de este dominio no valida permisos** (solo JWT): cualquier usuario autenticado puede, por API, crear/borrar cajas, puertos, postes, tramos, dispositivos de monitoreo, personalizados y editar cualquier campo de un servicio (`PATCH /customers/actualizarServicio/:id` recibe `any`). Lo que el manual describa como "permiso" solo oculta botones. Única excepción: `GET /ubicacion-tecnicos` (`mapa.tecnicos.index`).
2. **`personalizado.index` no está en el catálogo de permisos** (ninguno de los `*-permisos.json`): la pantalla "Personalizado" solo la ve `SUPER-ADMINISTRADOR` (o roles que ya tengan la clave guardada). Igual `mapa-clientes.index` (ruta legacy `/mapa-clientes`, sin entrada propia de menú). El manual (`docs/guia/personalizado.mdx`) no menciona permiso alguno.
3. **Alcance por routers inconsistente:** mapa de cajas/clientes, tráfico del Dashboard, top de consumo y Personalizado (`en_uso`) respetan `users.routers`; **no** lo respetan `GET /red-fibra/mapa`, el listado/resumen de `monitoreo-dispositivos` ni `GET /caja-nap` (solo el mapa lo aplica vía `obtener-cajas-y-clientes`).
4. **Tokens de Mapbox públicos incrustados en el código** (`pk.…`) en `FE:components/ModalMapBox.vue:46`, `FE:boot/apiSearchPlaces.js:8` y `FE:pages/dashboard/Gestion-Red/adminOLT/components/Maps/MapVistaAdminOlt.vue:24`, mientras que el mapa de red y `/mapa-clientes` usan `import.meta.env.VITE_MAPBOX_TOKEN`. Tres orígenes de token distintos: rotación/cuota/facturación inconsistentes.

**B. Integridad de datos**
5. **Ocupación de puertos con tres criterios distintos:** lista, reporte y formularios usan servicios con `deleted = false`; el mapa (`obtener-cajas-y-clientes`) no filtra `deleted` y retirar un servicio **no limpia** `caja_id`/`puerto_id` (`customers.service.ts:2940`). Un puerto puede verse libre en la lista y ocupado en el mapa. Además no hay validación ni índice único que impida dos servicios en el mismo puerto.
6. **Reducir puertos es frágil:** `caja-nap.service.ts:579-584` elimina puertos con `forEach(async)` sin esperar ni comprobar ocupación; si la FK lo impide, el error cae en el `unhandledRejection` global (`main.ts:15-17`) y la API responde "Registro actualizado exitosamente". El manual (`nap.mdx`) dice que los ocupados "no se liberan automáticamente" (✅ coherente por efecto, pero no por diseño).
7. **Límites de columna sin validación de DTO:** `potencia varchar(6)`, `nombre`/`ubicacion varchar(100)`, `detalles varchar(250) NOT NULL` (el DTO lo declara opcional). Exceder → 500 "Unexpected error, check server logs".
8. **Eliminar caja con clientes:** `remove()` no controla la FK; `useHelpers.confirmDelete` espera un `code '23503'` que el backend no devuelve ❓.
9. **Importación KMZ:** los tramos no se de-duplican al reimportar (solo los postes); `codigo` > 50 caracteres hace fallar todo el lote por validación del DTO.
10. **`GET /caja-nap/obtener-cajas-y-clientes`** declara `@Param('estado')` que no existe en la ruta: siempre `false`; el mapa muestra también cajas desactivadas.

**C. Código muerto / rarezas**
11. `PuertosModule`: controlador y servicio vacíos; `Puerto.isActive` nunca se usa. Los puertos solo se gestionan desde `caja-nap.service.ts`.
12. `GET /caja-nap/reporte/excel` + `descargarReporte('excel')` sin botón en la pantalla; el manual (`nap.mdx`, "Excel — descarga el reporte de cajas en Excel") describe un botón que no existe con ese nombre (el menú Excel ofrece "Importar Excel", "Descargar Plantilla" y "Exportar Cajas NAP").
13. Cabeceras `router_id` y `NotSetHeaderCompany` enviadas por `useNap.js`/`ModalCargarExcel.vue` no son leídas por el backend.
14. `nuevoPrecio` (Personalizado): obligatorio en el DTO, toggle comentado en el FE; el manual (`personalizado.mdx`) aún lo describe como "Nuevo precio — Permite modificar el valor al aplicarlo" ❌ no existe en la UI.
15. `FE:cajas-nap/IndexPage.vue:309` `routerSinTodos !== 0` siempre verdadero.
16. `monitor_dispositivo.lat/lng/sucursal_id` aceptados por el DTO pero sin UI: los equipos monitoreados no se pueden ubicar en el mapa.

**D. Textos y UX**
17. El formulario de caja NAP muestra **"Router agregado exitosamente" / "Router editado exitosamente"** (`useNap.js:89`).
18. Eliminar un personalizado muestra **"Ticket Eliminado"**; el backend devuelve `ticket con #… removida`; mensaje de error "Fallo al eliminar el ticket".
19. "Estado" de la caja (texto) ≠ activa/inactiva (`isActive`): el badge "Activo" puede convivir con una caja desactivada; "En mantenimiento" y "Desactivada" se rotulan ambas "Inactivo".
20. Umbral de ocupación inconsistente: reporte PDF/Excel (verde < 70 %, naranja 70–89 %, rojo ≥ 90 %) vs mapa (verde < 70 %, naranja 70–99 %, rojo 100 %).
21. La leyenda del mapa omite Mangas y Nodos; el selector de vista de importaciones solo aparece en modo edición.
22. Estilo de voz mezclado: voseo ("Habilitá", "Elegí", "No tenés permiso") en mensajes de ubicación/mapa/técnicos frente a tuteo en el resto del sistema.
23. El interruptor "Enviar alertas cuando un equipo se caiga" no apaga la campanita: siempre avisa a administradores (el propio banner lo aclara).
24. `paquetes` del dispositivo no tiene máximo en el DTO (el ping manual lo limita a 1–10).
25. El manual `monitoreo.mdx` no menciona "Notificar caídas de este equipo", la retención (30 días de latencia), ni que los avisos de router caído van por Slack al operador.
26. El manual `mapa.mdx` dice "NAP → Cajas NAP": son puntos del relevamiento (`c_nap`), **no** registros de Cajas NAP con puertos; tampoco documenta la capa Técnicos, "Colorear por Red", "Tipo", ni "Códigos de postes"/"Tendido de fibra".
27. El manual `personalizado.mdx` dice que "Descripción" aparece en la factura (no se copia al ítem) y omite la columna "En uso", el toggle "Aplicar el cambio…" y que ICE/Código solo existen en Ecuador.

**F. Cajas principales y secundarias (código del 2026-10-14)**
28. `caja_principal_id` no se actualiza al migrar un router ni al cambiar el router de una red (`red-ipv4.service.ts:1111-1113` mueve la caja pero no su enlace): una secundaria puede quedar enlazada a una principal de otro router; el formulario solo ofrece cajas del mismo router, así que la UI no permite crear ese estado a mano ❓.
29. El backend no valida que la caja principal exista ni que sea del mismo router; la prevención de ciclos solo corre en `update`.
30. La importación y exportación por Excel de cajas NAP no incluye el tipo de caja: las cajas importadas quedan como principales.

**G. Cierre de lectura de NET-003, NET-006, NET-020 y NET-021 (2026-10-25)**
31. Cierre: el **Excel de "Ver clientes de esta caja" incluye servicios retirados** (con `ESTADO = Retirado`) aunque el modal los excluye; `exportarClientesCaja` no filtra `deleted` y `downloadExcelCustomers` no lo aplica cuando recibe `serviciosIds` (BE:caja-nap/caja-nap.service.ts:210-222 · mikrotik/mikrotik.service.ts:1754,1900). `docs/guia/nap.mdx` ("Ver clientes de esta caja … No incluye retirados") solo es cierto para la lista.
32. Cierre: la columna **TIPO (G) del Excel de clientes sale invertida**: `postpago` se escribe `Prepago (Adelantado)` y `prepago`, `Postpago (Vencido)` (BE:mikrotik/mikrotik.service.ts:2328-2330), mientras que la importación interpreta `Postpago (Vencido)` como `postpago` (FE:clientes/components/modals/ModalCargarExcel.vue:234). Afecta a todas las exportaciones que usan `downloadExcelCustomers` (clientes, plan, red IPv4/IPv6, caja NAP).
33. Cierre: **quitar la caja o el puerto al editar un servicio no los desasigna**: `actualizarDatosServicio` los saca del `UPDATE` en vez de ponerlos en nulo cuando vienen vacíos o con "Ninguno" (BE:customers/customers.service.ts:2500-2507; FE:ServicioInternet.vue:821). Y **"Agregar Servicio" con caja y puerto "Ninguno"** no pasa por esa comprobación (`servicio.puerto_id.length === 0`, `:581-586`) y manda `"Ninguno"` a una columna uuid ❓ error de base de datos en pantalla.
34. Cierre: la **pre-asignación de caja y puerto en una instalación no reserva nada** (jsonb en `instalaciones.pre_asignacion`); la lista de puertos libres no mira otras pre-asignaciones, y la tarjeta dice "Los recursos se liberan automáticamente si se cancela la instalación" (FE:instalaciones/components/SeccionPreAsignacion.vue:658-662 · BE:instalaciones/entities/instalacione.entity.ts:89-93 · instalaciones.service.ts:703-708).
35. Cierre: en la **importación de clientes**, la lista de cajas del Excel sale de `convertirAValidoEnExcel` (todo carácter fuera de `A-Za-z0-9._` pasa a `_`) y la importación solo revierte `_` → espacio: una caja llamada "Caja-01" elegida del desplegable no se encuentra (BE:mikrotik/mikrotik.service.ts:1805,1943-1951 · FE:ModalCargarExcel.vue:316-318). Además la plantilla marca como ocupado el puerto de un servicio retirado (`puerto.plan_internet.length == 0`, `mikrotik.service.ts:1806`).
36. Cierre: en la pestaña Consumo, la tarjeta "Última lectura" mide la antigüedad del último punto de consumo, no de la detección; el campo de fechas no existe para SmartOLT; y las vistas `Semana` / `Mes` / `Año` / personalizado no incluyen la hora en curso (consolidación a los 4 min de la hora siguiente) (FE:ConsumoPage.vue:385-395,607-650 · BE:monitoreo-trafico-collector.service.ts:617-642). `docs/guia/detalle-cliente.mdx` no lo menciona.
37. Cierre: una caída (`conexion_caida`) abierta de un servicio que se suspende, se retira o pasa a `sin_datos` queda con `fin` nulo (`CAÍDO AHORA` y tiempo caído crecen) hasta que vuelva a estar `online`; las ONU con `onu_source` vacío no se evalúan (BE:monitoreo-trafico/monitoreo-conexion.service.ts:60-74,211-241).
38. Cierre: el WAN del router se guarda sin aviso de éxito ni de error (FE:routers/components/MonitoreoRouter.vue:103-117); "Tráfico Clientes" no sigue los filtros Router/Sucursal del Dashboard y su serie no incluye la hora en curso (FE:TraficoClientes.vue:28-38 · BE:monitoreo-trafico.service.ts:263-283). El resto de lo que dicen `docs/guia/dashboard.mdx` y `docs/guia/routers.mdx` sobre estas pantallas coincide con el código.

**E. Dudas que solo se resuelven en la UI real:** retirados en el mapa; mensaje al borrar caja con clientes; comportamiento al bajar puertos con clientes; visibilidad real de "Personalizado" para roles; consumo de cuota Mapbox Directions con muchos clientes; si Chromium está disponible para el PDF.

