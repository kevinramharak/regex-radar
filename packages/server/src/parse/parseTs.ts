import { parseJs } from "./parseJs";
import { ParseResult } from "./ParseResult";
import { TextDocument } from "vscode-languageserver-textdocument";

export function parseTs(document: TextDocument): ParseResult {
    return parseJs(document);
}
