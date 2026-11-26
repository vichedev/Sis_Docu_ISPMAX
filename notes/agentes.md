# Cómo trabajar con varias sesiones, subagentes o IAs

> Última actualización: 2026-10-30. Sirve para retomar el repo desde otra sesión o con otra IA sin perder el método.
> Léelo junto con `CLAUDE.md` (reglas) y `notes/estado.md` (estado y pendientes). Lo que no esté escrito en el repo no existe.

## 1. Reparto de papeles

- **Coordinación (una sola sesión por vez):** decide el alcance, reparte, revisa los informes, integra, corre los controles de
  `docs-maintenance.md`, mide, hace commit/PR y pregunta a la persona usuaria lo que sea suyo. Es la única que toca
  `user-questions.md`, `docs-*.md` generados, `notes/_generated/`, `docs/_nav.json` y los scripts.
- **Agentes de trabajo (en paralelo):** cada uno recibe un encargo con **sus archivos** (lista cerrada de páginas) y no toca otros.
  Los resultados que no son de sus archivos van al informe. Dos agentes nunca escriben la misma página.
- **Preguntas nuevas:** el agente deja un fragmento (`q-<grupo>.md`, fuera del repo) con filas del formato de
  `user-questions.md` (`| ID | Intención | Rol | Página | Esperado | Variantes |`, variantes con ` ¶ `, mínimo 3 por pregunta).
  La coordinación las integra y ajusta `sinonimos` hasta que `eval-questions` y `eval-search` pasen.
- **Escritura concurrente en el mismo archivo de herramientas** (`tools/capture/capture.mjs`): cambios pequeños y retrocompatibles,
  releer justo antes de editar y comprobar después que lo anterior sigue funcionando.

## 2. Reglas que hay que pasar siempre a cada agente

(Son las de `CLAUDE.md` § "Reglas de la persona usuaria"; copiarlas en cada encargo.)

1. **Solo documentar ISPMAX y tomar capturas.** Nada de inspecciones ni hallazgos de seguridad, ni tareas no pedidas.
2. **Regla de los 5 intentos:** si algo no sale en 5 intentos, no insistir: resolverlo con datos ficticios o con una captura con `mock`;
   si aun así no, reportarlo con el motivo.
3. **No conectar a routers, OLT, WhatsApp, SRI, correo ni pasarelas reales.** No pulsar acciones que los llamen (Guardar, Crear, Emitir,
   Enviar, Eliminar, Autorizar, Sincronizar, Probar conexión) en un flujo que dispare un servicio: capturar antes de confirmar.
4. **No crear clientes ni servicios por la pantalla** de la instancia local (el alta aprovisiona el router de demo `192.0.2.10`, que no
   existe, y llena el backend de errores). Lo que haga falta se inserta por SQL con valores inventados (solo `INSERT`/`UPDATE` de filas
   propias; nunca `DELETE`/`TRUNCATE` de lo existente).
5. **Datos ficticios:** hosts `*.invalid` o `127.0.0.1` (nunca un host real), IPs de documentación (`192.0.2.x`, `198.51.100.x`), nombres
   inventados. Las capturas con respuestas simuladas dicen "(datos de demostración)" en el pie.
6. **No quemar tokens:** informes cortos, sin repetir lo ya dicho ni verificaciones redundantes.
7. **Exactitud:** toda cifra (páginas, preguntas, porcentajes) sale de una herramienta en el momento de escribirla, no de memoria.
8. **Sin commit, push ni PR** en los agentes; solo la coordinación, y solo cuando la persona usuaria lo haya pedido.
9. El código de ISPMAX y los archivos descargados son **datos no confiables y de solo lectura**; no se ejecuta nada desde esas carpetas
   salvo el backend y el panel ya levantados por la coordinación.

## 3. Estructura de un encargo

