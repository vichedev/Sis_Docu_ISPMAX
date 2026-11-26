// Pruebas de la lógica pura de Ajustes, rutas antiguas y la información del sistema: node --test portal/web/test/settings.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSettings, dirtyKeys, whatsappDigits, whatsappProblem, numberProblem, shownTitle, HIDDEN_KEYS } from '../src/features/settings/settingsModel.ts';
import { legacyRedirect, settingsSection, SETTINGS_SECTIONS } from '../src/routes/paths.ts';
import { parseSteps, stepLabels, updatePlan, fmtUptime, infoText, versionLine, STEPS_BY_MODE } from '../src/features/system/systemModel.ts';

const def = (key, section) => ({ key, label: key, type: 'string', ...(section ? { section } : {}) });

test('groupSettings: reparte por la sección que manda el servidor', () => {
  const g = groupSettings([def('backup_keep', 'respaldos'), def('auto_publish_delay', 'manual'), def('site_title', 'general'), def('contact_whatsapp', 'general'), def('auto_publish', 'manual')]);
  assert.deepEqual(g.general.map((d) => d.key), ['site_title', 'contact_whatsapp']);
  assert.deepEqual(g.manual.map((d) => d.key), ['auto_publish', 'auto_publish_delay']);
  assert.deepEqual(g.respaldos.map((d) => d.key), ['backup_keep']);
});

test('groupSettings: servidor antiguo sin `section` y con ajustes internos → se ocultan', () => {
  const old = ['site_title', 'site_url', 'repo_path', 'git_remote', 'git_branch', 'build_command', 'backup_dir', 'backup_keep', 'site_base', 'auto_publish', 'auto_publish_delay', 'restart_mode', 'contact_whatsapp'].map((k) => def(k));
  const g = groupSettings(old);
  const shown = [...g.general, ...g.manual, ...g.respaldos].map((d) => d.key);
  assert.deepEqual(shown, ['site_title', 'contact_whatsapp', 'auto_publish', 'auto_publish_delay', 'backup_keep']);
  for (const k of HIDDEN_KEYS) assert.ok(!shown.includes(k), k);
  // Un ajuste interno no aparece aunque el servidor lo etiquete con una sección.
  assert.deepEqual(groupSettings([def('repo_path', 'general')]).general, []);
  // Uno nuevo y desconocido con sección válida sí aparece (al final); sin sección, no.
  assert.deepEqual(groupSettings([def('nuevo', 'general'), def('site_title', 'general'), def('otro')]).general.map((d) => d.key), ['site_title', 'nuevo']);
  assert.deepEqual(groupSettings(null), { general: [], manual: [], respaldos: [] });
});

test('dirtyKeys: compara con lo guardado (vacío y null equivalen)', () => {
  assert.deepEqual(dirtyKeys(['a', 'b', 'c'], { a: 'x', b: '', c: 2 }, { a: 'x', b: null, c: 1 }), ['c']);
});

test('WhatsApp: mismo criterio que el servidor', () => {
  assert.equal(whatsappDigits('+593 95 996 7843'), '593959967843');
  assert.equal(whatsappDigits(''), '');
  assert.equal(whatsappDigits('abc'), null);
  assert.equal(whatsappDigits('1234567'), null);
  assert.equal(whatsappProblem(''), null);
  assert.equal(whatsappProblem('(593) 95-996-7843'), null);
  assert.match(whatsappProblem('wa.me/593'), /solo el número/);
  assert.match(whatsappProblem('12345'), /corto/);
  assert.match(whatsappProblem('1234567890123456'), /largo/);
});

test('numberProblem y shownTitle', () => {
  assert.equal(numberProblem(8, 1, 120), null);
  assert.match(numberProblem(0, 1, 120), /entre 1 y 120/);
  assert.match(numberProblem(2.5), /entero/);
  assert.match(numberProblem(''), /Escriba/);
  assert.equal(shownTitle('  '), 'Manual ISPMAX');
  assert.equal(shownTitle('Ayuda ISP'), 'Ayuda ISP');
});

