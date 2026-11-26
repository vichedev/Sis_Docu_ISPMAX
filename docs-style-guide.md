# Guía de estilo del manual ISPMAX

Normas para que cualquier persona (o IA) que escriba o edite una página produzca algo consistente,
verificable y útil. Si una página no ayuda a **hacer algo, entender algo o resolver algo**, no debe existir.

## 1. Principios

1. **Verificado o marcado.** Solo se documenta lo que se comprobó en el código y/o en la interfaz real.
   Lo no comprobado lleva el aviso `Pendiente de validación` y una entrada en `docs-backlog.md`.
2. **Una página, una intención.** Tarea, pantalla, concepto, problema o referencia: nunca mezclados.
3. **El texto manda; la captura acompaña.** Si se explica bien con palabras, no se añade imagen.
4. **Lenguaje del usuario.** Se escribe como lo diría quien opera el sistema, y las variantes cotidianas
   viven en `sinonimos` y en las preguntas frecuentes, no en párrafos de relleno.
5. **Textos de interfaz literales.** Botones, pestañas y campos se escriben tal como aparecen en pantalla,
   en **negrita** (p. ej. **Nuevo cliente**). Si el texto de la UI tiene errores, se respeta y no se corrige.
6. **Sin tiempo relativo.** No usar "nuevo", "actualmente", "recientemente", "próximamente". Si algo depende de
   una versión, se indica la versión o la fecha de verificación.
7. **Sin marketing ni relleno.** Nada de "potente", "intuitivo", "completo". Sin introducciones de más de dos frases.

## 2. Tipos de página y dónde viven

| Tipo | Carpeta | Responde a | Longitud orientativa |
|---|---|---|---|
| **Tarea** ("Quiero hacer…") | `docs/tareas/` | ¿Cómo hago X? | 150–400 palabras, pasos numerados |
| **Guía de pantalla** | `docs/guia/` | ¿Qué hay en esta pantalla y qué hace cada cosa? | 300–1200 palabras |
| **Problema** | `docs/problemas/` | Me pasa X, ¿qué hago? | 200–500 palabras |
| **Preguntas frecuentes** | `docs/preguntas/` | Pregunta concreta, respuesta corta + enlace | respuesta ≤ 80 palabras |
| **Referencia** | `docs/referencia/` | ¿Qué significa/valores/permiso/variable exacta? | tablas |
| **Concepto** | `docs/conceptos/` | ¿Qué es X y cómo se relaciona con Y? | 150–400 palabras |

Las URL `/guia/<slug>` existentes se conservan (marcadores y enlaces de terceros).

## 3. Metadatos de cada página (frontmatter)

```yaml
---
title: "Registrar un pago"                 # obligatorio; nombre de la tarea/pantalla, sin ":" explicativo
description: "Cobra una factura…"          # obligatorio; 1 frase, lo que se logra
modulo: finanzas                           # obligatorio; ver docs-inventory.md (clave de módulo)
tipo: tarea                                # tarea | guia | problema | faq | referencia | concepto
funcionalidades: [COB-001, COB-002]        # IDs del inventario que esta página cubre
rutas: ["/registrar-pago"]                 # rutas de UI que describe (sin #)
permisos: ["registrar.pago"]               # claves de permiso necesarias
roles: [cobranzas, administrador]          # quién la usa
sinonimos: ["cobrar", "abonar", "caja"]    # términos de búsqueda alternativos
codigo:                                    # archivos que respaldan lo escrito (FE:/BE: relativos a src/)
  - FE:pages/dashboard/registrar-pago/TabsIndex.vue
  - BE:pagos/pagos.service.ts
verificado:                                # trazabilidad
  fecha: 2026-10-12
  version: zip-2026-10-06                  # o commit/tag cuando exista
  metodo: codigo+ui                        # codigo | ui | codigo+ui | pendiente
  sin_probar: [olt]                        # opcional: servicios externos no probados (router, olt, mapa, gps, pasarela, whatsapp, sri, firma, licencia, correo, pdf, bcv, factus, redis, avisos-tiempo-real)
estado: verificado                         # verificado | parcial | pendiente
---
```

