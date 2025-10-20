import {
    LanguageClient,
    type CancellationToken,
    type LanguageClientOptions,
    type ServerOptions,
} from "vscode-languageclient/node";
import { displayName, name } from "../package.json";
import type { DiscoveryParams, DiscoveryResult } from "@regex-radar/lsp-types";

export class RegexRadarLanguageClient extends LanguageClient {
    constructor(serverOptions: ServerOptions, clientOptions: LanguageClientOptions) {
        super(name, displayName, serverOptions, clientOptions);
    }

    async discovery(param: DiscoveryParams, token?: CancellationToken): Promise<DiscoveryResult> {
        return await this.sendRequest("regexRadar/discovery", param, token);
    }
}
