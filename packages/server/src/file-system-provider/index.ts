import type { FileSystemProvider } from 'vscode';

import { createInterfaceId } from '@gitlab/needle';

import { NodeFileSystemProvider } from './node';

export interface IFileSystemProvider extends Omit<FileSystemProvider, 'watch' | 'onDidChangeFile'> {
    readonly scheme: string;
    readonly isReadonly: boolean;
}

export const IFileSystemProvider = createInterfaceId<IFileSystemProvider>('IFileSystemProvider');

export const fileSystemProviders = [NodeFileSystemProvider];
