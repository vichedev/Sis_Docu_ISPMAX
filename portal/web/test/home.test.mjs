// Pruebas de la lógica pura del Inicio: node --test portal/web/test/home.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attentionItems, sectionOverview, greeting, daysSince, actionText, shownTarget, BACKUP_MAX_DAYS } from '../src/features/dashboard/homeModel.ts';

const NOW = Date.parse('2026-11-25T12:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();
const ids = (l) => l.map((x) => x.id);
const base = { now: NOW, drafts: 0, toursDraft: 0, site: { state: 'idle', siteExists: true, autoPublish: true }, behind: 0, needsRestart: false, lastBackupAt: daysAgo(1) };

test('attentionItems: todo en orden no genera avisos', () => {
  assert.deepEqual(attentionItems({ ...base, role: 'admin' }), []);
});

test('attentionItems: borradores, tours y orden por gravedad', () => {
  const l = attentionItems({ ...base, role: 'admin', drafts: 3, toursDraft: 1, site: { state: 'error', siteExists: true } });
  assert.deepEqual(ids(l), ['site-error', 'drafts', 'tours']);
  assert.equal(l[1].title, '3 páginas esperan a publicarse');
  assert.equal(l[1].action.href, '#/borradores');
  assert.equal(attentionItems({ ...base, role: 'editor', drafts: 1 })[0].title, '1 página espera a publicarse');
});

test('attentionItems: actualización del sistema y reinicio solo para admin', () => {
  assert.deepEqual(ids(attentionItems({ ...base, role: 'admin', behind: 4, needsRestart: true })), ['restart', 'update']);
  assert.deepEqual(attentionItems({ ...base, role: 'editor', behind: 4, needsRestart: true }), []);
  assert.deepEqual(attentionItems({ ...base, role: 'admin', behind: null }), []);
  // Enlaces: el manual publicado y la actualización del sistema (Ajustes), no la antigua pantalla «Sistema».
  const l = attentionItems({ ...base, role: 'admin', behind: 4, needsRestart: true, site: { state: 'error' } });
  assert.deepEqual(l.map((x) => x.action?.href), ['#/manual', '#/ajustes/sistema', '#/ajustes/sistema']);
});

test('attentionItems: respaldo inexistente o antiguo (solo admin; desconocido no avisa)', () => {
  assert.equal(attentionItems({ ...base, role: 'admin', lastBackupAt: null })[0].title, 'Todavía no hay ningún respaldo');
  assert.deepEqual(attentionItems({ ...base, role: 'admin', lastBackupAt: daysAgo(BACKUP_MAX_DAYS) }), []);
  assert.match(attentionItems({ ...base, role: 'admin', lastBackupAt: daysAgo(10) })[0].title, /hace 10 días/);
  assert.deepEqual(attentionItems({ ...base, role: 'admin', lastBackupAt: undefined }), []);
  assert.deepEqual(attentionItems({ ...base, role: 'editor', lastBackupAt: null }), []);
});

test('attentionItems: estado del manual', () => {
  assert.deepEqual(ids(attentionItems({ ...base, role: 'editor', site: { state: 'idle', siteExists: false } })), ['site-missing']);
  assert.deepEqual(attentionItems({ ...base, role: 'editor', site: { state: 'building', siteExists: false } }), []);
  assert.deepEqual(ids(attentionItems({ ...base, role: 'editor', site: { state: 'pending', siteExists: true, autoPublish: false } })), ['site-manual']);
  assert.deepEqual(attentionItems({ ...base, role: 'editor', site: { state: 'pending', siteExists: true, autoPublish: true } }), []);
});

test('attentionItems: el lector ve los avisos sin botones', () => {
  const l = attentionItems({ ...base, role: 'viewer', drafts: 2, toursDraft: 1, site: { state: 'error' }, behind: 3, lastBackupAt: null });
  assert.deepEqual(ids(l), ['site-error', 'drafts', 'tours']);
  assert.ok(l.every((x) => !x.action));
});

test('sectionOverview: orden del menú, Referencia incluye Conceptos, portada aparte', () => {
  const by = [{ seccion: 'tareas', count: 120 }, { seccion: 'guia', count: 60 }, { seccion: 'referencia', count: 14 }, { seccion: 'conceptos', count: 2 }, { seccion: 'raiz', count: 1 }];
  const { rows, other } = sectionOverview(by, null);
  assert.deepEqual(rows.map((r) => [r.key, r.count]), [['guia', 60], ['tareas', 120], ['problemas', 0], ['preguntas', 0], ['referencia', 16]]);
  assert.equal(rows[1].share, 1);
  assert.equal(rows[0].share, 0.5);
  assert.equal(rows[0].groups, null);
  assert.equal(other, 1);
});

test('sectionOverview: grupos con páginas y borradores anidados desde la estructura', () => {
  const tree = [
    { key: 'preguntas', sectionIndex: { status: 'draft' }, grupos: [
      { name: 'A', pages: [{ status: 'published', children: [{ status: 'draft' }] }, { status: 'draft' }] },
      { name: 'Vacío', pages: [] },
    ] },
  ];
  const { rows } = sectionOverview([{ seccion: 'preguntas', count: 4 }], tree);
  const p = rows.find((r) => r.key === 'preguntas');
  assert.equal(p.groups, 1);
  assert.equal(p.drafts, 3);
  assert.equal(rows.find((r) => r.key === 'guia').groups, 0);
});

test('greeting, daysSince, actionText y shownTarget', () => {
  assert.equal(greeting(8), 'Buenos días');
  assert.equal(greeting(15), 'Buenas tardes');
  assert.equal(greeting(23), 'Buenas noches');
  assert.equal(greeting(3), 'Buenas noches');
  assert.equal(daysSince(daysAgo(3), NOW), 3);
  assert.equal(daysSince(null, NOW), null);
  assert.equal(daysSince('no-fecha', NOW), null);
  assert.equal(actionText('page.update', { 'page.update': 'editó la página' }), 'editó la página');
  assert.equal(actionText('structure.group_delete', {}), 'eliminó un grupo de');
  assert.equal(actionText('foo.bar_baz', {}), 'realizó «bar baz» en');
  assert.equal(shownTarget('job:12'), '');
  assert.equal(shownTarget('/guia/x'), '/guia/x');
  assert.equal(shownTarget(null), '');
});
