/*
 * Inicio de sesión: usuario y contraseña → (si la cuenta lo tiene) verificación en dos pasos.
 * Errores siempre genéricos (sin saber si el usuario existe), cuenta atrás cuando el servidor bloquea (429),
 * aviso de Bloq Mayús y estados de carga accesibles. Contrato: Adenda 5 de portal/CONTRACT.md.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, LifeBuoy, TriangleAlert } from 'lucide-react';
import { Button, Callout, Card, Field, FieldStack, IconButton, Input, Spinner } from '@/components/ui';
import { ApiError, type User } from '@/lib/api';
import { authApi, isChallenge } from '@/lib/api.auth';
import { errText } from '@/lib/auth';
import { AuthShell } from './AuthShell';
import { OtpInput } from './OtpInput';
import { digitsOnly, formatCountdown, lockRemaining, looksLikeRecovery, normalizeRecovery, retryAfterSeconds, spokenWait } from './authModel';

const CHALLENGE_MS = 5 * 60 * 1000;
const BAD_LOGIN = 'Usuario o contraseña incorrectos.';

/** Mensaje de bloqueo con cuenta atrás: el número visible cambia cada segundo; el lector de pantalla oye un texto estable. */
function LockNotice({ remaining }: { remaining: number }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-md border border-transparent bg-warn-soft px-3 py-2.5 text-[13.5px] text-ink">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
      <p className="m-0">
        <strong className="font-semibold">Demasiados intentos.</strong> Por seguridad, el acceso está en pausa.{' '}
        <span className="sr-only">Podrá intentarlo de nuevo en {spokenWait(remaining)}.</span>
        <span aria-hidden="true">Intente de nuevo en <b className="font-mono font-semibold tabular-nums">{formatCountdown(remaining)}</b>.</span>
      </p>
    </div>
  );
}

