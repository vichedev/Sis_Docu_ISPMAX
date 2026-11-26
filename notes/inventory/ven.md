# Inventario VEN — Ventas, facturación electrónica, ingresos/egresos y personas
> Alcance: FE `pages/dashboard/ventas/**`, `pages/dashboard/ingresos-egresos/**`, `pages/dashboard/personas/**`, `components/NuevaFactura/**`, `composables/useFacturacion.js`, `useFacturacionElectronica.js`, `useFirmaElectronica.js`, `layouts/EstadoSRI.vue` (+ lo que esas pantallas importan: `composables/useProduct.js`, `components/DetalleProducts.vue`, `layouts/MainLayout.vue` aviso de firma, `stores/estados-mantenedor.ts`, `pages/dashboard/ajustes/facturacion/**`). BE `invoices`, `proforma`, `crear-facturas`, `comprobantes-electronicos`, `facturacion/factus`, `ingresos-egresos` (+ `facturas-pagos`, `companies` (certificado), `customers` (personas), `config/facturacion-*.config.ts`, `app.service.ts`/`app-queue.processor.ts` (crons), `pagos.service.ts` anular/eliminar). Generado desde el ZIP del 2026-10-06.
>
> Convención de citas: `FE:` = `frontend-isp-main/src/…`, `BE:` = `backend-isp-main/src/…`. Todo marcado ✅ salvo lo listado como ❓. Nada marcado 🖥️ (no hay instancia).
>
> **Aviso importante de arquitectura ✅:** este backend **no** genera el XML, no firma con el .p12, no habla SOAP con el SRI y no genera el RIDE. Todo eso lo hace un **microservicio externo de facturación** (`HOST_API_FACTURACION`) que **no está en el ZIP**. El backend solo le envía datos y guarda lo que responde (BE:comprobantes-electronicos/facturas/invoice-queue.processor.ts:303-309). No hay `xmlbuilder`, `soap`, `forge` ni equivalentes en el código ni en `package.json`.
>
> **Aviso de nombres ✅:** "Ventas" = entidad `Invoice` (tabla `invoices`, "facturas libres" de productos/servicios del catálogo). Es **distinta** de la "factura de servicio" del cliente de internet (entidad `Pago`, tabla `pagos`, se gestiona en el perfil del cliente / Registrar pago / Transacciones). El listado de Ventas **no** muestra las facturas de servicio (BE:invoices/invoices.service.ts:139-190 solo consulta `invoiceRepository`).

## Resumen de funcionalidades
| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| VEN-001 | Listado de Ventas (facturas libres) | `/ventas/:tipo?/:fecha?` · `index.facturas_libre` | `index.facturas_libre` | completo |
| VEN-002 | Nueva factura / venta | `/ventas/add/:venta_id?` · `crear.factura` | `crear.factura` | completo |
| VEN-003 | Cálculo de totales, IVA, ICE y descuentos de la venta | (dentro de VEN-002) | — | completo |
| VEN-004 | Emisión electrónica de una venta (cola, numeración, envío al SRI) | (backend, tras VEN-002) | — | completo |
| VEN-005 | Estados del comprobante y por qué falla | columna **Estado** | — | completo |
| VEN-006 | Reenviar factura electrónica / reintentos | botón retweet · cron 2 h · latido SRI | `reenviar.factura` | completo |
| VEN-007 | Anular factura (nota de crédito) | botón ✕ en listado | `anular.factura` | completo |
| VEN-008 | Eliminar comprobante | botón papelera en listado | `eliminar.factura` | completo |
| VEN-009 | Detalle del comprobante y descargas RIDE/XML/Nota crédito | diálogo "Detalle de la Factura" | — (ver detalle sin permiso propio) | completo |
| VEN-010 | Reenviar comprobantes por WhatsApp/correo | diálogo "Enviar Comprobantes" | ninguno propio (el botón no valida permiso) | completo |
| VEN-011 | Imprimir comprobante | botón impresora | `imprimir.factura` | completo |
| VEN-012 | Exportar ventas a Excel | **Descargar Documento → Descargar EXCEL** | — (sin permiso propio) | completo |
| VEN-013 | Requisitos SRI: empresa, certificado .p12, sucursal, ambiente, secuenciales + aviso de firma | Ajustes → Empresa / Sucursales · banner global | `editar.empresa` (guardar) | completo |
| VEN-014 | Chip "SRI" (estado del servicio) y reintento al volver el SRI | cabecera | — | completo |
| VEN-015 | Factus (Colombia): configuración | Ajustes → Facturación → pestaña Factus | `variables.facturacion` | completo |
| VEN-016 | Factus: emisión, nota crédito y descargas | (backend + listado) | — | completo |
| VEN-017 | Proformas (cláusulas) | **sin pantalla** | — | completo |
| VEN-018 | Retenciones | **no existe** | — | completo |
| VEN-019 | Generación automática de facturas de servicio (`crear-facturas`) + botón "Generar facturas pendientes" | Ajustes → Facturación | `variables.facturacion` | completo |
| VEN-020 | Estados de la factura de servicio y reglas de anulación/eliminación (backend) | perfil del cliente (otro inventario) | `cliente.*` (otro inventario) | completo |
| VEN-021 | Ingresos / Egresos: listado, filtros, tarjetas y estadísticas | `/ingresos-egresos` · `index.ingresos_egresos` | `index.ingresos_egresos` | completo |
| VEN-022 | Ingresos / Egresos: crear, editar, eliminar y recurrencia | diálogo "Nuevo Registro / Editar Registro" | `crear.` / `editar.` / `eliminar.ingresos_egresos` | completo |
| VEN-023 | Ingresos / Egresos: reporte PDF/Excel | botón **Reporte** → "Generar reporte" | `reporte.ingresos_egresos` | completo |
| VEN-024 | Personas: listado y acciones | `/personas` · `index.personas` | `index.personas` + sub-permisos | completo |
| VEN-025 | Personas: formulario Agregar/Editar | diálogo "Agregar Persona" | `crear.persona` / `editar.persona` | completo |
| VEN-026 | Menú ICE (MenuSetearModoIce) | menú dentro de modales de Clientes | — | completo |

---

## VEN-001 · Listado de Ventas (facturas libres)
- **Ruta UI / name:** `/ventas/:tipo?/:fecha?` · `index.facturas_libre` · menú **Finanzas → Ventas** (FE:layouts/SideBarMenu.vue:38-42, enlace `/ventas`; FE:router/routes.ts:62-67). También se llega desde la tarjeta **Ventas** de Ingresos/Egresos con `tipo=AUTORIZADO` y `fecha='YYYY-MM-DD - YYYY-MM-DD'` (FE:pages/dashboard/ingresos-egresos/components/ResumenCards.vue:16-27).
- **Archivos:** FE: `pages/dashboard/ventas/IndexPage.vue`, `pages/dashboard/ventas/useVentas.js`, `components/DetalleProducts.vue`, `pages/dashboard/ventas/ModalReenviarComproantes.vue` · BE: `invoices/invoices.controller.ts`, `invoices/invoices.service.ts`, `invoices/entities/invoice.entity.ts`.
- **Para qué sirve:** lista las facturas libres (venta de productos/servicios del catálogo) de la empresa, con su estado ante el SRI, y da acceso a imprimir, anular, eliminar, reenviar y descargar. ✅
- **Acceso:** el nombre de la ruta es la clave: permiso `index.facturas_libre` (FE:router/auth-guard.ts:136, `permisos.includes(to.name)`); SUPER-ADMINISTRADOR siempre pasa (FE:composables/useRolPermisos.js:15; FE:router/auth-guard.ts:138). El selector de sucursal del encabezado solo lo ve `SUPER-ADMINISTRADOR` (FE:pages/dashboard/ventas/IndexPage.vue:356-372). Catálogo de permisos: "Ventas": Ver / Crear / Anular / Eliminar / Imprimir / Reenviar comprob. (FE:pages/dashboard/usuarios/permisos/gestion-finanzas-permisos.json, grupo "Facturas" etiquetado "Ventas"). El backend **no** valida permisos: solo `@Auth()` = JWT válido (BE:auth/guards/user-role/user-role.guard.ts:10-19; BE:auth/decorators/auth.decorator.ts:5-9).
- **Secciones / pestañas:** una sola tabla `q-table`. Título solo en móvil: "Listado de Comprobantes" (IndexPage.vue:323-325).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| (fecha) "Filtrar por fecha:" / "Hasta" | Rango de fechas; cada cambio vuelve a pedir el listado | — | `GET /invoices` (cabeceras `desde`, `hasta`) | Por defecto: 1° y último día del mes en curso (IndexPage.vue:70-73). La **x** vacía el campo y recarga (:196, :237). Si queda solo una fecha, el backend usa ese único día (BE:invoices.service.ts:142-147). |
| "Tipo:" (select) | Filtra por estado del comprobante | — | `GET /invoices` (cabecera `tipo`) | Ver "Estados" abajo: **la opción "Todos" excluye AUTORIZADO y ANULADO**. |
| (select sucursal, solo SUPER-ADMINISTRADOR) | Cambia `authUserStore.sucursalSelected` | rol | `GET /invoices` (cabecera `sucursal-id`) | "TODOS" = valor `null`: no se envía cabecera y el backend trae todas las sucursales de la empresa (BE:auth/auth.service.ts:331-335; BE:invoices.service.ts:171-174). |
| "Descargar Documento ▾ → Descargar EXCEL" | Exporta a Excel las filas cargadas (ver VEN-012) | — | (cliente) | Solo visible con ancho de pantalla ≥ 935 px (IndexPage.vue:265). |
| "Agregar Factura" | Va a `/ventas/add` | `crear.factura` | — | Solo ancho ≥ 1023 px; en pantallas menores aparece un botón flotante **+** (IndexPage.vue:376-383, :655-667). |
| "OCULTAR" (select múltiple) | Oculta/muestra columnas (guardado en el store) | — | — | Columnas por defecto: acciones, sucursal, num_comprobante, usuario, cliente, f/h, total, estado (FE:stores/auth-user.ts:165-174). |
| "Buscar..." | Filtro de texto (debounce 300 ms) | — | — | Ver "Casos límite": filtra en el navegador. |
| Icono pantalla completa | Alterna pantalla completa de la tabla | — | — | Tooltips en inglés: "Toggle Fullscreen" / "Exit Fullscreen" (IndexPage.vue:423-427). |
| (fila) reenviar `fa-retweet` | Re-emite al SRI (VEN-006) | `reenviar.factura` | `POST /CE/facturas/autorizacionComprobantesOffline` | Ver VEN-006. |
| (fila) papelera | Elimina el comprobante (VEN-008) | `eliminar.factura` | `DELETE /invoices/:id` | Solo estado ANULADO/PROFORMA. |
| (fila) impresora | Imprime (VEN-011) | `imprimir.factura` | `POST /pagos/pdf/:id/factura_libre/null` | — |
| (fila) ojo | Abre el detalle (VEN-009) | — | — | Sin permiso propio. |
| (fila) ✕ (`close`) | Anula con nota de crédito (VEN-007) | `anular.factura` | `POST /CE/facturas/anularFactura` | Solo AUTORIZADO y cliente ≠ CONSUMIDOR FINAL. |
| (fila) `forward_to_inbox` "Reenviar comprobantes" | Abre el diálogo de envío (VEN-010) | — | — | Solo AUTORIZADO o ANULADO. |

- **Campos de formulario:** no aplica (solo filtros).
- **Filtros y columnas de tabla:** columnas (labels exactos, IndexPage.vue:20-35): **Sucursal** · **Num. Comprobante** (`numero_comprobante`) · **Operador** (nombre del usuario en MAYÚSCULAS) · **Cliente** (`customer_id.nombres`, recortado con puntos suspensivos; el nombre completo sale en el `title`) · **Fecha/Hora** (`created_at` formateado `DD/MM/YYYY HH:mm a`, useVentas.js:154) · **Total** (`{simbolo}{total}`) · **Estado** · **Acciones** (fija a la derecha). Sin datos: "No se encontró ningun resultado".
- **Estados posibles:** el filtro "Tipo:" muestra (IndexPage.vue:346-351) `Todos` (TODOS) · `Facturas` (FACTURAS) · `Facturas Anuladas` (ANULADO) · `Facturas Autorizadas` (AUTORIZADO; en Colombia `Facturas Validadas`). Semántica real en backend (BE:invoices.service.ts:180-186) ✅:
  - `FACTURAS` (valor por defecto, `tipoComprobantes = ref("FACTURAS")`, useVentas.js:8): **sin filtro de estado** = todas las no eliminadas.
  - `AUTORIZADO` / `ANULADO`: coincidencia exacta con `estadoSRI`.
  - `TODOS`: `estadoSRI NOT IN ('AUTORIZADO','ANULADO')` → muestra solo lo **no** autorizado ni anulado (pendientes, devueltas, no autorizadas, error…).
  - Estados de la columna **Estado**: ver VEN-005. Regla visual: `NO AUTORIZADO`/`DEVUELTA` badge naranja con tooltip = `respuestaSRI`; `AUTORIZADO` verde (en CO se muestra `VALIDADA`); `ANULADO` rojo; cualquier otro (p. ej. `PENDIENTE`, `RECIBIDA`, `ERROR`) badge gris con tooltip = `respuestaSRI` y, si `estadoSRI` es null, la etiqueta `DEVUELTA` (IndexPage.vue:456-511). El valor legado `NO PAGADO` se muestra como `ANULADO` (useVentas.js:156).
- **Reglas de negocio (backend):**
  - Listado = `invoices` de la(s) sucursal(es) de la empresa (`company-id`), orden `created_at DESC`, relaciones usuario/sucursal/cliente/ítems (BE:invoices.service.ts:149-177).
  - Filtro de fechas inclusive hasta las 23:59:59.999 del último día (BE:invoices.service.ts:143-147).
  - El borrado es lógico (`deleted_at`), por lo que lo eliminado desaparece del listado (BE:invoices.service.ts:318-320; entidad `@DeleteDateColumn`, invoice.entity.ts:87-88).
  - Una venta **no tiene estado de pago** propio: se asume cobrada al emitirse; `forma_pago` solo se informa al SRI. `isActive` existe (default true) pero ningún flujo lo cambia ✅.
- **Efectos secundarios externos:** ninguno al listar. WebSocket: al recibir `updateStateInvoice` o cualquier `notificacion` estando en esta ruta, recarga el listado (FE:layouts/Notifications.vue:181-183, :230-231).
- **Mensajes de error/éxito (texto exacto):** vacío: "No se encontró ningun resultado". Si la carga falla no se muestra aviso (catch silencioso, useVentas.js:168-170).
- **Relaciones con otros módulos:** `customers` (cliente), `sucursal`/`companies`, `products` (ítems), SRI/microservicio (estado), Ingresos/Egresos (suma las AUTORIZADAS como "Ventas", VEN-021), cliente "CONSUMIDOR FINAL" (variable `VITE_CONSUMIDOR_FINAL_ID`).
- **Casos límite y advertencias:**
  - **"Todos" no es "todas".** Para ver todo (autorizadas + anuladas + pendientes) hay que elegir **"Facturas"**.
  - Navegar desde la tarjeta Ventas con `tipo`/`fecha` por URL: `loadInit()` lanza `getVentas()` **antes** de `checkRoute()` (IndexPage.vue:157-163), y `checkRoute` solo cambia `tipoComprobantes`/`dateOne`/`dateTwo` sin recargar. Es probable que el selector muestre el tipo/fechas de la URL pero la tabla traiga el mes en curso/estado anterior hasta tocar un filtro ❓.
  - `"Buscar..."` es filtro de la propia `q-table` sobre las filas ya cargadas (no se envía al backend aunque `watch(filter)` vuelva a llamar `getVentas()`, IndexPage.vue:153-155). Quasar solo compara las columnas que tienen `field`: aquí `numero_comprobante` y `created_at`; "Cliente", "Operador", "Sucursal" y "Total" no tienen `field` ❓ (inferido).
  - El borrado desde esta pantalla nunca pasa por `eliminarFactura` (la rama `factura_servicio` es código heredado: ninguna fila de `invoices` trae `factura_servicio`, IndexPage.vue:548-550).
  - `pagination.sync` (sintaxis Vue 2) no aplica en Vue 3; la tabla pagina a 10 por defecto (IndexPage.vue:165-166, :296).
- **Preguntas probables de usuarios:**
  1. "¿Por qué no veo mis facturas autorizadas?" → el filtro **Tipo** está en "Todos" (que las excluye) o el rango de fechas no cubre el día.
  2. "¿Dónde están las facturas de internet de mis clientes?" → no están aquí; esta pantalla es de ventas libres. Están en el perfil del cliente / Transacciones.
  3. "¿Qué significa NO AUTORIZADO / DEVUELTA?" → ver VEN-005; pase el mouse sobre el estado para ver el mensaje del SRI.
  4. "¿Por qué no puedo buscar por nombre del cliente?" → la búsqueda solo ve número de comprobante y fecha ❓.
  5. "¿Cómo veo solo las de una sucursal?" → solo el SUPER-ADMINISTRADOR tiene el selector; los demás ven lo de sus sucursales asignadas.
  6. "No me aparece el botón Agregar Factura" → falta permiso `crear.factura` o la pantalla es menor a 1023 px (usar el botón flotante +).
- **Pendiente de validar en UI:** ❓ comportamiento del drill-down por URL; ❓ qué busca realmente "Buscar..."; ❓ si la tabla recarga sola tras emitir (depende del WebSocket).

---

## VEN-002 · Nueva factura / venta
- **Ruta UI / name:** `/ventas/add/:venta_id?` · `crear.factura` · Ventas → **Agregar Factura** (FE:router/routes.ts:80-85). El parámetro `venta_id` **no se usa** (no existe edición de ventas) ✅.
- **Archivos:** FE: `pages/dashboard/ventas/AddVenta.vue`, `composables/useProduct.js`, `pages/dashboard/detalle-formas-pago/composables/useFormaPago.js` · BE: `invoices/invoices.controller.ts` (`POST /invoices`), `invoices/invoices.service.ts:39-129`, `invoices/dto/create-invoice.dto.ts`, `comprobantes-electronicos/facturas/facturas.controller.ts:17-22` (`GET /CE/facturas/getNumFactura`).
- **Para qué sirve:** emitir una factura a un cliente registrado, a una persona o a CONSUMIDOR FINAL, con productos/servicios del catálogo de la sucursal elegida. ✅
- **Acceso:** permiso `crear.factura` (nombre de la ruta). Roles: cualquiera con el permiso; SUPER-ADMINISTRADOR además **debe** elegir sucursal (validación específica de ese rol, AddVenta.vue:121-128).
- **Secciones:** encabezado (migas "Inicio › Ventas › Factura", título **Nueva Factura**), tarjeta de cliente/sucursal/producto/forma de pago, tabla de ítems, tarjeta de descripción + plazo + totales, botones.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "GENERAR FACTURA" | Valida y, tras confirmar, envía la venta con `tipo='FACTURA'` | `crear.factura` | `POST /invoices` (cabecera `sucursal-id`) | Diálogo "¿Deseas generar esta Factura?" botones **Enviar** / **Cancelar** (AddVenta.vue:196-200). Emite al SRI **de forma asíncrona** (VEN-004). |
| "Regresar" | Vuelve a `/ventas` | — | — | Solo ancho > 600 px. |
| (fila) ✕ naranja | Quita el ítem | — | — | Columna "Quitar". |
| (selector de producto) | Agrega ítem (`agregarAndValidarStock`) | — | `GET /products` (por sucursal, `limit 100000`) | No permite repetir producto; sin stock no deja agregar (salvo `tipo='Servicio'`). |
| ícono ✕ del cliente | Intenta volver a CONSUMIDOR FINAL | — | — | Ver "Casos límite" (bug). |
| `q-form @submit` | Envía con `tipo='EMISION'` | — | `POST /invoices` | El backend en ese caso **solo guarda** la venta como PENDIENTE sin emitir (BE:invoices.service.ts:114) ❓ alcanzabilidad. |

- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Fecha de Emisión:" | texto fijo | — | Fecha de hoy `DD/MM/YYYY` | Solo informativa; el comprobante toma la hora del servidor. |
| "N° Factura:" | texto fijo | — | `EEE-PPP-SSSSSSSSS` | Vista previa, **no consume** el número (BE:facturas.service.ts:71-96). Solo si `type==='F_E'`. |
| "Seleccionar Cliente:" | q-select con búsqueda | Sí (default CONSUMIDOR FINAL) | Lista = clientes **y** personas **activos** (`includeCustomersISP=true&onlyActives=true&limit=100000`) + opción `CONSUMIDOR FINAL` (num_doc `9999999999999`) | Búsqueda por nombre o documento. Valor de CF = `VITE_CONSUMIDOR_FINAL_ID`. DTO: `@IsUUID()` (create-invoice.dto.ts:9-10). |
| "Seleccionar Sucursal:" | q-select | Sí (en la práctica) | Sucursales del usuario sin la opción "TODOS" | Al cambiarla: vacía ítems, pide el N° de factura y recarga productos de **esa** sucursal (AddVenta.vue:388-393). Sin sucursal no hay productos que agregar. |
| "Filtrar por codigo de barra o nombre del producto:" | q-select con búsqueda (debounce 900 ms) | Al menos 1 ítem | Catálogo `/products` de la sucursal | Servicios entran con cantidad 1; productos con 0 (hay que teclear la cantidad). |
| "Forma de pago:" | q-select | Sí | Todas las formas de pago de la empresa (**no filtra inactivas**, AddVenta.vue:248-253); envía solo el `codigo_forma_pago` (parte tras `|*`) | Mensaje: "Debes elegir una forma de pago". |
| "Cantidad" (por fila) | número | Sí | `> 0`; `≤ stock` salvo servicios | |
| "Descuento($)" (por fila) | número | No | Monto en dinero **por línea** (no %); editable solo si `type==='F_E'` | Se precarga con `descuento` del producto (entero). |
| "Precio de Venta" (por fila) | número | Sí | Editable por el operador, **sin IVA** | Se trunca a 2 decimales (`formatearNumero`, useProduct.js:159-170). |
| "IVA" / "ICE" (por fila) | solo lectura | — | `impuesto`% y `valor_ice` (+`%` si `ice==='tarifa'`) del producto | No editables aquí (ver VEN-026). |
| "Descripción (Opcional)" | textarea 4 filas | No | Si se llena: ≥ 3 caracteres ("Debes agregar una nota mayor o igual a 3 caracteres") | Va al SRI como información adicional `Detalle` (BE:invoice-queue.processor.ts:259-266). |
| "Plazo de pago (opcional)" → "Plazo" / "Unidad" | número / select | No | `Plazo ≥ 0`; Unidad: `Dias` (DIA), `Meses` (MES), `Años` (ANIO); default 0 / DIA | Solo con `type==='F_E'`. Se envía en `pagos[0].plazo` / `unidadTiempo` al SRI (BE:invoice-queue.processor.ts:250-256). |
| "Enviar mensaje al cliente" | checkbox | No | Default **marcado** (`send_messages=true`) | Si está marcado, tras la autorización envía XML+PDF por WhatsApp y correo (VEN-004/010). |
| "Tipo Comprobante:" | q-select | — | `FACTURA ELECTRONICA` (F_E) / `RECIBO` | Solo se dibuja con `route.name === 'cliente.edit'`: **nunca aparece en esta pantalla** (AddVenta.vue:509-523). |

- **Filtros y columnas de tabla (ítems):** Quitar · Codigo Barra · Producto · Cantidad · IVA · Descuento($) · ICE · Precio de Venta · Valor Total (FE:composables/useProduct.js:15-25). Vacío: "Agrega algún producto/servicio".
- **Estados posibles:** la venta nace en `estadoSRI='PENDIENTE'` (BE:invoices.service.ts:51) y evoluciona según VEN-005.
- **Reglas de negocio (frontend):**
  - Total > 50 y cliente = CONSUMIDOR FINAL → "La factura supera los $50.00, no puede ser emitida a CONSUMIDOR FINAL" (AddVenta.vue:130-137). Umbral y símbolo fijos (no dependen del país).
  - Total > 50 y forma de pago `== '01'` → "La factura supera los $500.00, debes elegir otra forma de pago": **condición inalcanzable**, porque el valor del select es `"<uuid>|*<codigo>"` y nunca es `'01'` (AddVenta.vue:139-143, :248-253). El texto además dice $500 con umbral 50.
  - Sin ítems: "Debes agregar algun producto.." (warning).
  - Cantidad ≤ 0: "Agrega una cantidad cantidad al producto: {nombre} de la fila: {n}" (sic, palabra repetida).
  - Cantidad > stock (no servicio): "La cantidad de venta del producto: {nombre} supera su stock disponible".
  - Al agregar: "No hay stock del articulo {nombre}" (negative) o "Ya fue agregado este producto/servicio" (warning) (useProduct.js:36-37, :56).
  - SUPER-ADMINISTRADOR sin sucursal: "Debes seleccionar una sucursal".
- **Reglas de negocio (backend):**
  - DTO exige: `customer_id` UUID, `user_id` UUID, `products` array no vacío, `numero_comprobante` string ≥ 5, `forma_pago` string, `porcentaje_iva`, `subtotal`, `descuento`, `iva`, `total` numéricos, `send_messages` booleano; `plazo`/`unidad_tiempo` opcionales (BE:invoices/dto/create-invoice.dto.ts). `ValidationPipe` con `whitelist:true` descarta campos sin decorador (BE:main.ts:38-47).
  - Se guarda el encabezado con `clave_acceso=''`, `numero_comprobante=''` (el real se asigna al emitir) y `estadoSRI='PENDIENTE'` (BE:invoices.service.ts:46-53).
  - Se guardan las líneas en `InvoiceToProduct` **sin esperar** el resultado (`save` sin `await`, :68) y con `v_total = pvp` (precio unitario, no el total de la línea) (BE:invoices/entities/invoiceToProduct.entity.ts:8-14, invoices.service.ts:59-65).
  - Solo si `tipo == 'FACTURA'` se encola la emisión electrónica (:114-123). Con cualquier otro `tipo` la venta queda PENDIENTE para siempre sin intento de emisión.
  - **No se descuenta stock de productos** al vender ni se suma en compras: el stock solo cambia por "ajustar-stock" (BE:products/products.controller.ts:51-59; búsqueda de `stock` en `invoices/`, `buys/`, `products/`) ✅. La validación de stock es solo visual.
  - `requiere_facturacion` de la empresa **no** se consulta en el flujo de ventas (sí en registro de abonos): la emisión depende solo de `FACTURACION_PROVIDER`/`PAIS` (BE:config/facturacion-provider.config.ts:20-33).
- **Efectos secundarios externos:** encola el job `generateInvoice` (Redis/Bull, `${queueName}-factura`) → microservicio SRI (VEN-004); WebSocket `send-message-ws` para refrescar el listado; WhatsApp y correo si `send_messages` (VEN-010 describe los textos).
- **Mensajes de error/éxito (texto exacto):** éxito: "Venta realizada exitosamente" y redirige a `/ventas` (AddVenta.vue:215-216). Error: se muestra `error.response.data.message` como `warning` (si es lista de validaciones puede verse como arreglo). Backend: "Unexpected error, check server logs" (500 genérico, BE:invoices.service.ts:322-328).
- **Relaciones con otros módulos:** Productos y Servicios (catálogo, precio, IVA, ICE, stock), Personas/Clientes (customers), Formas de pago (Ajustes), Sucursales (secuenciales/ambiente, VEN-013), Empresa (IVA de empresa `get-iva`, certificado), Mensajería (WhatsApp/correo).
- **Casos límite y advertencias:**
  - El ícono **✕** del selector de cliente asigna el **texto** `'CONSUMIDOR FINAL'` en vez del id configurado (AddVenta.vue:361-370). Ese valor no es UUID y el backend lo rechaza (`customer_id must be a UUID`) ❓ confirmar mensaje exacto.
  - El IVA mostrado en "IVA(15%):" sale del código de IVA de la **empresa** (`'4'`→15, `'3'`→14, `'2'`→12, otro→estándar del país; useProduct.js:67-81), pero el cálculo usa el `impuesto` **de cada producto**.
  - `type`, `rows`, `sucursal_selected` son variables de módulo compartidas con `ModalFacturaLibre.vue` (otro inventario). Si allí se dejó `type='recibo'`, esta pantalla ocultaría IVA/ICE/N° y bloquearía descuentos, pero seguiría enviando `tipo='FACTURA'` ❓ (ModalFacturaLibre.vue:210 no restablece `type`).
  - `onBeforeUnmount` limpia ítems y sucursal (AddVenta.vue:242-246); el cliente por defecto vuelve a CONSUMIDOR FINAL.
  - El número que se ve en pantalla puede **no** ser el que reciba la factura (se reserva al procesar la cola, VEN-004).
- **Preguntas probables de usuarios:**
  1. "¿Por qué no me deja facturar a Consumidor Final?" → total mayor a $50.00.
  2. "No me salen productos para agregar" → hay que elegir primero la **sucursal**; el catálogo es por sucursal.
  3. "¿Por qué no me deja agregar el producto?" → sin stock, o ya está en la tabla.
  4. "¿El precio lleva IVA?" → el precio de venta es sin IVA; el IVA se suma por producto.
  5. "¿Qué es Plazo de pago?" → días/meses/años de crédito que se informan al SRI en la forma de pago.
  6. "Emití la factura y queda PENDIENTE" → la emisión es en segundo plano; ver VEN-004/005/006.
  7. "¿Puedo editar una factura emitida?" → no existe edición; solo anular (VEN-007).
  8. "¿Descuenta el inventario?" → el sistema no descuenta stock al vender (solo ajuste manual).
- **Pendiente de validar en UI:** ❓ mensaje real al volver a CONSUMIDOR FINAL con el ícono; ❓ si Enter dispara `submit` (tipo 'EMISION'); ❓ si el N° de factura se refresca tras emitir; ❓ si sucursal queda obligatoria para roles distintos a SUPER-ADMINISTRADOR (la validación explícita es solo para ese rol).

---

## VEN-003 · Cálculo de totales, IVA, ICE y descuentos de la venta
- **Ruta UI / name:** dentro de VEN-002 (tabla de ítems y bloque de totales).
- **Archivos:** FE: `composables/useProduct.js:83-157`, `pages/dashboard/ventas/AddVenta.vue:704-766` · BE: `invoices/invoices.service.ts:70-96`.
- **Para qué sirve:** calcular `subtotal`, `descuento`, `ice`, `iva` y `total` que se envían al backend y se muestran en el detalle. ✅
- **Reglas (frontend, `valorFactura`):** para cada línea `base = v_total − descuento` donde `v_total = cantidad × pvp`; ICE: `tarifa` = `base × valor_ice/100`, `valor` = `valor_ice` **fijo por línea (no se multiplica por la cantidad)**; `subtotalLínea = base + ICE`; `IVA línea = subtotalLínea × impuesto/100`. Totales redondeados a 2 decimales: `subtotal = Σ subtotalLínea`, `iva = Σ IVA`, `total = subtotal + iva` (useProduct.js:83-148). En modo `recibo` solo suma la base (sin IVA/ICE).
- **Lo que muestra la pantalla** (solo si `type==='F_E'`): "TOTAL BRUTO:" = `subtotal` · "DESCUENTOS:" · "ICE:" · "SUBTOTAL:" = `subtotal − descuento` · "IVA({n}%):" · "TOTAL DE VENTA:" (AddVenta.vue:708-763).
- **Lo que se envía al SRI** por ítem (BE:invoices.service.ts:70-96): `tipo_iva=impuesto`, `cantidad`, `descripcion=nombre`, `codigoPrincipal/Auxiliar=codigoBarra`, `precioUnitario=pvp`, `descuento` (monto de la línea) y, si el producto tiene ICE, `tipo_ice` + `tarifa_ice` (tarifa) o `valor_ice` (valor).
- **Casos límite y advertencias:**
  - `subtotal` ya viene **neto de descuentos** (porque `base = v_total − desc`), pero la fila "SUBTOTAL:" vuelve a restar el descuento (AddVenta.vue:740-743) y el detalle hace lo mismo (DetalleProducts.vue:335) → con descuento > 0 la fila SUBTOTAL se ve menor que el real. El **total** sí es correcto ✅ (lectura de código; ❓ validar en UI).
  - ICE `valor` con cantidad > 1: la pantalla suma el valor una vez; el SRI recibe `valor_ice` unitario junto con `cantidad` ❓ (el microservicio probablemente multiplica; la regla de las facturas de servicio sí multiplica por cantidad, FE:composables/useFacturacion.js:383).
  - Los importes se guardan en `decimal(8,2)`: máximo 999,999.99 (BE:invoice.entity.ts:60-70).
- **Preguntas probables:** "¿Por qué el subtotal no coincide con el bruto menos descuento?" · "¿El descuento es porcentaje?" (no: es monto en dinero por línea) · "¿El ICE se multiplica por la cantidad?" ❓.
- **Pendiente de validar en UI:** ❓ SUBTOTAL con descuento; ❓ ICE `valor` con cantidad > 1.

---

## VEN-004 · Emisión electrónica de una venta (cola, numeración, envío al SRI)
- **Ruta UI / name:** sin pantalla propia; ocurre en segundo plano tras **GENERAR FACTURA** (VEN-002) o **reenviar** (VEN-006). El resultado se ve en la columna **Estado** del listado.
- **Archivos:** BE: `invoices/invoices.service.ts:39-129`, `invoices/invoices.controller.ts:15-23`, `invoices/dto/create-invoice.dto.ts`, `invoices/entities/invoice.entity.ts`, `comprobantes-electronicos/facturas/facturas.service.ts:49-166, 493-557`, `comprobantes-electronicos/facturas/invoice-queue.processor.ts:60-418, 1163-1170`, `config/facturacion-provider.config.ts`, `config/facturacion-electronica.config.ts`, `sucursal/entities/sucursal.entity.ts:40-68`.
- **Para qué sirve:** convertir la venta guardada en un comprobante electrónico autorizado por el SRI (Ecuador). ✅
- **Límite de lectura:** el microservicio de facturación (`HOST_API_FACTURACION`, que firma, envía al SRI y consulta la autorización) **no está en el ZIP** (solo vienen `backend-isp-main` y `frontend-isp-main`); de él se conoce únicamente el contrato que ISPMAX usa (tabla "Contrato con el microservicio" más abajo). Qué estados y mensajes produce por dentro no es legible; ISPMAX guarda tal cual lo que devuelve.
- **Acceso:** automático. No hay permiso propio.
- **Flujo exacto (✅ lectura de código):**
  1. `POST /invoices` guarda la venta (`PENDIENTE`) y llama `generarFacturaElectronica(...)` (BE:invoices.service.ts:114-123).
  2. Se encola el job `generateInvoice` en Bull (`${queueName}-factura`) con `jobId = generateInvoice_{id de la venta}`, `attempts:1`, `timeout:300000` ms. Si ya existe un job con ese id, Bull no encola uno nuevo; solo si el existente ya terminó queda un `console.warn` en consola (BE:facturas.service.ts:513-556).
  3. El processor carga cliente y sucursal→empresa→setting. Si `FACTURACION_PROVIDER=factus` salta a VEN-016 (BE:invoice-queue.processor.ts:133-167).
  4. **Numeración:** `reservarNumeroComprobante(sucursal)` hace un `UPDATE … RETURNING` atómico que suma 1 a la secuencia del **ambiente** de la sucursal (`PRODUCCION` → `secuencia_factura_produccion`; otro → `secuencia_factura_pruebas`) y usa el valor previo (BE:facturas.service.ts:98-145, :185-193). Formato `EEE-PPP-SSSSSSSSS` = `establecimiento` y `punto_emision` a 3 dígitos + secuencial a 9 (:57-69). Si la columna está en NULL: `La sucursal {id} no tiene configurada la secuencia de facturas para el ambiente {ambiente}.`; si la sucursal no existe: `No se encontro la sucursal {id}: no se puede numerar el comprobante.`
  5. Arma el cuerpo para el microservicio: `ambiente` (`PRUEBA`→`test`, otro→`prod`), `company` {archivo_certificado, clave_certificado, ruc, direccion_matriz, obligado_contabilidad `SI`/`NO`, nombre_comercial, razon_social, email, movil}, `emisor` {estab, ptoEmi, secuencial, dirEstablecimiento}, `comprador` {tipo_identificacion=`tipo_documento`, identificacion, razon_social, direccion (o `s/n`), celular, correo}, `items` (con código aleatorio de 7 caracteres si el producto no tiene), `pagos` [{formaPago, plazo, unidadTiempo}] e `informacion_adicional` [{nombre:"Detalle", value: descripción}] si hay descripción (BE:invoice-queue.processor.ts:195-266).
  6. Guarda el N° de comprobante en la venta **antes** de enviar y registra un log "Factura electrónica generado con N° comprobante …" (:268-299).
  7. `POST {HOST_API_FACTURACION}/v1/factura/emision` con `timeout 15000` ms. Con la respuesta guarda `estadoSRI`, `numero_comprobante`, `clave_acceso` (:303-334).
  8. Si `send_messages`: envía XML+PDF por WhatsApp y correo (`tipo_envio:'ambas'`); cualquier error aquí se ignora (:336-362, VEN-010).
  9. Siempre (finally) avisa por WebSocket para refrescar pantallas (:415-417).
- **Si falla el envío (`catch`, :381-412):** lee `error.response.data` → `{estado, claveAcceso, message}`; guarda `respuestaSRI = message || 'ERROR EN LA RECEPCION'`; si el mensaje contiene `El SRI no respondió en la etapa` o `SOAP` → `estadoSRI='DEVUELTA'`; si contiene `No se encontró <autorizacion> en la respuesta SOAP` → `RECIBIDA`; si no, queda el `estado` que traiga el microservicio.
- **Qué atrapa cada capa (✅):** `enviarFactura` envuelve todo en un `try/catch` externo que **no relanza** (el `throw` está comentado, BE:invoice-queue.processor.ts:88, 413-414) y `generateInvoice` solo escribe en consola si `enviarFactura` lanza (:60-74). Por eso cualquier fallo **anterior** al `POST` —secuencia sin configurar (:187), cliente que no existe (`clientFound[0]` indefinido, :239), sucursal sin empresa (:210) o `descripcion` nula (:259)— termina **sin mensaje, sin log, sin cambio de estado**: la venta queda `PENDIENTE` y, si el número ya se había reservado, ese número se pierde. Lo único que puede relanzar es la llamada de aviso por WebSocket del `finally` (:416), y entonces la consola dice `❌ NO SE EMITIÓ EL COMPROBANTE (Invoice <id>)` con el error del WebSocket, no con el original. El job nunca termina `failed`, así que `@OnQueueFailed` (aviso a Slack `"<CLIENTE> INVOICE - <error>"`, :1163-1170) no se dispara por errores de emisión.
- **Contrato con el microservicio (lo que ISPMAX envía y lee) ✅:**

  | Llamada (base `HOST_API_FACTURACION`) | Quién la hace | Respuesta que usa ISPMAX |
  |---|---|---|
  | `POST /v1/factura/emision` (timeout 15 s) con el cuerpo del paso 5 | `invoice-queue.processor.ts:303-309` | éxito: `estado`, `claveAcceso`, `numeroComprobante` (:314-316, :330-332). Error HTTP: `response.data.{estado, claveAcceso, message}` (:382-389) |
  | `GET /v1/factura/{clave o N° comprobante}` | `facturas.service.ts:575-578, 706` (VEN-006) | `claveAcceso`, `numeroComprobante`, `estado`, `mensaje`, `factura.infoTributaria.ruc` (:584-616, :676-679) |
  | `PUT /v1/factura/reenviar/{clave}` | `facturas.service.ts:605, 773` (VEN-006) | `estado`, `mensaje`, `claveAcceso`, `numeroComprobante` (:608-609, :777-792) |
  | `POST /v1/nota-credito/anular-factura-sin-referencia` · `PUT /v1/nota-credito/reenviar/{claveNC}` | `facturas.service.ts:316-344, 815-838` (VEN-007) | `claveAcceso`, `estado`; en error `response.data.response.{estado, claveAcceso, message}` (:409-431) |
  | `POST /v1/{factura\|nota-credito}/descarga/{ride\|xml}/{clave}` | `invoice-queue.processor.ts:706, 738`, `invoices.service.ts:274-278` (VEN-009/010) | binario (PDF/XML), timeout 30 s |
  | `GET /certificado/info` · `POST /files/upload-signature` | `companies/companies.service.ts:179, 224` (VEN-013) | datos del certificado |

