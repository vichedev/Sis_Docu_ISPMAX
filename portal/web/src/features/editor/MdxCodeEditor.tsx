/* Código MDX: alternativa avanzada al constructor por bloques. Barra de formato, subir/pegar capturas, Ctrl+B. */
import { forwardRef, useImperativeHandle, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { Bold, ChevronDown, Code, Heading2, ImagePlus, Images, Link2, List, ListOrdered, LoaderCircle, MessageSquareWarning, TextQuote, Upload } from 'lucide-react';
import { DropdownMenu, Textarea, Toolbar, ToolbarButton, ToolbarSeparator } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { BlockEditorHandle } from './BlockEditor';

const AVISOS = [
  { label: 'Nota', kind: 'tip', title: 'Nota' },
  { label: 'Importante', kind: 'warning', title: 'Importante' },
  { label: 'Advertencia', kind: 'danger', title: 'Advertencia' },
  { label: 'Información', kind: 'info', title: 'Nota' },
  { label: 'Servicio externo no probado', kind: 'info', title: 'Servicio externo no probado' },
];

export const MdxCodeEditor = forwardRef<BlockEditorHandle, {
  value: string; onChange: (v: string) => void; readOnly?: boolean; onFiles: (f: File[]) => Promise<string[]>; onPick: () => Promise<string | null>;
}>(({ value, onChange, readOnly, onFiles, onPick }, ref) => {
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useImperativeHandle(ref, () => ({
    focusLine: (line) => {
      const el = ta.current;
      if (!el) return;
      const lines = value.split('\n');
      const pos = lines.slice(0, Math.max(0, line - 1)).join('\n').length + (line > 1 ? 1 : 0);
      el.focus({ preventScroll: true });
      el.setSelectionRange(pos, pos + (lines[line - 1]?.length ?? 0));
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 21;
      const scroller = el.closest('[data-scroll]');
      const top = el.getBoundingClientRect().top + (line - 4) * lh;
      if (scroller) scroller.scrollBy({ top: top - scroller.getBoundingClientRect().top, behavior: 'smooth' });
    },
  }), [value]);

  const insert = (make: (sel: string) => string, placeholder = '') => {
    const el = ta.current;
    if (!el || readOnly) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = value.slice(s, e) || placeholder;
    const before = value.slice(0, s);
    const lead = before.length && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const text = make(sel);
    onChange(before + lead + text + value.slice(e));
    const pos = (before + lead + text).length;
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos); });
  };
  const wrap = (l: string, r: string, ph: string) => {
    const el = ta.current;
    if (!el || readOnly) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = value.slice(s, e) || ph;
    onChange(value.slice(0, s) + l + sel + r + value.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + l.length, s + l.length + sel.length); });
  };
  const upload = async (files: File[]) => {
    setUploading(true);
    try { const snippets = await onFiles(files); for (const sn of snippets) insert(() => `${sn}\n\n`); }
    finally { setUploading(false); }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); wrap('**', '**', 'texto'); } };
  const onPaste = (e: ClipboardEvent) => { const f = Array.from(e.clipboardData.files); if (f.some((x) => x.type.startsWith('image/'))) { e.preventDefault(); void upload(f); } };
  const onDrop = (e: DragEvent) => { setDragging(false); if (e.dataTransfer.files.length) { e.preventDefault(); void upload(Array.from(e.dataTransfer.files)); } };
  const dis = readOnly;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line">
      <div className="sticky top-0 z-[2] flex min-h-10 flex-wrap items-center gap-1 border-b border-line bg-bg px-1.5 py-1">
        <Toolbar label="Formato">
          <ToolbarButton label="Título de sección" icon={<Heading2 size={16} />} disabled={dis} onClick={() => insert((s) => `## ${s}\n\n`, 'Sección')} />
          <ToolbarButton label="Negrita" shortcut="Ctrl+B" icon={<Bold size={16} />} disabled={dis} onClick={() => wrap('**', '**', 'texto')} />
          <ToolbarButton label="Código" icon={<Code size={16} />} disabled={dis} onClick={() => wrap('`', '`', 'código')} />
          <ToolbarButton label="Enlace" icon={<Link2 size={16} />} disabled={dis} onClick={() => wrap('[', '](/ruta)', 'texto del enlace')} />
          <ToolbarButton label="Lista" icon={<List size={16} />} disabled={dis} onClick={() => insert((s) => `- ${s}\n`, 'Elemento')} />
          <ToolbarSeparator />
          <ToolbarButton label="Entradilla" icon={<TextQuote size={16} />} disabled={dis} onClick={() => insert((s) => `<Lead>${s}</Lead>\n\n`, 'Entradilla de la página.')} />
          <ToolbarButton label="Pasos numerados" icon={<ListOrdered size={16} />} disabled={dis} onClick={() => insert((s) => `<Steps>\n<Step>\n\n${s}\n\n</Step>\n</Steps>\n\n`, 'Describa el paso.')} />
        </Toolbar>
        <DropdownMenu align="start" label="Insertar aviso" items={AVISOS.map((a) => ({ label: a.label, disabled: dis, onSelect: () => insert((s) => `:::${a.kind} ${a.title}\n\n${s}\n\n:::\n\n`, 'Texto del aviso.') }))}
          trigger={<button type="button" aria-label="Insertar aviso" disabled={dis} className="inline-flex h-7 cursor-pointer items-center gap-0.5 rounded-md px-1 text-ink-2 hover:bg-subtle disabled:opacity-40 data-[state=open]:bg-muted"><MessageSquareWarning size={16} /><ChevronDown size={12} /></button>} />
        <DropdownMenu align="start" label="Insertar imagen" items={[
          { label: 'Subir una captura…', icon: <Upload size={16} />, disabled: dis, onSelect: () => fileIn.current?.click() },
          { label: 'Elegir de la biblioteca…', icon: <Images size={16} />, disabled: dis, onSelect: () => { void onPick().then((sn) => { if (sn) insert(() => `${sn}\n\n`); }); } },
        ]} trigger={<button type="button" aria-label="Insertar imagen" disabled={dis} className="inline-flex h-7 cursor-pointer items-center gap-0.5 rounded-md px-1 text-ink-2 hover:bg-subtle disabled:opacity-40 data-[state=open]:bg-muted"><ImagePlus size={16} /><ChevronDown size={12} /></button>} />
        <input ref={fileIn} type="file" accept="image/*" multiple hidden onChange={(e) => { void upload(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <span className="flex-1" />
        {uploading && <span className="inline-flex items-center gap-1.5 pr-1 text-sm text-ink-3"><LoaderCircle size={14} className="animate-spin" /> Subiendo…</span>}
      </div>
      <Textarea ref={ta} code aria-label="Cuerpo de la página en MDX" value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey} onPaste={onPaste}
        onDragOver={(e) => { if (!readOnly) { e.preventDefault(); setDragging(true); } }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
        placeholder="Escriba el cuerpo en MDX. Arrastre o pegue una captura para subirla."
        className={cn('min-h-[55vh] resize-none rounded-none border-0 px-5 py-4 text-[13.5px] leading-[1.65] [field-sizing:content] read-only:bg-bg hover:border-0 focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          dragging && 'bg-accent-soft ring-2 ring-inset ring-accent')} />
    </div>
  );
});
MdxCodeEditor.displayName = 'MdxCodeEditor';