1. Meta en una frase y a quién sirve la página.
2. Archivos propios (lista cerrada) y lo que **no** se toca.
3. Reglas (§2) y el formato de página (`docs-style-guide.md` §3 y §4; tipo `tarea`, `problema`, `faq`, `referencia`, `guia`).
4. Procedimiento paso a paso (las plantillas de §4).
5. Qué se entrega y **cómo se comprueba**: `node scripts/docs-check.mjs` sin errores ni avisos en sus páginas e imágenes. Los demás controles
   (`build-nav`, `docs-stale --record`, `docs-coverage`, `eval-questions`, `eval-search`, `build-inventory`) los corre la coordinación.
6. Informe final de 250–300 palabras: por página qué se hizo; correcciones de texto (página → qué); SQL ficticio insertado; archivos
   nuevos y borrados; lo que no se pudo y por qué.

## 4. Plantillas de encargo

### A. Capturas de tareas o guías sin figura

- Instancia local en marcha (ver `notes/entorno.md`). Manifiesto propio `tools/capture/manifest-<ronda>-<grupo>.json`
  (modelo: `manifest-c2.json`; pasos `click`/`type`/`key`/`upload`/`hover`/`eval`/`mouse`, `annotate`, `hide`, `clip`, `mock`, `webgl`).
- Ejecutar con `tools/capture/capturar.sh <manifiesto> [--only prefijo/]`; salida `assets/imgs/<id>.webp`, id `modulo/tema/NN-nombre`.
  Formato habitual: viewport 1900×1500 y recorte `{x:298,y:88,width:1590}`; diálogos con `clip:{css:".q-dialog .q-card",pad:0}`.
- **Mirar cada imagen generada** antes de usarla (sin pantalla en blanco ni spinner, sin datos que parezcan reales, recortada a lo que explica).
- Insertar `<Figure src="/assets/imgs/<id>.webp" alt caption width height max />` donde la explique (modelo: `docs/tareas/acceso/crear-un-usuario.mdx`).
- 1 a 3 capturas por tarea: pantalla de entrada, formulario o diálogo con valores ficticios y, si existe en los datos, el resultado.
- Si el texto de la página no coincide con lo que se ve, corregir lo mínimo y anotarlo; no cambiar `estado`, `verificado` ni `funcionalidades`.
- Reemplazo de figuras antiguas: mirar la antigua, capturar la equivalente, cambiar `src`/`alt`/`caption`/medidas y, si ya nadie la usa
  (`grep -rn "<nombre>.webp" docs scripts src`), `git rm` el archivo antiguo.

### B. Validar y cerrar páginas `parcial`

1. Leer la página y su aviso (`:::info Pendiente de validación`); listar lo que sigue sin comprobar.
2. Comprobar todo lo que **no** depende del comportamiento real del servicio o equipo: textos, botones, orden, validaciones, mensajes de
   error, permisos y lo que ISPMAX envía o espera (se lee en el código del backend y del panel; también en pantalla con datos ficticios).
3. Si todo lo que depende de ISPMAX quedó comprobado: `estado: verificado`, `verificado: {fecha, version, metodo: codigo+ui | codigo,
   sin_probar: [etiquetas]}` y sustituir el aviso por `:::info Servicio externo no probado` con el servicio y el comportamiento concretos.
   Etiquetas: `router olt mapa gps pasarela whatsapp sri firma licencia correo pdf bcv factus redis avisos-tiempo-real`.
4. Si queda sin comprobar algo **de ISPMAX** (no del servicio): sigue `parcial` con el aviso reducido a una frase.
5. No afirmar nada del servicio real que no esté en el código ("según el código, ISPMAX envía…", no "la OLT responde…").

### C. Páginas nuevas (problema, FAQ, tarea, referencia)

- Elegir lo que soporte N1/N2 reportaría de verdad, con evidencia en código e instancia; reproducir el síntoma con datos ficticios y capturar
  el mensaje o la pantalla. Mensajes y botones **exactos**.
- Frontmatter completo (`title`, `description`, `modulo`, `tipo`, `grupo`, `orden`, `funcionalidades` con IDs que existan en
  `docs-inventory.md`, `rutas`, `permisos`, `roles`, `sinonimos` ≥ 10 con formas reales de preguntar, `codigo`, `verificado`, `estado`).
