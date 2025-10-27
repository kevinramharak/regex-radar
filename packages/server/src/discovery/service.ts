import { URI } from "vscode-uri";
import type { TextDocumentChangeEvent } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { createInterfaceId, Disposable, Implements, Injectable } from "@gitlab/needle";

import * as fs from "fs/promises";
import * as path from "path";

import {
    EntryType,
    type DirectoryEntry,
    type DiscoveryParams,
    type DiscoveryResult,
    type Entry,
    type FileEntry,
    type lsp,
    type RegexEntry,
    type WorkspaceEntry,
} from "@regex-radar/lsp-types";
import type { RegexMatch } from "@regex-radar/parsers";

import { IRequestMessageHandler } from "../message-handler";
import { LsConnection } from "../di/external-interfaces";
import { IDocumentsService } from "../documents";
import { IOnTextDocumentDidChangeHandler, IOnTextDocumentDidCloseHandler } from "../documents/events";
import { ILogger } from "../logger";
import { IParserProvider } from "../parsers";

interface IDiscoveryService {
    discover(uri: DiscoveryParams): Promise<DiscoveryResult>;
}

export const IDiscoveryService = createInterfaceId<IDiscoveryService>("IDiscoveryService");

type CachableEntry<T extends EntryType = EntryType> = Exclude<Entry, RegexEntry> & { type: T };

type GetTreeParams = {
    uri: lsp.URI;
    fsPath: string;
    parentUri?: lsp.URI;
    ignoreCache?: boolean;
};