export default function LoginPage({ onLogin, notice }: { onLogin: (u: User) => void | Promise<void>; notice?: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<{ token: string; at: number } | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [rcode, setRcode] = useState('');
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const passRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Cuenta atrás del bloqueo: un temporizador por segundo solo mientras dura.
  const remaining = lockUntil ? lockRemaining(lockUntil, now) : 0;
  useEffect(() => {
    if (!lockUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockUntil]);
  useEffect(() => { if (lockUntil && remaining === 0) { setLockUntil(null); setError(''); } }, [lockUntil, remaining]);
  const locked = remaining > 0;

  const lock = (data: unknown) => { const t = Date.now(); setNow(t); setLockUntil(t + retryAfterSeconds(data) * 1000); setError(''); };
  const backToCredentials = (msg = '') => { setChallenge(null); setRecovery(false); setCode(''); setRcode(''); setError(msg); setTimeout(() => passRef.current?.focus(), 0); };

  const submitCredentials = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || locked) return;
    setBusy(true); setError('');
    try {
      const r = await authApi.login(username.trim(), password);
      if (isChallenge(r)) { setChallenge({ token: r.challenge, at: Date.now() }); setPassword(''); setShow(false); return; }
      setPassword('');
      await onLogin(r.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) lock(err.data);
      else if (err instanceof ApiError && err.status === 401) { setError(BAD_LOGIN); setPassword(''); setTimeout(() => passRef.current?.focus(), 0); }
      else setError(errText(err));
    } finally { if (alive.current) setBusy(false); }
  };

  const submitCode = async (value: string) => {
    if (busy || locked || !challenge) return;
    setBusy(true); setError('');
    try {
      const r = await authApi.login2fa(challenge.token, value);
      await onLogin(r.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) lock(err.data);
      else if (err instanceof ApiError && err.status === 401) {
        const expired = Date.now() - challenge.at > CHALLENGE_MS || /caduc|expir|de nuevo/i.test(err.message);
        if (expired) backToCredentials('La verificación caducó. Vuelva a introducir su usuario y contraseña.');
        else { setError(recovery ? 'Ese código de recuperación no es válido o ya se usó.' : 'El código no es correcto o ya venció. Pruebe con el siguiente de la aplicación.'); setCode(''); }
      } else setError(errText(err));
    } finally { if (alive.current) setBusy(false); }
  };

  /* ---------- Paso 2: verificación en dos pasos ---------- */
  if (challenge) {
    return (
      <AuthShell>
        <Card as="div" className="w-full max-w-[420px] p-7 max-sm:p-5">
          <form onSubmit={(e) => { e.preventDefault(); void submitCode(recovery ? normalizeRecovery(rcode) : code); }} noValidate aria-busy={busy}>
            <h1 className="m-0 text-xl font-semibold">Verificación en dos pasos</h1>
            <p className="mb-5 mt-1.5 text-ink-2">
              {recovery ? 'Escriba uno de los códigos de recuperación que guardó al activar la verificación. Cada uno sirve una sola vez.'
                : 'Abra su aplicación de códigos (Google Authenticator, Microsoft Authenticator, Authy…) y escriba el código de 6 dígitos de ISPMAX.'}
            </p>
            <FieldStack className="gap-5">
              {recovery ? (
                <Field label="Código de recuperación" help="Por ejemplo: abcde-12345">
                  {(id, d) => <Input id={id} aria-describedby={d} value={rcode} onChange={(e) => setRcode(e.target.value)} autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} mono aria-invalid={!!error || undefined} />}
                </Field>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink-2">Código de 6 dígitos</span>
                  <OtpInput value={code} onChange={(v) => { setCode(digitsOnly(v)); setError(''); }} onComplete={(v) => void submitCode(v)} disabled={busy || locked} invalid={!!error} autoFocus label="Código de verificación" />
                </div>
              )}
              {locked ? <LockNotice remaining={remaining} /> : error ? <Callout tone="danger">{error}</Callout> : null}
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || locked || (recovery ? !looksLikeRecovery(rcode) : code.length < 6)}>
                {busy ? <><Spinner label="" className="text-current" /> Verificando…</> : 'Verificar y entrar'}
              </Button>
            </FieldStack>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <Button variant="ghost" size="sm" onClick={() => backToCredentials()}><ArrowLeft size={14} /> Volver</Button>
            <Button variant="link" className="text-sm" onClick={() => { setRecovery((r) => !r); setError(''); setCode(''); setRcode(''); }}>
              <LifeBuoy size={14} /> {recovery ? 'Usar el código de la aplicación' : 'Usar un código de recuperación'}
            </Button>
          </div>
        </Card>
      </AuthShell>
    );
  }

  /* ---------- Paso 1: usuario y contraseña ---------- */
  return (
    <AuthShell>
      <Card as="div" className="w-full max-w-[420px] p-7 max-sm:p-5">
        <form onSubmit={submitCredentials} noValidate aria-busy={busy}>
          <h1 className="m-0 text-xl font-semibold">Iniciar sesión</h1>
          <p className="mb-5 mt-1.5 text-ink-2">Entre con su cuenta del portal para editar y publicar el manual.</p>
          <FieldStack className="gap-4">
            <Field label="Usuario">{(id) => <Input id={id} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoFocus required aria-invalid={!!error || undefined} />}</Field>
            <Field label="Contraseña" help={caps ? <span role="status" className="inline-flex items-center gap-1 text-warn"><TriangleAlert size={13} aria-hidden="true" /> Bloq Mayús está activado.</span> : undefined}>{(id, d) => (
              <div className="relative">
                <Input ref={passRef} id={id} aria-describedby={d} type={show ? 'text' : 'password'} className="pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)} onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)} onBlur={() => setCaps(false)}
                  autoComplete="current-password" required aria-invalid={!!error || undefined} />
                <IconButton className="absolute right-[3px] top-[3px]" size="icon-sm" tooltip={false} aria-pressed={show} label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} icon={show ? <EyeOff size={16} /> : <Eye size={16} />} onClick={() => setShow((s) => !s)} />
              </div>
            )}</Field>
            {locked ? <LockNotice remaining={remaining} /> : error || notice ? <Callout tone="danger">{error || notice}</Callout> : null}
            <Button type="submit" variant="primary" size="lg" className="mt-1 w-full" disabled={busy || locked || !username || !password}>
              {busy ? <><Spinner label="" className="text-current" /> Entrando…</> : 'Entrar'}
            </Button>
          </FieldStack>
        </form>
        <p className="m-0 mt-5 border-t border-line pt-4 text-sm text-ink-3">¿Olvidó su contraseña? Pida a quien administre el portal que la restablezca.</p>
      </Card>
    </AuthShell>
  );
}
