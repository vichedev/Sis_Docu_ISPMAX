import type { ReactNode } from 'react';

/** Un paso dentro de `<Steps>`. El número lo pone el contador CSS de `<Steps>` (pseudo-elemento `before:`). */
export default function Step({ children }: { children?: ReactNode }) {
  return (
    <div className="relative pb-1 [counter-increment:isp-step] not-first:mt-8 print:break-inside-avoid before:absolute before:top-0 before:-left-9 before:flex before:size-8 before:-translate-x-1/2 before:items-center before:justify-center before:rounded-full before:bg-brand-600 before:font-display before:text-[0.85rem] before:font-bold before:text-white before:shadow-[0_4px_12px_-2px_rgb(91_75_216/0.55)] before:ring-4 before:ring-bg before:content-[counter(isp-step)] max-sm:before:-left-7 max-sm:before:size-7 max-sm:before:text-[0.8rem] [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&>p:first-child]:pt-0.5 [&_h3]:mt-0 [&_h4]:mt-0">
      {children}
    </div>
  );
}
