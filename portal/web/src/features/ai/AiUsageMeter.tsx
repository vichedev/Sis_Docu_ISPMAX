/*
 * Medidor de consumo del asistente: barra con el % del cupo por minuto (role="meter", con texto: no solo color) y detalle
 * en un Popover (tokens usados, cuándo se libera, peticiones que quedan hoy). Colores por umbral: normal < 60 %,
 * aviso 60-85 %, alto > 85 %.
 */
import { Gauge, RefreshCw } from 'lucide-react';
import { Button, Popover } from '@/components/ui';
import { cn } from '@/lib/cn';
import { fmtTokens, resetCountdown, usageLevel, usageLevelText, usagePct, usageSummary, type AiUsage } from './aiModel';

const FILL = { ok: 'bg-ok', warn: 'bg-warn-dot', high: 'bg-danger' } as const;
const TEXT = { ok: 'text-ok', warn: 'text-warn', high: 'text-danger' } as const;

export function UsageBar({ usage, className }: { usage: AiUsage | null; className?: string }) {
  const pct = usagePct(usage);
  const level = pct == null ? null : usageLevel(pct);
  return (
    <div role="meter" aria-label="Consumo de tokens del asistente en este minuto" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined} aria-valuetext={usageSummary(usage)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      {pct != null && level && <div className={cn('h-full rounded-full transition-[width] duration-500', FILL[level])} style={{ width: `${Math.max(pct, 2)}%` }} />}
    </div>
  );
}

/** Detalle completo (Ajustes y Popover del chat). */
export function UsageDetail({ usage, fetchedAt, now, busy, error, onRefresh }: { usage: AiUsage | null; fetchedAt: number; now: number; busy: boolean; error?: string; onRefresh: () => void }) {
  const pct = usagePct(usage);
  const level = pct == null ? null : usageLevel(pct);
  const left = resetCountdown(usage, fetchedAt, now);
  const limit = usage?.tokensLimit ?? usage?.tpm;
  return (
    <div className="flex flex-col gap-2.5 text-sm" data-testid="ai-usage-detail">
      <UsageBar usage={usage} />
      {pct == null || !usage?.tokensLimit ? (
        <p className="m-0 text-ink-3">Sin datos todavía. Se actualiza solo después de cada respuesta de la IA; puedes pulsar «Actualizar» (gasta una llamada mínima).</p>
      ) : (
        <>
          <p className="m-0"><b className={cn('font-semibold', level && TEXT[level])}>{pct} %</b> <span className="text-ink-2">· {level && usageLevelText(level)}</span></p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-ink-3">Este minuto</dt><dd className="m-0">{fmtTokens(usage.tokensLimit - (usage.tokensRemaining ?? usage.tokensLimit))} de {fmtTokens(limit!)} tokens</dd>
            <dt className="text-ink-3">Se libera en</dt><dd className="m-0">{left == null ? '—' : left > 0 ? `${left} s` : 'ya disponible'}</dd>
            <dt className="text-ink-3">Peticiones hoy</dt><dd className="m-0">{usage.requestsRemaining != null && usage.requestsLimit != null ? `quedan ${fmtTokens(usage.requestsRemaining)} de ${fmtTokens(usage.requestsLimit)}` : '—'}</dd>
          </dl>
          <p className="m-0 text-xs text-ink-4">{usage.source === 'local' ? 'Cuenta propia del portal (aún sin cabeceras del proveedor).' : 'Lectura de Groq'}{usage.updatedAt ? ` · ${new Date(usage.updatedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}</p>
        </>
      )}
      {error && <p role="alert" className="m-0 text-danger">{error}</p>}
      <div><Button size="sm" onClick={onRefresh} disabled={busy}><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> {busy ? 'Actualizando…' : 'Actualizar'}</Button></div>
      <p className="m-0 text-xs text-ink-3">Plan gratuito de Groq: ~{fmtTokens(usage?.tpm ?? 8000)} tokens por minuto; si lo alcanzas, espera unos segundos.</p>
    </div>
  );
}

/** Indicador compacto de la cabecera del chat: barra + % y, al pulsar, el detalle. */
export function UsageMeterButton({ usage, fetchedAt, now, busy, error, onRefresh }: { usage: AiUsage | null; fetchedAt: number; now: number; busy: boolean; error?: string; onRefresh: () => void }) {
  const pct = usagePct(usage);
  const level = pct == null ? null : usageLevel(pct);
  return (
    <Popover side="bottom" align="end" label="Consumo del asistente" className="w-72"
      trigger={
        <button type="button" data-testid="ai-usage" aria-label={`Consumo del asistente: ${usageSummary(usage)}. Pulsa para ver el detalle`}
          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-transparent bg-transparent px-1.5 text-xs text-ink-3 hover:bg-subtle hover:text-ink">
          <Gauge size={13} aria-hidden="true" />
          <span className="w-12"><UsageBar usage={usage} /></span>
          <span className={cn('w-8 text-right tabular-nums', level && TEXT[level])}>{pct == null ? '—' : `${pct} %`}</span>
        </button>
      }>
      <UsageDetail usage={usage} fetchedAt={fetchedAt} now={now} busy={busy} error={error} onRefresh={onRefresh} />
    </Popover>
  );
}
