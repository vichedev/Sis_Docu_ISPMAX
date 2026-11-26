#!/usr/bin/env node
/**
 * seo-brand — genera los iconos y la imagen social del sitio a partir del logo de `assets/logo/` (necesita `sharp`,
 * que está en portal/node_modules). Salida versionada en `theme/seo/brand/` (se copia a la raíz del sitio al construir:
 * ver `output.copy` en rspress.config.ts). Se ejecuta a mano cuando cambie el logo:  node scripts/seo-brand.mjs
 *   favicon.ico (16/32/48), favicon-32.png, apple-touch-icon.png (180), icon-192.png, icon-512.png,
 *   og-ispmax.png (1200x630), site.webmanifest
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'portal', 'package.json'));
const sharp = require('sharp');
const LOGO = path.join(ROOT, 'assets', 'logo');
const OUT = path.join(ROOT, 'theme', 'seo', 'brand');
fs.mkdirSync(OUT, { recursive: true });

const BRAND = '#5b4bd8';
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/** Isotipo recortado a su contenido y centrado en un cuadrado de `size` px con `pad` (fracción) de margen. */
async function icon(size, { pad = 0.08, background = { r: 0, g: 0, b: 0, alpha: 0 } } = {}) {
  const trimmed = await sharp(path.join(LOGO, 'ispmax-favicon.png')).trim().toBuffer();
  const inner = Math.round(size * (1 - pad * 2));
  const fit = await sharp(trimmed).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: fit, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** ICO con imágenes PNG incrustadas. */
function ico(images) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const dirs = images.map(({ size, data }) => {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0);
    d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(data.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += data.length;
    return d;
  });
  return Buffer.concat([head, ...dirs, ...images.map(i => i.data)]);
}

const write = (name, data) => {
  fs.writeFileSync(path.join(OUT, name), data);
  console.log(`[seo-brand] ${name} (${(data.length / 1024).toFixed(1)} KB)`);
};

write('favicon-32.png', await icon(32, { pad: 0.02 }));
write('favicon.ico', ico(await Promise.all([16, 32, 48].map(async size => ({ size, data: await icon(size, { pad: 0.02 }) })))));
write('apple-touch-icon.png', await icon(180, { pad: 0.12, background: WHITE }));
write('icon-192.png', await icon(192, { pad: 0.1 }));
write('icon-512.png', await icon(512, { pad: 0.1 }));

// Imagen social 1200x630: fondo claro con degradado de marca, logo completo a la izquierda y rótulo a la derecha.
const logo = await sharp(path.join(LOGO, 'ISPMAX.png')).resize({ height: 480 }).toBuffer();
const lw = (await sharp(logo).metadata()).width;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9e5ff"/></linearGradient>
<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${BRAND}"/><stop offset="1" stop-color="#38bdf8"/></linearGradient>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<rect y="598" width="1200" height="32" fill="url(#bar)"/>
<text x="600" y="568" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${BRAND}" letter-spacing="6">MANUAL DE USUARIO</text>
</svg>`;
write('og-ispmax.png', await sharp(Buffer.from(svg)).composite([{ input: logo, left: Math.round((1200 - lw) / 2), top: 20 }]).png({ compressionLevel: 9 }).toBuffer());

write(
  'site.webmanifest',
  Buffer.from(
    JSON.stringify(
      {
        name: 'Manual ISPMAX',
        short_name: 'Manual ISPMAX',
        description: 'Manual de usuario de ISPMAX, el sistema de gestión de clientes para proveedores de Internet.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'browser',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      null,
      2,
    ) + '\n',
  ),
);
