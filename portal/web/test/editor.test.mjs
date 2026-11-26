// Pruebas de la lógica pura del constructor por bloques (portal/web/src/features/editor/model).
//   node --test portal/web/test/editor.test.mjs
// Lee las páginas reales del corpus (repo o paquete .ispmax; portal/test/helpers/corpus.mjs) en solo lectura para comprobar la garantía de no destrucción y el mapa de líneas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { getCorpus, corpusSkip } from '../../test/helpers/corpus.mjs';
import { parseMdx, serializeBlocks, newBlock, insertBlock, updateBlock, blockText } from '../src/lib/blocks/index.ts';
import { initHistory, pushHistory, undo, redo, canUndo, canRedo, breakMerge } from '../src/features/editor/model/history.ts';
import { docText, savedBlocks, isBlankBlock, blockLines, blockAtLine, roundTripOk, problemsByBlock, INSERT_COMMANDS, blockFromCommand, syncIds } from '../src/features/editor/model/doc.ts';
import { wrapSelection, linkSelection, slashQuery, splitAt, caretOnFirstLine, caretOnLastLine } from '../src/features/editor/model/text.ts';
import { tokenizeInline, inlineText } from '../src/features/editor/model/inline.ts';

const CORPUS = getCorpus();
const skip = corpusSkip; // sin repo ni paquete .ispmax estas pruebas se saltan con el motivo (portal/test/README.md)
function* mdxFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* mdxFiles(p);
    else if (e.name.endsWith('.mdx')) yield p;
  }
}
const bodyOf = (src) => { const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(src); return m ? src.slice(m[0].length) : src; };
const pages = (CORPUS.available ? [...mdxFiles(CORPUS.docsDir)] : []).map((f) => ({ f, body: bodyOf(readFileSync(f, 'utf8')) }));

test('historial: fundir tecleo, deshacer y rehacer', () => {
  let h = initHistory('a');
  h = pushHistory(h, 'ab', { key: 'p1', now: 1000 });
  h = pushHistory(h, 'abc', { key: 'p1', now: 1500 });
  assert.equal(h.past.length, 1, 'misma clave dentro de la ventana: una sola entrada');
  h = pushHistory(h, 'abcd', { key: 'p1', now: 5000 });
  assert.equal(h.past.length, 2, 'fuera de la ventana: entrada nueva');
  h = pushHistory(h, 'X', { key: 'p2', now: 5100 });
  assert.equal(h.past.length, 3);
  h = undo(h); assert.equal(h.present, 'abcd');
  h = undo(h); assert.equal(h.present, 'abc');
  assert.ok(canRedo(h));
  h = redo(h); assert.equal(h.present, 'abcd');
  h = pushHistory(h, 'nuevo', { now: 6000 });
  assert.equal(canRedo(h), false, 'editar tras deshacer borra el futuro');
  assert.equal(pushHistory(h, h.present), h, 'sin cambio no hay entrada');
  let g = initHistory(0);
  for (let i = 1; i <= 10; i++) g = pushHistory(g, i, { limit: 3 });
  assert.equal(g.past.length, 3);
  g = pushHistory(breakMerge(pushHistory(initHistory(0), 1, { key: 'k', now: 1 })), 2, { key: 'k', now: 2 });
  assert.equal(g.past.length, 2, 'breakMerge corta la fusión');
  assert.ok(canUndo(g));
});

test('no destrucción: abrir y guardar sin tocar deja el cuerpo idéntico en todas las páginas de docs/', { skip }, () => {
  assert.ok(pages.length >= 280, `páginas leídas: ${pages.length}`);
  const bad = pages.filter((p) => !roundTripOk(p.body) || docText(parseMdx(p.body)) !== p.body).map((p) => p.f);
  assert.deepEqual(bad, []);
});

test('blockLines: cada bloque empieza en la línea correcta de docText', { skip }, () => {
  for (const { f, body } of pages) {
    const blocks = parseMdx(body);
    const lines = body.split('\n');
    for (const l of blockLines(blocks)) {
      const b = blocks.find((x) => x.id === l.id);
      const first = blockText(b).split(/\r?\n/)[0];
      assert.equal(lines[l.start - 1].replace(/\r$/, ''), first, `${f} línea ${l.start}`);
      assert.equal(l.end - l.start, blockText(b).split('\n').length - 1);
    }
  }
});

