import * as path from 'node:path';

import type { TextDocumentChangeEvent, URI } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI as _URI } from 'vscode-uri';

import { Implements, Injectable, createInterfaceId } from '@gitlab/needle';

import {
    type DirectoryEntry,
    type DiscoveryParams,
    type DiscoveryResult,
    type Entry,
    EntryType,
    type FileEntry,
    type RegexEntry,
    type WorkspaceEntry,
} from '@regex-radar/lsp-types';
import type { RegexMatch } from '@regex-radar/lsp-types';

import { LsConnection } from '../di/external-interfaces';
import { IDocumentsService } from '../documents';
import { IOnTextDocumentDidChangeHandler, IOnTextDocumentDidCloseHandler } from '../documents/events';
import { IFileSystem } from '../file-system';
import { FileType } from '../file-system/file-stats';
import { ILogger } from '../logger';
import { IParserProvider } from '../parsers';
import { Disposable } from '../util/disposable';

export interface IDiscoveryService {
    discover<T extends EntryType = EntryType>(params: DiscoveryParams<T>): Promise<DiscoveryResult<T>>;
}

export const IDiscoveryService = createInterfaceId<IDiscoveryService>('IDiscoveryService');

type CachableEntry<T extends EntryType = EntryType> = Exclude<Entry, RegexEntry> & { type: T };

type GetTreeParams = {
    uri: _URI;
    fsPath: string;
    parentUri?: _URI;
    ignoreCache?: boolean;
};

@Implements(IOnTextDocumentDidChangeHandler)
@Implements(IOnTextDocumentDidCloseHandler)
@Injectable(IDiscoveryService, [IDocumentsService, LsConnection, ILogger, IParserProvider, IFileSystem])
export class DiscoveryService
    extends Disposable
    implements IDiscoveryService, IOnTextDocumentDidChangeHandler, IOnTextDocumentDidCloseHandler
{
    private cache = new Map<URI, CachableEntry>();

    /**
     * TODO: move to configuration
     */
    static readonly ALWAYS_IGNORE_DIRECTORIES = [
        'node_modules',
        '.git',
        '.github',
        '.vscode-test',
        'dist',
        'out',
        'build',
    ];

    static readonly SUPPORTED_FILE_EXTENSIONS = ['.js', '.ts'];

    constructor(
        private documentService: IDocumentsService,
        private connection: LsConnection,
        private logger: ILogger,
        private parsers: IParserProvider,
        private fs: IFileSystem,
    ) {
        super();
    }

    onTextDocumentDidOpen(event: TextDocumentChangeEvent<TextDocument>) {
        if (this.cache.has(event.document.uri)) {
            // deregister any active file watchers
            this.logger.trace(`(discovery) should deregister file watchers for : ${event.document.uri}`);
        }
    }

    async onTextDocumentDidChange(event: TextDocumentChangeEvent<TextDocument>): Promise<void> {
        const entry = this.cache.get(event.document.uri);
        if (!entry || entry.type !== EntryType.File) {
            return;
        }
        this.logger.trace(`(discovery) invalidating cache entry for: ${event.document.uri}`);
        this.cache.delete(event.document.uri);
        await this.connection.sendNotification('regexRadar/discovery/didChange', { uri: entry.uri });
    }

    onTextDocumentDidClose(event: TextDocumentChangeEvent<TextDocument>) {
        if (this.cache.has(event.document.uri)) {
            // register a file watcher
            this.logger.trace(`(discovery) should register file watcher for : ${event.document.uri}`);
        }
    }

    async discover<T extends EntryType = EntryType>({
        uri,
        hint,
    }: DiscoveryParams<T>): Promise<DiscoveryResult<T>> {
        if (this.isUriIgnored(uri)) {
            this.logger.trace(`(discovery) ignored discovery request for: ${uri}`);
            return null;
        }

        // TODO: handle parse errors, send previous result if any
        // TODO: workspaces should be monitored recursively for edits, managed documents should **NOT** be watched
        //       research if recursive watcher is more effecient than watching each file / directory on its own
        const tree = await this.getTreeForUri(uri, hint);

        if (hint && tree?.type !== hint) {
            this.logger.trace(
                `(discovery) request with hint ${EntryType[hint]} instead resolved to ${tree?.type ?? '<null>'}`,
            );
        }

        if (tree) {
            prune(tree);
        }

        return tree as DiscoveryResult<T>;
    }

    private getFromCache<T extends EntryType>(uri: URI, hint?: T): CachableEntry<T> | null {
        const cacheHit = this.cache.get(uri);
        if (cacheHit) {
            if (!hint || hint === cacheHit.type) {
                this.logger.trace(`(discovery) cache hit for: ${uri}`);
                return cacheHit as CachableEntry<T>;
            }
        }
        this.logger.trace(`(discovery) cache miss for: ${uri}`);
        return null;
    }

    private isUriIgnored(uri: URI): boolean {
        const { scheme, fsPath } = _URI.parse(uri);
        switch (scheme) {
            case 'file': {
                return this.isFsPathIgnored(fsPath);
            }
        }
        return true;
    }

    /**
     * `fsPath` should be normalized with `_URI.parse().fsPath` or `path.normalize()`
     */
    private isFsPathIgnored(fsPath: string): boolean {
        const { dir, base, ext } = path.parse(fsPath);
        // If no file extension, treat it as a directory and do a fast check
        if (!ext) {
            if (DiscoveryService.ALWAYS_IGNORE_DIRECTORIES.includes(base)) {
                return true;
            }
        }
        // check if any other part of the file path (besides the base) is part of the ignore list
        const parts = dir.split(path.sep);
        const result = !!parts.find((part) => DiscoveryService.ALWAYS_IGNORE_DIRECTORIES.includes(part));
        return result;
    }

    private isFsPathSupported(fsPath: string): boolean {
        const extension = path.extname(fsPath);
        return DiscoveryService.SUPPORTED_FILE_EXTENSIONS.includes(extension);
    }

    // TODO: clean this chain, to much string conversions and inconsistencies
    private async getTreeForUri(uri: URI, hint?: EntryType): Promise<Entry | null> {
        const cacheHit = this.getFromCache(uri, hint);
        if (cacheHit) {
            return cacheHit;
        }
        const parsedUri = _URI.parse(uri);
        if (parsedUri.scheme !== 'file') {
            return null;
        }
        const params: GetTreeParams = { fsPath: parsedUri.fsPath, uri: parsedUri, ignoreCache: true };
        switch (hint) {
            case EntryType.Workspace: {
                return this.getTreeForWorkspace(params);
            }
            case EntryType.Directory: {
                return this.getTreeForDirectory(params);
            }
            case EntryType.File: {
                return this.getTreeForFile(params);
            }
            case EntryType.Regex: {
                return null;
            }
        }
        const stat = await this.fs.stat(parsedUri);
        switch (stat.type) {
            case FileType.Directory: {
                return this.getTreeForDirectory(params);
            }
            case FileType.File: {
                return this.getTreeForFile(params);
            }
        }
        return null;
    }

    private async getTreeForWorkspace(params: GetTreeParams): Promise<WorkspaceEntry> {
        const entry = (await this.getTreeForDirectory(params)) as unknown as WorkspaceEntry;
        entry.type = EntryType.Workspace;
        this.cache.set(params.uri.toString(), entry);
        return entry;
    }

    private async getTreeForDirectory({
        uri,
        parentUri,
        fsPath,
        ignoreCache,
    }: GetTreeParams): Promise<DirectoryEntry> {
        if (!ignoreCache) {
            const cacheHit = this.getFromCache(uri.toString(), EntryType.Directory);
            if (cacheHit) {
                return cacheHit;
            }
        }
        const entries = await this.fs.readDirectory(uri);
        const children = (
            await Promise.all(
                entries.map(([name, type]) => {
                    if (type === FileType.File) {
                        const entryPath = path.join(fsPath, name);
                        if (this.isFsPathIgnored(entryPath) || !this.isFsPathSupported(entryPath)) {
                            return null;
                        }
                        const entryUri = _URI.file(entryPath);
                        return this.getTreeForFile({ uri: entryUri, fsPath: entryPath, parentUri: uri });
                    } else if (type === FileType.Directory) {
                        const entryPath = path.join(fsPath, name);
                        if (this.isFsPathIgnored(entryPath)) {
                            return null;
                        }
                        const entryUri = _URI.file(entryPath);
                        return this.getTreeForDirectory({
                            uri: entryUri,
                            fsPath: entryPath,
                            parentUri: uri,
                        });
                    }
                }),
            )
        ).filter((child) => child != null);
        const result: DirectoryEntry = {
            uri: uri.toString(),
            parentUri: ensureParentUri(uri, parentUri),
            type: EntryType.Directory,
            children,
        };
        this.cache.set(uri.toString(), result);
        return result;
    }

    private async getTreeForFile({ uri, parentUri, ignoreCache }: GetTreeParams): Promise<FileEntry> {
        if (!ignoreCache) {
            const cacheHit = this.getFromCache(uri.toString(), EntryType.File);
            if (cacheHit) {
                return cacheHit;
            }
        }

        const document = await this.documentService.getOrCreate(uri.toString());
        const parser = await this.parsers.get(document.languageId);
        const parseResult = await parser.parse(document);
        const result: FileEntry = {
            uri: uri.toString(),
            parentUri: ensureParentUri(uri, parentUri),
            type: EntryType.File,
            children: parseResult.matches
                .map((match) => this.createRegexEntry(match, uri.toString()))
                .sort((a, b) => compare(a, b)),
        };
        this.cache.set(uri.toString(), result);
        return result;
    }

    private createRegexEntry(match: RegexMatch, uri: URI): RegexEntry {
        return {
            type: EntryType.Regex,
            location: {
                uri,
                range: match.range,
            },
            match,
        };
    }
}

