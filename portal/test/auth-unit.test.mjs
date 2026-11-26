// Pruebas unitarias de seguridad (sin base de datos): TOTP con los vectores oficiales de los RFC, política de
// contraseñas, cifrado de secretos, huellas, ruta oculta del panel, sondeos, contenido MDX y proxy de confianza.
// Uso: node --test test/auth-unit.test.mjs   (desde portal/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hotp, totp, verifyTotp, base32Encode, base32Decode, otpauthUrl, timeStep } from '../server/security/totp.mjs';
import { passwordProblems, passwordError, MIN_LENGTH, MAX_LENGTH } from '../server/passwordPolicy.mjs';
import { createSecretBox, parseSecretKey, loadSecretKey, sha256 } from '../server/security/secrets.mjs';
import { parseAdminPath, rewriteFor, isProbePath, createProbeGuard, adminPathCollision, HIDDEN_404_URL } from '../server/http/adminPath.mjs';
import { mdxSecurityProblems, dangerousUrl } from '../server/routes/mdxSafety.mjs';
import { normalizeTrustProxy, parseTrustProxy, readServerConfig } from '../server/config.mjs';
import { injectBase, adminCspFor, CSP_ADMIN } from '../server/http/frontend.mjs';

test('HOTP: vectores del RFC 4226 (apéndice D)', () => {
  const key = Buffer.from('12345678901234567890');
  const want = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
  want.forEach((w, i) => assert.equal(hotp(key, i), w, `contador ${i}`));
});

test('TOTP: vectores del RFC 6238 (apéndice B) en SHA-1, SHA-256 y SHA-512 con 8 dígitos', () => {
  const keys = {
    sha1: Buffer.from('12345678901234567890'),
    sha256: Buffer.from('12345678901234567890123456789012'),
    sha512: Buffer.from('1234567890123456789012345678901234567890123456789012345678901234'),
  };
  const table = [
    [59, '94287082', '46119246', '90693936'],
    [1111111109, '07081804', '68084774', '25091201'],
    [1111111111, '14050471', '67062674', '99943326'],
    [1234567890, '89005924', '91819424', '93441116'],
    [2000000000, '69279037', '90698825', '38618901'],
    [20000000000, '65353130', '77737706', '47863826'],
  ];
  for (const [t, s1, s256, s512] of table) {
    assert.equal(totp(keys.sha1, { time: t, digits: 8, algorithm: 'sha1' }), s1, `SHA1 T=${t}`);
    assert.equal(totp(keys.sha256, { time: t, digits: 8, algorithm: 'sha256' }), s256, `SHA256 T=${t}`);
    assert.equal(totp(keys.sha512, { time: t, digits: 8, algorithm: 'sha512' }), s512, `SHA512 T=${t}`);
    // 6 dígitos (lo que usa el portal) = los 6 últimos del valor de 8
    assert.equal(totp(keys.sha1, { time: t }), s1.slice(2), `6 dígitos T=${t}`);
  }
});

test('TOTP: ventana ±1 paso, rechazo fuera de ventana, anti-reutilización (minStep) y formato', () => {
  const key = crypto.randomBytes(20);
  const t = 1_800_000_000;
  const step = timeStep(t);
  assert.equal(verifyTotp(key, totp(key, { time: t }), { time: t }), step);
  assert.equal(verifyTotp(key, totp(key, { time: t - 30 }), { time: t }), step - 1, 'paso anterior');
  assert.equal(verifyTotp(key, totp(key, { time: t + 30 }), { time: t }), step + 1, 'paso siguiente');
  assert.equal(verifyTotp(key, totp(key, { time: t - 90 }), { time: t }), null, 'fuera de ventana');
  assert.equal(verifyTotp(key, totp(key, { time: t }), { time: t, minStep: step }), null, 'ya usado');
  assert.equal(verifyTotp(key, totp(key, { time: t + 30 }), { time: t, minStep: step }), step + 1, 'uno posterior sí');
  for (const bad of ['', '12345', '1234567', 'abcdef', null, undefined]) assert.equal(verifyTotp(key, bad, { time: t }), null, String(bad));
});

test('Base32 (RFC 4648) ida y vuelta, vector conocido y otpauth://', () => {
  assert.equal(base32Encode(Buffer.from('foobar')), 'MZXW6YTBOI');
  assert.equal(base32Decode('mzxw6ytboi======').toString(), 'foobar');
  for (let i = 0; i < 50; i++) {
    const b = crypto.randomBytes(i % 33);
    assert.deepEqual(base32Decode(base32Encode(b)), b);
  }
  assert.throws(() => base32Decode('ABC1'), /base32/);
  const u = new URL(otpauthUrl({ secret: 'MZXW6YTBOI', account: 'persona' }));
  assert.equal(u.protocol, 'otpauth:');
  assert.equal(u.searchParams.get('secret'), 'MZXW6YTBOI');
  assert.equal(u.searchParams.get('digits'), '6');
  assert.equal(u.searchParams.get('period'), '30');
  assert.equal(u.searchParams.get('algorithm'), 'SHA1');
});

