/* Contexto compartido del lienzo: bloque activo, foco pendiente, campo de texto activo, imágenes, tours, editor de tours y problemas. */
import { createContext, useContext, type MutableRefObject } from 'react';
import type { Asset, Problem, UploadResult } from '@/lib/api';
import type { TourSummary } from '@/lib/api.blocks';
import type { TextEdit } from '../model/text';

/** Campo de texto enfocado: la barra del bloque aplica el formato sobre él. */
export interface TextTarget {
  blockId: string;
  apply: (fn: (value: string, start: number, end: number) => TextEdit) => void;
}

/** Imagen de partida para un tour (ruta de galería, «imgs/…»). */
export interface TourImage { path: string; alt: string }
/** Petición al editor de tours del lienzo: crear uno (desde imágenes, o vacío) o editar uno existente por identificador. */
export type TourRequest =
  | { mode: 'create'; images: TourImage[]; onSaved: (t: { slug: string; status: string }) => void }
  | { mode: 'edit'; slug: string; onSaved?: (t: { slug: string; status: string }) => void };

export interface EditorCtx {
  readOnly: boolean;
  activeId: string | null;
  setActive: (id: string | null) => void;
  /** Posición del cursor que debe tomar el próximo campo que se abra (‘start’, ‘end’ o un índice). */
  caret: MutableRefObject<'start' | 'end' | number | null>;
  /** Enfoca el primer (o último) campo editable del bloque. */
  focusBlock: (id: string, where?: 'start' | 'end') => void;
  textTarget: TextTarget | null;
  setTextTarget: (t: TextTarget | null) => void;
  uploadImage?: (file: File) => Promise<UploadResult>;
  pickImage?: () => Promise<Asset | null>;
  tours: TourSummary[] | null;
  toursError: boolean;
  problems: Map<string, Problem[]>;
  /** Bloque resaltado un instante (al saltar desde el esquema o la validación). */
  flashId: string | null;
  /** Deshacer global (botón «Deshacer» de los avisos). */
  undo: () => void;
  /** Editor de tours (solo con permiso de edición y lienzo editable). */
  openTour?: (req: TourRequest) => void;
  /** Selecciona un bloque, lo lleva a la vista y lo resalta un instante. */
  reveal?: (id: string) => void;
  notify: (text: string, kind?: 'ok' | 'error' | 'info', action?: { label: string; run: () => void }) => void;
}

export const Ctx = createContext<EditorCtx | null>(null);
export function useEditor(): EditorCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEditor fuera del lienzo');
  return c;
}
