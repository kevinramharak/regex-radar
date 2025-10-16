import { NewExpression, Node, parseSync, Program, RegExpLiteral, Visitor } from "oxc-parser";
import { Range, URI } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ParseResult } from "./ParseResult";

const cache = new Map<URI, ParseResult>();

type RegexNode = RegExpLiteral | NewExpression;

function findRegexes(program: Program): RegexNode[] {
    const nodes: RegexNode[] = [];
    const visitor = new Visitor({
        Literal: (node) => {
            if ("regex" in node) {
                nodes.push(node);
            }
        },
        NewExpression: (node) => {
            if (node.callee.type === "Identifier" && node.callee.name === "RegExp") {
                nodes.push(node);
            }
        },
    });
    visitor.visit(program);
    return nodes;
}

function nodeToRange(span: Pick<Node, "start" | "end">, converter: Pick<TextDocument, "positionAt">): Range {
    return Range.create(converter.positionAt(span.start), converter.positionAt(span.end));
}

export function parseJs(document: TextDocument): ParseResult {
    const parseResult = parseSync(document.uri, document.getText(), {
        // TODO: Use `astType` and `lang`?
    });
    const regexes = findRegexes(parseResult.program);
    return {
        uri: document.uri,
        regexes: regexes.map((node) => {
            const pattern = parsePattern(node);
            const flags = parseFlags(node);
            return {
                pattern,
                flags,
                node: {
                    node,
                    range: nodeToRange(node, document),
                },
            };
        }),
    };
}

const DYNAMIC_INDICATOR = "<dynamic>";

function parsePattern(node: RegexNode): string {
    switch (node.type) {
        case "NewExpression": {
            const firstArg = node.arguments[0];
            if (firstArg && firstArg.type === "Literal" && typeof firstArg.value === "string") {
                return firstArg.value;
            }
            return DYNAMIC_INDICATOR;
        }
        case "Literal": {
            return node.regex.pattern;
        }
    }
}

function parseFlags(node: RegexNode): string {
    switch (node.type) {
        case "NewExpression": {
            const secondArg = node.arguments[1];
            if (secondArg) {
                if (secondArg.type === "Literal" && typeof secondArg.value === "string") {
                    return secondArg.value;
                }
                return DYNAMIC_INDICATOR;
            }
            return "";
        }
        case "Literal": {
            return node.regex.flags;
        }
    }
}
