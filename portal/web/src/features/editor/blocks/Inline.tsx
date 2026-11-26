/* Pinta Markdown en línea (negrita, cursiva, código, enlaces, <Badge>…) como elementos React, sin HTML crudo. */
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { siteHref } from '@/lib/siteHref';
import { tokenizeInline, type InlineNode } from '../model/inline';

const BADGE: Record<string, string> = {
  ok: 'border-ok/40 bg-ok-soft text-ok', success: 'border-ok/40 bg-ok-soft text-ok',
  warn: 'border-warn-dot/40 bg-warn-soft text-warn', warning: 'border-warn-dot/40 bg-warn-soft text-warn',
  danger: 'border-danger/40 bg-danger-soft text-danger', error: 'border-danger/40 bg-danger-soft text-danger',
  info: 'border-accent-line bg-accent-soft text-accent-ink',
};

const href = (h: string) => (h.startsWith('/') && !h.startsWith('//') ? siteHref(h) : /^(https?:|mailto:|#)/i.test(h) ? h : '#');

function render(nodes: InlineNode[], live: boolean): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text': return <Fragment key={i}>{n.v}</Fragment>;
      case 'strong': return <strong key={i} className="font-semibold text-ink">{render(n.c, live)}</strong>;
      case 'em': return <em key={i}>{render(n.c, live)}</em>;
      case 'code': return <code key={i} className="rounded-sm border border-line bg-subtle px-1 py-px font-mono text-[0.86em] text-ink">{n.v}</code>;
      case 'br': return <br key={i} />;
      case 'link': return live
        ? <a key={i} href={href(n.href)} target="_blank" rel="noreferrer" className="font-medium">{render(n.c, live)}</a>
        : <span key={i} title={n.href} className="font-medium text-accent-ink underline decoration-accent-line underline-offset-2">{render(n.c, live)}</span>;
      case 'tag': {
        const name = n.name.toLowerCase();
        if (n.name === 'Badge') return <span key={i} className={cn('mx-0.5 inline-flex items-center rounded-sm border px-1.5 align-[1px] text-[0.8em] font-medium leading-[1.5]', BADGE[n.attrs.tone ?? n.attrs.type ?? ''] ?? 'border-line-strong bg-subtle text-ink-2')}>{render(n.c, live) || n.attrs.text}</span>;
        if (name === 'kbd') return <kbd key={i} className="rounded-sm border border-line-strong border-b-2 bg-bg px-1 font-mono text-[0.82em] text-ink">{render(n.c, live)}</kbd>;
        if (name === 'strong' || name === 'b') return <strong key={i} className="font-semibold text-ink">{render(n.c, live)}</strong>;
        if (name === 'em' || name === 'i') return <em key={i}>{render(n.c, live)}</em>;
        if (name === 'code') return <code key={i} className="rounded-sm border border-line bg-subtle px-1 font-mono text-[0.86em] text-ink">{render(n.c, live)}</code>;
        if (n.c.length) return <span key={i}>{render(n.c, live)}</span>;
        return <span key={i} className="mx-0.5 rounded-sm border border-dashed border-line-strong px-1 font-mono text-[0.78em] text-ink-3">&lt;{n.name}&gt;</span>;
      }
    }
  });
}

/** Texto Markdown en línea. `live`: enlaces navegables (vista previa); si no, solo con aspecto de enlace. */
export function Inline({ md, live = false }: { md: string; live?: boolean }) {
  return <>{render(tokenizeInline(md), live)}</>;
}
