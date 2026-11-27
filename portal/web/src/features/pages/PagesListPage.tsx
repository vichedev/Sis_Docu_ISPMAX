/* Todas las páginas en una tabla densa: filtrar por sección y estado, buscar y ordenar. */
import { useEffect, useMemo, useState } from 'react';
import { Copy, Ellipsis, ExternalLink, FilePlus, FileText, FolderInput, PencilLine, Search, Sparkles, Trash2 } from 'lucide-react';
import { Button, DropdownMenu, EmptyState, ErrorState, IconButton, Pager, SearchInput, SegmentedControl, SkeletonRows, StatusBadge, TBody, TD, TH, THead, TR, Table, Tabs, TabsList, TabsTrigger, useSort, useToast } from '@/components/ui';
import { Page, useBreadcrumbs } from '@/components/layout/Page';
import { api, type PageRow } from '@/lib/api';
import { can, useAuth } from '@/lib/auth';
import { useAsync, useDebounced, useWindowEvent } from '@/lib/hooks';
import { CONTENT_EVENT, SECCIONES, clearHashParams, copy, fmtDate, go, hashParam, relTime } from '@/lib/util';
import { CreatePageDialog } from './CreatePageDialog';
import { AiAssistantSheet } from '@/features/ai/AiAssistantSheet';
import { useAiStatus } from '@/features/ai/useAiStatus';
import { usePageActions } from './pageActions';
import { siteHref } from '@/lib/siteHref';

const LIMIT = 100;
type SortKey = 'title' | 'seccion' | 'grupo' | 'status' | 'updated';

