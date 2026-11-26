import { useFrontmatter, useSite } from '@rspress/core/runtime';
import { Icon } from './Icon';
import type { Contacto } from './Footer';

interface Verificado {
  fecha?: string | Date;
  version?: string;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-11-05" → "5 de noviembre de 2026" (sin depender de Intl ni de la zona horaria). */
export function fechaLarga(v?: string | Date): string {
  const iso = v instanceof Date ? v.toISOString() : String(v ?? '');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : '';
}

/**
 * Pie del documento: con qué versión de ISPMAX se comprobó la página (frontmatter `verificado`) y a quién escribir
 * si falta algo. Sin frontmatter `verificado`, solo muestra la ayuda.
 */
export function DocMeta() {
  const { frontmatter } = useFrontmatter();
  const { site } = useSite();
  const c = (site.themeConfig as { contacto?: Contacto }).contacto ?? {};
  const v = (frontmatter.verificado ?? {}) as Verificado;
  const fecha = fechaLarga(v.fecha);
  if (!fecha && !c.whatsapp) return null;
  return (
    <aside aria-label="Sobre esta página" className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-[13px] text-fg-subtle">
      {fecha ? (
        <p className="inline-flex items-center gap-1.5">
          <Icon name="shield" className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            Comprobado con ISPMAX · {fecha}
          </span>
        </p>
      ) : null}
      {c.whatsapp ? (
        <a
          href={c.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-brand sm:ml-auto print:hidden"
        >
          <Icon name="headset" className="size-4" />
          ¿Le falta algo? Escríbanos
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      ) : null}
    </aside>
  );
}
