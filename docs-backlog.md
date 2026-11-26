# Backlog del manual

Todo lo que **no** se pudo verificar, terminar o decidir. Ordenado por impacto. Los ❓ de cada dominio están en su
inventario (`notes/inventory/<dominio>.md`, sección "Pendiente de validar en UI").

## 0. Pendientes vigentes (2026-11-05): empezar aquí

**PR 17 fusionado en `main` el 2026-11-05 por orden de la persona usuaria (entrega del mismo día). Capturas y pendientes siguen el 2026-11-06.**

Estado: manual puesto al día con `main-2026-11-04` (279 páginas, todas `verificado`; `docs-check`, `docs-stale`, `check-dist` limpios; cobertura 580/580). 
Detalle de la sesión en `notes/estado.md`.

| # | Pendiente | De quién | Notas |
|---|---|---|---|
| 1 | **Segunda tanda de capturas.** Las pantallas nuevas de ISPMAX no tienen figuras (tareas sin captura 55 de 120, guías sin capturas 18, problemas sin captura 38 de 57; las guías de servicios externos no llevarán capturas por decisión) y ~28 figuras existentes muestran pantallas que cambiaron: `acceso/inicio-sesion/01-login` (ya recapturada), `acceso/recuperar/01-05`, `ajustes/personal/01-listado`, `ajustes/empresa/01-ficha`, `ajustes/panel/02-accesos`, `ajustes/licencia/01-circulo`, `ajustes/mensajeria/01-whatsapp-y-correo` y `02-configuracion`, `ajustes/plantillas/01-02-recordatorio-de-pago`, `mensajeria/plantillas/01-promesa-de-pago`, `facturacion/sucursales/02-formulario`, `facturacion/facturas/01-listado` y `02-agregar`, `facturacion/factura-libre/01-formulario`, `finanzas/ingresos-egresos/01-panel`, `inicio/primeros-pasos/02-menu-lateral`, `monitoreo/03-alertas`, `05-alertas-sin-destinos`, `06-prueba-con-errores`, `mapa/03-mapa-general`, `clientes/listado/01-listado`, `clientes/retirar/01-listado-iconos`, `clientes/reactivar/01-listado-activar`, `soporte/tickets/01-listado`, `soporte/instalaciones/02-formulario`, `almacen/compras/01-formulario` y `02-listado`, `almacen/proveedores/02-formulario` | Cualquier sesión | La instancia local ya corre el código nuevo (143 migraciones, administrador con 333 permisos; receta en `notes/entorno.md`). Casi todas se regeneran con `tools/capture/capturar.sh <manifiesto> --only <prefijo>` (el manifiesto sale de `grep -l '"<id>' tools/capture/manifest*.json`). Las pantallas nuevas necesitan manifiestos nuevos, datos por SQL y `mock` para servicios externos |
| 2 | **Servicios externos (hecho el 2026-11-05, sin capturas):** 15 guías didácticas en `docs/tareas/ajustes/` (correo con Gmail y con otro proveedor, Meta, Dualhook, coexistencia o número dedicado, OpenAI, PayPhone, dLocal Go, elegir pasarela, SmartOLT, AdminOLT, MikroTik, firma `.p12`, Dátil, Factus). **Falta:** que la persona usuaria tome las capturas del servidor de correo (`~/Downloads/capturas-externas/{google,ispmax-correo}/`, listas en cada carpeta) y insertarlas como `<Figure>` en `configurar-el-correo-con-gmail` y su problema; contrastar los pasos de Google con su prueba real; y lo que las fuentes oficiales no confirmaron (lista en las páginas y en los informes: pantalla de contraseñas de aplicación, espacios en el código, errores 535/534, creación de la API key de SmartOLT, token de AdminOLT, paso de pruebas a producción de PayPhone, pantallas de Dualhook, fichas del SRI). Entidad certificadora del `.p12` sin indicar | Persona usuaria + cualquier sesión | Patrón en `docs-style-guide.md` §4; tabla de servicios en `notes/servicios-externos.md` |
| 3 | Probar con una cuenta real los pasos "fuera de ISPMAX" de Gmail, Meta, PayPhone y dLocal Go (se redactaron desde la ayuda oficial) y, con instalación real, lo marcado `sin_probar` (175 páginas; etiquetas: router, whatsapp, correo, olt, sri, pasarela, firma, pdf, mapa, factus, licencia, bcv, avisos-tiempo-real, redis, gps, `ia`). El servicio del bot de WhatsApp (`api-whats-app`) no está en el código disponible | Cuando exista la instalación | Al probar, retirar la etiqueta y el aviso |
| 4 | Publicar `referencia/mensajes-del-sistema` con archivo y línea del código (única página que lo muestra) y las advertencias de fallos reales del producto que traen varias páginas | Persona usuaria | Sin respuesta explícita; hoy se publica tal cual. Para ocultar el archivo y la línea: quitar esa columna en `scripts/gen-mensajes.mjs` y regenerar |
| 5 | `robots.txt`, `sitemap.xml` (necesita el dominio público) y HTTPS/HSTS | Quien despliega la web | No cambiar `Dockerfile`, `docker-compose.yml` ni `nginx.conf` sin que lo pida la persona usuaria |
| 6 | Mantener al día cuando ISPMAX saque cambios (`docs-stale`, `docs-maintenance.md` §3). Versión documentada: BE `f0d1ebf7`, FE `e7d5d06b`. La rama `mejora-mapa` (ambos repos) no está en `main`: documentarla cuando llegue | Cualquier sesión | `git fetch origin && git log --oneline HEAD..origin/main` en `~/Repositorios/{backend,frontend}-isp` |
| 7 | Borrar las ramas remotas `docs/*` ya fusionadas (buscador-y-publicacion, capturas-de-tareas, capturas-factus-bcv, cierre-de-parciales, cierre-final, cierre-portabilidad, guias-y-validacion, mantenimiento-final, repo-portable, restaura-nginx) | Persona usuaria (permiso) | `git push origin --delete <rama>` |
| 8 | Deudas menores: BOT-033 (pestaña Endpoints del bot, solo visible para una cuenta fija: no documentada campo por campo); `guia/rutinas` podría sumar las solicitudes pendientes del portal; 19 variantes del banco fuera del top-3 del buscador del sitio (compiten páginas parecidas: bot/bandeja/mensajería); `exx.png` en `guia/plantilla` | Opcional | |
| 9 | Fuera de alcance por decisión: publicar la imagen Docker y el eje E del avance | — | La web la carga otra persona |

