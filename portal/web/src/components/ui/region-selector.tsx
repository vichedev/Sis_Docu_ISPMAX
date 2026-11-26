/**
 * RegionSelector: dibuja un rectángulo en porcentajes (0-100) sobre una imagen.
 *   <RegionSelector src={url} value={spot} onChange={setSpot} />   value: { x, y, w, h } | null
 *   Ratón/táctil: arrastrar en vacío dibuja; arrastrar dentro mueve; las esquinas redimensionan.
 *   Teclado (con el rectángulo enfocado): flechas mueven 1 % (Mayús: 5 %), Alt+flechas cambian
 *   el tamaño, Supr/Retroceso lo quita. Pensado para el editor de tours (campo `spot`).
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '../../lib/cn';

export interface Rect { x: number; y: number; w: number; h: number }
type Mode = { kind: 'draw'; ox: number; oy: number } | { kind: 'move'; dx: number; dy: number } | { kind: 'resize'; ax: number; ay: number };

const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));
const r1 = (v: number) => Math.round(v * 10) / 10;
const norm = (x1: number, y1: number, x2: number, y2: number): Rect => ({ x: r1(Math.min(x1, x2)), y: r1(Math.min(y1, y2)), w: r1(Math.abs(x2 - x1)), h: r1(Math.abs(y2 - y1)) });

export function RegionSelector({ src, alt = '', value, onChange, className, minSize = 2, disabled }: { src: string; alt?: string; value: Rect | null; onChange: (r: Rect | null) => void; className?: string; minSize?: number; disabled?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const pct = (e: PointerEvent) => { const b = box.current!.getBoundingClientRect(); return { x: clamp(((e.clientX - b.left) / b.width) * 100), y: clamp(((e.clientY - b.top) / b.height) * 100) }; };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    const p = pct(e);
    const t = (e.target as HTMLElement).dataset;
    box.current!.setPointerCapture(e.pointerId);
    e.preventDefault();
    if (t.handle && value) {
      const ax = t.handle.includes('w') ? value.x + value.w : value.x;
      const ay = t.handle.includes('n') ? value.y + value.h : value.y;
      setMode({ kind: 'resize', ax, ay });
    } else if (t.rect && value) setMode({ kind: 'move', dx: p.x - value.x, dy: p.y - value.y });
    else { setMode({ kind: 'draw', ox: p.x, oy: p.y }); onChange({ x: r1(p.x), y: r1(p.y), w: 0, h: 0 }); }
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!mode) return;
    const p = pct(e);
    if (mode.kind === 'draw') onChange(norm(mode.ox, mode.oy, p.x, p.y));
    else if (mode.kind === 'resize') onChange(norm(mode.ax, mode.ay, p.x, p.y));
    else if (value) onChange({ ...value, x: r1(clamp(p.x - mode.dx, 0, 100 - value.w)), y: r1(clamp(p.y - mode.dy, 0, 100 - value.h)) });
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!mode) return;
    box.current!.releasePointerCapture(e.pointerId);
    setMode(null);
    if (value && (value.w < minSize || value.h < minSize)) onChange(mode.kind === 'draw' ? null : { ...value, w: Math.max(value.w, minSize), h: Math.max(value.h, minSize) });
  };
  const key = (e: KeyboardEvent) => {
    if (!value || disabled) return;
    const d = e.shiftKey ? 5 : 1;
    const dir = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onChange(null); return; }
    if (!dir) return;
    e.preventDefault();
    if (e.altKey) onChange({ ...value, w: r1(clamp(value.w + dir[0], minSize, 100 - value.x)), h: r1(clamp(value.h + dir[1], minSize, 100 - value.y)) });
    else onChange({ ...value, x: r1(clamp(value.x + dir[0], 0, 100 - value.w)), y: r1(clamp(value.y + dir[1], 0, 100 - value.h)) });
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className={cn('relative touch-none select-none overflow-hidden rounded-md border border-line bg-subtle', disabled ? 'cursor-not-allowed' : 'cursor-crosshair')}>
        <img src={src} alt={alt} draggable={false} className="pointer-events-none block h-auto w-full" />
        {value && value.w > 0 && value.h > 0 && (
          <div data-rect="1" tabIndex={disabled ? -1 : 0} role="group" onKeyDown={key}
            aria-label={`Región resaltada: x ${value.x} %, y ${value.y} %, ancho ${value.w} %, alto ${value.h} %. Flechas para mover, Alt+flechas para cambiar el tamaño, Supr para quitarla.`}
            style={{ left: `${value.x}%`, top: `${value.y}%`, width: `${value.w}%`, height: `${value.h}%` }}
            className="absolute cursor-move rounded-sm outline-2 outline-accent shadow-[0_0_0_9999px_rgb(16_16_22/0.45)] focus-visible:outline-[3px] focus-visible:outline-offset-0">
            {['nw', 'ne', 'sw', 'se'].map((h) => (
              <span key={h} data-handle={h} aria-hidden="true" className={cn('absolute size-2.5 rounded-[2px] border border-accent bg-white',
                h[0] === 'n' ? '-top-[5px]' : '-bottom-[5px]', h[1] === 'w' ? '-left-[5px]' : '-right-[5px]',
                h === 'nw' || h === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize')} />
            ))}
          </div>
        )}
      </div>
      <p className="m-0 flex justify-between gap-2 text-xs text-ink-3">
        <span>{value ? 'Arrastre para mover; esquinas para cambiar el tamaño.' : 'Arrastre sobre la imagen para marcar la zona.'}</span>
        {value && <span className="font-mono tabular-nums">{value.x}, {value.y} · {value.w}×{value.h} %</span>}
      </p>
    </div>
  );
}
