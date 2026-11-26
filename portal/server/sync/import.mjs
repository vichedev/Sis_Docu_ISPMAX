// Importa el contenido del repo (docs/**/*.mdx, assets/**, site_files) a la base del portal.
// Uso: node server/sync/import.mjs [--test] [--overwrite=unedited|all] [--repo=RUTA]
//   --test usa TEST_DATABASE_URL; sin él, DATABASE_URL. Por defecto overwrite=unedited.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../env.mjs';
import { parsePage, renderPage } from './parse.mjs';
import {
  SITE_FILES, DOCS_SKIP_DIRS, STATE_KEY, isTourFile, TOUR_FILE_RE, listFiles, mimeOf, sha, md5, routeOfFile, seccionOf, cliPool, argValue,
} from './common.mjs';

/** Lee del repo páginas, assets y archivos de apoyo (sin tocar la BD). */
export async function readRepo(repoRoot = REPO_ROOT, log = () => {}) {
  const docsDir = path.join(repoRoot, 'docs');
  const assetsDir = path.join(repoRoot, 'assets');
  if (!existsSync(docsDir)) throw new Error(`No existe la carpeta docs/ en ${repoRoot}`);
  const pages = listFiles(docsDir, { skipDirs: DOCS_SKIP_DIRS, filter: r => r.endsWith('.mdx') }).map(rel => {
    const buf = readFileSync(path.join(docsDir, rel));
    const src = buf.toString('utf8');
    if (!Buffer.from(src, 'utf8').equals(buf)) log(`AVISO: ${rel} no es UTF-8 válido; se guarda su lectura en UTF-8.`);
    const p = parsePage(src);
    if (p.fmError) log(`AVISO: docs/${rel}: ${p.fmError}`);
    const route = routeOfFile(rel);
    const fm = p.frontmatter;
    return {
      route, file_path: rel, seccion: seccionOf(route), src, hash: sha(src),
      title: str(fm.title), description: str(fm.description), grupo: str(fm.grupo),
      orden: Number.isFinite(Number(fm.orden)) && fm.orden !== '' && fm.orden != null ? Math.trunc(Number(fm.orden)) : 0,
      frontmatter: fm, fm_raw: p.fmRaw, body: p.body,
    };
  });
  let sharp = null;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    log('AVISO: sharp no está disponible; los assets se guardan sin ancho/alto.');
  }
  // assets/tours/<slug>.json son tours, no assets.
  const tours = [];
  for (const rel of listFiles(assetsDir, { filter: isTourFile })) {
    try {
      const j = JSON.parse(readFileSync(path.join(assetsDir, rel), 'utf8').replace(/^﻿/, ''));
      const slug = TOUR_FILE_RE.exec(rel)[1];
      if (!j || typeof j !== 'object' || !Array.isArray(j.steps)) throw new Error('formato no válido');
      tours.push({
        slug, title: str(j.title) || slug, description: str(j.description),
        steps: j.steps.map(s => ({
          image: str(s.image), alt: str(s.alt), title: str(s.title), text: str(s.text), spot: s.spot ?? null, link: s.link ?? null,
        })),
      });
    } catch (e) {
      log(`AVISO: assets/${rel} no es un tour válido (${e.message}); se ignora.`);
    }
  }
  const assets = [];
  for (const rel of listFiles(assetsDir, { filter: r => !isTourFile(r) })) {
    const bytes = readFileSync(path.join(assetsDir, rel));
    const mime = mimeOf(rel);
    let width = null, height = null;
    if (sharp && mime.startsWith('image/')) {
      try {
        const m = await sharp(bytes).metadata();
        width = m.width ?? null;
        height = m.height ?? null;
      } catch {
        /* imagen que sharp no lee: sin dimensiones */
      }
    }
    assets.push({ path: rel, mime, bytes, width, height, size: bytes.length, hash: md5(bytes) });
  }
  const siteFiles = SITE_FILES.filter(f => existsSync(path.join(repoRoot, f))).map(f => {
    const content = readFileSync(path.join(repoRoot, f), 'utf8');
    return { path: f, content, hash: sha(content) };
  });
  return { pages, assets, siteFiles, tours };
}

const str = v => (v == null ? '' : typeof v === 'string' ? v : String(v));

/**
 * importFromRepo({ pool, repoRoot, overwrite:'all'|'unedited', log, userId }) → { pages, assets, siteFiles, skipped, ... }
 * - 'unedited': no pisa páginas con version>1, borradas o en borrador en el portal, ni las que difieran de lo último
 *   importado; tampoco assets ni site_files cambiados desde el último import. Las omitidas van en `skippedItems`.
 * - 'all': lo pisa todo; si la página estaba editada guarda antes una revisión y sube `version`.
 * Las páginas que vinieron de un import y ya no están en el repo se marcan `deleted_at` (si no se editaron o con 'all').
 * Todo en una transacción.
 */
