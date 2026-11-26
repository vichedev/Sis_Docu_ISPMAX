// Pruebas de la lógica pura de autenticación: node --test portal/web/test/auth.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCountdown, spokenWait, retryAfterSeconds, lockRemaining, digitsOnly, splitDigits, normalizeRecovery, looksLikeRecovery, groupSecret, recoveryCodesText, passwordChecks, passwordOk, passwordStrength, parseUserAgent } from '../src/features/auth/authModel.ts';
import { apiPrefix, apiPath } from '../src/lib/apiBase.ts';

test('temporizador de bloqueo', () => {
  assert.equal(formatCountdown(125), '02:05');
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(-4), '00:00');
  assert.equal(formatCountdown(59.2), '01:00');
  assert.equal(formatCountdown(900), '15:00');
  assert.equal(spokenWait(30), 'menos de un minuto');
  assert.equal(spokenWait(61), 'unos 2 minutos');
  assert.equal(spokenWait(60), 'un minuto');
  assert.equal(retryAfterSeconds({ retryAfter: 840 }), 840);
  assert.equal(retryAfterSeconds({ retryAfter: '30' }), 30);
  assert.equal(retryAfterSeconds({ retryAfter: 0 }), 60);
  assert.equal(retryAfterSeconds(null), 60);
  assert.equal(retryAfterSeconds('x', 5), 5);
  assert.equal(lockRemaining(10_500, 10_000), 1);
  assert.equal(lockRemaining(9_000, 10_000), 0);
});

test('códigos pegados', () => {
  assert.equal(digitsOnly('123 456'), '123456');
  assert.equal(digitsOnly('  12-34-56-78 '), '123456');
  assert.equal(digitsOnly('abc'), '');
  assert.deepEqual(splitDigits('12 34'), ['1', '2', '3', '4', '', '']);
  assert.deepEqual(splitDigits('9876543'), ['9', '8', '7', '6', '5', '4']);
  assert.equal(normalizeRecovery('  AB12c D34e-f5 '), 'ab12cd34e-f5');
  assert.equal(looksLikeRecovery('123456'), false);
  assert.equal(looksLikeRecovery('abcde-12345'), true);
  assert.equal(groupSecret('jbswy3dpehpk3pxp'), 'JBSW Y3DP EHPK 3PXP');
});

test('archivo de códigos de recuperación', () => {
  const t = recoveryCodesText(['aaaa-bbbb', 'cccc-dddd'], 'ana', new Date('2026-11-26T10:00:00Z'));
  assert.match(t, /Códigos de recuperación de ana/);
  assert.match(t, /Generados el 2026-11-26/);
  assert.match(t, /01\. aaaa-bbbb\n02\. cccc-dddd/);
});

test('política de contraseñas', () => {
  const ok = (pw, u) => passwordChecks(pw, u).every((c) => c.ok);
  assert.equal(ok('', 'ana'), false);
  assert.equal(ok('corta1', 'ana'), false);
  assert.equal(ok('admin1234', 'x'), false);
  assert.equal(ok('Admin1234', 'x'), false);
  assert.equal(ok('12345678901', 'x'), false);
  assert.equal(ok('aaaaaaaaaaaa', 'x'), false);
  assert.equal(ok('abcabcabcabc', 'x'), false);
  assert.equal(ok('ana-gestiona-2026', 'ana'), false);
  assert.equal(ok('Tren-azul-cruza-el-valle', 'ana'), true);
  assert.equal(ok('x'.repeat(129) + 'y', 'ana'), false);
  assert.equal(passwordOk('Tren-azul-cruza-el-valle', 'ana'), true);
  const by = Object.fromEntries(passwordChecks('corta', 'ana').map((c) => [c.id, c.ok]));
  assert.deepEqual(by, { length: false, user: true, common: true, repeat: true });
  assert.equal(passwordStrength('').score, 0);
  assert.equal(passwordStrength('corta').label, 'Demasiado corta');
  assert.equal(passwordStrength('Tren-azul-cruza-el-valle', 'ana').score >= 3, true);
  assert.equal(passwordStrength('mesa-silla-p', 'ana').score, 2);
});

test('dispositivo legible desde el user-agent', () => {
  const edge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91';
  assert.equal(parseUserAgent(edge).device, 'Edge 120 en Windows');
  const ff = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';
  assert.equal(parseUserAgent(ff).device, 'Firefox 121 en Linux');
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
  assert.equal(parseUserAgent(safari).device, 'Safari 17 en iOS (móvil)');
  const chrome = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
  assert.equal(parseUserAgent(chrome).device, 'Chrome 119 en macOS');
  assert.equal(parseUserAgent('').device, 'Dispositivo desconocido');
  assert.equal(parseUserAgent(null).device, 'Dispositivo desconocido');
  assert.equal(parseUserAgent('curl/8.4.0').device, 'curl 8');
});

test('prefijo de la API según el <base> del documento', () => {
  assert.equal(apiPrefix('http://h:8387/', true), '/api/');
  assert.equal(apiPrefix('http://h:8387/zz-secreto-test/', true), '/zz-secreto-test/api/');
  assert.equal(apiPrefix('http://h:8387/admin/', true), '/admin/api/');
  assert.equal(apiPrefix('https://doc.ispmax.ec/a/b/', true), '/a/b/api/');
  // sin <base> (servidor anterior): siempre /api/, aunque la página esté en /admin/
  assert.equal(apiPrefix('http://h:8387/admin/', false), '/api/');
  assert.equal(apiPrefix(null, true), '/api/');
  assert.equal(apiPrefix('no es una url', true), '/api/');
  assert.equal(apiPath('/api/pages?x=1', '/zz-secreto-test/api/'), '/zz-secreto-test/api/pages?x=1');
  assert.equal(apiPath('/api/auth/me', '/api/'), '/api/auth/me');
  assert.equal(apiPath('/otra/ruta', '/zz/api/'), '/otra/ruta');
});
