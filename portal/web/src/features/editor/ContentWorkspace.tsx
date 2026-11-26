/*
 * Espacio de contenido tipo sitio de documentación:
 * izquierda = árbol real del manual · centro = página en edición · derecha = «En esta página».
 * URL por página: #/contenido/:id. En pantallas estrechas el árbol va en un panel lateral.
 */
import { useEffect, useState } from 'react';
import { FilePlus, FileText, Table2 } from 'lucide-react';
import { Button, EmptyState, Sheet } from '@/components/ui';
import { useBreadcrumbs } from '@/components/layout/Page';
import { can, useAuth } from '@/lib/auth';
import { useMediaQuery } from '@/lib/hooks';
import { clearHashParams, hashParam, recentPages } from '@/lib/util';
import { CreatePageDialog } from '@/features/pages/CreatePageDialog';
import { usePageActions } from '@/features/pages/pageActions';
import { ContentTree, type CreateInit } from '@/features/structure/ContentTree';
import { countPages, useContentTree } from '@/features/structure/useContentTree';
import { ContentLoadCard } from '@/features/backups/ContentLoadCard';
import { PageEditor } from './PageEditor';

function NoPage({ onCreate, onOpenTree }: { onCreate: () => void; onOpenTree: () => void }) {
  const { user } = useAuth();
  useBreadcrumbs([{ label: 'Contenido' }, { label: 'Páginas' }]);
  const recent = recentPages().slice(0, 4);
  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-16">
      <div className="w-full max-w-[520px]">
        <EmptyState icon={<FileText size={20} />} title="Elija una página del árbol"
          action={<>
            <Button className="lg:hidden" onClick={onOpenTree}>Ver páginas</Button>
            {can(user, 'editor') && <Button variant="primary" onClick={onCreate}><FilePlus size={16} /> Crear página</Button>}
            <Button asChild><a href="#/paginas"><Table2 size={16} /> Ver como tabla</a></Button>
          </>}>
          El árbol de la izquierda es el menú del manual. Ábralo para editar, arrastre para reordenar o use <b>+</b> para crear dentro de un grupo.
        </EmptyState>
        {recent.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-semibold text-ink-3">Abiertas hace poco</h2>
            <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
              {recent.map((r) => <li key={r.id}><a href={`#/contenido/${r.id}`} className="flex flex-col px-3.5 py-2 text-ink no-underline hover:bg-subtle hover:no-underline"><span>{r.title}</span><span className="font-mono text-xs text-ink-3">{r.route}</span></a></li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContentWorkspace({ id }: { id?: number }) {
  const tree = useContentTree();
  const actions = usePageActions();
  const [create, setCreate] = useState<CreateInit | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [treeSheet, setTreeSheet] = useState(false);
  const desktop = useMediaQuery('(min-width: 1024px)');
  useEffect(() => { if (hashParam('nueva') === '1') { clearHashParams(); setCreate(null); setCreateOpen(true); } }, []);
  useEffect(() => setTreeSheet(false), [id]);
  const openCreate = (i: CreateInit | null) => { setCreate(i); setCreateOpen(true); setTreeSheet(false); };

  // Sistema sin páginas (recién desplegado): se ofrece cargar el respaldo del contenido.
  const empty = !!tree.sections && tree.sections.every((x) => countPages(x.nodes) === 0);
  const treeEl = <ContentTree tree={tree} actions={actions} activeId={id} onCreate={openCreate} className="h-full" />;
  return (
    <div className="flex h-[calc(100vh-52px)] min-h-0 max-lg:h-auto max-lg:min-h-[calc(100vh-52px)]">
      {desktop && <aside aria-label="Árbol del manual" className="flex w-[288px] shrink-0 flex-col border-r border-line bg-side">{treeEl}</aside>}
      {!desktop && <Sheet open={treeSheet} onOpenChange={setTreeSheet} title="Páginas del manual">{treeEl}</Sheet>}
      {empty && !id ? <div className="flex min-w-0 flex-1 items-center justify-center p-6 max-sm:p-4"><ContentLoadCard /></div> : id ? <PageEditor key={id} id={id} actions={actions} onOpenTree={() => setTreeSheet(true)} /> : <NoPage onCreate={() => openCreate(null)} onOpenTree={() => setTreeSheet(true)} />}
      <CreatePageDialog open={createOpen} onOpenChange={setCreateOpen} initial={create} />
      {actions.dialogs}
    </div>
  );
}