test('política de contraseñas: longitud, usuario, comunes, repeticiones y secuencias; las de prueba válidas', () => {
  for (const [p, u] of [
    ['corta', ''], ['x'.repeat(MAX_LENGTH + 1), ''], ['admin1234', 'admin'], ['12345', ''], ['password', ''], ['agente-prueba', 'agente'],
    ['Password2026!', ''], ['Admin_12345', ''], ['soporte2026!', 'soporte'], ['soporte.soporte', 'soporte'],
    ['aaaaaaaaaaaa', ''], ['abcabcabcabc', ''], ['1234567890', ''], ['qwertyuiop', ''], ['0987654321', ''],
    ['una-clave-larga-de-10-o-mas-caracteres', ''],
  ]) {
    assert.ok(passwordProblems(p, u).length > 0, `debería rechazar ${p.slice(0, 20)}`);
  }
  for (const [p, u] of [['Clave-de-prueba-1', 'admin_prueba'], ['Clave-larga-1', 'viewer1'], ['NuevaClave-99', 'cambia'], ['Agente-Prueba-2026!', 'agente'], ['río-verde-mañana-7', 'soporte'], ['x'.repeat(MIN_LENGTH - 4) + 'Q7#z', '']]) {
    assert.deepEqual(passwordProblems(p, u), [], p);
  }
  assert.equal(passwordError('Clave-de-prueba-1'), null);
  assert.match(passwordError(''), /contraseña/);
  // El mensaje nunca repite la contraseña
  assert.ok(!passwordProblems('Secreto-Que-No-Sale', 'secreto-que-no-sale').join(' ').includes('Secreto-Que-No-Sale'));
});

test('secretos: AES-256-GCM ida y vuelta; manipulación, otro AAD u otra clave fallan; formatos de clave', () => {
  const key = crypto.randomBytes(32);
  const box = createSecretBox(key);
  const s = crypto.randomBytes(20);
  const enc = box.encrypt(s, 'totp:7');
  assert.match(enc, /^v1:[\w-]+:[\w-]+:[\w-]+$/);
  assert.ok(!enc.includes(s.toString('hex')) && !enc.includes(base32Encode(s)));
  assert.notEqual(box.encrypt(s, 'totp:7'), enc, 'IV aleatorio');
  assert.deepEqual(box.decrypt(enc, 'totp:7'), s);
  assert.throws(() => box.decrypt(enc, 'totp:8'), 'AAD de otro usuario');
  assert.throws(() => createSecretBox(crypto.randomBytes(32)).decrypt(enc, 'totp:7'), 'otra clave');
  const parts = enc.split(':');
  parts[3] = Buffer.from(parts[3], 'base64url').map((b, i) => (i === 0 ? b ^ 1 : b)).toString('base64url');
  assert.throws(() => box.decrypt(parts.join(':'), 'totp:7'), 'cifrado alterado');
  assert.throws(() => box.decrypt('basura', 'totp:7'));
  assert.equal(parseSecretKey('a'.repeat(64)).length, 32);
  assert.equal(parseSecretKey(crypto.randomBytes(32).toString('base64')).length, 32);
  assert.equal(parseSecretKey('una frase de paso larga de más de 32 caracteres').length, 32);
  assert.equal(parseSecretKey(''), null);
  assert.throws(() => parseSecretKey('corta'), /PORTAL_SECRET_KEY/);
  assert.throws(() => createSecretBox(Buffer.alloc(16)));
});

