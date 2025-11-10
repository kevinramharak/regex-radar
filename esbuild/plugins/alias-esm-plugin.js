// @ts-check

/**
 * Resolve internal workspace packages to their source files so we bundle them in watch/debug.
 * This makes changes in packages/* reflected immediately without separate watchers.
 * @type {import('esbuild').Plugin}
 */
export const aliasEsmPlugin = {
    name: 'alias-esm',
    setup(build) {
        if (build.initialOptions.bundle) {
            build.initialOptions.alias = {
                'vscode-languageclient': '@local/vscode-languageclient',
                'vscode-jsonrpc': '@local/vscode-jsonrpc',
                'vscode-languageserver-protocol': '@local/vscode-languageserver-protocol',
                'vscode-languageserver': '@local/vscode-languageserver',
                recheck: '@local/recheck',
            };
        }
    },
};
