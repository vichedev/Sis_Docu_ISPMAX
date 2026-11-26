// Tema compilado del manual dinámico (portal/site/dist): las pruebas que dibujan páginas lo necesitan. Si falta, se
// compila una vez (npm run site:build, ~6-10 s) en vez de saltarse las pruebas.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PORTAL_ROOT } from '../../server/env.mjs';
import { themeStatus } from '../../site/theme.mjs';

export function ensureTheme() {
  if (themeStatus().ok) return themeStatus();
  const vite = createRequire(path.join(PORTAL_ROOT, 'package.json')).resolve('vite/bin/vite.js');
  for (const extra of [[], ['--ssr']]) {
    const r = spawnSync(process.execPath, [vite, 'build', '-c', 'site/client/vite.config.mjs', ...extra], { cwd: PORTAL_ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('no se pudo compilar el tema del manual (npm run site:build)');
  }
  return themeStatus();
}
