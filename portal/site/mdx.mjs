// Compilador MDX del manual dinámico: el MISMO pipeline que Rspress 2 (`@rspress/core/dist/node/mdx/processor.js`),
// con sus propios plugins remark/rehype (GFM, CJK, índice, contenedores `:::`, enlaces, imágenes, anclas de
// encabezados, Shiki, enlaces externos) y el plugin del repo (`src/plugins/rehypeLinksNewTab.ts`).
// Diferencias deliberadas con el build estático:
//   · salida `function-body` (no un módulo ES con imports): se verifica y se evalúa en el servidor en un contexto
//     aislado (safety.mjs) y se sirve al navegador envuelta en un módulo ES (sin `eval`, compatible con la CSP);
//   · sin `remarkBuiltin` (imports de los componentes globales): los componentes llegan por el MDXProvider;
//   · sin `remarkFileCodeBlock` (```x file="…"``` leería un archivo del SERVIDOR) y con `remarkContentSafety`
//     primero (lista de permitidos sobre el árbol recién parseado; ver safety.mjs);
//   · sin `routeService` (no hay árbol de archivos): los enlaces internos no se reescriben a `.html` (el `<Link>` de
//     Rspress los limpia igual con `cleanUrls`) y no se comprueban enlaces rotos (eso lo hace el portal al guardar).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createProcessor, extractTextAndId, loadFrontMatter } from '@rspress/core/dist/9940.js';
import { createMDXOptions } from '@rspress/core/dist/node/mdx/options.js';
import { remarkFileCodeBlock } from '@rspress/core/dist/node/mdx/remarkPlugins/fileCodeBlock.js';
import { applyReplaceRules } from '@rspress/core/dist/node/utils/applyReplaceRules.js';
import { escapeMarkdownHeadingIds } from '@rspress/core/dist/node/utils/escapeHeadingIds.js';
import { remarkContentSafety, checkSource } from './safety.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');
export const LINKS_PLUGIN_FILE = path.join(REPO, 'src', 'plugins', 'rehypeLinksNewTab.ts');
const require = createRequire(import.meta.url);
const { INTERNAL_KEYS, stripFrontmatterSource } = require(path.join(REPO, 'src', 'plugins', 'internalFrontmatter.cjs'));

/** .ts del repo → JavaScript (esbuild quita los tipos en memoria; no escribe nada). */
export async function transpileTs(file) {
  const { transform } = await import('esbuild');
  return (await transform(fs.readFileSync(file, 'utf8'), { loader: 'ts', format: 'esm' })).code;
}
const importJs = code => import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

/**
 * `remarkContainerSyntax` de Rspress añade `import { Callout as $$$callout$$$ } from '@rspress/core/theme'`. En
 * `function-body` un import exige cargar módulos en tiempo de ejecución: se quita y el componente `$$$callout$$$`
 * llega por el MDXProvider (DocLayout ya lo pasa: `$$$callout$$$: Callout`).
 */
const remarkDropThemeImports = () => tree => {
  tree.children = tree.children.filter(n => !(n.type === 'mdxjsEsm' && /from\s+["']@rspress\/core\/theme["']/.test(n.value ?? '')));
};

let linksPluginCode = null;
/** El proceso de compilación (sin permiso para lanzar esbuild) recibe el plugin ya transpilado. */
export function configureMdx({ linksNewTabCode } = {}) {
  if (linksNewTabCode) linksPluginCode = linksNewTabCode;
}

let configPromise;
/** Lo que `createMDXOptions` lee de `rspress.config.ts` (solo `markdown`): mismos plugins que el sitio estático. */
function mdxConfig() {
  return (configPromise ??= (async () => importJs(linksPluginCode ?? (await transpileTs(LINKS_PLUGIN_FILE))))().then(m => ({
    markdown: {
      remarkPlugins: [remarkDropThemeImports],
      rehypePlugins: [m.default],
      // Las imágenes viven en la BD, no en docs/public: la comprobación de imágenes rotas la hace el portal.
      image: { checkDeadImages: false },
      link: { checkDeadLinks: false },
    },
    themeConfig: {},
  })));
}

/** Frontmatter público (sin las claves internas): lo mismo que `ispmaxPublicFrontmatter` de rspress.config.ts. */
export function publicFrontmatter(fm = {}) {
  const out = structuredClone(fm);
  for (const k of INTERNAL_KEYS) delete out[k];
  if (out.verificado && typeof out.verificado === 'object') {
    delete out.verificado.metodo;
    delete out.verificado.version;
  }
  return out;
}

const DOCS_DIR = path.join(REPO, 'docs'); // solo como prefijo de rutas virtuales (no se lee)
const isFileCodeBlock = p => p === remarkFileCodeBlock || (Array.isArray(p) && p[0] === remarkFileCodeBlock);

/**
 * Compila el texto completo de una página (.mdx con frontmatter, como lo exporta el portal) →
 * { code, pageMeta: { title, headingTitle, toc, frontmatter }, ms }. Lanza ContentSafetyError si el contenido no
 * está permitido (safety.mjs).
 */
export async function compilePage(source, filePath = 'pagina.mdx') {
  const t0 = performance.now();
  checkSource(source);
  const rel = String(filePath).replace(/\\/g, '/');
  if (!/^[\w./-]+\.mdx$/.test(rel) || rel.split('/').some(s => s === '..' || s === '.')) throw new Error('ruta de página no válida');
  const filepath = path.join(DOCS_DIR, rel);
  const config = await mdxConfig();
  const mdxOptions = await createMDXOptions({ config, docDirectory: DOCS_DIR, filepath, pluginDriver: null, routeService: null, addDependency: () => {} });
  mdxOptions.remarkPlugins = [remarkContentSafety, ...mdxOptions.remarkPlugins.filter(p => !isFileCodeBlock(p))];
  const stripped = stripFrontmatterSource(source);
  const { frontmatter, emptyLinesSource } = loadFrontMatter(stripped, filepath, DOCS_DIR, true);
  const pre = escapeMarkdownHeadingIds(applyReplaceRules(emptyLinesSource, []));
  const compiler = createProcessor({ ...mdxOptions, outputFormat: 'function-body', development: false });
  compiler.data('pageMeta', { toc: [], title: '', headingTitle: '', frontmatter });
  const vfile = await compiler.process({ value: pre, path: filepath });
  const meta = compiler.data('pageMeta');
  const headingTitle = extractTextAndId(meta.title)[0];
  const frontmatterTitle = extractTextAndId(frontmatter.title)[0];
  return {
    code: String(vfile),
    pageMeta: { toc: meta.toc, title: frontmatterTitle || headingTitle, headingTitle, frontmatter: publicFrontmatter(frontmatter) },
    ms: performance.now() - t0,
  };
}

/** Módulo ES para el navegador: el cuerpo de función envuelto; el runtime lo publica el bundle cliente en globalThis. */
export function toBrowserModule(code, meta) {
  return `const __rt = globalThis.__ISP_MDX_RT__;\nconst __m = (function(){${code}\n}).call(undefined, __rt);\nexport default __m.default;\nexport const meta = ${JSON.stringify(meta).replace(/</g, '\\u003c')};\n`;
}