test('blockLines y blockAtLine con bloques editados y vacíos', () => {
  let blocks = parseMdx('## A\n\nuno\n\n## B\n\ndos\n');
  const blank = newBlock('paragraph', { md: '' });
  blocks = insertBlock(blocks, 1, blank);
  assert.ok(isBlankBlock(blank));
  assert.equal(savedBlocks(blocks).length, 4);
  assert.equal(docText(blocks), '## A\n\nuno\n\n## B\n\ndos\n', 'el párrafo vacío no se escribe');
  blocks = updateBlock(blocks, blocks[2].id, { md: 'uno\ndos\ntres' });
  const text = docText(blocks);
  const ls = blockLines(blocks);
  assert.deepEqual(ls.map((l) => [l.start, l.end]), [[1, 1], [3, 5], [7, 7], [9, 9]]);
  assert.equal(text.split('\n')[6], '## B');
  assert.equal(blockAtLine(ls, 4), blocks[2].id);
  assert.equal(blockAtLine(ls, 6), blocks[2].id, 'línea en blanco: bloque anterior');
  assert.equal(blockAtLine(ls, 9), blocks[4].id);
  const pm = problemsByBlock(blocks, [{ level: 'error', message: 'x', line: 8 }, { level: 'warn', message: 'y' }]);
  assert.deepEqual([...pm.keys()], [blocks[3].id]);
});

test('el blanco inicial del documento se conserva aunque el primer bloque quede vacío', () => {
  let blocks = parseMdx('\nHola\n');
  blocks = updateBlock(blocks, blocks[0].id, { md: '' });
  blocks = insertBlock(blocks, 1, newBlock('paragraph', { md: 'Nuevo' }));
  assert.equal(docText(blocks), '\nNuevo\n');
});

test('comandos de inserción: bloques válidos y vacíos los de texto', () => {
  const ids = new Set(INSERT_COMMANDS.map((c) => c.id));
  assert.equal(ids.size, INSERT_COMMANDS.length);
  for (const t of ['heading2', 'heading3', 'paragraph', 'steps', 'warning', 'details', 'imageGrid', 'tour']) assert.ok(ids.has(t), t);
  for (const c of INSERT_COMMANDS) {
    const b = blockFromCommand(c);
    assert.equal(b.type, c.type);
    assert.ok(b.dirty);
    const out = serializeBlocks([b]);
    assert.equal(typeof out, 'string');
  }
  const h3 = blockFromCommand(INSERT_COMMANDS.find((c) => c.id === 'heading3'));
  assert.equal(h3.level, 3);
  assert.equal(docText([h3]), '', 'título sin texto no se escribe');
  const w = blockFromCommand(INSERT_COMMANDS.find((c) => c.id === 'warning'));
  assert.equal(serializeBlocks([updateBlock([w], w.id, { md: 'Cuidado.' })[0]]), ':::warning Importante\n\nCuidado.\n\n:::\n');
  const g = blockFromCommand(INSERT_COMMANDS.find((c) => c.id === 'imageGrid'));
  assert.equal(g.kind, 'grid');
  assert.deepEqual(g.images, []);
});

test('syncIds conserva las claves existentes', () => {
  let n = 0;
  const mk = () => `k${++n}`;
  const a = syncIds([], 3, mk);
  assert.deepEqual(a, ['k1', 'k2', 'k3']);
  assert.deepEqual(syncIds(a, 2, mk), ['k1', 'k2']);
  assert.deepEqual(syncIds(a, 4, mk), ['k1', 'k2', 'k3', 'k4']);
});

test('formato de la selección', () => {
  assert.deepEqual(wrapSelection('hola mundo', 5, 10, '**'), { value: 'hola **mundo**', start: 7, end: 12 });
  assert.deepEqual(wrapSelection('hola **mundo**', 7, 12, '**'), { value: 'hola mundo', start: 5, end: 10 }, 'quita si ya está');
  assert.deepEqual(wrapSelection('hola **mundo**', 5, 14, '**'), { value: 'hola mundo', start: 5, end: 10 }, 'quita si la selección incluye las marcas');
  assert.deepEqual(wrapSelection('a b', 1, 1, '`', '`', 'código'), { value: 'a`código` b', start: 2, end: 8 });
  assert.equal(wrapSelection('pulse Guardar ', 6, 14, '**').value, 'pulse **Guardar** ', 'espacios fuera de las marcas');
  const l = linkSelection('ver clientes', 4, 12);
  assert.equal(l.value, 'ver [clientes](/ruta)');
  assert.equal(l.value.slice(l.start, l.end), '/ruta');
});

test('menú «/», corte con Intro y cursor', () => {
  assert.equal(slashQuery('/'), '');
  assert.equal(slashQuery('/avi'), 'avi');
  assert.equal(slashQuery('texto /avi'), null);
  assert.equal(slashQuery('/a b'), null);
  assert.equal(slashQuery(''), null);
  assert.deepEqual(splitAt('Hola mundo', 4), ['Hola', 'mundo']);
  assert.deepEqual(splitAt('Hola', 4), ['Hola', '']);
  assert.ok(caretOnFirstLine('a\nb', 1));
  assert.ok(!caretOnFirstLine('a\nb', 3));
  assert.ok(caretOnLastLine('a\nb', 3));
});

