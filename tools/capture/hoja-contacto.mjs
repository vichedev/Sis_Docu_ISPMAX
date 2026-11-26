#!/usr/bin/env node
/**
 * hoja-contacto — junta muchas capturas en hojas de miniaturas con su nombre, para revisarlas de un vistazo
 * (pantallas en blanco, spinners, datos que parezcan reales, recortes malos) antes de darlas por buenas.
 *
 *   node tools/capture/hoja-contacto.mjs --nuevas salida        # las imágenes nuevas o modificadas según git
 *   node tools/capture/hoja-contacto.mjs salida a.webp b.webp   # las que se indiquen (rutas desde la raíz del repo)
 *
 * Genera `salida-1.png`, `salida-2.png`… (12 miniaturas por hoja, 3 columnas). Mirar cada hoja con un visor de imágenes;
 * lo dudoso se abre a tamaño real. Usa `sharp` de `tools/capture/node_modules` (`npm ci --ignore-scripts` allí).
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sharp = createRequire(import.meta.url)('sharp');
const args = process.argv.slice(2);
let out, files;
if (args[0] === '--nuevas') {
  out = args[1];
  const git = a => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  files = [...new Set([...git(['ls-files', '--others', '--exclude-standard', 'assets/imgs']), ...git(['diff', '--name-only', '--diff-filter=AM', 'HEAD', '--', 'assets/imgs'])])]
    .filter(f => /\.(webp|png|jpe?g)$/i.test(f)).sort();
} else [out, ...files] = args;
if (out && args[0] === '--nuevas' && !files.length) {
  console.log('No hay imágenes nuevas ni modificadas respecto a HEAD.');
  process.exit(0);
}
if (!out || !files.length) {
  console.error('Uso: hoja-contacto.mjs --nuevas <salida>  |  hoja-contacto.mjs <salida> <imagen>…');
  process.exit(2);
}
const W = 480, H = 300, COLS = 3, PER = 12, ETQ = 18;
for (let s = 0; s * PER < files.length; s++) {
  const part = files.slice(s * PER, (s + 1) * PER);
  const comps = [];
  for (let i = 0; i < part.length; i++) {
    const buf = await sharp(path.resolve(ROOT, part[i])).resize(W, H, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    const x = (i % COLS) * W, y = Math.floor(i / COLS) * (H + ETQ);
    const nombre = part[i].replace('assets/imgs/', '').replace(/\.\w+$/, '').slice(-62).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    comps.push({ input: buf, left: x, top: y + ETQ });
    comps.push({ input: Buffer.from(`<svg width="${W}" height="${ETQ}"><rect width="${W}" height="${ETQ}" fill="#222"/><text x="4" y="13" font-size="11" fill="#fff" font-family="Arial">${s * PER + i + 1} ${nombre}</text></svg>`), left: x, top: y });
  }
  const alto = Math.ceil(part.length / COLS) * (H + ETQ);
  await sharp({ create: { width: W * COLS, height: alto, channels: 3, background: '#cccccc' } }).composite(comps).png().toFile(`${out}-${s + 1}.png`);
}
console.log(`${files.length} imágenes en ${Math.ceil(files.length / PER)} hoja(s): ${out}-1.png …`);
