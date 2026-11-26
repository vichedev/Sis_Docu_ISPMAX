# Inventario AJS1 — Ajustes del sistema (cortes, facturación, OLTs, base de datos, logs, sistema, instalación, ticket, empresa)

> Alcance: FE `pages/dashboard/ajustes/{IndexPage.vue, servicios/, facturacion/, sistema/, base-datos/, logs/, smartOLT/, instalacion/, ticket/, empresa/}` (+ `pages/dashboard/empresas/**` y `pages/dashboard/sucursales/**`, que son lo que `ajustes/empresa` monta) · BE `settings/`, `database/`, `custom-fields/`, `logs/`, `companies/`, `sucursal/`, `deploy/`, más los consumidores rastreados (`app.service.ts`, `app-queue.processor.ts`, `smart-olt/*`, `admin-olt/*`, `crear-facturas/*`, `instalaciones/*`, `ticket/*`, `pagos/*`). Generado desde el ZIP del 2026-10-06.
> Convención de citas: `FE:` = `frontend-isp-main/src/…`; `BE:` = `backend-isp-main/src/…`. ✅ = leído en código. No hay 🖥️ (sin instancia). Rutas SPA en modo hash (`/#/ajustes/...`, ver `notes/hallazgos.md`).
> Pantallas del panel **fuera** de este inventario (otro agente): Plantillas (salvo las pestañas Instalación y Tickets), Mensajería, Formas de pagos, Pasarelas de Pagos, Firma de Contratos, Gestión Personal, Roles y Permisos. Aquí solo se documenta su **tarjeta** en el panel.

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| AJS-001 | Panel de Ajustes: tarjetas y accesos | `/ajustes` · `ajustes.index` | ver sección AJS-001 (una por tarjeta) | completo |
| AJS-002 | Licencia (diálogo: plan, cupo, facturas de la suscripción) | `/ajustes` → tarjeta "Licencia" | ninguno (solo si `vinculado`) | completo |
| AJS-003 | Cortes · Días habilitados para cortes (global) | `/ajustes/servicio` · `ajuste.servicio` | `variables.dias-habilitados` | completo |
| AJS-004 | Cortes · Horarios de cortes (global) | idem | `variables.horario.cortes` | completo |
| AJS-005 | Cortes · Reintentos automáticos + "Aplicar Cortes/Activación" (global) | idem | `variables.reintentos.mikrotik` · `variables.opciones-cortes` · `variables.aplicar-cortes` (visibilidad de la tarjeta) | completo |
| AJS-006 | Cortes · Aplicar cortes manualmente | idem | `variables.aplicar-cortes` | completo |
| AJS-007 | Cortes · Configuración personalizada por router | idem (selector "Configurar cortes de") | sin permiso propio | completo |
| AJS-008 | Motor de cortes y reintentos (cron, MikroTik, SmartOLT, AdminOLT, Slack) | — (backend) | — | completo (el push interno a MikroTik `repararRouter` se resume, no se lee entero) |
| AJS-009 | Facturación · reglas generales, anulación, registro de pagos | `/ajustes/facturacion` · `ajuste.facturacion` | `variables.facturacion` | completo |
| AJS-010 | Facturación · botón "Generar facturas pendientes" | idem | `variables.facturacion` | completo |
| AJS-011 | Facturación · Factus (Colombia/DIAN) | idem, pestaña "Factus" (solo `VITE_PAIS=CO`) | `variables.facturacion` | completo |
| AJS-012 | Facturación · Tasa BCV (Venezuela) | idem (solo `VITE_PAIS=VE`) | `variables.facturacion` | completo |
| AJS-013 | OLTs · Reinicio automático de ONUs (SmartOLT) | `/ajustes/smartolt` · `ajuste.smartolt`, pestaña SmartOLT | `variables.reintentos.smartOLT` | completo |
| AJS-014 | OLTs · Reinicio automático de ONUs (AdminOLT) | idem, pestaña AdminOLT | `variables.reintentos.smartOLT` | completo |
| AJS-015 | OLTs · Perfil TR-069, Tipo de ONU y Mgmt IP por defecto (SmartOLT) | idem, pestaña SmartOLT | sin permiso propio (entra con `variables.reintentos.smartOLT` o `variables.opciones-cortes`) | completo |
| AJS-016 | OLTs · Validación de ONUs (SmartOLT / AdminOLT) | idem, ambas pestañas | sin permiso propio | completo |
| AJS-017 | Base de datos · Campos personalizados | `/ajustes/base-datos` · `ajuste.base-datos`, pestaña | `base-datos.campos` | completo |
| AJS-018 | Base de datos · Eliminar datos (borrado lógico masivo de clientes) | idem (tarjeta dentro de la pestaña Campos personalizados) | `base-datos.campos` | completo |
| AJS-019 | Base de datos · Cambios masivos de facturación y recordatorios | idem, pestaña | `base-datos.cambios-masivos` | completo |
| AJS-020 | Base de datos · Ubicaciones | idem, pestaña | sin permiso propio | completo |
| AJS-021 | Logs · Historial de actividad del sistema | `/ajustes/logs` · `ajuste.logs` | `ver.logs` | completo |
| AJS-022 | Sistema · Actualizar Sistema (deploy) | `/ajustes/sistema` · `ajuste.sistema` | cuenta reservada (email fijo) / SUPER-ADMINISTRADOR por URL | completo |
| AJS-023 | Instalación · Notificaciones por estado | `/ajustes/plantillas` → pestaña "Instalación" → "Notificaciones por estado" | `variables.ver.plantilla.instalacion` | completo |
| AJS-024 | Instalación · Checklist de instalación | idem → "Checklist instalación" | `variables.ver.plantilla.instalacion` | completo |
| AJS-025 | Ticket · Plantilla mensaje cliente | `/ajustes/plantillas` → "Tickets" → "Plantilla mensaje cliente" | `variables.ver.plantilla.ticket` · editar `variables.edita.plantilla.ticket` | completo |
| AJS-026 | Ticket · Plantilla mensaje técnico | idem → "Plantilla mensaje tecnico" | idem | completo |
| AJS-027 | Ticket · Firma del ticket (electrónica / manuscrita) | idem → "Firma del ticket" | `variables.ver.plantilla.ticket` (sin permiso de edición propio) | completo |
| AJS-028 | Ticket · Técnicos de apoyo | idem → "Técnicos de apoyo" | `variables.ver.plantilla.ticket` (sin permiso de edición propio) | completo |
| AJS-029 | Empresa · datos fiscales, logo, certificado | `/ajustes/empresa` · `ajuste.empresa`, pestaña "Empresa" | `ajuste.empresa` + `index.empresa` · guardar `editar.empresa` | completo |
| AJS-030 | Empresa · Sucursales | idem, pestaña "Sucursales" | `index.sucursal` · `crear.sucursal` · `editar.sucursal` · `activar.inactivar.sucursal` · `eliminar.sucursal` | completo |
| AJS-031 | API de ajustes (`/settings`): contrato, defaults y consumidores de cada clave | — (backend) | solo JWT (sin permisos) | completo (las 56 columnas de `settings`; los lectores de las plantillas `MSG-*` y de impresión se citan, no se leen a fondo) |
| AJS-032 | Catálogo de permisos de Ajustes (clave → qué abre) | Roles y Permisos → grupo "Ajustes" | — | completo |
| AJS-033 | Facturación · Pasarela "Pago Internet" (pestaña informativa con URL del sistema y API key) | `/ajustes/pasarelas-pago` → pestaña "Pago Internet" | mismos permisos que Formas de pago (`ajuste.forma-pago`) | completo |
| AJS-034 | Facturación · Tasa BCV: "Recordatorio de pago: enviar el valor del plan" (solo Venezuela) | `/ajustes/facturacion` → Tasa BCV | `variables.facturacion` | completo |

## AJS-001 · Panel de Ajustes (tarjetas y accesos)

- **Ruta UI / name:** `/ajustes` · `ajustes.index` · menú lateral "Ajustes" (ícono `settings`).
- **Archivos:** FE: `pages/dashboard/ajustes/IndexPage.vue` · `layouts/SideBarMenu.vue:419-442` · `router/routes.ts:374-379` · `router/auth-guard.ts` · `composables/useRolPermisos.js`. BE: `GET /customers/licencia-suscripcion` y `GET /customers/facturas-suscripcion` (solo para la tarjeta Licencia, ver AJS-002).
- **Para qué sirve:** pantalla-índice con accesos circulares (`q-avatar` teal) a cada sección de configuración. No guarda nada por sí misma.
- **Acceso (menú):** el ítem "Ajustes" del menú lateral aparece si el rol tiene **alguno** de: `variables.dias-habilitados`, `variables.facturacion`, `variables.horario.cortes`, `variables.reintentos.mikrotik`, `variables.reintentos.smartOLT`, `variables.aplicar-cortes`, `variables.opciones-cortes`, `variables.vincular.whatsApp`, `variables.config.servidor.correo`, `ajuste.empresa`, `ajuste.forma-pago`, `ajuste.plantillas` (`FE:layouts/SideBarMenu.vue:421-434`) ✅.
- **Acceso (ruta):** el guard deja entrar a `/ajustes` solo si el usuario tiene alguna clave de las listas `ajusteServicios` (7), `ajustePlantillas` (7), `ajusteMensajeria` (2) o `ajusteBaseDatos` (2) (`FE:router/auth-guard.ts:37-77, 95-99`), o es `SUPER-ADMINISTRADOR` (primer rol del JWT, `auth-guard.ts:138`). **No** incluye `ver.logs`, `ajuste.empresa`, `ajuste.forma-pago`, `ajuste.plantillas`, `index.usuario`, `index.rol` ✅ (ver Hallazgos H-01). Si falla, redirige al primer permiso del usuario cuyo texto contenga `index` (`auth-guard.ts:143-160`) o a `/login`.
- **Secciones / pestañas:** una fila de tarjetas (sin pestañas). Orden y condición de cada una:

| # | Etiqueta exacta | Destino (name) | Condición para verla (`IndexPage.vue`) |
|---|---|---|---|
| 1 | "Configuración de Cortes" (ícono `settings`) | `ajuste.servicio` | `tieneAlguno(['variables.dias-habilitados','variables.horario.cortes','variables.reintentos.mikrotik','variables.aplicar-cortes'])` (l.111-118) |
| 2 | "Facturación" (`receipt_long`) | `ajuste.facturacion` | `variables.facturacion` (l.141) |
| 3 | "OLTs" (`router`) | `ajuste.smartolt` | `tieneAlguno(['variables.reintentos.smartOLT','variables.opciones-cortes'])` (l.167-171) |
| 4 | "Logs" (`article`) | `ajuste.logs` | `ver.logs` (l.196) |
| 5 | "Plantillas" (`edit_document`) | `ajuste.plantillas` | `tieneAlguno([variables.ver.recordatorio.pago, …mensaje.bienvenida, …pago.recibido, …plantilla.impresion.pagos, …plantilla.ticket, …plantilla.mensaje.contrato, …plantilla.documentos.contrato])` **y** `ajuste.plantillas` (l.221-231) |
| 6 | "Mensajeria" (`send`) | `ajuste.mensajeria` | `variables.config.servidor.correo` o `variables.vincular.whatsApp` (l.257-260) |
| 7 | "Gestión Personal" (`supervisor_account`) | `index.usuario` | `index.usuario` (l.285) |
| 8 | "Roles y Permisos" (`admin_panel_settings`) | `index.rol` | `index.rol` (l.308) |
| 9 | "Empresa" (`business`) | `ajuste.empresa` | `tieneAlguno(['index.empresa','index.sucursal'])` **y** `ajuste.empresa` (l.331-336) |
| 10 | "Base de datos" (`storage`) | `ajuste.base-datos` | `tieneAlguno(['base-datos.campos','base-datos.cambios-masivos'])` (l.362) |
| 11 | "Sistema" (`system_update`) | `ajuste.sistema` | `claim.email == 'info@rednuevaconexion.net'` (l.387) — **no usa permisos** |
| 12 | "Formas de pagos" (`request_quote`) | `ajuste.forma-pago` | `tieneAlguno(['index.forma-pago','index.detalle-forma-pago'])` y `ajuste.forma-pago` (l.412-417) |
| 13 | "Pasarelas de Pagos" (`credit_card`) | `ajuste.pasarelas-pago` | misma condición que la 12 (comentario l.440-442: "se reutiliza el permiso de formas de pago") |
| 14 | "Firma de Contratos" (`draw`) | `ajuste.firma-electronica` | `tieneAlguno([variables.ver.plantilla.mensaje.contrato, variables.ver.plantilla.documentos.contrato])` y `ajuste.plantillas` (l.476-481; comentario "se reutiliza el permiso de plantillas") |
| 15 | "Licencia" (`workspace_premium`) | abre diálogo (AJS-002) | `licenciaInfo?.vinculado` (l.505) |

- **Botones y acciones:** cada tarjeta hace `$router.push({ name })`. Efecto de hover (sombra + `translateY(-5px)`).
- **Relaciones con otros módulos:** SideBarMenu, auth-guard, `useRolPermisos` (SUPER-ADMINISTRADOR siempre `true`, `useRolPermisos.js:15`; cualquier error al descifrar permisos devuelve `false`, l.30-33).
- **Casos límite y advertencias:**
  - Las claves del guard y las de las tarjetas **no coinciden** (H-01, H-02, H-03).
  - La tarjeta "Sistema" depende de un email fijo en el código, no de un permiso (ver AJS-022).
  - El "círculo" de licencia aparece tras `onMounted → cargarLicencia()` (l.98); sin respuesta del master no aparece.
- **Preguntas probables de usuarios:**
  1. "No veo el panel de Ajustes / me falta una tarjeta" → depende de los permisos del rol (tabla de arriba).
  2. "Soy administrador y no veo 'Sistema'" → es una tarjeta reservada a una cuenta concreta.
  3. "Tengo permiso de Empresa pero al pulsar Ajustes me manda a otra pantalla" → H-01.
  4. "Tengo el permiso de Logs pero no veo Ajustes en el menú" → `ver.logs` no cuenta para el ítem del menú; entrar por URL `/#/ajustes/logs`.
  5. "Veo Pasarelas de Pagos pero al pulsar me devuelve al inicio" → H-03.
  6. "¿Qué es el círculo 'Licencia'?" → AJS-002.
- **Pendiente de validar en UI:** ❓ aspecto real y orden de las tarjetas en móvil (`justify-center` en xs); ❓ qué ve un rol con solo `ajuste.empresa` al pulsar Ajustes (el código indica redirección).

---

## AJS-002 · Licencia (diálogo del panel)

- **Ruta UI / name:** tarjeta "Licencia" en `/ajustes`; abre un `q-dialog` (no es una ruta).
- **Archivos:** FE: `ajustes/IndexPage.vue:12-99, 504-674` · `stores/auth-user` (`licenciaInfo` persistido en localStorage). BE: `customers/customers.controller.ts:115-130` · `customers/customers.service.ts:117-152` · `companies/master-suscripcion.service.ts`.
- **Para qué sirve:** muestra el plan contratado de ISPMAX, el consumo del cupo de clientes y las facturas de la suscripción (solo lectura; vienen del sistema "master" de la gestión).
- **Acceso:** sin permiso; la tarjeta solo existe si `GET /customers/licencia-suscripcion` devuelve `vinculado: true` (la company tiene `suscription_id` y el master respondió). Si no hay valor, "no se muestra el círculo" (comentario l.12-14) ✅.
- **Secciones / pestañas:** (1) cabecera: nombre del plan en mayúsculas (`licenciaInfo?.plan ?? 'Plan contratado'`) + badge `Activa`/`Inactiva`; (2) "Clientes" con `usados / limite (xx%)` o `usados · Ilimitado` y barra de progreso; (3) cuadrícula de 4 tarjetas: "Día de pago", "Crear factura", "Día de corte", "Deuda actual"; (4) "Mis facturas".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Tarjeta "Licencia" | abre el diálogo y refresca licencia y facturas | — | `GET /customers/licencia-suscripcion`; `GET /customers/facturas-suscripcion?page=1&limit=12` | errores silenciosos (l.25-27, 49-51) |
| Botón PDF (tooltip "Descargar RIDE (PDF)") | descarga el RIDE | — | `POST {VITE_HOST_API_FACTURACION}/v1/factura/descarga/ride/{clave_acceso}` | solo si la factura trae `clave_acceso`; archivo `{estab}-{ptoEmi}-{secuencial}.pdf` sacado de la clave (l.58-86) |
| Botón código (tooltip "Descargar XML") | descarga el XML | — | idem con `/xml/` | error silencioso |
| "Cerrar" | cierra | — | — | — |

- **Datos mostrados:** barra de progreso `negative` si `usados/limite ≥ 1`, `orange` si `≥ 0.9`, `positive` si menos (l.560-562). "Deuda actual": `Sin deuda` o `$<totalConIva> de <cantidad> factura(s)` (l.598-600). Estado de factura: `PAGADO` verde, `ANULADO` gris, otro naranja (l.636). Si no hay `resumen`: "Sin información de facturación disponible."; sin facturas: "No hay facturas registradas.".
- **Reglas de negocio (backend):**
  - El cupo "usados" = servicios `deleted=false` cuyo cliente no está borrado (`customers.service.ts:122-127`); el límite sale del master (`max_clients_efectivo`, `null` = ilimitado) ✅.
  - El master se consulta con `HOST_API_MASTER` + `MASTER_SERVICE_TOKEN` (env); resultado cacheado 5 min en Redis (`CACHE_TTL_SEGUNDOS = 300`) con respaldo "último valor conocido" sin TTL si el master no responde (`master-suscripcion.service.ts:8, 190-236`) ✅.
  - `ES_INSTANCIA_GESTION=true` desactiva toda la integración (sin chip, sin licencia, sin control) (l.47-52) ✅.
  - **Token inactivo/expirado ⇒ se trata como "sin suscripción"**: `_soloSiActiva` devuelve `null` si `activo === false` (l.54-58) → no hay tarjeta Licencia ni se bloquea el alta de clientes (H-14).
  - El límite se aplica al crear clientes/servicios: mensaje `Tu suscripción permite un máximo de N clientes y actualmente tienes M. Contacta a ventas para ampliar tu plan.` (`customers.service.ts:158-176`; llamado en l.261, 548, 3019) ✅.
- **Efectos secundarios externos:** llamada HTTP al master (`/tokens/health`, `/tokens/licencia`, `/tokens/facturas`) y al microservicio de facturación para descargar RIDE/XML.
- **Preguntas probables de usuarios:**
  1. "¿Qué plan tengo y cuántos clientes me quedan?" → diálogo Licencia.
  2. "¿Por qué no puedo crear más clientes?" → límite del plan; mensaje de arriba.
  3. "¿Cómo descargo la factura de ISPMAX?" → Mis facturas → PDF/XML.
  4. "No veo la tarjeta Licencia" → la instalación no está vinculada a una suscripción o el master no responde.
  5. "¿Los clientes retirados cuentan en el cupo?" → no (`deleted=false`).
- **Pendiente de validar en UI:** ❓ el badge "Inactiva" solo puede aparecer si el master no envía `activo` (null) porque `activo=false` oculta la tarjeta; ❓ valor real de `resumen.fechaPago/fechaCorte` (formato lo decide el master).

## AJS-003 · Configuración de Cortes · Días habilitados para cortes (global)

- **Ruta UI / name:** `/ajustes/servicio` · `ajuste.servicio` · Ajustes → tarjeta "Configuración de Cortes". Breadcrumb "Servicios" (`<q-breadcrumbs-ajustes name="Servicios" icon="settings">`).
- **Archivos:** FE: `ajustes/servicios/IndexPage.vue` · `servicios/components/DiasAplicarCortes.vue` · `empresas/composables/useSetting.js` · `router/auth-guard.ts:37-46, 100-104`. BE: `settings/settings.controller.ts` (`GET /settings`, `PATCH /settings/:id`) · `app.controller.ts:33-50` (`PUT /programar-queue/:queue`) · `app.service.ts:294-338`.
- **Para qué sirve:** marca en qué días de la semana el sistema puede **suspender** servicios morosos. Un día apagado no genera ningún trabajo de corte ese día.
- **Acceso:** la tarjeta "Días habilitados" se muestra en modo Global solo con `variables.dias-habilitados` (`IndexPage.vue:77-80`). El guard de la ruta acepta cualquiera de `variables.dias-habilitados`, `variables.facturacion`, `variables.horario.cortes`, `variables.reintentos.mikrotik`, `variables.reintentos.smartOLT`, `variables.aplicar-cortes`, `variables.opciones-cortes` ✅.
- **Pantalla (modo Global):** en este orden: 📅 Días habilitados para cortes · tarjeta "Configurar cortes de" (selector + **Guardar Cambios**) · 🕓 Horarios de cortes · 🔧 Configuración de reintentos automáticas. Al entrar siempre arranca en "Global" (`onMounted → routerSel='global'`, l.42) y llama `getSetting()` (`GET /settings`, l.18).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| 7 interruptores "Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado" (sin tildes en miércoles/sábado) | marcan/desmarcan el día (`val` = "0".."6") | `variables.dias-habilitados` (solo visibilidad) | — (se guarda con el botón global) | `v-model="formSettings.diasCortes"` (array de strings) |
| **Guardar Cambios** (tarjeta "Configurar cortes de", `icon-right=save`) | guarda días + horarios + reintentos + canales de una vez | **ninguno** | `PATCH /settings/{id}` con todo `formSettings` (sin `id`) y luego `PUT /programar-queue/cortesServicios` | notifica `Actualización exitosa` (positive, top); error `No se pudo guardar la configuración.` (`IndexPage.vue:22-39`, `useSetting.js:208-213`) |

- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Días (7 toggles) | array `diasCortes` | no | BE: `@IsArray @IsInt each @Min(0) @Max(6)` con `@Type(Number)` (`create-setting.dto.ts:11-16`); 0 = Domingo … 6 = Sábado (compara con `moment().day()`) | se guarda como `text[]` (`setting.entity.ts:103-104`) |

- **Valores por defecto:** BD `diasCortes = []` → **ningún día habilitado ⇒ no se programa ningún corte** (`setting.entity.ts:103`). Defaults del front antes de cargar: `[]` (`useSetting.js:20`). Para un router personalizado el formulario de respaldo trae `['1','2','3','4','5']` (`useCorteRouter.js:13`) — es solo el relleno visual si no hay global.
- **Quién lo lee:** `AppService.programarCortes` (crea/omite el repetible, l.311-319), `recuperarCortesPerdidos` (l.358), `AppQueueProcessor.repararYSetearEstadosServicios` (l.182-191, 267, 388), recordatorios de pago (`pagos/notificar-recortatorio-pago-queue.processor.ts:159-169` y `pagos.service.ts:119-150`: `diasDeCorte` y `fechaCorteEfectiva` desplazan la "fecha de corte" mostrada en el recordatorio al próximo día habilitado) ✅.
- **Reglas de negocio:** ver AJS-008. Un router con config personalizada **reemplaza** estos días por los suyos (`cfg.diasCorte ?? global`).
- **Efectos secundarios externos:** el guardado re-planifica en Redis/Bull todos los trabajos de corte (`programarCortes` borra los repetibles `cortesServicios` y los recrea).
- **Mensajes (texto exacto):** `Actualización exitosa` (positive, top) · `No se pudo guardar la configuración.` (negative).
- **Casos límite y advertencias:** dejar los 7 días apagados es válido (ningún corte automático, pero los clientes que ya pagaron sí pueden **reactivarse** en cualquier momento); la creación de facturas anticipadas **también deja de ejecutarse automáticamente** porque corre dentro del trabajo de cortes (AJS-008, H-07).
- **Preguntas probables de usuarios:**
  1. "¿Por qué no se cortó a un cliente moroso el sábado?" → el sábado no estaba habilitado (o ese router tiene su propia config).
  2. "¿Puedo cortar solo de lunes a viernes?" → sí, marcando esos días.
  3. "Marqué el día pero no pasó nada" → falta hora en Horarios de cortes o no se guardó.
  4. "¿Aplica a todos los routers?" → sí, salvo los que tengan configuración personalizada.
  5. "¿Un día apagado impide reactivar a quien paga?" → no; la reactivación no depende del día (AJS-008).
- **Pendiente de validar en UI:** ❓ cómo se ve la tarjeta con textos "Miercoles"/"Sabado"; ❓ si el cambio de día entra en vigor al instante (el código re-planifica al guardar).

---

## AJS-004 · Configuración de Cortes · Horarios de cortes (global)

- **Ruta UI / name:** `/ajustes/servicio` · `ajuste.servicio` (misma pantalla que AJS-003).
- **Archivos:** FE: `servicios/components/HoraCorte.vue` · `IndexPage.vue:155-158`. BE: `settings.entity.ts:135-148` · `app.service.ts:294-338` · `app.controller.ts:33-50`.
- **Para qué sirve:** hora (HH:mm, 24 h) a la que se ejecuta el corte cada día de la semana.
- **Acceso:** tarjeta visible en modo Global con `variables.horario.cortes` (`IndexPage.vue:156`).
- **Campos de formulario:** 7 botones circulares (ícono `access_time`) → `q-time format24h`; encima se muestra la hora en formato `hh:mm AM/PM` o `--:--` si está vacía; debajo, "DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO". El popup trae "Cancelar" y "OK" (ambos solo cierran; el valor ya cambió al elegirlo).

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Hora por día (`horasPorDia[0..6]`) | texto "HH:mm" | no (vacío = ese día no se programa) | BE: `@IsOptional()` sin estructura (`create-setting.dto.ts:35-36`) | JSON `{"0":"HH:mm",…}`; DB default `"00:01"` para los 7 días (`setting.entity.ts:135-148`); front antes de cargar: `null` por día (`useSetting.js:54-62`) |

- **Quién lo lee:** `programarCortes` (cron `${minuto} ${hora} * * ${día}`, l.313-332), `recuperarCortesPerdidos` (l.360-369), recordatorios (`diasDeCorte` filtra días sin hora, `notificar-recortatorio…:159-169`).
- **Reglas de negocio:** la expresión cron no lleva zona horaria → se interpreta en la **zona del servidor** (sin `tz` en `repeat`, `app.service.ts:322-332`) ✅. Día con hora vacía/NaN se salta (l.314-316). No hay un horario "por rango": es un único disparo por día y router.
- **Efectos secundarios externos:** igual que AJS-003 (re-programación Bull).
- **Casos límite y advertencias:** el botón "Guardar Cambios" propio de la tarjeta (`actualizarHorariocortes`) existe pero está oculto con `:mostrar-guardar="false"` (l.157, `HoraCorte.vue:94`); solo vale el botón global. Cambiar la hora de **hoy** después de que pasó la hora no dispara un corte inmediato: lo recoge solo `recuperarCortesPerdidos` en el siguiente reinicio, y solo si no existe ya un log de corte del router hoy.
- **Preguntas probables de usuarios:** 1. "¿A qué hora corta el sistema?" → la que se indique aquí por día. 2. "¿Puedo poner horas distintas por día?" → sí. 3. "Cambié la hora y no cortó" → el cambio rige desde el próximo disparo. 4. "¿En qué zona horaria?" → la del servidor ❓.
- **Pendiente de validar en UI:** ❓ zona horaria real del servidor de cada instalación (`TZ`); ❓ qué muestra la tarjeta con el default `00:01`.

---

## AJS-005 · Configuración de Cortes · Reintentos automáticos y "Aplicar Cortes/Activación" (global)

- **Ruta UI / name:** `/ajustes/servicio` · `ajuste.servicio`.
- **Archivos:** FE: `servicios/components/ConfigurarReintentosCortes.vue` · `IndexPage.vue:160-167`. BE: `app-queue.processor.ts:81-112, 213-219, 603-691, 770-862` · `common/utils/onu-corte.utils.ts` · `customers/customers.service.ts:2714-2735`.
- **Para qué sirve:** (a) cuántas veces y cada cuántos minutos se reintenta un router que falló al aplicar cortes; (b) en qué plataformas se ejecuta el corte/activación de las ONUs.
- **Acceso:** la tarjeta aparece en modo Global si el rol tiene alguno de `variables.reintentos.mikrotik`, `variables.aplicar-cortes`, `variables.opciones-cortes` (`IndexPage.vue:161-165`). Dentro, los checkboxes "Aplicar Cortes/Activación" solo con `variables.opciones-cortes` (`ConfigurarReintentosCortes.vue:161`); los campos numéricos no tienen permiso propio.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Número de intentos al aplicar cortes: (placeholder `4`, sufijo "Veces") | texto numérico | no | el front deja solo dígitos y limita a **1–20** (`onlyPositiveAndInt(..., 20)`, l.15-27, 110); vacío al guardar → 4 | se guarda como string (`String(num)`); BE sin validación |
| Tiempo entre cada reintento: (placeholder `60`, sufijo "Minutos") | texto numérico | no | **1–1440** minutos (l.144); vacío al guardar → 60 | idem |
| Checkbox "Mikrotik" | boolean `aplicarCortes.mikrotik` | no | — | **el backend no lo lee** (H-04) |
| Checkbox "SmartOLT" | boolean `aplicarCortes.smartOLT` | no | — | habilita deshabilitar/habilitar ONU SmartOLT al cortar/reactivar |
| Checkbox "AdminOLT" | boolean `aplicarCortes.adminOLT` | no | — | idem AdminOLT |

