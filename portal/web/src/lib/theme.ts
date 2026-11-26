import { useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'portal-theme';
const read = (): ThemePref => { try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; } };

/** Tema claro/oscuro/del sistema. Escribe `data-theme` en <html> (lo lee la variante `dark:` de Tailwind). */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref; };
    apply();
    try { if (pref === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref); } catch { /* sin almacenamiento */ }
    if (pref !== 'system') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
  return { pref, setPref, isDark: () => document.documentElement.dataset.theme === 'dark' };
}
