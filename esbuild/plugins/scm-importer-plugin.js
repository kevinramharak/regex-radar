// @ts-check
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * @type {import('esbuild').Plugin}
 */
export const scmImporterPlugin = {
    name: 'scm-importer',
    setup(build) {
        build.onResolve({ filter: /\.scm$/ }, (args) => ({
            path: path.isAbsolute(args.path) ? args.path : path.join(args.resolveDir, args.path),
            namespace: 'file',
            sideEffects: false,
        }));
        build.onLoad({ filter: /\.scm$/ }, async (args) => {
            let contents = await readFile(args.path, { encoding: 'utf-8' });
            return {
                contents,
                loader: 'text',
            };
        });
    },
};
