import { ThemeContext } from '@rspress/core/runtime';
import { useContext } from 'react';
import { Icon } from './Icon';
import { iconButtonClass } from './ui';

/**
 * Claro / oscuro. El estado lo guarda Rspress (`useThemeState`, localStorage `rspress-theme-appearance`) y su
 * script en línea aplica la clase `dark` a <html> antes de pintar: no hay parpadeo. Los iconos se eligen con CSS
 * (`dark:`), así el HTML estático y el del navegador coinciden.
 */
export function ThemeToggle() {
  const { setTheme } = useContext(ThemeContext) as { setTheme?: (t: 'light' | 'dark') => void };
  const toggle = () => setTheme?.(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  return (
    <button type="button" onClick={toggle} aria-label="Cambiar entre modo claro y oscuro" title="Modo claro / oscuro" className={iconButtonClass}>
      {/* Sol en oscuro (pasar a claro), luna en claro (pasar a oscuro). */}
      <span className="hidden dark:inline">
        <Icon name="sun" className="size-[19px]" />
      </span>
      <span className="dark:hidden">
        <Icon name="moon" className="size-[18px]" />
      </span>
    </button>
  );
}
