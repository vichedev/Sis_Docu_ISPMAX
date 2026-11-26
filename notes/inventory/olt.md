# Inventario OLT — SmartOLT, AdminOLT y corte/reactivación por ONU

> Alcance: FE `src/pages/dashboard/Gestion-Red/smartOLT/**` (46 archivos) y `src/pages/dashboard/Gestion-Red/adminOLT/**` (24 archivos); BE `src/smart-olt/**`, `src/admin-olt/**` y `src/common/utils/onu-corte.utils.ts`. Para trazar el corte por ONU y los vínculos se leyeron además, **solo en lo relativo a OLT**: `BE:app-queue.processor.ts`, `BE:app.service.ts`, `BE:customers/customers.service.ts`, `BE:monitoreo-trafico/monitoreo-conexion.service.ts`, `BE:settings/entities/setting.entity.ts`, `FE:pages/dashboard/ajustes/smartOLT/IndexPage.vue`, `FE:pages/dashboard/ajustes/servicios/components/{CronSmartOLT,CronAdminOLT,ConfigurarReintentosCortes}.vue`, `FE:pages/dashboard/clientes/components/editar/Servicios/{VincularOnu,VincularOnuAdminOLT}.vue` y `FE:pages/dashboard/clientes/components/editar/ServiciosPage.vue`. Generado desde el ZIP del 2026-10-06.

**Convención de citas (solo en este archivo):** `FE:S/` = `FE:pages/dashboard/Gestion-Red/smartOLT/` · `FE:A/` = `FE:pages/dashboard/Gestion-Red/adminOLT/` · `FE:AJ/` = `FE:pages/dashboard/ajustes/` · `FE:CL/` = `FE:pages/dashboard/clientes/` · `BE:` = `backend-isp-main/src/` · `FE:` sin alias = `frontend-isp-main/src/`. Todo lo marcado ✅ está leído en código; ❓ = pendiente de validar en UI real (no hay instancia). Ningún valor de credencial se reproduce.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| OLT-001 | SmartOLT · Panel principal (selector de OLT, uptime/temperatura, tarjetas, pestañas) | `/smartOLT` · `smartOLT.index` | `smartOLT.index` | completo |
| OLT-002 | SmartOLT · Pestaña API (dominio + API Key) | `/smartOLT` → pestaña `API` | `smartOLT.index` (sin permiso propio) | completo |
| OLT-003 | SmartOLT · Listado "ONUS CONFIGURADOS" (filtros, caché, vinculación) | `/smartOLT` → `ONUS CONFIGURADOS` | `smartOLT.index`, `smartOLT.vincular_cliente`, `smartOLT.reiniciar_onu`, `smartOLT.habilitar_desabilitar_onu`, `smartOLT.eliminar_onu` | completo |
| OLT-004 | SmartOLT · ONUs no configuradas (esperando autorización) | `/smartOLT/unconfigured/:olt_id` · `smartOLT_unconfigured.index` | `smartOLT_unconfigured.index`, `smartOLT.authorize` | completo |
| OLT-005 | SmartOLT · Autorizar ONU (formulario, configuración avanzada, vincular opcional) | `/smartOLT/authorize/:olt_id` · `smartOLT.authorize` | `smartOLT.authorize`, `smartOLT.vincular_cliente` | completo |
| OLT-006 | SmartOLT · Vista de una ONU (datos, estado, señal, gráficos) | `/smartOLT/onu-view/:unique_external_id` · `smartOLT_onu-view.index` | `smartOLT.index` (la ruta se mapea a este permiso) | completo |
| OLT-007 | SmartOLT · Reiniciar / Habilitar-Deshabilitar / Eliminar ONU | listado y vista de ONU | `smartOLT.reiniciar_onu`, `smartOLT.habilitar_desabilitar_onu`, `smartOLT.eliminar_onu` (solo en el listado) | completo |
| OLT-008 | SmartOLT · Mantenimiento: Get status, Running Config, Resync, Restaurar fábrica, Ubicación, Editar velocidad | vista de ONU | ninguno propio | completo (1 punto ❓) |
| OLT-009 | SmartOLT · Cambiar WiFi, Acceso del router, TR-069, Mgmt IP, Modo ONU | vista de ONU / ficha de servicio / autorizar | ninguno propio | completo |
| OLT-010 | SmartOLT · Cambios masivos (perfil de velocidad y habilitar/deshabilitar) | `/smartOLT` → botón `Cambios masivos` | ninguno propio | completo |
| OLT-011 | SmartOLT · Perfiles de velocidad (solo lectura) | `/smartOLT` → `PROFILES` | `smartOLT.index` | completo |
| OLT-012 | SmartOLT · VLANs (listar y agregar) | `/smartOLT` → `VLANS` | `smartOLT.index` | completo |
| OLT-013 | SmartOLT · Zonas (listar y agregar) | `/smartOLT` → `ZONAS` | `smartOLT.index` | completo |
| OLT-014 | Vinculación ONU↔cliente (SmartOLT, 3 puntos de entrada) | listado, autorizar y ficha del cliente | `smartOLT.vincular_cliente`, `servicio.vincular.onu` | completo |
| OLT-015 | AdminOLT · Panel principal | `/adminOLT` · `adminOLT.index` | `adminOLT.index` (no existe en el catálogo de permisos) | completo |
| OLT-016 | AdminOLT · Pestaña API (subdominio + API Key) | `/adminOLT` → `API` | `adminOLT.index` | completo |
| OLT-017 | AdminOLT · Listado "ONUS CONFIGURADOS" | `/adminOLT` → `ONUS CONFIGURADOS` | `adminOLT.index` | completo |
| OLT-018 | AdminOLT · ONUs en espera de autorización | `/adminOLT/no-autorizadas` · `adminOLT.no-autorizadas` | `adminOLT.no-autorizadas` (no existe en catálogo) | completo |
| OLT-019 | AdminOLT · Autorizar ONU | `/adminOLT/autorizar` · `adminOLT.autorizar` | `adminOLT.autorizar` (no existe en catálogo) | completo |
| OLT-020 | AdminOLT · Detalle de ONU y herramientas | `/adminOLT/onu/:sn` · `adminOLT.onu-detail` | `adminOLT.onu-detail` (no existe en catálogo) | completo |
| OLT-021 | Vinculación ONU↔cliente (AdminOLT) | listado, autorizar y ficha del cliente | `servicio.vincular.onu` (ficha) | completo |
| OLT-022 | AdminOLT · OLTs (perfiles de línea y VLANs por OLT) | `/adminOLT` → `OLTs` | `adminOLT.index` | completo |
| OLT-023 | AdminOLT · Zonas (crear, editar, eliminar) | `/adminOLT` → `ZONAS` | `adminOLT.index` | completo |
| OLT-024 | AdminOLT · Perfiles de velocidad (solo lectura) | `/adminOLT` → `PROFILES` | `adminOLT.index` | completo |
| OLT-025 | AdminOLT · NAPs (solo lectura) | `/adminOLT` → `NAPs` | `adminOLT.index` | completo |
| OLT-026 | AdminOLT · Maps (solo lectura) | `/adminOLT` → `MAPS` | `adminOLT.index` | completo |
| OLT-027 | Corte y reactivación de servicio vía ONU (y su relación con Ajustes/reintentos) | automático, manual y ficha del cliente | `variables.opciones-cortes`, `variables.aplicar-cortes`, `servicio.activar.suspender` | completo |
| OLT-028 | Reinicio automático programado de ONUs (colas `reiniciar-onus*`) | Ajustes → OLTs | `variables.reintentos.smartOLT` | completo |
| OLT-029 | Tareas en cola de verificación de habilitación/deshabilitación y cómo ver su resultado | sin pantalla propia (Logs) | `ver.logs`, `variables.opciones-logs` | completo |
| OLT-030 | Validación de ONUs contra la plataforma, `onu_invalida` y revalidación | Ajustes → OLTs, ficha del cliente | `variables.reintentos.smartOLT` (pestañas), `servicio.vincular.onu` | completo |
| OLT-031 | Ajustes → OLTs: valores por defecto (TR-069, Mgmt IP, tipo de ONU) | `/ajustes/smartolt` · `ajuste.smartolt` | `variables.reintentos.smartOLT`, `variables.opciones-cortes` | completo |
| OLT-032 | Matriz de permisos y control de acceso (front vs back) | transversal | todos los de OLT | completo |
| OLT-033 | Estados de ONU y su significado | transversal | — | completo |
| OLT-034 | Caché, límites de la API y comportamiento ante errores | transversal | — | completo |

---

## Visión general: qué son SmartOLT y AdminOLT en ISPMAX

**Qué son (✅).** Son dos *plataformas externas de gestión de OLT* (equipos de cabecera de fibra GPON/EPON) a las que ISPMAX se conecta por HTTP. ISPMAX **no habla con la OLT**: pide a la plataforma que autorice ONUs, las habilite/deshabilite, las reinicie, etc. Una instalación de ISPMAX puede usar una, otra o ambas. Cada servicio de cliente guarda `sn` (serie/ID externo de la ONU) y `onu_source` (`'smartOLT'` | `'adminOLT'`) (`BE:customers/entities/ServicioCliente.entity.ts:108,125`).

**Cómo se configura la conexión (✅, sin valores).**

| | SmartOLT | AdminOLT |
|---|---|---|
| Dónde se escriben las credenciales | `/smartOLT` → pestaña **API** (`FE:S/components/Api/FormApi.vue`) | `/adminOLT` → pestaña **API** (`FE:A/components/Api/FormApi.vue`) |
| Campos | Dominio (`placeholder="https://mi-dominio.smartolt.com"`) y API Key (`placeholder="Ingrese su API KEY"`); **los dos inputs no llevan `label`** (`FE:S/components/Api/FormApi.vue:46-57`) | `Subdominio` y `API Key` con hint "Puedes ingresar solo el subdominio (ej: miempresa) o el dominio completo (ej: miempresa.adminolt.com)" (`FE:A/components/Api/FormApi.vue:39-52`) |
| Tabla BD | `smartOLT` (`dominio`, `api`, `activarOnu`) (`BE:smart-olt/entities/smart-olt.entity.ts:4-20`) | `adminOLT` (`subdominio`, `api`, `activarOnu`) (`BE:admin-olt/entities/admin-olt.entity.ts:3-16`) |
| Registro usado | el **primero** por `created_at ASC` (`BE:smart-olt/smart-olt.service.ts:178-186`); sin registro: `No hay credenciales SmartOLT configuradas` | el **primero** (`BE:admin-olt/admin-olt.service.ts:49-56`); vacío: `Credenciales AdminOLT no configuradas` |
| Autenticación hacia la plataforma | cabecera `X-Token: <api>` a `${dominio}/api/...` (p. ej. `.../api/system/get_olts`) (`smart-olt.service.ts:273-282`) | `Authorization: Token <api>` a `https://<subdominio>[.adminolt.com]/api` (`admin-olt.service.ts:60-67`); además WebSocket `wss://<host>/ws/<facility>` para consultas lentas (`:188-274`) |
| Qué ve el usuario sin credenciales | banner "Credenciales de SmartOLT no configuradas — Ingresa el dominio y la API Key en la pestaña **API** para usar este módulo." (`FE:S/IndexPage.vue:108-125`) | banner "Credenciales de AdminOLT no configuradas — Ingresa el subdominio y la API Key en la pestaña **API**…" (`FE:A/IndexPage.vue:90-106`) |

> ⚠ El manual actual (`docs/guia/olts-ajustes.mdx`, `adminolt.mdx`) dice que las credenciales se cargan en **Ajustes → OLTs**. En el código **no existen** campos de dominio/API Key en Ajustes → OLTs (`FE:AJ/smartOLT/IndexPage.vue` solo contiene TR-069, tipo de ONU, Mgmt IP, validación y reinicio automático). Las credenciales se editan únicamente en la pestaña **API** de cada módulo. Ver Hallazgos H-01.

**Diferencias para el usuario (✅).**

| Aspecto | SmartOLT | AdminOLT |
|---|---|---|
| Permisos asignables a un rol | 7 (`smartOLT.index`, `smartOLT_unconfigured.index`, `smartOLT.authorize`, `smartOLT.vincular_cliente`, `smartOLT.habilitar_desabilitar_onu`, `smartOLT.reiniciar_onu`, `smartOLT.eliminar_onu`) | **Ninguno** en el catálogo de roles: solo SUPER-ADMINISTRADOR puede abrir `/adminOLT/**` (ver OLT-032) |
| Pestañas del módulo | ONUS CONFIGURADOS · VLANS · ZONAS · PROFILES · API | ONUS CONFIGURADOS · OLTs · ZONAS · PROFILES · NAPs · MAPS · API |
| Autorizar ONU | Formulario con zona, tipo, VLAN, perfiles, modo, nombre, dirección + Mgmt IP/TR-069 opcional | Formulario con chasis, tipo, zona, NAP, CVLAN/SVLAN, velocidades, modo (valores numéricos) |
| Qué se escribe en la plataforma al vincular un cliente | **nombre del cliente** (`name`) e **IP del servicio** (`address_or_comment`) en la ONU | **nada**: solo se actualiza el servicio en ISPMAX |
| Vista de ONU | `/smartOLT/onu-view/:sn` (gráficos de tráfico/señal, running config, resync, TR-069…) | `/adminOLT/onu/:sn` (detalle + herramientas + señal 1310/1490 por WebSocket + CATV + WiFi) |
| Gestión de catálogos | Zonas y VLANs: **crear**; perfiles: solo ver | Zonas: **crear/editar/eliminar**; VLANs, perfiles, NAPs, mapas: solo ver |
| Acciones masivas | Sí (perfil de velocidad y habilitar/deshabilitar por criterio) | No |
| Reinicio programado | Sí (modo `vinculados` / `vinculados_y_no_vinculados`) | Sí (mismo modo; por defecto `vinculados`) |
| Registro de acciones (Logs) | `entityType:'ServicioCliente'` (con `entityId` del servicio vinculado o `null`) para `REINICIAR_ONU`, `DESABILITAR_ONU`, `HABILITAR_ONU`, `ELIMINAR_ONU`, `RESYNC_CONFIG_ONU`, `RESTORE_FACTORY_ONU`; `entityType:'SmartOLT'` para TR-069/Mgmt IP/modo | `entityType:'AdminOLT'`, acciones en minúsculas (`habilitar-onu`, `reiniciar-onu`…); **solo si hay usuario** (los cortes automáticos no dejan log) |

**Cuándo usar cada uno (✅/❓).** El código no decide por el usuario: usa la plataforma indicada en `onu_source` del servicio. Si `onu_source` está vacío pero hay `sn`, asume **SmartOLT** (`BE:common/utils/onu-corte.utils.ts:24-28`). Una ONU "es de AdminOLT" solo si se vinculó desde AdminOLT/ficha con `onu_source:'adminOLT'`. ❓ Cuál usa cada ISP es decisión comercial, no deducible del código.

---

## OLT-001 · SmartOLT — Panel principal

- **Ruta UI / name:** `/smartOLT` · `smartOLT.index` · menú **Gestion de Red → SmartOLT** (`FE:layouts/SideBarMenu.vue:213-222`, visible con `validarPermisos('smartOLT.index')`) ✅
- **Archivos:** FE: `FE:S/IndexPage.vue`, `FE:S/composables/smartOLTComposable.js`, `FE:S/components/CardsInfoSmartOLT/CardInfo.vue`, `.../hooks/useCards.js` · BE: `BE:smart-olt/smart-olt.controller.ts:36` (`GET olt/listado`), `:318` (`GET olts-uptime-temp`), `:130` (`GET no-configuradas/:olt_id`)
- **Para qué sirve:** elegir una de las OLT de la cuenta SmartOLT, ver su *uptime* y temperatura, un resumen de estados y trabajar sobre sus ONUs mediante pestañas.
- **Acceso:** permiso `smartOLT.index` (menú y `router/auth-guard.ts`). La tarjeta "ESPERANDO AUTORIZACIÓN" solo se pinta con `smartOLT_unconfigured.index` (`FE:S/components/CardsInfoSmartOLT/CardInfo.vue:54`). SUPER-ADMINISTRADOR pasa todo.
- **Secciones / pestañas:** `ONUS CONFIGURADOS` (→OLT-003) · `VLANS` (→OLT-012) · `ZONAS` (→OLT-013) · `PROFILES` (→OLT-011) · `API` (→OLT-002) (`FE:S/IndexPage.vue:209-213`).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Select "Selecciona una OLT" | Cambia la OLT activa; recarga ONUs, contador y uptime | `smartOLT.index` | `GET /smart-olt/olt/listado` → SmartOLT `/api/system/get_olts` | Al cargar selecciona automáticamente la primera OLT (`:25-27`) |
  | Banner "Credenciales de SmartOLT no configuradas" / botón "Ir a API" | Salta a la pestaña API | — | — | Solo si `credencialesCargadas && !hasCredentials` |
  | Tarjeta "ESPERANDO AUTORIZACIÓN" | Va a `/smartOLT/unconfigured/:olt_id` | `smartOLT_unconfigured.index` | — | Muestra N; el pie dice `GPON: N` (mismo número, no separa EPON) |
  | Tarjetas ONLINE / TOTAL OFFLINE / LOW SIGNALS | Solo informativas | — | — | Se calculan sobre la lista de ONUs ya cargada (ver abajo) |

- **Campos de formulario:** solo el select de OLT (`option-label="name"`).
- **Filtros y columnas:** n/a. **Tarjetas** (`FE:S/components/CardsInfoSmartOLT/CardInfo.vue:21-37, 53-111`):
  - `UPTIME` y `TEMPERATURA`: de `GET /smart-olt/olts-uptime-temp` (SmartOLT `/api/olt/get_olts_uptime_and_env_temperature`), buscando la OLT por `olt_id`; campos `uptime` y `env_temp`; sin dato muestra `-`. Color del ícono de temperatura: `< 30` verde, `< 40` naranja, resto rojo (`FE:S/IndexPage.vue:56-62`).
  - `ONLINE` = ONUs con `status === 'Online'`; pie `Total Autorizados: <total de la lista>`.
  - `TOTAL OFFLINE` = Offline + Power fail + Los; pie `PwrFail: x   LoS: y   N/A: z` (**N/A = Offline**).
  - `LOW SIGNALS` = Warning (con `status !== 'Power fail'`) + Critical; pie `Warning: x   Critical: y`.
- **Estados posibles:** ver OLT-033.
- **Reglas de negocio (backend):**
  - Todas las llamadas usan el primer registro de `smartOLT`; sin él → `400 No hay credenciales SmartOLT configuradas` (`BE:smart-olt/smart-olt.service.ts:178-186`).
  - `olt/listado` y `olts-uptime-temp` **no usan caché**; `no-configuradas/:olt_id` tampoco (`:273-286`, `:1801-1819`, `:773-793`).
- **Efectos secundarios externos:** solo lecturas a SmartOLT; ninguna escritura.
- **Mensajes de error/éxito (texto exacto):** `Error al obtener uptime y temperatura de las OLT` (`FE:S/components/Onus/composables/useOnus.js:241`); errores de `get_olts` se muestran con el mensaje que devuelve el backend (`data.message || data.error`) salvo si la ruta actual es `cliente.edit` (silenciado) (`FE:S/composables/smartOLTComposable.js:13,22-27`).
- **Relaciones con otros módulos:** `ONUS CONFIGURADOS` cruza con clientes (`GET /customers`); `Ajustes → OLTs` (OLT-031) configura valores por defecto del formulario de autorización.
- **Casos límite y advertencias:** (1) Si hay varias OLT, el panel muestra solo una a la vez; los contadores son de la OLT elegida. (2) Los contadores salen de la lista cacheada hasta 5 min (OLT-034) — "Refrescar" fuerza lectura. (3) `Los` vs `LOS`: la tarjeta cuenta `status === 'Los'` y el filtro de lista acepta también `'LOS'` (`CardInfo.vue:25`, `FE:S/components/Onus/IndexPageOnus.vue:98-101`): ❓ el literal real devuelto por SmartOLT.
- **Preguntas probables de usuarios:** ¿Por qué no veo la pestaña/menú SmartOLT? (permiso `smartOLT.index`). ¿Qué significa "N/A" en TOTAL OFFLINE? (ONUs *Offline*). ¿Por qué el número de "Esperando autorización" no coincide con SmartOLT? (cuenta solo la OLT elegida; SmartOLT puede tardar en detectar). ¿Qué pasa si cambio de OLT? (se recarga la lista, la caché es por OLT). ¿Por qué sale "Credenciales de SmartOLT no configuradas"? (dominio o API Key vacíos en la pestaña API). ¿Qué es el UPTIME? (tiempo encendida la OLT según SmartOLT). ¿Por qué la temperatura es "-"? (SmartOLT no la reporta o falló la consulta).
- **Pendiente de validar en UI:** ❓ Formato exacto de `uptime`/`env_temp` devuelto por SmartOLT. ❓ Si en cuentas con una sola OLT el selector se oculta (no se oculta en código).

---

## OLT-002 · SmartOLT — Pestaña API (credenciales)

- **Ruta UI / name:** `/smartOLT` → pestaña `API` ✅
- **Archivos:** FE: `FE:S/components/Api/FormApi.vue`, `FE:S/components/Api/composables/useApi.js` · BE: `BE:smart-olt/smart-olt.controller.ts:30` (`GET /smart-olt`), `:109` (`PATCH /smart-olt/:id`), `BE:smart-olt/dto/create-smart-olt.dto.ts`, `BE:smart-olt/dto/update-smart-olt.dto.ts`
- **Para qué sirve:** guardar el dominio de la cuenta SmartOLT y la API Key con la que ISPMAX consulta y comanda la plataforma.
- **Acceso:** cualquiera que pueda abrir `/smartOLT` (`smartOLT.index`); **no hay permiso propio**. En backend cualquier usuario autenticado puede leer y modificar (OLT-032).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | `Guardar` | Guarda dominio y API Key | ninguno | `PATCH /smart-olt/:id` (body = formulario completo) | Deshabilitado si dominio o API Key están vacíos (`FormApi.vue:9-11,64`). Al terminar emite `api-updated` y el panel recarga todo (`IndexPage.vue:30-51`) |
  | `Limpiar` | Borra dominio y API Key (los deja en `''`) | ninguno | `PATCH /smart-olt/:id` `{dominio:'', api:''}` | Deshabilitado si ambos vacíos; pide confirmación (ver abajo) |

- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | (sin label) placeholder `https://mi-dominio.smartolt.com` | texto | sí para habilitar Guardar | solo "no vacío"; **no se valida formato de URL** | El backend concatena `${dominio}/api/...`, por lo que debe incluir `https://` y no terminar en `/` ❓ |
  | (sin label) placeholder `Ingrese su API KEY` | texto (visible, no enmascarado) | sí | solo "no vacío" | Se envía en cabecera `X-Token` |
  | `activarOnu` | — | — | existe en entidad/DTO; **no hay campo en pantalla ni lógica que lo lea** | Código muerto (H-07) |

- **Estados posibles:** `hasCredentials` = dominio y API Key no vacíos (`useApi.js:15-17`). Con valores por defecto de entidad (`https://tudominio.com` / `TuApiKey`, `BE:smart-olt/entities/smart-olt.entity.ts:13-17`) **sí cuenta como credenciales** ❓.
- **Reglas de negocio (backend):** `update` hace `repository.update(id, dto)` sin validar conexión ni formato (`smart-olt.service.ts:269-271`); `UpdateSmartOltDto` = parcial de `{dominio, api, activarOnu}` con `@IsString/@IsBoolean` opcionales. No existe endpoint para **crear** el registro: el UI asume que ya hay uno (`useApi.js:58-61`); si no existe `PATCH /smart-olt/undefined` fallaría ❓ (no se encontró semilla de la tabla `smartOLT` en migraciones).
- **Efectos secundarios externos:** ninguno al guardar (no se prueba la conexión).
- **Mensajes de error/éxito (texto exacto):** éxito `Api actualizado exitosamente`; error `Error al actualizar SmartOLT`; limpiar: `Credenciales limpiadas exitosamente`, sin registro `No hay credenciales para limpiar`, error `Error al limpiar credenciales`; carga: `Error al obtener SmartOLT`. Diálogo: título `Limpiar credenciales`, mensaje `¿Estás seguro de que deseas borrar las credenciales de SmartOLT? El módulo dejará de funcionar hasta que las configures nuevamente.`, botones `Sí, borrar` / `Cancelar` (`FormApi.vue:27-31`).
- **Relaciones con otros módulos:** de aquí depende todo el módulo, los cortes por ONU (OLT-027), el reinicio programado (OLT-028) y la validación (OLT-030).
- **Casos límite y advertencias:** `GET /smart-olt` devuelve el registro **con la API Key en claro** a cualquier usuario autenticado (H-02). Cambiar de cuenta SmartOLT no migra los `sn` ya vinculados.
- **Preguntas probables de usuarios:** ¿Dónde pongo la API Key de SmartOLT? (esta pestaña, no Ajustes). ¿Cómo sé si la conexión funciona? (no hay botón "probar"; abrir la lista de ONUs). ¿Qué pasa si limpio las credenciales? (el módulo y los cortes por ONU dejan de funcionar). ¿Por qué el botón Guardar está gris? (falta dominio o API Key). ¿Puedo tener dos cuentas SmartOLT? (no: se usa solo el primer registro).
- **Pendiente de validar en UI:** ❓ formato esperado exacto del dominio (con/sin `https://`). ❓ Qué ocurre si el registro `smartOLT` no existe en una instalación nueva.

