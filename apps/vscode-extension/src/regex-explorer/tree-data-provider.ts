import {
    EventEmitter,
    Range,
    ThemeIcon,
    TreeItemCollapsibleState,
    Uri,
    window,
    workspace,
    type Event,
    type ProviderResult,
    type TextDocumentShowOptions,
    type TreeDataProvider,
    type TreeItem,
} from 'vscode';

import { RegexRadarLanguageClient } from '@regex-radar/client';
import {
    DirectoryEntry,
    Entry,
    EntryType,
    FileEntry,
    RegexEntry,
    WorkspaceEntry,
} from '@regex-radar/lsp-types';

import * as logger from '../logger';

type OnDidChangeTreeDataEventParams = Entry | undefined | null | void;

enum WorkspaceMode {
    None = 0,
    One = 1,
    Multiple = 2,
}

/**
 * TODO: add notebook support
 * @see https://code.visualstudio.com/api/extension-guides/tree-view
 */
export class RegexRadarTreeDataProvider implements TreeDataProvider<Entry> {
    private _onDidChangeTreeData = new EventEmitter<OnDidChangeTreeDataEventParams>();
    readonly onDidChangeTreeData: Event<OnDidChangeTreeDataEventParams> = this._onDidChangeTreeData.event;

    private entries = new Map<string, Exclude<Entry, RegexEntry>>();
    /**
     * If only 1 workspace is opened, keep track of its uri to resolve `getParent` correctly
     */
    private rootUri: string | undefined;
    private workspaceMode = WorkspaceMode.Multiple;

    refresh(): void {
        this.entries.clear();
        this._onDidChangeTreeData.fire();
    }

    constructor(private readonly client: RegexRadarLanguageClient) {
        client.onDiscoveryDidChange(async ({ uri }: { uri: string }) => {
            const entry = this.entries.get(uri);
            if (!entry) {
                return;
            }
            this.clearEntryRecursively(entry);
            const serverEntry = await this.client.discovery({ uri: entry.uri, hint: entry.type });
            if (serverEntry) {
                this.setEntryRecursively(serverEntry);
            }
            this._onDidChangeTreeData.fire(entry);
        });
    }

    getParent(entry: Entry): ProviderResult<Entry> {
        switch (entry.type) {
            case EntryType.Workspace: {
                return;
            }
            case EntryType.Directory:
            case EntryType.File: {
                if (!entry.parentUri || this.rootUri === entry.parentUri) {
                    return;
                }
                return this.entries.get(entry.parentUri);
            }
            case EntryType.Regex: {
                return this.entries.get(entry.location.uri);
            }
        }
    }

    getTreeItem(entry: Entry): TreeItem {
        const item = createTreeItem(entry);
        return item;
    }

    async getChildren(entry?: Entry): Promise<Entry[]> {
        if (!entry) {
            const root = (await this.getRoot()) as Exclude<Entry, RegexEntry>[];
            root.forEach((entry) => this.entries.set(entry.uri, entry));
            return root;
        }
        if (entry.type === EntryType.Regex) {
            return [];
        }
        const cachedEntry = this.entries.get(entry.uri);
        if (cachedEntry?.children.length) {
            return cachedEntry.children;
        }
        const serverEntry = await this.client.discovery({ uri: entry.uri, hint: entry.type });
        switch (serverEntry?.type) {
            case EntryType.Workspace:
            case EntryType.Directory:
            case EntryType.File: {
                if (this.workspaceMode === WorkspaceMode.One && this.rootUri === serverEntry.parentUri) {
                    delete serverEntry.parentUri;
                }
                this.setEntryRecursively(serverEntry);
                return serverEntry.children;
            }
            default:
                return [];
        }
    }

    async getRoot(): Promise<Entry[]> {
        const workspaces = this.getWorkspaceURIs();
        const workspaceEntries = workspaces.map((uri): WorkspaceEntry => {
            return {
                type: EntryType.Workspace,
                uri,
                children: [],
            };
        });
        // TODO: add event handlers to manage changes
        switch (workspaceEntries.length) {
            case 1: {
                // skip 1 level if there is only 1 workspace active
                this.rootUri = workspaceEntries[0].uri;
                this.workspaceMode = WorkspaceMode.One;
                return this.getChildren(workspaceEntries[0]);
            }
            case 0: {
                // TODO: implement this, probably needs server side work as well, can probably be less akward with open non-workspace files being supported out of the box
                //       1. find opened files that are not part of the workspace
                //       2. group them under the virtual workspace
                //       3. discover/display them as normal files
                //       4. cover all the change events to update state/view correctly
                this.workspaceMode = WorkspaceMode.None;
                const workspaceUri = 'regex-radar:virtual-workspace';
                this.rootUri = workspaceUri;
                const virtualWorkspaceEntry: WorkspaceEntry = {
                    type: EntryType.Workspace,
                    uri: workspaceUri,
                    children: window.visibleTextEditors.map((editor) => {
                        return {
                            type: EntryType.File,
                            uri: editor.document.uri.toString(),
                            children: [],
                            parentUri: workspaceUri,
                        } as FileEntry;
                    }),
                };
                return [virtualWorkspaceEntry];
            }
        }
        return workspaceEntries;
    }

