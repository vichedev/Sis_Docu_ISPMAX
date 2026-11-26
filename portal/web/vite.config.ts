import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const target = process.env.PORTAL_API || 'http://127.0.0.1:4380';

// El panel no tiene ruta fija: el servidor lo sirve desde `PORTAL_ADMIN_PATH` (def. /admin), inyecta `<base href="…/">`
// en index.html y atiende la API en `<ruta>/api/*`. Por eso el build usa rutas relativas (`base: './'`) y el cliente
// calcula el prefijo de la API con `document.baseURI` (src/lib/apiBase.ts).
// En desarrollo se simula: base `/admin/`, `<base href="/admin/">` y `/admin/api/*` → `/api/*` del servidor.
const devBaseTag: Plugin = {
  name: 'portal-dev-base-tag', apply: 'serve',
  transformIndexHtml: () => [{ tag: 'base', attrs: { href: '/admin/' }, injectTo: 'head-prepend' }],
};

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/admin/',
  plugins: [react(), tailwindcss(), devBaseTag],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      '/admin/api': { target, rewrite: (p) => p.replace(/^\/admin\/api/, '/api') },
      '/api': target,
      '^/(?!admin(/|$)|@|node_modules/|src/|__vite)': target,
    },
  },
  build: {
    outDir: 'dist', sourcemap: false,
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'], radix: ['radix-ui'], dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'], icons: ['lucide-react'] } } },
  },
}));
