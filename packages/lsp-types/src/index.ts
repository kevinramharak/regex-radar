import * as lsp from "vscode-languageserver-types";

export type DiscoveryParams = {
    uri: lsp.URI;
    hint?: EntryType;
};

export type DiscoveryResult = Entry | null;

export enum EntryType {
    Unknown,
    Workspace,
    Directory,
    File,
    Regex,
}

export type Entry = WorkspaceEntry | DirectoryEntry | FileEntry | RegexEntry;

export type WorkspaceEntry = {
    type: EntryType.Workspace;
    uri: lsp.URI;
    children: (DirectoryEntry | FileEntry)[];
};

export type DirectoryEntry = {
    type: EntryType.Directory;
    uri: lsp.URI;
    parentUri?: lsp.URI;
    children: (DirectoryEntry | FileEntry)[];
};

export type FileEntry = {
    type: EntryType.File;
    uri: lsp.URI;
    parentUri?: lsp.URI;
    children: RegexEntry[];
};

export type RegexEntry = {
    type: EntryType.Regex;
    location: lsp.Location;
    info: {
        pattern: string;
        flags: string;
        isDynamic?: boolean;
    };
};
