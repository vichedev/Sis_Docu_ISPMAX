// Publicar: BD → portal/work/site/ (copia ligera del repo + exportToDir) → npm run build → portal/data/site/ (reemplazo atómico).
// Nunca escribe en docs/, assets/, src/, scripts/ ni rspress.config.ts del repo: solo los lee.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTAL_ROOT, normDrive } from '../env.mjs';
import { run, safeEnv, npmCommand } from './proc.mjs';
import { getInternal, dataDir as fixedDataDir } from '../settings.mjs';
import { codeFingerprint } from './codefp.mjs';

/**
 * Carpetas de trabajo y de datos. Por defecto portal/work y portal/data; las pruebas usan otras con
 * PORTAL_WORK_DIR / PORTAL_DATA_DIR para no pisar el sitio real. Se leen en cada uso (no al importar).
 */
export function opsPaths() {
  const workDir = path.resolve(process.env.PORTAL_WORK_DIR || path.join(PORTAL_ROOT, 'work'));
  const dataDir = fixedDataDir();
  return {
    workDir,
    dataDir,
    workSite: path.join(workDir, 'site'),
    dataSite: path.join(dataDir, 'site'),
    siteMeta: path.join(dataDir, 'site-meta.json'),
  };
}

/** Base de rutas por defecto del sitio publicado (ajuste `site_base`): el manual ocupa la raíz del puerto. */
export const DEFAULT_BASE = '/';
/** Primer segmento que ocupa el propio portal y que no puede usar el sitio. */
export const RESERVED_BASES = ['api', 'admin', 'healthz'];
const BASE_RE = /^\/(?:[A-Za-z0-9._~-]+\/)*$/;

/** Valida `site_base`: empieza y termina con "/", sin "..", sin chocar con /api/. Devuelve el mensaje de error o null. */
export function siteBaseError(v) {
  if (typeof v !== 'string' || !v) return 'La base del sitio debe ser texto.';
  if (!v.startsWith('/') || !v.endsWith('/')) return 'La base del sitio debe empezar y terminar con "/" (ej. /manual/ o /).';
  if (v.length > 100 || !BASE_RE.test(v) || v.split('/').some(s => s === '.' || s === '..')) {
    return 'La base del sitio solo admite letras, números, ".", "_", "-" y "~" entre barras.';
  }
  const first = v.split('/')[1]?.toLowerCase();
  if (first && RESERVED_BASES.includes(first)) return `La base del sitio no puede empezar por /${first}/ (la usa el portal).`;
  return null;
}

/** Base del sitio (interna: PORTAL_SITE_BASE, def. "/"); si no es válida, usa la base por defecto. */
export async function getSiteBase(ctx) {
  const v = await getInternal(ctx, 'site_base');
  return siteBaseError(v) ? DEFAULT_BASE : v;
}

const COPY_FILES = ['tsconfig.json', 'package.json', 'package-lock.json'];
// theme/: tema propio de Rspress (Tailwind); styles/: tailwind.css (styles/legacy/ se copia pero no se usa).
const COPY_DIRS = ['scripts', 'src', 'styles', 'theme'];
const REQUIRED = ['docs/index.mdx', 'docs/sidebar.json', 'src/legacy-routes.json', 'assets/logo/ISPMAX.png'];
const BUILD_TIMEOUT = 20 * 60_000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function walkCount(dir, re) {
  let n = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += await walkCount(p, re);
    else if (re.test(e.name)) n++;
  }
  return n;
}

async function listFiles(dir, re, base = dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await listFiles(p, re, base, acc);
    else if (re.test(e.name)) acc.push(path.relative(base, p).replace(/\\/g, '/'));
  }
  return acc;
}

/** Borra un enlace (symlink/junction) sin tocar su destino. */
function unlinkLink(p) {
  try {
    fs.unlinkSync(p);
  } catch {
    fs.rmdirSync(p);
  }
}

async function renameRetry(from, to, tries = 8) {
  for (let i = 0; ; i++) {
    try {
      await fsp.rename(from, to);
      return;
    } catch (e) {
      // En Windows un archivo abierto (p. ej. sirviéndose) bloquea el rename un instante.
      if (i >= tries || !['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'].includes(e.code)) throw e;
      await sleep(250 * (i + 1));
    }
  }
}

