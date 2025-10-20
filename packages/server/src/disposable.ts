interface IDisposable {
    dispose(): void | Promise<void>;
}

// TODO: maybe use this, and use `try {} catch {}` / `.catch()` to make sure disposables always run properly
abstract class Disposable implements IDisposable {
    private disposables: IDisposable[] = [];

    dispose(): void {}
}

export {};
