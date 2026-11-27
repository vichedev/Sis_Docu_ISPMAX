/*
 * Lógica pura del asistente de IA (sin imports; probada con `node --test test/ai.test.mjs`).
 * La IA propone; la persona aprueba: aquí solo hay estado del botón, mensajes de error, límites de entrada,
 * diferencias antes/después y la validación del formulario «Crear borrador».
 */

export type AssistAction = 'rewrite' | 'shorten' | 'expand' | 'fix' | 'steps' | 'custom';
export const ASSIST_ACTIONS: { id: AssistAction; label: string; hint: string }[] = [
  { id: 'rewrite', label: 'Reescribir', hint: 'Más claro y directo, mismo significado.' },
  { id: 'shorten', label: 'Acortar', hint: 'Solo lo esencial.' },
  { id: 'expand', label: 'Expandir', hint: 'Explicar mejor lo que ya dice, sin inventar.' },
  { id: 'fix', label: 'Corregir redacción', hint: 'Ortografía y puntuación, cambios mínimos.' },
  { id: 'steps', label: 'Convertir en pasos', hint: 'Lista numerada con un verbo por paso.' },
];
/** Mismos topes que el servidor (portal/server/ai/prompts.mjs). */
export const AI_LIMITS = { text: 12_000, instruction: 600, description: 4_000 };

export interface AiStatusLike { enabled: boolean; configured: boolean; model?: string }
export interface AiButtonState { disabled: boolean; help: string | null; settingsLink: boolean }

/** Estado del botón «Asistente IA». `status` null = aún sin respuesta; `failed` = no se pudo consultar. */
export function aiButtonState(status: AiStatusLike | null | undefined, role: string | undefined, failed = false): AiButtonState {
  const admin = role === 'admin';
  if (failed) return { disabled: true, help: 'No se pudo comprobar el asistente de IA.', settingsLink: false };
  if (!status) return { disabled: true, help: 'Comprobando el asistente de IA…', settingsLink: false };
  if (!status.configured) return { disabled: true, help: 'Configura la clave de IA en Ajustes', settingsLink: admin };
  if (!status.enabled) return { disabled: true, help: 'El asistente de IA está desactivado en Ajustes', settingsLink: admin };
  return { disabled: false, help: null, settingsLink: false };
}

export type AiErrorKind = 'rate' | 'config' | 'rejected' | 'network' | 'input' | 'auth' | 'other';
export interface AiErrorInfo { kind: AiErrorKind; message: string; retryAfter?: number; canRetry: boolean }

/** Traduce un error de la API a lo que se muestra en el panel (los mensajes del servidor ya vienen en español). */
export function aiErrorInfo(status: number, message: string, data?: unknown): AiErrorInfo {
  const code = data && typeof data === 'object' ? (data as { code?: unknown }).code : undefined;
  const retryAfter = data && typeof data === 'object' && typeof (data as { retryAfter?: unknown }).retryAfter === 'number' ? (data as { retryAfter: number }).retryAfter : undefined;
  if (status === 0) return { kind: 'network', message: 'No se pudo conectar con el servidor del portal.', canRetry: true };
  if (code === 'AI_RATE_LIMIT' || status === 429) return { kind: 'rate', message, retryAfter, canRetry: false };
  if (code === 'AI_DISABLED') return { kind: 'config', message, canRetry: false };
  if (code === 'AI_KEY_INVALID') return { kind: 'config', message, canRetry: false };
  if (code === 'AI_REJECTED' || status === 422) return { kind: 'rejected', message, canRetry: true };
  if (status === 400 || status === 413) return { kind: 'input', message, canRetry: false };
  if (status === 401) return { kind: 'auth', message, canRetry: false };
  return { kind: 'other', message, canRetry: true };
}

