// Historial de conversaciones del asistente. Cada persona ve SOLO las suyas (toda consulta filtra por user_id).
// Se guarda lo mínimo: texto de los turnos, las propuestas validadas (sin el cuerpo completo de las ediciones) y su estado.
// Nunca claves. No va al paquete .ispmax, ni a la auditoría, ni a los respaldos pg_dump (datos excluidos a propósito).
import { httpError } from '../routes/util.mjs';

export const MAX_CONVERSATIONS = 200;
export const MAX_MESSAGES = 200;

export function historyDays(env = process.env) {
  const v = String(env.PORTAL_AI_HISTORY_DAYS ?? '').trim();
  if (v === '') return 90;
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n >= 0 && n <= 3650 ? n : 90; // 0 = sin caducidad
}

/** Título automático: el primer mensaje, en una línea y acortado en una palabra entera. */
export function autoTitle(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= 60) return t || 'Conversación';
  const cut = t.slice(0, 60);
  return cut.replace(/\s+\S*$/, '') + '…';
}

/** Lo que se guarda de una propuesta: sin el cuerpo completo de una edición (puede ser enorme y quedaría desfasado). */
export function storableProposal(p) {
  const { after, ...rest } = p;
  return { ...rest, ...(p.kind === 'edit' ? { expired: true } : {}), state: 'pending' };
}

export function createHistory(db) {
  const conv = async (userId, id) => {
    const r = await db.query('SELECT id::int AS id, title, page_id, created_at, updated_at FROM ai_conversations WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!r.rowCount) throw httpError(404, 'Conversación no encontrada.');
    return r.rows[0];
  };
  return {
    conv,
    async create(userId, { title = '', pageId = null } = {}) {
      // Tope por persona: se borran las más antiguas.
      await db.query(
        `DELETE FROM ai_conversations WHERE user_id = $1 AND id IN (SELECT id FROM ai_conversations WHERE user_id = $1 ORDER BY updated_at DESC OFFSET $2)`,
        [userId, MAX_CONVERSATIONS - 1]
      );
      const pg = pageId ? (await db.query('SELECT id FROM pages WHERE id = $1', [pageId])).rows[0]?.id ?? null : null;
      const r = await db.query('INSERT INTO ai_conversations (user_id, title, page_id) VALUES ($1,$2,$3) RETURNING id::int AS id, title, page_id, created_at, updated_at', [userId, String(title).slice(0, 120), pg]);
      return r.rows[0];
    },
    async list(userId, { q = '', limit = 30, offset = 0 } = {}) {
      const like = q ? '%' + String(q).slice(0, 100).replace(/[\\%_]/g, (c) => '\\' + c) + '%' : null;
      const where = like ? 'AND (c.title ILIKE $2 OR EXISTS (SELECT 1 FROM ai_messages m WHERE m.conversation_id = c.id AND m.content ILIKE $2))' : '';
      const params = like ? [userId, like] : [userId];
      const total = (await db.query(`SELECT count(*)::int AS n FROM ai_conversations c WHERE c.user_id = $1 ${where}`, params)).rows[0].n;
      const r = await db.query(
        `SELECT c.id::int AS id, c.title, c.page_id, c.created_at, c.updated_at, p.title AS page_title, p.route AS page_route,
                (SELECT count(*)::int FROM ai_messages m WHERE m.conversation_id = c.id) AS messages
           FROM ai_conversations c LEFT JOIN pages p ON p.id = c.page_id
          WHERE c.user_id = $1 ${where} ORDER BY c.updated_at DESC, c.id DESC LIMIT ${Number(limit) | 0} OFFSET ${Number(offset) | 0}`,
        params
      );
      return { total, items: r.rows };
    },
    async open(userId, id) {
      const c = await conv(userId, id);
      const m = await db.query('SELECT id::int AS id, role, content, proposals, choices, created_at FROM ai_messages WHERE conversation_id = $1 ORDER BY id', [id]);
      return { conversation: c, messages: m.rows };
    },
    async rename(userId, id, title) {
      await conv(userId, id);
      await db.query('UPDATE ai_conversations SET title = $2 WHERE id = $1', [id, title]);
    },
    async remove(userId, id) {
      await conv(userId, id);
      await db.query('DELETE FROM ai_conversations WHERE id = $1 AND user_id = $2', [id, userId]);
    },
    async removeAll(userId) {
      return (await db.query('DELETE FROM ai_conversations WHERE user_id = $1', [userId])).rowCount;
    },
    /** Guarda un turno (mensaje de la persona + respuesta). Con `regenerate` reemplaza las respuestas posteriores al último mensaje de la persona. */
    async saveTurn(userId, id, { userText, regenerate, reply, proposals, choices }) {
      await conv(userId, id);
      const n = (await db.query('SELECT count(*)::int AS n FROM ai_messages WHERE conversation_id = $1', [id])).rows[0].n;
      if (!regenerate && n >= MAX_MESSAGES) throw httpError(413, 'La conversación es demasiado larga. Empieza una nueva.');
      if (regenerate) {
        await db.query(
          `DELETE FROM ai_messages WHERE conversation_id = $1 AND role = 'assistant' AND id > COALESCE((SELECT max(id) FROM ai_messages WHERE conversation_id = $1 AND role = 'user'), 0)`,
          [id]
        );
      } else await db.query("INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,'user',$2)", [id, userText]);
      const stored = proposals?.length ? JSON.stringify(proposals.map(storableProposal)) : null;
      const r = await db.query(
        "INSERT INTO ai_messages (conversation_id, role, content, proposals, choices) VALUES ($1,'assistant',$2,$3,$4) RETURNING id::int AS id",
        [id, reply, stored, choices ? JSON.stringify(choices) : null]
      );
      await db.query('UPDATE ai_conversations SET updated_at = now() WHERE id = $1', [id]);
      return r.rows[0].id;
    },
    /** Estado de una propuesta (aplicada o descartada) en un mensaje de MI conversación. */
    async setProposalState(userId, messageId, index, state, extra = {}) {
      const r = await db.query(
        `SELECT m.id, m.proposals FROM ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id WHERE m.id = $1 AND c.user_id = $2`,
        [messageId, userId]
      );
      const list = r.rows[0]?.proposals;
      if (!r.rowCount || !Array.isArray(list) || !list[index]) throw httpError(404, 'Propuesta no encontrada.');
      list[index] = { ...list[index], state, ...(extra.openPageId ? { openPageId: extra.openPageId } : {}) };
      await db.query('UPDATE ai_messages SET proposals = $2 WHERE id = $1', [messageId, JSON.stringify(list)]);
    },
    /** Poda por antigüedad (0 días = nunca). Devuelve cuántas conversaciones se borraron. */
    async prune(days) {
      if (!days) return 0;
      return (await db.query("DELETE FROM ai_conversations WHERE updated_at < now() - make_interval(days => $1)", [days])).rowCount;
    },
  };
}
