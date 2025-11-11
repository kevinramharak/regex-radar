import type { CancellationToken } from 'vscode-languageserver';

import { Injectable, createInterfaceId } from '@gitlab/needle';

// TODO: fix these .d.ts files
import * as backend from '@local/recheck/core/backend/thread-worker';
import { createCheck } from '@local/recheck/core/builder';
import { type Diagnostics as RecheckDiagnostics, type check } from 'recheck';

import { ILogger } from '../logger';

type CheckParam = {
    pattern: string;
    flags?: string;
};

type QueueParam = CheckParam & {
    token?: CancellationToken;
};

type CheckResult =
    | { sync: true; diagnostics: RecheckDiagnostics }
    | { sync: false; promise: Promise<RecheckDiagnostics> };

export interface IRedosCheckService {
    check(param: CheckParam): CheckResult;
    queue(param: QueueParam): Promise<RecheckDiagnostics>;
}

export const IRedosCheckService = createInterfaceId<IRedosCheckService>('IRedosCheckService');

// TODO: runtime, scala jvm, scala.js, webworker?
// TODO: event emitter, push diagnostics

@Injectable(IRedosCheckService, [ILogger])
export class RedosCheckService implements IRedosCheckService {
    /**
     * Use a queue to only have a single check running at a time
     */
    private pending: Promise<unknown> = Promise.resolve();
    /**
     * TODO: LRU cache, persistent cache between sessions.
     */
    private cache = new Map<string, RecheckDiagnostics>();

    constructor(private readonly logger: ILogger) {}

    check(param: CheckParam): CheckResult {
        const diagnostics = this.cache.get(`/${param.pattern}/${param.flags}`);
        if (diagnostics) {
            return {
                sync: true,
                diagnostics,
            };
        } else {
            return {
                sync: false,
                promise: this.queue(param),
            };
        }
    }

    private _check: typeof check | undefined;
    private async getCheck(): Promise<typeof check> {
        if (!this._check) {
            const workerPath = import.meta.resolve('#workers/recheck/thread.worker');
            this._check = await createCheck(backend, workerPath);
        }
        return this._check!;
    }

    private queueId = 0;

    /**
     * TODO: maybe recheck already has a queue, or can do this in parallel anyway?
     *       do we need a queue?
     */
    async queue(param: QueueParam): Promise<RecheckDiagnostics> {
        // update the queue, keep a reference to the promise
        const check = await this.getCheck();
        const promise = ((this.pending as Promise<RecheckDiagnostics>) = this.pending.then(async () => {
            const start = performance.now();
            const result = await check(param.pattern, param.flags ?? '');
            const end = performance.now();
            const duration = end - start;
            this.logger.debug(
                `redos check (${this.queueId++}) '/${param.pattern}/${param.flags ?? ''}' took ${duration.toFixed(2)}ms`,
            );
            this.cache.set(`/${param.pattern}/${param.flags}`, result);
            return result;
        }));
        // return the promise that will eventually resolve to a diagnostics
        return promise;
    }
}
