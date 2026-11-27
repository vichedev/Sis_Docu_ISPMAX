/*
 * BlockEditor — constructor de páginas por bloques (Adenda 2 de CONTRACT.md).
 *
 *   <BlockEditor ref={h} value={body} onChange={setBody} readOnly={!canEdit} uploadImage={…} pickImage={…} problems={…} active={tab==='blocks'} />
 *   - value / onChange: cuerpo MDX completo. Al abrir se analiza con parseMdx; cada edición emite
 *     docText(bloques): solo se regenera el bloque tocado (los demás conservan su texto exacto).
 *   - Garantía de no destrucción: si serializeBlocks(parseMdx(value)) !== value el lienzo queda en solo
 *     lectura con un aviso (onSafety(false)) y nunca emite cambios.
 *   - active: si el lienzo está a la vista. Al volver a él, si el texto cambió fuera (Código MDX, Revisiones)
 *     se vuelve a analizar y queda como un paso más del historial.
 *   - Historial: Ctrl+Z / Ctrl+Y (o Ctrl+Mayús+Z) por instantáneas de la lista de bloques.
 *   - ref.focusLine(line): lleva al bloque que contiene esa línea (esquema y validación).
 *   - ref.insert(comando, índice?): inserta un bloque de la paleta tras el bloque seleccionado (o al final) o en
 *     `índice`; queda seleccionado y en edición (imagen, fila y tour abren su selector). Soltar en el lienzo una ficha
 *     de la paleta (datos `BLOCK_MIME`) inserta en el hueco marcado. `onTarget` dice tras qué bloque insertará la paleta.
 *   - Tours: «Crear tour con esta imagen» y «Editar tour» abren TourStudio (montado aquí, fuera del lienzo).
 * BlockPreview: los mismos bloques en solo lectura (pestaña Vista previa).
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { Redo2, ShieldAlert, Undo2 } from 'lucide-react';
import { Callout, IconButton, useToast } from '@/components/ui';
import type { Asset, Problem, UploadResult } from '@/lib/api';
import { errText } from '@/lib/auth';
import { blockText, imageFromAsset, insertBlock, mapBlock, newBlock, parseMdx, type Block } from '@/lib/blocks/index.ts';
import { cn } from '@/lib/cn';
import { blockAtLine, blockFromCommand, blockLines, docText, problemsByBlock, roundTripOk } from './model/doc';
import { breakMerge, canRedo, canUndo, initHistory, pushHistory, redo, undo, type History } from './model/history';
import { BLOCK_MIME, dropIndex } from './model/palette';
import { BlockList, type Commit } from './blocks/BlockList';
import { autoPick, blockName, commandById } from './blocks/commands';
import { Ctx, type EditorCtx, type TextTarget, type TourRequest } from './blocks/context';
import { S } from './blocks/styles';
import { TourStudio } from './tour/TourStudio';
import { useTourIndex } from './tour/tourData';

export interface BlockEditorProps {
  value: string;
  onChange: (mdx: string) => void;
  readOnly?: boolean;
  uploadImage?: (file: File) => Promise<UploadResult>;
  pickImage?: () => Promise<Asset | null>;
  problems?: Problem[];
  /** El lienzo está a la vista (por defecto true). */
  active?: boolean;
  /** Informa si el cuerpo se puede editar por bloques sin cambiar nada al guardar. */
  onSafety?: (ok: boolean) => void;
  /** Bloque tras el que insertará la paleta (descripción corta), o null si irá al final de la página. */
  onTarget?: (label: string | null) => void;
}
/** Bloque de primer nivel seleccionado, para el asistente de IA. */
export interface SelectedBlock { id: string; type: string; mdx: string }
export interface BlockEditorHandle {
  focusLine: (line: number) => void;
  /** Bloque de primer nivel seleccionado (null si no hay o es de solo lectura). */
  getSelectedBlock?: () => SelectedBlock | null;
  /** Sustituye un bloque por el MDX dado (un solo paso de historial). false si no se pudo. */
  replaceBlock?: (id: string, mdx: string) => boolean;
  /** Inserta MDX tras el bloque seleccionado (o al final). false si no se pudo. */
  insertMdx?: (mdx: string) => boolean;
  /** Deshace el último cambio del lienzo. */
  undo?: () => void;
  /** Inserta un comando de la paleta tras el bloque seleccionado (o al final), o en la posición de primer nivel `at`. */
  insert?: (command: string, at?: number) => void;
}

