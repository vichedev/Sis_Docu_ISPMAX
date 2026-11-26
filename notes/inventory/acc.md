# Inventario ACC — Acceso, panel principal, empresa y sistema
> Alcance: FE `pages/sesion`, `pages/dashboard/{panel,usuarios,roles-permisos,empresas,sucursales,emails,red}`, `layouts/*`, `stores/*`, `router/*`, `boot/*`, `components/*` y `composables/*` compartidos · BE `auth`, `roles-and-permisos`, `companies`, `sucursal`, `dashboard`, `notifications`, `logs`, `email`, `common`, `deploy`, `app.controller/app.service/app-queue.processor`. Generado desde el ZIP del 2026-10-06; las altas ACC-041…045 y los ajustes de ACC-001 se hicieron contra el código del 2026-10-13/14 (FE `afd79206`, BE `7501da79`; versión `zip-2026-10-14`).
>
> Convenciones de cita: `FE:` = `frontend-isp-main/src/…`, `BE:` = `backend-isp-main/src/…`, seguido de `:línea`. ✅ = leído en código. ❓ = inferido o no confirmable sin UI. Ningún dato está marcado 🖥️ (no hay instancia).

## Resumen de funcionalidades

| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
|---|---|---|---|---|
| ACC-001 | Inicio de sesión (login) | `/login` · `login` | pública | completo |
| ACC-002 | Ciclo de sesión: JWT, expiración, inactividad, cierre y refresco de permisos | transversal (guard, axios, MainLayout) | — | completo |
| ACC-003 | Modelo de roles y permisos: cómo se aplica (guard, menú, backend) | transversal | `SUPER-ADMINISTRADOR` + claves por nombre de ruta | completo |
| ACC-004 | Roles y Permisos: listado, crear, editar, eliminar rol | `/roles-permisos` · `index.rol` | `index.rol`, `crear.rol`, `editar.rol`, `eliminar.rol` | completo |
| ACC-005 | Catálogo de permisos (árbol de selección por grupos) | componente `ListPermisos` (en Roles y en Usuarios) | — | completo |
| ACC-006 | Usuarios: listado | `/usuarios` · `index.usuario` | `index.usuario`, `crear.usuario`, `editar.usuario`, `eliminar.usuario` | completo |
| ACC-007 | Usuarios: crear / editar (formulario) | `/usuarios/add` · `crear.usuario`; `/usuarios/edit/:term` · `editar.usuario` | `crear.usuario`, `editar.usuario` | completo |
| ACC-008 | Mi Perfil | `/usuario/edit/:term/profile` · `editar.usuario.profile` | ninguno (guard lo deja pasar) | completo |
| ACC-009 | Baja de usuario (borrado lógico) y estado Activo/Inactivo | `/usuarios` (botón papelera) · `PATCH /auth/edit/:id` | `eliminar.usuario`, `editar.usuario` | completo |
| ACC-010 | Restricción de acceso por día y horario | formulario de usuario · login · refresco de permisos | — | completo |
| ACC-011 | Dashboard: página, filtros Router/Sucursal y control por permisos | `/` · `dashboard` | `dashboard.*` | completo |
| ACC-012 | Tarjeta "Total de clientes / Total de servicios" | `/` | `dashboard.total_clientes` | completo |
| ACC-013 | Tarjeta "Total Facturas Pagadas" | `/` | `dashboard.facturas_pagadas` (+ depende de `dashboard.pagos_mes`) | completo |
| ACC-014 | Tarjeta "TRANSACCIONES HOY" | `/` | `dashboard.transacciones_hoy` | completo |
| ACC-015 | Tarjeta "Total Facturas No Pagadas" | `/` | `dashboard.facturas_no_pagadas` (+ depende de `dashboard.pagos_mes`) | completo |
| ACC-016 | Tarjeta "Resumen del Facturación" | `/` | `dashboard.resumen_facturacion` | completo |
| ACC-017 | Gráfico "Total de pagos por semana/mes" (con filtro de fecha) | `/` | `dashboard.pagos_mes` | completo |
| ACC-018 | Tabla "Últimos pagos registrados" | `/` | `dashboard.ultimos_pagos` | completo |
| ACC-019 | Tarjeta "Resumen del sistema" | `/` | `dashboard.resumen_sistema` | completo |
| ACC-020 | Gráfico "Tráfico Clientes — Últimos 7 días" | `/` | `dashboard.resumen_sistema` | completo |
| ACC-021 | Tabla "Clientes con mayor consumo" | `/` | `dashboard.resumen_sistema` | completo |
| ACC-022 | Tabla "Monitoreo de Red" en el panel | `/` | `index.monitoreo_red` + ajuste `mostrarMonitoreoDashboard` | completo |
| ACC-023 | Cabecera del layout (bienvenida, rol, tema oscuro, perfil / cambiar de empresa / cerrar sesión, aviso de firma electrónica, cierre por inactividad) | `MainLayout.vue` | ninguno | completo |
| ACC-024 | Menú lateral | `SideBarMenu.vue` | `validarPermisos`/`tieneAlguno` por ítem | completo |
| ACC-025 | Notificaciones (campana) y canal en vivo (WebSocket) | cabecera → campana | ninguno | completo |
| ACC-026 | Jornada y ubicación del técnico | cabecera (botón) · latido de ubicación | rol `TECNICO` (no es permiso) | completo |
| ACC-027 | Chip de plan de suscripción / licencia | cabecera; Ajustes → "Licencia" | ninguno | completo |
| ACC-028 | Chip "SRI" (estado del servicio) y reenvío automático de comprobantes | cabecera | `company.requiere_facturacion` + facturación electrónica activa | completo |
| ACC-029 | Widget "Enviando recordatorios" (progreso de envío) | flotante en todas las pantallas | ninguno | completo |
| ACC-030 | Empresa: datos, logo, firma electrónica | Ajustes → Empresa → pestaña "Empresa" · `/empresa/edit/:empresa_id` | `index.empresa`, `editar.empresa`, `ajuste.empresa` | completo |
| ACC-031 | Sucursales: listado, crear, editar, activar/inactivar, eliminar | Ajustes → Empresa → pestaña "Sucursales" | `index.sucursal`, `crear.sucursal`, `editar.sucursal`, `activar.inactivar.sucursal`, `eliminar.sucursal` | completo |
| ACC-032 | Resolución de la sucursal de cobro (cobros automáticos) | sin UI propia (API) | token de servicio o JWT | completo |
| ACC-033 | Servidor de correo (SMTP): configuración, prueba, interruptor | Ajustes → Mensajería; `/email/edit/:email_id` | `variables.config.servidor.correo`, `editar.correo` | completo |
| ACC-034 | "Obtener IP" (herramienta MikroTik; excluida del manual; el endpoint que llama no existe) | `/red/getIp` · `getIp` | ninguno en catálogo (solo SUPER-ADMIN) | completo |
| ACC-035 | Parámetros transversales: moneda, país, zona horaria, IVA, facturación electrónica | variables de entorno FE/BE | — | completo |
| ACC-036 | Tareas programadas y colas (cortes, facturas, promesas, ingresos/egresos) | endpoints `/programar-queue`, `/aplicar-cortes`, `/generar-facturas`, `/corte-config/*` | solo `@Auth()` | completo |
| ACC-037 | Logs (API de auditoría) | API `/logs` (UI en Ajustes → Logs, otro dominio) | `ver.logs` (solo FE) | completo |
| ACC-038 | Actualización del sistema (deploy) | Ajustes → Sistema · `POST /deploy` | solo e-mail fijo en FE; JWT o token de servicio en BE | completo |
| ACC-039 | Imágenes y archivos estáticos (logo, foto de perfil, SRI, uploads) | `/api/images/:file`, `/api/images-user`, `/api/uploads`, `/api/sri` | públicos | completo |
| ACC-040 | Caché Redis y consistencia (permisos, usuarios, resumen del sistema) | transversal | — | completo |
| ACC-041 | Recuperar la contraseña por correo (enlace de 15 min) | `/login` → "¿Olvidaste tu contraseña?" · `POST /auth/recuperar-password` | pública | completo (envío real ❓) |
| ACC-042 | "¿Olvidaste tu correo?": buscar la cuenta por celular o usuario | `/login` (cuadro de recuperación) · `POST /auth/recuperar-correo` | pública | completo |
| ACC-043 | Bloqueo automático por 5 intentos fallidos y reactivación al restablecer | `POST /auth/login` · `POST /auth/restablecer-password` | pública | completo |
| ACC-044 | Página pública de restablecimiento | `/restablecer-password` · `restablecer-password` | pública | completo |
| ACC-045 | Límite de peticiones ("Demasiadas peticiones…") | transversal (backend) | — | completo |

---

## ACC-001 · Inicio de sesión (login)
- **Ruta UI / name:** `/login` · `login` · pantalla pública (`meta.requiresAuth:false`, `FE:router/routes.ts:5-9`). El guard envía aquí a quien no tiene token válido (`FE:router/auth-guard.ts:158-163`).
- **Archivos:** FE: `pages/sesion/Login.vue`, `stores/auth-user.ts`, `boot/axios.ts`, `composables/useHelpers.js` · BE: `auth/auth.controller.ts:57-61`, `auth/auth.service.ts:339-400`, `auth/dto/login-user.dto.ts`, `companies/companies.controller.ts:62-67` (logo público), `app.controller.ts:17-22` (sirve `/api/images/:filename`).
- **Para qué sirve:** autenticar con correo y contraseña y entregar al navegador un JWT, la lista de permisos del usuario, sus routers y sus sucursales.
- **Acceso:** pública. No existe registro de cuentas; los usuarios los crea un administrador (ACC-007). Desde `zip-2026-10-14` hay recuperación de contraseña por correo (ACC-041/042/044) ✅.
- **Secciones:** carrusel de 3 imágenes a la izquierda (`/imgs/login_fon.webp`, `login_fon_2.webp`, `login_fon_3.webp`; se oculta en pantallas ≤768 px) y tarjeta de acceso a la derecha (`FE:pages/sesion/Login.vue:156-221`).
- **Textos fijos de la pantalla:** título `¡Bienvenido de nuevo!`, subtítulo `Accede a tu cuenta para continuar`, pie `Impulsado por InigualitySoft` (`Login.vue:176-177,218`). Logo: se pide `GET /companies/get-image/company` (público) y se muestra `/api/images/<logo>`; si no hay logo, `/imgs/logo_provisional.png` (`Login.vue:42-46`).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | `Iniciar sesión` | Envía `{email, password}` | pública | `POST /auth/login` | Ver reglas; en éxito guarda la sesión y recarga en `/` (`location.href='/'`, `Login.vue:98`) |
  | icono ojo (en Contraseña) | Muestra/oculta la contraseña | — | — | solo UI |
  | `Cambiar de empresa` (solo dentro de la app móvil ISPMAX) | Diálogo "Cambiar de empresa" · "La app se va a reiniciar y te va a pedir la dirección del panel." · botones `Cancelar` / `Cambiar` | — | puente nativo `cambiarIsp` | Solo si `window.Capacitor` expone el plugin `Ispmax` (`FE:composables/useAppIspmax.js:12-33`); muestra `Estás entrando a <host>` (`Login.vue:204-216`) |

- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | placeholder `Ingresa tu correo` | email | sí (`required`) | FE: `type=email`, `trim`; BE: `@IsEmail()` (`login-user.dto.ts:6-8`) | No se normaliza a minúsculas |
  | placeholder `Ingresa tu contraseña` | password | sí | BE: `@IsString @MinLength(6) @MaxLength(50)` (`login-user.dto.ts:10-17`); el backend aplica `trim()` antes de comparar (`auth.service.ts:369`) | |

- **Estados posibles:** cuenta `isActive` true/false; `deleted_at` nulo/no nulo (usuario eliminado ⇒ no se encuentra).
- **Reglas de negocio (backend):**
  1. Se busca por `user.email = :email` y `deleted_at IS NULL` (`auth.service.ts:362-364`). El e-mail se guarda en minúsculas (`BE:auth/entities/user.entity.ts:97-105`) y la consulta de login no lo convierte ⇒ escribirlo con mayúsculas no encuentra al usuario ✅ (comparación `=` de Postgres sensible a mayúsculas; ❓ confirmar en UI).
  2. Usuario inexistente **o** contraseña incorrecta ⇒ 401 `Usuario o contraseña incorrectos` (mismo texto; `auth.service.ts:372-378`). La contraseña se compara con bcrypt y se guarda con `bcrypt.hashSync(…,10)`. Con usuario existente y contraseña incorrecta se suma un intento fallido (ACC-043): el quinto responde otro texto.
  3. Después de validar la contraseña: si `isActive=false` ⇒ 401 `Su cuenta se encuentra inactiva, por favor comunicarse con su administrador` (`:372-374`).
  4. Luego se evalúa el horario (ACC-010) ⇒ 401 con el mensaje del horario (`:376-380`).
  5. En éxito: `logout=false` y se borra la caché `permisos:<id>` (`:390-391`); responde `{permisos, token, routers, sucursales}` (`:393-398`).
  6. ~~Sin bloqueo por intentos fallidos ni límite de peticiones~~ — **ya no es cierto** desde `zip-2026-10-14`: 5 fallos seguidos inactivan la cuenta (ACC-043) y hay límite de peticiones (ACC-045; `login` limitado por IP).
  7. El JWT lleva el usuario sin `password` ni `permisos`: `id, usuario, email, fullName, isActive, company{id,nombre_comercial,logo,requiere_facturacion,iva}, sucursales, roles, foto, routers` (`:344-361,388-395`). **No tiene `exp`** (`BE:auth/auth.module.ts:28-30`, `expiresIn` comentado).
- **Efectos secundarios (FE) al iniciar:** borra `isp/estados/<empresa>` y `auth/user/<empresa>` (`Login.vue:51-57`); `localStorage.clear(x)` **ignora el argumento y vacía todo el almacenamiento local** del sitio. Los stores Pinia se reescriben al mutar, pero las claves sueltas (`dashboard_modo_pagos`, `cert-aviso-cerrado:<empresa>`, `ispmax/aviso-ubicacion/<usuario>`, `dashboard_monitoreo_red_prefs`) se pierden en cada login ❓ confirmar en UI. Guarda: token, foto de perfil (`/api/images-user/<foto>` o `/default-user.png`), logo (`/api/images/<logo>` o `logo_provisional.png`), sucursales, routers y los permisos cifrados con AES (`Login.vue:69-96`). Si hay sucursales selecciona la primera (para quien tiene varias es "TODOS" = `null`); si hay routers, selecciona el primero (`:85-89`).
- **Efectos secundarios externos:** el login no envía nada; la recuperación (ACC-041) sí envía un correo desde la cuenta de correo del sistema.
- **Mensajes de error/éxito (texto exacto):** `Usuario o contraseña incorrectos` · `Cuenta inactivada por varios intentos fallidos. Use "¿Olvidaste tu contraseña?" para recuperarla o contacte a su administrador` (5.º fallo; `auth.service.ts:428`) · `Su cuenta se encuentra inactiva, por favor comunicarse con su administrador` (solo con la contraseña correcta; una contraseña incorrecta en una cuenta ya inactiva sigue diciendo `Usuario o contraseña incorrectos`) · `Demasiadas peticiones, espere unos segundos e intente de nuevo` (ACC-045) · mensajes de horario (ACC-010) · errores de DTO como lista `<ul>` con los textos por defecto de class-validator en inglés (`email must be an email`, `password must be longer than or equal to 6 characters`) ✅ (el DTO no define `message`). Se muestran con `notify` tipo `warning` (`Login.vue:100-104`; formato lista en `useHelpers.js:69-92`).
- **Relaciones con otros módulos:** ACC-002 (sesión), ACC-003 (permisos), ACC-010 (horario), ACC-026 (la jornada se retoma al abrir), ACC-039 (logo).
- **Casos límite y advertencias:**
  - Si el servidor no responde, `error.response` es `undefined`; la línea que muestra el aviso lanza un `TypeError` antes de `loading=false` y el botón queda cargando ✅ (`Login.vue:100-104`).
  - Contraseña de menos de 6 caracteres: el backend responde 400 por el DTO aunque la cuenta exista (no llega a comparar).
  - Una cuenta con rol ADMINISTRADOR/SUPER-ADMINISTRADOR ignora el horario (`auth.service.ts:115-122`).
  - El usuario `info@rednuevaconexion.net` está oculto del listado de usuarios y habilita la tarjeta "Sistema" (ACC-038) ✅.
- **Preguntas probables de usuarios:**
  1. "Me dice 'Usuario o contraseña incorrectos' y estoy seguro de mis datos" → revisar mayúsculas en el correo, espacios, y que el usuario no haya sido eliminado.
  2. "Olvidé mi contraseña, ¿cómo la recupero?" → "¿Olvidaste tu contraseña?" en el login (ACC-041); si el correo falla, un administrador edita el usuario y pone una nueva (ACC-007).
  3. "Dice que mi cuenta está inactiva" → un administrador la desactivó (ACC-009).
  4. "Dice 'Acceso denegado… Tu horario autorizado es…'" → ACC-010.
  5. "¿Se bloquea mi cuenta si fallo varias veces?" → sí: 5 contraseñas incorrectas seguidas la inactivan (ACC-043).
  6. "Entro y me devuelve al login" → token inválido o permisos vacíos; ver ACC-002.
  7. "¿Puedo entrar desde el celular?" → sí por navegador; la app ISPMAX pide la dirección del panel y permite "Cambiar de empresa".
  8. "¿Por qué cada vez que entro vuelve a salir el aviso del técnico o de la firma?" → el login limpia el almacenamiento local (ver efectos).
- **Pendiente de validar en UI:** ❓ comportamiento con e-mail en mayúsculas; ❓ que el botón no se desbloquea si no hay red; ❓ si `required`/`type=email` del navegador impide enviar antes del DTO.

---

## ACC-002 · Ciclo de sesión: JWT, expiración, inactividad, cierre y refresco de permisos
- **Ruta UI / name:** transversal; afecta a todas las rutas con `meta.requiresAuth`. Se llega al cierre desde la cabecera → foto de perfil → `Cerrar Sesión` (`FE:layouts/MainLayout.vue:100-102`).
- **Archivos:** FE: `router/auth-guard.ts`, `router/index.ts`, `boot/axios.ts`, `stores/auth-user.ts`, `layouts/MainLayout.vue`, `layouts/Notifications.vue`, `composables/useHelpers.js` · BE: `auth/strategies/jwt.strategy.ts`, `auth/auth.service.ts` (`obtenerPermisos`), `auth/auth.module.ts`.
- **Para qué sirve:** mantener o terminar la sesión del usuario y reflejar cambios de permisos, estado y horario sin que tenga que volver a entrar.
- **Acceso:** todo usuario autenticado.
- **Cómo se guarda la sesión:** store Pinia persistido en `localStorage['auth/user/<VITE_COMPANY_NAME>']` con `token`, `permisos` (cifrados AES con la clave `VITE_HOST_KEY_PERMISOS`, que viaja dentro del bundle ⇒ no es una barrera de seguridad ✅ `auth-guard.ts:28-31`, `Login.vue:95`), fotos, sucursales y preferencias de tablas (`auth-user.ts:49-245`).
- **Cada petición HTTP** añade `Authorization: Bearer <token>`, `rol-name: <roles[0]>` y `company-id: <empresa>` (`FE:boot/axios.ts:17-33`). **No hay interceptor de respuesta**: un 401 no redirige solo al login ✅.
- **Guard de navegación** (`auth-guard.ts`): lee el token, ejecuta `JWT.read`/`JWT.validate` (`:16-17`); sin token o con error ⇒ `/login` (`:158-163`). Si el store aún no tiene permisos (vacío o `'[]'`) redirige a `dashboard` (`:24-26`). Las rutas sin `meta.requiresAuth` pasan directo: **`/ingresos-egresos` no declara `meta`** y por eso entra sin pasar por el guard de sesión (`FE:router/routes.ts:56-61`) ✅ (las llamadas API igual exigen JWT).
- **Expiración:**
  - El backend firma sin `expiresIn` (`BE:auth/auth.module.ts:28-30`), por lo que el token **no caduca por tiempo** ✅; `JWT.validate` del cliente no puede invalidarlo por `exp` (❓ no se pudo leer la librería `jwt-client`).
  - En cada petición, `JwtStrategy.validate` consulta al usuario: inexistente ⇒ 401 `token no valido`; `isActive=false` ⇒ 401 `Usuario no activo, hable con su administrador` (`jwt.strategy.ts:34-60`). Desactivar o eliminar a un usuario corta sus llamadas API de inmediato.
- **Cierre por inactividad:** componente `v-idle` en `MainLayout` con `:duration="3000"` y eventos `mousemove, keydown, mousedown, touchstart, scroll`; al disparar `@idle` ejecuta `cerrarSesion` (`FE:layouts/MainLayout.vue:213-217`). En `v-idle` 1.0.3 `duration` se mide en **segundos** (`setInterval(idle, props.duration * 1000)`, `node_modules/v-idle/src/components/vidle.ts`) ✅ ⇒ **50 minutos** sin actividad, sin aviso previo (ver ACC-023).
- **`cerrarSesion`** (`FE:composables/useHelpers.js:29-46`): termina la jornada de la app (`terminarJornada`), resetea token/fotos/permisos/sucursales y routers del store, borra `isp/estados/<empresa>` y va a `/login` (con `?refresh=<ts>` y recarga completa cuando se fuerza).
- **Refresco de permisos y estado durante la sesión:** `obtenerPermisos()` se llama al montar el layout y **en cada cambio de ruta** (`MainLayout.vue:383-402,408-442`) ⇒ `GET /auth/obtener-permisos/:id`. Con la respuesta: (a) re-cifra y guarda `permisos`; (b) actualiza routers y sucursales; (c) si `!isActive` ⇒ `cerrarSesion()`; (d) si `logout` o `!esPermitido` ⇒ limpia `localStorage` y `cerrarSesion(true)`. La función no tiene `try/catch`.
- **Cierre remoto:** al desactivar un usuario (`PATCH /auth/edit/:id` con `isActive=false`) el backend avisa al servidor WebSocket con tipo `user_inactive`; el cliente cuyo id coincide cierra sesión (`BE:auth/auth.service.ts:214-219`, `FE:layouts/Notifications.vue:190-191`).
- **Reglas de negocio (backend):** ver ACC-010 (horario) y ACC-040 (caché de `obtenerPermisos`).
- **Efectos secundarios externos:** POST a `HOST_WEBSOCKET/api/enviar-notificacion/<id>/notificacion` al desactivar (servicio externo no incluido en el ZIP ❓).
- **Mensajes (texto exacto):** `token no valido`, `Usuario no activo, hable con su administrador` (BE) y los de horario (ACC-010).
- **Relaciones con otros módulos:** ACC-001, ACC-003, ACC-010, ACC-025 (WebSocket), ACC-026 (jornada), ACC-040.
- **Casos límite y advertencias:**
  - La caché `permisos:<id>` no expira (ACC-040): cambios de rol, horario o `esPermitido` pueden tardar en notarse.
  - El nombre, el rol y la foto de la cabecera se leen del JWT (`MainLayout.vue:275-290`), así que **no cambian hasta volver a iniciar sesión**.
  - Dos pestañas comparten el `localStorage`: cerrar sesión en una deja a la otra sin token en su siguiente navegación.
  - Respuestas 401 sin interceptor ⇒ pantallas con errores en consola y sin mensaje.
- **Preguntas probables de usuarios:**
  1. "¿Cuánto dura mi sesión?" → no caduca por tiempo; se cierra por inactividad (50 min) o al cerrar sesión.
  2. "Me sacó del sistema sin avisar" → inactividad, usuario desactivado, o fuera de horario (ACC-010).
  3. "Me cambiaron los permisos y no veo el cambio" → ACC-003/ACC-040.
  4. "¿Puedo abrir el sistema en dos computadoras?" → sí; no hay límite de sesiones en el código.
  5. "Cambié mi foto y no se actualiza" → ACC-008.
- **Pendiente de validar en UI:** ❓ que el `v-idle` cierre a los 50 min con la pestaña en segundo plano (no muestra cuenta regresiva); ❓ qué ve el usuario con un 401 sin interceptor; ❓ si `JWT.validate` rechaza tokens sin `exp`.

---

## ACC-003 · Modelo de roles y permisos y cómo se aplica
- **Ruta UI / name:** transversal; se administra en `/roles-permisos` (ACC-004) y `/usuarios` (ACC-006/007).
- **Archivos:** FE: `composables/useRolPermisos.js`, `router/auth-guard.ts`, `layouts/SideBarMenu.vue`, `pages/dashboard/usuarios/permisos/*.json`, `pages/dashboard/usuarios/components/ListPermisos.vue` · BE: `roles-and-permisos/*`, `auth/auth.service.ts`, `auth/guards/user-role/user-role.guard.ts`, `auth/decorators/auth.decorator.ts`.
- **Para qué sirve:** decidir qué pantallas, menús y botones ve cada usuario.
- **Modelo (datos):**
  - **Rol** = plantilla con nombre en MAYÚSCULAS y un arreglo de claves (`BE:roles-and-permisos/entities/roles-and-permiso.entity.ts`, tabla `roles-and-permisos`; DTO: `nombre` mínimo 3 caracteres que se pasa a mayúsculas, `permisos` arreglo de strings — `dto/create-roles-and-permiso.dto.ts:6-14`). La entidad no declara nombre único ❓.
  - **Usuario** (`users`) guarda: `roles[]`, `permisos[]` (copia propia), `routers[]`, `sucursales[]`, `horarios_dias[]`, `horarios_time[]`, `isActive`, `logout`, `deleted_at` (`BE:auth/entities/user.entity.ts:44-89`). La interfaz solo permite **un** rol por usuario y el sistema lee `roles[0]`.
  - Una **clave de permiso** es un texto libre. Hay dos familias: (a) **nombres de ruta** que el guard exige para entrar (`index.clientes`, `crear.usuario`…); (b) claves de acción que solo muestran/ocultan botones (`editar.rol`, `cliente.factura.anular`…). Catálogo completo en ACC-005.
- **Roles con significado especial en el código:**

  | Rol | Efecto |
  |---|---|
  | `SUPER-ADMINISTRADOR` | En FE: `validarPermisos` devuelve siempre `true` y el guard deja entrar a toda ruta (`useRolPermisos.js:15-17`, `auth-guard.ts:138`). En el formulario de usuario fuerza `routers=[null]` (todos), sin sucursales y marca todos los permisos (`FormUser.vue:113-114`, `ListPermisos.vue:106-116`). El nombre del rol no se puede editar ni borrar desde la UI (`FormRol.vue:53`, `roles-permisos/IndexPage.vue:142`). |
  | `ADMINISTRADOR` | Solo en BE: ignora el horario de acceso (`auth.service.ts:115-122`), ve **todos** los pagos en el Dashboard (`dashboard.service.ts:277,358,492,558`), ve promesas de pago de otros (`BE:promesas-pago/promesas-pago.service.ts:346`) y recibe las alertas de equipos caídos (`BE:monitoreo-dispositivos/monitoreo-dispositivos-notifier.service.ts:594`). En FE no tiene ningún privilegio: sus permisos vienen de la lista. |
  | `TECNICO` | No se puede eliminar el rol (`roles-permisos/IndexPage.vue:142`); habilita el botón de jornada y el latido de ubicación (ACC-026). |
  | `admin` (minúscula) | El backend busca usuarios con `'admin' = ANY(roles)` para las notificaciones de ONU no encontradas (ver Hallazgos) ✅. |

- **Cómo se aplica en el frontend:**
  1. **`validarPermisos('a, b')`**: descifra la lista de permisos del store, separa por comas y devuelve `true` si el usuario tiene **al menos una**; el literal `'sin-permiso'` siempre da `true` (no se usa en el código) (`FE:composables/useRolPermisos.js:8-35`). `tieneAlguno([...])` aplica lo mismo a un arreglo (`:37-39`). Ante un error devuelve `false`.
  2. **Guard de rutas** (`auth-guard.ts:135-155`): entra si `permisos.includes(to.name)` **o** `tienePermiso` (reglas especiales) **o** rol SUPER-ADMINISTRADOR **o** `to.name == 'dashboard'`; `editar.usuario.profile` siempre pasa (`:91-93`). Si no cumple, redirige a la **primera clave de `permisos` que contenga el texto `index`** (`:143-155`); si no hay ninguna ⇒ `/login`.
  3. **Reglas especiales del guard** (`:37-133`): `permisoPorRuta` (`router.add→crear.router`, `router.edit→editar.router`, `instalaciones.reportes→instalaciones.index`, `tickets.reportes→tickets.index`, `smartOLT_onu-view.index→smartOLT.index`, `ajuste.facturacion→variables.facturacion`, `index.categories→index.category`) y listas para Ajustes (tabla siguiente).
  4. **Menú y botones**: cada ítem/botón usa `v-if="validarPermisos('…')"` (ACC-024 y cada pantalla).
- **Rutas de Ajustes y qué clave(s) basta(n):**

  | Ruta · name | Claves que dejan entrar (`auth-guard.ts`) |
  |---|---|
  | `/ajustes` · `ajustes.index` | cualquiera de: `variables.dias-habilitados`, `variables.facturacion`, `variables.horario.cortes`, `variables.reintentos.mikrotik`, `variables.reintentos.smartOLT`, `variables.aplicar-cortes`, `variables.opciones-cortes`, las 7 `variables.ver.*` de plantillas, `variables.vincular.whatsApp`, `variables.config.servidor.correo`, `base-datos.campos`, `base-datos.cambios-masivos` (`:95-98`) |
  | `/ajustes/servicio` · `ajuste.servicio` | las 7 claves de "Servicios" (`variables.dias-habilitados`, `variables.facturacion`, `variables.horario.cortes`, `variables.reintentos.mikrotik`, `variables.reintentos.smartOLT`, `variables.aplicar-cortes`, `variables.opciones-cortes`) |
  | `/ajustes/smartolt` · `ajuste.smartolt` | `variables.reintentos.smartOLT`, `variables.opciones-cortes` |
  | `/ajustes/logs` · `ajuste.logs` | `ver.logs` |
  | `/ajustes/mensajeria` · `ajuste.mensajeria` | `variables.vincular.whatsApp`, `variables.config.servidor.correo` |
  | `/ajustes/base-datos` · `ajuste.base-datos` | `base-datos.campos`, `base-datos.cambios-masivos` |
  | `/ajustes/facturacion` · `ajuste.facturacion` | `variables.facturacion` |
  | `/ajustes/plantillas`, `/ajustes/empresa`, `/ajustes/forma-pago` | la clave de grupo `ajuste.plantillas`, `ajuste.empresa`, `ajuste.forma-pago` (el nombre de la ruta coincide) |
  | `/ajustes/pasarelas-pago`, `/ajustes/firma-electronica`, `/ajustes/sistema` | **ninguna clave del catálogo coincide** ⇒ solo SUPER-ADMINISTRADOR entra (aunque la tarjeta se muestre con otras claves, ver ACC-024) |

- **Rutas sin clave en el catálogo (solo SUPER-ADMINISTRADOR entra):** `mapa-clientes.index`, `email.edit`, `getIp`, `adminOLT.index`, `adminOLT.onu-detail`, `adminOLT.no-autorizadas`, `adminOLT.autorizar`, `personalizado.index`, `ajuste.pasarelas-pago`, `ajuste.firma-electronica`, `ajuste.sistema` ✅ (comparación de `routes.ts` con los JSON de permisos).
- **Cómo se aplica en el backend:** casi **no se aplica** ✅.
  - `@Auth()` = `AuthGuard('jwt')` + `UserRoleGuard`; este último solo comprueba que `req.user` exista (`BE:auth/guards/user-role/user-role.guard.ts:8-17`). `ValidRoles` (`admin|super-user|user`) no se usa para decidir (`auth/interfaces/valid-roles.ts`).
  - Excepciones que sí leen rol/permisos: Dashboard (admin ve todo, el resto solo lo suyo), `transacciones.service.ts:243-244` (`pagos-registrados.ver-otros`), `ubicacion-tecnicos.service.ts:121-127` (`mapa.tecnicos.index` o SUPER-ADMINISTRADOR; el propio código comenta que "en este sistema los permisos se validan del lado del panel", `:68-71`), `ingresos-egresos.service.ts:48-52`, `instalaciones.service.ts:766-767`, `ticket/visitas/tickets-visitas.service.ts:65`, `companies.service.ts:32`.
  - Consecuencia: cualquier usuario autenticado puede invocar por API acciones que la UI le oculta (p. ej. `DELETE /roles-and-permisos/:id`, `PATCH /auth/edit/:id` con otro rol, `POST /deploy`, `POST /aplicar-cortes`). Ver Hallazgos.
- **Qué pasa al cambiar los permisos de un rol con usuarios activos** ✅ (`BE:roles-and-permisos/roles-and-permisos.service.ts:52-68`, `BE:auth/auth.service.ts:264-284`):
  1. Se actualiza el rol y se lanza (sin `await`) `actualizarPermisosAUsuarios`. Para cada usuario cuyo `roles` contenga el nombre **anterior** del rol, el arreglo de permisos pasa a ser la **unión** de los suyos y los del rol (`:275`). **Quitar un permiso al rol NO se lo quita a los usuarios**; agregar sí se propaga.
  2. Si cambió el nombre, se renombra en `users.roles` (`:277-279`).
  3. No se limpia la caché `permisos:<id>` ni `usuarios:*` ⇒ los usuarios conectados siguen viendo lo anterior hasta que la caché se invalide (edición del propio usuario, nuevo login, alta/edición/baja de router o sucursal, o reinicio del backend). Cuando se invalida, el siguiente cambio de ruta les actualiza menú y botones sin cerrar sesión (ACC-002, ACC-040).
  4. Eliminar un rol **no** toca a los usuarios que lo tienen (`roles-and-permisos.service.ts:70-76`) y el backend no impide borrar `SUPER-ADMINISTRADOR` (solo la UI).
  5. El selector de rol en el formulario de usuario **reemplaza** los permisos del usuario por los del rol (`FormUser.vue:53-56,107-117`); los interruptores individuales pueden luego divergir.