export default function PagesListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const actions = usePageActions();
  const [seccion, setSeccion] = useState(hashParam('s') || 'all');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>((hashParam('estado') as 'draft') || 'all');
  const [qText, setQText] = useState('');
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [aiDraft, setAiDraft] = useState(false);
  const ai = useAiStatus();
  useEffect(() => { clearHashParams(); }, []);
  useBreadcrumbs([{ label: 'Contenido' }, { label: 'Páginas', href: '#/contenido' }, { label: 'Tabla' }]);
  const q = useDebounced(qText, 300);
  const { data, error, loading, reload } = useAsync(() => api.pages({ seccion: seccion === 'all' ? '' : seccion, status: status === 'all' ? '' : status, q, limit: LIMIT, offset }), [seccion, status, q, offset]);
  useWindowEvent(CONTENT_EVENT, reload);
  const items = useMemo(() => data?.items ?? [], [data]);
  const { sorted, props } = useSort<PageRow, SortKey>(items, (p, k) => (k === 'updated' ? +new Date(p.updated_at) : k === 'grupo' ? `${p.grupo ?? ''} ${String(p.orden).padStart(4, '0')}` : k === 'seccion' ? SECCIONES[p.seccion] : p[k]));
  const filtered = seccion !== 'all' || status !== 'all' || !!q;

  return (
    <Page title="Todas las páginas" width="wide" description="Vista de tabla para filtrar y revisar. Para escribir y ordenar, use el árbol de Páginas."
      actions={<>
        <Button asChild><a href="#/contenido">Abrir el árbol</a></Button>
        {can(user, 'editor') && <span title={ai.state.help ?? 'Describe la página y la IA propone un borrador'}><Button disabled={ai.state.disabled} onClick={() => setAiDraft(true)}><Sparkles size={16} /> Crear con IA</Button></span>}
        {can(user, 'editor') && <Button variant="primary" onClick={() => setCreating(true)}><FilePlus size={16} /> Crear página</Button>}
      </>}>
      <Tabs value={seccion} onValueChange={(v) => { setSeccion(v); setOffset(0); }}>
        <TabsList aria-label="Sección" className="mb-4">
          {[['all', 'Todas'], ...Object.entries(SECCIONES)].map(([k, v]) => <TabsTrigger key={k} value={k}>{v}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <SearchInput className="w-full sm:w-[340px]" aria-label="Buscar páginas" placeholder="Buscar por título, dirección o texto" value={qText} onValueChange={(v) => { setQText(v); setOffset(0); }} />
        <SegmentedControl label="Estado" value={status} onValueChange={(v) => { setStatus(v); setOffset(0); }} options={[{ value: 'all', label: 'Todas' }, { value: 'published', label: 'Publicadas' }, { value: 'draft', label: 'Borradores' }]} />
        <span className="flex-1" />
        {data && <span className="text-sm text-ink-3">{data.total} {data.total === 1 ? 'página' : 'páginas'}</span>}
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonRows cols={5} /> : !items.length ? (
        filtered
          ? <EmptyState icon={<Search size={20} />} title="Ninguna página coincide" action={<Button onClick={() => { setQText(''); setSeccion('all'); setStatus('all'); }}>Quitar filtros</Button>}>Pruebe con otras palabras o quite los filtros.</EmptyState>
          : <EmptyState icon={<FileText size={20} />} title="El manual aún no tiene páginas" action={can(user, 'editor') && <Button variant="primary" onClick={() => setCreating(true)}>Crear página</Button>}>Cree la primera página.</EmptyState>
      ) : (
        <>
          <Table dim={loading}>
            <THead><tr>
              <TH {...props('title')}>Título</TH><TH hide="md" {...props('seccion')}>Sección</TH><TH hide="sm" {...props('grupo')}>Grupo · orden</TH>
              <TH {...props('status')}>Estado</TH><TH hide="sm" {...props('updated')}>Modificada</TH><TH narrow><span className="sr-only">Acciones</span></TH>
            </tr></THead>
            <TBody>
              {sorted.map((p) => {
                const ref = { id: p.id, title: p.title, route: p.route, seccion: p.seccion, grupo: p.grupo };
                return (
                  <TR key={p.id} onClick={() => go(`/contenido/${p.id}`)}>
                    <TD className="min-w-[220px]"><a href={`#/contenido/${p.id}`} className="block font-medium text-ink">{p.title}</a><span className="block font-mono text-xs text-ink-3">{p.route}</span></TD>
                    <TD hide="md">{SECCIONES[p.seccion] ?? p.seccion}</TD>
                    <TD hide="sm">{p.grupo || <span className="text-ink-3">Sin grupo</span>} <span className="tabular-nums text-ink-3">· {p.orden}</span></TD>
                    <TD><StatusBadge status={p.status} /></TD>
                    <TD hide="sm" className="whitespace-nowrap"><span title={fmtDate(p.updated_at)}>{relTime(p.updated_at)}</span>{p.updated_by_name && <span className="block text-sm text-ink-3">{p.updated_by_name}</span>}</TD>
                    <TD narrow>
                      <DropdownMenu label={`Acciones de ${p.title}`} trigger={<IconButton size="icon-sm" tooltip={false} label={`Acciones de ${p.title}`} icon={<Ellipsis size={16} />} />} items={[
                        { label: can(user, 'editor') ? 'Editar' : 'Abrir', icon: <PencilLine size={16} />, onSelect: () => go(`/contenido/${p.id}`) },
                        ...(p.status === 'published' ? [{ label: 'Ver en el sitio', icon: <ExternalLink size={16} />, href: siteHref(p.route), external: true }] : []),
                        { label: 'Copiar dirección', icon: <Copy size={16} />, onSelect: async () => toast((await copy(p.route)) ? 'Dirección copiada' : 'No se pudo copiar', 'info') },
                        ...(can(user, 'editor') ? [
                          { label: 'Duplicar', icon: <Copy size={16} />, onSelect: () => void actions.duplicate(ref) },
                          { label: 'Mover o cambiar dirección…', icon: <FolderInput size={16} />, onSelect: () => actions.move(ref) },
                          { separator: true } as const,
                          { label: 'Eliminar…', icon: <Trash2 size={16} />, danger: true, onSelect: () => actions.remove(ref) },
                        ] : []),
                      ]} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pager total={data?.total ?? 0} limit={LIMIT} offset={offset} onChange={setOffset} />
        </>
      )}
      <CreatePageDialog open={creating} onOpenChange={setCreating} />
      <AiAssistantSheet open={aiDraft} onOpenChange={setAiDraft} />
      {actions.dialogs}
    </Page>
  );
}
