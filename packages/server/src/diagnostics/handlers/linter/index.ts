import {
    type CancellationToken,
    type Diagnostic,
    DiagnosticSeverity,
    type DocumentDiagnosticParams,
} from 'vscode-languageserver';

import { Implements, Service, ServiceLifetime } from '@gitlab/needle';

import { RegExpValidator, RegExpSyntaxError } from '@eslint-community/regexpp';

import { EntryType, RegexMatchType } from '@regex-radar/lsp-types';

import { IConfiguration } from '../../../configuration';
import { EXTENSION_ID } from '../../../constants';
import { IDiscoveryService } from '../../../discovery';
import { IOnDocumentDiagnostic } from '../../events';

import { getEnabledRules } from './get-enabled-rules';
import type { LinterRulesConfigurationSchema } from './schema';

export type Code = keyof LinterRulesConfigurationSchema;

const messages: Record<Code, string> = {
    'no-control-regex': `Unexpected control character(s) in regular expression: '{}'.`,
    'no-invalid-regexp': `Invalid regular expression: {}.`,
    'no-regex-spaces': `Spaces are hard to count. Use ' {{}}'.`,
    'prefer-regex-new-expression': `Use a new expression instead of calling 'RegExp' as a function.`,
    'prefer-regex-literals': `Use a regular expression literal instead of the 'RegExp' constructor.`,
};

// TODO: implement suppressions
// see: https://eslint.org/docs/latest/use/configure/rules#disabling-rules
@Implements(IOnDocumentDiagnostic)
@Service({ dependencies: [IConfiguration, IDiscoveryService], lifetime: ServiceLifetime.Singleton })
export class LinterDiagnostic implements IOnDocumentDiagnostic {
    private context = {
        source: '',
        controlCharacters: [] as [start: number, end: number][],
    };
    private validator = new RegExpValidator({
        onPatternEnter: () => {
            this.context.controlCharacters = [];
        },
        onCharacter: (start, end, codePoint) => {
            if (
                codePoint >= 0x00 &&
                codePoint <= 0x1f &&
                (this.context.source.codePointAt(start) === codePoint ||
                    this.context.source.slice(start, end).startsWith('\\x') ||
                    this.context.source.slice(start, end).startsWith('\\u'))
            ) {
                this.context.controlCharacters.push([start, end]);
            }
        },
    });

    constructor(
        private readonly configuration: IConfiguration,
        private readonly discovery: IDiscoveryService,
    ) {}

    private validate(pattern: string, flags: string): string | null {
        try {
            this.validator.validatePattern(pattern, void 0, void 0, {
                unicode: flags.includes('u'),
                unicodeSets: flags.includes('v'),
            });
            if (flags) {
                this.validator.validateFlags(flags);
            }
            return null;
        } catch (e: unknown) {
            if (e instanceof RegExpSyntaxError) {
                return e.message;
            }
            throw e;
        }
    }

    private validateControlCharacters(pattern: string, flags: string): [start: number, end: number][] {
        this.context.source = pattern;
        this.context.controlCharacters = [];
        this.validate(pattern, flags);
        return this.context.controlCharacters;
    }

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
            {
                /**
                 * see https://eslint.org/docs/latest/rules/no-control-regex
                 */
                const code: Code = 'no-control-regex';
                if (enabled.includes(code)) {
                    const flags = 'flags' in entry.match ? entry.match.flags : '';
                    const controlCharacters = this.validateControlCharacters(entry.match.pattern, flags);
                    if (controlCharacters.length > 0) {
                        const arg = this.context.controlCharacters
                            .map(([start, end]) => {
                                return this.context.source.slice(start, end);
                            })
                            .join(', ');
                        results.push({
                            range: entry.location.range,
                            source: EXTENSION_ID,
                            message: messages[code].replace('{}', arg),
                            severity: DiagnosticSeverity.Error,
                            code,
                            data: entry,
                        });
                    }
                }
            }
            {
                /**
                 * see https://github.com/eslint/eslint/blob/main/lib/rules/no-invalid-regexp.js
                 * for what else to check and what to discard
                 */
                const code: Code = 'no-invalid-regexp';
                if (enabled.includes(code)) {
                    switch (entry.match.type) {
                        case RegexMatchType.Constructor:
                        case RegexMatchType.Function: {
                            const message = this.validate(entry.match.pattern, entry.match.flags);
                            if (message) {
                                results.push({
                                    range: entry.location.range,
                                    source: EXTENSION_ID,
                                    message: messages[code].replace('{}', message),
                                    severity: DiagnosticSeverity.Error,
                                    code,
                                    data: entry,
                                });
                            }
                        }
                    }
                }
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
