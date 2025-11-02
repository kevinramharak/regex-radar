import { Injectable, createInterfaceId } from '@gitlab/needle';

import { LsConnection } from './di';
import { ILifecycleHandler } from './lifecycle';
import { IMessageHandler } from './message-handler';
import { Disposable } from './util/disposable';

export interface IConnection {
    listen(): void;
}

export const IConnection = createInterfaceId<IConnection>('IConnection');

/**
 * `Connection` is a wrapper over the `LsConnection`/`import('vscode-languageserver').Connection`.
 * It owns the `LsConnection` instance and is responsible for disposing it.
 * It registers the `ILifecycleHandler` and `IMessageHandler` and starts listening on the `connection` when `listen()` is called
 */
@Injectable(IConnection, [LsConnection, ILifecycleHandler, IMessageHandler])
export class Connection extends Disposable implements IConnection {
    constructor(
        private connection: LsConnection,
        private lifecycle: ILifecycleHandler,
        private messages: IMessageHandler,
    ) {
        super();
        this.disposables.push(connection);
    }

    listen(): void {
        this.lifecycle.register();
        this.messages.register();
        this.connection.listen();
    }
}