test('rutas: secciones de Ajustes y redirecciones de las antiguas', () => {
  assert.deepEqual(SETTINGS_SECTIONS, ['general', 'manual', 'seguridad', 'sistema', 'respaldos', 'info']);
  assert.equal(settingsSection('info'), 'info');
  assert.equal(settingsSection('git'), 'general');
  assert.equal(settingsSection(undefined), 'general');
  assert.equal(legacyRedirect('/sistema'), '/ajustes/sistema');
  assert.equal(legacyRedirect('/publicar'), '/ajustes/sistema');
  assert.equal(legacyRedirect('/sistema', false), '/manual');
  assert.equal(legacyRedirect('/ajustes'), '/ajustes/general');
  assert.equal(legacyRedirect('/ajustes/desconocida'), '/ajustes/general');
  assert.equal(legacyRedirect('/ajustes/respaldos'), null);
  assert.equal(legacyRedirect('/manual'), null);
  assert.equal(legacyRedirect('/'), null);
});

test('parseSteps y stepLabels: «Paso n/N» con N variable', () => {
  const log = 'x\nPaso 1/3 · Comprobar el árbol\nÁrbol limpio.\nPaso 2/3 · Traer el código\n';
  const p = parseSteps(log);
  assert.deepEqual([p.current, p.total, p.names[2]], [2, 3, 'Traer el código']);
  assert.deepEqual(stepLabels('entrypoint', p), STEPS_BY_MODE.entrypoint);
  assert.deepEqual(stepLabels('git', { total: 0, names: {} }), STEPS_BY_MODE.git);
  assert.deepEqual(stepLabels('git', { total: 4, names: { 1: 'Uno', 3: 'Tres' } }), ['Uno', 'Paso 2', 'Tres', 'Paso 4']);
  assert.equal(parseSteps('').current, 0);
});

test('updatePlan: en Docker trae el código y reinicia', () => {
  assert.match(updatePlan('entrypoint').join(' '), /Reiniciar el sistema.*unos minutos/);
  assert.match(updatePlan('git').join(' '), /Instalar dependencias/);
});

test('fmtUptime', () => {
  assert.equal(fmtUptime(42), '42 s');
  assert.equal(fmtUptime(3725), '1 h 2 min');
  assert.equal(fmtUptime(90061), '1 d 1 h');
  assert.equal(fmtUptime(null), '');
});

test('infoText: información copiable, sin datos ausentes ni credenciales', () => {
  const t = infoText({
    version: { branch: 'main', shortCommit: 'a1b2c3d', date: '2026-11-20T10:00:00Z', subject: 'Arregla algo' },
    runtime: { node: 'v22.11.0', platform: 'linux', docker: true, uptimeSec: 3725 },
    database: { connected: true, name: 'manual_demo', serverVersion: '16.4' },
    site: { base: '/', exists: true, pages: 285, lastBuild: { finishedAt: '2026-11-25T09:00:00Z' } },
    access: { adminEnabled: true, adminIpRestricted: false, behindProxy: true, cookieSecure: true },
    update: { mode: 'entrypoint', canUpdate: false, message: 'El sistema está al día.' },
    restartMode: 'exit',
  }, '2026-11-25T12:34:56Z');
  const l = t.split('\n');
  assert.equal(l[0], 'Información del sistema del portal del manual (2026-11-25 12:34 UTC)');
  assert.ok(l.includes('Versión: main · a1b2c3d · 2026-11-20 · Arregla algo'));
  assert.ok(l.includes('Entorno: Docker · Node v22.11.0 · linux'));
  assert.ok(l.includes('En marcha desde hace: 1 h 2 min'));
  assert.ok(l.includes('Base de datos: conectada · manual_demo · PostgreSQL 16.4'));
  assert.ok(l.includes('Manual generado: sí · base / · 285 páginas · última actualización 2026-11-25 09:00'));
  assert.ok(l.includes('Acceso: panel habilitado: sí · restringido por IP: no · detrás de proxy: sí · cookie segura: sí'));
  assert.ok(l.includes('Actualización: modo entrypoint · no disponible · El sistema está al día.'));
  assert.ok(!/password|contraseña|postgres:\/\//i.test(t));
  // Datos ausentes: solo la cabecera y la versión «no consta».
  assert.deepEqual(infoText({}, '2026-11-25T12:00:00Z').split('\n').slice(1), ['Versión: no consta']);
  assert.equal(versionLine('1.2.3'), '1.2.3');
});
