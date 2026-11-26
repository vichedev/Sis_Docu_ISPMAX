// Pruebas de la lógica pura de tours: node --test portal/web/test/tours.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTour, slugify, splitBold, move, freeSlug, spotIssue, toEdit, toApi, cloneStep, signature } from '../src/features/tours/tourModel.ts';

const ok = { image: 'imgs/a.webp', alt: '', title: 'T', text: 'x', spot: { x: 10, y: 10, w: 20, h: 20 }, link: null };

test('slugify', () => {
  assert.equal(slugify('Cómo crear un cliente!'), 'como-crear-un-cliente');
  assert.equal(slugify('  --Hola__Mundo  '), 'hola-mundo');
  assert.equal(slugify('¿¿??'), '');
});
test('validateTour: vacío y paso incompleto', () => {
  assert.equal(validateTour([]).length, 1);
  const i = validateTour([ok, { ...ok, image: '', title: ' ', text: '' }]);
  assert.deepEqual(i.map((x) => [x.step, x.field]), [[1, 'image'], [1, 'title'], [1, 'text']]);
  assert.deepEqual(validateTour([ok]), []);
});
test('validateTour: recuadro, enlace e imagen desconocida', () => {
  assert.equal(validateTour([{ ...ok, spot: { x: 90, y: 0, w: 20, h: 5 } }])[0].field, 'spot');
  assert.equal(spotIssue({ x: 0, y: 0, w: 0, h: 5 }) !== null, true);
  assert.equal(spotIssue(null), null);
  assert.equal(validateTour([{ ...ok, link: { label: 'a', route: 'x' } }])[0].field, 'link');
  assert.equal(validateTour([{ ...ok, link: { label: 'a', route: '/a/b' } }]).length, 0);
  assert.equal(validateTour([ok], new Set()).length, 1);
});
test('splitBold', () => {
  assert.deepEqual(splitBold('Pulse **Guardar** ya'), [{ bold: false, text: 'Pulse ' }, { bold: true, text: 'Guardar' }, { bold: false, text: ' ya' }]);
  assert.deepEqual(splitBold('**solo'), [{ bold: false, text: '**solo' }]);
});
test('move, freeSlug, edición', () => {
  assert.deepEqual(move([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(move([1, 2], 5, 0), [1, 2]);
  assert.equal(freeSlug('Mi Tour', new Set(['mi-tour-copia'])), 'mi-tour-copia-2');
  const e = toEdit([ok, ok]);
  assert.notEqual(e[0].key, e[1].key);
  assert.deepEqual(toApi(e), [ok, ok]);
  const c = cloneStep(e[0]);
  c.spot.x = 99;
  assert.equal(e[0].spot.x, 10);
  assert.equal(signature('a', 'b', e), signature('a', 'b', toEdit([ok, ok])));
});
