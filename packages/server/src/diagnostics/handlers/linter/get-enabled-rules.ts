import type { Code } from '.';

import type { LinterRulesConfigurationSchema } from './schema';

export function getEnabledRules(rules: LinterRulesConfigurationSchema): Code[] & string[] {
    return Object.entries(rules)
        .filter(([_, isEnabled]) => isEnabled)
        .map(([name]) => name as Code);
}
