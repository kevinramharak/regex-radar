import { defaultLinterConfiguration, type LinterConfigurationSchema } from './handlers/linter/schema';

type Language = 'javascript' | 'typescript';

export interface DiagnosticsConfigurationSchema {
    languages: Language[];
    linter: LinterConfigurationSchema;
}

export const defaultDiagnosticsConfigurationSchema: DiagnosticsConfigurationSchema = {
    languages: ['javascript', 'typescript'],
    linter: defaultLinterConfiguration,
};
