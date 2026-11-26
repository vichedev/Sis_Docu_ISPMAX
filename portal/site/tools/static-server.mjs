// Sirve el build estático de referencia (portal/work-test/manual-dev/dist) con la misma resolución de rutas que el
// portal (resolveSiteFile de frontend.mjs) para compararlo con el dinámico. Uso: node site/tools/static-server.mjs [4410]
import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import { resolveSiteFile, safeRelPath } from '../../server/http/frontend.mjs';
import { REPO } from '../config.mjs';

const DIST = process.env.SPIKE_STATIC_DIST || path.join(REPO, 'portal', 'work-test', 'manual-dev', 'dist');
const port = Number(process.argv[2]) || 4410;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const app = Fastify();
app.get('/*', async (req, reply) => {
  const rel = safeRelPath(req.url.split('?')[0]);
  const file = rel === null ? null : await resolveSiteFile(DIST, rel);
  const abs = path.join(DIST, ...(file ?? '404.html').split('/'));
  return reply.code(file ? 200 : 404).type(MIME[path.extname(abs)] ?? 'application/octet-stream').send(fs.readFileSync(abs));
});
await app.listen({ port, host: '127.0.0.1' });
console.log(`[estático] http://127.0.0.1:${port} (${DIST})`);