export interface SourceCheck { ok: boolean; reason: string | null }
/** ¿Se puede enviar este texto a la IA? */
export function checkSource(text: string, action: AssistAction, instruction: string): SourceCheck {
  if (!text.trim()) return { ok: false, reason: 'Selecciona un bloque con texto o pega el texto a procesar.' };
  if (text.length > AI_LIMITS.text) return { ok: false, reason: `El texto es demasiado largo (${text.length} de ${AI_LIMITS.text} caracteres). Selecciona un bloque más pequeño.` };
  if (instruction.length > AI_LIMITS.instruction) return { ok: false, reason: `La instrucción es demasiado larga (máx. ${AI_LIMITS.instruction} caracteres).` };
  if (action === 'custom' && !instruction.trim()) return { ok: false, reason: 'Escribe qué quieres que haga la IA.' };
  return { ok: true, reason: null };
}

/** Bloques que no tienen texto para la IA (imágenes, tours, divisores). */
export const NON_TEXT_BLOCKS = new Set(['image', 'imageRow', 'tour', 'divider', 'searchTerms']);

export type DiffKind = 'same' | 'del' | 'add';
export interface DiffLine { kind: DiffKind; text: string }
/** Diferencia por líneas (LCS) para la vista previa antes/después. Para textos muy grandes marca todo como cambiado. */
export function lineDiff(before: string, after: string): { before: DiffLine[]; after: DiffLine[]; changed: boolean } {
  const a = before.replace(/\r\n/g, '\n').split('\n');
  const b = after.replace(/\r\n/g, '\n').split('\n');
  if (a.length * b.length > 250_000) {
    return { before: a.map((text) => ({ kind: 'del', text })), after: b.map((text) => ({ kind: 'add', text })), changed: before !== after };
  }
  const n = a.length;
  const m = b.length;
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i]![j] = a[i] === b[j] ? t[i + 1]![j + 1]! + 1 : Math.max(t[i + 1]![j]!, t[i]![j + 1]!);
  const L: DiffLine[] = [];
  const R: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { L.push({ kind: 'same', text: a[i]! }); R.push({ kind: 'same', text: b[j]! }); i++; j++; }
    else if (t[i + 1]![j]! >= t[i]![j + 1]!) L.push({ kind: 'del', text: a[i++]! });
    else R.push({ kind: 'add', text: b[j++]! });
  }
  while (i < n) L.push({ kind: 'del', text: a[i++]! });
  while (j < m) R.push({ kind: 'add', text: b[j++]! });
  return { before: L, after: R, changed: L.some((x) => x.kind !== 'same') || R.some((x) => x.kind !== 'same') };
}

export const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);

// ---- Crear página con IA
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
export const slugOf = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
export const routeOf = (seccion: string, modulo: string | null | undefined, slug: string): string => '/' + [seccion, modulo || null, slug].filter(Boolean).join('/');

export interface DraftForm { title: string; slug: string; description: string; tipo: string; seccion: string; modulo: string; grupo: string; parentId: number | null; body: string }
export interface ProposalLike { title: string; slug: string; description: string; tipo: string; seccion: string; modulo: string | null; grupo: string; parentId: number | null; body: string }
export const draftFormFrom = (p: ProposalLike): DraftForm => ({ title: p.title, slug: p.slug, description: p.description, tipo: p.tipo, seccion: p.seccion, modulo: p.modulo ?? '', grupo: p.grupo, parentId: p.parentId, body: p.body });

/** Problemas que impiden crear el borrador (mensajes para la persona). */
export function draftProblems(f: DraftForm): string[] {
  const out: string[] = [];
  if (!f.title.trim()) out.push('Falta el título.');
  if (!SLUG_RE.test(f.slug)) out.push('La dirección solo admite minúsculas, números y guiones.');
  if (f.seccion === 'tareas' && !f.modulo.trim()) out.push('Las tareas necesitan un módulo.');
  if (f.modulo && !SLUG_RE.test(f.modulo)) out.push('El módulo solo admite minúsculas, números y guiones.');
  return out;
}

/** Cuerpo de POST /api/pages (siempre nace como borrador: el servidor no admite otro estado al crear). */
export function createPayload(f: DraftForm): Record<string, unknown> {
  return {
    seccion: f.seccion, slug: f.slug, title: f.title.trim(), description: f.description.trim(), tipo: f.tipo,
    ...(f.modulo.trim() ? { modulo: f.modulo.trim() } : {}),
    ...(f.grupo.trim() ? { grupo: f.grupo.trim() } : {}),
    ...(f.parentId ? { parent_id: f.parentId } : {}),
  };
}