---

## OLT-003 · SmartOLT — Listado "ONUS CONFIGURADOS"

- **Ruta UI / name:** `/smartOLT` → pestaña `ONUS CONFIGURADOS` ✅
- **Archivos:** FE: `FE:S/components/Onus/IndexPageOnus.vue`, `.../composables/useOnus.js`, `FE:S/BaseTable.vue`, `.../components/{OnuDetailModal,ReiniciarOnuModal,Desabilitar_HabilitarOnuModal,DeleteOnuModal,VincularClienteOnu,SelectChipRight}.vue` · BE: `BE:smart-olt/smart-olt.controller.ts:160` (`GET listado-onus/:olt_id`), `smart-olt.service.ts:884-970`
- **Para qué sirve:** ver todas las ONUs ya autorizadas de la OLT elegida con estado, señal y si están vinculadas a un cliente ISPMAX; punto de entrada para acciones.
- **Acceso:** `smartOLT.index`; acciones con permisos propios (abajo).
- **Secciones / pestañas:** barra de filtros + tabla + modales.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Icono refrescar (tooltip `Refrescar desde SmartOLT`) | Fuerza lectura sin caché | `smartOLT.index` | `GET /smart-olt/listado-onus/:olt?refresh=true` | Cooldown de 8 s tras pulsarlo (`IndexPageOnus.vue:222-224`) |
  | `Cambios masivos` (tooltip `Acciones masivas sobre las ONUs`) | Abre selector: "Cambiar perfil de velocidad" / "Habilitar / Deshabilitar" | ninguno | ver OLT-010 | — |
  | Icono persona (verde `how_to_reg` si `ipv4`; rojo `person_off` si no) | Abre modal "Asignar cliente a onu." | `smartOLT.vincular_cliente` (**se deshabilita**, no se oculta) | ver OLT-014 | tooltip `Ver detalles` / `Desvinculado` |
  | Botón dividido `visibility` | Abre "Resumen de datos" (get_onu_full_status_info) | `smartOLT.index` | `GET /smart-olt/info-completa-onu/:id` | Muestra Estado Óptico, Detalles, LAN, Historial y MACs |
  | Menú ⚙ → `Reiniciar ONU` | ver OLT-007 | `smartOLT.reiniciar_onu` | `POST /smart-olt/reiniciar-onu/:id` | oculta si no hay permiso |
  | Menú ⚙ → `Habilitar ONU` / `Deshabilitar ONU` (según `status === 'Offline'`) | ver OLT-007 | `smartOLT.habilitar_desabilitar_onu` | `POST .../habilitar-onu/:id` o `.../desabilitar-onu/:id` | oculta si no hay permiso |
  | Menú ⚙ → `Eliminar ONU` | ver OLT-007 | `smartOLT.eliminar_onu` | `POST /smart-olt/eliminar-onu/:id` | oculta si no hay permiso |
  | Nombre (enlace) | Abre la vista de ONU (OLT-006) con `?cliente_id=` | `smartOLT.index` | — | nombres largos se recortan a 240 px |

- **Campos de formulario / filtros:**

  | Etiqueta | Tipo | Valores | Notas |
  |---|---|---|---|
  | `Buscar...` | texto (debounce 300 ms) | busca en **todos** los valores de la fila (`Object.values`) | incluye campos anidados convertidos a texto |
  | `Board`, `Port`, `Zone`, `VLAN`, `ONU Type`, `PON Type` | multi-select con contador | opciones derivadas del `summary` del backend y recalculadas según el resto de filtros | `VLAN` = `service_ports[0].vlan` |
  | `Estado:` (botones) | `Online`, `Offline`, `Power Fail`, `LOS` | ícono; vuelve a pulsar para quitar | — |
  | `Señal:` | `Very good`, `Warning`, `Critical` | `Warning` excluye `Power fail` | — |
  | `Vinculación:` | `Vinculadas` / `No vinculadas` | por `row.vinculado` | calculado en el front |

- **Columnas de tabla** (`IndexPageOnus.vue:167-204`): `Estado` (ícono), `Nombre`, `SN`, `OLT`, `BOARD`, `PORT`, `ONU Rx / OLT Rx` (`signal_1490 / signal_1310`, `-` si falta), `IPV4` (`Sin asignar` si no hay; **es la IPv4 del servicio en ISPMAX**, no de la ONU), `Señal` (ícono verde/naranja/rojo), `Acciones`. Paginación persistida en `estadosStore.paginationOnus` (por defecto página 1, 10 filas).
- **Estados posibles:** OLT-033.
- **Reglas de negocio (backend):**
  - Caché por OLT: fresca 5 min (`ONUS_FRESH_MS`), conserva 24 h como respaldo; si SmartOLT falla (403/timeout) devuelve el último dato con `cache.stale=true` (`smart-olt.service.ts:59-62, 889-969`).
  - Respuesta añade `summary` con conteos por board, port, zone, VLAN, PON type y ONU type (`:924-947`) y **invierte** el orden de `onus` (`:907`).
  - "Vinculada" se calcula en el **frontend**: baja `GET /customers?limit=999999&estado=Todos&obtenerVinculados=si` (servicios con `sn` no nulo) y marca `vinculado=true` si `servicio_id[0].sn === unique_external_id` (`useOnus.js:76-140`). Solo considera el **primer** servicio de cada factura.
- **Efectos secundarios externos:** lectura `GET /api/onu/get_all_onus_details?olt_id=` en SmartOLT.
- **Mensajes de error/éxito (texto exacto):** banner `Mostrando datos en caché (SmartOLT no respondió). Usa "Refrescar" en unos segundos para reintentar.`; vacío `No hay ONUs para mostrar` (`FE:S/BaseTable.vue:74`); error `Error al obtener ONUs: <detalle>`.
- **Relaciones con otros módulos:** Clientes (vinculación), Logs, Cortes (OLT-027).
- **Casos límite y advertencias:** la carga completa de clientes (999 999 filas) puede ser lenta en bases grandes ❓. Si una ONU de AdminOLT comparte SN, se mostraría "vinculada" en SmartOLT (no se filtra por `onu_source`). El filtro `Estado → Power Fail` compara en minúsculas con `Power fail`.
- **Preguntas probables de usuarios:** ¿Por qué un cliente figura "Desvinculado" si ya tiene ONU? (su servicio no tiene `sn` guardado o es otro servicio). ¿Por qué el estado no cambia al instante tras reiniciar? (caché + espera; usar Refrescar). ¿Por qué no veo "Eliminar ONU"? (permiso `smartOLT.eliminar_onu`). ¿Qué es "Sin asignar" en IPV4? (ONU sin servicio vinculado). ¿Qué significa el banner naranja de caché? (SmartOLT no respondió; se muestran datos viejos).
- **Pendiente de validar en UI:** ❓ valor literal de `status` para pérdida de señal (`LOS`/`Los`). ❓ tiempo de carga con miles de clientes.

---

## OLT-004 · SmartOLT — ONUs no configuradas (esperando autorización)

- **Ruta UI / name:** `/smartOLT/unconfigured/:olt_id` · `smartOLT_unconfigured.index` · se llega desde la tarjeta "ESPERANDO AUTORIZACIÓN" (con `olt_id` de la OLT elegida) y el botón `Cancelar` del formulario de autorizar vuelve a `/smartOLT/unconfigured/all` ✅
- **Archivos:** FE: `FE:S/components/Unconfigured/IndexPage.vue`, `.../hooks/useUnconfigured.js` · BE: `smart-olt.controller.ts:98` (`GET all-onus-no-configuradas`), `:180` (`GET onus-no-configuradas/:olt_id`)
- **Para qué sirve:** listar las ONUs que SmartOLT detectó pero que todavía no están autorizadas, por OLT o de todas las OLT.
- **Acceso:** guard exige el permiso `smartOLT_unconfigured.index` (nombre de la ruta); el botón **Authorize** exige `smartOLT.authorize` (`IndexPage.vue:80`).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Select `Selecciona OLT` (opción `Todo` + OLTs) | Cambia la URL a `/smartOLT/unconfigured/<id|all>` y recarga | — | `GET /smart-olt/onus-no-configuradas/:olt` o `.../all-onus-no-configuradas` | `Todo` agrupa por OLT con un título por nombre |
  | Icono refrescar (tooltip `Actualizar listado`) | Reconsulta | — | idem | — |
  | `Authorize` (fila) | Ir al formulario OLT-005 con `olt_name, pon_type, board, port, unique_external_id (=SN), onu_type` | `smartOLT.authorize` | — | solo aparece si SmartOLT incluye `'authorize'` en `actions` de la fila |
  | Chip `Disabled` / `Move Here` | Informativos (sin acción) | — | — | vienen de `actions` = `view` / `move_here` |
  | `Regresar` | vuelve a `/smartOLT` | — | — | — |

- **Filtros y columnas:** `PON Type`, `Board`, `Port`, `PON Description`, `SN`, `Type`, `Acción`; ordenables salvo acción. Paginación 10.
- **Estados posibles:** los de la fila en SmartOLT (`actions`).
- **Reglas de negocio (backend):** `all-onus-no-configuradas` → SmartOLT `/api/onu/unconfigured_onus`; por OLT → `/api/onu/unconfigured_onus_for_olt/{id}` (`smart-olt.service.ts:333-347, 1021-1041`). Los errores en el front se tragan (catch vacío): la tabla queda vacía sin aviso.
- **Efectos secundarios externos:** solo lectura.
- **Mensajes de error/éxito:** ninguno propio (los errores no se notifican).
- **Relaciones:** alimenta OLT-005; tras eliminar una ONU el front espera 8 s y refresca este contador (`DeleteOnuModal.vue:73-74`).
- **Casos límite:** (1) No distingue GPON/EPON en el contador. (2) Si falla la API la pantalla muestra "sin datos" sin explicar. (3) El `olt_name` se busca en la lista de OLT cargada; si no está, muestra `OLT <id>`.
- **Preguntas probables:** ¿Por qué no aparece mi ONU nueva? (no la ha detectado SmartOLT/OLT; revisar puerto/fibra; pulsar actualizar). ¿Por qué no veo el botón Authorize? (permiso `smartOLT.authorize` o SmartOLT no lo ofrece para esa fila). ¿Qué significa "Move Here"? (SmartOLT indica que la ONU está registrada en otra OLT/puerto; el chip no actúa). ¿Qué es "Disabled"? (acción `view` de SmartOLT, no operable).
- **Pendiente de validar en UI:** ❓ significado exacto de `view`/`move_here` según SmartOLT (no documentado en código).

---

## OLT-005 · SmartOLT — Autorizar ONU

- **Ruta UI / name:** `/smartOLT/authorize/:olt_id` · `smartOLT.authorize` · desde OLT-004 o desde la ficha del servicio (`query.servicio_id`) ✅
- **Archivos:** FE: `FE:S/components/Authorize/IndexPage.vue`, `.../composables/useAuthorize.js`, `.../composables/useTr069Config.js`, `.../components/Tr069ConfigSection.vue`, `.../components/VincularClienteOnu.vue` · BE: `smart-olt.controller.ts:104` (`POST autorizar-onu`), `:210` (`GET pon-tipos/:pon`), `:154`, `BE:smart-olt/dto/authorize-onu.dto.ts`, `BE:smart-olt/helpers/texto-seguro.ts`, `smart-olt.service.ts:349-373`
- **Para qué sirve:** dar de alta (autorizar) una ONU detectada, con su tipo, zona, VLAN, perfiles de velocidad y modo; opcionalmente configurar IP de gestión/TR-069 y vincularla a un cliente.
- **Acceso:** guard `smartOLT.authorize`; botón `Autorizar` con `validarPermisos('smartOLT.authorize')` (`IndexPage.vue:479`); bloque "Vincular ONU a cliente ISP-MAX (opcional)" con `smartOLT.vincular_cliente` (`:464`).
- **Secciones / pestañas:** `Contexto OLT` · `Servicio` · `Identificación del cliente` · `Configuración avanzada (opcional)` (Mgmt IP, TR-069) · `Vincular ONU a cliente ISP-MAX (opcional)`.
- **Paso a paso (✅):**
  1. En OLT-004 pulsar `Authorize` → se abre el formulario con OLT, Board, Port y SN ya cargados (deshabilitados).
  2. El formulario precarga zona (la primera de la lista que entrega el backend tras invertir el orden recibido con `reverse()`, `smart-olt.service.ts:299-300`; ❓ presumiblemente la más reciente), tipo de ONU (default de Ajustes → detectado → primero del catálogo), VLAN (la primera de la OLT), perfiles `1G`/`1G` y modo `Bridging` (`IndexPage.vue:74-115`, `useAuthorize.js:4-13`).
  3. Completar nombre del cliente, dirección/comentario y, si aplica, configuración avanzada y cliente a vincular.
  4. `Autorizar` → diálogo `¿Autorizar esta ONU?` con resumen (ONU, Tipo, Zona, "VLAN servicio", Modo y configuración avanzada); botones `Sí, autorizar` / `Cancelar`.
  5. Spinner `Autorizando ONU... Por favor espera`; `POST /smart-olt/autorizar-onu`.
  6. Si hay SN: espera 2,5 s y aplica **Mgmt IP → TR-069** (cada paso independiente; TR-069 reintenta hasta 2 veces cada 2,5 s si SmartOLT responde 400) (`useTr069Config.js:154-283`).
  7. Si se eligió un servicio: `POST /smart-olt/vincular-cliente` (OLT-014).
  8. Toast `ONU autorizada correctamente.` y vuelve atrás (si vino con `servicio_id`) o a `/smartOLT`.
- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | `OLT`, `Board`, `Port`, `Serial Number (SN)` | texto deshabilitado | — | vienen de la query | no editables |
  | `GPON / EPON` | radio deshabilitado | — | `pon_type` | determina el catálogo de tipos |
  | `Zona` | select buscable | **Sí** (`Requerido`) | nombres de `GET /smart-olt/zonas` | se envía el **nombre** (`zone`); por defecto la primera de la lista |
  | `Tipo de ONU` | select buscable | **Sí** | `GET /smart-olt/pon-tipos/:pon` | se envía el nombre (`onu_type`); default de Ajustes `smartoltOnuTypeDefault` si existe en catálogo |
  | `VLAN` | select | **Sí** | VLANs de la OLT (`${vlan} - ${description}`) | se envía el número |
  | `Velocidad de descarga` | select | **Sí** | perfiles `direction==='download'` de `GET /smart-olt/perfiles-velocidad` | valor inicial literal `1G` (`useAuthorize.js:8-9`); si SmartOLT no tiene un perfil con ese nombre el valor se envía igualmente ❓ |
  | `Velocidad de subida` | select | **Sí** | perfiles `upload` | idem |
  | Radios `Routing` / `Bridging` | radio | sí (default `Bridging`) | `onu_mode` | — |
  | `Nombre del cliente` | texto, máx. 60, contador | **Sí** | — | se **sanea** en backend (ver reglas) |
  | `ONU external ID` | texto | **Sí** | por defecto = SN (sincronizado por `watch`) | se envía como `onu_external_id`; ❓ no editarlo (el resto del sistema usa el SN) |
  | `Dirección o comentario` | textarea, máx. 140 | No | — | **el backend la corta a 60** al sanearla |

- **Qué se envía a SmartOLT (✅):** `POST ${dominio}/api/onu/authorize_onu` (form-urlencoded) con los campos del DTO que no sean nulos: `olt_id, pon_type, board, port, sn, onu_type, onu_mode, vlan, zone, name, address_or_comment, onu_external_id, upload_speed_profile_name, download_speed_profile_name` (`smart-olt.service.ts:349-373`). El resto de claves del formulario (`olt_name`, `enableTr069`, `servicio_id`…) las descarta el `ValidationPipe({whitelist:true})` (`BE:main.ts:38-46`).
- **Reglas de negocio (backend):**
  - DTO: `olt_id, pon_type, sn, onu_type, onu_mode, vlan, zone, name` obligatorios y de tipo string; `board, port, address_or_comment, onu_external_id` y perfiles opcionales (`BE:smart-olt/dto/authorize-onu.dto.ts:3-51`).
  - Saneado de `name` y `address_or_comment`: quita tildes, sustituye todo carácter fuera de `A-Z a-z 0-9 espacio . _ -` por espacio, colapsa espacios, recorta a 60 y devuelve `-` si queda vacío (`texto-seguro.ts:5-24`).
  - Tras autorizar invalida la caché de ONUs de esa OLT (`:367`).
- **Efectos secundarios externos:** SmartOLT autoriza la ONU en la OLT (la OLT empieza a prestar servicio); luego Mgmt IP / TR-069 si se pidieron; luego (opcional) nombre/IP en la ONU y `sn/smartOLT/onu_source` en el servicio.
- **Mensajes de error/éxito (texto exacto):** `ONU autorizada correctamente.` · `ONU autorizada, pero fallaron pasos: <paso>: <error> • ...` · error: `e.response.data.message || e.message || 'Error al autorizar ONU'` (puede ser el objeto/ texto crudo de SmartOLT).
- **Relaciones con otros módulos:** servicios del cliente (vinculación), Ajustes → OLTs (valores por defecto), Logs (no hay log de la autorización en backend ❓).
- **Casos límite y advertencias:** (1) El formulario usa un `form` **compartido a nivel de módulo** (`useAuthorize.js:4-13`): `name`, `address_or_comment`, `zone`, `vlan`… pueden quedar del alta anterior; solo se limpia la parte TR-069 al salir (`IndexPage.vue:68-72`) ❓ verificar en UI. (2) `onu_mode` se manda dentro de `authorize_onu`; el toggle "Modo ONU" de la configuración avanzada está **forzado a apagado** aquí (`:56-60`). (3) La vinculación usa `sn = unique_external_id`, no el campo editable `ONU external ID` (`VincularClienteOnu.vue:61`). (4) Si falla un paso avanzado, la ONU **queda autorizada** igualmente. (5) No se registra ningún log del backend para la autorización.
- **Preguntas probables de usuarios:** ¿Qué pongo en "Nombre del cliente"? (hasta 60 caracteres; tildes y símbolos se eliminan). ¿Por qué mi dirección larga queda cortada? (se limita a 60). ¿Qué perfil de velocidad elijo? (el de la velocidad contratada; no cambia el plan del cliente). ¿Bridging o Routing? (Bridging = la ONU pasa tráfico; Routing = la ONU enruta; por defecto Bridging). ¿Puedo autorizar sin vincular al cliente? (sí, es opcional y se puede vincular después). ¿Por qué falló TR-069 pero la ONU quedó autorizada? (pasos independientes; reintentar desde la vista de ONU). ¿Por qué no aparece el botón Autorizar? (permiso `smartOLT.authorize`).
- **Pendiente de validar en UI:** ❓ lista exacta de tipos de ONU y perfiles que devuelve SmartOLT; ❓ si el form compartido arrastra datos entre altas; ❓ comportamiento si el perfil por defecto `1G` no existe.

---

## OLT-006 · SmartOLT — Vista de una ONU

- **Ruta UI / name:** `/smartOLT/onu-view/:unique_external_id` · `smartOLT_onu-view.index` (el guard la permite con `smartOLT.index`, `router/auth-guard.ts:86`) · se llega desde el nombre en el listado, desde la ficha del servicio (SN) o desde el mapa NAP ✅
- **Archivos:** FE: `FE:S/components/OnuView/IndexPage.vue`, `.../composables/useOnuView.js`, `.../composables/useIntervalo.js`, `.../components/{GraphSection,TablesSection,UbicacionOnuModal,RunningConfigModal,ResyncOnuModal,RestoreFactoryOnuModal,Tr069MgmtConfigModal}.vue` · BE: `smart-olt.controller.ts:154` (`detalle-onu`), `:244` (`obtener-senal-onu`), `:250/:262/:274` (imágenes y gráficos)
- **Para qué sirve:** ver la ficha técnica de una ONU, su estado y señal en vivo, tráfico/señal históricos y ejecutar acciones de mantenimiento (OLT-007/008/009).
- **Acceso:** `smartOLT.index`. **Ningún botón de esta vista comprueba permisos** (H-03).
- **Secciones / pestañas:**
  - Datos (columna izq.): `OLT`, `Board`, `Port`, `ONU`, `SN`, `ONU type`, `Zone`, `ODB` (`None` si vacío), `Contact` (`None`), `Name` (enlace que abre el modal de ubicación), `Address or comment`.
  - Estado (columna der.): `Status` (ícono + `<estado> (<hace cuánto>)`), `ONU/OLT Rx signal` (valor + ícono por nivel), `Attached VLANs`, `ONU mode`, `TR069` (chip con el perfil o `Inactive`; solo si hay perfil por defecto en Ajustes, la ONU tiene perfil o TR-069 activo), `Mgmt IP` (modo + IP), `Authorization date`, `ONU external ID`. Imagen del modelo (`onu_type_id`).
  - `Get status` (resumen técnico), `Running Config`, `Ver cliente isp-max` (solo si la URL trae `cliente_id`).
  - `Gráficas de tráfico` y `Gráficas de señal`: carrusel `Por hora`, `Diario`, `Semanal`, `Mensual`, `Anual` (clic = zoom).
  - Tablas `Speed profiles` (`Service-port ID`, `User-VLAN`, `Download`, `Upload`; botón `Editar velocidad`), `Ethernet ports` (`Port`, `Admin state`, `Mode` + VLAN, `DHCP`) y `CATV`.
- **Botones y acciones:** ver OLT-007, OLT-008, OLT-009.
- **Estados posibles:** `Online` (verde), `Offline` (gris), `Power fail` (gris, rayo), `LOS` (rojo, enlace roto); desconocido = ayuda gris (`IndexPage.vue:212-222`). Señal: `Very good` verde, `Warning` naranja, `Critical` rojo.
- **Reglas de negocio (backend):**
  - `detalle-onu/:id` → SmartOLT `/api/onu/get_onu_details/{id}`; `obtener-senal-onu/:id` → `get_onu_signal` + `get_onu_status` en paralelo y mezcla ambos JSON (`smart-olt.service.ts:861-881, 1550-1577`).
  - La señal se **vuelve a pedir cada 15 s** mientras la pestaña del navegador está visible; se detiene al ocultarse o al salir (`useIntervalo.js`, `IndexPage.vue:205-210`). Cada refresco son 2 llamadas a SmartOLT (OLT-034).
  - Imágenes: `GET /smart-olt/onu-type-image/:id`, `onu-traffic-graph/:id/:tipo`, `onu-signal-graph/:id/:tipo` devuelven PNG; el front los carga en `<img src>` con el JWT **en la URL** (`?token=`), porque no pasan por axios (`useOnuView.js:78-103`; `BE:auth/strategies/jwt.strategy.ts:25-28`).
- **Efectos secundarios externos:** lecturas a SmartOLT; las acciones modifican la ONU.
- **Mensajes de error/éxito (texto exacto):** si la ONU no existe: título `No se encontró la ONU` + `La ONU con SN "<sn>" no existe en la OLT. Verifica el número de serie (SN).`; otros: `No se pudo obtener la información de la ONU` / `No se pudo obtener la información de la ONU. Verifica el número de serie (SN).`; señal: `Error al obtener la señal de la ONU`.
- **Relaciones con otros módulos:** `cliente.edit?view=servicios` (Ver cliente isp-max); mapa NAP (popup → SN); ficha del servicio (WiFi, MAC desde ONU).
- **Casos límite y advertencias:** (1) "Ver cliente isp-max" **no aparece** si se entra por URL directa sin `cliente_id`. (2) `DeleteOnuModal` recibe `onuDetails.servicio_id`, que la API de detalle no trae: al eliminar desde esta vista **no se limpia** el `sn` del servicio (H-06). (3) `refreshOnuDataAfterModal` se invoca justo al **abrir** el modal de ubicación, no tras guardar (`:300-308`), así que el nombre mostrado puede quedar desactualizado hasta recargar.
- **Preguntas probables:** ¿Qué significa Power fail? (la ONU perdió energía eléctrica del cliente). ¿Qué es LOS? (pérdida de señal óptica: fibra cortada/desconectada). ¿Por qué la señal cambia sola? (refresca cada 15 s). ¿Qué es "ONU/OLT Rx signal"? (potencia recibida por la ONU / por la OLT en dBm, según SmartOLT). ¿Por qué no veo gráficos? (la imagen la sirve SmartOLT; sin datos aparece vacío). ¿Cómo llego a la ficha del cliente? (botón "Ver cliente isp-max", solo desde el listado).
- **Pendiente de validar en UI:** ❓ umbrales de "Very good/Warning/Critical" (los decide SmartOLT, no hay valores en código). ❓ formato de `last_status_change`.

