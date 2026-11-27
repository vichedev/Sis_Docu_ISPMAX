/* Datos del árbol del manual: secciones → grupos → páginas (anidadas hasta 3 niveles). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui';
import type { TreeNode } from '@/components/dnd';
import { api, type OrderNode, type PageRef, type StructureMenu, type StructurePage, type StructureSection } from '@/lib/api';
import { errText } from '@/lib/auth';
import { useWindowEvent } from '@/lib/hooks';
import { CONTENT_EVENT, jobState, statsChanged } from '@/lib/util';

export type NodeData = { kind: 'group'; name: string } | { kind: 'page'; page: StructurePage };
export type CNode = TreeNode<NodeData>;
export interface CSection { key: string; label: string; sectionIndex: PageRef | null; nodes: CNode[] }

export const pageKey = (id: number) => `p:${id}`;
export const groupKey = (sec: string, name: string) => `g:${sec}:${name}`;
export const MAX_PAGE_DEPTH = 3;

const toNodes = (pages: StructurePage[]): CNode[] => pages.map((p) => ({ id: pageKey(p.id), data: { kind: 'page', page: p }, children: toNodes(p.children ?? []) }));
const toSections = (s: StructureSection[]): CSection[] => s.map((sec) => ({
  key: sec.key, label: sec.label, sectionIndex: sec.sectionIndex ?? null,
  nodes: sec.grupos.map((g) => ({ id: groupKey(sec.key, g.name), data: { kind: 'group', name: g.name }, children: toNodes(g.pages) })),
}));
const toOrder = (nodes: CNode[]): OrderNode[] => nodes.filter((n) => n.data.kind === 'page').map((n) => ({ id: (n.data as { page: StructurePage }).page.id, children: toOrder(n.children) }));
export const countPages = (nodes: CNode[]): number => nodes.reduce((a, n) => a + (n.data.kind === 'page' ? 1 : 0) + countPages(n.children), 0);

export function useContentTree() {
  const toast = useToast();
  const [sections, setSections] = useState<CSection[] | null>(null);
  const [menu, setMenu] = useState<StructureMenu[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [modified, setModified] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const [s, pages, jobs] = await Promise.all([
        api.structure(),
        api.pages({ limit: 500 }).catch(() => null),
        api.jobs('publish', 10).catch(() => []),
      ]);
      setSections(toSections(s.secciones));
      setMenu(s.menu ?? []);
      setError(null);
      // «Cambios sin publicar»: modificada después de que empezara la última publicación correcta.
      const lastOk = jobs.find((j) => jobState(j.status) === 'ok');
      const since = lastOk ? +new Date(lastOk.started_at) : null;
      setModified(new Set(since == null || !pages ? [] : pages.items.filter((p) => p.status === 'published' && +new Date(p.updated_at) > since).map((p) => p.id)));
    } catch (e) { setError(e); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useWindowEvent(CONTENT_EVENT, () => { void load(); });

  /** Guarda el orden de una sección. Con `prev` ofrece deshacer. */
  const saveSection = useCallback(async (key: string, nodes: CNode[], prev?: CNode[]) => {
    setSections((all) => all?.map((s) => (s.key === key ? { ...s, nodes } : s)) ?? all);
    try {
      await api.saveOrder(key, nodes.filter((g) => g.data.kind === 'group').map((g) => ({ name: (g.data as { name: string }).name, nodes: toOrder(g.children) })));
      statsChanged();
      toast('Orden guardado', 'ok', prev ? { label: 'Deshacer', run: () => { void saveSection(key, prev); } } : undefined);
    } catch (e) {
      toast(errText(e), 'error');
      void load();
    }
  }, [toast, load]);

  /** Cambia el árbol de una sección solo en local (p. ej. grupo nuevo aún vacío). */
  const setLocal = useCallback((key: string, nodes: CNode[]) => setSections((all) => all?.map((s) => (s.key === key ? { ...s, nodes } : s)) ?? all), []);

  const index = useMemo(() => {
    const m = new Map<number, { section: CSection; group: string; parentId: number | null; depth: number; page: StructurePage }>();
    for (const s of sections ?? []) for (const g of s.nodes) {
      const walk = (list: CNode[], parent: number | null, depth: number) => list.forEach((n) => {
        if (n.data.kind !== 'page') return;
        m.set(n.data.page.id, { section: s, group: g.data.kind === 'group' ? g.data.name : '', parentId: parent, depth, page: n.data.page });
        walk(n.children, n.data.page.id, depth + 1);
      });
      walk(g.children, null, 1);
    }
    return m;
  }, [sections]);

  /** Grupos vacíos: se guardan en el servidor al crearlos, renombrarlos o eliminarlos. */
  const createGroup = useCallback(async (seccion: string, name: string) => {
    try { await api.createGroup(seccion, name); await load(); statsChanged(); toast(`Grupo «${name}» creado`); return true; }
    catch (e) { toast(errText(e), 'error'); return false; }
  }, [toast, load]);
  const deleteGroup = useCallback(async (seccion: string, name: string) => {
    try {
      await api.deleteGroup(seccion, name); await load(); statsChanged();
      toast(`Grupo «${name}» eliminado`, 'ok', { label: 'Deshacer', run: () => { void createGroup(seccion, name); } });
    } catch (e) { toast(errText(e), 'error'); }
  }, [toast, load, createGroup]);

  /** Renombra un grupo (con o sin páginas) en el servidor, en una sola operación. */
  const renameGroup = useCallback(async (seccion: string, from: string, to: string) => {
    try { await api.renameGroup(seccion, from, to); await load(); statsChanged(); toast(`Grupo renombrado a «${to}»`); return true; }
    catch (e) { toast(errText(e), 'error'); return false; }
  }, [toast, load]);

  return { sections, menu, error, reload: load, saveSection, setLocal, createGroup, deleteGroup, renameGroup, notify: (m: string) => toast(m, 'error'), modified, index };
}
export type ContentTreeState = ReturnType<typeof useContentTree>;
