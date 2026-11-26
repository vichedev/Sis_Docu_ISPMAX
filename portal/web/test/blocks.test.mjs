// Pruebas del motor de bloques (portal/web/src/lib/blocks). Ejecutar desde la raíz del repo o desde portal/web:
//   node --test portal/web/test/blocks.test.mjs
// Lee las páginas reales del corpus (repo o paquete .ispmax; portal/test/helpers/corpus.mjs, solo lectura) y compila MDX con @mdx-js/mdx + remark-gfm del node_modules del repo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCorpus, corpusSkip, describeCorpus } from '../../test/helpers/corpus.mjs';
import {
  parseMdx,
  serializeBlocks,
  newBlock,
  insertBlock,
  removeBlock,
  moveBlock,
  duplicateBlock,
  updateBlock,
  mapBlock,
  convertBlock,
  convertTargets,
  reparseBlock,
  moveItem,
  insertItem,
  outline,
  parseTable,
  buildTable,
  escapeMdxText,
  BLOCK_TYPES,
  renderBlock,
  imageFromAsset,
} from '../src/lib/blocks/index.ts';

const CORPUS = getCorpus();
const skip = corpusSkip; // sin repo ni paquete .ispmax estas pruebas se saltan con el motivo (portal/test/README.md)
console.log('# ' + describeCorpus(CORPUS));

// ───────────────────────── páginas del manual ─────────────────────────

function listPages(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'public') out.push(...listPages(p));
    } else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out.sort();
}
// Igual que portal/server/sync/parse.mjs → parsePage: el cuerpo es lo que sigue al frontmatter.
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
function bodyOf(src) {
  const rest = src.replace(/^﻿/, '');
  const m = rest.match(FM_RE);
  return m ? rest.slice(m[0].length) : src;
}
const FILES = CORPUS.available ? listPages(CORPUS.docsDir) : [];
const PAGES = FILES.map(f => {
  const src = readFileSync(f, 'utf8');
  return { file: path.relative(CORPUS.root, f).replace(/\\/g, '/'), src, body: bodyOf(src) };
});
const page = rel => {
  const p = PAGES.find(x => x.file === rel);
  assert.ok(p, `falta ${rel}`);
  return p;
};

// ───────────────────────── compilador MDX ─────────────────────────

let compileMdx = null;
try {
  const { compile } = await import('@mdx-js/mdx');
  const { default: remarkGfm } = await import('remark-gfm');
  compileMdx = src => compile(src, { remarkPlugins: [remarkGfm], development: false });
} catch (e) {
  console.warn('# @mdx-js/mdx no disponible; se omite la compilación:', e.message);
}
let validatePage = null;
try {
  ({ validatePage } = await import('../../server/routes/validate.mjs'));
} catch {
  /* el validador del servidor es opcional en estas pruebas */
}
async function assertCompiles(body, label) {
  if (compileMdx) {
    try {
      await compileMdx(body);
    } catch (e) {
      assert.fail(`${label}: no compila: ${e.message}\n---\n${body.slice(0, 2000)}`);
    }
  }
  if (validatePage) {
    const r = await validatePage({ body, frontmatter: undefined }, { assetExists: async () => true });
    const errs = r.problems.filter(p => p.level === 'error');
    assert.deepEqual(errs, [], `${label}: el validador del portal da errores`);
  }
}

const markAllDirty = blocks => blocks.map(b => ({ ...b, dirty: true }));
const byType = (blocks, t) => blocks.filter(b => b.type === t);

// ───────────────────────── 1. ida y vuelta ─────────────────────────

test(`ida y vuelta byte a byte de las ${PAGES.length} páginas de docs/ (cuerpo y archivo completo)`, { skip }, () => {
  assert.ok(PAGES.length >= 285, `se esperaban ≥285 páginas, hay ${PAGES.length}`);
  let okBody = 0;
  let okFull = 0;
  const fails = [];
  for (const p of PAGES) {
    if (serializeBlocks(parseMdx(p.body)) === p.body) okBody++;
    else fails.push(p.file);
    if (serializeBlocks(parseMdx(p.src)) === p.src) okFull++;
    else fails.push(`${p.file} (completo)`);
  }
  console.log(`# ida y vuelta: cuerpos ${okBody}/${PAGES.length}, archivos completos ${okFull}/${PAGES.length}`);
  assert.deepEqual(fails, []);
});

