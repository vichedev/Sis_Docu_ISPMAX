// Seguridad del contenido MDX que escriben los editores. El manual se sirve en el MISMO origen que el panel y la API:
// código ejecutable en una página (import/export, expresiones {…}, on*=, javascript:, <script>, head con <script>…)
// correría en el navegador de un admin que visite el manual y podría usar su sesión (escalada editor → admin).
// Se permite solo lo que usa el manual: componentes con atributos de texto o números (`width={1100}`), comentarios
// JSX `{/* … */}` y Markdown. Se aplica al guardar, restaurar revisiones y publicar (no se puede forzar).

function blank(text, re) {
  return text.replace(re, (m) => m.replace(/[^\n]/g, ' '));
}
function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}
const decodeEntities = (s) =>
  String(s)
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d) || 32))
    .replace(/&colon;/gi, ':')
    .replace(/&tab;|&newline;/gi, '');

/** ¿URL con esquema peligroso? (javascript:, vbscript:, data: salvo imágenes), tolerando entidades y espacios. */
export function dangerousUrl(v) {
  const s = decodeEntities(v).replace(/[\u0000- \u007f-\u009f]/g, '').toLowerCase();
  if (/^(javascript|vbscript|livescript|mocha):/.test(s)) return true;
  if (s.startsWith('data:') && !/^data:image\/(png|jpe?g|gif|webp|avif);/.test(s)) return true;
  return false;
}

const FORBIDDEN_TAGS = new Set(['script', 'style', 'object', 'embed', 'applet', 'base', 'meta', 'link', 'form', 'frame', 'frameset', 'template', 'portal', 'svg', 'math', 'noscript']);
const URL_ATTRS = /\b(href|src|action|formaction|poster|data|xlink:href|background|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)')\s*\})/gi;
// Atributos {…} permitidos: número, booleano o una cadena literal.
const ALLOWED_ATTR_EXPR = /=\s*\{\s*(?:-?\d+(?:\.\d+)?|true|false|"[^"{}]*"|'[^'{}]*')\s*\}/g;

/**
 * Problemas de seguridad del cuerpo y del frontmatter: [{ message, line? }]. Vacío = seguro.
 */
export function mdxSecurityProblems({ body, frontmatter } = {}) {
  const out = [];
  const add = (message, line) => out.push(line ? { message, line } : { message });
  const text = typeof body === 'string' ? body : '';
  // Fuera de bloques de código y código en línea (ahí todo es texto).
  let clean = blank(text, /^(```|~~~)[^\n]*\n[\s\S]*?\n\1[^\n]*$/gm);
  clean = blank(clean, /`[^`\n]*`/g);
  clean = blank(clean, /<!--[\s\S]*?-->/g);
  clean = blank(clean, /\{\/\*[\s\S]*?\*\/\}/g);
  clean = blank(clean, /\\[{}<>]/g);

  let m;
  const esm = /^[ \t]*(import|export)\b/gm;
  while ((m = esm.exec(clean))) add(`No se permite «${m[1]}» en una página: el contenido no puede llevar código.`, lineOf(clean, m.index));

  const tagRe = /<\/?([A-Za-z][\w.:-]*)((?:"[^"]*"|'[^']*'|\{[^}]*\}|[^>"'{])*)>/g;
  while ((m = tagRe.exec(clean))) {
    const [full, name, rest] = m;
    const line = lineOf(clean, m.index);
    if (FORBIDDEN_TAGS.has(name.toLowerCase())) add(`La etiqueta <${name}> no está permitida en el contenido.`, line);
    if (/(^|[\s"'}])on[a-z]+\s*=/i.test(rest)) add('Los atributos de evento (onclick, onerror…) no están permitidos.', line);
    if (/\b(dangerouslySetInnerHTML|srcdoc|formaction)\b/i.test(rest)) add('Ese atributo no está permitido en el contenido.', line);
    if (/\bstyle\s*=\s*\{/.test(rest)) add('Los estilos con expresiones (style={…}) no están permitidos.', line);
    const exprLeft = rest.replace(ALLOWED_ATTR_EXPR, '=""');
    if (/[{}]/.test(exprLeft)) add('Solo se admiten atributos de texto o números (por ejemplo width={1100}); no expresiones de código.', line);
    let u;
    URL_ATTRS.lastIndex = 0;
    while ((u = URL_ATTRS.exec(rest))) {
      const v = u[2] ?? u[3] ?? u[4] ?? u[5] ?? '';
      if (dangerousUrl(v)) add(`Enlace o recurso con un esquema no permitido en <${name}>.`, line);
    }
    void full;
    clean = clean.slice(0, m.index) + full.replace(/[^\n]/g, ' ') + clean.slice(m.index + full.length);
    tagRe.lastIndex = m.index + full.length;
  }
  // Expresiones sueltas fuera de etiquetas ({fetch(…)}): MDX las ejecuta.
  const brace = /\{/g;
  while ((m = brace.exec(clean))) {
    add('Las expresiones entre llaves { } no están permitidas: si es texto, escríbelo entre comillas invertidas.', lineOf(clean, m.index));
    if (out.length > 50) break;
  }
  // Enlaces Markdown y autoenlaces con esquema peligroso.
  const mdLink = /\]\(\s*<?([^)\s>]+)/g;
  while ((m = mdLink.exec(clean))) if (dangerousUrl(m[1])) add('Enlace con un esquema no permitido (javascript:, data:…).', lineOf(clean, m.index));
  const refDef = /^\s*\[[^\]]+\]:\s*<?(\S+?)>?(\s|$)/gm;
  while ((m = refDef.exec(clean))) if (dangerousUrl(m[1])) add('Enlace con un esquema no permitido (javascript:, data:…).', lineOf(clean, m.index));

  // Frontmatter: `head` solo con etiquetas <meta> sin http-equiv; ningún valor de texto con HTML activo.
  if (frontmatter && typeof frontmatter === 'object' && !Array.isArray(frontmatter)) {
    const head = frontmatter.head;
    if (head !== undefined) {
      const ok =
        Array.isArray(head) &&
        head.every(
          (h) =>
            Array.isArray(h) &&
            h[0] === 'meta' &&
            h[1] && typeof h[1] === 'object' && !Array.isArray(h[1]) &&
            !Object.keys(h[1]).some((k) => /^(http-equiv|charset)$/i.test(k) || /^on/i.test(k)) &&
            Object.values(h[1]).every((v) => typeof v === 'string' || typeof v === 'number') &&
            h.length <= 2
        );
      if (!ok) add('En el frontmatter, `head` solo admite etiquetas meta (name/property y content).');
    }
    const walk = (v, depth = 0) => {
      if (depth > 8) return;
      if (typeof v === 'string') {
        if (/<\s*(script|iframe|object|embed|svg|style|base|meta|link)\b/i.test(v) || /\bon[a-z]+\s*=/i.test(v) || dangerousUrl(v.trim())) {
          add('El frontmatter contiene HTML o enlaces no permitidos.');
        }
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
      else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, depth + 1));
    };
    for (const [k, v] of Object.entries(frontmatter)) if (k !== 'head') walk(v);
  }
  // Sin duplicados exactos.
  const seen = new Set();
  return out.filter((p) => {
    const k = p.message + '|' + (p.line ?? '');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