- **Valores por defecto:** BD `configReintentos = {"nReintento":4,"intervalo":60}` (`setting.entity.ts:150-158`); `aplicarCortes = {"mikrotik":true,"smartOLT":false}` (adminOLT ausente = apagado) (l.128-133). Front previo a cargar: 1 y 10, `{mikrotik:true, smartOLT:false}` (`useSetting.js:63-76`).
- **Quién lo lee:** `configReintentos` viaja dentro del trabajo (`programarCortes` l.322-324 / `aplicarCortes` l.266-272) y lo usa `reintentarRoutersFallidos` (`+configReintentos.nReintento`, `+configReintentos.intervalo`, l.773, 684, 855). `aplicarCortes.smartOLT/adminOLT`: `repararYSetearEstadosServicios` (l.213-219) y `activeOrSuspendService` al suspender/activar desde el perfil del cliente (`customers.service.ts:2714-2735`) y al retirar (l.2946-2954). `resolverAplicarCortes` mezcla router sobre global **clave por clave** (`onu-corte.utils.ts:36-42`).
- **Reglas de negocio:** ver AJS-008 (reintentos, fallos).
- **Casos límite y advertencias:** el botón propio de la tarjeta (requiere `variables.reintentos.mikrotik`) está oculto en esta vista (`mostrar-guardar=false`); con esa prop en `true` los checkboxes autoguardan con notificación `Cambios guardado`. El tope 20/1440 es solo del front.
- **Preguntas probables de usuarios:**
  1. "¿Cuántas veces reintenta si el router no responde?" → el número indicado (más el intento inicial).
  2. "¿Cada cuánto reintenta?" → los minutos indicados (por defecto 60).
  3. "Desmarqué Mikrotik y el cliente sigue sin internet" → la casilla no tiene efecto (H-04).
  4. "Quiero que también corte la ONU" → marcar SmartOLT o AdminOLT y que el servicio tenga SN vinculado.
  5. "No veo las casillas de SmartOLT/AdminOLT" → falta `variables.opciones-cortes`.
- **Pendiente de validar en UI:** ❓ comportamiento visual de los checkboxes sin permiso; ❓ si "Aplicar Cortes/Activación" realmente aparece en el Global para quien tiene solo `variables.aplicar-cortes`.

---

## AJS-006 · Configuración de Cortes · Aplicar cortes manualmente

- **Ruta UI / name:** `/ajustes/servicio` (debajo de la tarjeta de reintentos, modo Global).
- **Archivos:** FE: `ConfigurarReintentosCortes.vue:51-71, 198-212`. BE: `app.controller.ts:33-60` · `app.service.ts:256-285`.
- **Para qué sirve:** lanzar el proceso de cortes ya, sin esperar el día/hora programados.
- **Acceso:** `variables.aplicar-cortes` (l.200) y que la tarjeta de reintentos esté visible (está dentro de su `<div>`).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| "Aplicar cortes manualmente" + botón "Activar" (ícono `check_circle`) | abre diálogo `¿Deseas aplicar los cortes manual?` con "Aceptar"/"Cancelar" | `variables.aplicar-cortes` | al aceptar: `PUT /programar-queue/cortesServicios` y `POST /aplicar-cortes` | notifica `Aplicando cortes.` (positive, top); si falla solo `console.log` (sin aviso) |

- **Reglas de negocio (backend):** `AppService.aplicarCortes` encola, para **cada router** (no solo el seleccionado en pantalla), un trabajo `cortesServicios` con `{dia, routerId, configReintentos (del router o global), sincronizarOnus:true}`, `jobId = aplicarCorteManual-${router.id}-${día}`, `removeOnComplete:true`, `attempts:1` (`app.service.ts:256-285`). Responde `{success:true,status:201,message:'apply successfully'}` sin esperar al resultado. Un segundo clic mientras el trabajo del mismo router/día sigue pendiente se ignora (mismo `jobId`).
- **Efectos secundarios externos:** MikroTik (repararRouter), SmartOLT/AdminOLT (habilitar/deshabilitar con `sincronizarOnus`), Slack, logs `corte_servicio`.
- **Casos límite y advertencias:** **respeta los días habilitados**: si hoy no es día de corte, el trabajo no suspende a nadie y deja el log `🟠 Corte inactivo para el dia <día>`; sí **reactiva** a los que estén al día (AJS-008). `sincronizarOnus:true` fuerza llamar a la OLT aun sin cambio de estado (excepto ONU `onu_invalida`).
- **Preguntas probables de usuarios:** 1. "Pulsé Activar y no se cortó nadie" → hoy no es día habilitado o nadie cumple la condición. 2. "¿Corta solo el router que elegí?" → no, procesa todos. 3. "¿Se puede deshacer?" → no hay botón de deshacer; habría que reactivar o registrar pagos. 4. "¿Tarda?" → corre en cola, el aviso sale al instante.
- **Pendiente de validar en UI:** ❓ si el diálogo se muestra tal cual (`Dialog.create` de Quasar); ❓ tiempo real de ejecución con muchos clientes.

---

## AJS-007 · Configuración de Cortes · Configuración personalizada por router

- **Ruta UI / name:** `/ajustes/servicio` · tarjeta "Configurar cortes de" (encabezado con ícono `router`).
- **Archivos:** FE: `IndexPage.vue:44-56, 86-152` · `servicios/composables/useCorteRouter.js` · `servicios/components/CorteConfigCards.vue`. BE: `app.controller.ts:82-101` · `app.service.ts:419-444` · `router/entities/router.entity.ts:9-14, 119`.
- **Para qué sirve:** dar a un router sus propios días, horarios, reintentos y canales de corte (p. ej. escalonar zonas). Sin personalizar usa la global.
- **Acceso:** sin permisos propios: el selector y las tarjetas por router **no** llaman a `validarPermisos` (`IndexPage.vue:81-84, 170-173`). Entra quien pase el guard de `ajuste.servicio`.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| (select sin etiqueta) | opciones: "🌐 Global (por defecto)" + routers activos de `estadosStore.routers` | sí | `emit-value map-options` | al cambiar carga la config (`cargar()`) |
| Toggle "Personalizado para este router" / "Usar configuración global" | boolean `personalizar` | — | `personalizar = !!routerCfg` | apagado + Guardar ⇒ `corteConfig = null` |
| 📅 Días habilitados para cortes | 7 toggles `diasCorte` | no | números 0–6 ordenados | 0 días = el router no corta |
| 🕓 Horarios de cortes | `horasPorDia` | no | HH:mm | base: la global; defecto de relleno `'09:00'` |
| 🔧 Configuración de reintentos automáticos | `configReintentos.nReintento` (1–20 vía `limitarEntero`) / `intervalo` (1–1440) | no | al guardar: `Number(...) \|\| 0` y `\|\| 60` | si se deja vacío `nReintento` queda **0** |
| Aplicar Cortes/Activación: Mikrotik · SmartOLT · AdminOLT | `aplicarCortes` | no | — | default de relleno `{true,false,false}` |

- **Botones y acciones:** **Guardar Cambios** (visible si no está `cargando`) → `PATCH /corte-config/router/{routerId}` `{ corteConfig }`; BE `guardarCorteConfigRouter` actualiza `routers.corteConfig` (jsonb) y llama `programarCortes()` (idempotente) (`app.service.ts:438-444`).
- **Reglas de negocio:** el router **reemplaza bloque completo** (días, horas, reintentos) — `cfg.diasCorte ?? global`, `cfg.horasPorDia ?? global`, `cfg.configReintentos ?? global` (l.309-311) — pero `aplicarCortes` se **fusiona** clave a clave con la global (`resolverAplicarCortes`). `GET /corte-config/global` devuelve `{horasPorDia, diasCorte: diasCortes, configReintentos, aplicarCortes}` (l.419-423); `GET /corte-config/router/:id` devuelve `corteConfig` o `null`.
- **Mensajes (texto exacto):** `Configuración de cortes del router guardada.` · `El router volverá a usar la configuración global.` · `Guardado. Sin días marcados, este router no aplicará cortes automáticos.` · error: mensaje del backend o `No se pudo guardar.` · carga: `No se pudo cargar la configuración de cortes.` Ayuda en modo global: `"Global" aplica a todos los routers que no tengan su propia configuración. Elige un router para personalizar sus cortes.` / `Usa Guardar Cambios de abajo para guardar todo (horarios, días y reintentos).`
- **Casos límite y advertencias:** (a) el botón de aplicar cortes manualmente no existe en la vista por router; (b) los cortes de un router sin personalizar cambian si se edita la global; (c) en el selector solo salen routers con `value` (activos) (`routersDisponibles`, l.44-46); (d) en el front no existe "Aplicar a otro router / Copiar" (H-05).
- **Preguntas probables de usuarios:** 1. "¿Cómo pongo otro horario solo a un router?" → elegirlo, activar "Personalizado para este router", editar y Guardar. 2. "¿Cómo vuelvo a la global?" → apagar el toggle y Guardar. 3. "Dejé todos los días apagados" → ese router no corta. 4. "¿Puedo copiar la configuración a otro router?" → no hay esa opción.
- **Pendiente de validar en UI:** ❓ comportamiento del select cuando no hay routers; ❓ si el toggle se refleja al instante tras guardar.

---

## AJS-008 · Motor de cortes y reintentos (backend)

- **Ruta UI / name:** — (proceso automático; configurado desde AJS-003…007).
- **Archivos:** BE: `app.controller.ts` · `app.service.ts` · `app-queue.processor.ts` · `common/utils/onu-corte.utils.ts` · `mikrotik/mikrotik.service.ts:2406-2467` (`repararRouter`) · `customers/customers.service.ts:2762-2815` (`suspenderServicio`) · `smart-olt/smart-olt.service.ts:1043-1190` · `smart-olt/habilitacion-onu-queue.processor.ts` · `admin-olt/admin-olt.service.ts:352-397` · `config/queue.config.ts`.
- **Para qué sirve:** programa y ejecuta, por router, la suspensión/reactivación automática de servicios según facturas vencidas.
- **Reglas de negocio (backend):**
  1. **Arranque** (`AppController.onModuleInit → AppService.init`, solo instancia `NODE_APP_INSTANCE`/`PM2_INSTANCE_ID` = '0', `app.service.ts:31-50`): espera 2 s, `limpiarColasAntiguas` (borra todos los repetibles de la cola `app`, limpia jobs completos >1 h, fallidos >24 h, en espera/retrasados y activos >10 min, y hace `cacheManager.reset()`), espera 3 s, `handleCron` (factura mensual), `programarCortes`, `recuperarCortesPerdidos`, `actualizarEstadoPromesasPago` e ingresos/egresos recurrentes ✅.
  2. **Programación** (`programarCortes`, l.294-338): por router crea un repetible `cortesServicios` por cada día habilitado con hora: cron `${min} ${hora} * * ${día}`, `jobId=corte-${router.id}-${día}`, datos `{dia, routerId, configReintentos}`, `attempts:1`. Se re-ejecuta al guardar ajustes (`PUT /programar-queue/cortesServicios`), al guardar un router (`PATCH /corte-config/router/:id`) y al arrancar.
  3. **Recuperación** (`recuperarCortesPerdidos`, l.340-418): al arrancar, si hoy es día habilitado, ya pasó la hora y no hay log `corte_servicio` con `entityId=router.id` creado hoy → encola `corte-recuperado-${router.id}-${YYYYMMDD}` y escribe log `♻️ Corte recuperado (<día>): la ejecución de las <hora> no se realizó por un reinicio del servicio; se encoló al arrancar.` (con `entityId` null a propósito).
  4. **Ejecución** (`@Process('cortesServicios') → repararYSetearEstadosServicios`, `app-queue.processor.ts:63-66, 114-707`) sobre los servicios no borrados del router:
     - Si el servicio tiene "Creación Anticipada" y el trabajo no es puntual ni de consulta, **crea la factura anticipada** (`crearFacturaPorFechaPago` si `baseCreacionFactura='fecha_pago'`, si no `crearFacturaAntes`) (l.195-205).
     - Decide suspender/reactivar según `aplicar_corte` del cliente (`"N Mes(es) Vencido(s)"` → compara facturas pendientes + `dia_gracia` + promesa activa; `"N Mes(es) Desde Último Pago"`; `Desactivado` no corta), l.207-430.
     - **Suspender** (`suspenderServicio(id,'inactivar')`: solo `isActive=false` en BD + log `SUSPENDER_SERVICIO`) **únicamente si hoy es día habilitado** del router (o el trabajo es por un servicio puntual); **reactivar** (`'activar'`) ocurre cuando el servicio ya está al día **sin depender de que hoy sea día de corte** (en las ramas con facturas pendientes se exige que exista al menos un día habilitado, `diasPermitidos.length > 0`, l.272, 393) (l.282-299, 396-414, 416-430).
     - ONU: `aplicarEstadoOnu` deshabilita/habilita en SmartOLT/AdminOLT si el canal está marcado en `aplicarCortes`, el servicio tiene `sn` y `onu_source` coincide (sin `onu_source` y con `sn` ⇒ SmartOLT, `onu-corte.utils.ts:21-25`); solo si hubo transición, o `sincronizarOnus` (corte manual); omite ONU `onu_invalida` sin transición (l.81-112).
     - **MikroTik**: si algún servicio del router corta hoy (o job puntual / reparación manual) llama `mikrotikService.repararRouter(routerId, false, servicio_id)` por router **activo** (`routers.isActive`): re-empuja PPPoE/IP/colas/listas de corte ("Impagos" o la `lista_corte` de la red) (`mikrotik.service.ts:2406-2467`).
     - Si hoy no es día de corte: log `🟠 Corte inactivo para el dia <dddd>` (l.693-701).
  5. **Fallo de MikroTik**: el router fallido entra en `routersFallidos` → log `⏳ Reintento de cortes fallidos en N minutos: <routers>` + Slack `⏳ Reintentando router fallidos en N minutos…` y se encola `reintentarRoutersFallidos` con `delay = intervalo×60 000 ms` (1 min si es puntual por servicio) (l.653-691). Cada reintento (l.770-862): log/Slack `⚠️ Reintento de cortes fallidos en … intento k/N`; `repararRouter` completo; éxito ⇒ log `✅ Router reparado correctamente: X`; fallo con `retryCount < MAX` ⇒ reencola con +1; si no, log + Slack `🚫 Se alcanzó el máximo de N reintentos para el router X.` **MAX = `nReintento`** (fijo **6** en trabajos por servicio). Total de intentos = 1 inicial + `nReintento`. Los servicios ya quedaron suspendidos en BD aunque el router no responda.
  6. **Fallo de SmartOLT/AdminOLT**: `aplicarEstadoOnu` captura el error (`console.error`; Slack `⚠️ Error al *deshabilitar|habilitar ONU* \`sn\` — <CLIENTE>` solo si hubo transición) y **no reintenta ni lo anota en Logs**; el servicio queda cambiado en BD. Si la llamada sí salió, `SmartOltService.desabilitarOnu/habilitarOnu` programa `verificarEstadoOnu` (+35 s, 2 intentos, espera 60 s) que reenvía enable/disable si el estado no coincide y, al agotar, escribe log `VERIFICACION_FALLIDA` (`No se verificó estado después de N intentos`); AdminOLT usa 4 intentos (`admin-olt.service.ts:374-397`). Si SmartOLT no responde la señal y falla el comando ⇒ `marcarOnuInvalida` (`onu_invalida=true` + notificación a usuarios con rol `admin`).
  7. `desabilitarOnu` no hace nada si la ONU ya está `offline`; `habilitarOnu` no hace nada si ya está `online` (`smart-olt.service.ts:1058, 1133`).
- **Efectos secundarios externos:** MikroTik (RouterOS API), SmartOLT/AdminOLT (REST), Slack (`URL_SLACK`, `CLIENTE` por variable de entorno), Redis/Bull (cola `app`, `reiniciar-onus`, `habilitacion-onus`), cron.
- **Estados posibles de log (entityType `corte_servicio`):** `RUN` con metadata `{tipo:'automático', resultado:'éxito'}` (todos los mensajes anteriores se guardan con `resultado:'éxito'`, incluso los de fallo) ✅.
- **Mensajes visibles (texto exacto en Logs):** `🔧 Aplicando cortes en los routers:` · `✅  Corte aplicado correctamente al router: <nombre>` · `🟠 Corte inactivo para el dia <día>` · `⏳ Reintento de cortes fallidos en N minutos: …` · `⚠️ Reintento de cortes fallidos en …` · `✅ Router reparado correctamente: …` · `🚫 Se alcanzó el máximo de N reintentos para el router …` · `♻️ Corte recuperado (…)`.
- **Relaciones con otros módulos:** facturación anticipada (AJS-009/010), promesas de pago (`actualizarEstadoPromesasPago` diario a las `${INTERVALO_MINUTOS} 0 * * *`), recordatorios de pago (usan días/horas de corte), clientes (perfil → activar/suspender), routers, OLTs.
- **Casos límite y advertencias:** (a) `URL_SLACK` sin configurar o caído hace fallar el trabajo antes de empujar el router (H-09); (b) si el servicio reinicia varias veces el mismo día, `jobId` con fecha evita duplicar la recuperación; (c) si un router está inactivo (`isActive=false`) el estado cambia en BD pero no se empuja; (d) creación anticipada solo corre dentro de estos trabajos (H-07).
- **Preguntas probables de usuarios:** 1. "¿Por qué un cliente que pagó sigue cortado?" → ver AJS-008: la reactivación ocurre en el siguiente trabajo del router/ pago registrado. 2. "¿Qué pasa si el MikroTik está apagado a la hora del corte?" → reintenta N veces cada X min y avisa por Slack/Logs. 3. "¿Y si SmartOLT falla?" → el cliente queda suspendido en ISPMAX pero la ONU puede seguir activa; no hay reintento, solo una verificación. 4. "¿Dónde veo qué se cortó?" → Logs → módulo "Cortes y red".
- **Pendiente de validar en UI:** ❓ comportamiento del push MikroTik con `pppoe_modo`/PCQ (solo resumido); ❓ zona horaria real de ejecución; ❓ cuántos servicios por router tardan en procesarse.

## AJS-009 · Facturación (reglas generales, anulación y registro de pagos)

- **Ruta UI / name:** `/ajustes/facturacion` · `ajuste.facturacion` · Ajustes → tarjeta "Facturación". Breadcrumb "Facturación".
- **Archivos:** FE: `ajustes/facturacion/IndexPage.vue` · `facturacion/components/FacturacionPage.vue` · `empresas/composables/useSetting.js` · `router/auth-guard.ts:87`. BE: `settings/*` · `crear-facturas/crear-facturas.service.ts` · `pagos/pagos.service.ts` · `registro-pagos/registrar-abono.service.ts` · `app-queue.processor.ts`.
- **Para qué sirve:** reglas globales de emisión de facturas, de anulación y de registro de pagos. Es la **misma tabla `settings`** que usa Cortes, y también se guarda completa.
- **Acceso:** tarjeta y ruta con `variables.facturacion` (el guard lo mapea explícitamente en `permisoPorRuta`, `auth-guard.ts:87`). Sin más permisos internos.
- **Secciones / pestañas:** en instancias no-Colombia, una sola tarjeta "🧾 Facturación" (+ "💱 Tasa BCV (Venezuela)" si `VITE_PAIS=VE`); en Colombia, pestañas **"General"** y **"Factus"** (`IndexPage.vue:34-67`). Grupos dentro de la tarjeta: "Generación de facturas", "Anulación de facturas y pagos", "Generar facturas ahora", "Registro de pagos".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| **Guardar Cambios** (`icon-right=save`) | guarda toda la config y re-planifica cortes | `variables.facturacion` (ruta) | `PATCH /settings/{id}` + `PUT /programar-queue/cortesServicios` | notifica `Actualización exitosa`; actualiza `baseGuardada` (`FacturacionPage.vue:43-46`) |

- **Campos de formulario** (etiqueta · ayuda exacta · clave · defecto BD · quién lo lee):

| Etiqueta | Clave `settings` | Defecto (BD / front previo) | Rango | Consumidores ✅ |
|---|---|---|---|---|
| Crear facturas a suspendidos — "Genera facturas también para clientes suspendidos por falta de pago." | `facturar_suspendidos` | `true` / `false` | boolean (`@IsBoolean`, obligatorio en alta) | `crear-facturas.service.ts:51-68, 249, 544, 595, 682` (mensual, anticipada, por fecha de pago; ver `puedeFacturarSuspendido`, que añade el límite de la fila siguiente). El modo "Desde Último Pago" se procesa aunque esté suspendido (`esDesdeUltimoPago`, l.241-249) |
| Facturas sin pagar para dejar de crear (icono info con tooltip; **solo se dibuja con "Crear facturas a suspendidos" apagado**; selector con opciones "1 factura", "2 facturas" … "12 facturas") | `limiteFacturasImpagasSuspendidos` | `1` / `1` (`useSetting.js:11`; `?? 1` al cargar, l.188; BD `int default 1`, `BE:settings/entities/setting.entity.ts:16-17`) | entero **1–12**: `@IsOptional @Type(Number) @IsInt @Min(1) @Max(12)` con mensajes `El límite de facturas sin pagar debe ser un número entero.` / `El límite de facturas sin pagar debe ser al menos 1.` / `El límite de facturas sin pagar no puede superar 12.` (`BE:settings/dto/create-setting.dto.ts:11-16`) | BE: `crear-facturas.service.ts:51-68` (`puedeFacturarSuspendido`; usos 249 mensual, 544 anticipada, 595 y 682 por fecha de pago). Límite ≤ 1 ⇒ no se factura a suspendidos; ≥ 2 ⇒ se factura mientras el servicio tenga al menos 1 y menos de N facturas `NO PAGADO`/`PENDIENTE` (sin `FACT. LIBRE`). Pantalla: `FE:pages/dashboard/ajustes/facturacion/components/FacturacionPage.vue:98-102, 150-190`. **Regla, tooltip completo y preguntas: COB-027 (`cob.md`)**; migración `1789200000000-LimiteFacturasImpagasSuspendidos.ts` |
| Crear factura por cada abono — "Emite una factura individual por cada abono/pago recibido." | `facturarAbonos` | `false` / `false` | boolean | `registro-pagos/registrar-abono.service.ts:561-563, 611-613` (con saldo y sin el ajuste ⇒ recibo; con el ajuste ⇒ factura solo del abono); FE `ModalPago.vue:531`, `PayComponent.vue:562` |
| Gestionar facturas de clientes retirados — "Habilita ver y gestionar facturas de clientes dados de baja." | `gestionarFacturasRetirados` | `false` / `false` | boolean | solo FE: `clientes/components/editar/IndexFacturas.vue:206` |
| Restringir tipo de pago según la fecha — "Al crear un servicio, si el día de pago ya pasó en el mes, solo se ofrece Postpago (Vencido). Desactívalo para ofrecer siempre Prepago y Postpago." | `restringirTipoPagoPorFecha` | `true` / (no está en el default del composable) | boolean | solo FE: `clientes/components/FactAndNot.vue:174-179, 195` (`!== false`) |
| Base de creación de facturas (select con ícono info/tooltip) | `baseCreacionFactura` | `'mes'` | `'mes'` ("Por mes (1ro de cada mes)") \| `'fecha_pago'` ("Por fecha de pago del cliente") — `@IsIn` en DTO | `crear-facturas.service.ts:180, 226, 627-645`; `app-queue.processor.ts:199, 527` (y fecha mostrada en el resumen del cliente) |
| Pedir motivo al anular factura/pago — "Al anular una factura o pago, se solicita indicar un motivo." | `anulacionPedirMotivo` | `true` | boolean | BE `pagos.service.ts:898, 973, 1085, 1298` (`?? true`); FE `composables/useAnularMotivo.js:17` |
| Motivo de anulación obligatorio — "El motivo no puede quedar vacío. Requiere activar la opción anterior." (deshabilitado si la anterior está apagada) | `anulacionMotivoObligatorio` | `true` | boolean | mismos consumidores; BE lanza `El motivo de anulación es obligatorio` (`pagos.service.ts:897-900`) |
| Pasar saldo/excedente a la siguiente factura — "Si el pago supera el total, el excedente queda como saldo a favor aplicado a la próxima factura, por defecto." | `pasarSaldoSiguienteAuto` | `false` | boolean | **solo marca por defecto la casilla** en `ModalPago.vue:535` y `PayComponent.vue:566`; el backend **no** lo hereda a propósito (`registrar-abono.service.ts:192-200`) |
| Actualizar día de pago al registrar el pago (icono ⚠ con tooltip "Cuidado: la deriva se acumula. Cada mes que el cliente se atrase le corre el día otra vez, y esos días de servicio no se recuperan. El día queda tal cual pagó, sin tope.") — "Al saldar una factura, el día de pago del cliente pasa al día en que pagó (vence el 10, paga el 15 → queda cobrando los 15). No aplica a abonos parciales ni a pagos de meses adelantados." | `moverDiaPagoAlCobrar` | `false` | boolean | `pagos.service.ts:610, 719-841` |
| (checkbox, aparece si el anterior está activo) Elegir a qué clientes se les aplica — "Sin marcar, se le mueve el día a todos. Marcado, al registrar el pago aparece un check para decidir, cobro por cobro, si el día de pago del cliente pasa al día en que pagó." | `moverDiaPagoPorCliente` | `false` | boolean | BE `pagos.service.ts:761-767` (solo mueve el día si el PATCH trae `mover_dia_pago: true`); FE `PayComponent.vue:563`, `ModalPago.vue:532` (muestran el interruptor "Día de pago al cobrar"; ver COB-028). El campo por cliente en `FactAndNot.vue` se eliminó |
| Nota por defecto al registrar un pago (textarea, placeholder `Ej: {mes_anio}  ó  Pago mes de {mes}`; hint "Se precarga en el campo Notas al registrar un pago. El operador puede editarla. Si el pago adelanta meses, {mes} lista todos: «Julio, Agosto y Septiembre».") + chips | `plantillaNotaPago` | `null` | texto libre; variables `{mes}` `{mes_mayus}` `{anio}` `{mes_anio}` `{cliente}` `{plan}` `{n_factura}` | solo FE: `composables/useFormPago.js:100-107`, `ModalPago.vue:543-545`, `PayComponent.vue:574-576` (la nota propia de la red del servicio, `red_id.nota_pago`, tiene prioridad sobre esta global); DTO `@IsString` opcional |

- **Reglas de negocio (backend):**
  - Mover día de pago: solo si la factura pasa a `PAGADO/AUTORIZADO` en ese pago (no estaba saldada antes), hay un abono **nuevo**, no es factura libre, no hay `meses_adelantados` y el día cambia; actualiza `factura-clientes.dia_pago` y las facturas pendientes del servicio (`actualizarFechaPago`) y escribe log `UPDATE_DIA_PAGO_AL_COBRAR` (`Día de pago actualizado de X a Y al saldar la factura #N`). Si falla, el pago queda registrado y el día **no** se mueve (solo `logger.error`). Con `moverDiaPagoPorCliente`, exige `factura_id.moverDiaPagoAlCobrar === true` del cliente (l.763).
  - Base `fecha_pago`: la factura del período se crea N días antes del día de pago (sin contar días de gracia); si el primer recordatorio cae antes, se adelanta la emisión a ese día (`crear-facturas.service.ts:556-568, 627-648`).
- **Efectos secundarios externos:** ninguno directo; el guardado también reprograma los cortes (misma llamada que Cortes).
- **Mensajes (texto exacto):** `Actualización exitosa` · tooltip de Base: `Por fecha de pago: para clientes con Creación Anticipada, la factura del período se genera N días antes de su día de pago. Los días de gracia no cuentan aquí (ej: día de pago 4 con «2 días antes» se crea el 2). Los clientes «Sin anticipar» se siguen creando el 1° de mes.` / `Por mes: todas las facturas del período se generan el 1° de cada mes.`
- **Relaciones con otros módulos:** Facturas, Registrar pago, Perfil del cliente (pestaña Facturación), Recordatorios de pago, Cortes.
- **Casos límite y advertencias:** (a) `options` (lista "N Meses suspendido") está definida en `FacturacionPage.vue:104-116` pero **no se usa**; (b) cualquier guardado envía **todo** `formSettings`: si otro administrador cambió otra opción desde otra pantalla, ésta la pisa con el valor viejo cargado (H-08); (c) el DTO deja `facturar_suspendidos`, `enviarAvisoPago`, `sumarDiaGracias`, `notificarSuspendidos`, `facturarAbonos`, `diasCortes`, `cronNotificacion`, `tipoDireccion` como obligatorios solo en `POST` (alta); en `PATCH` son parciales.
- **Preguntas probables de usuarios:**
  1. "¿Se factura a los clientes suspendidos?" → depende de "Crear facturas a suspendidos".
  2. "¿Cuándo se genera la factura del mes?" → "Base de creación de facturas".
  3. "Anulé una factura y me pide motivo / no me pide" → opciones de Anulación.
  4. "Un cliente cambió solo de día de pago" → "Actualizar día de pago al registrar el pago" (¡cuidado!).
  5. "¿Qué es la 'Nota por defecto'?" → texto precargado en Notas al registrar un pago.
  6. "No me deja marcar 'Motivo obligatorio'" → falta activar "Pedir motivo".
  7. "Pagué de más; ¿a dónde va el excedente?" → casilla "Pasar saldo/excedente a la siguiente factura".
