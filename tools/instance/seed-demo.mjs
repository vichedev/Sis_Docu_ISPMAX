#!/usr/bin/env node
/**
 * Siembra datos sintéticos de demostración en la instancia AISLADA (contenedor `ispmax-local-pg`).
 * Requiere haber ejecutado antes `seed-base.mjs`. Es idempotente: no duplica si ya hay clientes.
 *
 * Crea: 1 router de ejemplo (IP de documentación 192.0.2.10, sin conexión real), 3 planes, 1 red IPv4,
 * 2 formas de pago, 10 clientes con servicio y facturas (pagadas, pendientes y vencidas).
 * Nada de esto toca equipos: la instancia no tiene acceso a ningún MikroTik.
 */
import { execFileSync } from 'node:child_process';

const CONTAINER = process.env.ISPMAX_PG_CONTAINER ?? 'ispmax-local-pg';
const DB = process.env.ISPMAX_PG_DB ?? 'ispmax_local';
if (CONTAINER === 'ispmax-pg' || DB === 'ispmax') {
  console.error('Rechazado: nunca apuntar a la BD real.');
  process.exit(2);
}

const NOMBRES = [
  ['María Fernanda Lema', '0912345671'], ['José Luis Andrade', '0912345672'], ['Ana Lucía Córdova', '0912345673'],
  ['Carlos Alberto Mena', '0912345674'], ['Patricia Elena Salazar', '0912345675'], ['Luis Miguel Torres', '0912345676'],
  ['Gabriela Alexandra Vera', '0912345677'], ['Diego Armando Pazmiño', '0912345678'], ['Rosa Elvira Chávez', '0912345679'],
  ['Pedro Pablo Cedeño', '0912345680'],
];
const PLANES = [
  ['PLAN 10 MBPS', 15.0, 10, 10, 'Internet residencial 10 Mbps'],
  ['PLAN 20 MBPS', 20.0, 20, 20, 'Internet residencial 20 Mbps'],
  ['PLAN 50 MBPS', 30.0, 50, 50, 'Internet 50 Mbps'],
];

const q = s => `'${String(s).replace(/'/g, "''")}'`;
let sql = `
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM customers) THEN RAISE NOTICE 'Ya hay clientes: no se siembra.'; RETURN; END IF;
END $$;
`;

sql += `
INSERT INTO routers (nombre, user_api, password_api, tipo_router, registro_trafico, ip_host, control_velocidad, puerto_api, puerto_ssl,
  company_id, sucursal, control_pppoe, online, version_ros, "isActive")
SELECT 'ROUTER DEMO', 'ispmax', 'demo', 'MikroTik', 'No', '192.0.2.10', 'colas_simples', 8728, '443',
  (SELECT id FROM companies LIMIT 1), ARRAY[(SELECT id::text FROM sucursales LIMIT 1)], false, true, '6.49.10', true
WHERE NOT EXISTS (SELECT 1 FROM routers);

INSERT INTO "redes-ipv4" (nombre, red, cidr, tipo_uso, router_id, gateway, broadcast, "isActive")
SELECT 'RED CLIENTES', '10.10.10.0', '24 (255.255.255.0/24 - 254 hosts, 256 IP)', 'Estatico', (SELECT id FROM routers LIMIT 1),
  '10.10.10.1', '10.10.10.255', true
WHERE NOT EXISTS (SELECT 1 FROM "redes-ipv4");
`;

for (const [n, precio, d, s, desc] of PLANES)
  sql += `INSERT INTO internet (nombre_plan, descripcion, precio_plan, impuesto, "descarga_Mbps", "subida_Mbps", prioridad, router_id, "isActive")
SELECT ${q(n)}, ${q(desc)}, ${precio}, 15, ${d}, ${s}, 8, (SELECT id FROM routers LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM internet WHERE nombre_plan = ${q(n)});\n`;

sql += `
INSERT INTO "forma-pago" (nombre, codigo_forma_pago, company_id, "isActive")
SELECT x.n, x.c, (SELECT id FROM companies LIMIT 1), true FROM (VALUES ('EFECTIVO','01'),('TRANSFERENCIA','20')) AS x(n,c)
WHERE NOT EXISTS (SELECT 1 FROM "forma-pago");
`;

