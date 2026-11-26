// Lectura y escritura de páginas .mdx (frontmatter + cuerpo) con fidelidad byte a byte.
// - `parsePage(src)` separa el frontmatter original (`fmRaw`, tal cual: BOM, delimitadores y saltos de línea incluidos)
//   del cuerpo, y deriva `frontmatter` (objeto) con `yaml` solo para consultar y editar.
// - `buildFrontmatter(obj, opts)` genera el YAML interior (sin `---`) en el estilo del repo: listas en línea `[a, b]`,
//   comillas dobles en title/description y en los elementos de rutas/permisos/sinonimos, bloques `codigo:` con guiones
//   y mapas anidados (`verificado:`) con dos espacios. Con `opts.like` (YAML original) copia orden, comillas y líneas
//   en blanco del original para que una edición cambie lo mínimo.
// - `renderPage(row)` decide qué escribir al exportar: `fm_raw` si el frontmatter no cambió desde la importación;
//   si cambió, lo regenera con `buildFrontmatter`.
import YAML from 'yaml';

const BOM = '﻿';
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Separa frontmatter y cuerpo. Devuelve { bom, eol, fmRaw, fmText, body, frontmatter, fmError }. */
export function parsePage(src) {
  const bom = src.startsWith(BOM);
  const rest = bom ? src.slice(1) : src;
  const m = rest.match(FM_RE);
  if (!m) return { bom, eol: detectEol(src), fmRaw: null, fmText: null, body: src, frontmatter: {}, fmError: null };
  const fmRaw = (bom ? BOM : '') + m[0];
  const { data, error } = parseYaml(m[1]);
  return { bom, eol: detectEol(m[0]), fmRaw, fmText: m[1], body: rest.slice(m[0].length), frontmatter: data, fmError: error };
}

/** YAML interior de un `fm_raw` completo (o null). */
export function fmTextOf(fmRaw) {
  if (fmRaw == null) return null;
  const m = fmRaw.replace(/^﻿/, '').match(FM_RE);
  return m ? m[1] : null;
}

export function parseYaml(text) {
  try {
    const data = YAML.parse(text ?? '');
    if (data == null) return { data: {}, error: null };
    if (typeof data !== 'object' || Array.isArray(data)) return { data: {}, error: 'El frontmatter no es un mapa de claves.' };
    return { data: toJson(data), error: null };
  } catch (e) {
    return { data: {}, error: `Frontmatter YAML inválido: ${e.message.split('\n')[0]}` };
  }
}

// Normaliza a lo que guarda jsonb (sin undefined, fechas como texto).
const toJson = v => JSON.parse(JSON.stringify(v));

export const detectEol = s => (/\r\n/.test(s) ? '\r\n' : '\n');

// ───────────────────────────── buildFrontmatter ─────────────────────────────

// Orden habitual de las claves en las páginas del repo.
const ORDER = ['pageType', 'title', 'description', 'modulo', 'tipo', 'grupo', 'padre', 'orden', 'funcionalidades', 'rutas', 'permisos',
  'roles', 'sinonimos', 'codigo', 'verificado', 'estado', 'generado', 'head', 'hero', 'features'];
// Escalares que el repo escribe entre comillas dobles.
const DQ_KEYS = new Set(['title', 'description', 'tagline', 'content', 'padre']);
// Listas en línea cuyos elementos van entre comillas dobles.
const DQ_ITEM_KEYS = new Set(['rutas', 'permisos', 'sinonimos']);
// Listas que van en bloque (una por línea con guion).
const BLOCK_LIST_KEYS = new Set(['codigo']);

/**
 * Texto YAML (sin delimitadores `---`, termina en salto de línea) en el estilo del repo.
 * opts: { like?: string (YAML original para copiar estilo), eol?: '\n'|'\r\n' }
 */
