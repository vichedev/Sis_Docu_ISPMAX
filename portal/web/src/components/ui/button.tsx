/**
 * Button: acción de la interfaz.
 *   variant: primary (una por zona: la acción principal) · secondary (por defecto) · ghost · danger · danger-ghost · link
 *   size: sm (28px) · md (32px) · lg (36px) · icon (32×32) · icon-sm (28×28)
 *   asChild: aplica el estilo a su hijo (p. ej. un <a>).
 * IconButton: botón solo con icono; `label` es obligatorio (nombre accesible + tooltip).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { Tooltip } from './tooltip';

export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border font-medium no-underline transition-colors hover:no-underline disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border-accent bg-accent text-accent-fg hover:border-accent-hover hover:bg-accent-hover disabled:hover:bg-accent',
        secondary: 'border-line-strong bg-bg text-ink hover:bg-subtle active:bg-muted',
        ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-subtle hover:text-ink active:bg-muted data-[state=open]:bg-muted data-[state=open]:text-ink aria-pressed:bg-muted aria-pressed:text-ink',
        danger: 'border-danger bg-danger text-white hover:border-danger-hover hover:bg-danger-hover dark:text-black',
        'danger-ghost': 'border-line-strong bg-bg text-danger hover:border-danger hover:bg-danger-soft',
        link: 'h-auto border-transparent bg-transparent p-0 text-accent-ink hover:underline',
      },
      size: {
        sm: 'h-7 px-2.5 text-sm',
        md: 'h-8 px-3 text-[13.5px]',
        lg: 'h-9 px-4 text-base',
        icon: 'size-8 p-0',
        'icon-sm': 'size-7 p-0',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, type, ...props }, ref) => {
  const C = asChild ? Slot.Root : 'button';
  return <C ref={ref} type={asChild ? undefined : (type ?? 'button')} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = 'Button';

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> { label: string; icon: ReactNode; size?: 'icon' | 'icon-sm'; tooltip?: boolean; shortcut?: string }
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ label, icon, size = 'icon', variant = 'ghost', tooltip = true, shortcut, ...props }, ref) => {
  const btn = <Button ref={ref} aria-label={label} size={size} variant={variant} {...props}>{icon}</Button>;
  return tooltip ? <Tooltip content={shortcut ? `${label} (${shortcut})` : label}>{btn}</Tooltip> : btn;
});
IconButton.displayName = 'IconButton';
