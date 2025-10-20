import { createInterfaceId, Implements, Injectable, type Disposable } from "@gitlab/needle";
import { LsConnection } from "./di";

export interface ILogger {
    debug(message: string): void;
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export const ILogger = createInterfaceId<ILogger>("ILogger");

@Injectable(ILogger, [LsConnection])
export class Logger implements ILogger, Disposable {
    constructor(private readonly connection: LsConnection) {}

    dispose(): void {
        return;
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
