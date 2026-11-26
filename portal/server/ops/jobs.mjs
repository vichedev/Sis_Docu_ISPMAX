// Trabajos en segundo plano registrados en `publish_jobs` (log incremental).
// Un solo trabajo `running` a la vez por tipo; al arrancar, los `running` huérfanos pasan a `error`.

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}

const OPS_KINDS = ['publish', 'git_update', 'backup'];

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

export function createJobs({ db }) {
  const activos = new Map(); // kind -> jobId (dentro de este proceso)

  /** Marca como `error` los trabajos que quedaron `running` por un reinicio del proceso. */
  // Respeta los de otro proceso vivo que comparta la BD (p. ej. dos servidores de pruebas): cada trabajo
  // guarda en su primera línea `[proceso <pid>]`.
  async function recoverOrphans(kinds = OPS_KINDS) {
    const running = await db.query(
      `SELECT id, substring(log from '^\\[proceso (\\d+)\\]')::int AS pid FROM publish_jobs WHERE status = 'running' AND kind = ANY($1::text[])`,
      [kinds],
    );
    const ids = running.rows.filter(j => !(j.pid && j.pid !== process.pid && pidAlive(j.pid))).map(j => j.id);
    if (!ids.length) return 0;
    const r = await db.query(
      `UPDATE publish_jobs
          SET status = 'error', finished_at = now(),
              log = log || E'\\n[interrumpido] El servidor se reinició mientras el trabajo estaba en curso.\\n'
        WHERE status = 'running' AND id = ANY($1::int[])
        RETURNING id`,
      [ids],
    );
    return r.rowCount;
  }

  /**
   * Libera los `running` de un tipo que ya no puede terminar nadie: su proceso murió (pid en la primera línea),
   * es de este proceso pero no está activo, o no tiene pid y empezó hace más de `staleMin` minutos.
   */
  async function reapStale(kind, { staleMin = 30 } = {}) {
    const r = await db.query(
      `SELECT id, substring(log from '^\\[proceso (\\d+)\\]')::int AS pid, started_at < now() - make_interval(mins => $2) AS old
         FROM publish_jobs WHERE status = 'running' AND kind = $1`,
      [kind, staleMin],
    );
    const ids = r.rows
      .filter(j => (j.pid ? (j.pid === process.pid ? activos.get(kind) !== j.id : !pidAlive(j.pid)) : j.old))
      .map(j => j.id);
    if (!ids.length) return 0;
    const u = await db.query(
      `UPDATE publish_jobs SET status = 'error', finished_at = now(),
              log = log || E'\\n[interrumpido] El proceso que ejecutaba este trabajo ya no existe.\\n'
        WHERE status = 'running' AND id = ANY($1::int[]) RETURNING id`,
      [ids],
    );
    return u.rowCount;
  }

  /** Apagado ordenado: los trabajos de este proceso que siguen en curso pasan a `error` (no quedan `running`). */
  async function interruptActive(motivo = 'El servidor se apagó mientras el trabajo estaba en curso.') {
    const ids = [...activos.values()].filter(id => id > 0);
    if (!ids.length) return 0;
    const r = await db.query(
      `UPDATE publish_jobs SET status = 'error', finished_at = now(), log = log || $2
        WHERE status = 'running' AND id = ANY($1::int[]) RETURNING id`,
      [ids, `\n[interrumpido] ${motivo}\n`],
    );
    return r.rowCount;
  }

  async function isRunning(kind) {
    if (activos.has(kind)) return true;
    const r = await db.query(`SELECT 1 FROM publish_jobs WHERE kind = $1 AND status = 'running' LIMIT 1`, [kind]);
    return r.rowCount > 0;
  }

  async function anyRunning() {
    if (activos.size) return true;
    const r = await db.query(`SELECT 1 FROM publish_jobs WHERE status = 'running' LIMIT 1`);
    return r.rowCount > 0;
  }

  /**
   * Crea el trabajo y ejecuta `fn({ log, jobId })` en segundo plano. Devuelve `{ jobId, done }`.
   * `done` es la promesa del resultado (la usan las rutas síncronas, como crear un respaldo).
   * Lanza ConflictError (409) si ya hay otro del mismo tipo en curso.
   */
  async function start(kind, userId, fn, conflictMsg) {
    if (activos.has(kind)) throw new ConflictError(conflictMsg || `Ya hay un trabajo "${kind}" en curso.`);
    activos.set(kind, 0); // reserva síncrona para evitar carreras dentro del proceso
    let jobId;
    try {
      await reapStale(kind).catch(() => {});
      const r = await db.query(
        `INSERT INTO publish_jobs (kind, status, user_id, log)
         SELECT $1, 'running', $2, $3
          WHERE NOT EXISTS (SELECT 1 FROM publish_jobs WHERE kind = $1 AND status = 'running')
         RETURNING id`,
        [kind, userId ?? null, `[proceso ${process.pid}]\n`],
      );
      if (!r.rowCount) throw new ConflictError(conflictMsg || `Ya hay un trabajo "${kind}" en curso.`);
      jobId = r.rows[0].id;
      activos.set(kind, jobId);
    } catch (e) {
      activos.delete(kind);
      throw e;
    }

    // Log incremental: se acumula y se vuelca a la BD cada ~400 ms, en orden.
    let buffer = '';
    let cadena = Promise.resolve();
    let timer = null;
    const flush = () => {
      timer = null;
      if (!buffer) return cadena;
      const chunk = buffer;
      buffer = '';
      cadena = cadena
        .then(() => db.query('UPDATE publish_jobs SET log = log || $2 WHERE id = $1', [jobId, chunk]))
        .catch(() => {});
      return cadena;
    };
    const log = (...parts) => {
      const line = parts.map(p => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ');
      buffer += line.endsWith('\n') ? line : line + '\n';
      if (!timer) timer = setTimeout(flush, 400);
    };
    log.raw = text => {
      buffer += text;
      if (!timer) timer = setTimeout(flush, 400);
    };

    const done = (async () => {
      let status = 'ok';
      let result;
      try {
        result = await fn({ log, jobId });
      } catch (e) {
        status = 'error';
        log(`ERROR: ${e?.message || e}`);
        result = { error: e };
      }
      if (timer) clearTimeout(timer);
      await flush();
      await db
        .query(`UPDATE publish_jobs SET status = $2, finished_at = now() WHERE id = $1`, [jobId, status])
        .catch(() => {});
      activos.delete(kind);
      return { status, ...result };
    })();
    return { jobId, done };
  }

  async function get(id) {
    const r = await db.query(
      `SELECT id, kind, status, log, user_id, started_at, finished_at FROM publish_jobs WHERE id = $1`,
      [id],
    );
    return r.rows[0] || null;
  }

  async function latest(kind) {
    const r = await db.query(
      `SELECT id, kind, status, log, user_id, started_at, finished_at FROM publish_jobs
        WHERE kind = $1 ORDER BY id DESC LIMIT 1`,
      [kind],
    );
    return r.rows[0] || null;
  }

  /** Inserta un trabajo ya terminado (p. ej. la restauración, que reemplaza la propia tabla). */
  async function record(kind, userId, status, logText) {
    const r = await db.query(
      `INSERT INTO publish_jobs (kind, status, user_id, log, finished_at) VALUES ($1, $2, $3, $4, now()) RETURNING id`,
      [kind, status, userId ?? null, logText],
    );
    return r.rows[0].id;
  }

  return { start, get, latest, isRunning, anyRunning, recoverOrphans, reapStale, record, interruptActive };
}
