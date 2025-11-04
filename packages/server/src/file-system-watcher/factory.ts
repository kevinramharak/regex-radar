import type { GlobPattern } from 'vscode';

import { createInterfaceId } from '@gitlab/needle';

import type { IFileSystemWatcher } from './watcher';

export interface FileSystemWatcherIgnore {
    create?: boolean;
    change?: boolean;
    delete?: boolean;
}

// TODO: figre out this API
export interface IFileSystemWatcherFactory {
    readonly scheme: string;
    create(glob: GlobPattern, options?: FileSystemWatcherIgnore): IFileSystemWatcher;
}

export const IFileSystemWatcherFactory =
    createInterfaceId<IFileSystemWatcherFactory>('IFileSystemWatcherFactory');
