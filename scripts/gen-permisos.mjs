#!/usr/bin/env node
/**
 * gen-permisos — genera docs/referencia/catalogo-permisos.mdx desde los JSON del frontend
 * (`src/pages/dashboard/usuarios/permisos/*.json`), que es el catálogo real del selector de permisos.
 *
 *   node scripts/gen-permisos.mjs
 *   ISPMAX_FE_SRC=<carpeta src del frontend>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/manual.mjs';
import { FE_SRC } from './lib/manual.mjs';

const FE = FE_SRC;
const dir = path.join(FE, 'pages', 'dashboard', 'usuarios', 'permisos');
const GRUPOS = [
  ['dashboard-permisos.json', 'Dashboard'],
  ['gestion-red-permisos.json', 'Gestión de Red'],
  ['gestion-clientes-permisos.json', 'Gestión de Clientes'],
  ['gestion-finanzas-permisos.json', 'Finanzas'],
  ['almacen-permisos.json', 'Almacén'],
  ['gestion-variables-permisos.json', 'Ajustes'],
];

const esc = s => String(s).replace(/\|/g, '\\|');
let total = 0;
let body = '';

function rows(nodes, trail = []) {
  let out = '';
  for (const n of nodes) {
    const here = [...trail, n.label];
    if (n.children?.length) {
      // El propio nodo también es una clave guardada; solo es "permiso real" si tiene hijos con interruptor maestro.
      out += rows(n.children, here);
    } else {
      total++;
      out += `| ${esc(trail.join(' › ') || '—')} | ${esc(n.label)} | \`${n.value}\` |\n`;
    }
  }
  return out;
}

for (const [file, titulo] of GRUPOS) {
  const json = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
  body += `\n## ${titulo}\n\n| Sección | Permiso (como aparece en el selector) | Clave |\n|---|---|---|\n${rows(json)}`;
}

const mdx = `---
title: "Catálogo de permisos"
description: "Lista completa de permisos que se pueden conceder a un rol o a un usuario, con su clave interna."
modulo: acceso
tipo: referencia
grupo: Acceso y permisos
orden: 2
funcionalidades: [ACC-005]
rutas: ["/roles-permisos", "/usuarios"]
sinonimos: ["permisos", "claves", "no me aparece el botón", "rol", "privilegios", "accesos"]
codigo:
  - FE:pages/dashboard/usuarios/components/ListPermisos.vue
  - FE:pages/dashboard/usuarios/permisos/gestion-clientes-permisos.json
verificado:
  fecha: ${process.env.ISPMAX_FECHA ?? new Date().toISOString().slice(0, 10)}
  version: ${process.env.ISPMAX_VERSION ?? 'zip-2026-10-14'}
  metodo: codigo
estado: verificado
---

<Kicker>Referencia</Kicker>

# Catálogo de permisos

<Lead>Todo lo que se puede activar en el selector **Permisos** de un rol o de un usuario. Cada interruptor guarda una clave; la pantalla o el botón correspondiente aparece solo si el usuario la tiene.</Lead>

:::info Cómo se aplican
Cómo funcionan los roles, qué pasa al cambiarlos y por qué a veces "no aparece el botón" está explicado en [Roles y permisos](/referencia/permisos). Esta página solo lista las claves. El rol **SUPER-ADMINISTRADOR** tiene todas.
:::

**${'__TOTAL__'} permisos** en 6 grupos. Los interruptores maestros (**Clientes perfil (edición)**, **Plantillas**, **Configurar empresa**, **Configurar formas pago**) habilitan a sus hijos.
${body}
<SearchTerms terms="permisos claves rol usuario catalogo no aparece boton privilegios acceso" />
`;

writeFileSync(path.join(ROOT, 'docs', 'referencia', 'catalogo-permisos.mdx'), mdx.replace('__TOTAL__', String(total)));
console.log(`catalogo-permisos.mdx: ${total} permisos`);