- **Pendiente de validar en UI:** ❓ aspecto del tooltip ⚠; ❓ cómo se ve el interruptor "Día de pago al cobrar" en el modal de pago con `moverDiaPagoPorCliente` activo (COB-028); ❓ el selector "Facturas sin pagar para dejar de crear" con datos reales (COB-027).

---

## AJS-010 · Facturación · "Generar facturas pendientes"

- **Ruta UI / name:** `/ajustes/facturacion` · grupo "Generar facturas ahora".
- **Archivos:** FE: `FacturacionPage.vue:31-96, 291-328, 448-468`. BE: `app.controller.ts:62-70` · `app.service.ts:216-236` · `app-queue.processor.ts:58-61` · `crear-facturas/crear-facturas.service.ts:166-200` (`generarPendientes`).
- **Para qué sirve:** ejecuta ahora la creación de facturas (la del mes y la anticipada) con la base **guardada**, sin esperar al proceso automático.
- **Acceso:** `variables.facturacion` (pantalla); el endpoint solo exige JWT.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| **Generar facturas pendientes** (`receipt_long`, loading "Generando…") | confirma y lanza la creación | `variables.facturacion` | `POST /generar-facturas` | deshabilitado si la "Base de creación" cambió y no se guardó; texto `Cambiaste la base de creación: guarda los cambios antes de generar.` |
| Diálogo `¿Generar las facturas pendientes ahora?` — mensaje `Se evalúa a todos los clientes con la configuración guardada. Al que ya tiene la factura de su período no se le crea otra.` | "Generar" / "Cancelar" | | | |

- **Reglas de negocio (backend):** job `generarFacturasPendientes` con `jobId` fijo (doble clic/dos usuarios comparten el trabajo), `attempts:1`; `generarPendientes`: guarda `MAX(no_factura)`, corre `ejecutar({esperar:false})` (mensual) y luego, por servicio con "Creación Anticipada", `crearFacturaPorFechaPago` (si base `fecha_pago`) o `crearFacturaAntes`; devuelve `{creadas, facturas[]}` con las de `no_factura` mayor. Deduplica por período.
- **Mensajes (texto exacto):** `No había facturas pendientes por generar` (info) · resultado: diálogo "N factura generada / facturas generadas" con columnas "N° Fact.", "Cliente", "Tipo", "Día de pago", "Total" · timeout/502/504: `La generación sigue en proceso. Revisa las facturas en unos minutos.` (warning) · otro error: `No se pudieron generar las facturas`; BE lanza `No se pudieron generar las facturas` (BadRequest).
- **Casos límite y advertencias:** el proceso mensual normal es `crearFacturas` (cron el día 1 a las `00:${INTERVALO_MINUTOS}`, `config/queue.config.ts:7-13`, `app.service.ts:197-214`); la creación **anticipada automática** solo ocurre dentro del trabajo de cortes (AJS-008), por eso este botón es el único modo manual.
- **Preguntas probables de usuarios:** 1. "Se me olvidó generar las facturas del mes" → este botón. 2. "¿Duplica facturas?" → no, deduplica por período. 3. "El botón está gris" → guardar primero la base de creación. 4. "Dice que sigue en proceso" → esperar y revisar facturas.
- **Pendiente de validar en UI:** ❓ tiempo real con cartera grande; ❓ cómo se ve el diálogo de resultados.

---

## AJS-011 · Facturación · Factus (Colombia / DIAN)

- **Ruta UI / name:** `/ajustes/facturacion` · pestaña "Factus" (icono `cloud`), junto a la pestaña "General". Solo se dibuja si `PAIS_INSTANCIA === 'CO'` (`VITE_PAIS`); en cualquier otro país la pantalla no tiene pestañas y no existe forma de abrir esta tarjeta ✅ FE:pages/dashboard/ajustes/facturacion/IndexPage.vue:10-12,40-66; FE:composables/usePais.js:6-8. La pantalla se abre con `variables.facturacion` (VEN-015).
- **Archivos:** FE: `ajustes/facturacion/components/FactusConfig.vue` · BE: `facturacion/factus/factus.controller.ts` · `factus-config.service.ts` · `factus.service.ts` · `factus-pago.service.ts` · `factus-invoice.service.ts` · `mappers/factus-customer.mapper.ts` · `entities/factus-config.entity.ts` · `dto/create-factus-config.dto.ts` · `dto/update-factus-config.dto.ts` · `dto/emitir-factura.dto.ts` · `factus.types.ts` · `factus.module.ts` · `config/facturacion-provider.config.ts`. Los consumidores (cola de emisión, anulación y reenvío) están en VEN-016.
- **Para qué sirve:** credenciales de la cuenta Factus (OAuth2) y datos fiscales del emisor para facturar ante la DIAN; es el equivalente colombiano del flujo del SRI.
- **Acceso:** `variables.facturacion` abre la pantalla. En el backend todos los endpoints llevan `@Auth()` por método (solo JWT, sin permiso): `GET/PATCH config` **no** comprueban el país y responden en cualquier instancia; los demás (`probar-conexion`, `numbering-ranges`, `sincronizar-empresa`, `preview-customer/:id`, `emitir`, `emitir-pago/:pagoId`, `bills/*`, `credit-notes/*`) llaman antes a `assertHabilitado()` ⇒ 400 `Factus no está habilitado en esta instancia (revisa PAIS / FACTURACION_PROVIDER)` si `usaFactus()` es falso ✅ BE:factus.controller.ts:30-178. El proveedor se decide por entorno: `FACTURACION_PROVIDER` (`sri`/`factus`/`ninguno`), o `PAIS` (`CO` ⇒ factus, `EC` ⇒ sri), o `FACTURACION_ELECTRONICA` (true ⇒ sri, false ⇒ ninguno) ✅ BE:config/facturacion-provider.config.ts:20-38.
- **Campos de formulario (etiquetas exactas):** "Ambiente" (`Pruebas (sandbox)` = `https://api-sandbox.factus.com.co`, valor inicial · `Producción` = `https://api.factus.com.co`) · toggle `Activo`/`Inactivo` (inicial `Inactivo`) · "Client ID" · "Client Secret" (oculto, ojo `visibility`) · "Email (usuario Factus)" · "Contraseña" (oculta, ojo) · "Tipo de organización" (`1 — Persona Jurídica` inicial, `2 — Persona Natural`) · "Código DANE del municipio" (hint `Ej. 68679 (San Gil)`) · "Actividad económica (CIIU)" (hint `Ej. 6311`) · "Código de tributo" (`01 — IVA` inicial, `ZZ — No aplica`) · "Responsabilidades fiscales" (multi, chips: `O-13 — Gran contribuyente`, `O-15 — Autorretenedor`, `O-23 — Agente de retención de IVA`, `O-47 — Régimen simple de tributación`, `R-99-PN — No responsable`; se guarda como CSV, p. ej. `R-99-PN,O-15`) ✅ FE:FactusConfig.vue:10-61,134-273. Banners: azul "Ingresa las credenciales de tu cuenta Factus. Empieza en Pruebas (sandbox) y cambia a Producción cuando esté todo validado." con enlaces "Contrata el servicio en factus.com.co" y "Documentación para desarrolladores"; naranja "Identifican a tu empresa ante la DIAN en las facturas. Complétalos y pulsa Sincronizar empresa para enviarlos a Factus. El resto de datos (razón social, NIT, dirección, email, teléfono) salen del módulo Ajustes › Empresa." (`:144-161,232-238`).
- **Validación de campos ✅:** ninguna obligatoria. El DTO declara todos los campos opcionales (`@IsOptional`), cadenas salvo `is_active` (`@IsBoolean`); el `ValidationPipe` global usa `whitelist` y `transform` con conversión implícita ✅ BE:dto/create-factus-config.dto.ts:13-55; BE:main.ts:41-49. Los límites son los de las columnas (`url_api` 150, `client_id` 200, `client_secret` 200, `email` 150, `password` 200, `municipality_code` 10, `economic_activity` 10, `tribute_code` 5, `responsibilities` 120, `legal_organization_code` 2, BE:entities/factus-config.entity.ts:22-67); el formulario no recorta espacios ni valida formato. Lo exigido llega después, al usar: credenciales (`Credenciales de Factus no configuradas`), NIT y DANE al sincronizar.
- **Botones y acciones ✅ (FactusConfig.vue:91-129):**

  | Etiqueta | Qué hace | Endpoint | Mensajes |
  |---|---|---|---|
  | (al abrir) | Carga la fila única; error: `No se pudo cargar la configuración de Factus` | `GET /facturacion/factus/config` | devuelve todo salvo los tres campos de token, incluidos `client_secret` y `password` |
  | "Probar conexión" | Prueba las credenciales **guardadas** (no lo escrito en pantalla): fuerza un token nuevo | `POST /facturacion/factus/probar-conexion` | `Conexión con Factus exitosa` o el mensaje de Factus; fallback `No se pudo conectar con Factus` |
  | "Guardar cambios" | Guarda los campos y borra el token en caché | `PATCH /facturacion/factus/config` | `Configuración de Factus guardada`; error `err.response.data.message` o `Error al guardar` |
  | "Sincronizar empresa" (tooltip `Envía los datos del emisor a Factus (PUT /v2/companies)`) | Guarda (PATCH) y luego sincroniza | `PATCH …/config` + `POST /facturacion/factus/sincronizar-empresa` | `Empresa sincronizada con Factus`; fallback `No se pudo sincronizar la empresa con Factus` |

- **Reglas de negocio (backend) ✅:**
  1. Fila única `factus_config`: `obtener()` toma la primera fila y, si no hay, crea una vacía; `obtenerPublico()` quita `access_token`, `refresh_token` y `token_expira_en`; `actualizar()` hace `UPDATE` con el DTO y **siempre** pone los tres campos de token en `null`, aunque el cambio no toque credenciales (BE:factus-config.service.ts:21-52).
  2. Antes de cada llamada se exige `client_id`, `client_secret`, `email` y `password` no vacíos; si no, 400 `Credenciales de Factus no configuradas` (BE:factus.service.ts:37-43). La URL base es `url_api` sin barra final, o el sandbox si está vacía (`:45-47`).
  3. OAuth2: reutiliza el `access_token` si le faltan más de 60 s para vencer; si no, intenta `refresh_token` y, si falla, `password` (`POST {base}/oauth/token`, form-urlencoded, 15 s). Guarda el token con vencimiento `expires_in` (3600 s por defecto) (`:56-109`). Las demás llamadas llevan `Authorization: Bearer`, 20 s de tiempo máximo y, ante un 401, renuevan el token una vez y reintentan (`:113-145`).
  4. Los errores de Factus llegan al usuario como 400 con `message`/`error` de la respuesta; en 422 se añade ` → campo: texto | campo: texto` con los errores por campo (`:508-528`).
  5. `probarConexion` solo obtiene un token; no consulta la cuenta (`:158-161`). El interruptor `is_active` **no lo lee ningún código del backend** (búsqueda en `facturacion/` y `config/`): no activa ni desactiva la facturación; la emisión depende solo de `usaFactus()` y de que haya credenciales.
  6. `sincronizar-empresa` (`PUT /v2/companies`): toma la **primera** fila de `companies`; exige NIT (`empresa.ruc` con solo dígitos, si no `La empresa no tiene NIT (campo RUC) configurado`), código DANE (`Falta el código DANE del municipio del emisor (config de Factus)`) y empresa existente (`No hay una empresa configurada en el sistema`). Envía `legal_organization_code` (def. `1`), `company` (razón social o nombre comercial), `trade_name`, `email`, `address` (`direccion_matriz`), `registration_code`, `economic_activity`, `phone` (solo dígitos), `municipality_code`, `tribute_code` (def. `01`) y `responsibilities` (BE:factus.service.ts:174-212).
  7. `GET numbering-ranges` devuelve la lista de `GET /v2/numbering-ranges`; la sucursal guarda un rango de factura y otro de nota crédito. Si la sucursal no tiene rango, se toma el primero de Factura de Venta (`document` contiene "factura de venta" o es `21`, activo y no vencido) o de Nota Crédito (`22`, activo) (`:164-166,280-302`; AJS-030/VEN-015).
  8. Uso posterior (VEN-016): `emitirFactura` → `POST /v2/bills/validate`; `anularFactura` → `POST /v2/credit-notes/validate`; descargas `GET /v2/bills/{n}/download-pdf|xml` y `/v2/credit-notes/{n}/download-pdf|xml` (Factus entrega base64 en JSON y el backend responde binario); ante el 409 "pendiente por enviar a la DIAN" borra en Factus hasta 50 facturas o notas crédito no validadas (`status=0`) y reintenta una vez (BE:factus.service.ts:217-265,316-456). Desde un cobro de servicio (`FactusPagoService`): `reference_code = FAC-{no_factura}`, ítems de `detalleFacturaLibre.items` (IVA extraído si el ítem es "Impuestos incluido"; los de saldo o precio negativo se omiten), forma de pago: contado (`payment_form 1`) con el `codigo_forma_pago` de la forma del abono; si no se resuelve, ISPMAX envía el método `10` (efectivo) y el monto es el total de los ítems (BE:factus.service.ts:476-484), la "Nota" del abono como observación, idempotente (si ya hay `clave_acceso` no reemite) y guarda CUFE en `clave_acceso`, número en `num_comprobante`, estado en `estadoSRI`, URL y respuesta cruda (BE:factus-pago.service.ts:41-92,100-123,220-296). Desde una factura libre: `reference_code = INV-{id}`, estado `AUTORIZADO` (BE:factus-invoice.service.ts:35-83). Anular: `NC-{no_factura}` / `NC-INV-{id}`, `correction_concept_code '2'`, estado `ANULADO`.
  9. Endpoints que la interfaz **no** usa: `GET preview-customer/:id`, `POST emitir` (prueba, `reference_code` `TEST-…`, no persiste) y `POST emitir-pago/:pagoId` (la misma emisión que hace la cola, pero sin `abonoUuid` ni `customerId`: toma el primer abono no eliminado y resuelve el cliente por el servicio del pago) (BE:factus.controller.ts:74-116).
- **Efectos secundarios externos:** API de Factus (`/oauth/token`, `PUT /v2/companies`, `/v2/numbering-ranges`, `/v2/bills/*`, `/v2/credit-notes/*`). Los textos que devuelve Factus (rechazos de la DIAN, errores por campo) no están en el ZIP.
- **Límite de lectura:** el servicio Factus (`api.factus.com.co`) es un tercero; solo se lee el lado de ISPMAX. Todo el código de `facturacion/factus/` del ZIP está leído.
- **Casos límite y advertencias:** (1) los datos fiscales de razón social/NIT/dirección salen de Ajustes › Empresa. (2) Rangos de numeración por sucursal (AJS-030). (3) Cambiar `url_api` entre sandbox y producción no cambia las credenciales: hay un solo juego. (4) Guardar cualquier campo borra el token; la siguiente operación pide uno nuevo. (5) La pestaña depende de `VITE_PAIS=CO` y el formulario de sucursal de `USA_FACTUS` (`VITE_FACTURACION_PROVIDER`/país): con `FACTURACION_PROVIDER=factus` en otro país la sucursal pide rangos y no hay dónde cargar credenciales (FE:IndexPage.vue:10-12; FE:usePais.js:19-27). (6) `GET config` entrega `client_secret` y `password` en claro (H-12).
- **Preguntas probables de usuarios:** 1. "¿Dónde pongo las credenciales de Factus?" → esta pestaña. 2. "Probé la conexión y falla" → guardar primero; revisar ambiente/credenciales. 3. "¿Para qué sirve Sincronizar empresa?" → envía el emisor a Factus. 4. "¿Qué hace el interruptor Activo?" → nada, no lo consulta ningún proceso. 5. "Sale: Falta el código DANE…" → completar el campo. 6. "No me aparece la pestaña Factus" → la instalación no es de Colombia.
- **Pendiente de validar en UI:** ❓ aspecto de los banners y chips de "Responsabilidades fiscales".

---

## AJS-012 · Facturación · Tasa BCV (Venezuela)

- **Ruta UI / name:** `/ajustes/facturacion` (solo `VITE_PAIS=VE`, `IndexPage.vue:36`).
- **Archivos:** FE: `facturacion/components/TasaBcvConfig.vue`. BE: `tasa-bcv/tasa-bcv.controller.ts` · `tasa-bcv.service.ts` · `dto/tasa-bcv.dto.ts` · `setting.entity.ts:347-351` (`tasaBcv` jsonb).
- **Para qué sirve:** actualizar cada día el precio en bolívares de los servicios y facturas pendientes a partir del precio del plan en USD × tasa oficial BCV.
- **Acceso:** `variables.facturacion` (ruta); BE `@Auth()`; operaciones exigen `process.env.PAIS = 'VE'` (`esVenezuela()`), si no responde `Disponible solo en instancias de Venezuela (PAIS=VE)`.
- **Campos de formulario:** "Actualizar precios todos los días" (toggle `activo`; "Al activarlo se ejecuta una vez de inmediato.") · "Hora de ejecución diaria" (HH:mm, defecto `00:05`; "Hora local de la instancia (TZ del servidor).") · "Recalcular facturas con abonos parciales" ("Sin marcar, solo se recalculan facturas sin ningún abono.") · "Tasa manual (Bs por USD)" (hint `Corrige la tasa si el valor de la API está mal y aplícala.`) · bloque "Tasa vigente" (`<tasa> Bs/USD · origen manual|API BCV · <fecha>`; `Última ejecución: … — N servicio(s), M factura(s). Detalle en Logs Generales.`).
- **Botones y acciones:** "Aplicar tasa manual" (`POST /tasa-bcv/ejecutar {tasa}`), "Consultar BCV y aplicar ahora" (`POST /tasa-bcv/ejecutar {}`), **Guardar Cambios** (`PUT /tasa-bcv`; si se acaba de activar corre `ejecutar` una vez).
- **Reglas de negocio (backend):** `PUT` valida `activo` boolean, `hora` `^\d{1,2}:\d{2}$`, `recalcularConAbonos` boolean y re-programa un repetible `actualizarTasaBcv` con cron `${min} ${hora} * * *` (`attempts:2`, `backoff:120000`) (`tasa-bcv.service.ts:71-108`). `ejecutar`: tasa de la API (`API_BCV`, campo `promedio`) o manual; para cada plan con `precio_plan > 0`: `nuevoBs = trunc(USD × tasa)`; actualiza `servicios-clientes.precio` solo si el precio actual es el "estándar" (igual al Bs anterior o al USD) y toca facturas `NO PAGADO` (y `PENDIENTE` si `recalcularConAbonos`) cuyo ítem `servicio` tenga precio estándar (l.140-186); guarda tasa y `ultimaEjecucion` y escribe log `tasa_bcv` `RUN` (`Tasa BCV <tasa> (<origen>): N servicio(s) y M factura(s) actualizadas.`) o `ERROR` (`No se pudo consultar la tasa BCV (…). Se mantienen los valores actuales.`).
- **Mensajes (texto exacto):** `Configuración guardada` · `Tasa {tasa}: {servicios} servicio(s) y {facturas} factura(s) actualizadas` · `Fallo al guardar` · `Fallo al ejecutar la actualización`.
- **Casos límite y advertencias:** los logs `tasa_bcv` **no** pertenecen a ningún "Módulo" del filtro de Logs (solo salen en "Todos los módulos"). Precios personalizados no se tocan.
- **Preguntas probables de usuarios:** 1. "El precio en Bs cambió solo" → esta función. 2. "La API del BCV dio un valor raro" → usar Tasa manual. 3. "¿A qué hora corre?" → la configurada (hora del servidor).
- **Pendiente de validar en UI:** ❓ valor real de `API_BCV`; ❓ ver el `Tasa vigente` con datos.

---

## AJS-013 · OLTs · Reinicio automático de ONUs (SmartOLT)

- **Ruta UI / name:** `/ajustes/smartolt` · `ajuste.smartolt` · Ajustes → tarjeta "OLTs"; pestaña "SmartOLT" (ícono `/icons/smartOLT.ico`); breadcrumb "OLTs". El guard admite `variables.reintentos.smartOLT` o `variables.opciones-cortes` (`auth-guard.ts:62-65, 105-108`).
- **Archivos:** FE: `ajustes/smartOLT/IndexPage.vue:291` · `servicios/components/CronSmartOLT.vue`. BE: `smart-olt/smart-olt.controller.ts:25-28` · `smart-olt/smart-olt.service.ts:173-263` · `smart-olt/reinicio-smartolt-queue.processor.ts`.
- **Para qué sirve:** reiniciar periódicamente las ONUs (cada N días a una hora) vía SmartOLT.
- **Acceso:** tarjeta visible con `variables.reintentos.smartOLT` (el nombre del permiso dice "reintentos" pero es el reinicio de ONUs).
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Aplicar reinicio automatico: | toggle `reiniciosSmartOLT.isActive` | no | — | apagado ⇒ no se crea el trabajo |
| Intervalo de reinicio: | select | sí | "1 Día", "2 Días" … "50 Días" | se guarda el texto (`"N Día(s)"`); BE lo parsea con `split(' ')[0]` |
| Hora de ejecución: | hora HH:mm (readonly + `q-time` 24 h) | sí | por defecto `00:00` | |
| Modo de reinicio: (si activo) | radio | sí | "Onus Vinculados" (`vinculados`) · "Onus vinculados y no vinculados" (`vinculados_y_no_vinculados`) | |
| Fecha de Base: (si activo) | fecha (botón tooltip "Editar fecha base", `q-date`, solo hoy-1 en adelante) | sí | `YYYY-MM-DD`; por defecto hoy | texto `DD/MM/YYYY + <dias> + <hora>` |
| La proxima fecha de reinicio será: | calculado `fechaActivacion` | — | `fecha base + N días` a la hora indicada, `DD/MM/YYYY HH:mma` | |

- **Botones y acciones:** **Guardar Cambios** → `PATCH /settings/{id} {reiniciosSmartOLT}` → `POST /smart-olt/programar-reinicio-onu` → `GET /settings`; notifica `Actualización exitosa`.
- **Valores por defecto (BD):** `{"isActive":false,"dias":0,"time":"00:00","date":null,"fechaActivacion":null}` (`setting.entity.ts:160-171`); el componente fuerza `dias='1 Día'`, `time='00:00'`, `date=hoy` si vienen vacíos (`CronSmartOLT.vue:88-97`).
- **Reglas de negocio (backend):** solo instancia 0. `programarReinicioOnu` calcula `fecha base + N días` a `time`, actualiza `fechaActivacion`, elimina trabajos `reiniciarOnus` pendientes y, si está activo y la fecha es futura, crea uno con `delay` (`jobId reboot-onus-<iso>`, `attempts:1`); si la fecha ya pasó **no crea nada** (`smart-olt.service.ts:188-257`). También se invoca al arrancar el módulo (l.173-175). Al ejecutarse: modo `vinculados` ⇒ reinicia `POST {dominio}/api/onu/reboot/{sn}` para **todos** los servicios con `sn` no vacío (sin filtrar `deleted` ni `onu_source`), con pausa de 100 ms; otro modo ⇒ todas las ONUs de todas las OLTs (`get_olts` → `get_onus_statuses`). Después guarda `date=hoy` y `lastResult` y reprograma (`+N días`). Si falla todo: log `❌ Fallo crítico al reiniciar ONUs: …` y **no reprograma** (ciclo se detiene) (`reinicio-smartolt-queue.processor.ts:217-292`).
- **Efectos secundarios externos:** SmartOLT REST (`X-Token`), Redis/Bull, logs `reinicio_onus_smartolt`.
- **Mensajes (texto exacto en Logs):** `🔧 Reinicio completado: N exitosos, M errores` · `Reinicio de vinculados parcial: N exitosos, M errores` · `Fallo en reinicio de ONUs vinculadas: …` · `No se encontraron ONUs vinculadas para reiniciar` · `No se encontraron OLTs en <dominio>`.
- **Casos límite y advertencias:** (a) la fecha base + N días significa que el **primer** reinicio ocurre dentro de N días, no hoy; (b) la acción reinicia el equipo del cliente (corte momentáneo de internet); (c) en modo "vinculados" también reinicia ONUs de AdminOLT/retirados si tienen `sn` (H-11).
- **Preguntas probables de usuarios:** 1. "¿Cada cuánto se reinician las ONUs?" → el intervalo. 2. "Activé y no reinició hoy" → primer disparo = base + intervalo. 3. "¿Afecta a los clientes?" → breve corte. 4. "Dejó de reiniciar" → revisar log de error; guardar de nuevo.
- **Pendiente de validar en UI:** ❓ aspecto de la tarjeta si `fechaActivacion` es null; ❓ tiempo de ejecución con miles de ONUs.

---

## AJS-014 · OLTs · Reinicio automático de ONUs (AdminOLT)

- **Ruta UI / name:** `/ajustes/smartolt` · pestaña "AdminOLT" (ícono `router`).
- **Archivos:** FE: `servicios/components/CronAdminOLT.vue` (llamado en `smartOLT/IndexPage.vue:562`). BE: `admin-olt/admin-olt.controller.ts:59-62` · `admin-olt/admin-olt.service.ts:581-638` · `admin-olt/reinicio-adminolt-queue.processor.ts`.
- **Para qué sirve:** igual que AJS-013 pero para ONUs gestionadas en AdminOLT.
- **Acceso:** `variables.reintentos.smartOLT`; la tarjeta solo se dibuja si existe `formSettings.reiniciosAdminOLT` (`CronAdminOLT.vue:116`).
- **Campos:** idénticos a AJS-013 (toggle, "Intervalo de reinicio:", "Hora de ejecución:", "Modo de reinicio:", "Fecha de Base:", "La proxima fecha de reinicio será:") sobre `reiniciosAdminOLT`; encabezado "🕓 Configuración de reinicio automático de ONUs" con fondo `teal-7`. Defecto BD `{"isActive":false,"dias":"1 Día","time":"00:00","date":null,"fechaActivacion":null,"modo":"vinculados"}` (`setting.entity.ts:173-185`).
- **Botones y acciones:** **Guardar Cambios** → `PATCH /settings/{id} {reiniciosAdminOLT}` → `POST /admin-olt/programar-reinicio-onu`.
- **Reglas de negocio (backend):** `programarReinicioAdminOlt` (solo instancia 0) → trabajo `reiniciarOnusAdminOLT` en cola `reiniciar-onus-adminolt`. Modo `vinculados`: servicios con `sn`, `deleted=false` y `onu_source='adminOLT'` → `obtenerOnuPorSn` + `reiniciarOnu(id)` (pausa 150 ms); otro modo: todas las ONUs autorizadas. Registra log `reinicio_onus_adminolt` `RUN` `🔧 AdminOLT reinicio completado: N exitosos, M errores` y reprograma. **No hay** `onModuleInit` que reprograme al arrancar el backend (a diferencia de SmartOLT) (H-10).
- **Preguntas probables / pendiente de validar:** igual que AJS-013. ❓ si tras un reinicio del backend el trabajo sigue en Redis (la cola no se limpia en `init`, pero no se verificó).

---

## AJS-015 · OLTs · Perfil TR-069, Tipo de ONU y Mgmt IP por defecto (SmartOLT)

- **Ruta UI / name:** `/ajustes/smartolt` · pestaña SmartOLT (columna derecha).
- **Archivos:** FE: `ajustes/smartOLT/IndexPage.vue:11-207, 293-508`. Consumidores FE: `Gestion-Red/smartOLT/components/Authorize/components/Tr069ConfigSection.vue:106, 125, 146, 177, 188` · `Authorize/IndexPage.vue:105` · `OnuView/IndexPage.vue:179`. BE: solo persistencia (`settings`), sin consumidores (grep en `src/`).
- **Para qué sirve:** valores que se **autocargan** al autorizar/configurar ONUs en SmartOLT para no teclearlos cada vez.
- **Acceso:** sin permiso propio (visibles para quien entra a la pantalla).
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| Nombre del perfil TR-069 (placeholder `ej. SmartOLT`, clearable) | texto → `tr069PerfilDefault` | no | `trim`; vacío ⇒ `null`; BE `@IsString` | "escribe el **nombre exacto** del perfil… SmartOLT no expone API para listarlos". Botón "Guardar" ⇒ `PATCH` mínimo `{tr069PerfilDefault}`, relee `GET /settings` y compara |
| Tipo de ONU (ej. EG8145V5) | select con búsqueda → `smartoltOnuTypeDefault` | no | opciones = nombres únicos de `GET /smart-olt/pon-tipos/gpon` + `/epon`; sin opciones: "Sin tipos de ONU disponibles" | Se preselecciona al **autorizar una ONU** |
| Modo por defecto | radio → `smartoltMgmtIpDefault.mode` | — | "Inactive" (`inactive`), "Static IP" (`static`), "DHCP" (`dhcp`) | solo se muestra la tarjeta si hay perfil TR-069 |
| OLT de referencia para listar VLANs | select | — | solo si hay >1 OLT; hint "La VLAN seleccionada debe existir también en las demás OLTs" | `GET /smart-olt/olt/listado`, `GET /smart-olt/vlans/{id}` |
| VLAN-ID (Mgmt) | select clearable | — | hint "VLAN dedicada a gestión TR-069 / Mgmt" | |
| Tag transform | select | — | `default`, `translate`, `translate-and-add` | |
| CVLAN-ID · SVLAN-ID · Subnet mask (ej. 255.255.248.0) · Gateway (ej. 10.10.16.1) · DNS 1 (ej. 8.8.8.8) · DNS 2 (ej. 8.8.4.4) | texto | no | sin validación (BE jsonb libre) | |

