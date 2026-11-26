# Inventario CLI1 — Clientes (listado, alta, edición, estados, facturación del cliente)
> Alcance: FE `pages/dashboard/clientes/` (IndexPage, AddCliente, EditCliente, RecuperarCliente, cell_renders, composables, components de primer nivel, components/modals, y de components/editar: IndexPage, ResumenPage, ConfiguracionPage, ResumenNotificaciones, FacturacionPagos, IndexFacturas, PagoItem, RecursosCliente, InfoAdicionalCampos, StepUploadImages, CobroEnlaceDialog) · BE `src/customers/**` + lo que invoca directamente (`app.service`/`app-queue.processor` cortes, `mikrotik` export/reparar, `pagos` sincronización, etc.). Generado desde el ZIP del 2026-10-06.
> Convención de citas: `FE:` = `frontend-isp-main/src/…`, `BE:` = `backend-isp-main/src/…`. ✅ = leído en código. Nada marcado 🖥️ (no hay instancia).
> Lo que cubre CLI2 (solo se enlaza): `components/editar/Servicios/**`, `Consumo/`, `ServiciosPage`, `SelectorServiciosCliente`, `ConexionEquiposPage`, `VincularEquipoClienteModal`, `GruposFacturacion`, `ConfigAutomaticaGrupo`, `TerceroGrupo`, `logs/`.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| CLI-001 | Listado de clientes: filtros superiores, búsqueda y paginación | `/clientes` (`index.clientes`) · menú Gestion de Clientes → Clientes | `index.clientes` | completo |
| CLI-002 | Columnas y filtros por columna de la tabla | `/clientes` | (ninguno específico) | completo |
| CLI-003 | Selección múltiple y acciones masivas | `/clientes` | `cliente.activar.inactivar`, `retirar.cliente`, `eliminar.cliente` | completo |
| CLI-004 | Importar Excel / Descargar Plantilla / Exportar Clientes | `/clientes` → botón Excel | (sin permiso en el front) | completo |
| CLI-005 | Acciones por fila (Editar, Suspender/Activar, Retirar, Eliminar, Ver detalles) | `/clientes` columna Acciones | `cliente.edit`, `cliente.activar.inactivar`, `retirar.cliente`, `eliminar.cliente`, `detalles.cliente` | completo |
| CLI-006 | Ver detalles → "Listado de Servicios" (reactivar servicio retirado / eliminar definitivamente) | diálogo desde `/clientes` | `detalles.cliente` | completo |
| CLI-007 | Estados del cliente y del servicio; motor de corte/reactivación automática | transversal | — | completo (efecto visual ❓) |
| CLI-008 | Crear cliente — paso "Datos Personales" | `/clientes/add` (`crear.cliente`) | `crear.cliente` | completo |
| CLI-009 | Crear cliente — paso "Facturación y Notificaciones" | `/clientes/add` | `crear.cliente` | completo |
| CLI-010 | Crear cliente — paso "Servicios" (router, plan, IP, PPPoE, NAP, Wi-Fi) | `/clientes/add` | `crear.cliente` | completo |
| CLI-011 | Guardado del alta: qué crea el backend y qué puede fallar | `POST /api/customers` | — | completo |
| CLI-012 | Mensaje de bienvenida (automático y manual) | alta / `ModalMessageWelcome` | `servicio.bienvenida` (fila), `variables.edita.mensaje.bienvenida` | completo |
| CLI-013 | Editar cliente: estructura y pestañas | `/clientes/edit/:client_id` (`cliente.edit`) | `cliente.edit` + `resumen.index`… | completo |
| CLI-014 | Pestaña Resumen (datos del cliente, resumen de notificaciones, info adicional) | `?view=resumen` | `resumen.index`, `resumen.editar_cliente`, `resumen.notificaciones` | completo |
| CLI-015 | Facturación/Pagos › Configuración del cliente (FactAndNot en modo edición) | `?view=facturacion` → Configuración | `cliente.factura.configuracion.index`, `cliente.factura.configuracion.edit` | completo |
| CLI-016 | Recordatorios de pago por cliente | Configuración → Notificaciones | idem | completo |
| CLI-017 | Facturación automática por servicio | Configuración | idem | completo |
| CLI-018 | Facturar a tercero (datos de facturación distintos) | Configuración / banner de cobro | idem | completo |
| CLI-019 | Pagos automáticos: sucursal de cobro (bot / pasarelas) | Configuración | idem | completo |
| CLI-020 | Imágenes del servicio (carga de archivos) | paso "Imagenes" (vista de servicio) | — | completo |
| CLI-021 | Recursos del cliente (equipos y accesorios) | componente `RecursosCliente` | (ninguno; pestaña `servicio.index`) | completo |
| CLI-022 | Facturas del cliente (pestaña Facturas / PagoItem) | `?view=facturacion` → Facturas | `cliente.factura.index` … | completo |
| CLI-023 | Modales de cobro y facturación (pago, nueva factura, factura libre, etc.) | `components/modals` | ver sección | completo |
| CLI-024 | Cobro por enlace (pasarela) | `CobroEnlaceDialog` | `cliente.factura.add` | completo |
| CLI-025 | Suspender / activar servicio (manual) | `/clientes` y pestaña Servicios | `cliente.activar.inactivar` | completo |
| CLI-026 | Retirar servicio / cliente | `/clientes` | `retirar.cliente` | completo |
| CLI-027 | Eliminar cliente | `/clientes` | `eliminar.cliente` | completo |
| CLI-028 | Cambio de plan, IP, router, MAC, PPPoE de un servicio | formulario "Servicios" en edición | `servicio.editar` (CLI2) | completo |
| CLI-029 | API backend `customers`: catálogo de endpoints y guardas | `/api/customers/**` | — | completo |
| CLI-030 | Validaciones de cédula/RUC, correo, teléfono y coordenadas (transversal) | alta/edición | — | completo |
| CLI-031 | Límite de clientes por suscripción | alta / importación / reactivación | — | completo |
| CLI-032 | Campos personalizados del cliente (`custom_data`) | alta, resumen, listado | — | completo |
| CLI-033 | Columna «Fact. Automática» del listado | `/clientes` | — | completo (el backend no la envía ⚠️) |
| CLI-034 | Estado «Retirado» al exportar (y qué hace la importación con él) | `/clientes` → Excel | — | completo |

---

## CLI-001 · Listado de clientes: filtros superiores, búsqueda y paginación
- **Ruta UI / name:** `/clientes/:estado_servicio?` · `index.clientes` · menú lateral "Gestion de Clientes" → "Clientes" (`FE:layouts/SideBarMenu.vue:266-275`, visible con `index.clientes`). El resaltado del ítem también cubre `/mapa-clientes`. ✅
- **Archivos:** FE: `pages/dashboard/clientes/IndexPage.vue`, `composables/useClientesIndex.js`, `composables/useCliente.js`, `cell_renders/*`, `stores/auth-user.ts` (persistencia) · BE: `customers/customers.controller.ts:134-169` (`GET /api/customers/:estado?`), `customers.service.ts:1153-1475` (`buildCustomerIdsQuery`), `:1520-1670` (`findAll`), `:1493-1518` (`conteoFiltros`).
- **Para qué sirve:** Lista paginada **del servidor** de clientes con sus servicios (una fila por cliente; si el cliente tiene varios servicios, se apilan dentro de la fila). Permite filtrar por router, estado, red, plan y caja NAP, buscar texto libre y operar sobre varios clientes.
- **Acceso:** ruta con `meta.requiresAuth`; el guard exige un permiso llamado como la ruta (`index.clientes`) o rol SUPER-ADMINISTRADOR (`FE:router/auth-guard.ts:135-141`). El backend solo exige JWT (`@UseGuards(ServiceTokenGuard)` acepta JWT o `x-service-token`; `BE:customers.controller.ts:134-135`, `BE:deploy/service-token.guard.ts`). **El backend no valida claves de permiso en ningún endpoint de customers** (`@Auth()` = JWT + usuario presente, `BE:auth/guards/user-role/user-role.guard.ts`). ✅
- **Secciones / pestañas:** una sola tarjeta de filtros + tabla ag-grid + barra inferior de paginación. La ruta admite `:estado_servicio?` pero **IndexPage no lo lee** (ver Hallazgos).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| (select) `Por Router:` | Elige el router; opciones = `estadosStore.routers` (viene del login/`permisos`, solo routers asignados al usuario; "TODOS" aparece solo si hay >1 router, `BE:auth/auth.service.ts:285-313`). Con "TODOS" se envían todos los routers con valor | — | `GET /customers` header `router-id` = JSON de ids | Al cambiar de router se limpian filtros Red/Plan/Caja y página=1 (`IndexPage.vue:695-704`) |
| (select) `Estado:` | Filtra por estado (ver Estados) | — | param `estado` | Persiste en `authUserStore.selectCustomerEstado`; al cambiar vuelve a página 1 (`:719-724`) |
| (select, solo si Estado = Suspendidos) | `Cualquiera`, `1 Mes suspendido` … `10 Meses suspendido` | — | param `mesesSuspendidos` (número) | Ver "Reglas" |
| (select múltiple) `Red:` | Redes IPv4 del router, con contador de clientes `(n)`; muestra "Todos"/"N red(es)" | — | param `red_id` (ids separados por coma) | **Deshabilitado si el router elegido es "TODOS"** (`:198`). Se aplica al cerrar el desplegable |
| (select múltiple) `Plan:` | Planes del router con contador | — | param `plan_id` | idem |
| (select múltiple) `Caja NAP:` | Cajas NAP del router con contador | — | param `caja_id` | idem |
| `Agregar Cliente` (botón) / botón flotante `+` en móvil | Ir a `crear.cliente` | `crear.cliente` | — | `IndexPage.vue:297-304`, `:526-538` |
| (icono Excel, desplegable) | `Importar Excel`, `Descargar Plantilla`, `Exportar Clientes` (ver CLI-004) | **ninguno** | — | En xs va dentro de la barra de acciones (`:159-178`) |
| `OCULTAR COLUMNAS` (select múltiple con toggles) | Muestra/oculta columnas; persiste en `authUserStore.visibleColumnsCustomer` | — | — | Lista = todas las columnas salvo `select` y `actions` (`:1031-1038`) |
| `Buscar...` (input, debounce 800 ms) | Búsqueda general en servidor | — | param `search` | Ver "Reglas" |
| `Elementos por página` (select) | 10, 15, 20, 50, 100 | — | param `limit` | Persiste en `authUserStore.customerPageSize`; "Todos" ya no existe y cae a 10 (`:593-598`) |
| iconos `first_page`, `arrow_back_ios`, `keyboard_arrow_right`, `last_page` | Navegar páginas | — | param `page` | Texto "`N a M de T`" y "`Pagina X de Y`" |

- **Campos de formulario:** ver tabla anterior (son filtros). Estado persistido entre visitas: estado, página, tamaño de página, búsqueda, filtros de columna (`gridFilterModel`), columnas visibles y orden de columnas, red/plan/caja (`authUserStore.*`, `IndexPage.vue:577-602`).
- **Filtros y columnas de tabla:** ver CLI-002.
- **Estados posibles del filtro `Estado:`** (opciones literales, `IndexPage.vue:49-58`): `Todos`, `Pagados`, `No Pagados`, `Activos`, `Inactivos`, `Retirados`, `Clientes con IP sin facturación`, `Suspendidos`. Semántica real del backend en CLI-007.
- **Reglas de negocio (backend):**
  - Búsqueda general (`search`): cada palabra (separadas por espacios) debe aparecer en alguno de: nombres, número de documento, email, celular, dirección principal, IPv4, IPv6, dirección del servicio o nombre del plan (AND entre palabras, OR entre campos) (`BE:customers.service.ts:1380-1405`). ✅
  - Paginación en dos pasos: primero IDs paginados + total, luego datos completos solo de esos IDs (`:1559-1614`). Orden por defecto `customer.created_at DESC` (`:1233`). Orden servidor solo para `nombres`, `direccion`, `planes`, `ip`, `direccion_principal` (`FE:IndexPage.vue:735-758`, `BE:1200-1234`); cualquier otro clic de orden se limpia.
  - Con filtro Red/Plan/Caja, la fila muestra **solo los servicios que coinciden** (`BE:1616-1630`).
  - Para cada servicio se calcula `resumen` (fecha de pago/corte, deuda) vía `AppService.getFechaMaximoPago` → job Bull `obtenerFechaMaximoPago`, con caché 25 min (`BE:app.service.ts:52-77`). **Se ejecuta uno por servicio, en secuencia, en cada carga de página** (`BE:customers.service.ts:1657-1664`).
  - "Suspendidos" + N meses: servicio inactivo y no retirado cuyo número de pagos `NO PAGADO`/`PENDIENTE` con `dia_pago + dia_gracia < ahora` es **exactamente N+1** (`HAVING COUNT(*) = :mesesRequired`, `required = N + 1`) (`BE:1414-1432`). ✅ (semántica "exactamente" ❓ por validar con datos reales).
  - Sin header `router-id` o con lista vacía **no se filtra por router** (`BE:1236-1238`); tampoco se filtra por `company_id` en `findAll`. ✅
- **Efectos secundarios externos:** ninguno en la carga (solo lectura). Cada fila dispara además `POST /api/pagos/ultimo-pago` (un request por página) para la columna "Ultimo pago" (`FE:IndexPage.vue:1197-1211`).
- **Mensajes de error/éxito (texto exacto):** `No se logro cargar los clientes, por favor recargue` (warning, `:1217`); `No se pudo obtener los registros` (select-all, `:821`); `No hay routers disponibles` (export con "Todos" sin routers, `:856`).
- **Relaciones con otros módulos:** routers (`/router`), planes (`/internet`), cajas NAP (`/caja-nap`), redes IPv4 (`/red-ipv4`), pagos (`/pagos/ultimo-pago`), custom-fields (`/custom-fields` agrega columnas `custom_<nombre>`), dashboard (el tile "No pagadas" navega con `params.estado_servicio='No Pagados'`, `FE:pages/dashboard/panel/components/TotalFacturasNoPagadas.vue:26-27`).
- **Casos límite y advertencias:**
  - Un cliente con servicios en varios routers aparece una sola vez. Los IDs se filtran por router (`BE:1236-1238`), pero la segunda consulta (datos completos, `BE:1574-1630`) solo vuelve a filtrar por red/plan/caja, **no por router** → ❓ la fila puede mostrar también los servicios del cliente que están en otros routers.
  - El alto de fila es `nº de servicios × 43 px` (`FE:IndexPage.vue:707-709`): un cliente sin servicios activos (`facturaCliente` vacío) tendría alto 0.
  - `getRowHeight` y los `valueGetter` asumen `servicio_id[0]` presente: una factura-cliente sin servicio rompería la fila (la query usa `innerJoin`, por lo que un cliente sin servicio **no aparece nunca en el listado**, pero sí en "Personas").
- **Preguntas probables de usuarios:**
  1. "¿Por qué no veo a un cliente que acabo de crear?" (¿router seleccionado distinto? ¿filtro Estado/Red/Plan activo? los filtros persisten entre sesiones).
  2. "¿Qué diferencia hay entre Inactivos y Suspendidos?" (misma condición; Suspendidos añade el selector de meses).
  3. "¿Por qué 'No Pagados' no muestra a quien debe una factura?" (exige alcanzar la tolerancia de corte, ver CLI-007).
  4. "¿Cómo busco por IP, por dirección o por nombre del plan?" (input Buscar...).
  5. "¿Por qué no puedo elegir Red/Plan/Caja?" (está en 'TODOS' los routers).
  6. "¿Cómo ordeno por nombre/IP/plan/dirección?" (solo esas columnas ordenan en servidor).
  7. "¿Cómo selecciono todos los clientes del filtro, no solo la página?" (botón `done_all`, CLI-003).
  8. "¿Dónde quedó 'Todos' en elementos por página?" (retirado; máx. 100).
- **Pendiente de validar en UI:** ❓ Contenido exacto de las opciones del selector de router cuando el usuario tiene un solo router (no aparece "TODOS"). ❓ Si el listado realmente muestra servicios de otros routers cuando se filtra por un router. ❓ Comportamiento cuando `Estado` guardado es 'Suspendidos' y el usuario vuelve a la pantalla (el selector de meses se resetea a 'Cualquiera' porque `mesesSuspendidos` no se persiste).

---

## CLI-002 · Columnas y filtros por columna de la tabla
- **Ruta UI / name:** `/clientes` · cabecera de la tabla ag-grid (filtro flotante en cada columna: `floatingFilter: true`, `FE:IndexPage.vue:1025-1029`).
- **Archivos:** FE: `composables/useClientesIndex.js:65-410`, `cell_renders/*.vue`, `composables/translateTable.js` (textos del grid en español).
- **Para qué sirve:** Mostrar los datos del cliente/servicio y filtrar por columna; los filtros de columna se **envían al servidor** (`filters` JSON) y también se re-aplican en cliente (`filtrarFacturasCliente`).
- **Acceso:** igual que CLI-001. Sin permisos por columna.
- **Columnas (orden por defecto del grid; `field` → `headerName`):** ✅ `useClientesIndex.js`

| field | Encabezado | Qué muestra / origen | Filtro servidor (`fieldMapping`) |
|---|---|---|---|
| `select` | (checkbox, cabecera con seleccionar página) | selección de fila | — |
| `nombres` | `CLIENTE` | nombre; enlace a `cliente.edit` (`ClientesNamePage`) | nombres o nº documento, multi-palabra |
| `ip` | `IPV4` | IPv4 por servicio; enlace `http://<ip>` en nueva pestaña salvo servicio retirado (rojo) (`ClienteIPV4`) | `servicio.ipv4` |
| `ipv6` | `IPV6` | IPv6 o `---` | `servicio.ipv6` |
| `mac_address` | `Mac Address` | MAC o `---` | **sin mapeo en backend** (`mac_address` no está en `fieldMapping`; el filtro se ignora en servidor) |
| `contrato` | `N° Contrato` | `servicios-clientes.contrato` | **sin mapeo** (ídem) |
| `sn` | `SN ONU` | SN con sufijo `(SmartOLT)` o `(AdminOLT)`; clic navega a `smartOLT_onu-view.index` (con `cliente_id`) o `adminOLT.onu-detail` (`ClienteSN`). `onu_source` null → SmartOLT | `filter:false` |
| `planes` | `Planes` | `perfil_internet.nombre_plan` | multi-palabra sobre nombre del plan |
| `dia_corte` | `Dia de Corte` | `resumen.fechaCorte` o `Desactivado`; verde si el mes es futuro, rojo si no (`ClienteDiaCorte`) | **sin mapeo** |
| `direccion` | `Dirección Servicio` | `servicios-clientes.direccion` | multi-palabra |
| `t_doc` | `T. Doc.` | `Cedula` / `RUC` / `Pasaporte` (`tipo_documento == 5 → Cedula`, `4 → RUC`, otro → Pasaporte; **el código `07` aparece como "Pasaporte"**, `IndexPage.vue:1193`) | mapa `cedula→5, ruc→4, pasaporte→6` (`BE:1363-1366`): el backend busca `LIKE %5%`/`%4%`/`%6%` sobre el enum guardado ('05','04','06','07'); coincide por subcadena (funciona, pero es frágil) |
| `numero_documento` | `Num. de Doc.` | documento | `customer.numero_documento` |
| `direccion_principal` | `Dirección principal` | `customers.direccion` | `customer.direccion` |
| `email` | `Email` | — | `customer.email` |
| `celular` | `Movil` | — | `customer.celular` |
| `instalado` | `Instalado` | fecha de instalación `DD/MM/YYYY` por servicio | admite `dd/mm/yyyy`, `dd/mm`, texto |
| `aplicar_corte` | `Aplicar Corte` | `factura.aplicar_corte` (p. ej. `1 Mes Vencido`, `Desactivado`) | `facturaCliente.aplicar_corte` |
| `ultimo_pago` | `Ultimo pago` | fecha del último pago o `Sin Pagos` (`/pagos/ultimo-pago`) | **sin mapeo** |
| `tipo_pago` | `Tipo de Pago` | `Prepago` / `Postpago` / `---` | **sin mapeo** (sólo filtra en cliente) |
| `facturacion_automatica` | `Fact. Automática` | `No` / `Sí · Servicio\|Router\|Plan\|Red\|Grupo` (se unen con ` + `); tooltip con días de anticipación y hora (CLI-033) | **sin mapeo** (sólo filtra en cliente, `filtrarFacturacionAutomatica`) |
| `tipo_comprobante` | `T. Comprobante` | `Factura` / `Recibo` | `facturaCliente.tipo_comprobante` |
| `deuda_actual` | `Deuda Actual` | badge rojo con nº de facturas + monto con IVA; `Sin deuda` | **sin mapeo** |
| `total_sin_iva` | `Total Sin IVA` | idem sin IVA | **sin mapeo** |
| `pagado` | `Estado Pago` | `Pagado` / `No Pagado` (según `resumen.deuda.cantidad > 0`) | caso especial `pagado`: si el texto contiene "no" → servicios activos con pago pendiente; si no → activos sin pendientes (`BE:1276-1300`) |
| `hasServicesActive` | `Estado Servicio` | `Activo` (verde) / `Inactivo` (rojo) / `Retirado` (ámbar) por servicio | **sin mapeo** (filtra en cliente) |
| `actions` | `Acciones` | iconos (CLI-005); fijada a la derecha | — |
| `custom_<nombre>` | `<NOMBRE EN MAYÚSCULAS>` | campos personalizados (`custom_data`), se insertan antes de Acciones | `LOWER(customer.custom_data->>'<nombre>') LIKE` |

- **Reglas/observaciones:**
  - Los filtros de columna sin mapeo en `fieldMapping` **no hacen nada en el servidor** (`if (!column) return;`, `BE:1302-1303`): la tabla se re-filtra solo sobre la página ya cargada (`filtrarFacturasCliente` solo cubre `tipo_comprobante`, `aplicar_corte`, `dia_pago`, `ip`, `ipv6`, `direccion`, `planes`, `instalado`, `FE:useClientesIndex.js:445-493`). Por eso filtrar por "Deuda Actual", "Ultimo pago", "Estado Servicio", "Mac Address", "N° Contrato" o "Dia de Corte" **no reduce el total ni la paginación** y puede dejar filas con celdas vacías. ✅ (comportamiento visual ❓).
  - Hay un `cell_renders/ClienteDiaPago.vue` (columna `dia_pago`) que **no está importado** ni registrado en `columnDefs`; el id `dia_pago` sí figura en la lista por defecto de columnas visibles (`FE:stores/auth-user.ts:56-78`: también `total_cobrar`, que no existe en `columnDefs`). Son entradas huérfanas.
  - Visibles por defecto: `nombres, ip, planes, dia_pago*, direccion, t_doc, numero_documento, email, celular, instalado, ultimo_pago, tipo_pago, facturacion_automatica, tipo_comprobante, deuda_actual, total_sin_iva, total_cobrar*, mac_address, contrato, pagado, hasServicesActive, actions` (* inexistentes). `ipv6`, `sn`, `dia_corte`, `direccion_principal` y `aplicar_corte` **no están en la lista por defecto**: nacen ocultas. ✅
  - El badge `Suspendido-N` de `EstadoServicio.vue:5-9` nunca se produce: el `valueGetter` solo devuelve `Retirado`, `Activo` o `Inactivo` (`useClientesIndex.js:389-397`). Código muerto.
  - Textos del grid (paginación nativa oculta con CSS): `translateTable.js`.
- **Estados posibles:** columna Estado Servicio: `Activo` (isActive && !deleted), `Inactivo` (!isActive && !deleted), `Retirado` (deleted). Estado Pago: `Pagado` / `No Pagado`.
- **Casos límite y advertencias:** los filtros de columna se guardan en `authUserStore.gridFilterModel` y **sobreviven al recargar**; si el usuario ve una lista "vacía" puede deberse a un filtro de columna antiguo (se limpia desde el filtro flotante de cada columna; el único reinicio automático de todos los filtros de columna ocurre al cambiar el selector de meses suspendidos: `volverARenderizarTabla` → `setFilterModel(null)`, `:711-717`).
- **Preguntas probables de usuarios:**
  1. "¿Por qué no aparece la columna IPv6/SN ONU/Día de corte?" (están ocultas por defecto; usar OCULTAR COLUMNAS).
  2. "¿Qué significa Dia de Corte en rojo/verde?" (rojo: mes actual o pasado; verde: mes futuro).
  3. "¿Qué es el paréntesis (SmartOLT)/(AdminOLT) junto al SN?" (plataforma de la ONU).
  4. "¿Puedo reordenar columnas?" (sí, arrastrando; se guarda en `customerColumnOrder`).
  5. "¿Por qué el filtro de Estado Servicio no cambia el total?" (se filtra solo la página).
  6. "¿Cómo veo mis campos personalizados en la tabla?" (aparecen como columnas ocultas con el nombre en mayúsculas).
- **Pendiente de validar en UI:** ❓ aspecto real de filas con múltiples servicios con filtro de columna activo; ❓ si el valor `07` de `tipo_documento` aparece alguna vez en la lista.

---

## CLI-003 · Selección múltiple y acciones masivas
- **Ruta UI / name:** `/clientes` · barra superior de filtros.
- **Archivos:** FE: `IndexPage.vue:85-157`, `:783-849` (selección), `:956-1023` (`accionMasiva`) · BE: `customers.controller.ts:62-77` (`GET /customers/ids`), `activeOrSuspendService` (`:324-332`), `retirarServicio` (`:352-359`), `remove` (`:343-350`).
- **Para qué sirve:** Seleccionar clientes (de la página o de **todo el filtro actual**) y activar, suspender, retirar o eliminar en lote, reutilizando los endpoints de las acciones por fila.
- **Acceso:** el menú `Acciones (N)` aparece solo con selección >0 y cada ítem exige su permiso: `cliente.activar.inactivar` (activar y suspender), `retirar.cliente`, `eliminar.cliente` (`:98-127`). El separador solo si hay retirar o eliminar. ✅
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| (icono `done_all`, tooltip `Seleccionar todos los registros del filtro actual`) | Trae los IDs de **todos** los clientes del filtro y los marca | — | `GET /customers/ids` (header `router-id`, params estado/filters/meses/red/plan/caja) | Falla → `No se pudo obtener los registros`. No incluye `search` (el texto de `Buscar...` **no** se envía a `/ids`, `:800-810`) → ❓ el "seleccionar todos" con búsqueda activa selecciona más clientes de los visibles |
| (icono `remove_done`, badge N, tooltip `Limpiar selección (N seleccionados)`) | Limpia selección | — | — | Se limpia sola al cambiar filtros/página 1 |
| `Acciones (N)` → `Activar seleccionados` | Para cada servicio **inactivo** de cada cliente: `PUT /customers/activeOrSuspendService/:id` con `estado:'activar'` | `cliente.activar.inactivar` | `PUT /customers/activeOrSuspendService/:id` | Idempotente: salta los que ya están activos (`:989-990`). Confirmación: `¿Seguro que deseas activar a N cliente(s) seleccionado(s)?`, botón `Activar` |
| `Acciones (N)` → `Suspender seleccionados` | Ídem con `estado:'inactivar'` | `cliente.activar.inactivar` | ídem | Confirmación `…suspender…`, botón `Suspender` |
| `Acciones (N)` → `Retirar seleccionados` | Por cada servicio: `DELETE /customers/delete-service/:id` | `retirar.cliente` | `DELETE /customers/delete-service/:id` | Mensaje `Esta acción no se puede deshacer.`; botón `Retirar` |
| `Acciones (N)` → `Eliminar seleccionados` | Retira cada servicio y luego `DELETE /customers/:id` | `eliminar.cliente` | ídem + `DELETE /customers/:id` | Mensaje `Esta acción no se puede deshacer.`; botón `Eliminar` (rojo) |

- **Reglas de negocio (frontend):** lotes de 5 clientes en paralelo; dentro de un cliente es secuencial (`:1008-1011`). El payload de activar/suspender envía `servicio_id`, `ipv4`, `address_list`, `router` (= router seleccionado en pantalla, **puede ser `null` si "TODOS"**) y `estado`; el backend solo usa `datosServicio.estado` (`BE:customers.service.ts:2682,2696`), por lo que esos campos extra se ignoran. ✅
- **Mensajes (texto exacto):** éxito `Se aplicó "<Verbo>" a N cliente(s)`; error `error.response.data.message` o `Algo salió mal`; sin selección `No hay clientes seleccionados`.
- **Efectos secundarios externos:** los de CLI-025 (MikroTik, SmartOLT/AdminOLT) o CLI-026/027, **multiplicados por servicio**. No hay cola ni límite: con cientos de clientes la operación corre desde el navegador (si se cierra la pestaña se interrumpe a medias).
- **Casos límite y advertencias:**
  - El fallo de un servicio **aborta el lote** del grupo de 5 (`Promise.all` rechaza) y salta al `catch`, dejando el resto sin procesar y sin informe de cuáles se aplicaron. ✅
  - Existe además una función `getSelectedRows` ("¿Estas seguro de suspender a los usuarios seleccionados?") que no está conectada a ningún botón (código muerto, `:906-952`).
  - "Retirar seleccionados" **no pide** el interruptor de confirmación que sí pide el retiro individual (ver CLI-026).
  - La acción masiva se ejecuta sobre `gridApi.getSelectedRows()`, es decir **sólo las filas cargadas en la página actual**; los IDs de "seleccionar todo el filtro" que no están en la página no se procesan, aunque el contador `Acciones (N)` muestre el total (`:957-958`). ❓ confirmar en UI: el diálogo anuncia `N` = filas de la página.
- **Preguntas probables:** "¿Puedo suspender 200 clientes de una vez?" · "¿Por qué dice 150 seleccionados pero solo suspendió 10?" · "¿Qué pasa si el router no responde en medio del lote?" · "¿Puedo deshacer un retiro masivo?" (no) · "¿Quién puede eliminar masivamente?" (permiso `eliminar.cliente`).
- **Pendiente de validar en UI:** ❓ N mostrado en el diálogo vs. clientes realmente afectados (ver arriba); ❓ comportamiento de la barra de carga (`showLoading`).

---

## CLI-004 · Importar Excel / Descargar Plantilla / Exportar Clientes
- **Ruta UI / name:** `/clientes` · desplegable con icono Excel (`fa-solid fa-file-excel`). Modal "Carga masiva de clientes" (persistente).
- **Archivos:** FE: `IndexPage.vue:851-904` (descarga), `components/modals/ModalCargarExcel.vue` · BE: `mikrotik/mikrotik.controller.ts:109-132` (`POST /mikrotik/download-excel-router/:router_id/:with_customer`), `mikrotik.service.ts:1622-1940` (`downloadExcelCustomers`), `:1974+` (`generateExcelClients`, plantilla `static/resource/clientes.xlsx`), `customers.service.ts:254-531` (`create` con `uploadedFromExcel`), `customers.controller.ts:22-30`, `:41-52` (`POST /customers/download-clients-excel`, sin uso en el FE).
- **Para qué sirve:** Importar muchos clientes+servicios desde una plantilla Excel; descargar la plantilla (con las listas de planes, redes, cajas libres, IPs libres); exportar los clientes actuales en el mismo formato.
- **Acceso:** **sin `validarPermisos` en el front** para ninguna de las tres opciones (`IndexPage.vue:306-344`); el backend solo exige JWT. ✅
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| `Importar Excel` | Abre modal "Carga masiva de clientes" | ninguno | — | `persistent` |
| `Descargar Plantilla` (`downloadFile(false)`) | Descarga `plantilla.xlsx` (o `clientes_todos_routers.xlsx` si router = "TODOS") con hojas `clientes`, `lista`, `redes` | ninguno | `POST /mikrotik/download-excel-router/:routerId/false` | Con "TODOS" usa `routerId='todos'` + `routerIds` en body. Con `with_customer=false` no se agregan filas de clientes aunque haya seleccionados (`mikrotik.service.ts:1860`); solo se rellenan las hojas de listas (planes, redes, cajas, IPs libres) |
| `Exportar Clientes` (`downloadFile(true)`) | Igual, con filas de clientes: los seleccionados, o los del filtro `Estado` actual | ninguno | `POST …/true` | Mismo nombre de archivo (`plantilla.xlsx`) en ambos casos. Con `Estado ≠ Todos` filtra `deleted = (Estado = Retirados)` y, si ningún cliente cumple el filtro, exporta vacío (cambio de 2026-10-13; ver CLI-034). Antes excluía retirados salvo selección explícita |
| `Cargar clientes` (en el modal) | Lee el XLSX, valida por fila y envía `POST /customers` uno a uno | ninguno | `POST /customers` con `uploadedFromExcel:true` y headers `company-id`, `uploaded-from-excel` | Hasta 3 en paralelo; las filas con documento repetido en el mismo archivo van al final, secuenciales (`ModalCargarExcel.vue:652-660`) |
| `Reparar router` (aparece tras la carga) | Reconstruye en MikroTik los clientes del router de la 1.ª fila | ninguno | `POST /mikrotik/reparar-router/:routerId` | Reactiva servicios al día (`reactivarAlDia=true`, `mikrotik.controller.ts:42-46`) |
| `Descargar excel con errores (N)` | Genera `clientes_con_errores.xlsx` con las filas fallidas (columnas A..AC) | ninguno | — (cliente) | Solo incluye filas con error **distinto** de "ya existe un cliente con esta ip…" (`:664-677`) |
| (toggle) `Correctas (n)` / `todos (n)` / `Errores (n)` | Filtra la lista de resultados | — | — | — |

