/*
 * Acciones sobre una página reutilizadas por el árbol, la tabla y el editor:
 * mover (diálogo), duplicar (crea copia en borrador) y eliminar (confirmación).
 *   const actions = usePageActions(); actions.move(ref); … ; render {actions.dialogs}
 */
import { useState } from 'react';
import { Button, ConfirmDialog, DescriptionList, Dialog, Field, FieldRow, FieldStack, HelpText, Input, Select, useToast } from '@/components/ui';
import { api, type StructurePage } from '@/lib/api';
import { errText } from '@/lib/auth';
import { SECCIONES, contentChanged, go, slugify } from '@/lib/util';
import { moduloOf, slugOf, tipoFromFrontmatter } from './constants';

export interface PageRef { id: number; title: string; route: string; seccion: string; grupo?: string | null }

function MoveDialog({ page, onClose }: { page: PageRef; onClose: () => void }) {
  const toast = useToast();
  const [seccion, setSeccion] = useState(page.seccion);
  const [grupo, setGrupo] = useState(page.grupo ?? '');
  const [slug, setSlug] = useState(slugOf(page.route));
  const [modulo, setModulo] = useState(moduloOf(page.route));
  const [busy, setBusy] = useState(false);
  const route = `/${seccion}/${seccion === 'tareas' && modulo ? `${modulo}/` : ''}${slug || '…'}`;
  const submit = async () => {
    setBusy(true);
    try { await api.movePage(page.id, { seccion, grupo: grupo || undefined, slug, modulo: modulo || undefined }); toast('Página movida; la dirección anterior redirige a la nueva'); contentChanged(); onClose(); }
    catch (e) { toast(errText(e), 'error'); setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Mover o cambiar la dirección" description={page.title}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" disabled={busy || !slug || (seccion === 'tareas' && !modulo)} onClick={submit}>Mover página</Button></>}>
      <FieldStack>
        <FieldRow>
          <Field label="Sección">{(id) => <Select id={id} value={seccion} onValueChange={setSeccion} options={Object.entries(SECCIONES).map(([k, v]) => ({ value: k, label: v }))} />}</Field>
          {seccion === 'tareas' && <Field label="Módulo">{(id) => <Input id={id} value={modulo} onChange={(e) => setModulo(slugify(e.target.value))} />}</Field>}
        </FieldRow>
        <Field label="Grupo">{(id) => <Input id={id} value={grupo} onChange={(e) => setGrupo(e.target.value)} />}</Field>
        <Field label="Identificador en la dirección">{(id) => <Input id={id} mono value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />}</Field>
        <DescriptionList items={[['Ahora', <code key="a">{page.route}</code>], ['Quedará', <code key="b">{route}</code>]]} />
        <HelpText>La dirección anterior seguirá funcionando: se registra una redirección.</HelpText>
      </FieldStack>
    </Dialog>
  );
}

export function usePageActions() {
  const toast = useToast();
  const [moving, setMoving] = useState<PageRef | null>(null);
  const [deleting, setDeleting] = useState<PageRef | null>(null);

  const duplicate = async (ref: PageRef) => {
    try {
      const p = await api.page(ref.id);
      const modulo = moduloOf(p.route);
      const copy = await api.createPage({
        seccion: p.seccion, slug: `${slugOf(p.route)}-copia-${Date.now().toString(36).slice(-4)}`, title: `${p.title} (copia)`,
        tipo: tipoFromFrontmatter(p.frontmatter, p.seccion), ...(p.grupo ? { grupo: p.grupo } : {}), ...(modulo ? { modulo } : {}), ...(p.description ? { description: p.description } : {}),
      });
      await api.savePage(copy.id, { body: p.body, version: copy.version });
      toast('Copia creada como borrador');
      contentChanged();
      go(`/contenido/${copy.id}`);
    } catch (e) { toast(errText(e), 'error'); }
  };

  const dialogs = (
    <>
      {moving && <MoveDialog page={moving} onClose={() => setMoving(null)} />}
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} danger title="Eliminar página" confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.deletePage(deleting.id);
            const id = deleting.id;
            toast('Página eliminada', 'ok', { label: 'Deshacer', run: () => { void api.restorePage(id).then(() => { contentChanged(); toast('Página recuperada'); }); } });
            contentChanged();
            if (window.location.hash.startsWith(`#/contenido/${id}`)) go('/contenido');
          } catch (e) { toast(errText(e), 'error'); }
          setDeleting(null);
        }}>
        La página <b>{deleting?.title}</b> se quitará del manual (si estaba publicada, se actualiza solo en unos segundos). Se puede recuperar: no se borra de forma definitiva.
      </ConfirmDialog>
    </>
  );
  return { move: setMoving, remove: setDeleting, duplicate, dialogs };
}

/** Coloca `pageId` como última subpágina de `parentId` (orden anidado de la Adenda 2). */
export async function nestPage(seccion: string, pageId: number, parentId: number) {
  const s = await api.structure();
  const sec = s.secciones.find((x) => x.key === seccion);
  if (!sec) return;
  type N = { id: number; children: N[] };
  const conv = (l: StructurePage[]): N[] => l.map((p) => ({ id: p.id, children: conv(p.children ?? []) }));
  const strip = (l: N[]): N[] => l.filter((p) => p.id !== pageId).map((p) => ({ ...p, children: strip(p.children) }));
  const add = (l: N[]): N[] => l.map((p) => (p.id === parentId ? { ...p, children: [...p.children, { id: pageId, children: [] }] } : { ...p, children: add(p.children) }));
  await api.saveOrder(seccion, sec.grupos.map((g) => ({ name: g.name, nodes: add(strip(conv(g.pages))) })));
}
