# Inventario COB — Cobranza: registrar pago, promesas, transacciones, pasarelas, conciliación y tasa BCV
> Alcance: FE `src/pages/dashboard/{registrar-pago,promesas-pago,transacciones,cobros-pasarela,conciliacion-bancaria}/**` + `src/composables/{useFormPago,usePasarelasPago,useMoneda,useAnularMotivo,useFacturacion}.js` (solo lo relativo a cobro) · BE `src/{pagos,registro-pagos,facturas-pagos,transacciones,promesas-pago,conciliacion-bancaria,tasa-bcv,pago-mes-adelantado,servicios-recurrente-pagos}` y, de `pasarelas-pago`, solo el flujo de cobro (enlace, webhook, asentado). También se leyó (por ser la pieza que reactiva al cliente) `app.controller.ts`, `app.service.ts` y `app-queue.processor.ts`. Generado desde el ZIP del 2026-10-06.
>
> Convención de citas: `FE:` = `frontend-isp-main/src/`, `BE:` = `backend-isp-main/src/`. ✅ = leído en código. Nada está marcado 🖥️ (no hay instancia). Lo no confirmado va en "Pendiente de validar en UI" con ❓.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| COB-001 | Registrar pago: buscar cliente y elegir la factura | `/registrar-pago` (pestaña "Registrar pago") · `registrar.pago` | `registrar.pago` (entrada a la ruta), `registrar.promesa-pago` | completo |
| COB-002 | Registrar pago: formulario de cobro (forma de pago, monto, descuento, nota, N° transacción, sucursal) y botón Guardar | idem | `registrar.pago` | completo |
| COB-003 | Qué ocurre al guardar un pago (backend `PATCH /pagos/:id`: estado de factura, abono, log, día de pago) | — | solo JWT en backend | completo |
| COB-004 | Reactivación automática del servicio tras el pago (MikroTik / OLT) | — | — | completo (motor de cortes: ramas de pago; el resto de cortes lo cubre otro inventario) |
| COB-005 | Saldo restante y excedente → siguiente factura (cargos "saldo") | idem | — | completo |
| COB-006 | Pago de meses adelantados | idem | — | completo |
| COB-007 | Confirmar el pago de una factura electrónica ya emitida ("sin pago") | idem | `registrar.pago` | completo |
| COB-008 | Acciones tras pagar en Registrar pago: estado, descargar, imprimir, anular, editar, agregar otro abono | idem | **ninguna** (sin `validarPermisos`) | completo |
| COB-009 | Anular / revertir un pago (abono, pago completo, factura del mes, nota de crédito) | Registrar pago · Transacciones · ficha del cliente | `pagos-registrados.eliminar` / `finanzas.pagos-registrados.eliminar` / `cliente.factura.anular` | completo |
| COB-010 | Editar un pago registrado (modal "Editar Pago") | Transacciones · Registrar pago · ficha del cliente | `pagos-registrados.editar` / `finanzas.pagos-registrados.editar` / `cliente.factura.edit` | completo |
| COB-011 | Promesas de pago: listado | `/promesas-pago` · pestaña "Promesas de pago" | `promesa-pago.index` | completo |
| COB-012 | Promesas de pago: crear y editar | pestaña "Registrar pago" (Tipo de pago = Promesa de pago) · modal del listado · ficha del cliente | `registrar.promesa-pago`, `promesa-pago.crear`, `promesa-pago.editar` | completo |
| COB-013 | Promesas de pago: cancelar, notificar al cliente, historial y cliente reincidente | listado / modal | `promesa-pago.eliminar` | completo |
| COB-014 | Promesas de pago: ciclo de vida (activa/cumplida/incumplida/cancelada) y efecto sobre el corte | — | — | completo |
| COB-015 | Transacciones (pagos registrados): listado, filtros, columnas, "ver hoy" | `/transacciones/:showToday?` · `pagos-registrados.index` | `pagos-registrados.index`, `pagos-registrados.ver-otros` | completo |
| COB-016 | Transacciones: acciones por fila y reportes (PDF / Excel) | idem | `pagos-registrados.imprimir/editar/eliminar` | completo |
| COB-017 | Recibo / comprobante de pago: PDF, impresión térmica y envío al cliente | varias | `*.imprimir`, `cliente.factura.imprimir` | completo (plantillas PDF: solo entradas/salidas) |
| COB-018 | Cobros por pasarela: pantalla de control (estados, asentado, duplicados) | `/cobros-pasarela` · `cobros-pasarela.index` | `cobros-pasarela.index` | completo |
| COB-019 | Cobros por pasarela: generar y enviar el enlace de cobro | ficha del cliente → "Generar enlace de cobro" | `cliente.factura.add` | completo |
| COB-020 | Cobros por pasarela: webhook del gateway y asentado automático del abono | — (sistema) | firma HMAC | completo |
| COB-021 | Conciliación bancaria: pantalla y flujo de uso | `/conciliacion-bancaria` · `conciliacion-bancaria.index` | `conciliacion-bancaria.index/conciliar/exportar/eliminar` | completo |
| COB-022 | Conciliación bancaria: lectura del PDF con IA, cupo mensual y reglas de emparejamiento | — | — | completo |
| COB-023 | API externa de registro de pagos (bots / recaudadores) | `/api/registro-pagos` | token de integración o JWT | completo |
| COB-024 | Tasa BCV (solo instancias Venezuela) | Ajustes › Facturación | `variables.facturacion` | completo |
| COB-025 | Diagnóstico: "el cliente pagó y sigue pendiente / suspendido" | — | — | completo (análisis de código) |
| COB-026 | Recordatorios de pago (envío automático, ejecución bajo demanda y envío manual por factura; el módulo vive en `pagos/`) | Ajustes › Plantillas › "Recordatorio de pago"; ficha del cliente › Facturas | `variables.ver/edita.recordatorio.pago`, `cliente.send.recordatorio` | completo |
| COB-027 | Límite de facturas sin pagar para dejar de facturar a suspendidos | Ajustes › Facturación › "Facturas sin pagar para dejar de crear" | `variables.facturacion` | completo |
| COB-028 | "Día de pago al cobrar": interruptor del modal de pago (reemplaza el campo por cliente) | `/registrar-pago` · modal de pago del perfil del cliente | `registrar.pago` · `cliente.factura.add` (modal) | completo |
| COB-029 | Vencimiento por defecto de la factura manual con días de gracia (`ModalNuevaFactura`) | Perfil del cliente › Facturación/Pagos › Agregar factura | `cliente.factura.servicio` | completo |

> Estados reales de una factura (`pagos.estadoSRI`, columna compartida entre "estado de cobro" y "estado SRI"): `NO PAGADO`, `PENDIENTE` (con abonos, falta saldo), `PAGADO`, `AUTORIZADO`, `VALIDADA` (Factus), `ANULADO` y los de error del SRI (`ERROR ENVIO RECEPCION`, `DEVUELTA`, `NO AUTORIZADO`, `ERROR ENVIO AUTORIZACION`, `ANULACION - DEVUELTA`, …) — FE:pages/dashboard/registrar-pago/components/AccionesPago.vue:209-220, BE:pagos/entities/pago.entity.ts:79-80.

---

## COB-001 · Registrar pago: buscar cliente y elegir la factura
- **Ruta UI / name:** `/registrar-pago` · `registrar.pago` · menú lateral **Finanzas → Registrar Pago** (FE:layouts/SideBarMenu.vue:20-24; ruta en FE:router/routes.ts:32-37). Es una pantalla con 3 pestañas (ver abajo).
- **Archivos:** FE: `pages/dashboard/registrar-pago/TabsIndex.vue`, `components/FormPromisePay.vue`, `composables/useRegisterPay.js` · BE: `customers/customers.service.ts:1862-1929` (búsqueda), `pagos/pagos.controller.ts:126-138` + `pagos.service.ts:357-453` (facturas del servicio).
- **Para qué sirve:** localizar al cliente por nombre o documento, ver sus facturas pendientes (todas sus IPs/servicios) y elegir cuál cobrar o a cuál prometer pago.
- **Acceso:**
  - El guard de rutas exige que el rol tenga un permiso **con el mismo nombre que la ruta**: `registrar.pago` (FE:router/auth-guard.ts:136-137), salvo SUPER-ADMINISTRADOR. ✅
  - El ítem de menú se muestra con cualquiera de `registrar.pago`, `registrar.promesa-pago`, `finanzas.pagos-registrados.index`, `promesa-pago.index` (FE:layouts/SideBarMenu.vue:23). Un rol que solo tenga `registrar.promesa-pago` o `promesa-pago.index` **ve el ítem pero el guard lo rebota** (no tiene `registrar.pago`). ✅ (ver Hallazgos H-03)
- **Secciones / pestañas** (FE:TabsIndex.vue:25-39):
  | Pestaña (label) | `name` | Se muestra si | Contenido |
  |---|---|---|---|
  | **Registrar pago** | `registrar_pago` | `registrar.pago` **o** `registrar.promesa-pago` (l.26, 44) | Este formulario (`FormPromisePay` de `registrar-pago/components`) |
  | **Pagos registrados** | `pagos_registrados` | `finanzas.pagos-registrados.index` (l.31, 51) | La pantalla de Transacciones embebida (COB-015) |
  | **Promesas de pago** | `promesas_pago` | `promesa-pago.index` (l.36, 58) | El listado de promesas embebido (COB-011) |
  Las tres se montan con `v-if` y se alternan con `v-show` (se conserva el estado al cambiar de pestaña).
- **Campos de formulario:**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | **Buscar cliente por razón social o # Documento:** | `q-select` con búsqueda (`use-input`, debounce 600 ms) | sí | Se envía el texto en MAYÚSCULAS (l.52). Solo busca si hay al menos 1 carácter (l.54) | Opciones en HTML: `Razón Social: … N° Documento: …` (FE:useRegisterPay.js:91-94). Botón **Buscar otro cliente** (icon `restart_alt`, tooltip "Limpia y permite buscar un cliente distinto") limpia todo (l.179-189) |
  | **Factura a pagar:** | `q-select` | sí | Solo aparecen facturas del cliente en estado `NO PAGADO` o `PENDIENTE` (BE:customers.service.ts:1881-1886), agrupadas por IPv4 y ordenadas por fecha desc (FE:useRegisterPay.js:142-179) | Etiqueta de cada opción: `Valor pendiente: {precio del servicio} · N° Factura · Fecha pago · Plan · IPV4 · Dirección`. **"Valor pendiente" es el precio del servicio, no el saldo real de la factura** (l.163). Texto sin opciones: "Este cliente no tiene facturas pendientes por pagar." Si solo hay una factura se selecciona sola (l.182) |
  | **Tipo de pago:** | `q-select` | sí | Opciones: `Registrar pago y activar`, ` Solo registrar pago` (con espacio inicial), `Promesa de pago` (FE:FormPromisePay.vue:37) | **Solo "Promesa de pago" cambia algo.** Las dos primeras opciones ejecutan exactamente el mismo guardado y la misma llamada de reactivación (ver COB-002 / Hallazgos H-01) |
- **Filtros y columnas de tabla:** n/a (no hay tabla).
- **Estados posibles:** ver nota de estados arriba. En la lista desplegable se rotula `- PAGADO` (verde) o `- PENDIENTE` si la factura ya trae ese estado (l.219-243), y `- PROMESA DE PAGO` si ya tiene promesa activa y el tipo es "Promesa de pago" (l.244-255).
- **Reglas de negocio (backend):**
  - La búsqueda parte de `customers` y exige que **al menos un servicio del cliente esté en un router permitido** (`router.id IN (:routers)`): el front manda los routers del usuario o, si no tiene ninguno asignado, todos los routers activos de la empresa (FE:useRegisterPay.js:69-80). Busca por **nombre o número de documento** (cada palabra debe aparecer en uno de los dos, `ILIKE %…%`) — no busca por IP, teléfono ni N° de contrato (BE:customers.service.ts:1904-1922). ✅
  - Al elegir factura se pide `GET /pagos/find/{servicio_id}/{cliente_id}` **sin paginación explícita** → el backend devuelve solo las **5 facturas más recientes** del servicio (`rowsPerPage` por defecto 5, orden `created_at DESC`; BE:pagos.controller.ts:131-136, pagos.service.ts:386-394) y el front busca ahí la factura elegida (FE:useRegisterPay.js:200-204). Una factura más antigua que las 5 últimas no se carga (ver COB-025 y H-02). ✅
  - `GET /pagos/find/...` usa `ServiceTokenGuard`: acepta JWT de usuario **o** cabecera `x-service-token` (BE:pagos.controller.ts:127; BE:deploy/service-token.guard.ts). ✅
- **Efectos secundarios externos:** ninguno en esta fase (solo lecturas).
- **Mensajes de error/éxito (texto exacto):**
  - Sin facturas pendientes (solo visible con Tipo de pago = Promesa): "Este cliente no tiene ninguna factura pendiente de pago." (FE:useRegisterPay.js:137)
  - Factura con promesa activa: "Esta factura ya cuenta con una promesa de pago activo." (FE:FormPromisePay.vue:71)
  - Campo requerido: "Debes completar este campo".
- **Relaciones con otros módulos:** clientes (ficha del cliente tiene su propio botón "Agregar Pago" con modal casi idéntico: FE:pages/dashboard/clientes/components/modals/ModalPago.vue), facturas (crear-facturas), promesas-pago, transacciones.
- **Casos límite y advertencias:**
  - El buscador no lista clientes cuyos servicios estén en routers que el usuario no tiene asignados.
  - Si el cliente tiene varios servicios, aparecen las facturas de todos mezcladas (agrupadas por IP); reactivar el pago de una **solo reactiva ese servicio** (COB-004).
  - El selector muestra también facturas libres (`FACT. LIBRE`) pendientes, pero estas **no cuentan para el corte** (COB-025).
- **Preguntas probables de usuarios:**
  1. "¿Por qué no encuentro al cliente en Registrar pago?" (router no asignado, buscaste por IP/teléfono, escribiste el nombre con otro orden de palabras no importa — cada palabra se busca por separado).
  2. "¿Puedo buscar por IP o por cédula?" (cédula/RUC sí vía "N° Documento"; IP no).
  3. "¿Por qué dice 'Valor pendiente' $15 si debe $9.50?" (muestra el precio del plan).
  4. "El cliente tiene tres servicios, ¿a cuál factura pago?" (agrupadas por IP).
  5. "No me aparece la factura de hace 7 meses." (límite de 5 facturas, COB-025).
  6. "¿Qué diferencia hay entre 'Registrar pago y activar' y 'Solo registrar pago'?" (en el código, ninguna).
  7. "Soy cajero y veo 'Registrar Pago' pero me devuelve al inicio." (permiso `registrar.pago`).
- **Pendiente de validar en UI:** ❓ comportamiento visible cuando la factura elegida no está entre las 5 más recientes (el código solo hace `console.log`); ❓ si el ítem del menú realmente rebota a un usuario con solo `registrar.promesa-pago`; ❓ cómo se muestra la opción con espacio inicial ` Solo registrar pago`.

---