test('regenerar TODOS los bloques desde sus campos reproduce cada página (los tipos no pierden nada)', { skip }, () => {
  const fails = [];
  for (const p of PAGES) if (serializeBlocks(markAllDirty(parseMdx(p.body))) !== p.body) fails.push(p.file);
  assert.deepEqual(fails, []);
});

test('distribución de tipos: raw < 10 % de los bloques', { skip }, () => {
  const counts = {};
  let total = 0;
  for (const p of PAGES)
    for (const b of parseMdx(p.body)) {
      counts[b.type] = (counts[b.type] ?? 0) + 1;
      total++;
    }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log(`# bloques: ${total} en ${PAGES.length} páginas`);
  for (const [k, v] of rows) console.log(`#   ${k.padEnd(12)} ${String(v).padStart(5)}  ${((100 * v) / total).toFixed(2)} %`);
  const raw = counts.raw ?? 0;
  assert.ok(raw / total < 0.1, `raw = ${raw}/${total}`);
});

test('ida y vuelta con CRLF, sin salto final, vacío y solo blancos', { skip }, () => {
  const base = page('docs/tareas/clientes/suspender-un-servicio.mdx').body;
  const crlf = base.replace(/\n/g, '\r\n');
  assert.equal(serializeBlocks(parseMdx(crlf)), crlf);
  assert.equal(serializeBlocks(markAllDirty(parseMdx(crlf))), crlf);
  const noFinal = base.replace(/\n+$/, '');
  assert.equal(serializeBlocks(parseMdx(noFinal)), noFinal);
  assert.deepEqual(parseMdx(''), []);
  assert.equal(serializeBlocks([]), '');
  for (const s of ['\n', '\n\n  \n', '\r\n']) assert.equal(serializeBlocks(parseMdx(s)), s);
  // Una edición en un documento CRLF sale en CRLF.
  const blocks = parseMdx(crlf);
  const steps = byType(blocks, 'steps')[0];
  const edited = serializeBlocks(updateBlock(blocks, steps.id, { steps: [...steps.steps, { title: '', md: 'Paso\nnuevo.' }] }));
  assert.ok(!/[^\r]\n/.test(edited), 'quedó algún LF suelto');
  assert.ok(edited.includes('<Step>\r\n\r\nPaso\r\nnuevo.\r\n\r\n</Step>\r\n</Steps>'));
});

const SYNTH = [
  'import X from "./x"\nexport const y = 1\n\n# Título\n',
  '## A\nTexto pegado al título.\n- lista pegada\n- dos\n\nFin',
  '<Steps>\n<Step>\n\n```bash\n</Step>\n```\n\n</Step>\n</Steps>\n',
  ':::tip Con código\n\n````md\n```js\n:::\n```\n````\n\n:::\n',
  '- uno\n  - anidado\n    1. más\n\n- dos\n\n  continuación\n\n- tres\n',
  '1. a\n1. b\n1. c\n',
  '- tight\n- mixed\n\n- loose\n',
  '<div class="x">\n\nhtml\n\n</div>\n\n<details>\n<summary>S</summary>\nX\n</details>\n',
  '<Figure\n  src="/assets/imgs/a.webp"\n  alt="multi"\n/>\n\n<Figure src="/a.webp" alt={"con \\"comillas\\""} />\n',
  '{/* comentario */}\n\n<!-- html -->\n\n> cita\n> dos\n\n---\n\n***\n',
  '| a | b |\n|---|:-:|\n| `x|y` | 2 |\nTexto lazy\n\nSetext\n===\n',
  '<Cards>\n<Card title="Sin columnas">\n\nX\n\n</Card>\n</Cards>\n<FigGrid>\n<Figure src="/a.webp" />\n</FigGrid>\n',
  '<Kicker>K</Kicker>\n<Lead>L con <Badge type="tip">B</Badge></Lead>\n<Tour id="demo" />\n<SearchTerms terms="a b" />',
  '   \n\t\nTexto con espacios iniciales\n\n\n\n',
  '<Steps>\n<Step>sin blancos</Step>\n</Steps>\n\n<Unclosed>\n\ntexto\n',
];

