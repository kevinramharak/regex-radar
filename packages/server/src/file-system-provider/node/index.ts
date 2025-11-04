import { existsSync, type Stats } from 'node:fs';
import {
    stat,
    copyFile,
    writeFile,
    readFile,
    constants,
    mkdir,
    rm,
    readdir,
    rename,
    lstat,
} from 'node:fs/promises';

import { createInstanceDescriptor } from '@gitlab/needle';

import { FileType, FilePermission } from '../../file-system/file-stats';
import { createFileSystemProviderError, FileSystemProviderErrorCode } from '../error';
import { IFileSystemProvider } from '../provider';

import { toFileSystemProviderError } from './error';

/**
 * A thin implementation wrapper of `IFileSystemProvier` for the `node:fs` API.
 * TODO: implement file watching to the language client
 */
const nodeFileSystemProvider: IFileSystemProvider = {
    scheme: 'file',
    isReadonly: false,
    async stat(uri) {
        try {
            const lstats = await lstat(uri.fsPath);
            const isSymbolicLink = lstats.isSymbolicLink();
            const stats = isSymbolicLink ? await stat(uri.fsPath) : lstats;
            const type = getFileType(stats, isSymbolicLink);
            const permissions = this.isReadonly ? FilePermission.Readonly : getPermissions(stats, type);
            return {
                ctime: stats.birthtimeMs,
                mtime: stats.mtimeMs,
                size: stats.size,
                type,
                permissions,
            };
        } catch (error) {
            if (error instanceof Error) {
                throw toFileSystemProviderError(error);
            }
            throw error;
        }
    },
    async copy(source, target, options) {
        try {
            return await copyFile(
                source.fsPath,
                target.fsPath,
                options?.overwrite ? undefined : constants.COPYFILE_EXCL,
            );
        } catch (error) {
            if (error instanceof Error) {
                throw toFileSystemProviderError(error);
            }
            throw error;
        }
    },
    async createDirectory(uri) {
        try {
            // Implementing `mkdirp` semantics (recursive creation) is not required
            await mkdir(uri.fsPath, { recursive: true });
            return;
        } catch (error) {
            if (error instanceof Error) {
                throw toFileSystemProviderError(error);
            }
            throw error;
        }
    },
    async delete(uri, options) {
        try {
            return await rm(uri.fsPath, {
                recursive: options?.recursive,
            });
        } catch (error) {
            if (error instanceof Error) {
                throw toFileSystemProviderError(error);
            }
            throw error;
        }
    },
    async readDirectory(uri) {
        try {
            const entries = await readdir(uri.fsPath, { withFileTypes: true });
            return entries.map((entry) => {
                return [entry.name, getFileType(entry)];
            });
        } catch (error) {
            if (error instanceof Error) {
                throw toFileSystemProviderError(error);
            }
            throw error;
        }
    },
    async readFile(uri) {
        try {
            return await readFile(uri.fsPath);
        } catch (error) {
            if (error instanceof Error) {
                throw toFileSystemProviderError(error);
            }
            throw error;
        }
    },
    async rename(source, target, options) {
        if (options?.overwrite === false) {
            if (existsSync(target.fsPath)) {
                throw createFileSystemProviderError(
                    `target already exists:${target.fsPath} `,
                    FileSystemProviderErrorCode.FileExists,
                );
            }
        }
        try {
            return await rename(source.fsPath, target.fsPath);
        } catch (error) {
            if (error instanceof Error) {
                throw toFileSystemProviderError(error);
            }
            throw error;
        }
    },
    async writeFile(uri, content, options) {
        try {
            const exists = existsSync(uri.fsPath);
            if (!exists && !options.create) {
                throw createFileSystemProviderError(
                    `file does not exist: ${uri.fsPath}`,
                    FileSystemProviderErrorCode.FileNotFound,
                );
            }
            if (exists && options.create && !options.overwrite) {
                throw createFileSystemProviderError(
                    `file already exists: ${uri.fsPath}`,
                    FileSystemProviderErrorCode.FileExists,
                );
            }
            return await writeFile(uri.fsPath, content);
        } catch (error) {
            if (error instanceof Error) {
                throw toFileSystemProviderError(error);
            }
            throw error;
        }
    },
};

type FileTypeEntry = {
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
};

function getFileType(entry: FileTypeEntry, isSymbolicLink = false): FileType {
    const mask = isSymbolicLink ? FileType.SymbolicLink : 0;
    if (entry.isFile()) {
        return FileType.File | mask;
    } else if (entry.isDirectory()) {
        return FileType.Directory | mask;
    } else if (entry.isSymbolicLink()) {
        return FileType.SymbolicLink;
    } else {
        return FileType.Unknown;
    }
}

function getPermissions(stats: Stats, type: FileType): FilePermission.Readonly | undefined {
    const mode = toOctal(stats.mode);
    switch (type) {
        case FileType.File: {
            return (mode & 0o4) > 0 ? undefined : FilePermission.Readonly;
        }
        case FileType.Directory: {
            return (mode & 0o4) > 0 ? undefined : FilePermission.Readonly;
        }
        case FileType.SymbolicLink: {
            return (mode & 0o4) > 0 ? undefined : FilePermission.Readonly;
        }
        case FileType.Unknown: {
            return FilePermission.Readonly;
        }
    }
}

function toOctal(mode: number) {
    return mode & 0o7777;
}

export const NodeFileSystemProvider = createInstanceDescriptor({
    instance: nodeFileSystemProvider,
    aliases: [IFileSystemProvider],
});
