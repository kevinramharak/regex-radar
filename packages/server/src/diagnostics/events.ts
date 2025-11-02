import {
    type DocumentDiagnosticParams,
    type DocumentDiagnosticReport,
    type WorkspaceDiagnosticParams,
    type WorkspaceDiagnosticReport,
} from 'vscode-languageserver';

import { createInterfaceId } from '@gitlab/needle';

export interface IOnDocumentDiagnostic {
    onDocumentDiagnostic(
        params: DocumentDiagnosticParams,
    ): DocumentDiagnosticReport | Promise<DocumentDiagnosticReport>;
}

export const IOnDocumentDiagnostic = createInterfaceId<IOnDocumentDiagnostic>('IOnDocumentDiagnostic');

interface IOnWorkspaceDiagnostic {
    onWorkspaceDiagnostic(
        params: WorkspaceDiagnosticParams,
    ): WorkspaceDiagnosticReport | Promise<WorkspaceDiagnosticReport>;
}

export const IOnWorkspaceDiagnostic = createInterfaceId<IOnWorkspaceDiagnostic>('IOnWorkspaceDiagnostic');