`scripts/docs-check.mjs` rechaza páginas sin `title`, `description`, `modulo`, `tipo` y `verificado`.

## 4. Estructura por tipo

### Tarea
```
# <Verbo en infinitivo> + objeto            (Crear un cliente · Suspender un servicio)
<Lead>Una frase: qué se logra y cuándo se usa.</Lead>
## Antes de empezar        (permiso, datos que necesita, prerrequisitos)
## Pasos                   (<Steps> numerados; un paso = una acción; botón en negrita)
## Qué esperar             (resultado visible y dónde verlo después)
## Si algo falla           (2–4 errores reales con enlace a /problemas/…)
## Relacionado             (enlaces)
```

### Guía de pantalla
```
# <Nombre exacto de la pantalla>
<Lead>Para qué sirve.</Lead>
## Cómo llegar · Quién puede acceder
## Qué ves                  (secciones/pestañas; captura con anotaciones numeradas si ayuda)
## Botones y acciones       (tabla: Botón · Qué hace · Permiso · Advertencia)
## Campos                   (tabla: Campo · Obligatorio · Qué poner · Validación)
## Filtros y columnas
## Estados
## Relación con otros módulos
## Errores frecuentes y advertencias
```

### Problema
```
# <Síntoma tal como lo diría el usuario>
### Síntomas  ·  ### Verifique primero  ·  ### Posibles causas  ·  ### Solución  ·  ### Si continúa
```
Cada causa debe poder comprobarse con una acción concreta (pantalla, campo o valor).

### Conseguir credenciales de un servicio externo (patrón didáctico)

Para páginas «Conseguir X de <servicio>» y «Configurar el correo con <proveedor>». Quien las lee se enreda con nombres parecidos y pantallas que cambian: el texto debe
guiarlo sin capturas del servicio. Cada página lleva, en este orden:

1. **Qué vas a conseguir y para qué** (una frase) y **cuánto toma** (orientativo, solo si la fuente oficial lo permite).
2. **Antes de empezar:** lista de comprobación (cuenta, plan, rol, requisitos) con cómo comprobar cada punto.
3. **Mapa «dónde va cada dato»:** tabla `Dato en <servicio>` → `Cómo lo llama el servicio` → `Campo en ISPMAX (ruta + etiqueta literal)` → `Formato de ejemplo` (valor ficticio). Es lo que más evita errores.
4. **Glosario de confusiones** (dos líneas por término): p. ej. qué es cada ID y en qué se diferencia del de al lado.
5. **Pasos numerados**, uno por acción, describiendo **dónde mirar** («en el menú de la izquierda, grupo …») y qué **verás al terminar** el paso; **«Si no ves…»** con la causa más probable.
6. **Comprobar en ISPMAX:** el botón de prueba y el mensaje literal de éxito (del código).
7. **Errores típicos:** tabla `mensaje que ves (literal, de ISPMAX o del servicio)` → `qué significa` → `qué hacer`.
8. **Lo que NO debes hacer** (trampas habituales: usar la clave equivocada, copiar con espacios, credenciales de prueba en producción…).
9. **Fuente oficial** con enlace y fecha de consulta; los pasos fuera de ISPMAX van en `:::info Pasos fuera de ISPMAX` (pueden cambiar) y se marcan sin probar si no se vieron en una cuenta real.

La lógica de ISPMAX (qué campo guarda qué, qué valida, qué mensaje devuelve) sale del código y se cita en `codigo:`; no se inventa nada del servicio externo que su ayuda oficial no diga.

### Preguntas frecuentes
Una pregunta por bloque `:::details Pregunta` con respuesta corta y **siempre** un enlace a la tarea o
pantalla que contiene el procedimiento. Las preguntas se escriben como las escribiría una persona real,
incluyendo la versión coloquial ("no me aparece el botón de suspender").

### Referencia
Tablas. Sin narrativa. Cada fila cita su origen en `codigo` del frontmatter.

### Concepto
Qué es, en qué se diferencia de lo parecido, y cómo se relaciona con otros conceptos. Sin procedimientos
(se enlazan).