Datos que **no** viajan con el repo: la instancia local (volumen Docker `ispmax-local-pgdata`, `.env` y `node_modules` de `~/Downloads/ispmax/*`), `~/Downloads/ispmax/ACCESO-LOCAL.txt`, los clones del producto
y la memoria de la IA anterior. Cómo recrearlos: `notes/entorno.md`. Cómo delegar: `notes/agentes.md`.

## 1. Decisiones del usuario (resueltas el 2026-10-21)

| Tema | Decisión | Estado |
|---|---|---|
| Puerto API del router | Se mantiene **8728** (`FormRouter.vue:369`, `useRouter.js:107`); el manual aclara que se puede indicar otro. | Sin cambios: ya estaba documentado. |
| Enlace de TikTok | `https://www.tiktok.com/@maat.ec`. El enlace de Instagram se queda como está. | Aplicado en `rspress.config.ts`. |
| Versión HTML antigua | Deja de publicarse en `/legacy/` y se retira del repositorio el 2026-10-23: `index.html`, `manual.css`, `manual.js`, `scripts/html-to-mdx.mjs`, `scripts/verify-content.mjs` y la dependencia `node-html-parser`. `LegacyHashRedirect` y `legacy-routes.json` se conservan: redirigen los enlaces guardados con el formato antiguo. | Retirado. |
| Publicación del sitio | Si el sitio es público, no debe incluir `notes/` ni hallazgos de seguridad (ya fuera de `docs/`). | Cumplido. |
| Versión de referencia | Se adopta el código de `Downloads/ispmax` (backend 13/10, frontend 14/10) en lugar de `zip-2026-10-06`. Al comparar hashes, 22 archivos citados cambiaron y 48 páginas están por re-verificar; hay 5 rutas sin documentar. Etiqueta sugerida: `zip-2026-10-14`. | Hecho (2026-10-21 a 2026-10-26): las 172 páginas están en `zip-2026-10-14`; `docs-stale` da 0 sospechas. |
| Portada y menú fusionados | Se quedan como están, con los accesos por intención. | Cerrado. |
| Capturas duplicadas del listado | Solo la captura anotada en las 8 guías (clientes, dashboard, instalaciones, planes, redes IPv4, registrar pago, routers, tickets). | Figura original retirada de las páginas. Las imágenes sin uso se retiraron del repositorio el 2026-10-23. |
| Secciones originales renombradas o condensadas | Se recuperan las 39 con posible pérdida (cobertura léxica < 80 %), verificadas contra el código nuevo; los 47 renombres se aceptan. | Hecho (2026-10-21): ver `notes/decisiones.md` y `notes/fusion-con-original.md`. |

## 2. Contenido pendiente (sin escribir o sin verificar)

