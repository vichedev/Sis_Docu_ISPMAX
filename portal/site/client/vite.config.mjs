// Compilación del TEMA (no del contenido) para el manual dinámico: una vez por despliegue (`npm run site:build`).
//   vite build -c site/client/vite.config.mjs          → portal/site/dist/client (navegador)
//   vite build -c site/client/vite.config.mjs --ssr    → portal/site/dist/server/entry-server.js (Node)
// El código es el MISMO del repo (theme/, src/components/, styles/, src/search/); los alias sustituyen los módulos de
// Rspress por el shim de ./shim (datos del servidor en vez de módulos virtuales generados al compilar).
// `base: './'`: los recursos del tema se referencian de forma relativa (CSS → fuentes, JS → fragmentos), así el mismo
// tema compilado sirve con cualquier base del sitio (`/`, `/manual/`…) sin recompilar.
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const require = createRequire(path.join(REPO, 'package.json'));
const tailwindcss = require('@tailwindcss/postcss');

/**
 * <Figure src="/assets/…">: la única imagen del tema sin base. Lo mismo que hacía el publicador estático
 * (patchFigure, portal/server/ops/publish.mjs) sobre una copia: aquí se transforma en memoria al compilar el tema.
 * Con la base `/`, `withBase('/assets/x')` devuelve lo mismo: el HTML no cambia.
 */
function figureWithBase() {
  const FIGURE = path.join(REPO, 'src', 'components', 'Figure.tsx').replace(/\\/g, '/');
  return {
    name: 'isp-figure-with-base',
    enforce: 'pre',
    transform(code, id) {
      if (id.replace(/\\/g, '/').split('?')[0] !== FIGURE) return null;
      if (!code.includes('src={src}')) {
        this.warn('Figure.tsx cambió: las imágenes de <Figure> pueden no verse si la base del sitio no es /.');
        return null;
      }
      return { code: "import { withBase } from '@rspress/core/runtime';\n" + code.replace('src={src}', 'src={withBase(src)}'), map: null };
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  root: HERE,
  // Cliente: relativo (CSS → fuentes, JS → fragmentos). SSR: /_site/ (el motor antepone la base del sitio al HTML).
  base: isSsrBuild ? '/_site/' : './',
  publicDir: false,
  logLevel: 'warn',
  plugins: [figureWithBase()],
  // URLs de recursos importados desde JS (`?url`, p. ej. la precarga de fuentes del <head>): con la base del sitio que
  // publica el arranque (window.__ISP_ASSET_BASE__ en /_site/boot.*.js), igual que en el HTML del servidor.
  experimental: isSsrBuild
    ? {}
    : {
        renderBuiltUrl(filename, { hostType }) {
          if (hostType === 'js') return { runtime: `((globalThis.__ISP_ASSET_BASE__||"/_site/")+${JSON.stringify(filename)})` };
          return { relative: true };
        },
      },
  resolve: {
    alias: [
      { find: /^@rspress\/core\/runtime$/, replacement: path.join(HERE, 'shim', 'runtime.tsx') },
      { find: /^@rspress\/core\/theme-original$/, replacement: path.join(HERE, 'shim', 'theme-original.ts') },
      { find: /^@rspress\/core\/theme$/, replacement: path.join(REPO, 'theme', 'index.tsx') },
      { find: /^@isp\/search-data$/, replacement: path.join(HERE, 'shim', 'search-data.ts') },
      { find: /^@isp\/legacy-routes$/, replacement: path.join(HERE, 'shim', 'legacy-routes.ts') },
    ],
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', '@mdx-js/react', '@unhead/react'],
  },
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  define: { 'import.meta.env.SSG_MD': 'false', 'import.meta.env.ENABLE_LLMS_HINT': 'false' },
  css: { postcss: { plugins: [tailwindcss({ base: path.join(REPO, 'docs') })] } },
  ssr: { noExternal: true, target: 'node' },
  build: isSsrBuild
    ? {
        outDir: path.join(HERE, '..', 'dist', 'server'),
        emptyOutDir: true,
        target: 'node22',
        rollupOptions: { input: path.join(HERE, 'entry-server.tsx'), output: { format: 'es' } },
      }
    : {
        outDir: path.join(HERE, '..', 'dist', 'client'),
        emptyOutDir: true,
        target: 'es2022',
        manifest: true,
        assetsDir: 'assets',
        rollupOptions: { input: path.join(HERE, 'entry-client.tsx') },
      },
}));
