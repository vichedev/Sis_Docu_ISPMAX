// Rutas OPS: sitio (actualización automática y reconstrucción), sistema desde Git y respaldos.
// El sitio publicado lo sirve server/http/frontend.mjs (en / con la base con la que se generó).
// registerOpsRoutes(app, ctx) con ctx = { pool, db, tx, requireRole, audit, repoRoot, getSetting, sync? }.
// Deja en ctx.site el programador de actualización (markDirty, status…) para las rutas de contenido.
import { killChildren } from './proc.mjs';
import { createJobs } from './jobs.mjs';
import { createPublisher, getSiteBase, DEFAULT_BASE } from './publish.mjs';
import { createGit } from './git.mjs';
import { createBackups } from './backup.mjs';
import { createSite } from './site.mjs';
import { createSystem, respawnSelf } from './system.mjs';

/** Envuelve un handler para responder `{error}` en español con el código HTTP del error. */
const wrap = fn => async (req, reply) => {
  try {
    return await fn(req, reply);
  } catch (e) {
    const code = e.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
    if (code >= 500) req.log?.error?.(e);
    // Un error inesperado (sin código propio) no se muestra tal cual: puede llevar rutas o detalles internos.
    if (!e.statusCode) console.error('[ops] Error:', e.message);
    const body = { error: e.statusCode ? e.message || 'Error interno.' : 'Error interno del servidor.' };
    if (e.files) body.files = e.files;
    if (e.jobId) body.jobId = e.jobId;
    return reply.code(code).send(body);
  }
};

const userIdOf = req => req.user?.id ?? req.session?.user?.id ?? null;

/** ctx.sync perezoso: si la API no lo pasó, se carga ../sync/index.mjs al usarlo. */
function lazySync(ctx) {
  if (ctx.sync) return;
  let mod;
  const load = async () => (mod ??= await import('../sync/index.mjs'));
  ctx.sync = {
    exportToDir: async (...a) => (await load()).exportToDir(...a),
    importFromRepo: async (...a) => (await load()).importFromRepo(...a),
  };
}

/** Reinicio por defecto: `exit` cierra ordenadamente; `respawn` lanza antes un proceso nuevo desacoplado. */
function defaultRestarter(app) {
  return async mode => {
    if (mode === 'respawn') respawnSelf();
    try {
      await Promise.race([app.close(), new Promise(r => setTimeout(r, 5000))]);
    } finally {
      process.exit(0);
    }
  };
}

export async function registerOpsRoutes(app, ctx) {
  lazySync(ctx);
  const jobs = createJobs(ctx);
  const publisher = createPublisher({ ctx, jobs });
  const gitOps = createGit({ ctx, jobs });
  const backups = createBackups({ ctx, jobs });
  const base = await getSiteBase(ctx).catch(() => DEFAULT_BASE);
  // ctx.servedBase (función de http/frontend.mjs): base con la que se sirve el sitio actual, sin reinicios.
  const servedBase = typeof ctx.servedBase === 'function' ? ctx.servedBase : base !== '/' ? base : null;
  // Modo dinámico: ctx.siteRuntime (ops/site-dynamic.mjs) hace de programador; no hay construcciones ni trabajos.
  const dynamic = ctx.siteRuntime?.mode === 'dynamic';
  const site = dynamic ? ctx.siteRuntime : createSite({ ctx, jobs, publisher, servedBase, logger: app.log });
  const system = createSystem({ ctx, jobs, site, gitOps, restarter: ctx.restarter ?? defaultRestarter(app) });
  ctx.site = site;
  const admin = { preHandler: ctx.requireRole('admin') };
  const editor = { preHandler: ctx.requireRole('editor') };
  const lector = { preHandler: ctx.requireRole('viewer') };
  // Dinámico: vacía y recalienta la caché ({ ok, cleared }). Estático: lanza una construcción ({ jobId }).
  const rebuild = async req => (dynamic ? site.rebuild(userIdOf(req)) : { jobId: (await site.rebuild(userIdOf(req))).jobId });

  // Sitio (Adenda 3)
  app.get('/api/site/status', lector, wrap(async () => site.status()));
  app.post('/api/site/rebuild', editor, wrap(rebuild));

  // Sistema desde Git (solo código)
  // Solo un admin provoca `git fetch` (acceso a la red); los demás roles ven el último estado conocido.
  app.get('/api/system/version', lector, wrap(async req => system.version({ fetch: req.user?.role === 'admin' && req.query?.fetch !== '0' })));
  app.get('/api/system/info', admin, wrap(async () => system.info()));
  app.post('/api/system/update', admin, wrap(async req => system.update(userIdOf(req))));
  app.post(
    '/api/system/restart',
    admin,
    wrap(async req => system.restart(userIdOf(req), { confirm: req.body?.confirm, force: req.body?.force === true })),
  );

  // Alias compatibles: /api/publish = reconstruir; /api/git/update = actualizar el sistema (ya no reimporta contenido).
  app.post('/api/publish', admin, wrap(rebuild));
  app.get(
    '/api/publish/status',
    lector,
    wrap(async () => {
      if (!dynamic) return publisher.status();
      const s = await site.status();
      return { running: false, job: null, site: { mode: 'dynamic', exists: s.cache.pages > 0, url: s.siteUrl, live: s.live } };
    }),
  );
  app.get(
    '/api/git/status',
    lector,
    wrap(async req => {
      const { repoPath, remote, ...s } = await gitOps.status({ fetch: req.user?.role === 'admin' && req.query?.fetch !== '0' }); // sin rutas ni URL del servidor
      return { ...s, remote: remote ? { name: remote.name, configured: remote.configured } : null };
    }),
  );
  app.post('/api/git/update', admin, wrap(async req => system.update(userIdOf(req))));

  // Respaldos
  app.get('/api/backups', lector, wrap(async () => backups.list()));
  app.post('/api/backups', admin, wrap(async req => backups.create(userIdOf(req))));
  app.get('/api/backups/:id/download', admin, wrap(async (req, reply) => backups.download(req.params.id, reply)));
  app.delete('/api/backups/:id', admin, wrap(async req => backups.remove(req.params.id, userIdOf(req))));
  app.post(
    '/api/backups/:id/restore',
    admin,
    wrap(async req => {
      const r = await backups.restore(req.params.id, userIdOf(req), { confirm: req.body?.confirm });
      site.markDirty('restauración de un respaldo de la base');
      return r;
    }),
  );

  // Apagado ordenado (SIGTERM/SIGINT o reinicio): no programar más construcciones, detener los procesos hijos y
  // dejar en `error` los trabajos de este proceso (nunca quedan `running`). index.mjs lo llama antes de cerrar la BD.
  ctx.shutdownOps = async () => {
    site.close();
    const children = killChildren();
    const n = await jobs.interruptActive().catch(() => 0);
    if (children || n) app.log?.warn?.(`OPS: apagado con ${children} procesos hijos detenidos y ${n} trabajos marcados como interrumpidos.`);
    return { children, jobs: n };
  };
  app.addHook('onClose', async () => site.close());

  try {
    const n = await jobs.recoverOrphans();
    if (n) app.log?.warn?.(`OPS: ${n} trabajos interrumpidos marcados como error.`);
  } catch (e) {
    app.log?.error?.(e);
  }
  // Recuperación tras reinicio: si quedaron cambios sin construir, un build al arrancar.
  site.init().catch(e => app.log?.error?.(e));
  // Vigilancia periódica: cambios escritos en la BD por otro proceso (importación por consola).
  if (ctx.watchSite !== false) site.startWatch();
  return { jobs, publisher, git: gitOps, backups, site, system };
}
