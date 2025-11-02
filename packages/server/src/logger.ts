import { Injectable, createInterfaceId } from '@gitlab/needle';

import { LsConnection } from './di';
import { Disposable } from './util/disposable';

export interface ILogger {
    debug(message: string): void;
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export const ILogger = createInterfaceId<ILogger>('ILogger');

/**
 * The `Logger` will log messages over the LSP back to the client.
 * TODO: enable logging on server side as well.
 */
@Injectable(ILogger, [LsConnection])
export class Logger extends Disposable implements ILogger {
    constructor(private readonly connection: LsConnection) {
        super();
    }

    debug(message: string): void {
        this.connection.console.debug(message);
    }

    log(message: string): void {
        this.connection.console.log(message);
    }

    info(message: string): void {
        this.connection.console.info(message);
    }

    warn(message: string): void {
        this.connection.console.warn(message);
    }

    error(message: string): void {
        this.connection.console.error(message);
    }
}
