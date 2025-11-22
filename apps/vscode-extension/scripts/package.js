// @ts-check
import * as path from 'node:path';
import { readFile, writeFile, readdir, copyFile, mkdir, cp } from 'node:fs/promises';
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

const workerPath = path.resolve(nodeModulesPath, '@regex-radar', 'recheck-esm', 'lib', 'thread.worker.js');
const workerDestinationPath = path.resolve(distDirectoryPath, 'workers', 'recheck');

async function ensureWorkerFilesAreCopied() {
    console.log('copying .worker files:');
    console.log(`  - ${workerPath}`);
    await mkdir(workerDestinationPath, { recursive: true });
    await copyFile(workerPath, path.join(workerDestinationPath, 'thread.worker.js'));
}

async function ensureDependenciesAreCopied() {
    console.log('copying @regex-radar/recheck-scalajs');
    const source = path.resolve(nodeModulesPath, '@regex-radar', 'recheck-scalajs')
    const dest = path.resolve(distDirectoryPath, 'node_modules', '@regex-radar', 'recheck-scalajs');
    await cp(source, dest, { recursive: true });
}

/**
 * @param {import('../package.json') & Record<string, unknown>} json
 */
async function patchPackageJson(json) {
    console.log('patching package.json');
    // patch `extension.js` to `extension.min.js`
    if (!json.main.endsWith('.min.js')) {
        const main = json.main;
        const mainMin = json.main.replace(/\.js$/, '.min.js');
        console.log(`  - main: '${main}' -> '${mainMin}'`);
        json.main = mainMin;
    }
    // create import mappings for the wasm and worker paths
    // TODO: just copy these dependencies to dist/node_modules and drop the import maps
    json['imports'] = {
        '#wasm/tree-sitter.wasm': './dist/wasm/tree-sitter.wasm',
        '#wasm/grammars/*.wasm': './dist/wasm/*.wasm',
        '#workers/recheck/thread.worker': './dist/workers/recheck/thread.worker.js',
    };
    const patchedContents = JSON.stringify(json, null, 4);
    await writeFile(packageJsonPath, patchedContents);
}

/**
 *
 * @param {boolean} isPreRelease
 */
async function packageVSIX(isPreRelease) {
    console.log('invoking `vsce package`');
    await createVSIX({
        // NOTE: this directory has to exist, else it will write the .vsix file to the directory path as a file...
        packagePath: distDirectoryPath,
        // NOTE: because `vsce` is a buggy and undocumented mess, this has to be a relative path, but without using `./` or `../`
        readmePath: 'dist/README.md',
        preRelease: isPreRelease,
    });
}

/**
 * @template T
 * @param {(contents: string) => Promise<T> | T} task
 * @returns {Promise<T>}
 */
async function usingPackageJson(task) {
    let didRestore = false;
    const contents = await readFile(packageJsonPath, { encoding: 'utf-8' });

    async function restore() {
        if (!didRestore) {
            console.log('restoring package.json...');
            await writeFile(packageJsonPath, contents);
            didRestore = true;
            console.log('restored package.json');
        }
    }

    // `vsce` might call `process.exit
    process.on('beforeExit', restore);

    try {
        return await task(contents);
    } finally {
        restore();
    }
}

/**
 *
 * @param {unknown} error
 */
function handleError(error) {
    if (error instanceof Error) {
        console.error(`name: `, error.name);
        console.error(`message: `, error.message);
        if ('code' in error) {
            console.error('code: ', error['code']);
        }
        if (error.stack) {
            console.error(`stack: `, error.stack);
        }
        if (error.cause) {
            console.error(`cause: `, error.cause);
        }
    } else {
        console.error(error);
    }
}

/**
 * @param {string} version
 * @param {boolean} isPreRelease
 */
function validateVersion(version, isPreRelease) {
    // VS Code does not allow anything other than `x.x.x`, check CONTRIBUTING.md for version management
    if (!/0\.\d{1,2}\.\d{1,2}/.test(version)) {
        throw new Error(`expected a version matching pattern '0.x.x', instead got '${version}'`);
    }
    const [_major, minor, _patch] = version.split('.').map((n) => Number(n));
    // pre-release needs to be uneven, release even
    const check = isPreRelease ? 1 : 0;
    const matched = minor % 2 === check;
    if (!matched) {
        throw new Error(`--pre-release needs an uneven minor version, instead got 'x.${minor}.x'`);
    }
}

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
async function main(...args) {
    return await usingPackageJson(async (contents) => {
        const isPreRelease = args.includes('--pre-release');
        try {
            /**
             * @type {import('../package.json')}
             */
            const json = JSON.parse(contents);
            validateVersion(json.version, isPreRelease);
            await ensureReadmeIsCopied();
            await ensureServerWasmFilesAreCopied();
            await ensureWorkerFilesAreCopied();
            await ensureServerModuleIsCopied();
            await ensureDependenciesAreCopied();
            await patchPackageJson(json);
            await packageVSIX(isPreRelease);
        } catch (error) {
            handleError(error);
            return 1;
        }
        return 0;
    });
}

main(...process.argv.slice(2)).then((code) => (process.exitCode = code));
