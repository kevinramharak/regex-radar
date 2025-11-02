import { DidChangeConfigurationParams, type WorkspaceFoldersChangeEvent } from 'vscode-languageserver';

import { createInterfaceId } from '@gitlab/needle';

export interface IOnDidChangeConfiguration {
    // TODO: what type should this be?
    onDidChangeConfiguration(settings: DidChangeConfigurationParams['settings']): void | Promise<void>;
}

export const IOnDidChangeConfiguration =
    createInterfaceId<IOnDidChangeConfiguration>('IOnDidChangeConfiguration');

export interface IOnDidChangeWorkspaceFolders {
    onDidChangeWorkspaceFolders(event: WorkspaceFoldersChangeEvent): void | Promise<void>;
}

export const IOnDidChangeWorkspaceFolders = createInterfaceId<IOnDidChangeWorkspaceFolders>(
    'IOnDidChangeWorkspaceFolders',
);
