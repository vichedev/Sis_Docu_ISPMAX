// Prueba corta de parse.mjs. Uso: node --test server/sync/frontmatter.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFrontmatter, parsePage, renderPage } from './parse.mjs';

const PAGINA = [
  '---',
  'title: "Crear un rol"',
  'description: "Crea un rol con sus permisos."',
  'modulo: acceso',
  'tipo: tarea',
  'grupo: Acceso y usuarios',
  'orden: 10',
  'funcionalidades: [ACC-001, ACC-002]',
  'rutas: ["/roles", "/roles/edit/:id"]',
  'permisos: []',
  'roles: [administrador]',
  'sinonimos: ["nuevo rol", "dar permisos"]',
  'codigo:',
  '  - FE:pages/dashboard/roles/IndexPage.vue',
  '  - BE:roles/roles.service.ts',
  'verificado:',
  '  fecha: 2026-11-05',
  '  version: main-2026-11-04',
  '  metodo: codigo',
  '  sin_probar: [router, correo]',
  'estado: verificado',
  '',
].join('\n');

test('buildFrontmatter escribe el estilo del repo sin guía', () => {
  const fm = parsePage(PAGINA + '---\n\n# Hola\n').frontmatter;
  assert.equal(fm.verificado.fecha, '2026-11-05'); // las fechas quedan como texto
  assert.equal(buildFrontmatter(fm), PAGINA.slice(4));
});

test('buildFrontmatter entrecomilla lo que cambiaría de tipo o de sentido', () => {
  const out = buildFrontmatter({ title: 'A "b"', grupo: 'Uno: dos', orden: 3, version: '2026', roles: ['a, b', 'true'] });
  assert.equal(out, 'title: "A \\"b\\""\ngrupo: "Uno: dos"\norden: 3\nroles: ["a, b", "true"]\nversion: "2026"\n');
});

test('renderPage usa fm_raw byte a byte si el frontmatter no cambió (CRLF y BOM)', () => {
  const src = '﻿' + (PAGINA + '---\n\n# Hola\n').replace(/\n/g, '\r\n');
  const p = parsePage(src);
  const row = { fm_raw: p.fmRaw, body: p.body, frontmatter: p.frontmatter, title: 'Crear un rol', description: 'Crea un rol con sus permisos.', grupo: 'Acceso y usuarios', orden: 10 };
  assert.equal(renderPage(row), src);
});

test('renderPage regenera solo lo editado y conserva comillas, orden y saltos de línea', () => {
  const src = (PAGINA + '---\n\n# Hola\n').replace('grupo: Acceso y usuarios', 'grupo: "Acceso y usuarios"').replace(/\n/g, '\r\n');
  const p = parsePage(src);
  const row = { fm_raw: p.fmRaw, body: p.body, frontmatter: p.frontmatter, title: 'Crear un rol nuevo', description: 'Crea un rol con sus permisos.', grupo: 'Acceso y usuarios', orden: 10 };
  assert.equal(renderPage(row), src.replace('title: "Crear un rol"', 'title: "Crear un rol nuevo"'));
});

test('parsePage sin frontmatter deja todo en el cuerpo', () => {
  const p = parsePage('# Solo cuerpo\r\n');
  assert.equal(p.fmRaw, null);
  assert.equal(p.body, '# Solo cuerpo\r\n');
  assert.equal(renderPage({ fm_raw: null, body: p.body, frontmatter: {}, title: '', description: '', grupo: '', orden: 0 }), p.body);
});

test('renderPage añade/quita solo la línea padre (tras grupo), con CRLF y BOM, sin regenerar el resto', () => {
  const src = '﻿' + (PAGINA + '---\n\n# Hola\n').replace(/\n/g, '\r\n');
  const p = parsePage(src);
  const row = { fm_raw: p.fmRaw, body: p.body, frontmatter: p.frontmatter, title: 'Crear un rol', description: 'Crea un rol con sus permisos.', grupo: 'Acceso y usuarios', orden: 10 };
  const con = renderPage({ ...row, parent_route: '/tareas/acceso/otra' });
  assert.equal(con, src.replace('grupo: Acceso y usuarios\r\n', 'grupo: Acceso y usuarios\r\npadre: "/tareas/acceso/otra"\r\n'));
  // con la línea ya en el original y parent_route null → se quita y queda el original
  const p2 = parsePage(con);
  const row2 = { ...row, fm_raw: p2.fmRaw, frontmatter: p2.frontmatter, body: p2.body };
  assert.equal(renderPage({ ...row2, parent_route: '/tareas/acceso/otra' }), con);
  assert.equal(renderPage({ ...row2, parent_route: null }), src);
});
