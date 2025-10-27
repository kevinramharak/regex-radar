// TODO: try passing server.mjs in the extension, see if that will load the server as an esm module
// NOTE: this has to be a require call, to force esbuild to load the commonjs import
const {
    Parser: TreeSitterParser,
    Query: TreeSitterQuery,
    Language,
} = require("web-tree-sitter") as typeof import("web-tree-sitter");

type TreeSitterParser = InstanceType<typeof TreeSitterParser>;
type TreeSitterQuery = InstanceType<typeof TreeSitterQuery>;
type Language = InstanceType<typeof Language>;

export { TreeSitterParser, TreeSitterQuery, Language };
