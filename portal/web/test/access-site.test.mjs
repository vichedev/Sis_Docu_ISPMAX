// Pruebas de siteHref (base del sitio publicado) y del manejo de 403/503: node --test portal/web/test/access-site.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteHref, normalizeBase, setSiteBase, getSiteBase } from '../src/lib/siteHref.ts';
import { accessKind, ACCESS_TEXT } from '../src/lib/access.ts';

test('normalizeBase: raíz, /manual/ y variantes', () => {
  for (const [i, o] of [['/', '/'], ['', '/'], [undefined, '/'], ['/manual', '/manual/'], ['/manual/', '/manual/'], ['manual', '/manual/'], ['//x', '/'], ['//', '/'], ['/a//b/', '/a/b/'], ['https://h.invalid/m', 'https://h.invalid/m/']]) assert.equal(normalizeBase(i), o, String(i));
});
test('siteHref con base /', () => {
  assert.equal(siteHref('', '/'), '/');
  assert.equal(siteHref('/', '/'), '/');
  assert.equal(siteHref('/tareas/x', '/'), '/tareas/x');
  assert.equal(siteHref('tareas/x', '/'), '/tareas/x');
  assert.equal(siteHref('/tareas/x#paso-2', '/'), '/tareas/x#paso-2');
  assert.equal(siteHref('#a', '/'), '/#a');
});
test('siteHref con base /manual/', () => {
  assert.equal(siteHref('', '/manual/'), '/manual/');
  assert.equal(siteHref('/tareas/x', '/manual/'), '/manual/tareas/x');
  assert.equal(siteHref('//tareas/x', '/manual'), '/manual/tareas/x');
  assert.equal(siteHref('/tareas/x#a?b=1', '/manual/'), '/manual/tareas/x#a?b=1');
  assert.ok(!siteHref('/a', '/manual/').includes('//'));
  assert.ok(!siteHref('/a', '/').includes('//'));
});
test('siteHref usa la base global y sin ella cae en /', () => {
  assert.equal(getSiteBase(), '/');
  assert.equal(siteHref('/x'), '/x');
  setSiteBase('/manual/');
  assert.equal(siteHref('/x'), '/manual/x');
  assert.equal(siteHref('/x', '/'), '/x');
  setSiteBase(undefined);
  assert.equal(siteHref('/x'), '/x');
});
test('accessKind: 403 y 503 solo de la sesión; 401 y otros no', () => {
  assert.equal(accessKind(403, '/api/auth/me'), 'forbidden');
  assert.equal(accessKind(503, '/api/auth/me'), 'disabled');
  assert.equal(accessKind(403, '/api/auth/login'), 'forbidden');
  assert.equal(accessKind(401, '/api/auth/me'), null);
  assert.equal(accessKind(403, '/api/pages/3'), null);
  assert.equal(accessKind(503, '/api/publish'), null);
  assert.match(ACCESS_TEXT.forbidden.title, /Acceso restringido desde esta red/);
  assert.match(ACCESS_TEXT.disabled.title, /deshabilitado/);
});
