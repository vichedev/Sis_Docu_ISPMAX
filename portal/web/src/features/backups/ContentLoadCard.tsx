/* Carga de un paquete `.ispmax`: formulario reutilizable (`ContentLoader`, en Respaldos) y tarjeta autónoma
   (`ContentLoadCard`, para el Inicio y el espacio de contenido cuando el sistema está vacío). */
import { useEffect, useRef, useState } from 'react';
import { CircleCheck, FileArchive, PackageOpen, X } from 'lucide-react';
import { Button, Callout, Card, Field, FileDropzone, Input, SegmentedControl, Spinner, useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { contentApi, uploadPackage, type ContentSummary } from '@/lib/api.content';
import { can, useAuth } from '@/lib/auth';
import { useAsync, useJob } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { contentChanged, fmtSize, jobState } from '@/lib/util';
import { CONFIRM_WORD, canImport, countsText, defaultMode, fileProblem, importErrorText, lastLogLine, needsConfirm, parseImportResult, type ImportMode } from './contentModel';

type Phase = { k: 'idle' } | { k: 'upload'; pct: number } | { k: 'job' } | { k: 'error'; text: string };

function Bar({ pct, label, indeterminate }: { pct?: number; label: string; indeterminate?: boolean }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : Math.round(pct ?? 0)} className="h-1.5 overflow-hidden rounded-sm bg-muted">
      <div className={cn('h-full rounded-sm bg-accent transition-[width]', indeterminate && 'w-full animate-pulse')} style={indeterminate ? undefined : { width: `${pct ?? 0}%` }} />
    </div>
  );
}

