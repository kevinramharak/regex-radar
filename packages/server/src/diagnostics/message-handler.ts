import {
    type CancellationToken,
    DiagnosticRefreshRequest,
    type DiagnosticRegistrationOptions,
    type DocumentDiagnosticParams,
    type DocumentDiagnosticReport,
    DocumentDiagnosticReportKind,
    type DocumentDiagnosticReportPartialResult,
    DocumentDiagnosticRequest,
    type ResultProgressReporter,
    type WorkDoneProgressReporter,
    type WorkspaceDiagnosticParams,
    type WorkspaceDiagnosticReport,
    type WorkspaceDiagnosticReportPartialResult,
} from 'vscode-languageserver';

import { Implements, Injectable, collection, createInterfaceId } from '@gitlab/needle';

import { IConfiguration } from '../configuration';
import { DOCUMENT_SELECTOR, EXTENSION_ID } from '../constants';
import type { LsConnection } from '../di/external-interfaces';
import { IServiceProvider } from '../di/service-provider';
import { IOnInitialized } from '../lifecycle';
import { ILogger } from '../logger';
import { IRequestMessageHandler } from '../message-handler';
import { Disposable } from '../util/disposable';
import { runHandlers } from '../util/handlers';

import { IOnDocumentDiagnostic, IOnWorkspaceDiagnostic } from './events';

export interface IDiagnosticsMessageHandler {
    onDiagnosticRequest(
        params: DocumentDiagnosticParams,
        token?: CancellationToken,
    ): Promise<DocumentDiagnosticReport>;
    onWorkspaceDiagnosticRequest(
        params: WorkspaceDiagnosticParams,
        token?: CancellationToken,
    ): Promise<WorkspaceDiagnosticReport>;
    refresh?(): void;
}

export const IDiagnosticsMessageHandler = createInterfaceId<IDiagnosticsMessageHandler>(
    'IDiagnosticsMessageHandler',
);

@Implements(IOnInitialized)
@Implements(IRequestMessageHandler)
@Injectable(IDiagnosticsMessageHandler, [IConfiguration, IServiceProvider, ILogger])
export class DiagnosticsMessageHandler
    extends Disposable
    implements IDiagnosticsMessageHandler, IRequestMessageHandler
{
    private onDocumentDiagnosticHandlers: IOnDocumentDiagnostic[] = [];
    private onWorkspaceDiagnosticHandlers: IOnWorkspaceDiagnostic[] = [];

    constructor(
        private readonly configuration: IConfiguration,
        private readonly provider: IServiceProvider,
        private readonly logger: ILogger,
    ) {
        super();
    }

    async onInitialized(connection: LsConnection): Promise<void> {
        const clientCapabilities = await this.configuration.get('client.capabilities');

        if (!clientCapabilities.textDocument?.diagnostic?.dynamicRegistration) {
            return;
        }

        if (clientCapabilities.workspace?.diagnostics?.refreshSupport) {
            this.refresh = () => connection.sendRequest(DiagnosticRefreshRequest.type);
        }

        this.onDocumentDiagnosticHandlers = this.provider.getServices(collection(IOnDocumentDiagnostic));
        this.onWorkspaceDiagnosticHandlers = this.provider.getServices(collection(IOnWorkspaceDiagnostic));

        const interFileDependencies =
            this.onDocumentDiagnosticHandlers.some((handler) => handler.interFileDependencies) ||
            this.onWorkspaceDiagnosticHandlers.some((handler) => handler.interFileDependencies);

        const registerParams: DiagnosticRegistrationOptions = {
            interFileDependencies,
            // TODO: implement workspaceDiagnostics
            workspaceDiagnostics: false || this.onWorkspaceDiagnosticHandlers.length > 0,
            identifier: EXTENSION_ID,
            documentSelector: DOCUMENT_SELECTOR,
        };

        if (this.onDocumentDiagnosticHandlers.length) {
            this.disposables.push(
                await connection.client.register(DocumentDiagnosticRequest.type, registerParams),
            );
        }

        // TODO: how to implement push diagnostics?
    }

    register(connection: LsConnection) {
        this.disposables.push(connection.languages.diagnostics.on(this.onDiagnosticRequest.bind(this)));
    }

    async onDiagnosticRequest(
        params: DocumentDiagnosticParams,
        token?: CancellationToken,
        workDone?: WorkDoneProgressReporter,
        progress?: ResultProgressReporter<DocumentDiagnosticReportPartialResult>,
    ): Promise<DocumentDiagnosticReport> {
        const report: DocumentDiagnosticReport = {
            kind: DocumentDiagnosticReportKind.Full,
            items: [],
        };
        const handlers = this.onDocumentDiagnosticHandlers;

        if (handlers.length === 0) {
            return report;
        }

        // TODO: implement progress reporting + related documents reporting
        report.items = await runHandlers(
            handlers.map((handler) => () => handler.onDocumentDiagnostic(params, token)),
            token,
            workDone,
            void 0, // progress,
            this.logger,
        );

        return report;
    }

    async onWorkspaceDiagnosticRequest(
        params: WorkspaceDiagnosticParams,
        token?: CancellationToken,
        workDone?: WorkDoneProgressReporter,
        progress?: ResultProgressReporter<WorkspaceDiagnosticReportPartialResult>,
    ): Promise<WorkspaceDiagnosticReport> {
        // TODO: onWorkspaceDiagnosticsRequests can be a constantly open & streaming request
        //       if the request is closed, the client might start the request again immediatly
        // see: https://github.com/microsoft/vscode-languageserver-node/issues/1669
        return {
            items: [],
        };
    }

    // TODO: move refresh functionality to the diagnostics service
    refresh: IDiagnosticsMessageHandler['refresh'];
}
