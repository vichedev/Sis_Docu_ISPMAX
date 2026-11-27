// Lógica pura del asistente de IA del panel (src/features/ai/aiModel.ts): estado del botón, errores, límites,
// diferencias antes/después y formulario «Crear borrador». node --test portal/web/test/ai.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aiButtonState, aiErrorInfo, checkSource, lineDiff, wordCount, slugOf, routeOf, draftProblems, createPayload, draftFormFrom, bodyWithTitle,
  ASSIST_ACTIONS, AI_LIMITS, NON_TEXT_BLOCKS,
} from '../src/features/ai/aiModel.ts';
import { SETTINGS_SECTIONS } from '../src/routes/paths.ts';
import { parseMdx, serializeBlocks } from '../src/lib/blocks/index.ts';

test('botón del asistente: deshabilitado con ayuda si falta la clave; el enlace a Ajustes solo para administradores', () => {
  assert.deepEqual(aiButtonState({ enabled: true, configured: true }, 'editor'), { disabled: false, help: null, settingsLink: false });
  const noKey = aiButtonState({ enabled: false, configured: false }, 'admin');
  assert.equal(noKey.disabled, true);
  assert.equal(noKey.help, 'Configura la clave de IA en Ajustes');
  assert.equal(noKey.settingsLink, true);
  assert.equal(aiButtonState({ enabled: false, configured: false }, 'editor').settingsLink, false);
  const off = aiButtonState({ enabled: false, configured: true }, 'admin');
  assert.match(off.help, /desactivado en Ajustes/);
  assert.equal(aiButtonState(null, 'editor').disabled, true);
  assert.match(aiButtonState(null, 'editor', true).help, /No se pudo comprobar/);
  // no revela nada más que lo indicado
  assert.doesNotMatch(JSON.stringify(noKey), /gsk_|clave guardada|groq/i);
});

test('errores de la API → mensajes y comportamiento del panel', () => {
  const rate = aiErrorInfo(429, 'Llegaste al límite', { code: 'AI_RATE_LIMIT', retryAfter: 120 });
  assert.equal(rate.kind, 'rate');
  assert.equal(rate.retryAfter, 120);
  assert.equal(rate.canRetry, false);
  assert.equal(aiErrorInfo(502, 'x', { code: 'AI_KEY_INVALID' }).kind, 'config');
  assert.equal(aiErrorInfo(503, 'x', { code: 'AI_DISABLED' }).kind, 'config');
  const rej = aiErrorInfo(422, 'descartada', { code: 'AI_REJECTED' });
  assert.equal(rej.kind, 'rejected');
  assert.equal(rej.canRetry, true);
  assert.equal(aiErrorInfo(504, 'tardó', { code: 'AI_TIMEOUT' }).canRetry, true);
  assert.equal(aiErrorInfo(0, '').kind, 'network');
  assert.equal(aiErrorInfo(413, 'largo').kind, 'input');
  assert.equal(aiErrorInfo(400, 'mal').kind, 'input');
  assert.equal(aiErrorInfo(401, 'x').kind, 'auth');
  assert.equal(aiErrorInfo(500, 'x').kind, 'other');
});

test('texto de origen: vacío, demasiado largo, instrucción obligatoria en «custom»', () => {
  assert.equal(checkSource('', 'rewrite', '').ok, false);
  assert.equal(checkSource('   ', 'rewrite', '').ok, false);
  assert.equal(checkSource('hola', 'rewrite', '').ok, true);
  const big = checkSource('x'.repeat(AI_LIMITS.text + 1), 'rewrite', '');
  assert.equal(big.ok, false);
  assert.match(big.reason, /demasiado largo/);
  assert.equal(checkSource('hola', 'custom', '').ok, false);
  assert.equal(checkSource('hola', 'custom', 'más corto').ok, true);
  assert.equal(checkSource('hola', 'rewrite', 'y'.repeat(AI_LIMITS.instruction + 1)).ok, false);
  assert.deepEqual(ASSIST_ACTIONS.map((a) => a.id), ['rewrite', 'shorten', 'expand', 'fix', 'steps']);
  assert.ok(NON_TEXT_BLOCKS.has('image') && NON_TEXT_BLOCKS.has('tour') && !NON_TEXT_BLOCKS.has('paragraph'));
});

