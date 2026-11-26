/*
 * Ajustes (solo administradores), con navegación interna por secciones (`#/ajustes/:seccion`):
 *   General · Actualización del manual · Actualización del sistema · Respaldos · Información del sistema.
 * Cada sección editable guarda con su propio botón; los cambios sin guardar se conservan al pasar de una sección a otra
 * (punto ámbar en el menú) y se avisa al salir de Ajustes. Aquí no hay rutas, carpetas, comandos ni datos de Git:
 * eso lo gestiona el sistema (y «Actualizar el sistema»).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CloudDownload, DatabaseBackup, Info, MessageCircle, RefreshCw, Save, ShieldCheck, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { Badge, Button, Callout, ErrorState, Field, FieldStack, Input, Panel, Select, SkeletonRows, Switch, useToast } from '@/components/ui';
import { Page, useBreadcrumbs } from '@/components/layout/Page';
import { api, type SettingDef } from '@/lib/api';
import { siteApi } from '@/lib/api.site';
import { errText } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { useAsync, useUnsavedChanges } from '@/lib/hooks';
import { go, statsChanged } from '@/lib/util';
import { settingsPath, type SettingsSection } from '@/routes';
import { useSite } from '@/features/system/site';
import { SystemUpdate } from '@/features/system/SystemUpdate';
import { SystemInfo } from '@/features/system/SystemInfo';
import { SecuritySection } from './SecuritySection';
import { dirtyKeys, groupSettings, numberProblem, shownTitle, whatsappDigits, whatsappProblem, type EditableSection } from './settingsModel';

interface SectionMeta { id: SettingsSection; label: string; icon: LucideIcon; description: string }
const SECTIONS: SectionMeta[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal, description: 'Cómo se presenta el manual publicado a quien lo lee. Los cambios se aplican al manual público, que se actualiza solo.' },
  { id: 'manual', label: 'Actualización del manual', icon: RefreshCw, description: 'Cuándo se actualiza el manual publicado después de guardar un cambio en algo ya publicado.' },
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck, description: 'Cómo protege el portal el acceso de las cuentas de administrador.' },
  { id: 'sistema', label: 'Actualización del sistema', icon: CloudDownload, description: 'Versión instalada, novedades y actualización del código del sistema. El contenido del manual no se toca.' },
  { id: 'respaldos', label: 'Respaldos', icon: DatabaseBackup, description: 'Cuántas copias completas de la base de datos se conservan.' },
  { id: 'info', label: 'Información del sistema', icon: Info, description: 'Datos de esta instalación, de solo lectura y sin contraseñas ni credenciales, para pedir ayuda a soporte.' },
];
const isBool = (t: string) => t === 'bool' || t === 'boolean';
const isNum = (t: string) => t === 'number' || t === 'int' || t === 'integer';
const DirtyDot = ({ label = 'con cambios sin guardar' }: { label?: string }) => <span className="size-1.5 shrink-0 rounded-full bg-warn-dot" role="img" aria-label={label} />;

/* ---------- Campo genérico (por si el servidor añade ajustes) ---------- */
function SettingField({ def, value, onChange, changed, error }: { def: SettingDef; value: unknown; onChange: (v: unknown) => void; changed: boolean; error?: string | null }) {
  const label = <>{def.label}{changed && <DirtyDot label="modificado" />}</>;
  if (isBool(def.type)) return <Switch checked={value === true || value === 'true'} onCheckedChange={onChange} label={<span className="inline-flex items-center gap-1.5 font-medium text-ink-2">{label}</span>} description={def.help} />;
  const str = value == null ? '' : String(value);
  if (def.options?.length) {
    return <Field label={label} help={def.help}>{(id) => <Select id={id} aria-label={def.label} value={str || def.options![0]!} onValueChange={onChange} options={def.options!.map((o) => ({ value: o, label: o }))} />}</Field>;
  }
  const range = isNum(def.type) && def.min !== undefined ? ` De ${def.min} a ${def.max}.` : '';
  return (
    <Field label={label} help={<>{def.help}{range}</>} error={error}>
      {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={error ? true : undefined} type={isNum(def.type) ? 'number' : 'text'} value={str} autoComplete="off" min={def.min} max={def.max}
        className={isNum(def.type) ? 'max-w-36' : undefined} onChange={(e) => onChange(isNum(def.type) && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />}
    </Field>
  );
}

/* ---------- Pie de cada formulario: estado y guardar ---------- */
function FormFooter({ dirty, saving, savedAt, invalid, onSave, onDiscard, label = 'Guardar' }: { dirty: number; saving: boolean; savedAt: number | null; invalid: boolean; onSave: () => void; onDiscard: () => void; label?: string }) {
  return (
    <div className="-mx-4 -mb-4 mt-5 flex flex-wrap items-center gap-2 rounded-b-lg border-t border-line bg-subtle px-4 py-2.5">
      <span className="min-w-0 flex-1 text-sm" role="status" aria-live="polite">
        {dirty ? <Badge tone="warn" dot>{dirty} {dirty === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}</Badge>
          : savedAt ? <span className="text-ok">Guardado</span> : <span className="text-ink-3">Sin cambios</span>}
      </span>
      {dirty > 0 && <Button size="sm" variant="ghost" disabled={saving} onClick={onDiscard}>Descartar</Button>}
      <Button size="sm" variant="primary" disabled={!dirty || saving || invalid} onClick={onSave}><Save size={14} /> {saving ? 'Guardando…' : label}</Button>
    </div>
  );
}

/* ---------- Vista previa de General ---------- */
function BrandPreview({ title, whatsapp }: { title: unknown; whatsapp: unknown }) {
  const t = shownTitle(title);
  const digits = whatsappDigits(whatsapp);
  const wa = digits ? `wa.me/${digits}` : digits === '' ? 'el número original del manual' : 'número no válido';
  return (
    <Panel title="Vista previa" description="Dónde se verá en el manual publicado (esquema).">
      <div aria-hidden="true" className="overflow-hidden rounded-md border border-line text-[13px]">
        <div className="flex items-center gap-2 border-b border-line bg-subtle px-2.5 pt-1.5">
          <span className="max-w-[60%] truncate rounded-t-md border border-b-0 border-line bg-bg px-2.5 py-1 text-xs text-ink-2">{t}</span>
        </div>
        <div className="flex items-center gap-2.5 bg-bg px-3 py-2.5">
          <img src={`${import.meta.env.BASE_URL}isotipo.webp`} alt="" width={32} height={16} className="h-4 w-8 object-contain" />
          <strong className="min-w-0 truncate font-semibold">{t}</strong>
          <span className="flex-1" />
          <span className="flex items-center gap-3 text-xs text-ink-3 max-sm:hidden"><span>Guía</span><span>Preguntas</span><span className="inline-flex items-center gap-1 font-medium text-accent-ink"><MessageCircle size={12} /> Soporte</span></span>
        </div>
        <div className="border-t border-line bg-subtle px-3 py-2 text-xs text-ink-3"><span className="inline-flex items-center gap-1 text-ink-2"><MessageCircle size={12} /> Soporte WhatsApp</span> → {wa}</div>
      </div>
      <ul className="mb-0 mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
        <li><b className="font-medium">Título:</b> pestaña del navegador, cabecera del manual y vista previa al compartir un enlace.</li>
        <li><b className="font-medium">WhatsApp:</b> enlace «Soporte» del menú, icono de WhatsApp y pie de página ({wa}).</li>
      </ul>
    </Panel>
  );
}

export default function SettingsPage({ section }: { section: SettingsSection }) {
  const toast = useToast();
  const { refresh } = useSite();
  const { data, error, loading, reload } = useAsync(() => api.settings(), []);
  const [vals, setVals] = useState<Record<string, unknown>>({});
  const [base, setBase] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<EditableSection | null>(null);
  const [savedAt, setSavedAt] = useState<Partial<Record<EditableSection, number>>>({});
  const [saveError, setSaveError] = useState<Partial<Record<EditableSection, string>>>({});
  useEffect(() => { if (data) { setVals({ ...data.settings }); setBase({ ...data.settings }); } }, [data]);

  const groups = useMemo(() => groupSettings((data?.definitions ?? []) as (SettingDef & { section?: string })[]), [data]);
  const dirtyBy = (s: EditableSection) => dirtyKeys(groups[s].map((d) => d.key), vals, base);
  const dirtyAll = (['general', 'manual', 'respaldos'] as EditableSection[]).filter((s) => dirtyBy(s).length);
  useUnsavedChanges(dirtyAll.length > 0, 'Hay ajustes sin guardar. ¿Salir de Ajustes y descartarlos?', (h) => h.startsWith('#/ajustes'));

  const meta = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;
  useBreadcrumbs([{ label: 'Administración' }, { label: 'Ajustes', href: '#/ajustes/general' }, { label: meta.label }]);

  const setVal = (k: string, v: unknown) => setVals((s) => ({ ...s, [k]: v }));
  const problemOf = (d: SettingDef): string | null => {
    const v = vals[d.key];
    if (d.key === 'contact_whatsapp') return whatsappProblem(v);
    if (isNum(d.type)) return numberProblem(v, d.min ?? 1, d.max ?? 1000);
    return null;
  };
  const save = async (s: EditableSection) => {
    const keys = dirtyBy(s);
    if (!keys.length) return;
    const patch: Record<string, unknown> = {};
    for (const k of keys) patch[k] = k === 'contact_whatsapp' ? whatsappDigits(vals[k]) ?? '' : typeof vals[k] === 'string' ? (vals[k] as string).trim() : vals[k];
    setSaving(s); setSaveError((e) => ({ ...e, [s]: undefined }));
    try {
      const r = await api.saveSettings(patch) as { settings?: Record<string, unknown> } | null;
      const saved = Object.fromEntries(keys.map((k) => [k, r?.settings && k in r.settings ? r.settings[k] : patch[k]]));
      setBase((b) => ({ ...b, ...saved }));
      setVals((v) => ({ ...v, ...saved }));
      setSavedAt((x) => ({ ...x, [s]: Date.now() }));
      statsChanged(); refresh();
      if (s === 'general') {
        // ¿El servidor ya programó la actualización del manual? Si no, se ofrece hacerla ahora.
        const st = await siteApi.status().catch(() => null);
        if (st && (st.state === 'pending' || st.state === 'building')) toast('Guardado · el manual publicado se actualiza en unos segundos');
        else toast('Guardado · se verá en el manual en su próxima actualización', 'ok', { label: 'Actualizar ahora', run: () => { siteApi.rebuild().then(() => { toast('Actualizando el manual…', 'info'); refresh(); }).catch((e: unknown) => toast(errText(e), 'error')); } });
      } else toast('Ajustes guardados');
    } catch (e) {
      const m = errText(e);
      setSaveError((x) => ({ ...x, [s]: m }));
      toast(m, 'error');
    } finally { setSaving(null); }
  };
  const discard = (s: EditableSection) => setVals((v) => ({ ...v, ...Object.fromEntries(groups[s].map((d) => [d.key, base[d.key]])) }));

  /** Formulario de una sección editable (estado de carga/error común). */
  const form = (s: EditableSection, render: (defs: SettingDef[]) => ReactNode, title: string, description?: ReactNode) => {
    if (error) return <ErrorState error={error} onRetry={reload} />;
    if (loading && !data) return <Panel title={title}><SkeletonRows rows={2} cols={2} /></Panel>;
    const defs = groups[s];
    if (!defs.length) return <Panel title={title}><p className="m-0 text-sm text-ink-3">Este servidor no ofrece estos ajustes.</p></Panel>;
    const invalid = defs.some((d) => problemOf(d));
    return (
      <Panel title={title} description={description}>
        <FieldStack className="gap-5">{render(defs)}</FieldStack>
        {saveError[s] && <Callout tone="danger" className="mt-4"><strong>No se guardó.</strong> {saveError[s]}</Callout>}
        <FormFooter dirty={dirtyBy(s).length} saving={saving === s} savedAt={savedAt[s] ?? null} invalid={invalid} onSave={() => void save(s)} onDiscard={() => discard(s)} />
      </Panel>
    );
  };
  const fields = (defs: SettingDef[]) => defs.map((d) => <SettingField key={d.key} def={d} value={vals[d.key]} error={problemOf(d)} changed={dirtyKeys([d.key], vals, base).length > 0} onChange={(v) => setVal(d.key, v)} />);

  const body = (() => {
    switch (section) {
      case 'general': return (
        <div className="flex flex-col gap-5">
          {form('general', (defs) => defs.map((d) => {
            const changed = dirtyKeys([d.key], vals, base).length > 0;
            const lab = <>{d.label}{changed && <DirtyDot label="modificado" />}</>;
            if (d.key === 'site_title') return (
              <Field key={d.key} label={lab} help="Vacío: «Manual ISPMAX». Se ve en la pestaña del navegador y en la cabecera del manual.">
                {(id, h) => <Input id={id} aria-describedby={h} value={String(vals[d.key] ?? '')} maxLength={d.max ?? 120} placeholder="Manual ISPMAX" autoComplete="off" onChange={(e) => setVal(d.key, e.target.value)} />}
              </Field>
            );
            if (d.key === 'contact_whatsapp') {
              const p = problemOf(d);
              return (
                <Field key={d.key} label={lab} error={p} help="Con el código del país, por ejemplo +593 99 123 4567. Se guarda solo con los dígitos. Vacío: se mantiene el número original del manual.">
                  {(id, h) => <Input id={id} aria-describedby={h} aria-invalid={p ? true : undefined} inputMode="tel" autoComplete="off" placeholder="+593 99 123 4567" className="max-w-80"
                    value={String(vals[d.key] ?? '')} onChange={(e) => setVal(d.key, e.target.value)} />}
                </Field>
              );
            }
            return <SettingField key={d.key} def={d} value={vals[d.key]} error={problemOf(d)} changed={changed} onChange={(v) => setVal(d.key, v)} />;
          }), 'Manual publicado', 'El nombre y el contacto de soporte que ven los lectores.')}
          {data && <BrandPreview title={vals.site_title} whatsapp={vals.contact_whatsapp} />}
        </div>
      );
      case 'manual': return (
        <div className="flex flex-col gap-5">
          {form('manual', (defs) => defs.map((d) => {
            const changed = dirtyKeys([d.key], vals, base).length > 0;
            if (d.key === 'auto_publish') return <Switch key={d.key} checked={vals[d.key] !== false && vals[d.key] !== 'false'} onCheckedChange={(v) => setVal(d.key, v)}
              label={<span className="inline-flex items-center gap-1.5 font-medium text-ink-2">Actualizar el manual al guardar{changed && <DirtyDot label="modificado" />}</span>}
              description="Al guardar un cambio en algo ya publicado, el manual se actualiza solo en segundo plano. Si lo desactiva, los cambios esperan hasta pulsar «Actualizar ahora». Los borradores nunca cambian el manual." />;
            if (d.key === 'auto_publish_delay') {
              const p = problemOf(d);
              const off = vals.auto_publish === false;
              return (
                <Field key={d.key} label={<>Espera antes de actualizar (segundos){changed && <DirtyDot label="modificado" />}</>} error={p}
                  help={`De ${d.min ?? 1} a ${d.max ?? 120}. Varios guardados seguidos se juntan en una sola actualización.${off ? ' No se usa mientras la actualización automática esté desactivada.' : ''}`}>
                  {(id, h) => <Input id={id} aria-describedby={h} aria-invalid={p ? true : undefined} type="number" min={d.min ?? 1} max={d.max ?? 120} className="max-w-36"
                    value={vals[d.key] == null ? '' : String(vals[d.key])} onChange={(e) => setVal(d.key, e.target.value === '' ? '' : Number(e.target.value))} />}
                </Field>
              );
            }
            return <SettingField key={d.key} def={d} value={vals[d.key]} error={problemOf(d)} changed={changed} onChange={(v) => setVal(d.key, v)} />;
          }), 'Actualización automática')}
          <p className="m-0 text-sm text-ink-3">El estado, el registro y «Actualizar ahora» están en <a href="#/manual">Manual publicado</a>.</p>
        </div>
      );
      case 'seguridad': return <SecuritySection def={data?.definitions.find((d) => d.key === 'require_2fa_for_admins')} value={data?.settings.require_2fa_for_admins} loading={loading && !data} error={error} onRetry={reload} onSaved={reload} />;
      case 'sistema': return <SystemUpdate />;
      case 'respaldos': return (
        <div className="flex flex-col gap-5">
          {form('respaldos', fields, 'Copias que se conservan', 'Al crear una copia completa nueva, se borran las más antiguas por encima de este número.')}
          <Callout action={<Button size="sm" asChild><a href="#/respaldos"><DatabaseBackup size={14} /> Ir a Respaldos</a></Button>}>
            Los respaldos se crean y se <b>descargan</b> desde la pantalla <b>Respaldos</b>. Se guardan en el volumen de datos del servidor: no hay carpetas que configurar.
          </Callout>
        </div>
      );
      case 'info': return <SystemInfo />;
    }
  })();

  return (
    <Page title="Ajustes" width="narrow" description="Configuración del manual publicado y del sistema. Aquí no se guardan contraseñas.">
      <div className="@container">
        <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-[212px_minmax(0,1fr)] @2xl:gap-10">
          <nav aria-label="Secciones de Ajustes" className="hidden @2xl:block">
            <ul className="sticky top-[76px] m-0 flex list-none flex-col gap-px p-0">
              {SECTIONS.map((s) => {
                const I = s.icon;
                const on = s.id === section;
                const dirty = (s.id === 'general' || s.id === 'manual' || s.id === 'respaldos') && dirtyAll.includes(s.id);
                return (
                  <li key={s.id}>
                    <a href={`#${settingsPath(s.id)}`} aria-current={on ? 'page' : undefined}
                      className={cn('flex min-h-8 items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-[13.5px] leading-snug text-ink-2 no-underline hover:bg-muted hover:text-ink hover:no-underline [&>svg]:shrink-0 [&>svg]:text-ink-3',
                        on && 'border-line bg-subtle font-medium text-ink hover:bg-subtle dark:border-transparent dark:bg-muted [&>svg]:text-accent')}>
                      <I size={16} /><span className="flex-1">{s.label}</span>{dirty && <DirtyDot />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="@2xl:hidden">
            <Select aria-label="Sección de Ajustes" value={section} onValueChange={(v) => go(settingsPath(v as SettingsSection))}
              options={SECTIONS.map((s) => ({ value: s.id, label: <span className="inline-flex items-center gap-2">{s.label}{dirtyAll.includes(s.id as EditableSection) && <DirtyDot />}</span> }))} />
          </div>
          <section aria-labelledby="ajustes-seccion" className="min-w-0">
            <header className="mb-4">
              <h2 id="ajustes-seccion" className="text-lg font-semibold">{meta.label}</h2>
              <p className="mt-0.5 text-ink-3">{meta.description}</p>
            </header>
            {body}
          </section>
        </div>
      </div>
    </Page>
  );
}
