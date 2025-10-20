import { collection, createInterfaceId, Disposable, Injectable } from "@gitlab/needle";
import { LsConnection } from "./di/external-interfaces";
import { IServiceProvider } from "./di";

export interface IRequestMessageHandler {
    register(connection: LsConnection): void;
}

export const IRequestMessageHandler = createInterfaceId<IRequestMessageHandler>("IRequestMessageHandler");

export interface INotificationMessageHandler {
    register(connection: LsConnection): void;
}

export const INotificationMessageHandler = createInterfaceId<INotificationMessageHandler>(
    "INotificationMessageHandler"
);

export interface IMessageHandler {
    register(): void;
}

export const IMessageHandler = createInterfaceId<IMessageHandler>("IMessageHandler");

@Injectable(IMessageHandler, [LsConnection, IServiceProvider])
export class MessageHandler implements IMessageHandler, Disposable {
    private disposables: Disposable[] = [];

    dispose() {
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    constructor(
        private connection: LsConnection,
        private provider: IServiceProvider
    ) {}

    register() {
        const requestHandlers = this.provider.getServices(collection(IRequestMessageHandler));
        const notificationHandlers = this.provider.getServices(collection(INotificationMessageHandler));
        const unique = new Set([...requestHandlers, ...notificationHandlers]);
        unique.forEach((handler) => handler.register(this.connection));
    }
}