---

## OLT-007 · SmartOLT — Reiniciar, Habilitar/Deshabilitar y Eliminar una ONU

- **Ruta UI / name:** desde el listado (`/smartOLT` → menú ⚙ de cada fila) y desde la vista de ONU (`/smartOLT/onu-view/:id`, botones inferiores) ✅
- **Archivos:** FE: `FE:S/components/Onus/components/{ReiniciarOnuModal,Desabilitar_HabilitarOnuModal,DeleteOnuModal}.vue`, `FE:S/components/Onus/composables/useOnus.js:155-230` · BE: `smart-olt.controller.ts:171` (reiniciar), `:186` (desabilitar), `:195` (habilitar), `:217` (eliminar); `smart-olt.service.ts:973-1018, 1043-1200, 1222-1325`
- **Para qué sirve:** reiniciar el equipo del cliente, cortar/restablecer su servicio a nivel OLT, o borrar la ONU de SmartOLT.
- **Acceso:** en el **listado**: `smartOLT.reiniciar_onu`, `smartOLT.habilitar_desabilitar_onu`, `smartOLT.eliminar_onu` (los ítems se ocultan sin permiso). En la **vista de ONU**: sin comprobación (cualquiera con `smartOLT.index`). Backend: solo JWT.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso (listado) | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | `Reiniciar ONU` / botón `Reiniciar` | Diálogo `¿Reiniciar ONU?` — "¿Estás seguro que deseas reiniciar la ONU" (sic, sin cierre) — `Cancelar`/`Reiniciar` | `smartOLT.reiniciar_onu` | `POST /smart-olt/reiniciar-onu/:id` → SmartOLT `POST /api/onu/reboot/{id}` | Sin comprobar estado. Spinner `Reiniciando ONU... Por favor espera...`. En el listado marca la fila `Offline`/señal `-` y consulta la ONU 5 veces cada 12 s (~1 min) para refrescarla (`ReiniciarOnuModal.vue:34-50`) |
  | `Habilitar ONU` (si `status === 'Offline'`) / `Deshabilitar ONU` (en cualquier otro estado) | Diálogo con título `Habilitar ONU`/`Deshabilitar ONU` y texto `¿Seguro que deseas habilitar|deshabilitar la ONU?`; botones `Cancelar` y `Habilitar ONU`/`Deshabilitar ONU` | `smartOLT.habilitar_desabilitar_onu` | `POST /smart-olt/habilitar-onu/:id` → `/api/onu/enable/{id}`; `POST /smart-olt/desabilitar-onu/:id` → `/api/onu/disable/{id}` | Pone la fila Online/Offline de inmediato y a los 8 s relee la ONU. **`Cancelar` no tiene manejador** (no cierra; hay que usar Esc/clic fuera) (`Desabilitar_HabilitarOnuModal.vue:79-83`) |
  | `Eliminar ONU` / botón `Eliminar` | Diálogo `¿Eliminar ONU?` — "Esta acción no se puede deshacer." + aviso azul sobre TR-069 | `smartOLT.eliminar_onu` | `POST /smart-olt/eliminar-onu/:id` → `/api/onu/delete/{id}` | Ver reglas |

- **Estados posibles / efecto:** `Deshabilitar` deja la ONU `Offline` en la OLT (corte de servicio de fibra); `Habilitar` la devuelve a `Online`. **No** cambia `isActive` del servicio en ISPMAX ni toca MikroTik: es una acción solo de OLT.
- **Reglas de negocio (backend):**
  - `reiniciarOnu`: llama a reboot y registra `REINICIAR_ONU` ("ONU reiniciada"; `entityType:'ServicioCliente'`, `entityId` = servicio con ese `sn` o `null`). Respuesta `{success, message:'La ONU se está reiniciando'}` (`:973-1018`).
  - `desabilitarOnu`: (1) consulta señal+estado; si el estado es `offline` **retorna sin enviar nada** (y responde vacío); si la consulta falla continúa. (2) `POST disable`; si el paso 1 había fallado y el `disable` también, **marca el servicio `onu_invalida=true` y notifica** (`ONU no encontrada en SmartOLT`). (3) Encola `verificarEstadoOnu` (OLT-029). (4) Log `DESABILITAR_ONU`. Respuesta `{message:'ONU deshabilitada.', data:{status:'Offline'}}`. Error genérico: `Error al deshabilitar la ONU` (500) (`:1043-1121`).
  - `habilitarOnu`: simétrico con `online` como atajo, mensaje `ONU habilitada.` y error `Error al habilitar la ONU` (`:1123-1200`).
  - `eliminarOnu`: (1) lee `onu_details.tr069`; si es `Enabled` intenta `deshabilitar_tr069` (si falla **no aborta**, devuelve `warning`); (2) `POST delete`; (3) log `ELIMINAR_ONU` con `tr069_was_enabled/tr069_disabled_ok/tr069_warning`; (4) invalida **toda** la caché de ONUs. Respuesta `{success, data, tr069_was_enabled, tr069_disabled_ok, warning}` (`:1222-1325`). **No limpia `sn` del servicio** (lo hace el front, OLT-014).
- **Efectos secundarios externos:** SmartOLT/OLT (enable, disable, reboot, delete, disable_tr069). El reboot corta el servicio del cliente unos minutos.
- **Mensajes de error/éxito (texto exacto):** éxito `La ONU se está reiniciando`, `ONU habilitada.`, `ONU deshabilitada.`; error front `Error al reiniciar la ONU: <msg>`, `Error al habilitar la ONU`, `Error al deshabilitar la ONU`; eliminar: `ONU eliminada correctamente` (+ caption `TR-069 desactivado previamente para liberar el device en el ACS.`), `ONU eliminada con observación` (caption = `warning`), error `Error al eliminar la ONU. Por favor, intenta de nuevo.`. Warnings del backend: `No se pudo deshabilitar TR-069 antes de eliminar (<msg>). La ONU se eliminó igual; revisá el ACS por si quedó un device huérfano.` / `No se pudo consultar el estado de TR-069 antes de eliminar (<msg>). Si la ONU usaba TR-069, revisá el ACS manualmente.`
- **Relaciones con otros módulos:** Logs (`REINICIAR_ONU`, `HABILITAR_ONU`, `DESABILITAR_ONU`, `ELIMINAR_ONU`), notificaciones (ONU inválida), cola de verificación (OLT-029), cortes automáticos (OLT-027) que usan las mismas funciones.
- **Casos límite y advertencias:**
  1. Si la ONU ya está `Offline` (por apagado/desconexión, no por corte) el backend **no envía `disable`**: no distingue "Offline administrativo" de "Offline físico" ❓ (H-08). Igual con `habilitar` si ya está `Online`: devuelve vacío y el front muestra un toast sin texto (`data.message` indefinido).
  2. Habilitar/deshabilitar desde la vista de ONU usa `localOnuStatus`, el último estado leído (≤15 s).
  3. Eliminar desde la **vista de ONU** no limpia el servicio (llega `servicio_id` indefinido) (H-06).
  4. Errores de SmartOLT llegan como objeto (`{status:false,error:...}`); el front muestra `data.message` o el texto genérico de axios.
- **Preguntas probables de usuarios:** ¿Deshabilitar cancela la factura del cliente? (no; solo corta la ONU). ¿Qué pasa con el cliente al reiniciar? (pierde internet 1–3 min ❓). ¿Puedo deshabilitar una ONU que ya está offline? (no se envía el comando). ¿Qué hace "Eliminar ONU"? (la saca de SmartOLT; vuelve a "no configurada" ❓). ¿Por qué me dice que revise el ACS? (TR-069 no se pudo desactivar antes). ¿Por qué no me deja habilitar? (la ONU figura Online). ¿Queda registrado quién la reinició? (sí, en Logs con el usuario).
- **Pendiente de validar en UI:** ❓ si la ONU eliminada reaparece en "no configuradas". ❓ tiempo real de reinicio.

---

## OLT-008 · SmartOLT — Mantenimiento de ONU (estado, running config, resync, fábrica, ubicación, velocidad)

- **Ruta UI / name:** vista de ONU `/smartOLT/onu-view/:id` ✅
- **Archivos:** FE: `FE:S/components/OnuView/IndexPage.vue`, `.../components/{RunningConfigModal,ResyncOnuModal,RestoreFactoryOnuModal,UbicacionOnuModal,TablesSection}.vue`, `FE:S/components/Onus/components/OnuDetailModal.vue` · BE: `smart-olt.controller.ts:148, 232, 238, 77, 293, 303, 312`
- **Para qué sirve:** diagnosticar y corregir una ONU concreta sin salir de ISPMAX.
- **Acceso:** `smartOLT.index`; sin permisos finos (H-03).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Endpoint (→ SmartOLT) | Restricciones/efectos |
  |---|---|---|---|
  | `Get status` (y botón `visibility` del listado) | Abre `Resumen de datos`: `📡 Estado Óptico`, `🧩 Detalles de ONU`, `🔌 Estado de Interfaces LAN` (Puerto, Tipo, Velocidad (Mbps), Duplex, Link State, Ring Status), `📜 Historial de Eventos` (Auth, Offline, Causa), `🏷️ MACs en OLT desde esta ONU` | `GET /smart-olt/info-completa-onu/:id` → `get_onu_full_status_info` | Sin MACs: `No hay MACs registradas en la OLT para esta ONU` |
  | `Running Config` | Modal `Running Config` con la configuración en ejecución | `GET /smart-olt/onu-running-config/:id` → `get_running_config` | Vacío: `(Sin información)` |
  | `Resincronizar Configuración` | Diálogo `Recrear la configuración OLT para esta ONU` — "...Tardará aproximadamente 30 segundos. ¿Continuar?" — `Cancelar` / `Resync config` | `POST /smart-olt/resync-config-onu/:id` → `resync_config` | Log `RESYNC_CONFIG_ONU`; éxito `Configuración de ONU resincronizada correctamente`; error `Error al resincronizar la ONU` |
  | `Restaurar Valores de Fábrica` | Diálogo `Restaurar a los valores predeterminados de fábrica` (borra SSID, clave WiFi, redirección de puertos; la ONU recupera la configuración de SmartOLT) — `Cancelar` / `Restaurar` | `POST /smart-olt/restore-factory-onu/:id` → `restore_factory_defaults` | Log `RESTORE_FACTORY_ONU`; éxito `Restablecimiento de fábrica enviado correctamente`; error `Error al restablecer la ONU`. Spinner `Restaurando ONU a valores de fábrica...` |
  | Enlace `Name` → modal `Editar Ubicación` | Edita `Zona`, `Nombre`, `Contacto`, `Dirección/Comentario`, `Latitud`, `Longitud` (botón `Guardar`) | `POST /smart-olt/actualizar-ubicacion-onu/:id` → `update_location_details` | Vacíos se envían como `-` (nombre, dirección, contacto) y `0` (lat/long); backend sanea texto y quita no-ASCII; éxito `Ubicación actualizada` |
  | `Editar velocidad` (tabla "Speed profiles") | Diálogo `Editar velocidad`: `Perfil de bajada`, `Perfil de subida`; confirmación `Confirmar cambio de velocidad` | `POST /smart-olt/onu/:id/perfil-velocidad` → `bulk_update_speed_profiles` (1 ONU) | Falta ambos: `Indica al menos un perfil (bajada o subida).`; éxito `Perfil de velocidad actualizado.`; error `No se pudo cambiar el perfil de velocidad.`; "No toca el plan ni el precio del cliente" |

- **Reglas de negocio (backend):** `actualizarOnuLocation` aplica `payloadSeguro` y `normalizeSpecialChars` (NFD + quita no-ASCII) antes de enviar (`:1344-1370, 1497-1518`). El cambio de perfil invalida la caché de ONUs (`:465`). Existe `POST actualizar-tipo-onu/:id` (`change_onu_type`) y `GET odbs/:zone_id`, **sin pantalla que los use** (H-07).
- **Efectos secundarios externos:** resync reconstruye la configuración en la OLT (~30 s); restaurar de fábrica **desconecta WiFi y borra la configuración local del equipo**.
- **Casos límite:** (1) El `q-select` de **Zona** del modal de ubicación no declara `emit-value`/`map-options` (`UbicacionOnuModal.vue:62-63`): al elegir una zona nueva el modelo pasaría a ser el objeto `{label,value}` en vez del nombre; ❓ habría que validar en UI si el DTO lo rechaza o lo convierte en la cadena `[object Object]` (H-09). (2) La cabecera del modal siempre dice "Editar" (`isEdit` fijo en true).
- **Preguntas probables:** ¿Qué hace "Resync config"? (vuelve a enviar a la OLT la configuración guardada en SmartOLT; no corta internet). ¿Y "Restaurar fábrica"? (resetea el router del cliente: pierde SSID/clave). ¿Cambiar la velocidad cambia el plan del cliente? (no, solo el perfil en SmartOLT). ¿Para qué sirve Running Config? (ver configuración efectiva en la OLT; solo lectura). ¿Por qué mi zona no se guarda? (ver caso límite 1). ¿Quién ve que lo hice? (Logs, usuario y fecha).
- **Pendiente de validar en UI:** ❓ cambio de zona en el modal de ubicación. ❓ efecto real de `Restaurar` en ONUs en modo Bridging.

---

## OLT-009 · SmartOLT — WiFi, Acceso del router, TR-069, Mgmt IP y Modo ONU

- **Ruta UI / name:** vista de ONU (botones inferiores); ficha del servicio del cliente (`ServicioInternet.vue`); formulario de autorizar (OLT-005) ✅
- **Archivos:** FE: `FE:S/components/OnuView/IndexPage.vue:36-124`, `.../components/Tr069MgmtConfigModal.vue`, `FE:S/components/Authorize/components/Tr069ConfigSection.vue`, `FE:S/components/Authorize/composables/useTr069Config.js`, `FE:CL/components/ServicioInternet.vue:112-185,1568-1577` · BE: `smart-olt.controller.ts:366-439`; `smart-olt.service.ts:1960-2484`; DTOs `cambiar-wifi`, `cambiar-acceso-onu`, `enable-tr069`, `mgmt-ip`, `update-onu-mode`
- **Para qué sirve:** configuración remota del router del cliente (WiFi y clave de administración) y de la IP de gestión/TR-069 que lo hace posible.
- **Acceso:** sin permisos finos; los botones `Cambiar WiFi` y `Acceso del router` solo se ven si la ONU tiene `tr069 === 'Enabled'` (`IndexPage.vue:517-521`); `TR-069 / Mgmt IP` y el chip TR069 solo si hay perfil por defecto en Ajustes, la ONU ya tiene perfil o TR-069 activo (`:178-182`). En la ficha del servicio el botón de WiFi requiere `onu_source==='smartOLT'`, `sn` y TR-069 activo consultado en `detalle-onu` (`ServicioInternet.vue:116-132`).
- **Botones y acciones / campos:**

  | Etiqueta | Campos | Endpoint (→ SmartOLT) | Validación |
  |---|---|---|---|
  | `Cambiar WiFi` (vista de ONU) → diálogo `Cambiar WiFi` | `SSID (nombre de la red)` (máx. 32), `Clave WiFi (mín. 8 caracteres)` (máx. 63) | `POST /smart-olt/cambiar-wifi-onu/:id` → `set_wifi_port_lan` (+`resync_config`) | front: `Completa el SSID y la clave WiFi.`, `La clave WiFi debe tener al menos 8 caracteres (WPA2).`; BE DTO: SSID no vacío ≤32, clave 8–63 |
  | `Aplicar WiFi al equipo` (ficha del servicio) | `ssid_wifi`, `password_wifi` del servicio | `POST /smart-olt/cambiar-wifi/:servicio_id` | mismo; el servicio debe tener `onu_source='smartOLT'` y `sn`: `Este servicio no tiene una ONU de SmartOLT vinculada` |
  | `Acceso del router` → diálogo `Acceso del router` | `Usuario de administración` (≤64), `Contraseña de administración` (≤128) | `POST /smart-olt/cambiar-acceso-onu/:id` → `change_web_user_pass` | `Completa el usuario y la contraseña de administración.`; BE `El usuario es requerido.` / `La contraseña es requerida.` |
  | `TR-069 / Mgmt IP` → modal `Configurar TR-069 / Mgmt IP` | ver tabla siguiente | `POST .../configurar-mgmt-ip/:id`, `.../habilitar-tr069/:id`, `.../deshabilitar-tr069/:id`, `.../configurar-modo-onu/:id` | ver reglas |

- **Sección "Configuración avanzada (opcional)"** (`Tr069ConfigSection.vue`, también en el formulario de autorizar): 
  - `Mgmt IP` → toggle `Configurar IP de gestión`; modo `Inactive` / `Static IP` / `DHCP`; con DHCP/Static: `VLAN-ID *` (obligatoria), `Tag transform` (`default`, `translate`, `translate-and-add`), `CVLAN-ID`, `SVLAN-ID`; solo Static: `IPv4 address` (IP o subred; vacío = SmartOLT autoasigna del pool), `Subnet mask`, `Gateway`, `DNS 1`, `DNS 2`.
  - `TR-069` → toggle `Habilitar TR-069 en esta ONU` + `Nombre del perfil TR-069` (obligatorio si se activa; autocompleta con el default de Ajustes).
  - `Modo ONU` (solo en el modal post-autorización): toggle `Cambiar modo ONU (Routing / Bridging)`.
  - Automatismos: activar TR-069 activa también Mgmt IP; con perfil por defecto en Ajustes, activar Mgmt IP activa TR-069; avisa si la VLAN de gestión = VLAN de servicio (`:95-98, 121-162`).
- **Reglas de negocio (backend):**
  - **Orden crítico**: Mgmt IP → TR-069 → Modo (TR-069 exige una IP de gestión funcionando; error SmartOLT `tr069_requires_mgmt_ip`) (`useTr069Config.js:118-127`). Si el estado actual ya coincide, el paso se **omite** para evitar el error "OLT wasn't able to process the command" (`:68-116`).
  - `configurarMgmtIp`: `inactive` → `set_onu_mgmt_ip_inactive`; `dhcp` → `set_onu_mgmt_ip_dhcp` (VLAN obligatoria: `Para modo DHCP se requiere vlan`); `static` → `set_onu_mgmt_ip_static_ip` (`Para modo Static se requiere vlan`) (`smart-olt.service.ts:2365-2437`).
  - `habilitarTr069`: `tr069_profile` obligatorio (`El parámetro tr069_profile es requerido`); devuelve un sobre `{message, smartolt_status, smartolt_body, external_id, tr069_profile}` en caso de error (`:1960-2015`). SmartOLT **no ofrece API para listar perfiles TR-069** (comentario en `smart-olt.controller.ts:357-362`).
  - WiFi: descubre puertos `wifi_X/Y` en `get_onu_details`; 2,4 GHz = puerto terminado en 1–4 (fallback `wifi_0/1`); 5 GHz = 5–8 (fallback `wifi_0/5`), **requerida** 2,4 GHz, 5 GHz *best-effort*; autenticación `WPA2`, `dhcp='No control'`; después `resync_config` sin reiniciar (`:2031-2163`). Persiste `ssid_wifi`/`password_wifi` en el servicio (clave **en texto plano**) (`:2211-2214, 2239-2244`). Log `CAMBIAR_WIFI` con SSID (sin clave).
  - Acceso del router: no se guarda en BD; log `CAMBIAR_ACCESO_WEB_ONU` sin contraseña (`:2261-2320`).
  - Logs de TR-069/Mgmt/Modo: `entityType:'SmartOLT'`, acciones `HABILITAR_TR069`, `DESHABILITAR_TR069`, `CONFIGURAR_MGMT_IP`, `CONFIGURAR_MODO_ONU`.
- **Mensajes de error/éxito (texto exacto):** WiFi OK `WiFi actualizado (2.4 y 5 GHz). Puede tardar unos segundos en aplicarse en la ONU.`; parcial `Se cambió la 2.4 GHz, pero la 5 GHz NO se aplicó. Si esta ONU es doble banda, revisa que su ONU Type tenga 8 WiFi SSIDs en SmartOLT.`; error `No se pudo cambiar el WiFi (verifica que la ONU tenga TR-069 habilitado).`; acceso OK `Acceso de administración del router actualizado.`; TR-069/Mgmt: `Configuración aplicada: <pasos>`, `No había cambios para aplicar (<pasos> ya estaban actualizados)`, `Algunos pasos fallaron — ...`, `No se aplicó ninguna configuración — ...`, `Activá al menos una sección para aplicar`, `TR-069 deshabilitado`; diálogo `¿Deshabilitar TR-069?` — "Se enviará la orden a SmartOLT para desactivar TR-069 en esta ONU."
- **Efectos secundarios externos:** SmartOLT → TR-069/ACS → router del cliente. Cambiar WiFi **desconecta** a los dispositivos conectados.
- **Casos límite:** (1) Sin TR-069 activo no hay botón de WiFi/Acceso; (2) la clave WiFi queda guardada en claro en el servicio y se muestra en la ficha; (3) el mismo cambio puede fallar por `ONU Type` sin 8 SSID.
- **Preguntas probables:** ¿Por qué no me sale "Cambiar WiFi"? (TR-069 no habilitado en la ONU). ¿Qué perfil TR-069 pongo? (el nombre exacto del perfil de SmartOLT; se puede predefinir en Ajustes → OLTs). ¿La 5 GHz no cambió? (ONU de una banda o ONU Type sin SSID 5 GHz). ¿"Acceso del router" cambia la clave del WiFi? (no, la del panel web). ¿Para qué la IP de gestión? (la necesita TR-069). ¿Se reinicia el equipo? (no, solo resincroniza).
- **Pendiente de validar en UI:** ❓ comportamiento de ONUs que no exponen `wifi_ports`. ❓ cómo muestra la ficha la clave guardada.

---

## OLT-010 · SmartOLT — Cambios masivos

- **Ruta UI / name:** `/smartOLT` → `ONUS CONFIGURADOS` → botón `Cambios masivos` ✅
- **Archivos:** FE: `FE:S/components/Onus/components/{CambiarPerfilMasivoModal,HabilitarMasivoModal}.vue`, `FE:S/components/Onus/IndexPageOnus.vue:441-471` · BE: `smart-olt.controller.ts:49-73`; `smart-olt.service.ts:390-665`; DTO `cambiar-perfil-masivo.dto.ts`, `habilitar-masivo.dto.ts`
- **Para qué sirve:** cambiar el perfil de velocidad o habilitar/deshabilitar (cortar) un grupo de ONUs de una OLT de una sola vez.
- **Acceso:** sin permiso propio (visible para quien ve el listado); backend solo JWT (H-03).
- **Selector:** diálogo `Cambios masivos` — "¿Qué acción quieres aplicar a varias ONUs?" → `Cambiar perfil de velocidad` ("Mover un grupo (ej. 60M → 150M)") / `Habilitar / Deshabilitar` ("Cortar o reactivar un grupo").
- **Campos de formulario:**

  | Modal | Etiqueta | Tipo | Obligatorio | Validación / valores |
  |---|---|---|---|---|
  | Perfil | `Grupo actual — velocidad de bajada (se cambiarán estas ONUs)` | select | sí | opciones `<perfil> (<n> ONUs)` agrupadas por `service_ports[0].download_speed` (`GET /smart-olt/perfiles-actuales/:olt`; `Sin velocidad` si falta) |
  | Perfil | `Perfil destino — Bajada (obligatorio)` | select | sí | perfiles `download` |
  | Perfil | `Perfil destino — Subida (opcional)` | select | no | perfiles `upload`; si se omite no se toca la subida |
  | Habilitar | Toggle `Habilitar` / `Deshabilitar` | toggle | sí | default `Habilitar` |
  | Habilitar | `Filtrar por` | select | sí | `Zona`, `Board`, `Puerto`, `Estado administrativo` |
  | Habilitar | `Valor` | select | sí | valores presentes en la lista cargada con su conteo (`Sin dato` si vacío) |