- **Mensajes (texto exacto):** `Perfil TR-069 por defecto guardado` · `Tipo de ONU por defecto guardado` · `Mgmt IP por defecto guardado` · `No se pudo cargar la configuración del sistema` (warning) · `Fallo al guardar` · advertencia técnica: `El PATCH respondió OK pero el valor no quedó persistido en BD. ¿Ya corriste la migración y reiniciaste el backend? Revisa la consola.` (visible al usuario, `IndexPage.vue:194-199`). Banner: `Configura primero el Perfil TR-069 arriba para habilitar la configuración de Mgmt IP por defecto. Si tu SmartOLT no usa TR-069, podés dejar ambos vacíos.`
- **Casos límite y advertencias:** el guardado del perfil hace `console.log` de la respuesta (ruido de depuración); el valor debe coincidir EXACTAMENTE con el de SmartOLT › Settings › TR069 Profiles (comentario del DTO).
- **Preguntas probables de usuarios:** 1. "¿Para qué sirve el perfil TR-069?" → se autocompleta al autorizar. 2. "No me aparece Mgmt IP" → falta el perfil TR-069. 3. "El tipo de ONU no aparece en la lista" → no está en el catálogo SmartOLT o no hay conexión. 4. "¿Dónde pongo el dominio y API Key de SmartOLT?" → **no en esta pantalla** (H-06).
- **Pendiente de validar en UI:** ❓ en qué pantalla se cargan las credenciales de SmartOLT/AdminOLT (no están en este módulo).

---

## AJS-016 · OLTs · Validación de ONUs (SmartOLT / AdminOLT)

- **Ruta UI / name:** `/ajustes/smartolt` · tarjeta "Validación de ONUs" en cada pestaña.
- **Archivos:** FE: `smartOLT/IndexPage.vue:209-255, 510-607`. BE: `smart-olt/smart-olt.controller.ts:323-328` · `smart-olt/smart-olt.service.ts:1822-1935` · `admin-olt/admin-olt.controller.ts:48-51` · `admin-olt/admin-olt.service.ts:671-760`.
- **Para qué sirve:** cruza los SN de los servicios con los que existen en la plataforma y marca como inválidos (`onu_invalida`) los que ya no existen.
- **Acceso:** sin permiso propio.
- **Botones y acciones:**

| Etiqueta | Qué hace | Endpoint | Efectos |
|---|---|---|---|
| **Validar ONUs vs SmartOLT** (`find_replace`, teal) | valida y muestra resultado | `POST /smart-olt/validar-onus-vs-smartolt` | marca/limpia `onu_invalida`; notificación a usuarios con rol `admin` |
| **Validar ONUs vs AdminOLT** (`find_replace`, teal-7) | idem | `POST /admin-olt/validar-onus-vs-adminolt` | idem |

- **Reglas de negocio (backend):** SmartOLT: lista OLTs y ONUs (`get_all_onus_details`) y arma el conjunto de `unique_external_id`; si está vacío responde `{success:false, message:'SmartOLT no devolvió ONUs (sin OLTs configurados o credenciales inválidas)'}`; servicios con `sn IS NOT NULL` y `deleted=false` (**sin filtrar por plataforma**); los que no están ⇒ `onu_invalida=true` (solo los nuevos generan notificación); los que ahora sí están ⇒ se limpia. AdminOLT: compara contra `obtenerOnusAutorizadas()` solo para servicios sin relación `smartOLT`.
- **Resultado en pantalla:** "Servicios con SN: x · No encontradas: y · Nuevas marcadas: z"; lista clicable hacia `cliente.edit` (cliente, `SN: … · IP: …`); banners `Todas las ONUs están correctamente vinculadas en SmartOLT.` / `Todas las ONUs AdminOLT están correctamente vinculadas.`; toasts `N ONU(s) no encontradas en SmartOLT` (warning), `Todas las ONUs están OK en SmartOLT` / `…en AdminOLT`, `Error al validar ONUs en SmartOLT|AdminOLT`.
- **Casos límite y advertencias:** (a) falsos positivos: la validación SmartOLT trata como inválidas las ONUs de servicios AdminOLT (H-11); (b) `onu_invalida` hace que el corte salte la ONU si no hay transición de estado (AJS-008); (c) ambos controladores llevan `@Auth()` a nivel de clase (solo JWT, sin permiso).
- **Preguntas probables de usuarios:** 1. "Me aparecen ONUs no encontradas, ¿qué hago?" → revisar cada cliente y re-vincular. 2. "¿Borra algo?" → no, solo marca. 3. "¿Cada cuánto se valida?" → manual (botón).
- **Pendiente de validar en UI:** ❓ tiempo con muchas OLTs; ❓ qué muestra el resultado si SmartOLT devuelve `success:false`.

## AJS-017 · Base de datos · Campos personalizados

- **Ruta UI / name:** `/ajustes/base-datos` · `ajuste.base-datos` · Ajustes → "Base de datos" → pestaña "Campos personalizados" (ícono `storage`). Breadcrumb "Base de datos". Pestaña inicial: "Campos personalizados" si tiene `base-datos.campos`; si no, "Cambios masivos" (`base-datos/IndexPage.vue:11-13`).
- **Archivos:** FE: `ajustes/base-datos/IndexPage.vue` · `base-datos/components/CamposPersonalizados.vue`. BE: `custom-fields/custom-fields.controller.ts` · `custom-fields.service.ts` · `entities/custom-field.entity.ts`. Consumidores: FE `clientes/components/DatosPersonales.vue:89-97, 416-470`, `clientes/components/editar/ResumenPage.vue:13-27, 517-552`, `clientes/IndexPage.vue:1040-1075`, `clientes/components/modals/ModalCargarExcel.vue:481-490`; BE `customers.service.ts:1262-1272`, `mikrotik/mikrotik.service.ts:2024-2042, 2365-2373`, `contratos/variables-contrato.ts:395-470`, `contratos/contratos.service.ts:980-989`.
- **Para qué sirve:** añadir campos propios a la ficha de **cliente** (se guardan en `customers.custom_data`, json).
- **Acceso:** pestaña y panel con `base-datos.campos`; el guard de la ruta acepta `base-datos.campos` o `base-datos.cambios-masivos` (`auth-guard.ts:71-74, 125-129`). El backend solo pide JWT.
- **Secciones:** columna izquierda: tarjeta "Crear campos personalizados" (en edición, título `Editar campo: <nombre>`) + tarjeta "Eliminar datos" (AJS-018); columna derecha: tarjeta "Campos existentes".
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| **Crear campo** / **Guardar cambios** (en edición) | crea o edita | `base-datos.campos` | `POST /custom-fields` · `PATCH /custom-fields/{nombreOriginal}` | notifica `Campo creado correctamente` / `Campo editado correctamente` |
| Cancelar (solo edición) | limpia el formulario | — | — | — |
| ícono lápiz (tooltip "Editar campo") | carga el campo en el formulario | — | — | hace scroll a la tarjeta |
| ícono papelera (tooltip "Eliminar campo") | confirma y elimina | — | `DELETE /custom-fields/{nombre}` | diálogo `Eliminar campo` / `¿Estás seguro de eliminar el campo "<strong>X</strong>"? Esta acción no se puede deshacer.`; "Cancelar" / "Eliminar" |
| botón `add_circle` / Enter | agrega una opción (selector) | — | — | duplicado ⇒ `Esa opción ya está en la lista` |

- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| nombre_campo (hint "Sin espacios ni caracteres especiales") | texto | sí | FE: sin espacios; BE: solo rechaza espacios (`/\s/`), único (`varchar unique`) | usar `_`; ej. `numero_contrato` |
| Tipo de campo | select | sí | **Texto** (`texto`) · **Numérico** (`numerico`) · **Selector (opciones)** (`selector`) · **Fecha** (`fecha`) | cambiar de tipo vacía las opciones del formulario |
| Nueva opción + chips | texto / chips | solo selector | mínimo **2** opciones; sin repetidas | texto de ayuda "Agrega al menos 2 opciones" |

- **Texto de ayuda (exacto):** `Desde aquí puedes extender la ficha de cada cliente agregando campos personalizados. Define el nombre del campo y su tipo de dato; una vez creado, aparecerá en el perfil de todos los clientes para que puedas registrar esa información individualmente.` · `Usa _ en lugar de espacios en el nombre — ejemplo: numero_contrato.` · en edición: `Si cambias el nombre, la información ya registrada en los clientes se traslada al nombre nuevo. Cambiar el tipo no convierte los valores ya guardados.` · aviso rojo: `¡Importante! Elimina únicamente los campos que tú mismo hayas creado. Borrar campos del sistema puede afectar el funcionamiento de la plataforma.` · vacío: `No hay campos personalizados creados aún.`
- **Reglas de negocio (backend):**
  - Validación (`custom-fields.service.ts:20-37`): `El nombre y tipo son obligatorios` · `El nombre no puede contener espacios, use "_" en su lugar` · `Tipo inválido. Use: texto, numerico, selector, fecha` · `Un campo tipo selector requiere al menos 2 opciones`; duplicado: `Ya existe un campo con el nombre "X"`; inexistente: `No se encontró el campo "X"` ✅.
  - Renombrar: en una transacción actualiza `customers.custom_data` moviendo la clave (SQL `jsonb - $1 || jsonb_build_object($2, …)`) (l.100-110). Cambiar tipo **no** convierte datos. Si el tipo ya no es selector, `opciones` se vacía.
  - Eliminar: borra solo la definición; los valores quedan en `custom_data` de cada cliente (sin limpieza) (l.113-125). Respuesta `Campo "X" eliminado correctamente`.
  - Sin límite de cantidad de campos ni longitud del nombre.
- **Dónde aparece un campo creado:** (1) formulario de cliente (alta y edición) → sección "Información adicional" con etiqueta `Nombre campo` (guion bajo → espacio, capitalizado); selector con opciones capitalizadas; numérico `type=number`; fecha con máscara y calendario; texto libre multilínea. (2) Resumen del cliente → ">> Información adicional:" (desplegable si hay más de 3). (3) Listado de clientes → columna `NOMBRE EN MAYÚSCULAS` (guion bajo → espacio) con filtro de texto (oculta por defecto salvo que esté en columnas visibles). (4) Exportación/plantilla Excel de clientes (columnas extra) y carga masiva Excel (se leen como texto). (5) Contratos: variable `{nombre_campo}`; en selector además `{nombre_campo_<opcion>}` = `X` si coincide (sin tildes/mayúsculas) ✅.
- **Estados posibles:** tipo ∈ {texto, numerico, selector, fecha}.
- **Efectos secundarios externos:** ninguno.
- **Casos límite y advertencias:** (a) el nombre viaja en la URL (`/custom-fields/:nombre`): caracteres como `/` o `?` romperían la ruta ❓; (b) el nombre se interpola en SQL en el filtro del listado de clientes (`customers.service.ts:1270`) y el backend no restringe comillas (H-15); (c) el valor del selector se guarda **capitalizado** (`capitalize(o)`), por lo que puede no coincidir exactamente con la opción original (en contratos se normaliza al comparar); (d) la advertencia roja habla de "campos del sistema", pero esta tabla solo contiene campos creados por el usuario.
- **Preguntas probables de usuarios:** 1. "¿Cómo agrego 'Número de contrato' a la ficha del cliente?" → crear campo `numero_contrato` tipo Texto. 2. "No me deja poner espacios" → usar `_`. 3. "Cambié el nombre y se perdieron datos" → no se pierden, se trasladan. 4. "Borré un campo y ya no lo veo, ¿se borraron los datos?" → los valores siguen guardados pero ocultos. 5. "¿Puedo usar el campo en el contrato?" → sí, con `{nombre_campo}`. 6. "¿Cómo filtro por mi campo?" → columna en el listado de clientes.
- **Pendiente de validar en UI:** ❓ cómo se ven los campos con nombres largos; ❓ si la columna del listado aparece oculta por defecto.

---

## AJS-018 · Base de datos · Eliminar datos (borrado lógico masivo de clientes)

- **Ruta UI / name:** `/ajustes/base-datos` → pestaña "Campos personalizados" → tarjeta "Eliminar datos".
- **Archivos:** FE: `CamposPersonalizados.vue:135-222, 343-436`. BE: `database/database.controller.ts:11-18` · `database/database.service.ts:51-64, 236-366`.
- **Para qué sirve:** marcar como borrados (borrado lógico) clientes y sus datos, todos o por router/red/plan/caja NAP.
- **Acceso:** `base-datos.campos` (UI). El endpoint solo pide JWT.
- **Campos de formulario:** "Seleccionar tabla" (única opción: "Clientes" = `customers`) · "Router (Todos)" · "Red IPv4 (Todas)" y "Plan (Todos)" (solo con router elegido) · "Caja NAP (Todas)" (solo si el router tiene cajas).
- **Botones y acciones:** **Eliminar Datos** (rojo; deshabilitado sin tabla) → diálogo persistente: título `Eliminar datos`; texto `¿Estás seguro de aplicar borrado en "Clientes"?` + `Se aplicarán los filtros seleccionados (router, red, plan o caja).` **o** `Se eliminarán todos los registros de la tabla.` + `Esta acción es irreversible.`; botones "Cancelar" / "Eliminar datos". Endpoint `DELETE /database/truncate/customers` con cuerpo `{router_id, red_ipv4_id, plan_id, caja_id}` (solo los elegidos).
- **Reglas de negocio (backend):** tablas permitidas: solo `customers` (`Tabla "X" no permitida`). En **una transacción** pone `deleted_at=now` en: contratos (de los servicios afectados), tickets (por cliente), invoices (por cliente), pagos (de los servicios afectados), servicios (`deleted_at`, `deleted=true`, `isActive=false`) y clientes (`database.service.ts:268-330`). Escribe log `Database` / `BULK_SOFT_DELETE_CUSTOMERS`: `Borrado lógico masivo de clientes (N clientes, M servicios, K pagos)` con `metadata {filtros, hayFiltros, afectados}`. Respuesta `{msg:'Borrado lógico aplicado correctamente', afectados:{customers, servicios, pagos, tickets, invoices, contratos}}`.
- **Efectos secundarios externos:** **ninguno**: no llama a MikroTik, SmartOLT ni AdminOLT; el borrado individual (`customers.service.ts:2817-2837`) sí retira cada servicio del router primero y aborta si falla. Tras este borrado masivo es de esperar que las colas/PPPoE/ONUs de esos clientes sigan existiendo en los equipos ❓ (inferido: no hay llamadas externas en `database.service.ts`).
- **Reversibilidad:** es borrado lógico (`deleted_at`), pero no hay pantalla ni endpoint de restauración en el código leído; el log guarda **cuántos**, no **cuáles**.
- **Mensajes:** éxito: `data.msg` o `Borrado aplicado`; error: mensaje del backend o `Error al eliminar datos`; `Selecciona una tabla`; `Error cargando filtros del router`.
- **Casos límite y advertencias:** (a) con filtros, se borra el **cliente completo** (y sus tickets/facturas) aunque tenga otros servicios fuera del filtro (`customerSubquery`, l.244-330) → clientes huérfanos de servicios; (b) sin filtros borra a **todos** los clientes no borrados; (c) libera cupo de licencia; (d) la UI dice "irreversible" aunque sea lógico.
- **Preguntas probables de usuarios:** 1. "¿Cómo borro todos los clientes de un router?" → filtrar por router y Eliminar Datos. 2. "¿Se pueden recuperar?" → no desde la interfaz. 3. "Los borré y siguen navegando" → este borrado no los retira de MikroTik ❓. 4. "¿Por qué no me deja elegir otra tabla?" → solo Clientes.
- **Pendiente de validar en UI:** ❓ comportamiento visual del listado de clientes tras el borrado; ❓ si existe algún proceso de restauración manual por soporte.

---

## AJS-019 · Base de datos · Cambios masivos (facturación y recordatorios)

- **Ruta UI / name:** `/ajustes/base-datos` → pestaña "Cambios masivos" (ícono `manage_accounts`).
- **Archivos:** FE: `base-datos/components/CambiosMasivos.vue`. BE: `database/database.controller.ts:20-27` · `database/database.service.ts:92-234` · `customers/entities/Facturacion.entity.ts`.
- **Para qué sirve:** aplicar el mismo valor de configuración de facturación (y de recordatorios) a todos los clientes que coincidan con los filtros.
- **Acceso:** pestaña con `base-datos.cambios-masivos`; backend solo JWT.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Valores | Notas |
|---|---|---|---|---|
| Filtrar por Router | select | no | routers (`routerSinTodos`) | habilita los dos siguientes |
| Filtrar por Red IPv4 / Filtrar por Plan | select | no | de `GET /red-ipv4`, `GET /internet/planes-disponibles/{router}` | deshabilitados sin router |
| Filtrar por Caja NAP | select | no | de `GET /caja-nap` (header `router-id`) | solo si hay cajas |
| Día de pago | select | no | 1 – 31 | → `factura-clientes.dia_pago` |
| Tipo | select | no | "Prepago (Adelantado)" `prepago` · "Postpago (Vencido)" `postpago` | |
| Tipo Impuesto | select | no | "Impuestos incluido" · "Mas impuestos" · "Ninguno" | |
| Días de gracia (hint "*días tolerancia para aplicar corte") | select | no | "0 Día", "1 Día", "2 Días" … "25 Días" | |
| Aplicar Corte | select | no | "Desactivado", "1 Mes Vencido", "2 Meses Vencidos" … "12 Meses Vencidos" | **no** ofrece "N Meses Desde Último Pago" (H-16) |
| Tipo Comprobante | select | no | "Factura" · "Recibo" | |
| Creación Anticipada | select | no | "Desactivado" (se muestra "Sin anticipar (día 1)"), "1 Día antes" … "25 Días antes" | |
| Dirección en factura (hint "Si 'Facturar a tercero' está activo, se usa la del tercero") | select | no | "Dirección principal" `principal` · "Dirección del servicio" `servicio` | |
| Recordatorios de pago: | multiselect | no | "Ninguno" (exclusivo) · "Correo" · "WhatsApp" | → `recordatorio_pago` |
| Recordatorio #1 / #2 / #3 | select + modo | no | día: "Desactivado", "Notificar suspensión", "1 Día" … "25 Días"; modo: "Antes del vencimiento" · "Después del vencimiento" | → `recordatorio_dias`; solo si el canal ≠ Ninguno |

- **Botones y acciones:** **Aplicar cambios** (`manage_accounts`) → diálogo persistente `Cambios masivos` / `Se actualizarán N campo(s) en las facturas de los clientes que coincidan con los filtros. Esta acción no se puede deshacer.` ("Aplicar cambios" / "Cancelar") → `PATCH /database/cambios-masivos/facturacion` `{cambios, filtros}`. Sin ningún campo: `Debes modificar al menos un campo`. Éxito: `<msg> — <afectados> registro(s) afectado(s)` y limpia el formulario.
- **Reglas de negocio (backend):** (1) `UPDATE factura-clientes SET <campos> WHERE customer_id IN (…)`: con filtros, clientes que tengan **algún** servicio que cumpla; sin filtros, todos los clientes no borrados (l.105-122). (2) Si cambia `dia_pago`: reescribe `pagos.dia_pago` de facturas `NO PAGADO`/`PENDIENTE` (no `FACT. LIBRE`) con `MAKE_DATE(año, mes, día)` (l.143-157). (3) Si cambia `tipo_impuesto` o `tipo_comprobante`: recalcula ítems y `total_servicio` de facturas `NO PAGADO` (Recibo ⇒ impuesto `Ninguno`) (l.160-203). (4) Todo en una transacción (rollback si falla). (5) Log `Database` / `BULK_UPDATE_FACTURACION`: `Cambios masivos de facturación aplicados (N facturas)` con `{filtros, cambios, afectados}` (no guarda valores anteriores). Los recordatorios y demás campos solo cambian la configuración del cliente, no generan envíos.
- **Límites / reversibilidad:** sin tope de registros; sin validación de valores ni lista blanca de campos en el backend (el cuerpo no es un DTO) ✅ (H-17); **no hay deshacer** (no se guardan los valores previos).
- **Efectos secundarios externos:** ninguno directo; afecta cortes, recordatorios y facturas del mes en curso (advertencia de la UI: `¡Atención! Esta acción afecta a todos los clientes que coincidan con los filtros seleccionados. Una mala configuración puede afectar cortes, avisos y facturas del mes en curso.`).
- **Mensajes:** `Cambios aplicados correctamente` (BE) · `Error al aplicar cambios` · `Error cargando filtros del router` · BE `No hay cambios para aplicar`.
- **Casos límite y advertencias:** (a) el filtro es por **cliente**, no por servicio: un cliente con dos servicios en routers distintos recibe el cambio en toda su facturación; (b) `MAKE_DATE` no ajusta el día al mes (día 31 en un mes de 30 ⇒ error y rollback), contrario al comentario del front (`CambiosMasivos.vue:50-51`) (H-13); (c) "Aplicar Corte" se escribe sin doble espacio (`1 Mes Vencido`), distinto del formato de las opciones del formulario del cliente (`"1  Mes Vencido"`).
- **Preguntas probables de usuarios:** 1. "¿Cómo cambio el día de pago de todos los clientes de un router?" → filtrar por router y poner Día de pago. 2. "¿Puedo deshacerlo?" → no. 3. "Cambié el día de pago y las facturas pendientes cambiaron de fecha" → es lo esperado. 4. "Puse día 31 y da error" → H-13. 5. "¿Cuántos clientes cambió?" → mensaje final.
- **Pendiente de validar en UI:** ❓ el error visible con día 31; ❓ si `afectados` cuenta clientes o servicios (es `result.affected` de `factura-clientes`).

---

## AJS-020 · Base de datos · Ubicaciones

- **Ruta UI / name:** `/ajustes/base-datos` → pestaña "Ubicaciones" (ícono `map`).
- **Archivos:** FE: `base-datos/components/GestionUbicaciones.vue` · `src/apis/ubicaciones` · `composables/useUbicacionLabels`. BE: `settings/settings.controller.ts:22-37` · `settings/settings.service.ts:114-164` · `customers/customers.service.ts:3224-3234` (`ubicacion-en-uso`).
- **Para qué sirve:** definir la división geográfica que usa la ficha del cliente: tres niveles base con nombre configurable (Provincia/Cantón/Parroquia o equivalentes) y un cuarto nivel opcional.
- **Acceso:** la pestaña **no** tiene permiso propio (visible para quien llegue a la pantalla con `base-datos.campos` o `base-datos.cambios-masivos`); el catálogo de permisos no la lista.
- **Campos de formulario:** "Nombres de los niveles:" → "Nivel 1", "Nivel 2", "Nivel 3" (placeholders `Ej: Provincia, Estado`, `Ej: Cantón, Municipio`, `Ej: Parroquia, Colonia`) · "Nivel adicional (opcional):" (placeholder `Ej: Recinto, Ciudadela, Zona`; texto `Columna "X" habilitada` / `Dejar vacío para no mostrar este nivel`) · columnas editables con altas (`add_circle`) y bajas (`delete`): "Nuevo <nivel>"; solo Colombia: input "Código" (DANE) en cantón.
- **Botones y acciones:** **Guardar cambios** (deshabilitado sin cambios; chip `Cambios sin guardar`) → `PUT /settings/ubicaciones` `{nivel4, labels:{nivel1,nivel2,nivel3}, provincias}`; éxito `Ubicaciones guardadas correctamente`, error `Error al guardar`; al guardar invalida la caché de ubicaciones del perfil del cliente.
- **Reglas de negocio:** nombres en MAYÚSCULAS; duplicado ⇒ `Ya existe "X" en <nivel>`; al eliminar consulta `GET /customers/ubicacion-en-uso` y bloquea con `No se puede eliminar: N cliente(s) usan "X" (<nivel>)` (nivel 4: `…tienen asignado "X"`); confirmación `Eliminar <nivel>` / `¿Eliminar "X" con sus <nivel2> y <nivel3>?` para provincia y cantón. BE guarda en `settings.ubicaciones` (jsonb) y devuelve `{nivel4, labels, provincias}` (si no hay datos, el front carga el catálogo del país y marca cambios).
- **Casos límite y advertencias:** el control de "en uso" se hace solo contra clientes (`c.<tipo> = :valor`) y el parámetro `tipo` se interpola en la consulta sin lista blanca (H-15); la baja de parroquias no pide confirmación; `PUT` reemplaza todo el árbol (último en guardar gana).
- **Preguntas probables de usuarios:** 1. "¿Cómo cambio 'Provincia' por 'Estado'?" → Nivel 1. 2. "No me deja eliminar una parroquia" → hay clientes usándola. 3. "¿Cómo agrego un barrio/recinto?" → Nivel adicional.
- **Pendiente de validar en UI:** ❓ qué ve el cliente en el formulario cuando el nivel 4 está activo; ❓ catálogo por defecto por país.

## AJS-021 · Logs · Historial de actividad del sistema

- **Ruta UI / name:** `/ajustes/logs` · `ajuste.logs` · Ajustes → tarjeta "Logs". Breadcrumb "Logs" (`receipt_long`).
- **Archivos:** FE: `ajustes/logs/IndexPage.vue` · `ajustes/servicios/components/LogsGenerales.vue` (698 líneas; el panel vive dentro de la carpeta `servicios`). BE: `logs/logs.controller.ts` · `logs/logs.service.ts` · `logs/entities/log.entity.ts` · `logs/dto/filter-log.dto.ts` · `common/dtos/pagination.dto.ts`.
- **Para qué sirve:** consultar qué se hizo en el sistema (acciones de usuarios y procesos automáticos), con filtros, y ver el detalle "antes/después" de cada cambio.
- **Acceso:** tarjeta, ruta y panel con `ver.logs` (`IndexPage.vue:28`, `auth-guard.ts:67-69, 110-113`); el botón eliminar solo con `claim.email === 'info@rednuevaconexion.net'` (`LogsGenerales.vue:576`). **El backend solo pide JWT**: cualquier usuario autenticado puede leer y borrar vía API (H-18).
- **Secciones:** encabezado `📋 Historial de actividad del sistema` + botón "Recargar"; barra de filtros; tabla; diálogo de detalle.
- **Filtros (texto exacto):**

| Filtro | Opciones / comportamiento | Parámetro enviado |
|---|---|---|
| Pills de tipo de acción | **Todas** · **Cambios** · **Automáticos** · **Mensajería** · **Errores** | `actions` (CSV): Cambios = `CREATE, UPDATE, DELETE, ANULAR_PAGO, ANULAR_ABONO, ANULAR_FACTURA_MES, REACTIVAR_FACTURA_MES, GENERAR_FACTURA_ABONO, GENERAR_PDF_FACTURA, NOTA_CREDITO, CREATE_FACTURA_LIBRE, CREATE_FACTURA_SERVICIO, CREATE_PAGO_FACTURA_LIBRE, CREATE_PAGO_FACTURA_SERVICIO, UPDATE_FACTURA_SERVICIO, UPDATE_DIA_PAGO_AL_COBRAR, AJUSTE_STOCK, RETIRAR_SERVICIO, ACTIVAR_SERVICIO, SUSPENDER_SERVICIO, BULK_SOFT_DELETE_CUSTOMERS, BULK_UPDATE_FACTURACION`; Automáticos = `RUN`; Mensajería = `SEND_EMAIL, SEND_WHATSAPP, SEND_EMAIL_SKIPPED, SEND_NOTIFICATION_SUCCESS`; Errores = `ERROR, WARNING, SEND_EMAIL_ERROR, SEND_WHATSAPP_ERROR, VERIFICACION_FALLIDA` |
| Módulo (clearable) | "Todos los módulos" · **Cortes y red** (`corte_servicio, reinicio_onus_smartolt, reinicio_onus_adminolt, verificacion_onu_smartolt`) · **Clientes y servicios** (`ServicioCliente, Resumen`) · **Facturación y pagos** (`Pago, pago, PromesaPago, descarga_comprobante, envio_comprobantes`) · **Cargos recurrentes** (`ServicioRecurrente, ServiciosRecurrente, ServiciosRecurrentePago`) · **Tickets** (`Ticket`) · **Contratos** (`Contrato, ContratosArchivo`) · **Inventario** (`Product`) · **Sistema** (`limpieza_archivos, Database, Plantilla, AdminOLT`) | `entityType` (CSV, `IN`) |
| Usuario (clearable) | "Todos los usuarios" · "🤖 Sistema (automático)" · usuarios de `GET /auth/users` | `soloAutomaticos=true` (logs sin usuario) o `userId` |
| Rango de fechas (placeholder `Rango de fechas`, máscara DD/MM/YYYY; "Limpiar"/"Cerrar") | recarga cuando están "desde" y "hasta" | `fechaDesde`, `fechaHasta` |
| Buscar en descripción... | libre, debounce 350 ms | `filter` |

