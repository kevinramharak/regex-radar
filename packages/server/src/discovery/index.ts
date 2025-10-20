import { createInterfaceId, Disposable, Implements, Injectable } from "@gitlab/needle";
import { IRequestMessageHandler } from "../message-handler";
import { LsConnection } from "../di/external-interfaces";
import { IDocumentsService } from "../documents";
import { EntryType, type DiscoveryResult } from "@regex-radar/lsp-types";
import { buildTreeFromUri, isUriIgnored, cache } from "./build";
import { URI, type TextDocumentChangeEvent } from "vscode-languageserver";
import { IOnTextDocumentDidChange } from "../documents/events";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { ILogger } from "../logger";

interface IDiscoveryService extends IRequestMessageHandler {}

export const IDiscoveryService = createInterfaceId<IDiscoveryService>("IDiscoveryService");

@Implements(IRequestMessageHandler)
@Implements(IOnTextDocumentDidChange)
@Injectable(IDiscoveryService, [IDocumentsService, LsConnection, ILogger])
export class DiscoveryService implements IDiscoveryService, IOnTextDocumentDidChange, Disposable {
    private disposables: Disposable[] = [];

    dispose() {
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    constructor(
        private documentService: IDocumentsService,
        private connection: LsConnection,
        private logger: ILogger
    ) {}

    register(connection: LsConnection): void {
        this.disposables.push(
            connection.onRequest(
                "regexRadar/discovery",
                // TODO: refactor this to a class / service
                async ({ uri, hint }: DiscoveryParams): Promise<DiscoveryResult> => {
                    if (isUriIgnored(uri)) {
                        return null;
                    }
                    // TODO: handle parse errors, send previous result if any
                    const tree = await buildTreeFromUri(uri, this.documentService, hint);
                    return tree;
                }
            )
        );
    }

    async onTextDocumentDidChange(event: TextDocumentChangeEvent<TextDocument>): Promise<void> {
        const entry = cache.get(event.document.uri);
        if (!entry || entry.type !== EntryType.File) {
            return;
        }
        cache.delete(event.document.uri);
        // TODO: implement in client
        await this.connection.sendNotification("regexRadar/discovery/didChange", { uri: entry.uri });
    }
}

export type DiscoveryParams = {
    uri: URI;
    hint?: EntryType;
};