- **Mensajes de error/éxito:** ver ACC-004/ACC-007.
- **Relaciones con otros módulos:** todos (cada pantalla consulta `validarPermisos`).
- **Casos límite y advertencias:**
  - `dashboard.ultimos_pago` (singular) en el menú vs `dashboard.ultimos_pagos` en el catálogo: un usuario con solo ese permiso no ve el ítem "Dashboard" (ACC-024).
  - La redirección de rechazo toma "la primera clave que contenga `index`", que puede no ser un nombre de ruta (p. ej. `servicio.index`, `resumen.index`, `cliente.ticket.index`, `finanzas.pagos-registrados.index`) ❓: el router lanza error por nombre desconocido.
  - El guard solo lee `to.name`; las claves de grupo (`Dashboard`, `Clientes`…) se guardan en los roles pero no se evalúan.
- **Preguntas probables de usuarios:**
  1. "Le di un permiso al rol y el usuario no lo ve" → ver caché/ACC-040; probar nuevo login.
  2. "Quité un permiso al rol y el usuario lo sigue teniendo" → la propagación es solo aditiva; editar al usuario.
  3. "¿Qué diferencia hay entre SUPER-ADMINISTRADOR y ADMINISTRADOR?" → solo el primero ignora la lista de permisos.
  4. "Un usuario ve el botón pero al entrar vuelve al inicio" → falta la clave de ruta (p. ej. `crear.router` para `router.add`).
  5. "¿Dónde configuro qué ve cada técnico?" → rol + permisos del usuario (ACC-004/007).
  6. "¿Un usuario sin permiso puede forzar la acción por URL/API?" → en la UI no; por API sí (ver Hallazgos).
- **Pendiente de validar en UI:** ❓ efecto visible de la redirección a clave `index` inexistente; ❓ si el rol `ADMINISTRADOR` existe como plantilla por defecto (no hay seed en el código); ❓ si hay roles duplicados en BD.

---

## ACC-004 · Roles y Permisos (listado, crear, editar, eliminar rol)
- **Ruta UI / name:** `/roles-permisos` · `index.rol` · Menú lateral → **Ajustes** → tarjeta **"Roles y Permisos"** (visible con `index.rol`; `FE:pages/dashboard/ajustes/IndexPage.vue:307-328`). No tiene ítem propio en el menú lateral.
- **Archivos:** FE: `pages/dashboard/roles-permisos/IndexPage.vue`, `components/FormRol.vue`, `composables/useRol.js`, `pages/dashboard/usuarios/components/ListPermisos.vue` · BE: `roles-and-permisos/roles-and-permisos.controller.ts`, `.service.ts`, `dto/create-roles-and-permiso.dto.ts`, `entities/roles-and-permiso.entity.ts`, `auth/auth.service.ts:264-284`.
- **Para qué sirve:** definir plantillas de permisos (roles) que luego se asignan a usuarios (ACC-007).
- **Acceso:** ruta exige `index.rol` (nombre de la ruta). Botones: `crear.rol`, `editar.rol`, `eliminar.rol`. SUPER-ADMINISTRADOR ve todo.
- **Secciones:** migas de pan `Inicio › Ajustes › Roles y permisos` (componente `q-breadcrumbs-ajustes`, `IndexPage.vue:58-61`); tabla **"Listado de Roles"**; diálogo del formulario.
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | `Agregar Rol` (en móvil: botón flotante `+`) | Abre el diálogo "Agregar Rol" | `crear.rol` | — | Oculto en pantallas muy angostas (usa el flotante) (`IndexPage.vue:95-101,164-175`) |
  | icono lápiz | Abre el diálogo "Editar Rol" con el rol seleccionado | `editar.rol` | — | |
  | icono papelera | Confirma y elimina | `eliminar.rol` | `DELETE /roles-and-permisos/:id` | Deshabilitado solo en la UI para `SUPER-ADMINISTRADOR` y `TECNICO` (`:142`); el backend no valida |
  | `Guardar` (alta) / `Editar` (edición) | Envía el rol | `crear.rol` / `editar.rol` | `POST /roles-and-permisos` / `PATCH /roles-and-permisos/:id` | Ver reglas |
  | `Buscar...` / icono pantalla completa | Filtra la tabla (debounce 300 ms) / maximiza | — | — | |

- **Campos de formulario (diálogo):**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | `Nombre del Rol:` | texto | sí | FE: se muestra en mayúsculas y con `trim` (`FormRol.vue:50-56`); BE: `@IsString @MinLength(3)` y `toUpperCase` (`create-roles-and-permiso.dto.ts:6-9`) | Deshabilitado al editar el rol `SUPER-ADMINISTRADOR` (`FormRol.vue:53`) |
  | `Selecciona algún permiso:` | árbol de interruptores (ACC-005) | sí, ≥ 1 | FE: `Debes seleccionar al menos 1 permiso` (`useRol.js:18`); BE: arreglo de strings (sin comprobar que existan en el catálogo) | Con nombre `SUPER-ADMINISTRADOR` se marcan todos y se bloquean |

- **Filtros y columnas de tabla:** columnas `#` (posición en la página), `Rol`, `Acciones`; 10 filas por página; orden del servidor: `created_at DESC` (`roles-and-permisos.service.ts:33-38`). Título de la tabla: `Listado de Roles`. Sin datos: `No se encontró registros`.
- **Estados posibles:** no hay estado activo/inactivo en los roles.
- **Reglas de negocio (backend):**
  - Crear: `INSERT` del rol (`:21-31`). Error `23505` ⇒ `BadRequest(detail)`; resto ⇒ 500 `Unexpected error, check server logs` (`:78-84`). La entidad no declara unicidad ❓.
  - Editar: actualiza el rol y propaga a usuarios **por unión** (ACC-003, `auth.service.ts:264-284`); el `await` no espera la propagación (`:58`), por lo que el mensaje de éxito puede aparecer antes de que termine.
  - Eliminar: borra la fila sin verificar usuarios asociados (`:70-76`).
  - Todos los métodos del controlador solo llevan `@Auth()` (`controller.ts:7`).
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** éxito `Rol agregado exitosamente` / `Rol editado exitosamente` (`useRol.js:31`) · eliminar: diálogo título `¿Deseas eliminar el rol <NOMBRE>?`, mensaje `Esta acción no se puede deshacer.`, botones `Eliminar`/`Cancelar`; éxito **`Ticket Eliminado`** (sic, copia de otro módulo) y error por defecto **`Fallo al eliminar el ticket`** (sic) (`IndexPage.vue:34-50`) · errores de listado `negative` con `error.response.data.message`.
- **Relaciones con otros módulos:** ACC-005, ACC-007 (el selector `Rol:` del usuario), ACC-003.
- **Casos límite y advertencias:**
  - Quitar permisos a un rol no se los quita a los usuarios que ya lo tienen (propagación aditiva).
  - Renombrar un rol renombra el rol en los usuarios; si quedan usuarios con el nombre anterior en `roles` (por ejemplo, tras eliminar el rol) siguen mostrando ese nombre.
  - El rol `SUPER-ADMINISTRADOR` y `TECNICO` se tratan por nombre exacto; si no existen en la tabla, la UI no los crea.
  - No hay confirmación de que el nombre sea único.
- **Preguntas probables de usuarios:**
  1. "¿Cómo creo un rol 'Cobrador' que solo vea Registrar pago y Transacciones?" → Agregar Rol, nombre, activar `registrar.pago`, `pagos-registrados.index`, etc.; luego asignarlo al usuario.
  2. "Edité el rol y el usuario no ve el cambio" → ACC-003/ACC-040.
  3. "¿Por qué no puedo borrar el rol TECNICO?" → bloqueado en la UI.
  4. "Borré un rol y mis usuarios siguen con ese nombre" → el backend no los reasigna.
  5. "¿Puedo tener dos roles en un usuario?" → la interfaz permite uno.
  6. "Al seleccionar SUPER-ADMINISTRADOR no puedo apagar permisos" → es intencional.
- **Pendiente de validar en UI:** ❓ roles preexistentes en BD y duplicados; ❓ qué se ve si el nombre ya existe; ❓ efecto visual del mensaje `Ticket Eliminado`.

---

## ACC-005 · Catálogo de permisos (selector por grupos)
- **Ruta UI / name:** componente `ListPermisos.vue`, usado en el diálogo de Roles (ACC-004) y en la columna derecha del formulario de Usuario (ACC-007, título **`Permisos:`**) y en "Mi Perfil" (solo lectura).
- **Archivos:** FE: `pages/dashboard/usuarios/components/ListPermisos.vue` y los 6 JSON `pages/dashboard/usuarios/permisos/{dashboard,gestion-red,gestion-clientes,gestion-finanzas,almacen,gestion-variables}-permisos.json`.
- **Para qué sirve:** elegir, con interruptores, qué claves de permiso tiene un rol o un usuario.
- **Acceso:** el que muestre el formulario contenedor; en `editar.usuario.profile` los interruptores están deshabilitados (`ListPermisos.vue:61-68`).
- **Secciones:** acordeón de 6 grupos (solo uno abierto a la vez), cada uno con cabecera `<Nombre>` y contador `Activos X/Y`: **Dashboard** (icono `home`), **Gestión de red** (`language`), **Gestión de clientes** (`manage_accounts`), **Finanzas** (`account_balance`), **Almacén** (`inventory_2`), **Ajustes** (`settings`) (`ListPermisos.vue:226-241,313-328,419-434,507-522,576-587,677-692`). Cada grupo muestra los botones `Quitar todos` y `Seleccionar todos` (deshabilitados con rol `SUPER-ADMINISTRADOR` o en Mi Perfil).
- **Reglas del selector:**
  - Un interruptor por cada **hoja**; hacer clic en la fila también lo alterna (`togglePermiso`, `:61-79`). Los nodos de agrupación no se alternan.
  - Los contadores `Activos X/Y` cuentan **todos** los valores del árbol, incluidos los nodos de agrupación (`obtenerTodosLosPermisos`, `:81-98,124-135`); `Seleccionar todos` y el rol SUPER-ADMINISTRADOR también guardan los valores de los nodos de agrupación (por eso aparecen claves como `Dashboard`, `Clientes`, `Resumen` dentro de los roles).
  - **Interruptores maestros** que habilitan a sus hijos: `cliente.edit` ("Clientes perfil(edición)"), `ajuste.plantillas` ("Plantillas"), `ajuste.empresa` ("Configurar empresa"), `ajuste.forma-pago` ("Configurar formas pago"). Mientras el maestro esté apagado, sus hijos aparecen deshabilitados (`:24-59`, `:637-661`).
  - Si el rol del formulario es `SUPER-ADMINISTRADOR`, el componente marca de inmediato **todos** los valores de los 6 JSON y bloquea los interruptores (`:100-116,149-156`).
- **Tamaño del catálogo** ✅: 283 valores únicos, de los cuales 228 son claves "hoja" (permiso real): Dashboard 8, Gestión de red 38, Gestión de clientes 63, Finanzas 42, Almacén 26, Ajustes 56 (hay 5 claves de Productos/Servicios repetidas entre Almacén y Finanzas).
- **Claves usadas en el código pero que NO están en el catálogo** (no se pueden conceder desde la UI; solo SUPER-ADMINISTRADOR las cumple) ✅: `adminOLT.index` (`SideBarMenu.vue:112,226`), `personalizado.index` (`SideBarMenu.vue:238`), `dashboard.ultimos_pago` (`SideBarMenu.vue:101`, error de tipeo del catálogo `dashboard.ultimos_pagos`), `editar.correo` (`emails/IndexPage.vue:182`), `detalles.cliente` (`clientes/cell_renders/ActionCellRenderer.vue:74,154`), `ver.equipo` (`equipos/IndexPage.vue:465`), `crear.persona33` (`personas/IndexPage.vue:287`, parece un typo de `crear.persona`), `variables.ver.cargo.recurrente` y `variables.edita.cargo.recurrente`, `variables.ver.plantilla.instalacion`, `variables.ver.plantilla.mensaje.documento` (`ajustes/plantillas/IndexPage.vue:98,200,215,220,276,297,304`).
- **Claves del catálogo sin ninguna comprobación en el FE** ✅ (búsqueda literal): `activar.inactivar.usuario` (el listado no tiene botón activar/inactivar; el estado se cambia editando), `cliente.factura.libre`, `variables.opciones-logs`.
- **Mapa clave ⇒ dónde se evalúa** (autogenerado con búsqueda literal de la clave en `src/`; "`router/routes.ts`" indica que el nombre de la ruta coincide y el guard exige la clave; los nombres de archivo van relativos a `pages/dashboard/` salvo `layouts/`, `router/`, `composables/`):

#### Grupo «Dashboard» (`dashboard-permisos.json`)

| Clave | Etiqueta en pantalla | Ubicación en el árbol | Dónde se evalúa en el FE (archivo:línea) |
|---|---|---|---|
| `Dashboard` | Dashboard *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `dashboard.total_clientes` | Mostrar Clientes y Servicios | Dashboard | `layouts/SideBarMenu.vue:94`; `panel/IndexPage.vue:48` |
| `dashboard.facturas_pagadas` | Total Facturas Pagadas | Dashboard | `layouts/SideBarMenu.vue:95`; `panel/IndexPage.vue:50` |
| `dashboard.transacciones_hoy` | Transacciones de Hoy | Dashboard | `layouts/SideBarMenu.vue:96`; `panel/IndexPage.vue:52` |
| `dashboard.facturas_no_pagadas` | Total Facturas No Pagadas | Dashboard | `layouts/SideBarMenu.vue:97`; `panel/IndexPage.vue:54`; `panel/components/ResumenFacturacion.vue:90,172` |
| `dashboard.resumen_facturacion` | Resumen de Facturación | Dashboard | `layouts/SideBarMenu.vue:98`; `panel/IndexPage.vue:56` |
| `dashboard.pagos_mes` | Total de Pagos por Mes(grafico) | Dashboard | `layouts/SideBarMenu.vue:99`; `panel/IndexPage.vue:59` |
| `dashboard.resumen_sistema` | Resumen del sistema | Dashboard | `layouts/SideBarMenu.vue:100`; `panel/IndexPage.vue:65,67,74` |
| `dashboard.ultimos_pagos` | Ver ultimos pagos agregados | Dashboard | `panel/IndexPage.vue:63` |

#### Grupo «Gestión de red» (`gestion-red-permisos.json`)

| Clave | Etiqueta en pantalla | Ubicación en el árbol | Dónde se evalúa en el FE (archivo:línea) |
|---|---|---|---|
| `Routers` | Routers *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.routers` | Ver | Routers | `layouts/SideBarMenu.vue:113,130,135`; `Gestion-Red/routers/composables/useRouter.js:126`; `router/routes.ts:166` |
| `crear.router` | Crear | Routers | `Gestion-Red/routers/IndexPage.vue:463,815`; `router/auth-guard.ts:82` |
| `editar.router` | Editar | Routers | `Gestion-Red/routers/IndexPage.vue:618,681`; `router/auth-guard.ts:83` |
| `activar.inactivar.router` | Activar/Inactivar | Routers | `Gestion-Red/routers/IndexPage.vue:730,750` |
| `eliminar.router` | Eliminar | Routers | `Gestion-Red/routers/IndexPage.vue:762` |
| `reparar.router` | Reparar | Routers | `Gestion-Red/routers/IndexPage.vue:416,418,641` |
| `ping.router` | Ping | Routers | `Gestion-Red/routers/IndexPage.vue:416,662` |
| `Redes IPV4` | Redes IPV4 *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.red_ipv4` | Ver | Redes IPV4 | `layouts/SideBarMenu.vue:114,142,147`; `Gestion-Red/redes-ipv4/components/FormRedIpv4.vue:671`; `Gestion-Red/redes-ipv4/composables/useRedIpv4.js:137`; `router/routes.ts:280` |
| `crear.red_ipv4` | Crear | Redes IPV4 | `Gestion-Red/redes-ipv4/IndexPage.vue:280,281,563`; `router/routes.ts:286` |
| `editar.red_ipv4` | Editar | Redes IPV4 | `Gestion-Red/redes-ipv4/IndexPage.vue:471,482,485`; `router/routes.ts:292` |
| `activar.inactivar.red_ipv4` | Activar/Inactivar | Redes IPV4 | `Gestion-Red/redes-ipv4/IndexPage.vue:499,510` |
| `eliminar.red_ipv4` | Eliminar | Redes IPV4 | `Gestion-Red/redes-ipv4/IndexPage.vue:520` |
| `Redes IPV6` | Redes IPV6 *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `redesIpv6.index` | Ver | Redes IPV6 | `layouts/SideBarMenu.vue:115,154,159`; `Gestion-Red/redes-ipv6/components/FormRedIpv6.vue:213`; `Gestion-Red/redes-ipv6/composables/useRedIpv6.js:122`; `router/routes.ts:298` |
| `crear.red_ipv6` | Crear | Redes IPV6 | `Gestion-Red/redes-ipv6/IndexPage.vue:204,205,443`; `router/routes.ts:304` |
| `redesIpv6.edit` | Editar | Redes IPV6 | `Gestion-Red/redes-ipv6/IndexPage.vue:304,309`; `router/routes.ts:310` |
| `activar.inactivar.red_ipv6` | Activar/Inactivar | Redes IPV6 | `Gestion-Red/redes-ipv6/IndexPage.vue:340` |
| `eliminar.red_ipv6` | Eliminar | Redes IPV6 | `Gestion-Red/redes-ipv6/IndexPage.vue:322` |
| `Planes` | Planes *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.planes` | Ver | Planes | `layouts/SideBarMenu.vue:116,166,171`; `Gestion-Red/internet/composables/useInternet.js:333`; `router/routes.ts:238` |
| `crear.planes` | Crear | Planes | `Gestion-Red/internet/IndexPage.vue:197,198,454`; `router/routes.ts:244` |
| `editar.planes` | Editar | Planes | `Gestion-Red/internet/IndexPage.vue:354,357,369`; `router/routes.ts:250` |
| `activar.inactivar.planes` | Activar/Inactivar | Planes | `Gestion-Red/internet/IndexPage.vue:384,397` |
| `eliminar.planes` | Eliminar | Planes | `Gestion-Red/internet/IndexPage.vue:409` |
| `Cajas Nap` | Cajas Nap *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.caja_nap` | Ver | Cajas Nap | `layouts/SideBarMenu.vue:117,178,183`; `Gestion-Red/cajas-nap/components/FormNap.vue:297`; `Gestion-Red/cajas-nap/composables/useNap.js:91`; `router/routes.ts:256` |
| `crear.caja_nap` | Crear | Cajas Nap | `Gestion-Red/cajas-nap/IndexPage.vue:339,340,358`; `router/routes.ts:262` |
| `editar.caja_nap` | Editar | Cajas Nap | `Gestion-Red/cajas-nap/IndexPage.vue:538,541`; `router/routes.ts:268` |
| `activar.inactivar.caja_nap` | Activar/Inactivar | Cajas Nap | `Gestion-Red/cajas-nap/IndexPage.vue:554,565` |
| `eliminar.caja_nap` | Eliminar | Cajas Nap | `Gestion-Red/cajas-nap/IndexPage.vue:575` |
| `SmartOLT` | SmartOLT *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `smartOLT.index` | Ver | SmartOLT | `layouts/SideBarMenu.vue:120,214,219`; `Gestion-Red/smartOLT/components/Authorize/IndexPage.vue:218`; `Gestion-Red/smartOLT/components/Onus/components/DeleteOnuModal.vue:71`; `Gestion-Red/smartOLT/components/Unconfigured/IndexPage.vue:153` (+2 archivos) |
| `smartOLT_unconfigured.index` | Ver onus no configuradas | SmartOLT | `Gestion-Red/smartOLT/components/CardsInfoSmartOLT/CardInfo.vue:54,58`; `Gestion-Red/smartOLT/components/Unconfigured/IndexPage.vue:31`; `router/routes.ts:196` |
| `smartOLT.authorize` | Autorizar onus | SmartOLT | `clientes/components/editar/Servicios/VincularOnu.vue:165`; `Gestion-Red/smartOLT/components/Authorize/IndexPage.vue:479`; `Gestion-Red/smartOLT/components/Unconfigured/IndexPage.vue:61,80`; `router/routes.ts:202` |
| `smartOLT.vincular_cliente` | Vincular clientes | SmartOLT | `Gestion-Red/smartOLT/components/Authorize/IndexPage.vue:465`; `Gestion-Red/smartOLT/components/Onus/IndexPageOnus.vue:363` |
| `smartOLT.habilitar_desabilitar_onu` | Habilitar/Desabilitar ONU | SmartOLT | `Gestion-Red/smartOLT/components/Onus/IndexPageOnus.vue:393` |
| `smartOLT.reiniciar_onu` | Reiniciar ONU | SmartOLT | `Gestion-Red/smartOLT/components/Onus/IndexPageOnus.vue:383` |
| `smartOLT.eliminar_onu` | Eliminar ONU | SmartOLT | `Gestion-Red/smartOLT/components/Onus/IndexPageOnus.vue:410` |
| `Ver Mapa` | Ver Mapa *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.mapa` | Ver Mapa | Ver Mapa | `layouts/SideBarMenu.vue:118,190,195`; `router/routes.ts:274` |
| `editar.red.mapa` | Editar red (postes, líneas y mover elementos) | Ver Mapa | `Gestion-Red/mapa-nap/IndexPage.vue:1217,4389` |
| `mapa.tecnicos.index` | Ver ubicación de los técnicos | Ver Mapa | `Gestion-Red/mapa-nap/IndexPage.vue:3611` |
| `Monitoreo de Red` | Monitoreo de Red *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.monitoreo_red` | Ver | Monitoreo de Red | `layouts/SideBarMenu.vue:119,202,207`; `panel/IndexPage.vue:71,141`; `router/routes.ts:184` |

#### Grupo «Gestión de clientes» (`gestion-clientes-permisos.json`)

| Clave | Etiqueta en pantalla | Ubicación en el árbol | Dónde se evalúa en el FE (archivo:línea) |
|---|---|---|---|
| `Clientes` | Clientes *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.clientes` | Ver | Clientes | `layouts/SideBarMenu.vue:255,266,271`; `clientes/composables/useCliente.js:627`; `panel/components/TotalFacturasNoPagadas.vue:26`; `router/routes.ts:94` |
| `crear.cliente` | Crear | Clientes | `clientes/IndexPage.vue:298,299,529`; `instalaciones/EditInstalacion.vue:126`; `router/routes.ts:106` |
| `retirar.cliente` | Retirar | Clientes | `clientes/IndexPage.vue:112,115`; `clientes/cell_renders/ActionCellRenderer.vue:62,138` |
| `cliente.activar.inactivar` | Activar/Suspender | Clientes | `clientes/IndexPage.vue:98,105`; `clientes/cell_renders/ActionCellRenderer.vue:43,118` |
| `eliminar.cliente` | Eliminar | Clientes | `clientes/IndexPage.vue:112,122`; `clientes/cell_renders/ActionCellRenderer.vue:31,103` |
| `cliente.edit` | Clientes perfil(edición) *(grupo)* | — | `layouts/Notifications.vue:173,197,232`; `ajustes/mensajeria/components/mensajes-masivos/MensajesEnviados.vue:370`; `ajustes/servicios/components/LogsGenerales.vue:522`; `ajustes/smartOLT/IndexPage.vue:534,590` (+30 archivos) |
| `Resumen` | Resumen *(grupo)* | Clientes perfil(edición) | (nodo de agrupación; no se evalúa) |
| `resumen.index` | Ver datos cliente | Clientes perfil(edición) > Resumen | `clientes/components/editar/IndexPage.vue:33,62,112` |
| `resumen.editar_cliente` | Editar datos cliente | Clientes perfil(edición) > Resumen | `clientes/components/editar/ResumenPage.vue:567` |
| `resumen.notificaciones` | Ver resumen notificaciones | Clientes perfil(edición) > Resumen | `clientes/components/editar/ResumenPage.vue:413` |
| `Servicios` | Servicios *(grupo)* | Clientes perfil(edición) | (nodo de agrupación; no se evalúa) |
| `servicio.index` | Ver servicios | Clientes perfil(edición) > Servicios | `clientes/components/editar/IndexPage.vue:34,68,74` |
| `servicio.agregar` | Agregar servicio | Clientes perfil(edición) > Servicios | `clientes/components/editar/ServiciosPage.vue:258` |
| `servicio.vincular.onu` | Vincular ONU | Clientes perfil(edición) > Servicios | `clientes/components/editar/ServiciosPage.vue:395,407,422` |
| `servicio.bienvenida` | Enviar msg bienvenida | Clientes perfil(edición) > Servicios | `clientes/components/editar/ServiciosPage.vue:447,582` |
| `servicio.editar` | Editar servicio | Clientes perfil(edición) > Servicios | `clientes/components/editar/ServiciosPage.vue:470,599` |
| `servicio.retirar` | Retirar servicio | Clientes perfil(edición) > Servicios | `clientes/components/editar/ServiciosPage.vue:495,619` |
| `servicio.activar.suspender` | Activar/Suspender | Clientes perfil(edición) > Servicios | `clientes/components/editar/ServiciosPage.vue:514,633` |
| `Tickets_cliente` | Tickets *(grupo)* | Clientes perfil(edición) | (nodo de agrupación; no se evalúa) |
| `cliente.ticket.index` | Ver | Clientes perfil(edición) > Tickets | `clientes/components/editar/IndexPage.vue:35,80,135` |
| `cliente.ticket.agregar` | Agregar ticket | Clientes perfil(edición) > Tickets | `clientes/components/editar/Servicios/TicketsPage.vue:166` |
| `cliente.ticket.editar` | Editar ticket | Clientes perfil(edición) > Tickets | `clientes/components/editar/Servicios/TicketsPage.vue:236` |
| `cliente.ticket.eliminar` | Eliminar | Clientes perfil(edición) > Tickets | `clientes/components/editar/Servicios/TicketsPage.vue:258` |
| `cliente.ticket.reenviar_msg` | reenviar msg notif. | Clientes perfil(edición) > Tickets | `clientes/components/editar/Servicios/TicketsPage.vue:279` |
| `cliente.ticket.asignar_otros` | Asignar a otros | Clientes perfil(edición) > Tickets | `tickets/components/FormTicket.vue:42` |
| `Documentos` | Documentos *(grupo)* | Clientes perfil(edición) | (nodo de agrupación; no se evalúa) |
| `Contrato` | Contrato *(grupo)* | Clientes perfil(edición) > Documentos | (nodo de agrupación; no se evalúa) |
| `cliente.contrato.index` | Ver | Clientes perfil(edición) > Documentos > Contrato | `clientes/components/editar/IndexPage.vue:36,86,143`; `clientes/components/editar/Servicios/DocumentPage.vue:30` |
| `cliente.contrato.agregar` | Agregar contrato | Clientes perfil(edición) > Documentos > Contrato | `clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue:402` |
| `cliente.contrato.editar` | Editar contrato | Clientes perfil(edición) > Documentos > Contrato | `clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue:442` |
| `cliente.contrato.eliminar` | Eliminar contrato | Clientes perfil(edición) > Documentos > Contrato | `clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue:520` |
| `cliente.contrato.descargar` | Descargar contrato | Clientes perfil(edición) > Documentos > Contrato | `clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue:505` |
| `cliente.contrato.notificacion` | enviar msg contrato | Clientes perfil(edición) > Documentos > Contrato | `clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue:457` |
| `Documento` | Documento *(grupo)* | Clientes perfil(edición) > Documentos | (nodo de agrupación; no se evalúa) |
| `cliente.documento.index` | Ver documentos | Clientes perfil(edición) > Documentos > Documento | `clientes/components/editar/IndexPage.vue:37,86,143`; `clientes/components/editar/Servicios/DocumentPage.vue:32` |
| `cliente.documento.agregar` | Agregar documento | Clientes perfil(edición) > Documentos > Documento | `clientes/components/editar/Servicios/Contratos_Pdf/Documentos.vue:139` |
| `cliente.documento.editar` | Editar documento | Clientes perfil(edición) > Documentos > Documento | `clientes/components/editar/Servicios/Contratos_Pdf/Documentos.vue:198` |
| `cliente.documento.eliminar` | Eliminar documento | Clientes perfil(edición) > Documentos > Documento | `clientes/components/editar/Servicios/Contratos_Pdf/Documentos.vue:240` |
| `cliente.documento.descargar` | Descargar documento | Clientes perfil(edición) > Documentos > Documento | `clientes/components/editar/Servicios/Contratos_Pdf/Documentos.vue:226` |
| `cliente.documento.notificacion` | enviar msg documento | Clientes perfil(edición) > Documentos > Documento | `clientes/components/editar/Servicios/Contratos_Pdf/Documentos.vue:212` |
| `Facturación/Pagos` | Facturación/Pagos *(grupo)* | Clientes perfil(edición) | (nodo de agrupación; no se evalúa) |
| `Facturas` | Facturas *(grupo)* | Clientes perfil(edición) > Facturación/Pagos | (nodo de agrupación; no se evalúa) |
| `cliente.factura.index` | Ver | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/FacturacionPagos.vue:27,56`; `clientes/components/editar/IndexPage.vue:38,92,151` |
| `cliente.factura.libre` | Agregar factura libre | Clientes perfil(edición) > Facturación/Pagos > Facturas | ❓ sin referencia literal en el FE |
| `cliente.factura.servicio` | Agregar factura servicio | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/IndexFacturas.vue:682` |
| `cliente.factura.add` | Agregar pago | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/IndexFacturas.vue:693,929,956` |
| `cliente.send.recordatorio` | Enviar recordatorio pago | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/IndexFacturas.vue:1070,1346` |
| `cliente.factura.edit` | Editar pago | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/PagoItem.vue:466` |
| `cliente.factura.anular` | Anular pago | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/IndexFacturas.vue:1119,1218,1398` |
| `cliente.cancelar.pago` | Cancelar pago | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/IndexFacturas.vue:1183,1437`; `clientes/components/editar/PagoItem.vue:652` |
| `cliente.factura.eliminar` | Eliminar factura | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/IndexFacturas.vue:1095,1366` |
| `cliente.factura.imprimir` | Imprimir pago | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/IndexFacturas.vue:1157,1415`; `clientes/components/editar/PagoItem.vue:512` |
| `cliente.factura.descargar` | Descargar comprobantes | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/PagoItem.vue:529` |
| `cliente.factura.reenviar` | Reenviar comprobantes | Clientes perfil(edición) > Facturación/Pagos > Facturas | `clientes/components/editar/PagoItem.vue:615` |
| `Configuración` | Configuración *(grupo)* | Clientes perfil(edición) > Facturación/Pagos | (nodo de agrupación; no se evalúa) |
| `cliente.factura.configuracion.index` | Ver | Clientes perfil(edición) > Facturación/Pagos > Configuración | `clientes/components/editar/FacturacionPagos.vue:33,39,45`; `clientes/components/editar/GruposFacturacion.vue:33`; `clientes/components/editar/IndexPage.vue:39,92,151` |
| `cliente.factura.configuracion.edit` | Editar configuración | Clientes perfil(edición) > Facturación/Pagos > Configuración | `clientes/components/FactAndNot.vue:601` |
| `Logs` | Logs *(grupo)* | Clientes perfil(edición) | (nodo de agrupación; no se evalúa) |
| `cliente.logs.index` | Ver | Clientes perfil(edición) > Logs | `clientes/components/editar/IndexPage.vue:40,98,158` |
| `Tickets` | Tickets *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `tickets.index` | Ver | Tickets | `layouts/SideBarMenu.vue:256,277,282`; `tickets/ReportesPage.vue:43`; `tickets/composables/useTicket.js:198`; `router/auth-guard.ts:85` (+1 archivos) |
| `tickets.ver_otros` | Ver de otros | Tickets | `tickets/IndexPage.vue:57`; `tickets/composables/useTicket.js:298` |
| `tickets.add` | Crear | Tickets | `tickets/IndexPage.vue:291,292`; `router/routes.ts:328` |
| `tickets.edit` | Editar | Tickets | `clientes/components/editar/Servicios/TicketsPage.vue:243`; `tickets/IndexPage.vue:555,561,618`; `tickets/components/DetalleTicket.vue:212`; `tickets/components/FormTicket.vue:654,655,660` (+2 archivos) |
| `ticket.delete` | Eliminar | Tickets | `tickets/IndexPage.vue:575` |
| `ticket.reenviar_msg` | reenviar msg notif. | Tickets | `tickets/IndexPage.vue:597` |
| `tickets.asignar_otros` | Asignar a otros | Tickets | `tickets/components/FormTicket.vue:42` |
| `tickets.cambiar_estado_otros` | Cambiar estado de otros | Tickets | `tickets/components/DetalleTicket.vue:34` |
| `Instalaciones` | Instalaciones *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `instalaciones.index` | Ver | Instalaciones | `layouts/SideBarMenu.vue:257,288,293`; `instalaciones/ReportesPage.vue:9`; `instalaciones/composables/useInstalaciones.js:171`; `router/auth-guard.ts:84` (+1 archivos) |
| `instalaciones.add` | Crear | Instalaciones | `instalaciones/Indexpage.vue:282,284`; `router/routes.ts:346` |
| `instalaciones.edit` | Editar | Instalaciones | `clientes/components/editar/RecursosCliente.vue:112`; `clientes/composables/useCliente.js:625`; `clientes/composables/useServicios.js:105`; `instalaciones/Indexpage.vue:458,460` (+3 archivos) |
| `instalaciones.delete` | Eliminar | Instalaciones | `instalaciones/Indexpage.vue:468` |
| `instalaciones.notificar` | Notificar | Instalaciones | `instalaciones/Indexpage.vue:478` |
| `instalaciones.imprimir` | Imprimir | Instalaciones | `instalaciones/Indexpage.vue:492` |
| `instalaciones.completar` | Completar (crea cliente/servicio) | Instalaciones | `instalaciones/EditInstalacion.vue:73` |

#### Grupo «Finanzas» (`gestion-finanzas-permisos.json`)

| Clave | Etiqueta en pantalla | Ubicación en el árbol | Dónde se evalúa en el FE (archivo:línea) |
|---|---|---|---|
| `Registrar pago / Promesas pago` | Registrar pago / Promesas pago *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `Registrar pago` | Registrar pago *(grupo)* | Registrar pago / Promesas pago | (nodo de agrupación; no se evalúa) |
| `registrar.pago` | Agregar pago | Registrar pago / Promesas pago > Registrar pago | `layouts/Notifications.vue:176,227`; `layouts/SideBarMenu.vue:23,312`; `registrar-pago/TabsIndex.vue:26,44`; `registrar-pago/components/PayComponent.vue:1077` (+1 archivos) |
| `registrar.promesa-pago` | Agregar Promesa pago | Registrar pago / Promesas pago > Registrar pago | `layouts/SideBarMenu.vue:23,313`; `registrar-pago/TabsIndex.vue:26,44`; `registrar-pago/components/FormPromisePay.vue:524` |
| `Ver pagos registrados` | Ver pagos registrados *(grupo)* | Registrar pago / Promesas pago | (nodo de agrupación; no se evalúa) |
| `finanzas.pagos-registrados.index` | Ver | Registrar pago / Promesas pago > Ver pagos registrados | `layouts/SideBarMenu.vue:23,314`; `registrar-pago/TabsIndex.vue:31,51` |
| `finanzas.pagos-registrados.imprimir` | imprimir | Registrar pago / Promesas pago > Ver pagos registrados | `transacciones/ActionCellRenderer.vue:18,35,103` |
| `finanzas.pagos-registrados.editar` | editar | Registrar pago / Promesas pago > Ver pagos registrados | `transacciones/ActionCellRenderer.vue:63,167` |
| `finanzas.pagos-registrados.eliminar` | eliminar | Registrar pago / Promesas pago > Ver pagos registrados | `transacciones/ActionCellRenderer.vue:78,187` |
| `Promesas de pago` | Promesas de pago *(grupo)* | Registrar pago / Promesas pago | (nodo de agrupación; no se evalúa) |
| `promesa-pago.index` | Ver | Registrar pago / Promesas pago > Promesas de pago | `layouts/SideBarMenu.vue:23,315`; `promesas-pago/IndexPage.vue:164`; `registrar-pago/TabsIndex.vue:36,58`; `router/routes.ts:28` |
| `promesa-pago.crear` | crear | Registrar pago / Promesas pago > Promesas de pago | `clientes/components/editar/IndexFacturas.vue:978,1283`; `promesas-pago/IndexPage.vue:316,496` |
| `promesa-pago.editar` | editar | Registrar pago / Promesas pago > Promesas de pago | `promesas-pago/IndexPage.vue:449` |
| `promesa-pago.eliminar` | eliminar | Registrar pago / Promesas pago > Promesas de pago | `promesas-pago/IndexPage.vue:463` |
| `Personas` | Personas *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.personas` | Ver | Personas | `layouts/SideBarMenu.vue:35,317`; `router/routes.ts:124` |
| `crear.persona` | Crear | Personas | `personas/IndexPage.vue:134` |
| `editar.persona` | Editar | Personas | `personas/IndexPage.vue:222` |
| `activar.inactivar.personas` | Activar/Inactivar | Personas | `personas/IndexPage.vue:233,244` |
| `eliminar.persona` | Eliminar | Personas | `personas/IndexPage.vue:256` |
| `Facturas` | Ventas *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.facturas_libre` | Ver | Ventas | `layouts/Notifications.vue:181,230`; `layouts/SideBarMenu.vue:41,318`; `ingresos-egresos/components/ResumenCards.vue:24`; `router/routes.ts:64` |
| `crear.factura` | Crear | Ventas | `ventas/IndexPage.vue:377,658`; `router/routes.ts:82` |
| `anular.factura` | Anular | Ventas | `ventas/IndexPage.vue:597` |
| `eliminar.factura` | Eliminar | Ventas | `ventas/IndexPage.vue:543` |
| `imprimir.factura` | Imprimir | Ventas | `ventas/IndexPage.vue:564` |
| `reenviar.factura` | Reenviar comprob. | Ventas | `ventas/IndexPage.vue:518` |
| `Productos/Servicios` | Productos/Servicios *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.productos` | Ver | Productos/Servicios | `layouts/SideBarMenu.vue:344,379,384`; `router/routes.ts:118` |
| `crear.productos` | Crear | Productos/Servicios | `productos/IndexPage.vue:254,489` |
| `editar.productos` | Editar | Productos/Servicios | `productos/IndexPage.vue:313` |
| `activar.inactivar.productos` | Activar/Inactivar | Productos/Servicios | `productos/IndexPage.vue:324,335` |
| `ajustar.stock` | Ajustar stock | Productos/Servicios | `productos/IndexPage.vue:375` |
| `eliminar.productos` | Eliminar | Productos/Servicios | `productos/IndexPage.vue:347` |
| `Transacciones` | Transacciones *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `pagos-registrados.index` | Ver | Transacciones | `layouts/Notifications.vue:202`; `layouts/SideBarMenu.vue:47,319`; `panel/components/TotalFacturasPagadas.vue:25`; `panel/components/TransaccionesHoy.vue:35` (+2 archivos) |
| `pagos-registrados.imprimir` | imprimir | Transacciones | `transacciones/ActionCellRenderer.vue:19,36,104` |
| `pagos-registrados.editar` | editar | Transacciones | `transacciones/ActionCellRenderer.vue:64,168` |
| `pagos-registrados.eliminar` | eliminar | Transacciones | `transacciones/ActionCellRenderer.vue:79,188` |
| `pagos-registrados.ver-otros` | Ver de otros operadores | Transacciones | `transacciones/IndexPage.vue:467,648` |
| `Cobros por pasarela` | Cobros por pasarela *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `cobros-pasarela.index` | Ver | Cobros por pasarela | `layouts/SideBarMenu.vue:53`; `router/routes.ts:76` |
| `Ingresos / Egresos` | Ingresos / Egresos *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.ingresos_egresos` | Ver | Ingresos / Egresos | `layouts/SideBarMenu.vue:29,316`; `router/routes.ts:58` |
| `crear.ingresos_egresos` | Crear | Ingresos / Egresos | `ingresos-egresos/IndexPage.vue:155,403` |
| `editar.ingresos_egresos` | Editar | Ingresos / Egresos | `ingresos-egresos/IndexPage.vue:366` |
| `eliminar.ingresos_egresos` | Eliminar | Ingresos / Egresos | `ingresos-egresos/IndexPage.vue:375` |
| `reporte.ingresos_egresos` | Descargar reporte | Ingresos / Egresos | `ingresos-egresos/IndexPage.vue:163` |
| `Conciliación bancaria` | Conciliación bancaria *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `conciliacion-bancaria.index` | Ver | Conciliación bancaria | `layouts/SideBarMenu.vue:59,320`; `router/routes.ts:466` |
| `conciliacion-bancaria.conciliar` | Conciliar (subir PDF) | Conciliación bancaria | `conciliacion-bancaria/IndexPage.vue:585,601,747` |
| `conciliacion-bancaria.exportar` | Exportar reportes | Conciliación bancaria | `conciliacion-bancaria/IndexPage.vue:775,785` |
| `conciliacion-bancaria.eliminar` | Eliminar | Conciliación bancaria | `conciliacion-bancaria/IndexPage.vue:795` |

#### Grupo «Almacén» (`almacen-permisos.json`)

| Clave | Etiqueta en pantalla | Ubicación en el árbol | Dónde se evalúa en el FE (archivo:línea) |
|---|---|---|---|
| `Proveedores` | Proveedores *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.proveedores` | Ver | Proveedores | `layouts/SideBarMenu.vue:342,355,360`; `router/routes.ts:22` |
| `crear.proveedor` | Crear | Proveedores | `proveedores/IndexPage.vue:122,243` |
| `editar.proveedor` | Editar | Proveedores | `proveedores/IndexPage.vue:195` |
| `activar.proveedor` | Activar | Proveedores | `proveedores/IndexPage.vue:211` |
| `inactivar.proveedor` | Inactivar | Proveedores | `proveedores/IndexPage.vue:202` |
| `eliminar.proveedor` | Eliminar | Proveedores | `proveedores/IndexPage.vue:217` |
| `Compras` | Compras *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.compras` | Ver | Compras | `layouts/SideBarMenu.vue:343,367,372`; `router/routes.ts:46` |
| `crear.compra` | Crear | Compras | `compras/IndexPage.vue:370,489`; `router/routes.ts:52` |
| `anular.compra` | Anular | Compras | `compras/IndexPage.vue:465` |
| `Productos/Servicios` | Productos/Servicios *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.productos` | Ver | Productos/Servicios | `layouts/SideBarMenu.vue:344,379,384`; `router/routes.ts:118` |
| `crear.productos` | Crear | Productos/Servicios | `productos/IndexPage.vue:254,489` |
| `editar.productos` | Editar | Productos/Servicios | `productos/IndexPage.vue:313` |
| `activar.inactivar.productos` | Activar/Inactivar | Productos/Servicios | `productos/IndexPage.vue:324,335` |
| `eliminar.productos` | Eliminar | Productos/Servicios | `productos/IndexPage.vue:347` |
| `Categorías` | Categorías *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.category` | Ver | Categorías | `layouts/SideBarMenu.vue:345,390,393`; `router/auth-guard.ts:88` |
| `crear.category` | Crear | Categorías | `categories/IndexPage.vue:111,215` |
| `editar.category` | Editar | Categorías | `categories/IndexPage.vue:173` |
| `eliminar.category` | Eliminar | Categorías | `categories/IndexPage.vue:187` |
| `Equipos` | Equipos *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.equipos` | Ver | Equipos | `layouts/SideBarMenu.vue:346,405,410`; `clientes/components/editar/RecursosCliente.vue:105`; `router/routes.ts:454` |
| `crear.equipo` | Crear | Equipos | `equipos/IndexPage.vue:309,631` |
| `editar.equipo` | Editar | Equipos | `equipos/IndexPage.vue:446` |
| `eliminar.equipo` | Eliminar | Equipos | `equipos/IndexPage.vue:482` |
| `vincular.equipo` | Vincular a servicio | Equipos | `equipos/IndexPage.vue:456` |
| `Accesorios` | Accesorios *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `crear.accesorio` | Crear | Accesorios | `equipos/IndexPage.vue:533,636` |
| `editar.accesorio` | Editar | Accesorios | `equipos/IndexPage.vue:594` |
| `eliminar.accesorio` | Eliminar | Accesorios | `equipos/IndexPage.vue:602` |