test('Markdown en línea', { skip }, () => {
  const n = tokenizeInline('Pulse **Guardar** y *luego* `F5`. Ver [clientes](/guia/clientes) <Badge tone="ok">Activo</Badge>\\{x\\}<br/>fin');
  assert.deepEqual(n.map((x) => x.t), ['text', 'strong', 'text', 'em', 'text', 'code', 'text', 'link', 'text', 'tag', 'text', 'br', 'text']);
  assert.equal(n[7].href, '/guia/clientes');
  assert.equal(n[9].name, 'Badge');
  assert.equal(n[9].attrs.tone, 'ok');
  assert.equal(n[10].v, '{x}');
  assert.equal(inlineText(n), 'Pulse Guardar y luego F5. Ver clientes Activo{x} fin');
  assert.deepEqual(tokenizeInline('2 * 3 * 4').map((x) => x.t), ['text'], 'asteriscos sueltos no son cursiva');
  assert.deepEqual(tokenizeInline('snake_case_name').map((x) => x.t), ['text'], 'guiones bajos dentro de palabras');
  assert.deepEqual(tokenizeInline('**sin cerrar').map((x) => x.t), ['text']);
  assert.equal(inlineText(tokenizeInline('a **b `c**` d** e')), 'a b c** d e');
  // Todas las líneas de texto de docs/ se pintan sin perder letras visibles (no lanza y devuelve algo).
  for (const { body } of pages.slice(0, 60)) for (const l of body.split('\n')) assert.ok(Array.isArray(tokenizeInline(l)));
});

// ── Paleta de bloques y tour desde una imagen ──
import { PALETTE_GROUPS, paletteSections, dropIndex, slugCandidates, tourImagePath } from '../src/features/editor/model/palette.ts';

test('paleta: todas las categorías con comandos existentes y buscador sin tildes', () => {
  const all = paletteSections('');
  assert.deepEqual(all.map((s) => s.group.label), ['Texto', 'Medios', 'Estructura', 'Destacados', 'Avanzado']);
  const ids = new Set(INSERT_COMMANDS.map((c) => c.id));
  for (const g of PALETTE_GROUPS) for (const id of g.ids) assert.ok(ids.has(id), id);
  assert.equal(all.reduce((n, s) => n + s.items.length, 0), PALETTE_GROUPS.reduce((n, g) => n + g.ids.length, 0));
  assert.deepEqual(paletteSections('cuadrícula').flatMap((s) => s.items.map((i) => i.id)), ['imageGrid']);
  assert.ok(paletteSections('CONSEJO').flatMap((s) => s.items.map((i) => i.id)).includes('tip'));
  assert.deepEqual(paletteSections('zzz-nada'), []);
});
test('dropIndex: antes del primer punto medio por debajo', () => {
  const mids = [50, 150, 300];
  assert.equal(dropIndex(mids, 10), 0);
  assert.equal(dropIndex(mids, 100), 1);
  assert.equal(dropIndex(mids, 299), 2);
  assert.equal(dropIndex(mids, 900), 3);
  assert.equal(dropIndex([], 5), 0);
});
test('slugCandidates y tourImagePath', () => {
  assert.deepEqual(slugCandidates('Crear un cliente nuevo', 3), ['crear-un-cliente-nuevo', 'crear-un-cliente-nuevo-2', 'crear-un-cliente-nuevo-3']);
  assert.equal(slugCandidates('¿?', 1)[0], 'tour');
  assert.ok(slugCandidates('x'.repeat(200))[19].length <= 60);
  assert.equal(tourImagePath('/assets/imgs/clientes/01-a.webp'), 'imgs/clientes/01-a.webp');
  assert.equal(tourImagePath('https://example.invalid/a.png'), null);
  assert.equal(tourImagePath('/assets/../x.png'), null);
  assert.equal(tourImagePath(''), null);
});
test('imagen, fila y tour sin elegir no se escriben; con dato sí', () => {
  for (const id of ['image', 'imageRow', 'imageGrid', 'tour']) assert.equal(docText([blockFromCommand(INSERT_COMMANDS.find((c) => c.id === id))]), '', id);
  assert.equal(docText([newBlock('tour', { slug: 'crear-cliente' })]), '<Tour id="crear-cliente" />\n');
  assert.equal(docText(parseMdx('<Tour id="" />\n')), '<Tour id="" />\n', 'lo existente se conserva');
});
