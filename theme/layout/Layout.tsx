import { Content, useFrontmatter, usePage } from '@rspress/core/runtime';
import { useScrollReset } from '@rspress/core/theme-original';
import { Footer } from '../components/Footer';
import { SearchPalette } from '../components/SearchPalette';
import { TopBar } from '../components/TopBar';
import { HeadTags } from '../seo/HeadTags';
import { DocLayout } from './DocLayout';
import { HomeLayout } from './HomeLayout';
import { NotFoundLayout } from './NotFoundLayout';
import { ShellProvider } from './shell';

/** Enlace "Saltar al contenido" (teclado y lectores de pantalla): primer elemento enfocable de la página. */
function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only z-[80] rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Saltar al contenido
    </a>
  );
}

/** Layout raíz: Rspress lo monta para cada página y elige el contenido según `pageType`. */
export function Layout() {
  const { page } = usePage();
  const { frontmatter } = useFrontmatter();
  useScrollReset();

  const type = page.pageType;
  if (type === 'custom' || type === 'blank') {
    return (
      <>
        <HeadTags />
        <Content />
      </>
    );
  }

  return (
    <ShellProvider>
      <HeadTags />
      <div className="flex min-h-dvh flex-col bg-bg font-sans text-fg antialiased print:bg-white">
        <SkipLink />
        {frontmatter.navbar !== false ? <TopBar /> : null}
        <div className="flex-1">{type === 'home' ? <HomeLayout /> : type === '404' ? <NotFoundLayout /> : <DocLayout />}</div>
        <Footer />
      </div>
      <SearchPalette />
    </ShellProvider>
  );
}
