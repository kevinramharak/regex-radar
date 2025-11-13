import {
    type CancellationToken,
    type Diagnostic,
    DiagnosticSeverity,
    type DocumentDiagnosticParams,
} from 'vscode-languageserver';

import { Implements, Service, ServiceLifetime } from '@gitlab/needle';

import { EntryType, RegexMatchType } from '@regex-radar/lsp-types';

import { IConfiguration } from '../../../configuration';
import { EXTENSION_ID } from '../../../constants';
import { IDiscoveryService } from '../../../discovery';
import { IOnDocumentDiagnostic } from '../../events';

import { getEnabledRules } from './get-enabled-rules';
import type { LinterRulesConfigurationSchema } from './schema';

export type Code = keyof LinterRulesConfigurationSchema;

const messages: Record<Code, string> = {
    'no-control-regex': `Unexpected control character(s) in regular expression: '{}'`,
    'no-invalid-regexp': `A regular expression literal can be confused with '/='.`,
    'no-regex-spaces': `Spaces are hard to count. Use ' {{}}'.`,
    'prefer-regex-new-expression': `Use a new expression instead of calling 'RegExp' as a function.`,
    'prefer-regex-literals': `Use a regular expression literal instead of the 'RegExp' constructor.`,
};

// TODO: implement suppressions
// see: https://eslint.org/docs/latest/use/configure/rules#disabling-rules
@Implements(IOnDocumentDiagnostic)
@Service({ dependencies: [IConfiguration, IDiscoveryService], lifetime: ServiceLifetime.Singleton })
export class LinterDiagnostic implements IOnDocumentDiagnostic {
    constructor(
        private readonly configuration: IConfiguration,
        private readonly discovery: IDiscoveryService,
    ) {}

    async onDocumentDiagnostic(
        params: DocumentDiagnosticParams,
        token?: CancellationToken,
    ): Promise<Diagnostic[]> {
        const configuration = await this.configuration.get('regex-radar.diagnostics');
        if (!configuration.linter.enabled || token?.isCancellationRequested) {
            return [];
        }

        const enabled = getEnabledRules(configuration.linter.rules);
        if (!enabled.length) {
            return [];
        }

        const entries = await this.discovery.discover({ uri: params.textDocument.uri, hint: EntryType.File });
        if (!entries || token?.isCancellationRequested) {
            return [];
        }

        return entries.children.reduce<Diagnostic[]>((results, entry) => {
            // TODO: move linter 'pure' code to a seperate package
            {
                /**
                 * TODO: implement this
                 * see https://eslint.org/docs/latest/rules/no-control-regex
                 * NOTE: maybe don't bother with the unicode
                 */
                const _code: Code = 'no-control-regex';
            }
            {
                /**
                 * TODO: implement this
                 * see https://eslint.org/docs/latest/rules/no-invalid-regexp
                 * use a regex parser like: https://github.com/eslint-community/regexpp
                 */
                const _code: Code = 'no-invalid-regexp';
            }
            {
                const code: Code = 'no-regex-spaces';
                if (enabled.includes(code)) {
                    const pattern = entry.match.pattern;
                    const index = pattern.indexOf('  ');
                    if (index !== -1) {
                        let i;
                        for (i = index; index < pattern.length; i++) {
                            if (pattern[i] !== ' ') {
                                break;
                            }
                        }
                        const length = i - index;
                        results.push({
                            range: entry.location.range,
                            source: EXTENSION_ID,
                            message: messages[code].replace('{}', length.toString()),
                            severity: DiagnosticSeverity.Warning,
                            code,
                            data: entry,
                        });
                    }
                }
            }
            {
                const code: Code = 'prefer-regex-literals';
                if (enabled.includes(code)) {
                    switch (entry.match.type) {
                        case RegexMatchType.Constructor:
                        case RegexMatchType.Function: {
                            // TODO: ignore non-dynamic regexes
                            results.push({
                                range: entry.location.range,
                                source: EXTENSION_ID,
                                message: messages[code],
                                severity: DiagnosticSeverity.Warning,
                                code,
                                data: entry,
                            });
                        }
                    }
                }
            }
            {
                const code: Code = 'prefer-regex-new-expression';
                if (enabled.includes(code)) {
                    if (entry.match.type === RegexMatchType.Function) {
                        results.push({
                            range: entry.location.range,
                            source: EXTENSION_ID,
                            message: messages[code],
                            severity: DiagnosticSeverity.Warning,
                            code,
                        });
                    }
                }
            }
            return results;
        }, []);
    }
}
