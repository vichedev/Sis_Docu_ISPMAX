# Inventario ALM — Almacén (proveedores, compras, productos y servicios, categorías, equipos, accesorios, materiales)

> Alcance: FE `src/pages/dashboard/{proveedores,compras,productos,categories,equipos}/**`, `src/components/{DetalleProducts,SelectProduct,DragAndDropUploadImage}.vue`, `src/composables/useProduct.js` · BE `src/{buys,products,categories,providers,equipos,materiales}` (+ lecturas de apoyo en `instalaciones`, `ticket/materiales`, `customers`, `sucursal`, `logs` solo para el efecto sobre inventario). Generado desde el ZIP del 2026-10-06.

**Notación de citas.** `FE:` = `src/` del frontend; `BE:` = `src/` del backend. Para abreviar, toda ruta FE que empieza por `pages/dashboard/` se escribe sin ese prefijo (p. ej. `FE:equipos/IndexPage.vue:309` = `FE:pages/dashboard/equipos/IndexPage.vue:309`); `components/` y `composables/` se citan completos. Marca ✅ = leído en código. Nada está verificado en UI (no hay instancia): todo lo dudoso va en "Pendiente de validar en UI" con ❓.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| ALM-001 | Modelo del almacén: producto vs servicio vs equipo vs accesorio vs material; stock, precios e IVA; matriz de qué mueve stock | (transversal) Menú Almacén | — | completo |
| ALM-002 | Productos y Servicios: listado, filtros, columnas, activar/inactivar, eliminar | `/productos` · `index.productos` | `index.productos`, `activar.inactivar.productos`, `editar.productos`, `eliminar.productos`, `crear.productos` | completo |
| ALM-003 | Productos y Servicios: alta/edición (formulario) | diálogo "Agregar/Editar Producto/Servicio" | `crear.productos`, `editar.productos` | completo |
| ALM-004 | Productos: Ajustar stock (con motivo y log) | diálogo "Ajustar stock" | `ajustar.stock` | completo |
| ALM-005 | Productos: importar/plantilla/exportar Excel | botón Excel de `/productos` | (sin permiso propio) | completo |
| ALM-006 | Compras: listado, filtros, detalle, anular, exportar Excel | `/compras/:fecha?` · `index.compras` | `index.compras`, `anular.compra`, `crear.compra` | completo |
| ALM-007 | Compras: registrar compra | `/compras/add` · `crear.compra` | `crear.compra` | completo |
| ALM-008 | Equipos: listado, filtros y acciones por fila | `/equipos` · `index.equipos` (tabla "Equipos") | `index.equipos`, `crear.equipo`, `editar.equipo`, `eliminar.equipo`, `vincular.equipo`, `ver.equipo` | completo |
| ALM-009 | Equipos: alta/edición (formulario) | diálogo "Agregar/Editar Equipo" | `crear.equipo`, `editar.equipo` | completo |
| ALM-010 | Equipos: vincular / desvincular a servicio de cliente (comodato o venta) | diálogo "Vincular equipo a servicio" | `vincular.equipo` | completo |
| ALM-011 | Equipos: historial e "instalación asignada" | diálogos "Historial del Equipo" e "Instalación Asignada" | `ver.equipo` (historial); ninguno (instalación) | completo |
| ALM-012 | Equipos: plantilla, exportar e importar Excel | menú Excel de la tabla "Equipos" | (sin permiso propio) | completo |
| ALM-013 | Accesorios: listado, alta/edición, eliminar | `/equipos` (tabla "Accesorios") | `crear.accesorio`, `editar.accesorio`, `eliminar.accesorio` | completo |
| ALM-014 | Accesorios: historial de uso | diálogo "Historial del Accesorio" | (sin permiso propio) | completo |
| ALM-015 | Accesorios: plantilla, exportar e importar Excel | menú Excel de la tabla "Accesorios" | (sin permiso propio) | completo |
| ALM-016 | Materiales en instalaciones y soportes: reserva de equipos y consumo de accesorios (backend `MaterialesService`) | pestañas Materiales en Instalaciones y Tickets | `tickets.edit` (ticket); sin permiso propio en la pestaña de instalaciones | completo |
| ALM-017 | Proveedores: listado, activar/inactivar, eliminar | `/proveedores` · `index.proveedores` | `index.proveedores`, `editar.proveedor`, `activar.proveedor`, `inactivar.proveedor`, `eliminar.proveedor`, `crear.proveedor` | completo |
| ALM-018 | Proveedores: alta/edición (formulario) | diálogo "Nuevo/Editar Proveedor" | `crear.proveedor`, `editar.proveedor` | completo |
| ALM-019 | Categorías: listado, alta/edición, eliminar | `/categories` · `index.categories` | `index.category`, `crear.category`, `editar.category`, `eliminar.category` | completo |
| ALM-020 | Componentes compartidos: `DetalleProducts`, `SelectProduct`, `DragAndDropUploadImage`, `useProduct` | (transversal: Compras, Ventas, otros) | — | completo |
| ALM-021 | Catálogo y comprobación de permisos del dominio Almacén | Roles y permisos · menú · guardia de rutas | todas las claves anteriores | completo |

---

## ALM-001 · Modelo del almacén (productos vs servicios vs equipos vs accesorios vs materiales)

- **Ruta UI / name:** menú lateral **Almacén** (icono `inventory_2`) con 5 entradas: "Proveedores", "Compras", "Productos y Servicios", "Categorías", "Equipos" (FE:layouts/SideBarMenu.vue:338-417). El grupo se muestra si el rol tiene alguno de `index.proveedores`, `index.compras`, `index.productos`, `index.category`, `index.equipos` ✅. Los **Accesorios no tienen entrada propia**: viven en la misma pantalla "Equipos" (segunda tabla).
- **Archivos:** FE: `layouts/SideBarMenu.vue`, `router/routes.ts:21-25,45-55,117-121,447-457` · BE: `products/`, `buys/`, `providers/`, `categories/`, `equipos/`, `materiales/`.
- **Para qué sirve:** explicar qué es cada "cosa" del almacén y cómo se relacionan. Hay **tres inventarios independientes sin llave foránea entre sí**: (1) catálogo de Productos/Servicios (`products`), (2) equipos serializados (`equipos`) y (3) accesorios consumibles (`accesorios`); la **Categoría** clasifica (2) y (3) pero **no** a (1).
- **Acceso:** permisos por pantalla (ver ALM-021). SUPER-ADMINISTRADOR pasa todo `validarPermisos` (FE:composables/useRolPermisos.js:14-17) ✅.

### Qué es cada cosa

| Concepto (texto de la UI) | Tabla | Qué es | Cantidad / stock | Cómo se factura | Dónde se gestiona |
|---|---|---|---|---|---|
| **Producto** (tipo `Producto`) | `products` | Artículo de catálogo con código, PVP, IVA, ICE, descuento | `stock` entero; **solo cambia por "Ajustar stock"** o por edición directa vía API (ver matriz) ✅ | Sí: se elige como ítem en Ventas (facturas libres), cargos/ítems recurrentes y Compras | Almacén › Productos y Servicios |
| **Servicio** (tipo `Servicio` del mismo catálogo) | `products` (campo `tipo = 'Servicio'`) | Concepto cobrable puntual (mano de obra, etc.), **no** es el plan de internet ni "servicio del cliente" | Sin stock: la UI muestra "No aplica" y el backend rechaza ajustarlo | Igual que un producto; en validaciones de stock se omite si es Servicio | Almacén › Productos y Servicios |
| **Equipo** | `equipos` | Unidad física con `nro_serie` y `nro_mac` (ONU, router, antena…) | No tiene cantidad; tiene **estado** (3 valores) y vinculación (comodato/venta) | No se factura como producto: al **vender** se crea un cargo recurrente con el equipo como ítem | Almacén › Equipos (tabla "Equipos") |
| **Accesorio** | `accesorios` | Consumible por cantidad (cable, conectores, tensores) | `cantidad` entera; unidad (unidades/metro) la define la **categoría** | No se factura; se consume en instalaciones/soportes | Almacén › Equipos (tabla "Accesorios") |
| **Material** | sin entidad propia: tabla `instalacion_equipos` + `MaterialesService` | Lo que se **carga a una visita**: equipos (`tipo='producto'`) y accesorios (`tipo='accesorio'`), colgados de una instalación **o** de un ticket | Mueve stock de accesorios y reserva equipos | — | Instalaciones / Tickets (pestaña Materiales) |
| **Categoría** | `categories` | `categoria` (`accesorio`/`producto`) + `nombre` + `unidad_medida` (`unidades`/`metro`) + `descripcion` | Muestra "Disponibles" (calculado) | — | Almacén › Categorías |
| **Proveedor** | `providers` | Empresa/persona; se usa en Compras, como origen opcional de Equipos y en Ingresos/Egresos | — | — | Almacén › Proveedores |
| **Compra** | `buys` + `BuyToProduct` | Documento de compra con líneas de producto | **No mueve stock** | — | Almacén › Compras |

> **Ojo con la palabra "producto".** En Categorías, `categoria = 'producto'` significa "categoría **de equipos**" (la UI lo rotula "Producto" en columna Tipo y en el desplegable) ✅ FE:categories/IndexPage.vue:15, FE:categories/composables/useCategories.js:33-36. En Instalaciones/Tickets, `tipo = 'producto'` significa **equipo** ✅ BE:instalaciones/entities/instalacion-equipo.entity.ts:22-25. Ninguno de los dos tiene relación con el catálogo `products` ("Productos y Servicios").
> **Estados.** Un equipo solo tiene 3 estados (`disponible`, `no_disponible`, `pendiente_asignacion`) ✅ BE:equipos/enums/equipo.enum.ts:1-5. **No existen** estados "dañado", "en reparación", "en bodega", "retirado", "instalado" ni "asignado a técnico": no hay asignación a técnico en este módulo.

### Matriz: qué evento mueve qué inventario

| Evento | Producto (`products.stock`) | Accesorio (`accesorios.cantidad`) | Equipo (`equipos.estado`) | Cita |
|---|---|---|---|---|
| Crear producto desde el formulario | `stock = 0` fijo (el campo no está en el formulario) | — | — | FE:productos/composables/useProducts.js:12 ✅ |
| **Registrar una compra** | **No cambia** | — | — | BE:buys/buys.service.ts:24-52 ✅ |
| **Anular una compra** | **No cambia** (solo `isActive=false`) | — | — | BE:buys/buys.service.ts:218-222 ✅ |
| **Vender** (factura libre / venta) | **No se descuenta**: el backend no escribe `products.stock` en ninguna venta; solo el navegador valida contra el stock leído | — | — | BE:invoices/invoices.service.ts:33-125 (sin escritura a `products`) ✅; FE:ventas/AddVenta.vue:161-164 |
| Ajustar stock (Productos) | Fija el valor nuevo, motivo obligatorio, log `AJUSTE_STOCK` | — | — | BE:products/products.service.ts:168-216 ✅ |
| Editar producto por API (PATCH) | Puede pisar `stock` (el DTO lo admite) | — | — | BE:products/dto/create-product.dto.ts:39-41 ✅ |
| Editar accesorio (formulario "Cantidad (Stock)") | — | Reemplaza `cantidad` **sin motivo ni log** | — | BE:equipos/equipos.service.ts:222-232 ✅ |
| Importar accesorios (Excel) | — | Crea con "Stock Inicial"; no suma a existentes (los rechaza) | — | BE:equipos/equipos-excel.service.ts:765-799 ✅ |
| Agregar accesorio a instalación/ticket | — | **Resta** de forma atómica; si no alcanza → error | — | BE:materiales/materiales.service.ts:108-113,219-238 ✅ |
| Cambiar cantidad/accesorio de una asignación | — | Devuelve/descuenta la diferencia en una transacción | — | BE:materiales/materiales.service.ts:142-178 ✅ |
| Quitar una asignación de accesorio | — | **Devuelve** la cantidad | — | BE:materiales/materiales.service.ts:199-203 ✅ |
| Agregar equipo a instalación/ticket | — | — | → `pendiente_asignacion` (reserva); en un **ticket con servicio** además queda vinculado y `no_disponible` | BE:materiales/materiales.service.ts:101-106,264-275; BE:ticket/materiales/tickets-materiales.service.ts:61-63,91-117 ✅ |
| Finalizar instalación (crear el servicio del cliente) | — | Sin cambio (ya se descontó al asignar) | Equipos con condición **venta** → `no_disponible`, vinculado, `tipo_vinculacion='venta'`, `costo=precio_venta` + cargo recurrente. Condición **comodato**: **sin cambio** | BE:customers/customers.service.ts:402-417,990-1076 ✅ |
| Cancelar o eliminar una instalación / eliminar un ticket | — | **No devuelve** stock | **No libera** equipos reservados | BE:instalaciones/instalaciones.service.ts:702-709,832-845; BE:ticket/ticket.service.ts:882-907 ✅ |
| Retirar/eliminar el servicio o cliente al que está vinculado un equipo | — | — | **Sin lógica**: el equipo queda `no_disponible` y vinculado | BE:customers/customers.service.ts (sin referencia a `equipo` fuera de 726-1076) ✅ |

### Precios e IVA por entidad

| Entidad | Campos de precio | IVA / impuestos | Cita |
|---|---|---|---|
| Producto | `precio_compra` y `pvp` decimal(8,2); `descuento` **int** (el formulario lo rotula "Descuento($)", la plantilla Excel "Descuento(%)") | `impuesto` int (opciones por país; Ecuador `0%, 12%, 14%, 15%`); `aplicaIva` booleano heredado (el formulario **no** lo expone); ICE solo Ecuador (`ice` = `tarifa`/`valor`, `valor_ice`, `tipo_ice` código) | BE:products/entities/product.entity.ts:22-59; FE:composables/usePais.js (IVA_OPCIONES, PAIS_USA_ICE) ✅ |
| Equipo | `costo` decimal(10,2) = en la UI "Precio de Venta o Alquiler" (columna "P. Venta / Alquiler"); al vender se **sobrescribe** con el precio de venta | `impuesto` int con opciones `0%` o la tarifa estándar (Ecuador `15%`); mensaje "El IVA se considera incluido en el precio ingresado."; sin ICE | BE:equipos/entities/equipo.entity.ts:56-71; FE:equipos/components/FormEquipo.vue:171-191 ✅ |
| Accesorio | `costo_unitario` decimal(10,2) | sin impuesto | BE:equipos/entities/accesorio.entity.ts ✅ |
| Compra | `subtotal`, `descuento`, `iva`, `total` decimal(8,2), calculados **en el navegador**; el backend no los recalcula | IVA por línea según `impuesto` del producto | FE:composables/useProduct.js:83-147 ✅ |

- **Efectos secundarios externos de todo el dominio:** ninguno directo (sin MikroTik, WhatsApp, correo, SRI, colas ni cron dentro de estos módulos). El único efecto indirecto es la **creación de un cargo recurrente** al vender un equipo, que luego factura el motor de facturación (otro dominio) ✅.
- **Registro en logs:** el único evento de inventario auditado es `AJUSTE_STOCK` (entityType `Product`, módulo "Inventario" en Ajustes › Logs) ✅ BE:products/products.service.ts:194-210, FE:ajustes/servicios/components/LogsGenerales.vue:34,87. Crear/editar/eliminar productos, equipos, accesorios, proveedores o compras **no** dejan log ✅ (ninguno de esos servicios inyecta `LogsService`).
- **Casos límite y advertencias:** ver "Hallazgos del dominio".
- **Preguntas probables de usuarios:**
  1. ¿Cuál es la diferencia entre "Productos y Servicios" y "Equipos"?
  2. Registré una compra pero el stock del producto no subió, ¿por qué?
  3. Vendí un producto en una factura y el stock sigue igual, ¿es normal?
  4. ¿Cómo corrijo el stock de un producto? ¿Y el de un accesorio?
  5. ¿Qué estados puede tener un equipo? ¿Hay uno de "dañado"?
  6. ¿Qué pasa con el stock si cancelo una instalación a la que le cargué cable y conectores?
  7. ¿Por qué un producto nuevo no me deja venderlo ("No hay stock del articulo …")?
  8. ¿Para qué sirven las categorías y por qué me preguntan "Producto/Accesorio"?
