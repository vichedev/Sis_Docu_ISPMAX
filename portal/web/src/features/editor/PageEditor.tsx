/*
 * Edición de una página dentro del espacio de contenido:
 * centro = título grande, descripción y pestañas Bloques | Código MDX | Vista previa | Revisiones,
 * franja de validación abajo; derecha = panel plegable con dos pestañas: «Bloques» (paleta para insertar, solo
 * editores) y «En esta página» (esquema + propiedades). Por debajo de 1280 px el panel va en un Sheet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, CircleAlert, CircleCheck, CloudUpload, Copy, Ellipsis, ExternalLink, FilePen, FolderInput, LayoutGrid, ListTree, LoaderCircle, PanelRightClose, PanelRightOpen, Save, Trash2 } from 'lucide-react';
import { Badge, Button, Callout, ConfirmDialog, Dialog, DropdownMenu, ErrorState, IconButton, ImagePicker, Sheet, Spinner, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, useToast } from '@/components/ui';
import { useBreadcrumbs } from '@/components/layout/Page';
import { api, ApiError, type Asset, type Page, type Problem } from '@/lib/api';
import { problemsOf, siteApi } from '@/lib/api.site';
import { SiteInline, useSite } from '@/features/system/site';
import { can, errText, useAuth } from '@/lib/auth';
import { figureSnippet } from '@/lib/assets';
import { useAsync, useDebounced, useHotkeys, useLocalStorage, useMediaQuery, useUnsavedChanges } from '@/lib/hooks';
import type { OutlineItem } from '@/lib/mdx';
import { outline as blockOutline, parseMdx } from '@/lib/blocks/index.ts';
import { SECCIONES, contentChanged, fmtDate, pushRecent, relTime, slugify } from '@/lib/util';
import { cn } from '@/lib/cn';
import type { usePageActions } from '@/features/pages/pageActions';
import { BlockEditor, BlockPreview, type BlockEditorHandle } from './BlockEditor';
import { blockLines } from './model/doc';
import { MdxCodeEditor } from './MdxCodeEditor';
import { OutlinePanel, type PageForm } from './OutlinePanel';
import { RevisionsTab } from './RevisionsTab';
import { BlockPalette } from './palette/BlockPalette';
import { siteHref } from '@/lib/siteHref';

type Side = 'blocks' | 'outline';

const toForm = (p: Page): PageForm => ({
  title: p.title ?? '', description: p.description ?? '', grupo: p.grupo ?? '', orden: String(p.orden ?? ''),
  status: p.status, fm: JSON.stringify(p.frontmatter ?? {}, null, 2), body: p.body ?? '',
});
const imageFolder = (p: Page) => { const parts = p.route.split('/').filter(Boolean); return 'imgs/' + (parts.length ? parts.map(slugify).join('/') : 'general'); };
type Tab = 'blocks' | 'code' | 'preview' | 'revisions';

export function PageEditor({ id, actions, onOpenTree }: { id: number; actions: ReturnType<typeof usePageActions>; onOpenTree: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const { status: site } = useSite();
  const isAdmin = can(user, 'admin');
  const { data: page, error, loading, reload, setData } = useAsync(() => api.page(id), [id]);
  /** Las portadas de sección (`generado: true`) se generan solas a partir del menú: solo lectura. */
  const generated = page?.frontmatter?.generado === true;
  const canEdit = can(user, 'editor') && !generated;
  const canAct = can(user, 'editor');
  const [form, setForm] = useState<PageForm | null>(null);
  const [base, setBase] = useState<PageForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [validating, setValidating] = useState(false);
  const [probOpen, setProbOpen] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [pubProblems, setPubProblems] = useState<Problem[] | null>(null);
  const [confirmUnpub, setConfirmUnpub] = useState(false);
  const [folder, setFolder] = useState('');
  const [tab, setTab] = useLocalStorage<Tab>('portal-editor-tab', 'blocks');
  const [panel, setPanel] = useLocalStorage('portal-editor-outline', true);
  const [panelSheet, setPanelSheet] = useState(false);
  const [picker, setPicker] = useState<((a: Asset | null) => void) | null>(null);
  const wide = useMediaQuery('(min-width: 1280px)');
  const blocksRef = useRef<BlockEditorHandle>(null);
  const codeRef = useRef<BlockEditorHandle>(null);
  const [blocksSafe, setBlocksSafe] = useState(true);
  const [side, setSide] = useLocalStorage<Side>('portal-editor-side', 'blocks');
  const sideTab: Side = canEdit ? side : 'outline';
  const [target, setTarget] = useState<string | null>(null);
  /** Paleta: inserta en el lienzo (si se estaba en otra pestaña, primero vuelve al lienzo para que lea el texto actual). */
  const insertFromPalette = (cmd: string) => {
    setPanelSheet(false);
    if (tab !== 'blocks') { setTab('blocks'); requestAnimationFrame(() => requestAnimationFrame(() => blocksRef.current?.insert?.(cmd))); return; }
    blocksRef.current?.insert?.(cmd);
  };
  const openPalette = () => { setSide('blocks'); if (wide) setPanel(true); else setPanelSheet(true); };
  /** Editor a la vista para saltar a una línea (esquema y validación): el lienzo o el código. */
  const jumpTo = (line: number) => {
    const t = tab === 'blocks' || tab === 'code' ? tab : 'blocks';
    if (t !== tab) setTab(t);
    requestAnimationFrame(() => (t === 'blocks' ? blocksRef : codeRef).current?.focusLine(line));
  };
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!page) return;
    const f = toForm(page); setForm(f); setBase(f); setFolder(imageFolder(page));
    pushRecent({ id: page.id, title: page.title, route: page.route });
  }, [page]);

  const crumbs = useMemo(() => {
    if (!page) return [{ label: 'Contenido', href: '#/contenido' }, { label: '…' }];
    return [{ label: 'Contenido', href: '#/contenido' }, { label: SECCIONES[page.seccion] ?? page.seccion }, ...(page.grupo ? [{ label: page.grupo }] : []), { label: form?.title || page.title }];
  }, [page, form?.title]);
  useBreadcrumbs(crumbs);

  const dirty = !!form && !!base && JSON.stringify(form) !== JSON.stringify(base);
  useUnsavedChanges(dirty);
  const set = useCallback(<K extends keyof PageForm>(k: K, v: PageForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f)), []);

  /* Validación en vivo */
  const dBody = useDebounced(form?.body ?? '', 800);
  const dFm = useDebounced(form?.fm ?? '', 800);
  const fmParsed = useMemo(() => { try { return { ok: true as const, value: JSON.parse(form?.fm || '{}') as Record<string, unknown> }; } catch (e) { return { ok: false as const, error: (e as Error).message }; } }, [form?.fm]);
  useEffect(() => {
    if (!page) return;
    let alive = true;
    let fm: unknown;
    try { fm = JSON.parse(dFm || '{}'); } catch { return; }
    setValidating(true);
    api.validate(dBody, fm).then((r) => { if (alive) setProblems(r.problems ?? []); }).catch(() => { if (alive) setProblems([]); }).finally(() => { if (alive) setValidating(false); });
    return () => { alive = false; };
  }, [dBody, dFm, page]);

  /** Guarda la página; devuelve la página guardada, o null si no se guardó. */
  const save = useCallback(async (force = false, quiet = false): Promise<Page | null> => {
    if (!page || !form || !canEdit || saving) return null;
    if (!force && !dirty) { if (!quiet) toast('No hay cambios que guardar', 'info'); return page; }
    if (!fmParsed.ok) { toast('El frontmatter avanzado no es JSON válido', 'error'); setPanel(true); return null; }
    if (!blocksSafe && tab === 'blocks' && base && form.body !== base.body) { toast('El constructor no puede garantizar este cuerpo: guarde desde Código MDX', 'error'); return null; }
    setSaving(true);
    try {
      const version = force ? (await api.page(id)).version : page.version;
      const fm = { ...fmParsed.value };
      if ('title' in fm) fm.title = form.title;
      if ('description' in fm) fm.description = form.description;
      const orden = Number(form.orden);
      const p = await api.savePage(id, { title: form.title, description: form.description, // grupo y orden solo si cambiaron: el servidor rechaza grupo null y los escribe en el frontmatter.
        grupo: base && form.grupo !== base.grupo ? form.grupo : undefined, orden: base && form.orden !== base.orden && Number.isFinite(orden) && form.orden !== '' ? orden : undefined, frontmatter: fm, body: form.body, status: form.status, version });
      setData(p); setConflict(false); contentChanged();
      if (!quiet) toast(p.status === 'published' ? (site?.autoPublish === false ? 'Guardado · pulse «Actualizar ahora» para que el manual lo muestre' : 'Guardado · el manual se actualiza en unos segundos') : 'Borrador guardado · no aparece en el manual hasta que lo publique');
      return p;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(true); else toast(errText(e), 'error');
      return null;
    } finally { setSaving(false); }
  }, [site?.autoPublish, page, form, base, dirty, canEdit, saving, fmParsed, blocksSafe, tab, id, setData, toast, setPanel]);
  useHotkeys({ 'mod+s': () => void save() });

  /** Publicar una página en borrador (guarda antes si hay cambios). `force`: solo administración, tras ver los problemas. */
  const publish = async (force = false) => {
    if (!page || !canAct || pubBusy) return;
    setPubBusy(true);
    try {
      const saved = await save(false, true);
      if (!saved) return;
      const p = await siteApi.publishPage(id, { version: saved.version, force: force || undefined });
      setData(p); setPubProblems(null); contentChanged();
      toast('Publicada · el manual se actualiza en unos segundos');
    } catch (e) {
      const pr = problemsOf(e);
      if (e instanceof ApiError && e.status === 400 && pr.length) setPubProblems(pr);
      else if (e instanceof ApiError && e.status === 409) setConflict(true);
      else toast(errText(e), 'error');
    } finally { setPubBusy(false); }
  };
  const unpublish = async () => {
    if (!page || pubBusy) return;
    setConfirmUnpub(false); setPubBusy(true);
    try {
      const saved = await save(false, true);
      if (!saved) return;
      const p = await siteApi.unpublishPage(id, { version: saved.version });
      setData(p); contentChanged();
      toast('La página pasó a borrador y se quitó del manual');
    } catch (e) { toast(errText(e), 'error'); } finally { setPubBusy(false); }
  };

  const uploadImage = useCallback(async (f: File) => { const r = await api.uploadAsset(f, folder); contentChanged(); return r; }, [folder]);
  const onFiles = async (files: File[]) => {
    const out: string[] = [];
    for (const f of files.filter((x) => x.type.startsWith('image/'))) {
      try { const r = await uploadImage(f); out.push(r.snippet); toast(`Imagen subida: ${r.path}`); } catch (e) { toast(errText(e), 'error'); }
    }
    if (!out.length && files.length) toast('Solo se pueden subir imágenes', 'error');
    return out;
  };
  const pickImage = () => new Promise<Asset | null>((resolve) => setPicker(() => resolve));

  /* «En esta página»: encabezados ## y ### del motor de bloques, con la línea de su bloque. */
  const outlineData = useMemo(() => {
    const blocks = parseMdx(form?.body ?? '');
    const lines = new Map(blockLines(blocks).map((l) => [l.id, l.start]));
    return blockOutline(blocks, { minLevel: 2, maxLevel: 3 }).map((o) => ({ level: o.level, text: o.label, line: lines.get(o.blockId) ?? 1, index: o.index }));
  }, [form?.body]);
  const outline: OutlineItem[] = outlineData;
  const onJump = (o: OutlineItem, i: number) => {
    setPanelSheet(false);
    if (tab === 'preview') { previewRef.current?.querySelector(`[data-block-index="${outlineData[i]?.index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    jumpTo(o.line);
  };

  if (loading && !page) return <div className="flex-1 p-8"><Spinner block /></div>;
  if (error || !page || !form) return <div className="flex-1 p-8"><ErrorState error={error} onRetry={reload} /></div>;
  const errs = problems.filter((p) => p.level === 'error').length;
  const warns = problems.length - errs;

  const outlinePanel = <OutlinePanel page={page} form={form} set={set} outline={outline} onJump={onJump} canEdit={canEdit} folder={folder} setFolder={setFolder} fmError={fmParsed.ok ? undefined : fmParsed.error} />;
  const paletteOff = !blocksSafe ? <>Esta página solo se puede editar en <b className="font-medium text-ink-2">Código MDX</b>: el constructor no reproduce su formato byte a byte.</> : undefined;
  /** Panel lateral: «Añadir bloque» (paleta) y «En esta página». `sheet`: dentro del panel móvil (sin arrastre). */
  const sidePanel = (sheet: boolean) => (
    <Tabs value={sideTab} onValueChange={(v) => setSide(v as Side)} className="flex min-h-0 flex-1 flex-col">
      <TabsList size="sm" aria-label="Panel de la página" className="h-12 shrink-0 items-end px-4">
        {canEdit && <TabsTrigger value="blocks" size="sm"><LayoutGrid size={14} /> Añadir bloque</TabsTrigger>}
        <TabsTrigger value="outline" size="sm">En esta página</TabsTrigger>
      </TabsList>
      {canEdit && <TabsContent value="blocks" className="flex min-h-0 flex-1 flex-col"><BlockPalette className="min-h-0 flex-1" onInsert={insertFromPalette} target={tab === 'blocks' ? target : null} disabled={paletteOff} draggable={!sheet} /></TabsContent>}
      <TabsContent value="outline" className="min-h-0 flex-1 overflow-y-auto">{outlinePanel}</TabsContent>
    </Tabs>
  );
  const ref ={ id: page.id, title: page.title, route: page.route, seccion: page.seccion, grupo: page.grupo };

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {/* Centro */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 max-sm:gap-1 max-sm:px-2 lg:px-5">
          <Button variant="ghost" size="sm" className="-ml-1 lg:hidden" onClick={onOpenTree} aria-label="Páginas del manual"><ListTree size={16} /><span className="max-sm:hidden">Páginas</span></Button>
          <StatusBadge status={page.status} />
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-3" aria-live="polite">
            {saving ? <><LoaderCircle size={14} className="animate-spin" /> Guardando…</> : dirty ? <Badge tone="warn" dot>Sin guardar</Badge> : <span title={fmtDate(page.updated_at)} className="whitespace-nowrap max-xl:hidden">Guardado {relTime(page.updated_at)}</span>}
          </span>
          <span className="flex-1" />
          {page.status === 'published' && <Button variant="ghost" size="sm" asChild className="max-md:hidden"><a href={siteHref(page.route, site?.siteUrl)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Ver en el sitio</a></Button>}
          <DropdownMenu label="Más acciones" items={[
            ...(canAct ? [
              { label: 'Duplicar', icon: <Copy size={16} />, onSelect: () => void actions.duplicate(ref) },
              ...(!generated ? [{ label: 'Mover o cambiar dirección…', icon: <FolderInput size={16} />, onSelect: () => actions.move(ref) }] : []),
              ...(page.status === 'published' && page.seccion !== 'raiz' && !generated ? [{ label: 'Pasar a borrador…', icon: <FilePen size={16} />, onSelect: () => setConfirmUnpub(true) }] : []),
              { separator: true } as const,
              ...(!generated ? [{ label: 'Eliminar…', icon: <Trash2 size={16} />, danger: true, onSelect: () => actions.remove(ref) }] : []),
            ] : [{ label: 'Solo lectura: rol de lector', disabled: true }]),
          ]} trigger={<IconButton label="Más acciones" icon={<Ellipsis size={16} />} />} />
          {canEdit && blocksSafe && (
            <Button variant="ghost" size="sm" onClick={openPalette} aria-pressed={wide ? panel && sideTab === 'blocks' : undefined} data-testid="open-palette"
              title="Paleta de bloques: título, imagen, tour, aviso, tabla…" aria-label="Añadir bloque"><LayoutGrid size={15} /><span className="max-md:hidden">Añadir bloque</span></Button>
          )}
          <IconButton label={panel ? 'Ocultar el panel lateral' : 'Mostrar el panel lateral'} aria-pressed={wide ? panel : undefined}
            icon={wide && panel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />} onClick={() => (wide ? setPanel(!panel) : setPanelSheet(true))} />
          {canEdit && page.status === 'draft' && (
            <Button variant="secondary" disabled={!dirty || saving || pubBusy} onClick={() => void save()} title="Guardar el borrador (Ctrl+S)" aria-label="Guardar borrador"><Save size={16} /><span className="max-md:hidden">Guardar borrador</span></Button>
          )}
          {canEdit && page.status === 'draft' && (
            <Button variant="primary" disabled={saving || pubBusy} onClick={() => void publish()} title="Publicar: la página aparece en el manual" aria-label="Publicar">
              {pubBusy ? <LoaderCircle size={16} className="animate-spin" /> : <CloudUpload size={16} />}<span className="max-[380px]:hidden">Publicar</span>
            </Button>
          )}
          {canEdit && page.status !== 'draft' && <Button variant="primary" disabled={!dirty || saving || pubBusy} onClick={() => void save()} title="Guardar (Ctrl+S)" aria-label="Guardar"><Save size={16} /><span className="max-[380px]:hidden">Guardar</span></Button>}
        </div>

        <div data-scroll className="min-h-0 flex-1 overflow-y-auto" data-coach="editor">
          <div className="mx-auto w-full max-w-[860px] px-8 pb-16 pt-7 max-md:px-4 max-md:pt-5">
            {generated && <Callout tone="info" className="mb-4"><strong>Esta portada se genera sola a partir del menú.</strong> Para cambiar lo que muestra, edite las páginas de la sección.</Callout>}
            {!generated && page.status === 'draft' && canAct && <Callout tone="info" className="mb-4"><strong>Borrador.</strong> No aparece en el manual. Pulse <b>Publicar</b> cuando esté lista; mientras tanto, guardar no cambia el sitio.</Callout>}
            <input aria-label="Título de la página" value={form.title} readOnly={!canEdit} onChange={(e) => set('title', e.target.value)} placeholder="Título de la página"
              className="w-full border-0 bg-transparent p-0 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink outline-none placeholder:text-ink-4 focus-visible:outline-none max-sm:text-2xl" />
            <Textarea aria-label="Descripción" value={form.description} readOnly={!canEdit} onChange={(e) => set('description', e.target.value)} rows={1} placeholder="Añada una frase que resuma la página…"
              className="mt-1.5 resize-none border-0 bg-transparent p-0 text-[15px] text-ink-3 [field-sizing:content] read-only:bg-transparent hover:border-0 focus:ring-0 focus-visible:outline-none" />
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-5">
              <TabsList aria-label="Modo de edición" className="mb-4">
                <TabsTrigger value="blocks">Bloques</TabsTrigger>
                <TabsTrigger value="code">Código MDX</TabsTrigger>
                <TabsTrigger value="preview">Vista previa</TabsTrigger>
                <TabsTrigger value="revisions">Revisiones</TabsTrigger>
              </TabsList>
              <TabsContent value="blocks" forceMount>
                <BlockEditor ref={blocksRef} value={form.body} onChange={(v) => set('body', v)} readOnly={!canEdit} uploadImage={uploadImage} pickImage={pickImage} problems={problems}
                  active={tab === 'blocks'} onSafety={setBlocksSafe} onTarget={setTarget} />
              </TabsContent>
              <TabsContent value="code">
                <MdxCodeEditor ref={codeRef} value={form.body} onChange={(v) => set('body', v)} readOnly={!canEdit} onFiles={onFiles} onPick={async () => { const a = await pickImage(); return a ? figureSnippet(a) : null; }} />
              </TabsContent>
              <TabsContent value="preview">
                <div ref={previewRef}>
                  <p className="mb-5 border-b border-dashed border-line pb-3 text-sm text-ink-3">Vista previa aproximada: el sitio publicado puede verse algo distinto.</p>
                  {tab === 'preview' && <BlockPreview value={form.body} />}
                </div>
              </TabsContent>
              <TabsContent value="revisions">
                <RevisionsTab pageId={page.id} version={page.version} canEdit={canEdit} onRestored={reload} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className={cn('shrink-0 border-t border-line bg-subtle', errs ? 'text-danger' : warns ? 'text-warn' : 'text-ink-2')}>
          <button type="button" onClick={() => setProbOpen((o) => !o)} aria-expanded={probOpen} disabled={!problems.length}
            className="flex h-[34px] w-full cursor-pointer items-center gap-2 px-4 text-left text-[12.5px] font-medium disabled:cursor-default">
            {validating ? <><LoaderCircle size={14} className="animate-spin" /> Validando…</>
              : !problems.length ? <><CircleCheck size={14} className="text-ok" /> Sin problemas</>
              : <><CircleAlert size={14} /> {[errs && `${errs} ${errs === 1 ? 'error' : 'errores'}`, warns && `${warns} ${warns === 1 ? 'aviso' : 'avisos'}`].filter(Boolean).join(' · ')}</>}
            <span className="flex-1" />
            {page.status === 'published' && !generated && <SiteInline className="mr-3 max-sm:hidden" />}
            <span className="font-normal text-ink-3 max-sm:hidden">{form.body.split('\n').length} líneas</span>
            {problems.length > 0 && (probOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
          </button>
          {probOpen && problems.length > 0 && (
            <ul className="m-0 max-h-40 list-none overflow-y-auto p-0 pb-1.5 text-ink">
              {problems.map((p, i) => (
                <li key={i}><button type="button" onClick={() => { if (p.line) jumpTo(p.line); }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-1.5 text-left text-sm hover:bg-muted">
                  <Badge tone={p.level === 'error' ? 'danger' : 'warn'} dot>{p.level === 'error' ? 'Error' : 'Aviso'}</Badge>
                  <span className="flex-1">{p.message}</span>{p.line != null && <span className="whitespace-nowrap text-ink-3">línea {p.line}</span>}
                </button></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Derecha */}
      {wide && panel && <aside aria-label="Panel de la página" data-coach="outline" className="flex w-[288px] shrink-0 flex-col border-l border-line bg-side">
        {sidePanel(false)}
      </aside>}
      {!wide && <Sheet open={panelSheet} onOpenChange={setPanelSheet} side="right" title={canEdit ? 'Bloques y esquema' : 'En esta página'}>{sidePanel(true)}</Sheet>}

      <ConfirmDialog open={confirmUnpub} onOpenChange={setConfirmUnpub} danger confirmLabel="Pasar a borrador" title="Pasar a borrador" onConfirm={unpublish}>
        La página <b>se quitará del manual</b> (se actualiza en unos segundos) y quedará como borrador. No se pierde nada: podrá volver a publicarla.
      </ConfirmDialog>
      <Dialog open={!!pubProblems} onOpenChange={(o) => { if (!o) setPubProblems(null); }} title="No se puede publicar todavía" footer={<>
        <Button className="mr-auto" onClick={() => setPubProblems(null)}>Corregir primero</Button>
        {isAdmin && <Button variant="danger" disabled={pubBusy} onClick={() => void publish(true)}>Publicar de todos modos</Button>}
      </>}>
        <p className="mb-2">La página tiene errores que podrían romper el manual. Corríjalos y vuelva a publicar:</p>
        <ul className="m-0 list-none space-y-1.5 p-0" aria-label="Problemas encontrados">
          {pubProblems?.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm"><Badge tone="danger" dot>Error</Badge><span className="flex-1">{p.message}</span>{p.line != null && <button type="button" className="cursor-pointer whitespace-nowrap text-accent-ink underline" onClick={() => { setPubProblems(null); jumpTo(p.line!); }}>línea {p.line}</button>}</li>
          ))}
        </ul>
        {!isAdmin && <p className="mt-3 text-sm text-ink-3">Solo una persona administradora puede publicar con errores.</p>}
      </Dialog>
      <ImagePicker open={!!picker} onOpenChange={(o) => { if (!o) { picker?.(null); setPicker(null); } }} onSelect={(a) => { picker?.(a); setPicker(null); }} />
      <Dialog open={conflict} onOpenChange={setConflict} title="Otra persona guardó esta página" footer={<>
        <Button className="mr-auto" onClick={() => setConflict(false)}>Seguir editando</Button>
        <Button onClick={() => { setConflict(false); reload(); }}>Recargar y descartar lo mío</Button>
        <Button variant="danger" onClick={() => void save(true)}>Guardar encima</Button>
      </>}>
        <p className="mb-2">Alguien guardó una versión nueva después de que usted la abriera.</p>
        <ul className="m-0 list-disc space-y-1 pl-5 text-ink-2"><li><b>Recargar</b> trae la versión más reciente y descarta sus cambios.</li><li><b>Guardar encima</b> guarda su texto sobre la versión nueva; la otra queda en Revisiones.</li></ul>
      </Dialog>
    </div>
  );
}
