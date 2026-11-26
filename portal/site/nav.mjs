// Menús laterales y portadas de sección DESDE LA BD. La lógica es la de scripts/lib/nav-core.mjs (la misma que usa
// scripts/build-nav.mjs en el build estático): aquí solo se adapta la entrada (docs/sidebar.json llega como texto de
// la tabla site_files) y los ciclos/profundidad no abortan (la página queda donde la dejen las demás reglas).
import { buildNav as buildNavCore, navToSidebar, HUBS, hubSource } from '../../scripts/lib/nav-core.mjs';

export { navToSidebar, HUBS, hubSource };

/** pages: [{ route, file, fm, title }] (fm = frontmatter efectivo). sidebarJson: contenido de docs/sidebar.json. */
export function buildNav(pages, sidebarJson, warn = () => {}) {
  let sidebar = [];
  try {
    sidebar = sidebarJson ? JSON.parse(sidebarJson) : [];
  } catch {
    sidebar = [];
  }
  return buildNavCore(pages, Array.isArray(sidebar) ? sidebar : [], { warn, fail: warn });
}