- **Pendiente de validar en UI:** ❓ que la venta realmente no descuente stock (probar vender un producto con stock 5 y volver a mirar el listado); ❓ que Excel/ajuste sea la única vía de subir stock de productos; ❓ comportamiento de equipos tras cancelar una instalación.

---

## ALM-002 · Productos y Servicios — listado

- **Ruta UI / name:** `/productos` · `index.productos` · menú Almacén › "Productos y Servicios" (FE:router/routes.ts:117-121; FE:layouts/SideBarMenu.vue:383-390) ✅.
- **Archivos:** FE: `productos/IndexPage.vue`, `productos/composables/useProducts.js`, `productos/BtnImportacion.vue` · BE: `products/products.controller.ts`, `products/products.service.ts`, `products/entities/product.entity.ts`.
- **Para qué sirve:** catálogo de lo que se puede cargar en una factura o en una compra: artículos con stock (`Producto`) y conceptos sin stock (`Servicio`). No contiene equipos ni accesorios (ver ALM-001).
- **Acceso:** el guardia de rutas exige el permiso `index.productos` (nombre de la ruta); `validarPermisos` deja pasar siempre a SUPER-ADMINISTRADOR (FE:composables/useRolPermisos.js:14-17; FE:router/auth-guard.ts) ✅. El backend solo exige estar autenticado: `@Auth()` no mira permisos (BE:products/products.controller.ts:12; BE:auth/guards/user-role/user-role.guard.ts:7-17) ✅.
- **Secciones / pestañas:** una sola tabla. Solo para SUPER-ADMINISTRADOR aparece en la cabecera el rótulo "Listado de Productos/Servicios" y el selector "Sucursal:" (FE:productos/IndexPage.vue:222-250) ✅.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Agregar Producto | Abre el formulario (ALM-003). En móvil: botón flotante `+` | `crear.productos` | — | FE:productos/IndexPage.vue:253-260, 486-498 |
  | Menú Excel (icono) | Importar / plantilla / exportar (ALM-005) | ninguno | ver ALM-005 | visible para todos los que ven la pantalla |
  | OCULTAR (selector múltiple) | Oculta/muestra columnas; se recuerda por usuario (`visibleColumnsProductos`) | ninguno | — | FE:productos/IndexPage.vue:262-277, 54-59 |
  | Buscar... | Filtra en servidor mientras se escribe (espera 900 ms) | ninguno | `GET /products?page&limit&filter&sucursal` | busca en nombre, código, precio compra, PVP, descuento y tipo (no en stock ni IVA) BE:products/products.service.ts:82-93 |
  | Pantalla completa | Alterna el modo pantalla completa de la tabla | ninguno | — | tooltip "Toggle Fullscreen" / "Exit Fullscreen" |
  | Editar (lápiz) | Abre el formulario con el producto | `editar.productos` | — | solo si el producto está **activo** FE:productos/IndexPage.vue:311-320 |
  | Inactivar (X) | Marca el producto como inactivo | `activar.inactivar.productos` | `PATCH /products/:id` `{isActive:false}` | sin confirmación ni aviso de éxito; el error solo va a consola FE:productos/IndexPage.vue:120-131 |
  | Activar (✓) | Vuelve a activarlo | `activar.inactivar.productos` | `PATCH /products/:id` `{isActive:true}` | solo si está inactivo |
  | Eliminar (papelera) | Diálogo "¿Deseas eliminar el producto/servicio {nombre}?" · botones **Eliminar** / **Cancelar** | `eliminar.productos` | `DELETE /products/:id` | solo visible si el producto está **inactivo**; borrado lógico BE:products/products.service.ts:218-228 |
  | Lápiz junto al número de Stock (tooltip "Ajustar stock") | Abre el diálogo de ajuste (ALM-004) | `ajustar.stock` | — | solo tipo `Producto`; los `Servicio` muestran "No aplica" FE:productos/IndexPage.vue:367-391 |

- **Campos de formulario:** ver ALM-003 (alta/edición) y ALM-004 (ajuste).
- **Filtros y columnas de tabla:**
  - Columnas (rótulos exactos): `acciones`, "Cod. de Barra", "Producto/Servicio", "Stock", "Descuento", "IVA" (muestra `{impuesto}%`), "ICE" (símbolo de moneda + valor, o `%`, o "No Aplica"), "Precio Compra", "PVP", "Estado" (insignia **Activo** / **Inactivo**) FE:productos/IndexPage.vue:16-52 ✅.
  - Filas por página: 10, 15, 20 y 0 (todas). Orden fijo por fecha de creación descendente BE:products/products.service.ts:101-103 ✅.
  - Selector "Sucursal:" (solo SUPER-ADMINISTRADOR; opciones `TODOS` + sucursales del usuario): **el backend ignora el parámetro `sucursal`** (`FilterProductsDto` solo hereda page/limit/filter y `ValidationPipe whitelist:true` lo descarta) → el listado siempre trae todas las sucursales ✅ BE:products/dto/filter-products.dto.ts; BE:main.ts:38-47; BE:products/products.service.ts:72-116.
- **Estados posibles:** `isActive` verdadero/falso → "Activo"/"Inactivo". El producto inactivo **no** se oculta en el listado ni, a juzgar por el código, en los selectores de Ventas/Compras/cargos (no hay filtro `isActive` en ninguno) ✅ FE:composables/useProduct.js:186-205; FE:clientes/components/modals/AddProductService.vue:60-85.
- **Reglas de negocio (backend):**
  - El listado no filtra por sucursal, empresa ni estado; hace `INNER JOIN` con sucursal (un producto sin sucursal no aparecería) BE:products/products.service.ts:78-80 ✅.
  - `limit = 0` devuelve todos los registros BE:products/products.service.ts:97-99 ✅.
  - Eliminar = `softDelete` (columna `deleted_at`); no verifica si el producto está en compras, facturas o cargos recurrentes ✅ BE:products/products.service.ts:218-228.
  - `update`/`remove` llaman a `findOne`, que devuelve un arreglo (nunca "vacío" para el `if (!product)`) → un id inexistente no da 404, devuelve éxito ✅ BE:products/products.service.ts:118-149,151-166.
  - Una sucursal con productos no se puede eliminar: "No se puede eliminar la sucursal porque tiene … producto(s) asociado(s). Desactívela en lugar de eliminarla." ✅ BE:sucursal/sucursal.service.ts:120-143.
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** éxito al eliminar "Producto/Servicio Eliminado"; error = `message` del backend o, por defecto, "Fallo al eliminar el ticket" (texto copiado de otro módulo) FE:productos/IndexPage.vue:143-145 ✅; tabla vacía: "No se encontró ningun resultado".
- **Relaciones con otros módulos:** Ventas (facturas libres) y cargos recurrentes del cliente leen este catálogo con `GET /products` (`limit=100000`) y validan stock en el navegador (FE:composables/useProduct.js:186-205; FE:clientes/components/modals/ModalFacturaLibre.vue:90-93); Compras (ALM-007); Sucursales (bloquea eliminación); Logs (módulo "Inventario").
- **Casos límite y advertencias:** (a) inactivar no impide que el producto aparezca en ventas ❓; (b) un producto nuevo nace con stock 0 y, siendo `Producto`, **no se puede agregar a una venta** hasta ajustar el stock ("No hay stock del articulo X") FE:composables/useProduct.js:36-37; (c) la columna "Descuento" muestra el número sin unidad (el formulario lo llama "Descuento($)", la plantilla Excel "Descuento(%)").
- **Preguntas probables de usuarios:**
  1. ¿Por qué no puedo eliminar un producto? (solo se elimina si está inactivo).
  2. ¿Cómo desactivo un producto sin borrarlo?
  3. ¿Qué diferencia hay entre Producto y Servicio?
  4. ¿Por qué un servicio no tiene stock?
  5. No encuentro mi producto, ¿por qué la búsqueda no halla por stock o por IVA?
  6. ¿Cómo oculto columnas que no uso?
  7. Veo productos de otra sucursal, ¿es correcto?
  8. ¿Puedo recuperar un producto eliminado? (no hay pantalla de recuperación: es borrado lógico en base de datos).
- **Pendiente de validar en UI:** ❓ efecto real del selector "Sucursal:" (el código indica que no filtra); ❓ que el producto inactivo siga saliendo en Ventas/Compras; ❓ qué ven los roles que no son SUPER-ADMINISTRADOR en la cabecera (no hay título); ❓ si el rótulo del selector de columnas ("OCULTAR ") se ve bien.

---

## ALM-003 · Productos y Servicios — alta y edición

- **Ruta UI / name:** diálogo modal "Agregar Producto/Servicio" / "Editar Producto/Servicio" abierto desde `/productos` (FE:productos/components/FormProduct.vue:61).
- **Archivos:** FE: `productos/components/FormProduct.vue`, `productos/composables/useProducts.js`, `composables/usePais.js` · BE: `products/dto/create-product.dto.ts`, `products/products.service.ts:30-37,151-166`.
- **Para qué sirve:** crear o modificar un artículo del catálogo.
- **Acceso:** `crear.productos` (botón) / `editar.productos` (lápiz). Backend sin permisos.
- **Secciones / pestañas:** formulario único; al cerrar el diálogo se recarga el listado (`@hide` → `refresh`) FE:productos/components/FormProduct.vue:50-54 ✅.
- **Botones y acciones:** "Guardar Cambios" (envía `POST /products` en alta o `PATCH /products/:id` en edición) · cerrar (X).
- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Codigo / Serial: | texto con contador | Sí (FE "Debes completar este campo") | FE `maxlength=25`; BE `IsString`+`IsNotEmpty`; **columna `varchar(20)`** | desajuste 25 vs 20 → un código de 21–25 caracteres falla en base de datos (500 "Unexpected error, check server logs") BE:products/entities/product.entity.ts:22-23 ✅ |
  | Nombre: | texto con contador (300) | Sí | BE `MinLength(5)` (el FE no lo valida: llega como 400 "nombre must be longer than or equal to 5 characters") | columna `varchar(300)` |
  | Precio de Compra: | número | No (vacío → 0) | FE: ≥ 0 con 2 decimales ("Solo se permiten 2 decimales", "El valor debe ser mayor a 0"); BE `IsNumber`, `Min(0)` | decimal(8,2) |
  | PVP: | texto numérico | Sí, **> 0** | "Debes ingresar un valor mayor a cero." (también para Servicio) | decimal(8,2) |
  | Tipo: | select `Producto` / `Servicio` | Sí | BE solo `IsString` (acepta cualquier texto) | `Servicio` ⇒ sin stock en toda la app |
  | Impuesto IVA: | select (Ecuador `0%`, `12%`, `14%`, `15%`; otros países su lista) | Sí | BE `IsNotEmpty` | FE:composables/usePais.js (IVA_OPCIONES) |
  | Descuento($): | texto (número en móvil) | No (vacío → 0) | FE regex `^-?\d+(\.\d{0,2})?$` (admite negativos y decimales); BE `Min(0)`; **columna `int`** | un descuento con decimales o negativo termina en error de validación/BD |
  | ICE: (solo Ecuador) | select "No aplica" / "Por porcentaje" / "Por valor fijo" | No | si hay ICE, "Valor Ice" y "Codigo Ice" pasan a ser obligatorios | `PAIS_USA_ICE = PAIS === 'EC'` |
  | Valor Ice: | texto decimal (prefijo $ si valor fijo, sufijo % si porcentaje) | Si hay ICE, > 0 | "Debes ingresar un valor mayor a cero." | |
  | Codigo Ice: | select con búsqueda | Si hay ICE | catálogo `codigosIceOptions` | FE:Gestion-Red/personalizado/composables/usePersonalizado.js:31-95 |
  | Sucursal: | select (sucursales del usuario) | Sí | BE `sucursal_id` `IsString` | la lista puede traer la opción "TODOS" (valor nulo) que no pasa la validación |

  (No existen en el formulario: Stock, Aplica IVA, Activo. `stock` se envía fijo `0` en el alta; `aplicaIva` se envía `false`.) ✅ FE:productos/composables/useProducts.js:4-18.
- **Filtros y columnas de tabla:** n/a.
- **Estados posibles:** `isActive` por defecto `true` (BE:products/entities/product.entity.ts:46-47).
- **Reglas de negocio (backend):**
  - Alta: `repository.create(dto)` + `save`; devuelve el producto completo BE:products/products.service.ts:30-37 ✅.
  - Edición: `repository.update(id, dto)` con DTO parcial; devuelve `{ok:true, msg:"Registro actualizado exitosamente"}` BE:products/products.service.ts:151-166 ✅. El formulario de edición reenvía **todo** el objeto, incluido el `stock` que tenía la tabla al abrir (puede pisar un ajuste hecho entre tanto) ✅ FE:productos/components/FormProduct.vue:32-40; FE:productos/composables/useProducts.js:117-145.
  - No hay unicidad declarada en la entidad para `codigoBarra` ni `nombre` ✅ (la BD puede tener índices propios ❓).
  - `valor_ice`/`tipo_ice` toman 0 por defecto en el DTO; sin ICE el formulario envía `valor_ice=0`, `tipo_ice=0` en la edición BE:products/dto/create-product.dto.ts:52-57.
  - Errores de BD: 23505 → 400 con el `detail` de Postgres; 23503 → 400 `{detail, code:'23503'}`; otros → 500 "Unexpected error, check server logs" BE:products/products.service.ts:230-241 ✅.
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** éxito "Producto agregado exitosamente" / "Producto editado exitosamente"; error (aviso amarillo) = `message` del backend o "Fallo al guardar" FE:productos/composables/useProducts.js:147-151 ✅.
- **Relaciones con otros módulos:** el `impuesto` y el ICE del producto viajan a la factura (FE:composables/useProduct.js:83-147); `tipo` define si se valida stock.
- **Casos límite y advertencias:** `aplicaIva` quedará `false` en todo producto creado por el formulario aunque tenga IVA 15 % (la columna "Aplica IVA" del detalle de compra/venta lo lee) ✅; el campo `descuento` se trata como monto ("Descuento($)") ❓.
- **Preguntas probables de usuarios:**
  1. ¿Dónde pongo el stock inicial de un producto nuevo? (no está en el formulario: usar "Ajustar stock").
  2. ¿Por qué me exige PVP mayor que cero para un servicio gratuito?
  3. ¿Qué es "Codigo / Serial"? ¿Es obligatorio?
  4. ¿Por qué no me aparece el campo ICE? (solo en instancias de Ecuador).
  5. ¿Por qué "Guardar" me dice "Unexpected error" con un código largo?
  6. ¿El descuento es en dólares o en porcentaje?
  7. ¿Puedo tener dos productos con el mismo código?
- **Pendiente de validar en UI:** ❓ si el descuento se aplica como valor ($) o %; ❓ si existe índice único de `codigoBarra`; ❓ longitud real aceptada del código; ❓ comportamiento con la opción "TODOS" en el selector de sucursal.

