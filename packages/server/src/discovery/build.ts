import * as fs from "fs/promises";
import * as path from "path";

import { URI } from "vscode-uri";
import { URI as Uri, Location } from "vscode-languageserver";

import {
    Entry,
    EntryType,
    DirectoryEntry,
    FileEntry,
    RegexEntry,
    WorkspaceEntry,
} from "@regex-radar/lsp-types";

import { parseJs } from "../parse/parseJs";
import { ParseResult } from "../parse/ParseResult";
import { IDocumentsService } from "../documents";

const cache = new Map<Uri, Exclude<Entry, RegexEntry>>();

// TODO: implement this with some kind of .ignore configuration
const ALWAYS_IGNORE = ["node_modules", ".git", ".github", ".turbo", ".vscode", ".vscode-test", "dist", "out"];

/**
 * Returns `true` if the given `uri` is ignored.
 */
export function isUriIgnored(uri: Uri): boolean {
    const fsPath = URI.parse(uri).fsPath;
    return isFsPathIgnored(fsPath);
}

/**
 * Returns `true` if the given `fsPath` is ignored.
 */
function isFsPathIgnored(fsPath: string): boolean {
    const dirname = path.basename(fsPath);
    if (ALWAYS_IGNORE.includes(dirname)) {
        return true;
    }
    const pathContainsIgnoredDirectory = !!ALWAYS_IGNORE.find((ignore) =>
        fsPath.includes(`${path.sep}${ignore}${path.sep}`)
    );
    return pathContainsIgnoredDirectory;
}

// TODO: implement this through configuration (partially)
const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

/**
 * Returns `true` if the given `uri` can be parsed for regexes, `false` if otherwise.
 */
export function isUriSupported(uri: Uri): boolean {
    const fsPath = URI.parse(uri).fsPath;
    return isFsPathSupported(fsPath);
}

/**
 * Returns `true` if the given `fsPath` can be parsed for regexes, `false` if otherwise.
 */
function isFsPathSupported(fsPath: string): boolean {
    const extension = path.extname(fsPath);
    const result = SUPPORTED_EXTENSIONS.includes(extension);
    return result;
}

export async function buildTreeFromUri(
    uri: Uri,
    documents: IDocumentsService,
    hint?: EntryType
): Promise<Entry | null> {
    const memo = cache.get(uri);
    if (memo) {
        if (!hint || hint === memo.type) {
            return memo;
        }
    }
    if (hint) {
        switch (hint) {
            case EntryType.Workspace:
                return buildTreeFromWorkspace(uri, documents);
            case EntryType.Directory:
                return buildTreeFromDirectory(uri, documents);
            case EntryType.File:
                return buildTreeFromFile(uri, documents);
            case EntryType.Regex:
                return null;
        }
    }
    const fsPath = URI.parse(uri).fsPath;
    const stat = await fs.stat(fsPath);
    if (stat.isFile()) {
        return buildTreeFromFile(uri, documents);
    } else if (stat.isDirectory()) {
        return buildTreeFromDirectory(uri, documents);
    }
    return null;
}

async function buildTreeFromWorkspace(uri: string, documents: IDocumentsService): Promise<WorkspaceEntry> {
    const uriAsString = uri.toString();
    const memo = cache.get(uriAsString);
    if (memo && memo.type === EntryType.Workspace) {
        return memo;
    }
    const result = await buildTreeFromDirectory(uri, documents);
    cache.set(uriAsString, result);
    return {
        ...result,
        type: EntryType.Workspace,
    };
}

async function buildTreeFromDirectory(
    uri: string | URI,
    documents: IDocumentsService,
    parentUri?: string
): Promise<DirectoryEntry> {
    const uriAsString = uri.toString();
    const memo = cache.get(uriAsString);
    if (memo && memo.type === EntryType.Directory) {
        return memo;
    }
    uri = typeof uri === "string" ? URI.parse(uri) : uri;
    const fsPath = uri.fsPath;
    const entries = await fs.readdir(fsPath, { withFileTypes: true });
    const children = (
        await Promise.all(
            entries.map((entry) => {
                if (entry.isFile()) {
                    const entryPath = path.join(fsPath, entry.name);
                    if (isFsPathIgnored(entryPath) || !isFsPathSupported(entryPath)) {
                        return null;
                    }
                    const uri = URI.file(entryPath);
                    return buildTreeFromFile(uri.toString(), documents, uriAsString);
                } else if (entry.isDirectory()) {
                    const entryPath = path.join(fsPath, entry.name);
                    if (isFsPathIgnored(entryPath)) {
                        return null;
                    }
                    const uri = URI.file(entryPath);
                    return buildTreeFromDirectory(uri, documents, uriAsString);
                }
            })
        )
    ).filter((child) => child != null);
    const result: DirectoryEntry = {
        uri: uri.toString(),
        parentUri,
        type: EntryType.Directory,
        children,
    };
    cache.set(uriAsString, result);
    return result;
}

/**
 * Should only be called on paths that are supported
 * @see isUriSupported
 */
async function buildTreeFromFile(
    uri: string,
    documents: IDocumentsService,
    parentUri?: string
): Promise<FileEntry> {
    const memo = cache.get(uri);
    if (memo && memo.type === EntryType.File) {
        return memo;
    }
    const document = await documents.get(uri);
    const parseResult = parseJs(document);
    const result: FileEntry = {
        uri: uri.toString(),
        parentUri,
        type: EntryType.File,
        children: parseResult.regexes.map((regex) => createRegexEntry(regex, uri)),
    };
    cache.set(uri, result);
    return result;
}

function createRegexEntry(regex: ParseResult["regexes"][number], uri: string): RegexEntry {
    return {
        type: EntryType.Regex,
        location: Location.create(uri, regex.node.range),
        info: {
            pattern: regex.pattern,
            flags: regex.flags,
            // TODO: model this properly
            isDynamic: regex.pattern === "<dynamic>",
        },
    };
}

function deeplyContainsRegexEntry(entry: Entry): boolean {
    if (entry.type === EntryType.Regex) {
        return false;
    }
    if (entry.type === EntryType.File) {
        return entry.children.length > 0;
    }
    return !!entry.children.find((child) => deeplyContainsRegexEntry(child));
}
