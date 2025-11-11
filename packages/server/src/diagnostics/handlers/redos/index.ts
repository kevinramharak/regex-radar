import {
    type DocumentDiagnosticParams,
    type CancellationToken,
    type Diagnostic,
    DiagnosticSeverity,
} from 'vscode-languageserver';

import { Implements, Service, ServiceLifetime } from '@gitlab/needle';

import type { Diagnostics as RecheckDiagnostics, VulnerableDiagnostics } from 'recheck';

import { EntryType, type RegexEntry } from '@regex-radar/lsp-types';

import { IConfiguration } from '../../../configuration';
import { EXTENSION_ID } from '../../../constants';
import { IDiscoveryService } from '../../../discovery';
import { IRedosCheckService } from '../../../redos/service';
import { resultOrCancellation } from '../../../util/cancellation-promise';
import { IOnDocumentDiagnostic } from '../../events';
import { IDiagnosticService } from '../../service';

@Implements(IOnDocumentDiagnostic)
@Service({
    dependencies: [IConfiguration, IDiscoveryService, IRedosCheckService, IDiagnosticService],
    lifetime: ServiceLifetime.Singleton,
})
export class RedosDiagnostic implements IOnDocumentDiagnostic {
    constructor(
        private readonly configuration: IConfiguration,
        private readonly discovery: IDiscoveryService,
        private readonly redos: IRedosCheckService,
        private readonly diagnostics: IDiagnosticService,
    ) {}

    async onDocumentDiagnostic(
        params: DocumentDiagnosticParams,
        token?: CancellationToken,
    ): Promise<Diagnostic[]> {
        const configuration = await this.configuration.get('regex-radar.diagnostics');
        if (!configuration.redos.enabled || token?.isCancellationRequested) {
            return [];
        }

        const entries = await this.discovery.discover({ uri: params.textDocument.uri, hint: EntryType.File });
        if (!entries || token?.isCancellationRequested) {
            return [];
        }

        const syncChecks = entries.children.map((entry) => [entry, this.redos.check(entry.match)] as const);
        const asyncChecks: [RegexEntry, Promise<RecheckDiagnostics>][] = [];
        const diagnostics = syncChecks.reduce<Diagnostic[]>((results, [entry, result]) => {
            if (!result.sync) {
                asyncChecks.push([entry, result.promise]);
                return results;
            }
            if (result.diagnostics.status === 'vulnerable') {
                const diagnostic = createDiagnostic(result.diagnostics, entry);
                results.push(diagnostic);
            }
            return results;
        }, []);

        this.handleAsyncChecks(params.textDocument.uri, asyncChecks, token);

        return diagnostics;
    }

    // TODO: need to clear the diagnostics on document change
    private async handleAsyncChecks(
        uri: string,
        asyncChecks: [RegexEntry, Promise<RecheckDiagnostics>][],
        token?: CancellationToken,
    ): Promise<void> {
        const awaitedChecks = Promise.all(
            asyncChecks.map(async ([entry, promise]) => {
                return [entry, await promise] as const;
            }),
        );
        const checks = await resultOrCancellation(awaitedChecks, token);
        if (!Array.isArray(checks)) {
            return;
        }
        const diagnostics = checks.reduce<Diagnostic[]>((results, [entry, diagnostics]) => {
            if (diagnostics.status !== 'vulnerable') {
                return results;
            }
            const diagnostic = createDiagnostic(diagnostics, entry);
            if (diagnostic) {
                results.push(diagnostic);
            }
            return results;
        }, []);
        if (diagnostics.length) {
            this.diagnostics.publish(uri, diagnostics);
        }
    }
}

function createDiagnostic(diagnostics: VulnerableDiagnostics, entry: RegexEntry): Diagnostic {
    switch (diagnostics.complexity.type) {
        case 'exponential': {
            return {
                message: `This regular expression is vulnerable to a ReDoS attack with complexity: ${diagnostics.complexity.summary}`,
                code: `redos-exponential`,
                range: entry.location.range,
                data: diagnostics,
                severity: DiagnosticSeverity.Error,
                source: EXTENSION_ID,
            };
        }
        case 'polynomial': {
            return {
                message: `This regular expression is vulnerable to a ReDoS attack with complexity: ${diagnostics.complexity.summary}`,
                code: `redos-polynomial`,
                range: entry.location.range,
                data: diagnostics,
                severity: DiagnosticSeverity.Warning,
                source: EXTENSION_ID,
            };
        }
    }
}
