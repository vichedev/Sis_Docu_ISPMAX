#!/usr/bin/env node
/**
 * gen-mensajes — genera docs/referencia/mensajes-del-sistema.mdx a partir del código (solo lectura):
 *
 *   (a) backend: `throw new …Exception('…')` (BadRequest, NotFound, Unauthorized, Conflict, Forbidden, HttpException…)
 *       y los mensajes de validación declarados en los DTO (`message: '…'`);
 *   (b) frontend: `mostrarNotify(tipo, texto)`, `$q.notify({…})`, `Notify.create({…})`, `$q.dialog({…})`,
 *       `Dialog.create({…})` con texto fijo; si el texto está en una variable local o llega como parámetro de una función
 *       del mismo archivo, se resuelve (asignaciones previas y argumentos de las llamadas);
 *   (c) frontend, textos de campo: mensajes de validación (`validaciones…message = '…'`, `{ isValid, message }`), reglas
 *       (`:rules`, en línea o en funciones del mismo archivo), `error-message`, `hint` y `<template #error>`/`#hint`.
 *       Solo se incluyen los mensajes que alguna plantilla del módulo llega a mostrar. Un texto de campo que sale en
 *       tres o más módulos va una sola vez en «Mensajes generales».
 *
 *   (d) backend, confirmaciones de éxito (`{ msg | message | mensaje: '…' }` que devuelve un servicio): solo las que una pantalla
 *       muestra en un aviso. Se parte del aviso del frontend, se busca su `api.<verbo>('<ruta>')`, la ruta del controlador y el
 *       método del servicio, y se leen sus `return`. El resto (bitácora, colas, errores internos, respuestas que ninguna
 *       pantalla lee) no se publica; `--auditar-exito` las cuenta y lista, y `--exito` muestra el recorrido de cada una.
 *
 * No se incluyen: mensajes técnicos (inglés de desarrollador, colas, cron, parámetros de API, firmas de webhook),
 * los que nombran variables de entorno, rutas o archivos internos, ni los que interpolan secretos. Lo omitido se
 * puede revisar con `--auditar`.
 *
 * La columna "Qué significa / qué hacer" solo se completa con lo que el código permite afirmar:
 *   · NOTAS (abajo): explicaciones escritas a mano, cada una con la cita `ruta:línea` que la respalda. El script
 *     avisa si una nota ya no coincide con ningún mensaje (código cambiado) y entonces hay que revisarla;
 *   · aviso automático de "texto de reserva" cuando el mensaje solo se muestra si el servidor no envió un motivo.
 *
 *   node scripts/gen-mensajes.mjs              # escribe la página
 *   node scripts/gen-mensajes.mjs --auditar    # además lista por stdout lo omitido y el motivo
 *   node scripts/gen-mensajes.mjs --seco       # no escribe; solo cuenta
 *   node scripts/gen-mensajes.mjs --exito      # recorrido aviso de pantalla → ruta → texto del servidor (y los avisos que no se pudieron seguir)
 *   node scripts/gen-mensajes.mjs --auditar-exito  # clasifica los msg/message/mensaje del backend
 *   node scripts/gen-mensajes.mjs --sin-texto  # lista los avisos de pantalla cuyo texto no es fijo (llega del servidor o de un dato)
 *   ISPMAX_FE_SRC=<carpeta src del frontend>  ISPMAX_BE_SRC=<carpeta src del backend>
 *   ISPMAX_VERSION=<etiqueta del código>  ISPMAX_FECHA=AAAA-MM-DD
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/manual.mjs';
import { FE_SRC, BE_SRC } from './lib/manual.mjs';

const FE = FE_SRC;
const BE = BE_SRC;
const VERSION = process.env.ISPMAX_VERSION ?? 'main-2026-11-04';
const FECHA = process.env.ISPMAX_FECHA ?? new Date().toISOString().slice(0, 10);
const args = new Set(process.argv.slice(2));

if (!existsSync(FE) || !existsSync(BE)) {
  console.error(`Código fuente no disponible (ISPMAX_FE_SRC=${FE}, ISPMAX_BE_SRC=${BE}). No se modifica la página.`);
  process.exit(1);
}

// ───────────────────────── Lectura de código: utilidades de análisis ─────────────────────────

const walk = (dir, exts) =>
  readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return ['node_modules', 'migrations'].includes(e.name) ? [] : walk(p, exts);
    return exts.some(x => p.endsWith(x)) && !p.endsWith('.spec.ts') ? [p] : [];
  });

const lineOf = (src, idx) => {
  let n = 1;
  for (let i = 0; i < idx; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
};

/** Índice posterior al cierre de una cadena o plantilla que empieza en i. */
function skipString(s, i) {
  const q = s[i];
  i++;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') { i += 2; continue; }
    if (q === '`' && c === '$' && s[i + 1] === '{') {
      i += 2;
      let d = 1;
      while (i < s.length && d > 0) {
        const ch = s[i];
        if (ch === '"' || ch === "'" || ch === '`') { i = skipString(s, i); continue; }
        if (ch === '{') d++;
        else if (ch === '}') d--;
        i++;
      }
      continue;
    }
    if (c === q) return i + 1;
    i++;
  }
  return i;
}

/** Salta comentarios; devuelve el mismo índice si en i no empieza uno. */
function skipComment(s, i) {
  if (s[i] === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; return i; }
  if (s[i] === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); return e < 0 ? s.length : e + 2; }
  return i;
}

/**
 * Marca (1) las posiciones que están dentro de comentarios, para ignorar código comentado.
 * En `.vue` solo se analizan los bloques `<script>`; en la plantilla solo se detectan `<!-- -->`.
 */
function mascaraComentarios(src, esVue) {
  const mask = new Uint8Array(src.length);
  const marcar = (a, b) => mask.fill(1, a, Math.min(b, src.length));
  const analizarJs = (ini, fin) => {
    let i = ini;
    while (i < fin) {
      const c = src[i];
      if (c === '"' || c === "'" || c === '`') { i = Math.min(skipString(src, i), fin); continue; }
      if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) { const e = skipComment(src, i); marcar(i, e); i = e; continue; }
      i++;
    }
  };
  if (!esVue) { analizarJs(0, src.length); return mask; }
  for (const h of src.matchAll(/<!--[\s\S]*?-->/g)) marcar(h.index, h.index + h[0].length);
  for (const b of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) analizarJs(b.index + b[0].indexOf('>') + 1, b.index + b[0].length);
  return mask;
}

/** Índice del cierre que corresponde al ( { [ de i (−1 si no lo hay). */
function matchClose(s, i) {
  let d = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(s, i); continue; }
    if (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*')) { i = skipComment(s, i); continue; }
    if (c === '(' || c === '{' || c === '[') d++;
    else if (c === ')' || c === '}' || c === ']') { d--; if (d === 0) return i; }
    i++;
  }
  return -1;
}

/** Recorre un texto de código sin entrar en cadenas ni comentarios; cb(i, c, profundidad) devuelve true para parar. */
function scanTop(s, cb) {
  let d = 0;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(s, i); continue; }
    if (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*')) { i = skipComment(s, i); continue; }
    if (c === '(' || c === '{' || c === '[') d++;
    else if (c === ')' || c === '}' || c === ']') d--;
    else if (cb(i, c, d)) return;
    i++;
  }
}

/** Divide por comas de nivel superior. */
function splitTop(s) {
  const out = [];
  let from = 0;
  scanTop(s, (i, c, d) => {
    if (c === ',' && d === 0) { out.push(s.slice(from, i).trim()); from = i + 1; }
  });
  const rest = s.slice(from).trim();
  if (rest) out.push(rest);
  return out;
}

/** Divide por un operador de dos caracteres (`||`, `??`) de nivel superior. */
function splitOp(s, ops) {
  const out = [];
  let from = 0;
  scanTop(s, (i, c, d) => {
    if (d === 0 && ops.includes(s.slice(i, i + 2))) { out.push(s.slice(from, i).trim()); from = i + 2; }
  });
  out.push(s.slice(from).trim());
  return out;
}

/** `cond ? a : b` de nivel superior (ignora `?.` y `??`). */
function splitTernary(s) {
  let q = -1;
  let anidados = 0;
  let col = -1;
  scanTop(s, (i, c, d) => {
    if (d !== 0) return;
    if (c === '?' && s[i + 1] !== '.' && s[i + 1] !== '?' && s[i - 1] !== '?') {
      if (q < 0) q = i; else anidados++;
    } else if (c === ':' && q >= 0) {
      if (anidados > 0) anidados--; else { col = i; return true; }
    }
  });
  if (q < 0 || col < 0) return null;
  return { a: s.slice(q + 1, col).trim(), b: s.slice(col + 1).trim() };
}

/** Quita paréntesis que envuelven toda la expresión. */
function sinParentesis(s) {
  s = s.trim();
  while (s[0] === '(' && matchClose(s, 0) === s.length - 1) s = s.slice(1, -1).trim();
  return s;
}