- **Reglas de negocio:**
  - El proveedor se decide **por instancia** (no por empresa): `FACTURACION_PROVIDER` explícito (`sri`/`factus`/`ninguno`) → si no, `PAIS` (`CO`→factus, `EC`→sri) → si no, `FACTURACION_ELECTRONICA` (default true→sri) (BE:config/facturacion-provider.config.ts:20-33).
  - Con proveedor `ninguno` (instancias solo recibo) no se llama al SRI: solo se guarda el N° local y **no** se toca `estadoSRI` (BE:invoice-queue.processor.ts:363-379). En ese caso el log dice "Recibo generado…" (:284).
  - El número se consume al **procesar**; el que se vio en pantalla (VEN-002) es solo un adelanto. El reenvío reutiliza el mismo número (`getNumerosComprobante` sin consumir; BE:invoice-queue.processor.ts:185-191).
  - `devolverNumeroComprobante` devuelve el secuencial solo en nota de crédito con `ECONNREFUSED` (facturas.service.ts:378-391); para facturas **no** hay devolución.
  - Columnas de la sucursal ✅ BE:sucursal/entities/sucursal.entity.ts:40-68: `establecimiento` y `punto_emision` (int, sin valor por defecto), `secuencia_factura_produccion` (int **no nulo**, sin defecto), `secuencia_factura_pruebas` (int nulo, defecto 1), `ambiente` (`PRODUCCION`/`PRUEBA`, defecto `PRUEBA`). Consecuencia: el error `…no tiene configurada la secuencia…` solo puede salir en la práctica por `secuencia_factura_pruebas` en NULL (o por la de nota de crédito, VEN-007); y una sucursal nueva nace en `PRUEBA` ⇒ emite con `ambiente: 'test'` al microservicio.
  - La venta solo se encola si `tipo == 'FACTURA'` (BE:invoices.service.ts:114); con otro `tipo` se guarda `PENDIENTE` y nunca se emite. `numero_comprobante` es obligatorio en el DTO (`@IsNotEmpty`, `@MinLength(5)`, BE:invoices/dto/create-invoice.dto.ts:19-22) pero el servicio lo **sobrescribe con `''`** al guardar (:46-53).
- **Efectos secundarios externos:** Redis/Bull, microservicio de facturación (`/v1/factura/emision`), SRI (vía microservicio), WhatsApp (`HOST_API_WHATSAPP`), correo SMTP de la empresa, WebSocket (`HOST_WEBSOCKET/api/send-message-ws/{user}`). Slack (`URL_SLACK`) solo lo avisa `@OnQueueFailed` para jobs de la cola `-factura` que terminan `failed` (reenvío de comprobantes, envío de mensajes); el job `generateInvoice` **no** falla nunca (ver "Qué atrapa cada capa"), así que una emisión fallida no llega a Slack (BE:invoice-queue.processor.ts:1163-1170).
- **Mensajes de error/éxito:** no hay aviso al usuario; solo el estado y el tooltip (`respuestaSRI`). Los textos de ISPMAX `La sucursal {id} no tiene configurada la secuencia de facturas para el ambiente {ambiente}.` y `No se encontro la sucursal {id}: no se puede numerar el comprobante.` (BE:facturas.service.ts:129-142) se lanzan pero **se pierden** en el `catch` externo (:413-414); no llegan a pantalla ni a consola. Mensajes de consola que sí existen: `❌ NO SE EMITIÓ EL COMPROBANTE (…)` (solo si falla el WebSocket del `finally`, :68-72), `❌ FACT. ELECTRÓNICA NO ENCOLADA…` (sin uuid ni id de entidad, facturas.service.ts:515-522), `⚠️ FACT. ELECTRÓNICA DESCARTADA: ya existía el job …` (:548-553) y `❌ ERROR AL ENCOLAR FACT. ELECTRÓNICA (…)` (:554-555).
- **Relaciones con otros módulos:** Sucursales (establecimiento, punto de emisión, ambiente, secuenciales), Empresa (certificado), Clientes (datos del comprador), Mensajería, Logs.
- **Casos límite y advertencias:**
  - **Falla sin rastro (✅ resuelto por lectura):** si el microservicio no responde (timeout de 15 s, caído, conexión rechazada) o contesta un error HTTP cuyo cuerpo no trae `message` (p. ej. una página de proxy), `sri.message` es `undefined` y `sri.message.includes(...)` lanza dentro del `catch` interno (:399-400) **antes** de guardar nada (:411); la excepción la traga el `catch` externo (:413). Estado final en BD: `estadoSRI = 'PENDIENTE'`, `clave_acceso = ''`, `respuestaSRI = NULL`, `numero_comprobante` = el N° ya consumido (se guardó en :278 antes del `POST`). En pantalla: insignia gris azulada `PENDIENTE` con tooltip sin texto (FE:pages/dashboard/ventas/IndexPage.vue:456-511) y botón Reenviar visible, pero Reenviar **no re-emite** una venta `PENDIENTE` sin clave (cae en `PUT /v1/factura/reenviar/` con clave vacía y solo guarda `error.message` en `respuestaSRI`, VEN-006; tampoco se puede eliminar, VEN-008). Con un `message` presente (SRI rechaza o devuelve error SOAP) el flujo es el normal: `respuestaSRI = message` y el estado según las reglas de arriba.
  - El N° ya consumido queda "huérfano" hasta que se reenvíe con éxito o se adopte desde el microservicio (VEN-006).
  - `descripcion.length` se evalúa sin proteger (`:259`): si llegara `null` la emisión se aborta en silencio.
  - Clave de acceso de 49 dígitos: RUC en posiciones 11-23, N° en 25-39 (BE:pagos/helpers/facturacion-utils.ts:4-14; BE:invoices.service.ts:217).
- **Preguntas probables de usuarios:**
  1. "Emití y sigue PENDIENTE hace rato" → el job no llegó al microservicio o no obtuvo respuesta; revisar el SRI/chip y reintentar (VEN-006).
  2. "¿Por qué saltó el número de factura?" → el número se reserva al procesar; si el envío falló se reusa en el reenvío, pero otra venta puede haber tomado el siguiente.
  3. "¿En qué ambiente estoy emitiendo?" → el de la sucursal (PRUEBA/PRODUCCION), Ajustes → Sucursales.
  4. "¿Cuándo le llega la factura al cliente?" → al autorizarse, si marcó "Enviar mensaje al cliente".
  5. "¿Qué hacer si el SRI está caído?" → esperar; el chip SRI se pone rojo y el botón reenviar se deshabilita (VEN-014).
  6. "Emití y no pasó nada, ni error, ni estado" → fallo anterior al envío (secuencia, cliente, sucursal): no deja rastro; revisar Ajustes → Empresa → Sucursales (secuenciales y ambiente) y que el cliente exista.
  7. "¿Por qué la sucursal de pruebas emite con otro ambiente?" → una sucursal nace en `PRUEBA`; el ambiente de la sucursal manda sobre cualquier otra cosa.
- **Pendiente de validar en UI:** ❓ aspecto del tooltip vacío de una venta `PENDIENTE` sin mensaje (el código lo muestra sin texto). El catálogo de estados y mensajes que genera el microservicio **no es legible** desde el ZIP (ver *Límite de lectura*); lo que ISPMAX reconoce está en VEN-005.

---

## VEN-005 · Estados del comprobante (SRI) y por qué falla
- **Ruta UI / name:** columna **Estado** de VEN-001 y "Estado:" de VEN-009. Campo `invoices.estadoSRI` y mensaje `invoices.respuestaSRI` (BE:invoices/entities/invoice.entity.ts:72-76).
- **Archivos:** FE: `pages/dashboard/ventas/IndexPage.vue:456-511`, `pages/dashboard/ventas/useVentas.js:156`, `components/DetalleProducts.vue:29-30, 77`, `pages/dashboard/registrar-pago/components/AccionesPago.vue:211-219` · BE: `invoices/invoices.service.ts:51, 180-186`, `comprobantes-electronicos/facturas/invoice-queue.processor.ts:133-167, 303-334, 381-412`, `comprobantes-electronicos/facturas/facturas.service.ts:342-346, 393-431, 742-752`, `facturas-pagos/facturas-pagos.service.ts:50-51, 252`, `transacciones/transacciones.service.ts:25-95`.
- **Estados (✅ según dónde se asignan en el código):**

| Estado | Quién lo asigna | Significado | Qué hacer |
|---|---|---|---|
| `PENDIENTE` | Backend al crear (BE:invoices.service.ts:51) | Guardada; aún sin respuesta del microservicio/SRI, o `tipo` ≠ `FACTURA` (nunca se encoló) | Esperar; si persiste, ver "Casos límite" de VEN-004/006 |
| `AUTORIZADO` | Respuesta del microservicio (`data.estado`, invoice-queue.processor.ts:330) | El SRI autorizó el comprobante | Listo; permite anular y reenviar comprobantes |
| `NO AUTORIZADO` | Respuesta del microservicio | El SRI rechazó; el motivo está en `respuestaSRI` (tooltip) | Corregir el dato y pulsar reenviar (re-emite con el mismo número) |
| `DEVUELTA` | Processor cuando el mensaje incluye `El SRI no respondió en la etapa` o `SOAP` (:391-396); también al anular con `ECONNREFUSED` (facturas.service.ts:393-401); la UI muestra `DEVUELTA` si `estadoSRI` es null (IndexPage.vue:499) | El SRI no respondió / falló la conexión | Reenviar cuando el chip SRI esté verde |
| `RECIBIDA` | Mensaje `No se encontró <autorizacion> en la respuesta SOAP` (:398-402; facturas.service.ts:427-431) | El SRI recibió pero aún no entregó la autorización | Reenviar (consulta de nuevo en el microservicio) |
| `EN PROCESAMIENTO` | Valor devuelto por el SRI/microservicio (aceptado en la lista de reintento, facturas.service.ts:743-749) | El SRI aún procesa | Esperar / reenviar |
| `ANULADO` | Backend al autorizarse la nota de crédito (`AUTORIZADO`→`ANULADO`, facturas.service.ts:342-346) | Factura anulada con nota de crédito | Se puede eliminar (VEN-008) |
| `ERROR` | Solo Factus: fallo al emitir (invoice-queue.processor.ts:159-163) | Falló la emisión en Factus; texto en `respuestaSRI` | Ver VEN-016 |
| `VALIDADA` | Solo etiqueta de pantalla en Colombia (`AUTORIZADO` → "VALIDADA", IndexPage.vue:483; DetalleProducts.vue:30). En `pagos`/`facturas-pagos` Factus guarda `VALIDADA` real (factus.service.ts:500) | Aceptada por la DIAN | — |
| `PROFORMA` | **Nunca lo asigna el backend**; solo existe en condiciones de la UI (IndexPage.vue:517, :542; DetalleProducts.vue:77) | — | — |
| `NO PAGADO` | Valor heredado: la lista lo convierte a `ANULADO` (useVentas.js:156) | — | — |

- **Otros valores que el código conoce (✅ por búsqueda en todo el ZIP):**

  | Valor | Dónde aparece | Qué significa para ISPMAX |
  |---|---|---|
  | `ERROR ENVIO RECEPCION`, `ERROR ENVIO RECEPCION - ANULACION`, `ERROR ENVIO AUTORIZACION`, `ERROR ENVIO AUTORIZACION - ANULACION`, `ANULACION - DEVUELTA` | solo en FE:pages/dashboard/registrar-pago/components/AccionesPago.vue:211-219 | El backend actual **nunca** los escribe (no hay coincidencias en `src/`): son estados heredados o que podría devolver el microservicio. Junto con `DEVUELTA` y `NO AUTORIZADO` hacen que el cobro de una factura de servicio muestre el botón "Emitir Factura Electrónica". En la lista de ventas caen en la insignia genérica |
  | `EN PROCESO`, `RECIBIDO` | solo en un comentario (BE:transacciones/transacciones.service.ts:74) | no se comparan en ningún `if`; `GruposFacturacion.vue:88` rotula `EN PROCESO` cuando un comprobante agrupado no tiene estado |
  | `null` / vacío | `estadoSRI` sin valor | la lista de ventas lo rotula `DEVUELTA` (FE:ventas/IndexPage.vue:499) y el reenvío lo trata como "re-emitir" (BE:facturas.service.ts:742-750) |
  | `DEVUELTA` por defecto | `FacturasPagosService.actualizarMiembro` pone `abono.estadoSRI = options?.estadoSRI?.trim() ?? 'DEVUELTA'` | en **facturas de servicio**, toda actualización de `facturas-pagos` sin `estadoSRI` (p. ej. guardar solo el N° de comprobante antes de enviar, invoice-queue.processor.ts:278) deja el abono en `DEVUELTA` hasta que el microservicio responda (BE:facturas-pagos/facturas-pagos.service.ts:252) |
  | `AUTORIZADO`, `ANULADO` | terminales | no se vuelven a reintentar: `getFacturasAReenviar` los excluye (facturas-pagos.service.ts:50-51) y `ESTADOS_SRI_TERMINALES = ['AUTORIZADO','ANULADO']` decide qué se guarda en caché 5 min en Transacciones (BE:transacciones/transacciones.service.ts:25, 77, 93). `DEVUELTA` se considera **no** terminal (comentario :18-23) |

- **Cómo pinta el frontend el estado en la lista de ventas (✅ FE:pages/dashboard/ventas/IndexPage.vue:456-511):** `NO AUTORIZADO` y `DEVUELTA` → insignia con contorno naranja y tooltip = `respuestaSRI`; `AUTORIZADO` → verde (rotulado `VALIDADA` si `PAIS_INSTANCIA === 'CO'`), sin tooltip; `ANULADO` → rojo claro, sin tooltip; cualquier otro (`PENDIENTE`, `RECIBIDA`, `EN PROCESAMIENTO`, `ERROR`, los `ERROR ENVIO …`) → gris azulado con tooltip = `respuestaSRI`; sin valor → `DEVUELTA` gris azulado. El filtro **Tipo** (`Todos`, `Facturas`, `Facturas Anuladas`, `Facturas Autorizadas`/`Facturas Validadas`; FE:ventas/IndexPage.vue:347-351) actúa sobre `estadoSRI` en el backend (BE:invoices.service.ts:180-186, VEN-001).
- **Mensaje (`respuestaSRI`):** texto devuelto por el SRI/microservicio; en Factus es el JSON crudo de la respuesta (BE:factus-invoice.service.ts:79). Se ve como tooltip en estados NO AUTORIZADO, DEVUELTA y "otros". Se **vacía** (`''`) al autorizarse la nota de crédito (BE:facturas.service.ts:342-346). Columna `varchar` sin tope (BE:invoices/entities/invoice.entity.ts:72-76); en `pagos` el estado es `varchar(55)` (BE:pagos/entities/pago.entity.ts:79-80).
- **Límite de lectura:** qué estados puede devolver el microservicio (`NO AUTORIZADO`, `EN PROCESAMIENTO`, `RECIBIDA`, `AUTORIZADO`, `DEVUELTA`… y los `ERROR ENVIO …`) y los textos exactos de rechazo del SRI **no están en el ZIP**. Lo verificable es lo anterior: qué escribe ISPMAX, qué compara y cómo lo muestra.
- **Causas típicas de fallo que el código permite deducir:** certificado vencido/ausente (banner VEN-013) · clave del certificado incorrecta · sucursal en `PRUEBA` · secuencia sin configurar (error de VEN-004) · SRI fuera de servicio (VEN-014) · datos del cliente inválidos (documento/dirección) · microservicio caído.
- **Casos límite:** el mismo texto "PENDIENTE" significa **cosas distintas** en facturas de servicio (abono parcial, VEN-020) y en ventas (sin respuesta del SRI). El manual actual (docs/guia/estados.mdx:34-42) solo explica el primer significado.
- **Preguntas probables:** "¿Qué es DEVUELTA?" · "¿RECIBIDA es mala?" (no, solo falta autorización) · "¿Por qué dice VALIDADA?" (instancia Colombia).
- **Casos límite adicionales (✅):** (1) una venta `PENDIENTE` puede significar tres cosas distintas: en cola/esperando respuesta, fallo anterior al envío sin rastro, o microservicio que no respondió (VEN-004); solo la primera se resuelve sola. (2) `AUTORIZADO` en una **venta** solo dice "el SRI la autorizó": no hay cobro asociado (a diferencia de las facturas de servicio, VEN-020). (3) Un `NO PAGADO` guardado en una venta se muestra como `ANULADO` (useVentas.js:156).
- **Pendiente de validar en UI:** ❓ cómo se ve el tooltip vacío de una venta `PENDIENTE` sin mensaje y si algún estado `ERROR ENVIO …` aparece realmente en datos viejos (el código solo los lee).

---

## VEN-006 · Reenviar factura electrónica / reintentos
- **Ruta UI / name:** botón naranja circular (`fa-solid fa-retweet`) en la fila · tooltip "Reenviar Factura Electrónica" / "No se puede reenviar, el SRI está fuera de línea" (FE:pages/dashboard/ventas/IndexPage.vue:515-538).
- **Archivos:** FE: `ventas/IndexPage.vue:137-140`, `stores/estados-mantenedor.ts:98-112`, `layouts/EstadoSRI.vue` · BE: `comprobantes-electronicos/facturas/facturas.service.ts:464-491, 559-883, 912-931`, `facturas-pagos/facturas-pagos.service.ts:40-60`, `invoice-queue.processor.ts:420-436`.
- **Para qué sirve:** volver a intentar que el SRI reciba/autorice una venta que no quedó `AUTORIZADO`. ✅
- **Acceso:** permiso `reenviar.factura`; se muestra solo si `estadoSRI` ∉ {AUTORIZADO, VALIDADA, ANULADO, PROFORMA} y se **deshabilita** con `estadosStore.statusSRI === 'offline'`.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| (retweet) | Pone el botón en "cargando" y llama al backend | `reenviar.factura` | `POST /CE/facturas/autorizacionComprobantesOffline` `{id, tipo:'factura_libre'}` | El backend responde `"ok"` de inmediato y trabaja en segundo plano (`facturas.controller.ts:66-70`). El spinner **no se apaga** solo (no hay `finally`); se refresca cuando llega el WebSocket `updateStateInvoice`. No hay aviso de éxito/error. |

- **Reglas de negocio (backend, `reeenviarAutorizacionComprobantesOffline`, facturas.service.ts:699-883):**
  1. Carga la venta; si no tiene `estadoSRI` pero sí clave, consulta el estado en el microservicio.
  2. Tipo de reenvío: sin clave y sin estado → `SIN_FACTURA_GENERADA`; con clave y sin NC → `FACTURA`; con clave de NC → `NOTA_CREDITO`.
  3. Para `FACTURA`/`SIN_FACTURA_GENERADA` y **sin clave**, primero intenta **adoptar** del microservicio: consulta por clave, N° de comprobante (`GET /v1/factura/{término}`); si existe y es del mismo RUC, copia clave/estado/mensaje y, si no está autorizado, pide `PUT /v1/factura/reenviar/{clave}` (:559-664).
  4. Si el estado (minúsculas) ∈ {`devuelta`, `en procesamiento`, `no autorizado`, vacío/null} **y** `respuestaSRI` ≠ "El SRI no respondió en la etapa de RECEPCIÓN" → **re-emite**: encola `generateInvoice` con `reenvio:true` y el N° anterior (:742-770).
  5. En cualquier otro caso → `PUT /v1/factura/reenviar/{clave_acceso}` y guarda estado/clave/N° devueltos (:771-810); si falla guarda `respuestaSRI = error.message`.
  6. Para `NOTA_CREDITO`: `PUT /v1/nota-credito/reenviar/{claveNC}`; si el microservicio dice "no se encontró la nota-credito" o "error secuencial registrado", **genera de nuevo la nota de crédito** (:813-865).
- **Reintentos automáticos (✅):**
  - **Cron `reenviarInvoice` cada 7 200 000 ms (2 h)**, solo la instancia 0 de PM2 y solo si `usaSri()` (BE:facturas.service.ts:464-491; controller `onModuleInit` :13-15).
  - Ese job recorre **`facturas-pagos`** (facturas de servicio) creadas desde las 00:00 de ayer hasta las 00:00 de mañana (zona `APP_TIMEZONE`) con estado ≠ AUTORIZADO/ANULADO o nulo, y solo las que **no** traen `iva` en su JSON (BE:facturas-pagos.service.ts:40-60; processor :420-436). **No procesa ventas libres.**
  - **Latido del SRI:** `EstadoSRI.vue` consulta cada 5 min (y al montar) el microservicio; cada vez que el estado es "online", la UI llama `POST /CE/facturas/reenviar-comprobantes-no-autorizados` (encola `reenviarInvoice` con 60 s de retraso) (FE:stores/estados-mantenedor.ts:98-112; BE:facturas.service.ts:912-931).
