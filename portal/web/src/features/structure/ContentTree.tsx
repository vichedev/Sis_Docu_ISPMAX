/*
 * Árbol del manual: el menú superior del manual (Guía · Quiero hacer… · Tengo un problema · Preguntas · Referencia · Soporte)
 * y, dentro de cada uno, su barra lateral real: encabezados de grupo, ítems con su texto/emoji y subsecciones (hasta 3 niveles).
 * - Arrastrar por el asa reordena, cambia de grupo y anida (desplazando a la derecha) o desanida.
 * - Teclado (patrón «tree»): ↑/↓ moverse, →/← abrir/cerrar, Inicio/Fin; Alt+↑/↓ mover entre hermanos,
 *   Alt+→ convertir en subpágina de la anterior, Alt+← sacar un nivel; Mayús+F10 abre el menú de la fila.
 * - Menú por página: abrir, añadir subpágina, duplicar, mover, eliminar. «+» en grupos y secciones crea páginas.
 * variant="sidebar" (espacio de contenido) o "full" (pantalla Estructura, con direcciones y grupos editables).
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { DndContext, DragOverlay, closestCenter, type DragMoveEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronRight, Copy, Ellipsis, ExternalLink, FilePlus, FolderInput, PanelTop, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, DragHandle, DropdownMenu, ErrorState, Field, IconButton, Input, SearchInput, Spinner, Tooltip, type MenuEntry } from '@/components/ui';
import { announcements, applyMove, buildTree, flattenTree, getProjection, indent as indentNode, moveSibling, outdent as outdentNode, removeChildrenOf, useDndSensors, type FlatNode, type Projection } from '@/components/dnd';
import { can, useAuth } from '@/lib/auth';
import { useLocalStorage } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { go } from '@/lib/util';
import type { usePageActions } from '@/features/pages/pageActions';
import type { StructureMenu, StructurePage } from '@/lib/api';
import { MAX_PAGE_DEPTH, countPages, groupKey, pageKey, type CNode, type CSection, type ContentTreeState, type NodeData } from './useContentTree';
import { siteHref } from '@/lib/siteHref';

const INDENT = 14;
/** Texto del ítem tal como lo muestra el menú del manual. */
const pageText = (p: StructurePage) => p.menu || p.title;
export interface CreateInit { seccion: string; grupo?: string; parentId?: number }
type Actions = ReturnType<typeof usePageActions>;

