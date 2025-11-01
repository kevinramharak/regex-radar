import { TextDocument, type DocumentUri } from "vscode-languageserver-textdocument";
import {
    DidChangeTextDocumentNotification,
    DidCloseTextDocumentNotification,
    DidOpenTextDocumentNotification,
    TextDocumentSyncKind,
    type InitializedParams,
    type InitializeParams,
    type InitializeResult,
    type TextDocumentChangeRegistrationOptions,
    type TextDocumentRegistrationOptions,
    type TextEdit,
} from "vscode-languageserver";
import { URI } from "vscode-uri";

import * as path from "path";
import * as fs from "fs/promises";

import {
    collection,
    createInterfaceId,
    Disposable,
    Implements,
    isDisposable,
    Service,
    ServiceLifetime,
} from "@gitlab/needle";

import { LsConnection, LsTextDocuments, IServiceProvider } from "../di";
import { fileExtensionToLanguageId } from "../language-identifiers";
import {
    IOnTextDocumentDidCloseHandler,
    IOnTextDocumentDidSaveHandler,
    IOnTextDocumentDidChangeHandler,
    IOnTextDocumentDidOpenHandler,
    IOnTextDocumentWillSaveHandler,
    IOnTextDocumentWillSaveWaitUntilHandler,
} from "./events";
import { IOnInitialized, IOnInitialize } from "../lifecycle";

export interface IDocumentsService {
    getOrCreate(uri: DocumentUri): Promise<TextDocument>;
}

export const IDocumentsService = createInterfaceId<IDocumentsService>("IDocumentsService");

@Implements(IOnInitialize)
@Implements(IOnInitialized)
@Implements(IDocumentsService)
@Service({
    dependencies: [LsConnection, LsTextDocuments, IServiceProvider],
    lifetime: ServiceLifetime.Singleton,
})
export class DocumentsService implements IDocumentsService, IOnInitialized, Disposable {
    private disposables: Disposable[] = [];

    dispose(): void {
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    constructor(
        private connection: LsConnection,
        private documents: LsTextDocuments,
        private provider: IServiceProvider
    ) {}

    onInitialize(params: InitializeParams): InitializeResult {
        return {
            capabilities: {
                textDocumentSync: {
                    change: TextDocumentSyncKind.Incremental,
                    openClose: true,
                },
            },
        };
    }

    onInitialized(params: InitializedParams): void | Promise<void> {
        // TODO: make languages configurable
        const registrationParams: TextDocumentRegistrationOptions = {
            documentSelector: [{ language: "javascript" }, { language: "typescript" }],
        };
        Promise.all([
            this.connection.client.register(DidOpenTextDocumentNotification.type, registrationParams),
            this.connection.client.register(DidChangeTextDocumentNotification.type, {
                ...registrationParams,
                syncKind: TextDocumentSyncKind.Incremental,
            }),
            this.connection.client.register(DidCloseTextDocumentNotification.type, registrationParams),
        ]).then((disposables) => {
            this.disposables.push(...disposables);
        });

        const onDidChangeContentHandlers = this.provider.getServices(
            collection(IOnTextDocumentDidChangeHandler)
        );
        this.disposables.push(
            ...onDidChangeContentHandlers.map((handler) => {
                return this.documents.onDidChangeContent((event) => handler.onTextDocumentDidChange(event));
            })
        );
        const onDidCloseHandlers = this.provider.getServices(collection(IOnTextDocumentDidCloseHandler));
        this.disposables.push(
            ...onDidCloseHandlers.map((handler) => {
                return this.documents.onDidClose((event) => handler.onTextDocumentDidClose(event));
            })
        );
        const onDidSaveHandlers = this.provider.getServices(collection(IOnTextDocumentDidSaveHandler));
        this.disposables.push(
            ...onDidSaveHandlers.map((handler) => {
                return this.documents.onDidSave((event) => handler.onTextDocumentDidSave(event));
            })
        );
        const onDidOpenHandlers = this.provider.getServices(collection(IOnTextDocumentDidOpenHandler));
        this.disposables.push(
            ...onDidOpenHandlers.map((handler) => {
                return this.documents.onDidOpen((event) => handler.onTextDocumentDidOpen(event));
            })
        );
        const onWillSaveHandlers = this.provider.getServices(collection(IOnTextDocumentWillSaveHandler));
        this.disposables.push(
            ...onWillSaveHandlers.map((handler) => {
                return this.documents.onWillSave((event) => handler.onTextDocumentWillSave(event));
            })
        );
        const onWillSaveWaitUntilHandlers = this.provider.getServices(
            collection(IOnTextDocumentWillSaveWaitUntilHandler)
        );
        const notSureIfDisposable: Disposable | void = this.documents.onWillSaveWaitUntil(
            async (params, token) => {
                const results = await Promise.all(
                    onWillSaveWaitUntilHandlers.map((handler) => {
                        return handler.onTextDocumentWillSaveUntil(params, token);
                    })
                );
                // TODO: if multiple handlers return overlapping text edits, what happens?
                return results.filter((result): result is TextEdit[] => !Array.isArray(result)).flat();
            }
        );
        if (isDisposable(notSureIfDisposable)) {
            this.disposables.push(notSureIfDisposable);
        }
        this.disposables.push(this.documents.listen(this.connection));
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
            const contents = await fs.readFile(fsPath, { encoding: "utf-8" });
            const extension = path.extname(fsPath);
            const languageId = fileExtensionToLanguageId[extension] || "plaintext";
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
