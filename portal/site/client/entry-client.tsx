/** Entrada del navegador: datos del sitio (__ISP_SITE__) → módulo de la página → hidratación (ssrClientEntry de Rspress). */
// Estilos de serie de Rspress, en el orden de @rspress/core/dist/theme/styles/index.js (ese .js no se puede importar:
// el paquete declara sideEffects solo para *.css y el empaquetador lo descartaría).
import 'nprogress/nprogress.css';
import '@rspress/core/dist/theme/styles/vars/brand-vars.css';
import '@rspress/core/dist/theme/styles/vars/shiki-vars.css';
import '@rspress/core/dist/theme/styles/vars/code-vars.css';
import '@rspress/core/dist/theme/styles/vars/home-vars.css';
import '@rspress/core/dist/theme/styles/vars/base-vars.css';
import '@rspress/core/dist/theme/styles/base.css';
import '@rspress/core/dist/theme/styles/scrollbar.css';
import '@rspress/core/dist/theme/styles/shiki.css';
import '../../../styles/tailwind.css';
import { useMDXComponents } from '@mdx-js/react';
import {
  __setSiteData,
  BrowserRouter,
  initPageData,
  PageContext,
  removeBase,
  removeTrailingSlash,
  setCurrentPageData,
  ThemeContext,
  withBase,
} from '@rspress/core/runtime';
import { useThemeState } from '@rspress/core/theme';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { startTransition, useMemo, useState } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

declare global {
  interface Window {
    __ISP_SITE__: any;
    __ISP_MDX_RT__: unknown;
    __ISP_HYDRATION_ERRORS__?: number;
  }
}
// Runtime JSX/MDX que usan los módulos de página (/_site/p/*.js): el MISMO React que el resto de la aplicación.
window.__ISP_MDX_RT__ = { Fragment: jsxRuntime.Fragment, jsx: jsxRuntime.jsx, jsxs: jsxRuntime.jsxs, useMDXComponents };
__setSiteData(window.__ISP_SITE__);

const head = createHead();

function ClientApp({ initialPageData }: { initialPageData: unknown }) {
  const [data, setData] = useState(initialPageData);
  const [theme, setTheme] = useThemeState();
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  const pageValue = useMemo(() => ({ data, setData }), [data, setData]);
  return (
    <ThemeContext.Provider value={themeValue}>
      <PageContext.Provider value={pageValue}>
        <BrowserRouter basename={removeTrailingSlash(withBase('/'))}>
          <UnheadProvider head={head}>
            <App />
          </UnheadProvider>
        </BrowserRouter>
      </PageContext.Provider>
    </ThemeContext.Provider>
  );
}

const pathname = removeBase(window.location.pathname);
const initialPageData = await initPageData(pathname);
setCurrentPageData(pathname, initialPageData);
startTransition(() => {
  hydrateRoot(document.getElementById('__rspress_root')!, <ClientApp initialPageData={initialPageData} />, {
    onRecoverableError(error, info) {
      console.error('[hidratación]', error, info?.componentStack);
      window.__ISP_HYDRATION_ERRORS__ = (window.__ISP_HYDRATION_ERRORS__ ?? 0) + 1;
    },
  });
});
