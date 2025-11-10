type AnyFn = (...args: any[]) => void;
type TimeoutId = ReturnType<typeof setTimeout>;

export function debounce(delay: number) {
    return <Fn extends AnyFn>(value: AnyFn, context: ClassMethodDecoratorContext) => {
        if (context.kind !== 'method') {
            throw new TypeError('debounce only supports decorating class methods');
        }
        let id: TimeoutId | null = null;
        return function (this: ThisType<typeof value>, ...args: Parameters<typeof value>) {
            const start = performance.now();
            if (id) {
                console.log('delay after: ' + (performance.now() - start).toFixed(1) + 'ms');
                clearTimeout(id);
            }
            id = setTimeout(() => {
                console.log('called after: ' + (performance.now() - start).toFixed(1) + 'ms');
                value.call(this, ...args);
                id = null;
            }, delay);
        };
    };
}
