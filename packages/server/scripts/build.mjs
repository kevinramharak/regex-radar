// @ts-check

import { context } from "esbuild";
import { sharedOptions } from "../../../esbuild/shared-options.js";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
    const ctx = await context({
        ...sharedOptions,
        /**
         * VS Code extensions are recommended to be bundled, Web version has to be a single file
         * Other packages don't need to be
         */
        bundle: true,
        /**
         * Because it is run as a Module, not a Process in the vscode extension, it has to be cjs format
         */
        format: "cjs",
        entryPoints: ["src/index.ts"],
        outfile: "dist/index.cjs",
        platform: "node",
        external: [
            "vscode",
            // TODO: fix path resolving of wasm modules
            "web-tree-sitter/tree-sitter.wasm",
        ],
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