/* ---------- Fila ---------- */
interface RowProps {
  item: FlatNode<NodeData>; section: CSection; depth: number; open: boolean; hasChildren: boolean; active: boolean; focusKey: string; full: boolean;
  canEdit: boolean; dragDisabled: boolean; modified: boolean; menuOpen: boolean; setMenuOpen: (o: boolean) => void; menu: MenuEntry[];
  onToggle: () => void; onFocus: () => void; onCreateHere?: () => void; renaming: boolean; onRename: (v: string | null) => void;
  overlay?: boolean; count?: number;
}
function TreeRow(p: RowProps) {
  const { item, depth } = p;
  const sortable = useSortable({ id: item.id, disabled: { draggable: p.dragDisabled || item.data.kind === 'group', droppable: false } });
  const style = p.overlay ? undefined : { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition };
  const isGroup = item.data.kind === 'group';
  const pad = isGroup ? 2 : 6 + (depth - 1) * INDENT;
  const rowCls = 'group/row relative flex min-h-8 items-center gap-1 rounded-md pr-1 text-[13.5px] focus-within:bg-subtle hover:bg-subtle';
  const common = {
    'data-tree-row': '', 'data-key': item.id, 'data-parent': item.parentId ?? `s:${p.section.key}`,
    tabIndex: p.focusKey === item.id ? 0 : -1, onFocus: p.onFocus, role: 'treeitem', 'aria-level': depth + 2,
    'aria-expanded': p.hasChildren ? p.open : undefined,
  } as const;
  const rename = p.renaming && isGroup;
  const [val, setVal] = useState(isGroup ? (item.data as { name: string }).name : '');

  /* Hueco de destino: muestra dónde y a qué nivel quedará la página al soltar. */
  if (sortable.isDragging && !p.overlay) {
    return (
      <div ref={sortable.setNodeRef} style={style} className="py-0.5" aria-hidden="true">
        <div className="h-7 rounded-md border border-dashed border-accent bg-accent-soft" style={{ marginLeft: pad + 20 }} />
      </div>
    );
  }

  return (
    <div ref={p.overlay ? undefined : sortable.setNodeRef} style={style} className={cn(sortable.isDragging && !p.overlay && 'opacity-40', isGroup && 'mt-2.5 first:mt-0')}
      onContextMenu={(e: MouseEvent) => { if (!isGroup || p.canEdit) { e.preventDefault(); p.setMenuOpen(true); } }}>
      <div className={cn(rowCls, p.active && 'bg-accent-soft font-medium text-ink hover:bg-accent-soft focus-within:bg-accent-soft', p.overlay && 'bg-raised shadow-pop')} style={{ paddingLeft: pad }}>
        {!isGroup && p.canEdit && <DragHandle ref={sortable.setActivatorNodeRef} attributes={{ ...sortable.attributes, tabIndex: -1 }} listeners={sortable.listeners} disabled={p.dragDisabled}
          label={`Arrastrar ${pageText((item.data as { page: StructurePage }).page)}`} className="-ml-0.5 opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100" />}
        {p.hasChildren || isGroup
          ? <button type="button" tabIndex={-1} aria-hidden="true" onClick={p.onToggle} className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-sm text-ink-3 hover:bg-muted"><ChevronRight size={14} className={cn('transition-transform', p.open && 'rotate-90')} /></button>
          : <span className="w-5 shrink-0" />}
        {isGroup ? (
          rename ? (
            <Input size="sm" autoFocus value={val} aria-label="Nombre del grupo" onChange={(e) => setVal(e.target.value)} onBlur={() => p.onRename(val)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') p.onRename(val); if (e.key === 'Escape') p.onRename(null); }} />
          ) : (
            <button type="button" {...common} onClick={p.onToggle} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3 outline-offset-[-2px] hover:text-ink-2">
              <span className="truncate">{(item.data as { name: string }).name || 'Sin grupo'}</span>
              <span className="text-[11px] font-normal tabular-nums normal-case tracking-normal text-ink-3">{p.count}</span>
            </button>
          )
        ) : (
          <a href={`#/contenido/${(item.data as { page: { id: number } }).page.id}`} {...common} aria-selected={p.active} aria-current={p.active ? 'page' : undefined}
            className={cn('flex min-w-0 flex-1 items-center gap-2 py-1 text-ink no-underline outline-offset-[-2px] hover:no-underline', !p.active && 'text-ink-2 hover:text-ink')}>
            <span className="truncate">{pageText((item.data as { page: StructurePage }).page)}</span>
            {(item.data as { page: { status: string } }).page.status === 'draft'
              ? <Tooltip content="Borrador"><span className="size-1.5 shrink-0 rounded-full bg-warn-dot" aria-label="Borrador" /></Tooltip>
              : p.modified ? <Tooltip content="Cambios sin publicar"><span className="size-1.5 shrink-0 rounded-full border border-warn-dot" aria-label="Cambios sin publicar" /></Tooltip> : null}
            {p.full && <span className="ml-auto truncate pl-3 font-mono text-xs font-normal text-ink-3 max-md:hidden">{(item.data as { page: { route: string } }).page.route}</span>}
          </a>
        )}
        {!rename && (
          <span className={cn('flex shrink-0 items-center opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100', p.menuOpen && 'opacity-100')}>
            {isGroup && p.onCreateHere && <IconButton size="icon-sm" className="size-6" tabIndex={-1} label="Crear página en este grupo" icon={<Plus size={14} />} onClick={p.onCreateHere} />}
            {(!isGroup || p.canEdit) && <DropdownMenu open={p.menuOpen} onOpenChange={p.setMenuOpen} align="start" items={p.menu} label="Acciones"
              trigger={<IconButton size="icon-sm" className="size-6" tabIndex={-1} tooltip={false} label="Más acciones" icon={<Ellipsis size={14} />} />} />}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Sección (un contexto de arrastre por sección) ---------- */
function SectionTree({ section, tree, actions, activeId, full, open, setOpen, focusKey, setFocusKey, onCreate, dragDisabled }: {
  section: CSection; tree: ContentTreeState; actions: Actions; activeId?: number; full: boolean; open: Record<string, boolean>; setOpen: (k: string, v: boolean) => void;
  focusKey: string; setFocusKey: (k: string) => void; onCreate: (i: CreateInit) => void; dragDisabled: boolean;
}) {
  const { user } = useAuth();
  const canEdit = can(user, 'editor');
  const sensors = useDndSensors();
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [overId, setOverId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const isOpen = (id: string) => open[id] ?? (full || id.startsWith('g:'));

  const all = useMemo(() => flattenTree(section.nodes), [section.nodes]);
  const collapsed = all.filter((i) => !isOpen(i.id)).map((i) => i.id);
  const visible = useMemo(() => removeChildrenOf(all, activeDrag ? [...collapsed, activeDrag] : collapsed), [all, collapsed.join(','), activeDrag]); // eslint-disable-line react-hooks/exhaustive-deps
  const projection: Projection | null = activeDrag && overId ? getProjection(visible, activeDrag, overId, offsetX, INDENT, { min: 1, max: MAX_PAGE_DEPTH }) : null;
  const hasKids = (id: string) => all.some((i) => i.parentId === id);
  const label = (id: string | number) => { const it = all.find((i) => i.id === id); return it ? (it.data.kind === 'group' ? `el grupo ${it.data.name || 'sin nombre'}` : pageText(it.data.page)) : 'la página'; };

  const commit = (nodes: CNode[] | null) => { if (nodes) void tree.saveSection(section.key, nodes, section.nodes); };
  const depthOf = (id: string) => all.find((i) => i.id === id)?.depth ?? 0;

  const onDragEnd = () => {
    const a = activeDrag, o = overId, p = projection;
    setActiveDrag(null); setOverId(null); setOffsetX(0);
    if (!a || !o || !p) return;
    const oIdx = visible.findIndex((i) => i.id === o);
    if (oIdx === 0) return; // no se puede quedar por encima del primer grupo
    const cur = all.find((i) => i.id === a)!;
    if (a === o && cur.depth === p.depth && cur.parentId === p.parentId) return;
    // Opera sobre la lista completa: los hijos de nodos plegados siguen a su padre por parentId.
    const moved = applyMove(all, a, o, p);
    if (p.depth + Math.max(0, ...moved.filter((i) => isDescendant(moved, i.id, a)).map((i) => i.depth - cur.depth)) > MAX_PAGE_DEPTH) return;
    commit(buildTree(moved));
    if (p.parentId) setOpen(p.parentId, true);
  };

  const pageMenu = (it: FlatNode<NodeData>): MenuEntry[] => {
    if (it.data.kind === 'group') {
      const gi = section.nodes.findIndex((g) => g.id === it.id);
      const gname = it.data.name;
      const empty = !all.some((x) => x.parentId === it.id);
      return [
        { label: 'Crear página aquí', icon: <FilePlus size={16} />, onSelect: () => onCreate({ seccion: section.key, grupo: gname }) },
        { label: 'Renombrar grupo', icon: <Pencil size={16} />, onSelect: () => setRenaming(it.id) },
        // Fuera de la Guía los grupos van en el orden del manual (General primero, luego alfabético): no se reordenan a mano.
        ...(section.key === 'guia' ? [
          { label: 'Subir grupo', icon: <ArrowUp size={16} />, disabled: gi <= 0, onSelect: () => commit(moveSibling(section.nodes, it.id, -1)) },
          { label: 'Bajar grupo', icon: <ArrowDown size={16} />, disabled: gi >= section.nodes.length - 1, onSelect: () => commit(moveSibling(section.nodes, it.id, 1)) },
        ] : []),
        { separator: true } as const,
        { label: empty ? 'Eliminar grupo' : 'Eliminar grupo (solo si está vacío)', icon: <Trash2 size={16} />, danger: true, disabled: !empty, onSelect: () => void tree.deleteGroup(section.key, gname) },
      ];
    }
    const pg = it.data.page;
    const grp = all.slice(0, all.indexOf(it)).reverse().find((x) => x.depth === 0);
    const ref = { id: pg.id, title: pg.title, route: pg.route, seccion: section.key, grupo: grp && grp.data.kind === 'group' ? grp.data.name : '' };
    return [
      { label: 'Abrir', icon: <PanelTop size={16} />, onSelect: () => go(`/contenido/${pg.id}`) },
      ...(pg.status === 'published' ? [{ label: 'Ver en el sitio', icon: <ExternalLink size={16} />, href: siteHref(pg.route), external: true }] : []),
      ...(canEdit ? [
        { separator: true } as const,
        { label: 'Añadir subpágina', icon: <FilePlus size={16} />, disabled: it.depth >= MAX_PAGE_DEPTH, onSelect: () => onCreate({ seccion: section.key, grupo: ref.grupo, parentId: pg.id }) },
        { label: 'Duplicar', icon: <Copy size={16} />, onSelect: () => void actions.duplicate(ref) },
        { label: 'Mover o cambiar dirección…', icon: <FolderInput size={16} />, onSelect: () => actions.move(ref) },
        { separator: true } as const,
        { label: 'Eliminar…', icon: <Trash2 size={16} />, danger: true, onSelect: () => actions.remove(ref) },
      ] : []),
    ];
  };

  const onRowKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const key = (e.target as HTMLElement).closest<HTMLElement>('[data-tree-row]')?.dataset.key;
    if (!key || !e.altKey || !canEdit || dragDisabled || !key.startsWith('p:')) return;
    let next: CNode[] | null = null;
    if (e.key === 'ArrowUp') next = moveSibling(section.nodes, key, -1);
    else if (e.key === 'ArrowDown') next = moveSibling(section.nodes, key, 1);
    else if (e.key === 'ArrowRight') next = indentNode(section.nodes, key, MAX_PAGE_DEPTH, depthOf);
    else if (e.key === 'ArrowLeft') next = outdentNode(section.nodes, key, 1, depthOf);
    else return;
    e.preventDefault(); e.stopPropagation();
    if (next) { commit(next); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-key="${key}"]`)?.focus()); }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} accessibility={{ announcements: announcements(label) }}
      onDragStart={(e: DragStartEvent) => { setActiveDrag(String(e.active.id)); setOverId(String(e.active.id)); }}
      onDragMove={(e: DragMoveEvent) => setOffsetX(e.delta.x)} onDragOver={(e) => setOverId(e.over ? String(e.over.id) : null)}
      onDragEnd={onDragEnd} onDragCancel={() => { setActiveDrag(null); setOverId(null); setOffsetX(0); }}>
      <SortableContext items={visible.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div role="group" onKeyDown={onRowKey}>
          {visible.map((it) => (
            <TreeRow key={it.id} item={it} section={section} full={full} canEdit={canEdit} dragDisabled={dragDisabled || !canEdit}
              depth={it.id === activeDrag && projection ? projection.depth : it.depth}
              open={isOpen(it.id)} hasChildren={it.data.kind === 'group' || hasKids(it.id)} onToggle={() => setOpen(it.id, !isOpen(it.id))}
              active={it.data.kind === 'page' && it.data.page.id === activeId} focusKey={focusKey} onFocus={() => setFocusKey(it.id)}
              modified={it.data.kind === 'page' && tree.modified.has(it.data.page.id)}
              menuOpen={menuFor === it.id} setMenuOpen={(o) => setMenuFor(o ? it.id : null)} menu={pageMenu(it)}
              onCreateHere={canEdit && it.data.kind === 'group' ? () => onCreate({ seccion: section.key, grupo: it.data.kind === 'group' ? it.data.name : '' }) : undefined}
              renaming={renaming === it.id} count={it.data.kind === 'group' ? all.filter((x) => x.parentId === it.id).length : undefined}
              onRename={(v) => {
                setRenaming(null);
                const name = v?.trim();
                if (!name || it.data.kind !== 'group' || name === it.data.name) return;
                if (section.nodes.some((g) => g.data.kind === 'group' && g.data.name === name)) return;
                commit(section.nodes.map((g) => (g.id === it.id ? { ...g, id: groupKey(section.key, name), data: { kind: 'group', name } } : g)));
              }} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeDrag ? (() => { const it = all.find((i) => i.id === activeDrag)!; return (
          <TreeRow overlay item={it} section={section} full={full} canEdit depth={projection?.depth ?? it.depth} open={false} hasChildren={hasKids(it.id)} onToggle={() => {}} active={false} focusKey="" onFocus={() => {}}
            modified={false} menuOpen={false} setMenuOpen={() => {}} menu={[]} renaming={false} onRename={() => {}} dragDisabled={false} />
        ); })() : null}
      </DragOverlay>
    </DndContext>
  );
}
const isDescendant = (items: FlatNode<NodeData>[], id: string, ancestor: string): boolean => {
  let cur = items.find((i) => i.id === id);
  while (cur?.parentId) { if (cur.parentId === ancestor) return true; const pid: string = cur.parentId; cur = items.find((i) => i.id === pid); }
  return false;
};

/* ---------- Fila fija (portada de la sección, ítems del desplegable): no se arrastra ---------- */
function FixedRow({ page, text, active, focusKey, setFocusKey, parent, hint }: {
  page: { id: number; route: string; status: string } | null; text: string; active: boolean; focusKey: string; setFocusKey: (k: string) => void; parent: string; hint?: string;
}) {
  const key = page ? `f:${parent}:${page.id}` : `f:${parent}:${text}`;
  const body = (
    <>
      <span className="w-5 shrink-0" />
      <span className="truncate">{text}</span>
      {page?.status === 'draft' && <Tooltip content="Borrador"><span className="size-1.5 shrink-0 rounded-full bg-warn-dot" aria-label="Borrador" /></Tooltip>}
      {hint && <span className="ml-auto truncate pl-2 font-mono text-xs font-normal text-ink-3 max-md:hidden">{hint}</span>}
    </>
  );
  const cls = cn('flex min-h-8 min-w-0 items-center gap-1 rounded-md py-1 pl-1.5 pr-2 text-[13.5px] no-underline outline-offset-[-2px] hover:no-underline', active ? 'bg-accent-soft font-medium text-ink' : 'text-ink-2 hover:bg-subtle hover:text-ink');
  return page ? (
    <a href={`#/contenido/${page.id}`} data-tree-row data-key={key} data-parent={parent} role="treeitem" aria-level={2} aria-selected={active} aria-current={active ? 'page' : undefined}
      tabIndex={focusKey === key ? 0 : -1} onFocus={() => setFocusKey(key)} className={cls}>{body}</a>
  ) : (
    <div role="treeitem" aria-level={2} aria-disabled="true" className={cn(cls, 'cursor-default opacity-70 hover:bg-transparent')}>{body}</div>
  );
}

/* ---------- Barra lateral de una sección: portada + grupos + «Nuevo grupo» ---------- */
function SidebarBlock({ section, title, tree, actions, activeId, full, openMap, setOpen, focusKey, setFocusKey, onCreate, dragDisabled, canEdit, onNewGroup, parent }: {
  section: CSection; title?: string; tree: ContentTreeState; actions: Actions; activeId?: number; full: boolean; openMap: Record<string, boolean>; setOpen: (k: string, v: boolean) => void;
  focusKey: string; setFocusKey: (k: string) => void; onCreate: (i: CreateInit) => void; dragDisabled: boolean; canEdit: boolean; onNewGroup: (seccion: string) => void; parent: string;
}) {
  return (
    <div className="pb-1">
      {title && <p className="mb-1 mt-3 flex items-center gap-2 px-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-accent-text"><span>{title}</span><span className="h-px flex-1 bg-line" /></p>}
      {section.sectionIndex && (
        <FixedRow page={section.sectionIndex} text="Portada de la sección" parent={parent} focusKey={focusKey} setFocusKey={setFocusKey}
          active={section.sectionIndex.id === activeId} hint={section.sectionIndex.route} />
      )}
      <SectionTree section={section} tree={tree} actions={actions} activeId={activeId} full={full} open={openMap} setOpen={setOpen}
        focusKey={focusKey} setFocusKey={setFocusKey} onCreate={onCreate} dragDisabled={dragDisabled} />
      {section.nodes.length === 0 && <p className="px-2 py-2 text-xs text-ink-3">Esta sección aún no tiene páginas.</p>}
      {canEdit && (
        <Button size="sm" variant="ghost" className="mt-2 w-full justify-start text-ink-3 hover:text-ink" onClick={() => onNewGroup(section.key)}>
          <Plus size={14} /> Nuevo grupo
        </Button>
      )}
    </div>
  );
}

/* ---------- Árbol completo ---------- */
export function ContentTree({ tree, actions, activeId, variant = 'sidebar', onCreate, className }: {
  tree: ContentTreeState; actions: Actions; activeId?: number; variant?: 'sidebar' | 'full'; onCreate: (i: CreateInit) => void; className?: string;
}) {
  const { user } = useAuth();
  const canEdit = can(user, 'editor');
  const full = variant === 'full';
  const [openMap, setOpenMap] = useLocalStorage<Record<string, boolean>>(full ? 'portal-structure-open' : 'portal-tree-open', {});
  const [topOpen, setTopOpen] = useLocalStorage<string>(full ? 'portal-structure-top' : 'portal-tree-top', 'guia'); // una sección abierta a la vez
  const [filter, setFilter] = useState('');
  const [focusKey, setFocusKey] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const setOpen = (k: string, v: boolean) => setOpenMap((m) => ({ ...m, [k]: v }));
  const [newGroup, setNewGroup] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const secOf = (key: string) => tree.sections?.find((x) => x.key === key);
  // Entrada del menú superior a la que pertenece cada sección (Conceptos cuelga del desplegable Referencia).
  const topOf = (seccion: string) => tree.menu.find((m) => m.seccion === seccion || m.extraSecciones.includes(seccion));
  const groupExists = !!secOf(newGroup ?? '')?.nodes.some((g) => g.data.kind === 'group' && g.data.name === groupName.trim());
  const addGroup = async () => {
    const s = secOf(newGroup ?? '');
    const name = groupName.trim();
    if (!s || !name || groupExists) return;
    if (await tree.createGroup(s.key, name)) setNewGroup(null);
  };

  /* Abre el camino hasta la página activa y la enfoca como punto de entrada del árbol. */
  const activeInfo = activeId != null ? tree.index.get(activeId) : undefined;
  useEffect(() => {
    if (!activeInfo) return;
    const top = topOf(activeInfo.section.key);
    if (top) setTopOpen(top.key);
    const keys = [groupKey(activeInfo.section.key, activeInfo.group)];
    let p = activeInfo.parentId;
    while (p != null) { keys.push(pageKey(p)); p = tree.index.get(p)?.parentId ?? null; }
    setOpenMap((m) => (keys.every((k) => m[k] !== false && (k.startsWith('g:') || m[k])) ? m : { ...m, ...Object.fromEntries(keys.map((k) => [k, true])) }));
    setFocusKey(pageKey(activeId!));
    requestAnimationFrame(() => box.current?.querySelector(`[data-key="${pageKey(activeId!)}"]`)?.scrollIntoView({ block: 'nearest' }));
  }, [activeId, activeInfo?.section.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey) return;
    const rows = Array.from(box.current?.querySelectorAll<HTMLElement>('[data-tree-row]') ?? []);
    const cur = (e.target as HTMLElement).closest<HTMLElement>('[data-tree-row]');
    if (!cur) return;
    const i = rows.indexOf(cur);
    const focus = (el?: HTMLElement) => { if (el) { e.preventDefault(); el.focus(); } };
    const exp = cur.getAttribute('aria-expanded');
    const k = cur.dataset.key!;
    if (e.key === 'ArrowDown') focus(rows[i + 1]);
    else if (e.key === 'ArrowUp') focus(rows[i - 1]);
    else if (e.key === 'Home') focus(rows[0]);
    else if (e.key === 'End') focus(rows[rows.length - 1]);
    else if (e.key === 'ArrowRight') { if (exp === 'false') { e.preventDefault(); if (k.startsWith('t:')) setTopOpen(k.slice(2)); else setOpen(k, true); } else focus(rows[i + 1]); }
    else if (e.key === 'ArrowLeft') { if (exp === 'true') { e.preventDefault(); if (k.startsWith('t:')) setTopOpen(''); else setOpen(k, false); } else focus(rows.find((r) => r.dataset.key === cur.dataset.parent)); }
    else if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') { e.preventDefault(); cur.closest('[data-key]')?.parentElement?.dispatchEvent(new globalThis.MouseEvent('contextmenu', { bubbles: true })); }
  };

  const q = filter.trim().toLowerCase();
  const matches = useMemo(() => (q ? Array.from(tree.index.values()).filter((x) => `${pageText(x.page)} ${x.page.title} ${x.page.route}`.toLowerCase().includes(q)).slice(0, 80) : []), [q, tree.index]);
  const blockProps = { tree, actions, activeId, full, openMap, setOpen, focusKey, setFocusKey, onCreate, dragDisabled: !!q, canEdit, onNewGroup: (k: string) => { setNewGroup(k); setGroupName(''); } };

  const topRow = (m: StructureMenu) => {
    const key = `t:${m.key}`;
    const open = topOpen === m.key;
    const secs = [m.seccion, ...m.extraSecciones].filter((k): k is string => !!k).map((k) => secOf(k)).filter((x): x is CSection => !!x);
    const count = secs.reduce((n, s) => n + countPages(s.nodes), 0);
    if (m.kind === 'external') {
      return (
        <div key={m.key} className="mb-0.5">
          <div className="flex min-h-9 items-center gap-1 rounded-md py-1 pl-1.5 pr-2 text-[14px] font-semibold text-ink-2">
            <span className="w-4" /><span className="truncate pl-0.5">{m.text}</span><ExternalLink size={13} className="ml-1 shrink-0 text-ink-3" />
            <span className="ml-auto rounded-sm bg-muted px-1.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-3">Enlace externo</span>
          </div>
          <p className="ml-6 pb-1 pr-2 text-xs leading-relaxed text-ink-3">{m.help} <span className="break-all font-mono">{m.href}</span></p>
        </div>
      );
    }
    return (
      <div key={m.key} className="mb-0.5">
        <div className="group/row flex min-h-9 items-center gap-1 rounded-md pr-1 hover:bg-subtle focus-within:bg-subtle">
          <button type="button" data-tree-row data-key={key} role="treeitem" aria-level={1} aria-expanded={open} tabIndex={focusKey === key || (!focusKey && m === tree.menu[0]) ? 0 : -1}
            onFocus={() => setFocusKey(key)} onClick={() => setTopOpen(open ? '' : m.key)}
            className={cn('flex min-w-0 flex-1 cursor-pointer items-center gap-1 py-1 pl-0.5 text-left text-[14px] font-semibold outline-offset-[-2px]', open ? 'text-accent-text' : 'text-ink')}>
            <ChevronRight size={14} className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
            <span className="truncate pl-0.5">{m.text}</span>
            {m.kind === 'dropdown' && <span className="ml-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-3">menú</span>}
            <span className="ml-auto pl-2 text-xs font-normal tabular-nums text-ink-3">{count}</span>
          </button>
          {canEdit && m.seccion && <span className="flex opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
            <IconButton size="icon-sm" className="size-6" tabIndex={-1} label={`Crear página en ${m.text}`} icon={<Plus size={14} />} onClick={() => onCreate({ seccion: m.seccion! })} />
          </span>}
        </div>
        {open && (
          <div className="ml-2 border-l border-line pl-1.5" role="group">
            {m.kind === 'dropdown' && (
              <div className="pb-1">
                <p className="mb-1 mt-1 flex items-center gap-2 px-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-accent-text"><span>Menú desplegable</span><span className="h-px flex-1 bg-line" /></p>
                {m.items.map((it) => (
                  <FixedRow key={it.link} page={it.page} text={it.text} parent={key} focusKey={focusKey} setFocusKey={setFocusKey} active={!!it.page && it.page.id === activeId} />
                ))}
                <p className="px-2 pb-1 pt-1 text-xs leading-relaxed text-ink-3">El orden de estos enlaces se define en el tema del manual; aquí se abre cada página para editarla.</p>
              </div>
            )}
            {secs.map((s) => (
              <SidebarBlock key={s.key} section={s} parent={key} title={m.kind === 'dropdown' ? `Barra lateral de ${s.key === m.seccion ? m.text : s.label}` : undefined} {...blockProps} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-coach="tree" className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex items-center gap-1.5 px-2 pb-2 pt-2.5">
        <SearchInput size="sm" aria-label="Filtrar páginas del árbol" placeholder="Filtrar páginas" value={filter} onValueChange={setFilter} />
        {canEdit && <IconButton label="Crear página" icon={<FilePlus size={16} />} onClick={() => onCreate({ seccion: activeInfo?.section.key ?? 'tareas', grupo: activeInfo?.group })} />}
      </div>
      <div ref={box} role="tree" aria-label="Menú del manual" onKeyDown={onKey} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {tree.error ? <ErrorState error={tree.error} onRetry={() => void tree.reload()} /> : !tree.sections ? <Spinner block /> : q ? (
          matches.length === 0 ? <p className="px-2 py-4 text-sm text-ink-3">Ninguna página coincide con «{filter.trim()}».</p> : (
            <ul className="m-0 list-none p-0">
              {matches.map((x) => (
                <li key={x.page.id}>
                  <a href={`#/contenido/${x.page.id}`} data-tree-row data-key={pageKey(x.page.id)} role="treeitem" aria-level={1} tabIndex={focusKey === pageKey(x.page.id) || (!focusKey && x === matches[0]) ? 0 : -1} onFocus={() => setFocusKey(pageKey(x.page.id))}
                    className={cn('flex flex-col rounded-md px-2 py-1.5 text-ink no-underline hover:bg-subtle hover:no-underline', x.page.id === activeId && 'bg-accent-soft')}>
                    <span className="truncate text-[13.5px]">{pageText(x.page)}</span>
                    <span className="truncate text-xs text-ink-3">{topOf(x.section.key)?.text ?? x.section.label}{x.section.key === 'conceptos' ? ' › Conceptos' : ''}{x.group ? ` › ${x.group}` : ''}</span>
                  </a>
                </li>
              ))}
            </ul>
          )
        ) : tree.menu.map(topRow)}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-line px-3 py-2 text-[11.5px] text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-warn-dot" />Borrador</span>
        {canEdit && <span className="ml-auto max-lg:hidden">Alt+flechas mueve</span>}
      </div>
      <Dialog open={!!newGroup} onOpenChange={(o) => !o && setNewGroup(null)} size="sm" title="Crear grupo" description="Aparece como encabezado en la barra lateral de la sección. Un grupo vacío solo se ve aquí hasta que tenga páginas."
        footer={<><Button onClick={() => setNewGroup(null)}>Cancelar</Button><Button variant="primary" disabled={!groupName.trim() || groupExists} onClick={() => void addGroup()}>Crear grupo</Button></>}>
        <Field label="Nombre del grupo" error={groupExists ? 'Ya existe un grupo con ese nombre en esta sección.' : undefined}>
          {(id, d) => <Input id={id} aria-describedby={d} autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void addGroup(); }} />}
        </Field>
      </Dialog>
    </div>
  );
}
