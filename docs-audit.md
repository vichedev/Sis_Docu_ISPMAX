# Auditoría inicial del manual de ISPMAX

> Estado **encontrado** al comenzar el trabajo (2026-10-12), contrastado con el código del producto (ZIP del
> 2026-10-06: frontend Quasar/Vue + backend NestJS) y con una instancia aislada con datos sintéticos.
> No es una lista de tareas: lo pendiente está en [docs-backlog.md](docs-backlog.md).

## 1. Qué había

| Medida | Valor |
|---|---|
| Páginas del manual | 55 (54 en `/guia` + portada), ≈ 31 800 palabras |
| Páginas con imagen | 47 de 55 (110 archivos en `assets/imgs`, ≈ 10 MB; 100 `.webp`, 10 `.png`) |
| Enlaces internos | 148, **0 rotos** |
| Imágenes sin uso | 6 (`aju.png`, `ajust.png`, `conf.png`, `facpa.png`, `men.png`, `mensajee.png`) |
| Páginas sin `description` | 3 (`carga`, `faq`, `rutinas`) |
| Metadatos de trazabilidad (módulo, ruta, código, verificación) | **ninguno** |
| Secciones por intención (tareas, problemas, referencia, conceptos) | **ninguna**: una página por pantalla |
| Banco de preguntas / métricas / validación | inexistentes |
| CI / comprobaciones automáticas | inexistentes (solo `verify-content.mjs`, que compara contra el HTML antiguo) |

Estructura: sitio Rspress 2 migrado desde un `index.html` (retirado del repositorio el 2026-10-23); menú generado desde
`docs/sidebar.json`; búsqueda local. `README.md` decía "45 páginas" (eran 54).

## 2. Cobertura funcional

El inventario de código (`docs-inventory.md`) detecta **404 funcionalidades** en 13 dominios. El manual cubría el
nivel "pantalla", no la funcionalidad. Sin trazabilidad no puede medirse con exactitud la cobertura inicial; lo
comprobable:

- **Módulos con documentación muy inferior a su tamaño:** AdminOLT (≈ 180 palabras frente a 24 archivos / 4 800 líneas
  de interfaz y 8 pantallas), Uso de plantillas y Carga de data (34–120 palabras, solo capturas), Personas, Pagos
  registrados, Categorías.
- **Funcionalidades sin ninguna página:** reportes de tickets e instalaciones, checklist y pre-asignación técnica,
  mensajes masivos (historial y detalle), firma electrónica de contratos, conciliación con IA, tasa BCV, Factus
  (Colombia), monitoreo de dispositivos y alertas, edición de la red física en el mapa (KMZ, postes, tendido),
  vigilancia de routers, procesos automáticos en general.
- **Sin tareas ni diagnóstico:** el usuario debía deducir "cómo se hace" de la guía de cada pantalla y no había una
  sola página de problemas.

## 3. Afirmaciones del manual que el código contradice

Verificadas en el código (cita en `notes/inventory/*.md`). Las marcadas ✔ ya están corregidas en este repositorio.

