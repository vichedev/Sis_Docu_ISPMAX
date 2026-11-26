# Hallazgos

> Marca: ✅ código · 🖥️ UI real · ❓ sin verificar. Añadir con ruta `archivo:línea` cuando se pueda.

## Del manual actual (repo `ispmax-manual`)

- 52 páginas MDX en `docs/guia/` (+ `docs/index.mdx`); el sidebar sale de `docs/sidebar.json`, generado desde
  el `index.html` original. Estructura = una página por pantalla, sin guías por tarea ni troubleshooting
  dedicado. `faq.mdx` (5.5 KB), `glosario.mdx`, `estados.mdx`, `rutinas.mdx` son lo más cercano a referencia.
- 111 imágenes en `assets/imgs/`; algunas con nombre no descriptivo (`aju.png`, `ajust.png`, `conf.png`,
  `exx.png`, `facpa.png`, `gestion.png`, `imp.png`, `men.png`, `mensajee.png`) y un `desktop.ini`.
- El tema se llama "Manual ISPMAX"; contacto de soporte WhatsApp y redes sociales en `rspress.config.ts`.
- `README.md` dice "45 páginas"; hay 52 → README desactualizado.
- `nav.activeMatch` de "Guía" excluye `estados|rutinas|faq|glosario` a mano → frágil.
- Existe `index.html` (164 KB) + `manual.css` + `manual.js` heredados y publicados en `/legacy/`.
- Ya hay una página `docs/guia/roles-empresa.mdx`: contrastar contra el catálogo real de permisos.

## Ideas/problemas del PDF de revisiones (usuario, 14 págs.; NO es fuente de verdad)

Texto extraído con `pdftotext` a `C:\WORKSPACE\_ispmax-src\pdf\revisiones.txt` (las capturas anotadas no se extraen).
Puntos aún relevantes para la reconstrucción:
1. Botón de preguntas frecuentes/búsqueda central en portada: "Respuestas a tus dudas"; la búsqueda debe poder
   evolucionar a un bot que responda y, si no puede, devuelva la sección por palabras clave.
2. Enlace TikTok → `https://www.tiktok.com/@maat.ec` ✅ confirmado y aplicado el 2026-10-21 (antes apuntaba a `@iniguality`).
3. Introducción larga: ser breve y directo. 4. Skill `ISPMAX-MANUAL`: la fuente editable vivía en
   `C:\WORKSPACE\WORK\Inigualitysoft\ISPMAX-MANUAL-MARKDOWN` (00-portada-indice, 01..07, MANUAL-ISPMAX.md, img/); no existe
   en esta máquina → se asume que el repo `ispmax-manual` es ahora la fuente única.
8–9, 21, 23. Alertas con icono ⚠ rojo; tablas con énfasis claro; mensajes de error en rojo con símbolo.
10–11. "Uso de plantilla" y "Carga de data": explicar prepago (suma del mes generado a deudas viejas; restar un mes
   para no sumar uno de más) y errores de carga. Pendiente que el usuario aporte capturas → ahora las genera Claude.
12. Muchas secciones con una sola imagen y mucho texto debajo: usar más capturas/anotaciones. "Ver al cliente como un niño
   que no sabe dónde está parado".
13. **Router: cambiar la API por defecto a 8787** (verificar en `AddRouter.vue`/`FormRouter` qué puerto es el real).
14. Quitar mensajes con flechas bajo las imágenes. 15–18, 20. Rediseño visual de IPv6, Cajas NAP, Mapa, Monitoreo, Promesas.
22. **Eliminar la sección "Sistema"** (no es para clientes). 24. Ampliar preguntas frecuentes con casos reales.

## Del producto (código) ✅

- `scripts/deploy.sh` (backend) trae **claves/tokens embebidos** en el bloque "VALORES A EDITAR" (API keys de gateways de
  pagos/firma y un token de servicio). Riesgo de seguridad si el repo se comparte; no copiar valores. Recomendar
  rotarlos y moverlos a variables de entorno. (El manual NO debe documentar esos valores.)
- Despliegue = `POST /api/deploy` con token de servicio → ejecuta `scripts/deploy.sh` (git pull + build + migraciones +
  PM2). Hay lock de 20 min (`deploy.controller.ts`).
- 🖥️ `quasar.config.js` declara `vueRouterMode: "hash"`, pero `src/router/index.ts:23` usa `createWebHistory` en ambas
  ramas: las URLs reales son rutas normales (`/clientes`, `/registrar-pago`, `/login`), NO `/#/…` (verificado en la UI:
  `/#/login` redirige a `/login`). Los enlaces del manual a la app deben ir sin `#`.
  `quasar.config.js` fija `VITE_CONSUMIDOR_FINAL_ID` a un UUID constante.
- Comportamiento dependiente del país (`composables/usePais.js`): tipos de documento (EC: Cédula 10 dígitos / RUC 13 /
  Pasaporte; PE: DNI 8 / RUC 11; etc.), IVA por país (EC: 0/12/14/15), ICE solo EC, códigos de forma de pago SRI
  (EC) o DIAN (CO). Moneda por `VITE_MONEDA_*`.

- Ruta con typo: `/servicios/internert/add` y `/servicios/internert/edit/:id`
  (`router/routes.ts:243,249`). El menú resalta ambos prefijos (`SideBarMenu.vue:11`).
- `ajustes/plantillas` está declarada dos veces con el mismo `name` (`routes.ts:411` y `:441`).
- `ingresos-egresos` no declara `meta.requiresAuth` (`routes.ts:57-61`); ❓ el guard decide por defecto.
- La clave de permiso del catálogo es `index.category` (singular) pero la ruta se llama `index.categories`
  (`SideBarMenu.vue:390`); hay un mapa nombre→permiso en `auth-guard.ts` (leer).
- Redis está fijo a `127.0.0.1:6379` y Bull usa `keyPrefix: appQueue${PORT}` (`app.module.ts:87-104`):
  dos instancias en la misma máquina comparten cache.
- `main.ts:14-19` captura `uncaughtException` por un `throw` síncrono de `node-routeros-v2`
  (el proceso sigue vivo con PM2 → ver `scripts/reiniciar-pm2.sh`).
- `json({ limit: '50mb' })` y `ValidationPipe({ whitelist: true, transform: true })` → los campos no
  declarados en DTO se descartan **en silencio** (relevante para "el campo no se guardó").