test('clave de cifrado: PORTAL_SECRET_KEY o archivo secret.key (se crea una vez, 0600 en POSIX) y se reutiliza', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-key-'));
  try {
    const env = { PORTAL_DATA_DIR: dir };
    const a = loadSecretKey(env);
    assert.equal(a.source, 'file-new');
    const b = loadSecretKey(env);
    assert.equal(b.source, 'file');
    assert.deepEqual(a.key, b.key);
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(dir, 'secret.key')).mode & 0o777, 0o600);
    const c = loadSecretKey({ ...env, PORTAL_SECRET_KEY: 'b'.repeat(64) });
    assert.equal(c.source, 'env');
    assert.deepEqual(c.key, Buffer.from('b'.repeat(64), 'hex'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('huella de sesión: SHA-256 hex determinista, distinta del token', () => {
  const t = crypto.randomBytes(32).toString('hex');
  assert.match(sha256(t), /^[0-9a-f]{64}$/);
  assert.equal(sha256(t), sha256(t));
  assert.notEqual(sha256(t), t);
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('PORTAL_ADMIN_PATH: validación, reservadas, secciones y colisión con páginas', () => {
  assert.equal(parseAdminPath(''), '/admin');
  assert.equal(parseAdminPath('/zz-secreto-test'), '/zz-secreto-test');
  assert.equal(parseAdminPath('/zz-secreto-test/'), '/zz-secreto-test');
  for (const bad of ['zz', '/a', '/ab', '/Mayus', '/dos/segmentos', '/-x123', '/con espacio', '/x'.padEnd(70, 'y'), '/api', '/assets', '/static', '/healthz', '/manual', '/tareas', '/guia']) {
    assert.throws(() => parseAdminPath(bad), /PORTAL_ADMIN_PATH/, bad);
  }
  // el mensaje no repite el valor
  try { parseAdminPath('/Valor-Secreto'); } catch (e) { assert.ok(!e.message.includes('Valor-Secreto')); }
  assert.equal(adminPathCollision('/zz-secreto-test', ['/tareas/x', '/zz-secreto-test/a']), true);
  assert.equal(adminPathCollision('/zz-secreto-test', ['/tareas/x', '/', '/zz-secreto-testx']), false);
  assert.throws(() => readServerConfig({ PORTAL_ADMIN_PATH: '/api' }), /PORTAL_ADMIN_PATH/);
  const c = readServerConfig({ PORTAL_ADMIN_PATH: '/zz-secreto-test' });
  assert.equal(c.hideAdmin, true);
  assert.equal(readServerConfig({}).hideAdmin, false);
  assert.equal(readServerConfig({ PORTAL_HIDE_ADMIN: 'true' }).hideAdmin, true);
});

test('reescritura de URL: P/api → /api, P/ → /admin; en modo oculto /api, /admin y variantes → 404 interno', () => {
  const o = { adminPath: '/zz-secreto-test', hidden: true };
  assert.deepEqual(rewriteFor('/zz-secreto-test/api/auth/me?x=1', o), { url: '/api/auth/me?x=1', via: 'admin' });
  assert.deepEqual(rewriteFor('/zz-secreto-test/', o), { url: '/admin/', via: 'admin' });
  assert.deepEqual(rewriteFor('/zz-secreto-test', o), { url: '/admin', via: 'admin' });
  assert.deepEqual(rewriteFor('/zz-secreto-test/assets/a.js', o), { url: '/admin/assets/a.js', via: 'admin' });
  for (const u of ['/api/auth/me', '/api', '/API/stats', '/%61pi/stats', '//api/stats', '/admin', '/admin/', '/ADMIN/x', '/%61dmin/', '/api%2fstats', '/%zz']) {
    assert.deepEqual(rewriteFor(u, o), { url: HIDDEN_404_URL, via: 'hidden' }, u);
  }
  assert.deepEqual(rewriteFor('/guia/inicio', o), { url: '/guia/inicio', via: null });
  assert.deepEqual(rewriteFor('/zz-secreto-testX/api', o), { url: '/zz-secreto-testX/api', via: null });
  // modo por defecto: /admin/api también es la API; /api directo sigue
  const d = { adminPath: '/admin', hidden: false };
  assert.deepEqual(rewriteFor('/admin/api/auth/me', d), { url: '/api/auth/me', via: 'admin' });
  assert.deepEqual(rewriteFor('/api/auth/me', d), { url: '/api/auth/me', via: null });
});

test('sondeos: rutas típicas, ventana deslizante, bloqueo una sola vez y caducidad', () => {
  for (const p of ['/wp-login.php', '/wp-admin/', '/.env', '/.git/config', '/phpmyadmin/', '/x/y.php', '/actuator/health', '/server-status', '/administrator/', '/login']) assert.ok(isProbePath(p), p);
  for (const p of ['/', '/guia/inicio', '/assets/imgs/a.webp', '/sitemap.xml', '/robots.txt']) assert.ok(!isProbePath(p), p);
  assert.ok(!isProbePath('/admin/'), 'modo por defecto: /admin es el panel');
  assert.ok(isProbePath('/admin/', { hidden: true }));
  assert.ok(isProbePath('/api/stats', { hidden: true }));
  assert.ok(!isProbePath('/zz/api/stats', { hidden: true, via: 'admin' }), 'por la ruta real no cuenta');
  let now = 0;
  const g = createProbeGuard({ threshold: 3, windowMs: 1000, blockMs: 5000, now: () => now });
  assert.equal(g.hit('192.0.2.1', '/.env').blockedNow, false);
  now = 2000; // el primero sale de la ventana
  assert.equal(g.hit('192.0.2.1', '/.env').blockedNow, false);
  assert.equal(g.hit('192.0.2.1', '/.git').blockedNow, false);
  assert.equal(g.blocked('192.0.2.1'), false);
  const h = g.hit('192.0.2.1', '/x.php');
  assert.equal(h.blockedNow, true);
  assert.ok(g.blocked('192.0.2.1'));
  assert.ok(!g.blocked('192.0.2.2'), 'otra IP no');
  now = 8000;
  assert.ok(!g.blocked('192.0.2.1'), 'caduca');
});

test('contenido MDX: se rechaza lo ejecutable y se admite lo que usa el manual', () => {
  const ok = [
    '<Figure src="/assets/imgs/a/01-x.webp" alt="" caption="" width={1100} height={600} max="900px" />',
    '<Callout kind="tip" title="Ojo">Texto **fuerte** y `{llave}` en código</Callout>',
    '{/* comentario */}\n\n```js\nexport const x = {a: 1}\n```\n\n[enlace](/tareas/x) y [web](https://example.invalid)',
    '<Tour id="mi-tour" />\n\n<Cards columns={2}>\n<Card title="A" href="/guia/x">b</Card>\n</Cards>',
  ];
  for (const b of ok) assert.deepEqual(mdxSecurityProblems({ body: b, frontmatter: { title: 'T', head: [['meta', { name: 'keywords', content: 'a b' }]] } }), [], b);
  const bad = [
    "export const x = fetch('/api/users')",
    "import x from 'y'",
    '<img src="x" onError={() => fetch("/api/users")} />',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="jav&#x61;script:alert(1)">x</a>',
    '<a href={"javascript:alert(1)"}>x</a>',
    '[x](javascript:alert(1))',
    '[x]: javascript:alert(1)',
    '<script>alert(1)</script>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<div dangerouslySetInnerHTML={{ __html: "x" }} />',
    '<div style={{ color: "red" }}>x</div>',
    'Texto {fetch("/api/users")} suelto',
    '<Figure src="/a.webp" width={window.x} />',
    '<svg><circle onload="x" /></svg>',
    '<a href="data:text/html,<script>alert(1)</script>">x</a>',
  ];
  for (const b of bad) assert.ok(mdxSecurityProblems({ body: b }).length > 0, b);
  for (const fm of [{ head: [['script', {}, 'alert(1)']] }, { head: [['meta', { 'http-equiv': 'refresh', content: '0;url=//x' }]] }, { description: '<script>alert(1)</script>' }, { hero: { link: 'javascript:alert(1)' } }]) {
    assert.ok(mdxSecurityProblems({ body: '', frontmatter: fm }).length > 0, JSON.stringify(fm));
  }
  assert.ok(dangerousUrl(' JaVaScRiPt:alert(1)'));
  assert.ok(!dangerousUrl('/guia/x') && !dangerousUrl('https://example.invalid') && !dangerousUrl('data:image/png;base64,AAAA'));
});

test('proxy de confianza: "true" = 1 salto (la última IP de X-Forwarded-For), números como función', () => {
  assert.equal(parseTrustProxy('true'), 1);
  const f = normalizeTrustProxy(true);
  assert.equal(typeof f, 'function');
  assert.equal(f('203.0.113.1', 0), true);
  assert.equal(f('203.0.113.1', 1), false);
  assert.equal(normalizeTrustProxy(2)('x', 1), true);
  assert.equal(normalizeTrustProxy(false), false);
  assert.deepEqual(normalizeTrustProxy(['10.0.0.0/8']), ['10.0.0.0/8']);
});

test('panel: <base href> inyectado y CSP con la huella de los scripts en línea', () => {
  const html = '<!doctype html><html><head><meta charset="utf-8"><script>var a=1</script></head><body><script type="module" src="./assets/x.js"></script></body></html>';
  assert.match(injectBase(html, '/zz-secreto-test/'), /<head><base href="\/zz-secreto-test\/"><meta/);
  assert.match(injectBase('<head><base href="/viejo/"></head>', '/admin/'), /<base href="\/admin\/">/);
  assert.doesNotMatch(injectBase('<head><base href="/viejo/"></head>', '/admin/'), /viejo/);
  const csp = adminCspFor(html);
  const h = crypto.createHash('sha256').update('var a=1').digest('base64');
  assert.ok(csp.includes(`'sha256-${h}'`));
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline'[^;]*;\s*connect/); // script-src sin unsafe-inline
  assert.match(csp, /script-src 'self' 'sha256-/);
  assert.equal(adminCspFor('<head></head>'), CSP_ADMIN);
});
