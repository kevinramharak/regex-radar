import { Range, URI } from "vscode-languageserver";

export interface ParseResult {
    uri: URI;
    regexes: RegexMatch[];
}

/**
 * The idea is to keep a representation of the AST Node that is easy to work with in vscode
 * while also keeping access to the node that the parser spit out
 */
interface AstNode<Node = unknown> {
    range: Range;
    node: Node;
}

export interface RegexMatch {
    pattern: string;
    flags: string;
    node: AstNode;
}
