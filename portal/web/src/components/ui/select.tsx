/**
 * Select: lista desplegable accesible (Radix). Para listas cortas y medianas.
 *   options: [{ value, label }] o groups: [{ label, options }]. Los valores no pueden ser '' (use p. ej. 'all').
 *   size: sm · md. Necesita `aria-label` si no hay <Label htmlFor> asociado (pase `id`).
 */
import type { ReactNode } from 'react';
import { Select as S } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectOption { value: string; label: ReactNode; disabled?: boolean }
export interface SelectProps {
  value: string; onValueChange: (v: string) => void;
  options?: SelectOption[]; groups?: { label: string; options: SelectOption[] }[];
  placeholder?: string; size?: 'sm' | 'md'; className?: string; id?: string; disabled?: boolean; 'aria-label'?: string;
}

const Item = ({ o }: { o: SelectOption }) => (
  <S.Item value={o.value} disabled={o.disabled} className="relative flex h-8 cursor-pointer select-none items-center rounded-sm pl-7 pr-3 text-[13.5px] text-ink outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-4 data-[highlighted]:bg-muted">
    <S.ItemIndicator className="absolute left-2 inline-flex text-accent-ink"><Check size={14} /></S.ItemIndicator>
    <S.ItemText>{o.label}</S.ItemText>
  </S.Item>
);

export function Select({ value, onValueChange, options, groups, placeholder, size = 'md', className, id, disabled, ...a }: SelectProps) {
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger id={id} aria-label={a['aria-label']} className={cn('inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-line-strong bg-bg px-2.5 text-left text-ink hover:border-ink-4 focus:border-accent focus:outline-none focus:ring-3 focus:ring-ring disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-3 data-[placeholder]:text-ink-4',
        size === 'sm' ? 'h-[30px] text-sm' : 'h-[34px]', className)}>
        <span className="truncate"><S.Value placeholder={placeholder} /></span>
        <S.Icon><ChevronDown size={14} className="text-ink-3" /></S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={4} className="z-[1000] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-raised shadow-pop data-[state=open]:animate-fade-in">
          <S.Viewport className="p-1">
            {options?.map((o) => <Item key={o.value} o={o} />)}
            {groups?.map((g, i) => (
              <S.Group key={g.label}>
                {i > 0 && <S.Separator className="-mx-1 my-1 h-px bg-line" />}
                <S.Label className="px-2 pb-1 pt-1.5 text-xs font-medium text-ink-3">{g.label}</S.Label>
                {g.options.map((o) => <Item key={o.value} o={o} />)}
              </S.Group>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