test('ida y vuelta de construcciones sintéticas (vallas anidadas, listas anidadas, HTML, ESM, JSX multilínea…)', () => {
  for (const s of SYNTH) {
    assert.equal(serializeBlocks(parseMdx(s)), s, JSON.stringify(s));
    assert.equal(serializeBlocks(markAllDirty(parseMdx(s))), s, `dirty: ${JSON.stringify(s)}`);
    const crlf = s.replace(/\n/g, '\r\n');
    assert.equal(serializeBlocks(parseMdx(crlf)), crlf, `crlf: ${JSON.stringify(s)}`);
  }
  const synth = start => SYNTH.find(s => s.startsWith(start));
  // Algunos se reconocen:
  const t = parseMdx(synth('<Kicker>')).map(b => b.type);
  assert.deepEqual(t, ['kicker', 'lead', 'tour', 'searchTerms']);
  const nested = parseMdx(synth('- uno'));
  assert.equal(nested.length, 1);
  assert.equal(nested[0].type, 'list');
  assert.equal(nested[0].loose, true);
  assert.equal(nested[0].items[0], 'uno\n- anidado\n  1. más');
  assert.equal(parseMdx(synth('- tight'))[0].type, 'raw', 'lista con separación mixta: se conserva tal cual');
  assert.equal(parseMdx(synth('1. a'))[0].type, 'raw', 'numeración 1. 1. 1.: se conserva tal cual');
  const fig = parseMdx(synth('<Figure\n'));
  assert.equal(fig[0].type, 'raw'); // multilínea: no es el estilo del manual → se conserva
  assert.equal(fig[1].type, 'image');
  assert.equal(fig[1].alt, 'con "comillas"');
  const code = parseMdx(synth(':::tip Con código'));
  assert.equal(code.length, 1, 'la valla interior no cierra el aviso');
  assert.equal(code[0].type, 'callout');
  const steps = parseMdx(synth('<Steps>\n<Step>\n\n```'));
  assert.equal(steps.length, 1, 'un </Step> dentro de una valla no cierra el paso');
  assert.equal(steps[0].type, 'steps');
  assert.equal(steps[0].steps[0].md, '```bash\n</Step>\n```');
});

// ───────────────────────── 2. reconocimiento en páginas reales ─────────────────────────

test('suspender-un-servicio: tipos y campos', { skip }, () => {
  const blocks = parseMdx(page('docs/tareas/clientes/suspender-un-servicio.mdx').body);
  assert.deepEqual(blocks.slice(0, 4).map(b => b.type), ['kicker', 'heading', 'lead', 'image']);
  const [kicker, h1, , img] = blocks;
  assert.equal(kicker.text, 'Quiero hacer… · Clientes');
  assert.equal(h1.level, 1);
  assert.equal(h1.text, 'Suspender un servicio');
  assert.deepEqual(
    { src: img.src, width: img.width, height: img.height, max: img.max, variant: img.variant },
    { src: '/assets/imgs/clientes/listado/01-listado.webp', width: 1440, height: 900, max: '1100px', variant: '' },
  );
  const steps = byType(blocks, 'steps');
  assert.equal(steps.length, 2);
  assert.equal(steps[0].steps.length, 3);
  assert.match(steps[0].steps[1].md, /^En la columna \*\*Acciones\*\*/);
  const warn = byType(blocks, 'callout')[0];
  assert.deepEqual([warn.kind, warn.title, warn.padded], ['warning', 'Importante', false]);
  assert.equal(byType(blocks, 'table').length, 1);
  assert.equal(byType(blocks, 'searchTerms').length, 1);
  assert.ok(blocks.every(b => !b.dirty && typeof b.id === 'string'));
  assert.equal(new Set(blocks.map(b => b.id)).size, blocks.length, 'ids únicos');
});

