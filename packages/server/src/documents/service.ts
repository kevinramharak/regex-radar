import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
    DidChangeTextDocumentNotification,
    DidCloseTextDocumentNotification,
    DidOpenTextDocumentNotification,
    type InitializeResult,
    type TextDocumentRegistrationOptions,
    TextDocumentSyncKind,
    type TextEdit,
} from 'vscode-languageserver';
import { type DocumentUri, TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

import { Implements, Injectable, collection, createInterfaceId, isDisposable } from '@gitlab/needle';

import { IConfiguration } from '../configuration';
import { DOCUMENT_SELECTOR } from '../constants';
import { IServiceProvider, LsConnection, LsTextDocuments } from '../di';
import { IOnInitialize, IOnInitialized } from '../lifecycle';
import { Disposable } from '../util/disposable';
import { getLanguageIdForFileExtension } from '../util/language-identifiers';

import {
    IOnTextDocumentDidChangeHandler,
    IOnTextDocumentDidCloseHandler,
    IOnTextDocumentDidOpenHandler,
    IOnTextDocumentDidSaveHandler,
    IOnTextDocumentWillSaveHandler,
    IOnTextDocumentWillSaveWaitUntilHandler,
} from './events';

export interface IDocumentsService {
    getOrCreate(uri: DocumentUri): Promise<TextDocument>;
}

export const IDocumentsService = createInterfaceId<IDocumentsService>('IDocumentsService');

/**
 * `DocumentsService` is a wrapper over the `LsTextDocuments`/`import('vscode-languageserver').TextDocuments<TextDocument>`.
 * It owns the `LsTextDocuments` instance and is responsible for disposing it.
 * It allows `IOnTextDocumentDidCloseHandler`, `IOnTextDocumentDidSaveHandler`, `IOnTextDocumentDidChangeHandler`, `IOnTextDocumentDidOpenHandler`, `IOnTextDocumentWillSaveHandler` and `IOnTextDocumentWillSaveWaitUntilHandler` implementations to register an event handler for those events.
 */
@Implements(IOnInitialize)
@Implements(IOnInitialized)
@Injectable(IDocumentsService, [IConfiguration, LsTextDocuments, IServiceProvider])
export class DocumentsService extends Disposable implements IDocumentsService, IOnInitialized {
    constructor(
        private readonly configuration: IConfiguration,
        private readonly documents: LsTextDocuments,
        private readonly provider: IServiceProvider,
    ) {
        super();
    }

    onInitialize(): InitializeResult['capabilities'] {
        return {
            textDocumentSync: {
                openClose: true,
                change: TextDocumentSyncKind.Incremental,
                save: {
                    includeText: false,
                },
                willSave: true,
                willSaveWaitUntil: true,
            },
        };
    }

    async onInitialized(connection: LsConnection): Promise<void> {
        const clientCapabilities = await this.configuration.get('client.capabilities');
        const synchronizationOptions = clientCapabilities.textDocument?.synchronization;

        if (!synchronizationOptions?.dynamicRegistration) {
            return;
        }

        const registrationParams: TextDocumentRegistrationOptions = {
            documentSelector: DOCUMENT_SELECTOR,
        };

        const pendingDisposables: Promise<{ dispose(): void }>[] = [
            connection.client.register(DidOpenTextDocumentNotification.type, registrationParams),
            connection.client.register(DidCloseTextDocumentNotification.type, registrationParams),
            connection.client.register(DidChangeTextDocumentNotification.type, {
                ...registrationParams,
                syncKind: TextDocumentSyncKind.Incremental,
            }),
        ];

        if (synchronizationOptions.didSave) {
        }
        if (synchronizationOptions.willSave) {
        }
        if (synchronizationOptions.willSaveWaitUntil) {
        }

        Promise.all(pendingDisposables).then((disposables) => {
            this.disposables.push(...disposables);
        });

        const onDidChangeContentHandlers = this.provider.getServices(
            collection(IOnTextDocumentDidChangeHandler),
        );
        this.disposables.push(
            ...onDidChangeContentHandlers.map((handler) => {
                return this.documents.onDidChangeContent((event) => handler.onTextDocumentDidChange(event));
            }),
        );
        const onDidCloseHandlers = this.provider.getServices(collection(IOnTextDocumentDidCloseHandler));
        this.disposables.push(
            ...onDidCloseHandlers.map((handler) => {
                return this.documents.onDidClose((event) => handler.onTextDocumentDidClose(event));
            }),
        );
        const onDidSaveHandlers = this.provider.getServices(collection(IOnTextDocumentDidSaveHandler));
        this.disposables.push(
            ...onDidSaveHandlers.map((handler) => {
                return this.documents.onDidSave((event) => handler.onTextDocumentDidSave(event));
            }),
        );
        const onDidOpenHandlers = this.provider.getServices(collection(IOnTextDocumentDidOpenHandler));
        this.disposables.push(
            ...onDidOpenHandlers.map((handler) => {
                return this.documents.onDidOpen((event) => handler.onTextDocumentDidOpen(event));
            }),
        );
        const onWillSaveHandlers = this.provider.getServices(collection(IOnTextDocumentWillSaveHandler));
        this.disposables.push(
            ...onWillSaveHandlers.map((handler) => {
                return this.documents.onWillSave((event) => handler.onTextDocumentWillSave(event));
            }),
        );
        const onWillSaveWaitUntilHandlers = this.provider.getServices(
            collection(IOnTextDocumentWillSaveWaitUntilHandler),
        );
        const notSureIfDisposable: Disposable | void = this.documents.onWillSaveWaitUntil(
            async (params, token) => {
                const results = await Promise.all(
                    onWillSaveWaitUntilHandlers.map((handler) => {
                        return handler.onTextDocumentWillSaveUntil(params, token);
                    }),
                );
                // TODO: if multiple handlers return overlapping text edits, what happens?
                return results.filter((result): result is TextEdit[] => !Array.isArray(result)).flat();
            },
        );
        if (isDisposable(notSureIfDisposable)) {
            this.disposables.push(notSureIfDisposable);
        }
        // TODO: allow for a `IOnTextDocumentDidChangeRaw` handler, which contains `TextDocumentChangeEvent` properties: `contentChanges` and `reason`
        this.disposables.push(this.documents.listen(connection));
    }

    get(uri: DocumentUri): TextDocument | null {
        return this.documents.get(uri) ?? null;
    }

    /**
     * Get the `TextDocument` for `uri`.
     * If the document is **not** a managed document the contents will be read from the uri location and a document will be created.
     */
    async getOrCreate(uri: DocumentUri): Promise<TextDocument> {
        let document = this.documents.get(uri);

        if (!document) {
            const fsPath = URI.parse(uri).fsPath;
            // TODO: add a FileSystemService / URI fetcher service
            const contents = await fs.readFile(fsPath, { encoding: 'utf-8' });
            const extension = path.extname(fsPath);
            const languageId = getLanguageIdForFileExtension(extension) || 'plaintext';
            // TODO: cache this document instance?
            //       this could be cached, as long as there is no didOpen event, and the file disk is being watched for changes
            document = TextDocument.create(uri, languageId, 0, contents);
        }

        return document;
    }

    /**
     * Returns `true` if the given `uri` is being managed by this instance, `false` otherwise.
     */
    isManaged(uri: DocumentUri): boolean {
        return this.documents.keys().includes(uri);
    }
}
