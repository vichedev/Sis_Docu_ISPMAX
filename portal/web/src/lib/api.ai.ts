/* API del asistente de IA (servidor: portal/server/routes/ai.mjs). Nunca recibe ni devuelve la clave guardada. */
import { ApiError, UNAUTH_EVENT, request } from './api';
import { apiUrl } from './apiBase';
import type { AiUsage } from '@/features/ai/aiModel';

export type AssistAction = 'rewrite' | 'shorten' | 'expand' | 'fix' | 'steps' | 'custom';
export interface AiStatus { enabled: boolean; configured: boolean; model: string }
export interface AiConfig { configured: boolean; source: 'ajustes' | 'entorno' | null; model: string; enabled: boolean; active: boolean; unreadable: boolean; suggestedModels: string[]; rate: number }
export interface AiTestResult { ok: boolean; model?: string; ms?: number; code?: string; error?: string }
export interface AssistResult { text: string; avisos: string[]; model: string }
export interface DraftProposal {
  title: string; slug: string; route: string; description: string; tipo: string; seccion: string; modulo: string | null; grupo: string;
  parentId: number | null; motivo: string; needsModulo: boolean; body: string; avisos: string[];
}
export interface OutlinePage { id: number; title: string; route: string; status: string; parent_id: number | null }
export interface OutlineSection { key: string; label: string; modulos: string[]; grupos: { name: string; pages: OutlinePage[] }[] }

export const aiApi = {
  status: () => request<AiStatus>('GET', '/api/ai/status'),
  outline: () => request<{ secciones: OutlineSection[] }>('GET', '/api/ai/outline'),
  assist: (b: { action: AssistAction; text: string; instruction?: string; context?: string }) => request<AssistResult>('POST', '/api/ai/assist', b),
  draftPage: (b: { description: string; parent?: number }) => request<{ proposal: DraftProposal; model: string }>('POST', '/api/ai/draft-page', b),
  config: () => request<AiConfig>('GET', '/api/ai/config'),
  /** `apiKey` solo viaja al guardar; el servidor la cifra y no la devuelve. */
  saveConfig: (b: { apiKey?: string; model?: string; enabled?: boolean; clearKey?: boolean }) => request<AiConfig>('PUT', '/api/ai/config', b),
  test: (b: { apiKey?: string; model?: string } = {}) => request<AiTestResult>('POST', '/api/ai/test', b),
  usage: () => request<AiUsage>('GET', '/api/ai/usage'),
  /** Actualizar a petición: una llamada mínima (max_tokens = 1) solo para leer las cabeceras de límite. */
  usageRefresh: () => request<AiUsage>('POST', '/api/ai/usage/refresh', {}),
  chat: (b: { messages: ChatMessage[]; context?: ChatContext }, signal?: AbortSignal) => request<ChatResponse>('POST', '/api/ai/chat', b, undefined, signal),
  conversations: (f: { q?: string; limit?: number; offset?: number } = {}) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== '') p.set(k, String(v));
    return request<{ total: number; items: ConversationRow[] }>('GET', '/api/ai/conversations' + (p.toString() ? '?' + p : ''));
  },
  conversation: (id: number) => request<{ conversation: ConversationRow; messages: StoredMessage[] }>('GET', '/api/ai/conversations/' + id),
  renameConversation: (id: number, title: string) => request<{ ok: boolean }>('PUT', '/api/ai/conversations/' + id, { title }),
  deleteConversation: (id: number) => request<{ ok: boolean }>('DELETE', '/api/ai/conversations/' + id),
  clearHistory: () => request<{ ok: boolean; deleted: number }>('DELETE', '/api/ai/conversations'),
  proposalState: (messageId: number, index: number, state: 'applied' | 'discarded', openPageId?: number) => request<{ ok: boolean }>('PUT', '/api/ai/messages/' + messageId + '/proposal-state', { index, state, open_page_id: openPageId }),
  /** Avisa a la auditoría de que la persona aplicó una propuesta. */
  applied: (kind: 'create' | 'edit' | 'move' | 'rewrite' | 'insert', page?: number) => request<{ ok: boolean }>('POST', '/api/ai/applied', { kind, page }),
};

