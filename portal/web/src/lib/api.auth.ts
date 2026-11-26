/* Cliente de la API de autenticación (Adenda 5 de CONTRACT.md). Tolera campos ausentes de servidores anteriores. */
import { request, type SessionInfo, type User } from './api';

export interface LoginOk { user: User }
export interface LoginChallenge { twoFactorRequired: true; challenge: string }
export type LoginResult = LoginOk | LoginChallenge;
export const isChallenge = (r: LoginResult): r is LoginChallenge => 'twoFactorRequired' in r && r.twoFactorRequired === true;

export interface AuthSession { id: string | number; current: boolean; createdAt: string; lastSeenAt: string | null; ip: string | null; userAgent: string | null }
export interface MeInfo { user: User; session?: SessionInfo; lastLogin?: { at: string; ip?: string | null } | null }

export const authApi = {
  login: (username: string, password: string) => request<LoginResult>('POST', '/api/auth/login', { username, password }),
  login2fa: (challenge: string, code: string) => request<LoginOk>('POST', '/api/auth/login/2fa', { challenge, code }),
  me: () => request<MeInfo>('GET', '/api/auth/me'),
  sessions: async (): Promise<AuthSession[]> => {
    const d = await request<{ items?: AuthSession[] } | AuthSession[]>('GET', '/api/auth/sessions');
    return Array.isArray(d) ? d : d?.items ?? [];
  },
  revokeSession: (id: string | number) => request<unknown>('DELETE', `/api/auth/sessions/${encodeURIComponent(String(id))}`),
  revokeOthers: () => request<{ revoked?: number }>('POST', '/api/auth/sessions/revoke-others'),
  changePassword: (current: string, nuevo: string) => request<unknown>('PUT', '/api/auth/password', { current, new: nuevo }),
  twoFactorSetup: (password: string) => request<{ secret: string; otpauthUrl: string }>('POST', '/api/auth/2fa/setup', { password }),
  twoFactorEnable: (code: string) => request<{ recoveryCodes: string[] }>('POST', '/api/auth/2fa/enable', { code }),
  twoFactorDisable: (password: string, code: string) => request<unknown>('POST', '/api/auth/2fa/disable', { password, code }),
  resetUserTwoFactor: (id: number) => request<unknown>('POST', `/api/users/${id}/2fa/reset`),
};

/** Lista de motivos que devuelve el servidor en `400 {error, problems}` (si los hay). */
export function problemsOf(e: unknown): string[] {
  const d = e && typeof e === 'object' ? (e as { data?: unknown }).data : null;
  const p = d && typeof d === 'object' ? (d as { problems?: unknown }).problems : null;
  return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
}
