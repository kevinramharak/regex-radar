import type { WorkspaceFoldersChangeEvent } from 'vscode-languageserver';

import { createInterfaceId } from '@gitlab/needle';

import type { ConfigurationSchema } from './schema';

export interface IOnDidChangeConfiguration {
    onDidChangeConfiguration(settings: ConfigurationSchema): void | Promise<void>;
}

export const IOnDidChangeConfiguration =
    createInterfaceId<IOnDidChangeConfiguration>('IOnDidChangeConfiguration');

export interface IOnDidChangeWorkspaceFolders {
    onDidChangeWorkspaceFolders(event: WorkspaceFoldersChangeEvent): void | Promise<void>;
}

export const IOnDidChangeWorkspaceFolders = createInterfaceId<IOnDidChangeWorkspaceFolders>(
    'IOnDidChangeWorkspaceFolders',
);
