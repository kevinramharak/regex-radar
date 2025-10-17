// @ts-check

import { context } from "esbuild";
import { esbuildProblemMatcherPlugin } from "../../../plugins/esbuild/problem-matcher-plugin.js";
import { workspacePackagesPlugin } from "../../../plugins/esbuild/workspace-packages-plugin.js";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
    const ctx = await context({
        entryPoints: ["src/index.ts"],
        bundle: true,
        format: "cjs",
        minify: production,
        sourcemap: true,
        sourcesContent: false,
        platform: "node",
        outfile: "dist/index.cjs",
        external: ["vscode", "oxc-parser"],
        logLevel: "silent",
        plugins: [esbuildProblemMatcherPlugin, workspacePackagesPlugin],
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
