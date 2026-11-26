/* Texto de un paso: `**negrita**` y nada más (igual que el componente del manual; nunca HTML). */
import { splitBold } from './tourModel';

export function RichText({ text }: { text: string }) {
  return <>{splitBold(text).map((p, i) => (p.bold ? <strong key={i} className="font-semibold text-ink">{p.text}</strong> : <span key={i}>{p.text}</span>))}</>;
}
