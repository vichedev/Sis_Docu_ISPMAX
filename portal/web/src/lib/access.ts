/*
 * Acceso restringido: el servidor responde 403 (IP fuera de la lista permitida) o 503 (panel deshabilitado)
 * a la comprobación de sesión. No es un 401: volver al login no sirve y entraría en bucle.
 */
export type AccessKind = 'forbidden' | 'disabled';
export const ACCESS_EVENT = 'portal:access-blocked';
export interface AccessDetail { kind: AccessKind; message: string }

/** Solo cuentan las respuestas de sesión (`/api/auth/me` y `/api/auth/login`): otros 403 son permisos de rol y otros 503, fallos puntuales. */
export function accessKind(status: number, url: string): AccessKind | null {
  if (!/^\/api\/auth\/(me|login)(\?|$)/.test(url)) return null;
  return status === 403 ? 'forbidden' : status === 503 ? 'disabled' : null;
}

export const ACCESS_TEXT: Record<AccessKind, { title: string; text: string }> = {
  forbidden: { title: 'Acceso restringido desde esta red', text: 'El portal solo se puede usar desde las redes autorizadas. Si cree que debería tener acceso, pida a quien administre el portal que añada su dirección a la lista permitida.' },
  disabled: { title: 'El panel está deshabilitado', text: 'Quien administra el portal lo ha desactivado por ahora. El manual publicado sigue disponible para su lectura.' },
};
