// Imágenes en el chat SIN coste de IA: la persona las adjunta y la IA solo recibe TEXTO (nombre, pie, alt, ancho, ubicación).
// La IA puede colocarlas en propuestas únicamente por referencia (image_ref); el servidor pone la ruta real. Groq falso.
// Uso: node --test --test-concurrency=1 test/ai-images.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { setupAi, tc, say, SENTINEL } from './helpers/ai-harness.mjs';

let h;
let imgs = [];
let other;
let page;
const msg = (text, extra = {}) => ({ messages: [{ role: 'user', content: text }], ...extra });
const toolMsgs = (i) => h.fake.calls[i].body.messages.filter((m) => m.role === 'tool').map((m) => m.content);

async function upload(cookie, name, color, folder = 'imgs/ia') {
  const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: color } }).png().toBuffer();
  const b = '----ai' + Math.random().toString(16).slice(2);
  const part = (head, body) => Buffer.concat([Buffer.from(`--${b}\r\n${head}\r\n\r\n`), body, Buffer.from('\r\n')]);
  const payload = Buffer.concat([
    part('Content-Disposition: form-data; name="folder"', Buffer.from(folder)),
    part('Content-Disposition: form-data; name="name"', Buffer.from(name)),
    part(`Content-Disposition: form-data; name="file"; filename="${name}.png"\r\nContent-Type: image/png`, png),
    Buffer.from(`--${b}--\r\n`),
  ]);
  const r = await h.app.inject({ method: 'POST', url: '/api/assets', payload, headers: { cookie, 'content-type': `multipart/form-data; boundary=${b}` } });
  assert.equal(r.statusCode, 201, r.body);
  return { ...r.json(), png };
}
const att = (i, extra = {}) => ({ ref: `img${i}`, path: imgs[i - 1].path, name: ['captura-login.png', 'dashboard.png', 'ajustes.png'][i - 1], caption: ['Pantalla de acceso', '', ''][i - 1], alt: ['Formulario de inicio de sesión', '', ''][i - 1], size: i === 1 ? 'medium' : undefined, ...extra });
const chat = (text, attachments, extra = {}) => h.req('POST', '/api/ai/chat', { cookie: h.ck.editor, payload: msg(text, { context: { attachments, ...extra } }) });
const figure = (i, alt, caption, max) => `<Figure src="/assets/${imgs[i - 1].path}" alt="${alt}"${caption ? ` caption="${caption}"` : ''} width={40} height={30} max="${max}" />`;

before(async () => {
  h = await setupAi('ai-images-test');
  imgs = [await upload(h.ck.editor, 'captura-login', { r: 200, g: 30, b: 30 }), await upload(h.ck.editor, 'dashboard', { r: 30, g: 200, b: 30 }), await upload(h.ck.editor, 'ajustes', { r: 30, g: 30, b: 200 })];
  other = await upload(h.ck.editor2, 'ajena', { r: 10, g: 10, b: 10 });
  const p = await h.mkPage('guia', 'inicio-sesion', 'Inicio de sesión', { grupo: 'Inicio' });
  const body = '<Kicker>Guía</Kicker>\n\n# Inicio de sesión\n\n## Pasos\n\nEscribir el usuario.\n\n## Resultado\n\nSe abre el panel.\n';
  const put = await h.req('PUT', `/api/pages/${p.id}`, { cookie: h.ck.editor, payload: { version: p.version, body } });
  assert.equal(put.status, 200, put.body);
  page = { id: p.id, title: p.title, route: p.route, seccion: 'guia', body };
});
after(async () => { await h?.cleanup(); });

