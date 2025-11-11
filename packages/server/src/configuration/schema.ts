import { type ClientCapabilities, type InitializeParams } from 'vscode-languageserver';

import {
    defaultDiagnosticsConfigurationSchema,
    type DiagnosticsConfigurationSchema,
} from '../diagnostics/schema';
import { defaultDiscoveryConfigurationSchema, type DiscoveryConfigurationSchema } from '../discovery/schema';

export interface ConfigurationSchema extends ConfigurationSchemaClient, ConfigurationSchemaServer {}

export interface ConfigurationSchemaClient {
    'client.capabilities': ClientCapabilities;
    'client.info': NonNullable<InitializeParams['clientInfo']> | null;
    'client.locale': NonNullable<InitializeParams['locale']> | null;
    'client.process.id': InitializeParams['processId'];
    'client.trace': NonNullable<InitializeParams['trace']>;
    'client.workspace.folders': NonNullable<InitializeParams['workspaceFolders']>;
}

const defaultConfigurationSchemaClient: ConfigurationSchemaClient = {
    'client.capabilities': {},
    'client.info': null,
    'client.locale': null,
    'client.process.id': null,
    'client.trace': 'off',
    'client.workspace.folders': [],
};

type Language = 'javascript' | 'typescript';

export interface ConfigurationSchemaServer {
    'regex-radar.discovery': DiscoveryConfigurationSchema;
    'regex-radar.diagnostics': DiagnosticsConfigurationSchema;
    'regex-radar.languages': Language[];
}

const defaultConfigurationSchemaServer: ConfigurationSchemaServer = {
    'regex-radar.discovery': defaultDiscoveryConfigurationSchema,
    'regex-radar.diagnostics': defaultDiagnosticsConfigurationSchema,
    'regex-radar.languages': ['javascript', 'typescript'],
};

export const defaultConfigurationSchema: ConfigurationSchema = {
    ...defaultConfigurationSchemaClient,
    ...defaultConfigurationSchemaServer,
};
