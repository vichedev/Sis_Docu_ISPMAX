-- Datos ficticios del grupo huecos-ajustes-servicios (c7). Solo filas propias (id con prefijo a7a7a7a7).
-- Los usan las capturas ajustes/problemas/04-05 (cambios masivos) y servicios/problemas/02-04 (alta de servicio y cargos).
-- Ejecutar: docker exec -i ispmax-local-pg psql -U postgres -d ispmax_local -v ON_ERROR_STOP=1 < c7-huecos-ajustes-servicios.sql
-- Supone el ROUTER DEMO (611d20e1-...), la sucursal 72de730f-... y la red IPv4 de los clientes de demostración.
-- El cliente queda con Aplicar Corte Desactivado y sin recordatorios para que ningún proceso automático lo toque.
BEGIN;
INSERT INTO internet (id, nombre_plan, descripcion, precio_plan, impuesto, "descarga_Mbps", "subida_Mbps", limit_at, burst_limit, burst_threshold, burst_time, prioridad, address_list, "isActive", router_id)
VALUES ('a7a7a7a7-0000-4000-8000-000000000001','PLAN DEMO MASIVO','Plan ficticio para cambios masivos',15.00,15,10,10,0,0,0,0,8,'',true,'611d20e1-7c22-4bb9-b376-b96576295e3b');
INSERT INTO customers (id, nombres, tipo_documento, numero_documento, celular, email, direccion, provincia, canton, "isActive", company_id)
SELECT 'a7a7a7a7-0000-4000-8000-000000000010','CLIENTE DEMO MASIVO (ajs)', tipo_documento,'0990000801','0990000801','masivo.ajs@demo.manual.local','Calle Ficticia 1','PICHINCHA','QUITO',true, company_id FROM customers WHERE numero_documento='0912345671';
INSERT INTO "factura-clientes" (id, tipo, dia_pago, crear_factura, tipo_impuesto, tipo_comprobante, dia_gracia, aplicar_corte, direccion_comprobante, recordatorio_pago, customer_id)
VALUES ('a7a7a7a7-0000-4000-8000-000000000020','Postpago',15,'Desactivado','IVA','Factura','3 días','Desactivado','principal','{Ninguno}','a7a7a7a7-0000-4000-8000-000000000010');
INSERT INTO "servicios-clientes" (id, contrato, direccion, precio, fecha_instalacion, ipv4, tipo_conexion, "isActive", deleted, customer_id, factura_id, router_id, perfil_internet, red_id)
SELECT 'a7a7a7a7-0000-4000-8000-000000000030', 987001, 'Calle Ficticia 1', 15.00, '2026-08-23','10.10.10.95', tipo_conexion, true, false,
 'a7a7a7a7-0000-4000-8000-000000000010','a7a7a7a7-0000-4000-8000-000000000020', router_id, 'a7a7a7a7-0000-4000-8000-000000000001', red_id
FROM "servicios-clientes" WHERE id='ebd51e95-50e8-4855-9cb2-20b64de58e56';
INSERT INTO pagos (id, pagos, "estadoSRI", tipo_impuesto, dia_pago, total_servicio, tipo_comprobante, tipo_factura, "detalleFacturaLibre", servicio_id, sucursal_id)
VALUES ('a7a7a7a7-0000-4000-8000-000000000040','[]','NO PAGADO','IVA','2026-09-15',17.25,'Factura','FACT. DE SERVICIO',
 '{"items":[{"iva":15,"tipo":"servicio","precio":15,"cantidad":1,"descuento":0,"descripcion":"Plan ficticio para cambios masivos","costoServicio":15,"tipo_impuesto":"IVA"}]}',
 'a7a7a7a7-0000-4000-8000-000000000030','72de730f-188a-42e7-906c-6a796d53b274');
INSERT INTO "servicios-recurrentes" (id, tipo_pago, tipo_impuesto, monto, descuento, tipo_comprobante, tipo_factura, "detalleItems", estado, created_at, updated_at, servicio_id) VALUES
('a7a7a7a7-0000-4000-8000-000000000051','Mensualmente','IVA',3,'0','Factura','FACT. DE SERVICIO',
 '{"items":[{"esItemPersonalizado":true,"descripcion":"ALQUILER DE ONU","cantidad":1,"iva":15,"ice":null,"valor_ice":0,"tipo_ice":null,"descuento":0,"precio":3,"tipo_impuesto":"IVA","costoServicio":3}]}'::jsonb,'activo','2026-10-10 10:00:00','2026-10-10 10:00:00','a7a7a7a7-0000-4000-8000-000000000030'),
('a7a7a7a7-0000-4000-8000-000000000052','Pago en 3 Cuotas','IVA',30,'0','Factura','FACT. DE SERVICIO',
 '{"items":[{"esItemPersonalizado":true,"descripcion":"CUOTAS DE ANTENA","cantidad":1,"iva":15,"ice":null,"valor_ice":0,"tipo_ice":null,"descuento":0,"precio":30,"tipo_impuesto":"IVA","costoServicio":30}]}'::jsonb,'suspendido','2026-10-11 10:00:00','2026-10-11 10:00:00','a7a7a7a7-0000-4000-8000-000000000030'),
('a7a7a7a7-0000-4000-8000-000000000053','Un solo pago','IVA',10,'0','Factura','FACT. DE SERVICIO',
 '{"items":[{"esItemPersonalizado":true,"descripcion":"VISITA TECNICA","cantidad":1,"iva":15,"ice":null,"valor_ice":0,"tipo_ice":null,"descuento":0,"precio":10,"tipo_impuesto":"IVA","costoServicio":10}]}'::jsonb,'completado','2026-10-12 10:00:00','2026-10-12 10:00:00','a7a7a7a7-0000-4000-8000-000000000030'),
('a7a7a7a7-0000-4000-8000-000000000054','Mensualmente','Ninguno',2,'0','Recibo','FACT. LIBRE',
 '{"items":[{"esItemPersonalizado":true,"descripcion":"IP PUBLICA FIJA","cantidad":1,"iva":0,"ice":null,"valor_ice":0,"tipo_ice":null,"descuento":0,"precio":2,"tipo_impuesto":"Ninguno","costoServicio":2}]}'::jsonb,'cancelado','2026-10-13 10:00:00','2026-10-13 10:00:00','a7a7a7a7-0000-4000-8000-000000000030');
COMMIT;

-- Usuario con permisos limitados (capturas ajustes/problemas/06-07). No se versiona la contraseña: se genera un hash
-- bcrypt local (htpasswd -bnBC 10 "" "<clave>", cambiando $2y$ por $2a$) y se inserta así, con la clave guardada fuera del repo:
--   INSERT INTO users (email, password, usuario, "fullName", celular, roles, routers, permisos, horarios_dias, horarios_time,
--                      "isActive", logout, sucursales, "companyId")
--   SELECT 'demo.ajustes@ispmax.local', '<hash>', 'demo.ajustes', 'AJUSTES DEMO', '0990000902', ARRAY['SOPORTE DEMO'], routers,
--          ARRAY['variables.facturacion','ver.logs','base-datos.campos','index.usuario'],
--          ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'], ARRAY['00:00','23:59'], true, false,
--          sucursales, "companyId" FROM users WHERE email='demo.soporte@ispmax.local';
-- Para la captura 07 el usuario se deja solo con permisos ARRAY['base-datos.campos'].