## COB-002 · Registrar pago: formulario de cobro y botón Guardar
- **Ruta UI / name:** `/registrar-pago` · `registrar.pago` (aparece al elegir una factura con Tipo de pago ≠ "Promesa de pago" y estado visual distinto de PAGADO/AUTORIZADO/ANULADO/PENDIENTE).
- **Archivos:** FE: `registrar-pago/components/PayComponent.vue`, `DetalleFacturaPago.vue`, `composables/useRegisterPay.js`, `src/composables/useFormPago.js`, `src/composables/useFacturacion.js`, `src/utils/mensaje-transaccion.js` · BE: `pagos/pagos.service.ts:462-715`, `pagos/dto/create-pago.dto.ts`, `sucursal` (secuencia de recibos).
- **Para qué sirve:** registrar un cobro (total o parcial) contra una factura de servicio, emitiendo recibo o factura electrónica y reactivando al cliente.
- **Acceso:** botón **Guardar** visible solo con `registrar.pago` (FE:PayComponent.vue:1077). El resto del formulario se ve con solo entrar a la pantalla.
- **Secciones:** (1) interruptor "Notificar pago al cliente", (2) forma de pago / detalle / N° transacción / sucursal, (3) resumen de la factura (tabla `DetalleFacturaPago`), (4) nota, importe total, descuento, monto, total, (5) avisos de saldo/excedente, (6) banner "Facturando a" (solo factura electrónica), (7) Meses adelantados y Plazo de pago, (8) Guardar.
- **Campos de formulario** (FE:PayComponent.vue; estado en FE:useFormPago.js:9-27):
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | **Notificar pago al cliente:** (toggle) | `q-toggle` | no | Valor inicial = preferencia guardada del servicio (`send_messages_preference`) o `true` (l.551) | Tooltip: "Envía al cliente el aviso de pago por WhatsApp / correo. El PDF del comprobante se adjunta o no según la configuración en Ajustes › Plantillas › Aviso de pagos recibidos." Al guardar se persiste como preferencia del servicio (`PATCH /customers/servicio/{id}/send-messages-preference`, l.295) |
  | **Forma de pago:** | `q-select` | **sí** | Lista = formas de pago **activas** de la empresa; primera opción `Seleccionar...` (FE:useFacturacion.js:153-195; useFormPago.js:50) | "Debes completar este campo" si vacío (useFormPago.js:73-78). Cambiarla limpia el detalle |
  | **Detalle Forma de pago:** | `q-select` | no | Detalles activos de la forma elegida; opción `Ninguno` | Se guarda el nombre (`detalle`) y el id (`detalle_id`) |
  | **Nº transacción:** `(opcional)` | `q-input` | no | Si se escribe: `POST /pagos/check-transaction`; si ya existe en **cualquier** pago no anulado del sistema → error "Ya fue ingresado este N° de transacción — Cliente: X · Factura N° Y" (FE:utils/mensaje-transaccion.js:3-9) | Es el único campo de "comprobante" del pago: **no existe campo para adjuntar imagen/soporte** (ver Hallazgos H-12). Se usa para conciliar (COB-022) |
  | **Sucursal a Facturar:** | `q-select` | sí | Solo se muestra si el usuario puede usar más de una sucursal; con una sola se asigna sola (useFormPago.js:121-126) | "Debes seleccionar una sucursal". Define establecimiento/secuencia del comprobante |
  | **Nota:** `(opcional)` | `q-input` | no | Si se escribe, mínimo 3 caracteres: "Debes agregar una nota mayor o igual a 3 caracteres" (useFormPago.js:86-90) | Se precarga con la plantilla de nota de pago (Ajustes › Facturación › "Nota por defecto al registrar un pago") o la de la red del servicio (PayComponent.vue:564-571) |
  | **Pagar Importe Total:** | `q-toggle` | no | Por defecto activo; al activarlo, Monto a Cancelar = Total a pagar | Con el toggle activo el monto es solo lectura |
  | **Descuento($):** `(IVA incluido)` | `q-input number` | no | Solo se ofrece si la factura **no tiene abonos** (`pagado <= 0`, l.208, 771). Tope = valor máximo calculado por `topeDescuentoCobro` (l.216-225); no negativo | El descuento se guarda en la factura (`descuento`) y se recalcula el resumen (l.506-511) |
  | **Monto a Cancelar:** | `q-input number` | **sí** | `step 0.01`, máximo 2 decimales (regex `^\d{0,9}(\.\d{1,2})?$`, useFormPago.js:54-67); `0` o vacío = error "Debes completar este campo" | Puede ser menor (pago parcial) o mayor (excedente) que el total |
  | **TOTAL A PAGAR:** | `q-input` solo lectura | — | Pendiente = `totalAbono + saldo-cargo - ya abonado` (l.529-531) | Con meses adelantados se recalcula (l.232-237) |
  | **Saldo restante pendiente:** (aviso) → casilla **Pasar a siguiente factura** + placeholder "Nota u observación (opcional)" (máx. 120 caracteres) | checkbox | no | Aparece si Monto < Total y no hay cargo previo (l.878) | Marcada: la factura queda `PAGADO` y el faltante viaja como cargo a la próxima factura (COB-005). Se preselecciona si el ajuste "Pasar saldo/excedente a la siguiente factura" está activo (l.559-562) |
  | **Excedente a favor:** (aviso) → casilla **Acreditar a siguiente factura** | checkbox | **sí, si hay excedente** | Si hay excedente y la casilla no está marcada, **no deja guardar** (useFormPago.js:92-94) y muestra "Debes aceptar esta opción para continuar" (l.959) | El excedente solo puede terminar como saldo a favor del cliente |
  | **Meses Adelantados** `(opcional)` | chips | no | Ver COB-006. Se oculta si `VITE_OCULTAR_MESES_PLAZO=true` o si el servicio tiene precio 0 | — |
  | **Plazo de pago** `(opcional)` — **OCULTO** (bloque comentado en `PayComponent.vue:1052-1075` y `ModalPago.vue:1048-1070`; el formulario sigue enviando `plazo: formPago.plazo ?? 0` y `unidad_tiempo: 'DIA'`, o sea 0 días) | — | no | Ya no se muestra; en su lugar va "Día de pago al cobrar" | La factura electrónica se emite sin plazo (`plazo` 0) |
  | **Día de pago al cobrar** `(opcional)` (COB-028): interruptor con texto `No mover el día (N)` / `Día N → hoy` | `q-toggle` | no | Solo si Ajustes › Facturación tiene `moverDiaPagoAlCobrar` **y** `moverDiaPagoPorCliente` (`PayComponent.vue:563`); dentro del bloque que se oculta con `VITE_OCULTAR_MESES_PLAZO=true` | Envía `mover_dia_pago` en el PATCH (`PayComponent.vue:378`) |
  | **Facturando a** (banner) | componente `BannerFacturacionTercero` | — | Solo si el comprobante es Factura; valida antes de guardar (l.260-262) | Permite emitir a nombre de un tercero (`comprador_override`) |
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | **Guardar** (icon `save`) | Valida y abre diálogo "Confirmar — ¿Deseas agregar este pago?" con botón **Enviar** (o **Eliminar facturas y cobrar** si el cobro arrastra la eliminación de facturas de meses adelantados) | `registrar.pago` | ver COB-003 | `validarDatos()` primero (l.241); si el comprobante no es "Recibo" y el cliente no tiene tipo/número de documento → aviso (l.246-258) |
- **Reglas de negocio (frontend, antes de enviar)** — todas ✅ en FE:PayComponent.vue:
  1. Si el cliente no tiene `tipo_documento` o `num_doc` y la factura no es Recibo → no avanza y avisa (l.246-258).
  2. Si es factura electrónica y la empresa no emite factura electrónica (`GET /companies/requiere-facturacion/{id}`) → **no se registra nada** (l.297-306), pero ya se guardó la preferencia de notificación (l.295).
  3. `valor` del abono = `min(montoCancelar, montoPendiente)`; si paga de más, el excedente va en `saldo` positivo (l.337-340).
  4. Número de recibo (`numAbono`): se asigna cuando el comprobante es Recibo **o** cuando el pago es parcial y "Crear factura por cada abono" está desactivado; se toma `secuencia_abono` de la sucursal **leída al abrir la pantalla** y se incrementa con `PATCH /sucursal/{id}` (l.358-365). Formato: 8 dígitos con ceros.
  5. `estadoSRI` enviado = `PAGADO` si queda saldo 0 **o** se marcó "Pasar a siguiente factura"; si no, `PENDIENTE` (l.369).
  6. **El estado visual de la factura se pone en `PAGADO` en el navegador antes de que el servidor responda** (l.379-380).
- **Mensajes de error/éxito (texto exacto):**
  - Éxito: "Pago agregado exitosamente" (l.497). Para factura electrónica además queda en espera del SRI (icono de reloj en "Estado factura").
  - "Para continuar con la emisión de la factura electrónica, es necesario que el cliente tenga registrado un número de documento." (l.254)
  - "La empresa no esta configurada para emitir factura electronica solo recibo, por favor configurar en el modulo empresa si desea continuar con el proceso." (l.303)
  - Mensaje de la nota "Saldo a siguiente factura: …" se concatena a la nota del abono (FE:useFormPago.js:135-145).
  - "Fallo al agregar el pago" existe (l.280) pero **no se dispara** ante errores de `save()` porque `save()` captura sus propios errores y solo hace `console.log` (l.499-501) → **no hay mensaje de error visible** si el PATCH falla (H-04).
- **Relaciones con otros módulos:** sucursal (secuencia de recibos), forma-pago/detalle-forma-pago, facturación electrónica (`POST /CE/facturas/generarFacturaElectronica`), servicios-recurrente (cargos "saldo"), pago-mes-adelantado, mensajería (WhatsApp/correo), settings (`facturarAbonos`, `pasarSaldoSiguienteAuto`, `plantillaNotaPago`).
- **Casos límite y advertencias:**
  - Un excedente **obliga** a acreditarlo; no hay opción "devolver al cliente" en el formulario.
  - Con "Crear factura por cada abono" **desactivado** (Ajustes › Facturación) y pago parcial en factura electrónica, el abono se registra como **recibo** y la factura electrónica se emite recién al completar el pago, por el acumulado (l.419-422, 432-436); en ese caso el flujo **termina sin llamar a la reactivación del servicio** (`return` en l.421) — como la factura sigue `PENDIENTE`, el servicio igualmente no cambia de estado (COB-025).
  - Dos cajeros abriendo la misma factura pueden usar el mismo `numAbono` (la secuencia se lee al abrir y se escribe desde el navegador).
  - El PATCH de la factura se envía **dos veces** cuando el comprobante es factura electrónica (uno antes y otro en paralelo con la emisión, l.382-386 y 461-466); el segundo no vuelve a crear meses adelantados (l.388-390).
- **Preguntas probables de usuarios:**
  1. "El cliente me pagó $20 y debía $15, ¿dónde queda el resto?" (saldo a favor en la próxima factura, obligatorio aceptarlo).
  2. "Pagó $10 de $15, ¿qué hago?" (pago parcial = factura `PENDIENTE`; o 'Pasar a siguiente factura' para cerrarla).
  3. "¿Por qué no me deja guardar?" (forma de pago vacía, monto 0, sucursal, excedente sin aceptar, nota de 1-2 caracteres).
  4. "Me dice 'Ya fue ingresado este N° de transacción'." (otro pago no anulado ya usa ese número; revisa cliente/factura que indica).
  5. "¿Puedo adjuntar la foto del comprobante?" (no existe campo).
  6. "¿Por qué no puedo poner descuento?" (solo si la factura no tiene abonos).
  7. "No salió ningún mensaje al cliente." (toggle desactivado, canal WhatsApp/correo apagado o cliente sin celular/correo — COB-003).
- **Pendiente de validar en UI:** ❓ aspecto real del aviso de excedente en rojo tras intentar guardar; ❓ qué ve el usuario cuando el PATCH devuelve 400/500 (el código no muestra error); ❓ valor de `VITE_OCULTAR_MESES_PLAZO` en producción; ❓ que el botón Guardar quede en estado "cargando" si el SRI tarda.

---

<!-- FIN-PARTE-1 -->
## COB-003 · Qué ocurre al guardar un pago (backend `PATCH /pagos/:id`)
- **Ruta UI / name:** sin pantalla propia: lo dispara **Guardar** de Registrar pago, el modal de pago de la ficha del cliente, "Confirmar pago", los cobros por bot/pasarela (vía `RegistrarAbonoService`, COB-023/COB-020) y "Editar Pago".
- **Archivos:** BE: `pagos/pagos.controller.ts:174-184`, `pagos/pagos.service.ts:495-715` (`update`), `pagos/dto/create-pago.dto.ts` (`UpdatePagoDto = PartialType(CreatePagoDto)`), `pagos/entities/pago.entity.ts`, `pago-mes-adelantado/*`, `servicios-recurrente-pagos/*`, `logs/*`.
- **Para qué sirve:** es **el único punto** donde se escribe un abono en la factura: el navegador manda el arreglo completo de `pagos` (abonos) y el estado; el backend lo persiste.
- **Acceso:** `@Auth()` = JWT válido + usuario activo; **no valida permisos finos** (ni `registrar.pago` ni ninguno) (BE:auth/decorators/auth.decorator.ts, BE:auth/guards/user-role/user-role.guard.ts). ✅ (H-06)
- **Entrada (DTO):** `pagos[]` (cada abono: `valor` numérico-texto obligatorio, `fecha_abono`, `fecha_hora_abono` ISO-8601 y `hora_abono` obligatorios, `forma_pago` y `forma_pago_id` obligatorios, `usuario` string; opcionales: `detalle`, `detalle_id`, `n_transaccion`, `saldo`, `nota`, `uuid`, `numAbono`, `estadoSRI`, `eliminado`, `sin_pago`, `grupo_comprobante`, `grupo_miembros`, `clave_idempotencia`, `anulacion`…), `estadoSRI`, `descuento`, `detalleFacturaLibre`, `meses_adelantados[]` (BE:create-pago.dto.ts:44-232). Header `sucursal-id`; query `num_comprobante` (solo para el texto del log).
- **Reglas de negocio (backend)** ✅:
  1. **No valida montos ni coherencia de estado**: el `estadoSRI` y el arreglo de abonos son los que manda el cliente (BE:pagos.service.ts:520-574). Quien llame a la API puede dejar una factura `PAGADO` sin importes.
  2. Si la factura tenía promesas y el nuevo estado es `PAGADO`/`AUTORIZADO`, las promesas activas pasan a `isActive=false` (BE:pagos.service.ts:510-518). El estado de ciclo "cumplida" lo termina de poner la sincronización (COB-014).
  3. Si el update agrega un abono, **protege el precio de los ítems**: si el cobro intentó cambiar el `precio` de un ítem ya guardado, se conserva el guardado y se deja un `warn` (BE:pagos.service.ts:534-558).
  4. **Recalcula `total_servicio`** desde los ítems **sin los ítems de tipo `saldo`** (BE:pagos.service.ts:560-567). ✅ (relevante para H-11)
  5. `updated_at` de la factura se fija en la `fecha_hora_abono` del primer abono del arreglo (el más reciente) (BE:pagos.service.ts:593-606). Es lo que usa Transacciones para ordenar.
  6. Invalida la caché `fecha-max-pago:{servicio}` (resumen del cliente) (BE:pagos.service.ts:576-578; common/utils/fecha-max-pago-cache.ts).
  7. Crea los meses adelantados y elimina facturas de esos meses (COB-006).
  8. **Ajuste "Actualizar día de pago al registrar el pago"** (`moverDiaPagoAlCobrar`): si la factura pasa de impaga a `PAGADO/AUTORIZADO` con un abono nuevo, **no es factura libre**, **no cubre meses adelantados** y el ajuste está activo, el `dia_pago` del cliente pasa al día del abono y se propaga a sus facturas abiertas (`NO PAGADO`/`PENDIENTE`, no libres) (BE:pagos.service.ts:718-841). Con "Elegir a qué clientes se les aplica" (`moverDiaPagoPorCliente`) solo ocurre si el PATCH trae `mover_dia_pago: true` (el interruptor del modal de pago; ya no existe el campo por cliente en la pestaña Facturación) — COB-028. Anular el pago no revierte el día. La respuesta trae `dia_pago_actualizado`.
  9. Registra log (`entityType: 'Pago'`): `CREATE_PAGO_FACTURA_SERVICIO` / `CREATE_PAGO_FACTURA_LIBRE` con el texto "Pago de factura de servicio #N agregado exitosamente" (BE:pagos.service.ts:674-699); `UPDATE_PAGO_*` si solo se editó un abono existente (con `num_comprobante` en el texto).
- **Efectos secundarios externos:**
  - **Nada de esto toca MikroTik/OLT**: `update()` no reactiva el servicio. La reactivación es una llamada aparte (COB-004).
  - **Factura electrónica**: la emisión es otra llamada del navegador, `POST /CE/facturas/generarFacturaElectronica` (COB-002). En cobros por bot/pasarela la encola el backend (COB-023).
  - **Aviso al cliente (recibo)**: `POST /pagos/message/recibos/enviar-whatsApp` encola el job `notificarCobro` (Bull `…-notificar-cobro`, 2 intentos, backoff 6 s) (BE:pagos.service.ts:288-307; pagos.controller.ts:117-124). El job (BE:pagos/notificar-cobro-queue.processor.ts:36-429): arma el PDF del recibo (solo si "adjuntar PDF" está activo), envía por **correo** (asunto configurable; por defecto "{empresa} - confirmación de pago, servicio de internet") si el correo está activo en Mensajería y por **WhatsApp** (canal oficial Cloud API con plantilla `pago_recibido_servicio` / `pago_recibido_libre`, o sesión Baileys con texto + PDF); registra cada envío en el historial de mensajes (`origen: 'notificar_cobro'`) y en el log del cliente (`SEND_EMAIL`, `SEND_WHATSAPP`, `*_ERROR`). Si WhatsApp está desvinculado crea una notificación interna "WhatsApp Desvinculado"; si el número no usa WhatsApp, "Cliente sin WhatsApp".
  - Para **factura electrónica** el aviso lo envía el proceso de facturación con el parámetro `send_messages` (no este job).
- **Mensajes de error/éxito (texto exacto):** respuesta `{ ok: true, msg: "Pago agregado exitosamente" }` (BE:pagos.service.ts:703-709). Errores de BD → 400 con el `detail` (código 23505) o 500 "Unexpected error, check server logs".
- **Relaciones con otros módulos:** facturas-pagos (comprobante), promesas-pago, servicios-recurrente(-pagos), pago-mes-adelantado, logs, settings, cola `notificar-cobro`, caché Redis.
- **Casos límite y advertencias:**
  - Un abono repetido (doble clic / reintento) **no se detecta** en este endpoint; la idempotencia existe solo en `RegistrarAbonoService` (bot/pasarela) y en la verificación `check-transaction` del navegador.
  - `check-transaction` se hace **solo en el navegador**: el backend de `update()` no vuelve a verificar duplicados de `n_transaccion`.
  - `POST /pagos/check-transaction` busca en **todos** los abonos del sistema con `estadoSRI != 'ANULADO'` (BE:pagos.service.ts:462-493). Si la consulta falla devuelve `exists: false` (no bloquea).
- **Preguntas probables de usuarios:**
  1. "¿Dónde queda registrado quién cobró y a qué hora?" (en el abono: `usuario`, `usuario_id`, `fecha_hora_abono`; y en el log del cliente).
  2. "El pago aparece guardado pero no llegó el WhatsApp." (canal apagado/desvinculado, cliente sin celular, toggle desactivado, o job fallido: ver log del cliente `SEND_WHATSAPP_ERROR`).
  3. "El día de pago del cliente cambió solo." (ajuste "Actualizar día de pago al registrar el pago").
  4. "¿Por qué la factura marca PAGADO si dejé saldo?" (se marcó "Pasar a siguiente factura").
- **Pendiente de validar en UI:** ❓ cómo se ve en el log del cliente la entrada `CREATE_PAGO_FACTURA_SERVICIO`; ❓ comportamiento real de la cola `notificar-cobro` (concurrencia).

---