/** Pone el título editado en el encabezado `# …` de la propuesta (escapa `{ } <`, que MDX interpretaría). */
export function bodyWithTitle(body: string, title: string): string {
  const t = title.trim().replace(/\s+/g, ' ').replace(/[{}<]/g, (c) => '\\' + c);
  return body.replace(/^# .*$/m, () => `# ${t}`);
}

// ---- Chat conversacional
export const CHAT_LIMITS = { messages: 12, chars: 12_000, message: 4000, selection: 6000, pageBody: 60_000 };

export type ChatItem =
  | { id: number; kind: 'user'; text: string }
  | { id: number; kind: 'assistant'; text: string; streaming?: boolean; messageId?: number | null; choices?: { question: string; options: { label: string; value: string }[] } | null; rejected?: { kind: string; reason: string }[] }
  | { id: number; kind: 'activity'; steps: { id: number; label: string; state: 'start' | 'done' | 'failed' }[] }
  | { id: number; kind: 'proposal'; proposal: unknown; sentBody?: string; state: 'pending' | 'applied' | 'discarded' | 'error'; error?: string; openPageId?: number; messageId?: number | null; index?: number; expired?: boolean }
  | { id: number; kind: 'rewrite'; before: string; after: string; avisos: string[]; blockId: string | null; replaces: boolean; state: 'pending' | 'applied' | 'discarded' }
  | { id: number; kind: 'note'; text: string }
  | { id: number; kind: 'error'; message: string; errKind: string; retry?: boolean };

/**
 * Historial que se envía al servidor: turnos del usuario y respuestas del asistente, más las notas de lo que la
 * persona aplicó o descartó (como mensajes del asistente), acotado a los últimos mensajes y a un total de caracteres.
 * Siempre termina en un mensaje del usuario y nunca empieza con el asistente.
 */
export function buildHistory(items: ChatItem[], limits = CHAT_LIMITS): { role: 'user' | 'assistant'; content: string }[] {
  const raw: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const it of items) {
    if (it.kind === 'user') raw.push({ role: 'user', content: it.text.slice(0, limits.message) });
    else if (it.kind === 'assistant' && it.text.trim()) raw.push({ role: 'assistant', content: it.text.slice(0, limits.message) });
    else if (it.kind === 'note') raw.push({ role: 'assistant', content: `[Nota del editor] ${it.text}`.slice(0, limits.message) });
  }
  // fusiona consecutivos del mismo rol (el modelo admite alternancia libre, pero así se ahorra tamaño)
  const merged: typeof raw = [];
  for (const m of raw) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content = `${last.content}\n${m.content}`.slice(0, limits.message);
    else merged.push({ ...m });
  }
  let out = merged.slice(-limits.messages);
  let total = out.reduce((n, m) => n + m.content.length, 0);
  while (out.length > 1 && total > limits.chars) { total -= out[0]!.content.length; out = out.slice(1); }
  while (out.length && out[0]!.role === 'assistant') out = out.slice(1);
  return out;
}

/** Contexto de cada turno: página abierta (con su texto actual si cabe) y bloque seleccionado (acotado). */
export function buildContext(page: { id: number; title: string; route: string; seccion: string } | null | undefined, body: string | null | undefined, sel: { type: string; mdx: string } | null | undefined, mentions: { id: number; title: string; route: string }[] = []) {
  const ctx: { page?: { id: number; title: string; route: string; seccion: string; body?: string }; selection?: { type: string; text: string }; mentions?: { id: number; title: string; route: string }[] } = {};
  if (page) {
    ctx.page = { id: page.id, title: page.title.slice(0, 200), route: page.route.slice(0, 300), seccion: page.seccion.slice(0, 40) };
    if (typeof body === 'string' && body.length <= CHAT_LIMITS.pageBody) ctx.page.body = body;
  }
  if (mentions.length) ctx.mentions = mentions.slice(0, 5).map((x) => ({ id: x.id, title: x.title.slice(0, 200), route: x.route.slice(0, 300) }));
  if (sel && sel.mdx.trim()) ctx.selection = { type: sel.type, text: sel.mdx.slice(0, CHAT_LIMITS.selection) };
  return ctx;
}

