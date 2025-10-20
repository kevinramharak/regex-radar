import { createConnection, TextDocuments, ProposedFeatures } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import { DiscoveryService } from "./discovery";

import { buildServiceProvider, createServiceCollection } from "./di";
import { IMessageHandler, MessageHandler } from "./message-handler";
import { ILifecycleHandler, LifecycleHandler } from "./lifecycle";
import { DocumentsService } from "./documents";
import { Logger } from "./logger";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const collection = createServiceCollection({
    connection,
    documents,
});
const provider = buildServiceProvider(collection, {
    constructors: [LifecycleHandler, MessageHandler, DiscoveryService, DocumentsService, Logger],
});

// TODO: move this to a Connection wrapper class, that knows about registries and calls them, before calling connection.listen
// The message handler will register all message/lifecycle handlers that are registered with the service collection
const lifecycleHandler = provider.getRequiredService(ILifecycleHandler);
lifecycleHandler.register();
const messageHandler = provider.getRequiredService(IMessageHandler);
messageHandler.register();

// Listen on the connection
connection.listen();