## COB-004 · Reactivación automática del servicio tras el pago (MikroTik / OLT)
- **Ruta UI / name:** sin pantalla. Disparadores: `GET /activar-desactivar-servicio/{servicio_id}` (lo llama el navegador al final de cada cobro/anulación) y `RegistrarAbonoService.recalcularEstadoServicio` (bot/pasarela); también la creación/edición/cancelación de promesas (BE:promesas-pago.service.ts:123-124, 480, 520).
- **Archivos:** BE: `app.controller.ts:24-30`, `app.service.ts:484-499`, `app-queue.processor.ts:68-74, 114-707, 770-862`, `customers/customers.service.ts:2762-2815` (`suspenderServicio`), `mikrotik/mikrotik.service.ts:2406-2466` (`repararRouter`) · FE: `PayComponent.vue:493-496`, `AccionesPago.vue:108`, `ConfirmarPagoSinPago.vue:95,135`, `ActionCellRenderer.vue:346`.
- **Para qué sirve:** después de cualquier cambio de pago, reevaluar **ese servicio** y, si ya no debe estar suspendido, volver a habilitarlo en la BD, en la OLT y en el router. Es asíncrono (job Bull `verifyAndApplyServiceStatus`).
- **Acceso:** `@Auth()` (JWT). Sin permiso fino.
- **Reglas de negocio (backend)** ✅ — `repararYSetearEstadosServicios` con `servicio_id`:
  1. Se cargan solo servicios con `deleted = false` y, de cada uno, sus facturas en `NO PAGADO` o `PENDIENTE` **excluyendo `FACT. LIBRE`** con sus promesas (BE:app-queue.processor.ts:119-141, 161). Los **clientes retirados** quedan fuera; por eso el front ni siquiera llama a la reactivación si el servicio está "retirado" (FE:PayComponent.vue:493-496).
  2. La tolerancia sale del campo "aplicar corte" del cliente (`factura_id.aplicar_corte`): `Desactivado`, `N Mes(es) Vencido(s)` (N=1..12) o `N Mes(es) Desde Último Pago` (FE:pages/dashboard/ajustes/base-datos/components/CambiosMasivos.vue:60; FE:pages/dashboard/clientes/components/FactAndNot.vue:162-171). Los días de gracia salen de `factura_id.dia_gracia` ("N días") (BE:app-queue.processor.ts:207-211, 363, 370).
  3. **Servicios con `precio = 0` o con corte `Desactivado` no entran en las ramas de suspender/activar** (BE:app-queue.processor.ts:223, 340, 540-583): un pago no los reactiva.
  4. **Rama "N Meses Vencido"** (BE:app-queue.processor.ts:340-431):
     - Si el servicio tiene **≥ N facturas pendientes**: se toma la **N-ésima más antigua** (orden `dia_pago` ascendente) como la que dispara el corte. Su fecha de corte = `dia_pago + días de gracia`; **si esa factura tiene promesa activa, la fecha de corte pasa a ser la `fecha_limite` de la promesa**, pero nunca anterior al vencimiento original (l.348-373). Si hoy ≥ fecha de corte → **suspender**; si no → **activar** si estaba inactivo (l.393-415).
     - Si tiene **< N facturas pendientes** y estaba inactivo (o es ONU de SmartOLT/AdminOLT) → **activar** (l.416-430).
     - Suspender exige `diasPermitidos.length > 0` (días de corte del router o globales) y que hoy sea día de corte **o** que la llamada sea por un servicio puntual (`servicio_id`) (l.388-398). Es decir: tras un pago/anulación se suspende "ya" aunque hoy no sea día de corte.
  5. **Rama "Desde Último Pago"** (l.223-339): toma la última factura `PAGADO/AUTORIZADO` no libre (por `dia_pago` desc), le suma N meses + días de gracia, y considera el **último mes adelantado**; si hay facturas pendientes compara su `dia_pago + gracia` con hoy; si no hay pendientes, activa mientras hoy < esa fecha base y suspende después. Si **nunca ha pagado** (sin factura pagada) → **activa** (l.325-339).
  6. Efecto en BD: `suspenderServicio(id,'activar'|'inactivar')` cambia solo `isActive` y registra log `ACTIVAR_SERVICIO` ("Servicio activado") / `SUSPENDER_SERVICIO` ("Servicio suspendido") sin usuario (BE:customers.service.ts:2762-2815).
  7. **OLT**: si el cliente tiene ONU en SmartOLT o AdminOLT y el corte aplica a OLT (`aplicarCortes.smartOLT/adminOLT`) llama a habilitar/deshabilitar ONU, solo si hubo transición de estado o se pidió sincronizar; los errores se tragan y avisan a Slack (BE:app-queue.processor.ts:81-112, 213-219).
  8. **MikroTik**: tras evaluar, `repararRouter(routerId, false, servicio_id)` empuja **solo ese servicio** al router (secrets PPPoE, listas de corte, amarres) y solo para routers con `isActive=true` (BE:app-queue.processor.ts:172-175, 604-634; mikrotik.service.ts:2406-2466). Si el router falla se programa `reintentarRoutersFallidos`: cada 60 s hasta 6 intentos para un servicio puntual, y aviso a Slack al agotarlos (l.653-689, 770-862). **El operador no ve ese error en pantalla.**
  9. Antes de evaluar el job borra la caché `…-customers` (l.69-71).
- **Efectos secundarios externos:** MikroTik (REST/API RouterOS), SmartOLT/AdminOLT, Slack (`URL_SLACK`), Redis/Bull.
- **Mensajes de error/éxito:** ninguno visible: el endpoint responde de inmediato tras encolar (`verifyAndApplyServiceStatus` no espera el resultado, BE:app.service.ts:484-499). El texto "Pago agregado exitosamente" se muestra **antes** de que el router procese.
- **Relaciones con otros módulos:** cortes (programación y días de corte, cubierto en otro inventario), routers, SmartOLT/AdminOLT, promesas, facturación.
- **Casos límite y advertencias:**
  - Pagar la factura **más reciente** no reactiva si sigue pendiente una anterior que ya cumplió su fecha de corte (la N-ésima más antigua sigue vencida).
  - Pago **parcial** (`PENDIENTE`) sigue contando como factura pendiente.
  - Pagar una **factura libre** no tiene efecto sobre el servicio.
  - El navegador es quien llama a la reactivación: si se cierra la pestaña entre "guardar" y la llamada, el servicio se reevalúa recién en el próximo corte programado (el motor re-activa a los inactivos con pendientes < N).
- **Preguntas probables de usuarios:** ver COB-025.
- **Pendiente de validar en UI:** ❓ tiempos reales de reactivación en el router; ❓ qué pasa con servicios cuyo router está marcado inactivo (la BD cambia, el router no se toca).

---

## COB-005 · Saldo restante y excedente → siguiente factura (cargos "saldo")
- **Ruta UI / name:** parte del formulario de COB-002; los cargos resultantes se ven en la ficha del cliente → pestaña **Cargos** y como línea en la próxima factura.
- **Archivos:** FE: `PayComponent.vue:392-415`, `clientes/composables/useEditCliente.js:353-387`, `DetalleFacturaPago.vue` · BE: `servicios-recurrente/servicios-recurrente.service.ts` (create), `servicios-recurrente-pagos/servicios-recurrente-pagos.service.ts:29-306`, `pagos/helpers/facturacion-utils.ts:313-388`, `facturas-pagos/facturas-pagos.service.ts:362-400`.
- **Para qué sirve:** cuando el cliente paga de más o de menos, la diferencia se traslada a la factura siguiente como un ítem `tipo: 'saldo'` (precio negativo = a favor; positivo = en contra).
- **Reglas de negocio** ✅:
  - **Pagó de menos y marcó "Pasar a siguiente factura":** abono con `saldo = -restante`; factura queda `PAGADO`; se crea un cargo "Un solo pago" con ítem `saldo` precio **+restante**, descripción "Saldo pendiente de la factura #N" (FE:useEditCliente.js:353-387). La nota opcional (máx. 120) viaja en `detalleItems.nota` y se ve en **Cargos**, **no** en la descripción impresa (FE:useFormPago.js:128-145).
  - **Pagó de más (obligatorio aceptar):** abono con `saldo = +excedente`; cargo con ítem `saldo` precio **−excedente**, descripción "Saldo a favor de la factura #N" (FE:PayComponent.vue:404-415).
  - **Consumo:** el cargo se añade como línea a la próxima factura que genere el sistema; un saldo a favor **se consume solo hasta cubrir el total del servicio** de esa factura y el remanente queda activo para las siguientes hasta agotarse (BE:servicios-recurrente-pagos.service.ts:107-193). Se reconoce por la descripción que contiene "saldo a favor" (l.37-41, 229-232).
  - **Cálculo del total:** el saldo a favor se resta del total ya con impuestos, el saldo en contra se suma, y el total nunca baja de 0 (BE:facturacion-utils.ts:358-367).
  - **Si se anula el abono** que generó el saldo, el cargo vinculado se elimina (o se revierte a ACTIVO si ya se usó en otras facturas) (BE:servicios-recurrente-pagos.service.ts:275-306; llamado en pagos.service.ts:1023, 1157, 934).
  - **Bot/API:** por defecto el excedente **no** se acredita (`aplicar_excedente_a_favor: false`) y el faltante deja la factura `PENDIENTE` (`pasar_saldo_siguiente: false`); ambos son opt-in (BE:registrar-abono.service.ts:200, 339-348). La pasarela de pago sí acredita el excedente (`aplicar_excedente_a_favor: true`, BE:pasarelas-pago/aplicar-pago.service.ts:75).
  - **Transacciones** muestra el saldo en la columna "Saldo": `+x` azul = a favor, `-x` rojo = trasladado como deuda; y "Cobrado" = valor aplicado + saldo a favor (FE:useTransation.js:186-203; IndexPage.vue:579).
- **Casos límite y advertencias:**
  - El enlace entre un cargo "saldo" y su factura de origen es **por texto**: se busca `LIKE '%#{no_factura}%'` en la descripción (BE:facturas-pagos.service.ts:322-376). Editar la descripción rompe el vínculo.
  - En la pantalla "Detalle" de la factura aparecen "Saldo a favor (próxima factura)" y "Cargo pendiente (próxima factura)" (FE:DetalleFacturaPago.vue:151-169).
- **Preguntas probables:** "¿Cómo le devuelvo el excedente?" (no hay devolución en el sistema: solo saldo a favor); "¿Por qué la próxima factura sale con descuento?" (saldo a favor aplicado); "¿Puedo borrar el saldo a favor?" (anulando el abono o eliminando el cargo en Cargos).
- **Pendiente de validar en UI:** ❓ aspecto de la nota del saldo en la pestaña Cargos; ❓ qué muestra el cálculo cuando hay saldo previo y descuento a la vez (H-11).

---

## COB-006 · Pago de meses adelantados
- **Ruta UI / name:** sección **Meses Adelantados** del formulario de COB-002 (y de `ModalPago` en la ficha del cliente).
- **Archivos:** FE: `PayComponent.vue:81-237, 979-1070` · BE: `pagos/pagos.controller.ts:148-152`, `pagos/pagos.service.ts:580-586, 1199-1288`, `pago-mes-adelantado/*` (entidad `pago_mes_adelantado`), `crear-facturas/crear-facturas.service.ts:327-331, 491-503, 660-668`.
- **Para qué sirve:** cobrar de una vez el mes de la factura y N meses siguientes, sin que el sistema vuelva a generar esas facturas.
- **Acceso:** visible si el servicio tiene precio > 0 y `VITE_OCULTAR_MESES_PLAZO` no es `'true'` (FE:PayComponent.vue:84, 980, 985).
- **Cómo funciona (UI):** muestra un chip fijo con el mes de la factura (tooltip "Mes de la factura que se va a pagar (no se puede quitar)") y los **11 meses siguientes** (`mesesAdelantables`). Cada chip puede estar: **disponible** (gris), **con factura** (naranja, icono advertencia: "Se eliminará la factura #N al adelantar este mes"), **ya adelantado** o **pagado** (bloqueados, candado). La selección es **continua**: elegir un mes marca todos los anteriores; un mes bloqueado en medio impide avanzar ("Hay un mes intermedio que no se puede adelantar") (FE:l.154-190). Aviso naranja persistente: "Se eliminará la factura N° … porque ese mes se adelanta en este pago." Al guardar, el diálogo cambia el botón a **Eliminar facturas y cobrar**.
- **Reglas de negocio (backend)** ✅:
  1. `GET /pagos/meses-adelantables/{pago_id}`: 11 meses desde el `dia_pago` de la factura. Estado por mes: `adelantado` (ya hay fila activa en `pago_mes_adelantado` — "Ese mes ya fue adelantado en otro pago"), `pagado` (la factura del mes está `PAGADO/AUTORIZADO/VALIDADA/PENDIENTE` — no se toca porque tiene dinero asociado), `con_factura` (existe y está `NO PAGADO`), `disponible` (no hay factura) (BE:pagos.service.ts:1199-1251).
  2. Al guardar con `meses_adelantados` se crean filas `pago_mes_adelantado` (pago origen, servicio, mes, año) y se **eliminan (soft-delete, con motivo "Mes adelantado en el pago de la factura #N")** las facturas `NO PAGADO` de esos meses; si no están `NO PAGADO` se omite con `warn`; si falla una, **no tumba el pago** y el operador debe eliminarla a mano (BE:pagos.service.ts:580-586, 1253-1288).
  3. **Importe:** con N meses, el resumen se recalcula desde los ítems (no multiplicando un mes ya redondeado) (FE:PayComponent.vue:194-205); el saldo se aplica una sola vez (BE:pagos.service.ts:1465-1487).
  4. **Generación de facturas:** el job de creación de facturas **no genera** la factura de un mes que figure como adelantado (BE:crear-facturas.service.ts:327-331, 491-503, 660-668).
  5. **Corte "Desde Último Pago"** y la fecha prevista de corte consideran el **último mes adelantado** (BE:app-queue.processor.ts:236-251, 451-463; crear-facturas.service.ts:247-260).
  6. **Recibo/PDF:** `preparaDatosRecibo` multiplica la cantidad de los ítems por `1 + meses` (BE:pagos.service.ts:1459-1487).
  7. **No mueve el día de pago** aunque el ajuste esté activo (BE:pagos.service.ts:748-750).
  8. **Bot y pasarela no soportan meses adelantados** (comentario de diseño: BE:registrar-abono.service.ts:55-58); la consulta de deuda los separa en `facturas_adelantadas` y no los incluye en `total_deuda` (BE:consulta-deuda.service.ts:140-166).
  9. Al **anular el pago** las filas de meses adelantados se marcan `anulado=true` (BE:pagos.service.ts:1019, 1155). **Las facturas que se eliminaron al adelantar no se recrean**: el generador de facturas cuenta las eliminadas como "ya hubo factura en el periodo" (BE:crear-facturas.service.ts:778-800, usa `withDeleted`). ✅ (H-13)
- **Mensajes (texto exacto):** tooltip de chip con factura "Se eliminará la factura #N al adelantar este mes" (backend); "Ese mes ya fue adelantado en otro pago"; "Ese mes ya tiene la factura #N cobrada" (BE:pagos.service.ts:1223, 1245).
- **Relaciones:** crear-facturas, cortes, recibos, ficha del cliente.
- **Preguntas probables:** "¿Puedo pagar 3 meses y que no me genere las facturas?" (sí, chips); "¿Por qué no puedo seleccionar abril si marqué marzo?" (hay un mes bloqueado en medio); "Anulé el pago de 3 meses, ¿por qué no volvieron las facturas?" (H-13).
- **Pendiente de validar en UI:** ❓ aspecto de los chips y del diálogo; ❓ qué ocurre con servicios prepago (cálculo de `dia_pago` del mes de la factura).

---

## COB-007 · Confirmar el pago de una factura electrónica ya emitida ("sin pago")
- **Ruta UI / name:** `/registrar-pago` → al elegir una factura cuyo abono vigente es `sin_pago`, en vez del formulario aparece la tarjeta **Confirmar pago**.
- **Archivos:** FE: `registrar-pago/components/ConfirmarPagoSinPago.vue` · BE: `grupos-facturacion/grupos-facturacion.service.ts:597-740`, `facturacion-automatica/facturacion-automatica.service.ts:255-330`, `pagos/pagos.service.ts` (update).
- **Para qué sirve:** la facturación automática emite la factura electrónica **antes** de que el cliente pague (abono "sin pago", `valor 0`, nota "Factura generada automáticamente"); aquí solo se registra el pago, **sin emitir otra factura**.
- **Campos:** **Nº transacción:** (placeholder "Opcional"), **Notas:** (placeholder "Opcional"). Muestra "Total Factura Electrónica" y "Forma de pago" de la factura.
- **Botones:** **Confirmar pago** (icon `check_circle`) → diálogo "Confirmar" con "¿Registrar el pago de esta factura electrónica?" (o "Se registrará el pago de las N órdenes de cobro de esta factura de grupo. ¿Continuar?"), botones **Confirmar** / **Cancelar**.
- **Reglas** ✅:
  - Si el comprobante cubre varias órdenes (grupo de facturación), `POST /grupos-facturacion/confirmar-comprobante` convierte el ítem `sin_pago` en pago real **en todas las órdenes** del comprobante; si alguna falla, **revierte las ya confirmadas** a `NO PAGADO` y responde "No se pudo confirmar el pago del grupo: … No se registró ningún pago." (BE:grupos-facturacion.service.ts:597-715).
  - Si no es grupo: arma el abono conservando `uuid` y `estadoSRI` y manda `PATCH /pagos/{id}` con `estadoSRI: 'PAGADO'` (FE:ConfirmarPagoSinPago.vue:98-130).
  - Verifica `n_transaccion` repetido (mismo mensaje "Ya fue ingresado este N° de transacción").
  - Después llama a la reactivación de cada servicio (COB-004) salvo clientes retirados.
- **Mensajes:** "Pago registrado correctamente"; "Pago registrado en N órdenes de cobro del grupo"; error: el `message` del backend o "Error al registrar el pago" (FE:ConfirmarPagoSinPago.vue:92,132,141).
- **Casos límite:** la bandera `sin_pago` excluye ese ítem de conciliación bancaria (COB-022), de "Cobrado" y de los estados de factura (BE:facturas-pagos.service.ts:254-269); en Transacciones aparece solo con el filtro "Generado automáticamente".
- **Preguntas probables:** "La factura ya salió en el SRI pero el cliente no ha pagado, ¿cómo registro el pago?" (esta tarjeta); "¿Se emite otra factura?" (no).
- **Pendiente de validar en UI:** ❓ cómo se ve "Total del comprobante · N órdenes" con datos reales.

---