- **Campos de formulario (columnas de la plantilla; índice 0-based en `rows[index][i]`, la fila de datos empieza en la 3.ª fila):** ✅ `ModalCargarExcel.vue:192-376`

| Col. | Cabecera/Campo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| A | Cliente (nombres) | sí (fila vacía se ignora) | se pasa a MAYÚSCULAS | |
| B | Tipo de documento | — | `Cedula`→05, `RUC`→04, `Pasaporte`→06 | otro texto → código vacío |
| C | N° documento | — | texto | el backend exige 5–20 caracteres `[A-Za-z0-9.\- ]` |
| D | Celular | — | texto; backend normaliza a E.164 | |
| E | Email | no | vacío = `''` | |
| F | Dirección | no | vacío = `-` | |
| G | Tipo de facturación | — | `Postpago (Vencido)`→`postpago`, `Prepago (Adelantado)`→`prepago` | |
| H | Día de pago | sí (backend `Factura.dia_pago`) | número | |
| I | Tipo de impuesto | sí | texto (`Impuestos incluido`/`Mas impuestos`/`Ninguno`) | |
| J | Días de gracia | sí | texto (`N Día(s)`) | |
| K | Aplicar corte | sí | texto | |
| L | Tipo comprobante | sí | `Factura`/`Recibo` (acepta mayúsculas) | |
| M | Creación anticipada | — | texto | |
| N | Recordatorios | — | `Todos`→['Correo','WhatsApp']; otro valor tal cual; vacío→['Ninguno'] | |
| O | Meses atrasados | — | número; vacío→`Ninguno` | genera facturas retroactivas (ver CLI-011) |
| P | Router | sí | **nombre** del router (se resuelve con `GET /router/find-router-by-name/:name`) | se resuelve **una sola vez**, con la primera fila que traiga valor (`ModalCargarExcel.vue:285-289`): todas las filas del archivo quedan asignadas a ese router y las redes/cajas NAP se buscan solo en él. Un archivo = un router |
| Q | Plan | sí | nombre del plan (`POST /internet/find-servicio-by-name/:routerId`) | |
| R | Red | sí | texto; se resuelve por IP contenida en la red | |
| S | IPv4 | sí | `normalizeIP` acepta IP con puntos o 4–12 dígitos pegados | |
| T/U | Caja NAP / Puerto | no | nombre de caja con `_`→espacio y nº de puerto | si no existe: error `No se encontro la caja con el nombre …` / `No se encontro el puerto …` |
| V | Precio | — | coma→punto | |
| W | Dirección servicio | — | — | |
| X | Coordenadas | — | texto libre (sin validar) | |
| Y | Estado | — | `Activo` → true; otro → false; vacío → true | **el servicio importado "Inactivo" no pasa por MikroTik** (ver abajo) |
| Z | Fecha instalación | — | `DD/MM/YYYY` o `YYYY-MM-DD`; vacío = hoy | |
| AA… | por **cabecera**: `Usuario PPPoE`, `Contraseña PPPoE`, `MAC Address`, `IPv6`, `SN ONU`; desde la col. 26 en adelante cualquier otra cabecera = campo personalizado | PPPoE usuario/clave obligatorios si la columna existe | usuario sin espacios ≤64; clave ≤64 sin saltos; MAC `AA:BB:..` o 12 hex; IPv6 formato básico; SN ≤50 | duplicado de usuario PPPoE en el lote = error |

- **Reglas de negocio (backend, `uploadedFromExcel=true`):**
  - Duplicados: IP ya usada en el router → `ya existe un cliente con esta ipv4: <ip>` (`BE:customers.service.ts:277-279`, **solo en importación**); usuario PPPoE repetido en el router → `Ya existe un cliente con el usuario PPPoE: <u>` (`:291-293`).
  - IPv6: debe parsear, pertenecer a una red IPv6 **activa** del router y no estar usada (`validarIpv6DeImportacion`, `:215-252`).
  - Si ya existe un cliente con el **mismo `numero_documento` o los mismos `nombres`**, el servicio se agrega a ese cliente en lugar de crear otro (`:314-319`, `:355-356`). ✅
  - **No se crea nada en MikroTik** (`if (!uploadedFromExcel) {…createClient…}`, `:453-486`): por eso el modal ofrece `Reparar router`. Tampoco se envía mensaje de bienvenida (la llamada `/customers/message-welcome` está solo en el alta manual, `FE:useCliente.js:604-609`).
  - Pre-validación de cupo: `GET /customers/limite-suscripcion`; si el archivo excede los cupos, aborta con `El archivo contiene N clientes pero tu suscripción solo tiene M cupos disponibles (límite: L). Reduce el archivo o amplía tu plan.` (`ModalCargarExcel.vue:640-646`). El backend vuelve a validar por cada fila (`validarLimiteClientesSuscripcion`).
- **Mensajes de error/éxito (texto exacto):** `Debes completar este campo` (sin archivo), `Debes subir un archivo excel` (nunca se dispara, ver Hallazgos), `Usuario PPPoE es obligatorio para este router`, `Contraseña PPPoE es obligatoria — un secret sin contraseña es un riesgo de seguridad`, `IPv6 inválida "<v>" — debe ser una dirección IPv6 (ej: 2803:2540:1c::25)`, `Router reparado correctamente`, `No se pudo generar el excel con errores`, `ocurrio un error al reparar el router`.
- **Estados:** por fila `cargando` → `success` | `error`; advertencias (MAC vacía/ inválida, SN >50) se muestran con un icono ⚠ en filas exitosas.
- **Casos límite y advertencias:**
  - Un archivo con un cliente "Inactivo" (col. Y) crea el servicio con `isActive=false` en BD pero **no** lo bloquea en MikroTik hasta ejecutar `Reparar router`/corte.
  - La plantilla se genera **por router**; con "TODOS" la hoja lista todos los planes/redes/cajas del conjunto de routers.
  - El campo `accept=".xls, .xlsx"` del selector, pero el parser usa XLSX; ❓ comportamiento con `.xls`.
- **Preguntas probables:** "¿Por qué los clientes importados no tienen internet?" (falta Reparar router) · "¿Por qué dice ya existe esta ip?" · "¿Puedo importar sin correo?" (sí) · "¿Qué pasa si el nombre ya existe?" (se agrega el servicio al cliente existente) · "¿Cuántos clientes puedo cargar?" (según cupo de la suscripción) · "¿Cómo corrijo los errores y reintento?" (descargar excel con errores).
- **Pendiente de validar en UI:** ❓ si la hoja `clientes` impone listas desplegables (validación de datos) en Excel; ❓ comportamiento real de `.xls`.

---

## CLI-005 · Acciones por fila del listado
- **Ruta UI / name:** `/clientes` · columna `Acciones` (fijada a la derecha, ancho 180 px; en xs un botón redondo `reorder` con menú).
- **Archivos:** FE: `cell_renders/ActionCellRenderer.vue` · BE: `customers.controller.ts:324-332`, `:343-359`.
- **Acceso:** cada icono con su permiso (ver tabla). El de "Ver detalles" además se oculta si `data.sinServicios` (solo escritorio, `:154-156`; en móvil no).
- **Botones y acciones:**

| Icono / etiqueta (tooltip) | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| `edit` — `Editar` | Va a `cliente.edit` con `client_id` | `cliente.edit` | — | también el nombre del cliente (enlace) lleva a la edición **sin comprobar permiso en el enlace** (`ClientesNamePage.vue`), el guard de ruta sí exige `cliente.edit` |
| `delete` — `Eliminar` | Diálogo "ELIMINAR" → CLI-027 | `eliminar.cliente` | `DELETE /customers/delete-service/:id` por servicio + `DELETE /customers/:id` | |
| `power_settings_new` / `check_circle` — `Suspender servicios` / `Activar servicios` | Suspende o activa **todos** los servicios del cliente según el estado del primero (`estadosServicio[0]`) | `cliente.activar.inactivar` | `PUT /customers/activeOrSuspendService/:id` por servicio | Oculto si el 1.er servicio está `Retirado`. Confirmación HTML: `Estas seguro de suspender|activar los servicios a <NOMBRE>?` con botones `Suspender|Activar` / `Cancelar` |
| `fa-user-xmark` — `Retirar` | Diálogo "RETIRAR" → CLI-026 | `retirar.cliente` | `DELETE /customers/delete-service/:id` por servicio | Oculto si el 1.er servicio está `Retirado` |
| `visibility` — `Ver detalles` | Abre diálogo "Listado de Servicios" (CLI-006) | `detalles.cliente` | `GET /customers/filtrar-cliente-por-id/:id` … | |

- **Reglas de negocio (frontend):** el estado `Activo/Inactivo/Retirado` se evalúa **solo por el primer servicio** (`estadosServicio[0]`); en un cliente con servicios mixtos la acción aplica a todos con una única decisión (`:334-337`). Errores: `mostrarNotify('warning', error.response.data.message)`; al terminar refresca la lista (`invalidateQueries(['clients'])`).
- **Mensajes (texto exacto):** diálogo retirar/eliminar: título `RETIRAR`/`ELIMINAR`; texto `Estas seguro de retirar|eliminar al cliente:`; retirar → `Todos los servicios del cliente serán eliminados del sistema y del Mikrotik.` y `Los Productos en calidad de comodato serán devueltos a almacén.`; eliminar → `Los datos del clientes serán eliminados junto a todos sus servicios registrados(mikrotik). Datos como facturas,pagos, etc serán eliminados.`; interruptor `Eliminar registro de instalación.` (retirar) / `Eliminar todos los datos` (eliminar); botón `Si, retirar` / `Si, eliminar` (deshabilitado hasta activar el interruptor); éxito `Se realizo el retiro exitosamente` (también al eliminar).
- **Casos límite y advertencias:**
  - El interruptor sólo habilita el botón (`:disabled="!aceptarRetiro"`); **su valor no se envía al backend** (`deleteService` no lo usa, `:351-382`). Por tanto "Eliminar registro de instalación" **no elimina ninguna instalación** y "productos en comodato serán devueltos a almacén" no está implementado en `retirarServicio` del backend (ver CLI-026). ✅
  - Mensaje del diálogo de Eliminar afirma que facturas y pagos serán eliminados; el backend solo marca `deleted_at` en cliente y servicios (CLI-027).
- **Preguntas probables:** "¿Por qué no veo el icono de eliminar?" (permiso) · "¿Retirar y suspender son lo mismo?" (no) · "¿Puedo recuperar un cliente retirado?" (sí, Ver detalles → Activar Servicio) · "¿Qué pasa con sus facturas si lo elimino?" · "¿Por qué el icono dice 'Activar' si el cliente tiene 2 servicios?" (mira el primero).
- **Pendiente de validar en UI:** ❓ orden de los servicios (cuál es "el primero"); ❓ si el diálogo muestra advertencia al haber facturas pendientes (no hay código para ello).

---

## CLI-006 · Ver detalles → "Listado de Servicios" (RecuperarCliente)
- **Ruta UI / name:** diálogo modal desde `/clientes` (no es ruta). Se abre con el icono `visibility` (tooltip `Ver detalles`) de la columna Acciones —en escritorio solo si el cliente tiene servicios (`!sinServicios`) y el usuario tiene `detalles.cliente`— o con el ítem `Ver detalles` del menú de la fila en móvil (solo exige `detalles.cliente`, sin la condición `sinServicios`) ✅ FE:pages/dashboard/clientes/cell_renders/ActionCellRenderer.vue:73-82,152-168. Título del diálogo: `Listado de Servicios` (icono `list` y botón de cerrar) ✅ :253-273; debajo, el nombre del cliente en grande (`RecuperarCliente.vue:116-118`).
- **Archivos:** FE: `pages/dashboard/clientes/RecuperarCliente.vue`, `cell_renders/ActionCellRenderer.vue`, `components/FormCliente.vue` (modo servicio: `edit`, `useLocalCliente: true`), `components/ServicioInternet.vue`, `composables/useServicios.js` · BE: `customers.controller.ts:171-177` (`GET filtrar-cliente-por-id/:cliente_id`), `:361-365` (`DELETE /eliminar-service/:service_id`), `:367-374` (`PUT /active-service/:service_id`), `:33-39` (`POST /agregar-servicio`), `customers.service.ts:1732-1763` (`filtrarClientePorId`), `:2992-2998` (`borrarServicio`), `:3001-3072` (`activarServicio`), `logs/logs.controller.ts:25-28` + `logs.service.ts:138-148` (`GET logs/ultimo-retiro/:servicio_id`), `router/router.controller.ts:97-101` + `router.service.ts:235-241` (`GET /router/obtener-router-id/:servicio_id`).
- **Para qué sirve:** Ver todos los servicios de un cliente (vigentes y retirados), editar uno, reactivar uno retirado o eliminarlo definitivamente.
- **Acceso:** `detalles.cliente` para abrir. Dentro **no se evalúa ningún permiso `servicio.*`**: ni `RecuperarCliente.vue`, ni `FormCliente.vue`, ni `ServicioInternet.vue` llaman a `validarPermisos` (✅ `grep`); la única comprobación interna es `cliente.factura.configuracion.edit` en el botón de guardar del paso de facturación (`FactAndNot.vue:564`). Quien puede abrir el diálogo ve `Activar Servicio`/`Actualizar`/`Eliminar definitivamente` aunque no tenga `servicio.editar`, `servicio.retirar` ni `servicio.activar.suspender`. Backend: los cuatro endpoints llevan solo `@Auth()` (JWT), sin permisos.
- **Carga de datos (frontend):** `GET /customers/filtrar-cliente-por-id/<cliente>` devuelve el cliente con sus `facturaCliente` y el primer servicio de cada una (`servicio_id[0]`); por cada uno, si `deleted` pide `GET logs/ultimo-retiro/<servicio>` y siempre `GET /router/obtener-router-id/<servicio>` (de ahí salen el router y el plan que se pintan) ✅ FE:RecuperarCliente.vue:42-74. El constructor de consultas de TypeORM **excluye los servicios con `deleted_at`** (eliminados definitivamente), por eso no vuelven a aparecer en ninguna lista (BE:customers.service.ts:1732-1763).
- **Secciones:** una `q-expansion-item` por servicio (borde redondeado; el primero llega desplegado). Cabecera roja con icono `cancel` si está retirado, teal con `task_alt` si no: `Servicio retirado|Activo: IPV4: <ip> Perfil: <plan>`; si hay fecha de retiro, a la derecha `Fecha de retiro: DD/MM/YYYY HH:mma` (hora de 24 h con sufijo `am/pm`, del último log `RETIRAR_SERVICIO`; `null` si no hay log) ✅ BE:logs.service.ts:138-148. **La cabecera dice `Servicio Activo` también para un servicio suspendido**: `estado` (`Activo`/`Inactivo`) se calcula pero no se muestra (`RecuperarCliente.vue:67,141`). Dentro, `FormCliente` en modo servicio con tres pasos: `Facturación y Notificaciones`, `Imagenes` y `Servicios` (sin `Datos Personales`); empieza en `step-facturación` ✅ FE:FormCliente.vue:33-119. En este modo el selector `Perfil Internet:` ofrece también los planes **inactivos** del router (`internet.isActive || props.servicio?.useLocalCliente`, `ServicioInternet.vue:436`) y el botón `Anterior` está oculto (`:1592`).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| `delete` (tooltip `Eliminar definitivamente`) — solo en servicios retirados, con `@click.stop` (no despliega el panel) | Diálogo `¿Eliminar definitivamente el servicio?` (Plan, IPV4, texto rojo `Esta acción no se puede deshacer.`), botones `Eliminar` (rojo) / `Cancelar` | (ninguno en este componente) | `DELETE /customers/eliminar-service/:id` | `softDelete` del servicio (`BE:customers.service.ts:2992-2998`): queda con `deleted_at` y no vuelve a salir en ninguna lista. **El backend no comprueba que el servicio esté retirado**, no toca MikroTik, no escribe log y no desvincula equipos ni borra facturas, contratos o cargos. Éxito `Servicio eliminado.!` (verde) y se quita de la lista; error: `warning` con `error.response?.data?.message` o `No se pudo eliminar el servicio` ✅ FE:RecuperarCliente.vue:15-40 |
| `Activar Servicio` (botón único del paso `Servicios`; la etiqueta cambia, ver abajo) | Si el servicio está retirado y la IP no cambió: valida el formulario (`validarFormInternet`, mensajes de CLI-010) y abre `¿Deseas activar el servicio con la ip <ip>?` (`Aceptar`/`Cancelar`) → `PUT /customers/active-service/:id` | — | `PUT /customers/active-service/:id` | Reagrega el cliente al MikroTik (v6 o v7 según `registro_trafico`), `deleted=false`, `isActive=true`; el toast verde es `data.msg` = `Servicio agregado exitosamente`; error `negative` con `error.response.data.message ?? 'Fallo al activar el servicio'`. Tras el éxito emite `actualizarDatos` y el panel pasa a verde con la IP/plan actuales ✅ FE:useServicios.js:204-246 |
| `Agregar Servicio` (misma ubicación) | Aparece en lugar de `Activar Servicio` cuando `isNewService` (la IPv4/IPv6 del retirado ya la usa otro servicio no retirado) o cuando se eligió **otra IPv4** distinta de la guardada: crea un servicio **nuevo** y deja el retirado como está. Diálogo `¿Deseas agregar este nuevo servicio?` (`Agregar`/`Cancelar`) | — | `POST /customers/agregar-servicio` | Detalle del endpoint en SRV-002 (`cli2.md`). Éxito: el texto que devuelve el backend (`Servicio agregado exitosamente`); error `warning` con `error.response.data.message ?? 'No se logro agregar el servicio'`. Banner rojo `La ipv4 <ip> ya se encuentra en uso, por favor asigna otra.` / `La ipv6 <ip> ya se encuentra en uso, por favor asigna otra.` (solo si el servicio está retirado y la IP figura en `GET /customers/get-ips/:routerId`; vacía el campo IP) ✅ FE:ServicioInternet.vue:496-513 |
| `Actualizar` (servicio no retirado) | Igual que en la edición: `actualizarServicio` (CLI-028) | — | `PUT /customers/actualizarDatosServicio/:id` | — |

  **Etiqueta y manejador del botón** (`ServicioInternet.vue:1639-1660`): la etiqueta es `Agregar Servicio` si `isNewService`, `Activar Servicio` si el servicio está retirado y `Actualizar` en otro caso, pero el manejador depende solo de `servicio.deleted` (retirado → `activarServicio`, que deriva a `agregarServicio` cuando `isNewService` o cuando `props.servicio.ipv4 !== formInternet.ipv4`; no retirado → `actualizarServicio`).
- **Reglas de negocio (backend `activarServicio`, `BE:customers.service.ts:3001-3072`):** busca el servicio con cliente, router, compañía y plan (`No se encontró el servicio con el id <id>` si no existe); si estaba retirado valida el límite de clientes de la suscripción (`validarLimiteClientesSuscripcion`, CLI-031); calcula `estadoAnterior` (`Retirado`/`Activo`/`Suspendido`); arma los datos del router (usuario/contraseña de API, `control_velocidad`, `pppoe_modo`) y del plan (velocidades, burst, prioridad, `address_list`) y, si el servicio es PPPoE, el secret; llama a `createClient(..., estado=true, ...)` del servicio v6 o del v7 (`RouterOS V7.x`); después `update(id, { deleted: false, isActive: true })` y log `ACTIVAR_SERVICIO` con la descripción `Servicio activado (agregado a Mikrotik)` y el diff de estado. **No valida que la IPv4 siga libre** (eso lo hace solo el frontend al cargar), no comprueba que el router esté activo, **no restaura `sn` ni la ONU** (`retirarServicio` los puso en `null`, `:2941`), no revisa deudas ni facturas y **no usa `meses_atrasados`**: ese campo solo existe en la importación Excel (FE:ModalCargarExcel.vue:276-280; BE:customers.service.ts:419-422) ✅. Errores: `HttpException` se relanza; un error de MikroTik (`error.type`) se devuelve como `400` con `error.error` (sin el prefijo fijo `Error al agregar cliente a mikrotik` que sí usan el alta y `agregarServicio`); el resto pasa por `handleDBExceptions`.
- **Mensajes:** `Servicio agregado exitosamente` (activar y agregar), `Servicio eliminado.!`, `No se pudo eliminar el servicio`, `Fallo al activar el servicio`, `No se logro agregar el servicio`, `¿Eliminar definitivamente el servicio?`, `¿Deseas activar el servicio con la ip <ip>?`, `¿Deseas agregar este nuevo servicio?`, `Tu suscripción permite un máximo de N clientes y actualmente tienes M. Contacta a ventas para ampliar tu plan.` (límite de CLI-031).
- **Efectos externos:** MikroTik (`createClient`: cola simple/PCQ, address-list del plan, secret PPPoE, amarre IP-MAC según el router); log `ACTIVAR_SERVICIO`. `Eliminar definitivamente` no toca el router.
- **Casos límite y advertencias:**
  - Si otro cliente tomó la IP mientras el servicio estaba retirado, el backend **no lo impide** en `active-service`: solo el frontend vacía el campo y cambia a `Agregar Servicio`; una llamada directa a la API duplicaría la IP en MikroTik.
  - Tras `Agregar Servicio` desde este diálogo, `agregarServicio` emite `actualizarDatos` **sin argumento** y el manejador de `RecuperarCliente` (`actualizarDatos(servicio_actualizado)`, `:76-84`) lee `servicio_actualizado.id`: lanza `TypeError` y la lista no se refresca (el servicio nuevo no aparece hasta cerrar y reabrir el diálogo) ✅ FE:useServicios.js:101 vs RecuperarCliente.vue:76-84.
  - Tras `Activar Servicio` la cabecera sigue mostrando `Fecha de retiro:` hasta recargar (`fechaRetiro` no se limpia; `actualizarDatos` solo cambia `deleted`, `ipv4` y `nombre_plan`).
  - La fecha de retiro sale del último log `RETIRAR_SERVICIO`; un servicio retirado antes de existir ese log no la muestra.
- **Preguntas probables:** "¿Cómo reactivo a un cliente que retiré?" (Ver detalles → desplegar el servicio retirado → `Activar Servicio` → `Aceptar`) · "¿Pierde el historial de facturas?" (no; `activarServicio` no toca facturas) · "¿Puedo reasignarle otra IP?" (sí, pero entonces se crea un servicio nuevo con `Agregar Servicio`) · "¿Qué es 'Eliminar definitivamente'?" (oculta el servicio retirado de todas las listas; no se puede deshacer desde la interfaz) · "¿Por qué aparece la fecha de retiro?" · "¿Por qué no me deja activarlo?" (límite de la suscripción o router sin respuesta).
- **Límite de lectura:** el comportamiento real de `createClient` sobre un RouterOS depende del equipo (no hay router en el ZIP); el código de ambos servicios (`mikrotik.service.ts`, `mikrotik-resources.service.ts`) está leído.
- **Pendiente de validar en UI:** ❓ aspecto real de la cabecera roja/teal y del banner rojo de IP en uso; ❓ qué texto exacto llega al toast cuando `createClient` falla en `active-service` (el backend devuelve `error.error`, que puede ser un texto o un objeto según la excepción del router).

---

## CLI-007 · Estados del cliente y de su servicio; motor de corte y reactivación
- **Ruta UI / name:** transversal. Se ve en `/clientes` (columnas Estado Servicio, Estado Pago, Dia de Corte, filtro Estado) y en la pestaña Servicios (CLI2).
- **Archivos:** BE: `customers/entities/customer.entity.ts`, `customers/entities/ServicioCliente.entity.ts`, `customers/entities/Facturacion.entity.ts`, `customers.service.ts:2612-2815` (suspender/activar), `:2896-3072` (retirar/activar), `app-queue.processor.ts:114-707` (motor), `app.service.ts:256-418` (agenda de cortes), `common/utils/onu-corte.utils.ts` · FE: `useClientesIndex.js:389-398`, `cell_renders/EstadoServicio.vue`.
- **Para qué sirve:** Define qué significa que un cliente "esté activo, suspendido, retirado…" y qué lo provoca. En ISPMAX **el estado vive en el SERVICIO, no en el cliente**: un cliente puede tener servicios en estados distintos.
- **Acceso:** lectura en el listado; los cambios requieren los permisos de CLI-005; el motor automático no depende de permisos.
- **Estados del CLIENTE (`customers`):**

| Campo | Valores | Qué lo cambia | Qué ve el usuario |
|---|---|---|---|
| `isActive` (bool, default true) | `true`/`false` | solo el módulo **Personas** (`PATCH /customers/:id` con `isActive`, `FE:pages/dashboard/personas/IndexPage.vue:32-37`) y `PATCH /customers/:id/:estado` (`BE:setEstado`) | **No interviene** en el listado de Clientes ni en cortes (`buildCustomerIdsQuery` no lo consulta). Solo filtra `persons-customer/get?onlyActives` |
| `deleted_at` (soft delete) | null / fecha | `DELETE /customers/:id` (CLI-027) | el cliente desaparece de todas las consultas (TypeORM `@DeleteDateColumn`) y su `numero_documento` queda renombrado `<doc>-NN` |

- **Estados del SERVICIO (`servicios-clientes`):**

| Estado (etiqueta UI) | Condición en BD | Cómo se llega | Efecto en red |
|---|---|---|---|
| **Activo** (badge verde `secondary`) | `isActive=true` y `deleted=false` | alta (default `true`), activar manual, reactivación automática, `Activar Servicio` desde un retirado | IP/PPPoE habilitados; en MikroTik fuera de la lista de corte (`Impagos` o `lista_corte` de la red) y dentro de la `address_list` del plan |
| **Inactivo / Suspendido** (badge rojo `red-4` "Inactivo"; filtros "Inactivos"/"Suspendidos") | `isActive=false` y `deleted=false` | suspender manual (botón/lote/pestaña Servicios), corte automático por mora, importación con estado `Inactivo` | IP agregada a la lista de corte (o secret PPPoE deshabilitado + IP en lista de corte); ONU deshabilitada en SmartOLT/AdminOLT si el ajuste `aplicarCortes` lo permite |
| **Retirado** (badge ámbar "Retirado"; filtro "Retirados") | `deleted=true` (además `isActive=false`, `sn=null`, `onu_source=null`) | `DELETE /customers/delete-service/:id` (retirar) o eliminar cliente | cola/address-list/PPPoE/ARP/DHCP eliminados del router salvo que la IP ya la use otro servicio vivo; ONU eliminada en la OLT |
| **Eliminado definitivamente** | `deleted_at` no nulo | `DELETE /customers/eliminar-service/:id` (solo desde "Ver detalles" sobre un retirado) o eliminar cliente | sin efecto en red; desaparece del sistema |
| `estado_conexion` (`online`/`offline`/`sin_datos`) | `varchar` | job de monitoreo (otro módulo) | no se muestra en el listado de Clientes; se usa en el mapa |
| `onu_invalida` | bool | al vincular/desvincular SN se limpia (`actualizarServicio`, `BE:2395-2401`) | el motor omite ONUs marcadas inválidas salvo transición |

- **Estados de pago relacionados** (`pagos.estadoSRI`, usados por el motor): `NO PAGADO`, `PENDIENTE` (abono parcial), `PAGADO`, `AUTORIZADO`, `ANULADO` (los dos primeros cuentan como deuda; `FACT. LIBRE` se excluye del corte).
- **Reglas de negocio (backend):**
  1. **Acciones manuales** (`activeOrSuspendService`): primero MikroTik (v6 `mikrotikService`, v7 `mikrotikV7`), después guarda `isActive`, luego SmartOLT/AdminOLT si `aplicarCortes.smartOLT|adminOLT` (config del router pisa la global solo en las claves que define, `onu-corte.utils.ts:41-48`); errores de OLT solo se registran (`logger.warn`), el cambio **no** se revierte (`BE:2719-2742`). Si MikroTik falla → `Error al editar el cliente en mikrotik` y no cambia la BD. ✅
  2. **Motor automático** (`repararYSetearEstadosServicios`): solo evalúa servicios `deleted=false` (`:141`). La "tolerancia" N es el número de `aplicar_corte` (`1 Mes Vencido` → 1; `Desactivado` → no hay corte automático **ni reactivación automática**; el servicio conserva el estado manual) (`:207-211`, `:540-546`). Servicios con `precio = 0` no se cortan (`:547-583`).
  3. **Modo "N Meses Vencidos"**: toma las facturas pendientes (`NO PAGADO`/`PENDIENTE`, sin `FACT. LIBRE`) ordenadas por `dia_pago`; si hay ≥ N, usa la N-ésima: `fecha = dia_pago + días de gracia` (o `fecha_limite` de promesa de pago activa si es posterior). Si hoy ≥ fecha → **suspender**; si no → **activar** si estaba inactivo (`:340-415`). Si hay menos de N pendientes y el servicio está inactivo → **reactivar** (`:416-430`).
  4. **Modo "N Meses Desde Último Pago"**: base = fecha de la última factura PAGADO/AUTORIZADO (o último mes adelantado) + N meses + gracia; sin factura pendiente corta al vencer la ventana; sin pagos nunca cobrados → **activa** (`:221-339`).
  5. **Cuándo corta realmente:** un corte masivo solo suspende si el día de hoy está en `diasCorte` del router (o los globales). **Pero** cuando el job se ejecuta para un servicio puntual (`servicio_id`, p. ej. desde `GET /api/activar-desactivar-servicio/:id`) la condición `aplicarCorteHoy || servicio_id` fuerza el corte inmediato aunque hoy no sea día de corte (`:282`, `:313`, `:397`). ✅
  6. **Quién dispara la reevaluación puntual:** el frontend llama `GET /activar-desactivar-servicio/:id` al guardar Facturación (`FactAndNot.vue:105`), al actualizar el servicio (`ServicioInternet.vue:867`), al subir/quitar imágenes (`StepUploadImages.vue:80`), al eliminar una factura (`useEditCliente.js:343`) y el backend desde promesas de pago y registro de abonos (`promesas-pago.service.ts`, `registro-pagos/registrar-abono.service.ts`).
  7. **Consecuencia:** una suspensión *manual* de un cliente **sin deuda vencida** y con `aplicar_corte` ≠ `Desactivado` será revertida por la siguiente reevaluación (queda "Activo" otra vez); solo es estable si el cliente tiene facturas vencidas o `aplicar_corte` = `Desactivado`. ✅ (deducido de las reglas 2-4; ❓ confirmar en UI).
  8. Al cambiar estado se escribe log `SUSPENDER_SERVICIO`/`ACTIVAR_SERVICIO` (`helpersService.safeLog`) con metadatos antes/después.
  9. Tras un corte masivo se hace `repararRouter` por router (empuja el estado de todos los clientes al MikroTik), con reintentos (`configReintentos`) y avisos a Slack/log `corte_servicio` (`:597-702`). `suspenderServicio` (usado por el motor) **solo cambia la BD**; el MikroTik se actualiza luego con `repararRouter`.
