/**
 * Sustituto de `@rspress/core/theme-original` (alias de Vite). El tema propio (`theme/index.tsx`) hace
 * `export * from '@rspress/core/theme-original'` y luego sustituye Layout, Badge, Callout y getCustomMDXComponent.
 * Aquí se reexportan SOLO las piezas del tema de serie que el tema usa, importando sus archivos compilados de
 * `@rspress/core/dist/theme/` (los mismos que empaqueta Rspress; su `@rspress/core/runtime` es nuestro shim).
 * Así el código de esas piezas no se duplica ni se reescribe.
 */
const T = '@rspress/core/dist/theme';

export { Link } from '@rspress/core/dist/theme/components/Link/index.js';
export { getHref, useLinkNavigate } from '@rspress/core/dist/theme/components/Link/useLinkNavigate.js';
export { CodeBlock } from '@rspress/core/dist/theme/components/CodeBlock/index.js';
export { CodeButtonGroup, useCodeButtonGroup } from '@rspress/core/dist/theme/components/CodeButtonGroup/index.js';
export { SvgWrapper } from '@rspress/core/dist/theme/components/SvgWrapper/index.js';
export * from '@rspress/core/dist/theme/icons.js';
export { useActiveAnchor } from '@rspress/core/dist/theme/hooks/useActiveAnchor.js';
export { usePrevNextPage } from '@rspress/core/dist/theme/logic/usePrevNextPage.js';
export { useScrollAfterNav } from '@rspress/core/dist/theme/logic/useScrollAfterNav.js';
export { useScrollReset } from '@rspress/core/dist/theme/logic/useScrollReset.js';
export { useThemeState } from '@rspress/core/dist/theme/logic/useThemeState.js';
export { parseInlineMarkdownText, renderHtmlOrText, renderInlineMarkdown } from '@rspress/core/dist/theme/logic/utils.js';
export { copyToClipboard } from '@rspress/core/dist/theme/logic/copyToClipboard.js';
export { getCopyableText } from '@rspress/core/dist/theme/logic/getCopyableText.js';

export const __THEME_ORIGINAL_SOURCE = T;
