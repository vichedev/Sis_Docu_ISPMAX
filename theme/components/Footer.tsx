import { isExternalUrl, normalizeImagePath, useNav, useSite } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme-original';
import { cn } from '../lib/cn';
import { splitEmoji } from '../lib/sections';
import { Icon } from './Icon';
import { SocialLinks } from './SocialLinks';
import type { NavItem } from './TopBar';
import { Eyebrow, buttonClass } from './ui';

export interface Contacto {
  marca?: string;
  descripcion?: string;
  telefono?: { texto: string; href: string };
  correo?: { texto: string; href: string };
  whatsapp?: string;
  copyright?: string;
}

export const useContacto = () => {
  const { site } = useSite();
  return ((site.themeConfig as { contacto?: Contacto }).contacto ?? {}) as Contacto;
};

const linkClass = 'text-fg-muted transition-colors hover:text-brand';

/**
 * Franja de ayuda ("¿Necesita ayuda?"): WhatsApp, teléfono y correo de `themeConfig.contacto`.
 * Va en la portada y en la página 404.
 */
export function SupportBand({ className }: { className?: string }) {
  const c = useContacto();
  if (!c.whatsapp && !c.telefono && !c.correo) return null;
  return (
    <section
      aria-labelledby="ayuda-titulo"
      className={cn(
        'relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-8 shadow-xs sm:px-10 sm:py-10 print:hidden',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(56_189_248/0.18),transparent)] dark:bg-[radial-gradient(closest-side,rgb(56_189_248/0.12),transparent)]"
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-[0_8px_20px_-8px_rgb(91_75_216/0.7)]">
            <Icon name="headset" className="size-6" />
          </span>
          <div>
            <h2 id="ayuda-titulo" className="font-display text-xl font-bold tracking-[-0.02em] text-fg">
              ¿No encuentra lo que busca?
            </h2>
            <p className="mt-1 max-w-xl text-[15px] text-fg-muted">
              El equipo de soporte de ISPMAX le ayuda por WhatsApp, teléfono o correo. Indique la pantalla y el mensaje que ve.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {c.whatsapp ? (
            <a href={c.whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'md')}>
              <Icon name="chat" className="size-4.5" strokeWidth={2} />
              Escribir por WhatsApp
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          ) : null}
          {c.telefono ? (
            <a href={c.telefono.href} className={buttonClass('secondary', 'md')}>
              <Icon name="phone" className="size-4" strokeWidth={2} />
              {c.telefono.texto}
            </a>
          ) : null}
          {c.correo ? (
            <a href={c.correo.href} className={buttonClass('ghost', 'md')}>
              <Icon name="mail" className="size-4" strokeWidth={2} />
              {c.correo.texto}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Pie del sitio. Datos: `themeConfig.contacto` y el menú de rspress.config.ts (el portal sustituye título y WhatsApp). */
export function Footer() {
  const { site } = useSite();
  const c = useContacto();
  const nav = useNav() as NavItem[];
  const secciones = nav.filter(i => i.link && !i.items && !isExternalUrl(i.link));
  const referencia = nav.find(i => i.items);

  return (
    <footer className="border-t border-line bg-bg-soft print:hidden">
      <div className="mx-auto grid max-w-shell gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg">
            {site.logo ? (
              <img src={normalizeImagePath(String(site.logo))} alt="" width={54} height={28} className="h-7 w-auto" loading="lazy" decoding="async" data-nozoom />
            ) : null}
            <span className="font-display text-[15px] font-bold tracking-[-0.02em] text-fg">{c.marca || site.title}</span>
          </Link>
          {c.descripcion ? <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-fg-muted">{c.descripcion}</p> : null}
          <SocialLinks className="mt-4 -ml-2 flex" />
        </div>

        {secciones.length ? (
          <nav aria-labelledby="pie-secciones">
            <Eyebrow id="pie-secciones" className="mb-3">
              Secciones
            </Eyebrow>
            <ul className="space-y-2 text-sm">
              {secciones.map(i => (
                <li key={i.text}>
                  <Link href={i.link!} className={linkClass}>
                    {i.text}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {referencia?.items?.length ? (
          <nav aria-labelledby="pie-referencia">
            <Eyebrow id="pie-referencia" className="mb-3">
              {referencia.text}
            </Eyebrow>
            <ul className="space-y-2 text-sm">
              {referencia.items.map(i => (
                <li key={i.text}>
                  <Link href={i.link!} className={linkClass}>
                    {splitEmoji(i.text)[1]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div>
          <Eyebrow as="h2" className="mb-3">
            Contacto
          </Eyebrow>
          <ul className="space-y-2.5 text-sm">
            {c.whatsapp ? (
              <li>
                <a className={cn(linkClass, 'inline-flex items-center gap-2')} href={c.whatsapp} target="_blank" rel="noopener noreferrer">
                  <Icon name="chat" className="size-4 text-fg-subtle" />
                  Soporte por WhatsApp
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              </li>
            ) : null}
            {c.telefono ? (
              <li>
                <a className={cn(linkClass, 'inline-flex items-center gap-2')} href={c.telefono.href}>
                  <Icon name="phone" className="size-4 text-fg-subtle" />
                  {c.telefono.texto}
                </a>
              </li>
            ) : null}
            {c.correo ? (
              <li>
                <a className={cn(linkClass, 'inline-flex items-center gap-2 break-all')} href={c.correo.href}>
                  <Icon name="mail" className="size-4 shrink-0 text-fg-subtle" />
                  {c.correo.texto}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-fg-subtle sm:px-6 lg:px-8">
          <p>{c.copyright}</p>
          <p className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-6 rounded-full bg-linear-to-r from-brand-600 to-accent-400" />
            Manual de usuario de ISPMAX
          </p>
        </div>
      </div>
    </footer>
  );
}
