import { isExternalUrl, useNav, withBase } from '@rspress/core/runtime';
import { useLinkNavigate } from '@rspress/core/theme-original';
import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { cargarIndice, resultados } from '../../src/search/hooks.mjs';
import type { Resultado } from '../../src/search/hooks.mjs';
import { useShell } from '../layout/shell';
import { cn } from '../lib/cn';
import { SECTIONS, iconFor, sectionOf, splitEmoji } from '../lib/sections';
import { Icon } from './Icon';
import type { NavItem } from './TopBar';
import { IconTile, Kbd } from './ui';

/** Búsquedas de ejemplo (portada, estado vacío y sin resultados). Son consultas, no enlaces: nunca se rompen. */
export const SUGERENCIAS = ['registrar un pago', 'cortar un servicio', 'router no conecta', 'factura electrónica', 'crear un usuario', 'promesa de pago'];

const RECENT_KEY = 'isp-busquedas-recientes';
const MAX_RECENT = 6;
const LIMIT = 40;

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/* ── Historial (localStorage; si no hay acceso, la paleta funciona igual sin él) ───────────────────────── */
function readRecent(): Resultado[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter(r => r && typeof r.ruta === 'string' && typeof r.titulo === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}
function writeRecent(list: Resultado[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* sin almacenamiento: no se guarda */
  }
}

/* ── Resaltado: sin tildes ni mayúsculas, al inicio de palabra, con raíz para plurales ───────────────────── */
const VACIAS = new Set('de la el en un una los las y o que por para con del al se no mi me como lo le su es'.split(' '));
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function terms(query: string): string[] {
  return Array.from(
    new Set(
      fold(query)
        .split(/[^\p{L}\p{N}]+/u)
        .filter(t => t.length > 1 && !VACIAS.has(t))
        .map(t => (t.length >= 5 ? t.slice(0, t.length - 2) : t)),
    ),
  );
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const parts = useMemo(() => {
    const ts = terms(query);
    if (!ts.length || !text) return [text];
    // Texto plegado carácter a carácter (cada carácter original da uno plegado: las posiciones coinciden).
    const folded = Array.from(text, ch => fold(ch).charAt(0) || ch).join('');
    const marks = new Array<boolean>(text.length).fill(false);
    for (const t of ts) {
      let i = folded.indexOf(t);
      while (i !== -1) {
        const prev = i === 0 ? '' : folded[i - 1];
        if (!prev || !/[\p{L}\p{N}]/u.test(prev)) {
          // Se marca la palabra entera ("registr" → "Registrar"), no solo la raíz.
          let end = i + t.length;
          while (end < folded.length && /[\p{L}\p{N}]/u.test(folded[end])) end++;
          marks.fill(true, i, end);
        }
        i = folded.indexOf(t, i + 1);
      }
    }
    const out: ReactNode[] = [];
    let start = 0;
    for (let i = 1; i <= text.length; i++) {
      if (i === text.length || marks[i] !== marks[start]) {
        const chunk = text.slice(start, i);
        out.push(
          marks[start] ? (
            <mark key={start} className="rounded-[3px] bg-brand-500/12 px-px font-semibold text-fg dark:bg-brand-400/18">
              {chunk}
            </mark>
          ) : (
            <Fragment key={start}>{chunk}</Fragment>
          ),
        );
        start = i;
      }
    }
    return out;
  }, [text, query]);
  return <>{parts}</>;
}

/** Tecla modificadora del atajo según el sistema (⌘ en Apple, Ctrl en el resto). En el HTML estático, Ctrl. */
export function useModKey() {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(isMac()), []);
  return mac ? '⌘' : 'Ctrl';
}

