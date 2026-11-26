/* Navegación principal agrupada por tarea. `rail`: solo iconos (espacio de contenido). */
import type { ReactElement } from 'react';
import { CircleHelp, ExternalLink, Keyboard, PanelLeftClose, PanelLeftOpen, Route as RouteIcon } from 'lucide-react';
import { DropdownMenu, Tag, Tooltip } from '@/components/ui';
import { can, useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { NAV, type RouteName } from '@/routes';
import { siteHref } from '@/lib/siteHref';

const itemCls = 'flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2.5 text-left text-[13.5px] text-ink-2 no-underline hover:bg-muted hover:text-ink hover:no-underline [&>svg]:text-ink-3';

export function AppSidebar({ active, rail, onToggleRail, onTour, onShortcuts, className }: {
  active: RouteName; rail: boolean; onToggleRail?: () => void; onTour: () => void; onShortcuts: () => void; className?: string;
}) {
  const { user } = useAuth();
  const wrap = (label: string, el: ReactElement) => (rail ? <Tooltip content={label} side="right">{el}</Tooltip> : el);
  return (
    <div className={cn('flex h-full flex-col bg-side', className)}>
      <div className={cn('flex h-[52px] shrink-0 items-center border-b border-line', rail ? 'justify-center' : 'px-3.5')}>
        <a href="#/" className="flex min-w-0 items-center gap-2.5 text-ink no-underline hover:no-underline" aria-label={rail ? "Inicio del portal" : undefined}>
          <img src={`${import.meta.env.BASE_URL}isotipo.webp`} alt="" width={40} height={20} className="h-5 w-10 object-contain" />
          {!rail && <span className="flex flex-col leading-tight"><strong className="text-[13.5px] font-semibold">Manual ISPMAX</strong><small className="text-[11.5px] text-ink-3">Portal de contenido</small></span>}
        </a>
      </div>
      <nav aria-label="Secciones del portal" data-coach="nav" className={cn('flex-1 overflow-y-auto py-2', rail ? 'px-2' : 'px-2')}>
        {NAV.map((g, gi) => {
          const items = g.items.filter((n) => can(user, n.min));
          if (!items.length) return null;
          return (
            <div key={gi} className={cn(gi > 0 && (rail ? 'mt-2 border-t border-line pt-2' : 'mt-3.5'))}>
              {g.section && !rail && <div className="px-2.5 pb-1 text-[11.5px] font-medium text-ink-3">{g.section}</div>}
              {items.map((n) => {
                const I = n.icon;
                const on = active === n.name || (n.name === 'content' && active === 'pages');
                if (n.soon) return <div key={n.path}>{wrap(`${n.label} (próximamente)`, <span aria-disabled="true" className={cn(itemCls, 'cursor-default text-ink-3 hover:bg-transparent hover:text-ink-3 [&>svg]:text-ink-4', rail && 'justify-center px-0')}>
                  <I size={16} />{!rail && <><span className="flex-1 truncate">{n.label}</span><Tag>Próximamente</Tag></>}{rail && <span className="sr-only">{n.label} (próximamente)</span>}</span>)}</div>;
                return <div key={n.path}>{wrap(n.label, <a href={`#${n.path}`} aria-current={on ? 'page' : undefined} aria-label={rail ? n.label : undefined}
                  className={cn(itemCls, 'my-px', rail && 'justify-center px-0', on && 'border-line bg-bg font-medium text-ink hover:bg-bg dark:border-transparent dark:bg-muted [&>svg]:text-accent')}>
                  <I size={16} />{!rail && <span className="flex-1 truncate">{n.label}</span>}</a>)}</div>;
              })}
            </div>
          );
        })}
      </nav>
      <div className={cn('flex shrink-0 flex-col gap-px border-t border-line p-2', rail && 'items-stretch')}>
        {wrap('Ver el manual', <a href={siteHref()} target="_blank" rel="noopener noreferrer" aria-label={rail ? 'Ver el manual' : undefined} className={cn(itemCls, rail && 'justify-center px-0')}><ExternalLink size={16} />{!rail && <span className="flex-1">Ver el manual</span>}</a>)}
        <DropdownMenu side={rail ? 'right' : 'top'} align="start" label="Ayuda" items={[
          { label: 'Ver recorrido', icon: <RouteIcon size={16} />, onSelect: onTour },
          { label: 'Atajos de teclado', icon: <Keyboard size={16} />, onSelect: onShortcuts },
          { label: 'Abrir el manual publicado', icon: <ExternalLink size={16} />, href: siteHref(), external: true },
        ]} trigger={<button type="button" data-coach="help" aria-label="Ayuda" className={cn(itemCls, 'data-[state=open]:bg-muted data-[state=open]:text-ink', rail && 'justify-center px-0')}><CircleHelp size={16} />{!rail && <span className="flex-1">Ayuda</span>}</button>} />
        {onToggleRail && wrap(rail ? 'Mostrar nombres' : 'Contraer menú', <button type="button" onClick={onToggleRail} aria-label={rail ? 'Mostrar nombres del menú' : 'Contraer menú'} className={cn(itemCls, 'max-md:hidden', rail && 'justify-center px-0')}>
          {rail ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}{!rail && <span className="flex-1">Contraer menú</span>}</button>)}
      </div>
    </div>
  );
}