- **Efectos externos:** microservicio de facturación, SRI, Redis/Bull, WebSocket.
- **Casos límite y advertencias:**
  - Una venta `PENDIENTE` **sin clave** que el microservicio no conoce cae en la rama 5 con clave vacía (`PUT /v1/factura/reenviar/`) y solo guarda un `respuestaSRI` de error: **no se puede re-emitir desde la UI** (porque `PENDIENTE` no está en la lista de la regla 4). Eliminar tampoco es posible (VEN-008) ❓ confirmar en UI.
  - En instancias Factus el botón sigue llamando a este flujo del SRI (no hay rama Factus): una venta en `ERROR` no se reemite desde aquí ❓ (VEN-016).
  - Varios navegadores abiertos disparan el reintento global cada 5 min cada uno.
- **Preguntas probables:**
  1. "Le di reenviar y no pasó nada" → es asíncrono; el estado cambia solo cuando termina; si sigue igual, ver el mensaje del tooltip.
  2. "El botón está gris" → SRI fuera de línea (chip rojo).
  3. "¿Se reintenta solo?" → solo las facturas de servicio de ayer/hoy; las ventas libres se reintentan a mano.
  4. "¿Se va a duplicar el número?" → el reenvío reutiliza el N° original.
- **Pendiente de validar en UI:** ❓ spinner que no se apaga; ❓ comportamiento con PENDIENTE sin clave.

---

## VEN-007 · Anular factura (nota de crédito)
- **Ruta UI / name:** botón circular con ✕ (`icon="close"`, sin tooltip) en la fila de VEN-001.
- **Archivos:** FE: `ventas/IndexPage.vue:75-135, 592-605`, `composables/useFacturacion.js:595-616` · BE: `comprobantes-electronicos/facturas/facturas.controller.ts:52-57`, `facturas.service.ts:249-462`.
- **Para qué sirve:** dar de baja una factura **AUTORIZADA** emitiendo ante el SRI una nota de crédito electrónica. ✅
- **Acceso:** permiso `anular.factura`; el botón solo se dibuja si `customer_id.nombres !== 'CONSUMIDOR FINAL'` **y** `estadoSRI == 'AUTORIZADO'` (IndexPage.vue:592-605). El backend no repite esas reglas.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| ✕ | Abre diálogo "¿Estas seguro de anular esta factura?" con N° de comprobante, cliente, fecha/hora y total; botones **Anular** / **Cancelar** | `anular.factura` | `POST /CE/facturas/anularFactura` `{factura:{id, user_id, sucursal_id, entity:'Invoice', clave_acceso, uuid:id, sendMessage:false}}` | No pide motivo (el ajuste "Pedir motivo al anular factura/pago" **no** aplica aquí). |

- **Reglas de negocio (backend `generarNotaCredito`):**
  1. Si la instancia es Factus → `anularConFactus` (VEN-016).
  2. `GET {HOST_API_FACTURACION}/v1/factura/{clave}`; si falla (no existe o microservicio caído) solo avisa por WebSocket y **termina sin cambiar nada** y sin error (:256-263).
  3. Reserva el secuencial de **nota de crédito** de la sucursal/ambiente (`secuencia_nota_credito_*`, :293) y registra el log `NOTA_CREDITO` "Se generó una nota de crédito con el N° comprobante … con la factura …" (:299-314).
  4. `POST /v1/nota-credito/anular-factura-sin-referencia` con `{emisor:{secuencial}, factura: clave, motivo:"ANULACION DE FACTURA POR ERROR EN LA EMISIÓN"}` (:316-325). El motivo es fijo.
  5. Con la respuesta: guarda `clave_acceso_nota_credito`, `estadoSRI = (AUTORIZADO ? 'ANULADO' : estado devuelto)`, `respuestaSRI=''` (:342-355) y notifica "anulacion" por WebSocket (:373-375). Si hay `sendMessage` reenvía la NC por WhatsApp/correo.
  6. Errores: `ECONNREFUSED` → devuelve el secuencial, `estadoSRI='DEVUELTA'` y guarda el secuencial en `clave_acceso_nota_credito` (:378-406); otros → toma `estado`/`claveAcceso`/`message` del microservicio (RECIBIDA si "No se encontró <autorizacion>…") y guarda `respuestaSRI` (:438-460).
- **Efectos externos:** microservicio/SRI (nota de crédito), WebSocket, correo/WhatsApp (solo si `sendMessage`), log.
- **Mensajes:** el diálogo; no hay notify de éxito/error (solo cambia el badge). Si falla, el estado queda `AUTORIZADO` (caso 2) o cambia a DEVUELTA/RECIBIDA/NO AUTORIZADO.
- **Casos límite y advertencias:**
  - **Facturas a CONSUMIDOR FINAL autorizadas no se pueden anular desde esta pantalla** (el botón se oculta comparando por nombre) ✅; tampoco se pueden eliminar mientras estén AUTORIZADAS (VEN-008). No hay otra vía en la UI.
  - No existe nota de crédito parcial ni "devolución": solo anulación total sin referencia.
  - El comprobante anulado conserva su número; la nota usa su propio secuencial.
  - Si falla en el paso 2, el usuario no recibe ningún aviso y la factura sigue AUTORIZADA.
- **Preguntas probables:** "Anulé y sigue AUTORIZADO" (falló en silencio; reintentar con el SRI en línea) · "¿Dónde está la nota de crédito?" (Detalle → Descargar Nota Credito) · "¿Por qué no sale el botón de anular?" (es Consumidor Final, no está AUTORIZADO, o falta permiso) · "¿Puedo anular solo una parte?" (no).
- **Pendiente de validar en UI:** ❓ mensaje/estado tras fallo en el paso 2; ❓ si el diálogo muestra bien el HTML (usa `html:true` con datos del cliente sin escapar).

---

## VEN-008 · Eliminar comprobante
- **Ruta UI / name:** botón papelera (tooltip "Eliminar Comprobante") en la fila (IndexPage.vue:540-561).
- **Archivos:** FE: `ventas/useVentas.js:173-197` · BE: `invoices/invoices.controller.ts:68-72`, `invoices.service.ts:318-320`.
- **Para qué sirve:** ocultar del sistema una venta anulada. ✅
- **Acceso:** permiso `eliminar.factura` **y** `estadoSRI` ∈ {`ANULADO`, `PROFORMA`} (IndexPage.vue:541-544).
- **Botones y acciones:** papelera → diálogo "¿Estas seguro de eliminar este comprobante?" (botones **Borrar** / **Cancelar**) → `DELETE /invoices/:id` → recarga la lista. Sin permiso/estado no hay botón.
- **Reglas de negocio:** el backend hace `softDelete` sin ninguna validación de estado ni de pertenencia (BE:invoices.service.ts:318-320); la regla "solo anuladas" existe **solo en el frontend**.
- **Respuesta exacta a "¿por qué no puedo eliminar esta factura?" (venta libre) ✅:**
  - No es `ANULADO` (está `AUTORIZADO`, `PENDIENTE`, `DEVUELTA`, `NO AUTORIZADO`, `RECIBIDA`, `ERROR`…), **o**
  - falta el permiso `eliminar.factura`, **o**
  - es una venta AUTORIZADA a CONSUMIDOR FINAL (ni anular ni eliminar aparecen).
  - Para una AUTORIZADA: primero **anular** (VEN-007) y luego **eliminar**.
- **Casos límite:** no hay motivo ni log; no hay "restaurar" en la UI; los reportes que suman ventas filtran `deleted_at IS NULL` (BE:ingresos-egresos.service.ts:293-297). Un `DELETE` directo a la API sobre cualquier venta funciona (solo JWT) ❓ riesgo.
- **Mensajes:** sin notify de éxito. Si el `DELETE` falla solo se escribe en consola (useVentas.js:187-189); el `mostrarNotify('negative','Fallo al eliminar el comprobante')` del `catch` externo (:195) no se ejecuta casi nunca y además `mostrarNotify` no está importado en ese archivo.
- **Preguntas probables:** "Borré la factura y ya no aparece pero ¿se puede recuperar?" (solo por base de datos) · "Quiero borrar una pendiente" (no hay forma en UI).
- **Pendiente de validar en UI:** ❓ qué ve el usuario si el `DELETE` falla.

---

## VEN-009 · Detalle del comprobante y descargas (RIDE / XML / Nota de crédito)
- **Ruta UI / name:** botón ojo (`visibility`) de la fila → diálogo. Componente compartido con Compras (FE:components/DetalleProducts.vue).
- **Archivos:** FE: `components/DetalleProducts.vue`, `composables/useFacturacion.js:126-151, 659-736` · BE: `invoices/invoices.controller.ts:36-54` (`POST /invoices/download-ride-xml`), `invoices.service.ts:215-282`, `facturacion/factus/factus.controller.ts:118-168`.
- **Para qué sirve:** ver el contenido de la factura y bajar su RIDE (PDF), XML y, si está anulada, la nota de crédito.
- **Acceso:** sin permiso propio (cualquiera que vea el listado). El endpoint de descarga acepta JWT de usuario **o** `x-service-token` (BE:invoices.controller.ts:36-37).
- **Secciones:** cabecera, tabla de ítems, descargas y totales.
- **Contenido (labels exactos):** título "Detalle de la Factura" ("Detalle de la Proforma" si `estadoSRI=='PROFORMA'`); "Num. Comprobantes:" · "Clave de Acceso:" (en CO: "CUFE:") · "Sucursal:" · "Cliente" · "Usuario:" · "Fecha de Emisión:" · "Estado:". Tabla: **Codigo · Producto · Cantidad · Precio de Venta · Descuento · Aplica IVA · Total**. Totales: "TOTAL BRUTO:" (= `subtotal`), "DESCUENTOS:", "SUBTOTAL:" (= `subtotal − descuento`), "IVA({IVA_ESTANDAR}%):" (rotulado con la tarifa estándar del país, no la real), "TOTAL DE VENTA:".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Descargar Documento ▾ → Descargar RIDE" | PDF del comprobante | — | Directo al microservicio `POST {VITE_HOST_API_FACTURACION}/v1/factura/descarga/ride/{clave}`; si falla → `POST /invoices/download-ride-xml` | Guarda como `{N°-comprobante}.pdf` |
| "→ Descargar XML" | XML autorizado | — | idem con `xml` | `{N°}.xml` |
| "→ Descargar Nota Credito" / "Descargar XML Nota Credito" | Solo si `estado === 'ANULADO'` | — | `/v1/nota-credito/descarga/{ride|xml}/{claveNC}`; fallback `/invoices/download-ride-xml` | Ver "Casos límite". |
| (xs) "Descargar Documento" | Botón de pantallas pequeñas | — | — | Es `type="submit"` sin acción: **no hace nada** (DetalleProducts.vue:363-374). |

- **Reglas de negocio (backend `downloadRideXml`, invoices.service.ts:215-244):** el RUC se toma de la clave (`slice(10,23)`); busca `static/SRI/PDF/{clave}.pdf` (RIDE) o `static/SRI/{ruc}/facturas/Autorizados/{clave}.xml`; si el archivo no está en disco lo pide al microservicio (`POST /v1/factura/descarga/{ride|xml}/{clave}` con `timeout 30000`) y lo guarda (:252-282). Cualquier fallo → 400 "No se encontro el archivo".
- **Colombia (`PAIS_INSTANCIA==='CO'`):** descarga por N° de comprobante `GET /facturacion/factus/bills/{n}/{pdf|xml}` o `credit-notes/{n}/{pdf|xml}` (useFacturacion.js:720-736). Si no hay número: "Este comprobante no tiene número guardado para descargar." (DetalleProducts.vue:42-45).
- **Mensajes (texto exacto):** error: "No se logro descargar el documento." (DetalleProducts.vue:53); en `useFacturacion.descargarDocumento`: "No se encontro el archivo".
- **Casos límite y advertencias:**
  - Columnas **Precio de Venta** y **Total**: el backend guarda en `v_total` el **precio unitario** (BE:invoices.service.ts:59-65) y la pantalla muestra `v_total/cantidad` como precio y `v_total` como total → con cantidad > 1 ambas columnas salen mal ✅ (lectura; ❓ validar en UI).
  - "Aplica IVA" sale del producto actual del catálogo (`product_id.aplicaIva`), no de lo facturado.
  - Nota de crédito: el respaldo del backend busca la NC como si fuera factura (`/v1/factura/descarga/…`), por lo que solo funciona la descarga directa al microservicio ❓.
  - "Estado" aquí muestra el valor de `estadoSRI` tal cual (con la excepción CO).
- **Preguntas probables:** "No puedo descargar el PDF" (SRI/microservicio caído o comprobante no autorizado) · "¿Dónde está la nota de crédito?" (aquí, si está ANULADO) · "El total del detalle no coincide" ❓.
- **Pendiente de validar en UI:** ❓ columnas Precio/Total con cantidad > 1; ❓ comportamiento del botón móvil.

---

## VEN-010 · Reenviar comprobantes por WhatsApp / correo
- **Ruta UI / name:** botón `forward_to_inbox` (tooltip "Reenviar comprobantes") visible si `estadoSRI` es `AUTORIZADO` o `ANULADO` (IndexPage.vue:607-638) → diálogo **Enviar Comprobantes**.
- **Archivos:** FE: `ventas/ModalReenviarComproantes.vue`, `composables/useWaCanal.js` · BE: `facturas.controller.ts:72-82`, `facturas.service.ts:885-910`, `invoice-queue.processor.ts:438-441, 639-1161`, `email/email.service.ts:173-227`.
- **Para qué sirve:** enviar al cliente el PDF + XML de la factura (o de la nota de crédito) por el canal elegido. ✅
- **Acceso:** el botón no valida permiso (visible a quien vea el listado); el catálogo tiene `reenviar.factura` ("Reenviar comprob.") pero se usa para el botón de re-emisión (VEN-006), no para este.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Enviar por:" | select | Sí | `WhatsApp` · `Email` · `Ambas` | Sin elegir: "Debes completar este campo" |
| "Canal de WhatsApp:" | botones | — | Solo si hay dos canales y el modo incluye WhatsApp | **El backend ignora `wa_provider`** en este flujo: siempre usa la sesión de WhatsApp de la empresa (`HOST_API_WHATSAPP`) ✅ (sin referencias a `wa_provider` en `comprobantes-electronicos/`). |
| "Celular del cliente:" | teléfono internacional (placeholder "Buscar pais...") | Si WhatsApp/Ambas | Precarga `customer_id.celular` | Menú "Numeros de referencias" solo si el cliente tiene referencias (la lista de Ventas no las envía). |
| "Email del cliente:" | email | Si Email/Ambas | "Ingresa un email válido" | Precarga el correo del cliente |
| "Comprobante:" | radio | — | "Factura" / "Nota Credito" | Solo si la venta tiene `clave_acceso_nota_credito` |
| "Enviar" | botón | — | — | `POST /CE/facturas/reenviar-comprobantes` |

- **Reglas de negocio (backend):**
  - El endpoint solo **encola** (`enviar-mensaje-comprobantes`, o `enviar-comprobantes-factus` si Factus) y marca `canalElegidoPorUsuario:true` (facturas.service.ts:885-910; controller :72-82). La respuesta al navegador es inmediata; errores del job no llegan a la pantalla.
  - Procesa: asegura PDF/XML en disco (los pide a `/v1/{factura|nota-credito}/descarga/{ride|xml}/{clave}` si faltan, :698-766); WhatsApp: verifica sesión (`/session/{n}/info`), verifica número (`check-number`), envía texto y luego PDF y XML (:770-958); Email: valida correo (`esEmailValido` descarta `@sin-email.local`, etc.) y envía por el SMTP de la empresa (:960-1070); `ambas` = email y WhatsApp en paralelo (`allSettled`) (:1072-1077).
  - En envíos **automáticos** (no elegidos por el usuario) se respetan los interruptores de Mensajería: WhatsApp si `whatsapp_activo===false` no se envía; correo si `emailService.estaActivo()` es falso (:775-778, :963-966). En el reenvío manual esos interruptores se omiten.
  - Cada envío registra log (`SEND_WHATSAPP`, `SEND_EMAIL`, `SEND_*_ERROR`, `SEND_EMAIL_SKIPPED`) y un registro individual en mensajes masivos con `origen='envio_comprobante'`.
  - Borra los archivos temporales al terminar (:1135-1160).
- **Texto de los mensajes (exactos):**
  - WhatsApp: "*Estimado(a):* {nombres} la empresa *{nombre_comercial}* le ha emitido la siguiente factura a su nombre: \n\nFactura: {N°}\n\nA continuacion adjuntamos el comprobante electrónico en formato XML y PDF." (nota de crédito: "nota de credito" / "Nota Credito") (:810).
  - Correo: asunto "{nombre_comercial} - {Factura|Nota de Crédito} Nro. {N°}"; cuerpo "Estimado(a): {nombres} la empresa {nombre_comercial} le ha emitido la siguiente {tipo} a su nombre: {tipo} Nro. {N°} A continuación adjuntamos el comprobante electrónico en formato XML y PDF" (BE:email.service.ts:200-210).
  - Avisos por WebSocket al operador: "El cliente {nombre} no usa whatsApp, no fue posible enviar el mensaje." · "No es posible enviar mensaje por whatsApp, debes vincular un dispositivo" (:889-924).
- **Mensajes en pantalla:** éxito "procesando envio...." (sic) y cierra; error: `error.response.data.message` como warning y cierra (ModalReenviarComproantes.vue:97-104).
- **Efectos externos:** WhatsApp (servicio no oficial), SMTP, microservicio SRI (descarga), WebSocket, logs.
- **Casos límite:** si el N° del comprobante viniera vacío, el modal usa el flujo de recibos de pagos (`/pagos/message/recibos/enviar-whatsApp`) con `pago_id` indefinido (ModalReenviarComproantes.vue:81-88) — no aplica a ventas autorizadas.
- **Preguntas probables:** "El cliente dice que no le llegó" (revisar Logs: `SEND_WHATSAPP_ERROR` / `SEND_EMAIL_ERROR`; número sin WhatsApp; correo inválido) · "¿Por qué el selector de canal de WhatsApp no cambia nada?" (el backend lo ignora) · "¿Se manda solo al emitir?" (sí, si marcó "Enviar mensaje al cliente").
- **Pendiente de validar en UI:** ❓ visibilidad real del selector "Canal de WhatsApp".

---

## VEN-011 · Imprimir comprobante
- **Ruta UI / name:** botón impresora (tooltip "Imprimir comprobante") en la fila (IndexPage.vue:563-579).
- **Archivos:** FE: `ventas/IndexPage.vue`, `pages/dashboard/transacciones/composables/useTransation.js:360-432` · BE: `pagos/pagos.controller.ts:54-67`, `pagos/pagos.service.ts:1620-1695`.
- **Para qué sirve:** abrir/imprimir el comprobante de la venta en PDF o por impresora térmica. 
- **Acceso:** permiso `imprimir.factura`.
- **Flujo:** `imprimir(id,'factura_libre')` lee los ajustes; si `configImpresion.usarApiImpresora` muestra el diálogo "Formato de impresión" / "¿Cómo deseas imprimir este recibo?" con **Impresión directa (térmica)** o **Generar PDF** (botones Aceptar/Cancelar); si no, genera PDF directo. PDF: `POST /pagos/pdf/{id}/factura_libre/null` y abre ventana con `print()`. Térmica: `GET /pagos/datos-recibo/{id}/factura_libre/null` y luego `POST http://localhost:3008/api/impresion` (programa local del cliente); si no hay respuesta: "No se pudo conectar con el programa de impresora. Asegúrate de que esté ejecutándose." (useTransation.js:360-432).
- **Reglas de negocio (backend, `generarPDF` con `tipo=='factura_libre'`):** arma el detalle desde la venta (`total`, `subtotal = total − descuento`, N° y clave, fecha de creación, ítems) y usa `PlantillaPagoServicioPDF` (o la plantilla antigua si la fecha ≤ 08/05/2025) (BE:pagos.service.ts:1624-1656).
- **Casos límite:** `preparaDatosRecibo` espera un `Pago`; con el id de una venta lanza error (usa `factura.no_factura` sobre `null`), por lo que la **impresión térmica de ventas libres probablemente falla** y el front solo lo escribe en consola ❓ (useTransation.js:415-417).
- **Preguntas probables:** "Imprime en blanco/falla en térmica" ❓ · "¿Qué formato tiene?" (el de impresión de pagos, Ajustes → Plantillas).
- **Pendiente de validar en UI:** ❓ impresión térmica de ventas libres.