test('las imágenes NO salen del servidor: al proveedor solo viaja texto (sin base64, data:image ni bytes)', async () => {
  h.reset();
  h.fake.script = [tc('propose_create_page', { title: 'Acceso', tipo: 'guia', seccion: 'guia', grupo: 'Inicio', blocks: [{ type: 'lead', text: 'Cómo entrar.' }, { type: 'image', image_ref: 'img1', alt: 'Formulario de acceso', caption: 'Pantalla de acceso' }] })];
  const r = await chat('Crea una página de acceso con estas imágenes', [att(1, { where: 'después del título' }), att(2), att(3)]);
  assert.equal(r.status, 200, r.body);
  const wire = JSON.stringify(h.fake.calls.map((c) => c.body));
  assert.ok(!/data:image|base64|iVBOR|UklGR|image\/png|image\/webp/i.test(wire), 'ningún dato de imagen al proveedor');
  for (const i of imgs) {
    const bytes = (await h.pool.query('SELECT bytes FROM assets WHERE path = $1', [i.path])).rows[0].bytes;
    assert.ok(!wire.includes(bytes.toString('base64').slice(0, 60)), 'ni los bytes guardados');
    assert.ok(!wire.includes(i.png.toString('base64').slice(0, 60)), 'ni los originales');
  }
  const sys = h.fake.calls[0].body.messages[0].content;
  assert.match(sys, /Imágenes adjuntas por la persona \(NO las ves: solo tienes estos datos\)/);
  assert.match(sys, /\[img1\] captura-login\.png — pie «Pantalla de acceso»; alt «Formulario de inicio de sesión»; ancho mediano; ubicación: después del título/);
  assert.match(sys, /\[img2\] dashboard\.png; ancho completo/);
  assert.ok(!sys.includes(imgs[0].path), 'la IA no recibe ni las rutas');
  assert.match(JSON.stringify(h.fake.calls[0].body.tools), /image_ref:imgN/);
  // la propuesta lleva la figura con la ruta REAL, generada por el servidor
  const p = r.json.proposals[0];
  assert.ok(p.body.includes(figure(1, 'Formulario de acceso', 'Pantalla de acceso', '720px')), p.body);
  assert.equal((await h.pool.query("SELECT count(*)::int AS n FROM pages WHERE route = '/guia/acceso'")).rows[0].n, 0, 'proponer no crea nada');
  // sin adjuntas, la herramienta no habla de imágenes
  h.reset();
  h.fake.script = [say('ok')];
  await chat('hola', undefined);
  assert.ok(!JSON.stringify(h.fake.calls[0].body).includes('image_ref'));
});

test('editar con imágenes: insert_after coloca la figura tras el bloque indicado; el ancho y el pie salen de la persona', async () => {
  h.reset();
  h.fake.script = [tc('propose_edit_page', { page: page.id, ops: [{ op: 'insert_after', anchor: '## Pasos', blocks: [{ type: 'image', image_ref: 'img2', alt: 'Panel principal', size: 'small' }] }, { op: 'append', blocks: [{ type: 'image', image_ref: 'img3', alt: 'Ajustes', caption: 'Ajustes del usuario', size: 'full' }] }] })];
  const r = await chat('Pon la imagen 2 tras Pasos y la 3 al final con un pie corto', [att(1), att(2, { caption: 'Panel' }), att(3)], { page });
  assert.equal(r.status, 200, r.body);
  assert.equal(r.json.proposals.length, 1, r.body + JSON.stringify(h.fake.calls.map((c) => c.body.messages.filter((m) => m.role === 'tool'))));
  const p = r.json.proposals[0];
  assert.equal(p.kind, 'edit');
  assert.ok(p.after.includes(`## Pasos\n\n${figure(2, 'Panel principal', 'Panel', '420px')}\n\nEscribir el usuario.`), p.after);
  assert.ok(p.after.trimEnd().endsWith(figure(3, 'Ajustes', 'Ajustes del usuario', '40px')));
  assert.ok(!p.after.includes(imgs[0].path), 'la imagen no colocada no aparece');
});

