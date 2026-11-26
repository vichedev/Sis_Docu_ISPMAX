import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeRm } from './helpers/safe-rm.mjs';
import { codeFingerprint } from '../server/ops/codefp.mjs';

const RUN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'work-test', 'codefp-test');
const put = (rel, text) => {
  const f = path.join(RUN, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  return f;
};

test.before(() => {
  safeRm(RUN);
  put('theme/layout/Layout.tsx', 'export const A = 1;');
  put('src/components/Figure.tsx', 'export const B = 2;');
  put('styles/tailwind.css', '@import "tailwindcss";');
  put('rspress.config.ts', 'export default {};');
  put('package.json', '{}');
});
test.after(() => safeRm(RUN));

test('la huella es estable si no cambia el código', () => {
  assert.equal(codeFingerprint(RUN), codeFingerprint(RUN));
  assert.match(codeFingerprint(RUN), /^[0-9a-f]{16}$/);
});

test('cambia al modificar el tema, un componente, los estilos o la configuración', () => {
  for (const rel of ['theme/layout/Layout.tsx', 'src/components/Figure.tsx', 'styles/tailwind.css', 'rspress.config.ts']) {
    const before = codeFingerprint(RUN);
    const f = path.join(RUN, rel);
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8') + '\n// cambio');
    assert.notEqual(codeFingerprint(RUN), before, `debía cambiar al editar ${rel}`);
  }
});

test('cambia al añadir un archivo nuevo al tema', () => {
  const before = codeFingerprint(RUN);
  put('theme/components/Nuevo.tsx', 'export const C = 3;');
  assert.notEqual(codeFingerprint(RUN), before);
});

test('ignora lo generado (src/search/data.json), node_modules y los .log', () => {
  const before = codeFingerprint(RUN);
  put('src/search/data.json', '{"a":1}');
  put('src/search/data.json', '{"a":1,"b":2,"c":3}');
  put('theme/node_modules/x/index.js', 'x');
  put('theme/debug.log', 'log');
  assert.equal(codeFingerprint(RUN), before);
});

test('una carpeta sin código o inexistente no falla', () => {
  assert.match(codeFingerprint(path.join(RUN, 'no-existe')), /^[0-9a-f]{16}$/);
});
