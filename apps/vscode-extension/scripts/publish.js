import { existsSync } from 'node:fs';
import { publishVSIX } from '@vscode/vsce';

/**
 * A custom `vsce publish` script
 * @param {string[]} args
 * @returns {Promise<number>}
 */
async function main(...args) {
    if (!args.includes('--experimental-release')) {
        console.error('publishing is blocked until the first proper alpha release is ready, use --experimental-release');
        return 1;
    }
    const packagePath = './dist/regex-radar-0.1.2.vsix';
    if (!existsSync(packagePath)) {
        console.log(`missing .vsix file at ${packagePath}, run 'npm run publish' and make sure the versions and pre-release status match`);
        return 1;
    }
    const isPreRelease = args.includes('--pre-release');
    publishVSIX(packagePath, {
        gitTagVersion: false,
        updatePackageJson: false,
        preRelease: isPreRelease,
    });
    return 0;
}

main(...process.argv.slice(2)).then((code) => (process.exitCode = code));
