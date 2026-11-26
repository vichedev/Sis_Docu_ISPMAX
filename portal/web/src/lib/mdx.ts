/*
 * Vista previa aproximada del MDX del manual (sin compilar MDX).
 * Cubre lo que usan las páginas: títulos, párrafos, listas, tablas, código, enlaces,
 * avisos `:::tipo Título`, <Lead>, <Steps>/<Step>, <Figure> y <Tour>. Lo demás se muestra
 * como marcador. Todo el texto se escapa antes de dar formato: el HTML resultante es seguro.
 */
import { api } from './api';
import { siteHref } from './siteHref';

/* Clases Tailwind de los bloques propios del manual (el resto lo estiliza <Prose>). */
const C = {
  callout: 'mb-4 rounded-r-md border-l-[3px] bg-subtle px-3.5 py-2.5 text-[14px]',
  calloutKind: { tip: 'border-accent', warning: 'border-warn-dot', danger: 'border-danger', info: 'border-ink-4' } as Record<string, string>,
  calloutTitle: 'mb-1 font-semibold',
  steps: '!list-none !pl-0 [counter-reset:st]',
  step: 'relative mb-3 pl-9 [counter-increment:st] before:absolute before:left-0 before:top-0.5 before:grid before:size-6 before:place-items-center before:rounded-full before:border before:border-line-strong before:bg-bg before:text-xs before:font-semibold before:text-ink-2 before:content-[counter(st)]',
  lead: 'text-[17px] text-ink-2',
  figure: 'mb-4',
  img: 'block h-auto max-w-full rounded-md border border-line',
  caption: 'mt-1.5 text-sm text-ink-3',
  component: 'mb-3 inline-block rounded-sm border border-dashed border-line-strong px-2 py-1 font-mono text-xs text-ink-3',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeHref = (h: string) => {
  const t = h.trim();
  if (t.startsWith('/') && !t.startsWith('//')) return siteHref(t);
  if (/^(https?:|mailto:|#)/i.test(t)) return t;
  return '#';
};
const attr = (src: string, name: string) => new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|\\{\\s*(\\d+)\\s*\\}|'([^']*)')`).exec(src)?.slice(1).find((x) => x != null) ?? '';

function inline(raw: string): string {
  const codes: string[] = [];
  let s = raw.replace(/`([^`]+)`/g, (_, c: string) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/&lt;\/?[A-Z][A-Za-z]*(?:\s[^&]*?)?\/?&gt;/g, '');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t: string, h: string) => `<a href="${esc(safeHref(h.replace(/&amp;/g, '&')))}" target="_blank" rel="noreferrer">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${esc(codes[Number(i)])}</code>`);
}

const KIND_LABEL: Record<string, string> = { tip: 'Nota', info: 'Información', warning: 'Importante', danger: 'Advertencia', note: 'Nota', caution: 'Precaución' };

function collectUntil(lines: string[], i: number, open: RegExp, close: RegExp): [string[], number] {
  let depth = 1; const out: string[] = []; i++;
  for (; i < lines.length; i++) {
    if (open.test(lines[i])) depth++;
    else if (close.test(lines[i])) { depth--; if (depth === 0) break; }
    out.push(lines[i]);
  }
  return [out, i + 1];
}

function blocks(lines: string[]): string {
  let html = '';
  let i = 0;
  const isBlockStart = (l: string) => /^(#{1,6}\s|```|:::|<[A-Z]|\s*([-*]|\d+\.)\s|\||>\s?)/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m: RegExpExecArray | null;
    if (l.startsWith('```')) {
      const code: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++; html += `<pre><code>${esc(code.join('\n'))}</code></pre>`; continue;
    }
    if ((m = /^:::\s*(\w+)\s*(.*)$/.exec(l))) {
      const [inner, ni] = collectUntil(lines, i, /^:::\s*\w+/, /^:::\s*$/);
      const kind = m[1].toLowerCase();
      html += `<div class="${C.callout} ${C.calloutKind[kind] ?? C.calloutKind.info}"><p class="${C.calloutTitle}">${inline(m[2] || KIND_LABEL[kind] || kind)}</p>${blocks(inner)}</div>`;
      i = ni; continue;
    }
    if (/^<Steps>/.test(l.trim())) {
      const [inner, ni] = collectUntil(lines, i, /^<Steps>/, /^<\/Steps>/);
      const items: string[][] = []; let cur: string[] | null = null;
      for (const x of inner) {
        if (/^<Step>/.test(x.trim())) { cur = []; continue; }
        if (/^<\/Step>/.test(x.trim())) { if (cur) items.push(cur); cur = null; continue; }
        if (cur) cur.push(x);
      }
      html += `<ol class="${C.steps}">${items.map((it) => `<li class="${C.step}">${blocks(it)}</li>`).join('')}</ol>`;
      i = ni; continue;
    }
    if (/^<Lead>/.test(l.trim())) {
      const buf: string[] = [];
      for (; i < lines.length; i++) { buf.push(lines[i]); if (/<\/Lead>/.test(lines[i])) { i++; break; } }
      html += `<p class="${C.lead}">${inline(buf.join(' ').replace(/<\/?Lead>/g, ''))}</p>`; continue;
    }
    if (/^<(Figure|img)\b/.test(l.trim())) {
      const buf: string[] = [];
      for (; i < lines.length; i++) { buf.push(lines[i]); if (/\/>|<\/Figure>/.test(lines[i])) { i++; break; } }
      const tag = buf.join(' ');
      const src = attr(tag, 'src').replace(/^\/?(assets\/)?/, '');
      const alt = attr(tag, 'alt');
      const cap = attr(tag, 'caption');
      html += `<figure class="${C.figure}"><img class="${C.img}" src="${esc(api.assetUrl(src))}" alt="${esc(alt)}" loading="lazy" />${cap ? `<figcaption class="${C.caption}">${inline(cap)}</figcaption>` : ''}</figure>`;
      continue;
    }
    if ((m = /^<Tour\b[^>]*id="([^"]*)"/.exec(l.trim()))) { html += `<div class="${C.component}">Tour interactivo «${esc(m[1])}»</div>`; i++; continue; }
    if ((m = /^<\/?([A-Z][A-Za-z]*)/.exec(l.trim()))) {
      if (!l.trim().startsWith('</')) html += `<div class="${C.component}">Componente &lt;${esc(m[1])}&gt;</div>`;
      i++; continue;
    }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { const n = Math.min(6, m[1].length + 0); html += `<h${n}>${inline(m[2])}</h${n}>`; i++; continue; }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordered = /^\s*\d+\./.test(l); const items: string[] = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.)\s|^\s{2,}\S/.test(lines[i]); i++) {
        if (/^\s*([-*]|\d+\.)\s/.test(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
      }
      html += `<${ordered ? 'ol' : 'ul'}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`; continue;
    }
    if (l.trim().startsWith('|')) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i].trim().startsWith('|'); i++) {
        if (/^\|?\s*:?-{2,}/.test(lines[i].trim().replace(/^\|/, ''))) continue;
        rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      }
      const [head, ...body] = rows;
      html += `<table><thead><tr>${(head ?? []).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      continue;
    }
    if (/^>\s?/.test(l)) {
      const buf: string[] = [];
      for (; i < lines.length && /^>\s?/.test(lines[i]); i++) buf.push(lines[i].replace(/^>\s?/, ''));
      html += `<blockquote>${blocks(buf)}</blockquote>`; continue;
    }
    const buf: string[] = [];
    for (; i < lines.length && lines[i].trim() && !(buf.length && isBlockStart(lines[i])); i++) buf.push(lines[i]);
    if (!buf.length) { buf.push(lines[i]); i++; }
    html += `<p>${inline(buf.join(' '))}</p>`;
  }
  return html;
}

export function renderPreview(mdx: string): string {
  const src = mdx.replace(/\r\n/g, '\n').replace(/^import\s.*$/gm, '').replace(/^export\s.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  return blocks(src.split('\n'));
}

export interface OutlineItem { level: number; text: string; line: number }
/** Esquema de encabezados (## y ###) con su número de línea, ignorando bloques de código. */
export function outline(mdx: string): OutlineItem[] {
  const out: OutlineItem[] = [];
  let fence = false;
  mdx.split('\n').forEach((l, i) => {
    if (l.startsWith('```')) fence = !fence;
    const m = !fence && /^(#{2,3})\s+(.+?)\s*$/.exec(l);
    if (m) out.push({ level: m[1].length, text: m[2].replace(/[*`]/g, ''), line: i + 1 });
  });
  return out;
}