---

## VEN-012 · Exportar ventas a Excel
- **Ruta UI / name:** **Descargar Documento ▾ → Descargar EXCEL** (IndexPage.vue:265-281), visible con ancho ≥ 935 px.
- **Archivos:** FE: `ventas/useVentas.js:20-138`.
- **Qué hace ✅:** genera en el navegador (ExcelJS) un archivo `archivo.xlsx`, hoja `Hoja1`, con **solo las filas cuyo `estadoSRI === 'AUTORIZADO'`** de las ya cargadas en pantalla (respeta fechas, sucursal y tipo elegidos; **no** respeta "Buscar...").
- **Columnas:** `Fecha` (dd/mm/aaaa, sin hora) · `# Documento` · `CA/NA` (clave de acceso/N° de autorización) · `Persona` (cliente) · `Identificación` · `Subtotal` · `IVA` · `Total`.
- **Casos límite:** con "Tipo: Todos" (que excluye AUTORIZADAS) el archivo sale solo con encabezados; el nombre de archivo es siempre el mismo (`archivo.xlsx`); no hay permiso propio; no incluye anuladas ni nota de crédito; el "Subtotal" es el `subtotal` guardado (ya neto de descuento, VEN-003).
- **Preguntas probables:** "El Excel sale vacío" (filtro Tipo = Todos, o no hay autorizadas en el rango) · "Quiero las anuladas en el Excel" (no se incluyen).
- **Relación con el manual:** docs/guia/facturas.mdx dice que "Descargar Documento" sirve "para obtener el comprobante": en realidad exporta la lista, no el comprobante.

---

## VEN-013 · Requisitos para emitir al SRI: empresa, certificado, sucursal, ambiente y secuenciales
- **Ruta UI / name:** `/empresa/edit/:empresa_id` · `index.empresa` (Ajustes → Empresa, permiso `editar.empresa` para guardar, FE:pages/dashboard/empresas/components/FormEmpresa.vue:332) y `/sucursales` (otro inventario). Banner global en la cabecera (FE:layouts/MainLayout.vue:108-136, :296-365).
- **Archivos:** FE: `pages/dashboard/empresas/composables/useEmpresa.js`, `components/FormEmpresa.vue`, `pages/dashboard/sucursales/components/FormSucursal.vue`, `composables/useFacturacionElectronica.js` · BE: `companies/companies.service.ts:98-250`, `companies/companies.controller.ts:41-55`, `sucursal/entities/sucursal.entity.ts`.
- **Para qué sirve:** lista de lo que debe estar configurado para que una factura salga autorizada. ✅
- **Requisitos (todos por lectura de código):**
  1. **Instancia:** `FACTURACION_PROVIDER=sri` o `PAIS=EC` (o `FACTURACION_ELECTRONICA` activa por defecto). Variable `HOST_API_FACTURACION` apuntando al microservicio. En FE: `VITE_PAIS`/`VITE_FACTURACION_PROVIDER`/`VITE_FACTURACION_ELECTRONICA` (por defecto activo), `VITE_HOST_API_FACTURACION`, `VITE_CONSUMIDOR_FINAL_ID` (FE:composables/usePais.js, useFacturacionElectronica.js:10-14).
  2. **Empresa:** interruptor "Requiere Facturación:" activo → aparecen "Razón Social", "Cargar Certificado:" (solo `.p12`; rechazo "El tipo de archivo es invalido"), "Clave Certificado:", "Obligado Contabilidad:", "Fecha Exp. Firma Electrónica:" (solo lectura). Solo se piden certificado/clave/IVA cuando `ES_ECUADOR` (useEmpresa.js:157-159).
  3. **RUC:** 13 dígitos y terminar en `001`: "Ingresa un numero RUC valido" · "El numero R.U.C debe terminar en 001" (useEmpresa.js:165-184). En otros países solo no vacío.
  4. **Certificado:** al cargar `.p12` + clave, el navegador lo abre con `node-forge`; si la clave es mala: "La contraseña del certificado esta incorrecta"; si es buena rellena **Razón Social** con el CN y **Fecha Exp.** con la caducidad (useEmpresa.js:77-111). Crear sin archivo: "Debes adjuntar el certificado" (:192).
  5. **Guardado:** `POST /companies/:id` (multipart). El backend copia el `.p12` a `static/SRI/FIRMAS/` y lo reenvía al microservicio `POST /files/upload-signature` (errores **ignorados**, companies.service.ts:215-229). Una clave rechazada se traduce a "La clave del certificado es incorrecta" (:291-292).
  6. **IVA de empresa (`companies.iva`)**: default `'4'` (=15 %); `'3'`=14 %, `'2'`=12 %; sirve para el rótulo "IVA(n%)" y para otros flujos (FE:composables/useProduct.js:67-81; BE:companies/entities/company.entity.ts:103-104). En este código no hay un campo visible para cambiarlo en la pantalla de Empresa (`iva` está en el formulario de datos pero no tiene input) ❓.
  7. **Sucursal:** "Numero de Establecimiento:", "N° punto de emisión:", "N° secuencial Factura:", "N° secuencial Factura Pruebas:", "N° secuencial Nota de Crédito:", "Secuencial nota de crédito Pruebas:", "Ambiente:" (`PRODUCCION`/`PRUEBA`) y "N° secuencial Recibo:" (FE:sucursales/components/FormSucursal.vue:60-257). El **ambiente** decide qué contador se usa y si el microservicio va a `test` o `prod`.
  8. **Cliente:** documento y datos válidos para el comprador (el comprador "CONSUMIDOR FINAL" usa `VITE_CONSUMIDOR_FINAL_ID`).
- **Aviso de firma (banner superior)** — `GET /companies/estado-certificado/{empresa}`; solo si `facturacionElectronicaActiva` y `claim.company.requiere_facturacion` (MainLayout.vue:298-306). Umbral "por vencer": **15 días** (BE:companies.service.ts:99, :152-154). Textos exactos:
  - `vencido`: "Tu firma electrónica venció[ el dd/mm/aaaa]. El SRI no autorizará tus facturas hasta que la actualices."
  - `por_vencer`: "Tu firma electrónica vence en {n} día(s) [(dd/mm/aaaa)]. Renuévala para no interrumpir la facturación."
  - `sin_certificado`: "Tu empresa requiere facturación pero no tiene una firma electrónica cargada. Súbela para poder emitir comprobantes."
  - `vigente` / `desconocido` / `no_aplica`: sin banner. Botón "Actualizar firma" (→ Ajustes › Empresa) y ✕ con tooltip "Ocultar por hoy" (se guarda en `localStorage` hasta el día siguiente).
  - Si la fecha guardada es inservible, el backend pregunta la caducidad real al microservicio (`POST /certificado/info`) y la guarda (companies.service.ts:122-142).
- **Qué NO es:** `useFirmaElectronica.js` y el módulo `firma-electronica` son la **firma de contratos** de clientes (gateway externo, `SIGNATURE_GATEWAY_URL`), **no** el .p12 del SRI (FE:composables/useFirmaElectronica.js:19-30; BE:firma-electronica/disponibilidad-firma.service.ts:7-43).
- **Casos límite:** el backend de ventas **no** valida estos requisitos antes de aceptar la venta; si falta algo el job falla después (VEN-004). El flag "Requiere Facturación" no gobierna la emisión de ventas (solo el banner y el chip).
- **Preguntas probables:** "¿Por qué el SRI no autoriza mis facturas?" (firma vencida/clave/ambiente PRUEBA) · "¿Cómo cambio de pruebas a producción?" (Sucursal → Ambiente, y actualizar secuencial de producción) · "¿Dónde subo la firma?" (Empresa) · "¿Cuántos días antes avisa?" (15).
- **Pendiente de validar en UI:** ❓ dónde se edita `iva` de empresa; ❓ si Empresa vive en Ajustes (`/ajustes/empresa`) o solo `/empresa/edit/:id`.

---

## VEN-014 · Chip "SRI" (estado del servicio) y reintento al volver
- **Ruta UI / name:** cabecera (toolbar), junto al botón de tema (FE:layouts/MainLayout.vue:52-57). Se muestra solo si `claim.company.requiere_facturacion && facturacionElectronicaActiva`.
- **Archivos:** FE: `layouts/EstadoSRI.vue`, `stores/estados-mantenedor.ts:98-112`, `layouts/Notifications.vue:187-189`.
- **Qué hace ✅:** chip con texto **SRI**; verde (`positive`) = tooltip "Servicio del SRI operativo", rojo (`negative`) = "Servicio del SRI no disponible". Consulta cada 5 min (y al montar) `GET {VITE_HOST_API_FACTURACION}/logs?page=1&limit=1&entityType=ESTADO_SRI` y también escucha el WebSocket (`tipo: ESTADO_SRI`). Si `heartbeat.status === 0` → offline; si no → `POST /CE/facturas/reenviar-comprobantes-no-autorizados` y online.
- **Efectos:** con `offline` se deshabilitan los botones de reenviar factura (VEN-006) y los del perfil del cliente (FE:pages/dashboard/clientes/components/editar/PagoItem.vue:495).
- **Casos límite:** el valor inicial del store es `online` (estados-mantenedor.ts:38); si el microservicio no responde, el `catch` solo escribe en consola y el chip no cambia; si `heartbeat` falta, `setStatusSRI` devuelve 'offline' pero **no** actualiza el store (estados-mantenedor.ts:101).
- **Preguntas probables:** "El chip está rojo" (el SRI o el microservicio no responden; esperar) · "No puedo reenviar" (mismo motivo).
- **Pendiente de validar en UI:** ❓ aspecto/ubicación exacta en móvil.

---

## VEN-015 · Factus (Colombia): configuración
- **Qué es Factus ✅:** proveedor externo contratado por el ISP para emitir facturación electrónica ante la **DIAN (Colombia)**; en instancias de Colombia reemplaza al flujo del SRI. El propio banner de la pantalla indica "Contrata el servicio en factus.com.co" (FE:pages/dashboard/ajustes/facturacion/components/FactusConfig.vue:153). El proveedor se decide **por instancia** (`PAIS=CO` o `FACTURACION_PROVIDER=factus`), no por empresa ni sucursal (BE:config/facturacion-provider.config.ts:20-33).
- **Ruta UI / name:** `/ajustes/facturacion` · `ajuste.facturacion` · pestaña **Factus** (solo si `PAIS_INSTANCIA === 'CO'`; en otros países no hay pestañas) (FE:pages/dashboard/ajustes/facturacion/IndexPage.vue:10-11, 40-66). Entrada con permiso `variables.facturacion` (FE:router/auth-guard.ts:87).
- **Archivos:** FE: `ajustes/facturacion/components/FactusConfig.vue`, `sucursales/components/FormSucursal.vue:201-232` · BE: `facturacion/factus/factus.controller.ts`, `factus-config.service.ts`, `entities/factus-config.entity.ts`, `dto/create-factus-config.dto.ts`.
- **Para qué sirve:** guardar las credenciales OAuth2 de Factus y los datos fiscales del emisor, probar la conexión y sincronizar la empresa en Factus.
- **Secciones:** tarjeta "Factus — Facturación electrónica (DIAN)" y subsección "Datos del emisor (DIAN)".
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Ambiente" | select | — | `Pruebas (sandbox)` = `https://api-sandbox.factus.com.co` · `Producción` = `https://api.factus.com.co` | Empezar en sandbox y pasar a producción al validar |
| Activo / Inactivo | toggle | — | booleano | **No tiene efecto:** ningún servicio consulta `is_active` (✅ búsqueda en `facturacion/`) |
| "Client ID" · "Client Secret" · "Email (usuario Factus)" · "Contraseña" | texto | Sí para emitir | Cadenas | Sin ellas: "Credenciales de Factus no configuradas" (BE:factus.service.ts:37-43). El backend devuelve `client_secret` y `password` en claro al front (BE:factus-config.service.ts:31-35) |
| "Tipo de organización" | select | — | `1 — Persona Jurídica` / `2 — Persona Natural` | default 1 |
| "Código DANE del municipio" | texto | Sí para sincronizar | p. ej. 68679 | "Falta el código DANE del municipio del emisor (config de Factus)" |
| "Actividad económica (CIIU)" | texto | — | p. ej. 6311 | |
| "Código de tributo" | select | — | `01 — IVA` / `ZZ — No aplica` | default 01 |
| "Responsabilidades fiscales" | multi-select | — | `O-13 — Gran contribuyente`, `O-15 — Autorretenedor`, `O-23 — Agente de retención de IVA`, `O-47 — Régimen simple de tributación`, `R-99-PN — No responsable` | Se guarda como CSV |

- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Probar conexión" | Fuerza un token OAuth2 | `variables.facturacion` (UI) | `POST /facturacion/factus/probar-conexion` | OK: "Conexión con Factus exitosa"; error: mensaje de Factus o "No se pudo conectar con Factus" |
| "Guardar cambios" | Guarda la fila única de config y **borra el token cacheado** | idem | `PATCH /facturacion/factus/config` | OK: "Configuración de Factus guardada"; error "Error al guardar" |
| "Sincronizar empresa" | Guarda y envía los datos del emisor a Factus | idem | `PATCH …/config` + `POST /facturacion/factus/sincronizar-empresa` (→ `PUT /v2/companies`) | OK: "Empresa sincronizada con Factus"; tooltip "Envía los datos del emisor a Factus (PUT /v2/companies)". Exige NIT en `empresa.ruc` ("La empresa no tiene NIT (campo RUC) configurado") y empresa existente ("No hay una empresa configurada en el sistema") |

- **Reglas de negocio (backend):** fila única en `factus_config` (se crea vacía si no existe); toda la API devuelve 400 "Factus no está habilitado en esta instancia (revisa PAIS / FACTURACION_PROVIDER)" si el proveedor no es Factus (BE:factus.controller.ts:170-177); autenticación OAuth2 (`password` + `refresh_token`), token cacheado con margen de 60 s y reintento tras 401 (BE:factus.service.ts:56-145); timeouts 15 s (token) / 20 s (API).
- **Sucursal (rangos DIAN):** en instancias Factus el formulario de sucursal muestra el banner "En Colombia la numeración la asigna Factus/DIAN…" y dos selects "Rango de numeración — Factura" y "Rango de numeración — Nota Crédito" (cargados de `GET /facturacion/factus/numbering-ranges`; se guardan en `sucursales.factus_rango_factura/_nota_credito`). Vacío = se usa el primer rango activo y vigente de la cuenta (BE:factus.service.ts:275-302).
- **Efectos externos:** API de Factus.
- **Casos límite:** `PUT /v2/companies` pisa los datos de la empresa en Factus; secreto y contraseña visibles en la respuesta del backend (con permiso, mostrados enmascarados con ojo en la UI).
- **Preguntas probables:** "¿Qué es Factus?" · "¿Por qué no veo la pestaña Factus?" (la instancia no es de Colombia) · "Probé la conexión y falla" (credenciales/ambiente) · "¿Qué pasa si lo dejo Inactivo?" (nada: no se consulta) ❓.
- **Pendiente de validar en UI:** ❓ efecto visible del toggle Activo/Inactivo.

---

## VEN-016 · Factus: emisión, nota crédito, descargas y reenvío
- **Ruta UI / name:** misma pantalla de Ventas (VEN-001/002/007/009/010); el comportamiento cambia cuando la instancia es Colombia (etiqueta `VALIDADA`, "CUFE:").
- **Archivos:** BE: `facturacion/factus/factus-invoice.service.ts`, `factus-pago.service.ts`, `factus.service.ts`, `mappers/factus-customer.mapper.ts`, `facturas.service.ts:192-235`, `invoice-queue.processor.ts:133-167, 444-637`.
- **Emisión de una venta (✅):** el job `generateInvoice` llama `emitirPorInvoice` (no pasa por numeración ni microservicio SRI). Idempotente: si la venta ya tiene `clave_acceso` no re-emite (:41-50). Arma `customer`, `items`, `payment` y llama `POST /v2/bills/validate` (`document:'01'`, `operation_type:'10'`, `send_email:=send_messages`, `reference_code:'INV-{id}'`) con el rango de la sucursal o auto-pick (BE:factus.service.ts:406-430). Guarda: `clave_acceso`=CUFE, `numero_comprobante`=número Factus (p. ej. `SETP990006755`), `estadoSRI='AUTORIZADO'` (aunque Factus diga `VALIDADA`), `url_publica`, `respuestaSRI`=JSON crudo (BE:factus-invoice.service.ts:74-80).
- **Mapeo del cliente (BE:mappers/factus-customer.mapper.ts):** tipo de documento ISPMAX → DIAN: `05`→`13` (Cédula), `04`→`31` (NIT), `06`→`41` (Pasaporte), `07`→`13`. NIT → persona jurídica (`1`), resto natural (`2`). Municipio: código DANE resuelto cruzando Departamento (provincia) + Municipio (cantón) del árbol de Ubicaciones; si falla: `No se pudo resolver el código DANE del municipio del cliente "{nombres}" ({provincia} / {cantón}). Verifica que el municipio tenga código en Ajustes › Base de datos › Ubicaciones.`; sin documento: `El cliente "{nombres}" no tiene número de documento`. Tributo `ZZ`. Permite overrides en `custom_data.factus`.
- **Ítems:** `precioUnitario` (sin IVA) → `price`; `descuento` (monto) → `discount_rate` %; `tipo_iva` → `tax_rate` (impuesto `01`; si es 0 → `is_excluded`); unidad `94`, código estándar `999` (BE:factus-invoice.service.ts:156-186; factus.service.ts:460-474). Forma de pago: `payment_form=1` (contado) y método: código de 1-2 dígitos o `codigo_forma_pago` de la forma de pago; default `10` (efectivo) (BE:factus-invoice.service.ts:193-208; factus.service.ts:476-484). IVA y formas de pago disponibles en CO: IVA 0/5/19; Efectivo 10, Consignación 42, Transferencia 47, Cheque 20, Tarjeta Débito 49, Tarjeta Crédito 48, Bonos 71, Vales 72, "Medio de pago no definido" 1 (FE:composables/usePais.js).
- **Anulación:** `anularConFactus` → `anularPorInvoice`: nota crédito `POST /v2/credit-notes/validate` (`correction_concept_code '2'`, `customization_id '20'`, `bill_number`), rango de nota crédito de la sucursal; guarda `clave_acceso_nota_credito`, `num_comprobante_nota_credito`, `estadoSRI='ANULADO'` (BE:factus-invoice.service.ts:86-134). **Los errores se tragan**: solo se guarda `respuestaSRI` y el badge sigue `VALIDADA` sin aviso (BE:facturas.service.ts:220-234).
- **Auto-limpieza:** si Factus responde 409 "pendiente por enviar a la DIAN", el sistema **lista hasta 50 facturas/notas crédito no validadas (`status=0`) y las elimina en Factus**, luego reintenta una vez (BE:factus.service.ts:316-400). Puede afectar documentos pendientes de otros orígenes de la misma cuenta.
- **Fallo de emisión:** `estadoSRI='ERROR'` y `respuestaSRI = error.response.data.message` (BE:invoice-queue.processor.ts:155-165).
- **Descargas:** FE usa `GET /facturacion/factus/bills/{n}/{pdf|xml}` y `credit-notes/{n}/{pdf|xml}` (BE:factus.controller.ts:118-168); Factus devuelve base64 en JSON y el backend lo entrega binario.
- **Reenvío por WhatsApp/correo (job `enviar-comprobantes-factus`):** descarga PDF y XML por número, envía por la sesión de WhatsApp y/o SMTP, con textos "…le ha emitido la siguiente {Factura|Nota de Crédito}: {número}. Adjuntamos el comprobante electrónico en PDF y XML." (BE:invoice-queue.processor.ts:518-565).
- **Endpoints de apoyo (todos `@Auth`):** `GET config`, `PATCH config`, `POST probar-conexion`, `GET numbering-ranges`, `POST sincronizar-empresa`, `GET preview-customer/:id`, `POST emitir` (prueba sandbox: sin persistir), `POST emitir-pago/:pagoId` (BE:factus.controller.ts). La UI solo usa config, probar-conexión, sincronizar, numbering-ranges y descargas.
- **Casos límite:** (1) el botón reenviar del listado llama al flujo del SRI aunque la instancia sea Factus: una venta en `ERROR` no se re-emite desde ahí ❓ (VEN-006). (2) No se envían retenciones/otros documentos. (3) Los ítems con precio negativo (descuentos globales, saldos) se **omiten** en la emisión Factus (comentarios "refinamiento futuro").
- **Preguntas probables:** "Dice VALIDADA, ¿es lo mismo que AUTORIZADO?" (sí, etiqueta para Colombia) · "Factus no emite: municipio sin DANE" · "¿Dónde veo la factura en Factus?" (Detalle → Descargar o `url_publica` ❓).
- **Pendiente de validar en UI:** ❓ visualización de errores de Factus; ❓ si `url_publica` se muestra en algún lado (no hay referencia en las vistas leídas).

