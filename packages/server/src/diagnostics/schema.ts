import { defaultLinterConfiguration, type LinterConfigurationSchema } from './handlers/linter/schema';
import { defaultRedosConfiguration, type RedosConfigurationSchema } from './handlers/redos/schema';

export interface DiagnosticsConfigurationSchema {
    linter: LinterConfigurationSchema;
    redos: RedosConfigurationSchema;
}

export const defaultDiagnosticsConfigurationSchema: DiagnosticsConfigurationSchema = {
    linter: defaultLinterConfiguration,
    redos: defaultRedosConfiguration,
};