/** Prepara portal/work/site/: limpia todo salvo node_modules (enlace) y copia los archivos de construcción del repo. */
export async function prepareWorkDir(repoRoot, log, { base = DEFAULT_BASE, title = '', whatsapp = '' } = {}) {
  const WORK_SITE = opsPaths().workSite;
  await fsp.mkdir(WORK_SITE, { recursive: true });
  const nm = path.join(WORK_SITE, 'node_modules');
  for (const e of await fsp.readdir(WORK_SITE, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(WORK_SITE, e.name);
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) unlinkLink(p);
    else await fsp.rm(p, { recursive: true, force: true, maxRetries: 3 });
  }

  // node_modules → enlace al del repo (junction en Windows: no requiere privilegios).
  const target = path.join(repoRoot, 'node_modules');
  if (!fs.existsSync(path.join(target, '@rspress', 'core'))) {
    throw new Error(`Faltan las dependencias del manual en ${target} (ejecute "npm ci" en la raíz del repo).`);
  }
  let st = null;
  try {
    st = fs.lstatSync(nm);
  } catch {}
  if (st?.isSymbolicLink()) {
    let actual = '';
    try {
      actual = fs.realpathSync(nm);
    } catch {}
    // Windows no distingue mayúsculas en las rutas; Linux sí.
    const norm = p => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
    if (norm(actual) !== norm(fs.realpathSync(target))) {
      unlinkLink(nm);
      st = null;
    }
  } else if (st) {
    throw new Error(`${nm} es una carpeta real y no un enlace; bórrela a mano antes de publicar.`);
  }
  if (!st) {
    fs.symlinkSync(target, nm, process.platform === 'win32' ? 'junction' : 'dir');
    log(`Enlace node_modules → ${target}`);
  }

  // Configuración: la del repo tal cual (como rspress.config.repo.ts) y un envoltorio que fija la base (`site_base`).
  await fsp.copyFile(path.join(repoRoot, 'rspress.config.ts'), path.join(WORK_SITE, 'rspress.config.repo.ts'));
  // Marca (ajustes site_title / contact_whatsapp): solo si hay algún valor; vacío = configuración original intacta.
  const brand = !!(String(title).trim() || String(whatsapp).trim());
  if (brand) {
    await fsp.copyFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'branding.mjs'), path.join(WORK_SITE, 'portal-branding.mjs'));
    log(`Marca del sitio: ${title ? `título «${title}»` : 'título original'}, ${whatsapp ? `WhatsApp ${whatsapp}` : 'WhatsApp original'}`);
  }
  await fsp.writeFile(
    path.join(WORK_SITE, 'rspress.config.ts'),
    [
      '// Generado por el portal (no editar): configuración del repo con la base del sitio publicado en el portal.',
      '// buildCache desactivado: la caché persistente de Rspack 2.1.5 falla ("Value is none of these types NormalModule…")',
      '// cuando cambian los archivos de entrada, y cada publicación reescribe el contenido exportado desde la BD.',
      "import repoConfig from './rspress.config.repo';",
      ...(brand ? ["// @ts-ignore", "import { applyBranding } from './portal-branding.mjs';"] : []),
      brand ? `const rc: any = applyBranding(repoConfig, { title: ${JSON.stringify(String(title).trim())}, whatsapp: ${JSON.stringify(String(whatsapp).trim())} });` : 'const rc: any = repoConfig;',
      'export default {',
      '  ...rc,',
      `  base: ${JSON.stringify(base)},`,
      '  builderConfig: {',
      '    ...(rc.builderConfig || {}),',
      '    performance: { ...((rc.builderConfig || {}).performance || {}), buildCache: false },',
      '  },',
      '};',
      '',
    ].join('\n'),
  );
  for (const f of COPY_FILES) await fsp.copyFile(path.join(repoRoot, f), path.join(WORK_SITE, f));
  for (const d of COPY_DIRS) {
    await fsp.cp(path.join(repoRoot, d), path.join(WORK_SITE, d), {
      recursive: true,
      // El índice del buscador (src/search/data.json) se regenera en el build.
      filter: s => !/[\\/]search[\\/]data\.json$/.test(s) && !/[\\/]node_modules([\\/]|$)/.test(s),
    });
  }
  // La única imagen sin base es <Figure src="/assets/…">: en la copia de trabajo se le aplica withBase.
  await patchFigure(WORK_SITE, log);
}

async function patchFigure(WORK_SITE, log) {
  const f = path.join(WORK_SITE, 'src', 'components', 'Figure.tsx');
  if (!fs.existsSync(f)) return;
  let src = await fsp.readFile(f, 'utf8');
  if (!src.includes('src={src}')) {
    log('Aviso: Figure.tsx cambió; las imágenes de <Figure> pueden no verse si la base del sitio no es /.');
    return;
  }
  src = "import { withBase } from '@rspress/core/runtime';\n" + src.replace('src={src}', 'src={withBase(src)}');
  await fsp.writeFile(f, src);
}