- **Botones:** `Aplicar a todas` / `Cancelar` (perfil); `Habilitar todas` / `Deshabilitar todas` / `Cancelar` (habilitar); `Ver` (lista de ONUs afectadas, solo de la lista ya cargada); `Cerrar` (deshabilitado hasta `terminado`). Confirmaciones: `Confirmar cambio masivo` (`Se cambiará el perfil de N ONU(s) que hoy tienen "X" al perfil de bajada "Y" ... ¿Continuar?`, `Sí, aplicar`) y `⚠️ Confirmar DESHABILITAR` / `Confirmar habilitar` (`Se DESHABILITARÁN (corte de servicio) N ONU(s) con <criterio> = "<valor>". ¿Continuar?`).
- **Reglas de negocio (backend):**
  - Selecciona ONUs relistando `get_all_onus_details` (sin caché) y filtrando por `download_speed === perfil_actual` o por campo (`zone_name`, `board`, `port`, `administrative_status`) (`smart-olt.service.ts:404-409, 471-488, 588-612`).
  - Procesa **en segundo plano**, en bloques de **10 ONUs** por llamada a `bulk_update_speed_profiles` / `bulk_enable` / `bulk_disable`; si un bloque falla, reintenta **una a una** (120 ms entre llamadas) y acumula errores; 250 ms entre bloques (`:514-557, 625-665`).
  - Progreso en caché `cambio-perfil-batch:<batchId>` (TTL 24 h); el front lo consulta cada 1,5 s en `GET /smart-olt/cambio-perfil-progreso/:batchId` (el **mismo** endpoint sirve a ambos modales). Si no existe responde `terminado:true, noEncontrado:true` (`:569-572`).
  - Sin resultados: `{batchId:null, mensaje:'No se encontraron ONUs con ese perfil.' | 'No se encontraron ONUs con ese criterio.'}`.
  - **No** actualiza `isActive` de los servicios, **no** registra Logs, **no** pasa por la cola de verificación (OLT-029).
- **Efectos secundarios externos:** SmartOLT (perfiles / enable / disable en lote). `Deshabilitar` corta a todo el grupo.
- **Mensajes (texto exacto):** `Selecciona una OLT primero.`, `No se pudieron cargar los perfiles.`, `Elige el perfil actual y el perfil de bajada destino.`, `No se pudo iniciar el cambio masivo.`, `Listo: N actualizados[, M con error].`, `Listo: N procesadas[, M con error].`, `Terminado con algunos errores (revisa la lista).`, `¡Terminado! Todas las ONUs se actualizaron.`, `Elige el criterio y su valor.`, `No se pudo iniciar la operación.`
- **Casos límite y advertencias:** (1) El valor `Sin dato`/`Sin velocidad` del combo no coincide con lo que compara el backend (valor vacío) → "No se encontraron ONUs" ❓. (2) Si se cierra el navegador el lote **sigue** en el servidor, pero no hay pantalla para recuperarlo. (3) La velocidad "actual" se infiere del `download_speed` del primer service-port, no del nombre del perfil (comentario en `:390-394`). (4) Un corte masivo no se reconcilia con el estado de facturación: el siguiente corte/activación automático puede revertirlo.
- **Preguntas probables:** ¿Esto cambia el plan/precio del cliente? (no). ¿Cuántas ONUs afecta? (las que hoy tienen esa velocidad de bajada, se muestra el total antes de confirmar). ¿Puedo deshacerlo? (volver a aplicar el perfil anterior/habilitar). ¿Se puede cerrar la ventana mientras corre? (el botón Cerrar espera a terminar). ¿Por qué algunas fallaron? (la lista de errores muestra el motivo de SmartOLT). ¿Deshabilitar masivo suspende los servicios en ISPMAX? (no).
- **Pendiente de validar en UI:** ❓ valores posibles de `administrative_status`. ❓ comportamiento del lote ante reinicio del backend (la caché de progreso es Redis).

---

## OLT-011 · SmartOLT — Perfiles de velocidad (PROFILES)

- **Ruta UI / name:** `/smartOLT` → pestaña `PROFILES` ✅
- **Archivos:** FE: `FE:S/components/Profiles/IndexPageProfiles.vue`, `.../composables/useSpeedProfiles.js` · BE: `smart-olt.controller.ts:42` (`GET perfiles-velocidad`) → SmartOLT `/api/system/get_speed_profiles`
- **Para qué sirve:** consultar los perfiles de velocidad definidos en SmartOLT (los que se eligen al autorizar o al editar velocidad).
- **Acceso:** `smartOLT.index`.
- **Botones:** `Download` / `Upload` (alternan la dirección), buscador `Buscar...`. **No se pueden crear ni editar perfiles desde ISPMAX** (solo lectura).
- **Columnas:** `Nombre`, `Velocidad` (`speed` de kbps → `x.xx Mbps`), `Dirección`, `Tipo`. Paginación 10.
- **Reglas de negocio:** el backend reenvía la respuesta; filtra por `direction` en el front. Errores: `Error al obtener perfiles de velocidad`.
- **Casos límite:** el valor mostrado en "Velocidad" es `speed/1000` (asume kbps) (`IndexPageProfiles.vue:15-18`) ❓.
- **Preguntas probables:** ¿Cómo creo un perfil nuevo? (en la propia plataforma SmartOLT). ¿Por qué mi plan no aparece? (los perfiles no se vinculan a planes ISPMAX). ¿Qué diferencia hay entre Download y Upload? (bajada y subida).
- **Pendiente de validar en UI:** ❓ unidad real de `speed`.

---

## OLT-012 · SmartOLT — VLANs

- **Ruta UI / name:** `/smartOLT` → pestaña `VLANS` ✅
- **Archivos:** FE: `FE:S/components/Vlans/IndexPageVlans.vue`, `.../AddVlan.vue`, `.../components/FormVlan.vue`, `.../composables/useVlans.js` · BE: `smart-olt.controller.ts:136` (`GET vlans/:olt_id`), `:142` (`POST add-vlan/:olt_id`); `smart-olt.service.ts:796-839`; `BE:smart-olt/dto/add-vlan.dto.ts`
- **Para qué sirve:** ver las VLAN de la OLT y crear una nueva en SmartOLT.
- **Acceso:** `smartOLT.index` (sin permiso para crear).
- **Botones:** `Agregar VLAN` (abre modal "Agregar VLAN"), `Buscar...`, `Guardar`.
- **Campos de formulario (`FormVlan.vue`):**

  | Etiqueta | Tipo | Obligatorio | Validación |
  |---|---|---|---|
  | `Selecciona una OLT` | select | sí | `Selecciona una OLT` |
  | `VLAN ID:` | número | sí | entero 1–4094 (`Requerido`, `Debe ser entero`, `Entre 1 y 4094`) |
  | `Descripción:` | texto | no | `@IsString` |
  | `Para IPTV`, `Para MGMT/VOIP`, `DHCP Snooping`, `LAN to LAN` | checkboxes | no | se envían como `1`/`0` |

- **Columnas:** `OLT`, `VLAN`, `Descripción` (si no hay, muestra el número de VLAN o `—`).
- **Reglas de negocio:** `POST ${dominio}/api/olt/add_vlan/{olt}` con todos los campos no nulos (form-urlencoded). DTO: `vlan` int; `for_iptv`, `for_mgmt_voip`, `dhcp_snooping`, `lan_to_lan` int opcionales. No hay edición ni eliminación.
- **Mensajes:** `VLAN creada correctamente`, `Error al crear VLAN`, `Error al obtener VLANs`, `Debes seleccionar una OLT válida.`
- **Casos límite:** tras crear, el front añade `data.data` a la lista local y además vuelve a leer la lista (`handleVlanAgregada`, `IndexPageVlans.vue:20-25`); si falla la creación, `crearVlan` notifica y relanza el error, por lo que el modal no se cierra.
- **Preguntas probables:** ¿Puedo borrar o editar una VLAN? (no desde ISPMAX). ¿Qué marcan IPTV/MGMT? (tipo de uso de la VLAN en SmartOLT). ¿Por qué debo elegir OLT dos veces? (el modal permite otra OLT distinta a la seleccionada). ¿Afecta a los clientes existentes? (no hasta usarla al autorizar).
- **Pendiente de validar en UI:** ❓ formato de la respuesta tras crear.

---

## OLT-013 · SmartOLT — Zonas

- **Ruta UI / name:** `/smartOLT` → pestaña `ZONAS` ✅
- **Archivos:** FE: `FE:S/components/Zonas/IndexPageZonas.vue`, `.../AddZonas.vue`, `.../components/ModalZonas.vue`, `.../composables/useZonas.js` · BE: `smart-olt.controller.ts:86` (`GET zonas`), `:92` (`POST add-zonas`); `smart-olt.service.ts:288-331`; `add-zona.dto.ts`
- **Para qué sirve:** ver y crear zonas en SmartOLT (se usan al autorizar y en la ubicación de la ONU).
- **Acceso:** `smartOLT.index`.
- **Botones:** `Agregar Zona` → modal "Agregar Zona" con banner `ATENCIÓN!! Ingresa el nombre de la zona como figura en la plataforma.`; campo `Zona:` (obligatorio); `Guardar`. Tabla `Zonas disponibles` con columna `Nombre`.
- **Reglas:** `GET zonas` invierte el orden recibido de SmartOLT (`reverse()`, `smart-olt.service.ts:299-300`; ❓ deja la más reciente primero). `POST add_zone` con `zone`; el DTO exige `zone` string y el servicio `El parámetro zone es requerido`. No hay editar/eliminar.
- **Mensajes:** `Zona agregada correctamente`, `No se encontraron zonas.`, `Error al agregar zona`, `Error al obtener zonas`.
- **Casos límite:** (1) en el formulario de autorizar la zona por defecto es la primera de esta lista; (2) al agregar, el front empuja `data.data` (respuesta cruda de SmartOLT) a la lista y la relee; (3) `agregarZona` captura sus propios errores (solo notifica), por lo que el modal **se cierra aunque la creación haya fallado** (`useZonas.js:28-40`, `ModalZonas.vue:11-25`).
- **Preguntas probables:** ¿Cómo edito/elimino una zona? (en SmartOLT). ¿Qué escribo en "Zona"? (el nombre tal cual lo quiere ver). ¿Aparecen en el mapa NAP? (no, son de SmartOLT).
- **Pendiente de validar en UI:** ❓ si SmartOLT rechaza zonas duplicadas y con qué mensaje.

---

## OLT-014 · Vinculación ONU↔cliente (SmartOLT)

- **Ruta UI / name:** tres puntos de entrada ✅: (a) listado `/smartOLT` → icono persona → modal "Asignar cliente a onu."; (b) formulario de autorizar → bloque "Vincular ONU a cliente ISP-MAX (opcional)"; (c) ficha del cliente → Servicios → icono SmartOLT → "Vincular ONU SmartOLT" / "Ver ONU SmartOLT".
- **Archivos:** FE: `FE:S/components/Onus/components/VincularClienteOnu.vue`, `.../composables/useVincularOnuCliente.js`, `FE:S/components/Authorize/components/VincularClienteOnu.vue`, `FE:CL/components/editar/Servicios/VincularOnu.vue`, `FE:CL/components/editar/ServiciosPage.vue:332-445`, `FE:CL/cell_renders/ClienteSN.vue` · BE: `smart-olt.controller.ts:336` (`POST vincular-cliente`), `:349` (`POST desvincular-cliente`); `smart-olt.service.ts:1386-1494`; `vincular-cliente-onu.dto.ts`; `BE:customers/customers.service.ts:2358-2430`
- **Para qué sirve:** asociar una ONU física con el **servicio** de un cliente ISPMAX: ISPMAX guarda el SN en el servicio y SmartOLT guarda el nombre del cliente y su IP.
- **Acceso:** (a)(b) `smartOLT.vincular_cliente` (en el listado el icono se **deshabilita**; en autorizar el bloque se oculta); (c) `servicio.vincular.onu` y que existan OLT (`olts.length > 0`) (`ServiciosPage.vue:395-444`).
- **Botones y campos (a):**

  | Etiqueta | Qué hace | Endpoint | Notas |
  |---|---|---|---|
  | `Buscar cliente (por nombres o numero documento):` | búsqueda con debounce 700 ms (`usePromise.getCustomers`) | `POST /customers/find-customer-by-name-document` `{needle, routers}` | al elegir cliente lista sus servicios **sin SN** |
  | `Servicio:` | elige servicio; si solo hay uno se autoselecciona | — | etiqueta `IPV4: x  Plan: y` |
  | `Guardar` | vincula | `POST /smart-olt/vincular-cliente {servicio_id, sn, ipv4, nombres}` | valida `Debes completar este campo` |
  | `Desvincular` (solo si la ONU ya está vinculada) | diálogo `¿Deseas desvincular esta onu?` (`aceptar`/`Cancelar`) | `POST /smart-olt/desvincular-cliente {servicio_id, sn}` | — |

- **Reglas de negocio (backend):**
  - **Vincular** (saga con compensación): (1) lee el servicio (`No se encontró el servicio <id>`); (2) escribe en SmartOLT `name=<nombre del cliente>` y `address_or_comment=<ipv4 del servicio>` (saneados); (3) en BD actualiza `sn`, `smartOLT` (id del primer registro SmartOLT) y `onu_source='smartOLT'` vía `customersService.actualizarServicio`; si (3) falla, intenta revertir (2) con `-`/`-`; invalida caché; responde `Cliente vinculado a la ONU` (`:1386-1436`).
  - **Desvincular**: (1) SmartOLT `name='-'`, `address_or_comment='-'`; (2) BD `sn=null, smartOLT=null, onu_source=null`; compensación restaura IP y nombre previos; responde `Cliente desvinculado de la ONU` (`:1448-1494`).
  - `actualizarServicio` limpia `onu_invalida` si cambia el SN y deja Log del servicio con acción **`HABILITAR_ONU`** (vincular, descripción "ONU vinculada al servicio") o **`DESABILITAR_ONU`** (desvincular, "ONU desvinculada del servicio") — nombres engañosos (`customers.service.ts:2395-2418`). Si falta `onu_source`, lo deduce con `resolverOnuSource` (`:2373-2382`).
  - No hay restricción única de SN en BD (`sn varchar(50)` nullable): vía API se puede repetir el mismo SN en dos servicios. El front solo ofrece servicios sin SN.
- **Camino (c) (ficha del cliente):** modal `Asignar cliente a onu.` (o `ONU Inválida — Reasignar`), `Tipo:` (`Onus esperando autorización` / `Onus autorizados disponibles`), `OLT:` (`Todos` + OLTs; con "autorizados" exige OLT: `Elige una OLT`), tabla `LISTADO DE ONUS.` con botón `Autorizar` (abre OLT-005 con `servicio_id`) o `Vincular`. **Vincular desde aquí NO usa el endpoint orquestado**: lanza en paralelo `PATCH /customers/actualizarServicio/:id {sn, smartOLT, onu_source:'smartOLT'}` y `POST /smart-olt/actualizar-ubicacion-onu/:sn {address_or_comment: ipv4, name: <cliente>}` (`VincularOnu.vue:140-150`), sin compensación; mensaje de error `Fallo al vincular la ONU`. **Desvincular**: PATCH `{sn:null, smartOLT:null, onu_source:null}` y luego, *best-effort*, ubicación `address_or_comment:'-'`, `name:<nombre del cliente>` (deja el nombre en la ONU, a diferencia del endpoint orquestado); toast `Onu Desvinculado.` (`:185-215`).
- **Mensajes (a):** éxito `ONU vinculado exitosamente`, `Onu Desvinculado.`; error `Fallo la asignación: <msg>`, `Fallo al desvincular la ONU: <msg>`.
- **Relaciones:** servicio (`sn`, `smartOLT`, `onu_source`, `onu_invalida`), cortes (OLT-027), monitoreo de conexión (OLT-033), listado de clientes (columna "ONU SN" → `ClienteSN.vue` con `(SmartOLT)`/`(AdminOLT)`).
- **Casos límite:** (1) La vinculación se basa en el **SN = `unique_external_id`**; si en SmartOLT el ID externo difiere del SN, no habrá coincidencia. (2) Un servicio ya vinculado solo aparece como "vinculado" si es el primero de su factura (`servicio_id[0]`). (3) Si `onu_source` queda `null` con `sn`, se trata como SmartOLT. (4) Un servicio con `onu_source='smartOLT'` pero `smartOLT` FK nulo se interpreta como AdminOLT en la ficha (`ServiciosPage.vue:126-127` usa `onu_source`; `validarOnusVsAdminOlt` usa FK) (H-10).
- **Preguntas probables:** ¿Para qué vincular? (para que el corte/activación, la vista del cliente y el listado sepan qué ONU es). ¿Por qué no me aparece el servicio? (ya tiene SN o es de otro cliente). ¿Qué cambia en SmartOLT al vincular? (nombre e IP de la ONU). ¿Y al desvincular? (nombre e IP vuelven a `-`). ¿Puedo vincular una ONU a dos servicios? (la UI no lo ofrece). ¿Por qué sale "ONU inválida"? (OLT-030).
- **Pendiente de validar en UI:** ❓ cómo se ve el icono ⚠ de ONU inválida en el listado de servicios.

---

## OLT-015 · AdminOLT — Panel principal

- **Ruta UI / name:** `/adminOLT` · `adminOLT.index` · menú **Gestion de Red → AdminOLT** (`FE:layouts/SideBarMenu.vue:225-234`, `validarPermisos('adminOLT.index')`) ✅
- **Archivos:** FE: `FE:A/IndexPage.vue`, `FE:A/composables/adminOLTComposable.js`, `FE:A/components/CardsInfo/CardInfo.vue`, `.../hooks/useCards.js` · BE: `BE:admin-olt/admin-olt.controller.ts:26` (`GET olt/listado`), `:43` (`GET onus-no-autorizadas`), `:64` (`GET onus-autorizadas`)
- **Para qué sirve:** elegir una OLT de la cuenta AdminOLT, ver modelo/host/versión y un resumen de estados; contiene las pestañas del módulo.
- **Acceso:** `adminOLT.index`. **Este permiso no existe en el catálogo de roles** (`FE:pages/dashboard/usuarios/permisos/gestion-red-permisos.json` solo define SmartOLT): únicamente SUPER-ADMINISTRADOR accede (H-04).
- **Secciones / pestañas:** `ONUS CONFIGURADOS` · `OLTs` · `ZONAS` · `PROFILES` · `NAPs` · `MAPS` · `API` (`FE:A/IndexPage.vue:158-164`).
- **Botones y campos:** select `Selecciona una OLT` (vacío: `Sin OLTs configuradas`); tarjetas informativas `MODELO` (`hardware_version.model · brand`), `HOST`, `VERSIÓN SW`; banner `Credenciales de AdminOLT no configuradas` + `Ir a API`.
- **Tarjetas** (`CardInfo.vue`): `ESPERANDO AUTORIZACIÓN` (clic → `/adminOLT/no-autorizadas`; pie `Sin configurar: N`; **sin comprobación de permiso**), `ONLINE` (`Total Autorizados`), `TOTAL OFFLINE` (`PwrFail` = estado que contiene "power"; `N/A` = offline), `LOW SIGNALS` (`signal_level` Warning/Critical).
- **Reglas de negocio (backend):**
  - El contador de pendientes consulta `GET /admin-olt/onus-no-autorizadas` que usa **WebSocket** (pueden pasar varios segundos) y cuenta **todas** las OLT, no solo la elegida (`useCards.js:9-19`).
  - Cualquier fallo del contador deja 0 sin avisar.
- **Efectos secundarios externos:** lecturas a AdminOLT.
- **Mensajes:** `Error al obtener OLTs de AdminOLT` (se omite si el error indica credenciales/DNS: `esErrorCredencialesAdminOLT` filtra `credenciales adminolt`, `enotfound`, `.adminolt.com`, `FE:A/components/Api/composables/useApi.js:19-30`).
- **Relaciones:** clientes (vinculación), cortes (OLT-027), mapa NAP (popup → ONU).
- **Casos límite:** (1) el listado de ONUs es global y se filtra en el navegador por la OLT elegida (`useOnus.js:41-43`); (2) las pestañas `OLTs`, `NAPs`, `MAPS`, `ZONAS` y `PROFILES` no dependen de la OLT elegida.
- **Preguntas probables:** ¿Por qué no veo AdminOLT en el menú? (rol sin `adminOLT.index`; hoy solo super-administrador). ¿Por qué tarda en cargar "Esperando autorización"? (usa WebSocket de AdminOLT). ¿Qué es el HOST? (IP/host de la OLT en AdminOLT). ¿Por qué el total no coincide con SmartOLT? (plataformas distintas).
- **Pendiente de validar en UI:** ❓ si existe algún mecanismo fuera del catálogo para otorgar `adminOLT.*` a un rol (no se encontró).

---

## OLT-016 · AdminOLT — Pestaña API (credenciales)

- **Ruta UI / name:** `/adminOLT` → `API` ✅
- **Archivos:** FE: `FE:A/components/Api/FormApi.vue`, `FE:A/components/Api/composables/useApi.js` · BE: `admin-olt.controller.ts:14` (`GET /admin-olt`), `:19` (`PATCH /admin-olt/:id`); `BE:admin-olt/dto/create-admin-olt.dto.ts`; migración semilla `BE:migrations/1777300001000-SeedAdminOltRecord.ts` (inserta un registro con `subdominio=''`, `api=''`)
- **Para qué sirve:** guardar el subdominio de la cuenta AdminOLT y su API Key.
- **Acceso:** `adminOLT.index`; sin permiso propio; backend solo JWT.
- **Campos y botones:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | `Subdominio` (placeholder `miempresa`) | texto | sí (para habilitar `Guardar`) | hint "Puedes ingresar solo el subdominio (ej: miempresa) o el dominio completo (ej: miempresa.adminolt.com)" | el backend quita `http(s)://` y `/` final; si no contiene `.` añade `.adminolt.com` y usa `https://<host>/api` (`admin-olt.service.ts:60-67`) |
  | `API Key` (placeholder `Ingrese su API Key de AdminOLT`) | texto visible | sí | — | se envía `Authorization: Token <api>` |
  | `Guardar` / `Limpiar` | botones | — | `Limpiar` pide confirmación `Limpiar credenciales` (`¿Estás seguro de que deseas borrar las credenciales de AdminOLT? El módulo dejará de funcionar hasta que las configures nuevamente.`; `Sí, borrar`/`Cancelar`) | — |

- **Reglas de negocio (backend):** `getAdminOlt()` exige `subdominio` y `api` no vacíos o responde `400 Credenciales AdminOLT no configuradas` (`:49-56`). Timeout de 15 s en GET/POST (no en DELETE).
- **Mensajes:** `Credenciales actualizadas`, `Error al actualizar AdminOLT`, `Credenciales limpiadas`, `Error al limpiar credenciales`, `Error al obtener AdminOLT`.
- **Casos límite:** (1) `GET /admin-olt` devuelve la API Key a cualquier usuario autenticado (H-02); (2) `activarOnu` existe en entidad/DTO sin uso (H-07), aunque el manual lo documenta como campo "Activar ONU" (H-01).
- **Preguntas probables:** ¿Puedo poner la URL completa? (sí, o solo el subdominio). ¿Dónde obtengo la API Key? (en la plataforma AdminOLT). ¿Cómo sé si conecta? (si carga la lista de OLTs). ¿Qué pasa al limpiar? (el módulo y los cortes AdminOLT fallan).
- **Pendiente de validar en UI:** ❓ comportamiento ante dominios personalizados distintos de `.adminolt.com`.

---

## OLT-017 · AdminOLT — Listado "ONUS CONFIGURADOS"

- **Ruta UI / name:** `/adminOLT` → `ONUS CONFIGURADOS` ✅
- **Archivos:** FE: `FE:A/components/Onus/IndexPageOnus.vue`, `.../composables/useOnus.js`, `.../components/VincularClienteOnu.vue` · BE: `admin-olt.controller.ts:64` (`GET onus-autorizadas`) → AdminOLT `/onus/authorized/`
- **Para qué sirve:** ver las ONUs autorizadas con muchas columnas opcionales, filtrar y lanzar acciones rápidas.
- **Acceso:** `adminOLT.index`. **Sin permisos finos**: todas las acciones están visibles.
- **Filtros:** `Buscar por SN, nombre, OLT...` (solo `sn`, `name`, `olt_name`); `Estado` (`Online`, `Offline`, `Power Fail`); `Señal` (`Stable`, `Warning`, `Critical`, `Disable`); `Board`, `Port`, `Zona`, `Modelo` (multi con contadores); `Vinculación` (iconos Vinculadas/No vinculadas); `Limpiar filtros`; `Columnas visibles` (selector); icono refrescar (`Refrescar lista`).
- **Columnas** (`IndexPageOnus.vue:14-43`): `ESTADO`, `NOMBRE` (enlace a detalle), `SN`, `MODELO`, `OLT`, `BOARD`, `SLOT`, `PORT`, `INTERFAZ`, `MODO`, `CVLAN`, `SVLAN`, `NAP/SPLITTER`, `ZONA`, `SEÑAL`, `SEÑAL RX`, `SEÑAL TX` (**siempre "—"** en el listado), `SUBIDA`, `DESCARGA`, `CATV PORT`, `SERVICE PORT`, `DIRECCIÓN IP`, `TR-069`, `COMENTARIOS`, `F. AUTORIZACIÓN`, `LATITUD`, `LONGITUD`, `ACCIONES`. Visibles por defecto: ESTADO, NOMBRE, SN, MODELO, OLT, BOARD, PORT, SEÑAL, ACCIONES. La selección y la paginación (15 filas) se guardan en `localStorage` (`adminolt_visible_columns`, `adminolt_pagination`).
- **Botones y acciones (por fila):**

  | Etiqueta | Qué hace | Endpoint | Efecto |
  |---|---|---|---|
  | Icono persona (verde/rojo) | Abre `Asignar cliente a ONU` (OLT-021) | — | tooltip `Vinculado — click para gestionar` / `Sin vincular` |
  | Botón dividido `visibility` | Abre el detalle (OLT-020) | — | — |
  | `Reiniciar ONU` | Diálogo `¿Reiniciar ONU <sn>?` (`Confirmar`/`Cancelar`) | `POST /admin-olt/reiniciar-onu/:id` → AdminOLT `/onu/reboot/{id}/` | toast `ONU reiniciada correctamente`; log `reiniciar-onu` |
  | `Habilitar ONU` (si estado `offline`) / `Deshabilitar ONU` | `¿Habilitar ONU <sn>?` / `¿Deshabilitar ONU <sn>?` | `POST /admin-olt/habilitar-onu/:id` / `deshabilitar-onu/:id` → `/onu/enable|disable/{id}/` | toast `ONU habilitada correctamente` / `ONU deshabilitada correctamente`; **no** encola verificación (a diferencia de los cortes automáticos) |
  | `Restaurar fábrica` | `¿Restaurar ONU <sn> a fábrica?` | `POST /admin-olt/restaurar-onu/:id` → `/onu/restore/{id}/` | `ONU restaurada a valores de fábrica` |
  | `Eliminar ONU` | `¿Eliminar ONU <sn>?` | `DELETE /admin-olt/eliminar-onu/:sn` → AdminOLT `GET /onu/delete/?sn=` | `ONU eliminada correctamente`; quita la fila; además el backend pone `sn=NULL` en **todos** los servicios con ese SN |

