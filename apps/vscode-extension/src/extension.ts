import * as vscode from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";
import * as path from "path";

import * as logger from "./logger";
import { RegexRadarTreeDataProvider } from "./tree-data-provider";

let client: LanguageClient | null = null;

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(logger);
    logger.info("activating");

    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    const treeView = vscode.window.createTreeView("regex-radar", {
        treeDataProvider: new RegexRadarTreeDataProvider(workspaceFolders),
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            // TODO: refresh treeView with new workspace folders
            // @see https://github.com/microsoft/vscode/wiki/Adopting-Multi-Root-Workspace-APIs
        })
    );

    // TODO: figure out how to bundle the server
    const serverModule = context.asAbsolutePath(
        path.join("..", "..", "packages", "server", "dist", "server.js")
    );
    const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
    const serverOptions: ServerOptions = {
        run: {
            module: serverModule,
            transport: TransportKind.ipc,
        },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions,
        },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "typescript" }],
    };

    client = new LanguageClient("regex-radar", "Regex Radar", serverOptions, clientOptions);

    client.start();
}

export function deactivate() {
    logger.info("deactivating");
    if (client) {
        client.stop();
        client = null;
    }
}
