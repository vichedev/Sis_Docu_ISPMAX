/**
 * Menús laterales y portadas de sección: lógica ÚNICA que comparten
 *   · scripts/build-nav.mjs (build estático: escribe docs/_nav.json y docs/<sección>/index.mdx),
 *   · portal/site/nav.mjs (manual dinámico: los calcula desde la BD en cada cambio),
 *   · portal/server/routes/structure.mjs (árbol de la pantalla Estructura: mismo grupo efectivo y orden).
 * Funciones puras (sin E/S). `pages`: [{ route, file, fm, title }] con fm = frontmatter efectivo.
 *
 * Reglas (ver build-nav.mjs): secciones por carpeta (/tareas, /problemas, /preguntas, /referencia, /conceptos);
 * `grupo` (def.: subcarpeta capitalizada o «General»), `orden` (def. 999 y luego título), `menu` (texto del menú),
 * `padre` (anidación, máx. 3 niveles; padre inexistente → aviso y nivel normal). /guia conserva el orden de
 * docs/sidebar.json y añade al final las páginas que no estén en él (grupo «Otras pantallas» por defecto).
 */

export const SECCIONES = ['tareas', 'problemas', 'preguntas', 'referencia', 'conceptos'];
export const MAX_DEPTH = 3;
export const OTRAS = 'Otras pantallas';

export const cap = s => s.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
/** Grupo del menú de una página de `/${seccion}/`: su `grupo` o la subcarpeta capitalizada o «General». */
export function effectiveGroup({ route, grupo }, seccion) {
  if (grupo) return grupo;
  const sub = route.slice(`/${seccion}/`.length).split('/');
  return sub.length > 1 ? cap(sub[0]) : 'General';
}
/** Orden de los grupos: «General» primero, el resto alfabético (es). */
export const cmpGroups = (a, b) => (a === 'General' ? -1 : b === 'General' ? 1 : a.localeCompare(b, 'es'));
const byOrden = (a, b) => Number(a.fm.orden ?? 999) - Number(b.fm.orden ?? 999) || String(a.title).localeCompare(String(b.title), 'es');

/**
 * `padre` → Map(ruta hija → ruta padre). `fail` se llama ante un ciclo o una profundidad > 3 (build-nav aborta;
 * el portal lo ignora y la página queda donde la deje el resto de reglas).
 */
export function resolvePadres(list, sameScope, { warn = () => {}, fail = () => {} } = {}) {
  const byRoute = new Map(list.map(p => [p.route, p]));
  const parent = new Map();
  for (const p of list) {
    const raw = p.fm.padre;
    if (raw == null || raw === '') continue;
    const padre = String(raw).replace(/[/]+$/, '') || '/';
    if (padre === p.route) {
      fail(`ciclo: ${p.route} es su propio padre`);
      continue;
    }
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
      if (seen.includes(c)) {
        fail(`ciclo en "padre": ${[...seen, c].join(' → ')}`);
        return d;
      }
      seen.push(c);
    }
    return d;
  };
  for (const r of parent.keys()) if (depth(r) > MAX_DEPTH) fail(`${r} supera la profundidad máxima de ${MAX_DEPTH} niveles`);
  return parent;
}

/**
 * Menús laterales → `{ '/tareas/': [{ sectionHeader, items: [{ text, link, items?, collapsed? }] }], …, '/guia/': … }`
 * (el contenido de docs/_nav.json). `sidebar`: docs/sidebar.json ya parseado (lista de grupos) o null.
 */