/** Bloques que necesitan un dato al nacer: abren su selector (galería o lista de tours). */
const PICKS = new Set(['image', 'imageRow', 'tour']);
const raf2 = (f: () => void) => requestAnimationFrame(() => requestAnimationFrame(f));

/** Texto corto de un bloque para «Se insertará después de…». */
function blockSummary(b: Block): string {
  const t = b.type === 'heading' || b.type === 'kicker' || b.type === 'lead' ? b.text
    : b.type === 'paragraph' ? b.md
    : b.type === 'image' ? (b.alt || b.caption || b.src.split('/').pop() || '')
    : b.type === 'tour' ? b.slug : '';
  const s = t.replace(/[*_`#>[\]]/g, '').replace(/\s+/g, ' ').trim();
  return s ? `${blockName(b)} «${s.length > 38 ? `${s.slice(0, 37)}…` : s}»` : blockName(b);
}

/** Bloques para un cuerpo: una página vacía empieza con un párrafo vacío listo para escribir. */
const toBlocks = (body: string): Block[] => { const b = parseMdx(body); return b.length ? b : [newBlock('paragraph', { md: '' })]; };

export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(({ value, onChange, readOnly, uploadImage, pickImage, problems = [], active = true, onSafety, onTarget }, ref) => {
  const toast = useToast();
  const [hist, setHist] = useState<History<Block[]>>(() => initHistory(toBlocks(value)));
  const [safe, setSafe] = useState(() => roundTripOk(value));
  /** Último texto sincronizado: lo que se analizó (value) y los bloques que salieron. */
  const synced = useRef({ value, blocks: hist.present });
  const emitted = useRef(value);
  const blocks = hist.present;
  const box = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [textTarget, setTextTarget] = useState<TextTarget | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const caret = useRef<EditorCtx['caret']['current']>(null);
  const { tours, error: toursError } = useTourIndex();
  const [tourReq, setTourReq] = useState<TourRequest | null>(null);
  /** Hueco marcado al arrastrar una ficha de la paleta sobre el lienzo. */
  const [drop, setDrop] = useState<{ index: number; y: number } | null>(null);
  const locked = !!readOnly || !safe;
  const safeRef = useRef(safe);
  safeRef.current = safe;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

  useEffect(() => { onSafety?.(safe); }, [safe, onSafety]);

  // Texto cambiado fuera del lienzo (Código MDX, restaurar revisión, recarga tras guardar).
  useEffect(() => {
    if (!active || value === emitted.current) return;
    const next = toBlocks(value);
    synced.current = { value, blocks: next };
    emitted.current = value;
    setSafe(roundTripOk(value));
    setHist((h) => breakMerge(pushHistory(h, next)));
  }, [value, active]);

  // Emitir el MDX cuando cambian los bloques (edición, deshacer, rehacer).
  useEffect(() => {
    const text = blocks === synced.current.blocks ? synced.current.value : docText(blocks);
    if (text === emitted.current) return;
    if (!safeRef.current) return; // nunca escribir desde un análisis que no reproduce el texto
    emitted.current = text;
    onChangeRef.current(text);
  }, [blocks]);

  const commit = useCallback<Commit>((next, opts) => {
    if (locked) return;
    setHist((h) => pushHistory(h, next, { key: opts?.key ?? null }));
  }, [locked]);
  const doUndo = useCallback(() => { if (!locked) setHist((h) => undo(h)); }, [locked]);
  const doRedo = useCallback(() => { if (!locked) setHist((h) => redo(h)); }, [locked]);

  // Atajos de historial: dentro del lienzo o sin foco en otro campo.
  useEffect(() => {
    if (!active || locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== 'z' && k !== 'y') return;
      // Fuera del lienzo solo si el foco no está en otro campo de texto (título, descripción, código…).
      const t = e.target as HTMLElement | null;
      const field = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (field && !box.current?.contains(t)) return;
      if (t?.closest('[role="dialog"]')) return;
      e.preventDefault();
      if (k === 'y' || e.shiftKey) doRedo(); else doUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, locked, doUndo, doRedo]);

  const focusBlock = useCallback((id: string, where: 'start' | 'end' = 'start') => {
    const el = box.current?.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
    if (!el) return;
    const fields = el.querySelectorAll<HTMLElement>('[data-field]');
    const f = where === 'end' ? fields[fields.length - 1] : el.querySelector<HTMLElement>('[data-field=""]') ?? fields[0];
    setActiveId(id);
    if (f) { caret.current = where; f.focus({ preventScroll: false }); f.scrollIntoView({ block: 'nearest' }); }
    else { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }, []);

  const flash = useCallback((id: string) => {
    setFlashId(id);
    setTimeout(() => setFlashId((f) => (f === id ? null : f)), 1000);
  }, []);
  const reveal = useCallback((id: string) => {
    setActiveId(id);
    raf2(() => { box.current?.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(id); });
  }, [flash]);

  /** Bloque de primer nivel que contiene `id` (el activo puede estar dentro de unos pasos o un aviso). */
  const topOf = (id: string | null): string | null => {
    if (!id) return null;
    if (blocksRef.current.some((b) => b.id === id)) return id;
    return box.current?.querySelector(`[data-block-id="${id}"]`)?.closest('[data-top]')?.getAttribute('data-block-id') ?? null;
  };

  const insert = useCallback((command: string, at?: number) => {
    if (locked) return;
    const c = commandById(command);
    const nb = blockFromCommand(c);
    const list = blocksRef.current;
    let next: Block[];
    let id = nb.id;
    if (at == null) {
      const top = topOf(activeRef.current);
      const i = top ? list.findIndex((b) => b.id === top) : -1;
      const target = i >= 0 ? list[i] : null;
      // Un párrafo vacío seleccionado se sustituye (como el menú «/»).
      if (target && target.type === 'paragraph' && !target.md.trim()) { next = mapBlock(list, target.id, () => nb); id = target.id; }
      else next = insertBlock(list, i >= 0 ? i + 1 : list.length, nb);
    } else next = insertBlock(list, Math.max(0, Math.min(at, list.length)), nb);
    if (PICKS.has(c.type)) autoPick.add(id);
    setHist((h) => pushHistory(h, next));
    setActiveId(id);
    raf2(() => { focusBlock(id, 'start'); flash(id); });
  }, [locked, focusBlock, flash]); // eslint-disable-line react-hooks/exhaustive-deps

  /** MDX → bloques sin editar (conservan su texto exacto) con el fin de línea del documento. */
  const parseFor = (mdx: string, eol: string) => parseMdx(mdx.replace(/\r?\n/g, eol)).map((p) => ({ ...p, eol: eol as Block['eol'] }));
  const getSelectedBlock = useCallback((): SelectedBlock | null => {
    if (locked) return null;
    const top = topOf(activeRef.current);
    const b = top ? blocksRef.current.find((x) => x.id === top) : null;
    return b ? { id: b.id, type: b.type, mdx: blockText(b, '\n') } : null;
  }, [locked]); // eslint-disable-line react-hooks/exhaustive-deps
  const replaceBlock = useCallback((id: string, mdx: string): boolean => {
    if (locked) return false;
    const list = blocksRef.current;
    const i = list.findIndex((b) => b.id === id);
    if (i < 0) return false;
    const old = list[i]!;
    const eol = old.eol ?? '\n';
    const parsed = parseFor(mdx.trim(), eol);
    if (!parsed.length) return false;
    const fixed = parsed.map((p, k) => {
      const n: Block = { ...p };
      if (k === 0) { if (old.pre != null) n.pre = old.pre; else delete n.pre; }
      if (k === parsed.length - 1) { n.sep = old.sep; n.nextId = old.nextId; }
      return n;
    });
    const next = list.slice();
    next.splice(i, 1, ...fixed);
    setHist((h) => pushHistory(h, next));
    setActiveId(fixed[0]!.id);
    raf2(() => flash(fixed[0]!.id));
    return true;
  }, [locked, flash]);
  const insertMdx = useCallback((mdx: string): boolean => {
    if (locked) return false;
    const list = blocksRef.current;
    const top = topOf(activeRef.current);
    const i = top ? list.findIndex((b) => b.id === top) : -1;
    const eol = list.find((b) => b.eol)?.eol ?? '\n';
    const parsed = parseFor(mdx.trim(), eol).map((p) => { const n: Block = { ...p, sep: eol + eol, nextId: undefined }; delete n.pre; return n; });
    if (!parsed.length) return false;
    let next = list;
    parsed.forEach((p, k) => { next = insertBlock(next, (i >= 0 ? i + 1 : list.length) + k, p); });
    setHist((h) => pushHistory(h, next));
    setActiveId(parsed[0]!.id);
    raf2(() => flash(parsed[0]!.id));
    return true;
  }, [locked, flash]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    getSelectedBlock, replaceBlock, insertMdx, undo: doUndo,
    focusLine: (line) => {
      const id = blockAtLine(blockLines(blocks), line);
      if (!id) return;
      const el = box.current?.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setActiveId(id);
      flash(id);
    },
    insert,
  }), [blocks, insert, flash, getSelectedBlock, replaceBlock, insertMdx, doUndo]);

  // Destino de la paleta: el bloque de primer nivel seleccionado.
  useEffect(() => {
    if (!onTarget) return;
    const top = locked ? null : topOf(activeId);
    const b = top ? blocks.find((x) => x.id === top) : null;
    onTarget(b ? blockSummary(b) : null);
  }, [activeId, blocks, locked, onTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pegar o soltar imágenes en el lienzo: se suben y se insertan después del bloque activo (o al final).
  const insertUploaded = async (files: File[], after: Element | null) => {
    if (!uploadImage) return;
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    const top = after?.closest('[data-top]')?.getAttribute('data-block-id') ?? null;
    const made: Block[] = [];
    for (const f of imgs) {
      try { const r = await uploadImage(f); made.push(newBlock('image', imageFromAsset({ path: r.path, width: r.width, height: r.height }))); toast(`Imagen subida: ${r.path}`); }
      catch (e) { toast(errText(e), 'error'); }
    }
    if (!made.length) return;
    setHist((h) => {
      let i = top ? h.present.findIndex((b) => b.id === top) + 1 : h.present.length;
      if (i <= 0) i = h.present.length;
      let next = h.present;
      for (const b of made) next = insertBlock(next, i++, b);
      return pushHistory(h, next);
    });
    setActiveId(made[made.length - 1].id);
  };
  /** Los diálogos (portales) propagan sus eventos por el árbol de React: solo cuentan los que ocurren dentro del lienzo. */
  const inCanvas = (t: EventTarget | null) => !!t && !!box.current?.contains(t as Node);
  const onPaste = (e: ClipboardEvent) => {
    if (locked || !inCanvas(e.target)) return;
    const files = Array.from(e.clipboardData.files);
    if (!files.some((f) => f.type.startsWith('image/'))) return;
    e.preventDefault();
    void insertUploaded(files, (document.activeElement && box.current?.contains(document.activeElement)) ? document.activeElement : activeId ? box.current?.querySelector(`[data-block-id="${activeId}"]`) ?? null : null);
  };

  /** Posición de primer nivel y altura (relativa al lienzo) del hueco bajo el puntero. */
  const slotAt = (clientY: number) => {
    const el = box.current!;
    const tops = Array.from(el.querySelectorAll<HTMLElement>('[data-top]')).filter((x) => x.closest('[data-canvas]') === el);
    const rects = tops.map((t) => t.getBoundingClientRect());
    const index = dropIndex(rects.map((r) => r.top + r.height / 2), clientY);
    const base = el.getBoundingClientRect().top;
    const y = rects.length === 0 ? 24 : index < rects.length ? rects[index].top - base - 8 : rects[rects.length - 1].bottom - base + 8;
    return { index, y };
  };
  const isPalette = (e: DragEvent) => e.dataTransfer.types.includes(BLOCK_MIME);
  const onDragOver = (e: DragEvent) => {
    if (locked) return;
    if (isPalette(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const s = slotAt(e.clientY);
      setDrop((d) => (d && d.index === s.index && d.y === s.y ? d : s));
    } else if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  };
  const onDragLeave = (e: DragEvent) => { if (!inCanvas(e.relatedTarget)) setDrop(null); };
  const onDrop = (e: DragEvent) => {
    if (locked) return;
    if (isPalette(e)) {
      e.preventDefault();
      const id = e.dataTransfer.getData(BLOCK_MIME);
      const s = slotAt(e.clientY);
      setDrop(null);
      if (id) insert(id, s.index);
      return;
    }
    if (!e.dataTransfer.files.length || !inCanvas(e.target)) return;
    e.preventDefault();
    void insertUploaded(Array.from(e.dataTransfer.files), e.target as Element);
  };
  useEffect(() => {
    if (!drop) return;
    const end = () => setDrop(null);
    window.addEventListener('dragend', end);
    window.addEventListener('drop', end);
    return () => { window.removeEventListener('dragend', end); window.removeEventListener('drop', end); };
  }, [drop]);

  const openTour = useCallback((req: TourRequest) => setTourReq(req), []);
  const probMap = useMemo(() => problemsByBlock(blocks, problems), [blocks, problems]);
  const ctx: EditorCtx = {
    readOnly: locked, activeId: locked ? null : activeId, setActive: setActiveId, caret, focusBlock, textTarget, setTextTarget, uploadImage, pickImage,
    tours, toursError, problems: probMap, flashId, undo: doUndo, notify: (t, k, a) => toast(t, k, a),
    openTour: locked ? undefined : openTour, reveal,
  };

  return (
    <div className="flex flex-col gap-3">
      {!safe && (
        <Callout tone="warn" icon={<ShieldAlert size={16} className="mt-0.5" />}>
          Esta página tiene un formato que el constructor no puede reproducir byte a byte, así que el lienzo queda <b>en solo lectura</b> para no cambiar nada al guardar.
          Edítela en la pestaña <b>Código MDX</b>.
        </Callout>
      )}
      {!locked && (
        <div className="-mt-1 flex items-center gap-1 text-sm text-ink-3">
          <IconButton size="icon-sm" label="Deshacer" shortcut="Ctrl+Z" icon={<Undo2 size={15} />} disabled={!canUndo(hist)} onClick={doUndo} />
          <IconButton size="icon-sm" label="Rehacer" shortcut="Ctrl+Y" icon={<Redo2 size={15} />} disabled={!canRedo(hist)} onClick={doRedo} />
          <span className="ml-1 max-sm:hidden">Haga clic en un bloque para editarlo · <b className="font-medium text-ink-2">+</b> entre bloques, <b className="font-medium text-ink-2">/</b> en un párrafo vacío o la paleta <b className="font-medium text-ink-2">Bloques</b> para insertar · arrastre por el asa para mover.</span>
        </div>
      )}
      <Ctx.Provider value={ctx}>
        <div ref={box} data-canvas="" onPaste={onPaste} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onMouseDown={(e) => { if (inCanvas(e.target) && !(e.target as HTMLElement).closest('[data-block-id]')) setActiveId(null); }}
          className={cn(S.doc, 'relative min-h-[40vh] pb-10 pt-6 md:pl-1', drop && 'rounded-lg outline-1 outline-offset-8 outline-accent-line outline-dashed')}>
          <BlockList blocks={blocks} onChange={commit} depth={0} />
          {drop && (
            <div aria-hidden="true" data-testid="drop-marker" className="pointer-events-none absolute inset-x-0 z-40 flex items-center" style={{ top: drop.y - 1 }}>
              <span className="size-2.5 -translate-x-1 rounded-full border-2 border-accent bg-bg" />
              <span className="h-0.5 flex-1 rounded-full bg-accent" />
              <span className="ml-2 rounded-sm bg-accent px-1.5 py-px text-[11px] font-medium leading-4 text-accent-fg">Soltar aquí</span>
            </div>
          )}
        </div>
      </Ctx.Provider>
      <TourStudio req={tourReq} onClose={() => setTourReq(null)} />
    </div>
  );
});
BlockEditor.displayName = 'BlockEditor';

const noopCommit: Commit = () => {};
/** Vista previa: los bloques del cuerpo en solo lectura, con el mismo componente que el lienzo. */
export function BlockPreview({ value }: { value: string }) {
  const blocks = useMemo(() => parseMdx(value), [value]);
  const { tours, error } = useTourIndex();
  const caret = useRef<EditorCtx['caret']['current']>(null);
  const ctx: EditorCtx = {
    readOnly: true, activeId: null, setActive: () => {}, caret, focusBlock: () => {}, textTarget: null, setTextTarget: () => {},
    tours, toursError: error, problems: new Map(), flashId: null, undo: () => {}, notify: () => {},
  };
  return <Ctx.Provider value={ctx}><div className={S.doc}><BlockList blocks={blocks} onChange={noopCommit} depth={0} /></div></Ctx.Provider>;
}
