// Pruebas de la lógica pura del respaldo de contenido: node --test portal/web/test/content-package.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsConfirm, defaultMode, canImport, fileProblem, shortHash, countsText, importErrorText, parseImportResult, lastLogLine } from '../src/features/backups/contentModel.ts';

test('confirmación solo al reemplazar con contenido', () => {
  assert.equal(needsConfirm('replace', true), true);
  assert.equal(needsConfirm('replace', false), false);
  assert.equal(needsConfirm('merge', true), false);
  assert.equal(defaultMode(false), 'replace');
  assert.equal(defaultMode(true), 'merge');
});
test('canImport exige archivo válido y CARGAR exacto', () => {
  const f = { name: 'x.ispmax', size: 10 };
  assert.equal(canImport(null, 'replace', false, ''), false);
  assert.equal(canImport(f, 'replace', false, ''), true);
  assert.equal(canImport(f, 'replace', true, ''), false);
  assert.equal(canImport(f, 'replace', true, 'cargar'), false);
  assert.equal(canImport(f, 'replace', true, ' CARGAR '), true);
  assert.equal(canImport(f, 'merge', true, ''), true);
  assert.equal(canImport({ name: 'x.zip', size: 10 }, 'replace', false, ''), false);
});
test('fileProblem', () => {
  assert.match(fileProblem({ name: 'a.txt', size: 5 }), /\.ispmax/);
  assert.match(fileProblem({ name: 'a.ispmax', size: 0 }), /vacío/);
  assert.match(fileProblem({ name: 'a.ispmax', size: 301 * 1024 * 1024 }), /300 MB/);
  assert.equal(fileProblem({ name: 'A.ISPMAX', size: 1 }), null);
});
test('shortHash y countsText', () => {
  assert.equal(shortHash('abcdef0123456789'), 'abcdef 012345');
  assert.equal(shortHash(null), '');
  assert.equal(countsText({ pages: 1, drafts: 0, assets: 270, tours: 2 }), '1 página · 270 imágenes · 2 tours');
  assert.equal(countsText({ pages: 285, drafts: 3, assets: 1, tours: 0, revisions: 9 }, true), '285 páginas · 3 borradores · 1 imagen · 0 tours · 9 revisiones');
});
test('importErrorText', () => {
  assert.match(importErrorText(413, ''), /300 MB/);
  assert.match(importErrorText(409, ''), /en curso/);
  assert.match(importErrorText(400, 'Paquete corrupto'), /no es un respaldo válido/);
  assert.match(importErrorText(400, 'escriba exactamente CARGAR'), /CARGAR/);
});
test('parseImportResult y lastLogLine', () => {
  const log = '[proceso 1]\nPaquete de seguridad: seguridad-1.ispmax.\nImportado (replace): 285 páginas (3 borradores), 270 imágenes, 2 tours, 4 redirecciones, 5 archivos de apoyo, 90 revisiones; omitido por existir: 0.\n';
  const r = parseImportResult(log);
  assert.deepEqual(r.counts, { pages: 285, drafts: 3, assets: 270, tours: 2, redirects: 4, siteFiles: 5, revisions: 90 });
  assert.equal(r.safetyFile, 'seguridad-1.ispmax');
  assert.equal(parseImportResult('nada'), null);
  assert.match(lastLogLine(log), /^Importado/);
});