/* ── Botón de la barra ────────────────────────────────────────────────────────────────────────────── */
export function SearchButton() {
  const { openSearch } = useShell();
  const mod = useModKey();
  return (
    <button
      type="button"
      onClick={() => openSearch()}
      aria-keyshortcuts="Control+K Meta+K /"
      aria-haspopup="dialog"
      className="group inline-flex h-9 items-center gap-2 rounded-xl text-sm text-fg-subtle transition-colors max-xl:w-9 max-xl:justify-center max-xl:hover:bg-bg-mute max-xl:hover:text-fg xl:w-60 xl:border xl:border-line xl:bg-bg-soft xl:pr-1.5 xl:pl-3 xl:hover:border-brand/40 xl:hover:bg-surface"
    >
      <Icon name="search" className="size-[18px] shrink-0 xl:size-4" strokeWidth={2} />
      <span className="sr-only flex-1 truncate text-left xl:not-sr-only">Buscar…</span>
      <span aria-hidden="true" className="hidden gap-1 xl:inline-flex">
        <Kbd>{mod}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

/**
 * Paleta de búsqueda (Ctrl+K, ⌘K o "/"). Usa el buscador del sitio (src/search/hooks.mjs → engine.mjs, BM25 con
 * sinónimos): el índice se descarga al abrirla por primera vez. Es un <dialog> modal nativo (foco atrapado y fondo
 * inerte). Teclado: ↑ ↓ elegir · Intro abrir · Ctrl/⌘+Intro abrir en otra pestaña · Tab filtros · Esc cerrar.
 */
export function SearchPalette() {
  const { searchOpen, searchQuery, openSearch, closeSearch } = useShell();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch]);
  return searchOpen ? <Palette initial={searchQuery} onClose={closeSearch} /> : null;
}

interface Option {
  r: Resultado;
  group: string;
}