---

## VEN-017 · Proformas (cláusulas)
- **Ruta UI / name:** **no existe pantalla.** Ningún archivo del frontend llama a `/proforma` ✅ (búsqueda de "proforma", "clausula" en `frontend/src`: solo aparecen condiciones de `estadoSRI == 'PROFORMA'`).
- **Archivos:** BE: `proforma/proforma.controller.ts`, `proforma.service.ts`, `entities/proforma.entity.ts`, `dto/create-proforma.dto.ts`.
- **Qué hay en el backend:** una tabla `proforma` con `company_id`, `clausulas` (JSON `[{nombre, descripcion}]`) y `aceptacion_proforma` (texto). Endpoints (todos `@Auth()`): `POST /proforma/clausula` (cabecera `company-id`), `GET /proforma/:id`, `PATCH /proforma/:id` (BE:proforma.controller.ts:8-30).
- **Reglas/bugs ✅:**
  - Primera vez: `create()` no usa el DTO ni la empresa (`this.proformaRepository.create(proforma)` con `proforma` indefinido) → crea una fila vacía sin `company_id` ni cláusulas (BE:proforma.service.ts:29-33). Solo la actualización de una fila existente aplica los datos.
  - El estado `PROFORMA` **nunca** lo escribe el backend; no hay conversión proforma → factura; `invoices.name_proforma` existe pero no se usa en ningún flujo. `GET /invoices` carga la relación `company.proforma` y el frontend no la usa (BE:invoices.service.ts:152).
- **Efecto para el usuario:** las "proformas" **no existen** como funcionalidad. Las condiciones de la UI para `PROFORMA` (botón eliminar, detalle "Detalle de la Proforma", ocultar reenviar) son código heredado.
- **Preguntas probables:** "¿Cómo emito una proforma/cotización?" → no se puede. "¿Cómo convierto una proforma en factura?" → no existe.
- **Pendiente de validar en UI:** ❓ si hay otra entrada (plantilla, Ajustes) que use las cláusulas: no se encontró.

---

## VEN-018 · Retenciones
- **Estado ✅:** **no existen** en este código. No hay módulo, entidad ni `PivotRetencion` en el backend, ni pantalla o composable en el frontend. Lo único relacionado: las columnas `secuencia_retencion_produccion` y `secuencia_retencion_pruebas` de `sucursales` (BE:sucursal/entities/sucursal.entity.ts:61-65; DTO create-sucursal.dto.ts:35-39) y el estado inicial/validación numérica del formulario de sucursal (FE:sucursales/composables/useSucursal.js:17-18, 72-73). **`FormSucursal.vue` no dibuja esos campos** y ningún servicio los lee.
- **Relación con el manual:** docs/guia/roles-empresa.mdx:100 afirma que las secuencias incluyen "facturas, notas de crédito y retenciones" → no se puede verificar en la UI leída.
- **Preguntas probables:** "¿Puedo emitir retenciones?" → no desde ISPMAX. "¿Para qué sirve el secuencial de retención?" → no se usa.
- **Pendiente de validar en UI:** ❓ confirmar que el formulario de sucursal real no muestra retenciones.

---

## VEN-019 · Generación automática de facturas de servicio (`crear-facturas`)
- **Ruta UI / name:** sin pantalla propia; botón manual en `/ajustes/facturacion` · `ajuste.facturacion` (card "Generar facturas ahora") (FE:pages/dashboard/ajustes/facturacion/components/FacturacionPage.vue:243-281).
- **Archivos:** BE: `crear-facturas/crear-facturas.service.ts`, `app.service.ts:197-236`, `app-queue.processor.ts:53-61, 195-205`, `app.controller.ts:64-70`, `config/queue.config.ts`.
- **Para qué sirve:** crear las **facturas de servicio** (entidad `Pago`) de cada cliente: la mensual y, según configuración, la anticipada. No genera ventas libres. ✅
- **Acceso:** el botón es de Ajustes → Facturación (`variables.facturacion`); el endpoint `POST /generar-facturas` solo exige JWT (BE:app.controller.ts:64-70).
- **Cuándo corre (✅):**
  1. **Cron mensual** `crearFacturas`: `"{INTERVALO_MINUTOS} 0 1 * *"` (día 1, hora 00:{INTERVALO_MINUTOS}), `attempts:2`, backoff 120 s; cada instancia espera un retardo aleatorio de 0–25 min antes de empezar (BE:queue.config.ts:10-13; app.service.ts:197-214; crear-facturas.service.ts:54-67).
  2. **Creación anticipada**: dentro del proceso de cortes/estado de servicios (`repararYSetearEstadosServicios`), para servicios con "Creación Anticipada = N días": `crearFacturaAntes` (base `mes`: cuando faltan ≤ N días para fin de mes) o `crearFacturaPorFechaPago` (base `fecha_pago`: N días antes del día de pago, adelantada al primer recordatorio si este cae antes) según `setting.baseCreacionFactura` (BE:app-queue.processor.ts:195-205).
  3. **Manual**: botón → `POST /generar-facturas` → job `generarFacturasPendientes` (jobId fijo, un doble clic comparte el job) → `ejecutar({esperar:false})` + anticipadas; devuelve las facturas con `no_factura` mayor al máximo previo (BE:crear-facturas.service.ts:146-181; app.service.ts:216-236).
- **Reglas de negocio:**
  - Cada servicio se procesa aislado: un error en uno no detiene a los demás (:97-107).
  - Se omiten servicios `deleted`; suspendidos solo si el ajuste `facturar_suspendidos` o el modo "Desde Último Pago" (:226-231).
  - Modo `fecha_pago`: el cron mensual **no** crea las de los clientes con anticipación (solo los "Sin anticipar") (:203-210).
  - No duplica: busca facturas del período por vencimiento (`dia_pago + gracia`) **incluyendo eliminadas** (`withDeleted`) → una factura eliminada a mano **no se vuelve a crear** (:778-800).
  - Salta meses pagados por adelantado (`esMesAdelantado`) y, en postpago sin período cumplido, la primera factura (:183-192, :347-350).
  - Contenido: ítem del plan (`precio`, IVA del perfil, ICE) + cargos recurrentes vigentes (`Mensualmente`, `Un solo pago`, cuotas) + saldo a favor aplicable; los **Recibos no llevan IVA** (`tipo_impuesto 'Ninguno'`); los recurrentes `FACT. LIBRE` van en otra factura (`tipo_factura:'FACT. LIBRE'`) (:272-304, :733-776).
  - Estado inicial: `PAGADO` si el total ≤ 0, si no `NO PAGADO` (:333, :355).
- **Mensajes de la UI manual (texto exacto):** diálogo "¿Generar las facturas pendientes ahora?" / "Se evalúa a todos los clientes con la configuración guardada. Al que ya tiene la factura de su período no se le crea otra." botones **Generar** / **Cancelar**; sin resultados: "No había facturas pendientes por generar" (info); con resultados: diálogo "{n} factura(s) generada(s)" con columnas **N° Fact. · Cliente · Tipo · Día de pago · Total**; error 502/504/sin respuesta: "La generación sigue en proceso. Revisa las facturas en unos minutos."; otro: "No se pudieron generar las facturas". Botón deshabilitado si se cambió la base y no se guardó: "Cambiaste la base de creación: guarda los cambios antes de generar." (FacturacionPage.vue:66-96, 259-278).
- **Efectos externos:** ninguno directo (BD y caché `fecha-max-pago:*`); las facturas luego pueden disparar recordatorios por WhatsApp/correo (otro inventario).
- **Casos límite:** `crear_factura` "Desactivado" → solo el cron mensual; día de pago 31 en meses cortos se normaliza (`fechaDiaPago`); si falla la corrida completa → 400 "Error al crear las facturas" (:125-131).
- **Preguntas probables:** "¿Por qué no se generó la factura de este cliente?" (suspendido sin `facturar_suspendidos`, ya hubo una en el período —aunque la hayan borrado—, mes adelantado, servicio retirado) · "Borré una factura y no vuelve a salir" (diseño) · "¿Cuándo se generan?" (día 1 y/o N días antes).
- **Pendiente de validar en UI:** ❓ valor real de `INTERVALO_MINUTOS` por instancia.

---

## VEN-020 · Estados de la factura de servicio y reglas de anulación/eliminación (backend)
- **Ruta UI / name:** perfil del cliente (`/clientes/edit/:id`) → Facturación/Pagos → pestaña **Facturas** (tabla de la factura de servicio y su detalle por abono), Registrar pago y Transacciones. La tabla y sus botones los describe el inventario de Clientes (CLI-022); aquí están las **reglas de backend** y las **condiciones exactas de los botones Anular/Eliminar**.
- **Archivos:** BE: `pagos/pagos.service.ts:891-1350`, `pagos/pagos.controller.ts:203-243`, `facturas-pagos/facturas-pagos.service.ts:223-290`, `comprobantes-electronicos/facturas/facturas.service.ts:168-183, 249-462`, `pagos/entities/pago.entity.ts` · FE: `pages/dashboard/clientes/components/editar/IndexFacturas.vue:239-283, 551-610, 1090-1250, 1360-1470`, `…/editar/PagoItem.vue:36-41, 60-145, 157-230, 380-430, 645-675`, `pages/dashboard/clientes/composables/useEditCliente.js:190-290, 305-345`, `src/composables/useAnularMotivo.js`.
- **Estado de la factura (`pagos.estadoSRI`) ✅:**

| Estado | Cómo se llega | Significado |
|---|---|---|
| `NO PAGADO` | Al crearla (total > 0); al anular el pago o el último abono | Sin abonos válidos |
| `PENDIENTE` | Al registrar un abono parcial (la FE manda `PENDIENTE` si `monto_pendiente > 0`, FE:clientes/components/modals/ModalPago.vue:372); cuando el microservicio responde, el backend lo **recalcula** (BE:facturas-pagos.service.ts:263-278); al anular un abono si queda otro `AUTORIZADO`/`PAGADO` (BE:pagos.service.ts:1151-1152); al reactivar una factura anulada que ya tenía abonos en el arreglo (:919) | Abono parcial: falta saldo (**no** es "pendiente de SRI") |
| `PAGADO` | Abonos válidos cubren la deuda (FE:ModalPago.vue:326, 372; recálculo BE:facturas-pagos.service.ts:263-278); también nace así si el total ≤ 0 (BE:crear-facturas.service.ts:353-375) | Cobrada |
| `ANULADO` | `anularFacturaMes('inactivar')`; o `anularPago` cuando no había abonos; o al autorizar la nota de crédito (`actualizarFacturasDelComprobante`) | Anulada |
| `AUTORIZADO` (a nivel de factura) | El job de emisión lo escribe en `pagos.estadoSRI` con el estado del microservicio (BE:invoice-queue.processor.ts:319-326) y **en la misma operación** `FacturasPagosService.update` lo recalcula a `PAGADO`/`PENDIENTE`/`NO PAGADO` (facturas-pagos.service.ts:263-278). Solo sobrevive si el abono no se encuentra (`:246` `return`) o en datos viejos. Todo el código (consultas, FE) lo trata como sinónimo de `PAGADO` (`IN ('PAGADO','AUTORIZADO')`) | Cobrada (valor heredado) |
| (por abono) `AUTORIZADO`/`VALIDADA`/`DEVUELTA`/`NO AUTORIZADO`/`ANULADO`… | Cada abono lleva el estado de su comprobante en `pagos[].estadoSRI` (inicial `PAGADO` o `PENDIENTE`, FE:ModalPago.vue:326, 372; luego el del microservicio) | Estado fiscal del abono. **Por defecto `DEVUELTA`**: toda actualización de `facturas-pagos` sin `estadoSRI` lo fija así (BE:facturas-pagos.service.ts:252) |

- **Endpoints (todos solo `@Auth()`, sin permiso por endpoint ✅ BE:pagos/pagos.controller.ts:203-243):** `PUT /pagos/anular-pago-mes/:pago_id/:estado` (`inactivar`/`activar`, body `{motivo}`) · `PATCH /pagos/anular-pago/:pago_id` · `PATCH /pagos/anular-abono/:abono_uuid/:pago_id` · `DELETE /pagos/:id` (body `{motivo}`) · `POST /CE/facturas/anularFactura` y `…/anular-multiples-factura` (nota de crédito, VEN-007). Respuestas: `{ok:true, msg:"Pago actualizado"}`, `"Pago anulado exitosamente"`, `"Abono anulado exitosamente"`, `"Pago eliminado exitosamente"`. Un error no HTTP (p. ej. `abono_uuid` inexistente) se convierte en 500 `Unexpected error, check server logs` (BE:pagos.service.ts:1884-1890).
- **Reglas de anulación/eliminación (backend) ✅:**
  - **Anular factura del mes** (`anularFacturaMes`): exige motivo si ambos ajustes están activos (`anulacionPedirMotivo` y `anulacionMotivoObligatorio`, default true): "El motivo de anulación es obligatorio" (solo al `inactivar`); deja `ANULADO`, guarda quién/cuándo/motivo (`pagos.anulacion`) y **elimina los cargos de saldo a favor** vinculados a sus abonos. `activar` limpia `anulacion` y deja `NO PAGADO` si el arreglo `pagos` está vacío o `PENDIENTE` si **tiene cualquier elemento** (cuenta también los abonos ya anulados, :919). No valida el estado de partida (la FE solo lo ofrece desde `NO PAGADO`/`PENDIENTE` o `ANULADO`) (:891-966).
  - **Anular pago** (`anularPago`): igual motivo; **rechaza** si algún abono está AUTORIZADO/VALIDADA y no eliminado: "Esta factura tiene un comprobante electrónico autorizado: hay que anularla con nota de crédito, no dando de baja el pago." (:990-1002, parámetro `omitirGuardaComprobante` lo salta). Marca todos los abonos `eliminado/ANULADO`; estado `NO PAGADO` (o `ANULADO` si no había abonos) (:1012-1019); anula meses adelantados de origen (`anularPorPagoOrigen`) y elimina los cargos de saldo vinculados (:1022-1026).
  - **Anular abono** (`anularAbono`): guarda equivalente: "Este abono tiene un comprobante electrónico autorizado: hay que anularlo con nota de crédito." (:1109-1115). Tras marcar el abono (`eliminado`, `ANULADO`, `anulacion`), el estado de la factura pasa a `PENDIENTE` **solo si queda algún abono `AUTORIZADO` o `PAGADO`** (un abono `VALIDADA` —Colombia—, `DEVUELTA` o `NO AUTORIZADO` no cuenta) y si no a `NO PAGADO` (:1143-1157). En cobros **agrupados** anula primero las facturas hermanas y es el cobro completo el que se anula (:1117-1134).
  - **Nota de crédito (SRI)**: `generarNotaCredito` con `entity='Pagos'`: primero consulta `GET /v1/factura/{clave}` (si falla, solo refresca la pantalla por WebSocket y sale sin hacer nada, :256-263); reserva el secuencial de nota de crédito; tras autorizarse la NC llama `anularAbono(..., omitirGuardaComprobante=true)`, actualiza la(s) factura(s) a `ANULADO` y guarda `clave_acceso_nota_credito` (facturas.service.ts:329-355). Motivo: `datosFactura.motivo` o, si no hay autor, "Anulación automática por nota de crédito electrónica (SRI)". En Colombia (Factus) hace lo propio con `FactusPagoService.anularPorPago` y la factura queda por cobrar, no `ANULADO` (:192-235).
  - **Eliminar factura** (`remove`, `DELETE /pagos/:id`): motivo obligatorio con los mismos ajustes ("El motivo de eliminación es obligatorio"); guarda `anulacion`, borra lógicamente sus `facturas-pagos` y el pago; **no valida estado ni comprobantes** (:1293-1350). Las restricciones visibles ("solo si …") están en el frontend (tabla siguiente).
  - Facturas de meses adelantados: solo se eliminan automáticamente las `NO PAGADO`; las demás se omiten y se deja un `warn` en el log del servidor (:1256-1291).
- **Condiciones de los botones en el perfil del cliente (✅ FE, pestaña Facturas; las mismas condiciones en la tabla de escritorio y en el menú móvil):**

  | Botón / tooltip | Aparece cuando | Permiso | Llama a |
  |---|---|---|---|
  | papelera "Eliminar Factura" (diálogo "¿Estas seguro de borrar esta factura?", botón **Eliminar**) | `tipo_factura` ∈ {`FACT. LIBRE`, `FACT. DE SERVICIO`} **y** estado de la fila ∈ {`NO PAGADO`, `ANULADO`} **y** `mostrarAccionesFactura` | `cliente.factura.eliminar` | `DELETE /pagos/:id` con `{motivo}`; además `DELETE /servicios-recurrente-pagos/:id` por cada cargo ligado; notify "Pago Eliminado...!" / error "Fallo al eliminar la factura" (FE:useEditCliente.js:305-345) |
  | ícono cancelar "Anular Factura" (diálogo "¿Estas seguro de anular esta factura?", botón **Anular**) | estado ∈ {`NO PAGADO`, `PENDIENTE`} y `mostrarAccionesFactura` | `cliente.factura.anular` | `PUT /pagos/anular-pago-mes/:id/inactivar` y luego `GET /activar-desactivar-servicio/:servicio` |
  | ícono tarea "Hacer activo la factura" (diálogo "¿Deseas hacer valido esta factura?", botón **Activar**, sin motivo) | estado = `ANULADO` y `mostrarAccionesFactura` | `cliente.factura.anular` | `PUT /pagos/anular-pago-mes/:id/activar` |
  | ícono documento con X "Anular pago(s) agregados" (diálogo "¿Estas seguro de anular los pago(s) agregados de esta factura?") | (estado ∈ {`PAGADO`, `PENDIENTE`, `AUTORIZADO`} **o** algún abono `sin_pago` no eliminado) y `mostrarAccionesFactura` | `cliente.cancelar.pago` | por cada abono no eliminado: si su comprobante es `AUTORIZADO`/`VALIDADA` arma una nota de crédito y al final `POST /CE/facturas/anular-multiples-factura`; si no, `PATCH /pagos/anular-abono/:uuid/:pago`; atajo: factura de total 0 sin comprobante autorizado → `PATCH /pagos/anular-pago/:pago`. Error: notify con el mensaje del backend o "No se pudo anular el pago" (FE:IndexFacturas.vue:239-283) |
  | botón "Anular pago" (dentro del detalle de cada abono) | estado del abono ∈ {`PAGADO`, `AUTORIZADO`, `VALIDADA`} **y** no `sin_pago` **y** **no** (la factura tiene a la vez un abono `AUTORIZADO` y uno `PAGADO`) **y** no es un pago antiguo (sin `estadoSRI` propio) | `cliente.cancelar.pago` | si la factura tiene algún abono `AUTORIZADO`/`VALIDADA` pregunta "Nota de crédito" (casilla "Enviar nota de credito al cliente", botón **Continuar**; el aviso dice "La factura está autorizada en el SRI." o, en Colombia, "…validada en la DIAN."); si **este** abono es `AUTORIZADO`/`VALIDADA` emite la NC primero (`POST /CE/facturas/anularFactura`) y el abono lo anula el backend después; si no, `PATCH /pagos/anular-abono/:uuid/:pago`. Cobro agrupado: aviso "Cobro agrupado" con botón **Anular el cobro completo** (FE:PagoItem.vue:60-145, 36-41, 645-675) |

  Otros puntos de entrada con la misma regla (nota de crédito primero si el abono es `AUTORIZADO`/`VALIDADA`; `anular-abono` si no): **Transacciones** (FE:pages/dashboard/transacciones/ActionCellRenderer.vue:312-352, diálogo "¿Estas seguro de anular este pago?" con "Valor Cobrado") y **Registrar pago** (FE:pages/dashboard/registrar-pago/components/AccionesPago.vue:72-106, notify "Pago eliminado exitosamente"; con abono no `PAGADO` anula primero los `PAGADO` y luego emite la NC).

  `mostrarAccionesFactura` = el servicio seleccionado **no** está retirado, salvo que Ajustes › Facturación tenga activo "gestionar facturas de retirados" (`gestionarFacturasRetirados`) (FE:IndexFacturas.vue:196-203). El diálogo de motivo (FE:src/composables/useAnularMotivo.js) lee `anulacionPedirMotivo` y `anulacionMotivoObligatorio`: si no se pide motivo, solo confirma; si es obligatorio exige **≥ 3 caracteres** ("Motivo de anulación \*" / "Motivo de eliminación \*", pista "Indique por qué se anula|elimina (mínimo 3 caracteres)"), mientras que el backend solo exige que no esté vacío. Tras anular/activar la FE llama `GET /activar-desactivar-servicio/:id` para recalcular suspensión (AUT-012).