export async function importFromRepo({ pool, repoRoot = REPO_ROOT, overwrite = 'unedited', log = () => {}, userId = null }) {
  if (!['all', 'unedited'].includes(overwrite)) throw new Error("overwrite debe ser 'all' o 'unedited'");
  log(`Leyendo el repo (${overwrite === 'all' ? 'sobrescribir todo' : 'sin pisar lo editado'})…`);
  const repo = await readRepo(repoRoot, log);
  log(`Repo: ${repo.pages.length} páginas, ${repo.assets.length} assets, ${repo.tours.length} tours, ${repo.siteFiles.length} archivos de apoyo.`);
  const c = await pool.connect();
  const r = { tours: 0, pages: 0, assets: 0, siteFiles: 0, skipped: 0, inserted: 0, updated: 0, unchanged: 0, removed: 0, skippedItems: [] };
  const skip = (what, why) => {
    r.skipped++;
    r.skippedItems.push(what);
    log(`Omitido ${what}: ${why}`);
  };
  try {
    await c.query('BEGIN');
    const st = (await c.query('SELECT value FROM settings WHERE key = $1 FOR UPDATE', [STATE_KEY])).rows[0]?.value ?? {};
    const state = { pages: { ...(st.pages ?? {}) }, assets: { ...(st.assets ?? {}) }, siteFiles: { ...(st.siteFiles ?? {}) } };

    // ── páginas
    const existing = new Map((await c.query('SELECT p.*, pp.route AS parent_route FROM pages p LEFT JOIN pages pp ON pp.id = p.parent_id')).rows.map(p => [p.route, p]));
    const touched = new Set(); // rutas insertadas o actualizadas ahora: reciben su padre del repo
    for (const p of repo.pages) {
      const old = existing.get(p.route);
      existing.delete(p.route);
      if (!old) {
        await c.query(
          `INSERT INTO pages (route, file_path, seccion, title, description, grupo, orden, frontmatter, fm_raw, body, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published')`,
          [p.route, p.file_path, p.seccion, p.title, p.description, p.grupo, p.orden, p.frontmatter, p.fm_raw, p.body],
        );
        r.inserted++; r.pages++; state.pages[p.route] = p.hash; touched.add(p.route);
        continue;
      }
      const current = renderPage(old);
      const live = old.deleted_at == null && old.status === 'published';
      if (live && current === p.src && old.file_path === p.file_path) {
        r.unchanged++; r.pages++; state.pages[p.route] = p.hash;
        continue;
      }
      const edited = old.version > 1 || !live || state.pages[p.route] !== sha(current);
      if (edited && overwrite === 'unedited') {
        skip(p.route, old.deleted_at ? 'borrada en el portal' : old.status === 'draft' ? 'en borrador en el portal' : 'editada en el portal');
        continue;
      }
      if (edited) await saveRevision(c, old, userId);
      await c.query(
        `UPDATE pages SET file_path=$2, seccion=$3, title=$4, description=$5, grupo=$6, orden=$7, frontmatter=$8, fm_raw=$9,
           body=$10, status='published', deleted_at=NULL, version = version + $11, updated_by = NULL, updated_at = now()
         WHERE id = $1`,
        [old.id, p.file_path, p.seccion, p.title, p.description, p.grupo, p.orden, p.frontmatter, p.fm_raw, p.body, edited ? 1 : 0],
      );
      r.updated++; r.pages++; state.pages[p.route] = p.hash; touched.add(p.route);
    }
    // `padre` (ruta) → parent_id, ya con todas las páginas del repo presentes.
    const ids = new Map((await c.query('SELECT id, route FROM pages WHERE deleted_at IS NULL')).rows.map(x => [x.route, x.id]));
    for (const p of repo.pages) {
      if (!touched.has(p.route)) continue;
      const padre = typeof p.frontmatter.padre === 'string' ? p.frontmatter.padre.trim().replace(/\/+$/, '') : '';
      let pid = null;
      if (padre) {
        pid = padre === p.route ? null : (ids.get(padre) ?? null);
        if (pid == null) log(`AVISO: ${p.route}: el padre "${padre}" no existe; se importa sin padre.`);
      }
      await c.query('UPDATE pages SET parent_id = $2 WHERE id = $1 AND parent_id IS DISTINCT FROM $2', [ids.get(p.route), pid]);
    }
    // Páginas importadas antes que ya no están en el repo.
    for (const old of existing.values()) {
      if (old.deleted_at || !(old.route in state.pages)) continue; // creadas en el portal o ya borradas
      const edited = old.version > 1 || old.status !== 'published' || state.pages[old.route] !== sha(renderPage(old));
      if (edited && overwrite === 'unedited') { skip(old.route, 'ya no está en el repo, pero se editó en el portal'); continue; }
      await c.query('UPDATE pages SET deleted_at = now() WHERE id = $1', [old.id]);
      delete state.pages[old.route];
      r.removed++;
      log(`Retirada ${old.route} (ya no está en el repo).`);
    }

    // ── assets (no se borran los que solo están en la BD: pueden haberse subido desde el portal)
    const oldAssets = new Map((await c.query('SELECT path, md5(bytes) AS hash, updated_by FROM assets')).rows.map(a => [a.path, a]));
    for (const a of repo.assets) {
      const old = oldAssets.get(a.path);
      if (old && old.hash === a.hash) { r.assets++; state.assets[a.path] = a.hash; continue; }
      if (old) {
        const edited = old.updated_by != null || state.assets[a.path] !== old.hash;
        if (edited && overwrite === 'unedited') { skip(`assets/${a.path}`, 'cambiado en el portal'); continue; }
      }
      await c.query(
        `INSERT INTO assets (path, mime, bytes, width, height, size, updated_by, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NULL,now())
         ON CONFLICT (path) DO UPDATE SET mime=EXCLUDED.mime, bytes=EXCLUDED.bytes, width=EXCLUDED.width, height=EXCLUDED.height,
           size=EXCLUDED.size, updated_by=NULL, updated_at=now()`,
        [a.path, a.mime, a.bytes, a.width, a.height, a.size],
      );
      r.assets++; state.assets[a.path] = a.hash;
    }

    // ── tours (se insertan si no existen; un tour ya presente solo se pisa con 'all')
    const oldTours = new Map((await c.query('SELECT id, slug FROM tours')).rows.map(t => [t.slug, t]));
    for (const t of repo.tours) {
      const old = oldTours.get(t.slug);
      if (!old) {
        await c.query(`INSERT INTO tours (slug, title, description, steps, status) VALUES ($1,$2,$3,$4,'published')`,
          [t.slug, t.title, t.description, JSON.stringify(t.steps)]);
      } else if (overwrite === 'all') {
        await c.query(
          `UPDATE tours SET title=$2, description=$3, steps=$4, status='published', deleted_at=NULL, version=version+1, updated_by=NULL, updated_at=now() WHERE id=$1`,
          [old.id, t.title, t.description, JSON.stringify(t.steps)]);
      } else { r.skipped++; r.skippedItems.push(`tours/${t.slug}`); log(`Omitido tour ${t.slug}: ya existe en el portal.`); continue; }
      r.tours++;
    }

    // ── archivos de apoyo
    const oldFiles = new Map((await c.query('SELECT path, content FROM site_files')).rows.map(f => [f.path, f]));
    for (const f of repo.siteFiles) {
      const old = oldFiles.get(f.path);
      if (old && old.content === f.content) { r.siteFiles++; state.siteFiles[f.path] = f.hash; continue; }
      if (old && state.siteFiles[f.path] !== sha(old.content) && overwrite === 'unedited') { skip(f.path, 'cambiado en el portal'); continue; }
      await c.query(
        `INSERT INTO site_files (path, content, updated_at) VALUES ($1,$2,now())
         ON CONFLICT (path) DO UPDATE SET content=EXCLUDED.content, updated_at=now()`,
        [f.path, f.content],
      );
      r.siteFiles++; state.siteFiles[f.path] = f.hash;
    }

    await c.query(
      `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1,$2,$3,now())
       ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=now()`,
      [STATE_KEY, { importedAt: new Date().toISOString(), repoRoot: path.resolve(repoRoot), ...state }, userId],
    );
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
  log(`Páginas: ${r.pages} (${r.inserted} nuevas, ${r.updated} actualizadas, ${r.unchanged} sin cambios, ${r.removed} retiradas) · ` +
    `assets: ${r.assets} · tours: ${r.tours} · archivos de apoyo: ${r.siteFiles} · omitidos: ${r.skipped}.`);
  return r;
}

async function saveRevision(c, p, userId) {
  const snapshot = {
    route: p.route, title: p.title, frontmatter: p.frontmatter, fm_raw: p.fm_raw, body: p.body,
    grupo: p.grupo, orden: p.orden, status: p.status, source: 'import',
  };
  await c.query('INSERT INTO page_revisions (page_id, version, snapshot, user_id) VALUES ($1,$2,$3,$4)', [p.id, p.version, snapshot, userId]);
}

// ── consola
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const { pool, test } = cliPool(argv);
  const overwrite = argValue(argv, 'overwrite', 'unedited');
  const repoRoot = path.resolve(argValue(argv, 'repo', REPO_ROOT));
  try {
    console.log(`Importando ${repoRoot} → ${test ? 'TEST_DATABASE_URL' : 'DATABASE_URL'}`);
    const r = await importFromRepo({ pool, repoRoot, overwrite, log: m => console.log(m) });
    console.log(JSON.stringify({ ...r, skippedItems: r.skippedItems.slice(0, 50) }));
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
