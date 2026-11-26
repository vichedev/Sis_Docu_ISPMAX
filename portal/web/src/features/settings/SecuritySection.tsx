/* Ajustes › Seguridad: exigir verificación en dos pasos a los administradores (`require_2fa_for_admins`). */
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Callout, ErrorState, Panel, SkeletonRows, Switch, useToast } from '@/components/ui';
import { api, type SettingDef } from '@/lib/api';
import { errText } from '@/lib/auth';

export function SecuritySection({ def, value, loading, error, onRetry, onSaved }: { def?: SettingDef; value: unknown; loading: boolean; error: unknown; onRetry: () => void; onSaved: () => void }) {
  const toast = useToast();
  const saved = value === true || value === 'true';
  const [on, setOn] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  useEffect(() => setOn(saved), [saved]);
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading) return <Panel title="Verificación en dos pasos"><SkeletonRows rows={2} cols={2} /></Panel>;
  if (!def) return <Panel title="Verificación en dos pasos"><p className="m-0 text-sm text-ink-3">Este servidor no ofrece este ajuste.</p></Panel>;
  const save = async () => {
    setBusy(true); setFail('');
    try { await api.saveSettings({ require_2fa_for_admins: on }); toast(on ? 'Ahora los administradores deberán usar 2FA' : 'Ya no se exige 2FA a los administradores'); onSaved(); }
    catch (e) { setFail(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Panel title="Verificación en dos pasos" description="Un código de una aplicación del teléfono, además de la contraseña.">
      <div className="flex flex-col gap-4">
        <Switch checked={on} onCheckedChange={setOn} label={<span className="font-medium text-ink-2">Exigir verificación en dos pasos a los administradores</span>}
          description={def.help ?? 'Quien tenga rol de administrador no podrá usar el panel hasta configurarla.'} />
        {on && !saved && <Callout tone="warn"><strong>Cada administrador tendrá que configurar 2FA en su próximo acceso.</strong> Hasta entonces, el panel solo le mostrará esa pantalla. Compruebe antes que cada uno tiene un teléfono con una aplicación de códigos.</Callout>}
        {fail && <Callout tone="danger"><strong>No se guardó.</strong> {fail}</Callout>}
        <div><Button size="sm" variant="primary" disabled={busy || on === saved} onClick={() => void save()}><Save size={14} /> {busy ? 'Guardando…' : 'Guardar'}</Button></div>
      </div>
    </Panel>
  );
}
