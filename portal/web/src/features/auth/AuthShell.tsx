/*
 * Marco de las pantallas de acceso (inicio de sesión y verificación): dos zonas en escritorio
 * (panel de marca sobrio + formulario) y una sola columna en móvil. Solo tokens del sistema de diseño.
 */
import type { ReactNode } from 'react';
import { ExternalLink, KeyRound, Moon, ScrollText, ShieldCheck, Sun, TimerReset } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { siteHref } from '@/lib/siteHref';

export function Logo({ className = 'w-[150px]' }: { className?: string }) {
  const base = import.meta.env.BASE_URL;
  return (
    <>
      <img src={`${base}logo.webp`} alt="ISPMAX" width={168} height={88} className={`h-auto dark:hidden ${className}`} />
      <img src={`${base}logo-oscuro.webp`} alt="ISPMAX" width={168} height={88} className={`hidden h-auto dark:block ${className}`} />
    </>
  );
}

export function ThemeToggle() {
  const { setPref, isDark, pref } = useTheme();
  const dark = pref === 'dark' || (pref === 'system' && isDark());
  return <IconButton label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} icon={dark ? <Sun size={18} /> : <Moon size={18} />} onClick={() => setPref(dark ? 'light' : 'dark')} />;
}

/** Anillos de cobertura: motivo gráfico discreto del panel de marca (decorativo). */
function Rings() {
  return (
    <svg aria-hidden="true" viewBox="0 0 520 520" className="pointer-events-none absolute -bottom-48 -right-64 size-[560px] text-line-strong opacity-50" fill="none" stroke="currentColor" strokeWidth="1">
      {[60, 120, 180, 240, 300, 360].map((r) => <circle key={r} cx="260" cy="260" r={r} strokeDasharray={r % 120 === 0 ? undefined : '2 6'} />)}
      <line x1="260" y1="0" x2="260" y2="520" /><line x1="0" y1="260" x2="520" y2="260" />
      <circle cx="260" cy="260" r="5" className="fill-accent stroke-none" />
    </svg>
  );
}

const POINTS = [
  { icon: ShieldCheck, title: 'Acceso verificado', text: 'Puede añadir un segundo paso con una aplicación de códigos.' },
  { icon: TimerReset, title: 'Sesiones que caducan', text: 'La sesión se cierra sola tras un tiempo sin actividad.' },
  { icon: ScrollText, title: 'Todo queda registrado', text: 'Cada acceso y cada cambio se anota en la auditoría.' },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[minmax(420px,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-side lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <Rings />
        <Logo className="w-[168px]" />
        <div className="relative max-w-[440px]">
          <p className="m-0 mb-3 text-sm font-medium text-accent-ink">Portal del manual de ISPMAX</p>
          <h2 className="m-0 text-[28px] font-semibold leading-[1.2] tracking-[-0.01em] text-ink">La documentación se edita aquí. Solo entra quien debe.</h2>
          <ul className="m-0 mt-9 flex list-none flex-col gap-5 p-0">
            {POINTS.map(({ icon: I, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-md border border-accent-line bg-accent-soft text-accent-ink"><I size={18} /></span>
                <span className="flex flex-col"><strong className="text-base font-semibold">{title}</strong><span className="text-ink-2">{text}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative m-0 flex items-center gap-1.5 text-sm text-ink-3"><KeyRound size={14} aria-hidden="true" /> Acceso con contraseña y sesión protegida</p>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 pt-5 max-sm:px-4">
          <div className="lg:invisible"><Logo className="w-[120px]" /></div>
          <ThemeToggle />
        </header>
        <main className="grid flex-1 place-items-center px-6 py-8 max-sm:px-4">{children}</main>
        <footer className="px-6 pb-6 text-center text-sm text-ink-3 max-sm:px-4">
          <a href={siteHref('', '/')} rel="noreferrer" className="inline-flex items-center gap-1 font-medium">Ir al manual público<ExternalLink size={13} aria-hidden="true" /></a>
        </footer>
      </div>
    </div>
  );
}
