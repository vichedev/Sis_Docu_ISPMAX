#!/usr/bin/env node
/**
 * Genera `c7-glifos.pbf`: glifos SDF (Latin-1, Arial 24 px) en el formato de glifos de Mapbox, para que los textos
 * del mapa ficticio (nombres de calle y distancias de los tramos) se dibujen sin pedirle las fuentes a Mapbox.
 * Rasteriza con un <canvas> del navegador de captura (EDGE_PATH) y calcula la distancia con fuerza bruta.
 *
 *   EDGE_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" node c7-glifos.mjs
 */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EDGE = process.env.EDGE_PATH;
if (!EDGE) { console.error('Falta EDGE_PATH'); process.exit(2); }
const PORT = 9400 + (process.pid % 90);
const PROFILE = path.join(os.tmpdir(), `ispmax-glifos-${process.pid}`);
spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore', detached: true }).unref();
const sleep = ms => new Promise(r => setTimeout(r, ms));
let browser;
for (let i = 0; i < 40 && !browser; i++) { await sleep(500); try { browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}` }); } catch {} }
const page = await browser.newPage();

const glifos = await page.evaluate(() => {
  const FS = 24, B = 3, R = 8, CUT = 0.25, H = FS + 2 * B;
  const out = [];
  const c = document.createElement('canvas');
  const x = c.getContext('2d', { willReadFrequently: true });
  for (let id = 32; id <= 255; id++) {
    const ch = String.fromCharCode(id);
    x.font = `${FS}px Arial, Helvetica, sans-serif`;
    const adv = Math.max(1, Math.ceil(x.measureText(ch).width));
    const W = adv + 2 * B;
    c.width = W; c.height = H;
    x.font = `${FS}px Arial, Helvetica, sans-serif`;
    x.textBaseline = 'middle'; x.fillStyle = '#000';
    x.clearRect(0, 0, W, H);
    x.fillText(ch, B, B + FS / 2 + 1);
    const img = x.getImageData(0, 0, W, H).data;
    const INF = 1e20, outer = new Float64Array(W * H), inner = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const a = img[i * 4 + 3] / 255;
      if (a === 1) { outer[i] = 0; inner[i] = INF; }
      else if (a === 0) { outer[i] = INF; inner[i] = 0; }
      else { const d = 0.5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0; }
    }
    const edt = g => {
      const res = new Float64Array(W * H);
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        let best = INF;
        for (let qy = Math.max(0, py - R - 1); qy <= Math.min(H - 1, py + R + 1); qy++)
          for (let qx = Math.max(0, px - R - 1); qx <= Math.min(W - 1, px + R + 1); qx++) {
            const v = g[qy * W + qx] + (px - qx) ** 2 + (py - qy) ** 2;
            if (v < best) best = v;
          }
        res[py * W + px] = best;
      }
      return res;
    };
    const eo = edt(outer), ei = edt(inner);
    const bitmap = new Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const d = Math.sqrt(eo[i]) - Math.sqrt(ei[i]);
      bitmap[i] = Math.max(0, Math.min(255, Math.round(255 - 255 * (d / R + CUT))));
    }
    out.push({ id, w: adv, h: FS, left: 0, top: -8, adv, bitmap });
  }
  return out;
});
await browser.close().catch(() => {});

// --- codificación protobuf (glyphs.proto de Mapbox) ---
const varint = n => { const b = []; n = n >>> 0; while (n > 127) { b.push((n & 127) | 128); n >>>= 7; } b.push(n); return Buffer.from(b); };
const zig = n => varint(((n << 1) ^ (n >> 31)) >>> 0);
const tag = (f, t) => varint((f << 3) | t);
const lenDel = (f, buf) => Buffer.concat([tag(f, 2), varint(buf.length), buf]);
const glifo = g => Buffer.concat([
  tag(1, 0), varint(g.id), lenDel(2, Buffer.from(g.bitmap)), tag(3, 0), varint(g.w), tag(4, 0), varint(g.h),
  tag(5, 0), zig(g.left), tag(6, 0), zig(g.top), tag(7, 0), varint(g.adv),
]);
const pila = Buffer.concat([lenDel(1, Buffer.from('Arial 24')), lenDel(2, Buffer.from('0-255')), ...glifos.map(g => lenDel(3, glifo(g)))]);
const pbf = lenDel(1, pila);
writeFileSync(path.join(HERE, 'c7-glifos.pbf'), pbf);
console.log(`${glifos.length} glifos, ${pbf.length} bytes`);
process.exit(0);
