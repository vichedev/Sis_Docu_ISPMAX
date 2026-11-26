/**
 * DropdownMenu (Radix): menú de acciones con teclado (flechas, Inicio/Fin, Esc, escribir para saltar).
 *   <DropdownMenu trigger={<IconButton …/>} align="end" items={[{ label, icon, onSelect, danger, shortcut, href }, { separator: true }]} />
 *   `header` añade una cabecera (p. ej. nombre de usuario); `radio` agrupa opciones exclusivas (tema).
 *   `open`/`onOpenChange` permiten abrirlo desde fuera (clic derecho en el árbol).
 */
import type { ReactNode } from 'react';
import { DropdownMenu as M } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export type MenuEntry =
  | { separator: true }
  | { label: ReactNode; icon?: ReactNode; onSelect?: () => void; href?: string; external?: boolean; danger?: boolean; disabled?: boolean; shortcut?: string }
  | { radio: { value: string; onValueChange: (v: string) => void; options: { value: string; label: ReactNode; icon?: ReactNode }[] } };

const itemCls = 'flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 text-[13.5px] text-ink no-underline outline-none hover:no-underline data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-4 data-[highlighted]:bg-muted [&>svg]:text-ink-3';

export const menuContentCls = 'z-[950] min-w-[220px] rounded-lg border border-line bg-raised p-1 shadow-pop data-[state=open]:animate-fade-in';

export function DropdownMenu({ trigger, items, header, align = 'end', side = 'bottom', open, onOpenChange, label }: {
  trigger: ReactNode; items: MenuEntry[]; header?: ReactNode; align?: 'start' | 'end' | 'center'; side?: 'top' | 'bottom' | 'right' | 'left';
  open?: boolean; onOpenChange?: (o: boolean) => void; label?: string;
}) {
  return (
    <M.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content align={align} side={side} sideOffset={4} collisionPadding={8} aria-label={label} className={menuContentCls}>
          {header && <div className="-mx-1 -mt-1 mb-1 flex flex-col border-b border-line px-3 pb-2.5 pt-2">{header}</div>}
          {items.map((it, i) => {
            if ('separator' in it) return <M.Separator key={i} className="-mx-1 my-1 h-px bg-line" />;
            if ('radio' in it) return (
              <M.RadioGroup key={i} value={it.radio.value} onValueChange={it.radio.onValueChange}>
                {it.radio.options.map((o) => (
                  <M.RadioItem key={o.value} value={o.value} className={itemCls}>
                    {o.icon}<span className="flex-1">{o.label}</span>
                    <M.ItemIndicator className="text-accent-ink"><Check size={14} /></M.ItemIndicator>
                  </M.RadioItem>
                ))}
              </M.RadioGroup>
            );
            const content = <>{it.icon}<span className="flex-1">{it.label}</span>{it.shortcut && <span className="text-xs text-ink-3">{it.shortcut}</span>}</>;
            return it.href && !it.disabled ? (
              <M.Item key={i} asChild className={cn(itemCls, it.danger && 'text-danger [&>svg]:text-danger')}>
                <a href={it.href} target={it.external ? '_blank' : undefined} rel={it.external ? 'noopener noreferrer' : undefined}>{content}</a>
              </M.Item>
            ) : (
              <M.Item key={i} disabled={it.disabled} onSelect={it.onSelect} className={cn(itemCls, it.danger && 'text-danger [&>svg]:text-danger')}>{content}</M.Item>
            );
          })}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