- **Reglas de negocio (backend):** logs con `entityType:'AdminOLT'`, acciones `reiniciar-onu`, `habilitar-onu`, `deshabilitar-onu`, `restaurar-onu`, `eliminar-onu`, `entityId` = id de ONU o SN, **solo si hay usuario** (`admin-olt.service.ts:321-461`). `eliminarOnu` actualiza `servicios-clientes.sn = null` donde `sn = :sn` sin filtrar por `deleted` ni limpiar `onu_source` (`:434-440`).
- **Casos límite:** (1) tras habilitar/deshabilitar/reiniciar la fila **no se recarga**: hay que refrescar; (2) el filtro `Estado` compara el literal `Power Fail`; (3) imágenes: el backend antepone el host de AdminOLT si la ruta es relativa (`:141-152`); (4) errores de WebSocket no aplican aquí (usa HTTP).
- **Preguntas probables:** ¿Por qué no se actualiza el estado tras reiniciar? (hay que refrescar). ¿Qué pasa con el cliente si elimino la ONU? (el servicio queda sin SN). ¿Cómo muestro más columnas? (selector "Columnas visibles"; se recuerda en el navegador). ¿Por qué SEÑAL RX/TX está vacío? (el listado no lo trae; ver detalle). ¿Cualquiera puede eliminar ONUs? (hoy solo quien accede al módulo; no hay permiso fino).
- **Pendiente de validar en UI:** ❓ valores reales del campo `status` y `signal_level`.

---

## OLT-018 · AdminOLT — ONUs en espera de autorización

- **Ruta UI / name:** `/adminOLT/no-autorizadas` · `adminOLT.no-autorizadas` · desde la tarjeta "ESPERANDO AUTORIZACIÓN" o desde la ficha del cliente ✅
- **Archivos:** FE: `FE:A/components/NoAutorizadas/IndexPageNoAutorizadas.vue` · BE: `admin-olt.controller.ts:43`; `admin-olt.service.ts:123-139, 188-274`
- **Para qué sirve:** listar las ONUs que AdminOLT detectó sin autorizar y abrir su formulario de autorización.
- **Acceso:** guard exige el permiso `adminOLT.no-autorizadas` (no asignable por catálogo). Sin comprobación en la tarjeta de origen.
- **Botones:** `Regresar`, icono refrescar (`Recargar (consulta vía WebSocket)`), `Autorizar` por fila.
- **Columnas:** `PON TYPE` (GPON/EPON), `BOARD`, `PORT`, `PON DESCRIPTION`, `SN`, `TYPE`, `ACCIÓN`; agrupado por nombre de OLT (`OLT <id>` si falta).
- **Texto:** título `ONUs en espera de autorización`; cargando `Consultando vía WebSocket, puede tardar unos segundos…`; vacío `No hay ONUs pendientes de autorización`; error `Error al obtener ONUs no autorizadas`.
- **Reglas de negocio (backend):** patrón WebSocket: (1) `GET /onu/unauthorized/` devuelve un `facility`; (2) conecta `wss://<host>/ws/<facility>?subscribe-broadcast`, envía `Get response_data`; (3) si responde `PROGRESS` espera 1 s y reintenta; hasta **12 intentos de 15 s** repartidos en 2 facilities; (4) si responde `DONE` devuelve los datos (`:196-274`). Si nunca llega `DONE` el resultado es `null` y `obtenerOnusNoAutorizadas` devuelve `[]` **sin error** (`:123-139`) → se vería "No hay ONUs pendientes" aunque haya (H-11). Campos mapeados: `sn`, `board` (`slot`), `olt_name` (`olt`), `onu_type_name` (`onu_type`), `pon_description` (`interface`), `pon_type`.
- **Navegación al autorizar:** `adminOLT.autorizar` con query `pon_type, board, port, sn, onu_type, olt_id, olt_name, interface_id` (`:39-53`).
- **Relaciones:** OLT-019; ficha del cliente (`VincularOnuAdminOLT` lista las mismas).
- **Preguntas probables:** ¿Por qué tarda tanto? (consulta por WebSocket; hasta ~3 min en el peor caso). ¿Por qué no aparece mi ONU? (aún no detectada o el WS agotó el tiempo; pulsar recargar). ¿Qué es PON description? (interfaz PON donde se detectó). ¿Se puede filtrar por OLT? (solo agrupa).
- **Pendiente de validar en UI:** ❓ nombre real del campo `interface_id`.

---

## OLT-019 · AdminOLT — Autorizar ONU

- **Ruta UI / name:** `/adminOLT/autorizar` · `adminOLT.autorizar` ✅
- **Archivos:** FE: `FE:A/components/NoAutorizadas/FormAutorizarOnu.vue`, `.../components/VincularClienteOnu.vue` · BE: `admin-olt.controller.ts:106-110` (`POST autorizar-onu`); `admin-olt.service.ts:304-319`; `BE:admin-olt/dto/authorize-onu.dto.ts`
- **Para qué sirve:** autorizar una ONU en AdminOLT indicando tipo, zona, NAP, VLANs y velocidades, y (opcional) vincularla a un cliente.
- **Acceso:** guard `adminOLT.autorizar` (no asignable); sin verificación en botones.
- **Paso a paso:** (1) desde OLT-018 o ficha del cliente se abre el formulario con OLT/Board/Port/SN prellenados; (2) se cargan 5 catálogos en paralelo (`tipos-onu`, `zonas`, `perfiles-velocidad/descarga`, `.../subida`, `naps`); (3) se completa y se pulsa `Autorizar ONU`; (4) spinner `Enviando autorización a AdminOLT…`; (5) `POST /admin-olt/autorizar-onu`; (6) si se eligió servicio: `PATCH /customers/actualizarServicio/:id {sn, onu_source:'adminOLT'}`; (7) toast `Solicitud enviada — procesando en AdminOLT…` y vuelve (`router.back()` si venía de un servicio, o `/adminOLT`).
- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | `OLT` | texto deshabilitado | — | `olt_name` de la query | — |
  | `Chasis` | número | sí (`Requerido`) | default `0` | se envía `chasis` (`IsNumber`) |
  | `Board`, `Port`, `Serial Number (SN)`, GPON/EPON | deshabilitados | — | de la query | `board`/`port` se envían como número |
  | `Tipo de ONU` | select | sí | catálogo `tipos-onu` (por `id`); preselecciona por nombre contenido en `onu_type` de la query, si no el primero | se envía `onu_type` numérico |
  | `Zona` | select | no | `Sin zona (None)` + zonas (por `id`); por defecto la primera zona real | `zone` numérico u omitido |
  | `NAP / Splitter` | select buscable | no | `Sin NAP (None)` + NAPs (valor = texto `odb_splitter`) | se envía `Number(...)`: si el texto no es numérico → `NaN` ❓ (H-12) |
  | `CVLAN` | número | sí | `Requerido`, `Debe ser mayor a 0`; hint "ID de VLAN del cliente (ej: 100)" | `cvlan` |
  | `SVLAN` | número | sí | idem; hint "ID de VLAN de servicio (ej: 100)" | `svlan` |
  | `Velocidad de descarga` | select | sí | perfiles de descarga (valor `id`) | `download_speed` numérico |
  | `Velocidad de subida` | select | sí | perfiles de subida (valor `id`) | `upload_speed` numérico |
  | `Modo ONU` | radio | sí | `Bridging` = `1`, `Routing` = `2` (default Bridging) | `onu_mode` numérico |
  | `Nombre del cliente / ONU` | texto máx. 60 | no | — | **no se sanea** en backend (a diferencia de SmartOLT) |
  | (Bloque) `Vincular ONU a cliente ISP-MAX (opcional)` | búsqueda de cliente + servicio | no | solo servicios sin SN; autorrellena `Nombre del cliente / ONU` si está vacío | botón `Quitar` |

- **Qué se envía (✅):** `POST https://<host>/api/onu/authorize/` JSON con `{chasis, board, port, sn, onu_type, onu_mode, cvlan, svlan, interface?, olt_id?, zone?, odb_splitter?, upload_speed, download_speed, name?}` (`FormAutorizarOnu.vue:122-138`, `admin-olt.service.ts:304-319`). El DTO exige numéricos para chasis, board, port, onu_type, onu_mode, cvlan, svlan, upload_speed, download_speed; `sn` string.
- **Reglas de negocio (backend):** errores de AdminOLT se normalizan (`message`/`detail`/`error`, quita etiquetas HTML, une arrays con `, `) y se lanzan como 400 (`:310-318`); sin timeout; sin log de la autorización.
- **Efectos secundarios externos:** AdminOLT autoriza (la respuesta es "solicitud enviada": el proceso es asíncrono ❓).
- **Mensajes:** `Solicitud enviada — procesando en AdminOLT…`, `Error al cargar catálogos`, `Error al autorizar ONU` (o el mensaje de AdminOLT).
- **Casos límite:** (1) si la vinculación falla **después** de autorizar, se muestra error y no hay redirección aunque la ONU ya quedó autorizada (`FormAutorizarOnu.vue:140-143`); (2) los selects usan `id` numéricos: si AdminOLT devuelve perfiles sin `id` numérico el `Number()` sería `NaN`; (3) la vinculación no escribe nombre/IP en AdminOLT.
- **Preguntas probables:** ¿Qué es chasis? (0 en la mayoría de OLT). ¿CVLAN y SVLAN? (VLAN del cliente y de servicio; valores de su red). ¿Por qué dice "procesando"? (AdminOLT tarda en autorizar). ¿Bridging o Routing? (1 = Bridging, 2 = Routing). ¿Qué pasa si no elijo NAP? (`None`).
- **Pendiente de validar en UI:** ❓ forma real del catálogo `tipos-onu` y de los NAP (`odb_splitter` numérico o texto). ❓ tiempo hasta que la ONU aparece como autorizada.

---

## OLT-020 · AdminOLT — Detalle de ONU y herramientas

- **Ruta UI / name:** `/adminOLT/onu/:sn` · `adminOLT.onu-detail` · desde el nombre en el listado, el botón dividido, la ficha del cliente (`ClienteSN.vue`, `ServiciosPage.vue`) o el mapa NAP ✅
- **Archivos:** FE: `FE:A/components/Onus/OnuDetail.vue` · BE: `admin-olt.controller.ts:69` (`GET onu-por-sn/:sn`), `:74` (`GET senal-onu/:id_onu`), `:113-186` (acciones)
- **Para qué sirve:** ficha completa de una ONU de AdminOLT con señal óptica y herramientas de mantenimiento.
- **Acceso:** guard `adminOLT.onu-detail` (no asignable); el SN viaja en la URL.
- **Secciones:** cabecera `Detalles ONU` (+ SN, `Ver cliente ISP-MAX` si `GET /customers/find-customer/:sn/sn` encuentra cliente, refrescar `Actualizar datos y señal`); tarjetas `NOMBRE`, `ESTADO` (+ nivel de señal), `SEÑAL TX OLT`, `SEÑAL RX ONU`, `SEÑAL RX 1310 nm (ONU→OLT)`, `SEÑAL TX 1490 nm (OLT→ONU)`; pestañas `Detalles` (tabla "Detalles": Número de Serie, Modelo ONU, Zona, NAP/Splitter, Nombre, Dirección, Comentario, Teléfono, Latitud, Longitud, ID Externo, UUID, Fecha Registro; tabla "Información": OLT, Fabricante OLT, Tipo ONU, Chasis / Board, Slot, Puerto, Interfaz física, Tipo interfaz, Modo, Plan Internet, Service Port, SVLAN / CVLAN, CATV, TR-069, Habilitada, F. Actualización) y `Herramientas`.
- **Botones y acciones (pestaña Herramientas):**

  | Tarjeta / botón | Qué hace | Endpoint (→ AdminOLT) | Confirmación / mensajes |
  |---|---|---|---|
  | `Reiniciar ONU` → `Reiniciar` | Reinicia y sondea estado cada 4 s (máx. 25) y señal cada 8 s (máx. 20) | `POST /admin-olt/reiniciar-onu/:id` → `/onu/reboot/{id}/` | `Reiniciar ONU` — `¿Reiniciar la ONU <sn>?`; toast `ONU reiniciada — esperando reconexión…` |
  | `Habilitar ONU` / `Deshabilitar ONU` (según `status === 'offline'`) | Activa/suspende el servicio de la ONU; sondea el estado esperado (2 s, máx. 15) | `POST .../habilitar-onu/:id`, `.../deshabilitar-onu/:id` | **Habilitar no pide confirmación**; deshabilitar: `Deshabilitar ONU` — `¿Deshabilitar la ONU <sn>?`; toasts `ONU habilitada correctamente` / `ONU deshabilitada correctamente` |
  | `CATV — Habilitado/Deshabilitado` (solo si `onu.catv != null`) → `Habilitar CATV` / `Deshabilitar CATV` | CATV de la ONU | `POST .../habilitar-catv/:sn` / `deshabilitar-catv/:sn` → `/onu/enable-catv/` / `disable-catv/` con `{serial_numbers: sn}` | `CATV habilitado correctamente` / `CATV deshabilitado correctamente`; actualiza el estado en pantalla de forma optimista |
  | `Restaurar fábrica` → `Restaurar` | Restablece configuración de fábrica | `POST .../restaurar-onu/:id` → `/onu/restore/{id}/` | `Restaurar a fábrica` — `¿Restaurar la ONU <sn> a configuración de fábrica? Esta acción no se puede deshacer.`; `ONU restaurada a fábrica` |
  | `Configurar Wi-Fi` → `Configurar` | Diálogo `Configurar Wi-Fi`: `SSID *` (máx. 32), `Contraseña *` (máx. 64); `Aplicar` deshabilitado hasta completar ambos | `POST /admin-olt/configurar-wifi/:sn` → `/tr069/wifi/{sn}/` JSON `{ssid,password}` | `Configuración Wi-Fi aplicada correctamente`; si el error menciona TR069: `Esta ONU no tiene servidor TR069 configurado en AdminOLT. Verifica que la ONU soporte TR069.` |
  | `Eliminar ONU` → `Eliminar` | Elimina de OLT y AdminOLT | `DELETE /admin-olt/eliminar-onu/:sn` | `Eliminar ONU` — `¿Estás seguro de eliminar la ONU <sn>? Esta acción la removerá del OLT y de AdminOLT.`; `ONU <sn> eliminada correctamente` → vuelve a `/adminOLT` |

- **Reglas de negocio (backend):** la señal 1310/1490 se obtiene por WebSocket (`/onu/olt-rx-signal/{id}/`, hasta 8 intentos × 15 s) (`admin-olt.service.ts:276-278`); el front colorea por umbral: `< -27 dBm` rojo, `< -24` naranja, resto verde (`OnuDetail.vue:288-293`). No hay validación de longitud mínima de clave WiFi (WPA2 pide 8–63) ❓. Logs `configurar-wifi`, `habilitar-catv`, `deshabilitar-catv` solo si hay usuario.
- **Estados:** OLT-033.
- **Casos límite:** (1) "Habilitada: Sí/No" es el campo `enable` (administrativo) distinto de `status`; (2) la ONU se busca por SN vía `/onus/authorized-by-sn/{sn}/` y se toma el primer resultado; (3) los endpoints `habilitar-internet-catv` / `deshabilitar-internet-catv` y `onus-mala-senial`, `panel-info` existen en backend **sin pantalla** (H-07).
- **Preguntas probables:** ¿Qué indica SEÑAL RX 1310? (potencia que la OLT recibe de la ONU). ¿Cuándo es mala la señal? (por debajo de -27 dBm se pinta rojo). ¿Por qué no hay botón de CATV? (la ONU no reporta puerto CATV). ¿"Habilitar" requiere confirmar? (no, "Deshabilitar" sí). ¿Quedan registros? (Logs, con usuario). ¿Wi-Fi sin TR-069? (no funciona; mensaje específico).
- **Pendiente de validar en UI:** ❓ valores de `status` (p. ej. `Power Fail`) y estructura de `onu_olt_rx_signal`.

---

## OLT-021 · Vinculación ONU↔cliente (AdminOLT)

- **Ruta UI / name:** (a) listado AdminOLT → icono persona → modal `Asignar cliente a ONU`; (b) formulario OLT-019 → bloque opcional; (c) ficha del cliente → Servicios → botón `ADM` (`Vincular ONU AdminOLT` / `Ver ONU AdminOLT`) ✅
- **Archivos:** FE: `FE:A/components/Onus/components/VincularClienteOnu.vue`, `FE:A/components/Onus/composables/useVincularOnuCliente.js`, `FE:A/components/NoAutorizadas/components/VincularClienteOnu.vue`, `FE:CL/components/editar/Servicios/VincularOnuAdminOLT.vue`, `FE:CL/components/editar/ServiciosPage.vue:332-445` · BE: **no hay endpoint propio**; usa `PATCH /customers/actualizarServicio/:id` (`BE:customers/customers.controller.ts:305-312`, `customers.service.ts:2358-2430`)
- **Para qué sirve:** guardar en el servicio del cliente el SN y la plataforma `adminOLT`, para que cortes, monitoreo y fichas encuentren la ONU.
- **Acceso:** (a)(b) sin permiso (solo guard de ruta/menú); (c) `servicio.vincular.onu` y credenciales AdminOLT cargadas (`adminOLTHasCredentials`) (`ServiciosPage.vue:407, 435`).
- **Botones y campos:** `Buscar cliente (por nombre o número de documento):`, `Servicio:` (solo servicios sin SN; autoselección si hay uno), bloque `INFORMACIÓN DE LA ONU` (OLT, BOARD, PORT, SN, TYPE ONU, TYPE PON, NAME, ZONE, ADDRESS, MODE, DOWN, UP), `Guardar` → diálogo `¿Deseas vincular esta ONU?` (`Aceptar`/`Cancelar`) → `PATCH {sn, onu_source:'adminOLT'}`; `Desvincular` (solo si ya está vinculada) → `¿Deseas desvincular esta ONU?` → `PATCH {sn:null, onu_source:null}`.
- **Ficha del cliente (c):** título `Vincular ONU de AdminOLT` / `ONU vinculada (AdminOLT)`; `Tipo` (`ONUs autorizadas disponibles` / `ONUs esperando autorización`), filtro `OLT`, `Buscar...`; botón `Vincular` (diálogo `¿Vincular ONU <sn>?`) o `Autorizar` (abre OLT-019 con `servicio_id`); si ya está vinculada: `Desvincular` (`¿Desvincular ONU <sn>?`) y `Ver detalles`. La lista de autorizadas excluye SN ya usados por cualquier cliente (se baja toda la base de clientes con `obtenerVinculados=si`).
- **Reglas de negocio (backend):** `actualizarServicio` hace `update` del servicio, limpia `onu_invalida` si cambia el SN y registra la acción `HABILITAR_ONU` (vincular) o `DESABILITAR_ONU` (desvincular) con texto "ONU vinculada/desvinculada al servicio" (`:2392-2419`). **No** toca la plataforma AdminOLT ni el campo `smartOLT` (FK).
- **Mensajes:** `ONU vinculada exitosamente`, `ONU desvinculada correctamente`, `Fallo la asignación: <msg>`, `Fallo al desvincular la ONU`; ficha: `ONU vinculada correctamente`, `ONU desvinculada correctamente`, `Error al vincular ONU`, `Error al desvincular ONU`, `No se pudieron cargar las ONUs de AdminOLT`, `No se pudo cargar la información de la ONU`.
- **Casos límite:** (1) la ficha decide "AdminOLT" por **ausencia de FK `smartOLT`** (`VincularOnuAdminOLT.vue:76`) mientras `ServiciosPage` decide por `onu_source` (H-10); (2) si el servicio venía de SmartOLT y se re-vincula en AdminOLT, el FK `smartOLT` no se limpia; (3) la vinculación no cambia el nombre/IP en AdminOLT; (4) navegar a `adminOLT.autorizar`/`adminOLT.onu-detail` desde la ficha requiere ese permiso: un rol no super-admin sería redirigido (H-04).
- **Preguntas probables:** ¿Qué diferencia hay con SmartOLT? (aquí no se escribe nada en la plataforma). ¿Puedo vincular una ONU no autorizada? (hay que autorizarla primero). ¿Por qué no hay botón ADM? (faltan credenciales AdminOLT o permiso `servicio.vincular.onu`). ¿Por qué mi ONU no aparece en "disponibles"? (ya está vinculada a otro servicio). ¿Se puede deshacer? (sí, Desvincular).
- **Pendiente de validar en UI:** ❓ aspecto del icono `ADM` y del estado ⚠ (`onu_invalida`) para AdminOLT (la ficha solo muestra ⚠ en SmartOLT).

---

## OLT-022 · AdminOLT — OLTs (perfiles de línea y VLANs por OLT)

- **Ruta UI / name:** `/adminOLT` → `OLTs` ✅
- **Archivos:** FE: `FE:A/components/Olts/IndexPageOlts.vue` · BE: `admin-olt.controller.ts:26` (`olt/listado` → `/olt-list/`), `:36` (`line-profiles/:olt_id` → `/olt/line-profiles/{id}/`), `:31` (`vlans/:olt_id` → WebSocket `/vlans/{id}/`)
- **Para qué sirve:** ver las OLT conectadas a AdminOLT con su marca/modelo/versión y consultar sus perfiles de línea y VLANs.
- **Acceso:** `adminOLT.index`. Solo lectura.
- **Columnas:** `Nombre`, `Host / IP`, `Fabricante`, `Modelo`, `Versión SW`, `Perfiles` (dos botones: tooltip `Perfiles de línea` y `VLANs — usa WebSocket, puede tardar`).
- **Secciones al pie:** `Perfiles de línea — <OLT>`: `ID`, `Nombre`, `Descripción`, `Mapping Mode`, `GemPorts` (chips `SERVICIO · VLAN n`; colores INTERNET/IPTV/otros). `VLANs — <OLT>`: `VLAN ID`, `Descripción`, `ONUs sistema`; vacío: `Sin VLANs para esta OLT o el WebSocket no respondió`.
- **Reglas:** errores de perfiles/VLANs se silencian; recarga `Recargar`.
- **Casos límite:** (1) `IndexPageVlans.vue` (pestaña VLANs independiente) existe pero **no está montada** (H-07); (2) la consulta de VLANs puede devolver `null` y se muestra vacía.
- **Preguntas probables:** ¿Dónde veo las VLAN de AdminOLT? (aquí, botón VLANs por OLT). ¿Puedo crear VLAN? (no). ¿Qué es un perfil de línea? (conjunto de gemports/VLAN definidos en la OLT). ¿Por qué tarda? (WebSocket).
- **Pendiente de validar en UI:** ❓ estructura de `line_profiles` con varias OLT.

---

## OLT-023 · AdminOLT — Zonas (crear, editar, eliminar)

