import type { Stats } from 'node:fs';
import { stat, copyFile, writeFile, readFile, constants, mkdir, rm, readdir, rename } from 'node:fs/promises';

import { createInstanceDescriptor } from '@gitlab/needle';

import { IFileSystem } from '..';

import { FileType, FilePermission } from '../file-stats';

// TODO: implement the correct throws from `FileSystemProvider`
const nodeFileSystem: IFileSystem = {
    scheme: 'file',
    isWritable: true,
    get isReadonly() {
        return !this.isWritable;
    },
    async stat(uri) {
        const stats = await stat(uri.fsPath);
        const type = getFileType(stats);
        const permissions = this.isWritable ? getPermissions(stats, type) : FilePermission.Readonly;
        return {
            ctime: stats.ctimeMs,
            mtime: stats.mtimeMs,
            size: stats.size,
            type,
            permissions: permissions as import('vscode').FilePermission,
        };
    },
    async copy(source, target, options) {
        return copyFile(
            source.fsPath,
            target.fsPath,
            options?.overwrite ? undefined : constants.COPYFILE_EXCL,
        );
    },
    async createDirectory(uri) {
        return void mkdir(uri.fsPath, { recursive: true });
    },
    async delete(uri, options) {
        if (options?.useTrash) {
            // TODO: implement this ('trash' module does this)
        }
        return rm(uri.fsPath, {
            recursive: options?.recursive,
        });
    },
    async readDirectory(uri) {
        const entries = await readdir(uri.fsPath, { withFileTypes: true });
        return entries.map((entry) => {
            return [entry.name, getFileType(entry)];
        });
    },
    async readFile(uri) {
        return readFile(uri.fsPath);
    },
    async rename(source, target, options) {
        if (options?.overwrite) {
            // TODO: implement this, maybe with `existsSync`
        }
        return rename(source.fsPath, target.fsPath);
    },
    async writeFile(uri, content) {
        // TODO: maybe try fs.writeStream
        return writeFile(uri.fsPath, content);
    },
    isWritableFileSystem(scheme) {
        if (scheme === this.scheme) {
            return this.isWritable;
        }
    },
};

type FileTypeEntry = {
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
};

function getFileType(entry: FileTypeEntry): FileType {
    if (entry.isFile()) {
        return FileType.File;
    } else if (entry.isDirectory()) {
        return FileType.Directory;
    } else if (entry.isSymbolicLink()) {
        return FileType.SymbolicLink;
    } else {
        return FileType.Unknown;
    }
}

function getPermissions(stats: Stats, type: FileType): FilePermission {
    const octal = toOctal(stats.mode);
    switch (type) {
        case FileType.File: {
            return FilePermission.Readonly;
        }
        case FileType.Directory: {
            return FilePermission.Readonly;
        }
        case FileType.SymbolicLink: {
            return FilePermission.Readonly;
        }
        case FileType.Unknown: {
            return FilePermission.Readonly;
        }
    }
}

function toOctal(mode: number) {
    return mode & 0o7777;
}

export const NodeFileSystem = createInstanceDescriptor({
    instance: nodeFileSystem,
    aliases: [IFileSystem],
});
