import { Injectable, createInterfaceId } from '@gitlab/needle';

import { IParser, Parser, TreeSitterParserProvider } from '@regex-radar/tree-sitter';

import { IServiceProvider } from '../di';

type LanguageID = string;

export interface IParserProvider {
    get(languageId: LanguageID): Promise<IParser>;
}

export const IParserProvider = createInterfaceId<IParserProvider>('IParserProvider');

// TODO: remove this class, replace it with TreeSitterParserProvider
@Injectable(IParserProvider, [IServiceProvider])
export class ParserProvider implements IParserProvider {
    private parsers = new TreeSitterParserProvider();

    constructor(private provider: IServiceProvider) {}

    async get(languageId: LanguageID): Promise<IParser> {
        const parser = await this.createParser(languageId);
        return parser;
    }

    private async createParser(languageId: LanguageID): Promise<IParser> {
        switch (languageId) {
            case 'javascript':
            case 'javascriptreact':
            case 'typescript':
            case 'typescriptreact': {
                const parser = await this.parsers.get(languageId);
                return new Parser(parser);
            }
            case 'json':
            default: {
                throw new TypeError(`language ID: ${languageId} is not supported`);
            }
        }
    }
}