- **Ruta UI / name:** `/adminOLT` → `ZONAS` ✅
- **Archivos:** FE: `FE:A/components/Zonas/IndexPageZonas.vue`, `.../composables/useZonas.js` · BE: `admin-olt.controller.ts:190-219`; `admin-olt.service.ts:521-547`
- **Para qué sirve:** administrar las zonas de AdminOLT (se usan al autorizar y para agrupar ONUs).
- **Acceso:** `adminOLT.index`; sin permiso fino; backend solo JWT.
- **Botones y campos:**

  | Etiqueta | Qué hace | Endpoint (→ AdminOLT) | Notas |
  |---|---|---|---|
  | `Nueva zona` | Abre diálogo `Nueva zona` | `POST /admin-olt/zonas` → `POST /zones/` | `Nombre *` (obligatorio, `El nombre es obligatorio`), `Descripción` (textarea) |
  | Editar (lápiz, tooltip `Editar`) | Diálogo `Editar zona` | `PATCH /admin-olt/zonas/:id` → `PUT /zones/{id}/` | botón `Guardar cambios` |
  | Eliminar (papelera, tooltip `Eliminar`) | Diálogo `Eliminar zona` — `¿Eliminar la zona <b>X</b>? Esta acción no se puede deshacer.` (`Eliminar`/`Cancelar`) | `DELETE /admin-olt/zonas/:id` → `DELETE /zones/{id}/` | sin comprobar ONUs asignadas ❓ |
  | Buscador `Buscar por nombre o descripción...` y contador `N zona(s)` | filtra en cliente | — | refrescar con icono |

- **Columnas:** `ID`, `Nombre`, `Descripción` (`Sin descripción`), `Acciones`.
- **Mensajes:** `Zona creada correctamente`, `Zona actualizada correctamente`, `Zona eliminada`, `Error al guardar la zona`, `Error al eliminar la zona`.
- **Reglas:** el cuerpo no pasa por DTO (tipado inline) → sin validación en backend; cambios afectan a la cuenta AdminOLT completa; no se registran en Logs.
- **Preguntas probables:** ¿Qué pasa con las ONUs de una zona eliminada? (lo decide AdminOLT ❓). ¿Puedo renombrarla? (sí). ¿Cualquiera puede borrar zonas? (hoy quien entra al módulo).
- **Pendiente de validar en UI:** ❓ respuesta de AdminOLT al eliminar una zona en uso.

---

## OLT-024 · AdminOLT — Perfiles de velocidad (PROFILES)

- **Ruta UI / name:** `/adminOLT` → `PROFILES` ✅
- **Archivos:** FE: `FE:A/components/Profiles/IndexPageProfiles.vue`, `.../composables/useSpeedProfiles.js` · BE: `admin-olt.controller.ts:94, 99` → AdminOLT `/speedprofiles/download/` y `/speedprofiles/upload/`
- **Para qué sirve:** consultar los perfiles de descarga y subida disponibles (se eligen al autorizar).
- **Tablas:** `Perfiles de Descarga` y `Perfiles de Subida` con columnas `ID`, `NOMBRE`, `RATE`; vacío `Sin perfiles de descarga` / `Sin perfiles de subida`.
- **Acceso:** `adminOLT.index`; solo lectura (no se crean ni editan desde ISPMAX).
- **Mensajes:** `Error al obtener perfiles de velocidad`.
- **Preguntas probables:** ¿Cómo agrego un perfil? (en AdminOLT). ¿Qué es RATE? (velocidad del perfil, unidad según AdminOLT ❓).
- **Pendiente de validar en UI:** ❓ unidad de `rate`.

---

## OLT-025 · AdminOLT — NAPs

- **Ruta UI / name:** `/adminOLT` → `NAPs` ✅
- **Archivos:** FE: `FE:A/components/Naps/IndexPageNaps.vue` · BE: `admin-olt.controller.ts:223` (`GET naps` → `/naps/`)
- **Para qué sirve:** ver los splitters/ODB registrados en AdminOLT (se ofrecen en el campo `NAP / Splitter` al autorizar). **No** son las "Cajas NAP" de ISPMAX.
- **Columnas:** `#`, `ODB / Splitter` (chip). Buscador con placeholder `Buscar por nombre, código, zona...` pero filtra **solo** por `id` y `odb_splitter` (H-13). Contador `N NAP(s)`; vacío `Sin NAPs registrados`; error `No se pudo cargar los NAPs`.
- **Acceso:** `adminOLT.index`; solo lectura.
- **Preguntas probables:** ¿Son las mismas cajas NAP de ISPMAX? (no; son datos de AdminOLT). ¿Puedo crear una? (no desde ISPMAX).
- **Pendiente de validar en UI:** ❓ campos adicionales que AdminOLT devuelve por NAP.

---

## OLT-026 · AdminOLT — MAPS

- **Ruta UI / name:** `/adminOLT` (name `adminOLT.index`) → pestaña **MAPS** (`q-tab name="maps"`, entre **NAPs** y **API**) ✅ FE:pages/dashboard/Gestion-Red/adminOLT/IndexPage.vue:159-165, 188-190.
- **Archivos:** FE: `…/adminOLT/components/Maps/IndexPageMaps.vue` (484 líneas, leído completo), `…/Maps/MapVistaAdminOlt.vue` (330, leído completo), `…/Api/composables/useApi.js:19-30` (`esErrorCredencialesAdminOLT`) · BE: `admin-olt/admin-olt.controller.ts:231-259` (rutas `maps*`), `admin-olt.service.ts:555-580` (`get` a AdminOLT, timeout 15 s, `:69-80`) · dependencia FE: `mapbox-gl ^3.14.0` (`package.json:31`).
- **Para qué sirve:** consultar los mapas de planta externa definidos en la plataforma AdminOLT (marcadores, cables, shapes y polígonos). Solo lectura: ISPMAX no crea ni edita nada en ellos. No es el "Mapa NAP" de ISPMAX (`/mapa-nap`, NET-*) ni un mapa de OLT/NAP propio. ✅
- **Acceso:** `adminOLT.index` (la pestaña no tiene permiso propio). Backend: `@Auth()` de clase, sin permiso por endpoint (OLT-032).
- **Flujo de carga (✅):**
  1. Al montar el componente (cada vez que se entra a la pestaña, porque `q-tab-panels animated` no usa `keep-alive`) llama `GET /admin-olt/maps` → `GET <AdminOLT>/api/list-maps/` (`IndexPageMaps.vue:13-33, 179`). La respuesta puede ser un arreglo o un objeto con claves numéricas (se usa `Object.values`). La pestaña **no depende del selector de OLT**: lista los mapas de toda la cuenta de AdminOLT.
  2. **Ver detalle** (botón por fila, ícono `layers`) guarda el mapa elegido, resetea las cuatro secciones, fija la subpestaña **Vista Mapa** y pide solo `GET /admin-olt/maps/:id/markers` (`:39-49`); al cambiar de subpestaña se piden `…/cables`, `…/shapes`, `…/polygons` (una vez; cada subpestaña tiene su botón ⟳ para recargar, `:88-109`). Vista Mapa pide las cuatro que falten.
  3. Rutas del backend → AdminOLT: `maps` → `/list-maps/`, `maps/:id/markers` → `/list-markers/{id}/`, `…/cables` → `/list-cables/{id}/`, `…/shapes` → `/list-shapes/{id}/`, `…/polygons` → `/list-polygons/{id}/`, `maps/:id` → `/map/{id}/` (esta última **no la usa el frontend**). `:id` se valida con `ParseIntPipe`.
  4. El frontend espera el cuerpo `{ data: { markers | cables | shapes | polygons: [...] } }` (`:97-100`); si la clave no existe muestra la tabla vacía.
- **Secciones / pestañas:**
  - **Lista de mapas** (título "Lista de mapas", botón ⟳ con tooltip "Recargar"): `q-table` con columnas `ID`, `Nombre`, `Descripción`, `Marcadores` (insignia `markers ?? 0`), `Distancia (m)` (`"{n} m"` con separadores, o `0`), `Fecha` (`date_created` sin formatear) y botón **Ver detalle** (contorno si es el mapa abierto). Filas por página 10/25/Todas ("Filas por página"). Vacío: "Sin mapas configurados".
  - **Detalle**: cabecera con ícono de mapa, `name` y `— description`, botón ✕ (tooltip "Cerrar") y cinco subpestañas: **Vista Mapa**, **Marcadores**, **Cables**, **Shapes**, **Polígonos**.
  - **Marcadores**: `ID`, `Nombre`, `Texto`, `Descripción` (`—` si vacía), `Latitud`, `Longitud`, `Total ONUs` (insignia), `Ícono` (imagen 28 px desde `icon`, `—` si no hay).
  - **Cables**: `ID`, `Nombre` (`name_cable`), `Descripción` (`description_cable`), `Color` (cuadro + valor), `Puntos ruta` (`"{n} pts"`, `—` si el JSON no se puede leer), `Marcador ini.`, `Marcador fin.`.
  - **Shapes**: `ID` (`id_shape`), `Nombre` (`name_shape`), `Descripción`, `Color`, `Puntos ruta`. **Polígonos**: `ID` (`id_polygon`), `Nombre`, `Descripción`, `Color`, `Puntos ruta`.
  - **Vista Mapa** (`MapVistaAdminOlt.vue`): mapa Mapbox de 540 px de alto, centro inicial `[-79.46, -1.44]` zoom 5 (estilo `streets-v12`), controles de navegación (arriba derecha) y escala (abajo izquierda); botón redondo arriba izquierda para cambiar a **satélite** (`satellite-streets-v12`; tooltips "Vista satélite" / "Vista calles"); **LEYENDA** abajo derecha con un renglón por tipo que tenga elementos —`Marcadores (n)`, `Cables (n)`, `Shapes (n)`, `Polígonos (n)`— y el botón "Ver todo" (ícono `fit_screen`); pulsar un renglón encuadra solo esa categoría (`fitBounds` con margen 80, zoom máx. 17; un solo punto → zoom 16). Al cargar, encuadra todo (margen 60, zoom máx. 17, un solo punto → zoom 15). Mientras cargan los datos: "Cargando datos del mapa…".
- **Cómo se dibuja (✅ MapVistaAdminOlt.vue:119-225):**
  - *Marcador*: pin de `icon` (si falla la imagen, pin SVG azul `#1976d2`); popup (ancho máx. 220 px) con `name` (o `text`, o `—`), `description`, `ONUs: {total_onus}` y `lat, lng` con 5 decimales. Se omiten los que no tienen latitud/longitud numérica.
  - *Cable*: línea de ancho 3 con `color` (`#666` por defecto); necesita ≥ 2 puntos; clic → popup con `name_cable` y `description_cable`.
  - *Shape*: con ≥ 3 puntos, polígono con relleno al 25 % y borde 2 px (`color`, por defecto `#e53935`) y popup al hacer clic; con **2 puntos**, línea discontinua **sin popup**; con < 2 no se dibuja.
  - *Polígono*: necesita ≥ 3 puntos; relleno 25 % (`#43a047` por defecto) y popup `name` + `description`.
  - `path` puede venir como arreglo o como texto JSON de objetos `{lat, lng}` o `{latitude, longitude}`; los puntos no numéricos se descartan.
- **Estados / filtros:** ninguno (no hay buscador ni filtro; solo ordenar columnas y paginar).
- **Mensajes (texto exacto):** vacíos "Sin mapas configurados", "Sin marcadores para este mapa", "Sin cables para este mapa", "Sin shapes para este mapa", "Sin polígonos para este mapa"; errores: la lista muestra `error_outline` + `err.response.data.message` o "Error al cargar mapas"; cada subpestaña "Error al cargar datos" (o el mensaje del backend, que es el `detail` de AdminOLT, su `message` de axios o "Error en AdminOLT", `admin-olt.service.ts:69-80`). Si el error es de credenciales (`esErrorCredencialesAdminOLT`: el mensaje contiene `credenciales adminolt`, `enotfound` o `.adminolt.com`) la lista y las secciones quedan **vacías sin mostrar error** (el aviso "Credenciales de AdminOLT no configuradas" con el botón **Ir a API** lo muestra la página contenedora, FE:adminOLT/IndexPage.vue:89-105).
- **Reglas / casos límite (✅):**
  1. El token público de Mapbox (`pk.*`) está **escrito en el código** del componente (`MapVistaAdminOlt.vue:24`) en vez de en configuración (H-14): el mapa base depende de ese token y de que el navegador alcance Mapbox; sin ellos las tablas funcionan y la **Vista Mapa** no dibuja el mapa base.
  2. Los popups insertan `name`, `text`, `description` y los nombres de cable/shape/polígono con `setHTML` sin sanear (`:130-137, 169, 191, 216`): son datos de AdminOLT. Los ítems de las tablas sí se escapan (Vue).
  3. **Cambio directo de mapa:** si se pulsa **Ver detalle** en otro mapa estando ya en **Vista Mapa**, `subtab` no cambia (sigue `'vista'`), el `watch` no se dispara y solo se cargan los marcadores (`IndexPageMaps.vue:39-49, 94-109`); cables, shapes y polígonos del nuevo mapa no aparecen hasta pasar por otra subpestaña y volver ❓ (confirmar en UI). Lo mismo al cerrar con ✕ y abrir otro: `subtab` conserva el último valor.
  4. Cada re-dibujo (cambiar a satélite y volver, o recargar datos) vuelve a registrar los `click` por capa sin quitar los anteriores (`MapVistaAdminOlt.vue:167-173, 189-195, 214-220`), por lo que un clic puede abrir varios popups superpuestos ❓.
  5. Al salir de la pestaña se pierde el mapa abierto y se vuelve a pedir la lista (sin caché ni `keep-alive`); AdminOLT no tiene caché en ISPMAX (OLT-034).
  6. `GET /admin-olt/maps/:map_id` (detalle del mapa) existe en el backend y no se usa en el frontend.
- **Efectos externos:** solo lectura sobre la API REST de AdminOLT (`https://<subdominio>.adminolt.com/api`, cabecera `Authorization: Token …`) y carga de teselas/estilos desde Mapbox en el navegador. Sin efectos en MikroTik, cortes ni base de datos.
- **Límite de lectura:** el contenido real de los campos que devuelve AdminOLT (`path`, `icon`, `total_onus`, `distance`, `date_created`) lo define esa plataforma, que no está en el ZIP; el código solo muestra lo que llega.
- **Preguntas probables:** ¿Puedo editar el mapa aquí? (no, solo ver). ¿Es el mismo "Mapa NAP" de ISPMAX? (no; ese es `index.mapa`). ¿Por qué no carga el mapa? (token de Mapbox/red, o AdminOLT sin datos/credenciales). ¿Por qué un shape no abre popup? (con 2 puntos se dibuja como línea sin popup). ¿Por qué cambié de mapa y solo veo marcadores? (ver caso 3).
- **Pendiente de validar en UI:** ❓ cambio directo de mapa en Vista Mapa (caso 3) y popups duplicados (caso 4); ❓ rendimiento con mapas grandes; ❓ forma real de `path` según AdminOLT.

---

## OLT-027 · Corte y reactivación de servicio vía ONU (y su relación con Ajustes y reintentos)

- **Ruta UI / name:** sin pantalla propia: se configura en **Ajustes → Servicio** (`/ajustes/servicio`, `ajuste.servicio`); se dispara por cron, por "Aplicar cortes manualmente", por Activar/Suspender de un servicio y por pagos/promesas ✅
- **Archivos:** BE: `BE:common/utils/onu-corte.utils.ts`, `BE:app-queue.processor.ts:81-112, 114-707, 770-862`, `BE:app.service.ts:256-338, 484-497`, `BE:app.controller.ts:25-58`, `BE:customers/customers.service.ts:2640-2760, 2896-2960`, `BE:settings/entities/setting.entity.ts:128-158` · FE: `FE:AJ/servicios/components/ConfigurarReintentosCortes.vue`, `FE:AJ/servicios/components/CorteConfigCards.vue`, `FE:AJ/servicios/composables/useCorteRouter.js`
- **Para qué sirve:** cuando un servicio se suspende (mora, manual) o se reactiva (pago, promesa), además de MikroTik, ISPMAX puede **deshabilitar/habilitar la ONU** en SmartOLT o AdminOLT.
- **Acceso:** casillas "Aplicar Cortes/Activación" solo con `variables.opciones-cortes` (`ConfigurarReintentosCortes.vue:161`); botón "Aplicar cortes manualmente" con `variables.aplicar-cortes` (`:200`); reintentos con `variables.reintentos.mikrotik` (`:185`); suspender/activar un servicio con `servicio.activar.suspender`.
- **Interruptores (qué ve el usuario):** `Aplicar Cortes/Activación:` con casillas `Mikrotik`, `SmartOLT`, `AdminOLT`. Global: `settings.aplicarCortes` (por defecto `{"mikrotik": true, "smartOLT": false}` → **la ONU no se toca salvo que se marque SmartOLT/AdminOLT**). Por router: `router.corteConfig.aplicarCortes` (card "Configuración de reintentos automáticos" del router, `CorteConfigCards.vue:112-119`). En la pantalla global (`/ajustes/servicio`) el componente se incrusta con `:mostrar-guardar="false"`, así que **no autoguarda**: los cambios se guardan con el botón único `Guardar Cambios` de la tarjeta `Configurar cortes de` (`PATCH /settings/:id` completo + `PUT /programar-queue/cortesServicios`, toast `Actualización exitosa`) (`FE:AJ/servicios/IndexPage.vue:21-39,160-168`, `FE:pages/dashboard/empresas/composables/useSetting.js:208-213`); el autoguardado (`updateConfig(true)`, toast `Cambios guardado`) solo ocurre si el componente se usa con su propio botón.
- **Reglas de negocio (backend, ✅):**
  1. **Qué plataforma:** `resolverOnuSource(servicio)` = `onu_source` si existe; si no, `smartOLT` si hay FK `smartOLT`; si no, `'smartOLT'` cuando hay `sn`; si no, `null` (`onu-corte.utils.ts:24-28`).
  2. **Qué canales:** `resolverAplicarCortes(router, global)` = `{...global, ...router}` (el router pisa solo las claves que define) (`:38-44`).
  3. **Condición para tocar la ONU:** `esSmartOLT = aplicarCortes.smartOLT && sn && onuSource==='smartOLT'`; `esAdminOLT = aplicarCortes.adminOLT && sn && onuSource==='adminOLT'` (`app-queue.processor.ts:213-219`; igual en `customers.service.ts:2710-2742`).
  4. **Cuándo se envía la orden (corte masivo):** solo si hubo **transición** de estado del servicio (`isActive` cambió ahora) o si el job trae `sincronizarOnus` (corte manual), y no si la ONU está marcada `onu_invalida` sin transición (`:81-112`). Acción `deshabilitar` ⇒ `SmartOltService.desabilitarOnu(sn)` / `AdminOltService.deshabilitarOnuPorSn(sn)`; `habilitar` ⇒ `habilitarOnu` / `habilitarOnuPorSn`.
  5. **Orden de operaciones:** primero MikroTik/BD (`suspenderServicio`), luego ONU. El error de ONU se captura: Slack `⚠️ Error al *deshabilitar|habilitar ONU* \`<sn>\` — <CLIENTE>\n><msg>` solo si hubo transición (`:101-111`). En `activeOrSuspendService` (manual desde la ficha) el fallo de ONU solo deja `logger.warn` (`customers.service.ts:2727-2741`).
  6. **Una sola orden por servicio**: SmartOLT consulta antes el estado de la ONU y **omite** la orden si ya está en el estado deseado (OLT-007); AdminOLT **siempre** envía la orden y programa verificación (OLT-029).
  7. **Retiro de servicio** (`retirarServicio`): si `settings.aplicarCortes.smartOLT|adminOLT` (solo el **global**, no el del router) y hay `sn`, **elimina la ONU** de la plataforma (`customers.service.ts:2946-2960`), sin usuario en el log.
  8. **Corte manual:** `PUT /programar-queue/cortesServicios` (reprograma crons) y `POST /aplicar-cortes` → un job `cortesServicios` por router con `sincronizarOnus:true` (`app.service.ts:256-285`). Diálogo `¿Deseas aplicar los cortes manual?` (`Aceptar`/`Cancelar`); toast `Aplicando cortes.`
  9. **Reactivación por pago/promesa:** `verifyAndApplyServiceStatus` encola `{servicio_id}` (`app.service.ts:484-497`); se invoca desde registro de abonos y promesas de pago; ese job corta/reactiva **en el momento** (no espera el día de corte, `app-queue.processor.ts:282, 313, 397`).
- **Relación con "Reintentos" de Ajustes (✅):** `configReintentos` = `Número de intentos al aplicar cortes` (1–20, defecto 4) y `Tiempo entre cada reintento` (1–1440 min, defecto 60). **Solo reintentan la reparación del router MikroTik** (`reintentarRoutersFallidos`, `app-queue.processor.ts:597-691, 770-862`); para un servicio individual el máximo es 6 reintentos cada 60 s y no usa la configuración. **No reintentan las órdenes a la ONU.** La única repetición de ONU es la verificación de OLT-029 (SmartOLT: 2 comprobaciones; AdminOLT: 4).
- **Efectos secundarios externos:** MikroTik (address-list/colas/PPPoE), SmartOLT/AdminOLT (enable/disable), Slack (webhook `URL_SLACK`), logs `corte_servicio`, `verificacion_onu_smartolt`, `AdminOLT`.
- **Mensajes (texto exacto):** `Aplicar Cortes/Activación:`; `Número de intentos al aplicar cortes:` (sufijo `Veces`); `Tiempo entre cada reintento:` (sufijo `Minutos`); `Aplicar cortes manualmente` + botón `Activar`; log `🟠 Corte inactivo para el dia <día>`; `Actualización exitosa`.
- **Relaciones con otros módulos:** Cortes (manual `cortes.mdx`), Facturación (mora), Promesas de pago, Routers (config por router), Logs, Slack.
- **Casos límite y advertencias:**
  1. **Por defecto el corte no apaga la ONU** (smartOLT=false); además requiere `sn` y plataforma coincidente.
  2. El checkbox `Mikrotik` **no es leído** por el backend (solo `smartOLT`/`adminOLT`): MikroTik siempre se aplica (H-05).
  3. La ONU "ya Offline" no recibe `disable` (H-08).
  4. Una orden masiva hecha en SmartOLT (OLT-010) no pasa por estas reglas y puede contradecir el estado de facturación.
  5. El corte manual con `sincronizarOnus` reenvía el estado a **todas** las ONUs vinculadas (carga alta sobre SmartOLT/AdminOLT).
- **Preguntas probables de usuarios:** ¿Por qué suspendí al cliente y sigue con luz verde en la ONU? (SmartOLT/AdminOLT no marcado en "Aplicar Cortes/Activación" o servicio sin SN). ¿Qué hace "Aplicar cortes manualmente"? (reevalúa a todos y reenvía estado a ONU/MikroTik). ¿Los reintentos afectan a la ONU? (no, solo routers). ¿Qué pasa si la ONU no responde? (queda la orden fallida; aviso a Slack; verificación hasta 2/4 veces). ¿Se corta aunque hoy no sea día de corte si paga? (la reactivación sí es inmediata). ¿Cómo sé si se aplicó? (Logs → "Cortes y red").
- **Pendiente de validar en UI:** ❓ comportamiento visible de la casilla `Mikrotik`. ❓ si la ficha del servicio muestra el resultado del paso ONU.

---

## OLT-028 · Reinicio automático programado de ONUs

- **Ruta UI / name:** `/ajustes/smartolt` · `ajuste.smartolt` → pestaña `SmartOLT` o `AdminOLT` → tarjeta `🕓 Configuración de reinicio automático de ONUs` ✅
- **Archivos:** FE: `FE:AJ/servicios/components/CronSmartOLT.vue`, `FE:AJ/servicios/components/CronAdminOLT.vue`, `FE:AJ/smartOLT/IndexPage.vue:291, 562` · BE: `smart-olt.service.ts:188-263`, `reinicio-smartolt-queue.processor.ts`, `admin-olt.service.ts:583-638`, `reinicio-adminolt-queue.processor.ts`, `settings.entity.ts:160-185`, `smart-olt.controller.ts:25`, `admin-olt.controller.ts:59`
- **Para qué sirve:** reiniciar periódicamente las ONUs (cada N días a una hora fija) para refrescar equipos.
- **Acceso:** las dos tarjetas se muestran con `variables.reintentos.smartOLT` (etiqueta en roles: "Configuración de reinicio automático de ONUs").
- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | `Aplicar reinicio automatico:` | toggle | — | `isActive` | al apagarlo no se crea tarea |
  | `Intervalo de reinicio:` | select | sí | `1 Día` … `50 Días` | cadena `"N Día(s)"` |
  | `Hora de ejecución:` | hora 24 h | sí | `HH:mm` | por defecto `00:00` |
  | `Modo de reinicio:` | radio (solo con toggle activo) | — | `Onus Vinculados` (`vinculados`) / `Onus vinculados y no vinculados` (`vinculados_y_no_vinculados`) | **en SmartOLT no hay valor por defecto** en BD (H-16) |
  | `Fecha de Base:` | calendario (≥ ayer) | — | muestra `DD/MM/YYYY + N Días + HH:mm` | la próxima ejecución = base + N días a la hora |
  | `La proxima fecha de reinicio será:` | solo lectura | — | `fechaActivacion` | — |
  | `Guardar Cambios` | botón | — | `PATCH /settings/:id` `{reiniciosSmartOLT|reiniciosAdminOLT}` + `POST /smart-olt|admin-olt/programar-reinicio-onu` | toast `Actualización exitosa` |

