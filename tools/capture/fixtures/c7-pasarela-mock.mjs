#!/usr/bin/env node
/**
 * Genera `c7-pasarela-mock.json`: respuestas simuladas (`mock`) del servicio de pasarelas de pago para capturar
 * Ajustes → Pasarelas de Pagos, Cobros por pasarela y el diálogo de enlace de cobro. La instancia de pruebas no tiene
 * pasarela (el backend la pide a un servicio externo): aquí se simula una PayPhone "verificada" con datos inventados,
 * enlaces en `pagos.example.test` (dominio reservado, no resuelve) y clientes y facturas de la instancia ficticia.
 *
 *   node c7-pasarela-mock.mjs
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const cobro = (n, estado, factura, cliente, cliente_id, monto, extra = {}) => ({
  paymentId: `11111111-1111-4111-8111-0000000000${String(n).padStart(2, '0')}`, estado, proveedor: 'payphone', metodo: 'card',
  monto, moneda: 'USD', referencia: `Factura ${factura}`, autorizacion: null, tarjeta: null,
  url: ['created', 'pending'].includes(estado) ? `https://pagos.example.test/c/demo-${factura}` : null,
  creadoEn: '2026-10-25T13:00:00.000Z', expiraEn: null, confirmadoEn: null,
  duplicados: 0, duplicados_detalle: [], duplicados_revisado_en: null, pago_id: null, servicio_id: null,
  no_factura: factura, cliente, cliente_id, asentado: null, abono_anulado: null, ...extra,
});
const pagado = (n, factura, cliente, cid, monto, tarjeta, aut, creado, pagadoEn) =>
  cobro(n, 'approved', factura, cliente, cid, monto, { tarjeta, autorizacion: aut, creadoEn: creado, confirmadoEn: pagadoEn, asentado: true, abono_anulado: false, duplicados_revisado_en: pagadoEn });

const items = [
  cobro(1, 'pending', 42, 'CARLOS ALBERTO MENA', 'f334b5fe-ca6b-40c0-8172-dccc1598fa76', '7.25', { creadoEn: '2026-10-25T13:40:00.000Z', expiraEn: '2026-10-28T13:40:00.000Z' }),
  cobro(2, 'created', 57, 'GABRIELA ALEXANDRA VERA', '702cb6cc-f129-4b98-a981-a3fb96c53340', '34.50', { creadoEn: '2026-10-25T12:10:00.000Z', expiraEn: '2026-10-28T12:10:00.000Z' }),
  pagado(3, 43, 'PATRICIA ELENA SALAZAR', '9ba55c3b-8c11-4eb3-ab9a-8ca9b84d269e', '23.00', 'Visa 4242', 'DEMO-AUT-0003', '2026-10-24T09:14:00.000Z', '2026-10-24T09:21:00.000Z'),
  pagado(4, 40, 'ANA LUCÍA CÓRDOVA', '22fe914f-4e1a-4d93-8380-5f4ed6cad627', '34.50', 'Visa 4242', 'DEMO-AUT-0001', '2026-10-23T13:03:00.000Z', '2026-10-23T13:10:00.000Z'),
  pagado(5, 39, 'JOSÉ LUIS ANDRADE', '2c2a71b1-a2e3-49a8-a0f5-afa5a82b406b', '23.00', 'Mastercard 4444', 'DEMO-AUT-0002', '2026-10-23T12:55:00.000Z', '2026-10-23T12:58:00.000Z'),
  cobro(6, 'failed', 56, 'GABRIELA ALEXANDRA VERA', '702cb6cc-f129-4b98-a981-a3fb96c53340', '23.00', { creadoEn: '2026-10-22T16:30:00.000Z', expiraEn: '2026-10-25T16:30:00.000Z' }),
  pagado(7, 41, 'MARÍA FERNANDA LEMA', '67ea4ce8-d65e-482c-a7ae-fa0742c6fd1b', '17.25', 'Visa 1881', 'DEMO-AUT-0004', '2026-10-21T10:02:00.000Z', '2026-10-21T10:05:00.000Z'),
  cobro(8, 'expired', 31, 'PEDRO PABLO CEDEÑO', '1cfde3d6-e3a2-4795-b046-01beebc397cd', '17.25', { creadoEn: '2026-10-18T08:00:00.000Z', expiraEn: '2026-10-21T08:00:00.000Z' }),
];

const mock = [
  { url: '/pasarelas-pago/disponibilidad', json: { disponible: true, metodos: ['payment_link'], motivo: null, proveedor: 'payphone', proveedores: ['payphone'], montoMinimoCentavos: 100 } },
  { url: '/pasarelas-pago/catalogo', json: [
    { id: 'payphone', methods: [{ method: 'payment_link', credentialProfile: 'api' }] },
    { id: 'dlocalgo', methods: [{ method: 'payment_link', credentialProfile: 'default' }] },
  ] },
  { url: '/pasarelas-pago/config', exact: true, method: 'GET', json: [
    { providerId: 'payphone', profile: 'api', lastVerifiedOk: true, lastVerifiedAt: '2026-10-25T13:00:00.000Z', keys: ['token', 'storeId'] },
  ] },
  { url: '/pasarelas-pago/cobros/resumen', json: { byStatus: [
    { status: 'approved', count: 4, amountCents: 9775 }, { status: 'pending', count: 1, amountCents: 725 },
    { status: 'created', count: 1, amountCents: 3450 }, { status: 'failed', count: 1, amountCents: 2300 }, { status: 'expired', count: 1, amountCents: 1725 },
  ] } },
  { url: '/pasarelas-pago/cobros', exact: true, method: 'GET', json: { items, total: items.length } },
  // diálogo "Enlace de cobro" de la factura 42 (el alta real la hace el servicio externo)
  { url: '/pasarelas-pago/cobro/', method: 'POST', json: {
    grupo: null, enlacesDesactualizados: [], paymentId: '11111111-1111-4111-8111-000000000001', url: 'https://pagos.example.test/c/demo-42',
    estado: 'created', amountCents: 725, monto: '7.25', moneda: 'USD', referencia: 'Factura N° 42', expiraEn: '2026-10-28T15:00:00.000Z', noFactura: 42, reutilizado: false } },
];
writeFileSync(path.join(HERE, 'c7-pasarela-mock.json'), JSON.stringify(mock, null, 1));
console.log(`${mock.length} respuestas simuladas, ${items.length} cobros`);