## 5. Reglas de redacción

- **Segunda persona formal singular o impersonal** ("Seleccione…", "Pulse…"); el mismo registro en todo el manual.
- Verbos de acción al inicio del paso. Un paso, una acción. Máximo ~7 pasos; si hay más, dividir la tarea.
- Rutas de menú con flecha: **Gestión de Clientes → Clientes**. Rutas de pantalla con código: `/clientes`.
- Valores literales, claves y variables en `código`. Estados del sistema en <Badge>.
- Cifras, plazos y límites solo si salen del código o de la UI; cítense en `codigo`.
- Fechas en formato `AAAA-MM-DD`. Moneda: la de la instancia (el manual describe la instalación base: Ecuador, USD).
- Diferencias por país o proveedor de facturación electrónica: bloque `:::info Según el país` breve, nunca mezcladas
  con el texto principal.

## 6. Avisos

| Bloque | Cuándo |
|---|---|
| `:::tip Nota` | Información que facilita, no crítica |
| `:::warning Importante` | Puede producir un resultado inesperado o difícil de revertir |
| `:::danger Advertencia` | Pérdida de datos, cobros erróneos, corte de servicio a clientes |
| `Pendiente de validación` (`:::info`) | Funcionalidad leída en código y no probada en la UI |
| `Servicio externo no probado` (`:::info`) | Página `verificado` cuyo código y pantalla (datos ficticios) coinciden, pero que depende de un servicio o equipo que la instancia de pruebas no tiene (router, OLT, mapa, pasarela, WhatsApp, SRI, firma, licencia). Dice qué servicio y qué comportamiento queda sin probar; el frontmatter lo repite en `verificado.sin_probar` |

Un aviso por sección como máximo. Si todo es una advertencia, nada lo es.

## 7. Capturas

- Se generan con `tools/capture` desde la instancia aislada con datos sintéticos; nunca capturas manuales ni datos reales.
  Excepción acordada el 2026-11-05: las páginas del **servidor de correo** pueden llevar capturas manuales de ISPMAX y de la consola de Google tomadas por la persona usuaria, con correos, tokens y claves tapados con recuadro negro. Los demás servicios externos no llevan capturas.
- Nombre: `assets/imgs/<modulo>/<tarea-o-pantalla>/NN-descripcion.webp` (p. ej. `clientes/crear/03-formulario.webp`).
  Numeración con dos dígitos, minúsculas, sin tildes, guiones.
- Una captura por **estado relevante**, no una por clic. Recortar a la zona útil; ancho máximo 1600 px.
- Anotaciones numeradas ① ② ③ (las inserta la herramienta), explicadas inmediatamente debajo en lista numerada.
- Texto alternativo (`alt`) describe lo que muestra, no "captura de pantalla".
- Sin datos sensibles: la instancia es sintética; aun así, nada de correos o teléfonos reales.
- Si cambia la pantalla, se regenera con `tools/capture`; no se retoca a mano.

## 8. Enlaces

- Interno siempre con ruta absoluta (`/tareas/crear-cliente`), nunca con `.mdx`.
- Cada tarea enlaza a su guía de pantalla y a sus problemas; cada problema enlaza a la tarea correcta.
- Cada FAQ enlaza al procedimiento. Las páginas huérfanas se rechazan en CI.

## 9. Búsqueda

- `sinonimos` en el frontmatter y `<SearchTerms terms="…" />` al final (mismo contenido).
- Incluir el nombre interno del módulo, el nombre coloquial, el término de la competencia y errores de ortografía
  frecuentes ("cortar", "suspender", "desactivar"; "abonado", "cliente", "usuario").
- No duplicar páginas para posicionar términos: se añaden sinónimos y preguntas frecuentes.

## 10. Revisión antes de publicar

1. `node scripts/docs-check.mjs` sin errores.
2. Procedimiento reproducido en la instancia (o marcado "Pendiente de validación").
3. Pregunta de evaluación asociada en `user-questions.md` (y resuelta por esta página).
4. Fecha y versión de `verificado` actualizadas.
