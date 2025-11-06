import { TextDocument } from 'vscode-languageserver-textdocument';
import { ProposedFeatures, TextDocuments, createConnection } from 'vscode-languageserver/node';

import { CodeActionMessageHandler, onCodeActionHandlers } from './code-actions';
import { CodeLensMessageHandler, onCodeLensHandlers } from './code-lens';
import { Configuration } from './configuration';
import { Connection, IConnection } from './connection';
import { buildServiceProvider, createServiceCollection } from './di';
import { DiagnosticsMessageHandler, onDiagnosticHandlers } from './diagnostics';
import { DiscoveryRequestMessageHandler, DiscoveryService } from './discovery';
import { DocumentsService } from './documents';
import { FileSystem } from './file-system';
import { fileSystemProviders } from './file-system-provider';
import { LifecycleHandler } from './lifecycle';
import { Logger } from './logger';
import { MessageHandler } from './message-handler';
import { ParserProvider } from './parsers';

const collection = createServiceCollection({
    connection: createConnection(ProposedFeatures.all),
    documents: new TextDocuments(TextDocument),
});
const provider = buildServiceProvider(collection, [
    Connection,
    LifecycleHandler,
    MessageHandler,
    Configuration,
    Logger,
    DiscoveryRequestMessageHandler,
    DiscoveryService,
    DocumentsService,
    ParserProvider,
    DiagnosticsMessageHandler,
    ...onDiagnosticHandlers,
    CodeActionMessageHandler,
    ...onCodeActionHandlers,
    CodeLensMessageHandler,
    ...onCodeLensHandlers,
    FileSystem,
    ...fileSystemProviders,
]);

/**
 *`connection` is considered the root of the server application, calling `.listen()` will bootstrap and start the server.
 */
const connection = provider.getRequiredService(IConnection);
connection.listen();

// This *should* run `dispose` on all disposables registered in the service provider.
process.addListener('beforeExit', (code) => {
    provider.dispose();
});