<!-- FIN-PARTE-2 -->
## COB-008 · Acciones tras pagar en Registrar pago (estado, descargar, imprimir, anular, editar, agregar otro abono)
- **Ruta UI / name:** `/registrar-pago` → panel a la derecha del selector de factura, visible cuando el estado de la factura elegida es `PAGADO`, `AUTORIZADO`, `ANULADO` o `PENDIENTE` (o mientras se espera al SRI) y el tipo de pago ≠ "Promesa de pago" (FE:FormPromisePay.vue:343-376).
- **Archivos:** FE: `registrar-pago/components/AccionesPago.vue`, `clientes/components/modals/ModalEditarPago.vue`, `transacciones/composables/useTransation.js` (imprimir), `src/composables/useFacturacion.js` (anularFactura, descargarComprobantes) · BE: `pagos/pagos.controller.ts`, `facturas-pagos/facturas-pagos.controller.ts`, `comprobantes-electronicos/facturas/facturas.service.ts:249-400`.
- **Para qué sirve:** ver en qué quedó el cobro (estado del comprobante), descargar/imprimir el recibo o la factura, anular o editar el último pago, o agregar otro abono si quedó `PENDIENTE`.
- **Acceso:** ⚠️ **ninguno de estos botones consulta permisos** (`AccionesPago.vue` no usa `useRolPermisos`): se muestran según el estado de la factura. Quien entra a la pantalla con `registrar.pago` puede anular y editar. ✅ (H-05)
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | **Estado factura:** + insignia | Muestra `estadoSRI` del comprobante (`AUTORIZADO`/`VALIDADA` verde, `ANULADO` rojo, otros naranja con tooltip = `respuestaSRI`) y un reloj mientras espera al SRI | — | `GET /pagos/find-pay-by-id/{id}`, `GET /facturas-pagos/{uuid}` | Se refresca por WebSocket (`updateStateInvoice`, `anulacion`) (FE:layouts/Notifications.vue:162-172, 227-229) |
  | Botón redondo (icon `fa-retweet`, tooltip "Emitir Factura Electrónica") | Reintenta enviar al SRI | — | `POST /CE/facturas/autorizacionComprobantesOffline` `{ id: abono }` | Solo si el estado es `ERROR ENVIO RECEPCION`, `ERROR ENVIO RECEPCION - ANULACION`, `DEVUELTA`, `ANULACION - DEVUELTA`, `ERROR ENVIO AUTORIZACION`, `NO AUTORIZADO`, `ERROR ENVIO AUTORIZACION - ANULACION` (l.209-220) |
  | **Descargar comprobante** (menú) → **Descargar RIDE** (Ecuador) / **Descargar PDF** (otros países), **Descargar XML**, **Descargar Nota Credito**, **Descargar XML Nota Credito**, **Descargar recibo (PDF)** | Descarga desde el servicio externo de facturación (`VITE_HOST_API_FACTURACION /v1/factura/descarga/{tipo}/{clave}`; en Colombia desde Factus por número) o genera el recibo PDF | — | `POST /pagos/pdf/factura-abono` `{ pago_id, fecha }` para el recibo | "Descargar recibo (PDF)" solo cuando **no** hay factura electrónica autorizada; "Nota Crédito" solo si el estado es `ANULADO` (l.257-326) |
  | **Imprimir comprobante** (icon `print`) | Imprime el último abono: PDF o impresión térmica | — | `POST /pagos/pdf/{pago_id}/factura_servicio/{fecha_hora_abono}` o `GET /pagos/datos-recibo/...` + `POST http://localhost:3008/api/impresion` | Ver COB-017 |
  | **Anular pago** (icon `cancel`) | Pide motivo (título "¿Estás seguro de anular este pago?") y anula; ver COB-009 | **ninguno** | `PATCH /pagos/anular-abono/{uuid}/{pago_id}` y/o `POST /CE/facturas/anularFactura`; luego `GET /activar-desactivar-servicio/{id}` | Visible si estado ∈ {`AUTORIZADO`,`PAGADO`,`VALIDADA`} (l.343-359). Éxito: "Pago eliminado exitosamente" (solo en la rama recibo) |
  | **agregar pago** (icon `add_circle`) | Recarga el formulario de cobro para otro abono | — | `GET /pagos/find/...` | Visible si el estado es `ANULADO` o `PENDIENTE` (l.361-372) |
  | **Editar pago** (icon `edit`) | Abre el modal "Editar Pago" (COB-010) | **ninguno** | `PATCH /pagos/{id}` | Visible si estado ∈ {`AUTORIZADO`,`PAGADO`,`VALIDADA`} (l.374-386) |
  | **Nuevo pago** (icon `add_circle`, tooltip "Limpia el formulario para registrar otro pago desde cero") | Reinicia la pantalla | — | — | (FE:FormPromisePay.vue:362-374) |
- **Reglas de negocio (frontend)** ✅:
  - **Cuándo aparece el panel:** en la práctica, **justo después de guardar un pago en esta misma pantalla**. El selector solo trae facturas `NO PAGADO`/`PENDIENTE` y `getPagosServicio` fuerza el estado en `NO PAGADO` al elegir una factura (FE:useRegisterPay.js:206-207); el estado real (`PAGADO`, `PENDIENTE`, `AUTORIZADO`…) se carga con `getPay()` tras guardar (FE:useRegisterPay.js:259-286) o cuando llega el aviso por WebSocket. Para pagos antiguos se usa Transacciones o la ficha del cliente.
  - **Anular desde esta pantalla**: si el estado del último abono es `PAGADO`, anula **solo ese abono** (`pagos[0]`) con `anular-abono`. Si es `AUTORIZADO`/`VALIDADA`, primero anula (sin nota) todos los abonos no electrónicos `PAGADO` y luego emite **nota de crédito** del comprobante autorizado con `anularFactura(data, false, false, { motivo, autor })` (l.72-106). **Siempre** termina con `GET /activar-desactivar-servicio` (l.108).
  - La rama `PAGADO` no tiene `try/catch`: si el servidor rechaza (p. ej. por el motivo obligatorio) el botón queda en estado "cargando" y no hay mensaje (l.78-87) (H-04).
  - El tipo de comprobante mostrado en descargas se decide por **lo que realmente se emitió** (`estadoSRI` ∈ AUTORIZADO/VALIDADA/ANULADO y clave de acceso), no por la configuración del servicio (l.45-55).
- **Relaciones:** facturación electrónica (SRI/Factus), WebSocket, recibos (COB-017).
- **Preguntas probables:** "¿Cómo anulo un pago que me equivoqué?" (COB-009); "Salió 'DEVUELTA' en el estado, ¿qué hago?" (botón de reintento); "¿Dónde bajo el XML?"; "Imprimí y no salió nada" (impresora térmica local, COB-017).
- **Pendiente de validar en UI:** ❓ aspecto del panel en pantallas pequeñas (posición absoluta a la derecha); ❓ ausencia real de bloqueo por permisos.

---

## COB-009 · Anular / revertir un pago
- **Ruta UI / name:** hay **cuatro puertas** a la misma lógica:
  1. Registrar pago → **Anular pago** (COB-008).
  2. Transacciones → botón **Eliminar Pago** (icon `delete`, tooltip "Eliminar Pago"; en móvil menú ☰) (FE:ActionCellRenderer.vue:185-205, 76-95).
  3. Ficha del cliente → pestaña Facturación/Pagos: **anular abono** (`PagoItem`, `cliente.cancelar.pago`), **anular los pagos de la factura** (`IndexFacturas.anularPago`, `cliente.factura.anular`), **Anular Factura / Hacer activo la factura** (factura del mes), **Eliminar Factura** (`cliente.factura.eliminar`).
  4. API externa: `POST /api/registro-pagos/anular` (COB-023).
- **Archivos:** FE: `registrar-pago/components/AccionesPago.vue:72-109`, `transacciones/ActionCellRenderer.vue:312-355`, `src/composables/useAnularMotivo.js`, `clientes/components/editar/{IndexFacturas,PagoItem}.vue`, `clientes/composables/useEditCliente.js:300-352` · BE: `pagos/pagos.controller.ts:203-243`, `pagos/pagos.service.ts:888-1347`, `comprobantes-electronicos/facturas/facturas.service.ts:249-400`, `registro-pagos/anular-cobro.service.ts`, `servicios-recurrente-pagos`, `pago-mes-adelantado`.
- **Para qué sirve:** revertir el dinero registrado en una factura (y, si hay factura electrónica autorizada, anularla ante el SRI con nota de crédito).
- **Acceso (clave):** Transacciones: `pagos-registrados.eliminar` **o** `finanzas.pagos-registrados.eliminar`. Ficha del cliente: ver arriba. Registrar pago: ninguna (H-05). **Backend: solo JWT.**
- **Diálogo de motivo** (`pedirMotivoAnulacion`): lee la configuración Ajustes › Facturación › "Pedir motivo al anular factura/pago" (`anulacionPedirMotivo`, por defecto sí) y "Motivo de anulación obligatorio" (`anulacionMotivoObligatorio`, por defecto sí). Textarea con etiqueta **"Motivo de anulación *"** (o "Motivo de eliminación *" en eliminar), hint "Indique por qué se anula (mínimo 3 caracteres)" / "Puede dejarlo vacío"; botones **Anular** / **Eliminar** y **Cancelar** (FE:useAnularMotivo.js:5-70). Si no se pide motivo, solo diálogo de confirmación. Títulos: "¿Estás seguro de anular este pago?" (Registrar pago), "¿Estas seguro de anular este pago?" + "Valor Cobrado: …" (Transacciones), "¿Estas seguro de anular los pago(s) agregados de esta factura?", "¿Estas seguro de anular esta factura?", "¿Deseas hacer valido esta factura?" (botón **Activar**), "¿Estas seguro de borrar esta factura?".
- **Endpoints y reglas (backend)** ✅:
  | Endpoint | Qué hace | Condiciones / errores |
  |---|---|---|
  | `PATCH /pagos/anular-abono/{abono_uuid}/{pago_id}` `{motivo}` (BE:pagos.service.ts:1068-1185) | Marca el abono `eliminado=true`, `estadoSRI='ANULADO'`, `anulacion={motivo,usuario,usuario_id,fecha}`. Factura → `PENDIENTE` si queda algún abono `AUTORIZADO`/`PAGADO`, si no `NO PAGADO`. Anula meses adelantados del pago; elimina cargos "saldo" del abono; invalida caché; log `ANULAR_ABONO` ("Abono de factura #N anulado por X. Motivo: …") | 400 **"El motivo de anulación es obligatorio"** (si la config lo exige); 400 **"Este abono tiene un comprobante electrónico autorizado: hay que anularlo con nota de crédito."** si el abono está `AUTORIZADO`/`VALIDADA` (solo se omite cuando la nota de crédito ya salió); si el abono pertenece a un **cobro agrupado**, anula también a las hermanas |
  | `PATCH /pagos/anular-pago/{pago_id}` (l.965-1052) | Anula **todos** los abonos; factura → `NO PAGADO` (o `ANULADO` si no tenía abonos); guarda `anulacion` en la factura; anula meses adelantados y cargos saldo; log `ANULAR_PAGO` | Mismos 400 (motivo / comprobante autorizado) |
  | `PUT /pagos/anular-pago-mes/{pago_id}/{estado}` `{motivo}` (l.888-963) | `estado=inactivar`: factura → `ANULADO` (con `anulacion`); cualquier otro valor ("activar"): vuelve a `NO PAGADO` (o `PENDIENTE` si ya tenía abonos) y borra la anulación. Al anular elimina los cargos vinculados a sus abonos | 400 "El motivo de anulación es obligatorio" (solo al anular). **No valida que la factura no tenga abonos** (el front solo ofrece el botón para `NO PAGADO`/`PENDIENTE`) |
  | `DELETE /pagos/{id}` `{motivo}` (l.1290-1347) | Soft-delete de la factura (y de su comprobante en `facturas-pagos`); guarda `anulacion` antes; log `DELETE` ("Pago de factura #N eliminado exitosamente. Motivo: …") | 400 "El motivo de eliminación es obligatorio". El front solo la ofrece para `NO PAGADO`/`ANULADO`. Las facturas eliminadas **no se regeneran** (COB-006 / H-13) |
  | `POST /CE/facturas/anularFactura` (nota de crédito) | Reserva un secuencial de nota de crédito, la pide al SRI y **solo cuando el SRI la devuelve** anula el abono (`anularAbono` con guarda omitida) y marca el comprobante `ANULADO`; envía NC al cliente si se eligió "Enviar nota de credito al cliente" (BE:facturas.service.ts:249-400) | Si el SRI/gateway no responde: se devuelve el secuencial y el abono **no** se anula; si responde y falla después, "el dinero queda revertido y la factura electrónica viva" (comentario en BE:registro-pagos/anular-cobro.service.ts:265-275) |
- **Efecto sobre el servicio:** ninguno automático en el backend de `anular*`; **el navegador llama `GET /activar-desactivar-servicio`** a continuación (COB-004). Por eso, anular y que el cliente quede otra vez impago **vuelve a suspenderlo** si ya pasó la fecha de corte (la reevaluación es inmediata, no espera día de corte).
- **Efectos secundarios externos:** SRI/Factus (nota de crédito), correo/WhatsApp (NC opcional), MikroTik/OLT (reevaluación).
- **Mensajes (texto exacto):** éxito "Pago eliminado exitosamente" (Registrar pago, rama recibo); "Pago Eliminado...!" (ficha, eliminar factura); errores: `error.response.data.message` o "No se pudo anular el pago" (Transacciones, ficha); "Fallo al eliminar la factura".
- **Casos límite y advertencias:**
  - El front de Transacciones decide **nota de crédito o no** mirando `pago.estadoSRI` ∈ {AUTORIZADO, VALIDADA}; en cualquier otro caso llama `anular-abono` (que el backend bloquea si el abono ya figuraba autorizado: ver sincronización con el SRI en COB-015).
  - Anular **no devuelve dinero** ni genera egreso: solo corrige el registro (no hay módulo de devoluciones en este dominio).
  - Una promesa ya `cumplida` por ese pago **no se reabre** (estado terminal) (COB-014).
  - Un pago anulado aparece en Transacciones solo con el filtro **Estado Pago = Anulados**.
- **Preguntas probables de usuarios:**
  1. "Registré el pago al cliente equivocado, ¿cómo lo corrijo?" (anular el abono y registrarlo de nuevo; si ya hay factura electrónica: nota de crédito).
  2. "Me dice 'hay que anularlo con nota de crédito'." (el abono tiene factura electrónica autorizada; usar la acción que emite la NC).
  3. "Anulé el pago y se cortó el internet." (reevaluación inmediata del servicio).
  4. "¿Quién anuló este pago y por qué?" (campo `anulacion` del abono y log del cliente `ANULAR_ABONO`).
  5. "¿Puedo anular solo una parte?" (se anula un abono completo; no hay anulación parcial).
- **Pendiente de validar en UI:** ❓ texto exacto de los toasts de la nota de crédito (vía WebSocket `anulacion`); ❓ si el botón **Eliminar Pago** de Transacciones aparece para pagos ya anulados.

---

## COB-010 · Editar un pago registrado (modal "Editar Pago")
- **Ruta UI / name:** botón **Editar Pago** (icon `edit`) en Transacciones (`ActionCellRenderer`), **Editar pago** en Registrar pago y editar en la ficha del cliente.
- **Archivos:** FE: `clientes/components/modals/ModalEditarPago.vue` · BE: `PATCH /pagos/{id}` (COB-003).
- **Acceso:** Transacciones `pagos-registrados.editar` o `finanzas.pagos-registrados.editar`; ficha `cliente.factura.edit`; Registrar pago sin permiso (H-05).
- **Campos (etiquetas exactas):** **Forma de pago:**, **Detalle Forma de pago:**, **Nº transacción:**, **Fecha y Hora:** (selector de fecha + hora 24 h), **Monto Cancelado:** (solo lectura), **Notas:**. Título "Editar Pago". Confirmación: "¿Confirmar edición?" — "¿Estás seguro de guardar los cambios en este pago?" (**Guardar** / **Cancelar**). Éxito: "Pago editado exitosamente".
- **Reglas** ✅:
  - Permite cambiar forma de pago/detalle (incluidas las inactivas ya usadas), N° transacción, **fecha y hora del abono** y nota. **No permite cambiar el monto**.
  - Localiza el abono dentro de la factura por **`hora_abono` + `valor`** (FE:ModalEditarPago.vue:72), no por `uuid`: dos abonos del mismo valor a la misma hora se confunden (H-18).
  - **No verifica duplicado de N° transacción** al editar (a diferencia del alta).
  - Cambiar la fecha/hora mueve el abono de día en Transacciones, en el arqueo y en la conciliación; además `updated_at` de la factura pasa a la fecha del primer abono (COB-003 regla 5).
  - No cambia el estado de la factura ni dispara reactivación; deja log `UPDATE_PAGO_*` con el diff (`detectarCambios`) (BE:pagos.service.ts:641-700).
- **Preguntas probables:** "¿Puedo cambiar el monto del pago?" (no; anular y registrar de nuevo); "Me equivoqué de banco/forma de pago." (editar); "El pago salió con la hora de otro día." (editar fecha y hora).
- **Pendiente de validar en UI:** ❓ comportamiento visible si el abono es de factura electrónica (¿se avisa al SRI?, el código no lo hace).

---

## COB-011 · Promesas de pago: listado
- **Ruta UI / name:** `/promesas-pago` · `promesa-pago.index`. **No tiene ítem propio en el menú lateral**: se llega por la pestaña **Promesas de pago** de Registrar pago (con `promesa-pago.index`) o por URL directa (FE:router/routes.ts:26-31; layouts/SideBarMenu.vue:18-61).
- **Archivos:** FE: `promesas-pago/IndexPage.vue`, `composables/usePromise.js`, `components/ModalHistorialPromesas.vue`, `AddPromise.vue`, `EditPromise.vue`, `components/FormPromisePay.vue` · BE: `promesas-pago/promesas-pago.controller.ts`, `promesas-pago.service.ts:266-384`.
- **Para qué sirve:** ver y gestionar los compromisos de pago de clientes (quién, qué factura, hasta cuándo).
- **Acceso:** `promesa-pago.index` (ruta); botón **Agregar promesa de pago** con `promesa-pago.crear`; editar `promesa-pago.editar`; cancelar `promesa-pago.eliminar`. **Visibilidad de datos (backend):** SUPER-ADMINISTRADOR y ADMINISTRADOR ven todas; cualquier otro rol ve **solo las promesas cuyo operador es él mismo**; además se restringe a los routers del usuario (`users.routers`) (BE:promesas-pago.service.ts:345-354).
- **Filtros y columnas:**
  - **Filtrar por fecha cortes:** desde / **Hasta** (campos de fecha con ✕ para limpiar; filtra por `fecha_limite`). **Estado:** `Todas (sin canceladas)`, `Activas`, `Cumplidas`, `Incumplidas`, `Canceladas`; interruptor **Incluir canceladas** (visible solo con Estado = Todas). Buscador **Buscar...** (nota, cliente, IPv4, plan, operador; `ILIKE`, debounce 800 ms). Paginación 10/15/20/Todas.
  - Columnas: **Cliente** (enlace al perfil), **N° Factura**, **Plan**, **IPV4**, **Fecha** (⚠️ es el `dia_pago` de la factura, **no** la fecha en que se creó la promesa), **Fecha Corte** (= `fecha_limite`), **Operador**, **Nota**, **Estado** (chips Activa/Cumplida/Incumplida/Cancelada), **acciones**.
  - Orden: primero las vigentes (`isActive` desc), luego `fecha_limite` desc.
