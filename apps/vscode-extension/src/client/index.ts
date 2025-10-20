import * as vscode from "vscode";
import { LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient/node";
import * as path from "path";

import { RegexRadarLanguageClient } from "@regex-radar/client";

let client: RegexRadarLanguageClient | null = null;

export function registerLanguageClient(context: vscode.ExtensionContext): RegexRadarLanguageClient {
    if (client) {
        return client;
    }

    client = createLanguageClient(context);
    client.start();

    context.subscriptions.push(client);

    return client;
}

function createLanguageClient(context: vscode.ExtensionContext): RegexRadarLanguageClient {
    // TODO: figure out how to bundle the server, as part of the extension
    const serverModule = context.asAbsolutePath(
        path.join("..", "..", "packages", "server", "dist", "index.cjs")
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
        documentSelector: [{ language: "javascript" }, { language: "typescript" }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher(""),
        },
    };
    return new RegexRadarLanguageClient(serverOptions, clientOptions);
}