test('vista previa antes/después: diferencia por líneas', () => {
  const same = lineDiff('a\nb', 'a\nb');
  assert.equal(same.changed, false);
  assert.ok(same.before.every((l) => l.kind === 'same'));
  const d = lineDiff('uno\ndos\ntres', 'uno\nDOS\ntres\ncuatro');
  assert.equal(d.changed, true);
  assert.deepEqual(d.before.map((l) => l.kind), ['same', 'del', 'same']);
  assert.deepEqual(d.after.map((l) => l.kind), ['same', 'add', 'same', 'add']);
  assert.equal(d.after[1].text, 'DOS');
  assert.equal(lineDiff('a\r\nb', 'a\nb').changed, false);
  const huge = lineDiff(Array.from({ length: 800 }, (_, i) => `l${i}`).join('\n'), Array.from({ length: 800 }, (_, i) => `m${i}`).join('\n'));
  assert.ok(huge.before.every((l) => l.kind === 'del') && huge.changed);
  assert.equal(wordCount('  uno dos\ttres\n'), 3);
  assert.equal(wordCount(''), 0);
});

test('crear borrador: slug, ruta, validación y cuerpo del POST (siempre borrador, sin status)', () => {
  assert.equal(slugOf('Cómo registrar un Cobro!'), 'como-registrar-un-cobro');
  assert.equal(routeOf('tareas', 'clientes', 'cobro'), '/tareas/clientes/cobro');
  assert.equal(routeOf('guia', '', 'pantalla'), '/guia/pantalla');
  const p = { title: 'Registrar un cobro', slug: 'registrar-un-cobro', description: 'Una frase.', tipo: 'tarea', seccion: 'tareas', modulo: 'clientes', grupo: '', parentId: null, body: '# Registrar un cobro\n\ntexto' };
  const f = draftFormFrom(p);
  assert.deepEqual(draftProblems(f), []);
  assert.deepEqual(createPayload(f), { seccion: 'tareas', slug: 'registrar-un-cobro', title: 'Registrar un cobro', description: 'Una frase.', tipo: 'tarea', modulo: 'clientes' });
  assert.ok(!('status' in createPayload(f)), 'el estado lo decide el servidor: borrador');
  assert.deepEqual(draftProblems({ ...f, modulo: '' }), ['Las tareas necesitan un módulo.']);
  assert.ok(draftProblems({ ...f, title: ' ' }).includes('Falta el título.'));
  assert.ok(draftProblems({ ...f, slug: 'Mal Slug' }).length > 0);
  assert.ok(draftProblems({ ...f, modulo: 'Mal Módulo' }).length > 0);
  assert.equal(createPayload({ ...f, seccion: 'guia', modulo: '', grupo: 'General', parentId: 7 }).parent_id, 7);
  assert.equal(createPayload({ ...f, seccion: 'guia', modulo: '', grupo: 'General', parentId: 7 }).grupo, 'General');
  assert.ok(!('modulo' in createPayload({ ...f, seccion: 'guia', modulo: '' })));
  assert.deepEqual(draftProblems({ ...f, seccion: 'guia', modulo: '' }), []);
});

