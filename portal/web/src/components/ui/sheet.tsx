/**
 * Sheet: panel lateral modal (Radix Dialog) para pantallas estrechas: árbol de páginas, propiedades.
 *   <Sheet open onOpenChange side="left|right" title="Páginas">…</Sheet>
 */
import type { ReactNode } from 'react';
import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './button';

export function Sheet({ open, onOpenChange, side = 'left', title, children, className }: { open: boolean; onOpenChange: (o: boolean) => void; side?: 'left' | 'right'; title: string; children: ReactNode; className?: string }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[800] bg-scrim data-[state=open]:animate-fade" />
        <D.Content className={cn('fixed inset-y-0 z-[801] flex w-[min(340px,calc(100vw-40px))] flex-col bg-bg shadow-pop focus:outline-none data-[state=open]:animate-fade', side === 'left' ? 'left-0 border-r border-line' : 'right-0 border-l border-line', className)}>
          <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
            <D.Title className="text-[14.5px] font-semibold">{title}</D.Title>
            <D.Description className="sr-only">{title}</D.Description>
            <D.Close asChild><Button variant="ghost" size="icon" aria-label="Cerrar"><X size={18} /></Button></D.Close>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
