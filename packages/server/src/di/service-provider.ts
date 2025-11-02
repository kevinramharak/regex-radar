import {
    Constructor,
    Injectable,
    ServiceCollection,
    ServiceDescriptor,
    ServiceIdentifier,
    ServiceProvider as _ServiceProvider,
    createInterfaceId,
} from '@gitlab/needle';

import { Disposable } from '../util/disposable';

export interface IServiceProvider {
    getRequiredService: _ServiceProvider['getRequiredService'];
    getServices: _ServiceProvider['getServices'];
    createScope: _ServiceProvider['createScope'];
    dispose: _ServiceProvider['dispose'];
}

export const IServiceProvider = createInterfaceId<IServiceProvider>('IServiceProvider');

@Injectable(IServiceProvider, [])
export class ServiceProvider extends Disposable implements IServiceProvider {
    private _serviceProvider: _ServiceProvider | null = null;

    private get serviceProvider(): _ServiceProvider {
        if (!this._serviceProvider) {
            throw new Error('_serviceProvider has to be set, before using the ServiceProvider');
        }
        return this._serviceProvider;
    }

    dispose() {
        super.dispose();
    }

    constructor() {
        super();
    }

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
        this.disposables.push(this._serviceProvider);
    }
}

export function buildServiceProvider(
    collection: ServiceCollection,
    additions: Partial<{
        descriptors: ServiceDescriptor[];
        constructors: Constructor[];
    }> = {},
): IServiceProvider {
    collection.addClass(ServiceProvider);
    additions.descriptors?.forEach((descriptor) => collection.add(descriptor));
    additions.constructors?.forEach((constructor) => collection.addClass(constructor));
    const validationResult = collection.validate();
    if (!validationResult.isValid) {
        throw new AggregateError(
            validationResult.errors,
            'ServiceCollection.validate indicates collection is invalid and cannot be build',
        );
    }
    const _serviceProvider = collection.build();
    const serviceProvider = _serviceProvider.getRequiredService(IServiceProvider);
    (serviceProvider as ServiceProvider).set(_serviceProvider);
    return serviceProvider;
}