- **Efectos secundarios externos:** MikroTik (address-list `Impagos`/`lista_corte`, secret PPPoE habilitar/deshabilitar, colas), SmartOLT (`habilitarOnu`/`desabilitarOnu`/`eliminarOnu`), AdminOLT (`habilitarOnuPorSn`/`deshabilitarOnuPorSn`/`eliminarOnu`), Slack (`URL_SLACK`), Redis/Bull (cola `${queueName}-app`), cache `${queueName}-customers` (se borra en `verifyAndApplyServiceStatus`).
- **Mensajes de error/éxito (texto exacto, backend):** `Servicio actualizado correctamente`; `No se encontró el servicio con el id <id>`; `Error al editar el cliente en mikrotik`/`en el smartOLT`; `Servicio agregado exitosamente` (activar retirado).
- **Casos límite y advertencias:**
  - "Suspendido" e "Inactivo" son **lo mismo** en BD; el listado solo distingue `Inactivos`/`Suspendidos` por el selector de meses.
  - Un servicio **Retirado** no es "cliente retirado": el cliente sigue existiendo y puede tener otros servicios activos.
  - El badge `Suspendido-N` del renderer es código muerto.
  - `Pagado`/`No Pagado` en la columna se calculan con `deuda.cantidad > 0` (facturas con vencimiento ≤ fin del mes actual, `resumenServicio` `:709-768`), **mientras que el filtro "No Pagados" exige alcanzar la tolerancia de corte** (`buildCustomerIdsQuery` `:1441-1460`) → un cliente puede mostrar "No Pagado" y no aparecer en el filtro.
  - El filtro "Pagados" exige además `isActive=true`: un cliente suspendido sin deuda no aparece ni en Pagados ni en No Pagados.
- **Preguntas probables:** "¿Qué diferencia hay entre suspender y retirar?" · "¿Por qué mi cliente suspendido se reactivó solo?" · "¿Por qué cortó a un cliente un domingo si el corte es lunes?" (reevaluación puntual) · "¿Cuándo se corta a un cliente con 1 Mes Vencido y día de gracia 5?" · "¿Qué pasa con la ONU al suspender?" · "¿Cuál es la lista de impagos del MikroTik?" · "¿Puedo tener un cliente moroso sin cortar?" (aplicar corte Desactivado).
- **Pendiente de validar en UI:** ❓ color/estilo de cada badge en modo oscuro; ❓ si el selector `Estado: Suspendidos` + meses coincide con lo que esperan los operadores (regla `N+1`); ❓ comportamiento de la reevaluación con promesas de pago (módulo `promesas-pago`).

---

## CLI-008 · Crear cliente — paso 1 "Datos Personales"
- **Ruta UI / name:** `/clientes/add` · `crear.cliente` · desde `Agregar Cliente` (o botón flotante en móvil). Breadcrumb: `Inicio › Clientes › Nuevo`; título `Nuevo Cliente`.
- **Archivos:** FE: `AddCliente.vue`, `components/FormCliente.vue` (stepper), `components/DatosPersonales.vue`, `composables/useCliente.js` (validaciones), `src/composables/usePais.js` · BE: `customers/dto/create-servicio.dto.ts:20-94` (`Cliente`).
- **Para qué sirve:** Capturar los datos personales del titular. Si se llega desde una instalación (`?instalacion_id=…`) se **prellenan** nombre, documento, celular, correo, dirección y datos del servicio (router, plan, red, caja, puerto, IP sugerida, tipo conexión, precio, IPv6) (`AddCliente.vue:25-75`); el tipo de documento se autodetecta por longitud: 10 → Cédula `05`, 13 → RUC `04`, otro → Pasaporte `06` (`:38-43`).
- **Acceso:** `crear.cliente` (ruta y botón). Stepper con `header-nav`: se puede saltar de paso desde la cabecera.
- **Secciones:** "Datos del cliente", "Información adicional" (solo si existen campos personalizados) — cabecera del paso: `Datos Personales` / `Nombres, Dirección, Telefono...`.
- **Botones y acciones:** `Salir` (vuelve a `/clientes`, solo ancho > 600) · `Siguiente` (valida y pasa a Facturación).
- **Campos de formulario:** ✅ `DatosPersonales.vue`, `useCliente.js:311-364`

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| `Cliente:` | texto (MAYÚSCULAS visual) | sí | ≥ 2 palabras: `Debes ingresar 2 palabras minimo`; vacío: `Debes completar este campo`. Backend: `@IsNotEmpty` y se convierte a MAYÚSCULAS + `trim` (`DTO:28`) | varchar(200) en BD |
| `Tipo de Documento:` | select | sí | opciones por país (`usePais.js:36-50`): EC `Cédula` (05), `RUC` (04), `Pasaporte` (06); MX `CURP/RFC/Pasaporte`; VE `Cédula/RIF/Pasaporte`; CO `Cédula/NIT/Pasaporte`; BO `Cédula (CI)/NIT/Pasaporte`; PE `DNI/RUC/Pasaporte`; otros `Documento de identidad/Identificación tributaria/Pasaporte` | el país sale de `VITE_PAIS` (default `EC`) |
| `N° de Doc.:` | texto | sí | longitud exacta: EC 05→10, 04→13; PE 05→8, 04→11 (`Debes completar N digitos`); otros: libre ≤20. Solo dígitos si hay longitud fija, si no `[A-Za-z0-9.\- ]`. Backend: 5–20 caracteres, regex `^[A-Za-z0-9.\- ]+$`. **No hay verificación de dígito (cédula/RUC)** en ningún lado | `readonly` mientras no haya tipo; contador y `maxlength`. Un `watch` recorta a 10 caracteres si el tipo ≠ `04` (`useCliente.js:504-518`) |
| `Celular:` | teléfono internacional (`vue3-q-tel-input`) | sí | `Debes completar este campo`; marca error si el componente reporta número inválido. Backend: normaliza a E.164 (`+593…`), 5–100 caracteres | país por defecto `TEL_DEFAULT_COUNTRY` (`VITE_TEL_DEFAULT_COUNTRY` o país) |
| `Email:` | texto | **no** | si hay valor: regex `^[\w.-]+@[\w-]+(\.[\w-]{2,10})+$` → `Ingresa un email valido`. Backend `@IsEmail` solo si viene (`Debes ingresar un email valido`); si vacío se guarda `''` | columna `email` es NOT NULL varchar(75) |
| `Nros. Ref. (Opcional):` | lista de teléfono + `detalle (opcional)` | no | botón `add_circle` agrega fila (error si hay una vacía); `delete` pide `¿Deseas retirar el numero <n>?` (`Aceptar/Cancelar`). Backend descarta filas sin `movil` | JSON `numeros_referencias` |
| `Direccion:` | texto multilínea | sí | `Debes completar este campo`. (en edición hay tope 300) | `customers.direccion` varchar(1000) |
| `<Provincia>:` (`nivel1Nombre`) | select con búsqueda | no | lista cargada de `GET /settings/ubicaciones` o JSON local por país | etiqueta configurable (Provincia/Cantón/Parroquia en EC) |
| `<Cantón>:` (`nivel2Nombre`) | idem | no | depende del anterior | |
| `<Parroquia>:` (`nivel3Nombre`) | idem | no | depende del anterior | |
| `<nivel4>:` | idem | no | solo si la config define un 4.º nivel | |
| Campos de "Información adicional" | selector / numérico / fecha / texto | según config | tipos de `GET /custom-fields` | guardado en `custom_data` |

- **Reglas de negocio (backend):** DTO `Cliente` (`create-servicio.dto.ts:20-94`); unicidad de `numero_documento` por restricción única de BD (ver CLI-011). Si el número de documento coincide con el de un cliente existente, **el alta falla con el detalle crudo de Postgres** (`handleDBExceptions` 23505, `BE:3211-3214`). ✅
- **Mensajes de error (texto exacto):** `Debes completar este campo`, `Debes ingresar 2 palabras minimo`, `Debes completar 10 digitos` / `13`/`8`/`11`, `Ingresa un email valido`; backend: `El campo nombres no debe estar vacío.`, `El documento solo admite letras, números, guion o punto`, `Debes ingresar un minimo de 5 caracteres`, `Debes ingresar un maximo de 20 caracteres`, `Debes ingresar un minimo de 5 caracteres en el campo celular`, `Debes ingresar un maximo de 100 caracteres en el campo celular`.
- **Casos límite y advertencias:**
  - "Cédula" **no se valida** con el algoritmo módulo 10, ni el RUC (13 dígitos terminados en 001, etc.); solo longitud numérica.
  - Los **nombres** solo exigen 2 palabras: "JUAN" falla, "A B" pasa.
  - No hay verificación previa de documento/nombre duplicado en pantalla: el operador se entera al guardar (último paso).
  - Coordenadas no se piden en este paso (van en Servicios, CLI-010).
  - El estado del formulario es **global** (singleton en `useCliente.js`): `limpiarFormulario()` al entrar; salir sin guardar descarta todo.
- **Preguntas probables:** "¿Por qué no deja avanzar si el cliente tiene un solo nombre?" · "¿El correo es obligatorio?" (no) · "¿Puedo poner cédula de 9 dígitos?" (no, 10) · "¿Qué pasa si registro dos veces la misma cédula?" · "¿Para qué sirven los Nros. Ref.?" (contactos alternos, se usan en el envío de bienvenida) · "¿Puedo cambiar el nombre de Provincia/Cantón?" (en Ajustes).
- **Pendiente de validar en UI:** ❓ comportamiento del recorte a 10 caracteres cuando el tipo es `Pasaporte` (06) y el número excede 10; ❓ aspecto del campo cuando no hay ubicaciones configuradas.

---

## CLI-009 · Crear cliente — paso 2 "Facturación y Notificaciones"
- **Ruta UI / name:** `/clientes/add` (paso 2 del stepper). Cabecera: `Facturación y Notificaciones` / `Dia de pago, Corte, aviso`. En edición esta misma pantalla se reutiliza (CLI-015).
- **Archivos:** FE: `components/FactAndNot.vue`, `components/ConfigNotifications.vue`, `composables/useCliente.js:366-395` · BE: `dto/create-servicio.dto.ts:96-140` (`Factura`), `entities/Facturacion.entity.ts`.
- **Para qué sirve:** Definir cómo y cuándo se factura y se corta a este cliente.
- **Campos de formulario:** ✅

| Etiqueta | Tipo | Obligatorio | Valores / validación | Notas |
|---|---|---|---|---|
| `Dia Pago:` | select | sí | 1…31 (hint: `En los meses que no llegan a ese día se cobra el último (febrero: 28).` si 29-31) | `0`/vacío = `Debes completar este campo` |
| `Tipo:` | select | sí | `Prepago (Adelantado)` (`prepago`), `Postpago (Vencido)` (`postpago`); `readonly` hasta elegir Dia Pago | Si el ajuste `restringirTipoPagoPorFecha` está activo (default sí) y hoy > Dia Pago elegido, **solo se ofrece Postpago** (`FactAndNot.vue:189-204`) |
| `Tipo Impuesto:` | select | sí | `Impuestos incluido`, `Mas impuestos`, `Ninguno` | |
| `Días de gracia:` | select | sí | `0 Día`, `1 Día`, `2 Días` … `25 Días` (hint `*días tolerancia para aplicar corte`) | se guarda como texto ("5 Días") |
| `Aplicar Corte:` | select | sí | `Desactivado`, `1  Mes Vencido`, `2  Meses Vencidos`…`12  Meses Vencidos` (dos espacios), y `1 Mes Desde Último Pago`…`12 Meses Desde Último Pago` | `Desactivado` = sin corte ni reactivación automáticos (CLI-007); el servicio aparece en el filtro `Clientes con IP sin facturación` y no en `No Pagados` |
| ~~`Día de pago al cobrar:`~~ | — | — | **Retirado del formulario del cliente** en el código de 2026-10-14 (`FactAndNot.vue` ya no lo tiene; antes `:177-179`). Ahora es un interruptor en el modal de pago (COB-028): `PayComponent.vue`/`ModalPago.vue` y `mover_dia_pago` en `create-pago.dto.ts` | — |
| `Tipo Comprobante:` | select | sí | `Factura`, `Recibo` | `Recibo` fuerza `tipo_impuesto='Ninguno'` en cálculos |
| `Creación Anticipada:` | select | sí en pantalla (el servidor lo trata como opcional: columna con valor por defecto `Desactivado`, `create-servicio.dto.ts:117-118`) | `Desactivado` (se muestra como `Sin anticipar (día 1)`), `1 Día antes`, `2 Días antes`…`25 Días antes` | la factura mensual se crea N días antes |
| `N° de contrato:` | número | solo en edición (no en alta) | entero ≥ 1; único en BD | en alta lo asigna el sistema (MAX+1, `BE:534-544`) |
| `Dirección en factura:` | select | no | `Dirección principal` (`principal`), `Dirección del servicio` (`servicio`); hint `Si "Facturar a tercero" está activo, se usa la del tercero.` | |
| (sección Notificaciones) `Recordatorios de pago:` | multi-select | sí | `Ninguno`, `Correo`, `WhatsApp` (chips; `Ninguno` excluye a los demás) | `Debes elegir al menos una opción` |
| `Recordatorio #1/#2/#3:` | select + modo | no | `Desactivado`, `Notificar suspensión`, `1 Día`…`25 Días` + `Antes del vencimiento`/`Después del vencimiento` | solo visibles si Recordatorios ≠ `Ninguno` |

- **Botones y acciones:** `Anterior` (a Datos Personales; solo ancho > 600), `Siguiente` (valida y avanza a Servicios).
- **Reglas de negocio (backend):** DTO `Factura` exige `tipo`, `dia_pago` (número), `tipo_impuesto`, `tipo_comprobante`, `dia_gracia`, `aplicar_corte`, `recordatorio_pago` (array) (`create-servicio.dto.ts:96-140`). `crear_factura` es opcional en DTO pero la columna default `Desactivado`.
- **Mensajes de error (texto exacto):** `Debes completar este campo`, `Debes elegir al menos una opción`; backend: `Debes completar el campo tipo`, `El campo dia de pago no debe estar vacío.`, `El campo tipo de impuesto no debe estar vacío.`, `El campo tipo de comprobante no debe estar vacío.`, `El campo dia de gracia no debe estar vacío.`, `El campo aplicar corte no debe estar vacío.`, `El campo recordatorio de pago no debe estar vacío.`
- **Casos límite y advertencias:**
  - Defaults del formulario: todos vacíos salvo `recordatorio_pago: ['Ninguno']`, `direccion_comprobante: 'principal'`, `moverDiaPagoAlCobrar: null` (`useCliente.js:99-117`; el campo ya no se muestra, ver arriba) → hay que elegirlos uno a uno.
  - **Prepago**: al guardar se crea una factura inmediata (CLI-011). **Postpago**: la primera la crea el cron/`crearFacturaAntes`.
  - La opción "Aplicar Corte" con `Desde Último Pago` cambia la lógica del motor (CLI-007).
- **Preguntas probables:** "¿Qué diferencia hay entre prepago y postpago?" · "¿Por qué no me deja elegir prepago?" · "¿Qué es creación anticipada?" · "¿Qué son los días de gracia?" · "¿Qué pasa si pongo Desactivado en Aplicar Corte?" · "¿Puedo mandar recordatorios solo por WhatsApp?" · "¿Por qué no veo 'Día de pago al cobrar'?"
- **Pendiente de validar en UI:** ❓ texto exacto mostrado de `Aplicar Corte` (doble espacio) y orden de las opciones; ❓ que "Notificar suspensión" se envíe realmente (módulo de recordatorios, `pagos.service.ts`).

---

## CLI-010 · Crear cliente — paso 3 "Servicios" (router, plan, red, IP, PPPoE, NAP, Wi-Fi)
- **Ruta UI / name:** `/clientes/add` (paso 3). Cabecera `Servicios` / `Queues, Ipv4, Ipv6, etc`. Es el mismo componente que usa la edición de un servicio (CLI-028, CLI2).
- **Archivos:** FE: `components/ServicioInternet.vue`, `components/editar/Servicios/FormRedIpv6.vue` (CLI2), `composables/useCliente.js:397-439`, `useRedIpv6.js`, `src/composables/useHelperRedes.js` · BE: `dto/create-servicio.dto.ts:142-247` (`Servicio`).
- **Para qué sirve:** Definir el servicio de Internet del cliente y reservar IP/puerto.
- **Secciones:** `Conexión y plan`, `Ubicación`, `Direccionamiento de red`, (`Asignar dirección ipv6` → pool/subred/IPv6), `Red física (NAP)`, `Wi-Fi del cliente (opcional)`.
- **Campos de formulario:** ✅

| Etiqueta | Tipo | Obligatorio | Valores / validación | Notas |
|---|---|---|---|---|
| `Router:` | select | sí | `estadosStore.routerSinTodos` (routers asignados al usuario, sin "TODOS"); `Debes elegir un router` | Al cambiar: limpia red, IPv4, MAC, caja, puerto y recarga planes/cajas/redes |
| `Perfil Internet:` | select | sí | planes **activos** del router (`GET /internet` con header `router-id`); `Por favor agrega un perfil de internet` si no hay | al elegir, rellena `Precio:` con `precio_plan` |
| `Precio:` | número (2 decimales) | sí | regex `^\d{0,9}(\.\d{1,2})?$`; backend `@IsNumberString` | puede quedar en 0 |
| `Fecha Instalación:` | fecha | sí | máscara `date`; default hoy (`YYYY/MM/DD`) | |
| `Dirección:` | texto | no | — | dirección del servicio (`servicios-clientes.direccion`) |
| `Coordenadas:` | texto + botón mapa | no | placeholder `Longitud, Latitud`; botón `fa-location-dot` abre mapa; guarda `"<lng>, <lat>"`. **Sin validación de formato** (ni front ni back) | |
| `Redes IPv4:` | select con búsqueda | sí | redes activas del router (`GET /red-ipv4/true?routerId=`), etiqueta `<red>.0 (<n> Ips disponibles) <nombre>`; `/24` o menores se parten en sub-redes `/24` | |
| `IPv4:` | select con búsqueda | sí | IPs libres de la red (excluye usadas, `.0`, gateway/broadcast); al elegir red propone la primera libre | al cambiar IP se limpia MAC |
| `MAC Address:` | texto | no | solo si el router tiene `seguridad_alterna` = `Amarre de IP y Mac` o `… + DHCP Leases` y la conexión no es PPPoE; botones: traer MAC de la ONU (SmartOLT), obtener MAC del router por IP, buscar IP real por MAC | `Cambiar Equipo` libera el amarre (`POST /mikrotik/liberar-amarre/:id`) solo en edición |
| `Usuario PPPoE:` / `Contraseña PPPoE:` | texto | **no** (ni en pantalla —`camposReqInternet` solo exige `perfil_internet, precio, red_id, ipv4`, `useCliente.js:252-257`— ni en el servidor, `create-servicio.dto.ts:205-211` `@IsOptional`; sin usuario no se crea el secret, `mikrotik.service.ts:469-470`) | se autogenera `usuario_<ip>`; botón `Generar credenciales` (`PPP-XXXXXX`); duplicado en el router: `Este usuario PPPoE ya está en uso en este router` / `El usuario PPPoE ya está en uso. Elige otro.` (chequeo `GET /customers/check-pppoe-usuario`) | `tipo_conexion` = `PPPoE` automático si el router lo controla |
| `Asignar dirección ipv6` / `Pool IPv6:` / `Subred IPv6:` / `IPv6:` | checkbox + selects | no | validados en `validarFormInternet`: `Debes elegir una dirección ipv6` / `Debes elegir una opción` | detalle en CLI2 (`FormRedIpv6`) |
| `Caja(s) Nap:` | select con búsqueda | no | cajas del router | |
| `Puerto Nap:` | select | sí si hay caja (`Elige una opción`) | puertos libres (`Puerto N`), opción `Ninguno` | |
| `SSID Wi-Fi:` | texto | no | máx 64; botón `Sugerir SSID (Empresa + IP)` → `<EMPRESA>_<último octeto>` | |
| `Clave Wi-Fi:` | texto/password | no | máx 128; botón ver/ocultar y `Generar clave segura` (12 caracteres sin 0/O/1/l/I) | |
| `Aplicar WiFi al equipo` (botón) | acción | — | solo edición, ONU SmartOLT con TR-069 `Enabled`; exige SSID y clave ≥ 8 (`La clave WiFi debe tener al menos 8 caracteres (WPA2).`) | `POST /smart-olt/cambiar-wifi/:servicioId`; diálogo `Aplicar WiFi al equipo` |

- **Botones y acciones:** `Anterior`, `Guardar` (alta; ver CLI-011), `Actualizar` (edición), `Agregar Servicio` (servicio nuevo a cliente existente), `Activar Servicio` (retirado).
- **Reglas de negocio (frontend):** al montar con instalación de origen aplica la pre-asignación y avisa con diálogo `Recursos pre-asignados no disponibles` si IP/puerto ya están en uso (`ServicioInternet.vue:949-961`); IPs ocupadas se calculan con `GET /customers/get-ips/:routerId` (servicios no retirados) y se excluyen del select; el filtro de IPs usadas **es solo del frontend**.
- **Reglas de negocio (backend):** `Servicio` DTO: `router_id` UUID v4 (`El campo router no debe estar vacío.` / `No se encontró el router …`), `precio` string numérico, `red_id` UUID, `ipv4` string no vacío (**sin `@IsIP`**), `ipv6` `@IsIP(6)`, `fecha_instalacion` string no vacío, `sn` ≤ 50, `ssid_wifi` ≤ 64, `password_wifi` ≤ 128.
- **Casos límite y advertencias:**
  - El backend **no verifica unicidad de IPv4 en el alta manual** (solo en importación Excel): dos operadores simultáneos podrían asignar la misma IP. ✅
  - Router con `control_pppoe`: el usuario/clave PPPoE no son obligatorios; si se envían, el backend crea el `secret` en MikroTik (corrección 2026-10-22, ver `docs/referencia/campos-del-cliente.mdx`).
  - `ModalMapBox` se usa en la plantilla sin import local (se asume registro global).
- **Preguntas probables:** "¿Por qué no me aparece ninguna IP?" (red agotada o usadas) · "¿De dónde sale el usuario PPPoE?" · "¿Qué es el amarre IP-MAC?" · "¿Qué pasa si no pongo caja NAP?" · "¿Cómo pongo las coordenadas?" · "¿Puedo asignar IPv6?" · "¿El plan cambia el precio?" (sí, se copia y se puede editar).
- **Pendiente de validar en UI:** ❓ etiqueta exacta del select de IPv6 y sus mensajes (CLI2); ❓ comportamiento del mapa en `ModalMapBox`.

---

## CLI-011 · Guardado del alta: qué crea el backend y qué puede fallar
- **Ruta UI / name:** botón `Guardar` del paso 3 → `POST /api/customers` (`CustomersController.create`, `customers.controller.ts:22-30`). Diálogo previo `¿Deseas agregar este cliente?` (`Guardar`/`Cancelar`).
- **Archivos:** FE: `useCliente.js:558-635` (`onSubmit`) · BE: `customers.service.ts:254-531` (`create`), `:533-544` (contrato), `:990-1076` (equipos de venta), `:744-822` (notificación INSTALADO).
- **Para qué sirve:** Crear cliente + datos de facturación + servicio (+ factura inicial + alta en MikroTik) en **una transacción**.
- **Acceso:** `@Auth()` (JWT). Frontend: `crear.cliente`.
- **Flujo (frontend):** `validarFormularioServicio()` valida los 3 pasos; calcula `fechaPago` (postpago → día de pago del **mes siguiente**; prepago → día de pago del mes actual); `GET /settings` para saber si enviar bienvenida; `POST /customers`; si `sendWelcomeMessage.activo` → `POST /customers/message-welcome {cliente_id, ipv4}`; notifica `Cliente agregado exitosamente` (posición `top`) y navega a `index.clientes` (o a `instalaciones.edit` si venía de una instalación).
- **Reglas de negocio (backend, en orden):**
  1. `validarLimiteClientesSuscripcion(company)` (CLI-031).
  2. Transacción PostgreSQL (`queryRunner`).
  3. Si importación Excel y la IP ya existe en el router (servicio no retirado) → error. **En alta manual no se comprueba.**
  4. Usuario PPPoE único por router entre servicios no retirados.
  5. IPv6 de Excel: formato, red activa del router, no usada.
  6. Busca cliente existente por `numero_documento` **o** `nombres`: en importación lo reutiliza; en alta manual intenta crear uno nuevo (si el documento existe → violación de unicidad → `error.detail`; si solo coincide el nombre, crea un homónimo).
  7. Guarda `factura-clientes` y `servicios-clientes`; `contrato` = MAX(contrato)+1 con `pg_advisory_xact_lock`; `onu_source` resuelto (`sn` presente → SmartOLT por defecto). Si `caja_id`/`puerto_id` no son válidos se omiten.
  8. Si trae `instalacion_id`: la instalación pasa a `INSTALADO`, se sincroniza `pre_asignacion` con los valores reales, y los productos marcados "venta" se vinculan al servicio y generan un **cargo recurrente** (`servicios-recurrentes`, `Un solo pago`, `estado=ACTIVO`).
  9. **Factura inicial:** si `tipo = prepago` **o** `meses_atrasados` ≠ `Ninguno`, crea `0…N` `pagos` en `NO PAGADO` con `dia_pago` = `fechaPago − k meses` y un ítem `tipo: servicio` con la descripción del plan (`descripcionPlanFactura`). En el alta manual el campo `meses_atrasados` **no existe en el formulario**; solo la importación lo usa. Postpago sin meses atrasados: no crea factura.
  10. Si **no** es importación: crea en MikroTik (RouterOS v6 `mikrotikService.createClient` o v7 `mikrotikV7.createClient`): cola simple `NOMBRE | IP` con límites del plan (burst solo si los tres parámetros > 0), `address-list` del plan, IPv6 si el paquete está instalado, amarre ARP/DHCP según `seguridad_alterna`, secret PPPoE + (modo `queue` cola simple) si es PPPoE, membresía PCQ si el router usa PCQ. Si el router es inaccesible el alta **falla y revierte**.
  11. `commit`; log `CREATE` ("Cliente y servicio creados"); notificación WhatsApp/correo de "instalación completada" si hay plantilla `notifInstalacionCliente.INSTALADO` activa.
- **Efectos secundarios externos:** MikroTik (cola, address-list, PPPoE, ARP/DHCP), WhatsApp (`/api/whatsapp/send`) y correo (notificación INSTALADO), mensaje de bienvenida (CLI-012), logs.
- **Mensajes de error/éxito (texto exacto):** éxito `Cliente agregado exitosamente`; errores del backend se muestran en lista: `Tu suscripción permite un máximo de N clientes y actualmente tienes M. Contacta a ventas para ampliar tu plan.`, `Ya existe un cliente con el usuario PPPoE: <u>`, `ya existe un cliente con esta ipv4: <ip>` (solo Excel), `Error al agregar cliente a mikrotik` + detalle, y el detalle de Postgres para duplicados (`Key (numero_documento)=(…) already exists.`).
- **Casos límite y advertencias:**
  - El `fechaPago` calculado es una fecha con zona horaria del **navegador**; el backend la usa con `moment(...).subtract(mes,'months')`.
  - Si MikroTik tiene éxito pero el `commit` falla, queda un cliente huérfano en el router (no hay compensación).
  - El correo `''` se guarda aunque la columna sea NOT NULL.
  - El alta **no** emite factura electrónica; solo crea registros `NO PAGADO`.
  - La importación mapea por posición (A–Z): cambiar la plantilla rompe la carga.
- **Preguntas probables:** "¿Por qué no se creó el cliente en el MikroTik?" · "¿Por qué dice que mi suscripción permite N clientes?" · "¿Se genera la factura al crear?" (solo prepago) · "¿Qué contrato le asigna?" (siguiente número) · "¿Qué pasa si falla el router?" · "¿Qué mensaje recibe el cliente?"
- **Pendiente de validar en UI:** ❓ texto real del toast ante duplicado de documento (llega de Postgres); ❓ si `Guardar` impide doble clic (`:loading="loading"` sí).

---

## CLI-012 · Mensaje de bienvenida (automático y manual)
- **Ruta UI / name:** (a) automático tras el alta del cliente (sin pantalla); (b) manual: icono de mano `waving_hand` con tooltip `Enviar mensaje de bienvenida` en la columna Acciones de la tabla de la pestaña **Servicios** (escritorio, `ServiciosPage.vue:446-467`) o ítem `Enviar mensaje de bienvenida` del menú de la fila en móvil (`:581-596`); ambos solo en servicios no retirados (`!props.row.deleted`) y con `servicio.bienvenida` ✅. Abre el diálogo `Enviar mensaje bienvenida` (`:703-707`) con `servicio = { ...formCliente, ipv4: props.row.ipv4 }`: el modal usa el **id, celular, email y números de referencia del cliente** (no del servicio) y la IPv4 de la fila para elegir el servicio.
- **Archivos:** FE: `components/modals/ModalMessageWelcome.vue`, `composables/useCliente.js:600-610`, `src/composables/useWaCanal.js`, `pages/dashboard/ajustes/plantillas/components/MensajeBienvenida.vue` · BE: `customers.controller.ts:376-383` (`POST /customers/message-welcome`), `customers.service.ts:3074-3088` (encola), `customers/customer-queue.processor.ts:36-375` (cola `${queueName}-cliente`, job `sendMessageWelcome`), `cloud-api/cloud-api.controller.ts:92-97` + `cloud-api.service.ts:349-469,1419-1517` (canales y plantilla oficial), `email/email.service.ts:309-320` (`estaActivo`), `settings/entities/setting.entity.ts:128-129`.
- **Para qué sirve:** Enviar al cliente un mensaje de bienvenida con plan, costo, fecha de corte y empresa.
- **Acceso:** el modal no tiene `validarPermisos` propio; la entrada es el icono de la fila (`servicio.bienvenida`, CLI2/SRV-006). El automático depende de Ajustes → Plantillas → **Mensaje de Bienvenida** (ver abajo; ver `variables.ver.mensaje.bienvenida`, editar `variables.edita.mensaje.bienvenida`, `MensajeBienvenida.vue:170`). Backend: solo `@Auth()` (JWT), sin permisos.
- **Automático (alta):** tras `POST /customers` el frontend pide `GET /settings` y, si `sendWelcomeMessage.activo`, dispara **sin `await` ni `catch`** `POST /customers/message-welcome { cliente_id, ipv4 }` ✅ FE:useCliente.js:560-610 (un fallo no se ve en pantalla). Sin `tipo_envio` el job usa los canales marcados en Ajustes: `sendWelcomeMessage.whatsApp` y `.email`. La importación por Excel **no** lo envía (CLI-004). Pantalla de ajustes (FE:MensajeBienvenida.vue:76-176): interruptor `Enviar mensaje de bienvenida:`, casillas `Enviar por:` → `WhatsApp` y `Correo` (desactivadas si el interruptor está apagado), tabla de variables `{ cliente }` (Nombres del cliente), `{ fecha_pago }` (Fecha de pago), `{ plan }` (Nombre del plan o servicio), `{ costo }` (Costo del plan o servicio suscrito), `{ empresa }` (Nombre de la empresa), editor de texto enriquecido, bloque `Plantilla WhatsApp Oficial` (si `GET /cloud-api/config` dice conectado: sincronizar estado y enviar la plantilla `bienvenida` a aprobación) y botón `Guardar cambios` (`PATCH /settings/:id`, toast `Actualización exitosa`). **No existe texto por defecto**: el estado inicial es `msg: ''`, `activo: false`, `whatsApp: false`, `email: false` (FE:empresas/composables/useSetting.js:22-27) y la columna es `json` anulable sin valor por defecto (BE:setting.entity.ts:128-129) ✅.
- **Campos de formulario (modal):**