- **Columnas de la tabla:** "Operador" (nombre o "Sistema" con ícono robot) · "Cliente" (enlace a `cliente.edit` si el log se pudo asociar) · "Módulo" (insignia; si el `entityType` no está mapeado muestra el texto crudo) · "Acción" (etiqueta en español p. ej. "Proceso automático", "Email fallido", "Anular pago", "Eliminación masiva de clientes"; si no hay etiqueta, el código crudo) · "Descripción" (2 líneas, tooltip si >80 caracteres) · "Fecha" (`DD/MM/YYYY HH:mm`) · "Detalle". Paginación 10/20/50/100 (por defecto 10).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| Recargar | recarga página 1 | `ver.logs` | `GET /logs` | — |
| ojo (tooltip "Ver detalle") | abre diálogo: acción, fecha · usuario, descripción, tablas "Campo / Valor Anterior / Valor Nuevo" por sección (RESUMEN, SERVICIO, TICKET, CONTRATO, ARCHIVO DE CONTRATO, FACTURACIÓN, PAGOS, PROMESA DE PAGO, CARGO RECURRENTE, DOCUMENTOS, COMPROBANTE, OTROS CAMBIOS) o `Metadata` en JSON; si no hay: `Este log no tiene información adicional.` | `ver.logs` | — | — |
| papelera (tooltip "Eliminar log") | `Eliminar log` / `¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.` ("Cancelar"/"Eliminar") | solo email reservado | `DELETE /logs/{id}` | `Log eliminado` / `No se pudo eliminar el log`; BE `Log con id X no encontrado` |

- **Reglas de negocio (backend):** `GET /logs`: `page` (def. 1), `limit` (def. 10; `0` = sin paginar), `filter` (ILIKE sobre descripción, `COALESCE(user.fullName,'ISPMAX')` y `COALESCE(user.usuario,'ISPMAX')`), `entityType`/`actions` CSV con `IN`, `entityId`, fechas `DD/MM/YYYY` (`startOf/endOf day` sobre `created_at`), `userId`, `soloAutomaticos` (prioridad sobre `userId`). Orden: **`updated_at DESC`** (no `created_at`). La respuesta añade `cliente {id,nombres}` resolviendo `entityId` (solo UUIDs) contra `servicios-clientes`, `pagos`, `tickets` y `promises-pays` (4 consultas en paralelo) (`logs.service.ts:23-259`). Tabla `logs`: `entityType (≤100)`, `entityId (≤100, null)`, `action (≤50)`, `description (text)`, `user (FK nullable)`, `metadata (jsonb)`, `created_at/updated_at`. **No hay purga/retención** automática (sin job que borre `logs`) ✅.
- **Qué se registra (por `entityType`, ✅ grep de `entityType:`):** `Pago` (cobros, anulaciones, facturas, PDF, notas de crédito, día de pago movido), `ServicioCliente` (alta, edición, suspender/activar/retirar, acciones sobre ONU: `HABILITAR_ONU`, `DESABILITAR_ONU`, `REINICIAR_ONU`, `ELIMINAR_ONU`, `RESYNC_CONFIG_ONU`, `RESTORE_FACTORY_ONU`, `CAMBIAR_WIFI`, `CONFIGURAR_MGMT_IP`…), `Ticket`, `Contrato`/`ContratosArchivo`, `ServicioRecurrente*`, `PromesaPago`, `Product` (`AJUSTE_STOCK`), `Plantilla`, `Database` (masivos), `corte_servicio` / `reinicio_onus_smartolt` / `reinicio_onus_adminolt` / `verificacion_onu_smartolt` (procesos AJS-008/013/014), `envio_comprobantes`/`descarga_comprobante`/`limpieza_archivos` (facturación electrónica), `Resumen`, `AdminOLT`, `SmartOLT`, `SolicitudFirma`, `tasa_bcv`. Acciones envío: `SEND_EMAIL`, `SEND_WHATSAPP` (+`_ERROR`, `SEND_EMAIL_SKIPPED`), `SEND_NOTIFICATION_SUCCESS`, `SEND_TEST_REMINDER`, `RUN_REMINDER_NOW`.
- **Estados posibles:** no hay estados; `action` libre (≤50). Etiquetas "Automáticos" = `RUN`, aunque algunos fallos de procesos también se guardan como `RUN` (con `resultado:'éxito'`, ver AJS-008).
- **Efectos secundarios externos:** ninguno.
- **Casos límite y advertencias:** (a) logs con `entityType` no mapeado (`SmartOLT`, `SolicitudFirma`, `tasa_bcv`, …) solo se ven en "Todos los módulos"; (b) `AdminOLT` está agrupado en "Sistema" y no en "Cortes y red"; (c) el campo de descripción se pinta con `v-html` (texto con HTML se interpreta); (d) el orden es por última actualización, no por creación; (e) el buscador de texto `ISPMAX` encuentra todos los logs sin usuario (COALESCE); (f) `LogsCortes.vue` ("📋 Historial del proceso de cortes") **no está montado en ninguna pantalla** y el permiso `variables.opciones-logs` ("Historial del proceso de cortes") no se consulta en el código (H-19).
- **Preguntas probables de usuarios:** 1. "¿Quién anuló esta factura?" → Logs → Módulo "Facturación y pagos", acción "Anular pago". 2. "¿Por qué se cortó a este cliente?" → Módulo "Cortes y red" y buscar el cliente. 3. "¿Se ejecutó el corte de ayer?" → Automáticos + fecha. 4. "¿Qué cambió en el cliente X?" → botón "Ver detalle" (antes/después). 5. "¿Puedo borrar logs?" → solo la cuenta reservada. 6. "¿Cuánto tiempo se guardan?" → no hay purga. 7. "¿Por qué no veo Logs?" → falta `ver.logs`.
- **Pendiente de validar en UI:** ❓ aspecto del filtro Rango de fechas (máscara DD/MM/YYYY vs. backend); ❓ cómo se ven descripciones largas con HTML; ❓ si el botón eliminar es realmente invisible para SUPER-ADMINISTRADOR.

---

## AJS-022 · Sistema · "Actualizar Sistema" (despliegue del servidor)

- **Ruta UI / name:** `/ajustes/sistema` · `ajuste.sistema` · tarjeta "Sistema" del panel (ícono `system_update`). Breadcrumb "Sistema".
- **Archivos:** FE: `ajustes/sistema/IndexPage.vue` (68 líneas) · `ajustes/IndexPage.vue:386-409` · `router/auth-guard.ts`. BE: `deploy/deploy.controller.ts` · `deploy/service-token.guard.ts` · `scripts/deploy.sh` · `scripts/reiniciar-pm2.sh`.
- **Qué es exactamente:** una **única pantalla con un solo botón** que dispara el despliegue de la nueva versión del software **en el servidor donde corre esa instalación** (descarga el código nuevo de los repositorios, recompila frontend y backend, aplica migraciones de base de datos y reinicia el backend). Es una herramienta de **mantenimiento del proveedor**, no una función de gestión del ISP.
- **A quién va dirigida:** al personal del proveedor (InigualitySoft/ISPMAX). La tarjeta solo se dibuja si el email de la sesión es `info@rednuevaconexion.net` (comparación escrita en el código, `IndexPage.vue:387`), una cuenta que además se **oculta de los listados de usuarios** y se renombró `ISPMAX` por migración (`auth/auth.service.ts:241-252`, `migrations/1775236791489-AddIndexesPerformance.ts:20`) ✅ ❓ (confirmar con el usuario que es la cuenta de soporte del proveedor). Respalda la petición de retirarla del manual de clientes (`notes/hallazgos.md`, punto 22).
- **Acceso real:** (1) UI: solo esa cuenta ve la tarjeta; (2) ruta: no hay permiso asignable (`ajuste.sistema` no está en el catálogo de roles), pero `SUPER-ADMINISTRADOR` pasa el guard y puede abrir `/#/ajustes/sistema` escribiendo la URL (`auth-guard.ts:135-141`); (3) backend: `POST /api/deploy` acepta `x-service-token` **o cualquier JWT válido** (`service-token.guard.ts:13-30`; `deploy.controller.ts:64-65`) ✅ (H-20).
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| **Actualizar Sistema** (`system_update`, teal, con spinner) | llama al despliegue; **sin diálogo de confirmación** | cuenta reservada | `POST /api/deploy` | éxito inmediato: `Sistema actualizado correctamente.` (positive, top); error (incluye 409): `Error al actualizar el sistema.` (negative, top) |

- **Texto de pantalla (exacto):** título "Actualización del Sistema"; descripción "Ejecuta el proceso de actualización del sistema desde el servidor."
- **Reglas de negocio (backend):** si existe `deploy.lock` con menos de **20 min** ⇒ `409 Ya hay un deploy en curso`; si no, escribe el lock, responde `200 {message:'Deploy iniciado, revisa los logs del servidor'}` **antes** de ejecutar y lanza `bash scripts/deploy.sh` desacoplado (`deploy.controller.ts:64-90`). `GET /api/deploy/log` (mismo guard) devuelve `{status: en_curso|ok|error, fecha, error, log}` leyendo `../deploy.log` (sin pantalla en el front).
- **Qué hace `deploy.sh` (resumen, ✅):** completa variables faltantes en los `.env` del backend y frontend (solo si faltan), configura credenciales git en los remotos, y luego: **frontend** `git reset --hard` + `git pull` → si hubo cambios `npm ci` (si cambió `package.json`), `quasar build` y reemplazo de `/var/www/isp-front`; **backend** `git reset --hard` + `git pull`, `npm ci` si cambió `package.json`, respaldo de `dist/`, `npm run build`, `npm run migration:run:prod` (si falla, restaura `dist/` y no reinicia), y delega en `reiniciar-pm2.sh` que ejecuta `pm2 delete all` y `pm2 start ./dist/main.js -i 2 --name BACK-ISP`, `pm2 save`, y escribe `Deploy completado` en el log.
- **Efectos secundarios externos:** GitHub (pull), npm, PM2 (borra **todos** los procesos PM2 del servidor y arranca solo `BACK-ISP`), migraciones sobre PostgreSQL; el backend queda caído unos segundos/minutos; los cron/colas se re-inicializan (`init`, AJS-008).
- **Mensajes (texto exacto):** `Sistema actualizado correctamente.` · `Error al actualizar el sistema.` · BE `Ya hay un deploy en curso` · `No se encontró deploy.log` (404) · `Acceso no autorizado` (401).
- **Casos límite y advertencias:** (a) el aviso de éxito aparece al **iniciar** el proceso, no al terminarlo; (b) `git reset --hard` descarta cualquier cambio local del servidor; (c) `scripts/deploy.sh` está versionado y contiene **valores sensibles en claro** (claves de gateways, token de servicio, credenciales git) — no se transcriben aquí (ver `notes/hallazgos.md`); (d) el botón no tiene confirmación ni indicación de progreso.
- **Preguntas probables de usuarios:** 1. "¿Para qué sirve Sistema?" → es mantenimiento del proveedor; los clientes no la usan. 2. "No veo Sistema" → es lo esperado. 3. "Pulsé Actualizar y la plataforma se cortó un momento" → reinicio del backend. 4. "¿Cómo actualizo mi sistema?" → solicitarlo al proveedor.
- **Pendiente de validar en UI:** ❓ si la tarjeta aparece para la cuenta reservada en una instalación real; ❓ qué ve un SUPER-ADMINISTRADOR al entrar por URL (el código no bloquea); ❓ duración del deploy y mensaje real cuando hay 409.

## AJS-023 · Instalación · Notificaciones por estado

- **Ruta UI / name:** `/ajustes/plantillas` · `ajuste.plantillas` → pestaña vertical **"Instalación"** → sub-pestaña **"Notificaciones por estado"** (ícono `notifications_active`, pestaña inicial). No tiene ruta propia: `ajustes/instalacion/IndexPage.vue` se monta dentro de `plantillas/IndexPage.vue:304-309`.
- **Archivos:** FE: `ajustes/instalacion/IndexPage.vue` · `instalacion/NotificacionesEstadoConfig.vue` · `plantillas/components/WaTemplateControl.vue`. BE: `settings/*` · `instalaciones/instalaciones.service.ts:136-310, 313-520, 735, 817` · `instalaciones/defaults/notif-templates.ts` · `customers/customers.service.ts:757`.
- **Para qué sirve:** define el mensaje (WhatsApp y email) que se envía automáticamente al **cliente** y al **técnico** cuando una instalación cambia de estado.
- **Acceso:** la pestaña "Instalación" exige `variables.ver.plantilla.instalacion` (`plantillas/IndexPage.vue:63-66, 219-223`), clave que **no** figura en el catálogo de permisos ni en la condición de la tarjeta "Plantillas" (H-22). El guardado no tiene permiso de edición propio.
- **Campos de formulario:**

| Etiqueta | Tipo | Obligatorio | Valores | Notas |
|---|---|---|---|---|
| Destinatario | select | sí | "Cliente" (`cliente`) · "Técnico" (`tecnico`) | |
| Estado | select | sí | Cliente: "Agendada" (`AGENDADA`), "En proceso" (`EN_PROCESO`), "Instalado" (`INSTALADO`), "Reprogramada" (`REPROGRAMADA`), "Cancelada" (`CANCELADA`). Técnico: solo "Agendada" y "En proceso" | cambiar a Técnico con otro estado fuerza "Agendada" |
| Notificación ACTIVA / Notificación DESACTIVADA | toggle `activo` | — | boolean | por estado y destinatario |
| Mensaje de WhatsApp | editor enriquecido (negrita, cursiva, tachado, listas) → `whatsApp` | no | HTML; ayuda "💡 El formato se adapta automáticamente a WhatsApp (negrita → *texto*, cursiva → _texto_)." | |
| Asunto del email (`maxlength=200`) | texto → `email.subject` | no | | |
| Cuerpo del email | editor enriquecido → `email.body` | no | HTML | |

- **Variables (chips, clic copia `{variable}`):** Cliente · AGENDADA / EN_PROCESO: `cliente`, `tecnico`, `fecha_instalacion`, `direccion`, `telefono`, `empresa` · INSTALADO: `cliente`, `tecnico`, `plan`, `precio`, `ipv4`, `ssid_wifi`, `password_wifi`, `empresa` · REPROGRAMADA: `cliente`, `tecnico`, `fecha_instalacion`, `motivo`, `direccion`, `empresa` · CANCELADA: `cliente`, `motivo`, `empresa`. Técnico · AGENDADA / EN_PROCESO: `cliente`, `tecnico`, `fecha_instalacion`, `direccion`, `telefono`, `ubicacion` (enlace de Google Maps), `empresa`. El backend además dispone de `correo` (`instalaciones.service.ts:360-375`).
- **Botones y acciones:** **Guardar Cambios** → `PATCH /settings/{id}` con **todo** `formSettings` (`NotificacionesEstadoConfig.vue:121-132`); éxito `Plantilla guardada`; error `e.response.data.message` o `Error al guardar`. Si WhatsApp Cloud API está conectada (`GET /cloud-api/config → conectado`): bloque "Plantilla WhatsApp Oficial" (control `WaTemplateControl`, tipo `instalacion_<destinatario>_<estado>`) y botón sincronizar (tooltip `Actualizar estado de aprobación`, `POST /cloud-api/templates/sync`, aviso `Estados actualizados`).
- **Reglas de negocio (backend):** `enviarNotificacionCambioEstado` (al cambiar estado, l.735; al reasignar técnico, l.817; al crear el servicio desde la instalación, `customers.service.ts:757`) lee `settings.notifInstalacionCliente[estado]` y `…Tecnico[estado]`; envía solo si `activo` y hay contenido; **cliente**: WhatsApp si hay teléfono y la instalación no desactivó ese canal (`instalacion.notificacion.cliente.whatsApp !== false`), email si hay correo y `…email !== false`; **técnico**: solo estados AGENDADA/EN_PROCESO, con las mismas reglas de canal. WhatsApp usa el canal oficial (plantilla aprobada de Meta) si la empresa lo tiene activo, si no el canal no oficial; cada envío queda en el historial de mensajes (`registrarLogInstalacion`). Los errores **no bloquean** el cambio de estado; si falla el email se crea una notificación interna `Falla al enviar Email`. Mensaje de diagnóstico cuando no hay plantilla activa: `La plantilla del CLIENTE para el estado "<estado>" no está activada en Ajustes › Notificaciones por estado.`
- **Valores por defecto:** BD `{}`; empresas nuevas se hidratan con `DEFAULT_NOTIF_INSTALACION_CLIENTE/TECNICO` (todos los estados `activo:true`, HTML) en `SettingsService.create` (`settings.service.ts:41-58`); empresas existentes por migraciones (`1780900000000`, `1781000000000`, `1781100000000`).
- **Efectos secundarios externos:** WhatsApp (Baileys o Cloud API/Meta), SMTP/correo, notificaciones internas, registro en mensajes.
- **Casos límite y advertencias:** (a) el banner aclara `La notificación solo se envía si el cliente activó el canal correspondiente al crear la instalación (WhatsApp o email).`; (b) guardar envía toda la config (H-08); (c) las variables `ssid_wifi`/`password_wifi` solo se llenan en INSTALADO.
- **Preguntas probables de usuarios:** 1. "¿Por qué no le llegó el aviso al cliente?" → plantilla desactivada, falta teléfono/correo o canal apagado al crear la instalación. 2. "¿Puedo cambiar el texto del mensaje al técnico?" → Destinatario "Técnico". 3. "¿Qué variables puedo usar?" → chips. 4. "Uso WhatsApp oficial; ¿cambia algo?" → la plantilla debe aprobarse en Meta.
- **Pendiente de validar en UI:** ❓ comportamiento de `WaTemplateControl` (otro agente); ❓ cómo ve el editor el HTML de los defaults.

---

## AJS-024 · Instalación · Checklist de instalación

- **Ruta UI / name:** `/ajustes/plantillas` → "Instalación" → sub-pestaña **"Checklist instalación"** (ícono `check_circle`).
- **Archivos:** FE: `instalacion/ChecklistConfig.vue`. Consumidores FE: `instalaciones/EditInstalacion.vue:70-100` · `instalaciones/components/ChecklistInstalacion.vue:23`. BE: `settings/*` · `instalaciones/instalaciones.service.ts:1086-1110` (PDF de la hoja de instalación) · `instalaciones/entities/instalacione.entity.ts:87` (`checklist_completado`).
- **Para qué sirve:** lista de pasos que el técnico debe marcar antes de dar por **INSTALADA** una instalación.
- **Acceso:** igual que AJS-023 (`variables.ver.plantilla.instalacion`); sin permiso de edición.
- **Campos de formulario:** por ítem `{id (uuid), label, obligatorio, orden}`:

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| (texto del ítem; placeholder `Item N (ej. 'Probó la señal con el cliente')`) | texto, `maxlength=120`, contador | sí (no vacío) | si hay alguno vacío, **Guardar no hace nada y no avisa** (`return` silencioso, l.50-52) | |
| Toggle "Obligatorio" / "Opcional" | boolean | — | por defecto `true` al agregar | |
| Flechas arriba/abajo | reordena y renumera `orden` | — | — | |
| Eliminar item (tooltip) | quita y renumera | — | — | |

- **Botones y acciones:** "Agregar item" (`add`), **Guardar Cambios** → `updateCortesServicios()` = `PATCH /settings/{id}` (todo) + `PUT /programar-queue/cortesServicios` (re-planifica cortes, efecto colateral) → `Actualización exitosa`. Texto vacío de lista: `Aún no hay items. Agrega uno con el botón de abajo.` Encabezado: `✅ Checklist de Instalación` / `Configura los pasos que el técnico debe completar antes de marcar la instalación como INSTALADO.`
- **Reglas de negocio:** la **obligatoriedad se valida solo en el front**: al pulsar completar la instalación (`EditInstalacion.vue:76-99`) revisa los ítems `obligatorio` sin marcar y muestra el diálogo `Checklist incompleto` / `No se puede finalizar la instalación. Faltan items obligatorios:` + lista, botón "Entendido". El backend guarda `checklist_completado` sin validar (`create-instalacione.dto.ts:62`) (H-23). Los ítems y su estado se imprimen en el PDF de la instalación (`instalaciones.service.ts:1088-1110`).
- **Valores por defecto:** `[]` (jsonb) (`setting.entity.ts:217-220`).
- **Casos límite y advertencias:** si falla la lectura de `/settings` el front **no bloquea** (comentario l.99); permiso `instalaciones.completar` aparte.
- **Preguntas probables de usuarios:** 1. "El técnico no puede finalizar la instalación" → faltan ítems obligatorios. 2. "¿Cómo agrego un paso?" → "Agregar item". 3. "No me deja guardar y no dice nada" → hay un ítem vacío.
- **Pendiente de validar en UI:** ❓ dónde marca el técnico los ítems (`ChecklistInstalacion.vue`, otro módulo).

---

## AJS-025 · Ticket · Plantilla mensaje cliente

- **Ruta UI / name:** `/ajustes/plantillas` → pestaña "Tickets" → sub-pestaña **"Plantilla mensaje cliente"** (ícono `description`).
- **Archivos:** FE: `ajustes/ticket/IndexPage.vue` · `ticket/PlantillaMsgCliente.vue` · `ticket/composables/useConfigTicket.js` · `plantillas/components/TablaVariables.vue`. BE: `settings/*` · `ticket/ticket.service.ts:240-350`.
- **Para qué sirve:** texto del aviso que se manda al cliente cuando se crea/reenvía un ticket (WhatsApp y correo).
- **Acceso:** pestaña "Tickets" con `variables.ver.plantilla.ticket`; botón "Guardar cambios" solo con `variables.edita.plantilla.ticket` (`PlantillaMsgCliente.vue:113`).
- **Campos de formulario:** editor enriquecido (`plantillaTicketCliente`, HTML, sin límite) y tabla "Variables que puede usar en la plantilla": `{ cliente }` (Nombres del cliente), `{ fecha_visita }` (Fecha de visita), `{ asunto }` (Asunto del ticket), `{ detalle }` (Detalle del ticket), `{ tecnico }` (Nombres del técnico asignado), `{ prioridad }` (Prioridad del ticket), `{ turno }` (Turno de la visita), `{ hora_visita }` (Hora de la visita), `{ telefono_tecnico }` (Teléfono del técnico). Si WhatsApp Cloud API está conectada: "Plantilla WhatsApp Oficial" (`tipo="ticket_cliente"`) con sincronización.
- **Botones y acciones:** "Guardar cambios" (`save`, outline) → `PATCH /settings/{id} {plantillaTicketCliente}` → `invalidarSettings()` y `Datos actualizados` (positive, top).
- **Reglas de negocio (backend):** `ticket.service.ts:240-340`: variables que realmente se resuelven: `cliente, fecha_visita, asunto, detalle, tecnico, prioridad, turno, hora_visita, telefono_tecnico, telefono_cliente, coordenadas_cliente, ipv4, direccion` (las últimas cuatro **no** se listan en la tabla del cliente). WhatsApp: canal oficial → plantilla Meta `ticket_cliente`; si no, `adaptarParaWhatsapp(plantilla, variables)`. Email: la misma plantilla en HTML. Se envía por el canal marcado en el ticket (`cliente.whatsApp` / `cliente.email`).
- **Valores por defecto:** `null` (columna `text` nullable) (`setting.entity.ts:233-237`). ❓ qué se envía si está vacía (no se verificó `adaptarParaWhatsapp(null)`).
- **Efectos secundarios externos:** WhatsApp (Baileys/Cloud API), correo, historial de mensajes (`origen: 'ticket'`).
- **Preguntas probables de usuarios:** 1. "¿Cómo cambio el mensaje que recibe el cliente al abrir un ticket?" → esta plantilla. 2. "¿Qué variables hay?" → tabla. 3. "No veo el botón Guardar" → falta `variables.edita.plantilla.ticket`.
- **Pendiente de validar en UI:** ❓ texto por defecto de fábrica (no hay semilla en código).

---

## AJS-026 · Ticket · Plantilla mensaje técnico

- **Ruta UI / name:** `/ajustes/plantillas` → "Tickets" → **"Plantilla mensaje tecnico"** (sin tilde en la etiqueta).
- **Archivos:** FE: `ticket/PlantillaMsgTecnico.vue`. BE: `ticket/ticket.service.ts:380-500` · `ticket/variables-ticket.ts` (otro catálogo, para formatos de ticket).
- **Para qué sirve:** aviso al técnico responsable y a los de apoyo al asignar un ticket.
- **Acceso:** igual que AJS-025.
- **Campos / variables (tabla de la pantalla):** `{ cliente }`, `{ fecha_visita }`, `{ asunto }`, `{ detalle }`, `{ tecnico }` (Nombres del técnico), `{ prioridad }`, `{ turno }`, `{ hora_visita }`, `{ telefono_cliente }` (Teléfono del cliente), `{ coordenadas_cliente }` (Coordenadas), `{ ipv4 }` (IPv4 del servicio), `{ direccion }` (Dirección del servicio). Control WhatsApp Oficial `tipo="ticket_tecnico"`.
- **Botones y acciones:** "Guardar cambios" → `PATCH /settings/{id} {plantillaTicketTecnico}` → `Datos actualizados` (con `variables.edita.plantilla.ticket`).
- **Reglas de negocio (backend):** el aviso va al responsable y a cada técnico de apoyo (cada uno con su `tecnico`/`telefono_tecnico`); al de apoyo se le agrega una nota: `Usted va como técnico de apoyo. Responsable del ticket: <nombre> (<celular>).` (`ticket.service.ts:397-413, 493`). Defecto `null`.
- **Efectos secundarios externos / preguntas / pendiente:** como AJS-025 (destinatario técnico).

---

## AJS-027 · Ticket · Firma del ticket

- **Ruta UI / name:** `/ajustes/plantillas` → "Tickets" → **"Firma del ticket"** (ícono `draw`).
- **Archivos:** FE: `ticket/FirmaTicket.vue`; consumidor `tickets/composables/useFirmaTicket.js:28-40`, `tickets/components/DetalleTicket.vue:61`. BE: `settings/entities/setting.entity.ts:243-251` · `ticket/firma/tickets-firma.controller.ts:80-130`.
- **Para qué sirve:** elegir **cómo firma el cliente la orden de servicio**: firma electrónica con proveedor, o firma dibujada en el dispositivo del técnico. Son excluyentes.
- **Acceso:** pestaña "Tickets" (`variables.ver.plantilla.ticket`); sin permiso de edición propio.
- **Campos de formulario:** dos tarjetas con radio: **"Firma electrónica"** (`electronica`) — "Se le manda un enlace al correo del cliente y firma desde donde esté. Tiene validez legal y la cobra el proveedor por cada trámite."; **"Firma en el dispositivo"** (`manuscrita`) — "El técnico le acerca el celular o la tableta y el cliente firma con el dedo, ahí mismo. No cuesta nada y no necesita internet del cliente, pero vale como constancia de conformidad, igual que una firma en papel: no es firma electrónica." Título `¿Cómo firma el cliente la orden de servicio?`; ayuda `Se usa una u otra, no las dos: ofrecer ambas a la vez sólo genera dudas sobre cuál corresponde. En los dos casos la firma se coloca donde el formato de ticket tenga {firma_cliente}, así que el mismo Word sirve para las dos.` Con "manuscrita": banner `Si además querés la firma del técnico, agregá {firma_tecnico} en el formato de ticket, sobre su raya de firma.`
- **Botones y acciones:** **Guardar** → `PATCH /settings/{id} {firmaTicketModo}` → `Datos actualizados`.
- **Valores por defecto:** `'electronica'` (`setting.entity.ts:250-251`); DTO `@IsIn(['electronica','manuscrita'])`.
- **Reglas de negocio (backend):** el valor lo lee el **front** para decidir qué flujo muestra (`useFirmaTicket.js:36`); el backend **no lo valida** en los endpoints (`POST /tickets-firma/manuscrita/:ticketId` y las solicitudes electrónicas siguen disponibles) — solo existe el comentario en `tickets-firma.controller.ts:88` ✅ (H-21). Estados de la firma electrónica: ver módulo de tickets (otro agente).
- **Efectos secundarios externos:** modo electrónico → gateway de firma (`contratos.ispmax.ec` configurable en Ajustes › Firma de Contratos) y costo por trámite (según el texto) ❓.
- **Preguntas probables de usuarios:** 1. "¿Puedo firmar el ticket con el celular del técnico?" → "Firma en el dispositivo". 2. "¿Tiene validez legal?" → solo la electrónica. 3. "¿Dónde sale la firma en el PDF?" → donde esté `{firma_cliente}` en el formato de ticket.
- **Pendiente de validar en UI:** ❓ requisitos de la firma electrónica (credenciales del gateway); ❓ aspecto de las tarjetas.

---

## AJS-028 · Ticket · Técnicos de apoyo

- **Ruta UI / name:** `/ajustes/plantillas` → "Tickets" → **"Técnicos de apoyo"** (ícono `group`).
- **Archivos:** FE: `ticket/TecnicosApoyo.vue`. Consumidores FE: `tickets/components/FormTicket.vue:80` · `DetalleTicket.vue:48` · `VisitaTicket.vue:45` · `tickets/composables/useTicket.js:48`. BE: `ticket/ticket.service.ts:80-110, 141-170, 680-720, 796-850` · `ticket/visitas/tickets-visitas.service.ts:40-70`.
- **Para qué sirve:** permitir asignar, además del técnico responsable, técnicos de apoyo en cada ticket, y decidir si pueden gestionarlo.
- **Acceso:** `variables.ver.plantilla.ticket`; sin permiso de edición propio.
- **Campos de formulario:**

