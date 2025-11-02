import { InitializeResult, type ServerCapabilities } from 'vscode-languageserver';

import { Injectable, collection, createInterfaceId } from '@gitlab/needle';

import packageJson from '../../package.json';
import { IServiceProvider, LsConnection } from '../di';
import { Disposable } from '../util/disposable';
import { IOnExit, IOnInitialize, IOnInitialized, IOnShutdown } from './events';

export interface ILifecycleHandler {
    register(): void;
}

export const ILifecycleHandler = createInterfaceId<ILifecycleHandler>('ILifecycleHandler');

const defaultCapabilities: ServerCapabilities = {};

/**
 * The `LifecycleHandler` is a singleton that allows `IOnExit`, `IOnInitialize`, `IOnInitialized` and `IOnShutdown` implementations to register an event handler for those events.
 */
@Injectable(ILifecycleHandler, [LsConnection, IServiceProvider])
export class LifecycleHandler extends Disposable implements ILifecycleHandler {
    constructor(
        private connection: LsConnection,
        private provider: IServiceProvider,
    ) {
        super();
    }

    private registerOnInitializeHandlers() {
        const onInitializeHandlers = this.provider.getServices(collection(IOnInitialize));
        this.disposables.push(
            /**
             * @see https://microsoft.github.io/language-server-protocol/specifications/specification-current#initialize
             */
            this.connection.onInitialize((params, token) => {
                const results: ServerCapabilities[] = onInitializeHandlers
                    .map((handler) => {
                        try {
                            const result = handler.onInitialize(params, token);
                            return result;
                        } catch (error: unknown) {
                            this.logError('onInitialize', error);
                            return { capabilities: {} };
                        }
                    })
                    .filter((capabilities): capabilities is ServerCapabilities => !!capabilities);
                const capabilities = results.reduce<ServerCapabilities>((previous, current) => {
                    // TODO: implement this properly, with a deep merge or custom merge
                    Object.assign(previous, current);
                    return previous;
                }, defaultCapabilities);
                return {
                    capabilities,
                    serverInfo: {
                        name: packageJson.name,
                        version: packageJson.version,
                    },
                };
            }),
        );
    }

    private registerOnInitializedHandlers() {
        const onInitializedHandlers = this.provider.getServices(collection(IOnInitialized));
        this.disposables.push(
            /**
             * @see https://microsoft.github.io/language-server-protocol/specifications/specification-current#initialized
             */
            this.connection.onInitialized(
                (params) =>
                    void Promise.all(
                        onInitializedHandlers.map(async (handler) => {
                            try {
                                return await handler.onInitialized(params);
                            } catch (error: unknown) {
                                this.logError('onInitialized', error);
                            }
                        }),
                    ),
            ),
        );
    }

    private registerOnShutdownHandlers() {
        const onShutdownHandlers = this.provider.getServices(collection(IOnShutdown));
        this.disposables.push(
            /**
             * @see https://microsoft.github.io/language-server-protocol/specifications/specification-current#initialized
             *
             */
            this.connection.onShutdown(
                (token) =>
                    void Promise.all(
                        onShutdownHandlers.map(async (handler) => {
                            try {
                                return await handler.onShutdown(token);
                            } catch (error: unknown) {
                                this.logError('onShutdown', error);
                            }
                        }),
                    ),
            ),
        );
    }

    private registerOnExitHandlers() {
        const onExitHandlers = this.provider.getServices(collection(IOnExit));
        this.disposables.push(
            /**
             *
             * @see https://microsoft.github.io/language-server-protocol/specifications/specification-current#initialized
             */
            this.connection.onExit(
                () =>
                    void Promise.all(
                        onExitHandlers.map(async (handler) => {
                            try {
                                return await handler.onExit();
                            } catch (error: unknown) {
                                this.logError('onExit', error);
                            }
                        }),
                    ),
            ),
        );
    }

    private logError(name: string, error: unknown) {
        if (error instanceof Error) {
            this.connection.console.error(
                `error occured in lifecycle event: ${name} - '${error.toString()}'`,
            );
        } else if (error != null && typeof error['toString'] === 'function') {
            this.connection.console.error(
                `error occured in lifecycle event: ${name} - caught thrown value: ${error}`,
            );
        } else {
            this.connection.console.error(
                `error occured in lifecycle event: ${name} - thrown value has no string representation`,
            );
        }
    }

    register() {
        this.registerOnInitializeHandlers();
        this.registerOnInitializedHandlers();
        this.registerOnShutdownHandlers();
        this.registerOnExitHandlers();
    }
}
