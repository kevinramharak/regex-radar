import type { FileSystemWatcher as _FileSystemWatcher, Uri } from 'vscode';

import { createInterfaceId } from '@gitlab/needle';

import { Disposable } from '../util/disposable';

export interface IFileSystemWatcher extends _FileSystemWatcher {
    readonly scheme: string;
    readonly ignoreCreateEvents: boolean;
    readonly ignoreChangeEvents: boolean;
    readonly ignoreDeleteEvents: boolean;
    onDidCreate(handler: (uri: Uri) => void): Disposable;
    onDidChange(handler: (uri: Uri) => void): Disposable;
    onDidDelete(handler: (uri: Uri) => void): Disposable;
}

export const IFileSystemWatcher = createInterfaceId<IFileSystemWatcher>('IFileSystemWatcher');
