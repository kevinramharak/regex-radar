// @ts-check
import { context } from 'esbuild';

import { banner, sharedOptions } from '../../../esbuild/shared-options.js';

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

async function main() {
    const ctx = await context({
        ...sharedOptions,
        bundle: true,
        banner: {
            js: banner,
        },
        entryPoints: ['src/server.ts'],
        outfile: isProduction ? 'dist/server.min.js' : 'dist/server.js',
        platform: 'node',
        external: ['vscode'],
        minifySyntax: true,
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
