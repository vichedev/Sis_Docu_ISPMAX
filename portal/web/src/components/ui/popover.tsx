/**
 * Popover (Radix): capa flotante no modal anclada a un disparador (p. ej. formularios cortos).
 *   <Popover trigger={<Button>…</Button>} align="start">contenido</Popover>
 */
import type { ReactNode } from 'react';
import { Popover as P } from 'radix-ui';
import { cn } from '../../lib/cn';

export function Popover({ trigger, children, align = 'start', side = 'bottom', className, open, onOpenChange, label }: {
  trigger: ReactNode; children: ReactNode; align?: 'start' | 'center' | 'end'; side?: 'top' | 'bottom' | 'left' | 'right'; className?: string; open?: boolean; onOpenChange?: (o: boolean) => void; /** Nombre accesible de la capa. */ label?: string;
}) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content aria-label={label} align={align} side={side} sideOffset={6} collisionPadding={8} className={cn('z-[950] w-72 rounded-lg border border-line bg-raised p-3 shadow-pop focus:outline-none data-[state=open]:animate-fade-in', className)}>
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