    getWorkspaceURIs(): string[] {
        if (workspace.workspaceFolders) {
            return workspace.workspaceFolders.map((workspaceFolder) => workspaceFolder.uri.toString());
        }
        logger.warn('missing vsode.workspace.workspaceFolders');
        return [];
    }

    private setEntryRecursively(entry: Entry) {
        if (entry.type !== EntryType.Regex) {
            this.entries.set(entry.uri, entry);
        }
        switch (entry.type) {
            case EntryType.Workspace:
            case EntryType.Directory: {
                entry.children.forEach((entry) => this.setEntryRecursively(entry));
                break;
            }
        }
    }

    private clearEntryRecursively(entry: Entry) {
        switch (entry.type) {
            case EntryType.Workspace:
            case EntryType.Directory:
            case EntryType.File: {
                this.entries.delete(entry.uri);
                entry.children.forEach((entry) => this.clearEntryRecursively(entry));
                break;
            }
            case EntryType.Regex: {
                break;
            }
        }
    }
}

const ThemeIcons: Record<EntryType, ThemeIcon> = {
    [EntryType.Unknown]: new ThemeIcon('circle-filled'),
    [EntryType.Workspace]: new ThemeIcon('root-folder'),
    [EntryType.Directory]: ThemeIcon.Folder,
    [EntryType.File]: ThemeIcon.File,
    [EntryType.Regex]: new ThemeIcon('regex'),
};

function createTreeItem(entry: Entry): TreeItem {
    const iconPath = ThemeIcons[entry.type] || ThemeIcons[EntryType.Unknown];
    switch (entry.type) {
        case EntryType.Workspace:
        case EntryType.Directory:
        case EntryType.File: {
            return createUriEntry(entry, iconPath);
        }
        case EntryType.Regex: {
            return createRegexEntry(entry, iconPath);
        }
        default: {
            return {
                label: `<invalid entry with type ${EntryType[entry['type']] || '<invalid>'}>`,
                iconPath,
            };
        }
    }
}

// TODO: add selection state based on what file is focusses, and where the cursor is
function createUriEntry(entry: WorkspaceEntry | DirectoryEntry | FileEntry, iconPath: ThemeIcon): TreeItem {
    return {
        id: entry.uri,
        resourceUri: Uri.parse(entry.uri),
        description: true,
        iconPath,
        collapsibleState: TreeItemCollapsibleState.Collapsed,
        command: entry.type === EntryType.File ? createVsOpenCommand(entry) : void 0,
    };
}

// TODO: add selection state based on what file is focusses, and where the cursor is
function createRegexEntry(entry: RegexEntry, iconPath: ThemeIcon): TreeItem {
    const pattern = entry.match.pattern;
    const flags = 'flags' in entry.match ? entry.match.flags : '';
    return {
        id: createUriForLocation(entry.location),
        resourceUri: Uri.parse(createUriForLocation(entry.location)),
        label: `/${pattern}/${flags}`,
        description: true,
        contextValue: 'regex',
        iconPath,
        command: createVsOpenCommand(entry),
    };
}

function createUriForLocation(location: RegexEntry['location']): string {
    return `${location.uri}:${location.range.start.line + 1}:${location.range.start.character + 1}`;
}

function createVsOpenCommand(entry: FileEntry | RegexEntry) {
    return {
        command: 'vscode.open',
        title: 'Open',
        arguments: createVscodeOpenCommandArgs(entry),
    };
}

function createVscodeOpenCommandArgs(entry: FileEntry | RegexEntry): [string, TextDocumentShowOptions?] {
    const uri = entry.type === EntryType.File ? entry.uri : entry.location.uri;
    const args: [string, TextDocumentShowOptions?] = [uri];
    if (entry.type === EntryType.Regex) {
        args.push({
            selection: new Range(
                entry.location.range.start.line,
                entry.location.range.start.character,
                entry.location.range.end.line,
                entry.location.range.end.character,
            ),
        });
    }
    return args;
}
