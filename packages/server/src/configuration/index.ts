import {
    type ClientCapabilities,
    DidChangeConfigurationNotification,
    type DidChangeConfigurationParams,
    type InitializeParams,
    type InitializeResult,
    type WorkspaceFoldersChangeEvent,
} from 'vscode-languageserver';

import { Implements, Injectable, createInterfaceId } from '@gitlab/needle';

import type { lsp } from '@regex-radar/lsp-types';

import { EXTENSION_ID } from '../constants';
import { IServiceProvider, LsConnection } from '../di';
import { IOnInitialize, IOnInitialized } from '../lifecycle';
import { createDeferred, isDeferred } from '../util/deferred';
import { Disposable } from '../util/disposable';

export interface ConfigurationSchema extends ConfigurationSchemaClient, ConfigurationSchemaServer {}

export interface ConfigurationSchemaClient {
    'client.capabilities': ClientCapabilities;
    'client.info': NonNullable<InitializeParams['clientInfo']> | null;
    'client.locale': NonNullable<InitializeParams['locale']> | null;
    'client.process.id': InitializeParams['processId'];
    'client.trace': NonNullable<InitializeParams['trace']>;
    'client.workspace.folders': NonNullable<InitializeParams['workspaceFolders']>;
}

const defaultConfigurationSchemaClient: ConfigurationSchemaClient = {
    'client.capabilities': {},
    'client.info': null,
    'client.locale': null,
    'client.process.id': null,
    'client.trace': 'off',
    'client.workspace.folders': [],
};

export interface ConfigurationSchemaServer {
    'regex-radar.discovery': {
        enabled: boolean;
    };
    'regex-radar.diagnostics': {
        languages: string[];
    };
}

const defaultConfigurationSchemaServer: ConfigurationSchemaServer = {
    'regex-radar.discovery': {
        enabled: true,
    },
    'regex-radar.diagnostics': {
        languages: ['javascript', 'typescript'],
    },
};

export interface IConfiguration {
    get<T extends keyof ConfigurationSchema>(key: T, scope?: lsp.URI): Promise<ConfigurationSchema[T]>;
    get<R>(key: string, scope?: lsp.URI): Promise<R>;
}

export const IConfiguration = createInterfaceId<IConfiguration>('IConfiguration');

const defaultConfigurationSchema: ConfigurationSchema = {
    ...defaultConfigurationSchemaClient,
    ...defaultConfigurationSchemaServer,
};

@Implements(IOnInitialize)
@Implements(IOnInitialized)
@Injectable(IConfiguration, [LsConnection, IServiceProvider])
export class Configuration extends Disposable implements IConfiguration, IOnInitialize, IOnInitialized {
    private static readonly EXTENSION_SECTION = EXTENSION_ID;
    private configuration: ConfigurationSchema = defaultConfigurationSchema;
    private fetching: Promise<void> = createDeferred();

    constructor(
        private readonly connection: LsConnection,
        private readonly provider: IServiceProvider,
    ) {
        super();
    }

    onInitialize(params: InitializeParams): InitializeResult['capabilities'] {
        this.configuration['client.capabilities'] = params.capabilities;
        if (params.clientInfo) {
            this.configuration['client.info'] = params.clientInfo;
        }
        if (params.locale) {
            this.configuration['client.locale'] = params.locale;
        }
        if (params.processId) {
            this.configuration['client.process.id'] = params.processId;
        }
        if (params.trace) {
            this.configuration['client.trace'] = params.trace;
        }
        if (params.workspaceFolders) {
            this.configuration['client.workspace.folders'] = params.workspaceFolders;
        }
        return {
            workspace: {
                workspaceFolders: {
                    supported: true,
                    changeNotifications: true,
                },
            },
        };
    }

    async onInitialized(): Promise<void> {
        if (this.configuration['client.capabilities'].workspace?.configuration) {
            const deferred = this.fetching;
            this.fetching = this.connection.workspace
                .getConfiguration(Configuration.EXTENSION_SECTION)
                .then((configuration: ConfigurationSchemaServer) => {
                    for (const [key, value] of Object.entries(configuration)) {
                        this.configuration[`regex-radar.${key}` as keyof ConfigurationSchemaServer] = value;
                    }
                    if (isDeferred(deferred)) {
                        deferred.resolve(void 0);
                    }
                });
        }
        if (
            this.configuration['client.capabilities'].workspace?.didChangeConfiguration?.dynamicRegistration
        ) {
            this.disposables.push(
                await this.connection.client.register(DidChangeConfigurationNotification.type, {
                    section: Configuration.EXTENSION_SECTION,
                }),
            );
        }
        if (this.configuration['client.capabilities'].workspace?.workspaceFolders) {
            this.disposables.push(
                this.connection.workspace.onDidChangeWorkspaceFolders(
                    this.onDidChangeWorkspaceFolders.bind(this),
                ),
            );
        }
    }

    async onDidChangeConfiguration(params: DidChangeConfigurationParams): Promise<void> {
        // TODO: create our own DidChangeConfiguration event handler registry
    }

    async onDidChangeWorkspaceFolders(event: WorkspaceFoldersChangeEvent): Promise<void> {
        const updated = [];
        for (const folder of this.configuration['client.workspace.folders']) {
            if (
                !event.removed.some((removed) => removed.uri === folder.uri && removed.name === removed.name)
            ) {
                updated.push(folder);
            }
        }
        updated.push(...event.added);
        this.configuration['client.workspace.folders'] = updated;
        // TODO: emit event
    }

    async get<T extends keyof ConfigurationSchema & string>(
        key: T,
        scope?: lsp.URI,
    ): Promise<ConfigurationSchema[T]>;
    async get<R>(key: string, scope?: lsp.URI): Promise<R>;
    async get<T extends keyof ConfigurationSchema & string, R>(
        key: string,
        scope?: lsp.URI,
    ): Promise<ConfigurationSchema[T] | R> {
        await this.fetching;
        return this.configuration[key as keyof ConfigurationSchema] as R;
    }
}
