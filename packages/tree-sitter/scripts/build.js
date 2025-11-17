// @ts-check
import { context } from 'esbuild';

import { sharedOptions } from '../../../esbuild/shared-options.js';

const watch = process.argv.includes('--watch');

async function main() {
    const ctx = await context({
        ...sharedOptions,
        entryPoints: ['src/**/*.ts'],
        outbase: 'src',
        outdir: 'dist',
        packages: 'external',
        platform: 'node',
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
