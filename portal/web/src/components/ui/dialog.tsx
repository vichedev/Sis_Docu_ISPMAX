/**
 * Dialog (Radix): ventana modal con foco atrapado, Esc y retorno del foco.
 *   <Dialog open onOpenChange title="…" description="…" size="sm|md|lg|xl" footer={<>…</>}>cuerpo</Dialog>
 * ConfirmDialog: SOLO para acciones destructivas o irreversibles.
 *   `requireText="RESTAURAR"` exige escribir la palabra; `danger` pinta el botón en rojo.
 */
import { useState, type ReactNode } from 'react';
import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './button';
import { Input } from './input';
import { Field } from './field';

const sizes = { sm: 'max-w-[440px]', md: 'max-w-[560px]', lg: 'max-w-[820px]', xl: 'max-w-[1040px]' } as const;

export interface DialogProps {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode;
  size?: keyof typeof sizes; bodyClassName?: string; position?: 'center' | 'top';
}
export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md', bodyClassName, position = 'center' }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[900] bg-scrim data-[state=open]:animate-fade" />
        <D.Content onOpenAutoFocus={(e) => {
            const body = (e.currentTarget as HTMLElement).querySelector('[data-dialog-body]');
            const el = body?.querySelector<HTMLElement>('[autofocus], input:not([type=hidden]):not([disabled]), textarea:not([disabled]), [role=radio], button:not([disabled])');
            if (el) { e.preventDefault(); el.focus(); }
          }}
          className={cn('fixed left-1/2 z-[901] flex max-h-[calc(100vh-32px)] w-[calc(100%-16px)] -translate-x-1/2 flex-col rounded-lg border border-line bg-raised shadow-pop focus:outline-none data-[state=open]:animate-fade',
            position === 'top' ? 'top-[12vh] max-h-[76vh] max-sm:top-2' : 'top-1/2 -translate-y-1/2', sizes[size])}>
          <header className="flex items-start justify-between gap-3 border-b border-line py-3 pl-5 pr-3">
            <div className="min-w-0 pt-1">
              <D.Title className="flex items-center gap-2 text-[15.5px] font-semibold">{title}</D.Title>
              {description ? <D.Description className="mt-0.5 text-sm text-ink-3">{description}</D.Description> : <D.Description className="sr-only">{typeof title === 'string' ? title : 'Diálogo'}</D.Description>}
            </div>
            <D.Close asChild><Button variant="ghost" size="icon" aria-label="Cerrar"><X size={18} /></Button></D.Close>
          </header>
          {children && <div data-dialog-body className={cn('overflow-auto px-5 py-4 max-sm:px-4', bodyClassName)}>{children}</div>}
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 rounded-b-lg border-t border-line bg-subtle px-5 py-3">{footer}</footer>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, children, confirmLabel = 'Confirmar', danger, onConfirm, requireText }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void | Promise<void>; requireText?: string;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = !requireText || typed === requireText;
  const close = (o: boolean) => { if (!o) setTyped(''); onOpenChange(o); };
  return (
    <Dialog open={open} onOpenChange={close} size="sm" title={title} footer={<>
      <Button onClick={() => close(false)}>Cancelar</Button>
      <Button variant={danger ? 'danger' : 'primary'} disabled={!ok || busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); setTyped(''); } }}>{busy ? 'Un momento…' : confirmLabel}</Button>
    </>}>
      <div className="text-ink-2">{children}</div>
      {requireText && (
        <Field className="mt-4" label={<>Escriba <code>{requireText}</code> para continuar</>}>
          {(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />}
        </Field>
      )}
    </Dialog>
  );
}
