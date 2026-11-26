/* Biblioteca de imágenes: carpetas a la izquierda, cuadrícula densa y panel de detalle con fragmento copiable. */
import { useEffect, useMemo, useState } from 'react';
import { Folder, ImageOff, Images as ImagesIcon, Trash2, Upload, X } from 'lucide-react';
import { AssetGrid, AssetTile, Button, CodeBlock, ConfirmDialog, CopyButton, DescriptionList, Dialog, EmptyState, ErrorState, Field, FieldStack, FileDropzone, HelpText, IconButton, Input, SearchInput, Select, Sheet, Spinner, useToast } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { api, ApiError, type Asset } from '@/lib/api';
import { can, errText, useAuth } from '@/lib/auth';
import { assetFolder, assetName, assetRel, figureSnippet, folderLabel, foldersOf } from '@/lib/assets';
import { useAsync, useDebounced, useMediaQuery } from '@/lib/hooks';
import { clearHashParams, copy, fmtSize, hashParam, statsChanged } from '@/lib/util';
import { cn } from '@/lib/cn';

const PAGE = 60;

function Detail({ a, canEdit, onDelete }: { a: Asset; canEdit: boolean; onDelete: () => void }) {
  return (
    <>
      <div className="grid aspect-[16/10] place-items-center border-b border-line bg-subtle bg-[linear-gradient(45deg,var(--bg-muted)_25%,transparent_25%,transparent_75%,var(--bg-muted)_75%),linear-gradient(45deg,var(--bg-muted)_25%,transparent_25%,transparent_75%,var(--bg-muted)_75%)] bg-[length:14px_14px] bg-[position:0_0,7px_7px] p-2">
        <img src={api.assetUrl(assetRel(a.path))} alt="" className="max-h-full max-w-full rounded-sm object-contain" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="break-all text-[13.5px] font-semibold">{assetName(a.path)}</h3>
        <DescriptionList stacked items={[
          ['Carpeta', <code key="c" className="break-all">{assetRel(a.path).split('/').slice(0, -1).join('/')}</code>],
          ['Tamaño', `${a.width && a.height ? `${a.width} × ${a.height} px · ` : ''}${fmtSize(a.size)}`],
        ]} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">Fragmento para la página</span>
          <CodeBlock code={figureSnippet(a)} />
          <HelpText>Péguelo en el editor y complete <code>alt</code> con una descripción breve.</HelpText>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton withText text={figureSnippet(a)} label="Copiar fragmento" done="Fragmento copiado" />
          <CopyButton withText text={`/assets/${assetRel(a.path)}`} label="Copiar ruta" done="Ruta copiada" />
          {canEdit && <Button variant="danger-ghost" onClick={onDelete}><Trash2 size={16} /> Eliminar</Button>}
        </div>
      </div>
    </>
  );
}

