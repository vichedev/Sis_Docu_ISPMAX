// Consola del paquete de contenido (despliegue por terminal).
//   npm run content:export -- [salida] [--revisions] [--test]
//   npm run content:import -- <archivo> [--merge] [--yes] [--test]
// Sin --test usa DATABASE_URL (portal/.env); con --test, TEST_DATABASE_URL. Una carpeta como salida recibe el nombre estándar.
import fs from 'node:fs';
import path from 'node:path';
import { cliPool } from '../sync/common.mjs';
import { exportPackage, importPackage, resolveContentDir, uniquePackagePath, hasContent, currentCounts } from './package.mjs';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const positional = argv.filter(a => !a.startsWith('--'));
const cmd = positional.shift();
const log = m => console.log(m);

async function contentDirOf(pool) {
  const getSetting = async (key, def) => (await pool.query('SELECT value FROM settings WHERE key = $1', [key])).rows[0]?.value ?? def;
  return resolveContentDir(getSetting);
}

async function main() {
  if (!['export', 'import'].includes(cmd)) {
    console.error('Uso:\n  content:export -- [salida] [--revisions] [--test]\n  content:import -- <archivo> [--merge] [--yes] [--test]');
    process.exitCode = 2;
    return;
  }
  const { pool, test } = cliPool(argv);
  try {
    console.log(`Base: ${test ? 'TEST_DATABASE_URL' : 'DATABASE_URL'}`);
    if (cmd === 'export') {
      let out = positional[0];
      if (!out) out = await uniquePackagePath(await contentDirOf(pool));
      else if (fs.existsSync(out) && fs.statSync(out).isDirectory()) out = await uniquePackagePath(out);
      const r = await exportPackage({ pool, outFile: out, includeRevisions: flags.has('--revisions'), log });
      console.log(JSON.stringify({ file: r.file, size: r.size, sha256: r.sha256, counts: r.counts }, null, 2));
    } else {
      const file = positional[0];
      if (!file) throw new Error('Falta el archivo del paquete.');
      const mode = flags.has('--merge') ? 'merge' : 'replace';
      if (mode === 'replace' && (await hasContent(pool)) && !flags.has('--yes')) {
        const c = await currentCounts(pool);
        throw new Error(`La base ya tiene contenido (${c.pages} páginas, ${c.assets} imágenes, ${c.tours} tours) y se va a REEMPLAZAR. ` +
          'Se guardará antes un paquete de seguridad. Añada --yes para continuar (o --merge para solo añadir lo que falta).');
      }
      const r = await importPackage({ pool, source: path.resolve(file), mode, log, safetyDir: await contentDirOf(pool) });
      console.log(JSON.stringify({ mode, counts: r.counts, skipped: r.skipped, safety: r.safety?.file ?? null }, null, 2));
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
await main();
