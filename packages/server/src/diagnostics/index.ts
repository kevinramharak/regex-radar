import {
    type Diagnostic,
    DiagnosticSeverity,
    type DocumentDiagnosticParams,
    type DocumentDiagnosticReport,
    DocumentDiagnosticReportKind,
    DocumentDiagnosticRequest,
} from 'vscode-languageserver';

import { Implements, Injectable, createInterfaceId } from '@gitlab/needle';

import { EntryType, type RegexEntry, RegexMatchType } from '@regex-radar/lsp-types';

import { EXTENSION_ID } from '../constants';
import { LsConnection } from '../di/external-interfaces';
import { IDiscoveryService } from '../discovery';
import { IOnInitialized } from '../lifecycle';
import { IRequestMessageHandler } from '../message-handler';
import { Disposable } from '../util/disposable';

export interface IDiagnosticsService {
    onDiagnosticRequest(params: DocumentDiagnosticParams): Promise<DocumentDiagnosticReport>;
}

export const IDiagnosticsService = createInterfaceId<IDiagnosticsService>('IDiagnosticsService');

@Implements(IOnInitialized)
@Implements(IRequestMessageHandler)
@Injectable(IDiagnosticsService, [IDiscoveryService, LsConnection])
export class DiagnosticsService extends Disposable implements IDiagnosticsService, IOnInitialized {
    constructor(
        private readonly discovery: IDiscoveryService,
        private readonly connection: LsConnection,
    ) {
        super();
    }

    async onInitialized(): Promise<void> {
        this.disposables.push(
            await this.connection.client.register(DocumentDiagnosticRequest.type, {
                interFileDependencies: false,
                // TODO: support workspace diagnostics
                workspaceDiagnostics: false,
                identifier: EXTENSION_ID,
                documentSelector: [{ language: 'javascript' }, { language: 'typescript' }],
            }),
        );
    }

    register(connection: LsConnection) {
        // TODO: use OOP
        // TODO: add caching
        // TODO: use human readable `code` and link them to docs with `codeDescription`
        this.disposables.push(connection.languages.diagnostics.on(this.onDiagnosticRequest.bind(this)));
    }

    async onDiagnosticRequest(params: DocumentDiagnosticParams): Promise<DocumentDiagnosticReport> {
        const result = await this.discovery.discover({
            uri: params.textDocument.uri,
            hint: EntryType.File,
        });

        const items = result ? await createDiagnosticsForEntries(result?.children) : [];

        return {
            kind: DocumentDiagnosticReportKind.Full,
            items,
        };
    }
}

async function createDiagnosticsForEntries(entries: RegexEntry[]): Promise<Diagnostic[]> {
    const results: Diagnostic[] = [];
    for (const entry of entries) {
        switch (entry.match.type) {
            case RegexMatchType.Function: {
                results.push(...createDiagnosticsForMatchTypeFunction(entry));
                break;
            }
            case RegexMatchType.Literal:
            case RegexMatchType.Constructor:
            case RegexMatchType.String: {
                break;
            }
        }
        // TODO: implement this with streaming and cancelation tokens --> else it will take to much time + caching
        // const pattern = entry.match.pattern;
        // const flags = "flags" in entry.match ? entry.match.flags : "";
        // const redosCheck = await checkRedos(pattern, flags, {
        //     attackLimit: 1000,
        //     maxAttackStringSize: 1000,
        //     maxRecallStringSize: 1000,
        //     timeout: 1000,
        // });
        // // see: https://makenowjust-labs.github.io/recheck/docs/usage/diagnostics/
        // switch (redosCheck.status) {
        //     case "vulnerable": {
        //         results.push({
        //             message: `This regex is vulnerable to a ReDoS attack with a complexity of ${redosCheck.complexity.summary}`,
        //             code: "redos-vulnerable",
        //             range: entry.location.range,
        //             severity: DiagnosticSeverity.Warning,
        //             source: "regex-radar",
        //         });
        //         break;
        //     }
        // }
    }
    return results;
}

const codeToMessage: Record<string, string> = {
    /**
     * @see https://eslint.org/docs/latest/rules/prefer-regex-literals
     */
    'prefer-regex-literals': '',
    /**
     * @see https://eslint.org/docs/latest/rules/no-invalid-regexp
     */
    'no-invalid-regexp': '',
    /**
     * @see https://eslint.org/docs/latest/rules/no-control-regex
     */
    'no-control-regex': '',
    /**
     * @see https://eslint.org/docs/latest/rules/no-regex-spaces
     */
    'no-regex-spaces': '',
    /**
     *
     */
    'prefer-regex-new-expression': '',
};

const DO_NOT_USE_REGEXP_AS_FUNCTION_MESSAGE = `
'RegExp()' can be called with or without 'new', but sometimes with different effects.
Consider using a new expression.
See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp#return_value for the edge case.
`.trim();

function createDiagnosticsForMatchTypeFunction(entry: RegexEntry): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    diagnostics.push({
        range: entry.location.range,
        source: EXTENSION_ID,
        message: DO_NOT_USE_REGEXP_AS_FUNCTION_MESSAGE,
        severity: DiagnosticSeverity.Warning,
        code: 'no-regexp-fn-call',
    });

    return diagnostics;
}
