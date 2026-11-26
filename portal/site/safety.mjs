// Seguridad del contenido ejecutable del manual dinámico (defensa en profundidad).
//
// El MDX de cada página se COMPILA a JavaScript y se EVALÚA para pintarlo en el servidor (SSR), en el mismo proceso
// que tiene las credenciales de la BD. Ninguna página puede llegar a ejecutar código. Capas (de fuera a dentro):
//
//   1. Al guardar (portal/server/routes/mdxSafety.mjs + validate.mjs): el portal rechaza lo ejecutable.
//   2. Al compilar, ANTES de cualquier plugin (remarkContentSafety, sobre el árbol mdast recién parseado): lista de
//      PERMITIDOS — tipos de nodo Markdown conocidos; JSX solo con los componentes del manual y etiquetas HTML
//      inofensivas; atributos solo literales (texto, número, booleano) y sin eventos/estilos/URL peligrosas; sin
//      import/export; expresiones `{…}` solo si son comentarios `{/* … */}`; sin bloques ```x file="…"``` (Rspress
//      leería un archivo del servidor) ni imágenes relativas (Rspress generaría un import). Más: el frontmatter debe
//      ser YAML (gray-matter EVALÚA un frontmatter `---js`) y hay límites de tamaño.
//   3. La compilación corre en un PROCESO aparte con el modelo de permisos de Node (solo lectura de las dependencias,
//      sin escribir, sin procesos hijos, sin variables de entorno, sin la BD) y con tiempo máximo (compile-child.mjs).
//   4. El código compilado se VERIFICA en el proceso principal antes de evaluarlo (assertSafeCompiledCode): se parsea
//      con acorn y solo se aceptan las construcciones que genera MDX para contenido declarativo (llamadas a _jsx con
//      literales, `_components.X`…). Cualquier otra cosa (`constructor`, `process`, bucles, `import()`, `this`…)
//      se rechaza aunque viniera de un plugin o del proceso de compilación comprometido.
//   5. Se evalúa en un contexto `vm` propio: globales mínimas (sin process, require, import, fetch, Buffer…), sin
//      generación de código (`eval`/`Function` lanzan EvalError) y con los intrínsecos congelados.
// `vm` no es por sí solo una frontera de seguridad: la garantía la dan 2 y 4 (no hay código del usuario que evaluar);
// 3 y 5 reducen lo que podría hacer un fallo de esas capas.
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { dangerousUrl } from '../server/routes/mdxSafety.mjs';
import { KNOWN_COMPONENTS } from '../server/routes/validate.mjs';

const requirePortal = createRequire(import.meta.url);

/** Componentes que puede usar el contenido (los 13 de `markdown.globalComponents` + el aviso interno de `:::`). */
export const CALLOUT_INTERNAL = '$$$callout$$$';
export const ALLOWED_COMPONENTS = new Set([...KNOWN_COMPONENTS, CALLOUT_INTERNAL]);
/** Etiquetas HTML admitidas en el contenido (lista de permitidos; ni script/iframe/object/embed/style/link/meta/base/form…). */
export const ALLOWED_HTML = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'details', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
  'kbd', 'li', 'mark', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'th',
  'thead', 'tr', 'u', 'ul', 'caption', 'figcaption', 'figure', 'dl', 'dt', 'dd',
]);
/** Tipos de nodo mdast admitidos (Markdown + GFM + directivas `:::`; los MDX se tratan aparte). */
const MDAST_TYPES = new Set([
  'root', 'paragraph', 'text', 'heading', 'thematicBreak', 'blockquote', 'list', 'listItem', 'table', 'tableRow', 'tableCell',
  'emphasis', 'strong', 'delete', 'inlineCode', 'code', 'break', 'link', 'image', 'linkReference', 'imageReference', 'definition',
  'footnoteDefinition', 'footnoteReference', 'containerDirective', 'leafDirective', 'textDirective',
  'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxFlowExpression', 'mdxTextExpression',
]);
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'poster', 'data', 'xlink:href', 'background', 'srcset', 'cite', 'longdesc', 'manifest', 'ping']);
/** Nombres que nunca pueden ser propiedad ni atributo (prototipos y reflexión). */
export const FORBIDDEN_NAMES = new Set([
  'constructor', '__proto__', 'prototype', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
  'caller', 'callee', 'arguments', 'call', 'apply', 'bind', 'valueOf', 'toString', 'toLocaleString', 'then', 'eval', 'Function',
]);
const ATTR_NAME_RE = /^[A-Za-z_][\w.:-]*$/;

/** Límites (también los usa el motor). */
export const LIMITS = {
  sourceBytes: 3 * 1024 * 1024, // la API admite 2 000 000 caracteres de cuerpo; con frontmatter, holgura
  compiledBytes: 48 * 1024 * 1024,
  nodes: 400_000,
  depth: 200,
};

