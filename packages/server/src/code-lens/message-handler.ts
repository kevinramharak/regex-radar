import {
    CodeLensRefreshRequest,
    CodeLensRequest,
    type CancellationToken,
    type CodeLens,
    type CodeLensParams,
    type CodeLensRegistrationOptions,
    type ResultProgressReporter,
    type WorkDoneProgressReporter,
} from 'vscode-languageserver';

import { Implements, Injectable, collection, createInterfaceId } from '@gitlab/needle';

import { IConfiguration } from '../configuration';
import { DOCUMENT_SELECTOR } from '../constants';
import { IServiceProvider, LsConnection } from '../di';
import { IOnInitialized } from '../lifecycle';
import { ILogger } from '../logger';
import { Disposable } from '../util/disposable';
import { runHandlers } from '../util/handlers';
import type { MaybePromise } from '../util/maybe-promise';

import { IOnCodeLens, IOnCodeLensResolve } from './events';

export interface ICodeLensMessageHandler {
    onCodeLens(
        params: CodeLensParams,
        token?: CancellationToken,
        workDone?: WorkDoneProgressReporter,
        progress?: ResultProgressReporter<CodeLens[]>,
    ): MaybePromise<CodeLens[]>;
    onCodeLensResolve(lens: CodeLens, token?: CancellationToken): MaybePromise<CodeLens>;
    refresh?(): void;
}

export const ICodeLensMessageHandler = createInterfaceId<ICodeLensMessageHandler>('ICodeLensMessageHandler');

@Implements(IOnInitialized)
@Injectable(ICodeLensMessageHandler, [IConfiguration, IServiceProvider, ILogger])
export class CodeLensMessageHandler extends Disposable implements ICodeLensMessageHandler {
    private onCodeLensHandlers: IOnCodeLens[] = [];
    private onCodeLensResolveHandlers: IOnCodeLensResolve[] = [];

    constructor(
        private readonly configuration: IConfiguration,
        private readonly provider: IServiceProvider,
        private readonly logger: ILogger,
    ) {
        super();
    }

    async onInitialized(connection: LsConnection) {
        const capabilties = await this.configuration.get('client.capabilities');
        const codeLensCapabilities = capabilties.textDocument?.codeLens;

        if (!codeLensCapabilities?.dynamicRegistration) {
            return;
        }

        if (capabilties.workspace?.codeLens?.refreshSupport) {
            this.refresh = () => connection.sendRequest(CodeLensRefreshRequest.type);
        }

        this.onCodeLensHandlers = this.provider.getServices(collection(IOnCodeLens));
        this.onCodeLensResolveHandlers = this.provider.getServices(collection(IOnCodeLensResolve));

        const hasCodeLensHandlers = this.onCodeLensHandlers.length > 0;
        const hasCodeLensResolveHandlers = this.onCodeLensResolveHandlers.length > 0;

        const registerParams: CodeLensRegistrationOptions = {
            documentSelector: DOCUMENT_SELECTOR,
            resolveProvider: hasCodeLensResolveHandlers,
        };
        if (capabilties.window?.workDoneProgress) {
            registerParams.workDoneProgress = true;
        }

        if (hasCodeLensHandlers) {
            this.disposables.push(connection.onCodeLens(this.onCodeLens.bind(this)));
        }

        if (hasCodeLensResolveHandlers) {
            registerParams.resolveProvider = true;
            this.disposables.push(connection.onCodeLensResolve(this.onCodeLensResolve.bind(this)));
        }

        if (hasCodeLensHandlers || hasCodeLensResolveHandlers) {
            const disposable = await connection.client.register(CodeLensRequest.type, registerParams);
            this.disposables.push(disposable);
        }
    }

    async onCodeLens(
        params: CodeLensParams,
        token?: CancellationToken,
        workDone?: WorkDoneProgressReporter,
        progress?: ResultProgressReporter<CodeLens[]>,
    ): Promise<CodeLens[]> {
        const handlers = this.onCodeLensHandlers;

        if (handlers.length === 0) {
            return [];
        }

        return runHandlers(
            handlers.map((handler) => () => handler.onCodeLens(params, token)),
            token,
            workDone,
            progress,
            this.logger,
        );
    }

    async onCodeLensResolve(lens: CodeLens, token?: CancellationToken): Promise<CodeLens> {
        return this.onCodeLensResolveHandlers.reduce(async (result, handler) => {
            if (token?.isCancellationRequested) {
                return result;
            }
            const lens = await result;
            return handler.onCodeLensResolve(lens, token);
        }, Promise.resolve(lens));
    }

    refresh: ICodeLensMessageHandler['refresh'];
}