test('rechazos: imagen no adjunta, sin alt, repetida, referencias maliciosas, atributos inventados; Figure/Tour en texto siguen prohibidos', async () => {
  const create = (blocks, extra = {}) => tc('propose_create_page', { title: 'X', tipo: 'guia', seccion: 'guia', grupo: 'Inicio', blocks, ...extra });
  const cases = [
    [[{ type: 'image', image_ref: 'img9', alt: 'a' }], /no está entre las adjuntas/],
    [[{ type: 'image', image_ref: 'img2' }], /Falta el texto alternativo de «img2»/],
    [[{ type: 'image', image_ref: 'img1', alt: 'a' }, { type: 'image', image_ref: 'img1', alt: 'b' }], /ya está colocada en esta propuesta/],
    [[{ type: 'image', image_ref: 'img1"/><script>alert(1)</script>', alt: 'a' }], /argumentos no válidos/],
    [[{ type: 'image', image_ref: '../../etc/passwd', alt: 'a' }], /argumentos no válidos/],
    [[{ type: 'image', image_ref: 'IMG1', alt: 'a' }], /argumentos no válidos/],
    [[{ type: 'image', image_ref: 'img001', alt: 'a' }], /argumentos no válidos/],
  ];
  for (const [blocks, re] of cases) {
    h.reset();
    h.fake.script = [create(blocks), say('no pude')];
    const r = await chat('crea', [att(1), att(2), att(3)]);
    assert.equal(r.status, 200, r.body);
    assert.deepEqual(r.json.proposals, [], JSON.stringify(blocks));
    assert.match(toolMsgs(1)[0], re, JSON.stringify(blocks));
  }
  // alt/pie peligrosos → propuesta rechazada
  for (const alt of ['<script>alert(1)</script>', 'Valor {process.env.X}', '[x](javascript:alert(1))']) {
    h.reset();
    h.fake.script = [create([{ type: 'image', image_ref: 'img1', alt }]), say('ok')];
    const r = await chat('crea', [att(1)]);
    assert.deepEqual(r.json.proposals, [], alt);
    assert.equal(r.json.rejected.length, 1, alt);
  }
  // Figure y Tour escritos como texto: rechazados aunque haya adjuntas
  for (const text of ['<Figure src="/assets/ia/inventada.webp" alt="x" />', `<Figure src="/assets/${imgs[0].path}" alt="x" />`, '<Tour id="inventado" />']) {
    h.reset();
    h.fake.script = [create([{ type: 'paragraph', text }]), say('ok')];
    const r = await chat('crea', [att(1)]);
    assert.deepEqual(r.json.proposals, [], text);
  }
  // atributos extra (src, path) se ignoran: siempre la ruta real; comillas del pie se sustituyen
  h.reset();
  h.fake.script = [create([{ type: 'image', image_ref: 'img1', alt: 'Acceso', caption: 'Dice "hola"', src: '/assets/evil.webp', path: 'evil.webp' }])];
  const ok = await chat('crea', [att(1)]);
  assert.equal(ok.json.proposals.length, 1);
  const body = ok.json.proposals[0].body;
  assert.ok(body.includes(`src="/assets/${imgs[0].path}"`) && !body.includes('evil'));
  assert.ok(body.includes('caption="Dice ”hola”"'), 'las comillas dobles se sustituyen');
  // el endpoint antiguo de borradores (sin adjuntas) tampoco admite imágenes
  h.reset();
  h.fake.script = [() => say(JSON.stringify({ title: 'T', slug: 't', description: 'd', tipo: 'guia', ubicacion: { seccion: 'guia', modulo: null, grupo: '', padre_id: null, motivo: 'm' }, bloques: [{ type: 'image', image_ref: 'img1', alt: 'a' }], avisos: [] }))];
  const d = await h.req('POST', '/api/ai/draft-page', { cookie: h.ck.editor, payload: { description: 'algo' } });
  assert.equal(d.status, 422);
});