- `README.md` del backend casi vacío; no hay guía de despliegue en el código aparte de `scripts/deploy.sh`.

- ✅ **Router → "Sucursal para pagos automáticos" no se guarda** (verificado en código 2026-10-12): el formulario envía
  `sucursal_facturacion_id` (`FE:routers/components/FormRouter.vue:665`, `composables/useRouter.js:31`) pero
  `CreateRouterDto`/`UpdateRouterDto` no lo declaran y `ValidationPipe({whitelist:true})` lo descarta. La columna
  `routers.sucursal_facturacion_id` existe y se lee en `BE:sucursal/sucursal-facturacion.service.ts:81-195`, pero ningún
  endpoint la escribe. La sucursal de un cobro automático se resuelve: 0) empresa con una sola sucursal, 1) la del
  servicio (perfil del cliente), 2) la de los últimos 3 pagos si coinciden, 3) router (inalcanzable desde UI),
  4) el router atiende una sola sucursal, 5) sin resolver ⇒ cobro rechazado. Pendiente de reproducir en UI.

- ✅ **Conciliación bancaria — cupo y reinicio** (verificado en código 2026-10-13): el cupo es de 3 conciliaciones por
  (empresa, año, mes **conciliado**), no por mes calendario (`BE:conciliacion-bancaria/conciliacion-bancaria.service.ts:420-456`).
  El cupo se consume **antes** de leer el PDF y no se devuelve si la lectura falla (`:495-549`). `POST
  conciliacion-bancaria/cupo/reset` solo exige JWT (`conciliacion-bancaria.controller.ts:91-98`: cualquier usuario
  autenticado puede reiniciar el cupo vía API) y el botón de la UI está condicionado a un correo fijo en el código
  (`FE:pages/dashboard/conciliacion-bancaria/IndexPage.vue`, `claim.email === '<correo de un cliente>'`), es decir, una
  excepción por cliente embebida en el frontend. No documentar en el manual público; el manual dice "solicite al
  proveedor que reinicie el cupo".
- ✅ **Plantillas de variables**: en la tabla de variables de Plantillas, un clic **copia** la variable al portapapeles
  (`FE:pages/dashboard/ajustes/plantillas/components/TablaVariables.vue`); no la inserta en el editor.
- ✅ **Importación de clientes por Excel**: antes de subir, el frontend consulta `GET /customers/limite-suscripcion` y,
  si el archivo trae más filas que cupos, no sube nada (`FE:clientes/components/modals/ModalCargarExcel.vue:635-650`).
  El "Excel con errores" excluye las filas cuyo error contiene "ya existe un cliente con esta ip" (`:664-679`).
  El chequeo de IPv4 repetida solo ocurre con `uploadedFromExcel` (`BE:customers/customers.service.ts:277`): el alta
  manual y la edición no lo hacen.

## Sesión de actualización a `zip-2026-10-14` (2026-10-21) — FE `99b38a14`→`afd79206`, BE `3057b787`→`7501da79`

Marca: ✅ código · 🖥️ comprobado en la instancia local · ❓ sin confirmar. No se publica en `docs/`.

**Acceso y recuperación de contraseña** (`BE:auth/auth.service.ts`, `auth.controller.ts`)
- 🖥️ `recuperar-password` responde 500 si no hay `DOMINIO` y la petición no trae `Origin` (con navegador funciona).
- ✅ Revela si un correo existe (*No existe una cuenta registrada con ese correo*, `auth.service.ts:436-450`).
- ✅ Quien conozca un correo válido puede **inactivar esa cuenta** (también la de un administrador) con 5 claves
  incorrectas; solo lo frena el límite del login por IP (10/min). 🖥️ Tras el bloqueo, una clave incorrecta sigue
  respondiendo "Usuario o contraseña incorrectos" (no avisa de la inactivación).
- ✅ Restablecer la contraseña **no cierra las sesiones abiertas** (el JWT no caduca y no se marca `logout`); una
  solicitud nueva **no invalida** los enlaces anteriores (válidos 15 min); el enlace se envía también a cuentas
  inactivadas por un administrador (la clave cambia, la cuenta sigue inactiva 🖥️).
- ✅ `sendDesdeSistema` abre SMTP con `tls.rejectUnauthorized=false`; usa el correo del sistema (`MAIL_*`), no el
  servidor de correo de la empresa (Ajustes → Mensajería). La reactivación automática solo ocurre si el bloqueo tiene
  menos de 24 h (`login:lock`); `login:fails` renueva su TTL de 15 min en cada fallo.
- ✅ Límite de peticiones global (60/10 s y 150/min por usuario o IP); 🖥️ responde 429 "Demasiadas peticiones,
  espere unos segundos e intente de nuevo".

**Clientes**
- 🖥️ La columna "Fact. Automática" **siempre muestra "No"**: con una configuración activa por router (creada por API en la
  instancia local) la respuesta de `GET /customers/Todos` no trae `facturacion_automatica` (`customers/**` nunca la
  añade; solo existen la entidad y un SQL en `facturacion-automatica.service.ts:184`), aunque el frontend la lee
  (`useClientesIndex.js:59-80`). Además `facturacion_automatica` no está en `fieldMapping` (`customers.service.ts:1168`):
  el filtro solo afecta a la página cargada. (Con un navegador que ya tenía sesión previa la columna ni siquiera se
  dibujó: tras un login limpio sí.)
- ✅ Importar un Excel exportado con servicios *Retirado* los carga como *Inactivo* (`ModalCargarExcel.vue:349-353`).
- ✅ Exportar con Estado ≠ Todos y sin clientes que cumplan el filtro ahora devuelve un archivo vacío (`1 = 0`,
  `mikrotik.service.ts:1757`); antes exportaba todo el router no retirado.
- ✅ `LogsCortes.vue` ("Historial del proceso de cortes") es código muerto: ninguna pantalla lo monta; el catálogo de
  permisos sigue ofreciendo `variables.opciones-logs`.
- ✅ Las preferencias de columnas (OCULTAR) viven en el store persistido `auth/user/<VITE_COMPANY_NAME>` y `Login.vue:51-57`
  lo borra al iniciar sesión (🖥️ el selector vuelve a los valores por defecto tras cada login). Cerrar sesión no las
  borra (`resetValues` solo limpia token, imágenes, permisos y sucursales). Con `VITE_COMPANY_NAME` sin definir la
  clave borrada (`default`) no coincide con la del store (`undefined`).

