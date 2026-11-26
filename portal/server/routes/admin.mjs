// Estadísticas, ajustes, usuarios y auditoría.
import { passwordProblems, POLICY_SUMMARY } from '../passwordPolicy.mjs';
import { httpError, SECCIONES, parseId, intParam, isPlainObject } from './util.mjs';
import { INTERNAL_KEYS, INTERNAL_MESSAGE } from '../settings.mjs';
import { normalizeWhatsapp } from '../ops/branding.mjs';

// Únicos ajustes editables desde el panel. El resto (ruta del repositorio, Git, reinicio, compilación, respaldos, base de
// rutas) los fija el despliegue por variables de entorno (server/settings.mjs).
const DEFINITIONS = [
  { key: 'site_title', section: 'general', label: 'Nombre del manual', help: 'Nombre que se muestra en la barra superior y en la pestaña del navegador del manual publicado. Déjalo vacío para usar «Manual ISPMAX».', type: 'string', max: 80, def: '' },
  { key: 'contact_whatsapp', section: 'general', label: 'WhatsApp de soporte', help: 'Número al que lleva el enlace «Soporte» y el botón de WhatsApp del manual, con código de país (por ejemplo +593 95 996 7843). Déjalo vacío para usar el número actual del manual.', type: 'string', def: '' },
  { key: 'auto_publish', section: 'manual', label: 'Actualizar el manual al guardar', help: 'Al guardar un cambio en algo ya publicado, el manual se actualiza solo en segundo plano. Los borradores no cambian el manual publicado.', type: 'boolean', def: true },
  { key: 'auto_publish_delay', section: 'manual', label: 'Espera antes de actualizar (segundos)', help: 'Segundos sin cambios antes de actualizar el manual (de 1 a 120). Si guardas varias veces seguidas, se juntan en una sola actualización.', type: 'number', min: 1, max: 120, def: 8 },
  { key: 'require_2fa_for_admins', section: 'seguridad', label: 'Exigir verificación en dos pasos a los administradores', help: 'Los administradores sin verificación en dos pasos solo podrán activarla al iniciar sesión; hasta entonces no podrán usar el panel. Actívala en tu cuenta antes de exigirla.', type: 'boolean', def: false },
  { key: 'backup_keep', section: 'respaldos', label: 'Copias a conservar', help: 'Cuántas copias se guardan de cada tipo (copias completas y paquetes de contenido, por separado) antes de borrar las más antiguas. Siempre se conserva la más reciente. De 1 a 1000.', type: 'number', min: 1, max: 1000, def: 20 },
];
const DEF_BY_KEY = Object.fromEntries(DEFINITIONS.map((d) => [d.key, d]));
const SITE_KEYS = ['site_title', 'contact_whatsapp'];

const ROLES = ['admin', 'editor', 'viewer'];
const USER_RE = /^[A-Za-z0-9._-]{3,40}$/;

// Solo del manual estático (construcción tras cada cambio): en el dinámico guardar ya es publicar y no se ofrecen.
const STATIC_ONLY = new Set(['auto_publish', 'auto_publish_delay']);

