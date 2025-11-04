import type * as lsp from 'vscode-languageserver-types';

export type DiscoveryParams<T extends EntryType = EntryType> = {
    uri: lsp.URI;
    hint?: T;
};

export type DiscoveryResult<T extends EntryType = EntryType> = (Entry & { type: T }) | null;

export type DiscoveryDidChangeParams = {
    uri: lsp.URI;
};

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
    parentUri?: never;
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
    match: RegexMatch;
};

export type RegexMatch = RegexMatchLiteral | RegexMatchConstructor | RegexMatchFunction | RegexMatchString;

export enum RegexMatchType {
    Unknown = 0,
    Literal = 1,
    Constructor = 2,
    Function = 3,
    String = 4,
}

interface RegexMatchBase {
    type: RegexMatchType;
    range: lsp.Range;
}

export interface RegexMatchLiteral extends RegexMatchBase {
    type: RegexMatchType.Literal;
    pattern: string;
    flags: string;
}

export interface RegexMatchConstructor extends RegexMatchBase {
    type: RegexMatchType.Constructor;
    pattern: string;
    flags: string;
}

export interface RegexMatchFunction extends RegexMatchBase {
    type: RegexMatchType.Function;
    pattern: string;
    flags: string;
}

export interface RegexMatchString extends RegexMatchBase {
    type: RegexMatchType.String;
    pattern: string;
}
