// Pruebas del modo en vivo del manual: node --test portal/web/test/live.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLive, liveOk, liveProblem, fmtBytes, savedMessage, publishedMessage, publishedManyMessage, clearedMessage } from '../src/lib/siteModel.ts';
import { attentionItems } from '../src/features/dashboard/homeModel.ts';
import { updatePlan } from '../src/features/system/systemModel.ts';

const dyn = { mode: 'dynamic', state: 'live', live: true };

test('isLive: solo mode dynamic; sin mode o static = como antes', () => {
  assert.equal(isLive(dyn), true);
  assert.equal(isLive({ mode: 'static', state: 'idle' }), false);
  assert.equal(isLive({ state: 'idle' }), false);
  assert.equal(isLive(null), false);
  assert.equal(isLive(undefined), false);
});

test('liveOk / liveProblem', () => {
  assert.equal(liveOk(dyn), true);
  assert.equal(liveOk({ mode: 'dynamic', state: 'error', message: 'Falta el tema' }), false);
  assert.equal(liveOk({ mode: 'static', state: 'live' }), false);
  assert.equal(liveProblem({ message: 'Falta el tema' }), 'Falta el tema');
  assert.match(liveProblem({}), /diseño compilado/);
});

test('fmtBytes', () => {
  assert.equal(fmtBytes(null), '—');
  assert.equal(fmtBytes(900), '900 B');
  assert.equal(fmtBytes(1536), '1,5 KB');
  assert.equal(fmtBytes(5 * 1048576), '5 MB');
});

test('mensajes de guardado y publicación', () => {
  assert.equal(savedMessage('published', dyn), 'Guardado · ya está visible en el manual');
  assert.equal(savedMessage('draft', dyn), 'Borrador guardado · no aparece en el manual hasta que lo publique');
  assert.equal(savedMessage('published', { mode: 'static', autoPublish: true }), 'Guardado · el manual se actualiza en unos segundos');
  assert.match(savedMessage('published', { mode: 'static', autoPublish: false }), /Actualizar ahora/);
  assert.equal(publishedMessage(dyn), 'Publicada · ya está en el manual');
  assert.match(publishedMessage(null), /unos segundos/);
  assert.equal(publishedManyMessage(1, dyn), 'Se publicó 1 página · ya está en el manual');
  assert.equal(publishedManyMessage(3, dyn), 'Se publicaron 3 páginas · ya están en el manual');
  assert.match(publishedManyMessage(3, null), /unos segundos/);
  assert.equal(clearedMessage({ ok: true, cleared: 12 }), 'Caché vaciada · 12 páginas');
  assert.equal(clearedMessage({}), 'Caché vaciada');
});

test('Inicio en vivo: sin avisos de reconstrucción; error solo si falta el tema', () => {
  const base = { role: 'admin', now: Date.now(), drafts: 0, toursDraft: 0, behind: 0, needsRestart: false };
  assert.deepEqual(attentionItems({ ...base, site: { state: 'live', mode: 'dynamic', siteExists: false } }), []);
  assert.deepEqual(attentionItems({ ...base, site: { state: 'pending', mode: 'dynamic', autoPublish: false } }), []);
  const e = attentionItems({ ...base, site: { state: 'error', mode: 'dynamic', message: 'Falta el tema' } });
  assert.equal(e[0].id, 'site-error');
  assert.equal(e[0].detail, 'Falta el tema');
  // estático: igual que antes
  assert.equal(attentionItems({ ...base, site: { state: 'pending', mode: 'static', autoPublish: false } })[0].id, 'site-manual');
});

test('updatePlan en vivo habla del diseño del manual', () => {
  assert.match(updatePlan('git', true).join(' '), /diseño del manual/);
  assert.match(updatePlan('git', false).join(' '), /panel y el manual/);
});
