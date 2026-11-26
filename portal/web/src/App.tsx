import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button, EmptyState, Spinner, ToastProvider, TooltipProvider } from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { Page } from '@/components/layout/Page';
import { ApiError, RESTRICTED_EVENT, UNAUTH_EVENT, type RestrictedCode, type Role, type User } from '@/lib/api';
import { authApi, type MeInfo } from '@/lib/api.auth';
import { AuthCtx, StatsProvider, can, type AuthValue } from '@/lib/auth';
import { ROLE_LABEL, go } from '@/lib/util';
import { legacyRedirect, useRoute, type Route } from '@/routes';
import AccessBlockedPage from '@/features/auth/AccessBlockedPage';
import { ACCESS_EVENT, type AccessDetail } from '@/lib/access';
import LoginPage from '@/features/auth/LoginPage';
import AccountPage from '@/features/auth/AccountPage';
import { RestrictedPage, type RestrictedMode } from '@/features/auth/RestrictedPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import ContentWorkspace from '@/features/editor/ContentWorkspace';
import PagesListPage from '@/features/pages/PagesListPage';
import StructurePage from '@/features/structure/StructurePage';
import ImagesPage from '@/features/images/ImagesPage';
import SitePage from '@/features/system/SitePage';
import DraftsPage from '@/features/drafts/DraftsPage';
import { SiteProvider } from '@/features/system/site';
import BackupsPage from '@/features/backups/BackupsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import UsersPage from '@/features/users/UsersPage';
import AuditPage from '@/features/audit/AuditPage';
import ToursPage from '@/features/tours/ToursPage';
import TourEditor from '@/features/tours/TourEditor';

function View({ route, user }: { route: Route; user: User }) {
  const need = (min: Role, el: ReactNode) => (can(user, min) ? el : (
    <Page title="Sin permiso" width="narrow"><EmptyState icon={<ShieldCheck size={20} />} title="Esta sección no está disponible para su rol" action={<Button asChild><a href="#/">Ir al inicio</a></Button>}>
      Requiere rol {ROLE_LABEL[min].toLowerCase()}. Pida acceso a quien administre el portal.</EmptyState></Page>
  ));
  switch (route.name) {
    case 'home': return <DashboardPage />;
    case 'content': return <ContentWorkspace key="ws" id={route.id} />;
    case 'pages': return <PagesListPage />;
    case 'structure': return <StructurePage />;
    case 'images': return <ImagesPage />;
    case 'tours': return route.id ? <TourEditor key={route.id} id={route.id} /> : <ToursPage />;
    case 'drafts': return <DraftsPage />;
    case 'site': return <SitePage />;
    case 'backups': return need('admin', <BackupsPage />);
    case 'settings': return need('admin', <SettingsPage section={route.section ?? 'general'} />);
    case 'users': return need('admin', <UsersPage />);
    case 'audit': return need('admin', <AuditPage />);
    case 'account': return <AccountPage />;
    default: return <Page title="Pantalla no encontrada" width="narrow"><EmptyState title="La dirección no corresponde a ninguna sección" action={<Button asChild><a href="#/">Ir al inicio</a></Button>} /></Page>;
  }
}

function Authed({ auth, mode, onRestrictedDone }: { auth: AuthValue; mode: RestrictedMode | null; onRestrictedDone: () => void }) {
  const route = useRoute();
  // Direcciones antiguas (#/sistema, #/publicar, #/ajustes sin sección): se sustituyen sin dejar entrada en el historial.
  const to = legacyRedirect(route.path, can(auth.user, 'admin'));
  useEffect(() => { if (to && !mode) window.location.replace('#' + to); }, [to, mode]);
  // Sesión restringida: solo el paso obligatorio, sin menú ni pantallas (el servidor tampoco las serviría).
  if (mode) return <AuthCtx.Provider value={auth}><RestrictedPage mode={mode} onDone={onRestrictedDone} /></AuthCtx.Provider>;
  if (to) return null;
  return (
    <AuthCtx.Provider value={auth}>
      <StatsProvider>
        <SiteProvider>
          <AppShell route={route}><View key={route.name} route={route} user={auth.user} /></AppShell>
        </SiteProvider>
      </StatsProvider>
    </AuthCtx.Provider>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lastLogin, setLastLogin] = useState<MeInfo['lastLogin']>(null);
  const [forced, setForced] = useState<RestrictedCode | null>(null);
  const [ready, setReady] = useState(false);
  const [connError, setConnError] = useState('');
  const [blocked, setBlocked] = useState<AccessDetail | null>(null);
  const apply = useCallback((r: MeInfo) => { setUser(r.user); setLastLogin(r.lastLogin ?? null); setForced(null); }, []);
  const refresh = useCallback(async () => { apply(await authApi.me()); }, [apply]);
  useEffect(() => {
    authApi.me().then(apply).catch((e: unknown) => { setUser(null); if (e instanceof ApiError && e.status === 0) setConnError(e.message); }).finally(() => setReady(true));
    const f = () => setUser(null);
    const b = (e: Event) => setBlocked((e as CustomEvent<AccessDetail>).detail);
    const r = (e: Event) => setForced((e as CustomEvent<RestrictedCode>).detail);
    window.addEventListener(UNAUTH_EVENT, f);
    window.addEventListener(ACCESS_EVENT, b);
    window.addEventListener(RESTRICTED_EVENT, r);
    return () => { window.removeEventListener(UNAUTH_EVENT, f); window.removeEventListener(ACCESS_EVENT, b); window.removeEventListener(RESTRICTED_EVENT, r); };
  }, [apply]);
  useEffect(() => { if (!user && ready && !blocked) go('/'); }, [user, ready, blocked]);
  const mode: RestrictedMode | null = !user ? null
    : user.mustChangePassword || forced === 'PASSWORD_CHANGE_REQUIRED' ? 'password'
    : user.mustEnrollTwoFactor || forced === '2FA_ENROLL_REQUIRED' ? '2fa' : null;
  const login = async (u: User) => { try { await refresh(); } catch { setUser(u); } };
  return (
    <TooltipProvider>
      <ToastProvider>
        {blocked ? <AccessBlockedPage kind={blocked.kind} message={blocked.message} />
          : !ready ? <div className="grid min-h-screen place-items-center"><Spinner label="Iniciando…" /></div>
          : !user ? <LoginPage onLogin={login} notice={connError} />
          : <Authed auth={{ user, setUser, lastLogin, refresh }} mode={mode} onRestrictedDone={() => { void refresh().catch(() => setForced(null)); }} />}
      </ToastProvider>
    </TooltipProvider>
  );
}
