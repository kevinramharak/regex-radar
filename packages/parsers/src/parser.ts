import type { Range, URI } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";

import type { Node, QueryCapture, QueryMatch } from "web-tree-sitter";

import { TreeSitterQuery, type TreeSitterParser } from "./web-tree-sitter";
import { languageIdToLanguageName } from "./language-id-to-language-name.js";

/**
 * Use the VSCode Tree Sitter Query extension, it is super helpful
 * @see https://marketplace.visualstudio.com/items?itemName=jrieken.vscode-tree-sitter-query
 */
const queries: Record<string, string> = {
    javascript: `(regex
  pattern: (regex_pattern) @regex.pattern
  flags: (regex_flags)? @regex.flags
) @regex`,
    typescript: `(regex
  pattern: (regex_pattern) @regex.pattern
  flags: (regex_flags)? @regex.flags
) @regex`,
    tsx: `(regex
  pattern: (regex_pattern) @regex.pattern
  flags: (regex_flags)? @regex.flags
) @regex`,
};

export class Parser implements IParser {
    constructor(private parser: TreeSitterParser) {
        if (!parser.language) {
            throw new TypeError("expected parser to have a language set");
        }
    }

    parse(document: TextDocument): ParseResult {
        const text = document.getText();
        // NOTE: needed because for some reason, tree-sitter-typescript does not set its language name
        const languageName = this.parser.language!.name! || languageIdToLanguageName[document.languageId];
        const querySource = queries[languageName];
        if (!querySource) {
            console.warn(
                `no querySource for language.name: ${this.parser.language?.name} (document.languageId : ${document.languageId})`
            );
            return {
                regexes: [],
                uri: document.uri,
            };
        }
        const query = new TreeSitterQuery(this.parser.language!, querySource);
        const tree = this.parser.parse(text, null, {})!;
        const cursor = tree.walk();
        const matches = query.matches(cursor.currentNode);
        return {
            regexes: matches.reduce((results, match) => {
                const regex = getNamedCapture(match, "regex")!;
                const pattern = getNamedCapture(match, "regex.pattern")!;
                const flags = getNamedCapture(match, "regex.pattern");
                if (pattern) {
                    results.push({
                        pattern: pattern.node.text,
                        flags: flags?.node.text ?? "",
                        range: createRangeFromNode(regex.node),
                    });
                }
                return results;
            }, [] as RegexMatch[]),
            uri: document.uri,
        };
    }
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

export interface IParser {
    parse(document: TextDocument): Promise<ParseResult> | ParseResult;
}

export interface ParseResult {
    uri: URI;
    regexes: RegexMatch[];
}

export interface RegexMatch {
    pattern: string;
    flags: string;
    range: Range;
}
