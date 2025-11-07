import type { URI, Range } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import {
    type Node,
    type QueryCapture,
    type QueryMatch,
    Query as TreeSitterQuery,
    type Parser as TreeSitterParser,
} from 'web-tree-sitter';

import { RegexMatch, RegexMatchType } from '@regex-radar/lsp-types';

import { languageIdToLanguageName } from './language-id-to-language-name.js';
import jsRegexDirectiveQuery from './queries/js/regex-directive.scm';
import jsRegexQuery from './queries/js/regex.scm';

const jsQueries = [jsRegexQuery, jsRegexDirectiveQuery];

/**
 * Use the VSCode Tree Sitter Query extension, it is super helpful
 * @see https://marketplace.visualstudio.com/items?itemName=jrieken.vscode-tree-sitter-query
 */
const queries: Record<string, string[]> = {
    javascript: jsQueries,
    typescript: jsQueries,
    tsx: jsQueries,
};

export class Parser implements IParser {
    constructor(private parser: TreeSitterParser) {
        if (!parser.language) {
            throw new TypeError('expected parser to have a language set');
        }
    }

    /**
     * TODO: cache the tree's, update onDocumentDidUpdate, or FS event
     */
    parse(document: TextDocument): ParseResult {
        const text = document.getText();
        // NOTE: needed because for some reason, tree-sitter-typescript does not set its language name
        const languageName = this.parser.language!.name! || languageIdToLanguageName[document.languageId];
        const querySources = queries[languageName];
        if (!querySources) {
            console.warn(
                `no querySource for language.name: ${this.parser.language?.name} (document.languageId : ${document.languageId})`,
            );
            return {
                matches: [],
                uri: document.uri,
            };
        }
        const matches = querySources.flatMap((source) => {
            const query = new TreeSitterQuery(this.parser.language!, source);
            const tree = this.parser.parse(text, null, {})!;
            const matches = query.matches(tree.rootNode, {});
            return matches;
        });
        return {
            matches: createRegexMatchCollection(matches),
            uri: document.uri,
        };
    }
}

function createRegexMatchCollection(matches: QueryMatch[]): RegexMatch[] {
    return matches.reduce((results, match) => {
        const type = getRegexMatchType(match);
        switch (type) {
            case RegexMatchType.Unknown: {
                break;
            }
            case RegexMatchType.Constructor:
            case RegexMatchType.Function:
            case RegexMatchType.Literal: {
                const regex = getNamedCapture(match, 'regex')!;
                const pattern = getNamedCaptures(match, 'regex.pattern')!;
                const flags = getNamedCapture(match, 'regex.flags');
                results.push({
                    type,
                    pattern: pattern.map((capture) => capture.node.text).join(''),
                    flags: flags?.node.text ?? '',
                    range: createRangeFromNode(regex.node),
                });
                break;
            }
            case RegexMatchType.String: {
                const regex = getNamedCapture(match, 'regex')!;
                const pattern = getNamedCaptures(match, 'regex.pattern')!;
                results.push({
                    type,
                    pattern: pattern.map((capture) => capture.node.text).join(''),
                    range: createRangeFromNode(regex.node),
                });
            }
        }
        return results;
    }, [] as RegexMatch[]);
}

function getRegexMatchType(match: QueryMatch): RegexMatchType {
    // Would like to use `#set regex.type "function"`
    // But that does not work as expected
    // see: https://github.com/tree-sitter/tree-sitter/issues/1584#issuecomment-1013513454
    // and: https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/src/query.ts#L409C10-L409C27
    if (getNamedCapture(match, 'regex.literal')) {
        return RegexMatchType.Literal;
    }
    if (getNamedCapture(match, 'regex.constructor')) {
        return RegexMatchType.Constructor;
    }
    if (getNamedCapture(match, 'regex.function')) {
        return RegexMatchType.Function;
    }
    if (getNamedCapture(match, 'regex.string')) {
        return RegexMatchType.String;
    }
    return RegexMatchType.Unknown;
}

function createRangeFromNode(node: Node): Range {
    return {
        start: {
            line: node.startPosition.row,
            character: node.startPosition.column,
        },
        end: {
            line: node.endPosition.row,
            character: node.endPosition.column,
        },
    };
}

function getNamedCapture(match: QueryMatch, name: string): QueryCapture | null {
    return match.captures.find((capture) => capture.name === name) ?? null;
}

function getNamedCaptures(match: QueryMatch, name: string): QueryCapture[] {
    return match.captures.filter((capture) => capture.name === name);
}

export interface IParser {
    parse(document: TextDocument): Promise<ParseResult> | ParseResult;
}

export interface ParseResult {
    uri: URI;
    matches: RegexMatch[];
}
