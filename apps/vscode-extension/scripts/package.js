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

const readmePath = path.resolve(monoRepoPath, 'README.md');
const readmeDestinationPath = path.resolve(distDirectoryPath, 'README.md');

async function ensureReadmeIsCopied() {
    console.log(`copying readme`);
    console.log(`  - ${readmePath}`);
    await copyFile(readmePath, readmeDestinationPath);
}

const serverModulePath = path.resolve(monoRepoPath, 'packages', 'server', 'dist', 'server.min.js');
const serverModuleDestinationPath = path.resolve(distDirectoryPath, 'server.min.js');

async function ensureServerModuleIsCopied() {
    console.log(`copying server module`);
    console.log(`  - ${serverModulePath}`);
    await copyFile(serverModulePath, serverModuleDestinationPath);
}

const treeSitterWasmPath = path.resolve(nodeModulesPath, 'web-tree-sitter', 'tree-sitter.wasm');
const treeSitterGrammarsDirectory = path.resolve(monoRepoPath, 'packages', 'tree-sitter', 'grammars');
const wasmDestinationDirectoryPath = path.resolve(distDirectoryPath, 'wasm');

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

const workerPath = path.resolve(nodeModulesPath, '@local', 'recheck', 'lib', 'thread.worker.js');
const workerDestinationPath = path.resolve(distDirectoryPath, 'workers', 'recheck');

async function ensureWorkerFilesAreCopied() {
    console.log('copying .worker files:');
    console.log(`  - ${workerPath}`);
    await mkdir(workerDestinationPath, { recursive: true });
    await copyFile(workerPath, path.join(workerDestinationPath, 'thread.worker.js'));
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
        '#workers/recheck/thread.worker': './dist/workers/recheck/thread.worker.js',
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
    contents = await readFile(packageJsonPath, { encoding: 'utf-8' });
    const isPreRelease = args.includes('--pre-release');
    try {
        await ensureReadmeIsCopied();
        await ensureServerWasmFilesAreCopied();
        await ensureWorkerFilesAreCopied();
        await ensureServerModuleIsCopied();
        await patchPackageJson(contents);
        // package extension
        console.log('invoking `vsce package`');
        await createVSIX({
            // NOTE: this directory has to exist, else it will write the .vsix file to the directory path as a file...
            packagePath: distDirectoryPath,
            // NOTE: because `vsce` is a buggy and undocumented mess, this has to be a relative path, but without using `./` or `../`
            readmePath: 'dist/README.md',
            preRelease: isPreRelease,
        });
    } catch (error) {
        console.error(error);
        return 1;
    } finally {
        // restore original contents
        if (contents) {
            await writeFile(packageJsonPath, contents);
            // make sure beforeExit doesn't try to duplicate the restoration
            contents = '';
        }
    }
    return 0;
}

main(...process.argv.slice(2)).then((code) => (process.exitCode = code));

// createVSIX will exit the process if it fails to validate, which is suprising behaviour
process.on('beforeExit', (code) => {
    if (code === 1) {
        if (contents) {
            console.log('`vsce` tried to fatally crash our program, restoring package.json');
            return writeFile(packageJsonPath, contents);
        }
    }
});