| Etiqueta | Tipo | Valores | Efecto |
|---|---|---|---|
| Permitir técnicos de apoyo en los tickets | toggle `ticketApoyoHabilitado` (defecto `false`) | "Agrega el campo **Técnicos de apoyo** al crear o editar un ticket. Apagado, el campo no aparece. Los tickets que ya tienen técnicos de apoyo los conservan, y ellos los siguen viendo en Mis tickets." | BE: apagado ⇒ crear/editar **ignoran** `apoyos` (`ticket.service.ts:141-142, 799`) |
| Los técnicos de apoyo gestionan el ticket como el responsable | toggle `ticketApoyoGestiona` (defecto `false`; deshabilitado si el anterior está apagado) | "Pueden marcar la llegada y salida de la visita y pasar el ticket a **En proceso** o **Resuelto**. Cerrarlo o cancelarlo sigue siendo del operador que lo creó (o de quien tenga permiso para cambiar el estado de tickets ajenos). Apagado, los de apoyo sólo se enteran del ticket y pueden responderlo." | BE: `tickets-visitas.service.ts:55-63` (marcar visita) |

- **Botones y acciones:** **Guardar** → `PATCH /settings/{id} {ticketApoyoHabilitado, ticketApoyoGestiona}` → `Datos actualizados`.
- **Reglas de negocio (backend):** un apoyo no puede repetirse ni ser el responsable (`idsApoyo`); todos reciben el aviso "Ticket asignado" (panel y WhatsApp/correo: `Se te agregó como técnico de apoyo en el ticket: …`); el filtro por técnico incluye los tickets donde es apoyo ("Mis tickets", `ticket.service.ts:707-710`).
- **Preguntas probables de usuarios:** 1. "¿Cómo pongo un segundo técnico en un ticket?" → activar "Permitir técnicos de apoyo". 2. "¿Puede el apoyo cerrar el ticket?" → no, solo marcar visita y pasar a En proceso/Resuelto. 3. "Desactivé y siguen apareciendo" → los tickets existentes los conservan.
- **Pendiente de validar en UI:** ❓ cómo se ve el campo "Técnicos de apoyo" en el formulario de ticket.

## AJS-029 · Empresa · datos fiscales, logo y certificado

> Es la misma funcionalidad que ACC-030 (`acc.md`), releída aquí desde Ajustes contra el código del 2026-10-14; las dos secciones deben coincidir.

- **Ruta UI / name:** `/ajustes/empresa` · `ajuste.empresa` · Ajustes → tarjeta "Empresa" → pestaña **"Empresa"** (ícono `business`; breadcrumb "Empresa") (`FE:pages/dashboard/ajustes/empresa/IndexPage.vue:50-82`, `router/routes.ts:423-427`) ✅. La misma ficha, sin pestañas ni breadcrumb, se abre en `/empresa/edit/:empresa_id` · `index.empresa` con el botón **Actualizar firma** del aviso de firma electrónica de la cabecera (`FE:layouts/MainLayout.vue:122, 368-373`, `router/routes.ts:44-49`); el `:empresa_id` de la URL **se ignora**: la ficha carga siempre la primera empresa que devuelve `GET /companies` (`FE:pages/dashboard/empresas/EditEmpresa.vue:14-35`) ✅.
- **Archivos:** FE: `pages/dashboard/ajustes/empresa/IndexPage.vue` (l.1-94) · `pages/dashboard/empresas/EditEmpresa.vue` (l.1-41) · `pages/dashboard/empresas/components/FormEmpresa.vue` (l.51-344) · `pages/dashboard/empresas/composables/useEmpresa.js` (l.1-278) · `composables/useCompany.js` (l.1-13) · `composables/usePais.js` (l.6-9, 33-34, 78-79) · `stores/auth-user.ts` (`setImageCompany`, l.262). BE: `companies/companies.controller.ts` (l.15-127) · `companies/companies.service.ts` (l.28-296) · `companies/entities/company.entity.ts` (l.14-133) · `companies/dto/create-company.dto.ts` (l.16-94) · `companies/dto/update-company.dto.ts` · `companies/helpers/fileFilter.helper.ts` · `companies/helpers/fileNamer.helper.ts` · `deploy/service-token.guard.ts` (l.6-33).
- **Para qué sirve:** datos fiscales del emisor (identificación fiscal, nombre comercial, dirección, contacto), logo y, en Ecuador, el certificado de firma electrónica `.p12`. En este producto hay **una sola empresa por instalación**: no existe pantalla para crearla ni para listar varias.
- **Acceso:** tarjeta "Empresa" del panel con `ajuste.empresa` **y** (`index.empresa` o `index.sucursal`) (`FE:pages/dashboard/ajustes/IndexPage.vue:331-336`); pestaña "Empresa" con `index.empresa` (`ajustes/empresa/IndexPage.vue:13, 64, 78`); botón **Guardar Cambios** con `editar.empresa` (`FormEmpresa.vue:332`). Sin `index.empresa` ni `index.sucursal` la pantalla redirige a `dashboard` (`IndexPage.vue:33-39`); si falta solo una de las dos, abre la pestaña que sí tenga (`:21-29`). En el selector de permisos, `ajuste.empresa` ("Configurar empresa") es un interruptor maestro: con él apagado sus hijos aparecen deshabilitados (`FE:pages/dashboard/usuarios/components/ListPermisos.vue:24-37`). Backend: `GET` con `@Auth()` (cualquier JWT); `POST` con `ServiceTokenGuard`, que acepta el token de servicio **o cualquier JWT válido** (`companies.controller.ts:22, 69-70`, `service-token.guard.ts:13-30`) ✅ (H-4 de `acc.md`).
- **Secciones / pestañas:** una sola tarjeta con el formulario; los campos fiscales aparecen al activar **Requiere Facturación:**.
- **Campos de formulario** (`FormEmpresa.vue`, validaciones en `useEmpresa.js:133-198`):

| Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
|---|---|---|---|---|
| `RUC:` (el rótulo cambia por país: `RUC` en EC, PE y países sin regla propia; `NIT` en CO y BO; `RFC` en MX; `RIF` en VE — `usePais.js:78-79`) | texto con contador; solo dígitos (al teclear se borran las letras), `maxlength=13`; en móvil `type=number` (`FormEmpresa.vue:67-87`) | sí | FE: no vacío (`Debes completar este campo`). Solo en **EC**: menos de 13 dígitos ⇒ `Ingresa un numero RUC valido`; no termina en `001` ⇒ `El numero R.U.C debe terminar en 001` (`useEmpresa.js:172-184`). En otros países no hay más regla. BE: `@IsNotEmpty @IsString @MinLength(5) @MaxLength(20)` (`create-company.dto.ts:36-43`); columna `varchar(13)` y única (`company.entity.ts:91-92`) | el mensaje usa la etiqueta del país |
| `Nombre Comercial:` | texto; se muestra y se envía en MAYÚSCULAS (`useEmpresa.js:220`) | sí | FE: no vacío. BE: mínimo 5 caracteres (`create-company.dto.ts:26-29`) | columna `varchar(255)` |
| `Dirección:` | texto | sí | FE: no vacío. BE: mínimo 5 (`:31-34`) | columna `direccion_matriz varchar(300)` |
| `Email:` | texto | sí | FE: si tiene más de 5 caracteres debe cumplir un patrón de correo ⇒ `Ingresa un email valido` (`useEmpresa.js:135, 149-153`). BE: mínimo 5 (`:49-52`) | columna `varchar(100)` |
| `Celular:` | selector de teléfono con país (`vue3-q-tel-input`, búsqueda `Buscar pais...`); país por defecto = el de la instancia o `VITE_TEL_DEFAULT_COUNTRY` (`usePais.js:33-34`) | sí | FE: no vacío; el componente marca error si el número no es válido (`FormEmpresa.vue:21-23, 149-164`). BE: `@IsOptional @IsString` | |
| `Logo de la empresa` | `q-file` (`accept=".jpg, image/*"`); etiqueta `Cargar Logo` o el nombre del archivo actual; vista previa de hasta 125×75; icono × para quitar el archivo elegido (`:168-212`) | no | El texto de ayuda dice «Tamaño máximo 3MB, extensión .jpg o .png y ser menor o igual a 600px por 600px."» (con la comilla final tal cual está en pantalla, `:201`) pero **no se valida**: el panel solo comprueba que el archivo cargue como imagen (`useEmpresa.js:115-131`) y el backend solo filtra por tipo MIME `jpg`, `jpeg`, `png` (`fileFilter.helper.ts:7-8`). Archivo rechazado por `accept` ⇒ `El tipo de archivo es invalido` | si no hay logo se muestra `/imgs/logo_provisional.png` (`useEmpresa.js:9`, `EditEmpresa.vue:29-30`) |
| `Requiere Facturación:` | interruptor (`q-toggle`) | no | BE: `@Transform(aBooleano) @IsBoolean` (acepta `true`/`false` en texto, porque viaja por `multipart/form-data`, `create-company.dto.ts:8-14, 90-92`) | defecto de la empresa `true` (`company.entity.ts:109-110`); en el front, `false` hasta cargar (`useEmpresa.js:18`). Si está activo muestra los campos siguientes |
| `Razón Social` | texto en MAYÚSCULAS | con facturación (solo informativo: ni el panel ni el DTO la exigen) | se rellena sola con el nombre del titular del certificado (`useEmpresa.js:91-92`) | columna `razon_social varchar(255)` **sin** `nullable` (`company.entity.ts:47-48`) |
| `Cargar Certificado:` (solo `PAIS=EC`) | `q-file` `accept=".p12"`; etiqueta `Cargar Certificado` o el nombre del archivo actual | EC + facturación + alta ⇒ `Debes adjuntar el certificado` (**nunca se evalúa**, ver casos límite) | rechazo ⇒ `El tipo de archivo es invalido`; BE: solo MIME `x-pkcs12` | el archivo se guarda con nombre `uuid.p12` (`fileNamer.helper.ts:7-15`) |
| `Clave Certificado:` (solo `PAIS=EC`) | contraseña con ojo (`visibility`) | EC + facturación ⇒ `Debes completar este campo` (`useEmpresa.js:157-159`) | si no abre el `.p12` ⇒ `La contraseña del certificado esta incorrecta` (`:105-108`) | columna `varchar(300)`, guardada en claro |
| `Obligado Contabilidad:` (solo `PAIS=EC`) | interruptor | no | `@Transform(aBooleano) @IsBoolean` | defecto `false` |
| `Fecha Exp. Firma Electrónica:` (solo `PAIS=EC`) | texto de solo lectura, `DD/MM/YYYY HH:mma` | — | se toma del certificado al cargarlo; solo se envía (en ISO) si se validó un certificado nuevo en esa edición (`useEmpresa.js:98-102, 231-234`) | |
| (sin control en pantalla) `iva` | código del IVA de la empresa (`char`, defecto `4`, `company.entity.ts:103-104`) | en EC con facturación se exige no vacío (`useEmpresa.js:157-159`) | viaja en el formulario (`:227`); lo leen `GET /companies/get-iva/:id` (`useFacturacion.js:577`, `useProduct.js:68`) | |

- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| **Guardar Cambios** (`icon-right=save`, outline) | valida (sin bloquear, ver casos límite), abre el diálogo `¿Deseas realizar la edición?` ("Aceptar" / "Cancelar") y envía la ficha | `editar.empresa` | `POST /companies/{id}` (`multipart/form-data`: texto + `logo` + `archivo_certificado`) | éxito: `Información editada` (positive) y recarga `GET /companies`; si cambió el logo actualiza el de la barra lateral (`setImageCompany`). Los errores del servidor solo van a la consola (`useEmpresa.js:238-257`) |
| icono × del `Logo` / del `Cargar Certificado:` | descarta el archivo elegido | — | — | — |
| icono ojo de `Clave Certificado:` | muestra u oculta la clave | — | — | — |

- **Estados posibles (estado de la firma, no se edita aquí):** `GET /companies/estado-certificado/:id` devuelve `no_aplica` (sin facturación), `sin_certificado`, `desconocido`, `vencido` (días < 0), `por_vencer` (≤ 15 días) o `vigente` (`companies.service.ts:98-161`). Lo consume el aviso de la cabecera solo si la facturación electrónica está activa y la empresa requiere facturación (`MainLayout.vue:297-309`) ✅. Si la fecha guardada no sirve y hay firma y clave, el backend pregunta la caducidad al microservicio de facturación (`/certificado/info`) y la guarda (`companies.service.ts:126-142, 175-203`).
- **Reglas de negocio (backend):**
  1. `GET /companies/:estado?` devuelve las empresas **con todas las columnas** (incluidas `clave_certificado` y los datos del canal oficial de WhatsApp) a cualquier usuario autenticado; el filtro por `company-id` solo se omite si la cabecera `rol` es `SUPER-ADMINISTRADOR`, pero el panel envía `rol-name`, así que siempre filtra (`companies.controller.ts:22-30`, `companies.service.ts:28-37`, `FE:boot/axios.ts:25-30`) ✅.
  2. `POST /companies/:id?`: sube el logo a `./public/images` y el certificado a `./static/SRI/FIRMAS`; los archivos de otro tipo MIME se descartan en silencio (`companies.controller.ts:69-90`, `fileFilter.helper.ts`). Al subir un certificado borra el anterior si el nombre difiere (l.92-100) y lo copia al microservicio de facturación (`/files/upload-signature`; **el error se ignora**, `companies.service.ts:215-229`). Sin `id` usa la primera empresa (l.207-211). Respuesta `{ ok: true, msg: "Se actualizaron los datos exitosamente" }`.
  3. Si no se sube archivo nuevo, `logo` y `archivo_certificado` se guardan **tal como llegan** en `logo_old` / `archivo_certificado_old` (`companies.service.ts:233-241`). El panel manda el texto `null` cuando están vacíos (`FormData.append(…, null)` ⇒ `"null"`, `useEmpresa.js:229-236`) ⇒ una empresa sin logo o sin certificado queda con el **texto `null`** como nombre (H-30).
  4. Si el cuerpo trae `suscription_id` (lo envía el sistema "master" al enlazar la suscripción) se invalida la caché del límite de clientes (`companies.controller.ts:104-108`; AJS-002).
  5. `GET /companies/get-image/company` es **público** y devuelve solo el nombre del logo (la pantalla de login lo usa, `FE:pages/sesion/Login.vue:43`) (`companies.controller.ts:62-67`).
  6. `GET /companies/find` está declarado **después** de `GET :estado?`, que también casa con `/companies/find` y falla con `ParseBoolPipe`; nadie del front lo llama (`companies.controller.ts:22-24, 56-60`) ❓ (inferido del orden de rutas, no ejecutado).
  7. `PATCH /companies/:id/:estado` (activar/inactivar) y `DELETE /companies/:id` existen con solo `@Auth()` y **sin pantalla**; `remove` ignora el `:id`, borra **la primera empresa** y sus archivos (`companies.controller.ts:113-126`, `companies.service.ts:39-42, 252-272`) (H-35).
- **Efectos secundarios externos:** microservicio de facturación (copia del `.p12` y consulta de caducidad); sistema de archivos del servidor; sistema "master" (vínculo `suscription_id`, AJS-002).
- **Mensajes de error/éxito (texto exacto):** los de la tabla · `Información editada` · `¿Deseas realizar la edición?` · `El tipo de archivo es invalido` · `Debes completar este campo` · `Ingresa un email valido` · BE: `Se actualizaron los datos exitosamente` · `Empresa no encontrada` · `No se encontró ninguna empresa` · `La clave del certificado es incorrecta` (cualquier 400 interno) · `No es posbile borrar, este registro se encuentra en uso` (sic, `companies.service.ts:288`).
- **Relaciones con otros módulos:** ACC-030 (misma ficha), ACC-023 (aviso de firma), ACC-027 y AJS-002 (plan y `suscription_id`), AJS-030 (sucursales: numeración), AJS-011 (Factus toma razón social, NIT y dirección de esta ficha), facturación SRI/Factus, login (logo).
- **Casos límite y advertencias:**
  - **La validación no bloquea el guardado:** `onSubmit` hace `if (await !validarCampos(true)) return`; el `!` se aplica a la promesa (siempre truthy) ⇒ la condición es siempre falsa y, con errores en rojo, el diálogo de confirmación se abre igual (`useEmpresa.js:202-209`). Además `validarCampos` siempre se llama con `edit = true`, así que `Debes adjuntar el certificado` no se evalúa nunca (`:186-195`) (H-29).
  - Si el archivo del logo no es una imagen válida, `validarImagen` nunca se resuelve (no tiene `onerror`) y **el botón no hace nada ni avisa**; el estado `loading` del botón no se activa en ningún momento (`useEmpresa.js:115-131, 48`) ✅ (H-29).
  - `validateNumRuc` y `validateNumCelular` (mensajes `Debes completar 13 digitos` / `Debes completar 10 digitos`) están definidos pero ningún campo los usa (`useEmpresa.js:70-71`).
  - `camposRequeridos.push('clave_certificado', 'iva')` se ejecuta en cada validación (la lista crece, sin efecto visible) (`:157-159`).
  - La clave del certificado se guarda y se devuelve en claro a cualquier usuario autenticado (`GET /companies`) (H-3 de `acc.md`).
  - Cambiar el logo con un archivo que no sea JPG/PNG no da error: el servidor lo descarta y el nombre anterior se conserva.
  - RUC: el DTO admite hasta 20 caracteres y la columna solo 13; por la interfaz no se puede teclear más de 13 ❓.
  - Todos los datos del formulario (RUC, nombres, dirección, email) pueden editarlos quienes tengan `editar.empresa`, pero a nivel de API cualquier usuario autenticado puede enviar el `POST` (H-4 de `acc.md`).
- **Preguntas probables de usuarios:**
  1. "Me avisa que la firma venció, ¿dónde la subo?" → Ajustes → Empresa → `Cargar Certificado:` + `Clave Certificado:` → **Guardar Cambios** (solo Ecuador).
  2. "Dice que la contraseña del certificado está incorrecta" → la clave no abre el `.p12`.
  3. "No me deja guardar el RUC / NIT" → en Ecuador debe tener 13 dígitos y terminar en 001; en otros países, no estar vacío.
  4. "Cambié el logo y sigue el anterior" → formato no admitido (solo JPG/PNG) o recargar la página.
  5. "¿Puedo tener dos empresas?" → no; una por instalación (varias sucursales sí, AJS-030).
  6. "¿Dónde pongo mi razón social?" → se activa **Requiere Facturación:**; con certificado se rellena sola.
  7. "No veo el botón Guardar Cambios" → falta `editar.empresa`.
  8. "¿Por qué mi sistema pide NIT/RIF y no RUC?" → el rótulo depende del país de la instalación.
- **Pendiente de validar en UI:** ❓ el texto `null` en el selector de logo / certificado y la vista previa `/api/images/null` tras guardar una empresa sin logo (H-30); ❓ si el servidor rechaza un RUC de más de 13 caracteres con un mensaje o con un 500; ❓ qué muestra la ficha en Colombia, Perú y Venezuela (solo `Razón Social` bajo **Requiere Facturación:**); ❓ si `GET /companies/find` responde 400.

---

## AJS-030 · Empresa · Sucursales

> Misma funcionalidad que ACC-031 (`acc.md`); esta sección la contrasta con el código del 2026-10-14 desde Ajustes.

- **Ruta UI / name:** `/ajustes/empresa` · `ajuste.empresa` → pestaña **"Sucursales"** (ícono `location_city`). Dentro de la pestaña hay tres vistas internas (`index`, `crear`, `editar`) que se cambian sin modificar la URL (`FE:pages/dashboard/ajustes/empresa/sucursales/IndexPage.vue:6-33`) ✅.
- **Archivos:** FE: `pages/dashboard/ajustes/empresa/sucursales/IndexPage.vue` (l.1-34) · `pages/dashboard/sucursales/IndexPage.vue` (l.1-310) · `pages/dashboard/sucursales/AddSucursal.vue` · `pages/dashboard/sucursales/EditSucursal.vue` · `pages/dashboard/sucursales/components/FormSucursal.vue` (l.25-287) · `pages/dashboard/sucursales/composables/useSucursal.js` (l.1-121) · `composables/useFacturacionElectronica.js` (l.10-14) · `composables/usePais.js` · `composables/useHelpers.js` (`confirmDelete`, l.48-67). BE: `sucursal/sucursal.controller.ts` (l.11-105) · `sucursal/sucursal.service.ts` (l.15-157) · `sucursal/entities/sucursal.entity.ts` (l.10-91) · `sucursal/dto/create-sucursal.dto.ts` (l.5-59) · `sucursal/dto/update-sucursal.dto.ts` · `sucursal/sucursal-facturacion.service.ts` (solo para la elección de la sucursal de cobro, ACC-032).
- **Para qué sirve:** definir los puntos de emisión de la empresa. Cada sucursal lleva establecimiento, punto de emisión y los contadores de facturas, notas de crédito y recibos; el contador guarda el **próximo número a emitir** (`comprobantes-electronicos/facturas/facturas.service.ts:78-135`: la lectura usa el valor guardado y al emitir se incrementa; recibos: `registro-pagos/registrar-abono.service.ts:870-874`, número con 8 dígitos y se guarda `+1`) ✅.
- **Acceso:** pestaña con `index.sucursal` (`ajustes/empresa/IndexPage.vue:17, 69-74, 84-90`); **Agregar Sucursal** con `crear.sucursal` (`sucursales/IndexPage.vue:157`); editar con `editar.sucursal` (l.240); activar / desactivar con `activar.inactivar.sucursal` (l.252, 263); eliminar con `eliminar.sucursal` (l.274). Backend: todo `@Auth()` (cualquier JWT) salvo `resolver-cobro`, `estado-cobro` e `historial-cobro`, que usan `ServiceTokenGuard` (`sucursal.controller.ts:18-98`). Además, `GET /sucursal` solo devuelve las sucursales asignadas al usuario si tiene `sucursales` guardadas (`sucursal.service.ts:41-62`) ✅.
- **Listado** (`sucursales/IndexPage.vue:6-47, 98-291`): encabezado `Listado de Sucursales` solo si el primer rol **no** es `SUPER-ADMINISTRADOR` (l.143-153); columnas `Sucursal`, `Dirección` (truncada, con tooltip), `N° de establecimiento`, `Punto de emisión`, `N° de factura` (= `secuencia_factura_produccion`), `Estado` (insignia `Activo` / `Inactivo`) y `Acciones`; selector `OCULTAR COLUMNAS`; buscador `Buscar...`; pantalla completa; 10 filas por página; sin datos: `No se encontró ningun Resultado`.
- **Botones y acciones:**

| Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
|---|---|---|---|---|
| **Agregar Sucursal** (solo en pantallas que no son `xs`) | abre la vista `crear` (título `Nueva Sucursal`) | `crear.sucursal` | — | en móvil se sustituye por un botón flotante `+` que navega a `crear.sucursal`, ruta que **no existe** (H-31) |
| icono lápiz (`edit`; solo filas activas) | abre la vista `editar` (título `Editar Sucursal`) | `editar.sucursal` | `GET /sucursal/find/{id}/sucursal` | carga el registro con `company_id` (`EditSucursal.vue:8-14`) |
| icono `close` (filas activas) / `done` (filas inactivas) | desactiva / activa la sucursal; **sin confirmación** | `activar.inactivar.sucursal` | `PATCH /sucursal/{id}/{true\|false}` | toast con el mensaje del backend `Actualizado Exitosamente`; recarga el listado (l.71-79) |
| icono `delete` (solo filas inactivas) | diálogo `Confirmar` / `Estas seguro de eliminar esta sucursal?` ("Eliminar" / "Cancelar") | `eliminar.sucursal` | `DELETE /sucursal/{id}` | éxito `Registro eliminado exitosamente`; error: mensaje del backend (ver reglas). El botón se condiciona con `!props.row.estado`, campo que no existe en la fila ⇒ siempre verdadero (l.273-275) |
| **Regresar** (solo si el ancho > 600 px) | vuelve al listado | — | — | `FormSucursal.vue:262-271` |
| **Guardar Cambios** (`save`) | crea o edita | `crear.sucursal` / `editar.sucursal` (a nivel de pantalla; el botón no lo comprueba) | `POST /sucursal` · `PATCH /sucursal/{id}` | `useSucursal.js:61-107` |

- **Campos de formulario** (`FormSucursal.vue`; valores iniciales de `useSucursal.js:7-24`):

| Etiqueta | Tipo | Cuándo se ve | Valor inicial | Validación / notas |
|---|---|---|---|---|
| `Nombre del establecimiento:` | texto (MAYÚSCULAS) | siempre | vacío | BE: `@IsNotEmpty @IsString @MinLength(3)`; columna `varchar(100)`; sin restricción de unicidad |
| `Dirección:` | texto | siempre | vacío | BE: `@IsNotEmpty @IsString`; columna `varchar(255)` |
| `Numero de Establecimiento:` | número | `PAIS=EC` | 0 | `establecimiento` (`int`); `maxlength=3` declarado (en un campo numérico el navegador no lo aplica ❓) |
| `N° punto de emisión:` | número | `PAIS=EC` | 0 | `punto_emision` (`int`) |
| `N° secuencial Factura:` | número | `PAIS=EC` y facturación electrónica activa (`facturacionElectronicaActiva`: variable de compilación `VITE_FACTURACION_ELECTRONICA`, activa por defecto) | 0 | `secuencia_factura_produccion` (`int`, obligatoria) |
| `N° secuencial Factura Pruebas:` | número | ídem | 0 | `secuencia_factura_pruebas` (BD por defecto 1; el panel siempre manda un número) |
| `N° secuencial Nota de Crédito:` | número | ídem | 0 | `secuencia_nota_credito_produccion` |
| `Secuencial nota de crédito Pruebas:` | número | ídem | 0 | `secuencia_nota_credito_pruebas` |
| `Ambiente:` | selector `PRODUCCION` / `PRUEBA` | `PAIS=EC` y facturación electrónica activa | `PRUEBA` | `ambiente` (enum de BD; el DTO solo exige `@IsOptional`). Solo se incrementa el contador del ambiente vigente (`facturas.service.ts:104-117`) |
| `Rango de numeración — Factura` / `Rango de numeración — Nota Crédito` (borrables; hints `Resolución DIAN para facturas de venta` / `Resolución DIAN para notas crédito`) | selectores | proveedor Factus (Colombia, `USA_FACTUS`) | vacío ⇒ «se usa el primer rango activo de tu cuenta» (banner) | `factus_rango_factura`, `factus_rango_nota_credito` (`int` nullable); opciones de `GET /facturacion/factus/numbering-ranges`, con formato `<documento> · <prefijo> <desde>–<hasta>` (`useSucursal.js:40-59`) |
| `N° secuencial Recibo:` | número | **todos** los países | 0 | `secuencia_abono` (`int`, BD por defecto 0): contador del recibo (comprobante de abono no electrónico) |

  Al guardar, el panel convierte todos los contadores (incluidos `secuencia_retencion_*`, que no tienen campo: en alta van en 0, en edición se reenvía el valor leído) a número; si alguno no es un número ≥ 0 avisa `Los valores numéricos deben ser mayores o iguales a 0` (warning) y no guarda (`useSucursal.js:61-82`). Siempre envía `company_id` de la sesión (l.89-97).
- **Reglas de negocio (backend)** (`sucursal.service.ts`):
  1. `POST /sucursal`: todos los contadores `secuencia_*` son obligatorios y numéricos en el DTO (`@IsNumber`), también los de pruebas y retención aunque la interfaz TS los marque opcionales (`create-sucursal.dto.ts:20-45`). Los errores de validación llegan en inglés (p. ej. `nombre must be longer than or equal to 3 characters`) y el panel los muestra como aviso amarillo, en lista si son varios (`useSucursal.js:103-105`, `useHelpers.js:69-92`). Un error `23505` se devuelve con el `detail` de la BD; cualquier otro, `Unexpected error, check server logs` (l.150-156).
  2. `GET /sucursal/:estado?`: sin `estado` filtra por la cabecera `company-id`; con `true` el `where` se reemplaza por `{ isActive: true }` y **se pierde el filtro de empresa** (l.46-62). Si el usuario tiene `sucursales` asignadas, solo ve esas.
  3. `PATCH /sucursal/:id` actualiza sin comprobar que exista (`findOne` devuelve un arreglo vacío); `PATCH /sucursal/:id/:estado` activa o inactiva **sin comprobar que quede otra activa** (l.91-117).
  4. `DELETE /sucursal/:id`: rechaza con 400 si tiene pagos, facturas, compras o productos: `No se puede eliminar la sucursal porque tiene N pago(s), N factura(s), N compra(s), N producto(s) asociado(s). Desactívela en lugar de eliminarla.` (solo cita las partes con cantidad > 0); si no, elimina y responde `Eliminado Exitosamente` (l.119-148).
  5. Toda alta, edición, cambio de estado o baja **invalida la caché de permisos** (`invalidatePermisosCache`) para que las listas de sucursales de los usuarios se refresquen (l.33, 96, 114, 145) (ACC-040).
  6. La sucursal que se usa en cobros sin operador (bot de WhatsApp, pasarelas) la decide `SucursalFacturacionService` (ACC-032); desactivar una sucursal no la quita de routers ni usuarios, pero deja de ser elegible.