test('tarjetas, fila de imágenes y preguntas desplegables', { skip }, () => {
  const inicio = parseMdx(page('docs/guia/inicio.mdx').body);
  const cards = byType(inicio, 'cards')[0];
  assert.equal(cards.columns, 2);
  assert.deepEqual({ ...cards.cards[0], md: undefined }, { icon: '🚀', title: '1 · Introducción y acceso', href: '/guia/primeros-pasos', md: undefined });
  const mapa = parseMdx(page('docs/guia/mapa.mdx').body);
  const row = byType(mapa, 'imageRow')[0];
  assert.equal(row.kind, 'row');
  assert.equal(row.images.length, 2);
  assert.equal(row.images[0].variant, 'compact');
  const faq = PAGES.filter(p => p.file.startsWith('docs/preguntas/')).flatMap(p => byType(parseMdx(p.body), 'callout'));
  assert.ok(faq.some(c => c.kind === 'details' && c.title.length > 3));
});

test('los ids son estables: se conservan al editar, mover y convertir', { skip }, () => {
  const blocks = parseMdx(page('docs/guia/carga.mdx').body);
  const h = byType(blocks, 'heading')[1];
  const a = updateBlock(blocks, h.id, { text: 'Otro título' });
  const b = moveBlock(a, h.id, 0);
  const c = convertBlock(b, h.id, 'paragraph');
  assert.equal(c[0].id, h.id);
  assert.equal(c[0].type, 'paragraph');
  assert.equal(c[0].md, 'Otro título');
  // Inmutabilidad: el original no cambió.
  assert.equal(blocks.find(x => x.id === h.id).text, h.text);
  assert.equal(blocks.find(x => x.id === h.id).dirty, false);
});

// ───────────────────────── 3. ediciones ─────────────────────────

/** Diferencia mínima: devuelve [prefijo común, parte cambiada del original, parte nueva]. */
function diff(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  let j = 0;
  while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  return [a.slice(i, a.length - j), b.slice(i, b.length - j)];
}

test('editar un título solo cambia esa línea', { skip }, () => {
  const body = page('docs/tareas/clientes/suspender-un-servicio.mdx').body;
  const blocks = parseMdx(body);
  const h = blocks.find(b => b.type === 'heading' && b.text === 'Antes de empezar');
  const out = serializeBlocks(updateBlock(blocks, h.id, { text: 'Requisitos' }));
  assert.deepEqual(diff(body, out), ['Antes de empezar', 'Requisitos']);
  // Sin cambios reales no se marca como editado.
  assert.equal(updateBlock(blocks, h.id, { text: 'Antes de empezar' })[blocks.indexOf(h)].dirty, false);
});

