// Validación de MDX + frontmatter (sin compilar): detecta lo que rompe el build de Rspress.
import { isPlainObject } from './util.mjs';
import { mdxSecurityProblems } from './mdxSafety.mjs';

export const KNOWN_COMPONENTS = new Set([
  'Kicker', 'Lead', 'Steps', 'Step', 'Figure', 'FigGrid', 'FigRow', 'Callout', 'Card', 'Cards', 'Badge', 'SearchTerms', 'Tour',
]);
const HTML_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'details', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
  'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'th',
  'thead', 'tr', 'u', 'ul', 'video', 'source', 'iframe',
]);

// Sustituye por espacios (conservando saltos de línea) los fragmentos que no deben analizarse.
function blank(text, re) {
  return text.replace(re, (m) => m.replace(/[^\n]/g, ' '));
}
function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

export async function validatePage({ body, frontmatter }, { assetExists, tourStatus = null }) {
  const problems = [];
  const add = (level, message, line) => problems.push(line ? { level, message, line } : { level, message });

  // Frontmatter
  if (frontmatter !== undefined && frontmatter !== null) {
    if (!isPlainObject(frontmatter)) add('error', 'El frontmatter debe ser un objeto (clave: valor).');
    else {
      if (typeof frontmatter.title !== 'string' || !frontmatter.title.trim()) add('error', 'El frontmatter necesita un `title` con texto.');
      if (frontmatter.description !== undefined && typeof frontmatter.description !== 'string') add('error', '`description` debe ser texto.');
      if (frontmatter.sinonimos !== undefined && !Array.isArray(frontmatter.sinonimos)) add('error', '`sinonimos` debe ser una lista.');
      if (frontmatter.orden !== undefined && !Number.isFinite(Number(frontmatter.orden))) add('error', '`orden` debe ser un número.');
      for (const k of Object.keys(frontmatter)) if (!/^[A-Za-z_][\w-]*$/.test(k)) add('error', `Clave de frontmatter no válida: ${k}`);
    }
  }

  const text = typeof body === 'string' ? body : '';
  if (typeof body !== 'string') add('error', 'El cuerpo debe ser texto.');

  // Quitar bloques de código y código en línea (ahí `<` y `{` son inofensivos).
  let clean = blank(text, /^(```|~~~)[^\n]*\n[\s\S]*?\n\1[^\n]*$/gm);
  clean = blank(clean, /`[^`\n]*`/g);
  clean = blank(clean, /<!--[\s\S]*?-->/g);
  clean = blank(clean, /\{\/\*[\s\S]*?\*\/\}/g); // comentarios JSX {/* … */}
  clean = blank(clean, /\\[{}<>]/g); // caracteres escapados con barra

  // Etiquetas JSX/HTML: comprobar nombre; luego quitarlas (sus atributos pueden llevar `{}` legítimos).
  const tagRe = /<(\/?)([A-Za-z][\w.-]*)((?:"[^"]*"|'[^']*'|\{[^}]*\}|[^>"'{])*)>/g;
  let m;
  const stripped = [];
  const tours = []; // { id, line } de cada <Tour id="…" />
  while ((m = tagRe.exec(clean))) {
    const [full, , name, rest] = m;
    const line = lineOf(clean, m.index);
    if (/^[A-Z]/.test(name)) {
      if (!KNOWN_COMPONENTS.has(name)) add('error', `Componente desconocido: <${name}>. Si es texto, ponlo entre comillas invertidas.`, line);
      else if (name === 'Tour' && !full.startsWith('</')) {
        const idm = /(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)')\s*\})/.exec(rest);
        const tid = idm ? (idm[1] ?? idm[2] ?? idm[3] ?? idm[4] ?? '').trim() : '';
        if (!tid) add('error', '<Tour> necesita el atributo id con el slug del tour: <Tour id="mi-tour" />.', line);
        else tours.push({ id: tid, line });
      }
    } else if (!HTML_TAGS.has(name.toLowerCase())) {
      const isAuto = /^[a-z]+:/.test(name + rest) || name.includes('@');
      if (!isAuto) add('error', `Texto suelto <${name}>: MDX lo toma por una etiqueta. Ponlo entre comillas invertidas: \`<${name}>\`.`, line);
    }
    stripped.push([m.index, full.length]);
  }
  // Autoenlaces <https://…> y <correo@x>
  clean = clean.replace(/<(https?:\/\/[^>\s]+|[^>\s@]+@[^>\s]+)>/g, (s) => s.replace(/[^\n]/g, ' '));
  for (const [i, len] of stripped) {
    clean = clean.slice(0, i) + clean.slice(i, i + len).replace(/[^\n]/g, ' ') + clean.slice(i + len);
  }
  // `<` sobrante (p. ej. "a < b" no es problema; "<" seguido de letra ya se trató).
  const looseLt = /<(?=[A-Za-z/!?])/g;
  while ((m = looseLt.exec(clean))) add('error', 'Hay un `<` sin cerrar con `>`; escríbelo entre comillas invertidas.', lineOf(clean, m.index));

  // Llaves sueltas
  const braceRe = /[{}]/g;
  while ((m = braceRe.exec(clean))) {
    add('error', `Llave suelta \`${m[0]}\`: MDX la toma por una expresión. Ponla entre comillas invertidas.`, lineOf(clean, m.index));
    if (problems.length > 200) break;
  }

  // Imágenes
  const refs = new Map();
  const imgRe = /(?:src=["']|\]\()\/assets\/([^"')\s]+)/g;
  while ((m = imgRe.exec(blank(text, /<!--[\s\S]*?-->/g)))) refs.set(m[1], lineOf(text, m.index));
  for (const [p, line] of refs) {
    if (p.split('/').includes('..')) add('error', `Ruta de imagen no válida: ${p}`, line);
    else if (!(await assetExists(p))) add('error', `La imagen /assets/${p} no existe en el portal.`, line);
  }

  if (tourStatus) {
    for (const t of tours) {
      const st = await tourStatus(t.id);
      if (!st) add('warning', `El tour "${t.id}" no existe en el portal.`, t.line);
      else if (st !== 'published') add('warning', `El tour "${t.id}" está en borrador: no se publicará hasta que lo publiques.`, t.line);
    }
  }

  // Seguridad: nada ejecutable en el contenido (el manual comparte origen con el panel).
  for (const s of mdxSecurityProblems({ body: text, frontmatter })) add('error', s.message, s.line);

  return { ok: !problems.some((p) => p.level === 'error'), problems };
}
