/*
 * Consumo de tokens del asistente (GET /api/ai/usage). La lectura viene de las cabeceras de Groq que el servidor guarda tras
 * cada llamada: abrir el panel NO gasta tokens. «Actualizar» (a petición) hace una llamada mínima. La cuenta atrás corre aquí.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '@/lib/api.ai';
import { errText } from '@/lib/auth';
import { usageNow, type AiUsage } from './aiModel';

export function useAiUsage(active: boolean) {
  const [raw, setRaw] = useState<AiUsage | null>(null);
  const [at, setAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const set = useCallback((u: AiUsage | null | undefined) => { if (u) { setRaw(u); setAt(Date.now()); } }, []);
  const load = useCallback(async () => {
    try { set(await aiApi.usage()); setError(''); } catch (e) { if (alive.current) setError(errText(e)); }
  }, [set]);
  /** Solo a petición de la persona: gasta una llamada mínima al proveedor. */
  const refresh = useCallback(async () => {
    setBusy(true);
    try { set(await aiApi.usageRefresh()); setError(''); } catch (e) { if (alive.current) setError(errText(e)); } finally { if (alive.current) setBusy(false); }
  }, [set]);

  useEffect(() => { if (active) void load(); }, [active, load]);
  // cuenta atrás: un tic por segundo mientras haya algo que contar
  useEffect(() => {
    if (!active || !raw?.available || !raw.resetInSec) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active, raw]);

  const usage = usageNow(raw, at, now);
  return { usage, raw, fetchedAt: at, now, setFromServer: set, reload: load, refresh, busy, error };
}
