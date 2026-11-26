/**
 * Toast: avisos efímeros abajo a la derecha (región aria-live).
 *   const toast = useToast(); toast('Guardado'); toast('Falló', 'error'); toast('Copiado', 'info')
 *   Con `action` añade un botón (p. ej. «Deshacer»). Los errores duran más (8 s).
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';

type Kind = 'ok' | 'error' | 'info';
interface Item { id: number; kind: Kind; text: ReactNode; action?: { label: string; run: () => void } }
type Push = (text: ReactNode, kind?: Kind, action?: Item['action']) => void;
const Ctx = createContext<Push>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const n = useRef(0);
  const close = (id: number) => setItems((l) => l.filter((t) => t.id !== id));
  const push = useCallback<Push>((text, kind = 'ok', action) => {
    const id = ++n.current;
    setItems((l) => [...l.slice(-3), { id, kind, text, action }]);
    setTimeout(() => close(id), kind === 'error' ? 8000 : action ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[1200] flex max-w-[min(420px,calc(100vw-32px))] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={cn('flex animate-fade-in items-start gap-2.5 rounded-lg py-2.5 pl-3 pr-2 text-[13.5px] shadow-pop', t.kind === 'error' ? 'bg-danger text-white dark:text-black' : 'bg-ink text-bg')}>
            {t.kind === 'error' ? <CircleAlert size={16} className="mt-0.5" /> : t.kind === 'ok' ? <CircleCheck size={16} className="mt-0.5 text-ok" /> : <Info size={16} className="mt-0.5 opacity-70" />}
            <span className="flex-1 pt-px">{t.text}</span>
            {t.action && <button type="button" className="cursor-pointer rounded-sm px-1.5 font-semibold underline-offset-2 hover:underline" onClick={() => { t.action!.run(); close(t.id); }}>{t.action.label}</button>}
            <button type="button" aria-label="Cerrar aviso" className="grid cursor-pointer place-items-center rounded-sm p-0.5 opacity-65 hover:opacity-100" onClick={() => close(t.id)}><X size={14} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
