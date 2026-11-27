/*
 * Aplicar lo que la IA propuso, SIEMPRE con las rutas de páginas de siempre (la IA no escribe nada por su cuenta):
 *   crear  → POST /api/pages + PUT /api/pages/:id (nace borrador);
 *   editar otra página → PUT /api/pages/:id (el servidor guarda la revisión anterior);
 *   mover  → POST /api/pages/:id/move.
 */
import { ApiError, api, type Page } from '@/lib/api';
import { aiApi, type EditProposal, type MoveProposal } from '@/lib/api.ai';
import { contentChanged } from '@/lib/util';
import { bodyWithTitle, createPayload, type DraftForm } from './aiModel';

/** Crea el borrador. Si la página se creó pero no se pudo cargar el contenido, `saveError` lleva el motivo (la página vacía existe). */
export async function createDraft(f: DraftForm): Promise<{ page: Page; saveError: unknown | null }> {
  const page = await api.createPage(createPayload(f));
  try {
    const saved = await api.savePage(page.id, { version: page.version, body: bodyWithTitle(f.body, f.title) });
    contentChanged();
    void aiApi.applied('create', page.id).catch(() => {});
    return { page: saved, saveError: null };
  } catch (e) {
    contentChanged();
    return { page, saveError: e };
  }
}

/** Edita otra página (no la abierta): comprueba que no cambió desde la propuesta y guarda. Devuelve `undo` (restaura la revisión anterior). */
export async function applyEditOther(p: EditProposal): Promise<{ page: Page; undo: () => Promise<void> }> {
  const cur = await api.page(p.page.id);
  if (cur.version !== p.baseVersion) throw new ApiError(409, 'La página cambió desde que la IA hizo la propuesta. Pídela de nuevo para trabajar sobre la versión actual.');
  const saved = await api.savePage(p.page.id, { version: cur.version, body: p.after });
  contentChanged();
  void aiApi.applied('edit', p.page.id).catch(() => {});
  const undo = async () => {
    const revs = await api.revisions(p.page.id);
    const prev = revs[0]; // la revisión más reciente es el estado anterior a este cambio
    if (!prev) throw new ApiError(404, 'No se encontró la revisión anterior: vuelve desde la pestaña Revisiones de la página.');
    await api.restoreRevision(p.page.id, prev.id);
    contentChanged();
  };
  return { page: saved, undo };
}

export async function applyMove(p: MoveProposal): Promise<Page> {
  const moved = await api.movePage(p.page.id, p.payload as Record<string, unknown>);
  contentChanged();
  void aiApi.applied('move', p.page.id).catch(() => {});
  return moved;
}
