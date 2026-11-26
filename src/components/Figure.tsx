import type { CSSProperties } from 'react';
import { useIsFirstFigure } from '../../theme/lib/figures';

export interface FigureProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  /** Ancho máximo del recorte (nunca por encima del tamaño real del archivo). */
  max?: string;
  /** `compact`, `start`, `hero` — variantes heredadas del manual original. */
  variant?: string;
  /** Imagen suelta dentro de un párrafo (sin `<figure>`). */
  inline?: boolean;
}

/**
 * Captura de pantalla del manual.
 *
 * Reglas de tamaño:
 *  · nunca se amplía por encima de su ancho natural (`width`);
 *  · si se indicó un `max`, se respeta como tope adicional;
 *  · conserva la proporción con `aspect-ratio` (y `width`/`height`) para no provocar saltos de maquetación (CLS).
 *
 * La imagen va dentro de un botón `[data-zoom]`: clic o Intro la amplían en el visor del tema
 * (theme/components/Lightbox.tsx), con navegación por teclado entre las capturas de la página.
 * El portal antepone la base del sitio a la imagen al publicar: patchFigure (portal/server/ops/publish.mjs)
 * sustituye la PRIMERA aparición del atributo de imagen tal como está escrito abajo y añade una importación al
 * principio. No cambiar esa expresión, no copiarla literalmente en ningún comentario anterior a ella y no importar
 * aquí la función que añade el portal.
 */
export default function Figure({
  src,
  alt = '',
  caption,
  width,
  height,
  max,
  variant = '',
  inline = false,
}: FigureProps) {
  // La primera captura del documento suele ser el elemento más grande de la primera pantalla (LCP).
  const first = useIsFirstFigure();
  const img = (
    <img
      className={
        inline
          ? 'inline-block h-auto max-w-full align-middle'
          : 'block h-auto w-full aspect-(--isp-figure-ratio,auto)'
      }
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={first ? 'eager' : 'lazy'}
      fetchPriority={first ? 'high' : undefined}
      decoding="async"
    />
  );

  if (inline) return img;

  const variants = new Set(variant.split(/\s+/).filter(Boolean));
  const left = variants.has('start') || variants.has('compact');
  const hero = variants.has('hero');

  // Tope de ancho: el menor entre `max` y el ancho real. Nunca amplía.
  const caps: string[] = [];
  if (width) caps.push(`${width}px`);
  if (max) caps.push(max);
  const maxWidth = caps.length ? (caps.length === 1 ? caps[0] : `min(${caps.join(', ')})`) : undefined;

  const style: Record<string, string> = {};
  if (maxWidth) style['--isp-figure-max'] = maxWidth;
  if (width && height) style['--isp-figure-ratio'] = `${width} / ${height}`;

  return (
    <figure
      className={`mx-0 my-8 max-w-[min(100%,var(--isp-figure-max,100%))] print:break-inside-avoid ${hero ? 'mt-4' : ''} ${left ? '' : 'mx-auto'}`}
      style={style as CSSProperties}
    >
      <button
        type="button"
        data-zoom
        className={`group relative block w-full cursor-zoom-in overflow-hidden border border-line bg-figure text-left shadow-[0_1px_2px_rgb(20_23_38/0.04),0_10px_28px_-10px_rgb(20_23_38/0.16)] transition-[border-color,box-shadow] duration-200 hover:border-brand-300 hover:shadow-[0_1px_2px_rgb(20_23_38/0.04),0_16px_36px_-12px_rgb(91_75_216/0.28)] focus-visible:outline-offset-4 dark:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_10px_28px_-10px_rgb(0_0_0/0.6)] dark:hover:border-brand-500/60 print:shadow-none ${hero ? 'rounded-2xl' : 'rounded-xl'}`}
      >
        {img}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 right-2.5 inline-flex size-8 items-center justify-center rounded-lg bg-[rgb(10_12_24/0.62)] text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 print:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
            <circle cx="11" cy="11" r="7.5" />
            <path d="m20.5 20.5-4.2-4.2M11 8v6M8 11h6" />
          </svg>
        </span>
        <span className="sr-only">(ampliar imagen)</span>
      </button>
      {caption ? (
        <figcaption className={`mt-3 px-1 text-[13px] leading-[1.55] text-fg-subtle ${left ? 'text-left' : 'text-center'}`}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}