- **Efectos secundarios externos:** ninguno directo (Factus solo para listar rangos de numeración).
- **Mensajes de error/éxito (texto exacto):** `Sucursal agregado exitosamente` · `Sucursal editado exitosamente` · `Actualizado Exitosamente` · `Registro eliminado exitosamente` · `No es posible borrar este registro, se encuentra en uso.` (si el error trae código `23503`, `useHelpers.js:61-62`) · `Los valores numéricos deben ser mayores o iguales a 0` · `Estas seguro de eliminar esta sucursal?` · `No se encontró ningun Resultado`.
- **Relaciones con otros módulos:** AJS-029 / ACC-030 (empresa), ACC-032 (sucursal de cobro), ACC-007 (sucursales asignadas a un usuario), caja y registro de pagos (la sucursal del cobro numera el comprobante), SRI/Factus, compras y productos (por sucursal), AJS-011 (rangos Factus).
- **Casos límite y advertencias:**
  - Una sucursal nueva nace con `Ambiente: PRUEBA` (solo en Ecuador con facturación electrónica activa): emite comprobantes de prueba hasta que se cambie a `PRODUCCION`.
  - Fuera de Ecuador el formulario solo muestra nombre, dirección y `N° secuencial Recibo:` (en Colombia, además los dos rangos).
  - Editar un contador cambia la numeración oficial: un valor menor repite números ya emitidos; no hay validación de que sea mayor al último usado.
  - El contador de pruebas y el de producción son independientes; cambiar el `Ambiente:` no copia el contador.
  - `PATCH /sucursal/:id/:estado` y `DELETE` no comprueban pertenencia a la empresa (instalación con una sola empresa).
- **Preguntas probables de usuarios:**
  1. "¿Para qué sirve la sucursal?" → numeración de los comprobantes y filtro de ventas, compras y productos.
  2. "No me deja eliminar la sucursal" → tiene pagos, facturas, compras o productos; desactívela.
  3. "Cambié el establecimiento y las facturas salen con el número anterior" → los contadores son de cada sucursal: revise `N° secuencial Factura:` y el `Ambiente:`.
  4. "No encuentro el botón para agregar sucursal en el celular" → en pantallas pequeñas el botón `+` no funciona (H-31); usar un equipo de escritorio.
  5. "¿Dónde configuro el número de recibo?" → `N° secuencial Recibo:` de la sucursal.
  6. "Mi factura salió con ambiente de pruebas" → `Ambiente:` en `PRUEBA`.
  7. "¿Cómo desactivo una sucursal?" → icono `close` en la fila; no pide confirmación.
  8. "En Colombia no veo establecimiento ni punto de emisión" → ahí se elige el rango de numeración de Factus.
- **Pendiente de validar en UI:** ❓ cómo reacciona el router al botón `+` móvil; ❓ qué pasa al desactivar la única sucursal activa (caja y cobros); ❓ etiquetas del formulario en instalaciones de Colombia y Perú; ❓ si `maxlength` limita realmente los campos numéricos.

---

## AJS-031 · API de ajustes (`/settings`): contrato, defaults y consumidores de cada clave

- **Ruta UI / name:** — (backend). Es la tabla `settings` que leen y guardan casi todas las pantallas de Ajustes (AJS-003…028), las plantillas (`MSG-*`), Monitoreo de red y Pasarelas. Las dos cargas del front son `GET /settings` desde `empresas/composables/useSetting.js` (`getSetting`, l.178-208) y desde `composables/useSettings.js` (`getSettings`, caché propia de 60 s).
- **Archivos:** BE: `settings/settings.controller.ts` (l.7-56) · `settings/settings.service.ts` (l.15-165) · `settings/entities/setting.entity.ts` (l.4-361) · `settings/dto/create-setting.dto.ts` (l.5-239) · `settings/dto/update-setting.dto.ts` (l.4) · `settings/settings.module.ts` · `main.ts` (`ValidationPipe`, l.40-49) · `app.module.ts` (`CacheModule`, l.102-108) · `instalaciones/defaults/notif-templates.ts`. FE: `pages/dashboard/empresas/composables/useSetting.js` (l.8-97 valores iniciales; l.178-215 carga y guardado) · `composables/useSettings.js` (l.1-39).
- **Para qué sirve:** guarda en **una sola fila** por instalación toda la configuración global del ISP (cortes, facturación, plantillas, OLTs, tickets, instalación, monitoreo, pasarelas, ubicaciones, tasa BCV). Este documento fija el contrato (qué acepta cada clave, su valor por defecto y quién la lee) para no tener que releerlo en cada pantalla.
- **Acceso:** `@Auth()` a nivel de clase = JWT válido más `UserRoleGuard`, que solo comprueba que exista usuario (`settings.controller.ts:7`, `auth/decorators/auth.decorator.ts`, `auth/guards/user-role/user-role.guard.ts`). **No hay permisos en el backend**: cualquier usuario autenticado puede leer y modificar todas las claves, y los permisos de Ajustes (AJS-032) solo ocultan pantallas ✅ (H-24).
- **Endpoints:**

| Método y ruta | Qué hace | Detalle |
|---|---|---|
| `GET /settings` | devuelve **un objeto**: la primera fila (`getOne()`, sin `ORDER BY`) con la empresa expandida en `company_id` | caché Redis `settings:findAll` (`settings.service.ts:60-71`); la empresa viaja completa (H-24) |
| `PATCH /settings/:id` | actualiza solo las claves que lleguen y estén en el DTO | si `:id` no es un UUID o no existe ⇒ 404 `category with <id> not found` (texto copiado de otro módulo, l.77-87); invalida la caché; responde `{ ok: true, msg: "Registro actualizado exitosamente" }`; si la BD falla ⇒ 400 `Fallo al actualizar` (l.89-108) |
| `POST /settings` | crea una fila con `CreateSettingDto`; si `notifInstalacionCliente` / `notifInstalacionTecnico` vienen vacíos las rellena con las plantillas semilla (`settings.service.ts:41-58`) | ningún flujo activo del front lo usa (H-26) |
| `GET /settings/ubicaciones` · `PUT /settings/ubicaciones` | leen y guardan `ubicaciones` (AJS-020); `PUT` reemplaza todo el árbol y responde `Ubicaciones guardadas` (l.114-164) | declaradas antes de `:id`, así que no chocan con él |
| `GET /settings/:id` | devuelve la fila si el UUID existe | el front no lo llama |
| `DELETE /settings/:id` | **no borra nada**: devuelve el texto `This action removes a #<id> setting` (l.110-112) | |

- **Reglas del contrato (backend):**
  1. `ValidationPipe` global con `whitelist: true` (se descartan en silencio las propiedades que el DTO no declara), `transform: true` y `enableImplicitConversion: true` (`main.ts:40-49`). El panel manda el formulario completo (`const { id, ...rest } = formSettings.value`, `useSetting.js:210-213`), así que `company_id`, `created_at`, `updated_at`, `waTemplates`, `ubicaciones` y `tasaBcv` viajan y **se ignoran** ✅.
  2. `UpdateSettingDto = PartialType(CreateSettingDto)`: en `PATCH` todo es opcional; en `POST` son obligatorios `facturar_suspendidos`, `enviarAvisoPago`, `sumarDiaGracias`, `notificarSuspendidos`, `facturarAbonos`, `diasCortes`, `cronNotificacion` y `tipoDireccion`.
  3. Las claves `json`/`jsonb` se guardan **completas**: un `PATCH` con `reiniciosSmartOLT` sustituye el objeto entero, no lo fusiona (`settingRepository.update(id, dto)`, l.96). Por eso cada pantalla debe reenviar el objeto completo.
  4. Tres claves **no se pueden editar por `PATCH`** (no están en el DTO) y tienen su propia ruta: `ubicaciones` (`PUT /settings/ubicaciones`), `tasaBcv` (`PUT /tasa-bcv`, `tasa-bcv.service.ts:46-90`) y `waTemplates` (endpoints de `cloud-api`, `cloud-api.service.ts:1243-1246`).
  5. Caché: `GET /settings` guarda el resultado con `cacheManager.set('settings:findAll', result)` sin TTL propio (`settings.service.ts:69`); `CacheModule.register({ store: redisStore, ttl: 0 })` (`app.module.ts:102-108`). Se invalida en `create`, `update`, `saveUbicaciones` y en `TasaBcvService` (`tasa-bcv.service.ts:52-54`); **no** en `cloud-api.service.ts:1246, 1388, 1790`, que guardan `waTemplates` con `settingRepository.save` ❓ (H-25).
  6. El front tiene además una caché propia de 60 s (`useSettings.js:4-17`) que usan `useAnularMotivo.js:16`, `DetalleTicket.vue:47` y `VisitaTicket.vue:43`; solo la invalida la pantalla de Tickets (`useConfigTicket.js:24-28`). El resto de pantallas de Ajustes no la invalidan: tras cambiar "Pedir motivo al anular…" la regla puede tardar hasta 60 s en verse en la misma pestaña (H-36).
- **Claves de `settings`** (columna "BD" = tipo y valor por defecto de la entidad; "Front" = valor inicial de `useSetting.js:8-97` cuando difiere; "DTO" = lo que valida `create-setting.dto.ts`; "Editor" = quién la guarda; "Lectores" = quién la usa, con cita). Orden por área:

| Clave (línea en `setting.entity.ts`) | BD | DTO | Editor | Lectores |
|---|---|---|---|---|
| `facturar_suspendidos` (13) | bool · `true` (front `false`) | `@IsNotEmpty @IsBoolean` (obligatorio en POST) | AJS-009 | BE `crear-facturas.service.ts:51-68` |
| `limiteFacturasImpagasSuspendidos` (16) | int · `1` | opcional · entero 1–12 (l.11-16) | AJS-009 · COB-027 | BE `crear-facturas.service.ts:57` (usos 249, 544, 595, 682) |
| `facturarAbonos` (19) | bool · `false` | `@IsNotEmpty @IsBoolean` (POST) | AJS-009 | BE `registrar-abono.service.ts:561, 611` · FE `ModalPago.vue:531`, `PayComponent.vue:562` |
| `anulacionPedirMotivo` (23) | bool · `true` | opcional · bool | AJS-009 | BE `pagos.service.ts:898, 973, 1085, 1298` · FE `useAnularMotivo.js:17` |
| `anulacionMotivoObligatorio` (27) | bool · `true` | opcional · bool | AJS-009 | BE `pagos.service.ts:899, 974, 1086, 1299` · FE `useAnularMotivo.js:18` |
| `pasarSaldoSiguienteAuto` (31) | bool · `false` | opcional · bool | AJS-009 | solo FE `ModalPago.vue:535`, `PayComponent.vue:566` (el BE no la hereda, `registrar-abono.service.ts:192-200`) |
| `moverDiaPagoAlCobrar` (43) · `moverDiaPagoPorCliente` (52) | bool · `false` | opcional · bool | AJS-009 · COB-028 | BE `pagos.service.ts:610, 719-767` · FE `PayComponent.vue:563`, `ModalPago.vue:532` |
| `gestionarFacturasRetirados` (57) | bool · `false` | opcional · bool | AJS-009 | solo FE `IndexFacturas.vue:206` |
| `restringirTipoPagoPorFecha` (60) | bool · `true` (no está en el front) | opcional · bool | AJS-009 | solo FE `FactAndNot.vue:179` |
| `baseCreacionFactura` (83) | varchar(20) · `'mes'` | opcional · `@IsIn(['mes','fecha_pago'])` | AJS-009 · AJS-010 | BE `crear-facturas.service.ts:180, 226`, `app-queue.processor.ts:199, 527` |
| `plantillaNotaPago` (312) | text · `null` (front `''`) | opcional · string | AJS-009 | solo FE `PayComponent.vue:574-576`, `ModalPago.vue:543-545` |
| `cantidadFacturasIgnorar` (86) | int · `0` | opcional · entero ≥ 0 | **ninguna** (el control se retiró, `RecordatorioPago.vue:317-318`) | BE `pagos.service.ts:116, 146`, `notificar-recortatorio-pago-queue.processor.ts:387` |
| `tipoDireccion` (267) | text · `'Dirección del servicio de internet'` | `@IsString` (obligatorio en POST) | **ninguna** | BE `pagos.service.ts:1441` (compara con `'Dirección tributaria'`) |
| `diasCortes` (106) | text[] · `[]` (front `[]`) | array de enteros 0–6 (`@Type(Number)`) | AJS-003 | BE `app.service.ts:294-345`, `app-queue.processor.ts:184, 267, 388`, `pagos.service.ts:119-150` |
| `horasPorDia` (138) | json · 7 días `"00:01"` (front `null`) | libre | AJS-004 | BE `app.service.ts:299, 309, 343, 360` |
| `configReintentos` (153) | json · `{"nReintento":4,"intervalo":60}` (front 1 y 10) | libre | AJS-005 | BE `app.service.ts:258-271, 310`, `app-queue.processor.ts:684, 773` |
| `aplicarCortes` (131) | json · `{"mikrotik":true,"smartOLT":false}` | libre | AJS-005 | BE `app-queue.processor.ts:213-219`, `customers.service.ts:2715-2733, 2947, 2955`; `mikrotik` no lo lee nadie (H-04) |
| `reiniciosSmartOLT` (163) | json · `{"isActive":false,"dias":0,"time":"00:00","date":null,"fechaActivacion":null}` | libre | AJS-013 (el proceso también escribe `date`, `lastResult`, `fechaActivacion`) | BE `smart-olt.service.ts:188-257`, `reinicio-smartolt-queue.processor.ts:238` |
| `reiniciosAdminOLT` (176) | json · `{…,"dias":"1 Día","modo":"vinculados"}` | libre | AJS-014 | BE `admin-olt.service.ts:581-638`, `reinicio-adminolt-queue.processor.ts:106` |
| `tr069PerfilDefault` (335) · `smartoltMgmtIpDefault` (341) · `smartoltOnuTypeDefault` (347) | text / jsonb / text · `null` | opcionales (`@IsString` en perfil y tipo; Mgmt IP libre) | AJS-015 | solo FE (`Tr069ConfigSection.vue`, `Authorize/IndexPage.vue:105`, `OnuView/IndexPage.vue:179`) |
| `enviarAvisoPago` (109) · `sumarDiaGracias` (112) | bool · `true` | `@IsNotEmpty @IsBoolean` (POST) | Plantillas › Recordatorio de pago (MSG-003) | BE `pagos.service.ts:115, 117, 1841`, `notificar-recortatorio-pago-queue.processor.ts:469` |
| `sumarMesesAtrasados` (125) | bool · `true` | opcional · bool | MSG-003 | BE `pagos.service.ts:118, 1752` |
| `cronNotificacion` (326) | text[] · `['06:15','06:15','06:15']` | `@IsArray` (POST) | MSG-003 | BE `pagos.service.ts:134, 1844` |
| `plantillaNotificacion` (209) | json · `{"antes":"","durante":"","despues":""}` | libre | MSG-003 | BE `pagos.service.ts:114, 1749, 1785` |
| `sendWelcomeMessage` (128) | json · `null` | libre | Plantillas › Mensaje de Bienvenida (MSG-004) | BE `customer-queue.processor.ts:69, 131, 356` |
| `plantillaMsgPagoRecibo` (270) · `plantillaMsgPagoReciboLibre` (282) · `asuntoCorreoPagoRecibido` (287) · `asuntoCorreoPagoReciboLibre` (290) | text · `null` | opcionales (la del servicio sin tipo; las demás `@IsString`) | Plantillas › Aviso de pagos recibidos (MSG-005) | BE `notificar-cobro-queue.processor.ts:78-88` |
| `adjuntarPdfPagoRecibido` (295) · `adjuntarPdfPagoReciboLibre` (298) | bool · `true` | opcional · bool | MSG-005 | BE `notificar-cobro-queue.processor.ts:100` |
| `plantillaPromesaPago` (277) | text · `null` | opcional · string | Plantillas › Promesa de pago (MSG-006) | BE `promesas-pago-notificacion.service.ts:73` |
| `configImpresion` (190) | json · objeto con `mostrarLogo`, `mostrarRazonSocial`, `mostrarTotalTexto`, `tipo_periodo_consumo: 'relativo'`, `piePagina`, `piePaginaRecibo`, `mostrarFechaSuspension`, `mostrarTipoServicio`, `anchoPapel: 43`, `margenIzq: 0`, `MargenDer: 0` | libre | Plantillas › Formato de impresión de pagos (MSG-007) | BE `PlantillaPDF.ts:90`, `PlantillaPagoServicioPDF.ts:218`, `formato-impresion.config.ts`, `pagos.service.ts`; el nombre `MargenDer` no coincide con `margenDer` (H-28) |
| `plantillaMsgContrato` (304) · `plantillaMsgDocumento` (301) | text · `null` | sin tipo | Aviso Contrato / Documento (MSG-009) | BE `contratos.service.ts:654, 685`, `contratos-archivos.service.ts:340, 347` |
| `plantillaMsgCargoRecurrente` (307) | text · `null` | sin tipo | Plantillas › Cargo Recurrente (MSG-012) | BE `servicios-recurrente-queue.processor.ts:70` |
| `notificarSuspendidos` (242) | text · `'Desactivado'` (front `''`) | `@IsNotEmpty` (POST) | **ninguna** | **ninguno** (grep en FE y BE) (H-27) |
| `checklistInstalacion` (220) | jsonb · `[]` | libre | AJS-024 | BE `instalaciones.service.ts:1088`; FE `EditInstalacion.vue:84`, `ChecklistInstalacion.vue:22` |
| `notifInstalacionCliente` (230) · `notifInstalacionTecnico` (233) | jsonb · `{}` (en altas se hidratan con las plantillas semilla) | libre | AJS-023 | BE `instalaciones.service.ts:190-191` (envío por cambio de estado, l.136-310), `customers.service.ts:757` |
| `plantillaTicketCliente` (236) · `plantillaTicketTecnico` (239) | text · `null` | opcional · string | AJS-025 · AJS-026 | BE `ticket.service.ts:240-500` |
| `firmaTicketModo` (253) | text · `'electronica'` | opcional · `@IsIn(['electronica','manuscrita'])` | AJS-027 | FE `useFirmaTicket.js:36`; el BE no la valida (H-21) |
| `ticketApoyoHabilitado` (261) · `ticketApoyoGestiona` (264) | bool · `false` | opcional · bool | AJS-028 | BE `ticket.service.ts:91` (`apoyosHabilitados`), `:141` (crear), `:799` (editar), `tickets-visitas.service.ts:55-63` |
| `mostrarMonitoreoDashboard` (65) | bool · `false` | opcional · bool | Gestión de Red › Monitoreo de red (`monitoreo-red/IndexPage.vue:111-122`) | solo FE `panel/IndexPage.vue:144` |
| `monitoreoNotificaciones` (76) | jsonb · `{"activo":false,"correos":[],"whatsapps":[],"retardoMin":5,"avisarRecuperacion":true}` | libre | Monitoreo de red (`ConfigNotificaciones.vue:90, 121`) | BE `monitoreo-dispositivos-notifier.service.ts:243` (lee con `ORDER BY created_at ASC LIMIT 1`) |
| `vigenciaEnlacePagoHoras` (100) | int · `72` | opcional · entero 1–168 | Pasarelas › PayPhone (MSG-029, `PayphoneConfig.vue:54, 69`) | BE `pasarelas-pago/cobros.service.ts:292` |
| `pasarelaPreferida` (103) | varchar(40) · `null` | opcional · `@IsString @MaxLength(40)` | Pasarelas de Pagos (MSG-028, `pasarelas-pago/IndexPage.vue:89, 102`) | BE `pasarelas-pago/disponibilidad.service.ts:124` |
| `ubicaciones` (315) | jsonb · `null` | **no está en el DTO** | AJS-020 (`PUT /settings/ubicaciones`) | BE `settings.service.ts:114-141`, `factus-customer.mapper.ts:117`; FE `GestionUbicaciones.vue:48`, `useCliente.js:475` |
| `waTemplates` (323) | jsonb · `{}` | **no está en el DTO** | control "WhatsApp Oficial" de las plantillas (MSG-014) vía `cloud-api` | BE `cloud-api.service.ts:994, 1243-1246, 1387`; el front no lo lee de `GET /settings` ❓ |
| `tasaBcv` (353) | jsonb · `null` | **no está en el DTO** | AJS-012 · AJS-034 (`PUT /tasa-bcv`) | BE `tasa-bcv.service.ts:46-90, 203`, `notificar-recortatorio-pago-queue.processor.ts:359-370, 437-446` |

- **Efectos secundarios externos:** ninguno directo; los consumidores sí tocan MikroTik, SmartOLT/AdminOLT, WhatsApp, correo, Redis/Bull y cron (cada pantalla lo documenta). Guardar Facturación o Cortes además vuelve a llamar a `PUT /programar-queue/cortesServicios` (AJS-003, AJS-008).
- **Mensajes (texto exacto):** `Registro actualizado exitosamente` · `Fallo al actualizar` · `category with <id> not found` · `Settings no encontrado` (`PUT /settings/ubicaciones` sin fila, l.149) · mensajes de validación del DTO: `El límite de facturas sin pagar debe ser un número entero.` / `…debe ser al menos 1.` / `…no puede superar 12.` · `La cantidad de facturas a ignorar debe ser un número entero.` / `…no puede ser negativa.` · `La vigencia del enlace de pago debe ser un número entero de horas.` / `…debe ser de al menos 1 hora.` / `…no puede superar 168 horas (7 días).` (`create-setting.dto.ts:11-16, 197-214`).
- **Casos límite y advertencias:** (a) si hay más de una fila, `GET /settings`, `saveUbicaciones` y `TasaBcv` toman "la primera" sin orden definido y el notificador de monitoreo toma la más antigua (H-26); (b) cualquier pantalla que envíe `formSettings` completo pisa los cambios hechos por otro administrador desde otra pantalla (H-08); (c) un valor de `diasCortes` fuera de 0–6 se rechaza con 400 con el mensaje en inglés de `class-validator` ❓; (d) los valores iniciales del front difieren de los de la BD, entre otros, en `facturar_suspendidos`, `configReintentos`, `horasPorDia`, `reiniciosSmartOLT` y `notificarSuspendidos`: solo importan hasta que `GET /settings` responde (`getSetting` fusiona con `...data`, `useSetting.js:184-207`).
- **Preguntas probables de usuarios:** 1. "¿Cambié un ajuste y no se aplicó?" → revisar que el aviso `Actualización exitosa` haya salido; la regla de anulación puede tardar hasta 60 s en la pestaña abierta. 2. "¿Dónde se guarda cada opción?" → esta tabla (clave → pantalla). 3. "¿Por qué dos administradores se pisan los cambios?" → cada guardado envía todo el formulario (H-08). 4. "¿Puedo restaurar los valores de fábrica?" → no hay botón; solo editar cada opción (los defaults de la tabla son los de una instalación nueva). 5. "¿Quién puede cambiar los ajustes por API?" → cualquier usuario con sesión (H-24).
- **Pendiente de validar en UI:** ❓ cómo se crea la fila inicial de `settings` en una instalación nueva (el único alta en el código es `POST /settings`, que el front no usa); ❓ la caducidad real de `settings:findAll` en Redis con `ttl: 0`; ❓ si `diasCortes` fuera de rango llega a mostrarse como error en pantalla; ❓ si alguna instalación tiene más de una fila en `settings`.

---

## AJS-032 · Catálogo de permisos de Ajustes (clave → qué abre)

> El mapa clave → archivo:línea de **todo** el catálogo está en ACC-005 (`acc.md`, «Grupo Ajustes»). Aquí se resume qué abre o esconde cada clave dentro de Ajustes y dónde el código no coincide con el catálogo. Releído contra el código del 2026-10-14.

- **Ruta UI / name:** Menú lateral → Ajustes → **Roles y Permisos** (`/roles-permisos` · `index.rol`) o ficha de **Gestión Personal** → acordeón **"Ajustes"** (ícono `settings`) del selector de permisos (`FE:pages/dashboard/usuarios/components/ListPermisos.vue:591-692`) ✅.
- **Archivos:** FE: `pages/dashboard/usuarios/permisos/gestion-variables-permisos.json` (l.1-351) · `pages/dashboard/usuarios/components/ListPermisos.vue` · `composables/useRolPermisos.js` · `router/auth-guard.ts` · `layouts/SideBarMenu.vue` · `pages/dashboard/ajustes/IndexPage.vue` · `pages/dashboard/ajustes/plantillas/IndexPage.vue`. BE: ninguno (el backend **no** valida estas claves, AJS-031).
- **Para qué sirve:** lista de interruptores con los que se concede a un rol o a un usuario el acceso a cada pantalla y botón de Ajustes. La clave elegida decide qué tarjeta del panel, qué pestaña y qué botón aparece.
- **Cómo se evalúa una clave:** `validarPermisos('clave')` es verdadero si el primer rol del JWT es `SUPER-ADMINISTRADOR` o si la lista de permisos descifrada del usuario contiene la clave (varias claves separadas por coma = alguna); `tieneAlguno([...])` aplica lo mismo a un arreglo; cualquier error al descifrar devuelve `false` (`useRolPermisos.js:7-47`). El guard de rutas exige por defecto una clave **igual al nombre de la ruta** y solo añade excepciones para las rutas de `ajustes.index`, `ajuste.servicio`, `ajuste.smartolt`, `ajuste.logs`, `ajuste.mensajeria`, `ajuste.base-datos` y `ajuste.facturacion` (`auth-guard.ts:37-133`).
- **Forma del catálogo ✅:** 77 valores = **56 claves "hoja"** (permisos reales) + 21 nodos de agrupación: Servicios 6 · Plantillas 17 (más el maestro `ajuste.plantillas`) · Mensajeria 2 · Logs 1 · SmartOLT 2 · Roles Y Permisos 4 · Gestión personal 5 · Configurar empresa 7 (Empresa 2 + Sucursales 5; más el maestro `ajuste.empresa`) · Base de datos 2 · Configurar formas pago 10 (Formas de pago 5 + Detalles 5; más el maestro `ajuste.forma-pago`). Solo `ajuste.plantillas`, `ajuste.empresa` y `ajuste.forma-pago` tienen interruptor propio; mientras estén apagados, sus hijos aparecen deshabilitados (`ListPermisos.vue:24-37, 637-661`). `Seleccionar todos` y el contador `Activos X/77` incluyen los nodos de agrupación (`obtenerTodosLosPermisos`, l.81-98; `contarPermisos`, l.124-135).
- **Qué abre cada clave** (etiqueta del árbol → efecto):