function UploadDialog({ open, onOpenChange, folders, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; folders: string[]; onDone: () => void }) {
  const toast = useToast();
  const [folder, setFolder] = useState('imgs/');
  const [name, setName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const upload = async () => {
    setBusy(true);
    try {
      let last = '';
      for (const f of files) { const r = await api.uploadAsset(f, folder.replace(/\/+$/, ''), files.length === 1 ? name || undefined : undefined); last = r.snippet; }
      const copied = last ? await copy(last) : false;
      toast(`${files.length === 1 ? 'Imagen subida' : `${files.length} imágenes subidas`}${copied ? '; fragmento copiado' : ''}`);
      statsChanged(); setFiles([]); setName(''); onOpenChange(false); onDone();
    } catch (e) { toast(errText(e), 'error'); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Subir imágenes"
      footer={<><Button onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" disabled={busy || !files.length || !folder.trim()} onClick={upload}>{busy ? 'Subiendo…' : files.length > 1 ? `Subir ${files.length} imágenes` : 'Subir'}</Button></>}>
      <FieldStack>
        <FileDropzone accept="image/*" multiple files={files} onFiles={setFiles} hint="PNG, JPG o WebP. Se convierten a WebP." />
        <Field label="Carpeta" help={<>Siga la convención <code>imgs/modulo/tema</code>.</>}>
          {(id, d) => <><Input id={id} aria-describedby={d} mono value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="imgs/acceso/contrasena" list="folders-dl" /><datalist id="folders-dl">{folders.map((f) => <option key={f} value={f} />)}</datalist></>}
        </Field>
        {files.length <= 1 && <Field label="Nombre" optional help={<>Queda como <code>NN-nombre.webp</code>, numerado dentro de la carpeta. Al terminar se copia el fragmento <code>{'<Figure />'}</code>.</>}>
          {(id, d) => <Input id={id} aria-describedby={d} value={name} onChange={(e) => setName(e.target.value)} placeholder="pantalla-principal" />}</Field>}
      </FieldStack>
    </Dialog>
  );
}

export default function ImagesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = can(user, 'editor');
  const narrow = useMediaQuery('(max-width: 1100px)');
  const [qText, setQText] = useState('');
  const [prefix, setPrefix] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const q = useDebounced(qText, 300);
  const { data, error, loading, reload } = useAsync(() => api.assets({ q }), [q]);
  const [sel, setSel] = useState<Asset | null>(null);
  const [del, setDel] = useState<Asset | null>(null);
  const [delRefs, setDelRefs] = useState<string[] | null>(null);
  const [upOpen, setUpOpen] = useState(() => hashParam('subir') === '1' && canEdit);
  useEffect(() => { clearHashParams(); }, []);

  const all = useMemo(() => data ?? [], [data]);
  const folders = useMemo(() => foldersOf(all), [all]);
  const items = prefix === 'all' ? all : all.filter((a) => assetFolder(a.path) === prefix);
  const pick = (f: string) => { setPrefix(f); setShown(PAGE); };

  const doDelete = async (a: Asset) => {
    try { await api.deleteAsset(a.path); toast('Imagen eliminada'); statsChanged(); setSel(null); reload(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const d = e.data as { pages?: unknown[]; referencias?: unknown[] } | null;
        setDelRefs(((d?.pages ?? d?.referencias ?? []) as unknown[]).map((x) => (typeof x === 'string' ? x : (x as { route?: string }).route ?? JSON.stringify(x))));
      } else toast(errText(e), 'error');
    }
    setDel(null);
  };
  const folderBtn = (f: string, label: string, n: number, icon = <Folder size={16} />) => (
    <button key={f} type="button" onClick={() => pick(f)} title={f} aria-current={prefix === f || undefined}
      className={cn('flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-[13.5px] text-ink-2 hover:bg-subtle hover:text-ink [&>svg]:text-ink-3', prefix === f && 'bg-muted font-medium text-ink [&>svg]:text-accent')}>
      {icon}<span className="flex-1 truncate">{label}</span><span className="text-xs tabular-nums text-ink-3">{n}</span>
    </button>
  );
  const detail = sel && <Detail a={sel} canEdit={canEdit} onDelete={() => setDel(sel)} />;

  return (
    <Page width="wide" title="Imágenes" description="Capturas y figuras del manual. Al subirlas se convierten a WebP." actions={canEdit && <Button variant="primary" onClick={() => setUpOpen(true)}><Upload size={16} /> Subir imágenes</Button>}>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <SearchInput className="w-full sm:w-[340px]" aria-label="Buscar imágenes" placeholder="Buscar por nombre o carpeta" value={qText} onValueChange={(v) => { setQText(v); setShown(PAGE); }} />
        {narrow && <Select className="w-full sm:w-60" aria-label="Carpeta" value={prefix} onValueChange={pick} options={[{ value: 'all', label: `Todas las carpetas (${all.length})` }, ...folders.map(([f, n]) => ({ value: f, label: `${folderLabel(f)} (${n})` }))]} />}
        <span className="flex-1" />
        <span className="text-sm text-ink-3">{items.length} {items.length === 1 ? 'imagen' : 'imágenes'}</span>
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Spinner block /> : (
        <div className={cn('grid items-start gap-6', narrow ? 'grid-cols-1' : sel ? 'grid-cols-[200px_minmax(0,1fr)_320px]' : 'grid-cols-[200px_minmax(0,1fr)]')}>
          {!narrow && <nav aria-label="Carpetas" className="sticky top-[72px] flex max-h-[calc(100vh-92px)] flex-col gap-px overflow-y-auto">
            {folderBtn('all', 'Todas', all.length, <ImagesIcon size={16} />)}
            {folders.map(([f, n]) => folderBtn(f, folderLabel(f), n))}
          </nav>}
          <div className="min-w-0">
            {items.length === 0 ? (
              q || prefix !== 'all'
                ? <EmptyState icon={<ImageOff size={20} />} title="Ninguna imagen coincide" action={<Button onClick={() => { setQText(''); setPrefix('all'); }}>Quitar filtros</Button>}>Cambie la búsqueda o elija otra carpeta.</EmptyState>
                : <EmptyState icon={<ImagesIcon size={20} />} title="Todavía no hay imágenes" action={canEdit && <Button variant="primary" onClick={() => setUpOpen(true)}>Subir imágenes</Button>}>Suba la primera captura; obtendrá el fragmento listo para pegar en una página.</EmptyState>
            ) : (
              <>
                <AssetGrid>{items.slice(0, shown).map((a) => <li key={a.path}><AssetTile asset={a} selected={sel?.path === a.path} onClick={() => setSel(a)} /></li>)}</AssetGrid>
                {shown < items.length && <div className="mt-4 flex justify-center"><Button onClick={() => setShown((n) => n + PAGE)}>Mostrar {Math.min(PAGE, items.length - shown)} más</Button></div>}
              </>
            )}
          </div>
          {sel && !narrow && (
            <aside aria-label="Detalle de la imagen" className="sticky top-[72px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-lg border border-line bg-bg">
              <div className="flex items-center justify-between border-b border-line py-1.5 pl-3.5 pr-1.5"><span className="text-sm font-medium text-ink-2">Detalle</span><IconButton size="icon-sm" label="Cerrar detalle" icon={<X size={16} />} onClick={() => setSel(null)} /></div>
              {detail}
            </aside>
          )}
        </div>
      )}
      {narrow && <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)} side="right" title="Imagen">{detail}</Sheet>}
      <UploadDialog open={upOpen} onOpenChange={setUpOpen} folders={folders.map(([f]) => f)} onDone={reload} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} danger title="Eliminar imagen" confirmLabel="Eliminar" onConfirm={() => (del ? doDelete(del) : undefined)}>
        Se eliminará <code>{del && assetRel(del.path)}</code>. Si alguna página la usa, el portal no la borrará y le dirá cuáles.
      </ConfirmDialog>
      <Dialog open={!!delRefs} onOpenChange={(o) => !o && setDelRefs(null)} size="sm" title="La imagen está en uso" footer={<Button onClick={() => setDelRefs(null)}>Entendido</Button>}>
        <p className="mb-2">Quítela primero de estas páginas:</p>
        <ul className="m-0 list-disc pl-5 font-mono text-sm">{delRefs?.map((r) => <li key={r}>{r}</li>)}</ul>
      </Dialog>
    </Page>
  );
}
