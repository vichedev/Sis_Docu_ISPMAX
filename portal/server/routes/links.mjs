// Enlaces internos rotos (aviso al guardar, no bloqueo). El build de Rspress fallaba con un enlace interno muerto;
// el manual dinámico ya no construye, así que lo comprueba el portal al validar y al guardar una página.
// Un enlace interno es `/ruta` (Markdown `[x](/ruta)` o `href="/ruta"` / `link="/ruta"` en un componente), salvo
// /assets/ (imágenes: las comprueba validate.mjs) y /_site/. Existe si es una página publicada, una portada de sección,
// la portada `/` o el origen de una redirección (página movida).

function blank(text, re) {
  return text.replace(re, (m) => m.replace(/[^\n]/g, ' '));
}
function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** Normaliza una ruta interna: sin #ancla ni ?consulta, sin .html ni /index ni barra final. null si no es interna. */
export function normalizeInternal(href) {
  const raw = String(href || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  let p = raw.split('#')[0].split('?')[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    return p;
  }
  if (/^\/(assets|_site)\//.test(p)) return null;
  p = p.replace(/\.html$/i, '').replace(/\/index$/i, '/').replace(/\/+$/, '');
  return p || '/';
}

/** Enlaces internos del cuerpo: [{ href, route, line }] (fuera de bloques de código y comentarios). */
export function internalLinks(body) {
  let clean = blank(String(body || ''), /^(```|~~~)[^\n]*\n[\s\S]*?\n\1[^\n]*$/gm);
  clean = blank(clean, /`[^`\n]*`/g);
  clean = blank(clean, /\{\/\*[\s\S]*?\*\/\}/g);
  const out = [];
  const add = (href, index) => {
    const route = normalizeInternal(href);
    if (route) out.push({ href, route, line: lineOf(clean, index) });
  };
  let m;
  const md = /\]\(\s*<?(\/[^)\s>]*)/g;
  while ((m = md.exec(clean))) add(m[1], m.index);
  const attr = /\b(?:href|link|to)\s*=\s*(?:"(\/[^"]*)"|'(\/[^']*)'|\{\s*["'](\/[^"']*)["']\s*\})/g;
  while ((m = attr.exec(clean))) add(m[1] ?? m[2] ?? m[3], m.index);
  const def = /^\s*\[[^\]]+\]:\s*<?(\/\S+?)>?(\s|$)/gm;
  while ((m = def.exec(clean))) add(m[1], m.index);
  return out;
}

/** Conjunto de rutas válidas (publicadas + portada + redirecciones) desde la BD. */
export async function knownRoutes(db) {
  const [pages, redirects] = await Promise.all([
    db.query("SELECT route FROM pages WHERE status = 'published' AND deleted_at IS NULL"),
    db.query('SELECT from_route FROM redirects'),
  ]);
  const set = new Set(['/']);
  for (const r of pages.rows) set.add(normalizeInternal(r.route) ?? r.route);
  for (const r of redirects.rows) set.add(normalizeInternal(r.from_route) ?? r.from_route);
  return set;
}

/** Avisos de enlaces internos rotos: [{ level:'warning', message, line }]. `extra`: rutas que también cuentan (la propia página). */
export async function brokenLinkWarnings(db, body, { extra = [] } = {}) {
  const links = internalLinks(body);
  if (!links.length) return [];
  const known = await knownRoutes(db);
  for (const e of extra) if (e) known.add(normalizeInternal(e) ?? e);
  const seen = new Set();
  const out = [];
  for (const l of links) {
    if (known.has(l.route) || seen.has(l.route)) continue;
    seen.add(l.route);
    out.push({ level: 'warning', message: `Enlace interno roto: ${l.href} no es una página publicada del manual.`, line: l.line });
    if (out.length >= 50) break;
  }
  return out;
}
