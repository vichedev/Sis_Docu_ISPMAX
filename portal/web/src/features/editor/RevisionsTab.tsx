import { useState } from 'react';
import { History } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, ErrorState, List, ListItem, Spinner, useToast } from '@/components/ui';
import { api, type Revision } from '@/lib/api';
import { errText } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { contentChanged, fmtDate, relTime } from '@/lib/util';

export function RevisionsTab({ pageId, version, canEdit, onRestored }: { pageId: number; version: number; canEdit: boolean; onRestored: () => void }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.revisions(pageId), [pageId, version]);
  const [target, setTarget] = useState<Revision | null>(null);
  if (loading && !data) return <Spinner block />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data?.length) return <EmptyState icon={<History size={20} />} title="Sin revisiones todavía">Cada vez que guarde, la versión anterior quedará aquí para poder recuperarla.</EmptyState>;
  return (
    <>
      <p className="mb-3 text-sm text-ink-3">Cada guardado deja una copia de la versión anterior. Restaurar no borra nada: lo actual pasa a ser otra revisión.</p>
      <div className="rounded-lg border border-line">
        <List>
          {data.map((r) => (
            <ListItem key={r.id}>
              <span className="flex min-w-0 flex-col"><strong className="font-medium" title={fmtDate(r.created_at)}>{relTime(r.created_at)} <span className="font-normal text-ink-3">· {fmtDate(r.created_at)}</span></strong>
                <span className="text-sm text-ink-3">{r.user_name || r.author || 'Sistema'}{r.version != null && ` · versión ${r.version}`}</span></span>
              {canEdit && <Button size="sm" onClick={() => setTarget(r)}><History size={14} /> Restaurar</Button>}
            </ListItem>
          ))}
        </List>
      </div>
      <ConfirmDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)} title="Restaurar revisión" confirmLabel="Restaurar"
        onConfirm={async () => { if (!target) return; try { await api.restoreRevision(pageId, target.id); toast('Revisión restaurada'); contentChanged(); onRestored(); } catch (e) { toast(errText(e), 'error'); } setTarget(null); }}>
        El contenido actual se reemplaza por el de la revisión del <b>{target && fmtDate(target.created_at)}</b>. Lo que hay ahora queda guardado como otra revisión.
      </ConfirmDialog>
    </>
  );
}
