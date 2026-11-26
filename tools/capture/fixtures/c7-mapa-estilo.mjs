#!/usr/bin/env node
/**
 * Genera `c7-mapa-mock.json`: lista de respuestas simuladas (`mock`) para que /mapa-nap dibuje un mapa de fondo FICTICIO
 * sin llamar a Mapbox: estilo mínimo con calles, manzanas y un río inventados (GeoJSON incrustado), alrededor de las
 * coordenadas de las cajas NAP de la instancia de pruebas. No usa datos reales ni nombres de calles reales.
 *
 *   node c7-mapa-estilo.mjs            # escribe c7-mapa-mock.json junto a este archivo
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const O = { lng: -79.886, lat: -2.17 }; // origen del plano (coordenadas inventadas, como las cajas de la instancia)
const M_LNG = 111240; // metros por grado de longitud a esta latitud
const M_LAT = 110570;
const TH = (53 * Math.PI) / 180; // giro de la cuadrícula
const rot = (u, v) => [u * Math.cos(TH) - v * Math.sin(TH), u * Math.sin(TH) + v * Math.cos(TH)];
const ll = (u, v) => {
  const [e, n] = rot(u, v);
  return [+(O.lng + e / M_LNG).toFixed(6), +(O.lat + n / M_LAT).toFixed(6)];
};

// Generador pseudoaleatorio fijo: el resultado es reproducible.
let seed = 20261025;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

const U0 = -600, U1 = 1500, V0 = -700, V1 = 1100, DU = 140, DV = 120;
const calles = [], avenidas = [], edificios = [], parques = [];

for (let k = Math.ceil(V0 / DV); k * DV <= V1; k++) {
  const f = { type: 'Feature', properties: { n: `Calle ${k + 8}` }, geometry: { type: 'LineString', coordinates: [ll(U0, k * DV), ll(U1, k * DV)] } };
  (k % 4 === 0 ? avenidas : calles).push(f);
}
for (let j = Math.ceil(U0 / DU); j * DU <= U1; j++) {
  const f = { type: 'Feature', properties: { n: `Av. ${j + 5}` }, geometry: { type: 'LineString', coordinates: [ll(j * DU, V0), ll(j * DU, V1)] } };
  (j % 5 === 0 ? avenidas : calles).push(f);
}
// una diagonal ancha
avenidas.push({ type: 'Feature', properties: { n: 'Av. Diagonal' }, geometry: { type: 'LineString', coordinates: [ll(-600, -400), ll(0, 40), ll(700, 330), ll(1500, 760)] } });

// manzanas con edificios
for (let j = Math.floor(U0 / DU); j * DU < U1; j++) {
  for (let k = Math.floor(V0 / DV); k * DV < V1; k++) {
    const u0 = j * DU + 12, u1 = (j + 1) * DU - 12, v0 = k * DV + 11, v1 = (k + 1) * DV - 11;
    // parques: algunas manzanas enteras
    if ((j === 5 && k === 3) || (j === 2 && k === -2) || (j === 8 && k === 5)) {
      parques.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[ll(u0, v0), ll(u1, v0), ll(u1, v1), ll(u0, v1), ll(u0, v0)]] } });
      continue;
    }
    const cu = (u1 - u0) / 4;
    for (let a = 0; a < 4; a++) {
      for (const [va, vb] of [[v0 + 2, (v0 + v1) / 2 - 3], [(v0 + v1) / 2 + 3, v1 - 2]]) {
        if (rnd() < 0.22) continue;
        const x0 = u0 + a * cu + 2 + rnd() * 3, x1 = u0 + (a + 1) * cu - 2 - rnd() * 3;
        const y0 = va + rnd() * 3, y1 = vb - rnd() * 4;
        edificios.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)]] } });
      }
    }
  }
}

// río: franja sinusoidal al oeste
const eje = [];
for (let t = 0; t <= 24; t++) {
  const u = -560 + t * 40;
  eje.push([u, -520 + t * 78 + 70 * Math.sin(t / 3.2)]);
}
const izq = eje.map(([u, v]) => ll(u - 14, v + 6));
const der = eje.map(([u, v]) => ll(u + 14, v - 6)).reverse();
const rio = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...izq, ...der, izq[0]]] } };

const fc = features => ({ type: 'FeatureCollection', features });
const interp = (...pares) => ['interpolate', ['linear'], ['zoom'], ...pares.flat()];

const estilo = {
  version: 8,
  name: 'Mapa ficticio de demostración',
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
  sources: {
    calles: { type: 'geojson', data: fc(calles) },
    avenidas: { type: 'geojson', data: fc(avenidas) },
    edificios: { type: 'geojson', data: fc(edificios) },
    parques: { type: 'geojson', data: fc(parques) },
    rio: { type: 'geojson', data: fc([rio]) },
  },
  layers: [
    { id: 'fondo', type: 'background', paint: { 'background-color': '#ece9e4' } },
    { id: 'parques', type: 'fill', source: 'parques', paint: { 'fill-color': '#cfe4c1' } },
    { id: 'edificios', type: 'fill', source: 'edificios', minzoom: 15, paint: { 'fill-color': '#ddd8cf', 'fill-opacity': interp([15, 0], [16, 1]) } },
    { id: 'rio', type: 'fill', source: 'rio', paint: { 'fill-color': '#a8d3f2' } },
    { id: 'calles-borde', type: 'line', source: 'calles', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#dcd7ce', 'line-width': interp([13, 1.2], [16, 7], [19, 26]) } },
    { id: 'calles', type: 'line', source: 'calles', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': interp([13, 0.6], [16, 5], [19, 22]) } },
    { id: 'avenidas-borde', type: 'line', source: 'avenidas', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#e2c36a', 'line-width': interp([13, 2.2], [16, 11], [19, 40]) } },
    { id: 'avenidas', type: 'line', source: 'avenidas', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#fbe08a', 'line-width': interp([13, 1.2], [16, 8.5], [19, 34]) } },
    { id: 'nombres-calles', type: 'symbol', source: 'calles', minzoom: 15.5, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'n'], 'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'], 'text-size': 12 }, paint: { 'text-color': '#6b6b66', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } },
    { id: 'nombres-avenidas', type: 'symbol', source: 'avenidas', minzoom: 14.5, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'n'], 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-size': 13 }, paint: { 'text-color': '#6b5d2e', 'text-halo-color': '#fff6d6', 'text-halo-width': 1.5 } },
  ],
};

const mock = [
  // el módulo del mapa lee el token de Mapbox del entorno; se le da uno ficticio solo en la captura
  { url: '/mapa-nap/IndexPage.vue', exact: true, replace: [['"VITE_COMPANY_NAME"', '"VITE_MAPBOX_TOKEN": "pk.demo-ficticio", "VITE_COMPANY_NAME"']] },
  { url: 'api.mapbox.com/styles/v1/mapbox/streets-v12', json: estilo, cors: true },
  { url: 'api.mapbox.com/fonts/v1/', bodyFile: 'fixtures/c7-glifos.pbf', contentType: 'application/x-protobuf', cors: true },
  { url: 'events.mapbox.com', abort: true },
  { url: 'api.mapbox.com/map-sessions', abort: true },
  // sin ruta por calles: el mapa dibuja la acometida como línea recta
  { url: 'api.mapbox.com/directions/', status: 422, json: { code: 'NoRoute', routes: [] }, cors: true },
  { url: 'api.mapbox.com/geocoding/', json: { type: 'FeatureCollection', features: [] }, cors: true },
];
writeFileSync(path.join(HERE, 'c7-mapa-mock.json'), JSON.stringify(mock));
console.log(`calles ${calles.length}, avenidas ${avenidas.length}, edificios ${edificios.length}, parques ${parques.length}`);
