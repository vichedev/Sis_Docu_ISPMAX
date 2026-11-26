/**
 * Elementos del MDX con Tailwind. `getCustomMDXComponent` sustituye al de Rspress (mismo nombre: también lo usa
 * cualquier pieza del tema original que lo pida).
 *
 * Notas:
 *  · Los encabezados h2-h4 llevan `rp-toc-include` (lo usan los hooks de índice de Rspress) y Rspress les inserta
 *    delante un `<a class="rp-header-anchor">#</a>`: `A` lo convierte en un icono de enlace (visible al pasar el
 *    ratón) que además copia la dirección de la sección.
 *  · Los enlaces del contenido traen `target="_blank"` de src/plugins/rehypeLinksNewTab.ts: llevan un icono discreto
 *    y un texto para lectores de pantalla ("se abre en otra pestaña"); al imprimir se añade la dirección.
 *  · Tablas: contenedor con desplazamiento horizontal, sombras en los bordes cuando hay más contenido y foco de
 *    teclado solo si de verdad se desplaza.
 */
import { normalizeImagePath } from '@rspress/core/runtime';
import { CodeBlock, Link } from '@rspress/core/theme-original';
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, JSX, ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { cn } from '../lib/cn';

type P<T extends keyof JSX.IntrinsicElements> = ComponentProps<T>;

const heading = 'group relative font-display text-fg print:break-after-avoid';

export const H1 = ({ className, ...rest }: P<'h1'>) => (
  <h1
    className={cn(heading, 'mb-3 text-[2.45rem] leading-[1.1] font-bold tracking-[-0.032em] text-balance max-sm:text-[1.9rem]', className)}
    {...rest}
  />
);
export const H2 = ({ className, ...rest }: P<'h2'>) => (
  <h2
    className={cn(
      heading,
      'rp-toc-include mt-14 border-t border-line-soft pt-8 text-[1.55rem] leading-snug font-semibold tracking-[-0.024em] max-sm:mt-11 max-sm:pt-6 max-sm:text-[1.3rem]',
      className,
    )}
    {...rest}
  />
);
export const H3 = ({ className, ...rest }: P<'h3'>) => (
  <h3 className={cn(heading, 'rp-toc-include mt-9 text-[1.2rem] leading-snug font-semibold tracking-[-0.018em]', className)} {...rest} />
);
export const H4 = ({ className, ...rest }: P<'h4'>) => (
  <h4 className={cn(heading, 'rp-toc-include mt-7 text-[1.03rem] font-semibold tracking-[-0.01em]', className)} {...rest} />
);
const H5 = ({ className, ...rest }: P<'h5'>) => <h5 className={cn(heading, 'mt-6 text-base font-semibold', className)} {...rest} />;
const H6 = ({ className, ...rest }: P<'h6'>) => <h6 className={cn(heading, 'mt-6 text-sm font-semibold', className)} {...rest} />;

/** Ancla del encabezado: icono a la izquierda; al pulsarlo copia la dirección de la sección y lo confirma. */
function HeadingAnchor({ href, ...rest }: P<'a'>) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  // El salto al ancla y el cambio de dirección siguen siendo los del navegador; además se copia la dirección.
  const onClick = () => {
    const url = new URL(href ?? '', window.location.href).href;
    navigator.clipboard?.writeText(url).then(
      () => setCopied(true),
      () => {},
    );
  };
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        'absolute top-[0.1em] -left-7 inline-flex size-6 items-center justify-center rounded-md text-fg-subtle no-underline transition-opacity hover:bg-bg-mute hover:text-brand max-sm:hidden print:hidden',
        copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        // El h2 lleva filete y relleno superior: el icono se alinea con el texto, no con el filete.
        '[h2>&]:top-[calc(2rem+0.15em)]',
      )}
      title="Copiar el enlace a esta sección"
      {...rest}
      // Rspress lo marca aria-hidden: tampoco debe recibir el foco con el tabulador (el índice ya da esos enlaces).
      tabIndex={-1}
    >
      <Icon name={copied ? 'check' : 'link'} className="size-3.5" strokeWidth={2.25} />
      {copied ? (
        <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-md bg-fg px-2 py-1 font-sans text-[11px] font-semibold whitespace-nowrap text-bg shadow-lg">
          Enlace copiado
        </span>
      ) : null}
    </a>
  );
}

export const A = ({ className, href = '', children, ...rest }: P<'a'>) => {
  if (className?.includes('rp-header-anchor')) return <HeadingAnchor href={href} {...rest} />;
  const newTab = rest.target === '_blank';
  return (
    <Link
      href={href}
      className={cn(
        'font-medium text-brand underline decoration-brand/30 decoration-[1.5px] underline-offset-[3px] transition-colors hover:decoration-brand',
        newTab && "print:after:text-[0.85em] print:after:font-normal print:after:text-fg-subtle print:after:content-['_('_attr(href)_')']",
        className,
      )}
      {...rest}
    >
      {children}
      {newTab ? (
        <>
          <Icon name="external" className="ml-0.5 inline size-[0.72em] -translate-y-[0.08em] align-baseline opacity-55 print:hidden" strokeWidth={2.4} />
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </>
      ) : null}
    </Link>
  );
};

