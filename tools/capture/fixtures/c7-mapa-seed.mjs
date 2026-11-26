#!/usr/bin/env node
/**
 * Genera `c7-mapa-seed.sql` y `c7-mapa-revert.sql`: postes, tramos de fibra y 3 cajas NAP FICTICIOS (coordenadas
 * inventadas, sobre las calles del mapa de `c7-mapa-estilo.mjs`) y reparte 9 servicios de la instancia de pruebas
 * en esas cajas, para que /mapa-nap tenga qué dibujar. Todos los ids propios empiezan por `c7`.
 *
 *   node c7-mapa-seed.mjs
 *   docker exec -i ispmax-local-pg psql -U postgres -d ispmax_local < c7-mapa-seed.sql     # sembrar
 *   docker exec -i ispmax-local-pg psql -U postgres -d ispmax_local < c7-mapa-revert.sql   # deshacer
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const O = { lng: -79.886, lat: -2.17 }, M_LNG = 111240, M_LAT = 110570, TH = (53 * Math.PI) / 180;
const ll = (u, v) => {
  const e = u * Math.cos(TH) - v * Math.sin(TH), n = u * Math.sin(TH) + v * Math.cos(TH);
  return [+(O.lng + e / M_LNG).toFixed(6), +(O.lat + n / M_LAT).toFixed(6)];
};
const ROUTER = '611d20e1-7c22-4bb9-b376-b96576295e3b'; // ROUTER DEMO
const id = (g, n) => `c700000${g}-0000-4000-8000-${String(n).padStart(12, '0')}`;
const esc = s => s.replace(/'/g, "''");
const sql = [];

// Cajas NAP (u, v en el plano del mapa ficticio)
const cajas = [
  { n: 1, nombre: 'NAP-SUR-01', u: 280, v: -120, ubic: 'Calle 7 y Av. 6', det: 'Caja de distribución del sector sur' },
  { n: 2, nombre: 'NAP-SUR-02', u: 140, v: -240, ubic: 'Calle 6 y Av. 5', det: 'Caja de distribución del sector sur' },
  { n: 3, nombre: 'NAP-ESTE-01', u: 700, v: 120, ubic: 'Calle 9 y Av. 10', det: 'Caja de distribución del sector este' },
];
for (const c of cajas) {
  const [lng, lat] = ll(c.u, c.v);
  sql.push(`INSERT INTO "cajas-nap" (id, nombre, coordenadas, ubicacion, detalles, estado, potencia, "isActive", router_id) VALUES ('${id(2, c.n)}', '${c.nombre}', '${lng}, ${lat}', '${esc(c.ubic)}', '${esc(c.det)}', 'Activo', '-18', true, '${ROUTER}');`);
  for (let p = 1; p <= 8; p++) sql.push(`INSERT INTO puertos (id, puerto, "isActive", "cajaNap_id") VALUES ('${id(3, c.n * 100 + p)}', ${p}, true, '${id(2, c.n)}');`);
}

// Servicios ya existentes en la instancia (contratos 1000-1008) repartidos en las cajas nuevas; 1009 con coordenadas y sin caja.
const reparto = [
  [1000, 1, 1, -35, 30], [1001, 1, 2, 40, 28], [1002, 1, 3, 25, -45], [1003, 1, 4, -50, -30],
  [1004, 2, 1, 30, 35], [1005, 2, 2, -40, 40],
  [1006, 3, 1, 45, 30], [1007, 3, 2, -30, 45], [1008, 3, 3, 20, -50],
];
for (const [contrato, caja, puerto, du, dv] of reparto) {
  const c = cajas[caja - 1];
  const [lng, lat] = ll(c.u + du, c.v + dv);
  sql.push(`UPDATE "servicios-clientes" SET caja_id = '${id(2, c.n)}', puerto_id = '${id(3, c.n * 100 + puerto)}', coordenadas = '${lng}, ${lat}' WHERE contrato = ${contrato} AND caja_id IS NULL;`);
}
{ const [lng, lat] = ll(420, 230); sql.push(`UPDATE "servicios-clientes" SET coordenadas = '${lng}, ${lat}' WHERE contrato = 1009 AND coordenadas IS NULL;`); }

// Postes: sobre la avenida v=0 (A → B), luego hacia el este (B → C) y por la calle del sur
const postes = [];
const pt = (u, v, tipo = 'poste', obs = null) => postes.push({ u, v, tipo, obs });
for (let u = 0; u <= 560; u += 70) pt(u, 0, u === 0 ? 'nodo' : u === 280 ? 'manga' : u % 140 === 0 ? 'poste municipal' : 'poste');
for (let u = 560; u <= 840; u += 70) pt(u, 0, u === 700 ? 'manga' : 'poste');
pt(840, -60); pt(840, -120, 'poste municipal'); pt(910, -120, 'c_nap', 'Punto de derivación');
for (let v = -120; v >= -240; v -= 60) pt(280, v, v === -240 ? 'poste municipal' : 'poste');
pt(210, -240, 'poste'); pt(140, -240, 'c_nap', 'Punto de derivación'); pt(140, -180, 'no pasa fibra', 'Poste de tendido eléctrico sin fibra');
postes.forEach((p, i) => {
  const [lng, lat] = ll(p.u, p.v);
  const cod = `P-${String(i + 1).padStart(3, '0')}`;
  sql.push(`INSERT INTO postes (id, codigo, tipo, observacion, lat, lng, "isActive", router_id) VALUES ('${id(0, i + 1)}', '${cod}', '${esc(p.tipo)}', ${p.obs ? `'${esc(p.obs)}'` : 'NULL'}, ${lat}, ${lng}, true, '${ROUTER}');`);
});

// Tramos de fibra
const tramos = [
  { nombre: 'Troncal CENTRO - NORTE', tipo: 'troncal', color: '#d32f2f', notas: 'Fibra de 48 hilos', pts: [[0, 0], [560, 0], [840, 0], [840, -120], [910, -120]] },
  { nombre: 'Distribución SUR', tipo: 'distribucion', color: '#1976d2', notas: null, pts: [[280, 0], [280, -120], [280, -240], [140, -240]] },
  { nombre: 'Derivación ESTE', tipo: 'fibra', color: '#2e7d32', notas: 'Fibra de 12 hilos', pts: [[700, 0], [700, 120]] },
];
tramos.forEach((t, i) => {
  const path = JSON.stringify(t.pts.map(([u, v]) => ll(u, v)));
  sql.push(`INSERT INTO tramos_fibra (id, nombre, tipo, color, path, notas, "isActive", router_id) VALUES ('${id(1, i + 1)}', '${esc(t.nombre)}', '${t.tipo}', '${t.color}', '${path}'::jsonb, ${t.notas ? `'${esc(t.notas)}'` : 'NULL'}, true, '${ROUTER}');`);
});

writeFileSync(path.join(HERE, 'c7-mapa-seed.sql'), `-- Datos ficticios para capturar /mapa-nap (generado por c7-mapa-seed.mjs)\nBEGIN;\n${sql.join('\n')}\nCOMMIT;\n`);
writeFileSync(path.join(HERE, 'c7-mapa-revert.sql'), `-- Deshace c7-mapa-seed.sql\nBEGIN;\nUPDATE "servicios-clientes" SET caja_id = NULL, puerto_id = NULL, coordenadas = NULL WHERE contrato BETWEEN 1000 AND 1009 AND (caja_id::text LIKE 'c700000%' OR contrato = 1009);\nDELETE FROM puertos WHERE "cajaNap_id"::text LIKE 'c700000%';\nDELETE FROM "cajas-nap" WHERE id::text LIKE 'c700000%';\nDELETE FROM postes WHERE id::text LIKE 'c700000%';\nDELETE FROM tramos_fibra WHERE id::text LIKE 'c700000%';\nCOMMIT;\n`);
console.log(`cajas ${cajas.length}, postes ${postes.length}, tramos ${tramos.length}, sentencias ${sql.length}`);
