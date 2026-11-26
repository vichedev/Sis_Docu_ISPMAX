import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, api, type Role, type Stats, type User } from './api';
import { STATS_EVENT } from './util';

/* ---------- Sesión ---------- */
export interface AuthValue { user: User; setUser: (u: User | null) => void; lastLogin?: { at: string; ip?: string | null } | null; /** Vuelve a leer /api/auth/me (tras cambiar la contraseña o el 2FA). */ refresh: () => Promise<void> }
export const AuthCtx = createContext<AuthValue>(null as never);
export const useAuth = () => useContext(AuthCtx);
const RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };
/** ¿El usuario tiene al menos el rol `min`? (admin ⊃ editor ⊃ viewer) */
export const can = (user: User, min: Role) => RANK[user.role] >= RANK[min];

export const errText = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error inesperado');

/* ---------- Estadísticas compartidas (contador de cambios sin publicar) ---------- */
const StatsCtx = createContext<{ stats: Stats | null; refresh: () => void }>({ stats: null, refresh: () => {} });
export const useStats = () => useContext(StatsCtx);
export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const refresh = useCallback(() => { api.stats().then(setStats).catch(() => { /* sin contador */ }); }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    window.addEventListener(STATS_EVENT, refresh);
    return () => { clearInterval(t); window.removeEventListener(STATS_EVENT, refresh); };
  }, [refresh]);
  return <StatsCtx.Provider value={{ stats, refresh }}>{children}</StatsCtx.Provider>;
}