Estado al 2026-10-23 (cifras de `docs-check`, `docs-coverage`, `eval-questions` y del frontmatter): 148 páginas de contenido,
**75 `verificado` y 73 `parcial`**; 39 con `metodo: codigo+ui` (las demás, `codigo`); cobertura 403/403; banco de preguntas 421/421
variantes en el top‑3; 76 figuras de la instancia ficticia (subcarpetas) frente a 49 antiguas (nombre plano).

**Cerrado en la ronda del 2026-10-23 (validación en pantalla con la instancia local y datos ficticios)**
- Pasan a `verificado` con `codigo+ui`: `guia/inicio`, `guia/sistema`, `guia/compras`, `tareas/acceso/cambiar-el-rol-los-routers-o-las-sucursales-de-un-usuario`,
  `tareas/acceso/limitar-el-horario-de-un-usuario`, `tareas/almacen/registrar-una-compra`, `problemas/almacen/la-compra-no-sube-el-stock`,
  `preguntas/administracion-y-sistema`.
- Pasan a `codigo+ui` y siguen `parcial` (por lo que depende de servicios externos o de acciones que llaman al router): `guia/registrar-pago`, `guia/estados`,
  `guia/saldos-cargos`, `guia/primeros-pasos`, `guia/notificaciones`, `guia/roles-empresa`, `tareas/acceso/desactivar-o-eliminar-a-un-usuario`,
  `tareas/acceso/recuperar-el-acceso`, `problemas/acceso/cuenta-inactivada-por-intentos-fallidos`, `tareas/clientes/registrar-un-cargo-recurrente`, `tareas/clientes/facturar-a-nombre-de-un-tercero`,
  `problemas/cobranza/el-cliente-pago-y-sigue-pendiente`, `preguntas/cobranza-y-facturacion`, `guia/clientes`, `guia/detalle-cliente`,
  `referencia/campos-del-cliente`, `tareas/clientes/adjuntar-contrato-de-adhesion`, `guia/plantilla`, `guia/productos`,
  `tareas/soporte/programar-y-completar-una-instalacion`, `tareas/soporte/sacar-los-reportes-de-soporte`,
  `referencia/ajustes-y-valores-por-defecto`, `referencia/mensajes-del-sistema` (41 mensajes del servidor y 7 avisos de pantalla reproducidos),
  `referencia/pais-moneda-e-impuestos`, `referencia/variables-de-plantillas`, `guia/facturacion-automatica`.
- Capturas sustituidas por otras de la instancia ficticia: 45 figuras antiguas en 27 guías (15 de red, ajustes y acceso; 12 de finanzas, almacén y clientes),
  con 44 capturas nuevas generadas por `tools/capture` (`manifest-c1.json`, `manifest-c2.json`); `guia/nap` pierde sus dos figuras antiguas a favor de las nuevas.
- `tools/capture` funciona en macOS (Brave), admite `--manifest` y `{{EXP15}}`; `tools/instance/seed-permisos.mjs`.

**No se pudo reproducir (queda como pendiente de validación en las páginas)**
- Todo lo que llama a un router, OLT, WhatsApp, SRI, SMTP o pasarela: alta, suspensión, reactivación, reparar router, importación y borrado en bloque de clientes,
  completar una instalación (crea el servicio), cobro con pasarela, firma electrónica, envío real del correo de recuperación, Tasa BCV y Factus (otros países).
- Selector de sucursal al cobrar (con una segunda sucursal sembrada por SQL no apareció); grupo de facturación (necesita un cliente con dos servicios);
  límite de 25 días de las promesas de pago; PDF de los reportes de soporte (el de tickets dio *Error al descargar el reporte*, el de instalaciones no descargó);
  que una venta no descuente stock (solo código).
- Licencia (`guia/licencia` y su tarea): solo se vio con respuestas simuladas; siguen con `metodo: codigo`.

**Hallazgos de la ronda que cambian lo que la pantalla ofrece (ya reflejados en el texto)**
- Importar Excel de productos abre un cuadro vacío y **Exportar Plantilla** devuelve 404; ALM-005 debe decir "no funciona en zip-2026-10-14" en el inventario.
- La columna "Fact. Automática" siempre muestra "No"; el filtro "repetitivo" de tickets solo aparece en el Excel; la plantilla de importación pone `_` en el nombre de la caja y la importación lo lee como espacio (código, no reproducido).
- Registrar pago no limita la lista a 5 facturas; con recibo, Anular y Editar pago salen también tras un abono parcial; la ventana de pago del perfil guarda sin confirmar.