function Palette({ initial, onClose }: { initial: string; onClose: () => void }) {
  const [query, setQuery] = useState(initial);
  const [items, setItems] = useState<Resultado[]>([]);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [recent, setRecent] = useState<Resultado[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const navigate = useLinkNavigate();
  const nav = useNav() as NavItem[];
  const uid = useId();
  const q = query.trim();

  useEffect(() => {
    const d = dialog.current;
    const opener = document.activeElement as HTMLElement | null;
    if (d && !d.open) d.showModal();
    input.current?.focus();
    input.current?.select();
    setRecent(readRecent());
    cargarIndice().catch(() => setState('error'));
    return () => {
      if (d?.open) d.close();
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setFilter('');
    setActive(0);
    if (!q) {
      setItems([]);
      setState('idle');
      return;
    }
    setState('loading');
    resultados(q, LIMIT)
      .then(r => {
        if (!alive) return;
        setItems(r);
        setState('idle');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [q]);

  // Accesos a las secciones (el menú superior sin enlaces externos), para la caja vacía.
  const secciones: Resultado[] = useMemo(
    () =>
      nav
        .flatMap(i => (i.items ? i.items : [i]))
        .filter(i => i.link && !isExternalUrl(i.link))
        .map(i => ({ ruta: i.link!, titulo: splitEmoji(i.text)[1], descripcion: '', tipo: '', modulo: '' })),
    [nav],
  );

  // Filtros por tipo (con su recuento) a partir de los resultados.
  const tipos = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of items) if (r.tipo) m.set(r.tipo, (m.get(r.tipo) ?? 0) + 1);
    return Array.from(m, ([tipo, n]) => ({ tipo, n }));
  }, [items]);

  const options: Option[] = useMemo(() => {
    if (q) return items.filter(r => !filter || r.tipo === filter).map(r => ({ r, group: '' }));
    return [...recent.map(r => ({ r, group: 'Recientes' })), ...secciones.map(r => ({ r, group: 'Ir a una sección' }))];
  }, [q, items, filter, recent, secciones]);

  const groups = useMemo(() => {
    const out: { id: string; name: string; items: { r: Resultado; i: number }[] }[] = [];
    options.forEach((o, i) => {
      const id = o.group === 'Recientes' ? 'recientes' : o.group ? 'secciones' : 'res';
      if (!out.length || out[out.length - 1].name !== o.group) out.push({ id, name: o.group, items: [] });
      out[out.length - 1].items.push({ r: o.r, i });
    });
    return out;
  }, [options]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const open = (r: Resultado, newTab = false) => {
    if (r.tipo || q) {
      const next = [r, ...readRecent().filter(x => x.ruta !== r.ruta)];
      writeRecent(next);
    }
    if (newTab) {
      window.open(withBase(r.ruta), '_blank', 'noopener');
      return;
    }
    onClose();
    navigate(r.ruta);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const n = options.length;
    if (e.key === 'ArrowDown') setActive(i => (n ? (i + 1) % n : 0));
    else if (e.key === 'ArrowUp') setActive(i => (n ? (i - 1 + n) % n : 0));
    else if (e.key === 'Home' && e.ctrlKey) setActive(0);
    else if (e.key === 'End' && e.ctrlKey) setActive(Math.max(n - 1, 0));
    else if (e.key === 'Enter' && options[active]) open(options[active].r, e.ctrlKey || e.metaKey);
    // Esc cierra siempre (en un campo de búsqueda el navegador solo lo vaciaría).
    else if (e.key === 'Escape') onClose();
    else return;
    e.preventDefault();
  };

  const clearRecent = () => {
    writeRecent([]);
    setRecent([]);
    setActive(0);
    input.current?.focus();
  };

  const applyQuery = (s: string) => {
    setQuery(s);
    input.current?.focus();
  };

  const optionId = (i: number) => `${uid}-op-${i}`;
  const listId = `${uid}-lista`;
  const empty = q && state !== 'loading' && !items.length;
  const chip = (on: boolean) =>
    cn(
      'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors',
      on ? 'border-brand/50 bg-brand-tint text-brand' : 'border-line text-fg-muted hover:border-brand/35 hover:text-fg',
    );

  return (
    <dialog
      ref={dialog}
      aria-label="Buscar en el manual"
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 m-0 flex h-dvh max-h-none w-full max-w-none items-start justify-center overflow-hidden bg-transparent p-3 pt-[min(10vh,5.5rem)] text-fg backdrop:bg-[rgb(8_9_20/0.55)] backdrop:backdrop-blur-[3px] sm:p-6 sm:pt-[min(12vh,7rem)]"
    >
      <div className="flex max-h-[min(40rem,calc(100dvh-6rem))] w-full max-w-2xl animate-rise flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_32px_80px_-16px_rgb(10_12_40/0.45)] ring-1 ring-black/5 dark:ring-white/5">
        {/* Caja de búsqueda */}
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-4">
          <Icon name="search" className="size-5 shrink-0 text-brand" strokeWidth={2} />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Busque un módulo, una tarea o un problema…"
            className="h-15 min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-activedescendant={options[active] ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Buscar en el manual"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          {query ? (
            <button
              type="button"
              onClick={() => applyQuery('')}
              className="inline-flex size-7 items-center justify-center rounded-md text-fg-subtle hover:bg-bg-mute hover:text-fg"
              aria-label="Borrar la búsqueda"
            >
              <Icon name="close" className="size-4" strokeWidth={2} />
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="max-sm:hidden">
            <Kbd className="hover:text-fg">Esc</Kbd>
            <span className="sr-only"> Cerrar la búsqueda</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-md px-1.5 py-1 text-sm font-semibold text-brand sm:hidden"
          >
            Cerrar
          </button>
        </div>

        {/* Filtros por tipo */}
        {q && tipos.length > 1 ? (
          <div role="group" aria-label="Filtrar por tipo" className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line-soft px-4 py-2.5 [scrollbar-width:none]">
            <button type="button" className={chip(!filter)} aria-pressed={!filter} onClick={() => { setFilter(''); setActive(0); input.current?.focus(); }}>
              Todo <span className="font-medium">{items.length}</span>
            </button>
            {tipos.map(t => (
              <button
                key={t.tipo}
                type="button"
                className={chip(filter === t.tipo)}
                aria-pressed={filter === t.tipo}
                onClick={() => {
                  setFilter(filter === t.tipo ? '' : t.tipo);
                  setActive(0);
                  input.current?.focus();
                }}
              >
                {t.tipo} <span className="font-medium">{t.n}</span>
              </button>
            ))}
          </div>
        ) : null}

        {/* Resultados */}
        <div ref={list} tabIndex={0} aria-label="Resultados de la búsqueda" role="region" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 focus-visible:outline-offset-[-2px]">
          {state === 'error' ? (
            <p className="px-3 py-10 text-center text-sm text-fg-muted">No se pudo cargar el buscador. Recargue la página.</p>
          ) : null}

          {empty && state !== 'error' ? (
            <div className="px-4 py-8 text-center">
              <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-bg-mute text-fg-subtle" aria-hidden="true">
                <Icon name="search" className="size-5" />
              </span>
              <p className="font-display font-semibold text-fg">Sin resultados para «{q}»</p>
              <p className="mt-1 text-sm text-fg-muted">Pruebe con otra palabra o con una de estas búsquedas:</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {SUGERENCIAS.map(s => (
                  <button key={s} type="button" className={chip(false)} onClick={() => applyQuery(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!q ? (
            <div className="px-3 pt-2 pb-1">
              <p className="mb-2 font-display text-[11px] font-bold tracking-[0.09em] text-fg-subtle uppercase">Pruebe con</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGERENCIAS.map(s => (
                  <button key={s} type="button" className={chip(false)} onClick={() => applyQuery(s)}>
                    <Icon name="search" className="size-3" strokeWidth={2.25} />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div id={listId} role="listbox" aria-label={q ? 'Resultados' : 'Recientes y secciones'}>
            {groups.map(g => (
              <div key={g.name || 'res'} role="group" aria-labelledby={g.name ? `${uid}-${g.id}` : undefined}>
                {g.name ? (
                  <div id={`${uid}-${g.id}`} className="px-3 pt-3 pb-1.5 font-display text-[11px] font-bold tracking-[0.09em] text-fg-subtle uppercase">
                    {g.name}
                  </div>
                ) : null}
                {g.items.map(({ r, i }) => {
                  const section = sectionOf(r.ruta);
                  const on = i === active;
                  const icon = (g.name ? iconFor(r.ruta, r.titulo) : null) ?? (section ? SECTIONS[section].icon : 'book');
                  return (
                    <div
                      key={r.ruta}
                      id={optionId(i)}
                      data-index={i}
                      role="option"
                      aria-selected={on}
                      onMouseMove={() => active !== i && setActive(i)}
                      onClick={e => open(r, e.ctrlKey || e.metaKey)}
                      className={cn('flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors', on ? 'bg-brand-tint' : '')}
                    >
                      {g.id === 'recientes' ? (
                        <span aria-hidden="true" className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-bg-mute text-fg-subtle">
                          <Icon name="clock" className="size-4" />
                        </span>
                      ) : (
                        <IconTile size="sm" section={section} icon={icon} className="mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className={cn('min-w-0 font-medium', on ? 'text-brand' : 'text-fg')}>
                            <Highlight text={r.titulo} query={q} />
                          </span>
                          {r.tipo ? (
                            <span className={cn('ml-auto shrink-0 text-[11px] font-semibold', section ? SECTIONS[section].text : 'text-fg-subtle')}>{r.tipo}</span>
                          ) : null}
                        </div>
                        {r.descripcion ? (
                          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-fg-subtle">
                            <Highlight text={r.descripcion} query={q} />
                          </p>
                        ) : null}
                      </div>
                      <Icon name="enter" className={cn('mt-1.5 size-4 shrink-0 text-brand', on ? 'opacity-100' : 'opacity-0')} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Pie: atajos y recuento */}
        <div className="flex shrink-0 items-center gap-4 border-t border-line bg-bg-soft px-4 py-2 text-[11.5px] text-fg-subtle">
          <span className="inline-flex items-center gap-1.5 max-sm:hidden">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> elegir
          </span>
          <span className="inline-flex items-center gap-1.5 max-sm:hidden">
            <Kbd>Intro</Kbd> abrir
          </span>
          <span className="inline-flex items-center gap-1.5 max-sm:hidden">
            <Kbd>Tab</Kbd> filtros
          </span>
          {!q && recent.length ? (
            <button type="button" onClick={clearRecent} className="ml-auto font-medium hover:text-brand">
              Borrar historial
            </button>
          ) : null}
          <span className={q ? 'ml-auto' : 'sr-only'} role="status" aria-live="polite">
            {q && state === 'idle' ? (options.length === 1 ? '1 resultado' : `${options.length} resultados`) : null}
          </span>
        </div>
      </div>
    </dialog>
  );
}
