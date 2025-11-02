import { TextDocument } from 'vscode-languageserver-textdocument';
import { ProposedFeatures, TextDocuments, createConnection } from 'vscode-languageserver/node';

import { CodeActionService } from './code-actions';
import { Configuration } from './configuration';
import { Connection, IConnection } from './connection';
import { LsConnection, buildServiceProvider, createServiceCollection } from './di';
import { DiagnosticsService } from './diagnostics';
import { DiscoveryService } from './discovery';
import { DocumentsService } from './documents';
import { LifecycleHandler } from './lifecycle';
import { Logger } from './logger';
import { MessageHandler } from './message-handler';
import { ParserProvider } from './parsers';

const collection = createServiceCollection({
    connection: createConnection(ProposedFeatures.all),
    documents: new TextDocuments(TextDocument),
});
const provider = buildServiceProvider(collection, {
    constructors: [
        Connection,
        LifecycleHandler,
        MessageHandler,
        Configuration,
        Logger,
        DiscoveryService,
        DocumentsService,
        ParserProvider,
        DiagnosticsService,
        CodeActionService,
    ],
});

// TODO: use dynamic registration (onInitialized), instead of static registration (onInitialize)

/**
 *`connection` is considered the root of the server application, calling `.listen()` will bootstrap and start the server.
 */
const connection = provider.getRequiredService(IConnection);
connection.listen();

// This *should* run `dispose` on all disposables registered in the service provider.
process.addListener('beforeExit', (code) => {
    provider.dispose();
});
