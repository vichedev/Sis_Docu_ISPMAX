// Servidor simulado del portal (Node puro, sin dependencias, datos ficticios).
// Uso: node mock/server.mjs [puerto]   (por defecto 4380; sirve también dist/ si existe)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] || process.env.MOCK_PORT || 4380);
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const now = () => new Date().toISOString();
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();

const users = [
  { id: 1, username: 'admin', display_name: 'Administrador demo', role: 'admin', password: 'demo1234', last_login: ago(5) },
  { id: 2, username: 'ana', display_name: 'Ana Editora', role: 'editor', password: 'demo1234', last_login: ago(300) },
  { id: 3, username: 'leo', display_name: 'Leo Lector', role: 'viewer', password: 'demo1234', last_login: null },
];
const sessions = new Map();
const SEC = { tareas: 'Tareas', guia: 'Guía', problemas: 'Problemas', preguntas: 'Preguntas', referencia: 'Referencia', conceptos: 'Conceptos' };
let nextId = 1;
const pages = [];
const groups = {
  tareas: { Clientes: ['Crear un cliente', 'Editar los datos de un cliente', 'Suspender un servicio', 'Reactivar un servicio'], 'Facturación': ['Emitir una factura', 'Anular una factura', 'Registrar un pago', 'Enviar el estado de cuenta'] },
  guia: { Acceso: ['Inicio de sesión', 'Cambiar la contraseña', 'Recuperar el acceso'], Cobranza: ['Pantalla de cobranza', 'Cortes automáticos', 'Promesas de pago', 'Recibos'], Red: ['Routers', 'Planes de velocidad', 'Mapa de la red'] },
  problemas: { General: ['No puedo iniciar sesión', 'La factura no llega al cliente', 'El router no responde'] },
  preguntas: { General: ['¿Cómo cambio el logo?', '¿Puedo tener varias sucursales?', '¿Qué pasa al suspender?'] },
  referencia: { Permisos: ['Roles y permisos', 'Mensajes del sistema'] },
  conceptos: { 'Básicos': ['Cliente, servicio y plan', 'Ciclo de facturación'] },
};
const sl = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const [seccion, gs] of Object.entries(groups)) {
  Object.entries(gs).forEach(([g, titles]) => { titles.forEach((title, k) => { const i = k + 1;
    const slug = sl(title);
    const route = seccion === 'tareas' ? `/${seccion}/${sl(g)}/${slug}` : `/${seccion}/${slug}`;
    pages.push({ id: nextId++, route, file_path: `docs${route}.mdx`, seccion, title, description: `Qué resuelve «${title}» (texto de demostración).`, grupo: g, orden: i, parent_id: null,
      frontmatter: { title: `${g}: tema ${i}`, description: `Descripción ficticia de ${g} ${i}.`, tipo: seccion, estado: 'verificado' },
      body: `<Lead>Entradilla de ejemplo.</Lead>\n\n## Cómo llegar\n\n<Steps>\n<Step>\n\nAbra el menú **${g}**.\n\n</Step>\n</Steps>\n\n:::tip Nota\n\nTexto de ejemplo.\n\n:::\n`,
      status: i === 4 ? 'draft' : 'published', version: 1, updated_at: ago(3200 + i * 700 + nextId * 37), updated_by_name: i % 2 ? 'Ana Editora' : null, deleted: false, revs: [] });
  }); });
}
// Subpáginas de ejemplo (Adenda 2)
{ const parent = pages.find((p) => p.title === 'Pantalla de cobranza');
  for (const [k, title] of ['Filtros de la lista', 'Exportar a Excel'].entries()) { const slug = sl(title); pages.push({ ...parent, id: nextId++, route: `/guia/${slug}`, file_path: `docs/guia/${slug}.mdx`, title, orden: k + 1, parent_id: parent.id, status: 'published', updated_at: ago(30 + k), revs: [] }); } }
