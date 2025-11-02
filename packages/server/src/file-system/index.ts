import type { FileSystem } from 'vscode';

import { createInterfaceId } from '@gitlab/needle';

export interface IFileSystem extends FileSystem {
    readonly scheme: string;
    readonly isWritable: boolean;
    get isReadonly(): boolean;
}

export const IFileSystem = createInterfaceId<IFileSystem>('IFileSystem');
