// TODO: maybe more rules like: https://ota-meshi.github.io/eslint-plugin-regexp/rules/
// TODO: boolean + severity
export interface LinterRulesConfigurationSchema {
    /**
     * @see https://eslint.org/docs/latest/rules/no-control-regex
     */
    'no-control-regex': boolean;
    /**
     * @see https://eslint.org/docs/latest/rules/no-invalid-regexp
     */
    'no-invalid-regexp': boolean;
    /**
     * @see https://eslint.org/docs/latest/rules/no-regex-spaces
     */
    'no-regex-spaces': boolean;
    /**
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp#return_value
     */
    'prefer-regex-new-expression': boolean;
    /**
     * @see https://eslint.org/docs/latest/rules/prefer-regex-literals
     */
    'prefer-regex-literals': boolean;
}

export interface LinterConfigurationSchema {
    enabled: boolean;
    rules: LinterRulesConfigurationSchema;
}

export const defaultLinterConfiguration: LinterConfigurationSchema = {
    enabled: true,
    rules: {
        'no-control-regex': true,
        'no-invalid-regexp': true,
        'no-regex-spaces': true,
        'prefer-regex-literals': true,
        'prefer-regex-new-expression': true,
    },
};
