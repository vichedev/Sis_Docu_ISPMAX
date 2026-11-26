// Configuración del sitio dinámico a partir de `rspress.config.ts` del repo (fuente única: menú superior, redes,
// contacto, textos i18n, título…) y del menú lateral calculado desde la BD. Con `createSiteData` y `getI18nData` de
// Rspress se normaliza exactamente igual que en el build estático (enlaces `.html`, textos por idioma).
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createSiteData } from '@rspress/core/dist/node/runtimeModule/siteData/createSiteData.js';
import { getI18nData } from '@rspress/core/dist/node/runtimeModule/i18n.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');

/**
 * Carga rspress.config.ts en memoria (esbuild: TS → CJS, paquetes externos). El config lee `<ISPMAX_DOCS_DIR>/_nav.json`
 * al importarse: se le da un `{}` fijo (config-stub/), porque el menú lateral real sale de la BD.
 */
export async function loadRspressConfig({ publicUrl = '' } = {}) {
  const { build } = await import('esbuild');
  const out = await build({
    entryPoints: [path.join(REPO, 'rspress.config.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    write: false,
    logLevel: 'silent',
  });
  const code = out.outputFiles[0].text;
  const base = createRequire(path.join(REPO, 'rspress.config.ts'));
  // `@rspress/core` solo se usa para `defineConfig` (identidad) y su paquete no admite require().
  const req = id => (id === '@rspress/core' ? { defineConfig: c => c } : base(id));
  const mod = { exports: {} };
  const saved = { docs: process.env.ISPMAX_DOCS_DIR, url: process.env.PORTAL_PUBLIC_URL, warn: console.warn };
  process.env.ISPMAX_DOCS_DIR = path.join(HERE, 'config-stub');
  process.env.PORTAL_PUBLIC_URL = publicUrl;
  console.warn = () => {};
  try {
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', '__dirname', '__filename', code)(req, mod, mod.exports, REPO, path.join(REPO, 'rspress.config.ts'));
  } finally {
    if (saved.docs === undefined) delete process.env.ISPMAX_DOCS_DIR;
    else process.env.ISPMAX_DOCS_DIR = saved.docs;
    if (saved.url === undefined) delete process.env.PORTAL_PUBLIC_URL;
    else process.env.PORTAL_PUBLIC_URL = saved.url;
    console.warn = saved.warn;
  }
  return mod.exports.default ?? mod.exports;
}

/** `siteData` como el módulo virtual de Rspress + textos i18n del idioma del sitio. */
export async function buildSiteData(config, { sidebar, base = '/' }) {
  const userConfig = { ...config, base, themeConfig: { ...config.themeConfig, sidebar: structuredClone(sidebar) } };
  userConfig.themeConfig.nav = structuredClone(config.themeConfig.nav);
  const { siteData } = await createSiteData(userConfig);
  const lang = config.lang || 'es';
  const i18nAll = await getI18nData({ ...config, themeConfig: {} });
  const i18n = Object.fromEntries(Object.entries(i18nAll).map(([k, v]) => [k, v[lang] ?? v.en]));
  return { ...siteData, i18n };
}
