/* Ajustes propios de cada tipo en la barra del bloque activo (nivel de título, tipo de aviso, columnas…). */
import { useState } from 'react';
import { ImageUp, Images, RefreshCw, Route, SlidersHorizontal } from 'lucide-react';
import { Button, Field, FieldStack, HelpText, IconButton, Input, Popover, SegmentedControl, Select } from '@/components/ui';
import { CALLOUT_TITLES, reparseBlock, type AnyBlockPatch, type Block, type CalloutKind } from '@/lib/blocks/index.ts';
import { CALLOUT_KINDS } from './styles';
import { useEditor } from './context';
import { useTourFromImages } from '../tour/fromImages';

/** «Crear tour con esta imagen» en la barra del bloque (imagen o fila/cuadrícula con todas sus imágenes). */
function TourFromImagesButton({ block: b, apply }: { block: Extract<Block, { type: 'image' | 'imageRow' }>; apply: (fn: (bl: Block[]) => Block[]) => void }) {
  const make = useTourFromImages();
  const imgs = b.type === 'image' ? (b.src ? [b] : []) : b.images;
  if (!make || !imgs.length) return null;
  const label = imgs.length > 1 ? 'Crear tour con estas imágenes' : 'Crear tour con esta imagen';
  return (
    <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-accent-ink" aria-label={label} title={`${label}: cada imagen es un paso con su recuadro y su texto`} data-testid="tour-from-image"
      onClick={() => make(b.id, imgs, apply)}>
      <Route size={14} /><span className="max-[640px]:hidden">{label}</span><span className="max-[479px]:hidden min-[641px]:hidden">Tour</span>
    </Button>
  );
}

const MAX_OPTIONS = [
  { value: 'auto', label: 'Tamaño real (hasta 1100 px)' },
  { value: '1100px', label: '1100 px' }, { value: '900px', label: '900 px' }, { value: '760px', label: '760 px' },
  { value: '600px', label: '600 px' }, { value: '420px', label: '420 px' }, { value: '320px', label: '320 px' },
];
const VARIANTS = [{ value: 'none', label: 'Normal' }, { value: 'compact', label: 'Compacta (alineada a la izquierda)' }, { value: 'start', label: 'Pie alineado a la izquierda' }, { value: 'hero', label: 'Destacada (portada)' }];

function ImageSettings({ block: b, update }: { block: Extract<Block, { type: 'image' }>; update: (p: AnyBlockPatch, key?: string) => void }) {
  const [open, setOpen] = useState(false);
  const maxValue = !b.max ? 'auto' : MAX_OPTIONS.some((o) => o.value === b.max) ? b.max : 'custom';
  return (
    <Popover open={open} onOpenChange={setOpen} align="end" className="w-80"
      trigger={<IconButton size="icon-sm" label="Ajustes de la imagen" icon={<SlidersHorizontal size={15} />} />}>
      <FieldStack className="gap-3">
        <Field label="Texto alternativo" help="Describe la captura para quien no la ve.">
          {(id) => <Input id={id} size="sm" value={b.alt} onChange={(e) => update({ alt: e.target.value }, `${b.id}:alt`)} />}
        </Field>
        <Field label="Ancho máximo">
          {(id) => <Select id={id} size="sm" value={maxValue} onValueChange={(v) => { if (v !== 'custom') update({ max: v === 'auto' ? (b.width ? `${Math.min(b.width, 1100)}px` : '') : v }); }}
            options={[...MAX_OPTIONS, ...(maxValue === 'custom' ? [{ value: 'custom', label: b.max }] : [])]} />}
        </Field>
        <Field label="Estilo">
          {(id) => <Select id={id} size="sm" value={b.variant || 'none'} onValueChange={(v) => update({ variant: v === 'none' ? '' : v })} options={VARIANTS} />}
        </Field>
        <HelpText><code className="break-all">{b.src || 'sin imagen'}</code>{b.width ? ` · ${b.width}×${b.height ?? '?'} px` : ''}</HelpText>
      </FieldStack>
    </Popover>
  );
}

export function BlockSettings({ block: b, update, apply }: { block: Block; update: (p: AnyBlockPatch, key?: string) => void; apply: (fn: (bl: Block[]) => Block[]) => void }) {
  const ed = useEditor();
  switch (b.type) {
    case 'heading':
      return <SegmentedControl label="Nivel del título" value={String(Math.min(4, b.level))} onValueChange={(v) => update({ level: Number(v) as 1 | 2 | 3 | 4 })}
        options={[...(b.level === 1 ? [{ value: '1', label: 'H1' }] : []), { value: '2', label: 'H2' }, { value: '3', label: 'H3' }, { value: '4', label: 'H4' }]} className="mx-0.5" />;
    case 'list':
      return <SegmentedControl label="Tipo de lista" value={b.ordered ? 'ol' : 'ul'} onValueChange={(v) => update(v === 'ol' ? { ordered: true, marker: '.', start: b.start || 1 } : { ordered: false, marker: '-' })}
        options={[{ value: 'ul', label: 'Viñetas' }, { value: 'ol', label: '1. 2. 3.' }]} className="mx-0.5" />;
    case 'callout':
      return <Select size="sm" aria-label="Tipo de aviso" className="mx-0.5 h-7 w-[150px]" value={b.kind}
        onValueChange={(v) => { const k = v as CalloutKind; update({ kind: k, ...(!b.title || b.title === CALLOUT_TITLES[b.kind] ? { title: CALLOUT_TITLES[k] } : {}) }); }}
        options={CALLOUT_KINDS} />;
    case 'cards':
      return <SegmentedControl label="Columnas" value={String(b.columns ?? 3)} onValueChange={(v) => update({ columns: Number(v) })}
        options={[{ value: '1', label: '1 col.' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} className="mx-0.5" />;
    case 'imageRow':
      return (
        <>
          <SegmentedControl label="Disposición" value={b.kind} onValueChange={(v) => update({ kind: v as 'row' | 'grid' })}
            options={[{ value: 'row', label: 'Fila' }, { value: 'grid', label: 'Cuadrícula' }]} className="mx-0.5" />
          <TourFromImagesButton block={b} apply={apply} />
        </>
      );
    case 'image':
      return (
        <>
          <TourFromImagesButton block={b} apply={apply} />
          {b.src && ed.pickImage && <IconButton size="icon-sm" label="Cambiar por otra de la galería" icon={<Images size={15} />} onClick={() => document.querySelector<HTMLButtonElement>(`[data-block-id="${b.id}"] [data-act="pick"]`)?.click()} />}
          {b.src && ed.uploadImage && <IconButton size="icon-sm" label="Subir otra imagen" icon={<ImageUp size={15} />} onClick={() => document.querySelector<HTMLButtonElement>(`[data-block-id="${b.id}"] [data-act="upload"]`)?.click()} />}
          <ImageSettings block={b} update={update} />
        </>
      );
    case 'raw':
      return <Button variant="ghost" size="sm" className="px-2" title="Volver a analizar el código: si sigue el estilo del manual se convierte en bloques editables" onClick={() => apply((bl) => reparseBlock(bl, b.id))}><RefreshCw size={14} /> Convertir en bloques</Button>;
    default:
      return null;
  }
}
