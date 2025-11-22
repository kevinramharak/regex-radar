// @ts-check
// import { esbuildProblemMatcherPlugin } from "./plugins/problem-matcher-plugin.js";
import { scmImporterPlugin } from './plugins/scm-importer-plugin.js';
import { workspacePackagesPlugin } from './plugins/workspace-packages-plugin.js';
import { writeMetaFilePlugin } from './plugins/write-meta-file-plugin.js';

const isProduction = process.argv.includes('--production');
const metafile = isProduction || process.argv.includes('--metafile');
const analyze = process.argv.includes('--analyze');
const verbose = process.argv.includes('--verbose');

/**
 * @type {import('esbuild').BuildOptions}
 */
export const sharedOptions = {
    minify: isProduction,
    /**
     * Generate sourcemaps for development, but make sure they are not being bundled as part of the extension with `files` or a `.vscodeignore`
     */
    sourcemap: !isProduction,
    sourcesContent: false,
    /**
     * Based on the node version bundled with vscode 1.105.x
     * @see https://github.com/ewanharris/vscode-versions
     */
    target: 'node22.19',
    logLevel: verbose ? 'verbose' : 'info',
    format: 'esm',
    treeShaking: true,
    mainFields: ['module', 'main'],
    plugins: [
        workspacePackagesPlugin,
        scmImporterPlugin,
        writeMetaFilePlugin(metafile, analyze, verbose),
    ],
};

/**
 * Because `vscode-languageserver` is distrubuted as commonjs, we need this banner to fix `require` calls.
 * @see https://github.com/evanw/esbuild/issues/1921
 * NOTE: only use this when bundling into a single file with `bundle: true`
 * TODO: get rid of this with ESM builds
 */
export const banner = `
// topLevelCreateRequire is used to circumvent external dependencies being bundled as CJS instead of ESM
import { createRequire as __cjs_create_require } from 'node:module';
const require = __cjs_create_require(import.meta.url);

// attempt to provide __filename and __dirname for CJS modules that depend on it
import { fileURLToPath as __cjs_file_url_to_path } from 'node:url';
import { dirname as __cjs_dirname } from 'node:path';
const __filename = __cjs_file_url_to_path(import.meta.url);
const __dirname = __cjs_dirname(__filename);
`;