- **Botones por fila:** **historial** (icon `history`, tooltip "Ver historial de promesas del cliente"); **enviar** (icon `send`, tooltip "Notificar la promesa al cliente", solo `estado='activa'` y `isActive`); **editar** (tooltip "Editar promesa", no para cumplida/cancelada); **eliminar** (tooltip **"Cancelar promesa"**, no para cumplida/cancelada) (FE:IndexPage.vue:421-477).
- **Reglas de negocio (backend)** ✅: al **abrir el listado** primero sincroniza estados: promesas activas con factura `PAGADO/AUTORIZADO` → `cumplida`; con `fecha_limite <= hoy` y factura no pagada → `incumplida` (BE:promesas-pago.service.ts:65-95). Excluye promesas de facturas eliminadas (`pago.deleted_at IS NULL`) y, por defecto, las canceladas.
- **Mensajes:** "No se encontró ningun resultado" (sin datos).
- **Preguntas probables:** "No veo las promesas de mis compañeros." (solo admin ve todas); "¿Dónde está el menú de promesas?" (pestaña dentro de Registrar pago); "La columna Fecha no es la de la promesa." (es el vencimiento de la factura).
- **Pendiente de validar en UI:** ❓ ruta directa `/promesas-pago` con usuario sin `registrar.pago`.

---

## COB-012 · Promesas de pago: crear y editar
- **Ruta UI / name:** tres entradas: (a) Registrar pago → **Tipo de pago = Promesa de pago**; (b) listado → **Agregar promesa de pago** (modal "Agregar promesa de pago"); (c) ficha del cliente → icono **Crear promesa de pago** (handshake, `promesa-pago.crear`) — solo para facturas `NO PAGADO`/`PENDIENTE`, sin promesa activa y cuyo mes sea el actual o anterior (FE:IndexFacturas.vue:71-87, 970-990). Edición: icono editar del listado → modal "Editar promesa de pago".
- **Archivos:** FE: `registrar-pago/components/FormPromisePay.vue:406-533`, `registrar-pago/composables/useRegisterPay.js:214-251`, `promesas-pago/components/FormPromisePay.vue`, `composables/usePromise.js:323-377` · BE: `promesas-pago.controller.ts:23-27, 59-71`, `promesas-pago.service.ts:97-264, 398-504`, `dto/create-promesas-pago.dto.ts`.
- **Campos (etiquetas exactas):**
  | Etiqueta | Obligatorio | Validación |
  |---|---|---|
  | **Buscar cliente:** (modal) / **Buscar cliente por razón social o # Documento:** (Registrar pago) | sí | Mismo buscador que COB-001 |
  | **Factura a pagar:** | sí | En el modal solo lista facturas pendientes **sin promesa activa** (si todas tienen: "Todas las facturas pendientes de este cliente ya tienen una promesa de pago activa."); etiqueta `Valor pendiente · N° Factura · Vencimiento (dia_pago + gracia) · Plan · IPV4` |
  | **Fecha limite de pago:** | sí | Calendario `DD/MM/YYYY`; **solo de mañana a +25 días** (FE:FormPromisePay.vue:39-48) |
  | **Nota:** | sí (front) | "Debes completar este campo" |
  | **Notificar al cliente** (checkbox, solo al crear en el modal) | no | Texto de ayuda: "Se le avisa por los canales activos en Mensajería, con la plantilla de promesa de pago." |
- **Botones:** **Guardar** (modal) / **Agregar Promesa** (Registrar pago; con `registrar.promesa-pago`); diálogo "¿Deseas agregar la promesa de pago?" / "¿Deseas editar la promesa de pago?" con **Aceptar** / **Cancelar**. Éxito: "Promesa de pago agregado" / "Promesa de pago editado" / "Promesa aplicada a N órdenes de cobro del grupo"; error: "Fallo al agregar la promesa de pago" / "Fallo al editar la promesa de pago".
- **Banners:** **Cliente reincidente** (naranja) si tiene ≥ 2 promesas incumplidas en los últimos 12 meses: "tiene N promesas incumplidas en los últimos 12 meses (cumplimiento X%). Considerá esto antes de crear una nueva promesa." + botón **Ver historial** — **no bloquea**. Si no es reincidente pero tiene historial: "Cliente con N promesas previas (X cumplidas / Y incumplidas)". Banner de **comprobante de grupo** cuando la factura salió agrupada (FE:promesas-pago/components/FormPromisePay.vue:119-137, 344-383).
- **Reglas de negocio (backend)** ✅:
  - Crea con `estado='activa'`, `isActive=true`; **no valida** que la fecha sea futura ni ≤ 25 días, ni que la factura no tenga ya una promesa activa, ni que esté impaga: esos controles están **solo en el front** (BE:promesas-pago.service.ts:97-110; dto: `fecha_limite` solo `IsDateString`).
  - **Grupo de facturación:** si la factura salió en un comprobante agrupado, crea además una promesa (misma fecha y nota, `grupo_promesa` compartido) para **cada orden hermana impaga y sin promesa** del mismo comprobante y reevalúa sus servicios; si algo falla, la promesa original igual queda (BE:promesas-pago.service.ts:168-264).
  - Tras crear: invalida la caché del resumen, **reevalúa el servicio** (`verifyAndApplyServiceStatus`) — es decir, el servicio puede **reactivarse al instante** si estaba suspendido por esa factura y la promesa lo cubre — y registra log `CREATE` "Promesa de pago agregada de la factura #N" (l.123-138).
  - Notificar al crear (`notificar: true`): envío sin esperar y sin impedir el guardado (l.114-121).
  - **Editar** (`PATCH`): recalcula `isActive` = (fecha_limite estrictamente futura) y el estado (`activa` si futura, `incumplida` si no; `cumplida`/`cancelada` se respetan); si es de grupo, copia fecha y nota a las hermanas; reevalúa servicios; log `UPDATE` (l.398-504). El front envía también `operator: claim.id`, así que **el operador de la promesa pasa a ser quien la editó**.
- **Relaciones:** facturas, cortes (COB-014), mensajería (COB-013), grupos de facturación.
- **Preguntas probables:** "¿Cuántos días puedo prometer?" (máx. 25 desde hoy en la UI; nunca hoy); "¿Puedo dar dos promesas a la misma factura?" (la UI lo impide mientras haya una activa); "Le di promesa y se cortó igual." (COB-014/COB-025).
- **Pendiente de validar en UI:** ❓ apariencia del modal compacto abierto desde la ficha; ❓ qué pasa al editar una promesa `incumplida` a fecha futura (el código la reactiva).

---

## COB-013 · Promesas de pago: cancelar, notificar al cliente e historial
- **Ruta UI / name:** acciones del listado COB-011 y modal **Historial de promesas**.
- **Archivos:** FE: `IndexPage.vue:93-150, 506-560`, `components/ModalHistorialPromesas.vue`, `composables/usePromise.js:81-120` · BE: `promesas-pago.controller.ts:40-84`, `promesas-pago.service.ts:506-669`, `promesas-pago-notificacion.service.ts:47-237`.
- **Cancelar:** el icono "Cancelar promesa" (permiso `promesa-pago.eliminar`) abre "<center>¿Estas seguro de eliminar esta promesa?</center>" con Cliente y Fecha de corte, **Aceptar/Cancelar**; éxito "Promesa de pago eliminado". En el **historial** el botón rojo (icon `block`, tooltip "Cancelar promesa") abre "¿Cancelar promesa de pago?": "La promesa quedará marcada como **cancelada** en el historial. El servicio del cliente vuelve a quedar sujeto a la fecha de corte normal de la factura." (**Sí, cancelar** / **Cerrar**) y el toast "Promesa cancelada exitosamente — En el listado de Promesas, activá "Incluir canceladas" o filtrá por "Canceladas" para verla." (FE:ModalHistorialPromesas.vue:76-119).
  - Backend `DELETE /promesas-pago/{id}`: **no borra**: `estado='cancelada'`, `isActive=false`; cancela también las hermanas activas del grupo; reevalúa los servicios; log `CANCELAR` "Promesa de pago cancelada de la factura #N" (BE:promesas-pago.service.ts:506-563). El texto "eliminar" del diálogo de la lista es engañoso (H-15).
- **Notificar:** icono **enviar** → diálogo "Notificar promesa": texto "Se enviará a {cliente} el aviso de su promesa de pago.", **Enviar por:** (`WhatsApp` / `Email` / `Ambas`), **Celular del cliente:**, **Email del cliente:** (precargados, editables), botón **Enviar**. `POST /promesas-pago/{id}/notificar` (sin comprobación de permiso en el front).
  - Reglas (BE:promesas-pago-notificacion.service.ts:47-123): solo promesas vigentes ("La promesa ya no está vigente: no se puede notificar."); exige plantilla `plantillaPromesaPago` ("No hay plantilla de promesa de pago configurada. Créala en Ajustes › Plantillas."); variables `{cliente}`, `{fecha_promesa}`, `{total}`, `{plan}`, `{empresa}`, `{nota}`; asunto del correo "Promesa de pago hasta el {fecha}"; WhatsApp oficial con plantilla tipo `promesa_pago` o sesión no oficial; si no sale por ningún canal: "No se envió por ningún canal: revisa que el cliente tenga correo o celular y que el canal esté activo."; con canal elegido a mano se ignora el interruptor de Mensajería, con el envío automático al crear manda lo que esté activo. Registra el envío en el historial de mensajes (`origen: 'promesa_pago'`).
  - Para promesas de **grupo** informa la **suma** de todas las órdenes vigentes (`total`).
  - Toasts: "Notificación enviada", "No se pudo enviar por: {canales}", "No se pudo notificar".
- **Historial:** modal **Historial de promesas** (`GET /promesas-pago/reporte/cliente/{customer_id}`): resumen Total / Activas / Cumplidas / Incumplidas / canceladas, **Cumplimiento** % (cumplidas ÷ (cumplidas+incumplidas)), y lista "Factura #N · Fecha límite … · Creada por … el …"; mensaje "Este cliente nunca tuvo una promesa de pago." **Reincidente** = ≥ 2 incumplidas con `fecha_limite` en los últimos 12 meses (BE:promesas-pago.service.ts:576-669).
- **Preguntas probables:** "¿El cliente recibe aviso cuando le doy una promesa?" (solo si marcas Notificar al crear o usas el icono enviar); "Cancelé la promesa y se suspendió." (vuelve a la fecha de corte normal, COB-014).
- **Pendiente de validar en UI:** ❓ que el diálogo de cancelar de la lista diga "eliminar" aunque la acción sea cancelar.

---

## COB-014 · Promesas de pago: ciclo de vida y efecto sobre el corte
- **Archivos:** BE: `promesas-pago/entities/promesas-pago.entity.ts:7-68`, `promesas-pago.service.ts:65-95`, `app.service.ts:465-482`, `app-queue.processor.ts:355-373, 864-896`, `config/queue.config.ts:8-13`.
- **Estados** (`estado`; `isActive` es el booleano operativo, `true` solo en `activa`):
  | Estado | Significado | Cómo se llega |
  |---|---|---|
  | `activa` | Vigente | Al crear; al editar a fecha futura |
  | `cumplida` | La factura quedó `PAGADO`/`AUTORIZADO` (aunque ya hubiera vencido la fecha) | Sincronización al abrir el listado o cron nocturno; al pagar la factura primero se pone `isActive=false` (BE:pagos.service.ts:510-518) |
  | `incumplida` | `fecha_limite <= hoy` y la factura sigue impaga | Sincronización / cron / edición con fecha pasada |
  | `cancelada` | La canceló un operador (soft-delete) | `DELETE` |
- **Cron:** `actualizarEstadoPromesasPago` repetible cada día a los `INTERVALO_MINUTOS` minutos de la hora 0 (`'{INTERVALO_MINUTOS} 0 * * *'`), registrado al arrancar la instancia primaria (BE:app.service.ts:31-49, 465-482). Además la sincronización corre **cada vez que se abre el listado**, así que el listado nunca muestra estados vencidos.
- **Efecto sobre el corte (regla exacta)** ✅: el motor de cortes mira la promesa **solo de la factura que dispara el corte** (la N-ésima factura pendiente más antigua, N = meses de tolerancia). Si esa factura tiene una promesa con `isActive=true`: fecha de corte = `fecha_limite` de la promesa, con 0 días de gracia; si el vencimiento de la factura (dia_pago + gracia) es posterior, **prevalece el vencimiento** (BE:app-queue.processor.ts:355-373). Se suspende cuando hoy ≥ esa fecha (el día de la `fecha_limite` ya cuenta como vencido — consistente con la edición, que trata "hoy" como vencida: BE:promesas-pago.service.ts:418-421).
  - Consecuencias: una promesa sobre una factura **más nueva** que la que dispara el corte **no protege** al cliente; una promesa no puede **acortar** el plazo.
  - No existe una sanción automática al incumplirla: cambia a `incumplida` (chip rojo), cuenta para "reincidente" y el corte aplica en la siguiente evaluación.
  - Crear/editar/cancelar una promesa reevalúa el servicio al instante (COB-004).
- **Preguntas probables:** "¿Hasta qué hora está protegido el cliente?" (hasta antes de la `fecha_limite`; ese día vence); "Le puse promesa a la factura de este mes y se cortó por la de hace dos meses." (la promesa debe estar en la factura que dispara el corte); "¿Qué pasa si no paga?" (pasa a incumplida y se corta en la próxima evaluación).
- **Pendiente de validar en UI:** ❓ hora exacta de corte efectiva (depende del horario de cortes del router, otro inventario).

---
<!-- FIN-PARTE-3 -->
## COB-015 · Transacciones (pagos registrados): listado, filtros, columnas y "ver hoy"
- **Ruta UI / name:** `/transacciones/:showToday?` · `pagos-registrados.index` · menú **Finanzas → Transacciones** (enlace `/transacciones/true`, FE:layouts/SideBarMenu.vue:44-48). El **mismo componente** se embebe en la pestaña **Pagos registrados** de Registrar pago.
- **Archivos:** FE: `transacciones/IndexPage.vue`, `composables/useTransation.js`, `composables/translateTable.js` (textos del ag-grid), `ActionCellRenderer.vue`, `ClientesNamePage.vue`, `components/EstadoComprobante.vue` · BE: `transacciones/transacciones.controller.ts`, `transacciones.service.ts:121-366`, `facturas-pagos/facturas-pagos.service.ts:62-119`.
- **Para qué sirve:** arqueo y control de caja: lista **cada abono** (no cada factura) registrado en un rango de fechas/horas, con totales.
- **"Ver hoy" / parámetro `showToday`:** sin parámetro o `true` (menú, widget "Transacciones hoy" del panel) → **hoy**; `mes` (widget "Facturas pagadas" del panel) → **del día 1 del mes a hoy** (FE:IndexPage.vue:614-624, 713-723; FE:pages/dashboard/panel/components/TransaccionesHoy.vue:35; TotalFacturasPagadas.vue:25). Al elegir otro rango en el calendario desde `mes` se vuelve a la ruta sin parámetro.
- **Acceso:** guard de ruta `pagos-registrados.index`; en la pestaña de Registrar pago `finanzas.pagos-registrados.index`. **Operadores:** SUPER-ADMINISTRADOR ve a todos y arranca en "Cualquiera"; los demás arrancan con **su propio nombre** y, sin `pagos-registrados.ver-otros`, el selector solo ofrece su usuario (FE:IndexPage.vue:111-112, 648-656). **Backend:** muestra todos los abonos solo si el rol[0] es SUPER-ADMINISTRADOR o ADMINISTRADOR **o** el usuario tiene `pagos-registrados.ver-otros`; en otro caso solo los abonos con su `usuario_id` **y los de `usuario_id` nulo** (cobros automáticos) (BE:transacciones.service.ts:243-273). ✅ Alcance por routers del usuario (`users.routers`, vacío = todos) (l.137-138, 202-208).
- **Filtros (etiquetas exactas, FE:IndexPage.vue:744-935, 941-1017):**
  | Filtro | Valores | Notas |
  |---|---|---|
  | **Forma de pago:** | `Cualquiera` o forma (incluye inactivas) | Filtra por nombre exacto en el abono (BE:l.278-282) |
  | **Detalle forma de pago:** | `Cualquiera` o detalle de la forma elegida | Deshabilitado sin forma |
  | **Operador:** | `Cualquiera`, cada usuario, **Cobros automáticos (bot / pasarelas)** (valor `automaticos` = abonos con `usuario_id` vacío) | |
  | **Fechas:** | rango (calendario; no futuras) | Se aplica sobre `fecha_hora_abono` en la zona horaria de la empresa |
  | **Horario:** | **hora inicio** (por defecto 00:00 AM) y **hora fin** (por defecto 11:59 PM) | Se aplica **a cada día** del rango, no como rango continuo (BE:l.143-149, 260-269). La hora fin no puede ser menor: "La hora fin no puede ser menor que la hora inicio; se ajustó al inicio." |
  | **Sucursal:** | `Cualquiera` o una | Sin `ver-otros` y en "Cualquiera", se envían solo las sucursales del usuario |
  | **Estado Pago:** | `No Anulados` (por defecto), `Anulados`, `Generado automáticamente` | Filtro en el navegador sobre lo cargado: `Anulados` = abonos `eliminado`; `Generado automáticamente` = ítems `sin_pago`; `No Anulados` = ni eliminados ni `sin_pago` (l.295-302) |
  | **Tipo Comprobante:** | `Cualquiera`, `Recibos`, `Facturas` | `Recibo` = abono con `numAbono` y no `AUTORIZADO`; el resto `Factura` (l.508) |
  | **Estado Factura Electrónica:** | `Cualquiera`, `AUTORIZADOS`, `NO AUTORIZADOS` | `NO AUTORIZADOS` = `estadoSRI` distinto de AUTORIZADO y de PAGADO (l.314-320) |
  | **Router:** / **Red:** | `Cualquiera` o router / red IPv4 del router | Red se habilita al elegir router; consulta `GET /red-ipv4?routerId=` |
  | **Mes:** | `Todos los meses` o "Mes Año (n)" | Agrupa por **mes del `dia_pago`** de la factura (sin días de gracia) (l.48-71, 82-95) |
  | **Buscar...** | texto libre (quick filter del grid) | Más filtros por columna (flotantes) |
  - Cada cambio de forma/detalle/operador/fecha/horario/sucursal/router/red **recarga desde el servidor** (`POST /transacciones/filtrar-transacciones`); estado, tipo, estado FE y mes filtran en el navegador.
