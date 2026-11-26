/*
 * Ajustes › Información del sistema (solo lectura, `GET /api/system/info`) con «Copiar información» para soporte.
 * Si el servidor aún no ofrece ese punto (404), se arma lo posible con `/api/system/version` y el estado del sitio.
 */
import { useMemo } from 'react';
import { ClipboardCopy, RefreshCw } from 'lucide-react';
import { Badge, Button, Callout, DescriptionList, ErrorState, IconButton, Panel, SkeletonRows, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { siteApi, type SystemInfo as Info } from '@/lib/api.site';
import { useAsync } from '@/lib/hooks';
import { copy, fmtDate, relTime } from '@/lib/util';
import { fmtUptime, infoText, isDockerMode, lastBuildAt, versionLine } from './systemModel';

async function loadInfo(): Promise<{ info: Info; partial: boolean }> {
  try { return { info: await siteApi.info(), partial: false }; }
  catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
    // Servidor anterior: lo que se puede saber por otros puntos de la API.
    const [v, s] = await Promise.all([siteApi.version(false).catch(() => null), siteApi.status().catch(() => null)]);
    return {
      partial: true,
      info: {
        version: v ? { branch: v.branch, shortCommit: v.shortCommit, commit: v.commit, date: v.date, subject: v.subject } : null,
        site: s ? { base: s.siteUrl ?? null, exists: s.siteExists ?? null, pages: s.lastBuild?.pages ?? null, lastBuild: s.lastBuild?.finishedAt ?? null } : undefined,
        update: v ? { mode: v.updateMode ?? null, canUpdate: v.canUpdate, message: v.message ?? null } : undefined,
        restartMode: v?.restartMode ?? null,
      },
    };
  }
}

const Unknown = () => <span className="text-ink-3">No consta</span>;
const YesNo = ({ v, yes = 'Sí', no = 'No', good }: { v: boolean | null | undefined; yes?: string; no?: string; good?: boolean }) =>
  v == null ? <Unknown /> : <Badge tone={good === undefined ? 'neutral' : v === good ? 'ok' : 'warn'} dot={good !== undefined}>{v ? yes : no}</Badge>;

export function SystemInfo() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(loadInfo, []);
  const info = data?.info;
  const text = useMemo(() => (info ? infoText(info, new Date().toISOString()) : ''), [info]);
  const doCopy = async () => {
    const ok = await copy(text);
    toast(ok ? 'Información copiada: péguela en el mensaje a soporte' : 'No se pudo copiar: abra «Ver el texto que se copia» y cópielo a mano', ok ? 'ok' : 'error');
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !info) return <Panel title="Resumen"><SkeletonRows rows={6} cols={2} /></Panel>;
  if (!info) return null;
  const r = info.runtime, db = info.database, s = info.site, a = info.access, u = info.update;
  const lb = lastBuildAt(s?.lastBuild);
  const v = info.version;
  const vObj = v && typeof v === 'object' ? v : null;

  return (
    <div className="flex flex-col gap-5">
      {data?.partial && <Callout>Este servidor todavía no ofrece toda la información del sistema: se muestra la que se puede consultar. Actualice el sistema para verla completa.</Callout>}
      <Panel title="Resumen"
        actions={<>
          <IconButton size="icon-sm" label="Volver a consultar" disabled={loading} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} onClick={reload} />
          <Button size="sm" onClick={() => void doCopy()}><ClipboardCopy size={14} /> Copiar información</Button>
        </>}>
        <DescriptionList items={[
          ['Versión', v ? <span className="flex min-w-0 flex-col">
            {vObj ? <><span><code>{vObj.shortCommit ?? vObj.commit?.slice(0, 7) ?? '—'}</code>{vObj.branch && <span className="text-ink-3"> · rama {vObj.branch}</span>}</span>
              {vObj.subject && <span className="break-words">{vObj.subject}</span>}
              {vObj.date && <span className="text-sm text-ink-3">{fmtDate(vObj.date)}</span>}</> : <span>{versionLine(v)}</span>}
          </span> : <Unknown />],
          ['Entorno', r ? <span>{r.docker == null ? 'No consta' : r.docker ? 'Docker' : 'Local (sin Docker)'}{r.node && <span className="text-ink-3"> · Node {r.node}</span>}{r.platform && <span className="text-ink-3"> · {r.platform}</span>}</span>
            : u?.mode ? <span>{isDockerMode(u.mode) ? 'Docker' : 'Local'}</span> : <Unknown />],
          ['En marcha desde hace', r?.uptimeSec != null ? <span className="tabular-nums">{fmtUptime(r.uptimeSec)}</span> : <Unknown />],
          ['Base de datos', db ? <span className="flex flex-wrap items-center gap-1.5"><YesNo v={db.connected} yes="Conectada" no="Sin conexión" good />{db.name && <code>{db.name}</code>}{db.serverVersion && <span className="text-ink-3">PostgreSQL {db.serverVersion}</span>}</span> : <Unknown />],
          ['Manual generado', s ? <span className="flex flex-wrap items-center gap-1.5"><YesNo v={s.exists} yes="Sí" no="Todavía no" good />{s.pages != null && <span className="tabular-nums">{s.pages} páginas</span>}{lb && <span className="text-ink-3" title={fmtDate(lb)}>· actualizado {relTime(lb)}</span>}</span> : <Unknown />],
          ['Dirección del manual', s?.base ? <code>{s.base}</code> : <Unknown />],
        ]} />
      </Panel>

      <Panel title="Acceso al panel" description="Cómo está protegido el acceso. Lo configura quien despliega (variables del contenedor), no se cambia desde aquí.">
        {a ? (
          <DescriptionList items={[
            ['Panel habilitado', <YesNo v={a.adminEnabled} />],
            ['Restringido por IP', <YesNo v={a.adminIpRestricted} />],
            ['Detrás de un proxy', <YesNo v={a.behindProxy} />],
            ['Cookie segura (HTTPS)', a.cookieSecure === 'auto' ? <Badge>Automática: segura cuando se entra por HTTPS</Badge> : typeof a.cookieSecure === 'string' ? <span>{a.cookieSecure}</span> : <YesNo v={a.cookieSecure} />],
          ]} />
        ) : <p className="m-0 text-sm text-ink-3">No consta en este servidor.</p>}
      </Panel>

      <details className="group rounded-lg border border-line">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13.5px] font-medium text-ink-2 [&::-webkit-details-marker]:hidden"><span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> Ver el texto que se copia</summary>
        <pre className="m-0 overflow-x-auto border-t border-line bg-subtle px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-2">{text}</pre>
      </details>
    </div>
  );
}
