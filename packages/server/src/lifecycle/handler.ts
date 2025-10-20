import { InitializeResult } from "vscode-languageserver";
import { collection, createInterfaceId, Injectable, type Disposable } from "@gitlab/needle";

import { IServiceProvider, LsConnection } from "../di";
import { IOnExit, IOnInitialize, IOnInitialized, IOnShutdown } from "./events";

import packageJson from "../../package.json";

export interface ILifecycleHandler {
    register(): void;
}

export const ILifecycleHandler = createInterfaceId<ILifecycleHandler>("ILifecycleHandler");

@Injectable(ILifecycleHandler, [LsConnection, IServiceProvider])
export class LifecycleHandler implements ILifecycleHandler, Disposable {
    private disposables: Disposable[] = [];

    dispose(): void {
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    constructor(
        private connection: LsConnection,
        private provider: IServiceProvider
    ) {}

    register() {
        const onInitializeHandlers = this.provider.getServices(collection(IOnInitialize));
        const onInitializedHandlers = this.provider.getServices(collection(IOnInitialized));
        const onShutdownHandlers = this.provider.getServices(collection(IOnShutdown));
        const onExitHandlers = this.provider.getServices(collection(IOnExit));
        this.disposables.push(
            /**
             * @see https://microsoft.github.io/language-server-protocol/specifications/specification-current#initialize
             */
            this.connection.onInitialize(async (params, token) => {
                const results: InitializeResult[] = await Promise.all(
                    onInitializeHandlers.map(async (handler) => {
                        try {
                            const result = await handler.onInitialize(params, token);
                            // TODO: handle ResponseError<>
                            return result as InitializeResult;
                        } catch (error: unknown) {
                            this.logError("onInitialize", error);
                            return { capabilities: {} };
                        }
                    })
                );
                return results.reduce<InitializeResult>(
                    (previous, current) => {
                        // TODO: implement this properly, with a deep merge or custom merge
                        Object.assign(previous.capabilities, current.capabilities);
                        if (current.serverInfo && !previous.serverInfo) {
                            previous.serverInfo = current.serverInfo;
                        }
                        return previous;
                    },
                    {
                        capabilities: {
                            workspace: {
                                workspaceFolders: {
                                    supported: true,
                                },
                            },
                        },
                        serverInfo: {
                            name: packageJson.name,
                            version: packageJson.version,
                        },
                    }
                );
            }),
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
                                this.logError("onInitialized", error);
                            }
                        })
                    )
            ),
            /**
             * @see https://microsoft.github.io/language-server-protocol/specifications/specification-current#initialized
             *
             */
            this.connection.onShutdown(
                () =>
                    void Promise.all(
                        onShutdownHandlers.map(async (handler) => {
                            try {
                                return await handler.onShutdown();
                            } catch (error: unknown) {
                                this.logError("onShutdown", error);
                            }
                        })
                    )
            ),
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
                                this.logError("onExit", error);
                            }
                        })
                    )
            )
        );
    }

    private logError(name: string, error: unknown) {
        if (error instanceof Error) {
            this.connection.console.error(
                `error occured in lifecycle event: ${name} - '${error.toString()}'`
            );
        } else if (error != null && typeof error["toString"] === "function") {
            this.connection.console.error(
                `error occured in lifecycle event: ${name} - caught thrown value: ${error}`
            );
        } else {
            this.connection.console.error(
                `error occured in lifecycle event: ${name} - thrown value has no string representation`
            );
        }
    }
}
