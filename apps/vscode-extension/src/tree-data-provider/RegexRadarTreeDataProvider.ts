import * as vscode from "vscode";
import {
    EntryType,
    Entry,
    WorkspaceEntry,
    DirectoryEntry,
    FileEntry,
    RegexEntry,
} from "@regex-radar/lsp-types";
import { RegexRadarLanguageClient } from "@regex-radar/client";
import * as logger from "../logger";

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
export class RegexRadarTreeDataProvider implements vscode.TreeDataProvider<Entry> {
    private _onDidChangeTreeData = new vscode.EventEmitter<OnDidChangeTreeDataEventParams>();
    readonly onDidChangeTreeData: vscode.Event<OnDidChangeTreeDataEventParams> =
        this._onDidChangeTreeData.event;

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
        // TODO: maybe move caching to LS client?
        client.onDiscoveryDidChange(({ uri }: { uri: string }) => {
            let entry = this.entries.get(uri);
            if (!entry) {
                logger.debug(`ignoring onDiscoveryDidChange event for: ${uri}, no entry found`);
                return;
            }
            logger.debug(`received onDiscoveryDidChange event for: ${entry.uri}`);
            do {
                logger.debug(`  - deleting entry for: ${uri}`);
                this.entries.delete(uri);
                entry = entry.parentUri ? this.entries.get(entry.parentUri) : void 0;
            } while (entry);
            this._onDidChangeTreeData.fire(entry);
        });
    }

    getParent(entry: Entry): vscode.ProviderResult<Entry> {
        switch (entry.type) {
            case EntryType.Workspace: {
                return;
            }
            case EntryType.Directory:
            case EntryType.File: {
                if (!entry.parentUri) {
                    return;
                }
                return this.entries.get(entry.parentUri);
            }
            case EntryType.Regex: {
                return this.entries.get(entry.location.uri);
            }
        }
    }

    getTreeItem(entry: Entry): vscode.TreeItem {
        return createTreeItem(entry);
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
        const serverEntry = await this.client.discovery({ uri: entry.uri, hint: entry.type });
        switch (serverEntry?.type) {
            case EntryType.Workspace:
            case EntryType.Directory:
            case EntryType.File: {
                if (this.workspaceMode === WorkspaceMode.One && this.rootUri === serverEntry.parentUri) {
                    delete serverEntry.parentUri;
                }
                this.entries.set(serverEntry.uri, serverEntry);
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
                const workspaceUri = "regex-radar:virtual-workspace";
                this.rootUri = workspaceUri;
                const virtualWorkspaceEntry: WorkspaceEntry = {
                    type: EntryType.Workspace,
                    uri: workspaceUri,
                    children: vscode.window.visibleTextEditors.map((editor) => {
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
        if (vscode.workspace.workspaceFolders) {
            return vscode.workspace.workspaceFolders.map((workspaceFolder) => workspaceFolder.uri.toString());
        }
        logger.warn("missing vsode.workspace.workspaceFolders");
        return [];
    }
}

const ThemeIcon: Record<EntryType, vscode.ThemeIcon> = {
    [EntryType.Unknown]: new vscode.ThemeIcon("circle-filled"),
    [EntryType.Workspace]: new vscode.ThemeIcon("root-folder"),
    [EntryType.Directory]: vscode.ThemeIcon.Folder,
    [EntryType.File]: vscode.ThemeIcon.File,
    [EntryType.Regex]: new vscode.ThemeIcon("regex"),
};

function createTreeItem(entry: Entry): vscode.TreeItem {
    const iconPath = ThemeIcon[entry.type] || ThemeIcon[EntryType.Unknown];
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
                label: `<invalid entry with type ${EntryType[entry["type"]] || "<invalid>"}>`,
                iconPath,
            };
        }
    }
}
function createRegexEntry(entry: RegexEntry, iconPath: vscode.ThemeIcon) {
    const args: [string, vscode.TextDocumentShowOptions] = [
        entry.location.uri,
        {
            selection: new vscode.Range(
                entry.location.range.start.line,
                entry.location.range.start.character,
                entry.location.range.end.line,
                entry.location.range.end.character
            ),
        },
    ];
    return {
        label: `/${entry.info.pattern}/${entry.info.flags}`,
        iconPath,
        contextValue: "regex",
        command: {
            command: "vscode.open",
            title: "Open",
            arguments: args,
        },
    };
}

function createUriEntry(
    entry: WorkspaceEntry | DirectoryEntry | FileEntry,
    iconPath: vscode.ThemeIcon
): vscode.TreeItem {
    return {
        resourceUri: vscode.Uri.parse(entry.uri),
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        iconPath,
    };
}
