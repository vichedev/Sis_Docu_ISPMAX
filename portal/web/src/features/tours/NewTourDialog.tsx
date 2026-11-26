/* Asistente de creación: título + identificador (se genera solo y se puede editar) → crea en borrador y abre el editor. */
import { useEffect, useState } from 'react';
import { Button, Dialog, Field, FieldStack, Input, Textarea, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { toursApi } from '@/lib/api.tours';
import { errText } from '@/lib/auth';
import { go, statsChanged } from '@/lib/util';
import { SLUG_RE, slugify } from './tourModel';

export function NewTourDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [manual, setManual] = useState(false);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [slugErr, setSlugErr] = useState('');
  useEffect(() => { if (open) { setTitle(''); setSlug(''); setManual(false); setDesc(''); setSlugErr(''); } }, [open]);
  const slugBad = slug !== '' && !SLUG_RE.test(slug);
  const submit = async () => {
    setBusy(true); setSlugErr('');
    try {
      const t = await toursApi.create({ slug, title: title.trim(), ...(desc.trim() ? { description: desc.trim() } : {}) });
      statsChanged();
      onOpenChange(false);
      go(`/tours/${t.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setSlugErr('Ya existe un tour con ese identificador. Pruebe con otro.'); else toast(errText(e), 'error');
    }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Nuevo tour" description="Se crea como borrador; no se verá en el manual hasta publicarlo."
      footer={<><Button onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="primary" disabled={busy || !title.trim() || !slug || slugBad} onClick={() => void submit()}>Crear y abrir el editor</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); if (title.trim() && slug && !slugBad && !busy) void submit(); }}>
        <FieldStack>
          <Field label="Título" help="Lo ve el lector. Por ejemplo: «Crear un cliente».">
            {(id, d) => <Input id={id} aria-describedby={d} value={title} maxLength={200} onChange={(e) => { setTitle(e.target.value); if (!manual) setSlug(slugify(e.target.value)); setSlugErr(''); }} />}
          </Field>
          <Field label="Identificador" error={slugErr || (slugBad ? 'Solo minúsculas, números y guiones; empieza por letra o número.' : undefined)}
            help={<>Va en el fragmento: <code className="font-mono">{`<Tour id="${slug || 'identificador'}" />`}</code>. No se puede cambiar después.</>}>
            {(id, d) => <Input id={id} aria-describedby={d} mono value={slug} onChange={(e) => { setManual(true); setSlug(e.target.value.toLowerCase()); setSlugErr(''); }} />}
          </Field>
          <Field label="Descripción" optional help="Nota interna para quien edite el manual.">
            {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} value={desc} maxLength={1000} onChange={(e) => setDesc(e.target.value)} />}
          </Field>
        </FieldStack>
      </form>
    </Dialog>
  );
}
