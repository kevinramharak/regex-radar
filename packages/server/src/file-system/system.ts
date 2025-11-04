import type { FileSystem as _FileSystem, FileStat, FileType, Uri } from 'vscode';

import { collection, createInterfaceId, Injectable } from '@gitlab/needle';

import { IFileSystemProvider } from '../file-system-provider';
import { createFileSystemProviderError, FileSystemProviderErrorCode } from '../file-system-provider/error';
import { Disposable } from '../util/disposable';

export interface IFileSystem extends _FileSystem {}

export const IFileSystem = createInterfaceId<IFileSystem>('IFileSystem');

@Injectable(IFileSystem, [collection(IFileSystemProvider)])
export class FileSystem extends Disposable implements IFileSystem {
    private readonly map: Record<string, IFileSystemProvider> = {};

    constructor(fileSystems: IFileSystemProvider[]) {
        super();
        for (const fileSystem of fileSystems) {
            if (this.map[fileSystem.scheme]) {
                throw new TypeError(`duplicate IFileSystem implementation for scheme: ${fileSystem.scheme}`);
            }
            this.map[fileSystem.scheme] = fileSystem;
        }
    }

    private getFileSystemProvider(scheme: string): IFileSystemProvider | null {
        return this.map[scheme] ?? null;
    }

    private resolveFileSystemProvider(uri: Uri): IFileSystemProvider | null {
        return this.getFileSystemProvider(uri.scheme);
    }

    isWritableFileSystem(scheme: string): boolean | undefined {
        const fs = this.getFileSystemProvider(scheme);
        if (fs) {
            return !fs.isReadonly;
        }
    }

    async stat(uri: Uri): Promise<FileStat> {
        const fs = this.resolveFileSystemProvider(uri);
        if (fs) {
            return fs.stat(uri);
        }
        throw createFileSystemProviderError(
            `missing IFileSystem implementation for ${uri.scheme}`,
            FileSystemProviderErrorCode.NotSupported,
        );
    }

    async readDirectory(uri: Uri): Promise<[string, FileType][]> {
        const fs = this.resolveFileSystemProvider(uri);
        if (fs) {
            return fs.readDirectory(uri);
        }
        throw createFileSystemProviderError(
            `missing IFileSystem implementation for ${uri.scheme}`,
            FileSystemProviderErrorCode.NotSupported,
        );
    }

    async createDirectory(uri: Uri): Promise<void> {
        const fs = this.resolveFileSystemProvider(uri);
        if (fs) {
            if (fs.isReadonly) {
                throw createFileSystemProviderError(
                    `fs is not writable`,
                    FileSystemProviderErrorCode.NotSupported,
                );
            }
            return fs.createDirectory(uri);
        }
        throw createFileSystemProviderError(
            `missing IFileSystem implementation for ${uri.scheme}`,
            FileSystemProviderErrorCode.NotSupported,
        );
    }

    async readFile(uri: Uri): Promise<Uint8Array> {
        const fs = this.resolveFileSystemProvider(uri);
        if (fs) {
            return fs.readFile(uri);
        }
        throw createFileSystemProviderError(
            `missing IFileSystem implementation for ${uri.scheme}`,
            FileSystemProviderErrorCode.NotSupported,
        );
    }

    async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
        const fs = this.resolveFileSystemProvider(uri);
        if (fs) {
            if (fs.isReadonly) {
                throw createFileSystemProviderError(
                    `fs is not writable`,
                    FileSystemProviderErrorCode.NotSupported,
                );
            }
            await fs.writeFile(uri, content, { create: true, overwrite: true });
            return;
        }
        throw createFileSystemProviderError(
            `missing IFileSystem implementation for ${uri.scheme}`,
            FileSystemProviderErrorCode.NotSupported,
        );
    }

    async delete(uri: Uri, options: { recursive?: boolean; useTrash?: boolean }): Promise<void> {
        const fs = this.resolveFileSystemProvider(uri);
        if (fs) {
            if (fs.isReadonly) {
                throw createFileSystemProviderError(
                    'fs does not support writing',
                    FileSystemProviderErrorCode.NotSupported,
                );
            }
            await fs.delete(uri, { recursive: options.recursive ?? false });
            return;
        }
        throw createFileSystemProviderError(
            `missing IFileSystem implementation for ${uri.scheme}`,
            FileSystemProviderErrorCode.NotSupported,
        );
    }

    async rename(oldUri: Uri, newUri: Uri, options: { readonly overwrite: boolean }): Promise<void> {
        const oldFs = this.resolveFileSystemProvider(oldUri);
        const newFs = this.resolveFileSystemProvider(newUri);
        if (oldFs) {
            if (oldFs === newFs) {
                if (oldFs.isReadonly) {
                    throw createFileSystemProviderError(
                        `old file system provider does not support writing`,
                        FileSystemProviderErrorCode.NotSupported,
                    );
                }
                return oldFs.rename(oldUri, newUri, options);
            }
            if (newFs) {
                if (newFs.isReadonly) {
                    throw createFileSystemProviderError(
                        `new file system provider does not support writing`,
                        FileSystemProviderErrorCode.NotSupported,
                    );
                }
                const content = await oldFs.readFile(oldUri);
                await newFs.writeFile(newUri, content, { create: true, overwrite: true });
            }
            throw createFileSystemProviderError(
                `missing IFileSystem implementation for ${newUri.scheme}`,
                FileSystemProviderErrorCode.NotSupported,
            );
        }
        throw createFileSystemProviderError(
            `missing IFileSystem implementation for ${oldUri.scheme}`,
            FileSystemProviderErrorCode.NotSupported,
        );
    }

    async copy(source: Uri, destination: Uri, options: { readonly overwrite: boolean }): Promise<void> {
        const sourceFs = this.resolveFileSystemProvider(source);
        const destinationFs = this.resolveFileSystemProvider(destination);
        if (sourceFs) {
            if (sourceFs === destinationFs) {
                if (sourceFs.isReadonly || !sourceFs.copy) {
                    throw createFileSystemProviderError(
                        `source file system provider does not support copying`,
                        FileSystemProviderErrorCode.NotSupported,
                    );
                }
                return sourceFs.copy(source, destination, options);
            }
            if (destinationFs) {
                if (destinationFs.isReadonly) {
                    throw createFileSystemProviderError(
                        `destination file system provider does not support writing`,
                        FileSystemProviderErrorCode.NotSupported,
                    );
                }
                const content = await sourceFs.readFile(source);
                await destinationFs.writeFile(destination, content, { create: true, overwrite: true });
            }
            throw createFileSystemProviderError(
                `missing IFileSystem implementation for ${destination.scheme}`,
                FileSystemProviderErrorCode.NotSupported,
            );
        }
        throw createFileSystemProviderError(
            `missing IFileSystem implementation for ${source.scheme}`,
            FileSystemProviderErrorCode.NotSupported,
        );
    }
}
