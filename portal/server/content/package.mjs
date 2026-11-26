// Paquete portable del contenido del manual (.ispmax): gzip de un JSON con páginas, tours, imágenes, redirecciones,
// archivos de apoyo y ajustes de contenido. Las referencias entre páginas van por RUTA, nunca por id.
// exportPackage({pool, outFile?, includeRevisions, log}) · importPackage({pool, source, mode, log}) · readPackage(source).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { PORTAL_ROOT } from '../env.mjs';
import { backupsDir } from '../settings.mjs';
import { httpError } from '../routes/util.mjs';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export const PACKAGE_FORMAT = 'ispmax-manual-content';
export const PACKAGE_VERSION = 1;
export const PACKAGE_EXT = '.ispmax';
export const PACKAGE_NAME_RE = /^ispmax-contenido-\d{8}-\d{6}(-\d+)?\.ispmax$/;
/** Únicas claves de `settings` que viajan en el paquete (nunca ajustes de entorno). */
export const CONTENT_SETTINGS = ['structure_groups', 'site_title', 'contact_whatsapp'];
const MAX_UNZIPPED = 1024 * 1024 * 1024;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

const pad = n => String(n).padStart(2, '0');
export function stamp(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
const sha256 = data => createHash('sha256').update(data).digest('hex');

/** Carpeta fija de paquetes: `<datos>/backups/content/` (no es un ajuste). El argumento se conserva por compatibilidad. */
export async function resolveContentDir(_getSetting) {
  const d = path.join(backupsDir(), 'content');
  await fsp.mkdir(d, { recursive: true });
  return d;
}

export async function uniquePackagePath(dir) {
  const base = `ispmax-contenido-${stamp()}`;
  let name = `${base}${PACKAGE_EXT}`;
  for (let i = 2; fs.existsSync(path.join(dir, name)); i++) name = `${base}-${i}${PACKAGE_EXT}`;
  return path.join(dir, name);
}

function appInfo(includeRevisions) {
  let version = null;
  try {
    version = JSON.parse(fs.readFileSync(path.join(PORTAL_ROOT, 'package.json'), 'utf8')).version;
  } catch {
    /* sin versión */
  }
  return { name: 'ispmax-manual-portal', version, includeRevisions: !!includeRevisions };
}

/** Conteos actuales de la BD (páginas vivas, borradores, imágenes, tours vivos, redirecciones, archivos de apoyo, revisiones). */
export async function currentCounts(pool) {
  const r = await pool.query(
    `SELECT (SELECT count(*) FROM pages WHERE deleted_at IS NULL)::int AS pages,
            (SELECT count(*) FROM pages WHERE deleted_at IS NULL AND status = 'draft')::int AS drafts,
            (SELECT count(*) FROM assets)::int AS assets,
            (SELECT count(*) FROM tours WHERE deleted_at IS NULL)::int AS tours,
            (SELECT count(*) FROM redirects)::int AS redirects,
            (SELECT count(*) FROM site_files)::int AS "siteFiles",
            (SELECT count(*) FROM page_revisions r JOIN pages p ON p.id = r.page_id WHERE p.deleted_at IS NULL)::int AS revisions`,
  );
  return r.rows[0];
}

/** ¿Hay contenido (cualquier fila en pages, assets o tours)? */
export async function hasContent(pool) {
  const r = await pool.query(
    `SELECT (SELECT count(*) FROM pages)::int + (SELECT count(*) FROM assets)::int + (SELECT count(*) FROM tours)::int AS n`,
  );
  return r.rows[0].n > 0;
}

/** Construye el objeto `data` del paquete desde la BD. */
async function collect(pool, includeRevisions, log) {
  const pages = (
    await pool.query(
      `SELECT p.route, p.file_path, p.seccion, p.title, p.description, p.grupo, p.orden, p.frontmatter, p.fm_raw, p.body,
              p.status, p.version, pp.route AS parent_route
         FROM pages p LEFT JOIN pages pp ON pp.id = p.parent_id AND pp.deleted_at IS NULL
        WHERE p.deleted_at IS NULL ORDER BY p.file_path, p.route`,
    )
  ).rows.map(p => ({
    route: p.route, file_path: p.file_path, seccion: p.seccion, title: p.title, description: p.description, grupo: p.grupo,
    orden: p.orden, frontmatter: p.frontmatter, fm_raw: p.fm_raw, body: p.body, status: p.status, version: p.version,
    deleted: false, parent_route: p.parent_route ?? null,
  }));
  const tours = (
    await pool.query(`SELECT slug, title, description, steps, status, version FROM tours WHERE deleted_at IS NULL ORDER BY slug`)
  ).rows;
  const assets = [];
  let last = '';
  for (;;) {
    const r = await pool.query(
      `SELECT path, mime, width, height, size, bytes FROM assets WHERE path > $1 ORDER BY path LIMIT 40`,
      [last],
    );
    if (!r.rows.length) break;
    for (const a of r.rows) assets.push({ path: a.path, mime: a.mime, width: a.width, height: a.height, size: a.size, b64: a.bytes.toString('base64') });
    last = r.rows[r.rows.length - 1].path;
  }
  const redirects = (await pool.query('SELECT from_route, to_route FROM redirects ORDER BY from_route')).rows;
  const site_files = (await pool.query('SELECT path, content FROM site_files ORDER BY path')).rows;
  const settings = {};
  for (const r of (await pool.query('SELECT key, value FROM settings WHERE key = ANY($1::text[]) ORDER BY key', [CONTENT_SETTINGS])).rows) settings[r.key] = r.value;
  const data = { pages, tours, assets, redirects, site_files, settings };
  if (includeRevisions) {
    data.revisions = (
      await pool.query(
        `SELECT p.route, r.version, r.snapshot, r.created_at FROM page_revisions r JOIN pages p ON p.id = r.page_id
          WHERE p.deleted_at IS NULL ORDER BY p.route, r.version, r.id`,
      )
    ).rows.map(r => ({ route: r.route, version: r.version, snapshot: r.snapshot, created_at: r.created_at }));
  }
  log(`Leído de la BD: ${pages.length} páginas, ${tours.length} tours, ${assets.length} imágenes, ${redirects.length} redirecciones, ${site_files.length} archivos de apoyo.`);
  return data;
}

function countsOf(data) {
  return {
    pages: data.pages.length,
    drafts: data.pages.filter(p => p.status === 'draft').length,
    assets: data.assets.length,
    tours: data.tours.length,
    redirects: data.redirects.length,
    siteFiles: data.site_files.length,
    revisions: data.revisions?.length ?? 0,
  };
}

/** Crea el paquete. Sin `outFile` lo deja en la carpeta de paquetes por defecto. */
export async function exportPackage({ pool, outFile, includeRevisions = false, log = () => {} }) {
  const data = await collect(pool, includeRevisions, log);
  const counts = countsOf(data);
  const pkg = {
    format: PACKAGE_FORMAT,
    version: PACKAGE_VERSION,
    createdAt: new Date().toISOString(),
    app: appInfo(includeRevisions),
    counts,
    sha256: sha256(JSON.stringify(data)),
    data,
  };
  const gz = await gzip(Buffer.from(JSON.stringify(pkg), 'utf8'), { level: 6 });
  const file = path.resolve(outFile || (await uniquePackagePath(await resolveContentDir())));
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const partial = file + '.partial';
  await fsp.writeFile(partial, gz);
  await fsp.rename(partial, file);
  log(`Paquete ${path.basename(file)}: ${gz.length} bytes (sha256 ${pkg.sha256.slice(0, 12)}…).`);
  return { file, size: gz.length, sha256: pkg.sha256, counts };
}

// ── lectura y validación

const bad = msg => httpError(400, `Paquete no válido: ${msg}`);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v, what) => {
  if (typeof v !== 'string') throw bad(`${what} debe ser texto.`);
  return v;
};
function safePath(v, what) {
  str(v, what);
  if (!v || v.includes('\\') || v.startsWith('/') || /^[a-zA-Z]:/.test(v) || v.includes('\0') || v.split('/').some(s => s === '..' || s === ''))
    throw bad(`${what} contiene una ruta no permitida (${JSON.stringify(v).slice(0, 80)}).`);
  return v;
}
function safeRoute(v, what) {
  str(v, what);
  if (!v.startsWith('/') || v.includes('\\') || v.includes('\0') || v.split('/').includes('..')) throw bad(`${what} no es una ruta válida (${JSON.stringify(v).slice(0, 80)}).`);
  return v;
}

