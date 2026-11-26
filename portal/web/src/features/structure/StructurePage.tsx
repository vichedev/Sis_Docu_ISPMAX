/* Estructura a pantalla completa: el mismo árbol del espacio de contenido, con direcciones, y el sidebar.json de la Guía. */
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Card, ErrorState, HelpText, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, useToast } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { api } from '@/lib/api';
import { can, errText, useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { statsChanged } from '@/lib/util';
import { CreatePageDialog } from '@/features/pages/CreatePageDialog';
import { usePageActions } from '@/features/pages/pageActions';
import { ContentTree, type CreateInit } from './ContentTree';
import { useContentTree } from './useContentTree';

function SidebarJson({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.sidebar(), []);
  const [text, setText] = useState('');
  const [base, setBase] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data !== null) { const t = JSON.stringify(data, null, 2); setText(t); setBase(t); } }, [data]);
  let parsed: unknown; let bad = '';
  try { parsed = JSON.parse(text); } catch (e) { bad = (e as Error).message; }
  if (loading && data === null) return <Spinner block />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[70ch] text-sm text-ink-3">Contenido de <code>docs/sidebar.json</code>: orden y títulos del menú de la Guía en el sitio. Avanzado: un error de formato impide guardar.</p>
        {canEdit && <div className="flex gap-2">
          <Button disabled={text === base} onClick={() => setText(base)}>Descartar</Button>
          <Button variant="primary" disabled={!!bad || text === base || busy} onClick={async () => { setBusy(true); try { await api.saveSidebar(parsed); setBase(text); toast('Barra lateral guardada'); statsChanged(); } catch (e) { toast(errText(e), 'error'); } finally { setBusy(false); } }}><Save size={16} /> Guardar</Button>
        </div>}
      </div>
      <Textarea code rows={22} aria-label="sidebar.json" value={text} readOnly={!canEdit} onChange={(e) => setText(e.target.value)} aria-invalid={!!bad || undefined} />
      {bad && <HelpText tone="error" className="mt-1.5">JSON no válido: {bad}</HelpText>}
    </Card>
  );
}

export default function StructurePage() {
  const { user } = useAuth();
  const canEdit = can(user, 'editor');
  const tree = useContentTree();
  const actions = usePageActions();
  const [tab, setTab] = useState('arbol');
  const [create, setCreate] = useState<CreateInit | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <Page title="Estructura" width="narrow" description={canEdit ? 'El menú completo del manual. Arrastre por el asa para ordenar; desplace a la derecha para convertir en subpágina (hasta 3 niveles). Los cambios se guardan al soltar.' : 'Así está ordenado el menú del manual.'}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Vista" className="mb-4">
          <TabsTrigger value="arbol">Menú por secciones</TabsTrigger>
          <TabsTrigger value="guia">Barra lateral de la Guía</TabsTrigger>
        </TabsList>
        <TabsContent value="arbol">
          <Card as="div" className="flex h-[calc(100vh-260px)] min-h-[420px] flex-col overflow-hidden">
            <ContentTree variant="full" tree={tree} actions={actions} onCreate={(i) => { setCreate(i); setOpen(true); }} className="h-full" />
          </Card>
        </TabsContent>
        <TabsContent value="guia"><SidebarJson canEdit={canEdit} /></TabsContent>
      </Tabs>
      <CreatePageDialog open={open} onOpenChange={setOpen} initial={create} />
      {actions.dialogs}
    </Page>
  );
}
