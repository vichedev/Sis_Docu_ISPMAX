# Estado del trabajo

> Última actualización: 2026-11-05. Manual puesto al día con el código de ISPMAX `main-2026-11-04` (BE `f0d1ebf7` + FE `e7d5d06b`). **Fusionado en `main` con el PR 17** por orden de la persona usuaria
> (tenía que entregarlo ese día; sustituye a la decisión previa de esperar a que quedara «perfecta»). Comprobar con `git log -3`, `gh pr list` y `gh run list --branch main`. Leer junto con `CLAUDE.md`.
> **Lo pendiente está en `docs-backlog.md` § 0**; cómo retomar el trabajo, en este archivo y en `notes/agentes.md`. Siguiente jornada: capturas del servidor de correo (las toma la persona usuaria) y segunda tanda de capturas de ISPMAX.

## Resumen

279 páginas de contenido, todas `estado: verificado` (0 `parcial`), por intención (`/tareas`, `/problemas`, `/preguntas`, `/referencia`, `/conceptos`) además de `/guia`.
Cada página lleva `codigo:` y `verificado.{fecha,version,metodo}`. Las 145 páginas que existían y citaban código cambiado se revisaron contra `main-2026-11-04` (correcciones mínimas)
y se añadieron 107 páginas nuevas: portal del cliente, bot e IA, bandeja de conversaciones/CRM y avisos a grupos, incidentes de red, retenciones, compra desde XML, cobros y promesas,
cuentas bancarias y régimen SRI, y servicios externos con guías didácticas sin capturas (correo con Gmail y otros proveedores, Meta/Dualhook, OpenAI, PayPhone, dLocal Go, SmartOLT, AdminOLT, MikroTik, firma `.p12`, Dátil, Factus). La web la despliega otra persona (`git pull origin main && docker compose up -d --build`, puerto 8387).

| Medida | Valor (2026-11-05) | Cómo se obtiene |
|---|---|---|
| Avance | 85,0 % por la herramienta (94,4 % sin el eje de servicios externos; 100 % del alcance acordado). **Ojo:** la herramienta no penaliza lo nuevo sin captura ni las páginas validadas solo en código (ver abajo) | `node scripts/docs-progreso.mjs` |
| Páginas validadas en pantalla (`codigo+ui`) | 46 (eran 97 el 2026-10-30: las corregidas contra el código nuevo pasaron a `codigo`) | `docs-progreso` |
| Páginas con `sin_probar` (servicio externo no probado) | 175 de 279 (eran 61) | `grep -rl "sin_probar:" docs` |
| Funcionalidades inventariadas | 596 (16 excluidas, `notes/exclusiones.md`); 580 documentadas (cobertura 580/580) | `build-inventory.mjs`, `docs-coverage.mjs` |
| Preguntas de prueba | 466 preguntas, 1924 variantes (869 el 2026-10-30); 1899 en el top-3 del BM25 interno (98,7 %); 466/466 respondidas | `eval-questions.mjs` |
| Buscador del sitio | 1.º 74,9 %, top-3 98,7 %, top-5 99,9 % (antes 78,8 / 99,9 / 100) | `eval-search.mjs`, `src/search/` |
| Mensajes del sistema | 2286 textos (731 del servidor, 1555 de pantalla), `metodo: codigo` | `gen-mensajes.mjs` |
| Permisos | catálogo regenerado (claves nuevas `bot.*`, `retenciones.*`, `portal-pagos.index`, `ajuste.ia`, `ajuste.cobros`, `mapa.incidentes.gestionar`…) | `gen-permisos.mjs` |
| Capturas | 299 de la instancia ficticia + 1 antigua (`exx.png`). **Las 107 páginas nuevas no tienen figuras** (las de servicios externos no las llevarán por decisión, salvo el correo): tareas sin captura 55 de 120, guías sin capturas 18, problemas sin captura 38 de 57 | `docs-progreso --listas` |
| Calidad | `docs-check` 0 errores y 0 avisos (285 páginas); `docs-stale` 0 sospechas y 0 rutas sin documentar (tras `--record`); `check-dist` 286 HTML, 0 enlaces rotos | `docs-check.mjs`, `docs-stale.mjs`, `check-dist.mjs` |

