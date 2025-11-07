// @ts-check
import { writeFile } from 'node:fs/promises';

import { context } from 'esbuild';

import { sharedOptions } from '../../../esbuild/shared-options.js';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const ctx = await context({
        ...sharedOptions,
        entryPoints: ['src/**/*.ts'],
        outbase: 'src',
        outdir: 'dist',
        platform: 'node',
    });
    if (watch) {
        await ctx.watch();
    } else {
        const result = await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