export const CHIP_TEXT: Record<string, string> = {
  create: 'Quiero crear una página nueva. ',
  improve: 'Revisa esta página y propón mejoras de redacción y claridad, sin inventar datos.',
  outline: '¿Qué secciones y grupos tiene el manual y qué hay en cada una?',
};

/** ¿Se puede aplicar una propuesta de edición a la página abierta tal como la vio el servidor? */
export function editStillValid(sentBody: string | undefined, currentBody: string): boolean {
  return typeof sentBody === 'string' && sentBody === currentBody;
}

export const proposalKindLabel = (k: string): string => (k === 'create' ? 'Página nueva' : k === 'edit' ? 'Edición' : k === 'move' ? 'Mover' : 'Propuesta');

// ---- Fase 3: identidad de grupos, SSE, markdown seguro, atajos y tarjetas editables

/** Mismo criterio que el servidor (server/routes/groups.mjs): sin mayúsculas, acentos, emoji ni signos. */
export function normName(s: string): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export interface OutlineLike { key: string; label?: string; modulos?: string[]; grupos: { name: string; pages: { id: number; title: string; route?: string }[] }[] }
/** Nombre canónico del grupo existente de la sección que corresponde a `name`, o null. */
export function resolveGroupClient(outline: OutlineLike[], seccion: string, name: string): string | null {
  const n = normName(name);
  if (!n) return null;
  const sec = outline.find((s) => s.key === seccion);
  return sec?.grupos.find((g) => normName(g.name) === n)?.name ?? null;
}
export const groupNames = (outline: OutlineLike[], seccion: string): string[] => outline.find((s) => s.key === seccion)?.grupos.map((g) => g.name) ?? [];

/** Parte un búfer SSE en eventos completos y el resto sin terminar. */
export function parseSse(buf: string): { events: { event: string; data: unknown }[]; rest: string } {
  const parts = buf.replace(/\r\n/g, '\n').split('\n\n');
  const rest = parts.pop() ?? '';
  const events: { event: string; data: unknown }[] = [];
  for (const block of parts) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (!data.length) continue;
    try { events.push({ event, data: JSON.parse(data.join('\n')) }); } catch { /* evento mal formado: se ignora */ }
  }
  return { events, rest };
}

