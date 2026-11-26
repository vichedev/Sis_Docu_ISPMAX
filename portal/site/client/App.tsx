/**
 * Raíz de la aplicación del manual dinámico: lo mismo que App.js de Rspress (Layout del tema + componentes globales
 * de interfaz) más el proveedor MDX con los componentes globales del contenido (`markdown.globalComponents` de
 * rspress.config.ts: en el build estático se importan en cada .mdx; aquí llegan por contexto).
 */
import { MDXProvider } from '@mdx-js/react';
import { consumeCachedPageData, initPageData, PageContext, setCurrentPageData, useLocation } from '@rspress/core/runtime';
import { Layout } from '@rspress/core/theme';
import { useContext, useLayoutEffect } from 'react';
import Badge from '../../../src/components/Badge';
import Callout from '../../../src/components/Callout';
import Card from '../../../src/components/Card';
import Cards from '../../../src/components/Cards';
import FigGrid from '../../../src/components/FigGrid';
import FigRow from '../../../src/components/FigRow';
import Figure from '../../../src/components/Figure';
import Kicker from '../../../src/components/Kicker';
import Lead from '../../../src/components/Lead';
import LegacyHashRedirect from '../../../src/components/LegacyHashRedirect';
import SearchTerms from '../../../src/components/SearchTerms';
import Step from '../../../src/components/Step';
import Steps from '../../../src/components/Steps';
import Tour from '../../../src/components/Tour';

/** Mismos nombres que da `remarkBuiltin` de Rspress (nombre del archivo con mayúscula inicial). */
export const GLOBAL_COMPONENTS = { Figure, Cards, Card, Steps, Step, Kicker, Lead, FigRow, FigGrid, Badge, Callout, SearchTerms, Tour };

export function App() {
  const { setData: setPageData, data } = useContext(PageContext);
  const { pathname, search } = useLocation();
  useLayoutEffect(() => {
    const cached = consumeCachedPageData(pathname);
    if (cached) {
      setPageData?.(cached);
      return;
    }
    let alive = true;
    initPageData(pathname)
      .then(d => {
        if (!alive) return;
        setCurrentPageData(pathname, d);
        setPageData?.(d);
      })
      .catch(e => console.log(e));
    return () => {
      alive = false;
    };
  }, [pathname, setPageData]);
  if (!data) return null;
  const hide = data.frontmatter?.globalUIComponents === false || new URLSearchParams(search).get('globalUIComponents') === '0';
  // Misma forma de hijos que App.js de Rspress ([aviso LLM (false), Layout, [componentes globales]]): los `useId` del
  // tema salen iguales que en el HTML estático.
  return (
    <MDXProvider components={GLOBAL_COMPONENTS}>
      {false}
      <Layout />
      {!hide ? [<LegacyHashRedirect key={0} />] : null}
    </MDXProvider>
  );
}
