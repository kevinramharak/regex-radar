import {
    Constructor,
    Injectable,
    ServiceCollection,
    ServiceDescriptor,
    ServiceIdentifier,
    ServiceProvider as _ServiceProvider,
    createInterfaceId,
    type ConstructorServiceDescriptor,
    type FactoryServiceDescriptor,
    type InstanceServiceDescriptor,
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

type DescriptorType = ServiceDescriptor['type'];
const types: DescriptorType[] = ['Constructor', 'Factory', 'Instance'];

export function buildServiceProvider(
    collection: ServiceCollection,
    descriptors: (ServiceDescriptor | Constructor)[],
): IServiceProvider {
    collection.addClass(ServiceProvider);
    descriptors.forEach((descriptor) => {
        if ('type' in descriptor && types.includes(descriptor.type)) {
            collection.add(descriptor);
        } else {
            collection.addClass(descriptor as Constructor);
        }
    });
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