- **Casos límite:** `anular-multiples-factura` emite una NC por cada factura de un grupo y actualiza el estado solo en la última (facturas.service.ts:168-183). La FE de una factura con comprobante autorizado **nunca** llama a `anular-pago`/`anular-abono` directo (la guarda del backend es una segunda barrera); una llamada directa a la API con un abono autorizado devuelve 400 con los textos de arriba. Con `abono` `DEVUELTA`/`NO AUTORIZADO` (sin comprobante autorizado) `anular-abono` sí se permite y el estado de la factura sale `NO PAGADO` aunque quedaran otros abonos con esos estados.
- **Pendiente de validar en UI:** ❓ aspecto de los diálogos y de la insignia de estado de cada abono (los textos están en el código); ❓ el servicio externo (SRI/Factus) no interviene en estas reglas salvo la nota de crédito (VEN-007).

---

## VEN-021 · Ingresos / Egresos: listado, filtros, tarjetas y estadísticas
- **Ruta UI / name:** `/ingresos-egresos` · `index.ingresos_egresos` · menú **Finanzas → Ingresos / Egresos** (FE:layouts/SideBarMenu.vue:26-30; FE:router/routes.ts:56-61).
- **Archivos:** FE: `pages/dashboard/ingresos-egresos/IndexPage.vue`, `composables/useIngresoEgreso.js`, `components/ResumenCards.vue`, `components/EstadisticasAnuales.vue` · BE: `ingresos-egresos/ingresos-egresos.controller.ts`, `ingresos-egresos.service.ts`, `entities/ingreso-egreso.entity.ts`, `dto/filter-ingreso-egreso.dto.ts`.
- **Para qué sirve:** libro de caja con ingresos/egresos **manuales** (pagos a proveedores, sueldos, etc.), más tarjetas que los comparan con lo cobrado por servicios de internet y con las ventas autorizadas. ✅ No hay categorías ni cuentas: solo tipo, router, proveedor, forma de pago, referencia.
- **Acceso:** permiso `index.ingresos_egresos` (solo se aplica en el menú). **La ruta no declara `meta.requiresAuth`**, por lo que el guard la deja pasar sin validar sesión ni permiso (FE:router/routes.ts:56-61; FE:router/auth-guard.ts:11); la API sigue exigiendo JWT. Solo `SUPER-ADMINISTRADOR` ve el filtro "Operador" y datos de todos los operadores (FE:IndexPage.vue:49-51, :271-286; BE:ingresos-egresos.service.ts:49-64).
- **Secciones:** 6 tarjetas · tabla "Ingresos / Egresos" con filtros · "Estadísticas por mes".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Nuevo Registro" | Abre el formulario (VEN-022) | `crear.ingresos_egresos` | — | Oculto en móvil (`xs`); en móvil hay botón flotante **+** con el mismo permiso |
| "Reporte" | Abre "Generar reporte" (VEN-023) | `reporte.ingresos_egresos` | — | — |
| toggle "Exacta" | Búsqueda por texto exacta | — | `GET /ingresos-egresos` (`filtroExacto`) | Tooltip: 'Búsqueda exacta: solo coincidencias completas (ej. "DEPOSITO" no trae "DEVOLUCIÓN DEL DEPOSITO").' **No es una búsqueda por fecha.** |
| "OCULTAR COLUMNAS" | Muestra/oculta columnas (en el store) | — | — | — |
| "Buscar..." | Busca por texto (debounce 300 ms) | — | `GET /ingresos-egresos` (`filter`) | Server-side |
| icono lápiz | Editar registro | `editar.ingresos_egresos` | — | Abre VEN-022 |
| icono papelera | Eliminar registro | `eliminar.ingresos_egresos` | `DELETE /ingresos-egresos/:id` | Ver VEN-022 |

- **Filtros (labels exactos):** "Tipo:" `Todos` / `Ingresos` / `Egresos` · "Router:" (`Todos` + routers de `GET /router/true`) · "Proveedor:" (`Todos`, `Ninguno`, proveedores de `GET /providers/true`) · "Operador:" (solo SUPER-ADMINISTRADOR; `Todos`, `Sin operador`, usuarios de `GET /auth/users`) · "Fechas" (rango `q-date`, por defecto 1° al último día del mes; muestra "dd/mm/aaaa hasta dd/mm/aaaa"). Paginación 10/15/20/50/Todos.
- **Columnas:** **Tipo** (badge `Ingreso` / `Egreso` / `Ingreso Recurrente` / `Egreso Recurrente`) · **Router** (`Todos` si no tiene) · **Proveedor** (`Ninguno`) · **Referencia** · **Forma de Pago** (`Efectivo`/`Transferencia`/`-`) · **Monto** · **Fecha** (dd/mm/aaaa) · **Descripción** · **Operador** (`ISPMAX` si no tiene usuario) · **Acciones**.
- **Tarjetas (textos en mayúsculas por CSS):** "Total Ingresos Hoy" · "Total Ingresos" · "Cobrado Servicios" · "Ventas" (clic → Ventas con `AUTORIZADO` y el rango; tooltip "Ver detalle de ventas del período"; con router elegido muestra aviso "Las ventas no se asocian a un router. Se muestran solo en la vista "Todos los routers".") · "Total Egresos Hoy" · "Total Egresos".
- **Estadísticas por mes:** título "Estadísticas por mes"; selector de año (últimos 6); columnas **Mes · Pagos Internet · Ventas · Otros Ingresos · Gastos · Total**; fila resaltada "Mes actual"; fila final "Total"; vacío "Sin datos para el año seleccionado".
- **Estados posibles:** tipo `ingreso` / `egreso` / `ingreso-recurrente` / `egreso-recurrente` (BE:entities/ingreso-egreso.entity.ts:19-34).
- **Reglas de negocio (backend):**
  - **No super-admin:** el filtro `user_id` se fuerza al propio usuario en listado, resumen, estadísticas y reportes (BE:service.ts:58-69, :167-169, :258-260, :683, :861). No ve, por tanto, los registros generados por el cron (usuario nulo).
  - Búsqueda normal: `ILIKE` en referencia, descripción, nombre del operador (o `ISPMAX`) y monto; exacta: igualdad (sin mayúsculas) en referencia o descripción (:88-110).
  - Filtro Router: `(router = X OR sin router)`: los registros sin router aparecen en **todos** los routers (:126-128).
  - Orden: primero los registros "padre" recurrentes, luego por `created_at DESC` (:148-155).
  - **Total Ingresos / Egresos**: suma de `monto` por tipo (incluye recurrentes) en el rango; las tarjetas "Hoy" ignoran el rango pero respetan router/proveedor/operador (:204-237). No dependen del filtro "Tipo" ni del texto.
  - **Cobrado Servicios**: suma de `pagos[].valor` (JSONB de la tabla `pagos`) con `fecha_abono` (DD/MM/YYYY) en el rango, excluyendo abonos `eliminado` y pagos borrados; filtra por router del servicio y por `usuario_id` del abono (:456-481).
  - **Ventas**: `SUM(invoices.total)` con `estadoSRI='AUTORIZADO'`, `deleted_at IS NULL`, por `created_at::date`; con router elegido devuelve 0 (:616-639).
  - **Estadísticas anuales**: por mes `Pagos Internet` (cobros), `Ventas` (AUTORIZADAS; no se atribuyen si hay router), `Otros Ingresos` y `Gastos` (registros manuales), `Total = Pagos Internet + Ventas + Otros Ingresos − Gastos` (:258-385).
- **Efectos externos:** ninguno (solo BD).
- **Relaciones con otros módulos:** Routers, Proveedores, Usuarios, Pagos/Transacciones (cobrado), Ventas (invoices), Archivos (`images-services`).
- **Casos límite y advertencias:**
  - **Compras** (módulo Almacén) **no** entran aquí: un pago a proveedor debe cargarse a mano como egreso.
  - "Cobrado Servicios" es lo **abonado por fecha de abono**, no lo facturado; incluye todos los abonos no eliminados, sin distinguir autorizado/pendiente.
  - Sin rango de fechas, los totales de cobrado/ventas del reporte salen en 0 (comparación `BETWEEN NULL AND NULL`) ❓ (VEN-023).
  - Cualquier usuario con JWT puede consultar `/ingresos-egresos/find/:term`, editar o borrar por id (el backend no revisa dueño ni permiso).
- **Preguntas probables:**
  1. "¿Qué significa Exacta?" → búsqueda de texto completa, no fecha.
  2. "No veo los movimientos de mis compañeros" → solo el SUPER-ADMINISTRADOR ve todos.
  3. "¿Por qué Ventas sale en 0?" → hay un router filtrado, o no hay ventas AUTORIZADAS en el rango.
  4. "¿Por qué el total no cuadra con Transacciones?" → "Cobrado Servicios" suma abonos por fecha de abono y operador; los filtros de router/operador aplican.
  5. "¿Dónde registro un gasto?" → "Nuevo Registro" tipo Egreso.
  6. "Mi usuario no abre la pantalla" → permiso `index.ingresos_egresos` (menú); la URL directa no valida.
- **Pendiente de validar en UI:** ❓ apertura de `/ingresos-egresos` sin permiso (la ruta no valida); ❓ filtrado real de "Operador" para roles no super-admin.

---

## VEN-022 · Ingresos / Egresos: crear, editar, eliminar y recurrencia
- **Ruta UI / name:** diálogo "Nuevo Registro" / "Editar Registro" (FE:components/FormIngresoEgreso.vue) sobre `/ingresos-egresos`.
- **Archivos:** FE: `components/FormIngresoEgreso.vue`, `composables/useIngresoEgreso.js:86-137, 403-458` · BE: `ingresos-egresos.service.ts:26-46, 407-438`, `dto/create-ingreso-egreso.dto.ts`, `ingresos-egresos.queue.processor.ts`, `app.service.ts:446-463`.
- **Para qué sirve:** registrar un ingreso o egreso puntual, o programar uno que se repita.
- **Acceso:** `crear.ingresos_egresos`, `editar.ingresos_egresos`, `eliminar.ingresos_egresos`.
- **Botones y acciones:** "Guardar" (submit) · "Cerrar" · ✕ del encabezado · confirmaciones abajo.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Tipo" | select | Sí (default `Ingreso`) | `Ingreso` / `Egreso` | DTO `@IsIn(['ingreso','egreso'])` |
| "Router" | select | No | `Todos` (null) + routers | `@IsUUID` si viene |
| "Fecha" | fecha (mask date) | Sí | default hoy; "Debes elegir una fecha" | DTO `@IsDateString` |
| "Monto" | número (paso 0.01) | Sí | `≥ 0`: "Debes ingresar un valor mayor o igual a cero." | DTO `@Min(0)`; **0 se acepta** |
| "Proveedor" | select | No | `Ninguno` (→ null) + proveedores | `NINGUNO`/`''` se convierte en null (DTO `@Transform`) |
| "Recurrente" | select | Sí (default `Una sola vez`) | 13 opciones: `Una sola vez`(0), `Diario (todos los días)`(1), `Diario (Lunes - Viernes)`(2), `Diario (Lunes - Sábado)`(3), `Mensual (según fecha de registro)`(4), `Anual (misma fecha de registro)`(5), `Todos los Lunes`…`Todos los Domingos`(6-12) | `@IsEnum(TipoRecurrencia)` |
| "Estado Recurrencia" | select | No | Solo al **editar** y `recurrente>0`: `Activado/Habilitado (Se cobrará)` / `Pausado/Desactivado (No se cobrará)` | Pausa la generación sin borrar |
| "Referencia" | texto | Sí | "Debes completar este campo" | `varchar(255)` |
| "Forma de Pago (opcional)" | select | No | `Efectivo` / `Transferencia` (muestra "Seleccione...") | DTO `@IsEnum(FormaPago)` |
| "Archivo(s) Adjunto(s)" | arrastrar y soltar | No | Cualquier tipo, máx. 8 archivos de 500 MB | Se suben a `POST /files/upload-image/images-services` antes de guardar |
| "Detalles" | textarea (3 filas) | No | placeholder "Ingrese más detalles" | Va a `descripcion` |

- **Reglas de negocio (backend):**
  - Al crear, si `recurrente > 0` el tipo guardado es `{tipo}-recurrente`; el `user_id` es el usuario autenticado (BE:service.ts:29-38).
  - Al editar, el tipo se recalcula con `tipo` + `recurrente` (:411-419). No hay chequeo de propietario.
  - Eliminar = borrado lógico (`softDelete`) (:433-438); los hijos generados no se tocan.
  - **Recurrencia (cron diario `0 0 * * *`, job `generarIngresosEgresosRecurrentes`):** toma los registros con `recurrente≠0`, `recurrente_activo=true` y sin padre; si hoy corresponde según la regla y **hoy es posterior a la fecha del registro**, crea un hijo con `fecha=hoy`, tipo sin sufijo, `user_id=null` (Operador "ISPMAX"), mismo router/proveedor/referencia/forma de pago/monto/descripción/archivos, `recurrente=0`, `recurrente_activo=false`, `padre_id` = original; no repite si ya existe hijo del día (BE:ingresos-egresos.queue.processor.ts:25-70). Reglas: `Diario`=todos los días; `Lunes-Viernes`, `Lunes-Sábado`; `Mensual` = mismo día del mes (o último día si el mes es más corto); `Anual` = mismo día y mes; `Todos los {día}` = ese día de la semana (:73-105).
  - El registro original cuenta como un movimiento más en su propia fecha.
- **Mensajes (texto exacto):** diálogo "¿Deseas agregar este registro?" (botones **Agregar**/**Cancelar**) o "¿Deseas editar este registro?" (**Editar**/**Cancelar**); éxito "Registro agregado exitosamente" / "Registro editado exitosamente"; error `message` del backend o "Fallo al guardar". Eliminar: "¿Deseas eliminar este registro?" con Referencia/Monto/Fecha (botones **Eliminar**/**Cancelar**); éxito "Registro eliminado exitosamente"; error `message` o "Fallo al eliminar". Carga: "Cargando...".
- **Efectos externos:** subida/borrado de archivos en el servidor (`/files/images-services/{archivo}`), cola Bull `${queueName}-ingresos-egresos`.
- **Casos límite y advertencias:**
  - El hijo recurrente hereda adjuntos y es un registro **independiente**: editar el padre no cambia los hijos ya creados.
  - Cambiar la **fecha** del padre mueve el ancla de Mensual/Anual.
  - No hay forma en la UI de ver/borrar hijos en bloque ni de ligarlos al padre (se identifican por Referencia).
  - Un usuario no super-admin no ve los hijos (usuario nulo) → "desaparecen" para él.
  - Pausar (`Estado Recurrencia`) solo detiene a futuro.
- **Preguntas probables:** "Creé un gasto mensual y no aparece cada mes" (revisar Estado Recurrencia, que la fecha sea anterior a hoy, y que el cron corra a las 00:00) · "¿Cómo detengo el gasto recurrente?" (editar → Pausado) · "¿Puedo adjuntar la factura del proveedor?" (sí, hasta 8 archivos) · "¿Puedo poner monto 0?" (sí).
- **Pendiente de validar en UI:** ❓ aspecto del selector "Router" (la opción "Todos" equivale a sin router).

---

## VEN-023 · Ingresos / Egresos: reporte PDF y Excel
- **Ruta UI / name:** botón **Reporte** → diálogo "Generar reporte" (FE:components/ModalReporteIE.vue).
- **Archivos:** FE: `ModalReporteIE.vue`, `useIngresoEgreso.js:238-305` · BE: `ingresos-egresos.controller.ts:64-91`, `ingresos-egresos.service.ts:491-599, 680-1059`, `pdf-plantillas/ingresos-egresos.hbs`.
- **Acceso:** permiso `reporte.ingresos_egresos`.
- **Opciones del diálogo (labels exactos):** "Incluir recaudación de servicio de internet" (toggle; "Si lo desactivas, el reporte mostrará solo los ingresos y egresos manuales.") · "Detalle de recaudación": `Resumida (una sola fila con el total)` / `Por forma de pago (una fila por método)` / `Detallada (una fila por cada transacción)` · "Formas de pago" (multi-select, "Todas"; hint "Vacío = todas las formas de pago") · nota "Los demás filtros (rango de fechas, router, proveedor, operador, tipo) se toman de la pantalla actual." · botones **Restablecer**, **PDF**, **Excel**.
- **Reglas de negocio:** `GET /ingresos-egresos/download/pdf|excel` con los filtros de pantalla (tipo, router, proveedor, operador, texto, fechas) + `incluir_recaudacion`, `modo_recaudacion`, `formas_pago`. **No** envía `filtroExacto`. Trae **todos** los registros (limit 0). No super-admin: solo sus datos.
- **Contenido ✅:** título "REPORTE DE INGRESOS Y EGRESOS"; rango; "Tipo / Router / Proveedor / Registros"; filas sintéticas "Internet · Recaudación servicio de internet" (o por forma de pago "Recaudación · {forma}" o una por transacción "{cliente} · Trx {n} · {forma}") y "Ventas · Ventas facturadas (productos)"; filas manuales; columnas **N° · Tipo · Router · Proveedor · Referencia · Monto · Fecha · Operador**; totales **TOTAL INGRESOS · TOTAL COBRADO SERVICIOS (si se incluye) · TOTAL VENTAS (si hay) · TOTAL EGRESOS · BALANCE** donde `BALANCE = ingresos manuales + cobrado + ventas − egresos` (BE:service.ts:797-818, :1048-1055).
- **Detalles técnicos:** PDF A4 horizontal generado con Puppeteer/Chromium (en Linux `/usr/bin/chromium`, `SISTEMA=linux`) y Handlebars; la plantilla carga Bootstrap desde `cdn.jsdelivr.net` (necesita internet en el servidor). Excel: hoja `Ingresos-Egresos`. Archivo descargado: `ingresos-egresos.pdf` / `ingresos-egresos.xlsx`. Tiempo máximo en el front 60 s.
- **Mensajes:** errores: se decodifica el cuerpo de la respuesta y se muestra como warning (`message`); si no, "Error al descargar el reporte".
- **Casos límite:** (1) sin rango de fechas el reporte dice "Todas las fechas" pero cobrado/ventas dependen de fechas y salen en 0 ❓ (`BETWEEN NULL`); (2) el reporte no incluye Forma de pago ni Descripción por registro; (3) la "Forma de pago" solo filtra la recaudación (cobros), no los registros manuales.
- **Preguntas probables:** "El PDF no se descarga" (Chromium/Internet en el servidor, o 60 s) · "El balance no coincide" (mira si incluyó recaudación y ventas) · "¿Puedo sacar solo egresos?" (filtre Tipo: Egresos antes de pulsar Reporte).
- **Pendiente de validar en UI:** ❓ tiempos y comportamiento sin fechas.

---

## VEN-024 · Personas: listado y acciones
- **Ruta UI / name:** `/personas` · `index.personas` · menú **Finanzas → Personas** (FE:layouts/SideBarMenu.vue:32-36; FE:router/routes.ts:122-127).
- **Archivos:** FE: `pages/dashboard/personas/IndexPage.vue`, `composables/usePersona.js` · BE: `customers/customers.controller.ts:223-229, 237-245, 343-351`, `customers.service.ts:1673-1735, 2032-2092, 2817-2850`.
- **Para qué sirve:** registro de clientes **sin servicio de internet** (a quienes se les factura ventas libres). Es la misma tabla `customers`, sin datos de facturación/servicio (`facturaCliente`). ✅
- **Acceso:** permiso `index.personas`; acciones: `crear.persona`, `editar.persona`, `activar.inactivar.personas`, `eliminar.persona` (FE:usuarios/permisos/gestion-finanzas-permisos.json).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Agregar Persona" | Abre el formulario (VEN-025) | `crear.persona` | — | Oculto en móvil (`xs`) |
| (fila, activa) lápiz | Editar | `editar.persona` | — | Solo si la persona está activa |
| (fila, activa) ✕ | Inactivar | `activar.inactivar.personas` | `PATCH /customers/:id {isActive:false, numero_documento}` | Sin confirmación |
| (fila, inactiva) ✓ | Activar | `activar.inactivar.personas` | `PATCH /customers/:id {isActive:true, …}` | Sin confirmación |
| (fila, inactiva) papelera | Eliminar | `eliminar.persona` | `DELETE /customers/:id` | Solo si está **inactiva** |
| "OCULTAR COLUMNAS" · "Buscar..." (debounce 900 ms, servidor) · pantalla completa | — | — | `GET /customers/persons-customer/get?page&limit&filter` | — |

- **Columnas:** **Nombres · Tipo Doc. · Numero de documento · Email · Movil · Dirección · Estado · Acciones**. "Tipo Doc." muestra `CÉDULA` (05), `RUC` (04) y **cualquier otro valor como `PASAPORTE`** (también `07`). Estado: `Activo` / `Inactivo`. Dirección vacía: "—". Vacío: "No se encontró ningun resultado".
- **Estados posibles:** `isActive` true/false.
- **Reglas de negocio (backend):**
  - Listado: clientes sin `facturaCliente` (sin facturación de servicio), activos e inactivos, orden `created_at DESC`; búsqueda `ILIKE` en nombres, documento, celular, email, provincia, cantón, parroquia, dirección (BE:customers.service.ts:1673-1735).
  - Activar/Inactivar: `PATCH /customers/:id` (`update` valida que el documento no esté en otro cliente) (:2032-2052).
  - Eliminar: retira servicios vivos (ninguno en personas), renombra `numero_documento` agregando `-NN` aleatorio y marca `deleted_at`; **no** valida facturas asociadas (:2817-2850).
- **Mensajes (exactos):** "¿Deseas eliminar a la persona {nombres}?" (botones **Eliminar**/**Cancelar**); éxito "Persona Eliminado"; error `message` o "Fallo al eliminar el ticket" (texto copiado de otro módulo); al activar/inactivar error `message` o "Fallo al actualizar".
- **Relaciones con otros módulos:** Ventas (selector de cliente: solo personas **activas**, junto a clientes ISP), Clientes (una persona con servicio deja de aparecer aquí), Facturación electrónica (datos del comprador).
- **Casos límite y advertencias:**
  - En móvil no hay forma de agregar: el botón flotante exige `crear.persona33` (permiso inexistente, pasa solo el super-admin) y además enlaza una variable no definida (`modalAgregarProducto`) (FE:IndexPage.vue:284-296).
  - Eliminar es irreversible desde la UI; el documento queda con sufijo `-NN` (libera el número).
  - Inactivar a una persona la quita del selector de Ventas; sus facturas quedan.
