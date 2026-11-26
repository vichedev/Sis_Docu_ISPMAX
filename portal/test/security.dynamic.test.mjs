// Auditoría de endpoints con el manual DINÁMICO: las mismas pruebas de security.test.mjs (matriz de rutas, sesión, roles,
// trucos de ruta, archivos sensibles, cabeceras, límites) más las rutas públicas propias del modo dinámico (/_site/*).
process.env.PORTAL_TEST_RENDER_MODE = 'dynamic';
await import('./security.test.mjs');
