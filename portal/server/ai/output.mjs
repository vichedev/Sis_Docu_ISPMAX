// Validación de lo que devuelve la IA. Todo pasa por zod (esquema fijo) y por los MISMOS controles que el contenido
// humano (routes/mdxSafety.mjs y routes/validate.mjs). Si algo no valida, se descarta entero: nunca se aplica parcial.
import { z } from 'zod';
import { mdxSecurityProblems } from '../routes/mdxSafety.mjs';
import { validatePage } from '../routes/validate.mjs';
import { SECCION_KEYS } from '../routes/util.mjs';
import { LIMITS } from './prompts.mjs';
import { httpError } from '../routes/util.mjs';

/** Rechazo de la salida de la IA: 422 con mensaje claro (sin reproducir el texto). */
export function rejected(reason) {
  return httpError(422, `La propuesta de la IA se descartó: ${reason}. No se cambió nada; inténtalo de nuevo o reformula la petición.`, { code: 'AI_REJECTED' });
}

const str = (max) => z.string().max(max);
const AssistSchema = z.object({
  text: str(LIMITS.outputText).refine((s) => s.trim().length > 0, 'vacío'),
  avisos: z.array(str(300)).max(10).optional().default([]),
});

const lineText = str(1200);
export const BlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('lead'), text: lineText }),
  z.object({ type: z.literal('heading'), level: z.union([z.literal(2), z.literal(3)]), text: str(200) }),
  z.object({ type: z.literal('paragraph'), text: str(4000) }),
  z.object({ type: z.literal('list'), ordered: z.boolean().optional().default(false), items: z.array(str(1000)).min(1).max(40) }),
  z.object({ type: z.literal('steps'), steps: z.array(z.object({ title: str(200).optional().default(''), text: str(3000).optional().default('') })).min(1).max(40) }),
  z.object({ type: z.literal('callout'), kind: z.enum(['tip', 'info', 'warning', 'danger']), title: str(120).optional().default(''), text: str(3000) }),
  z.object({
    type: z.literal('table'),
    header: z.array(str(200)).min(1).max(10),
    rows: z.array(z.array(str(500)).max(10)).max(60),
  }),
  // Imagen ADJUNTA por la persona: solo se referencia por image_ref («img1»); la ruta real la pone el servidor.
  z.object({ type: z.literal('image'), image_ref: z.string().regex(/^img\d{1,2}$/), alt: str(300).optional().default(''), caption: str(300).optional().default(''), size: z.enum(['full', 'medium', 'small']).optional() }),
  z.object({ type: z.literal('code'), lang: z.string().regex(/^[a-z0-9+#-]{0,20}$/i).optional().default(''), code: str(4000) }),
]);
export const TIPOS_IA = ['tarea', 'guia', 'problema', 'pregunta', 'referencia', 'concepto'];
const DraftSchema = z.object({
  title: str(200).refine((s) => s.trim().length > 0, 'vacío'),
  slug: str(100).optional().default(''),
  description: str(1000).optional().default(''),
  tipo: z.enum(TIPOS_IA),
  ubicacion: z
    .object({
      seccion: z.enum(SECCION_KEYS),
      modulo: str(100).nullish(),
      grupo: str(120).nullish(),
      padre_id: z.number().int().positive().nullish(),
      motivo: str(400).nullish(),
    })
    .strict(),
  bloques: z.array(BlockSchema).min(1).max(LIMITS.blocks),
  avisos: z.array(str(300)).max(10).optional().default([]),
});

const AI_COMPONENTS = new Set(['Lead', 'Steps', 'Step', 'Kicker', 'Card', 'Cards', 'Badge']);
/** Etiquetas que la IA no puede escribir: HTML en bruto (iframe, img, a, br…) y componentes fuera de la lista. */
export function strayTags(text, allowed) {
  const clean = text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?\n\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '').replace(/\\[{}<>]/g, '');
  const out = [];
  for (const m of clean.matchAll(/<\/?([A-Za-z][\w.:-]*)/g)) {
    const name = m[1];
    if (/^(Figure|FigRow|FigGrid|Tour|SearchTerms)$/.test(name)) continue; // ya tienen su propia regla
    if (!allowed.has(name)) out.push(name);
  }
  return out;
}

/** Problemas de seguridad/validación de un trozo de MDX escrito por la IA. [] = bien. */
export async function mdxProblems(body, { allowedRefs = null } = {}) {
  const out = mdxSecurityProblems({ body }).map((p) => p.message);
  if (out.length) return out;
  const v = await validatePage({ body, frontmatter: undefined }, { assetExists: async () => true, tourStatus: async () => 'published' });
  for (const p of v.problems) if (p.level === 'error') out.push(p.message);
  if (out.length) return out;
  const stray = strayTags(body, AI_COMPONENTS);
  if (stray.length) return [`incluye HTML en bruto (<${stray[0]}>) que no se permite`];
  // La IA no puede crear imágenes ni tours: solo conservar los que ya traía el texto.
  const refs = [...body.matchAll(/<(Figure|FigRow|FigGrid|Tour|SearchTerms)\b[^>]*>/g)];
  if (refs.length) {
    if (!allowedRefs) return ['no puede crear imágenes ni tours'];
    for (const m of refs) if (!allowedRefs.has(m[0])) out.push('no puede crear ni cambiar imágenes o tours');
  }
  return out;
}

export function parse(schema, json) {
  const r = schema.safeParse(json);
  if (!r.success) throw rejected('no cumple el formato esperado');
  return r.data;
}

/** Valida la salida de una acción de texto. Devuelve { text, avisos }. `input`: el texto original (para conservar figuras/tours). */
export async function checkAssistOutput(json, { input = '' } = {}) {
  const d = parse(AssistSchema, json);
  const allowed = new Set([...input.matchAll(/<(Figure|FigRow|FigGrid|Tour|SearchTerms)\b[^>]*>/g)].map((m) => m[0]));
  const problems = await mdxProblems(d.text, { allowedRefs: allowed });
  if (problems.length) throw rejected(problems[0].replace(/^No se permite/, 'incluye algo que no se permite:').slice(0, 200));
  return { text: d.text.replace(/\s+$/, ''), avisos: d.avisos };
}

// ---- páginas nuevas: la IA da bloques en JSON y el servidor escribe el MDX (con el mismo formato que el motor de bloques)
export const oneLine = (s) => String(s).replace(/\s*\n\s*/g, ' ').trim();
/** Escapa `{ } <` fuera del código en línea (la IA ya pasó el control de seguridad con el texto original). */
function esc(s) {
  return String(s)
    .split(/(`[^`\n]*`)/g)
    .map((part, i) => (i % 2 ? part : part.replace(/[{}<]/g, (c) => '\\' + c)))
    .join('');
}
const cell = (s) => esc(oneLine(s)).replace(/\|/g, '\\|');
function fenceFor(code) {
  let len = 3;
  for (const m of code.matchAll(/^\s*(`{3,})/gm)) len = Math.max(len, m[1].length + 1);
  return '`'.repeat(len);
}
export function renderBlock(b) {
  switch (b.type) {
    case 'lead':
      return `<Lead>${esc(oneLine(b.text))}</Lead>`;
    case 'heading':
      return `${'#'.repeat(b.level)} ${esc(oneLine(b.text))}`;
    case 'paragraph':
      return esc(b.text.trim());
    case 'list':
      return b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : '-'} ${esc(oneLine(it))}`).join('\n');
    case 'steps': {
      const steps = b.steps.map((s) => {
        const parts = [s.title.replace(/\*\*/g, '').trim() ? `**${esc(oneLine(s.title.replace(/\*\*/g, '')))}**` : '', esc(s.text.trim())].filter(Boolean);
        return parts.length ? `<Step>\n\n${parts.join('\n\n')}\n\n</Step>` : '<Step>\n</Step>';
      });
      return ['<Steps>', ...steps, '</Steps>'].join('\n');
    }
    case 'callout': {
      const title = oneLine(b.title);
      return `:::${b.kind}${title ? ` ${esc(title)}` : ''}\n\n${esc(b.text.trim())}\n\n:::`;
    }
    case 'table': {
      const n = b.header.length;
      const row = (cells) => `| ${Array.from({ length: n }, (_, i) => cell(cells[i] ?? '')).join(' | ')} |`;
      return [row(b.header), `| ${Array.from({ length: n }, () => '---').join(' | ')} |`, ...b.rows.map(row)].join('\n');
    }
    case 'figure':
      return figureTag(b);
    case 'code': {
      const code = b.code.replace(/\n$/, '');
      const f = fenceFor(code);
      return `${f}${b.lang}\n${code ? `${code}\n` : ''}${f}`;
    }
  }
}
// ---- Imágenes adjuntas: la IA NO las ve ni inventa rutas; solo coloca las que la persona subió (image_ref → asset real)
/** Error de imagen para devolver al modelo (no se registra la propuesta). */
export class ImageError extends Error {}
const MAX_BY_SIZE = { medium: '720px', small: '420px' };
/** Texto de atributo seguro: sin llaves, ángulos ni comillas dobles, en una línea. */
export const attrText = (v) => String(v ?? '').replace(/[{}<>]/g, '').replace(/"/g, '”').replace(/\s+/g, ' ').trim();
/** <Figure … /> con la ruta REAL del asset (mismo formato que el motor de bloques del panel). */
export function figureTag(f) {
  const max = f.size === 'full' || !f.size ? `${Math.min(f.width || 1100, 1100)}px` : MAX_BY_SIZE[f.size];
  let a = ` src="/assets/${f.path}"`;
  if (f.alt) a += ` alt="${attrText(f.alt)}"`;
  if (f.caption) a += ` caption="${attrText(f.caption)}"`;
  if (f.width) a += ` width={${Number(f.width) | 0}}`;
  if (f.height) a += ` height={${Number(f.height) | 0}}`;
  a += ` max="${max}"`;
  return `<Figure${a} />`;
}
/**
 * Sustituye los bloques image (image_ref) por figuras con la ruta real. `attachments`: Map ref → { path, alt, caption, size, width, height }
 * (ya verificadas contra la BD: existen y son de quien conversa). Rechaza refs no adjuntas, alt vacío y refs repetidas en la propuesta.
 * Devuelve { blocks, figureTags } (figureTags: las etiquetas generadas, las únicas <Figure> que la IA puede poner).
 */
export function resolveImages(blocks, attachments = new Map()) {
  const used = new Set();
  const figureTags = new Set();
  const out = (blocks ?? []).map((b) => {
    if (b.type !== 'image') return b;
    const att = attachments.get(b.image_ref);
    if (!att) throw new ImageError(`La imagen «${b.image_ref}» no está entre las adjuntas por la persona. No puedes inventar imágenes.`);
    if (used.has(b.image_ref)) throw new ImageError(`La imagen «${b.image_ref}» ya está colocada en esta propuesta.`);
    used.add(b.image_ref);
    const alt = (b.alt || '').trim() || (att.alt || '').trim();
    if (!alt) throw new ImageError(`Falta el texto alternativo de «${b.image_ref}»: descríbelo con lo que sabes (nombre y pie) o pregunta a la persona.`);
    const fig = { type: 'figure', path: att.path, alt, caption: (b.caption || '').trim() || (att.caption || '').trim(), size: b.size ?? att.size ?? 'full', width: att.width, height: att.height };
    figureTags.add(figureTag(fig));
    return fig;
  });
  return { blocks: out, figureTags };
}

/** Texto original de cada bloque, para el control de seguridad ANTES de escapar. */
export function rawTexts(b) {
  switch (b.type) {
    case 'list': return b.items.join('\n');
    case 'steps': return b.steps.map((s) => `${s.title}\n\n${s.text}`).join('\n\n');
    case 'table': return [...b.header, ...b.rows.flat()].join('\n');
    case 'callout': return `${b.title}\n${b.text}`;
    case 'code': return '';
    case 'image':
    case 'figure': return `${b.alt}\n${b.caption}`;
    default: return b.text;
  }
}

/**
 * Valida la propuesta de página. Devuelve { title, slug, description, tipo, ubicacion, blocksMdx, avisos } (sin Kicker ni título #:
 * los pone el llamador con la misma plantilla que POST /api/pages).
 */
export async function checkDraftOutput(json) {
  const d = parse(DraftSchema, json);
  if (d.bloques.some((b) => b.type === 'image')) throw rejected('no puede colocar imágenes en una página propuesta de esta forma');
  // 1) Control de seguridad sobre el texto tal como lo escribió la IA: cualquier cosa ejecutable descarta todo.
  const plain = [d.title, d.description, d.ubicacion.grupo ?? '', d.ubicacion.motivo ?? '', ...d.avisos, ...d.bloques.map(rawTexts)].join('\n\n');
  const stray = strayTags(plain, new Set());
  if (stray.length) throw rejected(`incluye HTML en bruto (<${stray[0]}>) que no se permite`);
  const p1 = mdxSecurityProblems({ body: plain, frontmatter: { title: d.title, description: d.description } });
  if (p1.length) throw rejected(`incluye contenido no permitido (${p1[0].message.slice(0, 120)})`);
  for (const b of d.bloques) {
    const own = mdxSecurityProblems({ body: rawTexts(b) });
    if (own.length) throw rejected(`incluye contenido no permitido (${own[0].message.slice(0, 120)})`);
  }
  // 2) El MDX final, con los mismos controles que una página humana.
  const blocksMdx = d.bloques.map(renderBlock).join('\n\n') + '\n';
  const problems = await mdxProblems(blocksMdx);
  if (problems.length) throw rejected(problems[0].slice(0, 200));
  if (/[\u0000-\u001f<>]/.test(d.title.replace(/\s/g, ' '))) throw rejected('el título lleva caracteres no permitidos');
  return { title: oneLine(d.title), slug: d.slug, description: oneLine(d.description), tipo: d.tipo, ubicacion: d.ubicacion, blocksMdx, avisos: d.avisos };
}
