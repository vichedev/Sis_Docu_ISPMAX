// Seguridad del contenido ejecutable del manual dinámico (portal/site/safety.mjs, compiler.mjs, engine.mjs):
//   1. ≥ 30 cargas maliciosas compiladas con el compilador REAL (proceso aislado con permisos): rechazadas o inertes.
//   2. Las mismas como páginas publicadas escritas por SQL (sin pasar por el portal): el motor muestra un aviso en su
//      lugar, nada se ejecuta (centinelas: global, variable de entorno, archivo), y el resto del sitio no cambia.
//   3. Verificador del código compilado y contexto vm, con código malicioso hecho a mano (por si un plugin lo generara).
//   4. Límites: tiempo de compilación (el proceso se recicla y lo demás sigue) y tamaño.
//   5. Las 285 páginas reales del corpus: 0 falsos positivos.
// Usa TEST_DATABASE_URL (vacía sus tablas). Uso: node --test --test-concurrency=1 test/mdx-sandbox.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { loadEnv, PORTAL_ROOT } from '../server/env.mjs';
import { resetTestDb } from './helpers/reset-db.mjs';
import { ensureTheme } from './helpers/theme.mjs';
import { getCorpus, corpusSkip, describeCorpus } from './helpers/corpus.mjs';

loadEnv();
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL) throw new Error('Falta TEST_DATABASE_URL');
if (TEST_URL === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
ensureTheme();

const { createCompiler } = await import('../site/compiler.mjs');
const { assertSafeCompiledCode, evaluateIsolated, ContentSafetyError } = await import('../site/safety.mjs');
const { createSiteEngine } = await import('../site/engine.mjs');
const { mdxSecurityProblems } = await import('../server/routes/mdxSafety.mjs');

const CANARY = path.join(PORTAL_ROOT, 'work-test', 'sandbox-canary.txt');
const CANARY_FWD = CANARY.replace(/\\/g, '/');
process.env.ISP_SANDBOX_CANARY = 'intacta';
const fm = (t = 'Prueba') => `---\ntitle: "${t}"\n---\n\n`;

// [nombre, cuerpo (o texto completo si empieza por ---), esperado: 'reject' | 'inert' | 'either']
const PAYLOADS = [
  ['import ESM', "import fs from 'node:fs'\n\nHola"],
  ['export de código', 'export const x = process.exit(1)\n\nHola'],
  ['export default (layout)', 'export default function L() { return null }\n\nHola'],
  ['process.env', `Clave: {process.env.ISP_SANDBOX_CANARY = 'rota'}`],
  ['IIFE', '{(() => { globalThis.__ISP_PWNED__ = 1 })()}'],
  ['constructor.constructor', "{constructor.constructor('return process')().exit(1)}"],
  ['this.constructor', "{this.constructor.constructor('return process')()}"],
  ['Function()', "{Function('return process')().exit(1)}"],
  ['globalThis.process', "{globalThis.process.mainModule.require('child_process').execSync('whoami')}"],
  ['require', `{require('fs').writeFileSync('${CANARY_FWD}', 'x')}`],
  ['import() dinámico', "{import('node:fs').then(f => f.writeFileSync('x', 'y'))}"],
  ['__proto__ en expresión', '{({}).__proto__.polluted = 1}'],
  ['bucle infinito', '{(() => { while (true) {} })()}'],
  ['onError', '<img src="/assets/x.webp" onError="alert(1)" />'],
  ['onClick con función', '<Figure src="/assets/x.webp" onClick={() => fetch("/api/users")} />'],
  ['javascript: en Markdown', '[clic](javascript:alert(1))'],
  ['javascript: mayúsculas', '<a href="JaVaScRiPt:alert(1)">x</a>'],
  ['javascript: con entidad', '<a href="jav&#x61;script:alert(1)">x</a>'],
  ['javascript: con espacios', '<a href="  javascript:alert(1)">x</a>'],
  ['data:text/html', '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)'],
  ['xlink:href', '<Kicker xlink:href="javascript:alert(1)">x</Kicker>'],
  ['<script>', '<script>alert(1)</script>'],
  ['<iframe>', '<iframe src="https://atacante.invalid"></iframe>'],
  ['<object>', '<object data="https://atacante.invalid/x.swf"></object>'],
  ['<embed>', '<embed src="https://atacante.invalid/x" />'],
  ['<style>', '<style>{"body{display:none}"}</style>'],
  ['<link>', '<link rel="stylesheet" href="https://atacante.invalid/x.css" />'],
  ['<meta refresh>', '<meta httpEquiv="refresh" content="0;url=https://atacante.invalid" />'],
  ['<base>', '<base href="https://atacante.invalid/" />'],
  ['<form>', '<form action="https://atacante.invalid"><button>Enviar</button></form>'],
  ['<svg><script>', '<svg><script>alert(1)</script></svg>'],
  ['scrіpt con letra cirílica', '<scrіpt>alert(1)</scrіpt>'],
  ['dangerouslySetInnerHTML', "<div dangerouslySetInnerHTML={{ __html: '<img src=x onerror=alert(1)>' }} />"],
  ['spread de props', '<div {...props} />'],
  ['plantilla en atributo', '<Card title={`${process.env.ISP_SANDBOX_CANARY}`}>x</Card>'],
  ['style con expresión', "<div style={{ background: 'url(javascript:alert(1))' }}>x</div>"],
  ['__proto__ como atributo', '<Badge __proto__="x">y</Badge>'],
  ['constructor como atributo', '<Steps constructor="x">y</Steps>'],
  ['componente desconocido', '<Desconocido />'],
  ['componente interno $$$callout$$$', '<$$$callout$$$ type="tip" />'],
  ['expresión dentro de un componente', '<Callout type="tip">{process}</Callout>'],
  ['bloque de código con file=', '```txt file="<root>/portal/.env"\n```'],
  ['imagen relativa (import)', '![x](./relativa.png)'],
  ['frontmatter ---js', `---js\n{ title: require('fs').readFileSync('${CANARY_FWD}', 'utf8') }\n---\n\n# Hola\n`],
  ['anidación extrema', '<div>'.repeat(400) + 'x' + '</div>'.repeat(400)],
  ['página gigante', 'x'.repeat(3.2 * 1024 * 1024)],
  ['comentario HTML (no es MDX)', '<!-- <script>alert(1)</script> -->', 'either'],
  ['entidades en texto', '&lt;script&gt;alert(1)&lt;/script&gt; y &#x6A;avascript:alert(1)', 'inert'],
  ['javascript: como texto', 'Escriba javascript:alert(1) en la barra (es solo texto).', 'inert'],
  ['comentario JSX', '{/* comentario permitido */}\n\nTexto normal.', 'inert'],
  ['enlace interno normal', '<a href="/guia/inicio" target="_blank" rel="noopener noreferrer">ok</a>', 'inert'],
  ['aviso con atributos', ':::tip{onclick=alert(1)}\nAviso\n:::', 'either'],
];

let compiler;
let pool;
const results = new Map(); // nombre → { outcome: 'reject'|'inert'|'error', detail }

before(async () => {
  fs.rmSync(CANARY, { force: true });
  compiler = createCompiler({ mode: 'process' });
  pool = new pg.Pool({ connectionString: TEST_URL });
  await resetTestDb(pool);
});
after(async () => {
  compiler?.close();
  await pool?.end();
  fs.rmSync(CANARY, { force: true });
});

function inertChecks(code) {
  // Lo que queda del código compilado no tiene etiquetas ni URL activas.
  assert.doesNotMatch(code, /_jsx\("(script|iframe|object|embed|style|link|meta|base|form|svg)"/);
  assert.doesNotMatch(code, /href: "\s*javascript:/i);
  assert.doesNotMatch(code, /\bon[A-Z][a-z]+:/);
}

test(`cargas maliciosas (${PAYLOADS.length}) con el compilador real: rechazadas o inertes; nada se ejecuta`, async () => {
  assert.ok(PAYLOADS.length >= 30);
  for (const [name, text, expected = 'reject'] of PAYLOADS) {
    const source = text.startsWith('---') ? text : fm(name) + text;
    let outcome;
    let detail = '';
    try {
      const r = await compiler.compile(source, 'guia/sandbox.mdx');
      assertSafeCompiledCode(r.code); // capa 4 (proceso principal)
      inertChecks(r.code);
      // capa 5: se evalúa y se pinta con un runtime de prueba; no debe tocar nada del proceso
      const C = evaluateIsolated(r.code, { Fragment: Symbol('f'), jsx: () => null, jsxs: () => null, useMDXComponents: () => ({}) });
      assert.equal(typeof C, 'function');
      outcome = 'inert';
    } catch (e) {
      outcome = e.code === 'ISP_CONTENT_UNSAFE' || e instanceof ContentSafetyError ? 'reject' : 'error';
      detail = e.message.slice(0, 160);
    }
    results.set(name, { outcome, detail });
    if (expected === 'reject') assert.equal(outcome, 'reject', `${name}: ${outcome} ${detail}`);
    else if (expected === 'inert') assert.equal(outcome, 'inert', `${name}: ${detail}`);
    else assert.ok(['reject', 'inert', 'error'].includes(outcome), name);
  }
  // centinelas: nada de lo anterior se ejecutó
  assert.equal(globalThis.__ISP_PWNED__, undefined);
  assert.equal(process.env.ISP_SANDBOX_CANARY, 'intacta');
  assert.equal(({}).polluted, undefined);
  assert.ok(!fs.existsSync(CANARY), 'no se escribió el archivo centinela');
  const rejected = [...results.values()].filter(r => r.outcome === 'reject').length;
  console.log(`# cargas: ${PAYLOADS.length} · rechazadas ${rejected} · inertes ${[...results.values()].filter(r => r.outcome === 'inert').length} · error de sintaxis ${[...results.values()].filter(r => r.outcome === 'error').length}`);
});

test('las mismas cargas como páginas publicadas por SQL: el motor muestra un aviso, nada se ejecuta y el resto del sitio no cambia', async () => {
  await pool.query(
    `INSERT INTO pages (route, file_path, seccion, title, status, body, frontmatter) VALUES
       ('/', 'index.mdx', 'raiz', 'Inicio', 'published', '# Inicio\n\nPortada de prueba.', '{"title":"Inicio"}'),
       ('/guia/buena', 'guia/buena.mdx', 'guia', 'Página buena', 'published', '# Página buena\n\n:::tip\nTodo bien.\n:::\n\n| a | b |\n|---|---|\n| 1 | 2 |', '{"title":"Página buena"}')`,
  );
  const engine = await createSiteEngine({ pool, compiler: createCompiler({ mode: 'process' }) });
  try {
    const good0 = await engine.renderRoute('/guia/buena');
    assert.equal(good0.status, 200);
    const evil = PAYLOADS.filter(([, t, exp]) => (exp ?? 'reject') === 'reject' && !t.startsWith('---') && t.length < 1e6);
    let i = 0;
    for (const [name, body] of evil) {
      i++;
      await pool.query("INSERT INTO pages (route, file_path, seccion, title, status, body, frontmatter) VALUES ($1, $2, 'guia', $3, 'published', $4, $5)", [
        `/guia/mala-${i}`,
        `guia/mala-${i}.mdx`,
        `Mala ${i}`,
        body,
        JSON.stringify({ title: `Mala ${i}` }),
      ]);
      void name;
    }
    engine.invalidate({});
    for (let k = 1; k <= i; k++) {
      const r = await engine.renderRoute(`/guia/mala-${k}`);
      assert.equal(r.status, 200, `mala-${k}`);
      assert.match(r.html, /contenido no permitido/, `mala-${k}: aviso en su lugar`);
      assert.doesNotMatch(r.html, /<script>alert|javascript:alert|onerror=/i, `mala-${k}`);
    }
    assert.equal(globalThis.__ISP_PWNED__, undefined);
    assert.equal(process.env.ISP_SANDBOX_CANARY, 'intacta');
    assert.ok(!fs.existsSync(CANARY));
    // El resto del sitio: la página buena sigue igual (el menú cambia porque hay páginas nuevas; el artículo no).
    const good1 = await engine.renderRoute('/guia/buena');
    const art = h => h.slice(h.indexOf('<article'), h.indexOf('</article>'));
    assert.equal(good1.status, 200);
    assert.equal(art(good1.html), art(good0.html));
    const st = engine.stats();
    assert.ok(st.counters.unsafe >= i, `páginas inseguras contadas: ${st.counters.unsafe}`);
    // Una fila con frontmatter `---js` en fm_raw (importada o por SQL): tampoco se evalúa.
    await pool.query(
      "INSERT INTO pages (route, file_path, seccion, title, status, body, frontmatter, fm_raw) VALUES ('/guia/fmjs', 'guia/fmjs.mdx', 'guia', 'FM', 'published', '# Hola', '{\"title\":\"FM\"}', $1)",
      [`---js\n{ title: require('fs').writeFileSync('${CANARY_FWD}', 'x') }\n---\n`],
    );
    engine.invalidate({});
    const fmjs = await engine.renderRoute('/guia/fmjs');
    assert.equal(fmjs.status, 200);
    assert.ok(!fs.existsSync(CANARY), 'el frontmatter ---js no se ejecutó');
  } finally {
    engine.close();
    await pool.query("DELETE FROM pages WHERE route LIKE '/guia/mala-%' OR route IN ('/guia/fmjs')");
  }
});

test('verificador del código compilado: rechaza lo que no es contenido declarativo (aunque lo generara un plugin)', () => {
  const ok = 'const {Fragment: _Fragment, jsx: _jsx, jsxs: _jsxs} = arguments[0];\nfunction MDXContent(props = {}) { return _jsx("p", { children: "hola" }); }\nreturn { default: MDXContent };';
  assertSafeCompiledCode(ok);
  const bad = [
    'return { default: () => process.env };',
    'const {jsx: _jsx} = arguments[0]; return { default: function MDXContent() { return _jsx.constructor("return process")(); } };',
    'function MDXContent() { return this; } return { default: MDXContent };',
    'function MDXContent() { while (true) {} } return { default: MDXContent };',
    'function MDXContent() { return import("node:fs"); } return { default: MDXContent };',
    'function MDXContent() { return globalThis; } return { default: MDXContent };',
    'function MDXContent(props) { return props["constructor"]; } return { default: MDXContent };',
    'function MDXContent(props) { const _components = { __proto__: null }; return _components; } return { default: MDXContent };',
    'function MDXContent() { return eval("1"); } return { default: MDXContent };',
    'function MDXContent() { return new Function("return 1")(); } return { default: MDXContent };',
    'function MDXContent() { return `${1}`; } return { default: MDXContent };',
    'let x = 1; function MDXContent() { x = 2; } return { default: MDXContent };',
    'function MDXContent() { return _components.Figure.constructor; } return { default: MDXContent };',
    'async function MDXContent() { await 1; } return { default: MDXContent };',
  ];
  for (const code of bad) assert.throws(() => assertSafeCompiledCode(code), ContentSafetyError, code);
});

test('contexto vm: sin process, require, fetch ni globales del proceso; eval/Function deshabilitados; intrínsecos congelados', () => {
  const rt = { Fragment: Symbol('f'), jsx: () => 1, jsxs: () => 1, useMDXComponents: () => ({}) };
  // (código evaluado SIN pasar por el verificador, para probar la capa 5 por separado)
  const probe = evaluateIsolated(
    `return { default: function () { return [typeof process, typeof require, typeof fetch, typeof Buffer, typeof setTimeout, typeof globalThis.process, typeof WebAssembly].join(','); } };`,
    rt,
  );
  assert.equal(probe(), 'undefined,undefined,undefined,undefined,undefined,undefined,undefined');
  const gen = evaluateIsolated(`return { default: function () { try { return Function('return 1')(); } catch (e) { return e.name; } } };`, rt);
  assert.equal(gen(), 'EvalError');
  const ev = evaluateIsolated(`return { default: function () { try { return eval('1'); } catch (e) { return e.name; } } };`, rt);
  assert.equal(ev(), 'EvalError');
  const ctor = evaluateIsolated(`return { default: function () { try { return ({}).constructor.constructor('return process')(); } catch (e) { return e.name; } } };`, rt);
  assert.equal(ctor(), 'EvalError');
  const frozen = evaluateIsolated(`return { default: function () { try { Object.prototype.x = 1; } catch {} return Object.prototype.x === 1 ? 'cambiado' : 'congelado'; } };`, rt);
  assert.equal(frozen(), 'congelado');
  assert.equal(({}).x, undefined, 'el prototipo del proceso no se toca');
  // Un bucle infinito en la parte síncrona del módulo se corta por tiempo.
  assert.throws(() => evaluateIsolated('while (true) {}', rt, { timeout: 100 }), /timed out|tiempo/i);
});

test('límites: una compilación que supera el tiempo falla sola; el proceso se recicla y las demás siguen', async () => {
  const c = createCompiler({ mode: 'process', timeoutMs: 2500 });
  try {
    // Una página válida pero enorme (60 000 filas de tabla): tarda más que el máximo.
    const heavy = fm('Pesada') + '| a | b | c |\n|---|---|---|\n' + Array.from({ length: 60_000 }, (_, i) => `| a${i} | **b${i}** | [c${i}](/guia/x) |`).join('\n');
    const t0 = Date.now();
    await assert.rejects(c.compile(heavy, 'guia/pesada.mdx'), e => e.code === 'ISP_COMPILE_TIMEOUT');
    assert.ok(Date.now() - t0 < 15_000, 'se corta a tiempo');
    // La siguiente página se compila en un proceso nuevo (el anterior se mató).
    const r = await c.compile(fm('Corta') + '# Corta\n\nTexto.', 'guia/corta.mdx');
    assert.match(r.code, /Corta/);
    const s = c.stats();
    assert.ok(s.timeouts >= 1 && s.restarts >= 1, JSON.stringify(s));
    assert.equal(s.sandboxed, true, 'el compilador corre con el modelo de permisos de Node');
  } finally {
    c.close();
  }
  // tamaño: lo rechaza checkSource antes de compilar
  await assert.rejects(compiler.compile(fm() + 'y'.repeat(3.5 * 1024 * 1024), 'guia/gigante.mdx'), e => e.code === 'ISP_CONTENT_UNSAFE');
});

test('el proceso de compilación no puede leer archivos del servidor, escribir, lanzar procesos ni ver el entorno', async () => {
  const { permissionFlags } = await import('../site/compiler.mjs');
  const flags = permissionFlags();
  assert.ok(flags.includes('--permission') || flags.includes('--experimental-permission'), 'Node con modelo de permisos');
  assert.ok(!flags.some(f => /allow-fs-write|allow-child-process|allow-worker/.test(f)));
  assert.ok(!flags.some(f => f.includes(path.join(PORTAL_ROOT, '.env')) || f.endsWith(`${path.sep}portal`) || f === `--allow-fs-read=${PORTAL_ROOT}`), 'no se permite leer portal/ entero');
  // La capa 1 del portal también rechaza (al guardar) la mayoría de cargas
  const api = PAYLOADS.filter(([, t, e]) => (e ?? 'reject') === 'reject' && !t.startsWith('---')).filter(([, t]) => mdxSecurityProblems({ body: t }).length > 0).length;
  console.log(`# mdxSafety (al guardar) rechaza también ${api} de las cargas de cuerpo`);
});

test('las páginas reales del corpus: 0 falsos positivos (compilación aislada + verificación + vm)', { skip: corpusSkip }, async () => {
  const corpus = getCorpus();
  console.log(`# ${describeCorpus(corpus)}`);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.mdx') ? [path.join(d, e.name)] : []));
  const files = walk(corpus.docsDir).filter(f => !f.includes(`${path.sep}public${path.sep}`));
  const fails = [];
  for (const f of files) {
    const rel = path.relative(corpus.docsDir, f).replace(/\\/g, '/');
    try {
      const r = await compiler.compile(fs.readFileSync(f, 'utf8'), rel);
      assertSafeCompiledCode(r.code);
      evaluateIsolated(r.code, { Fragment: Symbol('f'), jsx: () => null, jsxs: () => null, useMDXComponents: () => ({}) });
    } catch (e) {
      fails.push(`${rel}: ${e.message.slice(0, 120)}`);
    }
  }
  assert.ok(files.length >= 250, `páginas: ${files.length}`);
  assert.deepEqual(fails, []);
  console.log(`# corpus: ${files.length} páginas, 0 falsos positivos`);
});