/** Lee (ruta o Buffer), descomprime y valida el paquete. No toca la BD. Devuelve el objeto del paquete. */
export async function readPackage(source) {
  let buf;
  try {
    buf = Buffer.isBuffer(source) ? source : await fsp.readFile(source);
  } catch (e) {
    throw httpError(400, `No se pudo leer el archivo del paquete: ${e.code || e.message}.`);
  }
  if (buf.length < 2 || buf[0] !== 0x1f || buf[1] !== 0x8b) throw bad('el archivo no es un paquete .ispmax (no está comprimido con gzip).');
  let pkg;
  try {
    pkg = JSON.parse((await gunzip(buf, { maxOutputLength: MAX_UNZIPPED })).toString('utf8'));
  } catch {
    throw bad('el contenido está dañado o no es JSON.');
  }
  if (!isObj(pkg) || pkg.format !== PACKAGE_FORMAT) throw bad('no es un paquete de contenido del manual ISPMAX.');
  if (pkg.version !== PACKAGE_VERSION) throw bad(`versión de formato no admitida (${JSON.stringify(pkg.version)}); este portal lee la versión ${PACKAGE_VERSION}.`);
  const d = pkg.data;
  if (!isObj(d)) throw bad('falta el bloque data.');
  for (const k of ['pages', 'tours', 'assets', 'redirects', 'site_files']) if (!Array.isArray(d[k])) throw bad(`data.${k} debe ser una lista.`);
  if (!isObj(d.settings)) throw bad('data.settings debe ser un objeto.');
  if (d.revisions !== undefined && !Array.isArray(d.revisions)) throw bad('data.revisions debe ser una lista.');
  if (typeof pkg.sha256 !== 'string' || sha256(JSON.stringify(d)) !== pkg.sha256) throw bad('la suma de verificación (sha256) no coincide: el archivo está alterado o incompleto.');

  const routes = new Set();
  for (const p of d.pages) {
    if (!isObj(p)) throw bad('una página no es un objeto.');
    safeRoute(p.route, 'route');
    if (routes.has(p.route)) throw bad(`ruta repetida: ${p.route}`);
    routes.add(p.route);
    safePath(p.file_path, `file_path de ${p.route}`);
    str(p.seccion, 'seccion'); str(p.body, `body de ${p.route}`);
    for (const k of ['title', 'description', 'grupo']) if (p[k] != null) str(p[k], `${k} de ${p.route}`);
    if (!isObj(p.frontmatter)) throw bad(`frontmatter de ${p.route} debe ser un objeto.`);
    if (p.fm_raw != null) str(p.fm_raw, `fm_raw de ${p.route}`);
    if (!['draft', 'published'].includes(p.status)) throw bad(`estado no válido en ${p.route}.`);
    if (p.parent_route != null) safeRoute(p.parent_route, `parent_route de ${p.route}`);
  }
  const slugs = new Set();
  for (const t of d.tours) {
    if (!isObj(t) || typeof t.slug !== 'string' || !SLUG_RE.test(t.slug)) throw bad('un tour tiene un slug no válido.');
    if (slugs.has(t.slug)) throw bad(`tour repetido: ${t.slug}`);
    slugs.add(t.slug);
    if (!Array.isArray(t.steps)) throw bad(`los pasos del tour ${t.slug} deben ser una lista.`);
    if (!['draft', 'published'].includes(t.status)) throw bad(`estado no válido en el tour ${t.slug}.`);
  }
  const apaths = new Set();
  for (const a of d.assets) {
    if (!isObj(a)) throw bad('un asset no es un objeto.');
    safePath(a.path, 'path de asset');
    if (apaths.has(a.path)) throw bad(`asset repetido: ${a.path}`);
    apaths.add(a.path);
    str(a.mime, `mime de ${a.path}`); str(a.b64, `b64 de ${a.path}`);
  }
  for (const r of d.redirects) {
    if (!isObj(r)) throw bad('una redirección no es un objeto.');
    str(r.from_route, 'from_route'); str(r.to_route, 'to_route');
    if (r.from_route.split('/').includes('..')) throw bad('una redirección contiene "..".');
  }
  const fpaths = new Set();
  for (const f of d.site_files) {
    if (!isObj(f)) throw bad('un archivo de apoyo no es un objeto.');
    safePath(f.path, 'path de archivo de apoyo'); str(f.content, `content de ${f.path}`);
    if (fpaths.has(f.path)) throw bad(`archivo de apoyo repetido: ${f.path}`);
    fpaths.add(f.path);
  }
  for (const k of Object.keys(d.settings)) if (!CONTENT_SETTINGS.includes(k)) throw bad(`el ajuste "${k}" no es de contenido y no se admite.`);
  for (const r of d.revisions ?? []) {
    if (!isObj(r) || typeof r.route !== 'string' || !isObj(r.snapshot) || !Number.isInteger(r.version)) throw bad('una revisión no es válida.');
  }
  return pkg;
}

