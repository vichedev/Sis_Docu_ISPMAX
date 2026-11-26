/*
 * Mi cuenta (`#/cuenta`): datos y último acceso, cambio de contraseña, verificación en dos pasos y sesiones activas.
 */
import { useState, type FormEvent } from 'react';
import { Laptop, LogOut, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { Badge, Button, Callout, ConfirmDialog, DescriptionList, Dialog, ErrorState, Field, FieldStack, Input, Panel, SkeletonRows, useToast } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { ApiError } from '@/lib/api';
import { authApi, type AuthSession } from '@/lib/api.auth';
import { errText, useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { ROLE_LABEL, fmtDate, relTime } from '@/lib/util';
import { PasswordForm } from './PasswordForm';
import { TwoFactorEnroll } from './TwoFactorEnroll';
import { parseUserAgent } from './authModel';

/* ---------- Verificación en dos pasos ---------- */
function DisableDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = (o: boolean) => { if (!o) { setPassword(''); setCode(''); setError(''); } onOpenChange(o); };
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || !password || !code.trim()) return;
    setBusy(true); setError('');
    try { await authApi.twoFactorDisable(password, code.trim()); toast('Verificación en dos pasos desactivada'); close(false); onDone(); }
    catch (err) { setError(err instanceof ApiError && (err.status === 400 || err.status === 401) ? 'La contraseña o el código no son correctos.' : errText(err)); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={close} size="sm" title="Desactivar la verificación en dos pasos"
      description="Su cuenta quedará protegida solo por la contraseña."
      footer={<><Button onClick={() => close(false)}>Cancelar</Button><Button variant="danger" disabled={busy || !password || !code.trim()} onClick={() => void submit()}>{busy ? 'Desactivando…' : 'Desactivar'}</Button></>}>
      <form onSubmit={submit} noValidate>
        <FieldStack>
          <Field label="Contraseña">{(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />}</Field>
          <Field label="Código de verificación" help="El de 6 dígitos de su aplicación o un código de recuperación.">
            {(id, d) => <Input id={id} aria-describedby={d} value={code} onChange={(e) => setCode(e.target.value)} inputMode="text" autoComplete="one-time-code" autoCapitalize="off" spellCheck={false} mono />}
          </Field>
          {error && <Callout tone="danger">{error}</Callout>}
        </FieldStack>
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Dialog>
  );
}

function TwoFactorPanel() {
  const { user, refresh } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const toast = useToast();
  const on = user.twoFactor === true;
  return (
    <Panel title="Verificación en dos pasos" description="Un segundo candado: además de la contraseña, un código que genera una aplicación en su teléfono."
      actions={on ? <Badge tone="ok" dot>Activada</Badge> : <Badge tone="neutral">Desactivada</Badge>}>
      {enrolling ? (
        <TwoFactorEnroll username={user.username} onCancel={() => setEnrolling(false)} onDone={() => { setEnrolling(false); toast('Verificación en dos pasos activada'); void refresh(); }} />
      ) : on ? (
        <div className="flex flex-wrap items-center gap-3">
          <ShieldCheck size={18} className="text-ok" aria-hidden="true" />
          <p className="m-0 min-w-0 flex-1 text-ink-2">Para entrar, el portal le pedirá el código de su aplicación. Si pierde el teléfono, use un código de recuperación.</p>
          <Button variant="danger-ghost" onClick={() => setDisabling(true)}><ShieldOff size={14} /> Desactivar…</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 min-w-0 flex-1 basis-72 text-ink-2">Recomendado, sobre todo para administradores: aunque alguien conozca su contraseña, no podrá entrar sin su teléfono.</p>
          <Button variant="primary" onClick={() => setEnrolling(true)}><ShieldCheck size={14} /> Activar verificación</Button>
        </div>
      )}
      <DisableDialog open={disabling} onOpenChange={setDisabling} onDone={() => void refresh()} />
    </Panel>
  );
}

/* ---------- Sesiones ---------- */
function SessionRow({ s, onRevoke, busy }: { s: AuthSession; onRevoke: () => void; busy: boolean }) {
  const ua = parseUserAgent(s.userAgent);
  const mobile = /móvil|iOS|Android/.test(ua.device);
  const Icon = mobile ? Smartphone : Laptop;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-line bg-subtle text-ink-3"><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="m-0 flex flex-wrap items-center gap-2 font-medium">{ua.device}{s.current && <Badge tone="accent">Esta sesión</Badge>}</p>
        <p className="m-0 text-sm text-ink-3">
          {s.ip ? <>IP <span className="font-mono text-[12.5px]">{s.ip}</span> · </> : null}
          iniciada <span title={fmtDate(s.createdAt)}>{relTime(s.createdAt)}</span>
          {s.lastSeenAt && <> · último uso <span title={fmtDate(s.lastSeenAt)}>{relTime(s.lastSeenAt)}</span></>}
        </p>
      </div>
      {!s.current && <Button size="sm" variant="ghost" disabled={busy} onClick={onRevoke}><LogOut size={14} /> Cerrar</Button>}
    </li>
  );
}

