import {
    LanguageClient,
    type CancellationToken,
    type Disposable,
    type LanguageClientOptions,
    type ServerOptions,
} from "vscode-languageclient/node";
import { displayName, name } from "../package.json";
import type { DiscoveryDidChangeParams, DiscoveryParams, DiscoveryResult } from "@regex-radar/lsp-types";

export class RegexRadarLanguageClient extends LanguageClient implements Disposable {
    private disposables: Disposable[] = [];

    constructor(serverOptions: ServerOptions, clientOptions: LanguageClientOptions) {
        super(name, displayName, serverOptions, clientOptions);
    }

    async discovery(param: DiscoveryParams, token?: CancellationToken): Promise<DiscoveryResult> {
        return await this.sendRequest("regexRadar/discovery", param, token);
    }

    async onDiscoveryDidChange(handler: (param: DiscoveryDidChangeParams) => void | Promise<void>) {
        this.disposables.push(this.onNotification("regexRadar/discovery/didChange", handler));
    }
}
