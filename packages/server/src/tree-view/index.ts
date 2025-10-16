import { Connection, TextDocuments } from "vscode-languageserver";
import { URI } from "vscode-uri";
import * as fs from "fs/promises";
import * as path from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import { parseJs } from "../parse/parseJs";
import { uriToDocument } from "../documents";

enum EntryType {
    Uknown,
    Workspace,
    Directory,
    File,
    Regex,
}

export function registerTreeViewHandlers(connection: Connection, documents: TextDocuments<TextDocument>) {
    connection.onRequest(
        "regexRadar/getTreeViewChildren",
        async ({ uri, type }: { uri: string; type: EntryType }) => {
            switch (type) {
                case EntryType.Workspace: {
                    return buildTreeFromWorkspace(uri, documents);
                }
                case EntryType.Directory: {
                    return buildTreeFromDirectory(uri, documents);
                }
                case EntryType.File: {
                    return buildTreeFromFile(uri, documents);
                }
                default: {
                    return [];
                }
            }
        }
    );
}

type TreeEntry = DirectoryEntry | FileEntry;

type WorkspaceEntry = {
    uri: string;
    type: EntryType.Workspace;
    children: TreeEntry[];
};

type DirectoryEntry = {
    uri: string;
    type: EntryType.Directory;
    children: TreeEntry[];
};

type FileEntry = {
    uri: string;
    type: EntryType.File;
    children: RegexEntry[];
};

type RegexEntry = {
    uri: string;
    type: EntryType.Regex;
    pattern: string;
    flags: string;
};

const cache = new Map<string, TreeEntry>();

async function buildTreeFromWorkspace(
    uri: string | URI,
    documents: TextDocuments<TextDocument>
): Promise<WorkspaceEntry> {
    const result = await buildTreeFromDirectory(uri, documents);
    return {
        ...result,
        type: EntryType.Workspace,
    };
}

async function buildTreeFromDirectory(
    uri: string | URI,
    documents: TextDocuments<TextDocument>
): Promise<DirectoryEntry> {
    uri = typeof uri === "string" ? URI.parse(uri) : uri;
    const fsPath = uri.fsPath;
    const entries = await fs.readdir(fsPath, { withFileTypes: true });
    const children = (
        await Promise.all(
            entries.map((entry) => {
                if (entry.isFile()) {
                    const entryPath = path.join(fsPath, entry.name);
                    const uri = URI.file(entryPath);
                    return buildTreeFromFile(uri, documents);
                } else if (entry.isDirectory()) {
                    const entryPath = path.join(fsPath, entry.name);
                    const uri = URI.file(entryPath);
                    return buildTreeFromDirectory(uri, documents);
                }
            })
        )
    ).filter((child) => child != null);
    return {
        uri: uri.toString(),
        type: EntryType.Directory,
        children,
    };
}

async function buildTreeFromFile(
    uri: string | URI,
    documents: TextDocuments<TextDocument>
): Promise<FileEntry> {
    const document = await uriToDocument(uri.toString(), documents);
    const parseResult = parseJs(document);
    return {
        uri: uri.toString(),
        type: EntryType.File,
        children: parseResult.regexes.map((entry) => {
            uri = typeof uri === "string" ? URI.parse(uri) : uri;
            uri = uri.with({ fragment: `${entry.node.range.start},${entry.node.range.end}` });
            return {
                uri: uri.toString(),
                type: EntryType.Regex,
                pattern: entry.pattern,
                flags: entry.flags,
                range: entry.node.range,
            };
        }),
    };
}
