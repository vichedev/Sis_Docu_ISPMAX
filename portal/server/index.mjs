// Servidor del portal: un solo proceso Node en un solo puerto sirve el manual público (/), el panel (/admin/),
// la API (/api/*) y el estado para el healthcheck (/healthz). Fastify + auth + rutas propias + SYNC + OPS.
//
// ── Variables de entorno ─────────────────────────────────────────────────────────────────────────────────────
// Se leen de portal/.env (o del archivo de PORTAL_ENV_FILE); las ya definidas en el entorno tienen prioridad.
// Una variable vacía (`X=`) cuenta como no definida.
//
//  Red y proxy inverso
//   PORTAL_PORT              Puerto (def. 4380; en producción 8387, el del contenedor antiguo).
//   PORTAL_HOST              Interfaz (def. 127.0.0.1; en Docker 0.0.0.0).
//   PORTAL_TRUST_PROXY       Confiar en X-Forwarded-For/-Host/-Proto: false (def.), true, nº de saltos o lista de
//                            IP/CIDR del proxy separada por comas (p. ej. 172.16.0.0/12). Determina request.ip (límite
//                            de intentos de login, lista de IPs), el host efectivo (comprobación de origen) y el
//                            protocolo efectivo (cookie Secure).
//   PORTAL_ALLOWED_ORIGINS   Orígenes extra aceptados en métodos que escriben, separados por comas. Sin definir:
//                            los del servidor de desarrollo de Vite (http://localhost:5173, http://127.0.0.1:5173);
//                            vacía: ninguno. El origen igual al host efectivo de la petición se acepta siempre.
//   PORTAL_PUBLIC_URL        URL pública del manual (ej. https://doc.ispmax.ec), sin barra final. La usan el sitemap.xml, el
//                            robots.txt y, al construir el sitio, el canonical, Open Graph y los datos estructurados.
//                            Vacía: sitemap/robots usan el host de la petición (X-Forwarded-* solo con PORTAL_TRUST_PROXY)
//                            y el sitio se genera sin canonical (aviso en el log del build).
//   PORTAL_COOKIE_SECURE     true fuerza `Secure` en la cookie de sesión. Sin definir o vacía: automático (Secure
//                            cuando el protocolo efectivo es https). Con true, entrar por http://IP:puerto no inicia sesión.
//                            Con Secure la cookie se llama __Host-portal_session; sin él, portal_session.
//
//  Sesiones y secretos (ver portal/SECURITY.md)
//   PORTAL_SESSION_IDLE_H    Horas sin actividad tras las que caduca una sesión (def. 12).
//   PORTAL_SESSION_MAX_DAYS  Duración máxima de una sesión aunque se use (def. 7).
//   PORTAL_SECRET_KEY        Clave para cifrar los secretos de la verificación en dos pasos (64 caracteres hex;
//                            `openssl rand -hex 32`). Sin definir: se genera <PORTAL_DATA_DIR>/secret.key (permisos 600).
//                            Si se pierde o cambia, los usuarios con 2FA entran con sus códigos de recuperación o un
//                            admin les restablece la 2FA.
//
//  Panel y API
//   PORTAL_ADMIN_ENABLED     false deshabilita /admin/** y /api/** (503); el manual y /healthz siguen. Def. true.
//   PORTAL_ADMIN_ALLOWED_IPS IP o CIDR (IPv4/IPv6) separados por comas que pueden usar /admin/** y /api/**; vacía =
//                            todas. Usa la IP real (request.ip, según PORTAL_TRUST_PROXY). Fuera de la lista: 403.
//   PORTAL_ADMIN_USER, PORTAL_ADMIN_PASSWORD  Administrador inicial si no hay usuarios.
//   PORTAL_WEB_DIST          Carpeta de la SPA compilada (def. portal/web/dist, compilada con base /admin/).
//
//  Datos y procesos
//   DATABASE_URL             Base de datos del portal (obligatoria).
//   TEST_DATABASE_URL        Base de pruebas (solo npm test y servidores de desarrollo).
//   PORTAL_WORK_DIR          Carpeta de trabajo de las construcciones (def. portal/work).
//   PORTAL_DATA_DIR          Datos: sitio publicado (site/), site-meta.json y respaldos (def. portal/data).
//   PORTAL_RESTART_MODE      Valor por defecto del ajuste restart_mode: exit (def.; Docker/pm2 rearrancan) o respawn.
//
//  Asistente de IA (Groq; ver portal/SECURITY.md § 9). La clave se puede poner en Ajustes (cifrada en la BD, manda) o aquí.
//   GROQ_API_KEY             Clave de Groq (alternativa a Ajustes). Nunca sale por la API ni se registra.
//   GROQ_MODEL               Modelo por defecto (def. openai/gpt-oss-120b; Ajustes tiene prioridad).
//   GROQ_BASE_URL            Solo pruebas: servidor falso. Def. https://api.groq.com
//   PORTAL_AI_RATE           Peticiones de IA por usuario cada 10 minutos (def. 20).
//   PORTAL_AI_HISTORY_DAYS   Días que se conservan las conversaciones del asistente (def. 90; 0 = sin caducidad).
//
//  Manual público (portal/site/, ver portal/DEPLOY.md)
//   PORTAL_RENDER_MODE       dynamic (def.): cada página se dibuja al pedirla desde la BD y se guarda en memoria;
//                            guardar en el panel = visible al instante; nada se escribe en disco. Necesita el tema
//                            compilado (npm run site:build; en Docker lo hace el arranque). static: el flujo anterior
//                            (build de Rspress en <PORTAL_DATA_DIR>/site tras cada cambio; alternativa temporal).
//   PORTAL_SITE_CACHE_MB     Memoria máxima de la caché del manual dinámico (HTML + módulos compilados), def. 256.
//   PORTAL_SITE_WARMUP       lazy (def.: portada, secciones y las más visitadas) | all (compila todas al arrancar).
//   PORTAL_SITE_COMPILER     process (def.: proceso hijo con el modelo de permisos de Node) | thread | inline.
//   PORTAL_SITE_COMPILE_TIMEOUT_S  Tiempo máximo de compilación de una página (def. 30).
//   PORTAL_SITE_AUTO         (static) off desactiva las reconstrucciones automáticas en este proceso (pruebas).
//   PORTAL_SITE_WATCH_S      (static) Cada cuántos segundos se comprueba si la BD cambió fuera del servidor (def. 45; 0 = no).
//   PG_DUMP_PATH             Ruta de pg_dump (pg_restore se busca al lado). Sin definir: pg_dump/pg_restore del PATH.
//   PORTAL_NPM_CLI           Ruta de npm-cli.js si no se encuentra sola (junto a Node, npm_execpath o, en Linux, npm del PATH).
//   PORTAL_LOG_LEVEL         Nivel del log de Fastify (def. warn).
//   PORTAL_ENV_FILE          Archivo de variables alternativo a portal/.env.
//
// Apagado: SIGTERM/SIGINT cierran el servidor (sin aceptar más peticiones), detienen las construcciones en curso,
// marcan sus trabajos como interrumpidos (nunca quedan `running`) y cierran la conexión a la BD.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import compress from '@fastify/compress';
import pg from 'pg';
import { loadEnv, REPO_ROOT } from './env.mjs';
import { readServerConfig, normalizeTrustProxy } from './config.mjs';
import { createAuth, isApiRequest, requestPath } from './auth.mjs';
import { parseAdminPath, DEFAULT_ADMIN_PATH, adminPathCollision, rewriteFor, createProbeGuard, isProbePath } from './http/adminPath.mjs';
import { applySchema } from './schema.mjs';
import { httpError } from './routes/util.mjs';
import { registerPageRoutes } from './routes/pages.mjs';
import { registerStructureRoutes } from './routes/structure.mjs';
import { registerAssetRoutes } from './routes/assets.mjs';
import { registerAdminRoutes } from './routes/admin.mjs';
import { registerTourRoutes } from './routes/tours.mjs';
import { registerAiRoutes } from './routes/ai.mjs';
import { registerAdminGate, registerFrontend } from './http/frontend.mjs';

