/*
 * Markdown en línea del manual → árbol de nodos (puro), para pintar el texto en el lienzo sin HTML crudo.
 * Cubre lo que usan las páginas: **negrita**, *cursiva* o _cursiva_, `código`, [enlace](/ruta), escapes \x,
 * <br/>, componentes y etiquetas en línea (<Badge tone="ok">Activo</Badge>, <kbd>Ctrl</kbd>) y saltos de línea.
 * Lo que no encaja queda como texto: nunca se pierde nada al mostrarlo.
 */
export type InlineNode =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: InlineNode[] }
  | { t: 'em'; c: InlineNode[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: InlineNode[] }
  | { t: 'br' }
  | { t: 'tag'; name: string; attrs: Record<string, string>; c: InlineNode[] };

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!<>|~"']/;

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"?([^}"]*)"?\s*\})/g)) out[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}

function push(out: InlineNode[], v: string) {
  if (!v) return;
  const last = out[out.length - 1];
  if (last && last.t === 'text') last.v += v;
  else out.push({ t: 'text', v });
}

/** Busca el cierre `mark` desde `from` que no esté escapado ni dentro de `código`. */
function findClose(s: string, from: number, mark: string): number {
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') { i++; continue; }
    if (c === '`') { const j = s.indexOf('`', i + 1); if (j < 0) return -1; i = j; continue; }
    if (s.startsWith(mark, i)) {
      if (mark === '*' && s[i + 1] === '*') { i++; continue; }
      return i;
    }
  }
  return -1;
}

export function tokenizeInline(src: string, depth = 0): InlineNode[] {
  const s = src.replace(/\r\n/g, '\n');
  const out: InlineNode[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const rest = s.slice(i);
    if (c === '\\' && i + 1 < s.length && ESCAPABLE.test(s[i + 1])) { push(out, s[i + 1]); i += 2; continue; }
    if (c === '\n') { push(out, ' '); i++; continue; }
    if (c === '`') {
      const ticks = /^`+/.exec(rest)![0];
      const j = s.indexOf(ticks, i + ticks.length);
      if (j > 0) { out.push({ t: 'code', v: s.slice(i + ticks.length, j).trim() || s.slice(i + ticks.length, j) }); i = j + ticks.length; continue; }
      push(out, ticks); i += ticks.length; continue;
    }
    if (depth < 6 && (rest.startsWith('**') || rest.startsWith('__'))) {
      const mark = rest.slice(0, 2);
      const j = findClose(s, i + 2, mark);
      if (j > i + 2) { out.push({ t: 'strong', c: tokenizeInline(s.slice(i + 2, j), depth + 1) }); i = j + 2; continue; }
    }
    if (depth < 6 && (c === '*' || (c === '_' && !/\w/.test(s[i - 1] ?? ''))) && s[i + 1] && !/\s/.test(s[i + 1])) {
      const j = findClose(s, i + 1, c);
      if (j > i + 1 && !/\s/.test(s[j - 1]) && (c === '*' || !/\w/.test(s[j + 1] ?? ''))) {
        out.push({ t: 'em', c: tokenizeInline(s.slice(i + 1, j), depth + 1) }); i = j + 1; continue;
      }
    }
    if (c === '[' && depth < 6) {
      const m = /^\[((?:\\.|[^\]\\])*)\]\(\s*([^)\s]*)(?:\s+"[^"]*")?\s*\)/.exec(rest);
      if (m) { out.push({ t: 'link', href: m[2], c: tokenizeInline(m[1], depth + 1) }); i += m[0].length; continue; }
    }
    if (c === '<') {
      const br = /^<br\s*\/?>/i.exec(rest);
      if (br) { out.push({ t: 'br' }); i += br[0].length; continue; }
      const self = /^<([A-Za-z][\w.]*)((?:\s+[^<>]*?)?)\s*\/>/.exec(rest);
      if (self) { out.push({ t: 'tag', name: self[1], attrs: parseAttrs(self[2]), c: [] }); i += self[0].length; continue; }
      const open = /^<([A-Za-z][\w.]*)((?:\s+[^<>]*?)?)>/.exec(rest);
      if (open && depth < 6) {
        const close = `</${open[1]}>`;
        const j = s.indexOf(close, i + open[0].length);
        if (j >= 0) {
          out.push({ t: 'tag', name: open[1], attrs: parseAttrs(open[2]), c: tokenizeInline(s.slice(i + open[0].length, j), depth + 1) });
          i = j + close.length; continue;
        }
      }
    }
    push(out, c);
    i++;
  }
  return out;
}

/** Texto plano de un árbol (para nombres accesibles y comparaciones). */
export function inlineText(nodes: readonly InlineNode[]): string {
  return nodes.map((n) => (n.t === 'text' || n.t === 'code' ? n.v : n.t === 'br' ? ' ' : n.t === 'tag' && !n.c.length ? '' : 'c' in n ? inlineText(n.c) : '')).join('');
}