| Etiqueta | Tipo | Obligatorio | Valores | Notas |
|---|---|---|---|---|
| `Enviar por:` | select (filled) | sí | `WhatsApp`, `Email`, `Ambas` (valores `whatsapp`/`email`/`ambas`) | vacío → `Debes completar este campo` (en el error del propio select) |
| `Canal de WhatsApp:` | toggle `Oficial` / `No oficial` | no | solo se muestra si `GET /cloud-api/channels` devuelve **ambos** canales disponibles y se envía por WhatsApp o Ambas | valores `cloud_api` / `baileys`; por defecto el único disponible o el canal activo de la empresa (`wa_provider`, por omisión `baileys`) ✅ useWaCanal.js:41-65. Oficial disponible = hay `wa_cloud_phone_number_id` y `wa_cloud_access_token`; no oficial = la sesión de WhatsApp consultada al gateway está conectada (caché de 45 s, tiempo máximo 6 s) ✅ BE:cloud-api.service.ts:434-469 |
| `Celular del cliente:` | teléfono (`vue3-q-tel-input`, país por defecto `TEL_DEFAULT_COUNTRY`, búsqueda `Buscar pais...`) | si WhatsApp/Ambas | precarga el celular convertido; icono `rule` (solo si algún número de referencia tiene móvil) abre un menú con `<celular> - N° principal` y `<móvil> - <referencia>` (tooltip `Numeros de referencias`) | si el componente marca error de formato no envía |
| `Email del cliente:` | email | si Email/Ambas | el formato (`Ingresa un email valido`) solo se valida si el texto tiene **más de 5 caracteres**; vacío → `Debes completar este campo` | |
| `Enviar` | botón | — | — | éxito `Mensaje de bienvenida enviado` (arriba); error: toast `warning` con `error.response.data.message`. **El diálogo se cierra en ambos casos** ✅ ModalMessageWelcome.vue:64-95 |

- **Reglas de negocio (backend, procesador `sendMessageWelcome`, `attempts: 1`, `removeOnFail/Complete`):**
  1. `POST /customers/message-welcome` solo **encola** (`customerQueueProcessor.add`) y responde OK; un fallo posterior no llega al usuario (`customers.service.ts:3074-3088`).
  2. Carga el cliente con servicios, facturas y pagos, y los `settings` (`sendWelcomeMessage`, empresa). Con `tipo_envio` presente, usa el celular/correo del modal **solo para ese envío** (no actualiza la ficha) (`:72-75`). Servicio elegido: `servicio_id`/`servicioId` > `ipv4` > primer activo no retirado > primero no retirado > primero; sin servicios → error `Cliente sin servicios disponibles`.
  3. **Fecha de corte** (variable `fecha_pago`): `meses_tolerancia` = primer número de `factura_id.aplicar_corte`; `pagosPendientes` = pagos del servicio con `estadoSRI !== 'PAGADO'` (**incluye `AUTORIZADO`, `ANULADO`, etc.**); si hay, toma el de índice `min(tolerancia-1, n-1)` y su `dia_pago` (`DD/MM/YYYY`); si no hay, el día de pago del mes siguiente. Con `aplicar_corte` no numérico (p. ej. `Desactivado`) el índice es `NaN` y el job falla con error de tipo (`:89-107`).
  4. **Costo** (`costo`): precio del servicio; con `tipo_impuesto = 'Mas impuestos'` suma IVA según `company.iva` (`4`→15 %, `3`→14 %, `2`→12 %, otro → `IVA_ESTANDAR`) redondeado a 2 decimales; sale como número sin símbolo (`:110-121`). Variables enviadas: `cliente`, `fecha_pago`, `plan`, `empresa` (`nombre_comercial`), `costo`.
  5. **Canales activos**: solo envía por WhatsApp si `companies.whatsapp_activo !== false` (`whatsappActivo`) y por correo si el correo está activo (`estaActivo`: registro de correo con `activo !== false` y host, usuario y contraseña no vacíos). Sin `tipo_envio`: WhatsApp si `sendWelcomeMessage.whatsApp`, correo si `.email`; con `tipo_envio`: según `whatsapp`/`email`/`ambas`. Si no sale ningún canal, el job termina sin error (`console.log` "sin canales activos/aplicables") ✅ `:351-370`.
  6. **WhatsApp oficial** (si `resolverCanalOficial(empresa, wa_provider)`: el modal manda `cloud_api`/`baileys`; sin override, `esCanalOficial` = proveedor `cloud_api` y no se alcanzó el tope diario del *overflow*): `enviarPlantillaPorTipo(..., 'bienvenida', variables)`, que exige una plantilla aprobada. Errores (texto exacto): `No hay plantilla de WhatsApp Oficial para "bienvenida". Créala y envíala a aprobar.`, `La plantilla "bienvenida" no está aprobada (estado: <estado>).`, `El cliente tiene datos incompletos: la(s) variable(s) <x> llegó vacía. Meta rechaza plantillas con parámetros vacíos.` El texto enviado es el cuerpo de la plantilla aprobada, no el HTML de `sendWelcomeMessage.msg`. Éxito: **sin log `SEND_WHATSAPP`**, solo un registro en mensajes masivos (`origen: 'bienvenida'`, `wa_provider: cloud_api`, texto `[Plantilla: bienvenida]…`); fallo: registro `fallido` + log `SEND_WHATSAPP_ERROR` "Error enviando bienvenida por WhatsApp Oficial: <mensaje>" ✅ `:136-176`.
  7. **WhatsApp no oficial (Baileys)**: `GET {HOST_API_WHATSAPP}/api/whatsapp/session/<numero_whatsApp>/info` (si no `connected` → `WhatsApp desvinculado`), `GET .../check-number` (si no existe → `Cliente no usa WhatsApp`) y `POST .../send` con el texto adaptado a WhatsApp (negritas `*x*`, listas, saltos). Éxito: log `SEND_WHATSAPP` "Mensaje de bienvenida enviado exitosamente por WhatsApp" + mensajes masivos `enviado`; error: log `SEND_WHATSAPP_ERROR` "Error enviando mensaje de bienvenida por WhatsApp" (con `error` en el metadata) + mensajes masivos `fallido` ✅ `:179-267`.
  8. **Correo**: asunto `<nombre_comercial> - BIENVENIDO/A`, cuerpo HTML con las variables; logs `SEND_EMAIL` "Mensaje de bienvenida enviado exitosamente por Email" / `SEND_EMAIL_ERROR` "Error enviando mensaje de bienvenida por Email" (todos con `entityType: ServicioCliente`, `entityId` = servicio) y mensajes masivos `origen: 'bienvenida'` ✅ `:270-345`.
- **Efectos secundarios externos:** gateway de WhatsApp no oficial (`HOST_API_WHATSAPP`), Meta Cloud API, correo (SMTP del ISP), historial de mensajes y logs del servicio.
- **Casos límite y advertencias:**
  - El endpoint **responde OK al encolar**; los fallos de envío solo se ven en los logs del servicio y en el historial de mensajes. Un problema de plantilla oficial no avisa al operador.
  - La importación Excel no envía bienvenida. El alta sin `sendWelcomeMessage.activo` tampoco (el envío manual sigue disponible).
  - La fecha de corte cuenta como pendientes las facturas `AUTORIZADO` (ya cobradas con comprobante) y `ANULADO`: puede mostrar una fecha de una factura que ya no se debe.
  - El mensaje manual usa los datos del **cliente** (celular/email de la ficha), no del servicio; con varios servicios, el modal usa la IPv4 de la fila para elegir el plan y la fecha.
- **Preguntas probables:** "¿Por qué no llegó la bienvenida?" (canal apagado/desvinculado, plantilla oficial no aprobada, cliente sin WhatsApp o ver el log del servicio: `SEND_WHATSAPP_ERROR`) · "¿Dónde configuro el texto?" (Ajustes → Plantillas → Mensaje de Bienvenida) · "¿Puedo reenviarla?" (sí: icono de mano en la pestaña Servicios) · "¿Se envía en la importación?" (no) · "¿Por qué dice una fecha de corte que no me cuadra?" (usa la factura pendiente según la tolerancia de corte) · "¿Qué texto trae por defecto?" (ninguno).
- **Límite de lectura:** el gateway de WhatsApp no oficial (`HOST_API_WHATSAPP`: `/api/whatsapp/session/:id/info`, `/check-number`, `/send`) y la API de Meta/Cloud no están en el ZIP; se leyó el lado de ISPMAX que los llama (CLI-012 y la configuración de canales, AJS/MSG).
- **Pendiente de validar en UI:** ❓ aspecto del toast cuando el job falla (no hay aviso en pantalla, solo logs); ❓ comportamiento del selector `Canal de WhatsApp:` con ambos canales conectados (depende de la sesión real).

---

## CLI-013 · Editar cliente: estructura y pestañas
- **Ruta UI / name:** `/clientes/edit/:client_id` · `cliente.edit` · desde el nombre del cliente o el icono `edit` del listado. Breadcrumb `Inicio › Clientes › Edición`; el título es el nombre del cliente. La pestaña activa viaja en `?view=` (valores válidos: `resumen`, `servicios`, `consumo`, `tickets`, `documentos`, `facturacion`, `logs`) (`FE:components/editar/IndexPage.vue:16-24`).
- **Archivos:** FE: `EditCliente.vue`, `components/editar/IndexPage.vue`, `composables/useEditCliente.js` · BE: `GET /customers/find/:term` (`customers.controller.ts:217-221`, `customers.service.ts:1994-2014`).
- **Para qué sirve:** Ficha única del cliente con una pestaña por área.
- **Acceso:** `cliente.edit` (ruta; si falta, al montar redirige a `dashboard`, `IndexPage.vue:27-30`). Además hay que tener **al menos uno** de: `resumen.index`, `servicio.index`, `cliente.ticket.index`, `cliente.contrato.index`, `cliente.documento.index`, `cliente.factura.index`, `cliente.factura.configuracion.index`, `cliente.logs.index`; si no, vuelve a `dashboard` (`:32-44`). El estado inicial `resumen` se muestra aunque el usuario no tenga `resumen.index` (la pestaña no existe y el panel queda vacío ❓).
- **Secciones / pestañas:**

| Pestaña (etiqueta, icono) | Permiso | Componente | Cobertura |
|---|---|---|---|
| `Resumen` (`person`) | `resumen.index` | `ResumenPage.vue` | CLI-014 |
| `Servicios` (`router`) | `servicio.index` | `ServiciosPage.vue` | **ver CLI2** |
| `Consumo` (`speed`) | `servicio.index` | `Consumo/ConsumoPage.vue` | **ver CLI2** |
| `Tickets` (`confirmation_number`) | `cliente.ticket.index` | `Servicios/TicketsPage.vue` | **ver CLI2** |
| `Documentos` (`folder`) | `cliente.contrato.index` **o** `cliente.documento.index` | `Servicios/DocumentPage.vue` | **ver CLI2** (contratos/documentos) |
| `Facturación/Pagos` (`payments`) | `cliente.factura.index` **o** `cliente.factura.configuracion.index` | `FacturacionPagos.vue` | CLI-015…CLI-024 |
| `Logs` (`manage_search`) | `cliente.logs.index` | `logs/IndexpageLogs.vue` | **ver CLI2** |

  Dentro de `Facturación/Pagos` hay sub-pestañas (`FacturacionPagos.vue:26-49`): `Facturas` (`cliente.factura.index`), `Configuración` (`cliente.factura.configuracion.index`), `Cargos` (`cliente.factura.configuracion.index`; tabla de servicios recurrentes → CLI2) y `Grupos` (solo si el cliente tiene ≥ 2 servicios y `cliente.factura.configuracion.index`; → CLI2).
- **Reglas de negocio:** `getClient()` pide `GET /customers/find/<id>` (carga eager de servicios, plan, router, red, caja, puerto, factura); normaliza el celular con `convertirFormatoTelefono`, arma la lista `servicios` (incluye retirados) y preselecciona el primer servicio (`useEditCliente.js:78-112`). Al cambiar `client_id` en la URL recarga.
- **Casos límite y advertencias:** el estado (`servicios`, `serviceClientSelected`, `pagos`) es **global** (singleton del composable); `resetEstadoCliente()` al entrar/salir. El "selector de servicios" solo aparece con más de un servicio. `GET /customers/find/:term` también acepta un nombre completo (busca `UPPER(nombres) = UPPER(term)`) y devuelve **todos** los homónimos.
- **Preguntas probables:** "¿Por qué no veo la pestaña Facturación/Pagos?" (permisos) · "¿Cómo abro directo la pestaña de facturas?" (`?view=facturacion`) · "¿Qué es Cargos/Grupos?" · "¿Dónde veo el historial de cambios?" (Logs, CLI2).
- **Pendiente de validar en UI:** ❓ pestaña inicial cuando el usuario no tiene `resumen.index`.

---

## CLI-014 · Pestaña Resumen (datos del cliente, resumen de notificaciones, información adicional)
- **Ruta UI / name:** `/clientes/edit/:client_id?view=resumen`.
- **Archivos:** FE: `components/editar/ResumenPage.vue`, `ResumenNotificaciones.vue`, `InfoAdicionalCampos.vue` · BE: `PUT /customers/actualizarDatosPersonales/:id` (`customers.controller.ts:256-264`, `customers.service.ts:2170-2270`), `GET /resumen-cliente?servicio_id=` (`app.controller.ts:72-79`).
- **Para qué sirve:** Editar los datos personales del cliente y ver de un vistazo las fechas clave del servicio (día de pago, creación de factura, corte, deuda) y promesas de pago.
- **Acceso:** pestaña `resumen.index`; bloque "Resumen Notificaciones" solo con `resumen.notificaciones`; botón `Guardar Cambios` solo con `resumen.editar_cliente` (`ResumenPage.vue:413`, `:567`).
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación | Notas |
|---|---|---|---|---|
| `Cliente:` | texto | sí (≥ 2 palabras) | igual que el alta | tras guardar actualiza el título |
| `Email:` | texto | no | regex como el alta | |
| `Celular:` | teléfono | sí | `Debes completar este campo` | |
| `Nros. Ref.(Opcional):` | lista | no | igual que el alta | |
| `Dirección Principal:` | texto | sí | máx 300 caracteres, contador | |
| `Tipo de Documento:` | select | sí | opciones por país | **editable** |
| `N. Identificación:` | texto | sí | longitud por país/tipo (mismas reglas que el alta) | **editable**; no se valida unicidad en el backend de este endpoint (ver Hallazgos) |
| `<Provincia>`, `<Cantón>`, `<Parroquia>`, `<nivel4>` | selects | no | | |
| `>> Información adicional:` | campos personalizados | según config | | desplegable (`q-expansion-item`) si hay más de 3 campos |

- **Botones y acciones:** `Guardar Cambios` → `PUT /customers/actualizarDatosPersonales/:id` con todo el formulario salvo `planInternet`, `created_at`, `updated_at`; éxito `Datos del cliente actualizados` (`msg` del backend); error `error.response.data.message` o `No se pudo actualizar el cliente`.
- **Reglas de negocio (backend):** transacción: `preload` + `save` del cliente (sin comprobación de documento duplicado: la restricción única de BD responde con el detalle de Postgres); después, **fuera de la transacción**, si el cuerpo trae `nombres` (siempre en esta pantalla, haya cambiado o no) encola `editEditNameQueueMikrotik` para renombrar las colas en MikroTik de los servicios **no retirados** (`mikrotikService.editNameQueue`, `attempts: 2`; errores solo `logger.warn`); registra log `UPDATE` "Datos del cliente actualizados" (entityType `Resumen`) por servicio con los cambios (`helpersService.detectarCambios`). ✅
- **Bloque "Resumen Notificaciones":** selector `Servicios contratados:` (solo si hay > 1 servicio no retirado; etiqueta `Plan: … IPV4: … <dirección>`), cuatro tarjetas: `Día de pago` (`fechaPago` o `Desactivado`), `Crear Factura` (`fechaCreacionFactura + ' 12:00 AM'` o `Desactivado`), `Día de corte` (`fechaCorte` o `Desactivado`) y `Deuda Actual` (`<moneda><totalConIva> de <n> factura` o `Desactivado`). Alertas: `ATENCIÓN!! El cliente se encuentra con una promesa de pago activa creada el … y vence el día …, fue creada con la factura N° …` o `… incumplió una promesa de pago …`. Datos de `GET /resumen-cliente` (motor CLI-007, caché 25 min).
- **Casos límite y advertencias:** el endpoint está tipado con el DTO `Cliente` (`customers.controller.ts:258-264`), por lo que el `ValidationPipe` global (`whitelist: true`, `transform: true`, `BE:main.ts:37-48`) **valida de nuevo** (documento 5–20 caracteres `[A-Za-z0-9.\- ]`, correo, celular 5–100, etc.), convierte `nombres` a MAYÚSCULAS, normaliza el celular a E.164 y **descarta** propiedades no declaradas (`id`, `servicioId`): por eso el log de cambios se escribe para **todos** los servicios y no solo el seleccionado. Cambiar `tipo_documento`/`numero_documento` **no** actualiza comprobantes ya emitidos. `validarDatosPersonales()` mueve el paso del stepper compartido como efecto lateral.
- **Preguntas probables:** "¿Por qué no puedo editar el cliente?" (`resumen.editar_cliente`) · "¿Cambiar el nombre actualiza el MikroTik?" (sí, nombre de cola) · "¿Qué es Día de corte?" · "¿Por qué dice Desactivado?" (aplicar corte desactivado o sin facturas) · "¿Qué significa promesa activa?"
- **Pendiente de validar en UI:** ❓ texto exacto del selector de servicios (HTML); ❓ cómo se ve el error de documento duplicado (llega el detalle de Postgres del `UNIQUE`).

---

## CLI-015 · Facturación/Pagos › Configuración (FactAndNot en modo edición)
- **Ruta UI / name:** `/clientes/edit/:client_id?view=facturacion` → sub-pestaña `Configuración`.
- **Archivos:** FE: `components/editar/ConfiguracionPage.vue` (envoltorio de `FactAndNot.vue` con `edit=true`), `FactAndNot.vue`, `ConfigNotifications.vue`, `ConfigFacturacionAutomatica.vue`, `ConfigFacturacionTercero.vue`, `ConfigSucursalCobro.vue` · BE: `PUT /customers/actualizarDatosFactura/:id`, `POST /customers/actualizar-contrato`, `PUT /pagos/actualizar-fecha-pago`, `PUT /pagos/actualizar-tipo-impuesto`, `GET /activar-desactivar-servicio/:id`.
- **Para qué sirve:** Cambiar las reglas de facturación/corte/avisos del servicio seleccionado.
- **Acceso:** pestaña `cliente.factura.configuracion.index`; el botón `Guardar` exige `cliente.factura.configuracion.edit` (`FactAndNot.vue:600-612`). Los campos son los de CLI-009 más: `N° de contrato:` y las secciones de CLI-016…CLI-019. Con ≥ 2 servicios aparece el selector de servicio en la cabecera de la sección "Facturación".
- **Botones y acciones:** `Guardar` — secuencia en `actualizarDatosFactura()` (`FactAndNot.vue:62-124`):
  1. `validarFormFact(true)` y `configTercero.validar()`.
  2. `POST /customers/actualizar-contrato {servicio_id, contrato|null}` → error `El contrato <n> ya está asignado a otro servicio.` si otro servicio lo tiene (`BE:3139-3148`).
  3. `PUT /customers/actualizarDatosFactura/<factura_id>` con el formulario (sin `contrato`) → `update` directo de `factura-clientes` + invalida caché del resumen + log `UPDATE` "Datos de facturación actualizados". Éxito: `Datos de Facturación actualizados`.
  4. Si cambió **Dia Pago** → `PUT /pagos/actualizar-fecha-pago`: reubica el día de **todas** las facturas `NO PAGADO`/`PENDIENTE` (excepto `FACT. LIBRE`) del servicio (`BE:pagos.service.ts:819-841`).
  5. Si cambió **Tipo Impuesto** o **Tipo Comprobante** → `PUT /pagos/actualizar-tipo-impuesto`: reescribe ítems y total de las facturas **`NO PAGADO`** (no las `PENDIENTE`); con `Recibo` fuerza `tipo_impuesto='Ninguno'` e `iva=0`, con otro valor **fija `iva: 15`** (`BE:843-886`). ✅
  6. `GET /activar-desactivar-servicio/:id` → reevaluación puntual (CLI-007, puede cortar/reactivar de inmediato).
  7. `guardar()` de facturación automática (captura sus errores y avisa `Facturación automática: debes seleccionar…`), luego de tercero (`PATCH …/datos-facturacion`, sin captura propia: un error cae al aviso general y **omite** el guardado de la sucursal y el mensaje de éxito) y de sucursal de cobro (avisa `No se pudo guardar la sucursal de pagos automáticos`). Ninguno revierte lo anterior.
- **Casos límite y advertencias:**
  - Los 7 pasos **no son atómicos**: si el paso 4 falla, el 3 ya quedó guardado. El mensaje final solo refleja el paso 3.
  - Cambiar `dia_pago` no mueve facturas ya `PAGADO`; cambiar `aplicar_corte` no altera facturas.
  - El campo `Creación Anticipada` no regenera facturas existentes.
  - La sección "Facturación Automática" solo aparece si `Tipo Comprobante = Factura`.
- **Preguntas probables:** "¿Se actualizan las facturas ya creadas si cambio el día de pago?" (las pendientes sí) · "¿Por qué no me deja poner el N° de contrato?" · "¿Por qué mi cliente se cortó al guardar?" · "¿Qué significa N° de contrato duplicado?" · "¿Cambiar a Recibo quita el IVA de lo pendiente?" (sí, en NO PAGADO).
- **Pendiente de validar en UI:** ❓ cómo se ve el aviso cuando falla el paso 5 (la UI no distingue pasos).

---

## CLI-016 · Recordatorios de pago por cliente (sección "Notificaciones")
- **Ruta UI / name:** Facturación y Notificaciones (alta, CLI-009) y Facturación/Pagos › Configuración (edición, CLI-015).
- **Archivos:** FE: `components/ConfigNotifications.vue` · BE: `pagos/notificar-recortatorio-pago-queue.processor.ts:171-249` (`cumpleCondicion`), `:278+` (job `recordatorio_pago`), `entities/Facturacion.entity.ts:44-58`.
- **Para qué sirve:** Elegir por cliente por qué canal y en qué días se le avisa de su deuda. Las horas de envío, textos y plantillas son **globales** (Ajustes › Plantillas).
- **Acceso:** mismos permisos que CLI-009/CLI-015.
- **Campos:** `Recordatorios de pago:` (`Ninguno` | `Correo` | `WhatsApp`, múltiple; `Ninguno` anula a los demás), `Recordatorio #1`, `#2`, `#3` (cada uno: `Desactivado` | `Notificar suspensión` | `1 Día`…`25 Días`, más `Antes del vencimiento` / `Después del vencimiento`).
- **Reglas de negocio (backend):**
  - El cliente entra al envío del recordatorio *k* si `recordatorio_dias[recordatorio_k].dia` ≠ `Desactivado` **y** `recordatorio_pago` no contiene `Ninguno` y la factura es `FACT. DE SERVICIO` pendiente (`NO PAGADO`/`PENDIENTE`) de un servicio no retirado (`:314-364`).
  - La condición se evalúa contra la **fecha de corte efectiva** del cliente (`fechaCorteMasDiasGracia`: corte + días de gracia, desplazada al siguiente día de corte habilitado del router): `Notificar suspensión` = el mismo día del corte; `N Días antes/después` = N días antes/después de esa fecha (`:188-249`, `:518`).
  - Importe: suma de todas las facturas vencidas hasta la de la tolerancia, o solo la más antigua con saldo si el ajuste `sumarMesesAtrasados` = false; promesa de pago activa reemplaza la fecha de corte (`:384-447`).
  - Canales solo si están activos en el ISP (correo configurado, WhatsApp vinculado u oficial); si WhatsApp está desvinculado se crea una notificación interna `WhatsApp Desvinculado` a todos los usuarios (`:341-356`).
  - La creación anticipada por fecha de pago usa el mayor "N días antes" configurado (`crear-facturas.service.ts:542-555`).
- **Mensajes (texto exacto):** `Debes elegir al menos una opción` (front).
- **Efectos externos:** WhatsApp (Baileys/Cloud API plantillas `recordatorio_pago_antes|durante|despues`), correo, notificaciones internas por websocket, `mensajes-masivos` (origen `recordatorio_pago`).
- **Preguntas probables:** "¿Cómo desactivo los recordatorios de un cliente?" (Ninguno) · "¿Por qué no le llegó el recordatorio?" (canal apagado, servicio retirado, aplicar corte desactivado, ya enviado hoy) · "¿Qué es Notificar suspensión?" · "¿A qué hora salen?" (Ajustes).
- **Pendiente de validar en UI:** ❓ texto de las plantillas por defecto; ❓ comportamiento de "Notificar suspensión" cuando el router no corta ese día.

---

## CLI-017 · Facturación automática por servicio
- **Ruta UI / name:** Facturación/Pagos › Configuración → bloque "Facturación Automática:" (solo con `Tipo Comprobante = Factura` y servicio seleccionado).
- **Archivos:** FE: `components/ConfigFacturacionAutomatica.vue` · BE: `facturacion-automatica` (otro módulo): `GET /facturacion-automatica/servicio/:id`, `POST /facturacion-automatica`.
- **Para qué sirve:** Emitir automáticamente la factura electrónica del servicio (sin esperar el pago) a la hora y días configurados.
- **Acceso:** mismo botón `Guardar` de CLI-015.
- **Campos:**

| Etiqueta | Tipo | Obligatorio | Valores | Notas |
|---|---|---|---|---|
| `Activar facturación automática:` | toggle | — | on/off | chip `Activo` si ya existe config |
| `Días de anticipación:` | select | — | `Mismo día de pago`, `1 día antes`…`25 días antes` | |
| `Hora de emisión:` | hora (`q-time`, 24h) | — | default `08:00` | hint `hora en que se emite la factura` |
| `Forma de pago:` | select | sí si activo | `formas-pago` | `Facturación automática: debes seleccionar una forma de pago` |
| `Detalle forma pago:` | select | no | `Ninguno` + detalles de la forma | |
| `Sucursal:` | select | sí si activo | sucursales permitidas; una sola → preseleccionada | `Facturación automática: debes seleccionar una sucursal` |
| `Enviar comprobante al cliente:` | toggle | — | default on | |
| `Considerar días de gracia:` | toggle | — | tooltip: emite en `día de pago + días de gracia` | |
| (sin campo visible) `cantidad_facturas` | — | — | se envía (default 1) | no hay input en pantalla ❓ |

- **Tooltip del título (texto):** "Si está activo, el sistema emite la factura electrónica (SRI) del cliente automáticamente en el día y hora configurados, con la forma de pago y sucursal elegidas — sin esperar a que se registre un pago. La factura queda como NO PAGADA hasta que el cliente pague. Con "Enviar comprobante al cliente" activo, el RIDE/XML se le envía automáticamente."
- **Reglas/efectos:** la config se guarda por `scope: 'servicio'` + `scope_id` = servicio; efecto en SRI/Factus y cola (módulo `facturacion-automatica`, no leído aquí → ❓). Para grupos de servicios existe `ConfigAutomaticaGrupo` (CLI2).
- **Mensajes:** `Error al guardar la configuración de facturación automática` (fallback).
- **Preguntas probables:** "¿Se factura sola?" · "¿Por qué no emite en el día de pago?" (días de gracia) · "¿Qué diferencia hay con Creación Anticipada?" (esa solo crea el registro interno; esta emite la factura electrónica).
- **Pendiente de validar en UI:** ❓ qué ocurre con servicios en grupo (CLI2); ❓ lectura completa del módulo `facturacion-automatica`.

---

## CLI-018 · Facturar a tercero
- **Ruta UI / name:** Facturación/Pagos › Configuración → bloque "Facturar a tercero:"; y recuadro `Facturando a:` dentro de `Agregar Pago`, `Generar Factura Electrónica` (sin pago) y `Cobrar grupo`.
- **Archivos:** FE: `components/ConfigFacturacionTercero.vue`, `components/BannerFacturacionTercero.vue` · BE: `GET|PATCH /customers/servicio/:id/datos-facturacion` (`customers.controller.ts:275-288`), `customers.service.ts:2277-2285`; `servicios-clientes.datos_facturacion` (jsonb).
- **Para qué sirve:** Emitir las facturas electrónicas de ese servicio con otra identificación/razón social (empresa, familiar). El servicio y los cobros siguen siendo del cliente.
- **Acceso:** guardado con el botón de CLI-015 (`cliente.factura.configuracion.edit`). El banner de cobro lo ve quien pueda cobrar.
- **Campos (config):** `Usar datos diferentes para facturar:` (toggle) → `Tipo identificación:` (`Cédula` 05, `RUC` 04, `Pasaporte` 06, `Consumidor Final` 07, `Identificación del Exterior` 08), `Identificación:` (05 → 10 dígitos, 04 → 13; `07` fija `9999999999999`; `maxlength` 20 para el resto; solo dígitos en 04/05), `Razón social / Nombre:` (MAYÚSCULAS), `Dirección:` (≤ 300), `Celular:`, `Email:`.
- **Validaciones (front):** `Campo requerido`, `La cédula debe tener exactamente 10 dígitos`, `El RUC debe tener exactamente 13 dígitos`, `Email no válido`, `Máximo 300 caracteres`. **Diferencia:** en el banner de cobro el email es **obligatorio** (`El email es requerido`, `Ingresa un email válido`, `La identificación es requerida`, `La razón social es requerida`) mientras que en la configuración es opcional.
- **Reglas de negocio (backend):** `updateDatosFacturacion` guarda el JSON tal cual (sin validar) (`:2282-2285`). Al emitir, el cobro envía `comprador_override` a `POST /CE/facturas/generarFacturaElectronica` y queda visible en cada abono como `Facturado a tercero:`.
- **Casos límite:** la validación de longitud 10/13 está codificada para Ecuador aunque `TIPOS_DOCUMENTO` es por país; para Perú/otros hay inconsistencias ❓. `datos_facturacion` por servicio; los grupos tienen su propia versión (`TerceroGrupo`, CLI2).
- **Preguntas probables:** "¿Cómo facturo a nombre de la empresa del cliente?" · "¿Cambia el nombre del cliente?" (no) · "¿Qué pasa con facturas ya emitidas?" (no cambian) · "¿Qué es Consumidor Final?"
- **Pendiente de validar en UI:** ❓ comportamiento con servicios en grupo.

---

## CLI-019 · Pagos automáticos: sucursal de cobro
- **Ruta UI / name:** Facturación/Pagos › Configuración → sección `Pagos automáticos` (**solo visible si el canal de WhatsApp está activo**, `GET /cloud-api/config` → `whatsapp_activo === true`).
- **Archivos:** FE: `components/ConfigSucursalCobro.vue` · BE: `PATCH /customers/servicio/:id/sucursal-facturacion` (`customers.controller.ts:294-302`, `customers.service.ts:2287-2356`), `GET /sucursal/estado-cobro/:servicioId`, `GET /sucursal/find/:companyId/company`.
- **Para qué sirve:** Forzar desde qué sucursal se emiten los comprobantes de cobros que **no pasan por caja** (bot de WhatsApp, pasarelas).
- **Campos:** `Sucursal:` (select con limpiar; hint `Forzada para este cliente. Vaciá el campo para que se resuelva sola (<sucursal>).` o el `detalle` del backend). Mensajes: `Los pagos del bot se emitirán desde <sucursal>` / `Sin sucursal: el bot va a rechazar los pagos de este cliente.`
- **Reglas (backend):** UUID válido (`La sucursal de facturación no es válida.`), existente (`No se encontró la sucursal <id>.`), activa (`La sucursal <n> está inactiva.`) y de la **misma empresa** que el router del servicio (`La sucursal <n> no pertenece a la misma empresa que el router del servicio.`). `null` quita el override y vuelve a heredar (últimos 3 pagos en la misma sucursal, o la del router). Log `DEFINIR_SUCURSAL_COBRO`/`QUITAR_SUCURSAL_COBRO`.
- **Mensaje de error (front):** `No se pudo guardar la sucursal de pagos automáticos`.
- **Preguntas probables:** "¿Por qué el bot rechaza el pago?" (sin sucursal) · "¿Qué sucursal usa por defecto?" · "¿Puedo forzar otra?"
- **Pendiente de validar en UI:** ❓ cómo se muestra con WhatsApp inactivo (la sección no aparece).