---

## ALM-004 · Productos — Ajustar stock

- **Ruta UI / name:** diálogo "Ajustar stock" dentro de `/productos` (FE:productos/IndexPage.vue:434-484).
- **Archivos:** FE: `productos/IndexPage.vue:69-105` · BE: `products/products.controller.ts:51-60`, `products/products.service.ts:168-216`.
- **Para qué sirve:** corregir las existencias de un producto indicando el motivo; es la **única vía de la interfaz** para cambiar el stock de un producto.
- **Acceso:** `ajustar.stock` (botón lápiz junto al stock). El permiso **solo aparece en el catálogo del grupo Finanzas**, no en el de Almacén (ver ALM-021). Backend: sin chequeo.
- **Secciones / pestañas:** diálogo con el nombre del producto y "— stock actual: N".
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Guardar | Envía el nuevo stock y el motivo | `ajustar.stock` | `PATCH /products/:id/ajustar-stock` `{stock, motivo}` | recarga la tabla; deja log |
  | Cancelar / X | Cierra | — | — | |

- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Nuevo stock | número (min 0, step 1) | Sí | FE y BE: entero ≥ 0 | valor **absoluto**, no incremento; precargado con el stock actual |
  | Motivo del ajuste * | texto largo | Sí | FE mínimo 3 caracteres; BE solo no vacío | hint: "Quedará registrado en logs (mínimo 3 caracteres)" |

- **Filtros y columnas de tabla:** n/a.
- **Estados posibles:** n/a.
- **Reglas de negocio (backend):** (todas ✅ BE:products/products.service.ts:168-216)
  - 404 `Producto con id {id} no encontrado`.
  - 400 `Los servicios no manejan stock` si `tipo === 'Servicio'`.
  - 400 `El stock debe ser un número entero mayor o igual a 0` (impide stock negativo).
  - 400 `El motivo del ajuste es obligatorio`.
  - Guarda el nuevo valor y crea un log (`entityType: 'Product'`, `action: 'AJUSTE_STOCK'`, descripción `Stock de "{nombre}" ajustado de {anterior} a {nuevo}. Motivo: {motivo}`, usuario, metadata con anterior/actual/motivo). Si el log falla, el ajuste **igual** se guarda (el error solo queda en el log del servidor).
  - Respuesta `{ok:true, msg:'Stock ajustado exitosamente'}`.
- **Efectos secundarios externos:** ninguno (solo log interno, visible en Ajustes › Logs, módulo "Inventario", acción "Ajuste de stock" FE:ajustes/servicios/components/LogsGenerales.vue:34,87).
- **Mensajes de error/éxito (texto exacto):** éxito "Stock ajustado exitosamente"; avisos FE "El stock debe ser un número entero mayor o igual a 0", "Indica un motivo (mínimo 3 caracteres)"; error "Fallo al ajustar el stock" o el mensaje del backend FE:productos/IndexPage.vue:83-105 ✅.
- **Relaciones con otros módulos:** Logs; Ventas (valida contra este stock); Compras (no lo alimenta).
- **Casos límite y advertencias:** dos personas ajustando a la vez: gana el último (no es incremental). No hay forma de "sumar 10": hay que calcular el total. El ajuste de accesorios **no** pasa por aquí (ver ALM-013).
- **Preguntas probables de usuarios:**
  1. ¿Cómo subo el stock cuando llega mercadería?
  2. ¿Por qué me pide un motivo?
  3. ¿Dónde veo quién cambió el stock y cuándo?
  4. ¿Por qué no me deja poner stock a un servicio?
  5. ¿Puedo dejar el stock en negativo? (no).
  6. No veo el lápiz junto al stock, ¿qué permiso me falta? ("Ajustar stock").
- **Pendiente de validar en UI:** ❓ en qué pantalla del editor de roles aparece `ajustar.stock` para marcarlo (el JSON de Almacén no lo trae); ❓ aspecto del log en Ajustes › Logs.

---

## ALM-005 · Productos — importar, plantilla y exportar Excel

- **Ruta UI / name:** botón con icono Excel (color verde azulado) en la barra de `/productos` → menú con 3 opciones (FE:productos/BtnImportacion.vue:44-73).
- **Archivos:** FE: `productos/BtnImportacion.vue`, `productos/components/ModalCargarExcel.vue` · BE: `products/products.service.ts:39-70`, `products/products.controller.ts:31-41`, `static/resource/productos_plantilla.xlsx`.
- **Para qué sirve:** carga masiva de productos y descarga del catálogo.
- **Acceso:** sin `validarPermisos` en ninguna de las 3 opciones (cualquiera que vea la pantalla) ✅.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Importar Excel | Abre el diálogo "Carga masiva de productos" | ninguno | — | ver abajo |
  | Exportar Plantilla | Navega a `/plantillas/productos_plantilla.xlsx` (archivo estático del frontend) | ninguno | — | ❓ ese archivo **no existe** en `public/plantillas/` del ZIP FE (solo `Plantilla_Ejemplo.docx`, `Variables.docx`, `transacciones.xlsx`) FE:productos/BtnImportacion.vue:11-15 |
  | Exportar Productos/Servicios | Descarga `productos_servicios.xlsx` | ninguno | `POST /products/download-products-excel` `{sucursal_id}` | usa la hoja `Hoja1` de la plantilla del servidor |
  | Subir productos (dentro del diálogo) | Crea un producto por fila | ninguno | `POST /products` por fila | ver reglas |

- **Campos de formulario (diálogo "Carga masiva de productos"):**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Subir archivo excel: | archivo `.xls`/`.xlsx` (multiple) | Sí ("Debes completar este campo") | el chequeo del tipo de archivo usa `validaciones.value.isValid` (propiedad inexistente) → nunca se aplica | FE:productos/components/ModalCargarExcel.vue:32-52 ✅ |
  | Elige una sucursal: | select (solo SUPER-ADMINISTRADOR) | Sí | — | tras cargar sucursales, el código reasigna siempre `claim.sucursales[0]` (la condición `!== 'SUPER-ADMINISTRADOR' \|\| !== 'ADMINISTRADOR'` es siempre verdadera) FE:productos/components/ModalCargarExcel.vue:79-80 ✅ |

- **Filtros y columnas de tabla:** columnas de la plantilla del servidor (hoja `Hoja1`, A–H): "Codigo / Serial:", "Nombre:", "Precio de Compra:", "PVP:", "Aplica IVA:", "Descuento(%):", "Tipo:", "Stock:" ✅ (leído del .xlsx). La exportación escribe A=código, B=nombre, C=precio compra, D=pvp, E=`SI`/`NO` (aplicaIva), F=descuento, G=tipo, H=stock; **no exporta IVA (`impuesto`), ICE ni estado** BE:products/products.service.ts:53-64 ✅.
- **Estados posibles:** por fila durante la carga: cargando (spinner), éxito (✓ verde), error (icono rojo con tooltip del mensaje) FE:productos/components/ModalCargarExcel.vue ✅.
- **Reglas de negocio (backend):**
  - La importación corre **en el navegador**: lee la primera hoja con SheetJS, salta la fila 1 y llama a `POST /products` una vez por fila (pausa de 70 ms) con: `aplicaIva` (`SI` ⇒ true), `codigoBarra` (texto), `nombre` (mayúsculas), `precio_compra`, `pvp`, `tipo` (col. 7), `descuento` (col. 6); la columna "Stock:" **no se lee** FE:productos/components/ModalCargarExcel.vue:56-112 ✅.
  - La sucursal elegida solo viaja en la cabecera `sucursal-id`, pero `ProductsController.create` solo lee el cuerpo; el cuerpo **no incluye `sucursal_id` ni `impuesto`**, ambos requeridos por `CreateProductDto` (`sucursal_id` `IsString`, `impuesto` `IsNotEmpty`) ⇒ cada fila debería rechazarse con 400 ❓ BE:products/products.controller.ts:17-22; BE:products/dto/create-product.dto.ts:7-15 ✅.
  - La exportación consulta `products` por `sucursal_id` (si llega nulo, trae todo) BE:products/products.service.ts:39-42 ✅; los errores al generar el archivo solo se escriben en consola y el navegador los ignora (`catch (error) {}`) FE:productos/BtnImportacion.vue:38.
  - La respuesta fija `Content-Disposition: attachment; filename=ejemplo.xlsx`; el navegador guarda como `productos_servicios.xlsx` BE:products/products.controller.ts:37; FE:productos/BtnImportacion.vue:34.
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** por fila, tooltip con `error.response.data.message`; no hay mensaje global de éxito; "Debes subir un archivo excel" (nunca se dispara, ver arriba).
- **Relaciones con otros módulos:** catálogo de Productos (ALM-002).
- **Casos límite y advertencias:** `@actualizarDatos="getArticulos()"` apunta a una función que no existe en `BtnImportacion.vue` (vive en `IndexPage.vue`) y `<ModalCargarExcel>` se usa **sin importar** (el auto-registro de componentes solo mira `src/components` y `src/layouts`) ⇒ ❓ el diálogo "Importar Excel" podría abrirse vacío y la lista no refrescarse FE:productos/BtnImportacion.vue:75-78; FE (raíz del proyecto) quasar.config.js:80-83 ✅.
- **Preguntas probables de usuarios:**
  1. ¿Cómo cargo muchos productos de una vez?
  2. ¿Dónde bajo la plantilla de Excel?
  3. Subí el Excel y todas las filas salen con error, ¿qué pasó?
  4. ¿La columna "Stock" del Excel carga el inventario? (no se lee).
  5. ¿Puedo exportar solo los productos de mi sucursal?
  6. ¿Por qué el Excel exportado no trae el IVA?
- **Pendiente de validar en UI:** ❓ que "Importar Excel" abra el diálogo; ❓ que cada fila falle por `impuesto`/`sucursal_id` faltantes (o que el despliegue real use otra versión del backend que lea la cabecera); ❓ existencia de `productos_plantilla.xlsx` en el despliegue real del frontend.

---

## ALM-006 · Compras — listado, filtros, detalle, anular y exportar

- **Ruta UI / name:** `/compras/:fecha?` · `index.compras` · menú Almacén › "Compras" (FE:router/routes.ts:45-49) ✅. El parámetro opcional `fecha` admite `AAAA-MM-DD - AAAA-MM-DD` y precarga el rango (FE:compras/IndexPage.vue:66-77).
- **Archivos:** FE: `compras/IndexPage.vue`, `components/DetalleProducts.vue` · BE: `buys/buys.controller.ts`, `buys/buys.service.ts`, `buys/entities/buy.entity.ts`, `buys/entities/buyToProduct.entity.ts`.
- **Para qué sirve:** ver las compras registradas, abrir su detalle, anularlas y exportarlas a Excel. Es un **registro de documentos**: no mueve stock ni egresos (ver ALM-001).
- **Acceso:** ruta con `index.compras`; botón "Agregar Compra" con `crear.compra`; botón Anular (X) con `anular.compra` y solo si la compra está "Aceptado" (FE:compras/IndexPage.vue:370,465) ✅. Backend: solo JWT.
- **Secciones / pestañas:** barra superior "Filtrar por fecha:" · tabla con selector "Tipo:" y (SUPER-ADMINISTRADOR) selector "Sucursal:" y rótulo "Listado de Compras" (FE:compras/IndexPage.vue:225-366).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Agregar Compra (móvil: botón `+`) | Va a `/compras/add` | `crear.compra` | — | FE:compras/IndexPage.vue:369-377,486-498 |
  | Filtrar por fecha (placeholder "Todas las fechas", con ✕ para limpiar) | Calendario de rango; botón "Cerrar"; recarga la lista | ninguno | `GET /buys` con cabeceras `desde`/`hasta` | filtra por la fecha de **creación** del registro (no la "Fecha de compra" tipeada) BE:buys/buys.service.ts:56-92 ✅ |
  | Tipo: (Todos / Aceptados / Anulados) | Filtra por estado | ninguno | `GET /buys` cabecera `tipo` = `TODOS`/`Aceptados`/`Anulados` | BE:buys/buys.service.ts:94-96 |
  | Sucursal: (solo SUPER-ADMINISTRADOR; opción `TODOS` + sucursales) | Cambia la sucursal consultada | ninguno | cabecera `sucursal-id` | por defecto arranca en la **primera** sucursal de la empresa, no en TODOS FE:compras/IndexPage.vue:198-215 ✅ |
  | OCULTAR (selector múltiple de columnas) | Oculta columnas (se recuerda: `visibleColumnsCompra`) | ninguno | — | |
  | Excel (icono verde; tooltip "Exportar compras a Excel") | Descarga `compras.xlsx` con los mismos filtros de fecha/tipo/sucursal | ninguno | `GET /buys/export-excel` (cabeceras) | no aplica el texto de "Buscar..." FE:compras/IndexPage.vue:142-173 ✅ |
  | Buscar... | Filtra en el navegador sobre las columnas de la tabla (y relanza la consulta) | ninguno | `GET /buys` | no hay búsqueda en servidor |
  | Ver detalle (ojo) | Abre el diálogo "Detalle de Compra" con los datos de la fila | ninguno | — | no hace otra consulta FE:compras/IndexPage.vue:451-460 |
  | Anular (X) | Diálogo "¿Estas seguro de anular esta compra?" con Num Comprobante, Proveedor, Fecha/Hora y Total; botones **Anular** / **Cancelar** | `anular.compra` | `DELETE /buys/:id` | solo marca `isActive=false` (ver reglas) |

- **Campos de formulario:** filtros descritos arriba; el diálogo de detalle es de solo lectura.
- **Filtros y columnas de tabla:** columnas (rótulos exactos): `acciones`, "Sucursal", "Num Comprobante", "Usuario", "Proveedor", "Fecha Compra", "Total", "Estado" (insignia **Aceptado** / **Anulado**) FE:compras/IndexPage.vue:8-37 ✅. "Fecha Compra" muestra la **fecha de creación** (`created_at`, DD/MM/AAAA): el frontend sobrescribe `fecha_compra` con ella (FE:compras/IndexPage.vue:95-100) ✅, de modo que la fecha que el usuario tipeó al registrar no se ve ni en la lista ni en el detalle.
- **Estados posibles:** `isActive` verdadero = **Aceptado**, falso = **Anulado** (BE:buys/entities/buy.entity.ts:50-51; FE:compras/IndexPage.vue:438-447).
- **Detalle de Compra (diálogo):** "Num. Comprobantes:", "Descripción:", "Sucursal:", "Proveedor", "Usuario:" (en mayúsculas), "Fecha de Compra:", "Estado:"; tabla con columnas "Codigo", "Producto", "Cantidad", "Precio de Venta" (en realidad `v_total / cantidad`), "Descuento", "Aplica IVA" (SI/NO), "Total"; resumen "TOTAL BRUTO:", "DESCUENTOS:", "SUBTOTAL:", "IVA(15%):", "TOTAL DE COMPRA:" (el 15 sale de `IVA_ESTANDAR`) FE:components/DetalleProducts.vue:73-80,92-205,319-359 ✅. El componente se comparte con Ventas.
- **Reglas de negocio (backend):**
  - Listado: filtra por empresa (cabecera `company-id`) y sucursal (cabecera `sucursal-id`); con `sucursal-id` vacío o nulo no filtra por sucursal; ordena por fecha de creación descendente; trae sucursal, proveedor (eager), usuario y líneas con su producto ✅ BE:buys/buys.service.ts:54-102.
  - Fechas: solo `desde` ⇒ ese día; solo `hasta` ⇒ ese día; ambas ⇒ rango hasta las 23:59:59.999 de `hasta` ✅ BE:buys/buys.service.ts:56-71.
  - Cualquier error en el listado se traga con `console.log` y devuelve vacío (el frontend muestra la tabla vacía sin aviso) ✅ BE:buys/buys.service.ts:99-101.
  - **Anular** (`DELETE /buys/:id`): `UPDATE isActive=false`, responde `{ok:true}`; no valida que exista ni que ya esté anulada, **no revierte nada** (no hay nada que revertir en stock) y no deja log ✅ BE:buys/buys.service.ts:218-222.
  - Existen pero **no tienen pantalla**: `PATCH /buys/:id/:estado` (reactivar/anular) y `PATCH /buys/:id` (editar cabecera) ✅ BE:buys/buys.controller.ts:61-75. Una compra anulada no se puede reactivar desde la interfaz.
  - Exportar Excel: hoja "Compras", título "REPORTE DE COMPRAS", subtítulo "{rango o 'Todas las fechas'}   |   Registros: n", columnas "N°", "Sucursal", "Num Comprobante", "Proveedor", "Usuario", "Fecha Compra", "Total", "Estado" y fila final "TOTAL:" que **suma también las anuladas** ✅ BE:buys/buys.service.ts:104-171.
