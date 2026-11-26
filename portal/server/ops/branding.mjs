// Marca del sitio (ajustes `site_title` y `contact_whatsapp`) aplicada sobre la configuración de Rspress del repo
// SIN editar rspress.config.ts: el envoltorio que genera el publicador importa este módulo (copiado a la carpeta de
// trabajo) y lo aplica a la configuración cargada. Vacío = esa parte de la configuración queda intacta.
export const BRAND_NAME = 'Manual ISPMAX';
export const WHATSAPP_URL = 'https://wa.me/593959967843';
/** Cadenas más largas que esto (descripciones, textos) no se tocan aunque contengan el nombre. */
const MAX_LEN = 120;
/** Claves de primer nivel que no se recorren (plugins, empaquetador, markdown…); de `builderConfig` solo se recorre `html`. */
const SKIP_TOP = new Set(['plugins', 'markdown', 'builderConfig', 'mdxRs', 'ssg', 'route']);

const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "+593 95 996 7843" → "593959967843"; devuelve null si no son 8 a 15 dígitos o hay otros caracteres. Vacío → ''. */
export function normalizeWhatsapp(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (!/^[\d\s+().-]+$/.test(s)) return null;
  const d = s.replace(/\D/g, '');
  return d.length >= 8 && d.length <= 15 ? d : null;
}

function mapString(s, { title, whatsapp }) {
  let out = s;
  if (whatsapp && out.includes(WHATSAPP_URL)) out = out.split(WHATSAPP_URL).join(`https://wa.me/${whatsapp}`);
  if (title && out.length <= MAX_LEN && out.includes(BRAND_NAME)) out = out.split(BRAND_NAME).join(out.includes('<') ? escHtml(title) : title);
  return out;
}

function walk(v, o, seen) {
  if (typeof v === 'string') return mapString(v, o);
  if (Array.isArray(v)) return v.map(x => walk(x, o, seen));
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    if (seen.has(v)) return v;
    seen.add(v);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, o, seen)]));
  }
  return v;
}

/** Devuelve la configuración con el título y el enlace de WhatsApp sustituidos (copia; no modifica la original). */
export function applyBranding(config, { title = '', whatsapp = '' } = {}) {
  const o = { title: String(title || '').trim(), whatsapp: String(whatsapp || '').trim() };
  if (!o.title && !o.whatsapp) return config;
  const seen = new WeakSet();
  const out = {};
  for (const [k, v] of Object.entries(config)) {
    if (k === 'builderConfig') out[k] = v && typeof v === 'object' && v.html ? { ...v, html: walk(v.html, o, seen) } : v;
    else if (SKIP_TOP.has(k)) out[k] = v;
    else out[k] = walk(v, o, seen);
  }
  return out;
}
