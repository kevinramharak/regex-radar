// @ts-check
// import { esbuildProblemMatcherPlugin } from "./plugins/problem-matcher-plugin.js";
import { scmImporterPlugin } from './plugins/scm-importer-plugin.js';
import { workspacePackagesPlugin } from './plugins/workspace-packages-plugin.js';
import { writeMetaFilePlugin } from './plugins/write-meta-file-plugin.js';

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');
const enableMetaFile = isProduction || process.argv.includes('--metafile');

/**
 * @type {import('esbuild').BuildOptions}
 */
export const sharedOptions = {
    minify: isProduction,
    /**
     * Always generate sourcemaps, but make sure they are not being bundled as part of the extension with `files` or a `.vscodeignore`
     */
    sourcemap: !isProduction,
    sourcesContent: false,
    /**
     * Based on the node version bundled with vscode 1.105.x
     * @see https://github.com/ewanharris/vscode-versions
     */
    target: 'node22.19',
    logLevel: 'info',
    format: 'esm',
    treeShaking: true,
    plugins: [workspacePackagesPlugin, scmImporterPlugin, writeMetaFilePlugin(enableMetaFile)],
};

/**
 * Because `vscode-languageserver` is distrubuted as commonjs, we need this banner to fix `require` calls.
 * @see https://github.com/evanw/esbuild/issues/1921
 * NOTE: only use this when bundling into a single file with `bundle: true`
 */
export const banner = `
// topLevelCreateRequire is used to circumvent external dependencies being bundled as CJS instead of ESM
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
`;