/** Valida `build_command`: solo `npm run <script>` con un script existente en package.json. */
export function parseBuildCommand(cmd, pkg) {
  const parts = String(cmd || 'npm run build').trim().split(/\s+/);
  if (parts.length !== 3 || parts[0] !== 'npm' || !['run', 'run-script'].includes(parts[1]) || !/^[\w:.-]+$/.test(parts[2])) {
    throw new Error(`build_command no permitido: "${cmd}". Solo se admite "npm run <script>".`);
  }
  if (!pkg.scripts?.[parts[2]]) throw new Error(`El script "${parts[2]}" no existe en package.json.`);
  return parts[2];
}

export async function readMeta() {
  try {
    return JSON.parse(await fsp.readFile(opsPaths().siteMeta, 'utf8'));
  } catch {
    return null;
  }
}

/** Línea `RESULTADO: {...}` del log de un trabajo (persistencia del resultado en publish_jobs). */
export function parseResult(logText) {
  const m = String(logText || '').match(/^RESULTADO: (.+)$/m);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export function createPublisher({ ctx, jobs }) {
  /**
   * Lanza una construcción del sitio (trabajo `publish`). Devuelve `{ jobId, done }`; `done` resuelve
   * `{ status:'ok'|'error', ... }` al terminar. 409 si ya hay otra en curso; 400 si `build_command` no es válido.
   */
  async function publish(userId, { reasons = [], trigger = 'manual' } = {}) {
    if (!ctx.sync?.exportToDir) {
      const e = new Error('El módulo de sincronización (exportToDir) no está disponible.');
      e.statusCode = 503;
      throw e;
    }
    const repoRoot = normDrive(path.resolve((await getInternal(ctx, 'repo_path')) || ctx.repoRoot));
    const buildCommand = await getInternal(ctx, 'build_command');
    const title = String((await ctx.getSetting('site_title', '')) || '').trim();
    const whatsapp = String((await ctx.getSetting('contact_whatsapp', '')) || '').trim();
    const base = await getSiteBase(ctx);
    // URL pública (PORTAL_PUBLIC_URL, ya validada en config.mjs): canonical, Open Graph y JSON-LD del tema.
    const publicUrl = ctx.config?.publicUrl ?? '';
    // Petición manual: error inmediato (400). Automática: el fallo queda registrado en el trabajo (estado `error`).
    if (trigger === 'manual') {
      try {
        parseBuildCommand(buildCommand, JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')));
      } catch (e) {
        e.statusCode = 400;
        throw e;
      }
    }
    const { workSite: WORK_SITE, dataDir: DATA_DIR, dataSite: DATA_SITE, siteMeta: SITE_META } = opsPaths();
    return jobs.start(
      'publish',
      userId,
      async ({ log, jobId }) => {
        const t0 = Date.now();
        const startedAt = new Date(t0).toISOString();
        log(`Construcción del sitio #${jobId} (${trigger === 'auto' ? 'automática' : trigger === 'system' ? 'actualización del sistema' : 'manual'}) — repo ${repoRoot}`);
        if (reasons.length) log(`Motivos: ${reasons.slice(0, 20).join(' · ')}${reasons.length > 20 ? ` · y ${reasons.length - 20} más` : ''}`);
        log('1/5 Preparando la carpeta de trabajo…');
        const codeFp = codeFingerprint(repoRoot);
        await prepareWorkDir(repoRoot, log, { base, title, whatsapp });

        log('2/5 Exportando páginas y archivos desde la base de datos…');
        const exp = await ctx.sync.exportToDir({ pool: ctx.pool, outDir: WORK_SITE, log });
        if (exp) log(`Exportación: ${JSON.stringify(exp)}`);
        const faltan = REQUIRED.filter(f => !fs.existsSync(path.join(WORK_SITE, f)));
        if (faltan.length) throw new Error(`La exportación no generó archivos necesarios para el build: ${faltan.join(', ')}`);
        const mdx = (await listFiles(path.join(WORK_SITE, 'docs'), /\.mdx$/)).filter(f => !f.startsWith('public/'));
        log(`Páginas exportadas: ${mdx.length}`);

        log(`3/5 Construyendo el sitio (${buildCommand}, base ${base})…`);
        const pkg = JSON.parse(await fsp.readFile(path.join(WORK_SITE, 'package.json'), 'utf8'));
        const script = parseBuildCommand(buildCommand, pkg);
        const npm = npmCommand();
        if (!npm) throw new Error('No se encontró npm-cli.js junto a Node (defina PORTAL_NPM_CLI).');
        const [cmd, args] = [npm.cmd, [...npm.args, 'run', script]];
        const env = safeEnv({ FORCE_COLOR: '0', NO_COLOR: '1', npm_config_update_notifier: 'false', RSPRESS_PERSISTENT_CACHE: 'false', PORTAL_PUBLIC_URL: publicUrl });
        if (!publicUrl) log('Aviso: PORTAL_PUBLIC_URL no está definida; el sitio se genera sin canonical, og:url ni og:image.');
        // Las rutas de contenido del build son siempre las de la carpeta de trabajo (rspress.config.ts y scripts/
        // aceptan estas variables para scripts/manual-corpus.mjs; aquí no deben heredarse del entorno del portal).
        for (const k of ['ISPMAX_DOCS_DIR', 'ISPMAX_ASSETS_DIR', 'ISPMAX_SEARCH_DATA', 'ISPMAX_LEGACY_ROUTES', 'ISPMAX_DIST_DIR']) delete env[k];
        const r = await run(cmd, args, { cwd: WORK_SITE, env, log, timeoutMs: BUILD_TIMEOUT, capture: false });
        if (r.code !== 0) throw new Error(`El build terminó con código ${r.code}; se conserva el sitio publicado anterior.`);

        log('4/5 Comprobando el resultado…');
        const dist = path.join(WORK_SITE, 'dist');
        if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('El build no generó dist/index.html; se conserva el sitio publicado anterior.');
        const htmlFiles = await walkCount(dist, /\.html$/);
        const contenido = htmlFiles - (fs.existsSync(path.join(dist, '404.html')) ? 1 : 0);
        log(`HTML generados: ${htmlFiles} (${contenido} de contenido + 404) · páginas exportadas: ${mdx.length}`);
        if (contenido !== mdx.length) log(`Aviso: el número de HTML de contenido (${contenido}) no coincide con el de páginas (${mdx.length}).`);

        log('5/5 Reemplazando el sitio publicado…');
        await fsp.mkdir(DATA_DIR, { recursive: true });
        for (const e of await fsp.readdir(DATA_DIR)) {
          if (/^site\.(tmp|old)-/.test(e)) await fsp.rm(path.join(DATA_DIR, e), { recursive: true, force: true });
        }
        const tmp = path.join(DATA_DIR, `site.tmp-${jobId}`);
        const old = path.join(DATA_DIR, `site.old-${jobId}`);
        await renameRetry(dist, tmp);
        const habia = fs.existsSync(DATA_SITE);
        if (habia) await renameRetry(DATA_SITE, old);
        try {
          await renameRetry(tmp, DATA_SITE);
        } catch (e) {
          if (habia) await renameRetry(old, DATA_SITE).catch(() => {});
          throw new Error(`No se pudo colocar el sitio nuevo (${e.code || e.message}); se conserva el anterior.`);
        }
        if (habia) await fsp.rm(old, { recursive: true, force: true, maxRetries: 5 }).catch(() => log('Aviso: no se pudo borrar la copia anterior.'));
        const meta = {
          jobId,
          userId: userId ?? null,
          trigger,
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - t0,
          base,
          code: codeFp,
          title: title || null,
          whatsapp: whatsapp || null,
          pages: mdx.length,
          htmlFiles,
          export: exp ?? null,
        };
        await fsp.writeFile(SITE_META, JSON.stringify(meta, null, 2));
        log(`Publicado en ${base} en ${Math.round(meta.durationMs / 1000)} s.`);
        log(`RESULTADO: ${JSON.stringify({ pages: mdx.length, htmlFiles, durationMs: meta.durationMs, base, trigger })}`);
        await ctx.audit(userId ?? null, 'publish', `job:${jobId}`, { pages: mdx.length, htmlFiles, trigger }).catch(() => {});
        return meta;
      },
      'Ya hay una construcción del sitio en curso.',
    );
  }

  async function status() {
    const job = await jobs.latest('publish');
    const meta = await readMeta();
    const base = await getSiteBase(ctx);
    return {
      running: job?.status === 'running',
      job,
      site: { exists: fs.existsSync(path.join(opsPaths().dataSite, 'index.html')), url: base, ...(meta || {}) },
    };
  }

  return { publish, status };
}
