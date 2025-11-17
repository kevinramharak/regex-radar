import type {
    CancellationToken,
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Command,
} from 'vscode-languageserver';

import { createInterfaceId } from '@gitlab/needle';

import type { MaybePromise } from '../util/maybe-promise';

/**
 * TODO: link the requiresSupport flags to the documentation
 */
export interface IOnCodeAction {
    kinds: CodeActionKind[];
    /**
     * If the handler works in the 2 stages of `onCodeAction` and `onCodeActionResolve`, this should be set to `true`.
     */
    requiresResolveSupport?: boolean;
    /**
     * If the handler requires `data` to be preserved between `textDocument/codeAction` and `textDocument/codeActionResolve`.
     */
    requiresDataSupport?: boolean;
    /**
     * If the handler requires `data` to be preserved between `textDocument/pushDiagnostic` and `textDocument/codeAction`.
     */
    requiresDiagnosticDataSupport?: boolean;
    onCodeAction(params: CodeActionParams, token?: CancellationToken): MaybePromise<CodeAction[]>;
}

export const IOnCodeAction = createInterfaceId<IOnCodeAction>('IOnCodeAction');

/**
 * TODO: support this
 */
export interface IOnCodeActionCommand {
    onCodeAction(params: CodeActionParams, token?: CancellationToken): MaybePromise<Command[]>;
}

export const IOnCodeActionCommand = createInterfaceId<IOnCodeActionCommand>('IOnCodeActionCommand');

export interface IOnCodeActionResolve {
    kinds: CodeActionKind[];
    /**
     * If the handler requires `data` to be preserved between `textDocument/codeAction` and `textDocument/codeActionResolve`.
     */
    requiresDataSupport?: boolean;
    onCodeActionResolve(action: CodeAction, token?: CancellationToken): MaybePromise<CodeAction>;
}

export const IOnCodeActionResolve = createInterfaceId<IOnCodeActionResolve>('IOnCodeActionResolve');