**Cobranza y facturación**
- ✅ `VITE_OCULTAR_MESES_PLAZO=true` también oculta el interruptor "Día de pago al cobrar" (mismo bloque,
  `PayComponent.vue:987`, `ModalPago.vue:982`).
- ✅ El campo "Plazo de pago / Factura a crédito" quedó **comentado** en Registrar pago y en el modal de pago, pero
  el formulario sigue enviando `plazo: 0` y `unidad_tiempo: 'DIA'`; siguen en Ventas (factura libre).
- ✅ Dos textos distintos para "se eliminarán facturas de meses adelantados" (Registrar pago vs modal del perfil).
- ✅ El chequeo de N.º de transacción duplicado ocurre **después** de la confirmación "¿Deseas agregar este pago?".
- ✅ `ModalNuevaFactura.vue` (versión del ZIP): el vencimiento de un `postpago` sin pagos no sumaba el mes
  (`fecha.add` sin asignar) y `dia_gracia` se leía como texto; corregido en el código nuevo (COB-029).
- ✅ `/email/edit/:email_id`: sin enlace desde ningún menú; sus migas apuntan a `/emails` (no existe en `routes.ts`); el
  guard exige un permiso `email.edit` que no está en el catálogo.
- ✅ "Pago Internet": sin backend en el repo; la API key sale de `VITE_PAGO_INTERNET_API_KEY` (se fija al compilar).
  🖥️ Con el servicio de pagos inalcanzable la pantalla muestra solo el aviso "No se pudo contactar al servicio de
  pagos" y **ninguna pestaña**, tampoco la de Pago Internet.

**Red**
- ❓ Migrar un router (o cambiar el Router de una red) mueve las cajas NAP de los servicios migrados pero no toca
  `caja_principal_id` (`red-ipv4.service.ts:1111-1113`): una secundaria puede quedar enlazada a una principal de otro
  router.
- ✅ El backend no valida que `caja_principal_id` exista ni sea del mismo router; el anti-ciclos corre solo en `update`
  (`caja-nap.service.ts:571-594`); 🖥️ un UUID inexistente termina en 500 ("Unexpected error, check server logs"), y 🖥️ un enlace circular responde 400 con "Enlace inválido: …". La importación/exportación Excel de cajas NAP
  no incluye el tipo: las importadas quedan como principales.
- ✅ El botón "Ver Mas Detalles" de la ventana de vincular ONU (`VincularOnu.vue:494`) abre la vista de ONU sin
  `cliente_id` (no aparece "Ver cliente isp-max").
- ✅ Dashboard: el "Pico" del tráfico es el mayor promedio horario, no un máximo instantáneo
  (`monitoreo-trafico.service.ts:290-298`); el gráfico usa resúmenes por hora consolidados en el minuto 4.

**Almacén**
- ✅ Productos: el selector Sucursal no filtra el listado (solo la exportación, `products.service.ts:72-103`).
  Registrar o anular una compra no mueve stock (`buys.service.ts:24-52`).
- ✅ Equipos: el formulario no tiene *Estado* ni *Tipo de vinculación* (solo Sucursal, Categoría, Proveedor, Nro. Serie,
  Nro. MAC, Precio e IVA, `FormEquipo.vue:101-175`).

**Instancia local**
- 🖥️ Quedaba sin `VITE_HOST_KEY_PERMISOS`/`VITE_COMPANY_NAME` en el frontend y con `permisos` vacíos en `admin`:
  imposible navegar autenticado hasta corregirlo (ver `notes/entorno.md`). Cargar `/registrar-pago` en frío (recarga
  completa) da una pantalla en blanco por un ciclo de importación (`useTransation` en `useFacturacion.js:86`) solo en
  modo desarrollo: entrar desde el menú lateral funciona.


## Ronda 2 (2026-10-22): inventarios, referencias y comprobaciones en pantalla

**Comprobado en la instancia local con datos (🖥️)**
- "Día de pago al cobrar": con las dos opciones de Ajustes › Facturación activas, el interruptor aparece junto a Meses
  Adelantados, marcarlo muestra *Día 1 → 22* y, tras "Pago agregado exitosamente", el día de pago del cliente pasó de
  1 a 22 (el día del cobro). Sin la opción no hay interruptor.
- Un cobro con una factura de tipo *Factura* y la empresa sin facturación electrónica se rechaza con "La empresa no esta
  configurada para emitir factura electronica solo recibo, por favor configurar en el modulo empresa si desea continuar
  con el proceso." (mensaje verificado; sirve para el problema "no puedo cobrar").
- Cajas NAP: el listado muestra *★ Principal* / *Secundaria · de X*; el formulario muestra "Sale de la caja" al elegir
  *Secundaria*; el anti-ciclos responde 400.
- Con una configuración de facturación automática activa por router la columna "Fact. Automática" sigue mostrando
  "No" (ver arriba); el endpoint `GET /customers/Todos` no trae la propiedad.
- La caché de Redis (`settings:findAll`, `fecha-max-pago:*`, `resumen-sistema:*`) no se invalida al cambiar datos por
  SQL: para capturas y pruebas hay que borrar esas claves (sin TTL numérico, ver ronda 2 W2 §11).

**Seguridad y privacidad (solo `notes/`; avisar al equipo de desarrollo)** — W2, ✅ leído en código, ❓ sin ejecutar
- `GET /api/images/:filename` es público y arma la ruta con `join(cwd,'public','images', filename.trim())` + `sendFile`
  sin comprobar que quede dentro de `public/images` (`app.controller.ts:17-22`): posible salida de carpeta (depende de
  cómo el proxy trate `%2f`).
- `/api/sri` publica sin autenticación todo `static/SRI`: firmas `.p12` (`FIRMAS/<uuid>.p12`) y PDF/XML de comprobantes
  por clave de acceso; `/api/uploads` publica PDF de contratos y tickets firmados (`app.module.ts:152-168`).
- `GET /api/companies` devuelve filas completas (incluye `clave_certificado` y `wa_cloud_access_token`) a cualquier
  usuario autenticado (`companies.service.ts:28-37`); `GET /api/email` devuelve la contraseña SMTP en claro
  (`email.service.ts:291-307`).