export function buildNav(pages, sidebar, { warn = () => {}, fail = () => {} } = {}) {
  const nav = {};
  for (const sec of SECCIONES) {
    const prefix = `/${sec}/`;
    const list = pages.filter(p => p.route.startsWith(prefix) && p.fm.title);
    const groups = new Map();
    const parentOf = resolvePadres(list, r => r.startsWith(prefix), { warn, fail });
    const kids = new Map();
    for (const p of list) {
      if (parentOf.has(p.route)) {
        const k = parentOf.get(p.route);
        if (!kids.has(k)) kids.set(k, []);
        kids.get(k).push(p);
        continue;
      }
      const g = effectiveGroup({ route: p.route, grupo: p.fm.grupo }, sec);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    }
    const toItem = p => {
      const item = { text: p.fm.menu || p.title, link: p.route };
      const ch = kids.get(p.route);
      if (ch) {
        item.items = ch.sort(byOrden).map(toItem);
        item.collapsed = true;
      }
      return item;
    };
    nav[prefix] = [...groups.entries()].sort(([a], [b]) => cmpGroups(a, b)).map(([g, ps]) => ({ sectionHeader: g, items: ps.sort(byOrden).map(toItem) }));
  }

  // /guia: sidebar.json + páginas nuevas
  const base = Array.isArray(sidebar) ? sidebar : [];
  const exists = new Set(pages.map(p => p.route));
  const itemRoutes = items => items.flatMap(i => [i.link, ...itemRoutes(i.items ?? [])]);
  const known = new Set(base.flatMap(g => itemRoutes(g.items)));
  const prune = items => items.filter(i => exists.has(i.link)).map(i => (i.items ? { ...i, items: prune(i.items) } : i));
  const guia = base.map(g => ({ ...g, items: prune(g.items) }));
  const extra = pages.filter(p => p.route.startsWith('/guia/') && p.fm.title && !known.has(p.route));
  const guiaPadre = resolvePadres(
    pages.filter(p => p.route.startsWith('/guia/') && p.fm.title),
    r => r.startsWith('/guia/'),
    { warn, fail },
  );
  const findItem = (items, link) => {
    for (const i of items) {
      if (i.link === link) return i;
      const f = i.items && findItem(i.items, link);
      if (f) return f;
    }
    return null;
  };
  const addTo = p => {
    const g = p.fm.grupo || OTRAS;
    let grp = guia.find(x => x.sectionHeader === g);
    if (!grp) guia.push((grp = { sectionHeader: g, items: [] }));
    grp.items.push({ text: p.fm.menu || p.title, link: p.route });
  };
  // Primero las páginas nuevas sin padre (en el orden recibido); luego las que traen `padre`, en el orden de `orden`.
  for (const p of extra.filter(p => !guiaPadre.has(p.route))) addTo(p);
  let pendientes = extra.filter(p => guiaPadre.has(p.route)).sort(byOrden);
  while (pendientes.length) {
    const resto = [];
    for (const p of pendientes) {
      const padre = findItem(guia.flatMap(g => g.items), guiaPadre.get(p.route));
      if (!padre) {
        resto.push(p);
        continue;
      }
      (padre.items ??= []).push({ text: p.fm.menu || p.title, link: p.route });
      padre.collapsed = true;
    }
    if (resto.length === pendientes.length) {
      for (const p of resto) warn(`${p.file}: su padre no está en el menú de /guia; se muestra en el nivel normal.`);
      for (const p of resto) addTo(p);
      break;
    }
    pendientes = resto;
  }
  const guiaDepth = (items, d = 1) =>
    items.forEach(i => {
      if (d > MAX_DEPTH) fail(`/guia: ${i.link} supera ${MAX_DEPTH} niveles`);
      guiaDepth(i.items ?? [], d + 1);
    });
  guia.forEach(g => guiaDepth(g.items));
  nav['/guia/'] = guia.filter(g => g.items.length);
  return nav;
}

/** `_nav.json` → `themeConfig.sidebar` (lo que hace rspress.config.ts). */
export const navToSidebar = nav =>
  Object.fromEntries(Object.entries(nav).map(([prefix, groups]) => [prefix, groups.flatMap(g => [{ sectionHeaderText: g.sectionHeader }, ...g.items])]));

export const countItems = items => items.reduce((n, i) => n + 1 + countItems(i.items ?? []), 0);

/** Portadas de sección generadas (`generado: true`): título y entradilla. */
export const HUBS = {
  tareas: ['Quiero hacer…', 'Procedimientos cortos, paso a paso, para las tareas de todos los días. Elija lo que necesita hacer.'],
  problemas: ['Tengo un problema', 'Qué revisar y cómo resolver los problemas más frecuentes: síntoma, causas, verificación y solución.'],
  preguntas: ['Preguntas frecuentes', 'Respuestas breves a preguntas reales de operadores, soporte, cobranzas y técnicos, con enlace al procedimiento.'],
  referencia: ['Referencia', 'Datos exactos para consultar: permisos, estados, valores de ajustes, automatizaciones y mensajes.'],
  conceptos: ['Conceptos', 'Qué significa cada término de ISPMAX y cómo se relacionan entre sí.'],
};

/** Texto .mdx de la portada de una sección, calculado del menú. */
export function hubSource(sec, nav, pages) {
  const [title, lead] = HUBS[sec];
  const byRoute = new Map(pages.map(p => [p.route, p]));
  const groups = nav[`/${sec}/`] ?? [];
  const item = (i, ind = '') => {
    const d = byRoute.get(i.link)?.fm.description;
    return [`${ind}- [${i.text}](${i.link})${d ? ' — ' + d : ''}`, ...(i.items ?? []).map(c => item(c, ind + '  '))].join('\n');
  };
  const body = groups.map(g => `## ${g.sectionHeader}\n\n${g.items.map(i => item(i)).join('\n')}\n`).join('\n');
  return [
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
}
