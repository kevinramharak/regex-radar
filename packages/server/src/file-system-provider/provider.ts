import type { FileSystemProvider as _FileSystemProvider, FileStat, FileType, Uri } from 'vscode';

import { collection, createInterfaceId, Injectable } from '@gitlab/needle';

import { IFileSystem } from '../file-system';
import { Disposable } from '../util/disposable';

import type { OnDidChangeFileHandler } from './events';

export interface IFileSystemProvider extends _FileSystemProvider {}

export const IFileSystemProvider = createInterfaceId<IFileSystemProvider>('IFileSystemProvider');

@Injectable(IFileSystemProvider, [collection(IFileSystem)])
export class FileSystemProvider extends Disposable implements IFileSystemProvider {
    constructor(private readonly fileSystems: IFileSystem[]) {
        super();
    }

    private getFileSystemForUri(uri: Uri): IFileSystem | null {
        return this.fileSystems.find((fileSystem) => fileSystem.scheme === uri.scheme) ?? null;
    }

    onDidChangeFile(handler: OnDidChangeFileHandler): Disposable {
        throw new Error('Method not implemented.');
    }

    watch(
        uri: Uri,
        options: { readonly recursive: boolean; readonly excludes: readonly string[] },
    ): Disposable {
        // implement a IFileSystemWatcher interface, that implements watching per scheme
        // this would make it easy to have `file` scheme URI's to use the FileWatcher API from vscode (as long as its in the workspace)
        // maybe use a the node implementation for files outside of the workspace
        throw new Error('Method not implemented.');
    }

    stat(uri: Uri): FileStat | Thenable<FileStat> {
        const fs = this.getFileSystemForUri(uri);
        if (fs) {
            return fs.stat(uri);
        }
        // TODO: throw FileSystemError.FileNotFound when uri doesn't exist.
        throw new Error('Method not implemented.');
    }

    readDirectory(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> {
        const fs = this.getFileSystemForUri(uri);
        if (fs) {
            return fs.readDirectory(uri);
        }
        // TODO: throw FileSystemError.FileNotFound when uri doesn't exist.
        throw new Error('Method not implemented.');
    }

    createDirectory(uri: Uri): void | Thenable<void> {
        const fs = this.getFileSystemForUri(uri);
        if (fs) {
            return fs.createDirectory(uri);
        }
        // TODO: throw FileSystemError.FileNotFound when the parent of uri doesn't exist, e.g. no mkdirp-logic required.
        // TODO: throw FileSystemError.FileExists when uri already exists.
        throw new Error('Method not implemented.');
    }

    readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
        const fs = this.getFileSystemForUri(uri);
        if (fs) {
            return fs.readFile(uri);
        }
        // TODO: throw FileSystemError.FileNotFound when uri doesn't exist.
        throw new Error('Method not implemented.');
    }

    writeFile(
        uri: Uri,
        content: Uint8Array,
        options: { readonly create: boolean; readonly overwrite: boolean },
    ): void | Thenable<void> {
        const fs = this.getFileSystemForUri(uri);
        if (fs) {
            if (!options.create || !options.overwrite) {
                throw new Error('Options not implemented.');
            }
            return fs.writeFile(uri, content);
        }
        // throws FileSystemError.FileNotFound when uri doesn't exist and create is not set.
        // throws FileSystemError.FileNotFound when the parent of uri doesn't exist and create is set, e.g. no mkdirp-logic required.
        // throws FileSystemError.FileExists when uri already exists, create is set but overwrite is not set.
        // throws FileSystemError.NoPermissions when permissions aren't sufficient.
        throw new Error('Method not implemented.');
    }

    delete(uri: Uri, options: { readonly recursive: boolean }): void | Thenable<void> {
        const fs = this.getFileSystemForUri(uri);
        if (fs) {
            return fs.delete(uri, options);
        }
        // throws FileSystemError.FileNotFound when uri doesn't exist
        // throws FileSystemError.NoPermissions when permissions aren't sufficient.
        throw new Error('Method not implemented.');
    }

    rename(oldUri: Uri, newUri: Uri, options: { readonly overwrite: boolean }): void | Thenable<void> {
        const oldFs = this.getFileSystemForUri(oldUri);
        const newFs = this.getFileSystemForUri(newUri);
        if (oldFs) {
            if (oldFs === newFs) {
                return oldFs.rename(oldUri, newUri, options);
            }
        }
        // throws FileSystemError.FileNotFound when oldUri doesn't exist.
        // throws FileSystemError.FileNotFound when parent of newUri doesn't exist, e.g. no mkdirp-logic required.
        // throws FileSystemError.FileExists when newUri exists and when the overwrite option is not true.
        // throws FileSystemError.NoPermissions when permissions aren't sufficient.
        throw new Error('Method not implemented.');
    }

    copy(source: Uri, destination: Uri, options: { readonly overwrite: boolean }): void | Thenable<void> {
        const oldFs = this.getFileSystemForUri(source);
        const newFs = this.getFileSystemForUri(destination);
        if (oldFs) {
            if (oldFs === newFs) {
                return oldFs.copy(source, destination, options);
            }
        }
        // throws FileSystemError.FileNotFound when source doesn't exist.
        // throws FileSystemError.FileNotFound when parent of destination doesn't exist, e.g. no mkdirp-logic required.
        // throws FileSystemError.FileExists when destination exists and when the overwrite option is not true.
        // throws FileSystemError.NoPermissions when permissions aren't sufficient.
        throw new Error('Method not implemented.');
    }
}