export class ContentSafetyError extends Error {
  constructor(problems) {
    super(`Contenido no permitido: ${problems[0]}${problems.length > 1 ? ` (y ${problems.length - 1} más)` : ''}`);
    this.name = 'ContentSafetyError';
    this.problems = problems.slice(0, 50);
    this.code = 'ISP_CONTENT_UNSAFE';
  }
}

const absUrlOk = u => /^\//.test(u) || /^https?:\/\//i.test(u);

/** Comprobaciones previas sobre el texto: tamaño y frontmatter YAML (nunca `---js`/`---coffee`: gray-matter los evalúa). */
export function checkSource(source) {
  const problems = [];
  if (typeof source !== 'string') problems.push('el contenido no es texto');
  else {
    if (Buffer.byteLength(source, 'utf8') > LIMITS.sourceBytes) problems.push(`la página supera ${LIMITS.sourceBytes / 1048576} MB`);
    if (/^﻿?[ \t]*---[ \t]*[^\s-]/.test(source)) problems.push('el frontmatter debe ser YAML (no se admite ---js ni otros lenguajes)');
    if (/^﻿?[ \t]*(?:\+\+\+|;;;)/.test(source)) problems.push('el frontmatter debe ser YAML');
  }
  if (problems.length) throw new ContentSafetyError(problems);
}

function attrValueProblem(name, value) {
  // value: null (booleano), string, o mdxJsxAttributeValueExpression
  if (value == null) return null;
  let v = value;
  if (typeof value === 'object') {
    if (value.type !== 'mdxJsxAttributeValueExpression') return `atributo ${name}: valor no admitido`;
    const body = value.data?.estree?.body;
    const ex = Array.isArray(body) && body.length === 1 && body[0].type === 'ExpressionStatement' ? body[0].expression : null;
    const lit = ex && ex.type === 'Literal' && !ex.regex && typeof ex.bigint === 'undefined' ? ex : null;
    const neg = ex && ex.type === 'UnaryExpression' && ex.operator === '-' && ex.argument?.type === 'Literal' && typeof ex.argument.value === 'number' ? ex.argument : null;
    if (!lit && !neg) return `atributo ${name}={…}: solo se admiten textos, números o true/false (no expresiones de código)`;
    v = lit ? lit.value : -neg.value;
  }
  if (typeof v === 'string' && URL_ATTRS.has(name.toLowerCase()) && dangerousUrl(v)) return `atributo ${name}: esquema de URL no permitido`;
  return null;
}

/**
 * Plugin remark (va PRIMERO en la cadena de Rspress: ve el árbol tal como lo escribió el editor, antes de que los
 * plugins de Rspress añadan sus propios nodos). Lanza ContentSafetyError con la lista de problemas.
 */
export function remarkContentSafety() {
  return tree => {
    const problems = [];
    const add = (m, node) => {
      if (problems.length < 50) problems.push(node?.position?.start?.line ? `${m} (línea ${node.position.start.line})` : m);
    };
    let count = 0;
    const visit = (node, depth) => {
      if (!node || typeof node !== 'object') return;
      if (++count > LIMITS.nodes) {
        if (count === LIMITS.nodes + 1) add('la página es demasiado grande (nodos)', node);
        return;
      }
      if (depth > LIMITS.depth) return add('anidación demasiado profunda', node);
      const t = node.type;
      if (t === 'mdxjsEsm') add('no se permite import/export en una página', node);
      else if (t === 'mdxFlowExpression' || t === 'mdxTextExpression') {
        const body = node.data?.estree?.body;
        if (!Array.isArray(body) || body.length) add('no se permiten expresiones { } (solo comentarios {/* … */})', node);
      } else if (t === 'mdxJsxFlowElement' || t === 'mdxJsxTextElement') {
        const name = node.name;
        if (name != null) {
          if (/^[A-Z$]/.test(name) || /[.:]/.test(name)) {
            if (!ALLOWED_COMPONENTS.has(name) || name === CALLOUT_INTERNAL) add(`componente no permitido: <${name}>`, node);
          } else if (!ALLOWED_HTML.has(name)) add(`etiqueta HTML no permitida: <${name}>`, node);
        }
        for (const a of node.attributes ?? []) {
          if (a.type !== 'mdxJsxAttribute') {
            add(`atributos con expresión ({...}) no permitidos en <${name ?? ''}>`, node);
            continue;
          }
          const an = String(a.name ?? '');
          const low = an.toLowerCase();
          if (!ATTR_NAME_RE.test(an) || FORBIDDEN_NAMES.has(an)) add(`atributo no permitido: ${an}`, node);
          else if (/^on/.test(low)) add(`atributo de evento no permitido: ${an}`, node);
          else if (['dangerouslysetinnerhtml', 'srcdoc', 'formaction', 'style', 'ref', 'is', 'xmlns', 'innerhtml', 'outerhtml'].includes(low)) add(`atributo no permitido: ${an}`, node);
          else {
            const p = attrValueProblem(an, a.value);
            if (p) add(p, node);
            else if (name === 'img' && low === 'src' && typeof a.value === 'string' && !absUrlOk(a.value)) add('las imágenes deben usar una ruta absoluta (/assets/…)', node);
          }
        }
      } else if (!MDAST_TYPES.has(t)) add(`elemento no admitido en el contenido: ${t}`, node);
      else if (t === 'code' && /(^|\s)file\s*=/.test(String(node.meta ?? ''))) add('los bloques de código no pueden incluir archivos (file=…)', node);
      else if ((t === 'link' || t === 'definition') && dangerousUrl(String(node.url ?? ''))) add('enlace con un esquema no permitido', node);
      else if (t === 'image' && (!absUrlOk(String(node.url ?? '')) || dangerousUrl(String(node.url ?? '')))) add('las imágenes deben usar una ruta absoluta (/assets/…) o https://', node);
      else if ((t === 'containerDirective' || t === 'leafDirective' || t === 'textDirective') && node.attributes) {
        for (const [k, v] of Object.entries(node.attributes)) {
          if (FORBIDDEN_NAMES.has(k) || /^on/i.test(k) || (typeof v === 'string' && dangerousUrl(v))) add(`atributo no permitido en el aviso: ${k}`, node);
        }
      }
      if (Array.isArray(node.children)) for (const c of node.children) visit(c, depth + 1);
    };
    visit(tree, 0);
    if (problems.length) throw new ContentSafetyError(problems);
  };
}

