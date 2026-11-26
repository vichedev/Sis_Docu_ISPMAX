/**
 * FileDropzone: zona para soltar archivos o elegirlos (botón accesible con teclado).
 *   <FileDropzone accept="image/*" multiple files={files} onFiles={setFiles} hint="…" />
 *   Filtra por `accept` (tipo MIME con comodín) y muestra los nombres elegidos.
 */
import { useRef, useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../../lib/cn';

const matches = (f: File, accept?: string) => !accept || accept.split(',').some((a) => { const t = a.trim(); return t.endsWith('/*') ? f.type.startsWith(t.slice(0, -1)) : f.type === t || f.name.endsWith(t); });

export function FileDropzone({ onFiles, files, accept, multiple, hint, className, children }: { onFiles: (f: File[]) => void; files?: File[]; accept?: string; multiple?: boolean; hint?: ReactNode; className?: string; children?: ReactNode }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const take = (list: FileList | null) => { const l = Array.from(list ?? []).filter((f) => matches(f, accept)); onFiles(multiple ? l : l.slice(0, 1)); };
  return (
    <>
      <button type="button" onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
        className={cn('flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-subtle p-5 text-center text-ink-3 hover:border-accent hover:bg-accent-soft hover:text-ink-2',
          over && 'border-accent bg-accent-soft text-ink-2', files?.length && 'text-ink', className)}>
        <Upload size={20} />
        {children ?? <span>{files?.length ? files.map((f) => f.name).join(', ') : <>Arrastre {multiple ? 'archivos' : 'un archivo'} aquí o <u className="text-accent-ink">elíjalos del equipo</u></>}</span>}
        {hint && <span className="text-xs text-ink-3">{hint}</span>}
      </button>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </>
  );
}
