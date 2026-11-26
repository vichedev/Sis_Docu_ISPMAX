// Respaldos de la BD del portal con pg_dump -Fc / pg_restore. La clave va solo en PGPASSWORD del proceso hijo.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { getInternal } from '../settings.mjs';
import { run, safeEnv } from './proc.mjs';
import { ConflictError } from './jobs.mjs';

const NAME_RE = /^ispmax-manual-\d{8}-\d{6}(-\d+)?\.dump$/;

function httpError(status, message) {
  const e = new Error(message);
  e.statusCode = status;
  return e;
}

/** DATABASE_URL → variables PG* para el hijo (sin exponer la clave en argumentos). */
export function pgEnv(databaseUrl) {
  if (!databaseUrl) throw new Error('DATABASE_URL no está definida.');
  const u = new URL(databaseUrl);
  const env = {
    PGHOST: u.hostname.replace(/^\[|\]$/g, '') || '127.0.0.1',
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username || 'postgres'),
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, '')),
  };
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  const ssl = u.searchParams.get('sslmode');
  if (ssl) env.PGSSLMODE = ssl;
  if (!env.PGDATABASE) throw new Error('DATABASE_URL no indica la base de datos.');
  return env;
}

/**
 * Ruta de pg_dump/pg_restore. Sin PG_DUMP_PATH (o vacía): el del PATH (en el contenedor, `postgresql17-client`).
 * Con PG_DUMP_PATH: pg_restore se busca en la misma carpeta y con la misma extensión (`.exe` en Windows).
 */
export function pgTool(name, { env = process.env, platform = process.platform } = {}) {
  const P = platform === 'win32' ? path.win32 : path.posix;
  const dump = String(env.PG_DUMP_PATH || '').trim() || 'pg_dump';
  if (name === 'pg_dump') return dump;
  const dir = P.dirname(dump);
  const ext = P.extname(dump);
  return dir && dir !== '.' ? P.join(dir, name + ext) : name;
}

/** Permisos 600 (archivo) / 700 (carpeta) en POSIX: los volcados contienen hashes de contraseñas. En Windows no aplica. */
export async function restrictFile(p, mode = 0o600) {
  if (process.platform === 'win32') return false;
  await fsp.chmod(p, mode).catch(() => {});
  return true;
}