// ---- Markdown seguro (negrita, cursiva, código, listas): se convierte en nodos, nunca en HTML
export type MdInline = { t: 'text' | 'b' | 'i' | 'code'; v: string };
export type MdBlock = { type: 'p'; inline: MdInline[] } | { type: 'ul' | 'ol'; items: MdInline[][] } | { type: 'code'; text: string };
export function mdInline(s: string): MdInline[] {
  const out: MdInline[] = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|(?<![*\w])\*[^*\n]+\*(?!\*)|(?<![\w])_[^_\n]+_(?![\w]))/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last) out.push({ t: 'text', v: s.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('`')) out.push({ t: 'code', v: tok.slice(1, -1) });
    else if (tok.startsWith('**')) out.push({ t: 'b', v: tok.slice(2, -2) });
    else out.push({ t: 'i', v: tok.slice(1, -1) });
    last = m.index! + tok.length;
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
  return out;
}
export function parseMd(text: string): MdBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push({ type: 'p', inline: mdInline(para.join('\n')) }); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^```/.test(line)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!)) code.push(lines[i++]!);
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    const li = /^\s*([-*]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      flush();
      const type = /\d/.test(li[1]!) ? 'ol' : 'ul';
      const last = blocks[blocks.length - 1];
      if (last && last.type === type) last.items.push(mdInline(li[2]!));
      else blocks.push({ type, items: [mdInline(li[2]!)] });
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    para.push(line);
  }
  flush();
  return blocks;
}

// ---- Entrada: comandos «/» y menciones «@»
export const SLASH_COMMANDS: { cmd: string; label: string; text: string; send?: boolean }[] = [
  { cmd: '/crear', label: 'Crear una página nueva', text: 'Crea una página nueva ' },
  { cmd: '/mejorar', label: 'Mejorar la redacción de esta página', text: 'Revisa esta página y propón mejoras de redacción y claridad, sin inventar datos.' },
  { cmd: '/mover', label: 'Mover una página', text: 'Mueve la página ' },
  { cmd: '/secciones', label: 'Ver las secciones y grupos', text: '¿Qué secciones y grupos tiene el manual y qué hay en cada una?', send: true },
];
/** Comandos que coinciden con lo escrito (solo si el texto entero es «/algo»). */
export function matchCommands(input: string): typeof SLASH_COMMANDS {
  const m = /^\/([a-záéíóúñ]*)$/i.exec(input);
  if (!m) return [];
  const q = m[1]!.toLowerCase();
  return SLASH_COMMANDS.filter((c) => c.cmd.slice(1).startsWith(q));
}
/** Mención en curso al final del texto: «@Intro» → { start, query }. */
export function mentionQuery(input: string): { start: number; query: string } | null {
  const m = /(^|\s)@([^\s@]{0,40})$/.exec(input);
  return m ? { start: input.length - m[2]!.length - 1, query: m[2]! } : null;
}
export function applyMention(input: string, title: string): string {
  const q = mentionQuery(input);
  if (!q) return input;
  return `${input.slice(0, q.start)}@${title.replace(/\s+/g, ' ').trim()} `;
}
/** Menciones que siguen en el texto enviado (máx. 5). */
export function activeMentions<T extends { title: string }>(text: string, list: T[]): T[] {
  return list.filter((m, i) => list.findIndex((x) => x.title === m.title) === i && text.includes('@' + m.title.replace(/\s+/g, ' ').trim())).slice(0, 5);
}

/** Atajos de arranque según la página abierta. */
export interface StartChip { id: string; label: string; prompt?: string; action?: 'shorten' | 'prefill'; needs?: 'selection' }
export function contextChips(page: { status?: string; bodyLength?: number } | null | undefined, hasSelection: boolean): StartChip[] {
  const chips: StartChip[] = [];
  if (page) {
    if ((page.bodyLength ?? 0) < 120) chips.push({ id: 'first', label: 'Escribir el primer borrador', prompt: 'Escribe un primer borrador de esta página a partir de su título y su estructura. Pregúntame lo que necesites antes de inventar nada.' });
    else if (page.status === 'published') chips.push({ id: 'improve', label: 'Revisar y mejorar la redacción', prompt: 'Revisa esta página y propón mejoras de redacción y claridad, sin inventar datos.' });
    else chips.push({ id: 'polish', label: 'Completar y pulir este borrador', prompt: 'Revisa este borrador: dime qué falta para publicarlo y propón los cambios de redacción necesarios, sin inventar datos.' });
  }
  chips.push({ id: 'create', label: 'Crear una página en una sección', action: 'prefill', prompt: 'Quiero crear una página nueva. ' });
  chips.push({ id: 'outline', label: '¿Qué secciones hay?', prompt: '¿Qué secciones y grupos tiene el manual y qué hay en cada una?' });
  if (hasSelection) chips.push({ id: 'shorten', label: 'Acortar el bloque seleccionado', action: 'shorten', needs: 'selection' });
  return chips;
}

// ---- Tarjeta de página nueva: formulario editable
export const NEW_GROUP = '__nuevo';
export const NO_GROUP = '__sin';
export interface CardForm { title: string; slug: string; description: string; tipo: string; seccion: string; modulo: string; groupSel: string; newGroup: string; confirmNew: boolean }
export interface CardProposalLike { title: string; slug: string; description: string; tipo: string; seccion: string; modulo: string | null; grupo: string; newGroup?: boolean; parentId: number | null; body: string }
export function cardFormFrom(p: CardProposalLike, outline: OutlineLike[]): CardForm {
  const existing = p.grupo ? resolveGroupClient(outline, p.seccion, p.grupo) : null;
  const isNew = !!p.grupo && (existing === null);
  return { title: p.title, slug: p.slug, description: p.description, tipo: p.tipo, seccion: p.seccion, modulo: p.modulo ?? '', groupSel: p.grupo ? (isNew ? NEW_GROUP : existing!) : NO_GROUP, newGroup: isNew ? p.grupo : '', confirmNew: false };
}
/** Nombre de grupo final del formulario ('' = sin grupo). */
export function cardGroup(f: CardForm): string {
  return f.groupSel === NO_GROUP ? '' : f.groupSel === NEW_GROUP ? f.newGroup.trim() : f.groupSel;
}
/** Problemas del formulario (además de los de draftProblems). Un grupo nuevo exige su confirmación y no puede duplicar uno existente. */
export function cardProblems(f: CardForm, outline: OutlineLike[]): string[] {
  const out: string[] = [];
  if (f.groupSel === NEW_GROUP) {
    const name = f.newGroup.trim();
    if (!name) out.push('Escribe el nombre del grupo nuevo.');
    else {
      const dup = resolveGroupClient(outline, f.seccion, name);
      if (dup) out.push(`Ya existe el grupo «${dup}»: elígelo en la lista en vez de crear uno casi igual.`);
      else if (!f.confirmNew) out.push(`Confirma que quieres crear el grupo nuevo «${name}».`);
    }
  }
  return out;
}
/** Formulario → datos para createDraft. Si cambió la sección o el grupo, la subsección (parentId) se descarta. */
export function cardToDraft(f: CardForm, p: CardProposalLike, outline: OutlineLike[]): DraftForm {
  let grupo = cardGroup(f);
  const canon = grupo ? resolveGroupClient(outline, f.seccion, grupo) : null;
  if (canon) grupo = canon;
  const sameSpot = f.seccion === p.seccion && grupo === p.grupo;
  return { title: f.title, slug: f.slug, description: f.description, tipo: f.tipo, seccion: f.seccion, modulo: f.modulo, grupo, parentId: sameSpot ? p.parentId : null, body: p.body };
}

// ---- Historial guardado → elementos del chat
export function itemsFromConversation(messages: { id: number; role: string; content: string; proposals: { kind: string; state: string; expired?: boolean; openPageId?: number; summary?: string }[] | null; choices: { question: string; options: { label: string; value: string }[] } | null }[], firstId = 1): ChatItem[] {
  const out: ChatItem[] = [];
  let id = firstId;
  for (const m of messages) {
    if (m.role === 'user') { out.push({ id: id++, kind: 'user', text: m.content }); continue; }
    out.push({ id: id++, kind: 'assistant', text: m.content, messageId: m.id, ...(m.choices ? { choices: m.choices } : {}) });
    (m.proposals ?? []).forEach((p, index) => {
      out.push({ id: id++, kind: 'proposal', proposal: p, state: p.state === 'applied' ? 'applied' : p.state === 'discarded' ? 'discarded' : 'pending', messageId: m.id, index, expired: p.expired === true, openPageId: p.openPageId });
      if (p.state === 'applied') out.push({ id: id++, kind: 'note', text: `Se aplicó la propuesta: ${p.summary ?? p.kind}` });
      else if (p.state === 'discarded') out.push({ id: id++, kind: 'note', text: `La persona descartó la propuesta: ${p.summary ?? p.kind}.` });
    });
  }
  return out;
}

/** Fecha corta del historial: «hoy 14:05», «ayer», «12 nov». */
export function shortDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return '';
  const day = (x: Date) => Math.floor(+new Date(x.getFullYear(), x.getMonth(), x.getDate()) / 86_400_000);
  const diff = day(now) - day(d);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diff === 0) return `hoy ${hm}`;
  if (diff === 1) return `ayer ${hm}`;
  return `${d.getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]}`;
}