export function buildFrontmatter(obj, opts = {}) {
  const eol = opts.eol ?? (opts.like ? detectEol(opts.like) : '\n');
  const hints = opts.like ? styleHints(opts.like) : { order: [], blankBefore: new Set(), scalar: {}, items: {}, block: new Set() };
  const keys = Object.keys(obj ?? {});
  const rank = k => {
    const i = hints.order.indexOf(k);
    if (i >= 0) return i;
    const j = ORDER.indexOf(k);
    return 1000 + (j >= 0 ? j : ORDER.length + keys.indexOf(k));
  };
  const sorted = [...keys].sort((a, b) => rank(a) - rank(b));
  const lines = [];
  sorted.forEach((k, i) => {
    if (obj[k] === undefined) return;
    if (i > 0 && hints.blankBefore.has(k)) lines.push('');
    lines.push(...emitEntry(k, obj[k], '', hints, true));
  });
  return lines.join(eol) + eol;
}

/** Reglas de estilo deducidas del YAML original (por nombre de clave). */
function styleHints(text) {
  const order = [];
  const blankBefore = new Set();
  const scalar = {}; // clave → 'dq' | 'sq' | 'plain' (último visto)
  const exact = new Map(); // clave + valor → estilo de esa aparición concreta
  const items = {}; // clave de lista en línea → 'dq' | 'plain'
  const block = new Set(); // claves con lista en bloque
  let prevBlank = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') { prevBlank = true; continue; }
    const top = line.match(/^([A-Za-z_][\w-]*):/);
    if (top) { order.push(top[1]); if (prevBlank) blankBefore.add(top[1]); }
    prevBlank = false;
    const kv = line.match(/^\s*(?:- )*([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v === '') { block.add(k); continue; }
    if (v.startsWith('[')) items[k] = /^\[\s*"/.test(v) ? 'dq' : 'plain';
    else {
      const style = v.startsWith('"') ? 'dq' : v.startsWith("'") ? 'sq' : 'plain';
      scalar[k] = style;
      const parsed = parseYaml(`v: ${v}`).data.v;
      if (typeof parsed === 'string') exact.set(`${k}|${parsed}`, style);
    }
  }
  return { order, blankBefore, scalar, exact, items, block };
}

const isScalar = v => v === null || ['string', 'number', 'boolean'].includes(typeof v);

function emitEntry(key, value, ind, hints, top) {
  if (isScalar(value)) return [`${ind}${key}: ${fmtScalar(value, scalarStyle(key, value, hints), false)}`];
  if (Array.isArray(value)) {
    const inline = value.every(isScalar) && !(BLOCK_LIST_KEYS.has(key) || (hints.block.has(key) && !(key in hints.items)));
    if (inline) {
      const st = hints.items[key] ?? (DQ_ITEM_KEYS.has(key) ? 'dq' : 'plain');
      return [`${ind}${key}: [${value.map(v => fmtScalar(v, st, true)).join(', ')}]`];
    }
    if (value.length === 0) return [`${ind}${key}: []`];
    return [`${ind}${key}:`, ...emitBlockSeq(value, ind + '  ', hints)];
  }
  const ks = Object.keys(value);
  if (ks.length === 0) return [`${ind}${key}: {}`];
  return [`${ind}${key}:`, ...ks.flatMap(k => emitEntry(k, value[k], ind + '  ', hints, false))];
}

// Secuencia en bloque; los elementos compuestos usan la notación compacta (`- - meta`, `- name: x`).
function emitBlockSeq(arr, ind, hints) {
  const out = [];
  for (const item of arr) {
    let lines;
    if (isScalar(item)) lines = [fmtScalar(item, 'plain', false)];
    else if (Array.isArray(item)) lines = item.length ? emitBlockSeq(item, '', hints) : ['[]'];
    else {
      const ks = Object.keys(item);
      lines = ks.length ? ks.flatMap(k => emitEntry(k, item[k], '', hints, false)) : ['{}'];
    }
    out.push(`${ind}- ${lines[0]}`, ...lines.slice(1).map(l => `${ind}  ${l}`));
  }
  return out;
}

function scalarStyle(key, value, hints) {
  return hints.exact?.get(`${key}|${value}`) ?? hints.scalar[key] ?? (DQ_KEYS.has(key) ? 'dq' : 'plain');
}

function fmtScalar(v, style, inFlow) {
  if (v === null) return 'null';
  if (typeof v !== 'string') return String(v);
  if (style === 'plain' && plainOk(v, inFlow)) return v;
  if (style === 'sq' && !/[\n\r]/.test(v)) return `'${v.replace(/'/g, "''")}'`;
  return JSON.stringify(v); // comillas dobles: el escape de JSON es válido en YAML
}

// ¿Se puede escribir sin comillas y se lee igual (mismo tipo y mismo texto)?
function plainOk(s, inFlow) {
  if (s === '' || s.trim() !== s || /[\n\r\t]/.test(s)) return false;
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(s) && !/^[-?:][^\s,[\]{}]/.test(s)) return false;
  if (/: |:$| #/.test(s)) return false;
  if (inFlow && /[,[\]{}]/.test(s)) return false;
  try {
    return YAML.parse(inFlow ? `[${s}]` : `k: ${s}`)?.[inFlow ? 0 : 'k'] === s;
  } catch {
    return false;
  }
}

// ───────────────────────────── exportación ─────────────────────────────

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

/**
 * Frontmatter efectivo de una fila de `pages`: el jsonb `frontmatter` con las columnas title/description/grupo/orden
 * encima (las columnas mandan; si una columna está vacía y la clave no existe, no se añade).
 */
export function effectiveFrontmatter(row) {
  const fm = { ...(row.frontmatter ?? {}) };
  for (const k of ['title', 'description', 'grupo']) {
    const v = row[k] ?? '';
    if (v !== '') fm[k] = v;
    else if (k === 'grupo') delete fm.grupo;
    else if (k in fm) fm[k] = '';
  }
  // `padre` lo manda parent_id (ruta del padre, vía `parent_route` si la fila la trae); sin padre se quita.
  if ('parent_route' in row) {
    if (row.parent_route) fm.padre = row.parent_route;
    else delete fm.padre;
  }
  const orden = row.orden ?? 0;
  if (orden !== 0 || 'orden' in fm) fm.orden = orden;
  return fm;
}

/** Quita o pone la línea `padre:` en un `fm_raw` completo; null si no se puede parchear con seguridad. */
function patchPadre(fmRaw, padre) {
  const eol = detectEol(fmRaw);
  const m = fmRaw.match(/^(\uFEFF?---\r?\n)([\s\S]*)(---(?:\r?\n)?)$/);
  if (!m || (m[2] !== '' && !/\n$/.test(m[2]))) return null;
  const lines = m[2] === '' ? [] : m[2].replace(/\r?\n$/, '').split(/\r?\n/);
  const nested = i => lines[i + 1] !== undefined && /^\s+\S/.test(lines[i + 1]); // la clave abre un bloque
  const idx = lines.findIndex(l => /^padre:/.test(l));
  if (idx >= 0 && nested(idx)) return null;
  if (idx >= 0) lines.splice(idx, 1);
  if (padre != null && padre !== '') {
    const g = lines.findIndex(l => /^grupo:/.test(l));
    lines.splice(g >= 0 && !nested(g) ? g + 1 : lines.length, 0, `padre: ${JSON.stringify(String(padre))}`);
  }
  return m[1] + lines.join(eol) + (lines.length ? eol : '') + m[3];
}

/** Texto completo del .mdx a exportar para una fila de `pages`. */
export function renderPage(row) {
  const body = row.body ?? '';
  const fm = effectiveFrontmatter(row);
  if (row.fm_raw != null) {
    const raw = parseYaml(fmTextOf(row.fm_raw)).data;
    if (deepEqual(raw, fm)) return row.fm_raw + body;
    // Solo cambia `padre`: se parchea esa línea en el texto original (no se regenera el frontmatter, así el resto queda byte a byte).
    const { padre: rawPadre, ...rawRest } = raw;
    const { padre: newPadre, ...fmRest } = fm;
    if (deepEqual(rawRest, fmRest)) {
      const patched = patchPadre(row.fm_raw, newPadre);
      if (patched != null) return patched + body;
    }
  } else if (Object.keys(fm).length === 0) {
    return body;
  }
  const like = fmTextOf(row.fm_raw);
  const eol = like != null ? detectEol(row.fm_raw) : detectEol(body);
  const bom = row.fm_raw?.startsWith(BOM) ? BOM : '';
  return `${bom}---${eol}${buildFrontmatter(fm, { like, eol })}---${eol}${body}`;
}
