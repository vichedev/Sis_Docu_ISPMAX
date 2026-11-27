/*
 * Ajustes › Asistente de IA (solo administradores). La clave se envía al guardar y el servidor la guarda CIFRADA:
 * el campo nunca se rellena con ella ni la API la devuelve (solo «configurada», su origen y el modelo).
 * Prioridad: la clave de Ajustes manda; si no hay, el servidor usa GROQ_API_KEY de su entorno.
 */
import { useEffect, useState } from 'react';
import { CircleCheck, KeyRound, Save, Trash2, Zap } from 'lucide-react';
import { Badge, Button, Callout, ConfirmDialog, ErrorState, Field, FieldStack, Input, Panel, SkeletonRows, Switch, useToast } from '@/components/ui';
import { aiApi, type AiTestResult } from '@/lib/api.ai';
import { errText } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { AI_CONFIG_EVENT } from '@/features/ai/useAiStatus';
import { useAiUsage } from '@/features/ai/useAiUsage';
import { UsageDetail } from '@/features/ai/AiUsageMeter';

const DEFAULT_MODEL = 'openai/gpt-oss-120b';

export function AiSection() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => aiApi.config(), []);
  const [key, setKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState<'save' | 'test' | 'clear' | null>(null);
  const [fail, setFail] = useState('');
  const [test, setTest] = useState<AiTestResult | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const usage = useAiUsage(true);
  useEffect(() => { if (data) { setModel(data.model); setActive(data.active); } }, [data]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <Panel title="Asistente de IA"><SkeletonRows rows={3} cols={2} /></Panel>;
  if (!data) return null;

  const modelOk = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(model.trim());
  const keyTyped = key.trim().length > 0;
  const keyOk = !keyTyped || /^[\x21-\x7e]{8,300}$/.test(key.trim());
  const dirty = keyTyped || model.trim() !== data.model || active !== data.active;
  const changed = () => window.dispatchEvent(new Event(AI_CONFIG_EVENT));

  const save = async () => {
    setBusy('save'); setFail(''); setTest(null);
    try {
      await aiApi.saveConfig({ ...(keyTyped ? { apiKey: key.trim() } : {}), model: model.trim(), enabled: active });
      setKey(''); reload(); changed();
      toast(keyTyped ? 'Clave guardada (cifrada) y ajustes de IA actualizados' : 'Ajustes de IA guardados');
    } catch (e) { setFail(errText(e)); } finally { setBusy(null); }
  };
  const probe = async () => {
    setBusy('test'); setFail(''); setTest(null);
    try { setTest(await aiApi.test({ ...(keyTyped ? { apiKey: key.trim() } : {}), model: model.trim() })); }
    catch (e) { setFail(errText(e)); } finally { setBusy(null); }
  };
  const clear = async () => {
    setConfirmClear(false); setBusy('clear'); setFail(''); setTest(null);
    try { await aiApi.saveConfig({ clearKey: true }); setKey(''); reload(); changed(); toast('Clave quitada de Ajustes'); }
    catch (e) { setFail(errText(e)); } finally { setBusy(null); }
  };

  const origin = data.source === 'ajustes' ? <Badge tone="ok" dot>Clave guardada en Ajustes</Badge>
    : data.source === 'entorno' ? <Badge tone="accent" dot>Clave del servidor (archivo .env)</Badge>
    : <Badge tone="warn" dot>Sin clave</Badge>;

  return (
    <Panel title="Asistente de IA" description="Ayuda a redactar en el editor y a crear páginas en borrador. La IA propone; una persona siempre aprueba antes de guardar.">
      <FieldStack className="gap-5">
        <Switch checked={active} onCheckedChange={setActive} label={<span className="font-medium text-ink-2">Activar el asistente de IA</span>}
          description="Si lo desactivas, el botón «Asistente IA» del editor queda deshabilitado para todos." />

        <Field label={<span className="inline-flex flex-wrap items-center gap-2">Clave de Groq {origin}</span>}
          error={keyTyped && !keyOk ? 'La clave no tiene un formato válido (sin espacios, de 8 a 300 caracteres).' : null}
          help={<>{data.configured ? 'Para cambiarla, pega la nueva. El campo nunca muestra la clave guardada.' : 'Pega la clave de tu cuenta de Groq.'} Se guarda cifrada en la base de datos; si la quitas, se usa la del servidor si existe.</>}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={keyTyped && !keyOk ? true : undefined} type="password" autoComplete="new-password" spellCheck={false} mono
            value={key} placeholder={data.configured ? '••••••••  (guardada)' : 'gsk_…'} onChange={(e) => setKey(e.target.value)} />}
        </Field>
        {data.unreadable && <Callout tone="warn"><strong>La clave guardada no se puede leer.</strong> Cambió la clave de cifrado del servidor: pega la clave otra vez.</Callout>}

        <Field label="Modelo" error={modelOk ? null : 'El nombre del modelo no es válido.'} help="Elige uno de la lista o escribe otro nombre de modelo de Groq.">
          {(id, d) => <><Input id={id} aria-describedby={d} aria-invalid={modelOk ? undefined : true} list="ai-modelos" mono autoComplete="off" value={model} onChange={(e) => setModel(e.target.value)} />
            <datalist id="ai-modelos">{data.suggestedModels.map((m) => <option key={m} value={m} />)}</datalist></>}
        </Field>

        <div className="rounded-lg border border-line bg-subtle p-3"><h3 className="mb-2 mt-0 text-[13.5px] font-semibold">Consumo de la IA</h3>
          <UsageDetail usage={usage.usage} fetchedAt={usage.fetchedAt} now={usage.now} busy={usage.busy} error={usage.error} onRefresh={() => void usage.refresh()} /></div>

        {fail && <Callout tone="danger"><strong>No se pudo.</strong> {fail}</Callout>}
        {test && (test.ok
          ? <Callout tone="ok" icon={<CircleCheck size={16} className="mt-0.5" />}><strong>Conexión correcta.</strong> El modelo {test.model} respondió en {((test.ms ?? 0) / 1000).toFixed(1)} s.</Callout>
          : <Callout tone="danger"><strong>La conexión falló.</strong> {test.error}</Callout>)}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" disabled={!dirty || !keyOk || !modelOk || !!busy} onClick={() => void save()}><Save size={14} /> {busy === 'save' ? 'Guardando…' : 'Guardar'}</Button>
          <Button size="sm" disabled={!!busy || !modelOk || !keyOk || (!keyTyped && !data.configured)} onClick={() => void probe()}><Zap size={14} /> {busy === 'test' ? 'Probando…' : 'Probar conexión'}</Button>
          <span className="flex-1" />
          {data.source === 'ajustes' && <Button size="sm" variant="danger-ghost" disabled={!!busy} onClick={() => setConfirmClear(true)}><Trash2 size={14} /> Quitar clave</Button>}
        </div>
        <p className="m-0 flex items-start gap-1.5 text-sm text-ink-3"><KeyRound size={14} className="mt-0.5 shrink-0" /> Plan gratuito de Groq: ~8.000 tokens por minuto; si lo alcanzas, espera unos segundos. El texto que envías al asistente (el bloque o tus notas) sale a Groq para generar la propuesta. Nunca se envían contraseñas ni datos de acceso: no los pegues en las notas. Límite: {data.rate} peticiones por persona cada 10 minutos.</p>
      </FieldStack>
      <ConfirmDialog open={confirmClear} onOpenChange={setConfirmClear} danger confirmLabel="Quitar clave" title="Quitar la clave de IA" onConfirm={clear}>
        Se borra la clave guardada en Ajustes. {data.configured && data.source === 'ajustes' ? 'Si el servidor tiene su propia clave (archivo .env) se usará esa; si no, el asistente quedará deshabilitado.' : ''}
      </ConfirmDialog>
    </Panel>
  );
}
