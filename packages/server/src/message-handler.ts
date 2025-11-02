import { Injectable, collection, createInterfaceId } from '@gitlab/needle';

import { IServiceProvider } from './di';
import { LsConnection } from './di/external-interfaces';
import { Disposable } from './util/disposable';

export interface IRequestMessageHandler {
    register(connection: LsConnection): void;
}

export const IRequestMessageHandler = createInterfaceId<IRequestMessageHandler>('IRequestMessageHandler');

export interface INotificationMessageHandler {
    register(connection: LsConnection): void;
}

export const INotificationMessageHandler = createInterfaceId<INotificationMessageHandler>(
    'INotificationMessageHandler',
);

export interface IMessageHandler {
    register(): void;
}

export const IMessageHandler = createInterfaceId<IMessageHandler>('IMessageHandler');

/**
 * The `MessageHandler` is a singleton that allows `IRequestMessageHandler` and `INotificationMessageHandler` implementations to register their message handlers
 * TODO: don't use a `register(connection) { ... }` callback, but handle the registration for implementations instead, probably like `LifecycleHandler`
 */
@Injectable(IMessageHandler, [LsConnection, IServiceProvider])
export class MessageHandler extends Disposable implements IMessageHandler {
    constructor(
        private connection: LsConnection,
        private provider: IServiceProvider,
    ) {
        super();
    }

    register() {
        const requestHandlers = this.provider.getServices(collection(IRequestMessageHandler));
        const notificationHandlers = this.provider.getServices(collection(INotificationMessageHandler));
        const unique = new Set([...requestHandlers, ...notificationHandlers]);
        unique.forEach((handler) => handler.register(this.connection));
    }
}