test('el título editado se refleja en el encabezado de la propuesta sin romper el MDX', () => {
  const body = '<Kicker>Quiero hacer…</Kicker>\n\n# Título viejo\n\n## Pasos\n\ntexto';
  const out = bodyWithTitle(body, '  Cobrar {a} <b> cliente  ');
  assert.match(out, /^# Cobrar \\\{a\\\} \\<b> cliente$/m);
  assert.equal(bodyWithTitle(body, 'Nuevo').split('\n')[2], '# Nuevo');
  assert.equal(bodyWithTitle('sin encabezado', 'X'), 'sin encabezado');
  // el motor de bloques sigue leyendo y reescribiendo la propuesta byte a byte
  assert.equal(serializeBlocks(parseMdx(out)), out);
});

test('Ajustes tiene la sección «ia»', () => {
  assert.ok(SETTINGS_SECTIONS.includes('ia'));
});

test('el texto de una propuesta con pasos y avisos pasa por el motor de bloques (parse → serialize idéntico)', () => {
  const body = '<Kicker>Quiero hacer… · clientes</Kicker>\n\n# Registrar un cobro\n\n<Lead>Registra el pago.</Lead>\n\n## Pasos\n\n<Steps>\n<Step>\n\n**Abrir el cliente**\n\nEntrar a **Clientes**.\n\n</Step>\n</Steps>\n\n| Campo | Uso |\n| --- | --- |\n| Monto | Valor |\n\n:::info Pendiente de validación\n\nFalta confirmar.\n\n:::\n';
  const blocks = parseMdx(body);
  assert.equal(serializeBlocks(blocks), body);
  const types = blocks.map((b) => b.type);
  assert.ok(types.includes('steps') && types.includes('callout') && types.includes('table') && types.includes('lead'), types.join(','));
});

// ---- chat conversacional (fase 2)
import { buildHistory, buildContext, editStillValid, CHAT_LIMITS, proposalKindLabel } from '../src/features/ai/aiModel.ts';

test('chat: el historial enviado alterna roles, incluye las notas de lo aplicado y termina en el usuario', () => {
  const items = [
    { id: 1, kind: 'user', text: 'crea una página' },
    { id: 2, kind: 'assistant', text: '¿En qué sección?' },
    { id: 3, kind: 'user', text: 'en Inicio' },
    { id: 4, kind: 'assistant', text: 'Propongo crearla.' },
    { id: 5, kind: 'proposal', proposal: { kind: 'create' }, state: 'applied' },
    { id: 6, kind: 'note', text: 'Se creó el borrador «test de vice».' },
    { id: 7, kind: 'error', message: 'x', errKind: 'rate' },
    { id: 8, kind: 'user', text: 'ahora muévela' },
  ];
  const h = buildHistory(items);
  assert.deepEqual(h.map((m) => m.role), ['user', 'assistant', 'user', 'assistant', 'user']);
  assert.match(h[3].content, /Propongo crearla\.\n\[Nota del editor\] Se creó el borrador/);
  assert.equal(h[4].content, 'ahora muévela');
  assert.ok(!JSON.stringify(h).includes('proposal'), 'las tarjetas no viajan');
});

test('chat: el historial se acota por mensajes y por caracteres y nunca empieza con el asistente', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ id: i, kind: i % 2 ? 'assistant' : 'user', text: `m${i}` }));
  many.push({ id: 99, kind: 'user', text: 'último' });
  const h = buildHistory(many);
  assert.ok(h.length <= CHAT_LIMITS.messages);
  assert.equal(h[0].role, 'user');
  assert.equal(h[h.length - 1].content.endsWith('último'), true);
  const big = [{ id: 1, kind: 'user', text: 'a'.repeat(4000) }, { id: 2, kind: 'assistant', text: 'b'.repeat(4000) }, { id: 3, kind: 'user', text: 'c'.repeat(4000) }, { id: 4, kind: 'assistant', text: 'd'.repeat(4000) }, { id: 5, kind: 'user', text: 'fin' }];
  const hb = buildHistory(big);
  assert.ok(hb.reduce((n, m) => n + m.content.length, 0) <= CHAT_LIMITS.chars);
  assert.equal(hb[hb.length - 1].content, 'fin');
  assert.equal(hb[0].role, 'user');
  assert.deepEqual(buildHistory([]), []);
});

test('chat: contexto con la página abierta, su texto si cabe y el bloque seleccionado acotado', () => {
  const page = { id: 7, title: 'Clientes', route: '/guia/clientes', seccion: 'guia' };
  assert.deepEqual(buildContext(page, 'texto', null), { page: { ...page, body: 'texto' } });
  assert.equal(buildContext(page, 'x'.repeat(CHAT_LIMITS.pageBody + 1), null).page.body, undefined);
  assert.deepEqual(buildContext(null, null, null), {});
  const c = buildContext(page, 'b', { type: 'paragraph', mdx: 'y'.repeat(9000) });
  assert.equal(c.selection.text.length, CHAT_LIMITS.selection);
  assert.equal(buildContext(page, 'b', { type: 'paragraph', mdx: '  ' }).selection, undefined);
});

test('chat: una edición de la página abierta solo se aplica si el texto no cambió desde la propuesta', () => {
  assert.equal(editStillValid('abc', 'abc'), true);
  assert.equal(editStillValid('abc', 'abcd'), false);
  assert.equal(editStillValid(undefined, 'abc'), false);
  assert.equal(proposalKindLabel('move'), 'Mover');
});

// ---- fase 3: grupos, SSE, markdown seguro, atajos, tarjetas editables, historial
import {
  normName, resolveGroupClient, groupNames, parseSse, parseMd, mdInline, matchCommands, mentionQuery, applyMention, activeMentions, contextChips,
  cardFormFrom, cardGroup, cardProblems, cardToDraft, itemsFromConversation, shortDate, NEW_GROUP, NO_GROUP,
} from '../src/features/ai/aiModel.ts';

const OUTLINE = [{ key: 'guia', grupos: [{ name: '🚀 INICIO', pages: [{ id: 1, title: 'Introducción' }] }, { name: 'General', pages: [] }] }, { key: 'tareas', grupos: [{ name: 'Clientes', pages: [] }] }];

