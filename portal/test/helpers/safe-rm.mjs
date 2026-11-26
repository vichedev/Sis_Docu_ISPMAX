import fs from 'node:fs';

/**
 * Borra una carpeta temporal de pruebas. En Windows, `rmSync` puede dar EPERM/EBUSY/ENOTEMPTY unos instantes
 * (antivirus, indexador de búsqueda, manejadores que el sistema aún no ha liberado): se reintenta durante ~3 s y,
 * si persiste, se ignora. Las carpetas viven en `work-test/` (ignorada por Git) y se limpian en la siguiente ejecución.
 * Antes, ese error hacía fallar un archivo de pruebas entero DESPUÉS de pasar todas sus pruebas.
 */
export function safeRm(target) {
  const wait = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let i = 0; i < 20; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (e) {
      if (!['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(e.code)) throw e;
      wait(150);
    }
  }
}
