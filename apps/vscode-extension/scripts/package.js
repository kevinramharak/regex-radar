// @ts-check
import * as path from 'node:path';
import { readFile, writeFile, readdir, copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { createVSIX } from '@vscode/vsce';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagePath = path.resolve(__dirname, '..');
const packageJsonPath = path.resolve(packagePath, 'package.json');
const distDirectoryPath = path.resolve(packagePath, 'dist');
const monoRepoPath = path.resolve(packagePath, '..', '..');
const nodeModulesPath = path.resolve(monoRepoPath, 'node_modules');

const treeSitterWasmPath = path.resolve(nodeModulesPath, 'web-tree-sitter', 'tree-sitter.wasm');
const treeSitterGrammarsDirectory = path.resolve(monoRepoPath, 'packages', 'parsers', 'grammars');
const wasmDestinationDirectoryPath = path.resolve(distDirectoryPath, 'wasm');

const serverModulePath = path.resolve(monoRepoPath, 'packages', 'server', 'dist', 'server.min.js');
const serverModuleDestinationPath = path.resolve(distDirectoryPath, 'server.min.js');

async function ensureServerModuleIsCopied() {
    console.log(`copying server module`);
    console.log(`  - ${serverModulePath}`);
    await copyFile(serverModulePath, serverModuleDestinationPath);
}

async function ensureServerWasmFilesAreCopied() {
    console.log('copying .wasm files:');
    console.log(`  - ${treeSitterWasmPath}`);
    await mkdir(wasmDestinationDirectoryPath, { recursive: true });
    await Promise.all([
        copyFile(treeSitterWasmPath, path.join(wasmDestinationDirectoryPath, 'tree-sitter.wasm')),
        readdir(treeSitterGrammarsDirectory).then((fileNames) => {
            return Promise.all(
                fileNames
                    .filter((fileName) => fileName.endsWith('.wasm'))
                    .map((fileName) => {
                        const src = path.join(treeSitterGrammarsDirectory, fileName);
                        console.log(`  - ${src}`);
                        return copyFile(src, path.join(wasmDestinationDirectoryPath, fileName));
                    }),
            );
        }),
    ]);
}

/**
 * @param {string} contents
 */
async function patchPackageJson(contents) {
    console.log('patching package.json');
    /**
     * @type {import('../package.json') & { imports: Record<string, string>}}
     */
    const json = JSON.parse(contents);

    // patch `extension.js` to `extension.min.js`
    if (!json.main.endsWith('.min.js')) {
        console.log(`  - main: .js -> .min.js`);
        json.main = json.main.replace(/\.js$/, '.min.js');
    }
    json['imports'] = {
        '#wasm/tree-sitter.wasm': './dist/wasm/tree-sitter.wasm',
        '#wasm/grammars/*.wasm': './dist/wasm/*.wasm',
    };
    const patchedContents = JSON.stringify(json, null, 4);
    await writeFile(packageJsonPath, patchedContents);
}

/**
 * Current contents
 */
let contents = '';

/**
 * A custom `vsce package` script, to support patching `package.json` manifest
 * @param {string[]} args
 * @returns {Promise<number>}
 */
async function main(...args) {
    let error;
    // read original contents
    contents = await readFile(packageJsonPath, { encoding: 'utf-8' });
    try {
        await ensureServerWasmFilesAreCopied();
        await ensureServerModuleIsCopied();
        await patchPackageJson(contents);
        // package extension
        await createVSIX();
    } catch (e) {
        error = e;
    } finally {
        // restore original contents
        if (contents) {
            await writeFile(packageJsonPath, contents);
        }
    }
    if (error) {
        console.error(error);
        return 1;
    }
    return 0;
}

main(...process.argv.slice(2)).then((code) => (process.exitCode = code));
