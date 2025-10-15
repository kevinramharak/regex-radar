import * as vscode from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";
import * as path from "path";

let client: LanguageClient | null = null;

export function registerLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    if (client) {
        return client;
    }

    // TODO: figure out how to bundle the server
    client = createLanguageClient(context);
    client.start();

    context.subscriptions.push(client);

    return client;
}

export function getLanguageClient(): LanguageClient {
    if (!client) {
        throw new Error("language client is not registered yet");
    }
    return client;
}

function createLanguageClient(context: vscode.ExtensionContext): LanguageClient {
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

    const clientOptions: LanguageClientOptions = {};
    return new LanguageClient("regex-radar", "Regex Radar", serverOptions, clientOptions);
}
