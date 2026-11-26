// Menú superior del manual (nav de rspress.config.ts) en el orden en que lo ve un lector.
// Definición explícita; la prueba test/structure-nav.test.mjs la compara con rspress.config.ts.
export const WHATSAPP = 'https://wa.me/593959967843';

export const TOP_MENU = [
  { key: 'guia', text: 'Guía', kind: 'section', seccion: 'guia', link: '/guia/inicio' },
  { key: 'tareas', text: 'Quiero hacer…', kind: 'section', seccion: 'tareas', link: '/tareas/' },
  { key: 'problemas', text: 'Tengo un problema', kind: 'section', seccion: 'problemas', link: '/problemas/' },
  { key: 'preguntas', text: 'Preguntas', kind: 'section', seccion: 'preguntas', link: '/preguntas/' },
  {
    key: 'referencia', text: 'Referencia', kind: 'dropdown', seccion: 'referencia', extraSecciones: ['conceptos'],
    items: [
      { text: '🚦 Estados del sistema', link: '/guia/estados' },
      { text: '✅ Rutinas diarias', link: '/guia/rutinas' },
      { text: '❓ Preguntas frecuentes', link: '/guia/faq' },
      { text: '📖 Glosario', link: '/guia/glosario' },
      { text: '🔐 Permisos y roles', link: '/referencia/permisos' },
      { text: '⚙️ Automatizaciones', link: '/referencia/automatizaciones' },
      { text: '💡 Conceptos', link: '/conceptos/' },
    ],
  },
  { key: 'soporte', text: 'Soporte', kind: 'external', href: WHATSAPP, help: 'Enlace externo (WhatsApp) del menú superior. No es una página: se cambia en Ajustes.' },
];