- **Columnas** (ag-grid; FE:useTransation.js:16-222): CLIENTE (enlace al perfil; en rojo con tooltip "Cliente eliminado el …" si fue eliminado), Estado Comprobante (insignia `estadoSRI` del abono: verde AUTORIZADO/PAGADO, rojo otros), Num. Documento, Celular, Correo, Tipo Comprobante, Num. Comprobante (N° de recibo `numAbono` o N° del comprobante electrónico), N° Factura, # Transacción, Fecha & Hora, Vencimiento (`dia_pago + días de gracia`), Mes Vencimiento, Forma Pago, Detalle Forma Pago, Operador, Sucursal, Router, Red, Base Imponible, Descto, ICE, IVA, Subtotal, Saldo (`+x` azul / `-x` rojo), Cobrado, Acciones (fija a la derecha). **Visibles por defecto** (store): nombres, documento, tipo comprobante, num. comprobante, N° factura, # transacción, fecha & hora, vencimiento, mes vencimiento, forma de pago, detalle, operador, sucursal, descuento, IVA, subtotal, cobrado, acciones (FE:stores/auth-user.ts:79-99); **ocultas por defecto**: Estado Comprobante, Celular, Correo, Router, Red, Base Imponible, ICE, Saldo (los nombres `baseImponible` del store no coinciden con el campo real `precio_servicio`) (H-17). El selector **Columnas** guarda la elección en el navegador.
- **Totales** (tabla bajo el grid): **SUBTOTAL, DESCUENTO, IVA, ICE, TOTAL COBRADO, TOTAL NETO** — suman **solo las filas visibles** tras todos los filtros (incluido el buscador) (FE:IndexPage.vue:270-287, 333-341). `TOTAL COBRADO` = `TOTAL NETO` (mismo valor).
- **Reglas de negocio (backend)** ✅:
  - Una fila = un abono dentro de `pagos.pagos`; se incluyen abonos **anulados** (el filtro "Estado Pago" los separa) y facturas de clientes **eliminados**; se excluyen facturas eliminadas (`deleted_at`) (BE:l.170-181).
  - Para abonos de **factura electrónica** consulta el estado real: toma datos de `facturas-pagos` y, si faltan importes, llama al servicio externo de facturación (`HOST_API_FACTURACION /v1/factura/consulta-masiva`); si el SRI dice `AUTORIZADO` y el abono no, **actualiza el abono a AUTORIZADO en la BD** (efecto secundario de una consulta). Estados terminales (`AUTORIZADO`, `ANULADO`) se cachean 5 min; `DEVUELTA` no (BE:l.12-25, 62-102, 307-358; facturas-pagos.service.ts:62-119). Si el servicio de facturación no responde, **todo el listado falla** con "fallo al cargar las transacciones" (sin try/catch en esa llamada) (H-19).
  - Cálculo por fila: proporcional al abono (`valor / total`) sobre los ítems de la factura (FE:IndexPage.vue:517-536); "Cobrado" = `valor + max(saldo,0)` (l.579); recibos se calculan con impuesto "Ninguno".
- **Mensajes:** toast naranja "No se pudieron cargar las transacciones" o el `message` del backend ("fallo al cargar las transacciones").
- **Relaciones con otros módulos:** panel (widgets), ficha del cliente, facturación electrónica, conciliación bancaria (comparte la misma fuente: `pagos.pagos`).
- **Casos límite y advertencias:**
  - Un abono hecho a las 23:50 y editado a otra fecha cambia de día en el arqueo (COB-010).
  - La zona horaria usada es la de la empresa (`APP_TIMEZONE`); el filtro de horas usa la hora local de esa zona.
  - Los cobros por **pasarela/bot** (operador nulo) son visibles para **todos** los usuarios con acceso a Transacciones, incluso sin `ver-otros`.
- **Preguntas probables de usuarios:**
  1. "No veo los pagos de mis compañeros." (`ver-otros` o rol administrador).
  2. "¿Cómo hago el cierre de caja de hoy?" (Transacciones → hoy → Operador = yo → Reporte).
  3. "Un pago anulado no aparece." (Estado Pago = Anulados).
  4. "El total no cuadra con el depósito." (totales = filas visibles; revisa filtros, Operador y Estado Pago).
  5. "¿Qué significa Saldo +2.50?" (excedente que quedó a favor del cliente).
  6. "¿Por qué mi lista tarda o da error?" (facturación electrónica/SRI sin respuesta).
  7. "¿Cómo veo solo lo cobrado por PayPhone?" (Operador = Cobros automáticos / Forma de pago = PASARELA DE PAGO).
- **Pendiente de validar en UI:** ❓ columnas ocultas por defecto con una cuenta nueva; ❓ comportamiento del listado con el servicio de facturación caído.

---

## COB-016 · Transacciones: acciones por fila y reportes (PDF / Excel)
- **Ruta UI / name:** columna **Acciones** del grid y botón **Reporte** de COB-015.
- **Archivos:** FE: `transacciones/ActionCellRenderer.vue`, `composables/useTransation.js:236-432` · BE: `transacciones.controller.ts:13-22`, `PlantillaPdfTransations.ts`.
- **Acciones por fila** (en móvil se agrupan en un menú ☰; FE:ActionCellRenderer.vue):
  | Etiqueta / tooltip | Qué hace | Permiso (cualquiera de los dos) | Endpoint | Restricciones |
  |---|---|---|---|---|
  | **Imprimir** (icon `print`) | Imprime el recibo/comprobante del abono (COB-017) | `finanzas.pagos-registrados.imprimir` / `pagos-registrados.imprimir` | `POST /pagos/pdf/{id}/factura_servicio/{fecha_hora_abono}` o térmica | — |
  | **Descargar comprobante** (icon `download`) → **Descargar RIDE** / **Descargar XML** (facturas) o **Descargar Recibo** | Descarga del comprobante electrónico o del recibo en PDF | los mismos de imprimir | `GET /facturas-pagos/{uuid}` + servicio externo; `POST /pagos/pdf/factura-abono` | Avisos: "No se encontró el comprobante de esta transacción.", "Esta factura no tiene clave de acceso (no fue autorizada).", "No se pudo descargar el comprobante.", "No se pudo descargar el recibo." |
  | **Editar Pago** (icon `edit`) | Abre "Editar Pago" (COB-010) | `…pagos-registrados.editar` | `PATCH /pagos/{id}` | — |
  | **Eliminar Pago** (icon `delete`; mientras corre dice "Anulando…") | Anula el abono: motivo → nota de crédito si el abono es AUTORIZADO/VALIDADA, o `anular-abono`; luego reevalúa el servicio (COB-009) | `…pagos-registrados.eliminar` | ver COB-009 | Bloquea doble clic; error en toast negativo |
- **Reporte** (botón `Reporte`, icon `download`, menú):
  - **Descargar PDF** (icon pdf): `POST /transacciones/download-pdf-transaction` con las filas visibles, el rango y las columnas visibles; abre el PDF en otra ventana. Orden fijo de columnas, solo las activas; fila de TOTAL; saldo en azul/rojo (BE:PlantillaPdfTransations.ts:57-118).
  - **Descargar Excel** (icon tabla): generado en el navegador con ExcelJS, hoja `transacciones`, título `TRANSACCIONES DESDE {rango}`, 24 columnas fijas (N°, Fecha, Router, Red, N° Documento, Cliente, Tipo Comprobante, Num. Comprobante, N° Factura, Vencimiento, Mes Vencimiento, N° Transacción, Forma Pago, Detalle Forma Pago, Operador, Notas, Sucursal, Base Imponible, Descto, ICE, IVA, Subtotal, Saldo, Total Cobrado) y fila `TOTAL:`; los clientes eliminados salen como "NOMBRE (CLIENTE ELIMINADO)"; archivo `transacciones.xlsx` (FE:useTransation.js:236-358).
  - Ambos reportes parten de **lo que se ve** (filtros + buscador), no del rango completo.
- **Relaciones:** facturación electrónica (descargas), recibos, ficha del cliente.
- **Preguntas probables:** "El Excel no trae las columnas que oculté." (el Excel es fijo; el PDF sí respeta columnas); "El PDF sale vacío." (no hay filas visibles); "No me deja eliminar." (permiso eliminar; o comprobante autorizado → nota de crédito).
- **Pendiente de validar en UI:** ❓ diseño exacto del PDF (puppeteer).

---

## COB-017 · Recibo / comprobante de pago: PDF, impresión térmica y envío al cliente
- **Ruta UI / name:** acciones "Imprimir comprobante", "Imprimir", "Descargar recibo (PDF)" de COB-008 y COB-016; "Reenviar comprobantes" en la ficha del cliente (otro inventario).
- **Archivos:** FE: `transacciones/composables/useTransation.js:360-432` · BE: `pagos/pagos.controller.ts:41-124`, `pagos/pagos.service.ts:207-287, 1349-1695`, `pagos/PlantillaPDF.ts` (clase `PlantillaPago`), `PlantillaPagoServicioPDF.ts`, `PlantillaFacturaAbono.ts`, `PlantillaDetallePagos.ts`, `formato-impresion.config.ts`.
- **Para qué sirve:** generar el documento que se entrega al cliente: **recibo** (abono sin factura electrónica) o la representación del abono.
- **Endpoints** ✅:
  | Endpoint | Entrega | Log |
  |---|---|---|
  | `POST /pagos/pdf/{pago_id}/{tipo}/{fecha?}` | `recibo.pdf` (tipo `factura_servicio` o `factura_libre`) | `GENERAR_PDF_FACTURA` "PDF de factura de servicio #N generado exitosamente" |
  | `POST /pagos/pdf/factura-abono` `{pago_id, fecha}` | `recibo.pdf` del abono de esa fecha | `GENERAR_FACTURA_ABONO` "Recibo de abono de factura #N generado exitosamente" |
  | `POST /pagos/pdf/pago-pendiente` `{pago_id}` | `detalle-pagos.pdf` (detalle de pagos pendientes) | `GENERAR_PDF_COMPROBANTE_PAGOS` |
  | `GET /pagos/datos-recibo/{pago_id}/{tipo}/{fecha}` | JSON con los datos del recibo para la impresora térmica | — |
  | `POST /pagos/formato-impresion/preview` | PDF de vista previa del formato (Ajustes › Impresión) con el último pago como muestra | — |
- **Impresión desde el navegador** (`imprimir`): lee la configuración; si en **Ajustes › Plantillas › Impresión de pagos** está activo el interruptor **"Usar impresora térmica (API local)."** (`configImpresion.usarApiImpresora`; FE:pages/dashboard/ajustes/plantillas/components/ImpresionPagos.vue:983) pregunta **"Formato de impresión — ¿Cómo deseas imprimir este recibo?"** con `Impresión directa (térmica)` o `Generar PDF`. La térmica hace `GET /pagos/datos-recibo/...` y envía el JSON a un **programa local en `http://localhost:3008/api/impresion`**; si no responde: "No se pudo conectar con el programa de impresora. Asegúrate de que esté ejecutándose." El PDF se abre en otra ventana y lanza `print()` (FE:useTransation.js:360-432).
- **Reglas de negocio (backend)** ✅: los pagos con fecha de abono **≤ 08/05/2025** usan la plantilla antigua `PlantillaPago` y los posteriores `PlantillaPagoServicioPDF` (BE:pagos.service.ts:1612-1656). El "periodo de consumo" impreso depende de la configuración `tipo_periodo_consumo` (`completo` = del 01 al fin del mes de corte; `relativo` = mismo día del mes anterior; `relativo_siguiente` = día de corte al mismo día del mes siguiente) (BE:pagos.service.ts:1415-1431). "Fecha de suspensión" impresa = `dia_pago + días de gracia`. El monto en letras usa `montoEnLetras` de la moneda de la instancia.
- **Numeración:** el N° de recibo (`numAbono`) es la secuencia de abonos de la **sucursal** (8 dígitos) y se asigna al guardar (COB-002 regla 4; bot: BE:registrar-abono.service.ts:870-874).
- **Preguntas probables:** "¿Dónde configuro el diseño del recibo?" (Ajustes › Impresión de pagos / Plantillas); "Imprime en blanco con la térmica." (programa local en 3008 y formato); "El recibo dice un periodo raro." (tipo de periodo de consumo).
- **Pendiente de validar en UI:** ❓ ubicación visual del ajuste de impresión dentro de Ajustes › Plantillas (otro inventario).

---

## COB-018 · Cobros por pasarela: pantalla de control
- **Ruta UI / name:** `/cobros-pasarela` · `cobros-pasarela.index` · menú **Finanzas → Cobros por pasarela**.
- **Archivos:** FE: `cobros-pasarela/IndexPage.vue`, `components/PanelCobros.vue`, `src/composables/usePasarelasPago.js` · BE: `pasarelas-pago/pasarelas-pago.controller.ts:59-111`, `consulta-cobros.service.ts`, `disponibilidad.service.ts`.
- **Para qué sirve:** ver los enlaces de cobro generados, cuáles se pagaron, cuáles **no quedaron asentados en la factura** y cuáles se pagaron dos veces.
- **Acceso:** `cobros-pasarela.index`. ⚠️ El grupo **Finanzas** del menú no incluye esta clave en su condición de visibilidad (FE:layouts/SideBarMenu.vue:254-321): si el rol tiene **solo** `cobros-pasarela.index`, el grupo no se muestra y el ítem queda oculto (H-03). Las acciones de la pantalla (registrar, verificar) **no** exigen permisos adicionales.
- **Encabezado:** "Cobros por pasarela" · botones **Verificar pagos repetidos** (icon `fact_check`; tooltip "Pregunta a la pasarela si algún enlace del periodo se pagó más de una vez. Se revisa solo cada minuto mientras el enlace sigue abierto; esto alcanza también a los ya vencidos.") y **Recargar** (icon `refresh`).
- **Filtros:** **Estado** (`Todos`, `Pagados`, `Esperando pago`, `Sin abrir`, `Vencidos`, `Rechazados`, `Por confirmar`), **N° de factura** (búsqueda por coincidencia parcial; Enter o lupa), **Periodo** (rango; por defecto últimos 30 días). Paginación 10/20/50.
- **Estados** (valor del gateway → etiqueta → color; FE:PanelCobros.vue:10-18): `approved` → **Pagados** (verde), `pending` → **Esperando pago** (naranja), `created` → **Sin abrir** (gris azulado), `expired` → **Vencidos** (gris), `failed` → **Rechazados** (rojo), `awaiting_confirmation` → **Por confirmar** (ámbar). El significado de `created` vs `pending` y de `awaiting_confirmation` lo define el gateway externo (no está en este repo) ❓; en el backend `pending` con enlace vigente = "enlace que el cliente todavía podría pagar" (BE:cobros.service.ts:399-420). El webhook documenta `payment.approved | canceled | expired | failed` (BE:dto/webhook-pago.dto.ts) — `canceled` no tiene etiqueta en esta pantalla.
- **Tarjetas de totales del periodo:** **Cobrado en el periodo** (suma `approved` y N° de cobros), **Enlaces esperando pago** (pending + created, "por {monto pending}"), **Vencidos sin pagar**.
- **Columnas:** **Generado** (fecha; debajo "Pagado {fecha}" si está confirmado), **N° Fact.**, **Cliente** (enlace al perfil), **Monto** (moneda + valor), **Estado**, **Asentado** (✔ "El abono figura en la factura"; ⊖ "El abono se registró y después se anuló con nota de crédito"; ✖ "El cliente pagó pero el abono NO figura en la factura. Registrarlo a mano."; `—` si no aplica), **Detalle** (referencia, "Pagado N veces", "sin revisar", tarjeta, "Aut. {código}"), acciones.
- **Botones por fila:** `post_add` ("Registrar este cobro en la factura. La pasarela ya lo cobró; sólo falta que figure como abono." — solo si `asentado === false`), `content_copy` ("Copiar el enlace"), `tag` ("Copiar el id del cobro").
- **Avisos superiores:**
  - Naranja: "No hay ninguna pasarela lista para cobrar" + motivo + **Ir a configurar** (→ Ajustes › Pasarelas de Pagos). Se siguen mostrando los cobros anteriores.
  - Rojo: "N cobro(s) pagado(s) no está(n) asentado(s) — El cliente pagó y el abono no figura en la factura…" + **Registrar todos**.
  - Rojo con ✕: "Un enlace se pagó / N enlaces se pagaron más de una vez" con "Factura N° … — Cliente: **N cobro(s) de más** · {moneda} {monto} (aut. …)" y "El abono de la factura está bien. Hay que devolver o acreditar la diferencia." El ✕ lo oculta solo en memoria (tooltip: "Ocultar el aviso. Vuelve a aparecer al verificar pagos repetidos, al recargar la pantalla, o si se detecta uno nuevo.").
- **Acciones y endpoints** ✅:
  | Acción | Endpoint | Reglas |
  |---|---|---|
  | Listar | `GET /pasarelas-pago/cobros?page&limit&status&from&to&noFactura` + `GET /cobros/resumen` | Trae los cobros del **gateway** y, para cada uno, busca la factura y el cliente por `metadata.pagoId` (BE:consulta-cobros.service.ts:43-139, 157-250). `asentado` se calcula buscando un abono cuyo `n_transaccion` sea el código de autorización, el id de transacción del proveedor o el `paymentId` |
  | **Registrar este cobro en la factura** (diálogo "Registrar este cobro en la factura": "Se va a registrar un abono de {moneda} {monto} en la factura N° {n}, con la autorización {aut}. La pasarela ya cobró este dinero; sólo falta que figure en la factura. Si el abono ya existiera no se duplica.") | `POST /pasarelas-pago/cobros/{paymentId}/asentar` | Solo `approved` ("El cobro está en estado "{estado}" y sólo se pueden registrar los pagados."); exige `metadata.pagoId` ("El cobro no indica a qué factura corresponde, así que no se puede registrar solo. Cargarlo a mano desde el perfil del cliente."); usa el mismo camino que el webhook (idempotente) → respuestas: `aplicado` ("Abono de X registrado en la factura N° Y"; aviso "Sin comprobante: …" si no salió el comprobante), `duplicado` ("Este cobro ya estaba registrado en la factura"), otro motivo ("No se aplicó: …") |
  | **Registrar todos** (diálogo "Registrar N cobro(s)") | uno por uno, en secuencia | "N cobro(s) registrado(s)" / "N no se pudo(ieron) registrar. Probá uno por uno." Solo la página actual |
  | **Verificar pagos repetidos** | `POST /pasarelas-pago/cobros/verificar-duplicados` (periodo en el cuerpo) | Respuestas: "N cobro(s) con pago repetido sobre M revisado(s)" / "Sin pagos repetidos en M cobro(s) revisado(s)" / "Se revisaron los N cobros más recientes. Acotá el periodo para ver el resto." |
