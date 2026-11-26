import { Link } from '@rspress/core/theme';
import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  icon?: string;
  href?: string;
  children?: ReactNode;
}

const base = 'relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-xs print:break-inside-avoid print:shadow-none';

/** Tarjeta informativa — equivale a `.info-card` / `.hero-card` del original. Con `href`, toda la tarjeta enlaza. */
export default function Card({ title, icon, href, children }: CardProps) {
  const body = (
    <>
      {icon ? (
        <span className="mb-3.5 flex size-10 items-center justify-center rounded-xl bg-brand-tint text-[1.3rem] leading-none" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {title ? <span className="mb-1.5 block font-display text-[15.5px] font-semibold tracking-[-0.012em] text-fg">{title}</span> : null}
      <div className="text-sm leading-[1.65] text-fg-muted [&_li]:my-0.5 [&_p]:my-1.5 [&_p]:text-sm [&_ul]:mt-1.5 [&_ul]:mb-0 [&_ul]:pl-4.5 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        className={`${base} group text-inherit no-underline transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand/45 hover:shadow-lg`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute top-5 right-5 size-4 text-fg-subtle transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" aria-hidden="true">
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
        {body}
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </Link>
    );
  }

  return <div className={base}>{body}</div>;
}