loadEnv();

// Import dinámico tolerante: si el módulo aún no existe, avisa y sigue.
async function optionalImport(rel) {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), rel);
  if (!fs.existsSync(file)) {
    console.warn(`[portal] Aviso: ${rel} no existe todavía; se omiten sus rutas.`);
    return null;
  }
  return import(pathToFileURL(file).href);
}

/**
 * Crea la aplicación. `config` (opcional) sustituye a lo leído del entorno (pruebas): ver readServerConfig.
 */
export async function buildApp({ databaseUrl, logger = false, config: overrides = {}, watchSite, onRoute } = {}) {
  const config = { ...readServerConfig(), ...overrides };
  let pool;
  let ownPool = false;
  if (databaseUrl) {
    pool = new pg.Pool({ connectionString: databaseUrl });
    ownPool = true;
  } else {
    pool = (await import('./db.mjs')).pool;
  }
  // Un fallo de conexión ociosa no debe tumbar el proceso (la BD se reinicia, el healthcheck lo refleja).
  pool.on?.('error', (e) => console.error('[portal] Error de la conexión a la BD:', e.message));
  const db = { query: (s, p) => pool.query(s, p) };
  async function tx(fn) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }

  // Esquema idempotente al arrancar (migraciones incluidas). Si la BD aún no responde, se reintenta en la primera
  // petición a la API (ver más abajo) en vez de impedir el arranque: /healthz y el manual siguen disponibles.
  let schemaReady = null;
  const ensureSchema = () =>
    (schemaReady ??= applySchema(pool).catch((e) => {
      schemaReady = null;
      throw e;
    }));
  await ensureSchema().catch((e) => console.error('[portal] No se pudo aplicar el esquema de la BD (se reintentará):', e.message));

  // Ruta del panel (Adenda 5, «Ruta de administración oculta»).
  config.adminPath = parseAdminPath(config.adminPath);
  config.hideAdmin = config.hideAdmin === true || config.adminPath !== DEFAULT_ADMIN_PATH;
  if (config.adminPath !== DEFAULT_ADMIN_PATH) {
    let routes = null;
    try {
      routes = (await pool.query("SELECT route FROM pages WHERE status = 'published' AND deleted_at IS NULL")).rows.map((r) => r.route);
    } catch {}
    if (routes && adminPathCollision(config.adminPath, routes)) {
      if (ownPool) await pool.end().catch(() => {});
      throw new Error('PORTAL_ADMIN_PATH coincide con el comienzo de una página publicada del manual: elija otra ruta.');
    }
  }

  const app = Fastify({
    logger,
    bodyLimit: 5 * 1024 * 1024,
    trustProxy: normalizeTrustProxy(config.trustProxy),
    rewriteUrl(req) {
      const r = rewriteFor(req.url, { adminPath: config.adminPath, hidden: config.hideAdmin });
      req.portalVia = r.via;
      return r.url;
    },
  });
  // Sondeos: se cuentan con la IP real (respeta PORTAL_TRUST_PROXY); bloquean solo el panel y la API.
  // Auditoría de rutas (test/security.test.mjs): recibe TODAS las rutas que se registren después.
  if (onRoute) app.addHook('onRoute', onRoute);
  const probes = createProbeGuard({ threshold: config.probeThreshold ?? 20 });
  app.decorate('probes', probes);
  app.addHook('onRequest', async (request) => {
    const via = request.raw.portalVia ?? null;
    if (!isProbePath(request.originalUrl ?? request.url, { hidden: config.hideAdmin, via })) return;
    const ip = request.ip;
    const h = probes.hit(ip, requestPath(request.originalUrl ?? request.url) ?? "?");
    if (h.blockedNow) {
      console.warn('[portal] IP bloqueada para el panel por sondeos repetidos.');
      ctxRef.audit?.(null, 'security.probe', ip, { count: h.count, paths: h.paths, blockMinutes: 30 }).catch?.(() => {});
    }
  });
  const ctxRef = {};
  await app.register(compress, { global: true, threshold: 1024, encodings: ['br', 'gzip'] });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

  app.setErrorHandler((err, request, reply) => {
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    if (status >= 500 && err.expose === true) {
      return reply.code(status).send({ error: err.message, ...(err.extra || {}) });
    }
    if (status >= 500) {
      request.log.error(err);
      console.error('[portal] Error:', err.message);
      return reply.code(500).send({ error: 'Error interno del servidor.' });
    }
    let msg = err.message;
    if (err.code === 'FST_ERR_CTP_INVALID_JSON_BODY' || err.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' || err.code === 'FST_ERR_CTP_INVALID_CONTENT_LENGTH') msg = 'El cuerpo de la petición no es JSON válido.';
    else if (err.code === 'FST_ERR_CTP_BODY_TOO_LARGE') msg = 'La petición es demasiado grande.';
    else if (err.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') msg = 'Tipo de contenido no admitido.';
    else if (err.code === 'FST_REQ_FILE_TOO_LARGE') msg = 'La imagen supera el máximo de 10 MB.';
    return reply.code(status).send({ error: msg, ...(err.extra || {}) });
  });

  // Orden de los hooks onRequest: primero la puerta del panel (IPs / deshabilitado), después la sesión.
  registerAdminGate(app, config);
  app.addHook('onRequest', async (request) => {
    if (!isApiRequest(request)) return;
    try {
      await ensureSchema();
    } catch {
      throw httpError(503, 'La base de datos no está disponible. Inténtalo de nuevo en unos segundos.');
    }
  });
  const auth = createAuth({ db, tx, repoRoot: REPO_ROOT, config });
  const { audit, getSetting, requireRole, registerAuth, ensureAdmin } = auth;
  ctxRef.audit = audit;
  registerAuth(app);

  const ctx = { pool, db, tx, requireRole, audit, repoRoot: REPO_ROOT, getSetting, sync: null, databaseUrl: databaseUrl || process.env.DATABASE_URL, config, auth };
  if (watchSite !== undefined) ctx.watchSite = watchSite;
  // Manual dinámico (PORTAL_RENDER_MODE=dynamic, def.): motor SSR en memoria; OPS lo usa como ctx.site.
  if (config.renderMode !== 'static') {
    const { createDynamicSite } = await import('./ops/site-dynamic.mjs');
    // config.siteEngineFactory: solo pruebas (simular un motor o la falta del tema compilado).
    ctx.siteRuntime = await createDynamicSite({ ctx, logger: app.log, warmup: config.siteWarmup, cacheMb: config.siteCacheMb, cleanup: config.siteCleanup !== false, createEngine: config.siteEngineFactory ?? null });
    app.addHook('onClose', async () => ctx.siteRuntime?.close());
  }
  // El sitio, el panel y /healthz (antes de OPS: OPS usa ctx.servedBase).
  const frontend = await registerFrontend(app, ctx, { webDist: config.webDist, adminEnabled: config.adminEnabled, site: ctx.siteRuntime ?? null });
  ctx.servedBase = frontend.currentBase;
  ctx.frontend = frontend;

  registerPageRoutes(app, ctx);
  registerStructureRoutes(app, ctx);
  registerAssetRoutes(app, ctx);
  registerAdminRoutes(app, ctx);
  registerTourRoutes(app, ctx);
  registerAiRoutes(app, ctx);

  const syncMod = await optionalImport('sync/index.mjs');
  if (syncMod) ctx.sync = { exportToDir: syncMod.exportToDir, importFromRepo: syncMod.importFromRepo };
  if (syncMod?.registerSyncRoutes) await syncMod.registerSyncRoutes(app, ctx);
  const opsMod = await optionalImport('ops/index.mjs');
  if (opsMod?.registerOpsRoutes) await opsMod.registerOpsRoutes(app, ctx);
  await (await import('./content/routes.mjs')).registerContentRoutes(app, ctx);

  app.addHook('onClose', async () => {
    await ctx.shutdownOps?.().catch((e) => console.error('[portal] Apagado de OPS:', e.message));
    if (ownPool) await pool.end().catch(() => {});
  });
  app.decorate('portal', { ctx, ensureAdmin, config });
  return app;
}

/** Apagado ordenado ante SIGTERM/SIGINT: un segundo aviso o 20 s sin terminar fuerzan la salida. */
export function installShutdown(app, { exit = (c) => process.exit(c), timeoutMs = 20_000, signals = ['SIGTERM', 'SIGINT'] } = {}) {
  let stopping = false;
  const stop = async (signal) => {
    if (stopping) {
      console.warn(`[portal] ${signal} de nuevo: salida inmediata.`);
      return exit(1);
    }
    stopping = true;
    console.log(`[portal] ${signal}: apagado ordenado…`);
    const t = setTimeout(() => {
      console.warn('[portal] El apagado tarda demasiado: salida forzada.');
      exit(1);
    }, timeoutMs);
    t.unref?.();
    try {
      await app.close();
      clearTimeout(t);
      exit(0);
    } catch (e) {
      console.error('[portal] Error al apagar:', e.message);
      exit(1);
    }
  };
  for (const s of signals) process.on(s, () => stop(s));
  return stop;
}

async function main() {
  const app = await buildApp({ logger: { level: process.env.PORTAL_LOG_LEVEL || 'warn' } });
  await app.portal.ensureAdmin();
  const { port, host } = app.portal.config;
  // Tras un reinicio `respawn` el proceso anterior aún puede tener el puerto: se reintenta unos segundos.
  const { listenWithRetry } = await import('./ops/system.mjs');
  await listenWithRetry(() => app.listen({ port, host }), { port, host });
  console.log(`[portal] Escuchando en http://${host}:${port} (manual en /${app.portal.config.hideAdmin ? '; panel en la ruta de PORTAL_ADMIN_PATH' : ', panel en /admin/, API en /api/'})`);
  installShutdown(app);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((e) => {
    console.error('[portal] No se pudo iniciar:', e.message);
    process.exit(1);
  });
}
