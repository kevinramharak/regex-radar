import * as path from 'node:path';

import * as vscode from 'vscode';
import { type LanguageClientOptions, type ServerOptions, TransportKind } from 'vscode-languageclient/node';

import { RegexRadarLanguageClient } from '@regex-radar/client';

let client: RegexRadarLanguageClient | null = null;

export async function registerLanguageClient(
    context: vscode.ExtensionContext,
): Promise<RegexRadarLanguageClient> {
    if (client) {
        return client;
    }

    client = createLanguageClient(context);
    await client.start();

    context.subscriptions.push(client);

    return client;
}

function createLanguageClient(context: vscode.ExtensionContext): RegexRadarLanguageClient {
    // TODO: figure out how to bundle the server, as part of the extension
    const serverModule = context.asAbsolutePath(
        path.join('..', '..', 'packages', 'server', 'dist', 'index.cjs'),
    );
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009', '--inspect-brk'] };
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

    return new RegexRadarLanguageClient(serverOptions, {});
}