| Grupo | Clave · etiqueta | Qué abre o esconde |
|---|---|---|
| Servicios | `variables.dias-habilitados` · Días habilitados | tarjeta "Días habilitados para cortes" (`ajustes/servicios/IndexPage.vue:78`); cuenta para el ítem "Ajustes", la tarjeta "Configuración de Cortes" y el guard (AJS-003) |
| | `variables.facturacion` · Facturación | tarjeta "Facturación" (`ajustes/IndexPage.vue:141`) y pantalla `/ajustes/facturacion` (`auth-guard.ts:87`) (AJS-009) |
| | `variables.horario.cortes` · Horario de corte | tarjeta "Horarios de cortes" (`servicios/IndexPage.vue:156`) (AJS-004) |
| | `variables.reintentos.mikrotik` · Configuración de reintentos automáticos | tarjeta de reintentos y su botón de guardado propio, oculto en esta vista (`servicios/IndexPage.vue:161`, `ConfigurarReintentosCortes.vue:185`) (AJS-005) |
| | `variables.aplicar-cortes` · Aplicar cortes manualmente | botón "Activar" de "Aplicar cortes manualmente" (`ConfigurarReintentosCortes.vue:200`) (AJS-006) |
| | `variables.opciones-logs` · Historial del proceso de cortes | **ningún efecto**: ningún archivo la consulta (H-19) |
| Plantillas | `ajuste.plantillas` · Plantillas (maestro) | ruta `ajuste.plantillas` (el guard usa el nombre de la ruta, `auth-guard.ts:115-118` comentado), ítem "Ajustes" del menú y tarjetas "Plantillas" y "Firma de Contratos" (`ajustes/IndexPage.vue:231, 481`); habilita a sus hijos |
| | `variables.ver.recordatorio.pago` / `variables.edita.recordatorio.pago` | pestaña "Recordatorio de pago" / botones de guardado y ejecución (`plantillas/IndexPage.vue:22`, `RecordatorioPago.vue:299, 586`) |
| | `variables.ver.mensaje.bienvenida` / `variables.edita.mensaje.bienvenida` | pestaña "Mensaje de Bienvenida" / guardar (`MensajeBienvenida.vue:170`) |
| | `variables.ver.pago.recibido` / `variables.edita.pago.recibido` | pestaña "Aviso de pagos recibidos" / guardar (`AvisoPagoRecibido.vue:219`) |
| | `variables.ver.promesa.pago` / `variables.edita.promesa.pago` | pestaña "Promesa de pago" / guardar (`PromesaPago.vue:147`); **no** cuenta para la tarjeta "Plantillas" del panel (H-22) |
| | `variables.ver.plantilla.impresion.pagos` / `variables.edita.plantilla.impresion.pagos` | pestaña "Formato de impresion de pagos" / guardar (`ImpresionPagos.vue:1180`) |
| | `variables.ver.plantilla.ticket` / `variables.edita.plantilla.ticket` | pestaña "Tickets" (plantillas de mensaje, firma, técnicos de apoyo) / guardar las dos plantillas de mensaje (`PlantillaMsgCliente.vue:113`, `PlantillaMsgTecnico.vue:116`); la firma y los técnicos de apoyo no tienen permiso de edición propio (AJS-027/028) |
| | `variables.ver.plantilla.mensaje.contrato` / `variables.edita.plantilla.mensaje.contrato` | pestaña "Aviso Contrato" y su tarjeta "Firma de Contratos" / guardar los dos avisos (`AvisoContrato.vue:121`, `AvisoDocumento.vue:121`) |
| | `variables.ver.plantilla.documentos.contrato` · `…agrega…` · `…edita…` | pestañas "Plantilla Documento" **y** "Formato de Ticket"; agregar plantilla (`PlantillaDocumento.vue:125`); editar ambas (`PlantillaDocumento.vue:102`, `PlantillaTicket.vue:33`) |
| Mensajeria | `variables.vincular.whatsApp` · Vincular whatsApp | tarjeta WhatsApp (`mensajeria/IndexPage.vue:157`) |
| | `variables.config.servidor.correo` · Configurar servidor de correro (sic) | tarjeta "Datos del servidor correo" (`mensajeria/IndexPage.vue:281`) |
| Logs | `ver.logs` · Ver Logs | tarjeta "Logs", ruta `/ajustes/logs` y panel (`logs/IndexPage.vue:28`, `auth-guard.ts:68, 110-113`); **no** cuenta para el ítem "Ajustes" del menú (H-01) |
| SmartOLT | `variables.reintentos.smartOLT` · Configuración de reinicio automático de ONUs | tarjeta "OLTs" y los dos cronogramas de reinicio (`smartOLT/IndexPage.vue:291, 562`) (AJS-013/014) |
| | `variables.opciones-cortes` · Opciones de corte | tarjeta "OLTs" y las casillas "Aplicar Cortes/Activación" (`ConfigurarReintentosCortes.vue:161`) (AJS-005) |
| Roles Y Permisos | `index.rol` · `crear.rol` · `editar.rol` · `eliminar.rol` | tarjeta "Roles y Permisos" (`ajustes/IndexPage.vue:308`) y botones de `roles-permisos/IndexPage.vue:96, 130, 140, 166` (ACC-004) |
| Gestión personal | `index.usuario` · `crear.usuario` · `editar.usuario` · `eliminar.usuario` | tarjeta "Gestión Personal" (`ajustes/IndexPage.vue:285`) y botones de `usuarios/IndexPage.vue:152, 235, 256, 296` (ACC-006/007) |
| | `activar.inactivar.usuario` · Activar/Inactivar | **ningún efecto**: el listado no tiene ese botón (H-33) |
| Configurar empresa | `ajuste.empresa` · Configurar empresa (maestro) | ruta `ajuste.empresa`, ítem "Ajustes" del menú y tarjeta "Empresa" (`ajustes/IndexPage.vue:336`); habilita a sus hijos |
| | `index.empresa` · Ver / `editar.empresa` · Editar Empresa | pestaña "Empresa" y ruta `/empresa/edit/:empresa_id` / botón **Guardar Cambios** (AJS-029) |
| | `index.sucursal` · `crear.sucursal` · `editar.sucursal` · `activar.inactivar.sucursal` · `eliminar.sucursal` | pestaña "Sucursales" y sus botones (AJS-030) |
| Base de datos | `base-datos.campos` · Campos personalizados / `base-datos.cambios-masivos` · Cambios masivos | pestañas homónimas (más la tarjeta "Eliminar datos" y la pestaña "Ubicaciones" dentro de ellas) y tarjeta "Base de datos" (`base-datos/IndexPage.vue:34-58`) (AJS-017…020) |
| Configurar formas pago | `ajuste.forma-pago` (maestro) · `index.forma-pago` · `crear.` · `editar.` · `activar.inactivar.` · `eliminar.forma-pago` · y las cinco de `…detalle-forma-pago` | tarjetas "Formas de pagos" y "Pasarelas de Pagos" (`ajustes/IndexPage.vue:417, 449`), pestañas y botones de `formas-pago/IndexPage.vue` y `detalle-formas-pago/IndexPage.vue` (MSG-032/033) |

- **Pantallas que no tienen clave propia:** "Sistema" (`ajuste.sistema`: solo si `claim.email == 'info@rednuevaconexion.net'`, AJS-022), "Licencia" (solo si `licenciaInfo.vinculado`, AJS-002), "Pasarelas de Pagos" y "Firma de Contratos" (la tarjeta reutiliza las claves de formas de pago y de plantillas; la **ruta** exige una clave con el nombre de la ruta que no existe en el catálogo, H-03), "Configuración personalizada por router" (AJS-007), "Ubicaciones" (AJS-020), "Validación de ONUs" (AJS-016), "Perfil TR-069 / Tipo de ONU / Mgmt IP" (AJS-015).
- **Claves que el código consulta y NO están en el catálogo** (no se pueden conceder desde la interfaz; solo las cumple el `SUPER-ADMINISTRADOR`) ✅: `variables.ver.cargo.recurrente` y `variables.edita.cargo.recurrente` (`plantillas/IndexPage.vue:61, 215, 297`; `AvisoCargoRecurrente.vue:125`), `variables.ver.plantilla.instalacion` (`plantillas/IndexPage.vue:65, 220, 304`) y `variables.ver.plantilla.mensaje.documento` (`plantillas/IndexPage.vue:50, 200, 276`). Efecto: las pestañas "Cargo Recurrente" e "Instalación" de Plantillas solo existen para el SUPER-ADMINISTRADOR (H-22).
- **Claves del catálogo sin efecto** ✅: `variables.opciones-logs` y `activar.inactivar.usuario` (búsqueda literal en el FE; H-19, H-33).
- **Desajustes entre menú, tarjetas y guard** ✅: ver H-01, H-02, H-03 y H-22.
- **Preguntas probables de usuarios:** 1. "Le di a un rol 'Ver Logs' y no ve Ajustes en el menú" → el ítem no cuenta `ver.logs`; entrar por `/#/ajustes/logs` (H-01). 2. "Activé 'Plantillas' pero no veo 'Instalación'" → su clave no está en el catálogo (H-22). 3. "Un rol con 'Configurar formas pago' ve Pasarelas de Pagos y le devuelve al inicio" → H-03. 4. "Marqué 'Editar' y no veo el botón Guardar" → falta el `variables.edita.*` de esa plantilla. 5. "¿Por qué no puedo dar permiso de 'Cargo Recurrente'?" → no existe en el catálogo. 6. "El SUPER-ADMINISTRADOR no puede quitarse permisos" → todos van marcados y bloqueados.
- **Pendiente de validar en UI:** ❓ cómo se ve el árbol con los hijos de los maestros deshabilitados (el componente pone `disabled` en los nodos y cada interruptor tiene su propio `:disable`); ❓ si algún despliegue agrega las 4 claves faltantes a mano en `roles-and-permisos`; ❓ si el contador `Activos X/77` confunde por incluir nodos de agrupación.

---

## AJS-033 · Pasarelas de pago · pestaña "Pago Internet"

- **Ruta UI / name:** `/ajustes/pasarelas-pago` (`ajuste.pasarelas-pago`) → pestaña **Pago Internet** (icono wifi), siempre la última; solo aparece si el catálogo del servicio de pagos respondió (`IndexPage.vue`: pestaña dentro de `q-card v-else-if="catalogo.length"`).
- **Archivos:** FE: `ajustes/pasarelas-pago/IndexPage.vue` (`TAB_PAGO_INTERNET`), `components/PagoInternetConfig.vue` · BE: **ninguno** (`git grep` de "pagointernet" en `backend-isp` no devuelve nada).
- **Para qué sirve:** dar al ISP los dos datos que pide la afiliación en pagointernet.ec: **URL del sistema** (`window.location.origin`, solo lectura, con botón copiar) y **API key** (`import.meta.env.VITE_PAGO_INTERNET_API_KEY` del `.env` del front, oculta con ojo y botón copiar; si falta: placeholder "Sin configurar" y hint "No hay API key configurada: definir VITE_PAGO_INTERNET_API_KEY en el .env del front y reiniciarlo.").
- **Elementos:** chip "Ecuador · Latinoamérica"; botón **Ir a Pago Internet** (tooltip "Desde ahí se hace la afiliación"); lista "Cómo afiliarte" con 3 pasos (Entrar a Pago Internet — «Afiliarme ahora» · Copiar estos dos datos · Terminar la afiliación).
- **Reglas:** no es una pasarela del servicio de pagos: no guarda nada, no aparece en el catálogo, no muestra "Lista para cobrar" y no entra en "Cobrar con".
- **Mensajes (texto exacto):** "URL copiada" / "API key copiada" / "No se pudo copiar".
- **Pendiente de validar en UI:** ❓ cómo llegan a ISPMAX los pagos de Pago Internet una vez afiliado (el código del panel solo muestra los datos; el registro del pago lo haría la plataforma externa con la API key).

---

## AJS-034 · Facturación · Tasa BCV: "Recordatorio de pago: enviar el valor del plan"

- **Ruta UI / name:** `/ajustes/facturacion` → Tasa BCV (solo `VITE_PAIS=VE`), tercer interruptor del card de opciones.
- **Archivos:** FE: `facturacion/components/TasaBcvConfig.vue:7,21,125-137` · BE: `tasa-bcv/dto/tasa-bcv.dto.ts` (`recordatorioValorPlan?: boolean`), `tasa-bcv.service.ts:60,81` (se guarda dentro del jsonb `tasaBcv`), `pagos/notificar-recortatorio-pago-queue.processor.ts:359-370, 437-446` (consumo).
- **Texto exacto:** "Recordatorio de pago: enviar el valor del plan" — "Marcado, {total} muestra el precio del plan tal cual (USD, sin tasa). Sin marcar, muestra el valor de la factura en bolívares."
- **Regla** ✅: con `process.env.PAIS = 'VE'` y la opción activa, `deuda` (variable `{total}` del recordatorio) = `perfil_internet.precio_plan` si es > 0; si no, el cálculo normal (suma de meses atrasados o factura más antigua). El `PUT /tasa-bcv` conserva el valor previo si el body no lo trae.
- **Pendiente de validar en UI:** ❓ texto del recordatorio con el valor del plan en una instancia con `PAIS=VE`.

---

## Hallazgos del dominio

Las referencias `H-nn` de las secciones anteriores apuntan a esta tabla. ✅ = leído en código (2026-10-14); ❓ = deducido del código, sin ejecutar. Los de **Seguridad** solo se registran en `notes/` (el manual no los publica). Los hallazgos de ACC (`H-1`…`H-18` en `acc.md`) llevan otra numeración.

| # | Tipo | Hallazgo | Dónde | Estado |
|---|---|---|---|---|
| H-01 | Permisos | El ítem "Ajustes" del menú aparece con `ajuste.empresa`, `ajuste.forma-pago` o `ajuste.plantillas`, pero el guard de `ajustes.index` solo cuenta 18 claves (cortes, plantillas, mensajería, base de datos). Con solo esas tres, `ver.logs`, `index.usuario` o `index.rol` el clic rebota al primer permiso `index` del usuario (o a `/login`) | `FE:layouts/SideBarMenu.vue:421-434`, `router/auth-guard.ts:37-77, 95-99, 143-156` | ✅ |
| H-02 | Permisos | El guard de `ajuste.servicio` acepta 7 claves (incluye `variables.facturacion`, `variables.reintentos.smartOLT`, `variables.opciones-cortes`) pero la tarjeta "Configuración de Cortes" se dibuja solo con 4: se puede abrir la pantalla por URL sin ver la tarjeta | `auth-guard.ts:37-45, 100-103`, `ajustes/IndexPage.vue:111-118` | ✅ |
| H-03 | Permisos | Las tarjetas "Pasarelas de Pagos" y "Firma de Contratos" se muestran con claves de formas de pago y de plantillas, pero sus rutas (`ajuste.pasarelas-pago`, `ajuste.firma-electronica`) exigen una clave con el nombre de la ruta que no existe en el catálogo ni en `permisoPorRuta`: solo el `SUPER-ADMINISTRADOR` entra; el resto vuelve a su primer `index` | `auth-guard.ts:81-89, 130-156`, `ajustes/IndexPage.vue:444-455, 476-487`, `router/routes.ts:393-403` | ✅ |
| H-04 | Código muerto | La casilla "Mikrotik" de "Aplicar Cortes/Activación" (`aplicarCortes.mikrotik`) se guarda pero ningún código del backend la lee; solo `smartOLT` y `adminOLT` | `BE:app-queue.processor.ts:213-219`, `customers/customers.service.ts:2715-2733, 2947, 2955` | ✅ |
| H-05 | UX | La vista por router no ofrece copiar la configuración de cortes a otro router ni aplicar manualmente los cortes de un solo router | `FE:pages/dashboard/ajustes/servicios/` (sin coincidencias de "copiar") | ✅ |
| H-06 | UX | El dominio y la API key de SmartOLT / AdminOLT no se cargan en Ajustes › OLTs sino en Gestión de Red | `FE:pages/dashboard/Gestion-Red/smartOLT/IndexPage.vue`, `Gestion-Red/adminOLT/components/Api/FormApi.vue` | ✅ |
| H-07 | Negocio | La creación anticipada de facturas solo corre dentro del trabajo de cortes del router: sin días habilitados no se ejecuta sola; el único modo manual es "Generar facturas pendientes" | `BE:app-queue.processor.ts:195-205` | ✅ |
| H-08 | Datos | El botón **Guardar** de Cortes, Facturación, Plantillas, Contratos e Instalación envía **todo** `formSettings`: si otro administrador cambió otra opción desde otra pantalla, se pisa con el valor viejo cargado (Tickets, Pasarelas, Monitoreo y las pantallas de OLTs envían solo sus claves) | `FE:empresas/composables/useSetting.js:210-215`, `ajustes/instalacion/NotificacionesEstadoConfig.vue:121-132`, `ajustes/plantillas/components/*.vue` | ✅ |
| H-09 | Robustez | En el corte masivo el aviso a Slack se envía **antes** de empujar los routers; si `URL_SLACK` falta o falla, el trabajo termina con error, los servicios ya quedaron suspendidos en BD y no se aplica nada en MikroTik | `BE:app-queue.processor.ts:603-623` | ✅ |
| H-10 | Robustez | El reinicio automático de ONUs de SmartOLT se reprograma al arrancar el backend (`onModuleInit`); el de AdminOLT no | `BE:smart-olt/smart-olt.service.ts:173`, `admin-olt/admin-olt.service.ts` (sin `onModuleInit`) | ✅ |
| H-11 | Datos | El reinicio SmartOLT en modo "vinculados" toma **todos** los servicios con `sn` (sin filtrar retirados ni plataforma); la validación "vs SmartOLT" trata como inválidas las ONUs de servicios AdminOLT | `BE:smart-olt/reinicio-smartolt-queue.processor.ts:132-137`, `smart-olt.service.ts:1822-1935` | ✅ |
| H-12 | Seguridad | `GET /facturacion/factus/config` devuelve `client_secret` y `password` de Factus (solo omite los tokens) a cualquier usuario autenticado | `BE:facturacion/factus/factus-config.service.ts:31-35`, `factus.controller.ts:30-33` | ✅ |
| H-13 | Datos | Cambios masivos: el día de pago se escribe con `MAKE_DATE(año, mes, día)` sin acotar al último día del mes; un día 31 en un mes de 30 da error y deshace la transacción. El comentario del front dice que el backend lo topa | `BE:database/database.service.ts:143-153`, `FE:ajustes/base-datos/components/CambiosMasivos.vue:49-51` | ✅ |
| H-14 | Negocio | Un token de suscripción inactivo o expirado se trata como "sin suscripción": desaparece la tarjeta "Licencia" y no se bloquea el alta de clientes | `BE:companies/master-suscripcion.service.ts:54-58` | ✅ |
| H-15 | Seguridad | El nombre del campo personalizado se interpola en el SQL del filtro del listado de clientes, y `GET /customers/ubicacion-en-uso` interpola `tipo` (sin lista blanca) en la consulta | `BE:customers/customers.service.ts:1262-1272, 3224-3234`, `customers.controller.ts:90-99` | ✅ |
| H-16 | UX | Cambios masivos ofrece "Aplicar Corte" solo con "N Mes(es) Vencido(s)" y "Desactivado"; el formulario del cliente también ofrece "N Mes(es) Desde Último Pago" | `FE:ajustes/base-datos/components/CambiosMasivos.vue:60`, `clientes/components/FactAndNot.vue:171` | ✅ |
| H-17 | Seguridad | `PATCH /database/cambios-masivos/facturacion` recibe un objeto sin DTO ni lista blanca: cualquier columna de `factura-clientes` puede actualizarse por API | `BE:database/database.controller.ts:20-27`, `database.service.ts:97-135` | ✅ |
| H-18 | Seguridad | `/logs`: `GET`, `POST` y `DELETE` solo piden JWT; el botón de eliminar se oculta en el front por un e-mail fijo, pero la API lo permite a cualquiera | `BE:logs/logs.controller.ts:7-55`, `FE:ajustes/servicios/components/LogsGenerales.vue:576` | ✅ |
| H-19 | Código muerto | `LogsCortes.vue` ("Historial del proceso de cortes") existe pero ningún archivo lo importa, y la clave `variables.opciones-logs` del catálogo no se consulta en ningún lado | `FE:ajustes/servicios/components/LogsCortes.vue`, `usuarios/permisos/gestion-variables-permisos.json:28` | ✅ |
| H-20 | Seguridad | `POST /api/deploy` y `GET /api/deploy/log` usan `ServiceTokenGuard`, que acepta cualquier JWT válido (no solo el token de servicio) | `BE:deploy/deploy.controller.ts:33-34, 64-65`, `deploy/service-token.guard.ts:13-30` | ✅ |
| H-21 | Negocio | `firmaTicketModo` lo lee solo el front; el backend no impide usar el flujo electrónico o el manuscrito aunque el ajuste elija el otro | `BE:ticket/firma/tickets-firma.controller.ts:84-95` (solo un comentario), `FE:tickets/composables/useFirmaTicket.js:34-40` | ✅ |
| H-22 | Permisos | `variables.ver.cargo.recurrente`, `variables.edita.cargo.recurrente`, `variables.ver.plantilla.instalacion` y `variables.ver.plantilla.mensaje.documento` se consultan en Plantillas pero **no están en el catálogo**; solo el `SUPER-ADMINISTRADOR` ve las pestañas "Cargo Recurrente" e "Instalación". La tarjeta "Plantillas" del panel y el guard tampoco cuentan `variables.ver.promesa.pago` ni esas claves | `FE:ajustes/plantillas/IndexPage.vue:46-66, 98-109`, `ajustes/IndexPage.vue:221-231`, `auth-guard.ts:47-55` | ✅ |
| H-23 | Negocio | La obligatoriedad de los ítems del checklist de instalación se valida solo en el front; el backend guarda `checklist_completado` sin comprobar nada | `FE:instalaciones/EditInstalacion.vue:76-99`, `BE:instalaciones/dto/create-instalacione.dto.ts:59-62` | ✅ |
| H-24 | Seguridad | `GET /settings` devuelve la fila con la **empresa completa** (`leftJoinAndSelect('setting.company_id')`): incluye `clave_certificado`, `wa_cloud_access_token` y `wa_webhook_verify_token`, a cualquier usuario autenticado | `BE:settings/settings.service.ts:64-67`, `companies/entities/company.entity.ts:64-71, 112-113` | ✅ |
| H-25 | Datos | La caché `settings:findAll` no tiene TTL propio y `cloud-api.service.ts` guarda `waTemplates` con `settingRepository.save` sin invalidarla: quien lea `waTemplates` por `GET /settings` vería datos viejos hasta el siguiente cambio (el front actual no lo lee de ahí) | `BE:settings/settings.service.ts:60-75`, `cloud-api/cloud-api.service.ts:1243-1246, 1387, 1789`, `app.module.ts:102-108` | ❓ |
| H-26 | Código muerto | El alta de empresa de `useSetting.js` (`updateSetting`) no la usa nadie: llama a `validarFormulario` (que `useEmpresa` no exporta), hace `POST /settings/:id` (ruta inexistente) y navega a `Ver Empresas` (ruta inexistente). Por tanto, `POST /settings` no tiene llamador activo y la fila inicial de `settings` debe venir de la instalación. Además nada impide crear una segunda fila y los lectores toman "la primera" sin orden | `FE:empresas/composables/useSetting.js:107-144`, `BE:settings/settings.controller.ts:12-15`, `monitoreo-dispositivos/monitoreo-dispositivos-notifier.service.ts:243` | ✅ / ❓ la fila inicial |
| H-27 | Código muerto | Claves sin pantalla o sin lectores: `notificarSuspendidos` (obligatoria en `POST`, no la lee nadie), `tipoDireccion` (sin pantalla; solo `pagos.service.ts:1441`), `cantidadFacturasIgnorar` (control retirado de la interfaz). `DELETE /settings/:id` no borra nada y `GET /settings/:id` no se usa | `BE:settings/entities/setting.entity.ts:86, 242, 267`, `settings.service.ts:110-112`, `FE:ajustes/plantillas/components/RecordatorioPago.vue:317-318` | ✅ |
| H-28 | Rareza | El valor por defecto de `configImpresion` en la BD usa la clave `MargenDer` (mayúscula) y quienes la leen usan `margenDer`: mientras nadie guarde el formato, `+undefined` da `padding-right: NaNmm` | `BE:settings/entities/setting.entity.ts:204`, `migrations/1774389749599-AgregadoTablaCambiosMasivos.ts:139`, `pagos/PlantillaPDF.ts:90`, `PlantillaPagoServicioPDF.ts:218` | ✅ |
| H-29 | UX | Ficha de Empresa: la validación no bloquea el guardado (`await !validarCampos`), `Debes adjuntar el certificado` es inalcanzable, `validarImagen` no tiene `onerror` (con una imagen inválida el botón no responde), `loading` nunca se activa, los errores del servidor solo van a la consola y `validateNumRuc` / `validateNumCelular` no se usan | `FE:empresas/composables/useEmpresa.js:48, 70-71, 115-131, 186-209, 254-256` | ✅ |
| H-30 | Datos | Una empresa sin logo o sin certificado guarda el **texto `null`** en `logo` / `archivo_certificado` (`FormData.append(…, null)` ⇒ `"null"`), y `estadoCertificado` lo cuenta como certificado cargado; el selector mostraría `null` y la vista previa pediría `/api/images/null` | `FE:useEmpresa.js:229-236`, `BE:companies/companies.service.ts:118-119, 233-241` | ✅ código · ❓ efecto en pantalla |
| H-31 | UX | El botón flotante `+` de Sucursales en móvil navega a `crear.sucursal`, ruta que no existe: desde el celular no se puede crear una sucursal | `FE:sucursales/IndexPage.vue:297-309`, `router/routes.ts` (sin esa ruta) | ✅ |
| H-32 | Datos | `GET /sucursal/true` sustituye todo el `where` por `{ isActive: true }`: pierde el filtro de empresa (y `PATCH`/`DELETE` no comprueban pertenencia) | `BE:sucursal/sucursal.service.ts:46-62, 91-148` | ✅ (sin efecto con una sola empresa) |
| H-33 | Permisos | La clave `activar.inactivar.usuario` del catálogo no tiene efecto: el listado de usuarios no tiene botón activar/inactivar | `FE:usuarios/IndexPage.vue:235-260` (solo `editar.usuario` y `eliminar.usuario`), `gestion-variables-permisos.json` | ✅ |
| H-34 | Rareza | La ruta `ajuste.plantillas` está registrada dos veces con el mismo componente | `FE:router/routes.ts:417-418, 447-448` | ✅ (sin efecto visible) |
| H-35 | Seguridad | `DELETE /companies/:id` y `PATCH /companies/:id/:estado` solo piden JWT y no tienen pantalla; `remove` ignora el `:id`, borra **la primera empresa** y sus archivos, y las tablas de usuarios, clientes, routers, `settings`, sucursales, formas de pago y correos declaran `ON DELETE CASCADE` hacia `companies` | `BE:companies/companies.controller.ts:113-126`, `companies.service.ts:252-272`, `auth/entities/user.entity.ts:41`, `customers/entities/customer.entity.ts:32`, `router/entities/router.entity.ts:22`, `settings/entities/setting.entity.ts:9`, `sucursal/entities/sucursal.entity.ts:16` | ✅ código · ❓ efecto real en BD (no ejecutado) |
| H-36 | UX | El front guarda en memoria 60 s el resultado de `GET /settings` (`useSettings.js`) y solo la pantalla de Tickets lo invalida; tras cambiar "Pedir motivo al anular…" la regla puede tardar hasta 60 s en verse en la pestaña abierta (el backend ya aplica la nueva) | `FE:composables/useSettings.js:4-17`, `useAnularMotivo.js:16`, `ajustes/ticket/composables/useConfigTicket.js:24-28` | ✅ |
| H-37 | Rareza | `GET /companies/find` (con `ServiceTokenGuard`) está declarada después de `GET /companies/:estado?`, que también casa con `find` y falla con `ParseBoolPipe`; ningún archivo del front la llama | `BE:companies/companies.controller.ts:22-24, 56-60` | ❓ (orden de rutas, sin ejecutar) |

### Seguridad (solo `notes/`, no publicar en `docs/`)

H-12, H-15, H-17, H-18, H-20, H-24 y H-35, más H-3 y H-4 de `acc.md`: este dominio no valida permisos en el backend (solo JWT) y varias rutas devuelven o modifican datos sensibles (claves de certificado y de Factus, token de WhatsApp Oficial, SQL por interpolación, borrado de empresa) a cualquier usuario autenticado. Lo que el manual diga de "permisos" en Ajustes solo describe lo que la interfaz oculta.

### Lo que el manual dice y el código no sostiene del todo

- `docs/guia/roles-empresa.mdx`, tabla de la pestaña Sucursales: lista establecimiento, punto de emisión, secuenciales de factura y nota de crédito y `Ambiente` como si se vieran en todos los países. Solo se muestran con `PAIS=EC` (y los secuenciales y el ambiente, además, con facturación electrónica activa); fuera de Ecuador el formulario trae nombre, dirección y `N° secuencial Recibo:` (y en Colombia los dos rangos) (`FormSucursal.vue:60, 94, 168, 203, 236`). Sugerencia: añadir una frase «Fuera de Ecuador solo se piden nombre, dirección y `N° secuencial Recibo`; en Colombia, además, el rango de numeración».
- `docs/guia/roles-empresa.mdx`, tabla de la pestaña Empresa: correcto en lo comprobado (etiquetas, mensajes, permisos). Falta indicar que los datos de **certificado**, `Obligado Contabilidad` y fecha de caducidad solo se ven con `PAIS=EC`, que `Razón Social` aparece al activar **Requiere Facturación**, y que si la ficha se guarda sin logo ni certificado puede quedar el texto `null` (H-30, ❓ en pantalla).
- `docs/guia/roles-empresa.mdx`, frontmatter `codigo:` solo apunta a `ajustes/empresa/IndexPage.vue` y `EditEmpresa.vue`; no cita `FormEmpresa.vue`, `useEmpresa.js`, `FormSucursal.vue`, `useSucursal.js` ni los controladores y servicios `companies/*` y `sucursal/*` que sustentan lo que la página afirma.

### Hallazgos de AJS-009 corregidos en esta revisión

- Colisión de IDs: el límite "Facturas sin pagar para dejar de crear" (`limiteFacturasImpagasSuspendidos`) **no es AJS-033** (AJS-033 es "Pago Internet"; AJS-034, el recordatorio con valor del plan de Tasa BCV). Pertenece a **COB-027** (`cob.md`) y ahora consta en la tabla de campos de AJS-009.
- Líneas de código movidas entre el ZIP del 2026-10-06 y el del 2026-10-14 (`crear-facturas.service.ts`, `pagos.service.ts`, `ModalPago.vue`, `PayComponent.vue`, `FactAndNot.vue`, `FacturacionPage.vue`): actualizadas en AJS-009 y AJS-010. Las citas de otras secciones de este archivo no se han vuelto a medir línea a línea.

### Cierre de lectura (AJS-011, Factus)

- Cierre: el interruptor `Activo`/`Inactivo` de la pestaña Factus no lo lee ningún código del backend (búsqueda de `is_active` en `facturacion/` y `config/`); la emisión depende solo de `usaFactus()` (entorno) y de las credenciales ✅ `BE:facturacion/factus/*`. `docs/tareas/facturacion/configurar-la-integracion-con-factus.mdx` y `docs/referencia/ajustes-y-valores-por-defecto.mdx` ya lo dicen bien.
- Cierre: `GET`/`PATCH /facturacion/factus/config` no llaman a `assertHabilitado()` y responden en cualquier país; el resto de endpoints devuelven 400 `Factus no está habilitado en esta instancia (revisa PAIS / FACTURACION_PROVIDER)` ✅ `BE:factus.controller.ts:30-42,171-177`.
- Cierre: la pestaña depende de `VITE_PAIS=CO`, pero los selectores de rango de la sucursal dependen de `USA_FACTUS` (`VITE_FACTURACION_PROVIDER`/país); con `FACTURACION_PROVIDER=factus` fuera de Colombia la sucursal pide rangos y no hay pantalla para cargar credenciales ✅ `FE:ajustes/facturacion/IndexPage.vue:10-12`, `FE:composables/usePais.js:19-27`.
- Cierre: sin discrepancias entre el código y `docs/guia/facturacion-ajustes.mdx`, `docs/tareas/facturacion/configurar-la-integracion-con-factus.mdx` y `docs/referencia/ajustes-y-valores-por-defecto.mdx` (etiquetas, mensajes, valores iniciales y el comportamiento de **Probar conexión** sobre lo guardado coinciden).