---

## CLI-020 · Imágenes del servicio (carga de archivos)
- **Ruta UI / name:** paso `Imagenes` del stepper de servicio (vista de servicio en la pestaña Servicios y en "Ver detalles"); **no existe** en el alta (`FormCliente.vue:91-104`: solo `edit` y estado ≠ `nuevo_servicio`).
- **Archivos:** FE: `components/editar/StepUploadImages.vue`, `src/components/DragAndDropUploadImage.vue`, `src/composables/useFile.js` · BE: `PUT /customers/actualizarDatosServicio/:id` con `onlyUpdateImage`, `POST /files/upload-image/images-services` y `DELETE /files/images-services/:archivo` (`BE:files/files.controller.ts:14-33`), estático `/api/uploads/images-services/<archivo>`.
- **Para qué sirve:** Adjuntar fotos/archivos del servicio (instalación, equipo, etc.).
- **Campos/acciones:** zona de arrastrar y soltar (`DragAndDropUploadImage`, `MAXIMO_FOTOS=11`, `TIPO_ARCHIVO=['any']`, tamaño por archivo `size=100` MB por defecto, `DragAndDropUploadImage.vue:21-25`); `Anterior` / `Siguiente`. Al quitar un archivo: diálogo `¿Deseas retirar este archivo?` (`Eliminar`/`Cancelar`).
- **Reglas de negocio:** cada subida llama `uploadImages(file, "images-services")` por archivo (multipart `file`); guarda el array de nombres con `PUT …/actualizarDatosServicio/:id { images, onlyUpdateImage: true }`; el backend compara antes/después y registra log `UPDATE` "Imágenes del servicio actualizadas: N agregada(s), M eliminada(s)" (`BE:2458-2496`); para el borrado físico `DELETE /files/images-services/<archivo>`; después `GET /activar-desactivar-servicio/:id`. El update general del servicio **ignora siempre** `images` (`BE:2526`). Previsualiza imágenes, PDF (miniatura de la 1.ª página), video y audio; otros tipos con icono genérico (`useFile.js:176-205`).
- **Mensajes:** `Archivos guardados exitosamente`, `Archivo removido`, `Fallo al guardar los archivos`; del componente: `Solo se pueden subir máximo 11 archivos`, `<nombre> supera el peso permitido 100MB`, `El archivo <nombre> se encuentra duplicado`, `Se superó el máximo de archivos permitidos`.
- **Casos límite:** admite cualquier tipo (`any`); el backend (`files`) no define límite de tamaño propio (multer por defecto) ✅. No hay permiso propio en este paso (la visibilidad depende de poder abrir el servicio). Cada archivo nuevo se sube **al seleccionarlo**, no al pulsar un botón "Guardar".
- **Preguntas probables:** "¿Cuántas fotos puedo subir?" (11) · "¿Puedo subir PDF o video?" (sí) · "¿Dónde se ven las fotos?" · "¿Se borran del servidor al quitarlas?" (sí) · "¿Qué tamaño máximo?" (100 MB por archivo en el componente).
- **Pendiente de validar en UI:** ❓ comportamiento con archivos > 50 MB (el body JSON del backend es 50 MB, pero multipart no pasa por ese límite).

---

## CLI-021 · Recursos del cliente (equipos y accesorios)
- **Ruta UI / name:** dentro de la pestaña `Servicios` del perfil (`<RecursosCliente />` al final de `ServiciosPage.vue:671`, CLI2/SRV-008): dos tarjetas, `Equipos vinculados` (icono `router`, chip con el total) y `Accesorios usados` (icono `cable`, chip con el total y la leyenda `(consumidos en las instalaciones del cliente)`).
- **Archivos:** FE: `components/editar/RecursosCliente.vue` (+ `VincularEquipoClienteModal.vue` y `SelectorServiciosCliente.vue` → CLI2) · BE: `GET /customers/:id/recursos?servicio_id=` (`customers.controller.ts:188-197`, `ParseUUIDPipe` en `:id`, solo `@Auth()`), `customers.service.ts:854-988` (`getRecursosCliente`), `equipos/equipos.service.ts:107-146` (`PATCH /equipos/:id`), `servicios-recurrente/servicios-recurrente.service.ts:148-153,208-277` (`GET /servicios-recurrente/servicio/:id` y `DELETE /servicios-recurrente/:id`).
- **Para qué sirve:** Ver los equipos vinculados al cliente (comodato o venta) y los accesorios consumidos en sus instalaciones; vincular/desvincular equipos.
- **Acceso:** **sin permisos en todo el árbol**: ni `RecursosCliente.vue`, ni `VincularEquipoClienteModal.vue`, ni `SelectorServiciosCliente.vue` llaman a `validarPermisos`/`tieneAlguno` (✅ `grep`). Basta poder abrir la pestaña Servicios (`servicio.index`, `editar/IndexPage.vue:68`). Backend: `GET /customers/:id/recursos`, `PATCH /equipos/:id`, `GET/DELETE /servicios-recurrente…` llevan `@Auth()` (JWT) sin permisos.
- **Carga:** al montar y cada vez que cambia el servicio elegido (`serviceClientSelected`, compartido con las demás pestañas): `GET /customers/<cliente de la ruta>/recursos` con `servicio_id` si hay uno elegido; si no hay selección se inicializa con el primer servicio de la lista (aunque esté retirado). El selector `Servicio:` solo se muestra con más de un servicio. Error al cargar: `warning` `No se pudieron cargar los equipos del cliente` ✅ RecursosCliente.vue:23-64.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| `Vincular equipo` | Abre `VincularEquipoClienteModal` para el servicio elegido | ninguno | (CLI2/SRV-008: `PATCH /equipos/:id` + `POST /servicios-recurrente` si es venta) | sin servicio elegido: `warning` `Selecciona un servicio del cliente antes de vincular un equipo.` |
| `Buscar equipo…` / `Buscar accesorio…` | Filtra la tabla (debounce 300 ms) | — | — | filtro del propio `q-table` (cliente) |
| `refresh` (tooltip `Recargar`) | Recarga | — | `GET /customers/:id/recursos` | — |
| `link_off` (tooltip `Desvincular equipo`) | Diálogo `¿Desvincular equipo <serie>?` (`Desvincular`/`Cancelar`) | ninguno | ver "Cadena de desvincular" | éxito `Equipo desvinculado` (verde); error `negative` con `error.response.data.message ?? 'Error al desvincular'` |
| enlace del N° Serie | va a `index.equipos` con `?search=<serie>` | — | — | — |
| chip `Instalación #0000123` / enlace `#0000123` | va a `instalaciones.edit` de la instalación | — | — | número = `secuencial` con 7 dígitos |

- **Columnas — Equipos vinculados:** `Tipo`, `N° Serie`, `N° MAC`, `Plan`, `Modo` (insignia `Venta` morada con `attach_money` | `Comodato` gris con `handshake`), `Origen` (insignia `Instalación #0000123` con tooltip `Vinculado desde el flujo de instalación. Click para abrir.` | `Directo` con tooltip `Vinculado manualmente desde el módulo Equipos o el perfil del cliente.`), `Facturado` (solo venta: `Facturado` verde o `Pendiente` naranja + monto del cargo; comodato `—`), `Vinculado` (fecha `DD/MM/YYYY`), `Acciones`. Filas por página `10, 15, 25, 50, Todas`. **Accesorios usados:** `Accesorio`, `Categoría`, `Cantidad` (chip), `Instalación`, `Fecha de uso`. Sin datos: `Este cliente no tiene equipos vinculados.` / `Este cliente no tiene accesorios registrados.` ✅ RecursosCliente.vue:76-94,217-439.
- **Reglas de negocio (backend `getRecursosCliente`):**
  - **Equipos**: filas de `equipos` cuyo `servicio_id` pertenece a un servicio del cliente (opcionalmente a uno concreto), ordenadas por `created_at DESC`; incluye los de servicios retirados (el retiro no los desvincula).
  - **Facturado**: para `tipo_vinculacion = 'venta'` busca en `servicios-recurrentes` del cliente el cargo cuyo `detalleItems.items[].id` es el id del equipo y cuenta sus filas en `servicios-recurrentes-pagos` no eliminadas: `facturado = count > 0`; `monto_cargo = sr.monto`. `tipo_vinculacion` por defecto `comodato`.
  - **Origen**: `instalacion` si existe un `InstalacionEquipo` tipo `producto` para ese equipo (se toma el más reciente), con `instalacion_id` y `secuencial`; si no, `directo`.
  - **Accesorios**: `InstalacionEquipo` tipo `accesorio` **solo de las instalaciones que originaron servicios del cliente** (`servicios-clientes.instalacion_id IS NOT NULL`); los accesorios consumidos desde un **ticket** (materiales de soporte) no figuran aquí. La respuesta trae también `unidad` (`Mts`/`Uds`) pero el frontend no la muestra: la cantidad sale sin unidad.
  - El texto del diálogo de desvincular cambia: `El equipo se desvinculará del servicio del cliente. Como el cargo de venta YA fue facturado, NO se eliminará.` / `…como el cargo aún no fue facturado, también se eliminará.` / `…quedará disponible para reasignar.` (`RecursosCliente.vue:120-134`).
- **Cadena de desvincular** (✅ RecursosCliente.vue:136-192):
  1. Si es venta y `facturado` no es `true`: `GET /servicios-recurrente/servicio/<servicio>` (con la relación `facturas`) y, si el cargo cuyo primer ítem tiene `id = equipo.id` y `esEquipoVenta` no tiene facturas, `DELETE /servicios-recurrente/<cargo>` (`servicios-recurrente.service.ts:255-277`: quita los ítems del cargo de las facturas `NO PAGADO` vinculadas y recalcula su `total_servicio`, `softDelete` del cargo y log `DELETE` "Servicio recurrente N°. <n> eliminado"). Los errores de este paso se ignoran (best-effort) y no frenan la desvinculación.
  2. `GET /equipos/<id>` para conservar el `historial`.
  3. `PATCH /equipos/<id> { servicio_id: null, estado: 'disponible', historial: [... + {fecha, hora, servicio_id, estado: 'retiro', usuario, usuario_id, ipv4, nombre_plan, cliente, origen: 'perfil-cliente'}] }`. En el backend (`equipos.service.ts:107-146`): vacía `servicios-clientes.equipo_id` del servicio anterior, **borra (`delete`) todas las filas `InstalacionEquipo` tipo `producto` de ese equipo** (en cualquier instalación) y guarda el equipo. El payload **no incluye `tipo_vinculacion`**, por lo que el equipo conserva `venta`/`comodato` hasta una nueva vinculación.
  4. Recarga las tablas (`cargar()`).
- **Estados / valores:** `tipo_vinculacion` `venta` | `comodato`; estado del equipo tras desvincular `disponible`.
- **Efectos secundarios externos:** ninguno (inventario y facturación; no toca MikroTik ni OLT).
- **Mensajes (texto exacto):** `Este cliente no tiene equipos vinculados.`, `Este cliente no tiene accesorios registrados.`, `(consumidos en las instalaciones del cliente)`, `No se pudieron cargar los equipos del cliente`, `Selecciona un servicio del cliente antes de vincular un equipo.`, `Equipo desvinculado`, `Error al desvincular`, `¿Desvincular equipo <serie>?`.
- **Casos límite y advertencias:** **retirar o eliminar al cliente no desvincula sus equipos**: `retirarServicio`/`remove` no tocan la tabla `equipos` (✅ sin referencias en `customers.service.ts:2897-2992`); el diálogo de retiro del listado dice lo contrario (ver CLI-026). Desvincular borra el vínculo equipo↔instalación en **todas** las instalaciones (la instalación deja de mostrar ese producto). El cargo de una venta ya facturada no se elimina: sigue con sus facturas aunque el equipo vuelva a estar `disponible`.
- **Preguntas probables:** "¿Dónde veo qué equipos tiene el cliente?" · "¿Qué pasa con el equipo si lo desvinculo?" (queda `disponible` y se borra su asignación en instalaciones) · "¿Qué significa Pendiente en Facturado?" (el cargo de venta aún no entró en ninguna factura) · "¿Por qué sigue el equipo asignado a un cliente retirado?" (el retiro no lo libera) · "¿Por qué no veo el cable que usó el técnico en el soporte?" (solo se listan accesorios de instalaciones).
- **Pendiente de validar en UI:** ❓ aspecto real de las dos tablas y del selector `Servicio:` con varios servicios (solo en pantalla).

---

## CLI-022 · Facturas del cliente (pestaña Facturas / tarjetas de abono)
- **Ruta UI / name:** `/clientes/edit/:client_id?view=facturacion` → sub-pestaña `Facturas` (icono `receipt_long`). `FacturacionPagos.vue` define cuatro sub-pestañas: `Facturas` (`cliente.factura.index`), `Configuración`, `Cargos` (ambas con `cliente.factura.configuracion.index`) y `Grupos` (con dos o más servicios y el mismo permiso). **La pestaña activa al entrar es siempre `facturas`** (`ref('facturas')`): un usuario sin `cliente.factura.index` pero con `configuracion.index` entra a un panel vacío hasta pulsar otra pestaña ✅ FE:components/editar/FacturacionPagos.vue:7-60.
- **Archivos:** FE: `components/editar/IndexFacturas.vue`, `PagoItem.vue`, `composables/useEditCliente.js:135-303`, `src/composables/useAnularMotivo.js`, `useFacturacion.js:88-125,600-625` · BE (otros módulos, para seguir cada acción): `GET /pagos/find/:servicioId/:clienteId` (`pagos.controller.ts:126-138`, `pagos.service.ts:357-453`), `PATCH /pagos/:id` (`:174`, COB-003), `POST /pagos/create` (`:32`, `pagos.service.ts:167-205`), `PUT /pagos/anular-pago-mes/:id/:estado` (`:203`, `:891-…`), `PATCH /pagos/anular-pago/:id` (`:214`), `PATCH /pagos/anular-abono/:uuid/:id` (`:224`, `:1071-1170`), `DELETE /pagos/:id` (`:235`, `:1293-…`), `PUT /pagos/actualizar-fecha-pago` y `…/actualizar-tipo-impuesto` (`:186-201`), `POST /CE/facturas/generarFacturaElectronica` / `anularFactura` / `anular-multiples-factura` (`comprobantes-electronicos/facturas/facturas.controller.ts:37-64`), `POST /pagos/enviar-recordatorios-pago` (`:251`), `GET /pago-mes-adelantado/servicio/:id`, `GET /grupos-facturacion/cliente/:id`. Todos con `@Auth()` (JWT) sin permisos; `GET /pagos/find` usa `ServiceTokenGuard` (JWT o `x-service-token`).
- **Para qué sirve:** Listar, cobrar, editar, anular y reenviar las facturas del servicio seleccionado.
- **Acceso:** sub-pestaña `cliente.factura.index`. Si el servicio está **retirado**, las acciones se ocultan (`mostrarAccionesFactura`) salvo que en Ajustes › Facturación esté activo `gestionarFacturasRetirados` (lee `GET /settings` con caché de 60 s) ✅ IndexFacturas.vue:190-200. Las acciones que **no** dependen de `mostrarAccionesFactura` son `Ver Factura`, `Ver PDF`, `Imprimir comprobante` y el chip `Promesa`.
- **Carga y filtros:** `GET /pagos/find/<servicio>/<cliente>?page&rowsPerPage&tipo&estado`. El servidor pagina y ordena por `created_at DESC`; el frontend reordena **solo la página recibida** por `vencimiento` descendente. Filtros: `Tipo Factura:` (`Todos`, `Factura de servicio` = `FACT. DE SERVICIO`, `Factura Libre` = `FACT. LIBRE`) y `Estado:` (`Todos`, `PAGADOS`, `NO PAGADOS`, `ANULADOS`, `PENDIENTES`); al cambiar un filtro se pide la página 1 con 5 filas (`getPagosServicio(1, 5)`); `rowsPerPage` inicial 6. **El filtro `Estado` compara `pago.estadoSRI = <valor>` exacto** (`pagos.service.ts:386-388`): `PAGADOS` solo trae `estadoSRI = 'PAGADO'` y **no trae las facturas `AUTORIZADO`/`VALIDADA`** aunque la tabla las muestre con la insignia `PAGADO`. Selector `Servicio` si hay más de uno. Vacío: `No se encontró ningún registro`.
- **Columnas (cabecera):** (expandir, columna `x` sin etiqueta) · `N° Fact.` · `Tipo` · `Vencimiento` · `SubTotal` · `Descto` · `ICE` · `IVA` · `Total` · `Abonado` · `Estado` · `Acciones`. La celda "N° de comprobante" (`Recibo` si `tipo_comprobante = Recibo`; `- - - - - -` si no hay número o la factura está `NO PAGADO`; si no, el número) **no tiene columna propia** en `columns`: el cuerpo pinta 13 celdas frente a 12 encabezados (IndexFacturas.vue:738 vs useEditCliente.js:48-62). `Vencimiento` muestra tres líneas: `Vence: <fecha con gracia>` (tooltip `Fecha de pago más los días de gracia`), la fecha sin gracia y `Emitido: <fecha>`; en facturas libres ambas fechas son `----`. `SubTotal`, `ICE`, `IVA` y `Total` se multiplican por `1 + N` si la factura adelantó N meses (`getMesesMult`/`multVal`), y cuando hay saldo a favor/en contra aplicado se añade debajo una línea gris `→ <valor ajustado SRI>`. El IVA de un `Recibo` es `0`.
- **Estados de la factura (insignia):** `NO PAGADO`, `PENDIENTE` (abono parcial) con contorno gris-azulado; `PAGADO` verde (también cuando el estado real es `AUTORIZADO` o `VALIDADA`); `ANULADO` oscuro. Bajo la insignia: chip `Promesa` si hay promesa activa (tooltip `Promesa de pago activa`, `Fecha límite acordada:`, la nota y `Click para ver el historial completo del cliente` → `ModalHistorialPromesas`); icono `swap_horiz` con tooltip `Generó saldo a favor para siguiente factura: <$>` o `Generó cargo pendiente para siguiente factura: <$>`; iconos `arrow_circle_down`/`arrow_circle_up` con `Saldo a favor aplicado: <$>` / `Saldo en contra aplicado: <$>`. Filas extra: `Meses Adelantados:` (chips `<Mes> <año>`), y para facturas anuladas un recuadro rojo con `Factura anulada`, `Motivo:` (o `No se agregó motivo`), `Anulado por:` y la fecha/hora (`es-EC`).
- **Botones y acciones (por fila, escritorio; `mostrarAccionesFactura` salvo indicación):**

| Tooltip / etiqueta | Visible si | Permiso | Endpoint / efecto |
|---|---|---|---|
| `agregar factura` (cabecera) | `mostrarAccionesFactura` | `cliente.factura.servicio` | abre `ModalNuevaFactura` (CLI-023); **no siempre visible**: se oculta en servicios retirados |
| `cobrar grupo` (cabecera) | el servicio pertenece a un grupo (`GET /grupos-facturacion/cliente/:id`) y `mostrarAccionesFactura` | `cliente.factura.add` | `ModalCobroGrupo` (CLI-023/CLI2); tooltip `Cobra juntas las facturas pendientes de los servicios del grupo "<nombre>" y emite una sola factura electrónica.` |
| `Agregar Pago` (`done_outline`) | `NO PAGADO`/`PENDIENTE` y `total_servicio ≠ 0` | `cliente.factura.add` | si la factura ya tiene un abono `sin_pago` → `ModalConfirmarPago`; si no y el comprobante es `Factura` y el cliente no tiene `numero_documento` y `tipo_documento` → `ModalNoPermitidoFacturar`; si no → `ModalPago` (con `retirado` si el servicio está retirado) |
| `Generar enlace de cobro` (`link`) | idem + `pasarelaDisponible` (`GET /pasarelas-pago/disponibilidad`) | `cliente.factura.add` | `CobroEnlaceDialog` (CLI-024) |
| `Crear promesa de pago` (`handshake`) | `NO PAGADO`/`PENDIENTE`, sin promesa activa y mes de `dia_pago` ≤ mes actual (cualquier mes pasado o el actual; no futuros) | `promesa-pago.crear` | `usePromise.abrirCrearPromesaPara` → diálogo `AddPromise` compacto precargado con cliente, factura y datos del servicio (COB-012); al terminar recarga las facturas |
| `Generar factura electrónica sin pago` (`receipt_long`) | `NO PAGADO`, no `Recibo`, `total_servicio ≠ 0`, sin otro abono `sin_pago` vigente | `cliente.factura.add` | `ModalFacturaSinPago` (CLI-023) |
| `Editar Factura` (`edit`) | `NO PAGADO` y sin abono `sin_pago` | **ninguno** | `ModalNuevaFactura` en edición |
| `Ver Factura` (`visibility`) | `PENDIENTE`/`PAGADO`/`AUTORIZADO`/`ANULADO` (sin `mostrarAccionesFactura`) | **ninguno** | `ModalNuevaFactura` de solo lectura (con meses multiplicados) |
| `Enviar recordatorio de pago` (`send`) | `NO PAGADO`/`PENDIENTE`, total ≠ 0, vencimiento (con gracia) no futuro (`esVencimientoFuturo`: mes/año posteriores al actual) | `cliente.send.recordatorio` | `ModalEnviarRecordatorioPago` (CLI-023) |
| `Eliminar Factura` (`delete`) | tipo `FACT. LIBRE`/`FACT. DE SERVICIO` y estado `NO PAGADO`/`ANULADO` | `cliente.factura.eliminar` | ver "Eliminar" |
| `Anular Factura` (`cancel`) | `NO PAGADO`/`PENDIENTE` | `cliente.factura.anular` | ver "Anular factura del mes" |
| `Ver PDF` (`picture_as_pdf`) | `NO PAGADO`/`PENDIENTE`, total ≠ 0 (sin `mostrarAccionesFactura`) | **ninguno** | `POST /pagos/pdf/pago-pendiente { pago_id }` → PDF que se abre en una pestaña; los errores se ignoran en silencio |
| `Imprimir comprobante` (`print`) | `PAGADO`/`AUTORIZADO` | `cliente.factura.imprimir` | `useTransation.imprimir(pago_id, 'factura_servicio', fecha_hora_abono)` (COB-017) |
| `Anular pago(s) agregados` | `PAGADO`/`PENDIENTE`/`AUTORIZADO` o con abono `sin_pago` | `cliente.cancelar.pago` | ver "Anular pagos" |
| `Hacer activo la factura` (`task`) | `ANULADO` | `cliente.factura.anular` | `¿Deseas hacer valido esta factura?` (`Activar`/`Cancelar`, **sin motivo**) → `PUT /pagos/anular-pago-mes/:id/activar` |

  **Móvil** (`$q.screen.xs`): un único botón `reorder` abre un menú con las mismas acciones **salvo `Generar enlace de cobro` y `Ver Factura`, que no existen en móvil**; la etiqueta es `Generar factura sin pago` (no `…electrónica sin pago`) y `Enviar recordatorio de pago` exige solo `NO PAGADO` (sin `PENDIENTE` ni la comprobación de fecha futura) ✅ IndexFacturas.vue:1250-1470.
- **Qué ve quien tiene `cliente.factura.index` pero no `cliente.factura.add`:** la tabla completa y, por fila, `Editar Factura` (si `NO PAGADO`), `Ver Factura`, `Ver PDF`, y las acciones que tengan su permiso propio; **no** ve `Agregar Pago`, `Generar enlace de cobro`, `Generar factura electrónica sin pago` ni `cobrar grupo` ✅ (resuelve la duda anterior).
- **Cadenas de las acciones de anulación y borrado:**
  - **Eliminar** (`useEditCliente.js:305-350`): diálogo con motivo (`useAnularMotivo`: título `¿Estas seguro de borrar esta factura?`, resumen `Fecha Vencimiento:` y `Total de la factura:`; botones `Eliminar`/`Cancelar`; etiqueta `Motivo de eliminación *` o `(opcional)`, pista `Indique por qué se elimina (mínimo 3 caracteres)`; se pide y es obligatorio según Ajustes › Facturación `anulacionPedirMotivo`/`anulacionMotivoObligatorio`, ambos `true` por omisión) → `DELETE /pagos/<id>` con `{ motivo }` (`pagos.service.ts:1293-…`: sin motivo exigido → 400 `El motivo de eliminación es obligatorio`; guarda `anulacion` y hace `softDelete` de la factura y de su comprobante en `facturas-pagos`; **no valida el estado**) → por cada `servicio_recurrente_pago` de la factura `DELETE /servicios-recurrente-pagos/<id>` (`softDelete` del vínculo y `revertirCargoAlDesvincular`: el cargo vuelve a `ACTIVO` o se restaura el saldo a favor consumido, `servicios-recurrente-pagos.service.ts:195-210`) → `Pago Eliminado...!` → `GET /activar-desactivar-servicio/<servicio>` y refresco de ventas. Error: `Fallo al eliminar la factura` (único texto, oculta la causa).
  - **Anular factura del mes** (`IndexFacturas.vue:551-585`): diálogo con motivo, título `¿Estas seguro de anular esta factura?` y resumen `Fecha Emisión:`, `Fecha Vencimiento:`, `Valor Pendiente:`; `PUT /pagos/anular-pago-mes/<id>/inactivar { motivo }` (BE `anularFacturaMes`: con motivo obligatorio y vacío → 400 `El motivo de anulación es obligatorio`; deja la factura `ANULADO` con `anulacion`, elimina los cargos (saldo a favor) vinculados a sus abonos y escribe el log `ANULAR_FACTURA_MES` "Factura del mes #N anulada. Motivo: …"; con `activar` vuelve a `NO PAGADO` —o `PENDIENTE` si ya tenía abonos—, borra la anulación y registra `REACTIVAR_FACTURA_MES`, `BE:pagos.service.ts:891-962`); la llamada **no tiene `try/catch`**: si falla no aparece ningún mensaje. Después reevalúa el servicio y recarga.
  - **Anular pago(s) agregados** (`anularPago`, `:239-290`): motivo (`¿Estas seguro de anular los pago(s) agregados de esta factura?`); si `total_servicio = 0` y ningún abono tiene comprobante autorizado → `PATCH /pagos/anular-pago/<id> { motivo }`; si no, recorre los abonos no eliminados: los `AUTORIZADO`/`VALIDADA` generan la **nota de crédito** (`PagoItem.anularFacturas(true, false, { motivo, autor })`, expandiendo antes la fila para tener las tarjetas) y el resto `PATCH /pagos/anular-abono/<uuid>/<pago_id> { motivo }` (sin `uuid`, factura antigua → `anular-pago`). `anular-pago` marca todos los abonos `ANULADO`/`eliminado`, deja la factura `NO PAGADO`, anula los meses adelantados que ese pago originó y elimina los cargos vinculados; log `ANULAR_PAGO` (`pagos.service.ts:965-1062`). `anular-abono` hace lo mismo con un solo abono (la factura pasa a `PENDIENTE` si queda otro `AUTORIZADO`/`PAGADO`, si no a `NO PAGADO`; log `ANULAR_ABONO`); con notas de crédito junta todas en `POST /CE/facturas/anular-multiples-factura { notasCreditos }`; al final `GET /activar-desactivar-servicio/<servicio>`. Error: `negative` con `error.response.data.message ?? error.message ?? 'No se pudo anular el pago'` (BE: `Este abono tiene un comprobante electrónico autorizado: hay que anularlo con nota de crédito.` o `Esta factura tiene un comprobante electrónico autorizado: hay que anularla con nota de crédito, no dando de baja el pago.` si se intenta sin nota).
  - **Vencimiento mostrado** = `dia_pago + días de gracia + 1 día`; sin gracia = `dia_pago + 1 día` (`useEditCliente.js:254-255`). "Abonado" suma los abonos no `ANULADO` ni `eliminado`; `cancelado = pagado ≥ costoServicio`.
- **Tarjeta de abono (`PagoItem`, al expandir la fila con `+`/`-`):** cabecera `Fecha Pago: <fecha> <hora>` (o `Sin pago` + `Factura: <fecha>` para el abono `sin_pago`; insignias `Cobro en grupo · N facturas` / `En grupo · N órdenes`), `Valor Abonado:` (o `Total Factura:` si `sin_pago`), `Forma de Pago:`, `Detalle forma de pago:` (o `Sin detalles`), `Nº transacción:` (`...` si vacío), `Nota:` (o `Sin notas`), `Operador:`, `Facturado a tercero:` (si el comprobante tiene `comprador_override`), `Num. Recibo:`/`Num. Comprobante:`, `Estado:` (verde `AUTORIZADO`/`PAGADO`/`VALIDADA`, rojo `ANULADO`, gris `NO PAGADO`/`PENDIENTE`, naranja con tooltip de `respuestaSRI` para errores del SRI, `DEVUELTA` si no hay dato) y, si está anulado, el recuadro `Anulación` (`Motivo:`, `Anulado por:`, `Fecha:`). Botones (centrados):
  - `Editar pago` (`cliente.factura.edit`; no en `ANULADO` ni `sin_pago`) → `ModalEditarPago` (CLI-023).
  - `Reenviar Factura Electrónica` (icono `fa-retweet`, naranja; si hay `num_comprobante` y el estado SRI no es `AUTORIZADO`/`ANULADO`/`VALIDADA`; deshabilitado con `No se puede reenviar, el SRI está fuera de línea` si `statusSRI = offline`; sin permiso) → `POST /CE/facturas/autorizacionComprobantesOffline { id: abono }`.
  - `Imprimir comprobante` (`cliente.factura.imprimir`) → `imprimirComprobante(row, pago, 'abono')`.
  - `Descargar comprobantes` (desplegable, `cliente.factura.descargar`): `Descargar RIDE` (Ecuador) / `Descargar PDF` (otros países), `Descargar XML`, y si el comprobante está anulado `Descargar Nota Credito` y `Descargar XML Nota Credito`; si no hay comprobante electrónico, `Descargar Recibo` (`POST /pagos/pdf/factura-abono`). Facturas migradas con `datil_id` abren `https://app.datil.com/ver/<id>` en otra pestaña; en Colombia (`PAIS_INSTANCIA = CO`) se baja de Factus (`bills`/`credit-notes`), con el aviso `Esta nota crédito no tiene número guardado para descargar (anulada antes de la actualización).` si falta el número.
  - `Reenviar comprobantes` (`forward_to_inbox`) → `ModalReenviarComprobantes` (módulo Ventas, VEN). **La condición es `A || (B && permiso)`**: con el estado SRI en `PAGADO/AUTORIZADO/ANULADO/VALIDADA` el botón sale **sin** exigir `cliente.factura.reenviar`.
  - `Anular pago` (`cancel`, rojo; `PAGADO`/`AUTORIZADO`/`VALIDADA`, no `sin_pago`, no pago antiguo, `cliente.cancelar.pago`; **se oculta si la factura tiene a la vez un abono `AUTORIZADO` y otro `PAGADO`**, `validarEliminarAbonos`) → `borrarAbono`: si el pago es de un cobro agrupado muestra primero `Cobro agrupado` (`Anular el cobro completo`/`Cancelar`); pide motivo (`¿Estás seguro de anular este pago?`); si hay comprobante autorizado pregunta `Nota de crédito` con la casilla `Enviar nota de credito al cliente` (`Continuar`/`Cancelar`; texto `La factura está autorizada en el SRI.` o `…validada en la DIAN.`); emite primero la nota de crédito y el backend anula el abono después (`PATCH /pagos/anular-abono/<uuid>/<pago_id>`); toast `Procesando...!`.
