import {
    CodeActionParams,
    CodeAction,
    CodeActionKind,
    type Diagnostic,
    type CancellationToken,
} from 'vscode-languageserver';

import { Implements, Service, ServiceLifetime } from '@gitlab/needle';

import { RegexEntry, RegexMatchType, type RegexMatch } from '@regex-radar/lsp-types';

import { IConfiguration } from '../../configuration';
import { EXTENSION_ID } from '../../constants';
import { getEnabledRules } from '../../diagnostics/handlers/linter/get-enabled-rules';
import type { LinterRulesConfigurationSchema } from '../../diagnostics/handlers/linter/schema';
import { IOnCodeAction } from '../events';

@Implements(IOnCodeAction)
@Service({ dependencies: [IConfiguration], lifetime: ServiceLifetime.Singleton })
export class LinterCodeAction implements IOnCodeAction {
    constructor(private readonly configuration: IConfiguration) {}

    kinds: string[] = [CodeActionKind.QuickFix];
    async onCodeAction(params: CodeActionParams, token?: CancellationToken): Promise<CodeAction[]> {
        const configuration = await this.configuration.get('regex-radar.diagnostics');
        if (!configuration.linter.enabled || token?.isCancellationRequested) {
            return [];
        }

        const enabled = getEnabledRules(configuration.linter.rules);
        if (!enabled.length) {
            return [];
        }

        const diagnostics = params.context.diagnostics.filter((diagnostic) => {
            if (EXTENSION_ID !== diagnostic.source) {
                return false;
            }
            return typeof diagnostic.code === 'string' && enabled.includes(diagnostic.code);
        });

        return diagnostics
            .map((diagnostic) => createCodeAction(diagnostic, params.textDocument.uri))
            .filter((action) => !!action);
    }
}

type Code = keyof LinterRulesConfigurationSchema;

// TODO: modularize to support `source.fixAll`
// see: https://code.visualstudio.com/updates/v1_31#_fix-all-source-actions
function createCodeAction(diagnostic: Diagnostic, uri: string): CodeAction | undefined {
    switch (diagnostic.code as Code) {
        case 'no-control-regex': {
            break;
        }
        case 'no-invalid-regexp': {
            break;
        }
        case 'no-regex-spaces': {
            if (diagnostic.range.start.line !== diagnostic.range.end.line) {
                // TODO: support multi line
                return;
            }
            const entry: RegexEntry = diagnostic.data;
            if (!entry) {
                return;
            }
            const pattern = entry.match.pattern;
            const index = pattern.indexOf('  ');
            let i;
            for (i = index; index < pattern.length; i++) {
                if (pattern[i] !== ' ') {
                    break;
                }
            }
            const length = i - index;
            const newText = ` {${length}}`;
            const characterStartIndex =
                diagnostic.range.start.character + getPatternStartIndex(entry.match.type) + index;
            const characterEndIndex = characterStartIndex + length;
            return {
                title: `Replace spaces with ' {${length}}'`,
                diagnostics: [diagnostic],
                isPreferred: true,
                kind: CodeActionKind.QuickFix,
                // TODO: use Annotated Text Edit
                // see: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocumentEdit
                edit: {
                    changes: {
                        [uri]: [
                            {
                                newText,
                                range: {
                                    start: {
                                        line: diagnostic.range.start.line,
                                        character: characterStartIndex,
                                    },
                                    end: {
                                        line: diagnostic.range.start.line,
                                        character: characterEndIndex,
                                    },
                                },
                            },
                        ],
                    },
                },
            };
        }
        case 'prefer-regex-new-expression': {
            return {
                title: 'Convert to new expression',
                diagnostics: [diagnostic],
                isPreferred: true,
                kind: CodeActionKind.QuickFix,
                // TODO: use Annotated Text Edit
                // see: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocumentEdit
                edit: {
                    changes: {
                        [uri]: [
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
            };
        }
        case 'prefer-regex-literals': {
            const entry: RegexEntry = diagnostic.data;
            if (!entry) {
                return;
            }
            if (entry.match.type === RegexMatchType.String) {
                return;
            }
            return {
                title: 'Convert to literal',
                diagnostics: [diagnostic],
                isPreferred: true,
                kind: CodeActionKind.QuickFix,
                // TODO: use Annotated Text Edit
                // see: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocumentEdit
                edit: {
                    changes: {
                        [uri]: [
                            {
                                newText: `/${entry.match.pattern}/${entry.match.flags}`,
                                range: {
                                    start: diagnostic.range.start,
                                    end: diagnostic.range.end,
                                },
                            },
                        ],
                    },
                },
            };
        }
    }
}

function getPatternStartIndex(type: RegexMatch['type']) {
    switch (type) {
        case RegexMatchType.Literal: {
            // `/pattern/flags`
            //   ^
            //  01
            return 1;
        }
        case RegexMatchType.Constructor: {
            // `new RegExp("pattern", "flags")`
            //              ^
            //  0123456789012
            return 12;
        }
        case RegexMatchType.Function: {
            // `RegExp("pattern", "flags")`
            //          ^
            //  012345678
            return 8;
        }
        case RegexMatchType.String: {
            // `"pattern"`
            //   ^
            //  01
            return 1;
        }
    }
}
