/**
 * CopyButton: copia un texto y confirma con un toast (icono → check durante 1,5 s).
 * CodeBlock: fragmento monoespaciado con botón de copiar (p. ej. `<Figure …/>`, `<Tour id="…" />`).
 * LogViewer: salida de un trabajo; se desplaza sola al final mientras llega texto.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/cn';
import { copy } from '../../lib/util';
import { IconButton, Button } from './button';
import { useToast } from './toast';

export function CopyButton({ text, label = 'Copiar', done = 'Copiado', withText, size = 'icon-sm' }: { text: string; label?: string; done?: string; withText?: boolean; size?: 'icon' | 'icon-sm' }) {
  const toast = useToast();
  const [ok, setOk] = useState(false);
  const run = async () => {
    const r = await copy(text);
    toast(r ? done : 'No se pudo copiar', r ? 'info' : 'error');
    if (r) { setOk(true); setTimeout(() => setOk(false), 1500); }
  };
  const icon = ok ? <Check size={14} className="text-ok" /> : <Copy size={14} />;
  return withText ? <Button onClick={run}>{icon}{label}</Button> : <IconButton label={label} icon={icon} size={size} onClick={run} />;
}

export function CodeBlock({ code, className, copyLabel = 'Copiar fragmento' }: { code: string; className?: string; copyLabel?: string }) {
  return (
    <div className={cn('flex items-start gap-1.5 rounded-md border border-line bg-subtle py-2 pl-2.5 pr-1.5', className)}>
      <code className="flex-1 break-all font-mono text-[11.5px] leading-normal text-ink-2">{code}</code>
      <CopyButton text={code} label={copyLabel} done="Fragmento copiado" />
    </div>
  );
}

export function LogViewer({ log, running, className, emptyText = 'Sin salida.' }: { log: string; running?: boolean; className?: string; emptyText?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [log]);
  return (
    <pre ref={ref} tabIndex={0} aria-label="Registro" className={cn('m-0 max-h-[340px] overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-subtle px-3.5 py-3 font-mono text-xs leading-[1.6] text-ink-2', className)}>
      {log || (running ? 'Esperando salida…' : emptyText)}
    </pre>
  );
}