- **Efectos secundarios externos:** ninguno. No genera egresos en Ingresos/Egresos (esa pantalla es independiente) ✅.
- **Mensajes de error/éxito (texto exacto):** éxito "Compra Anulada exitosamente"; al fallar la anulación solo hay `console.log` y la capa "Cargando..." queda visible (no se llama a `loading.hide()` en el `catch`) FE:compras/IndexPage.vue:185-195 ✅; error de exportación "No se pudo exportar el Excel de compras"; error de carga de sucursales = `message` del backend; tabla vacía "No se encontró ningun resultado".
- **Relaciones con otros módulos:** Proveedores (columna Proveedor); Productos (líneas); Usuarios (quién registró); Sucursal (no se puede eliminar una sucursal con compras BE:sucursal/sucursal.service.ts:120-143); Ventas (mismo diálogo de detalle).
- **Casos límite y advertencias:**
  - En el detalle, "SUBTOTAL" = `subtotal − descuento`, pero el `subtotal` guardado por Compras ya viene **neto de descuentos** (el frontend lo calcula así) ⇒ con descuento > 0 el detalle resta el descuento dos veces ❓ FE:components/DetalleProducts.vue:321-337; FE:composables/useProduct.js:83-147.
  - Un proveedor eliminado (borrado lógico) deja la compra con `proveedor_id` nulo en la consulta y `compra.proveedor_id.razon_social` rompe el `map` del frontend ❓ FE:compras/IndexPage.vue:95-100 (sin protección contra nulo).
  - Para roles que no son SUPER-ADMINISTRADOR, `selectSucursal` es la primera sucursal **de toda la empresa** (`/sucursal/find/{empresa}/company`), no necesariamente la del usuario, y no se puede cambiar ❓ FE:compras/IndexPage.vue:198-209; BE:sucursal/sucursal.service.ts:61-92.
- **Preguntas probables de usuarios:**
  1. Anulé una compra, ¿se devolvió el stock? (no: la compra nunca lo había sumado).
  2. ¿Puedo reactivar una compra anulada? (la interfaz no lo permite).
  3. ¿Por qué la "Fecha Compra" no es la que escribí?
  4. ¿Cómo saco el reporte de compras del mes?
  5. ¿Por qué el total del Excel incluye compras anuladas?
  6. ¿Puedo editar una compra ya guardada? (no hay pantalla).
  7. No veo el botón de anular, ¿qué permiso necesito? ("Compras → Anular").
  8. ¿Por qué solo veo las compras de una sucursal?
- **Pendiente de validar en UI:** ❓ valor mostrado en "Fecha Compra" y en el detalle; ❓ doble resta del descuento en el detalle; ❓ comportamiento de "TODOS" para SUPER-ADMINISTRADOR (la cabecera con valor nulo); ❓ comportamiento con proveedor eliminado; ❓ qué sucursal ve un administrador no SUPER.

---

## ALM-007 · Compras — registrar compra

- **Ruta UI / name:** `/compras/add` · `crear.compra` · botón "Agregar Compra" (FE:router/routes.ts:50-55) ✅; migas "Inicio" › "Compras" › "Agregar Compra"; título "Nueva Compra".
- **Archivos:** FE: `compras/AddCompra.vue`, `composables/useProduct.js` · BE: `buys/buys.controller.ts:20-26`, `buys/buys.service.ts:24-52`, `buys/dto/create-buy.dto.ts`.
- **Para qué sirve:** registrar el documento de una compra a un proveedor con sus líneas de productos. **No suma stock** ni crea egreso.
- **Acceso:** `crear.compra`. **Efectivamente solo SUPER-ADMINISTRADOR puede completar el formulario**: el selector de productos está bajo `v-if="['SUPER-ADMINISTRADOR'].includes(claim.roles[0])"` (FE:compras/AddCompra.vue:266-267) y la lista de productos solo se carga al elegir sucursal, selector también exclusivo de SUPER-ADMINISTRADOR (FE:compras/AddCompra.vue:218-226) ✅.
- **Secciones / pestañas:** cabecera (proveedor, comprobante, fecha, sucursal, descripción, buscador de producto) · tabla de líneas · panel de totales · botones.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Guardar | Valida y pide confirmación "¿Deseas agregar esta compra?" (**Agregar** / **Cancelar**) | `crear.compra` | `POST /buys` (cabecera `sucursal-id`) | tras éxito va a `/compras` |
  | Regresar (solo ≥ 600 px) | Vuelve a `/compras` | — | — | |
  | Quitar (X roja en cada línea) | Saca el producto de la tabla | — | — | |

- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Seleccionar Proveedor: | select con búsqueda (razón social o nº documento) | Sí — "Debes elegir algun proveedor" | solo proveedores **activos** (`GET /providers/true`) | FE:compras/AddCompra.vue:37-55 |
  | Numero de Comprobante: | texto | Sí — "Por favor ingresa el numero de comprobante" | BE `MinLength(5)`; columna `varchar(50)` | sin tope en el FE: > 50 caracteres ⇒ error 500 |
  | Fecha de compra: | fecha con calendario (botón "Close") | — | por defecto hoy; se envía como `DD/MM/AAAA` (texto) | |
  | Seleccionar Sucursal: | select (solo SUPER-ADMINISTRADOR) | efectivo sí | al cambiarla vacía las líneas y recarga productos | |
  | Descripción: | texto | Sí — "Por favor ingresa una descripción" | BE `MinLength(5)`; columna `varchar(50)` | |
  | Filtrar por codigo de barra o nombre del producto: | select con búsqueda | Sí (al menos una línea) — "Debes agregar algun producto.." | excluye `Servicio`; repetir producto ⇒ "Ya fue agregado este producto/servicio" | solo SUPER-ADMINISTRADOR; trae productos de **todas** las sucursales (el backend ignora la cabecera) |
  | Cantidad (por línea) | número | > 0 — "Agrega una cantidad cantidad al producto: {nombre} de la fila: {n}" | | el valor total de la línea = cantidad × `precio_compra` truncado a 2 decimales |
  | Descuento($) (por línea) | número | No | `min=0` | |
  | Precio de compra (por línea) | número | No | **está enlazado a `pvp`**, no a `precio_compra` | su cambio recalcula `v_total = cantidad × pvp` ❓ FE:compras/AddCompra.vue:125,363,373-385 |

- **Filtros y columnas de tabla:** columnas "Quitar", "Codigo Barra", "Producto", "Cantidad", "IVA" (`{impuesto}%` del producto), "Descuento($)", "ICE", "Precio de compra", "Valor Total"; totales "SUBTOTAL:", "DESCUENTOS:", "IVA(15%):", "ICE:", "TOTAL DE COMPRA:" calculados en el navegador FE:compras/AddCompra.vue:408-445 ✅.
- **Estados posibles:** la compra nace `isActive = true` (Aceptado) BE:buys/entities/buy.entity.ts:50-51.
- **Reglas de negocio (backend):**
  - DTO: `proveedor_id` y `user_id` UUID; `products` arreglo no vacío; `numero_comprobante` y `descripcion` ≥ 5 caracteres; `subtotal`, `descuento`, `iva`, `total` numéricos; `fecha_compra` texto ✅ BE:buys/dto/create-buy.dto.ts:8-41.
  - `user_id` lo manda el navegador (`claim.id`); la sucursal sale de la cabecera `sucursal-id` ✅ BE:buys/buys.controller.ts:20-26; FE:compras/AddCompra.vue:82-87.
  - Se guarda la cabecera y **después** las líneas (`BuyToProduct`: cantidad, v_total, descuento, `iva` = `aplicaIva` del producto) con `save(pivot)` **sin `await`** y sin transacción: si fallan, la respuesta ya fue "éxito" y la compra queda sin líneas ✅ BE:buys/buys.service.ts:33-48.
  - No actualiza `products.stock`, no crea egreso, no deja log ✅.
  - Errores: 23505 → 400 con detalle; otros → 500 "Unexpected error, check server logs" BE:buys/buys.service.ts:224-230 ✅.
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** éxito "Compra realizada exitosamente"; avisos listados arriba; error = `error.response.data.message` (aviso amarillo) FE:compras/AddCompra.vue:57-111 ✅. Hay además un aviso "Debes seleccionar una sucursal" que solo se evalúa para `claim.roles[0] == 'ADMINISTRADOR'` (rol sin selector de sucursal) ⇒ inalcanzable de cumplir FE:compras/AddCompra.vue:65-67 ✅.
- **Relaciones con otros módulos:** Proveedores (ALM-017/018; `AddProveedor` está importado pero **ningún botón abre** `modalAgregarProveedor`); Productos (líneas); `useProduct` compartido con Ventas (`columns` es un arreglo compartido y AddCompra reescribe `columns[7]` a "Precio de compra" sin restaurarlo) FE:compras/AddCompra.vue:125 ✅.
- **Casos límite y advertencias:** sin selector de productos para roles no SUPER; sin límites de longitud en comprobante/descripción; descuento y precio con semántica ambigua; la fecha tipeada no se muestra luego (ALM-006).
- **Preguntas probables de usuarios:**
  1. ¿Por qué no me deja agregar productos a la compra? (el buscador solo existe para SUPER-ADMINISTRADOR).
  2. ¿La compra me aumenta el stock del producto? (no).
  3. ¿Cómo registro la compra de un servicio? (no se pueden: se excluyen).
  4. ¿Qué número de comprobante pongo?
  5. ¿Por qué me aparece la sucursal en blanco?
  6. ¿Puedo agregar un proveedor desde aquí? (no, hay que ir a Proveedores).
  7. ¿La compra genera un egreso o un gasto? (no).
  8. Guardé y salió "éxito" pero el detalle no tiene productos, ¿qué pasó?
- **Pendiente de validar en UI:** ❓ qué ve un rol ADMINISTRADOR/otro al abrir `/compras/add`; ❓ valor que muestra la columna "Precio de compra" (PVP vs. precio de compra); ❓ si las líneas se guardan siempre; ❓ efecto del reemplazo de `columns[7]` en la pantalla de Ventas tras visitar Compras.

---

## ALM-008 · Equipos — listado, filtros y acciones por fila

- **Ruta UI / name:** `/equipos` · `index.equipos` · menú Almacén › "Equipos" (FE:router/routes.ts:453-457; FE:layouts/SideBarMenu.vue:403-413) ✅. Acepta `?search=<texto>` (lo usa el perfil del cliente para saltar a un equipo por su serie) FE:equipos/IndexPage.vue:219-238.
- **Archivos:** FE: `equipos/IndexPage.vue`, `equipos/composables/useEquipos.js`, `equipos/components/{FormEquipo,VincularEquipo,HistorialEquipo,InstalacionEquipoModal,ImportarEquiposModal}.vue` · BE: `equipos/equipos.controller.ts`, `equipos/equipos.service.ts`, `equipos/entities/equipo.entity.ts`, `equipos/enums/equipo.enum.ts`, `equipos/dto/*`.
- **Para qué sirve:** inventario de **equipos serializados** (cada unidad con su serie/MAC) y su situación: libre en bodega, reservado para una instalación o entregado a un cliente.
- **Acceso:** `index.equipos` (ruta y menú) y los permisos de cada botón (tabla). El backend solo exige sesión ✅ BE:equipos/equipos.controller.ts:30.
- **Secciones / pestañas:** la página tiene **dos tablas apiladas**, "Equipos" (arriba) y "Accesorios" (abajo, ALM-013); **no hay pestañas** (el manual actual dice "dos pestañas") FE:equipos/IndexPage.vue:245-616 ✅.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Estado (select: Todos / Disponible / No Disponible / Pendiente Asignación) | Filtra por estado | ninguno | `GET /equipos?estado=` | oculto en móvil |
  | Categoría (select: Todas + categorías) | Filtra por categoría | ninguno | `GET /equipos?categoria_id=` | la lista de categorías viene de `GET /categories` **sin parámetros ⇒ solo las 10 primeras** BE:categories/categories.service.ts:27 ✅ |
  | Agregar Equipo (móvil: botón flotante `+` › "Equipo") | Abre el formulario (ALM-009) | `crear.equipo` | — | FE:equipos/IndexPage.vue:308-314, 628-641 |
  | Menú Excel (icono) | Importar Excel / Descargar Plantilla / Exportar Equipos (ALM-012) | ninguno | — | oculto en móvil |
  | Buscar... | Filtra en servidor por **serie o MAC** (espera 300 ms) | ninguno | `GET /equipos?filter=` | BE:equipos/equipos.service.ts:66-67 |
  | Editar (lápiz) | Abre el formulario | `editar.equipo` | — | **deshabilitado si el equipo tiene servicio** (tooltip "Desvincula el equipo para poder editarlo"; si no, "Editar") FE:equipos/IndexPage.vue:446-454 |
  | Vincular (icono `link_off` gris / `link` verde azulado) | Abre "Vincular equipo a servicio" (ALM-010); tooltip "Vincular a servicio" o "Vinculado" | `vincular.equipo` | — | visible aunque el equipo esté reservado (`pendiente_asignacion`) |
  | Ver historial (reloj) | Abre "Historial del Equipo" (ALM-011) | `ver.equipo` | — | ⚠ ese permiso **no existe en el catálogo** de roles (ver ALM-021) |
  | Ver instalación asignada (ojo) | Abre "Instalación Asignada" (ALM-011) | ninguno | `GET /equipos/instalacion/:id` | solo si estado = `pendiente_asignacion` |
  | Eliminar (papelera) | Diálogo "Eliminar equipo {serie}" con aviso (ver Mensajes) · botones **Eliminar** / **Cancelar** | `eliminar.equipo` | `DELETE /equipos/:id` | ver reglas |

