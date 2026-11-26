import { useSite } from '@rspress/core/runtime';
import { cn } from '../lib/cn';

interface Social {
  icon: string | { svg: string };
  mode: string;
  content: string;
}

/** Iconos con nombre que admite `themeConfig.socialLinks` (los demás llegan como `{ svg }`). */
const NAMED: Record<string, string> = {
  instagram:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
};

/** Nombre accesible a partir del dominio del enlace. */
const nameOf = (url: string) => {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  })();
  if (host.includes('wa.me') || host.includes('whatsapp')) return 'WhatsApp';
  if (host.includes('instagram')) return 'Instagram';
  if (host.includes('tiktok')) return 'TikTok';
  return host || url;
};

/** Redes de `themeConfig.socialLinks` (el portal puede cambiar el número de WhatsApp: ver branding.mjs). */
export function SocialLinks({ className }: { className?: string }) {
  const { site } = useSite();
  const links = ((site.themeConfig as { socialLinks?: Social[] }).socialLinks ?? []).filter(l => l.mode === 'link');
  if (!links.length) return null;
  return (
    <div className={cn('items-center gap-0.5', className)}>
      {links.map(l => {
        const svg = typeof l.icon === 'string' ? NAMED[l.icon] : l.icon?.svg;
        return (
          <a
            key={l.content}
            href={l.content}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={nameOf(l.content)}
            title={nameOf(l.content)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-bg-mute hover:text-brand"
            // Iconos SVG fijos de la configuración del sitio (no es contenido de usuarios).
            dangerouslySetInnerHTML={{ __html: svg ?? '' }}
          />
        );
      })}
    </div>
  );
}
