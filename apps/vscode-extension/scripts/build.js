// @ts-check
import { writeFile } from 'node:fs/promises';

import { context } from 'esbuild';

import { banner, sharedOptions } from '../../../esbuild/shared-options.js';

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

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
        entryPoints: ['src/extension.ts'],
        outfile: isProduction ? 'dist/extension.min.js' : 'dist/extension.js',
        platform: 'node',
        external: ['vscode'],
    });
    if (isWatch) {
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