// ── importación

const emptySkipped = () => ({ pages: 0, assets: 0, tours: 0, redirects: 0, siteFiles: 0, settings: 0, revisions: 0, total: 0 });

/**
 * Importa un paquete. `replace`: en una transacción vacía el contenido (nunca usuarios, sesiones, auditoría, trabajos,
 * respaldos ni ajustes de entorno) e inserta todo; antes, si la BD tenía contenido, guarda un paquete de seguridad en
 * `safetyDir` (por defecto la carpeta de paquetes). `merge`: solo añade lo que no existe (ruta/slug/path/clave).
 * → { counts, skipped, safety: {file,size,sha256,counts}|null }
 */
export async function importPackage({ pool, source, mode = 'replace', log = () => {}, safetyDir }) {
  if (!['replace', 'merge'].includes(mode)) throw httpError(400, "El modo debe ser 'replace' o 'merge'.");
  const pkg = await readPackage(source);
  const d = pkg.data;
  log(`Paquete válido (creado ${pkg.createdAt}): ${d.pages.length} páginas, ${d.assets.length} imágenes, ${d.tours.length} tours.`);

  let safety = null;
  if (mode === 'replace' && (await hasContent(pool))) {
    log('La base tiene contenido: se guarda un paquete de seguridad antes de reemplazarlo…');
    const dir = safetyDir || (await resolveContentDir());
    await fsp.mkdir(dir, { recursive: true });
    safety = await exportPackage({ pool, outFile: await uniquePackagePath(dir), includeRevisions: true, log });
    log(`Paquete de seguridad: ${path.basename(safety.file)}.`);
  }

  const counts = { pages: 0, drafts: 0, assets: 0, tours: 0, redirects: 0, siteFiles: 0, revisions: 0, settings: 0 };
  const skipped = emptySkipped();
  const skip = k => { skipped[k]++; skipped.total++; };
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (mode === 'replace') {
      await c.query('TRUNCATE page_revisions, pages, assets, tours RESTART IDENTITY');
      await c.query('DELETE FROM redirects');
      await c.query('DELETE FROM site_files');
      await c.query('DELETE FROM settings WHERE key = ANY($1::text[])', [CONTENT_SETTINGS]);
      log('Contenido anterior vaciado (usuarios, sesiones, auditoría, trabajos y respaldos no se tocan).');
    }
    // páginas
    const inserted = new Map(); // ruta → id (solo las insertadas ahora)
    for (const p of d.pages) {
      const r = await c.query(
        `INSERT INTO pages (route, file_path, seccion, title, description, grupo, orden, frontmatter, fm_raw, body, status, version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (route) DO NOTHING RETURNING id`,
        [p.route, p.file_path, p.seccion, p.title ?? '', p.description ?? '', p.grupo ?? '', Number.isInteger(p.orden) ? p.orden : 0,
          JSON.stringify(p.frontmatter), p.fm_raw ?? null, p.body, p.status, Number.isInteger(p.version) && p.version > 0 ? p.version : 1],
      );
      if (!r.rowCount) { skip('pages'); continue; }
      inserted.set(p.route, r.rows[0].id);
      counts.pages++;
      if (p.status === 'draft') counts.drafts++;
    }
    // padres por ruta (segunda pasada): el padre puede ser uno ya existente (merge)
    const ids = new Map((await c.query('SELECT id, route FROM pages WHERE deleted_at IS NULL')).rows.map(x => [x.route, x.id]));
    for (const p of d.pages) {
      if (!p.parent_route || !inserted.has(p.route)) continue;
      const pid = p.parent_route === p.route ? null : ids.get(p.parent_route);
      if (pid == null) { log(`AVISO: ${p.route}: el padre "${p.parent_route}" no existe; se importa sin padre.`); continue; }
      await c.query('UPDATE pages SET parent_id = $2 WHERE id = $1', [inserted.get(p.route), pid]);
    }
    // revisiones (solo de páginas insertadas ahora)
    for (const r of d.revisions ?? []) {
      const pid = inserted.get(r.route);
      if (!pid) { skip('revisions'); continue; }
      await c.query('INSERT INTO page_revisions (page_id, version, snapshot, created_at) VALUES ($1,$2,$3,$4)', [pid, r.version, JSON.stringify(r.snapshot), r.created_at ?? new Date().toISOString()]);
      counts.revisions++;
    }
    // imágenes
    for (const a of d.assets) {
      const bytes = Buffer.from(a.b64, 'base64');
      const r = await c.query(
        `INSERT INTO assets (path, mime, bytes, width, height, size) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (path) DO NOTHING`,
        [a.path, a.mime, bytes, Number.isInteger(a.width) ? a.width : null, Number.isInteger(a.height) ? a.height : null, bytes.length],
      );
      if (r.rowCount) counts.assets++; else skip('assets');
    }
    // tours
    for (const t of d.tours) {
      const r = await c.query(
        `INSERT INTO tours (slug, title, description, steps, status, version) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (slug) DO NOTHING`,
        [t.slug, t.title ?? '', t.description ?? '', JSON.stringify(t.steps), t.status, Number.isInteger(t.version) && t.version > 0 ? t.version : 1],
      );
      if (r.rowCount) counts.tours++; else skip('tours');
    }
    for (const r of d.redirects) {
      const x = await c.query('INSERT INTO redirects (from_route, to_route) VALUES ($1,$2) ON CONFLICT (from_route) DO NOTHING', [r.from_route, r.to_route]);
      if (x.rowCount) counts.redirects++; else skip('redirects');
    }
    for (const f of d.site_files) {
      const x = await c.query('INSERT INTO site_files (path, content) VALUES ($1,$2) ON CONFLICT (path) DO NOTHING', [f.path, f.content]);
      if (x.rowCount) counts.siteFiles++; else skip('siteFiles');
    }
    for (const [k, v] of Object.entries(d.settings)) {
      const x = await c.query('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k, JSON.stringify(v)]);
      if (x.rowCount) counts.settings++; else skip('settings');
    }
    // secuencias al máximo existente
    for (const [t, s] of [['pages', 'pages_id_seq'], ['page_revisions', 'page_revisions_id_seq'], ['assets', 'assets_id_seq'], ['tours', 'tours_id_seq']]) {
      await c.query(`SELECT setval('${s}', GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${t}), 1), (SELECT COUNT(*) > 0 FROM ${t}))`);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
  log(`Importado (${mode}): ${counts.pages} páginas (${counts.drafts} borradores), ${counts.assets} imágenes, ${counts.tours} tours, ` +
    `${counts.redirects} redirecciones, ${counts.siteFiles} archivos de apoyo, ${counts.revisions} revisiones; omitido por existir: ${skipped.total}.`);
  return { counts, skipped, safety };
}
