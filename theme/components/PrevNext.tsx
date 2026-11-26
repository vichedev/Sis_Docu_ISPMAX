import { useI18n } from '@rspress/core/runtime';
import { Link, usePrevNextPage } from '@rspress/core/theme-original';
import { cn } from '../lib/cn';
import { splitEmoji } from '../lib/sections';
import { Icon } from './Icon';

/** Anterior / Siguiente según el orden del menú lateral (hook de Rspress). */
export function PrevNext() {
  const { prevPage, nextPage } = usePrevNextPage();
  const t = useI18n();
  if (!prevPage && !nextPage) return null;
  const card =
    'group flex min-h-18 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-xs transition-[border-color,box-shadow] hover:border-brand/45 hover:shadow-md';
  const arrow = 'size-4.5 shrink-0 text-fg-faint transition-[color,transform] group-hover:text-brand';
  return (
    <nav aria-label="Páginas anterior y siguiente" className="mt-10 grid gap-3 sm:grid-cols-2 print:hidden">
      {prevPage ? (
        <Link href={prevPage.link} className={card} rel="prev">
          <Icon name="arrowLeft" className={cn(arrow, 'group-hover:-translate-x-0.5')} strokeWidth={2} />
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-fg-subtle">{t('prevPageText')}</span>
            <span className="font-medium text-fg group-hover:text-brand">{splitEmoji(prevPage.text)[1]}</span>
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {nextPage ? (
        <Link href={nextPage.link} className={cn(card, 'justify-end text-right')} rel="next">
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-fg-subtle">{t('nextPageText')}</span>
            <span className="font-medium text-fg group-hover:text-brand">{splitEmoji(nextPage.text)[1]}</span>
          </span>
          <Icon name="arrowRight" className={cn(arrow, 'group-hover:translate-x-0.5')} strokeWidth={2} />
        </Link>
      ) : null}
    </nav>
  );
}
