import * as vscode from "vscode";
import { type LanguageClientOptions, type ServerOptions, TransportKind } from "vscode-languageclient/node";
import * as path from "path";

import { RegexRadarLanguageClient } from "@regex-radar/client";

let client: RegexRadarLanguageClient | null = null;

export async function registerLanguageClient(
    context: vscode.ExtensionContext
): Promise<RegexRadarLanguageClient> {
    if (client) {
        return client;
    }

    client = createLanguageClient(context);
    await client.start();

    // attempt to stall to allow the debugger to attach to the server process
    if (client.isInDebugMode) {
        const delay = 1000;
        client.outputChannel.show();
        client.debug(`waiting ${delay}ms to let the debugger connect`);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

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
        synchronize: {
            // TODO: figure out if this is required to enable file system watchers on the server side
            fileEvents: vscode.workspace.createFileSystemWatcher(""),
        },
    };
    return new RegexRadarLanguageClient(serverOptions, clientOptions);
}
