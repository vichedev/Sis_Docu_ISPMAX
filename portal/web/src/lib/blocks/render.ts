/*
 * Regeneración de un bloque desde sus campos, con la sintaxis que usan las páginas del manual.
 * Produce texto con `\n`; el serializador lo pasa al fin de línea del documento.
 */
import type { Block, CardItem, ImageData, ListBlock, StepItem } from './types.ts';
import { escapeMdxText, numAttr, strAttr, toLf } from './util.ts';

const oneLine = (s: string): string => toLf(s).replace(/\s*\n\s*/g, ' ').trim();
const md = (s: string): string => escapeMdxText(toLf(s).replace(/^\n+|\n+$/g, ''));

/** Contenido de un contenedor JSX con líneas en blanco por dentro (como `<Step>` y `<Card>` del manual). */
function wrap(open: string, close: string, content: string): string {
  return content ? `${open}\n\n${content}\n\n${close}` : `${open}\n${close}`;
}

export function renderFigure(img: ImageData): string {
  let a = strAttr('src', img.src);
  if (img.alt) a += strAttr('alt', oneLine(img.alt));
  if (img.caption) a += strAttr('caption', oneLine(img.caption));
  if (img.width != null && Number.isFinite(img.width)) a += numAttr('width', img.width);
  if (img.height != null && Number.isFinite(img.height)) a += numAttr('height', img.height);
  if (img.max) a += strAttr('max', img.max.trim());
  if (img.variant) a += strAttr('variant', img.variant.trim());
  return `<Figure${a} />`;
}

function renderStep(s: StepItem): string {
  const title = oneLine(s.title);
  const parts = [title ? `**${escapeMdxText(title)}**` : '', md(s.md)].filter(Boolean);
  return wrap('<Step>', '</Step>', parts.join('\n\n'));
}

function renderCard(c: CardItem): string {
  let a = '';
  if (c.icon) a += strAttr('icon', oneLine(c.icon));
  if (c.title) a += strAttr('title', oneLine(c.title));
  if (c.href) a += strAttr('href', c.href.trim());
  return wrap(`<Card${a}>`, '</Card>', md(c.md));
}

function renderList(b: ListBlock): string {
  const items = b.items.length ? b.items : [''];
  return items
    .map((item, i) => {
      const marker = b.ordered ? `${b.start + i}${b.marker === ')' ? ')' : '.'}` : b.marker === '*' || b.marker === '+' ? b.marker : '-';
      const pad = ' '.repeat(marker.length + 1);
      const lines = md(item).split('\n');
      return lines.map((l, j) => (j === 0 ? (l ? `${marker} ${l}` : marker) : l ? pad + l : '')).join('\n');
    })
    .join(b.loose ? '\n\n' : '\n');
}

function fenceFor(code: string): string {
  let len = 3;
  for (const m of code.matchAll(/^\s*(`{3,})/gm)) len = Math.max(len, m[1].length + 1);
  return '`'.repeat(len);
}

/** MDX de un bloque a partir de sus campos (ignora `raw`). */
export function renderBlock(b: Block): string {
  switch (b.type) {
    case 'heading':
      return `${'#'.repeat(Math.min(6, Math.max(1, b.level)))} ${escapeMdxText(oneLine(b.text))}`;
    case 'paragraph':
      return md(b.md);
    case 'list':
      return renderList(b);
    case 'image':
      return renderFigure(b);
    case 'imageRow': {
      const tag = b.kind === 'grid' ? 'FigGrid' : 'FigRow';
      return [`<${tag}>`, ...b.images.map(renderFigure), `</${tag}>`].join('\n');
    }
    case 'steps':
      return ['<Steps>', ...b.steps.map(renderStep), '</Steps>'].join('\n');
    case 'callout': {
      const title = oneLine(b.title);
      const body = md(b.md);
      const open = `:::${b.kind}${title ? ` ${escapeMdxText(title)}` : ''}`;
      if (!body) return `${open}\n:::`;
      return b.padded ? `${open}\n\n${body}\n\n:::` : `${open}\n${body}\n:::`;
    }
    case 'cards':
      return [`<Cards${b.columns != null ? numAttr('columns', b.columns) : ''}>`, ...b.cards.map(renderCard), '</Cards>'].join('\n');
    case 'table':
      return md(b.md);
    case 'code': {
      const code = toLf(b.code).replace(/\n$/, '');
      const fence = fenceFor(code);
      const info = [b.lang.trim(), b.meta.trim()].filter(Boolean).join(' ');
      return `${fence}${info}\n${code ? `${code}\n` : ''}${fence}`;
    }
    case 'kicker':
      return `<Kicker>${escapeMdxText(oneLine(b.text))}</Kicker>`;
    case 'lead':
      return `<Lead>${escapeMdxText(oneLine(b.text))}</Lead>`;
    case 'divider':
      return '---';
    case 'tour':
      return `<Tour${strAttr('id', b.slug.trim())} />`;
    case 'searchTerms':
      return `<SearchTerms${strAttr('terms', oneLine(b.terms))} />`;
    case 'raw':
      return toLf(b.code);
  }
}