NOMBRES.forEach(([nombre, doc], i) => {
  const plan = PLANES[i % PLANES.length];
  const ip = `10.10.10.${10 + i}`;
  const diaPago = [1, 5, 10, 15, 20][i % 5];
  const slug = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')[0];
  sql += `
WITH c AS (
  INSERT INTO customers (nombres, tipo_documento, numero_documento, celular, email, direccion, company_id, provincia, canton, "isActive")
  VALUES (${q(nombre.toUpperCase())}, '05', ${q(doc)}, ${q('09' + String(90000000 + i * 1111).slice(0, 8))}, ${q(slug + i + '@demo.manual.local')},
    ${q('Calle ' + (i + 1) + ' y Av. Principal, Barrio Centro')}, (SELECT id FROM companies LIMIT 1), 'PICHINCHA', 'QUITO', true)
  RETURNING id
), f AS (
  INSERT INTO "factura-clientes" (tipo, dia_pago, tipo_impuesto, tipo_comprobante, dia_gracia, aplicar_corte, recordatorio_pago, customer_id, crear_factura)
  SELECT 'Postpago', ${diaPago}, 'IVA', 'Factura', '3 días', '1 Mes Vencido', ARRAY['WhatsApp'], c.id, 'Desactivado' FROM c
  RETURNING id, customer_id
), s AS (
  INSERT INTO "servicios-clientes" (direccion, precio, fecha_instalacion, ipv4, "isActive", customer_id, factura_id, router_id, perfil_internet, red_id, deleted, tipo_conexion, contrato)
  SELECT ${q('Calle ' + (i + 1) + ' y Av. Principal, Barrio Centro')}, ${plan[1]}, (CURRENT_DATE - ${60 + i * 7}), ${q(ip)}, ${i === 7 ? 'false' : 'true'},
    f.customer_id, f.id, (SELECT id FROM routers LIMIT 1), (SELECT id FROM internet WHERE nombre_plan = ${q(plan[0])}),
    (SELECT id FROM "redes-ipv4" LIMIT 1), false, 'ip', ${1000 + i}
  FROM f RETURNING id
)
INSERT INTO pagos ("estadoSRI", dia_pago, servicio_id, sucursal_id, pagos, total_servicio, tipo_impuesto, tipo_comprobante, tipo_factura, "detalleFacturaLibre")
SELECT m.estado, (date_trunc('month', CURRENT_DATE) + ((${diaPago} - 1) || ' days')::interval + (m.off || ' month')::interval)::date,
  s.id, (SELECT id FROM sucursales LIMIT 1),
  CASE WHEN m.estado = 'PAGADO' THEN jsonb_build_array(jsonb_build_object('valor', ${(plan[1] * 1.15).toFixed(2)}, 'fecha_abono', to_char(CURRENT_DATE - 20, 'YYYY-MM-DD'),
    'hora_abono', '10:15', 'forma_pago', 'EFECTIVO', 'estadoSRI', 'PAGADO', 'usuario', 'ADMINISTRADOR DEMO', 'numAbono', '00000001')) ELSE '[]'::jsonb END,
  ${(plan[1] * 1.15).toFixed(2)}, 'IVA', 'Factura', 'FACT. DE SERVICIO',
  jsonb_build_object('items', jsonb_build_array(jsonb_build_object('tipo','servicio','iva',15,'precio',${plan[1]},'cantidad',1,'descuento',0,
    'descripcion', ${q(plan[4])}, 'costoServicio', ${plan[1]}, 'tipo_impuesto','IVA')))
FROM s, (VALUES ('PAGADO', -2, 1), ('PAGADO', -1, 2), ('${i % 3 === 0 ? 'NO PAGADO' : 'PAGADO'}', 0, 3)) AS m(estado, off, n);
`;
});

sql += `
COMMIT;
SELECT 'customers' t, count(*) FROM customers UNION ALL SELECT 'servicios', count(*) FROM "servicios-clientes"
UNION ALL SELECT 'facturas', count(*) FROM pagos UNION ALL SELECT 'planes', count(*) FROM internet;
`;

const out = execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-At'], {
  input: sql,
  encoding: 'utf8',
});
console.log(out.trim());
