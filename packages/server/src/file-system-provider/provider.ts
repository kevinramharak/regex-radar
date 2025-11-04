import type { FileSystemProvider } from 'vscode';

import { createInterfaceId } from '@gitlab/needle';

export interface IFileSystemProvider extends Omit<FileSystemProvider, 'watch' | 'onDidChangeFile'> {
    readonly scheme: string;
    readonly isReadonly: boolean;
}

export const IFileSystemProvider = createInterfaceId<IFileSystemProvider>('IFileSystemProvider');
