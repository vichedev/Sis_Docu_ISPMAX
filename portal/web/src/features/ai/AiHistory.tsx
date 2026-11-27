/* Historial de conversaciones del asistente (solo las de la persona): buscar, abrir, renombrar y borrar. */
import { useEffect, useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, IconButton, Input, SkeletonRows, useToast } from '@/components/ui';
import { aiApi, type ConversationRow } from '@/lib/api.ai';
import { errText } from '@/lib/auth';
import { useDebounced } from '@/lib/hooks';
import { shortDate } from './aiModel';

export function AiHistory({ activeId, onOpen, onDeleted, onCleared }: { activeId: number | null; onOpen: (id: number) => void; onDeleted: (id: number) => void; onCleared: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);
  const [items, setItems] = useState<ConversationRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [rename, setRename] = useState<{ id: number; title: string } | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError('');
    aiApi.conversations({ q: dq, limit: 50 }).then((r) => { if (alive) { setItems(r.items); setTotal(r.total); } }).catch((e: unknown) => { if (alive) setError(errText(e)); });
    return () => { alive = false; };
  }, [dq, tick]);

  const doRename = async () => {
    if (!rename || !rename.title.trim()) return;
    try { await aiApi.renameConversation(rename.id, rename.title.trim()); setRename(null); setTick((t) => t + 1); } catch (e) { toast(errText(e), 'error'); }
  };
  const remove = async (c: ConversationRow) => {
    try { await aiApi.deleteConversation(c.id); onDeleted(c.id); setTick((t) => t + 1); toast('Conversación borrada'); } catch (e) { toast(errText(e), 'error'); }
  };
  const clear = async () => {
    setConfirmAll(false);
    try { const r = await aiApi.clearHistory(); onCleared(); setTick((t) => t + 1); toast(`Historial borrado (${r.deleted})`); } catch (e) { toast(errText(e), 'error'); }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="ai-history">
      <div className="relative border-b border-line p-3">
        <Search size={14} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input aria-label="Buscar en el historial" placeholder="Buscar en tus conversaciones" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error ? <p role="alert" className="m-0 text-sm text-danger">{error}</p>
          : items === null ? <SkeletonRows rows={4} cols={1} />
          : !items.length ? <EmptyState compact title={dq ? 'Nada coincide' : 'Aún no hay conversaciones'}>{dq ? 'Prueba con otras palabras.' : 'Lo que converses con el asistente se guarda aquí, solo para ti.'}</EmptyState>
          : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {items.map((c) => (
                <li key={c.id} className={`group flex items-start gap-1 rounded-md border px-2.5 py-2 ${c.id === activeId ? 'border-accent-line bg-accent-soft' : 'border-line bg-raised hover:bg-subtle'}`}>
                  {rename?.id === c.id ? (
                    <form className="flex min-w-0 flex-1 items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); void doRename(); }}>
                      <Input aria-label="Nuevo título" value={rename.title} maxLength={120} autoFocus onChange={(e) => setRename({ id: c.id, title: e.target.value })} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setRename(null); } }} />
                      <Button size="sm" type="submit" variant="primary">Guardar</Button>
                    </form>
                  ) : (
                    <>
                      <button type="button" className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left" onClick={() => onOpen(c.id)}>
                        <span className="block truncate text-[13.5px] font-medium text-ink">{c.title || 'Conversación'}</span>
                        <span className="block truncate text-xs text-ink-3">{shortDate(c.updated_at)} · {c.messages} {c.messages === 1 ? 'mensaje' : 'mensajes'}{c.page_title ? ` · ${c.page_title}` : ''}</span>
                      </button>
                      <IconButton size="icon-sm" label="Renombrar" icon={<Pencil size={14} />} onClick={() => setRename({ id: c.id, title: c.title })} />
                      <IconButton size="icon-sm" label="Borrar conversación" icon={<Trash2 size={14} />} onClick={() => void remove(c)} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>
      <div className="flex items-center gap-2 border-t border-line bg-subtle px-3 py-2 text-xs text-ink-3">
        <span className="flex-1">{total} {total === 1 ? 'conversación' : 'conversaciones'} · solo las ves tú · se borran solas con el tiempo</span>
        <Button size="sm" variant="danger-ghost" disabled={!total} onClick={() => setConfirmAll(true)}><Trash2 size={13} /> Borrar historial</Button>
      </div>
      <ConfirmDialog open={confirmAll} onOpenChange={setConfirmAll} danger confirmLabel="Borrar historial" title="Borrar todo tu historial" onConfirm={clear}>
        Se borran <b>todas tus conversaciones</b> con el asistente. No afecta a las páginas que se crearon o cambiaron a partir de ellas.
      </ConfirmDialog>
    </div>
  );
}