export function registerAdminRoutes(app, ctx) {
  const { db, tx, requireRole, audit } = ctx;
  const viewer = { preHandler: requireRole('viewer') };
  const admin = { preHandler: requireRole('admin') };
  const dynamic = () => ctx.config?.renderMode !== 'static';
  const defs = () => (dynamic() ? DEFINITIONS.filter((d) => !STATIC_ONLY.has(d.key)) : DEFINITIONS);

  // ---- estadísticas
  app.get('/api/stats', viewer, async () => {
    const live = dynamic();
    const [p, a, u, lp, lb, bs, un] = await Promise.all([
      db.query("SELECT count(*)::int AS pages, count(*) FILTER (WHERE status = 'draft')::int AS drafts FROM pages WHERE deleted_at IS NULL"),
      db.query('SELECT count(*)::int AS n FROM assets'),
      db.query('SELECT count(*)::int AS n FROM users WHERE active'),
      db.query("SELECT status, finished_at FROM publish_jobs WHERE kind = 'publish' ORDER BY id DESC LIMIT 1"),
      db.query('SELECT filename, created_at FROM backups ORDER BY id DESC LIMIT 1'),
      db.query('SELECT seccion, count(*)::int AS count FROM pages WHERE deleted_at IS NULL GROUP BY seccion ORDER BY seccion'),
      // Elementos modificados desde que empezó el último trabajo `publish` con estado ok (o todos si nunca hubo).
      db.query(
        `WITH s AS (SELECT started_at FROM publish_jobs WHERE kind = 'publish' AND status = 'ok' ORDER BY id DESC LIMIT 1)
         SELECT (SELECT count(*)::int FROM pages WHERE updated_at > COALESCE((SELECT started_at FROM s), '-infinity')) AS pages,
                (SELECT count(*)::int FROM assets WHERE updated_at > COALESCE((SELECT started_at FROM s), '-infinity')) AS assets,
                (SELECT count(*)::int FROM tours WHERE updated_at > COALESCE((SELECT started_at FROM s), '-infinity')) AS tours`
      ),
    ]);
    const order = SECCIONES.map((s) => s.key);
    const bySeccion = bs.rows.sort((x, y) => (order.indexOf(x.seccion) + 1 || 99) - (order.indexOf(y.seccion) + 1 || 99));
    return {
      pages: p.rows[0].pages,
      drafts: p.rows[0].drafts,
      assets: a.rows[0].n,
      users: u.rows[0].n,
      // Manual dinámico: no hay construcciones; todo lo guardado ya está en el manual (los borradores van en `drafts`).
      lastPublish: live ? null : lp.rows[0] || null,
      lastBackup: lb.rows[0] || null,
      bySeccion,
      unpublished: live ? { pages: 0, assets: 0, tours: 0, total: 0 } : { ...un.rows[0], total: un.rows[0].pages + un.rows[0].assets + un.rows[0].tours },
      renderMode: live ? 'dynamic' : 'static',
    };
  });

  // ---- ajustes
  async function allSettings() {
    const list = defs();
    const r = await db.query('SELECT key, value FROM settings WHERE key = ANY($1::text[])', [list.map((x) => x.key)]);
    const stored = Object.fromEntries(r.rows.map((x) => [x.key, x.value]));
    const out = {};
    for (const d of list) {
      const v = d.key in stored ? stored[d.key] : d.def;
      out[d.key] = d.type === 'string' ? (typeof v === 'string' ? v : '') : d.type === 'boolean' ? (typeof v === 'boolean' ? v : d.def) : Number.isInteger(v) ? v : d.def;
    }
    return out;
  }

  app.get('/api/settings', admin, async () => ({
    settings: await allSettings(),
    definitions: defs().map(({ key, section, label, help, type, options, min, max }) => ({
      key, label, help, type, section, ...(options ? { options } : {}), ...(max !== undefined ? { ...(min !== undefined ? { min } : {}), max } : {}),
    })),
  }));

  app.put('/api/settings', admin, async (request) => {
    const b = request.body;
    if (!isPlainObject(b)) throw httpError(400, 'Envía un objeto {clave: valor}.');
    const entries = [];
    for (const [k, raw] of Object.entries(b)) {
      if (INTERNAL_KEYS.includes(k)) throw httpError(400, INTERNAL_MESSAGE);
      const d = DEF_BY_KEY[k];
      if (!d) throw httpError(400, `Ajuste desconocido: ${k}.`);
      if (dynamic() && STATIC_ONLY.has(k)) throw httpError(400, `El ajuste ${k} no aplica: el manual se actualiza al guardar, sin construcciones.`);
      let v = raw;
      if (d.type === 'string') {
        if (typeof v !== 'string') throw httpError(400, `El ajuste ${k} debe ser texto.`);
        v = v.trim();
        if (k === 'site_title' && v.length > d.max) throw httpError(400, `El nombre del manual admite hasta ${d.max} caracteres.`);
        if (k === 'site_title' && /[\u0000-\u001f<>]/.test(v)) throw httpError(400, 'El nombre del manual no puede contener saltos de línea ni los signos < >.');
        if (k === 'contact_whatsapp') {
          const n = normalizeWhatsapp(v);
          if (n === null) throw httpError(400, 'El WhatsApp debe ser un número con código de país, de 8 a 15 dígitos (por ejemplo +593 95 996 7843).');
          v = n;
        }
      }
      if (d.type === 'boolean' && typeof v !== 'boolean') throw httpError(400, `El ajuste ${k} debe ser verdadero o falso.`);
      if (d.type === 'number' && !(Number.isInteger(v) && v >= d.min && v <= d.max)) throw httpError(400, `El ajuste ${k} debe ser un entero entre ${d.min} y ${d.max}.`);
      entries.push([k, v]);
    }
    const before = await allSettings();
    await tx(async (c) => {
      for (const [k, v] of entries) {
        await c.query(
          `INSERT INTO settings (key, value, updated_by) VALUES ($1,$2,$3)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
          [k, JSON.stringify(v), request.user.id]
        );
      }
    });
    await audit(request.user.id, 'settings.update', null, { keys: entries.map(([k]) => k) });
    ctx.auth?.invalidateSettings?.();
    const after = await allSettings();
    try {
      // Título y WhatsApp están en el manual publicado: actualizarlo (dinámico: repintar; estático: reconstruir).
      // Los de la programación: reprogramar.
      if (SITE_KEYS.some((k) => before[k] !== after[k])) ctx.site?.markDirty?.('ajustes del sitio');
      if (before.auto_publish !== after.auto_publish || before.auto_publish_delay !== after.auto_publish_delay) await ctx.site?.settingsChanged?.();
    } catch {}
    return { settings: after };
  });

  // ---- usuarios
  const USER_COLS = 'id, username, display_name, role, active, created_at, totp_enabled AS "twoFactor", must_change_password AS "mustChangePassword"';

  async function otherActiveAdmins(c, exceptId) {
    return (await c.query("SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND active AND id <> $1", [exceptId])).rows[0].n;
  }
  // Política única (server/passwordPolicy.mjs): 400 {error, problems}.
  function checkPassword(p, username) {
    const problems = passwordProblems(p, username);
    if (problems.length) throw httpError(400, `La contraseña no cumple la política: ${problems[0]}`, { problems, policy: POLICY_SUMMARY });
  }
  const hashPassword = (p) => ctx.auth.hashPassword(p);

  app.get('/api/users', admin, async () => ({ items: (await db.query(`SELECT ${USER_COLS} FROM users ORDER BY username`)).rows }));

  app.post('/api/users', admin, async (request, reply) => {
    const b = request.body || {};
    if (typeof b.username !== 'string' || !USER_RE.test(b.username)) throw httpError(400, 'Usuario no válido (3 a 40 caracteres: letras, números, punto, guion).');
    checkPassword(b.password, b.username);
    if (!ROLES.includes(b.role)) throw httpError(400, 'Rol no válido (admin, editor o viewer).');
    const display = b.display_name === undefined ? '' : b.display_name;
    if (typeof display !== 'string' || display.length > 100) throw httpError(400, 'Nombre no válido.');
    const hash = await hashPassword(b.password);
    let r;
    try {
      r = await db.query(`INSERT INTO users (username, display_name, password_hash, role, password_changed_at) VALUES ($1,$2,$3,$4, now()) RETURNING ${USER_COLS}`, [b.username, display, hash, b.role]);
    } catch (e) {
      if (e.code === '23505') throw httpError(409, 'Ya existe un usuario con ese nombre.');
      throw e;
    }
    await audit(request.user.id, 'user.create', b.username, { role: b.role });
    reply.code(201);
    return r.rows[0];
  });

  app.put('/api/users/:id', admin, async (request) => {
    const id = parseId(request.params.id);
    const b = request.body || {};
    if (b.role !== undefined && !ROLES.includes(b.role)) throw httpError(400, 'Rol no válido.');
    if (b.display_name !== undefined && (typeof b.display_name !== 'string' || b.display_name.length > 100)) throw httpError(400, 'Nombre no válido.');
    if (b.active !== undefined && typeof b.active !== 'boolean') throw httpError(400, 'El campo active debe ser verdadero o falso.');
    if (b.password !== undefined) {
      const target = (await db.query('SELECT username FROM users WHERE id = $1', [id])).rows[0];
      if (!target) throw httpError(404, 'Usuario no encontrado.');
      checkPassword(b.password, target.username);
    }
    const hash = b.password !== undefined ? await hashPassword(b.password) : null;
    // Si un admin fija la contraseña de OTRA persona, esa persona debe cambiarla al entrar (el admin la conoce).
    const forceChange = hash !== null && id !== request.user.id;
    const r = await tx(async (c) => {
      const cur = (await c.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!cur) throw httpError(404, 'Usuario no encontrado.');
      const role = b.role ?? cur.role;
      const active = b.active ?? cur.active;
      if (cur.role === 'admin' && cur.active && (role !== 'admin' || !active) && (await otherActiveAdmins(c, id)) === 0) {
        throw httpError(409, 'No se puede dejar el sistema sin un administrador activo.');
      }
      if (id === request.user.id && !active) throw httpError(409, 'No puedes desactivar tu propia cuenta.');
      const u = await c.query(
        `UPDATE users SET display_name = $2, role = $3, active = $4, password_hash = COALESCE($5, password_hash),
           must_change_password = CASE WHEN $5::text IS NULL THEN must_change_password ELSE $6 END,
           password_changed_at = CASE WHEN $5::text IS NULL THEN password_changed_at ELSE now() END
         WHERE id = $1 RETURNING ${USER_COLS}`,
        [id, b.display_name ?? cur.display_name, role, active, hash, forceChange]
      );
      // Desactivar, cambiar la contraseña o cambiar de rol cierra sus sesiones.
      if (!active || hash || role !== cur.role) await c.query('DELETE FROM sessions WHERE user_id = $1', [id]);
      return u.rows[0];
    });
    await audit(request.user.id, 'user.update', r.username, { fields: Object.keys(b).filter((k) => k !== 'password'), password: b.password !== undefined });
    return r;
  });

  app.delete('/api/users/:id', admin, async (request) => {
    const id = parseId(request.params.id);
    if (id === request.user.id) throw httpError(409, 'No puedes eliminar tu propia cuenta.');
    const name = await tx(async (c) => {
      const cur = (await c.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!cur) throw httpError(404, 'Usuario no encontrado.');
      if (cur.role === 'admin' && cur.active && (await otherActiveAdmins(c, id)) === 0) throw httpError(409, 'No se puede dejar el sistema sin un administrador activo.');
      for (const [t, col] of [['pages', 'updated_by'], ['page_revisions', 'user_id'], ['assets', 'updated_by'], ['settings', 'updated_by'], ['publish_jobs', 'user_id'], ['backups', 'user_id'], ['audit_log', 'user_id']]) {
        await c.query(`UPDATE ${t} SET ${col} = NULL WHERE ${col} = $1`, [id]);
      }
      await c.query('DELETE FROM users WHERE id = $1', [id]);
      return cur.username;
    });
    await audit(request.user.id, 'user.delete', name);
    return { ok: true };
  });

  // ---- auditoría
  app.get('/api/audit', admin, async (request) => {
    const limit = intParam(request.query.limit, 50, 1, 500);
    const offset = intParam(request.query.offset, 0, 0, 1e9);
    const params = [];
    let w = '';
    if (request.query.action) {
      params.push(String(request.query.action).slice(0, 100));
      w = 'WHERE a.action = $1';
    }
    const total = (await db.query(`SELECT count(*)::int AS n FROM audit_log a ${w}`, params)).rows[0].n;
    params.push(limit, offset);
    const r = await db.query(
      `SELECT a.id, a.user_id, u.username, a.action, a.target, a.detail, a.created_at FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id ${w} ORDER BY a.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { total, items: r.rows };
  });
}
