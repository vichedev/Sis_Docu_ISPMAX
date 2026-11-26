/**
 * Tabs (Radix): pestañas con subrayado violeta en la activa.
 *   <Tabs value onValueChange><TabsList aria-label="…"><TabsTrigger value="a">A</TabsTrigger></TabsList><TabsContent value="a">…</TabsContent></Tabs>
 *   TabsList `size="sm"` para barras de herramientas; `bordered` dibuja la línea inferior.
 * SegmentedControl: elección exclusiva corta (2-4 opciones) en un bloque compacto (Radix ToggleGroup).
 */
import type { ReactNode } from 'react';
import { Tabs as T, ToggleGroup } from 'radix-ui';
import { cn } from '../../lib/cn';

export const Tabs = T.Root;
export function TabsList({ children, className, size = 'md', bordered = true, ...p }: { children: ReactNode; className?: string; size?: 'sm' | 'md'; bordered?: boolean; 'aria-label'?: string }) {
  return <T.List className={cn('flex gap-5 overflow-x-auto [scrollbar-width:none]', bordered && 'border-b border-line', size === 'sm' && 'gap-4', className)} {...p}>{children}</T.List>;
}
export function TabsTrigger({ value, children, className, size = 'md' }: { value: string; children: ReactNode; className?: string; size?: 'sm' | 'md' }) {
  return (
    <T.Trigger value={value} className={cn('relative inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap px-px font-medium text-ink-3 hover:text-ink data-[state=active]:text-ink',
      "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-sm after:bg-transparent after:content-[''] data-[state=active]:after:bg-accent",
      size === 'sm' ? 'h-11 text-sm' : 'h-9 text-[13.5px]', className)}>{children}</T.Trigger>
  );
}
/** `forceMount`: el contenido sigue montado (oculto) al cambiar de pestaña; conserva su estado (p. ej. el historial del lienzo). */
export const TabsContent = ({ value, children, className, forceMount }: { value: string; children: ReactNode; className?: string; forceMount?: boolean }) =>
  <T.Content value={value} forceMount={forceMount || undefined} className={cn('focus-visible:outline-none', forceMount && 'data-[state=inactive]:hidden', className)}>{children}</T.Content>;

export function SegmentedControl<V extends string>({ value, onValueChange, options, label, className, disabled }: { value: V; onValueChange: (v: V) => void; options: { value: V; label: ReactNode }[]; label: string; className?: string; disabled?: boolean }) {
  return (
    <ToggleGroup.Root type="single" value={value} onValueChange={(v) => { if (v) onValueChange(v as V); }} aria-label={label} disabled={disabled}
      className={cn('inline-flex gap-0.5 rounded-md border border-line bg-subtle p-0.5', className)}>
      {options.map((o) => (
        <ToggleGroup.Item key={o.value} value={o.value} className="h-[26px] cursor-pointer whitespace-nowrap rounded-sm px-2.5 text-sm font-medium text-ink-3 hover:text-ink disabled:cursor-not-allowed data-[state=on]:bg-bg data-[state=on]:text-ink data-[state=on]:shadow-[0_0_0_1px_var(--border-strong)]">
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
