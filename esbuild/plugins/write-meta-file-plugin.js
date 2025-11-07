// @ts-check
import { writeFile } from 'node:fs/promises';

/**
 * allows for analyzing the bundle
 * @see https://esbuild.github.io/analyze/
 * @param {boolean} enableMetaFile
 * @returns {import('esbuild').Plugin}
 */
export const writeMetaFilePlugin = (enableMetaFile) => ({
    name: 'write-meta-file',
    setup(build) {
        build.initialOptions.metafile = enableMetaFile;
        if (enableMetaFile) {
            build.onEnd(async (result) => {
                const metaFilePath = 'dist/metafile.json';
                await writeFile(metaFilePath, JSON.stringify(result.metafile, null, 2), {
                    encoding: 'utf-8',
                });
                console.log(
                    `generated metafile at: ${metaFilePath}, use https://esbuild.github.io/analyze/ to analyze the bundle`,
                );
            });
        }
    },
});
