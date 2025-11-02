import {
    type CodeAction,
    CodeActionKind,
    type CodeActionParams,
    CodeActionRequest,
    type Diagnostic,
    type InitializedParams,
} from 'vscode-languageserver';

import { Implements, Injectable, createInterfaceId } from '@gitlab/needle';

import { EntryType, type RegexEntry, RegexMatchType } from '@regex-radar/lsp-types';

import { LsConnection } from '../di/external-interfaces';
import { IDiagnosticsService } from '../diagnostics';
import { IDiscoveryService } from '../discovery';
import { IOnInitialized } from '../lifecycle';
import { IRequestMessageHandler } from '../message-handler';
import { Disposable } from '../util/disposable';

export interface ICodeActionService {}

export const ICodeActionService = createInterfaceId<ICodeActionService>('ICodeActionService');

@Implements(IOnInitialized)
@Implements(IRequestMessageHandler)
@Injectable(ICodeActionService, [IDiagnosticsService, LsConnection])
export class CodeActionService extends Disposable implements ICodeActionService, IOnInitialized {
    constructor(
        private readonly diagnostics: IDiagnosticsService,
        private readonly connection: LsConnection,
    ) {
        super();
    }

    async onInitialized(): Promise<void> {
        this.disposables.push(
            await this.connection.client.register(CodeActionRequest.type, {
                codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.SourceFixAll],
                resolveProvider: false,
                workDoneProgress: false,
                documentSelector: [{ language: 'javascript' }, { language: 'typescript' }],
            }),
        );
    }

    register(connection: LsConnection) {
        // TODO: add caching
        this.disposables.push(this.connection.onCodeAction(this.onCodeAction.bind(this)));
    }

    async onCodeAction(params: CodeActionParams): Promise<CodeAction[]> {
        const actions: CodeAction[] = [];

        const diagnostics = await this.ensureDiagnostics(params);

        diagnostics.forEach((diagnostic) => {
            // see: https://eslint.org/docs/latest/rules/prefer-regex-literals
            switch (diagnostic.code) {
                case 'no-regexp-fn-call': {
                    actions.push({
                        title: 'Convert to new expression',
                        diagnostics: [diagnostic],
                        isPreferred: true,
                        kind: CodeActionKind.QuickFix,
                        edit: {
                            changes: {
                                [params.textDocument.uri]: [
                                    {
                                        newText: 'new ',
                                        range: {
                                            start: diagnostic.range.start,
                                            end: diagnostic.range.start,
                                        },
                                    },
                                ],
                            },
                        },
                    });
                    break;
                }
                default: {
                    break;
                }
            }
        });

        return actions;
    }

    private async ensureDiagnostics(params: CodeActionParams): Promise<Diagnostic[]> {
        if (params.context.diagnostics.length > 0) {
            return params.context.diagnostics;
        }
        const result = await this.diagnostics.onDiagnosticRequest(params);
        if (result.kind === 'full') {
            return result.items;
        }
        return [];
    }
}
