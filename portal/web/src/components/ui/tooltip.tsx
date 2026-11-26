/**
 * Tooltip: ayuda breve al pasar el ratón o enfocar. No sustituye al nombre accesible
 * (use aria-label en el disparador). Requiere <TooltipProvider> en la raíz (App).
 */
import type { ReactNode } from 'react';
import { Tooltip as T } from 'radix-ui';
import { cn } from '../../lib/cn';

export const TooltipProvider = ({ children }: { children: ReactNode }) => <T.Provider delayDuration={350} skipDelayDuration={200}>{children}</T.Provider>;

export function Tooltip({ content, children, side = 'bottom', className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right'; className?: string }) {
  if (!content) return <>{children}</>;
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className={cn('z-[1300] max-w-64 rounded-sm bg-ink px-2 py-1 text-xs font-medium text-bg data-[state=delayed-open]:animate-fade-in', className)}>
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
