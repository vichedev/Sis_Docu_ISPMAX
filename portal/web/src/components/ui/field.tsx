/**
 * Label y Field: etiqueta + control + ayuda + error, con ids enlazados (aria-describedby).
 *   <Field label="Título" help="…" error={msg} optional>{(id, describedBy) => <Input id={id} aria-describedby={describedBy} />}</Field>
 *   o con un hijo simple: <Field label="Título" htmlFor="t"><Input id="t" /></Field>
 */
import { useId, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Label({ htmlFor, children, optional, className, id }: { htmlFor?: string; children: ReactNode; optional?: boolean; className?: string; id?: string }) {
  return (
    <label htmlFor={htmlFor} id={id} className={cn('inline-flex items-center gap-1.5 text-sm font-medium text-ink-2', className)}>
      {children}{optional && <span className="font-normal text-ink-3">· opcional</span>}
    </label>
  );
}

export function HelpText({ children, tone, id, className }: { children: ReactNode; tone?: 'warn' | 'error'; id?: string; className?: string }) {
  return <p id={id} className={cn('m-0 text-[12.5px] leading-snug [&>svg]:mr-1 [&>svg]:inline [&>svg]:align-[-2px]', tone === 'error' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-ink-3', className)}>
    {tone === 'error' && <CircleAlert size={13} />}{children}</p>;
}

export function Field({ label, help, error, optional, htmlFor, children, className }: {
  label?: ReactNode; help?: ReactNode; error?: ReactNode; optional?: boolean; htmlFor?: string; className?: string;
  children: ReactNode | ((id: string, describedBy: string | undefined) => ReactNode);
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const hid = `${id}-help`;
  const describedBy = error || help ? hid : undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && <Label htmlFor={id} optional={optional}>{label}</Label>}
      {typeof children === 'function' ? children(id, describedBy) : children}
      {error ? <HelpText id={hid} tone="error">{error}</HelpText> : help ? <HelpText id={hid}>{help}</HelpText> : null}
    </div>
  );
}

/** Pila de campos con espaciado uniforme. */
export const FieldStack = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('flex flex-col gap-4', className)}>{children}</div>;
/** Dos columnas en escritorio, una en móvil. */
export const FieldRow = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>;
