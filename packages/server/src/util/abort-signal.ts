import type { CancellationToken } from 'vscode-languageserver';

export function createAbortSignal(token: CancellationToken): AbortSignal {
    const controller = new AbortController();
    if (token.isCancellationRequested) {
        controller.abort();
    } else {
        token.onCancellationRequested((e) => controller.abort(e));
    }
    return controller.signal;
}
