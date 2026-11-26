import { MDXProvider } from '@mdx-js/react';
import { Content, useFrontmatter, usePage } from '@rspress/core/runtime';
import { useScrollAfterNav } from '@rspress/core/theme-original';
import { useMemo, useRef } from 'react';
import { BackToTop } from '../components/BackToTop';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { DocMeta } from '../components/DocMeta';
import { Lightbox } from '../components/Lightbox';
import { PrevNext } from '../components/PrevNext';
import { Sidebar } from '../components/Sidebar';
import { MobileTocBar, Toc } from '../components/Toc';
import { cn } from '../lib/cn';
import { getCustomMDXComponent, H1 } from '../mdx';
import { FigureCounter } from '../lib/figures';
import { Callout } from '../mdx/Callout';

/** Contenido MDX de la página con los componentes del tema (también lo usa la portada). */
export function DocContent() {
  const { page } = usePage();
  const components = useMemo(() => ({ ...getCustomMDXComponent(), $$$callout$$$: Callout }), []);
  // Contador nuevo en cada render: la primera <Figure> de la página se carga con prioridad (ver lib/figures.ts).
  const counter = { n: 0 };
  return (
    <FigureCounter.Provider value={counter}>
    <MDXProvider components={components}>
      {/* Título de respaldo si la página no trae un `# Título`. */}
      {!page.headingTitle && page.title && page.pageType !== 'home' ? <H1>{page.title}</H1> : null}
      <Content />
    </MDXProvider>
    </FigureCounter.Provider>
  );
}

/**
 * Página de documento: menú lateral (lg+), documento centrado, índice "En esta página" (xl+; debajo de 1280 px es
 * una barra fija con desplegable), migas de pan, pie de verificación, anterior/siguiente y "volver arriba".
 * Frontmatter que respeta (como Rspress): `sidebar: false`, `outline: false`, `footer: false`, `pageType: doc-wide`.
 */
export function DocLayout() {
  const { page } = usePage();
  const { frontmatter } = useFrontmatter();
  const article = useRef<HTMLElement>(null);
  useScrollAfterNav();

  const showSidebar = frontmatter.sidebar !== false;
  const showToc = frontmatter.outline !== false && (page.toc?.length ?? 0) > 0;
  const showFooter = frontmatter.footer !== false;
  const wide = page.pageType === 'doc-wide';
  const aside = 'sticky top-topbar h-[calc(100dvh-var(--spacing-topbar))] shrink-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] print:hidden';

  return (
    <div className="mx-auto flex w-full max-w-shell">
      {showSidebar ? (
        <aside aria-label="Menú del manual" data-scrollbox className={cn(aside, 'hidden w-sidebar border-r border-line px-3 pt-7 pb-10 lg:block')}>
          <Sidebar />
        </aside>
      ) : null}

      <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {showToc ? <MobileTocBar /> : null}
        <div className="px-4 pt-7 pb-20 sm:px-8 lg:px-12 lg:pt-9">
          <div className={cn('mx-auto', wide ? 'max-w-none' : 'max-w-doc')}>
            <Breadcrumbs />
            <article ref={article} data-doc className="text-[16px] leading-[1.75] max-sm:text-[15.5px]">
              <DocContent />
            </article>
            {showFooter ? (
              <>
                <DocMeta />
                <PrevNext />
              </>
            ) : null}
          </div>
        </div>
      </main>

      {showToc ? (
        <aside aria-label="En esta página" data-scrollbox className={cn(aside, 'hidden w-toc py-10 pr-5 pl-2 xl:block')}>
          <Toc />
        </aside>
      ) : null}
      <Lightbox root={article} />
      <BackToTop />
    </div>
  );
}
