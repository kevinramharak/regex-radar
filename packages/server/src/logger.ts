import { Injectable, createInterfaceId } from '@gitlab/needle';

import { LsConnection } from './di';
import { Disposable } from './util/disposable';

export interface ILogger {
    trace(message: string, verbose?: string): void;
    debug(message: string): void;
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    /**
     * Time the duration of the given `task`, and log the message to the given `logFn` defaulting to `debug.
     * The message can use the `$duration` variable, which will be replaced with the duration in `ms`.
     */
    time<R>(message: string, task: Task<R>, logFn?: LogFn): R | Promise<R>;
    thrown(thrown: unknown): void;
}

type Task<R> = () => R | Promise<R>;
type LogFn = ILogger['trace' | 'debug' | 'error' | 'info' | 'log' | 'warn'];

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

    trace(message: string, verbose?: string) {
        this.connection.tracer.log(message, verbose);
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

    time<R>(message: string, task: Task<R>, logFn?: LogFn): R | Promise<R> {
        logFn = logFn ?? this.debug.bind(this);
        const start = performance.now();
        const result = task();
        if (result instanceof Promise) {
            return result.then((fulfilled) => {
                end(logFn);
                return fulfilled;
            });
        } else {
            end(logFn);
            return result;
        }
        function end(logFn: LogFn) {
            const end = performance.now();
            const duration = end - start;
            logFn(message.replace('$duration', duration.toFixed(2)));
        }
    }

    thrown(thrown: unknown, printStackTrace = true): void {
        let error: Error;
        if (thrown == null) {
            error = new Error(`caught thrown nullish value`, { cause: thrown });
        } else if (thrown instanceof Error) {
            error = thrown;
        } else {
            error = new Error(`caught thrown non-Error value`, { cause: thrown });
        }
        const message = this.stringifyError(error, printStackTrace);
        this.error(message);
    }

    private stringifyError(error: Error, addStackTrace: boolean): string {
        let message = `${error.name}: '${error.message}'`;
        if (error.cause) {
            message += `\n  { cause: ${error.cause?.toString() ?? '<no-string-representation>'}}`;
        }
        if (addStackTrace && error.stack) {
            message += `\n${error.stack}`;
        }
        return message;
    }
}
