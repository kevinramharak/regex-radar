import { LanguageClient, LanguageClientOptions, ServerOptions, URI } from "vscode-languageclient/node";

import { displayName, name } from "../../package.json";
import { Uri } from "vscode";
import { Element } from "../tree-data-provider/RegexRadarTreeDataProvider";

export class RegexRadarLanguageClient extends LanguageClient {
    constructor(serverOptions: ServerOptions, clientOptions: LanguageClientOptions) {
        super(name, displayName, serverOptions, clientOptions);
    }

    async getTreeViewChildren(uri: Uri, type: Element["type"]): Promise<unknown> {
        return await this.sendRequest("regexRadar/getTreeViewChildren", { uri: uri.toString(), type });
    }
}