const unesc = s =>
  s.replace(/\\(n|t|r|'|"|`|\\|\$|u[0-9a-fA-F]{4})/g, (_, c) =>
    c === 'n' || c === 't' || c === 'r' ? ' ' : c.startsWith('u') ? String.fromCharCode(parseInt(c.slice(1), 16)) : c,
  );

const ERROR_DETALLE = /\b(?:e|err|error|ex|exception)\b\s*\??\.\s*(?:message|detail|response|error|stack|code)|\.stack\b|\.detail\b/;
const SECRETO = /token|secret|passw|contrase|api[_-]?key|apikey|bearer|authorization|credential|\.key\b|clave/i;

/** Variantes de texto de una interpolación `${cond ? 'a' : 'b'}` cuando todas las ramas son texto fijo (si no, null). */
function variantesInterpolacion(inner) {
  const e = sinParentesis(inner);
  const t = splitTernary(e);
  if (!t) return null;
  const a = alternativas(t.a);
  const b = alternativas(t.b);
  if (!a.length || !b.length) return null;
  return [...a, ...b];
}

/** Plantilla/cadena/concatenación → lista de { text, exprs } (vacía si no hay texto fijo). */
function textoLiteral(expr) {
  const partes = [];
  let desde = 0;
  scanTop(expr, (i, c, d) => {
    if (c === '+' && d === 0) { partes.push(expr.slice(desde, i).trim()); desde = i + 1; }
  });
  partes.push(expr.slice(desde).trim());
  let variantes = [{ text: '', exprs: [] }];
  let lit = 0;
  const anexar = (opciones) => {
    // opciones: [{ text, exprs }]; producto cartesiano acotado
    if (variantes.length * opciones.length > 6) opciones = [opciones[0]];
    variantes = variantes.flatMap(v => opciones.map(o => ({ text: v.text + o.text, exprs: [...v.exprs, ...o.exprs] })));
  };
  for (const p of partes) {
    const q = p[0];
    if ((q === '"' || q === "'") && p.length > 1 && p.at(-1) === q && skipString(p, 0) === p.length) {
      anexar([{ text: unesc(p.slice(1, -1)), exprs: [] }]);
      lit++;
    } else if (q === '`' && p.length > 1 && skipString(p, 0) === p.length) {
      const body = p.slice(1, -1);
      let k = 0;
      let fijo = '';
      const vaciar = () => { if (fijo) { anexar([{ text: fijo, exprs: [] }]); fijo = ''; } };
      while (k < body.length) {
        if (body[k] === '\\') { fijo += unesc(body.slice(k, k + 2)); k += 2; continue; }
        if (body[k] === '$' && body[k + 1] === '{') {
          const ini = k + 2;
          let d = 1;
          k += 2;
          while (k < body.length && d > 0) {
            if (body[k] === '"' || body[k] === "'" || body[k] === '`') { k = skipString(body, k); continue; }
            if (body[k] === '{') d++;
            else if (body[k] === '}') d--;
            k++;
          }
          const inner = body.slice(ini, k - 1);
          vaciar();
          const vars = variantesInterpolacion(inner);
          if (vars) anexar(vars);
          else anexar([{ text: ERROR_DETALLE.test(inner) ? '[detalle del error]' : '…', exprs: [inner] }]);
          continue;
        }
        fijo += body[k];
        k++;
      }
      vaciar();
      lit++;
    } else {
      // Un tramo `(cond ? 'a' : 'b')` con textos fijos da una variante por rama.
      const vars = variantesInterpolacion(p);
      if (vars) anexar(vars);
      else anexar([{ text: ERROR_DETALLE.test(p) ? '[detalle del error]' : '…', exprs: [p] }]);
    }
  }
  return lit ? variantes : [];
}

/**
 * Textos fijos posibles de una expresión: ramas de un ternario y, tras `||` / `??` con un primer operando dinámico,
 * el texto de reserva (`reserva: true`).
 */
function alternativas(expr) {
  expr = sinParentesis(expr);
  if (!expr) return [];
  // `texto`.trim() / .toString(): el texto es el mismo.
  const recorte = expr.match(/^([\s\S]*)\.(?:trim|toString)\(\)$/);
  if (recorte && /^['"`]/.test(recorte[1].trim()) && skipString(recorte[1].trim(), 0) === recorte[1].trim().length) return alternativas(recorte[1]);
  // utils/mensajeError.js: devuelve el mensaje del servidor o, si no lo hay, el 2.º argumento.
  const me = expr.match(/^mensajeError(?:Descarga)?\s*\(/); // Descarga: alias de importación en Contratos.vue
  if (me && matchClose(expr, me[0].length - 1) === expr.length - 1)
    return alternativas(splitTop(expr.slice(me[0].length, -1))[1] ?? '').map(a => ({ ...a, reserva: true }));
  const t = splitTernary(expr);
  if (t) return [...alternativas(t.a), ...alternativas(t.b)];
  const ops = splitOp(expr, ['||', '??']);
  if (ops.length > 1) {
    const out = [];
    let hayDinamico = false;
    for (const op of ops) {
      const alts = alternativas(op);
      // Solo es "texto de reserva" si lo anterior es el mensaje/error que trae una respuesta o una excepción.
      if (!alts.length) { if (/response|\.message|\.error|\.msg|\.detail|\.mensaje|mensajeError|\bmsg\b|\bmessage\b/.test(op)) hayDinamico = true; continue; }
      for (const a of alts) out.push({ ...a, reserva: a.reserva || hayDinamico });
    }
    return out;
  }
  return textoLiteral(expr).map(v => ({ ...v, reserva: false }));
}

/** Valor de la propiedad `clave:` de un literal de objeto `{ … }`. */
function propiedad(objSrc, clave) {
  const inner = objSrc.trim().replace(/^\{/, '').replace(/\}$/, '');
  for (const campo of splitTop(inner)) {
    const m = campo.match(new RegExp(`^['"]?${clave}['"]?\\s*:\\s*([\\s\\S]*)$`));
    if (m) return m[1].trim();
    if (campo.trim() === clave) return clave; // forma abreviada `{ message }`
  }
  return null;
}

/** Fin de la expresión que empieza en i: `;`, un cierre sin abrir, o un salto de línea que no continúa la expresión. */
function finExpresion(s, i) {
  let d = 0;
  let ultimo = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(s, i); ultimo = c; continue; }
    if (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*')) { i = skipComment(s, i); continue; }
    if (c === '(' || c === '{' || c === '[') d++;
    else if (c === ')' || c === '}' || c === ']') { if (d === 0) return i; d--; }
    else if (d === 0 && c === ';') return i;
    else if (d === 0 && c === '\n') {
      const sig = s.slice(i).match(/^\s*(\S)/)?.[1] ?? '';
      if (!/[?:.+|&,)\]]/.test(sig) && !/[?:+\-*|&,(=>]/.test(ultimo)) return i;
    }
    if (!/\s/.test(c)) ultimo = c;
    i++;
  }
  return i;
}

/**
 * Si `id` es un parámetro de la función que contiene la posición `hasta`, devuelve las expresiones que reciben ese
 * parámetro en las llamadas a esa función dentro del mismo archivo (plantilla incluida).
 */
const CABECERA_FUNCION = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|([\w$]+))\s*=>|function\s+([\w$]+)\s*\(([^)]*)\))/gm;
function argumentosDeLlamadas(src, mask, id, hasta) {
  let cab = null;
  for (const f of src.slice(Math.max(0, hasta - 4000), hasta).matchAll(CABECERA_FUNCION)) cab = f;
  if (!cab) return [];
  const nombre = cab[1] ?? cab[4];
  const params = splitTop(cab[2] ?? cab[3] ?? cab[5] ?? '').map(x => x.replace(/\s*[:=][\s\S]*$/, '').trim());
  const k = params.indexOf(id);
  if (k < 0) return [];
  const out = [];
  const re = new RegExp(`(?<![\\w$.])${nombre.replace(/\$/g, '\\$')}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(src))) {
    if (mask[m.index]) continue;
    const abre = m.index + m[0].length - 1;
    if (/(?:const|let|var|function)\s+$/.test(src.slice(Math.max(0, m.index - 10), m.index))) continue; // la propia declaración
    const cierre = matchClose(src, abre);
    if (cierre < 0) continue;
    const arg = splitTop(src.slice(abre + 1, cierre))[k];
    if (arg) out.push({ txt: arg, ini: abre + 1 + src.slice(abre + 1, cierre).indexOf(arg) });
  }
  return out;
}

/** Línea del código donde está el texto fijo `texto` (se busca su fragmento más largo entre ini y fin; si no, la de ini). */
function lineaDeTexto(src, ini, fin, texto) {
  const frag = texto.split(/…|\[detalle del error\]/).sort((a, b) => b.length - a.length)[0].trim();
  for (const n of [frag.length, 24, 12]) {
    const f = frag.slice(0, Math.min(n, frag.length));
    if (f.length < 4) break;
    const i = src.indexOf(f, ini);
    if (i >= 0 && i <= fin) return lineOf(src, i);
  }
  return lineOf(src, ini);
}

/** Textos fijos de lo que asignan a una variable local en la función que contiene la posición `hasta` (solo lectura de código). */
const INICIO_FUNCION = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:(?:const|let|var)\s+[\w$]+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>|function\s+[\w$]+)/gm;
function asignacionesDe(src, mask, id, hasta) {
  const base = Math.max(0, hasta - 4000);
  let desde = base;
  for (const f of src.slice(base, hasta).matchAll(INICIO_FUNCION)) desde = base + f.index; // última cabecera de función antes de la llamada
  const re = new RegExp(`(?<![\\w$.])${id.replace(/\$/g, '\\$')}(?:\\.value)?\\s*\\+?=(?![=>])\\s*`, 'g'); // `=` y `+=` (el texto añadido sale como fragmento propio)
  re.lastIndex = desde;
  const out = [];
  let m;
  while ((m = re.exec(src)) && m.index < hasta) {
    if (mask[m.index]) continue;
    const ini = m.index + m[0].length;
    out.push({ txt: src.slice(ini, finExpresion(src, ini)), ini });
  }
  return out;
}

// ───────────────────────── Módulos (agrupación para el lector) ─────────────────────────

/** Orden de las secciones de la página: primero los módulos de uso diario (clientes, pagos, facturas, red, acceso, mensajería). */
const GRUPOS = [
  { id: 'generales', titulo: 'Mensajes generales' },
  { id: 'clientes', titulo: 'Clientes y servicios' },
  { id: 'pagos', titulo: 'Pagos y cobranza' },
  { id: 'facturas', titulo: 'Facturas y comprobantes' },
  { id: 'red', titulo: 'Red, routers y OLT' },
  { id: 'acceso', titulo: 'Acceso, usuarios y roles' },
  { id: 'mensajeria', titulo: 'Mensajería' },
  { id: 'soporte', titulo: 'Soporte e instalaciones' },
  { id: 'almacen', titulo: 'Almacén y compras' },
  { id: 'contratos', titulo: 'Contratos y firma electrónica' },
  { id: 'finanzas', titulo: 'Ingresos, egresos y conciliación' },
  { id: 'ajustes', titulo: 'Ajustes y empresa' },
];

/** Primera regla que coincida con la ruta relativa al `src` del backend. */
const MODULOS_BE = [
  [/^(auth|roles-and-permisos)\//, 'acceso'],
  [/^(customers|servicios-personalizado|servicios-recurrente|servicios-recurrente-pagos|custom-fields|sucursal\/sucursal-facturacion)/, 'clientes'],
  [/^(pagos|registro-pagos|pasarelas-pago|promesas-pago|forma-pago|detalle-forma-pago|pago-mes-adelantado|transacciones|facturas-pagos)\//, 'pagos'],
  [/^(invoices|crear-facturas|facturacion|facturacion-automatica|grupos-facturacion|comprobantes-electronicos|proforma)\//, 'facturas'],
  [/^(router|internet|mikrotik|mikrotik-resources|red-ipv4|red-ipv6|red-fibra|caja-nap|monitoreo-dispositivos|monitoreo-trafico|smart-olt|admin-olt|puertos)\//, 'red'],
  [/^(cloud-api|email|mensajes-masivos|notifications)\//, 'mensajeria'],
  [/^(ticket|instalaciones|respuestas-instalaciones|respuestas-tickets|materiales|ubicacion-tecnicos)\//, 'soporte'],
  [/^(products|categories|equipos|providers|buys)\//, 'almacen'],
  [/^(contratos|contratos-archivos|firma-electronica)\//, 'contratos'],
  [/^(ingresos-egresos|conciliacion-bancaria)\//, 'finanzas'],
  [/^(settings|companies|sucursal|plantillas|database|tasa-bcv|dashboard|logs|files|config|common)\//, 'ajustes'],
];
const moduloBE = rel => (MODULOS_BE.find(([re]) => re.test(rel)) ?? [, 'ajustes'])[1];

/** Ruta relativa al `src` del frontend → grupo. Primera coincidencia. */
const MODULOS_FE = [
  [/^composables\/useHelpers\.js$/, 'generales'],
  [/^pages\/sesion\//, 'acceso'],
  [/^pages\/dashboard\/(roles-permisos|usuarios|personas)\//, 'acceso'],
  [/useRolPermisos|useRol\.js/, 'acceso'],
  [/(contrato|firma)/i, 'contratos'],
  [/^pages\/dashboard\/(clientes)\//, 'clientes'],
  [/^pages\/dashboard\/(registrar-pago|cobros-pasarela|promesas-pago|formas-pago|detalle-formas-pago|transacciones)\//, 'pagos'],
  [/ajustes\/pasarelas-pago|usePasarelasPago|useFormPago/, 'pagos'],
  [/^pages\/dashboard\/ventas\/|useFacturacion|components\/NuevaFactura|ajustes\/facturacion/, 'facturas'],
  [/^pages\/dashboard\/(Gestion-Red|red|mapa-clientes)\//, 'red'],
  [/ajustes\/(smartOLT|adminOLT|olts)|useHelperRedes|useUbicacion/, 'red'],
  [/^pages\/dashboard\/emails\/|ajustes\/(mensajeria|plantillas)|useWaCanal|layouts\/Notifications/, 'mensajeria'],
  [/^pages\/dashboard\/(tickets|instalaciones)\/|ajustes\/(ticket|instalacion)/, 'soporte'],
  [/^pages\/dashboard\/(productos|categories|compras|proveedores|equipos)\/|useProduct|components\/(SelectProduct|DetalleProducts)/, 'almacen'],
  [/^pages\/dashboard\/(ingresos-egresos|conciliacion-bancaria)\//, 'finanzas'],
];
const moduloFE = rel => (MODULOS_FE.find(([re]) => re.test(rel)) ?? [, 'ajustes'])[1];

// ───────────────────────── Extracción: backend ─────────────────────────

const CODIGO_CLASE = {
  BadRequestException: 400,
  UnauthorizedException: 401,
  ForbiddenException: 403,
  NotFoundException: 404,
  ConflictException: 409,
  InternalServerErrorException: 500,
  BadGatewayException: 502,
  ServiceUnavailableException: 503,
};
const HTTP_STATUS = { BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, INTERNAL_SERVER_ERROR: 500, BAD_GATEWAY: 502, SERVICE_UNAVAILABLE: 503, UNPROCESSABLE_ENTITY: 422, PAYMENT_REQUIRED: 402, TOO_MANY_REQUESTS: 429 };

const items = [];
const sinTexto = { be: 0, fe: 0 };
const sinTextoLista = [];
const sitiosExito = []; // avisos de pantalla que muestran el msg/message/mensaje de una respuesta del servidor
const sitioExito = (rel, linea, expr, src, pos, tipo) => {
  if (/(?<![\w$.])(?:data|res|resp|respuesta|result)\??\.(?:msg|message|mensaje)\b/.test(expr) && !/\.response\b|\berror\b|\berr\b/.test(expr)) sitiosExito.push({ rel, linea, expr: String(expr).replace(/\s+/g, ' ').slice(0, 140), src, pos, tipo });
};
const sinTextoFE = (rel, linea, expr, src, pos, tipo) => { sinTexto.fe++; sinTextoLista.push({ rel, linea, expr: String(expr).replace(/\s+/g, ' ').slice(0, 140), src, pos, tipo }); };

for (const file of walk(BE, ['.ts'])) {
  const rel = path.relative(BE, file).split(path.sep).join('/');
  const src = readFileSync(file, 'utf8');

  // throw new XException(…)
  const re = /new\s+(\w*Exception)\s*\(/g;
  const mask = mascaraComentarios(src, false);
  let m;
  while ((m = re.exec(src))) {
    if (mask[m.index]) continue;
    const open = m.index + m[0].length - 1;
    const close = matchClose(src, open);
    if (close < 0) continue;
    const a = splitTop(src.slice(open + 1, close));
    let expr = a[0] ?? '';
    if (expr.startsWith('{')) expr = propiedad(expr, 'message') ?? '';
    const exprs = expr.startsWith('[') ? splitTop(expr.slice(1, -1)) : [expr];
    let codigo = CODIGO_CLASE[m[1]] ?? null;
    if (m[1] === 'HttpException') {
      const st = (a[1] ?? '').match(/HttpStatus\.(\w+)/);
      codigo = st ? HTTP_STATUS[st[1]] ?? null : /^\d{3}$/.test(a[1] ?? '') ? +a[1] : null;
    }
    const alts = exprs.flatMap(alternativas);
    if (!alts.length) { sinTexto.be++; continue; }
    for (const alt of alts)
      items.push({ origen: 'servidor', rel, linea: lineOf(src, m.index), modulo: moduloBE(rel), codigo, ...alt });
  }

  // validaciones de DTO: { message: '…' }
  if (/\.dto\.ts$/.test(rel)) {
    const rd = /\bmessage\s*:\s*(?=['"`])/g;
    while ((m = rd.exec(src))) {
      if (mask[m.index]) continue;
      const ini = m.index + m[0].length;
      const fin = skipString(src, ini);
      for (const lit of textoLiteral(src.slice(ini, fin)))
        items.push({ origen: 'validacion', rel, linea: lineOf(src, m.index), modulo: moduloBE(rel), codigo: 400, reserva: false, ...lit });
    }
  }
}

// ───────────────────────── Extracción: frontend ─────────────────────────

const TIPOS_NOTIFY = { positive: 'Éxito', negative: 'Error', warning: 'Advertencia', info: 'Información', ongoing: 'En curso' };

