BEGIN;
INSERT INTO routers (id, sucursal, nombre, user_api, tipo_router, password_api, registro_trafico, ip_host, control_velocidad, puerto_api, "isActive", online, company_id, puerto_ssl, version_ros)
SELECT 'b0b0b0b0-0000-4000-8000-000000000001', sucursal, 'ROUTER BORRADO DEMO', 'demo', 'MikroTik', 'demo', 'No', '192.0.2.20', 'colas_simples', 8728, false, false, company_id, '443', '6.49.10'
FROM routers WHERE nombre = 'ROUTER DEMO';
INSERT INTO "redes-ipv4" (id, nombre, red, cidr, tipo_uso, gateway, broadcast, "isActive", router_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000002','RED BORRADO DEMO','10.20.20.0','24 (255.255.255.0/24 - 254 hosts, 256 IP)','Estatico','10.20.20.1','10.20.20.255',true,'b0b0b0b0-0000-4000-8000-000000000001');
INSERT INTO internet (id, nombre_plan, descripcion, precio_plan, impuesto, "descarga_Mbps", "subida_Mbps", prioridad, address_list, "isActive", router_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000003','PLAN BORRADO 5 MBPS','Plan de demostración para el borrado',10.00,15,5,5,8,'',true,'b0b0b0b0-0000-4000-8000-000000000001');
INSERT INTO "cajas-nap" (id, nombre, coordenadas, ubicacion, detalles, estado, potencia, "isActive", router_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000004','NAP-BORRADO','-79.8800, -2.1600','Calle 9 y Av. Demo','Caja de demostración para el borrado','Activo','-18',true,'b0b0b0b0-0000-4000-8000-000000000001');
INSERT INTO customers (id, nombres, tipo_documento, numero_documento, celular, email, direccion, provincia, canton, company_id)
SELECT v.id::uuid, v.nombres, '05', v.doc, v.cel, v.email, 'Calle Demo ' || v.n, 'PICHINCHA', 'QUITO', c.company_id
FROM (VALUES
 ('b0b0b0b0-0000-4000-8000-000000000011','CLIENTE BORRADO DEMO UNO','0900000001','0990000001','borrado1@demo.manual.local','1'),
 ('b0b0b0b0-0000-4000-8000-000000000012','CLIENTE BORRADO DEMO DOS','0900000002','0990000002','borrado2@demo.manual.local','2'),
 ('b0b0b0b0-0000-4000-8000-000000000013','CLIENTE BORRADO DEMO TRES','0900000003','0990000003','borrado3@demo.manual.local','3')
) AS v(id, nombres, doc, cel, email, n)
CROSS JOIN (SELECT company_id FROM customers WHERE id = 'f334b5fe-ca6b-40c0-8172-dccc1598fa76') c;
INSERT INTO "factura-clientes" (id, tipo, dia_pago, crear_factura, tipo_impuesto, tipo_comprobante, dia_gracia, aplicar_corte, recordatorio_pago, customer_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000021','Postpago',15,'Desactivado','IVA','Factura','3 días','1 Mes Vencido','{}','b0b0b0b0-0000-4000-8000-000000000011'),
 ('b0b0b0b0-0000-4000-8000-000000000022','Postpago',15,'Desactivado','IVA','Factura','3 días','1 Mes Vencido','{}','b0b0b0b0-0000-4000-8000-000000000012'),
 ('b0b0b0b0-0000-4000-8000-000000000023','Postpago',15,'Desactivado','IVA','Factura','3 días','1 Mes Vencido','{}','b0b0b0b0-0000-4000-8000-000000000013');
INSERT INTO "servicios-clientes" (id, contrato, direccion, precio, fecha_instalacion, ipv4, tipo_conexion, "isActive", deleted, customer_id, factura_id, router_id, perfil_internet, red_id, caja_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000031',9001,'Calle Demo 1',10.00,'2026-10-01','10.20.20.11','ip',false,false,'b0b0b0b0-0000-4000-8000-000000000011','b0b0b0b0-0000-4000-8000-000000000021','b0b0b0b0-0000-4000-8000-000000000001','b0b0b0b0-0000-4000-8000-000000000003','b0b0b0b0-0000-4000-8000-000000000002','b0b0b0b0-0000-4000-8000-000000000004'),
 ('b0b0b0b0-0000-4000-8000-000000000032',9002,'Calle Demo 1 (local)',10.00,'2026-10-01','10.20.20.12','ip',false,false,'b0b0b0b0-0000-4000-8000-000000000011','b0b0b0b0-0000-4000-8000-000000000021','b0b0b0b0-0000-4000-8000-000000000001','b0b0b0b0-0000-4000-8000-000000000003','b0b0b0b0-0000-4000-8000-000000000002','b0b0b0b0-0000-4000-8000-000000000004'),
 ('b0b0b0b0-0000-4000-8000-000000000033',9003,'Calle Demo 2',10.00,'2026-10-01','10.20.20.13','ip',false,false,'b0b0b0b0-0000-4000-8000-000000000012','b0b0b0b0-0000-4000-8000-000000000022','b0b0b0b0-0000-4000-8000-000000000001','b0b0b0b0-0000-4000-8000-000000000003','b0b0b0b0-0000-4000-8000-000000000002','b0b0b0b0-0000-4000-8000-000000000004'),
 ('b0b0b0b0-0000-4000-8000-000000000034',9004,'Calle Demo 3',10.00,'2026-10-01','10.20.20.14','ip',false,false,'b0b0b0b0-0000-4000-8000-000000000013','b0b0b0b0-0000-4000-8000-000000000023','b0b0b0b0-0000-4000-8000-000000000001','b0b0b0b0-0000-4000-8000-000000000003','b0b0b0b0-0000-4000-8000-000000000002','b0b0b0b0-0000-4000-8000-000000000004');
INSERT INTO pagos ("estadoSRI", tipo_impuesto, dia_pago, total_servicio, tipo_comprobante, servicio_id, sucursal_id) VALUES
 ('NO PAGADO','IVA','2026-10-15',11.50,'Factura','b0b0b0b0-0000-4000-8000-000000000031','72de730f-188a-42e7-906c-6a796d53b274'),
 ('NO PAGADO','IVA','2026-10-15',11.50,'Factura','b0b0b0b0-0000-4000-8000-000000000033','72de730f-188a-42e7-906c-6a796d53b274');
INSERT INTO contratos (id, titulo, "fechaInicio", "fechaFin", duracion, estado, "servicioId") VALUES
 ('b0b0b0b0-0000-4000-8000-000000000041','Contrato de adhesión demo','2026/10/01','2027/10/01',12,'Esperando aprobación de cliente','b0b0b0b0-0000-4000-8000-000000000031');
COMMIT;
BEGIN;
INSERT INTO internet (id, nombre_plan, descripcion, precio_plan, impuesto, "descarga_Mbps", "subida_Mbps", prioridad, address_list, "isActive", router_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000005','PLAN BORRADO 10 MBPS','Segundo plan de demostración para el borrado',15.00,15,10,10,8,'',true,'b0b0b0b0-0000-4000-8000-000000000001');
INSERT INTO customers (id, nombres, tipo_documento, numero_documento, celular, email, direccion, provincia, canton, company_id)
SELECT 'b0b0b0b0-0000-4000-8000-000000000014', 'CLIENTE BORRADO DEMO CUATRO', '05', '0900000004', '0990000004', 'borrado4@demo.manual.local', 'Calle Demo 4', 'PICHINCHA', 'QUITO', company_id
FROM customers WHERE id = 'f334b5fe-ca6b-40c0-8172-dccc1598fa76';
INSERT INTO "factura-clientes" (id, tipo, dia_pago, crear_factura, tipo_impuesto, tipo_comprobante, dia_gracia, aplicar_corte, recordatorio_pago, customer_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000024','Postpago',15,'Desactivado','IVA','Factura','3 días','1 Mes Vencido','{}','b0b0b0b0-0000-4000-8000-000000000014');
INSERT INTO "servicios-clientes" (id, contrato, direccion, precio, fecha_instalacion, ipv4, tipo_conexion, "isActive", deleted, customer_id, factura_id, router_id, perfil_internet, red_id, caja_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000035',9005,'Calle Demo 4 (plan 5)',10.00,'2026-10-01','10.20.20.15','ip',true,false,'b0b0b0b0-0000-4000-8000-000000000014','b0b0b0b0-0000-4000-8000-000000000024','b0b0b0b0-0000-4000-8000-000000000001','b0b0b0b0-0000-4000-8000-000000000003','b0b0b0b0-0000-4000-8000-000000000002','b0b0b0b0-0000-4000-8000-000000000004'),
 ('b0b0b0b0-0000-4000-8000-000000000036',9006,'Calle Demo 4 (plan 10)',15.00,'2026-10-01','10.20.20.16','ip',true,false,'b0b0b0b0-0000-4000-8000-000000000014','b0b0b0b0-0000-4000-8000-000000000024','b0b0b0b0-0000-4000-8000-000000000001','b0b0b0b0-0000-4000-8000-000000000005','b0b0b0b0-0000-4000-8000-000000000002','b0b0b0b0-0000-4000-8000-000000000004');
INSERT INTO pagos (id, "estadoSRI", tipo_impuesto, dia_pago, total_servicio, tipo_comprobante, servicio_id, sucursal_id, "detalleFacturaLibre") VALUES
 ('b0b0b0b0-0000-4000-8000-000000000051','NO PAGADO','IVA','2026-10-15',11.50,'Factura','b0b0b0b0-0000-4000-8000-000000000035','72de730f-188a-42e7-906c-6a796d53b274','{"items": [{"iva": 15, "tipo": "servicio", "precio": 10, "cantidad": 1, "descuento": 0, "descripcion": "Plan de demostración para el borrado", "costoServicio": 10, "tipo_impuesto": "IVA"}]}'::jsonb),
 ('b0b0b0b0-0000-4000-8000-000000000052','NO PAGADO','IVA','2026-10-15',17.25,'Factura','b0b0b0b0-0000-4000-8000-000000000036','72de730f-188a-42e7-906c-6a796d53b274','{"items": [{"iva": 15, "tipo": "servicio", "precio": 15, "cantidad": 1, "descuento": 0, "descripcion": "Segundo plan de demostración para el borrado", "costoServicio": 15, "tipo_impuesto": "IVA"}]}'::jsonb);
INSERT INTO contratos (id, titulo, "fechaInicio", "fechaFin", duracion, estado, "servicioId") VALUES
 ('b0b0b0b0-0000-4000-8000-000000000042','Contrato de adhesión demo (plan 10)','2026/10/01','2027/10/01',12,'Esperando aprobación de cliente','b0b0b0b0-0000-4000-8000-000000000036');
INSERT INTO tickets (id, asunto, "fechaVisita", prioridad, agendado, turno, detalle, customer) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000061','Sin internet (demo del borrado)','2026-10-26','Alta','Oficina','Mañana','Ticket ficticio para comprobar el borrado en bloque','b0b0b0b0-0000-4000-8000-000000000014');
INSERT INTO invoices (id, clave_acceso, numero_comprobante, subtotal, descuento, iva, total, customer_id) VALUES
 ('b0b0b0b0-0000-4000-8000-000000000071','2610202601179000000100110019999990000019999999991','001-001-000999999',10.00,0,1.50,11.50,'b0b0b0b0-0000-4000-8000-000000000014');
COMMIT;
