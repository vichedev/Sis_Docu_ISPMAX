// Huella barata del CÓDIGO que forma el manual (tema, componentes, estilos, scripts y configuración).
// Se guarda en site-meta.json al construir y se compara después: si cambia (p. ej. tras «Actualizar el sistema» o al
// editar el tema), el sitio publicado está desfasado y se reconstruye solo, igual que cuando cambia el contenido.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIRS = ['scripts', 'src', 'styles', 'theme'];
const FILES = ['rspress.config.ts', 'tsconfig.json', 'package.json', 'package-lock.json'];
const SKIP_DIRS = new Set(['node_modules', '.cache', '.git', 'dist']);
// Generado en cada build: no es código fuente y cambiaría la huella sin motivo.
const SKIP_FILES = new Set(['src/search/data.json']);

export function codeFingerprint(repoRoot) {
  const lines = [];
  const walk = (dir, rel) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), r);
      } else if (e.isFile() && !SKIP_FILES.has(r) && !e.name.endsWith('.log')) {
        const st = fs.statSync(path.join(dir, e.name));
        lines.push(`${r}:${st.size}:${Math.floor(st.mtimeMs)}`);
      }
    }
  };
  for (const d of DIRS) walk(path.join(repoRoot, d), d);
  for (const f of FILES) {
    try {
      const st = fs.statSync(path.join(repoRoot, f));
      lines.push(`${f}:${st.size}:${Math.floor(st.mtimeMs)}`);
    } catch {
      /* el archivo puede no existir */
    }
  }
  lines.sort();
  return crypto.createHash('sha1').update(lines.join('\n')).digest('hex').slice(0, 16);
}
