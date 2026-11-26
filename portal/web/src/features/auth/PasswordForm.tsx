/*
 * Cambio de contraseña con la política a la vista: requisitos que se marcan mientras se escribe, medidor de fuerza
 * y los motivos (`problems`) que devuelva el servidor, que es quien decide. Lo usan Mi cuenta y la pantalla obligatoria.
 */
import { useState, type FormEvent } from 'react';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { Button, Callout, Field, FieldStack, IconButton, Input, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { authApi, problemsOf } from '@/lib/api.auth';
import { errText } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { passwordChecks, passwordOk, passwordStrength } from './authModel';

export function PolicyChecklist({ password, username }: { password: string; username: string }) {
  const checks = passwordChecks(password, username);
  const s = passwordStrength(password, username);
  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-line bg-subtle px-3 py-2.5">
      <ul aria-label="Requisitos de la contraseña" className="m-0 flex list-none flex-col gap-1 p-0">
        {checks.map((c) => (
          <li key={c.id} className={cn('flex items-center gap-2 text-[13px]', c.ok ? 'text-ok' : 'text-ink-2')}>
            {c.ok ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" className="text-ink-4" />}
            <span>{c.label}</span><span className="sr-only">{c.ok ? ': cumplido' : ': pendiente'}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3" aria-live="polite">
        <div aria-hidden="true" className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= s.score ? (s.score <= 1 ? 'bg-danger' : s.score === 2 ? 'bg-warn-dot' : 'bg-ok') : 'bg-muted')} />)}
        </div>
        <span className="shrink-0 text-right text-[12.5px] text-ink-2">{s.label ? `Fuerza: ${s.label}` : 'Fuerza'}</span>
      </div>
    </div>
  );
}

function PasswordInput({ id, describedBy, value, onChange, autoComplete, invalid, autoFocus }: { id: string; describedBy?: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} aria-describedby={describedBy} type={show ? 'text' : 'password'} className="pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} autoFocus={autoFocus} aria-invalid={invalid || undefined} />
      <IconButton className="absolute right-[3px] top-[3px]" size="icon-sm" tooltip={false} aria-pressed={show} label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} icon={show ? <EyeOff size={16} /> : <Eye size={16} />} onClick={() => setShow((s) => !s)} />
    </div>
  );
}

export function PasswordForm({ username, onDone, autoFocus, submitLabel = 'Cambiar contraseña' }: { username: string; onDone: () => void; autoFocus?: boolean; submitLabel?: string }) {
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  // Sin avisar mientras todavía la está escribiendo: solo si ya tiene su longitud o se aparta de lo escrito.
  const mismatch = again !== '' && (again.length >= nw.length ? again !== nw : !nw.startsWith(again));
  const same = nw !== '' && nw === cur;
  const ready = !!cur && passwordOk(nw, username) && nw === again && !same;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setError(''); setProblems([]);
    try {
      await authApi.changePassword(cur, nw);
      toast('Contraseña actualizada. Se cerraron sus otras sesiones.');
      setCur(''); setNw(''); setAgain('');
      onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'La contraseña actual no es correcta.' : errText(err));
      setProblems(problemsOf(err));
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className="max-w-[460px]">
      <FieldStack>
        <Field label="Contraseña actual">{(id, d) => <PasswordInput id={id} describedBy={d} value={cur} onChange={setCur} autoComplete="current-password" autoFocus={autoFocus} />}</Field>
        <Field label="Contraseña nueva" error={same ? 'La contraseña nueva debe ser distinta de la actual.' : undefined}>
          {(id, d) => <PasswordInput id={id} describedBy={d} value={nw} onChange={setNw} autoComplete="new-password" invalid={same} />}
        </Field>
        <PolicyChecklist password={nw} username={username} />
        <Field label="Repita la contraseña nueva" error={mismatch ? 'No coincide con la contraseña nueva.' : undefined}>
          {(id, d) => <PasswordInput id={id} describedBy={d} value={again} onChange={setAgain} autoComplete="new-password" invalid={mismatch} />}
        </Field>
        {error && (
          <Callout tone="danger">
            <strong>{error}</strong>
            {problems.length > 0 && <ul className="m-0 mt-1 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          </Callout>
        )}
        <div><Button type="submit" variant="primary" disabled={!ready || busy}>{busy ? 'Guardando…' : submitLabel}</Button></div>
      </FieldStack>
    </form>
  );
}
