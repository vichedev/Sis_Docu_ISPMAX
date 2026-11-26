/* Imagen (<Figure>), fila o cuadrícula de imágenes (<FigRow>/<FigGrid>) y tour (<Tour>). */
import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type DragEvent } from 'react';
import { ImageOff, ImagePlus, Images, LoaderCircle, Route, Trash2, Upload } from 'lucide-react';
import { Button, DragHandle, IconButton } from '@/components/ui';
import { api } from '@/lib/api';
import { assetRel } from '@/lib/assets';
import { errText } from '@/lib/auth';
import { imageFromAsset, moveItem, removeItem, replaceItem, type ImageData } from '@/lib/blocks/index.ts';
import type { HandleProps } from '@/components/dnd';
import { cn } from '@/lib/cn';
import { autoPick } from './commands';
import { useEditor } from './context';
import { useTourFromImages } from '../tour/fromImages';
import { tourImagePath } from '../model/palette';
import { Inline } from './Inline';
import { RichText } from './RichText';
import { SortableItems, useItemIds } from './Sortable';
import { S } from './styles';
import type { BodyProps } from './BlockList';

function useLatest<T>(v: T) { const r = useRef(v); r.current = v; return r; }

export const imageUrl = (src: string) => (/^https?:/i.test(src) ? src : api.assetUrl(assetRel(src)));

/** Subida y elección de imágenes con estado «Subiendo…»; `done` recibe los datos de cada imagen. */
function useImageSource(done: (imgs: ImageData[]) => void) {
  const ed = useEditor();
  const [busy, setBusy] = useState(false);
  const cb = useLatest(done);
  const pick = async () => {
    const a = await ed.pickImage?.();
    if (a) cb.current([imageFromAsset({ path: a.path, width: a.width, height: a.height })]);
  };
  const upload = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) { if (files.length) ed.notify('Solo se pueden subir imágenes', 'error'); return; }
    if (!ed.uploadImage) return;
    setBusy(true);
    const out: ImageData[] = [];
    try {
      for (const f of imgs) { const r = await ed.uploadImage(f); out.push(imageFromAsset({ path: r.path, width: r.width, height: r.height })); }
      ed.notify(out.length === 1 ? `Imagen subida: ${out[0].src.replace(/^\/assets\//, '')}` : `${out.length} imágenes subidas`);
    } catch (e) { ed.notify(errText(e), 'error'); }
    finally { setBusy(false); if (out.length) cb.current(out); }
  };
  return { busy, pick, upload, canPick: !!ed.pickImage, canUpload: !!ed.uploadImage };
}