**Límites.** "Verificada" = contrastada con el código. Lo nuevo (96 páginas) y todas las páginas corregidas hoy se verificaron **solo en código** (la instancia de capturas estaba en el
código viejo hasta el final de la sesión). El servicio del bot de WhatsApp (`api-whats-app`, `VITE_API_WHATSAPP`) no está en el código disponible: lo que depende de él queda `sin_probar`.
Los pasos que ocurren en la consola de Google, Meta, PayPhone y dLocal Go se redactaron desde su ayuda oficial y no se probaron con una cuenta real.

## Cómo retomar (cualquier sesión o IA)

1. Leer `CLAUDE.md` (reglas, trampas y comandos), este archivo y `docs-backlog.md` § 0. Para delegar: `notes/agentes.md`.
2. Preparar el entorno: `npm ci`; el código del producto en solo lectura (`notes/entorno.md` § 1); la instancia local solo si hay que capturar o probar pantallas.
3. ¿Cambió ISPMAX? `git fetch origin && git log --oneline HEAD..origin/main` en `~/Repositorios/{backend,frontend}-isp` (BE `f0d1ebf7`, FE `e7d5d06b` son la versión documentada). Con el código nuevo,
   `docs-stale` y `docs-maintenance.md` §3. Subir `verificado.version` y `fecha` solo de lo que se contrastó.
4. Tras cada lote: `node scripts/build-nav.mjs && node scripts/docs-check.mjs && node scripts/docs-stale.mjs --record && node scripts/docs-coverage.mjs && node scripts/eval-questions.mjs`,
   luego `npm run build && node scripts/check-dist.mjs && node scripts/eval-search.mjs --check 90`, y `node scripts/docs-progreso.mjs`.
5. Página nueva: frontmatter completo (`docs-style-guide.md` §3), inventario en `notes/inventory/`, preguntas en `user-questions.md` (≥ 3 variantes) y `sinonimos` con las formas reales de preguntarlo.
   El buscador del sitio solo indexa el frontmatter `sinonimos` (no `<SearchTerms>`): toda página debe tenerlo.
6. `referencia/mensajes-del-sistema` y `referencia/catalogo-permisos` se **regeneran** (`gen-mensajes.mjs`, `gen-permisos.mjs`), nunca a mano.
7. Cerrar el bloque: actualizar este archivo y `docs-backlog.md` § 0; commit en `docs/<tema>`; push por SSH; PR; **fusión con merge commit solo cuando la persona usuaria lo pida**.

## Historia resumida

| Fecha | Qué pasó |
|---|---|
| 2026-10-12/13 | Auditoría, inventario, estructura por intención, preguntas, capturas, trazabilidad, CI y fusión con el manual original (`notes/fusion-con-original.md`). |
| 2026-10-21 | Actualización al código `zip-2026-10-14`, decisiones del backlog, tareas y problemas nuevos. |
| 2026-10-22/23 | PR #3 a #6: tareas faltantes, referencias, validación en pantalla, retirada del manual HTML antiguo. |
| 2026-10-25/26 | PR #7 a #14: capturas, 49 páginas con servicio externo cerradas con aviso, inventario completo, 16 páginas nuevas, buscador propio, `check-dist`. |
| 2026-10-30 | Repo portable: `CLAUDE.md`, `notes/agentes.md`, `notes/entorno.md`, `docs-progreso`, `capturar.sh` (PR #15 y #16). |
| 2026-11-05 | Actualización a `main-2026-11-04` (BE 204 commits, FE 293 desde la versión anterior; `implementacion-bot` y `portal_cliente` ya en `main`): 14 agentes en paralelo (8 re-verificaron las 145 páginas, 6 documentaron lo nuevo) + 1 de enlaces; 259 preguntas nuevas; permisos y mensajes regenerados; número de WhatsApp de soporte `+593 95 996 7843`; botones y logo de portada corregidos (`styles/index.css`); guía de Gmail y de servicios externos; instancia local reconstruida con el código nuevo. Ese mismo día, segunda ronda: 5 agentes redactaron 15 guías didácticas de servicios externos (sin capturas, desde fuentes oficiales y la lógica de ISPMAX; patrón en `docs-style-guide.md` §4) y se integraron 66 preguntas más. Fusionado con el PR 17 el mismo día. |

## Pendientes

Ver `docs-backlog.md` § 0: segunda tanda de capturas (≈28 figuras desactualizadas y las pantallas nuevas de ISPMAX sin figuras), capturas del servidor de correo que tomará la persona usuaria (`~/Downloads/capturas-externas/`),
decisiones de publicación, despliegue, y pruebas con servicios reales.
