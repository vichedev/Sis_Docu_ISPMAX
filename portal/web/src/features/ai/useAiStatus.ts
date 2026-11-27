/* Estado del asistente de IA (GET /api/ai/status). Se vuelve a pedir cuando Ajustes cambia la configuración. */
import { useAsync, useWindowEvent } from '@/lib/hooks';
import { can, useAuth } from '@/lib/auth';
import { aiApi } from '@/lib/api.ai';
import { aiButtonState } from './aiModel';

export const AI_CONFIG_EVENT = 'portal:ai-config';

export function useAiStatus() {
  const { user } = useAuth();
  const allowed = can(user, 'editor');
  const { data, error, loading, reload } = useAsync(() => (allowed ? aiApi.status() : Promise.resolve(null)), [allowed]);
  useWindowEvent(AI_CONFIG_EVENT, reload);
  const state = aiButtonState(data, user?.role, !!error && !data);
  return { status: data, state, loading, allowed, reload };
}
