/*
 * Utilidades de árbol para arrastrar y soltar con @dnd-kit (patrón «sortable tree»).
 * El árbol se aplana en una lista (preorden) con `depth` y `parentId`; durante el arrastre
 * la profundidad se proyecta con el desplazamiento horizontal. Al soltar se reconstruye por `parentId`.
 * Genérico: lo usan el árbol de páginas y puede usarlo cualquier lista anidada (bloques, tours).
 */
import { arrayMove } from '@dnd-kit/sortable';

export interface TreeNode<T> { id: string; data: T; children: TreeNode<T>[] }
export interface FlatNode<T> { id: string; parentId: string | null; depth: number; data: T }

export function flattenTree<T>(nodes: TreeNode<T>[], parentId: string | null = null, depth = 0): FlatNode<T>[] {
  return nodes.flatMap((n) => [{ id: n.id, parentId, depth, data: n.data }, ...flattenTree(n.children, n.id, depth + 1)]);
}

export function buildTree<T>(flat: FlatNode<T>[]): TreeNode<T>[] {
  const root: TreeNode<T>[] = [];
  const map = new Map<string, TreeNode<T>>();
  for (const f of flat) map.set(f.id, { id: f.id, data: f.data, children: [] });
  for (const f of flat) {
    const node = map.get(f.id)!;
    const parent = f.parentId ? map.get(f.parentId) : null;
    (parent ? parent.children : root).push(node);
  }
  return root;
}

/** Quita de la lista los descendientes de `ids` (nodos plegados o el que se arrastra). */
export function removeChildrenOf<T>(items: FlatNode<T>[], ids: string[]): FlatNode<T>[] {
  const hide = new Set(ids);
  return items.filter((it) => {
    if (it.parentId && hide.has(it.parentId)) { hide.add(it.id); return false; }
    return true;
  });
}

export function descendantsCount<T>(items: FlatNode<T>[], id: string): number {
  const set = new Set([id]);
  let n = 0;
  for (const it of items) if (it.parentId && set.has(it.parentId)) { set.add(it.id); n++; }
  return n;
}

export interface Projection { depth: number; parentId: string | null; minDepth: number; maxDepth: number }
/**
 * Profundidad y padre que tendría `activeId` si se suelta sobre `overId` con un desplazamiento
 * horizontal `offsetX`. `limits` acota la profundidad (p. ej. páginas entre 1 y 3 bajo un grupo de nivel 0).
 */
export function getProjection<T>(items: FlatNode<T>[], activeId: string, overId: string, offsetX: number, indent: number, limits: { min: number; max: number }): Projection {
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const moved = arrayMove(items, activeIndex, overIndex);
  const prev = moved[overIndex - 1];
  const next = moved[overIndex + 1];
  const projected = items[activeIndex].depth + Math.round(offsetX / indent);
  const maxDepth = Math.min(limits.max, prev ? prev.depth + 1 : limits.min);
  const minDepth = Math.max(limits.min, next ? Math.min(next.depth, maxDepth) : limits.min);
  const depth = Math.min(Math.max(projected, minDepth), maxDepth);
  let parentId: string | null = null;
  if (prev && depth > 0) {
    if (depth === prev.depth) parentId = prev.parentId;
    else if (depth > prev.depth) parentId = prev.id;
    else parentId = moved.slice(0, overIndex).reverse().find((i) => i.depth === depth)?.parentId ?? null;
  }
  return { depth, parentId, minDepth, maxDepth };
}

/** Aplica un movimiento ya proyectado y devuelve la lista plana resultante. */
export function applyMove<T>(items: FlatNode<T>[], activeId: string, overId: string, p: Projection): FlatNode<T>[] {
  const a = items.findIndex((i) => i.id === activeId);
  const o = items.findIndex((i) => i.id === overId);
  const clone = items.map((i) => (i.id === activeId ? { ...i, depth: p.depth, parentId: p.parentId } : i));
  return arrayMove(clone, a, o);
}

/* Movimientos por teclado sobre el árbol (sin arrastrar). Devuelven null si no es posible. */
export function moveSibling<T>(nodes: TreeNode<T>[], id: string, dir: -1 | 1): TreeNode<T>[] | null {
  const walk = (list: TreeNode<T>[]): TreeNode<T>[] | null => {
    const i = list.findIndex((n) => n.id === id);
    if (i >= 0) { const j = i + dir; if (j < 0 || j >= list.length) return null; const c = [...list]; [c[i], c[j]] = [c[j], c[i]]; return c; }
    for (let k = 0; k < list.length; k++) { const r = walk(list[k].children); if (r) { const c = [...list]; c[k] = { ...list[k], children: r }; return c; } }
    return null;
  };
  return walk(nodes);
}
/** Sangrar: pasa a ser el último hijo del hermano anterior. */
export function indent<T>(nodes: TreeNode<T>[], id: string, maxDepth: number, depthOf: (id: string) => number): TreeNode<T>[] | null {
  const walk = (list: TreeNode<T>[]): TreeNode<T>[] | null => {
    const i = list.findIndex((n) => n.id === id);
    if (i > 0) {
      if (depthOf(id) + 1 + subtreeDepth(list[i]) > maxDepth) return null;
      const c = [...list]; const [me] = c.splice(i, 1); c[i - 1] = { ...c[i - 1], children: [...c[i - 1].children, me] }; return c;
    }
    if (i === 0) return null;
    for (let k = 0; k < list.length; k++) { const r = walk(list[k].children); if (r) { const c = [...list]; c[k] = { ...list[k], children: r }; return c; } }
    return null;
  };
  return walk(nodes);
}
/** Desangrar: sale de su padre y queda justo después de él. `minDepth` impide salir de un grupo. */
export function outdent<T>(nodes: TreeNode<T>[], id: string, minDepth: number, depthOf: (id: string) => number): TreeNode<T>[] | null {
  if (depthOf(id) <= minDepth) return null;
  const walk = (list: TreeNode<T>[]): TreeNode<T>[] | null => {
    for (let k = 0; k < list.length; k++) {
      const i = list[k].children.findIndex((n) => n.id === id);
      if (i >= 0) {
        const kids = [...list[k].children]; const [me] = kids.splice(i, 1);
        const c = [...list]; c[k] = { ...list[k], children: kids }; c.splice(k + 1, 0, me); return c;
      }
      const r = walk(list[k].children);
      if (r) { const c = [...list]; c[k] = { ...list[k], children: r }; return c; }
    }
    return null;
  };
  return walk(nodes);
}
export const subtreeDepth = <T,>(n: TreeNode<T>): number => (n.children.length ? 1 + Math.max(...n.children.map(subtreeDepth)) : 0);
