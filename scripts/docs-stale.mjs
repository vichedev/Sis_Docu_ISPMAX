#!/usr/bin/env node
/**
 * docs-stale — detecta documentación potencialmente obsoleta contra el código del producto.
 *
 *   node scripts/docs-stale.mjs --record     # guarda los hashes de los archivos de `codigo:` en docs/_trace.json
 *   node scripts/docs-stale.mjs              # compara con lo registrado y con las rutas actuales de la app
 *   node scripts/docs-stale.mjs --fail       # exit 1 si hay sospechas (para CI/cron con acceso al código)
 *
 * Qué comprueba:
 *   1. CÓDIGO CAMBIADO: algún archivo listado en `codigo:` (FE:/BE:) tiene un hash distinto al registrado
 *      al verificar la página → la página puede estar desactualizada.
 *   2. ARCHIVO AUSENTE: un archivo de `codigo:` ya no existe (renombrado o eliminado).
 *   3. RUTA INEXISTENTE: una ruta de `rutas:` (o escrita entre comillas invertidas en el texto) ya no
 *      coincide con ninguna ruta de `router/routes.ts`.
 *   4. RUTA SIN DOCUMENTAR: ruta de la app que ninguna página declara en `rutas:` (se omiten las rutas
 *      que `notes/exclusiones.md` cita entre comillas invertidas: excluidas del manual por decisión).
 *   5. VERIFICACIÓN ANTIGUA: `verificado.fecha` con más de --days días (def. 180).
 *
 * Variables:
 *   ISPMAX_FE_SRC  carpeta `src` del frontend (def. la primera que exista: ~/Downloads/ispmax, ~/Repositorios/frontend-isp)
 *   ISPMAX_BE_SRC  carpeta `src` del backend  (def. la primera que exista: ~/Downloads/ispmax, ~/Repositorios/backend-isp)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT, DOCS, loadPages, asList } from './lib/manual.mjs';
import { FE_SRC, BE_SRC } from './lib/manual.mjs';

const args = process.argv.slice(2);
const FE = FE_SRC;
const BE = BE_SRC;
const DAYS = args.includes('--days') ? Number(args[args.indexOf('--days') + 1]) : 180;
const TRACE = path.join(DOCS, '_trace.json');

if (!existsSync(FE) || !existsSync(BE)) {
  console.error(`Código fuente no disponible (ISPMAX_FE_SRC=${FE}, ISPMAX_BE_SRC=${BE}). Nada que comprobar.`);
  process.exit(args.includes('--fail') ? 2 : 0);
}

const hashFile = f => createHash('sha256').update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);
const resolveCode = ref => {
  const m = ref.match(/^(FE|BE):(.+?)(?::\d+(?:-\d+)?)?$/);
  if (!m) return null;
  return { key: `${m[1]}:${m[2]}`, file: path.join(m[1] === 'FE' ? FE : BE, m[2]) };
};

const pages = loadPages();

// ── rutas del frontend ───────────────────────────────────────────────
const routesSrc = readFileSync(path.join(FE, 'router', 'routes.ts'), 'utf8');
const appRoutes = [...routesSrc.matchAll(/path:\s*['"`]([^'"`]*)['"`]\s*,\s*name:\s*['"`]([^'"`]+)['"`]/g)]
  .map(m => {
    const ruta = '/' + m[1].replace(/^\//, '');
    // Las rutas del portal del cliente son hijas de `/portal` en routes.ts (path relativo): se les antepone el prefijo.
    return { path: m[2].startsWith('portal.') && !ruta.startsWith('/portal') ? '/portal' + (ruta === '/' ? '' : ruta) : ruta, name: m[2] };
  })
  .filter(r => r.path !== '/:catchAll(.*)*');
const toRegex = p =>
  new RegExp('^' + p.replace(/\/:[A-Za-z_]+\?/g, '(?:/[^/]+)?').replace(/:[A-Za-z_]+/g, '[^/]+').replace(/\/$/, '') + '/?$');
const matchers = appRoutes.map(r => ({ ...r, re: toRegex(r.path === '/' ? '/' : r.path) }));
const routeExists = p => matchers.some(m => m.re.test(p.replace(/\/$/, '') || '/'));

// ── --record ─────────────────────────────────────────────────────────
if (args.includes('--record')) {
  const trace = { generado: new Date().toISOString(), paginas: {} };
  let files = 0;
  for (const p of pages) {
    const refs = asList(p.fm.codigo).map(resolveCode).filter(Boolean);
    if (!refs.length) continue;
    trace.paginas[p.route] = {};
    for (const r of refs) {
      if (existsSync(r.file)) {
        trace.paginas[p.route][r.key] = hashFile(r.file);
        files++;
      } else trace.paginas[p.route][r.key] = null;
    }
  }
  writeFileSync(TRACE, JSON.stringify(trace, null, 2));
  console.log(`Registrados ${files} archivos de código en ${Object.keys(trace.paginas).length} páginas → docs/_trace.json`);
  process.exit(0);
}

// ── comprobación ─────────────────────────────────────────────────────
const trace = existsSync(TRACE) ? JSON.parse(readFileSync(TRACE, 'utf8')) : { paginas: {} };
const findings = [];
const add = (kind, route, msg) => findings.push({ kind, route, msg });
const documentedRoutes = new Set();

for (const p of pages) {
  if (p.route === '/') continue;

  for (const r of asList(p.fm.codigo)) {
    const c = resolveCode(r);
    if (!c) continue;
    if (!existsSync(c.file)) {
      add('archivo-ausente', p.route, `${c.key} ya no existe`);
      continue;
    }
    const prev = trace.paginas?.[p.route]?.[c.key];
    if (prev && prev !== hashFile(c.file)) add('codigo-cambiado', p.route, `${c.key} cambió desde la verificación`);
    if (prev === undefined) add('sin-registro', p.route, `${c.key} no tiene hash registrado (ejecute --record tras verificar)`);
  }

  const declared = asList(p.fm.rutas);
  // En las páginas de servicios externos las rutas entre comillas invertidas son de otros sistemas (MikroTik, SmartOLT, Dátil…): solo cuentan las declaradas en `rutas`.
  const inText = p.fm.modulo === 'servicios-externos' ? [] : [...p.body.matchAll(/`(\/[a-zA-Z0-9\-_/:]+)`/g)].map(m => m[1]).filter(x => x.length > 2 && !x.startsWith('/api') && !x.startsWith('/assets'));
  for (const r of new Set([...declared, ...inText])) {
    if (!routeExists(r)) add('ruta-inexistente', p.route, `La ruta ${r} no existe en router/routes.ts`);
    else documentedRoutes.add(r);
  }
  for (const r of declared) documentedRoutes.add(r);

  const f = p.fm.verificado?.fecha;
  if (f) {
    const days = (Date.now() - new Date(f).getTime()) / 86400000;
    if (days > DAYS) add('verificacion-antigua', p.route, `Verificada hace ${Math.round(days)} días (${f})`);
  }
}

// rutas excluidas por decisión: las que `notes/exclusiones.md` cita entre comillas invertidas
const exclFile = path.join(ROOT, 'notes', 'exclusiones.md');
const excludedRoutes = existsSync(exclFile)
  ? [...readFileSync(exclFile, 'utf8').matchAll(/`(\/[a-zA-Z0-9\-_/:]+)`/g)].map(m => m[1])
  : [];

// rutas de la app sin documentar
const undocumented = matchers.filter(
  m =>
    ![...documentedRoutes].some(r => m.re.test(r.replace(/\/$/, '') || '/')) &&
    !excludedRoutes.some(r => m.re.test(r.replace(/\/$/, '') || '/')),
);
for (const m of undocumented) add('ruta-sin-documentar', '(app)', `${m.path} · ${m.name}`);

const order = ['archivo-ausente', 'ruta-inexistente', 'codigo-cambiado', 'verificacion-antigua', 'ruta-sin-documentar', 'sin-registro'];
findings.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.route.localeCompare(b.route));

mkdirSync(path.join(ROOT, 'notes', '_generated'), { recursive: true });
const md = `# Documentación potencialmente obsoleta

> Generado por \`scripts/docs-stale.mjs\` el ${new Date().toISOString().slice(0, 10)} contra FE=\`${FE}\` y BE=\`${BE}\`.

| Tipo | Cantidad |
|---|---:|
${order.map(k => `| ${k} | ${findings.filter(f => f.kind === k).length} |`).join('\n')}

${order
  .map(k => {
    const l = findings.filter(f => f.kind === k);
    return l.length ? `## ${k}\n\n${l.map(f => `- \`${f.route}\` — ${f.msg}`).join('\n')}\n` : '';
  })
  .join('\n')}`;
writeFileSync(path.join(ROOT, 'notes', '_generated', 'stale.md'), md);

const actionable = findings.filter(f => !['sin-registro', 'ruta-sin-documentar'].includes(f.kind));
console.log(`Rutas de la app: ${appRoutes.length} · sin documentar: ${undocumented.length} · sospechas accionables: ${actionable.length}`);
for (const f of actionable.slice(0, 40)) console.log(`  [${f.kind}] ${f.route} — ${f.msg}`);
if (args.includes('--fail') && actionable.length) process.exit(1);