- **Campos de formulario:** ver ALM-009 (alta/edición) y ALM-010 (vinculación).
- **Filtros y columnas de tabla:** "Nro. Serie", "Nro. MAC" ("—" si vacío), "Sucursal", "Proveedor", **"Cliente"** (muestra **IPv4 y nombre del plan** del servicio vinculado; al pulsar va al perfil del cliente con tooltip "Ir al perfil de {nombres}"; sin vínculo: "Sin asignar"), "Vinculación" (insignia **Comodato** / **Venta**, solo si hay servicio; si no "—"), "P. Venta / Alquiler" (campo `costo`), "Estado", "Categoría", "Acciones". Filas por página 10/15/20 FE:equipos/IndexPage.vue:40-51,364-429 ✅.
- **Estados posibles** (`equipos.estado`, enum de base de datos `equipos_estado_enum`) ✅ BE:equipos/enums/equipo.enum.ts:1-5:

  | Valor | Insignia (UI) | Significado en el código |
  |---|---|---|
  | `disponible` | verde "Disponible" | libre; es el valor al crear (formulario e importación por defecto) y al desvincular/quitar de una visita |
  | `no_disponible` | rojo "No Disponible" | vinculado al servicio de un cliente (por vinculación manual, venta al finalizar instalación o entrega en un ticket) |
  | `pendiente_asignacion` | naranja "Pendiente Asignación" | reservado en una instalación o ticket y todavía sin vincular a un servicio |

  Tipos de vinculación (`tipo_vinculacion`): `comodato` (valor por defecto, "Préstamo gratuito") y `venta`; puede ser nulo tras quitarlo de una instalación/ticket ✅ BE:equipos/enums/equipo.enum.ts:12-15.
- **Reglas de negocio (backend):**
  - Listado: filtros `estado`, `categoria_id`, `sucursal_id`, `proveedor_id` y `filter` (serie/MAC `ILIKE`); la interfaz solo usa estado, categoría y búsqueda. **No se restringe por sucursal ni por empresa del usuario**; pagina de 10 en 10 por defecto, `limit=0` devuelve todos (y `lastPage` queda `Infinity`) ✅ BE:equipos/equipos.service.ts:48-94.
  - Devuelve por fila: categoría (id, nombre), proveedor (id, razón social), sucursal (id, nombre), servicio (id, ipv4), plan (id, nombre_plan) y cliente (id, nombres) ✅ BE:equipos/equipos.service.ts:50-64.
  - **Eliminar**: pone `equipo_id = null` en el servicio vinculado y hace borrado lógico del equipo. **No** borra las filas de `instalacion_equipos`, **no** valida el estado (se puede eliminar un equipo reservado o vinculado), y **no** deja log ✅ BE:equipos/equipos.service.ts:148-157. Antes, el navegador intenta (mejor esfuerzo) borrar el cargo recurrente de venta si aún no tiene facturas FE:equipos/IndexPage.vue:104-117 ✅.
  - Equipos sin nro. de serie único: la creación manual **no** comprueba duplicados (solo la importación Excel) ✅ BE:equipos/equipos.service.ts:33-46.
- **Efectos secundarios externos:** ninguno directo. Eliminar un equipo vendido puede borrar su cargo recurrente (servicio de cargos) antes de eliminarlo.
- **Mensajes de error/éxito (texto exacto):** diálogo de eliminar: título "Eliminar equipo {serie}"; mensaje "¿Estás seguro de eliminar este equipo? Tenga en cuenta que si el equipo está vinculado a un servicio, se eliminará la vinculación pero el servicio no se eliminará. Si era una venta y su cargo aún no se ha facturado, también se eliminará."; éxito "Equipo eliminado"; error = `message` del backend o "Error al eliminar"; carga: "Error al cargar equipos" (aviso) / "Error al cargar categorías"; tabla vacía "No se encontró ningún resultado" FE:equipos/IndexPage.vue:97-126 ✅.
- **Relaciones con otros módulos:** Clientes (perfil › recursos del cliente: vincular/desvincular, ver origen), Instalaciones y Tickets (materiales: reservan y vinculan), Categorías y Proveedores (catálogos), Sucursal (opcional), Cargos recurrentes (venta).
- **Casos límite y advertencias:** (a) el lápiz **sí** está habilitado para equipos `pendiente_asignacion`; editarlos desde aquí envía `servicio_id: null` y el backend **borra la asignación del equipo a la instalación** (ver ALM-009); (b) `ver.equipo` no se puede conceder desde el editor de roles; (c) solo se listan 10 categorías en los desplegables; (d) un equipo `pendiente_asignacion` de una instalación cancelada o eliminada no se libera solo.
- **Preguntas probables de usuarios:**
  1. ¿Qué significa "Pendiente Asignación"?
  2. ¿Por qué no puedo editar este equipo? (está vinculado: desvincúlelo primero).
  3. ¿Cómo sé a qué cliente tiene este equipo? (columna "Cliente": IP y plan; clic para ir al perfil).
  4. ¿Cómo busco un equipo por MAC?
  5. Eliminé un equipo y el cliente sigue con servicio, ¿es normal? (sí, solo se quita el vínculo).
  6. El equipo quedó "Pendiente Asignación" y la instalación se canceló, ¿cómo lo libero?
  7. ¿Hay un estado "dañado" o "en reparación"? (no).
  8. ¿Por qué la categoría que creé no aparece en el filtro?
- **Pendiente de validar en UI:** ❓ que el lápiz esté realmente activo para `pendiente_asignacion`; ❓ dónde se ve el historial con un rol no SUPER (permiso `ver.equipo`); ❓ cuántas categorías muestran los desplegables.

---

## ALM-009 · Equipos — alta y edición

- **Ruta UI / name:** diálogo "Agregar Equipo" / "Editar Equipo" abierto desde `/equipos` (FE:equipos/components/FormEquipo.vue:88).
- **Archivos:** FE: `equipos/components/FormEquipo.vue`, `equipos/composables/useEquipos.js` · BE: `equipos/dto/create-equipo.dto.ts`, `equipos/equipos.service.ts:33-46,107-146`.
- **Para qué sirve:** registrar un equipo nuevo (siempre nace **disponible**) o corregir sus datos mientras no esté vinculado.
- **Acceso:** `crear.equipo` / `editar.equipo`.
- **Secciones / pestañas:** formulario único.
- **Botones y acciones:** "Guardar Cambios" (`POST /equipos` o `PATCH /equipos/:id`); X para cerrar.
- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Sucursal: | select (sucursales del usuario sin "TODOS") | Sí en FE ("Este campo es requerido") | BE: opcional (`IsUUID`, `IsOptional`) | FE:equipos/components/FormEquipo.vue:23,99-110 |
  | Categoría: | select (categorías: **primeras 10**) | Sí | BE `IsUUID`; columna `NOT NULL` | acepta categorías de tipo "Accesorio" o "Producto" indistintamente |
  | Proveedor: | select ("Sin proveedor" + todos los proveedores, incluso inactivos) | No | BE `IsUUID`, opcional | `GET /providers` |
  | Nro. Serie: | texto | Sí | BE `IsString` (acepta vacío); `varchar(100)`; sin unicidad en alta manual | |
  | Nro. MAC: | texto | No | sin formato; `varchar(50)` | |
  | Precio de Venta o Alquiler: | número con `$` | No (vacío → 0) | ≥ 0 ("Debe ser mayor o igual a cero"); BE `IsNumber`, `Min(0)`; decimal(10,2) | columna `costo`; si es 0, el IVA se fuerza a 0 y se bloquea |
  | Impuesto IVA: | select `0%` / tarifa estándar (Ecuador `15%`) | Sí en FE | BE: número opcional | texto de ayuda "El IVA se considera **incluido** en el precio ingresado." |

  No existen en el formulario: Estado, Tipo de vinculación, Cliente/servicio, Historial (se envían `estado:'disponible'`, `tipo_vinculacion:'comodato'`, `servicio_id:null`). ICE queda "No aplica" (el payload lo anula). El manual actual los lista como campos: no están ✅ FE:equipos/composables/useEquipos.js:3-17,125-151.
- **Filtros y columnas de tabla:** n/a.
- **Estados posibles:** nace `disponible`.
- **Reglas de negocio (backend):**
  - Alta: crea el equipo con las relaciones por id y responde `{status:201, data}` ✅ BE:equipos/equipos.service.ts:33-46.
  - Edición (`PATCH`): toma `categoria_id`, `proveedor_id`, `servicio_id`, `sucursal_id` aparte; **si `servicio_id` viene definido** (incluso `null`) sincroniza `ServicioCliente.equipo_id` y, cuando el valor final es vacío, **borra definitivamente las filas `instalacion_equipos` de tipo `producto` de ese equipo** ✅ BE:equipos/equipos.service.ts:112-136. El formulario de edición **siempre** envía `servicio_id: null` para un equipo sin servicio ⇒ editar un equipo `pendiente_asignacion` lo desconecta de su instalación (el equipo conserva el estado, pero "Ver instalación asignada" ya no encuentra nada) ❓ FE:equipos/components/FormEquipo.vue:59-70.
  - El DTO exige que cada entrada de `historial` tenga `fecha`, `hora`, `servicio_id`, `estado`, `usuario`, `usuario_id` (UUID), `ipv4`, `nombre_plan` y `cliente` como texto ✅ BE:equipos/dto/create-equipo.dto.ts:17-42.
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** éxito "Equipo agregado exitosamente" / "Equipo editado exitosamente"; error (aviso amarillo) = `message` del backend o "Error al guardar"; campos: "Este campo es requerido", "Debe ser mayor o igual a cero" FE:equipos/composables/useEquipos.js:90-151 ✅.
- **Relaciones con otros módulos:** Categorías, Proveedores, Sucursales; Cargos recurrentes (IVA/precio al vender).
- **Casos límite y advertencias:** el campo se llama "Precio de Venta o Alquiler" pero se guarda como `costo`; al vender se sobrescribe con el precio de venta; la categoría no filtra por tipo (un equipo puede quedar en una categoría marcada como "Accesorio").
- **Preguntas probables de usuarios:**
  1. ¿Dónde pongo el estado del equipo al crearlo? (no se elige: nace "Disponible").
  2. ¿Puedo registrar dos equipos con la misma serie? (el formulario no lo impide).
  3. ¿El precio del equipo incluye IVA?
  4. ¿Por qué el IVA me sale bloqueado en 0%? (precio 0).
  5. ¿Cómo cambio la categoría de un equipo ya entregado? (desvincular, editar y volver a vincular).
  6. ¿Puedo cargar varios equipos a la vez? (sí, por Excel, ALM-012).
- **Pendiente de validar en UI:** ❓ efecto de editar un equipo "Pendiente Asignación" (se pierde la instalación asignada); ❓ si la validación de serie duplicada existe en base de datos (no hay `unique` en la entidad ni en la migración de creación).

---

## ALM-010 · Equipos — vincular y desvincular a un servicio de cliente

- **Ruta UI / name:** diálogo "Vincular equipo a servicio" abierto con el icono de enlace de la fila (FE:equipos/components/VincularEquipo.vue:29). El perfil del cliente tiene sus propias versiones ("Vincular equipo al servicio" y "Desvincular equipo", FE:clientes/components/editar/VincularEquipoClienteModal.vue; FE:clientes/components/editar/RecursosCliente.vue:118-203) que hacen lo mismo con `PATCH /equipos/:id`.
- **Archivos:** FE: `equipos/components/VincularEquipo.vue`, `equipos/composables/useVincularEquipo.js` · BE: `equipos/equipos.service.ts:107-146`, `servicios-recurrente` (cargo).
- **Para qué sirve:** entregar el equipo a un servicio de un cliente en **comodato** o **venta**, o retirarlo.
- **Acceso:** `vincular.equipo`.
- **Secciones / pestañas:** cabecera con "Serie:" y "MAC:" (+ insignia "Ya vinculado") · cliente · servicio · tipo de vinculación · (venta) precio, forma de pago, tipo de factura.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Vincular | Confirma "¿Deseas vincular este equipo al servicio seleccionado?" (+ si es venta: "Se generará además un cargo para cobrar el equipo en la próxima factura.") · **Aceptar**/**Cancelar** | `vincular.equipo` | `PATCH /equipos/:id` y, si es venta, `POST /servicios-recurrente` | FE:equipos/composables/useVincularEquipo.js:163-216 |
  | Desvincular (si ya tiene servicio) | Confirma "¿Deseas desvincular este equipo?" · **Aceptar**/**Cancelar** | `vincular.equipo` | `PATCH /equipos/:id` `{servicio_id:null, estado:'disponible', historial}`; antes `DELETE /servicios-recurrente/:id` si era venta sin facturar | FE:equipos/composables/useVincularEquipo.js:118-160 |

- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Buscar cliente (nombres o número de documento): | select con búsqueda (espera 700 ms) | Sí — "Debes completar este campo" | busca clientes en `usePromise.getCustomers` | si el equipo ya tiene servicio, se precarga y no se puede limpiar |
  | Servicio: | select | Sí | solo servicios **no retirados y sin equipo** (`deleted === false` y sin `equipo_id`) mostrados como "IPV4: x  Plan: y"; sin opciones: "No se encontró ningun servicio o contrato disponible" | si hay uno solo, se elige solo |
  | Tipo de Vinculación: | select "Comodato (Préstamo gratuito)" / "Venta" | Sí (por defecto Comodato) | banner informativo: comodato = "préstamo gratuito … quien se compromete a conservarlo y devolverlo"; venta = "El equipo será vendido al cliente. El costo del equipo se agregará a la factura." | |
  | Precio de venta: | número | Si es venta, > 0 — "Ingresa un precio de venta mayor a 0 para el equipo" | precargado con `costo` del equipo | solo si Venta y el equipo aún sin servicio |
  | Forma de pago: | select | Si es venta — "Selecciona la forma de pago del equipo" | "Un solo pago", "Mensualmente", "Pago en 2 Cuotas" … "Pago en 12 Cuotas" | |
  | Tipo de factura: | select | Si es venta | "Factura de servicio" (`FACT. DE SERVICIO`) / "Factura libre" (`FACT. LIBRE`) | |

- **Filtros y columnas de tabla:** n/a.
- **Estados posibles:** `disponible` → vincular → `no_disponible` (con `servicio_id`, `tipo_vinculacion`); desvincular → `disponible` (`tipo_vinculacion` **no** se borra) ✅ FE:equipos/composables/useVincularEquipo.js:147-151,193-200.
- **Reglas de negocio:**
  - Vincular: `PATCH` con `servicio_id`, `estado:'no_disponible'`, `tipo_vinculacion`, `historial` (+ entrada `asignacion` con fecha, hora, servicio, usuario, IP, plan y cliente) y, si es venta, `costo = precio de venta`. El backend fija `ServicioCliente.equipo_id` ✅ BE:equipos/equipos.service.ts:112-126.
  - Venta: el navegador crea después un **cargo recurrente** (`tipo_comprobante: 'Factura'`, `tipo_pago`, `tipo_factura`, un ítem con `id` del equipo, `descripcion` `"{CATEGORÍA} - SERIE {serie}"` en mayúsculas, `cantidad 1`, `iva` del equipo, `tipo_impuesto` "Impuestos incluido" si IVA > 0 o "Ninguno", `esEquipoVenta: true`); lo factura el motor de facturación en su ciclo ✅ FE:equipos/composables/useVincularEquipo.js:37-70.
  - **No es atómico**: primero se vincula el equipo y luego se crea el cargo; si el cargo falla, el equipo queda vinculado sin cobro (aviso "Fallo la asignación: …") ✅.
  - **No se valida el estado previo**: el botón de vincular también está disponible para `pendiente_asignacion` y `no_disponible` ✅ FE:equipos/IndexPage.vue:455-463.
  - Desvincular: si era venta y el cargo **no tiene facturas**, se elimina el cargo; si ya está facturado, se conserva. Además el backend **elimina de forma definitiva** las asignaciones tipo `producto` del equipo en instalaciones ✅ BE:equipos/equipos.service.ts:128-132.
  - El `historial` que viaja usa `ipv4`, `nombre_plan`, `cliente`, `usuario_id` con valor `null` cuando faltan, y el DTO los exige como texto/UUID ⇒ 400 en servicios sin IP o sin plan ❓; las entradas escritas por instalaciones/tickets no traen `usuario`, `ipv4`, `nombre_plan`, `cliente` y vuelven a enviarse en el `PATCH` ⇒ el DTO también las rechazaría ❓ (el perfil del cliente rellena con "—" por esta razón FE:clientes/components/editar/VincularEquipoClienteModal.vue:163-182).