- **Reglas de negocio (backend):**
  - Solo la instancia primaria (`NODE_APP_INSTANCE`/`PM2_INSTANCE_ID` = `0`) programa (`smart-olt.service.ts:191-194`). SmartOLT además reprograma **al arrancar** (`onModuleInit`, `:173-175`); AdminOLT no (usa los jobs retardados persistidos en Redis) ❓.
  - Cálculo: `fecha = moment(date) + dias días` a `time`; guarda `fechaActivacion`; borra jobs `reiniciarOnus`/`reiniciarOnusAdminOLT` pendientes y, si `delay > 0` y `isActive`, añade el job con `attempts:1` (`:200-257`; `admin-olt.service.ts:596-632`). **Si la fecha ya pasó no se crea ningún job** (se escribe en consola "La fecha programada ya pasó…") y no vuelve a intentarse hasta guardar de nuevo (H-17).
  - Ejecución SmartOLT: `modo==='vinculados'` → `rebootOnusLinked` (todos los servicios con `sn` no vacío — **sin filtrar `deleted` ni `onu_source`**, `reinicio-smartolt-queue.processor.ts:132-137`); cualquier otro valor (incluido `undefined`) → `rebootAllOnutOLT` (todas las ONUs de todas las OLT por `get_onus_statuses`). Pausa 100 ms entre ONUs, timeout 10 s.
  - Ejecución AdminOLT: `vinculados` (por defecto) = servicios con `sn` no vacío, `deleted=false`, `onu_source='adminOLT'`, buscando la ONU por SN; en otro caso todas las autorizadas; pausa 150 ms (`reinicio-adminolt-queue.processor.ts:28-85`).
  - Al terminar: `date = hoy`, `lastResult {success, errors, timestamp}` y reprograma la siguiente (`:236-267`; `:103-134`). `lastResult` **no se muestra** en la UI.
- **Efectos secundarios externos:** `POST /api/onu/reboot/{id}` masivo (SmartOLT) o `/onu/reboot/{id}/` (AdminOLT): todos los clientes afectados pierden servicio 1–3 min ❓.
- **Mensajes / logs:** `entityType:'reinicio_onus_smartolt'` / `'reinicio_onus_adminolt'`, acciones `RUN` (`🔧 Reinicio completado: N exitosos, M errores`), `WARNING` (`No se encontraron OLTs en <dominio>`, `No se encontraron ONUs vinculadas para reiniciar`), `ERROR` (`Reinicio masivo parcialmente exitoso...`, `Fallo en reinicio masivo`, `❌ Fallo crítico al reiniciar ONUs`). En caso de fallo crítico el log guarda `jobData` con el objeto SmartOLT **incluida la API Key** (`reinicio-smartolt-queue.processor.ts:273-287`) (H-02).
- **Casos límite:** (1) dos tarjetas con el mismo título, solo la pestaña las distingue; (2) el job lleva `smartOLT` y `settings` completos en Redis; (3) el modo "no vinculados" reinicia también equipos de clientes no gestionados por ISPMAX.
- **Preguntas probables:** ¿Para qué reiniciar ONUs cada X días? (liberar memoria/estabilidad; decisión operativa). ¿Cómo sé cuándo corre? (campo "La proxima fecha de reinicio será"). ¿Qué hace "vinculados"? (solo ONUs asignadas a un servicio). ¿Se puede probar? (no hay botón "ejecutar ahora"). ¿Por qué no corrió? (fecha ya pasada al guardar, instancia secundaria o Redis). ¿Quién lo ve? (Logs → Cortes y red).
- **Pendiente de validar en UI:** ❓ comportamiento si el backend estuvo caído a la hora programada (SmartOLT reprograma al arrancar con fecha pasada ⇒ no corre). ❓ efecto real del modo sin valor en SmartOLT.

---

## OLT-029 · Tareas en cola de verificación de habilitación/deshabilitación (y cómo ver su resultado)

- **Ruta UI / name:** sin pantalla propia; resultados en **Ajustes → Logs** (`/ajustes/logs`, `ver.logs`) y en el historial de cortes ✅
- **Archivos:** BE: `smart-olt/habilitacion-onu-queue.processor.ts`, `smart-olt.service.ts:1072-1090, 1151-1169`, `admin-olt/habilitacion-adminolt-queue.processor.ts`, `admin-olt.service.ts:374-397`; FE: `FE:AJ/servicios/components/LogsGenerales.vue:28,63,67-72`, `LogsCortes.vue:32`
- **Para qué sirve:** tras ordenar habilitar/deshabilitar una ONU, comprobar a los ~35 s que realmente cambió de estado y reintentar si no.
- **Acceso:** `ver.logs` (Logs generales) y `variables.opciones-logs` (Historial del proceso de cortes).
- **Tareas (estado y parámetros):**

  | Cola / job | Datos | Se crea cuando | Parámetros Bull | Qué hace |
  |---|---|---|---|---|
  | `${queueName}-habilitacion-onus` · `verificarEstadoOnu` | `{externalId, estadoEsperado:'online'|'offline'}` | tras `habilitarOnu`/`desabilitarOnu` OK (manual o por corte) | `jobId verificar-onu-<id>` (reemplaza el anterior), `delay 35 000 ms`, `attempts 2`, backoff fijo 60 000 ms, `removeOnComplete/Fail:true` | lee señal+estado; si coincide → éxito (el job desaparece); si no, **reenvía** `enable`/`disable` y falla para reintentar (`habilitacion-onu-queue.processor.ts:16-37`) |
  | `${queueName}-habilitacion-onus-adminolt` · `verificarEstadoOnuAdminOLT` | `{sn, estadoEsperado}` | `habilitarOnuPorSn`/`deshabilitarOnuPorSn` (solo flujos automáticos/ficha) | `jobId verificar-adminolt-onu-<sn>`, delay 35 s, `attempts 4`, backoff fijo 60 s | busca la ONU por SN; si no existe → termina sin error (`onu_no_encontrada`); si `status` ≠ esperado → reaplica y relanza |

- **Estados posibles de la tarea:** `delayed` (esperando 35 s/60 s) → `active` → éxito (se elimina) o `failed`. Tras el último intento fallido se escribe un log; **los éxitos no dejan rastro**.
- **Cómo ver el resultado (✅):**
  - SmartOLT: Log `entityType:'verificacion_onu_smartolt'`, acción `VERIFICACION_FALLIDA` (en pantalla `Verificación fallida`), descripción `No se verificó estado después de N intentos`, `entityId` = ID externo; módulo "Cortes y red" (`LogsGenerales.vue:28`); preset `Errores` incluye `VERIFICACION_FALLIDA` (`:47`).
  - AdminOLT: Log `entityType:'AdminOLT'`, acción `VERIFICACION_FALLIDA`, descripción `[AdminOLT] ONU <sn> no alcanzó estado '<esperado>' tras N intentos`; módulo "Sistema" (`:35`).
  - La acción previa (`HABILITAR_ONU`, `DESABILITAR_ONU`, `REINICIAR_ONU`…) aparece en el historial del servicio (SmartOLT) cuando la ONU está vinculada.
  - **Historial del proceso de cortes** solo lista `corte_servicio` y `reinicio_onus_smartolt` (`LogsCortes.vue:32`): no muestra verificaciones ni AdminOLT.
- **Reglas de negocio:** las acciones de AdminOLT desde la UI (`habilitar-onu/:id`, `deshabilitar-onu/:id`) **no** crean tarea de verificación (solo el flujo `…PorSn`). Las acciones manuales de SmartOLT desde la UI sí la crean.
- **Casos límite:** (1) el último reintento reenvía la orden pero ya no se verifica; (2) si la ONU está legítimamente apagada (sin energía) la verificación de `online` fallará; (3) el log de AdminOLT usa acciones en minúsculas (`habilitar-onu`) que no están en el diccionario de etiquetas de la pantalla de Logs.
- **Preguntas probables:** ¿Cómo sé si la ONU realmente se cortó? (revisar el estado en el listado o Logs → Errores). ¿Por qué veo "Verificación fallida"? (la ONU no llegó al estado en 35–95 s). ¿Puedo ver las tareas pendientes? (no hay pantalla de colas). ¿Se reintenta indefinidamente? (no: 2 o 4 veces).
- **Pendiente de validar en UI:** ❓ cómo se pintan en Logs las acciones en minúsculas de AdminOLT.

---

## OLT-030 · Validación de ONUs contra la plataforma, `onu_invalida` y revalidación

- **Ruta UI / name:** `/ajustes/smartolt` (botones `Validar ONUs vs SmartOLT` / `Validar ONUs vs AdminOLT`); ficha del cliente → Servicios (icono ⚠) ✅
- **Archivos:** FE: `FE:AJ/smartOLT/IndexPage.vue:210-252, 511-590`, `FE:CL/components/editar/ServiciosPage.vue:190-210, 349-358`, `FE:CL/components/editar/Servicios/VincularOnu.vue:25-48` · BE: `smart-olt.controller.ts:204, 325`; `smart-olt.service.ts:116-171, 1822-1939`; `admin-olt.controller.ts:48, 54`; `admin-olt.service.ts:647-772`
- **Para qué sirve:** detectar servicios cuyo `sn` ya no existe en la plataforma, marcarlos `onu_invalida` y avisar para re-vincular.
- **Acceso:** pestañas de Ajustes → OLTs (guard `variables.reintentos.smartOLT` o `variables.opciones-cortes`); sin permiso específico para pulsar los botones.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Endpoint | Resultado |
  |---|---|---|---|
  | `Validar ONUs vs SmartOLT` | recorre todas las OLT, junta los `unique_external_id` y cruza con servicios con `sn` | `POST /smart-olt/validar-onus-vs-smartolt` | muestra `Servicios con SN`, `No encontradas`, `Nuevas marcadas` + lista de clientes (enlace a la ficha); toasts `N ONU(s) no encontradas en SmartOLT` / `Todas las ONUs están OK en SmartOLT` |
  | `Validar ONUs vs AdminOLT` | idem con `/onus/authorized/` y servicios **sin FK smartOLT** | `POST /admin-olt/validar-onus-vs-adminolt` | `N ONU(s) no encontradas en AdminOLT` / `Todas las ONUs están OK en AdminOLT` |
  | Icono ⚠ en el SN (ficha) | abre `ONU Inválida — Reasignar` | — | tooltip `ONU no encontrada en SmartOLT. Haz click para re-vincular.` |
  | (automático) al abrir Servicios | `revalidar-onu/:sn` por cada servicio con `onu_invalida` | `POST /smart-olt|admin-olt/revalidar-onu/:sn` | si la ONU responde, limpia el flag |

- **Reglas de negocio (backend):**
  - SmartOLT: servicios `sn IS NOT NULL AND deleted=false` **sin filtrar por `onu_source`**; si SmartOLT no devuelve ninguna ONU responde `success:false` con `SmartOLT no devolvió ONUs (sin OLTs configurados o credenciales inválidas)`; marca los ausentes (`onu_invalida=true`), limpia los recuperados y notifica (`:1822-1939`).
  - AdminOLT: solo servicios con `sol.id IS NULL` (sin FK smartOLT) (`:694-703`).
  - **Notificaciones** a usuarios activos cuyo arreglo `roles` contiene **`'admin'`** (`smart-olt.service.ts:153-158, 1896-1901`; `admin-olt.service.ts:729-734`): título `N ONU(s) no encontradas en SmartOLT|AdminOLT`, líneas `<cliente> | SN: <sn> | IP: <ip>`; o `ONU no encontrada en SmartOLT` / "La ONU con SN … no responde en SmartOLT. El cliente puede quedar sin internet. Revisa y re-vincula la ONU desde el servicio." Los roles reales usados por la app son `SUPER-ADMINISTRADOR`/`ADMINISTRADOR`, por lo que ❓ puede que **nadie reciba** el aviso (H-19).
  - Efecto en cortes: con `onu_invalida` y sin transición, el corte masivo no envía orden a ONU (`app-queue.processor.ts:91`).
  - Auto-marcado: `habilitarOnu`/`desabilitarOnu` marcan inválida si no se pudo leer el estado **y** falló la orden (`:1066-1068, 1145-1147`).
- **Mensajes (texto exacto):** `Todas las ONUs están correctamente vinculadas en SmartOLT.` / `Todas las ONUs AdminOLT están correctamente vinculadas.`; en la ficha: `ONU inválida: el SN <sn> ya no existe en SmartOLT. Desvincula primero y luego asigna la nueva ONU.`; toast de fondo `Se detectaron N ONU(s) que no existen en SmartOLT y se marcaron como inválidas.`
- **Casos límite:** (1) validar SmartOLT marca como inválidas las ONUs que viven en AdminOLT (no filtra origen) y viceversa para servicios importados sin FK (H-10); (2) si SmartOLT devuelve 403/rate-limit en una OLT, esa OLT se omite y sus ONUs podrían marcarse inválidas por error ❓; (3) la comprobación individual usa `get_onu_details` (una llamada por ONU).
- **Preguntas probables:** ¿Qué significa "ONU inválida"? (el SN guardado ya no existe en la plataforma). ¿Cómo la arreglo? (Desvincular y vincular la ONU correcta). ¿Para qué sirve validar? (detectar clientes que quedaron sin ONU válida antes de un corte). ¿Cada cuánto corre? (solo manual y al abrir servicios; no hay cron).
- **Pendiente de validar en UI:** ❓ si los usuarios reales tienen el rol literal `admin`.

---

## OLT-031 · Ajustes → OLTs: valores por defecto de autorización

- **Ruta UI / name:** `/ajustes/smartolt` · `ajuste.smartolt` (Ajustes → OLTs) ✅
- **Archivos:** FE: `FE:AJ/smartOLT/IndexPage.vue` · BE: `PATCH /settings/:id` (`BE:settings/entities/setting.entity.ts:330-345`: `tr069PerfilDefault`, `smartoltMgmtIpDefault`, `smartoltOnuTypeDefault`)
- **Para qué sirve:** guardar los valores que el formulario de autorizar y la configuración TR-069/Mgmt IP cargan por defecto.
- **Acceso:** guard `ajuste.smartolt` ⇒ `variables.reintentos.smartOLT` **o** `variables.opciones-cortes` (`router/auth-guard.ts:62-65, 105-108`); las tarjetas de cron requieren `variables.reintentos.smartOLT`.
- **Campos:**

  | Tarjeta / etiqueta | Tipo | Valores | Efecto |
  |---|---|---|---|
  | `Perfil TR-069 por defecto` → `Nombre del perfil TR-069` (placeholder `ej. SmartOLT`) | texto | nombre exacto del perfil | autorrellena TR-069 y muestra la sección TR-069 en autorizar/vista de ONU; toast `Perfil TR-069 por defecto guardado` (verifica releyendo `/settings`; si no persiste: `El PATCH respondió OK pero el valor no quedó persistido en BD. ¿Ya corriste la migración y reiniciaste el backend? Revisa la consola.`) |
  | `Tipo de ONU por defecto` → `Tipo de ONU (ej. EG8145V5)` | select buscable (nombres GPON+EPON) | — | preselecciona el tipo al autorizar (prioridad sobre el detectado); toast `Tipo de ONU por defecto guardado` |
  | `Mgmt IP por defecto` (solo si hay perfil TR-069) | `Modo por defecto` (`Inactive`/`Static IP`/`DHCP`), `OLT de referencia para listar VLANs` (si >1 OLT), `VLAN-ID (Mgmt)`, `Tag transform`, `CVLAN-ID`, `SVLAN-ID`, `Subnet mask`, `Gateway`, `DNS 1`, `DNS 2` | — | autoconfigura el formulario Mgmt IP; toast `Mgmt IP por defecto guardado` |
  | `Validación de ONUs` | — | — | OLT-030 |
  | Pestaña `AdminOLT` | solo cron (OLT-028) y validación | — | **no** hay credenciales ni TR-069 aquí |

- **Relaciones:** OLT-005, OLT-009, OLT-028, OLT-030.
- **Casos límite:** el banner `Configura primero el Perfil TR-069 arriba para habilitar la configuración de Mgmt IP por defecto. Si tu SmartOLT no usa TR-069, podés dejar ambos vacíos.`; el PATCH envía solo el campo afectado a `/settings/:id` (sin permiso específico).
- **Preguntas probables:** ¿Qué es el perfil TR-069? (nombre del perfil en SmartOLT; no se puede listar por API). ¿Debo configurarlo si no uso TR-069? (no). ¿Por qué no veo Mgmt IP? (falta el perfil TR-069 por defecto). ¿La VLAN de gestión puede ser la del servicio? (se advierte; normalmente distinta).
- **Pendiente de validar en UI:** ❓ valores reales de `smartoltMgmtIpDefault` en una instalación existente.

---

## OLT-032 · Matriz de permisos y control de acceso

- **Ruta UI / name:** transversal ✅ (`FE:composables/useRolPermisos.js`, `FE:router/auth-guard.ts`, `FE:layouts/SideBarMenu.vue`, `FE:pages/dashboard/usuarios/permisos/*.json`)
- **Modelo:** `validarPermisos('clave')` → `true` si rol[0] = `SUPER-ADMINISTRADOR` o la lista de permisos del usuario (descifrada en el cliente) contiene la clave. La guarda de ruta exige que exista un permiso con el **mismo nombre que la ruta** salvo excepciones (`permisoPorRuta`: `smartOLT_onu-view.index → smartOLT.index`).
- **Claves y efectos:**

  | Clave (etiqueta en el editor de roles) | Qué muestra / permite |
  |---|---|
  | `smartOLT.index` (SmartOLT → Ver) | ítem de menú; `/smartOLT`; vista de ONU; todas las pestañas (incl. API, VLAN, zonas) |
  | `smartOLT_unconfigured.index` (Ver onus no configuradas) | tarjeta "ESPERANDO AUTORIZACIÓN" y ruta `/smartOLT/unconfigured/:olt_id` |
  | `smartOLT.authorize` (Autorizar onus) | ruta `/smartOLT/authorize/:olt_id`; botones `Authorize` y `Autorizar` |
  | `smartOLT.vincular_cliente` (Vincular clientes) | icono de vincular en el listado (deshabilita) y bloque "Vincular ONU a cliente" al autorizar |
  | `smartOLT.habilitar_desabilitar_onu` | ítem Habilitar/Deshabilitar del menú ⚙ **del listado** |
  | `smartOLT.reiniciar_onu` | ítem Reiniciar ONU del menú ⚙ **del listado** |
  | `smartOLT.eliminar_onu` | ítem Eliminar ONU del menú ⚙ **del listado** |
  | `adminOLT.index`, `adminOLT.onu-detail`, `adminOLT.no-autorizadas`, `adminOLT.autorizar` | exigidos por menú/guard pero **ausentes del editor de roles** ⇒ solo SUPER-ADMINISTRADOR |
  | `servicio.vincular.onu` (Gestión de clientes → Servicios → Vincular ONU) | botones SmartOLT/ADM en la ficha del servicio |
  | `variables.reintentos.smartOLT` (Ajustes → SmartOLT: "Configuración de reinicio automático de ONUs") | tarjetas de reinicio automático + acceso a `/ajustes/smartolt` |
  | `variables.opciones-cortes` (Ajustes → SmartOLT: "Opciones de corte") | casillas `Aplicar Cortes/Activación` + acceso a `/ajustes/smartolt` |
  | `variables.aplicar-cortes` ("Aplicar cortes manualmente"), `variables.reintentos.mikrotik` ("Configuración de reintentos automáticos"), `variables.opciones-logs` ("Historial del proceso de cortes"), `ver.logs` ("Ver Logs") | ver OLT-027/029 |

- **Backend:** **ningún endpoint de `smart-olt` ni `admin-olt` comprueba permisos**; `@Auth()` solo valida JWT y que exista usuario (`BE:auth/guards/user-role/user-role.guard.ts:7-19`). Cualquier usuario autenticado puede llamar a, p. ej., `POST /smart-olt/eliminar-onu/:id` o `PATCH /smart-olt/:id` (H-03).
- **Casos límite:** (1) en la **vista de ONU** y en los **cambios masivos** no hay `validarPermisos`: los permisos granulares solo gobiernan el menú del listado; (2) en AdminOLT no hay ningún control fino (ni siquiera eliminar zonas/ONUs); (3) el permiso `smartOLT_unconfigured.index` oculta la tarjeta pero `Unconfigured` consulta igual el contador.
- **Preguntas probables:** ¿Puedo dar acceso a AdminOLT a un técnico? (no hay permiso asignable; solo super-administrador). ¿Un rol sin "Eliminar ONU" puede borrar desde la vista de ONU? (sí, el botón no se condiciona). ¿Por qué no veo el menú de acciones? (permisos por acción). ¿El permiso "Ver" da acceso a las credenciales? (sí, pestaña API).
- **Pendiente de validar en UI:** ❓ si hay otros puntos (roles guardados en BD) con `adminOLT.*` ya asignado manualmente.

---

## OLT-033 · Estados de ONU y su significado

- **Ruta UI / name:** transversal (listados, tarjetas, vista de ONU y motor de cortes de SmartOLT y AdminOLT) ✅
- **Archivos:** FE: `pages/dashboard/Gestion-Red/smartOLT/components/Onus/IndexPageOnus.vue:90-165, 291-313, 399-404`, `…/smartOLT/components/CardsInfoSmartOLT/CardInfo.vue:8-110`, `…/smartOLT/components/Onus/components/HabilitarMasivoModal.vue:14-41`, `…/adminOLT/components/Onus/IndexPageOnus.vue:121-212, 369-375, 504-516`, `…/adminOLT/components/Onus/OnuDetail.vue:118-196, 288-309, 359, 656-666`, `…/adminOLT/components/CardsInfo/CardInfo.vue:8-90` · BE: `smart-olt/smart-olt.service.ts:588-612, 685, 729, 760, 1043-1200`, `smart-olt/habilitacion-onu-queue.processor.ts:17-22`, `admin-olt/admin-olt.service.ts:158-167, 352-395`, `admin-olt/habilitacion-adminolt-queue.processor.ts:29-41`, `monitoreo-trafico/monitoreo-conexion.service.ts:47-129`.
- **Límite de lectura:** los valores de `status`, `administrative_status` y `signal_level` los fija la API de SmartOLT / AdminOLT, que no está en el ZIP. El código no define su catálogo: solo **compara** contra los literales de abajo y pinta el resto con un estilo por defecto. Lo que sigue es, por tanto, "qué reconoce ISPMAX", no "qué puede devolver la plataforma".
- **SmartOLT — `status` de la ONU** (✅ FE:pages/dashboard/Gestion-Red/smartOLT/components/Onus/IndexPageOnus.vue, CardsInfoSmartOLT/CardInfo.vue):
  | Dónde | Cómo lo compara | Resultado |
  |---|---|---|
  | Ícono de la columna **Estado** (`IndexPageOnus.vue:144-156`) | minúsculas con espacios → `_` (`Power fail` → `power_fail`); vacío → `offline` | `online` verde (`public`) · `offline` gris (`public`) · `power_fail` gris (`electrical_services`) · `los` rojo (`link_off`) · cualquier otro: ícono sin color ni símbolo propio |
  | Filtro **Estado:** (botones de ícono, `:99-101, 291-299`) | opciones `Online`, `Offline`, `Power Fail`, `LOS`; compara en minúsculas (acepta `LOS`/`Los`) | filtra la tabla en el navegador |
  | Tarjetas (`CardInfo.vue:20-35, 74-96`) | **igualdad exacta**: `'Online'`, `'Offline'`, `'Power fail'`, `'Los'` | **ONLINE** (+ "Total Autorizados: N") · **TOTAL OFFLINE** = `Offline` + `Power fail` + `Los`, con el desglose "PwrFail: · LoS: · N/A:" (`N/A` = `Offline`) · **LOW SIGNALS** = `Warning` (sin los `Power fail`) + `Critical` |
  | Botón del menú de la fila (`:399-404`) | `status === 'Offline'` (exacto) | "Habilitar ONU"; con cualquier otro estado, "Deshabilitar ONU" |

  Consecuencia ✅: si SmartOLT entregara `LOS` en mayúsculas, el listado y el filtro lo reconocen pero la tarjeta **LoS** no lo contaría (solo cuenta `'Los'`) ❓ (ver pendientes). El backend resume por estado con cualquier texto (`(status || 'desconocido')` en minúsculas y con `_`), sin lista cerrada (BE:smart-olt/smart-olt.service.ts:685), y el monitoreo de conexión solo distingue `status` = `online` (minúsculas) de todo lo demás (`:729`). Para habilitar/deshabilitar usa otro campo, `onu_status` de la señal, en minúsculas y recortado: `offline` ⇒ no envía `disable` (H-08) y `online` ⇒ no envía `enable` (`:1052-1058, 1132-1133`); el job de verificación compara con `online`/`offline` (BE:smart-olt/habilitacion-onu-queue.processor.ts:17-22).
