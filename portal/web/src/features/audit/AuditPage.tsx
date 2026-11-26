/* Auditoría agrupada por día, en lenguaje llano, con filtro por tipo de acción. */
import { Fragment, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Button, EmptyState, ErrorState, Pager, Select, SkeletonRows, TBody, TD, TH, THead, Table } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { ACTION_GROUPS, ACTION_LABEL, fmtDate, fmtDay, fmtTime } from '@/lib/util';

const LIMIT = 50;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function Detail({ d }: { d: unknown }) {
  if (d == null || d === '') return null;
  if (typeof d !== 'object') return <span>{String(d)}</span>;
  const entries = Object.entries(d as Record<string, unknown>).filter(([, v]) => v != null && v !== '');
  return <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-ink-2">{entries.slice(0, 6).map(([k, v]) => <span key={k} className="break-all"><span className="text-ink-3">{k}</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>)}</span>;
}

export default function AuditPage() {
  const [action, setAction] = useState('all');
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useAsync(() => api.audit({ limit: LIMIT, offset, action: action === 'all' ? '' : action }), [action, offset]);
  const total = data?.total ?? (data ? offset + data.items.length + (data.items.length === LIMIT ? 1 : 0) : 0);
  let lastDay = '';
  return (
    <Page title="Auditoría" width="wide" description="Lo que se hizo en el portal, del más reciente al más antiguo.">
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <Select className="w-full sm:w-72" aria-label="Tipo de acción" value={action} onValueChange={(v) => { setAction(v); setOffset(0); }}
          groups={[{ label: 'General', options: [{ value: 'all', label: 'Todas las acciones' }] }, ...ACTION_GROUPS.map((g) => ({ label: g.label, options: g.actions.map((a) => ({ value: a, label: cap(ACTION_LABEL[a] ?? a) })) }))]} />
        <span className="flex-1" />
        {data && <span className="text-sm text-ink-3">{total} {total === 1 ? 'evento' : 'eventos'}</span>}
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={8} cols={3} /> : !data?.items.length ? (
        <EmptyState icon={<ScrollText size={20} />} title={action !== 'all' ? 'Sin eventos de este tipo' : 'Sin eventos todavía'} action={action !== 'all' && <Button onClick={() => setAction('all')}>Ver todas</Button>}>
          {action !== 'all' ? 'Elija otra acción o vea todas.' : 'Cada cambio que se haga en el portal quedará aquí.'}
        </EmptyState>
      ) : (
        <>
          <Table dim={loading}>
            <THead><tr><TH className="w-16">Hora</TH><TH>Quién y qué</TH><TH hide="md">Detalle</TH></tr></THead>
            <TBody>{data.items.map((r) => {
              const day = fmtDay(r.created_at);
              const head = day !== lastDay;
              lastDay = day;
              return (
                <Fragment key={r.id}>
                  {head && <tr><th colSpan={3} scope="rowgroup" className="border-b border-line bg-side px-4 py-1.5 text-left text-[12.5px] font-semibold text-ink-2">{cap(day)}</th></tr>}
                  <tr>
                    <TD numeric muted className="align-top" title={fmtDate(r.created_at)}>{fmtTime(r.created_at)}</TD>
                    <TD className="align-top"><strong className="font-medium">{r.user_name || r.username || 'Sistema'}</strong> {ACTION_LABEL[r.action] ?? r.action}{r.target && <> <code className="break-all">{r.target}</code></>}
                      <span className="block font-mono text-xs text-ink-3">{r.action}</span></TD>
                    <TD hide="md" className="align-top text-sm"><Detail d={r.detail} /></TD>
                  </tr>
                </Fragment>
              );
            })}</TBody>
          </Table>
          <Pager total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
        </>
      )}
    </Page>
  );
}