test('adjuntos verificados: solo imágenes que ESTA persona subió; rutas ajenas, inexistentes o con traversal se rechazan sin llamar al proveedor', async () => {
  h.reset();
  const n = h.fake.calls.length;
  const bad = [
    [att(1, { path: other.path }), /no existe o no la subiste tú/],
    [att(1, { path: 'imgs/ia/99-no-existe.webp' }), /no existe o no la subiste tú/],
    [att(1, { path: '../../etc/passwd' }), /Ruta de imagen no válida/],
    [att(1, { path: '/etc/passwd' }), /Ruta de imagen no válida/],
    [att(1, { path: 'imgs//ia/x.webp' }), /Ruta de imagen no válida/],
    [att(1, { path: 'imgs/ia/x.svg"/><script>' }), /Ruta de imagen no válida/],
    [att(1, { ref: 'img0x' }), /Imagen adjunta no válida/],
    [att(1, { size: 'enorme' }), /Ancho de imagen no válido/],
    [att(1, { caption: 'x'.repeat(301) }), /demasiado largo/],
  ];
  for (const [a, re] of bad) {
    const r = await chat('hola', [a]);
    assert.ok([400, 413].includes(r.status), `${JSON.stringify(a).slice(0, 80)} → ${r.status}`);
    assert.match(r.json.error, re);
  }
  assert.equal((await chat('hola', [att(1), att(1)])).status, 400, 'ref repetida');
  const many = Array.from({ length: 13 }, (_, i) => ({ ...att(1), ref: `img${i + 1}` }));
  assert.equal((await chat('hola', many)).status, 400, 'máx. 12');
  assert.equal((await chat('hola', 'no es lista')).status, 400);
  assert.equal(h.fake.calls.length, n, 'ni una llamada al proveedor');
  // el administrador tampoco puede usar la imagen de otra persona; lector 403
  const adm = await h.req('POST', '/api/ai/chat', { cookie: h.ck.admin, payload: msg('hola', { context: { attachments: [att(1)] } }) });
  assert.equal(adm.status, 400);
  assert.equal((await h.req('POST', '/api/ai/chat', { cookie: h.ck.viewer, payload: msg('hola', { context: { attachments: [att(1)] } }) })).status, 403);
  assert.equal((await h.req('POST', '/api/ai/chat', { payload: msg('hola') })).status, 401);
  // 12 adjuntas propias sí se admiten
  h.fake.script = [say('ok')];
  const twelve = Array.from({ length: 12 }, (_, i) => ({ ...att(1), ref: `img${i + 1}` }));
  assert.equal((await chat('hola', twelve)).status, 200);
});

test('auditoría solo con tamaños; el historial guarda rutas (no binarios) y avisa si la imagen se eliminó después', async () => {
  h.reset();
  h.fake.script = [tc('propose_create_page', { title: 'Con imagen', tipo: 'guia', seccion: 'guia', grupo: 'Inicio', blocks: [{ type: 'image', image_ref: 'img3', alt: 'Pantalla de ajustes secreta', caption: 'Un pie único' }] })];
  const r = await chat('Crea una página con la imagen de ajustes', [att(3)]);
  assert.equal(r.status, 200, r.body);
  const a = (await h.pool.query("SELECT detail FROM audit_log WHERE action = 'ai.chat' ORDER BY id DESC LIMIT 1")).rows[0].detail;
  assert.equal(a.images, 1);
  const dump = JSON.stringify((await h.pool.query('SELECT action, target, detail FROM audit_log')).rows);
  assert.ok(!dump.includes('ajustes.png') && !dump.includes('Pantalla de ajustes secreta') && !dump.includes('Un pie único'), 'ni nombres ni textos de las imágenes');
  // historial: solo la ruta dentro de la propuesta
  const stored = (await h.pool.query('SELECT proposals FROM ai_messages WHERE conversation_id = $1 AND role = $2', [r.json.conversation_id, 'assistant'])).rows[0].proposals;
  assert.ok(JSON.stringify(stored).includes(imgs[2].path));
  assert.ok(!JSON.stringify(stored).includes('iVBOR') && !JSON.stringify(stored).includes('UklGR'));
  let open = (await h.req('GET', `/api/ai/conversations/${r.json.conversation_id}`, { cookie: h.ck.editor })).json;
  assert.equal(open.messages[1].proposals[0].missingImages, undefined);
  // se elimina la imagen → la tarjeta antigua lo indica
  assert.equal((await h.req('DELETE', `/api/assets?path=${encodeURIComponent(imgs[2].path)}`, { cookie: h.ck.editor })).status, 200);
  open = (await h.req('GET', `/api/ai/conversations/${r.json.conversation_id}`, { cookie: h.ck.editor })).json;
  assert.deepEqual(open.messages[1].proposals[0].missingImages, [imgs[2].path]);
  for (const chunk of h.seen) assert.ok(!chunk.includes(SENTINEL), 'la clave no sale');
});
