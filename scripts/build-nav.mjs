#!/usr/bin/env node
/**
 * build-nav — genera docs/_nav.json (barras laterales de cada sección) desde el frontmatter.
 *
 * Secciones: /tareas, /problemas, /preguntas, /referencia, /conceptos (por carpeta) y /guia.
 * Cada página aporta:
 *   grupo:  encabezado del menú (def.: nombre de la subcarpeta o "General")
 *   orden:  número para ordenar dentro del grupo (def.: orden alfabético por título)
 * /guia conserva el orden de docs/sidebar.json y añade al final las páginas que no estén en él.
 *   padre:  (opcional) ruta de la página principal; la página se anida bajo ella (`items`, plegable), máx. 3 niveles.
 *           Padre inexistente o de otra sección → aviso y la página queda en su nivel normal. Ciclo → error.
 *           Una página hija toma el grupo de su padre (su propio `grupo` se ignora).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DOCS, loadPages } from './lib/manual.mjs';

const SECCIONES = ['tareas', 'problemas', 'preguntas', 'referencia', 'conceptos'];
const pages = loadPages();
const nav = {};

const MAX_DEPTH = 3;
const warn = m => console.warn(`AVISO build-nav: ${m}`);
const fail = m => { console.error(`ERROR build-nav: ${m}`); process.exit(1); };

// Resuelve `padre` → Map(ruta hija → ruta padre) con las reglas de arriba. Ciclos y profundidad > 3 abortan.
function resolvePadres(list, sameScope) {
  const byRoute = new Map(list.map(p => [p.route, p]));
  const parent = new Map();
  for (const p of list) {
    const raw = p.fm.padre;
    if (raw == null || raw === '') continue;
    const padre = String(raw).replace(/[/]+$/, '') || '/';
    if (padre === p.route) fail(`ciclo: ${p.route} es su propio padre`);
    if (!byRoute.has(padre) || !sameScope(padre)) {
      warn(`${p.file}: padre "${raw}" no existe en la misma sección; se muestra en el nivel normal.`);
      continue;
    }
    parent.set(p.route, padre);
  }
  const depth = r => {
    const seen = [r];
    let d = 1;
    for (let c = parent.get(r); c; c = parent.get(c), d++) {
      if (seen.includes(c)) fail(`ciclo en "padre": ${[...seen, c].join(' → ')}`);
      seen.push(c);
    }
    return d;
  };
  for (const r of parent.keys()) if (depth(r) > MAX_DEPTH) fail(`${r} supera la profundidad máxima de ${MAX_DEPTH} niveles`);
  return parent;
}

const countItems = items => items.reduce((n, i) => n + 1 + countItems(i.items ?? []), 0);
const cap = s => s.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

for (const sec of SECCIONES) {
  const prefix = `/${sec}/`;
  const list = pages.filter(p => p.route.startsWith(prefix) && p.fm.title);
  const groups = new Map();
  const parentOf = resolvePadres(list, r => r.startsWith(prefix));
  const kids = new Map();
  for (const p of list) {
    if (parentOf.has(p.route)) {
      const k = parentOf.get(p.route);
      if (!kids.has(k)) kids.set(k, []);
      kids.get(k).push(p);
      continue;
    }
    const sub = p.route.slice(prefix.length).split('/');
    const g = p.fm.grupo || (sub.length > 1 ? cap(sub[0]) : 'General');
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(p);
  }
  const byOrden = (a, b) => Number(a.fm.orden ?? 999) - Number(b.fm.orden ?? 999) || String(a.title).localeCompare(String(b.title), 'es');
  const toItem = p => {
    const item = { text: p.fm.menu || p.title, link: p.route };
    const ch = kids.get(p.route);
    if (ch) {
      item.items = ch.sort(byOrden).map(toItem);
      item.collapsed = true;
    }
    return item;
  };
  nav[prefix] = [...groups.entries()]
    .sort(([a], [b]) => (a === 'General' ? -1 : b === 'General' ? 1 : a.localeCompare(b, 'es')))
    .map(([g, ps]) => ({ sectionHeader: g, items: ps.sort(byOrden).map(toItem) }));
}

// /guia: sidebar.json + páginas nuevas
const base = existsSync(path.join(DOCS, 'sidebar.json')) ? JSON.parse(readFileSync(path.join(DOCS, 'sidebar.json'), 'utf8')) : [];
const exists = new Set(pages.map(p => p.route));
const itemRoutes = items => items.flatMap(i => [i.link, ...itemRoutes(i.items ?? [])]);
const known = new Set(base.flatMap(g => itemRoutes(g.items)));
const prune = items =>
  items
    .filter(i => exists.has(i.link))
    .map(i => (i.items ? { ...i, items: prune(i.items) } : i));
const guia = base.map(g => ({ ...g, items: prune(g.items) }));
const extra = pages.filter(p => p.route.startsWith('/guia/') && p.fm.title && !known.has(p.route));
const guiaPadre = resolvePadres(
  pages.filter(p => p.route.startsWith('/guia/') && p.fm.title),
  r => r.startsWith('/guia/'),
);
const findItem = (items, link) => {
  for (const i of items) {
    if (i.link === link) return i;
    const f = i.items && findItem(i.items, link);
    if (f) return f;
  }
  return null;
};
// Primero las páginas nuevas sin padre (como siempre); luego las que traen `padre`, en el orden de `orden`.
for (const p of extra.filter(p => !guiaPadre.has(p.route))) {
  const g = p.fm.grupo || 'Otras pantallas';
  let grp = guia.find(x => x.sectionHeader === g);
  if (!grp) guia.push((grp = { sectionHeader: g, items: [] }));
  grp.items.push({ text: p.fm.menu || p.title, link: p.route });
}
let pendientes = extra
  .filter(p => guiaPadre.has(p.route))
  .sort((a, b) => Number(a.fm.orden ?? 999) - Number(b.fm.orden ?? 999) || String(a.title).localeCompare(String(b.title), 'es'));
while (pendientes.length) {
  const resto = [];
  for (const p of pendientes) {
    const padre = findItem(guia.flatMap(g => g.items), guiaPadre.get(p.route));
    if (!padre) { resto.push(p); continue; }
    (padre.items ??= []).push({ text: p.fm.menu || p.title, link: p.route });
    padre.collapsed = true;
  }
  if (resto.length === pendientes.length) {
    for (const p of resto) warn(`${p.file}: su padre no está en el menú de /guia; se muestra en el nivel normal.`);
    for (const p of resto) {
      const g = p.fm.grupo || 'Otras pantallas';
      let grp = guia.find(x => x.sectionHeader === g);
      if (!grp) guia.push((grp = { sectionHeader: g, items: [] }));
      grp.items.push({ text: p.fm.menu || p.title, link: p.route });
    }
    break;
  }
  pendientes = resto;
}
const guiaDepth = (items, d = 1) => items.forEach(i => { if (d > MAX_DEPTH) fail(`/guia: ${i.link} supera ${MAX_DEPTH} niveles`); guiaDepth(i.items ?? [], d + 1); });
guia.forEach(g => guiaDepth(g.items));
nav['/guia/'] = guia.filter(g => g.items.length);

writeFileSync(path.join(DOCS, '_nav.json'), JSON.stringify(nav, null, 2));

// Páginas índice de cada sección (generadas; se regeneran en cada build).
const HUBS = {
  tareas: ['Quiero hacer…', 'Procedimientos cortos, paso a paso, para las tareas de todos los días. Elija lo que necesita hacer.'],
  problemas: ['Tengo un problema', 'Qué revisar y cómo resolver los problemas más frecuentes: síntoma, causas, verificación y solución.'],
  preguntas: ['Preguntas frecuentes', 'Respuestas breves a preguntas reales de operadores, soporte, cobranzas y técnicos, con enlace al procedimiento.'],
  referencia: ['Referencia', 'Datos exactos para consultar: permisos, estados, valores de ajustes, automatizaciones y mensajes.'],
  conceptos: ['Conceptos', 'Qué significa cada término de ISPMAX y cómo se relacionan entre sí.'],
};
const byRoute = new Map(pages.map(p => [p.route, p]));
for (const [sec, [title, lead]] of Object.entries(HUBS)) {
  const groups = nav[`/${sec}/`] ?? [];
  const item = (i, ind = '') => {
    const d = byRoute.get(i.link)?.fm.description;
    return [`${ind}- [${i.text}](${i.link})${d ? ' — ' + d : ''}`, ...(i.items ?? []).map(c => item(c, ind + '  '))].join('\n');
  };
  const body = groups.map(g => `## ${g.sectionHeader}\n\n${g.items.map(i => item(i)).join('\n')}\n`).join('\n');
  const md = [
    '---',
    `title: "${title}"`,
    `description: "${lead}"`,
    'modulo: general',
    'tipo: indice',
    'generado: true',
    '---',
    '',
    `<Kicker>${title}</Kicker>`,
    '',
    `# ${title}`,
    '',
    `<Lead>${lead}</Lead>`,
    '',
    body || 'Aún no hay páginas en esta sección.',
    '',
  ].join('\n');
  writeFileSync(path.join(DOCS, sec, 'index.mdx'), md);
}
console.log(
  Object.entries(nav)
    .map(([k, v]) => `${k} ${v.reduce((n, g) => n + countItems(g.items), 0)}`)
    .join(' · '),
);
