import {
    createInterfaceId,
    ServiceProvider as _ServiceProvider,
    Disposable,
    Injectable,
    ServiceIdentifier,
    ServiceCollection,
    ServiceDescriptor,
    Constructor,
} from "@gitlab/needle";

export interface IServiceProvider {
    getRequiredService: _ServiceProvider["getRequiredService"];
    getServices: _ServiceProvider["getServices"];
    createScope: _ServiceProvider["createScope"];
}

export const IServiceProvider = createInterfaceId<IServiceProvider>("IServiceProvider");

@Injectable(IServiceProvider, [])
export class ServiceProvider implements IServiceProvider, Disposable {
    private _serviceProvider: _ServiceProvider | null = null;

    private get serviceProvider(): _ServiceProvider {
        if (!this._serviceProvider) {
            throw new Error("_serviceProvider has to be set, before using the ServiceProvider methods");
        }
        return this._serviceProvider;
    }

    constructor() {}

    getRequiredService<T>(identifier: ServiceIdentifier<T>): T {
        return this.serviceProvider.getRequiredService(identifier);
    }

    getServices<T>(identifier: ServiceIdentifier<T>): T[] {
        return this.serviceProvider.getServices(identifier);
    }

    createScope(): _ServiceProvider {
        return this.serviceProvider.createScope();
    }

    set(serviceProvider: _ServiceProvider) {
        this._serviceProvider = serviceProvider;
    }

    dispose() {
        if (this._serviceProvider != null) {
            this._serviceProvider.dispose();
            this._serviceProvider = null;
        }
    }
}

export function buildServiceProvider(
    collection: ServiceCollection,
    additions: Partial<{
        descriptors: ServiceDescriptor[];
        constructors: Constructor[];
    }> = {}
): IServiceProvider {
    collection.addClass(ServiceProvider);
    additions.descriptors?.forEach((descriptor) => collection.add(descriptor));
    additions.constructors?.forEach((constructor) => collection.addClass(constructor));
    const validationResult = collection.validate();
    if (!validationResult.isValid) {
        throw new AggregateError(
            validationResult.errors,
            "ServiceCollection.validate indicates collection is invalid and cannot be build"
        );
    }
    const _serviceProvider = collection.build();
    const serviceProvider = _serviceProvider.getRequiredService(IServiceProvider);
    (serviceProvider as ServiceProvider).set(_serviceProvider);
    return serviceProvider;
}
