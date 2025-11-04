import type { GlobPattern, Uri } from 'vscode';

import { Injectable, collection, createInterfaceId } from '@gitlab/needle';

import { IFileSystemWatcherFactory, type FileSystemWatcherIgnore } from './factory';
import type { IFileSystemWatcher } from './watcher';

export interface IFileSystemWatcherProvider {
    create(
        glob: GlobPattern,
        options: { scheme?: string; ignore?: FileSystemWatcherIgnore },
    ): IFileSystemWatcher;
}

export const IFileSystemWatcherProvider =
    createInterfaceId<IFileSystemWatcherProvider>('FileSystemWatcherProvider');

@Injectable(IFileSystemWatcherProvider, [collection(IFileSystemWatcherFactory)])
export class FileSystemWatcherProvider implements IFileSystemWatcherProvider {
    private readonly map: Record<string, IFileSystemWatcherFactory> = {};

    constructor(factories: IFileSystemWatcherFactory[]) {
        for (const factory of factories) {
            if (this.map[factory.scheme]) {
                throw new TypeError(
                    `duplicate IFileSystemWatcherFactory implementation for scheme: ${factory.scheme}`,
                );
            }
            this.map[factory.scheme] = factory;
        }
    }

    private getFileSystemWatcherFactory(scheme: string): IFileSystemWatcherFactory | null {
        return this.map[scheme] ?? null;
    }

    private resolveFileSystemWatcherFactory(uri: Uri): IFileSystemWatcherFactory | null {
        return this.getFileSystemWatcherFactory(uri.scheme);
    }

    create(
        glob: GlobPattern,
        options?: { scheme?: string; ignore?: FileSystemWatcherIgnore },
    ): IFileSystemWatcher {
        const factory = this.getFileSystemWatcherFactory(options?.scheme ?? 'file');
        if (!factory) {
            throw new TypeError(
                `no file system watcher factory was registered for this scheme: ${options?.scheme}`,
            );
        }
        return factory.create(glob, options?.ignore);
    }
}
