// Proceso de compilación MDX (lo lanza compiler.mjs con `child_process.fork`). Corre con el modelo de permisos de
// Node: solo LECTURA de las dependencias y del código del compilador, sin escritura, sin procesos hijos, sin hilos,
// sin variables de entorno y sin acceso a la BD (no recibe credenciales). Si algo del contenido lograra ejecutarse
// durante la compilación (un fallo de un plugin, gray-matter…), no tendría con qué hacer daño.
// Protocolo (IPC): {type:'init', linksNewTabCode} · {id, source, filePath} → {id, ok, code, pageMeta, ms} | {id, ok:false, error, problems?}
import { compilePage, configureMdx } from './mdx.mjs';

process.on('message', async m => {
  if (!m || typeof m !== 'object') return;
  if (m.type === 'init') {
    configureMdx({ linksNewTabCode: m.linksNewTabCode });
    process.send?.({ type: 'ready' });
    return;
  }
  const { id, source, filePath } = m;
  try {
    const r = await compilePage(source, filePath);
    process.send?.({ id, ok: true, code: r.code, pageMeta: r.pageMeta, ms: r.ms });
  } catch (e) {
    process.send?.({ id, ok: false, error: String(e?.message ?? e).slice(0, 2000), problems: Array.isArray(e?.problems) ? e.problems : null, unsafe: e?.code === 'ISP_CONTENT_UNSAFE' });
  }
});
process.on('disconnect', () => process.exit(0));