test('grupos: «inicio», «INICIO», «Inicio », «início» resuelven al grupo existente con emoji (mismo criterio que el servidor)', () => {
  for (const v of ['inicio', 'INICIO', 'Inicio ', 'início', '🚀 inicio']) assert.equal(resolveGroupClient(OUTLINE, 'guia', v), '🚀 INICIO', v);
  assert.equal(resolveGroupClient(OUTLINE, 'guia', 'Marketing'), null);
  assert.equal(resolveGroupClient(OUTLINE, 'tareas', 'inicio'), null, 'solo dentro de la sección');
  assert.equal(normName('Acceso  y   navegación'), 'acceso y navegacion');
  assert.deepEqual(groupNames(OUTLINE, 'guia'), ['🚀 INICIO', 'General']);
});

test('tarjeta de página nueva: el grupo existente sale preseleccionado; uno nuevo exige confirmación y no puede duplicar', () => {
  const p = { title: 'test de vice', slug: 'test-de-vice', description: '', tipo: 'guia', seccion: 'guia', modulo: null, grupo: '🚀 INICIO', newGroup: false, parentId: null, body: '# test de vice\n' };
  const f = cardFormFrom(p, OUTLINE);
  assert.equal(f.groupSel, '🚀 INICIO');
  assert.deepEqual(cardProblems(f, OUTLINE), []);
  assert.equal(cardToDraft(f, p, OUTLINE).grupo, '🚀 INICIO');
  const g = { ...f, groupSel: 'General' };
  assert.equal(cardToDraft(g, p, OUTLINE).grupo, 'General');
  assert.equal(cardToDraft(g, { ...p, parentId: 9 }, OUTLINE).parentId, null, 'al cambiar de lugar se pierde la subsección');
  assert.equal(cardToDraft(f, { ...p, parentId: 9 }, OUTLINE).parentId, 9);
  assert.equal(cardGroup({ ...f, groupSel: NO_GROUP }), '');
  const n = { ...f, groupSel: NEW_GROUP, newGroup: 'Marketing', confirmNew: false };
  assert.match(cardProblems(n, OUTLINE)[0], /Confirma que quieres crear el grupo nuevo «Marketing»/);
  assert.deepEqual(cardProblems({ ...n, confirmNew: true }, OUTLINE), []);
  assert.deepEqual(cardProblems({ ...n, newGroup: ' ' }, OUTLINE), ['Escribe el nombre del grupo nuevo.']);
  assert.match(cardProblems({ ...n, newGroup: 'inicio', confirmNew: true }, OUTLINE)[0], /Ya existe el grupo «🚀 INICIO»/);
  assert.equal(cardToDraft({ ...n, newGroup: 'inicio', confirmNew: true }, p, OUTLINE).grupo, '🚀 INICIO', 'aun así se resuelve al existente');
  const pn = cardFormFrom({ ...p, grupo: 'Marketing', newGroup: true }, OUTLINE);
  assert.equal(pn.groupSel, NEW_GROUP);
  assert.equal(pn.newGroup, 'Marketing');
  assert.equal(cardFormFrom({ ...p, grupo: 'inicio' }, OUTLINE).groupSel, '🚀 INICIO');
});

test('SSE: eventos completos, el resto sin terminar y datos mal formados ignorados', () => {
  const a = parseSse('event: meta\ndata: {"conversation_id":3}\n\nevent: delta\ndata: {"text":"ho');
  assert.deepEqual(a.events, [{ event: 'meta', data: { conversation_id: 3 } }]);
  assert.equal(a.rest, 'event: delta\ndata: {"text":"ho');
  const b = parseSse(a.rest + 'la"}\n\nevent: x\ndata: {malo}\n\nevent: done\r\ndata: {"reply":"ok"}\r\n\r\n');
  assert.deepEqual(b.events.map((e) => e.event), ['delta', 'done']);
  assert.equal(b.events[0].data.text, 'hola');
  assert.equal(parseSse('').events.length, 0);
});

test('markdown seguro: negrita, cursiva, código y listas; el HTML queda como texto', () => {
  const blocks = parseMd('Hola **mundo** y *tú* con `código`.\n\n- uno\n- dos\n\n1. a\n2. b\n\n```\nx < y\n```\n<script>alert(1)</script>');
  assert.deepEqual(blocks.map((b) => b.type), ['p', 'ul', 'ol', 'code', 'p']);
  assert.deepEqual(blocks[0].inline.map((n) => n.t), ['text', 'b', 'text', 'i', 'text', 'code', 'text']);
  assert.equal(blocks[1].items.length, 2);
  assert.equal(blocks[3].text, 'x < y');
  const last = blocks[4].inline;
  assert.ok(last.every((n) => n.t === 'text') && last.map((n) => n.v).join('').includes('<script>'), 'se muestra como texto, no se interpreta');
  assert.deepEqual(mdInline('a_b_c y **x**').map((n) => n.t), ['text', 'b'], 'guion bajo dentro de palabra no es cursiva');
});