const pad = n => String(n).padStart(2, '0');
function stamp(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function createBackups({ ctx, jobs }) {
  let restoring = false;
  const defaultUrl = () => ctx.databaseUrl || process.env.DATABASE_URL;

  async function dir() {
    const d = path.resolve(await getInternal(ctx, 'backup_dir')); // carpeta fija: <datos>/backups
    await fsp.mkdir(d, { recursive: true, mode: 0o700 });
    return d;
  }

  async function fileOf(row) {
    if (!row || !NAME_RE.test(row.filename)) throw httpError(404, 'Respaldo no encontrado.');
    const p = path.join(await dir(), row.filename);
    if (!fs.existsSync(p)) throw httpError(404, `El archivo del respaldo ${row.filename} no existe en disco.`);
    return p;
  }

  async function getRow(id) {
    const r = await ctx.db.query(`SELECT id, filename, size, user_id, created_at FROM backups WHERE id = $1 AND kind = 'db'`, [Number(id) || 0]);
    return r.rows[0] || null;
  }

  /** Comprueba que pg_restore lee el volcado; devuelve el nº de entradas del índice. */
  async function verify(file, log) {
    const r = await run(pgTool('pg_restore'), ['--list', file], { env: safeEnv(), timeoutMs: 120_000 });
    if (r.code !== 0) throw new Error(`pg_restore --list no pudo leer el volcado: ${r.stderr.trim().split('\n').pop()}`);
    const entries = r.stdout.split(/\r?\n/).filter(l => l && !l.startsWith(';')).length;
    if (!/^;/m.test(r.stdout)) throw new Error('pg_restore --list no reconoce el archivo como volcado.');
    log?.(`Verificado con pg_restore --list: ${entries} entradas.`);
    return entries;
  }

  async function dumpTo(databaseUrl, log) {
    const d = await dir();
    let base = `ispmax-manual-${stamp()}`;
    let filename = `${base}.dump`;
    for (let i = 2; fs.existsSync(path.join(d, filename)); i++) filename = `${base}-${i}.dump`;
    const final = path.join(d, filename);
    const partial = final + '.partial';
    const env = safeEnv(pgEnv(databaseUrl));
    log(`pg_dump -Fc de la base "${env.PGDATABASE}" en ${env.PGHOST}:${env.PGPORT} → ${filename}`);
    // Se crea antes con permisos 600: pg_dump reescribe el archivo y conserva sus permisos (nunca queda legible por otros).
    await fsp.writeFile(partial, '', { mode: 0o600 });
    await restrictFile(partial);
    const r = await run(pgTool('pg_dump'), ['-Fc', '--no-password', '-f', partial], {
      env,
      log,
      timeoutMs: 15 * 60_000,
      redact: [env.PGPASSWORD],
    });
    if (r.code !== 0) {
      await fsp.rm(partial, { force: true });
      throw new Error(`pg_dump terminó con código ${r.code}.`);
    }
    const { size } = await fsp.stat(partial);
    if (!size) {
      await fsp.rm(partial, { force: true });
      throw new Error('pg_dump generó un archivo vacío.');
    }
    try {
      await verify(partial, log);
    } catch (e) {
      await fsp.rm(partial, { force: true });
      throw e;
    }
    await fsp.rename(partial, final);
    await restrictFile(final);
    log(`Respaldo ${filename}: ${size} bytes.`);
    return { filename, size };
  }

  async function applyRetention(log, protect) {
    const keep = Math.max(1, Number(await ctx.getSetting('backup_keep', 20)) || 20);
    const r = await ctx.db.query(`SELECT id, filename FROM backups WHERE kind = 'db' ORDER BY created_at DESC, id DESC OFFSET $1`, [keep]);
    const d = await dir();
    for (const row of r.rows) {
      if (row.filename === protect) continue; // el respaldo que se está restaurando
      if (NAME_RE.test(row.filename)) await fsp.rm(path.join(d, row.filename), { force: true });
      await ctx.db.query('DELETE FROM backups WHERE id = $1', [row.id]);
      log?.(`Retención (${keep}): borrado ${row.filename}`);
    }
    return r.rowCount;
  }

  async function insertRow(filename, size, userId) {
    try {
      return (await ctx.db.query('INSERT INTO backups (filename, size, user_id) VALUES ($1, $2, $3) RETURNING id, created_at', [filename, size, userId ?? null])).rows[0];
    } catch (e) {
      if (e.code !== '23503') throw e; // usuario inexistente (p. ej. tras restaurar): sin autor
      return (await ctx.db.query('INSERT INTO backups (filename, size) VALUES ($1, $2) RETURNING id, created_at', [filename, size])).rows[0];
    }
  }

  /** Crea un respaldo como trabajo `backup` y espera a que termine. */
  async function create(userId, { databaseUrl = defaultUrl(), reason = 'manual', protect } = {}) {
    const { jobId, done } = await jobs.start(
      'backup',
      userId,
      async ({ log }) => {
        log(`Respaldo (${reason})`);
        const { filename, size } = await dumpTo(databaseUrl, log);
        const row = await insertRow(filename, size, userId);
        await applyRetention(log, protect);
        return { id: row.id, filename, size, created_at: row.created_at };
      },
      'Ya hay un respaldo en curso.',
    );
    const res = await done;
    if (res.status !== 'ok') {
      const e = httpError(500, `No se pudo crear el respaldo: ${res.error?.message || 'error'}`);
      e.jobId = jobId;
      throw e;
    }
    await ctx.audit(userId ?? null, 'backup.create', res.filename, { size: res.size, reason, jobId }).catch(() => {});
    return { id: res.id, filename: res.filename, size: Number(res.size), jobId };
  }

  async function list() {
    const r = await ctx.db.query(
      `SELECT b.id, b.filename, b.size, b.created_at, b.user_id, u.username AS user_name
         FROM backups b LEFT JOIN users u ON u.id = b.user_id
        WHERE b.kind = 'db'
        ORDER BY b.created_at DESC, b.id DESC`,
    );
    const d = await dir();
    const keep = Math.max(1, Number(await ctx.getSetting('backup_keep', 20)) || 20);
    return {
      keep,
      items: r.rows.map(b => ({ ...b, size: Number(b.size), exists: NAME_RE.test(b.filename) && fs.existsSync(path.join(d, b.filename)) })),
    };
  }

  async function download(id, reply) {
    const row = await getRow(id);
    const p = await fileOf(row);
    const { size } = await fsp.stat(p);
    reply
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Disposition', `attachment; filename="${row.filename}"`)
      .header('Content-Length', size)
      .header('Cache-Control', 'no-store');
    return reply.send(fs.createReadStream(p));
  }

  async function remove(id, userId) {
    if (restoring) throw new ConflictError('Hay una restauración en curso.');
    const row = await getRow(id);
    if (!row) throw httpError(404, 'Respaldo no encontrado.');
    if (NAME_RE.test(row.filename)) await fsp.rm(path.join(await dir(), row.filename), { force: true });
    await ctx.db.query('DELETE FROM backups WHERE id = $1', [row.id]);
    await ctx.audit(userId ?? null, 'backup.delete', row.filename, null).catch(() => {});
    return { ok: true };
  }

  /** Tras restaurar, la tabla `backups` vuelve a la del volcado: se reponen las filas de los archivos que siguen en disco. */
  async function reconcile(log) {
    const d = await dir();
    const r = await ctx.db.query(`SELECT id, filename FROM backups WHERE kind = 'db'`);
    const known = new Set(r.rows.map(x => x.filename));
    let added = 0;
    for (const f of (await fsp.readdir(d)).filter(f => NAME_RE.test(f)).sort()) {
      if (known.has(f)) continue;
      const st = await fsp.stat(path.join(d, f));
      await ctx.db.query('INSERT INTO backups (filename, size, created_at) VALUES ($1, $2, $3)', [f, st.size, st.mtime]);
      added++;
    }
    let removed = 0;
    for (const row of r.rows) {
      if (!fs.existsSync(path.join(d, row.filename))) {
        await ctx.db.query('DELETE FROM backups WHERE id = $1', [row.id]);
        removed++;
      }
    }
    log?.(`Lista de respaldos conciliada con la carpeta: +${added} / -${removed}.`);
  }

  /**
   * Restaura un respaldo sobre `targetUrl` (por defecto, la BD del portal). Antes hace un respaldo de seguridad de la base destino.
   * Es síncrona (no se registra como trabajo hasta terminar, porque pg_restore reemplaza la propia tabla publish_jobs).
   */
  async function restore(id, userId, { confirm, targetUrl = defaultUrl() } = {}) {
    if (confirm !== 'RESTAURAR') throw httpError(400, 'Para restaurar escriba exactamente RESTAURAR en la confirmación.');
    if (restoring) throw new ConflictError('Ya hay una restauración en curso.');
    if (await jobs.anyRunning()) throw new ConflictError('Hay un trabajo en curso (publicación, importación, Git o respaldo); espere a que termine.');
    const row = await getRow(id);
    const file = await fileOf(row);
    restoring = true;
    const lines = [];
    const log = (...p) => lines.push(p.join(' '));
    try {
      log(`Restauración de ${row.filename}`);
      if (!(await verify(file, log))) throw httpError(400, 'El respaldo está vacío (sin entradas); no se restaura.');
      log('Respaldo de seguridad previo de la base destino…');
      const safety = await create(userId, { databaseUrl: targetUrl, reason: `seguridad antes de restaurar ${row.filename}`, protect: row.filename });
      log(`Respaldo de seguridad: ${safety.filename} (${safety.size} bytes)`);
      const env = safeEnv(pgEnv(targetUrl));
      log(`pg_restore --clean --if-exists --single-transaction sobre "${env.PGDATABASE}"…`);
      const r = await run(
        pgTool('pg_restore'),
        ['--clean', '--if-exists', '--single-transaction', '--exit-on-error', '--no-owner', '--no-privileges', '--no-password', '-d', env.PGDATABASE, file],
        { env, log, timeoutMs: 30 * 60_000, redact: [env.PGPASSWORD] },
      );
      if (r.code !== 0) throw new Error(`pg_restore terminó con código ${r.code}; con --single-transaction la base queda como estaba.`);
      log('Restauración completada.');
      await reconcile(log);
      let jobId;
      try {
        jobId = await jobs.record('backup', userId, 'ok', lines.join('\n') + '\n');
      } catch {
        jobId = await jobs.record('backup', null, 'ok', lines.join('\n') + '\n');
      }
      await ctx
        .audit(userId ?? null, 'backup.restore', row.filename, { safety: safety.filename, database: env.PGDATABASE })
        .catch(() => ctx.audit(null, 'backup.restore', row.filename, { safety: safety.filename, database: env.PGDATABASE }).catch(() => {}));
      return { ok: true, restored: row.filename, safetyBackup: { id: safety.id, filename: safety.filename, size: safety.size }, jobId };
    } catch (e) {
      log(`ERROR: ${e.message}`);
      await jobs.record('backup', null, 'error', lines.join('\n') + '\n').catch(() => {});
      if (!e.statusCode) e.statusCode = 500;
      throw e;
    } finally {
      restoring = false;
    }
  }

  return { create, list, download, remove, restore, verify, dir, isRestoring: () => restoring };
}
