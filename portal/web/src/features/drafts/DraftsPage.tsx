/* Borradores: páginas nuevas que aún no están en el manual. Publicar = sacarlas a la luz (una, varias o todas). */
import { useEffect, useMemo, useState } from 'react';
import { CloudUpload, FilePen } from 'lucide-react';
import { Button, Callout, Checkbox, ConfirmDialog, EmptyState, ErrorState, Pager, Spinner, TBody, TD, TH, THead, TR, Table, useToast } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { api, type PageRow } from '@/lib/api';
import { siteApi, type PublishDraftsResult, type SkippedPage } from '@/lib/api.site';
import { can, errText, useAuth } from '@/lib/auth';
import { useAsync, useWindowEvent } from '@/lib/hooks';
import { CONTENT_EVENT, SECCIONES, contentChanged, fmtDate, go, relTime } from '@/lib/util';

const LIMIT = 50;

export default function DraftsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = can(user, 'editor');
  const isAdmin = can(user, 'admin');
  const [offset, setOffset] = useState(0);
  const list = useAsync(() => api.pages({ status: 'draft', limit: LIMIT, offset }), [offset]);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [result, setResult] = useState<PublishDraftsResult | null>(null);
  useWindowEvent(CONTENT_EVENT, list.reload);
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  // Si la última página queda vacía tras publicar, vuelve atrás.
  useEffect(() => { if (list.data && !list.data.items.length && offset > 0) setOffset(Math.max(0, offset - LIMIT)); }, [list.data, offset]);

  const pageIds = useMemo(() => items.map((p) => p.id), [items]);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => sel.has(id));
  const toggle = (id: number, on: boolean) => setSel((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const togglePage = (on: boolean) => setSel((s) => { const n = new Set(s); for (const id of pageIds) { if (on) n.add(id); else n.delete(id); } return n; });

  const run = async (b: { ids?: number[]; force?: boolean }) => {
    setBusy(true);
    try {
      const r = await siteApi.publishDrafts(b);
      setResult(r);
      setSel(new Set());
      if (r.count) { toast(`${r.count === 1 ? 'Se publicó 1 página' : `Se publicaron ${r.count} páginas`} · el manual se actualiza en unos segundos`); contentChanged(); }
      else toast('No se publicó ninguna página', 'info');
      list.reload();
    } catch (e) { toast(errText(e), 'error'); }
    finally { setBusy(false); }
  };

  const titleOf = (s: SkippedPage) => items.find((p) => p.id === s.id)?.title ?? s.route ?? `Página ${s.id}`;
  const forcible = result?.skipped.filter((s) => s.problems?.length) ?? [];

  return (
    <Page title="Borradores" description="Las páginas nuevas nacen como borrador y no aparecen en el manual hasta que las publique. Publicar es lo único que las saca a la luz."
      actions={canEdit && total > 0 ? <Button variant="primary" disabled={busy} onClick={() => setConfirmAll(true)}><CloudUpload size={16} /> Publicar todas ({total})</Button> : undefined}>
      {result && (
        <div className="mb-4 flex flex-col gap-2" role="status">
          {result.count > 0 && <Callout tone="ok"><strong>{result.count === 1 ? 'Se publicó 1 página.' : `Se publicaron ${result.count} páginas.`}</strong> El manual se actualiza solo en unos segundos.</Callout>}
          {result.skipped.length > 0 && (
            <Callout tone="warn" action={isAdmin && forcible.length ? <Button size="sm" disabled={busy} onClick={() => void run({ ids: forcible.map((s) => s.id), force: true })}>Publicar de todos modos</Button> : undefined}>
              <strong>{result.skipped.length === 1 ? 'No se publicó 1 página:' : `No se publicaron ${result.skipped.length} páginas:`}</strong>
              <ul className="m-0 mt-1.5 list-disc space-y-1 pl-5">
                {result.skipped.map((s) => (
                  <li key={s.id}><a href={`#/contenido/${s.id}`}>{titleOf(s)}</a> · {s.reason}
                    {s.problems?.length ? <ul className="m-0 mt-0.5 list-[circle] pl-4 text-ink-2">{s.problems.slice(0, 4).map((p, i) => <li key={i}>{p.message}{p.line != null ? ` (línea ${p.line})` : ''}</li>)}{s.problems.length > 4 && <li>y {s.problems.length - 4} más…</li>}</ul> : null}
                  </li>
                ))}
              </ul>
            </Callout>
          )}
        </div>
      )}

      {list.loading && !list.data ? <Spinner block label="Cargando borradores…" /> : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
        : !items.length ? (
          <EmptyState icon={<FilePen size={20} />} title="No hay borradores" action={<Button asChild><a href="#/contenido">Ir a Páginas</a></Button>}>
            Las páginas nuevas nacen como borrador hasta que las publiques. Cuando crees una, aparecerá aquí.
          </EmptyState>
        ) : (
          <>
            {canEdit && (
              <div className="mb-3 flex flex-wrap items-center gap-2.5 text-sm" aria-live="polite">
                <span className="text-ink-3">{sel.size ? `${sel.size} seleccionadas` : `${total} ${total === 1 ? 'borrador' : 'borradores'}`}</span>
                <Button variant="primary" size="sm" disabled={!sel.size || busy} onClick={() => void run({ ids: [...sel] })}><CloudUpload size={14} /> Publicar seleccionadas</Button>
                {sel.size > 0 && <Button variant="ghost" size="sm" onClick={() => setSel(new Set())}>Quitar selección</Button>}
              </div>
            )}
            <Table dim={list.loading}>
              <THead><tr>
                {canEdit && <TH narrow><Checkbox checked={allOnPage} onCheckedChange={togglePage} label={<span className="sr-only">Seleccionar todas las de esta página</span>} /></TH>}
                <TH>Título</TH><TH hide="md">Sección › grupo</TH><TH hide="sm">Última edición</TH><TH hide="md">Quién</TH>
              </tr></THead>
              <TBody>{items.map((p: PageRow) => (
                <TR key={p.id} onClick={() => go(`/contenido/${p.id}`)}>
                  {canEdit && <TD narrow className="w-px"><Checkbox checked={sel.has(p.id)} onCheckedChange={(v) => toggle(p.id, v)} label={<span className="sr-only">Seleccionar {p.title}</span>} /></TD>}
                  <TD><a href={`#/contenido/${p.id}`} className="font-medium">{p.title || '(sin título)'}</a><div className="text-xs text-ink-3">{p.route}</div></TD>
                  <TD hide="md" muted>{SECCIONES[p.seccion] ?? p.seccion}{p.grupo ? ` › ${p.grupo}` : ''}</TD>
                  <TD hide="sm" className="whitespace-nowrap" title={fmtDate(p.updated_at)}>{relTime(p.updated_at)}</TD>
                  <TD hide="md" muted>{p.updated_by_name ?? '—'}</TD>
                </TR>
              ))}</TBody>
            </Table>
            <Pager total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        )}

      <ConfirmDialog open={confirmAll} onOpenChange={setConfirmAll} title="Publicar todos los borradores" confirmLabel={`Publicar ${total}`}
        onConfirm={async () => { setConfirmAll(false); await run({}); }}>
        Se publicarán las {total} páginas en borrador y aparecerán en el manual. Las que tengan errores que romperían el sitio se omiten y se las mostramos para corregirlas.
      </ConfirmDialog>
    </Page>
  );
}