const Pp = ({ className, ...rest }: P<'p'>) => <p className={cn('my-4 text-fg-muted', className)} {...rest} />;
const Strong = ({ className, ...rest }: P<'strong'>) => <strong className={cn('font-semibold text-fg', className)} {...rest} />;
const Em = ({ className, ...rest }: P<'em'>) => <em className={cn('text-fg', className)} {...rest} />;
const Ul = ({ className, ...rest }: P<'ul'>) => (
  <ul className={cn('my-4 list-disc space-y-2 pl-6 text-fg-muted marker:text-brand/55', className)} {...rest} />
);
const Ol = ({ className, ...rest }: P<'ol'>) => (
  <ol className={cn('my-4 list-decimal space-y-2 pl-6 text-fg-muted marker:font-semibold marker:text-brand', className)} {...rest} />
);
const Li = ({ className, ...rest }: P<'li'>) => (
  <li className={cn('pl-1.5 [&>ol]:my-2 [&>p]:my-2 [&>ul]:my-2', className)} {...rest} />
);
const Blockquote = ({ className, ...rest }: P<'blockquote'>) => (
  <blockquote
    className={cn('my-6 rounded-r-xl border-l-[3px] border-brand/50 bg-bg-soft px-5 py-1 text-fg-muted [&>p]:my-3 print:break-inside-avoid', className)}
    {...rest}
  />
);
const Hr = ({ className, ...rest }: P<'hr'>) => <hr className={cn('my-12 border-line', className)} {...rest} />;

/** Código en línea. Dentro de un bloque (`pre`) el contenedor anula este estilo. */
const Code = ({ className, ...rest }: P<'code'>) => (
  <code
    className={cn(
      'rounded-md border border-line bg-bg-soft px-[0.35em] py-[0.1em] font-mono text-[0.85em] text-fg [overflow-wrap:anywhere]',
      className,
    )}
    {...rest}
  />
);

/** Bloques de código: los sigue pintando Rspress (Shiki + botón copiar); aquí solo se encuadran. */
type PreProps = P<'pre'> & {
  title?: string;
  lang?: string;
  wrapCode?: boolean;
  lineNumbers?: boolean;
  fold?: boolean;
  height?: number;
  containerElementClassName?: string;
  codeButtonGroupProps?: unknown;
};
const Pre = ({ title, lang, wrapCode, lineNumbers, fold, height, containerElementClassName, codeButtonGroupProps, ...rest }: PreProps) => (
  <div className="my-6 overflow-hidden rounded-xl border border-line text-[13.5px] [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit print:break-inside-avoid">
    <CodeBlock
      title={title}
      lang={lang}
      wrapCode={wrapCode}
      lineNumbers={lineNumbers}
      fold={fold}
      height={height}
      containerElementClassName={containerElementClassName}
      // biome-ignore lint: se pasa tal cual al componente de Rspress
      codeButtonGroupProps={codeButtonGroupProps as never}
    >
      <pre {...rest} data-lang={lang} data-title={title} />
    </CodeBlock>
  </div>
);

/**
 * Tabla con desplazamiento horizontal accesible: sombras en el borde que tiene más contenido y, solo si se desplaza,
 * foco de teclado (flechas) y nombre accesible. Las tablas de 3+ columnas tienen un ancho mínimo legible.
 */
function Table({ className, ...rest }: P<'table'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<[boolean, boolean]>([false, false]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const l = el.scrollLeft > 2;
      const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setEdges(prev => (prev[0] === l && prev[1] === r ? prev : [l, r]));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);
  const scrolls = edges[0] || edges[1];
  const shade = 'pointer-events-none absolute inset-y-px w-8 transition-opacity duration-200 from-[rgb(20_23_38/0.1)] dark:from-black/45';
  return (
    <div className="relative my-7 print:break-inside-auto">
      <div
        ref={ref}
        className="relative overflow-x-auto rounded-xl border border-line bg-surface [scrollbar-width:thin]"
        {...(scrolls ? { tabIndex: 0, role: 'group', 'aria-label': 'Tabla desplazable en horizontal' } : {})}
      >
        <table className={cn('w-full border-collapse text-left text-[14px] leading-[1.6] has-[th:nth-child(3)]:min-w-[36rem]', className)} {...rest} />
      </div>
      <div aria-hidden="true" className={cn(shade, 'left-px rounded-l-xl bg-linear-to-r', edges[0] ? 'opacity-100' : 'opacity-0')} />
      <div aria-hidden="true" className={cn(shade, 'right-px rounded-r-xl bg-linear-to-l', edges[1] ? 'opacity-100' : 'opacity-0')} />
    </div>
  );
}
const Th = ({ className, ...rest }: P<'th'>) => (
  <th
    className={cn('border-b border-line bg-bg-soft px-4 py-2.5 align-bottom font-display text-[12.5px] font-semibold tracking-[0.01em] text-fg', className)}
    {...rest}
  />
);
const Td = ({ className, ...rest }: P<'td'>) => (
  <td className={cn('border-t border-line-soft px-4 py-2.5 align-top text-fg-muted [&_code]:whitespace-nowrap', className)} {...rest} />
);
const Tr = ({ className, ...rest }: P<'tr'>) => (
  <tr className={cn('transition-colors hover:bg-bg-soft/70 print:break-inside-avoid [&:first-child>td]:border-t-0', className)} {...rest} />
);

const Img = ({ className, src = '', loading, decoding, ...rest }: P<'img'>) => (
  <img
    className={cn('h-auto max-w-full rounded-lg', className)}
    src={normalizeImagePath(String(src))}
    loading={loading ?? 'lazy'}
    decoding={decoding ?? 'async'}
    {...rest}
  />
);

/** Mapa de elementos del MDX que usa el tema. */
export function getCustomMDXComponent(): Record<string, (props: any) => ReactNode> {
  return {
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    h5: H5,
    h6: H6,
    p: Pp,
    strong: Strong,
    em: Em,
    a: A,
    ul: Ul,
    ol: Ol,
    li: Li,
    blockquote: Blockquote,
    hr: Hr,
    code: Code,
    pre: Pre,
    table: Table,
    th: Th,
    td: Td,
    tr: Tr,
    img: Img,
  };
}
