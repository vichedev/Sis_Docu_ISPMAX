/**
 * Metadatos INTERNOS del frontmatter (trazabilidad con el código de ISPMAX): no deben llegar al sitio público.
 * Rspress empaqueta el frontmatter de cada página en su fragmento de JavaScript y en su índice de búsqueda.
 * Este módulo lo usan el loader (`stripFrontmatterLoader.cjs`) y los ganchos de `rspress.config.ts`.
 */
const INTERNAL_KEYS = new Set(['codigo', 'funcionalidades', 'sinonimos', 'rutas', 'permisos', 'roles']);

/** Quita del texto de un .mdx las claves internas del frontmatter (y `verificado.metodo`/`verificado.version`), sin tocar el cuerpo. */
function stripFrontmatterSource(src) {
  const m = /^(﻿?---[ \t]*\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/.exec(src);
  if (!m) return src;
  const eol = m[1].includes('\r\n') ? '\r\n' : '\n';
  const out = [];
  let skipping = false;
  let inVerificado = false;
  for (const line of m[2].split(/\r?\n/)) {
    const top = /^([A-Za-z_][\w-]*):/.exec(line);
    if (top) {
      skipping = INTERNAL_KEYS.has(top[1]);
      inVerificado = top[1] === 'verificado';
      if (!skipping) out.push(line);
      continue;
    }
    if (skipping) continue; // continuación (lista con guiones o bloque indentado) de una clave descartada
    if (inVerificado && /^\s+(metodo|version):/.test(line)) continue;
    out.push(line);
  }
  return m[1] + out.join(eol) + m[3] + src.slice(m[0].length);
}

module.exports = { INTERNAL_KEYS, stripFrontmatterSource };
