import { createInterfaceId, Disposable, Implements, Injectable } from "@gitlab/needle";
import { IRequestMessageHandler } from "../message-handler";
import { LsConnection } from "../di/external-interfaces";
import { IDocumentsService } from "../documents";
import { Entry, EntryType } from "@regex-radar/lsp-types";
import { buildTreeFromUri, isUriIgnored } from "./build";
import { URI } from "vscode-languageserver";

interface IDiscoveryService extends IRequestMessageHandler {}

export const IDiscoveryService = createInterfaceId<IDiscoveryService>("");

@Implements(IRequestMessageHandler)
@Injectable(IDiscoveryService, [IDocumentsService])
export class DiscoveryService implements IDiscoveryService, Disposable {
    private disposables: Disposable[] = [];

    dispose() {
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    constructor(private documentService: IDocumentsService) {}

    register(connection: LsConnection): void {
        this.disposables.push(
            connection.onRequest(
                "regexRadar/discovery",
                // TODO: refactor this to a class / service
                async ({ uri, hint }: DiscoveryParams): Promise<Entry | null> => {
                    if (isUriIgnored(uri)) {
                        return null;
                    }
                    return buildTreeFromUri(uri, this.documentService, hint);
                }
            )
        );
    }
}

export type DiscoveryParams = {
    uri: URI;
    hint?: EntryType;
};
