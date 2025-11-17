import type {
    CancellationToken,
    ResultProgressReporter,
    WorkDoneProgressReporter,
} from 'vscode-languageserver';

import type { ILogger } from '../logger';

import { resultOrCancellation } from './cancellation-promise';
import type { MaybePromise } from './maybe-promise';

/**
 * A helper function to run a collection of event handlers that all return a `MaybePromise<T[]>`.
 * The results will be collected, until either all async handlers are done or a token cancellation was requested.
 *
 * TODO: maybe use object params, instead of 5 parameters
 *
 * @param handlers
 * @param token
 * @param workDone
 * @param progress
 * @param logger
 * @returns
 */
export async function runHandlers<T>(
    handlers: (() => MaybePromise<T[]>)[],
    token?: CancellationToken,
    _workDone?: WorkDoneProgressReporter,
    _progress?: ResultProgressReporter<T[]>,
    logger?: Pick<ILogger, 'thrown' | 'trace'>,
): Promise<T[]> {
    const results: T[] = [];
    const pending: Promise<T[]>[] = [];

    // TODO: use work done progress reporter?
    for (const handler of handlers) {
        if (token?.isCancellationRequested) {
            break;
        }
        try {
            const result = handler();
            if (result instanceof Promise) {
                // TODO: use result progress reporter?
                pending.push(result);
            } else {
                results.push(...result);
            }
        } catch (error) {
            logger?.thrown(error);
        }
    }

    if (pending.length > 0 && !token?.isCancellationRequested) {
        const result = await resultOrCancellation(Promise.allSettled(pending), token);
        if (Array.isArray(result)) {
            for (const promise of result) {
                if (promise.status === 'fulfilled') {
                    results.push(...promise.value);
                } else {
                    logger?.thrown(promise.reason);
                }
            }
        } else {
            logger?.trace(`cancellation was requested`);
        }
    }

    return results;
}