- **SmartOLT — señal** (`signal`): `Very good` (verde), `Warning` (naranja), `Critical` (rojo), `-` (sin dato; sin ícono). El filtro **Señal:** ofrece `Very good`, `Warning`, `Critical` (`IndexPageOnus.vue:90-98, 303-313`); el filtro `Warning` excluye las ONU en `Power fail`. El backend resume por clave `signal` en minúsculas con `_` (`very_good|warning|critical|-`, `:760`).
- **SmartOLT — `administrative_status`** ✅ resuelto: el código **no fija sus valores**. El criterio **Estado administrativo** de *Cambios masivos* arma sus opciones con los valores que traen las ONU de la OLT elegida, uno por renglón con su conteo ("{valor}  (N ONUs)") y `Sin dato` para vacíos (FE:smartOLT/components/Onus/components/HabilitarMasivoModal.vue:14-41); el backend compara el texto tal cual (`BE:smart-olt/smart-olt.service.ts:588-596`). Elegir `Sin dato` no coincide con ninguna ONU (el backend trata el vacío como `null`) y responde "No se encontraron ONUs con ese criterio." (`:612`). Cuáles son los valores reales lo define SmartOLT.
- **AdminOLT — `status`** (✅ FE:pages/dashboard/Gestion-Red/adminOLT/components):
  | Dónde | Cómo lo compara | Resultado |
  |---|---|---|
  | Columna de estado (`Onus/IndexPageOnus.vue:147-165`) | minúsculas | `online` verde (`language`) · `offline` gris (`cloud_off`) · contiene `power` o `fail` naranja (`power_off` si contiene `power`) · otro: gris (`help_outline`); tooltip = `status` o "Desconocido" |
  | Filtro **Estado** (`:121-139, 193-200`) | igualdad **exacta y con mayúsculas**: `Online`, `Offline`, `Power Fail` | si AdminOLT entregara otra capitalización (p. ej. `Power fail`) el filtro no la encuentra |
  | Tarjetas (`CardsInfo/CardInfo.vue:8-23, 56-76`) | minúsculas: `online`; `offline`; contiene `power` | **ONLINE** (+ "Total Autorizados: N"); **TOTAL OFFLINE** = `offline` + `power` con "PwrFail: · N/A:" (**no** hay renglón LoS en AdminOLT); **LOW SIGNALS** = `warning` + `critical` |
  | Botón de acción (`Onus/IndexPageOnus.vue:504-516`, `Onus/OnuDetail.vue:656-666`) | `status.toLowerCase() === 'offline'` | "Habilitar ONU" (ícono `toggle_on`); si no, "Deshabilitar ONU" |
  | Monitoreo de conexión (BE:admin-olt/admin-olt.service.ts:158-167) | minúsculas: contiene `online`, contiene `working` o es `up` | `online` verdadero; todo lo demás `offline` |
  | Verificación tras habilitar/deshabilitar (BE:admin-olt/habilitacion-adminolt-queue.processor.ts:29-41) | `status` en minúsculas **igual** a `online`/`offline` | si no coincide, reenvía la orden y reintenta (4 intentos, retraso 35 s y backoff fijo 60 s, `admin-olt.service.ts:352-395`) |
  | Vista de ONU: sondeo tras acciones (`OnuDetail.vue:118-134, 160-196`) | espera `offline` (deshabilitar) / `online` (habilitar, reiniciar: 25 intentos de 4 s) | actualiza la pantalla cuando coincide o se agota |
  | Campo `enable` (booleano) | `OnuDetail.vue:359` "Habilitada": `Sí`/`No`/`—` | la FE lo cambia localmente tras habilitar/deshabilitar (`:176, 188`) |
- **AdminOLT — `signal_level`** ✅: el listado ofrece como filtro **Señal** `Stable`, `Warning`, `Critical`, `Disable` (igualdad exacta, `:134, 203-212`); la insignia es roja (`Critical`), naranja (`Warning`), gris (`Disable`) o verde (cualquier otro, incl. `Stable`) (`:369-375`); en la vista de ONU la ficha usa roja/naranja/gris y `teal` para el resto (`OnuDetail.vue:303-309`). Las tarjetas solo cuentan `warning` y `critical` (sin distinguir mayúsculas). **`Disable`:** el código no lo define ni lo calcula; ISPMAX solo lo muestra en gris, como "señal no medible/ONU deshabilitada" por contexto, y ninguna regla de negocio ramifica por él (definición exacta: *Límite de lectura*). Niveles ópticos (`optical_rx_power`, `optical_tx_power`): menor que **-27 dBm** rojo, menor que **-24 dBm** naranja, sin dato gris, el resto verde (`OnuDetail.vue:288-293`).
- **En el servicio ISPMAX:** `sn` (ID de ONU), `onu_source` (`smartOLT`/`adminOLT`/vacío), `smartOLT` (FK), `onu_invalida` (SN no encontrado en la plataforma), `isActive` (suspendido/activo), `estado_conexion` (`online` | `offline` | `sin_datos`) calculado cada 5 min por `MonitoreoConexionService.detectar` (cron `*/5 * * * *`): SmartOLT = `status` igual a `online`; AdminOLT = fila anterior; PPPoE por `/ppp/active`; solo servicios activos y no borrados; un servicio sin SN coincidente en la plataforma o con el router/plataforma caídos queda `sin_datos` (`BE:monitoreo-trafico/monitoreo-conexion.service.ts:47-129`).
- **Estados de la acción masiva (progreso):** `procesados/total`, `ok`, `fallidos`, `terminado`, `noEncontrado` (OLT-010).
- **Preguntas probables:** ¿Qué diferencia hay entre Offline y Power fail? (Offline = sin conexión sin causa específica; Power fail = SmartOLT detecta caída de energía). ¿Qué es LOS? (pérdida de señal en la fibra). ¿Qué significa "N/A" en la tarjeta? (Offline). ¿Qué es "sin_datos"? (ISPMAX no pudo determinar el estado). ¿Por qué una ONU deshabilitada aparece Offline? (el corte la deja Offline). ¿Por qué el filtro de estado de AdminOLT no encuentra algunas ONU? (comparación exacta con mayúsculas). ¿Qué significa "Disable" en la señal de AdminOLT? (valor de AdminOLT; ISPMAX solo lo pinta en gris).
- **Pendiente de validar en UI:** ❓ qué literal entrega SmartOLT para pérdida de señal (`LOS` o `Los`) y qué capitalización usa AdminOLT en `status`/`signal_level` (de ello depende que tarjetas y filtros cuenten igual); ❓ cuándo aparece `Disable` en AdminOLT.

---

## OLT-034 · Caché, límites de la API y comportamiento ante errores

- **Ruta UI / name:** transversal ✅ (`BE:smart-olt/smart-olt.service.ts:58-108`, `BE:admin-olt/admin-olt.service.ts:60-103, 188-274`)
- **SmartOLT:**
  - Caché (cache-manager/Redis): listado de ONUs fresco **5 min**; estados y señales **2 min**; respaldo **24 h**; claves `smartolt:onus:<olt>`, `smartolt:status:<olt>`, `smartolt:status-full:<olt>`, `smartolt:signals:<olt>` (`:59-67`). Ante 403/timeout sirve el último dato con `cache:{hit:true, stale:true, ts}`; el front muestra el banner naranja.
  - Se invalida al autorizar (la OLT), eliminar ONU (todas), cambiar perfil individual/masivo, vincular/desvincular (`:367, 465, 556, 664, 1312, 1433, 1491`). `invalidarCacheOnus()` sin OLT borra solo las claves que **ese proceso** recuerda (`onusCacheKeys` en memoria) (`:62, 106-107`) ❓ si hay varias instancias.
  - Endpoints sin caché: detalle, señal, info completa, unconfigured, VLANs, zonas, perfiles, uptime.
  - Límites: SmartOLT rate-limita `get_all_onus_details`/`get_onus_statuses`/`get_onus_signals`; respuestas `rate_limit_exceeded` con `retry_after` son tratadas en otros módulos (auditoría de IP/MAC en `mikrotik.service.ts:3104-3107` y ficha `ServicioInternet.vue`, mensaje `Se superó el límite de consultas de la API SmartOLT. Intenta de nuevo en ~N min.`).
  - Lotes: 10 ONUs por llamada, 120–250 ms de pausa.
  - Errores: `BadRequestException(error.response?.data || error.message)`: el cliente recibe el cuerpo de SmartOLT tal cual (objeto) o el mensaje de axios; `habilitar`/`desabilitar` devuelven un 500 genérico.
- **AdminOLT:**
  - Sin caché; cada pantalla vuelve a consultar. GET/POST con timeout 15 s; DELETE sin timeout; autorizar sin timeout.
  - WebSocket: `GET` → `facility` → `wss://<host>/ws/<facility>?subscribe-broadcast` + mensaje `Get response_data`; estados `PROGRESS`/`DONE`; hasta 12 intentos de 15 s (8 para señal) con 1 s entre ellos; si no llega `DONE` devuelve `null` (listas vacías sin error) (`:196-274`).
  - Mensajes de error normalizados: `err.response.data.detail` o `err.message` o `Error en AdminOLT`; HTML eliminado en autorizar/eliminar/wifi.
- **Seguridad de transporte de imágenes:** los PNG de SmartOLT (tipo de ONU, gráficos) se piden con `?token=<JWT>` en la URL (`FE:S/components/OnuView/composables/useOnuView.js:78-103`).
- **Preguntas probables:** ¿Por qué los datos están "viejos"? (caché de 5 min / banner de caché). ¿Por qué falla de pronto con muchos clientes? (límite de la API de SmartOLT). ¿Por qué AdminOLT tarda? (WebSocket sin caché). ¿Los gráficos de la ONU los guarda ISPMAX? (no, vienen de SmartOLT).
- **Pendiente de validar en UI:** ❓ tiempos reales con >5 000 ONUs.

---

## Hallazgos del dominio

> Formato: **H-xx** — resumen · evidencia · impacto/recomendación para el manual. 🔴 alto · 🟠 medio · 🟡 bajo.

**H-01 🔴 El manual actual contradice el código en dónde se configuran las credenciales y en campos que no existen.**
`docs/guia/olts-ajustes.mdx` documenta "Dominio / API Key / Subdominio / API Key / **Activar ONU**" dentro de **Ajustes → OLTs** y `adminolt.mdx`/`smartolt.mdx` dicen que las credenciales se cargan en Ajustes → OLTs. En el código las credenciales viven solo en la pestaña **API** de `/smartOLT` y `/adminOLT` (OLT-002/016) y `activarOnu` no tiene campo ni lógica (`FE:S/components/Api/composables/useApi.js:9`, `FE:A/components/Api/composables/useApi.js:9`). Además:
- `smartolt.mdx` describe Zonas/VLANs/Perfiles como "catálogos que se consultan"; en realidad **se pueden crear** zonas y VLANs en SmartOLT (OLT-012/013) y AdminOLT permite CRUD de zonas (OLT-023).
- `adminolt.mdx` lista "Panel de información", "ONUs con mala señal" y "Habilitar/Deshabilitar Internet y CATV" como funciones, pero **no tienen pantalla** (solo endpoints, H-07); las acciones CATV reales son `Habilitar CATV`/`Deshabilitar CATV` por ONU.
- `olts-ajustes.mdx` (Mgmt IP/TR-069 por defecto) menciona "Dominio"/"API Key"/"Nombre del perfil TR-069" bajo SmartOLT; la pestaña AdminOLT de Ajustes **no** tiene credenciales ni "Activar ONU".
- `cortes.mdx`: "Si desactiva **Mikrotik** en *Aplicar cortes en*, el cliente quedará marcado como suspendido pero seguirá navegando" — el backend **nunca lee** `aplicarCortes.mikrotik` (H-05). "La configuración personalizada de un router reemplaza por completo a la global" — el código fusiona por clave (`onu-corte.utils.ts:38-44`), aunque la UI envía las tres.

**H-02 🔴 Credenciales expuestas.** (a) `GET /smart-olt` y `GET /admin-olt` devuelven el registro con la API Key en claro a **cualquier** usuario autenticado (`smart-olt.controller.ts:30-33`, `admin-olt.controller.ts:14-17`) y el UI la muestra sin enmascarar; (b) si falla el job de reinicio masivo, el log guarda `jobData` con el objeto SmartOLT (dominio + API Key) (`reinicio-smartolt-queue.processor.ts:273-287`); los jobs llevan `smartOLT` y `settings` completos a Redis; (c) token público de Mapbox escrito en el componente (`MapVistaAdminOlt.vue:24`, H-14); (d) el JWT viaja en `?token=` para imágenes de SmartOLT (OLT-034).

**H-03 🔴 Permisos solo en el cliente.** Todos los endpoints de `smart-olt`/`admin-olt` se protegen únicamente con JWT (`UserRoleGuard` solo comprueba que haya usuario). Además, la **vista de ONU** (`FE:S/components/OnuView/IndexPage.vue`) y los **cambios masivos** no comprueban `smartOLT.reiniciar_onu`, `...habilitar_desabilitar_onu` ni `...eliminar_onu`; la pestaña **API** no tiene permiso propio. Un usuario con solo `smartOLT.index` puede reiniciar, cortar, restaurar de fábrica y eliminar ONUs, o cambiar credenciales.

**H-04 🔴 AdminOLT inasignable por roles.** Menú y rutas exigen `adminOLT.index`, `adminOLT.onu-detail`, `adminOLT.no-autorizadas`, `adminOLT.autorizar`, pero el catálogo del editor de roles (`gestion-red-permisos.json`) solo trae SmartOLT. Resultado: AdminOLT solo para SUPER-ADMINISTRADOR (ya reconocido en `primeros-pasos.mdx:211`); y los enlaces desde la ficha del cliente (`ClienteSN.vue`, `VincularOnuAdminOLT.vue`) rebotarían a un rol normal.

**H-05 🟠 La casilla "Mikrotik" de "Aplicar Cortes/Activación" no tiene efecto.** `aplicarCortes.mikrotik` no se lee en ningún punto del backend (solo `.smartOLT` y `.adminOLT`: `app-queue.processor.ts:213-219`, `customers.service.ts:2714-2742, 2946-2960`). MikroTik se aplica siempre. Corregir `cortes.mdx` o el código.

**H-06 🟠 Eliminar una ONU SmartOLT desde la vista de ONU deja el `sn` en el servicio.** `DeleteOnuModal` solo limpia el servicio si recibe `servicio_id` (`DeleteOnuModal.vue:29-35`); desde `OnuView` se pasa `onuDetails.servicio_id`, que `get_onu_details` no incluye (`IndexPage.vue:526-527`), y el backend `eliminarOnu` tampoco lo limpia (a diferencia de AdminOLT). Consecuencia: servicio con SN huérfano, luego marcado `onu_invalida`.

**H-07 🟡 Código muerto / endpoints sin pantalla.** SmartOLT: `POST actualizar-tipo-onu/:id`, `GET odbs/:zone_id`, `GET todos-estado-onu/:olt_id`, `GET senales/:olt_id`, `GET status-onus/:olt_id` (sin llamadas desde el frontend); `dto/moveOnu.dto.ts` (`MoveOnuDto`) no se importa en ningún sitio; el comentario de `enable-tr069.dto.ts` cita un `/smart-olt/tr069-profiles` que no existe. AdminOLT: `GET onus-mala-senial`, `GET panel-info`, `POST habilitar-internet-catv`, `POST deshabilitar-internet-catv`, `GET zonas/:zone_id`; componentes `Vlans/IndexPageVlans.vue` y `useVlans.js` no montados. Campo `activarOnu` (entidades, DTO, FormApi) sin uso.

**H-08 🟠 "Offline" se trata como "ya deshabilitada".** `desabilitarOnu` retorna sin enviar `disable` cuando el estado leído es `offline` (`smart-olt.service.ts:1058`); una ONU apagada o desconectada física no queda administrativamente deshabilitada y al encenderse recuperaría el servicio. Idéntico razonamiento para `online` en `habilitarOnu` (`:1133`), con respuesta vacía.

**H-09 🟠 Selector de zona del modal de ubicación (SmartOLT).** `UbicacionOnuModal.vue:62-64` usa `q-select` con opciones `{label,value}` sin `emit-value`/`map-options`: al elegir una zona se enviaría un objeto en `zone` (el DTO declara `zone?: string`; con `enableImplicitConversion` puede llegar como `[object Object]`). ❓ confirmar en UI si cambiar la zona funciona.

**H-10 🟠 Criterio inconsistente para decidir SmartOLT vs AdminOLT.** Corte/monitoreo/ficha usan `onu_source` (con fallback a SmartOLT); `VincularOnuAdminOLT.vue:76` usa ausencia del FK `smartOLT`; `validarOnusVsAdminOlt` usa `sol.id IS NULL`; `validarOnusVsSmartOlt` no filtra origen. Servicios importados por plantilla (sin `onu_source` ni FK) se asumen SmartOLT en corte pero entran en la validación de AdminOLT; la validación SmartOLT puede marcar inválidas las ONUs de AdminOLT.

**H-11 🟠 AdminOLT oculta fallos del WebSocket.** `obtenerOnusNoAutorizadas` devuelve `[]` si el WS nunca responde `DONE` (`admin-olt.service.ts:123-139`), y el front muestra "No hay ONUs pendientes de autorización" o contador 0; igual para VLANs.

**H-12 🟡 Posible `NaN` en `NAP / Splitter` (AdminOLT).** El valor del select es el texto `odb_splitter` y se envía `Number(...)` (`FormAutorizarOnu.vue:101-104, 134`); si el texto no es numérico el DTO (`@IsNumber`) lo rechaza ❓.

**H-13 🟡 Textos/UX.** Placeholder de NAPs "Buscar por nombre, código, zona..." filtra solo `id`/`odb_splitter`; `Desabilitar_HabilitarOnuModal` con `Cancelar` sin manejador; modal "¿Reiniciar ONU?" con pregunta sin cerrar; modal de ubicación siempre "Editar"; mensaje de error del modal de habilitar interpola un `ref` (`Error al ${action} la ONU`); `useOnuView.fetchOnuFullInfo` usa `detalle-onu` mientras `useOnus.fetchOnuFullInfo` usa `info-completa-onu`; nombres de acción de log `HABILITAR_ONU`/`DESABILITAR_ONU` para *vincular/desvincular* (`customers.service.ts:2403-2418`).

**H-14 🟡 Token de Mapbox hardcodeado** (`MapVistaAdminOlt.vue:24`; es un token público `pk.*` pero debería ser configurable) y popups con HTML sin sanear.

**H-15 🟡 Nombre engañoso del permiso `variables.reintentos.smartOLT`.** En el editor de roles se rotula "Configuración de reinicio automático de ONUs" y gobierna el reinicio programado (OLT-028) y el acceso a `/ajustes/smartolt`, no los "reintentos"; los reintentos de corte usan `variables.reintentos.mikrotik`. Ambas tarjetas de cron comparten título y permiso (AdminOLT también usa `...smartOLT`).

**H-16 🟠 SmartOLT sin `modo` por defecto en el reinicio automático.** El valor por defecto de `reiniciosSmartOLT` no incluye `modo` (`setting.entity.ts:160-171`); el procesador trata cualquier valor distinto de `'vinculados'` como "reiniciar TODAS las ONUs" (`reinicio-smartolt-queue.processor.ts:228-232`). Si el usuario activa el toggle y guarda sin elegir un radio, se reinician **todas** las ONUs de todas las OLT.

**H-17 🟠 Reinicio programado pierde la programación si la fecha ya pasó** (`smart-olt.service.ts:242-245`): sin job ni reintento hasta volver a guardar. AdminOLT no reprograma al arrancar (sin `onModuleInit`).

**H-18 🟡 `rebootOnusLinked` (SmartOLT) incluye servicios retirados y de AdminOLT** (no filtra `deleted` ni `onu_source`) (`reinicio-smartolt-queue.processor.ts:132-137`), frente a la versión AdminOLT que sí filtra.

**H-19 🟠 Avisos de "ONU no encontrada" dirigidos a rol `'admin'`.** Las consultas usan `'admin' = ANY(u.roles)` (`smart-olt.service.ts:155, 1898`; `admin-olt.service.ts:731`) mientras los roles reales son `SUPER-ADMINISTRADOR`/`ADMINISTRADOR`. ❓ Podría no llegar a nadie.

**H-20 🟡 Estado compartido y datos que persisten en autorizar (SmartOLT).** `form` global en `useAuthorize.js` conserva `name`/`address_or_comment`/`zone`/`vlan` entre altas; `ONU external ID` es editable pero la vinculación usa `unique_external_id`; la dirección admite 140 caracteres en UI y se corta a 60 en backend (`texto-seguro.ts:5`).

**H-21 🟡 Logs AdminOLT.** Solo se registra con usuario: cortes/activaciones automáticas por AdminOLT no dejan log de acción (solo `VERIFICACION_FALLIDA` si falla); acciones con nombres en minúsculas no mapeados a etiquetas.

**H-22 🟡 Vinculación en la ficha del cliente no usa el endpoint orquestado.** `VincularOnu.vue:140-150` hace dos llamadas paralelas sin compensación y la desvinculación deja el nombre del cliente en la ONU, a diferencia de `/smart-olt/vincular-cliente`/`desvincular-cliente` (que ponen `-`).

**H-23 🟡 Aplicar cortes manualmente carga alta.** Con `sincronizarOnus:true` se reenvía el estado a todas las ONUs vinculadas; cada `desabilitar/habilitar` de SmartOLT hace 2 lecturas + 1 escritura + 1 job (rate limit).

**H-24 🟡 Cierre: tarjetas y filtros de estado comparan distinto.** SmartOLT: las tarjetas cuentan por igualdad exacta (`'Online'`, `'Offline'`, `'Power fail'`, `'Los'`, `CardInfo.vue:22-27`) mientras que el listado y el filtro comparan en minúsculas (`IndexPageOnus.vue:99-101, 151-155`). AdminOLT: las tarjetas comparan en minúsculas (`CardInfo.vue:9-13`) pero los filtros **Estado** y **Señal** usan igualdad exacta (`IndexPageOnus.vue:133-134`) y solo conocen `Online/Offline/Power Fail` y `Stable/Warning/Critical/Disable`. AdminOLT no tiene renglón LoS en sus tarjetas. Si la plataforma devuelve otra capitalización, contadores y filtros difieren ❓.

**H-25 🟡 Cierre: AdminOLT › MAPS.** (a) Cambiar de mapa estando en **Vista Mapa** solo recarga los marcadores (`IndexPageMaps.vue:39-49, 94-109`) ❓; (b) cada re-dibujo suma otro `click` a las capas (popups repetidos) ❓; (c) un shape de 2 puntos se dibuja como línea sin popup (`MapVistaAdminOlt.vue:196-200`); (d) la pestaña no depende del selector de OLT; (e) `GET /admin-olt/maps/:map_id` no lo usa el frontend. `docs/guia/adminolt.mdx` describe la pestaña como "Mapa de OLT/NAP (solo lectura)": en el código son los mapas de planta externa de AdminOLT (marcadores, cables, shapes y polígonos), no un mapa de OLT/NAP.

---

## Pendiente de validar en UI (consolidado)

❓ Todo lo siguiente solo puede cerrarse con una instancia real:
1. Capitalización con la que SmartOLT entrega la pérdida de señal (`LOS` o `Los`) y con la que AdminOLT entrega `status`/`signal_level`: listados, filtros y tarjetas comparan de formas distintas (OLT-033). `administrative_status` ya no está pendiente: el código no fija sus valores (el modal de cambios masivos los toma de las ONU).
2. Si `Authorize` muestra datos del alta anterior (estado compartido) y qué ocurre si no existe el perfil `1G`.
3. Si el cambio de **Zona** desde el modal de ubicación funciona (H-09) y el tipo de cambio de zona en SmartOLT.
4. Presencia del registro `smartOLT` en instalaciones nuevas (no hay semilla ni `POST`), y el formato aceptado del dominio.
5. Comportamiento visible de la casilla `Mikrotik`; y cómo muestra la ficha el resultado de la orden de ONU tras suspender/activar.
6. Si algún usuario real tiene el rol literal `admin` (notificaciones de ONU inválida).
7. Tiempos de WebSocket de AdminOLT, formato de `odb_splitter` y ids numéricos de catálogos (`tipos-onu`, perfiles).
8. Qué muestra la tabla de Logs para acciones AdminOLT en minúsculas y para `VERIFICACION_FALLIDA`.
9. Si una ONU eliminada reaparece en "ONUs no configuradas" y cuánto tarda.
10. Efecto de `Restaurar de fábrica` y de `Reiniciar` sobre el servicio (duración real).
