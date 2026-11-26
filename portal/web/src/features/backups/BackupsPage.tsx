import { useState } from 'react';
import { DatabaseBackup, Download, Ellipsis, RotateCcw, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, DropdownMenu, EmptyState, ErrorState, HelpText, IconButton, SkeletonRows, TBody, TD, TH, THead, Table, Tag, useToast } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { ContentBackupPanel } from './ContentBackupPanel';
import { can, useAuth } from '@/lib/auth';
import { api, type Backup } from '@/lib/api';
import { errText } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { contentChanged, fmtDate, fmtSize, relTime, statsChanged } from '@/lib/util';

export default function BackupsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const admin = can(user, 'admin');
  const { data, error, loading, reload } = useAsync(() => api.backups(), []);
  const [busy, setBusy] = useState(false);
  const [restore, setRestore] = useState<Backup | null>(null);
  const [del, setDel] = useState<Backup | null>(null);
  const create = async () => {
    setBusy(true);
    try { const r = await api.createBackup(); toast(`Respaldo creado: ${r.filename}`); statsChanged(); reload(); }
    catch (e) { toast(errText(e), 'error'); }
    finally { setBusy(false); }
  };
  return (
    <Page title="Respaldos" description="El respaldo del contenido es el que se lleva a otro servidor. La copia completa incluye usuarios y sesiones y solo sirve en este mismo sistema.">
      <div className="flex flex-col gap-10">
      <ContentBackupPanel />
      <section aria-labelledby="copia-completa" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line pt-8">
          <div className="min-w-0">
            <h2 id="copia-completa" className="m-0 text-[14.5px] font-semibold">Copia completa de la base de datos</h2>
            <p className="mt-0.5 text-sm text-ink-3">Avanzado. Copia de todo el portal (contenido, usuarios, sesiones y ajustes). Cree una antes de cambios grandes o de restaurar.</p>
          </div>
          {admin && <Button disabled={busy} onClick={create}><DatabaseBackup size={16} /> {busy ? 'Creando…' : 'Crear copia completa'}</Button>}
        </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={3} cols={4} /> : !data?.length ? (
        <EmptyState icon={<DatabaseBackup size={20} />} title="Aún no hay copias completas" action={admin ? <Button disabled={busy} onClick={create}>Crear copia completa</Button> : undefined}>Tarda unos segundos y se puede descargar.</EmptyState>
      ) : (
        <Table>
          <THead><tr><TH>Archivo</TH><TH>Creado</TH><TH hide="sm">Tamaño</TH><TH narrow><span className="sr-only">Acciones</span></TH></tr></THead>
          <TBody>{data.map((b, i) => (
            <tr key={b.id}>
              <TD className="break-all font-mono text-[12.5px]">{b.filename}{i === 0 && <Tag tone="accent" className="ml-2 font-sans">Más reciente</Tag>}</TD>
              <TD className="whitespace-nowrap">{relTime(b.created_at)}<span className="block text-sm text-ink-3">{fmtDate(b.created_at)}</span></TD>
              <TD hide="sm" numeric>{fmtSize(b.size)}</TD>
              <TD narrow>
                <span className="inline-flex items-center gap-1.5">
                  <Button size="sm" asChild><a href={api.backupUrl(b.id)} download aria-label={`Descargar ${b.filename}`}><Download size={14} /> <span className="max-sm:sr-only">Descargar</span></a></Button>
                  <DropdownMenu label={`Acciones de ${b.filename}`} trigger={<IconButton size="icon-sm" tooltip={false} label={`Acciones de ${b.filename}`} icon={<Ellipsis size={16} />} />} items={[
                    { label: 'Descargar', icon: <Download size={16} />, href: api.backupUrl(b.id) },
                    { label: 'Restaurar este respaldo…', icon: <RotateCcw size={16} />, onSelect: () => setRestore(b) },
                    { separator: true },
                    { label: 'Eliminar…', icon: <Trash2 size={16} />, danger: true, onSelect: () => setDel(b) },
                  ]} />
                </span>
              </TD>
            </tr>
          ))}</TBody>
        </Table>
      )}
      <HelpText className="mt-3">Se guardan en el servidor y se descargan con «Descargar». Se conservan las más recientes según <a href="#/ajustes/respaldos">Ajustes › Respaldos</a>. Formato <code>pg_dump</code> personalizado.</HelpText>
      </section>
      </div>
      <ConfirmDialog open={!!restore} onOpenChange={(o) => !o && setRestore(null)} danger title="Restaurar respaldo" confirmLabel="Restaurar" requireText="RESTAURAR"
        onConfirm={async () => { if (!restore) return; try { await api.restoreBackup(restore.id); toast('Respaldo restaurado'); contentChanged(); reload(); } catch (e) { toast(errText(e), 'error'); } setRestore(null); }}>
        Todo el contenido actual del portal se reemplazará por el de <code>{restore?.filename}</code> ({restore && fmtDate(restore.created_at)}). No se puede deshacer: cree antes un respaldo del estado actual.
      </ConfirmDialog>
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} danger title="Eliminar respaldo" confirmLabel="Eliminar"
        onConfirm={async () => { if (!del) return; try { await api.deleteBackup(del.id); toast('Respaldo eliminado'); reload(); } catch (e) { toast(errText(e), 'error'); } setDel(null); }}>
        Se borrará <code>{del?.filename}</code> del servidor. Si la necesita, descárguela antes.
      </ConfirmDialog>
    </Page>
  );
}
