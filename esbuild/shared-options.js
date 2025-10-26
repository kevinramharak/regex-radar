// @ts-check

// import { esbuildProblemMatcherPlugin } from "./plugins/problem-matcher-plugin.js";
import { workspacePackagesPlugin } from "./plugins/workspace-packages-plugin.js";

const isProduction = process.argv.includes("--production");
const isWatch = process.argv.includes("--watch");
const enableMetaFile = isProduction || process.argv.includes("--metafile");

/**
 * @type {import('esbuild').BuildOptions}
 */
export const sharedOptions = {
    bundle: true,
    minify: isProduction,
    sourcemap: !isProduction,
    sourcesContent: false,
    target: "node22.19",
    format: "cjs",
    logLevel: "info",
    metafile: enableMetaFile,
    plugins: [workspacePackagesPlugin],
};
