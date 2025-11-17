// @ts-check
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve internal workspace packages to their source files so we bundle them in watch/debug.
 * This makes changes in packages/* reflected immediately without separate watchers.
 * @type {import('esbuild').Plugin}
 */
export const workspacePackagesPlugin = {
    name: 'workspace-packages',
    setup(build) {
        const pkgRoot = path.resolve(__dirname, '../../packages');
        /** @type {Record<string, string>} */
        const alias = {
            '@regex-radar/lsp-types': path.join(pkgRoot, 'lsp-types/src/index.ts'),
            '@regex-radar/client': path.join(pkgRoot, 'client/src/index.ts'),
            '@regex-radar/server': path.join(pkgRoot, 'server/src/index.ts'),
            '@regex-radar/tree-sitter': path.join(pkgRoot, 'tree-sitter/src/index.ts'),
        };
        build.onResolve({ filter: /^@regex-radar\// }, (args) => {
            const target = alias[args.path];
            return target ? { path: target } : undefined;
        });
    },
};
