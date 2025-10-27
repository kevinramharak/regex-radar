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
    minify: isProduction,
    /**
     * Always generate sourcemaps, but make sure they are not being bundled as part of the extension with `files` or a `.vscodeignore`
     */
    sourcemap: true,
    sourcesContent: false,
    /**
     * Based on the node version bundled with vscode 1.105.x
     * @see https://github.com/ewanharris/vscode-versions
     */
    target: "node22.19",
    logLevel: "info",
    /**
     * allows for analyzing the bundle
     * @see https://esbuild.github.io/analyze/
     */
    metafile: enableMetaFile,
    treeShaking: true,
    plugins: [workspacePackagesPlugin],
};