test('ediciones por tipo producen la sintaxis del manual', () => {
  const cases = [
    [newBlock('heading', { level: 3, text: 'Desde el listado' }), '### Desde el listado'],
    [newBlock('paragraph', { md: 'Pulse **Guardar**.' }), 'Pulse **Guardar**.'],
    [newBlock('list', { items: ['uno', 'dos\ncon continuación'] }), '- uno\n- dos\n  con continuación'],
    [newBlock('list', { ordered: true, marker: '.', items: ['a', 'b'] }), '1. a\n2. b'],
    [
      newBlock('image', { src: '/assets/imgs/x/01-a.webp', alt: 'Alt', caption: 'Pie.', width: 800, height: 400, max: '600px' }),
      '<Figure src="/assets/imgs/x/01-a.webp" alt="Alt" caption="Pie." width={800} height={400} max="600px" />',
    ],
    [newBlock('image', { src: '/a.webp', caption: 'Dice "hola"' }), '<Figure src="/a.webp" caption={"Dice \\"hola\\""} />'],
    [
      newBlock('imageRow', { images: [{ src: '/a.webp', alt: 'A', caption: '', width: 300, height: 100, max: '300px', variant: 'compact' }] }),
      '<FigRow>\n<Figure src="/a.webp" alt="A" width={300} height={100} max="300px" variant="compact" />\n</FigRow>',
    ],
    [newBlock('steps', { steps: [{ title: '', md: 'Abra **Clientes**.' }, { title: 'Confirmar', md: 'Pulse **Si**.' }] }), '<Steps>\n<Step>\n\nAbra **Clientes**.\n\n</Step>\n<Step>\n\n**Confirmar**\n\nPulse **Si**.\n\n</Step>\n</Steps>'],
    [newBlock('callout', { kind: 'warning', md: 'Cuidado.' }), ':::warning Importante\n\nCuidado.\n\n:::'],
    [newBlock('callout', { kind: 'details', title: '¿Pregunta?', md: 'Respuesta.', padded: false }), ':::details ¿Pregunta?\nRespuesta.\n:::'],
    [newBlock('cards', { columns: 3, cards: [{ title: 'Cliente', href: '', icon: '', md: 'Persona.' }] }), '<Cards columns={3}>\n<Card title="Cliente">\n\nPersona.\n\n</Card>\n</Cards>'],
    [newBlock('table'), '| Columna | Descripción |\n|---|---|\n| Valor | Qué significa |'],
    [newBlock('code', { lang: 'bash', code: 'npm run build' }), '```bash\nnpm run build\n```'],
    [newBlock('code', { code: 'a\n```\nb' }), '````\na\n```\nb\n````'],
    [newBlock('kicker', { text: 'Quiero hacer… · Red' }), '<Kicker>Quiero hacer… · Red</Kicker>'],
    [newBlock('lead', { text: 'Una frase.' }), '<Lead>Una frase.</Lead>'],
    [newBlock('divider'), '---'],
    [newBlock('tour', { slug: 'crear-cliente' }), '<Tour id="crear-cliente" />'],
    [newBlock('searchTerms', { terms: 'cortar servicio' }), '<SearchTerms terms="cortar servicio" />'],
    [newBlock('raw', { code: '<Callout type="tip">x</Callout>' }), '<Callout type="tip">x</Callout>'],
  ];
  for (const [b, expected] of cases) {
    assert.equal(renderBlock(b), expected, b.type);
    // Lo generado se vuelve a leer como el mismo tipo (salvo el raw y la figura con comillas, que se leen igual).
    const back = parseMdx(expected);
    assert.equal(back.length, 1, `${b.type} → un bloque`);
    if (b.type !== 'raw') assert.equal(back[0].type, b.type, `${b.type} se relee como ${back[0].type}`);
  }
  // Todos los tipos insertables tienen un valor por defecto que compila y se relee como su tipo.
  for (const info of BLOCK_TYPES) {
    const b = newBlock(info.type);
    const back = parseMdx(renderBlock(b));
    if (info.type !== 'raw') assert.equal(back[0]?.type, info.type, `por defecto: ${info.type}`);
  }
});

test('texto peligroso para MDX se escapa al regenerar (<texto> y {llaves} sueltos)', async () => {
  assert.equal(escapeMdxText('Use <nombre> y {id} pero no `<x>` ni <Badge type="tip">B</Badge> ni <br/> ni \\{ya}'), 'Use \\<nombre> y \\{id\\} pero no `<x>` ni <Badge type="tip">B</Badge> ni <br/> ni \\{ya\\}');
  assert.equal(escapeMdxText(escapeMdxText('a {b} <c>')), escapeMdxText('a {b} <c>'), 'idempotente');
  assert.equal(escapeMdxText('<https://ejemplo.invalid> a < b'), '<https://ejemplo.invalid> a \\< b');
  const blocks = [
    newBlock('heading', { text: 'Campo {x} y <valor>' }),
    newBlock('paragraph', { md: 'Escriba <usuario> en {campo}.\n\n```\n<sin> {escape}\n```' }),
    newBlock('callout', { kind: 'tip', title: 'Use <ip>', md: 'x {y}' }),
    newBlock('steps', { steps: [{ title: '<a>', md: '{b}' }] }),
    newBlock('lead', { text: 'lead {z}' }),
  ];
  const out = serializeBlocks(blocks);
  assert.ok(out.includes('```\n<sin> {escape}\n```'), 'el código no se toca');
  await assertCompiles(out, 'texto peligroso');
});