- **Preguntas probables:** "No puedo eliminar una persona" (primero inactivarla; permiso `eliminar.persona`) · "Mi cliente no aparece en Personas" (tiene servicio: está en Clientes) · "¿Diferencia entre persona y cliente?" (persona = sin servicio de internet) · "En el celular no me deja agregar" (limitación de la UI).
- **Pendiente de validar en UI:** ❓ comportamiento al convertir una persona en cliente.

---

## VEN-025 · Personas: formulario Agregar / Editar
- **Ruta UI / name:** diálogo "Agregar Persona" / "Editar Persona" (FE:personas/components/FormPerson.vue).
- **Archivos:** FE: `components/FormPerson.vue`, `composables/usePersona.js:55-77`, `clientes/composables/useCliente.js:311-364` · BE: `customers/dto/create-servicio.dto.ts:20-93` (clase `Cliente`), `customers.service.ts:2054-2078`.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| "Cliente:" (nombres) | texto (MAYÚSCULAS) | Sí | ≥ 2 palabras: "Debes ingresar 2 palabras minimo" | Backend `@Transform` → mayúsculas y `trim` |
| "Tipo de Documento:" | select | Sí | Por país: EC `Cédula`(05) / `RUC`(04) / `Pasaporte`(06); CO `Cédula`/`NIT`/`Pasaporte`; etc. (FE:usePais.js) | Valor guardado `04`/`05`/`06` |
| "Numero de Documento:" | texto | Sí | EC: dígitos; Cédula 10 y RUC 13: "Debes completar {n} digitos"; otros países: alfanumérico hasta 20 | Backend: 5–20 caracteres `[A-Za-z0-9.- ]` ("Debes ingresar un minimo de 5 caracteres"); único: "Ya existe un cliente con este numero de documento: {doc}" |
| "Celular:" | teléfono internacional ("Buscar pais...") | Sí | Formato válido del país | Se normaliza a E.164 (5–100 caracteres) |
| "Email:" | texto | **No** | Si se llena: "Ingresa un email valido" | Backend `@IsEmail` solo si hay valor |
| "Dirección:" | texto autogrow | Sí | "Debes completar este campo" | `varchar(1000)` |
| (Provincia/Cantón/Parroquia/Nivel 4) | selects con búsqueda | No | Etiquetas por país (`nivel1Nombre`…) | Cascada: al cambiar uno se limpian los siguientes |

- **Botones:** "Guardar Cambios" (submit; muestra loading) · ✕ del encabezado.
- **Reglas de negocio:** crear → `POST /customers/create`; editar → `PATCH /customers/{id}` con el resto de campos (sin `created_at`, `updated_at`, `isActive`) (FE:FormPerson.vue:82-89; usePersona.js:62-67). No se envía `company_id` (el DTO no lo declara) ✅.
- **Mensajes:** "Persona agregado exitosamente" / "Persona editado exitosamente" (sic); error `message` o "Fallo al guardar".
- **Casos límite:** la validación de documento por país es de frontend; el backend solo valida longitud/alfanumérico/unicidad. El nombre se fuerza a mayúsculas en backend.
- **Preguntas probables:** "No me deja guardar sin 2 nombres" (regla de ≥2 palabras) · "Dice que el documento ya existe" (hay otro cliente/persona con ese documento) · "¿El email es obligatorio?" (no).
- **Pendiente de validar en UI:** ❓ cómo se rotula la sección de ubicación en cada país.

---

## VEN-026 · Menú ICE (`MenuSetearModoIce`)
- **Ruta UI / name:** componente `components/NuevaFactura/MenuSetearModoIce.vue`; **no se usa en Ventas**. Se incrusta en `clientes/components/modals/ModalNuevaFactura.vue` (líneas 727, 746, 764) y `clientes/components/editar/Servicios/Recurrentes/ModalItems.vue` (638, 657, 675), solo si `PAIS_USA_ICE` (Ecuador).
- **Para qué sirve:** fijar a un ítem de la factura/cargo del cliente su tipo y código de ICE (Impuesto a los Consumos Especiales).
- **Campos:** "Tipo de ICE:" (`No aplica` / `Por porcentaje` (tarifa) / `Por valor fijo` (valor)) · "Código de ICE:" (lista buscable de códigos; error "Debe elegir una opción") · botón "Guardar". En móvil: diálogo inferior "Configurar ICE".
- **Reglas:** si hay Tipo de ICE y no hay código → error; si ambos vacíos → cierra sin cambios; si no, copia `ice` y `tipo_ice` a la fila (`useNuevaFactura().rows`). Seleccionar "No aplica" no borra por sí solo un código previo (FE:MenuSetearModoIce.vue:25-43).
- **Casos límite:** el ICE solo aplica en Ecuador (`PAIS_USA_ICE`). En las ventas libres el ICE viene fijo del producto (VEN-003).
- **Pendiente de validar en UI:** ❓ dónde se carga el catálogo de códigos (`codigosIceOptions`).

---

## Claves de permiso del dominio (resumen)
| Clave | Dónde | Efecto |
|---|---|---|
| `index.facturas_libre` | menú + ruta `/ventas` | Ver listado de Ventas |
| `crear.factura` | ruta `/ventas/add`, botón Agregar Factura | Emitir ventas |
| `anular.factura` | botón ✕ | Anular con nota de crédito (solo AUTORIZADO, no CF) |
| `eliminar.factura` | botón papelera | Eliminar (solo ANULADO/PROFORMA) |
| `imprimir.factura` | botón impresora | Imprimir |
| `reenviar.factura` | botón retweet | Re-emitir al SRI (la etiqueta del catálogo dice "Reenviar comprob.") |
| `index.ingresos_egresos` · `crear.` · `editar.` · `eliminar.` · `reporte.ingresos_egresos` | menú / botones | Ver, crear, editar, eliminar, descargar reporte |
| `index.personas` · `crear.persona` · `editar.persona` · `activar.inactivar.personas` · `eliminar.persona` | menú / botones | CRUD de personas (`crear.persona33` es un typo en el botón móvil) |
| `variables.facturacion` | Ajustes → Facturación (Factus, generar facturas) | Configurar facturación |
| `editar.empresa` | Empresa | Guardar certificado / datos fiscales |
| Sin permiso propio | ver detalle, reenviar comprobantes (modal), exportar Excel, chip SRI | Visibles para todo el que vea el listado |
| Backend | — | Solo `@Auth()` (JWT); no hay `@Roles`/permiso por endpoint en este dominio ✅ |

---

## Hallazgos del dominio

### A. Discrepancias frontend ↔ backend
1. **"Tipo: Todos" ≠ todas.** En Ventas, `TODOS` filtra `NOT IN ('AUTORIZADO','ANULADO')`; `FACTURAS` (valor por defecto) es el que trae todo (BE:invoices.service.ts:180-186; FE:ventas/IndexPage.vue:346-351).
2. **Reintentos automáticos no cubren ventas libres.** El cron de 2 h y el reintento al volver el SRI recorren solo `facturas-pagos` de ayer/hoy sin `iva` en el JSON (BE:facturas-pagos.service.ts:40-60; BE:invoice-queue.processor.ts:420-436).
3. **Estado `PROFORMA` y módulo `proforma` sin uso.** El frontend contempla `PROFORMA`, el backend nunca lo escribe y nadie llama a `/proforma` (VEN-017). Además `ProformaService.create` ignora el DTO en la primera creación (BE:proforma.service.ts:29-33).
4. **Reglas de eliminar/anular solo en el frontend.** `DELETE /invoices/:id` hace `softDelete` sin validar estado; `anularFactura` tampoco valida que la factura esté AUTORIZADA o no sea Consumidor Final (VEN-007/008).
5. **Stock:** la UI valida stock pero ni ventas ni compras lo mueven en el backend (solo "ajustar-stock") (BE:invoices.service.ts; búsqueda en `products/`, `buys/`).
6. **Detalle de venta:** el backend guarda `pvp` en `v_total` y la UI lo trata como total de línea (VEN-009).
7. **Detalle de totales:** `subtotal` guardado ya es neto de descuento y la UI vuelve a restar el descuento en "SUBTOTAL" (VEN-003).
8. **ICE por valor:** la UI no multiplica por cantidad; el flujo de facturas de servicio sí (VEN-003).
9. **Ajustes de motivo de anulación** (`anulacionPedirMotivo`/`anulacionMotivoObligatorio`) aplican solo a pagos/abonos, no a anular ventas (pagos.service.ts:888-1085 vs facturas.service.ts:249-462).
10. **`wa_provider`** del modal "Enviar Comprobantes" no lo usa el backend (VEN-010).
11. **Factus `is_active`** se guarda y se muestra, pero ningún flujo lo consulta (VEN-015).
12. **`requiere_facturacion`** de la empresa no gobierna la emisión de ventas (solo banner/chip y el registro de abonos) (VEN-013).

### B. Validaciones que solo existen en un lado
- **Solo FE:** tope $50 para Consumidor Final; ≥ 3 caracteres en descripción; ≥ 2 palabras en nombres de persona; longitud 10/13 de documento; RUC 13 dígitos terminado en 001; contraseña del `.p12` (node-forge); pertenencia de permisos a botones (backend sin permisos).
- **Solo BE:** documento de persona 5–20 y `[A-Za-z0-9.- ]`; unicidad de documento; `customer_id`/`user_id` UUID en ventas; "motivo de anulación/eliminación obligatorio" en pagos; guarda de comprobante autorizado en `anularPago`/`anularAbono`; secuencial no configurado al emitir.

### C. Código muerto / no enrutado
- `comprobantes-electronicos/plantillas/factura.ts` (plantilla RIDE en HTML con puppeteer): ninguna importación (`.plantilla(` solo se llama dentro del archivo) ✅.
- `GET /invoices/filterInvoice/:id`, `PATCH /invoices/:id`: sin llamadas del frontend. `CE/facturas/getRide/:clave`: solo lo usa el perfil del cliente.
- En `ventas/IndexPage.vue`: rama `factura_servicio`/`vencimiento` (`useVentas.js:158-163`, `IndexPage.vue:548-550`) y `AddVenta` prop `factura_libre`/`route.name==='cliente.edit'`/selector "Tipo Comprobante" (nunca renderizados en la ruta de ventas). Parámetro `:venta_id?` sin uso.
- `useFirmaElectronica.js` pertenece a la firma de **contratos**, no al SRI.
- Validación "supera los $500.00 / forma de pago 01" inalcanzable (AddVenta.vue:139-143).

### D. Rarezas, typos y comportamientos curiosos
- Texto "Agrega una cantidad cantidad al producto…" (repetido). "procesando envio...." con 4 puntos. "Persona agregado/editado exitosamente". "Fallo al eliminar el ticket" al borrar personas. Tooltip "Toggle Fullscreen" en inglés.
- `crear.persona33` (permiso inexistente) + `modalAgregarProducto` indefinido en el botón móvil de Personas.
- `ingresos-egresos` es la única ruta del dominio sin `meta.requiresAuth`.
- `AddVenta`: el ícono ✕ del cliente asigna el texto `'CONSUMIDOR FINAL'` (no UUID) (AddVenta.vue:361-370).
- Estado compartido de módulo (`type`, `rows`, `sucursal_selected` de `useProduct.js`) entre `AddVenta` y `ModalFacturaLibre`.
- La opción "Todos" del selector de estado de Ventas oculta lo autorizado.
- "Buscar..." en Ventas sólo ve número y fecha ❓.
- El botón de reenviar no apaga su spinner; la anulación fallida (SRI caído) no avisa.
- Cada pestaña abierta con el chip SRI en verde dispara `reenviar-comprobantes-no-autorizados` cada 5 min.
- En Factus: el borrado automático de facturas/NC pendientes de la cuenta; el secreto/contraseña viajan en claro del backend al front; `url_publica` guardada pero sin uso visible.

### E. Cosas que el manual actual dice y el código contradice
- `docs/guia/facturas.mdx`: (a) "Descargar Documento para obtener el comprobante" → exporta un Excel de la lista (solo AUTORIZADAS), `archivo.xlsx`; (b) filtro "Sucursal: Sucursales asignadas a su usuario" → solo lo ve SUPER-ADMINISTRADOR; (c) "Los conceptos … salen del catálogo de Productos y Servicios y de Personalizado" → el formulario solo carga `/products`; (d) no explica que **Todos** excluye autorizadas/anuladas ni que **Eliminar** exige estado ANULADO, ni que a Consumidor Final no se le puede anular.
- `docs/guia/ingresos-egresos.mdx`: (a) "**Exacta**: busca una fecha concreta" → es búsqueda de texto exacta; (b) "Recurrente activo" → en pantalla se llama "Estado Recurrencia" y solo aparece al editar; (c) tipos "Ingreso recurrente / Egreso recurrente" no son un selector: son el resultado de elegir una periodicidad; (d) falta que el reporte tiene diálogo con opciones de recaudación y que las tarjetas incluyen "Cobrado Servicios" y "Ventas".
- `docs/guia/estados.mdx` (sección Factura): `AUTORIZADO` = "Cobrada y con comprobante autorizado" → para ventas libres solo significa autorizado por el SRI (no hay cobro asociado); `PENDIENTE` en ventas = sin respuesta del SRI, no "abono parcial".
- `docs/guia/roles-empresa.mdx:100`: "Secuencias … y retenciones" → las retenciones no existen y el formulario no las muestra (VEN-018).
- `docs/guia/facturacion-ajustes.mdx:58-63`: el motivo obligatorio **no** aplica al anular ventas (VEN-007).
- `docs/guia/personas.mdx`: no menciona que en móvil no se puede agregar, que para eliminar hay que inactivar antes, ni la limitación del documento por país.

### F. Dudas que solo se resuelven con la UI/microservicio real
1. Catálogo completo de estados del microservicio (`EN PROCESAMIENTO`, etc.) y sus mensajes. *Cierre:* no legible desde el ZIP (el microservicio no se incluye); VEN-005 lista lo que ISPMAX escribe, compara y muestra.
2. ~~Estado/mensaje visible cuando el microservicio no responde (¿queda PENDIENTE?)~~ *Cierre:* resuelto por lectura: queda `PENDIENTE` con `respuestaSRI` vacío (VEN-004, "Falla sin rastro").
3. Si "Buscar..." de Ventas filtra algo más que número y fecha.
4. Si el drill-down desde Ingresos/Egresos aplica realmente el estado y las fechas.
5. Impresión térmica de ventas libres.
6. Visibilidad del selector "Canal de WhatsApp" y si algo lo respeta.
7. Dónde se edita el `iva` de empresa y qué efecto tiene en emisión.
8. Qué ve un usuario sin permiso al abrir `/ingresos-egresos` por URL.

### G. Cierre de lectura (VEN-004, VEN-005, VEN-020)
- **Cierre:** los fallos anteriores al `POST` de emisión (secuencia sin configurar, cliente inexistente, sucursal sin empresa, `descripcion` nula) no dejan **ningún** rastro: `enviarFactura` no relanza y `generateInvoice` solo registra si lanza (BE:invoice-queue.processor.ts:60-74, 413-414). `docs/problemas/facturacion/la-factura-electronica-no-se-autoriza.mdx` ("Secuencial sin configurar … solo queda en el servidor") dice que queda en el servidor: en el código ni siquiera hay log.
- **Cierre:** `@OnQueueFailed` (aviso a Slack) nunca recibe errores de emisión, porque `generateInvoice` no falla (BE:invoice-queue.processor.ts:1163-1170). La narrativa de "Slack si el job falla" de la lectura anterior no se aplica a la emisión.
- **Cierre:** `secuencia_factura_produccion` es `NOT NULL` y sin defecto; solo `secuencia_factura_pruebas` (y las de nota de crédito) pueden estar en NULL (BE:sucursal/entities/sucursal.entity.ts:49-59). El error "no tiene configurada la secuencia" es, en la práctica, de ambiente PRUEBA.
- **Cierre:** estados `ERROR ENVIO RECEPCION`, `…AUTORIZACION`, `…- ANULACION` y `ANULACION - DEVUELTA` solo existen en FE:registrar-pago/components/AccionesPago.vue:211-219; el backend no los escribe.
- **Cierre:** `pagos.estadoSRI = 'AUTORIZADO'` (nivel factura) lo escribe el job de emisión y lo pisa el recálculo de `FacturasPagosService.actualizarMiembro` en la misma operación (BE:invoice-queue.processor.ts:319-327; facturas-pagos.service.ts:263-278). `docs/guia/estados.mdx` (sección Factura) presenta `AUTORIZADO` como un estado de la factura ("Cobrada y con comprobante electrónico autorizado"); en una instancia con datos nuevos el comprobante autorizado se ve en el **abono**, y la factura figura `PAGADO` ❓ (confirmar en UI).
- **Cierre:** al anular un abono, la factura vuelve a `PENDIENTE` solo si queda un abono `AUTORIZADO` o `PAGADO`; un abono `VALIDADA` (Colombia) o con comprobante `DEVUELTA`/`NO AUTORIZADO` no cuenta y la factura queda `NO PAGADO` (BE:pagos.service.ts:1151-1152).
- **Cierre:** reactivar una factura anulada la deja `PENDIENTE` si su arreglo `pagos` tiene cualquier elemento, aunque todos estén anulados (BE:pagos.service.ts:919).
- **Cierre:** el motivo de anulación/eliminación exige ≥ 3 caracteres en la FE (FE:src/composables/useAnularMotivo.js) y solo "no vacío" en el backend (BE:pagos.service.ts:900, 975, 1087, 1300).

<!-- FIN-ARCHIVO -->