- **Relaciones:** pasarelas-pago (config en otro inventario), facturas, clientes, WebSocket (`pago_pasarela`, `pago_pasarela_alerta`).
- **Casos límite y advertencias:**
  - Esta pantalla depende del **gateway externo**; si no responde: banner rojo "No se pudieron cargar los cobros".
  - El monto del enlace queda fijo al generarse: si la factura cambia, el enlace viejo **sigue cobrando el valor anterior** (COB-019).
  - La búsqueda por N° factura usa `metadata.noFactura`, que solo existe en cobros creados por ISPMAX.
- **Preguntas probables:** "El cliente dice que pagó por el link y sigue debiendo." (¿Asentado ✖? → Registrar este cobro); "Salió 'Pagado 2 veces'." (hay que devolver/acreditar la diferencia; la factura no se toca); "¿Qué es 'Por confirmar'?" ❓; "No me deja registrar un cobro." (estado ≠ Pagado o sin pagoId).
- **Pendiente de validar en UI:** ❓ semántica de `created`/`awaiting_confirmation`; ❓ aspecto del aviso de pagos repetidos.

---

## COB-019 · Cobros por pasarela: generar y enviar el enlace de cobro
- **Ruta UI / name:** ficha del cliente → pestaña Facturación/Pagos → icono **Generar enlace de cobro** (icon `link`, color índigo) de cada factura → diálogo **Enlace de cobro** — "Factura N° …".
- **Archivos:** FE: `clientes/components/editar/{IndexFacturas,CobroEnlaceDialog}.vue`, `clientes/components/modals/ModalNuevaFactura.vue:117-185` · BE: `pasarelas-pago/cobros.service.ts`, `envio-cobro.service.ts`, `disponibilidad.service.ts`, `payments-gateway.client.ts`, `dto/enviar-cobro.dto.ts`.
- **Acceso:** el icono se muestra si hay pasarela disponible y la factura está `NO PAGADO`/`PENDIENTE` con total ≠ 0 **y** el usuario tiene `cliente.factura.add` (FE:IndexFacturas.vue:949-960). Backend: JWT.
- **Disponibilidad** (`GET /pasarelas-pago/disponibilidad`, caché 60 s): hay al menos una pasarela con credenciales aceptadas **y que habilite el método `payment_link`**; con varias se usa la `pasarelaPreferida` de Ajustes o la primera por orden alfabético (BE:disponibilidad.service.ts:60-125). Motivos mostrados: "No hay ninguna pasarela de pagos configurada", mensaje de rechazo del proveedor, o "Las credenciales cargadas son válidas pero no habilitan el cobro por enlace. En Payphone hace falta una aplicación tipo API."
- **Generar (`POST /pasarelas-pago/cobro/{pagoId}`)** ✅ (BE:cobros.service.ts:46-197):
  1. Calcula el saldo con `total_servicio − abonos vigentes` (`calcularSaldo`, l.310-318); si ≤ 0: "La factura N° X no tiene saldo pendiente".
  2. Si la factura salió en un **comprobante agrupado**, el enlace cobra **todas las órdenes** del comprobante y el cobro cierra todas (l.443-480).
  3. Antes de generar, **refresca en el gateway los cobros pendientes** de la factura; si no puede: 503 "No se pudo verificar con la pasarela si esta factura ya fue pagada. Reintentá en unos segundos."
  4. Si ya hay un cobro **aprobado que no figura** en la factura → devuelve `yaPagado` (no genera otro): el diálogo muestra "Esta factura ya fue pagada — No se genera un enlace nuevo para evitar un cobro duplicado" y, si queda saldo local, "El pago está confirmado en la pasarela pero la factura todavía figura con saldo … Hay que registrar el abono manualmente."
  5. Valida el **mínimo de la pasarela**: "El monto a cobrar es X, menor al mínimo que acepta la pasarela (Y). Cobralo por otro medio."
  6. **Reutiliza** el enlace vigente si coincide monto y pasarela ("Enlace existente"); si hay enlaces de otro monto/pasarela los informa como "enlaces anteriores todavía sin vencer" (no se pueden anular). Si no, crea el cobro: `method payment_link`, referencia "Factura N° X", vigencia = `vigenciaEnlacePagoHoras` (por defecto **72 h**, máximo **168 h**), clave de idempotencia `pago-{id}-{n}`, `metadata` {pagoId, noFactura, servicioId, grupoComprobante…}.
- **Enviar (`POST /pasarelas-pago/cobro/{pagoId}/enviar`)**: **Enviar al cliente** → canal `WhatsApp`/`Email`/`Ambas`, celular (editable), **Correo del cliente**, selector **Canal de WhatsApp** si hay oficial y no oficial; botones **Enviar** y **Copiar mensaje**; "Copiar solo el enlace". Texto: "Hola {cliente}, te compartimos el enlace para pagar tu factura N° {n} por {total}.\n\n{enlace}". Correo con asunto "{empresa} - Pago de la factura N° {n}". WhatsApp oficial usa la plantilla aprobada `enlace_pago`; no oficial exige sesión conectada ("WhatsApp no oficial desvinculado (sesión sin conexión)"). Validación: "Indica el celular del cliente" / "Indica el correo del cliente". Resultado por canal con ✔/✖.
- **Aviso al editar una factura con enlace abierto** (ModalNuevaFactura): diálogo "El cliente tiene un enlace de pago activo" que advierte que el enlace **sigue cobrando el valor anterior** y que si lo paga "el pago se registra igual y la diferencia queda como saldo a favor"; botones **Editar de todas formas** / **Cancelar**.
- **Recordatorios de pago** pueden incluir `{enlace_pago}` y `{monto_enlace}`: el job genera el enlace de la factura **más antigua con saldo** (BE:pagos/notificar-recortatorio-pago-queue.processor.ts:70-96).
- **Mensajes (texto exacto):** "No se pudo generar el enlace de cobro", "Enlace enviado", "No se pudo enviar por {canales}", "No se pudo enviar el enlace", "Enlace copiado", "Mensaje copiado".
- **Casos límite:** el monto del enlace usa `total_servicio` (ver H-11); un enlace vigente de otro importe sigue siendo pagable.
- **Preguntas probables:** "¿Por qué no me sale el icono del enlace?" (sin pasarela lista, estado de la factura, permiso `cliente.factura.add`); "Cambié la factura y el cliente pagó el valor viejo." (diferencia → saldo a favor); "¿Cuánto dura el enlace?" (72 h por defecto, configurable hasta 168).
- **Pendiente de validar en UI:** ❓ selector de canal de WhatsApp en instalaciones con ambos canales.

---

## COB-020 · Cobros por pasarela: webhook del gateway y asentado automático
- **Ruta UI / name:** `POST /api/pasarelas-pago/webhook` (público; lo llama el payments-gateway).
- **Archivos:** BE: `pasarelas-pago/pasarelas-pago.controller.ts:207-221`, `pasarelas-pago.service.ts:74-241`, `aplicar-pago.service.ts:45-135`, `registro-pagos/registrar-abono.service.ts`, `grupos-facturacion/grupos-facturacion.service.ts:597-715`.
- **Autenticación:** sin JWT; se valida la **firma HMAC-SHA256** del cuerpo crudo (`x-gateway-signature` = `sha256=` + HMAC de `"{timestamp}.{cuerpo}"` con `PAYMENTS_GATEWAY_WEBHOOK_SECRET`) y que `x-gateway-timestamp` esté dentro de ±300 s (BE:pasarelas-pago.service.ts:74-111). Sin secreto configurado el webhook queda deshabilitado (401).
- **Qué hace por evento** ✅:
  | Evento | Acción |
  |---|---|
  | `payment.approved` | Aplica el pago (abajo) y avisa al panel por WebSocket `pago_pasarela` (toast "Pago recibido: {moneda} {monto} de la factura N° {n}", solo visible en la ficha del servicio abierto o en Transacciones; FE:layouts/Notifications.vue:192-208) |
  | `payment.duplicated` | **No toca la factura**; alerta `pago_pasarela_alerta` "El cliente pagó dos veces el mismo enlace" (detalle: "Se registró N cobro(s) de más sobre este enlace. El abono de la factura está bien; hay que devolver o acreditar la diferencia.") |
  | otros (`canceled`, `expired`, `failed`) | Solo se acusa recibo (`{received:true}`) |
