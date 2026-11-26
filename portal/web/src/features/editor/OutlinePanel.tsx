/* «En esta página»: esquema de títulos del MDX + propiedades de la página. */
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { Field, FieldStack, HelpText, Input, SegmentedControl, Textarea } from '@/components/ui';
import type { Page } from '@/lib/api';
import type { OutlineItem } from '@/lib/mdx';
import { fmtDate, relTime } from '@/lib/util';
import { cn } from '@/lib/cn';
import { siteHref } from '@/lib/siteHref';

export interface PageForm { title: string; description: string; grupo: string; orden: string; status: string; fm: string; body: string }

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="border-b border-line px-4 py-4 last:border-b-0">
    <h2 className="mb-2.5 text-xs font-semibold text-ink-3">{title}</h2>
    {children}
  </section>
);

export function OutlinePanel({ page, form, set, outline, onJump, canEdit, folder, setFolder, fmError }: {
  page: Page; form: PageForm; set: <K extends keyof PageForm>(k: K, v: PageForm[K]) => void; outline: OutlineItem[]; onJump: (o: OutlineItem, index: number) => void;
  canEdit: boolean; folder: string; setFolder: (v: string) => void; fmError?: string;
}) {
  const published = page.status === 'published';
  return (
    <div className="text-[13.5px]">
      <Section title="Esquema">
        {outline.length === 0 ? <p className="text-sm text-ink-3">Sin títulos todavía. Los títulos de sección (##) aparecen aquí.</p> : (
          <ul className="m-0 list-none border-l border-line p-0">
            {outline.map((o, i) => (
              <li key={`${o.line}-${i}`}>
                <button type="button" onClick={() => onJump(o, i)} className={cn('-ml-px block w-full cursor-pointer truncate border-l border-transparent py-1 pr-1 text-left text-ink-2 hover:border-ink-3 hover:text-ink', o.level === 3 ? 'pl-6 text-sm' : 'pl-3')}>{o.text}</button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Publicación">
        <FieldStack>
          <Field label="Estado" help="Los borradores no aparecen en el manual; use el botón Publicar de la cabecera.">
            {() => <SegmentedControl label="Estado" disabled={!canEdit} value={form.status === 'published' ? 'published' : 'draft'} onValueChange={(v) => set('status', v)} options={[{ value: 'draft', label: 'Borrador' }, { value: 'published', label: 'Publicada' }]} />}
          </Field>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-2">Dirección pública</span>
            <code className="w-fit break-all">{page.route}</code>
            {published ? <a href={siteHref(page.route)} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-sm">Abrir en el sitio <ExternalLink size={12} /></a>
              : <HelpText>Aún no está en el sitio.</HelpText>}
          </div>
          <div className="text-sm text-ink-3">Modificada {relTime(page.updated_at)}{page.updated_by_name ? ` por ${page.updated_by_name}` : ''} · <span title={fmtDate(page.updated_at)}>v{page.version}</span></div>
        </FieldStack>
      </Section>
      <Section title="Menú">
        <FieldStack>
          <div className="grid grid-cols-[1fr_76px] gap-3">
            <Field label="Grupo">{(id) => <Input id={id} size="sm" value={form.grupo} disabled={!canEdit} onChange={(e) => set('grupo', e.target.value)} />}</Field>
            <Field label="Orden">{(id) => <Input id={id} size="sm" type="number" min={0} value={form.orden} disabled={!canEdit} onChange={(e) => set('orden', e.target.value)} />}</Field>
          </div>
          <HelpText>También puede arrastrar la página en el árbol.</HelpText>
        </FieldStack>
      </Section>
      <Section title="Imágenes">
        <Field label="Carpeta para las capturas subidas">{(id) => <Input id={id} size="sm" mono value={folder} onChange={(e) => setFolder(e.target.value)} />}</Field>
      </Section>
      <details className="group border-b border-line px-4 py-3 last:border-b-0" open={!!fmError || undefined}>
        <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> Frontmatter completo (avanzado)
        </summary>
        <div className="mt-2.5 flex flex-col gap-1.5">
          <Textarea code rows={12} aria-label="Frontmatter en JSON" value={form.fm} disabled={!canEdit} onChange={(e) => set('fm', e.target.value)} aria-invalid={!!fmError || undefined} />
          {fmError ? <HelpText tone="error">JSON no válido: {fmError}</HelpText> : <HelpText>Archivo: <code>{page.file_path}</code></HelpText>}
        </div>
      </details>
    </div>
  );
}
