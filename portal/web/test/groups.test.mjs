// Lógica pura de los grupos del menú: node --test portal/web/test/groups.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normGroupName, groupConflict, renameVerdict, deleteGroupLabel, EMPTY_GROUP_TEXT } from '../src/features/structure/groupModel.ts';

test('normGroupName: minúsculas, sin acentos ni emoji, espacios colapsados', () => {
  for (const v of ['inicio', 'INICIO', ' Inicio ', 'ínicio', '🚀 INICIO', '🚀  inicio']) assert.equal(normGroupName(v), 'inicio', v);
  assert.equal(normGroupName('Cobros  mensuales'), 'cobros mensuales');
  assert.equal(normGroupName('🚀'), '');
});

test('groupConflict: detecta el grupo casi igual e ignora al propio', () => {
  const names = ['🚀 INICIO', 'General', 'Cobros'];
  assert.equal(groupConflict(names, 'inicio'), '🚀 INICIO');
  assert.equal(groupConflict(names, 'COBROS '), 'Cobros');
  assert.equal(groupConflict(names, 'Nuevo'), null);
  assert.equal(groupConflict(names, 'cobros', 'Cobros'), null, 'cambiar la grafía del mismo grupo es válido');
  assert.equal(groupConflict(names, '   '), null);
});

test('renameVerdict: vacío, mismo, choque y válido', () => {
  const names = ['Alfa', 'Beta'];
  assert.deepEqual(renameVerdict(names, 'Alfa', '  '), { ok: false, reason: 'empty' });
  assert.deepEqual(renameVerdict(names, 'Alfa', null), { ok: false, reason: 'empty' });
  assert.deepEqual(renameVerdict(names, 'Alfa', 'Alfa'), { ok: false, reason: 'same' });
  assert.deepEqual(renameVerdict(names, 'Alfa', 'beta'), { ok: false, reason: 'conflict', existing: 'Beta' });
  assert.deepEqual(renameVerdict(names, 'Alfa', ' ALFA '), { ok: true, name: 'ALFA' });
  assert.deepEqual(renameVerdict(names, 'Alfa', 'Gamma'), { ok: true, name: 'Gamma' });
});

test('textos: eliminar grupo solo vacío; estado vacío discreto', () => {
  assert.equal(deleteGroupLabel(0), 'Eliminar grupo');
  assert.match(deleteGroupLabel(1), /tiene 1 página: muévalas antes/);
  assert.match(deleteGroupLabel(3), /tiene 3 páginas/);
  assert.match(EMPTY_GROUP_TEXT, /Sin páginas/);
});