#### Grupo «Ajustes» (`gestion-variables-permisos.json`)

| Clave | Etiqueta en pantalla | Ubicación en el árbol | Dónde se evalúa en el FE (archivo:línea) |
|---|---|---|---|
| `Servicios` | Servicios *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `variables.dias-habilitados` | Días habilitados | Servicios | `layouts/SideBarMenu.vue:422`; `ajustes/IndexPage.vue:113`; `ajustes/servicios/IndexPage.vue:78`; `router/auth-guard.ts:38` |
| `variables.facturacion` | Facturación | Servicios | `layouts/SideBarMenu.vue:423`; `ajustes/IndexPage.vue:141`; `router/auth-guard.ts:39,87` |
| `variables.horario.cortes` | Horario de corte | Servicios | `layouts/SideBarMenu.vue:424`; `ajustes/IndexPage.vue:114`; `ajustes/servicios/IndexPage.vue:156`; `router/auth-guard.ts:40` |
| `variables.reintentos.mikrotik` | Configuración de reintentos automáticos | Servicios | `layouts/SideBarMenu.vue:425`; `ajustes/IndexPage.vue:115`; `ajustes/servicios/IndexPage.vue:162`; `ajustes/servicios/components/ConfigurarReintentosCortes.vue:185` (+1 archivos) |
| `variables.aplicar-cortes` | Aplicar cortes manualmente | Servicios | `layouts/SideBarMenu.vue:427`; `ajustes/IndexPage.vue:116`; `ajustes/servicios/IndexPage.vue:163`; `ajustes/servicios/components/ConfigurarReintentosCortes.vue:200` (+1 archivos) |
| `variables.opciones-logs` | Historial del proceso de cortes | Servicios | ❓ sin referencia literal en el FE |
| `ajuste.plantillas` | Plantillas *(grupo)* | — | `layouts/SideBarMenu.vue:433`; `ajustes/IndexPage.vue:231,237,481`; `usuarios/components/ListPermisos.vue:22,27,141`; `router/routes.ts:412,442` |
| `Recordatorio pago` | Recordatorio pago *(grupo)* | Plantillas | (nodo de agrupación; no se evalúa) |
| `variables.ver.recordatorio.pago` | Ver recordatorio pago | Plantillas > Recordatorio pago | `ajustes/IndexPage.vue:223`; `ajustes/plantillas/IndexPage.vue:22,84,99`; `router/auth-guard.ts:48` |
| `variables.edita.recordatorio.pago` | Editar recordatorio pago | Plantillas > Recordatorio pago | `ajustes/plantillas/components/RecordatorioPago.vue:299,586` |
| `Mensaje de bienvenida` | Mensaje de bienvenida *(grupo)* | Plantillas | (nodo de agrupación; no se evalúa) |
| `variables.ver.mensaje.bienvenida` | Ver mensaje de bienvenida | Plantillas > Mensaje de bienvenida | `ajustes/IndexPage.vue:224`; `ajustes/plantillas/IndexPage.vue:26,85,100`; `router/auth-guard.ts:49` |
| `variables.edita.mensaje.bienvenida` | Editar mensaje de bienvenida | Plantillas > Mensaje de bienvenida | `ajustes/plantillas/components/MensajeBienvenida.vue:170` |
| `Aviso pago recibido` | Aviso pago recibido *(grupo)* | Plantillas | (nodo de agrupación; no se evalúa) |
| `variables.ver.pago.recibido` | Ver plantilla pago recibido | Plantillas > Aviso pago recibido | `ajustes/IndexPage.vue:225`; `ajustes/plantillas/IndexPage.vue:30,86,101`; `router/auth-guard.ts:50` |
| `variables.edita.pago.recibido` | Editar plantilla pago recibido | Plantillas > Aviso pago recibido | `ajustes/plantillas/components/AvisoPagoRecibido.vue:219` |
| `variables.ver.promesa.pago` | Ver plantilla promesa de pago | Plantillas > Aviso pago recibido | `ajustes/plantillas/IndexPage.vue:34,87,185` |
| `variables.edita.promesa.pago` | Editar plantilla promesa de pago | Plantillas > Aviso pago recibido | `ajustes/plantillas/components/PromesaPago.vue:147` |
| `Formato impresión pagos` | Formato impresión pagos *(grupo)* | Plantillas | (nodo de agrupación; no se evalúa) |
| `variables.ver.plantilla.impresion.pagos` | Ver plantilla impresión pagos | Plantillas > Formato impresión pagos | `ajustes/IndexPage.vue:226`; `ajustes/plantillas/IndexPage.vue:38,88,102`; `router/auth-guard.ts:51` |
| `variables.edita.plantilla.impresion.pagos` | Editar plantilla impresión pagos | Plantillas > Formato impresión pagos | `ajustes/plantillas/components/ImpresionPagos.vue:1180` |
| `Ticket` | Ticket *(grupo)* | Plantillas | (nodo de agrupación; no se evalúa) |
| `variables.ver.plantilla.ticket` | Ver plantilla ticket | Plantillas > Ticket | `ajustes/IndexPage.vue:227`; `ajustes/plantillas/IndexPage.vue:42,89,103`; `router/auth-guard.ts:52` |
| `variables.edita.plantilla.ticket` | Editar plantilla ticket | Plantillas > Ticket | `ajustes/ticket/PlantillaMsgCliente.vue:113`; `ajustes/ticket/PlantillaMsgTecnico.vue:116` |
| `Aviso contrato` | Aviso contrato *(grupo)* | Plantillas | (nodo de agrupación; no se evalúa) |
| `variables.ver.plantilla.mensaje.contrato` | Ver plantilla contrato | Plantillas > Aviso contrato | `ajustes/IndexPage.vue:228,478`; `ajustes/plantillas/IndexPage.vue:47,90,104`; `router/auth-guard.ts:53` |
| `variables.edita.plantilla.mensaje.contrato` | Editar plantilla contrato | Plantillas > Aviso contrato | `ajustes/contratos/AvisoContrato.vue:121`; `ajustes/contratos/AvisoDocumento.vue:121` |
| `Documento` | Documento *(grupo)* | Plantillas | (nodo de agrupación; no se evalúa) |
| `variables.ver.plantilla.documentos.contrato` | Ver plantillas documentos | Plantillas > Documento | `ajustes/IndexPage.vue:229,479`; `ajustes/plantillas/IndexPage.vue:53,57,91`; `router/auth-guard.ts:54` |
| `variables.agrega.plantilla.documentos.contrato` | Agrega plantilla documentos | Plantillas > Documento | `ajustes/plantillas/components/PlantillaDocumento.vue:125` |
| `variables.edita.plantilla.documentos.contrato` | Editar plantilla documento | Plantillas > Documento | `ajustes/plantillas/components/PlantillaDocumento.vue:102`; `ajustes/plantillas/components/PlantillaTicket.vue:33` |
| `Mensajeria` | Mensajeria *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `variables.vincular.whatsApp` | Vincular whatsApp | Mensajeria | `layouts/SideBarMenu.vue:429`; `ajustes/IndexPage.vue:259`; `ajustes/mensajeria/IndexPage.vue:157`; `router/auth-guard.ts:58` |
| `variables.config.servidor.correo` | Configurar servidor de correro | Mensajeria | `layouts/SideBarMenu.vue:430`; `ajustes/IndexPage.vue:258`; `ajustes/mensajeria/IndexPage.vue:281`; `router/auth-guard.ts:59` |
| `Logs` | Logs *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `ver.logs` | Ver Logs | Logs | `ajustes/IndexPage.vue:196`; `ajustes/logs/IndexPage.vue:28`; `router/auth-guard.ts:68` |
| `SmartOLT` | SmartOLT *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `variables.reintentos.smartOLT` | Configuración de reinicio automático de ONUs | SmartOLT | `layouts/SideBarMenu.vue:426`; `ajustes/IndexPage.vue:168`; `ajustes/smartOLT/IndexPage.vue:291,562`; `router/auth-guard.ts:42,63` |
| `variables.opciones-cortes` | Opciones de corte | SmartOLT | `layouts/SideBarMenu.vue:428`; `ajustes/IndexPage.vue:169`; `ajustes/servicios/IndexPage.vue:164`; `ajustes/servicios/components/ConfigurarReintentosCortes.vue:161` (+1 archivos) |
| `Roles Y Permisos` | Roles Y Permisos *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.rol` | Ver | Roles Y Permisos | `ajustes/IndexPage.vue:308,313`; `router/routes.ts:88` |
| `crear.rol` | Crear | Roles Y Permisos | `roles-permisos/IndexPage.vue:96,166` |
| `editar.rol` | Editar | Roles Y Permisos | `roles-permisos/IndexPage.vue:130` |
| `eliminar.rol` | Eliminar | Roles Y Permisos | `roles-permisos/IndexPage.vue:140` |
| `Gestión personal` | Gestión personal *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `index.usuario` | Ver | Gestión personal | `ajustes/IndexPage.vue:285,290`; `usuarios/composables/useUser.js:231`; `router/routes.ts:130` |
| `crear.usuario` | Crear | Gestión personal | `usuarios/IndexPage.vue:152,153,296`; `router/routes.ts:136` |
| `editar.usuario` | Editar | Gestión personal | `usuarios/IndexPage.vue:235,240`; `router/routes.ts:142` |
| `activar.inactivar.usuario` | Activar/Inactivar | Gestión personal | ❓ sin referencia literal en el FE |
| `eliminar.usuario` | Eliminar | Gestión personal | `usuarios/IndexPage.vue:256` |
| `ajuste.empresa` | Configurar empresa *(grupo)* | — | `layouts/SideBarMenu.vue:431`; `ajustes/IndexPage.vue:336,342`; `usuarios/components/ListPermisos.vue:22,27,138`; `router/routes.ts:418` |
| `Empresa` | Empresa *(grupo)* | Configurar empresa | (nodo de agrupación; no se evalúa) |
| `index.empresa` | Ver | Configurar empresa > Empresa | `layouts/MainLayout.vue:370`; `ajustes/IndexPage.vue:333`; `ajustes/empresa/IndexPage.vue:13,34,64`; `router/routes.ts:40` |
| `editar.empresa` | Editar Empresa | Configurar empresa > Empresa | `empresas/components/FormEmpresa.vue:332` |
| `Sucursales` | Sucursales *(grupo)* | Configurar empresa | (nodo de agrupación; no se evalúa) |
| `index.sucursal` | Ver | Configurar empresa > Sucursales | `ajustes/IndexPage.vue:334`; `ajustes/empresa/IndexPage.vue:17,34,70` |
| `crear.sucursal` | Crear | Configurar empresa > Sucursales | `sucursales/IndexPage.vue:157,300,307` |
| `editar.sucursal` | Editar | Configurar empresa > Sucursales | `sucursales/IndexPage.vue:240` |
| `activar.inactivar.sucursal` | Activar/Inactivar | Configurar empresa > Sucursales | `sucursales/IndexPage.vue:252,263` |
| `eliminar.sucursal` | Eliminar | Configurar empresa > Sucursales | `sucursales/IndexPage.vue:274` |
| `Base de datos` | Base de datos *(grupo)* | — | (nodo de agrupación; no se evalúa) |
| `base-datos.campos` | Campos personalizados | Base de datos | `ajustes/IndexPage.vue:362`; `ajustes/base-datos/IndexPage.vue:12,34,54`; `router/auth-guard.ts:72` |
| `base-datos.cambios-masivos` | Cambios masivos | Base de datos | `ajustes/IndexPage.vue:362`; `ajustes/base-datos/IndexPage.vue:40,58`; `router/auth-guard.ts:73` |
| `ajuste.forma-pago` | Configurar formas pago *(grupo)* | — | `layouts/SideBarMenu.vue:432`; `ajustes/IndexPage.vue:417,423,449`; `usuarios/components/ListPermisos.vue:22,27,144`; `router/routes.ts:424` |
| `Formas de pago` | Formas de pago *(grupo)* | Configurar formas pago | (nodo de agrupación; no se evalúa) |
| `index.forma-pago` | Ver | Configurar formas pago > Formas de pago | `ajustes/IndexPage.vue:414,446`; `ajustes/formas-pago/IndexPage.vue:13,35,65` |
| `crear.forma-pago` | Agregar | Configurar formas pago > Formas de pago | `formas-pago/IndexPage.vue:139,281` |
| `editar.forma-pago` | Editar | Configurar formas pago > Formas de pago | `formas-pago/IndexPage.vue:190` |
| `activar.inactivar.forma-pago` | Activar/Inactivar | Configurar formas pago > Formas de pago | `formas-pago/IndexPage.vue:208,227` |
| `eliminar.forma-pago` | Eliminar | Configurar formas pago > Formas de pago | `formas-pago/IndexPage.vue:245` |
| `Detalles formas de pago` | Detalles formas de pago *(grupo)* | Configurar formas pago | (nodo de agrupación; no se evalúa) |
| `index.detalle-forma-pago` | Ver | Configurar formas pago > Detalles formas de pago | `ajustes/IndexPage.vue:415,447`; `ajustes/formas-pago/IndexPage.vue:17,35,71` |
| `crear.detalle-forma-pago` | Agregar | Configurar formas pago > Detalles formas de pago | `detalle-formas-pago/IndexPage.vue:128,271` |
| `editar.detalle-forma-pago` | Editar | Configurar formas pago > Detalles formas de pago | `detalle-formas-pago/IndexPage.vue:177` |
| `activar.inactivar.detalle-forma-pago` | Activar/Inactivar | Configurar formas pago > Detalles formas de pago | `detalle-formas-pago/IndexPage.vue:198,217` |
| `eliminar.detalle-forma-pago` | Eliminar | Configurar formas pago > Detalles formas de pago | `detalle-formas-pago/IndexPage.vue:235` |

- **Qué controla cada grupo (resumen):** Dashboard ⇒ qué tarjetas ve el usuario (ACC-011 a ACC-021). Gestión de red ⇒ ítems de "Gestion de Red" del menú y sus botones; `mapa.tecnicos.index` además lo exige el backend. Gestión de clientes ⇒ `index.clientes`/`tickets.index`/`instalaciones.index` y, bajo `cliente.edit`, las pestañas del perfil del cliente. Finanzas ⇒ ítems de "Finanzas" y botones de ventas/pagos/ingresos-egresos/conciliación. Almacén ⇒ ítems de "Almacén". Ajustes ⇒ tarjetas y pestañas de Ajustes, Roles, Usuarios, Empresa/Sucursales, Formas de pago, Base de datos.
- **Pendiente de validar en UI:** ❓ cómo se ve el estado deshabilitado de los hijos de `ajuste.plantillas`/`ajuste.empresa`/`ajuste.forma-pago` (el componente pone `disabled` en los nodos del árbol, pero el interruptor usa su propio `:disable`); ❓ si el contador `Activos X/Y` confunde por incluir nodos de agrupación.

---

## ACC-006 · Usuarios: listado ("Gestión Personal")
- **Ruta UI / name:** `/usuarios` · `index.usuario` · Menú lateral → **Ajustes** → tarjeta **"Gestión Personal"** (visible con `index.usuario`, `FE:pages/dashboard/ajustes/IndexPage.vue:284-305`). No está en el menú lateral directamente.
- **Archivos:** FE: `pages/dashboard/usuarios/IndexPage.vue`, `composables/useUser.js` · BE: `auth/auth.controller.ts:86-92,94-98`, `auth/auth.service.ts:231-262`.
- **Para qué sirve:** ver las personas con acceso al sistema, su rol y estado, y llegar a editarlas o eliminarlas.
- **Acceso:** ruta exige `index.usuario`; botones por `crear.usuario`, `editar.usuario`, `eliminar.usuario`.
- **Secciones:** migas `Inicio › Ajustes › Gestión Personal`; tabla (título "Listado de Usuarios" solo visible si el rol NO es SUPER-ADMINISTRADOR, `IndexPage.vue:139-148`).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | `crear usuario` (móvil: botón flotante `+`) | Va a `/usuarios/add` | `crear.usuario` | — | `IndexPage.vue:151-158,293-305` |
  | icono lápiz | Va a `/usuarios/edit/<id>` | `editar.usuario` | — | `:234-247` |
  | icono papelera | Confirma y elimina (ACC-009) | `eliminar.usuario` | `DELETE /auth/:id` | Solo en filas `Activo`; deshabilitado en la fila del propio usuario (`claim.id == row.id`) (`:249-261`) |
  | selector `OCULTAR COLUMNAS` | Muestra/oculta columnas | — | — | Preferencia no persistente por usuario |
  | `Buscar...` / pantalla completa | Filtro de texto (debounce 300 ms) / maximizar | — | — | |

- **Filtros y columnas de tabla:** `acciones`, `Foto` (miniatura; al pasar el cursor se amplía), `Nombre`, `Usuario`, `Email`, `Celular`, `Rol` (primer rol), `Estado` (`Activo` verde / `Inactivo` rojo) (`IndexPage.vue:5-31,211-230,265-278`). La paginación (página y filas por página) se conserva en el store de estados (`estadosStore.paginationUser`, `:67-74,89-90`).
- **Estados posibles:** `Activo` (`isActive=true`), `Inactivo` (`isActive=false`).
- **Reglas de negocio (backend):**
  - `GET /auth/users` devuelve todos los usuarios con `deleted_at IS NULL` (activos e inactivos), ordenados por `created_at DESC`, **excluyendo** el usuario con e-mail `info@rednuevaconexion.net` (`auth.service.ts:240-253`). El parámetro `estado` del controlador no se alimenta de la URL, así que siempre es `false` (`auth.controller.ts:86-92`).
  - El resultado se cachea en Redis (`usuarios:false`) sin vencimiento y se limpia al crear/editar/eliminar usuarios (`auth.service.ts:231-262,57-58,211-212,445-446`).
- **Efectos secundarios externos:** ninguno.
- **Mensajes de error/éxito (texto exacto):** `No se pudieron cargar los usuarios` (`warning`, `:60`) · `No se encontró ningun Resultado` (sin datos) · eliminar: ver ACC-009.
- **Relaciones con otros módulos:** ACC-007, ACC-009, ACC-004 (roles).
- **Casos límite y advertencias:**
  - Un cambio hecho a los permisos de varios usuarios por edición de rol puede no verse en esta lista hasta que se edite algún usuario (caché sin vencimiento, ACC-040).
  - Los usuarios inactivos no tienen botón de eliminar: hay que activarlos primero.
  - `activar.inactivar.usuario` existe en el catálogo pero esta pantalla no tiene botón de activar/inactivar; el estado se cambia en el formulario (ACC-007).
- **Preguntas probables de usuarios:**
  1. "¿Dónde veo quién tiene acceso al sistema?" → Ajustes → Gestión Personal.
  2. "No veo mi propio botón de eliminar" → no puede eliminarse a sí mismo.
  3. "Eliminé a un técnico y desapareció, ¿pierdo su historial?" → es borrado lógico (ACC-009).
  4. "¿Por qué hay un usuario que no aparece?" → el usuario `info@rednuevaconexion.net` está oculto por código.
  5. "Cambié un dato y el listado no se actualiza" → refrescar; hay caché.
- **Pendiente de validar en UI:** ❓ aspecto real de la tabla en móvil; ❓ si la caché `usuarios:*` hace ver datos viejos tras editar roles.

---

## ACC-007 · Usuarios: crear / editar (formulario)
- **Ruta UI / name:** `/usuarios/add` · `crear.usuario` · botón `crear usuario` · `/usuarios/edit/:term` · `editar.usuario` · icono lápiz (`:term` = id del usuario). Títulos: `Nuevo Usuario` / `Editar Usuario`; migas `Inicio › Usuarios › Agregar|Usuario` (el vínculo "Usuarios" apunta a `/usuarios`).
- **Archivos:** FE: `pages/dashboard/usuarios/AddUser.vue`, `EditUser.vue`, `components/FormUser.vue`, `composables/useUser.js`, `components/ListPermisos.vue` · BE: `auth/auth.controller.ts:15-35,63-84`, `auth/auth.service.ts:35-65,179-229`, `auth/dto/create-user.dto.ts`, `auth/dto/edit-user.dto.ts`, `auth/helpers/fileFilter.helper.ts`, `fileNamer.helper.ts`.
- **Para qué sirve:** dar de alta o modificar a una persona con acceso: datos, rol, routers y sucursales que puede ver, estado, horario, contraseña y permisos.
- **Acceso:** `crear.usuario` / `editar.usuario` (nombre de ruta). SUPER-ADMINISTRADOR siempre.
- **Secciones (en dos columnas):** izquierda `Datos:`, `Configuración:`, `Nueva Contraseña:`; derecha `Permisos:` (ACC-005).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | `Guardar Cambios` | Valida y envía (multipart) | ruta | `POST /auth/register` (alta) · `PATCH /auth/edit/:id` (edición) | Al terminar vuelve a `/usuarios` (`useUser.js:231`) |
  | `Regresar` (solo ancho > 600 px) | Va a `/usuarios` | — | — | Es un botón `type="submit"` con `@click`: puede enviar el formulario al mismo tiempo ❓ (`FormUser.vue:787-796`) |
  | icono ojo en contraseñas | mostrar/ocultar | — | — | |

- **Campos de formulario:**

  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
  |---|---|---|---|---|
  | `Nombre:` | texto | sí | FE: `Debes completar este campo`; se envía en MAYÚSCULAS; BE: `@IsString @MinLength(1)` | `fullName`; es el que se muestra en la cabecera |
  | `Usuario:` | texto | sí | igual; se envía en MAYÚSCULAS; BE `@MinLength(1)` | **No** es el nombre de acceso: el login es por e-mail. No es único |
  | `Email:` | texto | sí | FE regex y mensaje `Ingresa un email valido`; BE `@IsEmail`; columna única | Se guarda en minúsculas (`user.entity.ts:97-105`). Duplicado ⇒ error de BD con el detalle de Postgres (`handleDBErros`, `auth.service.ts:451-458`) |
  | `Télefono Movil:` | texto numérico | sí | FE: solo dígitos, `counter maxlength=10`; BE: `@MinLength(10)` | (sic) etiqueta con tilde mal puesta |
  | `Rol:` | select | sí | FE `Debes elegir un Rol`; opciones = `GET /roles-and-permisos` | Al elegir, **reemplaza** los permisos por los del rol y, si es SUPER-ADMINISTRADOR, fija routers=`TODOS` (`FormUser.vue:53-56,107-117`). Oculto en Mi Perfil salvo SUPER-ADMIN |
  | `Permisos Router:` | multi-select (chips) | para roles ≠ SUPER-ADMIN | opciones = `GET /router` + `TODOS` (valor `null`); `TODOS` es excluyente (`FormUser.vue:119-142`) | Define `routers[]`; limita datos y listas del usuario. Sin validación explícita de "obligatorio" ❓ |
  | `Sucursal:` | multi-select (chips) | para roles ≠ SUPER-ADMIN | FE `Debes elegir una sucursal` (solo si la lista queda vacía); opciones filtradas por las sucursales de los routers elegidos; vacío: `Debes crear una sucursal` | Se autocompleta con todas las sucursales de los routers (`setearOpcionesSucursales`, `:73-95`). Para SUPER-ADMIN se guarda `[]` (=sin restricción) |
  | `Estado:` | select | sí | `Activo` / `Inactivo` | Por defecto Activo. Inactivo ⇒ no puede iniciar sesión (ACC-009) |
  | `Foto:` | archivo | no | `.jpg, .png, .jpeg`; rechazo ⇒ `El tipo de archivo es invalido`; BE filtra por subtipo `jpg,jpeg,png,x-pkcs12` y guarda como `<uuid>.<ext>` en `static/images-user` | Etiqueta del campo: `Cargar Imagen` o el nombre del archivo actual. Ver advertencia de foto |
  | `Horario Acceso:` | 7 interruptores (Lunes…Domingo) | no (ver ACC-010) | | Nuevo usuario: todos los días activados (`FormUser.vue:38`) |
  | `Horario:` (inicio / fin) | hora `HH:mm` (popup `Cerrar`) | no | ambos o ninguno: `Debes elegir una hora.`; fin > inicio: `La hora de fin debe ser mayor a la hora de inicio.` | Nuevo usuario: `00:00` a `23:59` (`:39`). No se validan si el rol es SUPER-ADMINISTRADOR |
  | `Contraseña:` / `Repite Contraseña:` | password | alta: sí · edición: opcional | FE: mínimo 6 (`La contraseña debe tener mínimo 6 caracteres`), iguales (`Las contraseñas no coinciden`); BE: 6–50 | En edición, vacío ⇒ no cambia (`auth.service.ts:184-187`). Se guarda con bcrypt |
  | `Permisos:` | árbol | sí, ≥ 1 | FE: `*Debes elegir al menos un permiso` | ACC-005 |

- **Estados posibles:** `isActive` true/false; permisos y horarios por usuario.
- **Reglas de negocio (backend):**
  - `POST /auth/register` (`multipart/form-data`): los campos `roles`, `sucursales`, `routers`, `permisos`, `horarios_dias`, `horarios_time`, `isActive` llegan como **texto JSON** y se parsean (`auth.service.ts:38-49`); la empresa llega en `company` (id del usuario que crea, tomado del JWT en el FE: `useUser.js:207`). Limpia `usuarios:true/false` (`:57-58`).
  - `PATCH /auth/edit/:id`: igual con `PartialType`; si no viene contraseña la conserva (`:184-187`); limpia `permisos:<id>` y `usuarios:*` (`:210-212`); si el resultado es `isActive=false` avisa al WebSocket (`:214-219`). Devuelve `Registro actualizado exitosamente`.
  - El backend **no** comprueba que quien edita tenga permiso (solo `@Auth()`), ni que `:id` sea el propio usuario.
  - Validaciones de DTO (`create-user.dto.ts`): `company` string no vacío, `email` IsEmail, `password` 6–50, `usuario` ≥1, `fullName` ≥1, `celular` ≥10, `isActive` boolean-string, `roles/permisos/routers/sucursales` string; el resto opcional. Mensajes en inglés por defecto.
- **Efectos secundarios externos:** WebSocket (`user_inactive`) al desactivar; ninguno al crear (no envía correo de bienvenida ni credenciales ✅).
- **Mensajes de error/éxito (texto exacto):** `Usuario creado exitosamente.` / `Usuario editado exitosamente.` (`useUser.js:229`) · errores de servidor con `warning` mostrando `error.response.data.message` (lista si es array).
- **Relaciones con otros módulos:** ACC-004/005 (roles/permisos), routers y sucursales (ACC-031), ACC-010, ACC-009; tickets/instalaciones (el usuario aparece como técnico/operador).
- **Casos límite y advertencias:**
  - **Validación del FE incompleta** ✅: en `validarCampos`, la asignación `existError = validarPassword(...)` (`useUser.js:131-135`) **sobrescribe** los errores detectados antes (campos vacíos, sin rol, sin sucursal); si las contraseñas son válidas el formulario se envía igual y el backend decide (puede crear un usuario sin rol: `roles=[]`, lo que luego rompe consultas que leen `roles[0]`). ❓ confirmar en UI.
  - **Routers/sucursales nulos**: el estado inicial es `routers:null` y `sucursales:null`; si el administrador no elige router, el FE envía `"null"` (no hay validación). El backend no lo rechaza en el DTO (solo `@IsString` del JSON). Según la entidad (`routers` sin `nullable`) el INSERT fallaría con 500 `Please check logs error`; si la BD lo acepta, `cargarRouters(user)` y `JwtStrategy` fallarían al leer `.length`/`[0]` de `null` ❓.
  - **Cambiar la foto cuando ya hay una no surte efecto** ✅ (código): el FE siempre envía `foto_old` con el archivo actual y el backend, tras tomar el archivo nuevo, vuelve a `foto = foto_old` si `foto_old` ≠ `'null'` (`auth.service.ts:189-195`). Solo funciona cuando el usuario no tenía foto. No existe forma de quitar la foto.
  - **Correo único aun tras eliminar**: el usuario eliminado conserva su fila y su e-mail (columna `unique`), por lo que ese correo no puede reutilizarse.
  - La contraseña del usuario la define quien edita; el sistema no envía credenciales por correo.
  - Elegir otro rol sobrescribe los permisos personalizados del usuario.
- **Preguntas probables de usuarios:**
  1. "¿Cómo creo un técnico?" → Rol `TECNICO` (si existe), routers, sucursales, horario, contraseña.
  2. "Creé al usuario y no puede entrar" → revisar Estado, horario (ACC-010), correo/contraseña.
  3. "Le cambié la contraseña y no la sabe" → hay que comunicarla manualmente.
  4. "Cambié la foto y sigue la anterior" → ver advertencia de foto.
  5. "¿Para qué sirve 'Usuario'?" → nombre corto mostrado en listados; no sirve para entrar.
  6. "Dice 'Key (email)=… already exists'" → ya existe (incluso si fue eliminado).
  7. "¿Cómo limito a un usuario a una sola sucursal?" → `Permisos Router:` y `Sucursal:`.
  8. "¿Puedo dar permisos distintos al rol?" → sí, con los interruptores tras elegir el rol.
- **Pendiente de validar en UI:** ❓ si la validación del FE realmente deja enviar sin rol/sucursal; ❓ qué pasa al guardar sin router; ❓ que `Regresar` no dispare el envío; ❓ si el selector `Sucursal:` ofrece `TODOS`.

---

## ACC-008 · Mi Perfil
- **Ruta UI / name:** `/usuario/edit/:term/profile` · `editar.usuario.profile` · cabecera → clic en la foto de perfil → **`Mi Perfil`** (`FE:layouts/MainLayout.vue:82-93`; `:term` = `claim.id`).
- **Archivos:** FE: `pages/dashboard/usuarios/EditUser.vue` + `components/FormUser.vue` (mismo formulario que ACC-007) · BE: `PATCH /auth/edit/:id`.
- **Para qué sirve:** que cada persona actualice sus propios datos, foto, horario y contraseña.
- **Acceso:** el guard deja pasar siempre esta ruta (`auth-guard.ts:91-93`), sin permiso y con cualquier `:term` ✅.
- **Qué cambia respecto a ACC-007:** se ocultan `Rol:`, `Permisos Router:`, `Sucursal:` y `Estado:` salvo para SUPER-ADMINISTRADOR (`FormUser.vue:276-281`); los interruptores de permisos quedan deshabilitados (`ListPermisos.vue:61-68`). Siguen editables: Nombre, Usuario, Email, Teléfono, Foto, **Horario Acceso/Horario** (queda fuera del bloque oculto, `FormUser.vue:496-684`) y contraseña.
- **Efectos:** tras guardar, si el usuario cambió su propia foto se actualiza la miniatura de la cabecera (`useUser.js:224-227`); luego navega a `/usuarios` (`:231`), lo que para un usuario sin `index.usuario` lo redirige al primer permiso `index` que tenga.
- **Reglas de negocio / advertencias:**
  - El backend no verifica que el `:id` sea el del solicitante ✅; la UI solo impide editar otros desde Mi Perfil por convención.
  - Como el formulario reenvía `roles`, `permisos`, `routers`, `sucursales` e `isActive` cargados, un usuario avanzado podría modificarlos por API (ver Hallazgos).
  - El nombre y la foto de la cabecera vienen del JWT: tras cambiar nombre hay que volver a iniciar sesión (ACC-002).
- **Mensajes:** `Usuario editado exitosamente.`
- **Preguntas probables:** "¿Cómo cambio mi contraseña?" → Mi Perfil → `Nueva Contraseña:` (dos veces, mínimo 6). "¿Puedo cambiar mi rol?" → no desde la UI. "¿Puedo cambiar mi horario de acceso?" → sí, ahí mismo ❓.
- **Pendiente de validar en UI:** ❓ que los permisos aparezcan en solo lectura; ❓ refresco inmediato de nombre/foto.

---

## ACC-009 · Baja de usuario (borrado lógico) y estado Activo/Inactivo
- **Ruta UI / name:** `/usuarios` → icono papelera de la fila; estado en el formulario (`Estado:`).
- **Archivos:** FE: `usuarios/IndexPage.vue:79-85`, `composables/useHelpers.js:48-67` · BE: `auth/auth.controller.ts:94-98`, `auth/auth.service.ts:406-449`.
- **Para qué sirve:** retirar el acceso de una persona conservando su historial.
- **Acceso:** `eliminar.usuario` (botón); `editar.usuario` (estado).
- **Botones y acciones:**

  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
  |---|---|---|---|---|
  | papelera → diálogo "Confirmar": `Estas seguro de eliminar este usuario?` · `Eliminar` / `Cancelar` | Elimina (lógico) | `eliminar.usuario` | `DELETE /auth/:id` | Solo filas `Activo`, no el propio usuario |
  | `Estado:` → `Inactivo` + `Guardar Cambios` | Desactiva sin eliminar | `editar.usuario` | `PATCH /auth/edit/:id` | Cierra sesiones abiertas (WebSocket) |

- **Reglas de negocio (backend):**
  - No se puede eliminar si el usuario tiene **tickets** en estado `ABIERTO`/`EN_PROCESO` o **instalaciones** en `PENDIENTE`/`AGENDADA`/`EN_PROCESO`/`REPROGRAMADA` (como técnico u operador). Mensaje: `No se puede eliminar a "<nombre>": tiene N ticket(s) y M instalación(es) en proceso. Reasígnalos o ciérralos antes de eliminar.` (`auth.service.ts:409-440`).
  - Si pasa: `deleted_at=now`, `isActive=false`, `logout=true` y limpia `usuarios:*` (`:443-446`); responde `Usuario eliminado exitosamente.` (`:448`).
  - Usuario eliminado/inactivo ⇒ 401 en cualquier endpoint (`jwt.strategy.ts:58-59`) y `obtenerPermisos` devuelve `logout`/`isActive` que fuerzan el cierre en el cliente (ACC-002).
- **Mensajes de error/éxito (texto exacto):** éxito del diálogo `Registro eliminado exitosamente` (genérico, `useHelpers.js:58`) — el texto `Usuario eliminado exitosamente.` del backend no se muestra; error `23503` ⇒ `No es posible borrar este registro, se encuentra en uso.`; otros ⇒ el mensaje del backend (`negative`).
- **Relaciones con otros módulos:** tickets, instalaciones, notificaciones (el usuario eliminado deja de recibirlas).
- **Casos límite y advertencias:** el correo no queda libre; el usuario eliminado desaparece de listados pero sigue en históricos (pagos, tickets, logs).
- **Preguntas probables:** "No me deja eliminar a un técnico" → reasignar/cerrar sus tickets e instalaciones. "¿Puedo recuperar un usuario eliminado?" → no hay pantalla; requiere BD. "¿Diferencia entre inactivar y eliminar?" → inactivar es reversible desde `Estado:`; eliminar no tiene reversa en la UI.
- **Pendiente de validar en UI:** ❓ texto exacto mostrado al fallar por tickets/instalaciones.

---

## ACC-010 · Restricción de acceso por día y horario
- **Ruta UI / name:** campos `Horario Acceso:` y `Horario:` del formulario de usuario (ACC-007/008); se aplica en `POST /auth/login` y en `GET /auth/obtener-permisos/:id`.
- **Archivos:** FE: `usuarios/components/FormUser.vue:553-684`, `composables/useUser.js:149-185` · BE: `auth/auth.service.ts:90-176,376-380`.
- **Para qué sirve:** que un usuario solo pueda usar el sistema ciertos días y dentro de una franja horaria.
- **Reglas de negocio (backend)** ✅:
  - Se exime a quien tenga rol `SUPER-ADMINISTRADOR` o `ADMINISTRADOR` (`auth.service.ts:115-122`).
  - Para el resto: el día actual (nombre en español: Domingo…Sábado) debe estar en `horarios_dias` y la hora actual **del servidor** (`new Date()`) debe estar entre `horarios_time[0]` y `horarios_time[1]` (ambos inclusive) (`:124-146`).
  - Textos exactos (`:148-165`): ambos fallan: `Acceso denegado. Tu horario autorizado es: <días> de <hora inicio - hora fin>. Contacta al administrador para más información.` · solo el día: `Acceso denegado. Solo puedes acceder los días: <días>` · solo la hora: `Acceso denegado. Tu horario autorizado es de <inicio - fin>`; si ambas horas están vacías: `Acceso denegado. No tienes horario de acceso, por favor consultar con su administrador`. Si faltan datos aparece `no configurados` / `no configurado`.
  - Una franja vacía (`''`) nunca permite el acceso a un usuario no administrador.
- **Cuándo se evalúa** ✅: en el login (`:376-380`) y en cada cambio de ruta del cliente vía `obtenerPermisos` (`MainLayout.vue:383-390`), pero el resultado (`esPermitido`) se guarda en la caché `permisos:<id>` sin vencimiento (`:91-93,174`), así que **no se reevalúa al llegar la hora de término** mientras la caché exista (ACC-040). En un login nuevo la comprobación usa la caché previa (se borra recién al final del login, `:391`), de modo que el rechazo puede producirse justo después de entrar, sin el mensaje explicativo, cuando el primer refresco recalcula `esPermitido=false` (`MainLayout.vue:418-429`) ❓ confirmar en UI.
- **Mensajes (texto exacto):** los anteriores, mostrados como `warning` en el login.
- **Casos límite y advertencias:** el FE no obliga a definir horario ni días (se pueden dejar vacíos); un usuario no administrador sin franja horaria no podrá iniciar sesión. La hora usada es la zona horaria del proceso del servidor, no la de la empresa (`APP_TIMEZONE`) ❓.
- **Preguntas probables:** "¿Cómo dejo que un cajero solo trabaje de 8 a 18 de lunes a sábado?" → días + horas en su usuario. "El técnico dice 'Acceso denegado'" → revisar día y hora (hora del servidor). "¿Al terminar su horario se le cierra la sesión?" → no de inmediato.
- **Pendiente de validar en UI:** ❓ comportamiento al cruzar la hora final con sesión abierta; ❓ zona horaria del servidor.

---

## ACC-011 · Dashboard: página, filtros Router/Sucursal y control por permisos
- **Ruta UI / name:** `/` · `dashboard` · menú lateral → **Dashboard** (ítem visible si el usuario tiene alguna de las 8 claves `dashboard.*`, ver ACC-024) o clic en el logo de la empresa en el menú lateral (`FE:layouts/MainLayout.vue:151-162`). Es la pantalla de inicio tras iniciar sesión (`location.href='/'`).
- **Archivos:** FE: `pages/dashboard/panel/IndexPage.vue`, `composables/useDashboard.js`, `components/*.vue` · BE: `dashboard/dashboard.controller.ts`, `dashboard/dashboard.service.ts`, `monitoreo-trafico/monitoreo-trafico.controller.ts:65-91`, `monitoreo-dispositivos`.
- **Para qué sirve:** resumen operativo: clientes, cobros del día/mes, facturas impagas, estado de routers y tráfico.
- **Acceso:** la ruta `dashboard` está siempre permitida a un usuario autenticado (`auth-guard.ts:139`); cada tarjeta se muestra según su clave (tabla). SUPER-ADMINISTRADOR ve todas.
- **Secciones:** filtros superiores `Router:` y `Sucursal:` + 11 bloques. Orden en pantalla: ACC-012, 013, 014, 015 (4 tarjetas de colores), 016, 017, 018, 019, 020, 022, 021 (`IndexPage.vue:48-74`).
- **Permiso de cada bloque:**

  | Bloque | Clave | Nota |
  |---|---|---|
  | Total de clientes / servicios | `dashboard.total_clientes` | |
  | Total Facturas Pagadas | `dashboard.facturas_pagadas` | sus datos los carga el gráfico (requiere además `dashboard.pagos_mes`) |
  | TRANSACCIONES HOY | `dashboard.transacciones_hoy` | |
  | Total Facturas No Pagadas | `dashboard.facturas_no_pagadas` | idem: depende del gráfico |
  | Resumen del Facturación | `dashboard.resumen_facturacion` | las filas "No Pagadas" se ponen en 0 sin `dashboard.facturas_no_pagadas` |
  | Gráfico pagos semana/mes | `dashboard.pagos_mes` | |
  | Últimos pagos registrados | `dashboard.ultimos_pagos` | el menú usa `dashboard.ultimos_pago` (typo) |
  | Resumen del sistema | `dashboard.resumen_sistema` | |
  | Tráfico Clientes | `dashboard.resumen_sistema` | no tiene clave propia |
  | Clientes con mayor consumo | `dashboard.resumen_sistema` | no tiene clave propia |
  | Monitoreo de Red | `index.monitoreo_red` + ajuste `mostrarMonitoreoDashboard` | ver ACC-022 |

- **Filtros** (siempre visibles, `IndexPage.vue:3-46`):
  - **`Router:`** opciones = routers del usuario (`estadosStore.routers`, `TODOS` primero si tiene varios). Valor por defecto: el primero (al iniciar sesión; para multi-router es `TODOS`=`null`). Al cambiar ejecuta `refreshClientsYNoPagados`: recarga ACC-012 y el gráfico (y por tanto ACC-013/015) (`:108-114`). `TODOS` ⇒ se envían todos los routers del usuario (`useDashboard.js:276-290`).
  - **`Sucursal:`** opciones = sucursales del usuario, recortadas a las del router elegido (`setearSucursalesList`, `:116-136`); `TODOS` = `null` ⇒ se envían todas las sucursales del usuario (`useDashboard.js:292-305`). Al cambiar re-cargan ACC-013, 014, 016, 017, 018 (watchers sobre `sucursalSelected`).
  - **No dependen del selector `Router:` del Dashboard:** ACC-019, 020, 021 (tiene su propio `Router`), 022 (ver advertencias).
- **Reglas de negocio (backend):** todas las rutas de `/dashboard/*` llevan el `@Auth()` de clase (`controller.ts:6`). Regla común: **usuarios que no son SUPER-ADMINISTRADOR/ADMINISTRADOR ven solo los cobros que ellos mismos registraron** (`usuario_id` del abono) en pagos, hoy y últimos pagos (`dashboard.service.ts:277,358,492,558`); "No pagadas" y "Clientes" no se limitan por operador.
- **Efectos secundarios externos:** ninguno (solo lectura de BD; algunos datos vienen del colector de tráfico/monitoreo).
- **Mensajes de error:** las llamadas fallidas solo van a consola (`console.log`); el backend responde `fallo al cargar datos del Dashboard` / `fallo al cargar las transacciones` (400) (`dashboard.service.ts:432-461,476-536`).
- **Relaciones con otros módulos:** Pagos/transacciones, clientes, routers, monitoreo de tráfico y de dispositivos.
- **Casos límite y advertencias** ✅:
  - `getSucursales` no existe en `useHelpers` ⇒ si el usuario no tuviera sucursales cargadas, `await getSucursales()` lanza un error (`IndexPage.vue:95,153-155`); y en el ramal de varias sucursales se usa `listSucursales` sin definir (`:158-160`, no se alcanza porque el backend ya antepone `TODOS`).
  - Sin `dashboard.pagos_mes`: `component_grafico` es nulo y cambiar `Router:` lanza `TypeError` en `refreshClientsYNoPagados` (`:111`), y las tarjetas "Facturas Pagadas/No Pagadas" quedan en `0 de 0` porque nadie carga su dato.
  - `ResumenSistema` observa `router_selected`, que `useDashboard` no expone ⇒ no se refresca al cambiar el router (`ResumenSistema.vue:155`).
  - El modo del gráfico (`semana`/`mes`) se recuerda en `localStorage['dashboard_modo_pagos']` (`useDashboard.js:245-263`), que el login borra.
  - `getCurrentDate()` calcula el rango del mes con `toISOString()` (UTC) pero no se usa en el Dashboard actual.
- **Preguntas probables de usuarios:**
  1. "Mi cajero solo ve sus propios cobros en el Dashboard" → es la regla por operador.
  2. "No veo el Dashboard en el menú pero entro por la dirección" → faltan claves `dashboard.*` (o solo tiene `ultimos_pagos`).
  3. "Las tarjetas de facturas salen en cero" → falta `dashboard.pagos_mes` o no hay datos en el filtro.
  4. "¿Por qué no coincide con Transacciones?" → ver ACC-013/014 (se suman abonos).
  5. "Cambié de router y algunas tarjetas no cambian" → ver advertencias.
- **Pendiente de validar en UI:** ❓ errores visibles al cambiar Router sin `dashboard.pagos_mes`; ❓ comportamiento de `Sucursal:` con `TODOS` para un usuario con una sola sucursal.

---

## ACC-012 · Tarjeta "Total de clientes" / "Total de servicios"
- **Ruta UI / name:** `/` (tarjeta azul, `card-1`). Botón **`Ver clientes`** → `/clientes`.
- **Archivos:** FE: `panel/components/ClientesAndServicios.vue`, `useDashboard.js:379-389` · BE: `dashboard.service.ts:739-760` (`clientesServicios`), `dashboard.controller.ts:64-69`.
- **Qué muestra:** `Total de clientes` y `Total de servicios` (cada uno en número grande). Si el valor es 0 se muestra `---` (por la expresión `x ? x : '---'`, `ClientesAndServicios.vue:15,27`).
- **De dónde sale el dato** ✅: `POST /dashboard/clientes-servicios` con `{router: [ids]}`. En BD: servicios (`servicios-clientes`) con `deleted=false` y `deleted_at IS NULL`, de clientes con `deleted_at IS NULL`, en los routers del filtro. `totalServicios` = número de servicios; `totalClientes` = clientes distintos. **Incluye servicios suspendidos** y **excluye los "Retirados"**. No filtra por sucursal ni por operador.
- **Filtros:** `Router:` del Dashboard.
- **Casos límite:** un cliente con servicios en dos routers cuenta una vez si ambos routers están en el filtro. Con filtro de un router, un cliente con servicios en varios routers aparece también (con sus servicios de ese router).
- **Preguntas probables:** "¿Por qué el total de clientes no coincide con el listado de Clientes?" → el listado puede incluir retirados/filtros distintos; esta tarjeta cuenta servicios no retirados.
- **Pendiente de validar en UI:** ❓ coincidencia con el contador de la pantalla Clientes.

---

## ACC-013 · Tarjeta "Total Facturas Pagadas"
- **Ruta UI / name:** `/` (tarjeta verde `card-2`). Botón **`Ver Facturas`** → `/transacciones/mes` (`pagos-registrados.index`, `showToday:'mes'`) — requiere `pagos-registrados.index` en destino.
- **Archivos:** FE: `TotalFacturasPagadas.vue`, `GraficoVentas.vue:194-282` · BE: `dashboard.service.ts:197-387`.
- **Qué muestra:** `<símbolo>` + monto + ` de ` + cantidad + ` pagos` (por ejemplo `$1,250.00 de 37 pagos`), con formato `en-US` y 2 decimales si no es entero (`useDashboard.js:391-397`).
- **De dónde sale el dato** ✅ (lo calcula el gráfico, ACC-017): `POST /dashboard` con `{sucursal_id, rango_fecha, router_id}`. Es la **suma de abonos** (cobros) del periodo, no de facturas: toma cada pago (`pagos.pagos[]`) no eliminado y no `ANULADO`, de facturas en estado `PAGADO`, `AUTORIZADO` o `PENDIENTE`, con `valor + saldo` (saldo solo si > 0) (`dashboard.service.ts:279-285`). El periodo y el conteo dependen del modo y del filtro de fecha de ACC-017:
  - modo `Mes` sin rango: mes calendario actual; con rango: suma de los meses del rango.
  - modo `Semana`: semana actual lunes–domingo (`rangoSemanaActual`, `:100-113`) o el rango elegido.
- **Alcance:** sucursales del filtro; operadores no administradores: solo sus cobros.
- **Casos límite:** depende de `dashboard.pagos_mes` para cargarse (ACC-011); el contador cuenta abonos (filas), no facturas distintas.
- **Preguntas probables:** "¿Por qué dice 'pagos' y no 'facturas'?" → cuenta cobros/abonos. "No coincide con Transacciones" → Transacciones lista por factura/fecha de comprobante.
- **Pendiente de validar en UI:** ❓ coincidencia numérica con `/transacciones/mes`.

---

## ACC-014 · Tarjeta "TRANSACCIONES HOY"
- **Ruta UI / name:** `/` (tarjeta amarilla `card-3`). Botón **`Ver transacciones`** → `/transacciones/true`.
- **Archivos:** FE: `TransaccionesHoy.vue`, `useDashboard.js:353-363` · BE: `dashboard.service.ts:476-536`.
- **Qué muestra:** `<símbolo><total> de <N> facturas` (texto `TRANSACCIONES HOY`).
- **De dónde sale el dato** ✅: `POST /dashboard/transacciones-hoy` `{sucursal_id}`. Pagos con `updated_at::date = hoy` (zona `APP_TIMEZONE`, `:479`), estado `PAGADO/AUTORIZADO/PENDIENTE`, con abonos válidos cuya `fecha_hora_abono` es **hoy según la fecha del servidor de BD** (`CURRENT_DATE`, `:497-510`). Total = suma de `valor + saldo`; `N` = filas de abonos (una factura con dos abonos hoy cuenta 2) (`:521-523`). Operadores no administradores: solo los abonos con su `usuario_id`.
- **Filtros:** `Sucursal:` (se recarga al cambiarla).
- **Casos límite:** mezcla zona horaria de la app con `CURRENT_DATE` de la BD; cerca de medianoche puede diferir ❓.
- **Pendiente de validar en UI:** ❓ conteo con varios abonos el mismo día.

---

## ACC-015 · Tarjeta "Total Facturas No Pagadas"
- **Ruta UI / name:** `/` (tarjeta roja `card-4`). Botón **`Ver facturas`** → `/clientes` filtrando `No Pagados` (`index.clientes`, `estado_servicio:'No Pagados'`).
- **Archivos:** FE: `TotalFacturasNoPagadas.vue`, `GraficoVentas.vue:223-242` · BE: `dashboard.service.ts:129-195`.
- **Qué muestra:** `<símbolo><total> de <N> pagos` de deuda.
- **De dónde sale el dato** ✅: facturas con `estadoSRI = 'NO PAGADO'` de servicios no eliminados y cuya configuración de factura **no** tiene `aplicar_corte = 'Desactivado'` (`:156-158`). Suma `total_servicio` y cuenta. El mes se determina por la **fecha de vencimiento efectiva** = `dia_pago + días de gracia` (`:132-140`). Sin rango de fechas: se toma el mes actual del año en curso; con rango (ACC-017): todo lo que vence dentro del rango. Se filtra por **routers** (los del Dashboard); **no** por sucursal ni por operador (hay facturas impagas sin sucursal, `:286-288`).
- **Casos límite:** depende de `dashboard.pagos_mes`; el rango de fechas que se elige para el gráfico también cambia esta tarjeta.
- **Pendiente de validar en UI:** ❓ coincidencia con el filtro "No Pagados" de Clientes.

---

## ACC-016 · Tarjeta "Resumen del Facturación"
- **Ruta UI / name:** `/` (lista en tarjeta blanca).
- **Archivos:** FE: `ResumenFacturacion.vue` · BE: `dashboard.service.ts:662-737`.
- **Qué muestra** (títulos exactos): `Resumen del Facturación` (sic) → bloque **`Mes Actual`**: `Total Facturas Pagadas`, `Total Facturas Pendientes`, `Total Facturas No Pagadas`; bloque **`El Mes Pasado`**: las mismas tres líneas. Cada valor es un **monto** (insignia gris).
- **De dónde sale** ✅ (`POST /dashboard/resumen-facturacion {sucursal_id}`):
  - **Pagadas** = misma suma de abonos que ACC-013 para ese mes (`totalVentasPorMes`) con sucursales recortadas al alcance del usuario (`sucursalesEfectivas`, `:651-660`).
  - **Pendientes** = suma de `valor` de abonos en facturas con `estadoSRI = 'PENDIENTE'` (pago parcial) por mes de `updated_at`, año en curso (`ventasPorMesPendientes`, `:390-430`); sin filtro por operador.
  - **No Pagadas** = como ACC-015, para los **routers permitidos del usuario** (`usuario.routers`), mes actual y mes anterior (enero ⇒ diciembre del año anterior) (`:662-737`).
  - Sin `dashboard.facturas_no_pagadas` las filas "No Pagadas" se muestran como `0` (`ResumenFacturacion.vue:89-93,171-175`).
- **Filtros:** `Sucursal:`.
- **Pendiente de validar en UI:** ❓ cómo se muestra el monto (formato sin símbolo en las insignias).

---

## ACC-017 · Gráfico "Total de pagos por semana / por mes"
- **Ruta UI / name:** `/` (barras, serie "Pagos").
- **Archivos:** FE: `GraficoVentas.vue`, `boot/echarts.js` · BE: `dashboard.service.ts:197-387,432-461`.
- **Qué muestra:** título `Total de pagos por semana` o `Total de pagos por mes` según el modo; control `Filtrar por fecha:` (selector de rango con icono calendario; la `x` borra el filtro) y botones `Semana` / `Mes`.
- **De dónde sale** ✅: `POST /dashboard {sucursal_id, rango_fecha, router_id}` devuelve `ventasPorMes`, `ventasPorSemana`, `totalNoPagadosPorMes`.
  - Eje en modo `Semana`: `Lunes … Domingo` (sumas por día de la semana de la fecha de actualización del pago; sin rango = semana actual; con rango = todos los días del rango agrupados por día de la semana).
  - Eje en modo `Mes`: meses con total ≠ 0 del año en curso (o del rango).
  - Valores: suma de `valor + saldo` de abonos no eliminados ni anulados; estados `PAGADO/AUTORIZADO/PENDIENTE`. En modo `Mes` sin rango solo cuenta abonos cuyo año-mes coincide con el año-mes de `updated_at` de la factura (`:247-262`) ❓ puede omitir abonos si la factura se actualizó en otro mes.
  - Formato del rango mostrado: `DD/MM/YYYY hasta DD/MM/YYYY` (`GraficoVentas.vue:291-314`).
- **Filtros:** `Sucursal:`, `Router:` (solo afecta a "No pagadas"), rango de fecha, modo.
- **Efectos:** alimenta `facturasPagadas` y `facturasNoPagadas` (ACC-013/015).
- **Pendiente de validar en UI:** ❓ cómo se ve el eje en rangos que cruzan año.

---

## ACC-018 · Tabla "Últimos pagos registrados"
- **Ruta UI / name:** `/` (tabla sin paginación).
- **Archivos:** FE: `UltimosPagos.vue`, `useDashboard.js:327-338` · BE: `dashboard.service.ts:538-605`.
- **Qué muestra:** columnas `CLIENTE`, `COBRADO` (`<símbolo>monto`), `OPERADOR`, `TIEMPO` (`Hace N minuto(s)/hora(s)/día(s)…`), 5 filas fijas; las faltantes se rellenan con `--- --- --- ---` / `---`.
- **De dónde sale** ✅: `POST /dashboard/ultimos-pagos {sucursal_id}`: toma las **20 facturas más recientemente actualizadas** (estado distinto de `NO PAGADO`, cliente no eliminado, con abonos y servicio) y de ellas hasta 5. Administradores: para cada factura, el primer abono válido (`items[0]`); resto de usuarios: solo facturas donde ellos registraron un abono, de entre esas 20 (por eso puede mostrar menos de 5 aunque hayan cobrado más) (`:553-603`). `TIEMPO` se calcula con `fecha_abono` y `hora_abono` (`timeAgo`, `:36-98`).
- **Filtros:** `Sucursal:`.
- **Casos límite:** el símbolo de moneda sale de `MONEDA_SIMBOLO` del backend (ACC-035).
- **Pendiente de validar en UI:** ❓ orden real de `items[0]` (¿último abono primero?).

---

## ACC-019 · Tarjeta "Resumen del sistema"
- **Ruta UI / name:** `/` (lista).
- **Archivos:** FE: `ResumenSistema.vue`, `useDashboard.js:365-377` · BE: `dashboard.service.ts:607-649`, `router/router.service.ts:284-290`.
- **Qué muestra** (etiquetas exactas): `Routers Activos`, `Routers Desconectados`, `Clientes Activos`, `Servicios Inactivos`, `Servicios Activos`.
- **De dónde sale** ✅ (`POST /dashboard/resumen-sistema {company_id, routers}`):
  - `Routers Activos` / `Routers Desconectados` = cantidad de routers de la empresa con `isActive` true / false. **No es conectividad**: el flag solo cambia con la acción manual Activar/Inactivar router (`router.service.ts:244-248`) ✅.
  - `Servicios Activos` / `Servicios Inactivos` = servicios con `isActive` true/false en los routers del filtro (activo = no suspendido); la consulta **no excluye los retirados** (`deleted`) ❓ (`dashboard.service.ts:621-632`).
  - `Clientes Activos` = clientes con `isActive` true que tienen servicio (`planInternet`) en esos routers (`:633-638`).
  - **Caché**: clave `resumen-sistema:<empresa>:<routers>` sin vencimiento; se limpia al crear/editar/activar/eliminar routers y en cambios de clientes (`cache-invalidation.service.ts:27-29`; `router.service.ts:47,140,251,272`; `customers.service.ts:2071,2087,2854`).
- **Advertencias:** el `company_id` lo manda el cliente (el backend no lo toma del token); no se refresca al cambiar el `Router:` del Dashboard.
- **Preguntas probables:** "¿Por qué dice 'Desconectados' si el router está en línea?" → cuenta routers marcados inactivos, no mide conectividad.
- **Pendiente de validar en UI:** ❓ coincidencia con Clientes activos del listado.

---

## ACC-020 · Gráfico "Tráfico Clientes — Últimos 7 días"
- **Ruta UI / name:** `/` (línea + dona); botón de actualizar (icono `refresh`).
- **Archivos:** FE: `TraficoClientes.vue` · BE: `monitoreo-trafico/monitoreo-trafico.controller.ts:65-71`, `monitoreo-trafico.service.ts:263-329`.
- **Qué muestra:** serie horaria `Descarga` / `Subida` (Mbps), valor grande `Velocidad promedio (7 días)`, dona `Descarga %`, `Descarga prom.`, `Subida prom.` y `Pico: <x> ↓ · <y> ↑`. Unidades `Mbps` o `Gbps` (≥1000). Vacío: `Sin datos de tráfico aún.`
- **Avisos:** `Aún no has marcado la interfaz WAN de ningún router. Hazlo en la pestaña Monitoreo de cada router para ver el tráfico total de la red.` y `N de M routers tienen interfaz WAN marcada. El total solo considera esos.`
- **De dónde sale** ✅: `GET /monitoreo-trafico/dashboard/trafico-clientes`. Suma por hora, de los últimos 7 días, el tráfico de la **interfaz WAN** marcada en cada router (tabla `trafico_interfaz_hora`); promedio = media de las horas; limitado a los routers del usuario (`usuario.routers`). No se actualiza solo (hay que pulsar `refresh`).
- **Pendiente de validar en UI:** ❓ requisitos de colector (cada cuánto llegan datos).

---

## ACC-021 · Tabla "Clientes con mayor consumo"
- **Ruta UI / name:** `/` (tabla paginada).
- **Archivos:** FE: `TopConsumidores.vue` · BE: `monitoreo-trafico.controller.ts:73-91`, `monitoreo-trafico.service.ts:339-420`.
- **Qué muestra:** título `Clientes con mayor consumo` (tooltip: "Incluye solo clientes medidos desde el router (colas simples o PPPoE). Los clientes solo-ONU no tienen datos numéricos (SmartOLT entrega únicamente gráficos)."), select `Router`, buscador `Buscar cliente...`, botones `Hoy` / `7 días` / `Mes`; columnas `#`, `Cliente` (enlace a `/clientes/edit/<id>?view=consumo`), `Plan`, `Router`, `Bajada`, `Subida`, `Total` (MB/GB). Vacío: `Sin datos de consumo en el período.` Filas por página 10/20/50.
- **De dónde sale** ✅: `GET /monitoreo-trafico/dashboard/top-consumidores?periodo=&page=&limit=&router=&filter=`; suma `bytes_in/out` de `trafico_dia` (días cerrados) + `trafico_muestra` (hoy) (periodo `semana` = hoy y 6 días atrás; `mes` = desde el 1.º), por servicio, ordenado por total; `limit` máximo 50; cualquier `router` pedido se restringe a los del usuario.
- **Pendiente de validar en UI:** ❓ granularidad de la muestra "hoy".

---

## ACC-022 · Tabla "Monitoreo de Red" en el panel
- **Ruta UI / name:** `/` (opcional). Solo aparece si el ISP la activó en Gestión de Red → Monitoreo de Red (setting `mostrarMonitoreoDashboard`, leído de `GET /settings`) **y** el usuario tiene `index.monitoreo_red`; se dibuja entre "Tráfico Clientes" y "Clientes con mayor consumo" ✅ FE:pages/dashboard/panel/IndexPage.vue:70-72,138-148.
- **Archivos:** FE: `panel/components/MonitoreoRed.vue` (reutiliza `DetalleDispositivo.vue` y `useMonitoreoRed.js`) · BE: `monitoreo-dispositivos/monitoreo-dispositivos.controller.ts:42-57,59-62`, `monitoreo-dispositivos.service.ts:32-90,283-319`, `monitoreo-dispositivos-collector.service.ts:59-463`, `entities/monitor-dispositivo.entity.ts`, `settings/settings.service.ts:60-72`. El detalle de cada pieza está en NET-014 a NET-018 y AUT-024/025 (no se repite aquí).
- **Qué muestra ✅ FE:panel/components/MonitoreoRed.vue:164-368:** título `Monitoreo de Red` (icono `lan`) con insignias `N activos` (gris), `N en línea` (verde), `N caídos` (rojo, solo si >0), `N sin datos` (gris, solo si >0); selectores `Estado` (`Todos`, `En línea`, `Caídos`, `Sin datos`), `Categoría` (`Todas`, Antena, Radio, Backhaul, Torre, Sector, Cliente, Otro), `Router` (solo si el usuario tiene al menos un router; la lista sale de `GET /auth/get-routers` y lleva `TODOS` cuando hay más de uno, `BE:auth/auth.service.ts:295-322`), campo `Buscar nombre o IP...` (debounce 400 ms) y botón de refrescar (tooltip `Actualizar`); columnas `Estado` (icono con tooltip `En línea` / `Caído` / `Sin datos`), `Nombre` (con icono `notifications_off` y tooltip `Alertas silenciadas para este equipo` si `notificar = false`), `IP`, `Categoría`, `Router` (`—` si no hay), `Latencia` (`N ms` solo si está en línea, si no `—`), `Última revisión` (relativa en español con dayjs; `Nunca`; insignia `Inactivo` si el monitoreo del equipo está apagado) y un botón `insights` (tooltip `Historial / Ping`) que abre el diálogo de detalle (NET-016). Vacío: `No hay dispositivos monitoreados.` Filas por página: 10, 20, 50.
- **Comportamiento ✅:** al montar y cada **60 s** recarga el listado y el resumen (`setInterval(…, 60000)`, no hay interruptor "Auto" como en la pantalla del módulo, que recarga cada 30 s, NET-014) (`:146-161`). Los filtros y las filas por página se guardan en `localStorage['dashboard_monitoreo_red_prefs']`, clave distinta de `monitoreo_red_prefs` de la pantalla del módulo; la página no se guarda a propósito (`:21-49,78-102`). Si el router guardado ya no existe en la lista del usuario, se descarta al montar (`:150-156`). Un error de carga deja la tabla vacía sin aviso (`:126-129`).
- **Datos (backend) ✅:** la tabla llama `GET /monitoreo-dispositivos?page&limit&filter&estado&categoria&router` y `GET /monitoreo-dispositivos/dashboard/resumen` en paralelo (`MonitoreoRed.vue:104-132`). El listado excluye borrados lógicos, filtra por nombre o IP (`ILIKE`), estado, categoría y router, y ordena caídos primero, luego `sin_datos`, luego en línea, por nombre (`BE:monitoreo-dispositivos.service.ts:32-90`). Las insignias del título vienen de `dashboard/resumen`: cuenta solo dispositivos con `activo = true` (`total`, `online`, `offline`, `sin_datos`) y **no cambian con los filtros** de la tabla (`:283-319`). Ni el listado ni el resumen se limitan a los routers del usuario (el controlador no recibe al usuario, `controller.ts:42-57`).
- **Cómo se calcula el estado (colector, AUT-024) ✅:** `@Cron('* * * * *')` con lock `monitoreo-dispositivos:vigilar`; entran dispositivos `activo` sin ping previo o con `ultimo_ping_en` anterior a `intervalo_min` (1, 2 o 5 min); con respuesta ⇒ `online` y fallos a 0; sin respuesta suma un fallo y al llegar a `umbral_fallos` (def. 3) pasa a `offline` y abre una caída; `sin_datos` es el valor inicial y el que vuelve al reactivar el monitoreo o cambiar IP/router (`BE:monitoreo-dispositivos-collector.service.ts:80-115,393-463`; `monitoreo-dispositivos.service.ts:105-135`). El estado depende de que el router de origen esté `isActive`; si no, sus equipos quedan en el último estado (AUT-024).
- **Acceso:** la tabla exige `index.monitoreo_red` en el panel (`IndexPage.vue:70-72`) y la consulta del ajuste se omite sin ese permiso (`:138-141`). El backend del módulo solo exige JWT (`@Auth()` de clase, `controller.ts:20`) y `GET /settings` también (`settings.controller.ts:7-18`); no hay permisos de backend propios.
- **Valor por defecto del ajuste ✅:** `mostrarMonitoreoDashboard` es `boolean NOT NULL DEFAULT false` (`BE:settings/entities/setting.entity.ts:64-66`; `BE:migrations/1786300000000-SettingMonitoreoDashboard.ts:21`); si `GET /settings` falla, la tabla no se muestra (`IndexPage.vue:145-147`). El interruptor vive en la pantalla del módulo, "Mostrar en el Dashboard" (NET-014), y aplica a toda la empresa.
- **Casos límite:** la tabla del panel muestra dispositivos de **todos** los routers aunque el usuario tenga alcance limitado (mismo hallazgo que NET-014); el panel no ofrece alta, edición ni eliminación (solo el botón `Historial / Ping`).
- **Pendiente de validar en UI:** ❓ aspecto de la tabla con filtros guardados de una sesión anterior.

---

## ACC-023 · Cabecera del layout (bienvenida, rol, tema, perfil, firma electrónica)
- **Ruta UI / name:** barra superior de todas las pantallas autenticadas. `layouts/MainLayout.vue` es el componente padre de las rutas hijas de `/` (`FE:router/routes.ts:17-30`).
- **Archivos:** FE: `layouts/MainLayout.vue`, `layouts/ChipPlanSuscripcion.vue`, `layouts/EstadoSRI.vue`, `layouts/BotonJornada.vue`, `layouts/Notifications.vue`, `stores/auth-user.ts`, `composables/useHelpers.js`, `composables/useAppIspmax.js`, `composables/useFacturacionElectronica.js` · BE: `companies/companies.controller.ts`, `companies/companies.service.ts`, `auth/auth.service.ts`.
- **Para qué sirve:** identificar a quien está dentro (nombre y rol), dar acceso a su perfil y al cierre de sesión, y concentrar los avisos de estado (plan, SRI, firma electrónica, notificaciones).
- **Acceso:** ninguno; el componente se dibuja para todo usuario autenticado (`meta.requiresAuth:true` en cada ruta hija, `FE:router/routes.ts:20-26`). Cada elemento tiene su propia condición (columna siguiente).
- **Elementos, de izquierda a derecha ✅:**

  | Elemento (texto exacto) | Qué hace | Condición |
  |---|---|---|
  | Botón `menu` (aria-label `Menu`) | abre/cierra el menú lateral (`authUserStore.drawer`) (`MainLayout.vue:15-24`) | siempre |
  | `Bienvenido:` + nombre | nombre completo del JWT en mayúsculas; si tiene **más de 3 palabras** conserva todas menos la última, de la que solo deja la inicial y un punto (`:280-288`, `:34-39`) | oculto en pantallas `xs` (`:27`) |
  | `Rol:` + rol | `claim.roles[0]` (`:290`, `:41-43`) | oculto en `xs` |
  | Chip del plan | ACC-027 (`:44`) | solo cupo bajo; en `xs` pasa al pie del menú (`:169-174`) |
  | Chip `SRI` | ACC-028 (`:52-57`) | `claim.company.requiere_facturacion` **y** facturación electrónica activa |
  | Botón de jornada | ACC-026 (`:60`) | `enLaApp && esTecnico` |
  | Icono `dark_mode` / `light_mode` | alterna el tema (`$q.dark.toggle()`, `:62-71`); guarda `modeDark` en el store persistido (`:375-381`) y lo aplica al montar (`:393`) | siempre |
  | Campana | ACC-025 (`:73`) | siempre |
  | Foto de perfil (`image_perfil`, máx. 95×50 px) | abre el menú de abajo (`:75-105`) | siempre |

- **Menú de la foto de perfil ✅:** `Mi Perfil` (va a `editar.usuario.profile` con `term = claim.id`, ACC-008, `:82-93`) · `Cambiar de empresa` (solo dentro de la app ISPMAX, `:96-98`) · `Cerrar Sesión` (`cerrarSesion`, ACC-002, `:100-102`).
- **Cambiar de empresa (solo app ISPMAX):** diálogo `Cambiar de empresa` — «La app se va a reiniciar y te va a pedir la dirección del panel.» — botones `Cancelar` / `Cambiar`; al aceptar llama al plugin nativo `cambiarIsp` (`MainLayout.vue:255-264`, `FE:composables/useAppIspmax.js:21-33`). "Dentro de la app" = existe `window.Capacitor` en plataforma nativa con el plugin `Ispmax` (`useAppIspmax.js:12-22`).
- **Aviso de firma electrónica (franja bajo la barra) ✅:**
  - Solo si la instalación tiene facturación electrónica activa y la empresa `requiere_facturacion` (`MainLayout.vue:297-301`). Consulta `GET /companies/estado-certificado/:empresa_id` una sola vez, al montar el layout (`:295-309`, `:395`); un error se ignora en silencio.
  - Estados que devuelve el backend: `no_aplica`, `sin_certificado` (sin archivo), `desconocido` (hay archivo pero no se pudo leer la caducidad), `vencido` (días < 0), `por_vencer` (días ≤ **15**, `UMBRAL_DIAS`) y `vigente`; los días se redondean hacia arriba (`BE:companies/companies.service.ts:98-161`). Si la fecha guardada es ilegible y hay clave, el backend la pide al microservicio de facturación y la guarda (`:121-142`).
  - El panel solo pinta `vencido`, `por_vencer` y `sin_certificado`:

  | Estado | Icono / color | Texto exacto (`MainLayout.vue:320-347`) |
  |---|---|---|
  | `vencido` | `error`, rojo | `Tu firma electrónica venció el DD/MM/AAAA. El SRI no autorizará tus facturas hasta que la actualices.` (sin fecha: `venció.`) |
  | `por_vencer` | `warning`, ámbar | `Tu firma electrónica vence en N día(s) (DD/MM/AAAA). Renuévala para no interrumpir la facturación.` |
  | `sin_certificado` | `warning`, ámbar | `Tu empresa requiere facturación pero no tiene una firma electrónica cargada. Súbela para poder emitir comprobantes.` |

  - Botones: `Actualizar firma` (icono `badge`) → `index.empresa` con `empresa_id = claim.company.id` (`:368-373`); `✕` con tooltip `Ocultar por hoy` guarda la fecha de hoy en `localStorage['cert-aviso-cerrado:<empresa>']` y el aviso reaparece al día siguiente (`:117-136`, `:352-366`).
- **Cierre por inactividad ✅:** `<Vidle :duration="3000" :events="['mousemove','keydown','mousedown','touchstart','scroll']" @idle="cerrarSesion">` (`:213-217`). En `v-idle` 1.0.3 la duración se mide en **segundos** (`setInterval(idle, props.duration * 1000)`, `node_modules/v-idle/src/components/vidle.ts`) ⇒ **50 minutos** sin ninguno de esos eventos. No se declaran `reminders`: no hay aviso previo ni cuenta regresiva.
- **Menú lateral colapsable:** botón circular verde en el borde derecho del menú (`chevron_left` / `chevron_right`) alterna el modo compacto (ancho 100 px frente a 290 px) (`:140-145`, `:176-195`, `:444-451`).
- **Refresco de permisos:** `obtenerPermisos()` corre al montar y en **cada cambio de ruta** (`:383-402`, `:408-442`); ver ACC-002.
- **Datos que alimentan la cabecera:** nombre, rol, empresa y foto salen del JWT/store, que no se refrescan hasta volver a entrar (ACC-002); la foto de perfil es `images-user/<foto>` y el logo de la empresa `images/<logo>` (`FE:pages/sesion/Login.vue:78-93`, ACC-039).
- **Mensajes (texto exacto):** los de la tabla anterior, `Cambiar de empresa` y los de ACC-025/026/028.
- **Relaciones:** ACC-002, ACC-008, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030 (la ficha que abre `Actualizar firma`).
- **Casos límite y advertencias:**
  - El aviso se consulta solo al cargar la página: renovar la firma no lo quita hasta recargar.
  - `desconocido` y `vigente` no muestran nada.
  - El texto del aviso nombra al **SRI**; el panel no comprueba que el proveedor sea el SRI (`usaSri`), solo `facturacionElectronicaActiva` ⇒ en una instalación de otro país con `requiere_facturacion` activo podría aparecer `sin_certificado` ❓ (la firma `.p12` es solo de Ecuador, ACC-030).
  - Cambiar el tema se guarda en el navegador, no en el usuario.
- **Preguntas probables de usuarios:**
  1. "Me sale una franja roja de firma electrónica" → ficha de la empresa; la firma venció (ACC-030).
  2. "¿Cómo quito la franja?" → `✕` la oculta hasta mañana; solo desaparece renovando la firma.
  3. "El nombre sale abreviado" → más de 3 palabras ⇒ inicial del último apellido.
  4. "¿Por qué me cerró la sesión sin avisar?" → 50 minutos de inactividad, usuario desactivado u horario (ACC-002, ACC-010).
  5. "¿Cómo cambio de modo oscuro a claro?" → icono de la luna/sol.
  6. "¿Dónde cambio mi foto o mi contraseña?" → `Mi Perfil` (ACC-008).
  7. "No veo el botón de jornada" → solo técnicos y solo dentro de la app (ACC-026).
- **Pendiente de validar en UI:** ❓ que el `v-idle` realmente cierre a los 50 min con la pestaña en segundo plano (los temporizadores del navegador pueden pausarse); ❓ aspecto del aviso en móvil; ❓ la franja de firma en instalaciones no ecuatorianas.

---

## ACC-024 · Menú lateral
- **Ruta UI / name:** panel izquierdo (`q-drawer`) de todas las pantallas autenticadas; `layouts/SideBarMenu.vue` se monta dentro de `MainLayout.vue:164`.
- **Archivos:** FE: `layouts/SideBarMenu.vue`, `layouts/MainLayout.vue`, `components/EssentialLink.vue`, `composables/useRolPermisos.js`, `composables/useCompany.js`, `router/routes.ts`, `router/auth-guard.ts`.
- **Para qué sirve:** navegar entre módulos; cada ítem aparece solo si el rol tiene la clave de permiso correspondiente.
- **Acceso:** `validarPermisos('clave')` por ítem y `tieneAlguno([...])` por grupo (ACC-003). `SUPER-ADMINISTRADOR` lo ve todo. El menú **no** consulta al backend para decidir (los permisos viven cifrados en el store, ACC-002).
- **Encabezado ✅:** logo de la empresa (clic ⇒ `/`, `MainLayout.vue:150-162`) · rótulo `Empresa:` y debajo `nombre_comercial` de la primera empresa devuelta por `GET /companies` (`SideBarMenu.vue:70-83`, `:63`, `FE:composables/useCompany.js`).
- **Estructura (etiquetas exactas, con sus tildes o la falta de ellas) ✅:**

  | Grupo (icono) | Se muestra si el rol tiene alguna de | Ítems (etiqueta · ruta · clave del ítem) |
  |---|---|---|
  | `Dashboard` (`home`) — ítem único | `dashboard.total_clientes`, `dashboard.facturas_pagadas`, `dashboard.transacciones_hoy`, `dashboard.facturas_no_pagadas`, `dashboard.resumen_facturacion`, `dashboard.pagos_mes`, `dashboard.resumen_sistema`, `dashboard.ultimos_pago` (`:93-102`) | `/` (`exact`) |
  | `Gestion de Red` (`language`) | `index.routers`, `index.red_ipv4`, `redesIpv6.index`, `index.planes`, `index.caja_nap`, `index.mapa`, `index.monitoreo_red`, `smartOLT.index`, `adminOLT.index` (`:112-122`) | `Routers` · `index.routers` · `index.routers` — `Redes IPv4` · `index.red_ipv4` — `Redes IPv6` · `redesIpv6.index` — `Planes de servicio` · `index.planes` — `Cajas Nap` · `index.caja_nap` — `Mapa de Red y Clientes` · `index.mapa` — `Monitoreo de Red` · `index.monitoreo_red` — `SmartOLT` · `smartOLT.index` — `AdminOLT` · `adminOLT.index` — `Personalizado` · `personalizado.index` |
  | `Gestion de Clientes` (`manage_accounts`) | `index.clientes`, `tickets.index`, `instalaciones.index` (`:254-258`) | `Clientes` · `index.clientes` — `Tickets` · `tickets.index` — `Instalaciones` · `instalaciones.index` |
  | `Finanzas` (`account_balance`) | `registrar.pago`, `registrar.promesa-pago`, `finanzas.pagos-registrados.index`, `promesa-pago.index`, `index.ingresos_egresos`, `index.personas`, `index.facturas_libre`, `pagos-registrados.index`, `conciliacion-bancaria.index` (`:305-321`) | `Registrar Pago` · `/registrar-pago` · cualquiera de `registrar.pago`, `registrar.promesa-pago`, `finanzas.pagos-registrados.index`, `promesa-pago.index` — `Ingresos / Egresos` · `/ingresos-egresos` · `index.ingresos_egresos` — `Personas` · `/personas` · `index.personas` — `Ventas` · `/ventas` · `index.facturas_libre` — `Transacciones` · `/transacciones/true` · `pagos-registrados.index` — `Cobros por pasarela` · `/cobros-pasarela` · `cobros-pasarela.index` — `Conciliación bancaria` · `/conciliacion-bancaria` · `conciliacion-bancaria.index` (`:18-61`) |
  | `Almacén` (`inventory_2`) | `index.proveedores`, `index.compras`, `index.productos`, `index.category`, `index.equipos` (`:341-347`) | `Proveedores` · `index.proveedores` — `Compras` · `index.compras` — `Productos y Servicios` · `index.productos` — `Categorías` · `index.category` (la ruta se llama `index.categories`) — `Equipos` · `index.equipos` |
  | `Ajustes` (`settings`) — ítem único | `variables.dias-habilitados`, `variables.facturacion`, `variables.horario.cortes`, `variables.reintentos.mikrotik`, `variables.reintentos.smartOLT`, `variables.aplicar-cortes`, `variables.opciones-cortes`, `variables.vincular.whatsApp`, `variables.config.servidor.correo`, `ajuste.empresa`, `ajuste.forma-pago`, `ajuste.plantillas` (`:421-434`) | `ajustes.index` (`/ajustes`) |

- **Resaltado y apertura ✅:** el grupo que contiene la ruta actual se abre solo (`default-opened`) y su título se pinta con `menu-parent-active`; el ítem activo recibe `tab-active`. Se decide por **prefijo de path** (`rutaEn`), no por nombre de ruta: p. ej. `/clientes`, `/mapa-clientes`, `/tickets`, `/instalaciones` resaltan Gestion de Clientes (`SideBarMenu.vue:9-17`).
- **Cómo se relaciona con el guard:** que el ítem se vea no garantiza que la ruta abra, porque el guard compara el **nombre de ruta** con la lista de permisos; en `Categorías` se usa el mapa `permisoPorRuta` (`index.categories → index.category`, `FE:router/auth-guard.ts:81-89`). `AdminOLT`, `Personalizado`, `/mapa-clientes` y `/red/getIp` no tienen clave en el catálogo ⇒ solo los ve y abre `SUPER-ADMINISTRADOR` (ACC-003).
- **Mensajes:** ninguno.
- **Relaciones con otros módulos:** ACC-003 (modelo de permisos), ACC-005 (catálogo), ACC-023 (cabecera), AJS-001 (tarjetas de Ajustes).
- **Casos límite y advertencias ✅:**
  - El permiso del Dashboard es `dashboard.ultimos_pago` (singular) en el menú y `dashboard.ultimos_pagos` (plural) en el catálogo (`pages/dashboard/usuarios/permisos/dashboard-permisos.json:13`): un rol con **solo** "Ver últimos pagos agregados" no ve el ítem Dashboard, aunque la pantalla `/` abre (`auth-guard.ts:139`).
  - La visibilidad del grupo `Finanzas` no incluye `cobros-pasarela.index`: un rol con solo ese permiso no ve el grupo, y por tanto tampoco el ítem `Cobros por pasarela` (`SideBarMenu.vue:305-321`).
  - El ítem `Ajustes` no cuenta `ver.logs`, `base-datos.*`, `variables.ver.*`, `index.usuario` ni `index.rol`: con solo esas claves el ítem no aparece y hay que entrar por URL (`/ajustes`, `/ajustes/logs`…); ver AJS-001.
  - El comentario del código (`:306-311`) reconoce que una versión anterior de la lista dejaba la sección Finanzas siempre oculta.
  - Las etiquetas del menú son las del código: `Gestion de Red`, `Gestion de Clientes` (sin tilde) y `Ventas` (la pantalla se titula "Listado de Comprobantes" y el manual la llama Facturas).
  - Los ítems no tienen tooltip; en modo compacto solo se ven los iconos.
- **Preguntas probables de usuarios:**
  1. "No me aparece un módulo/botón" → falta la clave del ítem (tabla) o del grupo.
  2. "Veo el menú pero al pulsar me manda al inicio" → falta la clave de **ruta** (ACC-003).
  3. "No me aparece Ajustes pero sí tengo Logs" → `ver.logs` no cuenta para el ítem.
  4. "¿Dónde está Facturas?" → el ítem se llama `Ventas`.
  5. "No veo Cobros por pasarela" → necesita `cobros-pasarela.index` **y** otra clave que muestre el grupo Finanzas.
  6. "¿Dónde está AdminOLT/Personalizado?" → solo SUPER-ADMINISTRADOR.
- **Pendiente de validar en UI:** ❓ aspecto del menú en móvil (`xs`) y en modo compacto; ❓ que el grupo `Finanzas` realmente quede oculto con solo `cobros-pasarela.index`.

---

## ACC-025 · Notificaciones (campana) y canal en vivo (WebSocket)
- **Ruta UI / name:** icono de campana en la cabecera (`layouts/Notifications.vue`, montado en `MainLayout.vue:73`). No tiene ruta propia: abre un menú flotante.
- **Archivos:** FE: `layouts/Notifications.vue`, `stores/estados-mantenedor.ts` · BE: `notifications/notifications.controller.ts`, `notifications/notifications.service.ts`, `notifications/entities/notification.entity.ts`, `notifications/dto/create-notification.dto.ts`, `pasarelas-pago/pasarelas-pago.service.ts`, `monitoreo-dispositivos/monitoreo-dispositivos-notifier.service.ts`, `ticket/ticket.service.ts`, `instalaciones/instalaciones.service.ts`, `pagos/notificar-cobro-queue.processor.ts`, `pagos/notificar-recortatorio-pago-queue.processor.ts`, `smart-olt/smart-olt.service.ts`, `admin-olt/admin-olt.service.ts`, `auth/auth.service.ts`.
- **Para qué sirve:** lista persistente de avisos por usuario (campana) y recepción de eventos en vivo (otros avisos emergentes, refresco de pantallas, cierre de sesión).
- **Acceso:** ninguno; todo usuario autenticado. Cada usuario ve **solo sus** notificaciones en la campana (`GET` filtra por `usuario.id`).
- **La campana (UI) ✅:**
  - Icono `notifications` (gris) o `notifications_active` (ámbar) si hay sin leer; insignia roja con el número de sin leer; se anima (`bell-shake`) 0,5 s después de cargar si hay sin leer y cada vez que llega una (`Notifications.vue:23-62`, `:267-282`, `:430-455`).
  - Al **abrir** el panel: recarga la primera página (5 notificaciones) y marca como leídas las que muestra (`watch(modalNotificationOpen)` → `recargarNotificaciones` + `marcarNotificacionesALeidas`, `:64-70`, `:128-140`). El orden es: **no leídas primero**, luego por fecha descendente (`BE:notifications.service.ts:57-58`).
  - Cabecera `NOTIFICACIONES` con el botón `Eliminar todas` (`delete_sweep`); cada fila muestra título, descripción, fecha `DD/MM/YYYY HH:mma` (24 h + `am`/`pm`, p. ej. `15:20pm`) y un icono: `info` naranja = sin leer, marca verde = leída, spinner mientras se actualiza (`:296-372`).
  - `✕` por fila (tooltip `Eliminar`); clic sobre la fila la marca como leída (`:316-386`).
  - `Ver notificaciones anteriores` (si `currentPage < totalPages`) trae las siguientes 5 excluyendo las ya cargadas y las marca leídas (`:387-396`, `BE:notifications.controller.ts:30-31`, `service.ts:51-55`).
  - Vacío: `SIN NOTIFICACIONES.` con el botón `refrescar` (`:406-420`). Mientras carga: tres puntos animados.
  - `Eliminar todas` abre el diálogo `Eliminar notificaciones` — «¿Seguro que deseas eliminar TODAS las notificaciones?» (`Cancelar` / `Eliminar`, persistente) (`:88-108`).
  - Errores: `No se pudo eliminar la notificación`, `No se pudieron eliminar las notificaciones` (rojo, arriba); al cargar solo se escribe en consola.
- **Endpoints ✅ (`@Auth()`, sin comprobar que el `:user_id` sea el solicitante):**

  | Acción | Endpoint | Efecto |
  |---|---|---|
  | Listar | `POST /notifications/by-user/:user_id?page=&limit=` (`limit` por defecto 5) con `{notifications_id}` a excluir | devuelve `{pagination:{items,meta}, totalNotificatonWithRead}`; el total es el número de `read=false` del usuario (`notifications.controller.ts:29-37`, `service.ts:37-86`) |
  | Marcar leída | `PATCH /notifications/:id` `{read:true}` | `update` directo (`:88-94`) |
  | Eliminar una | `DELETE /notifications/:id` | `Notificación eliminada` (`:96-99`) |
  | Eliminar todas | `DELETE /notifications/by-user/:user_id` | `Notificaciones eliminadas` (`:101-110`) |
  | Crear | `POST /notifications` y `NotificationsService.create` | `titulo`, `descripcion` (texto), `usuario` (UUID), `read` opcional (`create-notification.dto.ts`) |

- **Quién crea notificaciones persistentes ✅ (título → cuándo → destinatarios):**

  | Título | Cuándo | Destinatarios |
  |---|---|---|
  | `Ticket Asignado` | se asigna un ticket o se agrega como técnico de apoyo (`ticket.service.ts:95-115`) | el técnico y los de apoyo |
  | `Falla al enviar Email` / `WhatsApp Desvinculado` / `Error en WhatsApp` | falla el aviso de un ticket o de una instalación al cliente o al técnico (`ticket.service.ts:569-575,631-636`, `instalaciones.service.ts:481-486,553-558`) | el usuario que disparó el aviso |
  | `WhatsApp Desvinculado` / `Cliente sin WhatsApp` | no sale el recibo de pago por WhatsApp (`notificar-cobro-queue.processor.ts:274-279,296-301`) | el operador que registró el cobro |
  | `WhatsApp Desvinculado` (sesión caída: se crea una por **cada** usuario activo) · `Falla al enviar WhatsApp Oficial`, `Falla al enviar WhatsApp`, `Cliente sin WhatsApp`, `Falla al enviar Email` | falla un recordatorio de pago (`notificar-recortatorio-pago-queue.processor.ts:337-350,772-777,927-932,1082-1087`) | el primero, todos los usuarios activos; los demás, `SUPER-ADMINISTRADOR` y usuarios cuyo router incluye el del cliente |
  | `ONU no encontrada en SmartOLT` · `N ONU(s) no encontradas en SmartOLT` / `…en AdminOLT` | una ONU deja de responder o la validación masiva marca inválidas (`smart-olt.service.ts:140-170,1885-1912`, `admin-olt.service.ts:737-743`) | usuarios con el rol `admin` (minúscula, ver ACC-003) |
  | `🔴 Equipo caído: <nombre>` · `🟢 Equipo recuperado: <nombre>` | vigilancia de equipos (`monitoreo-dispositivos-notifier.service.ts:127-141`, `:567-587`) | usuarios activos con rol `SUPER-ADMINISTRADOR` o `ADMINISTRADOR` (`:589-596`) |

  No existe notificación persistente de "corte aplicado" ni de cambio de estado de un comprobante: esos eventos solo refrescan pantallas (ver siguiente tabla). Los avisos de fallo de WhatsApp/correo de tickets/instalaciones/recordatorios se **guardan además** en Mensajes masivos/Logs (otros dominios).
- **Canal en vivo (socket.io) ✅:** al montar la cabecera (`connectToServer()`, `Notifications.vue:253`) abre un `Manager` hacia `VITE_WEBSOCKET` con la cabecera `autentication: <id del usuario>`, reconexión automática (10 intentos, 5 s) y un reintento manual cada **30 s** si queda desconectado (`:144-160`, `:244-249`). El servidor de sockets **no está en el ZIP** (el backend le hace `POST` a `HOST_WEBSOCKET/api/enviar-notificacion/<usuario>/notificacion` y `…/enviar-notificacion-global/<tipo>`) ❓.

  | Evento (`socket.on`) / `data.tipo` | Qué hace el panel (`Notifications.vue`) |
  |---|---|
  | `updateStateInvoice` | si está en `cliente.edit` recarga los pagos del servicio; en `registrar.pago` recarga el pago; en `index.facturas_libre` recarga la lista (`:172-184`) |
  | `ESTADO_SRI` | actualiza el chip SRI y, si el SRI está arriba, pide el reenvío de comprobantes (ACC-028) (`:187-189`) |
  | `user_inactive` (`message` = id) | si coincide con el usuario actual, `cerrarSesion()` (`:190-191`) |
  | `pago_pasarela` | si está en el perfil del cliente cuyo servicio recibió el pago (o el aviso no trae servicio) recarga sus pagos; en ese caso o en `pagos-registrados.index` (Transacciones) muestra, arriba, en verde: `Pago recibido: <moneda> <monto> de la factura N° <n>` (`:192-208`, `BE:pasarelas-pago.service.ts:47-67`) |
  | `pago_pasarela_alerta` | notificación roja, arriba, **sin cierre automático**, con botón `Entendido`: título `data.titulo` (o `Problema con un cobro por pasarela`) y detalle `Factura N° … · <moneda> <monto>` + `detalle`; se muestra en **cualquier** pantalla (`:209-226`, `pasarelas-pago.service.ts:218-240`) |
  | `anulacion` (solo en `registrar.pago`) | recarga el pago (`:227-229`) |
  | `whatsApp` | aviso amarillo con `data.message`, p. ej. `No es posible enviar mensaje por whatsApp, debes vincular un dispositivo` o `El cliente <nombre> no usa whatsApp, no fue posible enviar el mensaje.` (`:234-235`, `invoice-queue.processor.ts:889-895,921-925`) |
  | cualquier otro (lleva `info`) | añade la notificación al principio de la lista, suma 1 al contador y anima la campana (`:236-241`) |

  El orden de las ramas importa: si la pantalla actual es `index.facturas_libre` (menú **Ventas**) o `cliente.edit` (perfil del cliente), cualquier evento sin tratamiento específico anterior (incluidos `whatsApp` y las notificaciones de campana) **solo recarga esa pantalla** y no se muestra ni suma al contador hasta volver a abrir el panel (`:230-233` antes de `:234-241`).
- **Reglas de negocio (backend):** las notificaciones se guardan por usuario; no hay caducidad ni limpieza automática (solo el borrado manual). Desactivar un usuario avisa por socket `user_inactive` (`auth.service.ts:217-226`).
- **Efectos secundarios externos:** servidor de sockets (`HOST_WEBSOCKET`/`VITE_WEBSOCKET`); WhatsApp/correo (origen de varios avisos).
- **Relaciones:** ACC-002 (cierre remoto), ACC-023, ACC-028, ACC-029, MSG-003 (recordatorios), NET-0xx (monitoreo de equipos), SOP (tickets), COB (pasarelas).
- **Casos límite y advertencias:**
  - Abrir la campana marca como leídas solo las notificaciones **que se muestran** (5 por página): con más de 5 sin leer, el contador baja por tramos.
  - `updateStatusNotification` pone `currentPage = 0` tras cada marca, lo que reinicia la paginación (`:124`).
  - El backend no comprueba que `:user_id` sea el del JWT: cualquier usuario autenticado puede listar o borrar las notificaciones de otro por API ✅ (ver Hallazgos).
  - La cabecera `autentication` lleva solo el id del usuario; que el servidor de sockets la verifique no es comprobable aquí ❓.
  - Las notificaciones de ONU van solo al rol `admin` en minúscula; si la instalación no tiene ese rol nadie las recibe.
  - Un `pago_pasarela` solo avisa si el operador está en el perfil afectado o en Transacciones; en el resto de pantallas se ignora (no hay campana).
- **Preguntas probables de usuarios:**
  1. "¿Qué significa el número rojo de la campana?" → notificaciones sin leer.
  2. "Abrí la campana y el número no bajó a cero" → solo se marcan las 5 visibles; use `Ver notificaciones anteriores`.
  3. "No me llegan avisos en tiempo real" → el socket está desconectado (reintenta cada 30 s) o está en Ventas/perfil de cliente.
  4. "Me apareció un aviso rojo de pasarela que no se quita" → es una alerta de cobro a medias; `Entendido` la cierra, revise Cobros por pasarela.
  5. "¿Puedo borrar todas?" → `Eliminar todas` (sin deshacer).
  6. "¿Por qué no recibo avisos de equipos caídos?" → solo SUPER-ADMINISTRADOR y ADMINISTRADOR activos.
- **Pendiente de validar en UI:** ❓ entrega real por el servidor de sockets (no incluido); ❓ forma exacta de la fecha (`HH:mma` produce `15:20pm`); ❓ qué ocurre con la insignia al llegar un aviso mientras se está en Ventas.

---

## ACC-026 · Jornada y ubicación del técnico
- **Ruta UI / name:** botón de ubicación en la cabecera (`layouts/BotonJornada.vue`, `MainLayout.vue:59-60`) y latido silencioso de ubicación (`composables/useLatidoUbicacion.js`). El mapa que las muestra es SOP-029.
- **Archivos:** FE: `layouts/BotonJornada.vue`, `composables/useLatidoUbicacion.js`, `composables/useAppIspmax.js`, `composables/useUbicacion.js`, `layouts/MainLayout.vue` · BE: `ubicacion-tecnicos/ubicacion-tecnicos.controller.ts`, `ubicacion-tecnicos/ubicacion-tecnicos.service.ts`, `ubicacion-tecnicos/dto/guardar-ubicacion.dto.ts`.
- **Para qué sirve:** que la central sepa dónde está cada técnico para asignarle soportes y verlo en el mapa. Detalle del mapa y del permiso `mapa.tecnicos.index`: SOP-027, SOP-028 y SOP-029 (`notes/inventory/sop.md`).
- **Acceso:** el rol debe llamarse exactamente `TECNICO` (comparación sin distinguir mayúsculas contra `claim.roles`; **no** es un permiso del catálogo) (`MainLayout.vue:277-278`, `useLatidoUbicacion.js:33`). El botón exige además estar dentro de la app ISPMAX y que esa versión de la app traiga `iniciarJornada` (`BotonJornada.vue:26`, `useAppIspmax.js:42-51`).
- **Botón de jornada ✅ (solo app Android):** icono `location_off` (gris) → `share_location` (verde con punto pulsante) cuando hay jornada. Tooltip: `Iniciar jornada: compartir tu ubicación con la central` / `En jornada desde las HH:MM. Tocá para terminarla.` (`BotonJornada.vue:119-135`).

  | Acción | Diálogo (texto exacto) | Resultado |
  |---|---|---|
  | Iniciar | título `Iniciar jornada`: «Mientras dure la jornada, la app comparte tu ubicación con la central cada 2 minutos, aunque la cierres o apagues la pantalla. Vas a ver una notificación fija mientras esté activa. Termina cuando toques **Terminar jornada**, al cerrar sesión, o sola a las 12 horas.» · `Iniciar` / `Cancelar` | pide permiso de ubicación, arranca el servicio nativo con el token de sesión y avisa `Jornada iniciada`; si falla, aviso amarillo con el mensaje o `No se pudo iniciar la jornada.` (`:54-80`) |
  | Terminar | título `Terminar jornada`: «Estás en jornada desde las HH:MM. Al terminarla se deja de compartir tu ubicación.» · `Terminar` / `Seguir` | detiene el servicio y avisa `Jornada terminada` (`:82-99`) |

  La jornada también termina al cerrar sesión (`useHelpers.js:29-46`) y se puede terminar desde la notificación fija; al volver a la app se relee el estado (`BotonJornada.vue:101-116`). Las "12 horas" y los "2 minutos" son texto del diálogo: los aplica la app nativa, que no está en el ZIP ❓.
- **Latido desde el panel (navegador o app) ✅:** `iniciarLatidoUbicacion(claim.roles, claim.id)` al montar el layout (`MainLayout.vue:401`); se detiene al desmontar (`:404-406`). Solo si el rol es `TECNICO` y el equipo **ya concedió** el permiso de ubicación (nunca lo pide por su cuenta). Cada **2 minutos**, y al volver a la pestaña, envía la ubicación **solo** si la pantalla está visible, no hay jornada en curso y la lectura se movió ≥ **40 m** o pasaron ≥ **10 min** desde la última (`useLatidoUbicacion.js:25-27,74-110,168-178`).
- **Aviso único `Tu ubicación` ✅:** la primera vez (clave `localStorage['ispmax/aviso-ubicacion/<id>']`) un diálogo persistente explica que «Mientras tengas el sistema abierto, tu ubicación se comparte con la central para saber a quién asignarle cada soporte. Con el sistema cerrado no se comparte nada.» con `Activar` / `Ahora no`; no se vuelve a preguntar (`useLatidoUbicacion.js:116-165`).
- **Backend ✅:** `POST /ubicacion-tecnicos` `{latitud(-90..90), longitud(-180..180), precision?, origen? 'navegador'|'app', dispositivo? ≤250, capturada_en?}` guarda **una fila por usuario** (upsert por `usuario_id`) ⇒ no hay historial (`ubicacion-tecnicos.service.ts:41-61`, `guardar-ubicacion.dto.ts`). Coordenadas inválidas ⇒ 400 `La ubicación que mandó el equipo no es válida.` `GET /ubicacion-tecnicos` exige `SUPER-ADMINISTRADOR` o la clave `mapa.tecnicos.index` (403 `No tenés permiso para ver la ubicación de los técnicos`), lista solo usuarios activos con aviso en las últimas **12 h** (`HORAS_VISIBLE`) (`:68-130`, `:121-130`).
- **Efectos secundarios externos:** plugin nativo Capacitor `Ispmax` (servicio de Android con notificación fija); geolocalización del navegador.
- **Relaciones:** SOP-027/028/029, ACC-002 (`cerrarSesion` termina la jornada), ACC-023.
- **Casos límite y advertencias:**
  - Con la pantalla apagada o el panel en segundo plano el navegador no envía nada; solo la jornada lo hace.
  - Si el técnico rechaza el aviso o el permiso del sistema, no aparece en el mapa.
  - El nombre de rol distinto de `TECNICO` (p. ej. `TECNICO-INSTALADOR`) no comparte ubicación ni ve el botón.
  - Los mensajes usan voseo (`Tocá`, `tenés`).
- **Preguntas probables de usuarios:**
  1. "No me aparece el botón de jornada" → solo en la app ISPMAX con rol TECNICO y versión que la soporte.
  2. "¿Me siguen cuando cierro la app?" → solo durante una jornada iniciada.
  3. "El técnico no sale en el mapa" → permiso de ubicación, rol, actividad en las últimas 12 h.
  4. "¿Cuánto dura la jornada?" → hasta terminarla, cerrar sesión o 12 h.
- **Pendiente de validar en UI:** ❓ el comportamiento del servicio nativo (2 min, 12 h, notificación fija); ❓ aspecto del botón en la app; ❓ el aviso `Tu ubicación` en navegadores sin API de permisos.

---

## ACC-027 · Chip de plan de suscripción / licencia
- **Ruta UI / name:** chip en la cabecera junto a `Rol:` (en `xs`, al pie del menú) y tarjeta `Licencia` de Ajustes (AJS-002).
- **Archivos:** FE: `layouts/ChipPlanSuscripcion.vue`, `layouts/MainLayout.vue`, `pages/dashboard/ajustes/IndexPage.vue` · BE: `customers/customers.controller.ts`, `customers/customers.service.ts`, `companies/master-suscripcion.service.ts`.
- **Para qué sirve:** avisar cuando el cupo de clientes del plan contratado se agota o se superó. El plan y el límite los fija el sistema "master" de ISPMAX; la instalación solo los consulta.
- **Acceso:** ninguno (todo usuario lo ve). El chip solo se dibuja cuando `vinculado` y quedan **10 o menos** cupos (`UMBRAL_AVISO = 10`) o ya se superó; los planes ilimitados (`limite = null`) no avisan nunca (`ChipPlanSuscripcion.vue:40-71`).
- **Texto del chip (`:73-92`) ✅:** `<PLAN> · <usados>/<límite> · quedan N` (ámbar, icono `warning`) · `… · sin cupos` (rojo, `block`) · `… · N de más` (rojo, `error`). El nombre del plan se omite si no lo informa el master. Tooltip: `<plan o «Plan contratado»>: <usados> de <límite> clientes usados · quedan N disponibles | · sin cupos disponibles | · N por encima del límite` y, si no quedan, `Contacte a ventas para ampliar su plan.` (`:11-21`).
- **Cuándo se calcula:** una sola vez al montar el layout (`onMounted → GET /customers/limite-suscripcion`); no se refresca solo (`:94`).
- **Backend ✅:**
  - `GET /customers/limite-suscripcion` → `{vinculado, limite, usados, disponibles, plan, activo}`; `usados` = servicios no retirados (`deleted=false`) de clientes no eliminados de la empresa (`customers.service.ts:89-109`). `GET /customers/licencia-suscripcion` y `GET /customers/facturas-suscripcion` alimentan el diálogo de Licencia (máx. 50 facturas por página, `customers.controller.ts:108-130`).
  - La suscripción se lee de `companies.suscription_id` y se consulta al master con un token de servicio (variables de entorno `HOST_API_MASTER`, `MASTER_SERVICE_TOKEN`; opcional `INSTANCIA_DIRECCION`). Resultado en Redis con TTL de **5 min** (cliente `ioredis` propio, por eso este TTL sí se respeta) y una copia sin vencimiento que se usa si el master no responde. Si falta `suscription_id`, faltan las variables, el token está inactivo (`activo=false`) o `ES_INSTANCIA_GESTION=true`, no hay control (`master-suscripcion.service.ts:13-31,66-110,140-170`).
  - **Bloqueo:** crear cliente, agregar servicio o reactivar un servicio retirado con `usados ≥ límite` ⇒ 400 «Tu suscripción permite un máximo de N clientes y actualmente tienes M. Contacta a ventas para ampliar tu plan.» (`customers.service.ts:158-176`, usado en `:261`, `:548`, `:3014-3021`).
- **Efectos secundarios externos:** llamada HTTP al master (`/tokens/health/<id>` con el conteo de clientes: **se informa el uso al master**).
- **Relaciones:** AJS-002 (diálogo de Licencia), CLI (alta de cliente), ACC-023.
- **Casos límite y advertencias:**
  - Al cambiar el vínculo desde el master (`POST /companies/:id` con `suscription_id`) se invalida la caché de suscripción (`companies.controller.ts:104-108`).
  - El conteo incluye servicios suspendidos; excluye los retirados.
  - El chip no desaparece al liberar cupo hasta recargar la página.
- **Preguntas probables de usuarios:**
  1. "¿Qué es esa etiqueta ámbar/roja con mi plan?" → cupos restantes del plan.
  2. "No me deja crear clientes" → alcanzó el límite (mensaje de arriba).
  3. "¿Los retirados cuentan?" → no.
  4. "¿Dónde veo mi plan completo?" → Ajustes → Licencia.
- **Pendiente de validar en UI:** ❓ aspecto del chip en modo oscuro; ❓ comportamiento con el master inaccesible.

---

## ACC-028 · Chip "SRI" (estado del servicio) y reenvío automático de comprobantes
- **Ruta UI / name:** chip `SRI` en la cabecera (`layouts/EstadoSRI.vue`, `MainLayout.vue:52-57`).
- **Archivos:** FE: `layouts/EstadoSRI.vue`, `stores/estados-mantenedor.ts`, `layouts/Notifications.vue`, `composables/useFacturacionElectronica.js` · BE: `comprobantes-electronicos/facturas/facturas.controller.ts`, `comprobantes-electronicos/facturas/facturas.service.ts`, `comprobantes-electronicos/facturas/invoice-queue.processor.ts`.
- **Para qué sirve:** mostrar si el servicio del SRI (autorizador de comprobantes electrónicos de Ecuador) responde y, cuando vuelve, reenviar las facturas que quedaron sin autorizar.
- **Acceso:** se dibuja si `claim.company.requiere_facturacion` **y** `facturacionElectronicaActiva` (`MainLayout.vue:52-55`). No consulta el proveedor (SRI/Factus) ❓.
- **Qué ve el usuario ✅:** chip `SRI` con icono `cloud` (verde, tooltip `Servicio del SRI operativo`) o `cloud_off` (rojo, tooltip `Servicio del SRI no disponible`) (`EstadoSRI.vue:7-15,39-63`). Estado inicial `online` (`estados-mantenedor.ts:38`).
- **De dónde sale el estado ✅:** (1) al montar y **cada 5 min** el panel pide al microservicio de facturación `GET <VITE_HOST_API_FACTURACION>/logs?page=1&limit=1&entityType=ESTADO_SRI` y usa `metadata.heartbeat` del último registro (`EstadoSRI.vue:17-35`); (2) el microservicio puede empujar un evento `ESTADO_SRI` por socket (`Notifications.vue:187-189`). `setStatusSRI`: sin `heartbeat` no cambia nada; `heartbeat.status === 0` ⇒ `offline`; cualquier otro valor ⇒ `online` **y** `POST /CE/facturas/reenviar-comprobantes-no-autorizados` (`estados-mantenedor.ts:98-112`).
- **Reenvío ✅:** ese endpoint encola un trabajo `reenviarInvoice` con **60 s de retraso** (`facturas.service.ts:912-931`); el proceso solo actúa con proveedor SRI (`usaSri()`), busca las facturas a reenviar sin IVA actual (`facturasActuales = filter(!factura.iva)`) y reintenta la autorización de cada una (`invoice-queue.processor.ts:420-436`). Aparte, el backend programa un reenvío repetible **cada 2 h** (`every: 7_200_000`), solo en la instancia primaria y solo con proveedor SRI (`facturas.service.ts:464-491`; AUT-006).
- **Efectos secundarios externos:** microservicio de facturación (`/logs`), SRI.
- **Relaciones:** VEN (facturas), AUT-006, ACC-025 (evento), ACC-023.
- **Casos límite y advertencias:**
  - El reenvío se pide **en cada comprobación en la que el SRI figura arriba** (cada 5 min por cada pestaña abierta, y en cada evento), no solo al recuperarse; cada pedido encola un trabajo que se retrasa 60 s.
  - El temporizador de 5 min se crea en el cuerpo del componente y no se limpia al desmontarlo (`EstadoSRI.vue:29-31`).
  - El chip refleja el estado informado por el microservicio, no el de ISPMAX.
  - El componente recibe `status="offline"` desde el layout pero no lo usa (`MainLayout.vue:56`).
- **Preguntas probables de usuarios:**
  1. "¿Qué significa SRI en rojo?" → el SRI no responde; las facturas se enviarán cuando vuelva.
  2. "¿Tengo que reenviar las facturas a mano?" → no, el sistema reintenta (al recuperarse y cada 2 h); la pantalla de Ventas permite reenvío manual (VEN).
  3. "No me aparece el chip" → la empresa no requiere facturación o la instalación no es electrónica.
- **Pendiente de validar en UI:** ❓ valores reales de `heartbeat.status`; ❓ chip en instalaciones de Colombia/otros países (el texto dice "SRI").

---

## ACC-029 · Widget "Enviando recordatorios" (progreso de envío)
- **Ruta UI / name:** panel flotante abajo a la izquierda en **todas** las pantallas autenticadas (`layouts/RecordatorioProgress.vue`, montado en `MainLayout.vue:219`).
- **Archivos:** FE: `layouts/RecordatorioProgress.vue` · BE: `pagos/pagos.controller.ts`, `pagos/pagos.service.ts`, `pagos/notificar-recortatorio-pago-queue.processor.ts`, `config/queue.config.ts`, `mensajes-masivos/*` (detalle).
- **Para qué sirve:** ver y poder detener el envío de recordatorios de pago en curso (AUT-015, MSG-003).
- **Acceso:** ninguno en el frontend; lo ven todos los usuarios y cualquiera puede cancelar (el estado es **global** de la instalación, no del usuario: una sola clave en Redis, `RECORDATORIO_PROGRESO_KEY`).
- **Qué ve el usuario ✅:**

  | Elemento (texto exacto) | Qué hace |
  |---|---|
  | `Enviando recordatorios` + `remove` (tooltip `Minimizar`) | título; minimizar convierte el panel en un botón redondo con spinner y la cifra de enviados (tooltip `Recordatorios: <enviados>/<total> — abrir`); clic lo reabre. Un envío nuevo (otro `inicio`) vuelve a mostrarlo completo (`:28-42,126-204`) |
  | `<enviados>/<total>` y `<n>%` + barra | avance (`:143-158`) |
  | `Ver mensajes` (icono `visibility`) | abre el diálogo `Recordatorios del día` (no se llama «Ver detalle») |
  | `Cancelar envío` (icono `stop_circle`; durante la cancelación `Cancelando…` y deshabilitado) | pide confirmación y envía `POST /pagos/recordatorio-cancelar` (`:44-60,173-183`) |

  - Diálogo de confirmación: título `Cancelar envío`, «¿Seguro que deseas detener el envío de recordatorios? Los mensajes ya enviados no se revierten.», botones `No` / `Sí, cancelar` (persistente) (`:44-52`).
  - Diálogo `Recordatorios del día`: insignias `<n> procesados` y, si hay, `<n> por enviar`; tabla `Cliente · Canal · Destino · Estado · Fecha · Mensaje` (Canal con insignia `Oficial`/`No oficial` en WhatsApp; Estado `enviado`/otro en rojo; fecha `DD/MM/YY HH:mm`; mensaje truncado a 180 caracteres). Las filas pendientes (de la lista planificada) salen atenuadas con estado `por enviar`. Vacío: `Aún no hay mensajes registrados.` Se refresca cada **5 s** mientras está abierto; pide hasta 2000 mensajes de **hoy** con `origen = recordatorio_pago` (`:63-107,206-282`).
- **Cómo se alimenta ✅:** el panel consulta `GET /pagos/recordatorio-progreso` cada **6 s** (`:115-118`); responde `{activo,total,enviados,inicio}` leído de Redis (`pagos.service.ts:82-85`). `GET /pagos/recordatorio-planificados` devuelve a quién se piensa enviar (`:92-95`).
- **Reglas de negocio (backend) ✅ (`notificar-recortatorio-pago-queue.processor.ts`):**
  - El progreso se enciende **solo** en envíos automáticos o lanzados con "Ejecutar ahora" (no en el envío manual a un cliente, `esManual`), y solo si hay al menos un cliente a quien le toque hoy; con 0 clientes lo apaga (`:289`, `:536-575`). Al terminar lo apaga y borra la bandera de cancelar (`:1170-1175`); un error a mitad de camino también lo apaga (`:1180-1186`).
  - Cada envío real incrementa `enviados`; si el cliente pagó mientras tanto no se le avisa, pero cuenta como procesado (`:590-600`).
  - **Espaciado entre mensajes:** tras cada envío espera **30 s** si el canal activo es WhatsApp oficial y **2–3 min** (aleatorio) si es no oficial; la espera se corta en tramos de 2 s para atender la cancelación (`:1137-1161`).
  - **Cancelar** pone la bandera `RECORDATORIO_CANCELAR_KEY`; el proceso la revisa antes de cada envío y durante la espera, y se detiene (los pendientes no salen, los enviados no se revierten) (`pagos.service.ts:97-100`, `notificar-recortatorio-pago-queue.processor.ts:142-145,590-593`).
  - `Ejecutar ahora` falla con 400 `Ya hay un envío de recordatorios en curso. Espera a que termine.` si el progreso está activo (`pagos.service.ts:1828-1852`).
- **Efectos secundarios externos:** WhatsApp (Baileys/Cloud API) y correo (los envíos); Redis.
- **Relaciones:** AUT-015, MSG-003, MSG-018, ACC-025, ACC-040.
- **Casos límite y advertencias:**
  - El TTL de 30 min que se pasa a la clave de progreso (`PROGRESO_TTL_MS`) lo **ignora** el almacén de Redis (ACC-040): si el backend muere en mitad del envío la clave queda con `activo:true` hasta el siguiente envío o hasta el próximo arranque, que vacía la caché (`app.service.ts:83-118`).
  - Cualquier usuario autenticado puede cancelar por API; el botón no lleva permiso.
  - El widget consulta cada 6 s aunque no haya envío: ruido de red en todas las sesiones.
- **Preguntas probables de usuarios:**
  1. "Me salió un cuadro de 'Enviando recordatorios', ¿qué hago?" → es informativo; `Ver mensajes` muestra el avance.
  2. "Avanza muy lento" → los mensajes se espacian a propósito (30 s oficial, 2–3 min no oficial).
  3. "¿Cómo detengo los envíos?" → `Cancelar envío`; lo ya enviado no se revierte.
  4. "Cerré el cuadro y no vuelve" → minimizó; el botón redondo lo reabre.
  5. "¿Por qué dice 'por enviar' alguien que ya pagó?" → la lista se arma al empezar; al llegar su turno se omite y cuenta como procesado.
- **Pendiente de validar en UI:** ❓ aspecto del panel con varios envíos seguidos; ❓ ubicación en móvil.

---

## ACC-030 · Empresa: datos, logo, firma electrónica
- **Ruta UI / name:** Menú lateral → **Ajustes** → tarjeta **Empresa** (`/ajustes/empresa` · `ajuste.empresa`), pestaña **Empresa**; la misma ficha, sin pestañas, en `/empresa/edit/:empresa_id` · `index.empresa` (la abre el botón `Actualizar firma` de ACC-023; el `:empresa_id` de la URL **se ignora**: el formulario siempre carga la primera empresa de `GET /companies`) (`FE:pages/dashboard/ajustes/empresa/IndexPage.vue:43-93`, `pages/dashboard/empresas/EditEmpresa.vue:14-35`, `router/routes.ts:45-50`).
- **Archivos:** FE: `pages/dashboard/ajustes/empresa/IndexPage.vue`, `pages/dashboard/empresas/EditEmpresa.vue`, `pages/dashboard/empresas/components/FormEmpresa.vue`, `pages/dashboard/empresas/composables/useEmpresa.js`, `composables/useCompany.js`, `composables/usePais.js`, `composables/useFirmaElectronica.js` · BE: `companies/companies.controller.ts`, `companies/companies.service.ts`, `companies/entities/company.entity.ts`, `companies/dto/create-company.dto.ts`, `companies/dto/update-company.dto.ts`, `companies/helpers/fileFilter.helper.ts`, `companies/helpers/fileNamer.helper.ts`.
- **Para qué sirve:** datos fiscales del emisor (nombre, identificación fiscal, dirección, contacto), logo y firma electrónica para facturar. En este producto hay **una sola empresa por instalación**: no existe pantalla para crearla ni listarla (el router `Ver Empresas` que menciona `useSetting.js:131` no existe).
- **Acceso:** tarjeta de Ajustes con `ajuste.empresa` **y** alguna de `index.empresa`/`index.sucursal`; la pestaña **Empresa** exige `index.empresa`; el botón `Guardar Cambios` exige `editar.empresa`. Sin ninguna de las dos pestañas, vuelve a `dashboard` (`IndexPage.vue:10-39`). Catálogo: grupo "Configurar empresa" → "Empresa": `Ver` (`index.empresa`), `Editar Empresa` (`editar.empresa`) (`pages/dashboard/usuarios/permisos/gestion-variables-permisos.json:233-250`).
- **Campos del formulario ✅ (`FormEmpresa.vue`):**

  | Etiqueta | Tipo | Obligatorio | Validación / notas |
  |---|---|---|---|
  | `RUC:` (el rótulo cambia según el país: `RUC`, `NIT`, `RFC`, `RIF`; `ETIQUETA_ID_FISCAL`) | texto, solo dígitos, máx. 13 | sí | en Ecuador: debe tener 13 dígitos (`Ingresa un numero RUC valido`) y terminar en `001` (`El numero R.U.C debe terminar en 001`); en otros países solo que no esté vacío (`useEmpresa.js:149-184`); BE: 5–20 caracteres y único (`create-company.dto.ts`, `company.entity.ts:91-92`) |
  | `Nombre Comercial:` | texto (se envía en mayúsculas) | sí | BE: mínimo 5 caracteres |
  | `Dirección:` | texto | sí | BE: mínimo 5 caracteres |
  | `Email:` | texto | sí | si tiene más de 5 caracteres debe cumplir un patrón de correo (`Ingresa un email valido`); BE: mínimo 5 |
  | `Celular:` | selector de teléfono con país (`Buscar pais...`), país por defecto el de la instancia | sí (`Debes completar este campo`) | formato internacional del componente |
  | `Logo de la empresa` | archivo imagen (`.jpg, image/*`) | no | pista en pantalla: «Tamaño máximo 3MB, extensión .jpg o .png y ser menor o igual a 600px por 600px.» — **no se valida**: el panel solo comprueba que la imagen cargue (`useEmpresa.js:115-131`) y el backend solo filtra por tipo MIME `jpg/jpeg/png` (`fileFilter.helper.ts:3-14`); etiqueta `Cargar Logo` o el nombre del archivo actual; vista previa (máx. 125×75) |
  | `Requiere Facturación:` | interruptor | no | muestra el resto de campos fiscales |
  | `Razón Social` | texto (mayúsculas) | con facturación | se rellena sola con el nombre del titular del certificado |
  | `Cargar Certificado:` (solo `PAIS=EC`) | archivo `.p12` | con facturación y alta nueva (ver advertencias) | rechazo de tipo: `El tipo de archivo es invalido` |
  | `Clave Certificado:` (solo EC) | contraseña (ojo) | con facturación (EC) | si no abre el `.p12`: `La contraseña del certificado esta incorrecta` |
  | `Obligado Contabilidad:` (solo EC) | interruptor | no | se envía tal cual |
  | `Fecha Exp. Firma Electrónica:` (solo EC) | texto de solo lectura (`DD/MM/YYYY HH:mma`) | — | se toma del certificado al cargarlo |

  El campo `iva` (código del IVA de la empresa) viaja en el formulario pero **no tiene control en pantalla**; en Ecuador con facturación se exige no vacío (`useEmpresa.js:155-159`). Valores por defecto de una empresa: `iva = 4`, `requiere_facturacion = true`, `obligado_contabilidad = false` (`company.entity.ts:103-110`).
- **Botón:** `Guardar Cambios` (icono `save`). Pide confirmación con el diálogo `¿Deseas realizar la edición?` (`Aceptar` / `Cancelar`) y envía `POST /companies/:id` (multipart: texto + `logo` + `archivo_certificado`) (`useEmpresa.js:202-259`). Éxito: `Información editada`; si cambió el logo se actualiza el de la barra lateral. Los errores del servidor **solo van a la consola** (no hay aviso en pantalla).
- **Reglas de negocio (backend) ✅:**
  1. `GET /companies/:estado?` (`@Auth()`) devuelve todas las empresas (columnas completas, incluida la clave del certificado). El filtro `SUPER-ADMINISTRADOR` lee la cabecera `rol` pero el panel envía `rol-name`, así que siempre filtra por la cabecera `company-id` (`companies.controller.ts:22-30`, `companies.service.ts:28-37`, `FE:boot/axios.ts:25-30`).
  2. `POST /companies/:id?` usa `ServiceTokenGuard` (token de servicio **o cualquier JWT válido**): sube el logo a `public/images` y el certificado a `static/SRI/FIRMAS`, con nombre `uuid.ext` / `uuid.p12`; solo acepta MIME `jpg`, `jpeg`, `png` y `x-pkcs12` (otros se descartan en silencio) (`companies.controller.ts:69-111`, `fileFilter.helper.ts`, `fileNamer.helper.ts`). Al subir un certificado nuevo borra el anterior y lo copia al microservicio de facturación (`/files/upload-signature`; el error se ignora) (`companies.controller.ts:92-100`, `companies.service.ts:215-229`). Responde `Se actualizaron los datos exitosamente`.
  3. `logo_old` y `archivo_certificado_old` se guardan tal como llegan si no se sube archivo nuevo (`companies.service.ts:233-241`); el panel envía el texto `null` cuando están vacíos ⇒ queda el **texto "null"** como nombre de logo o de certificado ❓.
  4. `GET /companies/estado-certificado/:id` (ACC-023), `GET /companies/get-iva/:id`, `GET /companies/requiere-facturacion/:id` (`@Auth()`); `GET /companies/get-image/company` es **público** y devuelve el nombre del logo para la pantalla de login (`companies.controller.ts:62-67`).
  5. `PATCH /companies/:id/:estado` (activar/inactivar) y `DELETE /companies/:id` existen sin pantalla (`:113-126`); `remove` borra la primera empresa (ignora el `:id`) y sus archivos (`companies.service.ts:252-272`).
  6. `suscription_id` (vínculo con el plan, ACC-027) viaja en este mismo `POST` desde el sistema master (`companies.controller.ts:104-108`).
- **Efectos secundarios externos:** microservicio de facturación (certificado); sistema master (plan); sistema de archivos del servidor.
- **Mensajes (texto exacto):** los de la tabla, `Debes completar este campo`, `Información editada`, `¿Deseas realizar la edición?`, `El tipo de archivo es invalido`; BE: `Se actualizaron los datos exitosamente`, `Empresa no encontrada`, `La clave del certificado es incorrecta`, `No se encontró ninguna empresa`.
- **Relaciones:** ACC-023 (aviso de firma), ACC-027 (plan), ACC-031 (sucursales), ACC-035 (país y etiquetas), ACC-039 (logo público), FIR/VEN (emisión).
- **Casos límite y advertencias ✅:**
  - **La validación no bloquea el guardado:** `onSubmit` hace `if (await !validarCampos(true)) return`; como `!` se aplica a la promesa, la condición siempre es falsa y la ficha se envía aunque haya errores (los mensajes rojos se ven, pero se puede confirmar igual) (`useEmpresa.js:203`). Consecuencia: `Debes adjuntar el certificado` (solo en alta) nunca se evalúa porque siempre se llama con `edit = true` (`:186-195`).
  - La clave del certificado se guarda y se devuelve en claro (`varchar(300)`) y viaja a cualquier usuario autenticado en `GET /companies` (se usa para precargar el campo).
  - Cambiar el logo con un archivo que no sea JPG/PNG no da error: el servidor lo descarta y el nombre anterior se conserva.
  - Con la facturación electrónica activa y la firma `.p12` cargada, la caducidad se guarda en ISO solo cuando se valida un certificado nuevo en esa edición (`useEmpresa.js:231-234`).
- **Preguntas probables de usuarios:**
  1. "Me avisa que la firma venció, ¿dónde la subo?" → Ajustes → Empresa → `Cargar Certificado:` + `Clave Certificado:` → `Guardar Cambios`.
  2. "Dice que la contraseña del certificado está incorrecta" → la clave no abre el `.p12`.
  3. "Cambié el logo y sigue el anterior" → formato no admitido o recargar la página.
  4. "No me deja guardar el RUC" → debe tener 13 dígitos y terminar en 001 (Ecuador).
  5. "¿Puedo tener dos empresas?" → no; una por instalación (varias sucursales sí, ACC-031).
- **Pendiente de validar en UI:** ❓ el texto `null` en logo/certificado tras guardar sin archivos; ❓ si el servidor rechaza una RUC de más de 13 caracteres (columna `varchar(13)` frente a un máximo de 20 en el DTO); ❓ la ficha en instalaciones de Colombia/Perú.

---

## ACC-031 · Sucursales: listado, crear, editar, activar/inactivar, eliminar
- **Ruta UI / name:** Menú lateral → **Ajustes** → **Empresa** → pestaña **Sucursales** (`/ajustes/empresa`, vista interna `index` / `crear` / `editar` sin cambiar la URL) (`FE:pages/dashboard/ajustes/empresa/sucursales/IndexPage.vue:1-34`).
- **Archivos:** FE: `pages/dashboard/sucursales/IndexPage.vue`, `pages/dashboard/sucursales/AddSucursal.vue`, `pages/dashboard/sucursales/EditSucursal.vue`, `pages/dashboard/sucursales/components/FormSucursal.vue`, `pages/dashboard/sucursales/composables/useSucursal.js`, `pages/dashboard/ajustes/empresa/sucursales/IndexPage.vue`, `composables/useHelpers.js`, `composables/usePais.js`, `composables/useFacturacionElectronica.js` · BE: `sucursal/sucursal.controller.ts`, `sucursal/sucursal.service.ts`, `sucursal/entities/sucursal.entity.ts`, `sucursal/dto/create-sucursal.dto.ts`, `sucursal/dto/update-sucursal.dto.ts`.
- **Para qué sirve:** definir los puntos de emisión de la empresa: cada sucursal lleva establecimiento, punto de emisión y los contadores de facturas, notas de crédito y recibos; determina la numeración legal del comprobante (ver el comentario de `BE:sucursal/sucursal-facturacion.service.ts:90-93`).
- **Acceso:** pestaña con `index.sucursal`; `Agregar Sucursal` con `crear.sucursal`; icono editar con `editar.sucursal`; icono activar/inactivar con `activar.inactivar.sucursal`; icono eliminar con `eliminar.sucursal`. La tarjeta Empresa de Ajustes exige además `ajuste.empresa` (ACC-030). Catálogo: "Configurar empresa" → "Sucursales": `Ver`, `Crear`, `Editar`, `Activar/Inactivar`, `Eliminar` (`gestion-variables-permisos.json:251-277`).
- **Listado ✅ (`IndexPage.vue:6-47`, `:105-292`):** columnas `Sucursal`, `Dirección` (truncada, tooltip con el texto completo), `N° de establecimiento`, `Punto de emisión`, `N° de factura` (= `secuencia_factura_produccion`), `Estado` (insignia `Activo`/`Inactivo`), `Acciones`. Selector `OCULTAR COLUMNAS`, buscador `Buscar...`, pantalla completa, 10 filas por página (valor inicial). Vacío: `No se encontró ningun Resultado`. Encabezado `Listado de Sucursales` solo si el primer rol no es `SUPER-ADMINISTRADOR`.
- **Acciones por fila ✅:** activa ⇒ editar (`edit`) y desactivar (`close`); inactiva ⇒ activar (`done`) y eliminar (`delete`). No hay confirmación para activar/desactivar: toast `Actualizado Exitosamente` (mensaje del backend). Eliminar pide `Estas seguro de eliminar esta sucursal?` (título `Confirmar`, botones `Eliminar` / `Cancelar`) y confirma con `Registro eliminado exitosamente`.
- **Formulario (`FormSucursal.vue`) ✅** — títulos `Nueva Sucursal` / `Editar Sucursal`; botones `Regresar` (solo si el ancho > 600 px) y `Guardar Cambios`:

  | Etiqueta | Tipo | Cuándo se ve | Valor inicial | Notas |
  |---|---|---|---|---|
  | `Nombre del establecimiento:` | texto (mayúsculas) | siempre | vacío | BE: obligatorio, mín. 3 caracteres; columna `varchar(100)` |
  | `Dirección:` | texto | siempre | vacío | BE: obligatorio; `varchar(255)` |
  | `Numero de Establecimiento:` | número entero | `PAIS=EC` | 0 | `establecimiento` |
  | `N° punto de emisión:` | número entero | `PAIS=EC` | 0 | `punto_emision` |
  | `N° secuencial Factura:` | número | `PAIS=EC` y facturación electrónica activa | 0 | `secuencia_factura_produccion` |
  | `N° secuencial Factura Pruebas:` | número | ídem | 0 | `secuencia_factura_pruebas` |
  | `N° secuencial Nota de Crédito:` | número | ídem | 0 | `secuencia_nota_credito_produccion` |
  | `Secuencial nota de crédito Pruebas:` | número | ídem | 0 | `secuencia_nota_credito_pruebas` |
  | `Ambiente:` | selector `PRODUCCION` / `PRUEBA` | `PAIS=EC` y facturación electrónica activa | `PRUEBA` | `ambiente` |
  | `Rango de numeración — Factura` / `Rango de numeración — Nota Crédito` | selectores (rangos de Factus: `<documento> · <prefijo> <desde>–<hasta>`), borrables | proveedor Factus (Colombia) | vacío ⇒ «se usa el primer rango activo de tu cuenta» | `factus_rango_factura`, `factus_rango_nota_credito` (`GET /facturacion/factus/numbering-ranges`) |
  | `N° secuencial Recibo:` | número | **todos** los países | 0 | `secuencia_abono`: el contador de recibos (comprobante de abono no electrónico) |

  Al enviar, el panel convierte todos los contadores a número y, si alguno no es un número ≥ 0, avisa en amarillo `Los valores numéricos deben ser mayores o iguales a 0` y no guarda; las secuencias de retención se envían con 0 aunque no tienen campo (`useSucursal.js:61-107`). Éxito: `Sucursal agregado exitosamente` / `Sucursal editado exitosamente` y vuelve al listado.
- **Reglas de negocio (backend) ✅ (`sucursal.service.ts`):**
  1. `POST /sucursal`: crea con `company_id` del token; todos los contadores son obligatorios (`@IsNumber`) aunque la interfaz TypeScript los marque opcionales (`create-sucursal.dto.ts:20-48`). Errores de validación llegan en inglés (p. ej. `nombre must be longer than or equal to 3 characters`) y el panel los muestra en amarillo.
  2. `GET /sucursal/:estado?`: sin `estado`, las de la empresa de la cabecera `company-id`; con `true`, solo las activas (**sin filtrar por empresa**); si el usuario tiene `sucursales` asignadas, solo esas (`:46-63`).
  3. `PATCH /sucursal/:id` actualiza; `PATCH /sucursal/:id/:estado` activa/inactiva (no comprueba que haya otras activas).
  4. `DELETE /sucursal/:id`: rechaza si tiene pagos, facturas, compras o productos: `No se puede eliminar la sucursal porque tiene N pago(s), N factura(s), N compra(s), N producto(s) asociado(s). Desactívela en lugar de eliminarla.` (400) (`:119-148`). El resto de relaciones tiene `ON DELETE CASCADE`.
  5. Toda alta, edición, cambio de estado o baja **invalida la caché `permisos:*`** para que las listas de sucursales de los usuarios se refresquen (`:33,96,114,145`; ACC-040).
  6. Numeración de recibos: `siguienteNumeroRecibo` toma `secuencia_abono`, la incrementa y devuelve el número con 8 dígitos (`registro-pagos/registrar-abono.service.ts:870-874`).
- **Efectos secundarios externos:** ninguno directo (Factus solo para listar rangos).
- **Relaciones:** ACC-030, ACC-032 (qué sucursal se usa en cobros automáticos), COB (caja: la sucursal viene del usuario), VEN (facturas), ALM (compras y productos por sucursal), ACC-007 (sucursales asignadas al usuario).
- **Casos límite y advertencias ✅:**
  - En móvil (`xs`) el botón `Agregar Sucursal` se oculta y lo sustituye un botón flotante `+` que navega a `crear.sucursal`, una ruta que **no existe** en el router (`IndexPage.vue:157,297-309`, `routes.ts`): desde el celular no se puede crear una sucursal ❓.
  - El botón eliminar se condiciona con `!props.row.estado`, un campo que no existe en la fila (siempre verdadero): se muestra en toda sucursal inactiva y el backend decide (`:273-275`).
  - Desactivar una sucursal no la quita de routers ni de usuarios que ya la tienen asignada; sí deja de ser elegible en `resolver` (ACC-032).
  - El nombre se guarda en mayúsculas y no hay restricción de unicidad.
  - Una sucursal nueva nace con `Ambiente: PRUEBA`: emite en pruebas hasta que se cambie a `PRODUCCION`.
- **Preguntas probables de usuarios:**
  1. "¿Para qué sirve la sucursal?" → numeración de comprobantes y filtro de ventas/compras.
  2. "No me deja eliminar la sucursal" → tiene movimientos; desactívela.
  3. "Cambié de establecimiento y las facturas salen con el número anterior" → los contadores son de cada sucursal; revise `N° secuencial Factura:`.
  4. "No encuentro el botón para agregar sucursal en el celular" → solo en escritorio.
  5. "¿Dónde pongo el número de recibo?" → `N° secuencial Recibo:`.
- **Pendiente de validar en UI:** ❓ cómo reacciona el router al botón `+` móvil; ❓ efecto de desactivar la única sucursal activa en caja; ❓ etiquetas del formulario en instalaciones de Colombia.

---

## ACC-032 · Resolución de la sucursal de cobro (cobros automáticos)
- **Ruta UI / name:** sin pantalla propia; se configura en el perfil del cliente (bloque `Pagos automáticos`, campo `Sucursal:`) y en el formulario del router (`Sucursal para pagos automáticos:`).
- **Archivos:** FE: `pages/dashboard/clientes/components/ConfigSucursalCobro.vue`, `pages/dashboard/clientes/components/FactAndNot.vue`, `pages/dashboard/Gestion-Red/routers/components/FormRouter.vue` · BE: `sucursal/sucursal-facturacion.service.ts`, `sucursal/sucursal.controller.ts`, `registro-pagos/registrar-abono.service.ts`, `customers/customers.controller.ts`, `customers/customers.service.ts`.
- **Para qué sirve:** decidir desde qué sucursal se emite un comprobante cuando **no hay operador** (bot de WhatsApp, pasarelas de pago, registro de pagos por HTTP). En caja la sucursal la aporta el usuario que cobra, y eso no cambia.
- **Acceso:** los endpoints exigen `ServiceTokenGuard` (token de servicio o JWT) (`sucursal.controller.ts:26-59`). El bloque del perfil solo se dibuja si el canal de WhatsApp está activo (`GET /cloud-api/config` → `whatsapp_activo === true`) y hay un servicio seleccionado (`ConfigSucursalCobro.vue:26-33,95-96`). Los permisos de edición son los del perfil del cliente y del router (CLI/RED).
- **Cadena de decisión ✅ (`sucursal-facturacion.service.ts:70-137,198-273`; gana la primera que resuelve):**

  | Paso | Origen (`origen`) | Regla |
  |---|---|---|
  | 0 | `empresa_unica` | la empresa tiene **una sola** sucursal activa ⇒ esa, sin validar nada más |
  | 1 | `servicio` | la sucursal definida a mano en el servicio del cliente (si está activa y es de la misma empresa que el router) |
  | 2 | `historial` | los **3** últimos pagos del servicio (`PAGOS_QUE_CONFIRMAN`) se emitieron todos en la misma sucursal |
  | 3 | `router` | la sucursal por defecto del router |
  | 4 | `router_unica` | el router atiende una sola sucursal usable |
  | 5 | `no_resuelta` | nadie la define ⇒ **no se adivina** |

  Una sucursal solo sirve si existe, está activa y pertenece a la misma empresa que el router; si el valor del servicio ya no sirve (borrada, inactiva, de otra empresa) se registra una advertencia y se baja al siguiente paso (`:182-194,238-245`).
- **Endpoints ✅:** `GET /sucursal/resolver-cobro/:servicio_id` (409 `SUCURSAL_NO_RESUELTA` con el `detalle` como mensaje si no resuelve); `GET /sucursal/estado-cobro/:servicio_id` (devuelve la resolución, incluido lo que se heredaría sin el valor propio: lo usa el perfil); `GET /sucursal/historial-cobro/:servicio_id` (distribución histórica, sin pantalla) (`sucursal.controller.ts:26-59`, `service.ts:297-331`). Guardar el valor propio: `PATCH /customers/servicio/:id/sucursal-facturacion` (`customers.controller.ts:298-301`, `customers.service.ts:2288-2357`).
- **Qué ve el usuario ✅:**
  - Perfil del cliente → `Pagos automáticos` → `Sucursal:` (selector borrable de sucursales activas; tooltip: «Sucursal desde la que se emite el comprobante cuando el cobro no pasa por caja: bot de WhatsApp, pasarelas de pago. En caja se sigue usando la sucursal del usuario que cobra. Dejalo vacío y el sistema la deduce solo: si los últimos 3 pagos fueron todos en la misma sucursal usa esa, y si el cliente es nuevo usa la del router. Cargá un valor solo si querés forzar una.»). Ayuda bajo el campo: `Forzada para este cliente. Vaciá el campo para que se resuelva sola (<nombre>).` o el `detalle` de la resolución (naranja si no resuelve). A la derecha: `Los pagos del bot se emitirán desde <sucursal>` o `Sin sucursal: el bot va a rechazar los pagos de este cliente.` (`ConfigSucursalCobro.vue:95-167`).
  - Formulario del router → `Sucursal para pagos automáticos:` (selector borrable, solo entre las sucursales que ese router atiende) con la pista `Aplica a los cobros del bot; no afecta a los cobros de caja.` (`FormRouter.vue:105-130,640-690`).
- **Reglas de negocio ✅:** `updateSucursalFacturacion` valida que la sucursal sea un UUID, exista, esté activa y sea de la misma empresa que el router del servicio; deja registro en Logs con acción `DEFINIR_SUCURSAL_COBRO` o `QUITAR_SUCURSAL_COBRO` (`customers.service.ts:2288-2357`). En el registro interno de abonos (`RegistrarAbonoService.resolverSucursal`): una sucursal pasada explícitamente gana; una factura que **ya tiene abonos** conserva la suya (para no contradecir un comprobante emitido); en otro caso se usa el resolver (`registrar-abono.service.ts:896-960`).
- **Mensajes (texto exacto):** BE: `La sucursal de facturación no es válida.`, `No se encontró la sucursal <id>.`, `La sucursal <nombre> está inactiva.`, `La sucursal <nombre> no pertenece a la misma empresa que el router del servicio.`, `No se encontró el servicio <id>`; FE: `No se pudo guardar la sucursal de pagos automáticos`.
- **Efectos secundarios externos:** ninguno directo; condiciona el comprobante electrónico (SRI/Factus) y la numeración del recibo.
- **Relaciones:** ACC-031, AUT-013/014 (pasarela y registro de pagos), RED (router), CLI (perfil), COB.
- **Casos límite y advertencias ✅:**
  - **Dos comportamientos distintos sin sucursal:** el bot externo que consulta `resolver-cobro` recibe 409 y rechaza el pago (por eso el texto del perfil dice "rechazar"); en cambio el abono interno por pasarela **se registra igual pero sin comprobante** y queda para emitir a mano (`registrar-abono.service.ts:511-527`).
  - Un cliente con menos de 3 pagos, o con pagos repartidos en varias sucursales, no hereda del historial: decide el router.
  - Con una sola sucursal activa en la empresa se ignoran el valor del servicio y el del router (paso 0).
- **Preguntas probables de usuarios:**
  1. "El bot rechaza el pago de un cliente" → no hay sucursal resoluble: defina `Sucursal:` en el perfil o en el router.
  2. "¿Por qué el pago por pasarela quedó sin factura?" → no se determinó la sucursal.
  3. "¿Qué pasa con las cajas?" → siguen usando la sucursal del cajero.
- **Pendiente de validar en UI:** ❓ que el bloque aparezca solo con WhatsApp activo; ❓ qué muestra el bot al recibir el 409.

---

## ACC-033 · Servidor de correo (SMTP): configuración, prueba, interruptor
- **Ruta UI / name:** Menú lateral → **Ajustes** → **Mensajeria** → tarjeta `Datos del servidor correo` (`/ajustes/mensajeria`); el mismo formulario en `/email/edit/:email_id` · `email.edit`, sin enlace en el menú (`FE:pages/dashboard/ajustes/mensajeria/IndexPage.vue:255-296`, `router/routes.ts:159-164`). La tabla `Emails Config` (`emails/IndexPage.vue`) y `emails/AddEmail.vue` **no están enrutadas** (no hay ruta `/emails`).
- **Archivos:** FE: `pages/dashboard/emails/components/FormEmail.vue`, `pages/dashboard/emails/composables/useEmail.ts`, `pages/dashboard/emails/EditEmail.vue`, `pages/dashboard/emails/IndexPage.vue`, `pages/dashboard/ajustes/mensajeria/IndexPage.vue` · BE: `email/email.controller.ts`, `email/email.service.ts`, `email/entities/email.entity.ts`, `email/dto/create-email.dto.ts`, `email/dto/update-email.dto.ts`.
- **Para qué sirve:** guardar el correo saliente de la empresa (comprobantes, avisos, recordatorios) y probarlo. Detalle de campos y mensajes: MSG-019 (`notes/inventory/ajs2.md`); aquí lo verificado desde el dominio de acceso.
- **Acceso:** tarjeta/formulario con `variables.config.servidor.correo`; la tabla (no enrutada) usaba `editar.correo`; la ruta `email.edit` no tiene clave en el catálogo ⇒ solo `SUPER-ADMINISTRADOR` entra (ACC-003). BE: `@Auth()` (cualquier usuario autenticado).
- **Campos ✅ (`FormEmail.vue:81-204`):** `Usar correo para notificaciones` (interruptor; guarda al instante con `PATCH /email/:id {activo}`: `Correo activado como canal.` / `Correo desactivado: no se enviará por este canal.`; si falla revierte y avisa) · `Host/servidor:` · `Puerto:` (solo dígitos) · `Usuario/Correo:` (es también el remitente) · `Contraseña:` (con ojo) · `Seguridad:` (`SSL`, `TLS`, `NONE`; tooltip `SSL → puerto 465 · TLS/STARTTLS → 587 · NONE → sin cifrado`). Botones `Probar Configuración` (abre el diálogo `Correo del cliente` con `Cancelar` / `Enviar`) y `Guardar` (`PATCH /email/:id`; aviso `Cambios guardado exitosamente`).
- **Reglas de negocio (backend) ✅:**
  1. Existe **una sola** configuración: `findOne(id)` ignora el `id` y devuelve la primera por `id` (`email.service.ts:295-307`); por eso el formulario funciona dentro de Mensajería aunque `email_id` sea `undefined`. No hay alta por código ⇒ la fila la crea el despliegue ❓.
  2. `POST /email/testing` envía "Prueba de correo exitosa - Sistema ISPMAX" con los valores del formulario (aunque no estén guardados); `secure = (seguridad==='SSL')`, `requireTLS = (seguridad==='TLS')`, tiempos de espera de 10 s, `tls.rejectUnauthorized=false`. Éxito: `Correo Enviado Exitosamente`. Error: el texto del error SMTP se **traduce al español con un servicio externo** (`api.mymemory.translated.net`) y, si falla la traducción, se muestra el original (`email.service.ts:19-162`).
  3. Los comprobantes electrónicos (`sendComprobantes`) **no respetan** el interruptor (documento legal); los demás envíos (`sendMessage`) lanzan 400 `El canal de correo está desactivado` si `estaActivo()` es falso, salvo el envío manual que elige el operador (`:173-274`). `estaActivo()` exige fila, `activo ≠ false` y host, usuario y contraseña no vacíos (`:309-320`).
  4. Errores de envío: `Error: getaddrinfo ENOTFOUND <host>` (DNS) o `Fallo al enviar el correo` (`:222-226,269-273`).
  5. Los correos de **recuperación de contraseña** no usan esta configuración sino un correo propio del sistema definido por variables de entorno (`sendDesdeSistema`, `:276-289`; ACC-041).
  6. `GET /email` y `GET /email/:id` devuelven la configuración **con la contraseña en claro** a cualquier usuario autenticado (`email.service.ts:291-307`).
- **Efectos secundarios externos:** servidor SMTP de la empresa; servicio de traducción externo.
- **Relaciones:** MSG-019, MSG-018, ACC-025 (aviso `Falla al enviar Email`), ACC-041, VEN (comprobantes).
- **Casos límite y advertencias:** el remitente es el `Usuario/Correo:` (si no es una dirección completa, muchos servidores lo rechazan); la contraseña se guarda sin cifrar (`varchar(75)`); no hay `reply-to`; con la configuración vacía el sistema considera el canal apagado y deja de registrar fallos de correo.
- **Preguntas probables de usuarios:**
  1. "¿Qué puerto uso?" → 465 con `SSL`, 587 con `TLS`.
  2. "La prueba falla" → mensaje del servidor SMTP (usuario/clave, puerto, seguridad).
  3. "¿Cómo dejo de enviar correos?" → apague `Usar correo para notificaciones`.
  4. "Los correos de recuperar contraseña no usan mi correo" → correcto, usan el del sistema.
- **Pendiente de validar en UI:** ❓ existencia de la fila `Email` en instancias nuevas; ❓ comportamiento con `NONE`.

---

## ACC-034 · "Obtener IP" (herramienta MikroTik) — excluida del manual
- **Ruta UI / name:** `/red/getIp` · `getIp` (`FE:router/routes.ts:165-170`). Sin ítem de menú ni tarjeta; solo se llega escribiendo la URL.
- **Archivos:** FE: `pages/dashboard/red/getIp.vue` · BE: `mikrotik/mikrotik.controller.ts`.
- **Qué es:** formulario técnico de una sola pantalla, título `Obtener IP`, con los campos `Ip a Conectarse:` (valor inicial una IP privada fija escrita en el código), `Login:` (inicial `admin`) y `Password:`, y el botón `Ejecutar`. Al enviar hace `POST /mikrotik` con esos tres datos y escribe la respuesta con `console.table` en la consola del navegador; no muestra nada en pantalla (`getIp.vue:8-21`, `:36-72`). Carga el logo de MikroTik desde un sitio externo (`:41`).
- **Acceso:** la ruta no tiene clave en el catálogo de permisos ⇒ solo `SUPER-ADMINISTRADOR` pasa el guard (ACC-003, `auth-guard.ts:135-141`).
- **Por qué no se documenta:** decisión registrada en `notes/exclusiones.md` (ACC-034 y RED-030): herramienta técnica interna que escribe en la consola del navegador; no es una función de operación.
- **Hallazgo ✅:** el backend actual **no tiene** ningún `@Post()` en la raíz de `/mikrotik` (el controlador solo define `sincronizar-pcq`, `obtener-mac`, `obtener-ip-por-mac`, `reparar-router`, `version`, `realizar-ping`, `liberar-amarre`, `aplicar-amarre-masivo`, `auditoria-amarre/*`, `update-queue` y `download-excel-router`; `mikrotik.controller.ts:20-109`), de modo que `Ejecutar` recibe un 404 y la herramienta no funciona en esta versión.
- **Pendiente de validar en UI:** ❓ que la pantalla abra para SUPER-ADMINISTRADOR y falle sin aviso visible.

---

## ACC-035 · Parámetros transversales: moneda, país, zona horaria, IVA, facturación electrónica
- **Ruta UI / name:** sin pantalla; son variables de entorno fijadas al desplegar (frontend en el momento de compilar, backend al arrancar). No se editan desde Ajustes.
- **Archivos:** FE: `composables/usePais.js`, `composables/useMoneda.js`, `composables/appTimezone.js`, `composables/useFacturacionElectronica.js`, `boot/moneda.js` · BE: `config/fiscal.config.ts`, `config/iva.config.ts`, `config/moneda.config.ts`, `config/timezone.config.ts`, `config/facturacion-electronica.config.ts`, `config/facturacion-provider.config.ts`.
- **Para qué sirve:** adaptar la instalación a un país (etiquetas fiscales, tarifas de IVA, moneda, proveedor de facturación electrónica y zona horaria) sin tocar el código. Todos los valores por defecto reproducen Ecuador, de modo que una instalación ecuatoriana no define ninguna. Texto público equivalente: `docs/referencia/pais-moneda-e-impuestos`.
- **Acceso:** no aplica (configuración de despliegue). Los nombres de variable son material interno y **no se publican en `docs/`**.
- **Parámetros ✅:**

  | Parámetro | Frontend (variable · valor por defecto) | Backend (variable · valor por defecto) | Efecto visible |
  |---|---|---|---|
  | País de la instalación | `VITE_PAIS` · `EC` (`usePais.js:6-9`) | `PAIS` · sin valor; las consultas caen a Ecuador (`fiscal.config.ts:22-25`, `iva.config.ts:23-28`) | etiquetas de documento, longitudes de documento, tarifas de IVA, campos exclusivos de Ecuador/Colombia |
  | País inicial del selector de teléfono | `VITE_TEL_DEFAULT_COUNTRY` · el país de la instancia (`usePais.js:33-34`) | — | bandera por defecto en los teléfonos |
  | Facturación electrónica activa | `VITE_FACTURACION_ELECTRONICA` · activa; se apaga con `false`, `0`, `no`, `off` (`useFacturacionElectronica.js:10-14`) | `FACTURACION_ELECTRONICA` · igual (`facturacion-electronica.config.ts:12-18`) | chip SRI, aviso de firma, secuenciales y ambiente de la sucursal |
  | Proveedor de facturación | `VITE_FACTURACION_PROVIDER` (`sri`/`factus`/`ninguno`); si no, `CO`→`factus`, `EC`→`sri`, otro país según el interruptor anterior (`usePais.js:11-29`) | `FACTURACION_PROVIDER` con la misma cadena (`facturacion-provider.config.ts:22-43`) | rangos de numeración Factus, reenvío al SRI |
  | Moneda | `VITE_MONEDA_SIMBOLO` · `$`, `VITE_MONEDA_CODIGO` · `USD`, `VITE_MONEDA_LOCALE` · `en-US` (`useMoneda.js:7-22`); símbolo global `$simboloMoneda` (`boot/moneda.js`) | `MONEDA_CODIGO` · `USD`, `MONEDA_SIMBOLO` · `$`, `MONEDA_NOMBRE` · `Dólares`, `MONEDA_FRACCION` · `Centavos`, `APP_LOCALE` · `es-EC` (`moneda.config.ts:11-19`) | montos con `$ 12.50`; importes en letras de los comprobantes (`montoEnLetras`) |
  | Zona horaria | `VITE_APP_TIMEZONE` · `America/Guayaquil` (`appTimezone.js:7-9`) | `APP_TIMEZONE` ‖ `TZ` ‖ `America/Guayaquil` (`timezone.config.ts:16-19`) | fechas y horas de pantalla y de los cron |
  | IVA estándar | tarifas por país (abajo) | `IVA_ESTANDAR` si se fuerza; si no, por país con respaldo 15 (`iva.config.ts:14-28`) | tarifa que se propone y se imprime |
  | Etiqueta de identificación fiscal | `EC` RUC · `CO` NIT · `MX` RFC · `VE` RIF · `BO` NIT · `PE` RUC; por defecto RUC (`usePais.js:78-79`) | empresa/cliente: `EC` RUC / RUC/CI · `CO` NIT / NIT/CC · `MX` RFC / RFC · `VE` RIF / RIF/CI · `BO` NIT / NIT/CI · `PE` RUC / RUC/DNI (`fiscal.config.ts:13-20`) | rótulos en formularios, PDF y comprobantes |

- **Tablas por país en el frontend ✅ (`usePais.js`):**
  - Tipos de documento (`05` identidad, `04` tributaria, `06` pasaporte; solo cambia la etiqueta): `EC` Cédula/RUC/Pasaporte · `MX` CURP/RFC · `VE` Cédula/RIF · `CO` Cédula/NIT · `BO` Cédula (CI)/NIT · `PE` DNI/RUC; otro país: `Documento de identidad`, `Identificación tributaria`, `Pasaporte` (`:39-52`).
  - Longitud exacta del documento: `EC` identidad 10 y tributaria 13; `PE` identidad 8 y tributaria 11; el resto, libre (`:60-73`).
  - Tarifas de IVA ofrecidas: `EC` 0/12/14/15 · `CO` 0/5/19 · `MX` 0/16 · `VE` 0/16 · `BO` 0/13 · `PE` 0/18; estándar = la mayor de la lista (`:85-102`). ICE solo en Ecuador (`:107`).
  - Códigos de forma de pago: `EC` los del SRI (01, 15–21) y `CO` los de la DIAN (10, 42, 47, 20, 49, 48, 71, 72, 1); otro país usa los de Ecuador (`:113-136`).
- **Reglas:** en Ecuador el porcentaje de IVA de la empresa también se deriva del código SRI (`2/3/4` → 12/14/15); la constante del país es el respaldo cuando no aplica ese esquema (`iva.config.ts:10-12`). Fuera de Ecuador no se piden firma `.p12` ni numeración de establecimiento (ACC-030, ACC-031).
- **Otros parámetros de despliegue que el código usa (solo nombre, sin valores):** frontend `VITE_COMPANY_NAME` (prefijo de las claves de `localStorage`), `VITE_AMBIENTE` y `VITE_BASE_URL` (dirección de la API en desarrollo), `VITE_HOST_KEY_PERMISOS` (clave con la que se cifra la lista de permisos en el navegador, ACC-002), `VITE_WEBSOCKET`, `VITE_HOST_API_FACTURACION`, `VITE_API_WHATSAPP`; backend `PORT`, `DOMINIO`, `STAGE`, `JWT_SECRET`, `SERVICE_TOKEN`, `HOST_WEBSOCKET`, `HOST_API_FACTURACION`, `HOST_API_WHATSAPP`, `HOST_API_MASTER`, `MASTER_SERVICE_TOKEN`, `ES_INSTANCIA_GESTION`, `INSTANCIA_DIRECCION`, `INTERVALO_MINUTOS`, `URL_SLACK`, `CLIENTE`, `MAIL_HOST`/`MAIL_PORT`/`MAIL_USER`/`MAIL_PASSWORD`, `REDIS_HOST`/`REDIS_PORT`, `DB_*`, `NODE_APP_INSTANCE`/`PM2_INSTANCE_ID`.
- **Casos límite y advertencias:** el frontend y el backend deben configurarse **a la par** (no hay verificación cruzada); `PAIS` sin definir en el backend equivale a Ecuador salvo en `facturacionProvider`, que cae al interruptor `FACTURACION_ELECTRONICA`; el servidor de caché y las colas usan `127.0.0.1:6379` escrito en el código (`app.module.ts:102-114`), mientras que otros servicios leen `REDIS_HOST`/`REDIS_PORT`.
- **Preguntas probables de usuarios:** "¿Puedo cambiar la moneda desde Ajustes?" → no, es de la instalación. "¿Por qué mi sistema pide RUC y el de otro país pide NIT?" → país de la instalación. "Las horas salen distintas" → zona horaria del servidor.
- **Pendiente de validar en UI:** ❓ formatos con `VITE_MONEDA_LOCALE` distinto de `en-US`; ❓ instalaciones de países sin tabla (usan el respaldo de Ecuador).

---

## ACC-036 · Tareas programadas y colas (cortes, facturas, promesas, ingresos/egresos)
- **Ruta UI / name:** sin pantalla propia; los disparan botones de Ajustes → Configuración de Cortes, Ajustes → Facturación, Ajustes → Plantillas y muchas pantallas que recalculan el estado de un servicio. El catálogo completo de cron y colas está en `notes/inventory/aut.md` (AUT-001…AUT-039).
- **Archivos:** BE: `app.controller.ts`, `app.service.ts`, `app-queue.processor.ts`, `config/queue.config.ts`, `app.module.ts` · FE: `pages/dashboard/ajustes/servicios/components/ConfigurarReintentosCortes.vue`, `pages/dashboard/ajustes/servicios/components/HoraCorte.vue`, `pages/dashboard/ajustes/servicios/composables/useCorteRouter.js`, `pages/dashboard/ajustes/facturacion/components/FacturacionPage.vue`, `pages/dashboard/ajustes/plantillas/components/RecordatorioPago.vue`.
- **Para qué sirve:** puntos de entrada HTTP que encolan trabajos en Bull (Redis) o reconstruyen la agenda de cron. Todos exigen solo JWT (`@Auth()`), salvo `resumen-cliente` (token de servicio o JWT): **cualquier usuario autenticado puede invocarlos por API**, aunque la interfaz los condicione a permisos (`variables.aplicar-cortes`, `variables.facturacion`, etc.).
- **Endpoints ✅ (`app.controller.ts`):**

  | Endpoint | Qué hace | Lo llama |
  |---|---|---|
  | `PUT /programar-queue/:queue` | si `:queue` es `cortesServicios` ⇒ `programarCortes()`; con **cualquier otro valor** (p. ej. `recordatoriosPago`) ⇒ `AppService.init()` sin esperarlo. Responde siempre `{success:true, status:201, message:'deleted successfully'}` (`:32-49`) | guardar horarios/reintentos de cortes (`HoraCorte.vue:33`, `ConfigurarReintentosCortes.vue:47,63`, `useSetting.js:213`); guardar la plantilla de recordatorios (`RecordatorioPago.vue:48`) |
  | `POST /aplicar-cortes` | encola un trabajo `cortesServicios` **por router** con `sincronizarOnus:true` y `jobId = aplicarCorteManual-<router>-<día>` (si ya hay uno del día no se duplica) (`:51-62`, `app.service.ts:256-285`) | botón de corte manual (`ConfigurarReintentosCortes.vue:64`, AJS-006) |
  | `POST /generar-facturas` | encola `generarFacturasPendientes` con `jobId` fijo (dos clics o dos usuarios comparten el trabajo), espera el resultado y lo devuelve; si falla: 400 `No se pudieron generar las facturas` (`:64-70`, `app.service.ts:218-237`) | `FacturacionPage.vue:75` (AJS-010) |
  | `GET /activar-desactivar-servicio/:servicio_id` | encola `verifyAndApplyServiceStatus` (borra la clave de caché `<cola>-customers` y recalcula suspendido/activo del servicio, AUT-012) (`:24-30`, `app-queue.processor.ts:68-74`) | pagos, facturas, ficha del cliente, transacciones |
  | `GET /resumen-cliente?servicio_id=` | fecha máxima de pago del servicio (trabajo `obtenerFechaMaximoPago`; caché `fecha-max-pago:*`, AUT-038) (`:72-79`, `app.service.ts:52-77`) | mapa de red, resumen de notificaciones del cliente |
  | `GET /corte-config/global` · `GET`/`PATCH /corte-config/router/:routerId` | lee o guarda la configuración de cortes del router (`null` = usa la global) y, al guardar, **reconstruye la agenda** (`:81-101`, `app.service.ts:419-444`) | Configuración de Cortes por router (AJS-007) |

- **Agenda que construye `AppService` ✅ (solo la instancia primaria, `NODE_APP_INSTANCE`/`PM2_INSTANCE_ID` = `0`; `init`, `app.service.ts:31-48`):**
  - `crearFacturas`: repetible el día 1 de cada mes (`<INTERVALO_MINUTOS> 0 1 * *`), 2 intentos con espera de 120 s (`:197-216`, `config/queue.config.ts:8-9`).
  - `actualizarEstadoPromesasPago`: repetible diario (`<INTERVALO_MINUTOS> 0 * * *`) (`:465-482`).
  - `cortesServicios`: un repetible por router y día de la semana habilitado, con la hora de `horasPorDia` del router o la global (`m h * * d`); `programarCortes` borra primero los repetibles `cortesServicios` y los recrea (`:294-338`).
  - `recuperarCortesPerdidos`: al arrancar, si hoy es día de corte, ya pasó la hora y no hay marca de corte del día en Logs, encola `corte-recuperado-<router>-<AAAAMMDD>` y deja un log `♻️ Corte recuperado…` (`:340-417`).
  - `generarIngresosEgresosRecurrentes`: diario `0 0 * * *` en la cola de ingresos/egresos (`:446-463`).
  - Procesadores de la cola `-app`: `crearFacturas`, `generarFacturasPendientes`, `cortesServicios`, `verifyAndApplyServiceStatus`, `obtenerFechaMaximoPago`, `reintentarRoutersFallidos`, `actualizarEstadoPromesasPago` (`app-queue.processor.ts:53-77,770,864`). Los errores al habilitar/deshabilitar una ONU se avisan a Slack con `URL_SLACK` (`:104-111`).
- **Reglas:** el `init` se ejecuta al arrancar el módulo (`AppController.onModuleInit`, `app.controller.ts:13-15`): espera 2 s, limpia colas y caché (ACC-040), espera 3 s y reprograma. Los horarios usan la hora local del proceso (ACC-035).
- **Efectos secundarios externos:** Redis/Bull; MikroTik, SmartOLT y AdminOLT (cortes); Slack; WhatsApp (recordatorios, desde `PagosService`).
- **Mensajes (texto exacto):** `deleted successfully`, `apply successfully`, `No se pudieron generar las facturas`.
- **Relaciones:** AUT-001…AUT-012, AUT-033, AUT-036, AJS-003…AJS-010.
- **Casos límite y advertencias ✅:**
  - Guardar la plantilla de recordatorios pasa por `init()` y por tanto **vacía la caché de Redis completa** (ACC-040) y reprograma facturas, cortes, promesas e ingresos/egresos; no espera su finalización.
  - `PUT /programar-queue/:queue` devuelve éxito aunque `:queue` no exista.
  - `aplicar-cortes` ignora el día y los horarios: corta/reactiva según el estado actual de cada servicio en todos los routers.
- **Preguntas probables de usuarios:** "Cambié la hora de corte, ¿se aplica ya?" → sí, al guardar se reconstruye la agenda. "Se reinició el servidor y no se hizo el corte de hoy" → `recuperarCortesPerdidos` lo encola al arrancar si ya pasó la hora. "¿Cómo genero las facturas del mes ahora?" → `Generar facturas ahora` en Ajustes → Facturación.
- **Pendiente de validar en UI:** ❓ valor real de `INTERVALO_MINUTOS`; ❓ tiempo que tarda `aplicar-cortes` con muchos routers.

---

## ACC-037 · Logs (API de auditoría)
- **Ruta UI / name:** la API `/logs`; las pantallas son Ajustes → **Logs** (`/ajustes/logs` · `ajuste.logs`, clave `ver.logs`, AJS-021), las pestañas de logs de cortes y generales de Configuración de Cortes y el historial del perfil del cliente (`FE:pages/dashboard/ajustes/servicios/components/LogsCortes.vue:37`, `LogsGenerales.vue:201`, `pages/dashboard/clientes/components/logs/composables/useLogs.js:50`).
- **Archivos:** BE: `logs/logs.controller.ts`, `logs/logs.service.ts`, `logs/entities/log.entity.ts`, `logs/dto/filter-log.dto.ts`, `logs/dto/create-log.dto.ts`, `common/dtos/pagination.dto.ts`.
- **Para qué sirve:** registrar y consultar quién hizo qué sobre qué entidad (cobros, cortes, clientes, tickets, contratos…); también lo usan los procesos automáticos (sin usuario).
- **Acceso:** `@Auth()` en todo el controlador. La clave `ver.logs` solo decide la tarjeta y la ruta en el panel; el backend no la comprueba.
- **Modelo ✅ (`log.entity.ts`):** `entityType` (≤100), `entityId` (≤100, a veces UUID, a veces otro texto), `action` (≤50: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `RUN`, `RETIRAR_SERVICIO`, `SEND_WHATSAPP_ERROR`, `DEFINIR_SUCURSAL_COBRO`…), `description`, `user` (opcional ⇒ proceso automático), `metadata` (JSON) y fechas.
- **Endpoints ✅ (`logs.controller.ts`):**

  | Endpoint | Efecto |
  |---|---|
  | `GET /logs?page&limit&filter&entityType&entityId&fechaDesde&fechaHasta&actions&userId&soloAutomaticos` | lista paginada (por defecto página 1, 10 por página; `limit=0` = sin paginar) ordenada por `updated_at` descendente. `filter` busca en la descripción y en el nombre o usuario (los automáticos cuentan como `ISPMAX`); `entityType` y `actions` aceptan varios valores separados por coma; las fechas van `DD/MM/YYYY`; `soloAutomaticos=true` gana sobre `userId`. Cada fila añade `cliente {id, nombres}` cuando el `entityId` pertenece a un servicio, pago, ticket o promesa (`logs.service.ts:23-118,185-258`) |
  | `GET /logs/ultimo-retiro/:servicio_id` | fecha (`DD/MM/YYYY HH:mma`) del último log `RETIRAR_SERVICIO` o `{fecha_ultimo_retiro:null}` (`:138-149`) |
  | `POST /logs` | crea un log con lo que se envíe |
  | `DELETE /logs/:id` | borra un log: `Log eliminado correctamente`; 404 `Log con id <id> no encontrado` (`:151-159`) |
  | `GET /logs/:id`, `PATCH /logs/:id` | **sin implementar**: devuelven un texto fijo (`This action returns a #<id> log`) (`:120-126`) |

- **Casos límite y advertencias ✅:** cualquier usuario autenticado puede crear y **borrar** logs por API (no hay permiso ni auditoría del borrado); los call sites usan `entityType`/`entityId` de forma inconsistente (el propio servicio lo documenta), por eso el filtro por cliente resuelve contra cuatro tablas; el microservicio de facturación expone su propio `/logs` (usado por el chip SRI, ACC-028).
- **Relaciones:** AJS-021, AUT-007/008, CLI (historial del cliente), COB, ACC-028.
- **Preguntas probables de usuarios:** "¿Quién anuló esta factura?" → Logs, filtrando por la descripción o por el cliente. "¿Por qué hay logs sin usuario?" → los generan procesos automáticos (se muestran como ISPMAX).
- **Pendiente de validar en UI:** ❓ lista de acciones y tipos de entidad disponibles en los filtros de la pantalla.

---

## ACC-038 · Actualización del sistema (deploy) — excluida del manual
- **Ruta UI / name:** `/ajustes/sistema` · `ajuste.sistema` · tarjeta `Sistema` de Ajustes (icono `system_update`); `POST /api/deploy`.
- **Archivos:** FE: `pages/dashboard/ajustes/sistema/IndexPage.vue`, `pages/dashboard/ajustes/IndexPage.vue`, `router/auth-guard.ts` · BE: `deploy/deploy.controller.ts`, `deploy/service-token.guard.ts`, `deploy/deploy.module.ts`.
- **Qué es:** pantalla `Actualización del Sistema` con un botón `Actualizar Sistema` que dispara el despliegue del software en el servidor. Detalle completo (lo que hace `deploy.sh`, mensajes, casos límite) en AJS-022 (`notes/inventory/ajs1.md`); aquí solo lo que pertenece al dominio de acceso.
- **Acceso real ✅:** (1) la tarjeta solo se dibuja si el correo de la sesión coincide con **una dirección fija escrita en el código** (`ajustes/IndexPage.vue:386-409`; ninguna otra cuenta la ve, ni siquiera `SUPER-ADMINISTRADOR`); la misma cuenta se **excluye de la lista de usuarios** de Gestión Personal (`auth.service.ts:239-266`, `:254,259`); (2) la ruta no tiene clave en el catálogo, pero `SUPER-ADMINISTRADOR` pasa el guard y puede abrirla escribiendo la URL (`auth-guard.ts:135-141`); (3) en el backend `POST /deploy` y `GET /deploy/log` usan `ServiceTokenGuard`, que acepta el token de servicio **o cualquier JWT con firma válida** (`service-token.guard.ts:9-31`, `deploy.controller.ts:33-35,64-66`).
- **Respuestas ✅:** `200 {message:'Deploy iniciado, revisa los logs del servidor'}` antes de ejecutar; `409 {message:'Ya hay un deploy en curso'}` si `deploy.lock` tiene menos de 20 min; `404 No se encontró deploy.log` en el log; `401 Acceso no autorizado`. Mensajes del panel: `Sistema actualizado correctamente.` / `Error al actualizar el sistema.` (aparece al **iniciar**, no al terminar) (`IndexPage.vue:7-25`).
- **Por qué no se documenta:** decisión registrada en `notes/exclusiones.md` (ACC-038): herramienta de mantenimiento del proveedor, reservada a una cuenta; el ISP no la usa. La guía pública `docs/guia/sistema` solo indica que existe y que no aparece para los usuarios de la empresa.
- **Hallazgo ✅:** el `ServiceTokenGuard` valida únicamente la firma del JWT (no comprueba que el usuario exista o esté activo) y el JWT no caduca (ACC-002): un usuario desactivado conserva acceso a `/deploy`, a `POST /companies/:id` y a los endpoints `sucursal/*-cobro` mientras conserve su token.
- **Pendiente de validar en UI:** ❓ que la tarjeta aparezca para la cuenta reservada; ❓ qué ve un SUPER-ADMINISTRADOR al abrir la URL.

---

## ACC-039 · Imágenes y archivos estáticos (logo, foto de perfil, SRI, uploads) — excluida del manual
- **Ruta UI / name:** sin pantalla; direcciones públicas del backend.
- **Archivos:** BE: `app.controller.ts`, `app.module.ts`, `companies/companies.controller.ts`, `auth/auth.controller.ts`, `auth/helpers/fileFilter.helper.ts`, `auth/helpers/fileNamer.helper.ts`, `companies/helpers/fileFilter.helper.ts`, `companies/helpers/fileNamer.helper.ts`.
- **Qué es:** el backend sirve archivos sin autenticación (los usan las etiquetas `img` del panel y los enlaces de descarga):

  | Dirección | Carpeta del servidor | Contenido |
  |---|---|---|
  | `GET /api/images/:filename` | `public/images` | logo de la empresa (también en el login) (`app.controller.ts:17-22`) |
  | `/api/images-user/<archivo>` | `static/images-user` | fotos de perfil de usuarios (`app.module.ts:158-162`) |
  | `/api/uploads/<archivo>` | `static/uploads` | PDF y adjuntos de contratos, tickets y firma electrónica (`images-services`), imágenes de WhatsApp (`wa-headers`) (`app.module.ts:163-167`; `firma-electronica/firma-tramites.service.ts:46`) |
  | `/api/sri/<ruta>` | `static/SRI` | **certificados de firma (`FIRMAS`)**, PDF y XML de comprobantes (`PDF/<clave_acceso>.pdf`, `<empresa>/facturas/Autorizados/<clave>.xml`) (`app.module.ts:153-157`; `invoices.service.ts:223-226`; `invoice-queue.processor.ts:505-506,685-686`) |

- **Subidas ✅:** foto de usuario (`foto` en `POST /auth/register` y `PATCH /auth/edit/:id`) y logo/certificado de la empresa (`POST /companies/:id`) se guardan con nombre `uuid.<extensión>` (`.p12` para el certificado); el filtro admite solo tipos MIME `jpg`, `jpeg`, `png` y `x-pkcs12` y descarta el resto en silencio; no hay límite de tamaño ni de dimensiones en el servidor.
- **Por qué no se documenta:** decisión en `notes/exclusiones.md` (ACC-039): detalle de infraestructura sin operación del usuario. El efecto visible (qué formato de logo/foto se admite) se explica en las páginas de Empresa y Gestión Personal.
- **Hallazgos ✅ (solo `notes/`):**
  - `/api/sri` publica sin autenticación todo `static/SRI`, incluidas las firmas `.p12` y los comprobantes; los nombres son difíciles de adivinar (UUID) o llevan la clave de acceso, pero cualquiera que conozca la ruta descarga el archivo. El nombre del certificado se devuelve en `GET /companies`.
  - `GET /api/images/:filename` arma la ruta con `join(process.cwd(),'public','images', filename.trim())` y llama a `sendFile` **sin** comprobar que el resultado siga dentro de `public/images`; el parámetro llega decodificado, así que un `%2e%2e%2f` podría salir de la carpeta ❓ (leído en código, no ejecutado).
  - `static/conciliaciones` (extractos bancarios) no se sirve; es la excepción.
- **Pendiente de validar en UI:** ❓ comportamiento de Nginx/proxy ante `%2f` en la primera ruta.

---

## ACC-040 · Caché Redis y consistencia (permisos, usuarios, resumen del sistema) — excluida del manual
- **Ruta UI / name:** transversal; sin pantalla.
- **Archivos:** BE: `app.module.ts`, `app.service.ts`, `common/utils/cache-invalidation.service.ts`, `common/utils/fecha-max-pago-cache.ts`, `auth/auth.service.ts`, `settings/settings.service.ts`, `dashboard/dashboard.service.ts`, `sucursal/sucursal.service.ts`, `router/router.service.ts`, `customers/customers.service.ts`.
- **Qué es:** el backend guarda resultados costosos en Redis (`CacheModule`, `ttl: 0`) para no repetir consultas. Es un detalle interno; su efecto visible (datos que tardan en refrescarse) se explica en las páginas de cada pantalla. Decisión en `notes/exclusiones.md` (ACC-040).
- **Regla clave ✅:** el almacén `cache-manager-redis-store` 2.0.0 **solo respeta el TTL cuando se pasa como objeto** (`{ ttl: <segundos> }`); un número como tercer argumento se interpreta como opciones y se ignora, quedando el `ttl: 0` global, es decir **sin vencimiento** (`app.module.ts:102-108`, `node_modules/cache-manager-redis-store/dist/index.js` `set`, `cache-manager/dist/caching.js:95`). El propio código lo reconoce (`auth.service.ts:240-243,421-422`, `fecha-max-pago-cache.ts:3-13`). Por eso los TTL numéricos de abajo no tienen efecto.
- **Claves ✅:**

  | Clave | Contenido / quién la escribe | Se invalida |
  |---|---|---|
  | `permisos:<usuarioId>` | `obtenerPermisos`: permisos, routers, sucursales, `isActive`, `logout`, `esPermitido`, `mensajeError` (`auth.service.ts:98-183`; TTL 2 400 000 **ignorado**) | al iniciar sesión (cada login la borra, `:401`), al editar al usuario (`:217-220`), bloqueo por intentos y restablecimiento (`:425,535`), alta/edición/estado/baja de sucursal y de router (`permisos:*`, `sucursal.service.ts`, `router.service.ts`), y al reiniciar el backend. **No** al editar un rol (ACC-003) |
  | `usuarios:true` / `usuarios:false` | lista de Gestión Personal sin la cuenta reservada (`auth.service.ts:239-266`) | crear, editar y eliminar usuario (`:65-66,219-220,585-586`). El bloqueo automático y el restablecimiento borran `users:true`/`users:false` (`:426-427,536-537`), nombres que **ya no existen**: la lista conserva el estado anterior (`Activo`/`Inactivo`) hasta otro cambio |
  | `resumen-sistema:<empresa>:<routers>` | tarjeta Resumen del sistema del Dashboard (ACC-019, `dashboard.service.ts:607-642`) | alta/edición/estado/baja de router y cambios de clientes (`customers.service.ts:2072-2074,2088-2090,2855-2857`) |
  | `clientes-servicios:*`, `customers-count:*` | invalidadas junto con la anterior; no se localizó el código que las escribe ❓ | `cache-invalidation.service.ts:31-37` |
  | `settings:findAll` | ajustes de la empresa (`settings.service.ts:15,59-75`) | al guardar ajustes |
  | `fecha-max-pago:<servicio>[:tol1]` | fecha máxima de pago por servicio (`app.service.ts:52-77`; TTL 25 min **ignorado**) | cada pago (`fecha-max-pago-cache.ts:23-31`) |
  | `login:fails:<id>` · `login:lock:<id>` · `recovery:<token>` · `recovery-ref:<ref>` | intentos (900 s), bloqueo (86 400 s), token de recuperación (900 s) y referencia de cuenta (600 s); **sí vencen** porque se escriben con `{ttl}` (ACC-041…044) | al usarse o restablecer |
  | `recordatorio-progreso-<PORT>` · `recordatorio-cancelar-<PORT>` · `recordatorio-planificados-<PORT>` | widget de recordatorios (ACC-029; TTL 30 min **ignorado**) | al terminar el envío o al arrancar |
  | `<cola>-customers`, `sri:<uuid>`, caches de ONU, auditoría de amarre, migración de redes, contadores diarios de WhatsApp Oficial | usos puntuales (`app-queue.processor.ts:70`, `transacciones.service.ts:94`, `smart-olt.service.ts`, `mikrotik.service.ts`, `red-ipv4.service.ts`, `cloud-api.service.ts`) | según cada módulo |

  Además, la información del plan (`master-suscripcion:*`, ACC-027) usa un cliente Redis propio y **sí** respeta su TTL de 5 min.
- **Vaciado total ✅:** `AppService.limpiarColasAntiguas` llama a `cacheManager.reset()`, que en este almacén es `FLUSHDB` (borra **toda** la base 0 de Redis, no solo las claves de caché) (`app.service.ts:83-118`, línea 103; `cache-manager-redis-store/dist/index.js` `reset`). Ocurre en cada arranque de la instancia primaria y cada vez que se llama `PUT /programar-queue/<cualquier cosa distinta de cortesServicios>` (p. ej. al guardar la plantilla de recordatorios, ACC-036). Efectos colaterales: se pierden bloqueos `login:lock`, tokens `recovery:*`, progresos y cancelaciones de envíos, y cada sesión recalcula sus permisos en la siguiente navegación. AUT-036 describe el proceso.
- **Hallazgo ✅:** la inconsistencia `users:*` / `usuarios:*` (arriba). Otros datos obsoletos esperables: cambios de rol sin efecto visible hasta renovar `permisos:<id>` (ACC-003), y resumen del sistema sin refrescar al cambiar el filtro.
- **Pendiente de validar en UI:** ❓ comprobar en una instancia con Redis qué ve un usuario al editar un rol (por la ausencia de invalidación).

---

## ACC-041 · Recuperar la contraseña por correo
- **Ruta UI / name:** `/login` → enlace `¿Olvidaste tu contraseña?` bajo el campo de contraseña (`FE:pages/sesion/Login.vue:252`) → cuadro (`q-dialog`) de recuperación (`:276-370`).
- **Archivos:** FE: `pages/sesion/Login.vue:107-155` · BE: `auth/auth.controller.ts:68-72`, `auth/auth.service.ts:436-465` (`recuperarPassword`), `:494-501` (`enmascararEmail`), `:503-518` (`enviarCorreoRecuperacion`), `auth/dto/recuperar-password.dto.ts`, `auth/plantillas/recuperar-password.hbs`, `email/email.service.ts:276-289` (`sendDesdeSistema`).
- **Para qué sirve:** que una persona cree una contraseña nueva sin intervención de un administrador.
- **Acceso:** pública. Límite por IP (ACC-045).
- **Campos y botones:** `Correo electrónico` (`type=email`, se copia el que se escribió en el login) · `Enviar enlace` (deshabilitado sin correo) · `¿Olvidaste tu correo?` (ACC-042) · `Cancelar` · pie `¿No recuerdas tus datos? Contacta a tu administrador.`
- **Reglas (backend):**
  1. `POST /auth/recuperar-password` recibe `email` **o** `ref` (de ACC-042). Con `ref` busca `recovery-ref:<ref>` en caché; si no existe ⇒ 400 `La búsqueda venció, vuelve a buscar tu cuenta`. Con `email` busca (minúsculas, `deleted_at IS NULL`). Sin usuario ⇒ 404 `No existe una cuenta registrada con ese correo` (revela si el correo existe).
  2. No exige que la cuenta esté activa: una cuenta desactivada por un administrador también recibe el enlace.
  3. Genera un token aleatorio de 32 bytes (hex), lo guarda en Redis `recovery:<token>` → id de usuario con TTL de 900 s (15 min) y envía el enlace `<base>/restablecer-password?token=<token>&exp=<epoch+15min>`. La base es `process.env.DOMINIO`, o la cabecera `Origin` si `STAGE=dev`. Una nueva solicitud **no invalida** los tokens anteriores.
  4. El correo sale con `EmailService.sendDesdeSistema`: usa `MAIL_HOST/PORT/USER/PASSWORD` del entorno (no el servidor de correo de la empresa de Ajustes → Mensajería), `tls.rejectUnauthorized=false`. Asunto `Recuperación de acceso - ISPMAX`; plantilla con nombre completo, usuario, correo, fecha, botón `Restablecer contraseña` y logo. Si falla ⇒ 400 `No se pudo enviar el correo, intente más tarde o contacte a su administrador`.
  5. Éxito: `{ ok: true, email: <correo enmascarado> }` (`ju********@em*****.com`: dos primeras letras de cada parte, resto en asteriscos con mínimo 3).
- **Mensajes (texto exacto):** `Revisa tu bandeja` · `Enviamos un enlace para crear una nueva contraseña a <correo>.` · `El enlace vence en 15 minutos. Si no lo ves, revisa el spam.` · `Entendido` · errores de arriba.
- **Relaciones:** ACC-042, ACC-043, ACC-044, ACC-045, ACC-001.
- **Casos límite y advertencias:**
  - Con `DOMINIO` sin definir y sin cabecera `Origin`, la petición falla con 500 (comprobado en la instancia local).
  - ❓ El envío real (SMTP) no se probó: la instancia de pruebas no tiene correo del sistema.

---

## ACC-042 · "¿Olvidaste tu correo?": buscar la cuenta por celular o usuario
- **Ruta UI / name:** `/login` → cuadro de recuperación → `¿Olvidaste tu correo?` (`Login.vue:299-339`).
- **Archivos:** FE: `Login.vue:143-155` · BE: `auth.controller.ts:73-78`, `auth.service.ts:467-492` (`recuperarCorreo`), `dto/recuperar-password.dto.ts` (`termino`: 3–60 caracteres).
- **Campos y botones:** `Celular o nombre de usuario` · `Buscar mi cuenta` (deshabilitado con menos de 3 caracteres) · por cada cuenta: correo enmascarado + `Enviar enlace` · `Volver`.
- **Reglas:** busca usuarios no eliminados y con correo donde `UPPER(usuario) = término` **o** los dígitos del celular coinciden con los dígitos del término (`099 123 4567` = `0991234567`); máximo 5. Cada cuenta recibe un `ref` aleatorio guardado 600 s (10 min) en caché (`recovery-ref:<ref>`) para no exponer el correo completo; el `ref` se envía a ACC-041. Sin coincidencias ⇒ 404 `No encontramos una cuenta con ese celular o usuario`.
- **Textos:** `Encontramos esta cuenta:` / `Encontramos estas cuentas:` · `Te enviaremos ahí un enlace para crear una nueva contraseña.`
- **Advertencia:** el nombre de usuario no es único (ACC-007): puede devolver varias cuentas; cada una con su correo enmascarado.

---

## ACC-043 · Bloqueo automático por 5 intentos fallidos y reactivación al restablecer
- **Archivos:** BE: `auth/auth.service.ts:372-380` (login), `:411-433` (`registrarIntentoFallido`), `:520-545` (`restablecerPassword`).
- **Reglas:**
  1. Contraseña incorrecta de un usuario existente: contador Redis `login:fails:<id>` +1, con TTL de 900 s que se **renueva en cada fallo** (15 min sin fallar lo reinicia). Un login correcto lo borra.
  2. Al 5.º fallo, si el usuario está activo: `isActive=false`, `logout=true` (cierra la sesión abierta), marca `login:lock:<id>` con TTL de 86 400 s (24 h), borra la caché `permisos:<id>` y las claves `users:true` y `users:false` (la lista de usuarios se guarda como `usuarios:true/false`, así que esas dos claves no existen y la lista no se invalida, ver ACC-040), y responde `Cuenta inactivada por varios intentos fallidos. Use "¿Olvidaste tu contraseña?" para recuperarla o contacte a su administrador`.
  3. Restablecer la contraseña (ACC-044) reactiva la cuenta **solo si existe `login:lock:<id>`** (bloqueo automático de las últimas 24 h). Una cuenta desactivada por un administrador, o bloqueada hace más de 24 h, **no** se reactiva.
  4. Aplica a todos los roles, incluidos ADMINISTRADOR y SUPER-ADMINISTRADOR.
- **Comprobado en la instancia local (coordinación 2026-10-21):** los 4 primeros fallos responden `Usuario o contraseña incorrectos`; el 5.º inactiva; luego, con clave incorrecta sigue el mensaje genérico y con la correcta `Su cuenta se encuentra inactiva…`; restablecer reactiva una cuenta bloqueada y no una desactivada por un administrador.
- **Casos límite:** cualquiera que conozca un correo válido puede inactivar esa cuenta con 5 contraseñas incorrectas (el límite de ACC-045 solo frena por IP, 10 por minuto).

---

## ACC-044 · Página `/restablecer-password`
- **Ruta UI / name:** `/restablecer-password?token=…&exp=…` · `restablecer-password`, pública (`meta.requiresAuth:false`, `FE:router/routes.ts:11-15`).
- **Archivos:** FE: `pages/sesion/RestablecerPassword.vue` · BE: `auth.controller.ts:79-84`, `auth.service.ts:520-545`, `dto/recuperar-password.dto.ts` (`token` ≥ 20 caracteres; `password` 6–50).
- **Qué muestra:** tres estados: formulario `Crea una contraseña nueva` (anillo de cuenta atrás con `exp`, `Nueva contraseña` con ojo, medidor `Débil`/`Regular`/`Buena`/`Fuerte`, `Confirmar contraseña`, reglas `Al menos 6 caracteres` y `Las dos contraseñas coinciden`, botón `Guardar contraseña` solo habilitado con ambas reglas, enlace `Volver al inicio de sesión`); `Este enlace ya no es válido` (sin `token`, con `exp` vencido o si el servidor responde un mensaje con "enlace"; botón `Volver al inicio de sesión`); y éxito `Listo, ya está.` · `Tu contraseña fue actualizada. Te llevamos al inicio de sesión en un momento.` con redirección a `/login` a los 3 s.
- **Reglas (backend):** `recovery:<token>` inexistente ⇒ 400 `El enlace no es válido o ya venció, solicite uno nuevo`. Guarda `bcrypt(password.trim(), 10)`; si existe `login:lock:<id>` pone `isActive=true`; borra `recovery:<token>`, `login:fails`, `login:lock`, `permisos:<id>`, `users:true`, `users:false` (estas dos últimas no son la clave real de la lista de usuarios, `usuarios:*`, ver ACC-040). Devuelve `Contraseña actualizada, ya puede iniciar sesión`.
- **Casos límite:** restablecer **no** cierra las sesiones ya abiertas (el JWT no tiene `exp` y no se pone `logout`); el medidor de fuerza es solo visual (la única regla exigida es la longitud).

---

## ACC-045 · Límite de peticiones
- **Archivos:** BE: `app.module.ts:90-100,245` (`ThrottlerModule` + `APP_GUARD`), `common/guards/app-throttler.guard.ts`, `auth.controller.ts:60-83` (`@Throttle`), `main.ts:23` (`trust proxy`).
- **Reglas:** el guard cuenta por usuario del JWT (si el token es válido) y, si no hay, por IP. Existe un cupo general por ráfaga de 10 s y por minuto, y cupos estrictos por IP en `login`, `recuperar-password`, `recuperar-correo` y `restablecer-password`. Las llamadas con la cabecera de token de servicio válida quedan exentas (`skipIf`). Umbrales (solo para uso interno, no se publican en `docs/`): general 60 por 10 s y 150 por minuto; `login` 10 por minuto; `recuperar-password` 3 por minuto; `recuperar-correo` 3 por minuto; `restablecer-password` 5 por minuto (`app.module.ts:90-100`, `auth.controller.ts:60,68,74,80`).
- **Mensaje (texto exacto):** `Demasiadas peticiones, espere unos segundos e intente de nuevo` (HTTP 429). Comprobado en la instancia local tras 3 solicitudes de recuperación en un minuto.
- **Advertencia:** al ser por IP en los endpoints públicos, varias personas detrás de la misma IP pública comparten el cupo de login.

---

## Hallazgos del dominio (ronda 2: ACC-023…040)
Resumen de rarezas y discrepancias detectadas al completar las secciones anteriores. ✅ = leído en código; ❓ = no comprobado en ejecución. Los que afectan a la seguridad solo se registran en `notes/`.

| # | Hallazgo | Dónde |
|---|---|---|
| H-1 ✅ | Ninguna notificación de campana corresponde a "cortes aplicados" ni a "cambios de estado de comprobantes"; los avisos persistentes son ticket asignado, fallos de correo/WhatsApp, ONU no encontradas y equipos caídos/recuperados | ACC-025 |
| H-2 ✅ | `GET/DELETE /notifications/by-user/:user_id` no comprueba que el id sea el del solicitante | `notifications.controller.ts:29-48` |
| H-3 ✅ | `GET /companies` devuelve filas completas (clave del certificado y token de WhatsApp Oficial incluidos) a cualquier usuario autenticado; `GET /email` devuelve la contraseña SMTP | `companies.service.ts:28-37`, `email.service.ts:291-307` |
| H-4 ✅ | `ServiceTokenGuard` acepta cualquier JWT con firma válida (sin comprobar usuario activo) y se usa en `/deploy`, `POST /companies/:id`, `/sucursal/*-cobro`, `/resumen-cliente` | `deploy/service-token.guard.ts` |
| H-5 ✅ | `/api/sri` publica certificados `.p12` y comprobantes; `/api/images/:filename` sin contención de ruta ❓ | ACC-039 |
| H-6 ✅ | `rol-name` (panel) frente a `rol` (backend) en `GET /companies`: la excepción de SUPER-ADMINISTRADOR nunca se aplica | `boot/axios.ts:25`, `companies.controller.ts:22-30` |
| H-7 ✅ | La validación de la ficha de Empresa no bloquea el guardado (`await !validarCampos`), `Debes adjuntar el certificado` es inalcanzable, la pista de logo (3 MB, 600×600) no se aplica y los vacíos viajan como el texto `null` ❓ | `useEmpresa.js:203,186-195` |
| H-8 ✅ | Botón `+` móvil de Sucursales navega a `crear.sucursal` (ruta inexistente) | `sucursales/IndexPage.vue:297-309` |
| H-9 ✅ | Bloqueo automático y restablecimiento invalidan `users:*` en vez de `usuarios:*` | `auth.service.ts:426-427,536-537` |
| H-10 ✅ | `PUT /programar-queue/<otro>` ejecuta `init()` ⇒ `FLUSHDB` completo de Redis | `app.controller.ts:32-49`, `app.service.ts:103` |
| H-11 ✅ | TTL numéricos ignorados por el almacén de Redis (progreso de recordatorios, permisos, fecha máxima de pago) | ACC-040 |
| H-12 ✅ | El chip SRI pide el reenvío de comprobantes en cada comprobación con el SRI arriba (cada 5 min por pestaña), no solo al recuperarse | `estados-mantenedor.ts:98-112` |
| H-13 ✅ | `POST /logs` y `DELETE /logs/:id` abiertos a cualquier usuario autenticado; `GET/PATCH /logs/:id` sin implementar | `logs.controller.ts` |
| H-14 ✅ | La herramienta "Obtener IP" llama a `POST /mikrotik`, que no existe | ACC-034 |
| H-15 ✅ | Sin sucursal resoluble, el abono por pasarela se registra sin comprobante mientras el bot externo recibe 409 y rechaza | ACC-032 |
| H-16 ✅ | El menú oculta el grupo Finanzas con solo `cobros-pasarela.index` y el Dashboard con solo `dashboard.ultimos_pagos`; la etiqueta del menú es `Ventas` (el manual dice Facturas) | `SideBarMenu.vue:93-102,305-321` |
| H-17 ✅ | `v-idle` con `duration=3000` s ⇒ cierre a los 50 minutos sin actividad, sin aviso previo | `MainLayout.vue:213-217` |
| H-18 ❓ | La cabecera `autentication` del socket lleva solo el id del usuario; quien la verifique es el servidor de sockets (no incluido) | `Notifications.vue:153-160` |
| Cierre ✅ | ACC-022: la tabla del panel no es idéntica a la del módulo (sin interruptor `Auto`, sin tarjetas, sin alta/edición; recarga cada 60 s frente a 30 s) y su selector Router lleva `TODOS` cuando el usuario tiene más de un router. `docs/guia/dashboard.mdx` la llama «la misma tabla del módulo» y da bien los 60 s; no contradice el código | `panel/components/MonitoreoRed.vue:146-161,226-238`, `BE:auth/auth.service.ts:320` |
