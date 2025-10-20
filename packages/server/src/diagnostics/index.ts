import {
    Connection,
    DocumentDiagnosticReport,
    DocumentDiagnosticReportKind,
    WorkspaceDiagnosticReport,
} from "vscode-languageserver";

export function registerDiagnosticsHandlers(connection: Connection) {
    connection.languages.diagnostics.on(async (params, token, workDoneProgress, resultProgress) => {
        connection.console.debug(`requested diagnostics for: ${params.textDocument.uri}`);
        const result: DocumentDiagnosticReport = {
            kind: DocumentDiagnosticReportKind.Full,
            items: [],
        };
        return result;
    });

    connection.languages.diagnostics.onWorkspace(async (params, token, workDoneProgress, resultProgress) => {
        // connection.console.debug(`requested workspace diagnostics`);
        const result: WorkspaceDiagnosticReport = {
            items: [],
        };
        return result;
    });
}