/** Formulario completo: archivo → modo → confirmación → progreso → resultado. */
export function ContentLoader({ hasContent, autoStart, showCli = true, onDone }: { hasContent: boolean; autoStart?: boolean; showCli?: boolean; onDone?: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>(defaultMode(hasContent));
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const { job, start } = useJob(api.job);
  const abort = useRef<(() => void) | null>(null);
  const doneFor = useRef<number | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);

  useEffect(() => { if (phase.k === 'idle') setMode(defaultMode(hasContent)); }, [hasContent]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => abort.current?.(), []);

  const problem = file ? fileProblem(file) : null;
  const confirmNeeded = needsConfirm(mode, hasContent);
  const ready = canImport(file, mode, hasContent, typed);
  const busy = phase.k === 'upload' || phase.k === 'job';

  const state = job ? jobState(job.status) : 'running';
  const result = job && state === 'ok' ? parseImportResult(job.log) : null;
  useEffect(() => {
    if (jobId != null && state === 'ok' && doneFor.current !== jobId) { doneFor.current = jobId; contentChanged(); toast('Contenido cargado. El manual se está actualizando.'); onDone?.(); }
  }, [state, jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (f: File | null = file, m: ImportMode = mode) => {
    if (!f) return;
    setPhase({ k: 'upload', pct: 0 });
    const up = uploadPackage(f, m, needsConfirm(m, hasContent) ? CONFIRM_WORD : undefined, (l, t) => setPhase({ k: 'upload', pct: (l / t) * 100 }));
    abort.current = up.abort;
    try {
      const r = await up.promise;
      abort.current = null;
      setJobId(r.jobId); start(r.jobId); setPhase({ k: 'job' });
    } catch (e) {
      abort.current = null;
      const err = e as ApiError;
      setPhase({ k: 'error', text: importErrorText(err.status ?? 0, err.message) });
    }
  };
  const reset = () => { setFile(null); setTyped(''); setPhase({ k: 'idle' }); setJobId(null); doneFor.current = null; };
  const pick = (fs: File[]) => {
    const f = fs[0] ?? null;
    setFile(f); setPhase({ k: 'idle' }); setTyped('');
    if (f && autoStart && !hasContent && !fileProblem(f)) void run(f, 'replace');
  };

  /* Resultado */
  if (jobId != null && state === 'ok') {
    return (
      <div className="flex flex-col gap-3" aria-live="polite">
        <Callout tone="ok" icon={<CircleCheck size={16} />}>
          <strong>Contenido cargado.</strong> {!result ? 'Importación terminada.' : result.counts.pages + result.counts.assets + result.counts.tours === 0 && result.skipped > 0 ? 'No había nada nuevo que añadir: todo lo del archivo ya existía.' : <>{countsText(result.counts)}.{result.skipped > 0 && <> Se omitieron {result.skipped} elementos que ya existían.</>}</>}
        </Callout>
        <p className="m-0 text-sm text-ink-3">El manual se está actualizando: el estado aparece en la barra superior.{result?.safetyFile && <> Antes de reemplazar se guardó un respaldo de seguridad (<code>{result.safetyFile}</code>) en la lista de respaldos.</>}</p>
        <div><Button size="sm" onClick={reset}>Cargar otro archivo</Button></div>
      </div>
    );
  }
  if (jobId != null && state === 'error') {
    return (
      <div className="flex flex-col gap-3" aria-live="polite">
        <Callout tone="danger"><strong>La carga falló.</strong> {lastLogLine(job?.log ?? '') || 'Revise el registro.'} No se cambió nada del contenido actual.</Callout>
        <div><Button size="sm" onClick={reset}>Volver a intentar</Button></div>
      </div>
    );
  }
  if (phase.k === 'upload' || phase.k === 'job') {
    return (
      <div className="flex flex-col gap-2.5" aria-live="polite">
        <div className="flex items-center gap-2 text-[13.5px]"><FileArchive size={16} className="text-ink-3" /><span className="min-w-0 break-all">{file?.name}</span><span className="text-ink-3">{file && fmtSize(file.size)}</span></div>
        {phase.k === 'upload'
          ? <><Bar pct={phase.pct} label="Subida del paquete" /><p className="m-0 text-sm text-ink-3">Subiendo… {Math.round(phase.pct)} %</p></>
          : <><Bar label="Importación" indeterminate /><Spinner label={lastLogLine(job?.log ?? "") || "Importando el contenido…"} /></>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!file ? (
        <FileDropzone accept=".ispmax" onFiles={pick} files={[]} hint="Respaldo del contenido (.ispmax), máximo 300 MB">
          <span className="flex flex-col items-center gap-1"><span>Arrastre aquí un archivo <code>.ispmax</code> o <u className="text-accent-ink">elíjalo del equipo</u></span></span>
        </FileDropzone>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-subtle px-3 py-2.5 text-[13.5px]">
          <FileArchive size={18} className="shrink-0 text-ink-3" />
          <span className="min-w-0 flex-1"><span className="block break-all font-medium">{file.name}</span><span className="text-ink-3">{fmtSize(file.size)}</span></span>
          <Button size="icon-sm" variant="ghost" aria-label="Quitar el archivo" onClick={reset}><X size={14} /></Button>
        </div>
      )}
      {phase.k === 'error' && <Callout tone="danger" action={<Button size="sm" onClick={() => void run()} disabled={!ready}>Reintentar</Button>}>{phase.text}</Callout>}
      {problem && <Callout tone="danger">{problem}</Callout>}
      {file && !problem && (
        <>
          {hasContent && (
            <>
              <Field label="Qué hacer con el contenido actual">
                {() => <SegmentedControl label="Modo de carga" value={mode} onValueChange={(v) => { setMode(v); setTyped(''); }}
                  options={[{ value: 'merge', label: 'Añadir solo lo que falta' }, { value: 'replace', label: 'Reemplazar todo el contenido' }]} className="max-sm:flex max-sm:flex-col" />}
              </Field>
              {mode === 'merge'
                ? <p className="m-0 text-sm text-ink-3">Se añaden las páginas, imágenes y tours que todavía no existen. Lo que ya está no se modifica.</p>
                : <Callout tone="warn"><strong>Se reemplazará todo el contenido actual</strong> (páginas, borradores, imágenes y tours). Antes se guarda un respaldo de seguridad automático, que aparecerá en la lista. Usuarios y sesiones no se tocan.</Callout>}
            </>
          )}
          {confirmNeeded && (
            <Field label={<>Escriba <code>{CONFIRM_WORD}</code> para continuar</>}>
              {(id, d) => <Input id={id} aria-describedby={d} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} placeholder={CONFIRM_WORD} className="max-w-[220px]" />}
            </Field>
          )}
          {!hasContent && <p className="m-0 text-sm text-ink-3">El sistema no tiene contenido: se cargará todo el manual sin pedir más confirmaciones.</p>}
          <div><Button variant="primary" disabled={!ready || busy} onClick={() => void run()}><PackageOpen size={16} /> Cargar contenido</Button></div>
        </>
      )}
      {showCli && <p className="m-0 text-xs text-ink-3">Quien despliega también puede cargarlo por terminal: lo explica la pantalla <a href="#/respaldos">Respaldos</a>.</p>}
    </div>
  );
}

/** Tarjeta autónoma para un sistema recién desplegado y vacío. Para quien no es administrador, solo explica. */
export function ContentLoadCard({ className, onDone }: { className?: string; onDone?: () => void }) {
  const { user } = useAuth();
  const admin = can(user, 'admin');
  const { data, error, loading } = useAsync<ContentSummary>(() => contentApi.summary(), []);
  return (
    <Card className={cn('mx-auto w-full max-w-[640px] p-5 max-sm:p-4', className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-subtle text-ink-3"><PackageOpen size={20} /></div>
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-semibold leading-snug">Cargar el contenido del manual</h2>
          <p className="mt-1 text-[13.5px] text-ink-3">Este sistema todavía no tiene páginas. Cargue el respaldo del contenido (archivo <code>.ispmax</code>) y el manual quedará guardado en la base de datos. Solo se hace una vez.</p>
        </div>
      </div>
      {!admin ? <Callout>Pida a un administrador que cargue el respaldo del contenido desde Respaldos.</Callout>
        : error ? <Callout tone="danger">No se pudo leer el estado del contenido. Recargue la página.</Callout>
        : loading && !data ? <Spinner block /> : <ContentLoader hasContent={!!data?.hasContent} autoStart onDone={onDone} />}
    </Card>
  );
}