- `ServiceTokenGuard` solo verifica la firma del JWT (no usuario activo; el JWT no caduca) y protege `POST /deploy`,
  `GET /deploy/log`, `POST /companies/:id`, `/sucursal/*-cobro`, `/resumen-cliente` y `/customers/:estado?`: un usuario
  desactivado conserva el acceso con su token (`deploy/service-token.guard.ts`).
- `GET|DELETE /api/notifications/by-user/:user_id` no compara el id con el del JWT; `POST /logs` y `DELETE /logs/:id`
  abiertos a cualquier autenticado.
- El panel envía la cabecera `rol-name` y el backend lee `rol` en `GET /companies`: la excepción de SUPER-ADMINISTRADOR
  nunca aplica (`boot/axios.ts:25`, `companies.controller.ts:22-30`).
- `PUT /programar-queue/<nombre ≠ cortesServicios>` (lo usa guardar la plantilla de recordatorios) ejecuta `init()` →
  `cacheManager.reset()` = `FLUSHDB` de toda la base 0 de Redis, colas Bull incluidas (`app.controller.ts:32-49`,
  `app.service.ts:83-118`); se pierden `login:lock` y los tokens `recovery:*`.
- El almacén Redis ignora los TTL numéricos (solo respeta `{ttl}`): `permisos:*`, `usuarios:*`, `fecha-max-pago:*` y
  `resumen-sistema:*` no vencen; el widget "Enviando recordatorios" puede quedar fijo si el backend muere a mitad del envío.
- `POST /email/testing` envía el texto del error SMTP a un servicio de traducción externo.
- `GET /auth/users` y `info@rednuevaconexion.net` (dato de un ISP concreto) excluidos por correo literal en el código
  (`auth.service.ts:239-266`, migración `AddIndexesPerformance`): revisar si es un residuo.
- "Obtener IP" (`/red/getIp`) llama a `POST /api/mikrotik`, que no existe en el controlador: herramienta inoperante.

**Funcionamiento**
- Ficha Empresa: `if (await !validarCampos(true)) return` nunca bloquea (`useEmpresa.js:203`); "Debes adjuntar el
  certificado" es inalcanzable; la pista "3 MB, 600×600" del logo no se valida; los errores del servidor solo van a
  consola. Sucursales: el botón `+` móvil navega a `crear.sucursal`, ruta inexistente → no se puede crear desde el móvil.
- La invalidación de `users:true/false` tras bloqueo/restablecimiento no surte efecto: la lista usa `usuarios:*`
  (`auth.service.ts:244` frente a `:426-427,536-537`).
- Menú lateral: con solo `cobros-pasarela.index` el grupo Finanzas no aparece; con solo `dashboard.ultimos_pagos` (plural)
  no aparece Dashboard (el menú usa `dashboard.ultimos_pago`); el ítem Ajustes no cuenta `ver.logs`, `base-datos.*`,
  `variables.ver.*`, `index.usuario`, `index.rol` (`SideBarMenu.vue`). `v-idle` con 3000 s = cierre a los 50 min sin aviso.
- Notificaciones de ONU no encontradas solo a usuarios con rol `admin` (minúscula); "WhatsApp Desvinculado" se crea una vez
  por cada usuario activo; el chip SRI pide reenviar comprobantes cada vez que el SRI figura arriba.
- Sin sucursal resoluble: el bot externo recibe 409 y rechaza el cobro; el abono interno por pasarela se registra sin
  comprobante (`registrar-abono.service.ts:511-527`).
- El nombre del ítem de menú es **Ventas** (la pantalla se titula "Listado de Comprobantes"); el manual decía "Facturas".

**Campos del cliente** (W5)
- ✅ En el alta, el `ValidationPipe` antepone `cliente.`, `facturacion.` o `servicio.` a los avisos de validación del
  servidor (`cliente.El campo nombres no debe estar vacío.`); en la edición de datos personales no.
- ✅ El mínimo de 5 caracteres del documento solo lo exige el servidor; el celular con formato inválido no bloquea
  "Siguiente"; el precio permite 9 enteros en pantalla pero la base guarda 6 (error genérico); sin tope de longitud en el
  servidor para nombres (200), email (75) y ubicación (75); `Fecha Instalación` solo se valida vacía en el servidor.
- ❓ El documento se recorta a 10 caracteres si el tipo no es `04` aunque el input admite 20 (afectaría a la CURP de
  México y a pasaportes largos, `useCliente.js:504-518`); `agregar_servicio` decide caja/puerto por `.length` y con
  *Puerto Nap = Ninguno* intentaría guardar `'Ninguno'` (`customers.service.ts:581-586`); `fechaPago` calculada en el
  navegador desborda en meses cortos (día 29-31).
- ✅ Defaults distintos formulario/entidad en Facturación Automática (formulario `activo=false`, `dias=0`; entidad
  `activo=true`, `dias=3`); Colombia/Factus exige Departamento + Municipio con código DANE y documento (solo al emitir);
  `Aplicar Corte` se guarda con doble espacio (`1  Mes Vencido`).
- ✅ Usuario y contraseña PPPoE **no** son obligatorios (ni en pantalla ni en servidor): corrige cli1 CLI-010 y cli2 SRV-002.

**Ajustes y valores por defecto** (W6)
- ✅ SmartOLT: el valor de fábrica de `reiniciosSmartOLT` no trae `modo`; el procesador solo reinicia vinculados con
  `modo === 'vinculados'` y en otro caso reinicia **todas** las ONU de todas las OLT (`reinicio-smartolt-queue.processor.ts:224-232`).
- ✅ Margen derecho de impresión: se guarda de fábrica como `MargenDer` y los PDF leen `margenDer` → `NaN` hasta guardar.
- ✅ `notificarSuspendidos` no tiene consumidor; `tipoDireccion` no tiene pantalla (el comprobante imprime la dirección del
  servicio); `cantidadFacturasIgnorar` sigue aplicándose en el recordatorio sin campo en pantalla.
- ✅ La vigencia del enlace de cobro (PayPhone) rige para todas las pasarelas; sin "Cobrar con" y con dos pasarelas
  listas se cobra con dLocal Go (orden alfabético).
