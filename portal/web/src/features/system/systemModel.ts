/*
 * Lógica pura de la actualización y la información del sistema (sin imports; probada con `node --test test/settings.test.mjs`).
 */

/** Pasos con nombre claro cuando el registro trae el número de pasos esperado («Paso n/N»). */
export const STEPS_BY_MODE: Record<string, string[]> = {
  git: [
    'Comprobar que no hay cambios locales',
    'Traer el código nuevo',
    'Instalar dependencias (si cambiaron)',
    'Actualizar la base de datos',
    'Compilar la interfaz',
    'Reconstruir el manual',
    'Comprobar si hace falta reiniciar',
  ],
  entrypoint: [
    'Comprobar que no hay cambios locales',
    'Traer el código nuevo',
    'Preparar el reinicio',
  ],
};
export const isDockerMode = (mode?: string | null) => mode === 'entrypoint';

/** Lee las líneas «Paso n/N · nombre» del registro: paso alcanzado, total y nombre de cada paso visto. */
export function parseSteps(log: string): { current: number; total: number; names: Record<number, string> } {
  let current = 0;
  let total = 0;
  const names: Record<number, string> = {};
  for (const m of (log ?? '').matchAll(/^Paso (\d+)\/(\d+)\b\s*[·:—-]?\s*(.*)$/gm)) {
    const n = Number(m[1]);
    current = Math.max(current, n);
    total = Math.max(total, Number(m[2]));
    if (m[3]) names[n] = m[3].trim();
  }
  return { current, total, names };
}

/** Etiquetas de los pasos: las conocidas del modo si coinciden en número; si no, las del registro (o «Paso k»). */
export function stepLabels(mode: string | null | undefined, parsed: { total: number; names: Record<number, string> }): string[] {
  const known = STEPS_BY_MODE[mode ?? 'git'] ?? STEPS_BY_MODE.git!;
  const total = parsed.total || known.length;
  if (total === known.length) return known;
  return Array.from({ length: total }, (_, i) => parsed.names[i + 1] ?? `Paso ${i + 1}`);
}

/** Qué hará «Actualizar el sistema», en orden, según el modo (para el diálogo de confirmación). */
export function updatePlan(mode?: string | null, live = false): string[] {
  if (isDockerMode(mode)) return [
    'Comprobar que no hay cambios locales sin confirmar.',
    'Traer el código nuevo (solo avanza; nunca borra ni pisa nada).',
    'Reiniciar el sistema. Al volver a arrancar, el contenedor instala lo necesario, actualiza la base de datos y compila el panel y el manual: puede tardar unos minutos.',
  ];
  return [
    'Comprobar que no hay cambios locales sin confirmar.',
    'Traer el código nuevo (solo avanza; nunca borra ni pisa nada).',
    'Instalar dependencias, solo si cambiaron.',
    'Actualizar la base de datos (sin perder contenido).',
    live ? 'Recompilar el panel y el diseño del manual (el contenido no se toca y se sigue viendo mientras tanto).' : 'Recompilar el panel y el manual.',
    'Avisar si hace falta reiniciar.',
  ];
}

/** 3725 → «1 h 2 min»; 90061 → «1 d 1 h». */
export function fmtUptime(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '';
  const s = Math.floor(sec);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d} d${h ? ` ${h} h` : ''}`;
  if (h) return `${h} h${m ? ` ${m} min` : ''}`;
  if (m) return `${m} min`;
  return `${s} s`;
}

const yn = (v: boolean | string | null | undefined) => (v == null ? 'no consta' : v === 'auto' ? 'automática (según HTTPS)' : typeof v === 'string' ? v : v ? 'sí' : 'no');

export interface InfoLike {
  version?: { branch?: string | null; shortCommit?: string | null; commit?: string | null; date?: string | null; subject?: string | null } | string | null;
  runtime?: { node?: string | null; platform?: string | null; docker?: boolean | null; uptimeSec?: number | null };
  database?: { connected?: boolean | null; name?: string | null; serverVersion?: string | null };
  site?: { base?: string | null; exists?: boolean | null; pages?: number | null; lastBuild?: string | { finishedAt?: string | null; status?: string } | null };
  access?: { adminEnabled?: boolean | null; adminIpRestricted?: boolean | null; behindProxy?: boolean | null; cookieSecure?: boolean | string | null };
  update?: { mode?: string | null; canUpdate?: boolean | null; message?: string | null };
  restartMode?: string | null;
}

/** Fecha de la última construcción del manual, venga como texto o como objeto. */
export const lastBuildAt = (lb: string | { finishedAt?: string | null } | null | undefined): string | null =>
  !lb ? null : typeof lb === 'string' ? lb : lb.finishedAt ?? null;

/** Versión en una línea: «main · a1b2c3d · 2026-11-20 · Asunto». */
export function versionLine(v: InfoLike['version']): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  const c = v.shortCommit ?? v.commit?.slice(0, 7) ?? null;
  return [v.branch, c, v.date ? String(v.date).slice(0, 10) : null, v.subject].filter(Boolean).join(' · ');
}

/**
 * Texto plano para soporte («Copiar información»). Sin credenciales: solo lo que muestra la pantalla.
 * `generatedAt` es una fecha ISO (se pasa para que el resultado sea reproducible en las pruebas).
 */
export function infoText(i: InfoLike, generatedAt: string): string {
  const lines: string[] = [`Información del sistema del portal del manual (${generatedAt.replace('T', ' ').slice(0, 16)} UTC)`];
  const add = (k: string, v: string | null | undefined) => { if (v) lines.push(`${k}: ${v}`); };
  add('Versión', versionLine(i.version) || 'no consta');
  const r = i.runtime;
  if (r) add('Entorno', [r.docker == null ? null : r.docker ? 'Docker' : 'Local (sin Docker)', r.node ? `Node ${r.node}` : null, r.platform].filter(Boolean).join(' · '));
  if (r?.uptimeSec != null) add('En marcha desde hace', fmtUptime(r.uptimeSec));
  const db = i.database;
  if (db) add('Base de datos', [db.connected == null ? null : db.connected ? 'conectada' : 'sin conexión', db.name, db.serverVersion ? `PostgreSQL ${db.serverVersion}` : null].filter(Boolean).join(' · '));
  const s = i.site;
  if (s) add('Manual generado', [s.exists == null ? null : s.exists ? 'sí' : 'no', s.base ? `base ${s.base}` : null, s.pages != null ? `${s.pages} páginas` : null,
    lastBuildAt(s.lastBuild) ? `última actualización ${String(lastBuildAt(s.lastBuild)).replace('T', ' ').slice(0, 16)}` : null].filter(Boolean).join(' · '));
  const a = i.access;
  if (a) add('Acceso', `panel habilitado: ${yn(a.adminEnabled)} · restringido por IP: ${yn(a.adminIpRestricted)} · detrás de proxy: ${yn(a.behindProxy)} · cookie segura: ${yn(a.cookieSecure)}`);
  const u = i.update;
  if (u) add('Actualización', [u.mode ? `modo ${u.mode}` : null, u.canUpdate == null ? null : u.canUpdate ? 'disponible' : 'no disponible', u.message].filter(Boolean).join(' · '));
  add('Reinicio', i.restartMode ?? null);
  return lines.join('\n');
}
