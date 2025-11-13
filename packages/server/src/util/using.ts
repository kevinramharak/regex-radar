import { IDisposable, Disposable } from './disposable';

export function using<Disposables extends IDisposable[], R>(
    disposables: Disposables,
    task: (...args: Disposables) => R | Promise<R>,
): R | Promise<R> {
    try {
        const result = task(...disposables);
        if (result instanceof Promise) {
            result.catch(() => Disposable.dispose(disposables));
        }
        return result;
    } finally {
        disposables.forEach((disposable) => disposable.dispose());
    }
}
