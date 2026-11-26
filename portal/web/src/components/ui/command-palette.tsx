/**
 * CommandPalette (Ctrl+K): salta a páginas del manual y lanza acciones.
 *   <CommandPalette open onOpenChange commands={[{ id, label, icon, run, keywords, hint }]} />
 *   Busca páginas en la API a partir de 2 letras; sin texto muestra acciones y páginas recientes.
 *   Patrón combobox + listbox (flechas, Intro, Esc) sobre un diálogo Radix.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Dialog as D } from 'radix-ui';
import { CornerDownLeft, FileText, Search } from 'lucide-react';
import { api, type PageRow } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { SECCIONES, go, recentPages } from '../../lib/util';
import { cn } from '../../lib/cn';
import { Kbd } from './feedback';

export interface Command { id: string; label: string; icon: ReactNode; run: () => void; hint?: ReactNode; keywords?: string; group?: string }
interface Item { id: string; group: string; label: string; sub?: string; icon: ReactNode; run: () => void; hint?: ReactNode }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function CommandPalette({ open, onOpenChange, commands }: { open: boolean; onOpenChange: (o: boolean) => void; commands: Command[] }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const dq = useDebounced(q.trim(), 200);
  const listRef = useRef<HTMLDivElement>(null);
  const lid = useId();
  useEffect(() => { if (!open) { setQ(''); setPages(null); } }, [open]);

  useEffect(() => {
    if (dq.length < 2) { setPages(null); return; }
    let alive = true;
    setLoading(true);
    api.pages({ q: dq, limit: 8 }).then((r) => { if (alive) setPages(r.items); }).catch(() => { if (alive) setPages([]); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [dq]);

  const items = useMemo<Item[]>(() => {
    const nq = norm(q.trim());
    const cmds = commands.filter((c) => !nq || norm(`${c.label} ${c.keywords ?? ''}`).includes(nq))
      .map((c) => ({ id: c.id, group: c.group ?? 'Acciones', label: c.label, icon: c.icon, run: c.run, hint: c.hint }));
    const pg: Item[] = nq.length < 2
      ? recentPages().slice(0, 5).map((p) => ({ id: `r${p.id}`, group: 'Abiertas hace poco', label: p.title, sub: p.route, icon: <FileText size={16} />, run: () => go(`/contenido/${p.id}`) }))
      : (pages ?? []).map((p) => ({ id: `p${p.id}`, group: 'Páginas', label: p.title, sub: `${SECCIONES[p.seccion] ?? p.seccion} · ${p.route}`, icon: <FileText size={16} />, run: () => go(`/contenido/${p.id}`) }));
    return nq.length >= 2 ? [...pg, ...cmds] : [...cmds, ...pg];
  }, [q, commands, pages]);

  useEffect(() => setActive(0), [q, pages]);
  useEffect(() => { listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const runAt = (i: number) => { const it = items[i]; if (!it) return; onOpenChange(false); it.run(); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); runAt(active); }
  };

  let last = '';
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[900] bg-scrim data-[state=open]:animate-fade" />
        <D.Content className="fixed left-1/2 top-[12vh] z-[901] w-[min(640px,calc(100%-16px))] -translate-x-1/2 overflow-hidden rounded-lg border border-line bg-raised shadow-pop focus:outline-none data-[state=open]:animate-fade max-sm:top-2">
          <D.Title className="sr-only">Buscar páginas y acciones</D.Title>
          <D.Description className="sr-only">Escriba para buscar; use las flechas y pulse Intro para abrir.</D.Description>
          <div className="flex h-[52px] items-center gap-2.5 border-b border-line px-3.5 text-ink-3">
            <Search size={18} aria-hidden="true" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
              placeholder="Buscar páginas o escribir una acción…" role="combobox" aria-expanded="true" aria-controls={lid} aria-autocomplete="list"
              aria-activedescendant={items[active] ? `${lid}-${active}` : undefined}
              className="h-full flex-1 border-0 bg-transparent text-[15px] text-ink outline-none focus-visible:outline-none" />
            <Kbd>Esc</Kbd>
          </div>
          <div ref={listRef} id={lid} role="listbox" aria-label="Resultados" className="max-h-[min(420px,55vh)] overflow-y-auto p-1.5">
            {items.length === 0 && !loading && <p className="px-3 py-5 text-center text-ink-3">{q.trim().length >= 2 ? `Nada coincide con «${q.trim()}».` : 'Escriba para buscar.'}</p>}
            {items.map((it, i) => {
              const head = it.group !== last ? <div role="presentation" className="px-2.5 pb-1 pt-2.5 text-[11.5px] font-medium text-ink-3">{it.group}</div> : null;
              last = it.group;
              return (
                <div key={it.id} role="presentation">
                  {head}
                  <div id={`${lid}-${i}`} data-i={i} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => runAt(i)}
                    className={cn('flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5', i === active && 'bg-muted')}>
                    <span className={cn('grid place-items-center text-ink-3', i === active && 'text-accent-ink')}>{it.icon}</span>
                    <span className="flex min-w-0 flex-1 flex-col"><span className="truncate">{it.label}</span>{it.sub && <small className="truncate font-mono text-[11.5px] text-ink-3">{it.sub}</small>}</span>
                    {it.hint && <span className="text-xs text-ink-3">{it.hint}</span>}
                    {i === active && <CornerDownLeft size={14} aria-hidden="true" className="text-ink-3" />}
                  </div>
                </div>
              );
            })}
            {loading && <p className="px-3 py-3 text-center text-ink-3">Buscando…</p>}
          </div>
          <div className="flex gap-4 border-t border-line bg-subtle px-3.5 py-2 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> moverse</span><span className="inline-flex items-center gap-1"><Kbd>Intro</Kbd> abrir</span>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