- ✅ Reintentos por router: vacío guarda 0 (sin reintento); en el global vacío vale 4.
- ✅ Los defaults del front (`useSetting.js`) difieren de los de la BD; solo se ven antes de cargar.

**Mensajes** (W7)
- ✅ "No se puede eliminar este router, porque tiene clientes." se dispara por **planes de internet** o una FK, no por clientes.
- ✅ Errores de ortografía en textos de interfaz ("No es posbile borrar…", "REspuesta con ID…", "una cantidad cantidad",
  "la perfil"); "Ticket Eliminado" reutilizado para roles y personas; voseo mezclado con tuteo y usted.
- ✅ Los `catch` genéricos de ~22 servicios devuelven `Unexpected error, check server logs`; los únicos duplicados (23505)
  se devuelven como `error.detail` crudo de PostgreSQL.

**Servicios del cliente: contratos, cargos, grupos, facturación automática, consumo** (W1; ✅ código, ❓ sin ejecutar; los de seguridad solo en `notes/`)
- Seguridad/permisos: ningún endpoint de contratos, documentos, firma, cargos, grupos, facturación automática, logs ni monitoreo
  comprueba permisos (solo sesión válida); `/api/uploads/*` se sirve sin autenticación (PDF de contratos firmados); `DELETE
  /files/:carpeta/:archivo` no sanea `carpeta` ❓ (posible borrado fuera de `uploads`); el webhook público de firma acepta
  avisos sin verificar si el servidor no tiene secreto configurado (`firma-tramites.service.ts:765-776`); el botón "Eliminar log"
  depende de un correo concreto escrito en el código (`IndexpageLogs.vue:417-426`).
- Las listas de contratos y de documentos del cliente quedan topadas en 10 (el front no manda `limit`); los contratos pasan a
  `Finalizado` desde el navegador al abrir la pestaña (incluidos los `Anulado`); subir el documento activa el contrato y
  eliminarlo no lo revierte; la notificación de contrato y el envío a firmar generan el PDF con valor de instalación 0; el
  WhatsApp oficial de contrato/documento no adjunta el PDF.
- Cargos recurrentes sin avisos de éxito ni de error; transiciones de estado validadas solo en el front; las cuotas se redondean
  hacia abajo en el backend sin compensar el residuo; el saldo a favor se reconoce por el texto de la descripción.
- Creación anticipada de facturas: sin cron propio, corre dentro de cada ejecución de cortes del router (una constante `cron`
  diaria se importa y no se usa, `app.service.ts:8`). Facturación automática: el backend admite alcances `router`, `plan` y `red`
  sin pantalla; emite solo si el backend está activo en el minuto exacto de la hora (`facturacion-automatica.service.ts:46-79`).
- Grupos: retirar un servicio no lo saca del grupo; deshacer el grupo no borra su facturación automática (queda huérfana).
- Facturar a un tercero (grupo/servicio): ni el front ni el backend comprueban 10 dígitos de cédula o 13 de RUC; el manual
  decía que la cédula exige 10 dígitos ❓ (revisar `ConfigFacturacionTercero.vue`).
- Firma electrónica: el mensaje "Hay que anular o esperar ese trámite" menciona una anulación que no existe; los eventos del
  trámite no aparecen en la pestaña Logs del servicio.
- Consumo: retención de 8 días (muestras de 5 min), 45 días por hora y 400 por día; los servicios suspendidos no entran en la
  detección de caídas; el aviso "no se puede medir" omite el control `PCQ + Address List`. Mapa `/mapa-clientes`: sin menú, solo
  SUPER-ADMINISTRADOR, sin filtro por routers permitidos y muestra servicios retirados.
- Meses adelantados ❓: al anular el pago se marcan como `anulado` pero no se restauran las órdenes `NO PAGADO` eliminadas.
- `cliente.factura.libre` está en el catálogo de permisos y ningún archivo del front la usa; N.º de contrato: `MAX+1` global
  (incluye retirados) sin validar duplicados en el front.
- Promesa de pago y corte: en el modo *N Meses Vencidos* una promesa activa mueve la fecha de corte
  (`app-queue.processor.ts:355-366`); no está en la guía (pendiente).

**Automatizaciones** (W4; ✅ código, ❓ por deducción; los que citan claves o datos internos, solo `notes/`)
- ✅ Guardar la pestaña "Recordatorio de pago" deja sin programar el reenvío SRI cada 2 h, la Tasa BCV y los reinicios de ONU:
  `init()` vacía Redis y solo re-arma cortes, facturación mensual, promesas e ingresos/egresos; el resto se arma en
  `onModuleInit` (`app.service.ts:31-48, 83-120`). AdminOLT ni siquiera se re-arma al arrancar. Los trabajos con retardo
  (reintentos de cortes, envío masivo, verificación de ONU, colas MikroTik) se pierden.
- ✅ Tras ese vaciado se pierde `login:lock:<id>`: restablecer la contraseña ya no reactiva una cuenta bloqueada por 5 intentos.
- ✅ `resumen-sistema:*` (Dashboard: Servicios Activos/Inactivos) no se invalida con los cortes y reactivaciones automáticos ❓.
- ✅ "Verificar conexión" ejecuta un ciclo completo y suma un fallo por router que no responde: dos pulsaciones seguidas declaran
  caído al router, disparan `configurarRouterSSL` (modifica el router v7) y avisan por Slack; la caída masiva repite el aviso de
  Slack cada 5 min mientras dure.
- ✅/❓ Ping de equipos: un equipo de "1 min" queda en la práctica a ~2 min (`ultimo_ping_en` se escribe al terminar el ping).
- ✅ La detección de conexión exige `onu_source` explícito: un servicio con SN cargado por Excel (sin `onu_source`) que no sea
  PPPoE queda `sin_datos`, mientras los cortes sí lo tratan como SmartOLT.
- ✅ `editQueueMikrotik` borra las colas del plan **antes** de `repararRouter`, con `attempts: 1`: si la reparación falla, esos
  clientes quedan sin límite de velocidad; `editEditNameQueueMikrotik` traga los errores.
- ✅ "Validar ONUs vs SmartOLT" no filtra por `onu_source` (marca como inválidas ONU de AdminOLT); el reinicio SmartOLT en modo
  `vinculados` no filtra servicios eliminados ni el origen; un fallo crítico corta la cadena de reprogramación. El trabajo guarda
  en Redis la clave API de SmartOLT y el log de fallo crítico guarda `jobData` completo ❓ (solo notas).
