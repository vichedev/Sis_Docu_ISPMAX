/*
 * Sesión restringida: el servidor exige cambiar la contraseña o activar la verificación en dos pasos antes de dejar
 * usar el panel. Pantalla completa, sin menú; al completar el paso obligatorio el panel continúa solo.
 */
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Logo, ThemeToggle } from './AuthShell';
import { PasswordForm } from './PasswordForm';
import { TwoFactorEnroll } from './TwoFactorEnroll';

export type RestrictedMode = 'password' | '2fa';

export function RestrictedPage({ mode, onDone }: { mode: RestrictedMode; onDone: () => void }) {
  const { user, setUser } = useAuth();
  const logout = async () => { try { await api.logout(); } catch { /* ya sin sesión */ } setUser(null); };
  const isPw = mode === 'password';
  return (
    <div className="flex min-h-screen flex-col bg-side">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-bg px-6 py-3 max-sm:px-4">
        <Logo className="w-[104px]" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-3 max-sm:hidden">Sesión de <b className="font-medium text-ink-2">{user.display_name || user.username}</b></span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => void logout()}><LogOut size={14} /> Cerrar sesión</Button>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="grid flex-1 place-items-start px-6 py-10 focus:outline-none max-sm:px-4 max-sm:py-6">
        <section aria-labelledby="restringida-t" className="mx-auto w-full max-w-[620px] rounded-lg border border-line bg-bg p-8 max-sm:p-5">
          <p className="m-0 mb-1 text-sm font-medium text-accent-ink">Paso obligatorio</p>
          <h1 id="restringida-t" className="m-0 text-2xl font-semibold">{isPw ? 'Cambie su contraseña para continuar' : 'Active la verificación en dos pasos para continuar'}</h1>
          <p className="mb-6 mt-2 text-ink-2">
            {isPw
              ? 'Su contraseña actual no cumple la política de seguridad del portal, o quien administra el portal la restableció. Elija una nueva para seguir usando el panel; es un paso único.'
              : 'Quien administra el portal exige la verificación en dos pasos a todas las cuentas de administrador. Configúrela ahora con una aplicación de códigos en su teléfono; son unos minutos y se hace una sola vez.'}
          </p>
          {isPw
            ? <PasswordForm username={user.username} onDone={onDone} autoFocus submitLabel="Guardar y continuar" />
            : <TwoFactorEnroll username={user.username} onDone={onDone} />}
        </section>
      </main>
    </div>
  );
}