- **Reglas de negocio (backend):** el vencimiento, los abonos y los estados los define `PATCH /pagos/:id` (COB-003); `GET /pagos/find` agrega a cada factura `saldo` (precio del cargo de saldo asociado a su N°), `has_promesa_activa`/`promesa_activa` y `clave_acceso` del abono principal (`pagos.service.ts:400-441`). Reevaluación del servicio tras cada operación (`GET /activar-desactivar-servicio`, CLI-007).
- **Efectos externos:** SRI/DIAN-Factus (emisión, autorización, nota de crédito), correo/WhatsApp (comprobantes, recordatorios), generación de PDF. Detalle en COB-003…COB-010, COB-017 y VEN-002…VEN-005.
- **Mensajes:** `No se encontró ningún registro`, `Pago Eliminado...!`, `Fallo al eliminar la factura`, `No se pudo anular el pago`, `Procesando...!`, `Esta nota crédito no tiene número guardado para descargar (anulada antes de la actualización).`, `No se pudo identificar al cliente. Recargá la página.` (promesa), `El motivo de anulación es obligatorio`, `El motivo de eliminación es obligatorio`.
- **Preguntas probables:** "¿Cómo registro un pago?" · "¿Cómo anulo una factura ya autorizada?" (Anular pago(s) agregados → nota de crédito) · "¿Qué diferencia hay entre Eliminar y Anular?" (Eliminar = borrado lógico de la factura, solo `NO PAGADO`/`ANULADO`; Anular = deja la factura `ANULADO`, reversible con `Hacer activo la factura`) · "¿Puedo cobrar varios meses juntos?" (Meses adelantados, CLI-023) · "¿Por qué no veo el botón de pagar?" (servicio retirado, total 0, estado, permiso `cliente.factura.add`) · "¿Qué es 'Generar factura electrónica sin pago'?" · "¿Por qué el filtro PAGADOS no muestra algunas facturas pagadas?" (las `AUTORIZADO` no entran en el filtro).
- **Pendiente de validar en UI:** ❓ aspecto real de la tabla (la celda sin encabezado desplaza las columnas); ❓ cómo se ven en pantalla las líneas `→ <valor>` de los ajustes SRI.

---

## CLI-023 · Modales de cobro y facturación del cliente
- **Archivos:** FE: `pages/dashboard/clientes/components/modals/*.vue` (`ModalPago`, `ModalNuevaFactura`, `AddProductService`, `ModalFacturaSinPago`, `ModalConfirmarPago`, `ModalEditarPago`, `ModalEnviarRecordatorioPago`, `ModalEnviarComprobante`, `ModalCobroGrupo`, `ModalNoPermitidoFacturar`), `registrar-pago/components/DetalleFacturaPago.vue` · BE: `pagos/pagos.service.ts`, `facturas-pagos/facturas-pagos.service.ts`, `servicios-recurrente-pagos/*`.

Todos en `FE:pages/dashboard/clientes/components/modals/`; se abren desde CLI-022 salvo indicación. Se leyeron completos los diez modales en uso (`ModalPago`, `ModalNuevaFactura`, `AddProductService`, `ModalFacturaSinPago`, `ModalConfirmarPago`, `ModalEditarPago`, `ModalEnviarRecordatorioPago`, `ModalEnviarComprobante`, `ModalCobroGrupo`, `ModalNoPermitidoFacturar`) y `registrar-pago/components/DetalleFacturaPago.vue`; el undécimo, `ModalFacturaLibre.vue`, no está importado en ningún archivo.

| Modal (título) | Archivo | Para qué sirve | Campos y botones clave | Endpoints | Notas |
|---|---|---|---|---|---|
| `Agregar Pago` | `ModalPago.vue` | Registrar un abono/pago total de una factura | Banner `Facturando a:` (solo si el comprobante no es `Recibo`); `Forma de pago:`, `Detalle Forma de pago:`, `Nº transacción: (opcional)`, `Pagar Importe Total:` (toggle), `Notificar al cliente:` (toggle; tooltip), resumen de la factura (`DetalleFacturaPago`, ver abajo), `Descuento($):` (solo si la factura no tiene abonos y tiene ≤ 1 ítem; con tope), `Monto a Cancelar`, `Saldo restante pendiente` + casilla `Pasar a siguiente factura`, `Excedente a favor` + casilla `Acreditar a siguiente factura` (obligatorio: `Debes aceptar esta opción para continuar`), `Monto Pendiente:`, `Notas: (opcional)`, `Sucursal:`, `Meses Adelantados (opcional)` (chips `<Mes> <año>`), `Día de pago al cobrar (opcional)` (interruptor), botón `Guardar` | `GET /pagos/meses-adelantables/:id`, `POST /pagos/check-transaction`, `PATCH /customers/servicio/:id/send-messages-preference`, `PATCH /sucursal/:id` (secuencia de abono), `PATCH /pagos/:id` (cabecera `sucursal-id`), `POST /servicios-recurrente` (saldo), `POST /CE/facturas/generarFacturaElectronica`, `POST /pagos/message/recibos/enviar-whatsApp` | Ver "Detalle de `Agregar Pago`" |
| `Nueva/Editar/Ver factura` | `ModalNuevaFactura.vue` | Crear/editar/ver una factura manual (de servicio o libre) | `Tipo de factura:` (`Factura de servicio`/`Factura Libre`), `Vencimiento:`, `Agregar producto/servicio`, `Agregar Línea`, tabla (`Quitar`, `Producto/Servicio`, `Cantidad`, `P.V.P`, `Descuento $`, `IVA`, `ICE`, `Total`), `TIPO DE IMPUESTO:`, `TIPO DE COMPROBANTE:` (`Factura`/`Recibo`), totales (`SUBTOTAL SIN IMPUESTOS`, `DESCUENTOS`, `ICE`, `SUBTOTAL`, `IVA(n%)`, `TOTAL`), botón `Crear Factura`/`Editar Factura` | `POST /pagos/create` (+ `POST /servicios-recurrente-pagos` por cada cargo recurrente aplicable), `PATCH /pagos/:id`, `GET /pasarelas-pago/cobro/:id/abiertos`, `GET /servicios-recurrente/servicio/:id`, `GET /internet/find/:id`, `GET /products/:id` | Ver "Detalle de `Nueva/Editar/Ver factura`" |
| `Agregar Productos/Servicios.` | `AddProductService.vue` | Elegir ítems para la factura (también lo usa la pestaña Cargos, CLI2) | `Seleccionar Sucursal:`, `Filtrar por codigo de barra o nombre:` (grupos `Personalizado` y `Producto/Servicio`), tabla `Items seleccionados` (`Producto/Servicio`, `IVA`, `ICE`, `PRECIO`; botón `Retirar item`), botón `Agregar Items` (deshabilitado sin ítems) | `GET /servicios-personalizado?page=1&limit=2000`, `GET /products?page=1&limit=100000` (cabecera `sucursal-id`) | Un ítem repetido avisa `Ya fue agregado el producto/servicio: <nombre>`; sin ítems `No se ah agregado un item`; un descuento porcentual (`es_descuento`) se muestra como `-<n>%` |
| `Generar Factura Electrónica` | `ModalFacturaSinPago.vue` | Emitir la factura electrónica sin registrar pago (queda `NO PAGADO`) | Subtítulo `Emite la factura electrónica sin registrar pago — el estado queda como NO PAGADO`; banner `Facturando a:`; `Forma de pago:`, `Detalle forma de pago:`, `Sucursal:`, `Notas:`, `Meses Adelantados (opcional)` (hasta 11), `Plazo de pago (opcional)` + `Días/Meses/Años`, `Enviar comprobante al cliente:`, resumen (Subtotal/Descuento/ICE/IVA/TOTAL), botón `Generar Factura` | `GET /facturas-pagos/by-pago/:id`, `PATCH /pagos/:id` (agrega un abono `sin_pago:true`, valor 0), `POST /CE/facturas/generarFacturaElectronica {sin_pago:true}` | Ver "Detalle de `Generar Factura Electrónica`" |
| `Confirmar Pago` | `ModalConfirmarPago.vue` | Registrar el pago de una factura ya emitida "sin pago" (individual o de grupo) | Subtítulo `Registra el pago de la factura electrónica ya generada`; tarjeta con `Total Factura Electrónica` y forma de pago; `Nº transacción:` (opcional), `Notas:`, `Enviar comprobante al cliente:`, botón `Confirmar Pago` / `Confirmar pago de N órdenes` | `PATCH /pagos/:id` (`estadoSRI:'PAGADO'`) o `POST /grupos-facturacion/confirmar-comprobante`; `GET /grupos-facturacion/comprobante/:uuid/por-confirmar` | Ver "Detalle de `Confirmar Pago`" |
| `Editar Pago` | `ModalEditarPago.vue` | Corregir forma de pago, detalle, Nº transacción, fecha/hora y notas de un abono existente | `Forma de pago:`, `Detalle Forma de pago:`, `Nº transacción:`, `Fecha y Hora:`, monto (solo lectura), `Notas:`; diálogo `¿Confirmar edición?` | `PATCH /pagos/:id` (reescribe `pagos[]`; `?num_comprobante`) | éxito `Pago editado exitosamente`. También lo usan `registrar-pago` y `transacciones` (COB-010). Ver "Detalle de `Editar Pago`" |
| `Enviar mensaje de recordatorios` | `ModalEnviarRecordatorioPago.vue` | Enviar recordatorio manual de una factura | `Enviar por:` (`WhatsApp`/`Email`/`Ambas`), `Canal de WhatsApp:`, `Celular del cliente:`, `Email del cliente:`, casilla `Adjuntar documento PDF`, botón `Enviar` | `POST /pagos/enviar-recordatorios-pago` | Ver "Detalle de `Enviar mensaje de recordatorios`" |
| `Enviar Mensaje` | `ModalEnviarComprobante.vue` | Enviar el comprobante/mensaje de un cargo recurrente | `Enviar por:` (por defecto `Ambas`), `Canal de WhatsApp:`, `Celular del cliente:`, `Email del cliente:`, `Enviar` | `POST /servicios-recurrente/enviar-mensaje` | se abre desde la tabla de cargos (CLI2). Validaciones: `Selecciona un método de envío`, `Debes completar este campo`, `Ingresa un email válido`; éxito `Procesando envío...`; error `error.response.data.message ?? 'Error al enviar'`. El backend exige `cargo_id` (`El campo cargo_id es requerido`) y `tipo_envio` en `whatsapp|email|ambas` (`tipo_envio debe ser whatsapp, email o ambas`) y encola `enviarComprobanteRecurrente` con 2 intentos (`servicios-recurrente.service.ts:279-295`) |
| `Cobrar grupo · <nombre>` | `ModalCobroGrupo.vue` | Cobrar juntas las facturas de un grupo con una sola factura electrónica o confirmar pagos de comprobantes ya emitidos | bloque "por confirmar" (por comprobante: estado, órdenes, `N° transacción (opcional)`, `Nota`, `Confirmar pago`) y bloque `Sin facturar · cobrar y emitir la factura` (casillas por orden, mín. 2), `Forma de pago`, `Detalle forma de pago`, `Sucursal`, `N° transacción (opcional)`, `Nota`, `Enviar comprobante al cliente`, `Cerrar`, `Cobrar <monto>` | `GET /grupos-facturacion/:id/facturas-pendientes`, `…/por-confirmar`, `POST …/cobrar`, `POST …/confirmar` | `Selecciona al menos 2 órdenes de cobro.`, `Selecciona la forma de pago.`, `Selecciona la sucursal.`; diálogo `Confirmar` (`Se cobrarán N órdenes de cobro por $x y se emitirá una sola factura electrónica a nombre de …`); éxito `Pago registrado para N órdenes de cobro.`; errores `No se pudieron cargar las facturas del grupo` / `No se pudo confirmar el pago del grupo`. Backend en CLI2 (grupos de facturación) |
| `Información incompleta del cliente` | `ModalNoPermitidoFacturar.vue` | Avisar que no se puede emitir factura electrónica si el cliente no tiene documento | solo texto: `Para continuar con la emisión de la factura electrónica, es necesario que el cliente tenga registrado un número de documento válido (cédula, RUC o pasaporte).` `Actualmente, este dato no se encuentra ingresado.` | — | Se abre desde `Agregar Pago` si el comprobante es `Factura` y `numero_documento` o `tipo_documento` del cliente es `null` o `''` (IndexFacturas.vue:531-545). Sin botones de acción |
| (sin uso) | `ModalFacturaLibre.vue` | Factura libre (versión anterior) | — | `POST /pagos/create`, `GET /CE/facturas/getNumFactura`, `GET /products` | **no está importado** en ningún componente (✅ `grep` sobre todo `src/`): código muerto |

- **Permisos:** los modales no validan permisos por sí mismos; el control está en el botón que los abre (CLI-022). Backend: `@Auth()` (JWT) en todos los endpoints citados.
- **Detalle de `Agregar Pago`** (✅ ModalPago.vue):
  - **Resumen `DetalleFacturaPago`** (tabla de dos columnas): `Tipo Impuesto`, `Deuda Inicial`, `Base imponible`, `Descuento` (con `→ <valor> (SRI)` si hay saldo aplicado), `ICE`, `Saldo a favor aplicado` / `Saldo en contra aplicado`, `Base imponible neta`, `IVA (n%)`, `Saldo a favor (próxima factura)` / `Cargo pendiente (próxima factura)`, `TOTAL`, `Abonado` (FE:pages/dashboard/registrar-pago/components/DetalleFacturaPago.vue:69-178).
  - **Meses Adelantados**: `GET /pagos/meses-adelantables/<factura>` devuelve los 11 meses siguientes al de la factura con estado `disponible`, `con_factura` (hay una factura `NO PAGADO` de ese mes que **se eliminará** al cobrar), `pagado` (factura `PAGADO`/`AUTORIZADO`/`VALIDADA`/`PENDIENTE`) o `adelantado`; `pagado` y `adelantado` salen bloqueados (candado), la selección debe ser continua (`Hay un mes intermedio que no se puede adelantar`), el mes de la factura va fijo con candado (tooltip `Mes de la factura que se va a pagar (no se puede quitar)`) y, si se eligen meses con factura emitida, aviso naranja `Se eliminará la factura N° …` y confirmación `Se eliminará una factura` / `Se eliminarán facturas` (`Sí, eliminar y cobrar`) (BE:pagos.service.ts:1202-1254). Solo se ofrece si el precio del servicio es > 0 y la factura no es libre. Con N meses el total y el IVA se recalculan con `calcularValoresPorMeses`.
  - **Plazo de pago**: el bloque `Plazo de pago (opcional)` con `Días/Meses/Años` **está comentado en la plantilla** (queda `plazo: 0` en el payload); en su lugar aparece `Día de pago al cobrar (opcional)` (ModalPago.vue:1048-1070). `Día de pago al cobrar` solo se muestra si Ajustes tiene activos `moverDiaPagoAlCobrar` **y** `moverDiaPagoPorCliente` y la factura no es libre (COB-028).
  - **Bandera `VITE_OCULTAR_MESES_PLAZO`**: variable de compilación; con valor `'true'` se oculta **toda** la fila (`Meses Adelantados` y `Día de pago al cobrar`) en `ModalPago.vue:73,982` y en `PayComponent.vue:84,987` (Registrar pago). El valor real depende del despliegue (no se leen archivos `.env`).
  - **Validaciones** (`useFormPago.validarDatos`): `Debes completar este campo` (forma de pago, monto pendiente o a cancelar = 0), `Debes seleccionar una sucursal`, `Debes agregar una nota mayor o igual a 3 caracteres`, exceso sin aceptar el excedente; `Nº transacción` repetido → `mensajeTransaccionUsada`. Con la sucursal única se preselecciona.
  - **Valores por omisión**: `Notificar al cliente:` = `send_messages_preference` del servicio (`?? true`), y antes de cada guardado se persiste con `PATCH /customers/servicio/:id/send-messages-preference`; `Notas` se precarga con la plantilla de nota de pago (la de la red del servicio o `plantillaNotaPago` de Ajustes); los dos checks de "pasar a siguiente factura" se marcan solos si Ajustes tiene `pasarSaldoSiguienteAuto`.
  - **Secuencia al guardar**: validar → banner de tercero (`validar()`) → confirmar eliminación de facturas de meses adelantados → si el comprobante no es `Recibo`, `requiereFacturacion(empresa)` (si no: `La empresa no esta configurada para emitir factura electronica solo recibo, por favor configurar en el modulo empresa si desea continuar con el proceso.`) → `POST /pagos/check-transaction` → si es `Recibo`, o el pago es parcial sin "Crear factura por cada abono" ni "pasar a siguiente factura", asigna `numAbono` con la `secuencia_abono` de la sucursal (`PATCH /sucursal/:id`) → `PATCH /pagos/:id` con el arreglo de abonos (más los `pagosEliminados` para no perderlos), estado `PAGADO` o `PENDIENTE`, `descuento`, `mover_dia_pago` y `meses_adelantados` → crea los cargos `saldo` (`POST /servicios-recurrente`) si se pasó saldo o excedente → si el comprobante es factura y el pago es parcial sin facturar abonos, recarga y cierra; si no, **vuelve a enviar el mismo `PATCH /pagos/:id` junto con `POST /CE/facturas/generarFacturaElectronica` en paralelo** (el segundo PATCH es idempotente: no repite log ni meses, `pagos.service.ts:495-715`) y avisa `procesando factura electrónica`; si es `Recibo` y `send_messages`, `POST /pagos/message/recibos/enviar-whatsApp` y toast `data.msg` = `Pago agregado exitosamente`. Al final `GET /activar-desactivar-servicio/:id` (salvo servicio retirado).
  - **Manejo de errores**: el `catch` de `onSubmit` **solo cierra el modal** (`showModalPago.value = false`) sin mostrar mensaje; como `axios` no tiene interceptor global (boot/axios.ts), un fallo del `PATCH` o de la factura electrónica no avisa al operador: hay que revisar la tabla de facturas.
- **Detalle de `Nueva/Editar/Ver factura`** (✅ ModalNuevaFactura.vue, useNuevaFactura.js):
  - Título `Nueva factura` / `Editar factura` / `Ver factura`. Vencimiento por omisión: sin facturas previas, el `dia_pago` del mes actual (+1 mes si `postpago`) más los días de gracia; con facturas, el de la última + 1 mes (o `N` meses si `aplicar_corte` es `Desde Último Pago`), saltando los meses ya cubiertos por pagos adelantados (detalle en COB-029). Ítems: se precarga la línea del servicio (descripción del plan, no editable ni quitable, cantidad fija) y los **cargos recurrentes** activos o pendientes (`puedeAgregarCargoRecurrente`; etiquetas `Cargo recurrente` / `Cargo saldo pendiente`, chip `Cargos recurrentes activos`); candado con tooltips `Solo lectura`, `Servicio principal (no editable)`, `Saldo pendiente (no editable)`.
  - Validaciones de línea: descripción `Mínimo 3 caracteres` / `Máximo 300 caracteres` (se guarda en mayúsculas); `Agregar Línea` rechaza una nueva línea si hay otra vacía (`Complete la línea vacía antes de agregar otra`); cantidad entera ≥ 1 y, para productos, ≤ stock (pista `Stock: n`); tabla vacía `Agrega algún Producto`. `TIPO DE IMPUESTO:` ofrece `Impuestos incluido`, `Mas impuestos`, `Ninguno` (solo `Ninguno` con `Recibo`). Al pasar a `Factura` fija **IVA 15 %** en los ítems gravables (`onChangeComprobante`, `:316-336`), sin respetar la tarifa del país.
  - Guardado: diálogo `¿Deseas agregar|editar esta factura?` (`Aceptar`/`Cancelar`). Antes, en edición, si hay enlaces de cobro abiertos (`GET /pasarelas-pago/cobro/:id/abiertos`) pregunta `El cliente tiene un enlace de pago activo` (`Editar de todas formas`); en alta de factura de servicio, si el mes del vencimiento ya está cubierto por un pago adelantado pregunta `Mes ya cubierto por pago adelantado` (`Crear de todas formas`). Alta: `POST /pagos/create` (estado `NO PAGADO`, o `PAGADO` si un saldo a favor cubre todo el total) y luego, **para cada cargo recurrente elegible del servicio**, `POST /servicios-recurrente-pagos { servicio: cargo, factura }`; edición: `PATCH /pagos/:id` sin tocar abonos ni estado. Luego `GET /activar-desactivar-servicio/:id`, toast `Se agrego|edito la factura exitosamente` y recarga; error genérico `Algo salio mal`. El backend registra el log `CREATE_FACTURA_SERVICIO|LIBRE` "Factura de servicio|libre #N creada exitosamente" (`pagos.service.ts:167-205`).
  - **Riesgo**: el bucle que vincula cargos recurrentes **no distingue el tipo de factura**: con `Factura Libre` los cargos se quitan de la tabla pero igualmente se vinculan a la factura (`useNuevaFactura.js:117-135` vs watch de `tipo_factura` en `ModalNuevaFactura.vue`), y `servicios-recurrente-pagos.create` los marca `COMPLETADO` (cargo de `Un solo pago`) o consume el saldo a favor sin que sus ítems figuren en la factura (BE:servicios-recurrente-pagos.service.ts:29-100).
- **Detalle de `Generar Factura Electrónica`** (✅ ModalFacturaSinPago.vue): los meses adelantados se calculan **en el modal** (los 11 siguientes al `dia_pago` de la factura), sin consultar `meses-adelantables` ni pedir confirmación: el backend (`PATCH /pagos/:id` con `meses_adelantados`) crea los meses y elimina las facturas `NO PAGADO` de esos meses (`anularFacturasDeMesesAdelantados`, `pagos.service.ts:1256-1291`; las que no están `NO PAGADO` se omiten con un aviso en el log). Avisa antes si ya existe una factura electrónica del período: `Ya existe una factura electrónica generada para este período (<N° comprobante>) con estado <estado>. Continuar generará una factura adicional.` (`GET /facturas-pagos/by-pago/:id`, `{exists, factura}`). Validaciones: `Debes seleccionar una forma de pago`, `Debes seleccionar una sucursal`, banner de tercero. Si la empresa no factura electrónicamente: `La empresa no está configurada para emitir factura electrónica.` Éxito `Procesando factura electrónica...` y cierra; cualquier error: `Error al generar la factura` (oculta la causa). El `PATCH` no valida montos; el abono `sin_pago` queda con `valor: 0` y `total` = total del período. Con varios meses la cantidad de cada producto se multiplica por `N`. La emisión continúa en `FacturasService.generarFacturaElectronica` (VEN-004).
- **Detalle de `Confirmar Pago`** (✅ ModalConfirmarPago.vue): reemplaza el abono `sin_pago` por un pago real **del total completo** (`valor = total`, fecha y hora de ahora, mismo `forma_pago`/`detalle`), `PATCH /pagos/:id` con `estadoSRI: 'PAGADO'` (cabecera `sucursal-id` de la factura); con `n_transaccion` repetido muestra `mensajeTransaccionUsada` bajo el campo. En grupo (`grupo_comprobante` y más de una orden) muestra un aviso (`Esta factura electrónica se emitió en grupo, por N órdenes de cobro. Al confirmar se registra el pago de las N, cada una por su valor.`), el total del comprobante (`GET /grupos-facturacion/comprobante/<uuid>/por-confirmar`) y llama `POST /grupos-facturacion/confirmar-comprobante`. Éxito `Pago registrado correctamente` / `Pago registrado en N órdenes de cobro del grupo`; error `Error al registrar el pago` o el mensaje del backend (los arreglos se unen con ` · `). Persiste además `send_messages_preference` y reevalúa los servicios (`GET /activar-desactivar-servicio/:id`, salvo retirado).
- **Detalle de `Editar Pago`** (✅ ModalEditarPago.vue): localiza el abono por `hora_abono` + `valor` y reescribe `pagos[]` con `{ pagos: row.pagos }`; `row.pagos` **excluye los abonos `ANULADO`** (el listado los separa en `pagosEliminados`, `useEditCliente.js:271-272`) y este modal —a diferencia de `ModalPago`, `ModalFacturaSinPago` y `ModalConfirmarPago`— **no los vuelve a incluir**, por lo que el `PATCH` sobrescribe la columna `pagos` sin los abonos anulados previos (se pierde su rastro de anulación) ✅ ModalEditarPago.vue:72,92 y BE:pagos.service.ts (`update` reemplaza el arreglo). El `catch` solo cierra el modal sin mensaje.
- **Detalle de `Enviar mensaje de recordatorios`** (✅ ModalEnviarRecordatorioPago.vue, BE:pagos.service.ts:1747-1783, notificar-recortatorio-pago-queue.processor.ts:279-440,1155-1170): el modal precarga celular y correo del cliente, valida (`Debes completar este campo`, `Ingresa un email válido` solo si el texto supera 5 caracteres) y llama `api.post` **sin `await`**: el toast `procesando envio....` sale siempre y el `catch` es inalcanzable. El backend encola `recordatorio_pago` con `jobId obtenerFechaPago-<pago_id>`, `attempts:1`, y espera `job.finished()`. Modo manual (`pago_id` presente): toma esa factura **sin comprobar su estado**, usa el celular/correo/canal del modal y `adjuntarPdf` de la casilla, y elige la plantilla de Ajustes › Plantillas por fecha: `durante` si la fecha de corte (vencimiento + gracia) es hoy, `antes` si es futura y `despues` si ya pasó; variables `cliente`, `corte`, `total`, `plan`, `empresa` (más `enlace_pago`/`monto_enlace` si la plantilla las usa). Si el WhatsApp está desvinculado crea además una notificación interna "WhatsApp Desvinculado". El resto del procesador (cron, reparto de envíos, cancelación) se inventaría en COB-026/AUT.
- **Preguntas probables:** "¿Cómo cobro dos meses a la vez?" (Meses Adelantados) · "¿Qué pasa con el saldo si pagan de más?" (se acredita a la siguiente factura: es obligatorio aceptarlo) · "¿Puedo dar un descuento al cobrar?" (si la factura no tiene abonos y solo un ítem; tope = valor del servicio del período) · "¿Qué significa 'Pasar a siguiente factura'?" (crea un cargo `saldo` en la factura siguiente) · "¿Por qué dice que la empresa no está configurada para factura electrónica?" · "¿Por qué se cerró el cobro sin mensaje?" (el error se ignora: revisar la tabla) · "¿Por qué desapareció una factura de otro mes?" (se eliminó al adelantar ese mes).
- **Límite de lectura:** `POST /CE/facturas/generarFacturaElectronica` y la comunicación con el SRI/Factus pertenecen a VEN-004/VEN-005 (microservicio externo); la parte de ISPMAX hasta ese endpoint está leída.
- **Pendiente de validar en UI:** ❓ valor real de `VITE_OCULTAR_MESES_PLAZO` en cada despliegue (variable de compilación).

---

## CLI-024 · Cobro por enlace (pasarela de pago)
- **Ruta UI / name:** diálogo `Enlace de cobro` (subtítulo `Factura N° <n>`) desde el icono `link` (índigo, tooltip `Generar enlace de cobro`) de una factura (CLI-022, solo escritorio: no existe en el menú móvil).
- **Archivos:** FE: `components/editar/CobroEnlaceDialog.vue`, `src/composables/usePasarelasPago.js`, `src/composables/useWaCanal.js` · BE: `pasarelas-pago/pasarelas-pago.controller.ts:59-70` (`GET disponibilidad`), `:173-179` (`POST cobro/:pagoId`), `:187-195` (`GET cobro/:pagoId/abiertos`), `:197-205` (`POST cobro/:pagoId/enviar`), `:207-221` (`POST webhook`, público con firma), `cobros.service.ts`, `envio-cobro.service.ts`, `disponibilidad.service.ts`, `payments-gateway.client.ts`, `pasarelas-pago.service.ts:74-241` (`verificarFirma`, `procesar`), `aplicar-pago.service.ts:45-135` (asiento del pago). Detalle completo del lado servidor en COB-019 (generar/enviar) y COB-020 (webhook y asentado), ya leídos.
- **Para qué sirve:** Generar (o reutilizar) un enlace de pago de la pasarela (PayPhone / dLocal Go) por el **saldo pendiente** y enviarlo al cliente por WhatsApp y/o correo; cuando el cliente paga, el abono se registra solo.
- **Acceso:** el icono aparece con `cliente.factura.add` + factura `NO PAGADO`/`PENDIENTE` con total ≠ 0 + `pasarelaDisponible` (`GET /pasarelas-pago/disponibilidad`: hay una pasarela con credenciales aceptadas que habilita `payment_link`) + acciones de factura visibles (servicio no retirado o `gestionarFacturasRetirados`). Backend: solo `@Auth()` (JWT).
- **Campos y botones:** al abrirse (`watch(abierto)`) llama `POST /pasarelas-pago/cobro/<pago_id>` y muestra `Generando el enlace…`; encabezado con icono `link`, `Enlace de cobro` y `Factura N° <n>`; monto grande `<moneda> <monto>` + subtítulo (`Saldo pendiente de la factura`, o el total de las N órdenes si es comprobante agrupado) y banner azul `Esta factura se emitió en grupo: el enlace cobra las N órdenes juntas (N° …)`; campo de solo lectura con el enlace y botón `content_copy` (tooltip `Copiar solo el enlace`); sección `Enviar al cliente`: select (sin etiqueta, con icono según canal) `WhatsApp` / `Email` / `Ambas` (por omisión `WhatsApp`), `Canal de WhatsApp:` (`Oficial`/`No oficial`, solo si hay ambos canales), teléfono (`vue3-q-tel-input`, precargado de la ficha y editable), `Correo del cliente`; botones `Enviar` y `Copiar mensaje` (texto `Hola, te compartimos el enlace para pagar tu factura N° <n> por <moneda> <monto>:` + salto + URL); resultado por canal (`Correo` / `WhatsApp`: `Enviado` o el error); `Vence` (fecha local `es-EC`) + insignia `Enlace existente` / `Recién generado`; bloque naranja `Hay un enlace anterior` / `Hay enlaces anteriores` (por otro monto o por la pasarela anterior: `Uno por <moneda> <monto> generado con <PayPhone|dLocal Go|…>, la pasarela anterior.`, con el aviso en negrita `Avisale al cliente que use sólo este.`); si ya fue cobrada: banner verde `Esta factura ya fue pagada` + `No se genera un enlace nuevo para evitar un cobro duplicado.`, lista (`Monto`, `Autorización`, `Tarjeta`, `Fecha`) y, si el saldo local sigue > 0, banner naranja "El pago está confirmado en la pasarela pero la factura todavía figura con saldo `<moneda> <saldoLocal>`. Hay que registrar el abono manualmente"; pie azul `Cuando el cliente pague, el pago se detecta solo y queda registrado contra esta factura. No hace falta volver acá.` ✅ FE:CobroEnlaceDialog.vue:1-491.
- **Reglas de negocio (backend):**
  - Saldo = `total_servicio − Σ abonos no eliminados`; si ≤ 0 → `La factura N° <n> no tiene saldo pendiente` (`cobros.service.ts:54`).
  - Antes de generar, **refresca en la pasarela** los cobros pendientes (si no responde: `No se pudo verificar con la pasarela si esta factura ya fue pagada. Reintentá en unos segundos.`, `:348`); si hay un cobro aprobado sin asentar → devuelve `yaPagado` (con autorización/tarjeta/fecha y `saldoLocal`).
  - Monto mínimo de la pasarela (`El monto a cobrar es X, menor al mínimo que acepta la pasarela (Y). Cobralo por otro medio.`, `:125`); sin pasarela: `No hay ninguna pasarela de pagos lista para cobrar. Configurala en Ajustes → Pasarelas de Pagos.` (`:117`).
  - **Reutiliza** el enlace vigente de igual monto y proveedor (`reutilizado: true`); los de otro monto/pasarela quedan vivos y se informan en `enlacesDesactualizados`.
  - Vigencia por defecto 72 h (ajuste `vigenciaEnlacePagoHoras`; valores < 1 o no numéricos usan 72; tope 168 h) (`cobros.service.ts:17,25,289-304`). Para facturas emitidas en **comprobante agrupado** el enlace cobra todas las órdenes del grupo.
  - Envío (`POST …/enviar { tipo_envio, telefono, email, wa_provider }`): WhatsApp oficial usa la plantilla aprobada `enlace_pago`; no oficial envía texto (exige sesión conectada: `WhatsApp no oficial desvinculado (sesión sin conexión)`); correo con asunto `<empresa> - Pago de la factura N° <n>`; validaciones del servidor `Indica el celular del cliente`, `Indica el correo del cliente` (`envio-cobro.service.ts:58,61,140,176`); validaciones del diálogo `Debes completar este campo` y `Ingresa un email válido`. Cada canal responde `{ ok, error }` por separado.
  - **Asiento del pago** (`POST /pasarelas-pago/webhook`, `pasarelas-pago.service.ts:74-241`, `aplicar-pago.service.ts:45-135`): valida la firma HMAC-SHA256 (`x-gateway-signature`, `x-gateway-timestamp` con ±300 s; sin secreto `PAYMENTS_GATEWAY_WEBHOOK_SECRET` el webhook está deshabilitado y responde 401); ignora avisos repetidos (conjunto en memoria `paymentId:event`); `payment.approved` → `AplicarPagoService.aplicarPagoAprobado` (comprobante agrupado → `GruposFacturacionService.confirmarComprobante`; si no, `RegistrarAbonoService.registrar` con monto = `amountCents/100`, `n_transaccion` e idempotencia = código de autorización o id de transacción, forma de pago `PASARELA DE PAGO`, detalle `PAYPHONE`/`DLOCAL GO`, nota `Cobro <pasarela>`, `aplicar_excedente_a_favor: true`); `payment.duplicated` → no toca la factura y envía la alerta `El cliente pagó dos veces el mismo enlace`; cualquier fallo de asiento envía `Pago recibido pero NO registrado` y si salió el abono sin comprobante `Pago registrado sin comprobante`.
