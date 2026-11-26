import { resetTestDb } from './helpers/reset-db.mjs';
import { safeRm } from './helpers/safe-rm.mjs';
// El árbol de GET /api/structure debe ser el menú real del manual: mismos grupos, ítems, textos y orden que el menú que calcula
// `scripts/build-nav.mjs` sobre el corpus (repo o paquete .ispmax, test/helpers/corpus.mjs), y el menú superior el de rspress.config.ts.
// build-nav se ejecuta sobre una COPIA del corpus en portal/work-test/nav-test/ (ISPMAX_DOCS_DIR): nunca escribe en docs/ del repo.
// Usa TEST_DATABASE_URL (destructivo: vacía las tablas y reimporta el corpus).
// Uso: node --test --test-concurrency=1 test/structure-nav.test.mjs   (desde portal/)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';
import { getCorpus, corpusSkip, describeCorpus } from './helpers/corpus.mjs';

loadEnv();
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('Falta TEST_DATABASE_URL');
if (TEST_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
process.env.DATABASE_URL = TEST_URL;
process.env.PORTAL_ADMIN_USER = 'admin_nav';
process.env.PORTAL_ADMIN_PASSWORD = 'Clave-de-prueba-1';
process.env.PORTAL_SITE_AUTO = 'off'; // sin reconstrucciones automáticas del sitio

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); // solo para rspress.config.ts y scripts/ (no son contenido)
const skip = corpusSkip;
const CORPUS = getCorpus();
const NAV_DIR = path.join(PORTAL_ROOT, 'work-test', 'nav-test');

/** Ejecuta build-nav sobre una copia del corpus y devuelve el _nav.json resultante (el docs/ del repo no se toca). */
function navDelCorpus() {
  safeRm(NAV_DIR);
  const docs = path.join(NAV_DIR, 'docs');
  mkdirSync(NAV_DIR, { recursive: true });
  cpSync(CORPUS.docsDir, docs, { recursive: true, filter: (src) => !['public', '_generated', 'node_modules', '_nav.json'].includes(path.basename(src)) });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-nav.mjs')], {
    cwd: ROOT, env: { ...process.env, ISPMAX_DOCS_DIR: docs }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(readFileSync(path.join(docs, '_nav.json'), 'utf8'));
}
const { buildApp } = await import('../server/index.mjs');
const { importFromRepo } = await import('../server/sync/import.mjs');
const { TOP_MENU } = await import('../server/routes/topnav.mjs');
const SEC_KEYS = ['tareas', 'problemas', 'preguntas', 'referencia', 'conceptos', 'guia'];

let app, cookie, structure;
const req = async (method, url, payload) => {
  const res = await app.inject({ method, url, payload, headers: { cookie } });
  let json = null;
  try { json = res.json(); } catch {}
  return { status: res.statusCode, json };
};
const fromApi = (grupos) => {
  const item = (n) => ({ text: n.menu ?? n.title, link: n.route, ...(n.children.length ? { items: n.children.map(item) } : {}) });
  return grupos.map((g) => ({ name: g.name, items: g.pages.map(item) }));
};
const fromNav = (groups) => {
  const item = (i) => ({ text: i.text, link: i.link, ...(i.items?.length ? { items: i.items.map(item) } : {}) });
  return groups.map((g) => ({ name: g.sectionHeader, items: g.items.map(item) }));
};

before(async () => {
  if (skip) { console.log('# ' + describeCorpus(CORPUS)); return; }
  const pg = (await import('pg')).default;
  const c = new pg.Client({ connectionString: TEST_URL });
  await c.connect();
  await resetTestDb(c);
  await c.end();
  app = await buildApp({ databaseUrl: TEST_URL });
  await app.portal.ensureAdmin();
  await importFromRepo({ pool: app.portal.ctx.pool, repoRoot: CORPUS.root, overwrite: 'all' });
  const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin_nav', password: 'Clave-de-prueba-1' } });
  cookie = `portal_session=${r.cookies.find((x) => x.name === 'portal_session').value}`;
  structure = (await req('GET', '/api/structure')).json;
});
after(async () => { await app?.close(); safeRm(NAV_DIR); });

