#!/usr/bin/env node
/**
 * build-inventory — consolida los inventarios por dominio (`notes/inventory/*.md`) en:
 *   - docs-inventory.md        matriz maestra de funcionalidades (generado)
 *   - docs/_generated/inventory.json   mismo contenido, legible por otras herramientas
 *
 * Cada inventario sigue `notes/inventory/_BRIEF.md`:
 *   · una tabla "Resumen de funcionalidades" con filas `| ID | Funcionalidad | Ruta UI | Permisos | Estado |`
 *   · una sección `## <ID> · <Nombre>` por funcionalidad, con viñetas `- **Archivos:**`, `- **Acceso:**` …
 *
 * La cobertura documental (qué página cubre qué ID) se calcula en scripts/docs-coverage.mjs.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INV = path.join(ROOT, 'notes', 'inventory');

/** Prefijo de ID → módulo del manual (clave de `modulo` en el frontmatter) y etiqueta. */
export const MODULOS = {
  ACC: ['acceso', 'Acceso, usuarios, roles y panel'],
  AJS: ['ajustes', 'Ajustes del sistema'],
  MSG: ['mensajeria', 'Plantillas, mensajería y pagos (configuración)'],
  CLI: ['clientes', 'Clientes'],
  SRV: ['servicios', 'Servicios del cliente, contratos y facturación automática'],
  SOP: ['soporte', 'Tickets, instalaciones y técnicos'],
  COB: ['cobranza', 'Cobranza: pagos, promesas, conciliación'],
  VEN: ['ventas', 'Ventas, facturación electrónica e ingresos/egresos'],
  RED: ['red', 'Routers, redes IP y planes'],
  NET: ['infraestructura', 'Cajas NAP, mapa y monitoreo'],
  OLT: ['olt', 'SmartOLT y AdminOLT'],
  ALM: ['almacen', 'Almacén'],
  AUT: ['automatizaciones', 'Automatizaciones y procesos en segundo plano'],
  POR: ['portal', 'Portal del cliente'],
  BOT: ['bot', 'Bot de WhatsApp y asistente de IA'],
  BAN: ['bandeja', 'Bandeja de conversaciones, CRM y avisos a grupos'],
  INC: ['incidentes', 'Incidentes de red y avisos a clientes'],
  EXT: ['servicios-externos', 'Conexión con servicios externos'],
};

const clean = s => s.replace(/\s+/g, ' ').replace(/\*\*/g, '').trim();
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export function parseInventories() {
  const features = new Map();
  for (const file of readdirSync(INV).filter(f => f.endsWith('.md') && !f.startsWith('_')).sort()) {
    const src = readFileSync(path.join(INV, file), 'utf8');

    // 1) Tabla resumen
    for (const line of src.split(/\r?\n/)) {
      const m = line.match(/^\|\s*([A-Z]{2,5}-\d{3})\s*\|(.*)\|\s*$/);
      if (!m) continue;
      const cols = m[2].split('|').map(c => c.trim());
      if (features.has(m[1]) && features.get(m[1]).fuente !== file) continue; // ID duplicado entre archivos: gana el primero
      features.set(m[1], {
        id: m[1],
        nombre: clean(cols[0] ?? ''),
        ruta: clean(cols[1] ?? ''),
        permisos: clean(cols[2] ?? ''),
        lectura: clean(cols[3] ?? ''),
        fuente: file,
        archivos: '',
        acceso: '',
        acciones: 0,
        pendiente: false,
      });
    }

    // 2) Secciones de detalle
    const parts = src.split(/^##\s+(?=[A-Z]{2,5}-\d{3}\b)/m).slice(1);
    for (const part of parts) {
      const id = part.match(/^([A-Z]{2,5}-\d{3})/)?.[1];
      const f = id && features.get(id);
      if (!f) continue;
      const grab = label => {
        const m = part.match(new RegExp(`^- \\*\\*${label}[^*]*\\*\\*:?\\s*(.*(?:\\n(?!- \\*\\*|##|\\n).*)*)`, 'mi'));
        return m ? clean(m[1]) : '';
      };
      f.archivos = grab('Archivos');
      f.acceso = grab('Acceso');
      f.acciones = (part.match(/^\|[^|\n]+\|[^|\n]+\|[^|\n]*\|[^|\n]*\|[^|\n]*\|\s*$/gm) ?? []).length;
      f.pendiente = /Pendiente de validar/i.test(part) && /❓/.test(part);
    }
  }
  return [...features.values()];
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('build-inventory.mjs')) {
  const list = parseInventories();
  const byMod = new Map();
  for (const f of list) {
    const k = f.id.split('-')[0];
    if (!byMod.has(k)) byMod.set(k, []);
    byMod.get(k).push(f);
  }

  const today = new Date().toISOString().slice(0, 10);
  let md = `# Inventario maestro de funcionalidades de ISPMAX

> **Generado** por \`scripts/build-inventory.mjs\` desde \`notes/inventory/*.md\` el ${today}. No editar a mano:
> corregir el inventario de origen y volver a generar.
> Fuente: código del ZIP del 2026-10-06 (frontend + backend). Marca de lectura: **completo** = leído de extremo a extremo;
> **parcial** = quedó algo sin leer; ❓ = requiere validación en la UI.
> Cobertura documental de cada fila: ver [docs-coverage.md](docs-coverage.md).

**Total: ${list.length} funcionalidades en ${byMod.size} dominios.**

| Dominio | Funcionalidades | Parciales | Con ❓ |
|---|---:|---:|---:|
${[...byMod.entries()].map(([k, v]) => `| ${MODULOS[k]?.[1] ?? k} (\`${k}\`) | ${v.length} | ${v.filter(x => /parcial/i.test(x.lectura)).length} | ${v.filter(x => x.pendiente).length} |`).join('\n')}

Detalle por pantalla (campos, botones, reglas, mensajes): \`notes/inventory/<dominio>.md\`.
`;

  for (const [k, v] of byMod) {
    md += `\n## ${MODULOS[k]?.[1] ?? k}\n\n| ID | Funcionalidad | Ruta UI | Roles / permisos | Código relacionado | Lectura |\n|---|---|---|---|---|---|\n`;
    for (const f of v) {
      md += `| ${f.id} | ${cut(f.nombre, 90)} | ${cut(f.ruta, 70).replace(/\|/g, '\\|')} | ${cut(f.permisos, 70).replace(/\|/g, '\\|')} | ${cut(f.archivos.replace(/\|/g, '\\|'), 90)} | ${f.lectura}${f.pendiente ? ' ❓' : ''} |\n`;
    }
  }

  writeFileSync(path.join(ROOT, 'docs-inventory.md'), md);
  mkdirSync(path.join(ROOT, 'notes', '_generated'), { recursive: true });
  writeFileSync(path.join(ROOT, 'notes', '_generated', 'inventory.json'), JSON.stringify(list, null, 2));
  console.log(`docs-inventory.md: ${list.length} funcionalidades (${[...byMod.keys()].join(', ')})`);
}
