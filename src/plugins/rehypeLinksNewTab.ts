/**
 * Plugin rehype: los vínculos del contenido de las páginas se abren en otra pestaña, para no perder el hilo de lo
 * que se está leyendo. Excepciones: enlaces solo de ancla (`#seccion`, incluidos los de los encabezados) y
 * `mailto:` / `tel:`. El menú lateral, la barra superior y "En esta página" no pasan por aquí (no son contenido).
 * El componente `Link` de Rspress respeta `target` y no intercepta el clic, así que el navegador abre la pestaña.
 */
type HastNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };

const NO_TOCAR = /^(#|mailto:|tel:|javascript:)/i;

export default function rehypeLinksNewTab() {
  return (tree: HastNode) => {
    const visitar = (nodo: HastNode) => {
      if (nodo.type === 'element' && nodo.tagName === 'a') {
        const href = nodo.properties?.href;
        if (typeof href === 'string' && href && !NO_TOCAR.test(href)) {
          nodo.properties = { ...nodo.properties, target: '_blank', rel: 'noopener noreferrer' };
        }
      }
      nodo.children?.forEach(visitar);
    };
    visitar(tree);
  };
}
