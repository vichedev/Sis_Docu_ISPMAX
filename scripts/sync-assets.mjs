/**
 * Copia `assets/` (fuente única de verdad, compartida con la versión HTML
 * original) hacia `docs/public/assets/`, que es lo que Rspress publica.
 *
 * De esta forma las rutas de imagen del manual siguen siendo exactamente las
 * mismas que en el repositorio (`assets/imgs/...`) y no hay que duplicar
 * archivos en git: `docs/public/` está en .gitignore.
 *
 * Con ISPMAX_ASSETS_DIR (= <raíz>/assets/imgs) y ISPMAX_DOCS_DIR copia `<raíz>/assets/` en `<docs>/public/assets/`
 * (contenido materializado desde un paquete .ispmax; ver scripts/manual-corpus.mjs). Sin ellas, como siempre.
 */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT as root, ASSETS as src, DOCS } from './lib/manual.mjs';

const dest = path.join(DOCS, 'public', 'assets');

if (!existsSync(src)) {
  console.error(`[assets] No existe la carpeta origen: ${src}`);
  process.exit(1);
}

const logo = path.join(src, 'logo', 'ISPMAX.png');
if (!existsSync(logo)) {
  console.error('[assets] Falta assets/logo/ISPMAX.png — es obligatorio para la marca.');
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await mkdir(path.dirname(dest), { recursive: true });
await cp(src, dest, {
  recursive: true,
  filter: source => !/desktop\.ini$|Thumbs\.db$|(^|[\\/])\.DS_Store$/i.test(source),
});

const { size } = await stat(logo);
console.log(`[assets] Sincronizado ${path.relative(root, src)} → ${path.relative(root, dest)} (logo ${(size / 1024).toFixed(0)} KB)`);
