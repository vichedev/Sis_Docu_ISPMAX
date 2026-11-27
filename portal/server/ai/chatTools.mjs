// Herramientas del asistente conversacional. SOLO leen o registran PROPUESTAS validadas: ninguna escribe en la BD.
// Cada propose_* pasa por los mismos controles que el contenido humano (zod + mdxSafety + validatePage + regla anti HTML
// en bruto + sin Figure/Tour inventados) y, si no valida, se devuelve el motivo al modelo y NO se registra.
import { z } from 'zod';
import { SECCION_KEYS, escapeLike } from '../routes/util.mjs';
import { resolveGroup } from '../routes/groups.mjs';
import { mdxSecurityProblems } from '../routes/mdxSafety.mjs';
import { validatePage } from '../routes/validate.mjs';
import { TIPOS } from '../routes/pages.mjs';
import { BlockSchema, TIPOS_IA, rawTexts, renderBlock, mdxProblems, strayTags, rejected, oneLine } from './output.mjs';
import { CHAT_LIMITS } from './prompts.mjs';
import { loadOutline, outlineText, buildCreateProposal, applyOps, changedHunk } from './proposals.mjs';

const str = (n) => z.string().max(n);
const pageRef = z.union([z.number().int().positive(), str(300)]);
const Blocks = z.array(BlockSchema).max(60);

const CreateArgs = z.object({
  title: str(200), slug: str(100).optional(), description: str(1000).optional(), tipo: z.enum(TIPOS_IA), seccion: z.enum(SECCION_KEYS),
  modulo: str(100).nullish(), grupo: str(120).nullish(), new_group: z.boolean().optional(), parent_id: z.number().int().positive().nullish(), motivo: str(400).nullish(),
  usar_plantilla: z.boolean().optional(), blocks: Blocks.optional(), avisos: z.array(str(300)).max(10).optional(),
});
const Op = z.discriminatedUnion('op', [
  z.object({ op: z.literal('replace'), find: str(2000), replace: str(6000) }),
  z.object({ op: z.literal('delete'), find: str(2000) }),
  z.object({ op: z.literal('insert_after'), anchor: str(2000), blocks: Blocks.min(1) }),
  z.object({ op: z.literal('append'), blocks: Blocks.min(1) }),
]);
const EditArgs = z.object({ page: pageRef, ops: z.array(Op).min(1).max(10), motivo: str(400).nullish() });
const MoveArgs = z.object({ page: pageRef, seccion: z.enum(SECCION_KEYS).optional(), grupo: str(120).optional(), new_group: z.boolean().optional(), parent_id: z.number().int().positive().nullable().optional(), motivo: str(400).nullish() });
const SearchArgs = z.object({ query: z.string().trim().min(2).max(200) });
const ReadArgs = z.object({ page: pageRef });
const ChoiceArgs = z.object({ question: str(300), options: z.array(z.union([str(80), z.object({ label: str(80), value: str(200).optional() })])).min(2).max(8) });

const blockSchemaDoc = 'Bloques: {type:"lead",text} · {type:"heading",level:2|3,text} · {type:"paragraph",text} · {type:"list",ordered,items[]} · {type:"steps",steps:[{title,text}]} · {type:"callout",kind:"tip|info|warning|danger",title,text} · {type:"table",header[],rows[][]} · {type:"code",lang,code}. Texto en Markdown en línea, sin HTML ni llaves.';
const pageProp = { description: 'id numérico de la página o su ruta (por ejemplo /guia/inicio/clientes)', anyOf: [{ type: 'integer' }, { type: 'string' }] };
const blocksProp = { type: 'array', items: { type: 'object' }, description: blockSchemaDoc };