- **Efectos secundarios externos:** crea o elimina un **cargo recurrente** del servicio (se factura luego por el motor de facturación/SRI; fuera de este dominio).
- **Mensajes de error/éxito (texto exacto):** "Equipo vinculado exitosamente"; "Equipo vendido y vinculado; cargo generado"; "Equipo desvinculado exitosamente"; errores "Fallo la asignación: {mensaje}" (en rojo), "Fallo al desvincular el equipo", "Error al cargar el servicio existente: {mensaje}" ✅.
- **Relaciones con otros módulos:** Clientes (servicios, perfil › Recursos), Cargos recurrentes/Facturación, Instalaciones (borra sus asignaciones al desvincular), Historial (ALM-011).
- **Casos límite y advertencias:** (a) cada servicio admite **un solo equipo** en la interfaz (`ServicioCliente.equipo_id` único), pero la base de datos permite varios (relación 1-N `servicio_id`); (b) retirar/eliminar el servicio o el cliente **no** libera el equipo; (c) desvincular no restaura `tipo_vinculacion`; (d) si la venta ya fue facturada, desvincular no devuelve ni anula la factura.
- **Preguntas probables de usuarios:**
  1. ¿Cómo entrego un equipo a un cliente? ¿Y cómo cobro el equipo?
  2. ¿Qué diferencia hay entre Comodato y Venta?
  3. ¿Por qué mi cliente no aparece en el desplegable de servicios? (ya tiene equipo o el servicio está retirado).
  4. Vendí el equipo en 3 cuotas, ¿dónde se cobran? (cargo recurrente del servicio, forma de pago "Pago en 3 Cuotas").
  5. ¿Qué pasa con el cobro si desvinculo el equipo?
  6. El cliente se dio de baja, ¿el equipo vuelve solo a bodega? (no).
  7. ¿Puedo poner dos equipos a un mismo servicio? (la interfaz no lo permite).
  8. Me salió "Fallo la asignación: Request failed with status code 400", ¿qué hago?
- **Pendiente de validar en UI:** ❓ error 400 por `historial` con campos nulos o entradas antiguas; ❓ equipo vinculado sin cargo si falla el segundo paso; ❓ qué muestra el desplegable de servicios para clientes con varios servicios; ❓ que `tipo_vinculacion` siga mostrándose tras desvincular (solo se ve con servicio, pero el Excel exportado lo trae).

---

## ALM-011 · Equipos — historial e "Instalación Asignada"

- **Ruta UI / name:** diálogos "Historial del Equipo" (icono reloj) e "Instalación Asignada" (icono ojo) en `/equipos`.
- **Archivos:** FE: `equipos/components/HistorialEquipo.vue`, `equipos/components/InstalacionEquipoModal.vue` · BE: `equipos/equipos.service.ts:159-175` (`GET /equipos/instalacion/:id`), campo JSON `historial` de `equipos`.
- **Para qué sirve:** saber a qué servicios estuvo asignado un equipo y, si está reservado, para qué instalación.
- **Acceso:** historial: `ver.equipo` (inexistente en el catálogo); instalación asignada: sin permiso, solo visible con estado `pendiente_asignacion`.
- **Secciones / pestañas:** Historial: línea de tiempo (la más reciente primero). Instalación: ficha de solo lectura.
- **Botones y acciones:** solo cierres (X).
- **Campos de formulario:** (solo lectura)
  - Historial: subtítulo "Nro. Serie: {serie}"; cada entrada: insignia **ASIGNACIÓN** (verde azulado, icono `link`) o **RETIRO** (naranja, `link_off`), fecha — hora, "Operador:", "Cliente:", "IP:", "Plan:". Sin datos: "Sin registros en el historial" FE:equipos/components/HistorialEquipo.vue:35-93 ✅.
  - Instalación Asignada: "Serie:", "MAC:", insignia "Pendiente Asignación", "Cliente:", "Cédula:", "Teléfono:", "Correo:", "Dirección:", "Fecha Instalación:", "Técnico Asignado:", "Creado por:", "Estado:" (verde si INSTALADO, naranja en otro caso), banner "Condición: Préstamo/Comodato | Venta (Facturar) | Libre" + "Descripción:", insignia "Nº instalación: 0000000" (7 dígitos) FE:equipos/components/InstalacionEquipoModal.vue:42-160 ✅.
- **Filtros y columnas de tabla:** n/a.
- **Estados posibles del historial** (`HistorialEstado`): `asignacion`, `retiro` ✅ BE:equipos/enums/equipo.enum.ts:7-10.
- **Reglas de negocio (backend):**
  - El historial vive en la columna JSON `equipos.historial`; la pantalla lo lee del propio listado (sin otra consulta) ✅.
  - Quién escribe entradas: (1) el navegador al vincular/desvincular desde Equipos o desde el perfil del cliente (`asignacion`/`retiro`, con usuario, IP, plan y cliente); (2) el backend al vender un equipo en una instalación (`asignacion`, `origen: 'instalacion'`, con `instalacion_id`; si es al finalizar, con usuario) y al entregarlo en un ticket (`asignacion`, `origen: 'ticket'`, `ticket_id`) ✅ BE:customers/customers.service.ts:1020-1033; BE:instalaciones/instalaciones.service.ts:917-927; BE:ticket/materiales/tickets-materiales.service.ts:97-107.
  - **Quitar un equipo de una instalación o de un ticket no escribe un `retiro`** (solo restablece servicio y estado) ✅ BE:instalaciones/instalaciones.service.ts:1051-1058; BE:ticket/materiales/tickets-materiales.service.ts:124-140. El historial queda incompleto en esos casos.
  - Las entradas escritas por el backend no traen `usuario`/`ipv4`/`nombre_plan`/`cliente` (la pantalla muestra "Operador:" vacío).
  - `GET /equipos/instalacion/:id`: devuelve la asignación **más reciente no eliminada** del equipo con instalación, técnico y operador; si no hay: 404 "No se encontró instalación asociada a este equipo" (la pantalla avisa "No se encontró instalación asociada") ✅ BE:equipos/equipos.service.ts:159-175. La consulta no excluye asignaciones de **tickets**: para un equipo reservado por un ticket la ficha quedaría vacía ❓.
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** "No se encontró instalación asociada" (aviso) · "Sin registros en el historial" · "Cargando información...".
- **Relaciones con otros módulos:** Instalaciones (ficha), Tickets, Clientes.
- **Casos límite y advertencias:** el historial no muestra "dañado", reparaciones ni cambios de estado distintos de asignación/retiro; no hay "asignado a técnico".
- **Preguntas probables de usuarios:**
  1. ¿Dónde veo por qué clientes pasó este equipo?
  2. ¿Por qué el historial no tiene el retiro cuando saqué el equipo de la instalación?
  3. ¿Quién entregó el equipo? (campo "Operador").
  4. ¿Qué instalación tiene reservado este equipo?
  5. No veo el botón del historial, ¿qué permiso necesito? (`ver.equipo`: no figura en el editor de roles).
- **Pendiente de validar en UI:** ❓ visibilidad del botón historial para roles no SUPER; ❓ contenido del diálogo cuando el equipo fue reservado por un ticket sin servicio; ❓ formato de fecha/hora (se muestra tal cual `AAAA-MM-DD — HH:mm`).

---

## ALM-012 · Equipos — plantilla, exportar e importar Excel

- **Ruta UI / name:** botón con icono Excel de la tabla "Equipos" → opciones **Importar Excel** (subtítulo "Cargar equipos desde un archivo"), **Descargar Plantilla** ("Excel vacío con dropdowns"), **Exportar Equipos** ("Todos los equipos actuales") FE:equipos/IndexPage.vue:315-352 ✅. Oculto en móvil.
- **Archivos:** FE: `equipos/IndexPage.vue:145-180`, `equipos/components/ImportarEquiposModal.vue` · BE: `equipos/equipos-excel.service.ts`, `equipos/equipos.controller.ts:47-72`.
- **Para qué sirve:** alta masiva de equipos y respaldo/exportación del inventario.
- **Acceso:** sin `validarPermisos` (cualquiera con acceso a la pantalla).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Descargar Plantilla | Descarga `plantilla-equipos.xlsx` | ninguno | `GET /equipos/excel/descargar?conDatos=false` | |
  | Exportar Equipos | Descarga `equipos.xlsx` con **todos** los equipos (sin respetar filtros) | ninguno | `GET /equipos/excel/descargar?conDatos=true` | trae categoría, serie, MAC, costo, impuesto, estado, vinculación, sucursal, proveedor; **no** trae cliente ni historial |
  | Importar Excel | Abre "Importar equipos desde Excel" | ninguno | — | |
  | Importar (dentro del diálogo) | Envía el `.xlsx` | ninguno | `POST /equipos/excel/importar` (multipart `file`) | resultado por filas |
  | Cerrar | Cierra; si hubo creados, refresca la tabla | — | — | |

- **Campos de formulario:** "Archivo Excel (.xlsx)" (obligatorio: "Selecciona un archivo Excel."). Banner: "Usa la plantilla (botón "Descargar Plantilla") para no equivocarte en los nombres de categoría, sucursal y proveedor. Las celdas tienen dropdowns con los valores válidos."
- **Filtros y columnas de tabla:** hoja `equipos`: "Categoría *", "Nro. Serie *", "Nro. MAC", "Costo (USD) *", "Impuesto (%)", "Estado", "Tipo Vinculación", "Sucursal", "Proveedor"; hojas "Listas" (catálogos visibles + aviso "⚠ No edites esta hoja. Los dropdowns de "equipos" la leen.") e "Instrucciones" ✅ BE:equipos/equipos-excel.service.ts:52-62,181-203.
- **Estados posibles:** Estado admite "Disponible", "No Disponible", "Pendiente Asignación" (con/sin tilde o guion bajo); cualquier otro texto cae en **Disponible**; Vinculación "Comodato"/"Venta", otro texto ⇒ Comodato (sin aviso) ✅ BE:equipos/equipos-excel.service.ts:35-49,550-558.
- **Reglas de negocio (backend):**
  - Procesa la hoja `equipos` (o la primera); fila 1 = cabecera; salta filas vacías; **mejor esfuerzo**: las filas válidas se guardan juntas y las inválidas se reportan ✅ BE:equipos/equipos-excel.service.ts:388-533.
  - Orden de validación y mensajes: "Nro. Serie es obligatorio." · "Nro. Serie ya existe en la base de datos." (comparación sin mayúsculas/espacios, solo equipos no eliminados) · "Nro. Serie duplicado dentro del archivo." · "Categoría es obligatoria." · `Categoría "X" no existe.` · "Costo debe ser un número >= 0." · "Impuesto debe ser un número entre 0 y 100." · `Sucursal "X" no existe.` · `Proveedor "X" no existe.` ✅.
  - Los nombres de categoría/sucursal/proveedor se resuelven sin distinguir mayúsculas; si hay nombres repetidos gana el último ✅ BE:equipos/equipos-excel.service.ts:560-567.
  - Errores globales (400): "No se recibió ningún archivo.", "El archivo no es un .xlsx válido.", "El libro no contiene hojas legibles.", "Algunas filas fallaron al guardarse en la base de datos. Revisa los datos e intenta de nuevo." ✅.
  - Se pueden importar equipos con estado `no_disponible`/`pendiente_asignacion` **sin** servicio ni asignación (estados "huérfanos").
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** éxito "{n} equipo(s) creado(s)."; error global = `message` o "Error al importar el archivo."; tarjetas "Filas procesadas", "Creados", "Con errores"; lista "Filas con problemas" con "Fila {n}" + "Serie: {serie}" + texto del error. Si todas las filas fueron correctas, el diálogo se cierra solo y refresca FE:equipos/components/ImportarEquiposModal.vue:12-48,76-130 ✅.
- **Relaciones con otros módulos:** Categorías/Sucursales/Proveedores (catálogos de la hoja "Listas").
- **Casos límite y advertencias:** re-importar un archivo exportado falla fila por fila ("Nro. Serie ya existe…"); no hay actualización masiva, solo alta.
- **Preguntas probables de usuarios:**
  1. ¿Cómo cargo 200 equipos de una vez?
  2. ¿Por qué mi Excel dice "Categoría … no existe"? (nombre distinto al de Categorías o fuera de la lista).
  3. ¿Puedo actualizar equipos con el Excel? (no, solo crear).
  4. Importé y algunas filas fallaron, ¿se cargó lo demás? (sí).
  5. ¿Se exportan también los equipos de clientes?
  6. ¿Qué pasa si dejo "Estado" en blanco? (Disponible).
- **Pendiente de validar en UI:** ❓ aspecto de la plantilla (dropdowns, hoja "Listas" visible); ❓ que "Descargar Plantilla" funcione tras desplegar (archivo generado en el momento).

---

## ALM-013 · Accesorios — listado, alta/edición y eliminación

- **Ruta UI / name:** segunda tabla ("Accesorios") de `/equipos` · `index.equipos` (FE:equipos/IndexPage.vue:498-616) ✅. No hay menú ni permiso de "Ver" propios.
- **Archivos:** FE: `equipos/IndexPage.vue`, `equipos/components/FormAccesorio.vue`, `equipos/composables/useAccesorios.js` · BE: `equipos/equipos.controller.ts:100-133`, `equipos/equipos.service.ts:178-238`, `equipos/entities/accesorio.entity.ts`, `equipos/dto/create-accesorio.dto.ts`.
- **Para qué sirve:** inventario de **consumibles por cantidad** (cable, conectores, patchcords) que se gastan en instalaciones y soportes. El accesorio no se factura al cliente.
- **Acceso:** la tabla se ve con `index.equipos`; botones con `crear.accesorio`, `editar.accesorio`, `eliminar.accesorio`; "Historial de uso" y el menú Excel sin permiso ✅.
- **Secciones / pestañas:** tabla "Accesorios" con barra superior (Agregar Accesorio, menú Excel, Buscar...).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | Agregar Accesorio (móvil: flotante `+` › "Accesorio") | Abre el formulario | `crear.accesorio` | — | FE:equipos/IndexPage.vue:531-538,628-641 |
  | Menú Excel (icono) | Importar / plantilla / exportar (ALM-015) | ninguno | — | oculto en móvil |
  | Buscar... | Filtra en servidor por nombre (espera 300 ms) | ninguno | `GET /equipos/accesorios?filter=` | BE:equipos/equipos.service.ts:198-199 |
  | Editar (lápiz) | Abre el formulario | `editar.accesorio` | — | |
  | Historial de uso (icono reloj; tooltip "Historial de uso") | Abre ALM-014 | ninguno | `GET /equipos/accesorios/:id/historial` | |
  | Eliminar (papelera) | Diálogo "¿Deseas eliminar el accesorio {nombre}?" · **Eliminar** / **Cancelar** | `eliminar.accesorio` | `DELETE /equipos/accesorios/:id` | borrado lógico sin validaciones |

- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | Categoría: | select (categorías: **primeras 10**) | Sí — "Este campo es requerido" | BE `IsUUID` | define la unidad: Uds o Mts |
  | Nombre: | texto | Sí | BE `IsString` (sin longitud mínima); `varchar(100)` | |
  | Costo Unitario: | número con `$` | No (vacío → 0) | ≥ 0 ("Debe ser mayor a cero" aun cuando 0 es válido) ; decimal(10,2) | |
  | Cantidad (Stock): | número | No (por defecto 0) | ≥ 0; BE `IsNumber`/`Min(0)`; columna **entera** | admite decimales en el DTO pero la columna es `int` ❓ |

  Títulos: "Agregar Accesorio" / "Editar Accesorio"; botón "Guardar Cambios" FE:equipos/components/FormAccesorio.vue:55,66-136 ✅.
- **Filtros y columnas de tabla:** "Nombre", "Categoría", "Costo Unitario" (`{moneda}{valor}`), "Stock" (solo el número, sin unidad), "Acciones". Filas por página 10/15/20 FE:equipos/IndexPage.vue:54-60 ✅.
- **Estados posibles:** no tiene estado; solo cantidad. Unidad: `unidades` ("Uds") o `metro` ("Mts") **según la categoría** BE:categories/enums/category.enum.ts:6-9.
- **Reglas de negocio (backend):**
  - Alta/edición sin motivo ni log; **la edición reemplaza `cantidad`** (no suma) ✅ BE:equipos/equipos.service.ts:178-188,222-232. Es la única vía de interfaz para corregir el stock de accesorios; **no existe** la acción "Ajustar stock" que mencionan el banner del importador y la plantilla Excel ✅ (FE:equipos/components/ImportarAccesoriosModal.vue:65-67; BE:equipos/equipos-excel.service.ts:220).
  - Eliminar = borrado lógico; no comprueba si tiene stock ni si fue usado en instalaciones/tickets; las asignaciones históricas conservan el vínculo ✅ BE:equipos/equipos.service.ts:234-238.
  - Stock **no negativo**: restricción `CHK_accesorios_stock_no_negativo` (`cantidad >= 0`, creada `NOT VALID`, por lo que no revisa datos previos) y descuento atómico en materiales ✅ BE:migrations/1788200000000-MaterialesTicket.ts:46-56.
  - Los accesorios no se asocian a sucursal ni a proveedor; listado global; paginación de 10 por defecto, `limit=0` todo ✅ BE:equipos/equipos.service.ts:190-214.
  - No hay unicidad nombre+categoría en el alta manual (solo en la importación).
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** "Accesorio agregado exitosamente" / "Accesorio editado exitosamente" / "Accesorio eliminado"; error = `message` o "Error al guardar" / "Error al eliminar" / "Error al cargar accesorios"; backend "Accesorio eliminado exitosamente", "Accesorio #{id} no encontrado" ✅.
- **Relaciones con otros módulos:** Categorías (unidad y "Disponibles"), Instalaciones y Tickets (consumo), Excel (ALM-015).
- **Casos límite y advertencias:** si se corrige la cantidad mientras otro usuario consume, gana la última escritura; eliminar un accesorio usado hace que las pantallas de instalaciones muestren `descripcion` en lugar del nombre ❓.
- **Preguntas probables de usuarios:**
  1. ¿Cómo subo el stock de cable o conectores?
  2. ¿Cómo sé si el accesorio se mide en metros o en unidades? (categoría).
  3. ¿Qué pasa con el stock cuando el técnico usa cable en una instalación? (se descuenta solo).
  4. ¿Puede quedar el stock en negativo? (no: el sistema rechaza si no alcanza).
  5. Edité la cantidad y quedó la que puse, ¿no se suma? (se reemplaza).
  6. ¿Por qué el banner del Excel habla de "Ajustar stock"? (esa acción no existe para accesorios).
- **Pendiente de validar en UI:** ❓ que no exista otra acción de ajuste de stock en la tabla; ❓ comportamiento con cantidades decimales (metros); ❓ aspecto de accesorios eliminados en la hoja de instalación.

---

## ALM-014 · Accesorios — historial de uso

- **Ruta UI / name:** diálogo "Historial del Accesorio" desde el icono reloj de la fila (FE:equipos/components/HistorialAccesorio.vue:49).
- **Archivos:** FE: `equipos/components/HistorialAccesorio.vue` · BE: `equipos/equipos.service.ts:240-345` (`origenDelUso`, `historialAccesorio`), `equipos/equipos.controller.ts:115-118`.
- **Para qué sirve:** ver en qué instalaciones y soportes se consumió un accesorio, cuánto, quién y cuándo.
- **Acceso:** sin permiso específico.
- **Secciones / pestañas:** resumen (3 fichas) + lista "Dónde se usó:".
- **Botones y acciones:** cerrar (X).
- **Campos de formulario:** (solo lectura) fichas "Stock actual: N Uds|Mts", "Consumido (activo): N Uds|Mts", "Costo unitario: {moneda}{valor}"; "Categoría: {nombre}". Cada uso: icono de instalación (llave) o soporte (auricular), "Instalación #0000123" o "Ticket #0000123", insignia con el **estado** del origen, insignia **ELIMINADO** si la asignación fue eliminada, "Cliente: {nombre} ({cédula})", "Motivo: {asunto}" (ticket) o "Dirección: {…}" (instalación), "Técnico: … · Operador: …", "Asignado: DD/MM/AAAA HH:mm" y, si aplica, "Eliminado: …", y a la derecha la cantidad con su unidad ✅ FE:equipos/components/HistorialAccesorio.vue:60-130.
- **Filtros y columnas de tabla:** n/a.
- **Estados posibles:** los del origen: instalación (`PENDIENTE`, `AGENDADA`, `EN_PROCESO`, `INSTALADO`, `REPROGRAMADA`, `CANCELADA`) o ticket; colores: INSTALADO y RESUELTO verde, CERRADO verde azulado, CANCELADO rojo, EN_PROCESO naranja fuerte, ABIERTO azul, otros naranja FE:equipos/components/HistorialAccesorio.vue:17-26 ✅.
- **Reglas de negocio (backend):**
  - Une todas las filas `instalacion_equipos` de tipo `accesorio` del accesorio, **incluidas las eliminadas** (`withDeleted`), con su instalación o ticket ✅ BE:equipos/equipos.service.ts:290-316.
  - `total_consumido` suma solo las asignaciones **no eliminadas**; `stock` = `cantidad` actual ✅ BE:equipos/equipos.service.ts:319-332.
  - 404 "Accesorio no encontrado" ✅. Sin usos: "Aún no se ha utilizado en ninguna instalación ni soporte."
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** el fallo de carga se ignora en silencio (`catch (_) {}`), el diálogo queda sin datos ✅ FE:equipos/components/HistorialAccesorio.vue:35-37.
- **Relaciones con otros módulos:** Instalaciones, Tickets, Clientes (nombre/cédula).
- **Casos límite y advertencias:** una instalación cancelada o eliminada **sigue contando** como consumo (el stock no se devuelve, ver ALM-016); lo único que hace "ELIMINADO" es la asignación quitada manualmente.
- **Preguntas probables de usuarios:**
  1. ¿Quién gastó el cable de este rollo?
  2. ¿Por qué el historial muestra usos eliminados?
  3. ¿Se descuenta también cuando es un soporte? (sí, "Ticket #…").
  4. ¿Por qué "Consumido (activo)" no coincide con el stock que falta?
- **Pendiente de validar en UI:** ❓ formato del secuencial (7 dígitos); ❓ aspecto con tickets sin cliente.

---

## ALM-015 · Accesorios — plantilla, exportar e importar Excel

- **Ruta UI / name:** menú Excel de la tabla "Accesorios": **Importar Excel** ("Cargar accesorios desde un archivo"), **Descargar Plantilla** ("Excel vacío con dropdowns"), **Exportar Accesorios** ("Todos los accesorios actuales") FE:equipos/IndexPage.vue:539-576 ✅.
- **Archivos:** FE: `equipos/IndexPage.vue:182-217`, `equipos/components/ImportarAccesoriosModal.vue` · BE: `equipos/equipos-excel.service.ts:569-827`, `equipos/equipos.controller.ts:74-98`.
- **Para qué sirve:** alta masiva de accesorios con stock inicial y exportación.
- **Acceso:** sin permiso.
- **Botones y acciones:** `GET /equipos/accesorios/excel/descargar?conDatos=false|true` (archivos `plantilla-accesorios.xlsx` / `accesorios.xlsx`) y `POST /equipos/accesorios/excel/importar` (multipart `file`); diálogo "Importar accesorios desde Excel" con "Archivo Excel (.xlsx)", "Importar", "Cerrar".
- **Campos de formulario:** hoja `accesorios`: "Nombre *", "Categoría *", "Costo Unitario *", "Stock Inicial"; hojas "Listas" (solo categorías) e "Instrucciones" ✅ BE:equipos/equipos-excel.service.ts:64-70.
- **Filtros y columnas de tabla:** n/a.
- **Estados posibles:** n/a.
- **Reglas de negocio (backend):**
  - Mejor esfuerzo igual que en equipos. Mensajes por fila: "Nombre es obligatorio." · "Categoría es obligatoria." · `Categoría "X" no existe.` · "Ya existe un accesorio con ese nombre en esa categoría. Para reajustar stock usa "Ajustar stock"." · "Nombre + Categoría duplicado dentro del archivo." · "Costo Unitario debe ser un número ≥ 0." · "Stock Inicial debe ser un entero ≥ 0." ✅ BE:equipos/equipos-excel.service.ts:736-800.
  - La unicidad es por **nombre (sin mayúsculas/espacios) + categoría** y **solo crea**: no suma al stock de un accesorio existente ✅.
  - Errores globales: "No se recibió ningún archivo.", "El archivo no es un .xlsx válido.", "El libro no contiene hojas legibles.", "Algunas filas fallaron al guardarse. Revisa los datos e intenta de nuevo." ✅.
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** "{n} accesorio(s) creado(s)."; banner: "Usa la plantilla (botón "Descargar Plantilla") para no equivocarte en los nombres de categoría. Para reajustar el stock de un accesorio existente usa la acción "Ajustar stock" de la lista, no esta importación." ✅ FE:equipos/components/ImportarAccesoriosModal.vue:55-68.
- **Relaciones con otros módulos:** Categorías.
- **Casos límite y advertencias:** el banner remite a una acción inexistente (ver ALM-013).
- **Preguntas probables de usuarios:**
  1. ¿Cómo cargo el inventario inicial de materiales?
  2. ¿Puedo sumar stock con el Excel? (no; solo altas nuevas).
  3. ¿Qué pasa si el accesorio ya existe? (la fila se rechaza).
  4. ¿Cómo sé la unidad de cada accesorio en el Excel? (por la categoría).
- **Pendiente de validar en UI:** ❓ plantilla generada (dropdown de categorías, hoja "Listas").

---

## ALM-016 · Materiales de instalaciones y soportes — reserva de equipos y consumo de accesorios

- **Ruta UI / name:** no es una pantalla de Almacén: es el servicio compartido `MaterialesService` que usan dos pestañas **Materiales**: la de **Instalaciones** (`/instalaciones/edit/:id` · `instalaciones.edit`, pestañas Detalles / Formulario Instalación / **Materiales**) y la de **Tickets** (`/tickets/edit/:id`, pestañas Detalles / Formulario Ticket / **Materiales**, visible en cuanto el ticket carga) ✅ FE:instalaciones/EditInstalacion.vue:423-433; FE:tickets/components/TabPanels.vue:29-47. Los diálogos son los mismos en ambos sitios y reciben la ruta armada: "Productos" (agregar equipo) y "Accesorios" / "Editar accesorio" ✅ FE:instalaciones/components/AgregarProductoModal.vue; FE:instalaciones/components/AgregarAccesorioModal.vue; FE:tickets/components/MaterialesTicket.vue.
- **Archivos:** BE: `materiales/materiales.service.ts`, `materiales/materiales.module.ts`, `instalaciones/instalaciones.service.ts:849-1064`, `instalaciones/instalaciones.controller.ts:177-231`, `instalaciones/dto/create-instalacion-equipo.dto.ts`, `ticket/materiales/tickets-materiales.{controller,service}.ts`, `ticket/materiales/dto/material-ticket.dto.ts`, `instalaciones/entities/instalacion-equipo.entity.ts`, `customers/customers.service.ts:990-1076`, `equipos/equipos.service.ts:106-135` · FE: `pages/dashboard/instalaciones/EditInstalacion.vue:255-345, 455-690`, `pages/dashboard/instalaciones/components/AgregarProductoModal.vue`, `pages/dashboard/instalaciones/components/AgregarAccesorioModal.vue`, `pages/dashboard/tickets/components/MaterialesTicket.vue`, `pages/dashboard/tickets/components/TabPanels.vue`.
- **Para qué sirve:** registrar qué equipos y accesorios usó una visita y mover el inventario en consecuencia. Es el **único mecanismo automático** de descuento de stock del sistema.
- **Acceso:** Instalaciones: la pestaña y sus botones **no llevan comprobación de permiso propia** en el frontend (se llega con `instalaciones.edit`) ✅ FE:EditInstalacion.vue:455-616. Tickets: **Agregar equipo**, **Agregar accesorio**, editar y quitar solo con `tickets.edit` (`puedeEditar`) ✅ FE:MaterialesTicket.vue:34, 115-122, 140-149, 173-208. Backend: solo JWT en todos los endpoints (`@Auth()` de clase) ✅ BE:instalaciones/instalaciones.controller.ts:14; BE:ticket/materiales/tickets-materiales.controller.ts:10-12.
- **Secciones / pestañas:** Instalación: tabla **Productos Instalados** (botón **Agregar Producto**; columnas Tipo, Descripción, Nº Mac, Nº Serie, Condición, Acciones) y tabla **Accesorios Utilizados** (botón **Agregar Accesorio**; columnas Descripción, Cantidad, Acciones); sin datos: "Ningún producto agregado." / "Ningún accesorio agregado." ✅ FE:EditInstalacion.vue:455-616. Ticket: **Equipos entregados** (botón **Agregar equipo**; Tipo, Descripción, Nº MAC, Nº Serie, Condición como chip Libre / Comodato / Venta, Acciones) y **Accesorios utilizados** (botón **Agregar accesorio**; Descripción, Cantidad con "Mts" o "Uds"); sin datos: "Ningún equipo agregado." / "Ningún accesorio agregado."; pie: "Lo que se agregue acá descuenta del inventario en el momento. Al quitarlo, vuelve." ✅ FE:MaterialesTicket.vue:36-55, 100-228.
- **Botones y acciones:**

  | Etiqueta (UI) | Qué hace | Endpoint | Efecto en inventario |
  |---|---|---|---|
  | Agregar equipo / Agregar Producto → diálogo "¿Agregar equipo a la instalación?" (Agregar/Cancelar) | Asigna un equipo `disponible` (filtra por categoría) con condición "Préstamo/Comodato" o "Venta (Facturar)" | `POST /instalaciones/:id/equipos` · `POST /tickets-materiales/:ticketId` | equipo → `pendiente_asignacion`; en ticket con servicio, además `no_disponible` y vinculado |
  | Agregar accesorio / "Agregar" | Descuenta la cantidad pedida | mismos endpoints (`tipo:'accesorio'`) | `cantidad` − pedida |
  | Editar (icono lápiz; tooltip "Editar" en instalación, "Cambiar la cantidad" en ticket) → "Editar accesorio" / "Guardar cambios" | Cambia accesorio o cantidad | `PATCH /instalaciones/:id/equipos/:asignacionId` · `PATCH /tickets-materiales/:ticketId/:asignacionId` | ajusta la diferencia |
  | Eliminar (instalación) / Quitar (ticket; tooltips "Quitar el equipo", "Quitar y devolver al stock") | Quita la asignación | `DELETE …/:asignacionId` | devuelve stock / libera equipo |
  | Asignar equipo del inventario (icono enlace, solo filas sin equipo — instalación) → diálogo "Vincular equipo del inventario" (Cancelar/Vincular) | Vincula un equipo a una fila `producto` sin `equipo_id` | `PATCH /instalaciones/:id/equipos/:asignacionId/vincular-equipo` | no cambia estado |