- **Efectos externos:** payments-gateway (servicio externo), PayPhone/dLocal Go, WhatsApp (Baileys/Cloud API), correo, WebSocket de notificaciones; webhook de la pasarela para asentar el pago.
- **Mensajes (texto exacto):** `Generando el enlace…`, `No se pudo generar el enlace de cobro` (por omisión si el servidor no trae mensaje), `Enlace copiado`, `Mensaje copiado`, `No se pudo copiar`, `Enlace enviado`, `No se pudo enviar por <canal[ y canal]>`, `No se pudo enviar el enlace`, `Cuando el cliente pague, el pago se detecta solo y queda registrado contra esta factura. No hace falta volver acá.`
- **Casos límite y advertencias:** si la factura se **edita** después de emitir un enlace, el enlace viejo sigue cobrando el monto anterior (la pasarela no permite anularlo); al editar el sistema avisa (`El cliente tiene un enlace de pago activo`, CLI-023). Un pago de más queda como saldo a favor (`aplicar_excedente_a_favor`). La deduplicación de avisos es solo en memoria; si el backend estuvo caído y la pasarela agotó reintentos, el cobro queda sin asentar y se resuelve desde COB-018.
- **Preguntas probables:** "¿Cómo le mando el link de pago?" · "¿Por qué no aparece el botón del enlace?" (no hay pasarela lista, estado/total de la factura, permiso o servicio retirado) · "¿Cuánto dura el enlace?" (72 h por defecto) · "¿Se registra solo el pago?" (sí, por el webhook) · "¿Qué hago si el cliente pagó dos veces?" (alerta "pagó dos veces el mismo enlace"; devolver o acreditar a mano) · "¿Qué pasa si cambio el valor de la factura?" (el enlace viejo sigue vivo).
- **Límite de lectura:** el payments-gateway, PayPhone y dLocal Go no forman parte del ZIP; se leyó el cliente HTTP (`payments-gateway.client.ts`) y todo el código de ISPMAX que genera, envía y asienta el cobro.
- **Pendiente de validar en UI:** ❓ pasarelas realmente habilitadas en cada instalación (depende de las credenciales cargadas); ❓ aspecto del selector `Canal de WhatsApp:` cuando ambos canales están conectados.

---

## CLI-025 · Suspender / activar servicio (manual)
- **Ruta UI / name:** (a) `/clientes` icono `power_settings_new`/`check_circle` (CLI-005) y menú masivo (CLI-003); (b) pestaña Servicios de la ficha (`ServiciosPage.vue:514-540`, CLI2): botón con tooltip `Suspender`/`Activar`.
- **Archivos:** FE: `ActionCellRenderer.vue:309-349`, `composables/useServicios.js:116-152` · BE: `PUT /customers/activeOrSuspendService/:id` (`customers.service.ts:2639-2760`).
- **Acceso:** listado → `cliente.activar.inactivar`; pestaña Servicios → `servicio.activar.suspender`. Backend: JWT.
- **Diálogos (texto exacto):** listado: `Estas seguro de suspender|activar los servicios a <NOMBRE>?` (`Suspender|Activar`/`Cancelar`). Pestaña Servicios: título `Suspender Servicio`/`Activar Servicio`, texto `¿Estas seguro que deseas suspender|activar el servicio al cliente?` + nombre, botones `Si, Suspender`/`Si, Activar`, `Cancelar`; éxito `El cliente fue suspendido|activado`.
- **Reglas de negocio:** ver CLI-007 (orden MikroTik → BD → OLT; log `SUSPENDER_SERVICIO`/`ACTIVAR_SERVICIO`). **No** valida deuda ni promesas: se puede activar a un moroso (el siguiente corte lo volverá a suspender si aplica) y suspender a un cliente al día (la siguiente evaluación lo reactiva).
- **Efectos externos:** MikroTik (address-list `Impagos`/`lista_corte`; PPPoE: secret on/off + lista), SmartOLT/AdminOLT (habilitar/deshabilitar ONU si `aplicarCortes`).
- **Mensajes de error:** `Error al editar el cliente en mikrotik` / `Error al editar el cliente en el smartOLT` + detalle (`BE:2750-2755`).
- **Preguntas probables:** "¿Cómo suspendo temporalmente a un cliente?" · "¿Cuánto tarda en cortarse?" · "¿Por qué se activó solo?" (CLI-007) · "¿Se corta también la ONU?" · "¿Qué pasa si el MikroTik no responde?"

---

## CLI-026 · Retirar servicio / cliente
- **Ruta UI / name:** listado → icono `fa-user-xmark` `Retirar` (CLI-005) / `Retirar seleccionados` (CLI-003) / pestaña Servicios → `Retirar` (`servicio.retirar`).
- **Archivos:** FE: `ActionCellRenderer.vue:351-382`, `useServicios.js:154-202` · BE: `DELETE /customers/delete-service/:service_id` (`customers.service.ts:2896-2989`).
- **Acceso:** `retirar.cliente` (listado/masivo) · `servicio.retirar` (pestaña).
- **Reglas de negocio (backend):**
  1. Carga el servicio con router, empresa y setting. Si ya está `deleted=true` **no toca el MikroTik**; si otro servicio vivo del mismo router usa la misma IPv4/IPv6 tampoco (para no borrarle su configuración) y lo deja en el log (`mikrotik: 'omitido: …'`).
  2. Si no: `deleteCustomer` en MikroTik (v6/v7): PPPoE → elimina secret (+ cola si modo `queue`) + membresía PCQ; no PPPoE → elimina address-list (IPv4/IPv6), cola simple, ARP/DHCP (según `seguridad_alterna`), membresía PCQ.
  3. `UPDATE servicios-clientes SET deleted=true, isActive=false, sn=null, onu_source=null` e invalida el contador de clientes (libera un cupo de la suscripción).
  4. Si `aplicarCortes.smartOLT|adminOLT` y tiene SN: **elimina la ONU** de la OLT (errores solo se registran).
  5. Log `RETIRAR_SERVICIO` ("Servicio retirado (eliminado de Mikrotik)") con estado anterior `Activo`/`Suspendido` → `Retirado`.
- **Qué NO hace (✅ sin código):** no anula ni borra facturas/pagos (las `NO PAGADO` siguen existiendo; el cron no genera nuevas: `crear-facturas` omite `deleted`), no desvincula equipos (`equipos.servicio_id` se conserva), no elimina la instalación de origen, no cancela cargos recurrentes ni promesas, no avisa al cliente. El diálogo afirma "Los Productos en calidad de comodato serán devueltos a almacén" y ofrece "Eliminar registro de instalación": **ninguna de las dos cosas ocurre** (CLI-005).
- **Mensajes:** éxito `Se realizo el retiro exitosamente` (listado) / `Servicio retirado exitosamente` (pestaña); error `error.response.data.message` o `Algo salio mal`. En la pestaña Servicios el botón del diálogo `¿Estás seguro de retirar este servicio?` se llama `Eliminar` aunque la acción es retirar.
- **Preguntas probables:** "¿Qué pasa con las facturas pendientes de un cliente retirado?" · "¿Puedo reactivar un retirado?" (CLI-006) · "¿Se pierde la ONU configurada?" (se elimina de la OLT y hay que re-autorizar) · "¿Libera la IP?" (sí, queda disponible; el frontend la excluye de usadas solo si el servicio está `deleted`).
- **Pendiente de validar en UI:** ❓ si las facturas pendientes de retirados se siguen mostrando en `Deuda Actual` del listado (el motor ignora `deleted`, por lo que el resumen devolvería vacío).

---

## CLI-027 · Eliminar cliente
- **Ruta UI / name:** listado → icono `delete` `Eliminar` (CLI-005) / `Eliminar seleccionados` (CLI-003); en Personas (otro módulo) también `DELETE /customers/:id`.
- **Archivos:** FE: `ActionCellRenderer.vue` (diálogo `ELIMINAR`) · BE: `DELETE /customers/:id` (`customers.controller.ts:343-350`, `customers.service.ts:2817-2861`).
- **Acceso:** `eliminar.cliente`.
- **Reglas de negocio (backend):**
  1. `findOne(id)` (404 `customer with <id> not found`).
  2. Busca los servicios **no retirados** (`deleted=false`) y llama `retirarServicio` por cada uno (CLI-026). Si alguno falla (p. ej. router caído) **aborta** con `No se pudo retirar el servicio <id> antes de eliminar al cliente: <motivo>. El cliente NO se eliminó; corrige e inténtalo de nuevo.`
  3. Renombra `numero_documento` a `<doc>-<NN>` (NN = 2 dígitos aleatorios) y pone `deleted_at = ahora` (soft delete) para **liberar la restricción UNIQUE** y poder volver a registrar el mismo documento.
  4. `deleted_at = ahora` en **todos** los servicios del cliente.
  5. Invalida cachés (`resumenSistema`, `clientesServicios`, `customersCount`).
- **Qué ocurre con facturas y pagos:** **no se borran ni se anulan** (no hay cascada en BD: la entidad usa soft delete). Quedan huérfanas respecto a un cliente que ya no es consultable desde Clientes; el texto del diálogo ("Datos como facturas, pagos, etc serán eliminados") **no coincide** con el código. ❓ efecto en reportes/transacciones (otros agentes).
- **Se puede deshacer:** no hay pantalla de restauración (no existe "papelera"); solo por base de datos.
- **Casos límite y advertencias:**
  - El sufijo aleatorio de 2 dígitos puede **colisionar** si se elimina varias veces al mismo documento (100 combinaciones; la 2.ª eliminación con el mismo sufijo fallaría por la restricción única) ❓.
  - Eliminar un cliente sin servicios (Persona) funciona igual (no hay servicios que retirar).
  - El cliente eliminado sigue ocupando 0 cupos de suscripción (el conteo excluye `deleted_at`).
- **Mensajes:** éxito backend `Eliminado Exitosamente`; UI `Se realizo el retiro exitosamente`.
- **Preguntas probables:** "¿Puedo eliminar un cliente con facturas pendientes?" (sí, sin advertencia) · "¿Se pueden recuperar sus datos?" · "¿Por qué no me deja eliminar?" (router no responde) · "¿Qué diferencia hay entre retirar y eliminar?" (retirar mantiene el cliente y su historial; eliminar lo oculta y libera la cédula).

---

## CLI-028 · Cambio de plan, IP, router, MAC y PPPoE de un servicio
- **Ruta UI / name:** pestaña Servicios → `Editar` (`servicio.editar`, CLI2) → stepper de servicio → paso `Servicios` → botón `Actualizar` (`ServicioInternet.vue:1623-1637`); en "Ver detalles" del listado el mismo botón comparte lugar con `Activar Servicio`/`Agregar Servicio` (`:1639-1660`, CLI-006).
- **Archivos:** FE: `components/ServicioInternet.vue:767-889` (`actualizarServicio`), `components/FormCliente.vue`, `composables/useServicios.js` · BE: `POST /customers/actualizar-contrato` (`customers.controller.ts:385-391`, `customers.service.ts:3121-3190`), `PUT /customers/actualizarDatosServicio/:id` (`customers.controller.ts:315-322`, `customers.service.ts:2433-2577`), `PUT /pagos/actualizar-fecha-pago` y `PUT /pagos/actualizar-tipo-impuesto` (`pagos.controller.ts:186-201`, `pagos.service.ts:822-889`), `GET /activar-desactivar-servicio/:id` (`app.controller.ts:25-31` → job `verifyAndApplyServiceStatus`, `app-queue.processor.ts:68-74,114-…,601-640`), `mikrotik.service.ts:1043-1175` (`editClient` v6), `mikrotik-resources.service.ts:1251-1325` (`editClient` v7), `POST /mikrotik/liberar-amarre/:id` (`mikrotik.controller.ts:65-68`, `mikrotik.service.ts:2873-2903`).
- **Para qué sirve:** Modificar plan, precio, IP, red, NAP, MAC, usuario/clave PPPoE, Wi-Fi, fecha de instalación y dirección de un servicio existente.
- **Acceso:** el botón de la fila de Servicios exige `servicio.editar`; **dentro del formulario no hay más permisos** (ver CLI-006). El select `Router:` **no está bloqueado en edición** (sin `disable`/`readonly`, `ServicioInternet.vue:1073-1105`): se puede mover el servicio a otro router eligiendo un plan de ese router ✅. Backend: `@Auth()` (JWT).
- **Flujo (front, `actualizarServicio`, `ServicioInternet.vue:767-889`):** `validarFormularioServicio(true)` → comprobar usuario PPPoE duplicado (`El usuario PPPoE ya está en uso. Elige otro.`) → paso a `step-servicio` → diálogo `¿Deseas actualizar el servicio?` (`Aceptar`/`Cancelar`) → exige que el perfil elegido esté en la lista del router (`Elige un perfil de internet válido para este router.`) → `POST /customers/actualizar-contrato { servicio_id, contrato: contrato || null }` (**un campo `Contrato` vacío borra el número**; error `El contrato <n> ya está asignado a otro servicio.`; es una llamada aparte, fuera de la transacción siguiente) → `PUT /customers/actualizarDatosServicio/:id` con el formulario, el `perfil_internet` completo, `ipv4_old`, `ipv6_old`, `estado` y `facturacion` → si cambió `dia_pago` llama `PUT /pagos/actualizar-fecha-pago {servicio_id, dia_pago}`; si cambió `tipo_impuesto` o `tipo_comprobante`, `PUT /pagos/actualizar-tipo-impuesto` (ambas con `Promise.allSettled`: sus fallos se ignoran) → `GET /activar-desactivar-servicio/:id` → toast verde con `data.msg` (`Servicio actualizado correctamente`) y `actualizarDatos`. Error: `warning` arriba con `error.response?.data?.message ?? error.message ?? 'No se logro actualizar el servicio'`.
- **Reglas de negocio (backend `actualizarDatosServicio`, `customers.service.ts:2433-2577`):** todo en una **transacción** que incluye la llamada al router: si MikroTik falla se revierte la BD (el servicio queda como estaba; el contrato ya cambiado no se revierte). Pasos: (1) valida unicidad PPPoE por router entre servicios no retirados excluyendo el propio (`Ya existe un cliente con el usuario PPPoE: <u>`); (2) `router_id` pasa a ser el del plan elegido (`router_id = perfil_internet.router_id`, `:2499`); (3) **si no hay `caja_id` o `puerto_id` no es un UUID** (campo vacío o la opción `Ninguno`), quita **ambos** del UPDATE (`:2502-2507`): no se puede vaciar la caja NAP/puerto desde este formulario ni cambiar de caja sin elegir un puerto real; (4) descarta `images` (las gestiona otra llamada) y normaliza `fecha_instalacion`; (5) actualiza `factura-clientes` (`facturacion`) y `servicios-clientes`, invalida la caché de fecha máxima de pago; (6) llama `editClient` del router del **plan nuevo** (v6 `RouterOS` o v7 según `registro_trafico`): servicio PPPoE → edita/renombra el secret, ajusta la membresía PCQ, limpia las IPs viejas de las address-list **solo si la IP cambió** y, en modo `queue`, actualiza la cola simple hallada por la IP vieja (`target`, `max-limit`, `limit-at`, `name = <cliente> | <ip>`, prioridad); otro tipo → membresía PCQ, cola simple hallada por `ipv4_old`/`ipv6_old` (se actualiza; **si no existe, no se crea aquí**), limpieza de IPs viejas y amarre ARP/DHCP **solo si se pone una MAC por primera vez** (`mac_address && !mac_address_old` y router con amarre) ✅; (7) log `UPDATE` "Servicio actualizado" con el diff (o `logServiceSuccess` si `estado` es `activar`/`suspender`).
- **Efecto neto en MikroTik tras la edición:** `GET /activar-desactivar-servicio/:id` encola `verifyAndApplyServiceStatus` con ese `servicio_id`; el motor reevalúa el servicio y, como hay `servicio_id`, empuja **solo ese servicio** con `repararRouter(routerId_actual, false, servicio_id)` (`app-queue.processor.ts:601-640`) → `agregarClientesAlMikrotik` → `createClient` en modo lote: crea la cola (si `control_velocidad` usa colas simples) o el secret si falta, añade la IP a la address-list **del plan nuevo** si no estaba, y sincroniza la lista de corte según el estado (`mikrotik.service.ts:2514-2570,780-900`). Solo opera si el router del servicio está activo (`router.isActive`). Consecuencias leídas en el código: **(a)** al **mover el servicio de router**, `editClient` y la reparación actúan solo en el router del plan nuevo; la cola/secret/ARP del router anterior **no se eliminan**; **(b)** al **cambiar de plan** en modo de colas simples, la IP se añade a la address-list del plan nuevo pero **no se retira de la del plan anterior** si las listas se llaman distinto (`editClient` solo limpia IPs cuando la IP cambia, `limpiarIpsViejas`, `:2689-2701`); **(c)** cambiar una MAC ya guardada no re-amarra: hay que usar `Cambiar Equipo` (`POST /mikrotik/liberar-amarre/:id`, que borra el ARP/lease de la IP en el router y deja `mac_address = null` en el acto, antes de guardar), luego traer/escribir la nueva MAC y `Actualizar`.
- **Qué NO hace:** no verifica unicidad de IPv4 en el backend; no recalcula las facturas **ya emitidas** (`NO PAGADO`/`PENDIENTE`) con el nuevo precio o plan: solo cambian su `dia_pago` (facturas no libres `NO PAGADO`/`PENDIENTE`, `actualizarFechaPago`) y, **solo las `NO PAGADO`**, su tipo de impuesto/comprobante (`actualizarTipoImpuesto` reescribe los ítems con **IVA 15 % fijo** —o 0 si es `Recibo`— y recalcula `total_servicio`) ✅ BE:pagos.service.ts:822-889; no toca la ONU ni SmartOLT salvo la acción independiente `Aplicar WiFi al equipo`.
- **Campos relevantes:** los de CLI-010 más `Cambiar Equipo` (tooltip `Libera el amarre actual para asignar la MAC del nuevo equipo`, solo con MAC guardada y router con amarre), `Obtener MAC del router (por la IPv4 elegida)` (`GET /mikrotik/obtener-mac`), `Traer la MAC desde la ONU vinculada` (`GET /smart-olt/info-completa-onu/:sn`), `Buscar la IP real de esta MAC en el router (corrige la IPv4)` (`GET /mikrotik/obtener-ip-por-mac`; si la IP la ocupa otro cliente en el sistema pregunta `IP ocupada en el sistema` → `Asignar aquí de todos modos` / `Cancelar`), y `Aplicar WiFi al equipo` (`POST /smart-olt/cambiar-wifi/:servicioId`).
- **Mensajes (texto exacto):** `Elige un perfil de internet válido para este router.`, `El usuario PPPoE ya está en uso. Elige otro.`, `El plan anterior no existe en este router. Elige uno de la lista.` (al cambiar de router con otro plan seleccionado), `IPv4 corregida a <ip>. Recuerda guardar el servicio.`, `El contrato <n> ya está asignado a otro servicio.`, `Ya existe un cliente con el usuario PPPoE: <u>`, `Error al editar el cliente en mikrotik` + detalle (arreglo del backend), `Servicio actualizado correctamente`, `No se logro actualizar el servicio`, `Amarre liberado. Detecta o ingresa la MAC del nuevo equipo.`, `Error al liberar el amarre en el router`, `Selecciona un router e IPv4 primero`, `No se encontró la MAC. Verifica que el cliente esté conectado al router.`, `Ingresa una MAC válida (AA:BB:CC:DD:EE:FF) o tráela desde la ONU`.
- **Efectos externos:** MikroTik (cola/secret/address-list/ARP/DHCP/PCQ), SmartOLT (Wi-Fi TR-069, MAC de la ONU), logs `UPDATE` "Servicio actualizado" con diff.
- **Preguntas probables:** "¿Cómo cambio el plan de un cliente?" (editar el servicio → `Perfil Internet:` → `Actualizar`) · "¿Se actualizan las facturas con el nuevo valor?" (no las emitidas) · "¿Cómo cambio la IP?" · "¿Puedo mover un cliente a otro router?" (sí, eligiendo el router y un plan de ese router; el router anterior no se limpia solo) · "¿Qué es Cambiar Equipo?" (libera el amarre MAC) · "¿Por qué dice usuario PPPoE ya en uso?" · "Quité la caja NAP y sigue asignada." (con `Ninguno` o campo vacío el backend no la cambia).
- **Límite de lectura:** el efecto sobre un router real (qué queda en el equipo anterior, listas que usa el firewall) depende de la configuración del MikroTik del cliente; el código de ISPMAX que lo ordena está leído completo (v6 y v7).
- **Pendiente de validar en UI:** ❓ efecto real en el router anterior y en la address-list del plan anterior con un equipo (el código muestra que no se limpian); ❓ comportamiento visual del select `Router:` al cambiarlo con un plan ya elegido.

---

## CLI-029 · API backend `customers`: catálogo de endpoints y guardas
- **Ruta UI / name:** `/api/customers/**` (prefijo global `api`, `BE:main.ts:35`). Controlador `CustomersController` (`BE:customers/customers.controller.ts`).
- **Archivos:** BE: `customers.controller.ts`, `customers.service.ts`, `customer-queue.processor.ts`, `customers.module.ts`, `dto/*`, `entities/*`.
- **Para qué sirve:** Referencia para soporte/desarrollo: qué endpoint hace qué y quién lo consume.
- **Acceso:** `@Auth()` = `AuthGuard('jwt')` + `UserRoleGuard` (solo comprueba que haya usuario) — **ninguna** ruta valida claves de permiso ni rol; la excepción es `GET /customers/:estado?` con `ServiceTokenGuard` (JWT **o** cabecera `x-service-token` = `SERVICE_TOKEN`). El `ValidationPipe` global: `whitelist: true`, `transform: true`, `enableImplicitConversion: true`; body máx 50 MB (`BE:main.ts:28`, `37-48`).
- **Endpoints (línea del controlador):**

| Método y ruta | Línea | Para qué | Consumidor FE | Servicio |
|---|---|---|---|---|
| `POST /customers` | 22 | Alta cliente+facturación+servicio (también importación con `uploadedFromExcel`) | `useCliente.js:583`, `ModalCargarExcel.vue:750` | `create` |
| `POST /customers/agregar-servicio` | 32 | Nuevo servicio a cliente existente | `useServicios.js:67` | `agregar_servicio` |
| `POST /customers/download-clients-excel` | 41 | Excel simple de clientes (plantilla `clientes_plantilla.xlsx`) | **ninguno** (sin uso) | `downloadClientsToExcel` |
| `POST /customers/create` | 54 | Alta de persona (sin servicio) | Personas (`usePersona.js:63`) | `createCustomer` |
| `GET /customers/ids` | 62 | IDs del filtro actual | `IndexPage.vue:800`, Mensajería (`useFiltrosClientes.js:73`) | `findIds` |
| `GET /customers/check-pppoe-usuario` | 79 | ¿Usuario PPPoE ya usado en el router? | `ServicioInternet.vue:744` | `checkPPPoEUsuario` |
| `GET /customers/ubicacion-en-uso` | 90 | ¿Alguien usa esa provincia/cantón/parroquia? | Ajustes › Base de datos (`GestionUbicaciones.vue`) | `ubicacionEnUso` |
| `GET /customers/filtros-conteo` | 101 | Conteo por red/plan/caja | `IndexPage.vue:648` | `conteoFiltros` |
| `GET /customers/limite-suscripcion` | 108 | Cupo de clientes | `ChipPlanSuscripcion.vue`, `ModalCargarExcel.vue` | `estadoLimiteSuscripcion` |
| `GET /customers/licencia-suscripcion` | 114 | Datos de licencia | Ajustes (`ajustes/IndexPage.vue:23`) | `licenciaSuscripcion` |
| `GET /customers/facturas-suscripcion` | 120 | Facturas de la suscripción (master) | Ajustes (`:46`) | `facturasSuscripcion` |
| `GET /customers/:estado?` | 134 | Listado paginado | `IndexPage.vue:1168`, ONUs (`obtenerVinculados=si`) | `findAll` |
| `GET /customers/filtrar-cliente-por-id/:id` | 171 | Cliente con servicios, red, plan, pagos | `RecuperarCliente.vue:44` | `filtrarClientePorId` |
| `GET /customers/mapa/clientes` | 179 | Clientes con coordenadas (limitado a `user.routers`) | Mapa de clientes | `mapaClientes` |
| `GET /customers/:id/recursos` | 190 | Equipos y accesorios | `RecursosCliente.vue:30` | `getRecursosCliente` |
| `POST /customers/find-customer-by-name-document` | 199 | Buscar por nombre/documento (con facturas impagas) | Registrar pago, Promesas | `findCustomerByNameOrDocument` |
| `GET /customers/find-customer/:term/:campo?` | 208 | Cliente por documento, `sn` o `servicio` | Instalaciones, equipos, OLT | `findCustomer` |
| `GET /customers/find/:term` | 217 | Cliente por UUID o nombre exacto | `useEditCliente.js:80` | `findOne` |
| `GET /customers/persons-customer/get` | 223 | Personas (con/sin servicios) | Personas, Ventas | `findPersonsCustomers` |
| `GET /customers/get-ips/:router_id` | 231 | IP/IPv6/caja/puerto usados del router | Alta/edición, redes, cajas NAP | `getIpsUtilizadas` |
| `PATCH /customers/:id` | 237 | Editar persona/cliente (DTO `UpdateCustomerDto`; valida documento único) | Personas (`usePersona.js:66`) | `update` |
| `PUT /customers/actualizarDatosFactura/:id` | 246 | Guarda `factura-clientes` (body `any`) | `FactAndNot.vue:76` | `actualizarDatosFactura` |
| `PUT /customers/actualizarDatosPersonales/:id` | 256 | Guarda datos personales (DTO `Cliente`) + renombra colas | `ResumenPage.vue:118` | `actualizarDatosPersonales` |
| `PATCH /customers/servicio/:id/send-messages-preference` | 266 | Preferencia "notificar" del servicio | `ModalPago`, `ModalConfirmarPago`, `PayComponent` | `updateSendMessagesPreference` |
| `GET\|PATCH /customers/servicio/:id/datos-facturacion` | 275 / 281 | Tercero | `ConfigFacturacionTercero.vue` | `getDatosFacturacion`/`updateDatosFacturacion` |
| `PATCH /customers/servicio/:id/sucursal-facturacion` | 294 | Sucursal de cobros automáticos | `ConfigSucursalCobro.vue:68` | `updateSucursalFacturacion` |
| `PATCH /customers/actualizarServicio/:id` | 304 | Actualización parcial libre del servicio (body `any`, sin lista blanca) | OLT (vincular/desvincular ONU), mapa NAP (trazado) | `actualizarServicio` |
| `PUT /customers/actualizarDatosServicio/:id` | 314 | Edición completa del servicio + MikroTik; modo `onlyUpdateImage` | `ServicioInternet.vue:821`, `StepUploadImages.vue:66` | `actualizarDatosServicio` |
| `PUT /customers/activeOrSuspendService/:id` | 324 | Activar/suspender | listado, Servicios | `activeOrSuspendService` |
| `PATCH /customers/:id/:estado` | 334 | `isActive` del cliente | (sin consumidor claro; Personas usa `PATCH :id`) | `setEstado` |
| `DELETE /customers/:id` | 343 | Eliminar cliente | listado, Personas | `remove` |
| `DELETE /customers/delete-service/:service_id` | 352 | Retirar servicio | listado, Servicios | `retirarServicio` |
| `DELETE /customers/eliminar-service/:service_id` | 361 | Soft delete definitivo de servicio | `RecuperarCliente.vue:33`, Servicios | `borrarServicio` |
| `PUT /customers/active-service/:service_id` | 367 | Reactivar servicio retirado (agrega a MikroTik) | `useServicios.js:230` | `activarServicio` |
| `POST /customers/message-welcome` | 376 | Encola bienvenida | alta, modal | `mensajeBienvenida` |
| `POST /customers/actualizar-contrato` | 385 | Cambia N° de contrato (único) | `FactAndNot.vue:71`, `ServicioInternet.vue:816` | `actualizarContrato` |

- **Reglas de negocio transversales (backend):** `customers.service.ts:3211-3222` `handleDBExceptions`: `23505` → `BadRequestException(detalle de Postgres)`; `23503` → `{detail, code:'23503'}`; otro → `Unexpected error, check server logs` (500). Cache: `cacheInvalidation.invalidateResumenSistema/ClientesServicios/CustomersCount` en `createCustomer`, `setEstado`, `remove`, `retirarServicio` (solo `CustomersCount`).
- **Entidades:** `customers` (UNIQUE `numero_documento`, soft delete), `factura-clientes`, `servicios-clientes` (UNIQUE `contrato`, soft delete + `deleted`, índices `isActive,deleted`, `router_id`), relaciones `pagos`, `tickets`, `contratos`, `servicios-recurrentes`, `equipos`, `instalaciones`.
- **Casos límite y advertencias:** `actualizarServicio`/`actualizarDatosFactura` aceptan **cualquier** propiedad de la entidad (`update` directo con el body) — p. ej. un cliente HTTP podría fijar `deleted`, `isActive` o `router_id` sin pasar por MikroTik. `GET /customers/:estado?` no filtra por empresa ni por los routers del usuario si falta el header `router-id`.
- **Preguntas probables (desarrollo/soporte):** "¿Qué endpoint devuelve la lista de clientes?" · "¿Cómo actualizo solo el SN?" · "¿Dónde se valida el límite de clientes?" · "¿Puedo llamar a la API con un token de servicio?" · "¿Por qué `PUT /actualizarDatosPersonales` devuelve 400?" (DTO).

