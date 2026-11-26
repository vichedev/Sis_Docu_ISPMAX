// Programador de actualización del sitio (ops/site.mjs) con un publicador simulado: debounce, coalescencia,
// nunca dos construcciones a la vez, auto_publish y errores sin reintentos en bucle. No usa la BD ni construye nada.
// Uso: node --test test/site.test.mjs   (desde portal/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSite } from '../server/ops/site.mjs';

delete process.env.PORTAL_SITE_AUTO;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function harness({ settings = {}, buildMs = 300, fail = false } = {}) {
  const st = { auto_publish: true, auto_publish_delay: 1, ...settings };
  const jobsRows = [];
  const calls = [];
  let active = 0;
  let maxActive = 0;
  let nextId = 1;
  const publisher = {
    async publish(userId, { reasons, trigger }) {
      const jobId = nextId++;
      const row = { id: jobId, status: 'running', log: '', started_at: new Date(), finished_at: null };
      jobsRows.push(row);
      calls.push({ jobId, reasons, trigger, at: Date.now() });
      active++;
      maxActive = Math.max(maxActive, active);
      const done = (async () => {
        await sleep(buildMs);
        active--;
        row.finished_at = new Date();
        row.status = h.fail ? 'error' : 'ok';
        row.log = h.fail ? 'ERROR: build roto simulado\n' : 'RESULTADO: {"pages":3}\n';
        return { status: row.status };
      })();
      return { jobId, done };
    },
  };
  const db = {
    async query(sql) {
      if (/status <> 'running'/.test(sql)) {
        const done = jobsRows.filter(j => j.status !== 'running');
        return { rows: done.length ? [done[done.length - 1]] : [] };
      }
      if (/status = 'running'/.test(sql)) return { rows: [] };
      if (/count\(\*\)/.test(sql)) return { rows: [{ n: 0 }] };
      return { rows: [] };
    },
  };
  const ctx = { db, getSetting: async (k, d) => (k in st ? st[k] : d) };
  const site = createSite({ ctx, jobs: null, publisher, servedBase: '/manual/' });
  const h = { site, calls, st, fail, get maxActive() { return maxActive; } };
  return h;
}

test('debounce: dos cambios seguidos → una sola construcción con ambos motivos', async () => {
  const h = harness();
  h.site.markDirty('página editada: /a');
  await sleep(300);
  h.site.markDirty('página editada: /b');
  const s = await h.site.status();
  assert.equal(s.state, 'pending');
  assert.ok(s.nextRunInMs > 0 && s.nextRunInMs <= 1000);
  assert.deepEqual(s.pendingReasons, ['página editada: /a', 'página editada: /b']);
  await sleep(1500);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].reasons, ['página editada: /a', 'página editada: /b']);
  assert.equal(h.calls[0].trigger, 'auto');
  const s2 = await h.site.status();
  assert.equal(s2.state, 'idle');
  assert.equal(s2.lastBuild.status, 'ok');
  assert.equal(s2.lastBuild.pages, 3);
  h.site.close();
});

test('coalescencia: cambios durante una construcción → exactamente una más al terminar, nunca en paralelo', async () => {
  const h = harness({ buildMs: 1200 });
  h.site.markDirty('uno');
  await sleep(1150); // ya construyendo
  assert.equal(h.calls.length, 1);
  assert.equal((await h.site.status()).state, 'building');
  h.site.markDirty('dos');
  h.site.markDirty('tres');
  await sleep(200);
  h.site.markDirty('cuatro');
  await assert.rejects(h.site.rebuild(null), e => e.statusCode === 409);
  await sleep(1000); // termina la primera; se programa la segunda (1 s de espera)
  assert.equal(h.calls.length, 1);
  await sleep(1600);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.calls[1].reasons, ['dos', 'tres', 'cuatro']);
  await sleep(1500);
  assert.equal(h.calls.length, 2, 'no hay una tercera');
  assert.equal(h.maxActive, 1, 'nunca dos a la vez');
  h.site.close();
});

test('auto_publish=false: queda pendiente sin programar; al activarlo se construye', async () => {
  const h = harness({ settings: { auto_publish: false } });
  h.site.markDirty('cambio');
  await sleep(1300);
  assert.equal(h.calls.length, 0);
  const s = await h.site.status();
  assert.equal(s.state, 'pending');
  assert.equal(s.nextRunInMs, null);
  assert.equal(s.autoPublish, false);
  h.st.auto_publish = true;
  await h.site.settingsChanged();
  await sleep(1500);
  assert.equal(h.calls.length, 1);
  h.site.close();
});

test('build roto: estado error, sin reintentos en bucle; el siguiente cambio vuelve a intentarlo', async () => {
  const h = harness({ buildMs: 100 });
  h.fail = true;
  h.site.markDirty('roto');
  await sleep(1400);
  assert.equal(h.calls.length, 1);
  let s = await h.site.status();
  assert.equal(s.state, 'error');
  assert.equal(s.lastBuild.status, 'error');
  assert.match(s.lastBuild.error, /build roto simulado/);
  await sleep(1500);
  assert.equal(h.calls.length, 1, 'no reintenta solo');
  h.fail = false;
  h.site.markDirty('arreglado');
  await sleep(1400);
  assert.equal(h.calls.length, 2);
  s = await h.site.status();
  assert.equal(s.state, 'idle');
  h.site.close();
});

test('rebuild manual: inmediato; PORTAL_SITE_AUTO=off no programa nada', async () => {
  const h = harness({ buildMs: 50 });
  const r = await h.site.rebuild(7);
  assert.equal(r.jobId, 1);
  await r.done;
  assert.equal(h.calls[0].trigger, 'manual');
  process.env.PORTAL_SITE_AUTO = 'off';
  try {
    h.site.markDirty('x');
    await sleep(1300);
    assert.equal(h.calls.length, 1);
    assert.equal((await h.site.status()).state, 'pending');
  } finally {
    delete process.env.PORTAL_SITE_AUTO;
    h.site.close();
  }
});
