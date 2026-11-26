/**
 * Prose: tipografía de lectura para la vista previa del MDX (títulos, listas, tablas, código).
 *   <Prose html={renderPreview(mdx)} />  — el HTML llega ya escapado desde lib/mdx.ts.
 */
import { cn } from '../../lib/cn';

export function Prose({ html, className }: { html: string; className?: string }) {
  return (
    <article
      className={cn(
        'max-w-[74ch] text-[15px] leading-[1.65] text-ink',
        '[&_h1]:mb-2 [&_h1]:mt-7 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-7 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[15.5px] [&_h3]:font-semibold [&>:first-child]:mt-0',
        '[&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li+li]:mt-1',
        '[&_table]:mb-4 [&_table]:border-collapse [&_table]:text-[13.5px] [&_td]:border [&_td]:border-line [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-line [&_th]:bg-subtle [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left',
        '[&_pre]:mb-4 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-line [&_pre]:bg-subtle [&_pre]:p-3 [&_pre]:text-[12.5px] [&_code]:rounded-sm [&_code]:bg-subtle [&_code]:px-1 [&_code]:text-[0.86em] [&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_blockquote]:mb-3 [&_blockquote]:border-l-[3px] [&_blockquote]:border-line-strong [&_blockquote]:pl-3.5 [&_blockquote]:text-ink-2',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