| Página | El manual decía | El código hace |
|---|---|---|
| `cortes` | Desactivar **Mikrotik** en *Aplicar cortes en* deja al cliente suspendido pero navegando ✔ | La casilla no se lee: el corte en MikroTik se aplica siempre; solo SmartOLT/AdminOLT dependen de sus casillas |
| `cortes` | La configuración de un router "reemplaza por completo" a la global ✔ | Se fusiona campo por campo |
| `registrar-pago` | Se busca por nombre, documento, **IP o contrato** ✔ | Solo razón social o N.º de documento |
| `crear-cliente` | Email obligatorio; Día de pago 1–28 ✔ | Email opcional; 1–31 |
| `crear-cliente` | IP repetida: *ya existe un cliente con esta ipv4* ✔ | Solo en importación por Excel; el alta manual no valida |
| `crear-cliente` | *Cambiar Equipo* vincula un equipo del inventario ✔ | Libera el amarre IP–MAC |
| `crear-cliente` | Genera facturas de meses atrasados ✔ | Solo la importación Excel lo hace |
| `clientes` | Acciones masivas afectan a todos los seleccionados aunque no estén a la vista ✔ | Solo a las filas de la página cargada |
| `clientes` | *Dia de Corte* = día que vence la factura ✔ | Fecha de corte (vencimiento + gracia) |
| `detalle-cliente` | **Eliminar** "borra el registro" ✔ | Borrado lógico; facturas y pagos permanecen |
| `facturas` | *Descargar Documento* da el comprobante ✔ | Exporta a Excel la lista autorizada |
| `facturas` | Filtro Sucursal: sucursales del usuario ✔ | Solo SUPER-ADMINISTRADOR lo ve |
| `facturacion-ajustes` | Motivo obligatorio al anular facturas ✔ | Aplica a pagos/abonos, no a ventas |
| `roles-empresa` | Secuencias de "retenciones" ✔ | No existen en el formulario |
| `olts-ajustes`, `adminolt`, `smartolt` | Credenciales en Ajustes → OLTs; campo *Activar ONU* ✔ | Credenciales en la pestaña API de cada plataforma; *Activar ONU* no existe en pantalla |
| `adminolt` | "Panel de información", "ONUs con mala señal", "Internet y CATV" como funciones | Existen como endpoints, sin pantalla |
| `nap` | Botón *Excel* descarga el reporte ✔ | No hay botón con ese nombre (el menú Excel: importar, plantilla, exportar) |
| `mapa` | "NAP → Cajas NAP" ✔ | Son puntos del relevamiento (`c_nap`), no cajas con puertos |
| `personalizado` | Campo *Nuevo precio* ✔ | No existe en la interfaz |
| `monitoreo` | — | Omite *Notificar caídas*, retención de 30 días y que los avisos de router caído van por Slack |
| `estados` | 3 estados de servicio; `Pendiente` = abono parcial ✔ | Además *Eliminado*; en ventas libres *Pendiente* = sin respuesta del SRI |
| `personas` | — ✔ | Omite que en móvil no se puede agregar, que para eliminar hay que inactivar y la limitación por país |

Pendientes de corregir (en `docs-backlog.md`): `monitoreo`, `ingresos-egresos` y la guía de SmartOLT.

## 4. Problemas de forma

- **Imágenes heredadas:** nombres no descriptivos, sin carpeta por tarea; capturas de entornos reales (puede haber
  datos personales: revisión pendiente, ver backlog).
- **Texto por pantalla, no por intención:** preguntas como "¿dónde subo el contrato?" exigían leer el perfil del
  cliente completo (≈ 2 000 palabras).
- **Búsqueda:** una pregunta cotidiana típica no encontraba la página correcta. Prueba inicial con 3 preguntas
  reales (7 formulaciones) sobre el manual original: contratos 3/3 en el top‑3; *el cliente pagó pero todavía sale
  pendiente* 1/2 (la otra, puesto 6); cambiar de plan 0/2 (*¿Dónde cambio el plan?*, puesto 16): 57 % en total.
- **Lo pedido en las revisiones previas (PDF):** introducción más breve, quitar "Sistema", alertas con icono rojo,
  menos espacio entre bloques, más capturas con explicación, ampliar preguntas frecuentes. "Sistema" se eliminó; el
  resto se aborda con la nueva estructura (ver `docs-style-guide.md`).

## 5. Riesgos detectados en el producto (no se publican en el manual)

Registrados para el equipo de desarrollo en [docs-backlog.md](docs-backlog.md) §5: el backend no valida permisos
por acción (solo JWT), el JWT no caduca, claves embebidas en `scripts/deploy.sh`, tokens públicos de Mapbox en el
código, contraseñas de routers y API keys de OLT legibles por cualquier usuario autenticado, falta del driver `pg` en
`package.json` del backend.

## 6. Qué se hizo a partir de aquí

Ver [docs-coverage.md](docs-coverage.md), [docs-validation.md](docs-validation.md) y
[notes/estado.md](notes/estado.md): nuevas secciones `/tareas`, `/problemas`, `/preguntas`, `/referencia`,
`/conceptos`; metadatos de trazabilidad en todas las páginas; herramientas de verificación y capturas reproducibles.
