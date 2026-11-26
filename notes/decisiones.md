# Decisiones

Formato: **fecha — decisión.** Motivo. Alternativas descartadas.

- **2026-10-12 — El código extraído vive en `C:\WORKSPACE\_ispmax-src\`, fuera del repo.**
  Motivo: 97 MB, datos no confiables, no debe mezclarse con el historial del manual.
  Alternativa descartada: scratchpad temporal (ruta larga, rompe `node_modules` en Windows).

- **2026-10-12 — No se ejecuta el backend contra la BD `ispmax` real.**
  Motivo: contiene clientes y pagos reales, y el backend ejecuta cron, MikroTik, WhatsApp, correo y SRI.
  Se construye instancia aislada con datos sintéticos (ver `notes/entorno.md`).
  Alternativa descartada: clonar la BD y anonimizarla (riesgo de PII en capturas y de efectos externos).

- **2026-10-12 — Arquitectura de información del manual.** Se conservan las URL `/guia/<slug>` como "Guía por
  pantalla" (marcadores y enlaces externos siguen funcionando) y se añaden secciones hermanas: `/tareas/` ("Quiero
  hacer…"), `/problemas/` (síntoma → causa → verificación → solución), `/preguntas/` (FAQ por rol/tema),
  `/referencia/` (campos, estados, permisos, variables, plantillas, automatizaciones, glosario) y `/conceptos/`.
  Motivo: el usuario busca por intención, no por nombre de pantalla; mantener URL estables evita rotura.
  Alternativa descartada: renombrar todo a una jerarquía nueva (rompería enlaces y `legacy-routes.json`).

- **2026-10-12 — Trazabilidad por frontmatter** (`modulo`, `tipo`, `funcionalidades`, `rutas`, `permisos`, `codigo`,
  `verificado`) validada por `scripts/docs-check.mjs`; IDs de funcionalidad provienen de `notes/inventory/*.md` y se
  consolidan con `scripts/build-inventory.mjs` (`docs-inventory.md`, generado).

- **2026-10-12 — Capturas generadas por herramienta** (`tools/capture`, Edge headless) en vez de manuales: reproducibles,
  con anotaciones numeradas y sin datos reales. El panel integrado de Claude no sirve para capturas finales (viewport
  pequeño).

- **2026-10-12 — Puerto API por defecto de MikroTik: 8728 (no 8787).** El PDF de revisiones pedía 8787; el código usa
  8728 como placeholder y valor por defecto (`FormRouter.vue:369`, `useRouter.js:107`). El manual sigue el código y
  explica que se puede indicar otro puerto. Registrado en `docs-backlog.md` para confirmar con el usuario.

- **2026-10-12 — Qué NO se publica en el sitio del manual.** El sitio se sirve por Nginx y puede ser público, así que
  `docs/` solo contiene comportamiento funcional. Quedan fuera (solo en `notes/` y `docs-backlog.md`, repo privado):
  fallos de seguridad (p. ej. el backend solo exige JWT, no permisos por acción; token sin expiración; secretos en
  `deploy.sh`), cuentas/correos internos del proveedor, endpoints, tokens y detalles de despliegue. El "manual para
  desarrollo" se sirve desde `notes/inventory/` (detalle por pantalla con citas a código).

- **2026-10-12 — Memoria persistente del trabajo en `CLAUDE.md` + `notes/`** versionados en el repo
  (privado), a petición del usuario, para no depender del contexto de la conversación.

- **2026-10-13 — Fusionar con lo que ya existía; no rehacer desde cero (indicación del usuario).** El usuario ya tenía
  el manual (front Rspress con su portada, menú, estilos e imágenes) y el front/backend de ISPMAX listos. En las
  sesiones 1–4 se reconstruyó demasiado: se reemplazó la portada y el menú superior, se eliminó la página "Sistema",
  se perdieron 15 figuras al reescribir guías y un error de YAML dejó la portada como texto plano. Se corrigió así:
  portada y menú originales restaurados y los accesos por intención añadidos al lado; "Sistema" y su entrada de
  menú restaurados; las 15 figuras vuelven a sus guías; `docs-check` valida el YAML del frontmatter. Regla vigente
  (CLAUDE.md, regla 10): sumar, no reemplazar; preguntar antes de cambiar algo visual. El front y el backend de
  ISPMAX no se modifican: solo se ejecutan en la instancia aislada (dos parches mínimos en la copia extraída,
  ver `notes/entorno.md`).

- **2026-10-21 — Versión de referencia: el código de `~/Downloads/ispmax` (etiqueta `zip-2026-10-14`).** Decisión del
  usuario: sustituye al ZIP del 2026-10-06. Es idéntico al `HEAD` de los repos con historial
  `~/Repositorios/frontend-isp` (`afd79206`, 2026-10-14) y `~/Repositorios/backend-isp` (`7501da79`, 2026-10-13). Las
  versiones anteriores salen del mismo historial: los hashes de `docs/_trace.json` coinciden exactamente con FE
  `99b38a14` (2026-10-06 17:51) y BE `3057b787` (2026-10-06 12:49), de modo que **todo cambio es posterior al ZIP** (no
  hubo que adivinar el sentido leyendo el código). `git diff <commit> HEAD -- src/<ruta>` da el cambio real; cómo
  repetirlo está en `docs-maintenance.md` §3. Alternativa descartada: comparar solo por hash (`docs-stale` no dice qué
  cambió ni si el cambio afecta al texto).
- **2026-10-21 — `docs-stale` omite las rutas que `notes/exclusiones.md` cita entre comillas invertidas.**
  `/red/getIp` (ACC-034, RED-030) estaba excluida del manual desde la primera sesión pero seguía saliendo como "ruta sin
  documentar". Alternativa descartada: declararla en `rutas:` de alguna página (induciría a creer que está documentada).
- **2026-10-21 — Lo que `docs/` publica de la recuperación de contraseña y del límite de peticiones.** Sí: el flujo
  visible (enlace de 15 minutos, "¿Olvidaste tu correo?", bloqueo a los 5 intentos fallidos y su reactivación, el mensaje
  "Demasiadas peticiones, espere unos segundos…"). No: los umbrales de peticiones por minuto, el origen del correo
  (variables `MAIL_*`, `DOMINIO`) ni la lógica de claves en caché; quedan en `notes/producto.md`.

- **2026-10-21 — Texto original: las 39 secciones con posible pérdida (cobertura léxica < 80 %) se resolvieron una a
  una contra el código del 2026-10-14.** Criterio: encabezado de `git show 0720853:docs/guia/<guía>.mdx` sin
  equivalente exacto en la guía actual y menos del 80 % de sus palabras (≥ 4 letras) presentes en ella; da 86 sin
  encabezado igual y 39 bajo el umbral. Resultado: **26 recuperadas** (algunas corregidas), **4 parciales**, **7 ya
  cubiertas** (la sección existía renombrada) y **2 descartadas**. Los otros 47 encabezados son renombres aceptados.
  Se recupera solo lo que el código confirma; lo que el código contradice se descarta:

  | Guía › sección | Resultado | Motivo |
  |---|---|---|
  | adminolt › Secciones | recuperada | panel de la OLT, buscador, filtros, no autorizadas, LOW SIGNALS y pestañas ZONAS/NAPs/MAPS/PROFILES |
  | adminolt › Acciones sobre una ONU | parcial | recuperada como tabla "dónde se hace cada acción"; **descartado** "Habilitar/Deshabilitar Internet" (no hay interruptor aparte) y "credenciales en Ajustes → OLTs" (están en la pestaña API) |
  | clientes › Columnas de la tabla, Ordenamiento, Importar y exportar, Paginación | recuperadas | confirmadas en `useClientesIndex.js`, `IndexPage.vue`, `customers.service.ts` y `mikrotik.service.ts` |
  | clientes › Acciones sobre un cliente | recuperada | **descartado** que Retirar "devuelve el comodato": `retirarServicio` no toca equipos ni instalaciones (`customers.service.ts:2896-2989`) |
  | compras › Resultado | **descartada** | el original dice que guardar sube el stock y anular lo revierte; `buys.service.ts:24-52` no toca stock y el texto actual ya lo decía bien |
  | conciliacion › Pasos | ya cubierta | hoy "Conciliar un mes", con varios bancos |
  | cortes › Historial del proceso de cortes | **descartada** | `LogsCortes.vue` no se monta en ninguna pantalla (código muerto); queda solo el permiso en el catálogo |
  | dashboard › Tráfico Clientes, Mensajes que pueden aparecer, Filtros, Columnas, Acciones, Contadores del encabezado, Filtros y columnas | recuperadas | corregido: el "Pico" es el mayor promedio horario, no un máximo instantáneo |
  | equipos › Tipos de vinculación, Historial de uso | recuperadas | `VincularEquipo.vue`, `HistorialAccesorio.vue` |
  | equipos › Campos del formulario | ya cubierta | **descartado** que el formulario tenga *Estado* y *Tipo de vinculación* (`FormEquipo.vue:101-175`) |
  | equipos › Pestaña Accesorio | parcial | **descartado** "pestañas" (son dos tablas apiladas) y los ejemplos "tensores, grapas" (no están en el código) |
  | ingresos-egresos › Tipos de movimiento | recuperada (corregida) | el formulario solo ofrece Ingreso/Egreso; el servidor guarda "Recurrente" según el campo Recurrente |
  | ingresos-egresos › Campos del formulario | parcial | el resto de la diferencia léxica son renombres ya verificados |
  | instalaciones › Crear o editar una instalación | recuperada | botones y estados al editar |
  | instalaciones › Checklist | parcial | **descartado** "el técnico marca cada punto": lo marca cualquier usuario que vea la instalación |
  | instalaciones › Pre-asignación de recursos | ya cubierta | **descartado** "tipo de conexión" (no existe en la pantalla) |
  | instalaciones › Notificaciones automáticas por estado | ya cubierta | se añadieron los motivos literales de "no se pudo enviar" |
  | logs-plantillas › Variables, productos › Filtros y botones, transacciones › Botones y acciones | recuperadas | productos: el selector Sucursal no filtra el listado, solo la exportación |
  | mensajeria › Canal Cloud API | recuperada | estados de plantilla y botón de sincronización |
  | personal › Árbol de permisos | recuperada | `ListPermisos.vue` |
  | redes-ipv4 › Botones | ya cubierta | se añadió la fila *Router* |
  | redes-ipv4 › Migración de redes entre routers | recuperada (corregida) | mueve **todas** las redes del router (no se eligen) y **no** reconfigura a los clientes en el destino: solo cambia la BD, hay que Reparar |
  | redes-ipv6 › Columnas | recuperada | columna acciones, *(usadas de total)*, mensaje de error |
  | redes-ipv6 › Campos del formulario | ya cubierta | las 5 etiquetas coinciden con `FormRedIpv6.vue` |
  | registrar-pago › Meses adelantados con factura ya emitida, Verificación de duplicados | recuperadas (corregidas) | el aviso original ("Se eliminará una factura" / "Sí, eliminar y cobrar") es del modal del perfil; Registrar pago usa otro; el chequeo de duplicados ocurre al confirmar y el aviso no muestra el documento |
  | registrar-pago › Resultado | ya cubierta | hoy "Qué ocurre al guardar" |

## Registro de decisiones de la persona usuaria (2026-10-21 a 2026-10-30)

- **2026-10-21 — Siete decisiones del backlog** (detalle en `docs-backlog.md` §1): puerto API del router 8728; TikTok `@maat.ec`;
  dejar de publicar `/legacy/`; el código de referencia pasa a `zip-2026-10-14`; portada y menú se quedan; en las 8 guías con capturas duplicadas
  queda solo la anotada; se recuperan las 39 secciones originales con posible pérdida de texto. Motivo: regla de fusionar con lo existente.
- **2026-10-22 — El avance se informa como porcentaje** con el método de 7 ejes de `scripts/docs-progreso.mjs`. Motivo: poder comparar entre reportes.
  Alternativa descartada: estimarlo a ojo.
- **2026-10-23 — Reglas de trabajo** (ahora en `CLAUDE.md` § "Reglas de la persona usuaria"): solo documentar y capturar; regla de los 5 intentos con datos
  ficticios; sin hallazgos de seguridad (los apuntes que ya estaban en `notes/hallazgos.md` se dejan como están); no crear clientes por la pantalla;
  no quemar tokens; cifras siempre de herramienta. Motivo: se vio trabajo fuera de alcance, reintentos masivos al router falso y cifras mal contadas.
- **2026-10-23 — Se retira el manual HTML antiguo** (`index.html`, `manual.css`, `manual.js`, `html-to-mdx.mjs`, `verify-content.mjs`) y 72 imágenes sin uso
  (PR #6). Sigue en el historial de git. Se conservan `LegacyHashRedirect`, `legacy-routes.json` y `docs/sidebar.json`.
- **2026-10-25 — Páginas que dependen de un servicio externo se cierran como `verificado`** cuando el código y la pantalla con datos ficticios coinciden,
  con el bloque `:::info Servicio externo no probado` y `verificado.sin_probar: [...]`. Motivo: el servicio real no está disponible y la persona usuaria
  quiere terminar. Alternativa descartada: dejarlas `parcial` indefinidamente.
- **2026-10-25/26 — Los servicios externos no son un obstáculo para capturar:** se inyectan datos ficticios por SQL (hosts `*.invalid` o `127.0.0.1`) y
  respuestas simuladas de la API (`mock`); el pie de figura dice "datos de demostración". El borrado en bloque se ejecutó (dos veces) sobre filas
  ficticias propias, con copia de seguridad previa de la BD local. Siguen prohibidos: routers, WhatsApp, SRI y pasarelas reales.
- **2026-10-26 — Alcance cerrado: "solo actualizar el repo".** La imagen Docker no se publica desde aquí (la web la carga otra persona) y el eje de servicios
  externos reales queda fuera. La documentación se da por completa para clientes, técnicos y soporte; en adelante solo se mantiene al día.
- **2026-10-26 — Buscador propio del sitio** (`src/search/`): el de serie de Rspress solo halla frases literales y no lee `sinonimos`. Se mide con
  `scripts/eval-search.mjs`. Alternativa descartada: ampliar solo los sinónimos del frontmatter (no se indexan).
- **2026-10-26 — Docker y nginx conservan los puertos y la configuración de siempre** (la web la despliega otra persona; el repo es público solo
  temporalmente). Se revirtió el 404 real de nginx (PR #14): `try_files … /404.html` como antes. Lo único retirado frente a la migración a Rspress es `/legacy/`.
- **2026-10-26 — Flujo de Git:** una rama por tema (`docs/<tema>`), commit en español con la línea `Co-Authored-By`, PR contra `main` y **fusión con merge
  commit (no squash) solo cuando la persona usuaria lo pide**. No se borran ramas remotas sin su permiso.
- **2026-10-26 — Decisiones de publicación sin respuesta explícita** (la persona usuaria ordenó publicar sin pedir cambios): `referencia/mensajes-del-sistema`
  muestra archivo y línea del código; varias páginas advierten de fallos reales del producto. Si se quiere ocultar algo, es una decisión a tomar con ella.
- **2026-11-05 — No fusionar el PR 17 hasta que la nueva versión esté "perfecta"** (orden de la persona usuaria): el PR de la actualización a `main-2026-11-04` queda abierto con Auto-fix activo; falta la segunda tanda
  de capturas (las 96 páginas nuevas y ~28 figuras desactualizadas) y las capturas de consolas externas. Esas tareas se retoman después del mediodía del 2026-11-05. Fusionar solo con su orden explícita.
- **2026-11-05 — Capturas de consolas externas:** la persona usuaria las toma desde sus cuentas (Google 4, Meta 5, SmartOLT 3, AdminOLT 2) en `~/Downloads/capturas-externas/<servicio>/` (cada carpeta tiene `LISTA.txt`; reglas en
  `LEEME.txt`). Excepción a `docs-style-guide.md` §7 (capturas solo de la instancia): las de consolas ajenas se admiten con tokens, IDs y teléfonos tapados con recuadro negro; al incorporarlas hay que ajustar esa guía.
- **2026-11-05 — Firma electrónica del SRI:** es un archivo `.p12` (confirmado por la persona usuaria). El lado ISPMAX ya está en `guia/roles-empresa` (Cargar Certificado, Clave Certificado); los pasos de descarga del `.p12` dependen de la entidad certificadora, que no se ha indicado.
- **2026-11-05 — Servicios externos: solo se capturan las pantallas del servidor de correo.** La persona usuaria toma las capturas del tema correo (ISPMAX y consola de Google, en `~/Downloads/capturas-externas/{google,ispmax-correo}/`).
  Todo lo demás (Meta/WhatsApp oficial, SmartOLT, AdminOLT, PayPhone, dLocal Go, Dátil, Factus, OpenAI, firma `.p12`…) se redacta desde las **fuentes oficiales** y la **lógica de ISPMAX**, con un patrón muy didáctico
  (`docs-style-guide.md` §4, «Conseguir credenciales de un servicio externo»), porque los clientes se enredan: la meta es que el texto supere a una captura. Deja sin efecto la petición de capturas de Meta, SmartOLT y AdminOLT.
- **2026-11-05 — Fusión del PR 17 ordenada por la persona usuaria** (debía entregar el manual ese día): deja sin efecto «no fusionar hasta que esté perfecta». Se fusiona con merge commit. Quedan para la siguiente jornada, sin bloquear la entrega:
  las capturas del servidor de correo (`~/Downloads/capturas-externas/{google,ispmax-correo}/` estaba vacía al fusionar) y la segunda tanda de capturas de ISPMAX.