// ── 4. Verificación del código compilado ──────────────────────────────────────────────────────────────────────
let acorn;
const ALLOWED_NODES = new Set([
  'Program', 'ExpressionStatement', 'Literal', 'VariableDeclaration', 'VariableDeclarator', 'ObjectPattern', 'Property', 'Identifier',
  'MemberExpression', 'FunctionDeclaration', 'BlockStatement', 'ObjectExpression', 'SpreadElement', 'CallExpression', 'IfStatement',
  'UnaryExpression', 'ReturnStatement', 'ArrayExpression', 'AssignmentPattern', 'ConditionalExpression', 'ThrowStatement',
  'NewExpression', 'BinaryExpression', 'LogicalExpression',
]);
const RUNTIME_IDS = ['_Fragment', '_jsx', '_jsxs', 'arguments', '_provideComponents', '_createMdxContent', 'props', '_components', '_missingMdxReference', 'MDXContent', 'MDXLayout', 'id', 'component', 'Error', 'undefined'];
const ALLOWED_IDS = new Set([...RUNTIME_IDS, ...ALLOWED_COMPONENTS]);
const CALLABLE = new Set(['_jsx', '_jsxs', '_provideComponents', '_createMdxContent', '_missingMdxReference']);
const FUNCTIONS = new Set(['_createMdxContent', 'MDXContent', '_missingMdxReference']);

/**
 * Verifica que el cuerpo de función que produce MDX solo contiene contenido declarativo. Lanza ContentSafetyError.
 * Coste: un parseo con acorn (~10-20 MB/s): solo al compilar, nunca por petición.
 */
