import {
    type CancellationToken,
    type CodeAction,
    type CodeActionKind,
    type CodeActionParams,
    type CodeActionRegistrationOptions,
    CodeActionRequest,
    type ResultProgressReporter,
    type WorkDoneProgressReporter,
} from 'vscode-languageserver';

import { Implements, Injectable, collection, createInterfaceId } from '@gitlab/needle';

import { IConfiguration } from '../configuration';
import { DOCUMENT_SELECTOR } from '../constants';
import { IServiceProvider } from '../di';
import { LsConnection } from '../di/external-interfaces';
import { IOnInitialized } from '../lifecycle';
import { ILogger } from '../logger';
import { unique } from '../util/array';
import { Disposable } from '../util/disposable';
import { runHandlers } from '../util/handlers';
import type { MaybePromise } from '../util/maybe-promise';

import { IOnCodeAction, IOnCodeActionResolve } from './events';

export interface ICodeActionMessageHandler {
    onCodeAction(
        param: CodeActionParams,
        token?: CancellationToken,
        workDone?: WorkDoneProgressReporter,
        progress?: ResultProgressReporter<CodeAction[]>,
    ): MaybePromise<CodeAction[]>;
    onCodeActionResolve(params: CodeAction, token?: CancellationToken): MaybePromise<CodeAction>;
}

export const ICodeActionMessageHandler =
    createInterfaceId<ICodeActionMessageHandler>('ICodeActionMessageHandler');

@Implements(IOnInitialized)
@Injectable(ICodeActionMessageHandler, [IConfiguration, IServiceProvider, ILogger])
export class CodeActionMessageHandler
    extends Disposable
    implements ICodeActionMessageHandler, IOnInitialized
{
    private onCodeActionHandlers: IOnCodeAction[] = [];
    private onCodeActionResolveHandlers: IOnCodeActionResolve[] = [];

    constructor(
        private readonly configuration: IConfiguration,
        private readonly provider: IServiceProvider,
        private readonly logger: ILogger,
    ) {
        super();
    }

    async onInitialized(connection: LsConnection): Promise<void> {
        const capabilties = await this.configuration.get('client.capabilities');
        const codeActionCapabilities = capabilties.textDocument?.codeAction;
        const diagnosticDataSupport = capabilties.textDocument?.publishDiagnostics?.dataSupport;

        if (!codeActionCapabilities?.dynamicRegistration) {
            return;
        }

        if (!codeActionCapabilities.codeActionLiteralSupport) {
            // TODO: maybe allow for command based implementations?
            return;
        }

        const onCodeActionHandlers = this.provider
            .getServices(collection(IOnCodeAction))
            .filter((handler) => {
                const canHandleResolve =
                    codeActionCapabilities.resolveSupport || !handler.requiresResolveSupport;
                const kindMatches = kindIntersects(
                    handler.kinds,
                    codeActionCapabilities.codeActionLiteralSupport!.codeActionKind.valueSet,
                );
                const canHandleDataSupport =
                    codeActionCapabilities.dataSupport || !handler.requiresDataSupport;
                const canHandleDiagnosticDataSupport =
                    diagnosticDataSupport || !handler.requiresDiagnosticDataSupport;
                return (
                    canHandleResolve && canHandleDataSupport && canHandleDiagnosticDataSupport && kindMatches
                );
            });

        const onCodeActionResolveHandlers = codeActionCapabilities.resolveSupport
            ? this.provider.getServices(collection(IOnCodeActionResolve)).filter((handler) => {
                  const canHandleDataSupport =
                      codeActionCapabilities.dataSupport || !handler.requiresDataSupport;
                  return canHandleDataSupport;
              })
            : [];

        const registerParams: CodeActionRegistrationOptions = {
            codeActionKinds: unique(onCodeActionHandlers.flatMap((handler) => handler.kinds)),
            documentSelector: DOCUMENT_SELECTOR,
        };
        if (capabilties.window?.workDoneProgress) {
            registerParams.workDoneProgress = true;
        }

        this.onCodeActionHandlers = onCodeActionHandlers;
        this.onCodeActionResolveHandlers = onCodeActionResolveHandlers;

        const hasCodeActionHandlers = onCodeActionHandlers.length > 0;
        const hasCodeActionResolveHandlers = onCodeActionResolveHandlers.length > 0;

        if (hasCodeActionHandlers) {
            this.disposables.push(connection.onCodeAction(this.onCodeAction.bind(this)));
        }

        if (hasCodeActionResolveHandlers) {
            this.disposables.push(connection.onCodeActionResolve(this.onCodeActionResolve.bind(this)));
        }

        if (hasCodeActionHandlers || hasCodeActionResolveHandlers) {
            if (codeActionCapabilities.resolveSupport) {
                registerParams.resolveProvider = hasCodeActionResolveHandlers;
            }
            if (capabilties.window?.workDoneProgress) {
                registerParams.workDoneProgress = true;
            }
            const disposable = await connection.client.register(CodeActionRequest.type, registerParams);
            this.disposables.push(disposable);
        }
    }

    async onCodeAction(
        params: CodeActionParams,
        token?: CancellationToken,
        workDone?: WorkDoneProgressReporter,
        progress?: ResultProgressReporter<CodeAction[]>,
    ): Promise<CodeAction[]> {
        const handlers = params.context.only
            ? this.onCodeActionHandlers.filter((handler) =>
                  kindIntersects(handler.kinds, params.context.only!),
              )
            : this.onCodeActionHandlers;

        if (handlers.length === 0) {
            return [];
        }

        return runHandlers(
            handlers.map((handler) => () => handler.onCodeAction(params, token)),
            token,
            workDone,
            progress,
            this.logger,
        );
    }

    onCodeActionResolve(action: CodeAction, token?: CancellationToken): MaybePromise<CodeAction> {
        return this.onCodeActionResolveHandlers.reduce(async (result, handler) => {
            if (token?.isCancellationRequested) {
                return result;
            }
            const action = await result;
            return handler.onCodeActionResolve(action, token);
        }, Promise.resolve(action));
    }
}

/**
 * returns `true` if any kind in `b` intersects with any kind in `a`
 * TODO: callers should implement a cache or sorted resultset with the return value
 */
function kindIntersects(a: CodeActionKind[], b: CodeActionKind[]): boolean {
    return a.some((kind) => b.some((requested) => kind.startsWith(requested)));
}
