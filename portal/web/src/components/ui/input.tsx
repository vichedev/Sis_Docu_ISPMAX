/**
 * Input / Textarea / SearchInput: campos de texto.
 *   Input size: sm (30px) · md (34px). `mono` para rutas, slugs y código.
 *   Textarea `code` para JSON o MDX (monoespaciada, sin corrector).
 *   SearchInput: con lupa; `onValueChange` recibe el texto.
 */
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn';

export const fieldBase =
  'w-full rounded-md border border-line-strong bg-bg text-ink transition-[border-color,box-shadow] hover:border-ink-4 focus:border-accent focus:outline-none focus:ring-3 focus:ring-ring focus-visible:outline-none disabled:bg-subtle disabled:text-ink-3 read-only:bg-subtle aria-invalid:border-danger';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> { size?: 'sm' | 'md'; mono?: boolean }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, size = 'md', mono, ...p }, ref) => (
  <input ref={ref} className={cn(fieldBase, size === 'sm' ? 'h-[30px] px-2.5 text-sm' : 'h-[34px] px-2.5', mono && 'font-mono text-[12.5px]', className)} {...p} />
));
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { code?: boolean }
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, code, ...p }, ref) => (
  <textarea ref={ref} spellCheck={code ? false : p.spellCheck} className={cn(fieldBase, 'resize-y px-2.5 py-2 leading-normal', code && 'font-mono text-[12.5px] leading-[1.55] [tab-size:2]', className)} {...p} />
));
Textarea.displayName = 'Textarea';

export interface SearchInputProps extends Omit<InputProps, 'onChange' | 'type'> { onValueChange: (v: string) => void }
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({ className, onValueChange, size, ...p }, ref) => (
  <div className={cn('relative flex w-full items-center', className)}>
    <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-2.5 text-ink-3" />
    <Input ref={ref} type="search" size={size} className="pl-8" onChange={(e) => onValueChange(e.target.value)} {...p} />
  </div>
));
SearchInput.displayName = 'SearchInput';
