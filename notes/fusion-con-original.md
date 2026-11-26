# Fusión con lo que ya existía

> Base de comparación: commit `0720853` ("feat: actualiza los logos de ISPMAX con el kit nuevo"), el último estado
> del manual antes de este trabajo. Regla: **sumar, no reemplazar** (CLAUDE.md, regla 10).

## Qué se restauró (2026-10-13)

| Elemento | Antes de la fusión | Ahora |
|---|---|---|
| Portada (`docs/index.mdx`) | Textos y 8 tarjetas por módulo reemplazados; YAML inválido | Hero y 8 tarjetas **originales**; botones originales + "Quiero hacer…" y "Tengo un problema"; 4 tarjetas nuevas al final |
| Menú superior (`rspress.config.ts`) | "Guía" y el desplegable de Referencia reemplazados | "Guía", "Referencia" (con sus emojis y 4 entradas originales) y "Soporte" **como estaban**; se añaden "Quiero hacer…", "Tengo un problema", "Preguntas" y 3 entradas en Referencia |
| Guía "Sistema" | Eliminada (página, menú y ruta heredada) | Restaurada con su texto original (+ metadatos de trazabilidad) |
| Figuras de las guías | 15 de 104 perdidas al reescribir (listados, AdminOLT, plantillas, IPv4…) | Las 104 figuras originales están presentes |
| Guía "Uso de plantillas" | Sin el paso a paso con capturas | Paso a paso con las 3 capturas originales (texto corregido: es Gestión de **Red**) |

## Qué NO se tocó

- Estilos (`styles/`), componentes (`src/components/`), logos, orden del menú lateral de `/guia` (`docs/sidebar.json`),
  URLs de las 50 guías originales y el manual HTML en `/legacy/`.
- Front y backend de ISPMAX (zips): solo se ejecutan; los dos parches mínimos están en la copia extraída, fuera del repo.

## Qué cambió respecto al original y por qué (revisar con el usuario)

Las guías se contrastaron con el código y se **corrigieron o ampliaron**; el texto original no siempre se conservó
palabra por palabra. Tamaño original → actual (palabras) de las que más cambiaron:
`tickets` 569 → 2094, `routers` 1040 → 2745, `instalaciones` 914 → 2072, `redes-ipv4` 508 → 1635,
`facturas` 358 → 1528, `planes` 439 → 1420, `equipos` 710 → 1279; **reducida**: `dashboard` 1501 → 1212.

Secciones originales que hoy no tienen un encabezado igual (casi todas renombradas, p. ej. "Columnas" →
"Columnas del listado"; no se comprobó una a una): `equipos`, `instalaciones`, `clientes`, `dashboard`,
`ingresos-egresos`, `personal`, `tickets`, `compras`, `registrar-pago`, `mensajeria`, `redes-ipv4`, `redes-ipv6`,
`routers`, `adminolt`, `conciliacion`, `logs-plantillas`, `productos`, `transacciones` (86 en total). Para recuperar
texto original concreto: `git show 0720853:docs/guia/<guia>.mdx`.

## Decisiones del usuario (2026-10-21)

- **Texto original:** se recuperaron las 39 secciones con posible pérdida (26 recuperadas, 4 parciales, 7 ya cubiertas,
  2 descartadas por contradecirlas el código del 2026-10-14); los otros 47 encabezados son renombres aceptados. Detalle
  sección por sección en `notes/decisiones.md`. Para ver el texto original concreto: `git show 0720853:docs/guia/<guia>.mdx`.
- **Portada y menú** (incluidas las páginas nuevas `/tareas`, `/problemas`, `/preguntas`, `/referencia`, `/conceptos`):
  se quedan como están.
- **Figuras duplicadas del listado** y **`/legacy/`**: aplicadas en otra rama (`docs/aplicar-decisiones-backlog`, sin commit al
  escribir esto), no en esta; esta sesión de actualización de contenido no tocó esas líneas (ver `docs-backlog.md` §1).
