/* «Crear tour con esta imagen»: abre TourStudio con las imágenes como primeros pasos e inserta el bloque <Tour> justo debajo. */
import { insertBlock, newBlock, type Block, type ImageData } from '@/lib/blocks/index.ts';
import { tourImagePath } from '../model/palette';
import { useEditor } from '../blocks/context';

export function useTourFromImages() {
  const ed = useEditor();
  if (!ed.openTour) return null;
  const open = ed.openTour;
  return (blockId: string, imgs: ImageData[], apply: (fn: (bl: Block[]) => Block[]) => void) => {
    const images = imgs.flatMap((i) => { const path = tourImagePath(i.src); return path ? [{ path, alt: i.alt }] : []; });
    if (!images.length) { ed.notify('Solo se puede crear un tour con imágenes de la galería del portal.', 'error'); return; }
    open({
      mode: 'create', images,
      onSaved: ({ slug }) => {
        const nb = newBlock('tour', { slug });
        apply((bl) => { const i = bl.findIndex((x) => x.id === blockId); return insertBlock(bl, i < 0 ? bl.length : i + 1, nb); });
        ed.reveal?.(nb.id);
      },
    });
  };
}
