/* Tablas GFM: de Markdown a celdas y de vuelta, para editar un bloque `table` como cuadrícula. */
import { toLf } from './util.ts';

export type CellAlign = 'left' | 'center' | 'right' | null;

export interface TableData {
  header: string[];
  align: CellAlign[];
  rows: string[][];
}

/** Divide una fila `| a | b |` en celdas. Como en GFM, todo `|` sin escapar separa celdas, también dentro de `código`. */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') {
      cur += '\\|';
      i++;
      continue;
    }
    if (c === '|') {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

/** Celdas de una tabla GFM, o null si `md` no es una tabla. */
export function parseTable(md: string): TableData | null {
  const lines = toLf(md).split('\n').filter(l => l.trim());
  if (lines.length < 2 || !lines[0].trim().startsWith('|')) return null;
  const delim = splitRow(lines[1]);
  if (!delim.every(d => /^:?-+:?$/.test(d))) return null;
  const header = splitRow(lines[0]);
  const align: CellAlign[] = delim.map(d => (d.startsWith(':') && d.endsWith(':') ? 'center' : d.endsWith(':') ? 'right' : d.startsWith(':') ? 'left' : null));
  const width = header.length;
  const rows = lines.slice(2).map(l => {
    const r = splitRow(l);
    while (r.length < width) r.push('');
    return r.slice(0, width);
  });
  return { header, align, rows };
}

const cell = (s: string): string => s.replace(/\r?\n/g, '<br/>').replace(/(^|[^\\])\|/g, '$1\\|').trim();

/** Tabla GFM con el estilo del manual: `| a | b |` y separador `|---|---|`. */
export function buildTable(t: TableData): string {
  const width = Math.max(1, t.header.length);
  const pad = (r: readonly string[]): string[] => Array.from({ length: width }, (_, i) => cell(r[i] ?? ''));
  const row = (r: readonly string[]): string => `| ${pad(r).join(' | ')} |`;
  const delim = Array.from({ length: width }, (_, i) => {
    const a = t.align[i] ?? null;
    return a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---';
  });
  return [row(t.header), `|${delim.join('|')}|`, ...t.rows.map(row)].join('\n');
}
