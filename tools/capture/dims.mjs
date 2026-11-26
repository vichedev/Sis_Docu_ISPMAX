#!/usr/bin/env node
/** Imprime `ruta/relativa ANCHOxALTO` de cada .webp de assets/imgs (subcarpetas), para usarlo en <Figure width height>. */
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'imgs');
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const out = {};
for (const f of walk(base).filter(f => f.endsWith('.webp'))) {
  const rel = path.relative(base, f).split(path.sep).join('/');
  if (!rel.includes('/')) continue; // solo las generadas por tools/capture (en subcarpetas)
  const m = await sharp(f).metadata();
  out[rel.replace(/\.webp$/, '')] = [m.width, m.height];
}
console.log(JSON.stringify(out, null, 1));
