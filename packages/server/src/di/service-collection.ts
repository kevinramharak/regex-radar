import { ServiceCollection, createInstanceDescriptor } from '@gitlab/needle';

import { LsConnection, LsTextDocuments } from './external-interfaces';

export interface ServiceCollectionExternals {
    connection: LsConnection;
    documents: LsTextDocuments;
}

export function createServiceCollection(externals: ServiceCollectionExternals): ServiceCollection {
    const { connection, documents } = externals;
    return new ServiceCollection()
        .add(
            createInstanceDescriptor({
                instance: connection,
                aliases: [LsConnection],
            }),
        )
        .add(
            createInstanceDescriptor({
                instance: documents,
                aliases: [LsTextDocuments],
            }),
        );
}
