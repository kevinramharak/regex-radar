import { fileURLToPath } from 'node:url';

import { Language, Parser as TreeSitterParser } from 'web-tree-sitter';

import { languageIdToLanguageName } from './language-id-to-language-name.js';

export class TreeSitterParserProvider {
    private cache = new Map<string, Promise<TreeSitterParser>>();
    private treeSitterParserInitializePromise: Promise<void> | null = null;

    async get(languageId: string): Promise<TreeSitterParser> {
        const languageName = languageIdToLanguageName[languageId];
        if (!languageName) {
            throw new TypeError(`no language name found for ${languageId}`);
        }

        const cacheHit = this.cache.get(languageName);
        if (cacheHit) {
            return cacheHit;
        }

        // NOTE: this is intentionally with cached promises, to make sure multiple calls always resolve to the same initialized instances
        const TreeSitterParserPromise = this.getTreeSitterParser();
        const languagePromise = this.getLanguage(languageName);
        const parserPromise = Promise.all([TreeSitterParserPromise, languagePromise]).then(
            ([TreeSitterParser, language]) => {
                const parser = new TreeSitterParser();
                parser.setLanguage(language);
                return parser;
            },
        );

        parserPromise.catch((error) => console.error(error));

        this.cache.set(languageName, parserPromise);
        return await parserPromise;
    }

    private async getTreeSitterParser(): Promise<typeof TreeSitterParser> {
        if (!this.treeSitterParserInitializePromise) {
            this.treeSitterParserInitializePromise = TreeSitterParser.init({
                /**
                 * @see https://www.npmjs.com/package/web-tree-sitter/v/0.25.10#user-content-loading-the-wasm-file
                 */
                locateFile() {
                    const fileUrl = import.meta.resolve('#wasm/tree-sitter.wasm');
                    return fileURLToPath(fileUrl);
                },
            });
            this.treeSitterParserInitializePromise.catch((error) => console.error(error));
        }
        await this.treeSitterParserInitializePromise;
        return TreeSitterParser;
    }

    private async getLanguage(languageName: string): Promise<Language> {
        // NOTE: Parser.init() has to be done, before we can load languages
        //       without it the C ABI has not been loaded or something like that (not really documented either ofcourse)
        await this.treeSitterParserInitializePromise;
        const fileUrl = import.meta.resolve(`#wasm/grammars/tree-sitter-${languageName}.wasm`);
        const filePath = fileURLToPath(fileUrl);
        const languagePromise = Language.load(filePath);
        languagePromise.catch((error) => console.error(error));
        return languagePromise;
    }
}
