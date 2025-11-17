import * as path from 'node:path';

import { ExtensionContext } from 'vscode';
import type { ServerOptions } from 'vscode-languageclient/node';

import { RegexRadarLanguageClient } from '@regex-radar/client';

let client: RegexRadarLanguageClient | null = null;

export async function registerLanguageClient(context: ExtensionContext): Promise<RegexRadarLanguageClient> {
    if (client) {
        return client;
    }

    client = createLanguageClient(context);
    await client.start();

    if (client.isInDebugMode) {
        client.outputChannel.show(true);
    }

    context.subscriptions.push(client);

    return client;
}

/**
 * Local copy to avoid having to import the whole package
 * TODO: check if tree shaking helps here
 */
const TransportKind: typeof import('vscode-languageclient/node').TransportKind = {
    stdio: 0,
    ipc: 1,
    pipe: 2,
    socket: 3,
} as const;

function createLanguageClient(context: ExtensionContext): RegexRadarLanguageClient {
    const serverModulePath =
        __BUILD_MODE__ === 'production'
            ? path.join('dist/server.min.js')
            : path.join('..', '..', 'packages', 'server', 'dist', 'server.js');
    const serverModule = context.asAbsolutePath(serverModulePath);
    const serverOptions: ServerOptions = {
        run: {
            module: serverModule,
            transport: TransportKind.ipc,
        },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=9229', '--inspect-brk'] },
        },
    };

    return new RegexRadarLanguageClient(serverOptions, {});
}
