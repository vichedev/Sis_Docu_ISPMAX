# Validación del manual con preguntas reales

> **Generado** por `scripts/eval-questions.mjs` el 2026-11-05. Banco de origen: [user-questions.md](user-questions.md).
> Método: cada variante se busca en el propio manual (BM25 sobre título, encabezados, sinónimos, descripción y texto)
> y se comprueba que (1) la página esperada queda entre los 3 primeros resultados y (2) esa página contiene las
> frases clave de la respuesta esperada. Una pregunta que falla indica documentación incompleta o difícil de encontrar.

| Métrica | Valor |
|---|---:|
| Preguntas (intenciones) | 466 |
| Variantes de formulación | 1924 |
| Variantes con la página correcta en el top-3 | 1899 (98.7 %) |
| Variantes con la página correcta en 1.º lugar | 1443 |
| Preguntas cuya página contiene la respuesta esperada | 466 / 466 |

## Resultados

| ID | Intención | Página esperada | Respondida | Hallada en top-3 | Faltan frases |
|---|---|---|:---:|:---:|---|
| Q-CLI-001 | Ubicar dónde registrar o subir el contrato de adhesión | /tareas/clientes/adjuntar-contrato-de-adhesion | ✅ | 6/6 | — |
| Q-CLI-002 | Saber qué formato admite el contrato y si se puede reemplazar | /tareas/clientes/adjuntar-contrato-de-adhesion | ✅ | 4/4 | — |
| Q-CLI-003 | Suspender el servicio de un cliente | /tareas/clientes/suspender-un-servicio | ✅ | 4/4 | — |
| Q-CLI-004 | Volver a activar a un cliente suspendido | /tareas/clientes/reactivar-un-servicio | ✅ | 4/4 | — |
| Q-CLI-005 | Cambiar el plan o velocidad de un cliente | /tareas/clientes/cambiar-el-plan-de-un-cliente | ✅ | 4/4 | — |
| Q-CLI-006 | Entender por qué un cliente suspendido se activó solo | /problemas/clientes/el-servicio-se-reactiva-solo | ✅ | 3/3 | — |
| Q-CLI-007 | Entender por qué un moroso no se corta | /problemas/clientes/un-cliente-con-deuda-no-se-corta o /preguntas/clientes-y-servicios | ✅ | 3/3 | — |
| Q-CLI-008 | Entender por qué un suspendido sigue navegando | /problemas/clientes/cliente-suspendido-sigue-navegando | ✅ | 3/3 | — |
| Q-CLI-009 | Diferenciar suspender, retirar y eliminar | /conceptos/estados-del-servicio-y-cortes o /preguntas/clientes-y-servicios | ✅ | 3/3 | — |
| Q-COB-001 | Registrar un pago | /tareas/cobranza/registrar-un-pago o /guia/registrar-pago | ✅ | 4/4 | — |
| Q-COB-002 | Saber por qué un pago sigue pendiente | /problemas/cobranza/el-cliente-pago-y-sigue-pendiente o /preguntas/cobranza-y-facturacion | ✅ | 4/4 | — |
| Q-COB-003 | Registrar un pago con excedente | /tareas/cobranza/registrar-un-pago o /preguntas/cobranza-y-facturacion o /guia/saldos-cargos | ✅ | 4/4 | — |
| Q-COB-004 | Corregir un pago registrado al cliente equivocado | /tareas/cobranza/anular-un-pago | ✅ | 3/4 | — |
| Q-COB-005 | Dar plazo a un cliente para pagar | /tareas/cobranza/registrar-una-promesa-de-pago o /preguntas/cobranza-y-facturacion o /guia/promesas-pago | ✅ | 4/4 | — |
| Q-COB-006 | No encontrar al cliente al cobrar | /problemas/cobranza/no-encuentro-al-cliente-en-registrar-pago | ✅ | 3/3 | — |
| Q-COB-007 | Saber por qué no se puede eliminar una factura | /problemas/cobranza/no-puedo-eliminar-una-factura | ✅ | 3/3 | — |
| Q-COB-008 | Resolver una factura electrónica no autorizada | /problemas/facturacion/la-factura-electronica-no-se-autoriza | ✅ | 4/4 | — |
| Q-COB-009 | Generar las facturas del mes | /tareas/facturacion/generar-las-facturas-pendientes o /preguntas/cobranza-y-facturacion o /problemas/servicios/no-se-genero-la-factura-del-mes | ✅ | 4/4 | — |
| Q-RED-001 | Agregar un router MikroTik | /tareas/red/agregar-un-router | ✅ | 4/4 | — |
| Q-RED-002 | Reparar un router o comprobar su conexión | /tareas/red/comprobar-y-reparar-un-router | ✅ | 3/3 | — |
| Q-RED-003 | Resolver un router sin conexión | /problemas/red/router-sin-conexion | ✅ | 3/3 | — |
| Q-RED-004 | Crear un plan de internet | /tareas/red/crear-un-plan-de-servicio o /preguntas/red-y-tecnicos o /guia/planes | ✅ | 3/3 | — |
| Q-RED-005 | Autorizar una ONU | /tareas/red/autorizar-una-onu | ✅ | 4/4 | — |
| Q-SOP-001 | Abrir un ticket de soporte | /tareas/soporte/crear-un-ticket o /preguntas/red-y-tecnicos o /guia/tickets | ✅ | 4/4 | — |
| Q-SOP-002 | Cerrar o reabrir un ticket | /tareas/soporte/cambiar-el-estado-de-un-ticket | ✅ | 4/4 | — |
| Q-SOP-003 | Completar una instalación | /tareas/soporte/programar-y-completar-una-instalacion o /guia/instalaciones | ✅ | 4/4 | — |
| Q-ACC-001 | Crear un usuario | /tareas/acceso/crear-un-usuario o /preguntas/administracion-y-sistema o /guia/personal | ✅ | 4/4 | — |
| Q-ACC-002 | Crear un rol de permisos | /tareas/acceso/crear-un-rol | ✅ | 3/3 | — |
| Q-ACC-003 | Recuperar o cambiar una contraseña | /tareas/acceso/recuperar-el-acceso o /tareas/acceso/cambiar-una-contrasena | ✅ | 3/3 | — |
| Q-ACC-004 | Resolver no poder iniciar sesión | /problemas/acceso/no-puedo-iniciar-sesion | ✅ | 4/4 | — |
| Q-ACC-005 | Entender por qué no aparece un botón o menú | /problemas/acceso/no-me-aparece-un-boton-o-menu | ✅ | 4/4 | — |
| Q-ACC-006 | Limitar el horario de un usuario | /tareas/acceso/limitar-el-horario-de-un-usuario | ✅ | 3/3 | — |
| Q-AJS-001 | Configurar los cortes automáticos | /tareas/ajustes/configurar-los-cortes-automaticos | ✅ | 4/4 | — |
| Q-AJS-002 | Dejar de facturar a un suspendido tras N facturas sin pagar | /guia/facturacion-ajustes o /conceptos/estados-del-servicio-y-cortes | ✅ | 3/3 | — |
| Q-AJS-003 | Afiliarse a Pago Internet y sacar la API key | /guia/pasarelas-pago | ✅ | 3/3 | — |
| Q-AJS-013 | Saber el valor por defecto y el rango de un ajuste | /referencia/ajustes-y-valores-por-defecto o /guia/facturacion-ajustes | ✅ | 3/3 | — |
| Q-MSG-001 | Vincular WhatsApp | /tareas/mensajeria/vincular-whatsapp | ✅ | 4/4 | — |
| Q-MSG-002 | Configurar recordatorios de pago | /tareas/mensajeria/configurar-los-recordatorios-de-pago | ✅ | 3/3 | — |
| Q-MSG-003 | Resolver mensajes que no llegan | /problemas/mensajeria/los-mensajes-no-llegan-al-cliente | ✅ | 4/4 | — |
| Q-AUT-001 | Saber qué procesos corren solos | /referencia/automatizaciones | ✅ | 3/3 | — |
| Q-ACC-007 | Consultar el catálogo de permisos | /referencia/catalogo-permisos o /referencia/permisos o /guia/roles-empresa | ✅ | 3/3 | — |
| Q-ACC-008 | Recuperar la contraseña por correo desde el ingreso | /tareas/acceso/recuperar-el-acceso | ✅ | 5/5 | — |
| Q-ACC-009 | Encontrar el correo de mi cuenta cuando no lo recuerdo | /tareas/acceso/recuperar-el-acceso | ✅ | 4/4 | — |
| Q-ACC-010 | Entender por qué mi cuenta se inactivó sola | /problemas/acceso/cuenta-inactivada-por-intentos-fallidos | ✅ | 4/4 | — |
| Q-ACC-011 | Resolver el aviso «Demasiadas peticiones» | /problemas/acceso/cuenta-inactivada-por-intentos-fallidos | ✅ | 3/3 | — |
| Q-CLI-010 | Importar clientes desde Excel | /tareas/clientes/importar-clientes-por-excel o /guia/carga o /guia/plantilla | ✅ | 4/4 | — |
| Q-CLI-011 | Entender prepago y meses atrasados al importar | /tareas/clientes/importar-clientes-por-excel o /guia/plantilla | ✅ | 3/3 | — |
| Q-CLI-012 | Dar de baja a un cliente que se fue | /tareas/clientes/retirar-o-eliminar-un-cliente | ✅ | 3/4 | — |
| Q-CLI-013 | Eliminar un cliente | /tareas/clientes/retirar-o-eliminar-un-cliente | ✅ | 3/3 | — |
| Q-CLI-014 | Facturar a nombre de otra persona o empresa | /tareas/clientes/facturar-a-nombre-de-un-tercero | ✅ | 3/3 | — |
| Q-CLI-015 | Entender el límite de clientes | /problemas/clientes/no-puedo-crear-mas-clientes | ✅ | 4/4 | — |
| Q-COB-010 | Generar y enviar un enlace de pago | /tareas/cobranza/cobrar-con-un-enlace-de-pago | ✅ | 4/4 | — |
| Q-SRV-001 | Registrar un cargo recurrente | /tareas/clientes/registrar-un-cargo-recurrente | ✅ | 5/5 | — |
| Q-COB-011 | Conciliar los pagos con el estado de cuenta del banco | /tareas/cobranza/conciliar-un-extracto-bancario | ✅ | 4/4 | — |
| Q-VEN-001 | Emitir una factura que no es de la mensualidad | /tareas/facturacion/emitir-una-factura-libre | ✅ | 4/4 | — |
| Q-VEN-002 | Registrar un gasto o un ingreso en el libro de caja | /tareas/finanzas/registrar-ingresos-y-egresos | ✅ | 5/5 | — |
| Q-RED-006 | Crear una caja NAP y asignar un puerto | /tareas/red/crear-una-caja-nap-y-asignar-un-puerto o /tareas/general/cargar-redes-planes-o-cajas-nap-desde-excel | ✅ | 4/4 | — |
| Q-RED-007 | Dibujar postes y fibra en el mapa | /tareas/red/dibujar-la-red-en-el-mapa | ✅ | 4/4 | — |
| Q-RED-008 | Importar un KMZ de Google Earth al mapa | /tareas/red/importar-un-kmz-al-mapa | ✅ | 4/4 | — |
| Q-RED-009 | Monitorear una antena o un backhaul | /tareas/red/monitorear-un-equipo-de-red | ✅ | 4/4 | — |
| Q-RED-010 | Pasar los clientes a otro router | /tareas/red/migrar-clientes-a-otro-router | ✅ | 4/4 | — |
| Q-RED-011 | Cambiar la IP de todos los clientes de una red | /tareas/red/trasladar-clientes-a-otra-red-ipv4 | ✅ | 4/4 | — |
| Q-OLT-001 | Vincular una ONU al servicio de un cliente | /tareas/red/vincular-una-onu-a-un-cliente | ✅ | 4/4 | — |
| Q-MSG-004 | Enviar un aviso a muchos clientes | /tareas/mensajeria/enviar-un-mensaje-masivo | ✅ | 4/4 | — |
| Q-MSG-005 | Cambiar el texto de un mensaje automático | /tareas/mensajeria/editar-un-mensaje-automatico | ✅ | 4/4 | — |
| Q-CLI-016 | Enviar un contrato a firmar en línea | /tareas/clientes/enviar-un-contrato-a-firmar | ✅ | 4/4 | — |
| Q-ALM-001 | Registrar una compra a un proveedor | /tareas/almacen/registrar-una-compra | ✅ | 4/4 | — |
| Q-ALM-002 | Registrar un equipo y entregarlo a un cliente | /tareas/almacen/registrar-un-equipo-y-vincularlo | ✅ | 4/4 | — |
| Q-SOP-004 | Sacar reportes de tickets e instalaciones | /tareas/soporte/sacar-los-reportes-de-soporte | ✅ | 4/4 | — |
| Q-CLI-017 | La importación de clientes falla | /problemas/clientes/la-importacion-por-excel-falla | ✅ | 4/4 | — |
| Q-CLI-018 | Entender el filtro «N Meses suspendido» | /guia/clientes o /preguntas/clientes-y-servicios | ✅ | 3/3 | — |
| Q-CLI-019 | Exportar solo los clientes retirados o suspendidos | /guia/clientes o /preguntas/clientes-y-servicios | ✅ | 3/3 | — |
| Q-CLI-020 | Saber qué significa «Fact. Automática» en el listado | /guia/clientes o /preguntas/clientes-y-servicios o /guia/facturacion-automatica o /tareas/facturacion/configurar-la-facturacion-automatica | ✅ | 3/3 | — |
| Q-CLI-021 | Saber qué campos del cliente son obligatorios y cómo se validan | /referencia/campos-del-cliente | ✅ | 4/4 | — |
| Q-RED-012 | Dos clientes con la misma IP | /problemas/red/ip-duplicada | ✅ | 4/4 | — |
| Q-COB-012 | Cobro por enlace pagado y sin registrar | /problemas/cobranza/cobro-por-pasarela-pagado-sin-asentar | ✅ | 4/4 | — |
| Q-MSG-006 | Plantilla de WhatsApp Oficial rechazada | /problemas/mensajeria/plantilla-whatsapp-rechazada | ✅ | 4/4 | — |
| Q-MSG-007 | Ver el estado de aprobación de las plantillas de WhatsApp oficial | /guia/mensajeria | ✅ | 2/3 | — |
| Q-MSG-008 | Que el recordatorio en Venezuela muestre el valor del plan | /guia/facturacion-ajustes | ✅ | 2/2 | — |
| Q-MSG-009 | Entender un mensaje de error del sistema y qué hacer | /referencia/mensajes-del-sistema o /preguntas/administracion-y-sistema | ✅ | 1/2 | — |
| Q-OLT-002 | La ONU nueva no aparece o no autoriza | /problemas/red/la-onu-no-aparece-o-no-autoriza | ✅ | 4/4 | — |
| Q-RED-013 | El tráfico del Dashboard sale vacío | /problemas/red/el-trafico-del-dashboard-esta-vacio | ✅ | 4/4 | — |
| Q-RED-014 | Indicar que una caja NAP sale de otra (principal y secundaria) | /tareas/red/crear-una-caja-nap-y-asignar-un-puerto o /guia/nap | ✅ | 4/4 | — |
| Q-RED-015 | Ver en el mapa qué cajas dependen de otra | /guia/mapa | ✅ | 4/4 | — |
| Q-RED-016 | Ver en el mapa a los clientes que no tienen caja NAP | /guia/mapa o /preguntas/red-y-tecnicos | ✅ | 2/3 | — |
| Q-RED-017 | Abrir la ficha técnica de una ONU de SmartOLT | /guia/smartolt | ✅ | 3/3 | — |
| Q-SOP-005 | El ticket no avisó | /problemas/soporte/el-ticket-no-avisa | ✅ | 4/4 | — |
| Q-SOP-006 | No veo al técnico en el mapa | /problemas/soporte/no-veo-la-ubicacion-de-un-tecnico | ✅ | 4/4 | — |
| Q-ALM-003 | La compra no subió el stock | /problemas/almacen/la-compra-no-sube-el-stock | ✅ | 4/4 | — |
| Q-COB-013 | No me deja conciliar por el cupo | /problemas/cobranza/conciliacion-sin-cupo | ✅ | 4/4 | — |
| Q-COB-014 | Mover el día de pago del cliente al día en que paga | /guia/registrar-pago o /tareas/facturacion/configurar-las-reglas-de-facturacion | ✅ | 3/3 | — |
| Q-COB-015 | Entender por qué el día de pago de un cliente cambió solo | /preguntas/cobranza-y-facturacion o /guia/facturacion-ajustes | ✅ | 3/3 | — |
| Q-AJS-004 | Consultar el plan contratado y cuántos cupos de clientes quedan | /tareas/ajustes/consultar-la-licencia-y-su-limite-de-clientes | ✅ | 4/4 | — |
| Q-AJS-005 | Saber qué se bloquea cuando se llena el cupo de clientes | /tareas/ajustes/consultar-la-licencia-y-su-limite-de-clientes | ✅ | 3/3 | — |
| Q-AJS-006 | Entender por qué no aparece la tarjeta Licencia o no muestra datos | /tareas/ajustes/consultar-la-licencia-y-su-limite-de-clientes | ✅ | 4/4 | — |
| Q-AJS-007 | Agregar un dato propio (por ejemplo, el número de contrato) a la ficha | /tareas/ajustes/crear-un-campo-personalizado-para-los-clientes | ✅ | 4/4 | — |
| Q-AJS-008 | Saber qué pasa con los datos ya guardados al renombrar, cambiar de tip | /tareas/ajustes/crear-un-campo-personalizado-para-los-clientes | ✅ | 4/4 | — |
| Q-AJS-009 | Borrar de una vez todos los clientes, o los de un router, red IPv4, pl | /tareas/ajustes/eliminar-clientes-en-bloque | ✅ | 4/4 | — |
| Q-AJS-010 | Pasar una sucursal de PRUEBA a PRODUCCION | /tareas/facturacion/configurar-la-numeracion-y-el-ambiente-de-una-sucursal | ✅ | 4/4 | — |
| Q-AJS-011 | Cambiar el número de la próxima factura o fijar establecimiento y punt | /tareas/facturacion/configurar-la-numeracion-y-el-ambiente-de-una-sucursal | ✅ | 4/4 | — |
| Q-AJS-012 | Cambiar las reglas de facturación (suspendidos, motivo de anulación, d | /tareas/facturacion/configurar-las-reglas-de-facturacion | ✅ | 3/3 | — |
| Q-ALM-004 | Crear una categoría de inventario | /tareas/almacen/crear-editar-y-eliminar-categorias | ✅ | 4/4 | — |
| Q-ALM-005 | Eliminar una categoría | /tareas/almacen/crear-editar-y-eliminar-categorias | ✅ | 4/4 | — |
| Q-ALM-006 | Una categoría no aparece al agregar un equipo | /tareas/almacen/crear-editar-y-eliminar-categorias | ✅ | 4/4 | — |
| Q-SRV-002 | Agrupar varios servicios de un cliente para cobrarlos con una sola fac | /tareas/facturacion/crear-un-grupo-de-facturacion | ✅ | 4/4 | — |
| Q-SRV-003 | Agregar un servicio a un grupo, quitarlo o deshacer el grupo | /tareas/facturacion/crear-un-grupo-de-facturacion | ✅ | 4/4 | — |
| Q-SRV-004 | Resolver el rechazo al crear un grupo de facturación | /tareas/facturacion/crear-un-grupo-de-facturacion | ✅ | 4/4 | — |
| Q-OLT-003 | Programar el reinicio automático de las ONU | /tareas/red/programar-el-reinicio-automatico-de-las-onu | ✅ | 4/4 | — |
| Q-OLT-004 | Saber a qué ONU y clientes alcanza el reinicio automático | /tareas/red/programar-el-reinicio-automatico-de-las-onu | ✅ | 4/4 | — |
| Q-OLT-005 | Comprobar o corregir que el reinicio automático de ONU se ejecutó | /tareas/red/programar-el-reinicio-automatico-de-las-onu | ✅ | 4/4 | — |
| Q-ACC-012 | Desactivar a un usuario sin eliminarlo (y reactivarlo) | /tareas/acceso/desactivar-o-eliminar-a-un-usuario | ✅ | 4/4 | — |
| Q-ACC-013 | Eliminar a un usuario y entender por qué no me deja | /tareas/acceso/desactivar-o-eliminar-a-un-usuario | ✅ | 4/4 | — |
| Q-ACC-014 | Cambiar el rol, los routers o las sucursales de un usuario | /tareas/acceso/cambiar-el-rol-los-routers-o-las-sucursales-de-un-usuario | ✅ | 4/4 | — |
| Q-FAC-001 | Configurar las credenciales de Factus para facturar en Colombia | /tareas/facturacion/configurar-la-integracion-con-factus | ✅ | 4/4 | — |
| Q-FAC-002 | Pasar Factus de pruebas a producción | /tareas/facturacion/configurar-la-integracion-con-factus | ✅ | 4/4 | — |
| Q-FAC-003 | Sincronizar la empresa y los datos del emisor con Factus | /tareas/facturacion/configurar-la-integracion-con-factus | ✅ | 4/4 | — |
| Q-FAC-004 | Aplicar la tasa del BCV a los precios en bolívares y ver cuál está vig | /tareas/facturacion/consultar-y-fijar-la-tasa-bcv | ✅ | 4/4 | — |
| Q-FAC-005 | Poner la tasa a mano y saber qué factura cambia | /tareas/facturacion/consultar-y-fijar-la-tasa-bcv | ✅ | 4/4 | — |
| Q-FAC-006 | Programar la actualización diaria de la tasa | /tareas/facturacion/consultar-y-fijar-la-tasa-bcv | ✅ | 3/3 | — |
| Q-FAC-007 | Configurar que el sistema emita solo la factura electrónica de un serv | /tareas/facturacion/configurar-la-facturacion-automatica | ✅ | 4/4 | — |
| Q-FAC-008 | Averiguar por qué no se emitió la factura automática de un servicio | /tareas/facturacion/configurar-la-facturacion-automatica | ✅ | 3/3 | — |
| Q-FAC-009 | Activar la emisión automática para un grupo de servicios | /tareas/facturacion/activar-la-facturacion-automatica-de-un-grupo | ✅ | 4/4 | — |
| Q-FAC-010 | Que todas las facturas de un grupo salgan a nombre de una empresa | /tareas/facturacion/facturar-a-un-tercero-todo-un-grupo | ✅ | 4/4 | — |
| Q-COB-101 | Cobrar de una vez todos los servicios de un grupo con una sola factura | /tareas/cobranza/cobrar-un-grupo-de-facturacion | ✅ | 4/4 | — |
| Q-COB-102 | Registrar el pago de las facturas que la facturación automática del gr | /tareas/cobranza/cobrar-un-grupo-de-facturacion | ✅ | 4/4 | — |
| Q-COB-103 | Saber qué pasa al anular el pago de una orden que se cobró en grupo | /tareas/cobranza/cobrar-un-grupo-de-facturacion | ✅ | 4/4 | — |
| Q-AJS-101 | Cambiar el día de pago de todos los clientes de un router | /tareas/ajustes/cambiar-la-facturacion-de-muchos-clientes-a-la-vez | ✅ | 4/4 | — |
| Q-AJS-102 | Saber si se puede deshacer un cambio masivo de facturación | /tareas/ajustes/cambiar-la-facturacion-de-muchos-clientes-a-la-vez | ✅ | 3/3 | — |
| Q-AJS-103 | Cambiar el tipo de comprobante o de impuesto a muchos clientes y saber | /tareas/ajustes/cambiar-la-facturacion-de-muchos-clientes-a-la-vez | ✅ | 3/3 | — |
| Q-AJS-104 | Cambiar los nombres de los niveles de ubicación (p. ej. Provincia por  | /tareas/ajustes/configurar-las-ubicaciones-de-los-clientes | ✅ | 4/4 | — |
| Q-AJS-105 | Activar un cuarto nivel de ubicación (recinto, ciudadela, zona) | /tareas/ajustes/configurar-las-ubicaciones-de-los-clientes | ✅ | 4/4 | — |
| Q-AJS-106 | Eliminar o corregir una ubicación que ya usan clientes | /tareas/ajustes/configurar-las-ubicaciones-de-los-clientes | ✅ | 4/4 | — |
| Q-AJS-201 | Saber qué hacer cuando Guardar Cambios en Ajustes no confirma | /problemas/ajustes/un-ajuste-no-se-guarda-o-no-se-aplica | ✅ | 5/5 | — |
| Q-AJS-202 | Entender por qué el botón Generar facturas pendientes está deshabilita | /problemas/ajustes/un-ajuste-no-se-guarda-o-no-se-aplica o /tareas/facturacion/generar-las-facturas-pendientes | ✅ | 4/4 | — |
| Q-AJS-203 | Saber por qué otra persona cambió o deshizo un ajuste | /problemas/ajustes/un-ajuste-no-se-guarda-o-no-se-aplica o /guia/facturacion-ajustes | ✅ | 4/4 | — |
| Q-AJS-204 | Entender un cambio masivo que falla con Internal server error | /problemas/ajustes/el-cambio-masivo-falla-o-no-cambia-lo-esperado | ✅ | 4/4 | — |
| Q-AJS-205 | Entender por qué el cambio masivo dice 0 registros afectados | /problemas/ajustes/el-cambio-masivo-falla-o-no-cambia-lo-esperado | ✅ | 4/4 | — |
| Q-AJS-206 | Saber por qué algunas facturas no cambiaron tras un cambio masivo | /problemas/ajustes/el-cambio-masivo-falla-o-no-cambia-lo-esperado o /tareas/ajustes/cambiar-la-facturacion-de-muchos-clientes-a-la-vez | ✅ | 4/4 | — |
| Q-AJS-207 | Corregir un cambio masivo aplicado por error | /problemas/ajustes/el-cambio-masivo-falla-o-no-cambia-lo-esperado o /tareas/ajustes/cambiar-la-facturacion-de-muchos-clientes-a-la-vez | ✅ | 4/4 | — |
| Q-AJS-208 | Encontrar por qué falta el ítem Ajustes o una tarjeta del panel | /problemas/ajustes/no-veo-una-tarjeta-o-pestana-de-ajustes | ✅ | 5/5 | — |
| Q-AJS-209 | Entender por qué no aparece la pestaña Cambios masivos | /problemas/ajustes/no-veo-una-tarjeta-o-pestana-de-ajustes o /tareas/ajustes/cambiar-la-facturacion-de-muchos-clientes-a-la-vez | ✅ | 4/4 | — |
| Q-AJS-210 | Saber por qué Pasarelas de Pagos o Firma de Contratos no abren | /problemas/ajustes/no-veo-una-tarjeta-o-pestana-de-ajustes o /guia/pasarelas-pago | ✅ | 4/4 | — |
| Q-AJS-211 | Entender por qué Ajustes aparece en el menú pero no abre | /problemas/ajustes/no-veo-una-tarjeta-o-pestana-de-ajustes o /guia/ajustes | ✅ | 4/4 | — |
| Q-AJS-212 | Saber por qué no aparece Factus, Tasa BCV, Licencia o Sistema | /problemas/ajustes/no-veo-una-tarjeta-o-pestana-de-ajustes | ✅ | 4/4 | — |
| Q-SRV-201 | Entender por qué a un cliente no se le generó la factura del mes | /problemas/servicios/no-se-genero-la-factura-del-mes | ✅ | 5/5 | — |
| Q-SRV-202 | Saber por qué el sistema no repone una factura eliminada | /problemas/servicios/no-se-genero-la-factura-del-mes o /tareas/facturacion/generar-las-facturas-pendientes | ✅ | 4/4 | — |
| Q-SRV-203 | Entender por qué un suspendido o un cliente nuevo no recibe factura | /problemas/servicios/no-se-genero-la-factura-del-mes | ✅ | 4/4 | — |
| Q-SRV-204 | Saber por qué no se creó ninguna factura el día 1 | /problemas/servicios/no-se-genero-la-factura-del-mes | ✅ | 4/4 | — |
| Q-SRV-205 | Saber por qué no aparece el botón Agregar Servicio o no deja agregarlo | /problemas/servicios/no-puedo-agregar-un-servicio-a-un-cliente | ✅ | 4/4 | — |
| Q-SRV-206 | Entender el error Ya existe un cliente con el usuario PPPoE al agregar | /problemas/servicios/no-puedo-agregar-un-servicio-a-un-cliente o /tareas/clientes/cambiar-el-plan-de-un-cliente | ✅ | 4/4 | — |
| Q-SRV-207 | Entender el error Error al agregar cliente a mikrotik | /problemas/servicios/no-puedo-agregar-un-servicio-a-un-cliente | ✅ | 4/4 | — |
| Q-SRV-208 | Saber por qué no aparece el plan o la opción Prepago al agregar un ser | /problemas/servicios/no-puedo-agregar-un-servicio-a-un-cliente | ✅ | 4/4 | — |
| Q-SRV-209 | Entender por qué un cargo recurrente no sale en la factura | /problemas/servicios/el-cargo-recurrente-no-sale-en-la-factura | ✅ | 5/5 | — |
| Q-SRV-210 | Saber por qué un cargo recurrente se sigue cobrando o se cobró doble | /problemas/servicios/el-cargo-recurrente-no-sale-en-la-factura | ✅ | 4/4 | — |
| Q-SRV-211 | Entender por qué un cargo está Suspendido, Cancelado o Completado y no | /problemas/servicios/el-cargo-recurrente-no-sale-en-la-factura o /tareas/clientes/registrar-un-cargo-recurrente | ✅ | 4/4 | — |
| Q-SRV-212 | Entender por qué un cargo de Factura Libre no está en la factura mensu | /problemas/servicios/el-cargo-recurrente-no-sale-en-la-factura | ✅ | 4/4 | — |
| Q-INF-001 | Un equipo se cayó y Monitoreo de Red no mandó ningún aviso | /problemas/infraestructura/monitoreo-de-red-no-avisa-cuando-se-cae-un-equipo | ✅ | 5/5 | — |
| Q-INF-002 | Un equipo apagado sigue En línea o se queda en Sin datos | /problemas/infraestructura/monitoreo-de-red-no-avisa-cuando-se-cae-un-equipo | ✅ | 5/5 | — |
| Q-INF-003 | Entender por qué un equipo silenciado no avisa | /problemas/infraestructura/monitoreo-de-red-no-avisa-cuando-se-cae-un-equipo | ✅ | 4/4 | — |
| Q-INF-004 | Interpretar el resultado de Enviar prueba cuando falla | /problemas/infraestructura/monitoreo-de-red-no-avisa-cuando-se-cae-un-equipo | ✅ | 4/4 | — |
| Q-INF-005 | La caja NAP no aparece o Puerto Nap solo ofrece Ninguno | /problemas/infraestructura/no-encuentro-un-puerto-libre-en-la-caja-nap | ✅ | 5/5 | — |
| Q-INF-006 | Liberar o ampliar los puertos de una caja NAP llena | /problemas/infraestructura/no-encuentro-un-puerto-libre-en-la-caja-nap | ✅ | 4/4 | — |
| Q-INF-007 | El mapa y el listado de cajas no coinciden en puertos ocupados | /problemas/infraestructura/no-encuentro-un-puerto-libre-en-la-caja-nap | ✅ | 3/3 | — |
| Q-INF-008 | Un cliente no sale en el mapa | /problemas/infraestructura/un-cliente-no-aparece-en-el-mapa | ✅ | 5/5 | — |
| Q-INF-009 | El cliente aparece en otro lugar del mapa (coordenadas invertidas) | /problemas/infraestructura/un-cliente-no-aparece-en-el-mapa | ✅ | 4/4 | — |
| Q-INF-010 | No se ven clientes suspendidos o de otro router en el mapa | /problemas/infraestructura/un-cliente-no-aparece-en-el-mapa | ✅ | 4/4 | — |
| Q-GEN-001 | Cambiar el router o la sucursal con la que se trabaja | /tareas/general/elegir-el-router-y-la-sucursal-de-trabajo | ✅ | 5/5 | — |
| Q-GEN-002 | Entender por qué el router elegido se mantiene en otras pantallas | /tareas/general/elegir-el-router-y-la-sucursal-de-trabajo | ✅ | 4/4 | — |
| Q-GEN-003 | No encuentro mi router o mi sucursal en los selectores | /tareas/general/elegir-el-router-y-la-sucursal-de-trabajo | ✅ | 4/4 | — |
| Q-GEN-004 | Ver los cobros de un rango de fechas en el Dashboard | /tareas/general/ver-los-cobros-de-un-periodo-en-el-dashboard | ✅ | 5/5 | — |
| Q-GEN-005 | Quitar el filtro de fecha del Dashboard | /tareas/general/ver-los-cobros-de-un-periodo-en-el-dashboard | ✅ | 4/4 | — |
| Q-GEN-006 | Entender qué cuentan las tarjetas de facturas al filtrar por fecha | /tareas/general/ver-los-cobros-de-un-periodo-en-el-dashboard | ✅ | 4/4 | — |
| Q-GEN-007 | Cargar cajas NAP, planes o redes desde Excel | /tareas/general/cargar-redes-planes-o-cajas-nap-desde-excel | ✅ | 5/5 | — |
| Q-GEN-008 | Entender las filas con error de una carga por Excel | /tareas/general/cargar-redes-planes-o-cajas-nap-desde-excel | ✅ | 5/5 | — |
| Q-GEN-009 | Orden en que se cargan redes, planes, cajas y clientes | /tareas/general/cargar-redes-planes-o-cajas-nap-desde-excel | ✅ | 4/4 | — |
| Q-GEN-010 | La plantilla de redes pide elegir un router | /tareas/general/cargar-redes-planes-o-cajas-nap-desde-excel | ✅ | 3/3 | — |
| Q-MSG-201 | Vincular el WhatsApp de la empresa y encontrar el código QR | /preguntas/mensajeria-y-notificaciones o /tareas/mensajeria/vincular-whatsapp | ✅ | 3/4 | — |
| Q-MSG-202 | Diferenciar el WhatsApp oficial del no oficial | /preguntas/mensajeria-y-notificaciones o /guia/mensajeria | ✅ | 4/4 | — |
| Q-MSG-203 | Entender por qué dejaron de llegar los WhatsApp a todos los clientes | /preguntas/mensajeria-y-notificaciones o /problemas/mensajeria/los-mensajes-no-llegan-al-cliente | ✅ | 4/4 | — |
| Q-MSG-204 | Comprobar si un mensaje se envió y ver el historial | /preguntas/mensajeria-y-notificaciones o /problemas/mensajeria/los-mensajes-no-llegan-al-cliente | ✅ | 5/5 | — |
| Q-MSG-205 | Saber a qué hora se envía el recordatorio de pago y probarlo | /preguntas/mensajeria-y-notificaciones o /tareas/mensajeria/configurar-los-recordatorios-de-pago | ✅ | 4/4 | — |
| Q-MSG-206 | Cambiar el texto del mensaje de bienvenida o del recibo | /preguntas/mensajeria-y-notificaciones o /tareas/mensajeria/editar-un-mensaje-automatico | ✅ | 4/4 | — |
| Q-MSG-207 | Saber qué variables se pueden usar en un mensaje | /preguntas/mensajeria-y-notificaciones o /referencia/variables-de-plantillas | ✅ | 4/4 | — |
| Q-MSG-208 | Enviar un aviso a todos los clientes y estimar cuánto tarda | /preguntas/mensajeria-y-notificaciones o /tareas/mensajeria/enviar-un-mensaje-masivo | ✅ | 4/4 | — |
| Q-MSG-209 | Cancelar o reanudar un envío masivo | /preguntas/mensajeria-y-notificaciones o /tareas/mensajeria/enviar-un-mensaje-masivo | ✅ | 4/4 | — |
| Q-MSG-210 | Entender por qué no se puede pulsar Enviar mensaje en el envío masivo | /preguntas/mensajeria-y-notificaciones o /tareas/mensajeria/enviar-un-mensaje-masivo | ✅ | 4/4 | — |
| Q-MSG-211 | Entender los estados con_errores y fallido de los envíos | /preguntas/mensajeria-y-notificaciones o /guia/mensajeria o /problemas/mensajeria/los-mensajes-no-llegan-al-cliente o /tareas/mensajeria/enviar-un-mensaje-masivo | ✅ | 4/4 | — |
| Q-MSG-212 | Saber si Meta aprobó una plantilla y por qué la rechazó | /preguntas/mensajeria-y-notificaciones o /problemas/mensajeria/plantilla-whatsapp-rechazada | ✅ | 4/4 | — |
| Q-MSG-213 | Configurar y probar el correo SMTP del sistema | /preguntas/mensajeria-y-notificaciones o /guia/mensajeria | ✅ | 2/4 | — |
| Q-MSG-214 | Entender los avisos de la campana sobre mensajes que no salieron | /preguntas/mensajeria-y-notificaciones o /guia/notificaciones o /problemas/mensajeria/los-mensajes-no-llegan-al-cliente | ✅ | 4/4 | — |
| Q-SOP-201 | Ver los tickets de otros usuarios | /preguntas/soporte-y-tickets o /guia/tickets | ✅ | 4/4 | — |
| Q-SOP-202 | Abrir el detalle de un ticket cuando solo se ve la lista | /preguntas/soporte-y-tickets o /guia/tickets | ✅ | 4/4 | — |
| Q-SOP-203 | Diferenciar Resuelto de Cerrado y reabrir un ticket | /preguntas/soporte-y-tickets o /tareas/soporte/cambiar-el-estado-de-un-ticket | ✅ | 4/4 | — |
| Q-SOP-204 | Elegir la fecha de hoy como fecha de visita | /preguntas/soporte-y-tickets o /tareas/soporte/crear-un-ticket | ✅ | 4/4 | — |
| Q-SOP-205 | Asignar el ticket a otro técnico | /preguntas/soporte-y-tickets o /tareas/soporte/crear-un-ticket | ✅ | 4/4 | — |
| Q-SOP-206 | Sumar un técnico de apoyo a un ticket | /preguntas/soporte-y-tickets o /guia/tickets | ✅ | 4/4 | — |
| Q-SOP-207 | Marcar la llegada del técnico al domicilio | /preguntas/soporte-y-tickets o /guia/tickets | ✅ | 4/4 | — |
| Q-SOP-208 | Ver cuántos tickets atendió cada técnico | /preguntas/soporte-y-tickets o /tareas/soporte/sacar-los-reportes-de-soporte | ✅ | 4/4 | — |
| Q-SOP-209 | Eliminar un ticket | /preguntas/soporte-y-tickets o /guia/tickets | ✅ | 4/4 | — |
| Q-SOP-210 | Entender por qué no llegó el aviso del ticket al técnico o al cliente | /preguntas/soporte-y-tickets o /problemas/soporte/el-ticket-no-avisa | ✅ | 4/4 | — |
| Q-SOP-211 | Ver instalaciones de otros técnicos o buscar una por nombre de cliente | /preguntas/soporte-y-tickets o /guia/instalaciones | ✅ | 4/4 | — |
| Q-SOP-212 | Cambiar el técnico de una instalación | /preguntas/soporte-y-tickets o /guia/instalaciones | ✅ | 4/4 | — |
| Q-SOP-213 | Reprogramar o cancelar una instalación | /preguntas/soporte-y-tickets o /tareas/soporte/programar-y-completar-una-instalacion | ✅ | 3/4 | — |
| Q-SOP-214 | Resolver el aviso Checklist incompleto al marcar Instalado | /preguntas/soporte-y-tickets o /guia/instalaciones | ✅ | 4/4 | — |
| Q-OLT-201 | Dónde cargar el dominio y la API Key de SmartOLT o AdminOLT | /preguntas/olt-y-onu o /guia/smartolt | ✅ | 4/4 | — |
| Q-OLT-202 | Elegir entre SmartOLT y AdminOLT | /preguntas/olt-y-onu o /guia/adminolt | ✅ | 4/4 | — |
| Q-OLT-203 | Autorizar una ONU nueva | /preguntas/olt-y-onu o /tareas/red/autorizar-una-onu | ✅ | 4/4 | — |
| Q-OLT-204 | Resolver que la ONU nueva no aparece en Esperando autorización | /preguntas/olt-y-onu o /problemas/red/la-onu-no-aparece-o-no-autoriza | ✅ | 4/4 | — |
| Q-OLT-205 | Vincular la ONU al servicio de un cliente | /preguntas/olt-y-onu o /tareas/red/vincular-una-onu-a-un-cliente | ✅ | 4/4 | — |
| Q-OLT-206 | Entender el triángulo de advertencia junto al SN (ONU inválida) | /preguntas/olt-y-onu o /tareas/red/vincular-una-onu-a-un-cliente | ✅ | 4/4 | — |
| Q-OLT-207 | Entender los iconos de estado y señal de las ONU | /preguntas/olt-y-onu o /referencia/estados-y-colores | ✅ | 4/4 | — |
| Q-OLT-208 | Resolver el aviso Mostrando datos en caché y refrescar el listado | /preguntas/olt-y-onu o /guia/smartolt | ✅ | 4/4 | — |
| Q-OLT-209 | Reiniciar una ONU o programar reinicios | /preguntas/olt-y-onu o /tareas/red/programar-el-reinicio-automatico-de-las-onu | ✅ | 4/4 | — |
| Q-OLT-210 | Cambiar el WiFi del cliente desde ISPMAX | /preguntas/olt-y-onu o /guia/smartolt | ✅ | 4/4 | — |
| Q-OLT-211 | Saber qué hace Restaurar Valores de Fábrica en una ONU | /preguntas/olt-y-onu o /guia/smartolt | ✅ | 4/4 | — |
| Q-OLT-212 | Saber si al suspender un cliente también se apaga su ONU | /preguntas/olt-y-onu o /guia/cortes o /problemas/clientes/cliente-suspendido-sigue-navegando | ✅ | 4/4 | — |
| Q-OLT-213 | Entender el aviso ONU autorizada, pero fallaron pasos | /preguntas/olt-y-onu o /problemas/red/la-onu-no-aparece-o-no-autoriza | ✅ | 4/4 | — |
| Q-RED-201 | Saber qué significa Sin conexión y los demás estados de un router | /referencia/estados-y-colores o /problemas/red/router-sin-conexion | ✅ | 3/5 | — |
| Q-RED-202 | Saber qué significa la insignia EN_PROCESO con guion bajo en los ticke | /referencia/estados-y-colores o /guia/tickets | ✅ | 4/4 | — |
| Q-RED-203 | Saber qué color y qué significa cada estado de una instalación | /referencia/estados-y-colores o /guia/instalaciones | ✅ | 4/4 | — |
| Q-RED-204 | Saber qué significa Activo, Inactivo y Retirado del servicio y sus col | /referencia/estados-y-colores o /conceptos/estados-del-servicio-y-cortes o /guia/detalle-cliente | ✅ | 4/4 | — |
| Q-RED-205 | Entender los colores de la tarjeta TOTAL OFFLINE y de las ONU en LoS | /referencia/estados-y-colores o /guia/smartolt | ✅ | 4/4 | — |
| Q-RED-206 | Saber qué significan los colores de la señal de una ONU en AdminOLT | /referencia/estados-y-colores o /guia/adminolt | ✅ | 4/4 | — |
| Q-BAN-01 | Encontrar dónde se atienden los chats de WhatsApp de los clientes | /guia/bandeja-de-conversaciones | ✅ | 3/4 | — |
| Q-BAN-02 | Entender qué significa "Pide asesor" en un chat | /guia/bandeja-de-conversaciones | ✅ | 4/4 | — |
| Q-BAN-03 | Entender los botones de la cabecera del chat (Bot, Derivar, Ver client | /guia/bandeja-de-conversaciones | ✅ | 4/4 | — |
| Q-BAN-04 | Ver los datos y la deuda del cliente desde el chat sin salir | /guia/bandeja-de-conversaciones | ✅ | 4/4 | — |
| Q-BAN-05 | Saber qué avisos se pueden mandar a un grupo de WhatsApp | /guia/avisos-a-grupos-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-06 | Saber por qué no sale la tarjeta de avisos a grupos | /guia/avisos-a-grupos-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-07 | Saber qué datos tiene el perfil del negocio de WhatsApp | /guia/perfil-del-negocio-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-08 | Cambiar el nombre de la empresa que ve el cliente en WhatsApp | /guia/perfil-del-negocio-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-09 | Aceptar un chat de la bandeja, responderlo y cerrarlo | /tareas/bandeja/atender-un-chat-y-devolverlo-al-bot | ✅ | 4/4 | — |
| Q-BAN-10 | Hacer que el bot vuelva a contestar en un chat | /tareas/bandeja/atender-un-chat-y-devolverlo-al-bot | ✅ | 4/4 | — |
| Q-BAN-11 | Pasar un chat a otro compañero del equipo | /tareas/bandeja/derivar-un-chat-a-otro-usuario | ✅ | 4/4 | — |
| Q-BAN-12 | Saber si se puede derivar un chat a una cola | /tareas/bandeja/derivar-un-chat-a-otro-usuario | ✅ | 4/4 | — |
| Q-BAN-13 | Escribirle por WhatsApp a un cliente que no ha escrito primero | /tareas/bandeja/iniciar-un-chat-con-un-cliente | ✅ | 4/4 | — |
| Q-BAN-14 | Resolver errores al mandar una plantilla desde el chat | /tareas/bandeja/iniciar-un-chat-con-un-cliente | ✅ | 4/4 | — |
| Q-BAN-15 | Bloquear a un número que manda spam por WhatsApp | /tareas/bandeja/bloquear-un-numero-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-16 | Desbloquear un número bloqueado en WhatsApp | /tareas/bandeja/bloquear-un-numero-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-17 | Hacer que el bot no responda a un técnico o a un familiar | /tareas/bandeja/dejar-un-numero-sin-bot | ✅ | 4/4 | — |
| Q-BAN-18 | Volver a activar el bot en un número que estaba sin bot | /tareas/bandeja/dejar-un-numero-sin-bot | ✅ | 4/4 | — |
| Q-BAN-19 | Cambiar cuánto tiempo calla el bot cuando la empresa escribe primero | /tareas/bandeja/configurar-las-horas-de-silencio-del-bot | ✅ | 4/4 | — |
| Q-BAN-20 | Apagar el silencio del bot cuando la empresa empieza la conversación | /tareas/bandeja/configurar-las-horas-de-silencio-del-bot | ✅ | 4/4 | — |
| Q-BAN-21 | Elegir el grupo de WhatsApp que recibe cada aviso | /tareas/bandeja/enviar-avisos-a-un-grupo-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-22 | Probar que el grupo recibe los avisos | /tareas/bandeja/enviar-avisos-a-un-grupo-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-23 | Cambiar la foto del WhatsApp de la empresa | /tareas/bandeja/configurar-el-perfil-del-negocio-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-24 | Poner el horario de atención en el perfil de WhatsApp | /tareas/bandeja/configurar-el-perfil-del-negocio-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-25 | Contestar una llamada de WhatsApp de un cliente desde el panel | /tareas/bandeja/contestar-una-llamada-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-26 | Dejar una llamada en espera o pasarla al asistente | /tareas/bandeja/contestar-una-llamada-de-whatsapp | ✅ | 4/4 | — |
| Q-BAN-27 | Llamar a un cliente por WhatsApp desde su chat | /tareas/bandeja/llamar-a-un-cliente-por-whatsapp | ✅ | 4/4 | — |
| Q-BAN-28 | Saber cuántas veces se puede pedir permiso de llamada a un cliente | /tareas/bandeja/llamar-a-un-cliente-por-whatsapp | ✅ | 4/4 | — |
| Q-BAN-29 | Resolver que no aparece el CRM WhatsApp o dice que el plan no lo inclu | /problemas/bandeja/no-aparece-el-crm-whatsapp | ✅ | 4/4 | — |
| Q-BAN-30 | Resolver el aviso "Primero conecta el WhatsApp de la empresa" | /problemas/bandeja/no-aparece-el-crm-whatsapp | ✅ | 4/4 | — |
| Q-BAN-31 | Averiguar por qué el bot no le contesta a un cliente | /problemas/bandeja/el-bot-no-responde-a-un-cliente | ✅ | 4/4 | — |
| Q-BAN-32 | Entender por qué el bot calla después de que un asesor respondió | /problemas/bandeja/el-bot-no-responde-a-un-cliente | ✅ | 4/4 | — |
| Q-BAN-33 | Entender por qué solo deja enviar plantillas en un chat | /problemas/bandeja/no-puedo-escribirle-al-cliente-solo-plantillas | ✅ | 4/4 | — |
| Q-BAN-34 | Entender las otras barras que impiden responder (lectura, bandeja, cer | /problemas/bandeja/no-puedo-escribirle-al-cliente-solo-plantillas | ✅ | 3/4 | — |
| Q-BAN-35 | Resolver que no suena la llamada o no aparece el botón Llamar | /problemas/bandeja/no-puedo-llamar-o-no-suena-la-llamada | ✅ | 4/4 | — |
| Q-BAN-36 | Resolver errores de micrófono o de permiso al llamar | /problemas/bandeja/no-puedo-llamar-o-no-suena-la-llamada | ✅ | 4/4 | — |
| Q-BAN-37 | Resolver que un aviso no llegó al grupo de WhatsApp | /problemas/bandeja/no-llegan-los-avisos-al-grupo | ✅ | 4/4 | — |
| Q-BAN-38 | Saber por qué no aparece la tarjeta o por qué no llegó el aviso de fir | /problemas/bandeja/no-llegan-los-avisos-al-grupo | ✅ | 4/4 | — |
| Q-BAN-39 | Distinguir el interruptor Bot, Números sin bot y el apagado general | /preguntas/bandeja-y-chats | ✅ | 3/4 | — |
| Q-BAN-40 | Saber si los tickets de la bandeja son los de soporte | /preguntas/bandeja-y-chats | ✅ | 4/4 | — |
| Q-COBVEN-01 | Encontrar la pantalla de facturas libres en el menú | /guia/facturas | ✅ | 3/4 | — |
| Q-COBVEN-02 | Cubrir con una promesa todas las facturas vencidas de un servicio | /tareas/cobranza/registrar-una-promesa-de-pago | ✅ | 4/4 | — |
| Q-COBVEN-03 | Saber hasta qué momento vale una promesa de pago | /guia/promesas-pago | ✅ | 4/4 | — |
| Q-COBVEN-04 | Entender el aviso de cobro ya registrado desde otra pantalla | /guia/registrar-pago | ✅ | 3/4 | — |
| Q-COBVEN-05 | Saber si eliminar una factura libera los meses adelantados | /problemas/cobranza/no-puedo-eliminar-una-factura | ✅ | 4/4 | — |
| Q-COBVEN-06 | Consultar por API solo los servicios con deuda | /referencia/api-registro-de-pagos | ✅ | 4/4 | — |
| Q-COBVEN-07 | Saber qué formas de pago ofrece la factura libre | /guia/facturas | ✅ | 4/4 | — |
| Q-EXT-01 | Conseguir el código (contraseña) de aplicación de Gmail para el correo | /tareas/ajustes/configurar-el-correo-con-gmail o /preguntas/correo-y-servicios-externos | ✅ | 6/6 | — |
| Q-EXT-02 | Configurar el correo de ISPMAX con una cuenta de Gmail | /tareas/ajustes/configurar-el-correo-con-gmail | ✅ | 6/6 | — |
| Q-EXT-03 | Elegir el puerto y la seguridad correctos con Gmail | /tareas/ajustes/configurar-el-correo-con-gmail o /preguntas/correo-y-servicios-externos | ✅ | 5/5 | — |
| Q-EXT-04 | Saber qué contraseña va en el campo Contraseña del correo | /tareas/ajustes/configurar-el-correo-con-gmail o /preguntas/correo-y-servicios-externos | ✅ | 5/5 | — |
| Q-EXT-05 | Entender el error 535 / 534 de Gmail al probar el correo | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion | ✅ | 5/5 | — |
| Q-EXT-06 | Resolver «Greeting never received» o «Connection timeout» en la prueba | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion | ✅ | 4/4 | — |
| Q-EXT-07 | Qué hacer si Google no muestra la opción de contraseñas de aplicación | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion o /preguntas/correo-y-servicios-externos | ✅ | 4/4 | — |
| Q-EXT-08 | Entender por qué el correo con Gmail dejó de enviar de pronto | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion | ✅ | 4/4 | — |
| Q-EXT-09 | Saber si se puede usar Outlook, Hotmail o Microsoft 365 como correo de | /preguntas/correo-y-servicios-externos | ✅ | 5/5 | — |
| Q-EXT-10 | Entender por qué el correo de «olvidé mi contraseña» no depende de Gma | /preguntas/correo-y-servicios-externos | ✅ | 3/4 | — |
| Q-EXT-11 | Conocer el límite de correos por día con Gmail | /preguntas/correo-y-servicios-externos o /tareas/ajustes/configurar-el-correo-con-gmail | ✅ | 4/4 | — |
| Q-EXT-12 | Entender por qué el error de la prueba del correo sale traducido o rar | /preguntas/correo-y-servicios-externos o /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion | ✅ | 4/4 | — |
| Q-EXT-13 | Saber qué hay que conseguir fuera de ISPMAX para cada servicio | /referencia/servicios-externos | ✅ | 5/5 | — |
| Q-EXT-14 | Dónde sacar la API Key de SmartOLT o de AdminOLT | /preguntas/correo-y-servicios-externos o /referencia/servicios-externos | ✅ | 4/4 | — |
| Q-EXT-15 | Saber si hay que cargar un token de Mapbox para el mapa | /preguntas/correo-y-servicios-externos o /referencia/servicios-externos | ✅ | 4/4 | — |
| Q-EXT-16 | Conseguir el Token y el Store ID de PayPhone | /tareas/ajustes/conseguir-el-token-y-el-store-id-de-payphone | ✅ | 5/5 | — |
| Q-EXT-17 | Conseguir la API Key y la Secret Key de dLocal Go | /tareas/ajustes/conseguir-la-api-key-y-la-secret-key-de-dlocal-go | ✅ | 5/5 | — |
| Q-EXT-18 | Conseguir el Phone Number ID, el WABA ID y el token de WhatsApp Oficia | /tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta | ✅ | 5/5 | — |
| Q-EXT-19 | Saber de dónde sale el certificado .p12 que pide la empresa | /referencia/servicios-externos | ✅ | 4/4 | — |
| Q-EXT-20 | Saber qué pide Dátil para la firma de contratos | /referencia/servicios-externos | ✅ | 4/4 | — |
| Q-FINANZAS-01 | Encontrar dónde se ven las retenciones emitidas | /guia/retenciones | ✅ | 4/4 | — |
| Q-FINANZAS-02 | Entender qué significa cada estado de la retención | /guia/retenciones | ✅ | 4/4 | — |
| Q-FINANZAS-03 | Saber por qué no aparece Retenciones en el menú | /guia/retenciones | ✅ | 4/4 | — |
| Q-FINANZAS-04 | Emitir una retención a un proveedor desde una compra | /tareas/finanzas/emitir-una-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-05 | Retener una factura que no está registrada como compra | /tareas/finanzas/emitir-una-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-06 | Elegir el código y el porcentaje de renta e IVA a retener | /tareas/finanzas/emitir-una-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-07 | Corregir una retención ya autorizada con un error | /tareas/finanzas/anular-una-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-08 | Saber si marcar como anulada anula la retención en el SRI | /tareas/finanzas/anular-una-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-09 | Sacar el reporte de retenciones de un periodo | /tareas/finanzas/sacar-el-reporte-de-retenciones | ✅ | 4/4 | — |
| Q-FINANZAS-10 | Entender por qué una retención no suma en el reporte | /tareas/finanzas/sacar-el-reporte-de-retenciones | ✅ | 4/4 | — |
| Q-FINANZAS-11 | Resolver que no aparece o no deja usar el botón Emitir retención | /problemas/facturacion/no-puedo-emitir-la-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-12 | Resolver que el proveedor tiene cédula o RUC inválidos al retener | /problemas/facturacion/no-puedo-emitir-la-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-13 | Resolver que la compra ya tiene una retención | /problemas/facturacion/no-puedo-emitir-la-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-14 | Resolver que falta el secuencial de retención en la sucursal | /problemas/facturacion/no-puedo-emitir-la-retencion | ✅ | 4/4 | — |
| Q-FINANZAS-15 | Saber qué hacer con una retención en Recibida, En proceso o Sin respue | /problemas/facturacion/la-retencion-no-queda-autorizada-por-el-sri | ✅ | 4/4 | — |
| Q-FINANZAS-16 | Saber qué hacer cuando el SRI rechaza la retención | /problemas/facturacion/la-retencion-no-queda-autorizada-por-el-sri | ✅ | 4/4 | — |
| Q-FINANZAS-17 | Cargar la compra con el XML de la factura del proveedor | /tareas/almacen/importar-una-compra-desde-el-xml-del-proveedor | ✅ | 4/4 | — |
| Q-FINANZAS-18 | Decidir qué hacer con los productos de la factura que no existen | /tareas/almacen/importar-una-compra-desde-el-xml-del-proveedor | ✅ | 4/4 | — |
| Q-FINANZAS-19 | Cargar el PDF de la factura en lugar del XML | /tareas/almacen/importar-una-compra-desde-el-xml-del-proveedor | ✅ | 4/4 | — |
| Q-FINANZAS-20 | Resolver que el archivo XML se rechaza | /problemas/facturacion/no-puedo-cargar-el-xml-de-la-factura-del-proveedor | ✅ | 4/4 | — |
| Q-FINANZAS-21 | Resolver que no se puede llenar la compra con el XML | /problemas/facturacion/no-puedo-cargar-el-xml-de-la-factura-del-proveedor | ✅ | 4/4 | — |
| Q-FINANZAS-22 | Entender el aviso de factura ya registrada al cargar el XML | /problemas/facturacion/no-puedo-cargar-el-xml-de-la-factura-del-proveedor | ✅ | 3/4 | — |
| Q-FINANZAS-23 | Limitar cuántas promesas puede pedir el cliente al mes | /tareas/ajustes/limitar-las-promesas-de-pago-por-mes | ✅ | 4/4 | — |
| Q-FINANZAS-24 | Cambiar desde cuántas incumplidas no se dan promesas | /tareas/ajustes/limitar-las-promesas-de-pago-por-mes | ✅ | 4/4 | — |
| Q-FINANZAS-25 | Activar que el cliente pida promesas por el portal o por WhatsApp | /guia/cobros-y-promesas-ajustes | ✅ | 2/4 | — |
| Q-FINANZAS-26 | Entender los días de plazo y la antigüedad máxima del comprobante | /guia/cobros-y-promesas-ajustes | ✅ | 4/4 | — |
| Q-FINANZAS-27 | Configurar el radio de cobertura y los costos que informa el bot | /guia/cobros-y-promesas-ajustes | ✅ | 4/4 | — |
| Q-FINANZAS-28 | Agregar una cuenta bancaria de la empresa | /tareas/ajustes/elegir-que-cuentas-bancarias-ve-el-cliente | ✅ | 4/4 | — |
| Q-FINANZAS-29 | Ocultar una cuenta al cliente pero seguir reconociendo sus comprobante | /tareas/ajustes/elegir-que-cuentas-bancarias-ve-el-cliente | ✅ | 4/4 | — |
| Q-FINANZAS-30 | Indicar que la empresa es RIMPE, agente de retención o contribuyente e | /tareas/ajustes/indicar-el-regimen-sri-de-la-empresa | ✅ | 4/4 | — |
| Q-FINANZAS-31 | Entender el error al guardar la resolución de agente o contribuyente e | /tareas/ajustes/indicar-el-regimen-sri-de-la-empresa | ✅ | 4/4 | — |
| Q-FINANZAS-32 | Encontrar respuestas rápidas sobre retenciones, compras con XML y cobr | /preguntas/retenciones-y-compras-xml | ✅ | 4/4 | — |
| Q-INC-01 | Saber cuántos clientes deben caerse para que se declare una caída masi | /guia/incidentes-de-red o /preguntas/incidentes-de-red | ✅ | 4/4 | — |
| Q-INC-02 | Ver dónde están las caídas masivas y los mantenimientos | /guia/incidentes-de-red o /preguntas/incidentes-de-red | ✅ | 4/4 | — |
| Q-INC-03 | Entender qué le dice el bot a un cliente cuando hay una caída masiva | /guia/incidentes-de-red | ✅ | 4/4 | — |
| Q-INC-04 | Saber a quién avisa ISPMAX cuando detecta una caída masiva | /guia/incidentes-de-red o /preguntas/incidentes-de-red | ✅ | 4/4 | — |
| Q-INC-05 | Entender qué significa "Aplicando cambio…" en la ONU del cliente | /guia/resumen-de-la-onu | ✅ | 4/4 | — |
| Q-INC-06 | Ver el estado y la señal de la ONU desde la ficha del cliente | /guia/resumen-de-la-onu | ✅ | 4/4 | — |
| Q-INC-07 | Dibujar una zona en el mapa | /tareas/red/definir-una-zona-de-incidentes-en-el-mapa | ✅ | 4/4 | — |
| Q-INC-08 | Editar, redibujar o eliminar una zona | /tareas/red/definir-una-zona-de-incidentes-en-el-mapa | ✅ | 4/4 | — |
| Q-INC-09 | Programar un mantenimiento y avisar a los clientes | /tareas/red/declarar-un-mantenimiento-o-una-falla | ✅ | 4/4 | — |
| Q-INC-10 | Declarar a mano una falla conocida de una caja o sector | /tareas/red/declarar-un-mantenimiento-o-una-falla | ✅ | 4/4 | — |
| Q-INC-11 | Entender por qué no deja declarar el incidente porque no hay clientes  | /tareas/red/declarar-un-mantenimiento-o-una-falla | ✅ | 4/4 | — |
| Q-INC-12 | Cerrar un incidente de red | /tareas/red/revisar-y-cerrar-un-incidente-de-red | ✅ | 4/4 | — |
| Q-INC-13 | Cambiar lo que dice el bot y la hora estimada de un incidente | /tareas/red/revisar-y-cerrar-un-incidente-de-red | ✅ | 4/4 | — |
| Q-INC-14 | Cancelar un mantenimiento programado | /tareas/red/revisar-y-cerrar-un-incidente-de-red | ✅ | 4/4 | — |
| Q-INC-15 | Saber la diferencia entre Resuelto y Falsa alarma | /tareas/red/revisar-y-cerrar-un-incidente-de-red o /preguntas/incidentes-de-red | ✅ | 4/4 | — |
| Q-INC-16 | Avisar por WhatsApp a los clientes antes de un mantenimiento | /tareas/red/avisar-a-los-clientes-afectados-por-un-incidente | ✅ | 4/4 | — |
| Q-INC-17 | Editar el texto del aviso de mantenimiento o de caída masiva | /tareas/red/avisar-a-los-clientes-afectados-por-un-incidente | ✅ | 4/4 | — |
| Q-INC-18 | Hacer que se avise a todos los clientes de una caída masiva | /tareas/red/avisar-a-los-clientes-afectados-por-un-incidente o /preguntas/incidentes-de-red | ✅ | 4/4 | — |
| Q-INC-19 | Ver a quién se envió el aviso y cancelar lo que falta | /tareas/red/avisar-a-los-clientes-afectados-por-un-incidente | ✅ | 4/4 | — |
| Q-INC-20 | Configurar el webhook de SmartOLT para detectar caídas más rápido | /tareas/red/configurar-el-webhook-de-smartolt | ✅ | 4/4 | — |
| Q-INC-21 | Saber dónde se obtiene la URL y qué falta si no aparece | /tareas/red/configurar-el-webhook-de-smartolt | ✅ | 4/4 | — |
| Q-INC-22 | Entender por qué no llegan los eventos del webhook de SmartOLT | /problemas/red/el-webhook-de-smartolt-no-llega | ✅ | 4/4 | — |
| Q-INC-23 | Resolver el rechazo del webhook por la hora del servidor | /problemas/red/el-webhook-de-smartolt-no-llega | ✅ | 4/4 | — |
| Q-INC-24 | Asignar clientes a una antena o sector | /tareas/red/asignar-clientes-a-una-antena-o-sector | ✅ | 4/4 | — |
| Q-INC-25 | Entender por qué cayó una antena y no hay incidente | /tareas/red/asignar-clientes-a-una-antena-o-sector o /problemas/red/cayeron-varios-clientes-y-no-se-abrio-un-incidente | ✅ | 4/4 | — |
| Q-INC-26 | Descartar una caída masiva que no es real | /problemas/red/se-abrio-una-caida-masiva-que-no-es-real | ✅ | 4/4 | — |
| Q-INC-27 | Entender por qué un incidente no se cierra solo | /problemas/red/se-abrio-una-caida-masiva-que-no-es-real | ✅ | 4/4 | — |
| Q-INC-28 | Entender por qué no se detectó una caída de varios clientes | /problemas/red/cayeron-varios-clientes-y-no-se-abrio-un-incidente | ✅ | 4/4 | — |
| Q-INC-29 | Averiguar por qué el aviso por WhatsApp no salió o va lento | /problemas/red/el-aviso-a-los-clientes-no-salio | ✅ | 4/4 | — |
| Q-INC-30 | Entender por qué la ONU figura distinta en la ficha y en el mapa | /problemas/red/la-onu-aparece-en-un-estado-que-no-corresponde | ✅ | 4/4 | — |
| Q-INC-31 | Resolver el aviso "Hay una versión nueva de ISPMAX" | /problemas/red/hay-una-version-nueva-de-ispmax | ✅ | 4/4 | — |
| Q-INC-32 | Entender qué significa Power fail y el color violeta de un incidente | /referencia/estados-de-onu-e-incidentes o /preguntas/incidentes-de-red | ✅ | 4/4 | — |
| Q-INC-33 | Consultar los estados de conexión de un servicio | /referencia/estados-de-onu-e-incidentes | ✅ | 4/4 | — |
| Q-INC-34 | Saber qué permiso hace falta para gestionar incidentes | /referencia/estados-de-onu-e-incidentes o /preguntas/incidentes-de-red o /tareas/red/declarar-un-mantenimiento-o-una-falla | ✅ | 4/4 | — |
| Q-BOT-01 | Apagar o encender el bot de WhatsApp | /tareas/bot/activar-el-bot-y-decidir-cuando-responde | ✅ | 4/4 | — |
| Q-BOT-02 | Fijar los días y horas en que atiende el bot y el mensaje fuera de hor | /tareas/bot/activar-el-bot-y-decidir-cuando-responde | ✅ | 4/4 | — |
| Q-BOT-03 | Cerrar automáticamente los chats que nadie contesta | /tareas/bot/activar-el-bot-y-decidir-cuando-responde | ✅ | 4/4 | — |
| Q-BOT-04 | Enseñarle al asistente un tema que no sabe (por ejemplo el servicio de | /tareas/bot/cargar-conocimiento-al-asistente | ✅ | 4/4 | — |
| Q-BOT-05 | Importar conocimiento desde una página web, PDF o Word | /tareas/bot/cargar-conocimiento-al-asistente | ✅ | 4/4 | — |
| Q-BOT-06 | Hacer que el asistente envíe el flyer de precios al pedir los planes | /tareas/bot/cargar-conocimiento-al-asistente | ✅ | 3/3 | — |
| Q-BOT-07 | Atender la lista de preguntas que el asistente no supo responder | /tareas/bot/responder-las-preguntas-que-el-asistente-no-supo | ✅ | 4/4 | — |
| Q-BOT-08 | Crear un menú nuevo (cola) con opciones y pasos | /tareas/bot/crear-una-cola-menu-del-bot | ✅ | 4/4 | — |
| Q-BOT-09 | Entender los errores al guardar una cola | /tareas/bot/crear-una-cola-menu-del-bot | ✅ | 4/4 | — |
| Q-BOT-10 | Crear el menú que usan los técnicos al escribir al bot | /tareas/bot/crear-una-cola-menu-del-bot o /guia/bot-colas | ✅ | 4/4 | — |
| Q-BOT-11 | Ver los comprobantes que mandan los clientes al bot | /tareas/bot/revisar-los-comprobantes-que-recibe-el-bot | ✅ | 4/4 | — |
| Q-BOT-12 | Saber por qué se rechazó un comprobante | /tareas/bot/revisar-los-comprobantes-que-recibe-el-bot o /problemas/bot/el-bot-no-registra-el-comprobante | ✅ | 4/4 | — |
| Q-BOT-13 | Que el bot registre solo el pago de los comprobantes | /tareas/bot/registrar-pagos-automaticamente-con-el-bot | ✅ | 4/4 | — |
| Q-BOT-14 | Qué hace el bot si el cliente paga de más o de menos | /tareas/bot/registrar-pagos-automaticamente-con-el-bot | ✅ | 4/4 | — |
| Q-BOT-15 | Que el bot no pregunte la cuenta cuando escribe el titular | /tareas/bot/registrar-pagos-automaticamente-con-el-bot | ✅ | 3/3 | — |
| Q-BOT-16 | Permitir que el cliente pida una promesa de pago por WhatsApp o por el | /tareas/bot/configurar-las-reglas-de-cobro-y-promesas o /guia/cobros-y-promesas-ajustes | ✅ | 4/4 | — |
| Q-BOT-17 | Límite de promesas por mes y por incumplidas | /tareas/bot/configurar-las-reglas-de-cobro-y-promesas | ✅ | 4/4 | — |
| Q-BOT-18 | Cambiar la antigüedad máxima que acepta el bot en un comprobante | /tareas/bot/configurar-las-reglas-de-cobro-y-promesas | ✅ | 4/4 | — |
| Q-BOT-19 | Costo de instalación y radio de cobertura que informa el bot | /tareas/bot/configurar-las-reglas-de-cobro-y-promesas | ✅ | 3/4 | — |
| Q-BOT-20 | Plantillas que necesita el bot con WhatsApp Oficial | /tareas/bot/configurar-las-plantillas-del-bot | ✅ | 4/4 | — |
| Q-BOT-21 | Crear una plantilla de chat para escribir después de 24 horas | /tareas/bot/configurar-las-plantillas-del-bot o /problemas/bandeja/no-puedo-escribirle-al-cliente-solo-plantillas | ✅ | 4/4 | — |
| Q-BOT-22 | Probar el asistente sin mandar mensajes reales | /tareas/bot/probar-el-asistente-con-el-simulador | ✅ | 4/4 | — |
| Q-BOT-23 | Cargar el token de OpenAI y elegir el modelo | /tareas/bot/conectar-la-ia-de-la-empresa | ✅ | 4/4 | — |
| Q-BOT-24 | Errores al guardar o verificar el token | /tareas/bot/conectar-la-ia-de-la-empresa o /guia/inteligencia-artificial | ✅ | 4/4 | — |
| Q-BOT-25 | Quitar el token de IA | /tareas/bot/conectar-la-ia-de-la-empresa | ✅ | 3/3 | — |
| Q-BOT-26 | Ver cuánto gasta la IA | /guia/inteligencia-artificial | ✅ | 4/4 | — |
| Q-BOT-27 | Dónde se usa la IA en ISPMAX | /guia/inteligencia-artificial | ✅ | 4/4 | — |
| Q-BOT-28 | Ocultar un plan para que el bot no lo ofrezca | /tareas/bot/elegir-los-planes-que-ofrece-el-bot | ✅ | 4/4 | — |
| Q-BOT-29 | Por qué no aparece la columna Mostrar en el bot | /tareas/bot/elegir-los-planes-que-ofrece-el-bot | ✅ | 3/3 | — |
| Q-BOT-30 | El bot no contesta a los clientes | /problemas/bot/el-bot-no-responde o /problemas/bandeja/el-bot-no-responde-a-un-cliente | ✅ | 4/4 | — |
| Q-BOT-31 | El comprobante quedó como promesa en lugar de registrar el pago | /problemas/bot/el-bot-no-registra-el-comprobante | ✅ | 4/4 | — |
| Q-BOT-32 | Pago registrado a mano cuando el bot no pudo | /problemas/bot/el-bot-no-registra-el-comprobante | ✅ | 3/3 | — |
| Q-BOT-33 | El cambio de Wi-Fi pedido por WhatsApp no se aplicó | /problemas/bot/el-cambio-de-wifi-no-se-aplico | ✅ | 4/4 | — |
| Q-BOT-34 | Reglas del nombre y la contraseña del Wi-Fi que acepta el bot | /problemas/bot/el-cambio-de-wifi-no-se-aplico o /referencia/lo-que-puede-hacer-el-bot | ✅ | 4/4 | — |
| Q-BOT-35 | El bot no da la promesa de pago | /problemas/bot/el-bot-no-ofrece-la-promesa-de-pago | ✅ | 4/4 | — |
| Q-BOT-36 | No veo las pestañas Conocimiento o Plantillas | /problemas/bot/no-veo-una-pestana-del-bot | ✅ | 4/4 | — |
| Q-BOT-37 | Qué trámites puede hacer el bot | /referencia/lo-que-puede-hacer-el-bot | ✅ | 3/4 | — |
| Q-BOT-38 | Qué es el titular para el bot | /referencia/lo-que-puede-hacer-el-bot | ✅ | 4/4 | — |
| Q-BOT-39 | Cuántas veces reinicia el bot un equipo y cuándo no lo hace | /referencia/lo-que-puede-hacer-el-bot | ✅ | 4/4 | — |
| Q-BOT-40 | Qué recibo o factura entrega el bot | /referencia/lo-que-puede-hacer-el-bot | ✅ | 4/4 | — |
| Q-BOT-41 | Configurar las llamadas con el asistente de voz | /guia/bot-configuraciones | ✅ | 4/4 | — |
| Q-BOT-42 | Elegir el modo de atención del bot | /guia/bot-configuraciones | ✅ | 4/4 | — |
| Q-BOT-43 | Cambiar el nombre y el trato del asistente | /guia/bot-configuraciones | ✅ | 4/4 | — |
| Q-BOT-44 | Ver cuánto resuelve el bot y qué piden los clientes | /guia/bot-de-whatsapp | ✅ | 4/4 | — |
| Q-EXTCORREO-01 | Encontrar el código (contraseña) de aplicación de Gmail | /tareas/ajustes/configurar-el-correo-con-gmail | ✅ | 6/6 | — |
| Q-EXTCORREO-02 | Saber qué contraseña va en el campo Contraseña del correo con Gmail | /tareas/ajustes/configurar-el-correo-con-gmail | ✅ | 5/5 | — |
| Q-EXTCORREO-03 | Elegir el puerto y la seguridad (SSL o TLS) con Gmail | /tareas/ajustes/configurar-el-correo-con-gmail | ✅ | 6/6 | — |
| Q-EXTCORREO-04 | Saber en qué campo va cada dato del correo | /tareas/ajustes/configurar-el-correo-con-gmail o /tareas/ajustes/configurar-el-correo-con-otro-proveedor | ✅ | 5/5 | — |
| Q-EXTCORREO-05 | Comprobar que el correo quedó bien y saber qué envía ISPMAX con esa cu | /tareas/ajustes/configurar-el-correo-con-gmail | ✅ | 6/6 | — |
| Q-EXTCORREO-06 | Resolver el error 535 / Username and Password not accepted al probar e | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion | ✅ | 6/6 | — |
| Q-EXTCORREO-07 | Resolver «Greeting never received» o «Connection timeout» en la prueba | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion | ✅ | 5/5 | — |
| Q-EXTCORREO-08 | Qué hacer si la prueba dice «Correo Enviado Exitosamente» pero el corr | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion | ✅ | 5/5 | — |
| Q-EXTCORREO-09 | Qué hacer si Google no muestra la opción de contraseñas de aplicación | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion o /tareas/ajustes/configurar-el-correo-con-gmail | ✅ | 5/5 | — |
| Q-EXTCORREO-10 | Entender por qué el correo funcionaba y dejó de funcionar | /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion o /problemas/mensajeria/los-mensajes-no-llegan-al-cliente | ✅ | 5/5 | — |
| Q-EXTCORREO-11 | Saber qué datos pedirle al proveedor del correo (hosting, cPanel u otr | /tareas/ajustes/configurar-el-correo-con-otro-proveedor | ✅ | 6/6 | — |
| Q-EXTCORREO-12 | Elegir SSL o TLS cuando el proveedor dice «SSL/TLS» y puerto 465 | /tareas/ajustes/configurar-el-correo-con-otro-proveedor | ✅ | 5/5 | — |
| Q-EXTCORREO-13 | Saber si se puede usar Outlook, Hotmail o Microsoft 365 como correo de | /tareas/ajustes/configurar-el-correo-con-otro-proveedor | ✅ | 6/6 | — |
| Q-EXTCORREO-14 | Configurar el correo con Zoho Mail | /tareas/ajustes/configurar-el-correo-con-otro-proveedor | ✅ | 5/5 | — |
| Q-EXTFAC-01 | Encontrar dónde se carga la firma electrónica (.p12) en ISPMAX | /tareas/ajustes/preparar-la-firma-electronica-p12-del-sri | ✅ | 6/6 | — |
| Q-EXTFAC-02 | Saber qué clave va en Clave Certificado | /tareas/ajustes/preparar-la-firma-electronica-p12-del-sri | ✅ | 6/6 | — |
| Q-EXTFAC-03 | Resolver «La contraseña del certificado esta incorrecta» o «El tipo de | /tareas/ajustes/preparar-la-firma-electronica-p12-del-sri | ✅ | 6/6 | — |
| Q-EXTFAC-04 | Renovar la firma electrónica vencida o por vencer | /tareas/ajustes/preparar-la-firma-electronica-p12-del-sri | ✅ | 6/6 | — |
| Q-EXTFAC-05 | Saber dónde se consigue la firma electrónica para facturar | /tareas/ajustes/preparar-la-firma-electronica-p12-del-sri | ✅ | 6/6 | — |
| Q-EXTFAC-06 | Sacar la API key de Dátil para la firma de contratos | /tareas/ajustes/conseguir-la-api-key-y-la-url-del-portal-de-datil | ✅ | 6/6 | — |
| Q-EXTFAC-07 | Saber qué escribir en URL del portal de Dátil | /tareas/ajustes/conseguir-la-api-key-y-la-url-del-portal-de-datil | ✅ | 6/6 | — |
| Q-EXTFAC-08 | Entender «Rechazada» o «Sin verificar» en la firma de contratos | /tareas/ajustes/conseguir-la-api-key-y-la-url-del-portal-de-datil | ✅ | 6/6 | — |
| Q-EXTFAC-09 | Distinguir la firma de contratos de Dátil de la firma electrónica del  | /tareas/ajustes/conseguir-la-api-key-y-la-url-del-portal-de-datil o /tareas/ajustes/preparar-la-firma-electronica-p12-del-sri | ✅ | 6/6 | — |
| Q-EXTFAC-10 | Conseguir el Client ID y el Client Secret de Factus | /tareas/ajustes/conseguir-las-credenciales-de-factus | ✅ | 6/6 | — |
| Q-EXTFAC-11 | Saber qué va en Email (usuario Factus) y Contraseña | /tareas/ajustes/conseguir-las-credenciales-de-factus | ✅ | 5/5 | — |
| Q-EXTFAC-12 | Pasar Factus de pruebas (sandbox) a producción | /tareas/ajustes/conseguir-las-credenciales-de-factus | ✅ | 5/5 | — |
| Q-EXTFAC-13 | Resolver «Error autenticando con Factus» o «Credenciales de Factus no  | /tareas/ajustes/conseguir-las-credenciales-de-factus | ✅ | 6/6 | — |
| Q-EXTPAS-01 | Saber dónde sacar el Token y el Store ID de PayPhone | /tareas/ajustes/conseguir-el-token-y-el-store-id-de-payphone | ✅ | 4/4 | — |
| Q-EXTPAS-02 | Distinguir el Store ID del número de la aplicación y el tipo API del t | /tareas/ajustes/conseguir-el-token-y-el-store-id-de-payphone | ✅ | 4/4 | — |
| Q-EXTPAS-03 | Arreglar el rechazo de credenciales de PayPhone | /tareas/ajustes/conseguir-el-token-y-el-store-id-de-payphone | ✅ | 4/4 | — |
| Q-EXTPAS-04 | Cambiar las horas que vale el enlace de cobro | /tareas/ajustes/conseguir-el-token-y-el-store-id-de-payphone | ✅ | 4/4 | — |
| Q-EXTPAS-05 | Saber dónde sacar la API Key y la Secret Key de dLocal Go | /tareas/ajustes/conseguir-la-api-key-y-la-secret-key-de-dlocal-go | ✅ | 4/4 | — |
| Q-EXTPAS-06 | Entender el ambiente de pruebas (sandbox) y el de producción de dLocal | /tareas/ajustes/conseguir-la-api-key-y-la-secret-key-de-dlocal-go | ✅ | 4/4 | — |
| Q-EXTPAS-07 | Resolver el rechazo de credenciales de dLocal Go | /tareas/ajustes/conseguir-la-api-key-y-la-secret-key-de-dlocal-go | ✅ | 4/4 | — |
| Q-EXTPAS-08 | Elegir el país en dLocal Go | /tareas/ajustes/conseguir-la-api-key-y-la-secret-key-de-dlocal-go | ✅ | 4/4 | — |
| Q-EXTPAS-09 | Decidir qué pasarela usar según el país | /tareas/ajustes/elegir-la-pasarela-de-pago | ✅ | 4/4 | — |
| Q-EXTPAS-10 | Saber qué cobra cada pasarela | /tareas/ajustes/elegir-la-pasarela-de-pago | ✅ | 4/4 | — |
| Q-EXTPAS-11 | Elegir con cuál pasarela se cobra cuando hay dos listas | /tareas/ajustes/elegir-la-pasarela-de-pago | ✅ | 4/4 | — |
| Q-EXTPAS-12 | Entender qué es la pestaña Pago Internet y por qué no genera enlaces | /tareas/ajustes/elegir-la-pasarela-de-pago | ✅ | 4/4 | — |
| Q-EXTRED-01 | Saber de dónde sale la API key de SmartOLT y dónde pegarla | /tareas/ajustes/conseguir-la-api-key-de-smartolt | ✅ | 6/6 | — |
| Q-EXTRED-02 | Saber qué escribir en el campo del dominio de SmartOLT | /tareas/ajustes/conseguir-la-api-key-de-smartolt | ✅ | 5/5 | — |
| Q-EXTRED-03 | Entender por qué SmartOLT no aparece en el menú lateral | /tareas/ajustes/conseguir-la-api-key-de-smartolt | ✅ | 4/5 | — |
| Q-EXTRED-04 | Entender el aviso de pausa por límite de llamadas de SmartOLT | /tareas/ajustes/conseguir-la-api-key-de-smartolt | ✅ | 5/5 | — |
| Q-EXTRED-05 | Saber de dónde sale el token (API Key) de AdminOLT | /tareas/ajustes/conseguir-la-api-key-y-el-subdominio-de-adminolt | ✅ | 5/5 | — |
| Q-EXTRED-06 | Saber qué escribir en el Subdominio de AdminOLT | /tareas/ajustes/conseguir-la-api-key-y-el-subdominio-de-adminolt | ✅ | 5/5 | — |
| Q-EXTRED-07 | Entender por qué AdminOLT no carga las OLT y no avisa de error | /tareas/ajustes/conseguir-la-api-key-y-el-subdominio-de-adminolt | ✅ | 4/4 | — |
| Q-EXTRED-08 | Saber qué dejar listo en el MikroTik antes de agregarlo | /tareas/ajustes/preparar-un-router-mikrotik-para-ispmax | ✅ | 5/5 | — |
| Q-EXTRED-09 | Saber qué permisos necesita el usuario API del MikroTik | /tareas/ajustes/preparar-un-router-mikrotik-para-ispmax | ✅ | 5/5 | — |
| Q-EXTRED-10 | Saber cuándo activar Detrás de NAT | /tareas/ajustes/preparar-un-router-mikrotik-para-ispmax | ✅ | 5/5 | — |
| Q-EXTRED-11 | Entender el error al guardar un router por API sin SSL | /tareas/ajustes/preparar-un-router-mikrotik-para-ispmax | ✅ | 5/5 | — |
| Q-EXTWA-01 | Saber de dónde sale el Phone Number ID y el WABA ID de WhatsApp Oficia | /tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta | ✅ | 6/6 | — |
| Q-EXTWA-02 | Generar el Access Token permanente de WhatsApp Oficial en Meta | /tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta | ✅ | 6/6 | — |
| Q-EXTWA-03 | Distinguir el Access Token, el App Secret y el Verify Token | /tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta | ✅ | 6/6 | — |
| Q-EXTWA-04 | Saber qué PIN escribir al pulsar Registrar el número | /tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta | ✅ | 6/6 | — |
| Q-EXTWA-05 | Elegir entre Coexistencia (Dualhook) y Número dedicado (Meta) | /tareas/ajustes/elegir-entre-coexistencia-y-numero-dedicado | ✅ | 6/6 | — |
| Q-EXTWA-06 | Entender por qué no hay llamadas de WhatsApp con Coexistencia | /tareas/ajustes/elegir-entre-coexistencia-y-numero-dedicado | ✅ | 4/5 | — |
| Q-EXTWA-07 | Saber quién cobra WhatsApp Oficial con Dualhook o con Meta | /tareas/ajustes/elegir-entre-coexistencia-y-numero-dedicado | ✅ | 5/5 | — |
| Q-EXTWA-08 | Entender el aviso de abrir la app WhatsApp Business cada semana | /tareas/ajustes/elegir-entre-coexistencia-y-numero-dedicado | ✅ | 5/5 | — |
| Q-EXTWA-09 | Conseguir la Outbound API key (dh_live_) de Dualhook | /tareas/ajustes/conseguir-las-credenciales-de-dualhook | ✅ | 6/6 | — |
| Q-EXTWA-10 | Saber qué poner en Webhook Override de Dualhook | /tareas/ajustes/conseguir-las-credenciales-de-dualhook | ✅ | 5/5 | — |
| Q-EXTWA-11 | Conectar el número de la app WhatsApp Business con Dualhook | /tareas/ajustes/conseguir-las-credenciales-de-dualhook | ✅ | 6/6 | — |
| Q-EXTWA-12 | Encontrar el Phone Number ID y el WABA ID en Dualhook | /tareas/ajustes/conseguir-las-credenciales-de-dualhook | ✅ | 3/4 | — |
| Q-EXTWA-13 | Conseguir el token de OpenAI para ISPMAX | /tareas/ajustes/conseguir-el-token-de-openai-para-ispmax | ✅ | 5/5 | — |
| Q-EXTWA-14 | Saber si una suscripción de ChatGPT sirve como token | /tareas/ajustes/conseguir-el-token-de-openai-para-ispmax | ✅ | 4/4 | — |
| Q-EXTWA-15 | Saber quién cobra la inteligencia artificial y cómo cargar saldo | /tareas/ajustes/conseguir-el-token-de-openai-para-ispmax | ✅ | 5/5 | — |
| Q-EXTWA-16 | Saber qué pasa si se quita el token de OpenAI | /tareas/ajustes/conseguir-el-token-de-openai-para-ispmax | ✅ | 5/5 | — |

## Variantes que no encuentran la página

| ID | Formulación | Posición | Top-3 devuelto |
|---|---|---|---|
| Q-COB-004 | eliminar un pago | 4 | /referencia/catalogo-permisos, /problemas/cobranza/no-puedo-eliminar-una-factura, /guia/formas-pago |
| Q-CLI-012 | el cliente se fue qué hago | 4 | /tareas/ajustes/eliminar-clientes-en-bloque, /problemas/infraestructura/un-cliente-no-aparece-en-el-mapa, /tareas/red/asignar-clientes-a-una-antena-o-sector |
| Q-MSG-007 | ¿Cómo sé si Meta aprobó mi plantilla? | 4 | /problemas/mensajeria/plantilla-whatsapp-rechazada, /tareas/bot/configurar-las-plantillas-del-bot, /tareas/mensajeria/editar-un-mensaje-automatico |
| Q-MSG-009 | lista de mensajes de error del sistema | 4 | /guia/notificaciones, /guia/pasarelas-pago, /guia/estados |
| Q-RED-016 | clientes sin caja NAP | 4 | /problemas/infraestructura/no-encuentro-un-puerto-libre-en-la-caja-nap, /tareas/red/crear-una-caja-nap-y-asignar-un-puerto, /guia/nap |
| Q-MSG-201 | conectar el whatsapp del negocio al sistema | 5 | /tareas/bandeja/configurar-el-perfil-del-negocio-de-whatsapp, /tareas/ajustes/elegir-entre-coexistencia-y-numero-dedicado, /tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta |
| Q-MSG-213 | configurar el servidor smtp | 5 | /tareas/ajustes/configurar-el-correo-con-otro-proveedor, /problemas/ajustes/gmail-rechaza-la-contrasena-de-aplicacion, /tareas/ajustes/configurar-el-correo-con-gmail |
| Q-MSG-213 | puerto y seguridad ssl tls del correo | 4 | /tareas/ajustes/configurar-el-correo-con-otro-proveedor, /tareas/ajustes/configurar-el-correo-con-gmail, /preguntas/correo-y-servicios-externos |
| Q-SOP-213 | anular una instalación | 6 | /guia/estados, /guia/compras, /preguntas/retenciones-y-compras-xml |
| Q-RED-201 | por qué el router figura como Inactivo | 4 | /problemas/clientes/cliente-suspendido-sigue-navegando, /problemas/infraestructura/monitoreo-de-red-no-avisa-cuando-se-cae-un-equipo, /preguntas/clientes-y-servicios |
| Q-RED-201 | estados del router en el listado | 5 | /guia/routers, /tareas/red/migrar-clientes-a-otro-router, /guia/redes-ipv4 |
| Q-BAN-01 | dónde contesto los mensajes que le llegan al whatsapp de la empresa | 4 | /problemas/bot/el-bot-no-responde, /problemas/bandeja/el-bot-no-responde-a-un-cliente, /tareas/bot/activar-el-bot-y-decidir-cuando-responde |
| Q-BAN-34 | no puedo contestar un chat cerrado | 5 | /tareas/bot/activar-el-bot-y-decidir-cuando-responde, /problemas/bot/el-bot-no-responde, /guia/bandeja-de-conversaciones |
| Q-BAN-39 | cuál es la diferencia entre números sin bot y el interruptor bot | 4 | /preguntas/bot-y-asistente-ia, /tareas/ajustes/elegir-entre-coexistencia-y-numero-dedicado, /guia/bot-configuraciones |
| Q-COBVEN-01 | ¿Qué es Facturación libre? | 4 | /tareas/facturacion/emitir-una-factura-libre, /problemas/cobranza/no-puedo-eliminar-una-factura, /problemas/servicios/el-cargo-recurrente-no-sale-en-la-factura |
| Q-COBVEN-04 | pulsé guardar dos veces | 4 | /problemas/facturacion/no-puedo-cargar-el-xml-de-la-factura-del-proveedor, /problemas/cobranza/cobro-por-pasarela-pagado-sin-asentar, /problemas/servicios/el-cargo-recurrente-no-sale-en-la-factura |
| Q-EXT-10 | por qué no llega el enlace para cambiar mi clave | 4 | /tareas/acceso/recuperar-el-acceso, /tareas/acceso/cambiar-una-contrasena, /problemas/portal/el-cliente-no-puede-entrar-al-portal |
| Q-FINANZAS-22 | la factura ya está registrada en una compra | 4 | /tareas/almacen/registrar-una-compra, /tareas/almacen/importar-una-compra-desde-el-xml-del-proveedor, /guia/compras |
| Q-FINANZAS-25 | ¿Cómo activo las promesas de pago en el portal? | 4 | /tareas/portal/permitir-promesas-de-pago-desde-el-portal, /problemas/portal/el-cliente-no-ve-el-boton-de-promesa-de-pago, /guia/portal-facturas-y-pagos |
| Q-FINANZAS-25 | dónde habilito promesas para clientes | 4 | /problemas/clientes/un-cliente-con-deuda-no-se-corta, /problemas/portal/el-cliente-no-ve-el-boton-de-promesa-de-pago, /tareas/portal/permitir-promesas-de-pago-desde-el-portal |
| Q-BOT-19 | ¿Dónde pongo el costo de instalación que dice el bot? | 4 | /tareas/bot/conectar-la-ia-de-la-empresa, /guia/cobros-y-promesas-ajustes, /preguntas/bot-y-asistente-ia |
| Q-BOT-37 | ¿Qué puede hacer el bot de whatsapp? | 14 | /guia/bot-de-whatsapp, /problemas/bot/el-bot-no-responde, /problemas/bot/no-veo-una-pestana-del-bot |
| Q-EXTRED-03 | por qué solo veo AdminOLT y no SmartOLT | 4 | /problemas/red/la-onu-no-aparece-o-no-autoriza, /preguntas/olt-y-onu, /guia/resumen-de-la-onu |
| Q-EXTWA-06 | no puedo editar el perfil del negocio de whatsapp | 4 | /tareas/bandeja/configurar-el-perfil-del-negocio-de-whatsapp, /guia/perfil-del-negocio-de-whatsapp, /preguntas/bandeja-y-chats |
| Q-EXTWA-12 | de dónde saco los ids para coexistencia | 4 | /tareas/ajustes/conseguir-las-credenciales-de-whatsapp-oficial-con-meta, /referencia/servicios-externos, /preguntas/correo-y-servicios-externos |
