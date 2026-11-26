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
 * La lógica vive en scripts/lib/nav-core.mjs (la misma que usa el manual dinámico del portal, desde la BD).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DOCS, loadPages } from './lib/manual.mjs';
import { buildNav, hubSource, HUBS, countItems } from './lib/nav-core.mjs';

const pages = loadPages();
const warn = m => console.warn(`AVISO build-nav: ${m}`);
const fail = m => {
  console.error(`ERROR build-nav: ${m}`);
  process.exit(1);
};

const sidebar = existsSync(path.join(DOCS, 'sidebar.json')) ? JSON.parse(readFileSync(path.join(DOCS, 'sidebar.json'), 'utf8')) : [];
const nav = buildNav(pages, sidebar, { warn, fail });
writeFileSync(path.join(DOCS, '_nav.json'), JSON.stringify(nav, null, 2));

// Páginas índice de cada sección (generadas; se regeneran en cada build).
for (const sec of Object.keys(HUBS)) writeFileSync(path.join(DOCS, sec, 'index.mdx'), hubSource(sec, nav, pages));
console.log(
  Object.entries(nav)
    .map(([k, v]) => `${k} ${v.reduce((n, g) => n + countItems(g.items), 0)}`)
    .join(' · '),
);