export function assertSafeCompiledCode(code) {
  if (typeof code !== 'string' || code.length > LIMITS.compiledBytes) throw new ContentSafetyError(['código compilado ausente o demasiado grande']);
  acorn ??= requirePortal('acorn');
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
  } catch (e) {
    throw new ContentSafetyError([`código compilado ilegible (${e.message})`]);
  }
  const problems = [];
  const bad = (m, n) => {
    if (problems.length < 20) problems.push(`${m}${n?.start != null ? ` @${n.start}` : ''}`);
  };
  const stack = [[ast, null, null]];
  while (stack.length) {
    const [node, parent, key] = stack.pop();
    if (!node || typeof node.type !== 'string') continue;
    const t = node.type;
    if (!ALLOWED_NODES.has(t)) {
      bad(`construcción no admitida: ${t}`, node);
      continue;
    }
    switch (t) {
      case 'Literal':
        if (node.regex || node.bigint !== undefined) bad('literal no admitido', node);
        break;
      case 'Identifier': {
        const isKey = (parent?.type === 'Property' && key === 'key' && !parent.computed) || (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed);
        if (isKey) {
          if (FORBIDDEN_NAMES.has(node.name)) bad(`propiedad no permitida: ${node.name}`, node);
        } else if (!ALLOWED_IDS.has(node.name)) bad(`identificador no permitido: ${node.name}`, node);
        break;
      }
      case 'Property':
        if (node.kind !== 'init' || node.method || (node.computed && node.key?.type !== 'Literal')) bad('propiedad no admitida', node);
        if (node.key?.type === 'Literal' && FORBIDDEN_NAMES.has(String(node.key.value))) bad(`propiedad no permitida: ${node.key.value}`, node);
        break;
      case 'MemberExpression': {
        const o = node.object;
        const okObj = o?.type === 'Identifier' && ['_components', 'props', 'arguments'].includes(o.name);
        if (!okObj || node.optional) bad('acceso a propiedad no admitido', node);
        else if (o.name === 'arguments' && !(node.computed && node.property?.type === 'Literal' && node.property.value === 0)) bad('acceso a arguments no admitido', node);
        else if (o.name === 'props' && (node.computed || node.property?.name !== 'components')) bad('acceso a props no admitido', node);
        else if (o.name === '_components' && node.computed) bad('acceso calculado no admitido', node);
        break;
      }
      case 'CallExpression': {
        const c = node.callee;
        const ok = (c?.type === 'Identifier' && CALLABLE.has(c.name)) || false;
        if (!ok || node.optional) bad('llamada no admitida', node);
        break;
      }
      case 'NewExpression':
        if (node.callee?.type !== 'Identifier' || node.callee.name !== 'Error') bad('new no admitido', node);
        break;
      case 'FunctionDeclaration':
        if (!FUNCTIONS.has(node.id?.name) || node.async || node.generator) bad('función no admitida', node);
        break;
      case 'VariableDeclaration':
        if (node.kind !== 'const') bad('declaración no admitida', node);
        break;
      case 'UnaryExpression':
        if (!['!', '-'].includes(node.operator)) bad('operador no admitido', node);
        break;
      case 'BinaryExpression':
        if (node.operator !== '+') bad('operador no admitido', node);
        break;
      case 'LogicalExpression':
        if (!['&&', '||', '??'].includes(node.operator)) bad('operador no admitido', node);
        break;
      default:
    }
    for (const k in node) {
      if (k === 'type' || k === 'start' || k === 'end' || k === 'loc' || k === 'range') continue;
      const v = node[k];
      if (Array.isArray(v)) for (let i = v.length - 1; i >= 0; i--) stack.push([v[i], node, k]);
      else if (v && typeof v === 'object' && typeof v.type === 'string') stack.push([v, node, k]);
    }
  }
  if (problems.length) throw new ContentSafetyError(problems.map(p => `código compilado: ${p}`));
}

// ── 5. Evaluación en un contexto aislado ────────────────────────────────────────────────────────────────────
let sandbox = null;
function sandboxContext() {
  if (sandbox) return sandbox;
  // Objeto global sin nada del proceso: solo los intrínsecos de JavaScript del propio contexto.
  const ctx = vm.createContext(Object.create(null), { name: 'isp-mdx', codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(
    `"use strict";
    for (const k of ['WebAssembly', 'SharedArrayBuffer', 'Atomics', 'FinalizationRegistry', 'WeakRef']) { try { delete globalThis[k]; } catch {} }
    for (const o of [Object, Object.prototype, Array, Array.prototype, Function, Function.prototype, Error, Error.prototype, String.prototype, Number.prototype, Boolean.prototype, Symbol, Symbol.prototype, Promise, Promise.prototype, JSON, Math, Reflect])
      Object.freeze(o);`,
    ctx,
    { timeout: 1000 },
  );
  sandbox = ctx;
  return ctx;
}

/**
 * Evalúa el cuerpo de función de MDX (YA verificado con assertSafeCompiledCode) en el contexto aislado con el
 * runtime JSX dado → componente MDXContent. `timeout` acota la ejecución de la parte síncrona.
 */
let callScript;
export function evaluateIsolated(code, runtime, { timeout = 2000 } = {}) {
  const ctx = sandboxContext();
  const rt = Object.freeze({
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
    useMDXComponents: runtime.useMDXComponents,
  });
  const fn = vm.runInContext(`(function () {${code}\n})`, ctx, { timeout, filename: 'pagina-mdx.js' });
  // La parte de nivel superior del módulo también corre DENTRO del contexto y con tiempo máximo (un bucle se corta).
  callScript ??= new vm.Script('globalThis.__ispCall.call(undefined, globalThis.__ispRt)', { filename: 'pagina-mdx-llamada.js' });
  let mod;
  ctx.__ispCall = fn;
  ctx.__ispRt = rt;
  try {
    mod = callScript.runInContext(ctx, { timeout });
  } finally {
    delete ctx.__ispCall;
    delete ctx.__ispRt;
  }
  if (!mod || typeof mod.default !== 'function') throw new ContentSafetyError(['el código compilado no exporta un componente']);
  return mod.default;
}

export const _test = { sandboxContext };