**Cuarto bloque de tareas: hecho** (8 páginas, 2026-10-23): configurar la facturación automática; activarla para un grupo; facturar a un tercero todo un grupo; cobrar un grupo; cambios masivos de facturación; ubicaciones; Factus (Colombia) y Tasa BCV (Venezuela). Quedan por validar en pantalla (`estado: parcial`): facturación automática, automática del grupo, cambios masivos y Tasa BCV. **Para validar con una instalación real**: Factus con grupos (el comprobante podría cubrir solo la primera orden), el servicio detrás de `API_BCV`, y el mensaje que ve la persona cuando un cambio masivo de día de pago falla en un mes sin ese día. **Sin tarea todavía**: ninguna de la lista anterior. `rutinas` es una lista de revisiones recomendadas, no una función del producto: se queda como guía.

**Páginas con servicio externo no probado (2026-10-25):** 49 de las 50 páginas `parcial` pasaron a `verificado` con el aviso `Servicio externo no probado` y el campo `verificado.sin_probar` (etiquetas: whatsapp, router, correo, sri, olt, pasarela, firma, pdf, factus, mapa, licencia, bcv, avisos-tiempo-real, redis, gps). Cuando haya una instalación con ese servicio, `grep -rl "sin_probar:" docs` lista lo que hay que probar. Sigue `parcial` `tareas/ajustes/eliminar-clientes-en-bloque`: el borrado no se ejecutó (es irreversible); el mensaje de éxito, el registro en Logs y que los clientes dejen de listarse salen solo del código.

**Cierre final (2026-10-26):** las 172 páginas de contenido están `verificado` (0 `parcial`). Se cerró `tareas/ajustes/eliminar-clientes-en-bloque` ejecutando el borrado sobre datos ficticios propios; resultado: con filtros no se marca al cliente como borrado (ver la tarea). Los inventarios quedaron completos (0 filas `parcial`; los límites de lectura que quedan, como gateways, pasarelas, Factus o LibreOffice, están anotados como `Límite de lectura:` en cada sección). La referencia de mensajes del sistema pasó a 1656 textos. Páginas nuevas: 6 problemas de ajustes y servicios, 3 problemas de infraestructura, 3 tareas de `general`, 3 FAQ (mensajería, soporte, OLT) y `referencia/estados-y-colores`. Las capturas con servicios externos (OLT, mapa, routers, pasarelas, firma) se hicieron con respuestas simuladas de la API y datos ficticios por SQL (`tools/capture/fixtures/`, `manifest-c7-*.json`) y lo dicen en el pie de figura. Se tocaron 67 páginas existentes (figuras nuevas, enlaces a las páginas nuevas y las correcciones de las discrepancias con el código que halló la lectura del inventario). Sin captura: `plantilla` conserva `exx.png` (una captura de Excel, no de ISPMAX). Fuera de lo medido: la imagen Docker sigue sin publicarse.

**Capturas pendientes**
- Siguen con captura antigua: `login.webp` (sin "¿Olvidaste tu contraseña?"), `pasarelas-pago.webp` (servicio de pagos), `mapa-general.webp` y las tres de `guia/mapa` (Mapbox),
  `routers-monitoreo` y `routers-graficos` (necesitan el router), `smartolt` y `adminolt` (OLT), y los recortes pequeños de botones e iconos. Quedan 14 figuras antiguas en 6 páginas (2026-10-25: `adminolt` 2, `mapa` 3, `pasarelas-pago` 1, `smartolt` 3, `routers` 2 —monitoreo y gráficos— y `plantilla` 1 —captura de Excel, no de ISPMAX—); las demás se sustituyeron por capturas de la instancia ficticia.
- Tareas con captura (2026-10-25): 45 de las 48 que no tenían ninguna, con 73 capturas nuevas (`manifest-c3-*.json`). Sigue sin captura de pantalla: enviar un contrato a firmar (no hay proveedor de firma). Factus y Tasa BCV se capturaron después con el panel reiniciado con `VITE_PAIS=CO` y `VITE_PAIS=VE` (solo interfaz; `manifest-c6-factus-bcv.json`); para repetirlas hay que reiniciar el panel así y volver a dejarlo con el país por defecto (EC). Con datos de OLT vacíos o sin servicio: autorizar una ONU (formulario sin datos de OLT), vincular una ONU (reutiliza `smartolt-onus`), cobrar con enlace de pago (reutiliza `pasarelas-pago`), dibujar la red en el mapa (el mapa no carga: solo la barra de edición). Las dos figuras de licencia se tomaron con respuestas simuladas de la API (opción `mock` de `capture.mjs`).
- Las 72 imágenes sin uso (antiguas ya sustituidas y capturas de prueba) se retiraron del repositorio el 2026-10-23; siguen en el historial de git.
- Las capturas de Transacciones y Pagos registrados muestran solo el día de la captura (cobros sembrados del 2026-10-23); no se reproducen otro día sin resembrar.