---

## CLI-030 · Validaciones de cédula/RUC, correo, teléfono y coordenadas (transversal)
Resumen de **dónde** vive cada regla (FE = pantalla, BE = servidor). ✅

| Dato | Frontend | Backend | Observaciones |
|---|---|---|---|
| Nombre | ≥ 2 palabras (`Debes ingresar 2 palabras minimo`); MAYÚSCULAS visual | `@IsNotEmpty`; `trim` + MAYÚSCULAS (`Cliente.nombres`) | `PATCH`/`PUT` pasan por el mismo DTO; la importación pone mayúsculas en el cliente |
| Tipo de documento | select por país (`05`/`04`/`06`) | `@IsString` (opcional); BD enum `04,05,06,07` | `07` solo se ve en "Facturar a tercero" (Consumidor Final) |
| Número de documento | longitud exacta por país/tipo (EC 10/13, PE 8/11); dígitos si longitud fija; alfanumérico ≤ 20 en el resto | 5–20 caracteres `^[A-Za-z0-9.\- ]+$`; UNIQUE en BD | **sin dígito verificador de cédula ni RUC en ninguna capa**; duplicado → detalle de Postgres (alta, `PUT personales`) o `Ya existe un cliente con este numero de documento: <n>` (`PATCH /customers/:id`, `createCustomer`) |
| Correo | opcional; `^[\w.-]+@[\w-]+(\.[\w-]{2,10})+$` | opcional; `@IsEmail` solo si viene | BD NOT NULL → se guarda `''`; en tercero: regex distinta (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) |
| Celular | componente telefónico del país; marca error si inválido; obligatorio | normaliza a E.164 (`+<país><número>`), 5–100 caracteres | si no parece un número de 7–15 dígitos se guarda tal cual (`normalizarTelefonoE164`, `facturacion-utils.ts:398-419`) |
| Teléfonos de referencia | cada fila con `movil` + `referencia` | `numeros_referencias`: filas sin `movil` se descartan; si quedan 0 → `[{movil:'',referencia:''}]` | |
| Dirección | obligatoria; tope 300 solo en edición | `@IsString` opcional; BD varchar(1000) | |
| Coordenadas | texto libre; placeholder `Longitud, Latitud`; el mapa escribe `"<lng>, <lat>"` | `@IsString` opcional; varchar(200) | **no hay validación de formato ni rango** en ninguna capa |
| IPv4 | select de IPs libres (calculado en el front) | `@IsString` no vacío; unicidad solo en importación | sin `@IsIP(4)` |
| IPv6 | pool/subred/lista | `@IsIP(6)`; en importación pertenencia a red activa y unicidad | |
| MAC | `^([0-9A-F]{2}:){5}[0-9A-F]{2}$` (solo para "buscar IP por MAC"); importación `[:-]` o 12 hex | `@IsString` | |
| Usuario PPPoE | duplicado por consulta en vivo | único por router entre servicios no retirados | import: ≤ 64, sin espacios |
| Precio | `^\d{0,9}(\.\d{1,2})?$` | `@IsNumberString` | puede ser 0 |
| N° de contrato | entero ≥ 1 | único (UNIQUE + comprobación) | automático en el alta |

- **Preguntas probables:** "¿Valida el sistema que la cédula sea real?" (no, solo longitud) · "¿Por qué me dice que el documento ya existe?" · "¿Puedo guardar un cliente sin correo?" · "¿Acepta pasaportes con letras?" · "¿En qué formato van las coordenadas?"

---

## CLI-031 · Límite de clientes por suscripción
- **Ruta UI / name:** transversal; chip de plan en la cabecera (`ChipPlanSuscripcion.vue`, otro agente) y Ajustes (licencia).
- **Archivos:** BE: `customers.service.ts:88-176`, `companies/master-suscripcion.service.ts` · FE: `ModalCargarExcel.vue:635-650`.
- **Para qué sirve:** Impedir crear más servicios de los que permite la licencia contratada en el sistema master.
- **Reglas (backend):**
  - Cuenta los servicios **no retirados** (`deleted=false`) de clientes **no eliminados** de la empresa. Límite = `max_clients` de la suscripción o del plan (null = ilimitado).
  - Se valida en `create` (alta y cada fila de importación), `agregar_servicio` y `activarServicio` **solo si el servicio estaba retirado**. **No** se valida en `actualizarDatosServicio` ni al activar un servicio suspendido.
  - Mensaje: `Tu suscripción permite un máximo de <L> clientes y actualmente tienes <U>. Contacta a ventas para ampliar tu plan.`
  - **Tolerante**: sin `suscription_id`, sin `HOST_API_MASTER`/`MASTER_SERVICE_TOKEN`, token inactivo o master caído sin respaldo → **no se aplica control** (usa el último valor en Redis, TTL 5 min + respaldo sin TTL). `ES_INSTANCIA_GESTION=true` desactiva todo.
  - `GET /customers/limite-suscripcion` devuelve `{vinculado, limite, usados, disponibles, plan, activo}`.
- **Casos límite:** retirar un servicio libera un cupo; reactivarlo lo vuelve a ocupar (puede fallar si se alcanzó el límite). La importación pre-valida el lote completo (`El archivo contiene N clientes pero tu suscripción solo tiene M cupos disponibles (límite: L).`).
- **Preguntas probables:** "¿Por qué no me deja crear más clientes?" · "¿Cuenta los retirados?" (no) · "¿Cuenta los suspendidos?" (sí) · "¿Qué pasa si el sistema master está caído?" (no se controla) · "¿Cómo amplío el plan?"
- **Pendiente de validar en UI:** ❓ texto/estilo del chip de plan (otro agente).

---

## CLI-032 · Campos personalizados del cliente (`custom_data`)
- **Ruta UI / name:** definidos en Ajustes › Base de datos › campos (`base-datos.campos`, otro agente); se muestran en alta (CLI-008), Resumen (CLI-014), listado (CLI-002) e importación (CLI-004).
- **Archivos:** FE: `DatosPersonales.vue:89-101,415-470`, `ResumenPage.vue`, `InfoAdicionalCampos.vue`, `IndexPage.vue:1040-1077` · BE: `custom-fields/custom-fields.service.ts`, `customers.custom_data` (json).
- **Reglas:** tipos válidos `texto`, `numerico`, `selector` (≥ 2 opciones), `fecha`; el nombre no admite espacios (se usa `_`); `GET /custom-fields` → `{campos:[{nombre,tipo,opciones}]}`. En pantalla la etiqueta sustituye `_`/`-` por espacios y capitaliza. Renombrar un campo migra el valor en `customers.custom_data` (SQL en transacción, `:86-100`); borrarlo **no** limpia los valores guardados.
- **Listado:** una columna `custom_<nombre>` por campo (oculta por defecto), filtro por texto en servidor (`LIKE` sobre `custom_data->>nombre`).
- **Importación:** columnas de Excel desde la posición 27 (índice ≥ 26) con cualquier otra cabecera = campo personalizado; se guarda el texto sin validar tipo ni opciones.
- **Preguntas probables:** "¿Cómo agrego un campo propio al cliente?" · "¿Dónde aparece en la tabla?" · "¿Qué pasa si renombro el campo?" · "¿Puedo importarlos por Excel?"
- **Pendiente de validar en UI:** ❓ si el valor `selector` se guarda con la capitalización mostrada (`capitalize`) y rompe coincidencias con la opción original.

---

## CLI-033 · Columna «Fact. Automática» del listado
- **Ruta UI / name:** `/clientes` · columna `facturacion_automatica` (visible por defecto desde 2026-10-14; `stores/auth-user.ts:69`).
- **Archivos:** FE: `composables/useClientesIndex.js:58-100,366-381` (`etiquetaFacturacionAutomatica`, `detalleFacturacionAutomatica`, `filtrarFacturacionAutomatica`), `cell_renders/ClienteFacturacionAutomatica.vue` · BE: **ninguno** ⚠️.
- **Qué muestra:** por servicio, `No` (gris) o una píldora `Sí · <alcance>` con ícono `autorenew`; alcances `Servicio`, `Router`, `Plan`, `Red`, `Grupo` (varios se unen: `Sí · Plan + Red`). El tooltip dice por alcance `se emite N día(s) antes del vencimiento` o `el día del vencimiento`, `a las HH:MM`.
- **Fuente de datos:** `servicio.facturacion_automatica` = lista de configuraciones activas que le alcanzan (propia, o de su router, plan o red; si su grupo tiene la suya, solo la del grupo) con `scope`, `dias_anticipacion`, `hora` (comentario `useClientesIndex.js:58-62`).
- **Filtro:** texto libre; `no`, `sin` o `inactiv…` → servicios sin facturación automática; cualquier otro texto → con ella. Sin mapeo en el servidor (`customers.service.ts` `fieldMapping`): solo filtra la página cargada.
- **Preguntas probables:** "¿Qué significa Fact. Automática en el listado?" · "¿Cómo sé qué clientes se facturan solos?"
- **Pendiente / hallazgo:** ⚠️ en `backend-isp` 7501da79 (2026-10-13) ninguna parte de `customers/**` añade `facturacion_automatica` a la respuesta del listado (`grep` en `src/**` solo halla la entidad y un SQL del servicio de facturación automática): la columna mostraría `No` en todos los servicios. ❓ confirmar en pantalla; probablemente el backend correspondiente aún no se publicó (el frontend es del 14/10).

---

## CLI-034 · Estado «Retirado» al exportar clientes (y su importación)
- **Ruta UI / name:** `/clientes` → menú Excel → `Exportar Clientes`; modal `Importar Excel`.
- **Archivos:** FE: `IndexPage.vue:851-904` (`downloadFile`), `components/modals/ModalCargarExcel.vue:349-353` · BE: `mikrotik/mikrotik.service.ts:1624-1760` (filtro), `:2275-2282` (validación de la columna Y), `:2349-2353` (valor) (`downloadExcelCustomers`).
- **Reglas de exportación:** (1) si `clientes` va vacío y `estado ≠ 'Todos'`, el backend resuelve los ids con `customersService.findIds(estado, filtros, mesesSuspendidos, red, plan, caja)`; (2) con `estado ≠ 'Todos'` y sin `serviciosIds`, filtra `servicio.deleted = (estado === 'Retirados')`; (3) si aun así no hay clientes, agrega `1 = 0` (archivo vacío; antes exportaba todo el router); (4) la columna Y (Estado) vale `Retirado` si `deleted`, si no `Activo`/`Inactivo`; la lista desplegable de la celda es `Activo, Inactivo, Retirado` solo al exportar (`with_customer`) y `Activo, Inactivo` en la plantilla vacía.
- **Importación:** `rows[i][24]` vacío → `isActive = true`; igual a `"Activo"` → `true`; cualquier otro texto (incluido `Retirado`) → `false` (Inactivo). Importar un archivo exportado **no** restaura retirados.
- **Preguntas probables:** "¿Cómo exporto solo los retirados?" · "¿Por qué el Excel exportado sale vacío?" · "¿Puedo volver a importar a los retirados?"

---

## Catálogo de permisos del alcance (claves usadas en `pages/dashboard/clientes/**`)

| Clave | Dónde | Qué muestra / permite |
|---|---|---|
| `index.clientes` | ruta, menú | acceder al listado (ítem "Clientes") |
| `crear.cliente` | listado | `Agregar Cliente` / botón flotante; ruta `/clientes/add` |
| `cliente.edit` | listado, ruta, ficha | icono Editar, ruta `/clientes/edit/:id`, y acceso a la ficha (sin él redirige a `dashboard`) |
| `cliente.activar.inactivar` | listado, masivo | icono Activar/Suspender; `Activar/Suspender seleccionados` |
| `retirar.cliente` | listado, masivo | icono Retirar; `Retirar seleccionados` |
| `eliminar.cliente` | listado, masivo | icono Eliminar; `Eliminar seleccionados` |
| `detalles.cliente` | listado | icono `Ver detalles` (Listado de Servicios) |
| `resumen.index` | ficha | pestaña `Resumen` |
| `resumen.notificaciones` | Resumen | bloque "Resumen Notificaciones" |
| `resumen.editar_cliente` | Resumen | botón `Guardar Cambios` |
| `servicio.index` | ficha | pestañas `Servicios` y `Consumo` |
| `servicio.agregar` / `servicio.editar` / `servicio.retirar` / `servicio.activar.suspender` / `servicio.vincular.onu` / `servicio.bienvenida` | pestaña Servicios (CLI2) | botones por servicio |
| `cliente.ticket.index` (+ `.agregar`, `.editar`, `.eliminar`, `.reenviar_msg`) | ficha (CLI2) | pestaña Tickets y sus acciones |
| `cliente.contrato.index` (+ `.agregar`, `.editar`, `.eliminar`, `.descargar`, `.notificacion`) / `cliente.documento.index` (+ `.agregar`, `.editar`, `.eliminar`, `.descargar`, `.notificacion`) | ficha (CLI2) | pestaña Documentos |
| `cliente.logs.index` | ficha (CLI2) | pestaña Logs |
| `cliente.factura.index` | Facturación/Pagos | sub-pestaña `Facturas` |
| `cliente.factura.configuracion.index` | Facturación/Pagos | sub-pestañas `Configuración`, `Cargos`, `Grupos` |
| `cliente.factura.configuracion.edit` | Configuración | botón `Guardar` |
| `cliente.factura.servicio` | Facturas | `agregar factura` |
| `cliente.factura.add` | Facturas | `Agregar Pago`, enlace de cobro, factura electrónica sin pago, `cobrar grupo` |
| `cliente.factura.edit` | tarjeta de abono | `Editar pago` |
| `cliente.factura.eliminar` | Facturas | `Eliminar Factura` |
| `cliente.factura.anular` | Facturas | `Anular Factura` / `Hacer activo la factura` |
| `cliente.factura.imprimir` | Facturas/abono | `Imprimir comprobante` |
| `cliente.factura.descargar` | abono | `Descargar comprobantes` |
| `cliente.factura.reenviar` | abono | `Reenviar comprobantes` (la condición mezcla `||`/`&&`, ver Hallazgos) |
| `cliente.cancelar.pago` | Facturas/abono | `Anular pago(s) agregados` / `Anular pago` |
| `cliente.send.recordatorio` | Facturas | `Enviar recordatorio de pago` |
| `promesa-pago.crear` | Facturas | `Crear promesa de pago` |
| `base-datos.campos` / `ajuste.*` | fuera de alcance | gestión de campos personalizados, ubicaciones |

Sin permiso propio (accesibles para cualquiera que llegue a la pantalla): `Importar Excel`/`Descargar Plantilla`/`Exportar Clientes`, `Eliminar definitivamente` (servicio retirado), `Editar Factura`, `Ver Factura`, `Ver PDF`, `Vincular equipo`/`Desvincular equipo`, `Cambiar Equipo`, `Aplicar WiFi al equipo`, `Subir imágenes`.

---

## Hallazgos del dominio

**A. Discrepancias frontend ↔ backend**
1. **Permisos solo en el front.** Ningún endpoint de `customers` valida claves de permiso ni rol (`@Auth()` = JWT, `user-role.guard.ts`). Ocultar un botón no protege la acción; `PATCH /customers/actualizarServicio/:id` y `PUT /customers/actualizarDatosFactura/:id` aceptan cualquier propiedad de la entidad (body `any`). `GET /customers` además acepta `x-service-token`.
2. **IPv4 duplicada**: el manual (`crear-cliente.mdx`) dice que el sistema lo impedirá con *ya existe un cliente con esta ipv4*; en el alta manual **solo** lo evita el select del frontend (excluye IPs usadas). El backend únicamente comprueba la IP en la importación Excel (`customers.service.ts:277-279`).
3. **Eliminar cliente**: el diálogo afirma que "facturas, pagos, etc serán eliminados" y el manual dice "Borra el cliente"; el código solo hace soft-delete de cliente y servicios y renombra el documento (`remove`, `:2817-2861`). Facturas y pagos permanecen.
4. **Retirar**: el diálogo promete devolver comodato a almacén y ofrece "Eliminar registro de instalación"; el interruptor no se envía al backend y `retirarServicio` no toca equipos ni instalaciones (`ActionCellRenderer.vue:351-382`, `customers.service.ts:2896-2989`).
5. **Acciones masivas con "seleccionar todos"**: se seleccionan IDs de todo el filtro, pero `accionMasiva` opera sobre `gridApi.getSelectedRows()` (solo la página cargada). El manual (`clientes.mdx`, advertencia de acciones masivas) afirma lo contrario. Además el diálogo anuncia el número de filas de la página, no el contador del botón.
6. **"Seleccionar todos" ignora la búsqueda**: `GET /customers/ids` no recibe `search` (`IndexPage.vue:800-810`).
7. **Filtros de columna sin mapeo** (`mac_address`, `contrato`, `dia_corte`, `ultimo_pago`, `tipo_pago`, `deuda_actual`, `total_sin_iva`, `hasServicesActive`, y desde 2026-10-14 `facturacion_automatica`): el servidor los ignora; solo filtran la página cargada (`customers.service.ts:1302-1303`).
8. **Estado "No Pagados" ≠ columna "Estado Pago"**: el filtro exige alcanzar la tolerancia de corte, `precio > 0` y `aplicar_corte ≠ Desactivado`; la columna marca "No Pagado" con cualquier factura vencida (`:1441-1460` vs `useClientesIndex.js:373-377`).
9. **`aplicarCortes.mikrotik` nunca se consulta**: el bloqueo en MikroTik se aplica siempre; el manual (`cortes.mdx`: "si desactiva Mikrotik… seguirá navegando") no coincide con el código. Solo SmartOLT/AdminOLT dependen de `aplicarCortes`. Además `retirarServicio` usa `setting[0].aplicarCortes` sin resolver el override del router (inconsistente con `activeOrSuspendService`, `onu-corte.utils.ts`).
10. **Configuración personalizada del router**: `cortes.mdx` dice que "reemplaza por completo" la global; `resolverAplicarCortes` fusiona por claves (`onu-corte.utils.ts:41-48`).
11. **Edición de datos personales**: la ruta valida con el DTO `Cliente` (transform + whitelist): `servicioId`/`id` se descartan y el log se escribe para todos los servicios; sin comprobación de documento duplicado explícita (error crudo de BD).
12. **IVA 15 % fijo**: `actualizarTipoImpuesto` (`pagos.service.ts:865`) y `onChangeComprobante` (`ModalNuevaFactura.vue:326`) fijan `iva: 15`; el etiquetado `IVA(<IVA_ESTANDAR>%)` y las tarifas por país no se respetan en esas rutas.
13. **Tercero**: validaciones de 10/13 dígitos codificadas para Ecuador aunque el sistema soporta otros países (`ConfigFacturacionTercero.vue:38-43,96-101`); en el banner de cobro el correo es obligatorio y en la configuración opcional.
14. **Router al editar servicio**: `actualizarDatosServicio` reasigna `router_id` al del plan elegido y opera solo en ese router; no limpia el router anterior (`:2499`, `mikrotik.service.ts:1043-1175`). Cierre: confirmado en código ✅: ni `editClient` (v6/v7) ni la reparación puntual posterior (`app-queue.processor.ts:601-640` → `repararRouter(routerId_actual, false, servicio_id)`) tocan el router anterior; lo que ocurra en un equipo real sigue sin comprobarse (CLI-028).
15. **Import Excel**: no aprovisiona MikroTik (`!uploadedFromExcel`), no envía bienvenida y **reutiliza** un cliente existente si coincide documento **o nombre** (puede fusionar homónimos). La validación de tipo de archivo del modal es inoperante (`validaciones.value.isValid` no existe, `ModalCargarExcel.vue:63-71`).
16. **Cédula/RUC**: ningún algoritmo de dígito verificador en front ni back.
17. Cierre: **la edición de un servicio no puede vaciar ni cambiar la caja/puerto NAP sin un puerto real**: si `caja_id` llega vacío o `puerto_id` no es un UUID (campo vacío u opción `Ninguno`), el backend quita ambos del UPDATE y la BD conserva la asignación anterior (`customers.service.ts:2502-2507`, FE:`ServicioInternet.vue` botón `close` de la caja y opción `Ninguno`, CLI-028).
18. Cierre: **`Editar Pago` (ficha del cliente) borra el rastro de los abonos anulados**: envía `row.pagos`, que excluye los abonos `ANULADO` (`useEditCliente.js:271-272`), y `PATCH /pagos/:id` reemplaza la columna `pagos` completa; `ModalPago`, `ModalFacturaSinPago` y `ModalConfirmarPago` sí vuelven a añadir `pagosEliminados`, este modal no (`ModalEditarPago.vue:72,92`, CLI-023).
19. Cierre: **crear una `Factura Libre` desde `ModalNuevaFactura` consume cargos recurrentes**: el bucle de vinculación `POST /servicios-recurrente-pagos` no filtra por tipo de factura; los cargos se quitan de la tabla pero se vinculan igual y `servicios-recurrente-pagos.create` los pasa a `COMPLETADO` (o consume el saldo a favor) sin que figuren en la factura (`useNuevaFactura.js:117-135`, `servicios-recurrente-pagos.service.ts:29-100`, CLI-023) ❓ confirmar en UI.
20. Cierre: **el filtro `Estado: PAGADOS` no lista las facturas `AUTORIZADO`/`VALIDADA`** aunque la tabla las pinte con la insignia `PAGADO`: el backend compara `pago.estadoSRI = :estado` exacto (`pagos.service.ts:386-388`, CLI-022).
21. Cierre: **errores silenciosos en el cobro**: el `catch` de `ModalPago.onSubmit` y el de `ModalEditarPago` solo cierran el modal; `anularFacturaMes` no tiene `try/catch`; `ModalEnviarRecordatorioPago` no espera la respuesta (el toast `procesando envio....` sale siempre); `boot/axios.ts` no define interceptor de respuesta. Además `ModalPago` envía dos veces el mismo `PATCH /pagos/:id` en facturas electrónicas (el segundo es idempotente en el backend) (CLI-022/CLI-023).
22. Cierre: **`ModalFacturaSinPago` adelanta meses sin confirmar**: arma los 11 meses siguientes en el modal (no consulta `meses-adelantables`) y el backend elimina las facturas `NO PAGADO` de los meses elegidos sin diálogo de aviso, a diferencia de `ModalPago` (`pagos.service.ts:1256-1291`, CLI-023).
23. Cierre: **`Ver detalles` → `Agregar Servicio` no refresca la lista**: `agregarServicio` emite `actualizarDatos` sin argumento y `RecuperarCliente.actualizarDatos` lee `servicio_actualizado.id` (`TypeError`); además la etiqueta `Agregar Servicio` convive con un manejador que depende solo de `servicio.deleted` (`useServicios.js:101`, `RecuperarCliente.vue:76-84`, CLI-006).
24. Cierre: **al cambiar de plan (modo colas simples) la IP no sale de la address-list del plan anterior** si las listas tienen nombres distintos: `editClient` solo limpia direcciones cuando cambia la IP (`limpiarIpsViejas`, `mikrotik.service.ts:2689-2701`) y la reparación puntual solo añade a la lista del plan nuevo (`:829-835`) (CLI-028) ❓ confirmar en router.
25. Cierre: **bienvenida**: la fecha de corte trata como pendientes los pagos `AUTORIZADO` y `ANULADO` (`estadoSRI !== 'PAGADO'`, `customer-queue.processor.ts:90`) y con `aplicar_corte` no numérico el job falla; el alta dispara el mensaje sin `await` ni `catch` (`useCliente.js:604-609`) (CLI-012).
26. Cierre: **`Desvincular equipo`** (`RecursosCliente`) borra por completo las filas `InstalacionEquipo` tipo producto del equipo en todas las instalaciones y no reinicia `tipo_vinculacion` (`equipos.service.ts:107-146`, CLI-021).
27. Cierre: **`POST /customers/actualizar-contrato`** corre antes que `actualizarDatosServicio` y envía `contrato || null`: un `Contrato` vacío borra el número y, si el segundo paso falla (p. ej. router sin respuesta), el contrato ya quedó cambiado (`ServicioInternet.vue:816-820`, `customers.service.ts:3121-3190`, CLI-028).

**B. Código muerto / no enrutado**
- `cell_renders/ClienteDiaPago.vue` (no importado); columnas `dia_pago` y `total_cobrar` solo figuran en la lista de visibles por defecto (`stores/auth-user.ts:56-78`).
- Badge `Suspendido-N` en `EstadoServicio.vue` (el `valueGetter` nunca lo produce).
- `getSelectedRows` en `IndexPage.vue:906-952` (suspensión masiva anterior, sin botón).
- `components/modals/ModalFacturaLibre.vue` (sin importaciones).
- `ModalPago` dentro de `PagoItem.vue` (`servicioSelected` indefinido; nunca se abre).
- `POST /customers/download-clients-excel` y `PATCH /customers/:id/:estado` sin consumidor claro en el FE.
- `useCliente.onSubmit(true)` (rama `PATCH /customers/:id`) no se invoca desde ninguna pantalla.
- Parámetro de ruta `:estado_servicio?`: el dashboard lo envía (`TotalFacturasNoPagadas.vue:26-27`) pero `IndexPage.vue` no lo lee.
- `cantidad_facturas` de facturación automática: se envía sin input visible.

**C. Rarezas / inconsistencias visibles**
- `IndexFacturas.vue`: 13 celdas por fila frente a 12 encabezados (`n_comprobantes` sin columna) → posible desalineación de cabeceras ❓.
- Permisos incoherentes: `Editar Factura`, `Ver Factura`, `Ver PDF`, `Eliminar definitivamente` (servicio retirado) y la importación/exportación Excel no validan permiso; en `PagoItem` el botón de reenvío usa `A || B && permiso` (el permiso solo aplica a la segunda rama, `PagoItem.vue:612-616`).
- Menú de la tarjeta de retiro en pestaña Servicios: botón de confirmación `Eliminar` para la acción retirar (`useServicios.js:183`).
- Textos con errores/tildes: "Estas seguro", "Pagina", "Movil", "Ultimo pago", "Dia de Corte", "se realizo", "Algo salio mal".
- `ModalMapBox` usado sin importación local en `ServicioInternet.vue`.
- Textos de interfaz y de backend con voseo mezclado con español neutro: "Recargá la página" (`IndexFacturas.vue:92`), "Vaciá el campo…", "Dejalo vacío…" (`ConfigSucursalCobro.vue`), "Avisale al cliente…", "Cobralo por otro medio", "Configurala en Ajustes → Pasarelas de Pagos", "Reintentá en unos segundos" (`cobros.service.ts`).
- El "motor" reactiva automáticamente servicios suspendidos manualmente (ver CLI-007 regla 7); no hay marca de "suspensión manual".

**D. TODO/FIXME con impacto visible**
- No se hallaron `TODO`/`FIXME` explícitos en el alcance leído; sí comentarios de comportamientos temporales (p. ej. `'Todos' se retiró del selector`, `IndexPage.vue:593`).

**E. Manual vs. código (páginas de `docs/guia/`)**
| Página | Dice | El código |
|---|---|---|
| `crear-cliente.mdx` | Email obligatorio "Sí" | opcional (`useCliente.js:315-332`, DTO `@IsOptional`) |
| `crear-cliente.mdx` | Dia Pago 1 a 28 | 1 a 31 (`FactAndNot.vue:134`) |
| `crear-cliente.mdx` | `Cambiar Equipo` "vincula un equipo del inventario" | libera el amarre IP-MAC (`POST /mikrotik/liberar-amarre`); el vínculo de equipos es `Vincular equipo` (Recursos) |
| `crear-cliente.mdx` | "Genera las facturas de meses atrasados si se indicaron" | el alta manual no tiene campo de meses atrasados (solo importación Excel) |
| `crear-cliente.mdx` | IPv4 repetida produce *ya existe un cliente con esta ipv4* | solo en importación |
| `clientes.mdx` | Opciones de `Estado` sin `Clientes con IP sin facturación` | existe (y `Suspendidos`) |
| `clientes.mdx` | "Dia de Corte: día en que vence la factura" | fecha de corte (vencimiento + días de gracia, `resumen.fechaCorte`) |
| `clientes.mdx` | Acciones masivas afectan a todos los seleccionados aunque no estén a la vista | solo a las filas de la página (hallazgo A5) |
| `clientes.mdx` | `Descargar Plantilla` = "archivo modelo vacío" | incluye listas de planes, redes, cajas e IPs libres del router; `Exportar Clientes` usa selección o filtro Estado |
| `detalle-cliente.mdx` | Resumen de notificaciones "indica qué avisos se le han enviado" | muestra fechas clave (pago, creación de factura, corte), deuda y promesas; no lista envíos |
| `detalle-cliente.mdx` | "Pagos automáticos" aparece dentro del servicio (Pestaña Servicios) | está en Facturación/Pagos › Configuración (`FactAndNot.vue:589-592`) |
| `detalle-cliente.mdx` | **Eliminar** "borra el registro" | soft delete; en Servicios solo existe "Eliminar definitivamente" para retirados |
| `cortes.mdx` | desactivar Mikrotik deja al cliente suspendido pero navegando | el flag `mikrotik` no se usa |
| `estados.mdx` | solo 3 estados de servicio | además "Eliminado" (soft delete) y estado del cliente `isActive` (solo Personas) |
| `detalle-cliente.mdx` (Estados de una factura) | `AUTORIZADO` es un estado con insignia propia en el listado | la columna Estado pinta `PAGADO` también para `AUTORIZADO`/`VALIDADA` (`IndexFacturas.vue:~820`); `AUTORIZADO` solo se ve en la tarjeta de abono; el filtro `PAGADOS` no las incluye (`pagos.service.ts:386-388`) |
| `detalle-cliente.mdx` (Acciones sobre una factura) | `agregar factura`: "Siempre" | exige además `mostrarAccionesFactura`: se oculta en servicios retirados (`IndexFacturas.vue:687`) |
| `detalle-cliente.mdx` | `Crear promesa de pago`: factura "del mes actual o anterior" | cualquier mes ≤ mes actual (`IndexFacturas.vue:71-86`) |
| `detalle-cliente.mdx` (Generar enlace de cobro) | campos `Tipo de envío` y `Teléfono` | el select y el teléfono no tienen etiqueta; solo existen `Canal de WhatsApp:` y `Correo del cliente` (`CobroEnlaceDialog.vue:298-371`) |
| `reactivar-un-servicio.mdx` | tabla "Si algo falla": `Error al editar el cliente en mikrotik` | ese texto sale de `actualizarDatosServicio`; `active-service` devuelve `error.error` del router sin prefijo fijo (`customers.service.ts:3066-3069` vs `:2570-2574`); tampoco describe el diálogo `¿Deseas activar el servicio con la ip <ip>?` ni el cambio a `Agregar Servicio` |
| `cambiar-el-plan-de-un-cliente.mdx` | "el plan nuevo debe pertenecer al router del servicio" y "no se probó qué queda en el router anterior" | el formulario permite cambiar el `Router:` y el servicio pasa al router del plan (`customers.service.ts:2499`); el código no limpia el anterior (CLI-028) |
| `preguntas/clientes-y-servicios.mdx` | "elija el nuevo **Plan**" | la etiqueta es `Perfil Internet:` (`ServicioInternet.vue:1126`) |

**F. Dudas que solo se resuelven en la UI real**
1. Desalineación de cabeceras en la tabla de Facturas (13 celdas vs 12 columnas).
2. Cuántos clientes realmente procesa una acción masiva tras "seleccionar todos".
3. Efecto en el router anterior al mover un servicio de router (el código no lo limpia, hallazgo A14; falta comprobarlo en un equipo).
4. Si una suspensión manual sin deuda se revierte en la práctica (y cuándo).
5. Mensajes reales ante documento duplicado (llegan de Postgres).
6. Aspecto/etiquetas de `Aplicar Corte` (doble espacio) y orden de opciones.
7. Visibilidad real de la sección "Pagos automáticos" y comportamiento del enlace de cobro con distintas pasarelas.

