/*
 * Asistente de IA del editor: un chat con streaming. La IA PROPONE; la persona APRUEBA.
 *  - Caja de mensaje siempre activa. Cada turno envía la página abierta, el bloque seleccionado, las páginas mencionadas con @
 *    y el historial acotado. La respuesta llega en vivo (línea de actividad + texto).
 *  - Tarjetas de propuesta (crear página con grupo/sección/tipo/título/ruta editables, editar, mover) con Aplicar / Descartar.
 *    Nada se guarda hasta pulsar el botón; lo creado nace como borrador.
 *  - Preguntas aclaratorias con respuestas rápidas clicables. Atajos «/» y «@». Historial guardado (solo del usuario).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, Copy, History, MessageSquarePlus, Paperclip, RefreshCw, SendHorizonal, Square, Sparkles } from 'lucide-react';
import { Badge, Button, Callout, IconButton, Sheet, Skeleton, Textarea, useToast } from '@/components/ui';
import { ApiError, api, type PageRow } from '@/lib/api';
import { aiApi, streamChat, type ChatEvent, type CreateProposal, type EditProposal, type MoveProposal, type OutlineSection, type Proposal } from '@/lib/api.ai';
import { can, errText, useAuth } from '@/lib/auth';
import { useDebounced } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { copy, go } from '@/lib/util';
import type { BlockEditorHandle } from '@/features/editor/BlockEditor';
import { ASSIST_ACTIONS, CHAT_LIMITS, NON_TEXT_BLOCKS, activeMentions, aiErrorInfo, applyMention, buildContext, buildHistory, contextChips, editStillValid, itemsFromConversation, lineDiff, matchCommands, mentionQuery, type ChatItem, type DraftForm, type StartChip } from './aiModel';
import { applyEditOther, applyMove, createDraft } from './applyActions';
import { ActivityLine, CardShell, CreateCard, DiffPane, EditCard, Md, MoveCard } from './AiParts';
import { AiHistory } from './AiHistory';
import { UsageMeterButton } from './AiUsageMeter';
import { AiImageTray } from './AiImageTray';
import { MAX_IMAGES, buildFigureMdx, captionFromName, toContext, type Attachment } from './imageModel';
import { useAiUsage } from './useAiUsage';

const BLOCK_NAME: Record<string, string> = {
  heading: 'Título', paragraph: 'Párrafo', list: 'Lista', steps: 'Pasos', callout: 'Aviso', cards: 'Tarjetas', table: 'Tabla', code: 'Código', kicker: 'Subtítulo', lead: 'Entradilla', raw: 'Bloque de código MDX',
};
type Sel = { id: string; type: string; mdx: string };
type Mention = { id: number; title: string; route: string };
type Menu = { kind: 'cmd'; options: { key: string; label: string; hint: string }[] } | { kind: 'mention'; options: { key: string; label: string; hint: string; page: Mention }[] };

export function AiAssistantSheet({ open, onOpenChange, editor, page, getBody, onApplyBody, model, imageFolder }: {
  open: boolean; onOpenChange: (o: boolean) => void; editor?: React.RefObject<BlockEditorHandle | null>;
  page?: { id: number; title: string; route: string; seccion: string; status?: string } | null; getBody?: () => string; onApplyBody?: (body: string) => void; model?: string;
  /** Carpeta de assets de la página abierta (imageFolder del editor); sin ella, «imgs/ia». */
  imageFolder?: string;
}) {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<'chat' | 'assist' | null>(null);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [sel, setSel] = useState<Sel | null>(null);
  const [applying, setApplying] = useState<number | null>(null);
  const [convId, setConvId] = useState<number | null>(null);
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [mentionList, setMentionList] = useState<Mention[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [menuIdx, setMenuIdx] = useState(0);
  const usage = useAiUsage(open);
  const [images, setImages] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nid = () => ++idRef.current;
  const patch = (id: number, p: Partial<ChatItem>) => setItems((l) => l.map((x) => (x.id === id ? ({ ...x, ...p } as ChatItem) : x)));
  const add = (...x: ChatItem[]) => setItems((l) => [...l, ...x]);

  // Al abrir: bloque seleccionado, estructura del manual (para las tarjetas) y foco en la caja de mensaje.
  useEffect(() => {
    if (!open) return;
    const s = editor?.current?.getSelectedBlock?.() ?? null;
    setSel(s && !NON_TEXT_BLOCKS.has(s.type) ? s : null);
    aiApi.outline().then((r) => setOutline(r.secciones)).catch(() => setOutline([]));
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [open, editor, view]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [items, busy]);
  useEffect(() => () => abort.current?.abort(), []);

  // Menciones «@»: búsqueda de páginas con retardo
  const mq = mentionQuery(input);
  const dq = useDebounced(mq?.query ?? '', 200);
  useEffect(() => {
    if (!mq || matchCommands(input).length) return;
    let alive = true;
    api.pages({ q: dq, limit: 6 }).then((r) => {
      if (!alive) return;
      const opts = r.items.map((p: PageRow) => ({ key: String(p.id), label: p.title, hint: p.route, page: { id: p.id, title: p.title, route: p.route } }));
      setMenu(opts.length ? { kind: 'mention', options: opts } : null); setMenuIdx(0);
    }).catch(() => setMenu(null));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, !!mq]);

  const onInput = (v: string) => {
    setInput(v);
    const cmds = matchCommands(v);
    if (cmds.length) { setMenu({ kind: 'cmd', options: cmds.map((c) => ({ key: c.cmd, label: c.cmd, hint: c.label })) }); setMenuIdx(0); }
    else if (!mentionQuery(v)) setMenu(null);
  };

  const fail = (status: number, message: string, data?: unknown, retry = true) => {
    const info = aiErrorInfo(status, message, data);
    add({ id: nid(), kind: 'error', message: info.message, errKind: info.kind, retry: retry && info.canRetry });
  };

  /** Un turno de chat: el mensaje (nuevo o reutilizado), el stream y las tarjetas. */
  const runTurn = async (text: string, opts: { base?: ChatItem[]; reuseUser?: boolean; regenerate?: boolean } = {}) => {
    const t = text.trim();
    if (!t || busy) return;
    if (t.length > CHAT_LIMITS.message) { toast(`El mensaje es demasiado largo (máx. ${CHAT_LIMITS.message} caracteres).`, 'error'); return; }
    const base = opts.base ?? items;
    const withUser: ChatItem[] = opts.reuseUser ? base : [...base, { id: nid(), kind: 'user', text: t, ...(images.length ? { images: images.map((a) => ({ path: a.path, name: a.name })) } : {}) }];
    const actId = nid();
    const asstId = nid();
    setItems([...withUser, { id: actId, kind: 'activity', steps: [] }, { id: asstId, kind: 'assistant', text: '', streaming: true }]);
    setInput(''); setMenu(null); setBusy('chat');
    const body = getBody?.();
    const ctl = new AbortController();
    abort.current = ctl;
    const propIds: number[] = [];
    const onEvent = (ev: ChatEvent) => {
      if (ev.type === 'activity') {
        setItems((l) => l.map((x) => {
          if (x.id !== actId || x.kind !== 'activity') return x;
          const i = x.steps.findIndex((s) => s.id === ev.data.id);
          const step = { id: ev.data.id, label: ev.data.label, state: ev.data.state };
          return { ...x, steps: i < 0 ? [...x.steps, step] : x.steps.map((s, j) => (j === i ? step : s)) };
        }));
      } else if (ev.type === 'delta') setItems((l) => l.map((x) => (x.id === asstId && x.kind === 'assistant' ? { ...x, text: x.text + ev.data.text } : x)));
      else if (ev.type === 'reset') patch(asstId, { text: '' } as Partial<ChatItem>);
      else if (ev.type === 'proposal') {
        const id = nid();
        propIds.push(id);
        add({ id, kind: 'proposal', proposal: ev.data.proposal, sentBody: body, state: 'pending', index: propIds.length - 1 });
      } else if (ev.type === 'done') {
        const d = ev.data;
        if (d.conversation_id) setConvId(d.conversation_id);
        usage.setFromServer(d.usage);
        setItems((l) => l.map((x) => {
          if (x.id === asstId && x.kind === 'assistant') return { ...x, text: d.reply, streaming: false, messageId: d.message_id, choices: d.choices, rejected: d.rejected.length ? d.rejected : undefined };
          if (x.kind === 'proposal' && propIds.includes(x.id)) return { ...x, messageId: d.message_id };
          return x;
        }));
      } else if (ev.type === 'error') fail(ev.data.status, ev.data.message, { code: ev.data.code, retryAfter: ev.data.retryAfter });
    };
    try {
      await streamChat({ messages: buildHistory(withUser), context: { ...buildContext(page, body, sel, activeMentions(t, mentionList)), ...(images.length ? { attachments: toContext(images) } : {}) }, conversation_id: convId, regenerate: opts.regenerate }, onEvent, ctl.signal);
    } catch (e) {
      if (ctl.signal.aborted) add({ id: nid(), kind: 'note', text: 'La persona canceló la petición.' });
      else if (e instanceof ApiError) fail(e.status, e.message, e.data);
      else fail(500, 'No se pudo completar la acción.');
    } finally {
      // limpia el mensaje vacío si no llegó texto y cierra la actividad
      setItems((l) => l.filter((x) => !(x.id === asstId && x.kind === 'assistant' && !x.text.trim())).map((x) => (x.id === asstId && x.kind === 'assistant' ? { ...x, streaming: false } : x)).filter((x) => !(x.id === actId && x.kind === 'activity' && !x.steps.length)));
      setBusy(null); abort.current = null;
    }
  };
  const send = (text: string) => runTurn(text);

  const lastUser = (): { text: string; idx: number } | null => {
    for (let i = items.length - 1; i >= 0; i--) { const x = items[i]!; if (x.kind === 'user') return { text: x.text, idx: i }; }
    return null;
  };
  const regenerate = () => { const u = lastUser(); if (u) void runTurn(u.text, { base: items.slice(0, u.idx + 1), reuseUser: true, regenerate: true }); };
  const retry = () => { const u = lastUser(); if (u) void runTurn(u.text, { base: items.slice(0, u.idx + 1), reuseUser: true }); };

  const quick = async (action: (typeof ASSIST_ACTIONS)[number]) => {
    if (!sel || busy) return;
    add({ id: nid(), kind: 'user', text: `${action.label} el bloque seleccionado (${BLOCK_NAME[sel.type] ?? sel.type}).` });
    setBusy('assist');
    try {
      const r = await aiApi.assist({ action: action.id, text: sel.mdx, context: page ? `${page.title} (${page.seccion})` : undefined });
      add({ id: nid(), kind: 'rewrite', before: sel.mdx, after: r.text, avisos: r.avisos, blockId: sel.id, replaces: true, state: 'pending' });
    } catch (e) { if (e instanceof ApiError) fail(e.status, e.message, e.data, false); else fail(500, 'No se pudo completar la acción.', undefined, false); } finally { setBusy(null); }
  };

  const cancel = () => abort.current?.abort();
  const reset = () => { abort.current?.abort(); setImages([]); setItems([]); setInput(''); setBusy(null); setConvId(null); setMentionList([]); setView('chat'); };

  /** Sube las imágenes con el almacén de siempre (POST /api/assets) y las deja en la bandeja. La IA no las recibe: solo su texto. */
  const addFiles = async (files: File[]) => {
    const imgs = files.filter((x) => x.type.startsWith('image/'));
    if (!imgs.length) { if (files.length) toast('Solo se pueden adjuntar imágenes', 'error'); return; }
    const room = Math.max(0, MAX_IMAGES - images.length);
    if (imgs.length > room) toast(`Máximo ${MAX_IMAGES} imágenes por mensaje`, 'info');
    const take = imgs.slice(0, room);
    setUploading((n) => n + take.length);
    const added: Attachment[] = [];
    for (const x of take) {
      try {
        const r = await api.uploadAsset(x, imageFolder ?? 'imgs/ia');
        added.push({ uid: r.path + '#' + Math.random().toString(36).slice(2, 6), path: r.path, name: x.name || 'imagen', width: r.width, height: r.height, caption: captionFromName(x.name || ''), alt: '', size: 'full', where: '' });
      } catch (e) { toast(`${x.name}: ${errText(e)}`, 'error'); } finally { setUploading((n) => n - 1); }
    }
    if (added.length) setImages((l) => [...l, ...added].slice(0, MAX_IMAGES));
  };
  /** MODO MANUAL (sin IA, sin tokens): coloca las imágenes en el orden y con los parámetros dados, como bloques Figure. */
  const insertManual = () => {
    const h = editor?.current;
    if (!h?.insertMdx?.(buildFigureMdx(images))) { toast('No se pudo insertar: abre una página editable en el editor', 'error'); return; }
    const n = images.length;
    toast(`${n} ${n === 1 ? 'imagen insertada' : 'imágenes insertadas'} en la página`, 'ok', { label: 'Deshacer', run: () => h.undo?.() });
    add({ id: nid(), kind: 'note', text: `Se insertaron ${n} ${n === 1 ? 'imagen' : 'imágenes'} en la página (sin IA).` });
    setImages([]);
  };
  const suggestImages = () => void runTurn(page
    ? 'Edita esta página: coloca las imágenes adjuntas donde tengan más sentido (con image_ref), con un pie corto y texto alternativo. Si falta algo, dímelo.'
    : 'Crea una página nueva que use las imágenes adjuntas, con un orden lógico, pies cortos y texto alternativo. Pregunta lo que necesites.');

  const savedState = (it: Extract<ChatItem, { kind: 'proposal' }>, state: 'applied' | 'discarded', openPageId?: number) => {
    if (it.messageId != null && it.index != null) void aiApi.proposalState(it.messageId, it.index, state, openPageId).catch(() => {});
  };
  const markApplied = (it: Extract<ChatItem, { kind: 'proposal' }>, note: string, openPageId?: number) => {
    patch(it.id, { state: 'applied', error: undefined, ...(openPageId ? { openPageId } : {}) } as Partial<ChatItem>); add({ id: nid(), kind: 'note', text: note }); savedState(it, 'applied', openPageId);
  };
  const discard = (it: Extract<ChatItem, { kind: 'proposal' }>) => {
    patch(it.id, { state: 'discarded' } as Partial<ChatItem>);
    add({ id: nid(), kind: 'note', text: `La persona descartó la propuesta: ${(it.proposal as Proposal).summary.replace(/[. ]+$/, "")}.` });
    savedState(it, 'discarded');
  };
  const askChanges = (p: Proposal) => { setInput(`Cambia la propuesta «${p.kind === 'create' ? (p as CreateProposal).title : (p as EditProposal | MoveProposal).page.title}»: `); setView('chat'); setTimeout(() => inputRef.current?.focus(), 50); };

  const applyCreate = async (it: Extract<ChatItem, { kind: 'proposal' }>, draft: DraftForm) => {
    setApplying(it.id);
    try {
      const { page: created, saveError } = await createDraft(draft);
      if (saveError) toast(`Se creó el borrador, pero no se pudo cargar el contenido: ${errText(saveError)}`, 'error');
      else toast('Borrador creado. Revísalo antes de publicar.');
      markApplied(it, `Se creó el borrador «${draft.title}» (${created.route})${draft.grupo ? ` en el grupo «${draft.grupo}»` : ''}.`, created.id);
    } catch (e) { patch(it.id, { state: 'error', error: errText(e) } as Partial<ChatItem>); } finally { setApplying(null); }
  };
  const applyOther = async (it: Extract<ChatItem, { kind: 'proposal' }>) => {
    const p = it.proposal as Proposal;
    setApplying(it.id);
    try {
      if (p.kind === 'edit' && p.page.isOpen) {
        const cur = getBody?.();
        if (!onApplyBody || cur === undefined || !editStillValid(it.sentBody, cur)) throw new Error('La página cambió desde la propuesta. Pídela de nuevo para trabajar sobre el texto actual.');
        onApplyBody(p.after);
        void aiApi.applied('edit', p.page.id).catch(() => {});
        toast('Cambio aplicado en el editor (sin guardar)', 'ok', { label: 'Deshacer', run: () => onApplyBody(cur) });
        markApplied(it, `Se aplicó en el editor la edición de «${p.page.title}» (pendiente de guardar).`);
      } else if (p.kind === 'edit') {
        const r = await applyEditOther(p);
        toast(p.page.status === 'published' ? 'Página guardada · ya se ve en el manual' : 'Página guardada', 'ok', { label: 'Deshacer', run: () => { r.undo().then(() => toast('Cambio deshecho (revisión anterior restaurada)')).catch((e: unknown) => toast(`${errText(e)} Puedes volver desde Revisiones.`, 'error')); } });
        markApplied(it, `Se guardó la edición de «${p.page.title}» (${p.page.route}).`);
      } else if (p.kind === 'move') {
        await applyMove(p);
        toast('Página movida');
        markApplied(it, `Se movió «${p.page.title}»: ${p.summary}`);
      }
    } catch (e) { patch(it.id, { state: 'error', error: errText(e) } as Partial<ChatItem>); } finally { setApplying(null); }
  };

  const applyRewrite = (it: Extract<ChatItem, { kind: 'rewrite' }>) => {
    const h = editor?.current;
    const ok = it.blockId ? h?.replaceBlock?.(it.blockId, it.after) : h?.insertMdx?.(it.after);
    if (!ok) { toast('No se pudo aplicar: el lienzo está en solo lectura o el bloque ya no existe.', 'error'); return; }
    void aiApi.applied('rewrite').catch(() => {});
    toast('Cambio aplicado al bloque', 'ok', { label: 'Deshacer', run: () => editor?.current?.undo?.() });
    patch(it.id, { state: 'applied' } as Partial<ChatItem>);
    add({ id: nid(), kind: 'note', text: 'Se aplicó el texto propuesto al bloque seleccionado.' });
  };

  const openConversation = async (id: number) => {
    try {
      const r = await aiApi.conversation(id);
      const list = itemsFromConversation(r.messages, idRef.current + 1);
      idRef.current += list.length + 1;
      setItems(list); setConvId(id); setView('chat'); setMentionList([]);
    } catch (e) { toast(errText(e), 'error'); }
  };

  const pickMenu = (i: number) => {
    if (!menu) return;
    const o = menu.options[i];
    if (!o) return;
    if (menu.kind === 'cmd') {
      const c = matchCommands(input).find((x) => x.cmd === o.key);
      setMenu(null);
      if (c?.send) void send(c.text); else if (c) { setInput(c.text); inputRef.current?.focus(); }
    } else {
      const m = (o as { page: Mention }).page;
      setInput(applyMention(input, m.title));
      setMentionList((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]));
      setMenu(null);
      inputRef.current?.focus();
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (menu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIdx((i) => (i + 1) % menu.options.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenuIdx((i) => (i - 1 + menu.options.length) % menu.options.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMenu(menuIdx); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setMenu(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); return; }
    if (e.key === 'ArrowUp' && !input) { const u = lastUser(); if (u) { e.preventDefault(); setInput(u.text); } }
  };

  const chipAction = (c: StartChip) => {
    if (c.action === 'shorten') { const a = ASSIST_ACTIONS.find((x) => x.id === 'shorten'); if (a) void quick(a); return; }
    if (c.action === 'prefill') { setInput(c.prompt ?? ''); inputRef.current?.focus(); return; }
    void send(c.prompt ?? c.label);
  };

  const renderProposal = (it: Extract<ChatItem, { kind: 'proposal' }>) => {
    const p = it.proposal as Proposal;
    const common = { state: it.state, error: it.error, applying: applying === it.id, onDiscard: () => discard(it), onAskChanges: () => askChanges(p) };
    const missing = (it.proposal as { missingImages?: string[] }).missingImages;
    if (p.kind === 'create') return <CreateCard proposal={p} outline={outline} {...common} openPageId={it.openPageId} expired={it.expired} missing={missing} onApply={(d) => void applyCreate(it, d)} onOpen={() => { onOpenChange(false); go(`/contenido/${it.openPageId}`); }} />;
    if (p.kind === 'edit') return <EditCard proposal={p} {...common} expired={it.expired} missing={missing} onApply={() => void applyOther(it)} />;
    return <MoveCard proposal={p as MoveProposal} {...common} onApply={() => void applyOther(it)} />;
  };

  const lastAsstId = (() => { for (let i = items.length - 1; i >= 0; i--) { const x = items[i]!; if (x.kind === 'assistant') return x.id; } return -1; })();
  const renderItem = (it: ChatItem) => {
    switch (it.kind) {
      case 'user': return (
        <div key={it.id} className="ml-8 flex flex-col gap-1.5 self-end rounded-lg bg-accent-soft px-3 py-2 text-[13.5px] text-ink">
          <span className="whitespace-pre-wrap break-words">{it.text}</span>
          {it.images && it.images.length > 0 && <span className="flex flex-wrap gap-1" aria-label="Imágenes adjuntas">{it.images.map((im, i) => <img key={i} src={api.assetUrl(im.path)} alt="" title={im.name} width={36} height={36} className="size-9 rounded-sm border border-line object-cover" />)}</span>}
        </div>
      );
      case 'activity': return <ActivityLine key={it.id} steps={it.steps} running={!!busy} />;
      case 'assistant': return (
        <div key={it.id} className="mr-6 flex flex-col gap-1.5">
          {it.text ? (
            <div className="group relative rounded-lg border border-line bg-subtle px-3 py-2 text-ink">
              <Md text={it.text} />{it.streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-accent align-middle" aria-hidden="true" />}
              {!it.streaming && (
                <div className="mt-1 flex gap-0.5 opacity-70 hover:opacity-100 focus-within:opacity-100">
                  <IconButton size="icon-sm" label="Copiar respuesta" icon={<Copy size={13} />} onClick={async () => toast((await copy(it.text)) ? 'Respuesta copiada' : 'No se pudo copiar', 'info')} />
                  {it.id === lastAsstId && !busy && <IconButton size="icon-sm" label="Regenerar respuesta" icon={<RefreshCw size={13} />} onClick={regenerate} />}
                </div>
              )}
            </div>
          ) : <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-subtle px-3 py-2.5" aria-label="La IA está escribiendo"><Skeleton className="w-3/4" /><Skeleton className="w-1/2" /></div>}
          {it.rejected?.map((r, i) => <Callout key={i} tone="warn"><strong>Propuesta descartada por seguridad.</strong> {r.reason}</Callout>)}
          {it.choices && !busy && it.id === lastAsstId && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Respuestas rápidas">
              {it.choices.options.map((o) => <Button key={o.value} size="sm" onClick={() => void send(o.value)}>{o.label}</Button>)}
            </div>
          )}
        </div>
      );
      case 'proposal': return <div key={it.id}>{renderProposal(it)}</div>;
      case 'rewrite': {
        const d = lineDiff(it.before, it.after);
        return (
          <CardShell key={it.id} kind="rewrite" title="Texto del bloque" state={it.state} actions={<><Button size="sm" onClick={() => { patch(it.id, { state: 'discarded' } as Partial<ChatItem>); add({ id: nid(), kind: 'note', text: 'La persona descartó el cambio del bloque seleccionado.' }); }}>Descartar</Button><Button size="sm" variant="primary" onClick={() => applyRewrite(it)}>Aplicar</Button></>}>
            <DiffPane title="Antes" lines={d.before} tone="del" />
            <DiffPane title="Después" lines={d.after} tone="add" />
            {it.avisos.length > 0 && <Callout tone="warn"><strong>Revisa:</strong><ul className="m-0 mt-1 list-disc pl-5">{it.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul></Callout>}
            {!d.changed && <Badge tone="warn">Sin cambios</Badge>}
          </CardShell>
        );
      }
      case 'note': return <p key={it.id} className="m-0 text-center text-xs text-ink-3">{it.text}</p>;
      case 'error': return (
        <Callout key={it.id} tone={it.errKind === 'rate' || it.errKind === 'input' ? 'warn' : 'danger'} icon={<CircleAlert size={16} className="mt-0.5" />} action={it.retry && !busy ? <Button size="sm" onClick={retry}>Reintentar</Button> : undefined}>
          {it.message}{it.errKind === 'config' && can(user, 'admin') && <> <a href="#/ajustes/ia" onClick={() => onOpenChange(false)}>Abrir Ajustes</a>.</>}
        </Callout>
      );
    }
  };

  const body = getBody?.() ?? '';
  const chips = contextChips(page ? { status: page.status, bodyLength: body.length } : null, !!sel);
  const onHistoryDeleted = useCallback((id: number) => { if (id === convId) reset(); }, [convId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="right" title="Asistente de IA" className="w-[min(580px,calc(100vw-24px))]">
      <div className="flex min-h-0 flex-1 flex-col" onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }} onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); void addFiles(Array.from(e.dataTransfer.files)); } }}>
        <div className="flex items-center gap-1 border-b border-line px-3 py-1.5 text-sm text-ink-3">
          <span className="min-w-0 flex-1 truncate">{page ? <>Página abierta: <b className="font-medium text-ink-2">{page.title}</b></> : 'Sin página abierta'}{model && <span className="ml-2 font-mono text-[11px] text-ink-4">{model}</span>}</span>
          <UsageMeterButton usage={usage.usage} fetchedAt={usage.fetchedAt} now={usage.now} busy={usage.busy} error={usage.error} onRefresh={() => void usage.refresh()} />
          <Button size="sm" variant="ghost" aria-pressed={view === 'history'} onClick={() => setView((v) => (v === 'history' ? 'chat' : 'history'))}><History size={14} /> Historial</Button>
          <Button size="sm" variant="ghost" disabled={!items.length && !busy && !convId} onClick={reset}><MessageSquarePlus size={14} /> Nueva</Button>
        </div>

        {view === 'history' ? <AiHistory activeId={convId} onOpen={(id) => void openConversation(id)} onDeleted={onHistoryDeleted} onCleared={reset} /> : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Conversación con el asistente" data-testid="ai-chat-log">
              {!items.length && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2.5 rounded-lg border border-line bg-subtle p-3">
                    <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
                    <div className="text-[13.5px] text-ink-2"><strong className="text-ink">Hola, soy el asistente del manual.</strong> Cuéntame qué necesitas: puedo crear páginas, editar la que tienes abierta u otra, decirte qué secciones hay y mover páginas. <b className="font-medium">Tú decides:</b> nada se guarda hasta pulsar el botón de cada propuesta, y lo nuevo nace como borrador. Escribe <kbd className="rounded-sm border border-line px-1 font-mono text-xs">/</kbd> para ver comandos o <kbd className="rounded-sm border border-line px-1 font-mono text-xs">@</kbd> para mencionar una página.</div>
                  </div>
                  <div className="flex flex-wrap gap-2" aria-label="Ejemplos para empezar">
                    {chips.map((c) => <Button key={c.id} size="sm" disabled={!!busy} onClick={() => chipAction(c)}>{c.label}</Button>)}
                  </div>
                </div>
              )}
              {items.map(renderItem)}
              <div ref={endRef} />
            </div>

            <div className="relative flex flex-col gap-2 border-t border-line bg-subtle p-3">
              {menu && (
                <ul role="listbox" aria-label={menu.kind === 'cmd' ? 'Comandos' : 'Páginas'} className="absolute inset-x-3 bottom-full z-10 mb-1 max-h-52 list-none overflow-auto rounded-lg border border-line bg-raised p-1 shadow-pop">
                  {menu.options.map((o, i) => (
                    <li key={o.key} role="option" aria-selected={i === menuIdx}>
                      <button type="button" className={cn('flex w-full cursor-pointer items-baseline gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-sm', i === menuIdx ? 'bg-accent-soft' : 'hover:bg-subtle')} onMouseDown={(e) => { e.preventDefault(); pickMenu(i); }} onMouseEnter={() => setMenuIdx(i)}>
                        <span className="font-medium text-ink">{o.label}</span><span className="truncate text-xs text-ink-3">{o.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {(images.length > 0 || uploading > 0) && (
                <div className="max-h-[42vh] overflow-y-auto">
                  {images.length > 0 && <AiImageTray items={images} onChange={setImages} onAddFiles={() => fileRef.current?.click()} onInsert={insertManual} onSuggest={suggestImages} canInsert={!!editor?.current?.insertMdx} busy={!!busy} />}
                  {uploading > 0 && <p role="status" className="m-0 mt-1 text-xs text-ink-3">Subiendo {uploading} {uploading === 1 ? 'imagen' : 'imágenes'}…</p>}
                </div>
              )}
              {sel && <p className="m-0 truncate text-xs text-ink-3" title={sel.mdx}>Bloque seleccionado: <b className="font-medium text-ink-2">{BLOCK_NAME[sel.type] ?? sel.type}</b> · «{sel.mdx.replace(/\s+/g, ' ').slice(0, 60)}»</p>}
              <div className="flex flex-wrap gap-1.5" aria-label="Atajos sobre el bloque seleccionado">
                {ASSIST_ACTIONS.map((a) => <Button key={a.id} size="sm" variant="ghost" disabled={!sel || !!busy} title={sel ? a.hint : 'Selecciona un bloque con texto en la página'} onClick={() => void quick(a)}>{a.label}</Button>)}
              </div>
              <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple hidden onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
                <IconButton label="Adjuntar imágenes (la IA no las ve; solo su texto)" icon={<Paperclip size={15} />} disabled={images.length >= MAX_IMAGES} onClick={() => fileRef.current?.click()} />
                <Textarea ref={inputRef} aria-label="Mensaje para la IA" onPaste={(e) => { const fs = Array.from(e.clipboardData.files).filter((x) => x.type.startsWith('image/')); if (fs.length) { e.preventDefault(); void addFiles(fs); } }} aria-autocomplete="list" rows={2} value={input} maxLength={CHAT_LIMITS.message + 100} placeholder="Escribe qué quieres hacer…  ( / comandos · @ páginas · Enter envía )"
                  className="min-h-[52px] flex-1 resize-none" onChange={(e) => onInput(e.target.value)} onKeyDown={onKey} />
                {busy
                  ? <Button type="button" onClick={cancel} aria-label="Cancelar la petición"><Square size={14} /> Cancelar</Button>
                  : <Button type="submit" variant="primary" disabled={!input.trim()} aria-label="Enviar mensaje"><SendHorizonal size={14} /> Enviar</Button>}
              </form>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