test('mover, insertar, duplicar, quitar y convertir: MDX válido y separado por líneas en blanco', { skip }, async () => {
  const body = page('docs/tareas/clientes/suspender-un-servicio.mdx').body;
  let blocks = parseMdx(body);
  const firstSteps = byType(blocks, 'steps')[0];
  // Mover un paso dentro del bloque de pasos.
  blocks = updateBlock(blocks, firstSteps.id, { steps: moveItem(firstSteps.steps, 2, 0) });
  // Añadir una imagen a una fila nueva insertada tras la primera figura.
  const fig = byType(blocks, 'image')[0];
  blocks = convertBlock(blocks, fig.id, 'imageRow');
  const row = blocks.find(b => b.id === fig.id);
  blocks = updateBlock(blocks, fig.id, { images: insertItem(row.images, 1, { ...row.images[0], src: '/assets/imgs/clientes/listado/02-otra.webp', max: '540px' }) });
  // Convertir un párrafo en aviso.
  const para = byType(blocks, 'paragraph')[0];
  blocks = convertBlock(blocks, para.id, 'callout');
  // Mover el aviso al final, duplicar la tabla, quitar el kicker, insertar un tour al principio.
  blocks = moveBlock(blocks, para.id, blocks.length);
  blocks = duplicateBlock(blocks, byType(blocks, 'table')[0].id);
  blocks = removeBlock(blocks, blocks[0].id);
  blocks = insertBlock(blocks, 0, newBlock('tour', { slug: 'suspender' }));
  const out = serializeBlocks(blocks);
  assert.ok(out.startsWith('\n<Tour id="suspender" />\n\n# Suspender un servicio\n'), 'el blanco inicial se conserva y el tour va primero');
  assert.ok(out.includes('<Step>\n\nConfirme en el diálogo'), 'el paso movido quedó primero');
  assert.match(out, /<FigRow>\n<Figure src="\/assets\/imgs\/clientes\/listado\/01-listado\.webp"[^\n]*\/>\n<Figure src="[^"]*02-otra\.webp"[^\n]*max="540px" \/>\n<\/FigRow>/);
  assert.match(out, /:::tip Nota\n\n① \*\*Por Router\*\*[\s\S]*\n\n:::\n$/);
  assert.equal(out.split('| Síntoma | Causa y solución |').length, 3, 'tabla duplicada');
  assert.ok(!/\n\n\n/.test(out.replace(/\n{3,}/g, m => (body.includes(m) ? '\n\n' : m))), 'sin saltos de línea de más');
  // Tras todas las ediciones se vuelve a analizar en los mismos tipos y la ida y vuelta sigue siendo exacta.
  const again = parseMdx(out);
  assert.equal(serializeBlocks(again), out);
  assert.equal(byType(again, 'imageRow').length, 1);
  await assertCompiles(out, 'suspender editado');
});

test('vecinos sin línea en blanco: se conservan sin editar y se separan al mover', () => {
  const src = '## A\nTexto pegado.\n- uno\n- dos\n';
  const blocks = parseMdx(src);
  assert.deepEqual(blocks.map(b => b.type), ['heading', 'paragraph', 'list']);
  assert.equal(serializeBlocks(blocks), src);
  assert.equal(serializeBlocks(moveBlock(blocks, blocks[2].id, 0)), '- uno\n- dos\n\n## A\nTexto pegado.\n');
  assert.equal(serializeBlocks(updateBlock(blocks, blocks[0].id, { text: 'B' })), '## B\nTexto pegado.\n- uno\n- dos\n');
  assert.equal(serializeBlocks(convertBlock(blocks, blocks[1].id, 'callout')), '## A\n\n:::tip Nota\n\nTexto pegado.\n\n:::\n\n- uno\n- dos\n');
  assert.equal(serializeBlocks(insertBlock(blocks, 3, newBlock('divider'))), '## A\nTexto pegado.\n- uno\n- dos\n\n---\n');
});

