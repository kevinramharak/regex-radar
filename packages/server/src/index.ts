import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    TextDocumentSyncKind,
    InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import packageJson from "../package.json";
import { registerDiagnosticsHandlers } from "./diagnostics";
import { registerDocumentsHandlers } from "./documents";
import { registerTreeViewHandlers } from "./tree-view";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params) => {
    const capabilities = params.capabilities;

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: {
                change: TextDocumentSyncKind.Incremental,
                openClose: true,
                save: true,
                willSave: true,
            },
            diagnosticProvider: {
                identifier: "Regex Radar",
                documentSelector: [{ language: "typescript" }, { language: "javascript" }],
                interFileDependencies: false,
                workspaceDiagnostics: true,
            },
        },
        serverInfo: {
            name: packageJson.name,
            version: packageJson.version,
        },
    };
    if (capabilities.workspace?.workspaceFolders) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true,
            },
        };
    }
    return result;
});

// VSCode API
registerDocumentsHandlers(connection, documents);
registerDiagnosticsHandlers(connection);

// Custom Requests
registerTreeViewHandlers(connection, documents);

connection.listen();
