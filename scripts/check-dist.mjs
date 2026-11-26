#!/usr/bin/env node
/**
 * check-dist — recorre el sitio ya construido (`dist/`) y falla si hay enlaces, imágenes, scripts o anclas
 * locales que no existen. Atrapa lo que `docs-check` no ve en el HTML final (p. ej. un enlace a una carpeta
 * sin barra final que Rspress convierte en `/carpeta.html`).
 *
 *   npm run build && node scripts/check-dist.mjs [dist]
 */
import fs from 'node:fs'; import path from 'node:path';
// Carpeta: argumento, ISPMAX_DIST_DIR (contenido materializado, ver scripts/manual-corpus.mjs) o dist/.
const D = path.resolve(process.argv[2] || process.env.ISPMAX_DIST_DIR || 'dist');
const walk = d => fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(D); const htmls = files.filter(f => f.endsWith('.html'));
const exists = new Set(files.map(f => '/' + path.relative(D, f).split(path.sep).join('/')));
const idsOf = new Map(); const pageKey = f => '/' + path.relative(D, f).split(path.sep).join('/');
for (const f of htmls) { const t = fs.readFileSync(f, 'utf8'); idsOf.set(pageKey(f), new Set([...t.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))); }
const resolveUrl = (u, from) => { let p = u.split('#')[0].split('?')[0]; if (!p) return from; if (!p.startsWith('/')) p = path.posix.join(path.posix.dirname(from), p); p = decodeURIComponent(p);
  for (const c of [p, p.replace(/\/$/, '') + '.html', p.replace(/\/$/, '') + '/index.html']) if (exists.has(c)) return c; return null; };
let bad = [], badHash = [], ext = new Set(), n = 0;
for (const f of htmls) { const from = pageKey(f); const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/(?:href|src)="([^"]+)"/g)) { const u = m[1].replace(/&amp;/g, '&'); n++;
    if (/^(https?:)?\/\//.test(u)) { ext.add(u.replace(/^\/\//, 'https://')); continue; }
    if (/^(mailto:|tel:|data:|javascript:)/.test(u) || u.startsWith('#')) { if (u.startsWith('#') && u.length > 1 && !idsOf.get(from)?.has(decodeURIComponent(u.slice(1)))) badHash.push(`${from} ${u}`); continue; }
    const r = resolveUrl(u, from); if (!r) { bad.push(`${from} -> ${u}`); continue; }
    const h = u.split('#')[1]; if (h && r.endsWith('.html') && idsOf.has(r) && !idsOf.get(r).has(decodeURIComponent(h))) badHash.push(`${from} -> ${u}`); } }
console.log(`html ${htmls.length} · enlaces/recursos locales revisados ${n} · rotos ${bad.length} · anclas rotas ${badHash.length} · hosts externos ${new Set([...ext].map(u => new URL(u).host)).size}`);
bad.slice(0, 15).forEach(x => console.log('ROTO', x)); badHash.slice(0, 15).forEach(x => console.log('ANCLA', x));
console.log('hosts externos:', [...new Set([...ext].map(u => new URL(u).host))].join(', '));
if (bad.length || badHash.length) process.exit(1);
