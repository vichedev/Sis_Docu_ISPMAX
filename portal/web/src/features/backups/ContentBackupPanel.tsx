/* Bloque «Respaldo del contenido del manual»: resumen vivo, crear, lista y carga de un paquete .ispmax. */
import { useState } from 'react';
import { Download, PackageCheck, Trash2 } from 'lucide-react';
import { Badge, Button, Checkbox, ConfirmDialog, EmptyState, ErrorState, IconButton, Panel, SkeletonRows, Tag, useToast, CopyButton, CodeBlock } from '@/components/ui';
import { contentApi, type ContentFile } from '@/lib/api.content';
import { can, errText, useAuth } from '@/lib/auth';
import { useAsync, useWindowEvent } from '@/lib/hooks';
import { CONTENT_EVENT, fmtDate, fmtSize, relTime, statsChanged } from '@/lib/util';
import { ContentLoader } from './ContentLoadCard';
import { DOCKER_COPY_COMMAND, DOCKER_IMPORT_COMMAND, countsText, shortHash } from './contentModel';

const Stat = ({ value, label }: { value: string | number; label: string }) => (
  <div className="min-w-0"><div className="text-xl font-semibold leading-tight tabular-nums">{value}</div><div className="text-sm text-ink-3">{label}</div></div>
);

export function ContentBackupPanel() {
  const toast = useToast();
  const { user } = useAuth();
  const admin = can(user, 'admin');
  const summary = useAsync(() => contentApi.summary(), []);
  const files = useAsync(() => contentApi.files(), []);
  const [revisions, setRevisions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<ContentFile | null>(null);
  const reloadAll = () => { summary.reload(); files.reload(); };
  useWindowEvent(CONTENT_EVENT, reloadAll);

  const create = async () => {
    setBusy(true);
    try {
      const r = await contentApi.exportPackage(revisions);
      toast(`Respaldo creado: ${r.filename} (${fmtSize(r.size)})`);
      statsChanged(); reloadAll();
    } catch (e) { toast(errText(e), 'error'); }
    finally { setBusy(false); }
  };
  const s = summary.data;

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Respaldo del contenido del manual" description="Lleva todo el manual (páginas, borradores, imágenes y tours) a otro servidor en un solo archivo. Es la opción recomendada.">
        {summary.error ? <ErrorState error={summary.error} onRetry={summary.reload} /> : !s ? <SkeletonRows rows={1} cols={4} /> : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4" aria-live="polite">
              <Stat value={s.counts.pages} label="páginas" />
              <Stat value={s.counts.drafts} label="borradores" />
              <Stat value={s.counts.assets} label={`imágenes · ${fmtSize(s.assetsBytes)}`} />
              <Stat value={s.counts.tours} label="tours" />
            </div>
            {admin && <Checkbox checked={revisions} onCheckedChange={setRevisions} label="Incluir el historial de revisiones" description="El archivo pesa más. Sin esta opción solo se guarda la versión actual de cada página." />}
            {admin && <div><Button variant="primary" disabled={busy} onClick={create}><PackageCheck size={16} /> {busy ? 'Creando…' : 'Crear respaldo del contenido'}</Button></div>}
          </div>
        )}
      </Panel>

      <Panel title="Respaldos del contenido creados" flush>
        {files.error ? <div className="p-4"><ErrorState error={files.error} onRetry={files.reload} /></div> : !files.data ? <div className="p-4"><SkeletonRows rows={2} cols={3} /></div> : !files.data.length ? (
          <div className="p-4"><EmptyState compact icon={<PackageCheck size={20} />} title="Aún no hay respaldos del contenido">{admin ? 'Cree el primero con el botón de arriba y descárguelo para llevarlo al otro servidor.' : 'Un administrador puede crear el primero.'}</EmptyState></div>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {files.data.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-[12.5px]">{f.filename}</span>
                    {i === 0 && <Tag tone="accent">Más reciente</Tag>}
                    {f.reason && <Tag>{f.reason}</Tag>}
                    {!f.exists && <Badge tone="danger">El archivo ya no está en el servidor</Badge>}
                  </div>
                  <div className="mt-0.5 text-sm text-ink-3">
                    {relTime(f.created_at)} · {fmtDate(f.created_at)}{f.user_name && <> · {f.user_name}</>} · {fmtSize(f.size)}
                  </div>
                  {f.counts && <div className="text-sm text-ink-3">{countsText(f.counts, true)}{f.includeRevisions === false && ' · sin historial'}</div>}
                  {f.sha256 && (
                    <div className="mt-0.5 flex items-center gap-1 text-sm text-ink-3">
                      Huella <code title={f.sha256}>{shortHash(f.sha256)}</code><CopyButton text={f.sha256} label="Copiar huella completa" done="Huella copiada" />
                    </div>
                  )}
                </div>
                {admin && (
                  <div className="flex items-center gap-1.5">
                    {f.exists && <Button size="sm" asChild><a href={contentApi.downloadUrl(f.id)} download><Download size={14} /> Descargar</a></Button>}
                    <IconButton size="icon-sm" label={`Eliminar ${f.filename}`} icon={<Trash2 size={15} />} onClick={() => setDel(f)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {admin && (
        <Panel title="Cargar contenido" description="Para poner en este sistema el manual guardado en un archivo .ispmax, por ejemplo tras desplegarlo en otro servidor. Se elige el archivo desde su equipo: no hace falta copiarlo al servidor.">
          {s ? <ContentLoader hasContent={s.hasContent} showCli={false} onDone={reloadAll} /> : <SkeletonRows rows={1} cols={2} />}
        </Panel>
      )}

      <details className="group rounded-lg border border-line">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13.5px] font-medium text-ink-2 [&::-webkit-details-marker]:hidden">
          <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> Cargar por terminal (para quien despliega con Docker)
        </summary>
        <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-sm text-ink-2">
          <p className="m-0">Alternativa a «Cargar contenido». En el servidor, desde la carpeta del sistema y con el archivo descargado al lado:</p>
          <p className="m-0 text-ink-3">1. Copiar el archivo al contenedor</p>
          <CodeBlock code={DOCKER_COPY_COMMAND} copyLabel="Copiar el comando" />
          <p className="m-0 text-ink-3">2. Cargarlo (reemplaza el contenido; antes guarda un respaldo de seguridad)</p>
          <CodeBlock code={DOCKER_IMPORT_COMMAND} copyLabel="Copiar el comando" />
          <p className="m-0 text-ink-3">Cambie <code>archivo.ispmax</code> por el nombre real del archivo.</p>
        </div>
      </details>

      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} danger title="Eliminar respaldo del contenido" confirmLabel="Eliminar"
        onConfirm={async () => { if (!del) return; try { await contentApi.remove(del.id); toast('Respaldo eliminado'); reloadAll(); } catch (e) { toast(errText(e), 'error'); } setDel(null); }}>
        Se borrará <code>{del?.filename}</code> del servidor. No se puede deshacer: si no tiene otra copia del archivo, no podrá recuperarlo.
      </ConfirmDialog>
    </div>
  );
}
