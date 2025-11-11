import js from '@eslint/js';
import packageJson from 'eslint-plugin-package-json';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    {
        ignores: ['**/dist/**', 'fixture/'],
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
    },
    tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
        },
    },
    packageJson.configs.recommended,
    {
        rules: {
            // TODO: consider this
            'package-json/order-properties': 'off',
            'package-json/sort-collections': 'off',
            // not true for vsce packaging
            'package-json/no-redundant-files': 'off',
        },
    },
]);