test('cada sección: grupos, ítems, textos y orden == build-nav del corpus (0 diferencias)', { skip }, () => {
  const nav = navDelCorpus();
  let items = 0;
  const count = (xs) => xs.reduce((n, i) => n + 1 + count(i.items ?? []), 0);
  for (const key of SEC_KEYS) {
    const sec = structure.secciones.find((s) => s.key === key);
    assert.ok(sec, `falta la sección ${key}`);
    const got = fromApi(sec.grupos);
    const want = fromNav(nav[`/${key}/`]);
    assert.deepEqual(got, want, `la sección ${key} no coincide con build-nav`);
    items += got.reduce((n, g) => n + count(g.items), 0);
  }
  assert.ok(items > 250, `pocos ítems comparados: ${items}`);
  console.log(`   ${items} ítems en ${SEC_KEYS.length} secciones: 0 diferencias con build-nav (${CORPUS.source})`);
});

test('la portada de cada sección va aparte y no es un grupo "sin nombre"', { skip }, () => {
  for (const key of ['tareas', 'problemas', 'preguntas', 'referencia', 'conceptos']) {
    const sec = structure.secciones.find((s) => s.key === key);
    assert.equal(sec.sectionIndex?.route, `/${key}`, `portada de ${key}`);
    assert.ok(!sec.grupos.some((g) => !g.name), `grupo sin nombre en ${key}`);
    assert.ok(!sec.grupos.some((g) => g.pages.some((p) => p.route === `/${key}`)));
  }
});

test('sin grupos vacíos fantasma; los creados desde el panel se pueden borrar', { skip }, async () => {
  for (const s of structure.secciones) assert.ok(s.grupos.every((g) => g.pages.length > 0), `grupo vacío en ${s.key}`);
  assert.equal((await req('POST', '/api/structure/groups', { seccion: 'referencia', name: 'zz-vacio' })).status, 201);
  const g = (await req('GET', '/api/structure')).json.secciones.find((s) => s.key === 'referencia').grupos;
  assert.ok(g.some((x) => x.name === 'zz-vacio' && x.pages.length === 0));
  assert.equal((await req('DELETE', '/api/structure/groups', { seccion: 'referencia', name: 'zz-vacio' })).status, 200);
  const g2 = (await req('GET', '/api/structure')).json.secciones.find((s) => s.key === 'referencia').grupos;
  assert.ok(!g2.some((x) => x.name === 'zz-vacio'));
  assert.equal((await req('DELETE', '/api/structure/groups', { seccion: 'referencia', name: 'zz-vacio' })).status, 404);
  assert.equal((await req('DELETE', '/api/structure/groups', { seccion: 'referencia', name: 'Procesos' })).status, 409);
});

test('guardar el orden tal cual no cambia el menú (mismo orden que build-nav)', { skip }, async () => {
  const sec = structure.secciones.find((s) => s.key === 'tareas');
  const before_ = JSON.stringify(fromApi(sec.grupos));
  const nodes = (ps) => ps.map((p) => ({ id: p.id, children: nodes(p.children) }));
  const r = await req('PUT', '/api/structure/order', { seccion: 'tareas', grupos: sec.grupos.map((g) => ({ name: g.name, nodes: nodes(g.pages) })) });
  assert.equal(r.status, 200);
  const after_ = JSON.stringify(fromApi((await req('GET', '/api/structure')).json.secciones.find((s) => s.key === 'tareas').grupos));
  assert.equal(after_, before_);
});

test('menú superior == nav de rspress.config.ts', { skip }, () => {
  const cfg = readFileSync(path.join(ROOT, 'rspress.config.ts'), 'utf8');
  const start = cfg.indexOf('nav: [');
  assert.ok(start > 0, 'no se encontró nav en rspress.config.ts');
  const block = cfg.slice(start, cfg.indexOf('socialLinks', start));
  const texts = [...block.matchAll(/text:\s*'([^']+)'/g)].map((m) => m[1]);
  const want = [];
  for (const m of TOP_MENU) { want.push(m.text); for (const it of m.items ?? []) want.push(it.text); }
  assert.deepEqual(texts, want, 'textos del menú superior');
  const links = [...block.matchAll(/link:\s*'([^']+)'/g)].map((m) => m[1]);
  const wantLinks = [];
  for (const m of TOP_MENU) { if (m.link) wantLinks.push(m.link); for (const it of m.items ?? []) wantLinks.push(it.link); }
  assert.deepEqual(links, wantLinks, 'enlaces del menú superior');
  assert.match(block, /WHATSAPP/);
  assert.deepEqual(structure.menu.map((m) => m.text), ['Guía', 'Quiero hacer…', 'Tengo un problema', 'Preguntas', 'Referencia', 'Soporte']);
  const ref = structure.menu.find((m) => m.key === 'referencia');
  assert.ok(ref.items.every((i) => i.page && i.page.id), 'cada ítem de Referencia debe resolver a una página');
  assert.equal(structure.menu.find((m) => m.key === 'soporte').kind, 'external');
});
