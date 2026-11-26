// Ruta de administración oculta con el manual DINÁMICO: las mismas pruebas de hidden-admin.test.mjs (404 indistinguible,
// panel y API solo bajo la ruta secreta, sondeos, rastreo de descubribilidad sobre el HTML dibujado desde la BD…).
process.env.PORTAL_TEST_RENDER_MODE = 'dynamic';
await import('./hidden-admin.test.mjs');