- ✅ Ingresos/egresos recurrentes: 00:00 fijo, sin recuperación si el servidor estaba apagado, errores tragados.
- ✅ Sin purga de `logs`, `notifications`, `conexion_caida` ni `monitor_dispositivo_caida`; la serie por hora de interfaces de
  router dura 60 días, no 45. Los logs `tasa_bcv` y `SolicitudFirma` no pertenecen a ningún módulo del filtro de Logs.
- ✅ La campanita no se actualiza en vivo en la ficha del cliente ni en Facturas libres (`layouts/Notifications.vue:227-241`).
- ✅ `GET /resumen-cliente`: la caché no caduca; los ajustes globales (días/horas de corte, base de creación) no la invalidan.

**Soporte, instalaciones, mensajería, firma, pasarelas y almacén** (W3; ✅ código, ❓ por comprobar en pantalla)
- ✅ Los equipos en **Préstamo/Comodato** de una instalación **no se vinculan nunca** al servicio (`customers.service.ts:998-1005`
  filtra solo `venta`; tampoco con la instalación ya INSTALADO, `instalaciones.service.ts:866-884`): quedan
  `pendiente_asignacion`, aunque los diálogos prometen "se vinculará al servicio del cliente". Una venta sin precio o con
  precio ≤ 0 se omite en silencio al completar (`:1017-1018`).
- ✅ El aviso INSTALADO es un camino aparte (`notificarInstaladoLocal`, `customers.service.ts:757-818`): solo Baileys, sin
  registro en "Mensajes enviados", sin aviso de campana si falla, y deja solo dígitos del teléfono (❓ números locales saldrían
  sin código de país). Por omisión solo el correo del cliente está activo en los avisos de cambio de estado
  (`useInstalaciones.js:16-19`).
- ✅ El cambio de estado y la reasignación esperan a que terminen los envíos antes de responder; los mensajes citan una ruta de
  menú inexistente ("Ajustes › Notificaciones por estado"); la plantilla de EN_PROCESO promete "30 minutos" como texto fijo.
- ✅ La hoja de instalación imprime la contraseña PPPoE en claro y escapa las notas (que se guardan como HTML); la exportación del
  listado no recibe los selectores Técnico/Operador; eliminar un producto de Materiales siempre titula "¿Eliminar Producto?".
- ✅ `completar` no verifica en el backend que la instalación exista, no esté cancelada ni ya INSTALADO; la búsqueda por cédula
  del flujo es parcial (`LIKE %cédula%`) y puede llevar a otro cliente.
- ✅ `ubicacion-tecnicos`: solo envía quien tenga un rol llamado exactamente `TECNICO`; el listado del mapa no se filtra por
  routers/sucursales del que consulta.
- ✅ Las rutas `ajuste.firma-electronica` y `ajuste.pasarelas-pago` no existen en ningún catálogo de permisos: solo
  SUPER-ADMINISTRADOR entra (`auth-guard.ts`; `ajustes/IndexPage.vue:443-502`). El aviso de firma completada se acepta sin
  verificar si el servidor no tiene secreto; el webhook de pagos, en cambio, queda cerrado sin secreto.
- ✅ El mensaje "anular o esperar ese trámite" menciona una anulación que no existe en el panel ni en la API; el paso a
  `Finalizado` de un contrato lo hace solo el navegador; la ficha del cliente trae solo los 10 contratos/documentos más recientes.
- ✅ Fallos de LibreOffice llegan al usuario como `Error procesando documento: <archivo hexadecimal>`; la conversión no tiene
  límite de tiempo. El aviso de contrato genera el PDF con valor de instalación 0 y, con "Ambas", si falla WhatsApp no se envía
  el correo; las notificaciones de documento no se registran en Mensajes enviados.
- ✅ `POST /companies/:id?` (carga del .p12) se protege con token de servicio o JWT, sin permisos; el reenvío del .p12 al
  microservicio de facturación ignora sus errores; la clave del certificado se guarda sin cifrar (`company.entity.ts:112-113`) ❓.
- ✅ El API key de la pestaña Pago Internet viene de una variable de construcción del frontend y queda incrustada en el
  JavaScript entregado al navegador (`PagoInternetConfig.vue:14`).
- ✅ Firma electrónica: el panel nunca envía `nivel` (todo envío es firma `simple`).
- ✅ Formas de pago: guardar una forma nueva sin código fiscal no muestra mensaje ❓; los botones flotantes "+" de móvil apuntan a
  una variable inexistente (`IndexPage.vue:288`); los pagos automáticos crean la forma `PASARELA DE PAGO` y **corrigen** el código
  de una forma existente si el SRI no lo reconoce (`registrar-abono.service.ts:976-1075`).
- ✅ Ventas: el mensaje dice "supera los $500.00" pero la regla se activa con total > 50 y forma `01` (`AddVenta.vue:139-143`).
- ✅ Excel de clientes: la plantilla marca `Email *` como obligatorio pero la importación lo trata como opcional;
  `repararRouter` captura su propio error y luego se muestra "Router reparado correctamente".
- ✅ Proveedores: `email` y `numero_documento` son únicos incluso para proveedores eliminados lógicamente ❓.

**Ajustes, empresa y sucursales** (W8; detalle H-01…H-37 en `notes/inventory/ajs1.md`; ✅ código, ❓ sin ejecutar; seguridad solo en `notes/`)
- ✅ **ALTO — H-35:** `DELETE /companies/:id` y `PATCH /companies/:id/:estado` solo piden JWT y no tienen pantalla; `remove` ignora
  el `:id` y borra **la primera empresa**, y usuarios, clientes, routers, `settings`, sucursales, formas de pago y correos
  declaran `onDelete: 'CASCADE'` hacia `companies` (`companies.controller.ts:113-126`, `companies.service.ts:252-272`,
  `user.entity.ts:41`, `customer.entity.ts:32`, `router.entity.ts:22`, `setting.entity.ts:9`, `sucursal.entity.ts:16`).
  ❓ si las FK de la BD real tienen el cascade (la entidad sí).
