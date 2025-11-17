// @ts-check
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import packageJson from '../package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef Grammar
 * @property {string} name
 * @property {string} packageName
 */

/**
 * @typedef GrammarBuildResult
 * @property {string} name
 * @property {string} wasmFile
 * @property {string} version
 * @property {number} size
 */

/**
 * Based on gitlab's approach
 * @type {Grammar[]}
 * @see https://gitlab.com/gitlab-org/editor-extensions/gitlab-lsp/-/blob/main/vendor/tree-sitter-packages/scripts/build-grammars.js
 */
const GRAMMARS = [
    {
        name: 'typescript',
        packageName: 'tree-sitter-typescript/typescript',
    },
    {
        name: 'tsx',
        packageName: 'tree-sitter-typescript/tsx',
    },
    {
        name: 'javascript',
        packageName: 'tree-sitter-javascript',
    },
    {
        name: 'jsx',
        packageName: 'tree-sitter-javascript',
    },
    {
        name: 'json',
        packageName: 'tree-sitter-json',
    },
];

/**
 * @type {Map<string, [string, number]>}
 */
const cache = new Map();

/**
 * Root directory of `@regex-radar/tree-sitter`
 */
const pkgRoot = path.resolve(__dirname, '..');
const outputDirPath = path.resolve(pkgRoot, 'grammars');

/**
 * @param {Grammar} grammar
 * @returns {Promise<GrammarBuildResult | null>}
 */
async function buildGrammar(grammar) {
    console.log(`Building ${grammar.name} grammar...`);

    try {
        const wasmFileName = `tree-sitter-${grammar.name}.wasm`;
        const packageImportPath = fileURLToPath(import.meta.resolve(grammar.packageName));
        const wasmFileInputPath = path.join(
            packageImportPath.slice(0, packageImportPath.lastIndexOf('node_modules')),
            'node_modules',
            grammar.packageName,
        );
        const wasmFileOutputPath = path.join(outputDirPath, `tree-sitter-${grammar.name}.wasm`);

        if (!cache.has(grammar.packageName)) {
            try {
                // has to be sync, tree-sitter doesnt do well with multiple exec's in parallel
                execSync(`tree-sitter build --wasm --output ${wasmFileOutputPath} ${wasmFileInputPath} `, {
                    cwd: process.cwd(),
                });
                cache.set(grammar.packageName, [wasmFileName, (await stat(wasmFileOutputPath)).size]);
            } catch (buildError) {
                if (buildError instanceof Error) {
                    console.error(`Build failed for ${grammar.name}:`, buildError.message);
                }
                return null;
            }
        } else {
            console.log(`skipping ${grammar.name}, as ${grammar.packageName} is already build`);
        }

        if (!(grammar.packageName in packageJson.devDependencies)) {
            console.error(`${grammar.packageName} is not listed as a devDependency in the package.json`);
            return null;
        }

        const packageName = /** @type {keyof typeof packageJson.devDependencies} */ (grammar.packageName);
        const version = packageJson.devDependencies[packageName];

        const [wasmFile, size] = cache.get(grammar.packageName) || [wasmFileName, 0];
        return {
            name: grammar.name,
            wasmFile,
            version,
            size,
        };
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error building ${grammar.name}:`, error.message);
        }
        return null;
    }
}

async function main() {
    await mkdir(outputDirPath, { recursive: true });

    /**
     * @type {GrammarBuildResult[]}
     */
    const results = [];
    for (const grammar of GRAMMARS) {
        const result = await buildGrammar(grammar);
        if (result) {
            results.push(result);
            console.log(`✓ Built ${result.name} (${(result.size / 1024).toFixed(1)}KB)`);
        }
    }

    const manifest = {
        version: packageJson.version,
        buildDate: new Date().toISOString(),
        grammars: results,
    };
    await writeFile(path.join(outputDirPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`\nBuilt ${results.length} grammars successfully!`);
    console.log(`Output directory: ${outputDirPath}`);
}

main().catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});