**Texto por completar con lo que muestran las capturas nuevas: hecho** (2026-10-25): `guia/cortes` (Facturación Automática y Pagos automáticos), `guia/facturacion-ajustes` (Generar facturas ahora) y `guia/logs-plantillas` (Formato de Ticket). `scripts/gen-mensajes.mjs` suma siete textos de campo (`EXTRAS`); en el código quedan unos 70 textos de campo más sin listar (p. ej. `Debes subir un archivo excel`), una línea cada uno.

**Pendientes de la actualización a `zip-2026-10-14` (2026-10-21) que siguen abiertos**
- Efecto de migrar un router sobre `caja_principal_id`: confirmado en el código (2026-10-25) y documentado en `guia/routers` y `tareas/red/migrar-clientes-a-otro-router`; una principal que ningún servicio migrado usa queda en el router de origen.
- Mapa con cajas enlazadas (líneas violeta, ★, "Clientes sin caja NAP"): depende de Mapbox.
- Páginas con la verificación `zip-2026-10-06` (48): citan archivos idénticos en el código nuevo (`docs-stale` no avisa) pero nadie las releyó.
- `docs-stale` solo vigila los archivos citados en `codigo:`: un cambio en un archivo sin citar no avisa. Antes de cada `--record` conviene un `git diff --stat` completo entre commits (`docs-maintenance.md` §3).

**Guías por pantalla heredadas aún `parcial`** (sin validar en pantalla o con servicios externos): `adminolt`, `carga`, `cobros-pasarela`, `faq`, `firma-electronica`, `glosario`, `licencia`,
`mapa`, `plantilla-documento`, `rutinas`, `smartolt`, `ubicacion-tecnicos`, además de las que arriba siguen `parcial` con `codigo+ui` (36 páginas con fecha 2026-10-23: 8 `verificado`, 28 `parcial`).
`faq` y `glosario` no se apoyan en código por diseño; `rutinas` es una lista de revisiones recomendadas, no una función del producto.

**Tareas del tercer bloque y del lote anterior:** hechas (17 + 10 tareas); quedan `parcial` las que dependen de router/OLT/WhatsApp (mapa y KMZ, migración de router, traslado de red,
vincular y autorizar ONU, reinicio de ONU, mensajes masivos, plantillas, firma, conciliación con IA, cobrar con enlace de pago, eliminar clientes en bloque, importar clientes por Excel).
**Aún sin tarea propia:** ninguna de las listadas antes; las 8 se escribieron el 2026-10-23.

**Referencia:** hecho todo lo pendiente (mensajes del sistema, campos del cliente, ajustes y valores por defecto, estados, variables de plantillas, país y moneda, API de registro de pagos).

## 3. Verificación en la UI real pendiente

La instancia aislada (sin routers, OLT, WhatsApp, SRI ni pasarelas) permitió verificar pantallas, formularios y
etiquetas, pero **no** los flujos con servicios externos. Pendiente validar en un entorno de pruebas completo:

- Provisión real en MikroTik (colas, listas, PPPoE) al crear/suspender/reparar; efecto en el router anterior al
  cambiar un servicio de router.
- Autorización de ONU, señal, reinicios y cortes por ONU (SmartOLT y AdminOLT).
- Emisión, reenvío y anulación de comprobantes con el SRI; mensajes literales de estado.
- WhatsApp oficial (aprobación de plantillas) y no oficial (QR); envío de recibos y recordatorios.
- Pasarelas de pago (PayPhone, dLocal Go) y asiento automático del abono.
- Conciliación bancaria con IA (formato del PDF).
- Duración real de la inactividad de sesión (`v-idle`) y zona horaria efectiva del servidor.
- Flujos con datos reales en volumen (importación Excel, reparación de routers con miles de clientes).

**Siguiente paso técnico recomendado:** un servidor RouterOS simulado en `127.0.0.1:8728` y un gateway de WhatsApp
falso para ejecutar los flujos completos en la instancia de capturas.

## 4. Inventarios

Completos desde 2026-10-26: las 418 funcionalidades tienen lectura completa (`docs-inventory.md`, columna Parciales en 0). Lo que no está en el código del ZIP (gateways de firma y WhatsApp, microservicio de facturación, pasarelas, Factus, LibreOffice, servicio Android de la jornada, catálogos de SmartOLT/AdminOLT) queda anotado como `Límite de lectura:` en `notes/inventory/*.md`.
