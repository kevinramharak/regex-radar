// @ts-check
import { context } from 'esbuild';

import { banner, sharedOptions } from '../../../esbuild/shared-options.js';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const ctx = await context({
        ...sharedOptions,
        /**
         * VS Code extensions are recommended to be bundled, Web version has to be a single file
         * Other packages don't need to be
         */
        bundle: true,
        banner: {
            js: banner,
        },
        entryPoints: ['src/index.ts'],
        outfile: 'dist/index.js',
        platform: 'node',
        external: ['vscode'],
    });
    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
