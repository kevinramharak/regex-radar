// @ts-check
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { publishVSIX } from '@vscode/vsce';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagePath = path.resolve(__dirname, '..');
const packageJsonPath = path.resolve(packagePath, 'package.json');

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
 * A custom `vsce publish` script
 * @param {string[]} args
 * @returns {Promise<number>}
 */
async function main(...args) {
    const contents = await readFile(packageJsonPath, { encoding: 'utf-8' });
    const json = JSON.parse(contents);
    const isPreRelease = args.includes('--pre-release');
    validateVersion(json.version, isPreRelease);
    const packagePath = `./dist/regex-radar-${json.version}.vsix`;
    if (!existsSync(packagePath)) {
        console.log(
            `missing .vsix file at ${packagePath}, run 'npm run publish' and make sure the versions and pre-release status match`,
        );
        return 1;
    }
    publishVSIX(packagePath, {
        preRelease: isPreRelease,
    });
    return 0;
}

main(...process.argv.slice(2)).then((code) => (process.exitCode = code));
