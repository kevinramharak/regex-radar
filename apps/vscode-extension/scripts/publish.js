import { publishVSIX } from '@vscode/vsce';

/**
 * A custom `vsce publish` script
 * @param {string[]} _args
 * @returns {Promise<number>}
 */
async function main(..._args) {
    throw new Error('publishing is blocked until the first proper alpha release is ready');
    // eslint-disable-next-line no-unreachable
    publishVSIX('./dist/regex-radar-0.1.0.vsix', {
        gitTagVersion: false,
        updatePackageJson: false,
        preRelease: true,
    });
    return 0;
}

main(...process.argv.slice(2)).then((code) => (process.exitCode = code));