pages[0].updated_at = ago(20); pages[5].updated_at = ago(45);
// Miniaturas realistas: lee (solo lectura) las capturas del manual en assets/imgs del repositorio.
const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets');
const assets = [];
const walk = (d) => { try { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.webp$/.test(f.name)) assets.push({ path: path.relative(ASSETS_DIR, p).split(path.sep).join('/'), size: fs.statSync(p).size, width: 1280, height: 760, mime: 'image/webp', updated_at: ago(5000) }); } } catch { /* sin repo */ } };
walk(path.join(ASSETS_DIR, 'imgs'));
assets.splice(90);
if (!assets.length) for (let i = 1; i <= 14; i++) assets.push({ path: `imgs/demo/tema/${String(i).padStart(2, '0')}-pantalla.webp`, size: 20000 + i * 1300, width: 1200, height: 700, mime: 'image/png' });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==', 'base64');
let sidebar = [{ text: 'Acceso', items: [{ text: 'Inicio de sesión', link: '/guia/acceso' }] }];
let settings = { site_title: '', contact_whatsapp: '', auto_publish: true, auto_publish_delay: 8, backup_keep: 20 };
// Solo los ajustes editables (como el servidor real): lo demás lo fija el despliegue.
const definitions = [
  { key: 'site_title', label: 'Nombre del manual', help: 'Se muestra en la cabecera y en la pestaña del navegador.', type: 'string', section: 'general', max: 80 },
  { key: 'contact_whatsapp', label: 'WhatsApp de soporte', help: 'Con código de país.', type: 'string', section: 'general' },
  { key: 'auto_publish', label: 'Actualizar el manual al guardar', type: 'boolean', section: 'manual' },
  { key: 'auto_publish_delay', label: 'Espera antes de actualizar (segundos)', type: 'number', section: 'manual', min: 1, max: 120 },
  { key: 'backup_keep', label: 'Copias a conservar', type: 'number', section: 'respaldos', min: 1, max: 1000 },
];
let backups = [{ id: 1, filename: 'ispmax-manual-20261120-101500.dump', size: 4_200_000, created_at: ago(7000) }];
const audit = [];
const log = (u, action, target, detail) => audit.unshift({ id: audit.length + 1, created_at: now(), user_name: u?.display_name ?? null, action, target, detail });
for (let i = 0; i < 70; i++) audit.push({ id: 1000 + i, created_at: ago(i * 20), user_name: 'Ana Editora', action: i % 3 ? 'page.update' : 'asset.upload', target: `/guia/tema-${i}`, detail: { version: i } });
const jobs = [];
const startJob = (kind, steps) => {
  const job = { id: jobs.length + 1 + (jobs.length ? 0 : 1), kind, status: 'running', log: '', started_at: now(), finished_at: null };
  jobs.unshift(job);
  steps.forEach((s, i) => setTimeout(() => { job.log += s + '\n'; if (i === steps.length - 1) { job.status = 'ok'; job.finished_at = now(); } }, 700 * (i + 1)));
  return job;
};
const running = () => jobs.some((j) => j.status === 'running');
jobs.push({ id: 1, kind: 'publish', status: 'ok', log: '1/5 Preparando…\n2/5 Exportando…\n3/5 Construyendo…\n4/5 Comprobando…\n5/5 Reemplazando…\nPublicado.', started_at: ago(2880), finished_at: ago(2876) });