function Placeholder({ src, multiple, compact, text }: { src: ReturnType<typeof useImageSource>; multiple?: boolean; compact?: boolean; text: string }) {
  const [over, setOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const onDrop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(false); void src.upload(Array.from(e.dataTransfer.files)); };
  const onPaste = (e: ClipboardEvent) => { const f = Array.from(e.clipboardData.files); if (f.length) { e.preventDefault(); e.stopPropagation(); void src.upload(f); } };
  return (
    <div tabIndex={0} onPaste={onPaste} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
      className={cn('flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-line-strong bg-subtle px-4 text-center text-sm text-ink-3 outline-none focus-visible:border-accent',
        compact ? 'min-h-[150px] py-4' : 'min-h-[170px] py-6', over && 'border-accent bg-accent-soft text-accent-ink')}>
      {src.busy ? <><LoaderCircle size={20} className="animate-spin" /> Subiendo…</> : <>
        <ImagePlus size={22} className="text-ink-4" />
        <span className="max-w-[46ch]">{text}</span>
        <div className="flex flex-wrap justify-center gap-2">
          {src.canPick && <Button size="sm" data-act="pick" onClick={() => void src.pick()}><Images size={14} /> Elegir de la galería</Button>}
          {src.canUpload && <Button size="sm" variant="ghost" data-act="upload" onClick={() => file.current?.click()}><Upload size={14} /> Subir{multiple ? ' imágenes' : ''}</Button>}
        </div>
      </>}
      <input ref={file} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => { void src.upload(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
    </div>
  );
}

/** Captura con marco y pie, con las mismas reglas de ancho que <Figure> del manual (nunca amplía). */
function FigureView({ img, blockId, onCaption, inRow, active }: { img: ImageData; blockId: string; onCaption?: (v: string) => void; inRow?: boolean; active?: boolean }) {
  const ed = useEditor();
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [img.src]);
  const caps = [img.width ? `${img.width}px` : '', img.max].filter(Boolean);
  const max = caps.length === 2 ? `min(${caps.join(', ')})` : caps[0];
  const style: CSSProperties = { maxWidth: max ? `min(100%, ${max})` : '100%' };
  const left = /\b(compact|start)\b/.test(img.variant);
  return (
    <figure className={cn('m-0 min-w-0', inRow && 'max-w-full')} style={inRow ? undefined : style}>
      <div className={cn(S.figureFrame, inRow && 'w-fit max-w-full')} style={inRow ? style : undefined}>
        {broken ? (
          <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 px-4 py-6 text-center text-sm text-ink-3"><ImageOff size={20} /> No se encuentra la imagen<code className="break-all text-xs">{img.src}</code></div>
        ) : (
          <img src={imageUrl(img.src)} alt={img.alt} width={img.width ?? undefined} height={img.height ?? undefined} loading="lazy" onError={() => setBroken(true)}
            className="block h-auto max-w-full" style={img.width && img.height ? { aspectRatio: `${img.width} / ${img.height}` } : undefined} />
        )}
      </div>
      {onCaption && !ed.readOnly && (active || img.caption)
        ? <RichText blockId={blockId} label="Pie de imagen" singleLine value={img.caption} placeholder="Añadir pie de imagen" className={cn(S.caption, left && 'text-left', '[&]:mx-auto')} onChange={onCaption} />
        : img.caption ? <figcaption className={cn(S.caption, left && 'text-left')}><Inline md={img.caption} live={ed.readOnly} /></figcaption> : null}
    </figure>
  );
}

export function ImageBody({ block: b, update, active }: BodyProps<'image'>) {
  const ed = useEditor();
  const src = useImageSource((imgs) => update({ ...imgs[0], alt: b.alt || imgs[0].alt, caption: b.caption }));
  useEffect(() => { if (autoPick.has(b.id)) { autoPick.delete(b.id); if (ed.pickImage) void src.pick(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!b.src) {
    if (ed.readOnly) return null;
    return <Placeholder src={src} text="Elija una captura de la galería o suba una. También puede arrastrarla o pegarla aquí." />;
  }
  return (
    <div className="py-1">
      <FigureView img={b} blockId={b.id} active={active} onCaption={(v) => update({ caption: v }, `${b.id}:caption`)} />
      {active && !ed.readOnly && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-ink-3">
            <span className="shrink-0">Texto alternativo</span>
            <input value={b.alt} onChange={(e) => update({ alt: e.target.value }, `${b.id}:alt`)} placeholder="Describa la captura (para lectores de pantalla)"
              className="h-7 min-w-0 flex-1 rounded-md border border-line-strong bg-bg px-2 text-sm text-ink outline-none focus:border-accent focus:ring-3 focus:ring-ring" />
          </label>
          <span hidden><button type="button" data-act="pick" onClick={() => void src.pick()} /><UploadTrigger onFiles={(f) => void src.upload(f)} /></span>
          {src.busy && <span className="inline-flex items-center gap-1 text-ink-3"><LoaderCircle size={14} className="animate-spin" /> Subiendo…</span>}
        </div>
      )}
    </div>
  );
}

function UploadTrigger({ onFiles, multiple }: { onFiles: (f: File[]) => void; multiple?: boolean }) {
  const r = useRef<HTMLInputElement>(null);
  return <><button type="button" data-act="upload" onClick={() => r.current?.click()} /><input ref={r} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} /></>;
}

export function ImageRowBody({ block: b, update, apply, active }: BodyProps<'imageRow'>) {
  const ed = useEditor();
  const makeTour = useTourFromImages();
  const ids = useItemIds(b.images.length);
  const latest = useLatest(b);
  const src = useImageSource((imgs) => { const cur = latest.current; imgs.forEach((_, k) => ids.insert(cur.images.length + k)); update({ images: [...cur.images, ...imgs] }); });
  useEffect(() => { if (autoPick.has(b.id)) { autoPick.delete(b.id); if (ed.pickImage) void src.pick(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const grid = b.kind === 'grid';
  const cls = grid ? 'grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] items-start gap-[1.35rem]' : 'flex flex-wrap items-start gap-[1.35rem]';
  const item = (k: string, i: number, h?: HandleProps) => (
    <div data-item={k} className="group/item relative">
      <FigureView img={b.images[i]} blockId={b.id} inRow active={active} onCaption={(v) => update({ images: replaceItem(b.images, i, { ...b.images[i], caption: v }) }, `${b.id}:cap:${k}`)} />
      {!ed.readOnly && h && (
        <div className={cn('absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md border border-line bg-raised p-0.5 opacity-0 shadow-pop group-hover/item:opacity-100 focus-within:opacity-100', active ? 'max-md:opacity-90' : 'max-md:hidden')}>
          <DragHandle ref={h.ref} attributes={h.attributes} listeners={h.listeners} label={`Arrastrar la imagen ${i + 1}`} />
          {makeTour && tourImagePath(b.images[i].src) && <IconButton size="icon-sm" label={`Crear tour con la imagen ${i + 1}`} icon={<Route size={14} />} data-testid="tour-from-row-image" onClick={() => makeTour(b.id, [b.images[i]], apply)} />}
          <IconButton size="icon-sm" label={`Quitar la imagen ${i + 1}`} icon={<Trash2 size={14} />} onClick={() => { ids.remove(i); update({ images: removeItem(b.images, i) }); }} />
        </div>
      )}
    </div>
  );
  const itemCls = grid ? 'min-w-0' : 'min-w-0 max-w-full flex-[0_1_auto] max-sm:basis-full';
  if (ed.readOnly) return <div className={cls}>{ids.ids.map((k, i) => <div key={k} className={itemCls}>{item(k, i)}</div>)}</div>;
  return (
    <div className="py-1">
      {b.images.length > 0 && (
        <SortableItems ids={ids.ids} grid label={() => 'la imagen'} className={cls} itemClassName={itemCls}
          onMove={(f, t) => { ids.move(f, t); update({ images: moveItem(b.images, f, t) }); }} render={(k, i, h) => item(k, i, h)} />
      )}
      {(active || !b.images.length) && (
        <div className={cn(b.images.length > 0 && 'mt-3')}>
          <Placeholder src={src} multiple compact={b.images.length > 0}
            text={b.images.length ? 'Añadir otra imagen a la ' + (grid ? 'cuadrícula' : 'fila') + '.' : `Añada las capturas de la ${grid ? 'cuadrícula' : 'fila'}: de la galería, subiéndolas, arrastrándolas o pegándolas aquí.`} />
        </div>
      )}
    </div>
  );
}

export { TourBody } from '../tour/TourBody';