for (const file of walk(FE, ['.vue', '.js', '.ts'])) {
  const rel = path.relative(FE, file).split(path.sep).join('/');
  const src = readFileSync(file, 'utf8');
  const re = /(?<![\w.])(mostrarNotify|confirmDelete|\$q\.notify|Notify\.create|\$q\.dialog|Dialog\.create)\s*\(/g;
  const mask = mascaraComentarios(src, file.endsWith('.vue'));
  let m;
  while ((m = re.exec(src))) {
    if (mask[m.index]) continue;
    const open = m.index + m[0].length - 1;
    const close = matchClose(src, open);
    if (close < 0) continue;
    const a = splitTop(src.slice(open + 1, close));
    const linea = lineOf(src, m.index);
    const base = { origen: 'pantalla', rel, linea, modulo: moduloFE(rel), codigo: null };
    // Texto fijo de una expresión; si es una variable local (`msg`), el de lo que se le asigna antes en la misma función.
    const alternativasResueltas = expr => {
      const directas = alternativas(expr);
      if (directas.length) return directas;
      const id = sinParentesis(expr ?? '').match(/^([A-Za-z_$][\w$]*)(?:\.value)?$/)?.[1];
      if (!id) return [];
      const conLinea = fuentes => fuentes.flatMap(({ txt, ini }) => alternativas(txt).map(a => ({ ...a, linea: lineaDeTexto(src, ini, ini + txt.length, a.text) })));
      const locales = conLinea(asignacionesDe(src, mask, id, m.index));
      return locales.length ? locales : conLinea(argumentosDeLlamadas(src, mask, id, m.index));
    };

    if (m[1] === 'confirmDelete') {
      // useHelpers.js:48-54: diálogo "Confirmar" con botones Eliminar / Cancelar; el texto lo pone quien llama.
      const alts = alternativas(a[0] ?? '');
      if (!alts.length) { sinTextoFE(rel, linea, a[0], src, m.index, null); continue; }
      for (const alt of alts) items.push({ ...base, tipo: 'Confirmación', titulo: 'Confirmar', botones: ['Eliminar', 'Cancelar'], ...alt });
    } else if (m[1] === 'mostrarNotify') {
      // Algunas llamadas tienen los argumentos invertidos (texto primero): se toma el texto igualmente.
      const tipoLit = (a[0] ?? '').match(/^['"](\w+)['"]$/);
      const tipoSrc = tipoLit ? tipoLit[1] : null;
      let tipo = tipoSrc && TIPOS_NOTIFY[tipoSrc] ? TIPOS_NOTIFY[tipoSrc] : null;
      let expr = a[1] ?? '';
      if (!tipo && !tipoLit) {
        const tipos = [...(a[0] ?? '').matchAll(/['"](positive|negative|warning|info)['"]/g)].map(x => TIPOS_NOTIFY[x[1]]);
        tipo = tipos.length ? [...new Set(tipos)].join(' / ') : null;
      }
      if (tipoLit && !TIPOS_NOTIFY[tipoSrc]) { expr = a[0]; tipo = null; } // argumentos invertidos
      const alts = alternativasResueltas(expr);
      sitioExito(rel, linea, expr, src, m.index, tipoSrc);
      if (!alts.length) { sinTextoFE(rel, linea, expr, src, m.index, tipoSrc); continue; }
      for (const alt of alts) items.push({ ...base, tipo: tipo ?? 'Aviso', ...alt });
    } else {
      const obj = a[0] ?? '';
      if (!obj.startsWith('{')) { sinTextoFE(rel, linea, obj, src, m.index, null); continue; }
      if (m[1] === '$q.dialog' || m[1] === 'Dialog.create') {
        const titulos = alternativasResueltas(propiedad(obj, 'title') ?? '');
        const msgs = alternativasResueltas(propiedad(obj, 'message') ?? '');
        const etiquetas = k => {
          const v = propiedad(obj, k);
          if (!v) return [];
          const l = v.startsWith('{') ? propiedad(v, 'label') : v;
          return l ? alternativas(l) : [];
        };
        const oks = etiquetas('ok');
        const cancels = etiquetas('cancel');
        const tipo = propiedad(obj, 'cancel') ? 'Confirmación' : 'Diálogo';
        const n = Math.max(msgs.length, 1);
        // Título y botones varían junto con el mensaje (`cond ? a : b`): se emparejan por posición; si no hay
        // forma segura de emparejarlos (cantidades distintas), se omiten.
        const emparejar = (arr, i) => (arr.length === 1 ? arr[0] : arr.length === n ? arr[i] : null);
        // Un título suelto de una sola palabra ("Confirmar") sin mensaje fijo no informa nada.
        if (!msgs.length && (!titulos[0] || titulos[0].text.trim().split(/\s+/).length < 2)) { sinTextoFE(rel, linea, propiedad(obj, 'message') ?? propiedad(obj, 'title'), src, m.index, null); continue; }
        (msgs.length ? msgs : [{ text: '', exprs: [] }]).forEach((msg, i) => {
          const t = emparejar(titulos, i);
          items.push({
            ...base,
            linea: msg.linea ?? linea,
            tipo,
            titulo: t?.text ?? null,
            text: msg.text,
            exprs: [...(t?.exprs ?? []), ...msg.exprs],
            botones: [emparejar(oks, i)?.text, emparejar(cancels, i)?.text].filter(Boolean),
            reserva: false,
          });
        });
      } else {
        const tipoSrc = (propiedad(obj, 'type') ?? '').replace(/['"]/g, '');
        const alts = alternativasResueltas(propiedad(obj, 'message') ?? '');
        sitioExito(rel, linea, propiedad(obj, 'message') ?? '', src, m.index, tipoSrc);
        if (!alts.length) { sinTextoFE(rel, linea, propiedad(obj, 'message'), src, m.index, tipoSrc); continue; }
        for (const alt of alts) items.push({ ...base, tipo: TIPOS_NOTIFY[tipoSrc] ?? 'Aviso', ...alt });
      }
    }
  }
}

// Textos que arma una función auxiliar y que las extracciones anteriores no ven. `buscar` es el comienzo del literal
// (con su comilla de apertura; puede ser una lista si el texto se escribe con comillas distintas); se lee el literal
// completo. Con `todos: true` se recorre todo el código del lado indicado y se añade cada aparición (el texto sale
// una sola vez en la tabla, con sus tres primeros orígenes). Si ya no está en el código, el script avisa.
const EXTRAS = [
  { lado: 'pantalla', rel: 'utils/mensaje-transaccion.js', buscar: "'Ya fue ingresado este N° de transacción'", tipo: 'Mensaje de campo', modulo: 'pagos' },
  { lado: 'servidor', rel: 'auth/auth.service.ts', buscar: "'Cuenta inactivada por varios intentos fallidos.", codigo: 401, modulo: 'acceso' },
  // Restricción de horario del usuario (se lanzan con UnauthorizedException(session.mensajeError) en el login).
  { lado: 'servidor', rel: 'auth/auth.service.ts', buscar: '`Acceso denegado. Tu horario autorizado es: ${', codigo: 401, modulo: 'acceso' },
  { lado: 'servidor', rel: 'auth/auth.service.ts', buscar: '`Acceso denegado. Solo puedes acceder los días:', codigo: 401, modulo: 'acceso' },
  { lado: 'servidor', rel: 'auth/auth.service.ts', buscar: "'Acceso denegado. No tienes horario de acceso", codigo: 401, modulo: 'acceso' },
  { lado: 'servidor', rel: 'auth/auth.service.ts', buscar: '`Acceso denegado. Tu horario autorizado es de ${', codigo: 401, modulo: 'acceso' },
  // Textos de formulario vistos en pantalla. Los asigna un `validaciones…message = '…'` o los devuelve una función que
  // valida (`validarCampo`), y la pantalla los muestra bajo el campo o en un aviso con una variable: no tienen texto fijo
  // en la llamada y por eso la extracción de avisos no los ve.
  // Falta un campo obligatorio (el mismo texto en los formularios de casi todos los módulos).
  { lado: 'pantalla', todos: true, buscar: ["'Debes completar este campo'", '"Debes completar este campo"'], tipo: 'Mensaje de campo', modulo: 'generales' },
  // Más de dos decimales en un precio (productos y planes).
  { lado: 'pantalla', todos: true, buscar: ['"Solo se permiten 2 decimales"', "'Solo se permiten 2 decimales'"], tipo: 'Mensaje de campo', modulo: 'generales' },
  // Precio de venta o valor de ICE en cero (Productos y Servicios).
  { lado: 'pantalla', todos: true, buscar: ["'Debes ingresar un valor mayor a cero.'", '"Debes ingresar un valor mayor a cero."'], tipo: 'Mensaje de campo', modulo: 'almacen' },
  // Ajustes → Base de datos → Campos personalizados: `validarCampo` devuelve el texto y `onSubmit` lo muestra con mostrarNotify('warning', error).
  { lado: 'pantalla', rel: 'pages/dashboard/ajustes/base-datos/components/CamposPersonalizados.vue', buscar: "'Ingresa un nombre para el campo'", tipo: 'Advertencia', modulo: 'clientes' },
  { lado: 'pantalla', rel: 'pages/dashboard/ajustes/base-datos/components/CamposPersonalizados.vue', buscar: "'El nombre no puede contener espacios", tipo: 'Advertencia', modulo: 'clientes' },
  { lado: 'pantalla', rel: 'pages/dashboard/ajustes/base-datos/components/CamposPersonalizados.vue', buscar: "'Selecciona el tipo de campo'", tipo: 'Advertencia', modulo: 'clientes' },
  { lado: 'pantalla', rel: 'pages/dashboard/ajustes/base-datos/components/CamposPersonalizados.vue', buscar: "'Agrega al menos 2 opciones para el selector'", tipo: 'Advertencia', modulo: 'clientes' },
  // Textos escritos en la plantilla bajo un campo o junto a él, que aparecen cuando falta algo o hay que revisar un dato.
  { lado: 'pantalla', todos: true, plano: true, buscar: 'Debes aceptar esta opción para continuar', tipo: 'Mensaje de campo', modulo: 'pagos' },
  { lado: 'pantalla', rel: 'pages/dashboard/ajustes/plantillas/components/WaTemplateControl.vue', plano: true, buscar: 'Cada variable necesita un dato distinto.', tipo: 'Mensaje de campo' },
  { lado: 'pantalla', rel: 'pages/dashboard/ajustes/plantillas/components/FormPlantilla.vue', plano: true, buscar: 'Falta agregar ', tipo: 'Advertencia', modulo: 'contratos' },
  { lado: 'pantalla', rel: 'pages/dashboard/ajustes/facturacion/components/FacturacionPage.vue', plano: true, buscar: 'Cambiaste la base de creación', tipo: 'Advertencia' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/monitoreo-red/components/ConfigNotificaciones.vue', plano: true, buscar: 'Agrega al menos un correo o un número de WhatsApp', hasta: '</q-banner>', tipo: 'Advertencia', modulo: 'red' },
  { lado: 'pantalla', rel: 'pages/dashboard/tickets/components/VisitaTicket.vue', plano: true, buscar: 'El servicio no tiene coordenadas cargadas', tipo: 'Advertencia' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/adminOLT/IndexPage.vue', plano: true, buscar: 'Ingresa el subdominio y la API Key en la pestaña', titulo: 'Credenciales de AdminOLT no configuradas', tipo: 'Advertencia', modulo: 'red' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/smartOLT/IndexPage.vue', plano: true, buscar: 'Ingresa el dominio y la API Key en la pestaña', titulo: 'Credenciales de SmartOLT no configuradas', tipo: 'Advertencia', modulo: 'red' },
  // Errores que el código lanza con texto fijo y que la pantalla muestra con `error.message`.
  // Ubicación del equipo (marcar llegada o salida, jornada del técnico, mapas): composables/useUbicacion.js lo usan
  // layouts/BotonJornada.vue, tickets/VisitaTicket.vue y los mapas, que muestran el texto en un aviso.
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'No se dio permiso para usar la ubicación. Habilitalo en los permisos del navegador", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'El equipo no pudo determinar la ubicación.", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'El GPS tardó demasiado en responder.", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'No se dio permiso para usar la ubicación. Habilitalo en Ajustes", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', expr: true, buscar: "'Diste permiso de ubicación aproximada", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'La ubicación del teléfono está apagada.", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'Para marcar la visita hace falta activar la ubicación del teléfono.", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'Los servicios de Google del teléfono necesitan una actualización", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'Los servicios de Google del teléfono no respondieron.", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'La ubicación sólo funciona con https.", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useUbicacion.js', buscar: "'Este navegador no permite obtener la ubicación.", tipo: 'Advertencia', modulo: 'soporte' },
  { lado: 'pantalla', rel: 'composables/useAppIspmax.js', buscar: "'Esta versión de la app no permite iniciar la jornada.", tipo: 'Advertencia', modulo: 'soporte' },
  // Mapa NAP → importar KMZ/KML: utils/kmz.js lanza el error y ModalImportarKmz.vue lo muestra en el aviso rojo del modal.
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/mapa-nap/utils/kmz.js', buscar: "'El archivo KML está dañado o no es válido.", tipo: 'Error' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/mapa-nap/utils/kmz.js', buscar: "'El archivo debe ser .kmz o .kml", tipo: 'Error' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/mapa-nap/utils/kmz.js', buscar: "'El KMZ no contiene ningún archivo .kml", tipo: 'Error' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/mapa-nap/components/ModalImportarKmz.vue', buscar: "'El archivo no contiene puntos ni líneas que se puedan importar.", tipo: 'Error' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/mapa-nap/components/ModalImportarKmz.vue', buscar: "'No se pudo leer el archivo.", tipo: 'Error' },
  // Carga masiva de clientes desde Excel: el error de una fila aparece en la columna de mensajes del resultado.
  { lado: 'pantalla', rel: 'pages/dashboard/clientes/components/modals/ModalCargarExcel.vue', buscar: "`No se encontro la caja con el nombre", tipo: 'Error' },
  { lado: 'pantalla', rel: 'pages/dashboard/clientes/components/modals/ModalCargarExcel.vue', buscar: "`No se encontro el puerto", tipo: 'Error' },
  // SmartOLT: Mgmt IP exige VLAN en modo DHCP o estático (el error sale en el detalle del aviso de TR-069).
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/smartOLT/components/Authorize/composables/useTr069Config.js', buscar: "'La VLAN es obligatoria para Mgmt IP", tipo: 'Advertencia' },
  // SmartOLT: la ONU consultada no existe (useOnuView.js arma `friendly` y lo muestra con mostrarNotify('warning', friendly)).
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/smartOLT/components/OnuView/composables/useOnuView.js', buscar: "`La ONU con SN", tipo: 'Advertencia' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/smartOLT/components/OnuView/composables/useOnuView.js', buscar: '"No se pudo obtener la información de la ONU"', tipo: 'Advertencia', reserva: true },
  // Errores que la pantalla guarda en un valor y muestra en un aviso de la propia pantalla, con este texto de reserva.
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/routers/components/GraficosRouter.vue', buscar: '"No se pudo obtener las interfaces del router.', tipo: 'Error', reserva: true },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/routers/components/MonitoreoRouter.vue', buscar: '"No se pudo conectar al router.', tipo: 'Error', reserva: true },
  { lado: 'pantalla', rel: 'pages/dashboard/clientes/components/editar/Consumo/ConsumoPage.vue', buscar: '"No se pudo ejecutar el ping.', tipo: 'Error', reserva: true },
  { lado: 'pantalla', rel: 'pages/dashboard/clientes/components/editar/Servicios/VincularOnu.vue', buscar: "'No se pudo obtener la información de la ONU.", tipo: 'Error' },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/smartOLT/components/OnuView/IndexPage.vue', buscar: "'No se pudo obtener la información de la ONU. Verifica", tipo: 'Error' },
  { lado: 'pantalla', rel: 'pages/dashboard/clientes/components/editar/Servicios/Contratos_Pdf/Contratos.vue', buscar: "'No se pudo preparar el documento", tipo: 'Error', reserva: true },
  { lado: 'pantalla', rel: 'pages/dashboard/Gestion-Red/adminOLT/components/NoAutorizadas/FormAutorizarOnu.vue', buscar: "'Error al autorizar ONU'", tipo: 'Error', reserva: true },
  // Conciliación bancaria: el visor del estado de cuenta muestra errorPdf en un aviso naranja.
  { lado: 'pantalla', rel: 'pages/dashboard/conciliacion-bancaria/composables/useConciliacion.js', buscar: '"Abre o realiza una conciliación', tipo: 'Advertencia' },
  { lado: 'pantalla', rel: 'pages/dashboard/conciliacion-bancaria/composables/useConciliacion.js', buscar: '"Esta conciliación no tiene estados de cuenta guardados.', tipo: 'Advertencia' },
];
// Opciones de una entrada: `expr: true` lee el literal completo aunque se arme con `+` (varias cadenas seguidas);
// `plano: true` busca texto escrito directamente en la plantilla (no entre comillas) y lo lee hasta `hasta`
// (por defecto `</div>`), sin etiquetas; `titulo` pone una línea en negrita delante del texto; `reserva: true` marca el texto
// como el de reserva que sale si la respuesta del servidor no trae mensaje.
const textoPlano = (fuente, idx, hasta = '</div>') => {
  const fin = fuente.indexOf(hasta, idx);
  return (fin < 0 ? fuente.slice(idx, idx + 300) : fuente.slice(idx, fin))
    .replace(/\{\{\s*'([^']*)'\s*\}\}/g, '$1')
    .replace(/\{\{[\s\S]*?\}\}/g, '…')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
for (const e of EXTRAS) {
  const raiz = e.lado === 'pantalla' ? FE : BE;
  const buscar = [].concat(e.buscar);
  const archivos = e.todos ? walk(raiz, ['.vue', '.js', '.ts']) : [path.join(raiz, e.rel)];
  let hallados = 0;
  for (const archivo of archivos) {
    const fuente = readFileSync(archivo, 'utf8');
    const rel = e.todos ? path.relative(raiz, archivo).split(path.sep).join('/') : e.rel;
    const mascara = e.todos || e.plano ? mascaraComentarios(fuente, archivo.endsWith('.vue')) : null;
    for (const b of buscar) {
      for (let desde = 0, idx; (idx = fuente.indexOf(b, desde)) >= 0; desde = idx + b.length) {
        if (mascara?.[idx]) continue;
        const texto = e.plano
          ? textoPlano(fuente, idx, e.hasta)
          : textoLiteral(fuente.slice(idx, e.expr ? finExpresion(fuente, idx) : skipString(fuente, idx)))[0].text;
        items.push({
          origen: e.lado === 'pantalla' ? 'pantalla' : 'servidor', rel, linea: lineOf(fuente, idx), modulo: e.modulo ?? moduloFE(rel),
          tipo: e.tipo, titulo: e.titulo ?? null, text: texto, exprs: [], reserva: e.reserva ?? false, codigo: e.codigo ?? null,
        });
        hallados++;
        if (!e.todos) break;
      }
      if (hallados && !e.todos) break;
    }
  }
  if (!hallados) console.warn(`AVISO: ya no está ${buscar[0]} en ${e.rel ?? 'el código'}; revisar EXTRAS.`);
}

// ───────────────────────── Textos de campo: validaciones, reglas, mensajes de error y ayudas ─────────────────────────
//
// Los formularios muestran bajo cada campo (a) el texto que el propio código asigna al estado de validación
// (`validaciones.…message = '…'`, `{ isValid: false, message: '…' }`), (b) el de las reglas de Quasar (`:rules`, ya sea en
// línea o en una función del mismo archivo), (c) `error-message` / `<template #error>` y (d) la ayuda fija (`hint`,
// `<template #hint>`). Ninguno pasa por `mostrarNotify`, por eso la extracción de avisos no los ve.
// Solo se toma texto fijo; si el texto se arma con datos, sale con … como en el resto de la página.

const TIPO_CAMPO = 'Mensaje de campo';
const TIPO_AYUDA = 'Ayuda del campo';
const ENTIDADES = { '&nbsp;': ' ', '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&#39;': "'", '&apos;': "'" };
const decodificar = t => t.replace(/&(?:nbsp|quot|amp|lt|gt|apos|#39);/g, e => ENTIDADES[e]);

/** Cuerpo de la definición local de `id` (`const id = …` o `function id(…) {…}`), o null. */
function definicionLocal(src, mask, id) {
  const e = id.replace(/\$/g, '\\$');
  const re = new RegExp(`(?<![\\w$.])(?:(?:const|let|var)\\s+${e}\\s*=\\s*|function\\s+${e}\\s*\\()`, 'g');
  let m;
  while ((m = re.exec(src))) {
    if (mask[m.index]) continue;
    if (m[0].startsWith('function')) {
      const llave = src.indexOf('{', matchClose(src, m.index + m[0].length - 1));
      const fin = llave < 0 ? -1 : matchClose(src, llave);
      return fin < 0 ? null : { txt: src.slice(llave, fin + 1), ini: llave };
    }
    const ini = m.index + m[0].length;
    return { txt: src.slice(ini, finExpresion(src, ini)), ini };
  }
  return null;
}

/** Expresiones que devuelve un cuerpo de función (`return …`). */
function retornos(cuerpo) {
  const out = [];
  scanTop(cuerpo, (i, c) => {
    if (c === 'r' && cuerpo.startsWith('return', i) && !/[\w$]/.test(cuerpo[i - 1] ?? '') && !/[\w$]/.test(cuerpo[i + 6] ?? '')) {
      let ini = i + 6;
      while (/\s/.test(cuerpo[ini] ?? '')) ini++;
      out.push({ txt: cuerpo.slice(ini, finExpresion(cuerpo, ini)), pos: ini });
    }
  });
  return out;
}

const GLOBALES = /^(Number|String|Boolean|parseInt|parseFloat|Array|Object|Math|JSON|isNaN|Date|RegExp|true|false|null|undefined|computed|ref|reactive)$/;

/**
 * Textos fijos que puede devolver una regla, una lista de reglas o una función de ayuda. Sigue arrays, ternarios, flechas,
 * `computed(() => …)` y llamadas a funciones locales del mismo archivo (hasta 6 niveles de anidación). Devuelve { …alt, pos } (posición
 * en `src` desde donde buscar el literal).
 */
function textosDeCodigo(expr, base, src, mask, prof = 0) {
  expr = sinParentesis(expr ?? '');
  if (!expr || prof > 6) return [];
  const sub = (txt, off = 0) => textosDeCodigo(txt, base + off, src, mask, prof + 1);
  // Las funciones: x => …, (a, b) => …
  const flecha = expr.match(/^(?:async\s+)?(?:\([^)]*\)|[\w$]+)\s*=>\s*/);
  if (flecha) {
    const cuerpo = expr.slice(flecha[0].length);
    if (cuerpo[0] === '{') return retornos(cuerpo).flatMap(r => sub(r.txt, flecha[0].length + r.pos));
    return sub(cuerpo, flecha[0].length);
  }
  if (expr[0] === '[' && matchClose(expr, 0) === expr.length - 1) {
    const dentro = expr.slice(1, -1);
    // Un elemento que es solo una cadena ('date', 'email'…) es el nombre de una regla de Quasar, no un texto.
    return splitTop(dentro).filter(el => !/^(['"`])[\w-]+\1$/.test(el)).flatMap(el => sub(el, 1 + dentro.indexOf(el)));
  }
  const envoltorio = expr.match(/^computed\s*\(/);
  if (envoltorio && matchClose(expr, envoltorio[0].length - 1) === expr.length - 1)
    return sub(expr.slice(envoltorio[0].length, -1), envoltorio[0].length);
  const t = splitTernary(expr);
  if (t) return [...sub(t.a, expr.indexOf(t.a)), ...sub(t.b, expr.lastIndexOf(t.b))];
  // Llamada o nombre de una función/constante local: se sigue a su definición.
  const ref = expr.match(/^([A-Za-z_$][\w$]*)\s*(?:\(([\s\S]*)\))?$/);
  if (ref && !GLOBALES.test(ref[1]) && !(ref[2] === undefined && /^(val|value|v)$/.test(ref[1]))) {
    const def = definicionLocal(src, mask, ref[1]);
    if (def) return textosDeCodigo(def.txt[0] === '{' ? `() => ${def.txt}` : def.txt, def.ini, src, mask, prof + 1);
    return [];
  }
  return alternativas(expr).map(a => ({ ...a, pos: base }));
}

// Plantillas de todos los .vue, para comprobar que un mensaje de validación llega a mostrarse (una clave que ninguna
// plantilla del módulo muestra se asigna pero el usuario no la ve).
const plantillasFE = [];
for (const file of walk(FE, ['.vue'])) {
  const rel = path.relative(FE, file).split(path.sep).join('/');
  const tpl = readFileSync(file, 'utf8').match(/<template>[\s\S]*<\/template>/)?.[0];
  if (tpl) plantillasFE.push({ rel, tpl });
}
/** `clave`: nombre del campo (null o dinámico = cualquiera). Busca `….clave.message` en las plantillas del módulo (o de todo el panel si el archivo es común). */
function seMuestraMensaje(rel, clave) {
  const carpeta = rel.startsWith('pages/dashboard/') ? rel.split('/').slice(0, 3).join('/') + '/' : '';
  const re = clave && /^[\w$]+$/.test(clave) ? new RegExp(`\\.${clave.replace(/\$/g, '\\$')}\\.message\\b`) : /(?:valid|error)\w*(?:\.value)?(?:\.[\w$]+|\[[^\]]+\])\.message\b/i;
  return plantillasFE.some(p => p.rel.startsWith(carpeta) && re.test(p.tpl));
}

for (const file of walk(FE, ['.vue', '.js', '.ts'])) {
  const rel = path.relative(FE, file).split(path.sep).join('/');
  const src = readFileSync(file, 'utf8');
  const esVue = file.endsWith('.vue');
  const mask = mascaraComentarios(src, esVue);
  const modulo = moduloFE(rel);
  const agregar = (tipo, lineaDefecto, alts, desde, hasta) => {
    for (const a of alts) {
      const linea = a.pos != null ? lineaDeTexto(src, a.pos, hasta ?? src.length, a.text) : lineaDefecto;
      items.push({ origen: 'pantalla', rel, linea, modulo, codigo: null, tipo, text: decodificar(a.text), exprs: a.exprs, reserva: false });
    }
  };

  // (a) Estado de validación asignado por el código.
  const reAsig = /(?<![\w$.])([A-Za-z_$][\w$]*)((?:\.value)?(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]*\])*)\.message\s*=(?![=>])\s*/g;
  for (let m; (m = reAsig.exec(src)); ) {
    if (mask[m.index] || !/valid|error/i.test(m[1])) continue;
    const clave = m[2].replace(/^\.value/, '').match(/^\.([\w$]+)$/)?.[1] ?? null; // null: clave dinámica (`[campo]`)
    if (!seMuestraMensaje(rel, clave)) continue;
    const ini = m.index + m[0].length;
    const fin = finExpresion(src, ini);
    agregar(TIPO_CAMPO, lineOf(src, ini), alternativas(src.slice(ini, fin)).map(a => ({ ...a, pos: ini })), ini, fin);
  }
  for (const m of src.matchAll(/\{[^{}]*\bisValid\b[^{}]*\}/g)) {
    if (mask[m.index]) continue;
    const msg = propiedad(m[0], 'message');
    if (!msg) continue;
    const lhs = src.slice(Math.max(0, m.index - 80), m.index).match(/([\w$]+)(?:\.value)?(?:\.([\w$]+)|\[([^\]]+)\])\s*=\s*$/);
    if (!seMuestraMensaje(rel, lhs?.[2] ?? null)) continue;
    const ini = m.index + m[0].indexOf(msg);
    agregar(TIPO_CAMPO, lineOf(src, ini), alternativas(msg).map(a => ({ ...a, pos: ini })), ini, ini + msg.length);
  }

  if (!esVue) continue;

  // (b)(c)(d) Atributos de la plantilla: rules, error-message, hint.
  const tpl = src.match(/<template>[\s\S]*<\/template>/);
  if (!tpl) continue;
  for (const m of tpl[0].matchAll(/\s(:?)(rules|error-message|hint)=("([^"]*)"|'([^']*)')/g)) {
    const posAbs = tpl.index + m.index;
    if (mask[posAbs]) continue;
    const valor = m[4] ?? m[5];
    const tipo = m[2] === 'hint' ? TIPO_AYUDA : TIPO_CAMPO;
    const iniValor = posAbs + m[0].indexOf(valor);
    if (!m[1]) {
      if (m[2] === 'rules') continue; // `rules="…"` sin dos puntos no se usa en este código
      agregar(tipo, lineOf(src, posAbs), [{ text: valor, exprs: [], pos: iniValor }], iniValor, iniValor + valor.length);
      continue;
    }
    // Las reglas de Quasar con nombre ('date', 'email'…) no llevan texto propio.
    const alts = textosDeCodigo(decodificar(valor), iniValor, src, mask);
    agregar(tipo, lineOf(src, posAbs), alts, iniValor, iniValor + valor.length + 4000);
  }

  // `<template #error>` / `<template #hint>` con texto fijo (los {{ datos }} salen como …).
  for (const m of tpl[0].matchAll(/<template\s+(?:#|v-slot:)(error|hint)\b[^>]*>([\s\S]*?)<\/template>/g)) {
    const posAbs = tpl.index + m.index;
    if (mask[posAbs]) continue;
    const texto = decodificar(m[2].replace(/\{\{[\s\S]*?\}\}/g, '…').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!/\p{L}{3}/u.test(texto.replace(/…/g, ''))) continue;
    agregar(m[1] === 'hint' ? TIPO_AYUDA : TIPO_CAMPO, lineOf(src, posAbs), [{ text: texto, exprs: [], pos: posAbs }], posAbs, posAbs + m[0].length);
  }
}

// ───────────────────────── Confirmaciones de éxito del servidor ─────────────────────────
//
// Muchos endpoints responden `{ ok: true, msg: '…' }` o `{ success: true, message: '…' }` y algunas pantallas muestran ese
// texto en un aviso (`mostrarNotify('positive', data.msg)`). Solo se publican las que una pantalla llega a mostrar: se parte
// del aviso de la pantalla, se busca la llamada `api.<verbo>('<ruta>')` que lo origina, se sigue a la ruta del controlador,
// al método del servicio y a los `return { msg | message | mensaje: '…' }` de ese método. Las demás (registros de bitácora,
// trabajos en segundo plano, errores internos que otra capa traduce, respuestas que ninguna pantalla lee) no se publican;
// `--auditar-exito` las lista con su motivo.

const CLAVES_EXITO = ['msg', 'message', 'mensaje'];
const archivosBE = new Map(); // ruta relativa → texto
const claseBE = new Map(); // nombre de clase → ruta relativa
for (const file of walk(BE, ['.ts'])) {
  const rel = path.relative(BE, file).split(path.sep).join('/');
  const src = readFileSync(file, 'utf8');
  archivosBE.set(rel, src);
  for (const m of src.matchAll(/export\s+class\s+(\w+)/g)) claseBE.set(m[1], rel);
}

/** Posición de la `{` que abre el cuerpo de una función cuyos parámetros cierran en `cierra` (salta los tipos de retorno con llaves). */
function llaveDelCuerpo(src, cierra) {
  for (let i = cierra + 1; i < src.length; ) {
    const j = src.indexOf('{', i);
    if (j < 0) return -1;
    if (/[;=]/.test(src.slice(cierra + 1, j).replace(/\{[^{}]*\}/g, ''))) return -1; // declaración sin cuerpo o asignación
    if (/[<:,|&(]/.test(src.slice(0, j).trimEnd().slice(-1))) { const f = matchClose(src, j); if (f < 0) return -1; i = f + 1; continue; }
    return j;
  }
  return -1;
}

/** Rutas HTTP de los controladores: { verbo, segmentos, rel, metodo, http, llamadas: [{ rel, metodo }] }. */
const rutasBE = [];
for (const [rel, src] of archivosBE) {
  if (!/\.controller\.ts$/.test(rel)) continue;
  const mask = mascaraComentarios(src, false);
  const prefijo = src.match(/@Controller\(\s*(?:\{[^}]*?path\s*:\s*)?(?:['"`]([^'"`]*)['"`])?/)?.[1] ?? '';
  const props = new Map();
  for (const m of src.matchAll(/(?:private|protected|public)\s+(?:readonly\s+)?(\w+)\s*:\s*(\w+)/g)) props.set(m[1], m[2]);
  for (const d of src.matchAll(/@(Get|Post|Put|Patch|Delete)\s*\(\s*(?:['"`]([^'"`]*)['"`])?[^)]*\)/g)) {
    if (mask[d.index]) continue;
    // El método es la primera línea posterior que no es un decorador ni un comentario.
    let pos = d.index + d[0].length;
    let nombre = null;
    let posNombre = 0;
    for (const l of src.slice(pos, pos + 1200).split('\n').slice(1)) {
      const t = l.trim();
      if (!t || t.startsWith('@') || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) { pos += l.length + 1; continue; }
      const mm = t.match(/^(?:public\s+|private\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/);
      if (mm) { nombre = mm[1]; posNombre = src.indexOf(t, pos); }
      break;
    }
    if (!nombre) continue;
    const abre = src.indexOf('(', posNombre);
    const cierra = matchClose(src, abre);
    const llave = llaveDelCuerpo(src, cierra);
    const fin = llave < 0 ? -1 : matchClose(src, llave);
    if (fin < 0) continue;
    const cuerpo = src.slice(llave, fin + 1);
    const ventana = src.slice(Math.max(0, d.index - 160), posNombre).split('}\n').pop();
    const codHttp = ventana.match(/@HttpCode\(\s*(?:HttpStatus\.(\w+)|(\d{3}))/);
    const http = codHttp ? (codHttp[2] ? +codHttp[2] : HTTP_STATUS[codHttp[1]] ?? 200) : d[1] === 'Post' ? 201 : 200;
    const llamadas = [];
    for (const c of cuerpo.matchAll(/this\.(\w+)\.(\w+)\s*\(/g)) {
      const clase = props.get(c[1]);
      if (clase && claseBE.has(clase)) llamadas.push({ rel: claseBE.get(clase), metodo: c[2] });
    }
    const seg = s => s.split('/').filter(Boolean);
    rutasBE.push({ verbo: d[1].toUpperCase(), segmentos: [...seg(prefijo), ...seg(d[2] ?? '')], rel, metodo: nombre, http, llamadas });
  }
}

/** Definición del método `nombre` de una clase del backend: { cuerpo, ini } o null. */
function metodoBE(src, nombre) {
  const re = new RegExp(`^[ \\t]+(?:public\\s+|private\\s+|protected\\s+)?(?:async\\s+)?${nombre}\\s*(?:<[^>]*>)?\\s*\\(`, 'gm');
  const mask = mascaraComentarios(src, false);
  for (let m; (m = re.exec(src)); ) {
    if (mask[m.index]) continue;
    const abre = m.index + m[0].length - 1;
    const cierra = matchClose(src, abre);
    const llave = cierra < 0 ? -1 : llaveDelCuerpo(src, cierra);
    const fin = llave < 0 ? -1 : matchClose(src, llave);
    if (fin > 0) return { cuerpo: src.slice(llave, fin + 1), ini: llave };
  }
  return null;
}

/** Textos fijos de las claves `msg|message|mensaje` (o, con 'data', de una cadena) que devuelve un método del servicio. */
function mensajesDeMetodo(rel, nombre, claves, soloFallo = false, prof = 0, vistos = new Set()) {
  const id = `${rel}#${nombre}`;
  if (vistos.has(id) || prof > 3) return [];
  vistos.add(id);
  const src = archivosBE.get(rel);
  const def = src && metodoBE(src, nombre);
  if (!def) return [];
  const out = [];
  const examinar = (expr, pos) => {
    expr = sinParentesis(expr.replace(/^await\s+/, ''));
    const t = splitTernary(expr);
    if (t && !/^['"`]/.test(expr)) { examinar(t.a, pos + expr.indexOf(t.a)); examinar(t.b, pos + expr.lastIndexOf(t.b)); return; }
    if (expr[0] === '{') {
      if (soloFallo && !/\b(?:success|ok)\s*:\s*false\b/.test(expr)) return; // la pantalla solo muestra el texto si la respuesta no fue satisfactoria
      for (const k of claves) {
        const v = propiedad(expr, k);
        if (!v) continue;
        for (const a of alternativas(v)) out.push({ ...a, rel, linea: lineaDeTexto(src, def.ini + pos, def.ini + pos + expr.length, a.text) });
      }
      return;
    }
    const mt = expr.match(/^this\.(\w+)\s*\(/);
    if (mt) { out.push(...mensajesDeMetodo(rel, mt[1], claves, soloFallo, prof + 1, vistos)); return; }
    if (claves.includes('data')) for (const a of alternativas(expr)) out.push({ ...a, rel, linea: lineaDeTexto(src, def.ini + pos, def.ini + pos + expr.length, a.text) });
  };
  for (const r of retornos(def.cuerpo)) examinar(r.txt, r.pos);
  return out;
}

/** Ruta de una llamada del frontend (`api.get(\`/x/${id}\`)`) → { verbo, segmentos } con `:p` en lo dinámico; null si no es literal. */
function rutaDeLlamadaFE(src, desde, hasta) {
  let ultima = null;
  for (const m of src.slice(desde, hasta).matchAll(/\bapi\s*\.\s*(get|post|put|patch|delete)\s*\(\s*(?=['"`])/g)) ultima = m;
  if (!ultima) return null;
  const ini = desde + ultima.index + ultima[0].length;
  const lit = src.slice(ini, skipString(src, ini));
  let ruta = lit.slice(1, -1);
  let previo;
  do { previo = ruta; ruta = ruta.replace(/\$\{[^${}]*\}/g, ':p'); } while (ruta !== previo);
  ruta = ruta.split('?')[0];
  if (!ruta.startsWith('/')) return null;
  return { verbo: ultima[1].toUpperCase(), segmentos: ruta.split('/').filter(Boolean), pos: desde + ultima.index };
}

/** La ruta del backend que mejor encaja con la del frontend (más segmentos fijos iguales); null si no hay una sola mejor. */
function rutaBEde(fe) {
  let mejor = null;
  let empate = false;
  for (const r of rutasBE) {
    if (r.verbo !== fe.verbo) continue;
    // Un segmento `:x?` es opcional.
    const variantes = [r.segmentos];
    if (r.segmentos.at(-1)?.endsWith('?')) variantes.push(r.segmentos.slice(0, -1));
    for (const segs of variantes) {
      if (segs.length !== fe.segmentos.length) continue;
      let puntos = 0;
      let ok = true;
      segs.forEach((s, i) => {
        const f = fe.segmentos[i];
        if (s.startsWith(':')) return;
        if (s === f) puntos += 2; else if (f === ':p') ok = false; else ok = false;
      });
      // El segmento dinámico del frontend solo puede ser un parámetro; uno fijo debe coincidir.
      if (!ok) continue;
      if (!mejor || puntos > mejor.puntos) { mejor = { r, puntos }; empate = false; } else if (puntos === mejor.puntos && mejor.r.metodo !== r.metodo) empate = true;
    }
  }
  return mejor && !empate ? mejor.r : null;
}

const exitoServidor = []; // filas publicadas
const exitoOmitidoFE = []; // avisos de pantalla de los que no se pudo llegar a un texto fijo
const candidatosExito = new Map();
for (const x of [...sinTextoLista, ...sitiosExito]) candidatosExito.set(`${x.rel}:${x.linea}:${x.pos}`, x);
for (const x of candidatosExito.values()) {
  const expr = (x.expr ?? '').trim();
  if (!x.src || /\b(error|err|e|ex)\b/.test(expr)) continue; // los de un `catch` ya están como mensajes del servidor (errores)
  const campo = expr.match(/(?<![\w$.])(?:data|res|resp|respuesta|result)\??\.(msg|message|mensaje)\b/)?.[1]
    ?? expr.match(/^(?:[\w$]+\??\.)*(msg|message|mensaje)$/)?.[1] ?? (/^(data)$/.test(expr) ? 'data' : null);
  const claves = campo === 'data' ? ['data'] : CLAVES_EXITO;
  if (!campo) { exitoOmitidoFE.push({ ...x, motivo: 'no es un dato de la respuesta' }); continue; }
  // Ventana: desde la última cabecera de función anterior hasta el aviso.
  const base = Math.max(0, x.pos - 4000);
  let desde = base;
  for (const f of x.src.slice(base, x.pos).matchAll(INICIO_FUNCION)) desde = base + f.index;
  const fe = rutaDeLlamadaFE(x.src, desde, x.pos);
  if (!fe) { exitoOmitidoFE.push({ ...x, motivo: 'no se halló la llamada a la API' }); continue; }
  const ruta = rutaBEde(fe);
  if (!ruta) { exitoOmitidoFE.push({ ...x, motivo: `sin ruta del backend para ${fe.verbo} /${fe.segmentos.join('/')}` }); continue; }
  // `if (!data.success) mostrarNotify(…, data.message)`: solo cuentan las respuestas con success/ok en falso.
  const soloFallo = /if\s*\(\s*!\s*[\w$]+(?:\??\.[\w$]+)*\.(?:success|ok)\s*\)\s*\{?\s*$/.test(x.src.slice(Math.max(0, x.pos - 120), x.pos));
  const textos = ruta.llamadas.flatMap(l => mensajesDeMetodo(l.rel, l.metodo, claves, soloFallo));
  if (!textos.length) { exitoOmitidoFE.push({ ...x, motivo: `${ruta.rel}#${ruta.metodo} no devuelve texto fijo` }); continue; }
  for (const t of textos)
    exitoServidor.push({ origen: 'servidor', rel: t.rel, linea: t.linea, modulo: moduloBE(t.rel), codigo: ruta.http, text: t.text, exprs: t.exprs, reserva: false, pantalla: { rel: x.rel, linea: x.linea }, ruta: `${fe.verbo} /${fe.segmentos.join('/')}` });
}
items.push(...exitoServidor);

/**
 * Cuenta y clasifica todos los textos `msg|message|mensaje: '…'` del backend que no son excepciones ni DTO, para saber cuáles
 * viajan al panel (los publicados arriba) y cuáles no.
 */
const clasificacionExito = new Map();
/** Para cada posición de `objetivos` (ordenadas), las claves de los objetos `{…}` que la contienen (de fuera hacia dentro). */
function clavesAncestras(src, objetivos) {
  const out = new Map();
  const pila = [];
  let k = 0;
  let i = 0;
  while (i < src.length && k < objetivos.length) {
    while (k < objetivos.length && objetivos[k] <= i) { out.set(objetivos[k], pila.slice()); k++; }
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const f = skipString(src, i); while (k < objetivos.length && objetivos[k] < f) { out.set(objetivos[k], pila.slice()); k++; } i = f; continue; }
    if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) { i = skipComment(src, i); continue; }
    if (c === '{') pila.push(src.slice(Math.max(0, i - 60), i).match(/([\w$]+)\s*:\s*$/)?.[1] ?? (/\)\s*$/.test(src.slice(Math.max(0, i - 3), i)) ? '()' : ''));
    else if (c === '}') pila.pop();
    i++;
  }
  return out;
}
{
  const publicadas = new Set(exitoServidor.map(x => `${x.rel}:${x.linea}`));
  for (const [rel, src] of archivosBE) {
    if (/\.dto\.ts$/.test(rel)) continue;
    const mask = mascaraComentarios(src, false);
    const excepciones = [];
    for (const m of src.matchAll(/new\s+\w*Exception\s*\(/g)) { const f = matchClose(src, m.index + m[0].length - 1); if (f > 0) excepciones.push([m.index, f]); }
    const hallazgos = [];
    for (const m of src.matchAll(/(?<![\w$])(msg|message|mensaje)\s*:\s*(?=['"`])/g)) {
      if (mask[m.index] || excepciones.some(([a, b]) => m.index > a && m.index < b)) continue;
      hallazgos.push(m);
    }
    if (!hallazgos.length) continue;
    const ancestras = clavesAncestras(src, hallazgos.map(m => m.index));
    for (const m of hallazgos) {
      const linea = lineOf(src, m.index);
      const claves = ancestras.get(m.index) ?? [];
      let clase;
      if (publicadas.has(`${rel}:${linea}`)) clase = 'viaja al panel (publicado)';
      else if (/processor\.ts$|queue/i.test(rel)) clase = 'trabajo en segundo plano (cola)';
      else if (claves.includes('metadata')) clase = 'registro de bitácora (log, metadata)';
      else if (claves.includes('error')) clase = 'error interno que otra capa traduce';
      else if (/deploy\.controller/.test(rel)) clase = 'respuesta técnica (despliegue)';
      else clase = 'se devuelve, pero ninguna pantalla muestra su texto';
      if (!clasificacionExito.has(clase)) clasificacionExito.set(clase, []);
      clasificacionExito.get(clase).push({ rel, linea, texto: src.slice(m.index, m.index + 110).split('\n')[0] });
    }
  }
}
if (args.has('--auditar-exito')) {
  for (const [clase, lista] of clasificacionExito) {
    console.log(`\n## ${clase} (${lista.length})`);
    if (clase !== 'viaja al panel (publicado)') for (const x of lista) console.log(`BE:${x.rel}:${x.linea}\t${x.texto}`);
  }
}

// ───────────────────────── Filtros: qué no se publica ─────────────────────────

const LETRAS = s => (s.match(/\p{L}/gu) ?? []).length;
const ES = /[áéíóúñ¿¡ü]|\b(el|la|los|las|de|del|que|se|un|una|para|por|con|ya|hay|al|su|sus|debe|puede|falta|fallo|ocurrió)\b|(ción|ado|ido|ada|ida)\b/i;
const EN = /\b(the|with|not found|check|please|unexpected|exists?|should|must|failed|cannot|could not|undefined|null|server logs|invalid|thumbnail)\b/i;
const TECNICOS_EXACTOS = /^(token no valido|En uso)$/i; // 'En uso' (router.service.ts:266) se captura y se reemplaza antes de llegar al usuario

/** Devuelve el motivo de exclusión o null si el mensaje se publica. */
function motivoExclusion(it) {
  const t = it.text;
  if (/^registro-pagos\//.test(it.rel) && it.rel !== 'registro-pagos/registrar-abono.service.ts') return 'API de integración de pagos (ver API de registro de pagos)';
  const sinMarcas = t.replace(/\[detalle del error\]|…/g, '');
  if (LETRAS(sinMarcas) < 4) return 'sin texto fijo';
  if (/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\b[A-Z]{3,}=[A-Z]+\b|HOST_API|\bDOMINIO\b/.test(t)) return 'nombra una variable de entorno';
  if (/falta(n)? (configurar )?.*en el servidor/i.test(t)) return 'configuración del servidor';
  if (/\.(ts|js|mjs|json|env)\b|middleware|process\.env|localhost|127\.0\.0\.1|getaddrinfo|ENOTFOUND|ECONN|ETIMEDOUT|EAI_AGAIN|\/var\/|\/usr\/|[A-Z]:\\/i.test(t)) return 'ruta, archivo o error de red interno';
  if (/cabeceras de firma|timestamp|ventana permitida|firma inv[aá]lida|cuerpo crudo|webhook|acceso no autorizado/i.test(t)) return 'aviso firmado de una pasarela o acceso interno';
  if (it.origen !== 'pantalla' && /cron-job|\bQUEUE\b|queue/i.test(t)) return 'proceso en segundo plano'; // en pantalla «Queue» es un modo de control de velocidad del router
  if (/`/.test(t)) return 'campo de la API de integración';
  if (/^El par[aá]metro \S+ es requerido/i.test(t) || /^(periodo|rango) debe ser/i.test(t)) return 'parámetro de API';
  if (/\b[a-z]+(?:_[a-z0-9]+)+\b|\b[a-z]{2,}[A-Z][A-Za-z]+\b/.test(t.replace(/\[detalle del error\]|\{[a-z_]+\}|\b(?:smartOLT|adminOLT|dLocal)\b/g, ''))) return 'nombre de campo técnico';
  if (/debe ser un (string|array|objeto|booleano)\b/i.test(t)) return 'validación de tipo de dato';
  if (it.exprs?.some(e => SECRETO.test(e.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '')))) return 'interpola un dato secreto';
  if (EN.test(t) && !ES.test(t)) return 'texto técnico en inglés';
  if (TECNICOS_EXACTOS.test(t.trim())) return 'texto técnico (sesión)';
  if (/^(error|fallo|ok|undefined|null|\.\.\.)\.?$/i.test(t.trim())) return 'sin información';
  return null;
}

// Mensajes genéricos que SÍ se publican aunque estén en inglés: son los que ve el usuario ante un error inesperado.
const GENERICOS = /^(Unexpected error, check server logs|Please check logs error)$/;

const omitidos = new Map();
const publicables = [];
for (const it of items) {
  it.text = it.text.replace(/…{2,}/g, '…').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (it.titulo) it.titulo = it.titulo.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (GENERICOS.test(it.text)) {
    it.modulo = 'generales';
    publicables.push(it);
    continue;
  }
  const motivo = motivoExclusion(it);
  if (motivo) {
    if (!omitidos.has(motivo)) omitidos.set(motivo, []);
    omitidos.get(motivo).push(it);
  } else publicables.push(it);
}

// Un texto de campo que sale en tres o más módulos, o que ya se asignó a «Mensajes generales», es de todo el sistema
// (p. ej. «Debes completar este campo»): va una sola vez, en «Mensajes generales».
{
  const modulosPorTexto = new Map();
  for (const it of publicables) {
    if (it.tipo !== TIPO_CAMPO && it.tipo !== TIPO_AYUDA) continue;
    const k = `${it.tipo}|${it.text}`;
    if (!modulosPorTexto.has(k)) modulosPorTexto.set(k, new Set());
    modulosPorTexto.get(k).add(it.modulo);
  }
  for (const it of publicables) {
    const mods = modulosPorTexto.get(`${it.tipo}|${it.text}`);
    if (mods && (mods.has('generales') || mods.size >= 3)) it.modulo = 'generales';
  }
}

// ───────────────────────── Notas: qué significa / qué hacer (solo lo comprobable en código) ─────────────────────────

/**
 * `texto`: fragmento exacto del mensaje (los datos variables se escriben `…`). `origen`: 'servidor' | 'pantalla'.
 * `nota`: lo que el código permite afirmar. `ev`: evidencia `FE:`/`BE:` con línea (queda como comentario; el
 * frontmatter `codigo:` de la página lista los archivos).
 */
const NOTAS = [
  // ── Mensajes generales ─────────────────────────────────────────────────────────────────────────────────────────
  {
    texto: 'Unexpected error, check server logs',
    nota: 'Error no previsto al guardar, editar o eliminar un registro. El detalle solo queda en el registro (log) del servidor: si se repite, avise a quien administra el sistema. Si el motivo es un valor repetido en un campo único, en su lugar se muestra el texto de detalle que devuelve la base de datos, sin traducir.',
    ev: 'BE:buys/buys.service.ts:224-231; BE:roles-and-permisos/roles-and-permisos.service.ts:74-83',
  },
  {
    texto: 'Please check logs error',
    nota: 'Error no previsto al crear un usuario o al cargar el listado de usuarios. El detalle queda en el registro del servidor.',
    ev: 'BE:auth/auth.service.ts:43-72, 255-269, 591-598',
  },
  {
    origen: 'pantalla',
    texto: 'No es posible borrar este registro, se encuentra en uso.',
    en: 'useHelpers.js',
    nota: 'Aparece al confirmar una eliminación cuando el servidor indica que otros datos dependen de ese registro. Si el servidor responde otro error, se muestra el texto que envíe.',
    ev: 'FE:composables/useHelpers.js:55-65; BE:customers/customers.service.ts:3215-3219',
  },
  {
    origen: 'pantalla',
    texto: 'Registro eliminado exitosamente',
    en: 'useHelpers.js',
    nota: 'Se muestra cuando el servidor aceptó la eliminación confirmada en el diálogo Confirmar.',
    ev: 'FE:composables/useHelpers.js:48-59',
  },

  // ── Acceso ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    texto: 'Usuario o contraseña incorrectos',
    nota: 'Inicio de sesión rechazado: el correo no existe (o el usuario está eliminado) o la contraseña no coincide. Una cuenta que ya está inactiva responde esto mismo si la contraseña es incorrecta.',
    ev: 'BE:auth/auth.service.ts:349-378, 416-432',
  },
  {
    texto: 'Cuenta inactivada por varios intentos fallidos',
    nota: 'Tras varios intentos fallidos de contraseña el sistema inactiva la cuenta. Restablecer la contraseña con "¿Olvidaste tu contraseña?" la reactiva solo si fue inactivada por estos intentos; si la inactivó un administrador, el restablecimiento no la reactiva.',
    ev: 'BE:auth/auth.service.ts:408-430, 520-545',
  },
  {
    texto: 'Su cuenta se encuentra inactiva, por favor comunicarse con su administrador',
    nota: 'Solo aparece cuando la contraseña es correcta y el usuario está inactivo.',
    ev: 'BE:auth/auth.service.ts:380-386',
  },
  {
    texto: 'Usuario no activo, hable con su administrador',
    nota: 'Se comprueba en cada petición de una sesión abierta: si el usuario quedó inactivo, el servidor rechaza la petición.',
    ev: 'BE:auth/strategies/jwt.strategy.ts:40-60',
  },
  {
    texto: 'Acceso denegado.',
    nota: 'Restricción de horario: aplica a los usuarios que no tienen el rol ADMINISTRADOR ni SUPER-ADMINISTRADOR, cuando el día o la hora actual queda fuera de los días y el horario configurados en su usuario. Los dos roles de administración no tienen esta restricción.',
    ev: 'BE:auth/auth.service.ts:123-170, 387-390',
  },
  {
    texto: 'La búsqueda venció, vuelve a buscar tu cuenta',
    nota: 'Recuperar la contraseña buscando la cuenta por celular o usuario: la búsqueda caduca y hay que repetirla.',
    ev: 'BE:auth/auth.service.ts:436-444, 467-495',
  },
  {
    texto: 'No existe una cuenta registrada con ese correo',
    nota: 'Recuperación de contraseña: el correo no corresponde a ningún usuario (los eliminados no cuentan).',
    ev: 'BE:auth/auth.service.ts:436-449',
  },
  {
    texto: 'No encontramos una cuenta con ese celular o usuario',
    nota: 'La búsqueda compara el nombre de usuario (sin distinguir mayúsculas) y el celular (solo dígitos).',
    ev: 'BE:auth/auth.service.ts:467-483',
  },
  {
    texto: 'No se pudo enviar el correo, intente más tarde o contacte a su administrador',
    nota: 'Falló el envío del correo con el enlace de recuperación de contraseña.',
    ev: 'BE:auth/auth.service.ts:455-461',
  },
  {
    texto: 'El enlace no es válido o ya venció, solicite uno nuevo',
    nota: 'El enlace del correo de recuperación caduca; al restablecer la contraseña con un enlace caducado o ya usado se pide solicitar otro.',
    ev: 'BE:auth/auth.service.ts:520-545',
  },
  {
    texto: 'No se puede eliminar a "…": tiene …',
    nota: 'El usuario tiene trabajo en curso: tickets abiertos o en proceso, o instalaciones pendientes, agendadas, en proceso o reprogramadas, como técnico u operador. Hay que reasignarlos o cerrarlos antes de eliminar al usuario.',
    ev: 'BE:auth/auth.service.ts:546-580; BE:ticket/entities/ticket.entity.ts:8-14; BE:instalaciones/entities/instalacione.entity.ts:14-21',
  },
  {
    origen: 'pantalla',
    texto: 'Debes seleccionar al menos 1 permiso',
    nota: 'Al guardar un rol, no se envía nada al servidor si ningún permiso está marcado.',
    ev: 'FE:pages/dashboard/roles-permisos/composables/useRol.js:17-19',
  },
  {
    origen: 'pantalla',
    texto: 'El tipo de archivo es invalido',
    nota: 'La foto del usuario solo admite archivos .jpg, .png o .jpeg.',
    ev: 'FE:pages/dashboard/usuarios/components/FormUser.vue:510-511; FE:pages/dashboard/usuarios/composables/useUser.js:63-65',
  },

  // ── Clientes y servicios ──────────────────────────────────────────────────────────────────────────────────────
  {
    texto: 'Tu suscripción permite un máximo de',
    nota: 'Al crear un cliente, agregarle un servicio o importar clientes por Excel, el servidor cuenta los servicios no eliminados de la empresa; si ya se alcanzó el máximo de clientes del plan contratado, no deja crear más.',
    ev: 'BE:customers/customers.service.ts:158-178, 261, 546-548',
  },
  {
    origen: 'pantalla',
    texto: 'El archivo contiene … clientes pero tu suscripción solo tiene',
    nota: 'La carga por Excel compara la cantidad de clientes del archivo con los cupos disponibles del plan antes de subir nada.',
    ev: 'FE:pages/dashboard/clientes/components/modals/ModalCargarExcel.vue:629-645',
  },
  {
    texto: 'ya existe un cliente con esta ipv4',
    nota: 'Solo se valida al importar clientes por Excel: otro servicio no eliminado del mismo router ya usa esa IPv4.',
    ev: 'BE:customers/customers.service.ts:268-279',
  },
  {
    texto: 'Ya existe un cliente con el usuario PPPoE',
    nota: 'El usuario PPPoE no puede repetirse dentro de un mismo router. Al editar, se excluye el propio servicio.',
    ev: 'BE:customers/customers.service.ts:281-296, 2436-2458',
  },
  {
    texto: 'La IPv6 "…" no es una dirección válida',
    nota: 'Validación de la IPv6 al importar clientes por Excel.',
    ev: 'BE:customers/customers.service.ts:215-257, 299',
  },
  {
    texto: 'no pertenece a ninguna red IPv6 activa del router',
    nota: 'Validación al importar por Excel: la IPv6 debe caer dentro de una red IPv6 activa del router elegido.',
    ev: 'BE:customers/customers.service.ts:229-248',
  },
  {
    texto: 'Ya existe un cliente con esta IPv6',
    nota: 'Validación al importar por Excel: la IPv6 ya está asignada a otro servicio del mismo router.',
    ev: 'BE:customers/customers.service.ts:246-252',
  },
  {
    texto: 'Ya existe un cliente con este numero de documento',
    nota: 'Al crear un cliente, el número de documento no puede estar ya registrado. Al editar, solo falla si el documento pertenece a otro cliente.',
    ev: 'BE:customers/customers.service.ts:2055-2064',
  },
  {
    texto: 'no pertenece a la misma empresa que el router del servicio',
    nota: 'La sucursal de facturación de un servicio debe ser de la misma empresa que el router del servicio, para que el cobro no se emita bajo otra empresa.',
    ev: 'BE:customers/customers.service.ts:2287-2330',
  },
  {
    texto: 'está inactiva.',
    nota: 'No se puede asignar como sucursal de facturación una sucursal inactiva.',
    ev: 'BE:customers/customers.service.ts:2316-2319',
    en: 'customers/customers.service.ts',
  },
  {
    texto: 'No se pudo retirar el servicio',
    nota: 'Al eliminar un cliente, primero se retira cada uno de sus servicios; si ese retiro falla (por ejemplo, el router no responde), el cliente no se elimina.',
    ev: 'BE:customers/customers.service.ts:2818-2840',
  },
  {
    texto: 'ya está asignado a otro servicio',
    nota: 'El número de contrato no puede repetirse entre servicios.',
    ev: 'BE:customers/customers.service.ts:3137-3150',
  },
  {
    texto: 'Error al agregar cliente a mikrotik',
    en: 'customers/customers.service.ts',
    nota: 'El router (o la OLT) rechazó la operación. Se muestra en lista junto con el motivo que devolvió.',
    ev: 'BE:customers/customers.service.ts:519-527, 710-717',
  },
  {
    texto: 'Error al editar el cliente en',
    en: 'customers/customers.service.ts',
    nota: 'El router (o la OLT) rechazó el cambio. Se muestra en lista junto con el motivo que devolvió.',
    ev: 'BE:customers/customers.service.ts:2564-2572, 2748-2756, 2806-2812',
  },
  {
    origen: 'pantalla',
    texto: 'El usuario PPPoE ya está en uso. Elige otro.',
    nota: 'La pantalla impide guardar el servicio mientras detecte el usuario PPPoE repetido; el servidor también lo rechaza.',
    ev: 'FE:pages/dashboard/clientes/components/ServicioInternet.vue:759-771',
  },
  {
    origen: 'pantalla',
    texto: 'No se encontró la MAC. Verifica que el cliente esté conectado al router.',
    nota: 'El router no devolvió una MAC para la IPv4 indicada en ese momento.',
    ev: 'FE:pages/dashboard/clientes/components/ServicioInternet.vue:257-273',
  },
  {
    origen: 'pantalla',
    texto: 'El router no conoce esa MAC en este momento',
    nota: 'La búsqueda de la IPv4 por MAC no encontró esa MAC en el router.',
    ev: 'FE:pages/dashboard/clientes/components/ServicioInternet.vue:325-334',
  },

  // ── Pagos y cobranza ──────────────────────────────────────────────────────────────────────────────────────────
  {
    origen: 'pantalla',
    texto: 'Ya fue ingresado este N° de transacción',
    nota: 'Aparece bajo el campo del número de transacción cuando el servidor informa que ya existe un pago con ese número. Si el servidor devuelve el cliente y la factura donde se usó, se añaden al final ("— Cliente: … · Factura N° …").',
    ev: 'FE:utils/mensaje-transaccion.js:3-9; FE:pages/dashboard/registrar-pago/components/PayComponent.vue:349-359; FE:pages/dashboard/clientes/components/modals/ModalPago.vue:355',
  },
  {
    texto: 'El motivo de anulación es obligatorio',
    nota: 'Se exige al anular una factura o un pago cuando están activadas, en Ajustes › Facturación, las opciones "Pedir motivo al anular factura/pago" y "Motivo de anulación obligatorio" (ambas activadas por defecto).',
    ev: 'BE:pagos/pagos.service.ts:893-904, 970-979, 1083-1092; FE:pages/dashboard/ajustes/facturacion/components/FacturacionPage.vue:259-287',
  },
  {
    texto: 'El motivo de eliminación es obligatorio',
    nota: 'Misma regla que el motivo de anulación: depende de las opciones "Pedir motivo al anular factura/pago" y "Motivo de anulación obligatorio" de Ajustes › Facturación.',
    ev: 'BE:pagos/pagos.service.ts:1295-1302',
  },
  {
    texto: 'Esta factura tiene un comprobante electrónico autorizado',
    nota: 'Una factura con comprobante electrónico en estado AUTORIZADO o VALIDADA no se anula dando de baja el pago: hay que anularla con nota de crédito.',
    ev: 'BE:pagos/pagos.service.ts:985-1002',
  },
  {
    texto: 'Este abono tiene un comprobante electrónico autorizado',
    nota: 'Igual que el anterior, aplicado al abono que se intenta anular: se anula con nota de crédito.',
    ev: 'BE:pagos/pagos.service.ts:1106-1115',
  },
  {
    texto: 'El envío de recordatorios está desactivado en la configuración.',
    nota: 'Aparece al ejecutar un recordatorio manualmente ("Ejecutar") con el interruptor "Enviar recordatorio de pagos:" apagado, en Ajustes › Plantillas.',
    ev: 'BE:pagos/pagos.service.ts:1840-1843; FE:pages/dashboard/ajustes/plantillas/components/RecordatorioPago.vue:218-224, 195-206',
  },
  {
    texto: 'Recordatorio no válido.',
    nota: 'El número de recordatorio que se pidió ejecutar no existe en la lista de horarios de recordatorio configurados.',
    ev: 'BE:pagos/pagos.service.ts:1844-1846',
  },
  {
    texto: 'Ya hay un envío de recordatorios en curso. Espera a que termine.',
    nota: 'No se inicia otra ejecución manual mientras el progreso de recordatorios siga activo.',
    ev: 'BE:pagos/pagos.service.ts:1848-1853',
  },
  {
    texto: 'La plantilla seleccionada está vacía. Escribe un mensaje antes de probar.',
    nota: 'Prueba de recordatorio ("Probar"): ni el texto del cuadro ni la plantilla guardada tienen contenido.',
    ev: 'BE:pagos/pagos.service.ts:1783-1794',
  },
  {
    texto: 'Indica un correo para la prueba.',
    nota: 'Prueba de recordatorio con el canal correo (o ambos) elegido y sin correo de destino.',
    ev: 'BE:pagos/pagos.service.ts:1795-1797',
  },
  {
    texto: 'Indica un número de WhatsApp para la prueba.',
    nota: 'Prueba de recordatorio con el canal WhatsApp (o ambos) elegido y sin número de destino.',
    ev: 'BE:pagos/pagos.service.ts:1798-1800',
  },
  {
    texto: 'No es posible eliminar esta forma de pago, se encuentra en uso en pagos registrados.',
    nota: 'Hay pagos vigentes (no eliminados) que usan esta forma de pago.',
    ev: 'BE:forma-pago/forma-pago.service.ts:83-96',
  },
  {
    texto: 'No es posible eliminar esta forma de pago, tiene detalles asociados.',
    nota: 'La forma de pago aún tiene detalles; se eliminan antes desde la pestaña "Detalle formas pago".',
    ev: 'BE:forma-pago/forma-pago.service.ts:98-113',
  },
  {
    texto: 'No es posible eliminar este detalle de forma de pago',
    nota: 'Hay pagos vigentes que usan este detalle.',
    ev: 'BE:detalle-forma-pago/detalle-forma-pago.service.ts:83-94',
  },
  {
    texto: 'No hay ninguna pasarela de pagos lista para cobrar.',
    nota: 'Al generar el enlace de cobro de una factura no hay una pasarela configurada y disponible; se configura en Ajustes → Pasarelas de Pagos.',
    ev: 'BE:pasarelas-pago/cobros.service.ts:113-120',
  },
  {
    texto: 'menor al mínimo que acepta la pasarela',
    nota: 'El saldo pendiente de la factura es menor que el monto mínimo del proveedor de pago; ese saldo se cobra por otro medio.',
    ev: 'BE:pasarelas-pago/cobros.service.ts:107-127',
  },
  {
    texto: 'no tiene saldo pendiente',
    nota: 'Se pidió el enlace de cobro de una factura cuyo saldo es cero o negativo.',
    ev: 'BE:pasarelas-pago/cobros.service.ts:44-56',
    en: 'pasarelas-pago/cobros.service.ts',
  },
  {
    texto: 'No se pudo verificar con la pasarela si esta factura ya fue pagada.',
    nota: 'Antes de entregar un enlace de cobro, el sistema consulta a la pasarela si la factura ya se cobró; si la consulta falla, no entrega el enlace y pide reintentar.',
    ev: 'BE:pasarelas-pago/cobros.service.ts:330-352',
  },
  {
    texto: 'El cobro está en estado "…" y sólo se pueden registrar los pagados.',
    nota: 'Solo se registra en la factura un cobro que la pasarela marcó como cobrado (estado approved).',
    ev: 'BE:pasarelas-pago/consulta-cobros.service.ts:90-106',
  },
  {
    texto: 'El cobro no indica a qué factura corresponde',
    nota: 'El cobro de la pasarela no trae el dato de la factura; se registra a mano desde el perfil del cliente.',
    ev: 'BE:pasarelas-pago/consulta-cobros.service.ts:108-112',
  },
  {
    texto: 'Indica el celular del cliente',
    nota: 'Envío del enlace de cobro por WhatsApp (o por ambos canales) sin número de celular.',
    ev: 'BE:pasarelas-pago/envio-cobro.service.ts:57-59',
  },
  {
    texto: 'Indica el correo del cliente',
    nota: 'Envío del enlace de cobro por correo (o por ambos canales) sin correo.',
    ev: 'BE:pasarelas-pago/envio-cobro.service.ts:60-62',
  },
  {
    texto: 'ya fue pagada; no hay enlace que enviar.',
    nota: 'La factura ya está cobrada, así que no se genera ni se envía el enlace de cobro.',
    ev: 'BE:pasarelas-pago/envio-cobro.service.ts:66-70',
  },
  {
    texto: 'La promesa ya no está vigente: no se puede notificar.',
    nota: 'Solo se notifican promesas de pago vigentes.',
    ev: 'BE:promesas-pago/promesas-pago-notificacion.service.ts:43, 69-71',
  },
  {
    texto: 'No hay plantilla de promesa de pago configurada.',
    nota: 'El texto de la plantilla de promesa de pago está vacío en Ajustes › Plantillas.',
    ev: 'BE:promesas-pago/promesas-pago-notificacion.service.ts:73-78',
  },
  {
    texto: 'No se envió por ningún canal',
    nota: 'No se envió por correo ni por WhatsApp: falta el correo o el celular del cliente, o el canal está inactivo (si el canal se eligió a mano, se ignora el interruptor del canal).',
    ev: 'BE:promesas-pago/promesas-pago-notificacion.service.ts:94-121',
  },

  // ── Facturas y comprobantes ───────────────────────────────────────────────────────────────────────────────────
  {
    texto: 'Un grupo necesita al menos 2 servicios.',
    nota: 'Un grupo de facturación se crea o se edita con dos o más servicios.',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:164',
  },
  {
    texto: 'Selecciona al menos 2 facturas para cobrarlas juntas.',
    nota: 'El cobro agrupado necesita dos o más facturas del grupo.',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:288',
  },
  {
    texto: 'de las facturas seleccionadas ya no se pueden cobrar en grupo',
    nota: 'Alguna factura elegida dejó de ser elegible (tiene abonos, ya se facturó sin pago, no es del grupo o cambió de estado). El número inicial indica cuántas; recargue la lista.',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:290-298',
  },
  {
    texto: 'Las facturas seleccionadas no van al mismo comprador',
    nota: 'Las facturas elegidas pertenecen a compradores distintos (cliente o tercero) y no hay un tercero común para el grupo ni se eligió uno en "Facturar a tercero".',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:303-322',
  },
  {
    texto: 'La empresa no está habilitada para emitir factura electrónica; el cobro agrupado solo emite Factura.',
    nota: 'La empresa de la sucursal elegida no tiene activada la facturación electrónica (requiere_facturacion).',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:324-330',
  },
  {
    texto: 'Facturar a tercero: falta',
    nota: 'El recuadro "Facturar a tercero" está activado y falta la identificación, la razón social o un email válido.',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:511-522',
  },
  {
    texto: 'No se pudo registrar el cobro agrupado',
    nota: 'El cobro agrupado falló; el mensaje indica que no se emitió ningún comprobante y el sistema intenta revertir los abonos ya registrados.',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:405-432',
  },
  {
    texto: 'No se pudo confirmar el pago del grupo',
    nota: 'La confirmación del pago del grupo falló; el mensaje indica que no se registró ningún pago.',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:672-690',
  },
  {
    texto: 'El N° de transacción … ya se usó en la factura N°',
    nota: 'El número de transacción indicado en el cobro agrupado ya está en otro pago; se muestra la factura y, si existe, el cliente.',
    ev: 'BE:grupos-facturacion/grupos-facturacion.service.ts:337-347, 620-629',
  },
  {
    texto: 'no tiene configurada la secuencia de',
    nota: 'La sucursal no tiene número de secuencia configurado para ese tipo de comprobante (facturas o notas de crédito) en el ambiente indicado, así que no se emite un número inventado.',
    ev: 'BE:comprobantes-electronicos/facturas/facturas.service.ts:125-145',
  },

  // ── Red ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    texto: 'No se puede eliminar este router, porque tiene clientes.',
    nota: 'El router tiene planes de internet asociados (o registros que dependen de él). Se verifica al eliminarlo.',
    ev: 'BE:router/router.service.ts:253-282',
  },
  {
    texto: 'No se puede eliminar este router.',
    nota: 'Cualquier otro error al eliminar el router.',
    ev: 'BE:router/router.service.ts:276-281',
  },
  {
    texto: 'Versión del RouterOS no compatible',
    nota: 'Al configurar la conexión segura (SSL) de un router marcado como RouterOS V7.x, el router no cumple la versión mínima 7.9.',
    ev: 'BE:mikrotik/mikrotik.service.ts:62-90; BE:common/utils/mikrotik.service.ts:115-140',
  },
  {
    texto: 'No se logró realizar la conexión al router por API sin SSL',
    nota: 'Al configurar la conexión segura, el servidor no pudo abrir primero la conexión API normal con los datos del router (IP, usuario, contraseña y puerto API).',
    ev: 'BE:mikrotik/mikrotik.service.ts:66-78',
  },
  {
    texto: 'Ya hay un traslado en proceso para este router',
    nota: 'Solo puede haber un traslado de clientes entre redes en ejecución por router.',
    ev: 'BE:red-ipv4/red-ipv4.service.ts:376-381',
  },
  {
    texto: 'No hay ningún cliente que se pueda trasladar a',
    nota: 'La previsualización no encontró clientes que puedan pasar a la red de destino.',
    ev: 'BE:red-ipv4/red-ipv4.service.ts:382-383',
  },
  {
    texto: 'Solo se pueden trasladar clientes entre redes del mismo router',
    nota: 'La red de origen y la de destino deben pertenecer al mismo router.',
    ev: 'BE:red-ipv4/red-ipv4.service.ts:217-226',
  },
  {
    texto: 'La red de origen y la de destino son la misma',
    nota: 'Hay que elegir dos redes distintas para trasladar clientes.',
    ev: 'BE:red-ipv4/red-ipv4.service.ts:211-214',
  },
  {
    texto: 'ingresada en … ya está asignada a un cliente.',
    nota: 'Al editar una red IPv4 se cambió una de sus direcciones (por ejemplo la puerta de enlace) a una IP que ya usa un servicio de esa red.',
    ev: 'BE:red-ipv4/red-ipv4.service.ts:1003-1014',
  },
  {
    texto: 'se solapa con la red existente',
    nota: 'La red nueva comparte rango de direcciones con otra red del mismo router.',
    ev: 'BE:red-ipv4/red-ipv4.service.ts:725-745; BE:red-ipv6/red-ipv6.service.ts:60-70',
  },
  {
    texto: 'No es posible eliminar esta red, se encuentra en uso por uno o más servicios.',
    nota: 'Hay servicios que usan esta red IPv4.',
    ev: 'BE:red-ipv4/red-ipv4.service.ts:1184-1190',
  },

  // ── Mensajería ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    texto: 'El canal de correo está desactivado',
    nota: 'Un envío automático encontró apagado el canal de correo. El envío manual ignora este interruptor.',
    ev: 'BE:email/email.service.ts:229-235',
  },
  {
    texto: 'La empresa no tiene WhatsApp Cloud API configurado',
    nota: 'Faltan en la empresa el identificador del número de teléfono o el token de acceso de WhatsApp Cloud API.',
    ev: 'BE:cloud-api/cloud-api.service.ts:633-638',
  },
  {
    texto: 'No hay plantilla de WhatsApp Oficial para',
    nota: 'Ese aviso no tiene una plantilla de WhatsApp Oficial registrada en Meta.',
    ev: 'BE:cloud-api/cloud-api.service.ts:1428-1436',
  },
  {
    texto: 'no está aprobada (estado:',
    nota: 'La plantilla existe pero Meta no la tiene aprobada; antes de fallar, el sistema intenta sincronizar el estado una vez.',
    ev: 'BE:cloud-api/cloud-api.service.ts:1437-1452',
  },
  {
    texto: 'El cliente tiene datos incompletos',
    nota: 'Alguna variable de la plantilla llegó vacía para ese cliente (falta el dato en su ficha). Meta rechaza plantillas con parámetros vacíos.',
    ev: 'BE:cloud-api/cloud-api.service.ts:1455-1470',
  },
  {
    texto: 'El contenido es idéntico al de',
    nota: 'Otra plantilla ya tiene exactamente el mismo cuerpo; hay que cambiar algo para diferenciarlas.',
    ev: 'BE:cloud-api/cloud-api.service.ts:1550-1560',
  },
  {
    texto: 'Elige qué dato va en cada variable de la plantilla.',
    nota: 'Al vincular una plantilla ya aprobada en Meta, falta indicar el dato de cada variable.',
    ev: 'BE:cloud-api/cloud-api.service.ts:1935-1943',
  },
  {
    texto: 'Cada variable de la plantilla necesita un dato distinto.',
    nota: 'Al vincular una plantilla aprobada, dos variables no pueden usar el mismo dato.',
    ev: 'BE:cloud-api/cloud-api.service.ts:1944-1948',
  },
  {
    texto: 'El texto de ISPMax no coincide con el de la plantilla aprobada.',
    nota: 'Al vincular, el texto local no equivale al texto aprobado en Meta: se adopta el texto aprobado o se crea una plantilla nueva.',
    ev: 'BE:cloud-api/cloud-api.service.ts:1950-1956',
  },
  // ── Confirmaciones de éxito que muestra la pantalla ──────────────────────────────────────────────────────────────
  {
    texto: 'Actualizado Exitosamente',
    nota: 'Respuesta de activar o desactivar un registro desde su listado (router, plan de internet, red IPv4, caja NAP o sucursal): el cambio de estado se hizo.',
    ev: 'BE:router/router.service.ts:243-253; BE:internet/internet.service.ts:733-751; BE:red-ipv4/red-ipv4.service.ts:880-887; BE:caja-nap/caja-nap.service.ts:642-649; BE:sucursal/sucursal.service.ts:108-116',
  },
];

const notaDe = r =>
  NOTAS.find(
    n =>
      (n.origen === 'pantalla') === (r.origen === 'pantalla') &&
      r.text.includes(n.texto) &&
      (!n.en || r.orig.some(o => o.includes(n.en))),
  );
const usadas = new Set();

// ───────────────────────── Agrupar y deduplicar ─────────────────────────

const esc = s =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/[|*_`{}[\]<>~]/g, c => '\\' + c);

const abreviarFE = rel =>
  rel
    .replace(/^pages\/dashboard\//, '')
    .replace(/^pages\//, '')
    .split('/')
    .filter(s => !['components', 'composables', 'pages', 'dashboard'].includes(s))
    .slice(-3)
    .join('/');

const grupos = new Map(GRUPOS.map(g => [g.id, { ...g, servidor: new Map(), pantalla: new Map() }]));
for (const it of publicables) {
  const g = grupos.get(it.modulo);
  const lado = it.origen === 'pantalla' ? g.pantalla : g.servidor;
  const clave = `${it.tipo ?? ''}|${it.titulo ?? ''}|${it.text}`;
  if (!lado.has(clave)) lado.set(clave, { ...it, orig: [], codigos: new Set(), reservaSolo: true, validacion: true });
  const r = lado.get(clave);
  const o = it.origen === 'pantalla' ? `${abreviarFE(it.rel)}:${it.linea}` : `${it.rel}:${it.linea}`;
  if (!r.orig.includes(o)) r.orig.push(o);
  if (it.codigo) r.codigos.add(it.codigo);
  if (it.pantalla) {
    const pa = `${abreviarFE(it.pantalla.rel)}:${it.pantalla.linea}`;
    (r.pantallas ??= []).includes(pa) || r.pantallas.push(pa);
  }
  if (!it.reserva) r.reservaSolo = false;
  if (it.origen !== 'validacion') r.validacion = false;
}

const listaOrigen = orig => {
  const vistos = orig.slice(0, 3).map(o => `\`${o}\``).join('<br/>');
  return orig.length > 3 ? `${vistos}<br/>y ${orig.length - 3} más` : vistos;
};

function filaServidor(r) {
  const nota = notaDe(r);
  if (nota) usadas.add(nota);
  const auto = r.reservaSolo ? 'Texto de reserva: se usa solo si el error original no trae mensaje.' : '';
  // Pantallas que muestran este texto de éxito o aviso devuelto por el servidor (con formato de código, fuera de esc()).
  const pantallas = r.pantallas?.length
    ? `La pantalla lo muestra en un aviso: ${r.pantallas.slice(0, 3).map(x => `\`${x}\``).join(', ')}${r.pantallas.length > 3 ? ` y ${r.pantallas.length - 3} más` : ''}.`
    : '';
  const cod = [...r.codigos].sort().join(', ') || '—';
  const tipo = r.validacion ? `${cod} (validación)` : cod;
  return `| ${esc(r.text)} | ${tipo} | ${listaOrigen(r.orig)} | ${[esc([nota?.nota, auto].filter(Boolean).join(' ')), pantallas].filter(Boolean).join(' ')} |`;
}

function filaPantalla(r) {
  const nota = notaDe(r);
  if (nota) usadas.add(nota);
  const auto = r.reservaSolo && r.tipo !== 'Confirmación' && r.tipo !== 'Diálogo' ? 'Texto de reserva: aparece si la respuesta del servidor no trae mensaje.' : '';
  const cuerpo = [r.titulo ? `**${esc(r.titulo)}**` : '', esc(r.text)].filter(Boolean).join(' ');
  const botones = r.botones?.length ? ` _(botones: ${r.botones.map(esc).join(' / ')})_` : '';
  return `| ${cuerpo}${botones} | ${r.tipo} | ${listaOrigen(r.orig)} | ${esc([nota?.nota, auto].filter(Boolean).join(' '))} |`;
}

const ordenar = filas => [...filas].sort((x, y) => (x.titulo ?? '').concat(x.text).localeCompare((y.titulo ?? '').concat(y.text), 'es'));

let total = 0;
let totalServidor = 0;
let totalPantalla = 0;
const secciones = [];
for (const g of grupos.values()) {
  const srv = ordenar(g.servidor.values());
  const pan = ordenar(g.pantalla.values());
  if (!srv.length && !pan.length) continue;
  total += srv.length + pan.length;
  totalServidor += srv.length;
  totalPantalla += pan.length;
  let md = `## ${g.titulo}\n\n`;
  if (g.id === 'generales')
    md += 'Mensajes que pueden aparecer en cualquier pantalla del sistema.\n\n';
  if (srv.length)
    md += `### Mensajes del servidor\n\n${srv.length} mensajes.\n\n| Mensaje | Código | Origen | Qué significa / qué hacer |\n|---|---|---|---|\n${srv.map(filaServidor).join('\n')}\n\n`;
  if (pan.length)
    md += `### Avisos y diálogos de la pantalla\n\n${pan.length} avisos.\n\n| Aviso | Tipo | Pantalla | Qué significa / qué hacer |\n|---|---|---|---|\n${pan.map(filaPantalla).join('\n')}\n\n`;
  secciones.push({ g, md, n: srv.length + pan.length });
}

for (const n of NOTAS)
  if (!usadas.has(n)) console.warn(`AVISO: la nota "${n.texto}" no coincide con ningún mensaje (¿cambió el código?). Revisar ${n.ev ?? ''}`);

// ───────────────────────── Auditoría (opcional) ─────────────────────────

const totalOmitidos = [...omitidos].filter(([m]) => m !== 'sin texto fijo').reduce((n, [, l]) => n + l.length, 0);
if (args.has('--auditar')) {
  for (const [motivo, lista] of omitidos) {
    console.log(`\n## OMITIDOS · ${motivo} (${lista.length})`);
    for (const it of lista) console.log(`${it.origen === 'pantalla' ? 'FE' : 'BE'}:${it.rel}:${it.linea}\t${it.text}`);
  }
}

// ───────────────────────── Página ─────────────────────────

const nClase = c => clasificacionExito.get(c)?.length ?? 0;
const noMostradas = nClase('se devuelve, pero ninguna pantalla muestra su texto');
const deTecnica = nClase('respuesta técnica (despliegue)');
const deBitacora = nClase('registro de bitácora (log, metadata)');
const deCola = nClase('trabajo en segundo plano (cola)');
const deError = nClase('error interno que otra capa traduce');
const indice = secciones.map(s => `- [${s.g.titulo}](#${s.g.titulo.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-')}): ${s.n}`).join('\n');

const mdx = `---
title: "Mensajes del sistema"
description: "Catálogo de los textos de error, advertencia y confirmación que muestran el servidor y las pantallas de ISPMAX, agrupados por módulo."
modulo: general
tipo: referencia
grupo: Mensajes
orden: 2
sinonimos: ["mensajes de error", "errores", "avisos", "notificaciones de error", "qué significa este error", "no se pudo", "fallo al", "texto del error", "texto exacto de un aviso del sistema", "lista de mensajes de error del sistema", "Unexpected error, check server logs", "qué significa Unexpected error, check server logs"]
codigo:
  - FE:composables/useHelpers.js
  - FE:utils/mensajeError.js
  - FE:utils/mensaje-transaccion.js
  - FE:composables/useUbicacion.js
  - FE:composables/useAppIspmax.js
  - FE:pages/dashboard/Gestion-Red/mapa-nap/utils/kmz.js
  - FE:pages/dashboard/clientes/composables/useCliente.js
  - FE:pages/dashboard/usuarios/composables/useUser.js
  - FE:pages/dashboard/empresas/composables/useEmpresa.js
  - BE:auth/auth.service.ts
  - BE:customers/customers.service.ts
  - BE:pagos/pagos.service.ts
  - BE:grupos-facturacion/grupos-facturacion.service.ts
  - BE:cloud-api/cloud-api.service.ts
verificado:
  fecha: ${FECHA}
  version: ${VERSION}
  metodo: codigo
  sin_probar: [router, olt, whatsapp, sri, pasarela]
estado: verificado
---

{/* Generado por scripts/gen-mensajes.mjs a partir del código fuente del producto. No editar a mano: se pierde al regenerar. */}

<Kicker>Referencia · Mensajes</Kicker>

# Mensajes del sistema

<Lead>Los textos de error, advertencia y confirmación que ISPMAX muestra al usuario, con la pantalla o el módulo donde se producen. Sirve para buscar con Ctrl+F el texto que aparece en pantalla.</Lead>

## Cómo leer las tablas

- **Mensajes del servidor**: los devuelve el servidor cuando rechaza, no puede completar o confirma una operación; la pantalla los muestra tal cual en un aviso (si son varios, como lista). En el alta de cliente y servicio, los textos de validación llevan delante el nombre del bloque (\`cliente.\`, \`facturacion.\` o \`servicio.\`), por ejemplo \`cliente.El campo nombres no debe estar vacío.\`. La columna **Código** es el código HTTP de la respuesta: 200 o 201 (la operación se hizo o el servidor informa su resultado; en esas filas, la columna de la derecha dice qué pantalla muestra el texto), 400 (datos inválidos o regla de negocio), 401 (sin sesión o sin acceso), 403 (sin permiso), 404 (no encontrado), 409 (conflicto), 500 (error del servidor), 502 y 503 (servicio externo no disponible). Los marcados como _validación_ son los textos de los campos de un formulario.
- **Avisos y diálogos de la pantalla**: textos fijos que escribe la propia pantalla. **Tipo** es el color del aviso (Éxito, Error, Advertencia, Información), **Confirmación** en un diálogo (con botones para aceptar o cancelar), **Mensaje de campo** cuando el texto aparece bajo un campo del formulario porque el dato falta o no es válido, y **Ayuda del campo** cuando es una ayuda fija bajo el campo (no indica un error).
- Los datos que cambian en cada aviso (un nombre, un número, una cantidad) se escriben como … y el texto técnico de un error, como [detalle del error].
- **Origen** y **Pantalla** indican el archivo y la línea del código donde está el texto. En el frontend las rutas van abreviadas: relativas a \`pages/dashboard/\` y sin las carpetas \`components/\` ni \`composables/\`. Si el mismo texto sale de varios sitios, se listan los tres primeros.
- **Qué significa / qué hacer** solo se completa cuando el código permite afirmarlo (la condición que dispara el mensaje o su consecuencia). Si está vacía, no hay más explicación comprobable que el propio texto. **Texto de reserva** indica que el aviso solo aparece cuando la respuesta del servidor no trae mensaje.
- Muchos avisos de error de la pantalla muestran el mensaje del servidor tal cual: esos textos están en las tablas **Mensajes del servidor** y no se repiten en las de pantalla.
- Para buscar un mensaje con datos variables, busque la parte fija del texto.

:::info Alcance de esta página
Reúne **${total}** textos fijos que un usuario puede ver: **${totalServidor}** del servidor y **${totalPantalla}** de las pantallas, leídos del código de la versión \`${VERSION}\`. No incluye los ${totalOmitidos} textos que no sirven a un usuario (errores técnicos en inglés, procesos en segundo plano, parámetros de la API, avisos firmados de las pasarelas, y los que nombran configuración interna o datos secretos), los mensajes de la [API de registro de pagos](/referencia/api-registro-de-pagos) para integraciones, ni los mensajes que el código arma por completo con datos del momento o que vienen de un servicio externo (router, OLT, SRI, WhatsApp, pasarela). Los textos que aparecen bajo los campos de los formularios (por ejemplo, *Debes completar este campo*) figuran con el tipo *Mensaje de campo* o *Ayuda del campo*; no se incluyen las etiquetas de los campos, los ejemplos dentro del campo (*placeholder*), los textos de «Cargando…» ni las confirmaciones de éxito que el servidor devuelve y que ninguna pantalla muestra (${noMostradas} textos de respuestas como «Registro actualizado exitosamente»), los ${deBitacora} que el servidor guarda en su registro de cambios, los ${deCola} de los procesos en segundo plano, los ${deError} errores internos que otra capa traduce ni los ${deTecnica} de la ruta técnica de despliegue. Sí figuran las confirmaciones que alguna pantalla muestra, con la pantalla en la última columna.
:::

:::info Servicio externo no probado
Esta página se generó leyendo el código de la versión indicada: cada texto se contrastó con la línea de código citada. Una muestra de 41 mensajes del servidor y 7 avisos de pantalla se reprodujo en pantalla con datos ficticios con una versión anterior del código (zip-2026-10-14); con esta versión no se repitió esa prueba. No se probó con un router, una OLT, WhatsApp, el SRI ni una pasarela de pago: qué situación real dispara los mensajes que dependen de ellos no se reprodujo.
:::

${indice}

${secciones.map(s => s.md).join('')}
## Relacionado

- [Roles y permisos](/referencia/permisos): por qué no aparece un botón o una pantalla.
- [Procesos automáticos de ISPMAX](/referencia/automatizaciones): recordatorios, cortes y reintentos.
- [Variables de las plantillas de mensajes](/referencia/variables-de-plantillas): datos que insertan los mensajes automáticos.
- [API de registro de pagos para integraciones](/referencia/api-registro-de-pagos): respuestas de la API de pagos.
- [Problemas frecuentes](/problemas/): síntomas y soluciones por módulo.

<SearchTerms terms="mensajes error aviso notificacion fallo no se pudo advertencia confirmar eliminar texto del error significa" />
`;

if (args.has('--rutas')) for (const r of rutasBE) console.log(`RUTA\t${r.verbo} /${r.segmentos.join('/')}\t${r.rel}#${r.metodo}\t${r.http}\t${r.llamadas.map(l => l.rel + '#' + l.metodo).join(', ')}`);
if (args.has('--exito')) {
  for (const x of exitoServidor) console.log(`OK\tBE:${x.rel}:${x.linea}\t${x.codigo}\t${x.text}\t← FE:${x.pantalla.rel}:${x.pantalla.linea} (${x.ruta})`);
  for (const x of exitoOmitidoFE) console.log(`NO\tFE:${x.rel}:${x.linea}\t${x.expr}\t${x.motivo}`);
}
if (args.has('--sin-texto')) for (const x of sinTextoLista) console.log(`FE:${x.rel}:${x.linea}\t${x.expr}`);

if (args.has('--seco')) {
  console.log(`seco: ${total} mensajes (${totalServidor} servidor, ${totalPantalla} pantalla), ${totalOmitidos} omitidos, ${sinTexto.be} + ${sinTexto.fe} sin texto fijo`);
  for (const [m, l] of omitidos) console.log(`  omitidos · ${m}: ${l.length}`);
  for (const s of secciones) console.log(`  ${s.g.titulo}: ${s.n}`);
} else {
  writeFileSync(path.join(ROOT, 'docs', 'referencia', 'mensajes-del-sistema.mdx'), mdx);
  console.log(`mensajes-del-sistema.mdx: ${total} mensajes (${totalServidor} del servidor, ${totalPantalla} de pantalla); omitidos ${totalOmitidos}; sin texto fijo ${sinTexto.be} (BE) + ${sinTexto.fe} (FE)`);
}