- ✅ H-24: `GET /settings` devuelve la empresa completa (`clave_certificado`, `wa_cloud_access_token`,
  `wa_webhook_verify_token`) a cualquier usuario autenticado (`settings.service.ts:64-67`); H-12: `GET factus/config` devuelve
  `client_secret` y `password`.
- ✅ H-15/H-17/H-18/H-20: SQL por interpolación, cambios masivos sin lista blanca de campos, `/logs` y `/deploy` con cualquier JWT.
- ✅ H-30: una empresa sin logo/certificado guarda el texto `null` y `estadoCertificado` lo cuenta como certificado cargado ❓.
- ✅ H-09: `URL_SLACK` mal configurada corta el corte masivo antes de empujar los routers; H-10: AdminOLT no se reprograma al arrancar.
- ✅ H-22: la tarjeta "Plantillas" y el guard no cuentan `variables.ver.promesa.pago`; cuatro claves no están catalogadas
  (`variables.ver.cargo.recurrente`, `variables.edita.cargo.recurrente`, `variables.ver.plantilla.instalacion`,
  `variables.ver.plantilla.mensaje.documento`). H-33: `activar.inactivar.usuario` sin efecto; H-34: ruta `ajuste.plantillas` duplicada.
- ✅ H-36: caché de 60 s en el front que solo invalida Tickets (un ajuste puede tardar hasta 60 s en verse); H-32: `GET /sucursal/true`
  pierde el filtro de empresa; H-37 ❓: `GET /companies/find` queda tapada por `GET /companies/:estado?`.
- ✅ H-26/H-27: código muerto (`updateSetting` de `useSetting.js`, `DELETE /settings/:id` stub); ❓ cómo nace la fila inicial de
  `settings` (el único alta es `POST /settings`, que nadie llama).

## Tareas del tercer bloque (2026-10-21) — rarezas del código encontradas al redactar

> ✅ leído en el código · ❓ deducido del código y sin probar en pantalla. Versión: `zip-2026-10-14`.

**Licencia y límite de clientes**
- ✅ Una suscripción inactiva o expirada **no** bloquea altas: oculta la tarjeta y desactiva el límite (`companies/master-suscripcion.service.ts:55-58`). El cupo cuenta servicios, no personas. El límite se aplica en `create`, `agregar_servicio`, al reactivar un servicio retirado y en la importación por Excel (`customers/customers.service.ts:261,548,3020`; `ModalCargarExcel.vue:638`).
- ❓ Qué fecha representan **Día de pago**, **Crear factura** y **Día de corte**: vienen del sistema central, que no está en el repositorio.

**Facturación**
- ✅ El ambiente SRI (PRUEBA/PRODUCCION) y los secuenciales se editan por sucursal en **Ajustes → Empresa → Sucursales** (`FormSucursal.vue`), no en `/ajustes/facturacion`; allí solo hay ambiente de Factus. El proveedor lo fija la instalación por variables de entorno.
- ✅ Editar una sucursal reenvía todos los secuenciales cargados al abrir el formulario (`useSucursal.js:94-95`) y el backend los sobrescribe (`sucursal.service.ts:95`): si se emite un comprobante con el formulario abierto, el siguiente repite número.
- ✅ El error *La sucursal … no tiene configurada la secuencia…* (`facturas.service.ts:138-142`) no llega al usuario: el `catch` del procesador está vacío (`invoice-queue.processor.ts:413-414`).
- ✅ Un grupo de facturación junta servicios de **un solo cliente** (`grupos-facturacion.service.ts`, `validarServicios`). Ver y editar usan el mismo permiso (`cliente.factura.configuracion.index`). ❓ Un servicio retirado después de agruparlo sigue en el grupo.
- ❓ Guardar en `/ajustes/facturacion` no tiene `catch`: si falla, no hay aviso. ❓ En móvil, el botón flotante "+" de sucursales apunta a la ruta `crear.sucursal`, que no existe (`sucursales/IndexPage.vue:297-309`).

**Red y OLT**
- ✅ SmartOLT sin `modo` reinicia **todas** las ONU: el valor por defecto de BD no trae `modo` (`setting.entity.ts:160-171`) y el procesador solo limita si es `vinculados` (`reinicio-smartolt-queue.processor.ts:228-232`). Con `vinculados` alcanza todo servicio con SN, sin filtrar por retirado ni plataforma (`:132-137`).
- ❓ Al arrancar, `limpiarColasAntiguas` llama `cacheManager.reset()` (`app.service.ts:29-48`); con `cache-manager-redis-store` eso es un `FLUSHDB` y puede borrar los jobs retardados de Bull, entre ellos los reinicios programados. ❓ Si el procesador falla del todo no reprograma (`reinicio-smartolt-queue.processor.ts:269-290`). ❓ Con varias instancias, **Guardar Cambios** solo programa si la petición cae en la instancia 0 (`smart-olt.service.ts:191-194`).

**Base de datos y almacén**
- ✅ No existe respaldo ni restauración: la cola `${queueName}-respaldo-bd` está registrada (`app.module.ts:126`) sin `@Processor`, aunque la tarjeta **Eliminar datos** pide tener un respaldo (`CamposPersonalizados.vue:354-357`).
- ✅ **Eliminar datos** con filtros borra al cliente completo y todos sus tickets y facturas aunque tenga servicios fuera del filtro (`database/database.service.ts:236-335`); no retira colas ni usuarios PPPoE.
- ❓ Un campo personalizado llamado `factus` escribiría en `custom_data.factus`, que lee la integración Factus (`factus-customer.mapper.ts:54`).
- ✅ Categorías: los selectores cargan solo las 10 más recientes (`categories.service.ts:27`), no se validan nombres repetidos, **Tipo de Categoría** no filtra nada y el borrado es físico.

**Acceso y permisos**
- ✅ Un usuario inactivo recibe 401 en cada petición (`auth/strategies/jwt.strategy.ts:58-59`), pero la pantalla no lo redirige: las ramas de cierre de `MainLayout.vue:411,418` no se alcanzan y `boot/axios.ts` no tiene interceptor de respuesta. El único cierre inmediato es el aviso `user_inactive` por WebSocket (`auth.service.ts:222-227`), que solo se envía al guardar **Inactivo**, no al eliminar ni en el bloqueo por 5 fallos.
- ✅ `GET /auth/users` lista a todos los no eliminados, también los **Inactivo** (la ruta no declara `:estado`); las guías de tickets e instalaciones decían "activos".
- ✅ Los controladores de categorías, campos personalizados, base de datos y grupos de facturación solo usan `@Auth()`: los permisos de la interfaz no se exigen en el backend. `activar.inactivar.usuario` existe en el catálogo y nada lo comprueba.
- ❓ El botón **Regresar** de `FormUser.vue` es `type="submit"` (`:787-796`): podría guardar al volver. ❓ En edición, `useUser.js:131-135` deja que la validación de contraseña sobrescriba el aviso de sucursal vacía.