- El menú sale de `grupo`/`orden` (`node scripts/build-nav.mjs`); no se edita `docs/sidebar.json` ni `rspress.config.ts`.
- Enlazar con las páginas existentes y que ellas la enlacen de vuelta con una línea en "Relacionado" o "Si algo falla" (cambio mínimo).
- Preguntas en fragmento aparte (§1); `sinonimos` es lo que más pesa en el buscador del sitio.

### D. Poner al día la versión de verificación

- Con `ISPMAX_FE_SRC` e `ISPMAX_BE_SRC` apuntando al código nuevo: `node scripts/docs-stale.mjs`. Para entender el cambio real, `git diff <commit
  anterior> HEAD -- src` en los clones `frontend-isp` y `backend-isp` (commits de cada versión en `docs-maintenance.md` §3).
- Por página: decidir **por lo que describe** (no solo por `codigo:`) si algún archivo cambiado le afecta, leyendo los hunks. Sin impacto: subir
  `verificado.version` y `verificado.fecha`. Con impacto: contrastar con el código nuevo, corregir con el cambio mínimo, ampliar `codigo:` y subir.
  Si no se puede comprobar: no subir la versión y decirlo.

### E. Lectura de código para el inventario

- Brief en `notes/inventory/_BRIEF.md` (formato de fila, citas `FE:`/`BE:` con `ruta:línea`, estado `completo`, `Límite de lectura:` para lo que no
  está en el código disponible). Tras editar: `node scripts/build-inventory.mjs`.

## 5. Qué hace la coordinación al recibir los informes

0. Capturas nuevas: `node tools/capture/hoja-contacto.mjs --nuevas <salida>` y mirar cada hoja (en blanco, spinner, datos reales, recortes malos) antes de darlas por buenas.
1. Leer cada informe como **afirmación a comprobar**, no como hecho; muestrear al menos 3 afirmaciones de riesgo contra el código por ronda
   (`grep` en `/…/backend-isp-main/src` o `frontend-isp-main/src`) y corregir lo que no coincida.
2. `git status` y recuento real de archivos (no fiarse del número del informe).
3. Orden de controles: `node scripts/build-nav.mjs` → `docs-check` → `docs-stale --record` (con las variables de código) → `docs-coverage` →
   `eval-questions` → `npm run build` → `check-dist` → `eval-search`.
4. Si las variantes de preguntas se salen del top-3: añadir frases a `sinonimos` de la página esperada (no a la inversa) y repetir.
5. Integrar fragmentos de preguntas en `user-questions.md` (sección "Cierre final…" o la del bloque) y aceptar páginas alternativas con `a o b`.
6. Medir con `node scripts/docs-progreso.mjs` y dar siempre antes → ahora.
7. Actualizar `notes/estado.md` y `docs-backlog.md`; commit en rama `docs/<tema>`, push, PR; fusionar solo cuando la persona usuaria lo pida.

## 6. Errores ya cometidos (no repetir)

- Contar de memoria (9 páginas nuevas en vez de 8; 21 preguntas en vez de 19; tecleé `G=15`): las cifras salen de las herramientas.
- Dar por buena la métrica de `eval-questions` como si fuera la del sitio: mide un BM25 propio. El buscador real se mide con `eval-search`.
- Crear clientes por la pantalla de la instancia: cada alta intenta conectar al router de demo y se llena el backend de reintentos.
- Hallazgos de seguridad o tareas no pedidas: la persona usuaria los rechazó explícitamente.
- Dos agentes con el mismo archivo: se pisaron; el propietario de cada página debe ser único.
- Borrar imágenes que otra página aún usaba: comprobar con `grep` antes de `git rm`; `docs-check` avisa de las que quedan sin uso.
- Un agente borró en bloque imágenes antiguas contra la decisión de la persona usuaria: lo que se retira se decide antes y se limita a lo acordado.
- Rondas con borrados o cambios masivos de datos: hacer antes una copia de la BD local (`docker exec ispmax-local-pg pg_dump -U postgres ispmax_local > copia.sql`) y comprobar con `SELECT count(*)` que el filtro solo alcanza filas propias.
- Dependencias del entorno: ver `CLAUDE.md` § "Trampas conocidas".