// ---- chat conversacional (fase 2): la IA solo propone; el panel aplica con las rutas de siempre
export interface CreateProposal extends DraftProposal { kind: 'create'; summary: string; usesTemplate: boolean; newGroup: boolean }
export interface EditProposal {
  kind: 'edit'; summary: string; page: { id: number; title: string; route: string; status: string; version: number; isOpen: boolean };
  baseVersion: number; hunk: { fromLine: number; before: string; after: string }; after: string; motivo: string;
}
export interface MoveProposal {
  kind: 'move'; summary: string; page: { id: number; title: string; route: string; status: string; seccion: string; grupo: string };
  to: { seccion: string; grupo: string; parentId: number | null; parentTitle: string | null }; payload: { seccion?: string; grupo?: string; parent_id?: number | null }; motivo: string;
}
export type Proposal = CreateProposal | EditProposal | MoveProposal;
export interface ChatContext { page?: { id: number; title: string; route: string; seccion: string; body?: string }; selection?: { type: string; text: string }; mentions?: { id: number; title: string; route: string }[]; attachments?: { ref: string; path: string; name: string; caption: string; alt: string; size: string; where: string }[] }
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface ChatChoices { question: string; options: { label: string; value: string }[] }
export interface ChatResponse { reply: string; proposals: Proposal[]; rejected: { kind: string; reason: string }[]; choices: ChatChoices | null; incomplete: boolean; model: string; conversation_id: number | null; message_id: number | null; usage?: AiUsage }
export interface ChatBody { messages: ChatMessage[]; context?: ChatContext; conversation_id?: number | null; regenerate?: boolean }
/** Evento del stream SSE de POST /api/ai/chat. */
export type ChatEvent =
  | { type: 'meta'; data: { conversation_id: number | null } }
  | { type: 'activity'; data: { id: number; tool: string; label: string; state: 'start' | 'done' | 'failed' } }
  | { type: 'delta'; data: { text: string } }
  | { type: 'reset'; data: Record<string, never> }
  | { type: 'proposal'; data: { proposal: Proposal } }
  | { type: 'choices'; data: ChatChoices }
  | { type: 'done'; data: ChatResponse }
  | { type: 'error'; data: { status: number; code: string | null; message: string; retryAfter?: number } };
export interface ConversationRow { id: number; title: string; page_id: number | null; page_title?: string | null; page_route?: string | null; created_at: string; updated_at: string; messages: number }
export interface StoredProposal { kind: 'create' | 'edit' | 'move'; state: 'pending' | 'applied' | 'discarded'; expired?: boolean; openPageId?: number; summary: string; [k: string]: unknown }
export interface StoredMessage { id: number; role: 'user' | 'assistant'; content: string; proposals: StoredProposal[] | null; choices: ChatChoices | null; created_at: string }

/** Parte un búfer SSE en eventos completos y el resto sin terminar (lógica pura en features/ai/aiModel.ts). */
import { parseSse } from '@/features/ai/aiModel';

/**
 * Chat con streaming (SSE sobre fetch). Los errores previos al stream (400/401/403/429/503) llegan como JSON y se lanzan
 * como ApiError; los de durante el stream, como evento `error`. `signal` corta la lectura y, en el servidor, la llamada al proveedor.
 */
export async function streamChat(body: ChatBody, onEvent: (e: ChatEvent) => void, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(apiUrl('/api/ai/chat'), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, stream: true }), signal });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError(0, 'No se pudo conectar con el servidor del portal.');
  }
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    const text = await res.text();
    let data: unknown = null;
    try { data = JSON.parse(text); } catch { /* no es JSON */ }
    const msg = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `Error ${res.status}`;
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTH_EVENT));
    throw new ApiError(res.status, msg, data);
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const p = parseSse(buf);
    buf = p.rest;
    for (const ev of p.events) onEvent({ type: ev.event, data: ev.data } as ChatEvent);
  }
}