test('convertBlock: destinos y contenido', { skip }, () => {
  const [p] = parseMdx('Primera línea\nsegunda línea\n');
  const blocks = [p];
  assert.ok(convertTargets(p).includes('callout'));
  const toList = convertBlock(blocks, p.id, 'list')[0];
  assert.deepEqual(toList.items, ['Primera línea', 'segunda línea']);
  const toSteps = convertBlock([toList], p.id, 'steps')[0];
  assert.deepEqual(toSteps.steps.map(s => s.md), ['Primera línea', 'segunda línea']);
  const backToList = convertBlock([toSteps], p.id, 'list')[0];
  assert.equal(backToList.ordered, true);
  assert.equal(renderBlock(backToList), '1. Primera línea\n2. segunda línea');
  const toCallout = convertBlock([backToList], p.id, 'callout')[0];
  assert.equal(renderBlock(toCallout), ':::tip Nota\n\n- Primera línea\n- segunda línea\n\n:::');
  const toHeading = convertBlock(blocks, p.id, 'heading')[0];
  assert.equal(renderBlock(toHeading), '## Primera línea');
  const toRaw = convertBlock(blocks, p.id, 'raw')[0];
  assert.equal(toRaw.code, 'Primera línea\nsegunda línea');
  // Destino no admitido: sin cambios.
  assert.equal(convertBlock(blocks, p.id, 'tour')[0], p);
  const row = parseMdx(page('docs/guia/mapa.mdx').body).find(b => b.type === 'imageRow');
  assert.deepEqual(convertTargets(row), ['raw'], 'una fila con 2 imágenes no se reduce a una');
});

test('reparseBlock: un raw editado vuelve a bloques con tipo', () => {
  const blocks = parseMdx('Intro\n\n{/* x */}\n\nFin\n');
  const raw = blocks[1];
  assert.equal(raw.type, 'raw');
  const edited = updateBlock(blocks, raw.id, { code: '## Nuevo\n\n:::tip Nota\nHola\n:::' });
  const re = reparseBlock(edited, raw.id);
  assert.deepEqual(re.map(b => b.type), ['paragraph', 'heading', 'callout', 'paragraph']);
  assert.equal(serializeBlocks(re), 'Intro\n\n## Nuevo\n\n:::tip Nota\nHola\n:::\n\nFin\n');
});

test('mapBlock y edición de tarjetas', { skip }, () => {
  const blocks = parseMdx(page('docs/guia/glosario.mdx').body);
  const cards = byType(blocks, 'cards')[0];
  const out = mapBlock(blocks, cards.id, b => ({ ...b, columns: 2, cards: b.cards.slice(0, 1) }));
  const text = serializeBlocks(out);
  assert.match(text, /<Cards columns=\{2\}>\n<Card title="Cliente">\n\nPersona o empresa[^\n]*\n\n<\/Card>\n<\/Cards>/);
});

test('imageFromAsset sigue la convención de tamaños del manual', () => {
  const img = imageFromAsset({ path: 'imgs/clientes/listado/01-listado.webp', width: 1440, height: 900, alt: 'Listado' });
  assert.equal(renderBlock(newBlock('image', img)), '<Figure src="/assets/imgs/clientes/listado/01-listado.webp" alt="Listado" width={1440} height={900} max="1100px" />');
  assert.equal(imageFromAsset({ path: '/assets/imgs/a.webp', width: 760, height: 254 }).max, '760px');
});

// ───────────────────────── 4. esquema ─────────────────────────

test('outline: encabezados, niveles, anclas y repetidos', { skip }, () => {
  const blocks = parseMdx(page('docs/tareas/clientes/suspender-un-servicio.mdx').body);
  const o = outline(blocks, { minLevel: 2, maxLevel: 3 });
  assert.deepEqual(
    o.map(x => [x.level, x.label, x.slug]),
    [
      [2, 'Antes de empezar', 'antes-de-empezar'],
      [2, 'Pasos', 'pasos'],
      [3, 'Desde el listado', 'desde-el-listado'],
      [3, 'Desde el perfil del cliente', 'desde-el-perfil-del-cliente'],
      [2, 'Qué esperar', 'qué-esperar'],
      [2, 'Si algo falla', 'si-algo-falla'],
      [2, 'Relacionado', 'relacionado'],
    ],
  );
  assert.equal(o[0].blockId, blocks[o[0].index].id);
  const dup = outline(parseMdx('## Pasos\n\n## Pasos\n\n{/* x */}\n### `Código` <Badge type="tip">B</Badge>\n'));
  assert.deepEqual(dup.map(x => x.slug), ['pasos', 'pasos-1', 'código-b']);
  assert.equal(dup[2].inRaw, true);
  assert.equal(dup[2].label, 'Código B');
});