function ensureParentUri(uri: _URI, parentUri?: _URI): string {
    if (parentUri) {
        return parentUri.toString();
    }
    const parentPath = path.dirname(uri.fsPath);
    return _URI.file(parentPath).toString();
}

const isPruned = Symbol('isPruned');
type IsPruned<T> = T & { [isPruned]: boolean };
type IsPrunedEntry = IsPruned<Entry>;

function prune<T extends Entry>(tree: T): T {
    if ((tree as IsPrunedEntry)[isPruned]) {
        return tree;
    }
    switch (tree.type) {
        case EntryType.Workspace:
        case EntryType.Directory: {
            tree.children = tree.children
                .map((child) => prune(child))
                .filter((child) => hasRegexEntryDescendants(child));
            break;
        }
        case EntryType.File:
        case EntryType.Regex: {
            break;
        }
    }
    (tree as IsPrunedEntry)[isPruned] = true;
    return tree;
}

function hasRegexEntryDescendants(entry: Exclude<Entry, WorkspaceEntry | RegexEntry>): boolean {
    if (entry.type === EntryType.File) {
        return entry.children.length > 0;
    } else {
        return entry.children.some((child) => hasRegexEntryDescendants(child));
    }
}

function compare(a: RegexEntry, b: RegexEntry): number {
    const x = a.location.range;
    const y = b.location.range;
    const lineCompare = x.start.line - y.start.line;
    if (lineCompare === 0) {
        return x.start.character - y.start.character;
    } else {
        return lineCompare;
    }
}