- **Aplicar el pago** (`AplicarPagoService.aplicarPagoAprobado`): 
  - Si `metadata.grupoComprobante` → confirma el pago de **todas** las órdenes del comprobante (COB-007); un repetido se detecta por "pendientes de confirmar / ya se usó".
  - Si no, requiere `metadata.pagoId` ("sin-pagoId" → alerta "Pago recibido pero NO registrado") y llama `RegistrarAbonoService.registrar` con: monto = `amountCents/100`, `n_transaccion` y clave de idempotencia = código de autorización (o id de transacción o `paymentId`), forma de pago **"PASARELA DE PAGO"** (código SRI 20) y detalle **PAYPHONE**/**DLOCAL GO** (en mayúsculas), nota "Cobro PayPhone"/"Cobro dLocal Go", operador = nombre de la pasarela, `aplicar_excedente_a_favor: true` (BE:aplicar-pago.service.ts:45-77).
- **Registrar abono (compartido con bot/API)** ✅ (BE:registrar-abono.service.ts:90-381): ver COB-023 para las reglas (idempotencia, comprobante repetido, saldo, recibo vs factura, reconexión).
- **Alertas al panel (permanentes, en cualquier pantalla):** "Pago recibido pero NO registrado" (el cobro se aprobó y no se pudo aplicar: aplicar a mano), "Pago registrado sin comprobante" (no salió el comprobante electrónico), "El cliente pagó dos veces el mismo enlace" (FE:layouts/Notifications.vue:209-226: toast rojo, `timeout 0`, botón **Entendido**).
- **Efectos secundarios externos:** gateway de pagos (consulta), SRI/Factus (comprobante), WhatsApp/correo (recibo), WebSocket (`HOST_WEBSOCKET`), reactivación MikroTik/OLT (COB-004).
- **Casos límite y advertencias:**
  - **La deduplicación de avisos es en memoria** (`Set` por `paymentId:event`), no persistida ni compartida entre instancias; la idempotencia real depende de la clave del abono (H-09).
  - Si el backend estuvo caído y el gateway agotó reintentos, el cobro queda **sin asentar**: se resuelve desde COB-018.
  - El cobro de **factura agrupada** no pasa por `RegistrarAbonoService`: no emite otro comprobante (ya existe).
- **Preguntas probables:** "Pagó por el enlace y no cambió el estado de la factura." (COB-018/COB-025); "¿Quién aparece como operador?" (PayPhone / dLocal Go, con `usuario_id` vacío).
- **Pendiente de validar en UI:** ❓ comportamiento con varias instancias del backend (PM2) y reinicios durante un reintento del gateway.

---
## COB-026 · Recordatorios de pago (envío automático, ejecución bajo demanda y envío manual por factura)

> Resumen de cobranza del módulo `pagos/`. El cron, la regla "toca hoy" y los ajustes están en AUT-015; el editor de textos en MSG-003; la configuración por cliente en CLI-016; el diálogo del perfil en CLI-023. Aquí se cierra el tramo que faltaba: las tres plantillas, la elección de canal y el reparto de los envíos.

- **Ruta UI / name:** (a) Ajustes → Plantillas → pestaña **Recordatorio de pago** (`/ajustes/plantillas` · `ajuste.plantillas`; `variables.ver.recordatorio.pago` / `variables.edita.recordatorio.pago`); (b) perfil del cliente → Facturas → icono de avión **Enviar recordatorio de pago** (`cliente.send.recordatorio`) → diálogo **Enviar mensaje de recordatorios**; (c) widget flotante **Enviando recordatorios** (en todas las pantallas, sin permiso propio) ✅ FE:layouts/RecordatorioProgress.vue; FE:layouts/MainLayout.vue:219.
- **Archivos:** BE: `pagos/notificar-recortatorio-pago-queue.processor.ts` · `pagos/pagos.service.ts:60-165, 1745-1880` · `pagos/pagos.controller.ts:245-299` · `pagos/dto/probar-recordatorio.dto.ts` · `cloud-api/cloud-api.service.ts:1419-1515` · `common/utils/helpers.service.ts:17-100` · FE: `pages/dashboard/ajustes/plantillas/components/RecordatorioPago.vue` · `pages/dashboard/clientes/components/modals/ModalEnviarRecordatorioPago.vue` · `pages/dashboard/clientes/components/editar/IndexFacturas.vue:1065-1090, 1338-1360` · `layouts/RecordatorioProgress.vue`
- **Para qué sirve:** avisar al cliente de su deuda con un mensaje de tres etapas (antes, durante y después del vencimiento), por los canales que cada cliente tenga marcados, de forma automática (hasta 3 horarios al día), a demanda (botón ▶ de cada horario) o para una sola factura (envío manual).
- **Acceso:** pestaña de Ajustes: `variables.ver.recordatorio.pago` (ver) y `variables.edita.recordatorio.pago` (Guardar cambios y ▶ Ejecutar; ver MSG-003); envío manual por factura: `cliente.send.recordatorio`; widget sin permiso. Backend: solo JWT en todos los endpoints de `pagos` (`@Auth()`); el widget y su botón **Cancelar envío** no tienen comprobación de permiso (`POST /pagos/recordatorio-cancelar`) ✅ BE:pagos/pagos.controller.ts:280-299.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Endpoint | Restricciones/efectos |
  |---|---|---|---|
  | Guardar cambios (pestaña Recordatorio de pago) | Guarda ajustes y reprograma | `PATCH /settings/:id` → `PUT /programar-queue/recordatoriosPago` → `PUT /pagos/agregar-colas-recordatorio-pago` | la segunda llamada ejecuta `init()` con vaciado de Redis (AUT-036); `FE:RecordatorioPago.vue:44-52` |
  | ▶ (tooltip "Ejecutar este recordatorio ahora") → diálogo "Ejecutar recordatorio #N" ("¿Deseas ejecutar **ahora** el recordatorio #N? Se enviará **de verdad** a los clientes que hoy correspondan a este recordatorio (el mismo envío que haría el automático de las HH:mm).", **Sí, ejecutar** / **Cancelar**) | Lanza la corrida del horario N sin esperar al cron | `POST /pagos/recordatorio-pago/ejecutar/:index` | 400 "El envío de recordatorios está desactivado en la configuración.", "Recordatorio no válido.", "Ya hay un envío de recordatorios en curso. Espera a que termine."; responde `Recordatorio #N iniciado.`; deja log `RUN_REMINDER_NOW` ("Recordatorio #N ejecutado manualmente (bajo demanda)") |
  | Probar → diálogo (Etapa a probar: "Antes del vencimiento", "Durante el vencimiento", "Después del vencimiento"; Canal: "Correo", "WhatsApp", "Ambos"; Correo de prueba / WhatsApp de prueba; texto: "Se enviará un recordatorio de prueba con datos de ejemplo (cliente, plan y montos ficticios) al destino que indiques."; **Cancelar** / **Enviar prueba**) | Envía una prueba con datos de ejemplo | `POST /pagos/recordatorio-pago/probar` | usa el texto del editor aunque no esté guardado; 400 "La plantilla seleccionada está vacía. Escribe un mensaje antes de probar.", "Indica un correo para la prueba.", "Indica un número de WhatsApp para la prueba."; el resultado se muestra como "✅ Correo enviado · ❌ WhatsApp: …" |
  | Enviar recordatorio de pago (icono avión, fila de la factura) → **Enviar mensaje de recordatorios** | Recordatorio de UNA factura | `POST /pagos/enviar-recordatorios-pago` | visible con `cliente.send.recordatorio`, estado `NO PAGADO`/`PENDIENTE`, total ≠ 0 y vencimiento no futuro; en el menú móvil solo `NO PAGADO` y sin comprobar la fecha ✅ FE:IndexFacturas.vue:1065-1090, 1338-1360 |
  | Cancelar envío (widget) → "¿Seguro que deseas detener el envío de recordatorios? Los mensajes ya enviados no se revierten." (**No** / **Sí, cancelar**) | Pide cortar la corrida | `POST /pagos/recordatorio-cancelar` | marca `recordatorio-cancelar-<PORT>`; la corrida revisa la marca antes de cada envío y cada 2 s durante la espera |

- **Campos del diálogo manual:** **Enviar por:** (WhatsApp, Email, Ambas; obligatorio), **Canal de WhatsApp:** (Oficial / No oficial, solo si ambos canales están disponibles), **Celular del cliente:** (precargado del cliente; menú de números de referencia "N° principal"), **Email del cliente:** (validación `usuario@dominio.xx`; "Ingresa un email válido"; "Debes completar este campo"), casilla **Adjuntar documento PDF**, botón **Enviar**. El cuerpo viaja con `tipo_envio`, `telefono`, `email`, `pago_id`, `tipoComprobante: 'factura'`, `wa_provider`, `adjuntarPdf` ✅ FE:ModalEnviarRecordatorioPago.vue:19-100. **La petición no se espera**: el diálogo se cierra y muestra siempre "procesando envio...." (éxito), aunque el backend falle; el resultado real queda en Mensajes enviados (`origen: recordatorio_pago`) y en el log del servicio (:77-88).
- **Plantillas (qué texto sale)** ✅:
  - Hay **tres textos** en `settings.plantillaNotificacion` (`antes`, `durante`, `despues`) más el interruptor `adjuntarPdf`. La etapa la decide la regla del cliente: `Notificar suspensión` → `durante` (solo el día del corte); `N Días` + `Antes del vencimiento` → `antes`; `N Días` + `Después del vencimiento` → `despues`. En el envío **manual** no hay regla del cliente: `durante` si hoy es la fecha de corte efectiva, `antes` si es anterior, `despues` si es posterior (`BE:…processor.ts:189-251`).
  - Variables que rellena el backend: `{cliente}`, `{corte}`, `{total}`, `{plan}`, `{empresa}`, y `{enlace_pago}` / `{monto_enlace}` solo si el texto de la etapa las usa y hay una pasarela disponible (`DisponibilidadService.consultar()`); el editor las ofrece únicamente con pasarela disponible. Sin enlace, se quitan del texto los párrafos, ítems o líneas que contengan esas variables y el mensaje sale igual (`:618-654, 70-110`). La coincidencia tolera espacios y etiquetas del editor dentro de las llaves (`:63-68`; `helpers.service.ts:32-51`).
  - `{total}`: con **Sumar meses atrasados en el total** activo, la deuda completa del servicio (`getFechaMaximoPago(servicio, 1).deuda.totalConIva`, o el cálculo propio si da 0); inactivo, solo la factura pendiente más antigua **con saldo** (la misma que cobra el enlace). Con `PAIS = VE` y la opción `tasaBcv.recordatorioValorPlan` se usa el precio del plan (AJS-034). `{corte}`: fecha de corte con días de gracia si **Sumar días de gracia en fecha de pago** está activo, sin ellos si no; la promesa de pago activa de la factura elegida la reemplaza; y se desplaza al siguiente día de corte habilitado del router (`:359-479`).
  - **Envío manual:** el backend no recibe `sumarDiaGracias` ni `cantidadFacturasIgnorar` (solo `plantillaNotificacion`, `diasCortes`, `horasPorDia`, `sumarMesesAtrasados`, sesión y usuario), de modo que `{corte}` sale **sin** días de gracia aunque el ajuste esté activo ✅ BE:pagos/pagos.service.ts:1745-1776 frente a `…processor.ts:469`.
  - **Etapa sin texto:** `plantillaSeleccionada = plantillaNotificacion[etapa] || plantillaNotificacion` (el objeto completo): el correo y el WhatsApp no oficial de ese cliente fallan al procesar el texto y quedan como envío fallido; no hay validación previa salvo en **Probar** (`:631`).
  - **Textos del correo:** asunto fijo `<empresa> - Recordatorio de pago` (`… (PRUEBA)` en la prueba); WhatsApp no oficial: HTML normalizado (espacios alrededor de negritas) y convertido a texto de WhatsApp; con PDF: primero el mensaje y luego un `send-media/file` por cada factura pendiente (`comprobante-pago-pendiente-N.pdf`) (`:811-856, 1020-1032`).
  - **WhatsApp Oficial:** se envía la plantilla Meta aprobada `recordatorio_pago_<antes|durante|despues>` con las variables del cuerpo (todas deben llegar con valor; si no: "El cliente tiene datos incompletos: la(s) variable(s) X llegó vacía. Meta rechaza plantillas con parámetros vacíos."; un `{enlace_pago}` en la plantilla aprobada sin pasarela provoca ese error porque la limpieza de líneas solo se aplica al texto libre). Si la plantilla Meta lleva encabezado de documento, adjunta el **primer** comprobante pendiente (el encabezado admite un solo archivo) y lo genera bajo demanda si no se marcó **Adjuntar PDF**. Antes de la corrida automática se sincroniza una vez por empresa el estado de las plantillas (`syncTemplates`) (`:515-528, 698-737`; `BE:cloud-api/cloud-api.service.ts:1419-1515`).
- **Reparto de los envíos (corrida automática o bajo demanda)** ✅ (`BE:…processor.ts:279-1189`):
  1. Se leen las facturas `FACT. DE SERVICIO` impagas (`NO PAGADO`/`PENDIENTE`) de clientes con recordatorio activo para el horario (AUT-015) y se arma un registro por servicio no retirado. Se consulta una vez la sesión de WhatsApp no oficial; si no está conectada se crea la notificación `WhatsApp Desvinculado` para todos los usuarios activos (aunque la empresa use solo el canal oficial) (`:327-357`).
  2. Se reducen a "los que tocan hoy" y se publica el avance (`recordatorio-progreso-<PORT>`) y la lista planificada (`recordatorio-planificados-<PORT>`); si hoy no toca a nadie el widget no se enciende (`:530-577`).
  3. Se recorre **un cliente (servicio) a la vez**: revisa cancelación; revisa que sigan impagas (si pagó, cuenta como procesado y no espera); resuelve el enlace de cobro; genera los PDF uno a uno (si falla el PDF, el mensaje sale sin adjunto); WhatsApp (si el cliente tiene "WhatsApp" marcado, el canal está activo y no se envió ya hoy) y Correo (si "Correo" marcado, SMTP activo y no enviado ya hoy). Un fallo de un canal no impide el otro (`:580-1113`).
  4. Canal WhatsApp por mensaje: automático → `esCanalOficial` (aplica el overflow, AUT-021); manual → el canal elegido en el diálogo (`wa_provider`). Oficial: plantilla Meta (registro `wa_provider: cloud_api`, `wamid` guardado); no oficial: sesión conectada ("WhatsApp no oficial desvinculado (sesión sin conexión)"), número con WhatsApp ("Cliente no usa WhatsApp") y envío (`fastMode` solo en manual o con PDF).
  5. Cada intento se registra en Mensajes enviados (`origen: recordatorio_pago`) y en el log del servicio (`SEND_WHATSAPP` "Recordatorio de pago enviado exitosamente por WhatsApp" / "…por WhatsApp Oficial (plantilla)", `SEND_EMAIL`, `*_ERROR`). Los fallos generan campanita (`Falla al enviar WhatsApp Oficial`, `Cliente sin WhatsApp` "…porque no usa WhatsApp.", `Falla al enviar WhatsApp`, `Falla al enviar Email`) solo para SUPER-ADMINISTRADOR (primer rol) y usuarios asignados al router del cliente.
  6. Deduplicación diaria por servicio y canal con la clave Redis `app-queue-<PORT>-mensajes-enviados-<YYYY-MM-DD>` (se borra la del día anterior; el envío manual la ignora y la sobrescribe) (`:484-498, 685, 1018, 1115-1124`).
  7. **Intervalo anti-baneo:** tras cada envío realizado y salvo el último, espera 30 s si el canal vigente es el oficial (`esCanalOficial`) o entre 120 y 180 s aleatorios si no; la espera se parte en tramos de 2 s para atender **Cancelar envío**; si el envío falló no espera (`:1126-1161`). Una corrida de N clientes por el canal no oficial dura, por tanto, del orden de N × 2–3 min.
  8. Al terminar apaga el progreso y limpia la marca de cancelar; ante un error general lo apaga y lanza `Error al enviar recordatorios:` (`:1170-1188`).
- **Widget "Enviando recordatorios":** consulta `GET /pagos/recordatorio-progreso` periódicamente (AUT-015: cada 6 s); botones "Ver mensajes" (modal **Recordatorios del día** con columnas Cliente, Canal, Destino, Estado, Fecha, Mensaje, y filas "por enviar" para la lista planificada) y **Cancelar envío** / "Cancelando…" (`FE:layouts/RecordatorioProgress.vue:30-70, 130-280`; carga los mensajes con `GET /mensajes-masivos/detalles?origen=recordatorio_pago&fechaDesde=<hoy>&limit=2000`).
- **Mensajes de error/éxito (texto exacto):** ver tabla de botones; además "Actualización exitosa", "Estados actualizados", "No se pudo sincronizar", "No se pudo enviar la prueba", "No se pudo iniciar el recordatorio", "Prueba enviada", "Recordatorio iniciado" (`FE:RecordatorioPago.vue:51, 125-127, 161-206`).
- **Efectos secundarios externos:** SMTP, gateway de WhatsApp (Baileys), WhatsApp Cloud API (Dualhook/Meta), pasarela de pago (enlace), Chromium (PDF), websocket (campanita).
- **Relaciones con otros módulos:** Cortes (fecha de corte y días habilitados, AUT-007/AJS-007), Promesas de pago (fecha de corte reemplazada, COB-014/AUT-011), Mensajería (AUT-020/021), Cobros por pasarela (COB-019), Cliente (CLI-016), Ajustes → Base de datos → Cambios masivos (AJS-019).
- **Casos límite y advertencias:** (1) el horario #N de la corrida lee `recordatorio_N` de cada cliente; el procesador no declara concurrencia (`@Process('recordatorio_pago')`), así que la cola trabaja de a uno: si un horario empieza mientras otro sigue enviando, espera a que termine (con los tres horarios iguales por defecto, `06:15`, corren uno tras otro); "Ejecutar ahora" se rechaza mientras el progreso esté activo; (2) la lista se arma al empezar: un cliente que paga durante la corrida se omite, pero uno que se suspende o cambia de plan no; (3) los datos del repetible son una foto del ajuste (H-09): cambiar los textos en otra pantalla no llega hasta reprogramar; (4) el envío manual no deja constancia en la caché diaria si el servicio no tenía entrada previa (escribe en la posición `-1` del arreglo, que no se guarda): el cron del mismo día puede volver a enviarle; (5) pulsar **Cancelar envío** sin corrida activa deja la marca `recordatorio-cancelar` puesta hasta que arranque la siguiente corrida automática, que la borra al empezar; con corrida activa la borra al terminar (`:541, 1173`).
- **Preguntas probables de usuarios:**
  1. "¿A qué hora salen los recordatorios y por qué no salió el de hoy?" (horarios, regla del cliente, canal apagado: AUT-015).
  2. "El mensaje dice una fecha de corte distinta a la de la factura." (días de gracia, siguiente día de corte habilitado, promesa activa; el envío manual no suma gracia).
  3. "¿Cómo envío un recordatorio solo a un cliente?" (icono de avión de la factura, `cliente.send.recordatorio`).
  4. "Pulso Enviar y dice 'procesando envio....' pero no llega nada." (el diálogo no espera; revisar Mensajes enviados y la campanita).
  5. "¿Por qué tarda tanto en enviar los recordatorios?" (30 s entre mensajes en oficial; 2–3 min en no oficial).
  6. "¿Cómo detengo un envío en curso?" (widget → Cancelar envío).
  7. "¿Cómo pongo el enlace de pago en el recordatorio?" (`{enlace_pago}` y `{monto_enlace}`, requiere pasarela disponible).
  8. "Probé el mensaje y el WhatsApp fue con otro texto." (con Oficial se usa la plantilla aprobada de la etapa).
- **Pendiente de validar en UI:** ❓ aspecto del diálogo **Enviar mensaje de recordatorios** y del modal **Recordatorios del día**; ❓ duración real de una corrida con muchos clientes por el canal no oficial.

---
## COB-027 · Límite de facturas sin pagar para dejar de facturar a suspendidos
- **Ruta UI / name:** `/ajustes/facturacion` · `variables.facturacion` · grupo "Generación de facturas": selector **"Facturas sin pagar para dejar de crear"** (1 a 12 "factura(s)"), solo visible con **Crear facturas a suspendidos** apagado (FE:pages/dashboard/ajustes/facturacion/components/FacturacionPage.vue:98-103, 150-190).
- **Archivos:** FE: `FacturacionPage.vue`, `empresas/composables/useSetting.js:11,188` (defecto 1) · BE: `crear-facturas/crear-facturas.service.ts:51-68` (`puedeFacturarSuspendido`) y usos en `:249` (mensual), `:544` (anticipada), `:595` y `:682` (por fecha de pago), `settings/entities/setting.entity.ts` (`limiteFacturasImpagasSuspendidos int default 1`), `settings/dto/create-setting.dto.ts` (entero 1–12, mensajes "El límite de facturas sin pagar debe ser al menos 1." / "no puede superar 12."), migración `1789200000000-LimiteFacturasImpagasSuspendidos.ts`.
- **Para qué sirve:** que un cliente suspendido por deuda deje de acumular facturas nuevas tras N sin pagar, en vez de todo o nada.
- **Reglas** ✅: (1) `facturar_suspendidos = true` → siempre se factura. (2) Si no: límite ≤ 1 → no se factura a suspendidos. (3) Límite ≥ 2 → se factura si el servicio tiene **al menos 1** y **menos de N** facturas `NO PAGADO`/`PENDIENTE` (excluye `FACT. LIBRE`). Un suspendido con 0 impagas (pausado a mano) no se factura. (4) En el modo "Desde Último Pago" el job mensual procesa al suspendido sin aplicar el límite (`:249`). (5) En la creación por fecha de pago el límite se vuelve a medir tras crear la primera factura de la corrida (`:682`).
- **Texto exacto (tooltip):** "Aplica solo a clientes suspendidos y mientras «Crear facturas a suspendidos» esté apagado. Indica con cuántas facturas sin pagar se deja de crearles facturas nuevas. 1 (por defecto): al suspenderse por deuda no se le crea ninguna factura más. 2 o más: se le sigue creando hasta acumular esa cantidad sin pagar. Ej. con 2: no paga la del 28/10 y se suspende; el 1/11 se le crea la siguiente (queda con 2 sin pagar) y desde ahí no se le crean más. Un suspendido sin facturas por pagar (p. ej. pausado a mano) no se factura."
- **Preguntas probables:** "¿Por qué sigue generándole facturas a un cliente suspendido?"; "¿Por qué dejó de facturarse a un suspendido?"
- **Pendiente de validar en UI:** ❓ comportamiento real en una corrida con router y cortes (instancia sin routers).

---

## COB-028 · "Día de pago al cobrar": interruptor en el modal de pago
- **Ruta UI / name:** `/registrar-pago` (PayComponent) y modal de pago del perfil del cliente (`ModalPago.vue`).
- **Archivos:** FE: `registrar-pago/components/PayComponent.vue:86-89, 378, 563, 1077-1103` · `clientes/components/modals/ModalPago.vue:75-80, 376, 532, 1073-1100` · `composables/useFormPago.js:27` (`mover_dia_pago: false`) · `css/app.scss` (`.caja-mover-dia`) · BE: `pagos/dto/create-pago.dto.ts` (`mover_dia_pago?: boolean`), `pagos/pagos.service.ts:530, 616, 725, 763-767`.
- **Qué hace:** con `moverDiaPagoAlCobrar` **y** `moverDiaPagoPorCliente`, el cobro muestra el interruptor **"Día de pago al cobrar (opcional)"**: apagado "No mover el día (N)", encendido "Día N → hoy". Tooltip: "Activado, el día de pago del cliente pasa al día de este cobro. Sólo aplica si el pago salda la factura; no a abonos parciales ni a meses adelantados." En `ModalPago` se oculta en facturas libres (`!esFacturaLibre`).
- **Backend** ✅: `mover_dia_pago` se descarta antes del UPDATE de `pagos` (`:530`) y se pasa a `moverDiaPagoAlCobrar`; con `moverDiaPagoPorCliente` el día solo se mueve si `moverDiaPago === true` (`:763-767`). Sin `moverDiaPagoPorCliente` se aplica a todos (como antes). El resto de reglas: ver COB-003 (8) y AJS-009.
- **Cambio de comportamiento respecto al ZIP 2026-10-06:** antes la decisión era un campo por cliente (**"Día de pago al cobrar"**, `factura_id.moverDiaPagoAlCobrar`) en la pestaña Facturación del perfil (`FactAndNot.vue`); ese campo se eliminó. También se oculta en ambos modales el campo "Plazo de pago / Factura a crédito" (ver COB-002).
- **Casos límite:** el interruptor vive dentro del bloque que se oculta con `VITE_OCULTAR_MESES_PLAZO=true`, así que con esa variable no hay forma de elegir cobro por cobro y, con `moverDiaPagoPorCliente` activo, el día nunca se mueve. El día nuevo es el del abono (`fecha_abono`); la pantalla muestra el día de hoy.
- **Preguntas probables:** "¿Dónde marco que el día de pago cambie al pagar?"; "El cliente cambió solo de día de pago."
- **Pendiente de validar en UI:** ❓ aspecto del interruptor en la instancia con ambos ajustes activos.

---

## COB-029 · Vencimiento por defecto de la factura manual (con días de gracia)
- **Ruta UI / name:** perfil del cliente › Facturación/Pagos › **Agregar factura** (`ModalNuevaFactura.vue`), campo **Vencimiento**.
- **Archivos:** FE: `clientes/components/modals/ModalNuevaFactura.vue:77, 231-262`.
- **Regla** ✅ (`diasGracia = parseInt(dia_gracia) || 0`): (a) servicio **sin pagos**: día de pago de este mes (de **mes siguiente** si es `postpago`) **+ días de gracia**; (b) con pagos y corte **"Desde Último Pago"**: último vencimiento + N meses (sin ajustar día); (c) con pagos y otro corte: último vencimiento − gracia + (1 + meses adelantados) meses, con el día de pago (limitado a los días del mes) **+ gracia**. Antes sumaba un mes y un día fijo (`addToDate … day: 1`), el postpago no sumaba el mes (`fecha.add` sin asignar) y `dia_gracia` se leía como texto.
- **Páginas del manual afectadas:** ninguna describe este valor por defecto (candidata: `guia/saldos-cargos` › Agregar una factura).
- **Pendiente de validar en UI:** ❓ valores resultantes con días de gracia distintos de 0.

---
<!-- FIN-PARTE-4 -->

## Hallazgos del dominio

> Se añaden aquí solo los hallazgos del cierre de lectura de COB-026; los demás están en `notes/hallazgos.md`.

- **Cierre (COB-026):** el envío manual de un recordatorio (`POST /pagos/enviar-recordatorios-pago`) no recibe `sumarDiaGracias`, así que `{corte}` sale sin días de gracia aunque **Sumar días de gracia en fecha de pago** esté activo; el cron sí lo respeta (`BE:pagos/pagos.service.ts:1745-1776` frente a `BE:pagos/notificar-recortatorio-pago-queue.processor.ts:469`).
- **Cierre (COB-026):** el diálogo **Enviar mensaje de recordatorios** no espera la respuesta (`api.post` sin `await`): siempre muestra "procesando envio...." y el `catch` nunca se ejecuta (`FE:pages/dashboard/clientes/components/modals/ModalEnviarRecordatorioPago.vue:77-88`).
- **Cierre (COB-026):** una etapa (`antes`/`durante`/`despues`) sin texto no se valida en la corrida: la expresión `plantillaNotificacion[etapa] || plantillaNotificacion` pasa el objeto completo y el envío de ese cliente falla; solo **Probar** avisa "La plantilla seleccionada está vacía…" (`BE:…processor.ts:631`; `BE:pagos/pagos.service.ts:1790-1793`).
- **Cierre (COB-026):** con WhatsApp Oficial, si la plantilla aprobada contiene `{enlace_pago}` y no hay pasarela disponible, el envío falla con "El cliente tiene datos incompletos…" porque la limpieza de líneas con el enlace solo se aplica al texto libre (`BE:…processor.ts:639-654` frente a `BE:cloud-api/cloud-api.service.ts:1463-1470`).
- **Cierre (COB-026):** el icono **Enviar recordatorio de pago** del menú móvil de la factura solo exige `NO PAGADO` (no `PENDIENTE`) y no comprueba el vencimiento; el de escritorio exige `NO PAGADO`/`PENDIENTE`, total ≠ 0 y vencimiento no futuro (`FE:pages/dashboard/clientes/components/editar/IndexFacturas.vue:1065-1075, 1343-1348`).
