// Loader «pre» de Rspack para los .mdx: descarta el frontmatter interno antes de que Rspress lo empaquete.
const { stripFrontmatterSource } = require('./internalFrontmatter.cjs');

module.exports = function stripFrontmatterLoader(source) {
  return stripFrontmatterSource(String(source));
};
