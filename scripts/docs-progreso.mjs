#!/usr/bin/env node
/**
 * docs-progreso — mide el avance de la documentación y lista lo pendiente. Solo lectura.
 *
 *   node scripts/docs-progreso.mjs            # resumen
 *   node scripts/docs-progreso.mjs --listas   # añade las listas (parciales, tareas sin captura, figuras antiguas…)
 *
 * Método de 7 ejes ponderados (100 puntos; el reparto lo fijó la persona que coordina y se puede cambiar):
 *   A Cobertura funcional      15  funcionalidades con página / en alcance (lee `docs-coverage.md`)
 *   B Páginas por escribir     20  (tareas + referencias) / (tareas + referencias + PEND_ESCRIBIR)
 *   C Páginas sin pendientes   25  páginas de contenido con `estado: verificado` / total
 *   D Capturas al día          10  figuras de la instancia ficticia (en subcarpeta) / todas; las de nombre plano son antiguas
 *   E Servicios externos       10  flujos validados contra el servicio real: 0 (fuera de alcance por decisión del usuario)
 *   F Inventarios con evidencia 5  grupos de inventario con lectura completa (todos, desde 2026-10-26)
 *   G Publicación              15  CI verde (1/3) + fusionado a `main` (1/3) + imagen Docker publicada (1/3)
 * El usuario dejó fuera de alcance E y la imagen (la web la despliega otra persona): la cifra "del alcance acordado"
 * suma 5 puntos de G y descarta E (90 puntos). Las cifras se SACAN de esta herramienta, no se teclean a mano.
 * Ajustes manuales al final del archivo: PEND_ESCRIBIR (tareas/referencias conocidas aún sin escribir).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LISTAS = process.argv.includes('--listas');
const walk = d => fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.mdx') ? [p] : []; });
const EXT = /router|mikrotik|whatsapp|\bsri\b|olt\b|smartolt|adminolt|pasarela|smtp|correo|factus|mapbox|servicio externo|servicio de (pagos|firma|facturaci)|gateway|venezuela|colombia|bcv/i;
const P = walk(path.join(ROOT, 'docs')).map(f => {
  const t = fs.readFileSync(f, 'utf8'); const m = t.match(/^---\n([\s\S]*?)\n---/);
  const o = {
    f: path.relative(ROOT, f).replace(/^docs\//, '').replace(/\.mdx$/, ''),
    fig: [...t.matchAll(/src="\/assets\/imgs\/([^"]+)"/g)].map(x => x[1]),
    pend: [...t.matchAll(/:::info (?:Pendiente de validación|Servicio externo no probado)\n([\s\S]*?)\n:::/g)].map(x => x[1]).join(' '),
  };
  if (m) for (const l of m[1].split('\n')) { const a = l.match(/^(tipo|estado|modulo):\s*(.*)$/); if (a) o[a[1]] = a[2]; const b = l.match(/^\s+metodo:\s*(\S+)/); if (b) o.metodo = b[1]; }
  return o;
}).filter(p => p.tipo && p.tipo !== 'indice' && !/(^|\/)index$/.test(p.f));

const n = P.length, ver = P.filter(p => p.estado === 'verificado').length, ui = P.filter(p => /ui/.test(p.metodo || '')).length;
const nuevo = P.reduce((s, p) => s + p.fig.filter(x => x.includes('/')).length, 0), viejo = P.reduce((s, p) => s + p.fig.filter(x => !x.includes('/')).length, 0);
let cov = [0, 0];
try {
  const t = fs.readFileSync(path.join(ROOT, 'docs-coverage.md'), 'utf8');
  const a = t.match(/Funcionalidades en alcance \| (\d+)/), b = t.match(/Funcionalidades documentadas \| (\d+)/);
  if (!a || !b) throw new Error('no leo la cobertura');
  cov = [+b[1], +a[1]];
} catch { console.error('Aviso: ejecuta `node scripts/docs-coverage.mjs` para que exista la cobertura (eje A = 0 hasta entonces).'); }
const tareas = P.filter(p => p.tipo === 'tarea'), refs = P.filter(p => p.f.startsWith('referencia/'));
const PEND_ESCRIBIR = 0; // tareas y referencias conocidas aún sin escribir
const A = 15 * cov[0] / Math.max(cov[1], 1), B = 20 * (tareas.length + refs.length) / (tareas.length + refs.length + PEND_ESCRIBIR),
  C = 25 * ver / Math.max(n, 1), D = 10 * nuevo / Math.max(nuevo + viejo, 1), E = 0, F = 5, G = 15 * (2 / 3);
const tot = A + B + C + D + E + F + G;
const alcance = (tot + 15 / 3) / 90 * 100; // sin E y con la imagen fuera de alcance (G completo)
console.log(`PÁGINAS: ${n} de contenido · verificado ${ver} · parcial ${n - ver} · validadas en pantalla ${ui} · tareas ${tareas.length} · referencias ${refs.length}`);
console.log(`CAPTURAS: nuevas ${nuevo} · antiguas ${viejo}`);
console.log(`AVANCE: A ${A.toFixed(1)} · B ${B.toFixed(1)} · C ${C.toFixed(1)} · D ${D.toFixed(1)} · E ${E.toFixed(1)} · F ${F.toFixed(1)} · G ${G.toFixed(1)} = ${tot.toFixed(1)} %  (sin E: ${(tot / 90 * 100).toFixed(1)} %; del alcance acordado, sin E ni imagen: ${alcance.toFixed(1)} %)`);
const parc = P.filter(p => p.estado === 'parcial'), ext = parc.filter(p => EXT.test(p.pend)), sinAviso = parc.filter(p => !p.pend);
console.log(`PARCIAL ${parc.length}: con aviso que cita un servicio externo ${ext.length} · con aviso sin servicio externo ${parc.length - ext.length - sinAviso.length} · sin bloque de aviso ${sinAviso.length}`);
const cnt = (a, k) => a.reduce((o, p) => (o[p[k] || '—'] = (o[p[k] || '—'] || 0) + 1, o), {});
if (parc.length) console.log('  parcial por tipo:', JSON.stringify(cnt(parc, 'tipo')), '· por módulo:', JSON.stringify(cnt(parc, 'modulo')));
const tsf = tareas.filter(p => !p.fig.length);
console.log(`TAREAS sin captura: ${tsf.length} de ${tareas.length}${tsf.length ? ' · por carpeta: ' + JSON.stringify(tsf.reduce((o, p) => (o[p.f.split('/')[1]] = (o[p.f.split('/')[1]] || 0) + 1, o), {})) : ''}`);
const G_ = P.filter(p => p.tipo === 'guia'), gv = G_.filter(p => p.fig.some(x => !x.includes('/'))), gs = G_.filter(p => !p.fig.length);
console.log(`GUÍAS ${G_.length}: con capturas antiguas ${gv.length} · sin capturas ${gs.length}`);
const pr = P.filter(p => p.tipo === 'problema'); console.log(`PROBLEMAS ${pr.length}: sin captura ${pr.filter(p => !p.fig.length).length}`);
if (LISTAS) {
  console.log('\n## parcial con servicio externo:\n' + (ext.map(p => p.f).join(', ') || '—'));
  console.log('\n## parcial SIN servicio externo en su aviso:\n' + (parc.filter(p => !EXT.test(p.pend)).map(p => p.f).join(', ') || '—'));
  console.log('\n## tareas sin captura:\n' + (tsf.map(p => p.f.replace('tareas/', '')).join(', ') || '—'));
  console.log('\n## guías con capturas antiguas:\n' + (gv.map(p => `${p.f.replace('guia/', '')}(${p.fig.filter(x => !x.includes('/')).length})`).join(', ') || '—'));
  console.log('\n## guías sin capturas:\n' + (gs.map(p => p.f.replace('guia/', '')).join(', ') || '—'));
}
