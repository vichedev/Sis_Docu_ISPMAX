import { useEffect, useState } from 'react';
import { Ellipsis, Pencil, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import { Avatar, Badge, Button, ConfirmDialog, Dialog, DropdownMenu, ErrorState, Field, FieldRow, FieldStack, IconButton, Input, Label, SkeletonRows, TBody, TD, TH, THead, Table, Tag, useToast } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { api, type Role, type UserRow } from '@/lib/api';
import { authApi } from '@/lib/api.auth';
import { errText, useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { ROLE_LABEL, fmtDate, relTime } from '@/lib/util';
import { cn } from '@/lib/cn';

const ROLES: { value: Role; text: string }[] = [
  { value: 'admin', text: 'Todo: publica, gestiona respaldos, usuarios y ajustes.' },
  { value: 'editor', text: 'Crea y edita páginas, imágenes y estructura. No publica.' },
  { value: 'viewer', text: 'Solo consulta el contenido del portal.' },
];

function UserDialog({ user, open, onOpenChange, onDone }: { user: UserRow | null; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setUsername(user?.username ?? ''); setName(user?.display_name ?? ''); setRole(user?.role ?? 'editor'); setPassword(''); setBusy(false); } }, [open, user]);
  const submit = async () => {
    setBusy(true);
    try {
      const b: Record<string, unknown> = { display_name: name, role };
      if (password) b.password = password;
      if (user) await api.updateUser(user.id, b); else await api.createUser({ ...b, username });
      toast(user ? 'Usuario actualizado' : 'Usuario creado'); onOpenChange(false); onDone();
    } catch (e) { toast(errText(e), 'error'); setBusy(false); }
  };
  const pwBad = (!user && password.length < 10) || (!!password && password.length < 10);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={user ? `Editar a ${user.display_name || user.username}` : 'Crear usuario'}
      footer={<><Button onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" disabled={busy || !username || pwBad} onClick={submit}>{user ? 'Guardar cambios' : 'Crear usuario'}</Button></>}>
      <FieldStack>
        <FieldRow>
          <Field label="Usuario">{(id) => <Input id={id} value={username} disabled={!!user} onChange={(e) => setUsername(e.target.value.trim())} autoFocus={!user} autoComplete="off" />}</Field>
          <Field label="Nombre para mostrar">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        </FieldRow>
        <div role="radiogroup" aria-labelledby="rol-l" className="flex flex-col gap-1.5">
          <Label id="rol-l">Rol</Label>
          <div className="overflow-hidden rounded-lg border border-line">
            {ROLES.map((r) => (
              <label key={r.value} className={cn('flex cursor-pointer items-start gap-3 border-t border-line px-3 py-2.5 first:border-t-0 hover:bg-subtle', role === r.value && 'bg-accent-soft hover:bg-accent-soft')}>
                <input type="radio" name="role" className="mt-0.5 size-4 accent-[var(--accent)]" checked={role === r.value} onChange={() => setRole(r.value)} />
                <span className="flex flex-col"><strong className="font-medium">{ROLE_LABEL[r.value]}</strong><small className="text-[12.5px] text-ink-3">{r.text}</small></span>
              </label>
            ))}
          </div>
        </div>
        <Field label={user ? 'Contraseña nueva' : 'Contraseña inicial'} optional={!!user} help={`${user ? 'Déjela vacía para no cambiarla. ' : ''}Mínimo 10 caracteres; no puede ser una contraseña común ni contener el usuario.`} error={password && password.length < 10 ? 'Mínimo 10 caracteres.' : undefined}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />}
        </Field>
      </FieldStack>
    </Dialog>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.users(), []);
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<UserRow | null>(null);
  const [reset2fa, setReset2fa] = useState<UserRow | null>(null);
  return (
    <Page title="Usuarios" description="Quién puede entrar al portal y qué puede hacer." actions={<Button variant="primary" onClick={() => { setEdit(null); setOpen(true); }}><UserPlus size={16} /> Crear usuario</Button>}>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={3} cols={4} /> : (
        <Table>
          <THead><tr><TH>Persona</TH><TH>Rol</TH><TH hide="sm">Último acceso</TH><TH narrow><span className="sr-only">Acciones</span></TH></tr></THead>
          <TBody>{(data ?? []).map((u) => (
            <tr key={u.id}>
              <TD><span className="flex items-center gap-2.5"><Avatar size="sm" name={u.display_name || u.username} />
                <span className="flex min-w-0 flex-col"><span><strong className="font-medium">{u.display_name || u.username}</strong>{u.id === me.id && <Tag className="ml-1.5">Usted</Tag>}</span><span className="font-mono text-xs text-ink-3">{u.username}</span></span></span></TD>
              <TD><span className="flex flex-wrap items-center gap-1.5"><Badge tone={u.role === 'admin' ? 'accent' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge>{u.twoFactor && <Badge tone="ok" title="Tiene verificación en dos pasos">2FA</Badge>}</span></TD>
              <TD hide="sm" className="whitespace-nowrap">{u.last_login ? <span title={fmtDate(u.last_login)}>{relTime(u.last_login)}</span> : <span className="text-ink-3">Nunca</span>}</TD>
              <TD narrow>
                <DropdownMenu label={`Acciones de ${u.username}`} trigger={<IconButton size="icon-sm" tooltip={false} label={`Acciones de ${u.username}`} icon={<Ellipsis size={16} />} />} items={[
                  { label: 'Editar', icon: <Pencil size={16} />, onSelect: () => { setEdit(u); setOpen(true); } },
                  ...(u.id !== me.id && u.twoFactor !== false ? [{ label: 'Restablecer 2FA…', icon: <ShieldOff size={16} />, onSelect: () => setReset2fa(u) }] : []),
                  { separator: true },
                  { label: u.id === me.id ? 'No puede eliminarse a sí mismo' : 'Eliminar…', icon: <Trash2 size={16} />, danger: u.id !== me.id, disabled: u.id === me.id, onSelect: () => setDel(u) },
                ]} />
              </TD>
            </tr>
          ))}</TBody>
        </Table>
      )}
      <ConfirmDialog open={!!reset2fa} onOpenChange={(o) => !o && setReset2fa(null)} danger title="Restablecer la verificación en dos pasos" confirmLabel="Restablecer 2FA"
        onConfirm={async () => { if (!reset2fa) return; try { await authApi.resetUserTwoFactor(reset2fa.id); toast('Verificación en dos pasos restablecida'); reload(); } catch (e) { toast(errText(e), 'error'); } setReset2fa(null); }}>
        <b>{reset2fa?.display_name || reset2fa?.username}</b> volverá a entrar solo con su contraseña y podrá configurar 2FA de nuevo. Hágalo solo si perdió el teléfono y los códigos de recuperación, y tras confirmar su identidad.
      </ConfirmDialog>
      <UserDialog user={edit} open={open} onOpenChange={setOpen} onDone={reload} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} danger title="Eliminar usuario" confirmLabel="Eliminar"
        onConfirm={async () => { if (!del) return; try { await api.deleteUser(del.id); toast('Usuario eliminado'); reload(); } catch (e) { toast(errText(e), 'error'); } setDel(null); }}>
        <b>{del?.display_name || del?.username}</b> dejará de poder entrar al portal. Lo que hizo queda en la auditoría.
      </ConfirmDialog>
    </Page>
  );
}
