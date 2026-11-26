/*
 * Ajustes › Actualización del sistema: versión actual, novedades, «Actualizar el sistema» con pasos y registro en vivo,
 * aviso de reinicio y espera tras reiniciar. Sin ningún campo de Git: el remoto, la rama y la carpeta los gestiona el sistema.
 * En Docker (`updateMode: 'entrypoint'`) la actualización solo trae el código y pide reiniciar; el contenedor instala y compila al arrancar.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CloudDownload, LoaderCircle, Power, RefreshCw } from 'lucide-react';
import { Badge, Button, Callout, ConfirmDialog, DescriptionList, ErrorState, IconButton, LogViewer, Panel, Spinner, Stepper, type StepState, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { parseUpdateResult, siteApi, type SystemVersion } from '@/lib/api.site';
import { errText } from '@/lib/auth';
import { useAsync, useJob } from '@/lib/hooks';
import { fmtDate, jobState, relTime } from '@/lib/util';
import { isLive } from '@/lib/siteModel';
import { JobLogDialog, useSite } from './site';
import { isDockerMode, parseSteps, stepLabels, updatePlan } from './systemModel';

/* ---------- Espera tras reiniciar ---------- */
export function RestartWait({ mode, docker, onCancel }: { mode: 'exit' | 'respawn'; docker: boolean; onCancel: () => void }) {
  const [phase, setPhase] = useState<'down' | 'up'>('down');
  const [secs, setSecs] = useState(0);
  const phaseRef = useRef<'down' | 'up'>('down');
  // En Docker el contenedor instala y compila al arrancar: se espera mucho más antes de avisar.
  const slowAfter = docker ? 600 : 60;
  useEffect(() => {
    let alive = true;
    const t0 = Date.now();
    const clock = setInterval(() => setSecs(Math.round((Date.now() - t0) / 1000)), 1000);
    const loop = async () => {
      while (alive) {
        await new Promise((r) => setTimeout(r, docker ? 2500 : 1200));
        if (!alive) return;
        let up = true;
        try { await siteApi.status(); } catch (e) { if (e instanceof ApiError && (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504)) up = false; }
        if (!up && phaseRef.current === 'down') { phaseRef.current = 'up'; setPhase('up'); }
        // Respuesta tras haber caído (o tras 6 s sin caer: el reinicio fue tan rápido que no se vio la caída).
        if (up && (phaseRef.current === 'up' || Date.now() - t0 > 6000)) { window.location.reload(); return; }
      }
    };
    void loop();
    return () => { alive = false; clearInterval(clock); };
  }, [docker]);
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="rw-t" aria-describedby="rw-d" className="fixed inset-0 z-[1500] grid place-items-center bg-scrim p-4">
      <div className="w-full max-w-[460px] rounded-lg border border-line bg-raised p-6 shadow-pop">
        <h2 id="rw-t" className="mb-1 flex items-center gap-2 text-lg font-semibold"><LoaderCircle size={18} className="animate-spin" /> Reiniciando el sistema…</h2>
        <p id="rw-d" className="text-ink-2" aria-live="polite">
          {phase === 'down' ? 'Cerrando el sistema actual.' : docker ? 'El sistema está arrancando: instala lo necesario y compila el panel y el manual. Puede tardar varios minutos.' : 'Esperando a que vuelva a arrancar.'}
          {' '}Esta pantalla se recargará sola cuando responda. <span className="tabular-nums text-ink-3">({mm})</span>
        </p>
        {mode === 'exit' && !docker && <p className="mt-2 text-sm text-ink-3">El servicio que gestiona el sistema (pm2 o el servicio del equipo) es quien lo vuelve a arrancar.</p>}
        {secs > slowAfter && <Callout tone="warn" className="mt-3">Está tardando más de lo normal. Puede cerrar este aviso y recargar la página más tarde; si no vuelve, quien despliega puede revisar el registro del contenedor.</Callout>}
        {secs > slowAfter && <div className="mt-3 flex justify-end"><Button onClick={onCancel}>Cerrar este aviso</Button></div>}
      </div>
    </div>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <span className="text-ink-3">{children}</span>;

export function SystemUpdate() {
  const toast = useToast();
  const live = isLive(useSite().status);
  const ver = useAsync(() => siteApi.version(), []);
  const { job, running, id, start } = useJob(siteApi.job);
  const [confirm, setConfirm] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [openLog, setOpenLog] = useState(false);
  const [starting, setStarting] = useState(false);
  const resumed = useRef(false);
  const v: SystemVersion | null = ver.data;
  const docker = isDockerMode(v?.updateMode);

  // Retoma una actualización que ya estaba en curso (otra pestaña o recarga).
  useEffect(() => {
    if (resumed.current || !v?.lastUpdate) return;
    resumed.current = true;
    if (v.lastUpdate.status === 'running') start(v.lastUpdate.jobId);
  }, [v, start]);
  // Al terminar se vuelve a consultar la versión (para saber si hace falta reiniciar).
  const wasRunning = useRef(false);
  useEffect(() => {
    if (running) { wasRunning.current = true; return; }
    if (wasRunning.current && job) {
      wasRunning.current = false;
      ver.reload();
      if (jobState(job.status) === 'error') toast('La actualización falló; el sistema quedó como estaba', 'error');
      else toast(docker ? 'Código nuevo listo: falta reiniciar el sistema' : 'Actualización terminada');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const doUpdate = async () => {
    setConfirm(false); setStarting(true);
    try { const r = await siteApi.update(); start(r.jobId); } catch (e) { toast(errText(e), 'error'); ver.reload(); } finally { setStarting(false); }
  };
  const doRestart = async () => {
    setConfirmRestart(false);
    try { await siteApi.restart(); setWaiting(true); } catch (e) { toast(errText(e), 'error'); }
  };

  const log = job?.log ?? '';
  const result = job ? parseUpdateResult(log) : null;
  const parsed = parseSteps(log);
  const labels = stepLabels(v?.updateMode, parsed);
  const n = parsed.current;
  const jst = job ? jobState(job.status) : 'none';
  const states: StepState[] = labels.map((_, i) => {
    const k = i + 1;
    if (!job) return 'todo';
    if (jst === 'ok') return 'done';
    if (k < n) return 'done';
    if (k === n) return jst === 'error' ? 'fail' : running ? 'active' : 'done';
    return 'todo';
  });
  const detail = (i: number) => { const r = result?.steps?.[i]; return r?.status === 'omitido' ? 'Omitido: no hacía falta' : r?.status === 'error' && r.detail ? r.detail : r?.detail && r.status === 'ok' && r.detail !== 'nada' ? r.detail : undefined; };
  const showSteps = !!job && (running || id != null);
  const behind = v?.behind ?? 0;
  const needsRestart = !!v?.needsRestart || (!!result?.needsRestart && jst === 'ok');
  const noRepo = v?.initialized === false;
  const blocked = !v || noRepo || !v.canUpdate;
  const upToDate = !!v && !noRepo && v.behind === 0;

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Versión instalada" actions={<IconButton size="icon-sm" label="Comprobar de nuevo" disabled={ver.loading} icon={<RefreshCw size={14} className={ver.loading ? 'animate-spin' : ''} />} onClick={ver.reload} />}>
        {ver.loading && !v ? <Spinner label="Comprobando si hay novedades…" /> : ver.error ? <ErrorState error={ver.error} onRetry={ver.reload} /> : v ? (
          <div className="flex flex-col gap-4">
            {noRepo ? (
              <Callout tone="warn">
                <strong>Este sistema no se puede actualizar desde el panel.</strong> {v.message ?? 'La carpeta del sistema no es una copia del repositorio.'}
                <span className="mt-1 block text-ink-2">{v.message ? 'Lo resuelve quien despliega.' : 'Para activarlo, quien despliega debe instalar el sistema desde una copia del repositorio (con git clone) y volver a ejecutar el instalador.'} El resto del panel funciona con normalidad.</span>
              </Callout>
            ) : (
              <DescriptionList items={[
                ['Versión actual', <span className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-x-1.5"><code>{v.shortCommit ?? v.commit?.slice(0, 7) ?? '—'}</code>{v.branch && <Muted>· rama {v.branch}</Muted>}</span>
                  {v.subject && <span className="break-words">{v.subject}</span>}
                  {v.date && <span className="text-sm text-ink-3" title={fmtDate(v.date)}>{relTime(v.date)} · {fmtDate(v.date)}</span>}
                </span>],
                ['Novedades', v.behind == null ? <Muted>No se pudo comprobar</Muted> : behind > 0 ? <Badge tone="accent" dot>{behind} {behind === 1 ? 'cambio disponible' : 'cambios disponibles'}</Badge> : <Badge tone="ok" dot>Al día</Badge>],
                ['Copia local', v.clean == null ? <Muted>No consta</Muted> : v.clean ? <Badge tone="ok" dot>Sin cambios locales</Badge> : <Badge tone="warn" dot>Con cambios locales sin confirmar</Badge>],
                ['Cómo se actualiza', docker ? <span>En Docker: trae el código y reinicia; el contenedor instala y compila al arrancar.</span> : <span>En este equipo: trae el código, instala, compila y avisa si hace falta reiniciar.</span>],
              ]} />
            )}
            {!noRepo && v.message && !v.canUpdate && !upToDate && <Callout tone="warn"><strong>Ahora no se puede actualizar.</strong> {v.message}</Callout>}
            {!v.clean && !!v.changedFiles?.length && <details className="text-sm text-ink-3"><summary className="cursor-pointer">Archivos con cambios locales</summary><ul className="mt-1 list-disc pl-5">{v.changedFiles.map((f) => <li key={f}><code>{f}</code></li>)}</ul></details>}
          </div>
        ) : null}
      </Panel>

      {v && (
        <Panel title="Actualizar el sistema" description={docker
          ? 'Trae el código nuevo y reinicia el sistema; al volver puede tardar unos minutos instalando y compilando. El contenido del manual no se toca: vive en la base de datos.'
          : 'Trae el código nuevo del sistema (componentes, scripts y el propio panel). El contenido del manual no se toca: vive en la base de datos.'}>
          <div className="flex flex-col gap-4">
            {needsRestart && (
              <Callout tone="warn" action={<Button size="sm" variant="primary" onClick={() => setConfirmRestart(true)}><Power size={14} /> Reiniciar</Button>}>
                <strong>Falta reiniciar el sistema</strong> para usar el código nuevo. {docker ? 'Al arrancar, el contenedor instala lo necesario y compila: el panel puede tardar unos minutos en volver.' : v.restartMode === 'respawn' ? 'El sistema lanza un proceso nuevo y cierra el actual.' : 'El sistema se cierra y lo vuelve a arrancar el servicio que lo gestiona.'}
              </Callout>
            )}
            {!(needsRestart && upToDate) && <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Button variant={needsRestart ? 'secondary' : 'primary'} disabled={blocked || running || starting} onClick={() => setConfirm(true)}
                title={noRepo ? 'Este sistema no es una copia del repositorio' : !v.canUpdate ? (v.message ?? 'No hay nada que actualizar') : undefined}>
                {running || starting ? <><LoaderCircle size={16} className="animate-spin" /> Actualizando…</> : <><CloudDownload size={16} /> Actualizar el sistema</>}
              </Button>
              {!running && (upToDate ? <span className="text-sm text-ink-3">El sistema está al día: no hay nada que actualizar.</span>
                : noRepo ? <span className="text-sm text-ink-3">No disponible en esta instalación.</span>
                : !v.canUpdate && v.behind == null ? <span className="text-sm text-ink-3">No se pudo comprobar si hay novedades.</span> : null)}
            </div>}

            {showSteps && (
              <div className="border-t border-line pt-4" aria-live="polite">
                <p className="mb-2 text-[13.5px] font-semibold">{running ? (n ? `Paso ${n}/${labels.length} · ${labels[n - 1] ?? ''}` : 'Preparando…') : jst === 'ok' ? 'Actualización terminada' : 'La actualización falló'}</p>
                <Stepper steps={labels.map((label, i) => ({ label, state: states[i]!, detail: detail(i) }))} />
                {jst === 'ok' && !running && <Callout tone="ok" className="mt-3">{result?.updated
                  ? <><strong>Código actualizado.</strong> {result.from?.slice(0, 7)} → {result.to?.slice(0, 7)} ({result.files} archivos).{(result.needsRestart || docker) && ' Falta reiniciar para aplicarlo.'}</>
                  : <><strong>El sistema ya estaba al día.</strong></>}</Callout>}
                {jst === 'error' && !running && <Callout tone="danger" className="mt-3"><strong>Falló el paso «{result?.failedStep ?? labels[Math.max(0, n - 1)]}».</strong> No se reinició nada y el manual anterior sigue publicado. El registro indica el motivo.</Callout>}
                <details className="group mt-3" open={jst === 'error' || undefined}>
                  <summary className="cursor-pointer list-none text-sm font-medium text-ink-2 [&::-webkit-details-marker]:hidden"><span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> Registro de la actualización</summary>
                  <LogViewer className="mt-2" log={log} running={running} />
                </details>
                {!running && <Button className="mt-2" variant="ghost" size="sm" onClick={() => setOpenLog(true)}>Abrir el registro completo</Button>}
              </div>
            )}
          </div>
        </Panel>
      )}

      {v && !needsRestart && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium">Reiniciar el sistema</div>
            <p className="m-0 text-sm text-ink-3">Solo hace falta tras una actualización o si lo indica quien despliega. El panel deja de responder {docker ? 'unos minutos' : 'unos segundos'}.</p>
          </div>
          <Button size="sm" onClick={() => setConfirmRestart(true)}><Power size={14} /> Reiniciar…</Button>
        </div>
      )}

      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Actualizar el sistema" confirmLabel="Actualizar el sistema" onConfirm={() => void doUpdate()}>
        <p className="mb-2">{docker ? 'Trae el código nuevo y reinicia el sistema; al volver puede tardar unos minutos instalando y compilando.' : live ? 'Trae el código nuevo y recompila el diseño del manual. Es rápido y no toca el contenido. Esto hará, en este orden:' : 'Esto hará, en este orden:'}</p>
        <ol className="m-0 list-decimal space-y-0.5 pl-5">{updatePlan(v?.updateMode, live).map((t) => <li key={t}>{t}</li>)}</ol>
        <p className="mt-2 text-sm text-ink-3">Si algo falla, se detiene y todo queda como estaba. El contenido del manual no se toca. {behind > 0 ? `Hay ${behind} ${behind === 1 ? 'cambio' : 'cambios'} por traer.` : ''}</p>
      </ConfirmDialog>
      <ConfirmDialog open={confirmRestart} onOpenChange={setConfirmRestart} danger requireText="REINICIAR" title="Reiniciar el sistema" confirmLabel="Reiniciar" onConfirm={() => void doRestart()}>
        El panel y el manual dejarán de responder {docker ? 'unos minutos: al arrancar, el contenedor instala lo necesario y compila' : 'unos segundos'}. Esta pantalla se recargará sola cuando vuelva.
      </ConfirmDialog>
      <JobLogDialog jobId={id} open={openLog} onOpenChange={setOpenLog} title="Registro de la actualización del sistema" />
      {waiting && <RestartWait mode={v?.restartMode ?? 'exit'} docker={docker} onCancel={() => setWaiting(false)} />}
    </div>
  );
}
