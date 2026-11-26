/**
 * Entrada SSR (se compila una vez por despliegue con Vite; el servidor la importa): pinta la aplicación de una página
 * con el tema real. Equivale a ssrServerEntry.js + renderPage.js de Rspress, pero por petición y con datos de la BD.
 */
import { MDXProvider, useMDXComponents } from '@mdx-js/react';
import { PageContext, removeTrailingSlash, StaticRouter, ThemeContext, withBase } from '@rspress/core/runtime';
import { createHead, transformHtmlTemplate, UnheadProvider } from '@unhead/react/server';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { renderToString } from 'react-dom/server';
import { App } from './App';

export {
  __clearPages,
  __registerPage,
  __setSiteData,
  buildPageData,
  notFoundPageData,
  pageModuleUrl,
  pathnameToRouteService,
} from '@rspress/core/runtime';
export { MDXProvider };

/** Runtime con el que el servidor evalúa el MDX compilado (mismo React que este bundle). */
export const mdxRuntime = { Fragment, jsx, jsxs, useMDXComponents };

/** Pinta la aplicación para `routePath` (sin base) con los datos de página ya resueltos → { appHtml, head }. */
export function renderApp(routePath: string, pageData: unknown) {
  const head = createHead();
  const appHtml = renderToString(
    <ThemeContext.Provider value={{ theme: 'light' }}>
      <PageContext.Provider value={{ data: pageData }}>
        <StaticRouter location={withBase(routePath)} basename={removeTrailingSlash(withBase('/'))}>
          <UnheadProvider value={head}>
            <App />
          </UnheadProvider>
        </StaticRouter>
      </PageContext.Provider>
    </ThemeContext.Provider>,
  );
  return { appHtml, head };
}

/** Documento final: plantilla + etiquetas del <head> que emitió el tema (unhead). */
export async function renderDocument(template: string, head: ReturnType<typeof createHead>) {
  return transformHtmlTemplate(head, template);
}