const BASE_TOOL_DEFS = [
  { type: 'function', function: { name: 'list_outline', description: 'Lista las secciones del manual con sus módulos, grupos y páginas (id y título). Úsala antes de proponer ubicación o mover.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  { type: 'function', function: { name: 'search_pages', description: 'Busca páginas por título, ruta o texto. Devuelve id, título, ruta y estado.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } } },
  { type: 'function', function: { name: 'read_page', description: 'Lee el cuerpo y los datos de una página (el cuerpo se trunca). Úsala antes de proponer una edición.', parameters: { type: 'object', properties: { page: pageProp }, required: ['page'], additionalProperties: false } } },
  { type: 'function', function: { name: 'propose_create_page', description: `Propone una página NUEVA (se creará como borrador solo si la persona la aprueba). Con usar_plantilla=true el servidor pone la estructura base del tipo y no hacen falta bloques; si no, da blocks. ${blockSchemaDoc}`, parameters: { type: 'object', properties: { title: { type: 'string' }, slug: { type: 'string' }, description: { type: 'string' }, tipo: { type: 'string', enum: TIPOS_IA }, seccion: { type: 'string', enum: SECCION_KEYS }, modulo: { type: 'string', description: 'obligatorio en tareas' }, grupo: { type: 'string', description: 'Nombre EXACTO de un grupo EXISTENTE de la sección, copiado de list_outline (con su emoji si lo tiene). Un grupo que no existe se rechaza salvo que pongas new_group=true' }, new_group: { type: 'boolean', description: 'true SOLO si la persona pidió expresamente crear un grupo nuevo; el servidor lo rechaza si ya existe uno con ese nombre' }, parent_id: { type: 'integer', description: 'id de la página padre (subsección)' }, motivo: { type: 'string', description: 'por qué va ahí' }, usar_plantilla: { type: 'boolean' }, blocks: blocksProp }, required: ['title', 'tipo', 'seccion'], additionalProperties: false } } },
  { type: 'function', function: { name: 'propose_edit_page', description: 'Propone cambios en una página existente con operaciones sobre su texto: replace (find exacto y único → replace), delete (find), insert_after (anchor exacto y único + blocks) y append (blocks al final). No cambia nada hasta que la persona aprueba.', parameters: { type: 'object', properties: { page: pageProp, ops: { type: 'array', items: { type: 'object', properties: { op: { type: 'string', enum: ['replace', 'delete', 'insert_after', 'append'] }, find: { type: 'string' }, replace: { type: 'string' }, anchor: { type: 'string' }, blocks: blocksProp } , required: ['op'] } }, motivo: { type: 'string' } }, required: ['page', 'ops'], additionalProperties: false } } },
  { type: 'function', function: { name: 'ask_choice', description: 'Haz una pregunta aclaratoria con respuestas rápidas que la persona puede pulsar (por ejemplo los grupos existentes de una sección). Úsala cuando falte un dato (sección, grupo, tipo, página). Tras llamarla, NO propongas nada más en este turno.', parameters: { type: 'object', properties: { question: { type: 'string' }, options: { type: 'array', items: { type: 'string' }, description: 'de 2 a 8 opciones cortas, con valores reales (nombres exactos de grupos o páginas)' } }, required: ['question', 'options'], additionalProperties: false } } },
  { type: 'function', function: { name: 'propose_move_page', description: 'Propone mover una página a otra sección, grupo o página padre (se coloca al final). parent_id null la devuelve al nivel principal.', parameters: { type: 'object', properties: { page: pageProp, seccion: { type: 'string', enum: SECCION_KEYS }, grupo: { type: 'string', description: 'Nombre EXACTO de un grupo existente (de list_outline)' }, new_group: { type: 'boolean' }, parent_id: { type: ['integer', 'null'] }, motivo: { type: 'string' } }, required: ['page'], additionalProperties: false } } },
];

/** Definiciones de herramientas de este turno: propose_create_page lista los grupos reales de cada sección. */
export function buildToolDefs(outline) {
  const groups = (outline ?? []).map((s) => `${s.key}: ${s.grupos.map((g) => '«' + g.name + '»').join(', ') || '(sin grupos)'}`).join(' | ').slice(0, 1800);
  return BASE_TOOL_DEFS.map((d) => {
    if (d.function.name !== 'propose_create_page') return d;
    const fn = JSON.parse(JSON.stringify(d.function));
    fn.description += ` Grupos existentes por sección (usa estos nombres EXACTOS): ${groups}`;
    return { ...d, function: fn };
  });
}
export const TOOL_DEFS = BASE_TOOL_DEFS;

