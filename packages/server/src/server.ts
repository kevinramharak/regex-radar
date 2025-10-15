import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    TextDocumentSyncKind,
    InitializeResult,
    ClientCapabilities,
    RequestType,
    ShowMessageParams,
    ShowMessageRequestParams,
    MessageType,
    ShowMessageRequest,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import packageJson from "../package.json";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let capabilities: Partial<ClientCapabilities> = {};

connection.onInitialize((params) => {
    capabilities = params.capabilities;

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
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

connection.onInitialized(() => {});

documents.onDidChangeContent((e) => {
    connection.window.showInformationMessage(e.document.uri);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
