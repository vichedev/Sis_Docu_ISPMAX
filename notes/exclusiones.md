# Funcionalidades excluidas del manual público

Funcionalidades que existen en el producto pero **no se documentan** en el manual de usuario por decisión explícita
(ver `notes/decisiones.md`). `scripts/docs-coverage.mjs` las lee y las muestra aparte: no cuentan en el denominador
de la cobertura. Formato: una fila por ID.

| ID | Motivo |
|---|---|
| ACC-034 | Herramienta técnica interna "Obtener IP" (`/red/getIp`): solo SUPER-ADMINISTRADOR, escribe en la consola del navegador; no es una función de operación. |
| RED-030 | Ídem ACC-034 (misma pantalla vista desde Gestión de Red). |
| ACC-038 | "Actualizar Sistema" (despliegue del servidor): herramienta de mantenimiento del proveedor, reservada a una cuenta; no la usa el ISP. |
| ACC-039 | Servicio de archivos estáticos (imágenes, logos): detalle de infraestructura sin operación del usuario. |
| ACC-040 | Caché Redis y consistencia: detalle interno; el efecto visible (datos que tardan en refrescarse) se explica en las páginas de cada pantalla. |
| AJS-031 | Contrato del API `/settings`: referencia para desarrolladores, ver `notes/inventory/ajs1.md`. |
| CLI-029 | Catálogo de endpoints del API `customers`: referencia para desarrolladores, ver `notes/inventory/cli1.md`. |
| NET-027 | Modelo de datos de red física y monitoreo: referencia para desarrolladores. |
| NET-028 | Composables de ubicación y redes: referencia para desarrolladores. |
| AUT-035 | No existen gateways socket.io en este backend: nota de arquitectura sin función de usuario. |
| AUT-036 | Limpieza de colas y caché al arrancar: proceso invisible; sus efectos se documentan en `docs/referencia/automatizaciones`. |
| AUT-039 | Tareas de arranque varias: proceso invisible. |
| VEN-017 | Proformas: el backend las contempla pero no existe pantalla. |
| VEN-018 | Fila antigua «Retenciones: no existen en el producto»: superada, las retenciones existen desde el código `main-2026-11-04` y se documentan en VEN-101 a VEN-107. |
| ALM-020 | Componentes compartidos del almacén (selector de productos, detalle, carga de imágenes): detalle de implementación; su comportamiento se explica en Compras, Facturas y Productos. |
| EXT-023 | Avisos internos a Slack (`URL_SLACK`): operación de la instalación por el proveedor, sin pantalla y sin acción del usuario. |
