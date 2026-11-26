#!/usr/bin/env node
/**
 * Genera `c7-router-mock.json`: respuestas simuladas (`mock`) de la API de monitoreo de un router para las pestañas
 * Monitoreo y Gráficos de la edición de un router (el router de la instancia no existe: 192.0.2.10). Todo es ficticio:
 * equipo, interfaces y series de tráfico inventadas con un generador pseudoaleatorio fijo.
 *
 *   node c7-router-mock.mjs
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ID = '611d20e1-7c22-4bb9-b376-b96576295e3b'; // ROUTER DEMO
const BASE = `monitoreo-trafico/router/${ID}`;
const AHORA = Date.UTC(2026, 9, 25, 15, 0, 0); // 25/10/2026 10:00 hora de Ecuador

let seed = 7771;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const r3 = n => Math.round(n * 1000) / 1000;
// forma del consumo en un día: valle de madrugada, pico de 20 a 23 h (hora local)
const dist = (h, c) => Math.min(Math.abs(h - c), 24 - Math.abs(h - c)); // distancia circular en horas
const forma = horaLocal => 0.18 + 0.82 * Math.exp(-((dist(horaLocal, 21.2) / 3.6) ** 2)) + 0.28 * Math.exp(-((dist(horaLocal, 13) / 3) ** 2));
const punto = (t, escala = 1) => {
  const h = (((t - 5 * 3600e3) % 86400e3) + 86400e3) % 86400e3 / 3600e3;
  const base = forma(h) * escala * (0.93 + rnd() * 0.14);
  const inn = r3(30 + base * 390);
  const out = r3(6 + base * 52);
  return { punto: new Date(t).toISOString(), mbps_in: inn, mbps_out: out, mbps_in_max: r3(inn * 1.12), mbps_out_max: r3(out * 1.12), gb_in: r3(inn * 300 / 8 / 1000), gb_out: r3(out * 300 / 8 / 1000) };
};
const serie = (n, paso, escala = () => 1) => Array.from({ length: n }, (_, i) => punto(AHORA - (n - 1 - i) * paso, escala(i)));

const vivo = Array.from({ length: 60 }, (_, i) => {
  const rx = r3(285 + 60 * Math.sin(i / 3.1) + rnd() * 45);
  const tx = r3(41 + 7 * Math.sin(i / 2.3 + 1) + rnd() * 6);
  return { interfaz: 'ether1-WAN', ts: new Date(AHORA + i * 3000).toISOString(), rx_bps: Math.round(rx * 1e6), tx_bps: Math.round(tx * 1e6), rx_mbps: rx, tx_mbps: tx };
});

const mock = [
  { url: `${BASE}/info`, cors: false, json: {
    uptime: '14w2d6h31m8s', version: '7.14.3 (stable)', build_time: '2024-05-14 10:20:00', board_name: 'RB4011iGS+', architecture: 'arm',
    platform: 'MikroTik', cpu: 'ARMv7', cpu_count: '4', cpu_frequency: '1400', cpu_load: 11,
    free_memory: 702545920, total_memory: 1073741824, free_hdd: 41943040, total_hdd: 536870912 } },
  { url: `${BASE}/interfaces`, json: [
    { name: 'ether1-WAN', type: 'ether', running: true, disabled: false },
    { name: 'ether2-LAN', type: 'ether', running: true, disabled: false },
    { name: 'ether3-OLT', type: 'ether', running: true, disabled: false },
    { name: 'sfp-sfpplus1', type: 'ether', running: false, disabled: false },
    { name: 'bridge-clientes', type: 'bridge', running: true, disabled: false },
    { name: 'vlan100-pppoe', type: 'vlan', running: true, disabled: false },
  ] },
  { url: `${BASE}/wan`, method: 'GET', json: { interfaz_wan: 'ether1-WAN' } },
  { url: `${BASE}/trafico-vivo`, seq: vivo },
  { url: `${BASE}/interfaz-historico`, method: 'GET', status: 200, json: null, porPeriodo: true },
];
// una entrada por periodo (el filtro por texto de la URL separa `periodo=daily`, etc.)
const periodos = {
  daily: serie(288, 300e3),
  weekly: serie(168, 3600e3),
  monthly: serie(720, 3600e3, i => 0.85 + 0.15 * Math.sin(i / 90)),
  yearly: Array.from({ length: 365 }, (_, i) => punto(AHORA - (364 - i) * 86400e3 + 12 * 3600e3, 0.35 + 0.65 * (i / 364) ** 1.2)),
};
const lista = mock.filter(m => !m.porPeriodo);
for (const [k, s] of Object.entries(periodos)) lista.push({ url: `${BASE}/interfaz-historico?interfaz=ether1-WAN&periodo=${k}`, json: { periodo: k, interfaz: 'ether1-WAN', serie: s } });
writeFileSync(path.join(HERE, 'c7-router-mock.json'), JSON.stringify(lista));
console.log(`${lista.length} respuestas simuladas`);
