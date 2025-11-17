export interface IDisposable {
    dispose(): void | Promise<void>;
}

export abstract class Disposable implements IDisposable {
    protected disposables: IDisposable[] = [];

    dispose(): void {
        this.disposables.forEach((disposable) => {
            try {
                Promise.resolve(disposable.dispose()).catch(Disposable.onError);
            } catch (error) {
                Disposable.onError(error);
            }
        });
    }

    static dispose(disposables: IDisposable[]): void {
        disposables.forEach((disposable) => {
            try {
                Promise.resolve(disposable.dispose()).catch(Disposable.onError);
            } catch (error) {
                Disposable.onError(error);
            }
        });
    }

    protected static onError(error: unknown) {
        console.error(`error occured while disposing: ${error}`, error);
    }
}
