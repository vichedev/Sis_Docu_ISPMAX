/* Recorrido de bienvenida del portal: se lanza en la primera visita y desde Ayuda › Ver recorrido. */
import { useCallback, useEffect, useState } from 'react';
import { Kbd } from '@/components/ui';
import { api } from '@/lib/api';
import { can, useAuth } from '@/lib/auth';
import { store } from '@/lib/util';
import { useSite } from '@/features/system/site';
import { isLive } from '@/lib/siteModel';
import { useCoachSeen, type CoachStep } from './Coach';

const KEY = 'portal-coach-v2';

export function useOnboarding() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<CoachStep[] | null>(null);
  const [seen, markSeen] = useCoachSeen(KEY);
  const { status: siteStatus } = useSite();
  const live = isLive(siteStatus);

  const start = useCallback(async () => {
    let first: number | null = null;
    try { first = (await api.pages({ limit: 1 })).items[0]?.id ?? null; } catch { /* sin páginas */ }
    const s: CoachStep[] = [
      { route: '/', target: '[data-coach="nav"]', placement: 'right', title: 'El menú, ordenado por tareas',
        body: <p className="m-0"><b>Contenido</b> para escribir y ordenar el manual{can(user, 'admin')
          ? <>, <b>Publicación</b> para los borradores, el manual publicado y los respaldos, y <b>Administración</b> para usuarios, auditoría y ajustes (también la actualización del sistema)</>
          : <> y <b>Publicación</b> para los borradores y el estado del manual publicado</>}.</p> },
      { target: '[data-coach="search"]', title: 'Buscar y saltar a cualquier sitio',
        body: <p className="m-0">Pulse <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> en cualquier pantalla para abrir una página por su título o lanzar una acción.</p> },
    ];
    if (first != null) {
      s.push({ route: `/contenido/${first}`, target: '[data-coach="tree"]', placement: 'right', title: 'El árbol del manual',
        body: <p className="m-0">Secciones, grupos y páginas como en el sitio publicado. Arrastre por el asa para reordenar; el botón <b>+</b> crea una página dentro del grupo.</p> });
      s.push({ target: '[data-coach="editor"]', title: 'Editar una página',
        body: <p className="m-0">Título arriba, texto MDX en el centro y validación abajo. <Kbd>Ctrl</Kbd> <Kbd>S</Kbd> guarda; arrastre una captura al texto para subirla.</p> });
      s.push({ target: '[data-coach="outline"]', placement: 'left', title: 'En esta página',
        body: <p className="m-0">El esquema de títulos para saltar dentro del texto y las propiedades: estado, grupo, orden y dirección pública.</p> });
    }
    s.push({ target: '[data-coach="site"]', title: 'El estado del manual',
      body: live
        ? <p className="m-0">El manual se sirve en vivo: al guardar una página publicada, el cambio ya está visible para los lectores, sin esperas ni reconstrucciones. Aquí ve que está en marcha (el detalle y «Vaciar caché» están en <b>Manual publicado</b>). <b>Borradores (N)</b> lleva a las páginas nuevas, que solo salen al manual cuando las publica.</p>
        : <p className="m-0">Al guardar una página publicada, el manual se actualiza solo en unos segundos: aquí ve si está al día, actualizándose o con un error (el detalle está en <b>Manual publicado</b>). <b>Borradores (N)</b> lleva a las páginas nuevas, que solo salen al manual cuando las publica.</p> });
    s.push({ target: '[data-coach="help"]', placement: 'right', title: 'Ayuda siempre a mano',
      body: <p className="m-0">Desde aquí puede repetir este recorrido y ver los atajos de teclado.</p> });
    setSteps(s);
  }, [user, live]);

  useEffect(() => {
    if (seen) return;
    const t = setTimeout(() => { if (!store.get(KEY, false)) void start(); }, 700);
    return () => clearTimeout(t);
  }, [seen, start]);

  const close = useCallback(() => { setSteps(null); markSeen(); }, [markSeen]);
  return { steps, start, close };
}
