// Hilo de compilación MDX (modo de respaldo de compiler.mjs cuando el proceso con permisos no puede arrancar). Mismo
// protocolo que compile-child.mjs. Se crea con `env: {}` (sin variables de entorno) y sin acceso a la BD.
import { parentPort } from 'node:worker_threads';
import { compilePage, configureMdx } from './mdx.mjs';

parentPort.on('message', async m => {
  if (!m || typeof m !== 'object') return;
  if (m.type === 'init') {
    configureMdx({ linksNewTabCode: m.linksNewTabCode });
    parentPort.postMessage({ type: 'ready' });
    return;
  }
  const { id, source, filePath } = m;
  try {
    const r = await compilePage(source, filePath);
    parentPort.postMessage({ id, ok: true, code: r.code, pageMeta: r.pageMeta, ms: r.ms });
  } catch (e) {
    parentPort.postMessage({ id, ok: false, error: String(e?.message ?? e).slice(0, 2000), problems: Array.isArray(e?.problems) ? e.problems : null, unsafe: e?.code === 'ISP_CONTENT_UNSAFE' });
  }
});