const activityLabel = (name, a) => ({
  list_outline: 'Consultando las secciones del manual',
  search_pages: 'Buscando páginas' + (a && typeof a.query === 'string' ? ' «' + a.query.slice(0, 40) + '»' : ''),
  read_page: 'Leyendo una página',
  propose_create_page: 'Preparando la propuesta de página nueva' + (a && typeof a.title === 'string' ? ' «' + a.title.slice(0, 40) + '»' : ''),
  propose_edit_page: 'Preparando los cambios de la página',
  propose_move_page: 'Preparando el movimiento de la página',
  ask_choice: 'Preparando una pregunta',
}[name] ?? 'Trabajando');

/** Error de la herramienta devuelto al modelo (no corta la conversación). */
class ToolError extends Error {}
const fail = (m) => { throw new ToolError(m); };
const zerr = (e) => `argumentos no válidos (${e.issues.slice(0, 3).map((i) => `${i.path.join('.') || 'raíz'}: ${i.message}`).join('; ')})`;

/**
 * Caja de herramientas de UN turno. `context.page` = { id, title, route, seccion, body? } (body: texto actual del editor).
 * Devuelve { run(name, argsJson) → texto para el modelo, proposals, rejected }.
 */
export function createToolbox({ ctx, context, onEvent = () => {} }) {
  const db = ctx.db;
  let choice = null;
  let calls = 0;
  const proposals = [];
  const rejectedList = [];
  const MAX_PROPOSALS = 5;
  const addProposal = (p) => { proposals.push(p); onEvent({ type: 'proposal', proposal: p }); };
  const open = context?.page ?? null;

  async function resolve(ref) {
    let r;
    if (typeof ref === 'number' || /^\d+$/.test(String(ref).trim())) r = await db.query('SELECT * FROM pages WHERE id = $1 AND deleted_at IS NULL', [Number(ref)]);
    else if (String(ref).trim().startsWith('/')) r = await db.query('SELECT * FROM pages WHERE route = $1 AND deleted_at IS NULL', [String(ref).trim()]);
    else fail('Indica la página con su id numérico o su ruta que empieza con /.');
    if (!r.rowCount) fail('Esa página no existe (o está eliminada). Usa search_pages o list_outline para encontrarla.');
    return r.rows[0];
  }
  const editable = (p) => {
    if (p.seccion === 'raiz') fail('La portada no se puede editar ni mover desde el asistente.');
    if (p.frontmatter?.generado === true) fail('Esa portada de sección se genera sola a partir del menú; no se edita.');
  };
  const note = (kind, e) => rejectedList.push({ kind, reason:e.message?.replace(/^La propuesta de la IA se descartó: /, '').replace(/\. No se cambió nada.*$/, '') ?? 'no válida' });
  const capCheck = () => { if (proposals.length >= MAX_PROPOSALS) fail(`Ya hay ${MAX_PROPOSALS} propuestas en este turno; pide al usuario que continúe en otro mensaje.`); };

  const tools = {
    async list_outline() {
      return outlineText(await loadOutline(ctx), 8000);
    },
    async search_pages(args) {
      const a = SearchArgs.safeParse(args);
      if (!a.success) fail(zerr(a.error));
      const q = a.data.query;
      const like = '%' + escapeLike(q) + '%';
      const r = await db.query(
        `SELECT id, title, route, seccion, grupo, status FROM pages WHERE deleted_at IS NULL AND seccion <> 'raiz'
           AND (title ILIKE $1 OR route ILIKE $1 OR to_tsvector('spanish', title || ' ' || description || ' ' || body) @@ websearch_to_tsquery('spanish', $2))
         ORDER BY (title ILIKE $1) DESC, id LIMIT 8`, [like, q]);
      return JSON.stringify({ results: r.rows });
    },
    async read_page(args) {
      const a = ReadArgs.safeParse(args);
      if (!a.success) fail(zerr(a.error));
      const p = await resolve(a.data.page);
      const isOpen = open && open.id === p.id;
      const body = isOpen && typeof open.body === 'string' ? open.body : p.body;
      const cut = body.length > 6000;
      return JSON.stringify({ id: p.id, title: p.title, route: p.route, seccion: p.seccion, grupo: p.grupo, status: p.status, description: p.description, es_la_pagina_abierta: !!isOpen, body: cut ? body.slice(0, 6000) : body, truncado: cut });
    },
    async propose_create_page(args) {
      capCheck();
      const a = CreateArgs.safeParse(args);
      if (!a.success) fail(zerr(a.error));
      const d = a.data;
      try {
        const useTemplate = d.usar_plantilla === true || !d.blocks?.length;
        const plain = [d.title, d.description ?? '', d.grupo ?? '', d.motivo ?? '', ...(d.avisos ?? []), ...(d.blocks ?? []).map(rawTexts)].join('\n\n');
        const stray = strayTags(plain, new Set());
        if (stray.length) throw rejected(`incluye HTML en bruto (<${stray[0]}>) que no se permite`);
        const p1 = mdxSecurityProblems({ body: plain, frontmatter: { title: d.title, description: d.description ?? '' } });
        if (p1.length) throw rejected(`incluye contenido no permitido (${p1[0].message.slice(0, 120)})`);
        if (/[\u0000-\u001f<>]/.test(d.title.replace(/\s/g, ' '))) throw rejected('el título lleva caracteres no permitidos');
        let blocksMdx;
        if (useTemplate) blocksMdx = TIPOS[d.tipo].body();
        else {
          for (const b of d.blocks) {
            const own = mdxSecurityProblems({ body: rawTexts(b) });
            if (own.length) throw rejected(`incluye contenido no permitido (${own[0].message.slice(0, 120)})`);
          }
          blocksMdx = d.blocks.map(renderBlock).join('\n\n') + '\n';
          const problems = await mdxProblems(blocksMdx);
          if (problems.length) throw rejected(problems[0].slice(0, 200));
        }
        // Grupo: SIEMPRE contra los existentes de la sección. Uno nuevo solo con new_group=true (y nunca si ya existe).
        let grupoOk = d.grupo ?? '';
        if (grupoOk.trim()) {
          const sec = (await loadOutline(ctx)).find((x) => x.key === d.seccion);
          const canon = resolveGroup(sec, grupoOk);
          if (canon !== null && d.new_group === true) fail('El grupo «' + grupoOk + '» ya existe (se llama «' + canon + '»): usa ese nombre exacto y quita new_group.');
          if (canon !== null) grupoOk = canon;
          else if (d.new_group !== true) fail('No existe el grupo «' + grupoOk + '» en la sección «' + d.seccion + '». Grupos existentes: ' + ((sec?.grupos ?? []).map((g) => '«' + g.name + '»').join(', ') || '(ninguno)') + '. Usa uno de ellos (nombre exacto) o llama a ask_choice para preguntar. new_group=true solo si la persona pidió crear uno nuevo.');
        }
        if (d.seccion === 'tareas' && !d.modulo) fail('Las tareas necesitan un módulo (campo modulo): pregunta a la persona o usa list_outline para ver los existentes.');
        const prop = await buildCreateProposal(ctx, {
          title: oneLine(d.title), slug: d.slug ?? '', description: oneLine(d.description ?? ''), tipo: d.tipo, blocksMdx, avisos: d.avisos ?? [], usesTemplate: useTemplate,
          ubicacion: { seccion: d.seccion, modulo: d.modulo, grupo: grupoOk, padre_id: d.parent_id, motivo: d.motivo },
        });
        addProposal({ kind: 'create', summary: `Crear la página «${prop.title}» en ${prop.route} como borrador${prop.usesTemplate ? ' (estructura base del tipo)' : ''}.`, ...prop });
        return `Propuesta registrada: crear «${prop.title}» en ${prop.route}${prop.newGroup ? ` (grupo nuevo «${prop.grupo}»)` : ''}. La persona debe aprobarla.`;
      } catch (e) {
        if (e instanceof ToolError) throw e;
        note('create', e);
        fail(`Propuesta rechazada: ${e.message}`);
      }
    },
    async propose_edit_page(args) {
      capCheck();
      const a = EditArgs.safeParse(args);
      if (!a.success) fail(zerr(a.error));
      const p = await resolve(a.data.page);
      editable(p);
      const isOpen = !!open && open.id === p.id;
      const before = isOpen && typeof open.body === 'string' ? open.body : p.body;
      if (before.length > 200_000) fail('La página es demasiado grande para editarla desde el asistente.');
      try {
        const allowed = new Set([...before.matchAll(/<(Figure|FigRow|FigGrid|Tour|SearchTerms)\b[^>]*>/g)].map((m) => m[0]));
        const ops = [];
        for (const op of a.data.ops) {
          if (op.op === 'replace') {
            const problems = await mdxProblems(op.replace || ' ', { allowedRefs: allowed });
            if (problems.length) throw rejected(problems[0].slice(0, 200));
            ops.push(op);
          } else if (op.op === 'delete') ops.push(op);
          else {
            for (const b of op.blocks) {
              const own = mdxSecurityProblems({ body: rawTexts(b) });
              if (own.length) throw rejected(`incluye contenido no permitido (${own[0].message.slice(0, 120)})`);
              const stray = strayTags(rawTexts(b), new Set());
              if (stray.length) throw rejected(`incluye HTML en bruto (<${stray[0]}>) que no se permite`);
            }
            const mdx = op.blocks.map(renderBlock).join('\n\n');
            const problems = await mdxProblems(mdx + '\n');
            if (problems.length) throw rejected(problems[0].slice(0, 200));
            ops.push({ ...op, mdx });
          }
        }
        let after;
        try { after = applyOps(before, ops); } catch (e) { fail(e.message); }
        if (after === before) fail('Los cambios no modifican la página.');
        // Lo que se añada no puede empeorar la página: sin problemas de seguridad ni errores de validación nuevos.
        const sec = (b) => mdxSecurityProblems({ body: b }).map((x) => x.message);
        const oldSec = sec(before);
        const newSec = sec(after);
        if (newSec.length > oldSec.length) throw rejected(newSec[0].slice(0, 160));
        const errs = async (b) => (await validatePage({ body: b, frontmatter: undefined }, { assetExists: async () => true, tourStatus: async () => 'published' })).problems.filter((x) => x.level === 'error').map((x) => x.message);
        const oldErr = await errs(before);
        const newErr = await errs(after);
        if (newErr.length > oldErr.length) throw rejected(`el resultado tendría errores (${newErr.find((m) => !oldErr.includes(m)) ?? newErr[0]})`.slice(0, 200));
        addProposal({
          kind: 'edit', summary: `Editar «${p.title}» (${p.route}): ${ops.length} ${ops.length === 1 ? 'cambio' : 'cambios'}${p.status === 'published' ? '. Está publicada: se vería al instante.' : '.'}`,
          page: { id: p.id, title: p.title, route: p.route, status: p.status, version: p.version, isOpen }, baseVersion: p.version, hunk: changedHunk(before, after), after, motivo: a.data.motivo ?? '',
        });
        return `Propuesta registrada: editar «${p.title}» (${ops.length} cambios). La persona debe aprobarla.`;
      } catch (e) {
        if (e instanceof ToolError) throw e;
        note('edit', e);
        fail(`Propuesta rechazada: ${e.message}`);
      }
    },
    async ask_choice(args) {
      const a = ChoiceArgs.safeParse(args);
      if (!a.success) fail(zerr(a.error));
      const options = a.data.options.map((o) => (typeof o === 'string' ? { label: o, value: o } : { label: o.label, value: o.value ?? o.label }));
      for (const o of options) {
        if (/[<>{}]/.test(o.label + o.value) || !o.label.trim()) fail('Las opciones deben ser texto simple, sin HTML ni llaves.');
        if (mdxSecurityProblems({ body: o.value }).length) fail('Una opción no es válida.');
      }
      choice = { question: a.data.question.replace(/[<>{}]/g, ''), options };
      onEvent({ type: 'choices', choice });
      return 'Pregunta registrada: la persona verá las opciones. Termina tu respuesta ahora sin proponer nada más.';
    },
    async propose_move_page(args) {
      capCheck();
      const a = MoveArgs.safeParse(args);
      if (!a.success) fail(zerr(a.error));
      const d = a.data;
      const p = await resolve(d.page);
      editable(p);
      if (d.seccion === undefined && d.grupo === undefined && d.parent_id === undefined) fail('Indica a dónde mover: seccion, grupo y/o parent_id.');
      const seccion = d.seccion ?? p.seccion;
      let parent = null;
      if (d.parent_id != null) {
        if (d.parent_id === p.id) fail('Una página no puede ser su propia subsección.');
        const r = await db.query('SELECT id, title, seccion, grupo FROM pages WHERE id = $1 AND deleted_at IS NULL', [d.parent_id]);
        if (!r.rowCount) fail('La página padre indicada no existe.');
        if (r.rows[0].seccion !== seccion) fail('La página padre debe estar en la misma sección de destino.');
        parent = r.rows[0];
      }
      if (seccion !== p.seccion && (await db.query('SELECT 1 FROM pages WHERE parent_id = $1 AND deleted_at IS NULL LIMIT 1', [p.id])).rowCount) fail('La página tiene subsecciones; muévelas antes de cambiarla de sección.');
      let grupo = parent ? parent.grupo : d.grupo !== undefined ? d.grupo.replace(/[\u0000-\u001f]/g, ' ').trim() : p.grupo;
      if (!parent && d.grupo !== undefined && grupo) {
        const sec = (await loadOutline(ctx)).find((x) => x.key === seccion);
        const canon = resolveGroup(sec, grupo);
        if (canon !== null && d.new_group === true) fail('El grupo «' + grupo + '» ya existe (se llama «' + canon + '»): usa ese nombre exacto y quita new_group.');
        if (canon !== null) grupo = canon;
        else if (d.new_group !== true) fail('No existe el grupo «' + grupo + '» en la sección «' + seccion + '». Grupos existentes: ' + ((sec?.grupos ?? []).map((g) => '«' + g.name + '»').join(', ') || '(ninguno)') + '.');
      }
      const payload = {};
      if (seccion !== p.seccion) payload.seccion = seccion;
      if (grupo !== p.grupo) payload.grupo = grupo;
      if (d.parent_id !== undefined && (d.parent_id ?? null) !== (p.parent_id ?? null)) payload.parent_id = d.parent_id;
      if (!Object.keys(payload).length) fail('La página ya está ahí: no hay nada que mover.');
      const dest = `${seccion}${grupo ? ` › ${grupo}` : ''}${parent ? ` › debajo de «${parent.title}»` : ''}`;
      addProposal({
        kind: 'move', summary: `Mover «${p.title}» a ${dest} (al final).${p.status === 'published' ? ' Está publicada: el menú cambia al instante.' : ''}`,
        page: { id: p.id, title: p.title, route: p.route, status: p.status, seccion: p.seccion, grupo: p.grupo }, to: { seccion, grupo, parentId: parent?.id ?? null, parentTitle: parent?.title ?? null }, payload, motivo: d.motivo ?? '',
      });
      return `Propuesta registrada: mover «${p.title}» a ${dest}. La persona debe aprobarla.`;
    },
  };

  /** Ejecuta una herramienta. Nunca lanza por un error del modelo: lo devuelve como texto para que lo corrija. */
  async function run(name, rawArgs) {
    if (!Object.hasOwn(tools, name)) return `Error: la herramienta «${String(name).slice(0, 40)}» no existe.`;
    let args = {};
    try {
      args = rawArgs && String(rawArgs).trim() ? JSON.parse(rawArgs) : {};
    } catch {
      return 'Error: los argumentos no son JSON válido.';
    }
    const label = activityLabel(name, args);
    const aid = ++calls;
    onEvent({ type: 'activity', id: aid, tool: name, label, state: 'start' });
    try {
      const out = await tools[name](args);
      onEvent({ type: 'activity', id: aid, tool: name, label, state: 'done' });
      return String(out).slice(0, 9000);
    } catch (e) {
      onEvent({ type: 'activity', id: aid, tool: name, label, state: 'failed' });
      if (e instanceof ToolError) return `Error: ${e.message}`;
      throw e;
    }
  }
  return { run, proposals, rejected: rejectedList, get choice() { return choice; }, CHAT_LIMITS };
}