function SessionsPanel() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => authApi.sessions(), []);
  const [busy, setBusy] = useState<string | number | 'all' | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const others = (data ?? []).filter((s) => !s.current);
  const revoke = async (s: AuthSession) => {
    setBusy(s.id);
    try { await authApi.revokeSession(s.id); toast('Sesión cerrada'); reload(); } catch (e) { toast(errText(e), 'error'); } finally { setBusy(null); }
  };
  const revokeAll = async () => {
    setBusy('all');
    try { const r = await authApi.revokeOthers(); toast(r?.revoked ? `Se cerraron ${r.revoked} ${r.revoked === 1 ? 'sesión' : 'sesiones'}` : 'No había otras sesiones'); reload(); }
    catch (e) { toast(errText(e), 'error'); } finally { setBusy(null); setConfirmAll(false); }
  };
  return (
    <Panel title="Sesiones activas" description="Los dispositivos donde su cuenta tiene la sesión abierta. Cierre las que no reconozca." flush
      actions={others.length > 0 && <Button size="sm" onClick={() => setConfirmAll(true)}>Cerrar todas las demás</Button>}>
      {error ? <div className="p-4"><ErrorState error={error} onRetry={reload} /></div> : loading && !data ? <div className="p-4"><SkeletonRows rows={2} cols={2} /></div> : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {(data ?? []).map((s) => <SessionRow key={s.id} s={s} busy={busy === s.id || busy === 'all'} onRevoke={() => void revoke(s)} />)}
          {!data?.length && <li className="px-4 py-6 text-center text-ink-3">No hay información de sesiones.</li>}
        </ul>
      )}
      <ConfirmDialog open={confirmAll} onOpenChange={setConfirmAll} danger title="Cerrar las demás sesiones" confirmLabel="Cerrar sesiones" onConfirm={revokeAll}>
        Se cerrará la sesión en {others.length === 1 ? 'el otro dispositivo' : `los otros ${others.length} dispositivos`}. Esta sesión sigue abierta.
      </ConfirmDialog>
    </Panel>
  );
}

/* ---------- Pantalla ---------- */
export default function AccountPage() {
  const { user, lastLogin, refresh } = useAuth();
  const items: [string, React.ReactNode][] = [
    ['Nombre', user.display_name || user.username],
    ['Usuario', <span className="font-mono text-[12.5px]">{user.username}</span>],
    ['Rol', ROLE_LABEL[user.role]],
    ['Acceso anterior', lastLogin?.at ? <span><span title={fmtDate(lastLogin.at)}>{fmtDate(lastLogin.at)}</span>{lastLogin.ip ? <> desde <span className="font-mono text-[12.5px]">{lastLogin.ip}</span></> : null}</span> : 'Este es su primer acceso registrado'],
  ];
  return (
    <Page title="Mi cuenta" width="narrow" description="Su contraseña, su verificación en dos pasos y los dispositivos con sesión abierta.">
      <div className="flex flex-col gap-5">
        <Panel title="Su cuenta"><DescriptionList items={items} /></Panel>
        <Panel title="Contraseña" description="Cámbiela si sospecha que otra persona la conoce. Al cambiarla se cierran sus otras sesiones.">
          <PasswordForm username={user.username} onDone={() => void refresh()} />
        </Panel>
        <TwoFactorPanel />
        <SessionsPanel />
      </div>
    </Page>
  );
}
