/*
 * Activar la verificación en dos pasos, en tres pasos: contraseña → QR y código de prueba → códigos de recuperación
 * (se muestran una sola vez). El QR se genera aquí, en el navegador: el secreto no sale a ningún servicio externo.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Download, TriangleAlert } from 'lucide-react';
import { Button, Callout, Checkbox, CopyButton, Field, Input, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/api.auth';
import { errText } from '@/lib/auth';
import { OtpInput } from './OtpInput';
import { digitsOnly, groupSecret, recoveryCodesText } from './authModel';

type Step = 'password' | 'scan' | 'codes';

function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    import('qrcode').then((m) => m.toDataURL(url, { margin: 2, width: 208, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }))
      .then((d) => { if (alive) setSrc(d); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [url]);
  if (failed) return <div className="grid size-[208px] place-items-center rounded-md border border-line p-4 text-center text-sm text-ink-3">No se pudo dibujar el QR. Use el código de texto.</div>;
  // Siempre negro sobre blanco (también en modo oscuro): así lo leen todas las aplicaciones.
  return src ? <img src={src} alt="Código QR para la aplicación de verificación" width={208} height={208} className="rounded-md border border-line-strong bg-white" />
    : <div className="grid size-[208px] place-items-center rounded-md border border-line bg-subtle"><Spinner label="Generando QR…" /></div>;
}

export function TwoFactorEnroll({ username, onDone, onCancel }: { username: string; onDone: () => void; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Los códigos no se pueden volver a ver: avisar si se intenta salir antes de guardarlos.
  useEffect(() => {
    if (step !== 'codes' || saved) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [step, saved]);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true); setError('');
    try { setSecret(await authApi.twoFactorSetup(password)); setPassword(''); setStep('scan'); }
    catch (err) { setError(err instanceof ApiError && (err.status === 401 || err.status === 400) ? 'La contraseña no es correcta.' : errText(err)); }
    finally { setBusy(false); }
  };
  const verify = async (value: string) => {
    if (busy || value.length < 6) return;
    setBusy(true); setError('');
    try { const r = await authApi.twoFactorEnable(value); setCodes(r.recoveryCodes ?? []); setStep('codes'); }
    catch (err) { setError(err instanceof ApiError && (err.status === 400 || err.status === 401) ? 'El código no es correcto. Escriba el que muestra ahora la aplicación.' : errText(err)); setCode(''); }
    finally { setBusy(false); }
  };
  const download = () => {
    const blob = new Blob([recoveryCodesText(codes, username)], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `ispmax-codigos-recuperacion-${username}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const n = step === 'password' ? 1 : step === 'scan' ? 2 : 3;
  return (
    <div className="max-w-[560px]">
      <p className="m-0 mb-3 text-sm font-medium text-ink-3" aria-live="polite">Paso {n} de 3</p>

      {step === 'password' && (
        <form onSubmit={start} noValidate aria-busy={busy} className="flex flex-col gap-4">
          <p className="m-0 text-ink-2">Con la verificación en dos pasos, además de la contraseña hará falta un código de 6 dígitos que genera una aplicación en su teléfono. Por seguridad, confirme su contraseña para empezar.</p>
          <Field label="Su contraseña actual">{(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus aria-invalid={!!error || undefined} className="max-w-[320px]" />}</Field>
          {error && <Callout tone="danger">{error}</Callout>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={!password || busy}>{busy ? 'Comprobando…' : 'Continuar'}</Button>
            {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
          </div>
        </form>
      )}

      {step === 'scan' && secret && (
        <div className="flex flex-col gap-5">
          <ol className="m-0 flex list-none flex-col gap-1 p-0 text-ink-2">
            <li><b className="font-medium text-ink">1.</b> Instale una aplicación de códigos si no tiene una (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).</li>
            <li><b className="font-medium text-ink">2.</b> Escanee este código QR con la aplicación, o escriba el código de texto a mano.</li>
            <li><b className="font-medium text-ink">3.</b> Escriba abajo el código de 6 dígitos que muestre la aplicación.</li>
          </ol>
          <div className="flex flex-wrap items-start gap-6">
            <Qr url={secret.otpauthUrl} />
            <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-2">¿No puede escanear? Código de texto</span>
              <div className="flex items-start gap-1.5 rounded-md border border-line bg-subtle py-2 pl-3 pr-1.5">
                <code className="flex-1 break-normal font-mono text-[13px] leading-relaxed tracking-wide text-ink" aria-label="Código secreto">{groupSecret(secret.secret)}</code>
                <CopyButton text={secret.secret} label="Copiar código de texto" done="Código copiado" />
              </div>
              <p className="m-0 text-[12.5px] text-ink-3">Es un secreto: no lo comparta ni lo publique.</p>
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void verify(code); }} noValidate aria-busy={busy} className="flex flex-col gap-3">
            <div className="flex max-w-[340px] flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-2">Código de 6 dígitos</span>
              <OtpInput value={code} onChange={(v) => { setCode(digitsOnly(v)); setError(''); }} onComplete={(v) => void verify(v)} disabled={busy} invalid={!!error} autoFocus label="Código de prueba" />
            </div>
            {error && <Callout tone="danger">{error}</Callout>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={code.length < 6 || busy}>{busy ? 'Verificando…' : 'Verificar y activar'}</Button>
              {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
            </div>
          </form>
        </div>
      )}

      {step === 'codes' && (
        <div className="flex flex-col gap-4">
          <Callout tone="ok"><strong>Verificación en dos pasos activada.</strong> Falta un último paso.</Callout>
          <div>
            <h3 className="m-0 text-[15px] font-semibold">Guarde sus códigos de recuperación</h3>
            <p className="mb-0 mt-1 text-ink-2">Si pierde el teléfono, cada uno de estos códigos le permite entrar <b className="font-medium">una vez</b>. Se muestran <b className="font-medium">solo ahora</b>: no se podrán volver a ver.</p>
          </div>
          <ul aria-label="Códigos de recuperación" className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-1.5 rounded-md border border-line-strong bg-subtle p-4 font-mono text-[14px] max-sm:grid-cols-1">
            {codes.map((c, i) => <li key={c} className="flex gap-2"><span aria-hidden="true" className="w-5 text-right text-ink-3">{i + 1}.</span><span className="select-all text-ink">{c}</span></li>)}
          </ul>
          <div className="flex flex-wrap gap-2">
            <CopyButton withText text={codes.join('\n')} label="Copiar todos" done="Códigos copiados" />
            <Button onClick={download}><Download size={14} /> Descargar .txt</Button>
          </div>
          <Callout tone="warn" icon={<TriangleAlert size={16} className="mt-0.5" />}>Guárdelos en un gestor de contraseñas o impresos, lejos del teléfono. Quien tenga uno de estos códigos y su contraseña puede entrar.</Callout>
          <Checkbox checked={saved} onCheckedChange={setSaved} label="Ya guardé mis códigos de recuperación en un lugar seguro" />
          <div><Button variant="primary" disabled={!saved} onClick={onDone}>Terminar</Button></div>
        </div>
      )}
    </div>
  );
}
