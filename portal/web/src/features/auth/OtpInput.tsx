/*
 * Código de un solo uso de 6 dígitos: una casilla por dígito, con autoavance, borrado hacia atrás, flechas,
 * pegado (admite «123 456») y relleno automático del teléfono (autocomplete="one-time-code" en la primera casilla).
 */
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { digitsOnly, splitDigits } from './authModel';

const N = 6;

export function OtpInput({ value, onChange, onComplete, disabled, invalid, autoFocus, label = 'Código de verificación', describedBy }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean; invalid?: boolean; autoFocus?: boolean; label?: string; describedBy?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const cells = splitDigits(value, N);
  // Al terminar de verificar (el campo vuelve a estar activo) el foco regresa a la primera casilla libre.
  const wasDisabled = useRef(false);
  useEffect(() => {
    if (wasDisabled.current && !disabled) { const i = Math.min(value.length, N - 1); refs.current[i]?.focus(); }
    wasDisabled.current = !!disabled;
  }, [disabled, value.length]);
  const focus = (i: number) => { const el = refs.current[Math.max(0, Math.min(N - 1, i))]; el?.focus(); el?.select(); };
  const commit = (digits: string, nextFocus: number) => {
    onChange(digits);
    if (digits.length === N) { onComplete?.(digits); refs.current[N - 1]?.focus(); } else focus(nextFocus);
  };
  // El valor es una cadena contigua de dígitos: se escribe en la casilla `i` (o a continuación del último dígito).
  const put = (i: number, typed: string) => {
    const d = digitsOnly(typed, N);
    if (!d) return;
    const idx = Math.min(i, value.length);
    const next = (d.length === 1 ? value.slice(0, idx) + d + value.slice(idx + 1) : value.slice(0, idx) + d).slice(0, N);
    commit(next, idx + d.length);
  };
  const removeAt = (k: number) => value.slice(0, k) + value.slice(k + 1);
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (cells[i]) onChange(removeAt(i));
      else if (i > 0) { onChange(removeAt(i - 1)); focus(i - 1); }
    } else if (e.key === 'Delete') { e.preventDefault(); onChange(removeAt(i)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focus(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focus(i + 1); }
    else if (e.key === 'Home') { e.preventDefault(); focus(0); }
    else if (e.key === 'End') { e.preventDefault(); focus(N - 1); }
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const d = digitsOnly(e.clipboardData.getData('text'), N);
    if (d) commit(d, d.length);
  };
  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className="flex justify-between gap-2 max-sm:gap-1.5">
      {cells.map((c, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={c} disabled={disabled} autoFocus={autoFocus && i === 0}
          inputMode="numeric" pattern="[0-9]*" autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`${label}: dígito ${i + 1} de ${N}`} aria-invalid={invalid || undefined}
          spellCheck={false} autoCapitalize="off"
          onChange={(e) => put(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} onPaste={onPaste} onFocus={(e) => e.target.select()}
          className={cn('h-12 min-w-0 flex-1 rounded-md border border-line-strong bg-bg text-center font-mono text-xl font-medium text-ink tabular-nums transition-[border-color,box-shadow] hover:border-ink-4 focus:border-accent focus:outline-none focus:ring-3 focus:ring-ring disabled:bg-subtle disabled:text-ink-3 aria-invalid:border-danger')} />
      ))}
    </div>
  );
}
