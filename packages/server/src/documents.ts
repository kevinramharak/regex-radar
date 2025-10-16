import { readFile } from "fs/promises";
import { Connection, TextDocuments } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

export function registerDocumentsHandlers(connection: Connection, documents: TextDocuments<TextDocument>) {
    documents.onDidChangeContent(async (event) => {
        connection.console.info(`onDidChangeContent for: ${event.document.uri}`);
    });

    documents.onDidOpen(async (event) => {
        connection.console.info(`onDidOpen for: ${event.document.uri}`);
    });

    documents.listen(connection);
}

export async function uriToDocument(
    uri: string,
    documents: TextDocuments<TextDocument>
): Promise<TextDocument> {
    let document = documents.get(uri);
    if (!document) {
        const contents = await readFile(URI.parse(uri).fsPath, { encoding: "utf8" });
        document = TextDocument.create(uri, "ts", 0, contents);
    }
    return document;
}
