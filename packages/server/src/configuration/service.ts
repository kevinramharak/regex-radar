import {
    DidChangeConfigurationNotification,
    type DidChangeConfigurationParams,
    type InitializeParams,
    type InitializeResult,
    type WorkspaceFoldersChangeEvent,
    type URI,
    DidChangeWorkspaceFoldersNotification,
} from 'vscode-languageserver';

import { Implements, Injectable, collection, createInterfaceId } from '@gitlab/needle';

import { EXTENSION_ID } from '../constants';
import { IServiceProvider, LsConnection } from '../di';
import { IOnInitialize, IOnInitialized } from '../lifecycle';
import { createDeferred, isDeferred } from '../util/deferred';
import { Disposable } from '../util/disposable';

import { IOnDidChangeConfiguration } from './events';
import {
    defaultConfigurationSchema,
    type ConfigurationSchema,
    type ConfigurationSchemaServer,
} from './schema';

export interface IConfiguration {
    get<T extends keyof ConfigurationSchema>(key: T, scope?: URI): Promise<ConfigurationSchema[T]>;
    get<R>(key: string, scope?: URI): Promise<R>;
}

export const IConfiguration = createInterfaceId<IConfiguration>('IConfiguration');

@Implements(IOnInitialize)
@Implements(IOnInitialized)
@Injectable(IConfiguration, [IServiceProvider])
export class Configuration extends Disposable implements IConfiguration, IOnInitialize, IOnInitialized {
    private static readonly EXTENSION_SECTION = EXTENSION_ID;
    private configuration: ConfigurationSchema = defaultConfigurationSchema;
    private fetching: Promise<void> = createDeferred();
    private onDidChangeConfigurationHandlers: IOnDidChangeConfiguration[] = [];

    constructor(private readonly provider: IServiceProvider) {
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
        const workspaceCapabilities = this.configuration['client.capabilities'].workspace;
        return {
            workspace: {
                workspaceFolders: {
                    supported: workspaceCapabilities?.workspaceFolders,
                },
            },
        };
    }

    async onInitialized(connection: LsConnection): Promise<void> {
        const workspaceCapabilities = this.configuration['client.capabilities'].workspace;
        if (workspaceCapabilities?.configuration) {
            const deferred = this.fetching;
            this.fetching = connection.workspace
                .getConfiguration(Configuration.EXTENSION_SECTION)
                .then((configuration: ConfigurationSchemaServer) => {
                    for (const [key, value] of Object.entries(configuration)) {
                        this.configuration[
                            `${Configuration.EXTENSION_SECTION}.${key}` as keyof ConfigurationSchemaServer
                        ] = value;
                    }
                    if (isDeferred(deferred)) {
                        deferred.resolve(void 0);
                    }
                });
        }
        if (workspaceCapabilities?.didChangeConfiguration?.dynamicRegistration) {
            this.onDidChangeConfigurationHandlers = this.provider.getServices(
                collection(IOnDidChangeConfiguration),
            );
            this.disposables.push(
                connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this)),
            );
            connection.client
                .register(DidChangeConfigurationNotification.type, {
                    section: Configuration.EXTENSION_SECTION,
                })
                .then((disposable) => {
                    this.disposables.push(disposable);
                });
        }
        if (workspaceCapabilities?.workspaceFolders) {
            this.disposables.push(
                connection.workspace.onDidChangeWorkspaceFolders(this.onDidChangeWorkspaceFolders.bind(this)),
            );
            connection.client.register(DidChangeWorkspaceFoldersNotification.type).then((disposable) => {
                this.disposables.push(disposable);
            });
        }
    }

    async onDidChangeConfiguration(params: DidChangeConfigurationParams): Promise<void> {
        for (const [key, value] of Object.entries(params.settings[Configuration.EXTENSION_SECTION])) {
            this.configuration[
                `${Configuration.EXTENSION_SECTION}.${key}` as keyof ConfigurationSchemaServer
            ] = value as any;
        }
        this.onDidChangeConfigurationHandlers.forEach((handler) =>
            handler.onDidChangeConfiguration(this.configuration),
        );
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
    }

    async get<T extends keyof ConfigurationSchema & string>(
        key: T,
        scope?: URI,
    ): Promise<ConfigurationSchema[T]>;
    async get<R>(key: string, scope?: URI): Promise<R>;
    async get<T extends keyof ConfigurationSchema & string, R>(
        key: string,
        scope?: URI,
    ): Promise<ConfigurationSchema[T] | R> {
        if (!scope) {
            await this.fetching;
            if (key in this.configuration) {
                return this.configuration[key as keyof ConfigurationSchema] as R;
            }
        }
        throw new Error('not implemented');
    }
}
