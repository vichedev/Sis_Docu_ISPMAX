/*
 * Campo de texto del lienzo: muestra el Markdown ya formateado y, al hacer clic o enfocarlo con Tab, se
 * convierte en un área de texto autoajustable con el mismo tamaño de letra. Al salir vuelve a la vista.
 * Atajos: Ctrl+B negrita · Ctrl+I cursiva · Ctrl+E código · Ctrl+K enlace · Intro (si el bloque lo admite)
 * crea el siguiente · Retroceso en vacío lo borra · flechas en los extremos pasan al bloque vecino.
 * El valor que guarda es siempre Markdown tal cual: nunca transforma el texto por su cuenta.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { linkSelection, slashQuery, splitAt, wrapSelection, type TextEdit } from '../model/text';
import { useEditor } from './context';
import { Inline } from './Inline';

export interface RichTextProps {
  value: string;
  onChange: (v: string) => void;
  blockId: string;
  label: string;
  placeholder?: string;
  className?: string;
  /** Vista cuando no se edita (por defecto, Markdown en línea). */
  view?: (v: string) => ReactNode;
  /** Sin saltos de línea (títulos, antetítulo…): Intro llama a onEnter o no hace nada. */
  singleLine?: boolean;
  mono?: boolean;
  /** Formato en línea (barra y atajos). false en código, rutas y términos. */
  format?: boolean;
  onEnter?: (before: string, after: string) => void;
  onBackspaceEmpty?: () => void;
  onArrowOut?: (dir: 'prev' | 'next') => void;
  /** Menú «/»: recibe la consulta (o null) y el área de texto. Devuelve true si consumió la tecla. */
  onSlash?: (q: string | null, el: HTMLTextAreaElement) => void;
  slashKey?: (e: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  as?: 'div' | 'span';
  /** Campo secundario (título de aviso o de paso): al enfocar el bloque se prefiere el texto principal. */
  secondary?: boolean;
}

/** Offset aproximado en el Markdown a partir del punto del clic en la vista formateada. */
function caretFromClick(e: MouseEvent<HTMLElement>, value: string): number | null {
  const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
  const r = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
  if (!r || !e.currentTarget.contains(r.startContainer)) return null;
  const pre = document.createRange();
  pre.selectNodeContents(e.currentTarget);
  pre.setEnd(r.startContainer, r.startOffset);
  const plain = e.currentTarget.textContent ?? '';
  if (!plain.length) return null;
  const off = pre.toString().length;
  if (off >= plain.length) return value.length;
  return Math.round((off / plain.length) * value.length);
}

export function RichText({ value, onChange, blockId, label, placeholder, className, view, singleLine, mono, format = true, onEnter, onBackspaceEmpty, onArrowOut, onSlash, slashKey, as = 'div', secondary }: RichTextProps) {
  const ed = useEditor();
  const [editing, setEditing] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const apply = (fn: (v: string, s: number, e: number) => TextEdit) => {
    const el = ta.current;
    if (!el) return;
    const r = fn(valueRef.current, el.selectionStart, el.selectionEnd);
    onChange(singleLine ? r.value.replace(/\r?\n/g, ' ') : r.value);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.start, r.end); });
  };
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useLayoutEffect(() => {
    if (!editing) return;
    const el = ta.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const c = ed.caret.current;
    ed.caret.current = null;
    const pos = c === 'start' ? 0 : typeof c === 'number' ? Math.min(c, el.value.length) : el.value.length;
    el.setSelectionRange(pos, pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);
  useEffect(() => () => { if (ed.textTarget?.blockId === blockId) ed.setTextTarget(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const Tag = as;
  if (ed.readOnly || !editing) {
    const empty = !value.trim();
    return (
      <Tag data-field={secondary ? 'secondary' : ''} role={ed.readOnly ? undefined : 'textbox'} aria-label={ed.readOnly ? undefined : label} tabIndex={ed.readOnly ? undefined : 0}
        onMouseDown={ed.readOnly ? undefined : (e) => { if (e.button === 0 && !(e.target as HTMLElement).closest('a')) { ed.caret.current = caretFromClick(e, value); } }}
        onFocus={ed.readOnly ? undefined : () => { ed.setActive(blockId); setEditing(true); }}
        className={cn(className, !ed.readOnly && 'cursor-text rounded-sm outline-none', as === 'span' && 'block', mono && 'whitespace-pre-wrap font-mono', empty && !ed.readOnly && 'text-ink-4')}>
        {empty ? (ed.readOnly ? null : placeholder ?? '') : view ? view(value) : <Inline md={value} live={ed.readOnly} />}
      </Tag>
    );
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashKey?.(e)) return;
    const el = e.currentTarget;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && format && !e.altKey && !e.shiftKey && (k === 'b' || k === 'i' || k === 'e' || k === 'k')) {
      e.preventDefault(); e.stopPropagation();
      apply(k === 'b' ? (v, s, en) => wrapSelection(v, s, en, '**') : k === 'i' ? (v, s, en) => wrapSelection(v, s, en, '*') : k === 'e' ? (v, s, en) => wrapSelection(v, s, en, '`', '`', 'código') : linkSelection);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod && (singleLine || onEnter)) {
      e.preventDefault();
      if (onEnter) { const [a, b] = splitAt(el.value, el.selectionStart, el.selectionEnd); onEnter(a, b); }
      return;
    }
    if (e.key === 'Backspace' && !el.value && onBackspaceEmpty) { e.preventDefault(); onBackspaceEmpty(); return; }
    if (onArrowOut && el.selectionStart === el.selectionEnd && !e.shiftKey && !mod) {
      const atStart = el.selectionStart === 0, atEnd = el.selectionEnd === el.value.length;
      if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && atStart) { e.preventDefault(); onArrowOut('prev'); return; }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && atEnd) { e.preventDefault(); onArrowOut('next'); return; }
    }
    if (e.key === 'Escape') { e.preventDefault(); el.blur(); }
  };

  return (
    <textarea ref={ta} aria-label={label} value={value} placeholder={placeholder} rows={1} spellCheck={!mono}
      onChange={(e) => {
        const v = singleLine ? e.target.value.replace(/\r?\n/g, ' ') : e.target.value;
        onChange(v);
        onSlash?.(slashQuery(v), e.target);
      }}
      onKeyDown={onKey}
      onFocus={() => { ed.setActive(blockId); if (format) ed.setTextTarget({ blockId, apply: (fn) => applyRef.current(fn) }); }}
      onBlur={() => { setEditing(false); if (ed.textTarget?.blockId === blockId) ed.setTextTarget(null); onSlash?.(null, ta.current!); }}
      className={cn(className, 'm-0 block w-full resize-none overflow-hidden rounded-sm border-0 bg-accent-soft/40 p-0 shadow-[0_0_0_3px_var(--accent-soft)] outline-none [field-sizing:content] placeholder:text-ink-4 focus-visible:outline-none',
        mono && 'font-mono')} />
  );
}
