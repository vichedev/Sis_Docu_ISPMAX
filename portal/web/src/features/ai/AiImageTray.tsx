/*
 * Bandeja de imágenes adjuntas del chat. La IA NO las ve: solo recibe texto (nombre, pie, alt, ancho, ubicación). La persona
 * las ordena arrastrando, les pone pie, texto alternativo y ancho, y puede insertarlas ella misma en la página («Insertar en
 * la página»: cero IA, cero tokens) o pedir ayuda a la IA («Sugerir distribución»).
 */
import { GripVertical, ImagePlus, Sparkles, Trash2, X } from 'lucide-react';
import { Button, IconButton, Input, Select } from '@/components/ui';
import { SortableList } from '@/components/dnd';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { MAX_IMAGES, SIZE_LABEL, missingAlt, refOf, type Attachment, type ImgSize } from './imageModel';

export function AiImageTray({ items, onChange, onAddFiles, onInsert, onSuggest, canInsert, busy }: {
  items: Attachment[]; onChange: (next: Attachment[]) => void; onAddFiles: () => void; onInsert: () => void; onSuggest: () => void; canInsert: boolean; busy: boolean;
}) {
  const set = (uid: string, p: Partial<Attachment>) => onChange(items.map((a) => (a.uid === uid ? { ...a, ...p } : a)));
  const lacking = missingAlt(items);
  return (
    <section aria-label="Imágenes adjuntas" className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-2.5" data-testid="ai-image-tray">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 flex-1 text-[13px] font-semibold">Imágenes adjuntas ({items.length}/{MAX_IMAGES})</h3>
        <Button size="sm" variant="ghost" disabled={items.length >= MAX_IMAGES} onClick={onAddFiles}><ImagePlus size={14} /> Añadir</Button>
      </div>
      <p className="m-0 text-xs text-ink-3">La IA no ve las imágenes: solo recibe sus nombres, pies y textos. Arrastra para ordenar.</p>
      <SortableList items={items} getId={(a) => a.uid} onReorder={(next) => onChange(next)} label={(a) => a.name} className="flex flex-col gap-2"
        renderItem={(a, h, dragging) => {
          const i = items.findIndex((x) => x.uid === a.uid);
          return (
            <div className={cn('flex gap-2 rounded-md border border-line bg-bg p-2', dragging && 'shadow-pop')} data-testid="ai-image-item">
              <button type="button" ref={h.ref} {...h.attributes} {...h.listeners} aria-label={`${refOf(i)}: arrastrar para cambiar el orden`} className="grid w-5 shrink-0 cursor-grab place-items-center rounded-sm border-0 bg-transparent text-ink-3 hover:bg-subtle active:cursor-grabbing"><GripVertical size={15} /></button>
              <img src={api.assetUrl(a.path)} alt="" width={56} height={56} className="size-14 shrink-0 rounded-md border border-line object-cover" />
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2">
                <p className="col-span-full m-0 flex items-center gap-1.5 truncate text-xs text-ink-3"><b className="font-mono font-medium text-ink-2">{refOf(i)}</b> {a.name}</p>
                <Input aria-label={`Pie de ${refOf(i)}`} placeholder="Pie de figura (opcional)" value={a.caption} maxLength={300} onChange={(e) => set(a.uid, { caption: e.target.value })} />
                <Input aria-label={`Texto alternativo de ${refOf(i)} (obligatorio)`} aria-invalid={a.alt.trim() ? undefined : true} placeholder="Texto alternativo: describe lo que se ve" value={a.alt} maxLength={300} onChange={(e) => set(a.uid, { alt: e.target.value })} />
                <Select aria-label={`Ancho de ${refOf(i)}`} size="sm" value={a.size} onValueChange={(v) => set(a.uid, { size: v as ImgSize })} options={(Object.keys(SIZE_LABEL) as ImgSize[]).map((k) => ({ value: k, label: `Ancho: ${SIZE_LABEL[k].toLowerCase()}` }))} />
                <Input aria-label={`Ubicación de ${refOf(i)}`} placeholder="Dónde va (p. ej. paso 2)" value={a.where} maxLength={120} onChange={(e) => set(a.uid, { where: e.target.value })} />
              </div>
              <IconButton size="icon-sm" label={`Quitar ${refOf(i)}`} icon={<X size={14} />} onClick={() => onChange(items.filter((x) => x.uid !== a.uid))} />
            </div>
          );
        }} />
      {lacking.length > 0 && <p role="status" className="m-0 text-xs text-warn">Falta el texto alternativo de {lacking.join(', ')}: es obligatorio para insertar.</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => onChange([])}><Trash2 size={14} /> Quitar todas</Button>
        <Button size="sm" disabled={busy} onClick={onSuggest} title="La IA propone orden, pies y dónde colocarlas (solo con el texto)"><Sparkles size={14} /> Sugerir distribución</Button>
        <Button size="sm" variant="primary" disabled={!canInsert || lacking.length > 0} onClick={onInsert} title={canInsert ? 'Las coloca tú, sin IA: al final de la página o tras el bloque seleccionado' : 'Abre una página en el editor para insertar'}>Insertar en la página</Button>
      </div>
    </section>
  );
}