**Interfaz**
- El menú lateral dice **Gestion de Clientes** sin tilde (`layouts/SideBarMenu.vue:261`); el manual escribe "Gestión de Clientes". Pendiente decidir si se respeta el texto literal.

## Ronda 3 (2026-10-23): lo que la pantalla contradijo (🖥️; sin seguridad)

- 🖥️ Productos: **Importar Excel** abre un cuadro vacío y **Exportar Plantilla** devuelve 404 (ALM-005 no funciona en `zip-2026-10-14`).
- 🖥️ Compras: `Descuento($)` es de solo lectura; "Precio de compra" muestra el PVP y no admite centavos. Tickets: la pantalla no marca al cliente "repetitivo" (solo el Excel).
- 🖥️ Instalaciones: las opciones de **Cambiar Estado** dependen del estado actual; el PDF del reporte de tickets dio *Error al descargar el reporte* y el de instalaciones no descargó nada.
- 🖥️ Registrar pago no limita la lista a 5 facturas (muestra todas las pendientes); con recibo, Anular y Editar pago también salen tras un abono parcial; la ventana de pago del perfil guarda sin confirmar.
- 🖥️ Editar un usuario: Guardar guarda aunque router y sucursal queden vacíos. Pasarelas de Pagos y Firma de Contratos sí tienen clave (las de formas de pago y de plantillas).
- 🖥️ Ajustes: los horarios de cortes se ven en 12 h; las casillas sin valor guardado se ven en estado intermedio (AdminOLT, PDF del recordatorio); la pestaña Mensaje de Bienvenida queda en blanco si `sendWelcomeMessage` es NULL.
- 🖥️ La columna "Fact. Automática" siempre muestra "No", incluso con una configuración activa. La plantilla de importación de clientes pone `_` en el nombre de la caja y la importación lo lee como espacio (✅ código, no reproducido). Las hojas `redes` y `lista` de la plantilla van ocultas.
- 🖥️ `personalizado-listado.webp` (captura antigua) mostraba AdminOLT, no el catálogo de servicios personalizados.

## Cuarto bloque de tareas (2026-10-23) — comportamientos a tener en cuenta al documentar

> ✅ leído en el código · ❓ sin probar en pantalla. Versión: `zip-2026-10-14`.

- ✅ Tasa BCV: la primera aplicación, con la tasa aplicada vacía, convierte **todos** los servicios y las facturas *NO PAGADO* de cada plan con precio mayor que 0, incluso los personalizados (`tasa-bcv.service.ts:135,152-163`); desde la segunda ejecución se respetan. La tasa manual se reemplaza en la siguiente ejecución diaria. `GET /tasa-bcv/consultar` existe pero la pantalla no lo usa.
- ✅ Cambios masivos: el día de pago usa `MAKE_DATE` sin ajustar el día (`database.service.ts:143-160`); un día 29, 30 o 31 falla si el mes de alguna factura pendiente no lo tiene. El comentario del frontend (`CambiosMasivos.vue:50-51`) dice que el backend lo ajusta: para este endpoint es falso. El diálogo de confirmación cuenta campos, no clientes.
- ✅ Ubicaciones: si falla `GET /settings/ubicaciones`, la pantalla carga el catálogo del país y deja activo **Guardar cambios**, y guardar reemplazaría el árbol guardado (`GestionUbicaciones.vue:68-75`). El borrado comprueba "en uso" solo en la pantalla.
- ✅ Facturación automática: la pantalla solo configura los alcances servicio y grupo; router, plan y red existen solo en el DTO del backend. Los errores de la emisión automática de un grupo quedan solo en el registro del servidor y `last_executed` se marca igual.
- ❓ Factus con grupos: la emisión llama a `emitirPorPago` con el pago de la primera orden (`invoice-queue.processor.ts:129-148`), y el módulo `facturacion/factus` no lee el tercero del grupo; el comprobante de un grupo en Colombia podría salir incompleto.
- ✅ Factus: el interruptor **Activo/Inactivo** se guarda pero ningún proceso lo consulta; **Probar conexión** usa lo guardado, no lo escrito en pantalla.
- ✅ Cobro de grupo: anular el pago de una orden anula el cobro completo, y con comprobante autorizado se emite una sola nota de crédito por todo el comprobante (`pagos.service.ts:1124-1134`, `facturas.service.ts:332-350`). ❓ El estado final de cada factura tras la nota de crédito no se pudo determinar leyendo el código.

## 2026-11-05 · Comportamientos del producto vistos al documentar `main-2026-11-04` (solo funcionales)

Leídos en el código; no se probaron en pantalla. Se dejan solo para el equipo de ISPMAX; el manual describe lo que hace el producto hoy.

- Portal del cliente: el diálogo de credenciales (`ModalCredencialesPortal.vue`) exige un correo y dice "es su usuario", pero el usuario con el que entra el cliente es su cédula. Validar o rechazar un pago del portal no avisa al cliente. Los mensajes del cliente en un ticket no generan campana.
- Promesas: la que pide el cliente desde el portal se crea sola, ya activa, sin aprobación (`BE:promesas-pago/promesas-pago.service.ts`).
- Bot: la solicitud de instalación solo deja un registro y una nota, no crea la ficha de instalación (el texto de Ajustes → Cobros y promesas dice otra cosa). `ajuste.cobros` y `bot.config.promesas` no abren por sí solos el panel de Ajustes (guarda `ajustes.index`).
- Incidentes de red: "Ver las cerradas" incluye los mantenimientos programados rotulados como "falsa alarma"; el tooltip del aviso masivo no lista "antena" aunque el código la incluye; `/ajustes/plantillas` exige algún permiso `variables.ver…`, no basta `mapa.incidentes.gestionar`.