// ───────────────────────── 5. tablas ─────────────────────────

test('parseTable / buildTable', { skip }, () => {
  const t = parseTable('| Síntoma | Causa |\n|---|:--:|\n| `a\\|b` | x \\| y |\n| solo |');
  assert.deepEqual(t, { header: ['Síntoma', 'Causa'], align: [null, 'center'], rows: [['`a\\|b`', 'x \\| y'], ['solo', '']] });
  assert.equal(buildTable(t), '| Síntoma | Causa |\n|---|:---:|\n| `a\\|b` | x \\| y |\n| solo |  |');
  assert.equal(buildTable({ header: ['A'], align: [], rows: [['x|y\nz']] }), '| A |\n|---|\n| x\\|y<br/>z |');
  assert.equal(parseTable('texto'), null);
  // Las tablas reales se leen enteras.
  let n = 0;
  for (const p of PAGES) for (const b of byType(parseMdx(p.body), 'table')) if (parseTable(b.md)) n++;
  assert.ok(n > 600, `tablas legibles: ${n}`);
});

// ───────────────────────── 6. compilación MDX ─────────────────────────

test('compilan con @mdx-js/mdx las páginas tras ediciones de todo tipo (1 de cada 7 páginas)', { skip, timeout: 180000 }, async t => {
  if (!compileMdx) return t.skip('sin @mdx-js/mdx');
  const sample = PAGES.filter((_, i) => i % 7 === 0);
  let compiled = 0;
  for (const p of sample) {
    let blocks = parseMdx(p.body);
    if (!blocks.length) continue;
    // Base: la página original compila.
    await assertCompiles(p.body, `${p.file} (original)`);
    // 1) Todos los bloques regenerados.
    blocks = markAllDirty(blocks);
    // 2) Editar el primer título, el primer párrafo y el primer aviso; convertir un párrafo en aviso.
    const h = blocks.find(b => b.type === 'heading');
    if (h) blocks = updateBlock(blocks, h.id, { text: `${h.text} (editado)` });
    const para = blocks.find(b => b.type === 'paragraph');
    if (para) blocks = convertBlock(blocks, para.id, 'callout');
    const list = blocks.find(b => b.type === 'list');
    if (list) blocks = convertBlock(blocks, list.id, 'steps');
    const steps = blocks.find(b => b.type === 'steps');
    if (steps && steps.steps.length > 1) blocks = updateBlock(blocks, steps.id, { steps: moveItem(steps.steps, 0, steps.steps.length - 1) });
    // 3) Mover el último bloque al principio, duplicar uno del medio, insertar un bloque de cada tipo.
    blocks = moveBlock(blocks, blocks[blocks.length - 1].id, 0);
    blocks = duplicateBlock(blocks, blocks[Math.floor(blocks.length / 2)].id);
    for (const info of BLOCK_TYPES) if (info.type !== 'raw') blocks = insertBlock(blocks, Math.floor(blocks.length / 3), newBlock(info.type, info.type === 'tour' ? { slug: 'demo' } : {}));
    const out = serializeBlocks(blocks);
    await assertCompiles(out, `${p.file} (editada)`);
    assert.equal(serializeBlocks(parseMdx(out)), out, `${p.file}: ida y vuelta tras editar`);
    compiled++;
  }
  console.log(`# compiladas tras editar: ${compiled} páginas`);
  assert.ok(compiled >= 35);
});

test('compilan todas las páginas originales (línea base del compilador de las pruebas)', { skip, timeout: 300000 }, async t => {
  if (!compileMdx) return t.skip('sin @mdx-js/mdx');
  const fails = [];
  for (const p of PAGES) {
    try {
      await compileMdx(p.body);
    } catch (e) {
      fails.push(`${p.file}: ${e.message}`);
    }
  }
  assert.deepEqual(fails, []);
});