const J = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
const err = (res, code, error) => J(res, code, { error });
const body = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
const rank = { viewer: 1, editor: 2, admin: 3 };
const pub = (u) => ({ id: u.id, username: u.username, display_name: u.display_name, role: u.role });
const sum = (p) => ({ id: p.id, route: p.route, title: p.title, seccion: p.seccion, grupo: p.grupo, orden: p.orden, status: p.status, version: p.version, updated_at: p.updated_at, updated_by_name: p.updated_by_name });
const full = (p) => ({ ...sum(p), file_path: p.file_path, description: p.description, frontmatter: p.frontmatter, body: p.body });

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const m = req.method;
  if (!p.startsWith('/api/')) return serveStatic(p, res);
  const sid = /portal_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  const me = sid ? sessions.get(sid) : null;
  if (p === '/api/auth/login' && m === 'POST') {
    const b = JSON.parse((await body(req)).toString() || '{}');
    const u = users.find((x) => x.username === b.username && x.password === b.password);
    if (!u) return err(res, 401, 'Usuario o contraseña incorrectos.');
    const id = Math.random().toString(36).slice(2);
    sessions.set(id, u);
    res.setHeader('Set-Cookie', `portal_session=${id}; HttpOnly; SameSite=Lax; Path=/`);
    return J(res, 200, { user: pub(u) });
  }
  if (!me) return err(res, 401, 'Debe iniciar sesión.');
  const need = (min) => { if (rank[me.role] < rank[min]) { err(res, 403, 'No tiene permiso para esta acción.'); return false; } return true; };
  if (p === '/api/auth/logout') { sessions.delete(sid); return J(res, 200, { ok: true }); }
  if (p === '/api/auth/me') return J(res, 200, { user: pub(me) });
  if (p === '/api/auth/password' && m === 'PUT') { const b = JSON.parse((await body(req)).toString()); if (b.current !== me.password) return err(res, 400, 'La contraseña actual no es correcta.'); me.password = b.new; return J(res, 200, { ok: true }); }
  if (p === '/api/stats') {
    const live = pages.filter((x) => !x.deleted);
    return J(res, 200, { pages: live.length, drafts: live.filter((x) => x.status === 'draft').length, assets: assets.length, users: users.length,
      lastPublish: (() => { const j = jobs.find((x) => x.kind === 'publish' && x.finished_at); return j ? { status: j.status, finished_at: j.finished_at } : null; })(),
      lastBackup: { filename: backups.at(-1)?.filename ?? '', created_at: backups.at(-1)?.created_at ?? now() },
      bySeccion: Object.keys(SEC).map((s) => ({ seccion: s, count: live.filter((x) => x.seccion === s).length })),
      unpublished: (() => { const ok = jobs.find((j) => j.kind === 'publish' && j.status === 'ok'); const since = ok ? +new Date(ok.started_at) : 0; const pg = pages.filter((x) => +new Date(x.updated_at) > since).length; const as = since ? assets.filter((a) => a.updated_at && +new Date(a.updated_at) > since).length : 3; return { pages: pg, assets: as, tours: 0, total: pg + as }; })() });
  }
  if (p === '/api/pages' && m === 'GET') {
    const q = (url.searchParams.get('q') || '').toLowerCase(); const s = url.searchParams.get('seccion'); const st = url.searchParams.get('status');
    const lim = Number(url.searchParams.get('limit') || 50), off = Number(url.searchParams.get('offset') || 0);
    const l = pages.filter((x) => !x.deleted && (!s || x.seccion === s) && (!st || x.status === st) && (!q || (x.title + x.route).toLowerCase().includes(q)));
    return J(res, 200, { total: l.length, items: l.slice(off, off + lim).map(sum) });
  }
  if (p === '/api/pages' && m === 'POST') {
    if (!need('editor')) return;
    const b = JSON.parse((await body(req)).toString());
    if (!b.slug || !b.title) return err(res, 400, 'Faltan título o slug.');
    const route = `/${b.seccion}/${b.modulo ? b.modulo + '/' : ''}${b.slug}`;
    if (pages.some((x) => x.route === route && !x.deleted)) return err(res, 409, `Ya existe una página con la ruta ${route}.`);
    const g = b.grupo || null;
    const np = { id: nextId++, route, file_path: `docs${route}.mdx`, seccion: b.seccion, title: b.title, description: b.description || '', grupo: g, orden: pages.filter((x) => x.grupo === g && x.seccion === b.seccion).length + 1,
      frontmatter: { title: b.title, tipo: b.tipo, estado: 'borrador' }, body: '## Cómo llegar\n\n## Pasos\n', status: 'draft', version: 1, updated_at: now(), updated_by_name: me.display_name, deleted: false, revs: [] };
    pages.push(np); log(me, 'page.create', route);
    return J(res, 201, full(np));
  }
  if (p === '/api/pages/validate' && m === 'POST') {
    const b = JSON.parse((await body(req)).toString());
    const problems = [];
    (b.body || '').split('\n').forEach((ln, i) => {
      if (/<[a-z][a-z ]*>/.test(ln.replace(/<\/?(Steps?|Lead|Figure|Badge|Cards?|Callout|Kicker)[^>]*>/g, '').replace(/`[^`]*`/g, ''))) problems.push({ level: 'error', message: 'Etiqueta o texto entre < > sin cerrar; póngalo entre comillas invertidas.', line: i + 1 });
      if (/<Figure[^>]*src="\/assets\/[^"]*nada[^"]*"/.test(ln)) problems.push({ level: 'warning', message: 'La imagen no existe.', line: i + 1 });
    });
    return J(res, 200, { ok: !problems.some((x) => x.level === 'error'), problems });
  }
  let mm;
  if ((mm = /^\/api\/pages\/(\d+)(?:\/(.*))?$/.exec(p))) {
    const pg = pages.find((x) => x.id === Number(mm[1]));
    if (!pg) return err(res, 404, 'Página no encontrada.');
    const sub = mm[2];
    if (!sub && m === 'GET') return J(res, 200, full(pg));
    if (!sub && m === 'PUT') {
      if (!need('editor')) return;
      const b = JSON.parse((await body(req)).toString());
      if (b.version !== pg.version) return err(res, 409, 'La página cambió desde que la abrió. Recargue para ver la versión nueva.');
      pg.revs.unshift({ id: pg.revs.length + 1, created_at: now(), user_name: me.display_name, version: pg.version, snap: { title: pg.title, body: pg.body } });
      for (const k of ['title', 'description', 'grupo', 'orden', 'frontmatter', 'body', 'status']) if (b[k] !== undefined) pg[k] = b[k];
      pg.version++; pg.updated_at = now(); pg.updated_by_name = me.display_name; log(me, 'page.update', pg.route, { version: pg.version });
      return J(res, 200, full(pg));
    }
    if (!sub && m === 'DELETE') { if (!need('editor')) return; pg.deleted = true; log(me, 'page.delete', pg.route); return J(res, 200, { ok: true }); }
    if (sub === 'restore') { pg.deleted = false; return J(res, 200, { ok: true }); }
    if (sub === 'move') { if (!need('editor')) return; const b = JSON.parse((await body(req)).toString()); if (b.seccion) pg.seccion = b.seccion; if (b.grupo !== undefined) pg.grupo = b.grupo; pg.route = `/${pg.seccion}/${b.slug || pg.route.split('/').pop()}`; return J(res, 200, full(pg)); }
    if (sub === 'revisions') return J(res, 200, pg.revs.map(({ snap, ...r }) => r));
    if ((mm = /^revisions\/(\d+)\/restore$/.exec(sub || ''))) { const r = pg.revs.find((x) => x.id === Number(mm[1])); if (r) { pg.body = r.snap.body; pg.title = r.snap.title; pg.version++; } return J(res, 200, { ok: true }); }
  }
  if (p === '/api/structure' && m === 'GET') {
    return J(res, 200, { secciones: Object.entries(SEC).map(([key, label]) => {
      const names = [...new Set(pages.filter((x) => x.seccion === key && !x.deleted).sort((a, b) => a.orden - b.orden).map((x) => x.grupo || ''))];
      const node = (x) => ({ id: x.id, title: x.title, route: x.route, orden: x.orden, status: x.status, children: pages.filter((c) => c.parent_id === x.id && !c.deleted).sort((a, b) => a.orden - b.orden).map(node) });
      return { key, label, grupos: names.map((name) => ({ name, pages: pages.filter((x) => x.seccion === key && !x.deleted && !x.parent_id && (x.grupo || '') === name).sort((a, b) => a.orden - b.orden).map(node) })) };
    }) });
  }
  if (p === '/api/structure/order' && m === 'PUT') {
    if (!need('editor')) return;
    const b = JSON.parse((await body(req)).toString());
    const apply = (nodes, grupo, parent) => nodes.forEach((n, i) => { const pg = pages.find((x) => x.id === n.id); if (pg) { pg.grupo = grupo; pg.orden = i + 1; pg.parent_id = parent; pg.updated_at = now(); } apply(n.children || [], grupo, n.id); });
    for (const g of b.grupos) { if (g.nodes) apply(g.nodes, g.name || null, null); else g.pageIds.forEach((id, i) => { const pg = pages.find((x) => x.id === id); if (pg) { pg.grupo = g.name || null; pg.orden = i + 1; } }); }
    log(me, 'structure.order', b.seccion); return J(res, 200, { ok: true });
  }
  if (p === '/api/structure/guia-sidebar') { if (m === 'GET') return J(res, 200, sidebar); if (!need('editor')) return; sidebar = JSON.parse((await body(req)).toString()); return J(res, 200, { ok: true }); }
  if (p === '/api/assets' && m === 'GET') { const q = (url.searchParams.get('q') || '').toLowerCase(); const pr = url.searchParams.get('prefix') || ''; return J(res, 200, { items: assets.filter((a) => a.path.startsWith(pr) && a.path.toLowerCase().includes(q)) }); }
  if (p === '/api/assets/file') {
    const rel = (url.searchParams.get('path') || '').replace(/^\/?(assets\/)?/, '');
    const f = path.join(ASSETS_DIR, path.normalize(rel));
    if (f.startsWith(ASSETS_DIR) && /\.webp$/.test(f) && fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'max-age=600' }); return fs.createReadStream(f).pipe(res); }
    res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(PNG);
  }
  if (p === '/api/assets' && m === 'POST') {
    if (!need('editor')) return;
    const raw = (await body(req)).toString('latin1');
    const folder = /name="folder"\r\n\r\n([^\r]*)/.exec(raw)?.[1] || 'imgs/misc';
    const nn = String(assets.filter((a) => a.path.startsWith(folder)).length + 1).padStart(2, '0');
    const a = { path: `${folder}/${nn}-captura.webp`, size: 18000, width: 1024, height: 640, mime: 'image/webp' };
    assets.unshift(a); log(me, 'asset.upload', a.path);
    return J(res, 201, { path: a.path, width: a.width, height: a.height, url: `/api/assets/file?path=${a.path}`, snippet: `<Figure src="/assets/${a.path}" alt="" width={${a.width}} height={${a.height}} max="${a.width}px" />` });
  }
  if (p === '/api/assets' && m === 'DELETE') {
    if (!need('editor')) return;
    const pth = url.searchParams.get('path');
    if (/01-/.test(pth)) return J(res, 409, { error: 'La imagen está en uso por 2 páginas.', pages: ['/guia/acceso-tema-1', '/guia/acceso-tema-2'] });
    const i = assets.findIndex((a) => a.path === pth); if (i >= 0) assets.splice(i, 1); return J(res, 200, { ok: true });
  }
  if (p === '/api/settings') { if (!need('admin')) return; if (m === 'GET') return J(res, 200, { settings, definitions }); settings = { ...settings, ...JSON.parse((await body(req)).toString()) }; log(me, 'settings.update', 'ajustes'); return J(res, 200, { ok: true }); }
  if (p === '/api/users' && m === 'GET') { if (!need('admin')) return; return J(res, 200, users.map((u) => ({ ...pub(u), last_login: u.last_login }))); }
  if (p === '/api/users' && m === 'POST') {
    if (!need('admin')) return; const b = JSON.parse((await body(req)).toString());
    if (users.some((u) => u.username === b.username)) return err(res, 409, 'Ese usuario ya existe.');
    const u = { id: Math.max(...users.map((x) => x.id)) + 1, username: b.username, display_name: b.display_name || b.username, role: b.role, password: b.password, last_login: null }; users.push(u); return J(res, 201, pub(u));
  }
  if ((mm = /^\/api\/users\/(\d+)$/.exec(p))) {
    if (!need('admin')) return; const u = users.find((x) => x.id === Number(mm[1])); if (!u) return err(res, 404, 'Usuario no encontrado.');
    if (m === 'DELETE') { if (u.id === me.id) return err(res, 400, 'No puede eliminarse a sí mismo.'); users.splice(users.indexOf(u), 1); return J(res, 200, { ok: true }); }
    const b = JSON.parse((await body(req)).toString());
    if (b.role && b.role !== 'admin' && u.role === 'admin' && users.filter((x) => x.role === 'admin').length === 1) return err(res, 400, 'No puede dejar el sistema sin administradores.');
    Object.assign(u, { display_name: b.display_name ?? u.display_name, role: b.role ?? u.role }); if (b.password) u.password = b.password; return J(res, 200, pub(u));
  }
  if (p === '/api/audit') { if (!need('admin')) return; const a = url.searchParams.get('action') || ''; const lim = Number(url.searchParams.get('limit') || 50), off = Number(url.searchParams.get('offset') || 0); const l = audit.filter((x) => x.action.includes(a)); return J(res, 200, { total: l.length, items: l.slice(off, off + lim) }); }
  if (p === '/api/import' && m === 'POST') { if (!need('admin')) return; if (running()) return err(res, 409, 'Ya hay un trabajo en curso.'); return J(res, 200, { jobId: startJob('import', ['Leyendo docs/…', 'Importadas 285 páginas, 0 omitidas', 'Listo.']).id }); }
  if (p === '/api/jobs' && m === 'GET') { const k = url.searchParams.get('kind'); return J(res, 200, { items: jobs.filter((j) => !k || j.kind === k).slice(0, Number(url.searchParams.get('limit') || 10)) }); }
  if ((mm = /^\/api\/jobs\/(\d+)$/.exec(p))) { const j = jobs.find((x) => x.id === Number(mm[1])); return j ? J(res, 200, j) : err(res, 404, 'Trabajo no encontrado.'); }
  if (p === '/api/publish' && m === 'POST') { if (!need('admin')) return; if (running()) return err(res, 409, 'Ya hay un publicación en curso.'); return J(res, 200, { jobId: startJob('publish', ['Publicación (simulada)', '1/5 Preparando la carpeta de trabajo…', '2/5 Exportando páginas y archivos desde la base de datos…', 'Páginas exportadas: 285', '3/5 Construyendo el sitio (npm run build)…', '4/5 Comprobando el resultado…', 'HTML generados: 286 (285 de contenido + 404)', '5/5 Reemplazando el sitio publicado…', 'Publicado en /manual/ en 4 s.']).id }); }
  if (p === '/api/publish/status') return J(res, 200, { running: running() });
  if (p === '/api/git/status') { if (!need('admin')) return; return J(res, 200, String(settings.repo_path).includes('sin-repo') ? { initialized: false, repoPath: settings.repo_path, message: `No hay repositorio Git en repo_path (${settings.repo_path}). Cuando la carpeta sea un repositorio, aquí se verá su estado.` }
      : { initialized: true, repoPath: settings.repo_path, branch: 'main', expectedBranch: 'main', remote: { name: 'origin', url: 'git@example.invalid:equipo/manual.git', configured: true }, dirty: false, changedCount: 0, ahead: 0, behind: 2, fetched: true, fetchError: null, lastCommit: { hash: 'a1b2c3d4e5f6', short: 'a1b2c3d', subject: 'Actualiza la guía de acceso', author: 'Equipo', date: ago(2000) } }); }
  if (p === '/api/git/update' && m === 'POST') { if (!need('admin')) return; return J(res, 200, { jobId: startJob('git_update', ['git fetch origin', 'git merge --ff-only origin/main', 'Cambiaron 3 archivos de contenido', 'Listo.']).id }); }
  if (p === '/api/backups' && m === 'GET') { if (!need('admin')) return; return J(res, 200, { items: backups }); }
  if (p === '/api/backups' && m === 'POST') { if (!need('admin')) return; const b = { id: backups.length + 2, filename: `ispmax-manual-${Date.now()}.dump`, size: 4_300_000, created_at: now() }; backups.unshift(b); return J(res, 201, b); }
  if ((mm = /^\/api\/backups\/(\d+)(?:\/(download|restore))?$/.exec(p))) {
    if (!need('admin')) return;
    if (mm[2] === 'download') { res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="x.dump"' }); return res.end('PGDMP'); }
    if (mm[2] === 'restore') { const b = JSON.parse((await body(req)).toString()); if (b.confirm !== 'RESTAURAR') return err(res, 400, 'Falta la confirmación.'); return J(res, 200, { ok: true }); }
    if (m === 'DELETE') { backups = backups.filter((x) => x.id !== Number(mm[1])); return J(res, 200, { ok: true }); }
  }
  return err(res, 404, 'Ruta no encontrada.');
}

function serveStatic(p, res) {
  if (!fs.existsSync(DIST)) { res.writeHead(404); return res.end('Compile primero la interfaz (npm run build).'); }
  let f = path.join(DIST, path.normalize(p === '/' ? 'index.html' : p));
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}

http.createServer((req, res) => { handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) err(res, 500, 'Error interno del simulador.'); }); })
  .listen(PORT, '127.0.0.1', () => console.log(`Simulador del portal en http://127.0.0.1:${PORT}  (admin/demo1234, ana/demo1234, leo/demo1234)`));