@Implements(IRequestMessageHandler)
@Implements(IOnTextDocumentDidChangeHandler)
@Implements(IOnTextDocumentDidCloseHandler)
@Injectable(IDiscoveryService, [IDocumentsService, LsConnection, ILogger, IParserProvider])
export class DiscoveryService
    implements
        IDiscoveryService,
        IRequestMessageHandler,
        IOnTextDocumentDidChangeHandler,
        IOnTextDocumentDidCloseHandler,
        Disposable
{
    private cache = new Map<lsp.URI, CachableEntry>();
    private disposables: Disposable[] = [];

    /**
     * TODO: move to configuration
     */
    static readonly ALWAYS_IGNORE_DIRECTORIES = [
        "node_modules",
        ".git",
        ".github",
        ".vscode-test",
        "dist",
        "out",
        "build",
    ];

    static readonly SUPPORTED_FILE_EXTENSIONS = [".js", ".ts"];

    dispose() {
        this.disposables.forEach((disposable) => disposable.dispose());
    }

    constructor(
        private documentService: IDocumentsService,
        private connection: LsConnection,
        private logger: ILogger,
        private parsers: IParserProvider
    ) {}

    register(connection: LsConnection): void {
        this.disposables.push(connection.onRequest("regexRadar/discovery", this.discover.bind(this)));
    }

    onTextDocumentDidOpen(event: TextDocumentChangeEvent<TextDocument>) {
        if (this.cache.has(event.document.uri)) {
            // deregister any active file watchers
            this.logger.debug(`(discovery) should deregister file watchers for : ${event.document.uri}`);
        }
    }

    async onTextDocumentDidChange(event: TextDocumentChangeEvent<TextDocument>): Promise<void> {
        const entry = this.cache.get(event.document.uri);
        if (!entry || entry.type !== EntryType.File) {
            return;
        }
        this.logger.debug(`(discovery) invalidating cache entry for: ${event.document.uri}`);
        this.cache.delete(event.document.uri);
        this.logger.debug(`(discovery) sending didChange notification for: ${event.document.uri}`);
        await this.connection.sendNotification("regexRadar/discovery/didChange", { uri: entry.uri });
    }

    onTextDocumentDidClose(event: TextDocumentChangeEvent<TextDocument>) {
        if (this.cache.has(event.document.uri)) {
            // register a file watcher
            this.logger.debug(`(discovery) should register file watcher for : ${event.document.uri}`);
        }
    }

    async discover({ uri, hint }: DiscoveryParams): Promise<DiscoveryResult> {
        this.logger.debug(
            `(discovery) request for ${uri} with hint: ${hint ? EntryType[hint] : "<no hint>"}`
        );
        if (this.isUriIgnored(uri)) {
            this.logger.debug(`(discovery) ignored discovery request for: ${uri}`);
            return null;
        }

        // TODO: handle parse errors, send previous result if any
        // TODO: workspaces should be monitored recursively for edits, managed documents should **NOT** be watched
        //       research if recursive watcher is more effecient than watching each file / directory on its own
        const tree = await this.getTreeForUri(uri, hint);
        this.logger.debug(`(discovery) responding to discovery request for: ${uri}`);
        return tree;
    }

    private getFromCache<T extends EntryType>(uri: lsp.URI, hint?: T): CachableEntry<T> | null {
        const cacheHit = this.cache.get(uri);
        if (cacheHit) {
            if (!hint || hint === cacheHit.type) {
                this.logger.debug(`(discovery) cache hit for: ${uri}`);
                return cacheHit as CachableEntry<T>;
            }
        }
        this.logger.debug(`(discovery) cache miss for: ${uri}`);
        return null;
    }

    private isUriIgnored(uri: lsp.URI): boolean {
        const { scheme, fsPath } = URI.parse(uri);
        switch (scheme) {
            case "file": {
                return this.isFsPathIgnored(fsPath);
            }
        }
        return true;
    }

    /**
     * `fsPath` should be normalized with `URI.parse().fsPath` or `path.normalize()`
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

    private async getTreeForUri(uri: lsp.URI, hint?: EntryType): Promise<Entry | null> {
        const cacheHit = this.getFromCache(uri, hint);
        if (cacheHit) {
            return cacheHit;
        }
        const { fsPath, scheme } = URI.parse(uri);
        if (scheme !== "file") {
            return null;
        }
        const params: GetTreeParams = { fsPath, uri, ignoreCache: true };
        switch (hint) {
            case EntryType.Workspace:
                return this.getTreeForWorkspace(params);
            case EntryType.Directory:
                return this.getTreeForDirectory(params);
            case EntryType.File:
                return this.getTreeForFile(params);
        }
        const stat = await fs.stat(fsPath);
        if (stat.isDirectory()) {
            return this.getTreeForDirectory(params);
        } else if (stat.isFile()) {
            return this.getTreeForFile(params);
        }
        return null;
    }

    private async getTreeForWorkspace(params: GetTreeParams): Promise<WorkspaceEntry> {
        const entry = (await this.getTreeForDirectory(params)) as unknown as WorkspaceEntry;
        entry.type = EntryType.Workspace;
        this.cache.set(params.uri, entry);
        return entry;
    }

    private async getTreeForDirectory({
        uri,
        parentUri,
        fsPath,
        ignoreCache,
    }: GetTreeParams): Promise<DirectoryEntry> {
        if (!ignoreCache) {
            const cacheHit = this.getFromCache(uri, EntryType.Directory);
            if (cacheHit) {
                return cacheHit;
            }
        }
        const entries = await fs.readdir(fsPath, { withFileTypes: true });
        const children = (
            await Promise.all(
                entries.map((entry) => {
                    if (entry.isFile()) {
                        const entryPath = path.join(fsPath, entry.name);
                        if (this.isFsPathIgnored(entryPath) || !this.isFsPathSupported(entryPath)) {
                            return null;
                        }
                        const entryUri = URI.file(entryPath).toString();
                        return this.getTreeForFile({ uri: entryUri, fsPath: entryPath, parentUri: uri });
                    } else if (entry.isDirectory()) {
                        const entryPath = path.join(fsPath, entry.name);
                        if (this.isFsPathIgnored(entryPath)) {
                            return null;
                        }
                        const entryUri = URI.file(entryPath).toString();
                        return this.getTreeForDirectory({
                            uri: entryUri,
                            fsPath: entryPath,
                            parentUri: uri,
                        });
                    }
                })
            )
        ).filter((child) => child != null);
        const result: DirectoryEntry = {
            uri,
            parentUri,
            type: EntryType.Directory,
            children,
        };
        this.cache.set(uri, result);
        return result;
    }

    private async getTreeForFile({ uri, parentUri, ignoreCache }: GetTreeParams): Promise<FileEntry> {
        if (!ignoreCache) {
            const cacheHit = this.getFromCache(uri, EntryType.File);
            if (cacheHit) {
                return cacheHit;
            }
        }

        const document = await this.documentService.getOrCreate(uri);
        const parser = await this.parsers.get(document.languageId);
        const parseResult = await parser.parse(document);
        const result: FileEntry = {
            uri,
            parentUri,
            type: EntryType.File,
            children: parseResult.regexes.map((regex) => this.createRegexEntry(regex, uri)),
        };
        this.cache.set(uri, result);
        return result;
    }

    private createRegexEntry(regex: RegexMatch, uri: lsp.URI): RegexEntry {
        return {
            type: EntryType.Regex,
            location: {
                uri,
                range: regex.range,
            },
            info: {
                pattern: regex.pattern,
                flags: regex.flags,
                // TODO: model this properly
                isDynamic: regex.pattern === "<dynamic>",
            },
        };
    }
}