test('entrada: comandos «/», menciones «@» y atajos de arranque', () => {
  assert.deepEqual(matchCommands('/').map((c) => c.cmd), ['/crear', '/mejorar', '/mover', '/secciones']);
  assert.deepEqual(matchCommands('/me').map((c) => c.cmd), ['/mejorar']);
  assert.deepEqual(matchCommands('/xyz'), []);
  assert.deepEqual(matchCommands('crea /algo'), []);
  assert.deepEqual(mentionQuery('compara con @Intro'), { start: 12, query: 'Intro' });
  assert.deepEqual(mentionQuery('@'), { start: 0, query: '' });
  assert.equal(mentionQuery('correo a@b.com'), null);
  assert.equal(applyMention('compara con @Intro', 'Introducción'), 'compara con @Introducción ');
  const list = [{ id: 1, title: 'Introducción', route: '/a' }, { id: 2, title: 'Otra', route: '/b' }];
  assert.deepEqual(activeMentions('mira @Introducción por favor', list).map((m) => m.id), [1]);
  assert.deepEqual(activeMentions('sin menciones', list), []);
  assert.equal(contextChips({ status: 'draft', bodyLength: 10 }, false)[0].label, 'Escribir el primer borrador');
  assert.equal(contextChips({ status: 'published', bodyLength: 900 }, false)[0].label, 'Revisar y mejorar la redacción');
  assert.equal(contextChips({ status: 'draft', bodyLength: 900 }, false)[0].label, 'Completar y pulir este borrador');
  assert.deepEqual(contextChips(null, false).map((c) => c.id), ['create', 'outline']);
  assert.ok(contextChips({ status: 'draft', bodyLength: 900 }, true).some((c) => c.id === 'shorten'));
  assert.deepEqual(buildContext(null, null, null, [{ id: 1, title: 'A', route: '/a' }]).mentions, [{ id: 1, title: 'A', route: '/a' }]);
});

test('historial guardado → elementos del chat (con el estado de cada propuesta) y fechas cortas', () => {
  const msgs = [
    { id: 1, role: 'user', content: 'crea una página', proposals: null, choices: null },
    { id: 2, role: 'assistant', content: '¿En qué grupo?', proposals: null, choices: { question: '¿En qué grupo?', options: [{ label: 'A', value: 'A' }] } },
    { id: 3, role: 'user', content: 'en A', proposals: null, choices: null },
    { id: 4, role: 'assistant', content: 'Propongo.', choices: null, proposals: [{ kind: 'create', state: 'applied', summary: 'Crear X', openPageId: 8 }, { kind: 'edit', state: 'pending', expired: true, summary: 'Editar Y' }, { kind: 'move', state: 'discarded', summary: 'Mover Z' }] },
  ];
  const items = itemsFromConversation(msgs, 100);
  assert.deepEqual(items.map((i) => i.kind), ['user', 'assistant', 'user', 'assistant', 'proposal', 'note', 'proposal', 'proposal', 'note']);
  assert.equal(items[0].id, 100);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  assert.equal(items[1].choices.options[0].value, 'A');
  assert.equal(items[4].state, 'applied');
  assert.equal(items[4].openPageId, 8);
  assert.equal(items[6].expired, true);
  assert.equal(items[7].state, 'discarded');
  assert.match(items[5].text, /Se aplicó la propuesta: Crear X/);
  assert.match(buildHistory([...items, { id: 999, kind: 'user', text: 'sigue' }]).map((m) => m.content).join('|'), /\[Nota del editor\] Se aplicó la propuesta: Crear X/);
  const now = new Date(2026, 10, 26, 15, 0);
  assert.equal(shortDate(new Date(2026, 10, 26, 9, 5).toISOString(), now), 'hoy 09:05');
  assert.equal(shortDate(new Date(2026, 10, 25, 23, 0).toISOString(), now), 'ayer 23:00');
  assert.equal(shortDate(new Date(2026, 9, 12, 8, 0).toISOString(), now), '12 oct');
  assert.equal(shortDate('no es fecha', now), '');
});