- **Campos de formulario:**
  - **Productos** (`AgregarProductoModal`): "Categoría producto" (`GET /categories`), "Producto" (equipos `disponible` de esa categoría con `GET /equipos?categoria_id=…&estado=disponible&limit=0`; formato "SN: {serie} / Mac: {mac} ($ {costo})", con búsqueda), "Tipo de producto" (texto libre o "Antena", "Router", "Radio", "Switch"; se guarda en `descripcion`), "Condición" ("Préstamo/Comodato" por defecto, "Venta (Facturar)"); si es venta: "Precio de venta" (se precarga con el costo del equipo), "Forma de pago" ("Un solo pago", "Mensualmente", "Pago en 2 Cuotas" … "Pago en 12 Cuotas"; por defecto "Un solo pago") y "Tipo de factura" ("Factura de servicio" = `FACT. DE SERVICIO` por defecto, "Factura libre" = `FACT. LIBRE`). Botones "Cerrar" y "Agregar" (envío) ✅ FE:AgregarProductoModal.vue:15-27, 41-68, 169-286.
  - **Accesorios** (`AgregarAccesorioModal`): "Categoría" , "Accesorio" (`GET /equipos/accesorios?limit=0` filtrado en el navegador por categoría; formato "{nombre} (Stock: {n} Mts|Uds)") con la insignia "Stock disponible: N Uds|Mts" (en edición suma la cantidad ya asignada si no se cambia de accesorio), "Descripción" (se rellena con el nombre del accesorio) y "Cantidad (Unidades)" / "Cantidad (Metros)" según la categoría (`unidad_medida = metro`); reglas del campo: "Debe ser al menos 1" y "Máximo disponible: N Uds|Mts". Botones "Cerrar" y "Agregar" / "Guardar cambios" ✅ FE:AgregarAccesorioModal.vue:17-66, 102-111, 160-251.
  - Vincular equipo a una fila sin equipo: banner "Este ítem se planificó como "{descripción}" pero **no se eligió un equipo del inventario**. Elegí el equipo real que terminó en el cliente para recuperar la trazabilidad.", selector "Equipo del inventario" (placeholder "Buscar por N° serie, MAC o categoría…", `GET /equipos?limit=0`, **todos** los equipos, sin filtrar por estado; etiqueta "{categoría} · SN: {serie} · MAC: {mac}"; "No hay equipos en el inventario") ✅ FE:EditInstalacion.vue:285-345, 620-690. La fila se muestra con la insignia naranja "Sin equipo asignado" (tooltip "Es solo una nota de planificación. El equipo real nunca se eligió del inventario.") ✅ :497-517.
- **Filtros y columnas de tabla:** ver Secciones; sin filtros. El listado ordena por `created_at` descendente (`BE:materiales/materiales.service.ts:71-81`).
- **Estados posibles:** `condicion` de la asignación: `libre` (en desuso en la UI; en la instalación se muestra "Libre"), `prestamo_comodato`, `venta` ✅ BE:instalaciones/entities/instalacion-equipo.entity.ts:21-25. Tipo: `producto` (equipo) o `accesorio`.
- **Reglas de negocio (backend):** (todas ✅ BE:materiales/materiales.service.ts salvo indicación)
  - Todo ocurre en **una transacción**; el descuento es un único `UPDATE accesorios SET cantidad = cantidad - n WHERE id = … AND cantidad >= n` (:219-238) ⇒ dos técnicos a la vez no pueden dejar el stock negativo. Si no alcanza: 400 `Stock insuficiente de "{nombre}". Disponible: {n}, solicitado: {m}`; si el accesorio no existe: 404 "Accesorio no encontrado".
  - `tipo = producto` exige `equipo_id` ("equipo_id es requerido para tipo producto"); `tipo = accesorio` exige `accesorio_id` ("accesorio_id es requerido para tipo accesorio"); cantidad por defecto 1 (:99-113). Validación del cuerpo: instalación `CreateInstalacionEquipoDto` (`tipo` obligatorio, `cantidad` entera ≥ 1, `condicion` ∈ {libre, prestamo_comodato, venta}); ticket `AgregarMaterialTicketDto` (`tipo` ∈ {producto, accesorio}, UUID v4 en `equipo_id`/`accesorio_id`, `descripcion` ≤ 200, `tipo_pago` ≤ 30, `tipo_factura` ≤ 25). Los campos desconocidos (como `categoria_id`) se descartan sin error (`ValidationPipe whitelist`, `BE:main.ts:40-50`).
  - Reservar equipo (:264-275): solo rechaza si ya está `pendiente_asignacion` ("Este equipo ya está asignado a otra visita"); **no rechaza uno `no_disponible`** (la interfaz solo ofrece `disponible`, pero el endpoint no lo exige); "Equipo no encontrado" si no existe.
  - La fila guarda `precio_venta`, `tipo_pago` y `tipo_factura` **solo si `condicion = venta`** (:124-127), también en tickets.
  - Editar (:142-178): solo accesorios ("Solo se pueden editar asignaciones de accesorios"); cantidad mínima 1 ("La cantidad debe ser al menos 1"); al cambiar de accesorio primero toma del nuevo y luego devuelve el anterior; si no alcanza no se toca nada. Respuesta `Accesorio actualizado`.
  - Eliminar (:188-207): accesorio ⇒ devuelve cantidad; equipo ⇒ ejecuta el manejador del dueño: instalación (quita el cargo de venta no facturado, desvincula del servicio, `tipo_vinculacion = NULL`, estado `disponible`; sin vínculo solo libera el estado; BE:instalaciones/instalaciones.service.ts:1020-1064) o ticket (desvincula y `disponible`; BE:ticket/materiales/tickets-materiales.service.ts:78-82, 124-141). Luego borrado lógico de la asignación; respuesta "Asignación eliminada exitosamente". En el ticket, al desvincular se pone `equipo_id = NULL` en el servicio al que apuntaba `equipos.servicio_id` aunque el servicio ya apunte a otro equipo (BE:ticket/materiales/tickets-materiales.service.ts:124-141, línea 134).
  - **Finalizar la instalación** (crear el servicio desde ella): solo los equipos con condición **venta** (y precio > 0) se vinculan (estado `no_disponible`, `tipo_vinculacion='venta'`, `costo = precio_venta`) y generan **cargo recurrente** con la forma de pago elegida (por defecto "Un solo pago" y `FACT. DE SERVICIO`); este camino **no** copia el equipo a `servicios-clientes.equipo_id` (el de venta inmediata sí); los de **comodato no se vinculan** (siguen `pendiente_asignacion`) aunque la ventana de confirmación diga "se vinculará al servicio del cliente" ✅ BE:customers/customers.service.ts:402-417, 990-1076; FE:AgregarProductoModal.vue:119-126.
  - **Instalación ya `INSTALADO`:** `asignarEquipo` solo actúa si la condición es **venta** (vínculo + cargo inmediatos, y copia el equipo a `servicios-clientes.equipo_id`; con precio ≤ 0 no hace nada) ✅ BE:instalaciones/instalaciones.service.ts:849-968. Con **comodato** no hay vínculo (el equipo queda `pendiente_asignacion`), pero la interfaz avisa "Equipo vinculado al cliente" ✅ (FE:AgregarProductoModal.vue:151-153).
  - En un **ticket**, la entrega vincula el equipo al servicio del ticket en el acto (`servicio_id`, `estado no_disponible`, `tipo_vinculacion`: `venta`, `comodato` o ninguno si es `libre`/vacío) y fija `servicios-clientes.equipo_id` al nuevo equipo **sin desvincular el que ya tuviera ese servicio**; **no crea cargo** aunque la condición sea "venta"; si el ticket no tiene servicio, solo reserva (`pendiente_asignacion`) ✅ BE:ticket/materiales/tickets-materiales.service.ts:56-117. El diálogo de confirmación del frontend usa los textos de instalación en el ticket (sin estado: "El equipo se asignará a la instalación. Cuando se finalice la instalación, se vinculará al servicio del cliente." y éxito "Producto agregado a la instalación"), que no describen lo que ocurre ✅ FE:AgregarProductoModal.vue:113-126, 151-153; FE:MaterialesTicket.vue:121.
  - **Cancelar o eliminar** la instalación (o eliminar el ticket) **no** libera equipos ni repone accesorios: solo borra `pre_asignacion` (cancelar) o marca `deleted_at`; las filas de materiales siguen y, al estar la instalación borrada, `findAllEquipos` ya no la encuentra ✅ BE:instalaciones/instalaciones.service.ts:703-709, 832-845, 970-973; BE:ticket/ticket.service.ts:882-907.
  - **Cómo se libera un equipo atascado en `pendiente_asignacion`:** quitar la asignación en la pestaña Materiales (si la instalación o el ticket aún existen) o, desde Almacén → Equipos, editarlo o **Vincular a servicio** y luego **Desvincular**: al quedar `servicio_id` vacío `EquiposService.update` borra **definitivamente** todas las filas `instalacion_equipos` de tipo producto de ese equipo (también las de tickets) ✅ BE:equipos/equipos.service.ts:106-135 (ver ALM-009/ALM-010).
  - Restricciones de base de datos: cada fila cuelga de una instalación **o** de un ticket (`CHK_ie_un_dueno`) y `accesorios.cantidad >= 0` (NOT VALID) ✅ BE:migrations/1788200000000-MaterialesTicket.ts:23-56.
- **Efectos secundarios externos:** crea cargos recurrentes (facturación posterior); sin WhatsApp/MikroTik/SRI desde este módulo.
- **Mensajes de error/éxito (texto exacto):** FE equipos: "Seleccione un producto", "Ingresa un precio de venta mayor a 0", "Selecciona la forma de pago", "Selecciona el tipo de factura", "Producto agregado a la instalación", "Equipo vinculado al cliente", "Equipo vinculado y cargo generado", "Error al agregar producto"; accesorios: "Seleccione una categoría", "Seleccione un accesorio", "La cantidad debe ser al menos 1", "Solo hay {n} Uds|Mts disponibles", "Accesorio agregado", "Accesorio actualizado", "Error al guardar accesorio"; instalación: "Asignación eliminada" (diálogo "¿Eliminar {nombre}?" con "Se devolverán N unidad(es) al stock.", "Se removerá de la instalación y el equipo quedará disponible." o los textos de equipo vinculado), "Error al eliminar", "Elige un equipo del listado", "Equipo vinculado al registro de la instalación", "No se pudo vincular el equipo", "No se pudo cargar el listado de equipos"; ticket: diálogo "¿Quitar el equipo?" ("El equipo vuelve a quedar disponible en inventario y se desvincula del servicio del cliente.") / "¿Quitar el accesorio?" ("Se devuelven N Uds|Mts al stock."), "Material quitado", "No se pudo quitar el material", "No se pudieron cargar los materiales". Backend vincular: "equipo_id es requerido", "Asignación no encontrada", "Solo se puede vincular equipo a asignaciones de tipo producto", "Esta asignación ya tiene un equipo vinculado", "Equipo no encontrado", éxito "Equipo vinculado al placeholder"; ticket: "No se encontró el ticket".
- **Relaciones con otros módulos:** Instalaciones, Tickets, Clientes (servicio), Cargos recurrentes, Equipos/Accesorios (inventario, ALM-008 a ALM-015).
- **Casos límite y advertencias:** (1) equipos "huérfanos" `pendiente_asignacion` tras cancelar/eliminar visitas o tras finalizar/instalar con comodato (salida: ver regla anterior); (2) las asignaciones "placeholder" (`equipo_id` nulo) solo existen en datos antiguos porque el alta exige `equipo_id`; su botón de enlace vincula sin cambiar el estado del equipo ni crear cargo; (3) una venta en ticket guarda el precio pero no se factura en ningún sitio; (4) ver "no desvincula el equipo anterior" en tickets.
- **Preguntas probables de usuarios:**
  1. ¿Por qué el técnico no puede agregar 50 metros de cable? ("Stock insuficiente…").
  2. Cancelé la instalación y el cable sigue descontado, ¿cómo lo devuelvo? (quitar cada accesorio de la instalación).
  3. ¿Qué pasa con el router que le asigné a una instalación y nunca se hizo?
  4. Dejé el equipo en comodato y sigue "Pendiente Asignación" después de instalar, ¿qué hago?
  5. ¿Se factura el router que se vendió en un soporte? (no se crea cargo en el ticket).
  6. ¿Qué es el tipo de producto "Antena/Router/Radio/Switch"? (texto libre de la asignación).
  7. ¿Por qué el soporte me habla de "finalizar la instalación"? (el diálogo es compartido con instalaciones).
  8. ¿Quién puede agregar materiales a un ticket? (`tickets.edit`).
- **Pendiente de validar en UI:** ❓ aspecto de las dos pestañas Materiales y de la insignia "Sin equipo asignado" (el código y los textos están leídos).

---

## Hallazgos del dominio

> Se añaden aquí solo los hallazgos del cierre de lectura de ALM-016; los demás están en `notes/hallazgos.md`.

- **Cierre (ALM-016):** con la instalación ya `INSTALADO`, agregar un equipo en **Comodato** solo lo reserva (`pendiente_asignacion`; `asignarEquipo` solo actúa si la condición es `venta`), pero la pantalla confirma "El cliente ya está instalado: el equipo se vinculará automáticamente al servicio." y luego "Equipo vinculado al cliente" (`BE:instalaciones/instalaciones.service.ts:866-884` frente a `FE:pages/dashboard/instalaciones/components/AgregarProductoModal.vue:113-126, 151-153`).
- **Cierre (ALM-016):** en un ticket el diálogo compartido usa los textos de instalación ("El equipo se asignará a la instalación…", "Producto agregado a la instalación") y pide precio, forma de pago y tipo de factura para una venta que no genera cargo (`FE:pages/dashboard/tickets/components/MaterialesTicket.vue:121` + `AgregarProductoModal.vue`; `BE:ticket/materiales/tickets-materiales.service.ts:56-117`). El manual ya lo advierte en `guia/tickets.mdx`.
- **Cierre (ALM-016):** entregar un equipo en un ticket fija `servicios-clientes.equipo_id` al equipo nuevo sin desvincular el que el servicio ya tuviera; al quitar un equipo de un ticket se pone `equipo_id = NULL` en el servicio al que apuntaba `equipos.servicio_id`, aunque el servicio apunte ya a otro equipo (`BE:ticket/materiales/tickets-materiales.service.ts:116-141`).
- **Cierre (ALM-016):** la finalización de la instalación vincula las ventas con `UPDATE` de `Equipo` y no copia el equipo a `servicios-clientes.equipo_id`; la venta inmediata (instalación ya instalada) sí lo copia (`BE:customers/customers.service.ts:1015-1076` frente a `BE:instalaciones/instalaciones.service.ts:928-934`).
- **Cierre (ALM-016):** la pestaña **Materiales** de una instalación no comprueba permiso para agregar o quitar (se llega con `instalaciones.edit`); la de tickets exige `tickets.edit` solo en el frontend (`FE:…/EditInstalacion.vue:455-616` frente a `MaterialesTicket.vue:34`).
